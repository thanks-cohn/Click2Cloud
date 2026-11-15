import {parseManifest,manifestCounts,manifestError} from './schema.mjs';
import {exportMenuManifest} from './export.mjs';
import {manifestTargets,buildImportCandidate} from './import-plan.mjs';
import {targetKey,ancestors} from '../core/menu-identity.mjs';
import {digest} from '../cloudflare/wire.mjs';
const copy=structuredClone;
const fail=manifestError;
// Private, separate durable draft. Never recovery authority or live menu state.
export function createManifestStore({load=async()=>(await chrome.storage.local.get('menuManifestState')).menuManifestState,save=value=>chrome.storage.local.set({menuManifestState:value})}={}){
 return {read:async()=>copy(await load()??{draft:null,undo:null}),write:async value=>save(copy(value))};
}
export function createManifestService({current,readCurrent,store,locations,oauth,authorize,confirm,applyCurrent,version}){
 const read=readCurrent??(()=>current.read());
 const get=async(id)=>{const saved=await store.read();if(!saved.draft||saved.draft.id!==id)fail('MANIFEST_DRAFT_CHANGED');return saved;};
 const allTargets=w=>[...new Map([...w.simple,...w.nested,...w.depth,...(w.defaultTarget?[{target:w.defaultTarget}]:[])].map(r=>[targetKey(r.target),r.target])).values()];
 const authorized=async(actor,method,params,bindings)=>{if(await authorize({actor,method,params,scope:method==='provisionMenuManifest'?'provision':'configure',bindings})!==true)fail('PERMISSION_DENIED');};
 const publicDraft=d=>d?copy({id:d.id,manifest:d.manifest,mapping:d.mapping,counts:manifestCounts(d.manifest),options:d.options,preview:d.preview??null,progress:d.progress??[],pending:d.pending??null,creationApproved:!!d.approvedPlan}):null;
 async function inspect(saved,{mapping,options}={},actor){
  const d=saved.draft,m=d.manifest;await authorized(actor,'inspectManifestBindings',{},allTargets(manifestTargets(m,d.mapping)));
  if(mapping){const slots=new Set(m.bindings.map(b=>b.slot));if(Object.keys(mapping).some(k=>!slots.has(k)))fail('MANIFEST_MAPPING_INVALID');d.mapping=copy(mapping);}
  if(options)d.options=copy(options);
  const wanted=manifestTargets(m,d.mapping),targets=allTargets(wanted);
  await authorized(actor,'inspectManifestBindings',{},targets);
  const results=await locations.inspect(targets),ancestorsWanted=[...new Map(wanted.nested.filter(r=>!r.hidden).flatMap(r=>['',...ancestors(r.target.prefix)].map(prefix=>({...r.target,prefix}))).map(t=>[targetKey(t),t])).values()].filter(t=>!targets.some(x=>targetKey(x)===targetKey(t)));
  const ancestorResults=await locations.inspect(ancestorsWanted);
  const plan=await locations.plan(targets,results,d.preview?.creationPlan??d.approvedPlan??[]);
  let state,currentError,candidate;try{state=await read();candidate=buildImportCandidate(state,m,d.mapping,new Set(results.filter(r=>r.ready).map(r=>targetKey(r.target))),d.options);}catch(e){currentError=e.code??'CONFIGURATION_UNAVAILABLE';}
  const token=crypto.randomUUID();
  d.preview={token,expectedRevision:state?.product.revision??null,currentError,results,ancestors:ancestorResults,creationPlan:plan,ready:results.filter(r=>r.ready).length,total:targets.length,changes:candidate?.changes??null,existing:state?{simple:state.configs.simple.destinations.length,narrow:state.configs.nested.destinations.length,depth:state.configs.depth.scopes.length,entries:Object.entries(state.configs).flatMap(([mode,c])=>(c.destinations??[]).map(r=>({mode,id:r.id,label:r.label??r.target.prefix??r.target.bucketName,target:r.target}))),defaultTarget:state.product.defaultTarget,show:state.product.show,providerVisibility:state.product.providerVisibility}:null};
  await store.write(saved);return publicDraft(d);
 }
 async function invoke(method,params,actor){
  if(method==='exportMenuManifest'){const state=await read();await authorized(actor,method,params,state);return {manifest:exportMenuManifest(state,version)};}
  if(method==='getMenuManifestDraft'){const s=await store.read();await authorized(actor,method,params,{draft:s.draft?allTargets(manifestTargets(s.draft.manifest,s.draft.mapping)):null,undo:s.undo?.configuration});return {draft:publicDraft(s.draft),undoAvailable:!!s.undo};}
  if(method==='previewMenuManifest'){
   const manifest=parseManifest(params.json),saved=await store.read();await authorized(actor,method,params,allTargets(manifestTargets(manifest)));
   if(saved.draft)fail('MANIFEST_DRAFT_EXISTS');
   saved.draft={id:crypto.randomUUID(),manifest,mapping:{},options:{policy:'skip-identical',replaceIds:[],applyPreferences:false},preview:null};await store.write(saved);
   return publicDraft(saved.draft);
  }
  if(method==='discardMenuManifest'){
   const s=await get(params.draftId);await authorized(actor,method,params,allTargets(manifestTargets(s.draft.manifest,s.draft.mapping)));s.draft=null;await store.write(s);return {discarded:true};
  }
  if(method==='inspectManifestBindings')return inspect(await get(params.draftId),params,actor);
  if(method==='undoMenuManifest'){
   const s=await store.read(),u=s.undo;if(!u)fail('MANIFEST_UNDO_UNAVAILABLE');
   const state=await read();if(!await current.findRetry(u.idempotencyKey)||params.expectedRevision!==state.product.revision||state.product.revision!==u.after)fail('REVISION_CONFLICT');
   await authorized(actor,method,params,{prior:state,restored:u.configuration});
   if(await confirm({actor,method,params})!==true)fail('CONFIRMATION_REQUIRED');
   const configs=Object.fromEntries(Object.entries(u.configuration.configs).map(([k,v])=>[k,{...v,revision:state.configs[k].revision}]));
   const receipt=await current.commitProduct({product:{...u.configuration.product,revision:state.product.revision},configs,expectedRevision:state.product.revision,idempotencyKey:actor+':manifest-undo:'+params.idempotencyKey,fingerprint:JSON.stringify(params)});
   s.undo=null;await store.write(s);return {configuration:await read(),receipt,native:await applyCurrent({refreshDepth:true,refreshDepthReadiness:true,depthBudget:{maxRequests:256,maxFolders:4096}})};
  }
  if(method==='commitMenuManifest'){const replay=await current.findRetry(actor+':manifest:'+params.idempotencyKey);if(replay){if(replay.fingerprint!==await digest(params))fail('IDEMPOTENCY_CONFLICT');const configuration=await read();await authorized(actor,method,params,configuration);return {configuration,receipt:{...replay,replayed:true},native:{state:'partial',code:'RECONCILE_NATIVE_MENU'}};}}
  const saved=await get(params.draftId),d=saved.draft,p=d.preview;
  if(!p||params.previewToken!==p.token)fail('MANIFEST_PREVIEW_CHANGED');
  if(p.currentError)fail(p.currentError);
  const state=await read();if(params.expectedRevision!==state.product.revision||p.expectedRevision!==state.product.revision)fail('REVISION_CONFLICT');
  const wanted=manifestTargets(d.manifest,d.mapping),targets=allTargets(wanted);
  await authorized(actor,method,params,{targets,prior:state,original:allTargets(manifestTargets(d.manifest))});
  if(method==='provisionMenuManifest'){
   let plan=p.creationPlan;if(!plan.length)fail('MANIFEST_NO_FEASIBLE_CREATIONS');
   // The single informed GUI Yes (or host-owned agent approval) consumes this
   // exact preview. No per-resource or second setup confirmation is invoked.
   if(d.approvedPlan){if(!plan.every(a=>d.approvedPlan.some(b=>targetKey(a.target)===targetKey(b.target)&&a.workerName===b.workerName&&a.prefixScope===b.prefixScope&&JSON.stringify(a.prefixes)===JSON.stringify(b.prefixes))))fail('MANIFEST_CREATION_PLAN_CHANGED');plan=d.approvedPlan;}
   else if(await confirm({actor,method,params,bindings:plan})!==true)fail('CONFIRMATION_REQUIRED');
   const planId=await digest(plan);
   d.approvedPlan=copy(plan);d.planId=planId;p.token=null;await store.write(saved);
   const stillAuthorized=async()=>{const now=await get(d.id),live=await read();return live.product.revision===state.product.revision&&now.draft.planId===planId&&await authorize({actor,scope:'provision',method,params,bindings:{targets,plan}})===true;};
   d.progress=[];
   for(const action of plan){
    let result;try{if(!await stillAuthorized())fail('AUTHORIZATION_REVOKED');result=await locations.create(action,planId,{stillAuthorized});}catch(e){result={state:'blocked',code:e.code??'MANIFEST_CREATION_FAILED',target:action.target};}
    d.progress.push(result);await store.write(saved);
   }
   const refreshed=await inspect(saved,{},actor);
   return {draft:refreshed,creationResults:copy(d.progress),complete:refreshed.preview.ready===refreshed.preview.total,activation:'APPLY_REQUIRED'};
  }
  if(method!=='commitMenuManifest')fail('VERSION_OR_METHOD_UNSUPPORTED');
  const fingerprint=await digest(params);
  const retry=await current.findRetry(actor+':manifest:'+params.idempotencyKey);
  if(retry){if(retry.fingerprint!==fingerprint)fail('IDEMPOTENCY_CONFLICT');return {configuration:state,receipt:{...retry,replayed:true},native:{state:'partial',code:'RECONCILE_NATIVE_MENU'}};}
  // Fresh identity, bucket access and exact scoped capability for each route.
  const fresh=await locations.inspect(targets),ready=new Set(fresh.filter(r=>r.ready).map(r=>targetKey(r.target)));
  if(!params.partial&&ready.size!==targets.length)fail('MANIFEST_LOCATIONS_NOT_READY');
  if(params.partial&&ready.size===0)fail('MANIFEST_NO_READY_LOCATIONS');
  const candidate=buildImportCandidate(state,d.manifest,d.mapping,ready,d.options);
  await authorized(actor,method,params,{...candidate.configuration,prior:state});
  if((candidate.changes.replaced||d.options.applyPreferences)&&await confirm({actor,method,params,bindings:candidate.changes})!==true)fail('CONFIRMATION_REQUIRED');
  // Write a private preimage before Apply. A failed commit leaves an inert
  // checkpoint; its after revision and durable retry receipt fence Undo.
  saved.undo={configuration:{product:state.product,configs:state.configs},after:state.product.revision+1,idempotencyKey:actor+':manifest:'+params.idempotencyKey,fingerprint};await store.write(saved);
  const receipt=await current.commitProduct({...candidate.configuration,expectedRevision:params.expectedRevision,idempotencyKey:actor+':manifest:'+params.idempotencyKey,fingerprint});
  // CURRENT and the receipt win if the following optional draft write is lost.
  d.pending=fresh.filter(r=>!r.ready).map(r=>r.target);d.lastReceipt=receipt;d.preview.token=null;
  if(!d.pending.length)saved.draft=null;
  let draftSaved=true;try{await store.write(saved);}catch{draftSaved=false;}
  const native=await applyCurrent({refreshTargets:candidate.activated,refreshDepth:true,refreshDepthReadiness:true,depthBudget:{maxRequests:256,maxFolders:4096}});
  return {configuration:await read(),receipt,native,changes:candidate.changes,pending:d.pending,draftSaved,remoteSave:'NOT_VERIFIED'};
 }
 return Object.freeze({invoke});
}
