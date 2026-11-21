import assert from 'node:assert/strict';
import test from 'node:test';
import 'fake-indexeddb/auto';
import {IDBFactory} from 'fake-indexeddb';
import {createBasicHost, basicMenuProvider, basicSourceFromClick} from '../src/basic/host.mjs';
import {openStore} from '../src/basic/lib/store.js';

const base = 'chrome-extension://redown-fixture/';
const runtime = {id: 'redown-fixture', getURL: path => base + path};
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
  assert.equal(initializations, 1);
});

test('Basic initialization retries after storage failure and GO TO only opens its fixed URL', async () => {
  let initializations = 0;
  const tabs = [];
  const host = createBasicHost({
    chrome: {runtime, tabs: {create: async tab => tabs.push(tab)}},
    indexedDB: new IDBFactory(),
    trustedStorage: () => { if (++initializations === 1) throw Error('Private quota observation'); },
  });
  const go = request('providers.goTo', {provider: 'onedrive'});
  assert.equal((await host.request(go, shelf)).error.code, 'STORAGE_UNAVAILABLE');
  assert.deepEqual(tabs, []);
  assert.deepEqual(await host.request(go, shelf), {ok: true, value: {opened: true}});
  assert.deepEqual(tabs, [{url: 'https://onedrive.live.com/'}]);
  assert.deepEqual((await host.request(request('counter.get'), shelf)).value, {count: 0});
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
