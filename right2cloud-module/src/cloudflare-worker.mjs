import {validateIntent,equal,fail,wait} from './common.mjs';
import {sourceFetch} from './source-fetch.mjs';
import {cloudflareR2Writer} from './cloudflare-r2-writer.mjs';
// ports.authenticate must validate bearer/principal and resolve exact binding from trusted config.
export function createWorker(ports){return {async fetch(request,env){
 let possibleWrite=false,timer,controller,source;let operationId,dest;
 try{
  if(request.method!=='POST'||new URL(request.url).pathname!=='/remote-save')fail('ROUTE_DENIED');
  const reader=request.body?.getReader();if(!reader)fail('REQUEST_INVALID');let text='',size=0;const decoder=new TextDecoder();const readSignal=AbortSignal.timeout(5000);try{while(true){const r=await wait(reader.read(),readSignal);if(r.done)break;size+=r.value.length;if(size>16384)fail('REQUEST_TOO_LARGE');text+=decoder.decode(r.value,{stream:true});}text+=decoder.decode();}catch(e){void reader.cancel().catch(()=>{});throw e;}const intent=JSON.parse(text);validateIntent(intent);operationId=intent.operationId;dest=intent.destination;
  const cap=await ports.authenticate(request,env,intent);
  if(!cap||!equal(cap.destination,dest)||cap.expiresAt<=Date.now()||!Number.isFinite(cap.expiresAt)||!cap.storage)fail('AUTHORIZATION_DENIED');
  const {maxBytes,maxBufferBytes,timeoutMs}=cap;
  if(![maxBytes,maxBufferBytes,timeoutMs].every(n=>Number.isSafeInteger(n)&&n>0)||maxBufferBytes>maxBytes)fail('LIMITS_REQUIRED');
  controller=new AbortController();timer=setTimeout(()=>controller.abort(),Math.min(timeoutMs,cap.expiresAt-Date.now()));
  const signal=AbortSignal.any([request.signal,controller.signal]);
  // Durable atomic claim remains retained even if the response is lost; no write retry.
  if(await wait(ports.claimOperation(cap,operationId,intent),signal)!==true)return Response.json({state:'uncertain',code:'OPERATION_ALREADY_CLAIMED',operationId});
  const writer=ports.writer?ports.writer(cap):cloudflareR2Writer(cap.storage,ports);
  if(writer.kind!==dest.provider||writer.capabilities.conditionalCreate!==true)fail('NOT_SUPPORTED');
  const src=source=await sourceFetch(intent.source.url,{fetch:ports.fetch||fetch,allowedHosts:cap.allowedHosts,signal,maxBytes,maxBufferBytes});
  const prepared=await writer.prepare({destination:dest,filename:intent.source.filename,operationId,signal});
  if(await wait(ports.recheckAuthorization(cap,intent),signal)!==true)fail('AUTHORIZATION_REVOKED');
  signal.throwIfAborted();possibleWrite=true;
  const result=await writer.write({prepared,...src,operationId,signal});
  if(result.conflict)return Response.json({state:'failed',code:'CONFLICT',operationId});
  return Response.json({state:'written',receipt:{...result,destination:dest}});
 }catch(e){return Response.json({state:possibleWrite?'uncertain':'blocked',code:possibleWrite?'WRITE_UNCONFIRMED':(e.code||'REQUEST_FAILED'),operationId,destination:dest});}finally{clearTimeout(timer);controller?.abort();if(source?.body instanceof ReadableStream&&!source.body.locked)void source.body.cancel().catch(()=>{});}
}};}
