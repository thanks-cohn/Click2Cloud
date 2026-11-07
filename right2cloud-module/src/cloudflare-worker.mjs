import {validateIntent,equal,fail,wait,safeRemoteDiagnostic} from './common.mjs';
import {sourceFetch} from './source-fetch.mjs';
import {cloudflareR2Writer} from './cloudflare-r2-writer.mjs';
// ports.authenticate must validate bearer/principal and resolve exact binding from trusted config.
export function createWorker(ports){return {async fetch(request,env){
 let possibleWrite=false,timer,controller,source;let operationId,dest,cap,stage='request';
 try{
  if(request.method!=='POST'||new URL(request.url).pathname!=='/remote-save')fail('ROUTE_DENIED');
  const reader=request.body?.getReader();if(!reader)fail('REQUEST_INVALID');let text='',size=0;const decoder=new TextDecoder();const readSignal=AbortSignal.timeout(5000);try{while(true){const r=await wait(reader.read(),readSignal);if(r.done)break;size+=r.value.length;if(size>16384)fail('REQUEST_TOO_LARGE');text+=decoder.decode(r.value,{stream:true});}text+=decoder.decode();}catch(e){void reader.cancel().catch(()=>{});throw e;}const intent=JSON.parse(text);validateIntent(intent);operationId=intent.operationId;dest=intent.destination;
  stage='authenticate';cap=await ports.authenticate(request,env,intent);
  if(!cap||!equal(cap.destination,dest)||cap.expiresAt<=Date.now()||!Number.isFinite(cap.expiresAt)||!cap.storage)fail('AUTHORIZATION_DENIED');
  const maxBytes=cap.maxBytes??Number.MAX_SAFE_INTEGER;
  controller=new AbortController();
  // Lease is renewed by authenticated operation polling. No whole-transfer timer.
  timer=setInterval(()=>{Promise.resolve(ports.recheckAuthorization(cap,intent)).then(ok=>{if(!ok)controller.abort();},()=>controller.abort());},1000);
  const signal=AbortSignal.any([request.signal,controller.signal]);
  // Durable atomic claim remains retained even if the response is lost; no write retry.
  stage='claim';if(await wait(ports.claimOperation(cap,operationId,intent),signal)!==true)return Response.json({state:'uncertain',code:'OPERATION_ALREADY_CLAIMED',operationId});
  stage='writer';const writer=ports.writer?ports.writer(cap):cloudflareR2Writer(cap.storage,ports);
  if(writer.kind!==dest.provider||writer.capabilities.conditionalCreate!==true)fail('NOT_SUPPORTED');
  stage='source.fetch';const src=source=await sourceFetch(intent.source.url,{fetch:ports.fetch||fetch,signal,maxBytes,onProgress:ports.onProgress,idleTimeoutMs:cap.idleTimeoutMs??30000});
  stage='destination.prepare';const prepared=await writer.prepare({destination:dest,filename:intent.source.responseFilename?(src.suggestedFilename??intent.source.filename):intent.source.filename,operationId,signal});
  stage='authorization.recheck';if(await wait(ports.recheckAuthorization(cap,intent),signal)!==true)fail('AUTHORIZATION_REVOKED');
  stage='destination.record';await ports.recordPrepared?.(cap,prepared);signal.throwIfAborted();possibleWrite=true;
  stage='destination.write';const result=await writer.write({prepared,...src,operationId,signal});
  if(result.conflict)return Response.json({state:'failed',code:'CONFLICT',operationId});
  return Response.json({state:'written',receipt:{...result,destination:dest}});
 }catch(e){const causeCode=typeof e?.code==='string'&&/^[A-Z][A-Z0-9_]{0,63}$/.test(e.code)?e.code:null;
  const diagnostic=safeRemoteDiagnostic({kind:'remote-save-stage',stage,errorKind:e?.name,causeCode,runtimeCode:e?.runtimeCode,sourceReason:e?.sourceReason,sourceStage:e?.sourceStage,httpStatus:e?.httpStatus});
  return Response.json({state:possibleWrite?'uncertain':'blocked',code:possibleWrite?'WRITE_UNCONFIRMED':causeCode??'REMOTE_STAGE_FAILED',...(possibleWrite&&causeCode?{cause:causeCode}:{}),diagnostic,operationId,destination:dest});}finally{clearInterval(timer);controller?.abort();if(source?.body instanceof ReadableStream&&!source.body.locked)void source.body.cancel().catch(()=>{});}
}};}
