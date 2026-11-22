import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { unzipSync, strFromU8 } from "../src/basic/vendor/fflate.js";
import { openStore, DEFAULTS } from "../src/basic/lib/store.js";
import { createCoordinator } from "../src/basic/lib/coordinator.js";
import { safeUrl } from "../src/basic/lib/common.js";
import { acquireSource, sanitizeFilename } from "../src/basic/lib/source.js";
import { exportDiagnostics } from "../src/basic/lib/zip.js";
const fresh = () => openStore(indexedDB, crypto.randomUUID());
const input = {
  provider: "google",
  sourceUrl: "https://example.test/photo.png",
  hostUrl: "https://example.test/page",
};
const acquired = {
  bytes: new Uint8Array([1, 2, 3]),
  filename: "photo.png",
  mime: "image/png",
};
const auth = {
  status: async () => ({ ready: true }),
  token: async () => "secret-token",
};
function coordinator(store, overrides = {}) {
  return createCoordinator({
    store,
    auth,
    acquire: async () => acquired,
    adapters: {
      google: {
        upload: async () => ({
          id: "cloud-id",
          provider: "google",
          name: "photo.png",
          size: 3,
          confirmed: true,
        }),
      },
    },
    ...overrides,
  });
}
test("real source bytes and filename, MIME, unknown length bounded strategy", async () => {
  const source = await acquireSource(
    { sourceUrl: "https://example.test/x" },
    {
      fetch: async () =>
        new Response(new Uint8Array([1, 2, 3]), {
          headers: {
            "Content-Type": "image/png",
            "Content-Disposition":
              "attachment; filename*=UTF-8''hello%20world.png",
          },
        }),
    },
  );
  assert.deepEqual(source.bytes, new Uint8Array([1, 2, 3]));
  assert.notEqual(source.bytes.buffer.resizable, true);
  assert.equal(source.filename, "hello world.png");
  assert.equal(source.preview, "data:image/png;base64,AQID");
  assert.equal(sanitizeFilename("CON.pdf"), "_CON.pdf");
  assert.equal(sanitizeFilename("../a#%.png"), "_a__.png");
  assert.equal(sanitizeFilename("a".repeat(200) + ".jpg").length, 150);
});
test("source access is checked at each inspectable redirect without credentials or prompts", async () => {
  const checked = [], loaded = [];
  const source = await acquireSource(input, {
    hasAccess: async url => {checked.push(url.origin);return true;},
    fetch: async (url, options) => {
      loaded.push(url);
      assert.equal(options.credentials, "omit");
      assert.equal(options.redirect, "manual");
      if (loaded.length === 1) return new Response(null, {status: 302, headers: {Location: "https://cdn.example/image.png"}});
      return new Response(new Uint8Array([1, 2, 3]), {headers: {"content-type": "image/png"}});
    },
  });
  assert.equal(source.filename, "image.png");
  assert.deepEqual(checked, ["https://example.test", "https://cdn.example"]);
  assert.equal(loaded.length, 2);
});
test("withheld permission, network failure, private redirect and opaque redirect have separate outcomes", async () => {
  await assert.rejects(acquireSource(input, {hasAccess: async () => false, fetch: () => assert.fail()}),
    {code: "SOURCE_PERMISSION_REQUIRED"});
  await assert.rejects(acquireSource(input, {fetch: async () => {throw TypeError("private fetch detail");}}),
    error => error.code === "SOURCE_UNAVAILABLE" && !error.message.includes("private"));
  let followed = 0;
  await assert.rejects(acquireSource(input, {fetch: async () => {
    followed++;
    return new Response(null, {status: 302, headers: {Location: "http://127.0.0.1/a"}});
  }}), {code: "SOURCE_REDIRECT_UNAVAILABLE"});
  await assert.rejects(acquireSource(input, {fetch: async () => {
    followed++;
    return new Response(null, {status: 302, headers: {Location: "https://[::1]/a"}});
  }}), {code: "SOURCE_PRIVATE_ADDRESS"});
  assert.equal(followed, 2);
  await assert.rejects(acquireSource(input, {fetch: async () => ({type: "opaqueredirect", status: 0})}),
    {code: "SOURCE_REDIRECT_UNAVAILABLE"});
});
for (const [label, response, code] of [
  [
    "HTML MIME",
    () =>
      new Response("<html>login", { headers: { "content-type": "text/html" } }),
    "SOURCE_HTML_REJECTED",
  ],
  [
    "masquerading HTML",
    () =>
      new Response("<!doctype html>login", {
        headers: { "content-type": "image/png" },
      }),
    "SOURCE_HTML_REJECTED",
  ],
  [
    "partial",
    () =>
      new Response("abc", {
        status: 206,
        headers: {
          "content-range": "bytes 100-102/500",
          "content-length": "3",
        },
      }),
    "SOURCE_PARTIAL_REJECTED",
  ],
  ["empty", () => new Response(""), "SOURCE_EMPTY"],
  [
    "HTTP denied",
    () => new Response("no", { status: 403 }),
    "SOURCE_HTTP_ERROR",
  ],
  [
    "oversize header",
    () => new Response("x", { headers: { "content-length": "999999999" } }),
    "SOURCE_TOO_LARGE",
  ],
  [
    "unknown-size oversize stream",
    () => new Response("abcd"),
    "SOURCE_TOO_LARGE",
  ],
  [
    "length mismatch",
    () => new Response("abc", { headers: { "content-length": "4" } }),
    "SOURCE_LENGTH_MISMATCH",
  ],
])
  test(`source rejects ${label}`, async () => {
    await assert.rejects(
      acquireSource(input, {
        fetch: async () => response(),
        maxBytes:
          label === "unknown-size oversize stream" ? 3 : 32 * 1024 * 1024,
      }),
      { code },
    );
  });
test("safe local URLs remove credential queries, fragments, credentials and dangerous schemes", () => {
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(
    safeUrl("https://user:pass@host/a?token=secret#access"),
    "https://host/[private-link]",
  );
  assert.equal(safeUrl("https://host/a?x=2#private"), "https://host/a?x=2");
});
test("confirmed save durable history, exactly-once concurrent and later callback/replay, URLs never adapter inputs", async () => {
  const store = await fresh();
  let uploads = 0;
  const c = coordinator(store, {
    adapters: {
      google: {
        upload: async (payload) => {
          uploads++;
          assert.equal(payload.sourceUrl, undefined);
          assert.equal(payload.hostUrl, undefined);
          return {
            id: "obj",
            name: payload.filename,
            provider: "google",
            size: 3,
            confirmed: true,
          };
        },
      },
    },
  });
  const request = { ...input, requestId: "test-operation-0001" };
  const results = await Promise.all([
    c.start(request),
    c.start(request),
    c.start(request),
  ]);
  assert.ok(results.every((a) => a.state === "SAVED"));
  assert.equal(uploads, 1);
  assert.deepEqual(await store.counter(), { count: 1 });
  await c.start(request);
  assert.equal(uploads, 1);
  await store.historyDelete(request.requestId);
  assert.deepEqual(await store.counter(), { count: 1 });
  await assert.rejects(c.start(request), { code: "ALREADY_COMPLETED" });
  store.close();
});
test("provider-verified rename is a confirmed distinct new save", async () => {
  const store = await fresh();
  const c = coordinator(store, {
    adapters: {
      google: {
        upload: async () => ({
          id: crypto.randomUUID(),
          provider: "google",
          name: "photo (1).png",
          requestedName: "photo.png",
          size: 3,
          confirmed: true,
        }),
      },
    },
  });
  const a = await c.start(input);
  assert.equal(a.state, "SAVED");
  assert.equal(a.filename, "photo (1).png");
  await c.start(input);
  assert.equal((await store.counter()).count, 2);
  store.close();
});
test("readiness false creates failure and meaningful History; never source or upload", async () => {
  const store = await fresh();
  const c = coordinator(store, {
    auth: {
      token: async () => {
        throw Object.assign(Error("Required upload permissions are missing."), {
          code: "AUTH_SCOPE_REQUIRED",
          nextAction: "Reconnect/Approve.",
        });
      },
    },
    acquire: async () => assert.fail("must not fetch"),
  });
  const a = await c.start(input);
  assert.equal(a.state, "FAILED");
  assert.equal(a.code, "AUTH_SCOPE_REQUIRED");
  assert.equal((await store.counter()).count, 0);
  assert.equal((await store.historyList()).total, 1);
  store.close();
});
for (const receipt of [
  null,
  { id: "x", provider: "google", name: "photo.png", size: 3, confirmed: false },
  { id: "x", provider: "google", name: "other.png", size: 3, confirmed: true },
  { id: "x", provider: "google", name: "photo.png", size: 1, confirmed: true },
])
  test("missing or mismatched provider proof remains uncertain, never count", async () => {
    const store = await fresh();
    const c = coordinator(store, {
      adapters: { google: { upload: async () => receipt } },
    });
    const a = await c.start(input);
    assert.equal(a.state, "UNCERTAIN");
    assert.equal((await store.counter()).count, 0);
    store.close();
  });
test("ambiguous final network failure uncertain; definitive rejection failed; no retry", async () => {
  const store = await fresh();
  let n = 0;
  for (const definitive of [false, true]) {
    const c = coordinator(store, {
      adapters: {
        google: {
          upload: async () => {
            n++;
            throw Object.assign(Error("safe"), {
              code: "PROVIDER_HTTP",
              definitive,
            });
          },
        },
      },
    });
    assert.equal(
      (await c.start(input)).state,
      definitive ? "FAILED" : "UNCERTAIN",
    );
  }
  assert.equal(n, 2);
  assert.equal((await store.counter()).count, 0);
  store.close();
});
test("worker restart conservatively marks active operations uncertain, never resumes or counts; clears only terminal history", async () => {
  const store = await fresh();
  await store.begin({
    id: "interrupted",
    provider: "google",
    state: "UPLOADING",
    createdAt: new Date().toISOString(),
  });
  assert.equal((await store.historyClear()).deleted, 0);
  assert.deepEqual(await store.recover(), { interrupted: 1 });
  assert.equal((await store.getAttempt("interrupted")).state, "UNCERTAIN");
  assert.equal((await store.counter()).count, 0);
  assert.equal((await store.historyClear()).deleted, 1);
  store.close();
});
test("terminal atomic finalization enforces proof and immutable state", async () => {
  const store = await fresh();
  await store.begin({
    id: "atomic",
    state: "UPLOADING",
    provider: "google",
    createdAt: "2026-01-01",
  });
  await assert.rejects(store.finish("atomic", { state: "SAVED" }), {
    code: "CONFIRMATION_REQUIRED",
  });
  assert.equal((await store.counter()).count, 0);
  await store.finish("atomic", {
    state: "SAVED",
    objectId: "obj",
    confirmed: true,
  });
  await store.finish("atomic", { state: "FAILED" });
  assert.equal((await store.getAttempt("atomic")).state, "SAVED");
  assert.equal((await store.counter()).count, 1);
  store.close();
});
test("History indexed bounded pagination at thousands, delete independence, strict input", async () => {
  const store = await fresh();
  for (let i = 0; i < 2100; i++)
    await store.begin({
      id: "item" + String(i).padStart(4, "0"),
      state: "FAILED",
      createdAt: new Date(1700000000000 + i).toISOString(),
    });
  const p = await store.historyList({ page: 2 });
  assert.equal(p.items.length, 40);
  assert.equal(p.total, 2100);
  assert.equal(p.items[0].id, "item2059");
  await store.updateSettings({ pageSize: 10 });
  assert.equal((await store.historyList()).items.length, 10);
  await assert.rejects(store.historyList({ page: 0 }), {
    code: "INVALID_PAGE",
  });
  store.close();
});
test("diagnostics default ON, 4000 EVENT cap, arbitrary cap, unlimited, OFF core independence, retention pruning", async () => {
  const store = await fresh();
  assert.deepEqual(await store.settings(), DEFAULTS);
  for (let i = 0; i < 4003; i++)
    await store.event({ stage: "TEST", timestamp: new Date().toISOString() });
  assert.equal((await store.diagnosticsList()).total, 4000);
  await store.updateSettings({ diagnosticsCap: 7 });
  assert.equal((await store.diagnosticsList()).total, 7);
  await store.updateSettings({ diagnosticsCap: null });
  for (let i = 0; i < 13; i++) await store.event({ stage: "TEST" });
  assert.equal((await store.diagnosticsList()).total, 20);
  for (const v of [0, -1, 1.5, "2", Infinity, NaN])
    await assert.rejects(store.updateSettings({ diagnosticsCap: v }), {
      code: "INVALID_SETTINGS",
    });
  await store.updateSettings({ diagnosticsEnabled: false });
  const a = await coordinator(store).start(input);
  assert.equal(a.state, "SAVED");
  assert.equal((await store.diagnosticsList()).total, 20);
  assert.equal((await store.counter()).count, 1);
  await store.updateSettings({ diagnosticsEnabled: true });
  await store.event({ stage: "REENABLED" });
  assert.equal((await store.diagnosticsList()).total, 21);
  store.close();
});
test("ZIP valid local archive, retained events including URLs/speed, exports while OFF, honest size limit", async () => {
  const store = await fresh();
  await coordinator(store, {
    now: (() => {
      let t = 0;
      return () => (t += 100);
    })(),
  }).start(input);
  await store.updateSettings({ diagnosticsEnabled: false });
  const { bytes, summary } = await exportDiagnostics(store);
  const files = unzipSync(bytes);
  assert.deepEqual(Object.keys(files), [
    "events.jsonl",
    "summary.json",
    "README.txt",
  ]);
  assert.equal(summary.count, 6);
  assert.equal(summary.collectionEnabled, false);
  const events = strFromU8(files["events.jsonl"])
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.equal(events.at(-1).speedBps, 30);
  assert.equal(events.at(-1).hostUrl, input.hostUrl);
  assert.ok(!strFromU8(files["events.jsonl"]).includes("secret-token"));
  await assert.rejects(exportDiagnostics(store, { maxBytes: 10 }), {
    code: "EXPORT_TOO_LARGE",
  });
  assert.equal((await store.historyList()).total, 1);
  await store.diagnosticsClear();
  assert.equal((await store.counter()).count, 1);
  store.close();
});
test("quota failure atomically rolls back both saved History and counter; optional logging quota does not break core", async () => {
  const store = await fresh();
  await store.begin({
    id: "quota-test",
    state: "UPLOADING",
    provider: "google",
    createdAt: "2026-01-01",
  });
  const original = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (value, key) {
    if (this.name === "meta" && key === "count")
      throw new DOMException("quota", "QuotaExceededError");
    return original.call(this, value, key);
  };
  try {
    await assert.rejects(
      store.finish("quota-test", {
        state: "SAVED",
        confirmed: true,
        objectId: "obj",
      }),
      { name: "QuotaExceededError" },
    );
  } finally {
    IDBObjectStore.prototype.put = original;
  }
  assert.equal((await store.getAttempt("quota-test")).state, "UPLOADING");
  assert.equal((await store.counter()).count, 0);
  const c = coordinator({
    ...store,
    event: async () => {
      throw new DOMException("quota", "QuotaExceededError");
    },
  });
  assert.equal((await c.start(input)).state, "SAVED");
  assert.equal((await store.counter()).count, 1);
  store.close();
});
test("request ID cannot be reused with changed provider/source during execution or after completion", async () => {
  const store = await fresh();
  const c = coordinator(store);
  const request = { ...input, requestId: "immutable-request-123" };
  const pending = c.start(request);
  assert.throws(
    () => c.start({ ...request, sourceUrl: "https://example.test/other" }),
    { code: "IDEMPOTENCY_CONFLICT" },
  );
  await pending;
  await assert.rejects(c.start({ ...request, provider: "dropbox" }), {
    code: "IDEMPOTENCY_CONFLICT",
  });
  assert.equal((await store.counter()).count, 1);
  store.close();
});
test("diagnostic storage failures surface warning while core save succeeds", async () => {
  const store = await fresh();
  let notified;
  const c = coordinator(
    {
      ...store,
      event: async () => {
        throw new DOMException("full", "QuotaExceededError");
      },
    },
    {
      notify: (a) => {
        notified = a;
      },
    },
  );
  const a = await c.start(input);
  assert.equal(a.state, "SAVED");
  assert.equal(a.diagnosticsWarning, "DIAGNOSTICS_STORAGE_UNAVAILABLE");
  assert.equal(notified.diagnosticsWarning, a.diagnosticsWarning);
  assert.equal(
    (await store.getAttempt(a.id)).diagnosticsWarning,
    a.diagnosticsWarning,
  );
  store.close();
});
for(const encoding of ['utf16le','utf16be'])test(`source rejects disguised HTML in ${encoding}`,async()=>{
 const text='<html><body>login</body></html>',buffer=new Uint8Array(2+text.length*2),le=encoding==='utf16le';buffer.set(le?[255,254]:[254,255]);for(let i=0;i<text.length;i++)buffer[2+i*2+(le?0:1)]=text.charCodeAt(i);
 await assert.rejects(acquireSource(input,{fetch:async()=>new Response(buffer,{headers:{'content-type':'application/octet-stream'}})}),{code:'SOURCE_HTML_REJECTED'});
});
test('browser AbortError numeric code maps to actionable source timeout',async()=>{
 await assert.rejects(acquireSource(input,{timeoutMs:1,fetch:async(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}))}),{code:'SOURCE_TIMEOUT'});
});

test('Basic verified accounting resumes a bounded old-ledger audit and retains dates through History deletion', async () => {
  const name = crypto.randomUUID();
  let store = await openStore(indexedDB, name);
  const start = Date.parse(new Date().toISOString().slice(0, 10));
  const end = start + 86400000;
  const date = new Date(start + 3600000).toISOString();
  const db = await new Promise((resolve, reject) => {
    const opening = indexedDB.open(name);
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error);
  });
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['attempts', 'ledger', 'meta'], 'readwrite');
      const receipts = tx.objectStore('ledger'), history = tx.objectStore('attempts');
      for (let i = 0; i < 130; i++) {
        const id = 'old-' + String(i).padStart(3, '0');
        const receipt = {id, provider:'google', objectId:'object-' + id};
        receipts.add(receipt);
        if (i === 129) continue; // Already erased in an older version. The date cannot be recovered.
        const updatedAt = i === 0 ? new Date(start - 1000).toISOString() : date;
        history.add({...receipt, updatedAt, createdAt:updatedAt, state:'SAVED', confirmed:true});
      }
      tx.objectStore('meta').put(130, 'count');
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error);
    });
    await store.historyDelete('old-100');
    assert.deepEqual(await store.verifiedCount({start, end}), {count:63, complete:false});
    store.close();
    store = await openStore(indexedDB, name);
    const providers = ['google', 'onedrive', 'dropbox'];
    const callbacks = [];
    const notify = row => callbacks.push(row.provider);
    for (const provider of providers) await store.begin({id:provider, provider, createdAt:date, state:'CONFIRMING'});
    const success = provider => store.finish(provider, {state:'SAVED', confirmed:true, objectId:'new-'+provider}, notify);
    await Promise.all([...providers.map(success), success('dropbox')]);
    const failed = ['FAILED', 'UNCERTAIN'];
    for (const state of failed) {
      await store.begin({id:state, provider:'dropbox', createdAt:date, state:'CONFIRMING'});
      await store.finish(state, {state, confirmed:false}, notify);
    }
    await store.historyClear();
    assert.equal((await store.verifiedCount({start, end})).complete, false);
    assert.deepEqual(await store.verifiedCount({start, end}), {count:131, complete:true});
    assert.deepEqual(await store.verifiedCount({start:start-86400000, end:start}), {count:1, complete:true});
    assert.deepEqual(await store.counter(), {count:133});
    assert.deepEqual(callbacks.sort(), providers.sort());
    assert.equal((await store.historyList({})).total, 0);
    await assert.rejects(store.begin({id:'dropbox', provider:'dropbox', state:'RECEIVED'}), {code:'ALREADY_COMPLETED'});
  } finally {
    db.close();
    store.close();
  }
});
