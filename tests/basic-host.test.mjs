import assert from 'node:assert/strict';
import test from 'node:test';
import 'fake-indexeddb/auto';
import {IDBFactory} from 'fake-indexeddb';
import {createBasicHost, basicMenuProvider, basicSourceFromClick} from '../src/basic/host.mjs';
import {openStore} from '../src/basic/lib/store.js';

const base = 'chrome-extension://redown-fixture/';
const runtime = {id: 'redown-fixture', getURL: path => base + path,
  getManifest: () => ({oauth2: {client_id: 'fixture-client.apps.googleusercontent.com'}})};
const shelf = {id: runtime.id, url: base + 'extension/app.html', origin: base.slice(0, -1)};
const request = (op, input, api = 1) => ({channel: 'redown-basic-v1', api, op, input});

test('Basic host rejects malformed or untrusted messages before storage or side effects', async () => {
  let initializations = 0;
  const host = createBasicHost({chrome: {runtime}, indexedDB: new IDBFactory(), trustedStorage: () => { initializations++; }});
  for (const sender of [
    null,
    {...shelf, id: 'other'},
    {...shelf, url: 'https://example.test/'},
    {...shelf, origin: 'https://example.test'},
    {...shelf, url: base + 'extension/mirror.html'},
  ]) {
    assert.equal((await host.request(request('saves.start', {}), sender)).error.code, 'CALLER_DENIED');
  }
  for (const [message, code] of [
    [request('api.describe', {}, 2), 'API_VERSION_UNSUPPORTED'],
    [request('getConfiguration', {}), 'UNKNOWN_OPERATION'],
    [request('api.describe', null), 'INVALID_INPUT'],
    [request('auth.connect', {provider: 'cloudflare'}), 'INVALID_INPUT'],
    [request('settings.update', {theme: 'dark'}), 'INVALID_INPUT'],
  ]) {
    assert.equal((await host.request(message, shelf)).error.code, code);
  }
  assert.equal(initializations, 0);
  assert.equal((await host.request(request('api.describe'), shelf)).value.version, 1);
  assert.equal(initializations, 0);
});

test('Basic retries IndexedDB open failures and GO TO opens its fixed URL without credentials', async () => {
  const db = new IDBFactory();
  let initializations = 0;
  const tabs = [];
  const host = createBasicHost({
    chrome: {runtime, tabs: {create: async tab => tabs.push(tab)}},
    indexedDB: {open(...args) {
      if (++initializations === 1) throw new DOMException('Private quota observation', 'QuotaExceededError');
      return db.open(...args);
    }},
    trustedStorage: () => { throw new DOMException('Private access observation', 'SecurityError'); },
  });
  const go = request('providers.goTo', {provider: 'onedrive'});
  const status = await host.request(request('providers.getStatus', {provider: 'onedrive'}), shelf);
  assert.equal(status.value.reason, 'AUTH_STORAGE_UNAVAILABLE');
  assert.deepEqual(await host.request(go, shelf), {ok: true, value: {opened: true}});
  assert.deepEqual(tabs, [{url: 'https://onedrive.live.com/'}]);
  assert.equal(initializations, 0);
  const badStore = await host.request(request('counter.get'), shelf);
  assert.equal(badStore.error.code, 'STORAGE_UNAVAILABLE');
  assert.doesNotMatch(badStore.error.message, /Private/);
  assert.deepEqual((await host.request(request('counter.get'), shelf)).value, {count: 0});
  assert.equal(initializations, 2);
});

for (const blocked of [true, false]) {
  test(`Basic ${blocked ? 'blocked' : 'hung'} open leaves all provider cards usable and fences durable work`, async () => {
    const factory = new IDBFactory(), first = {};
    let opens = 0, lateCloses = 0, tabCreates = 0;
    const host = createBasicHost({
      chrome: {runtime, tabs: {create: async () => {tabCreates++;}}, storage: {local: {get: async () => ({})}}},
      trustedStorage: async () => {},
      storageTimeoutMs: 30,
      indexedDB: {open(...args) {
        if (++opens > 1) return factory.open(...args);
        if (blocked) queueMicrotask(() => first.onblocked());
        return first;
      }},
    });
    const send = (op, input) => host.request(request(op, input), shelf);
    const pending = send('history.list');
    assert.equal((await send('providers.goTo', {provider: 'google'})).ok, true);
    const status = await send('providers.list');
    assert.equal(status.value.length, 3);
    assert(status.value.every(provider => provider.ready === false));
    for (const reply of await Promise.all([
      pending, send('counter.get'), send('settings.get'),
      send('diagnostics.exportZip'),
      send('saves.start', {provider: 'google', sourceUrl: 'https://example.test/image'}),
    ])) {
      assert.equal(reply.error.code, 'STORAGE_UNAVAILABLE');
      assert.match(reply.error.message, blocked ? /blocking/ : /timed out while opening/);
    }
    const native = await host.click('dropbox', {srcUrl: 'https://example.test/image'});
    assert.deepEqual(native, {state: 'failed', code: 'BASIC_STORAGE_UNAVAILABLE'});
    assert.equal(opens, 1);
    assert.equal(tabCreates, 1);
    first.result = {close: () => {lateCloses++;}};
    first.onsuccess();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual((await send('counter.get')).value, {count: 0});
    assert.equal((await send('history.list')).value.total, 0);
    assert.equal(lateCloses, 1);
    assert.equal(opens, 2);
  });
}

test('Basic aborts a queued recovery transaction without admitting writes before recovery can commit', async () => {
  const indexedDB = new IDBFactory();
  const store = await openStore(indexedDB);
  const id = 'pending-at-restart';
  await store.begin({id, provider: 'google', state: 'UPLOADING', createdAt: new Date().toISOString()});
  store.close();

  const lock = await new Promise(resolve => {
    const request = indexedDB.open('redown-remote-basic-v1', 1);
    request.onsuccess = () => resolve(request.result);
  });
  const transaction = lock.transaction('attempts', 'readwrite');
  let release = false;
  function hold() {
    if (!release) transaction.objectStore('attempts').get(id).onsuccess = hold;
  }
  hold();
  try {
    const host = createBasicHost({chrome: {runtime}, indexedDB, storageTimeoutMs: 40});
    const result = await host.request(request('history.get', {id}), shelf);
    assert.equal(result.error.code, 'STORAGE_UNAVAILABLE');
    assert.match(result.error.message, /recovering interrupted attempts/);
    release = true;
    lock.close();
    const inspector = await openStore(indexedDB);
    assert.equal((await inspector.getAttempt(id)).state, 'UPLOADING');
    inspector.close();
    const recovered = await host.request(request('history.get', {id}), shelf);
    assert.equal(recovered.value.code, 'WORKER_INTERRUPTED');
    assert.equal(recovered.value.state, 'UNCERTAIN');
  } finally {
    release = true;
    lock.close();
  }
});

test('Basic recovery marks interrupted writes uncertain without replay or a positive counter', async () => {
  const indexedDB = new IDBFactory();
  const store = await openStore(indexedDB);
  const id = 'interrupted-attempt';
  await store.begin({id, provider: 'dropbox', state: 'RECEIVED', createdAt: new Date().toISOString()});
  await store.patch(id, {state: 'UPLOADING'});
  store.close();
  const host = createBasicHost({chrome: {runtime}, indexedDB, trustedStorage: async () => {}});
  const attempt = await host.request(request('history.get', {id}), shelf);
  assert.equal(attempt.value.state, 'UNCERTAIN');
  assert.equal(attempt.value.code, 'WORKER_INTERRUPTED');
  const latest = await host.request(request('history.latestOutcome', {provider: 'dropbox'}), shelf);
  assert.equal(latest.value.state, 'UNCERTAIN');
  assert.equal((await host.request(request('history.latestOutcome', {provider: 'onedrive'}), shelf)).value, null);
  assert.deepEqual((await host.request(request('counter.get'), shelf)).value, {count: 0});
});

test('Basic routes the exact supported provider IDs and preserves the clicked source', () => {
  assert.deepEqual(['google-drive', 'onedrive', 'dropbox', 'cloudflare', 'constructor'].map(basicMenuProvider),
    ['google', 'onedrive', 'dropbox', undefined, undefined]);
  assert.deepEqual(basicSourceFromClick('google', {
    srcUrl: 'https://media.example/image', linkUrl: 'https://docs.example/link',
    pageUrl: 'https://example.test/page',
  }), {provider: 'google', sourceUrl: 'https://media.example/image', hostUrl: 'https://example.test/page'});
  assert.equal(basicSourceFromClick('dropbox', {linkUrl: 'https://docs.example/link'}, {url: 'https://example.test/page'}).sourceUrl,
    'https://docs.example/link');
});

test('Only a failed source read surfaces the concrete site for optional access', async () => {
  const indexedDB = new IDBFactory();
  const store = await openStore(indexedDB);
  const id = 'source-read-failed';
  await store.begin({id, provider: 'google', state: 'RECEIVED', createdAt: new Date().toISOString(),
    sourceUrl: 'https://media.example:8443/private/file?signature=hidden'});
  await store.finish(id, {state: 'FAILED', code: 'SOURCE_UNAVAILABLE'});
  const outcome = await store.latestOutcome('google');
  assert.equal(outcome.sourceOrigin, 'https://media.example:8443');
  assert(!JSON.stringify(outcome).includes('private'));
  assert(!JSON.stringify(outcome).includes('signature'));
  store.close();
});
