import {normalizePrefix, normalizeTarget, targetKey} from '../core/menu-identity.mjs';

// Rebuildable directory metadata has a separate lifetime and upgrade path from
// CURRENT, its recovery journal, and saved destinations. This DB is opened lazily.
const DB_VERSION = 1;
const STORES = ['directories', 'entries'];
const PAGE_LIMIT = 2000;
const READ_BATCH = 2048;
const utf8 = new TextEncoder();
const scopeFields = ['provider', 'connectionId', 'accountId', 'bucketName', 'authorityStamp'];
const entryFields = ['etag', 'version', 'uploaded', 'contentType'];
const error = code => Object.assign(new Error(code), {code});
const integer = value => Number.isSafeInteger(value) && value >= 0;

function directoryScope(source) {
  const target = normalizeTarget(source);
  if (source.authorityStamp === undefined) return target;
  if (typeof source.authorityStamp !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(source.authorityStamp)) {
    throw error('INVENTORY_INVALID_SCOPE');
  }
  return {...target, authorityStamp:source.authorityStamp};
}

export function directoryScopeKey(source) {
  const scope = directoryScope(source);
  return scope.authorityStamp === undefined
    ? targetKey(scope)
    : JSON.stringify([...JSON.parse(targetKey(scope)), scope.authorityStamp]);
}

// Fold canonical equivalents and case deterministically without changing keys.
export const normalizeDirectoryName = value => value.normalize('NFC').toLowerCase().replaceAll('ς', 'σ').normalize('NFC');

function basename(key, folder, parentPrefix) {
  if (typeof key !== 'string' || !key.startsWith(parentPrefix) || key.endsWith('/') !== folder) return null;
  const name = key.slice(parentPrefix.length, folder ? -1 : undefined);
  return name && !name.includes('/') && !name.includes('\0') ? name : null;
}

export function directoryInventoryEntry(source, row) {
  if (typeof row?.folder !== 'boolean') return null;
  const key = row.key, parentPrefix = source.prefix;
  const displayName = basename(key, row.folder, parentPrefix);
  if (!displayName || utf8.encode(key).length > 1024) return null;
  const entry = {key, folder:row.folder, displayName, parentPrefix};
  if (integer(row.size)) entry.size = row.size;
  for (const field of entryFields) if (typeof row[field] === 'string' && row[field].length <= 512) entry[field] = row[field];
  return entry;
}

const request = operation => new Promise((resolve, reject) => {
  operation.onsuccess = () => resolve(operation.result);
  operation.onerror = () => reject(operation.error);
});

const transactionDone = tx => new Promise((resolve, reject) => {
  tx.oncomplete = resolve;
  tx.onabort = () => reject(tx.error ?? new DOMException('Inventory transaction aborted', 'AbortError'));
});

function snapshotValid(value, working) {
  return value === null || (
    value && typeof value.generation === 'string' && value.generation &&
    typeof value.cursor === 'string' && typeof value.complete === 'boolean' &&
    ['count', 'bytes', 'startedAt', 'fetchedAt', 'validatedAt', 'expiresAt'].every(field => integer(value[field])) &&
    (value.complete ? !value.cursor && value.validatedAt >= value.fetchedAt : !value.expiresAt) &&
    (!working || (!value.complete && integer(value.leaseUntil) &&
      (value.lease === null || typeof value.lease === 'string')))
  );
}

function validatedManifest(value, key) {
  if (value === undefined) return null;
  try {
    if (value.key === key && directoryScopeKey(value.scope) === key &&
        typeof value.revision === 'string' && value.revision && integer(value.lastAccess) &&
        snapshotValid(value.working, true) && snapshotValid(value.published, false) &&
        (!value.working || value.working.generation !== value.published?.generation)) return value;
  } catch { /* A malformed derived record can be rebuilt from the provider. */ }
  throw error('INVENTORY_CORRUPT');
}

const snapshotBytes = directory => (directory.published?.bytes ?? 0) + (directory.working?.bytes ?? 0);
const snapshotCount = directory => (directory.published?.count ?? 0) + (directory.working?.count ?? 0);

function asStale(snapshot) {
  if (!snapshot) return null;
  const {lease, leaseUntil, ...retained} = snapshot;
  return {...retained, expiresAt:0};
}

export function createDirectoryInventoryStore({
  indexedDB = globalThis.indexedDB, keyRange = globalThis.IDBKeyRange,
  dbName = 'click2cloud-filename-inventory', clock = Date.now,
  ttlMs = 60000, maxScopes = 256, maxEntries = 250000,
  maxDirectoryEntries = 100000, maxBytes = 64 * 1024 * 1024
} = {}) {
  let opening;
  const now = () => Math.max(0, Math.floor(clock()));

  function open() {
    if (opening) return opening;
    const pending = new Promise((resolve, reject) => {
      if (!indexedDB || !keyRange) {reject(error('INVENTORY_UNAVAILABLE')); return;}
      let operation, abandoned = false;
      try {operation = indexedDB.open(dbName, DB_VERSION);}
      catch {reject(error('INVENTORY_UNAVAILABLE')); return;}
      const stop = () => {clearTimeout(timer); abandoned = true; reject(error('INVENTORY_UNAVAILABLE'));};
      const timer = setTimeout(stop, 1500);
      operation.onupgradeneeded = event => {
        if (abandoned) {operation.transaction.abort(); return;}
        if (event.oldVersion < 1) {
          const db = operation.result;
          db.createObjectStore('directories', {keyPath:'key'});
          // Match against the compact primary keys; only clone full rows for
          // the selected matches. Ordinals are stable as a scan adds pages.
          const entries = db.createObjectStore('entries', {keyPath:['scope', 'generation', 'ordinal', 'normalizedName', 'key']});
          entries.createIndex('byObject', ['scope', 'generation', 'key'], {unique:true});
          entries.createIndex('byName', ['scope', 'generation', 'normalizedName', 'key'], {unique:true});
        }
      };
      operation.onerror = stop;
      operation.onblocked = stop;
      operation.onsuccess = () => {
        clearTimeout(timer);
        const db = operation.result;
        if (abandoned) {db.close(); return;}
        db.onversionchange = () => {
          db.close();
          if (opening === pending) opening = undefined;
        };
        db.onclose = () => {if (opening === pending) opening = undefined;};
        resolve(db);
      };
    });
    opening = pending;
    pending.catch(() => {if (opening === pending) opening = undefined;});
    return pending;
  }

  async function transact(mode, operation) {
    const pending = open(), db = await pending;
    let tx;
    try {
      tx = db.transaction(STORES, mode, mode === 'readwrite' ? {durability:'strict'} : undefined);
    } catch (cause) {
      if (cause.name === 'InvalidStateError' && opening === pending) opening = undefined;
      throw cause;
    }
    const finished = transactionDone(tx);
    finished.catch(() => {});
    try {
      const result = await operation(tx.objectStore('directories'), tx.objectStore('entries'));
      await finished;
      return result;
    } catch (cause) {
      try {tx.abort();} catch {}
      const aborted = await finished.catch(error => error);
      if (cause.name === 'TransactionInactiveError' && aborted) throw aborted;
      throw cause;
    }
  }

  const scopeRange = key => keyRange.bound([key], [key, []], false, true);
  const generationRange = (key, generation) => keyRange.bound([key, generation], [key, generation, []], false, true);
  function remove(directories, entries, key) {
    entries.delete(scopeRange(key));
    directories.delete(key);
  }

  async function discardCorrupt(key, revision) {
    await transact('readwrite', async (directories, entries) => {
      const current = await request(directories.get(key));
      if (current && current.revision === revision) remove(directories, entries, key);
    }).catch(() => {});
  }

  async function manifest(source) {
    const key = directoryScopeKey(source);
    const raw = await transact('readonly', directories => request(directories.get(key)));
    try {return validatedManifest(raw, key);}
    catch (cause) {
      await discardCorrupt(key, raw?.revision);
      throw cause;
    }
  }

  // Oldest validated directories leave first; an active writer keeps its
  // reservation until it commits, goes idle, or can be reclaimed.
  async function evictionCandidates(directories, entries, key, at) {
    const others = [];
    for (const raw of await request(directories.getAll())) {
      if (raw.key === key) continue;
      try {others.push(validatedManifest(raw, raw.key));}
      catch {remove(directories, entries, raw.key);}
    }
    others.sort((a, b) => a.lastAccess - b.lastAccess);
    return {others, candidates:others.filter(directory => !(directory.working?.leaseUntil > at))};
  }

  async function enforceBudget(directories, entries, next, at) {
    if (next.published && next.working && (snapshotCount(next) > maxEntries || snapshotBytes(next) > maxBytes)) {
      // A directory can fit its new snapshot without keeping two copies while refreshing.
      entries.delete(generationRange(next.key, next.published.generation));
      next.published = null;
    }
    if (snapshotCount(next) > maxEntries || snapshotBytes(next) > maxBytes) throw error('INVENTORY_CAPACITY');
    const {others, candidates} = await evictionCandidates(directories, entries, next.key, at);
    let scopes = others.length + 1,
      count = others.reduce((total, row) => total + snapshotCount(row), snapshotCount(next)),
      bytes = others.reduce((total, row) => total + snapshotBytes(row), snapshotBytes(next));
    while (scopes > maxScopes || count > maxEntries || bytes > maxBytes) {
      const victim = candidates.shift();
      if (!victim) throw error('INVENTORY_CAPACITY');
      remove(directories, entries, victim.key);
      scopes--;
      count -= snapshotCount(victim);
      bytes -= snapshotBytes(victim);
    }
  }

  async function evictForQuota(key) {
    return transact('readwrite', async (directories, entries) => {
      const {candidates} = await evictionCandidates(directories, entries, key, now());
      if (!candidates.length) return false;
      remove(directories, entries, candidates[0].key);
      return true;
    });
  }

  async function begin(source, {expectedRevision, leaseMs = 15000, restart = false} = {}) {
    const scope = directoryScope(source), key = directoryScopeKey(scope);
    return transact('readwrite', async (directories, entries) => {
      const prior = validatedManifest(await request(directories.get(key)), key), at = now();
      if (expectedRevision !== undefined && (prior?.revision ?? null) !== expectedRevision ||
          prior?.working?.leaseUntil > at) return {manifest:prior, acquired:false};
      const resumable = !restart && prior?.working;
      const working = {
        ...(resumable || {
          generation:crypto.randomUUID(), cursor:'', complete:false, count:0, bytes:0,
          startedAt:at, fetchedAt:0, validatedAt:0, expiresAt:0
        }),
        lease:crypto.randomUUID(), leaseUntil:at + leaseMs
      };
      let published = prior?.published ?? null;
      if (!resumable && prior?.working) {
        if (!published && prior.working.count) published = asStale(prior.working);
        else entries.delete(generationRange(key, prior.working.generation));
      }
      const next = {key, scope, revision:crypto.randomUUID(), published, working, lastAccess:at};
      await enforceBudget(directories, entries, next, at);
      directories.put(next);
      return {manifest:next, acquired:true};
    });
  }

  async function ingest(source, generation, {lease, cursor = '', entries:rows, nextCursor = '', leaseMs = 15000}) {
    const scope = directoryScope(source), key = directoryScopeKey(scope);
    if (!Array.isArray(rows) || rows.length > PAGE_LIMIT || typeof cursor !== 'string' ||
        typeof nextCursor !== 'string' || (cursor && cursor === nextCursor)) throw error('INVENTORY_INVALID_PAGE');
    const prepared = new Map();
    for (const row of rows) {
      const entry = directoryInventoryEntry(scope, row);
      if (entry) prepared.set(entry.key, entry);
    }
    const write = () => transact('readwrite', async (directories, entries) => {
      const prior = validatedManifest(await request(directories.get(key)), key);
      const current = prior?.working;
      if (!current || current.generation !== generation || !lease || current.lease !== lease || current.cursor !== cursor) return null;
      const at = now(), page = [...prepared.values()];
      const keys = await Promise.all(page.map(entry => request(entries.index('byObject').getKey([key, generation, entry.key]))));
      const added = page.filter((_, i) => keys[i] === undefined);
      if (current.count + added.length > maxDirectoryEntries) throw error('INVENTORY_CAPACITY');
      let bytes = current.bytes, ordinal = current.count;
      for (const entry of added) {
        const normalizedName = normalizeDirectoryName(entry.displayName);
        const row = {scope:key, generation, key:entry.key, ordinal:++ordinal, normalizedName, entry};
        // Include approximate UTF-16 payload and compound index/key overhead.
        bytes += 2 * (JSON.stringify(row).length + 3 * (key.length + generation.length) + 2 * entry.key.length + normalizedName.length) + 128;
        entries.add(row);
      }
      const complete = !nextCursor;
      const built = {
        ...current, cursor:nextCursor, complete, count:ordinal, bytes, fetchedAt:at,
        validatedAt:complete ? at : 0, expiresAt:complete ? at + ttlMs : 0, leaseUntil:at + leaseMs
      };
      if (complete && prior.published) entries.delete(generationRange(key, prior.published.generation));
      const next = {
        ...prior, revision:crypto.randomUUID(), lastAccess:at,
        published:complete ? (({lease, leaseUntil, ...snapshot}) => snapshot)(built) : prior.published,
        working:complete ? null : built
      };
      await enforceBudget(directories, entries, next, at);
      directories.put(next);
      return next;
    });
    try {return await write();}
    catch (cause) {
      if (cause.name !== 'QuotaExceededError' || !await evictForQuota(key).catch(() => false)) throw cause;
      return write();
    }
  }

  async function release(source, generation, {lease} = {}) {
    const key = directoryScopeKey(source);
    return transact('readwrite', async directories => {
      const prior = validatedManifest(await request(directories.get(key)), key);
      if (!prior?.working || !lease || prior.working.generation !== generation || prior.working.lease !== lease) return null;
      const next = {...prior, revision:crypto.randomUUID(), working:{...prior.working, lease:null, leaseUntil:0}};
      directories.put(next);
      return next;
    });
  }

  async function query(source, generation, {needle, after = null, limit = 100, signal} = {}) {
    const scope = directoryScope(source), key = directoryScopeKey(scope);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500 ||
        !(after === null || integer(after)) || typeof needle !== 'string') throw error('INVENTORY_INVALID_QUERY');
    let revision;
    try {
      return await transact('readonly', async (directories, entries) => {
        signal?.throwIfAborted();
        const raw = await request(directories.get(key));
        revision = raw?.revision;
        const manifest = validatedManifest(raw, key);
        const snapshot = [manifest?.published, manifest?.working].find(item => item?.generation === generation);
        if (!snapshot || (after ?? 0) > snapshot.count) throw error('INVENTORY_GENERATION_CHANGED');
        const matches = [];
        let ordinal = after ?? 0, lastMatch = null;
        const readMatches = async after => {
          const stored = await Promise.all(matches.map(key => request(entries.get(key))));
          const results = stored.map((row, i) => {
            const entry = directoryInventoryEntry(scope, row?.entry);
            if (!entry || entry.key !== matches[i][4]) throw error('INVENTORY_CORRUPT');
            return entry;
          });
          return {entries:results, after, manifest};
        };
        while (ordinal <= snapshot.count) {
          signal?.throwIfAborted();
          const range = keyRange.bound([key, generation, ordinal, []], [key, generation, []], true, true);
          const keys = await request(entries.getAllKeys(range, READ_BATCH));
          if (!keys.length) {
            if (ordinal < snapshot.count) throw error('INVENTORY_CORRUPT');
            break;
          }
          for (const entryKey of keys) {
            const [entryScope, entryGeneration, entryOrdinal, normalizedName, objectKey] = entryKey;
            const name = typeof objectKey === 'string' && basename(objectKey, objectKey.endsWith('/'), scope.prefix);
            if (entryOrdinal !== ++ordinal || ordinal > snapshot.count || !name || entryScope !== key ||
                entryGeneration !== generation || normalizedName !== normalizeDirectoryName(name)) throw error('INVENTORY_CORRUPT');
            if (!normalizedName.includes(needle)) continue;
            if (matches.length === limit) return readMatches(lastMatch);
            matches.push(entryKey);
            lastMatch = ordinal;
          }
          if (keys.length < READ_BATCH) {
            if (ordinal !== snapshot.count) throw error('INVENTORY_CORRUPT');
            break;
          }
        }
        return readMatches(null);
      });
    } catch (cause) {
      if (cause.code === 'INVENTORY_CORRUPT') await discardCorrupt(key, revision);
      throw cause;
    }
  }

  async function invalidate(criteria = {}, {purge = false} = {}) {
    const rules = (Array.isArray(criteria) ? criteria : [criteria]).map(rule => ({
      ...rule, prefix:rule.prefix === undefined ? undefined : normalizePrefix(rule.prefix)
    }));
    if (!rules.length) return 0;
    return transact('readwrite', async (directories, entries) => {
      const rows = await request(directories.getAll());
      let affected = 0;
      for (const raw of rows) {
        let prior;
        try {prior = validatedManifest(raw, raw.key);}
        catch {remove(directories, entries, raw.key); continue;}
        const matches = rules.some(rule => scopeFields.every(field => rule[field] === undefined || rule[field] === prior.scope[field]) &&
          (rule.prefix === undefined || (rule.recursive ? prior.scope.prefix.startsWith(rule.prefix) : prior.scope.prefix === rule.prefix)));
        if (!matches) continue;
        affected++;
        if (purge) {remove(directories, entries, prior.key); continue;}
        if (prior.working && prior.published) entries.delete(generationRange(prior.key, prior.working.generation));
        const published = asStale(prior.published ?? prior.working);
        directories.put({...prior, revision:crypto.randomUUID(), published, working:null});
      }
      return affected;
    });
  }

  return Object.freeze({
    manifest, begin, ingest, release, query, invalidate,
    async close() {
      const pending = opening;
      opening = undefined;
      (await pending?.catch(() => null))?.close();
    }
  });
}
