import {initialConfig,validateProduct} from '../api/config.mjs';
// Adapted transaction/journal/desired-applied fences from REDOWN right-click-current.js
// blob 2590a47f7eaa032cbadc18dc2de9e82d8dcc60e5 at 89211efc08bfb6f4370f9293cc98ebea2050f859.
// Chrome and cloud operations stay outside CURRENT; config never carries authorization.
import {modeModules,validateModeConfig,validateBundle,validateGeneration,integer,BACKUP_FORMAT,MAX_RECORDS} from './schema.mjs';
import {encodeBackup,decodeBackup} from './backup.mjs';
import {operationIdentity} from '../core/boundary-observation.mjs';
const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
const done=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error??Error('CURRENT transaction aborted.'));});
const error=code=>Object.assign(Error(code==='REVISION_CONFLICT'?'Local state changed; reload before saving.':'Local state operation was not confirmed.'),{code});
export function createCurrentStore({indexedDB=globalThis.indexedDB,dbName='click2cloud-current-v1',sink,clock=()=>Date.now(),fault=()=>{}}={}) {
  let opening;
  const signal=(stage,outcome,code,operationId,revision=0)=>{
    try {const event={stage,outcome,code,operationId,revision};if(typeof sink==='function')sink(event);else sink?.emit?.(event);}catch{/* Observations never participate in a state transaction. */}
  };
  const open=()=>opening??=new Promise((resolve,reject)=>{
    if(!indexedDB){reject(error('STORAGE_UNAVAILABLE'));return;}
    let r;try{r=indexedDB.open(dbName,1);}catch{reject(error('STORAGE_UNAVAILABLE'));return;}
    r.onupgradeneeded=()=>{
      for(const name of ['state','journal','checkpoints'])r.result.createObjectStore(name,{keyPath:name==='journal'?'sequence':'id'});
    };
    r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();opening=null;};resolve(r.result);};
    r.onerror=()=>{opening=null;reject(error('STORAGE_UNAVAILABLE'));};
    r.onblocked=()=>{opening=null;reject(error('STORAGE_UNAVAILABLE'));};
  });
  async function transact(mode,fn) {
    const db=await open(),tx=db.transaction(['state','journal','checkpoints'],mode),finished=done(tx);
    // Mark rejected completion handled immediately; the originating request still propagates.
    finished.catch(()=>{});
    try {
      const stores=Object.fromEntries(['state','journal','checkpoints'].map(name=>[name,tx.objectStore(name)]));
      const result=await fn(stores,tx);if(mode==='readwrite')fault('beforeCommit',tx);
      await finished;return result;
    } catch(e) {try{tx.abort();}catch{}await finished.catch(()=>{});throw e;}
  }
  const defaultGeneration=()=>({desired:0,applied:null});
  async function append(stores,entry) {
    const meta=(await request(stores.state.get('journalMeta')))?.value??{next:1,evicted:0};
    stores.journal.add({...entry,sequence:meta.next});
    if(meta.next>MAX_RECORDS) {stores.journal.delete(meta.next-MAX_RECORDS);meta.evicted++;}
    stores.state.put({id:'journalMeta',value:{next:meta.next+1,evicted:meta.evicted}});
  }
  async function getModeConfig(mode) {
    if(!Object.hasOwn(modeModules,mode))throw error('BACKUP_INVALID');
    return transact('readonly',async stores=>{
      const value=(await request(stores.state.get('mode:'+mode)))?.value??modeModules[mode].createConfig();
      return validateModeConfig(mode,value);
    });
  }
  async function saveModeConfig(mode,config,{expectedRevision}={}) {
    const operationId=operationIdentity();signal('persistence.commit','started','PERSIST_STARTED',operationId);
    try {
      // Validate before entering IDB; unknown fields are rejected, never silently dropped.
      const normalized=validateModeConfig(mode,config);integer(expectedRevision);
      const result=await transact('readwrite',async stores=>{
        const prior=(await request(stores.state.get('mode:'+mode)))?.value??null;
        if((prior?.revision??0)!==expectedRevision)throw error('REVISION_CONFLICT');
        const current=validateModeConfig(mode,{...normalized,revision:expectedRevision+1});
        const at=clock();integer(at);
        const checkpointId=mode+':'+new Date(at).toISOString().slice(0,10);
        if(prior&&!await request(stores.checkpoints.get(checkpointId)))stores.checkpoints.add({id:checkpointId,mode,at,config:prior});
        stores.state.put({id:'mode:'+mode,value:current});
        const product=(await request(stores.state.get('product')))?.value;
        if(product)stores.state.put({id:'product',value:validateProduct({...product,revision:product.revision+1,configs:{...product.configs,[mode]:current}})});
        await append(stores,{kind:'config',mode,at,previous:prior,current});
        return current;
      });
      signal('persistence.commit','ok','PERSIST_COMMITTED',operationId,result.revision);return result;
    } catch(e) {signal('persistence.commit','failed',e?.code==='REVISION_CONFLICT'?'REVISION_CONFLICT':e?.code==='STORAGE_UNAVAILABLE'?'STORAGE_UNAVAILABLE':'STORAGE_COMMIT_FAILED',operationId);throw e;}
  }
  async function generationChange(value,{expectedGeneration,acknowledge=false}={}) {
    const operationId=operationIdentity();signal('persistence.commit','started','PERSIST_STARTED',operationId);
    try {
      integer(value);if(!acknowledge)integer(expectedGeneration);
      const result=await transact('readwrite',async stores=>{
        const previous=(await request(stores.state.get('generation')))?.value??defaultGeneration();
        if(acknowledge&&value!==previous.desired||!acknowledge&&(expectedGeneration!==previous.desired||value<=previous.desired))throw error('REVISION_CONFLICT');
        const current=acknowledge?{...previous,applied:value}:{desired:value,applied:previous.applied};
        validateGeneration(current);stores.state.put({id:'generation',value:current});
        await append(stores,{kind:'generation',mode:null,at:clock(),previous,current});return current;
      });
      signal('persistence.commit','ok','PERSIST_COMMITTED',operationId,result.desired);return result;
    } catch(e) {signal('persistence.commit','failed',e?.code==='REVISION_CONFLICT'?'REVISION_CONFLICT':'STORAGE_COMMIT_FAILED',operationId);throw e;}
  }
  async function read() {
    return transact('readonly',async stores=>{
      const rows=await request(stores.state.getAll()),map=Object.fromEntries(rows.map(row=>[row.id,row.value]));
      const configs={};for(const mode of Object.keys(modeModules))configs[mode]=validateModeConfig(mode,map['mode:'+mode]??modeModules[mode].createConfig());
      const generation=map.generation??defaultGeneration();validateGeneration(generation);
      return {schemaVersion:1,configs,generation,requiresReconnect:true,journalEvicted:map.journalMeta?.evicted??0};
    });
  }
  async function journal({after=0,limit=100}={}) {
    integer(after);if(!Number.isSafeInteger(limit)||limit<1||limit>500)throw error('BACKUP_INVALID');
    return transact('readonly',async stores=>{
      const meta=(await request(stores.state.get('journalMeta')))?.value??{next:1,evicted:0};
      const rows=await request(stores.journal.getAll()),matching=rows.filter(row=>row.sequence>after),page=matching.slice(0,limit);
      return {rows:page,next:matching.length>limit?page.at(-1).sequence:null,complete:matching.length<=limit,oldestSequence:rows[0]?.sequence??meta.next,evicted:meta.evicted,gaps:after< (rows[0]?.sequence??1)-1?['JOURNAL_EVICTED']:[]};
    });
  }
  async function bundle() {
    return transact('readonly',async stores=>{
      const [rows,journal,checkpoints]=await Promise.all([request(stores.state.getAll()),request(stores.journal.getAll()),request(stores.checkpoints.getAll())]);
      const map=Object.fromEntries(rows.map(row=>[row.id,row.value])),configs={};
      for(const mode of Object.keys(modeModules))if(map['mode:'+mode])configs[mode]=map['mode:'+mode];
      return validateBundle({format:BACKUP_FORMAT,schemaVersion:1,requiresReconnect:true,exportedAt:clock(),configs,generation:map.generation??defaultGeneration(),journal,journalEvicted:map.journalMeta?.evicted??0,checkpoints});
    });
  }
  async function exportEncrypted(options={}) {
    const operationId=operationIdentity();signal('persistence.backup','started','BACKUP_STARTED',operationId);
    try {
      if(options.authorized!==true)throw error('BACKUP_AUTH_REQUIRED');
      const result=await encodeBackup(await bundle(),options);signal('persistence.backup','ok','BACKUP_ENCRYPTED',operationId);return result;
    } catch(e) {signal('persistence.backup',e?.code==='BACKUP_AUTH_REQUIRED'?'blocked':'failed',e?.code==='BACKUP_AUTH_REQUIRED'?'BACKUP_AUTH_REQUIRED':'BACKUP_INVALID',operationId);throw e;}
  }
  async function restoreEncrypted(text,options={}) {
    const operationId=operationIdentity();signal('persistence.restore','started','RESTORE_STARTED',operationId);
    try {
      const restored=await decodeBackup(text,options);
      await transact('readwrite',async (stores,tx)=>{
        const rows=await request(stores.state.getAll());
        if(rows.some(row=>row.id.startsWith('mode:')||row.id==='generation'))throw error('RESTORE_NOT_EMPTY');
        for(const [mode,value] of Object.entries(restored.configs))stores.state.add({id:'mode:'+mode,value});
        stores.state.add({id:'generation',value:{desired:restored.generation.desired,applied:null}});
        const next=(restored.journal.at(-1)?.sequence??restored.journalEvicted)+1;
        stores.state.put({id:'journalMeta',value:{next,evicted:restored.journalEvicted}});
        for(const row of restored.journal)stores.journal.add(row);
        for(const row of restored.checkpoints)stores.checkpoints.add(row);
        if(restored.generation.applied!==null)await append(stores,{kind:'generation',mode:null,at:clock(),previous:restored.generation,current:{desired:restored.generation.desired,applied:null}});
        fault('beforeRestoreCommit',tx);
      });
      signal('persistence.restore','ok','RESTORE_REQUIRES_RECONNECT',operationId);return read();
    } catch(e) {signal('persistence.restore',e?.code==='BACKUP_AUTH_REQUIRED'?'blocked':'failed',e?.code==='BACKUP_AUTH_REQUIRED'?'BACKUP_AUTH_REQUIRED':'MIGRATION_QUARANTINED',operationId);throw e;}
  }
  async function readProduct() {
    return transact('readonly',async stores=>{
      const saved=(await request(stores.state.get('product')))?.value;
      if(saved)return validateProduct(saved);
      const value=initialConfig();
      for(const mode of Object.keys(modeModules)) {
        const config=(await request(stores.state.get('mode:'+mode)))?.value;
        if(config)value.configs[mode]=validateModeConfig(mode,config);
      }
      return validateProduct(value);
    });
  }
  async function commitProduct(value,{expectedRevision}={}) {
    const operationId=operationIdentity();signal('persistence.commit','started','PERSIST_STARTED',operationId);
    const normalized=validateProduct(value);integer(expectedRevision);
    try {const result=await transact('readwrite',async stores=>{
      const prior=(await request(stores.state.get('product')))?.value;
      if((prior?.revision??0)!==expectedRevision)throw error('REVISION_CONFLICT');
      const configs={};
      for(const [mode,config] of Object.entries(normalized.configs)) {
        const previous=(await request(stores.state.get('mode:'+mode)))?.value??null;
        const baseline=previous??modeModules[mode].createConfig();
        const changed=JSON.stringify({...baseline,revision:0})!==JSON.stringify({...config,revision:0});
        configs[mode]=validateModeConfig(mode,{...config,revision:baseline.revision+(changed?1:0)});
        if(changed)await append(stores,{kind:'config',mode,at:clock(),previous,current:configs[mode]});
      }
      const current=validateProduct({...normalized,configs,revision:expectedRevision+1});
      stores.state.put({id:'product',value:current});
      const journal=(await request(stores.state.get('productJournal')))?.value??[];
      journal.push({sequence:current.revision,at:clock(),previousRevision:expectedRevision,current});
      stores.state.put({id:'productJournal',value:journal.slice(-MAX_RECORDS)});
      // Existing mode readers and the save engine see the exact same committed configs.
      for(const [mode,config] of Object.entries(current.configs))stores.state.put({id:'mode:'+mode,value:config});
      return current;
    });signal('persistence.commit','ok','PERSIST_COMMITTED',operationId,result.revision);return result;
    }catch(e){signal('persistence.commit','failed',e.code==='REVISION_CONFLICT'?'REVISION_CONFLICT':'STORAGE_COMMIT_FAILED',operationId);throw e;}
  }
  async function readBackupRoot(){return transact('readonly',async stores=>(await request(stores.state.get('backupRoot')))?.value??null);}
  async function saveBackupRoot(value){return transact('readwrite',async stores=>{stores.state.put({id:'backupRoot',value});return {state:'FILESYSTEM_HANDLE_STORED'};});}
  return Object.freeze({readBackupRoot,saveBackupRoot,readProduct,commitProduct,read,getModeConfig,saveModeConfig,setDesiredGeneration:(g,o)=>generationChange(g,o),acknowledgeGeneration:g=>generationChange(g,{acknowledge:true}),journal,exportEncrypted,restoreEncrypted,
    async close(){if(opening){const db=await opening;db.close();opening=null;}}
  });
}
