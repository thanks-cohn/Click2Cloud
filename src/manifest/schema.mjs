import {validateModeConfig} from '../persistence/schema.mjs';
import {normalizeTarget} from '../core/menu-identity.mjs';
export const MAX_MANIFEST_BYTES=2*1024*1024,MAX_MANIFEST_ROUTES=4096;
export const manifestError=code=>{throw Object.assign(Error(code),{code});};
const bad=()=>manifestError('MANIFEST_INVALID');
export function closed(v,keys,required=keys){if(!v||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).some(k=>!keys.includes(k))||required.some(k=>!Object.hasOwn(v,k)))bad();}
const text=(v,max=256)=>{if(typeof v!=='string'||!v||v.length>max||/[\x00-\x1f\x7f]/.test(v))bad();};
export function parseManifest(input){
 if(typeof input!=='string'||new TextEncoder().encode(input).length>MAX_MANIFEST_BYTES)bad();
 let m;try{m=JSON.parse(input);}catch{bad();}
 // Bound nesting/node count before validators/copy; reject pollution keys everywhere.
 const stack=[[m,0]];let nodes=0;while(stack.length){const [v,d]=stack.pop();if(++nodes>100000||d>16)bad();if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k))bad();stack.push([x,d+1]);}}
 return validateManifest(m);
}
export function validateManifest(m){
 closed(m,['kind','schemaVersion','purpose','exportedProductVersion','bindings','simple','narrow','depth','preferences']);
 if(m.kind!=='click2cloud.menu-manifest'||m.schemaVersion!==1||m.purpose!=='personal-restore')bad();text(m.exportedProductVersion,32);
 if(!Array.isArray(m.bindings)||m.bindings.length>MAX_MANIFEST_ROUTES)bad();const slots=new Map(),scopes=new Set();
 for(const b of m.bindings){closed(b,['slot','provider','accountHint','connectionHint','bucketName']);for(const v of Object.values(b))text(v,256);if(slots.has(b.slot))bad();const key=JSON.stringify([b.provider,b.accountHint,b.connectionHint,b.bucketName]);if(scopes.has(key))bad();scopes.add(key);slots.set(b.slot,b);}
 const target=t=>{closed(t,['slot','prefix']);text(t.slot);if(typeof t.prefix!=='string'||t.prefix.length>2048)bad();const b=slots.get(t.slot);if(!b)bad();const result=normalizeTarget({provider:b.provider,accountId:b.accountHint,connectionId:b.connectionHint,bucketName:b.bucketName,prefix:t.prefix});if(result.prefix!==t.prefix)bad();return result;};
 const ids=new Set(),depthScopes=new Set();let count=0;
 for(const [mode,key] of [['simple','simple'],['nested','narrow'],['depth','depth']]){
  if(!Array.isArray(m[key])||(count+=m[key].length)>MAX_MANIFEST_ROUTES)bad();
  const values=m[key].map(r=>{closed(r,mode==='depth'?['target','maxDepth','hidden']:['id','target','label','hidden','quick','order','levels','visibilityMode'],mode==='depth'?['target','maxDepth']:['id','target']);
   if(mode==='simple'&&r.visibilityMode!==undefined)bad();
   if(mode==='depth'){if(r.target.prefix!==''||!Number.isSafeInteger(r.maxDepth)||r.maxDepth<1||depthScopes.has(r.target.slot))bad();depthScopes.add(r.target.slot);}
   else {text(r.id,128);if(ids.has(r.id))bad();ids.add(r.id);if(r.levels){closed(r.levels,Object.keys(r.levels),[]);if(Object.keys(r.levels).length>256)bad();for(const v of Object.values(r.levels)){closed(v,['label','hidden'],[]);if(v.label!==undefined)text(v.label,256);}}}
   return {...r,target:target(r.target)};
  });validateModeConfig(mode,{[mode==='depth'?'scopes':'destinations']:values});
 }
 const p=m.preferences;closed(p,['show','providerVisibility','placement','defaultTarget']);
 closed(p.show,['simple','nested','depth','flat']);if(Object.values(p.show).some(v=>typeof v!=='boolean'))bad();
 closed(p.providerVisibility,['cloudflare','google-drive','dropbox','onedrive']);if(Object.values(p.providerVisibility).some(v=>typeof v!=='boolean'))bad();
 closed(p.placement,Object.keys(p.placement),[]);for(const key of Object.keys(p.placement))text(key,256);if(Object.values(p.placement).some(v=>!['direct','other'].includes(v)))bad();
 if(p.defaultTarget!==null)target(p.defaultTarget);
 if(new TextEncoder().encode(JSON.stringify(m)).length>MAX_MANIFEST_BYTES)bad();
 return m;
}
export const manifestCounts=m=>({simple:m.simple.length,narrow:m.narrow.length,depth:m.depth.length,hidden:[...m.simple,...m.narrow,...m.depth].filter(r=>r.hidden).length,quick:[...m.simple,...m.narrow].filter(r=>r.quick).length});
