// Provider-neutral v2 observation contract. No provider/network authority.
export const DETAIL_METRICS=Object.freeze(['dispatchPreparationMs','intentAuthorizationMs','capabilityMs','authorizationRecheckMs','workerRequestMs','completionElapsedMs','transportElapsedMs','endToEndElapsedMs']);
const unavailableField=(key,value)=>value===null||['providerId','mode','context'].includes(key)&&value==='other'||key==='proofLevel'&&value==='unknown'||key==='evidenceClass'&&value==='not_observed';
const availabilityReason=v=>['not_observed','not_applicable','unavailable','unsupported','interrupted','cross_epoch','redacted','invalid_measurement'].includes(v)?v:'not_observed';
export const FIELDS=Object.freeze(['attemptId','schemaVersion','clickTimestampUtc','appId','appVersion','build','workerEpoch','pageOrigin','websiteHost','sourceOrigin','sourceHost','sourceUrlSanitized','providerId','mode','context','state','reasonCode','proofLevel','evidenceClass','bytesObserved','bytesVerified','clickToDispatchMs','sourceAcquireMs','sourceReadThroughputBytesPerSecond','providerRequestLatencyMs','uploadElapsedMs','uploadThroughputBytesPerSecond','verificationElapsedMs','clickToVerifiedMs','endToEndEffectiveBytesPerSecond','outcomeCompleteness','missingFields','dataLossFlag','menuGeneration','engineOperationId','remoteOperationId',...DETAIL_METRICS]);
export const METRICS=Object.freeze([...FIELDS.slice(19,30),...DETAIL_METRICS]);
export const STATES=['pending','verified','failed','blocked','cancelled','uncertain','interrupted'];
export const PROVIDERS=['cloudflare','google-drive','onedrive','dropbox','other'];
export const STAGES=['CLICK_RECEIVED','dispatch.enter','auth.check','resolver','capture.acquire','intent','worker.capability','transfer.upload','transfer.verify','completion.history','native.terminal','provider.request','native.identity','provider.verification'];
export const safeId=v=>typeof v==='string'&&/^[a-z0-9-]{1,64}$/i.test(v)?v:null;
export const number=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
export function capacity(value){if(!Number.isSafeInteger(value)||value<1)throw Error('POSITIVE_SAFE_INTEGER_REQUIRED');return value;}
export function origin(value){try{if(typeof value!=='string'||value.length>16384)return null;const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.origin:null;}catch{return null;}}
export function materialize(compact={}){
 const out={},availability={};for(const key of FIELDS){out[key]=compact[key]??null;if(unavailableField(key,out[key]))availability[key]={value:'N/A',reason:availabilityReason(compact.availability?.[key]?.reason)};}
 out.schemaVersion=2;out.missingFields=Object.keys(availability);out.availability=availability;return out;
}
export function secureBasic(row){
 const out=materialize(row);for(const k of ['pageOrigin','websiteHost','sourceOrigin','sourceHost','sourceUrlSanitized']){out[k]=null;out.availability[k]={value:'N/A',reason:'redacted'};}
 // Only generated correlation IDs and enumerated/typed scalars cross this boundary.
 for(const k of ['attemptId','workerEpoch'])if(!/^[a-f0-9-]{36}$/i.test(out[k]??'')){out[k]=null;out.availability[k]={value:'N/A',reason:'invalid_measurement'};}
 out.providerId=PROVIDERS.includes(out.providerId)?out.providerId:'other';out.mode=['simple','narrow','depth','other'].includes(out.mode)?out.mode:'other';out.context=['image','link','page','audio','video','other'].includes(out.context)?out.context:'other';
 out.state=STATES.includes(out.state)?out.state:'uncertain';out.reasonCode=null;out.availability.reasonCode={value:'N/A',reason:'redacted'};
 out.clickTimestampUtc=instant(out.clickTimestampUtc);out.appId='click2cloud';out.appVersion=/^\d+\.\d+\.\d+$/.test(out.appVersion??'')?out.appVersion:null;out.build=/^[a-f0-9]{40}$/.test(out.build??'')?out.build:null;
 out.menuGeneration=number(out.menuGeneration);out.engineOperationId=number(out.engineOperationId);out.remoteOperationId=uuid(out.remoteOperationId);out.proofLevel=['independently_verified','provider_accepted','unknown'].includes(out.proofLevel)?out.proofLevel:'unknown';out.evidenceClass=['authoritative-receipt','fixture-only','not_observed'].includes(out.evidenceClass)?out.evidenceClass:'not_observed';out.outcomeCompleteness=['pending','terminal','interrupted'].includes(out.outcomeCompleteness)?out.outcomeCompleteness:'interrupted';out.dataLossFlag=out.dataLossFlag===true;
 for(const k of METRICS)out[k]=number(out[k]);out.missingFields=FIELDS.filter(k=>unavailableField(k,out[k]));for(const key of out.missingFields)out.availability[key]??={value:'N/A',reason:'invalid_measurement'};return out;
}
export function summary(rows){
 const counts=Object.fromEntries(STATES.map(s=>[s,0]));for(const r of rows)counts[STATES.includes(r.state)?r.state:'uncertain']++;
 const metrics={};for(const key of METRICS.filter(k=>!k.startsWith('bytes'))){const v=rows.map(r=>number(r[key])).filter(x=>x!==null).sort((a,b)=>a-b);metrics[key]={samples:v.length,mean:v.length?v.reduce((a,b)=>a+b,0)/v.length:'N/A',p50:v.length?v[Math.ceil(v.length*.5)-1]:'N/A',p95:v.length?v[Math.ceil(v.length*.95)-1]:'N/A',p99:v.length?v[Math.ceil(v.length*.99)-1]:'N/A'};}
 const resolved=counts.verified+counts.failed+counts.blocked+counts.cancelled;
 return {scope:'retained_observed_attempts',eligible:rows.length,counts,verified:{numerator:counts.verified,denominator:rows.length,percent:rows.length?100*counts.verified/rows.length:'N/A'},resolvedOnly:{numerator:counts.verified,denominator:resolved,percent:resolved?100*counts.verified/resolved:'N/A'},metrics};
}
// Rich RAW is an explicit, bounded metadata allowlist, never arbitrary objects/headers.
export const RAW_FIELDS=Object.freeze(['pageUrl','sourceUrl','finalUrl','filename','accountId','bucketName','prefix','key','errorName','errorMessage','errorStack','menuItemId','providerOperationId']);
export function rawFields(input){const out=Object.fromEntries(RAW_FIELDS.map(k=>[k,null]));for(const k of RAW_FIELDS)try{const v=input?.[k];if(typeof v==='string'&&v.length<=8192)out[k]=v;}catch{}return out;}
const uuid=v=>/^[a-f0-9-]{36}$/i.test(v??'')?v:null;
const instant=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)?v:null;
const screenshotStages=['COMMAND_RECEIVED','TAB_RESOLVED','PAGE_ELIGIBLE','RULES_MATCHED','CAPTURE_REQUESTED',
 'PNG_CAPTURED','R2_PUT_SENT','R2_RESPONSE','R2_READBACK','VERIFIED','PENDING','FAILED'];
const captureStages=['window-observation','tab-observation','page-eligibility','rule-matching','capture-preparation',
 'capture-api','png-validation','r2-upload'];
const browserErrors=['chrome-window-error','chrome-tabs-query-error','chrome-frame-error','chrome-rate-limit',
 'chrome-permission-denied','chrome-capture-error'];
const screenshotMethod=value=>value==='direct-r2-object-api'?value:null;
const screenshotHttpStatus=value=>Number.isInteger(value)&&value>=100&&value<=599?value:null;
const screenshotProviderCodes=value=>(Array.isArray(value)?value:[]).filter(item=>Number.isSafeInteger(item)||typeof item==='string'&&/^\d{1,16}$/.test(item)).slice(0,16);
export function secureEvent(e){return {schemaVersion:2,runId:uuid(e.runId),sequence:Number.isSafeInteger(e.sequence)?e.sequence:null,attemptId:/^[a-f0-9-]{36}$/i.test(e.attemptId??'')?e.attemptId:null,workerEpoch:uuid(e.workerEpoch),menuGeneration:number(e.menuGeneration),engineOperationId:number(e.engineOperationId),remoteOperationId:uuid(e.remoteOperationId),reasonCode:null,stage:STAGES.includes(e.stage)?e.stage:'N/A',outcome:[...STATES,'started','ok','skipped','observed'].includes(e.outcome)?e.outcome:'N/A',monotonicMs:number(e.monotonicMs),timestampUtc:instant(e.timestampUtc),providerId:PROVIDERS.includes(e.providerId)?e.providerId:'other',mode:['simple','narrow','depth','other'].includes(e.mode)?e.mode:'other',context:['image','link','page','video','audio','other'].includes(e.context)?e.context:'other',metrics:Object.fromEntries(METRICS.map(k=>[k,number(e.metrics?.[k])])),availability:Object.fromEntries([...METRICS.filter(k=>number(e.metrics?.[k])===null),...['providerId','mode','context'].filter(k=>!e[k]||e[k]==='other')].map(k=>[k,{value:'N/A',reason:availabilityReason(e.availability?.[k]?.reason)}])),proofLevel:['independently_verified','provider_accepted','unknown'].includes(e.proofLevel)?e.proofLevel:'unknown',privacy:'SECURE',raw:Object.fromEntries(RAW_FIELDS.map(k=>[k,null])),rawAvailability:Object.fromEntries(RAW_FIELDS.map(k=>[k,{value:'N/A',reason:'redacted'}]))};}

// Screenshot receipts use the same RAW/SECURE export boundary. Project only
// observed scalars in SECURE so paths, names, URLs and cloud metadata cannot leak.
export function screenshotReceipt(job,{secure=false}={}){
 const {plan}=job;
 const ids={captureId:uuid(plan.captureId),signalId:uuid(plan.signalId),operationId:uuid(plan.operationId),jobId:uuid(plan.jobId)};
 const contributors=(plan.matchedRuleIds??[]).map(uuid).filter(Boolean);
 const states=['confirmed','partial','pending','unknown','failed','blocked'];
 const state=value=>states.includes(value)?value:'unknown';
 const code=value=>/^[A-Z][A-Z0-9_]{1,79}$/.test(value??'')?value:null;
 const outputId=value=>typeof value==='string'&&/^[a-f0-9-]{36}-[1-9][0-9]*$/.test(value)?value:null;
 const failureStage=value=>captureStages.includes(value)?value:null;
 const trace=(job.trace??[]).filter(event=>screenshotStages.includes(event.stage)).map(event=>({
  captureId:ids.captureId,outputId:outputId(event.outputId),stage:event.stage,at:instant(event.at),code:code(event.code),
  outcome:[...states,'ok','started','no-match','unconfirmed'].includes(event.outcome)?event.outcome:null,
  failureStage:failureStage(event.failureStage),browserError:browserErrors.includes(event.browserError)?event.browserError:null,
  ...(typeof event.commandTab==='boolean'?{commandTab:event.commandTab}:{}),
  ...(Number.isSafeInteger(event.attempt)?{attempt:event.attempt}:{}),
  httpStatus:screenshotHttpStatus(event.httpStatus),providerCodes:screenshotProviderCodes(event.providerCodes),
  recoverable:typeof event.recoverable==='boolean'?event.recoverable:null
 }));
 const latestAttempt=job.attempts.at(-1),traceGaps=[];
 if(job.schemaVersion===2){
  const has=stage=>trace.some(event=>event.stage===stage);
  const expected=job.captured?screenshotStages.slice(0,6):['COMMAND_RECEIVED'];
  for(const stage of expected)if(!has(stage))traceGaps.push({stage,outputId:null});
  if(!job.finishedAt&&!latestAttempt)traceGaps.push({stage:'CAPTURE_RESULT',outputId:null});
  const byOutput=new Map();
  for(const event of trace)if(event.outputId&&event.attempt===job.attempts.length){
   if(!byOutput.has(event.outputId))byOutput.set(event.outputId,[]);
   byOutput.get(event.outputId).push(event);
  }
  for(const id of latestAttempt?.outputIds??[]){
   const events=byOutput.get(id)??[];
   if(!events.some(event=>['VERIFIED','PENDING','FAILED'].includes(event.stage)))traceGaps.push({stage:'OUTPUT_RESULT',outputId:outputId(id)});
   if(events.filter(event=>event.stage==='R2_PUT_SENT').length>events.filter(event=>event.stage==='R2_RESPONSE').length)
    traceGaps.push({stage:'R2_RESPONSE',outputId:outputId(id)});
   if(events.some(event=>event.stage==='VERIFIED')&&!events.some(event=>event.stage==='R2_READBACK'&&event.outcome==='ok'))
    traceGaps.push({stage:'R2_READBACK',outputId:outputId(id)});
  }
 }
 return {schemaVersion:job.schemaVersion===2?2:1,kind:'screenshot-to-cloud',...ids,commandId:plan.commandId,configurationVersion:number(plan.configurationVersion),
  ...(job.schemaVersion===2?{method:screenshotMethod(job.method),failureStage:failureStage(job.failureStage),trace,traceGaps,
   retryExpiresAt:instant(job.retryExpiresAt),originalUnavailable:job.originalUnavailable===true}:{}),
  dedup:typeof plan.dedup==='boolean'?plan.dedup:null,state:state(job.state),code:code(job.code),
  startedAt:instant(plan.startedAt),finishedAt:instant(job.finishedAt),matchedRuleIds:contributors,
  ...(secure?{}:{source:plan.context,matchedRules:plan.matchedRules??[]}),
  captured:job.captured?{mime:'image/png',bytes:number(job.captured.bytes),at:instant(job.captured.at),...(secure?{}:{sha256:job.captured.sha256})}:null,
  attempts:job.attempts.map(attempt=>({startedAt:instant(attempt.startedAt),finishedAt:instant(attempt.finishedAt),
   requestedBytes:number(attempt.requestedBytes),receivedBytes:number(attempt.receivedBytes),code:code(attempt.code),
   ...(attempt.method?{method:screenshotMethod(attempt.method)}:{}),
   state:['started','worker-responded','direct-r2-completed','readback-only','unconfirmed'].includes(attempt.state)?attempt.state:'unconfirmed',
   outputIds:attempt.outputIds.map(outputId).filter(Boolean)})),
  outputs:plan.outputs.map((target,index)=>{
   const observation=job.outputs[index]??{};
   return {outputId:outputId(target.outputId),ruleIds:target.ruleIds.map(uuid).filter(Boolean),state:state(observation.state),
    at:instant(observation.at),code:code(observation.code),bytes:number(observation.bytes),
    comparison:['match','mismatch','unknown','not_checked'].includes(observation.comparison)?observation.comparison:'not_checked',
    verification:['independent-r2-head-sha256','direct-r2-get-sha256'].includes(observation.verification)?observation.verification:null,
    ...(observation.method?{method:screenshotMethod(observation.method),httpStatus:screenshotHttpStatus(observation.httpStatus),
     providerCodes:screenshotProviderCodes(observation.providerCodes),recoverable:observation.recoverable===true}:{}),
    ...(secure?{}:{destination:target.target,key:target.key,checksum:observation.checksum,etag:observation.etag,version:observation.version})};
  })};
}
