import {localUploadKey,uploadId,uploadError} from '../local-upload-plan.mjs';
import {uploadCode} from '../local-upload-service.mjs';
import {objectETag,key as objectKey,name} from '../../explorer/file-api.mjs';
import {normalizeTarget,normalizePrefix} from '../../core/menu-identity.mjs';
import {chunkBytes,decodeFrame,encodeFrame,labError,labSpoolDirectory,openLabSpool,utf8Length,validHash} from './spool.mjs';

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
const scopeKey='pythonLabRecoveryScopesV1';
const freshness=30*86400_000;
const available=data=>({apiVersion:labProtocol,state:'available',data});
const failure=code=>({apiVersion:labProtocol,state:'failed',error:{code}});
const typed=error=>uploadCode(error?.code,'LAB_REQUEST_FAILED');

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

export function createPythonLab({runtime,storage,build,authority,buckets,checkBucket,workerPrefix,checkUpload,upload,
 fileApi,spoolDirectory=labSpoolDirectory,storageEstimate=estimateStorage,clock=Date.now}) {
 let grant=null,starting=false,generation=0,lastCode=null;
 const status=()=>grant?{
  state:grant.client?'CONNECTED':grant.ticket?'PAIRED':grant.ready?'PAIRING':'STARTING',
  ready:grant.ready,scopeId:grant.id,bucketName:grant.target.bucketName,prefix:grant.target.prefix,
  mode:grant.mode,expiresAt:grant.expiresAt,codeExpiresAt:grant.codeExpiresAt,
  pairCode:grant.ready?grant.pairCode:null,code:lastCode
 }:{state:starting?'STARTING':'OFF',code:lastCode};

 function abortRun(session) {
  const run=session.run;
  session.run=null;
  if(!run)return;
  clearTimeout(run.timer);
  run.controller.abort();
  const transfer=run.transfer;
  if(transfer)void Promise.resolve(transfer.task).finally(()=>transfer.spool.close()).catch(()=>{});
 }
 function revoke(code='LAB_SESSION_ENDED') {
  generation++;
  const session=grant;
  grant=null;
  lastCode=code;
  if(!session)return;
  clearTimeout(session.timer);
  abortRun(session);
  try{session.port?.disconnect();}catch{}
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
  if(grant!==session||clock()>=session.expiresAt)throw labError('LAB_AUTHORIZATION_EXPIRED');
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
 async function start(input) {
  requireKeys(input,['accountId','bucketName','mode','minutes','scopeId']);
  const {accountId,bucketName,mode,minutes,scopeId}=input;
  if(starting||grant)throw labError('LAB_SESSION_ALREADY_OPEN');
  if(runtime.id!==extensionId)throw labError('LAB_EXTENSION_ID_MISMATCH');
  if(!/^[0-9a-f]{32}$/.test(accountId??'')||!/^[a-z0-9][a-z0-9-]{1,62}$/.test(bucketName??'')||
   !['read-only','read-write'].includes(mode)||![15,30,60].includes(minutes)||
   (mode==='read-only'?!uploadId(scopeId):scopeId!==null))throw labError('INVALID_INPUT');
  starting=true;lastCode=null;
  const epoch=++generation;
  let session;
  try {
   const root=normalizeTarget({provider:'cloudflare',connectionId:'cloudflare:'+accountId,accountId,bucketName,prefix:''});
   const auth=await sessionAuthority(root,mode);
   await checkBucket(root,auth);
   const previous=mode==='read-only'?(await scopes(accountId,bucketName)).find(row=>row.id===scopeId):null;
   if(mode==='read-only'&&!previous)throw labError('LAB_RECOVERY_SCOPE_NOT_FOUND');
   const id=previous?.id??crypto.randomUUID();
   const parent=mode==='read-write'?normalizePrefix(await workerPrefix(root)):'';
   const target=normalizeTarget({...root,prefix:previous?.prefix??parent+'.redown-python-lab/'+id+'/'});
   const checked=mode==='read-write'?await checkUpload(target,AbortSignal.timeout(35_000)):null;
   if(checked&&checked.sessionId!==auth.sessionId)throw labError('AUTH_SESSION_CHANGED');
   // Scope is fixed before launching the relay. Opening the card never provisions a Worker.
   const directory=await spoolDirectory();
   const estimate=await storageEstimate();
   const free=Number.isFinite(estimate?.quota)&&Number.isFinite(estimate?.usage)?Math.max(0,estimate.quota-estimate.usage):null;
   const diskBytes=free===null?limits.maxDiskBytes:Math.min(limits.maxDiskBytes,Math.floor(free));
   await sessionAuthority(target,mode,auth.sessionId);
   if(epoch!==generation)throw labError('LAB_SESSION_ENDED');
   const now=clock();
   session={id,target,mode,directory,diskBytes,sessionId:auth.sessionId,checkedAt:now,expiresAt:now+minutes*60_000,
    ready:false,client:null,ticket:null,attempts:0,usedRuns:new Set(),run:null,counters:{files:0,trafficBytes:0,providerRequests:0,operations:0}};
   refreshCode(session);
   grant=session;
   session.port=runtime.connectNative(labHostName);
   session.port.onMessage.addListener(message=>void receive(session,message));
   session.port.onDisconnect.addListener(()=>{
    const error=runtime.lastError?.message??'';
    if(grant===session)revoke(/not found|not registered/i.test(error)?'NATIVE_HOST_NOT_REGISTERED':'NATIVE_HOST_DISCONNECTED');
   });
   session.timer=setTimeout(()=>{if(grant===session)revoke('LAB_AUTHORIZATION_EXPIRED');},minutes*60_000);
   session.timer.unref?.();
   return status();
  }catch(error){
   if(session&&grant===session)revoke(typed(error));
   else if(epoch===generation)lastCode=typed(error);
   throw error;
  }finally{starting=false;}
 }
 function refreshCode(session) {
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
  const run={id:runId,mode,budget,used:{files:0,trafficBytes:0,providerRequests:0,operations:0},controller,
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
   unsupported,readback:'independent OAuth Object API streaming with strong ETag and SHA-256'};
 }
 function uploadOptions(input){
  if(!validInt(input.size,0,limits.maxFileBytes)||!validInt(input.timeout,1,limits.maxTransferSeconds)||!uploadId(input.id))
   throw labError('INVALID_TRANSFER_OPTIONS');
 }
 async function transferOpen(session,run,method,input) {
  requireKeys(input,method==='uploadOpen'?['id','path','size','sha256','timeout','contentType']:['id','path','size','etag','version','timeout']);
  uploadOptions(input);
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
  if(message?.type==='ready'){if(!session.ready){session.ready=true;refreshCode(session);}return;}
  if(!uploadId(message?.client))return;
  if(message.type==='closed'){
   if(session.client===message.client){session.client=null;abortRun(session);}
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
  }catch(error){response=failure(typed(error));}
  finally{if(session.inFlight===message.id)session.inFlight=null;}
  if(grant===session)try{session.port.postMessage({id:message.id,response});}catch{revoke('NATIVE_HOST_DISCONNECTED');}
 }
 return Object.freeze({revoke,async ui(action,input={}){
  switch(action){
   case 'status':return status();
   case 'accounts':return {accounts:(await authority()).accounts.map(({id,name})=>({id,name}))};
   case 'buckets':{
    requireKeys(input,['accountId','cursor']);
    if(!/^[0-9a-f]{32}$/.test(input.accountId??'')||typeof input.cursor!=='string'||input.cursor.length>2048)throw labError('INVALID_INPUT');
    return buckets(input.accountId,input.cursor);
   }
   case 'recovery':{
    requireKeys(input,['accountId','bucketName']);
    const auth=await authority();
    if(!auth.accounts.some(row=>row.id===input.accountId))throw labError('SCOPE_UNAUTHORIZED');
    return {scopes:await scopes(input.accountId,input.bucketName)};
   }
   case 'start':return start(input);
   case 'end':revoke();return status();
   case 'newCode':
    if(!grant?.ready||grant.client)throw labError('LAB_SESSION_NOT_IDLE');
    grant.ticket=null;refreshCode(grant);return status();
   default:throw uploadError('UNSUPPORTED_OPERATION','Unknown laboratory action.');
  }
 }});
}
