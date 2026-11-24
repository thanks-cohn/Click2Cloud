import { fail, TERMINAL, WAITING, projectOutcome } from "./common.js";
import { pendingExpired } from "./intent.js";
export const DEFAULTS = Object.freeze({
  pageSize: 40,
  diagnosticsEnabled: true,
  diagnosticsCap: 4000,
});
const req = (r) =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
const badgeAuditKey = ["badge-audit", 1];
const badgeMinute = "badge-minute";
const auditPageSize = 64;
const minuteOf = at => Math.floor(at / 60_000);
function legacyVerifiedAt(attempt, receipt) {
  if (attempt?.state !== "SAVED" || attempt.confirmed !== true ||
      attempt.provider !== receipt?.provider || attempt.objectId !== receipt?.objectId) return undefined;
  const at = Date.parse(attempt.updatedAt);
  return Number.isFinite(at) ? at : undefined;
}
async function addBadgeCount(meta, at) {
  const key = [badgeMinute, minuteOf(at)];
  await req(meta.put(((await req(meta.get(key))) ?? 0) + 1, key));
}
// Retain available proof dates even if History is cleared before the audit reaches them.
async function retainLegacyDate(ledger, attempt) {
  if (attempt?.state !== "SAVED" || attempt.badgeVerifiedAt !== undefined) return;
  const receipt = await req(ledger.get(attempt.id));
  if (!receipt || receipt.badgeIndexed || receipt.verifiedAt !== undefined) return;
  const verifiedAt = legacyVerifiedAt(attempt, receipt);
  if (verifiedAt !== undefined) await req(ledger.put({...receipt, verifiedAt}));
}
const done = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || Error("Transaction aborted"));
  });
export function validateSettings(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw fail("INVALID_SETTINGS", "Settings must be an object.");
  for (const [k, v] of Object.entries(input)) {
    const valid =
      (k === "pageSize" && [10, 20, 40, 100].includes(v)) ||
      (k === "diagnosticsEnabled" && typeof v === "boolean") ||
      (k === "diagnosticsCap" && (v === null || (Number.isSafeInteger(v) && v > 0)));
    if (!valid)
      throw fail(
        "INVALID_SETTINGS",
        `Invalid setting: ${k}.`,
        "Use a positive whole-number diagnostics cap or Unlimited.",
      );
  }
  return input;
}
export async function openStore(
  indexedDB = globalThis.indexedDB,
  name = "redown-remote-basic-v1",
  { signal, onBlocked } = {},
) {
  signal?.throwIfAborted();
  const opening = indexedDB.open(name, 1);
  opening.onblocked = onBlocked ?? null;
  opening.onupgradeneeded = () => {
    if (signal?.aborted) {
      opening.transaction.abort();
      return;
    }
    const db = opening.result;
    const attempts = db.createObjectStore("attempts", { keyPath: "id" });
    attempts.createIndex("createdAt", "createdAt");
    attempts.createIndex("state", "state");
    attempts.createIndex("providerCreatedAt", ["provider", "createdAt"]);
    const events = db.createObjectStore("events", {
      keyPath: "id",
      autoIncrement: true,
    });
    events.createIndex("attemptId", "attemptId");
    db.createObjectStore("ledger", { keyPath: "id" });
    db.createObjectStore("meta");
  };
  const db = await req(opening);
  if (signal?.aborted) {
    db.close();
    throw signal.reason;
  }
  db.onversionchange = () => db.close();
  async function run(names, mode, fn, signal) {
    signal?.throwIfAborted();
    const tx = db.transaction(names, mode);
    const completion = done(tx);
    // Observe abort even when a queued request has not reached its handler.
    if (signal) void completion.catch(() => {});
    const abort = () => {
      try {
        tx.abort();
      } catch {}
    };
    signal?.addEventListener("abort", abort, { once: true });
    try {
      const value = await fn(tx);
      await completion;
      return value;
    } catch (e) {
      abort();
      await completion.catch(() => {});
      throw e;
    } finally {
      signal?.removeEventListener("abort", abort);
    }
  }
  const read = (store, key) =>
    run([store], "readonly", (tx) => req(tx.objectStore(store).get(key)));
  const settings = async () => ({
    ...DEFAULTS,
    ...(await read("meta", "settings")),
  });
  let auditComplete = false;
  async function auditBadge() {
    if (auditComplete) return true;
    if ((await read("meta", badgeAuditKey))?.complete) return auditComplete = true;
    const complete = await run(["meta", "ledger", "attempts"], "readwrite", async tx => {
      const meta = tx.objectStore("meta"), ledger = tx.objectStore("ledger");
      const progress = (await req(meta.get(badgeAuditKey))) ?? {after:null, undated:0};
      if (progress.complete) return true;
      const range = progress.after === null ? null : IDBKeyRange.lowerBound(progress.after, true);
      const receipts = await req(ledger.getAll(range, auditPageSize + 1));
      for (const receipt of receipts.slice(0, auditPageSize)) {
        progress.after = receipt.id;
        if (receipt.badgeIndexed) continue;
        const at = receipt.verifiedAt ?? legacyVerifiedAt(
          await req(tx.objectStore("attempts").get(receipt.id)), receipt);
        if (!Number.isFinite(at)) {
          progress.undated++;
          continue;
        }
        await addBadgeCount(meta, at);
        await req(ledger.put({...receipt, verifiedAt:at, badgeIndexed:true}));
      }
      progress.complete = receipts.length <= auditPageSize;
      await req(meta.put(progress, badgeAuditKey));
      return progress.complete;
    });
    auditComplete = complete;
    return complete;
  }
  async function prune(tx, cap) {
    if (cap === null) return;
    const store = tx.objectStore("events");
    const n = await req(store.count());
    let remove = n - cap;
    if (remove <= 0) return;
    await new Promise((resolve, reject) => {
      const cursor = store.openCursor();
      cursor.onerror = () => reject(cursor.error);
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (!c || remove <= 0) return resolve();
        c.delete();
        remove--;
        c.continue();
      };
    });
  }
  async function list(
    store,
    { page = 1, pageSize = 40, index, attemptId } = {},
  ) {
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    )
      throw fail(
        "INVALID_PAGE",
        "Page must be positive and page size between 1 and 100.",
      );
    return run([store], "readonly", async (tx) => {
      let s = tx.objectStore(store);
      if (index) s = s.index(index);
      if (attemptId) s = s.index("attemptId");
      const range = attemptId ? IDBKeyRange.only(attemptId) : null;
      const total = await req(s.count(range));
      const items = [];
      const offset = (page - 1) * pageSize;
      if (!Number.isSafeInteger(offset))
        throw fail("INVALID_PAGE", "Page is too large.");
      if (offset < total)
        await new Promise((resolve, reject) => {
          let skipped = false;
          const r = s.openCursor(range, "prev");
          r.onerror = () => reject(r.error);
          r.onsuccess = () => {
            const c = r.result;
            if (!c || items.length >= pageSize) return resolve();
            if (offset && !skipped) {
              skipped = true;
              c.advance(offset);
              return;
            }
            items.push(c.value);
            c.continue();
          };
        });
      return {
        items,
        total,
        page,
        pageSize,
        pages: Math.max(1, Math.ceil(total / pageSize)),
      };
    });
  }
  return {
    close: () => db.close(),
    settings,
    updateSettings: async (input) => {
      validateSettings(input);
      return run(["meta", "events"], "readwrite", async (tx) => {
        const s = {
          ...DEFAULTS,
          ...(await req(tx.objectStore("meta").get("settings"))),
          ...input,
        };
        await req(tx.objectStore("meta").put(s, "settings"));
        await prune(tx, s.diagnosticsCap);
        return s;
      });
    },
    latestOutcome: (provider) => run(["attempts"], "readonly", (tx) => {
      const range = IDBKeyRange.bound([provider, ""], [provider, "\uffff"]);
      const index = tx.objectStore("attempts").index("providerCreatedAt");
      return new Promise((resolve, reject) => {
        const request = index.openCursor(range, "prev");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return resolve(null);
          if (TERMINAL.has(cursor.value.state)) return resolve(projectOutcome(cursor.value));
          cursor.continue();
        };
      });
    }),
    getAttempt: (id) => read("attempts", id),
    begin: (attempt) =>
      run(["attempts", "ledger"], "readwrite", async (tx) => {
        const existing = await req(tx.objectStore("attempts").get(attempt.id));
        if (existing) {
          if (existing.requestHash !== attempt.requestHash)
            throw fail(
              "IDEMPOTENCY_CONFLICT",
              "This request ID belongs to a different save.",
              "Use a new request ID for a new save.",
            );
          return { created: false, attempt: existing };
        }
        if (await req(tx.objectStore("ledger").get(attempt.id)))
          throw fail(
            "ALREADY_COMPLETED",
            "This save already completed; its History record was deleted.",
            "Use a new request ID for a new save.",
          );
        await req(tx.objectStore("attempts").add(attempt));
        return { created: true, attempt };
      }),
    patch: (id, patch) =>
      run(["attempts"], "readwrite", async (tx) => {
        const s = tx.objectStore("attempts");
        const a = await req(s.get(id));
        if (!a) throw fail("ATTEMPT_NOT_FOUND", "Save attempt not found.");
        if (TERMINAL.has(a.state)) return a;
        const next = {
          ...a,
          ...patch,
          id,
          updatedAt: new Date().toISOString(),
        };
        await req(s.put(next));
        return next;
      }),
    disableRetry: (id,retryAttemptId)=>run(["attempts"],"readwrite",async tx=>{
      const store=tx.objectStore("attempts"),row=await req(store.get(id));
      if(!row||!["CANCELLED","FAILED"].includes(row.state))return row;
      const next={...row,retryable:false,...(retryAttemptId?{retryAttemptId}:{})};
      await req(store.put(next));
      return next;
    }),
    finish: async (id, patch, onVerified) => {
      const {attempt, firstVerified} = await run(["attempts", "ledger", "meta"], "readwrite", async (tx) => {
        const s = tx.objectStore("attempts"),
          a = await req(s.get(id));
        if (!a) throw fail("ATTEMPT_NOT_FOUND", "Save attempt not found.");
        if (TERMINAL.has(a.state)) return {attempt:a};
        if (!TERMINAL.has(patch.state))
          throw fail("INVALID_TRANSITION", "A terminal outcome is required.");
        if (
          patch.state === "SAVED" &&
          (!patch.objectId || patch.confirmed !== true)
        )
          throw fail(
            "CONFIRMATION_REQUIRED",
            "Provider confirmation is required.",
          );
        const next = {
          ...a,
          ...patch,
          id,
          updatedAt: new Date().toISOString(),
        };
        let firstVerified = false;
        if (next.state === "SAVED") {
          const ledger = tx.objectStore("ledger"),
            meta = tx.objectStore("meta");
          if (!(await req(ledger.get(id)))) {
            next.badgeVerifiedAt = Date.parse(next.updatedAt);
            await req(
              ledger.add({
                id,
                provider: a.provider,
                objectId: patch.objectId,
                verifiedAt: next.badgeVerifiedAt,
                badgeIndexed: true,
              }),
            );
            const count = (await req(meta.get("count"))) || 0;
            await req(meta.put(count + 1, "count"));
            await addBadgeCount(meta, next.badgeVerifiedAt);
            firstVerified = true;
          }
        }
        await req(s.put(next));
        return {attempt:next, firstVerified};
      });
      if (firstVerified && onVerified) {
        try { void Promise.resolve(onVerified(attempt)).catch(() => {}); } catch {}
      }
      return attempt;
    },
    noteDiagnosticsWarning: (id) =>
      run(["attempts"], "readwrite", async (tx) => {
        const s = tx.objectStore("attempts"),
          a = await req(s.get(id));
        if (a)
          await req(
            s.put({
              ...a,
              diagnosticsWarning: "DIAGNOSTICS_STORAGE_UNAVAILABLE",
            }),
          );
      }),
    counter: async () => ({ count: (await read("meta", "count")) || 0 }),
    async verifiedCount({start, end}) {
      const complete = await auditBadge();
      const range = IDBKeyRange.bound([badgeMinute, Math.ceil(start / 60_000)],
        [badgeMinute, Math.ceil(end / 60_000)], false, true);
      const totals = await run(["meta"], "readonly", tx => req(tx.objectStore("meta").getAll(range)));
      return {count:totals.reduce((sum, value) => sum + value, 0), complete};
    },
    historySource: cursor => run(["attempts"], "readonly", tx => new Promise((resolve, reject) => {
      const rows = [];
      const read = tx.objectStore("attempts").openCursor(cursor ? IDBKeyRange.lowerBound(cursor,true) : null);
      read.onerror = () => reject(read.error);
      read.onsuccess = () => {
        const item = read.result;
        if (!item || rows.length === 100) return resolve({rows,next:item ? rows.at(-1).id : null});
        rows.push(item.value);
        item.continue();
      };
    })),
    historyList: async (input) =>
      list("attempts", {
        pageSize: (await settings()).pageSize,
        ...input,
        index: "createdAt",
      }),
    historyDelete: (id) =>
      run(["attempts", "ledger"], "readwrite", async (tx) => {
        const s = tx.objectStore("attempts");
        const a = await req(s.get(id));
        if (a && !TERMINAL.has(a.state))
          throw fail("ATTEMPT_ACTIVE", "Wait until the save finishes.");
        await retainLegacyDate(tx.objectStore("ledger"), a);
        await req(s.delete(id));
        return { deleted: !!a };
      }),
    historyClear: () =>
      run(["attempts", "ledger"], "readwrite", async (tx) => {
        const s = tx.objectStore("attempts");
        let deleted = 0;
        await new Promise((resolve, reject) => {
          const r = s.openCursor();
          r.onerror = () => reject(r.error);
          r.onsuccess = async () => {
            const c = r.result;
            if (!c) return resolve();
            try {
              if (TERMINAL.has(c.value.state)) {
                await retainLegacyDate(tx.objectStore("ledger"), c.value);
                c.delete();
                deleted++;
              }
              c.continue();
            } catch (error) {
              reject(error);
            }
          };
        });
        return { deleted };
      }),
    event: (event) =>
      run(["events", "meta"], "readwrite", async (tx) => {
        const s = {
          ...DEFAULTS,
          ...(await req(tx.objectStore("meta").get("settings"))),
        };
        if (!s.diagnosticsEnabled) return { recorded: false };
        await req(tx.objectStore("events").add(event));
        await prune(tx, s.diagnosticsCap);
        return { recorded: true };
      }),
    diagnosticsList: (input) => list("events", input),
    diagnosticsForAttempt: (id, input) =>
      list("events", { ...input, attemptId: id }),
    diagnosticsClear: () =>
      run(["events"], "readwrite", async (tx) => {
        await req(tx.objectStore("events").clear());
        return { cleared: true };
      }),
    // Keyset pages for export: bounded reads; never collect unlimited logs in RAM.
    eventChunk: (after = 0, limit = 100, upper = Infinity) =>
      run(
        ["events"],
        "readonly",
        (tx) =>
          new Promise((resolve, reject) => {
            const items = [];
            const r = tx
              .objectStore("events")
              .openCursor(IDBKeyRange.lowerBound(after, true));
            r.onerror = () => reject(r.error);
            r.onsuccess = () => {
              const c = r.result;
              if (!c || c.key > upper || items.length >= limit)
                return resolve(items);
              items.push(c.value);
              c.continue();
            };
          }),
      ),
    eventLastId: () =>
      run(
        ["events"],
        "readonly",
        (tx) =>
          new Promise((resolve, reject) => {
            const r = tx.objectStore("events").openCursor(null, "prev");
            r.onerror = () => reject(r.error);
            r.onsuccess = () => resolve(r.result?.key || 0);
          }),
      ),
    recover: (signal) =>
      run(["attempts"], "readwrite", async (tx) => {
        let count = 0;
        const index = tx.objectStore("attempts").index("state");
        for (const state of [
          "RECEIVED",
          "AUTH_CHECK",
          "SOURCE_CHECK",
          "UPLOADING",
          "CONFIRMING",
          ...WAITING,
        ]) {
          await new Promise((resolve, reject) => {
            const r = index.openCursor(IDBKeyRange.only(state));
            r.onerror = () => reject(r.error);
            r.onsuccess = () => {
              const c = r.result;
              if (!c) return resolve();
              if (WAITING.has(state)) {
                if (pendingExpired({expiresAt: c.value.resumeUntil}, Date.now()))
                  c.update({...c.value, state: "FAILED", code: "PENDING_SAVE_EXPIRED", resumeUntil: undefined,
                    message: "The pending save expired before any cloud write.",
                    nextAction: "Start a fresh save from the original item.", updatedAt: new Date().toISOString()});
                c.continue();
                return;
              }
              c.update({
                ...c.value,
                state: "UNCERTAIN",
                code: "WORKER_INTERRUPTED",
                message: "The worker stopped before an outcome was recorded.",
                nextAction:
                  "Check the provider for the file before retrying; no automatic replay.",
                updatedAt: new Date().toISOString(),
              });
              count++;
              c.continue();
            };
          });
        }
        return { interrupted: count };
      }, signal),
  };
}
