import {trustedAppSender} from '../chrome/trusted-sender.mjs';
import {createApi, validateBasicRequest} from './lib/api.js';
import {createAuth} from './lib/auth.js';
import {createCoordinator} from './lib/coordinator.js';
import {openStore} from './lib/store.js';
import {projectOutcome, safeError} from './lib/common.js';
import {createAdapters} from './providers/index.js';

export const BASIC_CHANNEL = 'redown-basic-v1';
const menuProviders = new Map([
  ['google-drive', 'google'], ['onedrive', 'onedrive'], ['dropbox', 'dropbox'],
]);
export const basicMenuProvider = id => menuProviders.get(id);

export function basicSourceFromClick(provider, {srcUrl, linkUrl, pageUrl}, tab) {
  return {provider, sourceUrl: srcUrl || linkUrl || '', hostUrl: pageUrl || tab?.url || ''};
}

export function createBasicHost({chrome, trustedStorage, indexedDB = globalThis.indexedDB}) {
  let ready;
  function initialize() {
    if (!ready) {
      ready = (async () => {
        await trustedStorage();
        const store = await openStore(indexedDB, 'redown-remote-basic-v1');
        try {
          await store.recover();
          const auth = createAuth({chrome});
          const coordinator = createCoordinator({
            store, auth, adapters: createAdapters({}),
            notify: attempt =>
              chrome.runtime.sendMessage({
                channel: 'redown-basic-attempt',
                attempt: {id: attempt.id, provider: attempt.provider, ...projectOutcome(attempt)},
              }).catch(() => {}),
          });
          return createApi({store, auth, coordinator, chrome});
        } catch (error) {
          store.close();
          throw error;
        }
      })();
      ready.catch(() => { ready = undefined; });
    }
    return ready;
  }
  async function request(message, sender) {
    if (!trustedAppSender(chrome.runtime, sender)) {
      return {ok: false, error: {code: 'CALLER_DENIED', message: 'Open the REDOWN Shelf.'}};
    }
    try {
      validateBasicRequest(message);
    } catch (error) {
      return {ok: false, error: safeError(error)};
    }
    try {
      return await (await initialize()).message(message, sender);
    } catch {
      return {ok: false, error: {code: 'STORAGE_UNAVAILABLE', message: 'Provider storage is unavailable.'}};
    }
  }
  async function click(provider, info, tab) {
    let api;
    try {
      api = await initialize();
    } catch {
      return {state: 'failed', code: 'BASIC_STORAGE_UNAVAILABLE'};
    }
    try {
      const attempt = await api.invoke('saves.start', basicSourceFromClick(provider, info, tab));
      return {state: {SAVED: 'completed', FAILED: 'failed', UNCERTAIN: 'uncertain'}[attempt.state] ?? 'uncertain',
        code: attempt.code ?? attempt.state};
    } catch (error) {
      const {code} = safeError(error);
      if (code === 'UNEXPECTED_ERROR') return {state: 'uncertain', code: 'BASIC_SAVE_STATUS_UNKNOWN'};
      return {state: 'failed', code};
    }
  }
  return {request, click};
}
