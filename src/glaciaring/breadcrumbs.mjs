import {REASON_CODES,CRITICAL_BOUNDARIES} from './catalog.mjs';
import {shortcutRecord} from './shortcut-trace.mjs';
const stages=new Set(CRITICAL_BOUNDARIES.map(r=>r.stage)),codes=new Set(REASON_CODES),outcomes=new Set(['failed','blocked','uncertain','partial','interrupted']);
const n=x=>Number.isSafeInteger(x)&&x>=0?x:0;
function combineEvents(rows){
 const events=new Map();
 for(const row of rows){
  if(!row.shortcut){events.set(Symbol(),row);continue;}
  const id=row.shortcut[0].correlationId,previous=events.get(id);
  const steps=new Map(previous?.shortcut.map(step=>[step.phase,step]));
  for(const step of row.shortcut)steps.set(step.phase,step);
  events.delete(id);
  events.set(id,{...row,shortcut:[...steps.values()]});
 }
 return [...events.values()];
}
// Severity-triggered, bounded, asynchronous. No config, account or route copies.
export function createBreadcrumbs({read,write,clock=Date.now,epoch=1,build,capacity=32,retentionMs=604800000,delayMs=250}={}){
 if(!Number.isInteger(capacity)||capacity<1||capacity>128||!Number.isFinite(retentionMs)||retentionMs<1||retentionMs>604800000)throw TypeError('Invalid breadcrumb budget');
 let pending=[],timer,flushing=null,dropped=0,writeFailures=0,coalesced=0;const seen=new Set();
 function safe(e,raw=false){
  const shortcut=e?.stage==='chrome.shortcut'&&Array.isArray(e.shortcut)?e.shortcut.slice(0,24).map(step=>shortcutRecord(step,{raw})).filter(Boolean):null;
  if(!shortcut?.length&&!(e&&stages.has(e.stage)&&codes.has(e.code)&&(outcomes.has(e.outcome)||e.stage==='lifecycle'&&e.outcome==='ok')))return null;
  return {stage:e.stage,code:shortcut?'SHORTCUT_TRACE':e.code,outcome:shortcut?'partial':e.outcome,
   operationId:n(e.operationId),generation:n(e.generation),revision:n(e.revision),epoch:n(e.epoch??epoch),
   build:/^[a-f0-9]{7,40}$/.test(e.build??build??'')?(e.build??build):null,schemaVersion:1,at:n(e.at??clock()),...(shortcut?{shortcut}:{})};
 }
 async function inspect({raw=false}={}){try{const stored=await read();if(stored!==undefined&&(!stored||stored.version!==1||Object.keys(stored).some(k=>!['version','events','dropped'].includes(k))))return {events:[],coverage:'UNOBSERVED',dropped,writeFailures,code:'BREADCRUMB_STORAGE_UNAVAILABLE',reason:'UNSUPPORTED_DIAGNOSTIC_SCHEMA_PRESERVED'};const rows=Array.isArray(stored?.events)?stored.events:[],events=rows.slice(-capacity).map(event=>safe(event,raw)).filter(Boolean).filter(e=>clock()-e.at>=0&&clock()-e.at<=retentionMs).slice(-capacity);return {events,coverage:events.length?'PARTIAL':'UNOBSERVED',coalesced,pending:pending.length,flushing:!!flushing,storedDropped:n(stored?.dropped),dropped:dropped+n(stored?.dropped),expiredOrOmitted:rows.length-events.length,writeFailures,originalCause:'UNKNOWN',retentionMs,capacity};}catch{return {events:[],coverage:'UNOBSERVED',dropped,writeFailures,code:'BREADCRUMB_STORAGE_UNAVAILABLE'};}}
 async function flush(){clearTimeout(timer);timer=null;if(flushing)return flushing;if(!pending.length)return;const batch=pending,localDropped=dropped;pending=[];dropped=0;flushing=(async()=>{try{const old=await inspect({raw:true});if(old.code)throw Error('BREADCRUMB_READBACK_UNCONFIRMED');const events=combineEvents([...old.events,...batch]);const payload={version:1,events:events.slice(-capacity),dropped:n(old.storedDropped)+localDropped+Math.max(0,events.length-capacity)};await write(payload);const confirmed=await read();if(JSON.stringify(confirmed)!==JSON.stringify(payload))throw Error('BREADCRUMB_READBACK_UNCONFIRMED');}catch{writeFailures++;dropped+=localDropped+batch.length;}})();try{await flushing;}finally{flushing=null;if(pending.length)timer=setTimeout(()=>void flush(),delayMs);}}
 function queue(event){if(pending.length>=capacity){pending.shift();dropped++;}pending.push(event);if(!timer&&!flushing)timer=setTimeout(()=>void flush(),delayMs);}
 function enqueue(event){try{const e=safe(event);if(!e)return;const key=e.stage+':'+e.code+':'+e.generation;if(seen.has(key)){coalesced++;return;}if(seen.size>=128){dropped++;return;}seen.add(key);queue(e);}catch{dropped++;}}
 function observeShortcut(identity,phase,outcome,details={}){
  try{
   const at=clock();
   const step=shortcutRecord({...details,...identity,phase,outcome,at,epoch},{raw:true});
   if(!step)return;
   const event=safe({stage:'chrome.shortcut',at,shortcut:[step]},true);
   const prior=pending.findIndex(row=>row.shortcut?.[0].correlationId===step.correlationId);
   if(prior>=0){[pending[prior]]=combineEvents([pending[prior],event]);return;}
   queue(event);
  }catch{dropped++;}
 }
 return Object.freeze({enqueue,observeShortcut,inspect,flush});
}
