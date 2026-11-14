import {depthObservation} from './fixtures/depth-observation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {isAbsolute} from 'node:path';
import {build} from 'esbuild';
import {Miniflare,createFetchMock} from 'miniflare';
import {createProvisioner,WORKER_MODULES} from '../src/cloudflare/deployment.mjs';
import {createRemoteTransport} from '../src/cloudflare/transport.mjs';
import {createCloudflareOnboarding} from '../src/cloudflare/onboarding.mjs';
import {createDepthNativeClick} from '../src/modes/depth/native-click.mjs';
import {createChromeRegistrar} from '../src/chrome/registrar.mjs';
import {createEngine} from '../src/core/engine.mjs';
import {productState} from '../src/api/config.mjs';
import {createEngineApi,toolRegistry} from '../src/api/service.mjs';
import {createPermissions} from '../src/api/permissions.mjs';
import {digest} from '../src/cloudflare/wire.mjs';
import {sourceFromClick} from '../right2cloud-module/src/index.mjs';

// Management, OAuth and the public source are explicit local fixtures. Deployments
// use the actual provisioner/form bindings; capabilities, signing, claims, probes,
// transfers and independent R2 readback execute the real Worker in workerd.
const a={provider:'cloudflare',connectionId:'cloudflare:fixture',accountId:'fixture',bucketName:'narrow-a',prefix:'kept/'};
const b={...a,bucketName:'depth-b',prefix:''};
const sourceUrl='https://raw.githubusercontent.com/approved.bin';

test('absent Depth B plan is created for B, verified, persisted and reused; Narrow A and exact native destinations survive',async()=>{
 const observation=await depthObservation(),{trace,ref}=observation;
 const fixturePath=fileURLToPath(new URL('./fixtures/public-egress.mjs',import.meta.url));
 assert(isAbsolute(fixturePath));assert.doesNotMatch(fixturePath,/^\/[A-Za-z]:\//,'esbuild requires a native Windows path, never URL /C:/ form');
 const code=(await build({entryPoints:['src/cloudflare/worker.mjs'],bundle:true,write:false,format:'esm',platform:'browser',plugins:[{name:'explicit-public-source-fixture',setup(build){build.onResolve({filter:/public-egress\.mjs$/},()=>({path:fixturePath}));}}]})).outputFiles[0].text;
 const sourceModules=await Promise.all(WORKER_MODULES.map(async path=>[path,await readFile(new URL('../'+path,import.meta.url),'utf8')]));
 const expectedCodeDigest=await digest(sourceModules),plans=new Map(),ledger=new Map(),workers=new Map(),deployments=[],events=[];
 const mock=createFetchMock();mock.disableNetConnect();mock.get('https://raw.githubusercontent.com').intercept({path:'/approved.bin'}).reply(200,'abc',{headers:{'content-length':'3','content-type':'application/octet-stream'}}).persist();
 const authority=async()=>({sessionId:'fixture-session',accounts:[{id:'fixture'}],scopes:['workers-r2.read','workers-r2.write','workers-scripts.admin','workers-scripts.content_read','workers-scripts.edit'],scopeEvidence:'provider-returned'});
 const management=async(path,options={})=>{
  if(path==='/accounts/fixture/workers/subdomain'&&!options.method)return Response.json({success:true,result:{subdomain:'fixture-account'}});
  const match=path.match(/^\/accounts\/fixture\/workers\/scripts\/([^/]+)(\/settings|\/subdomain)?$/);assert(match,'Unexpected management endpoint '+path);const [,name,suffix]=match;
  if(options.method==='PUT'){
   const metadata=JSON.parse(await options.body.get('metadata').text()),bindings=Object.fromEntries(metadata.bindings.filter(value=>'text' in value).map(value=>[value.name,value.text]));
   const bucketName=metadata.bindings.find(value=>value.name==='STORAGE').bucket_name;
   assert.equal(bindings.ACCOUNT_ID,'fixture');assert.equal(bindings.BUCKET_NAME,bucketName);assert.equal(bindings.CODE_DIGEST,expectedCodeDigest);assert.match(bindings.SIGNING_KEY,/^[a-f0-9]{64}$/);
   assert.deepEqual(metadata.migrations?.new_sqlite_classes,['RemoteClaims']);
   for(const [path,source] of sourceModules)assert.equal(await options.body.get(path).text(),source);
   const mf=new Miniflare({modules:true,script:code,compatibilityDate:metadata.compatibility_date,r2Buckets:['STORAGE'],durableObjects:{CLAIMS:{className:'RemoteClaims',useSQLite:true}},bindings,fetchMock:mock});
   await mf.ready;workers.set(name,{mf,bindings:metadata.bindings,bucketName});deployments.push({name,bucketName});return Response.json({success:true,result:{}});
  }
  if(suffix==='/settings')return workers.has(name)?Response.json({success:true,result:{bindings:workers.get(name).bindings}}):Response.json({success:false},{status:404});
  if(suffix==='/subdomain'&&options.method==='POST'){assert(workers.has(name));return Response.json({success:true,result:{enabled:true}});}
  assert.fail('Unexpected management operation '+path);
 };
 const provisionerOptions={request:management,authority,readModule:async path=>sourceModules.find(([name])=>name===path)[1],load:async key=>structuredClone(plans.get(key)),store:async(key,value)=>plans.set(key,structuredClone(value))};
 let provisioner=createProvisioner(provisionerOptions);
 const oauth={authority,status:async()=>({state:'CONNECTED',accounts:[{id:'fixture'}]}),request:async(path,options={})=>{assert.equal(options.method??'GET','GET','Recovery must never create a bucket');assert.match(path,/^\/accounts\/fixture\/r2\/buckets/);return Response.json({success:true,result:{buckets:[{name:a.bucketName},{name:b.bucketName}]}});}};
 const transportOptions={oauth,lookup:target=>provisioner.lookup(target),expectedCodeDigest,pollIntervalMs:1,record:async event=>{events.push(event);trace('transport.record',{state:event.state,code:event.code});},fetch:async(url,options)=>{const parsed=new URL(url),name=parsed.hostname.split('.')[0],worker=workers.get(name);assert(worker,'Unknown exact Worker '+name);if(process.env.C2C_DEPTH_TRACE_DIR){const c=JSON.parse(Buffer.from(options.headers.authorization.slice(7).split('.')[0],'base64url'));trace('request.begin',{endpoint:parsed.pathname,expiresInMs:c.expiresAt-Date.now(),sessionEqual:c.sessionId==='fixture-session'});}try{const response=await worker.mf.dispatchFetch((await worker.mf.ready).origin+parsed.pathname,options);if(process.env.C2C_DEPTH_TRACE_DIR){const data=await response.clone().json();trace('request.end',{endpoint:parsed.pathname,httpStatus:response.status,state:data.state,code:data.code});}return response;}catch(error){trace('request.error',{endpoint:parsed.pathname,errorName:error.name});throw error;}}};
 let transport=createRemoteTransport(transportOptions),registrar,api;
 const deep=Array.from({length:12},(_,i)=>'level'+(i+1)).join('/')+'/';
 const state={product:productState({defaultTarget:a,show:{simple:true,nested:true,depth:true,flat:false},cloudflare:{selectedAccountId:'fixture',initialized:['fixture'],pending:[]}}),configs:{simple:{destinations:[{id:'simple-a',target:{...a,prefix:'simple/'},label:'Simple A'}]},nested:{destinations:[{id:'narrow-a',target:a,label:'Narrow A'}]},depth:{scopes:[{target:b,maxDepth:30}]}},generation:{desired:0,applied:null}};
 const originalConfig=JSON.stringify({product:state.product,configs:state.configs});
 const current={read:async()=>{trace('current.read',{desired:state.generation.desired,applied:state.generation.applied});return structuredClone(state);},readSetupOperation:async key=>structuredClone(ledger.get(key)),writeSetupOperation:async(key,value)=>ledger.set(key,structuredClone(value)),setDesiredGeneration:async generation=>{trace('generation.desired',{generation});state.generation.desired=generation;},acknowledgeGeneration:async generation=>{trace('generation.applied',{generation});state.generation.applied=generation;},recordRemoteResult:async event=>{trace('depth.record',{state:event.state,code:event.code});events.push(event);},commitProduct:async()=>assert.fail('Exact destination recovery must not replace configuration or Default')};
 ledger.set('approval:fixture',{accountId:'fixture',approved:true});
 const domainOptions={current,oauth,provisioner:{prepare:(...args)=>provisioner.prepare(...args),lookup:(...args)=>provisioner.lookup(...args),markVerified:(...args)=>provisioner.markVerified(...args)},transport:{status:(...args)=>transport.status(...args),probe:(...args)=>transport.probe(...args),probeStatus:(...args)=>transport.probeStatus(...args)}};
 let domain=createCloudflareOnboarding(domainOptions);
 try{
  await provisioner.prepare(a,{approved:true});assert.equal((await transport.status(a)).state,'PREPARED');assert.equal((await transport.probe({target:a})).state,'verified');await provisioner.markVerified(a,'fixture-session');assert.equal((await transport.status(a)).state,'READY');
  const aKey=await digest(['fixture','narrow-a']),bKey=await digest(['fixture','depth-b']),beforeA=structuredClone(plans.get(aKey));assert.equal(plans.has(bKey),false);
  const auth=async target=>{trace('authorization.begin',{targetRef:ref(target),ack:registrar.inspect().acknowledgedGeneration,pending:registrar.inspect().pending});const status=await transport.status(target);trace('authorization.end',{targetRef:ref(target),state:status.state,code:status.code,sessionEqual:true});return {sessionId:'fixture-session',authorizedTargets:status.state==='READY'?[target]:[]};};
  let engine;const depthClick=createDepthNativeClick({current,oauth,transport:domainOptions.transport,lookup:target=>provisioner.lookup(target),inspect:()=>registrar.inspect(),authorize:auth,recover:async params=>{const out=await api.invoke({version:'3+1.1',method:'recoverCloudflareDestination',params},'gui');return out.data??out;}});
  const chrome={runtime:{},contextMenus:{onClicked:{addListener(){},removeListener(){}},removeAll:callback=>callback(),create:(_properties,callback)=>callback()}};
  registrar=createChromeRegistrar({chrome,depthClick,observeClick:observation.observeClick,sink:e=>trace('registrar.'+e.stage,{outcome:e.outcome,code:e.code,generation:e.generation}),getAuthorization:async info=>auth(registrar.inspect().desired.rows.find(row=>row.id===info.menuItemId).target),dispatch:(_action,{info,generation,depthAuthorization,observation:observe})=>{trace('dispatch.enter',{generation,desired:state.generation.desired,applied:state.generation.applied,ack:registrar.inspect().acknowledgedGeneration,pending:registrar.inspect().pending});return engine.save({observation:observe,itemId:info.menuItemId,generation,depthAuthorization,context:'link',source:sourceFromClick(info)});}});
  engine=createEngine({current,registrar,getAuthorization:auth,diagnostics:e=>trace('engine.'+e.stage,{outcome:e.outcome,code:e.code,generation:e.generation}),remoteSave:input=>transport.save(input),providerSetupActions:true});
  const inventory=ready=>({scopes:[{target:{...a,prefix:''},folders:['kept/','simple/'],authorized:true,workerReady:true,complete:true},{target:b,folders:['Images/','Images/Artwork/',...deep.split('/').filter(Boolean).map((_,index)=>deep.split('/').slice(0,index+1).join('/')+'/')],authorized:true,workerReady:ready,complete:true}]});
  api=createEngineApi({engine,current,oauth,cloudflare:domain,authorize:async()=>true,confirm:async()=>true,getInventory:async()=>inventory((await transport.status(b)).state==='READY')});
  let spec=await engine.compile({mode:'composite',inventory:inventory(false)});assert.equal((await engine.apply(spec)).state,'completed');
  const rowBefore=spec.rows.find(row=>row.origin?.mode==='depth'&&row.role==='save'&&row.target.prefix==='Images/Artwork/');assert(rowBefore);assert.equal(rowBefore.actionKind,'attention');
    const controlBefore=spec.rows.filter(row=>row.role==='save'&&['simple','nested'].includes(row.origin?.mode));assert.equal(controlBefore.length,2);
  for(const row of controlBefore){const saved=await observation.click(registrar,{menuItemId:row.id,linkUrl:sourceUrl});assert.equal(saved.state,'completed',JSON.stringify(saved));const runtime=workers.get(beforeA.name);assert.equal(await (await (await runtime.mf.getR2Bucket('STORAGE')).get(saved.receipt.key)).text(),'abc');}
  const nativeRecovery=await observation.click(registrar,{menuItemId:rowBefore.id,linkUrl:sourceUrl});assert.equal(nativeRecovery.state,'blocked',JSON.stringify(nativeRecovery));assert.equal(nativeRecovery.code,'FRESH_CLICK_REQUIRED');assert.equal(nativeRecovery.requiredAction,'RIGHT_CLICK_AGAIN');assert.deepEqual(nativeRecovery.target,rowBefore.target);
  const recovered=nativeRecovery.recovery;assert.equal(recovered.state,'completed',JSON.stringify(recovered));assert.equal(recovered.target.bucketName,'depth-b');assert.equal(recovered.target.prefix,'Images/Artwork/');assert.equal((await transport.status(rowBefore.target)).state,'READY');
  assert.equal(plans.get(bKey).bucketName,'depth-b');assert.equal(plans.get(bKey).accountId,'fixture');assert.equal(plans.get(bKey).codeDigest,expectedCodeDigest);assert.notEqual(plans.get(bKey).secret,beforeA.secret);assert.deepEqual(plans.get(aKey),beforeA);assert.equal(deployments.filter(value=>value.bucketName==='depth-b').length,1);
  const bRuntime=workers.get(plans.get(bKey).name),bucketB=await bRuntime.mf.getR2Bucket('STORAGE');const readiness=(await bucketB.list()).objects;assert.equal(readiness.some(value=>value.key.endsWith('approved.bin')),false,'The setup click must not upload or replay its original source');assert(readiness.some(value=>value.key.startsWith('Images/Artwork/.click2cloud-readiness/')),'Real exact-prefix readiness object must exist');
  spec=await engine.compile({mode:'composite',inventory:inventory(true)});assert.equal((await engine.apply(spec)).state,'completed');assert.equal(registrar.inspect().acknowledgedGeneration,spec.generation);
  const selectedPrefixes=['','Images/','Images/Artwork/',deep];
  for(const prefix of selectedPrefixes){const row=spec.rows.find(row=>row.origin?.mode==='depth'&&row.role==='save'&&row.target.prefix===prefix);assert(row,'Missing exact Depth native row '+prefix);assert.equal(row.actionKind,'save');const saved=await observation.click(registrar,{menuItemId:row.id,linkUrl:sourceUrl});assert.equal(saved.state,'completed',JSON.stringify(saved));assert.equal(saved.receipt.key.startsWith(prefix),true);assert.equal(await (await bucketB.get(saved.receipt.key)).text(),'abc');assert.equal(saved.receipt.destination.bucketName,'depth-b');}
  const controls=spec.rows.filter(row=>row.role==='save'&&['simple','nested'].includes(row.origin?.mode));assert.deepEqual(controls.map(row=>({id:row.id,target:row.target})),controlBefore.map(row=>({id:row.id,target:row.target})));
  for(const row of controls){const saved=await observation.click(registrar,{menuItemId:row.id,linkUrl:sourceUrl});assert.equal(saved.state,'completed',JSON.stringify(saved));assert.equal(saved.receipt.destination.bucketName,'narrow-a');assert.equal(await (await (await workers.get(beforeA.name).mf.getR2Bucket('STORAGE')).get(saved.receipt.key)).text(),'abc');}
  // A new host instance reads the durable exact-bucket registry and ledger. It
  // must freshly recheck capabilities without another deployment/probe write.
  const bObjects=(await bucketB.list()).objects.length,beforeDeployments=deployments.length;provisioner=createProvisioner(provisionerOptions);transport=createRemoteTransport(transportOptions);domain=createCloudflareOnboarding(domainOptions);
  const replay=await domain.recoverDestination({target:rowBefore.target,idempotencyKey:'exact-depth-b',expectedRevision:state.product.revision});assert.equal(replay.state,'completed',JSON.stringify(replay));assert.equal((await transport.status({...b,prefix:deep})).state,'READY');assert.equal(deployments.length,beforeDeployments);assert.equal((await bucketB.list()).objects.length,bObjects);assert.equal(JSON.stringify({product:state.product,configs:state.configs}),originalConfig);
  const outside={...b,accountId:'foreign',connectionId:'cloudflare:foreign'};await assert.rejects(domain.recoverDestination({target:outside,idempotencyKey:'foreign'}),{code:'WRONG_ACCOUNT'});assert.equal(deployments.length,beforeDeployments);
 }finally{trace('disposal.begin');registrar?.close();for(const worker of workers.values())await worker.mf.dispose();await mock.close();trace('disposal.end');await observation.finish();}
});

test('Depth recovery failures keep the exact contextual target and never dispatch or replay the clicked source',async()=>{
 const target={...b,prefix:'selected/child/'},attempts=[];
 for(const recovery of [
  {state:'blocked',code:'SETUP_APPROVAL_REQUIRED',requiredAction:'AUTHORIZE_EXACT_DESTINATION_SETUP'},
  {state:'blocked',code:'WORKER_CREATE_PERMISSION_REQUIRED'},
  {state:'blocked',code:'WORKER_DESTINATION_SCOPE_REQUIRED',requiredAction:'CONFIRM_SCOPE_CHANGE'},
  {state:'uncertain',code:'SETUP_PROBE_REQUIRES_INSPECTION',operationId:'existing-probe'},
  {state:'blocked',code:'WORKER_BUILD_MISMATCH'},
  {state:'partial',code:'NATIVE_APPLY_INCOMPLETE'}
 ]){
  let dispatched=0;const attention=[];
  const click=createDepthNativeClick({current:{recordRemoteResult:async value=>attempts.push(value)},oauth:{authority:async()=>({accounts:[{id:'fixture'}]})},transport:{status:async()=>({state:'blocked',code:'WORKER_SETUP_REQUIRED'})},lookup:async()=>null,inspect:()=>({desired:{generation:7},acknowledgedGeneration:7}),recover:async params=>{assert.deepEqual(params,{target});assert.equal(params.source,undefined);assert.equal(params.info,undefined);return recovery;},attend:async(target,context)=>attention.push({target,code:context.code})});
  const result=await click({id:'depth-selected',role:'save',actionKind:'attention',origin:{mode:'depth'},target},{linkUrl:sourceUrl},{},async()=>{dispatched++;return {state:'completed'};});
  assert.notEqual(result.state,'completed');assert.equal(result.code,recovery.code);assert.deepEqual(result.target,target);assert.equal(dispatched,0);assert.deepEqual(attention,[{target,code:recovery.code}]);
 }
 assert.equal(JSON.stringify(attempts).includes(sourceUrl),false,'Recovery observations cannot retain an original source URL');
});

test('exact recovery reconciles only selected Depth B when another same-account or foreign-account scope is unprepared',async()=>{
 for(const otherAccount of ['fixture','foreign']){
  const c={...b,bucketName:'unprepared-c',accountId:otherAccount,connectionId:'cloudflare:'+otherAccount};
  const selected={...b,prefix:'Images/Artwork/'};
  const state={product:productState({show:{simple:false,nested:false,depth:true,flat:false}}),configs:{simple:{destinations:[]},nested:{destinations:[]},depth:{scopes:[{target:b,maxDepth:12},{target:c,maxDepth:40}]}},generation:{desired:0,applied:null}};
  const saved=structuredClone(state.configs),requests=[];let coverage='covered';
  const current={read:async()=>structuredClone(state),setDesiredGeneration:async generation=>state.generation.desired=generation,acknowledgeGeneration:async generation=>state.generation.applied=generation};
  const chrome={runtime:{},contextMenus:{onClicked:{addListener(){},removeListener(){}},removeAll:callback=>callback(),create:(_properties,callback)=>callback()}};
  const registrar=createChromeRegistrar({chrome}),engine=createEngine({current,registrar,getAuthorization:async()=>({sessionId:'s',authorizedTargets:[selected]}),providerSetupActions:true});
  const cloudflare={recoverDestination:async params=>{assert.deepEqual(params.target,selected);return {state:'completed',code:'CLOUDFLARE_READY',target:selected};},check:async(accountId,target)=>{assert.equal(accountId,'fixture');assert.deepEqual(target,selected);return {state:'READY',accountId,target};}};
  const api=createEngineApi({engine,current,oauth:{},cloudflare,authorize:async({params,bindings})=>{assert.deepEqual(params.target,selected);assert(!bindings?.some(target=>target.bucketName===c.bucketName));return true;},getInventory:async options=>{
   requests.push(options);assert.deepEqual(options.refreshTargets,[selected]);assert.deepEqual(options.refreshDepthScopes,[saved.depth.scopes[0]],'Recovery may not discover or prepare C');
   const scopeB={target:b,folders:['Images/Artwork/'],authorized:true,workerReady:true,complete:false,stale:coverage==='stale'};
   const scopeC={target:c,folders:[],authorized:false,workerReady:false,complete:false,stale:true};
   return {scopes:[scopeB,scopeC],depthScopes:coverage==='absent'?[scopeC]:[scopeB,scopeC],depthCoverageComplete:false};
  }});
  try{
   const invoke=()=>api.invoke({version:'3+1.1',method:'recoverCloudflareDestination',params:{target:selected}},'gui');
   const good=await invoke();assert.equal(good.state,'completed',JSON.stringify(good));assert.equal(good.data.native.state,'completed');assert.equal(registrar.inspect().acknowledgedGeneration,state.generation.desired);assert(registrar.inspect().desired.rows.some(row=>row.origin?.mode==='depth'&&row.target?.bucketName==='unprepared-c'));
   // complete:false can represent a fully covered requested maxDepth. stale is
   // the inventory owner's depth-coverage signal, and missing B is never proof.
   for(const incomplete of ['stale','absent']){coverage=incomplete;const result=await invoke();assert.notEqual(result.state,'completed',JSON.stringify(result));assert.equal(result.data.native.code,'DEPTH_DISCOVERY_REQUIRED');}
   assert.equal(requests.length,3);assert.deepEqual(state.configs,saved);
  }finally{registrar.close();}
 }
});

test('exact recovery API enforces closed input, account grants and one-use confirmation before establishing setup approval',async()=>{
 const method='recoverCloudflareDestination',target={...b,prefix:'selected/child/'},calls=[],permissions=createPermissions();
 const entries=toolRegistry.filter(tool=>tool.name===method);assert.equal(entries.length,1);assert.equal(entries[0].scope,'provision');assert.equal(entries[0].inputSchema.properties.source,undefined);assert.equal(entries[0].inputSchema.properties.sourceUrl,undefined);
 const current={read:async()=>({product:productState(),configs:{simple:{destinations:[]},nested:{destinations:[]},depth:{scopes:[{target:b,maxDepth:12}]}}})};
 const api=createEngineApi({current,engine:{},authorize:request=>permissions.authorize(request),confirm:request=>permissions.confirm(request),cloudflare:{recoverDestination:async params=>{calls.push(structuredClone(params));return {state:'blocked',code:params.authorizeSetup?'INSUFFICIENT_SCOPE':'SETUP_APPROVAL_REQUIRED',target:params.target};}}});
 const call=params=>api.invoke({version:'3+1.1',method,params},'recovery-agent');
 permissions.issue({actor:'recovery-agent',methods:['checkCloudflareR2'],accounts:['fixture'],expiresAt:Date.now()+10000});assert.equal((await call({target})).code,'PERMISSION_DENIED');
 permissions.issue({actor:'recovery-agent',methods:[method],accounts:['foreign'],expiresAt:Date.now()+10000});assert.equal((await call({target})).code,'PERMISSION_DENIED');assert.equal(calls.length,0);
 permissions.issue({actor:'recovery-agent',methods:[method],accounts:['fixture'],expiresAt:Date.now()+10000});
 for(const extra of [{sourceUrl},{source:{url:sourceUrl}},{secret:'must-not-enter'},{accountId:'foreign'}])assert.equal((await call({target,...extra})).code,'INVALID_REQUEST');
 const approved={target,authorizeSetup:true,idempotencyKey:'exact-permission-test'};
 assert.equal((await call(approved)).code,'CONFIRMATION_REQUIRED');assert.equal(calls.length,0);
 permissions.approve('recovery-agent',method,approved);
 assert.equal((await call({...approved,target:{...target,prefix:'other/'}})).code,'CONFIRMATION_REQUIRED');assert.equal(calls.length,0);
 const granted=await call(approved);assert.equal(granted.data.code,'INSUFFICIENT_SCOPE');assert.deepEqual(calls,[approved]);
 assert.equal((await call(approved)).code,'CONFIRMATION_REQUIRED');assert.equal(calls.length,1);
 const retainedOnly=await call({target,authorizeSetup:false});assert.equal(retainedOnly.data.code,'SETUP_APPROVAL_REQUIRED');assert.equal(calls.length,2);assert.deepEqual(calls[1],{target,authorizeSetup:false});
});
