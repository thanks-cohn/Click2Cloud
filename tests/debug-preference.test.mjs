import test from 'node:test';
import assert from 'node:assert/strict';
import {createDebugPreference} from '../src/chrome/debug-preference.mjs';
import {createDepthFeedback} from '../src/modes/depth/native-click.mjs';
function fixture(initial){
 const f={value:initial,writes:[],listeners:new Set(),calls:[]};
 f.chrome={storage:{local:{get:async key=>{f.calls.push({read:key});if(f.readError)throw Error('read unavailable');return f.pendingRead??{uiDebugMode:f.value};},set:async value=>{if(f.writeError)throw Error('write unavailable');f.writes.push(structuredClone(value));f.value=value.uiDebugMode;}},onChanged:{addListener:fn=>f.listeners.add(fn),removeListener:fn=>f.listeners.delete(fn)}},runtime:{sendMessage:async()=>{throw Error('preference must not send domain messages');}},identity:{launchWebAuthFlow:()=>{throw Error('preference must not authorize');}}};
 f.event=(newValue,area='local')=>{for(const fn of f.listeners)fn({uiDebugMode:{newValue}},area);};
 f.remove=()=>{for(const fn of f.listeners)fn({uiDebugMode:{oldValue:true}},'local');};
 return f;
}
for(const value of [undefined,null,false,0,1,'true',{},[]])test(`Debug preference defaults OFF and rejects non-boolean stored ${JSON.stringify(value)}`,async()=>{
 const f=fixture(value),pref=createDebugPreference(f.chrome);assert.equal(pref.enabled,false);assert.equal(await pref.ready,false);assert.equal(pref.enabled,false);assert.equal(f.writes.length,0);assert.deepEqual(f.calls,[{read:'uiDebugMode'}]);pref.close();
});
test('Debug reads only the stored true boolean and restores it without writing credentials/configuration',async()=>{
 const f=fixture(true),pref=createDebugPreference(f.chrome);assert.equal(pref.enabled,false);assert.equal(await pref.ready,true);assert.equal(pref.enabled,true);assert.equal(f.writes.length,0);pref.close();
});
test('Debug setters persist exactly one presentation preference and notify subscribers without granting authority',async()=>{
 const f=fixture(false),pref=createDebugPreference(f.chrome);await pref.ready;const observed=[];const unsubscribe=pref.subscribe(value=>observed.push(value));
 assert.equal(await pref.set(true),true);assert.equal(pref.enabled,true);assert.equal(await pref.set(false),false);assert.equal(pref.enabled,false);
 assert.deepEqual(f.writes,[{uiDebugMode:true},{uiDebugMode:false}]);assert.deepEqual(observed,[true,false]);unsubscribe();await pref.set(true);assert.deepEqual(observed,[true,false]);pref.close();
});
test('invalid Debug setter never writes an implicit truthy preference',async()=>{
 const f=fixture(false),pref=createDebugPreference(f.chrome);await pref.ready;
 for(const value of ['true',1,null,undefined,{},[]])await assert.rejects(pref.set(value),TypeError);
 assert.equal(pref.enabled,false);assert.equal(f.writes.length,0);pref.close();
});
test('Debug follows only local storage changes; removal and invalid values disable presentation',async()=>{
 const f=fixture(false),pref=createDebugPreference(f.chrome);await pref.ready;f.event(true,'sync');assert.equal(pref.enabled,false);f.event(true,'session');assert.equal(pref.enabled,false);
 f.event(true);assert.equal(pref.enabled,true);f.event('true');assert.equal(pref.enabled,false);f.event(true);f.remove();assert.equal(pref.enabled,false);assert.equal(f.writes.length,0);pref.close();
});
test('a local preference event wins over a delayed stale initial read',async()=>{
 const f=fixture(false);let release;f.pendingRead=new Promise(resolve=>release=resolve);const pref=createDebugPreference(f.chrome);await Promise.resolve();f.event(true);assert.equal(pref.enabled,true);release({uiDebugMode:false});assert.equal(await pref.ready,true);assert.equal(pref.enabled,true);pref.close();
});
test('an explicit set wins over a delayed stale initial read',async()=>{
 const f=fixture(false);let release;f.pendingRead=new Promise(resolve=>release=resolve);const pref=createDebugPreference(f.chrome);await Promise.resolve();await pref.set(true);release({uiDebugMode:false});assert.equal(await pref.ready,true);assert.equal(pref.enabled,true);pref.close();
});
test('read failure or missing storage keeps Debug OFF instead of weakening execution gates',async()=>{
 const f=fixture(true);f.readError=true;const pref=createDebugPreference(f.chrome);assert.equal(await pref.ready,false);assert.equal(pref.enabled,false);pref.close();
 const unavailable=createDebugPreference({});assert.equal(await unavailable.ready,false);await assert.rejects(unavailable.set(true),/UNAVAILABLE/);unavailable.close();
});
test('failed enable write stays OFF and does not publish enabled presentation',async()=>{
 const f=fixture(false),pref=createDebugPreference(f.chrome);await pref.ready;const observed=[];pref.subscribe(value=>observed.push(value));f.writeError=true;await assert.rejects(pref.set(true),/write unavailable/);assert.equal(pref.enabled,false);assert.deepEqual(observed,[false]);pref.close();
});
test('failed disable write immediately turns Debug OFF even when previously enabled',async()=>{
 const f=fixture(true),pref=createDebugPreference(f.chrome);assert.equal(await pref.ready,true);const observed=[];pref.subscribe(value=>observed.push(value));f.writeError=true;
 await assert.rejects(pref.set(false),/write unavailable/);assert.equal(pref.enabled,false);assert.deepEqual(observed,[false]);assert.equal(f.writes.length,0);pref.close();
});
test('an older failed setter does not overwrite a newer external local preference event',async()=>{
 const f=fixture(false),pref=createDebugPreference(f.chrome);await pref.ready;let reject;
 f.chrome.storage.local.set=()=>new Promise((_resolve,rejectWrite)=>reject=rejectWrite);
 const pending=pref.set(false);f.event(true);assert.equal(pref.enabled,true);reject(Error('older write unavailable'));await assert.rejects(pending,/older write unavailable/);assert.equal(pref.enabled,true);pref.close();
});
test('failed explicit setter remains OFF when an older delayed startup read later returns true',async()=>{
 const f=fixture(true);let release;f.pendingRead=new Promise(resolve=>release=resolve);f.writeError=true;const pref=createDebugPreference(f.chrome);await Promise.resolve();
 await assert.rejects(pref.set(false),/write unavailable/);release({uiDebugMode:true});assert.equal(await pref.ready,false);assert.equal(pref.enabled,false);pref.close();
});
test('bad presentation subscribers cannot disrupt state propagation or other listeners',async()=>{
 const f=fixture(false),pref=createDebugPreference(f.chrome);await pref.ready;const values=[];pref.subscribe(()=>{throw Error('subscriber failed');});pref.subscribe(value=>values.push(value));await pref.set(true);f.event(false);assert.deepEqual(values,[true,false]);assert.equal(pref.enabled,false);pref.close();
});
test('closing removes native listener, ignores delayed initialization and rejects subsequent setters',async()=>{
 const f=fixture(true);let release;f.pendingRead=new Promise(resolve=>release=resolve);const pref=createDebugPreference(f.chrome),observed=[];pref.subscribe(v=>observed.push(v));await Promise.resolve();assert.equal(f.listeners.size,1);pref.close();assert.equal(f.listeners.size,0);f.event(true);release({uiDebugMode:true});assert.equal(await pref.ready,false);assert.equal(pref.enabled,false);assert.deepEqual(observed,[]);await assert.rejects(pref.set(true),/CLOSED/);
});
test('Depth outcomes remain durable and OS-silent for repeated blocked, uncertain and completed operations',async()=>{
 const writes=[],messages=[],badges=[],notifications=[];const chrome={storage:{local:{set:async v=>writes.push(structuredClone(v))}},runtime:{sendMessage:async m=>messages.push(m)},action:{setBadgeText:async b=>badges.push(b.text)},notifications:{create:async(...args)=>notifications.push(args)}};
 const feedback=createDepthFeedback(chrome),outcomes=[{state:'blocked',code:'WORKER_SETUP_REQUIRED',operationId:'depth-click:one'},{state:'uncertain',code:'VERIFY_UNCERTAIN',operationId:'depth-click:two'},{state:'completed',code:'DEPTH_CLICK_COMPLETED',operationId:'depth-click:three'}];
 for(const outcome of outcomes)await feedback(outcome);
 assert.deepEqual(writes,outcomes.map(lastDepthClick=>({lastDepthClick})));assert.equal(notifications.length,0);assert.deepEqual(messages.map(m=>m.state),outcomes.map(o=>o.state));assert.deepEqual(badges,['!','!']);
 assert.match(messages[0].message,/not saved/);assert.match(messages[1].message,/outcome not confirmed/);assert.match(messages[2].message,/completed/);
});
test('Depth failure feedback still reaches badge and existing in-app channel when the optional last-outcome write fails',async()=>{
 const notifications=[],messages=[],badges=[];const chrome={storage:{local:{set:async()=>{throw Error('quota');}}},runtime:{sendMessage:async m=>messages.push(m)},action:{setBadgeText:async b=>badges.push(b.text)},notifications:{create:async(...args)=>notifications.push(args)}};
 const feedback=createDepthFeedback(chrome);for(let i=0;i<3;i++)await feedback({state:'blocked',code:'WORKER_SETUP_REQUIRED',operationId:'depth-click:failure-'+i});
 assert.equal(notifications.length,0);assert.equal(messages.length,3);assert.deepEqual(badges,['!','!','!']);assert(messages.every(m=>m.channel==='depth-click-outcome'&&m.state==='blocked'));
});
