import { resolveMenuAction } from '../core/action-resolver.mjs';
import { operationIdentity } from '../core/boundary-observation.mjs';

// Chrome's callback is the only registration acknowledgement. A returned ID or
// a saved generation is never proof that Chrome installed a menu.
const freeze = Object.freeze;
function freezeTree(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeTree(child);
    Object.freeze(value);
  }
  return value;
}
function signal(sink, event) { try { return (typeof sink === 'function' ? sink(event) : sink?.emit?.(event)) || 0; } catch { return 0; } }
function issue(code) { return Object.assign(new Error(code), { code }); }
const owners = new WeakMap();
const contextNames = new Set(['all', 'page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio', 'launcher', 'browser_action', 'page_action', 'action']);

export function generateChromePlan(spec) {
  if (!spec || spec.schemaVersion !== 1 || !Number.isSafeInteger(spec.generation) || spec.generation < 1 || !Array.isArray(spec.rows)) throw issue('INVALID_MENU_SPEC');
  const seen = new Set();
  const parents = new Map();
  const plan = [];
  const siblingCounts = new Map();
  for (const row of spec.rows) {
    if (!row || typeof row.id !== 'string' || !row.id || seen.has(row.id)) throw issue('DUPLICATE_OR_INVALID_ITEM');
    const parentKey = row.parentId ?? null;
    const expectedIndex = siblingCounts.get(parentKey) ?? 0;
    if (row.siblingIndex !== expectedIndex) throw issue('INVALID_SIBLING_INDEX');
    siblingCounts.set(parentKey, expectedIndex + 1);
    if (!['branch', 'save', 'separator', 'navigation', 'provider-action'].includes(row.role) || typeof row.enabled !== 'boolean' || typeof row.visible !== 'boolean') throw issue('INVALID_NATIVE_STATE');
    if (row.parentId != null && (!seen.has(row.parentId) || parents.get(row.parentId) !== 'branch')) throw issue('INVALID_MENU_PARENT');
    if (!['normal', 'separator'].includes(row.type) || !Array.isArray(row.contexts) || !row.contexts.length || row.contexts.some(x => !contextNames.has(x))) throw issue('INVALID_NATIVE_PROPERTIES');
    if (row.type === 'separator' && row.role !== 'separator') throw issue('INVALID_SEPARATOR');
    if (row.type === 'normal' && typeof row.label !== 'string') throw issue('INVALID_MENU_LABEL');
    const properties = { id: row.id, type: row.type, contexts: freeze([...row.contexts]), enabled: row.enabled !== false, visible: row.visible !== false };
    if (row.parentId != null) properties.parentId = row.parentId;
    if (row.type !== 'separator') properties.title = row.label;
    plan.push(freeze({ itemId: row.id, actionId: row.actionId ?? null, target: row.target ?? null, parentId: row.parentId ?? null, properties: freeze(properties) }));
    seen.add(row.id); parents.set(row.id, row.role);
  }
  return freeze({ schemaVersion: 1, generation: spec.generation, rows: freeze(plan), evidenceClass: 'generated' });
}

export function createChromeRegistrar({ chrome, timeoutMs = 3000, sink, persist, epoch = 1, dispatch, getAuthorization, onOutcome, nextOperationId } = {}) {
  if (owners.has(chrome)) throw issue('REGISTRAR_ALREADY_OWNED');
  if (!chrome?.contextMenus?.create || !chrome.contextMenus.removeAll) throw issue('CHROME_UNAVAILABLE');
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) throw issue('INVALID_ACK_TIMEOUT');
  let queue = Promise.resolve();
  let desired = null;
  let generated = null;
  let acknowledged = null;
  let observed = null;
  const nextId = () => nextOperationId ? nextOperationId() : operationIdentity();
  let closed = false;
  let pending = 0;
  let lastOutcome = null;
  let acknowledgements = freeze([]);
  const accepted = new Map();

  const emit = (stage, outcome, code, id, generation, requires = [], count = 0) => signal(sink, { stage, outcome, code, operationId: id, generation, epoch, requires, count });
  function native(method, args) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => { if (!settled) { settled = true; reject(issue('CHROME_ACK_TIMEOUT')); } }, timeoutMs);
      const callback = () => {
        // runtime.lastError must be read inside the callback; never export its
        // message, which may contain labels, private paths or arbitrary text.
        const nativeError = chrome.runtime?.lastError;
        if (settled) return;
        settled = true; clearTimeout(timer);
        nativeError ? reject(issue('CHROME_API_ERROR')) : resolve();
      };
      try { chrome.contextMenus[method](...args, callback); }
      catch { if (!settled) { settled = true; clearTimeout(timer); reject(issue('CHROME_API_THROW')); } }
    });
  }
  async function save(value, id, generation) {
    if (!persist) return true;
    try { await persist(value); emit('persistence.commit', 'ok', 'REGISTRAR_STATE_SAVED', id, generation); return true; }
    catch { emit('persistence.commit', 'failed', 'REGISTRAR_STATE_WRITE_FAILED', id, generation); return false; }
  }
  function samePlan(a, b) {
    if (a.rows.length !== b.rows.length) return false;
    return a.rows.every((row, i) => {
      const x = row.properties, y = b.rows[i].properties;
      const target = row.target, otherTarget = b.rows[i].target;
      const sameTarget = target === otherTarget || !!target && !!otherTarget && ['provider','connectionId','accountId','bucketName','prefix'].every(key => target[key] === otherTarget[key]);
      return sameTarget && row.actionId === b.rows[i].actionId && x.id === y.id && x.parentId === y.parentId && x.title === y.title && x.type === y.type && x.enabled === y.enabled && x.visible === y.visible && x.contexts.join(',') === y.contexts.join(',');
    });
  }
  function apply(spec) {
    if (closed) { emit('chrome.apply', 'blocked', 'REGISTRAR_CLOSED', nextId(), spec?.generation); return Promise.resolve(freeze({ state: 'blocked', code: 'REGISTRAR_CLOSED' })); }
    const id = nextId();
    let plan;
    try { plan = generateChromePlan(spec); freezeTree(spec); }
    catch (error) { emit('chrome.plan', 'failed', error.code, id, spec?.generation); return Promise.resolve(freeze({ state: 'failed', code: error.code })); }
    if (desired && spec.generation < desired.generation) {
      emit('chrome.plan', 'blocked', 'STALE_GENERATION', id, spec.generation);
      return Promise.resolve(freeze({ state: 'blocked', code: 'STALE_GENERATION', generation: spec.generation }));
    }
    const previous = accepted.get(spec.generation);
    if (previous && !samePlan(previous, plan)) { emit('chrome.plan', 'blocked', 'GENERATION_CONFLICT', id, spec.generation); return Promise.resolve(freeze({ state: 'blocked', code: 'GENERATION_CONFLICT', generation: spec.generation })); }
    if (!pending && (!persist || lastOutcome?.persistence === 'saved') && acknowledged?.generation === spec.generation && samePlan(generateChromePlan(acknowledged), plan)) {
      emit('chrome.apply', 'ok', 'UNCHANGED_ACK_REUSED', id, spec.generation);
      return Promise.resolve(freeze({ state: 'completed', code: 'UNCHANGED_ACK_REUSED', generation: spec.generation, appliedGeneration: acknowledged.generation, failedItems: 0, nativeMutations: 0 }));
    }
    accepted.set(spec.generation, plan);
    // Only retain desired/applied generation plans: this is not an unbounded
    // snapshot database. Historical models belong to the versioned menu store.
    for (const key of accepted.keys()) if (key < spec.generation - 1) accepted.delete(key);
    desired = spec; generated = plan; pending++;
    const planSignal = emit('chrome.plan', 'ok', 'PLAN_GENERATED', id, spec.generation, [], spec.rows.length);
    const work = async () => {
      const acks = [];
      const failed = new Set();
      let durable = await save({ desired: spec, appliedGeneration: null, epoch, state: 'applying' }, id, spec.generation);
      const applySignal = emit('chrome.apply', 'started', 'APPLY_STARTED', id, spec.generation, planSignal ? [planSignal] : []);
      const rowSignals = new Map();
      const failureSignals = [];
      let acknowledgedCount = 0;
      // removeAll is intentional: stable IDs are preserved in the new plan,
      // and serialization guarantees no mixed generation after partial errors.
      // Clearing invalidates old ACKs immediately, even if callback is lost.
      acknowledged = null; observed = null;
      try { await native('removeAll', []); }
      catch (error) {
        emit('chrome.ack', 'uncertain', error.code, id, spec.generation);
        acknowledgements = freeze([freeze({ method: 'removeAll', state: 'uncertain', code: error.code })]);
        lastOutcome = freeze({ state: 'uncertain', code: error.code, generation: spec.generation, appliedGeneration: null });
        pending--; return lastOutcome;
      }
      acks.push(freeze({ method: 'removeAll', state: 'acknowledged', code: 'CHROME_ACK' }));
      for (let rowIndex = 0; rowIndex < plan.rows.length; rowIndex++) {
        const row = plan.rows[rowIndex];
        const prerequisites = [applySignal, rowSignals.get(row.parentId)].filter(Boolean);
        if (row.parentId && failed.has(row.parentId)) {
          failed.add(row.itemId);
          acks.push(freeze({ method: 'create', itemId: row.itemId, state: 'blocked', code: 'PARENT_NOT_ACKNOWLEDGED' }));
          const rowSignal = emit('chrome.ack', 'blocked', 'PARENT_NOT_ACKNOWLEDGED', id, spec.generation, prerequisites, rowIndex + 1);
          rowSignals.set(row.itemId, rowSignal); if (rowSignal) failureSignals.push(rowSignal);
          continue;
        }
        try {
          await native('create', [row.properties]);
          acks.push(freeze({ method: 'create', itemId: row.itemId, state: 'acknowledged', code: 'CHROME_ACK' }));
          acknowledgedCount++;
          rowSignals.set(row.itemId, emit('chrome.ack', 'ok', 'ITEM_ACKNOWLEDGED', id, spec.generation, prerequisites, rowIndex + 1));
        } catch (error) {
          failed.add(row.itemId);
          acks.push(freeze({ method: 'create', itemId: row.itemId, state: error.code === 'CHROME_ACK_TIMEOUT' ? 'uncertain' : 'failed', code: error.code }));
          const rowSignal = emit('chrome.ack', error.code === 'CHROME_ACK_TIMEOUT' ? 'uncertain' : 'failed', error.code, id, spec.generation, prerequisites, rowIndex + 1);
          rowSignals.set(row.itemId, rowSignal); if (rowSignal) failureSignals.push(rowSignal);
        }
      }
      acknowledgements = freeze(acks);
      if (!failed.size) acknowledged = spec;
      durable = await save({ desired: spec, appliedGeneration: acknowledged?.generation ?? null, epoch, state: failed.size ? 'partial' : 'acknowledged' }, id, spec.generation) && durable;
      lastOutcome = freeze({ state: failed.size ? 'partial' : durable ? 'completed' : 'partial', code: failed.size ? 'NATIVE_APPLY_INCOMPLETE' : durable ? 'NATIVE_ACKNOWLEDGED' : 'PERSISTENCE_FAILED', generation: spec.generation, appliedGeneration: acknowledged?.generation ?? null, failedItems: failed.size, persistence: durable ? 'saved' : 'failed' });
      emit('chrome.apply', failed.size ? 'partial' : 'ok', lastOutcome.code, id, spec.generation, failureSignals.length ? failureSignals : applySignal ? [applySignal] : [], acknowledgedCount);
      pending--; return lastOutcome;
    };
    const result = queue.then(work, work);
    queue = result.catch(() => {});
    return result;
  }
  function inspect() {
    return freeze({ schemaVersion: 1, epoch, pending, desired, generated, acknowledgedGeneration: acknowledged?.generation ?? null, acknowledgements, observed, lastOutcome,
      coverage: freeze({ nativeApi: acknowledged ? 'acknowledged' : 'unknown', nativeBehavior: observed ? 'independently_observed' : 'not_observed', nativeRendering: observed?.rendering ? 'independently_observed' : 'not_observed', gaps: freeze([...(observed?.rendering ? [] : ['NATIVE_RENDERING_NOT_OBSERVED']), ...(observed && !observed.complete ? ['NATIVE_OBSERVATION_PARTIAL'] : [])]) }) });
  }
  function resolveClick(selection = {}) {
    const id = nextId();
    if (!acknowledged || desired?.generation !== acknowledged.generation || pending) {
      emit('resolver', 'blocked', 'NATIVE_GENERATION_UNACKNOWLEDGED', id, selection.generation);
      return freeze({ state: 'blocked', code: 'NATIVE_GENERATION_UNACKNOWLEDGED' });
    }
    const result = resolveMenuAction(acknowledged, { ...selection, acknowledgedGeneration: acknowledged.generation });
    emit('resolver', result.state === 'completed' ? 'ok' : 'blocked', result.code, id, acknowledged.generation);
    return result;
  }
  async function handleClick(info = {}, tab) {
    if(acknowledged?.rows.some(r=>r.id===String(info.menuItemId)&&r.role==='provider-action')){
      const r=resolveClick({itemId:String(info.menuItemId),generation:acknowledged.generation,context:info.srcUrl?'image':'link',authorizedTargets:[]});
      if(r.state!=='completed'||!dispatch)return r;
      try{const out=await dispatch(r.action,{info,tab});onOutcome?.(out);return out;}catch{return {state:'failed',code:'PROVIDER_ACTION_FAILED'};}
    }
    let authorization;
    try { authorization = await getAuthorization?.(info, tab); }
    catch { authorization = null; }
    if (!authorization || !Array.isArray(authorization.authorizedTargets)) {
      const row=acknowledged?.rows.find(r=>r.id===String(info.menuItemId)&&(r.setupProvider==='cloudflare'||r.role==='save'&&r.target?.provider==='cloudflare'));
      if(row&&dispatch&&!pending&&desired?.generation===acknowledged.generation){try{const out=await dispatch({providerAction:'cloudflare',reconnectOnly:true,target:row.target,itemId:row.id},{info,tab});onOutcome?.(out);return out;}catch{return {state:'blocked',code:'PROVIDER_ACTION_FAILED'};}}
      const result = freeze({ state: 'blocked', code: 'CURRENT_AUTHORIZATION_REQUIRED' });
      emit('auth.check', 'blocked', result.code, nextId(), acknowledged?.generation);
      try { onOutcome?.(result); } catch {}
      return result;
    }
    const result = resolveClick({ itemId: String(info.menuItemId), generation: acknowledged?.generation, context: info.mediaType === 'image' || info.srcUrl ? 'image' : info.linkUrl ? 'link' : 'page', authorizedTargets: authorization.authorizedTargets });
    if(result.state!=='completed'&&['SCOPE_UNAUTHORIZED','ITEM_DISABLED'].includes(result.code)){const row=acknowledged?.rows.find(r=>r.id===String(info.menuItemId)&&(r.setupProvider==='cloudflare'||r.role==='save'&&r.target?.provider==='cloudflare'));if(row&&dispatch){try{const out=await dispatch({providerAction:'cloudflare',reconnectOnly:true,target:row.target,itemId:row.id},{info,tab});onOutcome?.(out);return out;}catch{}}}
    if (result.state !== 'completed') { try { onOutcome?.(result); } catch {} return result; }
    if (!dispatch) {
      const blocked = freeze({ state: 'blocked', code: 'AUTHORIZED_DISPATCHER_REQUIRED' });
      emit('intent', 'blocked', blocked.code, nextId(), acknowledged?.generation);
      try { onOutcome?.(blocked); } catch {} return blocked;
    }
    try { const outcome = await dispatch(result.action, { info, tab, authorization }); try { onOutcome?.(outcome); } catch {} return outcome; }
    catch { const failed = freeze({ state: 'failed', code: 'DISPATCH_FAILED' }); emit('intent', 'failed', failed.code, nextId(), acknowledged?.generation); try { onOutcome?.(failed); } catch {} return failed; }
  }
  const listener = (info, tab) => { void handleClick(info, tab); };
  chrome.contextMenus.onClicked?.addListener(listener);
  const owner = freeze({ apply, inspect, resolveClick, handleClick,
    async recover(spec) {
      emit('chrome.recovery', 'interrupted', 'PREVIOUS_PROCESS_ACK_NOT_CURRENT', nextId(), spec?.generation);
      // Persisted ACKs are historical, never installed evidence for this epoch.
      return apply(spec);
    },
    addObservedEvidence(evidence) {
      if (!evidence || pending || desired?.generation !== acknowledged?.generation || evidence.generation !== acknowledged?.generation || typeof evidence.testId !== 'string' || !evidence.testId || !Array.isArray(evidence.itemIds) || new Set(evidence.itemIds).size !== evidence.itemIds.length || evidence.itemIds.some(id => !acknowledged.rows.some(row => row.id === id))) throw issue('INVALID_OBSERVED_EVIDENCE');
      observed = freeze({ evidenceClass: 'independently_observed', generation: evidence.generation, testId: evidence.testId, itemIds: freeze([...evidence.itemIds]), complete: evidence.complete === true && evidence.itemIds.length === acknowledged.rows.length, rendering: evidence.rendering === true });
      return observed;
    },
    close() { closed = true; chrome.contextMenus.onClicked?.removeListener(listener); owners.delete(chrome); }
  });
  owners.set(chrome, owner);
  return owner;
}
