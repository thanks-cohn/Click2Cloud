import test from 'node:test';
import assert from 'node:assert/strict';
import {createEngine} from '../src/core/engine.mjs';
import {createDiagnostics} from '../src/glaciaring/index.mjs';
import {createInventoryDiscovery} from '../src/inventory/discovery.mjs';
import {captureSelectedBytes} from '../src/core/source-capture.mjs';
const target={provider:'cloudflare',connectionId:'connection',accountId:'account',bucketName:'bucket',prefix:'Selected/'};
async function engineFixture({readAuth,authorizeSource}={}) {
  const diagnostics=createDiagnostics(),outcomes=[];let uploads=0,captures=0;
  const auth={sessionId:'session',authorizedTargets:[target]};
  const state={configs:{simple:{destinations:[{target}]},nested:{destinations:[]},depth:{scopes:[]}},generation:{desired:0,applied:null}};
  let evidence={pending:false,desired:null,acknowledgedGeneration:null};
  const registrar={inspect:()=>evidence,apply:async spec=>{evidence={pending:false,desired:spec,acknowledgedGeneration:spec.generation};return {state:'completed',appliedGeneration:spec.generation};}};
  const current={read:async()=>structuredClone(state),setDesiredGeneration:async n=>{state.generation.desired=n;},acknowledgeGeneration:async n=>{state.generation.applied=n;}};
  const supersede=()=>{evidence={...evidence,pending:true,desired:{generation:2}};};
  const engine=createEngine({current,registrar,diagnostics,
    getAuthorization:()=>readAuth?readAuth(auth,supersede):auth,
    authorizeSource:async source=>{captures++;return authorizeSource?authorizeSource(source,supersede):true;},
    providers:{cloudflare:{upload:async()=>{uploads++;return {confirmed:true};},verifyReceipt:async()=>({verified:true,independent:true,byteLength:1,destinationMatches:true,evidenceClass:'provider-readback'})}},
    onSaveOutcome:result=>outcomes.push(result)});
  const spec=await engine.compile({mode:'simple',inventory:{scopes:[{...target,authorized:true,workerReady:true,complete:true,folders:['Selected/']}]}});
  await engine.apply(spec);
  const save=extra=>engine.save({itemId:spec.rows.find(r=>r.role==='save').id,generation:1,source:{filename:'source.png',bytes:Uint8Array.of(1)},...extra});
  return {save,diagnostics,outcomes,counts:()=>({uploads,captures})};
}

test('review: generation changes during asynchronous auth block source acquisition as well as upload',async()=>{
  const h=await engineFixture({readAuth:async(auth,supersede)=>{await Promise.resolve();supersede();return auth;}});
  const result=await h.save();assert.equal(result.state,'blocked');assert.deepEqual(h.counts(),{uploads:0,captures:0});
});
test('review: generation changes during capture block dispatch under the old ACK',async()=>{
  const h=await engineFixture({authorizeSource:async(_source,supersede)=>{supersede();return true;}});
  const result=await h.save();assert.equal(result.state,'blocked');assert.equal(result.code,'AUTH_REVOKED');assert.deepEqual(h.counts(),{uploads:0,captures:1});
});
test('review: thrown auth and cancelled capture report exact outcomes with explicit downstream dependency signals',async()=>{
  for(const cause of ['auth','capture']) {
    const h=await engineFixture(cause==='auth'?{readAuth:()=>{throw Error('private-token-and-url');}}:{});
    const result=await h.save(cause==='capture'?{signal:AbortSignal.abort()}:{});
    assert.equal(result.state,cause==='auth'?'failed':'cancelled');
    assert.equal(result.code,cause==='auth'?'AUTH_CHECK_FAILED':'CAPTURE_INTERRUPTED');
    assert.equal(h.outcomes.length,1);assert.equal(h.counts().uploads,0);
    const trace=h.diagnostics.snapshot({operationId:result.operationId});
    assert.ok(trace.events.some(e=>e.stage==='intent'&&e.outcome==='blocked'&&e.requires.length));
    assert.ok(trace.events.some(e=>e.stage==='completion.history'&&e.outcome==='skipped'&&e.requires.length));
    assert.ok(!JSON.stringify([trace,result]).includes('private-token'));
  }
});
test('review: capture deadline and abort settle even if host fetch, reader or cancel never settles',async()=>{
  const source={filename:'source.png',url:'https://approved.invalid/image'};
  const stalled=()=>new Promise(()=>{});
  await assert.rejects(captureSelectedBytes(source,{authorizeSource:()=>true,fetchSource:stalled,requestTimeoutMs:5}),{code:'CAPTURE_TIMEOUT'});
  let cancelled=false;
  const body={getReader:()=>({read:stalled,cancel:()=>{cancelled=true;return stalled();}})};
  await assert.rejects(captureSelectedBytes(source,{authorizeSource:()=>true,fetchSource:async()=>({ok:true,body}),requestTimeoutMs:5}),{code:'CAPTURE_TIMEOUT'});
  assert.equal(cancelled,true);
  const controller=new AbortController();const result=captureSelectedBytes(source,{authorizeSource:()=>true,fetchSource:stalled,signal:controller.signal});
  controller.abort();await assert.rejects(result,{name:'AbortError',code:'CAPTURE_INTERRUPTED'});
  await assert.rejects(captureSelectedBytes(source,{authorizeSource:()=>true,fetchSource:async()=>({ok:true,redirected:true,body})}),{code:'CAPTURE_DENIED'});
});
test('review: a completed subtree scan never claims complete bucket inventory',async()=>{
  const discovery=createInventoryDiscovery({fileApi:{run:async()=>({state:'completed',data:{entries:[],cursor:''}})}});
  discovery.begin([target]);const result=await discovery.resume();
  assert.equal(result.state,'partial');assert.equal(result.snapshot.complete,false);assert.equal(result.snapshot.requestedComplete,true);
  assert.equal(result.snapshot.scopes[0].complete,false);assert.equal(result.snapshot.scopes[0].coveragePrefix,'Selected/');
  assert.equal(result.snapshot.scopes[0].reason,'INVENTORY_SCOPED_COMPLETE');
});
test('review: descendant-first inventory scans natural ancestors and preserves sibling coverage',async()=>{
  const calls=[];
  const discovery=createInventoryDiscovery({fileApi:{run:async(_op,{source})=>{
    calls.push(source.prefix);
    return {state:'completed',data:{entries:source.prefix===''?[{folder:true,key:'A/B/'}]:source.prefix==='A/'?[{folder:true,key:'A/C/'},{folder:true,key:'A/'}]:[],cursor:''}};
  }}});
  discovery.begin([{...target,prefix:''}]);const result=await discovery.resume();
  assert.equal(result.state,'completed');assert.deepEqual(result.snapshot.scopes[0].folders,['A','A/B','A/C']);
  for(const prefix of ['','A/','A/B/','A/C/'])assert.ok(calls.includes(prefix));
});
test('review: a partially ingested failed inventory page advances immutable revision and discloses retained nodes',async()=>{
  const discovery=createInventoryDiscovery({fileApi:{run:async()=>({state:'completed',data:{entries:[{folder:true,key:'Known/'},{folder:true,key:'../escape/'}]}})}});
  const before=discovery.begin([{...target,prefix:''}]);const result=await discovery.resume();
  assert.ok(result.snapshot.revision>before.revision);assert.equal(result.snapshot.complete,false);
  assert.deepEqual(result.snapshot.scopes[0].folders,['Known']);assert.equal(result.snapshot.scopes[0].reason,'INVENTORY_INVALID_PATH');
});
