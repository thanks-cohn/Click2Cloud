import test from 'node:test';import assert from 'node:assert/strict';
import {createDepthNativeClick,workerPlanReason} from '../src/modes/depth/native-click.mjs';
import {createChromeRegistrar} from '../src/chrome/registrar.mjs';import {createEngine} from '../src/core/engine.mjs';
import {productState} from '../src/api/config.mjs';import {targetKey} from '../src/core/menu-identity.mjs';import {PROTOCOL} from '../src/cloudflare/wire.mjs';
const target={provider:'cloudflare',connectionId:'cloudflare:fixture',accountId:'fixture',bucketName:'bucket',prefix:''};
const plan={state:'ready',accountId:'fixture',bucketName:'bucket',protocol:PROTOCOL};
function fixture({ready=true,fail=null,mode='depth',folders=['Images/','Images/Artwork/'],limit=20,controller=true}={}){
 const records=[],feedback=[],writes=[];let listener,registrar,engine,done;
 const current={read:async()=>state,setDesiredGeneration:async g=>state.generation.desired=g,acknowledgeGeneration:async g=>state.generation.applied=g,recordRemoteResult:async r=>records.push(structuredClone(r))};
 const state={product:productState({show:{simple:mode==='simple',nested:false,depth:mode==='depth',flat:false}}),configs:{depth:{scopes:[{target,maxDepth:limit}]},simple:{destinations:[{target}]}},generation:{desired:0,applied:null}};
 const chrome={runtime:{},contextMenus:{onClicked:{addListener:f=>listener=f,removeListener(){}},removeAll:cb=>{if(fail==='remove')chrome.runtime.lastError={message:'fixture'};cb();delete chrome.runtime.lastError;},create:(p,cb)=>{setTimeout(()=>{if(fail==='timeout')return;if(fail===p.title)chrome.runtime.lastError={message:'fixture'};cb();delete chrome.runtime.lastError;},0);}}};
 const authorized=async t=>({sessionId:'fixture',authorizedTargets:[t]});
 const depthClick=createDepthNativeClick({current,inspect:()=>registrar.inspect(),authorize:authorized,feedback:async r=>{feedback.push(r);done?.();}});
 registrar=createChromeRegistrar({chrome,timeoutMs:20,...(controller?{depthClick}:{}),dispatchOwnsAuthorization:true,
  dispatch:(_row,{info,generation,depthAuthorization})=>engine.save({depthAuthorization,itemId:info.menuItemId,generation,
   context:'link',source:{url:'https://example.org/file',filename:'probe.txt'}})});
 engine=createEngine({current,registrar,providerSetupActions:true,getAuthorization:authorized,
  remoteSave:async input=>{
   assert(await input.authorize());
   if(ready!==true)return {state:'blocked',code:ready.code??'WRITE_PROOF_REQUIRED'};
   writes.push(input.target);
   return {state:'verified',operationId:'fixture-remote',receipt:{key:input.target.prefix+'probe.txt'}};
  }});
 return {records,feedback,writes,state,registrar,engine,async start(){const spec=await engine.compile({mode:'composite',inventory:{scopes:[{target,folders,authorized:true,workerReady:false,complete:true}]}});await engine.apply(spec);return spec;},async emit(row){const finished=new Promise(r=>done=r);listener({menuItemId:row.id,linkUrl:'https://example.org/file'},{});await finished;}};
}
test('Depth emitted click reaches the common dispatcher through unverified readiness and saves exact root/intermediate/leaf',async()=>{
 const f=fixture(),spec=await f.start();
 for(const row of spec.rows.filter(r=>r.role==='save'))await f.emit(row);
 assert.deepEqual(f.writes.map(t=>t.prefix).sort(),['','Images/','Images/Artwork/'].sort());
 assert.equal(f.feedback.length,3);assert(f.feedback.every(r=>r.state==='completed'));
 assert.equal(f.records.length,3);assert(f.records.every(r=>r.kind==='depth-click'&&!r.receipt));assert(f.records.every(r=>!JSON.stringify(r).includes('example.org')));
});
test('canonical Depth route dispatches once without the Depth observer',async()=>{
 const f=fixture({controller:false}),spec=await f.start(),row=spec.rows.find(r=>r.role==='save');
 assert.equal((await f.registrar.handleClick({menuItemId:row.id,linkUrl:'https://example.org/file'})).completion,'verified');assert.equal(f.writes.length,1);
});
for(const readiness of [{state:'blocked',code:'WORKER_SETUP_REQUIRED'},{state:'PREPARED'},{state:'blocked',code:'TRANSPORT_UNAVAILABLE'},{state:'blocked',code:'WORKER_DESTINATION_SCOPE_REQUIRED'}])test('Depth blocked status is recorded and visible: '+(readiness.code??readiness.state),async()=>{
 const f=fixture({ready:readiness}),spec=await f.start();await f.emit(spec.rows.find(r=>r.role==='save'));
 assert.equal(f.writes.length,0);assert.equal(f.records.at(-1).state,'blocked');assert.equal(f.feedback.length,1);assert.equal(f.feedback[0].code,readiness.code??'WRITE_PROOF_REQUIRED');
});
for(const failure of ['Cloudflare','Images','Artwork','timeout'])test('Depth native ACK failure retains fail-closed authority and durable feedback: '+failure,async()=>{
 const f=fixture({fail:failure}),spec=await f.start();await f.emit(spec.rows.find(r=>r.role==='save'));assert.equal(f.writes.length,0);assert.equal(f.records.at(-1).state,'blocked');assert.equal(f.feedback.length,1);assert.equal(f.registrar.inspect().acknowledgedGeneration,null);
});
test('Worker plan discriminators are mode-local and cannot borrow accounts/buckets',()=>{
 assert.equal(workerPlanReason(null,target),'PLAN_MISSING');
 for(const [patch,expected] of [[{state:'pending'},'PLAN_NOT_READY'],[{accountId:'foreign'},'PLAN_ACCOUNT_MISMATCH'],[{bucketName:'foreign'},'PLAN_BUCKET_MISMATCH'],[{protocol:'old'},'PLAN_PROTOCOL_MISMATCH']])assert.equal(workerPlanReason({...plan,...patch},target),expected);
 assert.equal(workerPlanReason(plan,{...target,prefix:'new/'}),'PLAN_MATCHES');
});
test('Depth keeps twenty siblings and depth beyond ten; no row cap or changed menu plan',async()=>{
 const folders=[...Array.from({length:20},(_,i)=>'sibling-'+i+'/'),Array.from({length:14},(_,i)=>'level'+i).join('/')+'/'];
 const f=fixture({folders,limit:30}),spec=await f.start();assert.equal(spec.rows.filter(r=>r.target?.prefix.startsWith('sibling-')).length,20);assert(spec.rows.some(r=>r.target?.prefix===folders.at(-1)));const row=spec.rows.find(r=>r.target?.prefix===folders.at(-1));await f.emit(row);assert.equal(targetKey(f.writes[0]),targetKey(row.target));
});
test('non-Depth rows do not enter Depth preflight, history or feedback',async()=>{
 const f=fixture({mode:'simple'}),spec=await f.start();await f.registrar.handleClick({menuItemId:spec.rows.find(r=>r.role==='save').id,linkUrl:'https://example.org/file'});assert.equal(f.records.length,0);assert.equal(f.feedback.length,0);
});
test('Depth preserves shared authorization and publication outcomes when optional observation fails',async()=>{
 for(const kind of ['denied','throw','uncertain','partial','storage']){
  const records=[];let runs=0,finished;
  const feedback=new Promise(resolve=>finished=resolve);
  const click=createDepthNativeClick({current:{recordRemoteResult:async record=>{
   if(kind==='storage')throw Object.assign(Error(),{code:'STORAGE_UNAVAILABLE'});
   records.push(record);
  }},inspect:()=>({desired:{generation:1},acknowledgedGeneration:1}),feedback:finished});
  const out=await click({id:'fixture-row',role:'save',target},{},{},async()=>{
   runs++;
   if(kind==='throw')throw Error('secret-url?token=private');
   if(kind==='denied')return {state:'blocked',code:'AUTHORIZATION_REVOKED'};
   return {state:kind==='storage'?'completed':kind,code:kind==='storage'?'DEPTH_CLICK_COMPLETED':'VERIFY_UNCERTAIN',operationId:'remote-fixture'};
  });
  const observed=await feedback;
  assert.equal(runs,1);
  assert(!JSON.stringify([observed,records]).includes('secret-url'));
  assert.equal(observed.state,out.state);
  if(kind==='storage')assert.equal(observed.recordCode,'DEPTH_CLICK_RECORD_FAILED');
  if(['uncertain','partial'].includes(kind))assert.equal(records.at(-1).cause,'remote-fixture');
 }
});
test('cold worker classifies persisted Depth row without trusting its historical ACK',async()=>{
 const f=fixture(),spec=await f.start(),row=spec.rows.find(r=>r.role==='save');let recorded=0;
 const chrome={runtime:{},contextMenus:{create:(_p,cb)=>cb(),removeAll:cb=>cb(),onClicked:{addListener(){}}}};
 const restarted=createChromeRegistrar({chrome,readDepthClickRow:async id=>id===row.id?row:null,depthClick:async(_r,_i,_t,run)=>{recorded++;return run();}});
 const result=await restarted.handleClick({menuItemId:row.id,linkUrl:'https://example.org/file'});assert.equal(recorded,1);assert.equal(result.state,'blocked');assert.equal(restarted.inspect().acknowledgedGeneration,null);
});
test('five siblings preserve independent failed-child ACK evidence without claiming a full menu',async()=>{
 const f=fixture({folders:Array.from({length:5},(_,i)=>'sibling-'+i+'/'),fail:'sibling-3'}),spec=await f.start();
 const failed=spec.rows.find(r=>r.label==='sibling-3'),survivor=spec.rows.find(r=>r.label==='sibling-4');assert(f.registrar.inspect().acknowledgements.some(a=>a.itemId===failed.id&&a.state==='failed'));
 await f.emit(survivor);assert.equal(f.writes.length,0);assert.equal(f.records.at(-1).state,'blocked');
});
