import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB,IDBKeyRange} from 'fake-indexeddb';
import {createHistoryStore,VISIBILITY_MS} from '../src/queue/store.mjs';
import {basicReceipt,currentReceipt} from '../src/queue/receipts.mjs';
import {historyCalendar,historyInterval} from '../src/queue/calendar.mjs';
import {writeHistoryExport} from '../src/queue/export.mjs';
import {normalizeNavigation} from '../extension/navigation.mjs';

globalThis.IDBKeyRange=IDBKeyRange;
const open=(clock=Date.now)=>createHistoryStore({indexedDB,database:crypto.randomUUID(),clock});
const base=1_700_000_000_000;
const record=(id,sortAt=base,extra={})=>({
  schemaVersion:1,recordId:id,sortAt,terminalAt:sortAt,updatedAt:sortAt,terminal:true,
  provider:'cloudflare',kind:'save',status:'verified',filename:'Sunset-01.png',...extra
});
const basic=id=>({id,provider:'google',state:'SAVED',confirmed:true,objectId:'readback-object',
  filename:'sample.png',createdAt:new Date(base).toISOString(),updatedAt:new Date(base+3000).toISOString()});

test('navigation repairs Settings and ignores the Downloads entry',()=>{
  assert.deepEqual(normalizeNavigation({settings:'gone',explorer:'gone',queue:'more',downloads:'main'}),{
    settings:'more',explorer:'gone',queue:'more',history:'more',screenshot:'more',remotes:'main'
  });
});

test('canonical receipts distinguish attempts, provider proof, pending, and routine file operations',()=>{
  const [a]=basicReceipt(basic('attempt-A')), [b]=basicReceipt(basic('attempt-B'));
  assert.notEqual(a.recordId,b.recordId);assert.equal(a.providerObjectId,b.providerObjectId);
  assert.equal(a.proofLevel,'provider-confirmed-object');assert.equal(a.terminalAt,base+3000);
  assert.equal(basicReceipt({...basic('a'),confirmed:false})[0].status,'uncertain');
  assert.equal(currentReceipt({kind:'file-action',operationId:'routine',state:'verified'}).length,0);
  assert.equal(currentReceipt({kind:'depth-click',operationId:'wrapper',cause:'actual',state:'verified'}).length,0);
  const [pending]=currentReceipt({kind:'save',operationId:'remote',state:'pending',at:base},{interrupted:true});
  assert.equal(pending.status,'uncertain');assert.equal(pending.terminal,false);assert.equal(pending.rank,1);
});

test('verified screenshot outputs preserve distinct destination IDs and stop the placeholder job', async()=>{
  const id='657a6121-b3bd-4ec8-b6d4-730087924005', start=new Date(base).toISOString(), finished=new Date(base+1000).toISOString();
  const store=open();
  const row=plan=>({kind:'screenshot-to-cloud',operationId:id,state:'pending',at:base,updatedAt:base+1000,
    screenshot:{schemaVersion:2,plan:{operationId:id,startedAt:start,outputs:plan},attempts:[],state:'pending'}});
  await store.reconcile(currentReceipt(row([])));
  assert.equal((await store.jobs()).working,1);
  const outputs=['first','second'].map((bucketName,index)=>({outputId:id+'-'+(index+1),ruleIds:[],
    target:{bucketName,accountId:'test',prefix:'screens/'},key:'screens/capture.png'}));
  const job=row(outputs);
  job.screenshot.finishedAt=finished;
  job.screenshot.outputs=outputs.map(output=>({state:'confirmed',verification:'direct-r2-get-sha256',at:finished,etag:'test'}));
  const normalized=currentReceipt(job);
  await store.reconcile(normalized);
  await store.reconcile(normalized.reverse());
  const {items,total}=await store.page();
  assert.equal(total,2);
  assert.deepEqual(items.map(item=>item.destination.bucket),['second','first']);
  assert.equal((await store.jobs()).total,0);
  await store.close();
});

test('chronology tie order, first/last/direct jumps, search and Hide are independent',async()=>{
  const store=open();
  await store.reconcile(Array.from({length:63},(_,index)=>record(String(index).padStart(2,'0'),
    base+Math.floor(index/3),{filename:index===51?'house.png':'sunset.png'})));
  assert.deepEqual((await store.page({page:1})).items.slice(0,3).map(row=>row.recordId),['62','61','60']);
  assert.equal((await store.page({page:2})).items[0].recordId,'37');
  assert.equal((await store.page({page:999})).items.length,13);
  assert.equal((await store.page({page:999})).items.at(-1).recordId,'00');
  assert.equal((await store.page({query:'house'})).items[0].recordId,'51');
  assert.equal((await store.page({from:base+20})).total,3);
  assert.equal(await store.count(),63);
  await assert.rejects(async()=>store.page({page:0}),/HISTORY_INVALID_PAGE/);
  await store.close();
});

test('History search finds old and reconciled records, with partial text, numbers, paths and safe source metadata',async()=>{
  const store=open();
  await store.reconcile([
    record('old-75',base,{filename:'Screenshot-75.png',kind:'screenshot',destination:{bucket:'Gallery',key:'Travel/ScreenShot-75.png'}}),
    record('failed-76',base+1,{filename:'Screenshot-76.png',kind:'screenshot',status:'failed'}),
    ...basicReceipt({...basic('basic-75'),filename:'Screenshot-75 notes.png',hostUrl:'https://example.com/Archive?token=private',destination:{path:'/Jobs/75'}}),
    ...Array.from({length:60},(_,i)=>record('new-'+i,base+100+i,{filename:'Fresh item '+i+'.png'}))
  ]);
  const ids=async(query,options)=>(await store.page({query,...options})).items.map(row=>row.recordId);
  const screenshots=['basic:google:basic-75','failed-76','old-75'];
  for(const query of ['screen','Screenshot','SCrEeN'])assert.deepEqual(await ids(query),screenshots);
  for(const query of ['screenshot-75','75','SCREEn 75'])assert.deepEqual(await ids(query),[screenshots[0],screenshots[2]]);
  assert.deepEqual(await ids('Cloudflare Travel'),['old-75']);
  assert.deepEqual(await ids('google drive jobs/75'),[screenshots[0]]);
  assert.deepEqual(await ids('EXAMPLE.COM/archive'),[screenshots[0]]);
  assert.deepEqual(await ids('private'),[]);
  assert.deepEqual(await ids('unmatched text'),[]);
  assert.deepEqual(await ids('screen',{from:base+1,end:base+3,kind:'screenshot'}),['failed-76']);
  assert.equal((await store.page({query:'fresh item',page:99})).items.length,10);
  await store.reconcile([record('reconciled',base+4000,{filename:'New Screenshot-75.png'})]);
  assert.deepEqual(await ids('screen'),['reconciled',...screenshots]);
  assert.equal((await store.page({query:''})).total,64);
  await assert.rejects(store.page({query:'screen',signal:AbortSignal.abort()}),{name:'AbortError'});
  await store.close();
});

test('late and replayed receipts cannot regress authoritative evidence or reorder renamed records',async()=>{
  const store=open();
  await store.reconcile([record('x'),record('y',base+1)]);
  await store.reconcile([record('x',base+500,{filename:'Renamed.png'})]);
  await store.reconcile([record('x',base-1,{rank:0,status:'working',terminal:false})]);
  const {items}=await store.page();
  assert.deepEqual(items.map(r=>[r.recordId,r.sortAt,r.filename]),
    [['y',base+1,'Sunset-01.png'],['x',base,'Renamed.png']]);
  assert.equal((await store.jobs()).total,0);
  await store.close();
});

test('cap, Delete and Clear require consent; exact tombstones survive replay and admit newly observed older IDs',async()=>{
  let now=base;
  const store=open(()=>now);
  await store.reconcile([record('a'),record('b',base+1),record('c',base+2)]);
  await assert.rejects(store.setPolicy({cap:2}),/CONFIRMATION_REQUIRED/);
  await store.setPolicy({cap:2},{confirmed:true});
  assert.deepEqual((await store.page()).items.map(row=>row.recordId),['c','b']);
  await store.setPolicy({cap:null,deleteSince:base+2},{confirmed:true});
  await store.reconcile([record('a'),record('d',base+3)]);
  const failed=record('failed',base-1,{status:'failed',rank:1});
  await store.reconcile([failed]);
  now+=VISIBILITY_MS+100;
  await store.maintain();
  assert.deepEqual((await store.page()).items.map(row=>row.recordId),['b','failed']);
  await assert.rejects(async()=>store.clear(),/CONFIRMATION_REQUIRED/);
  assert.equal(await store.clear({confirmed:true}),2);
  await store.setPolicy({cap:null});
  await store.reconcile([record('a'),record('b'),record('c'),record('d'),failed,record('new',base-100)]);
  assert.deepEqual((await store.page()).items.map(row=>row.recordId),['new']);
  assert.equal((await store.jobs()).attention,1);
  await store.acknowledge('failed');await store.reconcile([failed]);
  assert.equal((await store.jobs()).total,0);
  await store.close();
});

test('project 10,000 jobs, bounded pages, no dependence on elapsed History visibility',async()=>{
  const store=open(()=>base+2*VISIBILITY_MS);
  for(let offset=0;offset<10000;offset+=500){
    const batch=Array.from({length:500},(_,index)=>{
      const i=offset+index;
      return record('job-'+i,base+i,{rank:i%3,terminal:false,status:['uploading','needs-login','waiting'][i%3]});
    });
    await store.reconcile(batch);
  }
  const initial=await store.jobs(), deep=await store.jobs({offset:9000});
  assert.deepEqual([initial.working,initial.attention,initial.waiting],[3334,3333,3333]);
  assert(initial.items.every(item=>item.rank===0));assert(deep.items.every(item=>item.rank===2));
  assert.equal(initial.items.length,10);assert.equal(deep.items.length,10);
  assert.equal(await store.count(),0);
  await store.close();
});

test('calendar uses owner timezone, ISO weeks, months and 23-hour DST boundaries',()=>{
  const zone='America/Chicago',now=Date.parse('2026-11-24T15:00:00Z');
  assert.equal(historyCalendar(now,zone,now)[0][1],'Today');
  assert.equal(historyCalendar(Date.parse('2026-11-16T15:00:00Z'),zone,now)[0][1],'Last Week');
  assert.deepEqual(historyCalendar(Date.parse('2025-01-11T15:00:00Z'),zone,now).map(pair=>pair[1]),
    ['2025','January','Week 2','2025-01-11']);
  const interval=historyInterval({range:'custom',timezone:zone,start:'2026-03-08',end:'2026-03-08'});
  assert.equal(interval.end-interval.from,23*3600000);
});

test('ZIP rejects a failed or cancelled sink and range export uses independent expected count',async()=>{
  const store=open();
  await store.reconcile([record('a',base),record('b',base+1,{kind:'screenshot'}),record('c',base+2)]);
  const result=await writeHistoryExport(store,async()=>{},{from:base,end:base+2,includeScreenshots:false});
  assert.equal(result.manifest.expectedRecords,1);assert.equal(result.total,1);
  await assert.rejects(writeHistoryExport(store,async()=>{throw new DOMException('disk','QuotaExceededError');}),{name:'QuotaExceededError'});
  const controller=new AbortController();controller.abort();
  await assert.rejects(writeHistoryExport(store,async()=>{},{signal:controller.signal}),{name:'AbortError'});
  assert.equal(await store.count(),3);
  await store.close();
});
