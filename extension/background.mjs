import {trustedAppSender} from '../src/chrome/trusted-sender.mjs';
import {sourceFromClick} from '../right2cloud-module/src/index.mjs';
import {createChromeRegistrar} from '../src/chrome/registrar.mjs';
import {createCurrentStore} from '../src/persistence/current-store.mjs';
import {createEngine} from '../src/core/engine.mjs';
import {createEngineApi} from '../src/api/service.mjs';
import {createPermissions} from '../src/api/permissions.mjs';
import {createAgentGateway} from '../src/api/gateway.mjs';
import {createCloudflareOAuth} from '../src/auth/cloudflare-oauth.mjs';
import {createClick2CloudFileApi} from '../src/explorer/index.mjs';
import {createExternalRecovery,directoryFiles,copyRecoveryDirectory} from '../src/persistence/external-recovery.mjs';
import {createRecoveryCrawl} from '../src/persistence/recovery-crawl.mjs';
import {createWholeCloudJobs} from '../src/api/whole-cloud.mjs';
import {createDiagnostics} from '../src/glaciaring/index.mjs';
import {createAgentDebugApi} from '../src/glaciaring/agent-api.mjs';
import {createDebugHost} from '../src/chrome/debug-host.mjs';
import {createProvisioner} from '../src/cloudflare/deployment.mjs';
import {createRemoteTransport} from '../src/cloudflare/transport.mjs';
import {createCloudflareOnboarding} from '../src/cloudflare/onboarding.mjs';
import {SOURCE_HOSTS} from '../src/cloudflare/deployment.mjs';
import {scopeKey,targetKey,normalizeTarget} from '../src/core/menu-identity.mjs';
const storageReady=Promise.all(['local','session'].map(k=>chrome.storage[k].setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'})));
const diagnostics=createDiagnostics(),current=createCurrentStore({sink:diagnostics});
const oauth=createCloudflareOAuth({chrome});
let inventory={revision:0,scopes:[]},engine,revoking=false;
const provisioner=createProvisioner({request:oauth.request,readModule:async path=>{const r=await fetch(chrome.runtime.getURL(path));if(!r.ok)throw Error('WORKER_MODULE_UNAVAILABLE');return r.text();},load:async key=>(await chrome.storage.local.get('remoteTransport:'+key))['remoteTransport:'+key],store:(key,value)=>chrome.storage.local.set({['remoteTransport:'+key]:value})});
const remote=createRemoteTransport({oauth,lookup:provisioner.lookup,verifyAuthority:async(t,a)=>{if(revoking||!a.scopes?.includes('workers-r2.write')||!a.scopes?.includes('workers-r2.read'))return false;const r=await oauth.request('/accounts/'+encodeURIComponent(t.accountId)+'/r2/buckets/'+encodeURIComponent(t.bucketName));const b=await r.json();return r.ok&&b.success===true;},authorizeSource:async s=>{try{const u=new URL(s.url);return u.protocol==='https:'&&SOURCE_HOSTS.includes(u.hostname)&&!u.username&&!u.password&&!s.bytes;}catch{return false;}}});
const snapshots=new Map();
async function remoteReady(target){const a=await oauth.status();if(a.state!=='CONNECTED'||!a.accounts.some(x=>x.id===target.accountId))return false;const k=targetKey(target),snapshot=snapshots.get(k);if(snapshot&&Date.now()-snapshot.at<10000)return snapshot.ready;const r=await remote.status(target);snapshots.set(k,{at:Date.now(),ready:r.state==='READY'});return r.state==='READY';}
const cloudflare=createCloudflareOnboarding({current,oauth,provisioner:{...provisioner,markVerified:async t=>{await provisioner.markVerified(t);snapshots.clear();}},transport:remote,readRequestedTarget:async()=>(await chrome.storage.session.get('cloudflareRepairTarget')).cloudflareRepairTarget,openShelf:async(provider,target)=>{if(target)await chrome.storage.session.set({cloudflareRepairTarget:target});else await chrome.storage.session.remove('cloudflareRepairTarget');return chrome.tabs.create({url:chrome.runtime.getURL('extension/app.html')+(provider?'#provider='+encodeURIComponent(provider):'#cloudflare')});},openActivation:url=>chrome.tabs.create({url}),record:result=>current.recordRemoteResult(result),history:()=>current.readRemoteResults()});

async function send(message) {
  let path,field;
  if(message.type==='cfAccounts'){path='/accounts?per_page=50';field='accounts';}
  else if(message.type==='cfBuckets'){
    const status=await oauth.status();if(!status.accounts?.some(a=>a.id===message.accountId))throw Error('SCOPE_UNAUTHORIZED');
    path='/accounts/'+encodeURIComponent(message.accountId)+'/r2/buckets?per_page=1000'+(message.cursor?'&cursor='+encodeURIComponent(message.cursor):'');field='buckets';
  } else throw Object.assign(Error('AUTHORIZED_WORKER_TRANSPORT_UNAVAILABLE'),{code:'AUTHORIZED_WORKER_TRANSPORT_UNAVAILABLE'});
  const response=await oauth.request(path),body=await response.json();
  if(!response.ok||body.success!==true)throw Object.assign(Error('PROVIDER_READ_FAILED'),{code:'PROVIDER_READ_FAILED'});
  if((body.result_info?.total_pages??1)>1&&!body.result_info?.cursor)throw Error('PROVIDER_PAGINATION_UNAVAILABLE');
  return {ok:true,[field]:field==='buckets'?body.result.buckets.map(b=>({name:b.name})):body.result.map(a=>({id:a.id,name:a.name})),cursor:body.result?.cursor??body.result_info?.cursor??''};
}
const baseFileApi=createClick2CloudFileApi({send,http:{request:oauth.request,boundedFetch:fetch}});
const fileApi=Object.freeze({...baseFileApi,async run(operation,input={},options={}) {
  // Unconfigured Worker transport is blocked before staging any object bytes.
  if(!['accounts','buckets','list','listRaw','stat','preview','readStream'].includes(operation))return {state:'blocked',code:'AUTHORIZED_WORKER_TRANSPORT_UNAVAILABLE'};
  const result=await baseFileApi.run(operation,input,options);
  if(operation==='list'&&result.state==='completed') {
    const t=normalizeTarget({provider:'cloudflare',connectionId:'cloudflare:'+input.source.accountId,...input.source,prefix:''});
    let s=inventory.scopes.find(x=>scopeKey(x.target)===scopeKey(t));
    if(!s){s={target:t,authorized:true,workerReady:false,folders:[],complete:false};inventory.scopes.push(s);}
    for(const p of [input.source.prefix,...result.data.entries.filter(e=>e.folder).map(e=>e.key)])if(!s.folders.includes(p))s.folders.push(p);
    inventory.revision++;await chrome.storage.local.set({discoveredInventory:inventory});
  }
  return result;
}});
async function getInventory() {
  const status=await oauth.status();
  const policy=(await current.read()).product.recovery;
  for(const b of policy.buckets.filter(b=>b.enabled))try{const index=await recoveryCrawl.inspect(b.target);let scope=inventory.scopes.find(s=>scopeKey(s.target)===scopeKey(b.target));if(!scope){scope={target:{...b.target,prefix:''},folders:[],complete:false};inventory.scopes.push(scope);}scope.folders=[...new Set([...scope.folders,...index.folders])];}catch{}
  const state=await current.read(),savedTargets=[state.product.defaultTarget,...Object.values(state.configs).flatMap(c=>(c.destinations??c.scopes??[]).map(d=>d.target))].filter(Boolean);
  for(const saved of savedTargets){let found=inventory.scopes.find(s=>scopeKey(s.target)===scopeKey(saved));if(!found){found={target:{...saved,prefix:''},folders:[],complete:false};inventory.scopes.push(found);}if(!found.folders.includes(saved.prefix))found.folders.push(saved.prefix);}
  return {...inventory,scopes:await Promise.all(inventory.scopes.map(async s=>({...s,authorized:status.state==='CONNECTED'&&status.accounts.some(a=>a.id===s.target.accountId),workerReady:await remoteReady(s.target)})))};
}
const getAuthorization=async()=>{
  if(revoking)return null;
  try{const a=await oauth.authority(),state=await current.read(),inv=await getInventory();
    const targets=[...(registrar.inspect().desired?.rows??[]).filter(r=>r.role==='save').map(r=>({target:r.target})),...state.configs.simple.destinations,...state.configs.nested.destinations].map(d=>d.target).concat(state.product.defaultTarget?[state.product.defaultTarget]:[]);
    return {sessionId:a.sessionId,authorizedTargets:targets.filter(t=>inv.scopes.some(s=>scopeKey(s.target)===scopeKey(t)&&s.authorized&&s.workerReady))};
  }catch{return null;}
};
const registrar=createChromeRegistrar({chrome,sink:diagnostics,persist:state=>chrome.storage.local.set({nativeRegistration:state}),getAuthorization,
  dispatch:async(action,{info})=>{
    if(action.reconnectOnly)return cloudflare.invoke({provider:'cloudflare',requestedTarget:action.target,setupOnly:true});
    let source;try{source=sourceFromClick(info);}catch(error){if(!action.providerAction)return {state:'blocked',code:error.code??'SOURCE_INVALID'};}
    return engine.save({itemId:String(info.menuItemId),generation:registrar.inspect().acknowledgedGeneration,context:info.srcUrl?'image':'link',source});
  },onOutcome:result=>{void chrome.storage.local.set({lastSave:{state:result.state,code:result.code??'OK'}});void chrome.action.setBadgeText({text:result.state==='completed'?'':'!'});}
});
engine=createEngine({current,registrar,fileApi,providerSetupActions:true,providers:{},getAuthorization,diagnostics,
  remoteSave:async input=>{if(revoking)return {state:'blocked',code:'DISCONNECTING'};const out=await remote.save(input);try{await current.recordRemoteResult(out);}catch{return {...out,completionPending:true};}return out;},onProviderAction:input=>revoking?{state:'blocked',code:'DISCONNECTING'}:cloudflare.invoke(input),
  authorizeSource:async s=>{if(s.bytes instanceof Uint8Array)return true;try{const u=new URL(s.url);return ['https:','http:'].includes(u.protocol)&&await chrome.permissions.contains({origins:[u.origin+'/*']});}catch{return false;}},fetchSource:fetch});
async function external(){const h=await current.readBackupRoot();if(!h||await h.queryPermission({mode:'readwrite'})!=='granted')throw Error('EXTERNAL_RECOVERY_UNAVAILABLE');return createExternalRecovery({files:directoryFiles(h)});}
const recovery={choose:async()=>{
  const candidate=await current.readBackupCandidate();if(!candidate||await candidate.queryPermission({mode:'readwrite'})!=='granted')throw Error('EXTERNAL_RECOVERY_UNAVAILABLE');
  const previous=await current.readBackupRoot();
  if(previous&&await previous.queryPermission({mode:'readwrite'})!=='granted')throw Error('PREVIOUS_BACKUP_PERMISSION_REQUIRED');
  if(previous&&!await previous.isSameEntry(candidate))await copyRecoveryDirectory(previous,candidate);
  const test=createExternalRecovery({files:directoryFiles(candidate)});await test.writeNamespace('recovery-root-check',{schemaVersion:1,verified:true});
  await current.setBackupRoot(candidate);return {state:'VERIFIED',evidenceClass:'external-filesystem-readback'};
},status:async()=>{try{await external();return {state:'AVAILABLE',evidence:'user-authorized-directory',windowsKnownFolder:'BLOCKED_NATIVE_COMPANION_REQUIRED'};}catch{return {state:'BLOCKED',code:'EXTERNAL_RECOVERY_UNAVAILABLE',windowsKnownFolder:'BLOCKED_NATIVE_COMPANION_REQUIRED'};}},...Object.fromEntries(['readNamespace','writeNamespace','readVerified','writeVerified','exportVerified'].map(m=>[m,async(...args)=>(await external())[m](...args)]))};
const cloudJobs=createWholeCloudJobs({recovery,fileApi,isAuthorized:async i=>{const stopped=(await chrome.storage.local.get('outlineStoppedAccounts')).outlineStoppedAccounts??[];if(stopped.includes(i.accountId))return false;const s=await oauth.status();return i.provider==='cloudflare'&&i.connectionId==='cloudflare:'+i.accountId&&s.state==='CONNECTED'&&s.accounts.some(a=>a.id===i.accountId);}});
const wholeCloud={...cloudJobs,enable:async(i,options)=>{const result=await cloudJobs.enable(i,options);const stopped=(await chrome.storage.local.get('outlineStoppedAccounts')).outlineStoppedAccounts??[];await chrome.storage.local.set({outlineStoppedAccounts:stopped.filter(a=>a!==i.accountId)});return result;}};
const oauthForApi={...oauth,disconnect:async()=>{
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
  }finally{revoking=false;}
}};
const recoveryCrawl=createRecoveryCrawl({fileApi,recovery,isAuthorized:async t=>{const s=await oauth.status();return s.state==='CONNECTED'&&s.accounts.some(a=>a.id===t.accountId)&&t.connectionId==='cloudflare:'+t.accountId;}});
const permissions=createPermissions();
const api=createEngineApi({engine,current,fileApi,cloudflare,oauth:oauthForApi,recovery,wholeCloud,recoveryCrawl,getInventory,
  authorize:r=>r.actor==='gui'||permissions.authorize(r),confirm:r=>r.actor==='gui'||permissions.confirm(r)});
const gateway=createAgentGateway({api});
const debugApi=createAgentDebugApi({diagnostics,getMenu:g=>engine.getMenu(g??registrar.inspect().desired?.generation),getEvidence:engine.getEvidence,authorize:(_r,c)=>c?.grant??false});
const debugHost=createDebugHost({runtime:chrome.runtime,api:debugApi,getMenu:g=>engine.getMenu(g??registrar.inspect().desired?.generation),getEvidence:engine.getEvidence});
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(sender.id===chrome.runtime.id&&sender.url===chrome.runtime.getURL('extension/mirror.html')){debugHost.request(message,sender).then(respond,()=>respond({state:'failed',code:'DEBUG_REQUEST_FAILED'}));return true;}
  if(!trustedAppSender(chrome.runtime,sender))return false;
  if(message?.channel!=='engine')return false;
  ready.then(()=>api.invoke({version:message.version,method:message.method,params:message.params},'gui')).then(respond,()=>respond({state:'failed',code:'ENGINE_UNAVAILABLE'}));return true;
});
chrome.action.onClicked.addListener(()=>chrome.tabs.create({url:chrome.runtime.getURL('extension/app.html')}));
chrome.alarms.onAlarm.addListener(a=>{if(a.name==='whole-cloud')void (async()=>{try{for(const i of await wholeCloud.list())try{await wholeCloud.tick(i);}catch{}}catch{}const policy=(await current.read()).product.recovery;for(const b of policy.buckets.filter(b=>b.enabled))try{await recoveryCrawl.tick(b,{cadence:policy.cadence});}catch{}})().catch(()=>{});});
const ready=(async()=>{await storageReady;inventory=(await chrome.storage.local.get('discoveredInventory')).discoveredInventory??inventory;return api.reconcile();})();
// Developer/native-companion integration only: no externally_connectable manifest,
// external messages, content scripts, localhost server, or client-issued grants.
Object.defineProperty(globalThis,'click2cloud',{value:Object.freeze({api,gateway,engine,current,registrar,ready,
  grantAgent(g){const handle=gateway.grant(g);permissions.issue(g);return handle;},
  revokeAgent:actor=>permissions.revoke(actor),
  approveAgent:(actor,method,params)=>permissions.approve(actor,method,params)
})});
void chrome.alarms.create('whole-cloud',{periodInMinutes:1});
