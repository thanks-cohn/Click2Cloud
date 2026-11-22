import {fail} from './common.js';

export const CONTINUE_WINDOW_MS = 10 * 60_000;

export function pendingExpired(intent, now) {
  return !Number.isSafeInteger(intent?.expiresAt) ||
    intent.expiresAt <= now || intent.expiresAt - now > CONTINUE_WINDOW_MS;
}

export function createSaveIntents(chrome, trustedStorage) {
  const session = chrome.storage?.session;
  // The fixed provider set bounds both these lanes and the trusted, session-only
  // storage. Exact clicked URLs can contain signed query strings.
  const lanes = new Map();
  const key = provider => 'redownRemoteBasicV1:saveIntent:' + provider;
  const protectedCall = async work => {
    try {
      if (trustedStorage) await trustedStorage();
      else await session.setAccessLevel({accessLevel: 'TRUSTED_CONTEXTS'});
      return await work();
    } catch (error) {
      if (error?.code === 'PENDING_SAVE_EXISTS') throw error;
      throw fail('PENDING_STORAGE_UNAVAILABLE', 'Chrome could not retain this pending save.',
        'Review Chrome extension storage before making another save.');
    }
  };
  const read = async provider => (await session.get(key(provider)))[key(provider)];
  const serial = (provider, work) => {
    const result = (lanes.get(provider) ?? Promise.resolve()).catch(() => {}).then(() => protectedCall(work));
    lanes.set(provider, result);
    const clear = () => { if (lanes.get(provider) === result) lanes.delete(provider); };
    void result.then(clear, clear);
    return result;
  };
  return {
    get: provider => protectedCall(() => read(provider)),
    keep: (provider, intent, now) => serial(provider, async () => {
      const prior = await read(provider);
      if (prior && prior.id !== intent.id && !pendingExpired(prior, now))
        throw fail('PENDING_SAVE_EXISTS', 'This provider already has a save waiting.',
          'Finish the pending save in the Shelf.');
      await session.set({[key(provider)]: intent});
    }),
    remove: (provider, id) => serial(provider, async () => {
      if ((await read(provider))?.id === id) await session.remove(key(provider));
    }),
  };
}
