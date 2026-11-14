import {createRecorderHost} from '../src/recorder/host.mjs';
import {createDepthNativeClick,createDepthFeedback} from '../src/modes/depth/native-click.mjs';
import {discoverDepthScope} from '../src/explorer/depth-inventory.mjs';
import {createBreadcrumbs} from '../src/glaciaring/breadcrumbs.mjs';
import {verifyProfileCopy} from '../src/persistence/profile-preservation.mjs';
import {BUILD_INFO} from '../src/build-info.mjs';
import {coalesceFileReads} from '../src/explorer/read-coalescer.mjs';
import {createShelfAttention} from '../src/chrome/provider-panel.mjs';
import {appSenderDecision} from '../src/chrome/trusted-sender.mjs';
import {sourceFromClick} from '../right2cloud-module/src/index.mjs';
import {createChromeRegistrar} from '../src/chrome/registrar.mjs';
import {createCurrentStore} from '../src/persistence/current-store.mjs';
import {createEngine} from '../src/core/engine.mjs';
import {createEngineApi} from '../src/api/service.mjs';
import {createPermissions} from '../src/api/permissions.mjs';
import {createAgentGateway} from '../src/api/gateway.mjs';
import {createCloudflareOAuth,diagnoseCloudflare} from '../src/auth/cloudflare-oauth.mjs';
import {createClick2CloudFileApi} from '../src/explorer/index.mjs';
import {createExternalRecovery,directoryFiles,copyRecoveryDirectory} from '../src/persistence/external-recovery.mjs';
import {createRecoveryCrawl} from '../src/persistence/recovery-crawl.mjs';
import {createWholeCloudJobs} from '../src/api/whole-cloud.mjs';
import {createDiagnostics} from '../src/glaciaring/index.mjs';
import {createAgentDebugApi} from '../src/glaciaring/agent-api.mjs';
import {createDebugHost} from '../src/chrome/debug-host.mjs';
import {createProvisioner} from '../src/cloudflare/deployment.mjs';
import {createFileTransport} from '../src/cloudflare/file-transport.mjs';
import {createRemoteTransport} from '../src/cloudflare/transport.mjs';
import {createCloudflareOnboarding} from '../src/cloudflare/onboarding.mjs';
import {sourceURL} from '../src/cloudflare/public-address.mjs';
import {scopeKey,targetKey,normalizeTarget} from '../src/core/menu-identity.mjs';
// Coalesce trusted-storage access, but never retain a rejected startup attempt.
let storageReady;
function trustedStorage(){if(!storageReady){const attempt=Promise.resolve().then(()=>Promise.all(['local','session'].map(k=>chrome.storage[k].setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}))));storageReady=attempt;attempt.catch(()=>{if(storageReady===attempt)storageReady=null;});}return storageReady;}
const workerEpoch=crypto.getRandomValues(new Uint32Array(1))[0]||1;
const breadcrumbs=createBreadcrumbs({epoch:workerEpoch,build:BUILD_INFO.revision,read:async()=>(await chrome.storage.local.get('criticalBreadcrumbs')).criticalBreadcrumbs,write:value=>chrome.storage.local.set({criticalBreadcrumbs:value})});
const diagnostics=createDiagnostics({epoch:workerEpoch,build:BUILD_INFO.revision,onCritical:breadcrumbs.enqueue}),current=createCurrentStore({sink:diagnostics,readEstablishment:async()=>{await trustedStorage();const p=await chrome.storage.local.get(['nativeRegistration','currentProvenance']);return {established:!!p.currentProvenance||!!p.nativeRegistration,uncertain:!!p.currentProvenance&&(p.currentProvenance.version!==1||p.currentProvenance.established!==true),nativeGeneration:p.nativeRegistration?.desired?.generation??0,native:{present:!!p.nativeRegistration,desiredGeneration:p.nativeRegistration?.desired?.generation??null,appliedGeneration:p.nativeRegistration?.appliedGeneration??null,state:['applying','acknowledged','applied','failed','partial'].includes(p.nativeRegistration?.state)?p.nativeRegistration.state:'unknown',rowCount:p.nativeRegistration?.desired?.rows?.length??0,roles:Object.fromEntries(['save','branch','provider-action','separator','navigation'].map(role=>[role,(p.nativeRegistration?.desired?.rows??[]).filter(r=>r.role===role).length]))}};},retainEstablishment:async proof=>{await chrome.storage.local.set({currentProvenance:proof});}});
let connectionObservation=null,attentionPreference=null;
const attention=createShelfAttention({chrome,preference:()=>attentionPreference});
const oauth=createCloudflareOAuth({chrome,onStatus:s=>{connectionObservation=s;},onConnected:async()=>{snapshots.clear();try{await chrome.runtime.sendMessage({channel:'connection-changed'});}catch{}}});
let inventory={revision:0,scopes:[]},engine,revoking=false;
const provisioner=createProvisioner({request:oauth.request,authority:oauth.authority,readModule:async path=>{const r=await fetch(chrome.runtime.getURL(path));if(!r.ok)throw Error('WORKER_MODULE_UNAVAILABLE');return r.text();},load:async key=>(await chrome.storage.local.get('remoteTransport:'+key))['remoteTransport:'+key],store:(key,value)=>chrome.storage.local.set({['remoteTransport:'+key]:value})});
const remote=createRemoteTransport({expectedCodeDigest:BUILD_INFO.workerCodeDigest,oauth,lookup:provisioner.lookup,verifyAuthority:async(t,a)=>{if(revoking)return false;if(!a.scopes?.includes('workers-r2.write')||!a.scopes?.includes('workers-r2.read'))throw Object.assign(Error('INSUFFICIENT_SCOPE'),{code:'INSUFFICIENT_SCOPE'});const r=await oauth.request('/accounts/'+encodeURIComponent(t.accountId)+'/r2/buckets/'+encodeURIComponent(t.bucketName));const b=await r.json();if(!r.ok||b.success!==true){const diagnostic=diagnoseCloudflare(r,b,{context:'r2'});throw Object.assign(Error(diagnostic.code),{code:diagnostic.code,diagnostic});}return true;},record:recordRemote,authorizeSource:async s=>{try{sourceURL(s.url);return !s.bytes;}catch{return false;}}});
const snapshots=new Map();
async function remoteReady(target){const a=await oauth.status();if(a.state!=='CONNECTED'||!a.accounts.some(x=>x.id===target.accountId))return false;const k=targetKey(target),snapshot=snapshots.get(k);if(snapshot&&Date.now()-snapshot.at<10000)return snapshot.ready;const r=await remote.status(target);snapshots.set(k,{at:Date.now(),ready:r.state==='READY'});return r.state==='READY';}
const cloudflare=createCloudflareOnboarding({current,oauth,provisioner:{...provisioner,markVerified:async(t,sessionId)=>{await provisioner.markVerified(t,sessionId);snapshots.clear();}},transport:remote,readRequestedTarget:async()=>(await attention.read())?.target,openShelf:(provider,target,details)=>attention.attend(provider??'cloudflare',target,details),record:recordRemote,history:options=>current.readRemoteResults(options)});

async function recordRemote(value){
 const saved=await current.recordRemoteResult(value);
 try{await chrome.runtime.sendMessage({channel:'remote-result',result:{operationId:saved.operationId,state:saved.state,code:saved.code,kind:saved.kind,destination:saved.destination,key:saved.receipt?.key,stage:saved.stage,bytes:saved.bytes}});}catch{/* No open app is normal; durable results remain inspectable. */}
 return saved;
}
const executeFileMessage=createFileTransport({remote});

async function send(message) {
  let path,field;
  if(['cfCreateFolder','cfTransferObjects','cfRenameEntry','cfDeleteObjects'].includes(message.type))return executeFileMessage(message);
  if(message.type==='cfAccounts'){const status=await oauth.status();return {ok:true,accounts:status.accounts??[],cursor:''};}
  else if(message.type==='cfBuckets'){
    const status=await oauth.status();if(!status.accounts?.some(a=>a.id===message.accountId))throw Error('SCOPE_UNAUTHORIZED');
    const page=/^page:([1-9][0-9]*)$/.exec(message.cursor??'');path='/accounts/'+encodeURIComponent(message.accountId)+'/r2/buckets?per_page=1000'+(page?'&page='+page[1]:message.cursor?'&cursor='+encodeURIComponent(message.cursor):'');field='buckets';
  } else throw Object.assign(Error('AUTHORIZED_WORKER_TRANSPORT_UNAVAILABLE'),{code:'AUTHORIZED_WORKER_TRANSPORT_UNAVAILABLE'});
  const response=await oauth.request(path),body=await response.json();
  if(!response.ok||body.success!==true)throw Object.assign(Error('PROVIDER_READ_FAILED'),{code:'PROVIDER_READ_FAILED'});
  const numericPage=Number(/^page:([1-9][0-9]*)$/.exec(message.cursor??'')?.[1]??1),nextPage=numericPage<(body.result_info?.total_pages??1)?'page:'+(numericPage+1):'';if((body.result?.truncated||body.result_info?.is_truncated)&&!body.result?.cursor&&!body.result_info?.cursor&&!nextPage)throw Error('PROVIDER_PAGINATION_UNAVAILABLE');
  return {ok:true,[field]:field==='buckets'?body.result.buckets.map(b=>({name:b.name})):body.result.map(a=>({id:a.id,name:a.name})),cursor:body.result?.cursor??body.result_info?.cursor??nextPage};
}
const baseFileApi=createClick2CloudFileApi({send,http:{request:oauth.request,boundedFetch:fetch}});
const fileApi=coalesceFileReads(Object.freeze({...baseFileApi,capabilities:baseFileApi.capabilities.filter(op=>['readChunk','accounts','buckets','list','listRaw','stat','preview','readStream','mkdir','copy','move','rename','delete'].includes(op)),async run(operation,input={},options={}) {
  // Unconfigured Worker transport is blocked before staging any object bytes.
  if(!['readChunk','accounts','buckets','list','listRaw','stat','preview','readStream','mkdir','copy','move','rename','delete'].includes(operation))return {state:'blocked',code:'AUTHORIZED_WORKER_TRANSPORT_UNAVAILABLE'};
  const result=await baseFileApi.run(operation,input,options);
  if(operation==='list'&&result.state==='completed') {
    const t=normalizeTarget({provider:'cloudflare',connectionId:'cloudflare:'+input.source.accountId,...input.source,prefix:''});
    let s=inventory.scopes.find(x=>scopeKey(x.target)===scopeKey(t));
    if(!s){s={target:t,authorized:true,workerReady:false,folders:[],complete:false};inventory.scopes.push(s);}
    for(const p of [input.source.prefix,...result.data.entries.filter(e=>e.folder).map(e=>e.key)])if(!s.folders.includes(p))s.folders.push(p);
    inventory.revision++;await chrome.storage.local.set({discoveredInventory:inventory});
  }
  return result;
}}),{authority:oauth.authority});
// Menu inspection/boot projects saved observations without a full-cloud network
// sweep. Destination Save refreshes its exact new targets; every actual save
// independently rechecks current authority and scoped Worker capability.
async function getInventory({refreshTargets=[],refreshDepthScopes=[],refreshDepthReadiness=false}={}) {
  const status=await oauth.status();
  const policy=(await current.read()).product.recovery;
  for(const b of policy.buckets.filter(b=>b.enabled))try{const index=await recoveryCrawl.inspect(b.target);let scope=inventory.scopes.find(s=>scopeKey(s.target)===scopeKey(b.target));if(!scope){scope={target:{...b.target,prefix:''},folders:[],complete:false};inventory.scopes.push(scope);}scope.folders=[...new Set([...scope.folders,...index.folders])];}catch{}
  const state=await current.read();attentionPreference=state.product.autoOpenAttention;const savedTargets=[state.product.defaultTarget,...Object.values(state.configs).flatMap(c=>(c.destinations??c.scopes??[]).map(d=>d.target))].filter(Boolean);
  // Keep the bounded Depth snapshot separate from Explorer and recovery observations.
  // A failed crawl leaves the previous snapshot intact.
  const {depthInventory=[],depthRefreshPending=[]}=await chrome.storage.local.get(['depthInventory','depthRefreshPending']);
  const depthSnapshots=new Map(depthInventory.map(s=>[scopeKey(s.target),s]));
  const pendingScopes=new Set(depthRefreshPending);
  const refreshSelections=refreshDepthScopes.filter(s=>!s.hidden);
  for(const selection of refreshSelections)pendingScopes.add(scopeKey(selection.target));
  if(refreshSelections.length)await chrome.storage.local.set({depthRefreshPending:[...pendingScopes]});
  const discovered=[];
  for(const selection of refreshSelections){
    if(status.state!=='CONNECTED'||!status.accounts.some(a=>a.id===selection.target.accountId))throw Object.assign(Error(),{code:'AUTH_REQUIRED'});
    const result=await discoverDepthScope(baseFileApi,selection);
    depthSnapshots.set(result.scopeKey,result);
    pendingScopes.delete(result.scopeKey);
    discovered.push(result.target,...result.folders.map(prefix=>({...result.target,prefix})));
  }
  if(discovered.length){
    await chrome.storage.local.set({depthInventory:[...depthSnapshots.values()],depthRefreshPending:[...pendingScopes]});
    inventory.revision++;
  }
  const depthSelections=state.product.show.depth&&state.product.providerVisibility.cloudflare
    ?state.configs.depth.scopes.filter(s=>!s.hidden):[];
  const depthScopes=depthSelections.map(selection=>{
    const snapshot=depthSnapshots.get(scopeKey(selection.target));
    const previous=inventory.scopes.find(s=>scopeKey(s.target)===scopeKey(selection.target));
    const observed=snapshot??{target:selection.target,folders:previous?.folders??[],complete:false,listedDepth:0};
    return {...observed,stale:!observed.complete&&observed.listedDepth<selection.maxDepth||pendingScopes.has(scopeKey(selection.target))};
  });
  // A restarted worker can reuse the observed tree but must check destination
  // readiness again before offering actionable saves.
  const depthTargets=refreshDepthReadiness&&status.state==='CONNECTED'?depthScopes.flatMap((s,i)=>
    status.accounts.some(a=>a.id===s.target.accountId)?[s.target,...s.folders
      .filter(p=>p.split('/').filter(Boolean).length<=depthSelections[i].maxDepth)
      .map(prefix=>({...s.target,prefix}))]:[]):[];
  const readinessTargets=[...new Map([...refreshTargets,...discovered,...depthTargets]
    .filter(t=>t.provider==='cloudflare').map(t=>[targetKey(t),t])).values()];
  if(refreshTargets.length||discovered.length)for(const t of [...refreshTargets,...discovered])snapshots.delete(targetKey(t));
  let readinessIndex=0;
  await Promise.all(Array.from({length:Math.min(4,readinessTargets.length)},async()=>{
    while(readinessIndex<readinessTargets.length)await remoteReady(readinessTargets[readinessIndex++]);
  }));
  for(const saved of savedTargets){let found=inventory.scopes.find(s=>scopeKey(s.target)===scopeKey(saved));if(!found){found={target:{...saved,prefix:''},folders:[],complete:false};inventory.scopes.push(found);}if(!found.folders.includes(saved.prefix))found.folders.push(saved.prefix);}
  const projectScope=s=>({...s,authorized:status.state==='CONNECTED'&&status.accounts.some(a=>a.id===s.target.accountId),
    workerReady:snapshots.get(targetKey(s.target))?.ready??false,
    folders:s.folders.map(p=>{const prefix=typeof p==='string'?p:p.prefix;return {prefix,workerReady:snapshots.get(targetKey({...s.target,prefix}))?.ready??false};})});
  return {...inventory,scopes:inventory.scopes.map(projectScope),depthScopes:depthScopes.map(projectScope),
    depthCoverageComplete:depthScopes.every(s=>!s.stale)};
}
const getAuthorization=async selection=>{
  if(revoking)return null;
  try{const a=await oauth.authority(),selected=selection?.provider?selection:registrar.inspect().desired?.rows.find(r=>r.id===String(selection?.menuItemId))?.target;
    const targets=selected?[selected]:(registrar.inspect().desired?.rows??[]).filter(r=>r.role==='save').map(r=>r.target);
    return {sessionId:a.sessionId,authorizedTargets:(await Promise.all(targets.map(async t=>a.accounts.some(x=>x.id===t.accountId)&&await remoteReady(t)?t:null))).filter(Boolean)};
  }catch{return null;}
};
const depthClick=createDepthNativeClick({current,oauth,transport:remote,lookup:provisioner.lookup,inspect:()=>registrar.inspect(),authorize:async target=>{
 if(revoking)return null;
 const auth=await oauth.authority();
 return {sessionId:auth.sessionId,authorizedTargets:auth.accounts.some(a=>a.id===target.accountId)&&(await remote.status(target)).state==='READY'?[target]:[]};
},recover:async({target})=>{
 if(revoking)return {state:'blocked',code:'DISCONNECTING'};
 const state=await readCurrent(),native=registrar.inspect();
 if(native.pending||native.acknowledgedGeneration!==state.generation.desired||!engine.matchesCurrent(native.desired,state))return {state:'blocked',code:'STALE_GENERATION'};
 // Host-owned native gesture enters the same typed exact-target recovery as
 // Shelf. authorizeSetup is absent: only durable prior approval permits writes.
 const out=await api.invoke({version:'3+1.1',method:'recoverCloudflareDestination',params:{target}},'gui');
 return out.data??{state:out.state,code:out.code};
},attend:(target,{code,info})=>attention.attend('cloudflare',target,{code,context:attention.context(info)}),feedback:createDepthFeedback(chrome)});
// MV3 supports static module loading only. The dependency graph is build-gated;
// execution/readiness stays deferred and never gates the native listener.
let recorder=null,recorderInitializationFailure=null,bootstrapDropped=0;
const bootstrapObservations=[];
function observeDeliveredClick(delivery){
  if(recorder)return recorder.click(delivery);
  // Bounded early BASIC checkpoint. No RAW URLs/destination identities retained
  // before consent is restored. Each delivery keeps its own stage/outcome list.
  if(bootstrapObservations.length>=256){bootstrapDropped++;return;}
  const row=delivery.row,early={...delivery,info:{menuItemId:delivery.info.menuItemId,mediaType:delivery.info.mediaType},tab:undefined,row:{target:{provider:row?.target?.provider},providerAction:row?.providerAction,origin:{mode:row?.origin?.mode}}};
  const pending={early,events:[],forward:null};bootstrapObservations.push(pending);
  return event=>{if(pending.forward){pending.forward(event);return;}if(pending.events.length>=32){bootstrapDropped++;return;}const r=event.result;if(event.stage==='provider.verification')bootstrapDropped++;pending.events.push({monotonicMs:event.monotonicMs??performance.now(),timestampUtc:event.timestampUtc??new Date().toISOString(),stage:event.stage,outcome:event.outcome,code:event.code,...(event.stage==='native.identity'?{identity:{providerId:event.row?.target?.provider??event.row?.providerAction??event.row?.origin?.provider,mode:event.row?.origin?.mode,menuGeneration:event.menuGeneration}}:{}),...(r?{result:{state:r.state,code:r.code,completion:r.completion,proofKind:r.proofKind,receipt:{size:r.receipt?.size}}}:{})});};
}
void Promise.resolve().then(async()=>{
  recorder=await createRecorderHost({chrome,build:BUILD_INFO,startupGaps:()=>bootstrapDropped});
  for(const pending of bootstrapObservations){pending.forward=recorder.click(pending.early);for(const event of pending.events)pending.forward(event);pending.events.length=0;}
  bootstrapObservations.length=0;
}).catch(error=>{recorderInitializationFailure={stage:'recorder-initialization',causeName:['Error','TypeError','SyntaxError','ReferenceError','SecurityError','QuotaExceededError','InvalidStateError'].includes(error?.name)?error.name:'UnknownError'};bootstrapDropped+=bootstrapObservations.length;bootstrapObservations.length=0;});
const registrar=createChromeRegistrar({chrome,observeClick:observeDeliveredClick,depthClick,readDepthClickRow:async id=>(await chrome.storage.local.get('nativeRegistration')).nativeRegistration?.desired?.rows.find(r=>r.id===id&&r.origin?.mode==='depth'),beforeApply:async spec=>{const s=await readCurrent();if(s.generation.desired!==spec.generation||spec.mode==='composite'&&spec.modeRevision!==s.product.revision)throw Object.assign(Error(),{code:'STALE_GENERATION'});},onGesture:(info,tab)=>{const native=registrar.inspect(),row=native.desired?.rows.find(r=>r.id===String(info.menuItemId)),provider=row?.providerAction??row?.origin?.provider;attention.gesture(info,tab,{provider,enabled:!!row&&!native.pending&&native.acknowledgedGeneration===native.desired?.generation&&['save','provider-action'].includes(row.role),needsAttention:row?.role==='provider-action'||row?.origin?.mode==='depth'&&row.actionKind==='attention'||connectionObservation?.state==='DISCONNECTED'});},beforeClick:async info=>{
    const previous=registrar.inspect().desired??(await chrome.storage.local.get('nativeRegistration')).nativeRegistration?.desired;
    await nativeReady();
    const itemId=String(info.menuItemId),prior=previous?.rows.find(r=>r.id===itemId),next=registrar.inspect().desired?.rows.find(r=>r.id===itemId);
    if(!prior||!next||prior.role!==next.role||prior.actionId!==next.actionId)
      throw Object.assign(Error(),{code:'STALE_GENERATION'});
  },sink:diagnostics,persist:state=>chrome.storage.local.set({nativeRegistration:state}),getAuthorization,
  dispatch:async(action,{info,generation,depthAuthorization,observation})=>{
    let source;try{source=sourceFromClick(info);}catch(error){if(!action.providerAction)return {state:'blocked',code:error.code??'SOURCE_INVALID'};}
    return engine.save({observation,depthAuthorization,itemId:String(info.menuItemId),generation:generation??registrar.inspect().acknowledgedGeneration,attentionContext:attention.context(info),context:['video','audio'].includes(info.mediaType)?info.mediaType:info.srcUrl?'image':info.linkUrl?'link':'page',source});
  },onOutcome:result=>{void chrome.storage.local.set({lastSave:{state:result.state,code:result.code??'OK',operationId:result.remoteOperationId??result.operationId,completion:result.completion??null,requiredAction:result.requiredAction??null}});void chrome.action.setBadgeText({text:result.state==='completed'?'':'!'});}
});
engine=createEngine({current,registrar,fileApi,providerSetupActions:true,providers:{},getAuthorization,diagnostics,
  remoteSave:async input=>{if(revoking)return {state:'blocked',code:'DISCONNECTING'};return remote.save(input);},onProviderAction:input=>revoking?{state:'blocked',code:'DISCONNECTING'}:cloudflare.invoke(input),
  authorizeSource:async s=>{if(s.bytes instanceof Uint8Array)return true;try{const u=new URL(s.url);return ['https:','http:'].includes(u.protocol)&&await chrome.permissions.contains({origins:[u.origin+'/*']});}catch{return false;}},fetchSource:fetch});
async function external(){const h=await current.readBackupRoot();if(!h||await h.queryPermission({mode:'readwrite'})!=='granted')throw Error('EXTERNAL_RECOVERY_UNAVAILABLE');return createExternalRecovery({files:directoryFiles(h)});}
const recovery={verifyProfileCopy:async()=>{const h=await current.readBackupRoot();if(!h||await h.queryPermission({mode:'readwrite'})!=='granted')throw Error('RECOVERY_PRESERVATION_REQUIRED');return verifyProfileCopy(directoryFiles(h),chrome.runtime.id);},choose:async options=>{
  const candidate=await current.readBackupCandidate();if(!candidate||await candidate.queryPermission({mode:'readwrite'})!=='granted')throw Error('EXTERNAL_RECOVERY_UNAVAILABLE');
  const previous=await current.readBackupRoot();
  if(options?.purpose==='rebuild'){const proof=await verifyProfileCopy(directoryFiles(candidate),chrome.runtime.id);if(previous&&!await previous.isSameEntry(candidate))throw Error('PREVIOUS_BACKUP_REQUIRES_REVIEW');if(!previous)await current.attachRecoveryRoot(candidate);return proof;}
  if(previous&&await previous.queryPermission({mode:'readwrite'})!=='granted')throw Error('PREVIOUS_BACKUP_PERMISSION_REQUIRED');
  if(previous&&!await previous.isSameEntry(candidate))await copyRecoveryDirectory(previous,candidate);
  const test=createExternalRecovery({files:directoryFiles(candidate)});await test.writeNamespace('recovery-root-check',{schemaVersion:1,verified:true});
  await current.setBackupRoot(candidate);return {state:'VERIFIED',evidenceClass:'external-filesystem-readback'};
},status:async()=>{try{await external();return {state:'AVAILABLE',evidence:'user-authorized-directory',windowsKnownFolder:'BLOCKED_NATIVE_COMPANION_REQUIRED'};}catch{return {state:'BLOCKED',code:'EXTERNAL_RECOVERY_UNAVAILABLE',windowsKnownFolder:'BLOCKED_NATIVE_COMPANION_REQUIRED'};}},...Object.fromEntries(['readNamespace','writeNamespace','readVerified','writeVerified','exportVerified','preserveEvidence'].map(m=>[m,async(...args)=>(await external())[m](...args)]))};
const cloudJobs=createWholeCloudJobs({recovery,fileApi,isAuthorized:async i=>{const stopped=(await chrome.storage.local.get('outlineStoppedAccounts')).outlineStoppedAccounts??[];if(stopped.includes(i.accountId))return false;const s=await oauth.status();return i.provider==='cloudflare'&&i.connectionId==='cloudflare:'+i.accountId&&s.state==='CONNECTED'&&s.accounts.some(a=>a.id===i.accountId);}});
const wholeCloud={...cloudJobs,enable:async(i,options)=>{const result=await cloudJobs.enable(i,options);const stopped=(await chrome.storage.local.get('outlineStoppedAccounts')).outlineStoppedAccounts??[];await chrome.storage.local.set({outlineStoppedAccounts:stopped.filter(a=>a!==i.accountId)});return result;}};
const oauthForApi={...oauth,connect:()=>oauth.connect(),disconnect:async()=>{
  const status=await oauth.status();revoking=true;snapshots.clear();
  try{
    try{
      const selected=await current.read(),targets=[selected.product.defaultTarget,...Object.values(selected.configs).flatMap(c=>(c.destinations??c.scopes??[]).map(d=>d.target))].filter(t=>t?.provider==='cloudflare');
      const pending=[...new Map(targets.map(t=>[scopeKey(t),t])).values()];let next=0;
      await Promise.all(Array.from({length:Math.min(4,pending.length)},async()=>{while(next<pending.length){const target=pending[next++];try{await remote.revoke(target);}catch{/* Offline revocation remains bounded by capability expiry. */}}}));
      const stopped=(await chrome.storage.local.get('outlineStoppedAccounts')).outlineStoppedAccounts??[];
      await chrome.storage.local.set({outlineStoppedAccounts:[...new Set([...stopped,...status.accounts.map(a=>a.id)])]});
      for(const identity of await wholeCloud.list())if(status.accounts.some(a=>a.id===identity.accountId))try{await wholeCloud.disable(identity);}catch{}
    }catch{/* Local credential removal still proceeds when ancillary state is unavailable. */}
    return await oauth.disconnect();
  }finally{revoking=false;try{await chrome.runtime.sendMessage({channel:'connection-changed'});}catch{}}
}};
const recoveryCrawl=createRecoveryCrawl({fileApi,recovery,isAuthorized:async t=>{const s=await oauth.status();return s.state==='CONNECTED'&&s.accounts.some(a=>a.id===t.accountId)&&t.connectionId==='cloudflare:'+t.accountId;}});
const permissions=createPermissions();
const api=createEngineApi({engine,current,diagnostics,breadcrumbs,readStorageHealth:async()=>{const storage=globalThis.navigator?.storage;if(!storage?.estimate||!storage?.persisted)return {state:'UNOBSERVED'};const [persistent,usage]=await Promise.all([storage.persisted(),storage.estimate()]);return {state:'OBSERVED_READ_ONLY',persistent,usageBytes:Number.isFinite(usage.usage)?usage.usage:null,quotaBytes:Number.isFinite(usage.quota)?usage.quota:null,pastDeletionCause:'UNKNOWN'};},readNative:async()=>(await chrome.storage.local.get('nativeRegistration')).nativeRegistration??null,readState:readCurrent,fileApi,cloudflare,oauth:oauthForApi,recovery,wholeCloud,recoveryCrawl,getInventory,attention,navigate:async(target,actor)=>{await chrome.storage.session.set({explorerLocation:target});if(actor!=='gui')try{await chrome.runtime.sendMessage({channel:'engine-navigation',target});}catch{}},
  authorize:r=>r.actor==='gui'||permissions.authorize(r),confirm:r=>r.actor==='gui'||permissions.confirm(r)});
const gateway=createAgentGateway({api});
const debugApi=createAgentDebugApi({diagnostics,getMenu:g=>engine.getMenu(g??registrar.inspect().desired?.generation),getEvidence:engine.getEvidence,authorize:(_r,c)=>c?.grant??false});
const debugHost=createDebugHost({runtime:chrome.runtime,api:debugApi,getMenu:g=>engine.getMenu(g??registrar.inspect().desired?.generation),getEvidence:engine.getEvidence});
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(sender?.id===chrome.runtime.id&&sender.url===chrome.runtime.getURL('extension/mirror.html')){debugHost.request(message,sender).then(respond,()=>respond({state:'failed',code:'DEBUG_REQUEST_FAILED'}));return true;}
  if(message?.channel==='recorder'){
    if(!appSenderDecision(chrome.runtime,sender).accepted){respond({version:2,state:'blocked',code:'UNTRUSTED_APP_SENDER'});return false;}
    if(!recorder){respond({version:2,state:'failed',code:recorderInitializationFailure?'RECORDER_INITIALIZATION_FAILED':'RECORDER_NOT_READY',...(recorderInitializationFailure?{diagnostic:recorderInitializationFailure}:{})});return false;}
    recorder.request(message).then(respond,()=>respond({version:2,state:'failed',code:'RECORDER_UNAVAILABLE'}));return true;
  }
  if(message?.channel!=='engine')return false;
  const senderDecision=appSenderDecision(chrome.runtime,sender);
  if(!senderDecision.accepted){respond({version:'3+1.1',state:'blocked',code:'UNTRUSTED_APP_SENDER',diagnostic:{stage:'sender-validation',reason:senderDecision.reason}});return false;}
  // Returning literal true keeps Chrome's response channel alive across startup
  // and async API work. Every accepted request settles through this one owner.
  const failed=(code,stage,error)=>{const cause=error?.code??error?.message;return {version:'3+1.1',state:'failed',code,diagnostic:{stage,...(/^[A-Z][A-Z0-9_]{2,79}$/.test(cause??'')?{causeCode:cause}:{}),...(['AbortError','InvalidStateError','QuotaExceededError','SecurityError','VersionError','UnknownError'].includes(error?.name)?{causeName:error.name}:{})}};};
  // The API owns each operation's dependencies. Auth needs only trusted Chrome
  // credential storage; data operations still validate CURRENT through readCurrent.
  trustedStorage().then(async()=>{
    try{const result=await api.invoke({version:message.version,method:message.method,params:message.params},'gui');return result&&typeof result==='object'&&typeof result.state==='string'?result:failed('ENGINE_RESPONSE_INVALID','invoke');}
    catch(error){return failed('ENGINE_INVOCATION_FAILED','invoke',error);}
  },error=>failed('STORAGE_ACCESS_UNAVAILABLE','credential-storage',error)).then(respond);return true;
});
chrome.action.onClicked.addListener(tab=>{void attention.manual(tab);});
void chrome.sidePanel?.setOptions({path:'extension/app.html',enabled:true}).catch(()=>{});
chrome.alarms.onAlarm.addListener(a=>{if(a.name==='whole-cloud')void (async()=>{try{for(const i of await wholeCloud.list())try{await wholeCloud.tick(i);}catch{}}catch{}const policy=(await current.read()).product.recovery;for(const b of policy.buckets.filter(b=>b.enabled))try{await recoveryCrawl.tick(b,{cadence:policy.cadence});}catch{}})().catch(()=>{});});
// Fresh validation on every state-dependent request; failures do not poison auth
// or future read attempts. Never reinterpret an established missing CURRENT as empty.
async function readCurrent(context){await trustedStorage();const saved=await current.read(context),prior=(await chrome.storage.local.get('nativeRegistration')).nativeRegistration;if(prior?.desired?.generation>0&&saved.generation.desired===0)throw Object.assign(Error(),{code:'CONFIGURATION_RECORD_MISSING',origin:'BACKGROUND_NATIVE_FENCE',subreason:'NATIVE_GENERATION_WITH_ZERO_CURRENT'});inventory=(await chrome.storage.local.get('discoveredInventory')).discoveredInventory??inventory;return saved;}
let nativeAttempt;
async function nativeReady(){const state=await readCurrent(),e=registrar.inspect();if(!e.pending&&e.acknowledgedGeneration===state.generation.desired&&e.acknowledgedGeneration!==null&&engine.matchesCurrent(e.desired,state))return e.lastOutcome;if(!nativeAttempt){const attempt=api.reconcile();nativeAttempt=attempt;attempt.finally(()=>{if(nativeAttempt===attempt)nativeAttempt=null;}).catch(()=>{});}return nativeAttempt;}
// Menu maintenance has explicit lifecycle/save owners, never Shelf open or OAuth.
for(const event of [chrome.runtime.onInstalled,chrome.runtime.onStartup])event?.addListener(()=>{void nativeReady().catch(()=>{});});
// Developer/native-companion integration only: no externally_connectable manifest,
// external messages, content scripts, localhost server, or client-issued grants.
Object.defineProperty(globalThis,'click2cloud',{value:Object.freeze({api,gateway,engine,current,registrar,get ready(){return readCurrent().then(()=>({state:'completed',code:'LOCAL_STATE_READY'}));},
  grantAgent(g){const handle=gateway.grant(g);permissions.issue(g);return handle;},
  revokeAgent:actor=>permissions.revoke(actor),
  approveAgent:(actor,method,params)=>permissions.approve(actor,method,params)
})});
void chrome.alarms.create('whole-cloud',{periodInMinutes:1});
