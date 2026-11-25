import {SCREENSHOT_BYTES} from '../cloudflare/screenshot-wire.mjs';

const cacheName='click2cloud-screenshot-retry-v1';
export const screenshotRetryLifetime=60*60*1000;
const cacheBytes=48*1024*1024;
// CacheStorage uses HTTP(S) keys. These are local cache identities only.
const key=id=>'https://click2cloud.invalid/screenshot-retry/'+id;

export function createScreenshotRetryCache(storage=globalThis.caches,clock=Date.now){
 let writes=Promise.resolve();
 const serial=work=>{
  const result=writes.catch(()=>{}).then(async()=>work(await storage.open(cacheName)));
  writes=result;
  return result;
 };
 async function prune(cache,needed=0){
  const entries=[];
  for(const request of await cache.keys()){
   const response=await cache.match(request);
   const expires=Number(response?.headers.get('x-capture-expires'));
   const bytes=Number(response?.headers.get('x-capture-size'));
   if(expires<=clock()||!bytes||bytes>SCREENSHOT_BYTES)await cache.delete(request);
   else entries.push({request,expires,bytes});
  }
  let bytes=entries.reduce((sum,entry)=>sum+entry.bytes,0);
  entries.sort((a,b)=>a.expires-b.expires);
  for(const entry of entries){
   if(bytes+needed<=cacheBytes)break;
   await cache.delete(entry.request);bytes-=entry.bytes;
  }
 }
 return {
  store:(id,image)=>serial(async cache=>{
   await prune(cache,image.size);
   await cache.put(key(id),new Response(image,{headers:{'content-type':'image/png',
    'x-capture-expires':String(clock()+screenshotRetryLifetime),'x-capture-size':String(image.size)}}));
  }),
  read:id=>serial(async cache=>{await prune(cache);const response=await cache.match(key(id));return response?.blob()??null;}),
  async preview(id,limit){
   const response=await storage.match(key(id),{cacheName});
   const expires=Number(response?.headers.get('x-capture-expires'));
   const size=Number(response?.headers.get('x-capture-size'));
   if(!response||!(expires>clock())||!Number.isSafeInteger(size)||size<8||size>SCREENSHOT_BYTES)return null;
   if(size>limit)throw Error('PREVIEW_SIZE_LIMIT');
   const image=await response.blob();
   return image.size===size?image:null;
  },
  remove:id=>serial(cache=>cache.delete(key(id))),
  prune:()=>serial(cache=>prune(cache))
 };
}
