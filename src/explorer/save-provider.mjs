// Narrow SaveIntent adapter over REDOWN's existing API, not a second upload implementation.
import {location,name,prefix} from './file-api.mjs';
// REDOWN uniqueKey keeps the same parent and appends ' (N)' before the extension.
function permittedFinalKey(requested,actual) {
  if(actual===requested)return true;
  const slash=requested.lastIndexOf('/'),parent=requested.slice(0,slash+1),leaf=requested.slice(slash+1);
  if(actual.slice(0,actual.lastIndexOf('/')+1)!==parent)return false;
  const dot=leaf.lastIndexOf('.'),stem=dot>0?leaf.slice(0,dot):leaf,extension=dot>0?leaf.slice(dot):'';
  const candidate=actual.slice(parent.length);
  if(!candidate.startsWith(stem+' (')||!candidate.endsWith(')'+extension))return false;
  const index=candidate.slice(stem.length+2,candidate.length-extension.length-1);
  return /^[1-9]\d*$/.test(index)&&Number(index)>=2&&Number(index)<10000;
}
const exactDestination=(destination,source)=>
  (!destination.accountId||destination.accountId===source.accountId)&&
  (!destination.bucket||destination.bucket===source.bucketName)&&prefix(destination.path||'')===source.prefix;
const sameObject=(a,b)=>a&&b&&a.key===b.key&&a.size===b.size&&a.etag===b.etag&&a.version===b.version&&a.uploaded===b.uploaded&&a.last_modified===b.last_modified;
export function createFileApiSaveProvider({fileApi,resolveDestination}={}) {
  if(typeof fileApi?.run!=='function'||typeof resolveDestination!=='function')throw TypeError('Trusted file API and exact destination resolver required');
  const receipts=new WeakMap();
  return Object.freeze({
    async upload({destination,filename,contentType,bytes}) {
      if(!(bytes instanceof Uint8Array))throw TypeError('Original source bytes required');
      const source=location(await resolveDestination(destination));
      if(!exactDestination(destination,source))throw Object.assign(Error('Resolved destination differs from the requested action'),{code:'DESTINATION_CHANGED'});
      const objectKey=prefix(source.prefix)+name(filename);
      const file=new Blob([bytes],{type:contentType});
      const result=await fileApi.run('upload',{source,file,key:objectKey,conflict:'keep'});
      if(result.state!=='completed')throw Object.assign(Error('Provider upload is not confirmed. Inspect destination before retrying.'),
        {uncertain:['uncertain','started','partial'].includes(result.state),code:'UPLOAD_UNCONFIRMED'});
      const finalKey=result.data?.key;
      if(typeof finalKey!=='string'||!permittedFinalKey(objectKey,finalKey)||!result.data?.verification)
        throw Object.assign(Error('Provider did not return a final destination receipt.'),{uncertain:true,code:'UPLOAD_UNCONFIRMED'});
      const receipt=Object.freeze({confirmed:true,id:result.id});
      receipts.set(receipt,{source,finalKey,bytesLength:bytes.byteLength,destination});
      return receipt;
    },
    async verifyReceipt({receipt,destination,bytes}) {
      const record=receipts.get(receipt);
      if(!record || record.destination!==destination || record.bytesLength!==bytes.byteLength)return {verified:false};
      const current=location(await resolveDestination(destination));
      if(!exactDestination(destination,current)||current.accountId!==record.source.accountId || current.bucketName!==record.source.bucketName ||
         current.prefix!==record.source.prefix)return {verified:false,destinationMatches:false};
      // Reuse streaming readback to avoid inspect's 16 MiB practice-only cap or a second copy.
      const before=await fileApi.run('stat',{source:record.source,key:record.finalKey});
      if(before.state!=='completed'||Number(before.data?.object?.size)!==bytes.byteLength)return {verified:false};
      let compared=0,mismatch=false;
      const readback=await fileApi.run('readStream',{source:record.source,key:record.finalKey},{onChunk:chunk=>{
        if(compared+chunk.byteLength>bytes.byteLength)mismatch=true;
        for(let i=0;i<chunk.byteLength&&!mismatch;i++)if(chunk[i]!==bytes[compared+i])mismatch=true;
        compared+=chunk.byteLength;
      }});
      const after=await fileApi.run('stat',{source:record.source,key:record.finalKey});
      if(readback.state!=='completed'||after.state!=='completed')throw Object.assign(Error('Final provider readback is incomplete'),{uncertain:true,code:'VERIFY_UNCERTAIN'});
      const verified=!mismatch&&compared===bytes.byteLength&&sameObject(before.data.object,after.data.object);
      return {verified,independent:true,destinationMatches:true,byteLength:compared,evidenceClass:'provider-readback'};
    }
  });
}
