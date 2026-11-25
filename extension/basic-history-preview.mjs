import {decodePreview, livePreviewLimit, previewError, previewMime, retainedPreviewLimit} from '../src/basic/lib/preview.mjs';

export function basicImageMime(record) {
  if (!['google','onedrive','dropbox'].includes(record.provider) || record.sourceApi !== `basic:${record.provider}` ||
      record.status !== 'verified' || !record.sourceRecordId || !record.providerObjectId) return null;
  return previewMime(record.mime,record.filename);
}

export async function authorizeDropboxHistoryPreview(record,runtime=chrome.runtime){
  const out=await runtime.sendMessage({channel:'redown-basic-v1',api:1,op:'auth.reconnect',
    input:{provider:'dropbox',previewId:record.sourceRecordId}});
  if(out?.ok!==true)throw previewError(out?.error?.code??'PREVIEW_PROVIDER_UNAVAILABLE');
}

export async function loadBasicHistoryImage(record, signal, runtime = chrome.runtime) {
  const mime = basicImageMime(record);
  if (!mime) throw previewError('PREVIEW_RECORD_UNAVAILABLE');
  const id = record.sourceRecordId, provider = record.provider, objectId = record.providerObjectId;
  const accountId = record.destination?.account ?? null;
  signal.throwIfAborted();
  const requestId = crypto.randomUUID();
  const send = (op,input) => runtime.sendMessage({channel:'redown-basic-v1',api:1,op,input});
  let live = false, timeout;
  const deadline = new Promise((_,reject) => {
    timeout = setTimeout(() => {
      cancelLive();
      reject(previewError('PREVIEW_TIMEOUT'));
    },22000);
  });
  const cancelLive = () => {
    if (live) void send('history.cancelImagePreview',{requestId}).catch(() => {});
  };
  let abort;
  const aborted = new Promise((_,reject) => {
    abort = () => { cancelLive(); reject(signal.reason); };
    signal.addEventListener('abort',abort,{once:true});
  });
  async function read(op, input) {
    const response = await Promise.race([send(op,input),deadline,aborted]);
    signal.throwIfAborted();
    if (response?.ok !== true) throw previewError(response?.error?.code ?? 'PREVIEW_PROVIDER_UNAVAILABLE');
    return response.value;
  }
  try {
    const attempt = await read('history.get',{id});
    if (attempt?.id !== id || attempt.provider !== provider || attempt.objectId !== objectId ||
        attempt.state !== 'SAVED' || attempt.confirmed !== true ||
        (attempt.destination?.accountId ?? null) !== accountId ||
        (attempt.destination?.namespace ?? null) !== (record.destination?.namespace ?? null) ||
        (attempt.destination?.rootId ?? null) !== (record.destination?.drive ?? null) ||
        previewMime(attempt.mime,attempt.filename) !== mime) throw previewError('PREVIEW_RECORD_UNAVAILABLE');
    if (attempt.preview) {
      try {
        const bytes = decodePreview(attempt.preview,mime,retainedPreviewLimit);
        if (Number.isSafeInteger(attempt.bytes) && bytes.length !== attempt.bytes) throw previewError('IMAGE_BYTES_INVALID');
        return {blob:new Blob([bytes],{type:mime}),label:'Retained preview from the save',retained:true};
      } catch (error) {
        if (!accountId) throw error;
      }
    }
    if (!accountId) throw previewError('PREVIEW_ACCOUNT_UNAVAILABLE');
    live = true;
    const result = await read('history.readImagePreview',{id,provider,accountId,objectId,requestId});
    if (result?.mime !== mime) throw previewError('IMAGE_BYTES_INVALID');
    const bytes = decodePreview(result.preview,mime,livePreviewLimit);
    return {blob:new Blob([bytes],{type:mime}),label:'Live image from the provider'};
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort',abort);
  }
}
