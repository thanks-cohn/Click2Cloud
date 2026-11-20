import {digest,boundedJSON,fail} from './wire.mjs';
import {destinationWriter} from './writer-registry.mjs';
import {SCREENSHOT_PLAN_BYTES,screenshotDigest,screenshotReader,validateScreenshotIntent} from './screenshot-wire.mjs';

const PNG_SIGNATURE=[137,80,78,71,13,10,26,10];

export async function readScreenshot(request,cap,scope,action){
 const input=action==='write'?screenshotReader(request):null;
 try{
  const intent=input?await input.plan():await boundedJSON(request,SCREENSHOT_PLAN_BYTES);
  if(cap.use!=='screenshot'||cap.screenshotAction!==action||cap.operationId!==intent?.operationId||
     cap.screenshotDigest!==await digest(intent))fail('CAPABILITY_DENIED');
  validateScreenshotIntent(intent,scope);
  const image=input?await input.image(intent.byteLength):null;
  if(image&&(!PNG_SIGNATURE.every((byte,index)=>image[index]===byte)||await screenshotDigest(image)!==intent.imageDigest))
   fail('SCREENSHOT_IMAGE_MISMATCH');
  return {intent,image};
 }finally{await input?.close();}
}

export async function runScreenshot({intent,image},cap,authorize){
 const writer=destinationWriter(cap),results=[];
 async function writeOne({outputId,key,prefix},allowed){
  const result={outputId,key};
  const outcome=(state,code,observed={})=>({...result,state,code,at:new Date().toISOString(),...observed});
  if(!allowed)return outcome('blocked','AUTHORIZATION_REVOKED');
  const verify=()=>writer.verify({receipt:{key},includeChecksum:true});
  const compare=(proof,written)=>proof&&proof.size===intent.byteLength&&proof.operationId===outputId&&
    proof.savedFileMetadata?.customMetadata?.captureId===intent.captureId&&proof.sha256===intent.imageDigest&&
    (!written||proof.etag===written.etag&&proof.version===written.version);
  const confirmed=proof=>outcome('confirmed','R2_HEAD_CHECKSUM',{bytes:proof.size,etag:proof.etag,version:proof.version,
   checksum:proof.sha256,comparison:'match',verification:'independent-r2-head-sha256'});
  let written,writeFailed=false;
  try{
   if(image){
    const existing=intent.retry?await verify():null;
    if(existing)return compare(existing)?confirmed(existing):outcome('failed','SCREENSHOT_KEY_CONFLICT',{comparison:'mismatch'});
    try{
     written=await writer.write({prepared:{key,destination:{...cap.destination,prefix:prefix.slice(0,-1)}},body:image,
       length:intent.byteLength,contentType:'image/png',operationId:outputId,checksum:intent.imageDigest,
       provenance:{captureId:intent.captureId,screenshotOperationId:intent.operationId}});
    }catch{writeFailed=true;}
   }
   const proof=await verify();
   if(compare(proof,written?.conflict?null:written))return confirmed(proof);
   if(proof)return outcome('failed','SCREENSHOT_VERIFICATION_MISMATCH',{comparison:'mismatch',bytes:proof.size});
   return outcome(writeFailed?'failed':'unknown',writeFailed?'SCREENSHOT_WRITE_FAILED':'SCREENSHOT_OBJECT_UNCONFIRMED',{comparison:'unknown'});
  }catch{return outcome('unknown','SCREENSHOT_READBACK_FAILED',{comparison:'unknown'});}
 }
 // Bound simultaneous R2 buffers; the single request body is shared by all writes.
 for(let start=0;start<intent.outputs.length;start+=4){
  const allowed=await authorize();
  const batch=await Promise.all(intent.outputs.slice(start,start+4).map(output=>writeOne(output,allowed)));
  results.push(...batch);
 }
 return {operationId:intent.operationId,captureId:intent.captureId,outputs:results};
}
