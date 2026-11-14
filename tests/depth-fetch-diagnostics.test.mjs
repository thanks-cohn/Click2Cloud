import test from 'node:test';
import assert from 'node:assert/strict';
import {safeFixtureError,dispatchDepthFixture} from './fixtures/depth-fetch-diagnostics.mjs';

test('fixture exception capture retains bounded cause/modules, never private exception text',()=>{
 const secret='SYNTHETIC_PRIVATE_SENTINEL';
 const cause=Object.assign(new Error(secret),{code:'UND_ERR_SOCKET'});
 cause.stack=`Error: ${secret}\n at fn (C:\\private\\${secret}\\node_modules\\undici\\lib\\dispatcher\\client-h1.js:19:7)\n at ${secret} (https://${secret}/private.mjs:1:2)`;
 const error=new TypeError('fetch failed',{cause});
 error.stack=`TypeError: fetch failed\n at fn (C:\\private\\${secret}\\node_modules\\miniflare\\dist\\src\\index.js:104599:22)\n at fn (/private/${secret}/tests/depth-plan-recovery.test.mjs:56:3)`;
 const captured=safeFixtureError(error);
 assert.equal(captured.name,'TypeError');assert.equal(captured.messageClass,'FETCH_FAILED');
 assert.deepEqual(captured.frames,[{module:'miniflare',line:104599,column:22},{module:'depth.fixture',line:56,column:3}]);
 assert.equal(captured.cause.code,'UND_ERR_SOCKET');assert.equal(captured.cause.frames[0].module,'undici.http1');
 assert(!JSON.stringify(captured).includes(secret));
 const hostile={name:secret,code:secret,message:secret,stack:secret};hostile.cause=hostile;
 assert.deepEqual(safeFixtureError(hostile),{name:'UNAVAILABLE',code:null,messageClass:'UNCLASSIFIED',frames:[],cause:null});
 const getters={get name(){throw Error(secret);},get cause(){throw Error(secret);}};
 assert.equal(safeFixtureError(getters).name,'UNAVAILABLE');
});

function fixture(mf){return {mf,fixtureId:2,lifecycle:'ready',requestCount:0,inFlight:0};}
const options=()=>({method:'POST',headers:{authorization:'Bearer SYNTHETIC_NOT_A_TOKEN'},body:'{}',signal:new AbortController().signal});
test('dispatch diagnostics preserve request identity, lifecycle, original error and single attempt',async()=>{
 let calls=0;const events=[],input=options(),cause=Object.assign(Error('private'),{code:'ECONNRESET'}),error=new TypeError('fetch failed',{cause});
 const worker=fixture({ready:Promise.resolve(new URL('http://127.0.0.1:12345')),dispatchFetch:async(url,received)=>{calls++;assert.equal(url,'http://127.0.0.1:12345/capabilities');assert.equal(received,input);throw error;}});
 await assert.rejects(dispatchDepthFixture(worker,'/capabilities',input,(stage,data)=>events.push({stage,...data}),true),e=>e===error);
 assert.equal(calls,1);assert.equal(worker.inFlight,0);
 const captured=events.at(-1);assert.equal(captured.boundary,'dispatchFetch');assert.equal(captured.error.cause.code,'ECONNRESET');assert.equal(captured.lifecycle,'ready');assert.equal(captured.signalAborted,false);assert.equal(captured.fixtureId,2);assert.equal(captured.inFlight,1);
 assert(!JSON.stringify(events).includes('SYNTHETIC_NOT_A_TOKEN'));
});
test('ready failure and response-trace failure are distinct from dispatchFetch failure',async()=>{
 for(const boundary of ['ready','trace.response.clone.json']){
  const events=[],error=new TypeError('Response.clone: Body has already been consumed.');let calls=0;
  const worker=fixture({get ready(){if(boundary==='ready')throw error;return Promise.resolve(new URL('http://127.0.0.1:12345'));},dispatchFetch:async()=>{calls++;return {clone(){throw error;}};}});
  await assert.rejects(dispatchDepthFixture(worker,'/capabilities',options(),(stage,data)=>events.push({stage,...data}),true),e=>e===error);
  assert.equal(events.at(-1).boundary,boundary);assert.equal(worker.inFlight,0);assert.equal(calls,boundary==='ready'?0:1);
 }
});
test('trace disabled retains original response and never clones/consumes it',async()=>{
 const response={clone(){assert.fail('No trace body read when tracing disabled');}};let calls=0;
 const worker=fixture({ready:Promise.resolve(new URL('http://127.0.0.1:12345')),dispatchFetch:async()=>{calls++;return response;}});
 assert.equal(await dispatchDepthFixture(worker,'/capabilities',options(),()=>{},false),response);
 assert.equal(calls,1);assert.equal(worker.inFlight,0);
});
