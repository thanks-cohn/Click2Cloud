import test from 'node:test';
import assert from 'node:assert/strict';
import {createEngine} from '../src/core/engine.mjs';
import {createChromeRegistrar} from '../src/chrome/registrar.mjs';
import {createDiagnostics} from '../src/glaciaring/index.mjs';
import {callbackChrome,target} from '../scripts/glaciaring-fixtures.mjs';
const t=target('Pictures/');
async function fixture({sinkMode='normal',authFailure=false,completionFailure=false,uploadFailure=false}={}) {
  const diagnostics=createDiagnostics(), outcomes=[],calls=[];
  let auth={sessionId:'fixture-session',authorizedTargets:[t]},state={configs:{simple:{destinations:[{id:'pictures',target:t}]},nested:{destinations:[]},depth:{scopes:[]}},generation:{desired:0,applied:null}};
  const current={read:async()=>structuredClone(state),setDesiredGeneration:async g=>{state.generation.desired=g;},acknowledgeGeneration:async g=>{state.generation.applied=g;}};
  const sink=sinkMode==='throwing'?()=>{throw Error('bad diagnostic sink');}:sinkMode==='off'?undefined:diagnostics.emit;
  const registrar=createChromeRegistrar({...callbackChrome(),sink});
  const engine=createEngine({current,registrar,diagnostics:sinkMode==='normal'?diagnostics:sink,
    providers:{cloudflare:{upload:async p=>{calls.push(p);if(uploadFailure)throw Object.assign(Error('private-source-url'),{uncertain:true});return {confirmed:true,id:'fixture-receipt'};},verifyReceipt:async()=>({verified:true,independent:true,byteLength:3,destinationMatches:true,evidenceClass:'provider-readback'})}},
    getAuthorization:async()=>authFailure?null:auth,authorizeSource:()=>true,
    onVerifiedCompletion:async()=>{if(completionFailure)throw Error('private-filename');},onSaveOutcome:o=>outcomes.push(o)});
  const spec=await engine.compile({mode:'simple',inventory:{revision:1,scopes:[{...target(),authorized:true,workerReady:true,complete:true,folders:['Pictures/']}]}});
  await engine.apply(spec);
  return {engine,spec,registrar,diagnostics,outcomes,calls,revoke(){auth={sessionId:'different-session',authorizedTargets:[]};}};
}
test('shared engine composes native ACK, exact canonical route, local capture and independently verified completion',async()=>{
  for(const sinkMode of ['normal','off','throwing']) {
    const h=await fixture({sinkMode});const row=h.spec.rows.find(r=>r.role==='save');
    const result=await h.engine.save({itemId:row.id,generation:1,source:{filename:'a.png',bytes:Uint8Array.of(1,2,3)}});
    assert.equal(result.state,'completed');assert.equal(h.calls.length,1);
    assert.equal(h.calls[0].destination.accountId,t.accountId);assert.equal(h.calls[0].destination.connectionId,t.connectionId);
    assert.equal(h.calls[0].destination.path,'Pictures');assert.equal(h.outcomes.length,1);
    if(sinkMode==='normal') {
      const trace=h.diagnostics.snapshot({operationId:result.operationId});
      assert.equal(trace.stats.dropped,0);assert(trace.events.some(e=>e.stage==='capture.acquire'&&e.code==='CAPTURE_COMPLETE'));
      assert(trace.events.some(e=>e.stage==='transfer.verify'&&e.code==='RECEIPT_VERIFIED'));
    }
    h.registrar.close();
  }
});
test('stale/revoked selections never capture or upload; source errors still notify with debug off',async()=>{
  const h=await fixture({sinkMode:'off'}),row=h.spec.rows.find(r=>r.role==='save');
  assert.equal((await h.engine.save({itemId:row.id,generation:0})).state,'blocked');
  h.revoke();assert.equal((await h.engine.save({itemId:row.id,generation:1})).state,'blocked');
  assert.equal(h.calls.length,0);assert.equal(h.outcomes.length,2);h.registrar.close();
});
test('uncertain write and failed verified completion do not replay or falsely count',async()=>{
  for(const options of [{uploadFailure:true},{completionFailure:true}]) {
    const h=await fixture(options),row=h.spec.rows.find(r=>r.role==='save');
    const result=await h.engine.save({itemId:row.id,generation:1,source:{filename:'a.png',bytes:Uint8Array.of(1,2,3)}});
    assert.equal(result.state,options.uploadFailure?'uncertain':'partial');
    assert.equal(h.calls.length,1);assert(!JSON.stringify(result).includes('private-'));
    h.registrar.close();
  }
});
