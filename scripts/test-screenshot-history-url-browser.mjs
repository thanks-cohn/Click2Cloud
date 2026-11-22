// Reopens a disposable Chromium profile using real Shelf, API and IndexedDB.
// Screenshot bytes and provider/network APIs are fixtures.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve, extname, join, sep} from 'node:path';
import {chromium} from 'playwright-core';

const build = resolve('dist/click2cloud'), root = resolve('.');
const out = resolve(process.env.C2C_HISTORY_URL_EVIDENCE ?? 'work/screenshot-history-url');
const profile = await mkdtemp(join(tmpdir(), 'c2c-host-url-'));
await mkdir(out, {recursive: true});
const png = Array.from(await readFile('tests/fixtures/images/picture.png'));
const types = {'.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2'};
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://fixture').pathname, base = path.startsWith('/tests/') ? root : build;
    const file = resolve(base, '.' + path);
    if (!file.startsWith(base + sep)) return res.writeHead(404).end();
    res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const evidence = {scope: 'Chromium and disposable persistent IndexedDB with provider fixtures', checks: [], matrix: [], errors: []};
let context, page;
async function launch() {
  context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.C2C_CHROME_EXECUTABLE ?? '/usr/bin/chromium',
    headless: true, viewport: {width: 360, height: 800},
  });
  evidence.chromium = context.browser().version();
  await context.addInitScript(bytes => {
    const listeners = new Set();
    const storage = () => JSON.parse(localStorage.getItem('historyFixture:chrome') ?? '{}');
    window.fixtureImageData = {};
    window.fixtureNotify = msg => listeners.forEach(fn => fn(msg, {id: 'fixture'}));
    window.fixtureExportParts = [];
    window.showSaveFilePicker = async () => ({createWritable: async () => ({
      write: async chunk => window.fixtureExportParts.push(chunk), close: async () => {}, abort: async () => {},
    })});
    Object.defineProperty(window, 'chrome', {value: {
      runtime: {id: 'fixture', onMessage: {addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn)},
        async sendMessage(message) {
          if (message.channel === 'redown-basic-v1') return {ok: true, value: message.op === 'history.latestOutcome' ? null :
            {connected: false, ready: false, reason: 'AUTH_REQUIRED'}};
          if (message.channel === 'engine')
            return (await import('/tests/product-browser-host.mjs')).invoke({version: message.version, method: message.method, params: message.params});
          if (message.channel === 'screenshot' && message.method === 'history-output') {
            const row = await productFixture.current.readRemoteResult(message.params.operationId);
            const {retainedScreenshotOutput} = await import('/src/history/screenshot-output.mjs');
            const {target, key, checksum} = retainedScreenshotOutput(row, message.params);
            window.fixtureImageData[key] = bytes;
            window.fixtureImageDelay = {[key]: 750};
            return {state: 'completed', data: {target, key, checksum, object: {key, size: bytes.length, etag: 'fixture-preview', contentType: 'image/png'}}};
          }
          if (message.channel === 'screenshot') return {state: 'completed', data: {dedup: true}};
        }},
      storage: {local: {
        get: async keys => { const data = storage(); return Object.fromEntries([keys].flat().map(key => [key, data[key]])); },
        set: async values => localStorage.setItem('historyFixture:chrome', JSON.stringify({...storage(), ...values})),
      }, onChanged: {addListener() {}, removeListener() {}}},
    }});
  }, png);
}
async function openShelf() {
  page = await context.newPage();
  page.on('pageerror', error => evidence.errors.push(error.message));
  page.setDefaultTimeout(10000);
  await page.goto(origin + '/extension/app.html?fixturePerformance=1');
  await page.locator('#theme:enabled').waitFor();
}
const history = async () => {
  await page.getByRole('button', {name: 'History', exact: true}).click();
  await page.locator('.history-screenshot').first().waitFor();
};
const settings = async () => {
  await page.getByRole('button', {name: 'More', exact: true}).click();
  await page.getByRole('menuitem', {name: 'Settings', exact: true}).click();
  await page.locator('#history-expand-screenshot-host-url').waitFor();
};
const row = operationId => page.locator('[data-operation="' + operationId + '"]');
const disclosure = operationId => row(operationId).locator('[data-history-host-url]');
const toggle = operationId => disclosure(operationId).locator('summary').click();
const hostPageURL = 'https://capture.example/screenshot/where-the-page-was-open-at-capture?q=long-unbroken-host-url';
try {
  await launch();
  await openShelf();
  const operationIds = await page.evaluate(async ({png, hostPageURL}) => {
    const {capturePlan, screenshotIds, screenshotCommands} = await import('/src/screenshot/rules.mjs');
    const {screenshotDigest} = await import('/src/cloudflare/screenshot-wire.mjs');
    const {current, target} = productFixture;
    await current.setHistoryPreferences({range: 'all', previews: 'all', timezone: 'America/Chicago'});
    const create = async host => {
      const plan = capturePlan({ids: screenshotIds(screenshotCommands[0]),
        config: {rules: [{ruleId: crypto.randomUUID(), name: 'Fixture', active: true, websites: [],
          destinations: [{...target, prefix: 'first/'}, {...target, prefix: 'second/'}]}], revision: 1, dedup: true},
        context: {url: 'https://not-the-display-source.example/'}, startedAt: new Date().toISOString()});
      const sha256 = await screenshotDigest(new Uint8Array(png));
      const screenshot = {plan, state: 'confirmed', attempts: [], captured: {bytes: png.length, sha256},
        outputs: plan.outputs.map(output => ({outputId: output.outputId, state: 'confirmed',
          verification: 'direct-r2-get-sha256', checksum: sha256, bytes: png.length, comparison: 'match'}))};
      const record = {operationId: plan.operationId, kind: 'screenshot-to-cloud', screenshot, state: 'verified',
        ...(host ? {historyContext: {hostPageURL: host}} : {})};
      await current.recordRemoteResult(record);
      return plan.operationId;
    };
    return {legacy: await create(), captured: await create(hostPageURL)};
  }, {png, hostPageURL});
  const {captured, legacy} = operationIds;
  await settings();
  assert.equal(await page.locator('#history-expand-screenshot-host-url').isChecked(), false);
  await history();
  assert.equal(await disclosure(captured).evaluate(el => el.open), false);
  assert.equal(await row(captured).locator('[data-output-urls]').count(), 2);
  assert.equal(await row(captured).locator('[data-history-host-url]').count(), 1);
  assert.equal(await row(captured).locator('[data-preview] + [data-history-host-url]').count(), 1);
  assert.equal(await disclosure(captured).locator('a, button, [data-output-urls]').count(), 0);
  await row(captured).locator('[data-preview][data-loading]').waitFor();
  await toggle(captured);
  assert.equal(await disclosure(captured).locator('p').innerText(), hostPageURL);
  await row(captured).locator('[data-preview] img').waitFor();
  assert.equal(await disclosure(captured).evaluate(el => el.open), true);
  assert.equal(await row(captured).getByText(hostPageURL, {exact: true}).count(), 1);
  await toggle(legacy);
  assert.equal(await disclosure(legacy).locator('p').innerText(), 'Host URL not captured');
  await page.evaluate(async id => {
    window.oldHostDisclosure = document.querySelector('[data-history-host-url="' + id + '"]');
    const row = await productFixture.current.readRemoteResult(id);
    await productFixture.current.recordRemoteResult(row);
    fixtureNotify({channel: 'screenshot-history-changed', operationId: id});
  }, captured);
  await page.waitForFunction(() => !window.oldHostDisclosure.isConnected);
  assert.equal(await disclosure(captured).evaluate(el => el.open), true);
  await toggle(captured);
  assert.equal(await disclosure(captured).evaluate(el => el.open), false);
  evidence.checks.push('collapsed-default-image-adjacency-one-per-operation-legacy-and-async-toggle');

  await settings();
  await page.getByLabel('Expand screenshot Host URL by default').check();
  await page.getByRole('button', {name: 'Save History preferences'}).click();
  await page.getByText('History preferences saved.', {exact: true}).waitFor();
  const stored = await page.evaluate(async () => {
    const f = productFixture;
    const older = await f.api.invoke({version: '3+1.1', method: 'setHistoryPreferences',
      params: {range: 'all', previews: 'all', timezone: 'America/Chicago'}}, 'gui');
    const bad = await f.api.invoke({version: '3+1.1', method: 'setHistoryPreferences',
      params: {range: 'all', previews: 'all', timezone: 'America/Chicago', expandScreenshotHostURL: 'true'}}, 'gui');
    return {older: older.state, bad: bad.state, preferences: await f.current.readHistoryPreferences()};
  });
  assert.equal(stored.older, 'completed');
  assert.notEqual(stored.bad, 'completed');
  assert.deepEqual(stored.preferences, {range: 'all', previews: 'all', timezone: 'America/Chicago', expandScreenshotHostURL: true});
  await history();
  assert.equal(await disclosure(captured).evaluate(el => el.open), true);
  await toggle(captured);
  await row(captured).locator('[data-preview] img').waitFor();
  assert.equal(await disclosure(captured).evaluate(el => el.open), false);
  await page.getByRole('button', {name: 'Remotes', exact: true}).click();
  await history();
  assert.equal(await disclosure(captured).evaluate(el => el.open), true);
  await page.close();
  await openShelf();
  await history();
  assert.equal(await disclosure(captured).evaluate(el => el.open), true);
  await context.close();
  await launch();
  await openShelf();
  await history();
  assert.equal(await disclosure(captured).evaluate(el => el.open), true);
  assert.equal(await disclosure(captured).locator('p').innerText(), hostPageURL);
  evidence.checks.push('expanded-default-backwards-compatible-api-navigation-close-reopen-and-Chromium-restart');

  const themeCases = await page.evaluate(async () => {
    const {createAestheticHost} = await import('/src/aesthetic/host.mjs');
    window.historyAesthetic = createAestheticHost({root: document.documentElement, storage: chrome.storage.local});
    const host = window.historyAesthetic;
    return host.list().flatMap(({id}) => id === 'nostalgia' ? host.listNostalgiaStyles().map(({id: style}) => ({id, style}))
      : ['minimal', 'frames'].includes(id) ? host.listPalettes().map(({id: palette}) => ({id, palette})) : [{id}]);
  });
  for (const theme of themeCases) for (const mode of ['dark', 'light']) for (const width of [320, 360]) {
    await page.setViewportSize({width, height: 800});
    const result = await page.evaluate(async ({theme, mode}) => {
      if (theme.palette) await historyAesthetic.applyPalette(theme.palette);
      const applied = await historyAesthetic.apply({...theme, persist: false});
      document.documentElement.dataset.theme = mode;
      await document.fonts.ready;
      const details = document.querySelector('[data-history-host-url]');
      return {error: applied.error, fits: details.scrollWidth <= details.clientWidth};
    }, {theme, mode});
    assert.deepEqual(result, {error: null, fits: true}, JSON.stringify({theme, mode, width}));
    evidence.matrix.push({...theme, mode, width});
  }
  await page.screenshot({path: join(out, 'expanded-host-url.png')});

  await settings();
  assert.equal(await page.locator('#history-expand-screenshot-host-url').isChecked(), true);
  for (const format of ['json', 'jsonl', 'csv']) {
    await page.locator('#history-format').selectOption(format);
    await page.evaluate(() => window.fixtureExportParts = []);
    await page.getByRole('button', {name: 'Export History', exact: true}).click();
    await page.getByText('History exported · 2 operations.', {exact: true}).waitFor();
    const data = await page.evaluate(() => window.fixtureExportParts.join(''));
    if (format === 'json') assert.equal(JSON.parse(data).operations.find(item => item.operationId === captured).hostPageURL, hostPageURL);
    if (format === 'jsonl') assert.equal(data.trim().split('\n').map(JSON.parse).find(item => item.operationId === captured).hostPageURL, hostPageURL);
    if (format === 'csv') {
      const cells = line => line.match(/"(?:[^"]|"")*"/g);
      const [labels, ...records] = data.trim().split('\r\n').map(cells);
      const match = records.find(record => record[labels.indexOf('"operationId"')] === '"' + captured + '"');
      assert.equal(match[labels.indexOf('"hostPageURL"')], '"' + hostPageURL + '"');
    }
  }
  await page.getByLabel('Include Screenshots').uncheck();
  await page.locator('#history-format').selectOption('json');
  await page.evaluate(() => window.fixtureExportParts = []);
  await page.getByRole('button', {name: 'Export History', exact: true}).click();
  await page.getByText('History exported · 0 operations.', {exact: true}).waitFor();
  assert.deepEqual(await page.evaluate(() => JSON.parse(window.fixtureExportParts.join('')).operations), []);
  assert.deepEqual(evidence.errors, []);
  evidence.checks.push('existing-JSON-JSONL-CSV-exports-keep-host-and-operation-and-respect-exclusion');
  evidence.result = 'PASS';
} catch (error) {
  evidence.failure = error.stack;
  evidence.result = 'FAIL';
  process.exitCode = 1;
} finally {
  await context?.close();
  await new Promise(resolve => server.close(resolve));
  await rm(profile, {recursive: true, force: true});
  await mkdir(out, {recursive: true});
  await writeFile(join(out, 'results.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({result: evidence.result, cases: evidence.matrix.length, error: evidence.failure, evidence: out}));
}
