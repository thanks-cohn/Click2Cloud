import {fail,wait,filename} from './common.mjs';
import {sourceURL} from './public-address.mjs';
export const publicUrl=raw=>sourceURL(raw);
export async function sourceFetch(raw,{fetch:fetcher,signal,maxBytes=Number.MAX_SAFE_INTEGER,onProgress=()=>{},idleTimeoutMs=30000}){
 const idle=async promise=>{let timer;try{return await wait(Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error('SOURCE_STALLED'),{code:'SOURCE_STALLED'})),idleTimeoutMs);})]),signal);}finally{clearTimeout(timer);}};
 let u=publicUrl(raw),res;const visited=new Set();
 while(true){
  if(visited.has(u.href))fail('REDIRECT_LOOP');visited.add(u.href);
  res=await idle(fetcher(u.href,{redirect:'manual',credentials:'omit',referrerPolicy:'no-referrer',headers:{},signal}));
  if(![301,302,303,307,308].includes(res.status))break;
  const location=res.headers.get('location');await res.body?.cancel();if(!location)fail('REDIRECT_DENIED');u=publicUrl(new URL(location,u).href);
 }
 if(!res.ok||!res.body||res.redirected){await res.body?.cancel();fail('SOURCE_UNAVAILABLE');}
 const rawLength=res.headers.get('content-length'),length=rawLength===null?null:Number(rawLength);
 if(length!==null&&(!/^\d+$/.test(rawLength)||!Number.isSafeInteger(length)||length<0))fail('SOURCE_LENGTH_INVALID');
 if(length>maxBytes){await res.body.cancel();fail('SIZE_LIMIT');}
 const type=(res.headers.get('content-type')||'application/octet-stream').split(';')[0].trim();
 const contentType=/^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/.test(type)?type:'application/octet-stream';
 let suggestedFilename;const disposition=res.headers.get('content-disposition');
 if(disposition){const extended=/filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition),plain=/filename\s*=\s*(?:"([^"\r\n]*)"|([^;\r\n]+))/i.exec(disposition);try{const n=extended?decodeURIComponent(extended[1]):plain?.[1]??plain?.[2]?.trim();if(n)suggestedFilename=filename(n);}catch{/* Invalid server filename never replaces a validated caller name. */}}
 let count=0;const reader=res.body.getReader();
 const body=new ReadableStream({async pull(c){try{const r=await idle(reader.read());if(r.done){if(length!==null&&count!==length)fail('LENGTH_MISMATCH');c.close();return;}count+=r.value.byteLength;if(!Number.isSafeInteger(count)||count>maxBytes||(length!==null&&count>length))fail('SIZE_LIMIT');await onProgress(count);c.enqueue(r.value);}catch(e){void reader.cancel().catch(()=>{});c.error(e);}},cancel(r){return reader.cancel(r);}});
 return {body,length,contentType,suggestedFilename};
}
export function sourceFromClick(info){
 const url=info.srcUrl||info.linkUrl;if(!url)fail('SOURCE_MISSING');const u=publicUrl(url);let name;
 try{name=decodeURIComponent(u.pathname.split('/').pop())||'download';}catch{fail('SOURCE_INVALID');}
 const queryName=u.searchParams.get('filename')||u.searchParams.get('download');if(queryName)try{name=filename(queryName);}catch{}return {url:u.href,filename:filename(name),responseFilename:true};
}
