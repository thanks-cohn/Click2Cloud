import {normalizeTarget} from '../core/menu-identity.mjs';
import {key, name} from '../explorer/file-api.mjs';

export const maximumUploadFiles = 10000;
const maximumObjectBytes = 5 * 1024 ** 3 - 1024 ** 2; // R2 single PUT limit.
export const uploadId = value => typeof value === 'string' && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/.test(value);
export const uploadError = (code, message) => Object.assign(Error(message), {code});

export function localUploadKey(source, file, relativePath = file.name, mode = 'files') {
  const target = normalizeTarget(source);
  if (target.provider !== 'cloudflare' || target.connectionId !== 'cloudflare:' + target.accountId)
    throw uploadError('SCOPE_UNAUTHORIZED', 'Select an authorized Cloudflare R2 folder.');
  if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > maximumObjectBytes)
    throw uploadError('UPLOAD_FILE_SIZE', 'Each upload must fit the Cloudflare single-file limit.');
  const parts = typeof relativePath === 'string' ? relativePath.split('/') : [];
  if (!['files','folder'].includes(mode) || (mode==='folder' ? parts.length<2 : parts.length!==1) ||
    parts.at(-1)!==file.name || relativePath.isWellFormed?.()===false ||
    /[\u0000-\u001f\u007f]/.test(relativePath) || parts[0]==='.redown-beta-uploads')
    throw uploadError('UPLOAD_PATH_INVALID', 'Upload contains a local path this Cloudflare connection cannot preserve.');
  try {
    for (const part of parts) name(part);
    return key(target.prefix + relativePath);
  } catch {
    throw uploadError('UPLOAD_PATH_INVALID', 'Upload contains a local path this Cloudflare connection cannot preserve.');
  }
}

export async function planLocalUpload({source, files, mode, signal, yieldBatch = () => new Promise(resolve=>setTimeout(resolve,0))}) {
  const target = normalizeTarget(source);
  if (files.length > maximumUploadFiles)
    throw uploadError('UPLOAD_BATCH_LIMIT', 'Select up to 10,000 files per upload.');
  const paths = new Set();
  for (let index = 0; index < files.length; index++) {
    signal?.throwIfAborted();
    const file = files[index];
    const path = localUploadKey(target,file,mode==='folder'?file.webkitRelativePath:file.name,mode);
    if (paths.has(path))
      throw uploadError('UPLOAD_DUPLICATE_PATH', 'More than one selected file has the same destination path. No files were uploaded.');
    paths.add(path);
    if ((index+1)%128===0) await yieldBatch();
  }
  signal?.throwIfAborted();
  return {target, mode, total:files.length};
}
