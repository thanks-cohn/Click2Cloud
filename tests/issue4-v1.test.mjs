import test from 'node:test';import assert from 'node:assert/strict';
import {fixture,t} from './cloudflare-onboarding.test.mjs';
import {applyConfigChanges,productState} from '../src/api/config.mjs';
import {createCloudflareOnboarding} from '../src/cloudflare/onboarding.mjs';
import {createEngineApi} from '../src/api/service.mjs';
const approve=f=>f.current.writeSetupOperation('approval:a',{accountId:'a',approved:true});
const rows=f=>f.state.configs.simple.destinations;
const configure=async(f,changes)=>{const s=await f.current.read(),n=applyConfigChanges(s,changes);await f.current.commitProduct({...n,expectedRevision:s.product.revision});};
for(const exists of [true,false])test('V1 authorized login '+(exists?'reuses':'creates')+' redown, ordinary entry/default and verified next save',async()=>{
 const f=fixture({buckets:exists?['redown']:[]});await approve(f);const results=await Promise.all([f.c.initialize(),f.c.initialize()]);for(const r of results)assert.equal(r.code,'CLOUDFLARE_READY');
 assert.equal(f.calls.filter(x=>x==='POST').length,exists?0:1);assert.equal(rows(f).length,1);assert.equal(rows(f)[0].label,'redown');assert.deepEqual(rows(f)[0].target,f.state.product.defaultTarget);assert.equal(rows(f)[0].target.prefix,'');
 await f.c.initialize();assert.equal(rows(f).length,1);assert.equal(f.calls.filter(x=>x?.probe).length,1);
 const save=await f.c.invoke({provider:'cloudflare',source:{url:'https://public.example/file',filename:'file'}});assert.equal(save.completion,'verified');assert(!f.calls.includes('shelf'));
});
test('saved assignments without default preserve labels, visibility, order and mode; never add redown',async()=>{
 const f=fixture({buckets:['photos']});await approve(f);await configure(f,[{type:'createDestination',mode:'nested',target:t,label:'My Photos'},{type:'updateDestination',mode:'nested',id:applyConfigChanges(await f.current.read(),[{type:'createDestination',mode:'nested',target:t}]).configs.nested.destinations[0].id,hidden:true}]);
 const before=structuredClone(f.state.configs);assert.equal((await f.c.initialize()).code,'CLOUDFLARE_READY');assert.deepEqual(f.state.configs,before);assert.equal(f.state.product.defaultTarget,null);assert(!f.calls.includes('POST'));assert.equal(rows(f).length,0);
});
test('default-only migration links exact custom target to an editable canonical row without implicit remote approval',async()=>{
 const f=fixture({chosen:t,buckets:['photos']});const r=await f.c.initialize();assert.equal(r.code,'SETUP_APPROVAL_REQUIRED');assert.deepEqual(f.state.product.defaultTarget,t);assert.deepEqual(rows(f)[0].target,t);assert.equal(rows(f).length,1);assert(!f.calls.some(x=>x==='POST'||x?.prepare||x?.probe));
 await f.c.initialize();assert.equal(rows(f).length,1);
});
test('existing default plus assignments is unchanged and multiple assignments without a default stay ambiguous',async()=>{
 const f=fixture({chosen:t,buckets:['photos','archive']});await approve(f);const other={...t,bucketName:'archive'};await configure(f,[{type:'createDestination',mode:'simple',target:other,label:'Archive'}]);const before=structuredClone(f.state.configs);await f.c.initialize();assert.deepEqual(f.state.configs,before);assert.deepEqual(f.state.product.defaultTarget,t);assert(!f.calls.includes('POST'));
 const g=fixture({buckets:['photos','archive']});await approve(g);await configure(g,[{type:'createDestination',mode:'simple',target:t},{type:'createDestination',mode:'simple',target:other}]);assert.equal((await g.c.initialize()).code,'CHOOSE_DESTINATION');assert(!g.calls.some(x=>x==='POST'||x?.prepare));
});
test('configuration-only deletion of last row reinitializes on next login, but never on passive status or restart',async()=>{
 const f=fixture({buckets:[]});await approve(f);await f.c.initialize();await configure(f,[{type:'deleteDestinationConfig',mode:'simple',id:rows(f)[0].id}]);assert.equal(f.state.product.defaultTarget,null);assert.equal(rows(f).length,0);const writes=f.calls.filter(x=>x==='POST'||x?.probe||x?.prepare).length;await f.c.check('a');assert.equal(f.calls.filter(x=>x==='POST'||x?.probe||x?.prepare).length,writes);assert.equal(rows(f).length,0);
 await f.c.initialize();assert.equal(rows(f).length,1);assert.equal(f.calls.filter(x=>x==='POST').length,1);
});
test('deleting redown with a surviving assignment preserves that survivor at next login',async()=>{
 const f=fixture({buckets:['redown','photos']});await approve(f);await f.c.initialize();const redown=rows(f)[0];await configure(f,[{type:'createDestination',mode:'simple',target:t,label:'Keep Photos'},{type:'deleteDestinationConfig',mode:'simple',id:redown.id}]);const before=structuredClone(rows(f));await f.c.initialize();assert.deepEqual(rows(f),before);assert.deepEqual(f.state.product.defaultTarget,t);assert(!rows(f).some(d=>d.target.bucketName==='redown'));assert(!f.calls.includes('POST'));
});
test('missing consent, unknown R2, missing scopes and wrong account never mutate remote resources',async()=>{
 for(const mode of ['approval','unknown','scopes','wrong']){const f=fixture({failure:mode==='unknown'?'permission':null});if(mode!=='approval')await approve(f);if(mode==='scopes'){const auth=f.oauth.authority;f.oauth.authority=async()=>({...await auth(),scopes:['workers-r2.read']});}if(mode==='wrong')f.state.product.cloudflare.selectedAccountId='wrong';const r=await f.c.initialize();assert.notEqual(r.state,'completed');assert(!f.calls.some(x=>x==='POST'||x?.prepare||x?.probe),mode);}
});
test('partial probe completion resumes after worker restart without a duplicate write or manager entry',async()=>{
 const f=fixture();await approve(f);const mark=f.provisioner.markVerified;f.provisioner.markVerified=async()=>{throw Error('local completion loss');};const first=await f.c.initialize();assert.equal(first.code,'SETUP_COMPLETION_PENDING');const writes=f.calls.filter(x=>x?.probe).length;f.provisioner.markVerified=mark;f.transport.probeStatus=async(_t,id)=>({state:'verified',operationId:id,receipt:{key:'readiness'}});
 const restarted=createCloudflareOnboarding({current:f.current,oauth:f.oauth,provisioner:f.provisioner,transport:f.transport});assert.equal((await restarted.initialize()).code,'CLOUDFLARE_READY');assert.equal(f.calls.filter(x=>x?.probe).length,writes);assert.equal(rows(f).length,1);
});
test('a concurrent user destination edit stops setup instead of overwriting choices',async()=>{
 const f=fixture({buckets:['redown','photos']});await approve(f);f.provisioner.prepare=async()=>{await configure(f,[{type:'createDestination',mode:'simple',target:t,label:'User choice'},{type:'makeDefault',target:t}]);};await assert.rejects(f.c.initialize(),{code:'DESTINATIONS_CHANGED_DURING_SETUP'});assert.deepEqual(f.state.product.defaultTarget,t);assert.equal(rows(f).length,1);assert.equal(rows(f)[0].label,'User choice');
});
test('login API initializes only with separately authorized provisioning scope and returns actual native ACK',async()=>{
 const f=fixture();await approve(f);let reconciled=0;const api=createEngineApi({current:f.current,oauth:{...f.oauth,connect:()=>f.oauth.status()},cloudflare:f.c,engine:{compile:async()=>({}),apply:async()=>{reconciled++;return {state:'completed'};}},getInventory:async()=>({scopes:[]}),authorize:async r=>r.actor==='gui'||r.method!=='initializeCloudflare',confirm:async()=>true});
 const denied=await api.invoke({version:'3+1.1',method:'loginBegin',params:{}},'auth-only-agent');assert.equal(denied.data.initialization.code,'SETUP_AUTHORITY_REQUIRED');assert.equal(rows(f).length,0);
 const login=await api.invoke({version:'3+1.1',method:'loginBegin',params:{}},'gui');assert.equal(login.data.initialization.code,'CLOUDFLARE_READY');assert.equal(login.data.initialization.native.state,'completed');assert(reconciled);
});
test('verified provider setup with a failed native ACK is partial, never READY',async()=>{
 const f=fixture();await approve(f);const api=createEngineApi({current:f.current,oauth:{...f.oauth,connect:()=>f.oauth.status()},cloudflare:f.c,engine:{compile:async()=>({}),apply:async()=>({state:'blocked',code:'CHROME_UNAVAILABLE'}),getEvidence:()=>({pending:true,acknowledgedGeneration:null,desired:{generation:1}})},getInventory:async()=>({scopes:[]}),authorize:async()=>true,confirm:async()=>true});
 const login=await api.invoke({version:'3+1.1',method:'loginBegin',params:{}},'gui');assert.equal(login.data.initialization.state,'partial');assert.equal(login.data.initialization.code,'NATIVE_APPLY_INCOMPLETE');
 const inspected=await api.invoke({version:'3+1.1',method:'inspectCloudflare',params:{}},'gui');assert.equal(inspected.data.status.code,'NATIVE_APPLY_INCOMPLETE');
});
test('a bucket create whose reply is lost is discovered after restart without a duplicate POST',async()=>{
 const f=fixture({buckets:[]});await approve(f);const original=f.oauth.request;let lost=true;f.oauth.request=async(path,options)=>{const response=await original(path,options);if(options?.method==='POST'&&lost){lost=false;throw Error('connection lost after create');}return response;};assert.equal((await f.c.initialize()).code,'CLOUDFLARE_READY');assert.equal(f.calls.filter(x=>x==='POST').length,1);assert.equal(rows(f).length,1);
});
test('two live owners serialize initialization and recover an interrupted bucket-confirmed stage',async()=>{
 const f=fixture({buckets:[]});await approve(f);const prepare=f.provisioner.prepare;let failed=false;f.provisioner.prepare=async target=>{if(!failed){failed=true;throw Object.assign(Error(),{code:'TRANSIENT_API_FAILURE'});}return prepare(target);};await assert.rejects(f.c.initialize(),{code:'TRANSIENT_API_FAILURE'});
 const restarted=createCloudflareOnboarding({current:f.current,oauth:f.oauth,provisioner:f.provisioner,transport:f.transport});const results=await Promise.all([f.c.initialize(),restarted.initialize()]);for(const r of results)assert.equal(r.code,'CLOUDFLARE_READY');assert.equal(f.calls.filter(x=>x==='POST').length,1);assert.equal(f.calls.filter(x=>x?.probe).length,1);assert.equal(rows(f).length,1);
});
test('an approval for another account or forged transferable config cannot grant provisioning',async()=>{
 const f=fixture();await f.current.writeSetupOperation('approval:a',{accountId:'b',approved:true});assert.equal((await f.c.initialize()).code,'SETUP_APPROVAL_REQUIRED');assert(!f.calls.some(x=>x==='POST'||x?.prepare));
 assert.throws(()=>productState({cloudflare:{initialized:[],pending:[],removed:[],selectedAccountId:'a',setupApproved:['a']}}),{code:'INVALID_STATE'});
});
test('explicit setup completion loss is resumed by next login using the same probe',async()=>{
 const f=fixture();const mark=f.provisioner.markVerified;f.provisioner.markVerified=async()=>{throw Error('completion lost');};const first=await f.c.setup({accountId:'a',expectedRevision:0,idempotencyKey:'explicit'});assert.equal(first.code,'SETUP_COMPLETION_PENDING');const count=f.calls.filter(x=>x?.probe).length;
 const duplicate=await f.c.setup({accountId:'a',expectedRevision:f.state.product.revision,idempotencyKey:'new-key'});assert.equal(duplicate.code,'SETUP_IN_PROGRESS');f.provisioner.markVerified=mark;f.transport.probeStatus=async(_t,id)=>({state:'verified',operationId:id,receipt:{key:'readiness'}});assert.equal((await f.c.initialize()).code,'CLOUDFLARE_READY');assert.equal(f.calls.filter(x=>x?.probe).length,count);assert.equal(rows(f).length,1);
});
