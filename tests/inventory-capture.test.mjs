import test from 'node:test';
import assert from 'node:assert/strict';
import {createInventoryDiscovery} from '../src/inventory/discovery.mjs';
import {captureSelectedBytes} from '../src/core/source-capture.mjs';
const target=accountId=>({provider:'cloudflare',connectionId:'connection',accountId,bucketName:'same'});
test('inventory resumes pagination fairly across same-named buckets without writes or implicit authorization',async()=>{
  const calls=[],events=[];
  const api={run:async(op,input)=>{
    calls.push([op,input]);
    if(input.source.accountId==='broken')return {state:'failed',error:'private-token'};
    if(input.source.prefix)return {state:'completed',data:{entries:[],cursor:''}};
    return {state:'completed',data:{entries:[{folder:true,key:input.cursor?'B/':'A/'}],cursor:input.cursor?'':'next'}};
  }};
  const d=createInventoryDiscovery({fileApi:api,sink:e=>events.push(e)});
  d.begin([target('a'),target('broken')]);
  assert.equal((await d.resume({pageBudget:2,operationId:1})).state,'partial');
  assert.equal(calls[1][1].source.accountId,'broken');
  const out=await d.resume({pageBudget:10,operationId:1});
  assert.equal(out.state,'partial');
  assert.deepEqual(out.snapshot.scopes[0].folders,['A','B']);
  assert.equal(out.snapshot.scopes[0].complete,true);
  assert.equal(out.snapshot.scopes[0].authorized,false);
  assert.equal(out.snapshot.scopes[1].reason,'INVENTORY_PAGE_FAILED');
  assert(calls.every(c=>c[0]==='list'));
  assert(!JSON.stringify(events).includes('private-token'));
  assert(Object.isFrozen(out.snapshot.scopes[0].folders));
});
test('repeated cursors, malformed paths and budget limits retain known inventory as incomplete',async()=>{
  for(const reason of ['CURSOR_REPEATED','INVENTORY_INVALID_PATH','INVENTORY_BUDGET']) {
    const d=createInventoryDiscovery({maxFolders:1,fileApi:{run:async()=>({state:'completed',data:{entries:reason==='INVENTORY_INVALID_PATH'?[{folder:true,key:'../escape/'}]:reason==='INVENTORY_BUDGET'?[{folder:true,key:'A/'},{folder:true,key:'B/'}]:[],cursor:reason==='CURSOR_REPEATED'?'same':''}})}});
    d.begin([target('a')]);const out=await d.resume({operationId:1});
    assert.equal(out.state,'partial');assert.equal(out.snapshot.scopes[0].reason,reason);
    assert.equal(out.snapshot.scopes[0].complete,false);
  }
});
test('read cancellation and concurrent scan are explicit; diagnostic sink cannot break discovery',async()=>{
  let release;const d=createInventoryDiscovery({sink(){throw Error('sink');},fileApi:{run:()=>new Promise(r=>{release=r;})}});
  d.begin([target('a')]);const work=d.resume({operationId:1});
  assert.equal((await d.resume()).code,'SCAN_BUSY');
  assert.throws(()=>d.begin([target('b')]),{code:'SCAN_BUSY'});
  release({state:'completed',data:{entries:[]}});assert.equal((await work).state,'completed');
  d.begin([target('b')]);assert.equal((await d.resume({signal:AbortSignal.abort()})).state,'cancelled');
});
test('source bytes remain exact; no provenance in capture output; source permission always checked',async()=>{
  const bytes=Uint8Array.of(0,255,17),events=[];
  const source={filename:'original.png',bytes,url:'https://private.example/image',pageUrl:'https://private.example/page'};
  const out=await captureSelectedBytes(source,{maxBytes:1024,authorizeSource:async()=>true,sink:e=>events.push(e),operationId:1});
  assert.equal(out.bytes,bytes);assert.deepEqual(Object.keys(out),['filename','contentType','bytes']);
  assert(!JSON.stringify(events).includes('private.example'));
  await assert.rejects(captureSelectedBytes(source),{code:'CAPTURE_DENIED'});
  await assert.rejects(captureSelectedBytes(source,{maxBytes:1024,authorizeSource:()=>false}),{code:'CAPTURE_DENIED'});
});
test('capture source failures, redirects, size limits and aborts are distinguishable and safe',async()=>{
  const options={authorizeSource:()=>true,operationId:1,sink(){throw Error('sink');}};
  for(const [source,extra,code]of [
    [{filename:'a',url:'file:///etc/passwd'},{},'CAPTURE_DENIED'],
    [{filename:'../a',bytes:new Uint8Array()},{},'CAPTURE_INVALID'],
    [{filename:'a',bytes:new Uint8Array(2)},{maxBytes:1},'CAPTURE_SIZE_LIMIT'],
    [{filename:'a',bytes:new Uint8Array()},{signal:AbortSignal.abort()},'CAPTURE_INTERRUPTED'],
    [{filename:'a',url:'https://source.test'},{fetchSource:async()=>({ok:false})},'CAPTURE_UNAVAILABLE']
  ]) await assert.rejects(captureSelectedBytes(source,{maxBytes:1024,...options,...extra}),{code});
  let cancelled=false;
  const stream=new ReadableStream({start(c){c.enqueue(Uint8Array.of(1,2));},cancel(){cancelled=true;}});
  await assert.rejects(captureSelectedBytes({filename:'a',url:'https://source.test'},{...options,maxBytes:1,fetchSource:async(url,init)=>{assert.equal(init.redirect,'error');assert.equal(init.credentials,'omit');return {ok:true,body:stream};}}),{code:'CAPTURE_SIZE_LIMIT'});
  assert(cancelled);
});
