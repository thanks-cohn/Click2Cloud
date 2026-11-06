import {boundedJSON} from './wire.mjs';
import {connect as tlsConnect} from 'node:tls';
import {Readable} from 'node:stream';
import {createBrotliDecompress} from 'node:zlib';
import {publicAddress,sourceURL} from './public-address.mjs';
const failure=code=>Object.assign(Error(code),{code});
const decoder=new TextDecoder('latin1');
const HEADER_BYTES=128*1024; // Workers documented maximum response header size; not a file limit.

// Resolve through trusted DoH, then connect ONLY to the validated literal address.
// TLS SNI/certificate checks still use the original hostname. No second hostname resolution.
export function createPublicEgress({resolve,connect=tlsConnect}={}){
 const dns=resolve??(async(host,signal)=>{
  const responses=await Promise.all(['A','AAAA'].map(async type=>{
   const r=await fetch('https://cloudflare-dns.com/dns-query?'+new URLSearchParams({name:host,type}),{headers:{accept:'application/dns-json'},redirect:'error',signal});
   if(!r.ok)throw failure('SOURCE_DNS_UNAVAILABLE');const b=await boundedJSON(r,65536);if(b.Status!==0)throw failure('SOURCE_DNS_UNAVAILABLE');return (b.Answer??[]).filter(x=>[1,28].includes(x.type)).map(x=>x.data);
  }));return responses.flat();
 });
 return async function pinnedFetch(raw,{signal}={}){
  const u=sourceURL(raw),host=u.hostname.replace(/^\[|\]$/g,''),literal=publicAddress(host),addresses=literal?[host]:await dns(host,signal);
  // Reject mixed public/private answers as well, rather than choosing a convenient answer.
  if(!addresses.length||!addresses.every(publicAddress))throw failure('SOURCE_ADDRESS_DENIED');
  if(signal?.aborted)throw failure('SOURCE_CANCELLED');
  const address=addresses.find(x=>!x.includes(':'))??addresses[0];
  const socket=connect({host:address,port:Number(u.port||443),servername:host,rejectUnauthorized:true,ALPNProtocols:['http/1.1']});
  const abort=()=>socket.destroy(failure('SOURCE_CANCELLED'));signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  // A stalled peer cannot keep resources forever. Activity resets this timer; no whole-file deadline.
  socket.setTimeout(30000,()=>socket.destroy(failure('SOURCE_STALLED')));
  socket.once('close',()=>signal?.removeEventListener('abort',abort));
  try{
   await new Promise((ok,no)=>{socket.once('error',no);socket.once('secureConnect',()=>socket.authorized===true?ok():no(failure('SOURCE_TLS_DENIED')));});
   const reader=Readable.toWeb(socket).getReader();let pending=new Uint8Array(),ended=false;
   const append=async()=>{const r=await reader.read();if(r.done){ended=true;return;}const n=new Uint8Array(pending.length+r.value.length);n.set(pending);n.set(r.value,pending.length);pending=n;};
   const line=async()=>{while(true){for(let i=0;i<pending.length-1;i++)if(pending[i]===13&&pending[i+1]===10){if(i>HEADER_BYTES)throw failure('SOURCE_HEADERS_TOO_LARGE');const l=decoder.decode(pending.subarray(0,i));pending=pending.slice(i+2);return l;}if(pending.length>HEADER_BYTES||ended)throw failure('SOURCE_HTTP_INVALID');await append();}};
   socket.write('GET '+u.pathname+u.search+' HTTP/1.1\r\nHost: '+u.host+'\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n');
   let status,headers,headerBytes=0;
   while(true){
    const statusLine=await line(),match=/^HTTP\/1\.[01] ([0-9]{3})(?: |$)/.exec(statusLine);if(!match)throw failure('SOURCE_HTTP_INVALID');status=Number(match[1]);headers=new Headers();headerBytes+=statusLine.length+2;
    while(true){const l=await line();headerBytes+=l.length+2;if(headerBytes>HEADER_BYTES)throw failure('SOURCE_HEADERS_TOO_LARGE');if(!l)break;const colon=l.indexOf(':');if(colon<=0||/^[ \t]/.test(l))throw failure('SOURCE_HTTP_INVALID');const name=l.slice(0,colon),value=l.slice(colon+1).trim();if(headers.has(name)&&['content-length','transfer-encoding'].includes(name.toLowerCase()))throw failure('SOURCE_HTTP_INVALID');headers.append(name,value);}
    if(status>=200)break;if(status===101)throw failure('SOURCE_UPGRADE_UNSUPPORTED');
   }
   const transfer=headers.get('transfer-encoding');if(transfer&&transfer.toLowerCase()!=='chunked')throw failure('SOURCE_HTTP_INVALID');if(transfer&&headers.has('content-length'))throw failure('SOURCE_HTTP_INVALID');
   const declared=headers.get('content-length');if(declared!==null&&!/^\d+$/.test(declared))throw failure('SOURCE_LENGTH_INVALID');let remaining=declared===null?null:Number(declared),chunkLeft=0,needCRLF=false,done=false,trailerBytes=0;
   if(remaining!==null&&!Number.isSafeInteger(remaining))throw failure('SOURCE_LENGTH_INVALID');
   let body=new ReadableStream({async pull(c){try{
    if(done){c.close();return;}
    if(transfer){
     if(needCRLF){if(await line()!=='')throw failure('SOURCE_HTTP_INVALID');needCRLF=false;}
     if(!chunkLeft){const size=await line();if(!/^[a-fA-F0-9]+(?:;[^\r\n]*)?$/.test(size))throw failure('SOURCE_HTTP_INVALID');chunkLeft=parseInt(size.split(';')[0],16);if(!Number.isSafeInteger(chunkLeft))throw failure('SOURCE_HTTP_INVALID');if(!chunkLeft){while(true){const l=await line();trailerBytes+=l.length+2;if(trailerBytes>HEADER_BYTES)throw failure('SOURCE_HEADERS_TOO_LARGE');if(!l)break;}done=true;c.close();socket.destroy();return;}}
    }
    if(remaining===0){done=true;c.close();socket.destroy();return;}
    while(!pending.length&&!ended)await append();
    if(!pending.length){if(transfer||remaining>0)throw failure('LENGTH_MISMATCH');done=true;c.close();socket.destroy();return;}
    const take=Math.min(pending.length,transfer?chunkLeft:remaining??pending.length);c.enqueue(pending.slice(0,take));pending=pending.slice(take);if(transfer){chunkLeft-=take;if(!chunkLeft)needCRLF=true;}else if(remaining!==null)remaining-=take;
   }catch(e){socket.destroy();c.error(e);}},cancel(){socket.destroy();}});
   const encoding=headers.get('content-encoding')?.toLowerCase();if(encoding&&encoding!=='identity'){
    if(encoding==='gzip'||encoding==='deflate')body=body.pipeThrough(new DecompressionStream(encoding));
    else if(encoding==='br')body=Readable.toWeb(Readable.fromWeb(body).pipe(createBrotliDecompress()));else throw failure('SOURCE_ENCODING_UNSUPPORTED');
    headers.delete('content-length');headers.delete('content-encoding');
   }
   headers.delete('transfer-encoding');
   if([204,205,304].includes(status)){await body.cancel();return new Response(null,{status,headers});}
   return new Response(body,{status,headers});
  }catch(e){socket.destroy();throw failure(e.code?.startsWith('SOURCE_')?e.code:'SOURCE_EGRESS_UNAVAILABLE');}
 };
}
export const publicFetch=createPublicEgress();
