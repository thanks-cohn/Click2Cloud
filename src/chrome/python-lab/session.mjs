import {sha256} from './vendor/sha256.mjs';
import {localUploadKey,maximumObjectBytes,uploadId,uploadError} from '../local-upload-plan.mjs';
import {uploadCode} from '../local-upload-service.mjs';
import {objectETag,key as objectKey,name} from '../../explorer/file-api.mjs';
import {normalizeTarget,normalizePrefix} from '../../core/menu-identity.mjs';
import {chunkBytes,decodeFrame,encodeFrame,labError,labSpoolDirectory,openLabSpool,utf8Length,validHash} from './spool.mjs';
import {boundedLabStep,createLabReport,describeLabFailure,diagnosticCode} from './diagnostics.mjs';
import {auditFields,auditFrameBytes,auditPageSize,budgetFields,campaignPolicyVersion,costMicros,exactKeys,
 maxSessionMinutes,timerSeconds,validInt,validateCampaign,validateCeilings} from './campaign-policy.mjs';

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
const maximums=[limits.maxFiles,limits.maxTrafficBytes,limits.maxDiskBytes,limits.maxProviderRequests,limits.maxOperations,limits.maxRunSeconds];
const readScopes=['workers-r2.read','workers-r2-bucket-item.read'];
const estimateStorage=()=>globalThis.navigator?.storage?.estimate?.();
const opfsAvailable=()=>typeof globalThis.navigator?.storage?.getDirectory==='function';
const probeOpfs=()=>globalThis.navigator.storage.getDirectory();
const scopeKey='pythonLabRecoveryScopesV1';
const diagnosticKey='pythonLabLastStartupV1';
const campaignKey=(scopeId,runId)=>`pythonLabCampaignV1:${scopeId}:${runId}`;
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
const requireKeys=exactKeys;
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
  version:typeof object.version==='string'?object.version.slice(0,256):null,
  modifiedAt:typeof object.last_modified==='string'?object.last_modified.slice(0,80):null};
}
function cleanReceipt(receipt,key,size,id) {
 if(!receipt||receipt.key!==key||receipt.size!==size||receipt.operationId!==id||!receipt.etag||!receipt.version)
  throw labError('UPLOAD_RECEIPT_MISMATCH');
 return {key,size,operationId:id,etag:objectETag(receipt.etag),version:String(receipt.version).slice(0,256)};
}

export function createPythonLab({runtime,storage,diagnosticStorage,build,authority,buckets,checkBucket,workerPrefix,checkUpload,upload,readUploadOutcome,reconcileUpload,
 trustedStorage=()=>{},permission,opfsCapability=opfsAvailable,opfsProbe=probeOpfs,fileApi,
 spoolDirectory=labSpoolDirectory,storageEstimate=estimateStorage,clock=Date.now,
 stageTimeoutMs=12_000,startupTimeoutMs=80_000,handshakeTimeoutMs=10_000}) {
 let grant=null,starting=null,preflighting=null,lastCode=null,draining=null,preparingSpool=null;
 let startupReport=null,preflightReport=null,discoveryReport=null,savedStartup=null,restoring=null,saving=Promise.resolve();
 const status=()=>grant?{
  state:grant.client?'CONNECTED':grant.ticket?'PAIRED':'PAIRING',
  ready:grant.ready,scopeId:grant.id,bucketName:grant.target.bucketName,prefix:grant.target.prefix,
  mode:grant.mode,expiresAt:grant.expiresAt,codeExpiresAt:grant.codeExpiresAt,
  pairCode:grant.pairCode,code:lastCode,...(grant.campaignId?{campaignId:grant.campaignId}:{}),nativeApiAvailable:typeof runtime.connectNative==='function'
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
  clearTimeout(run.transferTimer);
  clearTimeout(run.auditTimer);
  run.controller.abort(labError('LAB_EXECUTION_DEADLINE'));
  const transfer=run.transfer;
  if(transfer){
   clearTimeout(transfer.idleTimer);
   clearTimeout(transfer.absoluteTimer);
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
  requireKeys(input,['accountId','bucketName','mode','minutes','scopeId'],['ceilings','campaignId']);
  const {accountId,bucketName,mode,minutes,scopeId,campaignId=null}=input;
  if(!/^[0-9a-f]{32}$/.test(accountId??'')||!/^[a-z0-9][a-z0-9-]{1,62}$/.test(bucketName??'')||
   !['read-only','read-write'].includes(mode)||!validInt(minutes,1,maxSessionMinutes)||
   (scopeId!==null&&!uploadId(scopeId))||
   (campaignId!==null&&(!uploadId(campaignId)||!scopeId||!input.ceilings))||
   (mode==='read-only'&&!scopeId)||(mode==='read-write'&&scopeId&&!campaignId))throw labError('INVALID_INPUT');
  if(input.ceilings!==undefined)validateCeilings(input.ceilings,maximumObjectBytes);
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
  return record&&uploadId(record.id)&&validInt(record.created)&&
   typeof record.prefix==='string'&&record.prefix.endsWith('.redown-python-lab/'+record.id+'/');
 }
 async function scopes(accountId,bucketName) {
  const value=(await storage.get(scopeKey))[scopeKey];
  return (Array.isArray(value)?value:[]).filter(validScope)
   .filter(row=>accountId===undefined||row.accountId===accountId&&row.bucketName===bucketName);
 }
 async function checkSelection(input,root,step){
  const {accountId,bucketName,mode,minutes,scopeId,campaignId=null,ceilings}=input;
  const auth=await step('authorization',()=>sessionAuthority(root,mode));
  await step('selected-bucket',async signal=>{
   if(await checkBucket(root,auth,signal)!==true)throw labError('LAB_BUCKET_CHECK_FAILED');
  });
  const previous=scopeId?await step('recovery-scope',async()=>{
   const record=(await scopes(accountId,bucketName)).find(row=>row.id===scopeId);
   if(!record)throw labError('LAB_RECOVERY_SCOPE_NOT_FOUND');
   if(campaignId){
    const key=campaignKey(scopeId,campaignId),campaign=(await storage.get(key))[key];
    if(!campaign||campaign.prefix!==record.prefix+campaignId+'/')throw labError('LAB_RECOVERY_SCOPE_NOT_FOUND');
   }
   return record;
  }):null;
  const id=previous?.id??crypto.randomUUID();
  const parent=mode==='read-write'&&!previous?await step('worker-prefix',async()=>normalizePrefix(await workerPrefix(root))):'';
  const target=normalizeTarget({...root,prefix:previous?.prefix??parent+'.redown-python-lab/'+id+'/'});
  if(mode==='read-write')await step('upload-readiness',async signal=>{
   const checked=await checkUpload(target,signal);
   if(checked?.sessionId!==auth.sessionId)throw labError('AUTH_SESSION_CHANGED');
  },35_000);
  return {target,id,auth,mode,minutes,campaignId,ceilings};
 }
 async function diskBudget(report,step,approved=limits.maxDiskBytes){
  const estimate=await step('storage-estimate',storageEstimate);
  if(!Number.isFinite(estimate?.quota)||!Number.isFinite(estimate?.usage)){
   report.mark('storage-estimate','UNAVAILABLE',{error:labError('LAB_STORAGE_ESTIMATE_UNAVAILABLE'),
    optional:report.snapshot().kind==='startup'});
   return limits.maxDiskBytes;
  }
  return Math.min(approved,Math.floor(Math.max(0,estimate.quota-estimate.usage)));
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
   const {target,id,auth,mode,minutes,campaignId,ceilings}=await checkSelection(input,root,step);
   const directory=await step('spool-init-cleanup',async signal=>{
    await draining;
    await preparingSpool?.catch(()=>{});
    signal.throwIfAborted();
    const pending=Promise.resolve().then(()=>spoolDirectory(signal));
    preparingSpool=pending;
    try{return await pending;}
    finally{if(preparingSpool===pending)preparingSpool=null;}
   });
   const diskBytes=await diskBudget(report,step,ceilings?.diskBytes);
   await step('auth-recheck',()=>sessionAuthority(target,mode,auth.sessionId));
   session={id,target,mode,directory,diskBytes,campaignId,ceilings,minutes,sessionId:auth.sessionId,report,
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
 function campaignHeadroom(session){
  const {ceilings,counters}=session;
  return Object.fromEntries(budgetFields.map(field=>[field,field==='seconds'?
   Math.max(0,Math.floor((session.expiresAt-clock())/1000)):field==='diskBytes'?session.diskBytes:
    Math.max(0,ceilings[field]-counters[field])]));
 }
 function charge(session,run,amounts,category='transfer') {
  live(session);
  run.controller.signal.throwIfAborted();
  const usage=category==='audit'?run.auditUsed:run.used;
  if(run.policy){
   if(clock()>=run.deadline)throw labError('LAB_EXECUTION_DEADLINE');
   if(category==='transfer'&&clock()>=run.transferDeadline)throw labError('LAB_TRANSFER_DEADLINE');
   if(category==='audit'&&clock()>=run.auditDeadline)throw labError('LAB_AUDIT_DEADLINE');
   const signal=category==='audit'?run.auditSignal:run.transferController.signal;
   signal?.throwIfAborted();
   if(category==='transfer'&&run.auditSignal)throw labError('LAB_TRANSFER_ADMISSION_CLOSED');
   const requestTotal=session.counters.providerRequests+(amounts.providerRequests??0);
   const trafficTotal=session.counters.trafficBytes+(amounts.trafficBytes??0);
   if(costMicros(requestTotal,trafficTotal)>session.ceilings.costMicros)throw labError('LAB_BUDGET_EXCEEDED');
  }
  for(const [field,amount] of Object.entries(amounts)){
   const maximum=run.policy?session.ceilings[field]:maximums[budgetFields.indexOf(field)];
   const reserved=run.policy?.audit[field]??0;
   const allocation=category==='audit'?reserved:run.budget[field]-reserved;
   if(!validInt(amount)||usage[field]+amount>allocation||session.counters[field]+amount>maximum)
    throw labError(category==='audit'?'LAB_AUDIT_BUDGET_EXCEEDED':'LAB_BUDGET_EXCEEDED');
  }
  for(const [field,amount] of Object.entries(amounts)){
   usage[field]+=amount;
   session.counters[field]+=amount;
  }
 }
 const meter=(session,run,field,amount,category)=>charge(session,run,{[field]:amount},category);
 async function rememberScope(session){
  const records=await scopes();
  if(!records.some(row=>row.id===session.id)){
   const {accountId,bucketName,prefix}=session.target;
   await storage.set({[scopeKey]:[{id:session.id,accountId,bucketName,prefix,created:clock()},...records]});
  }
 }
 async function admitCampaign(session,input){
  requireKeys(input,['runId','mode','digest','fileDigest','fileCount','policy','preparationMs']);
  const {runId,mode,digest,fileDigest,fileCount,preparationMs}=input;
  if(!session.ceilings)throw labError('LAB_CAMPAIGN_CEILINGS_REQUIRED');
  if(!uploadId(runId)||!validHash(digest)||!validHash(fileDigest)||!validInt(fileCount,1)||!validInt(preparationMs)||
     !['new','continue','audit','download'].includes(mode))throw labError('INVALID_INPUT');
  if(session.run)throw labError('LAB_RUN_BUSY');
  if(draining)throw labError('LAB_TRANSFER_DRAINING');
  if(session.campaignId&&session.campaignId!==runId||
     ['new','continue'].includes(mode)&&session.mode!=='read-write'||mode==='new'&&session.campaignId)
   throw labError('LAB_WRITE_SCOPE_DENIED');
  const policy=validateCampaign(input.policy,session.ceilings,campaignHeadroom(session));
  if((mode==='audit')!==(policy.execution==='audit'))throw labError('INVALID_CAMPAIGN_POLICY');
  if((mode==='download'||mode==='audit')&&policy.budget.files!==0)throw labError('INVALID_CAMPAIGN_POLICY');
  const key=campaignKey(session.id,runId),prefix=session.target.prefix+runId+'/';
  const prior=(await storage.get(key))[key];
  if(mode==='new'&&prior||mode!=='new'&&(!prior||prior.digest!==digest||prior.fileDigest!==fileDigest||prior.fileCount!==fileCount||prior.prefix!==prefix))
   throw labError('LAB_CAMPAIGN_BINDING_MISMATCH');
  if(mode==='new'){
   await rememberScope(session);
   await storage.set({[key]:{id:runId,scopeId:session.id,digest,fileDigest,fileCount,prefix,created:clock()}});
  }
  live(session);
  if(!session.client)throw labError('EXTENSION_DISCONNECTED');
  const remainingMs=session.expiresAt-clock();
  if(policy.budget.seconds*1000>remainingMs)throw labError('LAB_AUTHORIZATION_TIME_SHORTFALL');
  const controller=new AbortController(),transferController=new AbortController();
  const durationMs=policy.budget.seconds*1000;
  const reserveMs=policy.audit.seconds*1000;
  const transferMs=Math.max(0,Math.min(durationMs-reserveMs,policy.execution==='timed'?
   Math.max(0,policy.benchmarkSeconds*1000-preparationMs):durationMs));
  const run={id:runId,mode:['new','continue'].includes(mode)?'write':'read',recoveryMode:mode,policy,budget:policy.budget,
   used:{files:0,trafficBytes:0,providerRequests:0,operations:0},auditUsed:{trafficBytes:0,providerRequests:0,operations:0},
   controller,transferController,transferIds:new Set(),target:normalizeTarget({...session.target,prefix}),transfer:null,
   fileDigest,fileCount,fileHasher:sha256.create(),files:new Map(),fileIds:new Set(),sealed:false,
   deadline:clock()+durationMs,transferDeadline:clock()+transferMs};
  run.timer=setTimeout(()=>{if(session.run===run)abortRun(session);},durationMs);
  run.transferTimer=setTimeout(()=>transferController.abort(labError('LAB_TRANSFER_DEADLINE')),transferMs);
  if(!transferMs)transferController.abort(labError('LAB_TRANSFER_DEADLINE'));
  run.timer.unref?.();run.transferTimer.unref?.();
  session.run=run;
  return {prefix,budget:run.budget,deadline:run.deadline,transferDeadline:run.transferDeadline,policyVersion:campaignPolicyVersion};
 }
 async function admit(session,input) {
  requireKeys(input,['runId','mode','budget']);
  requireKeys(input.budget,budgetFields);
  const {runId,mode,budget}=input;
  if(!uploadId(runId)||!['read','write'].includes(mode))throw labError('INVALID_INPUT');
  if(session.run)throw labError('LAB_RUN_BUSY');
  if(draining)throw labError('LAB_TRANSFER_DRAINING');
  if(session.campaignId||mode==='write'&&(session.mode!=='read-write'||session.usedRuns.has(runId)))throw labError('LAB_WRITE_SCOPE_DENIED');
  for(const [index,field] of budgetFields.entries()){
   const remaining=field==='diskBytes'?Math.min(session.diskBytes,limits.maxDiskBytes):maximums[index]-(session.counters[field]??0);
   if(!validInt(budget[field],field==='seconds'?1:0,remaining))throw labError('LAB_BUDGET_EXCEEDED');
  }
  if(mode==='write'){
   // Keep the historical manifest run namespace recoverable.
   await rememberScope(session);
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
 function registerFiles(run,input){
  requireKeys(input,['rows','final']);
  if(!run.policy||run.sealed||!Array.isArray(input.rows)||typeof input.final!=='boolean'||
     !input.rows.length||run.files.size+input.rows.length>run.fileCount||utf8Length(JSON.stringify(input.rows))>350_000)
   throw labError('INVALID_CAMPAIGN_FILE_PAGE');
  const encoder=new TextEncoder();
  for(const row of input.rows){
   if(!Array.isArray(row)||row.length!==4)throw labError('INVALID_CAMPAIGN_FILE_PAGE');
   const [id,path,size,hash]=row;
   if(!uploadId(id)||!validInt(size,0,maximumObjectBytes)||!validHash(hash)||run.files.has(path)||run.fileIds.has(id))
    throw labError('INVALID_CAMPAIGN_FILE_PAGE');
   targetKey(run,path,size);
   objectKey(run.target.prefix+'.redown-beta-uploads/'+id+'/'+path.split('/').at(-1));
   run.files.set(path,{id,size,hash});
   run.fileIds.add(id);
   run.fileHasher.update(encoder.encode(JSON.stringify(row)+'\n'));
  }
  if(input.final){
   const actual=Array.from(run.fileHasher.digest(),byte=>byte.toString(16).padStart(2,'0')).join('');
   if(run.files.size!==run.fileCount||actual!==run.fileDigest)throw labError('LAB_FROZEN_FILE_PLAN_MISMATCH');
   run.sealed=true;
   run.fileIds=null;
   run.fileHasher=null;
  }
  return {files:run.files.size,sealed:run.sealed};
 }
 function targetKey(run,path,size=0) {
  path=leafPath(path);
  return localUploadKey(run.target,{size,name:path.split('/').at(-1)},path,'mixed');
 }
 function requests(session,run,limit,signal=run.controller.signal,category='transfer') {
  let count=0;
  return ()=>{
   signal.throwIfAborted();
   if(++count>limit)throw labError('LAB_OPERATION_REQUEST_LIMIT');
   meter(session,run,'providerRequests',1,category);
  };
 }
 function projectDescription(session) {
  const headroom={};
  for(const [index,field] of budgetFields.entries())
   headroom[field]=field==='seconds'?Math.max(0,Math.floor((session.expiresAt-clock())/1000)):
    field==='diskBytes'?Math.min(session.diskBytes,limits.maxDiskBytes):maximums[index]-(session.counters[field]??0);
  return {protocol:labProtocol,evidenceClass:build.labEvidenceClass??'installed-extension-cloudflare',engineVersion:build.apiVersion,
   extensionVersion:build.extensionVersion,commit:build.revision,sourceDigest:build.sourceDigest,
   scopeId:session.id,provider:'cloudflare',accountId:session.target.accountId,bucketName:session.target.bucketName,
   prefix:session.target.prefix,mode:session.mode,
   expiresAt:session.expiresAt,checkedAt:session.checkedAt,headroom,limits,
   operations:session.mode==='read-write'?['upload','download','metadata','list']:['download','metadata','list'],
   diagnostics:session.report.snapshot(),
   ...(session.ceilings?{campaign:{policyVersion:campaignPolicyVersion,approved:session.ceilings,
     headroom:campaignHeadroom(session),maxFileBytes:maximumObjectBytes,maxTransferSeconds:timerSeconds,
     auditPageSize,authorizedMinutes:session.minutes,campaignId:session.campaignId}}:{}),
   unsupported,readback:'independent OAuth Object API streaming with strong ETag and SHA-256'};
 }
 function uploadOptions(input,run){
  if(!validInt(input.size,0,run.policy?maximumObjectBytes:limits.maxFileBytes)||
     !validInt(input.timeout,1,run.policy?.transferSeconds??limits.maxTransferSeconds)||!uploadId(input.id))
   throw labError('INVALID_TRANSFER_OPTIONS');
 }
 async function transferOpen(session,run,method,input) {
  requireKeys(input,method==='uploadOpen'?['id','path','size','sha256','timeout','contentType']:['id','path','size','etag','version','timeout']);
  uploadOptions(input,run);
  if(run.transferIds.has(input.id))throw labError('TRANSFER_ID_REUSED');
  if(input.size>run.budget.diskBytes||run.transfer)throw labError('LAB_SPOOL_UNAVAILABLE');
  const key=targetKey(run,input.path,input.size);
  const write=method==='uploadOpen';
  let retryPrecommit=false;
  if(run.policy){
   const frozen=run.files.get(input.path);
   if(!run.sealed||!frozen||frozen.size!==input.size||write&&(frozen.id!==input.id||frozen.hash!==input.sha256))
    throw labError('LAB_FROZEN_FILE_PLAN_MISMATCH');
   if(write){
    const old=await readUploadOutcome?.(input.id);
    if(old?.state==='verified'||old?.localUpload?.commitRequested===true)throw labError('LAB_OPERATION_RECONCILIATION_REQUIRED');
    retryPrecommit=run.recoveryMode==='continue'&&['cancelled','failed'].includes(old?.state)&&
     old.localUpload?.commitRequested===false&&old.localUpload.batchId===run.id&&old.localUpload.key===key;
   }
  }
  if(write&&(run.mode!=='write'||!validHash(input.sha256)))throw labError('LAB_WRITE_SCOPE_DENIED');
  if(write&&(typeof input.contentType!=='string'||!/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(input.contentType)||input.contentType.length>128))
   throw labError('INVALID_CONTENT_TYPE');
  if(!write&&(input.etag!==null&&typeof input.etag!=='string'||input.version!==null&&typeof input.version!=='string'))
   throw labError('INVALID_OBJECT_IDENTITY');
  const reservation=write?{files:1,trafficBytes:input.size*limits.uploadTrafficFactor,operations:1}:
   {trafficBytes:input.size,operations:1};
  charge(session,run,reservation);
  let spool;
  try{spool=await openLabSpool(session.directory,input.size);}
  catch(error){
   for(const [field,amount] of Object.entries(reservation)){run.used[field]-=amount;session.counters[field]-=amount;}
   throw error;
  }
  if(grant!==session||session.run!==run){
   await spool.close();
   throw labError('LAB_AUTHORIZATION_EXPIRED');
  }
  const controller=new AbortController();
  const deadline=new AbortController();
  const absolute=setTimeout(()=>deadline.abort(labError('LAB_FILE_TRANSFER_TIMEOUT')),input.timeout*1000);
  absolute.unref?.();
  const signal=AbortSignal.any([run.controller.signal,controller.signal,deadline.signal,
   ...(run.transferController?[run.transferController.signal]:[])]);
  const transfer={key,spool,controller,signal,input,kind:write?'upload':'download',offset:0,
   state:write?'staging':'running',progress:{phase:write?'staging':'reading',bytes:0},retryPrecommit};
  run.transferIds.add(input.id);
  transfer.absoluteTimer=absolute;
  transfer.idleMs=run.policy?.inactivitySeconds*1000||0;
  run.transfer=transfer;
  progressTransfer(transfer,transfer.progress.phase,0,true);
  if(!write)launch(session,run,transfer,()=>download(session,run,transfer));
  return {id:input.id,chunkBytes};
 }
 function progressTransfer(transfer,phase,bytes,initial=false){
  if(!initial&&transfer.progress.phase===phase&&bytes<=transfer.progress.bytes)return;
  transfer.progress={phase,bytes};
  if(!transfer.idleMs)return;
  clearTimeout(transfer.idleTimer);
  transfer.idleTimer=setTimeout(()=>transfer.controller.abort(labError('LAB_TRANSFER_INACTIVITY')),transfer.idleMs);
  transfer.idleTimer.unref?.();
 }
 function launch(session,run,transfer,work) {
  transfer.state='running';
  transfer.task=Promise.resolve().then(work).then(result=>{
   transfer.result=result;
  },error=>{
   transfer.result={state:transfer.kind==='upload'&&transfer.submitted?'UNCERTAIN':
    transfer.signal.aborted?'CANCELLED':'FAIL',code:typed(transfer.signal.aborted?transfer.signal.reason:error)};
  }).finally(()=>{transfer.state='terminal';clearTimeout(transfer.idleTimer);clearTimeout(transfer.absoluteTimer);});
 }
 async function download(session,run,transfer) {
  const {input,key,signal,spool}=transfer;
  const api=fileApi(session.sessionId,requests(session,run,limits.readRequests,signal));
  const timeouts=run.policy?{requestTimeoutMs:run.policy.requestSeconds*1000}:{};
  const result=await api.run('stat',{source:run.target,key},{signal,...timeouts});
  if(result.state!=='completed')throw labError(uploadCode(result.code,'METADATA_FAILED'));
  const observed=identity(result.data?.object,key);
  if(!observed)throw labError('OBJECT_MISSING');
  if(observed.size!==input.size||input.etag!==null&&observed.etag!==objectETag(input.etag)||
   input.version!==null&&observed.version!==null&&observed.version!==input.version)throw labError('OBJECT_CHANGED');
  const data=await api.run('readStream',{source:run.target,key,expectedSize:observed.size,etag:observed.etag,representationMetadata:!!run.policy},{
   signal,...timeouts,onChunk:async bytes=>{
    live(session);
    signal.throwIfAborted();
    await spool.append(bytes);
    progressTransfer(transfer,'reading',spool.bytes);
   }});
  if(data.state!=='completed'||data.data?.size!==observed.size)throw labError(uploadCode(data.code,'READBACK_FAILED'));
  if(run.policy){
   const final=await api.run('stat',{source:run.target,key},{signal,...timeouts});
   if(final.state!=='completed')throw labError(uploadCode(final.code,'METADATA_FAILED'));
   const after=identity(final.data?.object,key);
   if(!after||after.etag!==observed.etag||after.size!==observed.size||after.version!==observed.version||after.modifiedAt!==observed.modifiedAt)
    throw labError('OBJECT_CHANGED');
  }
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
  const binding={target:run.target,sessionId:session.sessionId,stagingPrefix,beforeRequest,retryPrecommit:transfer.retryPrecommit,
   assertAuthorized:()=>check(session)};
  signal.throwIfAborted();
  transfer.submitted=true;
  const timeouts=run.policy?{requestTimeoutMs:run.policy.requestSeconds*1000,uploadTimeoutMs:run.policy.uploadSeconds*1000,
   verificationTimeoutMs:run.policy.verificationSeconds*1000,verificationIdleTimeoutMs:run.policy.inactivitySeconds*1000}:undefined;
  const result=await upload({ticket:input.id,batchId:run.id,relativePath:input.path,file,binding,timeouts},
   {signal,abort:()=>transfer.controller.abort()},
   progress=>{
    if(typeof progress.phase==='string'&&validInt(progress.bytes,0,input.size))
     progressTransfer(transfer,progress.phase,progress.bytes);
   });
  if(result.state!=='completed')return {state:({skipped:'CONFLICT',uncertain:'UNCERTAIN',cancelled:'CANCELLED',blocked:'BLOCKED'})[result.state]??'FAIL',
   code:signal.aborted?typed(signal.reason):uploadCode(result.code,'UPLOAD_NOT_VERIFIED')};
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
 function startAudit(run){
  if(!run.policy?.audit.seconds)throw labError('LAB_AUDIT_NOT_RESERVED');
  if(run.transfer)throw labError('TRANSFER_BUSY');
  if(!run.auditSignal){
   const controller=new AbortController();
   const seconds=Math.min(run.policy.audit.seconds*1000,Math.max(0,run.deadline-clock()));
   run.auditDeadline=clock()+seconds;
   run.auditTimer=setTimeout(()=>controller.abort(labError('LAB_AUDIT_DEADLINE')),seconds);
   run.auditTimer.unref?.();
   run.auditSignal=AbortSignal.any([run.controller.signal,controller.signal]);
  }
  run.auditSignal.throwIfAborted();
  return run.auditSignal;
 }
 async function auditList(session,run,input){
  requireKeys(input,['cursor']);
  if(typeof input.cursor!=='string'||input.cursor.length>36)throw labError('INVALID_INPUT');
  const signal=startAudit(run);
  if(!input.cursor)run.auditScan={next:'',providerCursor:'',seen:new Set(),entries:[],at:0,done:false};
  const scan=run.auditScan;
  if(!scan||scan.done||input.cursor!==scan.next)throw labError('LAB_AUDIT_CURSOR_INVALID');
  meter(session,run,'operations',1,'audit');
  let providerCalls=0;
  if(scan.at===scan.entries.length){
   const count=requests(session,run,limits.listRequests,signal,'audit');
   const api=fileApi(session.sessionId,()=>{count();providerCalls++;});
   const result=await api.run('listRaw',{source:run.target,cursor:scan.providerCursor,perPage:auditPageSize},
    {signal,requestTimeoutMs:run.policy.requestSeconds*1000});
   signal.throwIfAborted();
   if(result.state!=='completed')throw labError(uploadCode(result.code,'LIST_FAILED'));
   const {entries,cursor}=result.data;
   if(!Array.isArray(entries)||entries.length>auditPageSize||typeof cursor!=='string'||cursor.length>2048||cursor&&scan.seen.has(cursor))
    throw labError('INVALID_PROVIDER_RESPONSE');
   const page=entries.map(item=>{
    const key=item.key,size=item.size;
    if(typeof key!=='string'||!key.startsWith(run.target.prefix)||utf8Length(key)>1024||!validInt(size))
     throw labError('INVALID_PROVIDER_RESPONSE');
    let etag=null;
    try{etag=objectETag(item.etag);if(utf8Length(etag)>256)etag=null;}catch{/* Identity may be absent. */}
    const version=typeof item.version==='string'&&utf8Length(item.version)<=256?item.version:null;
    return {key,size,etag,version,staging:key.slice(run.target.prefix.length).startsWith('.redown-beta-uploads/')};
   });
   // Scope cursors remain private to this scan. Meter modeled JSON traffic from
   // the actual page projection once, even if it needs multiple relay frames.
   meter(session,run,'trafficBytes',utf8Length(JSON.stringify(page)), 'audit');
   if(cursor)scan.seen.add(cursor);
   Object.assign(scan,{providerCursor:cursor,entries:page,at:0});
  }
  const entries=[];
  // Relative to the 350 KB policy, reserve ample space for the envelope.
  let bytes=1024;
  while(scan.at<scan.entries.length){
   const entry=scan.entries[scan.at],size=utf8Length(JSON.stringify(entry))+1;
   if(bytes+size>auditFrameBytes){
    if(!entries.length)throw labError('LIST_PAGE_FRAME_LIMIT');
    break;
   }
   entries.push(entry);bytes+=size;scan.at++;
  }
  scan.done=scan.at===scan.entries.length&&!scan.providerCursor;
  scan.next=scan.done?'':crypto.randomUUID();
  return {entries,cursor:scan.next,providerCalls};
 }
 async function campaignOutcome(session,run,input){
  requireKeys(input,['id','path','size']);
  if(!run.policy||!run.sealed||run.files.get(input.path)?.id!==input.id||!uploadId(input.id)||!validInt(input.size,0,maximumObjectBytes))throw labError('INVALID_INPUT');
  const key=targetKey(run,input.path,input.size);
  const result=await readUploadOutcome?.(input.id);
  if(!result||result.localUpload?.key!==key||result.localUpload?.batchId!==run.id||
     result.localUpload?.size!==input.size||result.localUpload?.source?.accountId!==run.target.accountId||
     result.localUpload?.source?.bucketName!==run.target.bucketName)return {state:'UNKNOWN'};
  if(result.state==='verified')return {state:'ACKNOWLEDGED',receipt:cleanReceipt(result.receipt,key,input.size,input.id)};
  if(['pending','cancelled','failed'].includes(result.state)&&result.localUpload.commitRequested===false)
   return {state:'NOT_COMMITTED'};
  if(result.localUpload.commitRequested&&['pending','uncertain'].includes(result.state)&&reconcileUpload&&session.mode==='read-write'){
   const category=run.policy.execution==='audit'?'audit':'transfer';
   const signal=category==='audit'?startAudit(run):run.transferController.signal;
   meter(session,run,'operations',1,category);
   const receipt=await reconcileUpload(result.localUpload,{signal,expectedSession:session.sessionId,
    beforeRequest:requests(session,run,limits.statRequests,signal,category)});
   if(receipt)return {state:'ACKNOWLEDGED',receipt:cleanReceipt(receipt,key,input.size,input.id)};
  }
  return {state:'UNKNOWN'};
 }
 async function query(session,method,input) {
  switch(method) {
   case 'describe':requireKeys(input,[]);return projectDescription(session);
   case 'admit':return admit(session,input);
   case 'admitCampaign':return admitCampaign(session,input);
   case 'releaseRun':requireKeys(input,[]);abortRun(session);return {released:true};
  }
  const run=requireRun(session);
  if(method==='registerCampaignFiles')return registerFiles(run,input);
  if(method==='auditList')return auditList(session,run,input);
  if(method==='drainCampaign'){
   requireKeys(input,[]);
   if(!run.policy)throw labError('LAB_RUN_REQUIRED');
   const transfer=run.transfer;
   if(!transfer)return {drained:true};
   if(transfer.state==='running'){
    transfer.controller.abort(labError('LAB_TRANSFER_DRAINING'));
    return {drained:false};
   }
   clearTimeout(transfer.idleTimer);clearTimeout(transfer.absoluteTimer);
   await transfer.spool.close();run.transfer=null;
   return {drained:true};
  }
  if(method==='campaignOutcome')return campaignOutcome(session,run,input);
  if(method==='campaignUsage'){
   requireKeys(input,[]);
   if(!run.policy)throw labError('LAB_RUN_REQUIRED');
   return {transfer:run.used,audit:run.auditUsed,session:session.counters,
    modeledCostMicros:costMicros(session.counters.providerRequests,session.counters.trafficBytes)};
  }
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
   clearTimeout(transfer.idleTimer);clearTimeout(transfer.absoluteTimer);
   await spool.close();run.transfer=null;return {closed:true};
  }
  if(method==='uploadStart'&&transfer.kind==='upload'&&transfer.state==='staging'){
   launch(session,run,transfer,()=>submit(session,run,transfer));return {started:true};
  }
  if(method==='uploadAppend'&&transfer.kind==='upload'&&transfer.state==='staging'){
   signal.throwIfAborted();
   await spool.append(decodeFrame(input.bytesBase64),input.offset);
   progressTransfer(transfer,'staging',spool.bytes);
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
    const previous=await scopes(input.accountId,input.bucketName);
    const allowed=new Set(previous.map(row=>row.id));
    const keys=(await storage.getKeys?.()??[]).filter(key=>key.startsWith('pythonLabCampaignV1:')&&allowed.has(key.split(':')[1]));
    const campaigns=keys.length?Object.values(await storage.get(keys)):[];
    return {scopes:previous,campaigns};
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
