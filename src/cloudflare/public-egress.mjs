import {boundedJSON} from './wire.mjs';
import {publicAddress,sourceURL} from './public-address.mjs';
const failure=(code,sourceStage)=>Object.assign(Error(code),{code,sourceStage});

// Native Cloudflare HTTPS, as used by REDOWN. DNS preflight rejects known
// non-public and mixed answers; native fetch owns TLS, HTTP and decompression.
// This is NOT literal-IP pinning: fetch can resolve again after this check.
export function createPublicEgress({resolve,fetch:fetcher=globalThis.fetch}={}){
 const dns=resolve??(async(host,signal)=>{
  const records=await Promise.all(['A','AAAA'].map(async type=>{
   const r=await fetcher('https://cloudflare-dns.com/dns-query?'+new URLSearchParams({name:host,type}),{headers:{accept:'application/dns-json'},redirect:'manual',signal});
   if(!r.ok){await r.body?.cancel();throw Object.assign(failure('SOURCE_DNS_UNAVAILABLE','dns'),{httpStatus:r.status});}
   const body=await boundedJSON(r,65536);if(body.Status!==0)throw failure('SOURCE_DNS_UNAVAILABLE','dns');
   return (body.Answer??[]).filter(x=>[1,28].includes(x.type)).map(x=>x.data);
  }));return records.flat();
 });
 return async function publicFetch(raw,{signal}={}){
  let stage='dns';try{
   const u=sourceURL(raw),host=u.hostname.replace(/^\[|\]$/g,''),addresses=publicAddress(host)?[host]:await dns(host,signal);
   if(!addresses.length||!addresses.every(publicAddress))throw failure('SOURCE_ADDRESS_DENIED','dns');
   signal?.throwIfAborted();stage='headers';
   return await fetcher(u.href,{redirect:'manual',credentials:'omit',referrerPolicy:'no-referrer',headers:{'user-agent':'Click2Cloud/0.3.9','accept-encoding':'identity'},signal});
  }catch(e){throw Object.assign(failure(/^SOURCE_[A-Z_]{1,48}$/.test(e?.code??'')?e.code:signal?.aborted?'SOURCE_CANCELLED':'SOURCE_EGRESS_UNAVAILABLE',e?.sourceStage??stage),{name:['TypeError','RangeError','AbortError','Error'].includes(e?.name)?e.name:'Error',...(Number.isInteger(e?.httpStatus)?{httpStatus:e.httpStatus}:{})});}
 };
}
export const publicFetch=createPublicEgress();
