import {diagnoseCloudflare} from '../auth/cloudflare-oauth.mjs';
import {fail} from './wire.mjs';
export async function readBuckets(oauth,accountId){
 let cursor='',page=1;const buckets=[],seen=new Set();
 do{const query=new URLSearchParams({per_page:'1000',...(cursor?{cursor}:page>1?{page:String(page)}:{})}),r=await oauth.request('/accounts/'+encodeURIComponent(accountId)+'/r2/buckets?'+query),b=await r.json();
 if(!r.ok||b.success!==true)return {response:r,body:b};if(!Array.isArray(b.result?.buckets))fail('PROVIDER_RESPONSE_INVALID');buckets.push(...b.result.buckets.map(x=>({name:x.name})));const next=b.result?.cursor??b.result_info?.cursor??'';
 if(next){if(seen.has(next))fail('PROVIDER_CURSOR_REPEATED');seen.add(next);cursor=next;}else if(page<(b.result_info?.total_pages??1)){page++;cursor='';}else{if(b.result?.truncated||b.result_info?.is_truncated)fail('PROVIDER_PAGINATION_UNAVAILABLE');break;}
 }while(true);return {buckets};
}

export async function createVerifiedBucket(oauth,{accountId,name}){
 if(!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(name))throw Object.assign(Error(),{code:'BUCKET_NAME_INVALID'});
 const auth=await oauth.authority();
 if(!auth.accounts.some(a=>a.id===accountId)||!auth.scopes?.includes('workers-r2.write'))throw Object.assign(Error(),{code:'INSUFFICIENT_SCOPE'});
 const base='/accounts/'+encodeURIComponent(accountId)+'/r2/buckets',path=base+'/'+encodeURIComponent(name);
 const prior=await oauth.request(path);
 if(prior.status!==404){
  const body=await prior.json().catch(()=>null);
  const code=prior.ok?'BUCKET_ALREADY_EXISTS':diagnoseCloudflare(prior,body,{context:'r2'}).code;
  return {ok:false,code};
 }
 let accepted=false;
 try{
  const response=await oauth.request(base,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name})});
  const body=await response.json().catch(()=>null);
  if(response.status<500&&(!response.ok||body?.success===false))
   return {ok:false,code:diagnoseCloudflare(response,body,{context:'r2'}).code};
  accepted=response.ok&&body?.success===true;
 }catch(error){if(['REAUTH_REQUIRED','TOKEN_EXPIRED','AUTHORIZATION_REVOKED'].includes(error.code))throw error;}
 // A lost write response is never replayed. Exact-account readback can establish
 // that the intended name now exists, while a rejected write stays rejected.
 try{
  const response=await oauth.request(path),body=await response.json();
  if(response.ok&&body.success===true&&body.result?.name===name)return {ok:true,state:'completed',code:'BUCKET_VERIFIED',name,accepted};
 }catch{}
 return {ok:false,state:'uncertain',code:'BUCKET_CREATE_UNCONFIRMED'};
}
