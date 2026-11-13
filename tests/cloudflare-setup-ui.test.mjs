import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedSetupReady,selectedSetupLabel,selectedSetupCode} from '../extension/cloudflare-setup-view.mjs';

const target={provider:'cloudflare',connectionId:'cloudflare:owner',accountId:'owner',bucketName:'depth-b',prefix:'selected/leaf/'};
function evidence(){return {readiness:{state:'READY',target,fromCache:false,worker:{state:'READY',proof:'same-bucket-write-and-current-scoped-capability',destination:target,checkedAt:Date.now()}},native:{pending:false,acknowledgedGeneration:34,desired:{generation:34,rows:[{role:'save',actionKind:'save',enabled:true,visible:true,target}]}}};}

test('selected setup readiness needs fresh exact capability/write proof and current actionable native ACK',()=>{
 const {readiness,native}=evidence();assert.equal(selectedSetupReady(target,readiness,native),true);
 for(const mutate of [r=>{r.readiness.state='REPAIR_REQUIRED';},r=>{r.readiness.fromCache=true;},r=>{delete r.readiness.worker.proof;},r=>{delete r.readiness.worker.checkedAt;},r=>{r.readiness.worker.state='PREPARED';},r=>{r.native.pending=true;},r=>{r.native.acknowledgedGeneration=33;},r=>{r.native.desired.rows[0].actionKind='attention';},r=>{r.native.desired.rows[0].enabled=false;},r=>{r.native.desired.rows=[];}]){const r=structuredClone(evidence());mutate(r);assert.equal(selectedSetupReady(target,r.readiness,r.native),false);}
});
test('working Narrow bucket or another Depth prefix cannot paint the clicked target ready',()=>{
 for(const field of ['bucketName','accountId','connectionId','prefix']){
  for(const owner of ['target','destination','row']){const r=structuredClone(evidence()),other={...target,[field]:'different'};if(owner==='target')r.readiness.target=other;if(owner==='destination')r.readiness.worker.destination=other;if(owner==='row')r.native.desired.rows[0].target=other;assert.equal(selectedSetupReady(target,r.readiness,r.native),false);}
 }
 assert.equal(selectedSetupReady(target,{state:'completed',code:'CLOUDFLARE_READY'},evidence().native),false);
 assert.equal(selectedSetupLabel(target,[{id:'owner',name:'Authorized account'}]),'Authorized account · depth-b/selected/leaf/');
});
test('exact attention preserves actionable approval and uncertainty over a generic missing-plan read',()=>{
 const missing={state:'REPAIR_REQUIRED',worker:{code:'WORKER_SETUP_REQUIRED'}};
 for(const code of ['SETUP_APPROVAL_REQUIRED','WORKER_UPGRADE_APPROVAL_REQUIRED','WORKER_BUILD_MISMATCH','CAPABILITY_DENIED','WORKER_SIGNING_RENEWAL_APPROVAL_REQUIRED','SETUP_PROBE_REQUIRES_INSPECTION'])assert.equal(selectedSetupCode(missing,code),code);
 assert.equal(selectedSetupCode(missing,'FRESH_CLICK_REQUIRED'),'WORKER_SETUP_REQUIRED');
 assert.equal(selectedSetupCode({state:'READY'},'SETUP_APPROVAL_REQUIRED'),'NATIVE_APPLY_INCOMPLETE');
});
