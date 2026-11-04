import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatchSave,UnverifiedSaveError,SaveAuthorizationError} from '../src/core/save-dispatcher.mjs';
import {createFileApiSaveProvider} from '../src/explorer/save-provider.mjs';
import {observeFileApi,observeTransports} from '../src/explorer/observed-api.mjs';
import {createFileApi} from '../src/explorer/file-api.mjs';
import {createDashboardControls} from '../src/dashboard/controls.mjs';
import {createRedownDashboardBridge} from '../src/dashboard/redown-bridge.mjs';

const args=()=>({intent:{provider:'fixture',bucket:'b',path:'P/'},file:{filename:'x.bin',bytes:new Uint8Array([1,2,3])}});
const verified=()=>({verified:true,independent:true,destinationMatches:true,byteLength:3,evidenceClass:'provider-readback'});
function harness(sink) {
  const signals=[],calls=[];
  const diagnostics=sink===undefined?event=>{signals.push(event);return signals.length;}:sink;
  const adapter={upload:async payload=>{calls.push(['upload',payload]);return {confirmed:true,id:'fixture'};},verifyReceipt:async input=>{calls.push(['verify',input]);return verified();}};
  return {signals,calls,adapter,options:{providers:{fixture:adapter},diagnostics,authorize:async()=>true}};
}
test('save off/on/throwing diagnostics preserves exact provider bytes and verified business outcome',async()=>{
  for(const sink of [undefined,null,()=>{throw Error('broken sink');}]) {
    const h=harness(sink);let completion=0;
    const result=await dispatchSave(args(),{...h.options,onVerifiedCompletion:async()=>completion++});
    assert.equal(result.confirmed,true);assert.equal(completion,1);
    assert.equal(h.calls.length,2);assert.deepEqual([...h.calls[0][1].bytes],[1,2,3]);
    assert.deepEqual(Object.keys(h.calls[0][1]).sort(),['bytes','contentType','destination','filename']);
    assert.equal(JSON.stringify(h.signals).includes('x.bin'),false);
  }
});
test('dispatcher exposes invalid intent, auth failure/revocation, capability and verifier blocks without upload',async()=>{
  const h=harness();
  await assert.rejects(dispatchSave({intent:{}},h.options),TypeError);
  await assert.rejects(dispatchSave(args(),{...h.options,authorize:async()=>false}),SaveAuthorizationError);
  await assert.rejects(dispatchSave(args(),{...h.options,authorize:async()=>{throw Error('Bearer SECRET https://private.example/path');}}));
  await assert.rejects(dispatchSave(args(),{...h.options,providers:{}}),TypeError);
  await assert.rejects(dispatchSave(args(),{...h.options,providers:{fixture:{upload:async()=>assert.fail('must not write')}}}),{code:'VERIFIER_UNAVAILABLE'});
  assert.deepEqual(h.calls,[]);
  for(const code of ['INTENT_INVALID','AUTH_REVOKED','AUTH_CHECK_FAILED','PROVIDER_UNAVAILABLE','VERIFIER_UNAVAILABLE'])assert.ok(h.signals.some(e=>e.code===code));
  assert.equal(JSON.stringify(h.signals).includes('SECRET'),false);
});
test('upload failures/cancel/uncertainty and false confirmation never verify or commit feedback',async()=>{
  for(const [error,code,outcome] of [[Error('secret'),'UPLOAD_FAILED','failed'],[Object.assign(Error(),{uncertain:true}),'UPLOAD_UNCERTAIN','uncertain'],[Object.assign(Error(),{name:'AbortError'}),'UPLOAD_CANCELLED','cancelled']]){
    const h=harness();h.adapter.upload=async()=>{throw error;};h.adapter.verifyReceipt=async()=>assert.fail('must not verify');
    await assert.rejects(dispatchSave(args(),{...h.options,onVerifiedCompletion:()=>assert.fail('must not complete')}));
    assert.ok(h.signals.some(e=>e.code===code&&e.outcome===outcome));
  }
  const h=harness();h.adapter.upload=async()=>({confirmed:false});
  await assert.rejects(dispatchSave(args(),h.options),{code:'UPLOAD_UNCONFIRMED'});
  assert.ok(h.signals.some(e=>e.code==='UPLOAD_UNCONFIRMED'&&e.outcome==='uncertain'));
});
test('Boolean receipt, mismatched destination/bytes and unavailable final readback cannot count as saved',async()=>{
  for(const evidence of [true,{verified:true},{...verified(),independent:false},{...verified(),byteLength:4},{...verified(),destinationMatches:false},{...verified(),evidenceClass:'synthetic'}]) {
    const h=harness();h.adapter.verifyReceipt=async()=>evidence;
    await assert.rejects(dispatchSave(args(),{...h.options,onVerifiedCompletion:()=>assert.fail('must not complete')}),UnverifiedSaveError);
    assert.ok(h.signals.some(e=>e.code==='RECEIPT_MISMATCH'));
  }
  const h=harness();h.adapter.verifyReceipt=async()=>{throw Object.assign(Error('private URL'),{uncertain:true});};
  await assert.rejects(dispatchSave(args(),h.options));assert.ok(h.signals.some(e=>e.code==='VERIFY_UNCERTAIN'));
});
test('verified upload with failed History handoff stays verified and explicitly pending; no replay',async()=>{
  const h=harness();const result=await dispatchSave(args(),{...h.options,onVerifiedCompletion:async()=>{throw Error('History down');}});
  assert.equal(result.confirmed,true);assert.equal(result.completion,'pending');assert.equal(h.calls.filter(c=>c[0]==='upload').length,1);
  assert.ok(h.signals.some(e=>e.code==='HANDOFF_FAILED'));
});
test('independent provider faults retain distinct operation correlation and dependency chains',async()=>{
  const h=harness();const common={diagnostics:h.options.diagnostics,authorize:async()=>true};
  await Promise.allSettled([
    dispatchSave(args(),{...common,providers:{fixture:{upload:async()=>{throw Object.assign(Error(),{uncertain:true});},verifyReceipt:async()=>verified()}},context:{operationId:91}}),
    dispatchSave(args(),{...common,providers:{fixture:{upload:async()=>({confirmed:true}),verifyReceipt:async()=>false}},context:{operationId:92}})
  ]);
  assert.ok(h.signals.some(e=>e.operationId===91&&e.code==='UPLOAD_UNCERTAIN'));
  assert.ok(h.signals.some(e=>e.operationId===92&&e.code==='RECEIPT_MISMATCH'));
  for(const event of h.signals)assert.ok(event.requires.every(id=>id===0||h.signals[id-1].operationId===event.operationId));
});
test('existing File API run wrapper preserves all terminal states and discloses partial inventory',async()=>{
  const events=[];const diagnostics=e=>{events.push(e);return events.length;};
  for(const state of ['completed','failed','partial','uncertain','cancelled','unrecognized-private-value']){
    const expected={state,data:{entries:[{}],cursor:'opaque-secret-cursor'}};
    const api=observeFileApi({run:async()=>expected},{diagnostics});
    assert.equal(await api.run('list',{}),expected);
  }
  assert.ok(events.some(e=>e.code==='INVENTORY_PARTIAL'));
  assert.ok(events.some(e=>e.code==='FILE_API_UNKNOWN'&&e.outcome==='uncertain'));
  assert.equal(JSON.stringify(events).includes('opaque-secret-cursor'),false);
  assert.equal(JSON.stringify(events).includes('unrecognized-private-value'),false);
});
test('API progress, unsupported operations, rejected calls, batch uncertainty and throwing sink preserve semantics',async()=>{
  const events=[];const diagnostics=e=>{events.push(e);return events.length;};let runs=0;
  const underlying=createFileApi({upload:async(_,options)=>{options.onProgress?.({phase:'verifying'});runs++;throw Object.assign(Error('private-name'),{uncertain:true});}});
  const api=observeFileApi(underlying,{diagnostics});
  const out=await api.batch('upload',[{},{}],{batchConcurrency:1});
  assert.equal(out.processed,1);assert.equal(runs,1);assert.ok(events.some(e=>e.code==='BATCH_HALTED'));
  assert.ok(events.some(e=>e.code==='FILE_API_UNCERTAIN'));
  const unsupported=await api.run('no-op',{});assert.equal(unsupported.state,'failed');assert.ok(events.some(e=>e.code==='UNSUPPORTED_OPERATION'));
  const wrapped=observeFileApi({run:async()=>{throw Error('private');},batch:async()=>{throw Error('private');}},{diagnostics});
  await assert.rejects(wrapped.run('list',{}));await assert.rejects(wrapped.batch('list',[]));
  assert.ok(events.some(e=>e.code==='FILE_API_THROWN'));assert.ok(events.some(e=>e.code==='BATCH_FAILED'));
  const unchanged=observeFileApi(underlying,{diagnostics:()=>{throw Error();}});assert.equal((await unchanged.run('upload')).state,'uncertain');
});
test('transport wrappers do not log credentials, request bodies, URLs or hostile returned errors',async()=>{
  const events=[];const secret={token:'secret-placeholder',url:'https://private.example/object'};
  const send=async value=>{assert.equal(value,secret);return {ok:false,error:'Bearer VERYSECRET'};};
  const originalHttp={request:async()=>({ok:true}),boundedFetch:async()=>{throw Object.assign(Error('VERYSECRET'),{uncertain:true});}};
  const wrapped=observeTransports({send,http:originalHttp},{diagnostics:e=>{events.push(e);return events.length;}});
  assert.equal((await wrapped.send(secret)).ok,false);await wrapped.http.request(secret.url,{body:secret});await assert.rejects(wrapped.http.boundedFetch(secret.url));
  const serialized=JSON.stringify(events);for(const canary of ['secret-placeholder','private.example','VERYSECRET'])assert.equal(serialized.includes(canary),false);
  assert.ok(events.some(e=>e.code==='TRANSPORT_UNCERTAIN'));assert.ok(events.some(e=>e.code==='TRANSPORT_REJECTED'));
});
test('REDOWN upload adaptation independently verifies the FINAL destination bytes and rejects fabricated receipts',async()=>{
  const bytes=new Uint8Array([1,2,3]);const hash=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');
  const calls=[];let mismatch=false;
  const api={run:async(operation,input,options)=>{
    calls.push({operation,input});
    if(operation==='upload')return {state:'completed',id:'upload1',data:{key:'P/x.bin',verification:'staged bytes'}};
    if(operation==='stat')return {state:'completed',data:{object:{key:'P/x.bin',size:3,etag:'stable'}}};
    await options.onChunk(mismatch?new Uint8Array([9,2,3]):bytes);
    return {state:'completed',data:{size:3}};
  }};
  const provider=createFileApiSaveProvider({fileApi:api,resolveDestination:async()=>({accountId:'a',bucketName:'b',prefix:'P/'})});
  const destination={bucket:'b',path:'P/'};const receipt=await provider.upload({destination,filename:'x.bin',contentType:'application/octet-stream',bytes});
  const evidence=await provider.verifyReceipt({receipt,destination,bytes});assert.equal(evidence.verified,true);
  assert.deepEqual(calls.map(c=>c.operation),['upload','stat','readStream','stat']);
  assert.equal((await provider.verifyReceipt({receipt:{...receipt},destination,bytes})).verified,false);
  mismatch=true;assert.equal((await provider.verifyReceipt({receipt,destination,bytes})).verified,false);
});
test('Dashboard instrumented failures do not leak auth and do not activate from Refresh',async()=>{
  const events=[];let activate=0;
  const controller=createDashboardControls({fileApi:{run:async()=>({state:'failed',error:'Bearer secret-canary',code:'UNAVAILABLE'})},readAuth:async()=>({accessToken:'secret-canary'}),readActivation:async()=>({}),activateBuckets:async()=>activate++,diagnostics:e=>events.push(e)});
  assert.equal((await controller.refresh()).ok,false);assert.equal(activate,0);
  assert.ok(events.some(e=>e.code==='AUTH_VERIFIED'));assert.ok(events.some(e=>e.code==='REFRESH_FAILED'));
  assert.equal(JSON.stringify(events).includes('secret-canary'),false);
  const bridge=createRedownDashboardBridge({chromeApi:{runtime:{sendMessage:async()=>assert.fail('no send'),getURL:p=>'chrome-extension://host/'+p},storage:{local:{get:async()=>({})}}},cloudflareApi:{request:async()=>{},boundedFetch:async()=>{}},pageUrl:'https://evil.example',diagnostics:e=>events.push(e)});
  await assert.rejects(bridge.activateBuckets({type:'activateAllBuckets',confirmed:true}),{code:'REDOWN_SENDER_REQUIRED'});
  assert.ok(events.some(e=>e.code==='SENDER_DENIED'));
});

test('actual extracted R2 upload + staged readback + final byte verification runs through observed transports',async()=>{
  const {createClick2CloudFileApi}=await import('../src/explorer/index.mjs');
  const store=new Map(),events=[],wire=[];
  const meta=(key,bytes)=>({key,size:bytes.byteLength,etag:'etag-'+[...bytes].join('-'),version:'fixture-version'});
  const http={
    boundedFetch:async()=>assert.fail('No historical source-URL ingest or direct Worker proxy needed'),
    async request(path,options={}){
      wire.push({path,method:options.method||'GET'});
      const url=new URL(path,'https://api.cloudflare.com');const marker='/objects';const at=url.pathname.indexOf(marker);
      assert.ok(at>0);const objectKey=url.pathname.slice(at+marker.length+1).split('/').map(decodeURIComponent).join('/');
      if(options.method==='PUT') {store.set(objectKey,new Uint8Array(await options.body.arrayBuffer()));return Response.json({success:true});}
      if(objectKey)return store.has(objectKey)?new Response(store.get(objectKey)):new Response(null,{status:404});
      const queryPrefix=url.searchParams.get('prefix')||'';
      return Response.json({success:true,result:{objects:[...store].filter(([key])=>key.startsWith(queryPrefix)).map(([key,bytes])=>meta(key,bytes)),cursor:''}});
    }
  };
  const send=async message=>{
    assert.equal(message.type,'cfTransferObjects');assert.equal(message.operation,'move');assert.equal(message.betaNoProvision,true);
    const source=message.entries[0].key,destinationKey=message.entries[0].destinationKey,bytes=store.get(source);
    assert.ok(bytes);store.set(destinationKey,bytes);store.delete(source);
    return {ok:true,completed:1,results:[{sourceKey:source,destinationKey,size:bytes.byteLength,status:'moved',verified:true}]};
  };
  const diagnostics=e=>{events.push(e);return events.length;};const context={operationId:501,generation:3};
  const transports=observeTransports({send,http},{diagnostics,context});
  const api=observeFileApi(createClick2CloudFileApi(transports),{diagnostics,context});
  const provider=createFileApiSaveProvider({fileApi:api,resolveDestination:async d=>({accountId:d.accountId,bucketName:d.bucket,prefix:d.path})});
  let completions=0;
  const result=await dispatchSave({intent:{provider:'cloudflare',accountId:'a',connectionId:'c',bucketName:'redown',prefix:'P/'},file:{filename:'x.bin',bytes:new Uint8Array([1,2,3])}},
    {providers:{cloudflare:provider},authorize:async()=>true,onVerifiedCompletion:async()=>completions++,diagnostics,context});
  assert.equal(result.confirmed,true);assert.equal(completions,1);assert.deepEqual([...store.get('P/x.bin')],[1,2,3]);
  assert.equal(wire.filter(w=>w.method==='PUT').length,1);assert.equal(wire.filter(w=>w.path.endsWith('/P/x.bin')).length,1);
  assert.ok(events.some(e=>e.code==='FILE_VERIFYING'));assert.ok(events.some(e=>e.code==='FILE_COMMITTING'));assert.ok(events.some(e=>e.code==='RECEIPT_VERIFIED'));
  assert.ok(events.every(e=>e.operationId===501));
  assert.equal(JSON.stringify(events).includes('x.bin'),false);
});
test('provider adapter rejects cross-account resolution and wrong parent/leaf receipts before success',async()=>{
  const bytes=new Uint8Array([1]);
  let uploads=0;
  const wrongAccount=createFileApiSaveProvider({fileApi:{run:async()=>{uploads++;}},resolveDestination:async()=>({accountId:'other',bucketName:'b',prefix:'P/'})});
  await assert.rejects(wrongAccount.upload({destination:{accountId:'a',bucket:'b',path:'P/'},filename:'x.bin',bytes}),{code:'DESTINATION_CHANGED'});assert.equal(uploads,0);
  for(const key of ['P/child/x.bin','P/other.bin','other/x.bin','P/x (1).bin']){
    const adapter=createFileApiSaveProvider({fileApi:{run:async()=>({state:'completed',id:'x',data:{key,verification:'present'}})},resolveDestination:async()=>({accountId:'a',bucketName:'b',prefix:'P/'})});
    await assert.rejects(adapter.upload({destination:{accountId:'a',bucket:'b',path:'P/'},filename:'x.bin',bytes}),{code:'UPLOAD_UNCONFIRMED'});
  }
});
test('two account discovery failures are both observed even when the first rejects early',async()=>{
  const events=[];
  const controller=createDashboardControls({fileApi:{run:async(op,input)=>op==='accounts'?{state:'completed',data:{accounts:[{id:'a'},{id:'b'}]}}:{state:'failed',code:'HTTP_403',error:'Private account name'}},
    readAuth:async()=>({accessToken:'do-not-log'}),readActivation:async()=>({}),activateBuckets:async()=>assert.fail('read only'),diagnostics:e=>{events.push(e);return events.length;}});
  assert.equal((await controller.refresh()).ok,false);
  const failures=events.filter(e=>e.code==='INVENTORY_PAGE_FAILED');assert.equal(failures.length,2);assert.notEqual(failures[0].operationId,failures[1].operationId);
  assert.equal(JSON.stringify(events).includes('Private account'),false);
});
test('source-backed provider failure catalog retains each material rejection category without private strings',async()=>{
  const {providerFailureManifest,classifyProviderFailure}=await import('../src/explorer/failure-classification.mjs');
  const events=[];
  for(const row of providerFailureManifest){
    assert.equal(classifyProviderFailure({error:row.messagePrefix+' PRIVATE-SECRET'}),row.code);
    const result={state:'failed',error:row.messagePrefix+' PRIVATE-SECRET'};
    const api=observeFileApi({run:async()=>result},{diagnostics:e=>{events.push(e);return events.length;}});
    assert.equal(await api.run('upload'),result);assert.ok(events.some(e=>e.code===row.code));
  }
  for(const [http,reason] of [['HTTP_401','PROVIDER_AUTH_REQUIRED'],['HTTP_403','PROVIDER_PERMISSION_DENIED'],['HTTP_404','PROVIDER_NOT_FOUND'],['HTTP_429','PROVIDER_RATE_LIMITED'],['HTTP_503','PROVIDER_UNAVAILABLE']])assert.equal(classifyProviderFailure({code:http}),reason);
  assert.equal(classifyProviderFailure({code:'secret',error:'PRIVATE-SECRET'}),'PROVIDER_FAILURE_UNKNOWN');
  assert.equal(JSON.stringify(events).includes('PRIVATE-SECRET'),false);
});
test('green connection-status gateway cannot conceal a blocked Worker child or legacy URL-forwarding privacy',async()=>{
  const events=[];const diagnostics=e=>{events.push(e);return events.length;};
  const api=observeFileApi({run:async()=>({state:'completed',data:{ready:false,reason:'PRIVATE NAME'}})},{diagnostics});
  await api.run('connectionStatus');assert.ok(events.some(e=>e.code==='FILE_API_COMPLETED'&&e.outcome==='ok'));
  assert.ok(events.some(e=>e.stage==='worker.capability'&&e.code==='WORKER_UNVERIFIED'&&e.outcome==='blocked'));
  await api.run('remoteIngest');assert.ok(events.some(e=>e.code==='PROVENANCE_SHARED_LEGACY'));
  assert.equal(JSON.stringify(events).includes('PRIVATE NAME'),false);
});
test('actual protected R2 listing rejects malformed pages, auth denial and repeated metadata cursors distinctly',async()=>{
  const {createClick2CloudFileApi}=await import('../src/explorer/index.mjs');
  const source={accountId:'a',bucketName:'b',prefix:''};
  for(const [body,status,operation,input,expected] of [
    [{success:true,result:{objects:null}},200,'list',{source},'LISTING_INVALID'],
    [{success:true,result:{objects:[],cursor:123}},200,'list',{source},'CURSOR_INVALID'],
    [{success:true,result:{objects:[],truncated:true,cursor:''}},200,'list',{source},'CURSOR_INCOMPLETE'],
    [{success:false,errors:[{code:'secret',message:'private'}]},403,'list',{source},'PROVIDER_PERMISSION_DENIED'],
    [{success:true,result:{objects:[],cursor:'repeat'}},200,'stat',{source,key:'wanted'},'CURSOR_INCOMPLETE']
  ]){
    const events=[];const api=observeFileApi(createClick2CloudFileApi({send:async()=>assert.fail('No write messages'),http:{request:async()=>Response.json(body,{status}),boundedFetch:async()=>assert.fail('No Worker writes')}}),{diagnostics:e=>{events.push(e);return events.length;}});
    const result=await api.run(operation,input);assert.equal(result.state,'failed');assert.ok(events.some(e=>e.code===expected),expected);
  }
});
test('actual protected R2 Worker gates distinguish missing preparation, rejected auth and capability mismatch',async()=>{
  const {createClick2CloudFileApi}=await import('../src/explorer/index.mjs');const source={accountId:'a',bucketName:'b',prefix:''};
  const profile={type:'cloudflare-r2',accountId:'a',bucketName:'b',workerUrl:'https://private.invalid',token:'never-log',workerVersion:5};
  for(const [profiles,status,body,expected] of [
    [[],200,{},'WORKER_NOT_PREPARED'],[[profile],403,{},'WORKER_AUTH_REJECTED'],[[profile],200,{ok:true,workerVersion:4,safeTransfers:false},'WORKER_CAPABILITY_MISMATCH']
  ]){
    const events=[];const api=observeFileApi(createClick2CloudFileApi({send:async()=>({ok:true,profiles}),http:{request:async()=>assert.fail('Not used'),boundedFetch:async()=>Response.json(body,{status})}}),{diagnostics:e=>{events.push(e);return events.length;}});
    const result=await api.run('connectionStatus',{source});assert.equal(result.state,'completed');assert.equal(result.data.ready,false);
    assert.ok(events.some(e=>e.stage==='worker.capability'&&e.code===expected&&e.outcome==='blocked'));assert.equal(JSON.stringify(events).includes('never-log'),false);
  }
});
test('actual extracted R2 adversarial staging corpus distinguishes extra, short, mismatched, stalled and unconfirmed bytes',async()=>{
  const {createClick2CloudFileApi}=await import('../src/explorer/index.mjs');const source={accountId:'a',bucketName:'b',prefix:''};
  for(const [fault,expected] of [
    ['ack','STAGING_UPLOAD_UNCONFIRMED'],['size','STAGING_SIZE_MISMATCH'],['unreadable','STAGING_READBACK_FAILED'],
    ['extra','STAGING_EXTRA_BYTES'],['short','STAGING_SHORT_READ'],['mismatch','STAGING_BYTES_MISMATCH'],['stall','STAGING_VERIFY_STALLED'],['final','FINAL_DESTINATION_UNCONFIRMED']
  ]){
    const events=[];let staging='';
    const http={boundedFetch:async()=>assert.fail('No direct Worker'),request:async(path,options={})=>{
      const url=new URL(path,'https://api.cloudflare.com');const at=url.pathname.indexOf('/objects');const key=decodeURIComponent(url.pathname.slice(at+9));
      if(options.method==='PUT'){staging=key;return Response.json({success:fault!=='ack'});}
      if(url.search)return Response.json({success:true,result:{objects:[{key:staging,size:fault==='size'?2:3,etag:'fixture'}],cursor:''}});
      if(fault==='unreadable')return new Response(null,{status:403});
      if(fault==='stall')return new Response(new ReadableStream({start(){}}));
      return new Response(new Uint8Array(fault==='extra'?[1,2,3,4]:fault==='short'?[1,2]:fault==='mismatch'?[9,2,3]:[1,2,3]));
    }};
    const api=observeFileApi(createClick2CloudFileApi({http,send:async message=>({ok:true,completed:fault==='final'?0:1,results:[{destinationKey:message.entries[0].destinationKey,size:3}]})}),{diagnostics:e=>{events.push(e);return events.length;}});
    const result=await api.run('upload',{source,key:'x.bin',file:new Blob([new Uint8Array([1,2,3])])},{verificationIdleTimeoutMs:10});
    assert.equal(result.state,'uncertain',fault);assert.ok(events.some(e=>e.code===expected),expected);
    assert.equal(events.some(e=>e.stage==='transfer.verify'&&e.outcome==='ok'),false);
    assert.equal(JSON.stringify(events).includes('.redown-beta-uploads'),false);
  }
});
