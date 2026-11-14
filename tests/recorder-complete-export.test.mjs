import test from 'node:test';import assert from 'node:assert/strict';import {createHash,randomBytes} from 'node:crypto';import {mkdir,writeFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';
import {incrementalSHA256,hashBlob} from '../src/recorder/archive-stream.mjs';import {exportComplete} from '../src/recorder/export.mjs';import {sha256} from '../src/recorder/storage.mjs';
const dir='work/recorder-first/node-exports';
test('incremental archive digests match independent Node SHA-256 at block/padding boundaries',async()=>{
 for(const size of [0,1,55,56,63,64,65,127,128,1000,1000000]){const bytes=randomBytes(size),h=incrementalSHA256();for(let at=0;at<size;at+=31)h.update(bytes.subarray(at,at+31));assert.equal(h.digest(),createHash('sha256').update(bytes).digest('hex'));assert.equal(await hashBlob(new Blob([bytes])),createHash('sha256').update(bytes).digest('hex'));}
});
export async function exportFixture(count,{gap=0,basicCount=Math.ceil(count/5),evicted=0}={}){
 const id=crypto.randomUUID(),attempt=crypto.randomUUID(),epoch=crypto.randomUUID(),metadata=[];let head=null;
 const events=(start,end)=>Array.from({length:end-start+1},(_,i)=>({runId:id,sequence:start+i,attemptId:attempt,workerEpoch:epoch,stage:'intent',timestampUtc:'2026-11-14T00:00:00.000Z',providerId:'cloudflare',mode:'simple',raw:{sourceUrl:'https://synthetic.invalid/PRIVATE_EXPORT_SENTINEL?signature=PRIVATE_EXPORT_SENTINEL'}}));
 for(let start=1+gap;start<=count+gap;start+=128){const end=Math.min(count+gap,start+127),jsonl=events(start,end).map(JSON.stringify).join('\n')+'\n',hash=await sha256(head+'\n'+jsonl);metadata.push({start,end,hash,priorHash:head});head=hash;}
 const snapshot={id:crypto.randomUUID(),basic:{id:crypto.randomUUID(),available:true,count:basicCount,control:{sequence:basicCount+evicted,evicted,gaps:0},health:{}},rich:{id,committed:count,highWater:count+gap,head,gaps:gap?[{start:1,end:gap,reason:'queue_overload'}]:[],pending:[],unknownEpochs:0},richHealth:{},coverage:{unreceivedEvents:'UNKNOWN'}};
 let calls=0;
 const getPage=async({basicAfter=0,richAfter=0})=>{
  calls++;const size=Math.min(128,basicCount-basicAfter),basic=Array.from({length:size},(_,i)=>({attemptId:crypto.randomUUID(),state:'blocked',sequence:evicted+basicAfter+i+1,snapshotPosition:basicAfter+i+1,providerId:'cloudflare',mode:'simple'}));
  const meta=metadata.find(s=>s.start>richAfter),segments=meta?[{...meta,jsonl:events(meta.start,meta.end).map(JSON.stringify).join('\n')+'\n'}]:[];
  return {basic,segments,basicNext:basicAfter+size,richNext:meta?.end??richAfter,basicDone:basicAfter+size>=basicCount,richDone:!meta||meta.end>=count+gap};
 };
 return {snapshot,getPage,calls:()=>calls};
}
for(const count of [0,102,10000])for(const privacy of ['RAW','SECURE'])test(`complete ${privacy} ZIP contains ${count}/${count} events across automatic pages`,async()=>{
 const f=await exportFixture(count);const progress=[];const result=await exportComplete({...f,privacy,consent:true,onProgress:p=>progress.push(p)});
 assert.equal(result.status,'COMPLETE');assert.equal(result.counts.richExported,count);assert.equal(result.counts.basicExported,Math.ceil(count/5));if(count>128)assert(f.calls()>1);assert(result.manifest.processing.maxPageEvents<=128);
 await mkdir(dir,{recursive:true});await writeFile(`${dir}/${privacy}-${count}.zip`,new Uint8Array(await result.blob.arrayBuffer()));
 const verified=JSON.parse(execFileSync('python',['scripts/verify-recorder-zip.py',`${dir}/${privacy}-${count}.zip`,String(count),privacy],{encoding:'utf8'}));assert.equal(verified.hash,result.hash);assert.equal(verified.rich,count);
});
test('sparse rich sequence and rolling Basic evictions retain counts and explicit PARTIAL coverage',async()=>{const f=await exportFixture(300,{gap:7,basicCount:260,evicted:6000}),r=await exportComplete({...f,privacy:'SECURE'});assert.equal(r.status,'PARTIAL');assert.equal(r.counts.basicExported,260);assert.equal(r.counts.richExported,300);assert.deepEqual(r.manifest.missingRanges,[{start:1,end:7,reason:'missing_or_dropped'}]);assert(r.manifest.issues.some(x=>x.reason==='basic_evicted'));});
test('corrupt segment, stalled page, interrupted read and cancellation never produce complete archive',async()=>{
 for(const kind of ['corrupt','stalled','interrupted','cancel']){const f=await exportFixture(102),controller=new AbortController();const getPage=async params=>{if(kind==='interrupted')throw Error('WORKER_RESTARTED');const page=await f.getPage(params);if(kind==='corrupt')page.segments[0].hash='invalid';if(kind==='stalled')page.basicNext=0;if(kind==='cancel')controller.abort();return page;};await assert.rejects(exportComplete({snapshot:f.snapshot,getPage,privacy:'RAW',consent:true,signal:controller.signal}));}
});
test('missing segment tail, unavailable Basic and unconfirmed ranges are PARTIAL with named gaps',async()=>{const f=await exportFixture(300);f.snapshot.basic.available=false;f.snapshot.rich.pending=[{start:301,end:305}];const r=await exportComplete({snapshot:f.snapshot,privacy:'SECURE',getPage:async p=>{const page=await f.getPage(p);if(p.richAfter>=128){page.segments=[];page.richNext=p.richAfter;page.richDone=true;}return page;}});assert.equal(r.status,'PARTIAL');assert.deepEqual(r.manifest.missingRanges,[{start:129,end:300,reason:'missing_tail'}]);for(const reason of ['basic_unavailable','rich_count_mismatch','unconfirmed'])assert(r.manifest.issues.some(x=>x.reason===reason));});
test('RAW export requires consent before reading any page',async()=>{const f=await exportFixture(102);await assert.rejects(exportComplete({...f,privacy:'RAW'}),{message:'RAW_EXPORT_CONSENT_REQUIRED'});assert.equal(f.calls(),0);});
test('SECURE host-projected segments retain the initial null hash-chain predecessor',async()=>{const {secureEvent}=await import('../src/recorder/schema.mjs');const f=await exportFixture(300);const r=await exportComplete({snapshot:f.snapshot,privacy:'SECURE',getPage:async p=>{const page=await f.getPage(p);return {...page,segments:page.segments.map(s=>({start:s.start,end:s.end,sourceHash:s.hash,priorSourceHash:s.priorHash,events:s.jsonl.trim().split('\n').map(line=>secureEvent(JSON.parse(line)))}))};}});assert.equal(r.status,'COMPLETE');assert.equal(r.counts.richExported,300);});
test('encoded archive budget fails explicitly before a truncated ZIP can be returned',async()=>{const {archiveEntries}=await import('../src/recorder/archive-stream.mjs');const entries=archiveEntries(4);assert.throws(()=>entries.write('synthetic.jsonl','12345'),/EXPORT_SIZE_LIMIT/);assert.equal(entries.bytes,0);});
