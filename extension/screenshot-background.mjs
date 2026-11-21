import {createScreenshotRules,screenshotTarget,screenshotCommands,screenshotError,captureUuid} from '../src/screenshot/rules.mjs';
import {createScreenshotCapture} from '../src/screenshot/capture.mjs';
import {createScreenshotRetryCache} from '../src/screenshot/retry-cache.mjs';
import {captureHistoryContext,safeHistoryURL} from '../src/history/model.mjs';
import {createDirectScreenshotUpload} from '../src/cloudflare/screenshot-direct-upload.mjs';
import {retainedScreenshotOutput,matchScreenshotObject} from '../src/history/screenshot-output.mjs';

export function createScreenshotBackground({chrome,oauth,current,fileApi,historyUrls,retryCache=createScreenshotRetryCache()}){
 const storage=chrome.storage.local;
 const uploader=createDirectScreenshotUpload(oauth);
 const send=message=>chrome.runtime.sendMessage(message).catch(()=>{});
 async function authorizeTarget(input){
  const target=screenshotTarget(input);
  const auth=await oauth.authority();
  if(!auth.accounts.some(account=>account.id===target.accountId))throw screenshotError('SCOPE_UNAUTHORIZED');
  await uploader.checkBucket(target,auth.sessionId);
  return target;
 }
 async function discoverDefault(){
  try{
   const auth=await oauth.authority();
   const selected=auth.accounts.length===1?auth.accounts[0].id:(await current.read()).product.cloudflare.selectedAccountId;
   if(!auth.accounts.some(account=>account.id===selected))return null;
   const target={provider:'cloudflare',connectionId:'cloudflare:'+selected,accountId:selected,bucketName:'redown',prefix:'screenshots/'};
   await uploader.checkBucket(target,auth.sessionId);
   return target;
  }catch{return null;}
 }
 const rules=createScreenshotRules({storage,authorizeTarget,discoverDefault});
 const runner=createScreenshotCapture({chrome,rules,uploader,retryCache,
  async record(job){
   await current.recordRemoteResult({
   operationId:job.plan.operationId,kind:'screenshot-to-cloud',state:job.state,code:job.code,
   attemptedFilename:'Screenshot',bytes:job.captured?.bytes,historyContext:captureHistoryContext({pageUrl:job.plan.context?.url}),
   screenshot:{...job,plan:{...job.plan,context:job.plan.context?
    {...job.plan.context,url:safeHistoryURL(job.plan.context.url)}:null}}
   });
   void send({channel:'screenshot-history-changed',operationId:job.plan.operationId});
  },
  read:async id=>{const row=await current.readRemoteResult(id);return row?.kind==='screenshot-to-cloud'?row.screenshot:null;},
  progress:job=>send({channel:'screenshot-result',state:'uploading',windowId:job.plan.context?.windowId,total:job.outputs.length}),
  async notify(job,{recorded}){
   const confirmed=job.outputs.filter(output=>output.state==='confirmed').length;
   const retryable=job.outputs.filter(output=>job.cachedAt&&!job.originalUnavailable&&output.state!=='confirmed'&&output.recoverable).length;
   const lastAttempt=job.attempts.at(-1);
   for(const [index,result] of job.outputs.entries())if(result.state==='confirmed'&&lastAttempt?.outputIds.includes(result.outputId)){
    const {target,key}=job.plan.outputs[index];
    try{void Promise.resolve(fileApi.noteRemoteWrite({state:'verified',operationId:result.outputId,destination:{...target,provider:'cloudflare-r2',prefix:target.prefix.slice(0,-1)},receipt:{key}})).catch(()=>{});}
    catch{}
   }
   const code=job.code??(confirmed?undefined:job.outputs.find(output=>output.code)?.code);
   await send({channel:'screenshot-result',windowId:job.plan.context?.windowId,confirmed,total:job.outputs.length,state:job.state,code,recorded,retryable});
  }
 });
 async function historyOutput(params){
  if(!captureUuid(params.operationId)||typeof params.outputId!=='string')throw screenshotError('SCREENSHOT_REQUEST_INVALID');
  const output=retainedScreenshotOutput(await current.readRemoteResult(params.operationId),params);
  const auth=await oauth.authority();
  if(!auth.accounts.some(account=>account.id===output.target.accountId))throw screenshotError('SCOPE_UNAUTHORIZED');
  await uploader.checkBucket(output.target,auth.sessionId);
  if(!output.confirmed)return {...output,object:null,code:'SCREENSHOT_OBJECT_UNCONFIRMED'};
  const result=await fileApi.run('stat',{source:output.target,key:output.key});
  if(result.state!=='completed')throw screenshotError(result.code??'RESULT_LOOKUP_FAILED');
  const object=result.data?.object;
  if(!object)return {...output,object:null,code:'RESULT_NOT_FOUND'};
  if(!matchScreenshotObject(output,object))return {...output,object:null,code:'RESULT_CHANGED'};
  return {...output,object:{key:output.key,size:Number(object.size),etag:object.etag}};
 }
 async function request(method,params={}){
  if(method==='read')return rules.change('initialize-default');
  if(method==='suggest-default')return discoverDefault();
  if(['save','toggle','delete','dedup','save-default','dismiss-default'].includes(method))return rules.change(method,params);
  if(method==='retry'&&captureUuid(params.operationId))return runner.retry(params.operationId);
  if(method==='history-output')return historyOutput(params);
  if(['history-public-urls','history-enable-public-urls','history-connect-domain'].includes(method)){
   const output=await historyOutput(params);
   if(!output.object)throw screenshotError(output.code);
   return historyUrls(method,output,params);
  }
  throw screenshotError('SCREENSHOT_REQUEST_INVALID');
 }
 return {
  request,
  onCommand(command,tab){if(screenshotCommands.includes(command))void runner.start(command,tab).catch(()=>{});},
  prune:()=>retryCache.prune().catch(()=>{})
 };
}
