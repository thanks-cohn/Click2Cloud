import {createApi} from './lib/api.js';
import {createAuth} from './lib/auth.js';
import {createCoordinator} from './lib/coordinator.js';
import {openStore} from './lib/store.js';
import {acquireSource, browserSourceAccess} from './lib/source.js';
import {createSaveIntents} from './lib/intent.js';
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

export function createBasicHost({chrome, trustedStorage, indexedDB = globalThis.indexedDB, storageTimeoutMs = 8000, onVerified}) {
  const intents = createSaveIntents(chrome, trustedStorage);
  const auth = createAuth({chrome, trustedStorage, onStatus: status => {
    void chrome.runtime.sendMessage?.({channel: 'redown-basic-status', status}).catch(() => {});
  }});
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
          store, auth, intents, onVerified, adapters: createAdapters({}),
          acquire: input => acquireSource(input, {hasAccess: browserSourceAccess(chrome.permissions)}),
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
  const api = createApi({auth, chrome, durable, afterAuth(provider) {
    void (async () => {
      if (!await intents.get(provider)) return;
      const {coordinator} = await durable();
      await coordinator.afterLogin(provider);
    })().catch(() => {});
  }});
  async function click(provider, info, tab) {
    try {
      const attempt = await api.invoke('saves.start', basicSourceFromClick(provider, info, tab), {native:true});
      return {state: {SAVED: 'completed', FAILED: 'failed', UNCERTAIN: 'uncertain',
        AWAITING_AUTH: 'pending', AWAITING_SOURCE: 'pending'}[attempt.state] ?? 'uncertain',
        code: attempt.code ?? attempt.state, attemptId: attempt.id};
    } catch (error) {
      const {code} = safeError(error);
      if (code === 'STORAGE_UNAVAILABLE') return {state: 'failed', code: 'BASIC_STORAGE_UNAVAILABLE'};
      if (code === 'UNEXPECTED_ERROR') return {state: 'uncertain', code: 'BASIC_SAVE_STATUS_UNKNOWN'};
      return {state: 'failed', code};
    }
  }
  async function verifiedCount(range) {
    if (!ready && !opening && typeof indexedDB.databases === 'function' &&
        !(await indexedDB.databases()).some(db => db.name === 'redown-remote-basic-v1'))
      return {count:0, complete:true};
    return (await durable()).store.verifiedCount(range);
  }
  return {request: api.message, click, verifiedCount};
}
