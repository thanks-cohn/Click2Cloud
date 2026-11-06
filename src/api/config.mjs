import {validateModeConfig} from '../persistence/schema.mjs';
import {normalizeTarget} from '../core/menu-identity.mjs';
export const fail=code=>{throw Object.assign(Error(code),{code});};
export function productState(raw={}) {
  const defaults={schemaVersion:1,revision:0,theme:'dark',show:{simple:true,nested:true,depth:false,flat:false},defaultTarget:null,
    favorites:[],placement:{},suggestionDismissed:null,view:'details',recovery:{cadence:'weekly',simple:true,nested:true,buckets:[],location:'automatic'},wholeCloud:{connections:[],enabled:false}};
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!Object.hasOwn(defaults,k)))fail('INVALID_STATE');
  const s={...defaults,...structuredClone(raw)};
  if(s.schemaVersion!==1||!Number.isSafeInteger(s.revision)||s.revision<0||!['dark','light'].includes(s.theme)||!['details','list'].includes(s.view))fail('INVALID_STATE');
  if(!s.show||Object.keys(s.show).sort().join()!=='depth,flat,nested,simple'||Object.values(s.show).some(v=>typeof v!=='boolean'))fail('INVALID_STATE');
  if(s.defaultTarget)s.defaultTarget=normalizeTarget(s.defaultTarget);
  if(!Array.isArray(s.favorites)||s.favorites.length>4096||s.favorites.some(x=>typeof x!=='string'||x.length>256))fail('INVALID_STATE');
  if(!s.placement||typeof s.placement!=='object'||Array.isArray(s.placement)||Object.entries(s.placement).some(([k,v])=>!k||!['direct','other'].includes(v)))fail('INVALID_STATE');
  if(s.suggestionDismissed!==null&&(typeof s.suggestionDismissed!=='string'||s.suggestionDismissed.length>8192))fail('INVALID_STATE');
  const r=s.recovery,w=s.wholeCloud;
  if(!r||Object.keys(r).sort().join()!=='buckets,cadence,location,nested,simple'||!['weekly','daily'].includes(r.cadence)||!['automatic','documents'].includes(r.location)||typeof r.simple!=='boolean'||typeof r.nested!=='boolean'||!Array.isArray(r.buckets))fail('INVALID_STATE');
  for(const b of r.buckets){if(!b||Object.keys(b).sort().join()!=='depth,enabled,target'||typeof b.enabled!=='boolean'||!Number.isSafeInteger(b.depth)||b.depth<1)fail('INVALID_STATE');normalizeTarget(b.target);}
  if(!w||Object.keys(w).sort().join()!=='connections,enabled'||typeof w.enabled!=='boolean'||!Array.isArray(w.connections)||w.connections.some(x=>typeof x!=='string'))fail('INVALID_STATE');
  return s;
}

export function validateProduct(value) {
  if(!value||Object.keys(value).sort().join()!=='configs,product'||Object.keys(value.configs??{}).sort().join()!=='depth,nested,simple')fail('INVALID_STATE');
  return {product:productState(value.product),configs:Object.fromEntries(Object.entries(value.configs).map(([mode,c])=>[mode,validateModeConfig(mode,c)]))};
}
