import {DROPBOX_PREVIEW_SCOPE,identityMatches} from './auth.js';
import {livePreviewLimit, previewError, previewMime} from './preview.mjs';

function abortable(promise, signal) {
  signal.throwIfAborted();
  return new Promise((resolve,reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort',abort,{once:true});
    void Promise.resolve(promise).then(resolve,reject).finally(() => signal.removeEventListener('abort',abort));
  });
}

// A read is scoped to a retained, confirmed attempt and the current exact grant.
export function createHistoryPreviewReader({auth,adapters,readAttempt}) {
  const reads = new Map();
  async function read({id,provider,accountId,objectId,requestId}, owner) {
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) throw previewError('INVALID_INPUT');
    if (reads.size >= 2 || reads.has(requestId)) throw previewError('PREVIEW_BUSY');
    const controller = new AbortController(), {signal} = controller;
    const timer = setTimeout(() => controller.abort(previewError('PREVIEW_TIMEOUT')),20000);
    reads.set(requestId,{owner,controller});
    try {
      const row = await abortable(readAttempt(id),signal);
      if (row?.id !== id || row.provider !== provider || row.state !== 'SAVED' || row.confirmed !== true ||
          row.objectId !== objectId || row.destination?.accountId !== accountId || !accountId || !objectId) {
        throw previewError('PREVIEW_ACCOUNT_UNAVAILABLE');
      }
      const mime = previewMime(row.mime,row.filename);
      if (!mime) throw previewError('IMAGE_BYTES_INVALID');
      if (!Number.isSafeInteger(row.bytes) || row.bytes < 1) throw previewError('PREVIEW_SIZE_UNKNOWN');
      if (row.bytes > livePreviewLimit) throw previewError('PREVIEW_SIZE_LIMIT');
      const identity = [accountId];
      if (provider !== 'google') {
        const root = provider === 'onedrive' ? row.destination.rootId : row.destination.namespace;
        if (!root) throw previewError('PREVIEW_ACCOUNT_UNAVAILABLE');
        identity.push(root);
      }
      const grant = await abortable(auth.authorization(provider),signal);
      if (!identityMatches(provider,identity,grant.identity)) throw previewError('AUTH_ACCOUNT_CHANGED');
      if (provider === 'dropbox' && !grant.scopes?.includes(DROPBOX_PREVIEW_SCOPE)) throw previewError('PREVIEW_READ_SCOPE_MISSING');
      signal.throwIfAborted();
      const preview = await adapters[provider].readImage({id:objectId,size:row.bytes,mime,token:grant.accessToken,signal});
      signal.throwIfAborted();
      if (!grant.isCurrent()) throw previewError('AUTH_CHANGED');
      return {preview,mime};
    } finally {
      clearTimeout(timer);
      reads.delete(requestId);
    }
  }
  function cancel(requestId, owner) {
    const entry = reads.get(requestId);
    if (entry && entry.owner === owner) entry.controller.abort(previewError('PREVIEW_ABORTED'));
    return {cancelled:!!entry && entry.owner === owner};
  }
  return {read,cancel};
}
