import test from 'node:test';import assert from 'node:assert/strict';
import {build} from 'esbuild';import {Miniflare,createFetchMock} from 'miniflare';
import {createProvisioner} from '../src/cloudflare/deployment.mjs';import {createRemoteTransport} from '../src/cloudflare/transport.mjs';
import {PROTOCOL,digest} from '../src/cloudflare/wire.mjs';import {createDepthNativeClick,createDepthFeedback} from '../src/modes/depth/native-click.mjs';
import {createEngine} from '../src/core/engine.mjs';import {createChromeRegistrar} from '../src/chrome/registrar.mjs';import {productState} from '../src/api/config.mjs';import {targetKey} from '../src/core/menu-identity.mjs';import {sourceFromClick} from '../right2cloud-module/src/index.mjs';
const root={provider:'cloudflare',connectionId:'cloudflare:fixture',accountId:'fixture',bucketName:'bucket',prefix:''};
test('production Depth callbacks -> provisioner -> signed transport -> workerd -> independent R2 bytes, with observation failures and protected modes',async()=>{
 const code=(await build({entryPoints:['src/cloudflare/worker.mjs'],bundle:true,write:false,format:'esm',platform:'browser',plugins:[{name:'source-fixture',setup(b){b.onResolve({filter:/public-egress\.mjs$/},()=>({path:new URL('./fixtures/public-egress.mjs',import.meta.url).pathname}));}}]})).outputFiles[0].text;
 const mock=createFetchMock();mock.disableNetConnect();mock.get('https://raw.githubusercontent.com').intercept({path:'/approved.bin'}).reply(200,'abc', {headers:{'content-length':'3','content-type':'application/octet-stream'}}).persist();
 const secret='synthetic-integration-secret-only',mf=new Miniflare({modules:true,script:code,compatibilityDate:'2026-01-01',r2Buckets:['STORAGE'],durableObjects:{CLAIMS:{className:'RemoteClaims',useSQLite:true}},bindings:{SIGNING_KEY:secret,ACCOUNT_ID:'fixture',BUCKET_NAME:'bucket',PREFIX_SCOPE:'',CODE_DIGEST:'fixture-code'},fetchMock:mock});
 let registrar;
 try{
 const url=(await mf.ready).origin,bucket=await mf.getR2Bucket('STORAGE'),plans=new Map(),lookups=[],records=[],shared=new Map();let authorized=true,failOptional=true,failCurrent=false,finish,listener;
 const plan={state:'ready',accountId:'fixture',bucketName:'bucket',protocol:PROTOCOL,url:'https://fixture.workers.dev',secret,codeDigest:'fixture-code'};
 const registryKey=await digest(['fixture','bucket']);plans.set(registryKey,plan);
 const provisioner=createProvisioner({request:async()=>{throw Error('Provisioning forbidden');},readModule:async()=>{throw Error('Provisioning forbidden');},load:async k=>{lookups.push(k);return plans.get(k);},store:async(k,v)=>plans.set(k,v)});
 let failVerification=false;const oauth={authority:async()=>{if(!authorized)throw Object.assign(Error(),{code:'AUTH_REQUIRED'});return {sessionId:'fixture-session',accounts:[{id:'fixture'}]};}};
 const transport=createRemoteTransport({oauth,lookup:provisioner.lookup,expectedCodeDigest:'fixture-code',pollIntervalMs:1,fetch:(u,o)=>failVerification&&new URL(u).pathname==='/verify'?Response.json({state:'blocked',code:'FIXTURE_VERIFY_UNAVAILABLE'}):mf.dispatchFetch(url+new URL(u).pathname,o),record:async r=>records.push(r)});
 assert.equal((await transport.status(root)).state,'PREPARED');assert.equal((await transport.probe({target:root})).state,'verified');await provisioner.markVerified(root,'fixture-session');Object.assign(plan,plans.get(registryKey));assert.equal((await transport.status(root)).state,'READY');
 const state={product:productState({show:{simple:true,nested:true,depth:true,flat:false}}),configs:{simple:{destinations:[{target:{...root,prefix:'Images/'},label:'Simple control'}]},nested:{destinations:[{target:{...root,prefix:'Images/Artwork/'},label:'Narrow control'}]},depth:{scopes:[{target:root,maxDepth:30}]}},generation:{desired:0,applied:null}};
 const current={read:async()=>{if(failCurrent)throw Object.assign(Error(),{code:'STORAGE_UNAVAILABLE'});return structuredClone(state);},setDesiredGeneration:async g=>state.generation.desired=g,acknowledgeGeneration:async g=>state.generation.applied=g,recordRemoteResult:async r=>{if(failOptional)throw Object.assign(Error(),{code:'STORAGE_UNAVAILABLE'});records.push(r);}};
 const normalAuth=async t=>({sessionId:'fixture-session',authorizedTargets:authorized&&shared.get(targetKey(t))?[t]:[]});
 const depthAuth=async t=>({sessionId:(await oauth.authority()).sessionId,authorizedTargets:(await transport.status(t)).state==='READY'?[t]:[]});
 let feedback=[];const depthClick=createDepthNativeClick({current,oauth,transport,lookup:provisioner.lookup,inspect:()=>registrar.inspect(),authorize:depthAuth,feedback:async r=>{feedback.push(r);finish?.();}});
 const chrome={runtime:{},contextMenus:{onClicked:{addListener:f=>listener=f,removeListener(){}},removeAll:cb=>cb(),create:(_p,cb)=>setTimeout(cb,0)}};
 let engine;registrar=createChromeRegistrar({chrome,depthClick,getAuthorization:async info=>normalAuth(registrar.inspect().desired.rows.find(r=>r.id===info.menuItemId).target),dispatch:(_a,{info,generation,depthAuthorization})=>engine.save({itemId:info.menuItemId,generation,depthAuthorization,context:'link',source:sourceFromClick(info)})});
 engine=createEngine({current,registrar,getAuthorization:normalAuth,remoteSave:transport.save});
 const inventory={scopes:[{target:root,folders:['Images/','Images/Artwork/'],authorized:true,workerReady:true,complete:true}]};
 const spec=await engine.compile({mode:'composite',inventory});assert.equal((await engine.apply(spec)).state,'completed');
 const emit=async row=>{const done=new Promise(r=>finish=r);listener({menuItemId:row.id,linkUrl:'https://raw.githubusercontent.com/approved.bin'},{});await done;return feedback.at(-1);};
 const depthRows=spec.rows.filter(r=>r.role==='save'&&r.origin.mode==='depth');assert.equal(depthRows.length,3);
 // Real controls before/after Depth; compare same targets and registry without warming shared snapshots.
 const controls=spec.rows.filter(r=>r.role==='save'&&['simple','nested'].includes(r.origin.mode));assert.equal(controls.length,2);
 for(const r of controls)shared.set(targetKey(r.target),true);
 const saveControl=async r=>{const out=await registrar.handleClick({menuItemId:r.id,linkUrl:'https://raw.githubusercontent.com/approved.bin'});assert.equal(out.state,'completed',JSON.stringify(out));assert.equal(await (await bucket.get(out.receipt.key)).text(),'abc');};
 for(const r of controls)await saveControl(r);
 for(const row of depthRows){shared.set(targetKey(row.target),false);const before=JSON.stringify([...shared]);const control=controls.find(r=>targetKey(r.target)===targetKey(row.target));
 if(control){const denied=await engine.save({itemId:control.id,generation:spec.generation,depthAuthorization:depthAuth,context:'link'});assert.equal(denied.state,'blocked');}
 const out=await emit(row);assert.equal(out.state,'completed',JSON.stringify(out));assert.equal(out.recordCode,'DEPTH_CLICK_RECORD_FAILED');assert.equal(JSON.stringify([...shared]),before);if(control){const denied=await engine.save({itemId:control.id,generation:spec.generation,depthAuthorization:depthAuth,context:'link'});assert.equal(denied.state,'blocked');}const remote=records.filter(r=>r.state==='verified'&&r.destination?.prefix===row.target.prefix.replace(/\/$/,'')).at(-1);assert(remote?.receipt);assert.equal(remote.receipt.key.startsWith(row.target.prefix),true);assert.equal(await (await bucket.get(remote.receipt.key)).text(),'abc');}
 for(const r of controls){assert.equal(shared.get(targetKey(r.target)),false);shared.set(targetKey(r.target),true);await saveControl(r);}
 const count=async()=>(await bucket.list()).objects.length;let before=await count();
 plans.delete(registryKey);let out=await emit(depthRows[0]);assert.equal(out.code,'WORKER_SETUP_REQUIRED');assert.equal(out.reason,'FOLLOWUP_PLAN_MISSING');assert.equal(await count(),before);plans.set(registryKey,plan);
 failCurrent=true;out=await emit(depthRows[0]);assert.equal(out.code,'STORAGE_UNAVAILABLE');assert.equal(await count(),before);failCurrent=false;
 state.generation.applied=null;out=await emit(depthRows[0]);assert.equal(out.code,'STALE_GENERATION');assert.equal(await count(),before);state.generation.applied=spec.generation;
 authorized=false;out=await emit(depthRows[0]);assert.equal(out.code,'AUTH_REQUIRED');assert.equal(await count(),before);authorized=true;
 for(const t of [{...root,bucketName:'foreign'},{...root,accountId:'foreign',connectionId:'cloudflare:foreign'},{...root,connectionId:'invalid'}])assert.notEqual((await transport.status(t)).state,'READY');
 const restricted={...plan,prefixScope:'Images'};plans.set(registryKey,restricted);assert.equal((await transport.status(root)).code,'WORKER_DESTINATION_SCOPE_REQUIRED');assert.equal((await transport.status({...root,prefix:'Images/Artwork/'})).state,'READY');
 plans.set(registryKey,plan);lookups.length=0;for(const prefix of ['', 'Images/','Images/Artwork/'])await provisioner.lookup({...root,prefix});assert.equal(new Set(lookups).size,1);
 failVerification=true;const uncertain=await transport.save({target:root,source:{url:'https://raw.githubusercontent.com/approved.bin',filename:'unverified.bin'}});assert.notEqual(uncertain.state,'verified');assert.equal(await (await bucket.get('unverified.bin')).text(),'abc');console.log(JSON.stringify({evidenceClass:'LOCAL_WORKERD_R2_NOT_LIVE_CLOUDFLARE',verifiedKeys:records.filter(r=>r.state==='verified'&&r.receipt).map(r=>r.receipt.key),uncertainState:uncertain.state,bodyReadback:'abc',sharedSnapshotsUnchanged:true}));
 }catch(e){console.error('DEPTH_INTEGRATION_FAILURE',e.stack);throw e;}finally{registrar?.close();await mf.dispose();}
});
test('optional lastDepthClick failure does not suppress existing channels or claim uncertain save success',async()=>{
 const calls=[];const feedback=createDepthFeedback({storage:{local:{set:async()=>{calls.push('set');throw Error('quota');}}},runtime:{getURL:p=>p,sendMessage:async m=>calls.push(m)},notifications:{create:async(_id,m)=>calls.push(m)},action:{setBadgeText:async()=>calls.push('badge')}});
 await feedback({state:'uncertain',code:'VERIFY_UNCERTAIN',operationId:'fixture'});assert(calls.some(c=>c.channel==='depth-click-outcome'));assert(calls.includes('badge'));assert(calls.some(c=>c.message?.includes('not confirmed')));assert(!calls.some(c=>c.message?.includes('save completed')));
});
test('follow-up diagnostic read never purports to be rejecting plan snapshot',async()=>{
 let n=0;const plan={state:'ready',accountId:'fixture',bucketName:'bucket',protocol:PROTOCOL},lookup=async()=>++n===1?plan:n===2?{...plan,state:'pending'}:null;
 const transport=createRemoteTransport({oauth:{authority:async()=>({accounts:[{id:'fixture'}]})},lookup,fetch:async()=>{throw Error('No fetch');}});
 const observed=[];const click=createDepthNativeClick({current:{recordRemoteResult:async()=>{}},feedback:async r=>observed.push(r),oauth:{authority:async()=>({accounts:[{id:'fixture'}]})},transport,lookup,inspect:()=>({desired:{generation:1},acknowledgedGeneration:1})});
 const out=await click({id:'r',role:'save',target:root},{},{},()=>{throw Error('Must not save');});assert.equal(out.code,'WORKER_SETUP_REQUIRED');assert.equal(n,3);assert.equal(observed[0].reason,'FOLLOWUP_PLAN_MISSING');
});
