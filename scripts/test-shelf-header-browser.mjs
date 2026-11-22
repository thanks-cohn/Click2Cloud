// Packaged Shelf UI with the existing browser fixture for Chrome and provider APIs.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, extname, sep, join} from 'node:path';
import {chromium} from 'playwright-core';

const build = resolve('dist/click2cloud');
const baseline = process.env.C2C_BASELINE_BUILD && resolve(process.env.C2C_BASELINE_BUILD);
const out = resolve(process.env.C2C_HEADER_EVIDENCE ?? 'work/shelf-header');
const mime = {'.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript',
  '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2'};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://fixture').pathname;
    const before = url.startsWith('/baseline/');
    const root = before ? baseline : url.startsWith('/tests/') ? resolve('.') : build;
    if (!root) return res.writeHead(404).end();
    const path = resolve(root, '.' + (before ? url.slice('/baseline'.length) : url));
    if (!path.startsWith(root + sep)) return res.writeHead(404).end();
    res.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream');
    res.end(await readFile(path));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({headless: true, executablePath: process.env.C2C_CHROME_EXECUTABLE ?? '/usr/bin/chromium'});
await mkdir(out, {recursive: true});
const report = {scope: 'Packaged app with Chromium fixture APIs', chromium: browser.version(), baseline: [], matrix: [], unsupported: [], errors: []};
const context = await browser.newContext({viewport: {width: 1100, height: 800}});
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));
page.setDefaultTimeout(8000);
await page.addInitScript(() => {
  const listeners = new Set(), connected = new Set();
  const store = () => JSON.parse(localStorage.getItem('fixtureSettings') ?? '{}');
  const status = provider => ({provider, ready: connected.has(provider), connected: connected.has(provider),
    reason: connected.has(provider) ? 'READY' : 'AUTH_REQUIRED'});
  window.providerFixture = {
    operations: [],
    resetWorker() { connected.clear(); this.operations.length = 0; },
    updateStatus(provider) { for (const listener of listeners) listener({channel: 'redown-basic-status', status: status(provider)}, {id: 'fixture'}); },
  };
  Object.defineProperty(globalThis, 'chrome', {value: {
    runtime: {id: 'fixture', onMessage: {addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn)},
      async sendMessage(message) {
        if (message.channel === 'redown-basic-v1') {
          const {op, input: {provider}} = message;
          window.providerFixture.operations.push({op, provider});
          if (op === 'history.latestOutcome') return {ok: true, value: null};
          if (op === 'providers.goTo') return {ok: true, value: {opened: true}};
          if (op === 'auth.connect' || op === 'auth.reconnect') connected.add(provider);
          return {ok: true, value: status(provider)};
        }
        if (message.channel === 'engine')
          return (await import('/tests/product-browser-host.mjs')).invoke({version: message.version, method: message.method, params: message.params});
      },
    },
    storage: {local: {
      get: async keys => { const data = store(); return Object.fromEntries([keys].flat().map(key => [key, data[key]])); },
      set: async values => localStorage.setItem('fixtureSettings', JSON.stringify({...store(), ...values})),
    }, onChanged: {addListener() {}, removeListener() {}}},
  }});
});
const geometry = () => page.evaluate(() => {
  const header = document.querySelector('.app-header'), nav = header.querySelector('nav');
  const pick = (el, index) => {
    const box = el.getBoundingClientRect();
    const text = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const labels = [];
    while (text.nextNode()) {
      if (!text.currentNode.textContent.trim()) continue;
      const range = new Range();
      range.selectNodeContents(text.currentNode);
      const label = range.getBoundingClientRect();
      if (label.width) labels.push({left: label.left, right: label.right, top: label.top, bottom: label.bottom});
    }
    return {left: box.left, right: box.right, top: box.top, bottom: box.bottom,
      width: box.width, height: box.height, verticalCenter: box.y + box.height / 2, labels,
      font: index === 0 ? null : getComputedStyle(el).fontFamily};
  };
  return {
    width: header.clientWidth, scrollWidth: header.scrollWidth, height: header.getBoundingClientRect().height,
    navWidth: nav.clientWidth, navScrollWidth: nav.scrollWidth, contentTop: document.querySelector('#shell').getBoundingClientRect().top,
    theme: document.documentElement.dataset.theme, wordmark: header.querySelector('.brand-lockup').textContent.trim(),
    controls: ['.brand-lockup img', '[data-view=remotes]', '[data-view=explorer]', '[data-view=history]', '#header-more', '#theme']
      .map((selector, index) => pick(header.querySelector(selector), index)),
  };
});

try {
  if (baseline) {
    await page.goto(origin + '/baseline/extension/app.html?fixturePerformance=1');
    await page.locator('#theme:enabled').waitFor();
    for (const width of [280, 360, 1100]) {
      await page.setViewportSize({width, height: 800});
      await page.evaluate(() => document.fonts.ready.then(() => true));
      report.baseline.push({width, ...await geometry()});
      await page.screenshot({path: join(out, 'before-' + width + '.png')});
    }
  }
  await page.goto(origin + '/extension/app.html?fixturePerformance=1');
  await page.locator('#theme:enabled').waitFor();
  assert.equal(await page.title(), 'REDOWN');
  assert.equal(await page.locator('.brand-lockup img[alt=REDOWN]').count(), 1);
  assert.equal(await page.locator('.brand-lockup strong').count(), 0);
  if (baseline) assert.equal(await readFile(join(build, 'manifest.json'), 'utf8'), await readFile(join(baseline, 'manifest.json'), 'utf8'));

  const inventory = await page.evaluate(async () => {
    const {createAestheticHost} = await import('/src/aesthetic/host.mjs');
    const {themePackages, palettes} = await import('/src/aesthetic/packages.mjs');
    window.headerAesthetic = createAestheticHost({root: document.documentElement, storage: chrome.storage.local});
    return {themes: headerAesthetic.list(), styles: headerAesthetic.listNostalgiaStyles(), packages: themePackages.map(item => item.id),
      palettes: palettes.map(({id, fonts}) => ({id, fonts}))};
  });
  const {themes, styles, palettes} = inventory;
  for (const {id} of themes) {
    const applicable = ['minimal', 'frames'].includes(id) ? palettes.map(p => p.id) : [null];
    const variants = id === 'nostalgia' ? styles.map(item => item.id) : [null];
    if (!applicable[0]) report.unsupported.push({id, palettes: palettes.map(p => p.id), reason: 'Uses theme-owned palette and fonts'});
    for (const style of variants) for (const palette of applicable) {
      const result = await page.evaluate(async ({id, style, palette}) => {
        if (palette) await headerAesthetic.applyPalette(palette);
        return headerAesthetic.apply({id, ...(style ? {style} : {})});
      }, {id, style, palette});
      assert.equal(result.error, null);
      assert.equal(result.id, id);
      for (const mode of ['light', 'dark']) {
        await page.evaluate(mode => {document.documentElement.dataset.theme = mode;}, mode);
        for (const width of [280, 320, 360, 480, 600, 1100]) {
          await page.setViewportSize({width, height: 800});
          await page.evaluate(async () => {
            const nav = document.querySelector('.app-header nav');
            void nav.offsetWidth;
            await document.fonts.ready;
          });
          const data = await geometry(), tag = [id, style, palette, mode, width].filter(Boolean).join('-');
          report.matrix.push({id, style, palette, mode, width, header: data});
          assert.equal(data.wordmark, '', tag);
          assert.equal(data.controls[0].width, 35, tag);
          assert.equal(data.controls[0].height, 35, tag);
          assert(data.height >= 55 && data.height <= 57 && Math.abs(data.contentTop - data.height) <= 1, tag);
          assert(data.scrollWidth <= data.width && data.navScrollWidth <= data.navWidth, tag + ' overflow');
          for (const [index, control] of data.controls.entries()) {
            assert(control.left >= 0 && control.right <= width, tag + ' off-screen');
            assert(Math.abs(control.verticalCenter - data.controls[0].verticalCenter) < 1, tag + ' wrapped');
            assert(control.width >= 34 && control.height >= 35, tag + ' hit area');
            if (index) assert(control.left >= data.controls[index - 1].right + 1, tag + ' overlapping hit areas');
            for (const label of control.labels)
              assert(label.left >= control.left && label.right <= control.right &&
                label.top >= control.top && label.bottom <= control.bottom, tag + ' clipped label');
          }
          if (width === 360 && mode === 'dark' && (palette === null || palette === palettes[0].id))
            await page.screenshot({path: join(out, 'after-' + tag + '.png')});
        }
      }
    }
  }
  await page.setViewportSize({width: 320, height: 800});
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.aesthetic === 'frames');
  const more = page.getByRole('button', {name: 'More', exact: true});
  await more.focus();
  await page.keyboard.press('ArrowDown');
  assert.equal(await more.getAttribute('aria-expanded'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.view), 'screenshot');
  const menu = await page.locator('#header-menu').boundingBox();
  assert(menu.x >= 0 && menu.x + menu.width <= 320);
  await page.keyboard.press('Escape');
  assert.equal(await more.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'header-more');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'theme');
  assert(await page.evaluate(() => document.activeElement.matches(':focus-visible')));
  const theme = await page.locator('html').getAttribute('data-theme');
  await page.keyboard.press('Space');
  await page.waitForFunction(previous => document.documentElement.dataset.theme !== previous, theme);

  for (const [id, name] of [['google', 'Google Drive'], ['onedrive', 'OneDrive'], ['dropbox', 'Dropbox']]) {
    const card = page.getByRole('region', {name});
    await card.getByRole('button', {name: 'Sign In', exact: true}).click();
    await card.getByRole('button', {name: 'Reconnect', exact: true}).click();
    await card.getByRole('button', {name: 'Refresh', exact: true}).click();
    await card.getByRole('button', {name: 'GO TO ' + name, exact: true}).click();
    const actions = await page.evaluate(id => providerFixture.operations.filter(x => x.provider === id).map(x => x.op), id);
    assert.deepEqual(actions.slice(-4), ['auth.connect', 'auth.reconnect', 'auth.refresh', 'providers.goTo']);
  }
  await page.evaluate(() => {
    providerFixture.resetWorker();
    for (const id of ['google', 'onedrive', 'dropbox']) providerFixture.updateStatus(id);
  });
  assert.equal(await page.getByRole('button', {name: 'Sign In', exact: true}).count(), 3);
  assert.deepEqual(report.errors, []);
  report.result = 'PASS';
} catch (error) {
  report.result = 'FAIL';
  report.failure = error.stack;
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  await writeFile(join(out, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({result: report.result, cases: report.matrix.length, error: report.failure, evidence: out}));
}
