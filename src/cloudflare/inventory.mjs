import {fail} from './wire.mjs';
export async function readBuckets(oauth,accountId){
 let cursor='',page=1;const buckets=[],seen=new Set();
 do{const query=new URLSearchParams({per_page:'1000',...(cursor?{cursor}:page>1?{page:String(page)}:{})}),r=await oauth.request('/accounts/'+encodeURIComponent(accountId)+'/r2/buckets?'+query),b=await r.json();
 if(!r.ok||b.success!==true)return {response:r,body:b};if(!Array.isArray(b.result?.buckets))fail('PROVIDER_RESPONSE_INVALID');buckets.push(...b.result.buckets.map(x=>({name:x.name})));const next=b.result?.cursor??b.result_info?.cursor??'';
 if(next){if(seen.has(next))fail('PROVIDER_CURSOR_REPEATED');seen.add(next);cursor=next;}else if(page<(b.result_info?.total_pages??1)){page++;cursor='';}else{if(b.result?.truncated||b.result_info?.is_truncated)fail('PROVIDER_PAGINATION_UNAVAILABLE');break;}
 }while(true);return {buckets};
}
