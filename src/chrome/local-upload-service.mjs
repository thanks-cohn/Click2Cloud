import {targetKey,normalizeTarget} from '../core/menu-identity.mjs';
import {remoteDestination} from '../cloudflare/wire.mjs';
import {fileOperationTarget} from '../cloudflare/file-transport.mjs';
import {key as objectKey} from '../explorer/file-api.mjs';
import {createClick2CloudFileApi} from '../explorer/index.mjs';
import {claimLocalUpload,releaseLocalUpload,takeLocalUpload} from './local-upload-files.mjs';
import {localUploadKey,uploadError} from './local-upload-plan.mjs';

export const uploadReadScopes = Object.freeze(['workers-r2.read','workers-r2.write','workers-r2-bucket-item.read','workers-r2-bucket-item.write']);
export const uploadCode = (value, fallback) => /^[A-Z][A-Z0-9_]{1,79}$/.test(value??'') ? value : fallback;

// Shared Cloudflare upload owner. Only the host supplies authenticated provider
// dependencies. The local lab substitutes the provider boundary, not this logic.
export function createLocalUploadService({assertConnected,oauth,lookup,checkPrepared,remote,
    executeFileMessage,runFileUpload,current,onVerified,onAccounted,boundedFetch=fetch,
    takeFile=takeLocalUpload,claim=claimLocalUpload,release=releaseLocalUpload}){
 async function checkUploadDestination(source,signal,expectedSession){
  const target=normalizeTarget(source);
  assertConnected();
  const auth=await oauth.authority();
  signal?.throwIfAborted();
  if(expectedSession!==undefined&&expectedSession!==auth.sessionId)throw uploadError('AUTH_SESSION_CHANGED','Reconnect and explicitly resume this upload.');
  if(target.provider!=='cloudflare'||target.connectionId!=='cloudflare:'+target.accountId||
     !auth.accounts.some(account=>account.id===target.accountId))
   throw uploadError('SCOPE_UNAUTHORIZED','Select an authorized Cloudflare R2 folder.');
  if(!uploadReadScopes.every(scope=>auth.scopes?.includes(scope)))
   throw uploadError('INSUFFICIENT_SCOPE','Reconnect Cloudflare with R2 read and write access.');
  const plan=await lookup(target);
  const readiness=checkPrepared(plan,target);
  if(!['READY','PREPARED'].includes(readiness.state))
   throw uploadError(readiness.code,'This folder needs an authorized Cloudflare file connection.');
  const live=await remote.status(target);
  signal?.throwIfAborted();
  assertConnected();
  if(!['READY','PREPARED'].includes(live.state))
   throw uploadError(live.code,'Cloudflare could not verify write access to this folder.');
  return {target,sessionId:auth.sessionId,stagingPrefix:(plan.prefixScope?plan.prefixScope+'/':'')+'.redown-beta-uploads/'};
 }
 async function validatePlan(items,binding,signal){
  for(let index=0;index<items.length;index++){
   signal?.throwIfAborted();
   if(items[index].invalidCode)continue;
   try{objectKey(binding.stagingPrefix+'00000000-0000-0000-0000-000000000000/'+items[index].name);}
   catch{throw uploadError('UPLOAD_PATH_INVALID','This file name is too long for the current Cloudflare staging scope.');}
   if((index+1)%128===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
 }
 async function runLocalUpload({source,file,key,uploadMode='files',localBinding},options={}){
  const {target,sessionId,stagingPrefix}=localBinding??await checkUploadDestination(source,options.signal);
  const relativePath=key?.slice(target.prefix.length)??file.name;
  if(key!==undefined&&!key.startsWith(target.prefix))throw uploadError('UPLOAD_PATH_INVALID','The upload path is outside its selected folder.');
  const destinationKey=localUploadKey(target,file,relativePath,uploadMode);
  options.signal?.throwIfAborted();
  const uploader=createClick2CloudFileApi({
   send:async(message,{signal})=>{
    signal?.throwIfAborted();assertConnected();
    await localBinding?.beforeCommit?.();
    signal?.throwIfAborted();assertConnected();
    return executeFileMessage(message,{signal,expectedSession:sessionId,beforeRequest:localBinding?.beforeRequest});
   },
   http:{request:(path,request)=>{
    assertConnected();
    localBinding?.beforeRequest?.();
    return oauth.request(path,{...request,expectedSession:sessionId,requiredScopes:uploadReadScopes});
   },boundedFetch}
  });
  return uploader.run('upload',{source:target,key:destinationKey,file,stagingPrefix,conflict:uploadMode==='files'?'keep':'skip'},options);
 }
 const activeLocalUploads = new Map();
 const capacityWaiters = new Set();
 async function waitForUploadSlot(signal){
  while(activeLocalUploads.size>=2){
   signal.throwIfAborted();
   await new Promise((resolve,reject)=>{
    const done=()=>{signal.removeEventListener('abort',abort);capacityWaiters.delete(done);resolve();};
    const abort=()=>{done();reject(signal.reason);};
    capacityWaiters.add(done);
    signal.addEventListener('abort',abort,{once:true});
   });
  }
  signal.throwIfAborted();
 }
 const localUploadClaimKey = (source,key) => JSON.stringify([targetKey({...source,prefix:''}),key]);
 async function recordLocalUpload(job,state,code,receipt){
  const destination=remoteDestination(job.source);
  const row=await current.recordRemoteResult({kind:'save',operationId:job.id,saveMode:'local-upload',
   state,code,destination,bytes:job.size,attemptedFilename:job.key.split('/').at(-1),
   localUpload:job,receipt,proofKind:receipt?'staging-byte-readback-and-final-r2-head':undefined},{onVerified});
  try{void Promise.resolve(onAccounted(row)).catch(()=>{});}catch{/* Queue refresh cannot reclassify the file. */}
  return row;
 }
 function uploadReceipt(job,result){
  const receipt=result?.receipt;
  if(result?.state!=='completed'||result.completed!==1||receipt?.operationId!==job.id||
     receipt.size!==job.size||!receipt.etag||!receipt.version||typeof receipt.key!=='string')return null;
  const parent=job.key.slice(0,job.key.lastIndexOf('/')+1),leaf=job.key.slice(parent.length),dot=leaf.lastIndexOf('.');
  const alternate=parent+(dot>0?leaf.slice(0,dot):leaf)+'-'+job.id+(dot>0?leaf.slice(dot):'');
  if(receipt.key!==job.key&&(job.mode!=='files'||receipt.key!==alternate))return null;
  const expected=remoteDestination({...job.source,prefix:parent});
  const actual=receipt.destination;
  if(!actual||Object.keys(expected).some(field=>expected[field]!==actual[field]))return null;
  return receipt;
 }
 async function reconcileLocalUpload(job,claimKey,options){
  const saved=await current.readRemoteResult(job.id);
  if(saved?.state==='verified'&&saved.receipt){
   await release(claimKey,job.id);
   return saved.receipt;
  }
  if(saved&&['failed','blocked','cancelled'].includes(saved.state)){
   await release(claimKey,job.id);
   return null;
  }
  if(saved?.localUpload?.commitRequested===false){
   await recordLocalUpload(job,'failed','LOCAL_UPLOAD_RESELECT_REQUIRED');
   await release(claimKey,job.id);
   return null;
  }
  const result=await remote.inspectOperation(job.workerTarget,job.id,options);
  const receipt=uploadReceipt(job,result);
  if(receipt){
   await recordLocalUpload(job,'verified','LOCAL_UPLOAD_RECONCILED',receipt);
   await release(claimKey,job.id);
  }
  return receipt;
 }
 async function dispatchLocalUpload(input,batch,controller,onProgress){
  return dispatchFile(input,batch,controller,onProgress,()=>takeFile(input.ticket));
 }
 // Both Shelf tickets and a trusted native laboratory File use the same
 // size/path binding, destination claim, provider dispatch and durable history.
 async function dispatchFile({ticket,batchId,index,item,mode,ordinaryHistory},batch,controller,onProgress,loadFile){
  const {signal}=controller;
  if(batch.waitForSlot){
   while(activeLocalUploads.size>=2)await waitForUploadSlot(signal);
   signal.throwIfAborted();
  }
  if(activeLocalUploads.size>=2)
   throw uploadError('RESOURCE_BUSY','Two local uploads are already running. Wait for one to finish.');
  if(activeLocalUploads.has(ticket))
   throw uploadError('LOCAL_UPLOAD_ALREADY_ACTIVE','This upload operation is already active.');
  activeLocalUploads.set(ticket,{controller,batchId});
  try{
   const staged=await loadFile(), binding=staged?.binding;
   signal.throwIfAborted();
   if(!binding||binding.batchId!==batchId||binding.index!==index||targetKey(binding.source)!==targetKey(batch.target)||
     binding.relativePath!==item.relativePath||binding.mode!==mode||staged.file.size!==item.size)
    throw uploadError('UPLOAD_FILE_UNAVAILABLE','Choose the local file again.');
   assertConnected();
   const auth=await oauth.authority();
   if(auth.sessionId!==batch.sessionId||!auth.accounts.some(account=>account.id===batch.target.accountId)||
     !uploadReadScopes.every(scope=>auth.scopes?.includes(scope)))
    throw uploadError('AUTH_SESSION_CHANGED','Cloudflare authorization changed. Reconnect and select the remaining files again.');
   signal.throwIfAborted();
   const key=localUploadKey(batch.target,staged.file,binding.relativePath,binding.mode);
   if(key!==item.key)throw uploadError('UPLOAD_BATCH_INVALID','The staged file differs from the validated upload plan.');
   const parent=key.slice(0,key.lastIndexOf('/')+1),staging=batch.stagingPrefix+ticket+'/';
   const job={id:ticket,batchId,index,source:batch.target,key,mode:binding.mode,size:staged.file.size,commitRequested:false,
    ...(ordinaryHistory?{ordinaryHistory}:{}),...(batch.retryPrecommit?{retryPrecommit:true}:{}),
    workerTarget:fileOperationTarget({...batch.target,prefix:staging},{...batch.target,prefix:parent})};
   const claimKey=localUploadClaimKey(batch.target,key);
   const previous=await claim(claimKey,job);
   if(previous){
    const receipt=activeLocalUploads.has(previous.id)?null:await reconcileLocalUpload(previous,claimKey).catch(()=>null);
    return {state:'uncertain',error:receipt?
     'An earlier upload was verified. Review its saved object before selecting a replacement. This selection was not uploaded.':
     'An earlier upload to this path may have committed. Inspect the destination before retrying.'};
   }
   let outcome,recorded=false;
   try{
    const intent=await recordLocalUpload(job,'pending','LOCAL_UPLOAD_STARTED');
    if(intent.state!=='pending'){
     await release(claimKey,ticket);
     return {state:'uncertain',code:'LOCAL_UPLOAD_RECONCILIATION_REQUIRED'};
    }
    recorded=true;
    const beforeCommit=async()=>{
     await batch.assertAuthorized?.();
     const checkpoint={...job,commitRequested:true};
     await recordLocalUpload(checkpoint,'pending','LOCAL_UPLOAD_VERIFY_COMMIT');
     job.commitRequested=true;
     await batch.assertAuthorized?.();
    };
    outcome=await runFileUpload({source:batch.target,file:staged.file,key,uploadMode:binding.mode,
     localBinding:{...batch,beforeCommit}},{...batch.timeouts,signal,onProgress,operationId:ticket});
    const receipt=uploadReceipt(job,outcome.data);
    if(receipt){
     await recordLocalUpload(job,'verified','LOCAL_UPLOAD_VERIFIED',receipt);
     await release(claimKey,ticket);
     return {state:'completed',code:'LOCAL_UPLOAD_VERIFIED',receipt};
    }
    const conflict=['FILE_CONFLICT','FILES_SKIPPED'].includes(outcome.data?.code);
    const state=conflict?'failed':!job.commitRequested?(signal.aborted?'cancelled':'failed'):
     'uncertain';
    const code=uploadCode(outcome.code??outcome.data?.code,state==='cancelled'?'LOCAL_UPLOAD_CANCELLED':'LOCAL_UPLOAD_'+state.toUpperCase());
    await recordLocalUpload(job,state,code);
    if(state!=='uncertain')await release(claimKey,ticket);
    return {state:conflict?'skipped':state,code,continue:conflict,precommitRetrySafe:!job.commitRequested&&state==='failed'&&!conflict,...(Number.isSafeInteger(outcome.retryAfterMs)?{retryAfterMs:outcome.retryAfterMs}:{}),error:conflict?'An existing Cloudflare object was left untouched.':
     state==='cancelled'?'Upload cancelled.':outcome.error??(state==='uncertain'?'Cloudflare did not confirm the committed object. Inspect the destination before retrying.':undefined)};
   }catch(error){
    if(!recorded){await release(claimKey,ticket).catch(()=>{});throw error;}
    return {state:'uncertain',error:'Cloudflare upload accounting was interrupted. Inspect the destination before retrying.'};
   }
  }finally{activeLocalUploads.delete(ticket);for(const notify of capacityWaiters)notify();}
 }
 async function dispatchLabFile({ticket,batchId,relativePath,file,binding,timeouts},controller,onProgress){
  const mode='mixed',index=0,source=binding.target;
  const item={relativePath,size:file.size,key:localUploadKey(source,file,relativePath,mode)};
  return dispatchFile({ticket,batchId,index,item,mode},{...binding,timeouts,waitForSlot:!!timeouts},controller,onProgress,
   ()=>({file,binding:{batchId,index,source,relativePath,mode}}));
 }
 async function dispatchStored({staged,...input},batch,controller,onProgress){
  const {item,batchId,index,mode}=input;
  return dispatchFile(input,{...batch,waitForSlot:true},controller,onProgress,()=>{
   const {file,relativePath,name,size,lastModified}=staged;
   if(!(file instanceof File)||file.name!==name||file.size!==size||file.lastModified!==lastModified||
      name!==item.name||relativePath!==item.relativePath)return null;
   return {file,binding:{source:batch.target,batchId,index,mode,relativePath}};
  });
 }
 async function reconcileUploadBatch({batch,flight,item,signal,expectedSession}){
  signal?.throwIfAborted();
  assertConnected();
  const auth=await oauth.authority();
  if(expectedSession!==undefined&&auth.sessionId!==expectedSession)throw uploadError('AUTH_SESSION_CHANGED','Reconnect and explicitly resume this upload.');
  if(!auth.accounts.some(account=>account.id===batch.target.accountId)||!uploadReadScopes.every(scope=>auth.scopes?.includes(scope)))
   throw uploadError('SCOPE_UNAUTHORIZED','Reconnect the selected Cloudflare account to check this upload.');
  const stored=await current.readRemoteResult(flight.ticket);
  const claimKey=localUploadClaimKey(batch.target,item.key);
  if(!stored){
   // The signed transfer requires a preceding durable CURRENT checkpoint.
   await release(claimKey,flight.ticket);
   return {state:'reselect'};
  }
  if(!stored.localUpload||stored.localUpload.batchId!==batch.id||stored.localUpload.key!==item?.key)return null;
  const receipt=await reconcileLocalUpload(stored.localUpload,claimKey);
  if(!receipt&&stored.localUpload.commitRequested===false&&
     (stored.state==='pending'||flight.retryAt&&['failed','cancelled'].includes(stored.state)))
   return {state:'reselect',retryPrecommit:true};
  if(receipt)return {state:'completed',code:'LOCAL_UPLOAD_RECONCILED',receipt};
  const last=await current.readRemoteResult(flight.ticket);
  if(['failed','blocked','cancelled'].includes(last?.state))
   return {state:last.state,code:last.code};
  return null;
 }
 return Object.freeze({checkDestination:checkUploadDestination,validatePlan,run:runLocalUpload,dispatch:dispatchLocalUpload,
  dispatchLabFile,dispatchStored,reconcile:reconcileUploadBatch,reconcileFile:(job,options)=>reconcileLocalUpload(job,localUploadClaimKey(job.source,job.key),options),
  isActive:id=>activeLocalUploads.has(id),cancel:id=>{
   const job=activeLocalUploads.get(id);
   if(!job)return null;
   job.controller.abort();
   return {state:'cancellation-requested'};
  },cancelAll:()=>[...activeLocalUploads.values()].map(job=>{
   job.controller.abort();
   return {state:'cancellation-requested'};
  })});
}
