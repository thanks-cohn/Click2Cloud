import {keyFor,fail,wait} from './common.mjs';
// Per-buffer budget: bounded memory under the documented 128MB isolate limit, NOT a file ceiling.
export const SPOOL_PART_BYTES=4*1024*1024;
// Official R2 single-upload service limit. Safe conditional multipart completion is not established.
export const R2_SINGLE_PUT_BYTES=5*1024**3;
export function cloudflareR2Writer(storage,{FixedLengthStream=globalThis.FixedLengthStream,recordStage=async()=>{},recordPart,readPart}={}){
 const partsByIndex=new Map();recordPart??=async(i,v)=>partsByIndex.set(i,v);readPart??=async i=>partsByIndex.get(i);
 return {kind:'cloudflare-r2',capabilities:{conditionalCreate:true,knownLengthStream:true,unknownLengthSpool:true,independentHead:true},
 async prepare({destination,filename,operationId=crypto.randomUUID(),signal}){
  const requested=keyFor(destination,filename);if(!await wait(storage.head(requested),signal))return {key:requested,destination};
  const dot=filename.lastIndexOf('.'),stem=dot>0?filename.slice(0,dot):filename,ext=dot>0?filename.slice(dot):'';
  return {key:keyFor(destination,`${stem}-${operationId}${ext}`),destination};
 },
 async write({prepared,body,length,contentType,operationId,signal}){
  // Unknown length is staged as independently conditional bounded objects, never a whole-file buffer.
  // Final PUT is still atomic If-None-Match:*. Parts are retained for reconciliation; no unsafe cleanup.
  if(length!==null&&length>R2_SINGLE_PUT_BYTES)fail('R2_SINGLE_PUT_LIMIT');
  if(length===null){
   const prefix=(prepared.destination.prefix?prepared.destination.prefix+'/':'')+'.click2cloud-transfers/'+operationId+'/';
   const reader=body.getReader();let buffer=new Uint8Array(SPOOL_PART_BYTES),used=0,parts=0,total=0;
   const flush=async()=>{if(!used)return;if(total+used>R2_SINGLE_PUT_BYTES)fail('R2_SINGLE_PUT_LIMIT');const key=prefix+parts,bytes=buffer.slice(0,used);keyFor({prefix:prefix.slice(0,-1)},String(parts));const h=await wait(storage.put(key,bytes,{onlyIf:new Headers({'If-None-Match':'*'}),customMetadata:{operationId}}),signal);if(!h)fail('STAGING_CONFLICT');await recordPart(parts,{key,etag:h.etag,version:h.version,size:used});parts++;total+=used;await recordStage({stage:'staging',stagingPrefix:prefix,parts,bytes:total});buffer=new Uint8Array(SPOOL_PART_BYTES);used=0;};
   try{while(true){const r=await wait(reader.read(),signal);if(r.done)break;let at=0;while(at<r.value.length){const n=Math.min(buffer.length-used,r.value.length-at);buffer.set(r.value.subarray(at,at+n),used);used+=n;at+=n;if(used===buffer.length)await flush();}}await flush();}finally{void reader.cancel().catch(()=>{});}
   length=total;let index=0,active;
   body=new ReadableStream({async pull(c){try{while(true){if(active){const r=await wait(active.read(),signal);if(!r.done){c.enqueue(r.value);return;}active=null;}if(index===parts){c.close();return;}const expected=await readPart(index),o=await wait(storage.get(prefix+index++),signal);if(!o||!expected||o.etag!==expected.etag||o.version!==expected.version||o.size!==expected.size||o.customMetadata?.operationId!==operationId)fail('STAGING_UNVERIFIED');active=o.body.getReader();}}catch(e){c.error(e);}},cancel(){return active?.cancel();}});
  }
  await recordStage({stage:'writing',key:prepared.key,bytes:length});
  let stream=body,pipe;const cancel=new AbortController(),writeSignal=signal?AbortSignal.any([signal,cancel.signal]):cancel.signal;
  if(body instanceof ReadableStream){if(!FixedLengthStream)fail('FIXED_LENGTH_STREAM_REQUIRED');const fixed=new FixedLengthStream(length);stream=fixed.readable;pipe=body.pipeTo(fixed.writable,{signal:writeSignal});pipe.catch(()=>cancel.abort());}
  const put=storage.put(prepared.key,stream,{onlyIf:new Headers({'If-None-Match':'*'}),httpMetadata:{contentType},customMetadata:{operationId}});
  let result;try{result=await wait(put,writeSignal);if(result===null){cancel.abort();return {conflict:true};}if(pipe)await wait(pipe,writeSignal);}catch(e){cancel.abort();throw e;}
  if(!result?.etag||!result.version)fail('PUT_RECEIPT_INVALID');
  return {key:prepared.key,size:length,etag:result.etag,version:result.version,operationId};
 },
 async verify({receipt,signal}){const h=await wait(storage.head(receipt.key),signal);return h?{key:receipt.key,size:h.size,etag:h.etag,version:h.version,operationId:h.customMetadata?.operationId}:null;}
 };
}
