// Browser-source acquisition for eligible non-R2 adapters. Cloudflare bypasses this owner.
import {operationIdentity} from './boundary-observation.mjs';
const issue=code=>Object.assign(Error(code),{code,...(code==='CAPTURE_INTERRUPTED'?{name:'AbortError'}:{})});
export async function captureSelectedStream(source,{authorizeSource,fetchSource,sink,signal,requestTimeoutMs=30000,maxBytes=Number.MAX_SAFE_INTEGER,operationId=0}={}){
 operationId=operationIdentity({operationId});
 const emit=(outcome,code)=>{try{(typeof sink==='function'?sink:sink?.emit)?.({stage:'capture.acquire',outcome,code,operationId});}catch{}};
 const controller=new AbortController(),abort=()=>controller.abort(issue('CAPTURE_INTERRUPTED'));signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 const finish=()=>signal?.removeEventListener('abort',abort);
 const idle=async promise=>{let timer;try{controller.signal.throwIfAborted();return await Promise.race([promise,new Promise((_,reject)=>{const interrupted=()=>{controller.signal.removeEventListener('abort',interrupted);reject(issue('CAPTURE_INTERRUPTED'));};controller.signal.addEventListener('abort',interrupted,{once:true});timer=setTimeout(()=>{controller.signal.removeEventListener('abort',interrupted);reject(issue('CAPTURE_TIMEOUT'));},requestTimeoutMs);Promise.resolve(promise).finally(()=>controller.signal.removeEventListener('abort',interrupted)).catch(()=>{});})]);}finally{clearTimeout(timer);}};
 emit('started','CAPTURE_STARTED');
 try{
  if(!Number.isSafeInteger(maxBytes)||maxBytes<1||!Number.isSafeInteger(requestTimeoutMs)||requestTimeoutMs<1)throw issue('CAPTURE_INVALID');
  if(typeof authorizeSource!=='function'||await idle(Promise.resolve(authorizeSource(source)))!==true)throw issue('CAPTURE_DENIED');
  if(typeof source?.filename!=='string'||!source.filename||/[\/\\\0]/.test(source.filename))throw issue('CAPTURE_INVALID');
  let original,length=null,contentType=source.contentType??'application/octet-stream';
  if(source.bytes instanceof Uint8Array){let offset=0;length=source.bytes.length;original=new ReadableStream({pull(c){if(offset===length){c.close();return;}const end=Math.min(length,offset+65536);c.enqueue(source.bytes.subarray(offset,end));offset=end;}});}
  else if(source.body instanceof ReadableStream){original=source.body;length=source.length??null;}
  else{
   let u;try{u=new URL(source.url);}catch{throw issue('CAPTURE_INVALID');}
   if(!['https:','http:','blob:'].includes(u.protocol)||u.username||u.password||typeof fetchSource!=='function')throw issue('CAPTURE_DENIED');
   const response=await idle(fetchSource(u.href,{signal:controller.signal,credentials:'omit',redirect:'error'}));
   if(response?.redirected)throw issue('CAPTURE_DENIED');if(!response?.ok||!response.body?.getReader)throw issue('CAPTURE_UNAVAILABLE');original=response.body;
   const declared=response.headers?.get('content-length');if(declared!==null&&declared!==undefined)length=Number(declared);contentType=response.headers?.get('content-type')??contentType;
  }
  if(length!==null&&(!Number.isSafeInteger(length)||length<0||length>maxBytes))throw issue('CAPTURE_SIZE_LIMIT');
  const reader=original.getReader();let count=0,complete=false;
  const body=new ReadableStream({async pull(c){try{const next=await idle(reader.read());if(next.done){if(length!==null&&count!==length)throw issue('CAPTURE_INVALID');complete=true;finish();emit('ok','CAPTURE_COMPLETE');c.close();return;}if(!(next.value instanceof Uint8Array))throw issue('CAPTURE_INVALID');count+=next.value.length;if(!Number.isSafeInteger(count)||count>maxBytes||length!==null&&count>length)throw issue('CAPTURE_SIZE_LIMIT');c.enqueue(next.value);}catch(e){controller.abort();finish();void reader.cancel().catch(()=>{});emit('failed',e.code??'CAPTURE_FAILED');c.error(e);}},cancel(r){controller.abort();finish();void reader.cancel(r).catch(()=>{});}}, {highWaterMark:0});
  return Object.freeze({filename:source.filename,contentType,body,cancel(reason){controller.abort();finish();void reader.cancel(reason).catch(()=>{});return Promise.resolve();},get byteLength(){return count;},get complete(){return complete;}});
 }catch(e){controller.abort();finish();const code=/^CAPTURE_[A-Z_]+$/.test(e.code??'')?e.code:'CAPTURE_FAILED';emit(code==='CAPTURE_INTERRUPTED'?'cancelled':'failed',code);throw issue(code);}
}

// Compatibility for already-resident bytes. Buffering a URL requires an explicit caller budget;
// production URL/Explorer transfers use captureSelectedStream, never an implicit whole-file buffer.
export async function captureSelectedBytes(source,options={}){
 if(!(source?.bytes instanceof Uint8Array)&&options.maxBytes===undefined)throw issue('STREAMING_PROVIDER_REQUIRED');
 const stream=await captureSelectedStream(source,options);
 if(source.bytes instanceof Uint8Array){const reader=stream.body.getReader();while(!(await reader.read()).done){}return Object.freeze({filename:stream.filename,contentType:stream.contentType,bytes:source.bytes});}
 const chunks=[];let count=0;const reader=stream.body.getReader();while(true){const r=await reader.read();if(r.done)break;count+=r.value.length;chunks.push(r.value);}const bytes=new Uint8Array(count);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}return Object.freeze({filename:stream.filename,contentType:stream.contentType,bytes});
}
