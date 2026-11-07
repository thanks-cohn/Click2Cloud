import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {Miniflare} from 'miniflare';
import {createRemoteTransport} from '../src/cloudflare/transport.mjs';import {remoteDestination,PROTOCOL} from '../src/cloudflare/wire.mjs';
import {createFileTransport} from '../src/cloudflare/file-transport.mjs';import {createClick2CloudFileApi} from '../src/explorer/index.mjs';
import {createEngineApi} from '../src/api/service.mjs';import {productState} from '../src/api/config.mjs';
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
