import {fail,wait} from './common.mjs';
export function publicUrl(raw,allowedHosts){
 let u;try{u=new URL(raw);}catch{fail('SOURCE_INVALID');}
 const h=u.hostname.toLowerCase();
 // Conservative: reject all IP literals, local names and non-default ports.
 if(u.protocol!=='https:'||u.username||u.password||u.hash||u.port||!h.includes('.')||h.endsWith('.')||h.includes(':')||/^\d+(\.\d+)*$/.test(h)||/(^|\.)(localhost|local|internal|test|invalid|example)$/.test(h)||!allowedHosts?.includes(h))fail('SOURCE_DENIED');
 return u;
}
export async function sourceFetch(raw,{fetch:fetcher,allowedHosts,signal,maxBytes,maxBufferBytes}){
 let u=publicUrl(raw,allowedHosts),res;
 for(let hop=0;hop<=5;hop++){
  res=await wait(fetcher(u.href,{redirect:'manual',credentials:'omit',referrerPolicy:'no-referrer',headers:{},signal}),signal);
  if(![301,302,303,307,308].includes(res.status))break;
  const location=res.headers.get('location');await res.body?.cancel();if(!location||hop===5)fail('REDIRECT_DENIED');u=publicUrl(new URL(location,u).href,allowedHosts);
 }
 if(!res.ok||!res.body||res.redirected)fail('SOURCE_UNAVAILABLE');
 const rawLength=res.headers.get('content-length');const length=rawLength===null?null:Number(rawLength);
 if(length!==null&&(!Number.isSafeInteger(length)||length<0))fail('SOURCE_LENGTH_INVALID');
 if(length>maxBytes){await res.body.cancel();fail('SIZE_LIMIT');}
 const type=res.headers.get('content-type')||'application/octet-stream';
 if(type.split(';')[0].trim().toLowerCase()==='text/html'){await res.body.cancel();fail('HTML_NOT_SUPPORTED');}
 let count=0;
 const reader=res.body.getReader();
 const body=new ReadableStream({async pull(c){try{const r=await wait(reader.read(),signal);if(r.done){if(length!==null&&count!==length)fail('LENGTH_MISMATCH');c.close();return;}count+=r.value.byteLength;if(count>maxBytes||(length!==null&&count>length))fail('SIZE_LIMIT');c.enqueue(r.value);}catch(e){void reader.cancel().catch(()=>{});c.error(e);}},cancel(r){return reader.cancel(r);}});
 if(length!==null)return {body,length,contentType:type};
 const chunks=[];let size=0;const bounded=body.getReader();
 try{while(true){const r=await wait(bounded.read(),signal);if(r.done)break;size+=r.value.length;if(size>maxBufferBytes)fail('BUFFER_LIMIT');chunks.push(r.value);}}catch(e){void bounded.cancel().catch(()=>{});throw e;}
 const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
 return {body:bytes,length:size,contentType:type};
}
export function sourceFromClick(info){const url=info.srcUrl||info.linkUrl||info.pageUrl;if(!url)fail('SOURCE_MISSING');let name;try{name=decodeURIComponent(new URL(url).pathname.split('/').pop())||'download';}catch{fail('SOURCE_INVALID');}return {url,filename:filenameSafe(name)};}
function filenameSafe(n){if(/[\\/\x00-\x1f]/.test(n))fail('FILENAME_INVALID');return n;}
