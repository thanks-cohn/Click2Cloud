import {safeRemoteDiagnostic} from '../../right2cloud-module/src/common.mjs';
// Adapted transaction/journal/desired-applied fences from REDOWN right-click-current.js
// blob 2590a47f7eaa032cbadc18dc2de9e82d8dcc60e5 at 89211efc08bfb6f4370f9293cc98ebea2050f859.
// Chrome and cloud operations stay outside CURRENT; config never carries authorization.
import {modeModules,validateModeConfig,validateBundle,validateGeneration,integer,BACKUP_FORMAT,MAX_RECORDS} from './schema.mjs';
import {encodeBackup,decodeBackup} from './backup.mjs';
import {normalizeTarget} from '../core/menu-identity.mjs';
import {operationIdentity} from '../core/boundary-observation.mjs';
import {productState,validateProduct,fail} from '../api/config.mjs';
const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
const done=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error??Error('CURRENT transaction aborted.'));});
const error=code=>Object.assign(Error(code==='REVISION_CONFLICT'?'Local state changed; reload before saving.':'Local state operation was not confirmed.'),{code});
export function createCurrentStore({indexedDB=globalThis.indexedDB,dbName='click2cloud-current-v1',sink,clock=()=>Date.now(),fault=()=>{},readEstablishment=async()=>{if(typeof globalThis.chrome?.storage?.local?.get!=='function')return {};const p=await chrome.storage.local.get(['nativeRegistration','currentProvenance']);return {established:!!p.currentProvenance||!!p.nativeRegistration,nativeGeneration:p.nativeRegistration?.desired?.generation??0};},retainEstablishment=async proof=>{if(typeof globalThis.chrome?.storage?.local?.set==='function')await chrome.storage.local.set({currentProvenance:proof});}}={}) {
  let opening;
  const signal=(stage,outcome,code,operationId,revision=0,context={})=>{
    try {const event={stage,outcome,code,operationId,revision,parentOperation:context.parentOperation??0,requires:context.requires??[]};if(typeof sink==='function')return sink(event);else return sink?.emit?.(event);}catch{/* Observations never participate in a state transaction. */}
  };
  const open=()=>{if(opening)return opening;const pending=new Promise((resolve,reject)=>{
    if(!indexedDB){reject(error('STORAGE_UNAVAILABLE'));return;}
    let abandoned=false,r;try{r=indexedDB.open(dbName,1);}catch{reject(error('STORAGE_UNAVAILABLE'));return;}
    r.onupgradeneeded=()=>{
      if(abandoned){r.transaction.abort();return;}
      for(const name of ['state','journal','checkpoints'])r.result.createObjectStore(name,{keyPath:name==='journal'?'sequence':'id'});
    };
    r.onsuccess=()=>{if(abandoned){r.result.close();return;}r.result.onversionchange=()=>{r.result.close();opening=null;};resolve(r.result);};
    r.onerror=()=>{opening=null;reject(error('STORAGE_UNAVAILABLE'));};
    r.onblocked=()=>{abandoned=true;opening=null;reject(error('STORAGE_UNAVAILABLE'));};
  });opening=pending;pending.catch(()=>{if(opening===pending)opening=null;});return pending;};
  async function transact(mode,fn,{recoverMissing=false}={}) {
    const establishment=await readEstablishment();
    if(!opening&&!recoverMissing&&(establishment.established||establishment.nativeGeneration>0)&&typeof indexedDB?.databases==='function'&&!(await indexedDB.databases()).some(d=>d.name===dbName))throw Object.assign(error('CONFIGURATION_RECORD_MISSING'),{origin:'CURRENT_STORE',subreason:'ESTABLISHED_BOUNDARY_MISSING'});
    const db=await open();let tx;try{tx=db.transaction(['state','journal','checkpoints'],mode,mode==='readwrite'?{durability:'strict'}:undefined);}catch(e){if(e.name==='InvalidStateError')opening=null;throw e;}const finished=done(tx);
    // Mark rejected completion handled immediately; the originating request still propagates.
    finished.catch(()=>{});
    try {
      const stores=Object.assign(Object.fromEntries(['state','journal','checkpoints'].map(name=>[name,tx.objectStore(name)])),{establishment});
      if(mode==='readwrite')for(const name of ['state','journal','checkpoints']){const store=stores[name];stores[name]=new Proxy(store,{get(o,k){if(['put','add','delete'].includes(k))return (...args)=>{const r=o[k](...args);fault(name+':'+k+':'+String(args[0]?.id??args[0]?.kind??'record'),tx);return r;};const v=Reflect.get(o,k,o);return typeof v==='function'?v.bind(o):v;}});}
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
  /** getConfiguration/listDestinations and every config writer share this read.
   * Missing established rows are a recovery error, never proof of empty settings.
   * Integrity stores record presence only, not a competing copy of destinations.
   */
  async function loadState(stores) {
    const rows=await request(stores.state.getAll()),map=Object.fromEntries(rows.map(r=>[r.id,r.value]));
    const proof=stores.establishment??{},configIds=['product','mode:simple','mode:nested','mode:depth','generation'];
    if(proof.uncertain)throw error('CONFIGURATION_CORRUPT');
    const established=proof.established===true||proof.nativeGeneration>0||map.configurationProvenance!==undefined;
    const missing=(subreason)=>{throw Object.assign(error('CONFIGURATION_RECORD_MISSING'),{origin:'CURRENT_STORE',subreason});};
    if(established){for(const id of configIds)if(!Object.hasOwn(map,id)&&!(id.startsWith('mode:')&&map.product?.configs?.[id.slice(5)]))missing('ESTABLISHED_BOUNDARY_MISSING');}
    if(map.configurationProvenance&&(map.configurationProvenance.version!==1||map.configurationProvenance.established!==true))throw error('CONFIGURATION_CORRUPT');
    // A retained checkpoint or generation-only journal is historical evidence too.
    if(!configIds.some(id=>Object.hasOwn(map,id))){
      if((await request(stores.checkpoints.count()))>0||(await request(stores.journal.count()))>0||Object.keys(map).some(k=>k.startsWith('setup:'))||Object.hasOwn(map,'backupRoot'))missing('HISTORICAL_EVIDENCE_WITHOUT_CONFIGURATION');
    }
    if(Object.hasOwn(map,'configurationIntegrity')&&(!map.configurationIntegrity||map.configurationIntegrity.version!==1||!Array.isArray(map.configurationIntegrity.required)||map.configurationIntegrity.required.some(k=>!['product','mode:simple','mode:nested','mode:depth'].includes(k))))throw error('CONFIGURATION_CORRUPT');
    if(Object.hasOwn(map,'product')&&(!map.product||map.product.schemaVersion!==1||!Number.isSafeInteger(map.product.revision)||!map.product.show||!Object.hasOwn(map.product,'defaultTarget')&&!map.product.configs))throw error('CONFIGURATION_CORRUPT');
    const required=new Set(map.configurationIntegrity?.required??[]);
    if(rows.some(r=>r.id.startsWith('setup:')&&r.value?.stage==='complete'))required.add('product');
    // Legacy installations have no marker yet: their own journal is evidence.
    if(!map.configurationIntegrity){for(const j of await request(stores.journal.getAll())){if(j.kind==='product')required.add('product');if(j.kind==='config')required.add('mode:'+j.mode);}}
    for(const id of required)if(!Object.hasOwn(map,id)&&!(id.startsWith('mode:')&&map.product?.configs?.[id.slice(5)]))missing('REQUIRED_RECORD_MISSING');
    const configs={};for(const mode of Object.keys(modeModules)){
      const id='mode:'+mode,raw=Object.hasOwn(map,id)?map[id]:map.product?.configs?.[mode];
      if((Object.hasOwn(map,id)||raw!==undefined)&&(!raw||!Array.isArray(raw[mode==='depth'?'scopes':'destinations'])))throw error('CONFIGURATION_CORRUPT');
      try{configs[mode]=validateModeConfig(mode,raw??modeModules[mode].createConfig());}catch{throw error('CONFIGURATION_CORRUPT');}
      const embedded=map.product?.configs?.[mode];if(Object.hasOwn(map,id)&&embedded){const legacy=validateModeConfig(mode,embedded);if(legacy.revision>=configs[mode].revision&&JSON.stringify(legacy)!==JSON.stringify(configs[mode]))throw error('CONFIGURATION_CONFLICT');}
    }
    if(!Object.hasOwn(map,'generation')&&(map.configurationIntegrity|| (await request(stores.journal.getAll())).some(j=>j.kind==='generation')))missing('GENERATION_RECORD_MISSING');
    const generation=Object.hasOwn(map,'generation')?map.generation:defaultGeneration();try{validateGeneration(generation);}catch{throw error('CONFIGURATION_CORRUPT');}if(proof.nativeGeneration>0&&generation.desired===0)missing('NATIVE_GENERATION_WITH_ZERO_CURRENT');
    let product;try{product=productState(map.product);}catch{throw error('CONFIGURATION_CORRUPT');}return {map,configs,product,generation};
  }
  // C2C-PERSIST-2: one durable complete boundary, not a shadow configuration.
  function boundary(stores,saved){
    for(const [id,value] of [['product',saved.product],...Object.entries(saved.configs).map(([m,c])=>['mode:'+m,c]),['generation',saved.generation]])
      if(!Object.hasOwn(saved.map,id))stores.state.put({id,value});
    stores.state.put({id:'configurationProvenance',value:{version:1,established:true,...(['OWNER_CONFIRMED_REBUILD','VERIFIED_RECOVERY'].includes(saved.map.configurationProvenance?.kind)?{kind:saved.map.configurationProvenance.kind}:{})}});
    rememberRows(stores,saved.map,['product','mode:simple','mode:nested','mode:depth']);
  }
  async function commitBoundary(fn,options){
    const operationId=operationIdentity(options?.context),started=signal('persistence.commit','started','PERSIST_STARTED',operationId,0,options?.context);
    try{const result=await transact('readwrite',fn,options);
      fault('afterCommit');await read({parentOperation:operationId,requires:started?[started]:[]});
      await retainEstablishment({version:1,established:true});signal('persistence.commit','ok','PERSIST_COMMITTED',operationId,result?.after??0,{requires:started?[started]:[]});return result;
    }catch(e){signal('persistence.commit','failed',['CONFIGURATION_RECORD_MISSING','CONFIGURATION_CONFLICT','CONFIGURATION_CORRUPT','REVISION_CONFLICT'].includes(e.code)?e.code:'STORAGE_COMMIT_FAILED',operationId);throw e;}
  }
  function rememberRows(stores,map,ids){const required=[...new Set([...(map.configurationIntegrity?.required??[]),...Object.keys(map).filter(k=>k==='product'||k.startsWith('mode:')),...ids])];stores.state.put({id:'configurationIntegrity',value:{version:1,required}});}
  async function getModeConfig(mode) {
    if(!Object.hasOwn(modeModules,mode))throw error('BACKUP_INVALID');
    return transact('readonly',async stores=>(await loadState(stores)).configs[mode]);
  }
  async function saveModeConfig(mode,config,{expectedRevision}={}) {
    const operationId=operationIdentity();signal('persistence.commit','started','PERSIST_STARTED',operationId);
    try {
      // Validate before entering IDB; unknown fields are rejected, never silently dropped.
      const normalized=validateModeConfig(mode,config);integer(expectedRevision);
      const result=await commitBoundary(async stores=>{
        const saved=await loadState(stores),prior=saved.configs[mode];boundary(stores,saved);
        if((prior?.revision??0)!==expectedRevision)throw error('REVISION_CONFLICT');
        const current=validateModeConfig(mode,{...normalized,revision:expectedRevision+1});
        const at=clock();integer(at);
        const checkpointId=mode+':'+new Date(at).toISOString().slice(0,10);
        if(prior&&!await request(stores.checkpoints.get(checkpointId)))stores.checkpoints.add({id:checkpointId,mode,at,config:prior});
        stores.state.put({id:'mode:'+mode,value:current});rememberRows(stores,saved.map,['mode:'+mode]);
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
      const result=await commitBoundary(async stores=>{
        const saved=await loadState(stores);boundary(stores,saved);const previous=saved.generation;
        if(acknowledge&&value!==previous.desired||!acknowledge&&(expectedGeneration!==previous.desired||value<=previous.desired))throw error('REVISION_CONFLICT');
        const current=acknowledge?{...previous,applied:value}:{desired:value,applied:previous.applied};
        validateGeneration(current);stores.state.put({id:'generation',value:current});
        await append(stores,{kind:'generation',mode:null,at:clock(),previous,current});return current;
      });
      signal('persistence.commit','ok','PERSIST_COMMITTED',operationId,result.desired);return result;
    } catch(e) {signal('persistence.commit','failed',e?.code==='REVISION_CONFLICT'?'REVISION_CONFLICT':'STORAGE_COMMIT_FAILED',operationId);throw e;}
  }
  async function read(context={}) {
    const operationId=operationIdentity(context),started=context.observe===false?0:signal('persistence.read','started','CURRENT_READ_STARTED',operationId,0,context);
    try{const result=await transact('readonly',async stores=>{const {map,configs,product,generation}=await loadState(stores);return {schemaVersion:1,configurationOrigin:['OWNER_CONFIRMED_REBUILD','VERIFIED_RECOVERY'].includes(map.configurationProvenance?.kind)?map.configurationProvenance.kind:'UNKNOWN_OR_LEGACY',configurationState:Object.hasOwn(map,'product')||Object.keys(map).some(k=>k.startsWith('mode:'))?'ESTABLISHED_VALID':'FRESH_VERIFIED',configs,product,generation,requiresReconnect:true,journalEvicted:map.journalMeta?.evicted??0};});if(context.observe!==false)signal('persistence.read','ok','CURRENT_READ_VALID',operationId,result.product.revision,{...context,requires:started?[started]:[]});return result;}
    catch(e){if(context.observe!==false)signal('persistence.read','failed',['CONFIGURATION_RECORD_MISSING','CONFIGURATION_CORRUPT','CONFIGURATION_CONFLICT'].includes(e.code)?e.code:'STORAGE_UNAVAILABLE',operationId);throw e;}
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
      await loadState(stores);
      const [rows,journal,checkpoints]=await Promise.all([request(stores.state.getAll()),request(stores.journal.getAll()),request(stores.checkpoints.getAll())]);
      const map=Object.fromEntries(rows.map(row=>[row.id,row.value])),configs={};
      for(const mode of Object.keys(modeModules)){const c=map['mode:'+mode]??map.product?.configs?.[mode];if(c)configs[mode]=c;}
      return validateBundle({format:BACKUP_FORMAT,schemaVersion:1,requiresReconnect:true,exportedAt:clock(),configs,product:productState(map.product),generation:map.generation??defaultGeneration(),journal,journalEvicted:map.journalMeta?.evicted??0,checkpoints});
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
      await commitBoundary(async (stores,tx)=>{
        const rows=await request(stores.state.getAll());
        if(stores.establishment.established||stores.establishment.nativeGeneration>0||rows.some(r=>r.id.startsWith('setup:'))||await request(stores.journal.count())||await request(stores.checkpoints.count()))throw error('RESTORE_RECOVERY_REQUIRED');
        if(rows.some(row=>row.id.startsWith('mode:')||['product','generation','configurationIntegrity'].includes(row.id)))throw error('RESTORE_NOT_EMPTY');
        for(const [mode,value] of Object.entries(restored.configs))stores.state.add({id:'mode:'+mode,value});
        stores.state.put({id:'product',value:productState(restored.product)});rememberRows(stores,{},['product',...Object.keys(restored.configs).map(m=>'mode:'+m)]);
        stores.state.add({id:'generation',value:{desired:restored.generation.desired,applied:null}});
        const next=(restored.journal.at(-1)?.sequence??restored.journalEvicted)+1;
        stores.state.put({id:'journalMeta',value:{next,evicted:restored.journalEvicted}});
        for(const row of restored.journal)stores.journal.add(row);
        for(const row of restored.checkpoints)stores.checkpoints.add(row);
        boundary(stores,{map:Object.fromEntries(rows.map(r=>[r.id,r.value])),product:productState(restored.product),configs:Object.fromEntries(Object.keys(modeModules).map(m=>[m,restored.configs[m]??modeModules[m].createConfig()])),generation:{desired:restored.generation.desired,applied:null}});
        if(restored.generation.applied!==null)await append(stores,{kind:'generation',mode:null,at:clock(),previous:restored.generation,current:{desired:restored.generation.desired,applied:null}});
        fault('beforeRestoreCommit',tx);
      });
      signal('persistence.restore','ok','RESTORE_REQUIRES_RECONNECT',operationId);return read();
    } catch(e) {signal('persistence.restore',e?.code==='BACKUP_AUTH_REQUIRED'?'blocked':'failed',e?.code==='BACKUP_AUTH_REQUIRED'?'BACKUP_AUTH_REQUIRED':'MIGRATION_QUARANTINED',operationId);throw e;}
  }
  // All modes, preferences and replay record share one CURRENT transaction.
  async function commitProduct({product,configs,expectedRevision,idempotencyKey,fingerprint,traceContext}) {
    const normalized=productState(product);
    const normalizedConfigs={};
    for(const mode of Object.keys(modeModules))normalizedConfigs[mode]=validateModeConfig(mode,configs[mode]);
    return commitBoundary(async stores=>{
      const durable=await loadState(stores);boundary(stores,durable);
      const retry=(await request(stores.state.get('retry:'+idempotencyKey)))?.value;
      if(retry){if(retry.fingerprint!==fingerprint)fail('IDEMPOTENCY_CONFLICT');return {...retry,replayed:true};}
      const savedProduct=(await request(stores.state.get('product')))?.value;
      const previous=durable.product;
      for(const mode of Object.keys(modeModules))if(normalizedConfigs[mode].revision!==durable.configs[mode].revision)fail('REVISION_CONFLICT');
      if(previous.revision!==expectedRevision)fail('REVISION_CONFLICT');
      const current=productState({...normalized,revision:expectedRevision+1});
      stores.state.put({id:'product',value:current});rememberRows(stores,durable.map,['product',...Object.keys(modeModules).map(m=>'mode:'+m)]);
      for(const [mode,config] of Object.entries(normalizedConfigs)) {
        const prior=(await request(stores.state.get('mode:'+mode)))?.value??savedProduct?.configs?.[mode]??null;
        if(!Object.hasOwn(durable.map,'mode:'+mode)||JSON.stringify(prior)!==JSON.stringify(config)) {
          const next=validateModeConfig(mode,{...config,revision:(prior?.revision??0)+1});
          stores.state.put({id:'mode:'+mode,value:next});
          await append(stores,{kind:'config',mode,at:clock(),previous:prior,current:next});
        }
      }
      await append(stores,{kind:'product',mode:null,at:clock(),previous,current});
      const receipt={fingerprint,before:previous.revision,after:current.revision,idempotencyKey};
      stores.state.put({id:'retry:'+idempotencyKey,value:receipt});
      const keys=await request(stores.state.getAllKeys());
      const retries=keys.filter(k=>String(k).startsWith('retry:'));
      if(retries.length>256)stores.state.delete(retries[0]);
      return receipt;
    },{context:traceContext});
  }
  // Explicit inspection only. Values/paths/accounts never enter metadata diagnostics.
  async function inspect(){
    const databases=typeof indexedDB?.databases==='function'?await indexedDB.databases():null;
    if(databases&&!databases.some(d=>d.name===dbName)){const proof=await readEstablishment();return {state:proof.established||proof.nativeGeneration>0?'ESTABLISHED_MISSING':'FRESH_VERIFIED',database:{present:false,name:dbName},records:{},journal:{count:0},checkpoints:{count:0}};}
    return transact('readonly',async stores=>{
      const rows=await request(stores.state.getAll()),journal=await request(stores.journal.getAll()),checkpoints=await request(stores.checkpoints.getAll()),map=Object.fromEntries(rows.map(r=>[r.id,r.value]));
      let state='ESTABLISHED_VALID',code,subreason;
      try{await loadState(stores);if(!rows.some(r=>['product','generation','configurationIntegrity','configurationProvenance'].includes(r.id)||r.id.startsWith('mode:')))state='FRESH_VERIFIED';}
      catch(e){code=e.code??'CONFIGURATION_CORRUPT';subreason=e.subreason;state=code==='CONFIGURATION_RECORD_MISSING'?'ESTABLISHED_MISSING':code==='CONFIGURATION_CONFLICT'?'RECOVERY_CONFLICT':'ESTABLISHED_CORRUPT';}
      const gen=map.generation;
      return {state,configurationOrigin:['OWNER_CONFIRMED_REBUILD','VERIFIED_RECOVERY'].includes(map.configurationProvenance?.kind)?map.configurationProvenance.kind:'UNKNOWN_OR_LEGACY',...(code?{code}:{}),...(subreason?{subreason}:{}),database:{name:dbName,present:true,version:1,stores:['state','journal','checkpoints'],sameOriginDatabaseCount:databases?.length??null},records:Object.fromEntries(['product','mode:simple','mode:nested','mode:depth','generation','configurationIntegrity','configurationProvenance'].map(k=>[k,Object.hasOwn(map,k)])),remainingRecords:rows.length,generation:gen&&Number.isSafeInteger(gen.desired)?{desired:gen.desired,applied:Number.isSafeInteger(gen.applied)?gen.applied:null}:null,journal:{count:journal.length,firstSequence:Number.isSafeInteger(journal[0]?.sequence)?journal[0].sequence:null,lastSequence:Number.isSafeInteger(journal.at(-1)?.sequence)?journal.at(-1).sequence:null},checkpoints:{count:checkpoints.length},establishment:{external:stores.establishment.established===true,nativeGeneration:Number.isSafeInteger(stores.establishment.nativeGeneration)?stores.establishment.nativeGeneration:null},native:stores.establishment.native??null,nativeRelation:Number.isSafeInteger(gen?.desired)&&stores.establishment.nativeGeneration>0&&stores.establishment.nativeGeneration!==gen.desired?'NATIVE_REGISTRATION_STALE':null,internalRecovery:{journalPresent:journal.length>0,checkpointsPresent:checkpoints.length>0,completeness:'NOT_PROVEN'}};
    });
  }
  // Private owner evidence: never returned by diagnostics/API. Retained only in a
  // user-authorized external directory before an explicit recovery apply.
  async function evidence(){if(typeof indexedDB?.databases==='function'&&!(await indexedDB.databases()).some(d=>d.name===dbName))return {schemaVersion:1,database:dbName,establishment:await readEstablishment(),state:[],journal:[],checkpoints:[],preservationCoverage:'JSON_RECORDS_EXACT_OPAQUE_HANDLES_UNCHANGED_IN_ORIGINAL_DATABASE'};return transact('readonly',snapshotEvidence);}
  async function snapshotEvidence(s){const state=await request(s.state.getAll());return {schemaVersion:1,database:dbName,establishment:s.establishment,state:state.map(r=>['directory','file'].includes(r.value?.kind)&&typeof r.value?.isSameEntry==='function'?{id:r.id,value:{opaqueFilesystemHandle:true,kind:r.value.kind}}:r),journal:await request(s.journal.getAll()),checkpoints:await request(s.checkpoints.getAll()),preservationCoverage:'JSON_RECORDS_EXACT_OPAQUE_HANDLES_UNCHANGED_IN_ORIGINAL_DATABASE'};}
  async function readRecoveryCandidate(){
    const e=await evidence(),latest={configs:{}};let generation;
    for(const row of e.journal){if(row.kind==='product')latest.product=row.current;else if(row.kind==='config')latest.configs[row.mode]=row.current;else if(row.kind==='generation')generation=row.current;}
    if(!latest.product||!generation||Object.keys(latest.configs).sort().join()!=='depth,nested,simple')return null;
    const normalized=validateProduct(latest);
    validateBundle({format:BACKUP_FORMAT,schemaVersion:1,requiresReconnect:true,exportedAt:clock(),...normalized,generation,journal:e.journal,journalEvicted:e.state.find(r=>r.id==='journalMeta')?.value.evicted??0,checkpoints:e.checkpoints});
    return normalized;
  }
  async function recoverProduct({candidate,expectedEvidence,idempotencyKey,fingerprint,generationFloor=0,kind='VERIFIED_RECOVERY',traceContext}){
    const restored=validateProduct(candidate);integer(generationFloor);if(!['VERIFIED_RECOVERY','OWNER_CONFIRMED_REBUILD'].includes(kind))throw error('BACKUP_INVALID');
    return commitBoundary(async stores=>{
      const retry=(await request(stores.state.get('retry:'+idempotencyKey)))?.value;
      if(retry){if(retry.fingerprint!==fingerprint)fail('IDEMPOTENCY_CONFLICT');return {...retry,replayed:true};}
      const actual=await snapshotEvidence(stores);
      if(JSON.stringify(actual)!==JSON.stringify(expectedEvidence))fail('RECOVERY_EVIDENCE_CHANGED');
      const map=Object.fromEntries(actual.state.map(r=>[r.id,r.value]));
      // Never overwrite a surviving choice, even when another row is missing.
      for(const [id,value] of [['product',restored.product],...Object.entries(restored.configs).map(([m,c])=>['mode:'+m,c])]){
        if(Object.hasOwn(map,id)&&JSON.stringify(map[id])!==JSON.stringify(value))fail('CONFIGURATION_CONFLICT');
      }
      for(const [id,value] of [['product',restored.product],...Object.entries(restored.configs).map(([m,c])=>['mode:'+m,c])])stores.state.put({id,value});
      const generation={desired:Math.max(generationFloor,Number.isSafeInteger(map.generation?.desired)?map.generation.desired:0,...actual.journal.filter(r=>r.kind==='generation'&&Number.isSafeInteger(r.current?.desired)).map(r=>r.current.desired)),applied:null};validateGeneration(generation);
      stores.state.put({id:'generation',value:generation});
      // Preserve journals/checkpoints verbatim. They are historical evidence, not
      // silently rewritten into a fictional replay of this restore.
      stores.state.put({id:'configurationProvenance',value:{version:1,established:true,kind}});
      rememberRows(stores,{},['product','mode:simple','mode:nested','mode:depth']);
      const receipt={fingerprint,before:null,after:restored.product.revision,idempotencyKey,recoveryKind:kind};
      stores.state.put({id:'retry:'+idempotencyKey,value:receipt});return receipt;
    },{recoverMissing:true,context:traceContext});
  }
  return Object.freeze({
    recordRemoteResult:value=>transact('readwrite',async s=>{if(typeof value.operationId!=='string'||!value.operationId)fail('OPERATION_INVALID');const safe={kind:value.kind==='readiness'?'readiness':value.kind==='file-action'?'file-action':'save',operationId:value.operationId,state:value.state,code:value.code,cause:value.cause,...(safeRemoteDiagnostic(value.diagnostic)?{diagnostic:safeRemoteDiagnostic(value.diagnostic)}:{}),destination:value.destination,receipt:value.receipt,proofKind:value.proofKind,durationMs:value.durationMs,timings:value.timings,stage:value.stage,bytes:value.bytes,at:clock()};s.state.put({id:'remote-result:'+value.operationId,value:safe});return safe;}),
    readRemoteResult:operationId=>transact('readonly',async s=>(await request(s.state.get('remote-result:'+operationId)))?.value??((await request(s.state.get('remoteResults')))?.value??[]).find(r=>r.operationId===operationId)??null),
    readRemoteResults:({cursor,limit}={})=>transact('readonly',async s=>{const rows=await request(s.state.getAll()),legacy=rows.find(x=>x.id==='remoteResults')?.value??[],all=[...new Map([...legacy,...rows.filter(x=>x.id.startsWith('remote-result:')).map(x=>x.value)].map(x=>[x.operationId,x])).values()].sort((a,b)=>b.at-a.at||a.operationId.localeCompare(b.operationId));if(limit===undefined)return all;const start=cursor?all.findIndex(x=>x.operationId===cursor)+1:0,items=all.slice(start,start+limit);return {items,nextCursor:start+limit<all.length?items.at(-1)?.operationId:null};}),
    readExplorerLocation:()=>transact('readonly',async s=>(await request(s.state.get('explorerLocation')))?.value??null),
    writeExplorerLocation:target=>transact('readwrite',async s=>{const value=normalizeTarget(target);s.state.put({id:'explorerLocation',value});return value;}),
    readSetupOperation:id=>transact('readonly',async s=>(await request(s.state.get('setup:'+id)))?.value??null),
    writeSetupOperation:(id,value)=>commitBoundary(async s=>{const saved=await loadState(s);boundary(s,saved);s.state.put({id:'setup:'+id,value});return value;}),
    read,inspect,evidence,readRecoveryCandidate,recoverProduct,getModeConfig,saveModeConfig,commitProduct,
    findRetry:async id=>{if(typeof indexedDB?.databases==='function'&&!(await indexedDB.databases()).some(d=>d.name===dbName))return null;return transact('readonly',async s=>(await request(s.state.get('retry:'+id)))?.value??null);},
    reserveOperation:(id,fingerprint)=>transact('readwrite',async s=>{const key='operation:'+id;if(await request(s.state.get(key)))return false;s.state.put({id:key,value:{fingerprint,at:clock(),state:'RESERVED_INSPECT_BEFORE_RETRY'}});return true;}),
    stageBackupRoot:handle=>transact('readwrite',async s=>{s.state.put({id:'backupRootCandidate',value:handle});return true;}),
    readBackupCandidate:()=>transact('readonly',async s=>(await request(s.state.get('backupRootCandidate')))?.value??null),
    readBackupRoot:async()=>{if(typeof indexedDB?.databases==='function'&&!(await indexedDB.databases()).some(d=>d.name===dbName))return null;return transact('readonly',async s=>(await request(s.state.get('backupRoot')))?.value??null);},
    attachRecoveryRoot:handle=>transact('readwrite',async s=>{const old=(await request(s.state.get('backupRoot')))?.value;if(old)throw error('PREVIOUS_BACKUP_REQUIRES_REVIEW');s.state.put({id:'backupRoot',value:handle});return true;}),
    setBackupRoot:handle=>commitBoundary(async s=>{const saved=await loadState(s);boundary(s,saved);s.state.put({id:'backupRoot',value:handle});return true;}),
    setDesiredGeneration:(g,o)=>generationChange(g,o),acknowledgeGeneration:g=>generationChange(g,{acknowledge:true}),journal,exportEncrypted,restoreEncrypted,
    async close(){if(opening){const db=await opening;db.close();opening=null;}}
  });
}
