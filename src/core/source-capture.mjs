// Source acquisition is local to an explicitly authorized browser host. Its URL
// never enters diagnostics or the bytes-only destination-provider payload.
import {operationIdentity} from './boundary-observation.mjs';
export async function captureSelectedBytes(source,{authorizeSource,fetchSource,sink,signal,maxBytes=32*1024*1024,requestTimeoutMs=30000,operationId=0}={}) {
  operationId=operationIdentity({operationId});
  let previous=0;
  const emit=(outcome,code)=>{try{previous=(typeof sink==='function'?sink:sink?.emit)?.({stage:'capture.acquire',outcome,code,operationId,requires:previous?[previous]:[]})||0;}catch{}};
  emit('started','CAPTURE_STARTED');
  const controller=new AbortController();let timer;
  const interrupted=()=>Object.assign(Error('Source capture interrupted'),{name:'AbortError',code:'CAPTURE_INTERRUPTED'});
  const abort=()=>controller.abort(interrupted());
  const waitFor=promise=>new Promise((resolve,reject)=>{
    const aborted=()=>{cleanup();reject(controller.signal.reason);};
    const cleanup=()=>controller.signal.removeEventListener('abort',aborted);
    Promise.resolve(promise).then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});
    if(controller.signal.aborted)aborted();else controller.signal.addEventListener('abort',aborted,{once:true});
  });
  try {
    if(!Number.isSafeInteger(maxBytes)||maxBytes<1||!Number.isSafeInteger(requestTimeoutMs)||requestTimeoutMs<1) throw Object.assign(Error('Invalid capture limit'),{code:'CAPTURE_INVALID'});
    if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
    timer=setTimeout(()=>controller.abort(Object.assign(Error('Source capture deadline exceeded'),{name:'TimeoutError',code:'CAPTURE_TIMEOUT'})),requestTimeoutMs);
    if(typeof authorizeSource!=='function'||await waitFor(authorizeSource(source))!==true) throw Object.assign(Error('Source permission is required'),{code:'CAPTURE_DENIED'});
    controller.signal.throwIfAborted();
    if(typeof source?.filename!=='string'||!source.filename||/[\/\\\0]/.test(source.filename)) throw Object.assign(Error('A safe filename is required'),{code:'CAPTURE_INVALID'});
    let bytes=source.bytes;
    if(!(bytes instanceof Uint8Array)) {
      let url;try{url=new URL(source.url);}catch{throw Object.assign(Error('Invalid source'),{code:'CAPTURE_INVALID'});}
      if(!['https:','http:','blob:'].includes(url.protocol)||url.username||url.password||typeof fetchSource!=='function') throw Object.assign(Error('Unsupported source'),{code:'CAPTURE_DENIED'});
      const response=await waitFor(fetchSource(url.href,{signal:controller.signal,credentials:'omit',redirect:'error'}));
      if(response?.redirected===true)throw Object.assign(Error('Source redirected outside the approved request'),{code:'CAPTURE_DENIED'});
      if(!response?.ok||!response.body?.getReader) throw Object.assign(Error('Source acquisition failed'),{code:'CAPTURE_UNAVAILABLE'});
      const reader=response.body.getReader(),chunks=[];let count=0;
      try {
        while(true) {
          controller.signal.throwIfAborted();const {value,done}=await waitFor(reader.read());if(done)break;
          if(!(value instanceof Uint8Array))throw Object.assign(Error('Invalid source byte stream'),{code:'CAPTURE_INVALID'});
          count+=value.byteLength;
          if(count>maxBytes) throw Object.assign(Error('Source exceeds supported byte limit'),{code:'CAPTURE_SIZE_LIMIT'});
          chunks.push(value);
        }
      } catch(error) {try{void Promise.resolve(reader.cancel()).catch(()=>{});}catch{}throw error;}
      bytes=new Uint8Array(count);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
    }
    if(bytes.byteLength>maxBytes) throw Object.assign(Error('Source exceeds supported byte limit'),{code:'CAPTURE_SIZE_LIMIT'});
    controller.signal.throwIfAborted();emit('ok','CAPTURE_COMPLETE');
    return Object.freeze({filename:source.filename,contentType:source.contentType??'application/octet-stream',bytes});
  } catch(error) {
    const known=['CAPTURE_DENIED','CAPTURE_INVALID','CAPTURE_UNAVAILABLE','CAPTURE_SIZE_LIMIT','CAPTURE_TIMEOUT'];
    const code=error?.name==='AbortError'?'CAPTURE_INTERRUPTED':known.includes(error?.code)?error.code:'CAPTURE_FAILED';
    emit(code==='CAPTURE_INTERRUPTED'?'cancelled':'failed',code);
    throw Object.assign(Error(code==='CAPTURE_DENIED'?'Source permission is required':'The original source could not be acquired'),{code,name:code==='CAPTURE_INTERRUPTED'?'AbortError':'Error'});
  } finally {clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
