import {createApi} from './lib/api.js';
import {createAuth} from './lib/auth.js';
import {createCoordinator} from './lib/coordinator.js';
import {openStore} from './lib/store.js';
import {fail, projectOutcome, safeError} from './lib/common.js';
import {createAdapters} from './providers/index.js';

export const BASIC_CHANNEL = 'redown-basic-v1';
const menuProviders = new Map([
  ['google-drive', 'google'], ['onedrive', 'onedrive'], ['dropbox', 'dropbox'],
]);
export const basicMenuProvider = id => menuProviders.get(id);

export function basicSourceFromClick(provider, {srcUrl, linkUrl, pageUrl}, tab) {
  return {provider, sourceUrl: srcUrl || linkUrl || '', hostUrl: pageUrl || tab?.url || ''};
}

const storageFailure = detail => fail('STORAGE_UNAVAILABLE', detail,
  'Retry when Basic storage is available. Check the provider before retrying any interrupted save.');

export function createBasicHost({chrome, trustedStorage, indexedDB = globalThis.indexedDB, storageTimeoutMs = 8000}) {
  const auth = createAuth({chrome, trustedStorage});
  let ready, opening;
  function durable() {
    if (ready) return ready;
    if (opening) return opening;

    const controller = new AbortController();
    const {signal} = controller;
    let stage = 'opening';
    const aborted = new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), {once: true});
    });
    const timeout = setTimeout(() => {
      controller.abort(storageFailure(`Basic database timed out while ${stage}.`));
    }, storageTimeoutMs);
    const work = (async () => {
      let store;
      try {
        store = await openStore(indexedDB, undefined, {
          signal,
          onBlocked: () => controller.abort(storageFailure('Another connection is blocking the Basic database.')),
        });
        stage = 'recovering interrupted attempts';
        await store.recover(signal);
        signal.throwIfAborted();
        const coordinator = createCoordinator({
          store, auth, adapters: createAdapters({}),
          notify: attempt => chrome.runtime.sendMessage({
            channel: 'redown-basic-attempt',
            attempt: {id: attempt.id, provider: attempt.provider, ...projectOutcome(attempt)},
          }).catch(() => {}),
        });
        ready = {store, coordinator};
        return ready;
      } catch {
        store?.close();
        throw signal.aborted ? signal.reason : storageFailure(`Basic database failed while ${stage}.`);
      }
    })().finally(() => { opening = undefined; });
    // IndexedDB cannot cancel an open request. Keep its slot until the browser
    // settles it. A late open is closed, and an active recovery transaction aborts.
    opening = Promise.race([work, aborted]).finally(() => clearTimeout(timeout));
    return opening;
  }
  const api = createApi({auth, chrome, durable});
  async function click(provider, info, tab) {
    try {
      const attempt = await api.invoke('saves.start', basicSourceFromClick(provider, info, tab));
      return {state: {SAVED: 'completed', FAILED: 'failed', UNCERTAIN: 'uncertain'}[attempt.state] ?? 'uncertain',
        code: attempt.code ?? attempt.state};
    } catch (error) {
      const {code} = safeError(error);
      if (code === 'STORAGE_UNAVAILABLE') return {state: 'failed', code: 'BASIC_STORAGE_UNAVAILABLE'};
      if (code === 'UNEXPECTED_ERROR') return {state: 'uncertain', code: 'BASIC_SAVE_STATUS_UNKNOWN'};
      return {state: 'failed', code};
    }
  }
  return {request: api.message, click};
}
