import {openVisibleTabSource} from '../chrome/visible-tab-screenshot.mjs';
import {SCREENSHOT_BYTES,screenshotDigest} from '../cloudflare/screenshot-wire.mjs';
import {capturePlan,screenshotError,screenshotIds,screenshotTarget} from './rules.mjs';

const observedCode=(error,fallback)=>/^[A-Z][A-Z0-9_]{1,79}$/.test(error?.code??'')?error.code:fallback;
const now=()=>new Date().toISOString();
export function screenshotAggregate(outputs){
 if(!outputs.length)return 'failed';
 const confirmed=outputs.filter(item=>item.state==='confirmed').length;
 if(confirmed)return confirmed===outputs.length?'confirmed':'partial';
 if(outputs.some(item=>['pending','unknown'].includes(item.state)))return 'unknown';
 return outputs.every(item=>item.state==='blocked')?'blocked':'failed';
}

export function createScreenshotCapture({chrome,rules,transport,retryCache,record,read,notify=()=>{}}){
 const active=new Set();
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
 function update(job,values){
  const at=now(),data=new Map(values.map(value=>[value.outputId,value]));
  job.outputs=job.outputs.map(output=>{
   const value=data.get(output.outputId);
   // Keep successful proof and original plan identity across retries.
   return value&&output.state!=='confirmed'?{outputId:output.outputId,state:value.state,code:value.code,
    comparison:value.comparison??'not_checked',at:value.at??at,...(value.verification?{verification:value.verification}:{}),
    ...(value.bytes===undefined?{}:{bytes:value.bytes}),...(value.checksum?{checksum:value.checksum,etag:value.etag,version:value.version}:{})}:output;
  });
 }
 async function deliver(job,image,{retry=false}={}){
  const {plan,captured}=job;
  const unresolved=plan.outputs.filter((_,index)=>job.outputs[index].state!=='confirmed');
  const selection=await transport.resolveScreenshotTargets(unresolved,job.boundTarget);
  job.boundTarget=selection.target;
  update(job,selection.excluded);
  const mark=(outputs,state,code)=>update(job,outputs.map(({outputId})=>({outputId,state,code})));
  const reduce=()=>{job.state=screenshotAggregate(job.outputs);};
  if(!selection.outputs.length){reduce();return;}
  const attempt={startedAt:now(),requestedBytes:image?.size??0,
   outputIds:selection.outputs.map(output=>output.outputId),state:'started'};
  job.attempts.push(attempt);
  // A worker restart can reconcile this frozen plan and the original PNG.
  await checkpoint(job);
  const data={plan,selection,image,byteLength:captured.bytes,imageDigest:captured.sha256,retry};
  try{
   const results=await transport.deliverScreenshot({...data,verify:!image});
   update(job,results);
   attempt.state=image?'worker-responded':'readback-only';
   if(image)attempt.receivedBytes=image.size;
  }catch(error){
   const code=observedCode(error,'SCREENSHOT_WORKER_RESPONSE_LOST');
   attempt.state='unconfirmed';attempt.code=code;
   const ambiguous=['SCREENSHOT_WORKER_RESPONSE_LOST','WRITE_UNCONFIRMED','RESPONSE_INVALID','RESPONSE_TOO_LARGE'].includes(code);
   mark(selection.outputs,ambiguous?'unknown':'blocked',code);
   if(image&&ambiguous){
    try{update(job,await transport.deliverScreenshot({...data,verify:true}));}
    catch{/* Leave the precise ambiguous upload status available for retry. */}
   }
  }
  attempt.finishedAt=now();
  if(!image){
   const absent=selection.outputs.filter(output=>job.outputs.find(result=>result.outputId===output.outputId)?.state==='unknown');
   mark(absent,'blocked','SCREENSHOT_ORIGINAL_UNAVAILABLE');
  }
  reduce();
  if(job.state==='confirmed')await retryCache.remove(plan.operationId).catch(()=>{});
 }
 async function start(commandId,tab,{oneOff,expectedContext}={}){
  const ids=screenshotIds(commandId),startedAt=now();
  const job={schemaVersion:1,plan:{...ids,startedAt,context:null,outputs:[],matchedRuleIds:[]},outputs:[],attempts:[],state:'pending'};
  active.add(ids.operationId);
  let source;
  try{
   source=await openVisibleTabSource(chrome,tab);
   if(expectedContext&&['tabId','windowId','url','documentId'].some(key=>source.context[key]!==expectedContext[key]))
    throw screenshotError('SCREENSHOT_PAGE_CHANGED');
   const config=oneOff?{dedup:true}:await rules.read();
   const plan=capturePlan({ids,config,context:source.context,oneOff:oneOff?screenshotTarget(oneOff):null,startedAt});
   if(!plan)return null;
   job.plan=plan;
   job.outputs=plan.outputs.map(({outputId})=>({outputId,state:'pending',comparison:'not_checked'}));
   const image=await source.capture();
   source.close();
   if(image.size<8||image.size>SCREENSHOT_BYTES)throw screenshotError('SCREENSHOT_IMAGE_SIZE_UNSUPPORTED');
   job.captured={at:now(),bytes:image.size,mime:'image/png',sha256:await screenshotDigest(await image.arrayBuffer())};
   try{await retryCache.store(ids.operationId,image);job.cachedAt=now();}catch{/* Storage pressure does not stop an authorized save. */}
   await deliver(job,image);
  }catch(error){
   job.code=observedCode(error,'SCREENSHOT_CAPTURE_FAILED');
   job.state=job.captured?'unknown':'failed';
   if(!job.plan.context&&source)job.plan.context=source.context;
   update(job,job.outputs.map(({outputId})=>({outputId,state:job.state,code:job.code})));
  }finally{source?.close();active.delete(ids.operationId);}
  return finish(job);
 }
 async function retry(operationId){
  if(active.has(operationId))throw screenshotError('SCREENSHOT_IN_PROGRESS');
  active.add(operationId);
  try{
   const job=await read(operationId);
   if(!job?.captured||job.state==='confirmed')throw screenshotError('SCREENSHOT_RETRY_UNAVAILABLE');
   let image;
   try{image=await retryCache.read(operationId);}catch{}
   if(image&&(image.size!==job.captured.bytes||await screenshotDigest(await image.arrayBuffer())!==job.captured.sha256))image=null;
   await deliver(job,image,{retry:true});
   return await finish(job);
  }finally{active.delete(operationId);}
 }
 return {start,retry};
}
