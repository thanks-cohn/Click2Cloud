
/** Depth V3+1 reference namespace/identity contract (not deployed). */
export function scopeKey(scope){
  const fields=['providerKind','connectionId','accountId','containerId'];
  if(!scope||fields.some(f=>typeof scope[f]!=='string'||!scope[f]))throw new TypeError('Incomplete Depth scope');
  return JSON.stringify(fields.map(f=>scope[f]));
}
export function folderKey(scope,prefix=''){
  if(typeof prefix!=='string'||prefix.startsWith('/')||prefix.endsWith('/')||
      prefix.includes('//')||prefix.split('/').some(s=>s==='.'||s==='..'))
    throw new TypeError('Invalid exact folder prefix');
  return JSON.stringify([scopeKey(scope),prefix]);
}
/** This identity is intentionally unchanged by menuDepth. */
export function inventoryKey(scope,_menuDepth=null){return scopeKey(scope)}
export function parentPrefix(prefix){
  if(prefix==='')return null;
  const index=prefix.lastIndexOf('/');
  return index===-1?'':prefix.slice(0,index);
}
export function folderLevel(prefix){return prefix===''?0:prefix.split('/').length}
