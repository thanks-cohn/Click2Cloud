// Production Shelf, broker and filename cache in Chromium. The R2 provider and
// Chrome runtime messaging are fixtures. No Cloudflare account or writes are used.
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {extname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const out = process.env.C2C_FILENAME_BROWSER_EVIDENCE ?? await mkdtemp(join(tmpdir(), 'c2c-filename-browser-'));
const results = [], errors = [], measurements = {};
const server = createServer(async (request,response) => {
  try {
    const path = resolve(root, '.' + new URL(request.url, 'http://fixture').pathname);
    if (!path.startsWith(root + '/')) return response.writeHead(403).end();
    response.setHeader('Content-Type', {'.mjs':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png'}[extname(path)] ?? 'application/octet-stream');
    response.end(await readFile(path));
  } catch {
    response.writeHead(404).end();
  }
});
await mkdir(out, {recursive:true});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const url = `http://127.0.0.1:${server.address().port}/extension/app.html?fixturePerformance=1&fixtureFilenameSearch=1`;
let browser, page;

async function addFixture(context) {
  await context.addInitScript(() => {
    const messages = new Set(), changes = new Set();
    const read = key => JSON.parse(localStorage.getItem(key) ?? 'null') ?? undefined;
    window.filenameRequests = [];
    window.filenameResponses = [];
    window.filenameProviderCalls = [];
    window.filenameClockOffset = 0;
    window.filenameClock = () => Date.now() + window.filenameClockOffset;
    const file = key => ({key, displayName:key.split('/').at(-1), folder:false, size:12, etag:'fixture'});
    const folder = key => ({key, displayName:key.slice(0,-1).split('/').at(-1), folder:true});
    window.fixtureDirectoryPage = async ({source,cursor=''}) => {
      const {bucketName,prefix} = source;
      window.filenameProviderCalls.push({bucketName,prefix,cursor});
      if (window.filenameProviderHook) await window.filenameProviderHook({bucketName,prefix,cursor});
      if (window.filenameOffline) return {state:'blocked',code:'PROVIDER_READ_FAILED'};
      let entries, next = '';
      if (prefix === 'archive/') {
        entries = [file('archive/PHOTO-archive.jpg'),folder('archive/2026/')];
      } else if (prefix === 'archive/2026/') {
        entries = [file('archive/2026/photo-deep.jpg')];
      } else if (prefix === 'simultaneous/') {
        entries = [file(`simultaneous/photo-${cursor || 'first'}.png`)];
        next = cursor ? '' : 'second';
      } else if (prefix === 'partial/') {
        if (cursor && window.filenamePartialOffline) return {state:'blocked',code:'PROVIDER_READ_FAILED'};
        entries = [file(cursor ? 'partial/late-arriving-name.txt' : 'partial/known-name.txt')];
        next = cursor ? '' : 'second';
      } else if (prefix === '') {
        const additions = [...(window.productFixture?.r2Objects.values() ?? [])]
          .filter(row => row.bucketName === bucketName && !row.key.replace(/\/$/,'').includes('/'));
        if (cursor === 'last') {
          entries = [file('Another-PHOTO.jpg'), ...Array.from({length:125}, (_,i) => file(`photo-sample-${String(i).padStart(3,'0')}.jpg`)), ...additions];
          if (window.filenameExternalWrite) entries.push(file('new-external-photo.jpg'));
        } else if (cursor === 'middle') {
          entries = [folder('photographs/'),file('Cafe\u0301.JPG')];
          next = 'last';
        } else {
          entries = [folder('archive/'),file('notes.txt'),file('photo-one.png')];
          next = 'middle';
        }
      } else entries = [];
      return {state:'completed',data:{entries,cursor:next,folderExists:true}};
    };
    window.filenameInvoke = async ({version='3+1.1',method,params}) => (await import('/tests/product-browser-host.mjs')).invoke({version,method,params});
    globalThis.chrome = {runtime:{id:'filename-fixture', onMessage:{addListener:fn => messages.add(fn)}, async sendMessage(message) {
      if (message.channel === 'recorder') return {state:'completed'};
      window.filenameRequests.push(message);
      const result = await window.filenameInvoke(message);
      if (message.method === 'searchDirectoryNames') window.filenameResponses.push({request:message.params,result});
      return result;
    }}, storage:{local:{get:async key => ({[key]:read(key)}), async set(values) {
      const changed = {};
      for (const [key,value] of Object.entries(values)) {
        changed[key] = {oldValue:read(key),newValue:value};
        localStorage.setItem(key,JSON.stringify(value));
      }
      for (const fn of changes) fn(changed,'local');
    }},onChanged:{addListener:fn => changes.add(fn),removeListener:fn => changes.delete(fn)}}};
    window.filenameNotify = message => messages.forEach(fn => fn(message,{id:'filename-fixture'}));
  });
}

async function ready(tab) {
  await tab.waitForFunction(() => window.productFixture && !document.querySelector('#theme').disabled);
  await tab.locator('#sign-out').waitFor();
  await tab.evaluate(() => window.productFixture.setReady(window.productFixture.target.bucketName));
}
async function open(context) {
  const tab = await context.newPage();
  tab.setDefaultTimeout(8000);
  tab.on('pageerror',error => errors.push(error.message));
  tab.on('dialog',dialog => dialog.dismiss());
  await tab.goto(url);
  await ready(tab);
  return tab;
}
const nav = view => page.locator(`header [data-view=${view}]:visible`).click();
const row = text => page.getByRole('row').filter({hasText:text});
const searchInput = () => page.locator('#filename-search');
const moreMenu = () => page.locator('#toolbar-more');
const listingState = () => page.locator('#listing-state');
const providerCalls = tab => tab.evaluate(() => window.filenameProviderCalls);
const requestCount = () => page.evaluate(() => window.filenameRequests.filter(item => item.method === 'searchDirectoryNames').length);
const lastSearch = () => page.evaluate(() => window.filenameResponses.at(-1));
const shot = name => page.screenshot({path:join(out,name+'.png')});
const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const waitValue = (selector,value) => page.waitForFunction(({selector,value}) => document.querySelector(selector)?.getAttribute('aria-valuenow') === value,{selector,value});

async function gate(name,run) {
  await run();
  results.push({name,state:'PASS'});
}
async function explorer() {
  await nav('explorer');
  await row('notes.txt').waitFor();
}
async function revealSearch() {
  if (!await searchInput().isVisible()) await page.keyboard.press('Control+Shift+F7');
  await searchInput().waitFor();
  return searchInput();
}
async function submit(query) {
  const input = await revealSearch();
  const count = await requestCount();
  await input.fill(query);
  const started = performance.now();
  await input.press('Enter');
  await page.waitForFunction(count => window.filenameResponses.length > count,count);
  await page.waitForFunction(() => document.querySelector('#files')?.getAttribute('aria-busy') !== 'true');
  return {elapsedMs:performance.now()-started,...await lastSearch()};
}

async function assertClear() {
  await page.getByRole('button',{name:'Clear search',exact:true}).click();
  assert.equal(await searchInput().inputValue(),'');
  await page.getByRole('button',{name:'Load more',exact:true}).waitFor();
  await row('notes.txt').waitFor();
}

async function browseLayout() {
  for (const [index, appearance] of ['standard','minimal'].entries()) {
    await page.locator('#header-more').click();
    await nav('settings');
    await page.locator('#appearance').selectOption(appearance);
    await page.evaluate(enabled => chrome.storage.local.set({uiDebugMode:enabled}),index % 2 === 1);
    await page.waitForFunction(id => document.documentElement.dataset.aesthetic === id,appearance);
    await explorer();
    await page.locator('#toolbar-splitter').press('Home');
    await waitValue('#toolbar-splitter','1');
    await page.locator('#pane-splitter').dblclick();
    await waitValue('#pane-splitter','50');
    for (const width of [320,360,1280]) {
      await page.setViewportSize({width,height:760});
      for (const rows of ['1','2']) {
        await waitValue('#toolbar-splitter',rows);
        await frames();
        assert.equal(await searchInput().count(),1,'filename search input must have one owner');
        if (width < 400) {
          if(await searchInput().isVisible()){
            assert(await page.locator('#filename-search-popout').isVisible(),'an open search stays reachable after shrinking');
            await searchInput().press('Escape');
          }
          assert(!await searchInput().isVisible(),'compact toolbar shows squeezed search field');
          assert(await moreMenu().isVisible());
          await moreMenu().focus();
          await page.keyboard.press('Control+Shift+F7');
          await searchInput().waitFor();
          assert(await searchInput().evaluate(el=>el===document.activeElement));
          await page.keyboard.press('Control+Shift+F7');
          assert(await moreMenu().evaluate(el=>el===document.activeElement));
          assert(await searchInput().isVisible());
          await page.keyboard.press('Control+Shift+F7');
          assert(await searchInput().evaluate(el=>el===document.activeElement));
          await searchInput().press('Escape');
          assert(await moreMenu().evaluate(el => document.activeElement === el));
        } else {
          if(!await searchInput().isVisible())await page.keyboard.press('Control+Shift+F7');
          const boxes = await Promise.all(['#back','#forward','#up','#refresh','#filename-search','#toolbar-more'].map(selector => page.locator(selector).boundingBox()));
          assert(boxes.every(Boolean),'required toolbar item lacks visible bounds');
          for (const [i,box] of boxes.entries()) if (i) {
            const before = boxes[i-1];
            assert(before.x + before.width <= box.x + 1,'toolbar item overlap or wrong order');
            assert(Math.abs(before.y + before.height/2 - box.y - box.height/2) <= 5,'search or navigation moved out of the first row');
          }
          assert(boxes[4].width >= 100,'search field is too narrow');
          if (rows === '2') {
            const extra = await page.locator('#add-location').boundingBox();
            assert(extra && extra.y > boxes[0].y,'+ Right Click is missing from the second row');
          }
        }
        for (const item of ['#back','#forward','#up','#refresh','#toolbar-more']) assert(await page.locator(item).isVisible());
        const theme = await page.locator('#theme').boundingBox();
        const remotes = await page.locator('header [data-view=remotes]').boundingBox();
        assert(width-theme.x-theme.width >= 6 && Math.abs(theme.y+theme.height/2-remotes.y-remotes.height/2)<=5);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assert.equal(await requestCount(),0,'layout caused a search API call');
        await shot(`${appearance}-${width}-${rows}-rows`);
        await page.locator('#toolbar-splitter').press(rows==='1'?'ArrowDown':'Home');
      }
      await waitValue('#toolbar-splitter','1');
      assert.equal(await page.locator('#pane-splitter').getAttribute('aria-valuenow'),'50');
    }
  }
  await page.evaluate(() => chrome.storage.local.set({uiDebugMode:false}));
}

async function coldAndWarm() {
  // Grid intentionally loads visible thumbnails. Measure the filename-only
  // path in Details, where the app does not request any image bytes.
  await page.locator('#view-switch').evaluate(select=>{
    select.value='details';
    select.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.locator('#files.details').waitFor();
  const countReads=()=>page.evaluate(()=>window.filenameRequests.filter(item=>['readFile','readFileChunk'].includes(item.method)).length);
  const previousReads=await countReads();
  const input = await revealSearch();
  const before = (await providerCalls(page)).length;
  await input.fill('PHoTo');
  await page.keyboard.press('Control+Shift+F7');
  assert(!await input.evaluate(el=>el===document.activeElement));
  assert(await input.isVisible());
  assert.equal(await input.inputValue(),'PHoTo');
  await page.keyboard.press('Control+Shift+F7');
  assert(await input.evaluate(el=>el===document.activeElement));
  await frames();
  assert.equal(await requestCount(),0,'typing invoked the search API');
  assert.equal((await providerCalls(page)).length,before,'typing invoked the provider');
  const cold = await submit('PHoTo');
  const data = cold.result.data;
  assert.equal(cold.result.state,'completed');
  assert.equal(cold.request.source.prefix,'');
  assert.equal(data.complete,true);
  assert.equal(data.source,'cloud');
  assert.equal(data.stale,false);
  assert(data.nextPageToken,'matches are missing continuation for a large result set');
  const afterCold = await providerCalls(page);
  for (const cursor of ['','middle','last']) assert(afterCold.some(call => call.prefix === '' && call.cursor === cursor));
  assert(afterCold.every(call => call.prefix === ''),'search walked descendant data');
  assert(await row('PHOTO-archive.jpg').isHidden());
  assert(await row('notes.txt').isHidden());
  await row('Another-PHOTO.jpg').waitFor();
  assert(await searchInput().isVisible(),'Enter hides search');
  await row('Another-PHOTO.jpg').click();
  assert(await searchInput().isVisible(),'selecting a result hides search');
  await searchInput().press('Escape');
  assert(await searchInput().isHidden());
  assert(await row('notes.txt').isHidden());
  await revealSearch();
  assert.equal(await searchInput().inputValue(),'PHoTo');
  await page.getByRole('button',{name:'Hide search',exact:true}).click();
  assert(await searchInput().isHidden());
  assert(await row('Another-PHOTO.jpg').isVisible());
  await shot('search-multiple-pages');
  await page.getByRole('button',{name:'Load more matches',exact:true}).click();
  await page.waitForFunction(count => window.filenameResponses.length > count,1);
  const continuation = await lastSearch();
  assert.equal(continuation.request.pageToken,data.nextPageToken);
  assert(!continuation.result.data.nextPageToken);
  assert.equal(continuation.result.data.source,'cache');
  assert.equal((await providerCalls(page)).length,afterCold.length);
  const folder = await submit('photograph');
  assert.deepEqual(folder.result.data.entries.map(({key,folder})=>[key,folder]),[['photographs/',true]]);
  await row('photographs').waitFor();
  assert.equal((await providerCalls(page)).length,afterCold.length);
  const warm = await submit('CAFÉ.jpg');
  assert.equal(warm.result.data.source,'cache');
  assert.deepEqual(warm.result.data.entries.map(r=>r.key),['Cafe\u0301.JPG']);
  await row('Cafe\u0301.JPG').waitFor();
  assert.equal((await providerCalls(page)).length,afterCold.length);
  assert.equal(await countReads(),previousReads,'Details filename search must not read file bodies');
  measurements.warmPath={coldUiMs:cold.elapsedMs,warmUiMs:warm.elapsedMs,providerReadsBeforeSearch:before,providerReadsAfterCold:afterCold.length,providerReadsAfterWarm:(await providerCalls(page)).length};
  await assertClear();
}

const direct = (tab, query, overrides = {}) => tab.evaluate(({query,overrides}) => {
  const source = {...window.productFixture.target,...overrides.source};
  return window.filenameInvoke({method:'searchDirectoryNames',params:{query,...overrides,source}});
},{query,overrides});

async function persisted(concurrentContext) {
  const persisted = await page.evaluate(async () => (await indexedDB.databases()).map(d => d.name));
  assert(persisted.some(name => /filename|directory.*inventory/i.test(name)),`IndexedDB filename inventory missing: ${persisted.join(', ')}`);
  await page.reload();
  await ready(page);
  const count = (await providerCalls(page)).length;
  const warm = await direct(page,'another-photo');
  assert.equal(warm.state,'completed');
  assert.equal(warm.data.source,'cache');
  assert.deepEqual(warm.data.entries.map(e => e.key),['Another-PHOTO.jpg']);
  assert.equal((await providerCalls(page)).length,count);
  const other = await open(concurrentContext);
  const source = {prefix:'simultaneous/'};
  const [a,b] = await Promise.all([direct(page,'photo',{source}),direct(other,'second',{source})]);
  assert.equal(a.state,'completed');
  assert.equal(b.state,'completed');
  assert(a.data.complete || b.data.complete);
  const warmed = await direct(other,'second',{source});
  assert(warmed.data.complete);
  assert.deepEqual(warmed.data.entries.map(entry=>entry.key),['simultaneous/photo-second.png']);
  const combined = [...await providerCalls(page),...await providerCalls(other)].filter(call => call.prefix === 'simultaneous/');
  assert.deepEqual(combined.map(call => call.cursor).sort(),['','second'],'concurrent Shelf tabs duplicated provider paging');
  const denied = await direct(other,'photo',{source:{connectionId:'cloudflare:unrelated',accountId:'unrelated'}});
  assert.notEqual(denied.state,'completed');
  assert.equal(denied.data?.entries,undefined);
  await other.close();
  await explorer();
}

async function scopeAndMutation() {
  await submit('archive');
  await row('archive').dblclick();
  await row('PHOTO-archive.jpg').waitFor();
  assert(await row('photo-one.png').isHidden());
  assert.equal(await searchInput().inputValue(),'');
  const nested = await submit('photo');
  assert.equal(nested.request.source.prefix,'archive/');
  assert.deepEqual(nested.result.data.entries.map(e => e.key),['archive/PHOTO-archive.jpg']);
  await page.locator('#up').click();
  await row('notes.txt').waitFor();
  await submit('proof folder');
  await page.getByRole('treeitem',{name:/fixture-bucket/}).click({button:'right'});
  await page.getByRole('menuitem',{name:'New Folder',exact:true}).click();
  await page.getByLabel('Folder name').fill('proof folder');
  await page.getByRole('dialog').getByRole('button',{name:'New Folder',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  await submit('proof folder');
  await row('proof folder').waitFor();
  assert(await page.evaluate(() => window.productFixture.r2Objects.has('fixture-bucket:proof folder/')));
  assert.deepEqual((await lastSearch()).result.data.entries.map(e => e.key),['proof folder/']);
  await assertClear();
  await moreMenu().click();
  const path = page.getByLabel('Address');
  await path.waitFor();
  assert.match(await path.inputValue(),/fixture-bucket/);
  await path.press('Escape');
}

async function freshness() {
  await page.evaluate(() => { window.filenameExternalWrite = true; });
  const hidden = await submit('new-external-photo');
  assert.equal(hidden.result.data.source,'cache');
  assert.deepEqual(hidden.result.data.entries,[]);
  const before = await requestCount();
  await page.locator('#refresh').click();
  await page.waitForFunction(count => window.filenameResponses.length > count,before);
  await row('new-external-photo.jpg').waitFor();
  const refreshed = await lastSearch();
  assert.equal(refreshed.request.refresh,true);
  assert.equal(refreshed.result.data.source,'cloud');
  await page.evaluate(() => { window.filenameOffline = true; window.filenameClockOffset = 86_400_000; });
  const fallback = await submit('new-external-photo');
  assert.equal(fallback.result.data.source,'offline');
  assert(fallback.result.data.stale);
  await row('new-external-photo.jpg').waitFor();
  assert.match(await listingState().innerText(),/offline|last known|stale/i);
  await shot('offline-search-results');
  await page.evaluate(() => { window.filenameOffline = false; window.filenameClockOffset = 0; });
}

async function incompleteAndCancelled() {
  await moreMenu().click();
  const path = page.getByLabel('Address');
  await path.fill('cloudflare://fixture-account/fixture-bucket/partial/');
  await path.press('Enter');
  await row('known-name.txt').waitFor();
  await page.evaluate(() => { window.filenamePartialOffline = true; });
  const first = await submit('late-arriving');
  assert.equal(first.result.data.complete,false);
  assert.deepEqual(first.result.data.entries,[]);
  assert.match(await listingState().innerText(),/partial|incomplete/i);
  await shot('partial-search-results');
  await page.evaluate(() => {
    window.filenamePartialOffline = false;
    window.filenameProviderHook = ({prefix,cursor}) => {
      if (prefix === 'partial/' && cursor === 'second') return new Promise(resolve => { window.filenameRelease = resolve; });
    };
  });
  await page.locator('#refresh').click();
  await page.waitForFunction(() => typeof window.filenameRelease === 'function');
  await page.locator('#up').click();
  await row('notes.txt').waitFor();
  await page.evaluate(() => { window.filenameRelease(); window.filenameProviderHook = null; });
  await frames();
  assert(await row('late-arriving-name.txt').isHidden());
  assert.equal(await searchInput().inputValue(),'');
  assert(await row('notes.txt').isVisible());
}

async function blockedInventory() {
  const context = await browser.newContext({viewport:{width:1280,height:760},reducedMotion:'reduce'});
  try {
    await addFixture(context);
    await context.addInitScript(() => {
      const open = indexedDB.open.bind(indexedDB);
      window.filenameStorageFailures = 0;
      indexedDB.open = (name,...args) => {
        if (name === 'click2cloud-filename-browser-fixture') {
          window.filenameStorageFailures++;
          throw new DOMException('Fixture storage quota exceeded','QuotaExceededError');
        }
        return open(name,...args);
      };
    });
    page = await open(context);
    await explorer();
    const searched = await submit('another-photo');
    assert.equal(searched.result.data.complete,true);
    assert.equal(searched.result.data.code,'SEARCH_CACHE_UNAVAILABLE');
    assert.deepEqual(searched.result.data.entries.map(entry=>entry.key),['Another-PHOTO.jpg']);
    assert(await page.evaluate(() => window.filenameStorageFailures > 0));
    await assertClear();
  } finally { await context.close(); }
}

try {
  browser = await chromium.launch({executablePath:process.env.C2C_CHROME_EXECUTABLE ?? '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const context = await browser.newContext({viewport:{width:1280,height:760},reducedMotion:'reduce'});
  await addFixture(context);
  page = await open(context);
  await gate('responsive search, header and keyboard shortcuts in all aesthetics at 320, 360 and 1280px',browseLayout);
  await gate('Enter-only search, complete provider paging, result continuation, Unicode and warm IndexedDB reuse',coldAndWarm);
  await gate('persisted cache after reload, simultaneous Shelf tabs, account isolation and programmatic File API',() => persisted(context));
  await gate('search result folder navigation, exact scope, mkdir invalidation and Go to path',scopeAndMutation);
  await gate('external change refresh and honest stale offline results',freshness);
  await gate('partial inventory and obsolete results after navigation during paging',incompleteAndCancelled);
  await gate('blocked filename IndexedDB leaves ordinary listing and cloud search working',blockedInventory);
  assert.deepEqual(errors,[]);
} catch (error) {
  results.push({name:'browser acceptance',state:'FAIL',message:error.message,stack:error.stack});
  await page?.screenshot({path:join(out,'failure.png')}).catch(() => {});
  await writeFile(join(out,'failure.html'),await page?.content().catch(() => '') ?? '').catch(() => {});
  await writeFile(join(out,'failure-requests.json'),JSON.stringify(await page?.evaluate(() => ({requests:window.filenameRequests?.slice(-10),responses:window.filenameResponses?.slice(-3),providerCalls:window.filenameProviderCalls})).catch(() => null),null,2)).catch(() => {});
  process.exitCode = 1;
} finally {
  await writeFile(join(out,'results.json'),JSON.stringify({evidence:'Production Shelf and File API in Chromium with real IndexedDB, fixture R2 and Chrome runtime messaging',browser:browser?.version(),results,errors,measurements},null,2) + '\n');
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  console.log(JSON.stringify({out,results,errors,measurements},null,2));
}
