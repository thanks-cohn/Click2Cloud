import {sourceURL} from './public-address.mjs';
import {createRemoteSaver} from '../../right2cloud-module/src/index.mjs';
import {equal,canonicalSource} from '../../right2cloud-module/src/common.mjs';
import {remoteDestination,PROTOCOL,signGrant,digest,boundedJSON,fail} from './wire.mjs';

export function createRemoteTransport({oauth,lookup,fetch:fetcher=globalThis.fetch,authorizeSource=async()=>true,verifyAuthority=async()=>true,clock=Date.now,record=async()=>{},pollIntervalMs=1000,expectedCodeDigest=null}){
 async function cap(target,{use='status',operationId,source,provenance,fileIntent}={}){
  const a=await oauth.authority();if(!a.accounts.some(x=>x.id===target.accountId))fail('SCOPE_UNAUTHORIZED');
  const plan=await lookup(target);if(plan?.state!=='ready'||plan.accountId!==target.accountId||plan.bucketName!==target.bucketName||plan.protocol!==PROTOCOL)fail('WORKER_SETUP_REQUIRED');
  if(typeof plan.secret!=='string'||!plan.secret)fail('WORKER_SIGNING_RENEWAL_APPROVAL_REQUIRED');
  if(expectedCodeDigest&&!['status','revoke'].includes(use)&&plan.codeDigest!==expectedCodeDigest)fail('WORKER_UPGRADE_APPROVAL_REQUIRED');
  if(use!=='revoke'&&await verifyAuthority(target,a)!==true)fail('AUTHORIZATION_REVOKED');
  const u=new URL(plan.url);if(u.protocol!=='https:'||!u.hostname.endsWith('.workers.dev')||u.username||u.password||u.pathname!=='/'||u.search||u.hash)fail('WORKER_ADDRESS_INVALID');
  const destination=remoteDestination(target);if(plan.prefixScope&&destination.prefix!==plan.prefixScope&&!destination.prefix.startsWith(plan.prefixScope+'/'))fail('WORKER_DESTINATION_SCOPE_REQUIRED');const expiresAt=clock()+120000;
  const payload={protocol:PROTOCOL,use,principal:target.connectionId,sessionId:a.sessionId,destination,expiresAt,...(operationId?{operationId,...(source?{sourceDigest:await digest(canonicalSource(source))}:{}),...(provenance?{provenanceDigest:await digest(provenance)}:{}),...(fileIntent?{fileDigest:await digest(fileIntent)}:{})}:{})};
  return {destination,expiresAt,sessionId:a.sessionId,url:u.origin,token:await signGrant(plan.secret,payload)};
 }
 async function post(c,path,input,signal){
  const deadline=AbortSignal.any([AbortSignal.timeout(30000),...(signal?[signal]:[])]);
  let response;try{response=await fetcher(c.url+path,{method:'POST',redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',headers:{authorization:'Bearer '+c.token,'content-type':'application/json'},body:JSON.stringify(input),signal:deadline});}catch{fail('TRANSPORT_UNAVAILABLE');}
  const value=await boundedJSON(response);if(!response.ok&&!['blocked','uncertain'].includes(value.state))fail('TRANSPORT_UNAVAILABLE');return value;
 }
 async function recheck(c,target){try{const a=await oauth.authority();return a.sessionId===c.sessionId&&a.accounts.some(x=>x.id===target.accountId)&&c.expiresAt>clock()&&await verifyAuthority(target,a)===true;}catch{return false;}}
 return Object.freeze({
  async status(target){try{const selected=await lookup(target);if(selected&&expectedCodeDigest&&selected.codeDigest!==expectedCodeDigest)fail('WORKER_UPGRADE_APPROVAL_REQUIRED');const c=await cap(target),r=await post(c,'/capabilities',{});if(!await recheck(c,target))fail('AUTHORIZATION_REVOKED');if(r.state!=='completed'||r.protocol!==PROTOCOL||!equal(r.destination,c.destination)||!r.storageBound||!r.durableClaims||!r.conditionalCreate)fail(r.code??'WORKER_NOT_READY');const plan=await lookup(target);if(plan.codeDigest&&r.codeDigest!==plan.codeDigest)fail('WORKER_BUILD_MISMATCH');// R2 binding/write authority is bucket-wide. A current exact scoped capability
  // plus a same-code verified write in THIS bucket is reusable for new folders.
  // The Worker still rejects prefix escape before returning capabilities.
  const exact=plan.verifiedTargets?.[c.destination.prefix],proof=(exact?.codeDigest===plan.codeDigest?exact:null)??Object.values(plan.verifiedTargets??{}).find(p=>p.codeDigest===plan.codeDigest),ready=!!proof&&!!plan.codeDigest&&proof.codeDigest===plan.codeDigest;return {state:ready?'READY':'PREPARED',proof:ready?(exact?.codeDigest===plan.codeDigest?'exact-destination-write':'same-bucket-write-and-current-scoped-capability'):null,destination:target,sourcePolicy:r.sourcePolicy,transfer:r.transfer,multipartConditionalCompletion:r.multipartConditionalCompletion,checkedAt:clock()};}catch(e){return {state:'blocked',code:/^[A-Z_]+$/.test(e.code??'')?e.code:'WORKER_UNAVAILABLE'};}},
  async save({target,source,provenance,operationId=crypto.randomUUID(),signal,authorize=async()=>true,onBoundary,dispatchPreparationMs,readinessMs}){
   const timings={...(Number.isFinite(dispatchPreparationMs)?{dispatchPreparationMs}:{}),...(Number.isFinite(readinessMs)?{readinessMs}:{})};const timed=async(name,stage,fn)=>{const started=performance.now();try{try{onBoundary?.(stage,'started','REMOTE_STAGE_STARTED');}catch{}const result=await fn();try{onBoundary?.(stage,result===false?'blocked':result==null?'uncertain':['blocked','failed','uncertain'].includes(result?.state)?result.state:'ok',result===false?'REMOTE_STAGE_DENIED':result==null?'REMOTE_STAGE_UNVERIFIED':'REMOTE_STAGE_COMPLETE');}catch{}return result;}catch(e){try{onBoundary?.(stage,'failed','REMOTE_STAGE_FAILED');}catch{}throw e;}finally{timings[name]=(timings[name]??0)+Math.round(performance.now()-started);}};
   try{source=canonicalSource({...source,url:sourceURL(source?.url).href});}catch(e){return {state:'blocked',code:e.code??'SOURCE_INVALID',operationId,destination:remoteDestination(target)};}
   const start=performance.now(),destination=remoteDestination(target);await record({state:'pending',code:'REMOTE_PREPARING',operationId,destination});
   // An instance lasts one operation; imported module URL/promise retention ends here.
   const saver=createRemoteSaver({authorize:()=>timed('intentAuthorizationMs','intent',async()=>await authorize()&&await authorizeSource(source)),
    getPreparedWorkerCapability:()=>timed('capabilityMs','worker.capability',()=>cap(target,{use:'save',operationId,source,provenance})),
    recheckAuthorization:(_i,c)=>timed('authorizationRecheckMs','auth.check',async()=>await recheck(c,target)&&await authorize()),
    authenticatedRequest:(c,intent,o)=>timed('workerRequestMs','transfer.upload',async()=>{
     let result=await post(c,'/remote-save',intent,o.signal),lastLease=clock();
     while(result.state==='pending'){
      if(!await authorize())return {state:'uncertain',code:'AUTHORIZATION_LOST'};
      if(clock()-lastLease>=30000){const renewed=await cap(target,{use:'save',operationId,source,provenance});if(renewed.sessionId!==c.sessionId)return {state:'uncertain',code:'AUTHORIZATION_LOST'};Object.assign(c,renewed);const lease=await post(c,'/lease',{},o.signal);if(lease.state!=='completed')return {state:'uncertain',code:'LEASE_DENIED'};lastLease=clock();}
      const statusCap=await cap(target);result=await post(statusCap,'/operation',{operationId},o.signal);
      if(result.state==='verified')return {state:'written',receipt:result.receipt};
      if(result.state==='pending'){await record({state:'pending',code:result.code,operationId,destination,stage:result.stage,bytes:result.bytes});await new Promise((ok,no)=>{const abort=()=>{clearTimeout(timer);o.signal?.removeEventListener('abort',abort);no(Error('CANCELLED'));},timer=setTimeout(()=>{o.signal?.removeEventListener('abort',abort);ok();},pollIntervalMs);if(o.signal?.aborted)abort();else o.signal?.addEventListener('abort',abort,{once:true});});}
     }return result;
    }),
    verifyObject:(c,receipt,o)=>timed('verificationMs','transfer.verify',async()=>{const r=await post(c,'/verify',receipt,o.signal);return r.state==='completed'?r.proof:null;})});
   const result=await saver({operationId,source,destination,provenance,signal});
   const final={...result,timings,durationMs:Math.round(performance.now()-start)};try{await record(final);}catch{return {...final,state:final.state==='verified'?'partial':final.state,code:'COMPLETION_PENDING'};}return final;
  },
  async files({target,intent,signal}){
   const operationId=intent.operationId,check=await cap(target),features=await post(check,'/capabilities',{});if(!features.fileOperations?.includes(intent.action))return {state:'blocked',code:'WORKER_FILE_API_REPAIR_REQUIRED',operationId};const c=await cap(target,{use:'files',operationId,fileIntent:intent});
   let result=await post(c,'/files',intent,signal),lastLease=clock();
   while(result.state==='pending'){
    if(!await recheck(c,target))return {state:'uncertain',code:'AUTHORIZATION_LOST',operationId};
    if(clock()-lastLease>=30000){Object.assign(c,await cap(target,{use:'files',operationId,fileIntent:intent}));const lease=await post(c,'/lease',{},signal);if(lease.state!=='completed')return {state:'uncertain',code:'LEASE_DENIED',operationId};lastLease=clock();}
    await new Promise(r=>setTimeout(r,pollIntervalMs));const statusCap=await cap(target);result=await post(statusCap,'/operation',{operationId},signal);
   }
   if(!await recheck(c,target))return {state:'uncertain',code:'AUTHORIZATION_LOST',operationId};return {...result,operationId};
  },
  async probe({target,operationId=crypto.randomUUID(),authorize=async()=>true}){if(!await authorize())return {state:'blocked',code:'AUTHORIZATION_DENIED'};const c=await cap(target,{use:'probe',operationId});let result;try{result=await post(c,'/probe',{});}catch{return {state:'uncertain',code:'READINESS_RECONCILE_REQUIRED',operationId,destination:remoteDestination(target)};}if(!await recheck(c,target)||!await authorize())return {state:'uncertain',code:'AUTHORIZATION_LOST',operationId};return result;},
  async probeStatus(target,operationId){const c=await cap(target),result=await post(c,'/probe-status',{operationId});if(!await recheck(c,target))return {state:'uncertain',code:'AUTHORIZATION_LOST',operationId};return result;},
  async cancel(target,operationId){const c=await cap(target,{use:'cancel',operationId});return post(c,'/cancel',{});},
  async inspectOperation(target,operationId){const c=await cap(target);const r=await post(c,'/operation',{operationId});if(!await recheck(c,target))fail('AUTHORIZATION_REVOKED');return r;},
  async inspect(target,receipt){const c=await cap(target,{use:'save',operationId:receipt.operationId,source:{}});return post(c,'/verify',receipt);},
  async revoke(target){const c=await cap(target,{use:'revoke'});return post(c,'/revoke',{});}
 });
}
