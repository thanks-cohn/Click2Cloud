import {passiveObservation} from '../core/boundary-observation.mjs';
import {sourceURL} from './public-address.mjs';
import {createRemoteSaver} from '../../right2cloud-module/src/index.mjs';
import {equal,canonicalSource} from '../../right2cloud-module/src/common.mjs';
import {remoteDestination,PROTOCOL,signGrant,digest,boundedJSON,fail} from './wire.mjs';
import {scopeKey} from '../core/menu-identity.mjs';
import {SCREENSHOT_PLAN_BYTES,screenshotBody,validateScreenshotIntent} from './screenshot-wire.mjs';

// Durable write evidence is bucket-wide, but every use stays inside the
// signed plan's exact account, bucket and prefix. This is local preparation
// evidence only. Dispatch still needs live OAuth authority and Worker checks.
// Kept for callers reporting historical build identities. Compatibility is
// decided by the authenticated protocol and capability response.
const release0320WorkerDigest='c7V2KvPfvPzNTga8RlR_Tl8AUL7AVGsI1kvc1yDO210';
export const previousWorkerDigests=Object.freeze([release0320WorkerDigest,'Nyd2B_8P0CiVwmx9-r1H1k2vcwtywH0MeTMmNL1bCrM']);
export function preparedDestination(plan,target){
 const d=remoteDestination(target);
 if(plan?.state!=='ready')return {state:'blocked',code:'WORKER_SETUP_REQUIRED'};
 if(plan.accountId!==d.accountId||plan.bucketName!==d.bucketName)return {state:'blocked',code:'TRANSPORT_PLAN_INVALID'};
 if(plan.protocol!==PROTOCOL)return {state:'blocked',code:'WORKER_PROTOCOL_INCOMPATIBLE'};
 if(!plan.secret)return {state:'blocked',code:'WORKER_SIGNING_RENEWAL_APPROVAL_REQUIRED'};
 if(plan.prefixScope&&d.prefix!==plan.prefixScope&&!d.prefix.startsWith(plan.prefixScope+'/'))return {state:'blocked',code:'WORKER_DESTINATION_SCOPE_REQUIRED'};
 return plan.codeDigest&&Object.values(plan.verifiedTargets??{}).some(proof=>proof.codeDigest===plan.codeDigest)
  ?{state:'READY'}:{state:'PREPARED',code:'WRITE_PROOF_REQUIRED'};
}

export function createRemoteTransport({oauth,lookup,fetch:fetcher=globalThis.fetch,authorizeSource=async()=>true,verifyAuthority=async()=>true,clock=Date.now,record=async()=>{},pollIntervalMs=1000,expectedCodeDigest=null}){
 // Per-gesture capability evidence, never persisted or shared across clicks.
 // Fresh OAuth, plan, prefix and verifyAuthority checks still run before each use.
 const readyProofs=new WeakMap();
 const maxActiveSaves=32;
 const activeSaves=new Map();
 async function requestRemoteCancel(target,operationId){
  const c=await cap(target,{use:'cancel',operationId,live:false});
  return post(c,'/cancel',{});
 }
 function requestJobCancel(job,operationId){
  if(job.finished)return {state:'finished'};
  if(job.cancelRequested)return {state:'cancelling'};
  job.cancelRequested=true;
  job.onCancelling();
  if(!job.submitted)job.controller.abort();
  else job.sendCancel();
  return {state:'cancelling'};
 }
 const planIdentity=plan=>digest([plan.state,plan.accountId,plan.bucketName,plan.protocol,plan.url,plan.secret,plan.prefixScope??'',plan.codeDigest,plan.verifiedTargets]);
 async function cap(target,{use='status',operationId,source,provenance,fileIntent,screenshotIntent,screenshotAction,sourceBucket,live=true,beforeRequest}={}){
  const a=await oauth.authority();if(!a.accounts.some(x=>x.id===target.accountId))fail('SCOPE_UNAUTHORIZED');
  const plan=await lookup(target,sourceBucket);if(plan?.state!=='ready')fail('WORKER_SETUP_REQUIRED');
  if(plan.accountId!==target.accountId||plan.bucketName!==target.bucketName||plan.sourceBucket!==sourceBucket)fail('TRANSPORT_PLAN_INVALID');
  if(plan.protocol!==PROTOCOL)fail('WORKER_PROTOCOL_INCOMPATIBLE');
  if(typeof plan.secret!=='string'||!plan.secret)fail('WORKER_SIGNING_RENEWAL_APPROVAL_REQUIRED');
  if(live&&use!=='revoke'){
   beforeRequest?.();
   if(await verifyAuthority(target,a)!==true)fail('AUTHORIZATION_REVOKED');
   if(sourceBucket){beforeRequest?.();if(await verifyAuthority({...target,bucketName:sourceBucket,prefix:''},a)!==true)fail('AUTHORIZATION_REVOKED');}
  }
  const u=new URL(plan.url);if(u.protocol!=='https:'||!u.hostname.endsWith('.workers.dev')||plan.name&&!u.hostname.startsWith(plan.name+'.')||u.username||u.password||u.pathname!=='/'||u.search||u.hash)fail('WORKER_ADDRESS_INVALID');
  const destination=remoteDestination(target);if(plan.prefixScope&&destination.prefix!==plan.prefixScope&&!destination.prefix.startsWith(plan.prefixScope+'/'))fail('WORKER_DESTINATION_SCOPE_REQUIRED');const expiresAt=clock()+120000;
  const payload={protocol:PROTOCOL,use,principal:target.connectionId,sessionId:a.sessionId,destination,expiresAt,...(operationId?{operationId,...(source?{sourceDigest:await digest(canonicalSource(source))}:{}),...(provenance?{provenanceDigest:await digest(provenance)}:{}),...(fileIntent?{fileDigest:await digest(fileIntent)}:{}),...(screenshotIntent?{screenshotDigest:await digest(screenshotIntent),screenshotAction}:{})}:{})};
  return {destination,prefixScope:plan.prefixScope??'',sourceBucket,expiresAt,sessionId:a.sessionId,codeDigest:plan.codeDigest,url:u.origin,token:await signGrant(plan.secret,payload),planIdentity:await planIdentity(plan)};
 }
 async function post(c,path,input,signal,onObservation){
  const requestStarted=performance.now();
  const deadline=AbortSignal.any([AbortSignal.timeout(30000),...(signal?[signal]:[])]);
  let response;try{response=await fetcher(c.url+path,{method:'POST',redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',headers:{authorization:'Bearer '+c.token,'content-type':'application/json'},body:JSON.stringify(input),signal:deadline});}catch{fail('TRANSPORT_UNAVAILABLE');}
  passiveObservation(onObservation,{stage:'provider.request',durationMs:performance.now()-requestStarted,outcome:'ok'});
  if(path==='/capabilities'&&response.status===404){await response.body?.cancel().catch(()=>{});fail('WORKER_ENDPOINT_MISSING');}
  const value=await boundedJSON(response);if(!response.ok&&!['blocked','uncertain'].includes(value.state))fail('TRANSPORT_UNAVAILABLE');return value;
 }
 function checkCapabilities(c,features){
  if(features.state!=='completed')fail(features.code??'WORKER_NOT_READY');
  if((expectedCodeDigest||c.codeDigest||features.codeDigest)&&features.codeDigest!==c.codeDigest)fail('WORKER_BUILD_MISMATCH');
  if(!equal(features.destination,c.destination)||c.sourceBucket&&(features.sourceBucket!==c.sourceBucket||!features.sourceBound))
   fail('WORKER_BINDING_MISMATCH');
  if(features.protocol!==PROTOCOL||!features.storageBound||!features.durableClaims||!features.conditionalCreate)
   fail('WORKER_PROTOCOL_INCOMPATIBLE');
 }
 function pollDelay(ms,signal){
  return new Promise((resolve,reject)=>{
   const abort=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(Error('CANCELLED'));};
   const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);
   if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  });
 }
 async function recheck(c,target,{live=true,matchPlan=false,reportDenial=false,beforeRequest}={}){
  try{
   const a=await oauth.authority();
   if(a.sessionId!==c.sessionId||!a.accounts.some(x=>x.id===target.accountId)||c.expiresAt<=clock()||
     matchPlan&&await planIdentity(await lookup(target))!==c.planIdentity)return false;
   if(!live)return true;
   beforeRequest?.();
   if(await verifyAuthority(target,a)!==true)return false;
   if(!c.sourceBucket)return true;
   beforeRequest?.();
   return await verifyAuthority({...target,bucketName:c.sourceBucket,prefix:''},a)===true;
  }catch(error){if(reportDenial)throw error;return false;}
 }
 const screenshotCode=(error,fallback)=>/^[A-Z][A-Z0-9_]{1,79}$/.test(error?.code??'')?error.code:fallback;
 async function screenshotCapability(target,c,signal){
  if(!expectedCodeDigest||c.codeDigest===expectedCodeDigest)return;
  const read=await cap(target,{live:false});
  if(read.sessionId!==c.sessionId||read.planIdentity!==c.planIdentity)fail('AUTHORIZATION_REVOKED');
  const features=await post(read,'/capabilities',{},signal);
  checkCapabilities(c,features);
  if(features.screenshotTransfer!=='signed-png-fan-out-v1')fail('SCREENSHOT_WORKER_UPDATE_REQUIRED');
 }
 async function resolveScreenshotTargets(outputs,previousTarget){
  const groups=new Map(),excluded=[];
  for(const output of outputs){
   if(new TextEncoder().encode(output.key).length>1024){excluded.push({outputId:output.outputId,state:'blocked',code:'KEY_TOO_LONG'});continue;}
   const scope=scopeKey(output.target);
   if(!groups.has(scope))groups.set(scope,[]);
   groups.get(scope).push(output);
  }
  let target;
  let allowed=[];
  for(const [scope,group] of groups){
   const block=(entries,code)=>{for(const output of entries)excluded.push({outputId:output.outputId,state:'blocked',code});};
   if(target||previousTarget&&scopeKey(previousTarget)!==scope){block(group,'SCREENSHOT_CROSS_BUCKET_UNSUPPORTED');continue;}
   try{
    const plan=await lookup(group[0].target);
    const inside=group.filter(({target})=>!plan?.prefixScope||target.prefix===plan.prefixScope||target.prefix.startsWith(plan.prefixScope+'/'));
    const inScope=new Set(inside);
    block(group.filter(output=>!inScope.has(output)),'WORKER_DESTINATION_SCOPE_REQUIRED');
    if(!inside.length)continue;
    try{
     const c=await cap(inside[0].target,{use:'screenshot'});
     await screenshotCapability(inside[0].target,c);
     target=inside[0].target;
     allowed=inside;
    }catch(error){block(inside,screenshotCode(error,'SCREENSHOT_WORKER_UNAVAILABLE'));}
   }catch(error){block(group,screenshotCode(error,'SCREENSHOT_WORKER_UNAVAILABLE'));}
  }
  return {target:target??previousTarget??null,outputs:allowed,excluded};
 }
 async function deliverScreenshot({plan,selection,image,byteLength,imageDigest,retry=false,verify=false}){
  const {target,outputs}=selection;
  const intent={captureId:plan.captureId,signalId:plan.signalId,operationId:plan.operationId,byteLength,imageDigest,retry,
   outputs:outputs.map(({outputId,key,target})=>({outputId,key,prefix:target.prefix}))};
  const action=verify?'verify':'write';
  const c=await cap(target,{use:'screenshot',operationId:plan.operationId,screenshotIntent:intent,screenshotAction:action,live:false});
  validateScreenshotIntent(intent,c.prefixScope);
  await screenshotCapability(target,c);
  if(!await recheck(c,target,{matchPlan:true}))fail('AUTHORIZATION_REVOKED');
  const body=verify?JSON.stringify(intent):screenshotBody(intent,image);
  let response;
  try{response=await fetcher(c.url+(verify?'/screenshot/verify':'/screenshot'),{method:'POST',redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',
   headers:{authorization:'Bearer '+c.token,'content-type':verify?'application/json':body.type},body,signal:AbortSignal.timeout(26000)});}
  catch{fail('SCREENSHOT_WORKER_RESPONSE_LOST');}
  const value=await boundedJSON(response,SCREENSHOT_PLAN_BYTES*3);
  if(value.operationId!==plan.operationId||value.captureId!==plan.captureId||!Array.isArray(value.outputs)){
   fail(screenshotCode(value,'SCREENSHOT_WORKER_RESPONSE_LOST'));
  }
  const byId=new Map(value.outputs.map(output=>[output.outputId,output]));
  return outputs.map(planned=>{
   const observed=byId.get(planned.outputId);
   const unknown={outputId:planned.outputId,state:'unknown',code:'SCREENSHOT_OBJECT_UNCONFIRMED',comparison:'unknown'};
   if(!observed||observed.key!==planned.key)return unknown;
   const at=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(observed.at??'')?observed.at:undefined;
   if(observed.state==='confirmed'&&observed.bytes===byteLength&&observed.checksum===imageDigest&&
    observed.verification==='independent-r2-head-sha256'&&typeof observed.etag==='string'&&typeof observed.version==='string')
    return {outputId:planned.outputId,state:'confirmed',code:'R2_HEAD_CHECKSUM',comparison:'match',
     verification:observed.verification,bytes:observed.bytes,checksum:observed.checksum,etag:observed.etag,version:observed.version,at};
   if(!['blocked','failed','unknown'].includes(observed.state))return unknown;
   return {outputId:planned.outputId,state:observed.state,code:screenshotCode(observed,unknown.code),at,
    comparison:observed.comparison==='mismatch'?'mismatch':'unknown',...(Number.isSafeInteger(observed.bytes)&&observed.bytes>=0?{bytes:observed.bytes}:{})};
  });
 }
 return Object.freeze({resolveScreenshotTargets,deliverScreenshot,
  screenshotWorkerCurrent:plan=>!!plan?.codeDigest&&(!expectedCodeDigest||plan.codeDigest===expectedCodeDigest),
  // Internal native-click authorization. null means expired evidence: caller
  // must perform a new status request. A changed binding fails closed instead.
  async authorizeReady(target,readiness){
   const proof=readyProofs.get(readiness);
   if(!proof||clock()<proof.at||clock()-proof.at>=10000)return null;
   try{const c=await cap(target,{live:false});return {sessionId:c.sessionId,authorizedTargets:
    equal(c.destination,proof.destination)&&c.sessionId===proof.sessionId&&c.planIdentity===proof.planIdentity?[target]:[]};}
   catch{return {sessionId:null,authorizedTargets:[]};}
  },
  filePlanCurrent:plan=>plan?.state==='ready'&&!!plan.secret&&plan.protocol===PROTOCOL,
  async status(target,{sourceBucket,onObservation}={}){
   try{
    const c=await cap(target,{sourceBucket}),features=await post(c,'/capabilities',{},undefined,onObservation);
    if(!c.codeDigest)fail('WORKER_BUILD_MISMATCH');
    checkCapabilities(c,features);
    const plan=await lookup(target,sourceBucket);
    if(!await recheck(c,target,{live:false})||!plan||await planIdentity(plan)!==c.planIdentity)fail('AUTHORIZATION_REVOKED');
    const exact=plan.verifiedTargets?.[c.destination.prefix];
    const ready=preparedDestination(plan,target).state==='READY';
    const result={state:ready?'READY':'PREPARED',proof:ready?(exact?.codeDigest===plan.codeDigest?'exact-destination-write':'same-bucket-write-and-current-scoped-capability'):null,
     destination:target,sourcePolicy:features.sourcePolicy,screenshotTransfer:features.screenshotTransfer,transfer:features.transfer,multipartConditionalCompletion:features.multipartConditionalCompletion,checkedAt:clock()};
    if(ready)readyProofs.set(result,{at:clock(),sessionId:c.sessionId,destination:c.destination,planIdentity:c.planIdentity});
    return result;
   }catch(error){return {state:'blocked',code:/^[A-Z][A-Z0-9_]+$/.test(error.code??'')?error.code:'WORKER_UNAVAILABLE'};}
  },
  async save({target,source,provenance,operationId=crypto.randomUUID(),signal,authorize=async()=>true,prepare,onBoundary,onObservation,onAccepted,dispatchPreparationMs,readinessMs}){
   // A transfer can retain polling and network state while the remote Worker
   // runs. Reject excess work immediately; there is no URL or promise queue.
   if(activeSaves.has(operationId)||activeSaves.size>=maxActiveSaves)return {state:'blocked',code:'RESOURCE_BUSY',operationId};
   const controller=new AbortController();
   signal=signal?AbortSignal.any([signal,controller.signal]):controller.signal;
   const job={target,controller,submitted:false,cancelRequested:false,finished:false,settled:false,cancelAcknowledged:false};
   activeSaves.set(operationId,job);
   try{
    const timings={pollCount:0,...(Number.isFinite(dispatchPreparationMs)?{dispatchPreparationMs}:{}),...(Number.isFinite(readinessMs)?{readinessMs}:{})};const timed=async(name,stage,fn)=>{const started=performance.now();try{try{onBoundary?.(stage,'started','REMOTE_STAGE_STARTED');}catch{}const result=await fn();try{onBoundary?.(stage,result===false?'blocked':result==null?'uncertain':['blocked','failed','uncertain'].includes(result?.state)?result.state:'ok',result===false?'REMOTE_STAGE_DENIED':result==null?'REMOTE_STAGE_UNVERIFIED':'REMOTE_STAGE_COMPLETE');}catch{}return result;}catch(e){try{onBoundary?.(stage,'failed','REMOTE_STAGE_FAILED');}catch{}throw e;}finally{timings[name]=(timings[name]??0)+Math.round(performance.now()-started);}};
    const historyContext=source?.historyContext,attemptedFilename=source?.filename,saveMode=provenance?.presentation?.placement==='quick'?'quick':provenance?.mode;
    const recordOperation=value=>record({...value,historyContext,attemptedFilename,saveMode});
    try{source=canonicalSource({...source,url:sourceURL(source?.url).href});}catch(e){return {state:'blocked',code:e.code??'SOURCE_INVALID',operationId,destination:remoteDestination(target)};}
    const start=performance.now(),destination=remoteDestination(target);
    // Durable Worker claims own duplicate prevention. Optional History cannot
    // prevent dispatch or participation in a pending Worker operation.
    let recordingProgress=false,dispatched=false;
    const recordProgress=value=>{
     if(recordingProgress)return;
     recordingProgress=true;
     void Promise.resolve().then(()=>recordOperation(value)).catch(()=>{}).finally(()=>{recordingProgress=false;});
    };
    const progress=value=>recordProgress(job.cancelRequested?{...value,code:'CANCELLATION_REQUESTED_INSPECT'}:value);
    job.onCancelling=()=>void recordOperation({state:'pending',code:'CANCELLATION_REQUESTED_INSPECT',operationId,destination}).catch(()=>{});
    job.sendCancel=()=>{
     if(job.cancelling||job.cancelAcknowledged)return job.cancelling;
     job.cancelling=requestRemoteCancel(target,operationId).then(result=>{
      job.cancelAcknowledged=result.code==='CANCELLATION_REQUESTED_INSPECT';
     }).catch(()=>{}).finally(()=>{job.cancelling=null;});
     return job.cancelling;
    };
    progress({state:'pending',code:'REMOTE_PREPARING',operationId,destination});
    if(prepare){
     const blocked=async (code,state='blocked',details={})=>{
      const result={state,code,operationId,destination,timings,...details};
      try{await recordOperation(result);}catch{/* Optional projection cannot change prepublication truth. */}
      return result;
     };
     if(!await timed('intentAuthorizationMs','intent',async()=>await authorize()&&await authorizeSource(source)))
      return blocked('AUTHORIZATION_DENIED');
     let readiness;
     try{readiness=await timed('readinessMs','worker.readiness',()=>prepare(target,{authorize,signal,onObservation}));}
     catch(error){return blocked(signal.aborted?'SAVE_CANCELLED':screenshotCode(error,'WORKER_RECOVERY_FAILED'),signal.aborted?'cancelled':'blocked');}
     if(readiness.state!=='completed')return blocked(readiness.code,readiness.state,{
      ...(readiness.requiredAction?{requiredAction:readiness.requiredAction}:{}),stage:readiness.stage??'worker-readiness'
     });
     if(signal.aborted||!await authorize())return blocked(signal.aborted?'SAVE_CANCELLED':'AUTHORIZATION_REVOKED',signal.aborted?'cancelled':'blocked');
    }
    // An instance lasts one operation; imported module URL/promise retention ends here.
    const saver=createRemoteSaver({authorize:()=>timed('intentAuthorizationMs','intent',async()=>await authorize()&&await authorizeSource(source)),
     getPreparedWorkerCapability:()=>timed('capabilityMs','worker.capability',async()=>{
      const c=await cap(target,{use:'save',operationId,source,provenance,live:false});
      if(expectedCodeDigest&&c.codeDigest!==expectedCodeDigest){
       const read=await cap(target,{live:false});
       if(read.sessionId!==c.sessionId||read.planIdentity!==c.planIdentity)fail('AUTHORIZATION_REVOKED');
       checkCapabilities(c,await post(read,'/capabilities',{},signal,onObservation));
      }
      return c;
     }),
     recheckAuthorization:(_i,c)=>timed('authorizationRecheckMs','auth.check',async()=>await recheck(c,target,{matchPlan:true,reportDenial:!dispatched})&&await authorize()),
     authenticatedRequest:(c,intent,o)=>timed('workerRequestMs','transfer.upload',async()=>{
      o.signal?.throwIfAborted();
      dispatched=job.submitted=true;
      passiveObservation(onObservation,{stage:'transfer.submitted',outcome:'ok',code:'REMOTE_SUBMISSION_ATTEMPTED'});
      const submittedAt=performance.now();
      let result=await post(c,'/remote-save',intent,o.signal,onObservation),lastLease=clock(),statusCap;
      if(result.operationId===operationId&&(result.state==='pending'&&result.code==='REMOTE_ACCEPTED'||result.state==='written'&&result.receipt))passiveObservation(onAccepted);
      if(job.cancelRequested&&result.state==='pending'){
       // The initial stop can reach the Worker before it claims the operation.
       void Promise.resolve(job.cancelling).then(()=>job.sendCancel());
      }
      const hinted=result.state==='pending'&&Number.isFinite(result.retryAfterMs);
      if(hinted)await pollDelay(Math.min(pollIntervalMs,Math.max(50,Math.min(300,result.retryAfterMs))),o.signal);
      while(result.state==='pending'){
       if(!await authorize())return {state:'uncertain',code:'AUTHORIZATION_LOST'};
       if(!job.cancelRequested&&clock()-lastLease>=30000){const renewed=await cap(target,{use:'save',operationId,source,provenance});if(renewed.sessionId!==c.sessionId)return {state:'uncertain',code:'AUTHORIZATION_LOST'};Object.assign(c,renewed);const lease=await post(c,'/lease',{},o.signal);if(lease.state!=='completed')return {state:'uncertain',code:'LEASE_DENIED'};lastLease=clock();statusCap=null;}
       // Status grants are read-only. Keep them invocation-local and invalidate
       // on OAuth session change; lease renewal and verification stay live.
       statusCap??=await cap(target,{operationId,live:false});
       if(statusCap.sessionId!==c.sessionId||!await recheck(statusCap,target,{live:false}))return {state:'uncertain',code:'AUTHORIZATION_LOST'};
       result=await post(statusCap,'/operation',{operationId,receiptOnly:true},o.signal);
       timings.pollCount++;if(result.workerTimings)for(const [key,value] of Object.entries(result.workerTimings))if(Number.isFinite(value)&&value>=0)timings['worker.'+key]=value;
       if(result.state==='verified'){job.settled=true;return {state:'written',receipt:result.receipt};}
       if(result.state==='pending'){
        progress({state:'pending',code:result.code,operationId,destination,stage:result.stage,bytes:result.bytes});
        // Account for the Worker hold and first poll against the original
        // cadence. Slow responses do not add the hold to every save.
        await pollDelay(hinted&&timings.pollCount===1?Math.max(0,pollIntervalMs-(performance.now()-submittedAt)):pollIntervalMs,o.signal);
       }
      }
      job.settled=true;
      if(result.workerTimings)for(const [key,value] of Object.entries(result.workerTimings))if(Number.isFinite(value)&&value>=0)timings['worker.'+key]=value;
      return result;
     }),
     verifyObject:(c,receipt,o)=>timed('verificationMs','transfer.verify',async()=>{const r=await post(c,'/verify',receipt,o.signal);if(r.state==='completed')passiveObservation(onObservation,{stage:'provider.verification',providerOperationId:operationId,receipt,proof:r.proof});return r.state==='completed'?r.proof:null;})});
    let result=await saver({operationId,source,destination,provenance,signal});
    job.finished=true;
    if(job.cancelRequested){
     if(!job.submitted||job.cancelAcknowledged&&result.state==='blocked'&&
        ['AUTHORIZATION_REVOKED','SOURCE_CANCELLED','INTERRUPTED','REMOTE_STAGE_FAILED'].includes(result.code))
      result={...result,state:'cancelled',code:'SAVE_CANCELLED',destination};
     else if(result.state!=='verified')
      result={...result,state:'uncertain',code:'CANCELLATION_REQUESTED_INSPECT',destination};
    }
    const final={...result,...(result.state==='uncertain'&&job.submitted&&!job.settled?{remotePending:true}:{}),timings,durationMs:Math.round(performance.now()-start)};try{await recordOperation(final);}catch{return {...final,state:final.state==='verified'?'partial':final.state,code:'COMPLETION_PENDING'};}return final;
   }finally{activeSaves.delete(operationId);}
  },
  async files({target,intent,signal,sourceBucket,expectedSession,beforeRequest,beforeDispatch}){
   const operationId=intent.operationId;let dispatched=false;
   const sendFileRequest=(...args)=>{beforeRequest?.();return post(...args);};
   try{
   const c=await cap(target,{use:'files',operationId,fileIntent:intent,sourceBucket,beforeRequest});
   if(expectedSession&&c.sessionId!==expectedSession)fail('AUTH_SESSION_CHANGED');
   const singleRename=intent.action==='rename'&&intent.entry?.folder===false;
   if(singleRename||!expectedCodeDigest||c.codeDigest!==expectedCodeDigest){
    const check=await cap(target,{sourceBucket,live:false,beforeRequest}),features=await sendFileRequest(check,'/capabilities',{});
    if(check.sessionId!==c.sessionId||check.planIdentity!==c.planIdentity||!await recheck(c,target,{live:false,matchPlan:!sourceBucket,beforeRequest}))fail('AUTHORIZATION_REVOKED');
    checkCapabilities(c,features);
    if(!Array.isArray(features.fileOperations)||!features.fileOperations.includes(intent.action))fail('WORKER_FILE_API_REPAIR_REQUIRED');
   }
   signal?.throwIfAborted();
   beforeRequest?.();
   if(beforeDispatch)await beforeDispatch();
   signal?.throwIfAborted();
   dispatched=true;
   let result=await post(c,'/files',intent,signal),lastLease=clock();
   while(result.state==='pending'){
    if(!await recheck(c,target,{beforeRequest}))return {state:'uncertain',code:'AUTHORIZATION_LOST',operationId};
    if(clock()-lastLease>=30000){Object.assign(c,await cap(target,{use:'files',operationId,fileIntent:intent,sourceBucket,beforeRequest}));const lease=await sendFileRequest(c,'/lease',{},signal);if(lease.state!=='completed')return {state:'uncertain',code:'LEASE_DENIED',operationId};lastLease=clock();}
    await new Promise(r=>setTimeout(r,pollIntervalMs));const statusCap=await cap(target,{sourceBucket,beforeRequest});result=await sendFileRequest(statusCap,'/operation',{operationId},signal);
   }
   if(!await recheck(c,target,{beforeRequest}))return {state:'uncertain',code:'AUTHORIZATION_LOST',operationId};return {...result,operationId};
   }catch(error){
    const transportFailure=beforeDispatch&&error.code==='TRANSPORT_UNAVAILABLE';
    return {state:dispatched?'uncertain':'blocked',code:dispatched&&!transportFailure?'FILE_ACTION_UNCONFIRMED':
     /^[A-Z][A-Z0-9_]+$/.test(error.code??'')?error.code:'TRANSPORT_UNAVAILABLE',operationId};
   }
  },
  async probe({target,operationId=crypto.randomUUID(),authorize=async()=>true}){if(!await authorize())return {state:'blocked',code:'AUTHORIZATION_DENIED'};const c=await cap(target,{use:'probe',operationId});let result;try{result=await post(c,'/probe',{});}catch{return {state:'uncertain',code:'READINESS_RECONCILE_REQUIRED',operationId,destination:remoteDestination(target)};}if(!await recheck(c,target)||!await authorize())return {state:'uncertain',code:'AUTHORIZATION_LOST',operationId};return result;},
  async probeStatus(target,operationId){const c=await cap(target),result=await post(c,'/probe-status',{operationId});if(!await recheck(c,target))return {state:'uncertain',code:'AUTHORIZATION_LOST',operationId};return result;},
  async cancel(target,operationId){
   const job=activeSaves.get(operationId);
   if(job&&equal(remoteDestination(job.target),remoteDestination(target)))return requestJobCancel(job,operationId);
   return requestRemoteCancel(target,operationId);
  },
  cancelActive(){return [...activeSaves].map(([id,job])=>({id,...requestJobCancel(job,id)}));},
  async inspectOperation(target,operationId,{signal,expectedSession,beforeRequest}={}){
   signal?.throwIfAborted();
   const c=await cap(target,{beforeRequest});
   if(expectedSession!==undefined&&c.sessionId!==expectedSession)fail('AUTHORIZATION_REVOKED');
   signal?.throwIfAborted();beforeRequest?.();
   const result=await post(c,'/operation',{operationId},signal);
   if(!await recheck(c,target,{beforeRequest}))fail('AUTHORIZATION_REVOKED');
   return result;
  },
  async inspect(target,receipt){const c=await cap(target,{use:'save',operationId:receipt.operationId,source:{}});return post(c,'/verify',receipt);},
  async revoke(target,sourceBucket){const c=await cap(target,{use:'revoke',sourceBucket});return post(c,'/revoke',{});}
 });
}
