import test from 'node:test';import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';import {build} from 'esbuild';
import {createWorker} from '../right2cloud-module/src/cloudflare-worker.mjs';
import {createRemoteSaver} from '../right2cloud-module/src/index.mjs';
import {createEngineApi} from '../src/api/service.mjs';import {productState} from '../src/api/config.mjs';
const destination={provider:'cloudflare-r2',connectionId:'cloudflare:a',accountId:'a',bucketName:'redown',prefix:'',conflictPolicy:'keep-both'},operationId='receipt-failure-0001';
const intent={operationId,destination,source:{url:'https://public.org/private?secret=never-export',filename:'file.txt'}};
test('successful read-only inspection completes independently of blocked stored transfer; errors remain errors',async()=>{
 const saved={state:'blocked',code:'REQUEST_FAILED',operationId,destination};let broken=false;
 const current={read:async()=>({product:productState(),configs:{simple:{destinations:[]},nested:{destinations:[]},depth:{scopes:[]}}}),readRemoteResult:async()=>saved};
 const api=createEngineApi({engine:{},current,authorize:async()=>true,cloudflare:{receipt:async()=>{if(broken)throw Object.assign(Error(),{code:'TRANSPORT_UNAVAILABLE'});return {...saved,reconciliation:{...saved}};}}});
 const call=()=>api.invoke({version:'3+1.1',method:'inspectRemoteReceipt',params:{operationId}},'gui');
 const r=await call();assert.equal(r.state,'completed');assert.equal(r.code,'OK');assert.equal(r.data.state,'blocked');assert.equal(r.data.code,'REQUEST_FAILED');assert.equal(r.data.reconciliation.state,'blocked');assert.equal(saved.state,'blocked');
 broken=true;assert.equal((await call()).code,'TRANSPORT_UNAVAILABLE');assert.equal((await call()).state,'failed');assert.equal(saved.code,'REQUEST_FAILED');
});
test('unexpected pre-write exceptions identify bounded stage; saver retains safe diagnostics',async()=>{
 for(const stage of ['source.fetch','destination.prepare']){
  let writes=0;const writer={kind:destination.provider,capabilities:{conditionalCreate:true},prepare:async()=>{if(stage==='destination.prepare')throw TypeError('secret destination path');return {key:'file.txt'};},write:async()=>{writes++;}};
  const worker=createWorker({authenticate:async()=>({destination,expiresAt:Date.now()+60000,storage:{}}),claimOperation:async()=>true,recheckAuthorization:async()=>true,writer:()=>writer,fetch:async()=>{if(stage==='source.fetch')throw TypeError(intent.source.url);return new Response('abc');}});
  const response=await (await worker.fetch(new Request('https://internal/remote-save',{method:'POST',body:JSON.stringify(intent)}),{})).json();assert.equal(response.state,'blocked');assert.equal(response.code,'REMOTE_STAGE_FAILED');assert.equal(response.diagnostic.stage,stage);assert.equal(response.diagnostic.errorKind,'TypeError');assert.equal(writes,0);assert(!JSON.stringify(response).includes('never-export'));assert(!JSON.stringify(response).includes('secret destination'));
  const cap={destination,expiresAt:Date.now()+60000};const saver=createRemoteSaver({authorize:async()=>true,getPreparedWorkerCapability:async()=>cap,recheckAuthorization:async()=>true,authenticatedRequest:async()=>({...response,diagnostic:{...response.diagnostic,url:intent.source.url,message:'secret'}})});
  const result=await saver(intent);assert.deepEqual(result.diagnostic,response.diagnostic);assert(!JSON.stringify(result).includes('never-export'));
 }
});
test('actual workerd production egress handles DNS redirects without unsupported redirect:error; no TLS or R2 write',async()=>{
 const code=(await build({stdin:{contents:`import {publicFetch} from './src/cloudflare/public-egress.mjs';export default {async fetch(){try{await publicFetch('https://public.org/file');return Response.json({unexpected:true});}catch(e){return Response.json({code:e.code,sourceStage:e.sourceStage,httpStatus:e.httpStatus});}}}`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',external:['node:*','cloudflare:*']})).outputFiles[0].text;

 const mf=new Miniflare({modules:true,script:code,compatibilityDate:'2026-01-01',compatibilityFlags:['nodejs_compat'],outboundService:()=>new Response(null,{status:302,headers:{location:'https://private.invalid/'}})});
 try{const r=await (await mf.dispatchFetch('https://fixture/')).json();assert.deepEqual(r,{code:'SOURCE_DNS_UNAVAILABLE',sourceStage:'dns',httpStatus:302});}finally{await mf.dispose();}
});

test('actual workerd confirms the former ALPN option throws before a TLS connection',async()=>{
 const mf=new Miniflare({modules:true,script:`import {connect} from 'node:tls';export default {fetch(){try{connect({host:'1.1.1.1',port:443,servername:'public.org',rejectUnauthorized:true,ALPNProtocols:['http/1.1']});return Response.json({unexpected:true});}catch(e){return Response.json({code:e.code});}}}`,compatibilityDate:'2026-01-01',compatibilityFlags:['nodejs_compat']});
 try{assert.deepEqual(await (await mf.dispatchFetch('https://fixture/')).json(),{code:'ERR_OPTION_NOT_IMPLEMENTED'});}finally{await mf.dispose();}
});
test('workerd native TLS transport pins IP, verifies original hostname and parses a streamed HTTP response',async()=>{
 const code=(await build({stdin:{contents:`import {createPublicEgress} from './src/cloudflare/public-egress.mjs';export default {async fetch(){const r=await createPublicEgress({resolve:async()=>['93.184.216.34']})('https://public.org/file');return Response.json({body:await r.text(),calls:globalThis.tlsCalls});}}`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',external:['node:*'],plugins:[{name:'explicit-native-socket-fixture',setup(b){b.onResolve({filter:/^cloudflare:sockets$/},()=>({path:'socket',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`globalThis.tlsCalls=[];export function connect(address,options){tlsCalls.push({address,options});let opened=false;return {opened:Promise.resolve().then(()=>{opened=true;}),closed:Promise.resolve(),startTls(tls){if(!opened)throw Error('TLS_BEFORE_TCP_OPEN');tlsCalls.push({tls});return {opened:Promise.resolve(),closed:Promise.resolve(),close:async()=>{},readable:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('HTTP/1.1 200 OK\\r\\nContent-Length: 3\\r\\nContent-Type: text/plain\\r\\n\\r\\nabc').buffer);c.close();}}),writable:new WritableStream({write(){}})};}};}`}));}}]})).outputFiles[0].text;
 const mf=new Miniflare({modules:true,script:code,compatibilityDate:'2026-01-01',compatibilityFlags:['nodejs_compat']});
 try{const r=await (await mf.dispatchFetch('https://fixture/')).json();assert.equal(r.body,'abc');assert.deepEqual(r.calls,[{address:{hostname:'93.184.216.34',port:443},options:{secureTransport:'starttls',allowHalfOpen:true}},{tls:{expectedServerHostname:'public.org'}}]);}finally{await mf.dispose();}
});
