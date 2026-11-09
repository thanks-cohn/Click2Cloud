import {menuProvenance} from '../src/core/menu-provenance.mjs';
import test from 'node:test';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import assert from 'node:assert/strict';
import {Miniflare,createFetchMock} from 'miniflare';
import {build} from 'esbuild';
import {createEngineApi} from '../src/api/service.mjs';
import {createClick2CloudFileApi} from '../src/explorer/index.mjs';
import {CLOUDFLARE_SCOPES} from '../src/auth/cloudflare-oauth.mjs';
import {trustedAppSender} from '../src/chrome/trusted-sender.mjs';
import {compileMenuSpec} from '../src/core/menu-spec.mjs';
import {productState} from '../src/api/config.mjs';
import {createRemoteTransport} from '../src/cloudflare/transport.mjs';
import {destinationWriter} from '../src/cloudflare/writer-registry.mjs';
import {createEngine} from '../src/core/engine.mjs';
import {createChromeRegistrar} from '../src/chrome/registrar.mjs';
import {createCloudflareOnboarding} from '../src/cloudflare/onboarding.mjs';
import {signGrant,PROTOCOL,remoteDestination,digest} from '../src/cloudflare/wire.mjs';
const target={provider:'cloudflare',connectionId:'cloudflare:a',accountId:'a',bucketName:'bucket',prefix:'exact/'};
const configs={simple:{destinations:[]},nested:{destinations:[]},depth:{scopes:[]}};
test('fresh canonical menu has four actionable siblings; custom configurations and Flat retain their meaning',()=>{
 const rows=compileMenuSpec({mode:'composite',product:productState(),configs,inventory:{scopes:[]}}).rows;
 assert.deepEqual(rows.map(r=>r.label),['Google Drive','Dropbox','OneDrive','Cloudflare']);assert(rows.every(r=>r.parentId===null&&r.enabled&&r.role==='provider-action'&&r.kind==='action'));
 const saved=compileMenuSpec({mode:'composite',product:productState({defaultTarget:target,menuCustomized:true}),defaultTarget:target,configs,inventory:{scopes:[{target,authorized:true,workerReady:true,folders:['exact/']}]}});
 assert(saved.rows.some(r=>r.role==='save'&&r.target.prefix==='exact/'));assert.equal(saved.rows.filter(r=>r.parentId===null).length,4);
 const flat=compileMenuSpec({mode:'composite',product:productState({show:{simple:true,nested:true,depth:true,flat:true},defaultTarget:target}),configs,inventory:{scopes:[]}});assert.equal(flat.rows.filter(r=>r.parentId===null).length,4);
});
test('Cloudflare remote path precedes browser capture and Explorer refuses byte staging',async()=>{
 let state={configs:{...configs,simple:{destinations:[{target}]}},product:productState({menuCustomized:true}),generation:{desired:0,applied:null}},captures=0,remote=0;
 const current={read:async()=>state,setDesiredGeneration:async n=>{state.generation.desired=n;},acknowledgeGeneration:async n=>{state.generation.applied=n;}};
 const chrome={runtime:{},contextMenus:{create:(_p,cb)=>cb(),removeAll:cb=>cb(),onClicked:{addListener(){},removeListener(){}}}};
 const registrar=createChromeRegistrar({chrome});const engine=createEngine({current,registrar,getAuthorization:async()=>({sessionId:'s',authorizedTargets:[target]}),authorizeSource:()=>{captures++;return true;},fetchSource:()=>{captures++;},remoteSave:async i=>{assert.match(i.operationId,/^[a-f0-9-]{36}$/);assert(await i.authorize());remote++;return {state:'verified'};}});
 const spec=await engine.compile({mode:'composite',inventory:{scopes:[{target,authorized:true,workerReady:true,folders:['exact/']}]}});await engine.apply(spec);const row=spec.rows.find(r=>r.role==='save');
 assert.equal((await engine.save({itemId:row.id,generation:spec.generation,source:{url:'https://raw.githubusercontent.com/test',filename:'file'}})).state,'completed');
 assert.equal((await engine.saveExplorerEntry({itemId:row.id,generation:spec.generation})).code,'REMOTE_EXPLORER_SOURCE_UNAVAILABLE');assert.equal(captures,0);assert.equal(remote,1);
});
test('setup actions remain actionable without authorization and cannot impersonate saved routes',async()=>{
 const spec=compileMenuSpec({mode:'composite',product:productState(),configs,inventory:{scopes:[]}});let calls=0;
 const chrome={runtime:{},contextMenus:{create:(_p,cb)=>cb(),removeAll:cb=>cb(),onClicked:{addListener(){},removeListener(){}}}};
 const registrar=createChromeRegistrar({chrome,getAuthorization:async()=>null,dispatch:async a=>{calls++;return {state:'blocked',code:a.providerAction==='cloudflare'?'LOGIN_REQUIRED':'PROVIDER_NOT_IMPLEMENTED'};}});
 await registrar.apply(spec);assert.equal((await registrar.handleClick({menuItemId:spec.rows[3].id,linkUrl:'https://public.org/file'})).code,'LOGIN_REQUIRED');assert.equal(calls,1);
 assert.equal((await registrar.handleClick({menuItemId:'fake'})).state,'blocked');assert.equal(calls,1);
});
test('minimal trusted writer seam accepts a structural test writer without menu/source changes',async()=>{
 let input;const cap={destination:{provider:'test-writer'},storage:{}};
 const writer=destinationWriter(cap,{}, {'test-writer':()=>({kind:'test-writer',capabilities:{conditionalCreate:true},prepare:async()=>({key:'x'}),write:async args=>{input=args;assert(args.body instanceof ReadableStream);assert.equal(await new Response(args.body).text(),'abc');return {id:'proof'};},verify:async()=>({verified:true})})});
 await writer.write({prepared:await writer.prepare({}),body:new Blob(['abc']).stream(),operationId:'opaque'});assert(!('source' in input));assert.equal((await writer.verify({})).verified,true);assert.throws(()=>destinationWriter(cap));
});
test('real workerd runtime: R2 conditional writes, independent HEAD, durable claim replay and revocation',async()=>{
 const code=(await build({entryPoints:['src/cloudflare/worker.mjs'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',plugins:[{name:'explicit-source-fixture',setup(b){b.onResolve({filter:/public-egress\.mjs$/},()=>({path:new URL('./fixtures/public-egress.mjs',import.meta.url).pathname}));}}]})).outputFiles[0].text;
 const mock=createFetchMock();mock.disableNetConnect();
 mock.get('https://raw.githubusercontent.com').intercept({path:'/approved.bin'}).reply(200,'abc', {headers:{'content-length':'3','content-type':'application/octet-stream'}}).persist();
 const storage=await mkdtemp(join(tmpdir(),'c2c-claims-'));
 mock.get('https://raw.githubusercontent.com').intercept({path:'/metadata.bin'}).reply(200,'abc',{headers:{'content-length':'3','content-type':'application/octet-stream; source=https://private.source/path'}}).persist();
 mock.get('https://raw.githubusercontent.com').intercept({path:'/oversized.bin'}).reply(200,'too large',{headers:{'content-length':'123','content-type':'application/octet-stream'}}).persist();
 const options={durableObjectsPersist:join(storage,'claims'),r2Persist:join(storage,'r2'),modules:true,script:code,compatibilityDate:'2026-01-01',r2Buckets:['STORAGE'],durableObjects:{CLAIMS:{className:'RemoteClaims',useSQLite:true}},bindings:{SIGNING_KEY:'synthetic-test-signing-secret-only',ACCOUNT_ID:'a',BUCKET_NAME:'bucket',PREFIX_SCOPE:'exact',CODE_DIGEST:'fixture-code-digest'},fetchMock:mock};let mf=new Miniflare(options);
 try{
  const url=(await mf.ready).origin,plan={state:'ready',codeDigest:'fixture-code-digest',verifiedTargets:{exact:{at:1,codeDigest:'fixture-code-digest'}},protocol:PROTOCOL,accountId:'a',bucketName:'bucket',url:'https://worker.fixture.workers.dev',secret:'synthetic-test-signing-secret-only'};
  const transport=createRemoteTransport({oauth:{authority:async()=>({sessionId:'s',accounts:[{id:'a'}]})},lookup:async()=>plan,pollIntervalMs:10,record:async value=>{if(process.env.C2C_DEBUG_TEST)console.error('TEST STAGE',value.state,value.stage,value.code);},fetch:async (u,o)=>mf.dispatchFetch(url+new URL(u).pathname,o)});
  const anonymous=await mf.dispatchFetch(url+'/remote-save',{method:'POST',body:'not-authorized'});assert.equal(anonymous.status,403);assert.equal((await anonymous.json()).code,'CAPABILITY_DENIED');
  const foreign={...target,accountId:'foreign',connectionId:'cloudflare:foreign'},foreignSource={url:'https://raw.githubusercontent.com/approved.bin',filename:'foreign.bin'},foreignOperation=crypto.randomUUID(),foreignDestination=remoteDestination(foreign);
  const forgedScope=await signGrant(plan.secret,{protocol:PROTOCOL,use:'save',principal:'cloudflare:foreign',sessionId:'s',destination:foreignDestination,operationId:foreignOperation,sourceDigest:await digest(foreignSource),expiresAt:Date.now()+10000});
  const foreignResponse=await mf.dispatchFetch(url+'/remote-save',{method:'POST',headers:{authorization:'Bearer '+forgedScope,'content-type':'application/json'},body:JSON.stringify({operationId:foreignOperation,source:foreignSource,destination:foreignDestination})});assert.equal((await foreignResponse.json()).code,'BINDING_MISMATCH');
  const wrongScope=await transport.status({...target,prefix:'outside/'});assert.equal(wrongScope.state,'blocked');assert.equal((await (await mf.getR2Bucket('STORAGE')).list()).objects.length,0);
  assert.equal((await transport.status(target)).state,'READY');
  for(const prefix of ['exact/folder-one/','exact/folder-two/']){const added={...target,prefix};assert.equal((await transport.status(added)).state,'READY');const r=await transport.save({target:added,source:{url:'https://raw.githubusercontent.com/approved.bin',filename:'instant.bin'}});assert.equal(r.state,'verified',JSON.stringify(r));assert.equal(r.receipt.key,prefix+'instant.bin');assert.equal(await (await (await mf.getR2Bucket('STORAGE')).get(r.receipt.key)).text(),'abc');}
  const probeId=crypto.randomUUID(),probe=await transport.probe({target,operationId:probeId});assert.equal(probe.state,'verified',JSON.stringify(probe));const probeRecovered=await transport.probeStatus(target,probeId);assert.equal(probeRecovered.state,'verified',JSON.stringify(probeRecovered));
  const streamingEvidence=[];
  const operationId=crypto.randomUUID(),source={url:'https://raw.githubusercontent.com/approved.bin',filename:'雪.bin'};
  const selectedProvenance=menuProvenance({mode:'simple',entryId:'native-test-route',target,title:'Exact',menuPath:['Cloudflare','Exact'],presentationId:'selected-simple',destinationConfig:{label:'Exact'}});
  const result=await transport.save({target,operationId,source,provenance:selectedProvenance});assert.equal(result.state,'verified',JSON.stringify(result));assert.equal(result.receipt.key,'exact/雪.bin');
  const bucket=await mf.getR2Bucket('STORAGE'),object=await bucket.get(result.receipt.key);assert.equal(await object.text(),'abc');const storedMetadata={...object.customMetadata};assert.equal(storedMetadata.operationId,operationId);assert.equal(storedMetadata.sourceUrl,undefined);const actualProvenance=JSON.parse(storedMetadata.click2cloud);assert.equal(actualProvenance.entryId,'native-test-route');assert.equal(actualProvenance.originalFilename,'雪.bin');assert.equal(actualProvenance.storedFilename,'雪.bin');assert.deepEqual(result.receipt.provenance,actualProvenance);
  {
  // One canonical API -> real workerd/R2/DO -> File API -> History/GO TO.
  // OAuth/management discovery and source HTTPS are explicit local fixtures.
  const records=new Map(),reserved=new Set(),state={product:productState({defaultTarget:target}),configs:{simple:{destinations:[{id:'actual-r2',target}]},nested:{destinations:[]},depth:{scopes:[]}},generation:{desired:0,applied:null}};
  const current={read:async()=>structuredClone(state),setDesiredGeneration:async g=>{state.generation.desired=g;},acknowledgeGeneration:async g=>{state.generation.applied=g;},reserveOperation:async id=>{if(reserved.has(id))return false;reserved.add(id);return true;},recordRemoteResult:async value=>{records.set(value.operationId,structuredClone(value));return value;},readRemoteResult:async id=>records.get(id),readRemoteResults:async()=>[...records.values()]};
  const oauth={status:async()=>({state:'CONNECTED',accounts:[{id:'a'}]}),authority:async()=>({sessionId:'s',accounts:[{id:'a'}],scopes:[...CLOUDFLARE_SCOPES],scopeEvidence:'provider-returned'})};
  const fileApi=createClick2CloudFileApi({send:async()=>({ok:true}),http:{boundedFetch:fetch,request:async path=>{const u=new URL(path,'https://api.cloudflare.com');assert(u.pathname.startsWith('/accounts/a/r2/buckets/bucket/objects'));const page=await bucket.list({prefix:u.searchParams.get('prefix')??''});return Response.json({success:true,result:{objects:page.objects.map(o=>({key:o.key,size:o.size,etag:o.etag,uploaded:o.uploaded.toISOString()})),truncated:false,cursor:''}});}}});
  const chrome={runtime:{},contextMenus:{create:(_p,cb)=>cb(),removeAll:cb=>cb(),onClicked:{addListener(){},removeListener(){}}}},registrar=createChromeRegistrar({chrome});
  const engine=createEngine({current,registrar,getAuthorization:async()=>({sessionId:'s',authorizedTargets:[target]}),remoteSave:transport.save,onVerifiedCompletion:current.recordRemoteResult});
  const domain=createCloudflareOnboarding({current,oauth,transport,provisioner:{},history:current.readRemoteResults});
  const api=createEngineApi({engine,current,oauth,fileApi,cloudflare:domain,authorize:async()=>true,confirm:async()=>true,getInventory:async()=>({scopes:[{target:{...target,prefix:''},authorized:true,workerReady:true,folders:['exact/']}]})});
  await api.reconcile();const native=registrar.inspect(),leaf=native.desired.rows.find(r=>r.role==='save');assert(leaf.enabled);assert.equal(native.acknowledgedGeneration,native.desired.generation);
  const call=(method,params={})=>api.invoke({version:'3+1.1',method,params},'gui');
  const saved=await call('dispatchSave',{generation:native.acknowledgedGeneration,itemId:leaf.id,context:'link',source:{url:'https://raw.githubusercontent.com/approved.bin',filename:'api-parity.bin'},idempotencyKey:'actual-local-r2-save'});assert.equal(saved.state,'completed',JSON.stringify(saved));assert.equal(saved.data.completion,'verified');
  const history=await call('inspectRemoteHistory'),record=history.data.find(r=>r.receipt?.key==='exact/api-parity.bin');assert(record);const inspected=await call('inspectRemoteReceipt',{operationId:record.operationId});assert.equal(inspected.data.reconciliation.state,'verified');
  const go=await call('openRemoteResult',{operationId:record.operationId}),listing=await call('listFolders',{source:go.data.target});assert.equal(go.data.highlightKey,record.receipt.key);assert(listing.data.data.entries.some(e=>e.key===record.receipt.key));assert.equal(await (await bucket.get(record.receipt.key)).text(),'abc');
  if(process.env.C2C_PARITY_EVIDENCE){await mkdir(process.env.C2C_PARITY_EVIDENCE,{recursive:true});await writeFile(join(process.env.C2C_PARITY_EVIDENCE,'local-worker-api-proof.json'),JSON.stringify({evidenceClass:'ACTUAL_LOCAL_WORKERD_R2_DO_WITH_SIMULATED_OAUTH_MANAGEMENT_AND_SOURCE_NOT_LIVE_CLOUDFLARE',saveState:saved.state,completion:saved.data.completion,nativeACK:'simulated Chrome callbacks acknowledged',key:record.receipt.key,size:record.receipt.size,independentReadback:'abc',reconciliation:inspected.data.reconciliation.state,explorerFound:true,historyFound:true,goToKey:go.data.highlightKey},null,2)+'\n');}
  }
  const replay=await transport.save({target,operationId,source});assert.equal(replay.state,'uncertain');assert.equal(replay.code,'OPERATION_ALREADY_CLAIMED');assert.equal((await transport.inspectOperation(target,operationId)).state,'verified');await mf.dispose();mf=new Miniflare(options);await mf.ready;assert.equal((await transport.save({target,operationId,source})).code,'OPERATION_ALREADY_CLAIMED');
  const second=await transport.save({target,source});assert.equal(second.state,'verified');assert.match(second.receipt.key,/^exact\/雪-[a-f0-9-]+\.bin$/);
  const truncated=await transport.save({target,source:{url:'https://raw.githubusercontent.com/oversized.bin',filename:'oversized.bin'}});assert.notEqual(truncated.state,'verified');assert.equal(await (await mf.getR2Bucket('STORAGE')).head('exact/oversized.bin'),null);
  const raced=await Promise.all([0,1,2].map(()=>transport.save({target,source:{...source,filename:'collision.bin'}})));assert(raced.every(r=>r.state==='verified'||r.state==='failed'&&r.code==='CONFLICT'));assert(raced.some(r=>r.state==='verified'));assert.equal(new Set(raced.filter(r=>r.state==='verified').map(r=>r.receipt.key)).size,raced.filter(r=>r.state==='verified').length);
  const metadata=await transport.save({target,source:{url:'https://raw.githubusercontent.com/metadata.bin',filename:'metadata.bin'}});assert.equal(metadata.state,'verified');const metadataObject=await (await mf.getR2Bucket('STORAGE')).head(metadata.receipt.key);assert.equal(metadataObject.httpMetadata.contentType,'application/octet-stream');assert.equal(metadataObject.customMetadata.sourceUrl,undefined);assert(!JSON.stringify(metadataObject.customMetadata).includes('private.source'));
  for(const [host,path,size] of [['www.python.org','large.bin',70*1024*1024],['nodejs.org','unknown.bin',9*1024*1024],...(process.env.C2C_LONG_TEST?[['www.rust-lang.org','slow.bin',67]]:[])]){
   const started=Date.now(),large=await transport.save({target,source:{url:'https://'+host+'/'+path,filename:path}});assert.equal(large.state,'verified',JSON.stringify(large));assert.equal(large.receipt.size,size);
   const obj=await (await mf.getR2Bucket('STORAGE')).get(large.receipt.key),reader=obj.body.getReader();let read=0;while(true){const part=await reader.read();if(part.done)break;read+=part.value.length;assert(part.value.every(b=>b===37));}assert.equal(read,size);if(path==='slow.bin')assert(Date.now()-started>65000);streamingEvidence.push({host,path,size,readbackBytes:read,allBytes:37,state:large.state,durationMs:Date.now()-started,key:large.receipt.key});
  }
  const denied=await transport.save({target,source:{url:'https://127.0.0.1/private',filename:'denied'}});assert.notEqual(denied.state,'verified');
  const state={configs:{...configs,simple:{destinations:[{target}]}},product:productState({menuCustomized:true}),generation:{desired:0,applied:null}};
  const current={read:async()=>state,setDesiredGeneration:async n=>{state.generation.desired=n;},acknowledgeGeneration:async n=>{state.generation.applied=n;}};
  const chrome={runtime:{},contextMenus:{create:(_p,cb)=>cb(),removeAll:cb=>cb(),onClicked:{addListener(){},removeListener(){}}}};
  let browserReads=0;const engine=createEngine({current,registrar:createChromeRegistrar({chrome}),getAuthorization:async()=>({sessionId:'s',authorizedTargets:[target]}),remoteSave:transport.save,fetchSource:()=>{browserReads++;},authorizeSource:()=>{browserReads++;return true;}});
  const spec=await engine.compile({mode:'composite',inventory:{scopes:[{target,authorized:true,workerReady:true,folders:['exact/']}]}});await engine.apply(spec);
  const endToEnd=await engine.save({itemId:spec.rows.find(r=>r.role==='save').id,generation:spec.generation,source:{...source,filename:'engine.bin'}});assert.equal(endToEnd.state,'completed',JSON.stringify(endToEnd));assert.equal(browserReads,0);assert(endToEnd.timings.dispatchPreparationMs>=0);assert.match(endToEnd.remoteOperationId,/^[a-f0-9-]{36}$/);
  await transport.revoke(target);assert.equal((await transport.save({target,source})).state,'blocked');
  if(process.env.C2C_RUNTIME_EVIDENCE_DIR){const dir=process.env.C2C_RUNTIME_EVIDENCE_DIR;await mkdir(dir,{recursive:true});await writeFile(join(dir,'local-runtime.json'),JSON.stringify({evidenceClass:'INTEGRATION_WORKERD_NOT_LIVE_R2',storage:'local R2 and persistent SQLite Durable Object',source:'injected public-source response; production TLS egress replaced explicitly in this test',streamingEvidence,probe:{state:probe.state,recovered:probeRecovered.state},first:{state:result.state,receipt:result.receipt,timings:result.timings,durationMs:result.durationMs},engine:{state:endToEnd.state,receipt:endToEnd.receipt,remoteOperationId:endToEnd.remoteOperationId,timings:endToEnd.timings,durationMs:endToEnd.durationMs},restartClaim:'OPERATION_ALREADY_CLAIMED',anonymous:'CAPABILITY_DENIED',foreignAccount:'BINDING_MISMATCH',privateSource:denied.state,truncated:truncated.state,concurrentCollisions:raced.map(r=>({state:r.state,code:r.code,key:r.receipt?.key})),revocation:'blocked',browserCaptureCalls:browserReads,metadata:Object.keys(storedMetadata)},null,2)+'\n');}
 }finally{await mf.dispose();await mock.close();await rm(storage,{recursive:true,force:true});}
});


test('native onboarding fragments retain the exact trusted app sender boundary',()=>{const runtime={id:'installed',getURL:p=>'chrome-extension://installed/'+p},sender={id:'installed',documentId:'document',url:runtime.getURL('extension/app.html')};assert(trustedAppSender(runtime,sender));assert(trustedAppSender(runtime,{...sender,url:sender.url+'#cloudflare'}));for(const altered of [{id:'other'},{documentId:''},{url:'https://host/extension/app.html'},{url:sender.url+'?other'},{url:runtime.getURL('extension/mirror.html')}])assert.equal(trustedAppSender(runtime,{...sender,...altered}),false);});

test('production TLS egress module loads in actual workerd with node compatibility (no network proof)',async()=>{
 const code=(await build({entryPoints:['src/cloudflare/worker.mjs'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',external:['node:*','cloudflare:*']})).outputFiles[0].text;
 const mf=new Miniflare({modules:true,script:code,compatibilityDate:'2026-01-01',compatibilityFlags:['nodejs_compat'],r2Buckets:['STORAGE'],durableObjects:{CLAIMS:{className:'RemoteClaims',useSQLite:true}},bindings:{SIGNING_KEY:'fixture'}});
 try{await mf.ready;const response=await mf.dispatchFetch('https://worker.invalid/remote-save',{method:'POST'});assert.equal(response.status,403);assert.equal((await response.json()).code,'CAPABILITY_DENIED');}finally{await mf.dispose();}
});
