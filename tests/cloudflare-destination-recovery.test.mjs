import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudflareOnboarding} from '../src/cloudflare/onboarding.mjs';
import {productState} from '../src/api/config.mjs';
import {digest} from '../src/cloudflare/wire.mjs';

const a={provider:'cloudflare',connectionId:'cloudflare:a',accountId:'a',bucketName:'narrow-a',prefix:'kept/'};
const b={...a,bucketName:'depth-b',prefix:'scope/'};
const child={...b,prefix:'scope/intermediate/leaf/'};
function fixture({approved=true,scope=b}={}){
 const s={product:productState({defaultTarget:a,cloudflare:{initialized:['a'],pending:[],selectedAccountId:'a'}}),configs:{simple:{destinations:[]},nested:{destinations:[{id:'narrow',target:a}]},depth:{scopes:[{target:scope,maxDepth:20}]}}};
 const records=new Map(approved?[['approval:a',{accountId:'a',approved:true}]]:[]),calls=[],plans=new Map();let requested=child,ready=false,postProbeReady=true;
 const authority={sessionId:'session',accounts:[{id:'a'},{id:'b'}],scopes:['workers-r2.read','workers-r2.write','workers-scripts.admin'],scopeEvidence:'provider-returned'};
 const oauth={authority:async()=>authority,status:async()=>({state:'CONNECTED',accounts:authority.accounts}),request:async()=>Response.json({success:true,result:{buckets:[{name:'depth-b'},{name:'narrow-a'}]}})};
 const current={read:async()=>structuredClone(s),readSetupOperation:async k=>structuredClone(records.get(k)),writeSetupOperation:async(k,v)=>records.set(k,structuredClone(v)),commitProduct:async()=>assert.fail('Recovery cannot mutate saved configuration')};
 const provisioner={lookup:async()=>plans.get('b'),prepare:async(target,options)=>{calls.push({kind:'prepare',target,options});plans.set('b',{state:'ready',prefixScope:options.prefixScope});},markVerified:async target=>{calls.push({kind:'mark',target});ready=postProbeReady;}};
 const transport={status:async target=>{calls.push({kind:'status',target});return {state:ready?'READY':plans.has('b')?'PREPARED':'blocked',code:ready||plans.has('b')?undefined:'WORKER_SETUP_REQUIRED'};},probe:async x=>{calls.push({kind:'probe',target:x.target,operationId:x.operationId});assert(await x.authorize());return {state:'verified',receipt:{key:x.target.prefix+'proof'},operationId:x.operationId};},probeStatus:async(target,operationId)=>{calls.push({kind:'probe-status',target,operationId});return {state:'verified',receipt:{key:target.prefix+'proof'},operationId};}};
 const c=createCloudflareOnboarding({current,oauth,provisioner,transport,readRequestedTarget:async()=>requested});
 return {s,records,calls,current,oauth,provisioner,transport,c,set ready(value){ready=value;},set postProbeReady(value){postProbeReady=value;},set requested(value){requested=value;}};
}
test('approved recovery binds missing Depth B child to configured B scope and preserves Narrow A/default',async()=>{
 const f=fixture(),before=structuredClone(f.s),out=await f.c.recoverDestination({target:child});
 assert.equal(out.code,'CLOUDFLARE_READY');assert.deepEqual(out.target,child);assert.equal(out.readiness.state,'READY');assert.deepEqual(f.s,before);
 assert.equal(f.calls.filter(x=>x.kind==='prepare').length,1);assert.equal(f.calls.find(x=>x.kind==='prepare').options.prefixScope,'scope');
 assert.deepEqual(f.calls.find(x=>x.kind==='probe').target,child);assert(f.records.has('destination-recovery:'+await digest(['a','depth-b'])));
 const beforeCount=f.calls.length;assert.equal((await f.c.recoverDestination({target:child})).reused,true);assert(f.calls.slice(beforeCount).every(x=>x.kind==='status'));
});
test('no approval requests one exact bucket approval; explicit authorization preserves unrelated account approval',async()=>{
 const f=fixture({approved:false});assert.equal((await f.c.recoverDestination({target:child})).code,'SETUP_APPROVAL_REQUIRED');assert(!f.calls.some(x=>x.kind==='prepare'));
 assert.equal((await f.c.recoverDestination({target:child,authorizeSetup:true})).state,'completed');assert(!f.records.has('approval:a'));
 assert.deepEqual(f.records.get('approval:destination:'+await digest(['a','depth-b'])),{accountId:'a',bucketName:'depth-b',approved:true});
});
test('exact configured second account recovers independently of the Default account',async()=>{
 const target={...child,connectionId:'cloudflare:b',accountId:'b'},f=fixture({scope:{...b,connectionId:'cloudflare:b',accountId:'b'}});
 f.records.set('approval:b',{accountId:'b',approved:true});assert.equal((await f.c.recoverDestination({target})).state,'completed');assert.deepEqual(f.s.product.defaultTarget,a);
});
test('unconfigured roots, sibling prefixes, stale revisions and missing live grants never provision',async()=>{
 for(const target of [{...b,prefix:''},{...b,prefix:'scope-escape/'}]){const f=fixture();assert.equal((await f.c.recoverDestination({target})).code,'TARGET_NOT_CONFIGURED');assert(!f.calls.some(x=>x.kind==='prepare'));}
 const f=fixture();assert.equal((await f.c.recoverDestination({target:child,expectedRevision:999})).code,'REVISION_CONFLICT');
 f.oauth.authority=async()=>({sessionId:'session',accounts:[{id:'a'}],scopes:['workers-r2.read']});assert.equal((await f.c.recoverDestination({target:child})).code,'INSUFFICIENT_SCOPE');assert(!f.calls.some(x=>x.kind==='prepare'));
});
test('post-probe READY is mandatory and lost completion resumes by probe identity without writes',async()=>{
 const f=fixture(),mark=f.provisioner.markVerified;let first=true;f.provisioner.markVerified=async target=>{if(first){first=false;throw Error('completion lost');}return mark(target);};
 const initial=await f.c.recoverDestination({target:child});assert.equal(initial.code,'SETUP_COMPLETION_PENDING');
 const count=f.calls.filter(x=>['prepare','probe'].includes(x.kind)).length;
 assert.equal((await f.c.recoverDestination({target:child})).code,'CLOUDFLARE_READY');assert.equal(f.calls.filter(x=>['prepare','probe'].includes(x.kind)).length,count);
 assert.equal(f.calls.find(x=>x.kind==='probe-status').operationId,initial.operationId);
 const unready=fixture();unready.postProbeReady=false;assert.equal((await unready.c.recoverDestination({target:child})).code,'WORKER_NOT_READY');
});
test('an uncertain readiness write is inspected on retry and never automatically replayed',async()=>{
 const f=fixture();f.transport.probe=async x=>{f.calls.push({kind:'probe',operationId:x.operationId});return {state:'uncertain',code:'READINESS_RECONCILE_REQUIRED',operationId:x.operationId};};
 f.transport.probeStatus=async(target,operationId)=>{f.calls.push({kind:'probe-status',target,operationId});return {state:'uncertain',code:'PROBE_UNKNOWN'};};
 assert.equal((await f.c.recoverDestination({target:child})).state,'uncertain');const writes=f.calls.filter(x=>['prepare','probe'].includes(x.kind)).length;
 assert.equal((await f.c.recoverDestination({target:child})).code,'SETUP_PROBE_REQUIRES_INSPECTION');assert.equal(f.calls.filter(x=>['prepare','probe'].includes(x.kind)).length,writes);assert(!f.calls.some(x=>x.kind==='mark'));
});
test('legacy exact-bucket initialization probe is resumed read-only without borrowing Narrow A setup',async()=>{
 const f=fixture();f.records.set('initialization:a',{idempotencyKey:'legacy-b'});f.records.set('a:legacy-b',{accountId:'a',target:child,stage:'probe-dispatched',operationId:'legacy-b-probe'});
 assert.equal((await f.c.recoverDestination({target:child})).code,'CLOUDFLARE_READY');assert(!f.calls.some(x=>['prepare','probe'].includes(x.kind)));assert.equal(f.calls.find(x=>x.kind==='probe-status').operationId,'legacy-b-probe');
 const unrelated=fixture();unrelated.records.set('initialization:a',{idempotencyKey:'legacy-a'});unrelated.records.set('a:legacy-a',{accountId:'a',target:a,stage:'probe-dispatched',operationId:'legacy-a-probe'});
 assert.equal((await unrelated.c.recoverDestination({target:child})).code,'CLOUDFLARE_READY');assert(!unrelated.calls.some(x=>x.kind==='probe-status'));assert(unrelated.calls.some(x=>x.kind==='prepare'&&x.target.bucketName==='depth-b'));
 const otherPrefix=fixture();otherPrefix.records.set('initialization:a',{idempotencyKey:'legacy-b'});otherPrefix.records.set('a:legacy-b',{accountId:'a',target:b,stage:'probe-dispatched',operationId:'legacy-root-probe'});
 const resumed=await otherPrefix.c.recoverDestination({target:child});assert.equal(resumed.code,'CLOUDFLARE_READY');assert.deepEqual(resumed.target,child);assert.deepEqual(resumed.probeTarget,b);assert(!otherPrefix.calls.some(x=>['prepare','probe'].includes(x.kind)));assert.deepEqual(otherPrefix.calls.find(x=>x.kind==='probe-status').target,b);assert.deepEqual(otherPrefix.calls.find(x=>x.kind==='mark').target,b);
});
test('per-bucket pending probe at another prefix reconciles original proof and rechecks clicked target without writes',async()=>{
 for(const legacy of [false,true]){
  const f=fixture(),key=legacy?'initialization:a':'destination-recovery:'+await digest(['a','depth-b']);f.records.set(key,{idempotencyKey:'root-pending'});f.records.set('a:root-pending',{accountId:'a',target:b,scopeTarget:b,stage:'probe-dispatched',operationId:'root-probe'});
  f.transport.probeStatus=async(target,operationId)=>{f.calls.push({kind:'probe-status',target,operationId});return {state:'uncertain',code:'PROBE_UNKNOWN'};};
  const out=await f.c.recoverDestination({target:child});assert.equal(out.code,'SETUP_PROBE_REQUIRES_INSPECTION');assert.deepEqual(out.target,child);assert.deepEqual(out.probeTarget,b);assert(!f.calls.some(x=>['prepare','probe','mark'].includes(x.kind)));
 }
 const revoked=fixture();revoked.records.set('destination-recovery:'+await digest(['a','depth-b']),{idempotencyKey:'root-pending'});revoked.records.set('a:root-pending',{accountId:'a',target:b,scopeTarget:b,stage:'probe-dispatched',operationId:'root-probe'});
 revoked.transport.probeStatus=async()=>{revoked.s.configs.depth.scopes=[];return {state:'verified',receipt:{key:'proof'}};};const out=await revoked.c.recoverDestination({target:child});assert.equal(out.code,'SETUP_COMPLETION_PENDING');assert.equal(out.cause,'DESTINATIONS_CHANGED_DURING_SETUP');assert(!revoked.calls.some(x=>['prepare','probe','mark'].includes(x.kind)));
});
test('explicit approval resumes the stable pending operation despite a fresh caller idempotency key',async()=>{
 const f=fixture();f.records.set('destination-recovery:'+await digest(['a','depth-b']),{idempotencyKey:'stable-pending'});f.records.set('a:stable-pending',{accountId:'a',target:child,scopeTarget:b,stage:'worker-preparation-blocked'});
 const out=await f.c.recoverDestination({target:child,authorizeSetup:true,idempotencyKey:'new-ui-request'});assert.equal(out.code,'CLOUDFLARE_READY');assert(!f.records.has('a:new-ui-request'));assert.equal(f.records.get('a:stable-pending').stage,'complete');assert.equal(f.calls.filter(x=>x.kind==='prepare').length,1);
});
test('same-bucket pre-probe sibling setup resumes its original bound target and then checks clicked capability',async()=>{
 for(const legacy of [false,true]){
  const f=fixture(),pointer=legacy?'initialization:a':'destination-recovery:'+await digest(['a','depth-b']);f.records.set(pointer,{idempotencyKey:'stable-root'});f.records.set('a:stable-root',{accountId:'a',target:b,scopeTarget:b,stage:'worker-prepared'});
  const out=await f.c.recoverDestination({target:child,authorizeSetup:true,idempotencyKey:'new-ui-request'});assert.equal(out.code,'CLOUDFLARE_READY');assert.deepEqual(out.target,child);assert.deepEqual(out.probeTarget,b);assert.deepEqual(f.calls.find(x=>x.kind==='probe').target,b);assert.equal(f.calls.filter(x=>x.kind==='prepare').length,1);assert.equal(f.records.get('a:stable-root').stage,'complete');
 }
});
test('configuration removal during preparation stops before readiness write',async()=>{
 const f=fixture(),prepare=f.provisioner.prepare;f.provisioner.prepare=async(...args)=>{await prepare(...args);f.s.configs.depth.scopes=[];};
 assert.equal((await f.c.recoverDestination({target:child})).code,'DESTINATIONS_CHANGED_DURING_SETUP');assert(!f.calls.some(x=>x.kind==='probe'));
});
test('removing broader Depth authority cannot fall through to a narrower same-target other mode during setup',async()=>{
 const f=fixture({scope:{...b,prefix:''}});f.s.configs.simple.destinations.push({id:'same-child',target:child});const prepare=f.provisioner.prepare;
 f.provisioner.prepare=async(...args)=>{await prepare(...args);f.s.configs.depth.scopes=[];};
 assert.equal((await f.c.recoverDestination({target:child})).code,'DESTINATIONS_CHANGED_DURING_SETUP');assert(!f.calls.some(x=>['probe','mark'].includes(x.kind)));
});
test('restricted Worker scope and stale code require the appropriate explicit next action',async()=>{
 for(const code of ['WORKER_DESTINATION_SCOPE_REQUIRED','WORKER_UPGRADE_APPROVAL_REQUIRED','WORKER_BUILD_MISMATCH','CAPABILITY_DENIED','WORKER_SIGNING_RENEWAL_APPROVAL_REQUIRED']){
  const f=fixture();f.transport.status=async()=>({state:'blocked',code});const out=await f.c.recoverDestination({target:child});assert.equal(out.code,code);assert(!f.calls.some(x=>x.kind==='prepare'));
 }
});
test('explicit approved signing repair and broader saved Depth scope use correct shared Worker options',async()=>{
 const f=fixture({scope:{...b,prefix:''}});f.s.configs.nested.destinations.push({id:'child',target:child});const status=f.transport.status;let first=true;
 f.transport.status=async target=>{if(first){first=false;return {state:'blocked',code:'CAPABILITY_DENIED'};}return status(target);};
 assert.equal((await f.c.recoverDestination({target:child,authorizeSetup:true})).state,'completed');const options=f.calls.find(x=>x.kind==='prepare').options;assert.equal(options.renewSigning,true);assert.equal(options.prefixScope,'');
});
test('attention inspection preserves exact Depth descendant and invalid target never falls back to Default',async()=>{
 const f=fixture(),status=await f.c.inspect();assert.deepEqual(status.status.target,child);
 f.requested={...b,prefix:'outside/'};const invalid=await f.c.inspect();assert.equal(invalid.status.code,'TARGET_NOT_CONFIGURED');assert.equal(invalid.status.target.prefix,'outside/');
});
