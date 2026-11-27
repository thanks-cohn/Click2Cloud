// Exercise the production Shelf document in Chromium with a fixture provider and Chrome transport.
// An optional extracted pre-change tree supplies comparable layout measurements.
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {extname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = process.env.C2C_UX_EVIDENCE ?? await mkdtemp(join(tmpdir(), 'c2c-ux-'));
const baseline = process.env.C2C_UX_BASELINE;
const baselineOnly = process.env.C2C_UX_BASELINE_ONLY === '1';
const widths = [280, 320, 360, 480, 600, 1100];
// 360px is Chromium's default side-panel content width in 156.0.8078.79.
const appearances = ['standard', 'minimal'];
const results = [];
const measurements = {};
const errors = [];
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://fixture').pathname;
    const fixtureRoot = (path.startsWith('/baseline/') ? baseline : root)?.replace(/\/$/, '');
    const file = resolve(fixtureRoot, '.' + path.replace(/^\/baseline(?=\/)/, ''));
    if (!file.startsWith(fixtureRoot + '/')) return res.writeHead(403).end();
    res.setHeader('Content-Type', {'.mjs':'text/javascript', '.css':'text/css', '.html':'text/html', '.png':'image/png'}[extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await mkdir(out, {recursive:true});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser, page;

async function open(build) {
  const context = await browser.newContext({viewport:{width:360, height:760}, reducedMotion:'reduce'});
  page = await context.newPage();
  page.setDefaultTimeout(7000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => /Turn Debug Mode off/.test(dialog.message()) ? dialog.accept() : dialog.dismiss());
  await page.addInitScript(({prefix}) => {
    const messages = new Set(), changes = new Set();
    window.fixtureRequests = [];
    const fixture = () => import(prefix + '/tests/product-browser-host.mjs');
    const read = key => JSON.parse(localStorage.getItem(key) ?? 'null') ?? undefined;
    globalThis.chrome = {
      runtime:{id:'ux-fixture', onMessage:{addListener:fn => messages.add(fn)}, async sendMessage(message) {
        window.fixtureRequests.push(message);
        if (message.channel === 'recorder') return {state:'completed'};
        const invoke = async ({version, method, params} = message) => (await fixture()).invoke({version, method, params});
        return window.fixtureHook ? window.fixtureHook(message, invoke) : invoke();
      }},
      storage:{local:{get:async key => ({[key]:read(key)}), async set(values) {
        const changed = {};
        for (const [key, value] of Object.entries(values)) {
          changed[key] = {oldValue:read(key), newValue:value};
          localStorage.setItem(key, JSON.stringify(value));
        }
        for (const fn of changes) fn(changed, 'local');
      }}, onChanged:{addListener:fn => changes.add(fn), removeListener:fn => changes.delete(fn)}}
    };
    window.fixtureNotify = message => messages.forEach(fn => fn(message, {id:'ux-fixture'}));
  }, {prefix:build === 'before' ? '/baseline' : ''});
  const prefix = build === 'before' ? '/baseline' : '';
  await page.goto(`http://127.0.0.1:${server.address().port}${prefix}/extension/app.html?fixturePerformance=1`);
  await ready();
  return context;
}

async function ready() {
  await page.waitForFunction(() => window.productFixture && !document.querySelector('#theme').disabled);
  await page.locator('#sign-out').waitFor();
  await page.evaluate(() => window.productFixture.setReady(window.productFixture.target.bucketName));
}
const nav = view => page.locator(`header [data-view=${view}]:visible`).click();
const settings = async () => {
  await page.locator('#header-more').click();
  await nav('settings');
  await page.locator('#appearance').waitFor();
};
const idleFrames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const screenshot = name => page.screenshot({path:join(out, name + '.png')});
async function debug(value) {
  const mode = page.locator('#debug-mode');
  if (await mode.isChecked() !== value) await mode.click();
  await page.waitForFunction(expected => document.documentElement.dataset.debugMode === expected, value ? 'on' : 'off');
}
async function noKeyboardFocus(selector) {
  assert(!await page.locator(selector).isVisible(), `${selector} is visible`);
  if (await page.locator(selector).count()) {
    const focused = await page.locator(selector).evaluate(el => { el.focus(); return document.activeElement === el; });
    assert(!focused, `${selector} received focus while hidden`);
  }
}
async function gate(name, run) {
  await run();
  results.push({name, state:'PASS'});
}

async function measure() {
  await idleFrames();
  return page.evaluate(() => {
    const rect = selector => document.querySelector(selector)?.getBoundingClientRect()?.toJSON();
    const header = rect('header'), brand = rect('header strong'), nav = rect('header nav');
    const theme = rect('#theme'), files = rect('#files'), footer = rect('body > footer');
    const tabs = [...document.querySelectorAll('header nav > button, #header-more')].map(el => el.getBoundingClientRect().toJSON());
    return {header, brand, nav, theme, tabs, files, footer, rightGap:innerWidth - theme.right, overflow:document.documentElement.scrollWidth > innerWidth};
  });
}

function assertHeader(bounds, label) {
  assert(!bounds.overflow, `${label} horizontal overflow`);
  assert(bounds.rightGap >= 4 && bounds.rightGap <= 24, `${label} theme right gap ${bounds.rightGap}px`);
  assert(bounds.theme.top >= bounds.header.top && bounds.theme.bottom <= bounds.header.bottom, `${label} theme clipped`);
  assert(bounds.theme.left >= bounds.nav.right - 1 && bounds.nav.left >= bounds.brand.right - 1, `${label} header overlaps`);
  const rowCenter = (bounds.theme.top + bounds.theme.bottom) / 2;
  for (const tab of bounds.tabs.filter(tab => tab.width > 0)) {
    assert(Math.abs((tab.top + tab.bottom) / 2 - rowCenter) <= 4, `${label} header wraps`);
    assert(tab.left >= bounds.brand.right - 1 && tab.right <= bounds.theme.left, `${label} tab overlaps the brand or theme`);
  }
  assert(bounds.header.height <= 68, `${label} header height ${bounds.header.height}px`);
}

async function explorerOpening(){
  // Exercise an actual cold Explorer entry with the provider response held.
  await settings();
  await page.locator('#appearance').selectOption('onyx');
  await page.waitForFunction(()=>document.documentElement.dataset.aesthetic==='onyx');
  await nav('remotes');
  await page.evaluate(()=>{
    window.fixtureHook=async(message,invoke)=>{
      if(message.method==='enterExplorer')await new Promise(resolve=>{window.releaseExplorerOpening=resolve;});
      return invoke();
    };
  });
  await nav('explorer');
  await page.waitForFunction(()=>typeof window.releaseExplorerOpening==='function');
  const shell=page.locator('#shell');
  assert.equal(await shell.getAttribute('data-explorer-opening'),'');
  const geometry=()=>page.evaluate(()=>['.app-header','#pane-splitter','#main','aside'].map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));
  const initial=await geometry();
  await idleFrames();
  assert.deepEqual(await geometry(),initial,'panel frame must not move while opening');
  await page.evaluate(()=>{window.releaseExplorerOpening();window.fixtureHook=null;});
  await page.getByRole('row').filter({hasText:'notes.txt'}).first().waitFor();
  await page.waitForFunction(()=>!document.querySelector('#shell').hasAttribute('data-explorer-opening'));
  await nav('remotes');await nav('explorer');
  assert.equal(await shell.getAttribute('data-explorer-opening'),null,'warm entry must not replay the loading presentation');
  await page.getByRole('row').filter({hasText:'notes.txt'}).first().waitFor();
}
async function matrix(build) {
  await page.locator('#sign-out').waitFor();
  for (const theme of ['dark', 'light']) for (const width of widths) {
    await page.setViewportSize({width, height:760});
    for (const appearance of appearances) {
      const label = `${appearance}-${theme}-${width}`;
      await settings();
      await page.locator('#appearance').selectOption(appearance);
      const themeSelect = page.locator('#setting-theme');
      if (await themeSelect.inputValue() !== theme) await themeSelect.selectOption(theme);
      await page.waitForFunction(({appearance, theme}) => document.documentElement.dataset.aesthetic === appearance && document.documentElement.dataset.theme === theme, {appearance, theme});
      if (build === 'after') {
        for (const heading of ['Recovery Mode', 'Save Whole Cloud', 'Connection']) {
          assert(!await page.getByRole('heading', {name:heading, exact:true}).isVisible(), `${label} shows ${heading} with Debug off`);
        }
      }
      await nav('remotes');
      await page.locator('#sign-out').waitFor();
      if (build === 'after') {
        for (const selector of ['#cloudflare-setup', '#remote-history', '#show-save-results']) await noKeyboardFocus(selector);
        assert.equal(await page.getByText('Login and usage', {exact:true}).count(), 0);
      }
      if ([320,360,1100].includes(width) && theme === 'dark') await screenshot(`${build}-${label}-remotes`);
      await nav('explorer');
      await page.getByRole('row').filter({hasText:'notes.txt'}).first().waitFor();
      const bounds = await measure();
      measurements[`${build}-${label}`] = bounds;
      if ([320,360,1100].includes(width) && theme === 'dark') await screenshot(`${build}-${label}-explorer`);
      if (build === 'after') {
        assertHeader(bounds, label);
        assert(!bounds.footer, `${label} still has a footer`);
        const before = measurements[`before-${label}`];
        if (before) assert(bounds.files.height > before.files.height, `${label} gallery did not gain height`);
        assert(await page.locator('#manage').isEnabled(), `${label} destination manager is disabled`);
      }
    }
  }
}

async function debugMatrix() {
  for (const width of [320,360,1100]) for (const appearance of appearances) {
    await page.setViewportSize({width,height:760});
    await settings();
    await page.locator('#appearance').selectOption(appearance);
    await debug(true);
    for (const heading of ['Recovery Mode', 'Save Whole Cloud', 'Connection']) {
      assert(await page.getByRole('heading', {name:heading, exact:true}).isVisible(), `${width}px ${appearance} hides ${heading} with Debug on`);
    }
    const uri = page.getByText(/^https:\/\/.*\.chromiumapp\.org\/cloudflare$/);
    assert(await uri.isVisible());
    assert(await uri.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'redirect URI overflows');
    assert(await page.locator('#main').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Settings has horizontal overflow');
    await page.locator('#disconnect').scrollIntoViewIfNeeded();
    if (width === 320) await screenshot(`after-${appearance}-${width}-debug-settings`);
    // An external browser storage update can hide a focused control in-place.
    await page.locator('#disconnect').focus();
    await page.evaluate(() => chrome.storage.local.set({uiDebugMode:false}));
    await noKeyboardFocus('#disconnect');
    assert(await page.locator('#debug-mode').evaluate(el => document.activeElement === el), 'focus was not restored when the Connection card was hidden');
    await page.locator('#header-more').press('ArrowUp');
    assert(await page.getByRole('menuitem', {name:'Settings', exact:true}).evaluate(el => el === document.activeElement));
    await page.keyboard.press('ArrowDown');
    await noKeyboardFocus('#help-diagnose');
    await page.keyboard.press('Escape');
    assert(await page.locator('#header-more').evaluate(el => el === document.activeElement));
    await nav('remotes');
    await page.evaluate(() => window.fixtureNotify({channel:'remote-result', result:{kind:'save', state:'uncertain', code:'WRITE_UNCONFIRMED'}}));
    await page.locator('#action-feedback').waitFor();
    assert.match(await page.locator('#action-feedback').innerText(), /not confirmed|unconfirmed|uncertain/i);
    for (const selector of ['#cloudflare-setup', '#remote-history', '#show-save-results']) await noKeyboardFocus(selector);
    await nav('history');
    await page.getByRole('heading', {name:'The Rest is History', exact:true}).waitFor();
    await settings();
    await debug(true);
    await nav('remotes');
    assert(await page.locator('#cloudflare-setup').isEnabled());
    assert(await page.locator('#remote-history').isEnabled());
    const buttons = await Promise.all(['#cloudflare-setup', '#remote-history'].map(selector => page.locator(selector).boundingBox()));
    assert(buttons[0] && buttons[1]);
    const [a,b] = buttons;
    assert(a.x+a.width <= b.x || a.y+a.height <= b.y, 'Remotes Debug buttons overlap');
    await page.locator('#remote-history').click();
    await page.getByRole('heading', {name:'The Rest is History', exact:true}).waitFor();
    await nav('remotes');
    await page.locator('#cloudflare-setup').click();
    await page.getByRole('heading', {name:'Cloudflare R2', exact:true}).waitFor();
    await page.getByRole('button', {name:'Back to Remotes'}).click();
    await page.locator('#header-more').press('ArrowUp');
    await page.waitForFunction(() => document.activeElement.id === 'help-diagnose');
    await page.evaluate(() => chrome.storage.local.set({uiDebugMode:false}));
    await noKeyboardFocus('#help-diagnose');
    assert(await page.locator('#header-more').evaluate(el => el.getAttribute('aria-expanded') === 'false' || document.activeElement.id !== 'help-diagnose'));
    await page.keyboard.press('Escape');
    await settings();
    await debug(true);
    await page.locator('#show-save-results').waitFor();
    await page.locator('#show-save-results').click();
    await page.getByRole('heading', {name:'The Rest is History', exact:true}).waitFor();
    await settings();
    await debug(false);
    await noKeyboardFocus('#show-save-results');
  }
}

async function ordinaryRecovery() {
  await page.setViewportSize({width:320,height:760});
  await nav('remotes');
  await page.evaluate(() => {
    const target = window.productFixture.target;
    window.fixtureAttention = {provider:'cloudflare', target, code:'SETUP_APPROVAL_REQUIRED'};
    window.fixtureHook = (message, invoke) => message.method === 'checkCloudflareR2' ?
      {state:'completed', data:{state:'SETUP_APPROVAL_REQUIRED', code:'SETUP_APPROVAL_REQUIRED', accountId:target.accountId}} : invoke();
    window.fixtureNotify({channel:'shelf-attention'});
  });
  await page.locator('#prepare-selected').waitFor();
  await page.locator('#authorize-selected').waitFor();
  await noKeyboardFocus('#cloudflare-setup');
  await page.evaluate(() => { window.fixtureHook = null; window.fixtureAttention = null; });
  await page.locator('#sign-out').click();
  await page.locator('#login').waitFor();
  await page.getByText(/private save Worker and write a small verification file. Cloudflare may charge/).waitFor();
  assert.equal(await page.getByText('Login and usage',{exact:true}).count(), 0);
}

async function shortcuts() {
  await page.setViewportSize({width:1100,height:760});
  await nav('explorer');
  await page.locator('#files').waitFor();
  const toolbar = page.locator('#toolbar-splitter'), pane = page.locator('#pane-splitter');
  const value = (selector, value) => page.waitForFunction(({selector, value}) => document.querySelector(selector)?.getAttribute('aria-valuenow') === value, {selector, value});
  await toolbar.press('Home');
  await value('#toolbar-splitter', '1');
  await pane.press('Home');
  await value('#pane-splitter', '0');
  assert(await page.locator('#manage').isVisible());
  await page.locator('#manage').press('Enter');
  await page.getByRole('heading', {name:'Destinations', exact:true}).waitFor();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+Shift+F8');
  assert.equal(await toolbar.getAttribute('aria-valuenow'),'1');
  await toolbar.press('ArrowDown');
  await value('#toolbar-splitter', '2');
  await page.locator('#add-location').waitFor();
  assert(await page.locator('#add-location').isEnabled());
  const toolbarItems = await Promise.all(['#back','#add-location'].map(selector => page.locator(selector).boundingBox()));
  assert(toolbarItems[1].y > toolbarItems[0].y, '+ Right Click is not on the second row');
  await page.locator('#files').evaluate(el => el.dispatchEvent(new KeyboardEvent('keydown', {key:'F8', ctrlKey:true, shiftKey:true, isComposing:true, bubbles:true})));
  assert.equal(await toolbar.getAttribute('aria-valuenow'), '2', 'composition triggered a shortcut');
  await page.keyboard.press('Control+Shift+F9');
  await value('#pane-splitter', '50');
  assert.equal(await toolbar.getAttribute('aria-valuenow'), '2', 'pane reset changed the toolbar');
  await toolbar.press('Home');
  await value('#toolbar-splitter', '1');
  assert.equal(await pane.getAttribute('aria-valuenow'), '50', 'toolbar toggle changed the pane');
  await page.locator('#toolbar-more').press('ArrowDown');
  const moreLabels=await page.locator('#toolbar-overflow button').allTextContents();
  assert(!moreLabels.some(label=>/Toggle one or two toolbar rows|Reset panels to 50\/50/.test(label)),
    'More must not contain redundant layout shortcut buttons');
  await page.getByLabel('Address').waitFor();
  await page.keyboard.press('Escape');
  assert(await page.locator('#toolbar-more').evaluate(el => el === document.activeElement));
  await page.setViewportSize({width:280,height:760});
  await page.getByRole('button', {name:'History', exact:true}).press('Enter');
  await page.getByRole('heading', {name:'The Rest is History', exact:true}).waitFor();
  await page.setViewportSize({width:1100,height:760});
  await nav('explorer');
}

async function folderFlows() {
  const bucket = page.getByRole('treeitem', {name:/fixture-bucket/});
  const dialog = page.getByRole('dialog');
  const form = async (target, name) => {
    await target.click({button:'right'});
    await page.getByRole('menuitem', {name:'New Folder', exact:true}).click();
    await page.getByLabel('Folder name').fill(name);
    await dialog.getByRole('button', {name:'New Folder', exact:true}).click();
  };
  const stored = key => page.evaluate(key => window.productFixture.r2Objects.has('fixture-bucket:' + key), key);
  const requests = name => page.evaluate(name => window.fixtureRequests.filter(r => r.method === 'fileAction' && r.params.name === name).map(r => r.params), name);
  for (const [parent, name, key] of [[bucket,'Root example','Root example/'], [page.getByRole('treeitem',{name:/Root example/}),'Nested example','Root example/Nested example/'], [bucket,'Second root','Second root/']]) {
    await form(parent, name);
    await dialog.waitFor({state:'hidden'});
    assert(await stored(key));
    assert(!await page.locator('#action-feedback').isVisible(), 'verified folder triggered an attention warning');
    const calls = await requests(name);
    assert.equal(calls.length, 1);
    assert(!calls[0].authorizeSetup);
  }
  await page.evaluate(() => {
    window.fixtureHook = (message, invoke) => {
      if (message.method !== 'fileAction' || message.params.action !== 'mkdir') return invoke();
      if (message.params.name === 'Permission denied') return {state:'blocked', code:'WORKER_PERMISSION_DENIED'};
      if (message.params.name === 'Lost reply') return invoke().then(result => {
        if (result.state === 'completed') throw Error('The message port closed before a response was received.');
        return result;
      });
      if (message.params.name === 'Reconnect needed') return {state:'blocked', code:'REAUTH_REQUIRED'};
      if (!message.params.authorizeSetup) return {state:'blocked', code:'FILE_SETUP_APPROVAL_REQUIRED'};
      return invoke();
    };
  });
  await form(bucket, 'Consent cancelled');
  await dialog.getByRole('button', {name:'Continue', exact:true}).waitFor();
  assert.match(await dialog.innerText(), /folder/i);
  assert.match(await dialog.innerText(), /may charge|possible.*charges|may incur/i);
  assert.doesNotMatch(await dialog.innerText(), /both selected buckets|transfer/i);
  await dialog.getByRole('button', {name:'Cancel', exact:true}).click();
  await dialog.waitFor({state:'hidden'});
  assert(!await stored('Consent cancelled/'));
  assert.equal((await requests('Consent cancelled')).length, 1);
  await form(bucket, 'Consent accepted');
  await dialog.getByRole('button', {name:'Continue', exact:true}).click();
  await dialog.waitFor({state:'hidden'});
  assert(await stored('Consent accepted/'));
  assert.deepEqual((await requests('Consent accepted')).map(r => r.authorizeSetup === true), [false,true]);
  await form(bucket, 'Permission denied');
  await dialog.getByText(/Cloudflare denied access/).waitFor();
  assert(!await stored('Permission denied/'));
  await page.keyboard.press('Escape');
  await form(bucket, 'Lost reply');
  await dialog.getByText(/unconfirmed|not confirmed/i).waitFor();
  assert(await stored('Lost reply/'));
  assert.equal((await requests('Lost reply')).length, 1);
  await dialog.getByRole('button', {name:'New Folder', exact:true}).click();
  await dialog.getByText(/unconfirmed|not confirmed/i).waitFor();
  const [original, retry, ...additional] = await requests('Lost reply');
  assert.equal(retry?.idempotencyKey, original.idempotencyKey);
  assert.equal(additional.length, 0);
  assert.equal(await page.evaluate(() => window.productFixture.calls.filter(call => call.operation === 'mkdir' && call.input.name === 'Lost reply').length), 1);
  await page.keyboard.press('Escape');
  await form(bucket, 'Reconnect needed');
  await dialog.getByText(/Reconnect Cloudflare/i).waitFor();
  assert(!await stored('Reconnect needed/'));
  await page.keyboard.press('Escape');
  await page.evaluate(() => { window.fixtureHook = null; });
  await form(bucket, 'Reconnect needed');
  await dialog.waitFor({state:'hidden'});
  assert(await stored('Reconnect needed/'));
}

try {
  browser = await chromium.launch({executablePath:process.env.C2C_CHROME_EXECUTABLE ?? '/usr/bin/chromium', headless:true, args:['--no-sandbox']});
  if (baseline) {
    const context = await open('before');
    await gate('pre-change viewport measurements and screenshots', () => matrix('before'));
    await context.close();
  }
  if (!baselineOnly) {
    await open('after');
    await gate('Onyx cold Explorer reveal and warm-entry continuity',explorerOpening);
    await gate('single-row header and gallery area across 36 width, appearance and color combinations', () => matrix('after'));
    await gate('Debug visibility, keyboard focus, History and uncertain-save feedback across nine combinations', debugMatrix);
    await gate('Debug preference restores on reload', async () => {
      await debug(true);
      await page.reload();
      await ready();
      await page.locator('#cloudflare-setup').waitFor();
      await settings();
      assert(await page.locator('#debug-mode').isChecked());
      await debug(false);
    });
    await gate('Independent Explorer keyboard shortcuts and collapsed destination manager', shortcuts);
    await gate('Folder creation and contextual consent in the browser', folderFlows);
    await gate('Ordinary Remotes preserves setup approval, sign-out and login cost disclosure', ordinaryRecovery);
  }
  assert.deepEqual(errors, []);
} catch (error) {
  results.push({name:'browser acceptance', state:'FAIL', message:error.message, stack:error.stack});
  await page?.screenshot({path:join(out,'failure.png')}).catch(() => {});
  await writeFile(join(out,'failure.html'), await page?.content() ?? '').catch(() => {});
  process.exitCode = 1;
} finally {
  await writeFile(join(out, 'results.json'), JSON.stringify({evidence:'Chromium production Shelf DOM and API with fixture provider and Chrome transport', browser:browser?.version(), widths, results, errors, measurements}, null, 2) + '\n');
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  console.log(JSON.stringify({out, results, errors}, null, 2));
}
