import {createRemoteSaver} from '../../right2cloud-module/src/index.mjs';
import {equal} from '../../right2cloud-module/src/common.mjs';
import {remoteDestination,PROTOCOL,signGrant,digest,boundedJSON,fail} from './wire.mjs';

export function createRemoteTransport({oauth,lookup,fetch:fetcher=globalThis.fetch,authorizeSource=async()=>true,verifyAuthority=async()=>true,clock=Date.now}){
 async function cap(target,{use='status',operationId,source}={}){
  const a=await oauth.authority();if(!a.accounts.some(x=>x.id===target.accountId))fail('SCOPE_UNAUTHORIZED');
  const plan=await lookup(target);if(plan?.state!=='ready'||plan.accountId!==target.accountId||plan.bucketName!==target.bucketName||plan.protocol!==PROTOCOL)fail('WORKER_SETUP_REQUIRED');
  if(use!=='revoke'&&await verifyAuthority(target,a)!==true)fail('AUTHORIZATION_REVOKED');
  const u=new URL(plan.url);if(u.protocol!=='https:'||!u.hostname.endsWith('.workers.dev')||u.username||u.password||u.pathname!=='/'||u.search||u.hash)fail('WORKER_ADDRESS_INVALID');
  const destination=remoteDestination(target),expiresAt=clock()+120000;
  const payload={protocol:PROTOCOL,use,principal:target.connectionId,sessionId:a.sessionId,destination,expiresAt,...(operationId?{operationId,sourceDigest:await digest(source)}:{})};
  return {destination,expiresAt,sessionId:a.sessionId,url:u.origin,token:await signGrant(plan.secret,payload)};
 }
 async function post(c,path,input,signal){
  const deadline=AbortSignal.any([AbortSignal.timeout(65000),...(signal?[signal]:[])]);
  let response;try{response=await fetcher(c.url+path,{method:'POST',redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',headers:{authorization:'Bearer '+c.token,'content-type':'application/json'},body:JSON.stringify(input),signal:deadline});}catch{fail('TRANSPORT_UNAVAILABLE');}
  const value=await boundedJSON(response);if(!response.ok&&value.state!=='blocked')fail('TRANSPORT_UNAVAILABLE');return value;
 }
 async function recheck(c,target){try{const a=await oauth.authority();return a.sessionId===c.sessionId&&a.accounts.some(x=>x.id===target.accountId)&&c.expiresAt>clock()&&await verifyAuthority(target,a)===true;}catch{return false;}}
 return Object.freeze({
  async status(target){try{const c=await cap(target),r=await post(c,'/capabilities',{});if(!await recheck(c,target))fail('AUTHORIZATION_REVOKED');if(r.state!=='completed'||r.protocol!==PROTOCOL||!equal(r.destination,c.destination)||!r.storageBound||!r.durableClaims||!r.conditionalCreate)fail(r.code??'WORKER_NOT_READY');const plan=await lookup(target);if(plan.codeDigest&&r.codeDigest!==plan.codeDigest)fail('WORKER_BUILD_MISMATCH');return {state:plan.verifiedAt?'READY':'PREPARED',destination:target,allowedHosts:r.allowedHosts,maxBytes:r.maxBytes,maxBufferBytes:r.maxBufferBytes,checkedAt:clock()};}catch(e){return {state:'blocked',code:/^[A-Z_]+$/.test(e.code??'')?e.code:'WORKER_UNAVAILABLE'};}},
  async save({target,source,operationId=crypto.randomUUID(),signal,authorize=async()=>true,onBoundary,dispatchPreparationMs,readinessMs}){
   const timings={...(Number.isFinite(dispatchPreparationMs)?{dispatchPreparationMs}:{}),...(Number.isFinite(readinessMs)?{readinessMs}:{})};const timed=async(name,stage,fn)=>{const started=performance.now();try{try{onBoundary?.(stage,'started','REMOTE_STAGE_STARTED');}catch{}const result=await fn();try{onBoundary?.(stage,result===false?'blocked':result==null?'uncertain':['blocked','failed','uncertain'].includes(result?.state)?result.state:'ok',result===false?'REMOTE_STAGE_DENIED':result==null?'REMOTE_STAGE_UNVERIFIED':'REMOTE_STAGE_COMPLETE');}catch{}return result;}catch(e){try{onBoundary?.(stage,'failed','REMOTE_STAGE_FAILED');}catch{}throw e;}finally{timings[name]=(timings[name]??0)+Math.round(performance.now()-started);}};
   const start=performance.now(),destination=remoteDestination(target);
   // An instance lasts one operation; imported module URL/promise retention ends here.
   const saver=createRemoteSaver({authorize:()=>timed('intentAuthorizationMs','intent',async()=>await authorize()&&await authorizeSource(source)),
    getPreparedWorkerCapability:()=>timed('capabilityMs','worker.capability',()=>cap(target,{use:'save',operationId,source})),
    recheckAuthorization:(_i,c)=>timed('authorizationRecheckMs','auth.check',async()=>await recheck(c,target)&&await authorize()),
    authenticatedRequest:(c,intent,o)=>timed('workerRequestMs','transfer.upload',()=>post(c,'/remote-save',intent,o.signal)),
    verifyObject:(c,receipt,o)=>timed('verificationMs','transfer.verify',async()=>{const r=await post(c,'/verify',receipt,o.signal);return r.state==='completed'?r.proof:null;})});
   const result=await saver({operationId,source,destination,signal});
   return {...result,timings,durationMs:Math.round(performance.now()-start)};
  },
  async inspectOperation(target,operationId){const c=await cap(target);const r=await post(c,'/operation',{operationId});if(!await recheck(c,target))fail('AUTHORIZATION_REVOKED');return r;},
  async inspect(target,receipt){const c=await cap(target,{use:'save',operationId:receipt.operationId,source:{}});return post(c,'/verify',receipt);},
  async revoke(target){const c=await cap(target,{use:'revoke'});return post(c,'/revoke',{});}
 });
}
