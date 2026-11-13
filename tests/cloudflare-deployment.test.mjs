import test from 'node:test';import assert from 'node:assert/strict';
import {createProvisioner,WORKER_MODULES} from '../src/cloudflare/deployment.mjs';
import {digest} from '../src/cloudflare/wire.mjs';
const target={provider:'cloudflare',connectionId:'cloudflare:a',accountId:'a',bucketName:'bucket',prefix:'folder/'};
function fixture(){const plans=new Map(),calls=[];let metadata,remoteMissing=false,failUploadOnce=false;
 const request=async(path,options={})=>{calls.push({path,method:options.method??'GET'});
  if(options.method==='PUT'){metadata=JSON.parse(await options.body.get('metadata').text());if(failUploadOnce){failUploadOnce=false;throw Object.assign(Error('reply lost'),{code:'TRANSIENT_API_FAILURE'});}return Response.json({success:true,result:{}});}
  if(path.endsWith('/settings'))return remoteMissing?Response.json({success:false},{status:404}):Response.json({success:true,result:{bindings:metadata.bindings}});
  if(options.method==='POST'&&path.endsWith('/subdomain'))return Response.json({success:true,result:{enabled:true}});
  if(path.endsWith('/subdomain'))return Response.json({success:true,result:{subdomain:'fixture-account'}});
  throw Error('UNEXPECTED_REQUEST');};
 return {plans,calls,get metadata(){return metadata;},set remoteMissing(value){remoteMissing=value;},set failUploadOnce(value){failUploadOnce=value;},p:createProvisioner({request,readModule:async path=>'// synthetic module '+path,load:k=>plans.get(k),store:(k,v)=>plans.set(k,v)})};}
test('provisioning requires explicit approval and records exact immutable R2/DO/secret bindings',async()=>{const f=fixture();await assert.rejects(f.p.prepare(target),{code:'SETUP_APPROVAL_REQUIRED'});assert.equal(f.calls.length,0);const plan=await f.p.prepare(target,{approved:true});assert(plan.url.endsWith('.fixture-account.workers.dev'));assert.equal(f.metadata.main_module,'src/cloudflare/worker.mjs');assert.equal(f.metadata.bindings.find(b=>b.name==='STORAGE').bucket_name,'bucket');assert.equal(f.metadata.bindings.find(b=>b.name==='ACCOUNT_ID').text,'a');assert.equal(f.metadata.bindings.find(b=>b.name==='SIGNING_KEY').type,'secret_text');assert.deepEqual(f.metadata.migrations.new_sqlite_classes,['RemoteClaims']);assert(WORKER_MODULES.includes('right2cloud-module/src/cloudflare-r2-writer.mjs'));const count=f.calls.length;assert.equal((await f.p.prepare(target,{approved:true})).name,plan.name);assert.equal(f.calls.length,count);});
test('interrupted owned deployment is inspected and resumed without reupload or rebinding',async()=>{const f=fixture(),plan=await f.p.prepare(target,{approved:true}),key=await digest(['a','bucket']);f.plans.set(key,{...plan,state:'pending'});const puts=f.calls.filter(c=>c.method==='PUT').length;const resumed=await f.p.prepare(target,{approved:true});assert.equal(resumed.state,'ready');assert.equal(resumed.name,plan.name);assert.equal(f.calls.filter(c=>c.method==='PUT').length,puts);assert(f.calls.some(c=>c.path.endsWith('/settings')));});
test('explicit repair updates only an owned matching Worker and preserves its existing prefix scope',async()=>{const f=fixture(),plan=await f.p.prepare(target,{approved:true,prefixScope:'folder'});const repaired=await f.p.prepare(target,{approved:true,rebuild:true});assert.equal(repaired.name,plan.name);assert.equal(repaired.prefixScope,'folder');assert.equal(f.metadata.migrations,undefined);const key=await digest(['a','bucket']);f.plans.set(key,{...repaired,accountId:'foreign'});const before=f.calls.length;await assert.rejects(f.p.prepare(target,{approved:true,rebuild:true}),{code:'TRANSPORT_PLAN_INVALID'});assert.equal(f.calls.length,before);});
test('ready-plan inspection reuses an owned deployment and recreates only its confirmed missing script',async()=>{
 const f=fixture(),plan=await f.p.prepare(target,{approved:true}),puts=()=>f.calls.filter(c=>c.method==='PUT');
 assert.equal((await f.p.prepare(target,{approved:true,inspect:true})).name,plan.name);assert.equal(puts().length,1);
 f.remoteMissing=true;const repaired=await f.p.prepare(target,{approved:true,inspect:true});assert.equal(repaired.name,plan.name);assert.equal(repaired.secret,plan.secret);assert.equal(puts().length,2);assert.equal(puts()[0].path,puts()[1].path);
});
test('owned inspection rejects foreign bucket/claims bindings and preserves restricted prefix',async()=>{
 for(const mutate of [m=>{m.bindings.find(b=>b.name==='BUCKET_NAME').text='foreign';},m=>{m.bindings.find(b=>b.name==='CLAIMS').script_name='other-worker';}]){
  const f=fixture();await f.p.prepare(target,{approved:true});mutate(f.metadata);const before=f.calls.filter(c=>c.method==='PUT').length;
  await assert.rejects(f.p.prepare(target,{approved:true,inspect:true}),{code:'PROVISION_RECONCILE_REQUIRED'});assert.equal(f.calls.filter(c=>c.method==='PUT').length,before);
 }
 const f=fixture();await f.p.prepare(target,{approved:true,prefixScope:'folder'});const before=f.calls.length;
 await assert.rejects(f.p.prepare(target,{approved:true,prefixScope:'',inspect:true}),{code:'WORKER_DESTINATION_SCOPE_REQUIRED'});assert.equal(f.calls.length,before);
});
test('missing signing secret needs explicit renewal and only an inspected owned Worker is updated',async()=>{
 const f=fixture(),original=await f.p.prepare(target,{approved:true}),key=await digest(['a','bucket']);f.plans.set(key,{...original,secret:undefined});
 const count=f.calls.length;await assert.rejects(f.p.prepare(target,{approved:true,inspect:true}),{code:'WORKER_SIGNING_RENEWAL_APPROVAL_REQUIRED'});assert.equal(f.calls.length,count);
 const renewed=await f.p.prepare(target,{approved:true,renewSigning:true});assert.equal(renewed.name,original.name);assert.match(renewed.secret,/^[a-f0-9]{64}$/);assert.notEqual(renewed.secret,original.secret);assert.equal(f.metadata.migrations,undefined);assert.equal(f.metadata.bindings.find(x=>x.name==='SIGNING_KEY').text,renewed.secret);
 const foreign=fixture();await foreign.p.prepare(target,{approved:true});foreign.metadata.bindings.find(x=>x.name==='BUCKET_NAME').text='foreign';const puts=foreign.calls.filter(x=>x.method==='PUT').length;
 await assert.rejects(foreign.p.prepare(target,{approved:true,renewSigning:true}),{code:'PROVISION_RECONCILE_REQUIRED'});assert.equal(foreign.calls.filter(x=>x.method==='PUT').length,puts);
});
test('interrupted signing renewal retains pending secret and script identity across retry',async()=>{
 const f=fixture(),original=await f.p.prepare(target,{approved:true}),key=await digest(['a','bucket']);f.failUploadOnce=true;
 await assert.rejects(f.p.prepare(target,{approved:true,renewSigning:true}),{code:'TRANSIENT_API_FAILURE'});const pending=structuredClone(f.plans.get(key));assert.equal(pending.signingRenewalPending,true);assert.notEqual(pending.secret,original.secret);
 const resumed=await f.p.prepare(target,{approved:true,inspect:true,retryDenied:true});assert.equal(resumed.secret,pending.secret);assert.equal(resumed.name,pending.name);assert.equal(resumed.signingRenewalPending,undefined);assert.equal(new Set(f.calls.filter(x=>x.method==='PUT').map(x=>x.path)).size,1);
});
