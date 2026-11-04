import test from 'node:test';
import assert from 'node:assert/strict';
import { createChromeRegistrar, generateChromePlan } from '../src/chrome/registrar.mjs';
import { mirrorRows } from '../src/chrome/mirror.mjs';
import { createDebugHost } from '../src/chrome/debug-host.mjs';

function spec(generation = 1) {
  const target = { provider: 'r2', connectionId: 'c', accountId: 'a', bucket: 'b', prefix: '' };
  return { schemaVersion: 1, generation, rows: [
    { id: 'root', parentId: null, siblingIndex: 0, type: 'normal', label: 'REDOWN', contexts: ['image'], role: 'branch' },
    { id: 'a', parentId: 'root', siblingIndex: 0, type: 'normal', label: '<script>hostile</script>', contexts: ['image'], role: 'save', actionId: 'target-a', target, intent: target },
    { id: 'branch', parentId: 'root', siblingIndex: 1, type: 'normal', label: 'Folders', contexts: ['image'], role: 'branch' },
    { id: 'child', parentId: 'branch', siblingIndex: 0, type: 'normal', label: 'Child', contexts: ['image'], role: 'save', actionId: 'target-child', target, intent: target },
    { id: 'separator', parentId: 'root', siblingIndex: 2, type: 'separator', label: '', contexts: ['image'], role: 'separator' },
    { id: 'home', parentId: 'root', siblingIndex: 3, type: 'normal', label: 'Home', contexts: ['image'], role: 'save', actionId: 'target-a', target, intent: target },
  ].map(row => ({ enabled: true, visible: true, ...row })) };
}
function fakeChrome(behavior = () => 'ok') {
  const mutations = []; const listeners = new Set();
  const chrome = { runtime: { lastError: null }, contextMenus: {
    create(properties, callback) { mutations.push(['create', properties.id]); const outcome = behavior(properties.id); if (outcome === 'throw') throw Error('private secret'); if (outcome === 'lost') return properties.id; queueMicrotask(() => { chrome.runtime.lastError = outcome === 'error' ? { message: 'private secret' } : null; callback(); chrome.runtime.lastError = null; }); return properties.id; },
    removeAll(callback) { mutations.push(['removeAll']); if (behavior('removeAll') === 'lost') return; queueMicrotask(callback); },
    onClicked: { addListener(x) { listeners.add(x); }, removeListener(x) { listeners.delete(x); } }
  } };
  return { chrome, mutations, listeners };
}

test('native plan and human mirror preserve every ordered canonical row without invented semantics', () => {
  const source = spec(); const plan = generateChromePlan(source); const mirror = mirrorRows(source);
  assert.equal(plan.rows.length, source.rows.length);
  assert.deepEqual(mirror.map(x => x.itemId), plan.rows.map(x => x.itemId));
  assert.equal(plan.rows[1].properties.title, '<script>hostile</script>');
  assert.equal('title' in plan.rows[4].properties, false);
  assert.equal(plan.rows.at(-1).properties.title, 'Home');
  assert.throws(() => generateChromePlan({ ...source, rows: [{ ...source.rows[2], siblingIndex: 0 }] }), /INVALID_MENU_PARENT/);
});

test('single registrar tracks desired generated ACK and independent observation separately; unchanged no-op', async () => {
  const f = fakeChrome(); const events = []; const r = createChromeRegistrar({ chrome: f.chrome, sink: x => events.push(x) });
  assert.equal(f.listeners.size, 1);
  assert.equal((await r.apply(spec())).state, 'completed');
  const evidence = r.inspect();
  assert.equal(evidence.desired.generation, 1); assert.equal(evidence.generated.evidenceClass, 'generated');
  assert.equal(evidence.acknowledgedGeneration, 1); assert.equal(evidence.observed, null);
  assert.equal(evidence.acknowledgements.length, 7); assert.equal(events.filter(x => x.code === 'ITEM_ACKNOWLEDGED').length, 6);
  const before = f.mutations.length;
  assert.equal((await r.apply(spec())).code, 'UNCHANGED_ACK_REUSED'); assert.equal(f.mutations.length, before);
  assert.throws(() => r.addObservedEvidence({ generation: 2, testId: 'native', itemIds: [] }), /INVALID_OBSERVED_EVIDENCE/);
  r.addObservedEvidence({ generation: 1, testId: 'native', itemIds: ['root'], complete: true });
  assert.equal(r.inspect().observed.complete, false);
  r.close(); assert.equal(f.listeners.size, 0);
});

test('failed child ACK does not conceal independently failed sibling; blocked descendants visible', async () => {
  const f = fakeChrome(id => ['a', 'branch'].includes(id) ? 'error' : 'ok');
  const r = createChromeRegistrar({ chrome: f.chrome }); const result = await r.apply(spec());
  assert.equal(result.state, 'partial'); assert.equal(result.failedItems, 3); assert.equal(result.appliedGeneration, null);
  assert.deepEqual(r.inspect().acknowledgements.filter(x => x.state === 'failed').map(x => x.itemId), ['a', 'branch']);
  assert.equal(r.inspect().acknowledgements.find(x => x.itemId === 'child').code, 'PARENT_NOT_ACKNOWLEDGED');
  assert.equal(r.inspect().acknowledgements.find(x => x.itemId === 'home').state, 'acknowledged');
  assert.equal(r.resolveClick({ itemId: 'home', generation: 1 }).code, 'NATIVE_GENERATION_UNACKNOWLEDGED');
});

test('lost callback is uncertainty even when create returned correct-looking ID', async () => {
  const f = fakeChrome(id => id === 'a' ? 'lost' : 'ok'); const r = createChromeRegistrar({ chrome: f.chrome, timeoutMs: 5 });
  assert.equal((await r.apply(spec())).state, 'partial');
  assert.equal(r.inspect().acknowledgements.find(x => x.itemId === 'a').state, 'uncertain');
  assert.equal(r.inspect().acknowledgedGeneration, null);
});

test('removeAll missing ACK invalidates old generation and never claims installed state', async () => {
  let lost = false; const f = fakeChrome(id => lost && id === 'removeAll' ? 'lost' : 'ok'); const r = createChromeRegistrar({ chrome: f.chrome, timeoutMs: 5 });
  await r.apply(spec()); lost = true;
  assert.equal((await r.apply(spec(2))).state, 'uncertain'); assert.equal(r.inspect().acknowledgedGeneration, null);
});

test('serial generations reject stale/conflicting plans; restart does not trust historical ACK; sink throws harmlessly', async () => {
  const f = fakeChrome(); const r = createChromeRegistrar({ chrome: f.chrome, sink() { throw Error('diagnostics failed'); } });
  const a = r.apply(spec(1)); const b = r.apply(spec(2));
  assert.equal(r.resolveClick({ itemId: 'a', generation: 1 }).state, 'blocked');
  await Promise.all([a, b]); assert.equal(r.inspect().acknowledgedGeneration, 2);
  assert.equal((await r.apply(spec(1))).code, 'STALE_GENERATION');
  const conflict = spec(2); conflict.rows[1].actionId = 'different';
  assert.equal((await r.apply(conflict)).code, 'GENERATION_CONFLICT');
  r.close();
  const recovered = createChromeRegistrar({ chrome: f.chrome, epoch: 2 });
  assert.equal(recovered.inspect().acknowledgedGeneration, null);
  assert.equal((await recovered.recover(spec(2))).state, 'completed');
});

test('persistence failure cannot be described as complete durable readiness; actual native ACK remains explicit', async () => {
  const f = fakeChrome(); const r = createChromeRegistrar({ chrome: f.chrome, persist: async () => { throw Error('secret db error'); } });
  const result = await r.apply(spec()); assert.equal(result.state, 'partial'); assert.equal(result.code, 'PERSISTENCE_FAILED'); assert.equal(result.appliedGeneration, 1);
});

test('native user failure feedback survives missing auth/dispatcher and disabled diagnostics', async () => {
  const f = fakeChrome(); const outcomes = []; const r = createChromeRegistrar({ chrome: f.chrome, onOutcome: x => outcomes.push(x) });
  await r.apply(spec()); assert.equal((await r.handleClick({ menuItemId: 'a', srcUrl: 'https://private' })).code, 'CURRENT_AUTHORIZATION_REQUIRED');
  assert.equal(outcomes.length, 1); assert.equal(JSON.stringify(r.inspect()).includes('https://private'), false);
});

test('privileged debug host refuses external senders, unknown routes, absent consent, writes and export', async () => {
  const runtime = { id: 'mine', getURL: path => `chrome-extension://mine/${path}` };
  const calls = []; const host = createDebugHost({ runtime, api: { simulateMenuAction: async args => { calls.push(args); return { state: 'completed' }; } } });
  const sender = { id: 'mine', url: runtime.getURL('extension/mirror.html'), documentId: 'document' };
  assert.equal((await host.request({ version: 1, method: 'simulateMenuAction' }, sender)).code, 'DEBUG_AUTHORIZATION_REQUIRED');
  assert.equal((await host.request({ version: 1, method: 'authorizeDebug', userGesture: true }, { ...sender, url: 'https://evil' })).code, 'SENDER_DENIED');
  assert.equal((await host.request({ version: 1, method: 'authorizeDebug', userGesture: true }, sender)).code, 'DEBUG_AUTHORIZED');
  assert.equal((await host.request({ version: 1, method: 'simulateMenuAction', args: { itemId: 'a' } }, sender)).state, 'completed');
  assert.equal(calls.length, 1);
  for (const method of ['upload', 'activateAllBuckets']) assert.equal((await host.request({ version: 1, method }, sender)).code, 'READ_ONLY_METHOD_REQUIRED');
  await host.request({ version: 1, method: 'revokeDebug' }, sender);
  assert.equal((await host.request({ version: 1, method: 'simulateMenuAction' }, sender)).code, 'DEBUG_AUTHORIZATION_REQUIRED');
});

test('duplicate owners rejected, immutable acknowledged models and retry repair preserve identity', async () => {
  let reject = true;
  const f = fakeChrome(id => id === 'a' && reject ? 'error' : 'ok');
  const r = createChromeRegistrar({ chrome: f.chrome });
  assert.throws(() => createChromeRegistrar({ chrome: f.chrome }), /REGISTRAR_ALREADY_OWNED/);
  const model = spec();
  assert.equal((await r.apply(model)).state, 'partial');
  assert.throws(() => { model.rows[1].target.prefix = 'different/'; }, TypeError);
  reject = false;
  assert.equal((await r.apply(model)).state, 'completed');
  assert.equal(r.inspect().acknowledgedGeneration, 1);
  assert.throws(() => r.addObservedEvidence({ generation: 1, testId: 'native', itemIds: ['root', 'root'], complete: true }), /INVALID_OBSERVED_EVIDENCE/);
});

test('failed persistence cannot turn into success merely by reapplying same generation', async () => {
  const f = fakeChrome(); const r = createChromeRegistrar({ chrome: f.chrome, persist: async () => { throw Error('db unavailable'); } });
  assert.equal((await r.apply(spec())).state, 'partial');
  assert.equal((await r.apply(spec())).state, 'partial');
});


test('debug and one-page export grants are expiring, document-bound and distinct', async () => {
  let now = 1; const calls = [];
  const runtime = { id: 'mine', getURL: path => `chrome-extension://mine/${path}` };
  const api = { exportReceipt: async (args, context) => { calls.push(context.grant); return { export: { authorized: true }, cursor: 'next-page' }; } };
  const host = createDebugHost({ runtime, api, clock: () => now, grantTtlMs: 100, exportTtlMs: 10 });
  const sender = { id: 'mine', url: runtime.getURL('extension/mirror.html'), documentId: 'doc' };
  const req = (method, extra = {}, from = sender) => host.request({ version: 1, method, ...extra }, from);
  await req('authorizeDebug', { userGesture: true });
  assert.equal((await req('exportReceipt')).code, 'EXPORT_AUTHORIZATION_REQUIRED');
  assert.equal((await req('authorizeExport')).code, 'EXPORT_USER_GESTURE_REQUIRED');
  await req('authorizeExport', { userGesture: true });
  assert.equal((await req('exportReceipt', { args: { cursor: 'next-page' } }, { ...sender, documentId: 'other' })).code, 'DEBUG_AUTHORIZATION_REQUIRED');
  assert.equal((await req('exportReceipt')).export.authorized, true);
  assert.equal(calls[0].export, true);
  assert.equal((await req('exportReceipt')).code, 'EXPORT_AUTHORIZATION_REQUIRED');
  await req('authorizeExport', { userGesture: true }); now = 12;
  assert.equal((await req('exportReceipt')).code, 'EXPORT_AUTHORIZATION_REQUIRED');
  now = 102;
  assert.equal((await req('inspectCanonicalMenu')).code, 'DEBUG_AUTHORIZATION_REQUIRED');
});

test('every row outcome has canonical ordinal and explicit prerequisite links, including blocked descendants', async () => {
  const events = [];
  const f = fakeChrome(id => id === 'branch' ? 'error' : 'ok');
  const r = createChromeRegistrar({ chrome: f.chrome, sink: event => { events.push(event); return events.length; } });
  await r.apply(spec());
  assert.equal(events.find(event => event.code === 'PLAN_GENERATED').count, 6);
  const rows = events.filter(event => event.stage === 'chrome.ack' && event.count > 0);
  assert.deepEqual(rows.map(event => event.count), [1, 2, 3, 4, 5, 6]);
  const failed = rows.find(event => event.count === 3);
  const blocked = rows.find(event => event.count === 4);
  assert.equal(failed.outcome, 'failed');
  assert.equal(blocked.outcome, 'blocked');
  assert.ok(blocked.requires.includes(events.indexOf(failed) + 1));
});
