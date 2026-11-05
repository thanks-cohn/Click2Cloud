// Public, provider-neutral MenuSpec identity contract. Never derive authority from a label.
const utf8=new TextEncoder();
export class MenuSpecError extends Error {
  constructor(code, message) { super(message); this.name='MenuSpecError'; this.code=code; }
}
export const compare = (a,b)=>a===b?0:a<b?-1:1;
export function freeze(value) {
  if(value && typeof value==='object' && !Object.isFrozen(value)) {
    for(const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export function normalizePrefix(value='') {
  if(typeof value!=='string'||value.startsWith('/')||value.includes('\\')||value.includes('\0'))
    throw new MenuSpecError('INVALID_PREFIX','Destination prefixes must be bucket-relative paths.');
  const p=value.endsWith('/')?value.slice(0,-1):value;
  if(p && p.split('/').some(x=>!x||x==='.'||x==='..'))
    throw new MenuSpecError('INVALID_PREFIX','Empty or traversing path component.');
  if(utf8.encode(p).length>1024) throw new MenuSpecError('INVALID_PREFIX','Prefix exceeds provider key limit.');
  return p?p+'/':'';
}
export function normalizeTarget(input) {
  if(!input || typeof input!=='object')throw new MenuSpecError('INVALID_TARGET','Missing canonical target.');
  const result={};
  for(const field of ['provider','connectionId','accountId']) {
    if(typeof input[field]!=='string'||!input[field]||/[\x00-\x1f]/.test(input[field]))
      throw new MenuSpecError('INVALID_TARGET','Canonical target requires '+field+'.');
    result[field]=input[field];
  }
  const container=input.bucketName??input.container;
  if(typeof container!=='string'||!container||/[\x00-\x1f]/.test(container))
    throw new MenuSpecError('INVALID_TARGET','Canonical target requires a container.');
  result.bucketName=container;
  result.prefix=normalizePrefix(input.prefix??input.path??'');
  return freeze(result);
}
export const targetKey=target=>JSON.stringify([target.provider,target.connectionId,target.accountId,target.bucketName,target.prefix]);
export const scopeKey=target=>JSON.stringify([target.provider,target.connectionId,target.accountId,target.bucketName]);
export function stableId(namespace,value) {
  // Exact FNV-1a 64-bit multiplication modulo 2^64, represented by two
  // unsigned words. Products by 435 remain exactly representable as Numbers.
  // This preserves existing IDs while avoiding a BigInt allocation per byte.
  let hi=0xcbf29ce4,lo=0x84222325;
  for(const byte of utf8.encode(value)) {
    lo=(lo^byte)>>>0;
    const product=lo*435;
    hi=(hi*435+Math.floor(product/0x100000000)+(lo<<8))>>>0;
    lo=product>>>0;
  }
  return 'c2c:'+namespace+':'+hi.toString(16).padStart(8,'0')+lo.toString(16).padStart(8,'0');
}
export function targetLabel(target) { return target.prefix?target.prefix.split('/').at(-2):target.bucketName; }
export function configRevision(current,expected) {
  if(expected!==undefined&&expected!==current.revision)throw new MenuSpecError('STALE_REVISION','Mode configuration changed.');
  return current.revision+1;
}
export function validateRevision(value) {
  if(!Number.isSafeInteger(value)||value<0)throw new MenuSpecError('INVALID_REVISION','Revision must be a non-negative safe integer.');
  return value;
}
export function normalizedDestinations(values=[]) {
  if(!Array.isArray(values))throw new MenuSpecError('INVALID_CONFIG','Destinations must be an array.');
  const seen=new Set();
  return values.map((item,index)=>{
    const target=normalizeTarget(item.target??item);
    const key=targetKey(target);
    if(seen.has(key))throw new MenuSpecError('DUPLICATE_DESTINATION','Exact destination occurs twice in one mode.');
    seen.add(key);
    if(item.label!==undefined&&(typeof item.label!=='string'||!item.label||/[\x00-\x1f]/.test(item.label)))
      throw new MenuSpecError('INVALID_LABEL','Labels must be non-empty plain text.');
    if(item.aliases!==undefined&&(!Array.isArray(item.aliases)||item.aliases.some(x=>typeof x!=='string'||x.length>256||/[\x00-\x1f]/.test(x))))throw new MenuSpecError('INVALID_LABEL','Invalid ancestor aliases');
    return {id:typeof item.id==='string'?item.id:String(index),target,...(item.aliases?{aliases:[...item.aliases]}:{}),...(item.label===undefined?{}:{label:item.label})};
  });
}
export function availabilityReasons(scope,folder) {
  if(!scope)return ['SCOPE_UNDISCOVERED'];
  const reasons=[];
  if(scope.authorized!==true)reasons.push('SCOPE_UNAUTHORIZED');
  if(scope.stale===true)reasons.push('INVENTORY_STALE');
  if(scope.workerReady!==true)reasons.push('WORKER_UNVERIFIED');
  if(!folder)reasons.push(scope.complete===true?'FOLDER_UNDISCOVERED':'INVENTORY_INCOMPLETE');
  if(folder?.writable===false)reasons.push('FOLDER_NOT_WRITABLE');
  return reasons;
}
export const availability=(scope,folder)=>availabilityReasons(scope,folder)[0]??null;
export function findCandidate(inventory,target) {
  const scope=inventory.scopes.find(s=>scopeKey(s.target)===scopeKey(target));
  return {scope,folder:scope?.folders.find(f=>f.target.prefix===target.prefix)};
}
export function ancestors(prefix) {
  const parts=normalizePrefix(prefix).split('/').filter(Boolean);
  return parts.map((_,i)=>parts.slice(0,i+1).join('/')+'/');
}
export const intentFor=target=>freeze({...target,bucket:target.bucketName,path:target.prefix.replace(/\/$/,'')});
