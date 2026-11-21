import {captureUuid,screenshotError,screenshotTarget} from '../screenshot/rules.mjs';
import {objectETag} from '../explorer/file-api.mjs';
import {independentlyConfirmedScreenshot} from './verified-save.mjs';

export function retainedScreenshotOutput(record,{operationId,outputId}){
 const job=record?.kind==='screenshot-to-cloud'?record.screenshot:null;
 const index=job?.plan?.operationId===operationId&&job.plan.outputs?.findIndex(output=>output.outputId===outputId);
 if(!captureUuid(operationId)||typeof outputId!=='string'||index===false||!Number.isInteger(index)||index<0)
  throw screenshotError('RESULT_NOT_FOUND');
 const saved=job.plan.outputs[index],observed=job.outputs?.[index];
 const scope=screenshotTarget(saved.target),key=saved.key;
 if(typeof key!=='string'||!key.startsWith(scope.prefix)||key.length<=scope.prefix.length||key.endsWith('/')||
  new TextEncoder().encode(key).length>1024||/[\x00-\x1f]/.test(key))throw screenshotError('SOURCE_SCOPE_MISMATCH');
 const target=screenshotTarget({...scope,prefix:key.slice(0,key.lastIndexOf('/')+1)});
 if(target.prefix+key.split('/').at(-1)!==key)throw screenshotError('SOURCE_SCOPE_MISMATCH');
 const confirmed=independentlyConfirmedScreenshot(observed,outputId);
 return {target,key,confirmed,bytes:observed?.bytes??job.captured?.bytes,etag:observed?.etag,
  checksum:observed?.checksum??job.captured?.sha256};
}

export function matchScreenshotObject(output,object){
 if(object?.key!==output.key||object.folder)return false;
 if(Number.isSafeInteger(output.bytes)&&Number(object.size)!==output.bytes)return false;
 return !output.etag||objectETag(object.etag)===objectETag(output.etag);
}
