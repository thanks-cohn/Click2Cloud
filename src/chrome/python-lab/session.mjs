import {localUploadKey,uploadId,uploadError} from '../local-upload-plan.mjs';
import {uploadCode} from '../local-upload-service.mjs';
import {objectETag,key as objectKey,name} from '../../explorer/file-api.mjs';
import {normalizeTarget,normalizePrefix} from '../../core/menu-identity.mjs';
import {chunkBytes,decodeFrame,encodeFrame,labError,labSpoolDirectory,openLabSpool,utf8Length,validHash} from './spool.mjs';
import {boundedLabStep,createLabReport,describeLabFailure,diagnosticCode} from './diagnostics.mjs';

export const labChannel='redown-python-laboratory';
export const labHostName='com.click2cloud.redown_live_lab';
export const labProtocol='1.0.0';
export const extensionId='ajppphdiamdobknpamcheohmdbdbeoal';
export const limits=Object.freeze({
 maxFileBytes:8*1024**2,maxDiskBytes:8*1024**2,maxTrafficBytes:640*1024**2,
 maxFiles:250,maxProviderRequests:8192,maxOperations:1500,concurrency:1,
 uploadRequests:256,readRequests:8,statRequests:8,listRequests:1,
 uploadTrafficFactor:4,chunkBytes,maxTransferSeconds:90,maxRunSeconds:3600
});
export const unsupported=Object.freeze(['copy','move','rename','delete','mkdir','search','preview','publicUrl',
 'trueRemoteSave','parallelTransfers','failureInjection','providerJobReattach','preseedFromExternalNamespace']);
const budgetFields=['files','trafficBytes','diskBytes','providerRequests','operations','seconds'];
const maximums=[limits.maxFiles,limits.maxTrafficBytes,limits.maxDiskBytes,limits.maxProviderRequests,limits.maxOperations,limits.maxRunSeconds];
const readScopes=['workers-r2.read','workers-r2-bucket-item.read'];
const estimateStorage=()=>globalThis.navigator?.storage?.estimate?.();
const opfsAvailable=()=>typeof globalThis.navigator?.storage?.getDirectory==='function';
const probeOpfs=()=>globalThis.navigator.storage.getDirectory();
const scopeKey='pythonLabRecoveryScopesV1';
const diagnosticKey='pythonLabLastStartupV1';
const freshness=30*86400_000;
const available=data=>({apiVersion:labProtocol,state:'available',data});
const failure=code=>({apiVersion:labProtocol,state:'failed',error:{code}});
const typed=error=>diagnosticCode(error);

function nativeDisconnectCode(message){
 if(/^Specified native messaging host not found\.?$/i.test(message))return 'NATIVE_HOST_NOT_REGISTERED';
 if(/^Failed to start native messaging host\.?$/i.test(message))return 'NATIVE_HOST_LAUNCH_FAILED';
 if(/^Access to the specified native messaging host is forbidden\.?$/i.test(message))return 'NATIVE_HOST_FORBIDDEN';
 if(/^Native host has exited\.?$/i.test(message))return 'NATIVE_HOST_EXITED';
 return 'NATIVE_HOST_DISCONNECTED';
}

function token() {
 return Array.from(crypto.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join('');
}
function equal(left,right) {
 if(typeof left!=='string'||typeof right!=='string'||left.length!==right.length)return false;
 let mismatch=0;
 for(let i=0;i<left.length;i++)mismatch|=left.charCodeAt(i)^right.charCodeAt(i);
 return mismatch===0;
}
function requireKeys(input,keys) {
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==keys.length||
  !keys.every(key=>Object.hasOwn(input,key)))
  throw labError('INVALID_INPUT');
}
function validInt(value,min,max) {
 return Number.isSafeInteger(value)&&value>=min&&value<=max;
}
function leafPath(path) {
 if(typeof path!=='string'||!path||path.isWellFormed?.()===false||utf8Length(path)>1024||
  /[\x00-\x1f\x7f\\:]/.test(path)||
  path.split('/').some(part=>!part||part==='.redown-beta-uploads'||part==='.redown'||part==='.redown-python-lab'))
  throw labError('INVALID_OBJECT_PATH');
 try{for(const part of path.split('/'))name(part);}catch{throw labError('INVALID_OBJECT_PATH');}
 return path;
}
function identity(object,expected) {
 if(!object)return null;
 const size=Number(object.size);
 if(object.key!==expected||!validInt(size,0,Number.MAX_SAFE_INTEGER))throw labError('INVALID_PROVIDER_RESPONSE');
 return {key:expected,size,etag:objectETag(object.etag),
  version:typeof object.version==='string'?object.version.slice(0,256):null};
}
function cleanReceipt(receipt,key,size,id) {
 if(!receipt||receipt.key!==key||receipt.size!==size||receipt.operationId!==id||!receipt.etag||!receipt.version)
  throw labError('UPLOAD_RECEIPT_MISMATCH');
 return {key,size,operationId:id,etag:objectETag(receipt.etag),version:String(receipt.version).slice(0,256)};
}

export function createPythonLab({runtime,storage,diagnosticStorage,build,authority,buckets,checkBucket,workerPrefix,checkUpload,upload,
 trustedStorage=()=>{},permission,opfsCapability=opfsAvailable,opfsProbe=probeOpfs,fileApi,
 spoolDirectory=labSpoolDirectory,storageEstimate=estimateStorage,clock=Date.now,
 stageTimeoutMs=12_000,startupTimeoutMs=80_000,handshakeTimeoutMs=10_000}) {
 let grant=null,starting=null,preflighting=null,lastCode=null,draining=null,preparingSpool=null;
 let startupReport=null,preflightReport=null,discoveryReport=null,savedStartup=null,restoring=null,saving=Promise.resolve();
 const status=()=>grant?{
  state:grant.client?'CONNECTED':grant.ticket?'PAIRED':'PAIRING',
  ready:grant.ready,scopeId:grant.id,bucketName:grant.target.bucketName,prefix:grant.target.prefix,
  mode:grant.mode,expiresAt:grant.expiresAt,codeExpiresAt:grant.codeExpiresAt,
  pairCode:grant.pairCode,code:lastCode,nativeApiAvailable:typeof runtime.connectNative==='function'
 }:{state:starting?'STARTING':'OFF',code:lastCode,nativeApiAvailable:typeof runtime.connectNative==='function',
  ...(starting?{correlationId:starting.report.snapshot().correlationId}:{})};

 function saveStartup(){
  if(!startupReport||!diagnosticStorage)return;
  const report=startupReport.snapshot();
  saving=saving.then(()=>diagnosticStorage.set({[diagnosticKey]:report})).catch(()=>{});
 }
 async function previousStartup(){
  if(startupReport||!diagnosticStorage)return;
  await (restoring??=boundedLabStep(async()=>{
   await trustedStorage();
   return (await diagnosticStorage.get(diagnosticKey))[diagnosticKey];
  },null,1500).then(prior=>{
   if(startupReport||prior?.schema!=='redown.python-lab.diagnostics/1'||prior.build?.revision!==build.revision)return;
   savedStartup=prior;
   lastCode??=['CHECKING','READY_TO_PAIR','PAIRED','CLI_IDLE'].includes(prior.outcome)
    ?'LAB_WORKER_RESTARTED':prior.outcome==='ENDED'?'LAB_SESSION_ENDED':
      prior.stages.find(stage=>stage.stage==='lifecycle')?.code??prior.firstFailure?.code??null;
  }).catch(()=>{}));
 }

 function abortRun(session) {
  const run=session.run;
  session.run=null;
  if(!run)return;
  clearTimeout(run.timer);
  run.controller.abort();
  const transfer=run.transfer;
  if(transfer){
   const previous=draining;
   const cleanup=Promise.resolve(transfer.task).finally(()=>transfer.spool.close());
   const pending=Promise.allSettled([previous,cleanup]);
   draining=pending;
   void pending.then(()=>{if(draining===pending)draining=null;});
  }
 }
 function revoke(code='LAB_SESSION_ENDED') {
  starting?.controller.abort(labError(code));
  preflighting?.abort(labError(code));
  const session=grant;
  grant=null;
  lastCode=code;
  if(!session)return;
  clearTimeout(session.timer);
  abortRun(session);
  session.closeRelay();
  const ended=code==='LAB_SESSION_ENDED';
  session.report.mark('lifecycle',ended?'PASS':'FAIL',ended?{}:{error:labError(code)});
  session.report.finish(ended?'ENDED':'FAILED');
  saveStartup();
 }
 function requireIdentity(){
  if(runtime.id!==extensionId)throw labError('LAB_EXTENSION_ID_MISMATCH');
 }
 async function requirePermission(){
  if(await permission()!==true)throw labError('NATIVE_PERMISSION_DENIED');
 }
 function requireNativeApi(){
  if(typeof runtime.connectNative!=='function')throw labError('NATIVE_API_UNAVAILABLE');
 }
 function requireOpfs(){
  if(!opfsCapability())throw labError('LAB_OPFS_UNAVAILABLE');
 }
 function validateSelection(input){
  requireKeys(input,['accountId','bucketName','mode','minutes','scopeId']);
  const {accountId,bucketName,mode,minutes,scopeId}=input;
  if(!/^[0-9a-f]{32}$/.test(accountId??'')||!/^[a-z0-9][a-z0-9-]{1,62}$/.test(bucketName??'')||
   !['read-only','read-write'].includes(mode)||![15,30,60].includes(minutes)||
   (mode==='read-only'?!uploadId(scopeId):scopeId!==null))throw labError('INVALID_INPUT');
  return normalizeTarget({provider:'cloudflare',connectionId:'cloudflare:'+accountId,accountId,bucketName,prefix:''});
 }
 async function sessionAuthority(target,mode,expectedSession) {
  const auth=await authority();
  if(expectedSession!==undefined&&auth.sessionId!==expectedSession)throw labError('AUTH_SESSION_CHANGED');
  if(!auth.accounts.some(account=>account.id===target.accountId))throw labError('SCOPE_UNAUTHORIZED');
  if(!readScopes.every(scope=>auth.scopes?.includes(scope))||
   mode==='read-write'&&!['workers-r2.write','workers-r2-bucket-item.write'].every(scope=>auth.scopes?.includes(scope)))
   throw labError('INSUFFICIENT_SCOPE');
  return auth;
 }
 function live(session) {
  if(grant===session&&clock()>=session.expiresAt)revoke('LAB_AUTHORIZATION_EXPIRED');
  if(grant!==session)throw labError('LAB_AUTHORIZATION_EXPIRED');
 }
 async function check(session) {
  live(session);
  try{await sessionAuthority(session.target,session.mode,session.sessionId);}
  catch(error){if(grant===session)revoke(typed(error));throw error;}
  live(session);
 }
 function validScope(record) {
  return record&&uploadId(record.id)&&validInt(record.created,0,clock())&&clock()-record.created<freshness&&
   typeof record.prefix==='string'&&record.prefix.endsWith('.redown-python-lab/'+record.id+'/');
 }
 async function scopes(accountId,bucketName) {
  const value=(await storage.get(scopeKey))[scopeKey];
  return (Array.isArray(value)?value:[]).filter(validScope)
   .filter(row=>accountId===undefined||row.accountId===accountId&&row.bucketName===bucketName);
 }
 async function checkSelection(input,root,step){
  const {accountId,bucketName,mode,minutes,scopeId}=input;
  const auth=await step('authorization',()=>sessionAuthority(root,mode));
  await step('selected-bucket',async signal=>{
   if(await checkBucket(root,auth,signal)!==true)throw labError('LAB_BUCKET_CHECK_FAILED');
  });
  const previous=mode==='read-only'?await step('recovery-scope',async()=>{
   const record=(await scopes(accountId,bucketName)).find(row=>row.id===scopeId);
   if(!record)throw labError('LAB_RECOVERY_SCOPE_NOT_FOUND');
   return record;
  }):null;
  const id=previous?.id??crypto.randomUUID();
  const parent=mode==='read-write'?await step('worker-prefix',async()=>normalizePrefix(await workerPrefix(root))):'';
  const target=normalizeTarget({...root,prefix:previous?.prefix??parent+'.redown-python-lab/'+id+'/'});
  if(mode==='read-write')await step('upload-readiness',async signal=>{
   const checked=await checkUpload(target,signal);
   if(checked?.sessionId!==auth.sessionId)throw labError('AUTH_SESSION_CHANGED');
  },35_000);
  return {target,id,auth,mode,minutes};
 }
 async function diskBudget(report,step){
  const estimate=await step('storage-estimate',storageEstimate);
  if(!Number.isFinite(estimate?.quota)||!Number.isFinite(estimate?.usage)){
   report.mark('storage-estimate','UNAVAILABLE',{error:labError('LAB_STORAGE_ESTIMATE_UNAVAILABLE'),
    optional:report.snapshot().kind==='startup'});
   return limits.maxDiskBytes;
  }
  return Math.min(limits.maxDiskBytes,Math.floor(Math.max(0,estimate.quota-estimate.usage)));
 }
 function openRelay(session,attempt){
  requireNativeApi();
  const port=runtime.connectNative(labHostName);
  session.port=port;
  let resolveReady;
  const ready=new Promise(resolve=>{resolveReady=resolve;});
  const onMessage=message=>{
   if(grant===session){void receive(session,message);return;}
   if(starting!==attempt||attempt.controller.signal.aborted)return;
   if(message?.type==='ready'&&Object.keys(message).length===1)resolveReady();
   else attempt.controller.abort(labError('NATIVE_HANDSHAKE_INVALID'));
  };
  const onDisconnect=()=>{
   const code=nativeDisconnectCode(runtime.lastError?.message??'');
   if(grant===session)revoke(code);
   else if(starting===attempt)attempt.controller.abort(labError(code));
  };
  session.closeRelay=()=>{
   try{port.onMessage.removeListener?.(onMessage);}catch{}
   try{port.onDisconnect.removeListener?.(onDisconnect);}catch{}
   try{port.disconnect();}catch{}
  };
  port.onMessage.addListener(onMessage);
  port.onDisconnect.addListener(onDisconnect);
  return {ready};
 }
 async function start(input) {
  if(starting||grant)throw labError('LAB_SESSION_ALREADY_OPEN');
  const controller=new AbortController();
  const report=createLabReport('startup',build);
  const attempt={controller,report};
  starting=attempt;startupReport=report;lastCode=null;
  const step=(stage,work,timeoutMs=stageTimeoutMs,timeoutCode)=>report.run(stage,work,{signal:controller.signal,timeoutMs,timeoutCode});
  const deadline=setTimeout(()=>controller.abort(labError('LAB_STARTUP_TIMEOUT')),startupTimeoutMs);
  let session;
  try {
   await step('trusted-storage',trustedStorage);
   saveStartup();
   await step('extension-identity',requireIdentity);
   const root=await step('input-validation',()=>validateSelection(input));
   await step('native-permission',requirePermission);
   await step('native-api',requireNativeApi);
   await step('opfs-capability',requireOpfs);
   const {target,id,auth,mode,minutes}=await checkSelection(input,root,step);
   const directory=await step('spool-init-cleanup',async signal=>{
    await draining;
    await preparingSpool?.catch(()=>{});
    signal.throwIfAborted();
    const pending=Promise.resolve().then(()=>spoolDirectory(signal));
    preparingSpool=pending;
    try{return await pending;}
    finally{if(preparingSpool===pending)preparingSpool=null;}
   });
   const diskBytes=await diskBudget(report,step);
   await step('auth-recheck',()=>sessionAuthority(target,mode,auth.sessionId));
   session={id,target,mode,directory,diskBytes,sessionId:auth.sessionId,report,
    ready:false,client:null,ticket:null,attempts:0,usedRuns:new Set(),run:null,counters:{files:0,trafficBytes:0,providerRequests:0,operations:0}};
   const {ready}=await step('native-port-launch',()=>openRelay(session,attempt));
   await step('native-handshake',()=>ready,handshakeTimeoutMs,'NATIVE_HANDSHAKE_TIMEOUT');
   controller.signal.throwIfAborted();
   const now=clock();
   Object.assign(session,{ready:true,checkedAt:now,expiresAt:now+minutes*60_000});
   refreshCode(session);
   grant=session;
   session.timer=setTimeout(()=>{if(grant===session)revoke('LAB_AUTHORIZATION_EXPIRED');},minutes*60_000);
   session.timer.unref?.();
   report.finish('READY_TO_PAIR');
   return status();
  }catch(error){
   session?.closeRelay?.();
   lastCode=typed(error);
   if(!report.snapshot().firstFailure)report.mark('lifecycle','FAIL',{error});
   report.finish(lastCode==='LAB_SESSION_ENDED'?'ENDED':'FAILED');
   throw error;
  }finally{
   clearTimeout(deadline);
   starting=null;
   saveStartup();
  }
 }
 async function preflight(input){
  if(preflighting)throw labError('LAB_PREFLIGHT_BUSY');
  const controller=new AbortController();
  preflighting=controller;
  const report=createLabReport('preflight',build);
  preflightReport=report;
  const step=(stage,work,timeoutMs=stageTimeoutMs)=>report.run(stage,work,{signal:controller.signal,timeoutMs});
  const deadline=setTimeout(()=>controller.abort(labError('LAB_PREFLIGHT_TIMEOUT')),startupTimeoutMs);
  let selectedTarget=false;
  try{
   await step('trusted-storage',trustedStorage);
   await step('extension-identity',requireIdentity);
   const root=await step('input-validation',()=>Object.keys(input).length?validateSelection(input):null);
   selectedTarget=!!root;
   const cloud=async()=>{
    const auth=await step('account-discovery',authority);
    if(!root)return;
    if(auth.accounts.some(account=>account.id===root.accountId))
     await step('bucket-listing',signal=>buckets(root.accountId,'',signal));
    const selected=await checkSelection(input,root,step);
    await step('auth-recheck',()=>sessionAuthority(selected.target,selected.mode,selected.auth.sessionId));
   };
   await Promise.allSettled([
    step('native-permission',requirePermission),
    step('native-api',requireNativeApi),
    step('opfs-capability',signal=>{requireOpfs();return opfsProbe(signal);}),
    diskBudget(report,step),cloud()
   ]);
  }catch{/* The failed step has already captured its cause. */}
  finally{clearTimeout(deadline);preflighting=null;}
  report.finish(report.snapshot().firstFailure?'BLOCKED':selectedTarget?'PASS':'INCOMPLETE');
  return report.snapshot();
 }
 async function discover(stage,work,reset=false){
  if(reset||!discoveryReport)discoveryReport=createLabReport('discovery',build);
  const report=discoveryReport;
  const step=(name,fn)=>report.run(name,fn,{timeoutMs:stageTimeoutMs});
  try{
   await step('trusted-storage',trustedStorage);
   const data=await step(stage,work);
   report.finish('PASS');
   return data;
  }catch(error){
   report.finish('FAILED');
   throw error;
  }
 }
 function refreshCode(session) {
  session.pairingStarted=performance.now();
  session.pairCode=token().slice(0,16);
  session.codeExpiresAt=Math.min(clock()+120_000,session.expiresAt);
  session.attempts=0;
 }
 async function pair(session,client,input) {
  requireKeys(input,['code','ticket']);
  if(session.client&&session.client!==client)throw labError('LAB_CLIENT_BUSY');
  if(input.code!==null){
   if(input.ticket!==null||clock()>=session.codeExpiresAt||session.attempts>=6)throw labError('PAIRING_CODE_UNAVAILABLE');
   if(!equal(session.pairCode,input.code)){session.attempts++;throw labError('PAIRING_CODE_REJECTED');}
   session.pairCode=null;
   session.ticket=token();
  }else if(!session.ticket||!equal(session.ticket,input.ticket))throw labError('PAIRING_REQUIRED');
  session.client=client;
  session.report.mark('pairing','PASS',{elapsedMs:performance.now()-session.pairingStarted});
  session.report.finish('PAIRED');
  saveStartup();
  return {ticket:session.ticket,scopeId:session.id,expiresAt:session.expiresAt};
 }
 function requireRun(session) {
  const run=session.run;
  if(!run)throw labError('LAB_RUN_REQUIRED');
  run.controller.signal.throwIfAborted();
  return run;
 }
 function meter(session,run,field,amount) {
  live(session);
  run.controller.signal.throwIfAborted();
  const maximum=maximums[budgetFields.indexOf(field)];
  if(run.used[field]+amount>run.budget[field]||session.counters[field]+amount>maximum)throw labError('LAB_BUDGET_EXCEEDED');
  run.used[field]+=amount;
  session.counters[field]+=amount;
 }
 async function admit(session,input) {
  requireKeys(input,['runId','mode','budget']);
  requireKeys(input.budget,budgetFields);
  const {runId,mode,budget}=input;
  if(!uploadId(runId)||!['read','write'].includes(mode))throw labError('INVALID_INPUT');
  if(session.run)throw labError('LAB_RUN_BUSY');
  if(draining)throw labError('LAB_TRANSFER_DRAINING');
  if(mode==='write'&&(session.mode!=='read-write'||session.usedRuns.has(runId)))throw labError('LAB_WRITE_SCOPE_DENIED');
  for(const [index,field] of budgetFields.entries()){
   const remaining=field==='diskBytes'?session.diskBytes:maximums[index]-(session.counters[field]??0);
   if(!validInt(budget[field],field==='seconds'?1:0,remaining))throw labError('LAB_BUDGET_EXCEEDED');
  }
  if(mode==='write'){
   // Record a recoverable owner-selected namespace before accepting any writes.
   const records=await scopes();
   if(!records.some(row=>row.id===session.id)){
    const {accountId,bucketName,prefix}=session.target;
    const record={id:session.id,accountId,bucketName,prefix,created:clock()};
    await storage.set({[scopeKey]:[record,...records].slice(0,32)});
   }
   live(session);
   if(!session.client)throw labError('EXTENSION_DISCONNECTED');
   session.usedRuns.add(runId);
  }
  const controller=new AbortController(),duration=Math.min(budget.seconds*1000,session.expiresAt-clock());
  const run={id:runId,mode,budget,used:{files:0,trafficBytes:0,providerRequests:0,operations:0},controller,transferIds:new Set(),
   target:normalizeTarget({...session.target,prefix:session.target.prefix+runId+'/'}),transfer:null};
  run.timer=setTimeout(()=>{if(session.run===run)abortRun(session);},duration);
  run.timer.unref?.();
  session.run=run;
  return {prefix:run.target.prefix,budget};
 }
 function targetKey(run,path,size=0) {
  path=leafPath(path);
  return localUploadKey(run.target,{size,name:path.split('/').at(-1)},path,'mixed');
 }
 function requests(session,run,limit,signal=run.controller.signal) {
  let count=0;
  return ()=>{
   signal.throwIfAborted();
   if(++count>limit)throw labError('LAB_OPERATION_REQUEST_LIMIT');
   meter(session,run,'providerRequests',1);
  };
 }
 function projectDescription(session) {
  const headroom={};
  for(const [index,field] of budgetFields.entries())
   headroom[field]=field==='seconds'?Math.max(0,Math.floor((session.expiresAt-clock())/1000)):
    field==='diskBytes'?session.diskBytes:maximums[index]-(session.counters[field]??0);
  return {protocol:labProtocol,evidenceClass:build.labEvidenceClass??'installed-extension-cloudflare',engineVersion:build.apiVersion,
   extensionVersion:build.extensionVersion,commit:build.revision,sourceDigest:build.sourceDigest,
   scopeId:session.id,provider:'cloudflare',accountId:session.target.accountId,bucketName:session.target.bucketName,
   prefix:session.target.prefix,mode:session.mode,
   expiresAt:session.expiresAt,checkedAt:session.checkedAt,headroom,limits,
   operations:session.mode==='read-write'?['upload','download','metadata','list']:['download','metadata','list'],
   diagnostics:session.report.snapshot(),
   unsupported,readback:'independent OAuth Object API streaming with strong ETag and SHA-256'};
 }
 function uploadOptions(input){
  if(!validInt(input.size,0,limits.maxFileBytes)||!validInt(input.timeout,1,limits.maxTransferSeconds)||!uploadId(input.id))
   throw labError('INVALID_TRANSFER_OPTIONS');
 }
 async function transferOpen(session,run,method,input) {
  requireKeys(input,method==='uploadOpen'?['id','path','size','sha256','timeout','contentType']:['id','path','size','etag','version','timeout']);
  uploadOptions(input);
  if(run.transferIds.has(input.id))throw labError('TRANSFER_ID_REUSED');
  if(input.size>run.budget.diskBytes||run.transfer)throw labError('LAB_SPOOL_UNAVAILABLE');
  const key=targetKey(run,input.path,input.size);
  const write=method==='uploadOpen';
  if(write&&(run.mode!=='write'||!validHash(input.sha256)))throw labError('LAB_WRITE_SCOPE_DENIED');
  if(write&&(typeof input.contentType!=='string'||!/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(input.contentType)||input.contentType.length>128))
   throw labError('INVALID_CONTENT_TYPE');
  if(!write&&(input.etag!==null&&typeof input.etag!=='string'||input.version!==null&&typeof input.version!=='string'))
   throw labError('INVALID_OBJECT_IDENTITY');
  if(write){
   meter(session,run,'files',1);
   meter(session,run,'trafficBytes',input.size*limits.uploadTrafficFactor);
  }else meter(session,run,'trafficBytes',input.size);
  meter(session,run,'operations',1);
  const spool=await openLabSpool(session.directory,input.size);
  if(grant!==session||session.run!==run){
   await spool.close();
   throw labError('LAB_AUTHORIZATION_EXPIRED');
  }
  const controller=new AbortController();
  const signal=AbortSignal.any([run.controller.signal,controller.signal,AbortSignal.timeout(input.timeout*1000)]);
  const transfer={key,spool,controller,signal,input,kind:write?'upload':'download',offset:0,
   state:write?'staging':'running',progress:{phase:write?'staging':'reading',bytes:0}};
  run.transferIds.add(input.id);
  run.transfer=transfer;
  if(!write)launch(session,run,transfer,()=>download(session,run,transfer));
  return {id:input.id,chunkBytes};
 }
 function launch(session,run,transfer,work) {
  transfer.state='running';
  transfer.task=Promise.resolve().then(work).then(result=>{
   transfer.result=result;
  },error=>{
   transfer.result={state:transfer.kind==='upload'&&transfer.submitted?'UNCERTAIN':
    transfer.signal.aborted?'CANCELLED':'FAIL',code:typed(error)};
  }).finally(()=>{transfer.state='terminal';});
 }
 async function download(session,run,transfer) {
  const {input,key,signal,spool}=transfer;
  const api=fileApi(session.sessionId,requests(session,run,limits.readRequests,signal));
  const result=await api.run('stat',{source:run.target,key},{signal});
  if(result.state!=='completed')throw labError(uploadCode(result.code,'METADATA_FAILED'));
  const observed=identity(result.data?.object,key);
  if(!observed)throw labError('OBJECT_MISSING');
  if(observed.size!==input.size||input.etag!==null&&observed.etag!==objectETag(input.etag)||
   input.version!==null&&observed.version!==null&&observed.version!==input.version)throw labError('OBJECT_CHANGED');
  const data=await api.run('readStream',{source:run.target,key,expectedSize:observed.size,etag:observed.etag},{
   signal,onChunk:async bytes=>{
    live(session);
    signal.throwIfAborted();
    await spool.append(bytes);
    transfer.progress={phase:'reading',bytes:spool.bytes};
   }});
  if(data.state!=='completed'||data.data?.size!==observed.size)throw labError(uploadCode(data.code,'READBACK_FAILED'));
  const hash=await spool.seal();
  return {state:'PASS',code:'REMOTE_BYTES_OBSERVED',...observed,sha256:hash};
 }
 async function submit(session,run,transfer) {
  const {input,key,signal,spool}=transfer;
  signal.throwIfAborted();
  await spool.seal(input.sha256);
  const file=new File([await spool.file()],input.path.split('/').at(-1),{type:input.contentType});
  const stagingPrefix=run.target.prefix+'.redown-beta-uploads/';
  objectKey(stagingPrefix+input.id+'/'+file.name);
  const beforeRequest=requests(session,run,limits.uploadRequests,signal);
  const binding={target:run.target,sessionId:session.sessionId,stagingPrefix,beforeRequest,
   assertAuthorized:()=>check(session)};
  signal.throwIfAborted();
  transfer.submitted=true;
  const result=await upload({ticket:input.id,batchId:run.id,relativePath:input.path,file,binding},
   {signal,abort:()=>transfer.controller.abort()},
   progress=>{
    if(typeof progress.phase==='string'&&validInt(progress.bytes,0,input.size))
     transfer.progress={phase:progress.phase,bytes:progress.bytes};
   });
  if(result.state!=='completed')return {state:({skipped:'CONFLICT',uncertain:'UNCERTAIN',cancelled:'CANCELLED',blocked:'BLOCKED'})[result.state]??'FAIL',
   code:uploadCode(result.code,'UPLOAD_NOT_VERIFIED')};
  return {state:'ACKNOWLEDGED',code:'PRODUCTION_UPLOAD_RECEIPT',receipt:cleanReceipt(result.receipt,key,input.size,input.id)};
 }
 async function metadata(session,run,input) {
  requireKeys(input,['path']);
  const key=targetKey(run,input.path);
  const signal=run.controller.signal;
  meter(session,run,'operations',1);
  const api=fileApi(session.sessionId,requests(session,run,limits.statRequests,signal));
  const result=await api.run('stat',{source:run.target,key},{signal});
  if(result.state!=='completed')throw labError(uploadCode(result.code,'METADATA_FAILED'));
  return {object:identity(result.data?.object,key)};
 }
 async function list(session,run,input) {
  requireKeys(input,['folder','cursor']);
  if(typeof input.cursor!=='string'||input.cursor.length>2048||typeof input.folder!=='string')throw labError('INVALID_INPUT');
  const source={...run.target,prefix:input.folder?targetKey(run,input.folder)+'/':run.target.prefix};
  const signal=run.controller.signal;
  meter(session,run,'operations',1);
  const api=fileApi(session.sessionId,requests(session,run,limits.listRequests,signal));
  const result=await api.run('list',{source,cursor:input.cursor},{signal});
  if(result.state!=='completed')throw labError(uploadCode(result.code,'LIST_FAILED'));
  const {entries,cursor}=result.data;
  if(entries.length>1000||typeof cursor!=='string'||cursor.length>2048)throw labError('INVALID_PROVIDER_RESPONSE');
  // Bound native frames independently of the provider page size.
  const page=entries.filter(item=>item.key.startsWith(source.prefix)&&
   !item.key.slice(run.target.prefix.length).split('/').includes('.redown-beta-uploads'))
   .map(item=>({key:item.key,folder:item.folder===true,...(validInt(item.size,0,Number.MAX_SAFE_INTEGER)?{size:item.size}:{})}));
  if(utf8Length(JSON.stringify(page))>350_000)throw labError('LIST_PAGE_FRAME_LIMIT');
  return {entries:page,cursor};
 }
 async function query(session,method,input) {
  switch(method) {
   case 'describe':requireKeys(input,[]);return projectDescription(session);
   case 'admit':return admit(session,input);
   case 'releaseRun':requireKeys(input,[]);abortRun(session);return {released:true};
  }
  const run=requireRun(session);
  if(method==='metadata')return metadata(session,run,input);
  if(method==='list')return list(session,run,input);
  if(method==='uploadOpen'||method==='readOpen')return transferOpen(session,run,method,input);
  if(!['uploadAppend','uploadStart','poll','pull','closeTransfer','cancel'].includes(method))throw labError('UNSUPPORTED_OPERATION');
  const fields=method==='uploadAppend'?['id','offset','bytesBase64']:method==='pull'?['id','offset']:['id'];
  requireKeys(input,fields);
  const transfer=run.transfer;
  if(!transfer||input.id!==transfer.input.id)throw labError('TRANSFER_NOT_FOUND');
  const {spool,signal}=transfer;
  if(method==='poll')return {state:transfer.state,progress:transfer.progress,result:transfer.result??null};
  if(method==='cancel'){transfer.controller.abort();return {cancellationRequested:true};}
  if(method==='closeTransfer'){
   if(transfer.state==='running')throw labError('TRANSFER_BUSY');
   await spool.close();run.transfer=null;return {closed:true};
  }
  if(method==='uploadStart'&&transfer.kind==='upload'&&transfer.state==='staging'){
   launch(session,run,transfer,()=>submit(session,run,transfer));return {started:true};
  }
  if(method==='uploadAppend'&&transfer.kind==='upload'&&transfer.state==='staging'){
   signal.throwIfAborted();
   await spool.append(decodeFrame(input.bytesBase64),input.offset);
   return {bytes:spool.bytes};
  }
  if(method==='pull'&&transfer.kind==='download'&&transfer.result?.state==='PASS'&&input.offset===transfer.offset){
   signal.throwIfAborted();
   const file=await spool.file();
   const bytes=new Uint8Array(await file.slice(input.offset,input.offset+chunkBytes).arrayBuffer());
   transfer.offset+=bytes.length;
   return {bytesBase64:encodeFrame(bytes),offset:transfer.offset,done:transfer.offset===spool.size};
  }
  throw labError('INVALID_TRANSFER_STATE');
 }
 async function receive(session,message) {
  if(grant!==session)return;
  if(!uploadId(message?.client))return;
  if(message.type==='closed'){
   if(session.client===message.client){
    session.client=null;
    abortRun(session);
    session.report.finish('CLI_IDLE');
    saveStartup();
   }
   return;
  }
  if(message.type!=='request'||!uploadId(message.id))return;
  let response;
  try {
   if(!session.ready)throw labError('NATIVE_HOST_NOT_READY');
   if(session.inFlight)throw labError('LAB_CLIENT_BUSY');
   if(message.method!=='pair'&&session.client!==message.client)throw labError('PAIRING_REQUIRED');
   session.inFlight=message.id;
   await check(session);
   const data=message.method==='pair'?await pair(session,message.client,message.input):await query(session,message.method,message.input);
   live(session);
   response=available(data);
  }catch(error){
   response=failure(typed(error));
   if(message.method==='pair'&&grant===session&&!session.ticket){
    session.report.mark('pairing','FAIL',{error,elapsedMs:performance.now()-session.pairingStarted});
    saveStartup();
   }
  }
  finally{if(session.inFlight===message.id)session.inFlight=null;}
  if(grant===session)try{session.port.postMessage({id:message.id,response});}catch{revoke('NATIVE_HOST_DISCONNECTED');}
 }
 return Object.freeze({revoke,async request(action,input={}){
  try{return {ok:true,data:await ui(action,input)};}
  catch(error){
   const failure=describeLabFailure(error);
   const report=(action==='start'?startupReport:
    ['accounts','buckets'].includes(action)?discoveryReport:null)?.snapshot();
   const stage=report?.stages.find(row=>row.code===failure.code);
   return {ok:false,...failure,...(stage?{...stage,correlationId:report.correlationId}:{})};
  }
 },ui});
 async function ui(action,input={}){
  switch(action){
   case 'status':
    await previousStartup();
    return status();
   case 'diagnostics':
    await previousStartup();
    const {state,code,nativeApiAvailable}=status();
    return {schema:'redown.python-lab.diagnostic-export/1',startup:startupReport?.snapshot()??savedStartup,
     discovery:discoveryReport?.snapshot()??null,preflight:preflightReport?.snapshot()??null,
     session:{state,code:code??null,nativeApiAvailable}};
   case 'preflight':return preflight(input);
   case 'accounts':return discover('account-discovery',async()=>
    ({accounts:(await authority()).accounts.map(({id,name})=>({id,name}))}),true);
   case 'buckets':{
    requireKeys(input,['accountId','cursor']);
    if(!/^[0-9a-f]{32}$/.test(input.accountId??'')||typeof input.cursor!=='string'||input.cursor.length>2048)throw labError('INVALID_INPUT');
    return discover('bucket-listing',signal=>buckets(input.accountId,input.cursor,signal));
   }
   case 'recovery':{
    requireKeys(input,['accountId','bucketName']);
    await trustedStorage();
    const auth=await authority();
    if(!auth.accounts.some(row=>row.id===input.accountId))throw labError('SCOPE_UNAUTHORIZED');
    return {scopes:await scopes(input.accountId,input.bucketName)};
   }
   case 'start':return start(input);
   case 'end':revoke();return status();
   case 'newCode':
    if(!grant?.ready||grant.client)throw labError('LAB_SESSION_NOT_IDLE');
    grant.ticket=null;refreshCode(grant);
    grant.report.finish('READY_TO_PAIR');
    saveStartup();
    return status();
   default:throw uploadError('UNSUPPORTED_OPERATION','Unknown laboratory action.');
  }
 }
}
