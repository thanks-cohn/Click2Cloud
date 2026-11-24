import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as tick} from 'node:timers/promises';
import {countVerifiedSaves,createDailyBadge} from '../src/chrome/daily-badge.mjs';
import {createCurrentStore} from '../src/persistence/current-store.mjs';
import 'fake-indexeddb/auto';

const now=Date.parse('2026-11-02T05:59:59Z'), timezone='America/Chicago';
const verified=(operationId,at=now)=>({
 operationId,kind:'save',state:'verified',proofKind:'independent-head-version-size',receipt:{key:'saved.txt'},
 at,updatedAt:at
});
const screenshot=(operationId,state,outputs)=>({
 operationId,kind:'screenshot-to-cloud',state,updatedAt:now,
 screenshot:{plan:{operationId,outputs:[{outputId:'first'},{outputId:'second'}]},outputs}
});
const one={outputId:'first',state:'confirmed',verification:'direct-r2-get-sha256'};
const two={...one,outputId:'second'};
test('badge counts a screenshot once per capture with a matching independent output receipt',()=>{
 const rows=[
  screenshot('partial','partial',[one,{state:'failed'}]),
  screenshot('partial','confirmed',[one,two]),
  screenshot('full','confirmed',[one,two]),
  screenshot('pending','pending',[one]),
  screenshot('blocked','blocked',[{state:'blocked',code:'AUTH_REQUIRED'}]),
  screenshot('unknown','unknown',[{state:'unknown'}]),
  screenshot('unverified','partial',[{state:'confirmed'}]),
  screenshot('mismatched','partial',[two]),
  verified('save'),verified('save'),{...verified('local-pending'),state:'pending'},
  {...verified('yesterday'),badgeVerifiedAt:now-26*3600000}
 ];
 assert.equal(countVerifiedSaves(rows,now,timezone),3);
 assert.equal(countVerifiedSaves(rows,now+1000,timezone),0);
});

function badgeFixture(){
 let nowTime=now,alarmListener,alarm,scanCount=0,basicReads=0,error,iconError;
 let iconGreen=false,badgeGreen=false;
 const stored=new Map(),states=[],texts=[],waits=[];
 const basic={count:0,complete:true};
 function readLights(){
  assert(!(iconGreen&&badgeGreen),'the background and badge must never be green together');
  states.push(iconGreen?'icon':badgeGreen?'badge':'idle');
 }
 const chrome={
  action:{setBadgeText:async({text})=>texts.push(text),
   setIcon:async({path})=>{if(iconError&&path[16].includes('success'))throw iconError;iconGreen=path[16].includes('success');readLights();},
   setBadgeBackgroundColor:async({color})=>{badgeGreen=color==='#087a35';readLights();}},
  alarms:{onAlarm:{addListener:fn=>{alarmListener=fn;}},create:async(name,value)=>{alarm={name,...value};}}
 };
 const make=options=>createDailyBadge({chrome,clock:()=>nowTime,readPreferences:async()=>{
  if(error)throw error;
  return {timezone};
 },countHistory:async match=>{scanCount++;await tick();for(const row of stored.values())match(row);},
 countBasic:async()=>{basicReads++;if(basic.error)throw basic.error;return {...basic};},
 wait:(duration,signal)=>new Promise(resolve=>{
  waits.push({duration,resolve});
  signal.addEventListener('abort',resolve,{once:true});
 }),...options});
 return {make,states,texts,waits,basic,basicReads:()=>basicReads,scans:()=>scanCount,store:row=>stored.set(row.operationId,row),
  fail:()=>{error=Error('unavailable');},failIcon:()=>{iconError=Error('unavailable');},
  restore:()=>{error=undefined;},rollover:()=>{nowTime=alarm.when;alarmListener(alarm);}};
}

test('Concurrent receipts coalesce overflow but count without rescanning each write',async()=>{
 const f=badgeFixture(),badge=f.make();
 await badge.refresh();
 const feed=row=>{f.store(row);return badge.recordVerified(row);};
 await Promise.all(Array.from({length:100},(_,i)=>feed(verified('save-'+i))));
 await tick();
 assert.equal(f.texts.at(-1),'100');
 assert.equal(f.scans(),1);
 assert.deepEqual(f.waits.map(w=>w.duration),[180]);
 const partial=screenshot('capture','partial',[one]);
 await feed(partial);
 await feed({...partial,screenshot:{...partial.screenshot,outputs:[one,two]}});
 assert.equal(f.texts.at(-1),'101');
 for(let i=0;i<f.waits.length;i++){f.waits[i].resolve();await tick();assert(i<15);}
 const durations=[180,100,180,100,180];
 assert.deepEqual(f.waits.map(w=>w.duration),[...durations,...durations,...durations]);
 for(let i=0;i<3;i++) assert.deepEqual(f.states.slice(2+i*6,8+i*6),['icon','idle','badge','idle','icon','idle']);
 assert.equal(f.scans(),1);

 const workerWake=f.make();
 await workerWake.refresh();
 assert.equal(f.texts.at(-1),'101');
 assert.equal(f.states.at(-1),'idle');
 assert.equal(f.waits.length,15);
 f.rollover();
 await workerWake.refresh();
 assert.equal(f.texts.at(-1),'0');
 assert.equal(f.scans(),3);
});

test('badge failures abort a live flash and restore normal before a retry',async()=>{
 const f=badgeFixture(),badge=f.make();
 await badge.refresh();
 const row=verified('normal-success');
 f.store(row);
 await badge.recordVerified(row);
 await tick();
 assert.equal(f.states.at(-1),'icon');
 f.fail();
 await badge.refresh();
 await tick();
 assert.equal(f.texts.at(-1),'!');
 assert.equal(f.states.at(-1),'idle');
 assert.deepEqual(f.waits.map(w=>w.duration),[180]);
 f.restore();
 await badge.refresh();
 assert.equal(f.texts.at(-1),'1');
 assert.equal(f.states.at(-1),'idle');
});

test('Turning off transmission stops active pulses and keeps the verified count',async()=>{
 const f=badgeFixture();let enabled=true;
 const badge=f.make({transmissionEnabled:()=>enabled});
 await badge.refresh();
 const first=verified('before-opt-out'),later=verified('after-opt-out');
 f.store(first);await badge.recordVerified(first);await tick();
 assert.equal(f.states.at(-1),'icon');
 enabled=false;badge.cancelTransmission();
 f.store(later);await badge.recordVerified(later);await tick();
 assert.equal(f.texts.at(-1),'2');
 assert.equal(f.states.at(-1),'idle');
 assert.equal(f.waits.length,1);
});

test('Basic receipt projection joins legacy host receipts and reads again only on a new commit',async()=>{
 const f=badgeFixture(),badge=f.make();
 f.basic.count=2;f.store(verified('r2-before-upgrade'));
 await badge.refresh();await badge.refresh();
 assert.equal(f.texts.at(-1),'3');
 assert.equal(f.basicReads(),1);
 assert.equal(f.waits.length,0);
 f.basic.count++;
 await badge.recordBasicVerified(now);
 assert.equal(f.texts.at(-1),'4');
 assert.equal(f.basicReads(),2);
 assert.equal(f.states.at(-1),'icon');
 const newWorker=f.make();
 await newWorker.refresh();
 assert.equal(f.texts.at(-1),'4');
 assert.equal(f.states.at(-1),'idle');
 assert.equal(f.waits.length,1);
});

test('Incomplete Basic migration shows a verified lower bound and icon API failures restore idle',async()=>{
 const f=badgeFixture(),badge=f.make();
 f.basic.count=2;f.basic.complete=false;f.store(verified('r2-before-upgrade'));
 await badge.refresh();
 assert.equal(f.texts.at(-1),'3+');
 assert.equal(f.waits.length,0);
 f.basic.complete=true;f.basic.count=6;
 await badge.refresh();
 assert.equal(f.texts.at(-1),'7');
 f.basic.error=Error('unavailable');f.failIcon();
 await badge.recordBasicVerified(now);
 await tick();
 assert.equal(f.texts.at(-1),'7+');
 assert.equal(f.states.at(-1),'idle');
 assert.equal(f.waits.length,0);
});

test('A replay of a legacy host receipt preserves its verified day and never signals success again',async()=>{
 const dbName=crypto.randomUUID();
 const current=createCurrentStore({dbName,clock:()=>now+1000});
 await current.readRemoteResults();
 const db=await new Promise((resolve,reject)=>{
  const open=indexedDB.open(dbName);open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);
 });
 try{
  const receipt=verified('legacy-r2');
  await new Promise((resolve,reject)=>{
   const tx=db.transaction('state','readwrite');
   tx.objectStore('state').put({id:'remoteResults',value:[receipt]});
   tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);
  });
  assert.equal((await current.recordRemoteResult({...receipt,state:'pending'})).state,'verified');
  let flashes=0;
  const stored=await current.recordRemoteResult(receipt,{onVerified:()=>flashes++});
  assert.equal(flashes,0);
  assert.equal(stored.badgeVerifiedAt,now);
  assert.equal(await current.countRemoteResults(row=>row.badgeVerifiedAt===now),1);
 }finally{db.close();await current.close();}
});
