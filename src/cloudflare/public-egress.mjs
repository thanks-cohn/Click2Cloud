import {boundedJSON} from './wire.mjs';
import {connect as tlsConnect} from 'node:tls';
import {Readable} from 'node:stream';
import {createBrotliDecompress} from 'node:zlib';
import {publicAddress,sourceURL} from './public-address.mjs';
const failure=code=>Object.assign(Error(code),{code});
const decoder=new TextDecoder('latin1');
const invalidHTTP=sourceReason=>Object.assign(failure('SOURCE_HTTP_INVALID'),{sourceReason});
const HEADER_BYTES=128*1024; // Workers documented maximum response header size; not a file limit.

// Resolve through trusted DoH, then connect ONLY to the validated literal address.
// TLS SNI/certificate checks still use the original hostname. No second hostname resolution.
export function createPublicEgress({resolve,connect=tlsConnect}={}){
 const dns=resolve??(async(host,signal)=>{
  const responses=await Promise.all(['A','AAAA'].map(async type=>{
   const r=await fetch('https://cloudflare-dns.com/dns-query?'+new URLSearchParams({name:host,type}),{headers:{accept:'application/dns-json'},redirect:'manual',signal});
   if(!r.ok)throw Object.assign(failure('SOURCE_DNS_UNAVAILABLE'),{httpStatus:r.status});const b=await boundedJSON(r,65536);if(b.Status!==0)throw failure('SOURCE_DNS_UNAVAILABLE');return (b.Answer??[]).filter(x=>[1,28].includes(x.type)).map(x=>x.data);
  }));return responses.flat();
 });
 return async function pinnedFetch(raw,{signal}={}){
  let stage='dns',socket;try{
  const u=sourceURL(raw),host=u.hostname.replace(/^\[|\]$/g,''),literal=publicAddress(host),addresses=literal?[host]:await dns(host,signal);
  // Reject mixed public/private answers as well, rather than choosing a convenient answer.
  if(!addresses.length||!addresses.every(publicAddress))throw failure('SOURCE_ADDRESS_DENIED');
  if(signal?.aborted)throw failure('SOURCE_CANCELLED');
  const address=addresses.find(x=>!x.includes(':'))??addresses[0];
  stage='connect';let readable,send;
  if(connect===tlsConnect&&globalThis.navigator?.userAgent==='Cloudflare-Workers'){
   // Native transport preserves literal-IP routing and explicit original-host TLS
   // verification without relying on unsupported Node TLS options/wrappers.
   const {connect:open}=await import('cloudflare:sockets');
   const raw=open({hostname:address,port:Number(u.port||443)},{secureTransport:'starttls',allowHalfOpen:true});raw.closed.catch(()=>{});
   let active=raw;socket={destroy(){void active.close().catch(()=>{});}};
   const abort=()=>socket.destroy();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
   await raw.opened;
   const secure=active=raw.startTls({expectedServerHostname:host});secure.closed.catch(()=>{});
   secure.closed.finally(()=>signal?.removeEventListener('abort',abort)).catch(()=>{});
   stage='tls';await secure.opened;readable=secure.readable;
   const writer=secure.writable.getWriter();send=text=>writer.write(new TextEncoder().encode(text));
  }else{
   socket=connect({host:address,port:Number(u.port||443),servername:host,rejectUnauthorized:true});
   const abort=()=>socket.destroy(failure('SOURCE_CANCELLED'));signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
   socket.setTimeout(30000,()=>socket.destroy(failure('SOURCE_STALLED')));
   socket.once('close',()=>signal?.removeEventListener('abort',abort));
   stage='tls';await new Promise((ok,no)=>{socket.once('error',no);socket.once('secureConnect',()=>socket.authorized===true?ok():no(failure('SOURCE_TLS_DENIED')));});
   readable=Readable.toWeb(socket);send=text=>socket.write(text);
  }
   stage='headers';const reader=readable.getReader();let pending=new Uint8Array(),ended=false;
   const append=async()=>{const r=await reader.read();if(r.done){ended=true;return;}const bytes=r.value instanceof Uint8Array?r.value:new Uint8Array(r.value);const n=new Uint8Array(pending.length+bytes.byteLength);n.set(pending);n.set(bytes,pending.length);pending=n;};
   const line=async()=>{while(true){for(let i=0;i<pending.length-1;i++)if(pending[i]===13&&pending[i+1]===10){if(i>HEADER_BYTES)throw failure('SOURCE_HEADERS_TOO_LARGE');const l=decoder.decode(pending.subarray(0,i));pending=pending.slice(i+2);return l;}if(pending.length>HEADER_BYTES||ended)throw invalidHTTP(!pending.length?'http-empty-response':pending.length>=9&&pending[3]===4?'http2-response':'http-truncated');await append();}};
   await send('GET '+u.pathname+u.search+' HTTP/1.1\r\nHost: '+u.host+'\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n');
   let status,headers,headerBytes=0;
   while(true){
    const statusLine=await line(),match=/^HTTP\/1\.[01] ([0-9]{3})(?: |$)/.exec(statusLine);if(!match)throw invalidHTTP('http-status-line');status=Number(match[1]);headers=new Headers();headerBytes+=statusLine.length+2;
    while(true){const l=await line();headerBytes+=l.length+2;if(headerBytes>HEADER_BYTES)throw failure('SOURCE_HEADERS_TOO_LARGE');if(!l)break;const colon=l.indexOf(':');if(colon<=0||/^[ \t]/.test(l))throw invalidHTTP('http-header-framing');const name=l.slice(0,colon),value=l.slice(colon+1).trim();if(headers.has(name)&&['content-length','transfer-encoding'].includes(name.toLowerCase()))throw invalidHTTP('http-header-framing');headers.append(name,value);}
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
  }catch(e){socket?.destroy();throw Object.assign(failure(typeof e?.code==='string'&&/^SOURCE_[A-Z_]{1,48}$/.test(e.code)?e.code:'SOURCE_EGRESS_UNAVAILABLE'),{sourceStage:stage,runtimeCode:e?.code,sourceReason:e?.sourceReason??(/hostname mismatch|not valid for|does not match/i.test(e?.message??'')?'hostname-mismatch':/certificate/i.test(e?.message??'')?'certificate-rejected':/cannot connect to the specified address|TCP Loop/i.test(e?.message??'')?'outbound-address-blocked':/proxy request failed/i.test(e?.message??'')?'outbound-connect-rejected':/not implemented/i.test(e?.message??'')?'runtime-unsupported':/closed|reset|EOF/i.test(e?.message??'')?'socket-closed':'network-error'),name:['TypeError','RangeError','SyntaxError','AbortError','Error'].includes(e?.name)?e.name:'Error',...(Number.isInteger(e?.httpStatus)?{httpStatus:e.httpStatus}:{})});}
 };
}
export const publicFetch=createPublicEgress();
