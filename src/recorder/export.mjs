import {FIELDS,materialize,secureBasic,secureEvent,summary,PROVIDERS,METRICS,STATES,number,RAW_FIELDS} from './schema.mjs';
import {sha256} from './storage.mjs';
const encode=s=>new TextEncoder().encode(s);
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let n=0xffffffff;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
function header(length,fields){const b=new Uint8Array(length),v=new DataView(b.buffer);for(const [offset,size,value] of fields)v[size===2?'setUint16':'setUint32'](offset,value,true);return b;}
// Small uncompressed ZIP parts. Caller reads at most one indexed page per part;
// no whole-archive array, sync compression, provider IO, or implicit truncation.
export function zipPart(files){let offset=0;const body=[],directory=[];for(const [name,text] of Object.entries(files)){if(!/^[a-zA-Z0-9_.-]+$/.test(name))throw Error('UNSAFE_ZIP_NAME');const n=encode(name),data=encode(text),crc=crc32(data);const h=header(30,[[0,4,0x04034b50],[4,2,20],[14,4,crc],[18,4,data.length],[22,4,data.length],[26,2,n.length]]);body.push(h,n,data);directory.push(header(46,[[0,4,0x02014b50],[4,2,20],[6,2,20],[16,4,crc],[20,4,data.length],[24,4,data.length],[28,2,n.length],[42,4,offset]]),n);offset+=h.length+n.length+data.length;}const size=directory.reduce((a,b)=>a+b.length,0);return new Blob([...body,...directory,header(22,[[0,4,0x06054b50],[8,2,Object.keys(files).length],[10,2,Object.keys(files).length],[12,4,size],[16,4,offset]])],{type:'application/zip'});}
function safeStatistics(input){if(!input)return {scope:'N/A',availability:'not_observed'};const fraction=x=>({numerator:number(x?.numerator),denominator:number(x?.denominator),percent:number(x?.percent)??'N/A'});const metrics=Object.fromEntries(METRICS.map(k=>[k,Object.fromEntries(['samples','mean','p50','p95','p99'].map(p=>[p,number(input.metrics?.[k]?.[p])??'N/A']))]));const groups={};for(const [key,v] of Object.entries(input.groups??{})){const [provider,mode,proof]=key.split('/');if(PROVIDERS.includes(provider)&&['simple','narrow','depth','other'].includes(mode)&&['authoritative-receipt','fixture-only','not_observed'].includes(proof))groups[key]={eligible:number(v.eligible),verified:number(v.verified)};}return {scope:'all_retained_committed_attempts',eligible:number(input.eligible),counts:Object.fromEntries(STATES.map(k=>[k,number(input.counts?.[k])])),metrics,groups,verified:fraction(input.verified),resolvedOnly:fraction(input.resolvedOnly)};}
function safeHealth(h){return Object.fromEntries(['admitted','committed','dropped','failures','batches','peakQueue','writeMs','bytesCommitted','pending','queueBytes','retryAfterMs','writeBytesPerSecond'].map(k=>[k,number(h?.[k])??'N/A']));}
export async function exportPart({snapshot,page,privacy,part=1,previousPartHash=null,richBefore=0,consent=false}){
 if(!['RAW','SECURE'].includes(privacy))throw Error('PRIVACY_REQUIRED');if(privacy==='RAW'&&!consent)throw Error('RAW_EXPORT_CONSENT_REQUIRED');
 const basic=page.basic.map(r=>privacy==='SECURE'?secureBasic(r):materialize(r));const events=[];const segments=[];
 for(const segment of page.segments){let source=segment.events;if(!source){if(await sha256(segment.priorHash+'\n'+segment.jsonl)!==segment.hash)throw Error('SEGMENT_HASH_MISMATCH');source=segment.jsonl.trim().split('\n').map(s=>JSON.parse(s));}const projected=privacy==='SECURE'?source.map(secureEvent):source;events.push(...projected);segments.push({start:segment.start,end:segment.end,exportedHash:await sha256(projected.map(e=>JSON.stringify(e)).join('\n')+'\n')});}
 const csv=v=>'"'+String(v===null?'N/A':typeof v==='object'?JSON.stringify(v):v).replaceAll('"','""')+'"';
 const files={'README.md':`Click2Cloud diagnostics v2 · ${privacy}\nCommitted snapshot only. Multipart export: use every numbered part in order. Earlier/later unconfirmed observations are excluded. N/A means unavailable, not zero. No cloud probes or retries. A generated download is not proof of a physical disk write. ReDown import and Windows/live acceptance are separate.\n`, 'basic-attempts.jsonl':basic.map(r=>JSON.stringify({...r,privacy})).join('\n')+'\n','basic-attempts.csv':FIELDS.join(',')+'\n'+basic.map(r=>FIELDS.map(k=>csv(r[k])).join(',')).join('\n')+'\n','full-events.jsonl':events.map(e=>JSON.stringify({...e,privacy,rawAvailability:privacy==='SECURE'?Object.fromEntries(RAW_FIELDS.map(k=>[k,{value:'N/A',reason:'redacted'}])):Object.fromEntries(RAW_FIELDS.filter(k=>e.raw?.[k]==null).map(k=>[k,{value:'N/A',reason:'not_observed'}]))})).join('\n')+'\n','performance-summary.json':JSON.stringify({privacy,scope:'full_committed_basic_snapshot',...safeStatistics(snapshot.basic.statistics),partSummary:summary(basic)},null,2),'recorder-health.json':JSON.stringify({privacy,basic:safeHealth(snapshot.basic.health),rich:safeHealth(snapshot.richHealth)}),'coverage.json':JSON.stringify({privacy,...snapshot.coverage,unknownEpochs:snapshot.rich?.unknownEpochs??0,gaps:(snapshot.rich?.gaps??[]).map(g=>({start:number(g.start),end:number(g.end),reason:['interrupted_unconfirmed','queue_overload'].includes(g.reason)?g.reason:'unavailable'})),unconfirmed:(snapshot.rich?.pending??[]).map(g=>({start:number(g.start),end:number(g.end)})),richFields:snapshot.rich?'observed_only':'N/A / not_recorded'})};
 const hashes={};for(const [key,value] of Object.entries(files))hashes[key]=await sha256(value);
 const missingRanges=[];let expected=richBefore+1;for(const segment of page.segments){if(segment.start>expected)missingRanges.push({start:expected,end:segment.start-1,reason:"missing_or_dropped"});expected=segment.end+1;}
 const basicAfter=page.basic.at(-1)?.sequence??0,richAfter=page.segments.at(-1)?.end??0;
 files['MANIFEST.json']=JSON.stringify({schemaVersion:2,privacy,snapshotId:snapshot.id,runId:snapshot.rich?.id??null,part,previousPartHash,basicHighWater:snapshot.basic.control.sequence,basicRetained:snapshot.basic.count,richHighWater:snapshot.rich?.highWater??null,richCommitted:snapshot.rich?.committed??null,missingRanges,basicAfter,richAfter,earliest:/^\d{4}-\d\d-\d\dT/.test(snapshot.basic.earliest??'')?snapshot.basic.earliest:'N/A',latest:/^\d{4}-\d\d-\d\dT/.test(snapshot.basic.latest??'')?snapshot.basic.latest:'N/A',evicted:snapshot.basic.control.evicted,segments,files:hashes,evidenceClass:'locally_recorded_committed_metadata_not_live_certification'},null,2);
 const blob=zipPart(files);return {blob,hash:await sha256(await blob.arrayBuffer()),basicAfter,richAfter,files};
}

// One fixed snapshot -> one complete ZIP. Internal pages are never UI parts.
// Native Blob chunks are capped at 256 MiB; JS retains only one decoded page.
// Oversize, corruption, interruption and cancellation never masquerade as complete.
export async function exportComplete({snapshot,getPage,privacy,consent=false,signal,onProgress=()=>{}}){
 if(!['RAW','SECURE'].includes(privacy))throw Error('PRIVACY_REQUIRED');if(privacy==='RAW'&&!consent)throw Error('RAW_EXPORT_CONSENT_REQUIRED');
 const {archiveEntries,hashBlob}=await import('./archive-stream.mjs');
 const archive=archiveEntries(),csv=v=>'"'+String(v==null?'N/A':typeof v==='object'?JSON.stringify(v):v).replaceAll('"','""')+'"';
 let basicAfter=0,richAfter=0,basicCount=0,richCount=0,pages=0,basicDone=snapshot.basic.count===0,richDone=!snapshot.rich||snapshot.rich.highWater===0,priorHash=null,maxPageEvents=0,lastBasicSequence=0;
 const missingRanges=[],segments=[];
 const progress=phase=>onProgress({phase,pages,basicCount,richCount,bytes:archive.bytes,basicExpected:snapshot.basic.count,richExpected:snapshot.rich?.committed??0});
 archive.write('basic-attempts.jsonl','');archive.write('basic-attempts.csv',FIELDS.concat(['sequence','snapshotPosition']).join(',')+'\n');archive.write('full-events.jsonl','');
 const readPage=async params=>{
  signal?.throwIfAborted();let timer,abort;
  try{return await Promise.race([getPage(params),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('EXPORT_READ_INTERRUPTED')),30000);abort=()=>reject(signal.reason??new DOMException('Canceled','AbortError'));signal?.addEventListener('abort',abort,{once:true});})]);}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 };
 while(!basicDone||!richDone){
  signal?.throwIfAborted();if(++pages>100000)throw Error('EXPORT_PAGE_LIMIT');
  const page=await readPage({basicAfter,richAfter,privacy,consent});
  if(!Array.isArray(page.basic)||!Array.isArray(page.segments))throw Error('EXPORT_PAGE_INVALID');
  if(basicDone&&page.basic.length||richDone&&page.segments.length)throw Error('EXPORT_PAST_SNAPSHOT');
  const basic=page.basic.map(r=>({...privacy==='SECURE'?secureBasic(r):materialize(r),sequence:number(r.sequence),snapshotPosition:number(r.snapshotPosition)}));
  for(let i=0;i<basic.length;i++){
   const position=page.basic[i].snapshotPosition??basicAfter+i+1;
   if(position!==basicCount+1||!Number.isSafeInteger(basic[i].sequence)||basic[i].sequence>snapshot.basic.control.sequence||basic[i].sequence<=lastBasicSequence)throw Error('BASIC_SNAPSHOT_SEQUENCE_INVALID');
   basic[i].snapshotPosition=position;lastBasicSequence=basic[i].sequence;basicCount++;
  }
  if(basic.length){archive.write('basic-attempts.jsonl',basic.map(r=>JSON.stringify({...r,privacy})).join('\n')+'\n');archive.write('basic-attempts.csv',basic.map(r=>FIELDS.concat(['sequence','snapshotPosition']).map(k=>csv(r[k])).join(',')).join('\n')+'\n');}
  const nextBasic=page.basicNext??basic.at(-1)?.snapshotPosition??basicAfter;
  if(page.basic.length&&nextBasic<=basicAfter)throw Error('BASIC_CURSOR_STALLED');basicAfter=nextBasic;
  basicDone=page.basicDone??(basicCount>=snapshot.basic.count||page.basic.length===0);
  for(const segment of page.segments){
   if(!Number.isSafeInteger(segment.start)||!Number.isSafeInteger(segment.end)||segment.start<=richAfter||segment.end<segment.start||segment.end>snapshot.rich.highWater)throw Error('RICH_SNAPSHOT_SEQUENCE_INVALID');
   const sourceHash=segment.sourceHash??segment.hash,previous=Object.hasOwn(segment,'priorSourceHash')?segment.priorSourceHash:segment.priorHash;
   if(previous!==priorHash)throw Error('SEGMENT_CHAIN_MISMATCH');
   if(segment.jsonl?.length>16*1024*1024)throw Error('EXPORT_SEGMENT_SIZE_LIMIT');
   if(segment.jsonl!==undefined&&await sha256(segment.priorHash+'\n'+segment.jsonl)!==segment.hash)throw Error('SEGMENT_HASH_MISMATCH');
   const events=segment.events??(segment.jsonl.trim()?segment.jsonl.trim().split('\n').map(JSON.parse):[]);
   if(events.length!==segment.end-segment.start+1)throw Error('SEGMENT_COUNT_MISMATCH');
   for(let i=0;i<events.length;i++)if(events[i].sequence!==segment.start+i||events[i].runId!==snapshot.rich.id)throw Error('SEGMENT_EVENT_SEQUENCE_INVALID');
   if(segment.start>richAfter+1)missingRanges.push({start:richAfter+1,end:segment.start-1,reason:'missing_or_dropped'});
   const projected=events.map(e=>privacy==='SECURE'?secureEvent(e):e);
   archive.write('full-events.jsonl',projected.map(e=>JSON.stringify({...e,privacy,rawAvailability:privacy==='SECURE'?Object.fromEntries(RAW_FIELDS.map(k=>[k,{value:'N/A',reason:'redacted'}])):Object.fromEntries(RAW_FIELDS.filter(k=>e.raw?.[k]==null).map(k=>[k,{value:'N/A',reason:'not_observed'}]))})).join('\n')+'\n');
   segments.push({start:segment.start,end:segment.end,sourceHash});priorHash=sourceHash;richAfter=segment.end;richCount+=events.length;maxPageEvents=Math.max(maxPageEvents,events.length);
  }
  if(page.richNext!==undefined&&page.richNext!==richAfter)throw Error('RICH_CURSOR_INVALID');
  richDone=page.richDone??(!snapshot.rich||richAfter>=snapshot.rich.highWater||page.segments.length===0);
  if(!basicDone&&!page.basic.length||!richDone&&!page.segments.length)throw Error('EXPORT_CURSOR_STALLED');
  progress('reading');await new Promise(ok=>setTimeout(ok,0));
 }
 signal?.throwIfAborted();
 if(snapshot.rich&&richAfter<snapshot.rich.highWater)missingRanges.push({start:richAfter+1,end:snapshot.rich.highWater,reason:'missing_tail'});
 if(snapshot.rich&&richCount===snapshot.rich.committed&&priorHash!==snapshot.rich.head)throw Error('ARCHIVE_HEAD_MISMATCH');
 const issues=[];
 if(basicCount!==snapshot.basic.count)issues.push({reason:'basic_count_mismatch',expected:snapshot.basic.count,exported:basicCount});
 if(snapshot.basic.available===false)issues.push({reason:'basic_unavailable'});
 if(snapshot.rich&&richCount!==snapshot.rich.committed)issues.push({reason:'rich_count_mismatch',expected:snapshot.rich.committed,exported:richCount});
 if(missingRanges.length)issues.push({reason:'rich_missing_ranges',ranges:missingRanges});
 if(snapshot.basic.control.evicted)issues.push({reason:'basic_evicted',count:snapshot.basic.control.evicted});
 if(snapshot.basic.control.gaps)issues.push({reason:'basic_gaps',count:snapshot.basic.control.gaps});
 if(snapshot.rich?.gaps?.length)issues.push({reason:'declared_rich_gaps',ranges:snapshot.rich.gaps.map(g=>({start:number(g.start),end:number(g.end),reason:['interrupted_unconfirmed','queue_overload'].includes(g.reason)?g.reason:'unavailable'}))});
 if(snapshot.rich?.pending?.length)issues.push({reason:'unconfirmed',ranges:snapshot.rich.pending.map(g=>({start:number(g.start),end:number(g.end)}))});
 if(snapshot.rich?.unknownEpochs)issues.push({reason:'unknown_epochs',count:snapshot.rich.unknownEpochs});
 const status=issues.length?'PARTIAL':'COMPLETE',counts={basicExpected:snapshot.basic.count,basicExported:basicCount,richExpected:snapshot.rich?.committed??0,richExported:richCount};
 archive.write('README.md',`Click2Cloud diagnostics v2 · ${privacy}\n${status}: fixed committed snapshot, every internal page read automatically. Unreceived/last-commit risk remains UNKNOWN. N/A is unavailable, never zero. Archive integrity/coverage is not installed Chrome or live-provider certification. Download request is not proof of a physical disk write.\n`);
 archive.write('performance-summary.json',JSON.stringify({privacy,scope:'full_committed_basic_snapshot',...safeStatistics(snapshot.basic.statistics)}));
 archive.write('recorder-health.json',JSON.stringify({privacy,basic:safeHealth(snapshot.basic.health),rich:safeHealth(snapshot.richHealth)}));
 archive.write('coverage.json',JSON.stringify({privacy,...snapshot.coverage,status,...counts,issues,missingRanges,evicted:snapshot.basic.control.evicted??null,basicHighWater:snapshot.basic.control.sequence,richHighWater:snapshot.rich?.highWater??null,unknownEpochs:snapshot.rich?.unknownEpochs??0,unreceivedEvents:'UNKNOWN',lastCommitRisk:'UNKNOWN'}));
 const manifest={schemaVersion:2,privacy,snapshotId:snapshot.id,runId:snapshot.rich?.id??null,status,completeSnapshot:basicCount===snapshot.basic.count&&richCount===(snapshot.rich?.committed??0)&&!missingRanges.length,counts,basicHighWater:snapshot.basic.control.sequence,basicRetained:snapshot.basic.count,richHighWater:snapshot.rich?.highWater??null,richCommitted:snapshot.rich?.committed??null,missingRanges,issues,segments,files:archive.hashes(),processing:{pages,maxPageEvents,limitBytes:256*1024*1024},evidenceClass:'locally_recorded_committed_metadata_not_live_certification'};
 archive.write('MANIFEST.json',JSON.stringify(manifest));progress('verifying');
 const {blob}=archive.finish(),hash=await hashBlob(blob,signal);signal?.throwIfAborted();progress('ready');return {blob,hash,status,manifest,counts};
}
