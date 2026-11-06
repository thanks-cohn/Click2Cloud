import {validateModeConfig} from '../persistence/schema.mjs';
import {normalizeTarget} from '../core/menu-identity.mjs';
export const fail=code=>{throw Object.assign(Error(code),{code});};
export function productState(raw={}) {
  if(raw?.configs)return migrateLegacyProduct(raw).product;
  const defaults={schemaVersion:1,revision:0,theme:'dark',show:{simple:true,nested:true,depth:false,flat:false},defaultTarget:null,
    menuCustomized:raw?.menuCustomized??(Number(raw?.revision)>0),cloudflare:{initialized:[],pending:[],selectedAccountId:null},favorites:[],placement:{},suggestionDismissed:null,view:'details',recovery:{cadence:'weekly',simple:true,nested:true,buckets:[],location:'automatic'},wholeCloud:{connections:[],enabled:false}};
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!Object.hasOwn(defaults,k)))fail('INVALID_STATE');
  const s={...defaults,...structuredClone(raw)};
  if(s.schemaVersion!==1||!Number.isSafeInteger(s.revision)||s.revision<0||!['dark','light'].includes(s.theme)||!['details','list'].includes(s.view))fail('INVALID_STATE');
  if(!s.show||Object.keys(s.show).sort().join()!=='depth,flat,nested,simple'||Object.values(s.show).some(v=>typeof v!=='boolean'))fail('INVALID_STATE');
  if(typeof s.menuCustomized!=='boolean'||!s.cloudflare||Object.keys(s.cloudflare).sort().join()!=='initialized,pending,selectedAccountId'||!['initialized','pending'].every(k=>Array.isArray(s.cloudflare[k])&&s.cloudflare[k].every(a=>typeof a==='string'&&a))||s.cloudflare.selectedAccountId!==null&&typeof s.cloudflare.selectedAccountId!=='string')fail('INVALID_STATE');
  if(s.defaultTarget)s.defaultTarget=validateModeConfig('simple',{destinations:[{target:s.defaultTarget}]}).destinations[0].target;
  if(!Array.isArray(s.favorites)||s.favorites.length>4096||s.favorites.some(x=>typeof x!=='string'||x.length>256))fail('INVALID_STATE');
  if(!s.placement||typeof s.placement!=='object'||Array.isArray(s.placement)||Object.entries(s.placement).some(([k,v])=>!k||!['direct','other'].includes(v)))fail('INVALID_STATE');
  if(s.suggestionDismissed!==null&&(typeof s.suggestionDismissed!=='string'||s.suggestionDismissed.length>8192))fail('INVALID_STATE');
  const r=s.recovery,w=s.wholeCloud;
  if(!r||Object.keys(r).sort().join()!=='buckets,cadence,location,nested,simple'||!['weekly','daily'].includes(r.cadence)||!['automatic','documents'].includes(r.location)||typeof r.simple!=='boolean'||typeof r.nested!=='boolean'||!Array.isArray(r.buckets))fail('INVALID_STATE');
  for(const b of r.buckets){if(!b||Object.keys(b).sort().join()!=='depth,enabled,target'||typeof b.enabled!=='boolean'||!Number.isSafeInteger(b.depth)||b.depth<1)fail('INVALID_STATE');validateModeConfig('simple',{destinations:[{target:b.target}]});}
  if(!w||Object.keys(w).sort().join()!=='connections,enabled'||typeof w.enabled!=='boolean'||!Array.isArray(w.connections)||w.connections.some(x=>typeof x!=='string'))fail('INVALID_STATE');
  return s;
}

export function validateProduct(value) {
  if(value?.configs&&!value.product)return migrateLegacyProduct(value);
  if(!value||Object.keys(value).sort().join()!=='configs,product'||Object.keys(value.configs??{}).sort().join()!=='depth,nested,simple')fail('INVALID_STATE');
  return {product:productState(value.product),configs:Object.fromEntries(Object.entries(value.configs).map(([mode,c])=>[mode,validateModeConfig(mode,c)]))};
}

/** Read-only migration from the former main-branch product envelope. No identity
 * guesses, authorization grants, or scans; first normal commit persists V3+1.1. */
export function migrateLegacyProduct(raw) {
  const keys=['schemaVersion','revision','configs','show','previousShow','flatDefault','recoveryPolicy'];
  if(!raw||raw.schemaVersion!==1||Object.keys(raw).some(k=>!keys.includes(k))||!raw.show||Object.keys(raw.show).some(k=>!['simple','narrow','depth','flat'].includes(k))||['simple','narrow','depth','flat'].some(k=>typeof raw.show[k]!=='boolean'))fail('INVALID_STATE');
  if(raw.previousShow&& (Object.keys(raw.previousShow).sort().join()!=='depth,narrow,simple'||Object.values(raw.previousShow).some(v=>typeof v!=='boolean')))fail('INVALID_STATE');
  const r=raw.recoveryPolicy??{cadence:'weekly',simple:true,narrow:true,buckets:[],backupLocation:'automatic'};
  if(Object.keys(r).some(k=>!['cadence','simple','narrow','buckets','backupLocation'].includes(k)))fail('INVALID_STATE');
  const product=productState({revision:raw.revision,show:{simple:raw.show.simple,nested:raw.show.narrow,depth:raw.show.depth,flat:raw.show.flat},defaultTarget:raw.flatDefault??null,
    recovery:{cadence:r.cadence,simple:r.simple,nested:r.narrow,location:r.backupLocation,buckets:validateModeConfig('depth',{scopes:r.buckets}).scopes.map(b=>({target:b.target,enabled:true,depth:b.maxDepth}))}});
  if(Object.keys(raw.configs??{}).sort().join()!=='depth,nested,simple')fail('INVALID_STATE');
  return {product,configs:Object.fromEntries(Object.entries(raw.configs).map(([m,c])=>[m,validateModeConfig(m,c)]))};
}
