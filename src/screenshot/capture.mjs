import {openVisibleTabSource} from '../chrome/visible-tab-screenshot.mjs';
import {directScreenshotMethod} from '../cloudflare/screenshot-direct-upload.mjs';
import {SCREENSHOT_BYTES,screenshotDigest} from '../cloudflare/screenshot-wire.mjs';
import {capturePlan,screenshotError,screenshotIds,screenshotTarget} from './rules.mjs';
import {screenshotRetryLifetime} from './retry-cache.mjs';

const observedCode=(error,fallback)=>/^[A-Z][A-Z0-9_]{1,79}$/.test(error?.code??'')?error.code:fallback;
const now=()=>new Date().toISOString();
const maxActiveScreenshots=2;
export function screenshotAggregate(outputs){
 if(!outputs.length)return 'failed';
 const confirmed=outputs.filter(item=>item.state==='confirmed').length;
 if(confirmed)return confirmed===outputs.length?'confirmed':'partial';
 if(outputs.some(item=>['pending','unknown'].includes(item.state)))return 'unknown';
 return outputs.every(item=>item.state==='blocked')?'blocked':'failed';
}

export function createScreenshotCapture({chrome,rules,uploader,retryCache,record,read,notify=()=>{},progress=()=>{},transient=()=>{}}){
 const active=new Set();
 let lastFeedbackCode,lastFeedbackAt=0;
 function trace(job,stage,outcome,details={}){
  job.trace.push({captureId:job.plan.captureId,stage,outcome,at:now(),...details});
 }
 async function checkpoint(job){
  try{await record(structuredClone(job));return true;}
  catch{return false;}
 }
 async function finish(job){
  job.finishedAt=now();
  const recorded=await checkpoint(job);
  try{await notify(job,{recorded});}catch{}
  return job;
 }
 async function deliver(job,image,{retry=false,sessionId}={}){
  const {plan,captured}=job;
  job.method=directScreenshotMethod;
  const indexes=plan.outputs.flatMap((_,index)=>{
   const output=job.outputs[index];
   return output.state==='confirmed'||output.recoverable===false?[]:[index];
  });
  if(!indexes.length)return;
  const attempt={startedAt:now(),requestedBytes:image?.size??0,method:directScreenshotMethod,
   outputIds:indexes.map(index=>plan.outputs[index].outputId),state:'started'};
  job.attempts.push(attempt);
  const attemptNumber=job.attempts.length;
  await checkpoint(job);
  let authorityError;
  try{
   const latest=await uploader.authority();
   if(!latest?.sessionId||latest.sessionId!==sessionId)throw screenshotError('AUTH_SESSION_CHANGED');
  }catch(error){authorityError=error;}
  let next=0;
  async function uploadNext(){
   while(next<indexes.length){
    const index=indexes[next++],output=plan.outputs[index];
    const observe=(stage,outcome,details)=>{
     trace(job,stage,outcome,{outputId:output.outputId,attempt:attemptNumber,...details});
    };
    let result;
    try{
     result=authorityError
      ?{outputId:output.outputId,state:'blocked',code:observedCode(authorityError,'AUTH_REQUIRED'),recoverable:!!image,method:directScreenshotMethod}
      :await uploader.deliver({output,captureId:plan.captureId,image,byteLength:captured.bytes,
        imageDigest:captured.sha256,retry,sessionId,trace:observe});
    }catch(error){
     const code=observedCode(error,'SCREENSHOT_R2_UPLOAD_FAILED'),{httpStatus,providerCodes}=error?.diagnostic??{};
     result={outputId:output.outputId,state:'pending',code,httpStatus,providerCodes,recoverable:!!image,method:directScreenshotMethod};
    }
    job.outputs[index]={comparison:'not_checked',...result,at:now()};
    const stage=result.state==='confirmed'?'VERIFIED':(['pending','unknown'].includes(result.state)?'PENDING':'FAILED');
    observe(stage,result.state,{code:result.code,httpStatus:result.httpStatus,recoverable:result.recoverable});
    // Preserve confirmed and terminal transitions while avoiding one full
    // checkpoint for every intermediate, per-destination transport event.
    const previous=job.state;
    job.state=screenshotAggregate(job.outputs);
    if(previous!==job.state)await checkpoint(job);
   }
  }
  await Promise.all(Array.from({length:Math.min(3,indexes.length)},uploadNext));
  attempt.state=image?'direct-r2-completed':'readback-only';
  attempt.finishedAt=now();
  if(job.state==='confirmed')await retryCache.remove(plan.operationId).catch(()=>{});
 }
 function admissionFailure(code,windowId){
  const outcome={state:'blocked',code};
  const at=Date.now();
  if(code!==lastFeedbackCode||at-lastFeedbackAt>=500){
   lastFeedbackCode=code;lastFeedbackAt=at;
   try{void Promise.resolve(transient({...outcome,windowId})).catch(()=>{});}catch{}
  }
  return outcome;
 }
 async function start(commandId,tab,{oneOff,expectedContext}={}){
  if(active.size>=maxActiveScreenshots)return admissionFailure('SCREENSHOT_BUSY',tab?.windowId);
  const ids=screenshotIds(commandId),startedAt=now();
  const job={schemaVersion:2,method:directScreenshotMethod,plan:{...ids,startedAt,context:null,outputs:[],matchedRuleIds:[]},
   outputs:[],attempts:[],trace:[],state:'pending'};
  const observe=(stage,outcome,details)=>trace(job,stage,outcome,details);
  observe('COMMAND_RECEIVED','ok',{commandId});
  active.add(ids.operationId);
  let source;
  try{
   // Resolve the gesture's tab immediately so a slow auth refresh cannot
   // capture a later tab. Native capture waits for authorization, and we try
   // to record pending first. Denied admission leaves no History row.
   const [authority,tabObservation]=await Promise.allSettled([
    Promise.resolve().then(()=>uploader.authority()),openVisibleTabSource(chrome,tab,{trace:observe})
   ]);
   if(tabObservation.status==='fulfilled')source=tabObservation.value;
   const sessionId=authority.value?.sessionId;
   if(!sessionId)return admissionFailure(observedCode(authority.reason,'AUTH_REQUIRED'),source?.context.windowId??tab?.windowId);
   await checkpoint(job);
   try{
    if(!source)throw tabObservation.reason;
    job.plan.context=source.context;
    if(expectedContext&&['tabId','windowId','url','documentId'].some(key=>source.context[key]!==expectedContext[key]))
     throw Object.assign(screenshotError('SCREENSHOT_PAGE_CHANGED'),{stage:'tab-observation'});
    const config=oneOff?{dedup:true}:await rules.change('initialize-default');
    const plan=capturePlan({ids,config,context:source.context,oneOff:oneOff?screenshotTarget(oneOff):null,startedAt});
    observe('RULES_MATCHED',plan?'ok':'no-match',{count:plan?.matchedRuleIds.length??0});
    if(!plan)throw Object.assign(screenshotError('SCREENSHOT_NO_MATCHING_RULES'),{stage:'rule-matching'});
    job.plan=plan;
    job.outputs=plan.outputs.map(({outputId})=>({outputId,state:'pending',comparison:'not_checked'}));
    const image=await source.capture();
    source.close();
    if(image.size<8||image.size>SCREENSHOT_BYTES)
     throw Object.assign(screenshotError('SCREENSHOT_IMAGE_SIZE_UNSUPPORTED'),{stage:'png-validation'});
    job.captured={at:now(),bytes:image.size,mime:'image/png',sha256:await screenshotDigest(await image.arrayBuffer())};
    observe('PNG_CAPTURED','ok',{bytes:image.size});
    try{await progress(job);}catch{}
    try{
     await retryCache.store(ids.operationId,image);
     job.cachedAt=now();job.retryExpiresAt=new Date(Date.now()+screenshotRetryLifetime).toISOString();
    }catch{job.originalUnavailable=true;}
    await deliver(job,image,{sessionId});
    }catch(error){
    job.code=observedCode(error,'SCREENSHOT_CAPTURE_FAILED');
    job.state=job.captured?'unknown':'failed';
    job.failureStage=error?.stage??(job.captured?'r2-upload':'capture-preparation');
    observe('FAILED',job.state,{code:job.code,failureStage:job.failureStage,browserError:error?.browserError});
    job.outputs=job.outputs.map(output=>output.state==='confirmed'?output:{...output,state:job.state,code:job.code});
   }
   return await finish(job);
  }finally{source?.close();active.delete(ids.operationId);}
 }
 async function retry(operationId){
  if(active.has(operationId))throw screenshotError('SCREENSHOT_IN_PROGRESS');
  if(active.size>=maxActiveScreenshots)throw screenshotError('SCREENSHOT_BUSY');
  active.add(operationId);
  try{
   const {sessionId}=await uploader.authority();
   if(!sessionId)throw screenshotError('AUTH_REQUIRED');
   const job=await read(operationId);
   if(!job?.captured||job.state==='confirmed'||job.outputs.every(output=>output.state==='confirmed'||output.recoverable===false))
    throw screenshotError('SCREENSHOT_RETRY_UNAVAILABLE');
   job.trace??=[];
   job.schemaVersion=2;
   delete job.code;
   delete job.failureStage;
   let image;
   try{image=await retryCache.read(operationId);}catch{}
   if(image&&(image.size!==job.captured.bytes||await screenshotDigest(await image.arrayBuffer())!==job.captured.sha256))image=null;
   if(!image)job.originalUnavailable=true;
   await deliver(job,image,{retry:true,sessionId});
   return await finish(job);
  }finally{active.delete(operationId);}
 }
 return {start,retry};
}
