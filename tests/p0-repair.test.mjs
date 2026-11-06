import test from 'node:test';
import assert from 'node:assert/strict';
import {Duplex} from 'node:stream';
import {createPublicEgress} from '../src/cloudflare/public-egress.mjs';
import {publicAddress,sourceURL} from '../src/cloudflare/public-address.mjs';
import {sourceFetch} from '../right2cloud-module/src/source-fetch.mjs';
import {compileMenuSpec} from '../src/core/menu-spec.mjs';
import {productState} from '../src/api/config.mjs';
import {createEngineApi} from '../src/api/service.mjs';
import {createEngine} from '../src/core/engine.mjs';
import {createChromeRegistrar} from '../src/chrome/registrar.mjs';
import {createCloudflareOnboarding} from '../src/cloudflare/onboarding.mjs';
import {RemoteClaims} from '../src/cloudflare/worker.mjs';
import {signGrant,remoteDestination,PROTOCOL} from '../src/cloudflare/wire.mjs';
const target={provider:'cloudflare',connectionId:'cloudflare:a',accountId:'a',bucketName:'photos',prefix:'chosen/'};
const empty=()=>({simple:{destinations:[]},nested:{destinations:[]},depth:{scopes:[]}});
const providers=['Google Drive','Dropbox','OneDrive','Cloudflare R2'];
function fakeTLS(response,{authorized=true}={}){
 const calls=[];return {calls,connect(options){const socket=new Duplex({read(){},write(data,encoding,done){calls.push({request:data.toString()});socket.push(Buffer.from(response));socket.push(null);done();}});socket.authorized=authorized;socket.setTimeout=ms=>{calls.push({idle:ms});};calls.push({options});queueMicrotask(()=>socket.emit('secureConnect'));return socket;}};
}
test('public address classification blocks special-use IPv4/IPv6 including encoded URL literals',()=>{
 for(const ip of ['127.0.0.1','10.0.0.1','100.64.0.1','169.254.169.254','172.16.1.1','192.168.0.1','192.0.2.1','198.18.0.1','198.51.100.1','203.0.113.1','224.1.1.1','255.255.255.255','::1','::ffff:8.8.8.8','64:ff9b::a00:1','fc00::1','fe80::1','ff02::1','2001:db8::1','2002::1','3fff::1'])assert.equal(publicAddress(ip),false,ip);
 for(const ip of ['1.1.1.1','8.8.8.8','93.184.216.34','2606:4700:4700::1111','2001:4860:4860::8888'])assert(publicAddress(ip),ip);
 for(const url of ['https://127.1/','https://0x7f000001/','https://2130706433/','https://user:secret@public.org/','http://public.org/'])assert.throws(()=>sourceURL(url));
});
test('three unrelated public HTTPS hosts connect to validated literal IP with original SNI and no credentials',async()=>{
 for(const host of ['www.python.org','nodejs.org','www.rust-lang.org']){
  const tls=fakeTLS('HTTP/1.1 200 OK\r\nContent-Length: 3\r\n\r\nabc');
  const fetch=createPublicEgress({resolve:async()=>['93.184.216.34'],connect:tls.connect});const r=await fetch('https://'+host+'/file?q=1#fragment');assert.equal(await r.text(),'abc');
  assert.equal(tls.calls[0].options.host,'93.184.216.34');assert.equal(tls.calls[0].options.servername,host);assert.equal(tls.calls[0].options.rejectUnauthorized,true);
  const request=tls.calls.find(x=>x.request).request;assert(request.includes('GET /file?q=1 HTTP/1.1'));assert(!/Cookie:|Authorization:|Referer:|fragment/i.test(request));
 }
});
test('DNS rebinding/mixed/private answers never reach TLS and an untrusted certificate fails closed',async()=>{
 let connects=0;for(const addresses of [['10.0.0.1'],['93.184.216.34','127.0.0.1'],['::ffff:127.0.0.1'],[]]){const f=createPublicEgress({resolve:async()=>addresses,connect:()=>{connects++;}});await assert.rejects(f('https://public.org/file'),{code:'SOURCE_ADDRESS_DENIED'});}assert.equal(connects,0);
 const tls=fakeTLS('',{authorized:false});await assert.rejects(createPublicEgress({resolve:async()=>['93.184.216.34'],connect:tls.connect})('https://public.org/file'),{code:'SOURCE_TLS_DENIED'});
});
test('chunked public response is streamed and ambiguous HTTP framing is rejected',async()=>{
 const good=fakeTLS('HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n3\r\nabc\r\n2\r\nde\r\n0\r\n\r\n');const r=await createPublicEgress({resolve:async()=>['8.8.8.8'],connect:good.connect})('https://public.org/file');assert.equal(await r.text(),'abcde');assert.equal(r.headers.get('content-length'),null);
 const bad=fakeTLS('HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nContent-Length: 3\r\n\r\nabc');await assert.rejects(createPublicEgress({resolve:async()=>['8.8.8.8'],connect:bad.connect})('https://public.org/file'),{code:'SOURCE_HTTP_INVALID'});
});
test('more than five safe redirects work; cycles and private redirects fail closed',async()=>{
 const s=await sourceFetch('https://public.org/0',{fetch:async u=>{const i=Number(new URL(u).pathname.slice(1));return i<8?new Response(null,{status:302,headers:{location:'/'+(i+1)}}):new Response('done');}});assert.equal(await new Response(s.body).text(),'done');
 await assert.rejects(sourceFetch('https://public.org/0',{fetch:async()=>new Response(null,{status:302,headers:{location:'https://127.0.0.1/'}})}),{code:'SOURCE_DENIED'});
});
test('actual API create/delete, migrated revision and restart retain permanent four providers',async()=>{
 let state={product:productState({revision:7}),configs:empty(),generation:{desired:0,applied:null}};
 const current={read:async()=>structuredClone(state),findRetry:async()=>null,commitProduct:async n=>{state={...state,product:{...n.product,revision:state.product.revision+1},configs:n.configs};return {};},setDesiredGeneration:async g=>{state.generation.desired=g;},acknowledgeGeneration:async g=>{state.generation.applied=g;}};
 const make=()=>{const chrome={runtime:{},contextMenus:{create:(_p,cb)=>cb(),removeAll:cb=>cb(),onClicked:{addListener(){},removeListener(){}}}},registrar=createChromeRegistrar({chrome});const engine=createEngine({current,registrar,getAuthorization:async()=>null});const api=createEngineApi({engine,current,authorize:async()=>true,confirm:async()=>true,getInventory:async()=>({scopes:[{target,authorized:true,workerReady:false,folders:['chosen/']}] }),recovery:{writeVerified:async()=>({})}});return {api,engine};};
 const verify=async api=>{const r=await api.invoke({version:'3+1.1',method:'previewNativeMenu',params:{}},'gui');assert.deepEqual(r.data.rows.filter(r=>r.role==='provider-action').map(r=>r.label),providers);};let {api}=make();await verify(api);
 const change=changes=>api.invoke({version:'3+1.1',method:'commitConfigChange',params:{changes,expectedRevision:state.product.revision,idempotencyKey:crypto.randomUUID()}},'gui');
 assert.equal((await change([{type:'createDestination',mode:'simple',target}])).state,'completed');await verify(api);const id=state.configs.simple.destinations[0].id;await change([{type:'deleteDestinationConfig',mode:'simple',id}]);await verify(api);({api}=make());await api.reconcile();await verify(api);assert(state.product.cloudflare.removed.includes('a'));
});
test('customized never-initialized menu offers initial setup; explicit removal and chosen account win',async()=>{
 const state={product:productState({menuCustomized:true}),configs:empty()};let opens=0,saves=0;
 const oauth={authority:async()=>({sessionId:'s',accounts:[{id:'a'}]}),status:async()=>({state:'CONNECTED',accounts:[{id:'a'}]}),request:async()=>Response.json({success:true,result:{buckets:[{name:'photos'}]}})};
 const c=createCloudflareOnboarding({current:{read:async()=>state},oauth,transport:{status:async()=>({state:'READY'}),save:async()=>{saves++;return {state:'verified',operationId:'fixture',destination:remoteDestination(target)};}},provisioner:{},openShelf:async()=>{opens++;}});
 assert.equal((await c.check()).state,'SETUP_APPROVAL_REQUIRED');state.product.defaultTarget=target;state.product.cloudflare.selectedAccountId='other';assert.equal((await c.check()).state,'READY');assert.equal((await c.invoke({provider:'cloudflare',source:{url:'https://public.org/file',filename:'file'}})).state,'completed');assert.equal(saves,1);assert.equal(opens,0);state.product.defaultTarget=null;state.product.cloudflare.removed=['a'];state.product.cloudflare.selectedAccountId='a';assert.equal((await c.check()).state,'CHOOSE_DESTINATION');
});
test('prepared-key recovery after a missing receipt independently checks operation ID and size',async()=>{
 const data=new Map(),tasks=[],storage={get:async k=>data.get(k),put:async(k,v)=>{if(v.result?.state==='written')throw Error('injected result loss');data.set(k,v);},transaction:async fn=>fn(storage)};
 const d=remoteDestination(target),id=crypto.randomUUID();let head={key:'chosen/file',size:3,etag:'e',version:'v',customMetadata:{operationId:id}};
 const cap={protocol:PROTOCOL,use:'status',principal:target.connectionId,sessionId:'s',destination:d,expiresAt:Date.now()+120000};
 const obj=new RemoteClaims({storage,waitUntil:p=>tasks.push(p)},{SIGNING_KEY:'fixture-secret',ACCOUNT_ID:'a',BUCKET_NAME:'photos',PREFIX_SCOPE:'chosen',STORAGE:{head:async()=>head}});
 data.set('claim:'+target.connectionId+':'+id,{stage:'writing',destination:d,key:head.key,expectedSize:3,sessionId:'s',leaseUntil:Date.now()+1000});
 const response=await obj.fetch(new Request('https://private.workers.dev/operation',{method:'POST',headers:{authorization:'Bearer '+await signGrant('fixture-secret',cap)},body:JSON.stringify({operationId:id})}));assert.equal((await response.json()).state,'verified');head={...head,customMetadata:{operationId:'other'}};assert.equal((await obj.operation({...cap,storage:obj.env.STORAGE},id)).state,'uncertain');
});
test('actual outer Worker receipt persistence failure cannot claim blocked/no-write after PUT',async()=>{
 const data=new Map(),objects=new Map(),tasks=[];let writes=0;
 const kv={get:async k=>data.get(k),put:async(k,v)=>{if(v.result?.state==='written')throw Error('injected receipt persistence failure');data.set(k,v);},transaction:async fn=>fn(kv)};
 const r2={head:async k=>objects.get(k)??null,put:async(k,body,options)=>{const bytes=new Uint8Array(await new Response(body).arrayBuffer());writes++;const result={key:k,size:bytes.length,etag:'e',version:'v',customMetadata:options.customMetadata};objects.set(k,result);return result;}};
 const id=crypto.randomUUID(),d=remoteDestination(target),source={url:'https://public.org/file',filename:'file'},env={SIGNING_KEY:'fixture-secret',ACCOUNT_ID:'a',BUCKET_NAME:'photos',PREFIX_SCOPE:'chosen',STORAGE:r2};
 const {digest}=await import('../src/cloudflare/wire.mjs');
 const token=await signGrant(env.SIGNING_KEY,{protocol:PROTOCOL,use:'save',principal:target.connectionId,sessionId:'s',destination:d,expiresAt:Date.now()+120000,operationId:id,sourceDigest:await digest(source)});
 class Fixed extends TransformStream{constructor(){super();}}
 const obj=new RemoteClaims({storage:kv,waitUntil:p=>tasks.push(p)},env,{fetch:async()=>new Response('abc',{headers:{'content-length':'3'}}),FixedLengthStream:Fixed});
 const submitted=await obj.fetch(new Request('https://worker/remote-save',{method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify({operationId:id,source,destination:d})}));assert.equal((await submitted.json()).state,'pending');await Promise.all(tasks);assert.equal(writes,1);const job=data.get('claim:'+target.connectionId+':'+id);assert.equal(job.result.state,'uncertain');assert.equal(job.result.code,'RESULT_PERSISTENCE_UNCONFIRMED');assert.equal((await obj.operation({principal:target.connectionId,destination:d,storage:r2},id)).state,'verified');
});
test('ranged download uses the canonical File API and rejects ignored ranges without buffering whole objects',async()=>{
 const {createClick2CloudFileApi}=await import('../src/explorer/index.mjs');let requested;
 const fileApi=createClick2CloudFileApi({send:async()=>({}),http:{boundedFetch:()=>{},request:async(_url,o)=>{requested=o.headers.Range;return new Response('abc',{status:206,headers:{'content-range':'bytes 10-12/13'}});}}});
 const api=createEngineApi({engine:{},current:{read:async()=>({product:productState(),configs:empty()})},fileApi,oauth:{status:async()=>({state:'CONNECTED',accounts:[{id:'a'}]})},authorize:async()=>true});
 const response=await api.invoke({version:'3+1.1',method:'readFileChunk',params:{source:target,key:'chosen/file',offset:10,length:3}},'gui');assert.equal(response.state,'completed');assert.equal(response.data.state,'completed');assert.deepEqual(response.data.data.bytes,[97,98,99]);assert.equal(response.data.data.done,true);assert.equal(requested,'bytes=10-12');
 const denied=await api.invoke({version:'3+1.1',method:'readFileChunk',params:{source:target,key:'other/file',offset:0}},'gui');assert.equal(denied.code,'SOURCE_SCOPE_MISMATCH');
});
test('clearing default preserves provider access and an explicit removal tombstone',async()=>{
 let state={product:productState({defaultTarget:target}),configs:empty(),generation:{desired:0,applied:null}};
 const current={read:async()=>state,findRetry:async()=>null,commitProduct:async n=>{state={...state,product:{...n.product,revision:state.product.revision+1}};return {};}};
 const api=createEngineApi({current,engine:{compile:async()=>({}),apply:async()=>({state:'completed'})},getInventory:async()=>({scopes:[]}),authorize:async()=>true,recovery:{writeVerified:async()=>({})}});
 const result=await api.invoke({version:'3+1.1',method:'commitConfigChange',params:{changes:[{type:'clearDefault'}],expectedRevision:0,idempotencyKey:'clear'}},'gui');assert.equal(result.state,'completed');assert.equal(state.product.defaultTarget,null);assert(state.product.cloudflare.removed.includes('a'));
 assert.deepEqual(compileMenuSpec({mode:'composite',product:state.product,configs:state.configs,inventory:{scopes:[]}}).rows.map(r=>r.label),providers);
});
test('source signature canonicalization permits API contentType without allowing changed source intent',async()=>{
 const {canonicalSource}=await import('../right2cloud-module/src/common.mjs'),{digest}=await import('../src/cloudflare/wire.mjs');const source={url:'https://public.org/file',filename:'file',contentType:'text/plain'};
 const destination=remoteDestination(target),id=crypto.randomUUID(),token=await signGrant('fixture-secret',{protocol:PROTOCOL,use:'save',principal:target.connectionId,sessionId:'s',destination,operationId:id,sourceDigest:await digest(canonicalSource(source)),expiresAt:Date.now()+120000});
 const obj=new RemoteClaims({storage:{get:async()=>null}},{SIGNING_KEY:'fixture-secret',ACCOUNT_ID:'a',BUCKET_NAME:'photos',PREFIX_SCOPE:'chosen',STORAGE:{}}),request=new Request('https://worker/remote-save',{headers:{authorization:'Bearer '+token}});
 assert(await obj.authenticate(request,{operationId:id,destination,source:canonicalSource(source)}));await assert.rejects(obj.authenticate(request,{operationId:id,destination,source:{...canonicalSource(source),url:'https://other.org/file'}}),{code:'CAPABILITY_DENIED'});
});
test('exact folder proof is required for READY, not merely an old bucket-wide timestamp',async()=>{
 const {createRemoteTransport}=await import('../src/cloudflare/transport.mjs');const plan={state:'ready',protocol:PROTOCOL,accountId:'a',bucketName:'photos',url:'https://private.fixture.workers.dev',secret:'fixture-secret',codeDigest:'build',verifiedAt:1};
 const remote=createRemoteTransport({oauth:{authority:async()=>({sessionId:'s',accounts:[{id:'a'}]})},lookup:async()=>plan,fetch:async()=>Response.json({state:'completed',protocol:PROTOCOL,destination:remoteDestination(target),storageBound:true,durableClaims:true,conditionalCreate:true,codeDigest:'build'})});
 assert.equal((await remote.status(target)).state,'PREPARED');plan.verifiedTargets={chosen:{codeDigest:'build',at:Date.now()}};assert.equal((await remote.status(target)).state,'READY');
});
test('memory-derived admission backpressure rejects before claim or source fetch, not by file size',async()=>{
 const {JOB_CAPACITY,JOB_MEMORY_BUDGET}=await import('../src/cloudflare/resources.mjs');assert.equal(JOB_CAPACITY,Math.floor((JOB_MEMORY_BUDGET.isolateBytes-JOB_MEMORY_BUDGET.reservedBytes)/JOB_MEMORY_BUDGET.perJobBytes));
 const id=crypto.randomUUID(),d=remoteDestination(target),source={url:'https://public.org/file',filename:'file'},{digest}=await import('../src/cloudflare/wire.mjs');let claims=0,fetches=0;
 const obj=new RemoteClaims({storage:{get:async()=>null,transaction:async()=>{claims++;}},waitUntil(){}},{SIGNING_KEY:'fixture',ACCOUNT_ID:'a',BUCKET_NAME:'photos',PREFIX_SCOPE:'chosen',STORAGE:{}},{fetch:async()=>{fetches++;}});obj.admitted=JOB_CAPACITY;
 const token=await signGrant('fixture',{protocol:PROTOCOL,use:'save',principal:target.connectionId,sessionId:'s',destination:d,expiresAt:Date.now()+120000,operationId:id,sourceDigest:await digest(source)});
 const r=await obj.fetch(new Request('https://worker/remote-save',{method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify({operationId:id,destination:d,source})}));assert.equal((await r.json()).code,'RESOURCE_BUSY');assert.equal(claims,0);assert.equal(fetches,0);
});
test('HTTP early hints are consumed before the actual file response',async()=>{
 const tls=fakeTLS('HTTP/1.1 103 Early Hints\r\nLink: </a>\r\n\r\nHTTP/1.1 200 OK\r\nContent-Length: 3\r\n\r\nabc');const r=await createPublicEgress({resolve:async()=>['93.184.216.34'],connect:tls.connect})('https://public.org/file');assert.equal(r.status,200);assert.equal(await r.text(),'abc');
});
test('real local Node TLS verifies original hostname while the connection selector stays a literal IP',async()=>{
 const {mkdtemp,readFile,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{execFileSync}=await import('node:child_process'),tls=await import('node:tls');const directory=await mkdtemp(join(tmpdir(),'c2c-tls-'));
 let server;try{
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout','key.pem','-out','cert.pem','-subj','/CN=public.org','-addext','subjectAltName=DNS:public.org','-days','1'],{cwd:directory,stdio:'ignore'});
  const cert=await readFile(join(directory,'cert.pem')),key=await readFile(join(directory,'key.pem'));
  server=tls.createServer({key,cert},socket=>{socket.on('error',()=>{});socket.once('data',()=>socket.end('HTTP/1.1 200 OK\r\nContent-Length: 3\r\n\r\nabc'));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const fetch=createPublicEgress({resolve:async()=>['93.184.216.34'],connect:options=>{assert.equal(options.host,'93.184.216.34');return tls.connect({...options,host:'127.0.0.1',port:server.address().port,ca:cert});}});
  assert.equal(await (await fetch('https://public.org/file')).text(),'abc');await assert.rejects(fetch('https://wrong-host.org/file'),{code:'SOURCE_EGRESS_UNAVAILABLE'});
 }finally{if(server)await new Promise(r=>server.close(r));await rm(directory,{recursive:true,force:true});}
});
test('browser streaming port handles more than 32MiB with backpressure and no provenance in provider payload',async()=>{
 const {captureSelectedStream}=await import('../src/core/source-capture.mjs'),{dispatchSave}=await import('../src/core/save-dispatcher.mjs');let produced=0,stored=0;const total=40*1024*1024;
 const file=await captureSelectedStream({filename:'large.bin',url:'https://private-source-name.test/file'},{authorizeSource:async()=>true,fetchSource:async()=>new Response(new ReadableStream({pull(c){if(produced===total){c.close();return;}const n=Math.min(65536,total-produced);produced+=n;c.enqueue(new Uint8Array(n));}}),{headers:{'content-length':String(total)}})});
 assert.equal(produced,65536); // fetch Response may prefetch one chunk; it never buffers the whole file.
 const result=await dispatchSave({intent:{provider:'structural-browser-test',accountId:'a',connectionId:'test:a',bucketName:'photos',path:'chosen'},file},{authorize:async()=>true,providers:{'structural-browser-test':{uploadStream:async payload=>{assert(!('bytes' in payload));assert(!('url' in payload));assert(!JSON.stringify(Object.keys(payload)).includes('source'));const reader=payload.body.getReader();while(true){const part=await reader.read();if(part.done)break;stored+=part.value.length;}return {confirmed:true,id:'simulated-destination'};},verifyReceipt:async()=>({verified:true,independent:true,byteLength:stored,destinationMatches:true,evidenceClass:'provider-readback'})}}});assert(result.confirmed);assert.equal(stored,total);assert(file.complete);
});
test('streaming upload cannot report verified without consuming the complete source',async()=>{
 const {captureSelectedStream}=await import('../src/core/source-capture.mjs'),{dispatchSave}=await import('../src/core/save-dispatcher.mjs');const file=await captureSelectedStream({filename:'file',bytes:Uint8Array.of(1,2,3)},{authorizeSource:async()=>true});
 try{await assert.rejects(dispatchSave({intent:{provider:'stream-test'},file},{authorize:async()=>true,providers:{'stream-test':{uploadStream:async()=>({confirmed:true}),verifyReceipt:async()=>({verified:true,independent:true,byteLength:0,destinationMatches:true,evidenceClass:'provider-readback'})}}}),{code:'RECEIPT_UNVERIFIED'});}finally{await file.cancel();}
});


test('bucket discovery traverses numeric and opaque pages without a 1000 bucket ceiling',async()=>{
 const {readBuckets}=await import('../src/cloudflare/inventory.mjs');const calls=[];
 const oauth={request:async path=>{calls.push(path);const q=new URL('https://fixture.invalid'+path).searchParams;return Response.json({success:true,result:{buckets:q.get('page')==='2'?[{name:'chosen'}]:Array.from({length:1000},(_,i)=>({name:'bucket-'+i}))},result_info:{total_pages:2}});}};
 const result=await readBuckets(oauth,'a');assert.equal(result.buckets.length,1001);assert.equal(result.buckets.at(-1).name,'chosen');assert.equal(calls.length,2);
 let page=0;const cursor=await readBuckets({request:async()=>Response.json({success:true,result:{buckets:[{name:String(page++)}],...(page===1?{cursor:'next'}:{})}})},'a');assert.equal(cursor.buckets.length,2);
 await assert.rejects(readBuckets({request:async()=>Response.json({success:true,result:{buckets:[],cursor:'same'}})},'a'),{code:'PROVIDER_CURSOR_REPEATED'});
});

test('native click waits for cold-boot reconciliation before resolving current ACK',async()=>{
 const {createChromeRegistrar}=await import('../src/chrome/registrar.mjs');let release,dispatched=0;const boot=new Promise(ok=>release=ok);
 const chrome={runtime:{},contextMenus:{create:(_p,cb)=>cb(),removeAll:cb=>cb(),onClicked:{addListener(){},removeListener(){}}}};
 const registrar=createChromeRegistrar({chrome,beforeClick:()=>boot,dispatch:async()=>{dispatched++;return {state:'blocked',code:'PROVIDER_NOT_IMPLEMENTED'};}});
 const spec=compileMenuSpec({mode:'composite',product:productState(),configs:{simple:{destinations:[]},nested:{destinations:[]},depth:{scopes:[]}},inventory:{scopes:[]},generation:1});
 const click=registrar.handleClick({menuItemId:spec.rows[0].id,linkUrl:'https://public.org/file'});await Promise.resolve();assert.equal(dispatched,0);await registrar.apply(spec);release();assert.equal((await click).code,'PROVIDER_NOT_IMPLEMENTED');assert.equal(dispatched,1);
});

test('download continuation binds the original ETag and refuses changed range objects',async()=>{
 const {createR2Adapter}=await import('../src/explorer/r2-adapter.mjs');let header;
 const adapter=createR2Adapter({http:{request:async(_path,options)=>{header=options.headers['If-Match'];return new Response('abc',{status:206,headers:{'content-range':'bytes 3-5/6',etag:'"changed"'}});}}});
 await assert.rejects(adapter.readChunk({source:target,key:'chosen/file',offset:3,length:3,etag:'"original"'}),/OBJECT_CHANGED/);assert.equal(header,'"original"');
});
