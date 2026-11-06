import {destination,validateIntent,equal,wait} from './common.mjs';
import {acceptProof} from './verification.mjs';
export {sourceFromClick} from './source-fetch.mjs';
export {createWorker} from './cloudflare-worker.mjs';
export {cloudflareR2Writer} from './cloudflare-r2-writer.mjs';
export function createRemoteSaver(ports){const operations=new Map();return function saveRemote(input){
 // No persistence claim here: server-side durable claims own cross-restart deduplication.
 const id=input?.operationId;const fingerprint=JSON.stringify({source:input.source,destination:input.destination});if(operations.has(id)){const prior=operations.get(id);if(prior.fingerprint!==fingerprint)return Promise.resolve({state:'blocked',code:'OPERATION_ID_REUSED',operationId:id});return prior.task;}
 const task=run(input,ports);operations.set(id,{task,fingerprint});return task;
};}
async function run(input,p){let dispatched=false;let intent;const result=(state,code,extra={})=>({state,code,operationId:input?.operationId,destination:intent?.destination,...extra});
 try{
  if(input.signal?.aborted)return result('cancelled','ABORTED_BEFORE_DISPATCH');
  intent={operationId:input.operationId,source:{url:input.source?.url,filename:input.source?.filename},destination:destination(input.destination)};validateIntent(intent);
  const signal=input.signal;
  if(await wait(p.authorize(intent),signal)!==true)return result('blocked','AUTHORIZATION_DENIED');
  const cap=await wait(p.getPreparedWorkerCapability(intent),signal);
  if(!cap||!equal(cap.destination,intent.destination)||!Number.isFinite(cap.expiresAt)||cap.expiresAt<=Date.now())return result('blocked','CAPABILITY_DENIED');
  if(await wait(p.recheckAuthorization(intent,cap),signal)!==true)return result('blocked','AUTHORIZATION_REVOKED');
  signal?.throwIfAborted();dispatched=true;
  const response=await wait(p.authenticatedRequest(cap,intent,{signal}),signal);
  if(['blocked','failed','uncertain'].includes(response?.state))return result(response.state,/^[A-Z_]+$/.test(response.code)?response.code:'REMOTE_REJECTED');
  if(response?.state!=='written')return result('uncertain','MALFORMED_RECEIPT');
  const receipt=response.receipt;
  const proof=await wait(p.verifyObject(cap,receipt,{signal}),signal);
  if(cap.expiresAt<=Date.now()||await wait(p.recheckAuthorization(intent,cap),signal)!==true)return result('uncertain','AUTHORIZATION_LOST');
  if(!acceptProof(intent,receipt,proof))return result('uncertain','VERIFICATION_MISMATCH');
  return result('verified','R2_HEAD_VERSION_SIZE', {receipt,proofKind:'independent-head-version-size'});
 }catch(e){return result(dispatched?'uncertain':input.signal?.aborted?'cancelled':'blocked',dispatched?'RECONCILE_READ_ONLY':e.code||'PRECONDITION_FAILED');}
}
