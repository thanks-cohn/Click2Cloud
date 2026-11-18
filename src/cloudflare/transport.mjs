import {passiveObservation} from '../core/boundary-observation.mjs';
import {sourceURL} from './public-address.mjs';
import {createRemoteSaver} from '../../right2cloud-module/src/index.mjs';
import {equal,canonicalSource} from '../../right2cloud-module/src/common.mjs';
import {remoteDestination,PROTOCOL,signGrant,digest,boundedJSON,fail} from './wire.mjs';

// Durable write evidence is bucket-wide, but every use stays inside the
// signed plan's exact account, bucket and prefix. This is local preparation
// evidence only. Dispatch still needs live OAuth authority and Worker checks.
// The exact c337e41 Worker supports the same signed save/file protocol.
export const previousWorkerDigests=Object.freeze(['Nyd2B_8P0CiVwmx9-r1H1k2vcwtywH0MeTMmNL1bCrM']);
const matchesBuild=(plan,expected,compatible)=>!expected||plan.codeDigest===expected||!plan.sourceBucket&&compatible.includes(plan.codeDigest);
export function preparedDestination(plan,target,expectedCodeDigest,compatible=[]){
 const d=remoteDestination(target);
 if(plan?.state!=='ready'||plan.accountId!==d.accountId||plan.bucketName!==d.bucketName||plan.protocol!==PROTOCOL)return {state:'blocked',code:'WORKER_SETUP_REQUIRED'};
 if(!plan.secret)return {state:'blocked',code:'WORKER_SIGNING_RENEWAL_APPROVAL_REQUIRED'};
 if(!matchesBuild(plan,expectedCodeDigest,compatible))return {state:'blocked',code:'WORKER_UPGRADE_APPROVAL_REQUIRED'};
 if(plan.prefixScope&&d.prefix!==plan.prefixScope&&!d.prefix.startsWith(plan.prefixScope+'/'))return {state:'blocked',code:'WORKER_DESTINATION_SCOPE_REQUIRED'};
 return plan.codeDigest&&Object.values(plan.verifiedTargets??{}).some(proof=>proof.codeDigest===plan.codeDigest)
  ?{state:'READY'}:{state:'PREPARED',code:'WRITE_PROOF_REQUIRED'};
}

export function createRemoteTransport({oauth,lookup,fetch:fetcher=globalThis.fetch,authorizeSource=async()=>true,verifyAuthority=async()=>true,clock=Date.now,record=async()=>{},pollIntervalMs=1000,expectedCodeDigest=null,compatibleCodeDigests=[]}){
 // Per-gesture capability evidence, never persisted or shared across clicks.
 // Fresh OAuth, plan, prefix and verifyAuthority checks still run before each use.
 const readyProofs=new WeakMap();
 const planIdentity=plan=>digest([plan.state,plan.accountId,plan.bucketName,plan.protocol,plan.url,plan.secret,plan.prefixScope??'',plan.codeDigest,plan.verifiedTargets]);
 async function cap(target,{use='status',operationId,source,provenance,fileIntent,sourceBucket,live=true}={}){
  const a=await oauth.authority();if(!a.accounts.some(x=>x.id===target.accountId))fail('SCOPE_UNAUTHORIZED');
  const plan=await lookup(target,sourceBucket);if(plan?.state!=='ready'||plan.accountId!==target.accountId||plan.bucketName!==target.bucketName||plan.sourceBucket!==sourceBucket||plan.protocol!==PROTOCOL)fail('WORKER_SETUP_REQUIRED');
  if(typeof plan.secret!=='string'||!plan.secret)fail('WORKER_SIGNING_RENEWAL_APPROVAL_REQUIRED');
  if(!['status','revoke'].includes(use)&&!matchesBuild(plan,expectedCodeDigest,compatibleCodeDigests))fail('WORKER_UPGRADE_APPROVAL_REQUIRED');
  if(live&&use!=='revoke'&&(await verifyAuthority(target,a)!==true||sourceBucket&&await verifyAuthority({...target,bucketName:sourceBucket,prefix:''},a)!==true))fail('AUTHORIZATION_REVOKED');
  const u=new URL(plan.url);if(u.protocol!=='https:'||!u.hostname.endsWith('.workers.dev')||u.username||u.password||u.pathname!=='/'||u.search||u.hash)fail('WORKER_ADDRESS_INVALID');
  const destination=remoteDestination(target);if(plan.prefixScope&&destination.prefix!==plan.prefixScope&&!destination.prefix.startsWith(plan.prefixScope+'/'))fail('WORKER_DESTINATION_SCOPE_REQUIRED');const expiresAt=clock()+120000;
  const payload={protocol:PROTOCOL,use,principal:target.connectionId,sessionId:a.sessionId,destination,expiresAt,...(operationId?{operationId,...(source?{sourceDigest:await digest(canonicalSource(source))}:{}),...(provenance?{provenanceDigest:await digest(provenance)}:{}),...(fileIntent?{fileDigest:await digest(fileIntent)}:{})}:{})};
  return {destination,sourceBucket,expiresAt,sessionId:a.sessionId,codeDigest:plan.codeDigest,url:u.origin,token:await signGrant(plan.secret,payload),planIdentity:await planIdentity(plan)};
 }
 async function post(c,path,input,signal,onObservation){
  const requestStarted=performance.now();
  const deadline=AbortSignal.any([AbortSignal.timeout(30000),...(signal?[signal]:[])]);
  let response;try{response=await fetcher(c.url+path,{method:'POST',redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',headers:{authorization:'Bearer '+c.token,'content-type':'application/json'},body:JSON.stringify(input),signal:deadline});}catch{fail('TRANSPORT_UNAVAILABLE');}
  passiveObservation(onObservation,{stage:'provider.request',durationMs:performance.now()-requestStarted,outcome:'ok'});
  const value=await boundedJSON(response);if(!response.ok&&!['blocked','uncertain'].includes(value.state))fail('TRANSPORT_UNAVAILABLE');return value;
 }
 function pollDelay(ms,signal){
  return new Promise((resolve,reject)=>{
   const abort=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(Error('CANCELLED'));};
   const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);
   if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  });
 }
 async function recheck(c,target,{live=true,matchPlan=false,reportDenial=false}={}){
  try{
   const a=await oauth.authority();
   return a.sessionId===c.sessionId&&a.accounts.some(x=>x.id===target.accountId)&&c.expiresAt>clock()
    &&(!matchPlan||await planIdentity(await lookup(target))===c.planIdentity)&&(!live||await verifyAuthority(target,a)===true&&(!c.sourceBucket||await verifyAuthority({...target,bucketName:c.sourceBucket,prefix:''},a)===true));
  }catch(error){if(reportDenial)throw error;return false;}
 }
 return Object.freeze({
  // Internal native-click authorization. null means expired evidence: caller
  // must perform a new status request. A changed binding fails closed instead.
  async authorizeReady(target,readiness){
   const proof=readyProofs.get(readiness);
   if(!proof||clock()<proof.at||clock()-proof.at>=10000)return null;
   try{const c=await cap(target);return {sessionId:c.sessionId,authorizedTargets:
    equal(c.destination,proof.destination)&&c.sessionId===proof.sessionId&&c.planIdentity===proof.planIdentity?[target]:[]};}
   catch{return {sessionId:null,authorizedTargets:[]};}
  },
  filePlanCurrent:plan=>plan?.state==='ready'&&!!plan.secret&&matchesBuild(plan,expectedCodeDigest,compatibleCodeDigests),
  async status(target,{sourceBucket}={}){try{const selected=await lookup(target,sourceBucket);if(selected&&!matchesBuild(selected,expectedCodeDigest,compatibleCodeDigests))fail('WORKER_UPGRADE_APPROVAL_REQUIRED');const c=await cap(target,{sourceBucket}),r=await post(c,'/capabilities',{});if(!await recheck(c,target))fail('AUTHORIZATION_REVOKED');if(r.state!=='completed'||r.protocol!==PROTOCOL||!equal(r.destination,c.destination)||!r.storageBound||!r.durableClaims||!r.conditionalCreate||sourceBucket&&(r.sourceBucket!==sourceBucket||!r.sourceBound))fail(r.code??'WORKER_NOT_READY');const plan=await lookup(target,sourceBucket);if(plan.codeDigest&&r.codeDigest!==plan.codeDigest)fail('WORKER_BUILD_MISMATCH');// R2 binding/write authority is bucket-wide. A current exact scoped capability
  // plus a same-code verified write in THIS bucket is reusable for new folders.
  // The Worker still rejects prefix escape before returning capabilities.
  const exact=plan.verifiedTargets?.[c.destination.prefix],proof=(exact?.codeDigest===plan.codeDigest?exact:null)??Object.values(plan.verifiedTargets??{}).find(p=>p.codeDigest===plan.codeDigest),ready=!!proof&&!!plan.codeDigest&&proof.codeDigest===plan.codeDigest;const result={state:ready?'READY':'PREPARED',proof:ready?(exact?.codeDigest===plan.codeDigest?'exact-destination-write':'same-bucket-write-and-current-scoped-capability'):null,destination:target,sourcePolicy:r.sourcePolicy,transfer:r.transfer,multipartConditionalCompletion:r.multipartConditionalCompletion,checkedAt:clock()};if(ready&&await planIdentity(plan)===c.planIdentity)readyProofs.set(result,{at:clock(),sessionId:c.sessionId,destination:c.destination,planIdentity:c.planIdentity});return result;}catch(e){return {state:'blocked',code:/^[A-Z_]+$/.test(e.code??'')?e.code:'WORKER_UNAVAILABLE'};}},
  async save({target,source,provenance,operationId=crypto.randomUUID(),signal,authorize=async()=>true,onBoundary,onObservation,dispatchPreparationMs,readinessMs}){
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
   recordProgress({state:'pending',code:'REMOTE_PREPARING',operationId,destination});
   // An instance lasts one operation; imported module URL/promise retention ends here.
   const saver=createRemoteSaver({authorize:()=>timed('intentAuthorizationMs','intent',async()=>await authorize()&&await authorizeSource(source)),
    getPreparedWorkerCapability:()=>timed('capabilityMs','worker.capability',()=>cap(target,{use:'save',operationId,source,provenance,live:false})),
    recheckAuthorization:(_i,c)=>timed('authorizationRecheckMs','auth.check',async()=>await recheck(c,target,{matchPlan:true,reportDenial:!dispatched})&&await authorize()),
    authenticatedRequest:(c,intent,o)=>timed('workerRequestMs','transfer.upload',async()=>{
     dispatched=true;
     const submittedAt=performance.now();
     let result=await post(c,'/remote-save',intent,o.signal,onObservation),lastLease=clock(),statusCap;
     const hinted=result.state==='pending'&&Number.isFinite(result.retryAfterMs);
     if(hinted)await pollDelay(Math.min(pollIntervalMs,Math.max(50,Math.min(300,result.retryAfterMs))),o.signal);
     while(result.state==='pending'){
      if(!await authorize())return {state:'uncertain',code:'AUTHORIZATION_LOST'};
      if(clock()-lastLease>=30000){const renewed=await cap(target,{use:'save',operationId,source,provenance});if(renewed.sessionId!==c.sessionId)return {state:'uncertain',code:'AUTHORIZATION_LOST'};Object.assign(c,renewed);const lease=await post(c,'/lease',{},o.signal);if(lease.state!=='completed')return {state:'uncertain',code:'LEASE_DENIED'};lastLease=clock();statusCap=null;}
      // Status grants are read-only. Keep them invocation-local and invalidate
      // on OAuth session change; lease renewal and verification stay live.
      statusCap??=await cap(target,{operationId,live:false});
      if(statusCap.sessionId!==c.sessionId||!await recheck(statusCap,target,{live:false}))return {state:'uncertain',code:'AUTHORIZATION_LOST'};
      result=await post(statusCap,'/operation',{operationId,receiptOnly:true},o.signal);
      timings.pollCount++;if(result.workerTimings)for(const [key,value] of Object.entries(result.workerTimings))if(Number.isFinite(value)&&value>=0)timings['worker.'+key]=value;
      if(result.state==='verified')return {state:'written',receipt:result.receipt};
      if(result.state==='pending'){
       recordProgress({state:'pending',code:result.code,operationId,destination,stage:result.stage,bytes:result.bytes});
       // Account for the Worker hold and first poll against the original
       // cadence. Slow responses do not add the hold to every save.
       await pollDelay(hinted&&timings.pollCount===1?Math.max(0,pollIntervalMs-(performance.now()-submittedAt)):pollIntervalMs,o.signal);
      }
     }
     if(result.workerTimings)for(const [key,value] of Object.entries(result.workerTimings))if(Number.isFinite(value)&&value>=0)timings['worker.'+key]=value;
     return result;
    }),
    verifyObject:(c,receipt,o)=>timed('verificationMs','transfer.verify',async()=>{const r=await post(c,'/verify',receipt,o.signal);if(r.state==='completed')passiveObservation(onObservation,{stage:'provider.verification',providerOperationId:operationId,receipt,proof:r.proof});return r.state==='completed'?r.proof:null;})});
   const result=await saver({operationId,source,destination,provenance,signal});
   const final={...result,timings,durationMs:Math.round(performance.now()-start)};try{await recordOperation(final);}catch{return {...final,state:final.state==='verified'?'partial':final.state,code:'COMPLETION_PENDING'};}return final;
  },
  async files({target,intent,signal,sourceBucket}){
   const operationId=intent.operationId;let dispatched=false;
   try{
   const c=await cap(target,{use:'files',operationId,fileIntent:intent,sourceBucket});
   if(!expectedCodeDigest||c.codeDigest!==expectedCodeDigest){
    const check=await cap(target,{sourceBucket,live:false}),features=await post(check,'/capabilities',{});
    if(check.sessionId!==c.sessionId||!features.fileOperations?.includes(intent.action))return {state:'blocked',code:'WORKER_FILE_API_REPAIR_REQUIRED',operationId};
   }
   dispatched=true;
   let result=await post(c,'/files',intent,signal),lastLease=clock();
   while(result.state==='pending'){
    if(!await recheck(c,target))return {state:'uncertain',code:'AUTHORIZATION_LOST',operationId};
    if(clock()-lastLease>=30000){Object.assign(c,await cap(target,{use:'files',operationId,fileIntent:intent,sourceBucket}));const lease=await post(c,'/lease',{},signal);if(lease.state!=='completed')return {state:'uncertain',code:'LEASE_DENIED',operationId};lastLease=clock();}
    await new Promise(r=>setTimeout(r,pollIntervalMs));const statusCap=await cap(target,{sourceBucket});result=await post(statusCap,'/operation',{operationId},signal);
   }
   if(!await recheck(c,target))return {state:'uncertain',code:'AUTHORIZATION_LOST',operationId};return {...result,operationId};
   }catch(error){
    return {state:dispatched?'uncertain':'blocked',code:dispatched?'FILE_ACTION_UNCONFIRMED':
     /^[A-Z][A-Z0-9_]+$/.test(error.code??'')?error.code:'TRANSPORT_UNAVAILABLE',operationId};
   }
  },
  async probe({target,operationId=crypto.randomUUID(),authorize=async()=>true}){if(!await authorize())return {state:'blocked',code:'AUTHORIZATION_DENIED'};const c=await cap(target,{use:'probe',operationId});let result;try{result=await post(c,'/probe',{});}catch{return {state:'uncertain',code:'READINESS_RECONCILE_REQUIRED',operationId,destination:remoteDestination(target)};}if(!await recheck(c,target)||!await authorize())return {state:'uncertain',code:'AUTHORIZATION_LOST',operationId};return result;},
  async probeStatus(target,operationId){const c=await cap(target),result=await post(c,'/probe-status',{operationId});if(!await recheck(c,target))return {state:'uncertain',code:'AUTHORIZATION_LOST',operationId};return result;},
  async cancel(target,operationId){const c=await cap(target,{use:'cancel',operationId});return post(c,'/cancel',{});},
  async inspectOperation(target,operationId){const c=await cap(target);const r=await post(c,'/operation',{operationId});if(!await recheck(c,target))fail('AUTHORIZATION_REVOKED');return r;},
  async inspect(target,receipt){const c=await cap(target,{use:'save',operationId:receipt.operationId,source:{}});return post(c,'/verify',receipt);},
  async revoke(target,sourceBucket){const c=await cap(target,{use:'revoke',sourceBucket});return post(c,'/revoke',{});}
 });
}
