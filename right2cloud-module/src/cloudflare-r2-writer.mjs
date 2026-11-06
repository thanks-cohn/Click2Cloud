import {keyFor,fail,wait} from './common.mjs';
// Real Cloudflare R2 binding API. Test bindings are injected only by tests.
export function cloudflareR2Writer(storage,{FixedLengthStream=globalThis.FixedLengthStream}={}){
 return {kind:'cloudflare-r2',capabilities:{conditionalCreate:true,knownLengthStream:true,independentHead:true},
 async prepare({destination,filename,signal}){
  const requested=keyFor(destination,filename);const dot=filename.lastIndexOf('.'),stem=dot>0?filename.slice(0,dot):filename,ext=dot>0?filename.slice(dot):'';
  for(let n=0;n<10000;n++){const key=n?keyFor(destination,`${stem}-${n}${ext}`):requested;if(!await wait(storage.head(key),signal))return {key};}fail('CONFLICT');
 },
 async write({prepared,body,length,contentType,operationId,signal}){
  let stream=body,pipe;const cancel=new AbortController();const writeSignal=signal?AbortSignal.any([signal,cancel.signal]):cancel.signal;
  if(body instanceof ReadableStream){if(!FixedLengthStream)fail('FIXED_LENGTH_STREAM_REQUIRED');const fixed=new FixedLengthStream(length);stream=fixed.readable;pipe=body.pipeTo(fixed.writable,{signal:writeSignal});pipe.catch(()=>{});}
  const put=storage.put(prepared.key,stream,{onlyIf:new Headers({'If-None-Match':'*'}),httpMetadata:{contentType},customMetadata:{operationId}});
  let result;try{result=await wait(put,writeSignal);if(result===null){cancel.abort();return {conflict:true};}if(pipe)await wait(pipe,writeSignal);}catch(e){cancel.abort();throw e;}
  if(!result?.etag||!result.version)fail('PUT_RECEIPT_INVALID');
  return {key:prepared.key,size:length,etag:result.etag,version:result.version,operationId};
 },
 async verify({receipt,signal}){
  const h=await wait(storage.head(receipt.key),signal);
  return h?{key:receipt.key,size:h.size,etag:h.etag,version:h.version,operationId:h.customMetadata?.operationId}:null;
 }};
}
