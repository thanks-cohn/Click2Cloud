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
  async function writeNamespace(namespace,value,{cadence='weekly',checkpointValue=value}={}) {
    let prior=null;try{prior=await readNamespace(namespace);}catch(e){if(e.message!=='NO_VALID_RECOVERY_POINT')throw e;}
    const sequence=(prior?.sequence??0)+1,text=await encode(namespace,value,sequence),date=new Date(clock()),month=date.toISOString().slice(0,7),journal=namespace+'/journal/'+month+'.jsonl';
    let previous='';try{previous=await files.read(journal);}catch(e){if(e.code!=='ENOENT'&&e.name!=='NotFoundError')throw e;}
    // Journal becomes durable before CURRENT; recovery can replay a crash between them.
    await files.replace(journal,previous+text+'\n');
    await files.replace(namespace+'/CURRENT.json',text);
    const verified=await decode(await files.read(namespace+'/CURRENT.json'),namespace);
    if(verified.sequence!==sequence)throw Error('BACKUP_READBACK_FAILED');
    const {year,week}=isoWeek(date),stamp=cadence==='daily'?date.toISOString().slice(0,10):`${year}-W${String(week).padStart(2,'0')}`,snapshot=namespace+'/backups/'+stamp+'.json';
    const checkpointText=await encode(namespace,checkpointValue,sequence);
    const created=await files.create(snapshot,checkpointText);const checkpoint=created?checkpointText:await files.read(snapshot);await decode(checkpoint,namespace);await files.replace(namespace+'/backups/'+cadence+'.json',checkpoint);
    return {state:'VERIFIED',namespace,sequence,checksum:JSON.parse(text).checksum,evidenceClass:'external-filesystem-readback'};
  }
  return Object.freeze({readNamespace,writeNamespace,
    async preserveEvidence(value){const text=await encode('local-current-forensic-evidence',value,1),checksum=JSON.parse(text).checksum,filename='current-evidence-'+checksum+'.json';if(!await files.create(filename,text)){const prior=await files.read(filename);if(prior!==text){const decoded=await decode(prior,'local-current-forensic-evidence');if(JSON.stringify(decoded.value)!==JSON.stringify(value))throw Error('BACKUP_READBACK_FAILED');}}const verified=await decode(await files.read(filename),'local-current-forensic-evidence');if(JSON.stringify(verified.value)!==JSON.stringify(value))throw Error('BACKUP_READBACK_FAILED');return {state:'VERIFIED',checksum,filename,evidenceClass:'external-filesystem-readback'};},
    async exportVerified(filename,value){
      if(typeof filename!=='string'||! /^[a-zA-Z0-9._-]+\.json$/.test(filename))throw Error('INVALID_EXPORT_NAME');
      const text=await encode('whole-cloud-export',value,1);
      if(!await files.create(filename,text))throw Error('EXPORT_ALREADY_EXISTS');
      const verified=await decode(await files.read(filename),'whole-cloud-export');
      return {state:'VERIFIED',filename,checksum:JSON.parse(text).checksum,complete:verified.value.complete===true};
    },
    async writeVerified(product) {
      const p=validateProduct({product:product.product,configs:product.configs}),menu={...p,configs:{...p.configs,depth:{schemaVersion:1,mode:'depth',revision:0,scopes:[]}}};
      const options={cadence:p.product.recovery.cadence};
      const checkpoint=structuredClone(menu),excludedModes=[];
      for(const mode of ['simple','nested'])if(!p.product.recovery[mode]){excludedModes.push(mode);checkpoint.configs[mode]={schemaVersion:1,mode,revision:0,destinations:[]};}
      if(excludedModes.length)checkpoint.excludedModes=excludedModes;
      const menuReceipt=await writeNamespace('menu-config',menu,{...options,checkpointValue:checkpoint}),depthReceipt=await writeNamespace('depth-config',p.configs.depth,options);
      const policyReceipt=await writeNamespace('recovery-policy',p.product.recovery,options);
      const points=await Promise.all(['menu-config','depth-config','recovery-policy'].map(async namespace=>{const point=await readNamespace(namespace);return [namespace,{sequence:point.sequence,checksum:await digest(JSON.stringify(point.value))}];}));
      const boundary=await writeNamespace('configuration-boundary',{schemaVersion:1,revision:p.product.revision,namespaces:Object.fromEntries(points)});
      return {state:'VERIFIED',receipts:[menuReceipt,depthReceipt,policyReceipt,boundary]};
    },async readVerified(current) {
      let boundary;try{boundary=(await readNamespace('configuration-boundary')).value;}catch{throw Error('RECOVERY_BOUNDARY_UNVERIFIED');}
      if(boundary?.schemaVersion!==1||Object.keys(boundary.namespaces??{}).sort().join()!=='depth-config,menu-config,recovery-policy')throw Error('BACKUP_SCHEMA_INVALID');
      for(const namespace of Object.keys(boundary.namespaces)){const point=await readNamespace(namespace),expected=boundary.namespaces[namespace];if(point.sequence!==expected.sequence||await digest(JSON.stringify(point.value))!==expected.checksum)throw Error('RECOVERY_NAMESPACE_CONFLICT');}
      const menu=await readNamespace('menu-config');if(menu.value.product?.revision!==boundary.revision)throw Error('RECOVERY_NAMESPACE_CONFLICT');let p=structuredClone(menu.value);if(!p.product)p=validateProduct(p);
      for(const mode of p.excludedModes??[]){if(!['simple','nested'].includes(mode)||!current?.configs?.[mode])throw Error('RECOVERY_PARTIAL_REQUIRES_MERGE');p.configs[mode]=structuredClone(current.configs[mode]);}delete p.excludedModes;
      // Missing independent namespaces are partial evidence, never empty Depth/default policy.
      p.configs.depth=(await readNamespace('depth-config')).value;p.product.recovery=(await readNamespace('recovery-policy')).value;return validateProduct(p);
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

// Copy every existing file before switching roots; verify bytes independently.
export async function copyRecoveryDirectory(from,to) {
  let count=0;
  async function copy(source,destination){
    for await(const [name,h] of source.entries()) {
      if(h.kind==='directory'){await copy(h,await destination.getDirectoryHandle(name,{create:true}));continue;}
      const before=new Uint8Array(await (await h.getFile()).arrayBuffer());
      const out=await destination.getFileHandle(name,{create:true}),w=await out.createWritable();await w.write(before);await w.close();
      const after=new Uint8Array(await (await out.getFile()).arrayBuffer());
      if(before.length!==after.length||before.some((v,i)=>v!==after[i]))throw Error('BACKUP_COPY_READBACK_FAILED');count++;
    }
  }
  await copy(from,to);return {files:count,evidenceClass:'external-filesystem-readback'};
}
