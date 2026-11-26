import {normalizeTarget} from '../core/menu-identity.mjs';
import {key, name} from '../explorer/file-api.mjs';

export const maximumUploadFiles = 10000;
export const maximumObjectBytes = 5 * 1024 ** 3 - 1024 ** 2; // R2 single PUT limit.
export const uploadId = value => typeof value === 'string' && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/.test(value);
export const uploadError = (code, message) => Object.assign(Error(message), {code});

export function localUploadKey(source, file, relativePath = file.name, mode = 'files') {
  return validateKey(normalizeTarget(source),file,relativePath,mode);
}
function validateKey(target, file, relativePath, mode) {
  if (target.provider !== 'cloudflare' || target.connectionId !== 'cloudflare:' + target.accountId)
    throw uploadError('SCOPE_UNAUTHORIZED', 'Select an authorized Cloudflare R2 folder.');
  if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > maximumObjectBytes)
    throw uploadError('UPLOAD_FILE_SIZE', 'Each upload must fit the Cloudflare single-file limit.');
  const parts = typeof relativePath === 'string' ? relativePath.split('/') : [];
  if (!['files','folder','mixed'].includes(mode) || !parts.length ||
    (mode==='folder' && parts.length<2) || (mode==='files' && parts.length!==1) ||
    parts.at(-1)!==file.name || relativePath.isWellFormed?.()===false ||
    /[\u0000-\u001f\u007f]/.test(relativePath) || parts.includes('.redown-beta-uploads'))
    throw uploadError('UPLOAD_PATH_INVALID', 'Upload contains a local path this Cloudflare connection cannot preserve.');
  try {
    for (const part of parts) name(part);
    return key(target.prefix + relativePath);
  } catch {
    throw uploadError('UPLOAD_PATH_INVALID', 'Upload contains a local path this Cloudflare connection cannot preserve.');
  }
}

export async function planLocalUpload({source, files, mode, signal, isolateInvalid=false, yieldBatch = () => new Promise(resolve=>setTimeout(resolve,0))}) {
  const target = normalizeTarget(source);
  if (!Number.isSafeInteger(files?.length) || files.length<0 || files.length > maximumUploadFiles)
    throw uploadError('UPLOAD_BATCH_LIMIT', 'Select up to 10,000 files per upload.');
  const paths = new Map(), items = [];
  for (let index = 0; index < files.length; index++) {
    signal?.throwIfAborted();
    const file = files[index];
    const relativePath = file.relativePath ?? (mode==='folder'?file.webkitRelativePath:file.name);
    const item={relativePath,name:file.name,size:file.size,key:null};
    try{
      item.key=validateKey(target,file,relativePath,mode);
      const identity=isolateInvalid?item.key.normalize('NFC').toLowerCase():item.key;
      const previous=paths.get(identity);
      if(previous){
        if(isolateInvalid)previous.invalidCode='UPLOAD_DUPLICATE_PATH';
        throw uploadError('UPLOAD_DUPLICATE_PATH','More than one selected file has the same destination path. No files were uploaded.');
      }
      paths.set(identity,item);
    }catch(error){
      if(!isolateInvalid)throw error;
      item.invalidCode=error.code??'UPLOAD_PATH_INVALID';
    }
    items.push(item);
    if ((index+1)%128===0) await yieldBatch();
  }
  signal?.throwIfAborted();
  return {target, mode, total:files.length, items};
}
