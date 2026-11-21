import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as tick} from 'node:timers/promises';
import {countVerifiedSaves,createDailyBadge} from '../src/chrome/daily-badge.mjs';

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
 let nowTime=now,alarmListener,alarm,scanCount=0,error;
 const stored=new Map(),colors=[],texts=[],waits=[];
 const chrome={
  action:{setBadgeText:async({text})=>texts.push(text),setBadgeBackgroundColor:async({color})=>colors.push(color)},
  alarms:{onAlarm:{addListener:fn=>{alarmListener=fn;}},create:async(name,value)=>{alarm={name,...value};}}
 };
 const make=()=>createDailyBadge({chrome,clock:()=>nowTime,readPreferences:async()=>{
  if(error)throw error;
  return {timezone};
 },countHistory:async match=>{scanCount++;await tick();for(const row of stored.values())match(row);},
 wait:(duration,signal)=>new Promise(resolve=>{
  waits.push({duration,resolve});
  signal.addEventListener('abort',resolve,{once:true});
 })});
 return {make,colors,texts,waits,scans:()=>scanCount,store:row=>stored.set(row.operationId,row),fail:()=>{error=Error('unavailable');},
  restore:()=>{error=undefined;},rollover:()=>{nowTime=alarm.when;alarmListener(alarm);}};
}

test('Concurrent receipts coalesce the two pulses and count without rescanning each write',async()=>{
 const f=badgeFixture(),badge=f.make();
 await badge.refresh();
 const feed=row=>{f.store(row);return badge.recordVerified(row);};
 await Promise.all(Array.from({length:100},(_,i)=>feed(verified('save-'+i))));
 await tick();
 assert.equal(f.texts.at(-1),'100');
 assert.equal(f.scans(),1);
 assert.deepEqual(f.waits.map(w=>w.duration),[100]);
 const partial=screenshot('capture','partial',[one]);
 await feed(partial);
 await feed({...partial,screenshot:{...partial.screenshot,outputs:[one,two]}});
 assert.equal(f.texts.at(-1),'101');
 for(let i=0;i<3;i++){f.waits[i].resolve();await tick();}
 assert.deepEqual(f.waits.map(w=>w.duration),[100,85,100]);
 assert.deepEqual(f.colors.slice(-4),['#087a35','#253b70','#087a35','#253b70']);
 assert.equal(f.scans(),1);

 const workerWake=f.make();
 await workerWake.refresh();
 assert.equal(f.texts.at(-1),'101');
 assert.equal(f.colors.at(-1),'#253b70');
 assert.equal(f.waits.length,3);
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
 assert.equal(f.colors.at(-1),'#087a35');
 f.fail();
 await badge.refresh();
 await tick();
 assert.equal(f.texts.at(-1),'!');
 assert.equal(f.colors.at(-1),'#253b70');
 assert.deepEqual(f.waits.map(w=>w.duration),[100]);
 f.restore();
 await badge.refresh();
 assert.equal(f.texts.at(-1),'1');
 assert.equal(f.colors.at(-1),'#253b70');
});
