// IndexedDB durability and fault injection in disposable Chromium storage.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';

const root = new URL('../', import.meta.url);
const server = createServer(async (req, res) => {
  const {pathname} = new URL(req.url, 'http://localhost');
  if (pathname === '/') return res.writeHead(200, {'Content-Type':'text/html'}).end('<!doctype html><title>Inventory fixture</title>');
  if (!pathname.startsWith('/src/')) return res.writeHead(404).end();
  try {res.writeHead(200, {'Content-Type':'text/javascript'}).end(await readFile(new URL('.' + pathname, root)));}
  catch {res.writeHead(404).end();}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({
    executablePath:process.env.C2C_CHROME_EXECUTABLE ?? '/usr/bin/chromium',
    args:['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:' + server.address().port);
  const results = await page.evaluate(async () => {
    const {createDirectoryInventoryStore:store, directoryScopeKey, normalizeDirectoryName} =
      await import('/src/explorer/directory-inventory-store.mjs');
    const root = {provider:'cloudflare', connectionId:'cloudflare:a', accountId:'a', bucketName:'demo', prefix:'', authorityStamp:'sessionA'};
    const folder = {...root, prefix:'photos/'};
    const accountB = {...root, accountId:'b', connectionId:'cloudflare:b'};
    const authenticateAgain = {...root, authorityStamp:'sessionB'};
    const photo = (key, props={}) => ({key, folder:key.endsWith('/'), ...props});
    let clock = 1000;
    const options = {dbName:'inventory-restart', clock:() => clock, ttlMs:60000};
    const checks = [];
    const check = (condition, label) => {if (!condition) throw Error(label);};
    const rejects = async (promise, outcome) => {
      try {await promise;}
      catch (cause) {check(cause.code === outcome || cause.name === outcome, 'Expected ' + outcome + ', received ' + cause); return;}
      throw Error('Expected rejection ' + outcome);
    };
    const write = async (owner, scope, active, rows, nextCursor = '') => owner.ingest(scope, active.generation, {
      lease:active.lease, cursor:active.cursor, entries:rows, nextCursor
    });
    const publish = async (owner, scope, rows) => {
      const {manifest} = await owner.begin(scope);
      return write(owner, scope, manifest.working, rows);
    };

    const one = store(options), two = store(options);
    const [first, competitor] = await Promise.all([one.begin(root, {expectedRevision:null}), two.begin(root, {expectedRevision:null})]);
    check(first.acquired && !competitor.acquired, 'Concurrent leases must have one winner');
    const working = first.manifest.working;
    const partial = await write(one, root, working, [
      photo('Café.JPG', {size:2, etag:'abc', oauth:'private', customMetadata:{sourceUrl:'private'}}),
      photo('photos/'), photo('photos/deeper/rejected.jpg'), photo('Caption ΤΕΛΟΣ.doc')
    ], 'provider-next');
    check(partial.working.count === 3 && !partial.published, 'Partial scan must stay incomplete and scoped');
    check(await write(two, root, working, [photo('stale.jpg')]) === null, 'Old cursor could not advance checkpoint twice');
    const firstPage = await one.query(root, working.generation, {needle:'', limit:1});
    check(firstPage.after === 1 && firstPage.entries[0].key === 'Café.JPG' && !firstPage.entries[0].oauth, 'Exact metadata page and private-field removal');
    check(await two.manifest(accountB) === null && await two.manifest(authenticateAgain) === null, 'Account and authority namespaces cannot collide');
    checks.push('Concurrent compare-and-swap, exact directory scope and private-field minimization');

    await one.close();
    clock += 16000;
    const {manifest:restarted, acquired} = await two.begin(root, {expectedRevision:partial.revision});
    check(acquired && restarted.working.generation === working.generation && restarted.working.lease !== working.lease &&
      restarted.working.cursor === 'provider-next', 'Restart reuses checkpoint with a fresh lease');
    check(await write(two, root, partial.working, [photo('late.jpg')]) === null, 'Old lease must be fenced');
    const complete = await write(two, root, restarted.working, [photo('photos/'), photo('new.jpg')]);
    check(complete.published.complete && !complete.working && complete.published.count === 4, 'Final page atomically publishes and dedupes');
    check(complete.published.expiresAt === clock + 60000, 'Cache TTL is anchored at final commit');
    const matches = await two.query(root, complete.published.generation, {needle:normalizeDirectoryName('CAFE\u0301.jpg')});
    check(matches.after === null && matches.entries[0].key === 'Café.JPG' && matches.entries[0].etag === 'abc', 'Unicode and extension matching preserve exact key and ETag');
    const sigma = await two.query(root, complete.published.generation, {needle:normalizeDirectoryName('λος')});
    check(sigma.entries[0].key === 'Caption ΤΕΛΟΣ.doc', 'Greek lowercase/final-sigma matching');
    const tail = await two.query(root, complete.published.generation, {needle:'', after:firstPage.after, limit:5});
    check(tail.entries.map(row => row.key).join(',') === 'photos/,Caption ΤΕΛΟΣ.doc,new.jpg', 'Durable continuation must not omit newly ingested names');
    await rejects(two.query(root, complete.published.generation, {needle:'', signal:AbortSignal.abort()}), 'AbortError');
    checks.push('Restart, stable pagination, Unicode matching, deduplication and cancellation');

    await publish(two, folder, [photo('photos/inside.jpg')]);
    await publish(two, accountB, [photo('foreign.jpg')]);
    await publish(two, authenticateAgain, [photo('reauthorized.jpg')]);
    const next = await two.begin(root, {expectedRevision:complete.revision, restart:true});
    await two.invalidate(root);
    check((await two.manifest(root)).published.expiresAt === 0, 'Write invalidation marks prior complete scan stale');
    check(await write(two, root, next.manifest.working, [photo('discarded.jpg')]) === null, 'Late scan cannot publish after mutation');
    check((await two.manifest(folder)).published.expiresAt > clock, 'Exact invalidation does not touch child scope');
    await two.invalidate({accountId:'a', bucketName:'demo'}, {purge:true});
    check(await two.manifest(root) === null && await two.manifest(folder) === null && await two.manifest(authenticateAgain) === null, 'Sign-out can purge all affected authority stamps');
    check((await two.manifest(accountB)).published.complete, 'Unrelated account remains isolated');
    checks.push('Exact mutation invalidation, late scan fencing and account purge');

    const bounds = store({...options, dbName:'inventory-budget', maxScopes:2, maxDirectoryEntries:2});
    await publish(bounds, root, [photo('oldest.jpg')]);
    clock++;
    await publish(bounds, folder, [photo('photos/retained.jpg')]);
    clock++;
    await publish(bounds, accountB, [photo('third.jpg')]);
    check(await bounds.manifest(root) === null && await bounds.manifest(folder), 'Bounded oldest-directory eviction');
    const over = (await bounds.begin(accountB)).manifest.working;
    await rejects(write(bounds, accountB, over, [photo('0'), photo('1'), photo('2')]), 'INVENTORY_CAPACITY');
    const kept = await bounds.manifest(accountB);
    check(kept.working.count === 0 && kept.published.complete && kept.published.count === 1, 'Quota policy leaves prior complete snapshot plus pending checkpoint');
    await rejects(store({indexedDB:null}).manifest(root), 'INVENTORY_UNAVAILABLE');
    checks.push('Eviction limits, rejected oversized page, and unavailable IndexedDB');

    const crash = store({...options, dbName:'inventory-abort'});
    const start = (await crash.begin(root)).manifest.working;
    const originalAdd = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (...args) {
      const result = originalAdd.apply(this, args);
      if (this.name === 'entries') this.transaction.abort();
      return result;
    };
    try {await rejects(write(crash, root, start, [photo('rolled-back.jpg')]), 'AbortError');}
    finally {IDBObjectStore.prototype.add = originalAdd;}
    const rolledBack = await crash.manifest(root);
    check(!rolledBack.published && rolledBack.working.count === 0, 'Actual aborted write must not publish a partial page');
    const retry = await write(crash, root, rolledBack.working, [photo('present.jpg')]);
    check(retry.published.complete, 'Aborted page retries on same checkpoint');
    const raw = await new Promise((resolve, reject) => {
      const open = indexedDB.open('inventory-abort');
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    await new Promise((resolve, reject) => {
      const tx = raw.transaction('entries', 'readwrite');
      const entries = tx.objectStore('entries');
      const key = entries.index('byObject').getKey([directoryScopeKey(root), retry.published.generation, 'present.jpg']);
      key.onsuccess = () => entries.delete(key.result);
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error);
    });
    raw.close();
    await rejects(crash.query(root, retry.published.generation, {needle:'present'}), 'INVENTORY_CORRUPT');
    check(await crash.manifest(root) === null, 'Corrupt derived scope is removed instead of claiming no results');
    check((await publish(crash, root, [photo('rebuilt.jpg')])).published.complete, 'Corrupt scope can rebuild');
    checks.push('Actual IndexedDB transaction rollback, corrupt inventory detection and safe rebuild');

    await Promise.all([two.close(), bounds.close(), crash.close()]);
    const future = await new Promise((resolve, reject) => {
      const open = indexedDB.open('inventory-abort', 2);
      open.onupgradeneeded = () => open.result.createObjectStore('future-test');
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    await rejects(crash.manifest(root), 'INVENTORY_UNAVAILABLE');
    check(future.objectStoreNames.contains('future-test') && future.objectStoreNames.contains('directories'), 'Older builds preserve newer-version schema');
    future.close();
    checks.push('Non-destructive version incompatibility');
    return checks;
  });
  assert.equal(results.length, 6);
  console.log(JSON.stringify({browser:browser.version(), tests:results.map(name => ({name, result:'PASS'}))}, null, 2));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
