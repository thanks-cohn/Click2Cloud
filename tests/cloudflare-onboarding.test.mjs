import test from 'node:test';import assert from 'node:assert/strict';
import {createCloudflareOnboarding} from '../src/cloudflare/onboarding.mjs';
import {productState} from '../src/api/config.mjs';
import {createEngineApi,toolRegistry} from '../src/api/service.mjs';
import {createPermissions} from '../src/api/permissions.mjs';
const t={provider:'cloudflare',connectionId:'cloudflare:a',accountId:'a',bucketName:'photos',prefix:'selected/'};
function fixture({chosen=null,initialized=false,buckets=['redown','photos'],connected=true,failure=null}={}){
 let s={product:productState({defaultTarget:chosen,cloudflare:{initialized:initialized?['a']:[],pending:[],selectedAccountId:'a'}}),configs:{simple:{destinations:[]},nested:{destinations:[]},depth:{scopes:[]}}};const calls=[],reserved=new Set(),setupRecords=new Map();let ready=false;
 const current={readSetupOperation:async id=>setupRecords.get(id),writeSetupOperation:async(id,value)=>setupRecords.set(id,structuredClone(value)),read:async()=>structuredClone(s),commitProduct:async n=>{assert.equal(n.expectedRevision,s.product.revision);s={configs:n.configs,product:{...n.product,revision:s.product.revision+1}};},reserveOperation:async id=>{if(reserved.has(id))return false;reserved.add(id);return true;}};
 const oauth={status:async()=>({state:connected?'CONNECTED':'DISCONNECTED',accounts:connected?[{id:'a',name:'A'}]:[]}),authority:async()=>{if(!connected)throw Object.assign(Error(),{code:'AUTH_REQUIRED'});return {sessionId:'s',accounts:[{id:'a'}]};},connect:async()=>{connected=true;calls.push('login');},request:async(_path,o={})=>{calls.push(o.method??'GET');if(o.method==='POST'){buckets.push('redown');return Response.json({success:true});}return failure?Response.json({success:false,errors:[{message:failure}]},{status:failure==='permission'?403:400}):Response.json({success:true,result:{buckets:buckets.map(name=>({name}))}});}};
 const transport={probe:async i=>{calls.push({target:i.target,probe:true});assert(await i.authorize());return {state:'verified',operationId:i.operationId,receipt:{key:i.target.prefix+'.click2cloud-readiness/readiness.txt'}};},status:async()=>({state:ready?'READY':'PREPARED'}),save:async i=>{calls.push({target:i.target,source:i.source});assert(await i.authorize());return {state:'verified',operationId:'verified',receipt:{key:i.target.prefix+i.source.filename}};}};
 const provisioner={prepare:async target=>{calls.push({prepare:target});},markVerified:async()=>{ready=true;}};const c=createCloudflareOnboarding({current,oauth,transport,provisioner,openShelf:async(provider)=>{calls.push(provider==='manage-destinations'?'manage':'shelf');},openActivation:async()=>{calls.push('activation');}});
 return {c,current,oauth,transport,provisioner,calls,get state(){return s;}};
}
test('approved first setup creates redown only when missing; default is established only after verified probe',async()=>{const f=fixture({buckets:[]});const r=await f.c.setup({accountId:'a',expectedRevision:0,idempotencyKey:'once'});assert.equal(r.code,'CLOUDFLARE_READY');assert.equal(f.calls.filter(x=>x==='POST').length,1);assert.equal(f.state.product.defaultTarget.bucketName,'redown');assert.deepEqual(f.state.product.cloudflare.initialized,['a']);});
test('returning custom default always wins, and no missing selected bucket is recreated',async()=>{const f=fixture({chosen:t,initialized:true,buckets:['photos']});await f.c.setup({accountId:'a',expectedRevision:0,idempotencyKey:'custom',repair:true});assert.deepEqual(f.state.product.defaultTarget,t);assert(!f.calls.includes('POST'));const missing=fixture({chosen:t,initialized:true,buckets:['redown']});assert.equal((await missing.c.setup({accountId:'a',expectedRevision:0,idempotencyKey:'missing',repair:true})).code,'DESTINATION_UNAVAILABLE');assert(!missing.calls.includes('POST'));});
test('intentional removal, missing permission, outage and positive inactive status stay distinct',async()=>{const removed=fixture({initialized:true});assert.equal((await removed.c.check('a')).state,'CHOOSE_DESTINATION');assert.equal((await removed.c.setup({accountId:'a',expectedRevision:0,idempotencyKey:'removed'})).code,'CHOOSE_DESTINATION');const denied=fixture({failure:'permission'});assert.equal((await denied.c.check('a')).state,'UNKNOWN');assert.equal((await denied.c.activation('a')).code,'R2_MANUAL_ACTION_REQUIRED');assert(!denied.calls.includes('activation'));const inactive=fixture({failure:'R2 is not enabled'});assert.equal((await inactive.c.check('a')).state,'NOT_ACTIVATED');await inactive.c.activation('a');assert(!inactive.calls.includes('activation'));assert(!inactive.calls.includes('POST'));});
test('connected returning account with no assigned destinations opens Manage Destinations and never recreates redown',async()=>{
 const f=fixture({initialized:true,buckets:[]});
 const result=await f.c.invoke({provider:'cloudflare',source:{url:'https://source.org/file',filename:'file'}});
 assert.equal(result.code,'CHOOSE_DESTINATION');
 assert.equal(f.calls.filter(c=>c==='manage').length,1);
 assert.equal(f.calls.includes('POST'),false);
 assert.equal(f.calls.some(c=>c?.source),false);
});

test('login and unavailable providers never replay pending sources or claim success',async()=>{const f=fixture({connected:false});const r=await f.c.invoke({provider:'cloudflare',source:{url:'https://source.org/private',filename:'file'}});assert.equal(r.code,'LOGIN_REQUIRED');assert(!f.calls.includes('login'));assert(!f.calls.some(x=>x?.source));assert.equal((await f.c.invoke({provider:'dropbox'})).code,'PROVIDER_NOT_IMPLEMENTED');});
test('readiness never silently falls back after setup and custom selection is preserved during reconnect',async()=>{const f=fixture({chosen:t,initialized:true});assert.equal((await f.c.invoke({provider:'cloudflare',source:{url:'https://source.org/file',filename:'file'}})).code,'REPAIR_REQUIRED');assert.deepEqual(f.state.product.defaultTarget,t);assert(!f.calls.some(x=>x?.source));});
test('new API operations have closed schemas, account grants and separate provisioning confirmation',async()=>{
 const f=fixture(),permissions=createPermissions();const api=createEngineApi({current:f.current,engine:{},authorize:r=>permissions.authorize(r),confirm:r=>permissions.confirm(r),cloudflare:f.c});
 permissions.issue({actor:'test',methods:['approveCloudflareSetup','checkCloudflareR2'],accounts:['a'],expiresAt:Date.now()+10000});
 const call=(method,params)=>api.invoke({version:'3+1.1',method,params},'test');
 assert.equal((await call('checkCloudflareR2',{accountId:'b'})).code,'PERMISSION_DENIED');assert.equal((await call('checkCloudflareR2',{accountId:'a',token:'secret'})).code,'INVALID_REQUEST');
 assert.equal((await call('approveCloudflareSetup',{accountId:'a',expectedRevision:0,idempotencyKey:'x'})).code,'CONFIRMATION_REQUIRED');assert.equal(f.calls.length,0);
 for(const method of ['inspectCloudflare','checkCloudflareR2','selectCloudflareAccount','openCloudflareActivation','approveCloudflareSetup','repairCloudflareDestination','invokeProviderAction','inspectRemoteHistory','inspectRemoteReceipt'])assert(toolRegistry.some(t=>t.name===method));
});


test('OAuth API remains human-interactive: trusted host must issue an auth grant and approve the exact operation',()=>{const p=createPermissions();const grant={actor:'agent',methods:['loginBegin'],accounts:['a'],expiresAt:Date.now()+10000};p.issue(grant);assert.equal(p.authorize({actor:'agent',method:'loginBegin',params:{}}),false);p.issue({...grant,interactiveAuth:true});assert.equal(p.confirm({actor:'agent',method:'loginBegin',params:{}}),false);p.approve('agent','loginBegin',{});assert.equal(p.confirm({actor:'agent',method:'loginBegin',params:{}}),true);assert.equal(p.confirm({actor:'agent',method:'loginBegin',params:{}}),false);});


test('repair of a configured non-default destination never changes the global default',async()=>{const f=fixture({chosen:t,initialized:true,buckets:['photos','archive']});const other={...t,bucketName:'archive',prefix:'kept/'};f.state.configs.simple.destinations.push({id:'other',target:other});const r=await f.c.setup({accountId:'a',target:other,repair:true,expectedRevision:0,idempotencyKey:'repair-extra'});assert.equal(r.state,'completed');assert.deepEqual(f.state.product.defaultTarget,t);assert(f.calls.some(x=>x?.prepare?.bucketName==='archive'));assert(!f.calls.includes('POST'));});


test('one verified account needs no extra account-selection step; multiple accounts remain explicit',async()=>{const f=fixture();f.state.product.cloudflare.selectedAccountId=null;assert.equal((await f.c.check()).state,'SETUP_APPROVAL_REQUIRED');f.oauth.authority=async()=>({sessionId:'s',accounts:[{id:'a'},{id:'b'}]});f.oauth.status=async()=>({state:'CONNECTED',accounts:[{id:'a'},{id:'b'}]});assert.equal((await f.c.check()).state,'ACCOUNT_AMBIGUOUS');assert(!f.calls.includes('POST'));});


test('setup completion loss resumes by read-only probe identity without redeploy or duplicate readiness write',async()=>{
 const f=fixture({buckets:['redown']});const mark=f.provisioner.markVerified;f.provisioner.markVerified=async()=>{throw Error('synthetic local completion loss');};
 const first=await f.c.setup({accountId:'a',expectedRevision:0,idempotencyKey:'resume'});assert.equal(first.code,'SETUP_COMPLETION_PENDING');
 const counts=()=>({prepare:f.calls.filter(x=>x?.prepare).length,probe:f.calls.filter(x=>x?.probe).length,post:f.calls.filter(x=>x==='POST').length});const before=counts();
 f.provisioner.markVerified=mark;let reads=0;f.transport.probeStatus=async(target,id)=>{reads++;assert.equal(id,first.operationId);return {state:'verified',operationId:id,receipt:{key:'.click2cloud-readiness/'+id+'/readiness.txt'}};};
 const result=await f.c.setup({accountId:'a',expectedRevision:f.state.product.revision,idempotencyKey:'resume'});assert.equal(result.code,'CLOUDFLARE_READY');assert.equal(reads,1);assert.deepEqual(counts(),before);
 const replay=await f.c.setup({accountId:'a',expectedRevision:0,idempotencyKey:'resume'});assert.deepEqual(replay,result);assert.deepEqual(counts(),before);
});

test('zero active native assignments open manager even when a hidden default remains ready',async()=>{const f=fixture({chosen:t,initialized:true});const result=await f.c.invoke({provider:'cloudflare',emptyAssignment:true,source:{url:'https://public.org/file',filename:'file'}});assert.equal(result.code,'CHOOSE_DESTINATION');assert(!f.calls.some(x=>x?.source||x==='POST'));assert(f.calls.includes('manage'));});
