// Fixture diagnostics only. Never serialize an exception, URL, header, or body.
// Unknown values stay unavailable; a familiar TypeError is not a root cause.
const names=new Set(['Error','TypeError','RangeError','SyntaxError','AbortError','TimeoutError','AggregateError','MiniflareCoreError','SocketError','ConnectTimeoutError','HeadersTimeoutError','BodyTimeoutError']);
const codes=new Set(['ECONNRESET','ECONNREFUSED','ECONNABORTED','EPIPE','ETIMEDOUT','EADDRINUSE','EADDRNOTAVAIL','ENOTFOUND','EAI_AGAIN','ERR_DISPOSED','ERR_INVALID_URL','ERR_INVALID_ARG_TYPE','ERR_INVALID_STATE','UND_ERR_SOCKET','UND_ERR_ABORTED','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT','UND_ERR_DESTROYED','UND_ERR_CLOSED','UND_ERR_INVALID_ARG','UND_ERR_REQ_CONTENT_LENGTH_MISMATCH','UND_ERR_RES_CONTENT_LENGTH_MISMATCH']);
const messages=new Map([
 ['fetch failed','FETCH_FAILED'],
 ['Response.clone: Body has already been consumed.','RESPONSE_ALREADY_CONSUMED'],
 ['Body is unusable: Body has already been read','BODY_ALREADY_READ'],
 ['Cannot use disposed instance','INSTANCE_DISPOSED']
]);
const modules=[
 ['miniflare','node_modules/miniflare/dist/src/index.js'],
 ['undici.fetch','node_modules/undici/lib/web/fetch/index.js'],
 ['undici.request','node_modules/undici/lib/web/fetch/request.js'],
 ['undici.response','node_modules/undici/lib/web/fetch/response.js'],
 ['undici.body','node_modules/undici/lib/web/fetch/body.js'],
 ['undici.webidl','node_modules/undici/lib/web/webidl/index.js'],
 ['undici.client','node_modules/undici/lib/dispatcher/client.js'],
 ['undici.http1','node_modules/undici/lib/dispatcher/client-h1.js'],
 ['depth.fixture','tests/depth-plan-recovery.test.mjs'],
 ['depth.diagnostics','tests/fixtures/depth-fetch-diagnostics.mjs'],
 ['node.fetch','node:internal/deps/undici/undici'],
 ['node.task_queues','node:internal/process/task_queues']
];
const read=(object,key)=>{try{return object?.[key];}catch{return undefined;}};
export function safeFixtureError(error,seen=new Set()){
 if(!error||seen.has(error)||seen.size===3)return null;
 seen.add(error);
 const stack=read(error,'stack'),frames=[];
 if(typeof stack==='string')for(const frame of stack.slice(0,16384).split('\n').slice(1,17)){
  const normalized=frame.replaceAll('\\','/');
  for(const [module,suffix] of modules){
   const at=normalized.lastIndexOf(suffix+':');
   const location=at<0?null:/^(\d+):(\d+)\)?$/.exec(normalized.slice(at+suffix.length+1));
   if(location){frames.push({module,line:Number(location[1]),column:Number(location[2])});break;}
  }
 }
 const name=read(error,'name'),code=read(error,'code');
 return {name:names.has(name)?name:'UNAVAILABLE',code:codes.has(code)?code:null,messageClass:messages.get(read(error,'message'))??'UNCLASSIFIED',frames,cause:safeFixtureError(read(error,'cause'),seen)};
}

// This wrapper does not retry, change options, bypass a check, or swallow errors.
// Split ready/dispatch/trace-read stages: the former catch conflated all three.
export async function dispatchDepthFixture(worker,path,options,trace,enabled){
 const endpoint=['/capabilities','/remote-save','/operation','/verify','/probe','/probe-status','/lease','/cancel','/revoke'].includes(path)?path:'other';
 const requestId=++worker.requestCount;
 worker.inFlight++;
 let boundary='ready';
 const context=()=>({endpoint,requestId,fixtureId:worker.fixtureId,lifecycle:worker.lifecycle,inFlight:worker.inFlight,signalAborted:options.signal?.aborted===true});
 try{
  const ready=await worker.mf.ready;
  const origin=new URL(ready.origin);
  trace('fixture.request',{...context(),loopback:['127.0.0.1','[::1]','localhost'].includes(origin.hostname),protocol:origin.protocol==='http:'?'http':origin.protocol==='https:'?'https':'other',originChanged:worker.previousOrigin!==undefined&&worker.previousOrigin!==origin.origin});
  worker.previousOrigin=origin.origin;
  boundary='dispatchFetch';
  const response=await worker.mf.dispatchFetch(origin.origin+path,options);
  if(enabled){
   boundary='trace.response.clone.json';
   const data=await response.clone().json();
   trace('request.end',{...context(),httpStatus:response.status,state:data.state,code:data.code});
  }
  return response;
 }catch(error){
  const detail=safeFixtureError(error);
  trace('request.error',{...context(),boundary,errorName:detail?.name??'UNAVAILABLE',error:detail});
  throw error;
 }finally{worker.inFlight--;}
}
