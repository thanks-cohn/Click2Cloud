// Chromium fixture for the built files. It does not install the extension or
// authenticate to a provider. Set C2C_BASELINE_BUILD to compare a saved build.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {extname, join, resolve, sep} from 'node:path';
import {chromium} from 'playwright-core';
import {basicLifecycleFixture} from '../tests/fixtures/basic-lifecycle.mjs';

const builds = {'/candidate': resolve('dist/click2cloud')};
if (process.env.C2C_BASELINE_BUILD) builds['/baseline'] = resolve(process.env.C2C_BASELINE_BUILD);
const output = resolve(process.env.C2C_BASIC_EVIDENCE ?? 'work/basic-reliability-browser');
const browser = await chromium.launch({
  executablePath: process.env.C2C_CHROME_EXECUTABLE ?? '/usr/bin/chromium',
  headless: true,
});
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://fixture').pathname;
    if (pathname === '/fixture') return response.setHeader('Content-Type', 'text/html').end('<!doctype html><title>Basic fixture</title>');
    const prefix = Object.keys(builds).find(root => pathname.startsWith(root + '/'));
    if (!prefix) return response.writeHead(404).end();
    const path = resolve(builds[prefix], '.' + pathname.slice(prefix.length));
    if (!path.startsWith(builds[prefix] + sep)) return response.writeHead(404).end();
    const type = {'.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json'}[extname(path)];
    if (type) response.setHeader('Content-Type', type);
    response.end(await readFile(path));
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const evidence = {scope: 'Packaged modules and real Chromium IndexedDB with mocked Chrome APIs and provider HTTP',
  chromium: browser.version(), measurements: {}, checks: []};
const manifest = async build => JSON.parse(await readFile(join(builds[build], 'manifest.json'), 'utf8'));
const buildInfo = async build => (await readFile(join(builds[build], 'src/build-info.mjs'), 'utf8')).match(/"revision":"([a-f0-9]+)"/)?.[1];
const fixturePage = async context => {
  const page = await context.newPage();
  page.on('pageerror', error => evidence.errors = [...evidence.errors ?? [], error.message]);
  await page.goto(origin + '/fixture');
  return page;
};
const start = async (page, build, transient) => page.evaluate(basicLifecycleFixture, {build, manifest: await manifest(build), transient});

async function seed(page, repository) {
  return page.evaluate(async repository => {
    const {openStore} = await import(repository + '/src/basic/lib/store.js');
    const {AUTH_SCOPES} = await import(repository + '/src/basic/lib/auth.js');
    const store = await openStore();
    const attempts = [
      ['saved-before-upgrade', 'google', 'SAVED'], ['failed-before-upgrade', 'dropbox', 'FAILED'],
      ['uncertain-before-upgrade', 'dropbox', 'UNCERTAIN'], ['uploading-before-restart', 'onedrive', 'UPLOADING'],
    ];
    for (const [index, [id, provider, state]] of attempts.entries()) {
      const createdAt = new Date(Date.UTC(2026, 10, 1, index)).toISOString();
      await store.begin({id, provider, filename: 'fixture.txt', createdAt, state: 'RECEIVED'});
      await store.event({attemptId: id, provider, stage: 'RECEIVED', timestamp: createdAt});
      if (state === 'UPLOADING') await store.patch(id, {state});
      else await store.finish(id, {state, ...(state === 'SAVED' ? {confirmed: true, objectId: 'object-before-upgrade'} : {})});
    }
    await store.updateSettings({pageSize: 20, diagnosticsEnabled: false, diagnosticsCap: 123});
    const old = await store.historyList({pageSize: 10});
    store.close();
    const credentials = Object.fromEntries(Object.entries(AUTH_SCOPES).map(([id, scopes]) => [
      'redownRemoteBasicV1:auth:' + id,
      {connected: true, identity: id === 'onedrive' ? ['fixture-account', 'fixture-root'] : ['fixture-account'],
        expiresAt: Date.now() + 3600000, accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh', scopes},
    ]));
    const r2 = {sessionId: 'fixture-r2', accessToken: 'synthetic-r2', expiresAt: Date.now() + 3600000,
      accounts: [{id: 'fixture-r2-account', name: 'Fixture account'}], scopes: ['workers-r2.read']};
    localStorage.setItem('fixture:local', JSON.stringify({...credentials, click2cloudOAuth: r2}));
    const {createCurrentStore} = await import(repository + '/src/persistence/current-store.mjs');
    const current = createCurrentStore();
    await current.setHistoryPreferences({range: 'all', previews: 'all', timezone: 'UTC'});
    await current.close();
    return old.items.map(({id, createdAt, updatedAt, state}) => ({id, createdAt, updatedAt, state}));
  }, repository);
}

async function measure(build) {
  const context = await browser.newContext();
  try {
    const page = await fixturePage(context);
    await seed(page, build);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
    const before = await metrics(), coldStart = Date.now();
    await start(page, build);
    const mounted = [];
    for (let i = 0; i < 20; i++) {
      const started = Date.now();
      await page.evaluate(() => basicLifecycle.mount());
      await page.waitForFunction(() => [...document.querySelectorAll('[data-readiness]')].filter(
        row => row.textContent === 'Authorized for this provider.').length === 3);
      mounted.push(Date.now() - started);
    }
    const after = await metrics();
    await page.waitForFunction(() => basicLifecycle.snapshot().activeTimers === 0, null, {timeout: 6000});
    await cdp.send('HeapProfiler.collectGarbage');
    const retained = await metrics();
    const counts = await page.evaluate(() => basicLifecycle.snapshot());
    assert.equal(counts.popups, 0);
    assert.equal(counts.providerWrites, 0);
    assert.equal(counts.maxBasicHandles, 1);
    assert.equal(counts.basicOpens, 1);
    assert.equal(counts.listeners['menu.click'], 1);
    evidence.measurements[build] = {revision: await buildInfo(build), cycles: mounted.length,
      firstMountMs: mounted[0], elapsedMs: Date.now() - coldStart,
      medianReopenMs: mounted.slice(1).sort((a, b) => a - b)[9],
      rendererTaskMs: Math.round((after.TaskDuration - before.TaskDuration) * 1000),
      rendererJsHeapAfterBytes: after.JSHeapUsedSize, rendererJsHeapAfterGCBytes: retained.JSHeapUsedSize, ...counts};
  } finally { await context.close(); }
}

try {
  for (const build of Object.keys(builds)) await measure(build);
  const context = await browser.newContext();
  try {
    let page = await fixturePage(context);
    const old = await seed(page, builds['/baseline'] ? '/baseline' : '/candidate');
    await start(page, '/candidate', 'blocked');
    const result = await page.evaluate(async () => {
      const f = basicLifecycle;
      const counter = f.call('counter.get');
      const status = await Promise.all(['google', 'onedrive', 'dropbox'].map(provider => f.call('providers.getStatus', {provider})));
      const r2 = await f.send({channel: 'engine', version: '3+1.1', method: 'getProviderConnections', params: {}});
      const go = await f.call('providers.goTo', {provider: 'dropbox'});
      const save = await f.call('saves.start', {provider: 'google', sourceUrl: 'https://file.example/file.txt'});
      const failure = (await counter).error.code;
      const denied = await f.send({channel: 'redown-basic-v1', api: 1, op: 'counter.get'}, {id: chrome.runtime.id, url: location.origin + '/other'});
      const blockedOpens = f.counts.basicOpens;
      f.transient = null;
      await f.releaseOpen();
      await new Promise(resolve => setTimeout(resolve, 0));
      const history = await f.call('history.list', {page: 1, pageSize: 2});
      if (!history.ok) throw Error(history.error.message);
      const page2 = await f.call('history.list', {page: 2, pageSize: 2});
      const count = await f.call('counter.get');
      const settings = await f.call('settings.get');
      const preferences = await click2cloud.current.readHistoryPreferences();
      const zip = await f.call('diagnostics.exportZip');
      const {unzipSync, strFromU8} = await import('/candidate/src/basic/vendor/fflate.js');
      const bytes = Uint8Array.from(atob(f.zip.url.split(',')[1]), c => c.charCodeAt(0));
      const entries = unzipSync(bytes);
      const ids = strFromU8(entries['events.jsonl']).trim().split('\n').map(record => JSON.parse(record).attemptId);
      return {go, failure, save: save.error.code, denied: denied.error.code, blockedOpens,
        ready: status.map(reply => reply.value.ready), count: count.value.count, total: history.value.total,
        attempts: [...history.value.items, ...page2.value.items].map(({id, state, createdAt, updatedAt, code}) => ({id, state, createdAt, updatedAt, code})),
        settings: settings.value, preferences, zip: zip.value.downloadId, ids,
        cloudflareUntouched: r2.data?.state === 'CONNECTED' && f.read('local').click2cloudOAuth.sessionId === 'fixture-r2',
        networkWrites: f.counts.providerWrites, opens: f.counts.basicOpens, handles: f.snapshot().openBasicHandles};
    });
    assert.deepEqual(result.ready, [true, true, true]);
    assert.deepEqual(result.go.value, {opened: true});
    assert.equal(result.failure, 'STORAGE_UNAVAILABLE');
    assert.equal(result.save, 'STORAGE_UNAVAILABLE');
    assert.equal(result.denied, 'CALLER_DENIED');
    assert.equal(result.blockedOpens, 1);
    assert.equal(result.opens, 2);
    assert.equal(result.handles, 1);
    assert.equal(result.count, 1);
    assert.equal(result.total, 4);
    assert.equal(result.zip, 7);
    assert.equal(result.networkWrites, 0);
    assert.equal(result.cloudflareUntouched, true);
    assert.deepEqual(result.settings, {pageSize: 20, diagnosticsEnabled: false, diagnosticsCap: 123});
    assert.equal(result.preferences.timezone, 'UTC');
    assert.equal(result.preferences.expandScreenshotHostURL, false);
    assert.deepEqual(result.ids, old.map(row => row.id).reverse());
    for (const [index, attempt] of result.attempts.entries()) {
      assert.equal(attempt.id, old[index].id);
      assert.equal(attempt.createdAt, old[index].createdAt);
      if (old[index].state === 'UPLOADING') {
        assert.equal(attempt.state, 'UNCERTAIN');
        assert.equal(attempt.code, 'WORKER_INTERRUPTED');
      } else {
        assert.equal(attempt.state, old[index].state);
        assert.equal(attempt.updatedAt, old[index].updatedAt);
      }
    }
    evidence.checks.push({gate: 'blocked-open-isolation-and-upgrade-ledger-zip', result});

    await page.waitForFunction(() => click2cloud.registrar.inspect().acknowledgedGeneration !== null);
    const menu = await page.evaluate(() => click2cloud.registrar.inspect().desired.rows.find(row => row.providerAction === 'google-drive').id);
    await page.close();
    page = await fixturePage(context);
    await start(page, '/candidate');
    const startup = await page.evaluate(async menu => {
      const f = basicLifecycle;
      f.rejectGoogle = true;
      f.emit('startup');
      f.emit('menu.click', {menuItemId: menu, srcUrl: 'https://files.example/asset.png', mediaType: 'image',
        pageUrl: 'https://page.example/'}, {id: 3, windowId: 1});
      const statuses = await Promise.all(['google', 'onedrive', 'dropbox'].map(provider => f.call('providers.getStatus', {provider})));
      return {readiness: statuses.map(r => r.value.reason), ...f.snapshot()};
    }, menu);
    await page.waitForFunction(() => basicLifecycle.read('local').lastSave?.code === 'AUTH_NETWORK');
    for (const name of ['message', 'installed', 'startup', 'command', 'menu.click'])
      assert.equal(startup.listeners[name], 1);
    assert.equal(startup.listeners.alarm, 2);
    assert.deepEqual(startup.readiness, ['AUTH_NETWORK', 'READY', 'READY']);
    assert.equal(startup.popups, 0);
    assert.deepEqual((await page.evaluate(() => basicLifecycle.call('counter.get'))).value, {count: 1});
    assert.equal((await page.evaluate(() => basicLifecycle.call('history.list'))).value.total, 5);
    evidence.checks.push({gate: 'cold-native-menu-dispatch-and-independent-provider-failure', result: startup});

    const shortcutOffer = await page.evaluate(async () => {
      const {screenshotShortcutSetupKey: key} = await import('/candidate/src/chrome/command-bindings.mjs');
      basicLifecycle.emit('installed', {reason: 'update'});
      const onUpdate = basicLifecycle.read('local')[key];
      basicLifecycle.emit('installed', {reason: 'install'});
      const onInstall = basicLifecycle.read('local')[key];
      await chrome.storage.local.set({[key]: false});
      basicLifecycle.emit('startup');
      basicLifecycle.emit('installed', {reason: 'update'});
      return {onUpdate: onUpdate ?? null, onInstall, afterDismissal: basicLifecycle.read('local')[key],
        listeners: basicLifecycle.snapshot().listeners.installed};
    });
    assert.deepEqual(shortcutOffer, {onUpdate: null, onInstall: true, afterDismissal: false, listeners: 1});
    evidence.checks.push({gate: 'new-install-only-shortcut-offer', result: shortcutOffer});

    await page.clock.install();
    await page.evaluate(async () => {
      const f = basicLifecycle;
      f.messageOverride = async ({op, input}) => {
        if (op === 'history.latestOutcome' || op === 'saves.pending') return {ok: true, value: null};
        if (op === 'providers.getStatus') return {ok: true, value: {ready: false, connected: false, reason: 'AUTH_REQUIRED'}};
        if (op === 'providers.goTo') return {ok: true, value: {opened: true}};
        if (input.provider === 'google') return new Promise(() => {});
        if (input.provider === 'onedrive') throw Error('private transport details');
        return undefined;
      };
      await f.mount();
    });
    for (const name of ['Google Drive', 'OneDrive', 'Dropbox'])
      await page.getByRole('region', {name}).getByRole('button', {name: 'Refresh'}).click();
    await page.getByRole('button', {name: 'GO TO Google Drive'}).click();
    await page.clock.fastForward(46000);
    for (const [name, code] of [['Google Drive', 'BASIC_MESSAGE_TIMEOUT'], ['OneDrive', 'BASIC_MESSAGE_REJECTED'], ['Dropbox', 'BASIC_MESSAGE_INVALID']]) {
      const card = page.getByRole('region', {name});
      assert.equal(await card.locator('[data-feedback]').getAttribute('data-code'), code);
      assert.equal(await card.getByRole('button', {name: 'Refresh'}).getAttribute('aria-disabled'), null);
    }
    evidence.checks.push({gate: 'card-message-timeout-rejection-and-missing-response-recover-controls', result: 'PASS'});
  } finally { await context.close(); }
  const nativeContext = await browser.newContext();
  try {
    let page = await fixturePage(nativeContext);
    await start(page, '/candidate');
    await page.waitForFunction(() => click2cloud.registrar.inspect().acknowledgedGeneration !== null);
    await page.evaluate(() => {
      const f = basicLifecycle;
      f.oneDrive = f.withholdSource = true;
      const row = click2cloud.registrar.inspect().desired.rows.find(row => row.providerAction === 'onedrive');
      f.emit('menu.click', {menuItemId: row.id, srcUrl: 'https://files.example/one-click.txt?signature=synthetic-private',
        pageUrl: 'https://page.example/'}, {id: 3, windowId: 1});
    });
    await page.waitForFunction(() => basicLifecycle.read('local').lastSave?.code === 'SOURCE_PERMISSION_REQUIRED');
    const pending = await page.evaluate(async () => ({
      last: basicLifecycle.read('local').lastSave,
      attempt: (await basicLifecycle.call('saves.pending', {provider: 'onedrive'})).value,
      ...basicLifecycle.snapshot(),
    }));
    assert.equal(pending.attempt.id, pending.last.operationId);
    assert.equal(pending.attempt.state, 'AWAITING_SOURCE');
    assert.equal(pending.popups, 1);
    assert.equal(pending.tokenExchanges, 1);
    assert.equal(pending.providerWrites, 0);
    await page.close();
    page = await fixturePage(nativeContext);
    await start(page, '/candidate');
    const result = await page.evaluate(async id => {
      const f = basicLifecycle, provider = 'onedrive';
      f.oneDrive = true;
      const resumed = await f.call('saves.resume', {provider, id});
      const replay = await f.call('saves.resume', {provider, id});
      const history = await f.call('history.list');
      const count = await f.call('counter.get');
      return {resumed, replay, history, count: count.value.count, popups: f.counts.popups, writes: f.counts.providerWrites};
    }, pending.attempt.id);
    assert.equal(result.resumed.value?.state, 'SAVED', JSON.stringify(result.resumed));
    assert.equal(result.replay.error.code, 'PENDING_SAVE_NOT_FOUND');
    assert.equal(result.history.value.total, 1);
    const [receipt] = result.history.value.items;
    assert.deepEqual({id: receipt.id, name: receipt.filename, bytes: receipt.bytes,
      root: receipt.destination.rootId, object: receipt.objectId},
    {id: pending.attempt.id, name: 'one-click.txt', bytes: 23, root: 'fixture-root', object: 'fixture-onedrive-object'});
    assert.equal(result.count, 1);
    assert.equal(result.writes, 2);
    assert.equal(result.popups, 0);
    assert.doesNotMatch(JSON.stringify(result), /synthetic-private/);
    await page.waitForFunction(() => basicLifecycle.badge === '1' &&
      basicLifecycle.toolbar.filter(entry => entry.state === 'badge').length === 2 && basicLifecycle.toolbar.at(-1).state === 'idle');
    const chase = await page.evaluate(() => basicLifecycle.toolbar.slice(basicLifecycle.toolbar.findIndex(row => row.state === 'icon')));
    assert.deepEqual(chase.map(row => row.state), ['icon', 'idle', 'badge', 'idle', 'icon', 'idle', 'badge', 'idle']);
    await page.close();
    page = await fixturePage(nativeContext);
    await start(page, '/candidate');
    assert.equal((await page.evaluate(() => basicLifecycle.call('counter.get'))).value.count, 1);
    await page.waitForFunction(() => basicLifecycle.badge === '1');
    assert.deepEqual(await page.evaluate(() => [...new Set(basicLifecycle.toolbar.map(row => row.state))]), ['idle']);
    evidence.checks.push({gate: 'native-onedrive-oauth-withheld-source-continuation-verified-readback', result: {
      attemptId: receipt.id, account: receipt.destination.accountId, root: receipt.destination.rootId,
      objectId: receipt.objectId, name: receipt.filename, bytes: receipt.bytes, basicCounter: result.count,
      popups: pending.popups, writes: result.writes, restartReceiptCount: 1, restartGlobalBadge: 1,
      chase: chase.map(({state, at}, index) => ({state, elapsedMs: Math.round(at - chase[0].at),
        ...(index ? {previousStateMs: Math.round(at - chase[index - 1].at)} : {})})),
    }});

    await page.waitForFunction(() => click2cloud.registrar.inspect().acknowledgedGeneration !== null);
    await page.evaluate(() => {
      const f = basicLifecycle;
      f.oneDrive = true;
      f.oneDriveObject = 'fixture-onedrive-next';
      f.oneDriveName = 'one-click (1).txt';
      const row = click2cloud.registrar.inspect().desired.rows.find(row => row.providerAction === 'onedrive');
      f.emit('menu.click', {menuItemId: row.id, srcUrl: 'https://files.example/one-click.txt',
        pageUrl: 'https://page.example/'}, {id: 3, windowId: 1});
    });
    await page.waitForFunction(() => basicLifecycle.read('local').lastSave?.code === 'SAVED' && basicLifecycle.badge === '2');
    const ready = await page.evaluate(async () => {
      const f = basicLifecycle, attemptId = f.read('local').lastSave.operationId;
      const {value:receipt} = await f.call('history.get', {id:attemptId});
      return {count:(await f.call('counter.get')).value.count, objectId:receipt.objectId,
        name:receipt.filename, writes:f.counts.providerWrites, popups:f.counts.popups, tabs:f.counts.tabOpens};
    });
    assert.deepEqual(ready, {count:2, objectId:'fixture-onedrive-next', name:'one-click (1).txt', writes:2, popups:0, tabs:0});
    evidence.checks.push({gate:'already-authorized-native-onedrive-completes-with-one-click', result:ready});
  } finally { await nativeContext.close(); }
  assert.deepEqual(evidence.errors ?? [], []);
} catch (error) {
  evidence.failure = error.stack;
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  await mkdir(output, {recursive: true});
  await writeFile(join(output, 'results.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
}
