import {createPermissions} from '../src/api/permissions.mjs';
import {createExternalRecovery,directoryFiles} from '../src/persistence/external-recovery.mjs';
import {createWholeCloudJobs} from '../src/api/whole-cloud.mjs';
import {createChromeRegistrar} from '../src/chrome/registrar.mjs';
import {createEngine} from '../src/core/engine.mjs';
import {createCurrentStore} from '../src/persistence/current-store.mjs';
import {createEngineApi} from '../src/api/service.mjs';
import {createAgentGateway} from '../src/api/gateway.mjs';
import {createDiagnostics} from '../src/glaciaring/index.mjs';
import {createAgentDebugApi} from '../src/glaciaring/agent-api.mjs';
import {createDebugHost} from '../src/chrome/debug-host.mjs';
import {createCloudflareOAuth} from '../src/auth/cloudflare-oauth.mjs';
import {createClick2CloudFileApi} from '../src/explorer/index.mjs';
import {createFileApiSaveProvider} from '../src/explorer/save-provider.mjs';

const storageReady=Promise.all([chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}),chrome.storage.session.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'})]);
const diagnostics=createDiagnostics(),current=createCurrentStore({sink:diagnostics});
const oauth=createCloudflareOAuth({chrome,onConnected:async()=>{await api.invoke({version:1,method:'reconcileNativeMenu'},'gui');}});
const http={request:oauth.request,boundedFetch:(url,options)=>fetch(url,options)};
const send=async message=>{
  let path,field;
  if(message.type==='cfAccounts'){path='/accounts?per_page=50';field='accounts';}
  else if(message.type==='cfBuckets'){path='/accounts/'+encodeURIComponent(message.accountId)+'/r2/buckets?per_page=1000'+(message.cursor?'&cursor='+encodeURIComponent(message.cursor):'');field='buckets';}
  else throw Object.assign(Error('AUTHORIZED_WORKER_TRANSPORT_UNAVAILABLE'),{code:'AUTHORIZED_WORKER_TRANSPORT_UNAVAILABLE'});
  const response=await oauth.request(path);const body=await response.json();if(!response.ok||body.success!==true)throw Error('PROVIDER_READ_FAILED');
  const cursor=body.result?.cursor??body.result_info?.cursor??'';const truncated=body.result?.truncated??body.result_info?.is_truncated;
  if((truncated&&!cursor)||(body.result_info?.total_pages??1)>1&&!cursor)throw Object.assign(Error('PROVIDER_PAGINATION_UNAVAILABLE'),{code:'PROVIDER_PAGINATION_UNAVAILABLE'});
  return {ok:true,[field]:field==='buckets'?body.result.buckets.map(b=>({name:b.name})):body.result.map(a=>({id:a.id,name:a.name})),cursor};
};
const fileApi=createClick2CloudFileApi({send,http});
let inventory={revision:0,scopes:[]};
const getAuthorization=async()=>{const s=await oauth.status();return s.state==='AUTHORIZED'?{sessionId:s.sessionId,authorizedTargets:inventory.scopes.filter(s=>s.authorized&&s.workerReady).map(s=>s.target)}:null;};
const provider=createFileApiSaveProvider({fileApi,resolveDestination:async intent=>{
  const scope=inventory.scopes.find(s=>s.target.accountId===intent.accountId&&s.target.bucketName===intent.bucket&&s.target.connectionId===intent.connectionId&&s.workerReady&&s.authorized);
  if(!scope)throw Error('AUTHORIZED_WORKER_TRANSPORT_UNAVAILABLE');return {...scope.target,prefix:intent.path};
}});
let engine;
const registrar=createChromeRegistrar({chrome,sink:diagnostics,persist:value=>chrome.storage.local.set({nativeRegistration:value}),getAuthorization,
  dispatch:(action,{info})=>{
    const url=info.srcUrl??info.linkUrl;let filename='download';try{filename=decodeURIComponent(new URL(url).pathname.split('/').pop())||filename;}catch{}
    return engine.save({itemId:String(info.menuItemId),generation:registrar.inspect().acknowledgedGeneration,context:info.srcUrl?'image':'link',source:{url,filename}});
  },onOutcome:async result=>{await chrome.storage.local.set({lastSave:{state:result?.state,code:result?.code??null}});}
});
engine=createEngine({current,registrar,providers:{cloudflare:provider},getAuthorization,diagnostics,fileApi,
  authorizeSource:async source=>{try{const u=new URL(source.url);return ['https:','http:'].includes(u.protocol)&&await chrome.permissions.contains({origins:[u.origin+'/*']});}catch{return false;}},fetchSource:fetch});
async function external() {
  const handle=await current.readBackupRoot();
  if(!handle||await handle.queryPermission({mode:'readwrite'})!=='granted')throw Object.assign(Error('EXTERNAL_RECOVERY_UNAVAILABLE'),{code:'EXTERNAL_RECOVERY_UNAVAILABLE'});
  return createExternalRecovery({files:directoryFiles(handle)});
}
const recovery=Object.freeze({status:async()=>{try{await external();return 'AVAILABLE';}catch{return 'BLOCKED';}},...Object.fromEntries(['readVerified','writeVerified','readNamespace','writeNamespace','exportVerified'].map(method=>[method,async(...args)=>(await external())[method](...args)]))});
const wholeCloud=createWholeCloudJobs({recovery,fileApi,isAuthorized:async identity=>{
  if(identity.provider!=='cloudflare'||identity.connectionId!=='cloudflare:'+identity.accountId)return false;
  const status=await oauth.status();if(status.state!=='AUTHORIZED')return false;
  try {const result=await fileApi.run('accounts');return result.state==='completed'&&result.data.accounts.some(a=>a.id===identity.accountId);}catch{return false;}
}});
const approvals=new Set(),permissions=createPermissions();
const api=createEngineApi({engine,current,fileApi,recovery,wholeCloud,getInventory:async()=>inventory,authorize:request=>request.actor==='gui'||permissions.authorize(request),confirm:request=>request.actor==='gui'?approvals.delete(request.previewId??JSON.stringify([request.method,request.params])):permissions.confirm(request)});
const gateway=createAgentGateway({api});
const debugApi=createAgentDebugApi({diagnostics,getMenu:g=>engine.getMenu(g??registrar.inspect().acknowledgedGeneration),getEvidence:engine.getEvidence,authorize:(_r,c)=>c?.grant??false});
const debugHost=createDebugHost({runtime:chrome.runtime,api:debugApi,getMenu:g=>engine.getMenu(g??registrar.inspect().desired?.generation),getEvidence:engine.getEvidence});
const trusted=sender=>sender.id===chrome.runtime.id&&sender.url===chrome.runtime.getURL('extension/app.html')&&!sender.tab?.url?.startsWith('http');
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(sender.id===chrome.runtime.id&&sender.url===chrome.runtime.getURL('extension/mirror.html')){debugHost.request(message,sender).then(respond,()=>respond({version:1,state:'failed',code:'DEBUG_REQUEST_FAILED'}));return true;}
  if(!trusted(sender))return false;
  (async()=>{
    await storageReady;
    if(message?.channel==='diagnostics')return debugHost.request(message,sender);
    if(message?.channel!=='engine')throw Error('INVALID_CHANNEL');
    if(message.method==='attachBackupFolder'){await external();await chrome.alarms.create('whole-cloud',{periodInMinutes:1});return {state:'EXTERNAL_FOLDER_AVAILABLE'};}
    if(message.method==='connectionStatus')return oauth.status();
    if(message.method==='connectCloudflare')return oauth.connect(message.params?.scopes);
    if(message.method==='disconnectCloudflare'){
      const jobs=await wholeCloud.list().catch(()=>[]);
      for(const identity of jobs)try{await wholeCloud.disable(identity);}catch{}
      await oauth.disconnect();return oauth.status();
    }
    if(message.method==='confirmJob') {approvals.add(JSON.stringify([message.params.method,message.params.params]));return {confirmed:true};}
    if(message.method==='confirmPreview') {if(typeof message.params?.previewId!=='string')throw Error('INVALID_PREVIEW');approvals.add(message.params.previewId);return {confirmed:true};}
    const result=await api.invoke({version:message.version,method:message.method,params:message.params},'gui');
    if(message.method==='enableWholeCloudJob') {
      const identities=(await chrome.storage.local.get('wholeCloudIdentities')).wholeCloudIdentities??[];
      if(!identities.some(i=>JSON.stringify(i)===JSON.stringify(message.params.identity)))identities.push(message.params.identity);
      await chrome.storage.local.set({wholeCloudIdentities:identities});await chrome.alarms.create('whole-cloud',{periodInMinutes:1});
    }
    if(message.method==='listFolders'&&result.state==='completed') {
      const source=message.params.source;const target={provider:'cloudflare',connectionId:'cloudflare:'+source.accountId,accountId:source.accountId,bucketName:source.bucketName,prefix:''};
      let scope=inventory.scopes.find(s=>JSON.stringify(s.target)===JSON.stringify(target));if(!scope){scope={target,authorized:true,workerReady:false,folders:[],complete:false};inventory.scopes.push(scope);}
      for(const entry of result.data.entries??[])if(entry.folder&&!scope.folders.includes(entry.key))scope.folders.push(entry.key);inventory.revision++;
    }
    return result;
  })().then(data=>respond({ok:true,data}),error=>respond({ok:false,code:/^[A-Z_]+$/.test(error.code??error.message)?error.code??error.message:'ENGINE_REQUEST_FAILED'}));return true;
});
chrome.alarms.onAlarm.addListener(alarm=>{
  if(alarm.name!=='whole-cloud')return;
  void (async()=>{const identities=await wholeCloud.list();for(const identity of identities)try{await wholeCloud.tick(identity);}catch{/* Settings exposes failures; background never prompts for auth. */}})();
});
chrome.action.onClicked.addListener(()=>chrome.tabs.create({url:chrome.runtime.getURL('extension/app.html')}));
// In-process trusted-host access; no external message or public localhost endpoint.
Object.defineProperty(globalThis,'click2cloud',{value:Object.freeze({api,gateway,engine,current,registrar,grantAgent:grant=>{permissions.issue(grant);return gateway.grant(grant);},approveAgent:approval=>permissions.approve(approval),revokeAgent:actor=>permissions.revoke(actor),ready:storageReady.then(()=>api.invoke({version:1,method:'reconcileNativeMenu'},'gui'))})});
