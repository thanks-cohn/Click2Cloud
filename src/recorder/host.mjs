import {providerObservation} from './provider-observation.mjs';
import {createRecorder} from './recorder.mjs';
// Dedicated local versioned channel, accepted only after appSenderDecision in the
// existing message owner. No agent/debug grant implies RAW collection authority.
export async function createRecorderHost({chrome,build,startupGaps=()=>0}){
 const recorder=createRecorder({build});let debug=false;const snapshots=new Map();
 // No await of recorder DB readiness in bootstrap or on a delivered gesture.
 try{debug=(await chrome.storage.local.get('uiDebugMode')).uiDebugMode===true;}catch{}
 void recorder.setDebug(debug).catch(()=>{});
 void recorder.ready.then(()=>recorder.setDebug(debug)).catch(()=>{});
 chrome.storage.onChanged?.addListener((changes,area)=>{if(area==='local'&&changes.uiDebugMode){debug=changes.uiDebugMode.newValue===true;void recorder.setDebug(debug).catch(()=>{});}});
 return {
  click({attemptId,timestampUtc,monotonicMs,menuGeneration,info,tab,row}){
   const pageUrl=info.pageUrl??tab?.url,sourceUrl=info.srcUrl??info.linkUrl??info.pageUrl;
   recorder.observe({stage:'CLICK_RECEIVED',attemptId,timestampUtc,monotonicMs,menuGeneration,providerId:row?.target?.provider??row?.providerAction??row?.origin?.provider,mode:row?.origin?.mode,context:['audio','video'].includes(info.mediaType)?info.mediaType:info.srcUrl?'image':info.linkUrl?'link':'page',pageUrl,sourceUrl,raw:{pageUrl,sourceUrl,menuItemId:String(info.menuItemId)}});
   return event=>{const result=event.result;recorder.observe({...event,attemptId,...(event.stage==='native.terminal'?{proof:providerObservation(row?.target?.provider??row?.providerAction,result),raw:{...result?.receipt,...result?.destination,providerOperationId:result?.remoteOperationId??result?.operationId,errorMessage:result?.errorMessage}}:{})});};
  },
  async request(message){try{
   if(message.version!==2||!['status','debug','capacity','start','stop','snapshot','page','runs'].includes(message.method))throw Error('INVALID_RECORDER_REQUEST');
   const p=message.params??{};if(!p||typeof p!=='object'||Array.isArray(p))throw Error('INVALID_RECORDER_REQUEST');let data;
   if(message.method==='status')data={...await recorder.status(),startupGapsLowerBound:startupGaps()};
   else if(message.method==='debug'){if(typeof p.enabled!=='boolean')throw Error('INVALID_RECORDER_REQUEST');if(!p.enabled)await recorder.stop();await chrome.storage.local.set({uiDebugMode:p.enabled});debug=p.enabled;data=await recorder.setDebug(debug);}
   else {if(!debug)throw Error('DEBUG_REQUIRED');
    if(message.method==='runs'){if(p.after&&(!Array.isArray(p.after)||p.after.length!==2||p.after.some(v=>typeof v!=='string')))throw Error('INVALID_CURSOR');data=await recorder.listRuns(p.after);}
    if(message.method==='capacity')data=await recorder.setCapacity(p.value,p.confirmed===true);
    if(message.method==='start')data=await recorder.start({limit:p.limit,unlimited:p.unlimited===true,consent:p.consent===true});
    if(message.method==='stop')data=await recorder.stop();
    if(message.method==='snapshot'){data=await recorder.snapshot(p.runId);snapshots.set(data.id,data);if(snapshots.size>8)snapshots.delete(snapshots.keys().next().value);}
    if(message.method==='page'){const snap=snapshots.get(p.snapshotId);if(!snap)throw Error('SNAPSHOT_NOT_OPEN');if(!['RAW','SECURE'].includes(p.privacy))throw Error('PRIVACY_REQUIRED');if(p.privacy==='RAW'&&p.consent!==true)throw Error('RAW_EXPORT_CONSENT_REQUIRED');for(const key of ['basicAfter','richAfter'])if(p[key]!==undefined&&(!Number.isSafeInteger(p[key])||p[key]<0))throw Error('INVALID_CURSOR');data=await recorder.page(snap,p);if(p.privacy==='SECURE'){const {secureBasic,secureEvent}=await import('./schema.mjs');const {sha256}=await import('./storage.mjs');for(const segment of data.segments)if(await sha256(segment.priorHash+'\n'+segment.jsonl)!==segment.hash)throw Error('SEGMENT_HASH_MISMATCH');data={basic:data.basic.map(row=>({sequence:row.sequence,...secureBasic(row)})),segments:data.segments.map(s=>({start:s.start,end:s.end,events:s.jsonl.trim().split('\n').map(line=>secureEvent(JSON.parse(line)))}))};}}
   }
   return {version:2,state:'completed',data};
  }catch(error){return {version:2,state:'failed',code:/^[A-Z_]+$/.test(error.message)?error.message:'RECORDER_UNAVAILABLE'};}}
 };
}
