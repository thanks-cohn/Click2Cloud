import {FIELDS,number,origin,capacity,materialize,rawFields,STAGES,summary,METRICS} from './schema.mjs';
import {createWriter} from './writer.mjs';
import {openBasic,openRich} from './storage.mjs';
// Instantiate only in the background worker. Export/UI never owns recording.
export function createRecorder({epoch=crypto.randomUUID(),build={},storage={},maxActive=4096,clock=()=>performance.now(),basicFactory=openBasic,richFactory=openRich}={}){
 let basic=null,rich=null,run=null,starting=false,stopEpoch=0,debug=false,readyBasic=false,readyRich=false,basicFailed=false,richFailed=false;const active=new Map(),completed=new Set();let lost=0,extractionFailures=0;
 let basicOpening=null,richOpening=null;
 const ensureBasic=()=>{if(basic)return Promise.resolve(basic);if(!basicOpening)basicOpening=Promise.resolve().then(()=>basicFactory({...storage,epoch})).then(db=>{basic=db;readyBasic=true;basicFailed=false;return db;},error=>{basicOpening=null;basicFailed=true;throw error;});return basicOpening;};
 const ensureRich=()=>{if(rich)return Promise.resolve(rich);if(!richOpening)richOpening=Promise.resolve().then(()=>richFactory({...storage,epoch})).then(db=>{rich=db;readyRich=true;richFailed=false;run=db.active;if(run){run.admitted=Math.max(run.admitted,run.reserved);if(run.limit!==null&&run.admitted>=run.limit)run.state='LIMIT_REACHED';}return db;},error=>{richOpening=null;richFailed=true;throw error;});return richOpening;};
 const basicWriter=createWriter({commit:async rows=>{const db=await ensureBasic(),latest=new Map(rows.map(r=>[r.attemptId,r]));try{return await db.commit([...latest.values()]);}catch(error){if(error.name==='InvalidStateError'){db.close();basic=null;basicOpening=null;readyBasic=false;}throw error;}}});
 const richWriter=createWriter({sizeOf:event=>1024+Object.values(event.raw??{}).reduce((n,v)=>n+(typeof v==='string'?v.length*2:0),0),commit:async events=>{if(!rich)throw Error('RICH_UNAVAILABLE');let bytes=0;for(const id of new Set(events.map(e=>e.runId)))bytes+=await rich.append(events.filter(e=>e.runId===id));return bytes;}});
 const ready=Promise.allSettled([ensureBasic().then(()=>{void basicWriter.flush();}),ensureRich()]);
 const safely=fn=>{try{return fn();}catch{extractionFailures++;return undefined;}};
 function richEvent(e,row,raw){if(!debug||run?.state!=='ACTIVE')return;const sequence=++run.admitted;const event={schemaVersion:2,runId:run.id,sequence,attemptId:e.attemptId,workerEpoch:epoch,timestampUtc:new Date().toISOString(),monotonicMs:clock(),menuGeneration:row?.menuGeneration??null,reasonCode:/^[A-Z][A-Z0-9_]{0,79}$/.test(e.code??'')?e.code:null,stage:STAGES.includes(e.stage)?e.stage:'N/A',outcome:e.outcome??'observed',providerId:row?.providerId??'other',mode:row?.mode??null,context:row?.context??null,proofLevel:row?.proofLevel??null,metrics:Object.fromEntries(METRICS.map(k=>[k,row?.[k]??null])),raw:rawFields(raw),availability:{unsupportedFields:'N/A / not_observed'},privacy:'RAW'};richWriter.push(event);if(run.limit!==null&&sequence>=run.limit){run.state='LIMIT_REACHED';void rich.stop(run.id,run.state,run.admitted,richWriter.inspect().dropped).catch(()=>{});}}
 function observe(event){safely(()=>{
  const id=event.attemptId;if(typeof id!=='string')return;let entry=active.get(id);
  if(event.stage==='CLICK_RECEIVED'){
   if(active.has(id)||completed.has(id))return;
   if(active.size>=maxActive){lost++;return;}
   const row={attemptId:id,schemaVersion:2,menuGeneration:number(event.menuGeneration),clickTimestampUtc:event.timestampUtc??new Date().toISOString(),appId:'click2cloud',appVersion:build.extensionVersion??null,build:build.revision??null,workerEpoch:epoch,providerId:'other',mode:'other',context:'other',state:'pending',proofLevel:'unknown',evidenceClass:'not_observed',outcomeCompleteness:'pending',dataLossFlag:false};
   // Each field is isolated: a throwing extraction cannot reject the whole row.
   for(const [key,fn] of Object.entries({providerId:()=>['cloudflare','google-drive','onedrive','dropbox'].includes(event.providerId)?event.providerId:'other',mode:()=>({nested:'narrow',simple:'simple',narrow:'narrow',depth:'depth'})[event.mode]??'other',context:()=>['image','link','page','audio','video'].includes(event.context)?event.context:'other',pageOrigin:()=>origin(event.pageUrl),sourceOrigin:()=>origin(event.sourceUrl)}))safely(()=>{row[key]=fn();});
   row.websiteHost=row.pageOrigin?new URL(row.pageOrigin).host:null;row.sourceHost=row.sourceOrigin?new URL(row.sourceOrigin).host:null;row.sourceUrlSanitized=row.sourceOrigin;
   entry={row,start:number(event.monotonicMs)??clock(),stages:new Map()};active.set(id,entry);basicWriter.push({...row});
  }
  if(!entry)return;
  const r=entry.row,t=number(event.monotonicMs)??clock();
  if(event.workerEpoch&&event.workerEpoch!==epoch){r.dataLossFlag=true;r.state='uncertain';r.availability=Object.fromEntries(['clickToDispatchMs','clickToVerifiedMs'].map(k=>[k,{reason:'interrupted'}]));entry.crossEpoch=true;}
  if(event.stage==='native.identity'){if(['cloudflare','google-drive','onedrive','dropbox'].includes(event.providerId))r.providerId=event.providerId;const mode=({nested:'narrow',simple:'simple',narrow:'narrow',depth:'depth'})[event.mode];if(mode)r.mode=mode;if(number(event.menuGeneration)!==null)r.menuGeneration=event.menuGeneration;}
  if(event.stage==='dispatch.enter'&&!entry.crossEpoch)r.clickToDispatchMs=Math.max(0,t-entry.start);
  const metric={'capture.acquire':'sourceAcquireMs','transfer.verify':'verificationElapsedMs',...(!event.remoteEnvelope?{'transfer.upload':'uploadElapsedMs'}:{})}[event.stage];
  if(event.outcome==='started')entry.stages.set(event.stage,t);
  if(metric&&event.outcome==='ok'&&entry.stages.has(event.stage)&&!entry.crossEpoch)r[metric]=Math.max(0,t-entry.stages.get(event.stage));
  // A transport envelope is request lifetime (may include polling), NOT upload or RTT.
  if(event.stage==='provider.request'&&number(event.durationMs)!==null)r.providerRequestLatencyMs=event.durationMs;
  if(event.stage==='native.terminal'){
   const out=event.result??{};const verified=event.proof?.independent===true;
   r.state=entry.crossEpoch?'uncertain':verified?'verified':['failed','blocked','cancelled','uncertain'].includes(out.state)?out.state:'uncertain';r.reasonCode=/^[A-Z][A-Z0-9_]{0,79}$/.test(out.code??'')?out.code:null;
   r.proofLevel=verified?'independently_verified':'unknown';r.evidenceClass=verified?(event.proof?.evidenceClass==='fixture-only'?'fixture-only':'authoritative-receipt'):'not_observed';
   r.bytesObserved=number(event.proof?.bytes);r.bytesVerified=verified?r.bytesObserved:null;
   if(verified&&!entry.crossEpoch)r.clickToVerifiedMs=Math.max(0,t-entry.start);
   if(r.sourceAcquireMs>0&&r.bytesObserved!==null)r.sourceReadThroughputBytesPerSecond=r.bytesObserved*1000/r.sourceAcquireMs;
   if(r.uploadElapsedMs>0&&r.bytesObserved!==null)r.uploadThroughputBytesPerSecond=r.bytesObserved*1000/r.uploadElapsedMs;
   if(r.clickToVerifiedMs>0&&r.bytesVerified!==null)r.endToEndEffectiveBytesPerSecond=r.bytesVerified*1000/r.clickToVerifiedMs;
   r.outcomeCompleteness='terminal';r.dataLossFlag||=lost>0;basicWriter.push({...r});active.delete(id);completed.add(id);if(completed.size>4096)completed.delete(completed.values().next().value);
  }
  richEvent(event,r,event.raw);
 });}
 async function start(params){if(!debug)throw Error('DEBUG_REQUIRED');if(starting||run?.state==='ACTIVE')throw Error('RUN_ALREADY_ACTIVE');capacity(params.limit??4000);starting=true;const generation=stopEpoch;try{await ensureRich();run=await rich.start(params);if(!debug||generation!==stopEpoch)await stop();return run;}finally{starting=false;}}
 function stop(){stopEpoch++;if(!run)return Promise.resolve(null);const current=run;current.state=current.state==='LIMIT_REACHED'?'LIMIT_REACHED':'STOPPED';// Synchronous admission fence; no drain required to reach Stop.
  return rich.stop(current.id,current.state,current.admitted,richWriter.inspect().dropped);}
 async function status(){let control=null,recent=[],statistics=null,archive=null,runs=[];try{if(basic){control=await basic.control();recent=basic.recent?await basic.recent():[];statistics=basic.statistics?await basic.statistics():null;}}catch{readyBasic=false;basicFailed=true;}try{if(rich){archive=run?await rich.snapshot(run.id):null;runs=await rich.runs();}}catch{readyRich=false;richFailed=true;}return {schemaVersion:2,debug,basic:{state:readyBasic?'BEST_EFFORT':basicFailed?'UNAVAILABLE':'STARTING',control,recent,statistics,health:basicWriter.inspect(),active:active.size,lostLowerBound:lost,extractionFailures},rich:{state:readyRich?'AVAILABLE':richFailed?'UNAVAILABLE':'STARTING',run:run?{...archive,...run,committed:archive?.committed??null}:null,health:richWriter.inspect(),runs}};}
 async function snapshot(runId){let b;try{b=await basic?.snapshot(basicWriter.inspect());}catch{}if(!b)b={id:crypto.randomUUID(),available:false,count:0,control:{sequence:0,evicted:null},health:basicWriter.inspect(),coverage:'N/A / basic_unavailable'};if(runId&&!rich)throw Error('RICH_UNAVAILABLE');const r=rich?await rich.snapshot(runId):null;return {schemaVersion:2,id:b.id,basic:b,rich:r,richHealth:richWriter.inspect(),coverage:{basic:b.coverage??'committed_only',unreceivedEvents:'UNKNOWN',lastCommitRisk:'UNKNOWN',lostLowerBound:lost,expansive:r?'recorded':'N/A / not_recorded'}};}
 return {observe,ready,status,start,stop,listRuns:after=>rich?rich.runs(after):[],async setDebug(value){if(typeof value!=='boolean')throw Error('BOOLEAN_REQUIRED');debug=value;if(!value)await stop();return status();},async setCapacity(value,confirmed){if(!basic)throw Error('BASIC_UNAVAILABLE');capacity(value);const estimate=await globalThis.navigator?.storage?.estimate?.();if(estimate&&value*1024>(estimate.quota-estimate.usage)*.8)throw Error('REQUESTED_CAPACITY_EXCEEDS_ESTIMATED_QUOTA');return basic.setCapacity(value,confirmed);},snapshot,
  async page(snap,{basicAfter=0,richAfter=0}={}){const rows=basic&&snap.basic.count?await basic.snapshotPage(snap.basic.id,basicAfter):[],segments=snap.rich?await rich.page(snap.rich,richAfter):[];const basicNext=rows.at(-1)?.snapshotPosition??basicAfter,richNext=segments.at(-1)?.end??richAfter;return {basic:rows,segments,basicNext,richNext,basicDone:!rows.length||basicNext>=snap.basic.count,richDone:!segments.length||richNext>=snap.rich.highWater};},async drain(){await ready;return Promise.all([basicWriter.drain(),richWriter.drain()]);},close(){basicWriter.close();richWriter.close();basic?.close();rich?.close();},summary};
}
