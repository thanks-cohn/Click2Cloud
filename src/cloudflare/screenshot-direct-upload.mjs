import {diagnoseCloudflare} from '../auth/cloudflare-oauth.mjs';
import {screenshotTarget} from '../screenshot/rules.mjs';
import {SCREENSHOT_BYTES,screenshotDigest,screenshotFilename} from './screenshot-wire.mjs';

export const directScreenshotMethod='direct-r2-object-api';
export const directScreenshotVerification='direct-r2-get-sha256';
const readScope='workers-r2-bucket-item.read';
const writeScope='workers-r2-bucket-item.write';
const transient=new Set(['TRANSIENT_API_FAILURE','TOKEN_EXPIRED','R2_UPLOAD_RESPONSE_INVALID']);
const permanent=new Set(['KEY_TOO_LONG','SCREENSHOT_TARGET_INVALID','R2_OBJECT_CONFLICT','R2_UPLOAD_METADATA_MISMATCH']);
const safeCode=(value,fallback)=>/^[A-Z][A-Z0-9_]{1,79}$/.test(value??'')?value:fallback;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const segment=value=>encodeURIComponent(value).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())
 .replace(/\.{2,}/g,dots=>'%2E'.repeat(dots.length));
const bucketPath=({accountId,bucketName})=>'/accounts/'+segment(accountId)+'/r2/buckets/'+segment(bucketName);

async function boundedBytes(response,limit){
 const reader=response.body?.getReader();
 if(!reader)return null;
 const bytes=new Uint8Array(limit);
 let length=0,complete=false;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done){complete=true;return bytes.subarray(0,length);}
   if(length+value.length>limit)return null;
   bytes.set(value,length);length+=value.length;
  }
 }finally{if(!complete)void reader.cancel().catch(()=>{});reader.releaseLock();}
}
async function json(response){
 try{
  const bytes=await boundedBytes(response,65536);
  return bytes&&JSON.parse(new TextDecoder().decode(bytes));
 }catch{return null;}
}
function providerFailure(response,body){
 const diagnosed=diagnoseCloudflare(response,body);
 const code=diagnosed.code!=='R2_STATUS_UNKNOWN'?diagnosed.code:
  ({403:'R2_BUCKET_ACCESS_DENIED',404:'R2_OBJECT_NOT_FOUND',409:'R2_OBJECT_CONFLICT',412:'R2_OBJECT_CONFLICT'})[response.status]??'R2_API_REJECTED';
 return {code,httpStatus:response.status,providerCodes:diagnosed.providerCodes};
}
function requestFailure(error){
 return {code:safeCode(error?.code,'TRANSIENT_API_FAILURE'),httpStatus:error?.diagnostic?.httpStatus,
  providerCodes:error?.diagnostic?.providerCodes};
}

export function createDirectScreenshotUpload(oauth,{backoff=wait}={}){
 async function checkBucket(target,expectedSession){
  const response=await oauth.request(bucketPath(target),{expectedSession,cache:'no-store'});
  const body=await json(response);
  if(!response.ok||body?.success!==true||body.result?.name!==target.bucketName){
   const info=providerFailure(response,body);
   const code=response.status===404?'SELECTED_BUCKET_MISSING':info.code;
   throw Object.assign(Error(code),{code,diagnostic:info});
  }
 }
 async function deliver({output,captureId,image,byteLength,imageDigest,retry,sessionId,trace}){
  const {outputId,key}=output;
  const result=(state,code,extra={})=>({outputId,state,code,method:directScreenshotMethod,
   recoverable:state!=='confirmed'&&!permanent.has(code)&&code!=='SCREENSHOT_ORIGINAL_UNAVAILABLE',...extra});
  let target;
  try{target=screenshotTarget(output.target);}
  catch{return result('blocked','SCREENSHOT_TARGET_INVALID');}
  if(key!==target.prefix+screenshotFilename(captureId,outputId)||[target.accountId,target.bucketName].some(x=>x==='.'||x==='..'))
   return result('blocked','SCREENSHOT_TARGET_INVALID');
  if(new TextEncoder().encode(key).length>1024)return result('blocked','KEY_TOO_LONG');
  const path=bucketPath(target)+'/objects/'+key.split('/').map(segment).join('/');
  const options={expectedSession:sessionId,timeoutMs:12000,cache:'no-store'};
  async function readback(){
   let info,response;
   try{
    response=await oauth.request(path,{...options,requiredScopes:[readScope]});
    if(response.status!==200)info=providerFailure(response,await json(response));
    else{
     const bytes=await boundedBytes(response,Math.min(byteLength,SCREENSHOT_BYTES));
     const matches=bytes?.length===byteLength&&await screenshotDigest(bytes)===imageDigest;
     info={code:matches?'R2_BYTES_MATCH':'R2_OBJECT_CONFLICT',httpStatus:response.status,
      comparison:matches?'match':'mismatch'};
    }
   }catch(error){info={...requestFailure(error),httpStatus:response?.status??error?.diagnostic?.httpStatus};}
   trace('R2_READBACK',info.code==='R2_BYTES_MATCH'?'ok':'unconfirmed',info);
   return info;
  }
  async function put(){
   let info,sent=false;
   try{
    const response=await oauth.request(path,{...options,requiredScopes:[readScope,writeScope],method:'PUT',
     headers:{'content-type':'image/png','if-none-match':'*'},body:image,
     onSend(){sent=true;trace('R2_PUT_SENT','started');}});
    const body=await json(response);
    if(!response.ok||body?.success===false)info=providerFailure(response,body);
    else if(body?.success!==true||!body.result)info={code:'R2_UPLOAD_RESPONSE_INVALID',httpStatus:response.status};
    else if(body.result.key!==key||Number(body.result.size)!==byteLength)
     info={code:'R2_UPLOAD_METADATA_MISMATCH',httpStatus:response.status};
    else info={code:'R2_PUT_ACCEPTED',httpStatus:response.status};
   }catch(error){info=requestFailure(error);}
   if(sent||info.httpStatus)trace('R2_RESPONSE',info.code==='R2_PUT_ACCEPTED'?'ok':'unconfirmed',info);
   return {...info,sent};
  }
  const checked=info=>info.code==='R2_BYTES_MATCH'?
   result('confirmed',null,{...info,code:null,verification:directScreenshotVerification,bytes:byteLength,checksum:imageDigest}):
   result(info.code==='R2_OBJECT_CONFLICT'?'failed':'unknown',info.code,info);
  if(retry||!image){
   const found=await readback();
   if(found.code!=='R2_OBJECT_NOT_FOUND')return !image&&found.code!=='R2_BYTES_MATCH'?
    {...checked(found),recoverable:false}:checked(found);
   if(!image)return result('blocked','SCREENSHOT_ORIGINAL_UNAVAILABLE');
  }
  for(let attempt=0;attempt<2;attempt++){
   const written=await put();
   if(!['R2_PUT_ACCEPTED','R2_OBJECT_CONFLICT'].includes(written.code)&&!(written.sent&&transient.has(written.code)))
    return result(permanent.has(written.code)?'failed':transient.has(written.code)?'pending':'blocked',written.code,
     {httpStatus:written.httpStatus,providerCodes:written.providerCodes});
   const found=await readback();
   if(found.code!=='R2_OBJECT_NOT_FOUND')return checked(found);
   if(!transient.has(written.code)||attempt===1)
    return result('pending','R2_OBJECT_UNCONFIRMED',{httpStatus:found.httpStatus,providerCodes:found.providerCodes});
   await backoff(250);
  }
 }
 return {authority:oauth.authority,checkBucket,deliver};
}
