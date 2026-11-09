// R2 custom metadata has a 2 KiB combined UTF-8 key/value service budget.
export const R2_METADATA_BYTES=2048;
const fail=code=>{throw Object.assign(Error(code),{code});};
const closed=(v,keys)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))fail('PROVENANCE_INVALID');};
const text=(v,max=512)=>{if(typeof v!=='string'||!v||v.length>max||/[\x00-\x1f\x7f]/.test(v))fail('PROVENANCE_INVALID');};
export const metadataJSON=value=>JSON.stringify(value??null).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
export function validateSelection(value,destination){
 closed(value,['schema','mode','entryId','location','menuPath','presentation']);if(value.schema!==1||!['simple','narrow','depth'].includes(value.mode))fail('PROVENANCE_INVALID');text(value.entryId,128);
 closed(value.location,['provider','bucket','directories']);const l=value.location,dirs=destination.prefix.split('/').filter(Boolean);
 if(l.provider!=='cloudflare'||l.bucket!==destination.bucketName||!Array.isArray(l.directories)||JSON.stringify(l.directories)!==JSON.stringify(dirs))fail('PROVENANCE_TARGET_MISMATCH');
 for(const d of l.directories)text(d,1024);if(!Array.isArray(value.menuPath)||!value.menuPath.length)fail('PROVENANCE_INVALID');for(const title of value.menuPath)text(title);
 const p=value.presentation;if(p?.placement!==undefined&&p.placement!=='quick')fail('PROVENANCE_INVALID');if(p?.configuredVisibilityMode!==undefined&&(!['all','hide-all','custom'].includes(p.configuredVisibilityMode)||p.placement!=='quick'||p.visibilityMode!=='hide-all'))fail('PROVENANCE_INVALID');
 if(value.mode==='simple'){closed(p,['id','title','configuredTitle','labelSource','visibility','placement']);if(p.id!==undefined)text(p.id,128);text(p.title);text(p.configuredTitle);if(!['name','menu_title'].includes(p.labelSource)||p.visibility!=='hide-all')fail('PROVENANCE_INVALID');}
 if(value.mode==='narrow'){
  closed(p,['id','title','visibilityMode','levels','bucketTitle','bucketVisible','placement','configuredVisibilityMode']);text(p.id,128);text(p.title);if(!['all','hide-all','custom'].includes(p.visibilityMode)||!Array.isArray(p.levels)||p.levels.length!==dirs.length)fail('PROVENANCE_INVALID');
  for(let i=0;i<dirs.length;i++){const level=p.levels[i];closed(level,['actual','title','visible']);if(level.actual!==dirs[i]||typeof level.visible!=='boolean'||i===dirs.length-1&&!level.visible)fail('PROVENANCE_INVALID');text(level.title);if(p.visibilityMode==='all'&&!level.visible||p.visibilityMode==='hide-all'&&i<dirs.length-1&&level.visible)fail('PROVENANCE_INVALID');}
  if(p.bucketTitle!==undefined){text(p.bucketTitle);if(typeof p.bucketVisible!=='boolean')fail('PROVENANCE_INVALID');}
 }
 if(value.mode==='depth'&&p!==undefined)fail('PROVENANCE_INVALID');
 if(new TextEncoder().encode(metadataJSON(value)).length>R2_METADATA_BYTES)fail('PROVENANCE_TOO_LARGE');return value;
}
export function objectProvenance(selection,{destination,originalFilename,storedFilename,operationId}){
 validateSelection(selection,destination);for(const name of [originalFilename,storedFilename]){text(name,1024);if(/[\\/]/.test(name))fail('PROVENANCE_INVALID');}
 const value={...selection,operationId,originalFilename,storedFilename},encoded=metadataJSON(value),size=new TextEncoder().encode('operationId'+operationId+'click2cloud'+encoded).length;
 if(size>R2_METADATA_BYTES)fail('PROVENANCE_TOO_LARGE');return {value,encoded};
}
export function selectionMatches(selection,object){if(!object)return false;const {operationId,originalFilename,storedFilename,...actual}=object;return metadataJSON(actual)===metadataJSON(selection);}
