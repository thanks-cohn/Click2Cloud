// Provider-neutral v2 observation contract. No provider/network authority.
export const DETAIL_METRICS=Object.freeze(['dispatchPreparationMs','intentAuthorizationMs','capabilityMs','authorizationRecheckMs','workerRequestMs','completionElapsedMs','transportElapsedMs','endToEndElapsedMs']);
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
 const out={},availability={};for(const key of FIELDS){out[key]=compact[key]??null;if(out[key]===null||['providerId','mode','context'].includes(key)&&out[key]==='other')availability[key]={value:'N/A',reason:availabilityReason(compact.availability?.[key]?.reason)};}
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
 for(const k of METRICS)out[k]=number(out[k]);out.missingFields=FIELDS.filter(k=>out[k]===null||['providerId','mode','context'].includes(k)&&out[k]==='other');for(const key of out.missingFields)out.availability[key]??={value:'N/A',reason:'invalid_measurement'};return out;
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
export function secureEvent(e){return {schemaVersion:2,runId:uuid(e.runId),sequence:Number.isSafeInteger(e.sequence)?e.sequence:null,attemptId:/^[a-f0-9-]{36}$/i.test(e.attemptId??'')?e.attemptId:null,workerEpoch:uuid(e.workerEpoch),menuGeneration:number(e.menuGeneration),engineOperationId:number(e.engineOperationId),remoteOperationId:uuid(e.remoteOperationId),reasonCode:null,stage:STAGES.includes(e.stage)?e.stage:'N/A',outcome:[...STATES,'started','ok','skipped','observed'].includes(e.outcome)?e.outcome:'N/A',monotonicMs:number(e.monotonicMs),timestampUtc:instant(e.timestampUtc),providerId:PROVIDERS.includes(e.providerId)?e.providerId:'other',mode:['simple','narrow','depth','other'].includes(e.mode)?e.mode:'other',context:['image','link','page','video','audio','other'].includes(e.context)?e.context:'other',metrics:Object.fromEntries(METRICS.map(k=>[k,number(e.metrics?.[k])])),availability:Object.fromEntries([...METRICS.filter(k=>number(e.metrics?.[k])===null),...['providerId','mode','context'].filter(k=>!e[k]||e[k]==='other')].map(k=>[k,{value:'N/A',reason:availabilityReason(e.availability?.[k]?.reason)}])),proofLevel:['independently_verified','provider_accepted','unknown'].includes(e.proofLevel)?e.proofLevel:'unknown',privacy:'SECURE',raw:Object.fromEntries(RAW_FIELDS.map(k=>[k,null])),rawAvailability:Object.fromEntries(RAW_FIELDS.map(k=>[k,{value:'N/A',reason:'redacted'}]))};}
