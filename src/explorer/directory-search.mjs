import {normalizeTarget} from '../core/menu-identity.mjs';
import {directoryInventoryEntry, directoryScopeKey, normalizeDirectoryName} from './directory-inventory-store.mjs';
import {createListingReader} from './listing-view.mjs';

const fail = code => Object.assign(new Error(code), {code});
const scopeFields = ['provider', 'connectionId', 'accountId', 'bucketName', 'authorityStamp'];
const accessFailures = new Set([
  'AUTH_REQUIRED', 'REAUTH_REQUIRED', 'TOKEN_EXPIRED', 'AUTH_SESSION_CHANGED', 'AUTHORIZATION_REVOKED',
  'AUTHORIZATION_DENIED', 'AUTHORIZATION_LOST', 'OAUTH_IDENTITY_UNVERIFIED', 'PROVIDER_AUTH_POLICY_DENIED',
  'INSUFFICIENT_SCOPE', 'SCOPE_UNAUTHORIZED', 'PERMISSION_DENIED', 'HTTP_401', 'HTTP_403', 'HTTP_404'
]);
const appliesTo = (scope, criteria) => scopeFields.every(field => criteria[field] === undefined || criteria[field] === scope[field]) &&
  (criteria.prefix === undefined || (criteria.recursive ? scope.prefix.startsWith(criteria.prefix) : scope.prefix === criteria.prefix));
const snapshotFor = (manifest, generation) => [manifest?.working, manifest?.published].find(snapshot => snapshot && snapshot.generation === generation);
const isFresh = (snapshot, now) => snapshot?.complete === true && snapshot.validatedAt <= now && snapshot.expiresAt > now;

function readToken(value, needle) {
  try {
    if (typeof value !== 'string' || value.length > 8192) throw fail('SEARCH_CURSOR_INVALID');
    const token = JSON.parse(value);
    if (token?.v === 1 && token.needle === needle && typeof token.generation === 'string' &&
        (token.after === null || Number.isSafeInteger(token.after) && token.after >= 0) &&
        ['matches', 'scan', 'transient'].includes(token.phase)) return token;
  } catch { /* Other API cursors and malformed tokens are invalid here. */ }
  throw fail('SEARCH_CURSOR_INVALID');
}

function result(entries = [], options = {}) {
  return {entries, nextPageToken:null, complete:false, source:'cache', asOf:null, stale:true, refreshing:false, ...options};
}

// A single background reader supplies ordinary List and the inventory's provider
// pages. Its short page cache shapes traffic, while only the durable manifest
// decides whether the whole directory may answer a search without provider reads.
export function createDirectorySearch({
  store, readPage, authorize, isPending = () => false, clock = Date.now,
  maxRemotePages = 32, maxScanMs = 20000, maxScanAgeMs = 30 * 60 * 1000,
  maxActiveScans = 8, listingOptions
}) {
  const pages = createListingReader(({source}, cursor, signal) => readPage(source, cursor, {signal}), {clock, ...listingOptions});
  const scans = new Map(), active = new Set(), transient = new Map(), invalidations = new Map();
  const leaseMs = Math.max(15000, maxScanMs + 5000);

  async function bind(source) {
    const target = normalizeTarget(source), authorityStamp = await authorize(target);
    const scope = {...target, authorityStamp};
    return {source:target, scope, authorityStamp, key:directoryScopeKey(scope)};
  }

  async function assertAuthority(binding, signal) {
    signal?.throwIfAborted();
    if (await authorize(binding.source) !== binding.authorityStamp) throw fail('AUTH_SESSION_CHANGED');
    signal?.throwIfAborted();
  }

  async function providerPage(binding, cursor, fresh, signal) {
    const page = await pages.page({source:binding.source, authorityStamp:binding.authorityStamp}, cursor, fresh, signal);
    if (typeof page.cursor !== 'string' && page.cursor !== undefined || cursor && cursor === page.cursor) throw fail('SEARCH_INVALID_LISTING');
    return {...page, cursor:page.cursor ?? ''};
  }

  async function listingPage(source, cursor = '', {fresh = false, signal} = {}) {
    const binding = await bind(source);
    signal?.throwIfAborted();
    const page = await providerPage(binding, cursor, fresh || isPending(binding.source), signal);
    await assertAuthority(binding, signal);
    return page;
  }

  function persistInvalidation(item) {
    item.failed = false;
    item.task = Promise.resolve().then(() => store.invalidate(item.criteria, {purge:item.purge}));
    item.task.then(() => {
      if (invalidations.get(item.key) === item) invalidations.delete(item.key);
    }, () => {item.failed = true;});
    return item.task;
  }

  async function makeInventoryCurrent(scope) {
    const mutations = [...invalidations.values()].filter(item => item.criteria.some(rule => appliesTo(scope, rule)));
    if (!mutations.length) return;
    let timer;
    try {
      await Promise.race([
        Promise.all(mutations.map(item => item.failed ? persistInvalidation(item) : item.task)),
        new Promise((_, reject) => {timer = setTimeout(() => reject(fail('SEARCH_CACHE_UNAVAILABLE')), 250);})
      ]);
    } finally {clearTimeout(timer);}
  }

  function invalidate(criteria = {}, {purge = false} = {}) {
    const rules = (Array.isArray(criteria) ? criteria : [criteria]).map(rule => ({...rule}));
    if (!rules.length) return Promise.resolve(0);
    const affected = scope => rules.some(rule => appliesTo(scope, rule));
    pages.invalidate();
    for (const task of active) if (affected(task.scope)) task.controller.abort(fail('SEARCH_SUPERSEDED'));
    for (const [key, saved] of transient) if (affected(saved.scope)) transient.delete(key);
    const key = JSON.stringify(rules.map(rule => [...scopeFields, 'prefix', 'recursive'].map(field => rule[field] ?? null)));
    const item = {key, criteria:rules, purge};
    invalidations.set(key, item);
    return persistInvalidation(item);
  }

  async function scan(binding, manifest, restart, signal) {
    const {scope, source} = binding;
    if (isPending(source)) return {manifest, code:'SEARCH_PENDING_MUTATION', pending:true};
    const acquisition = await store.begin(scope, {expectedRevision:manifest?.revision ?? null, restart, leaseMs});
    manifest = acquisition.manifest;
    if (!acquisition.acquired) return {manifest, ...(manifest?.working ? {code:'SEARCH_REVALIDATING'} : {})};
    const {generation, lease} = manifest.working;
    const deadline = AbortSignal.timeout(maxScanMs), pageSignal = AbortSignal.any([signal, deadline]);
    const visited = new Set();
    let scanned = 0, code, offline = false, fallback = false;
    try {
      while (manifest.working && scanned < maxRemotePages && !deadline.aborted) {
        await assertAuthority(binding, signal);
        if (isPending(source)) {code = 'SEARCH_PENDING_MUTATION'; break;}
        const {cursor} = manifest.working;
        if (visited.has(cursor)) {code = 'SEARCH_INVALID_LISTING'; offline = true; break;}
        visited.add(cursor);
        let page;
        try {page = await providerPage(binding, cursor, restart, pageSignal);}
        catch (cause) {
          signal.throwIfAborted();
          if (accessFailures.has(cause.code)) throw fail(cause.code);
          code = deadline.aborted ? 'SEARCH_SCAN_LIMIT' : cause.code === 'SEARCH_INVALID_LISTING' ? cause.code : 'SEARCH_PROVIDER_UNAVAILABLE';
          offline = !deadline.aborted;
          break;
        }
        await assertAuthority(binding, signal);
        if (isPending(source)) {code = 'SEARCH_PENDING_MUTATION'; break;}
        try {
          const next = await store.ingest(scope, generation, {lease, cursor, entries:page.entries, nextCursor:page.cursor, leaseMs});
          if (!next) throw fail('SEARCH_SUPERSEDED');
          manifest = next;
          scanned++;
        } catch (cause) {
          if (cause.code === 'SEARCH_SUPERSEDED') throw cause;
          code = cause.code === 'INVENTORY_CAPACITY' ? cause.code : 'SEARCH_CACHE_UNAVAILABLE';
          fallback = true;
          break;
        }
      }
      if (manifest.working && !code) code = 'SEARCH_SCAN_LIMIT';
    } finally {
      if (manifest.working) manifest = await store.release(scope, generation, {lease}).catch(() => null) ?? manifest;
    }
    return {manifest, scanned, code, offline, fallback, pending:code === 'SEARCH_PENDING_MUTATION'};
  }

  function coalescedScan(binding, manifest, restart, signal) {
    let flight = scans.get(binding.key);
    if (!flight || flight.controller.signal.aborted) {
      if (scans.size >= maxActiveScans && !flight) return Promise.resolve({manifest, code:'SEARCH_REVALIDATING'});
      const controller = new AbortController();
      flight = {controller, waiters:0};
      flight.task = scan(binding, manifest, restart, controller.signal);
      const current = flight;
      scans.set(binding.key, flight);
      flight.task.finally(() => {if (scans.get(binding.key) === current) scans.delete(binding.key);}).catch(() => {});
    }
    flight.waiters++;
    return new Promise((resolve, reject) => {
      let done = false;
      function finish(callback, value) {
        if (done) return;
        done = true;
        flight.waiters--;
        signal.removeEventListener('abort', abort);
        callback(value);
      }
      function abort() {
        finish(reject, signal.reason);
        if (!flight.waiters) flight.controller.abort(signal.reason);
      }
      signal.addEventListener('abort', abort, {once:true});
      if (signal.aborted) abort();
      flight.task.then(value => finish(resolve, value), cause => finish(reject, cause));
    });
  }

  function transientToken(binding, needle, position) {
    const generation = crypto.randomUUID();
    transient.set(generation, {...position, scope:binding.scope, key:binding.key, needle, expires:clock() + 60000});
    while (transient.size > 32) transient.delete(transient.keys().next().value);
    return JSON.stringify({v:1, generation, phase:'transient', after:null, needle});
  }

  async function uncached(binding, needle, limit, position, fresh, signal) {
    let {cursor = '', offset = 0, asOf = clock(), code = 'SEARCH_CACHE_UNAVAILABLE'} = position;
    const entries = [], seen = new Set(), visited = new Set();
    const deadline = AbortSignal.timeout(maxScanMs), pageSignal = AbortSignal.any([signal, deadline]);
    let stopped = null;
    const more = () => transientToken(binding, needle, {cursor, offset, asOf, code});
    for (let count = 0; count < maxRemotePages && !deadline.aborted; count++) {
      signal.throwIfAborted();
      if (isPending(binding.source)) {stopped = 'SEARCH_PENDING_MUTATION'; break;}
      if (visited.has(cursor)) {stopped = 'SEARCH_INVALID_LISTING'; break;}
      visited.add(cursor);
      let page;
      try {page = await providerPage(binding, cursor, fresh, pageSignal);}
      catch (cause) {
        signal.throwIfAborted();
        if (accessFailures.has(cause.code)) throw fail(cause.code);
        stopped = deadline.aborted ? 'SEARCH_SCAN_LIMIT' : 'SEARCH_PROVIDER_UNAVAILABLE';
        break;
      }
      await assertAuthority(binding, signal);
      for (; offset < page.entries.length; offset++) {
        const entry = directoryInventoryEntry(binding.source, page.entries[offset]);
        if (!entry || seen.has(entry.key) || !normalizeDirectoryName(entry.displayName).includes(needle)) continue;
        if (entries.length === limit) return result(entries, {nextPageToken:more(), source:'cloud', asOf, stale:false, code});
        entries.push(entry);
        seen.add(entry.key);
      }
      cursor = page.cursor;
      offset = 0;
      if (!cursor) return result(entries, {complete:true, source:'cloud', asOf, stale:false, code});
    }
    const offline = stopped === 'SEARCH_PROVIDER_UNAVAILABLE' || stopped === 'SEARCH_INVALID_LISTING';
    return result(entries, {nextPageToken:more(), source:offline ? 'offline' : 'cloud', asOf, stale:offline || stopped === 'SEARCH_PENDING_MUTATION', code:stopped ?? code});
  }

  async function deliver(binding, needle, limit, token, manifest, attempt, signal) {
    let snapshot = token ? snapshotFor(manifest, token.generation) : attempt.offline || attempt.pending
      ? manifest?.published ?? manifest?.working : manifest?.working ?? manifest?.published;
    if (!snapshot) {
      if (token) throw fail('SEARCH_CURSOR_INVALID');
      return result([], {code:attempt.code, refreshing:attempt.code === 'SEARCH_REVALIDATING'});
    }
    const {entries, after, manifest:matched} = await store.query(binding.scope, snapshot.generation, {needle, after:token?.after ?? null, limit, signal});
    snapshot = snapshotFor(matched, snapshot.generation);
    if (!snapshot) throw fail('SEARCH_CURSOR_INVALID');
    const more = (phase, offset, fallback = false) => JSON.stringify({v:1, generation:snapshot.generation, phase, after:offset, needle, ...(fallback ? {fallback:true, code:attempt.code ?? token?.code} : {})});
    const fallback = attempt.fallback || token?.fallback === true;
    let nextPageToken = null;
    if (after !== null) nextPageToken = more('matches', after, fallback);
    else if (matched.working?.generation === snapshot.generation && !attempt.pending) {
      nextPageToken = fallback
        ? transientToken(binding, needle, {cursor:snapshot.cursor, asOf:snapshot.startedAt, code:attempt.code ?? token?.code})
        : more('scan', snapshot.count);
    }
    const offline = attempt.offline === true;
    return result(entries, {
      nextPageToken, complete:snapshot.complete, source:offline ? 'offline' : attempt.scanned ? 'cloud' : 'cache',
      asOf:snapshot.count || snapshot.complete ? snapshot.startedAt : null,
      stale:offline || attempt.pending === true || snapshot.complete && !isFresh(snapshot, clock()) || !snapshot.complete && !matched.working,
      refreshing:matched.working?.leaseUntil > clock() || attempt.code === 'SEARCH_REVALIDATING',
      ...(attempt.code ? {code:attempt.code} : {})
    });
  }

  async function find(binding, needle, limit, token, refresh, signal) {
    if (token?.phase === 'transient') {
      const saved = transient.get(token.generation);
      if (saved?.key !== binding.key || saved.needle !== needle || saved.expires < clock()) throw fail('SEARCH_CURSOR_INVALID');
      return uncached(binding, needle, limit, saved, false, signal);
    }
    let manifest, attempt = {};
    try {
      await makeInventoryCurrent(binding.scope);
      manifest = await store.manifest(binding.scope);
      const pending = isPending(binding.source);
      if (pending) attempt = {pending, code:'SEARCH_PENDING_MUTATION'};
      const selected = token && snapshotFor(manifest, token.generation);
      if (token && !selected) throw fail('SEARCH_CURSOR_INVALID');
      const extend = token?.phase === 'scan' && manifest?.working?.generation === token.generation;
      const start = manifest?.working?.startedAt;
      const expiredScan = start !== undefined && (clock() < start || clock() - start > maxScanAgeMs);
      if (extend && expiredScan) throw fail('SEARCH_CURSOR_INVALID');
      if (!pending && (extend || !token && (refresh || !isFresh(manifest?.published, clock())))) {
        const restart = refresh || !token && expiredScan;
        attempt = await coalescedScan(binding, manifest, !!restart, signal);
        manifest = attempt.manifest;
      } else if (!token && !pending) {
        // An ordinary warm request keeps the published complete inventory even
        // while an explicit refresh is collecting a new generation.
        manifest = {...manifest, working:null};
      }
      return await deliver(binding, needle, limit, token, manifest, attempt, signal);
    } catch (cause) {
      signal.throwIfAborted();
      if (accessFailures.has(cause.code) || ['SEARCH_CURSOR_INVALID', 'SEARCH_SUPERSEDED'].includes(cause.code)) throw cause;
      if (cause.code === 'INVENTORY_GENERATION_CHANGED') throw fail('SEARCH_CURSOR_INVALID');
      if (isPending(binding.source)) return result([], {code:'SEARCH_PENDING_MUTATION'});
      return uncached(binding, needle, limit, {}, refresh, signal);
    }
  }

  async function search({source, query, pageToken, pageSize = 100, refresh = false}, {signal} = {}) {
    if (typeof query !== 'string' || query.length > 1024 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 200) throw fail('SEARCH_QUERY_INVALID');
    const needle = normalizeDirectoryName(query);
    const token = pageToken === undefined ? null : readToken(pageToken, needle);
    if (refresh && token) throw fail('SEARCH_CURSOR_INVALID');
    signal?.throwIfAborted();
    const binding = await bind(source);
    if (!query.trim()) return result([], {stale:false, reset:true});
    const controller = new AbortController(), operation = {scope:binding.scope, controller};
    const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    active.add(operation);
    try {
      const found = await find(binding, needle, pageSize, token, refresh, combined);
      await assertAuthority(binding, combined);
      return found;
    } finally {active.delete(operation);}
  }

  return Object.freeze({listingPage, search, invalidate});
}
