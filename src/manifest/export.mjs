import {validateProduct} from '../api/config.mjs';
import {scopeKey,stableId} from '../core/menu-identity.mjs';
import {validateManifest} from './schema.mjs';
// Explicit allowlist: CURRENT provenance, revisions, native IDs, credentials,
// setup approvals, remote listings, source URLs and recorder data never enter JSON.
export function exportMenuManifest(state,version='0.3.19'){
 const {product:p,configs}=validateProduct({product:state.product,configs:state.configs}),bindings=[],slots=new Map();
 const target=t=>{const key=scopeKey(t);if(!slots.has(key)){const slot='bucket-'+(bindings.length+1);slots.set(key,slot);bindings.push({slot,provider:t.provider,accountHint:t.accountId,connectionHint:t.connectionId,bucketName:t.bucketName});}return {slot:slots.get(key),prefix:t.prefix};};
 const routes=mode=>configs[mode].destinations.map(r=>({...Object.fromEntries(['label','hidden','quick','order','levels','visibilityMode'].filter(k=>r[k]!==undefined).map(k=>[k,structuredClone(r[k])])),id:stableId('portable-route',mode+':'+r.id),target:target(r.target)}));
 const simple=routes('simple'),narrow=routes('nested'),depth=configs.depth.scopes.map(r=>({...r,target:target(r.target)}));
 const preferences={show:structuredClone(p.show),providerVisibility:structuredClone(p.providerVisibility),placement:structuredClone(p.placement),defaultTarget:p.defaultTarget?target(p.defaultTarget):null};
 return validateManifest({kind:'click2cloud.menu-manifest',schemaVersion:1,purpose:'personal-restore',exportedProductVersion:version,bindings,simple,narrow,depth,preferences});
}
