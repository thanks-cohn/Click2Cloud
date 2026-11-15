import {normalizeTarget,targetKey,scopeKey,stableId} from '../core/menu-identity.mjs';
import {validateProduct} from '../api/config.mjs';
import {manifestError} from './schema.mjs';
export function manifestTargets(m,mapping={}){
 const b=new Map(m.bindings.map(b=>[b.slot,b]));
 const resolve=t=>{const slot=b.get(t.slot),mapped=mapping[t.slot];return normalizeTarget({provider:slot.provider,accountId:mapped?.accountId??slot.accountHint,connectionId:mapped?.connectionId??slot.connectionHint,bucketName:slot.bucketName,prefix:t.prefix});};
 return {simple:m.simple.map(r=>({...r,target:resolve(r.target)})),nested:m.narrow.map(r=>({...r,target:resolve(r.target)})),depth:m.depth.map(r=>({...r,target:resolve(r.target)})),defaultTarget:m.preferences.defaultTarget?resolve(m.preferences.defaultTarget):null};
}
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const signature=r=>JSON.stringify(canonical(Object.fromEntries(['target','label','hidden','quick','order','levels','visibilityMode','maxDepth'].filter(k=>r[k]!==undefined).map(k=>[k,r[k]]))));
// A scoped import writer, not an exception in commitConfigChange's discovery gate.
// Replacement selects exact local presentation IDs; no full-menu destructive reset.
export function buildImportCandidate(state,m,mapping,ready,{policy='skip-identical',replaceIds=[],applyPreferences=false}={}){
 const next=structuredClone({product:state.product,configs:state.configs}),wanted=manifestTargets(m,mapping),changes={added:0,skipped:0,replaced:0,pending:0},activated=[];
 const eligible=t=>ready.has(targetKey(t));
 if(!['skip-identical','add-alongside','replace-selected'].includes(policy))manifestError('MANIFEST_INVALID_POLICY');
 if(replaceIds.length&&policy!=='replace-selected')manifestError('MANIFEST_INVALID_POLICY');
 const remaining=new Set(replaceIds),replacedTargets=new Set();
 for(const mode of ['simple','nested','depth']){
  const key=mode==='depth'?'scopes':'destinations',all=next.configs[mode][key],used=new Set();
  for(const r of wanted[mode]){
   if(!eligible(r.target)){changes.pending++;continue;}
   const origin=mode==='depth'?scopeKey(r.target):r.id;
   const id=stableId('import-presentation',JSON.stringify([mode,origin,scopeKey(r.target)]));
   const same=all.find(x=>!used.has(x)&&(mode==='depth'?scopeKey(x.target)===scopeKey(r.target):x.id===id||stableId('portable-route',mode+':'+x.id)===r.id||signature(x)===signature(r)));
   if(same)used.add(same);
   // Simple has one physical route by domain contract; never overwrite its label.
   const physical=mode==='simple'&&all.find(x=>targetKey(x.target)===targetKey(r.target));
   const selected=mode!=='depth'&&policy==='replace-selected'&&all.find(x=>remaining.has(x.id)&&targetKey(x.target)===targetKey(r.target));
   if(selected){const i=all.indexOf(selected);remaining.delete(selected.id);replacedTargets.add(targetKey(selected.target));all[i]={...r,id:selected.id};changes.replaced++;}
   else if(same&&(policy!=='add-alongside'||same.id===id)||physical){changes.skipped++;}
   else {const added=mode==='depth'?r:{...r,id};all.push(added);used.add(added);changes.added++;}
   activated.push(r.target);
  }
 }
 if(remaining.size)manifestError('MANIFEST_REPLACEMENT_UNMATCHED');
 const empty=!state.product.defaultTarget&&!Object.values(state.configs).some(c=>(c.destinations??c.scopes).length);
 if(empty||applyPreferences){next.product.show=structuredClone(m.preferences.show);next.product.providerVisibility=structuredClone(m.preferences.providerVisibility);next.product.placement=structuredClone(m.preferences.placement);}
 if(!next.product.defaultTarget&&wanted.defaultTarget&&eligible(wanted.defaultTarget))next.product.defaultTarget=wanted.defaultTarget;
 // Keep the existing Default and its Quick exclusion even when adding imports.
 if(next.product.defaultTarget)for(const c of Object.values(next.configs))for(const r of c.destinations??[])if(targetKey(r.target)===targetKey(next.product.defaultTarget))r.quick=false;
 next.product.menuCustomized=true;
 return {configuration:validateProduct(next),changes,activated};
}
