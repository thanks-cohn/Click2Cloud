import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {Miniflare} from 'miniflare';
import {createRemoteTransport} from '../src/cloudflare/transport.mjs';import {remoteDestination,PROTOCOL} from '../src/cloudflare/wire.mjs';
import {createFileTransport} from '../src/cloudflare/file-transport.mjs';import {createClick2CloudFileApi} from '../src/explorer/index.mjs';
import {createEngineApi} from '../src/api/service.mjs';import {createVerifiedBucket} from '../src/cloudflare/inventory.mjs';
import {productState} from '../src/api/config.mjs';
const target={provider:'cloudflare',connectionId:'cloudflare:a',accountId:'a',bucketName:'bucket',prefix:'root/'};
test('actual workerd/R2 through canonical File API: folder, copy, keep-both, rename, folder move, delete, idempotence and scope',async()=>{
 const code=(await build({entryPoints:['src/cloudflare/worker.mjs'],bundle:true,write:false,format:'esm',platform:'browser'})).outputFiles[0].text;
 const mf=new Miniflare({modules:true,script:code,compatibilityDate:'2026-01-01',r2Buckets:['STORAGE'],durableObjects:{CLAIMS:{className:'RemoteClaims',useSQLite:true}},bindings:{SIGNING_KEY:'synthetic-files-only',ACCOUNT_ID:'a',BUCKET_NAME:'bucket',PREFIX_SCOPE:'root'}});
 try{
 const url=(await mf.ready).origin,bucket=await mf.getR2Bucket('STORAGE');await bucket.put('root/a.txt','abc',{customMetadata:{original:'preserved'}});await bucket.put('outside/private.txt','private');
 const oauth={status:async()=>({state:'CONNECTED',accounts:[{id:'a'}]}),authority:async()=>({sessionId:'s',accounts:[{id:'a'}]})};
 const remote=createRemoteTransport({oauth,lookup:async()=>({state:'ready',protocol:PROTOCOL,accountId:'a',bucketName:'bucket',url:'https://file.fixture.workers.dev',secret:'synthetic-files-only'}),fetch:(u,o)=>mf.dispatchFetch(url+new URL(u).pathname,o),pollIntervalMs:5});
 const send=createFileTransport({remote}),fileApi=createClick2CloudFileApi({send,http:{request:async()=>{},boundedFetch:fetch}}),records=new Map(),operations=new Set();
 const current={read:async()=>({product:productState(),configs:{simple:{destinations:[]},nested:{destinations:[]},depth:{scopes:[]}}}),reserveOperation:async id=>{if(operations.has(id))return false;operations.add(id);return true;},recordRemoteResult:async v=>records.set(v.operationId,v)};
 let authorized=true,confirmed=true;const api=createEngineApi({engine:{},current,oauth,fileApi,authorize:async()=>authorized,confirm:async()=>confirmed});
 const call=async(action,p={})=>api.invoke({version:'3+1.1',method:'fileAction',params:{action,source:target,idempotencyKey:crypto.randomUUID(),...p}},'gui');
 let r=await call('mkdir',{name:'dest'});assert.equal(r.state,'completed',JSON.stringify(r));assert(await bucket.head('root/dest/.redown'));
 r=await call('copy',{entry:{key:'root/a.txt',folder:false},destination:{...target,prefix:'root/dest/'}});assert.equal(r.state,'completed',JSON.stringify(r));assert.equal(await (await bucket.get('root/dest/a.txt')).text(),'abc');assert.equal((await bucket.head('root/dest/a.txt')).customMetadata.original,'preserved');
 r=await call('copy',{entry:{key:'root/a.txt',folder:false},destination:{...target,prefix:'root/dest/'}});assert.equal(r.state,'completed',JSON.stringify(r));assert.equal((await bucket.list({prefix:'root/dest/a'})).objects.length,2);
 r=await call('copy',{entry:{key:'root/a.txt',folder:false},destination:{...target,prefix:'root/dest/'},conflict:'replace'});assert.equal(r.state,'completed',JSON.stringify(r));assert.equal(await (await bucket.get('root/dest/a.txt')).text(),'abc');
 r=await call('rename',{entry:{key:'root/dest/a.txt',folder:false},name:'b.txt',source:{...target,prefix:'root/dest/'}});assert.equal(r.state,'completed',JSON.stringify(r));assert.equal(await bucket.head('root/dest/a.txt'),null);assert.equal(await (await bucket.get('root/dest/b.txt')).text(),'abc');
 r=await call('move',{entry:{key:'root/dest/',folder:true},destination:{...target,prefix:'root/moved/'}});assert.equal(r.state,'completed',JSON.stringify(r));assert.equal((await bucket.list({prefix:'root/dest/'})).objects.length,0);assert.equal(await (await bucket.get('root/moved/dest/b.txt')).text(),'abc');
 r=await call('delete',{entry:{key:'root/moved/',folder:true}});assert.equal(r.state,'completed',JSON.stringify(r));assert.equal((await bucket.list({prefix:'root/moved/'})).objects.length,0);
 assert.equal((await call('copy',{entry:{key:'outside/private.txt',folder:false},destination:target})).code,'SOURCE_SCOPE_MISMATCH');
 confirmed=false;assert.equal((await call('delete',{entry:{key:'root/a.txt',folder:false}})).code,'CONFIRMATION_REQUIRED');confirmed=true;authorized=false;assert.equal((await call('delete',{entry:{key:'root/a.txt',folder:false}})).code,'PERMISSION_DENIED');authorized=true;
 const idempotencyKey='same-delete',params={entry:{key:'root/a.txt',folder:false},idempotencyKey};assert.equal((await call('delete',params)).state,'completed');assert.equal((await call('delete',params)).code,'FILE_RETRY_REQUIRES_INSPECTION');assert.equal(await (await bucket.get('outside/private.txt')).text(),'private');
 const forbidden={operationId:crypto.randomUUID(),action:'mkdir',sourcePrefix:'',destinationPrefix:'',name:'escape',conflict:'keep',destination:remoteDestination(target)};assert.equal((await remote.files({target,intent:forbidden})).code,'FILE_SCOPE_MISMATCH');assert.equal(await bucket.head('escape/.redown'),null);
 }finally{await mf.dispose();}
});

test('cross-bucket copy and folder move stream through independently bound R2 stores',async()=>{
 const code=(await build({entryPoints:['src/cloudflare/worker.mjs'],bundle:true,write:false,format:'esm',platform:'browser'})).outputFiles[0].text;
 const mf=new Miniflare({modules:true,script:code,compatibilityDate:'2026-01-01',r2Buckets:['STORAGE','SOURCE_STORAGE'],
  durableObjects:{CLAIMS:{className:'RemoteClaims',useSQLite:true}},bindings:{
   SIGNING_KEY:'synthetic-cross-bucket-only',ACCOUNT_ID:'a',BUCKET_NAME:'archive',PREFIX_SCOPE:'',SOURCE_BUCKET_NAME:'bucket',CODE_DIGEST:'test-build'}});
 try{
  await mf.ready;
  const src=await mf.getR2Bucket('SOURCE_STORAGE'),dst=await mf.getR2Bucket('STORAGE');
  const destination={...target,bucketName:'archive',prefix:'receiving/'};
  await src.put('root/source.txt','cross-bucket bytes',{customMetadata:{original:'preserved'}});
  await src.put('root/dir/.redown','');await src.put('root/dir/nested/a.txt','nested');
  await dst.put('receiving/source.txt','old object');
  const approved=[];
  const oauth={status:async()=>({state:'CONNECTED',accounts:[{id:'a'}]}),authority:async()=>({sessionId:'s',accounts:[{id:'a'}]})};
  const remote=createRemoteTransport({oauth,expectedCodeDigest:'test-build',pollIntervalMs:5,
   lookup:async(t,sourceBucket)=>t.bucketName==='archive'&&sourceBucket==='bucket'?{state:'ready',protocol:PROTOCOL,
    accountId:'a',bucketName:'archive',sourceBucket,codeDigest:'test-build',url:'https://pair.fixture.workers.dev',secret:'synthetic-cross-bucket-only'}:null,
   verifyAuthority:async t=>{approved.push(t.bucketName);return true;},fetch:(url,options)=>mf.dispatchFetch(url,options)});
  const fileApi=createClick2CloudFileApi({send:createFileTransport({remote}),http:{request:async()=>assert.fail('no browser bytes'),boundedFetch:fetch}});
  const api=createEngineApi({engine:{},current:{reserveOperation:async()=>true,read:async()=>assert.fail('No menu configuration needed')},
   fileApi,oauth,authorize:async()=>true,confirm:async()=>true});
  const call=(action,entry,extra={})=>api.invoke({version:'3+1.1',method:'fileAction',params:{action,entry,source:target,destination,
   idempotencyKey:crypto.randomUUID(),...extra}},'gui');
  const result=await call('copy',{key:'root/source.txt',folder:false});assert.equal(result.state,'completed',JSON.stringify(result));
  const key=result.data.data.receipt.key;
  assert.equal(await (await dst.get(key)).text(),'cross-bucket bytes');
  assert.equal(await (await dst.head(key)).customMetadata.original,'preserved');
  assert.equal(await (await dst.get('receiving/source.txt')).text(),'old object');
  assert(await src.head('root/source.txt'));
  const moved=await call('move',{key:'root/dir/',folder:true});assert.equal(moved.state,'completed',JSON.stringify(moved));
  assert.equal(await (await dst.get('receiving/dir/nested/a.txt')).text(),'nested');
  assert(await dst.head('receiving/dir/.redown'));assert.equal((await src.list({prefix:'root/dir/'})).objects.length,0);
  assert.deepEqual(new Set(approved),new Set(['archive','bucket']));
  const wrong=await call('copy',{key:'root/source.txt',folder:false},{destination:{...destination,bucketName:'unbound'}});
  assert.equal(wrong.code,'WORKER_SETUP_REQUIRED');
  const anonymous=await mf.dispatchFetch('https://pair.fixture.workers.dev/files',{method:'POST',body:'{}'});
  assert.equal(anonymous.status,403);
 }finally{await mf.dispose();}
});

test('Create Bucket reads back the exact authorized name after a lost reply and does not replay POST',async()=>{
 const calls=[];let exists=false;
 const oauth={authority:async()=>({accounts:[{id:'a'}],scopes:['workers-r2.write']}),
  request:async(path,options={})=>{
   const method=options.method??'GET';calls.push([method,path]);
   if(method==='POST'){assert.deepEqual(JSON.parse(options.body),{name:'new-bucket'});exists=true;throw Error('reply lost');}
   return exists?Response.json({success:true,result:{name:'new-bucket'}}):Response.json({success:false},{status:404});
  }};
 assert.equal((await createVerifiedBucket(oauth,{accountId:'a',name:'new-bucket'})).code,'BUCKET_VERIFIED');
 assert.equal((await createVerifiedBucket(oauth,{accountId:'a',name:'new-bucket'})).code,'BUCKET_ALREADY_EXISTS');
 assert.deepEqual(calls,[['GET','/accounts/a/r2/buckets/new-bucket'],['POST','/accounts/a/r2/buckets'],
  ['GET','/accounts/a/r2/buckets/new-bucket'],['GET','/accounts/a/r2/buckets/new-bucket']]);
 await assert.rejects(createVerifiedBucket(oauth,{accountId:'wrong',name:'new-bucket'}),{code:'INSUFFICIENT_SCOPE'});
});

test('Make Default leaves the existing destination untouched if exact readiness is denied',async()=>{
 const next={...target,prefix:'new/'};
 const current={read:async()=>({product:productState({defaultTarget:target}),
  configs:{simple:{destinations:[]},nested:{destinations:[]},depth:{scopes:[]}}}),
  findRetry:async()=>null,commitProduct:async()=>assert.fail('default must not be committed')};
 const api=createEngineApi({engine:{},current,authorize:async()=>true,confirm:async()=>true,
  getInventory:async()=>({scopes:[{target,authorized:true,folders:['new/']}]}),
  prepareFileWorker:async selected=>{assert.deepEqual(selected,next);throw Object.assign(Error(),{code:'INSUFFICIENT_SCOPE'});}});
 const reply=await api.invoke({version:'3+1.1',method:'commitConfigChange',params:{
  changes:[{type:'makeDefault',target:next}],expectedRevision:0,idempotencyKey:'change-default'}},'gui');
 assert.equal(reply.code,'INSUFFICIENT_SCOPE');
 assert.deepEqual((await current.read()).product.defaultTarget,target);
});
