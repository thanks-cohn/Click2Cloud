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
export function normalizedDestinations(values=[],{multipleTargets=false}={}) {
  if(!Array.isArray(values))throw new MenuSpecError('INVALID_CONFIG','Destinations must be an array.');
  const seen=new Set(),ids=new Set();
  return values.map((item,index)=>{
    const target=normalizeTarget(item.target??item);
    const key=targetKey(target);
    if(!multipleTargets&&seen.has(key))throw new MenuSpecError('DUPLICATE_DESTINATION','Exact destination occurs twice in one mode.');
    seen.add(key);
    const id=item.id??stableId('destination',key);
    if(typeof id!=='string'||!id||id.length>128||/[\x00-\x1f]/.test(id))throw new MenuSpecError('INVALID_CONFIG','Invalid presentation identity.');
    if(ids.has(id))throw new MenuSpecError('DUPLICATE_DESTINATION','Duplicate presentation identity.');
    ids.add(id);
    if(item.label!==undefined&&(typeof item.label!=='string'||!item.label||/[\x00-\x1f]/.test(item.label)))
      throw new MenuSpecError('INVALID_LABEL','Labels must be non-empty plain text.');
    for(const field of ['hidden','quick'])if(item[field]!==undefined&&typeof item[field]!=='boolean')throw new MenuSpecError('INVALID_CONFIG','Invalid destination flag.');
    if(item.order!==undefined&&(!Number.isSafeInteger(item.order)||item.order<0))throw new MenuSpecError('INVALID_CONFIG','Invalid order.');
    if(item.aliases!==undefined&&(!Array.isArray(item.aliases)||item.aliases.some(x=>typeof x!=='string'||x.length>256||/[\x00-\x1f]/.test(x))))throw new MenuSpecError('INVALID_CONFIG','Invalid ancestor aliases.');
    if(item.visibilityMode!==undefined&&!['all','hide-all','custom'].includes(item.visibilityMode))throw new MenuSpecError('INVALID_CONFIG','Invalid Narrow visibility mode.');
    const paths=['',...ancestors(target.prefix)];
    const legacyLevels=Object.fromEntries((item.aliases??[]).map((label,i)=>[paths[i],{label}]).filter(([p,v])=>p!==undefined&&v.label));
    const levels={...legacyLevels,...item.levels??{}};
    if(!levels||typeof levels!=='object'||Array.isArray(levels))throw new MenuSpecError('INVALID_CONFIG','Invalid level configuration.');
    for(const [p,v] of Object.entries(levels)) {
      if(!['',...ancestors(target.prefix)].includes(p)||!v||Object.keys(v).some(k=>!['hidden','label'].includes(k))||v.hidden!==undefined&&typeof v.hidden!=='boolean'||v.label!==undefined&&(typeof v.label!=='string'||!v.label||/[\x00-\x1f]/.test(v.label)))throw new MenuSpecError('INVALID_CONFIG','Invalid level configuration.');
    }
    return {id,target,...(item.label===undefined?{}:{label:item.label}),
      ...(item.visibilityMode===undefined?{}:{visibilityMode:item.visibilityMode}),...(item.hidden===undefined?{}:{hidden:item.hidden}),...(item.quick===undefined?{}:{quick:item.quick}),...(item.order===undefined?{}:{order:item.order}),...(!Object.keys(levels).length?{}:{levels:structuredClone(levels)})};
  });
}
export function availabilityReasons(scope,folder) {
  if(!scope)return ['SCOPE_UNDISCOVERED'];
  const reasons=[];
  if(scope.authorized!==true)reasons.push('SCOPE_UNAUTHORIZED');
  if(scope.stale===true)reasons.push('INVENTORY_STALE');
  if((folder?.workerReady??scope.workerReady)!==true)reasons.push('WORKER_UNVERIFIED');
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
