import {createHistoryStore,HISTORY_CLEANUP_ALARM,QUEUE_CLEANUP_ALARM} from '../src/queue/store.mjs';
import {basicReceipt,currentReceipt} from '../src/queue/receipts.mjs';
import {BASIC_CHANNEL, basicMenuProvider, createBasicHost} from '../src/basic/host.mjs';
import {createScreenshotBackground} from './screenshot-background.mjs';
import {exportOptions,exportPreferenceKey} from '../src/explorer/export-preferences.mjs';
import {captureHistoryContext} from '../src/history/model.mjs';
import {createManifestLocations} from '../src/cloudflare/manifest-locations.mjs';
import {createRecorderHost} from '../src/recorder/host.mjs';
import {createDepthNativeClick,createDepthFeedback} from '../src/modes/depth/native-click.mjs';
import {discoverDepthScope} from '../src/explorer/depth-inventory.mjs';
import {createBreadcrumbs} from '../src/glaciaring/breadcrumbs.mjs';
import {verifyProfileCopy} from '../src/persistence/profile-preservation.mjs';
import {BUILD_INFO} from '../src/build-info.mjs';
import {coalesceFileReads} from '../src/explorer/read-coalescer.mjs';
import {attachFilenameSearch} from '../src/explorer/search-file-api.mjs';
import {createShelfAttention,createShelfHistoryToggle,shelfHistoryCommand,shelfExplorerSearchCommand} from '../src/chrome/provider-panel.mjs';
import {createDailyBadge} from '../src/chrome/daily-badge.mjs';
import {createClosedShelfSaveNotice} from '../src/chrome/save-notice.mjs';
import {createVisualFeedbackPreference} from '../src/aesthetic/visual-feedback.mjs';
import {createProjectileFeedback} from '../src/aesthetic/projectile.mjs';
import {screenshotShortcutSetupKey} from '../src/chrome/command-bindings.mjs';
import {appSenderDecision} from '../src/chrome/trusted-sender.mjs';
import {claimLocalUpload,localUploadPort,releaseLocalUpload,takeLocalUpload} from '../src/chrome/local-upload-files.mjs';
import {sourceFromClick} from '../right2cloud-module/src/index.mjs';
import {createChromeRegistrar} from '../src/chrome/registrar.mjs';
import {operationIdentity} from '../src/core/boundary-observation.mjs';
import {createCurrentStore} from '../src/persistence/current-store.mjs';
import {createEngine} from '../src/core/engine.mjs';
import {createEngineApi,toolRegistry} from '../src/api/service.mjs';
import {createShortcutStore,listCommands} from '../src/api/shortcuts.mjs';
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
import {createVerifiedBucket} from '../src/cloudflare/inventory.mjs';
import {createFileTransport,fileOperationTarget} from '../src/cloudflare/file-transport.mjs';
import {createR2PublicDomains} from '../src/cloudflare/r2-public-domains.mjs';
import {createRemoteTransport,preparedDestination,previousWorkerDigests} from '../src/cloudflare/transport.mjs';
import {createCloudflareOnboarding} from '../src/cloudflare/onboarding.mjs';
import {sourceURL} from '../src/cloudflare/public-address.mjs';
import {levelHidden} from '../src/modes/nested/index.mjs';
import {localUploadKey,maximumUploadFiles,uploadError,uploadId} from '../src/chrome/local-upload-plan.mjs';
import {remoteDestination} from '../src/cloudflare/wire.mjs';
import {scopeKey,targetKey,normalizeTarget,ancestors} from '../src/core/menu-identity.mjs';
// Coalesce trusted-storage access, but never retain a rejected startup attempt.
let storageReady;
function trustedStorage(){if(!storageReady){const attempt=Promise.resolve().then(()=>Promise.all(['local','session'].map(k=>chrome.storage[k].setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}))));storageReady=attempt;attempt.catch(()=>{if(storageReady===attempt)storageReady=null;});}return storageReady;}
const workerEpoch=crypto.getRandomValues(new Uint32Array(1))[0]||1;
const breadcrumbs=createBreadcrumbs({epoch:workerEpoch,build:BUILD_INFO.revision,read:async()=>(await chrome.storage.local.get('criticalBreadcrumbs')).criticalBreadcrumbs,write:value=>chrome.storage.local.set({criticalBreadcrumbs:value})});
const lifecycle=(code,outcome='failed')=>breadcrumbs.enqueue({stage:'lifecycle',code,outcome});
lifecycle('OBSERVATION_WORKER_STARTED','ok');
for(const event of ['error','unhandledrejection'])globalThis.addEventListener?.(event,()=>lifecycle('OBSERVATION_WORKER_EXCEPTION'));
const diagnostics=createDiagnostics({epoch:workerEpoch,build:BUILD_INFO.revision,onCritical:breadcrumbs.enqueue}),current=createCurrentStore({sink:diagnostics,readEstablishment:async()=>{await trustedStorage();const p=await chrome.storage.local.get(['nativeRegistration','currentProvenance']);return {established:!!p.currentProvenance||!!p.nativeRegistration,uncertain:!!p.currentProvenance&&(p.currentProvenance.version!==1||p.currentProvenance.established!==true),nativeGeneration:p.nativeRegistration?.desired?.generation??0,native:{present:!!p.nativeRegistration,desiredGeneration:p.nativeRegistration?.desired?.generation??null,appliedGeneration:p.nativeRegistration?.appliedGeneration??null,state:['applying','acknowledged','applied','failed','partial'].includes(p.nativeRegistration?.state)?p.nativeRegistration.state:'unknown',rowCount:p.nativeRegistration?.desired?.rows?.length??0,roles:Object.fromEntries(['save','branch','provider-action','separator','navigation'].map(role=>[role,(p.nativeRegistration?.desired?.rows??[]).filter(r=>r.role===role).length]))}};},retainEstablishment:async proof=>{await chrome.storage.local.set({currentProvenance:proof});}});
let connectionObservation=null,attentionPreference=null;
const visualFeedback=createVisualFeedbackPreference(chrome.storage);
const projectile=createProjectileFeedback({chrome,preferences:visualFeedback});
const dailyBadge=createDailyBadge({chrome,
 countHistory:current.countRemoteResults,countBasic:range=>basic.verifiedCount(range),
 readPreferences:()=>current.readHistoryPreferences(),transmissionEnabled:()=>visualFeedback.value.toolbar});
visualFeedback.subscribe(value=>{if(!value.toolbar)dailyBadge.cancelTransmission();});
const queueHistory=createHistoryStore();
const observedQueueOperations=new Set();
async function accountQueueReceipt(project,row){
 if(project===currentReceipt){
  if(row.kind==='screenshot-to-cloud'?!row.screenshot?.finishedAt:row.state==='pending')observedQueueOperations.add(row.operationId);
  else observedQueueOperations.delete(row.operationId);
 }
 try{
  const records=project(row);
  if(records.length)await queueHistory.reconcile(records);
  void chrome.runtime.sendMessage({channel:'queue-history-changed'}).catch(()=>{});
 }catch{
  void chrome.runtime.sendMessage({channel:'queue-history-accounting-pending'}).catch(()=>{});
 }
}
const shelfHistory=createShelfHistoryToggle({chrome,feedback:(windowId,code)=>{
 void chrome.runtime.sendMessage({channel:'shelf-history-feedback',windowId,code}).catch(()=>{});
}});
const saveNotice=createClosedShelfSaveNotice({chrome,preferences:visualFeedback,isClosed:shelfHistory.isClosed,
 observe:code=>diagnostics.emit({stage:'chrome.save-notice',outcome:code==='CUSTOM_NOTICE_RENDERED'?'ok':'failed',code,operationId:operationIdentity()})});
const basic=createBasicHost({chrome,trustedStorage,onVerified:receipt=>{
 saveNotice.saved(receipt.provider,'basic:'+receipt.id);
 return dailyBadge.recordBasicVerified(receipt.badgeVerifiedAt);
},observeAttempt:row=>accountQueueReceipt(basicReceipt,row)});
const attention=createShelfAttention({chrome,preference:()=>attentionPreference,
 onOpened:info=>{saveNotice.shelfOpened(info.windowId);return shelfHistory.opened(info);},notify:()=>{void dailyBadge.refresh();}});
const oauth=createCloudflareOAuth({chrome,onStatus:s=>{connectionObservation=s;},onConnected:async()=>{snapshots.clear();try{await chrome.runtime.sendMessage({channel:'connection-changed'});}catch{}}});
let inventory={revision:0,scopes:[]},inventoryHydrated=false,engine,revoking=false;
async function loadCloudInventory(signal){
 if(inventoryHydrated)return;
 const saved=await chrome.storage.local.get('discoveredInventory');
 signal?.throwIfAborted();
 if(inventoryHydrated)return;
 inventory=saved.discoveredInventory??inventory;
 inventoryHydrated=true;
}
function assertConnected(){if(revoking)throw Object.assign(Error(),{code:'AUTHORIZATION_REVOKED'});}
const setupOauth={...oauth,
 authority:()=>{assertConnected();return oauth.authority();},
 request:(...args)=>{assertConnected();return oauth.request(...args);}
};
const provisioner=createProvisioner({request:setupOauth.request,authority:setupOauth.authority,readModule:async path=>{const r=await fetch(chrome.runtime.getURL(path));if(!r.ok)throw Error('WORKER_MODULE_UNAVAILABLE');return r.text();},load:async key=>(await chrome.storage.local.get('remoteTransport:'+key))['remoteTransport:'+key],store:(key,value)=>chrome.storage.local.set({['remoteTransport:'+key]:value})});
async function checkSelectedBucket(target,auth){
 assertConnected();
 if(!auth.scopes?.includes('workers-r2.write')||!auth.scopes?.includes('workers-r2.read'))throw Object.assign(Error('INSUFFICIENT_SCOPE'),{code:'INSUFFICIENT_SCOPE'});
 const response=await oauth.request('/accounts/'+encodeURIComponent(target.accountId)+'/r2/buckets/'+encodeURIComponent(target.bucketName));
 const body=await response.json();
 assertConnected();
 if(!response.ok||body.success!==true){
  const diagnostic=diagnoseCloudflare(response,body,{context:'r2'}),code=response.status===404?'SELECTED_BUCKET_MISSING':diagnostic.code;
  throw Object.assign(Error(code),{code,diagnostic});
 }
 return true;
}
const remote=createRemoteTransport({expectedCodeDigest:BUILD_INFO.workerCodeDigest,compatibleCodeDigests:previousWorkerDigests,oauth,lookup:provisioner.lookup,verifyAuthority:checkSelectedBucket,record:recordRemote,authorizeSource:async s=>{try{sourceURL(s.url);return !s.bytes;}catch{return false;}}});
const snapshots=new Map();
async function remoteReady(target,signal){const a=await oauth.status();signal?.throwIfAborted();if(a.state!=='CONNECTED'||!a.accounts.some(x=>x.id===target.accountId))return false;const k=targetKey(target),snapshot=snapshots.get(k);if(snapshot&&Date.now()-snapshot.at<10000)return snapshot.ready;const r=await remote.status(target);signal?.throwIfAborted();snapshots.set(k,{at:Date.now(),ready:r.state==='READY'});return r.state==='READY';}
async function prepared(target){
 return preparedDestination(await provisioner.lookup(target),target,BUILD_INFO.workerCodeDigest,previousWorkerDigests);
}
const cloudflare=createCloudflareOnboarding({current,oauth:setupOauth,inspectBucket:checkSelectedBucket,provisioner:{...provisioner,markVerified:async(t,sessionId)=>{await provisioner.markVerified(t,sessionId);snapshots.clear();}},transport:remote,readRequestedTarget:async()=>(await attention.read())?.target,openShelf:(provider,target,details)=>attention.attend(provider??'cloudflare',target,details),record:recordRemote,history:options=>current.readRemoteResults(options)});

function onVerifiedCurrent(row){
 const transmission=row.kind!=='screenshot-to-cloud'||row.state==='confirmed';
 if(row.kind!=='screenshot-to-cloud')saveNotice.saved('cloudflare','cloudflare:'+row.operationId);
 return dailyBadge.recordVerified(row,{transmission});
}
async function recordRemote(value){
 const saved=await current.recordRemoteResult(value,{onVerified:onVerifiedCurrent});
 void accountQueueReceipt(currentReceipt,saved);
 try{void chrome.runtime.sendMessage({channel:'remote-result',result:{operationId:saved.operationId,state:saved.state,code:saved.code,kind:saved.kind,destination:saved.destination,key:saved.receipt?.key,stage:saved.stage,bytes:saved.bytes}}).catch(()=>{});}catch{/* No open app is normal; durable results remain inspectable. */}
 try{void Promise.resolve(fileApi.noteRemoteWrite(saved)).catch(()=>{});}catch{}
 return saved;
}
const executeFileMessage=createFileTransport({remote});

async function send(message) {
  let path,field;
  if(message.type==='cfCreateBucket')return createVerifiedBucket(setupOauth,message);
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
const uploadScopes=['workers-r2.read','workers-r2.write','workers-r2-bucket-item.read','workers-r2-bucket-item.write'];
async function checkUploadDestination(source,signal){
 const target=normalizeTarget(source);
 assertConnected();
 const auth=await oauth.authority();
 signal?.throwIfAborted();
 if(target.provider!=='cloudflare'||target.connectionId!=='cloudflare:'+target.accountId||
    !auth.accounts.some(account=>account.id===target.accountId))
  throw uploadError('SCOPE_UNAUTHORIZED','Select an authorized Cloudflare R2 folder.');
 if(!uploadScopes.every(scope=>auth.scopes?.includes(scope)))
  throw uploadError('INSUFFICIENT_SCOPE','Reconnect Cloudflare with R2 read and write access.');
 const plan=await provisioner.lookup(target);
 const readiness=preparedDestination(plan,target,BUILD_INFO.workerCodeDigest,previousWorkerDigests);
 if(!['READY','PREPARED'].includes(readiness.state))
  throw uploadError(readiness.code,'This folder needs an authorized Cloudflare file connection.');
 const live=await remote.status(target);
 signal?.throwIfAborted();
 assertConnected();
 if(!['READY','PREPARED'].includes(live.state))
  throw uploadError(live.code,'Cloudflare could not verify write access to this folder.');
 return {target,sessionId:auth.sessionId,stagingPrefix:(plan.prefixScope?plan.prefixScope+'/':'')+'.redown-beta-uploads/'};
}
async function runLocalUpload({source,file,key,uploadMode='files',localBinding},options){
 const {target,sessionId,stagingPrefix}=localBinding??await checkUploadDestination(source,options.signal);
 const relativePath=key?.slice(target.prefix.length)??file.name;
 if(key!==undefined&&!key.startsWith(target.prefix))throw uploadError('UPLOAD_PATH_INVALID','The upload path is outside its selected folder.');
 const destinationKey=localUploadKey(target,file,relativePath,uploadMode);
 options.signal?.throwIfAborted();
 const uploader=createClick2CloudFileApi({
  send:async(message,{signal})=>{
   signal?.throwIfAborted();assertConnected();
   await localBinding?.beforeCommit?.();
   signal?.throwIfAborted();assertConnected();
   return executeFileMessage(message,{signal,expectedSession:sessionId});
  },
  http:{request:(path,request)=>{
   assertConnected();
   return oauth.request(path,{...request,expectedSession:sessionId,requiredScopes:uploadScopes});
  },boundedFetch:fetch}
 });
 return uploader.run('upload',{source:target,key:destinationKey,file,stagingPrefix,conflict:uploadMode==='folder'?'skip':'keep'},options);
}
const providerFileApi=coalesceFileReads(Object.freeze({...baseFileApi,capabilities:baseFileApi.capabilities.filter(op=>['readChunk','accounts','buckets','list','listRaw','stat','preview','readStream','mkdir','copy','move','rename','delete','createBucket','upload'].includes(op)),async run(operation,input={},options={}) {
  if(operation==='upload')return runLocalUpload(input,options);
  // Unconfigured Worker transport is blocked before staging any object bytes.
  if(!['readChunk','accounts','buckets','list','listRaw','stat','preview','readStream','mkdir','copy','move','rename','delete','createBucket'].includes(operation))return {state:'blocked',code:'AUTHORIZED_WORKER_TRANSPORT_UNAVAILABLE'};
  const result=await baseFileApi.run(operation,input,options);
  if(operation==='list'&&result.state==='completed')await observeListing(input.source,result.data);
  return result;
}}),{authority:oauth.authority});
async function observeListing(source,result){
 try{await loadCloudInventory();}catch{return;}
 const t=normalizeTarget({provider:'cloudflare',connectionId:'cloudflare:'+source.accountId,...source,prefix:''});
 let s=inventory.scopes.find(x=>scopeKey(x.target)===scopeKey(t)),changed=false;
 if(!s){s={target:t,authorized:true,workerReady:false,folders:[],complete:false};inventory.scopes.push(s);changed=true;}
 for(const p of [source.prefix??'',...result.entries.filter(e=>e.folder).map(e=>e.key)])if(!s.folders.includes(p)){s.folders.push(p);changed=true;}
 if(changed){inventory.revision++;await chrome.storage.local.set({discoveredInventory:inventory}).catch(()=>{});}
}
const filenameApi=attachFilenameSearch(providerFileApi,{oauth,assertConnected,readFilePage:baseFileApi.run,onWrite(scopes){
 void chrome.runtime.sendMessage({channel:'filename-inventory-changed',scopes}).catch(()=>{});
}});
const fileApi=Object.freeze({...filenameApi,async listDirectory(input,options){
 const result=await filenameApi.listDirectory(input,options);
 if(result.state==='completed')await observeListing(input.source,result.data);
 return result;
}});
// Menu inspection/boot projects saved observations without a full-cloud network
// sweep. Destination Save refreshes its exact new targets; every actual save
// independently rechecks current authority and scoped Worker capability.
async function getInventory({refreshTargets=[],refreshDepthScopes=[],refreshDepthReadiness=false,depthBudget,preparedTargets=[],saveSelection,localOnly=false,currentState,signal}={}) {
  let cloudflareInventory;
  const [status,state,{depthInventory=[],depthRefreshPending=[]}]=await Promise.all([
    oauth.status().catch(error=>{if(!localOnly)throw error;cloudflareInventory={state:'pending',code:'CLOUDFLARE_STATUS_UNAVAILABLE'};return {state:'DISCONNECTED',accounts:[]};}),
    currentState??current.read(),
    chrome.storage.local.get(['depthInventory','depthRefreshPending']),
    loadCloudInventory(signal)
  ]);
  signal?.throwIfAborted();
  if(!localOnly)for(const b of state.product.recovery.buckets.filter(b=>b.enabled)){
    let index;
    try{index=await recoveryCrawl.inspect(b.target);}catch{continue;}
    signal?.throwIfAborted();
    let scope=inventory.scopes.find(s=>scopeKey(s.target)===scopeKey(b.target));
    if(!scope){scope={target:{...b.target,prefix:''},folders:[],complete:false};inventory.scopes.push(scope);}
    scope.folders=[...new Set([...scope.folders,...index.folders])];
  }
  const savedTargets=[state.product.defaultTarget,...Object.values(state.configs).flatMap(c=>(c.destinations??c.scopes??[]).map(d=>d.target))].filter(Boolean);
  // Keep the bounded Depth snapshot separate from Explorer and recovery observations.
  // A failed crawl leaves the previous snapshot intact.
  const depthSnapshots=new Map(depthInventory.map(s=>[scopeKey(s.target),s]));
  const pendingScopes=new Set(depthRefreshPending);
  const refreshSelections=refreshDepthScopes.filter(s=>!s.hidden);
  for(const selection of refreshSelections)pendingScopes.add(scopeKey(selection.target));
  if(refreshSelections.length)await chrome.storage.local.set({depthRefreshPending:[...pendingScopes]});
  const discovered=[],depthFailures=[];
  for(const selection of refreshSelections){
    signal?.throwIfAborted();
    try{
      if(status.state!=='CONNECTED'||!status.accounts.some(a=>a.id===selection.target.accountId))throw Object.assign(Error(),{code:'AUTH_REQUIRED'});
      const result=await discoverDepthScope(baseFileApi,selection,{...depthBudget,signal:signal??depthBudget?.signal});
      signal?.throwIfAborted();
      depthSnapshots.set(result.scopeKey,result);
      pendingScopes.delete(result.scopeKey);
      discovered.push(result.target,...result.folders.map(prefix=>({...result.target,prefix})));
    }catch(error){
      signal?.throwIfAborted();
      if(!saveSelection)throw error;
      const code=error?.code;
      depthFailures.push({target:selection.target,code:/^[A-Z0-9_]+$/.test(code??'')?code:'DEPTH_DISCOVERY_REQUIRED'});
    }
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
  // Explicit diagnostics can refresh live readiness. Cold dispatch uses the
  // retained tree and keeps live authorization at the transfer boundary.
  const depthTargets=refreshDepthReadiness&&status.state==='CONNECTED'?depthScopes.flatMap((s,i)=>
    status.accounts.some(a=>a.id===s.target.accountId)?[s.target,...s.folders
      .filter(p=>p.split('/').filter(Boolean).length<=depthSelections[i].maxDepth)
      .map(prefix=>({...s.target,prefix}))]:[]):[];
  // Preview remains read-only. On explicit target refresh or cold reconciliation,
  // verify only visible curated Narrow ancestors, independently of child grants.
  const narrowTargets=state.product.show.nested&&state.product.providerVisibility.cloudflare
    ?state.configs.nested.destinations.filter(d=>!d.hidden)
      .flatMap(d=>['',...ancestors(d.target.prefix)].filter(prefix=>prefix!==d.target.prefix&&!levelHidden(d,prefix)).map(prefix=>({...d.target,prefix})))
    :[];
  const checkedTargets=new Set((saveSelection??[]).map(s=>targetKey(s.target)));
  const preparedBuckets=new Set(preparedTargets.map(scopeKey)),checkedBuckets=new Set((saveSelection??[]).map(s=>scopeKey(s.target)));
  const readinessTargets=[...new Map([...refreshTargets,...discovered,...depthTargets,...narrowTargets.filter(t=>refreshDepthReadiness||refreshTargets.some(r=>scopeKey(r)===scopeKey(t)))]
    .filter(t=>t.provider==='cloudflare'&&!checkedBuckets.has(scopeKey(t))).map(t=>[targetKey(t),t])).values()];
  if(refreshTargets.length||discovered.length)for(const t of [...refreshTargets,...discovered])snapshots.delete(targetKey(t));
  let readinessIndex=0;
  await Promise.all(Array.from({length:Math.min(4,readinessTargets.length)},async()=>{
    while(readinessIndex<readinessTargets.length){signal?.throwIfAborted();await remoteReady(readinessTargets[readinessIndex++],signal);}
  }));
  signal?.throwIfAborted();
  for(const saved of [...savedTargets,...narrowTargets]){let found=inventory.scopes.find(s=>scopeKey(s.target)===scopeKey(saved));if(!found){found={target:{...saved,prefix:''},folders:[],complete:false};inventory.scopes.push(found);}if(!found.folders.includes(saved.prefix))found.folders.push(saved.prefix);}
  const plans=new Map();
  for(const {target} of [...inventory.scopes,...depthScopes]){
    if(target.provider!=='cloudflare'||!status.accounts.some(a=>a.id===target.accountId)||plans.has(scopeKey(target)))continue;
    plans.set(scopeKey(target),Promise.resolve().then(()=>provisioner.lookup(target)).catch(()=>null));
  }
  for(const [key,plan] of plans)plans.set(key,await plan);
  const projectReady=t=>{
    const bucket=scopeKey(t);
    if(checkedBuckets.has(bucket)&&!preparedBuckets.has(bucket)&&checkedTargets.has(targetKey(t)))return false;
    const snapshot=snapshots.get(targetKey(t));
    if(!checkedBuckets.has(bucket)&&snapshot&&Date.now()-snapshot.at<10000)return snapshot.ready;
    try{return preparedDestination(plans.get(scopeKey(t)),t,BUILD_INFO.workerCodeDigest,previousWorkerDigests).state==='READY';}catch{return false;}
  };
  const projectScope=s=>({...s,authorized:status.state==='CONNECTED'&&status.accounts.some(a=>a.id===s.target.accountId),
    workerReady:projectReady(s.target),
    folders:s.folders.map(p=>{const prefix=typeof p==='string'?p:p.prefix;return {prefix,workerReady:projectReady({...s.target,prefix})};})});
  return {...inventory,scopes:inventory.scopes.map(projectScope),depthScopes:depthScopes.map(projectScope),
    depthCoverageComplete:depthScopes.every(s=>!s.stale),depthFailures,cloudflareInventory};
}
const getAuthorization=async selection=>{
 if(revoking)return null;
 try{
  const auth=await oauth.authority();
  const target=selection?.provider?selection:registrar.inspect().desired?.rows.find(r=>r.id===String(selection?.menuItemId))?.target;
  const authorized=target?.provider==='cloudflare'&&auth.accounts.some(a=>a.id===target.accountId)&&(await prepared(target)).state==='READY';
  return {sessionId:auth.sessionId,authorizedTargets:authorized?[target]:[]};
 }catch{return null;}
};
async function recoverConfiguredTarget({target,generation}){
 if(revoking)return {state:'blocked',code:'DISCONNECTING'};
 const state=await readCurrent(),native=registrar.inspect();
 if(native.pending||native.acknowledgedGeneration!==state.generation.desired||
   (generation!==undefined&&generation!==native.acknowledgedGeneration)||!engine.matchesCurrent(native.desired,state))
  return {state:'blocked',code:'STALE_GENERATION'};
 // The typed owner can use existing approval, but cannot grant new consent
 // from a context-menu gesture or repeat a source write.
 const out=await api.invoke({version:'3+1.1',method:'recoverCloudflareDestination',params:{target}},'gui');
 return out.data??{state:out.state,code:out.code};
}
const depthClick=createDepthNativeClick({current,oauth,transport:{async status(target){
 const evidence=await prepared(target);
 return evidence.state==='READY'?evidence:remote.status(target);
}},lookup:provisioner.lookup,inspect:()=>registrar.inspect(),authorize:getAuthorization,recover:recoverConfiguredTarget,
attend:(target,{code,info})=>attention.attend('cloudflare',target,{code,context:attention.context(info)}),feedback:createDepthFeedback(chrome,()=>{void dailyBadge.refresh();})});
async function invokeProviderAction(input){
 if(revoking)return {state:'blocked',code:'DISCONNECTING'};
 if(input.setupOnly&&input.attentionContext&&input.requestedTarget){
  const target=input.requestedTarget,auth=await oauth.authority().catch(()=>null);
  if(auth?.accounts.some(a=>a.id===target.accountId)){
   const evidence=await prepared(target);
   if(['WORKER_SETUP_REQUIRED','WRITE_PROOF_REQUIRED'].includes(evidence.code)){
    const prepared=await recoverConfiguredTarget({target,generation:input.generation});
    const code=prepared.state==='completed'?'FRESH_CLICK_REQUIRED':prepared.code;
    try{await attention.attend('cloudflare',target,{code,context:input.attentionContext});}catch{}
    return {state:prepared.state==='uncertain'?'uncertain':'blocked',code,target,
     requiredAction:prepared.state==='completed'?'RIGHT_CLICK_AGAIN':prepared.requiredAction};
   }
  }
 }
 return cloudflare.invoke(input);
}
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
  recorder=await createRecorderHost({chrome,build:BUILD_INFO,startupGaps:()=>bootstrapDropped,readScreenshotReceipts:current.readScreenshotReceipts});
  for(const pending of bootstrapObservations){pending.forward=recorder.click(pending.early);for(const event of pending.events)pending.forward(event);pending.events.length=0;}
  bootstrapObservations.length=0;
}).catch(error=>{recorderInitializationFailure={stage:'recorder-initialization',causeName:['Error','TypeError','SyntaxError','ReferenceError','SecurityError','QuotaExceededError','InvalidStateError'].includes(error?.name)?error.name:'UnknownError'};bootstrapDropped+=bootstrapObservations.length;bootstrapObservations.length=0;});
let screenshots;
const screenshotHost=()=>screenshots??=createScreenshotBackground({chrome,oauth:setupOauth,current,fileApi,onVerified:onVerifiedCurrent,
 onConfirmed:id=>saveNotice.saved('cloudflare','cloudflare:'+id),
 observeResult:row=>accountQueueReceipt(currentReceipt,row),historyUrls:async(method,output,params)=>{
 if(method==='history-connect-domain'){
  if(params.confirmed!==true)throw Object.assign(Error('CONFIRMATION_REQUIRED'),{code:'CONFIRMATION_REQUIRED'});
  if(typeof params.domain!=='string')throw Object.assign(Error('CUSTOM_DOMAIN_INVALID'),{code:'CUSTOM_DOMAIN_INVALID'});
  return publicDomains.connectCustomDomain(output.target,params.domain);
 }
 const enable=method==='history-enable-public-urls';
 const result=await api.invoke({version:'3+1.1',method:enable?'enableBucketPublicAccess':'getPublicUrls',
  params:{source:output.target,key:output.key,...(enable?{confirmed:params.confirmed}:{})}},'gui',{screenshotHistory:true});
 if(result.state!=='completed')throw Object.assign(Error(result.code),{code:result.code});
 return result.data;
}});
chrome.commands?.onCommand?.addListener((command,tab)=>{
 if(command===shelfHistoryCommand)shelfHistory.command(tab);
 else if(command===shelfExplorerSearchCommand)shelfHistory.search(tab);
 else try{screenshotHost().onCommand(command,tab);}catch{lifecycle('OBSERVATION_WORKER_EXCEPTION');}
});
const readNativeRegistration=async()=>(await chrome.storage.local.get('nativeRegistration')).nativeRegistration??null;
const registrar=createChromeRegistrar({chrome,epoch:workerEpoch,readRegistration:readNativeRegistration,retiredRoots:['click2cloud-screenshot'],observeClick:observeDeliveredClick,depthClick,readDepthClickRow:async id=>(await readNativeRegistration())?.desired?.rows.find(r=>r.id===id&&r.origin?.mode==='depth'),beforeApply:async spec=>{const s=await readCurrent();if(s.generation.desired!==spec.generation||spec.mode==='composite'&&spec.modeRevision!==s.product.revision)throw Object.assign(Error(),{code:'STALE_GENERATION'});},onGesture:(info,tab)=>{projectile.arm(info,tab);const native=registrar.inspect(),row=native.desired?.rows.find(r=>r.id===String(info.menuItemId)),provider=row?.providerAction??row?.origin?.provider;attention.gesture(info,tab,{provider,enabled:!!row&&!native.pending&&native.acknowledgedGeneration===native.desired?.generation&&['save','provider-action'].includes(row.role),needsAttention:!basicMenuProvider(provider)&&(row?.role==='provider-action'||row?.actionKind==='attention'||connectionObservation?.state==='DISCONNECTED')});
},beforeClick:async info=>{
    const native=registrar.inspect(),itemId=String(info.menuItemId);
    const delivered=native.desired?.rows.find(r=>r.id===itemId);
    // Basic uses its own authorization. The registrar still checks current
    // native acknowledgement, visibility and click context before dispatch.
    if(delivered?.role==='provider-action'&&basicMenuProvider(delivered.providerAction)&&!native.pending){
      const state=await readCurrent();
      if(state.product.providerVisibility[delivered.providerAction]!==true)throw Object.assign(Error(),{code:'STALE_GENERATION'});
      if(native.desired.generation===state.generation.desired)return;
    }
    const retained=native.lastAcknowledged?null:await readNativeRegistration();
    const previous=native.lastAcknowledged??(retained?.state==='acknowledged'?retained.desired:null);
    const priorBasic=retained?.desired?.rows.find(r=>r.id===itemId&&basicMenuProvider(r.providerAction));
    const prior=previous?.rows.find(r=>r.id===itemId)??(delivered?.role==='provider-action'?delivered:priorBasic);
    if(revoking&&!basicMenuProvider(prior?.providerAction))throw Object.assign(Error(),{code:'AUTH_REQUIRED'});
    await nativeReady();
    const next=registrar.inspect().desired?.rows.find(r=>r.id===itemId);
    if(!prior||!next||prior.role!==next.role||prior.actionId!==next.actionId)
      throw Object.assign(Error(),{code:'STALE_GENERATION'});
  },sink:diagnostics,persist:state=>chrome.storage.local.set({nativeRegistration:state}),getAuthorization,dispatchOwnsAuthorization:true,isIndependentProvider:basicMenuProvider,
  dispatchAttention:(provider,info)=>invokeProviderAction({provider,emptyAssignment:provider==='cloudflare',attentionContext:attention.context(info)}),
  dispatch:async(action,{info,tab,generation,depthAuthorization,observation})=>{
    const onAccepted=projectile.forClick(info);
    const provider=basicMenuProvider(action.providerAction);
    if(provider){
      const result=await basic.click(provider,info,tab,onAccepted);
      if(result.state==='pending'||result.state==='failed'&&/^(?:AUTH_|OAUTH_CONFIG_REQUIRED$)/.test(result.code)){
        // Basic owns the click-time authorization and the failed save outcome.
        // Some Chrome versions reject sidePanel.open after the async check.
        try{
          const opening=await attention.attend(action.providerAction,undefined,{code:result.code,context:attention.context(info)});
          if(opening.state==='blocked')await chrome.tabs.create({url:chrome.runtime.getURL('extension/app.html')});
        }catch{/* The original provider failure remains available in the Shelf. */}
      }
      return result;
    }
    let source;try{source={...sourceFromClick(info),historyContext:captureHistoryContext(info,tab)};}catch(error){if(!action.providerAction&&action.actionKind!=='attention')return {state:'blocked',code:error.code??'SOURCE_INVALID'};}
    return engine.save({observation,depthAuthorization,itemId:String(info.menuItemId),generation:generation??registrar.inspect().acknowledgedGeneration,attentionContext:attention.context(info),context:['video','audio'].includes(info.mediaType)?info.mediaType:info.srcUrl?'image':info.linkUrl?'link':'page',source,onAccepted});
  },onOutcome:result=>{
    if(result.code==='RESOURCE_BUSY'&&!showSaveBusy())return;
    void chrome.storage.local.set({lastSave:{state:result.state,code:result.code??'OK',operationId:result.remoteOperationId??result.operationId??result.attemptId,completion:result.completion??null,requiredAction:result.requiredAction??null}}).catch(()=>{});
  }
});
let lastSaveBusy=0;
function showSaveBusy(){
 const now=Date.now();
 if(now-lastSaveBusy<500)return false;
 lastSaveBusy=now;
 void chrome.runtime.sendMessage({channel:'remote-result',result:{kind:'save',state:'blocked',code:'RESOURCE_BUSY'}}).catch(()=>{});
 return true;
}
engine=createEngine({current,registrar,fileApi,providerSetupActions:true,providers:{},getAuthorization,diagnostics,
  remoteSave:async input=>{if(revoking)return {state:'blocked',code:'DISCONNECTING'};return remote.save(input);},onProviderAction:invokeProviderAction,
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
      const keys=(await chrome.storage.local.getKeys()).filter(key=>key.startsWith('remoteTransport:'));
      const plans=Object.values(await chrome.storage.local.get(keys)).filter(plan=>plan?.state==='ready'&&status.accounts.some(a=>a.id===plan.accountId));
      let next=0;
      await Promise.all(Array.from({length:Math.min(4,plans.length)},async()=>{
        while(next<plans.length){
          const plan=plans[next++],target={provider:'cloudflare',connectionId:'cloudflare:'+plan.accountId,accountId:plan.accountId,
            bucketName:plan.bucketName,prefix:plan.prefixScope?plan.prefixScope+'/':''};
          try{await remote.revoke(target,plan.sourceBucket);}catch{/* A failed revocation remains bounded by capability expiry. */}
        }
      }));
      const stopped=(await chrome.storage.local.get('outlineStoppedAccounts')).outlineStoppedAccounts??[];
      await chrome.storage.local.set({outlineStoppedAccounts:[...new Set([...stopped,...status.accounts.map(a=>a.id)])]});
      for(const identity of await wholeCloud.list())if(status.accounts.some(a=>a.id===identity.accountId))try{await wholeCloud.disable(identity);}catch{}
    }catch{/* Local credential removal still proceeds when ancillary state is unavailable. */}
    return await oauth.disconnect();
  }finally{
    const accounts=status.accounts??[];
    await Promise.all((accounts.length?accounts.map(a=>({provider:'cloudflare',accountId:a.id})):[{provider:'cloudflare'}]).map(scope=>fileApi.invalidateDirectorySearch(scope,{purge:true})));
    revoking=false;scheduleNative('NATIVE_DISCONNECT');try{await chrome.runtime.sendMessage({channel:'connection-changed'});}catch{}
  }
}};
const recoveryCrawl=createRecoveryCrawl({fileApi,recovery,isAuthorized:async t=>{const s=await oauth.status();return s.state==='CONNECTED'&&s.accounts.some(a=>a.id===t.accountId)&&t.connectionId==='cloudflare:'+t.accountId;}});
const permissions=createPermissions();
const manifestLocations=createManifestLocations({oauth,current,provisioner,transport:remote});
const readExportOptions=async()=>exportOptions((await chrome.storage.local.get(exportPreferenceKey).catch(()=>({})))[exportPreferenceKey]);
const publicDomains=createR2PublicDomains({oauth,assertConnected});
const shortcutStore=createShortcutStore(chrome.storage.local,listCommands(toolRegistry));
const api=createEngineApi({engine,current,shortcutStore,onHistoryPreferenceChange:dailyBadge.refresh,readExportOptions,...publicDomains,manifestLocations,diagnostics,breadcrumbs,readStorageHealth:async()=>{const storage=globalThis.navigator?.storage;if(!storage?.estimate||!storage?.persisted)return {state:'UNOBSERVED'};const [persistent,usage]=await Promise.all([storage.persisted(),storage.estimate()]);return {state:'OBSERVED_READ_ONLY',persistent,usageBytes:Number.isFinite(usage.usage)?usage.usage:null,quotaBytes:Number.isFinite(usage.quota)?usage.quota:null,pastDeletionCause:'UNKNOWN'};},readNative:readNativeRegistration,scheduleNative,readState:readCurrent,fileApi,cloudflare,prepareFileWorker:cloudflare.ensureFileWorker,oauth:oauthForApi,recovery,wholeCloud,recoveryCrawl,getInventory,attention,navigate:async(target,actor)=>{await chrome.storage.session.set({explorerLocation:target});if(actor!=='gui')try{await chrome.runtime.sendMessage({channel:'engine-navigation',target});}catch{}},
  authorize:r=>r.actor==='gui'||permissions.authorize(r),confirm:r=>r.actor==='gui'||permissions.confirm(r)});
const gateway=createAgentGateway({api});
const debugApi=createAgentDebugApi({diagnostics,getMenu:g=>engine.getMenu(g??registrar.inspect().desired?.generation),getEvidence:engine.getEvidence,authorize:(_r,c)=>c?.grant??false});
const debugHost=createDebugHost({runtime:chrome.runtime,api:debugApi,getMenu:g=>engine.getMenu(g??registrar.inspect().desired?.generation),getEvidence:engine.getEvidence});
// Local File tickets and recovery metadata are available only to the trusted Shelf.
const activeLocalUploads = new Map();
const uploadReadTransient = new Set(['TRANSPORT_UNAVAILABLE','NETWORK_ERROR','WORKER_UNREACHABLE','WORKER_UNAVAILABLE','RESOURCE_BUSY']);
const localUploadClaimKey = (source,key) => JSON.stringify([targetKey({...source,prefix:''}),key]);
const uploadCode = (value, fallback) => /^[A-Z][A-Z0-9_]{1,79}$/.test(value??'') ? value : fallback;
async function recordLocalUpload(job,state,code,receipt){
 const destination=remoteDestination(job.source);
 const row=await current.recordRemoteResult({kind:'save',operationId:job.id,saveMode:'local-upload',
  state,code,destination,bytes:job.size,attemptedFilename:job.key.split('/').at(-1),
  localUpload:job,receipt,proofKind:receipt?'staging-byte-readback-and-final-r2-head':undefined},{onVerified:onVerifiedCurrent});
 void accountQueueReceipt(currentReceipt,row);
 return row;
}
function uploadReceipt(job,result){
 const receipt=result?.receipt;
 if(result?.state!=='completed'||result.completed!==1||receipt?.operationId!==job.id||
    receipt.size!==job.size||!receipt.etag||!receipt.version||typeof receipt.key!=='string')return null;
 const parent=job.key.slice(0,job.key.lastIndexOf('/')+1),leaf=job.key.slice(parent.length),dot=leaf.lastIndexOf('.');
 const alternate=parent+(dot>0?leaf.slice(0,dot):leaf)+'-'+job.id+(dot>0?leaf.slice(dot):'');
 if(receipt.key!==job.key&&(job.mode!=='files'||receipt.key!==alternate))return null;
 const expected=remoteDestination({...job.source,prefix:parent});
 const actual=receipt.destination;
 if(!actual||Object.keys(expected).some(field=>expected[field]!==actual[field]))return null;
 return receipt;
}
async function reconcileLocalUpload(job,claimKey){
 const saved=await current.readRemoteResult(job.id);
 if(saved?.state==='verified'&&saved.receipt){
  await releaseLocalUpload(claimKey,job.id);
  return saved.receipt;
 }
 if(saved&&['failed','blocked','cancelled'].includes(saved.state)){
  await releaseLocalUpload(claimKey,job.id);
  return null;
 }
 if(saved?.localUpload?.commitRequested===false){
  await recordLocalUpload(job,'failed','LOCAL_UPLOAD_RESELECT_REQUIRED');
  await releaseLocalUpload(claimKey,job.id);
  return null;
 }
 const result=await remote.inspectOperation(job.workerTarget,job.id);
 const receipt=uploadReceipt(job,result);
 if(receipt){
  await recordLocalUpload(job,'verified','LOCAL_UPLOAD_RECONCILED',receipt);
  await releaseLocalUpload(claimKey,job.id);
 }
 return receipt;
}
async function dispatchLocalUpload({ticket,batchId,index,source},batch,controller,onProgress){
 const {signal}=controller;
 if(!batch||batch.id!==batchId||targetKey(batch.target)!==targetKey(normalizeTarget(source))||
   !Number.isSafeInteger(index)||index!==batch.next||index>=maximumUploadFiles||!uploadId(ticket))
  throw uploadError('UPLOAD_BATCH_INVALID','Choose the local files again in the intended folder.');
 if(activeLocalUploads.size>=2)
  throw uploadError('RESOURCE_BUSY','Two local uploads are already running. Wait for one to finish.');
 activeLocalUploads.set(ticket,{controller,batchId});
 try{
  const staged=await takeLocalUpload(ticket), binding=staged?.binding;
  signal.throwIfAborted();
  if(!binding||binding.batchId!==batchId||binding.index!==index||targetKey(binding.source)!==targetKey(batch.target))
   throw uploadError('UPLOAD_FILE_UNAVAILABLE','Choose the local file again.');
  assertConnected();
  const auth=await oauth.authority();
  if(auth.sessionId!==batch.sessionId||!auth.accounts.some(account=>account.id===batch.target.accountId)||
    !uploadScopes.every(scope=>auth.scopes?.includes(scope)))
   throw uploadError('AUTH_SESSION_CHANGED','Cloudflare authorization changed. Reconnect and select the remaining files again.');
  signal.throwIfAborted();
  const key=localUploadKey(batch.target,staged.file,binding.relativePath,binding.mode);
  const parent=key.slice(0,key.lastIndexOf('/')+1),staging=batch.stagingPrefix+ticket+'/';
  const job={id:ticket,batchId,index,source:batch.target,key,mode:binding.mode,size:staged.file.size,commitRequested:false,
   workerTarget:fileOperationTarget({...batch.target,prefix:staging},{...batch.target,prefix:parent})};
  const claimKey=localUploadClaimKey(batch.target,key);
  const previous=await claimLocalUpload(claimKey,job);
  if(previous){
   const receipt=activeLocalUploads.has(previous.id)?null:await reconcileLocalUpload(previous,claimKey).catch(()=>null);
   return {state:'uncertain',error:receipt?
    'An earlier upload was verified. Review its saved object before selecting a replacement. This selection was not uploaded.':
    'An earlier upload to this path may have committed. Inspect the destination before retrying.'};
  }
  let outcome,recorded=false;
  try{
   await recordLocalUpload(job,'pending','LOCAL_UPLOAD_STARTED');
   recorded=true;
   batch.next++;
   const beforeCommit=async()=>{
    const checkpoint={...job,commitRequested:true};
    await recordLocalUpload(checkpoint,'pending','LOCAL_UPLOAD_VERIFY_COMMIT');
    job.commitRequested=true;
   };
   outcome=await fileApi.run('upload',{source:batch.target,file:staged.file,key,uploadMode:binding.mode,
    localBinding:{...batch,beforeCommit}},{signal,onProgress,operationId:ticket});
   const receipt=uploadReceipt(job,outcome.data);
   if(receipt){
    await recordLocalUpload(job,'verified','LOCAL_UPLOAD_VERIFIED',receipt);
    await releaseLocalUpload(claimKey,ticket);
    return {state:'completed',key:receipt.key};
   }
   const conflict=['FILE_CONFLICT','FILES_SKIPPED'].includes(outcome.data?.code);
   const state=conflict?'failed':!job.commitRequested?(signal.aborted?'cancelled':'failed'):
    ['uncertain','partial','completed','cancelled'].includes(outcome.state)?'uncertain':'failed';
   const code=uploadCode(outcome.code??outcome.data?.code,state==='cancelled'?'LOCAL_UPLOAD_CANCELLED':'LOCAL_UPLOAD_'+state.toUpperCase());
   await recordLocalUpload(job,state,code);
   if(state!=='uncertain')await releaseLocalUpload(claimKey,ticket);
   return {state,code,continue:conflict,error:conflict?'An existing Cloudflare object was left untouched.':
    state==='cancelled'?'Upload cancelled.':outcome.error??(state==='uncertain'?'Cloudflare did not confirm the committed object. Inspect the destination before retrying.':undefined)};
  }catch(error){
   if(!recorded){await releaseLocalUpload(claimKey,ticket).catch(()=>{});throw error;}
   return {state:'uncertain',error:'Cloudflare upload accounting was interrupted. Inspect the destination before retrying.'};
  }
 }finally{activeLocalUploads.delete(ticket);}
}
chrome.runtime.onConnect?.addListener(port=>{
 if(port.name!==localUploadPort)return;
 if(!appSenderDecision(chrome.runtime,port.sender).accepted){port.disconnect();return;}
 let active,batch;
 port.onDisconnect.addListener(()=>active?.abort());
 port.onMessage.addListener(message=>{
  if(message?.ping===true)return;
  if(message?.cancel===true){active?.abort();return;}
  if(!uploadId(message?.requestId))return;
  const reply=value=>{try{port.postMessage({requestId:message.requestId,...value});}catch{/* Shelf closed. */}};
  if(active){reply({state:'blocked',code:'RESOURCE_BUSY'});return;}
  const controller=new AbortController(),{signal}=controller;
  active=controller;
  void (async()=>{
   await trustedStorage();
   if(message.check===true||message.begin===true&&uploadId(message.batchId)&&!batch){
    const checked=await checkUploadDestination(message.source,signal);
    if(message.begin===true)batch={...checked,id:message.batchId,next:0};
    return {state:'completed'};
   }
   return dispatchLocalUpload(message,batch,controller,progress=>reply({progress}));
  })().then(result=>{
   active=undefined;
   reply(result);
  },error=>{
   active=undefined;
   const code=uploadCode(error.code,'LOCAL_UPLOAD_UNAVAILABLE');
   reply({state:signal.aborted?'cancelled':'blocked',code,retryable:message.check===true&&
    (uploadReadTransient.has(code)||error instanceof TypeError),error:signal.aborted?'Upload cancelled.':error.message});
  });
 });
});
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(sender?.id===chrome.runtime.id&&sender.url===chrome.runtime.getURL('extension/mirror.html')){debugHost.request(message,sender).then(respond,()=>respond({state:'failed',code:'DEBUG_REQUEST_FAILED'}));return true;}
  if(message?.channel===BASIC_CHANNEL){
    basic.request(message,sender).then(respond,()=>respond({
      ok:false,error:{code:'BASIC_HOST_FAILED',message:'The provider service could not respond. Reopen the Shelf and try again.'},
    }));
    return true;
  }
  if(message?.channel==='shelf-breadcrumb'){
    if(appSenderDecision(chrome.runtime,sender).accepted){
      if(message.event==='started')lifecycle('OBSERVATION_SHELF_STARTED','ok');
      if(message.event==='exception')lifecycle('OBSERVATION_SHELF_EXCEPTION');
      if(message.event==='divider-write-failed')lifecycle('OBSERVATION_DIVIDER_WRITE_FAILED');
    }
    return false;
  }
  if(message?.channel==='verified-local-download'){
    if(!appSenderDecision(chrome.runtime,sender).accepted){respond({accepted:false});return false;}
    dailyBadge.recordLocal(message.jobId,message.files).then(()=>respond({accepted:true}),()=>respond({accepted:false}));
    return true;
  }
  if(message?.channel==='queue-control'){
    if(!appSenderDecision(chrome.runtime,sender).accepted){respond({ok:false});return false;}
    const {action,recordId}=message;
    const run=async()=>{
      if(action==='cancel-all'){
        const localJobs=[...activeLocalUploads.values()].map(job=>{job.controller.abort();return {state:'cancellation-requested'};});
        const remoteJobs=remote.cancelActive();
        const basicJobs=basic.cancelAll();
        const known=new Set(remoteJobs.map(job=>job.id));
        const retained=await queueHistory.activeJobs(Date.now()-120_000);
        // A previous extension worker may have stopped while its remote save was running.
        const unfinished=retained.filter(job=>job.sourceApi==='r2'&&job.saveMode!=='local-upload'&&!known.has(job.sourceRecordId));
        const interrupted=await Promise.allSettled(unfinished.map(job=>{
          const {account,connection,bucket,folder}=job.destination;
          return remote.cancel({provider:'cloudflare',accountId:account,connectionId:connection,bucketName:bucket,prefix:folder??''},job.sourceRecordId);
        }));
        return {results:[...localJobs,...remoteJobs,...await basicJobs,...interrupted.map(result=>result.value??{state:'unsupported'})]};
      }
      if(action==='clear')return queueHistory.clearJobs();
      if(!['cancel','retry','dismiss','reconcile-upload'].includes(action)||typeof recordId!=='string'||recordId.length>2200)
        throw Error('QUEUE_INVALID_REQUEST');
      const job=await queueHistory.job(recordId);
      if(!job||job.acknowledged)throw Error('QUEUE_JOB_UNAVAILABLE');
      if(action==='dismiss')return queueHistory.acknowledge(recordId);
      if(action==='reconcile-upload'){
        if(job.saveMode!=='local-upload'||activeLocalUploads.has(job.sourceRecordId))throw Error('QUEUE_RECONCILIATION_UNAVAILABLE');
        const stored=await current.readRemoteResult(job.sourceRecordId);
        if(!stored?.localUpload)throw Error('QUEUE_RECONCILIATION_UNAVAILABLE');
        const upload=stored.localUpload;
        const receipt=await reconcileLocalUpload(upload,localUploadClaimKey(upload.source,upload.key));
        return {state:receipt?'verified':'uncertain'};
      }
      if(action==='retry'){
        if(!job.terminal||!['cancelled','failed'].includes(job.status)||job.retryExpiresAt<=Date.now())
          throw Error('QUEUE_RETRY_UNAVAILABLE');
        if(job.kind==='screenshot'&&job.recoverable&&job.retryExpiresAt>Date.now())
          return screenshotHost().request('retry',{operationId:job.sourceRecordId});
        if(job.sourceApi?.startsWith('basic:')&&job.retryable&&job.retryExpiresAt>Date.now())
          return basic.retry(job.provider,job.sourceRecordId);
        throw Error('QUEUE_RETRY_UNAVAILABLE');
      }
      if(job.terminal||!job.cancellable)throw Error('QUEUE_CANCELLATION_UNAVAILABLE');
      if(job.sourceApi?.startsWith('basic:'))return basic.cancel(job.provider,job.sourceRecordId);
      const local=activeLocalUploads.get(job.sourceRecordId);
      if(local){local.controller.abort();return {state:'cancellation-requested'};}
      if(job.saveMode==='local-upload')throw Error('QUEUE_CANCELLATION_UNAVAILABLE');
      if(job.sourceApi==='r2'&&job.destination){
        const {account,connection,bucket,folder}=job.destination;
        const target={provider:'cloudflare',connectionId:connection,accountId:account,bucketName:bucket,prefix:folder??''};
        return remote.cancel(target,job.sourceRecordId);
      }
      throw Error('QUEUE_CANCELLATION_UNAVAILABLE');
    };
    run().then(data=>{
      void chrome.runtime.sendMessage({channel:'queue-history-changed'}).catch(()=>{});
      respond({ok:true,data});
    },error=>respond({ok:false,code:error.code??error.message}));
    return true;
  }
  if(message?.channel==='queue-history-scan'){
    if(!appSenderDecision(chrome.runtime,sender).accepted){respond({ok:false});return false;}
    const {source,cursor}=message;
    const validBasic=source==='basic'&&(cursor==null||typeof cursor==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(cursor));
    const validCurrent=source==='current'&&(cursor==null||typeof cursor==='object'&&
      (typeof cursor.key==='string'&&cursor.key.startsWith('remote-result:')&&cursor.key.length<1024||
      Number.isSafeInteger(cursor.legacyOffset)&&cursor.legacyOffset>=0));
    if(!validBasic&&!validCurrent){respond({ok:false});return false;}
    const scan=validBasic?basic.historySource(cursor):current.readQueueHistorySource(cursor??{});
    scan.then(({rows,next})=>{
      let malformed=0;
      const records=rows.flatMap(row=>{
        try{
          if(validBasic)return basicReceipt(row);
          const interrupted=(row.kind==='screenshot-to-cloud'?!row.screenshot?.finishedAt:row.state==='pending')&&
            !observedQueueOperations.has(row.operationId);
          return currentReceipt(row,{interrupted});
        }catch{malformed++;return [];}
      });
      respond({ok:true,records,next,malformed});
    },()=>respond({ok:false}));
    return true;
  }
  if(message?.channel==='shelf-history'){
    if(!appSenderDecision(chrome.runtime,sender).accepted){respond(null);return false;}
    shelfHistory.request(message.method,message.windowId,message.view,sender,message.sequence).then(respond,()=>respond(null));
    return true;
  }
  if(message?.channel==='screenshot'){
    if(!appSenderDecision(chrome.runtime,sender).accepted){respond({state:'blocked',code:'UNTRUSTED_APP_SENDER'});return false;}
    Promise.resolve().then(()=>screenshotHost().request(message.method,message.params)).then(data=>respond({state:'completed',data}),error=>
     respond({state:'failed',code:/^[A-Z][A-Z0-9_]{1,79}$/.test(error?.code??'')?error.code:'SCREENSHOT_REQUEST_FAILED',
      ...(Number.isSafeInteger(error?.httpStatus)?{httpStatus:error.httpStatus}:{}),...(error?.providerCodes?{providerCodes:error.providerCodes}:{})}));
    return true;
  }
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
chrome.alarms.onAlarm.addListener(alarm=>{
 if(alarm.name===QUEUE_CLEANUP_ALARM)void Promise.all([queueHistory.maintainJobs(),basic.expirePending()]).then(()=>
  chrome.runtime.sendMessage({channel:'queue-history-changed'})).catch(()=>{});
 if(alarm.name===HISTORY_CLEANUP_ALARM)void queueHistory.maintain().catch(()=>{
  void chrome.runtime.sendMessage({channel:'queue-history-accounting-pending'}).catch(()=>{});
 });
});
async function scheduleQueueCleanup(){
 const policy=await queueHistory.queuePolicy();
 if(policy.normalMinutes===null&&policy.keepErrors)return chrome.alarms.clear(QUEUE_CLEANUP_ALARM);
 if(!await chrome.alarms.get(QUEUE_CLEANUP_ALARM))
  await chrome.alarms.create(QUEUE_CLEANUP_ALARM,{periodInMinutes:1});
}
void scheduleQueueCleanup().catch(()=>{});
chrome.runtime.onStartup.addListener(()=>{
 void queueHistory.policy().then(policy=>{
  if(policy.deleteSince)return chrome.alarms.create(HISTORY_CLEANUP_ALARM,{periodInMinutes:1});
 }).catch(()=>{});
});
chrome.alarms.onAlarm.addListener(a=>{if(a.name==='whole-cloud')void (async()=>{try{await screenshotHost().prune();}catch{lifecycle('OBSERVATION_WORKER_EXCEPTION');}try{for(const i of await wholeCloud.list())try{await wholeCloud.tick(i);}catch{}}catch{}const policy=(await current.read()).product.recovery;for(const b of policy.buckets.filter(b=>b.enabled))try{await recoveryCrawl.tick(b,{cadence:policy.cadence});}catch{}})().catch(()=>{});});
// Fresh validation on every state-dependent request; failures do not poison auth
// or future read attempts. Never reinterpret an established missing CURRENT as empty.
async function readCurrent(context){await trustedStorage();const saved=await current.read(context),prior=(await chrome.storage.local.get('nativeRegistration')).nativeRegistration;if(prior?.desired?.generation>0&&saved.generation.desired===0)throw Object.assign(Error(),{code:'CONFIGURATION_RECORD_MISSING',origin:'BACKGROUND_NATIVE_FENCE',subreason:'NATIVE_GENERATION_WITH_ZERO_CURRENT'});attentionPreference=saved.product.autoOpenAttention;return saved;}
let nativeAttempt, nextNativeReason;
function startNative(reason){
 const operationId=operationIdentity();
 diagnostics.emit({stage:'chrome.recovery',outcome:'started',code:reason,operationId});
 const attempt=api.reconcile({refreshDepthReadiness:false,lifecycle:true});
 nativeAttempt=attempt;
 void attempt.then(result=>diagnostics.emit({stage:'chrome.recovery',outcome:result.state==='completed'?'ok':result.state,code:result.code,operationId}),
  ()=>diagnostics.emit({stage:'chrome.recovery',outcome:'failed',code:'NATIVE_RECONCILE_UNAVAILABLE',operationId})).finally(()=>{
  nativeAttempt=null;
  if(nextNativeReason){const next=nextNativeReason;nextNativeReason=null;startNative(next);}
 });
 return attempt;
}
function scheduleNative(reason){
 if(!nativeAttempt)return startNative(reason);
 if(reason==='NATIVE_LOGIN'||reason==='NATIVE_DISCONNECT')nextNativeReason=reason;
 return nativeAttempt;
}
async function nativeReady(){
 const state=await readCurrent(),e=registrar.inspect();
 if(!e.pending&&e.acknowledgedGeneration===state.generation.desired&&e.acknowledgedGeneration!==null&&engine.matchesCurrent(e.desired,state))return e.lastOutcome;
 return scheduleNative('NATIVE_CLICK');
}
for(const event of [chrome.runtime.onInstalled,chrome.runtime.onStartup])event?.addListener(details=>{
 scheduleNative('NATIVE_STARTUP');void dailyBadge.refresh();
 if(details?.reason==='install')void chrome.storage.local.set({[screenshotShortcutSetupKey]:true}).catch(()=>{});
});
scheduleNative('NATIVE_ACTIVATION');
// Developer/native-companion integration only. No website, content-script,
// external-message or localhost path can issue grants or use this interface.
Object.defineProperty(globalThis,'click2cloud',{value:Object.freeze({api,gateway,engine,current,registrar,get ready(){return readCurrent().then(()=>({state:'completed',code:'LOCAL_STATE_READY'}));},
  grantAgent(g){const handle=gateway.grant(g);permissions.issue(g);return handle;},
  revokeAgent:actor=>permissions.revoke(actor),
  approveAgent:(actor,method,params)=>permissions.approve(actor,method,params)
})});
void chrome.alarms.create('whole-cloud',{periodInMinutes:1});
void dailyBadge.refresh();
