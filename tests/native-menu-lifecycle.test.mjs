import assert from 'node:assert/strict';
import test from 'node:test';
import {createEngineApi} from '../src/api/service.mjs';
import {productState} from '../src/api/config.mjs';
import {createChromeRegistrar} from '../src/chrome/registrar.mjs';
import {createEngine} from '../src/core/engine.mjs';

const request = {version:'3+1.1', method:'loginBegin', params:{}};
const target = {provider:'cloudflare', connectionId:'cloudflare:test', accountId:'test', bucketName:'saved', prefix:'chosen/'};
const provider = (id, label, siblingIndex = 0) => ({id,label,siblingIndex,parentId:null,type:'normal',role:'provider-action',providerAction:'cloudflare',contexts:['page','link','image'],visible:true,enabled:true});
const spec = (generation, ...rows) => ({schemaVersion:1,generation,rows});

function chromeFixture() {
 const rows = new Map(), calls = [], listeners = new Set();
 const controls = {fault:()=>null};
 const chrome = {runtime:{},contextMenus:{
  create(props, cb) { reply('create', props.id, cb, rows.has(props.id)?`Cannot create item with duplicate id ${props.id}`:null,()=>rows.set(props.id,props)); return props.id; },
  update(id, props, cb) { reply('update',id,cb,rows.has(id)?null:`Cannot find menu item with id ${id}`,()=>rows.set(id,{...rows.get(id),...props})); },
  remove(id, cb) { reply('remove',id,cb,rows.has(id)?null:`Cannot find menu item with id ${id}`,()=>rows.delete(id)); },
  removeAll(cb) { calls.push(['removeAll']); rows.clear(); cb(); },
  onClicked:{addListener:fn=>listeners.add(fn), removeListener:fn=>listeners.delete(fn)}
 }};
 function reply(method,id,callback,missing,mutation) {
  calls.push([method,id]);
  const fault=controls.fault(method,id);
  const error=fault==='reject'?'injected rejection':missing;
  if(!error)mutation();
  if(fault==='lose-callback')return;
  if(error)chrome.runtime.lastError={message:error};
  callback();
  delete chrome.runtime.lastError;
 }
 return {chrome,rows,calls,listeners,controls};
}

test('P0 lost create and rejected update preserve healthy rows and do not change dispatch authority',async()=>{
 const f=chromeFixture();
 const registrar=createChromeRegistrar({chrome:f.chrome,timeoutMs:15});
 assert.equal((await registrar.apply(spec(1,provider('cloud','Cloudflare')))).state,'completed');
 f.controls.fault=(method,id)=>method==='update'&&id==='cloud'?'reject':method==='create'&&id==='another'?'lose-callback':null;
 const next=spec(2,provider('cloud','Cloudflare renamed'),provider('another','Another',1));
 assert.equal((await registrar.apply(next)).state,'partial');
 assert.equal(f.rows.get('cloud').title,'Cloudflare');
 assert(f.rows.has('another'),'create took effect before its lost callback');
 assert.equal(registrar.resolveClick({generation:2,itemId:'cloud'}).code,'NATIVE_GENERATION_UNACKNOWLEDGED');
 f.controls.fault=()=>null;
 assert.equal((await registrar.apply(next)).state,'completed');
 assert.equal(f.rows.get('cloud').title,'Cloudflare renamed');
 assert.equal(f.calls.filter(([method,id])=>method==='create'&&id==='another').length,1);
 assert(!f.calls.some(([method])=>method==='removeAll'));
});

test('P0 twenty cold activations reuse existing IDs; stale cache and lost native rows recover without reset',async()=>{
 const f=chromeFixture();
 const model=spec(1,provider('cloud','Cloudflare'),provider('drive','Google Drive',1));
 let receipt,writes=0;
 const owner=()=>createChromeRegistrar({chrome:f.chrome,readRegistration:async()=>receipt,persist:async value=>{writes++;receipt=structuredClone(value);}});
 let registrar=owner();
 await registrar.apply(model);
 assert.equal(writes,2);
 for(let i=0;i<20;i++){
  registrar.close();registrar=owner();
  assert.equal(f.listeners.size,1);
  assert.equal(registrar.inspect().acknowledgedGeneration,null);
  assert.equal((await registrar.apply(structuredClone(model))).state,'completed');
 }
 assert.equal(writes,2);
 assert.equal(f.calls.filter(([method])=>method==='create').length,2);
 registrar.close();registrar=owner();
 receipt=undefined;
 f.rows.delete('drive');
 assert.equal((await registrar.apply(model)).state,'completed');
 assert.deepEqual([...f.rows.keys()],['cloud','drive']);
 assert.equal(f.calls.filter(([method])=>method==='create').length,3);
 assert(!f.calls.some(([method])=>method==='removeAll'));
});

test('P0 concurrent apply, interrupted journal, stale removals and CURRENT failure',async()=>{
 const f=chromeFixture();
 let valid=true,receipt;
 const original=spec(1,provider('cloud','Cloudflare'),provider('obsolete','Old',1));
 const replacement=spec(2,provider('cloud','Cloudflare'),provider('fresh','Fresh',1));
 const owner=()=>createChromeRegistrar({chrome:f.chrome,readRegistration:async()=>receipt,persist:async value=>{receipt=structuredClone(value);},beforeApply:async()=>{if(!valid)throw Object.assign(Error(),{code:'CONFIGURATION_CORRUPT'});}});
 let registrar=owner();await registrar.apply(original);
 f.controls.fault=(method,id)=>method==='remove'&&id==='obsolete'?'reject':null;
 const first=registrar.apply(replacement),joined=registrar.apply(replacement);
 assert.equal(first,joined);
 assert.equal((await first).state,'partial');
 assert.equal(receipt.nativeRows.length,3);
 assert.deepEqual([...f.rows.keys()],['cloud','obsolete','fresh']);
 registrar.close();registrar=owner();
 valid=false;
 const priorCalls=f.calls.length;
 assert.equal((await registrar.apply(replacement)).code,'CONFIGURATION_CORRUPT');
 assert.equal(f.calls.length,priorCalls);
 valid=true;f.controls.fault=()=>null;
 assert.equal((await registrar.apply(replacement)).state,'completed');
 assert.deepEqual([...f.rows.keys()],['cloud','fresh']);
 assert(!f.calls.some(([method])=>method==='removeAll'));
});

test('P0 first login and reconnect schedule the canonical menu even when setup fails without destinations',async()=>{
 const f=chromeFixture();
 let state={product:productState(),configs:{simple:{destinations:[]},nested:{destinations:[]},depth:{scopes:[]}},generation:{desired:0,applied:null}};
 const current={read:async()=>structuredClone(state),setDesiredGeneration:async g=>{state.generation.desired=g;},acknowledgeGeneration:async g=>{state.generation.applied=g;}};
 const registrar=createChromeRegistrar({chrome:f.chrome});
 const engine=createEngine({current,registrar,providerSetupActions:true,getAuthorization:async()=>null});
 let menuAttempt,scheduled=0;
 const api=createEngineApi({engine,current,getInventory:async()=>assert.fail('Empty local bootstrap must not load cloud inventory'),authorize:async()=>true,confirm:async()=>true,
  oauth:{connect:async()=>({state:'CONNECTED',accounts:[{id:'test'}]})},
  scheduleNative(reason){assert.equal(reason,'NATIVE_LOGIN');scheduled++;menuAttempt=api.reconcile({lifecycle:true,refreshDepthReadiness:false});},
  cloudflare:{async initialize(){assert.equal((await menuAttempt).state,'completed');return {state:'blocked',code:'R2_UNAVAILABLE'};}}
 });
 assert.equal((await api.reconcile({lifecycle:true,refreshDepthReadiness:false})).state,'completed');
 const before=[...f.rows.keys()];assert.equal(before.length,4);
 for(let i=0;i<2;i++){
  const login=await api.invoke(request,'gui');
  assert.equal(login.data.state,'CONNECTED');assert.equal(login.data.initialization.code,'R2_UNAVAILABLE');
  assert.deepEqual([...f.rows.keys()],before);
 }
 assert.equal(scheduled,2);
 assert.deepEqual(state.generation,{desired:1,applied:1});
 assert.deepEqual(state.configs,{simple:{destinations:[]},nested:{destinations:[]},depth:{scopes:[]}});
});

test('P0 100, 500 and 1000 native clicks keep exact targets, unique operations and an unchanged registration',async()=>{
 const f=chromeFixture();
 const state={product:productState(),configs:{simple:{destinations:[{id:'saved',target,label:'Saved'}]},nested:{destinations:[]},depth:{scopes:[]}},generation:{desired:0,applied:null}};
 const current={read:async()=>structuredClone(state),setDesiredGeneration:async g=>{state.generation.desired=g;},acknowledgeGeneration:async g=>{state.generation.applied=g;}};
 let engine,received=new Set();
 const authorize=async()=>({sessionId:'session',authorizedTargets:[target]});
 const registrar=createChromeRegistrar({chrome:f.chrome,dispatchOwnsAuthorization:true,dispatch:(_route,{generation,info})=>engine.save({itemId:info.menuItemId,generation,context:'link',source:{url:info.linkUrl,filename:'payload'}})});
 engine=createEngine({current,registrar,providerSetupActions:true,getAuthorization:authorize,remoteSave:async input=>{
  assert.deepEqual(input.target,target);assert(await input.authorize());assert(!received.has(input.operationId));received.add(input.operationId);
  return {state:'verified',operationId:input.operationId};
 }});
 const compiled=await engine.compile({mode:'composite',inventory:{scopes:[{target,folders:['chosen/'],authorized:true,workerReady:true}]}});
 assert.equal((await engine.apply(compiled)).state,'completed');
 const id=compiled.rows.find(row=>row.role==='save').id,mutationCount=f.calls.length;
 for(const count of [100,500,1000]){
  received=new Set();
  const outcomes=await Promise.all(Array.from({length:count},(_,i)=>registrar.handleClick({menuItemId:id,linkUrl:`https://example.org/${i}`})));
  assert(outcomes.every(outcome=>outcome.completion==='verified'));
  assert.equal(received.size,count);assert.equal(f.calls.length,mutationCount);assert.equal(f.listeners.size,1);
 }
});
