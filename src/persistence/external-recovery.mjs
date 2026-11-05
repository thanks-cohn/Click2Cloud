import {validateProduct} from '../api/config.mjs';
const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
export function isoWeek(date) {const d=new Date(date);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));const year=d.getUTCFullYear();return {year,week:Math.ceil((((d-new Date(Date.UTC(year,0,1)))/86400000)+1)/7)};}
/** The filesystem owner supplies atomic replace and exclusive immutable writes. No credentials accepted. */
export function createExternalRecovery({files,clock=Date.now}={}) {
  if(!files?.read||!files?.replace||!files?.list||!files?.create)throw TypeError('Authorized external filesystem required');
  async function encode(namespace,value,sequence) {const payload=JSON.stringify({schemaVersion:1,namespace,sequence,at:clock(),value});return JSON.stringify({payload,checksum:await digest(payload)});}
  async function decode(text,namespace) {
    const e=JSON.parse(text);if(await digest(e.payload)!==e.checksum)throw Error('BACKUP_CHECKSUM_INVALID');
    const p=JSON.parse(e.payload);if(p.schemaVersion!==1||p.namespace!==namespace||!Number.isSafeInteger(p.sequence))throw Error('BACKUP_SCHEMA_INVALID');return p;
  }
  async function readNamespace(namespace) {
    let point;
    try {point=await decode(await files.read(namespace+'/CURRENT.json'),namespace);}catch {
      const paths=(await files.list(namespace+'/backups')).filter(p=>/\d{4}-(?:W\d{2}|\d{2}-\d{2})\.json$/.test(p)).sort().reverse();
      for(const path of paths)try{point=await decode(await files.read(path),namespace);break;}catch{}
    }
    const journals=(await files.list(namespace+'/journal')).filter(p=>p.endsWith('.jsonl')).sort();
    for(const path of journals)for(const line of (await files.read(path)).trim().split('\n').filter(Boolean)) {
      const delta=await decode(line,namespace);if(!point){if(delta.sequence!==1)throw Error('RECOVERY_JOURNAL_GAP');point=delta;continue;}if(delta.sequence<=point.sequence)continue;
      if(delta.sequence!==point.sequence+1)throw Error('RECOVERY_JOURNAL_GAP');point=delta;
    }
    if(!point)throw Error('NO_VALID_RECOVERY_POINT');return point;
  }
  async function writeNamespace(namespace,value,{cadence='weekly'}={}) {
    let prior=null;try{prior=await readNamespace(namespace);}catch(e){if(e.message!=='NO_VALID_RECOVERY_POINT')throw e;}
    const sequence=(prior?.sequence??0)+1,text=await encode(namespace,value,sequence),date=new Date(clock()),month=date.toISOString().slice(0,7),journal=namespace+'/journal/'+month+'.jsonl';
    let previous='';try{previous=await files.read(journal);}catch(e){if(e.code!=='ENOENT'&&e.name!=='NotFoundError')throw e;}
    // Journal becomes durable before CURRENT; recovery can replay a crash between them.
    await files.replace(journal,previous+text+'\n');
    await files.replace(namespace+'/CURRENT.json',text);
    const verified=await decode(await files.read(namespace+'/CURRENT.json'),namespace);
    if(verified.sequence!==sequence)throw Error('BACKUP_READBACK_FAILED');
    const {year,week}=isoWeek(date),stamp=cadence==='daily'?date.toISOString().slice(0,10):`${year}-W${String(week).padStart(2,'0')}`,snapshot=namespace+'/backups/'+stamp+'.json';
    const created=await files.create(snapshot,text);const checkpoint=created?text:await files.read(snapshot);await decode(checkpoint,namespace);await files.replace(namespace+'/backups/'+cadence+'.json',checkpoint);
    return {state:'VERIFIED',namespace,sequence,checksum:JSON.parse(text).checksum,evidenceClass:'external-filesystem-readback'};
  }
  return Object.freeze({readNamespace,writeNamespace,
    async exportVerified(filename,value){
      if(typeof filename!=='string'||! /^[a-zA-Z0-9._-]+\.json$/.test(filename))throw Error('INVALID_EXPORT_NAME');
      const text=await encode('whole-cloud-export',value,1);
      if(!await files.create(filename,text))throw Error('EXPORT_ALREADY_EXISTS');
      const verified=await decode(await files.read(filename),'whole-cloud-export');
      return {state:'VERIFIED',filename,checksum:JSON.parse(text).checksum,complete:verified.value.complete===true};
    },
    async writeVerified(product) {
      const p=validateProduct(product),menu={...p,configs:{...p.configs,depth:{schemaVersion:1,mode:'depth',revision:0,scopes:[]}}};
      const options={cadence:p.recoveryPolicy.cadence};const menuReceipt=await writeNamespace('menu-config',menu,options),depthReceipt=await writeNamespace('depth-config',p.configs.depth,options);
      const policyReceipt=await writeNamespace('recovery-policy',p.recoveryPolicy,options);
      return {state:'VERIFIED',receipts:[menuReceipt,depthReceipt,policyReceipt]};
    },async readVerified() {
      const menu=await readNamespace('menu-config');const p=structuredClone(menu.value);
      try{p.configs.depth=(await readNamespace('depth-config')).value;}catch{}try{p.recoveryPolicy=(await readNamespace('recovery-policy')).value;}catch{}return validateProduct(p);
    }
  });
}
/** File System Access is explicitly user selected and independent of extension storage. */
export function directoryFiles(root) {
  async function locate(path,create=false) {const parts=path.split('/');const name=parts.pop();let dir=root;for(const part of parts)dir=await dir.getDirectoryHandle(part,{create});return {dir,name};}
  return Object.freeze({async read(path){const {dir,name}=await locate(path);return (await (await dir.getFileHandle(name)).getFile()).text();},
    async replace(path,text){const {dir,name}=await locate(path,true),h=await dir.getFileHandle(name,{create:true}),w=await h.createWritable();await w.write(text);await w.close();},
    async create(path,text){const {dir,name}=await locate(path,true);try{await dir.getFileHandle(name);return false;}catch(e){if(e.name!=='NotFoundError')throw e;}const w=await (await dir.getFileHandle(name,{create:true})).createWritable();await w.write(text);await w.close();return true;},
    async list(path){let dir=root;try{for(const part of path.split('/'))dir=await dir.getDirectoryHandle(part);}catch{return [];}const rows=[];for await(const [name,h] of dir.entries())if(h.kind==='file')rows.push(path+'/'+name);return rows;}
  });
}
