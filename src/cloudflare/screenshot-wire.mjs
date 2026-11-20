import {fail} from './wire.mjs';

export const SCREENSHOT_BYTES=12*1024*1024;
export const SCREENSHOT_PLAN_BYTES=2*1024*1024;
const encoder=new TextEncoder();
export const captureUuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value);
export const hexBytes=bytes=>Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
export const screenshotDigest=async bytes=>hexBytes(await crypto.subtle.digest('SHA-256',bytes));

export function screenshotFilename(captureId,outputId){
 return 'Screenshot-'+captureId+'-'+outputId.slice(captureId.length+1)+'.png';
}
export function screenshotBody(intent,image){
 const header=encoder.encode(JSON.stringify(intent));
 if(header.byteLength>SCREENSHOT_PLAN_BYTES)fail('SCREENSHOT_PLAN_TOO_LARGE');
 const size=new Uint8Array(4);
 new DataView(size.buffer).setUint32(0,header.byteLength);
 return new Blob([size,header,image],{type:'application/octet-stream'});
}

// Validate the short signed plan before allocating space for image bytes.
export function screenshotReader(request){
 const reader=request.body?.getReader();
 if(!reader)fail('SCREENSHOT_BODY_INVALID');
 let buffered=new Uint8Array();
 async function take(size){
  const result=new Uint8Array(size);
  let filled=0;
  while(filled<size){
   if(!buffered.length){
    const chunk=await reader.read();
    if(chunk.done)fail('SCREENSHOT_BODY_INVALID');
    buffered=chunk.value;
   }
   const count=Math.min(size-filled,buffered.length);
   result.set(buffered.subarray(0,count),filled);
   buffered=buffered.subarray(count);
   filled+=count;
  }
  return result;
 }
 return {
  async plan(){
   const length=new DataView((await take(4)).buffer).getUint32(0);
   if(!length||length>SCREENSHOT_PLAN_BYTES)fail('SCREENSHOT_PLAN_TOO_LARGE');
   try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await take(length)));}
   catch{fail('SCREENSHOT_BODY_INVALID');}
  },
  async image(size){
   const bytes=await take(size);
   if(buffered.length||!(await reader.read()).done)fail('SCREENSHOT_BODY_INVALID');
   return bytes;
  },
  close:()=>reader.cancel().catch(()=>{})
 };
}

export function validateScreenshotIntent(intent,scope){
 if(!intent||!captureUuid(intent.captureId)||!captureUuid(intent.operationId)||!captureUuid(intent.signalId)||
    !Number.isSafeInteger(intent.byteLength)||intent.byteLength<8||intent.byteLength>SCREENSHOT_BYTES||
    !/^[a-f0-9]{64}$/.test(intent.imageDigest??'')||!Array.isArray(intent.outputs)||!intent.outputs.length||
    typeof intent.retry!=='boolean')fail('SCREENSHOT_PLAN_INVALID');
 const ids=new Set(),keys=new Set();
 for(const output of intent.outputs){
  const {outputId,prefix,key}=output??{};
  if(typeof outputId!=='string'||!outputId.startsWith(intent.captureId+'-')||
     !/^[1-9][0-9]*$/.test(outputId.slice(intent.captureId.length+1))||
     typeof prefix!=='string'||(prefix!==''&&!prefix.endsWith('/'))||
     scope&&!prefix.startsWith(scope+'/')||
     key!==prefix+screenshotFilename(intent.captureId,outputId)||ids.has(outputId)||keys.has(key)||
     encoder.encode(key).length>1024)fail('SCREENSHOT_TARGET_INVALID');
  ids.add(outputId);keys.add(key);
 }
}
