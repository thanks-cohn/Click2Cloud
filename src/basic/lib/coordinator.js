import {wait} from '../../../right2cloud-module/src/common.mjs';
import { fail, providerId, safeUrl, safeError, WAITING, PROVIDERS } from "./common.js";
import { acquireSource, publicSource } from "./source.js";
import { identityMatches } from "./auth.js";
import { CONTINUE_WINDOW_MS, pendingExpired } from "./intent.js";
import {passiveObservation} from '../../core/boundary-observation.mjs';
const stopped=()=>fail('SAVE_CANCELLED','Save cancelled before the provider committed the file.');
const MAX_ACTIVE_SAVES = 2;
const authorizeOnClick = new Set(["AUTH_REQUIRED", "AUTH_REVOKED", "AUTH_SCOPE_REQUIRED"]);
const awaitGesture = new Set(["AUTH_CONNECTING", "AUTH_GESTURE_REQUIRED"]);
const expired = () => fail("PENDING_SAVE_EXPIRED", "This pending save expired or its browser session ended.",
  "Start a fresh save from the original item.");
export function createCoordinator({
  store,
  auth,
  adapters,
  acquire = acquireSource,
  notify = () => {},
  observe = () => {},
  intents,
  onVerified = () => {},
  now = () => Date.now(),
}) {
  const running = new Map(),
    warnings = new Set(), cancelling = new Set(), retrying = new Set();
  let stopping=false;
  const signingOut = new Set();
  const signOutBusy = () => fail("PROVIDER_SIGN_OUT_BUSY", "Wait for this provider’s active save or sign-out to finish.", "Try again after the provider is idle.");
  async function withProviderIdle(provider, work) {
    providerId(provider);
    if (signingOut.has(provider) || [...running.values()].some(job=>job.provider===provider)) throw signOutBusy();
    signingOut.add(provider);
    try { return await work(); } finally { signingOut.delete(provider); }
  }
  async function event(a, stage, outcome = "Uncertain", extra = {}) {
    try { void Promise.resolve(observe(a)).catch(() => {}); } catch { /* History is optional. */ }
    try {
      await store.event({
        timestamp: new Date().toISOString(),
        attemptId: a.id,
        provider: a.provider,
        stage,
        outcome,
        hostUrl: a.hostUrl,
        sourceUrl: a.sourceUrl,
        ...extra,
      });
    } catch {
      warnings.add(a.id);
      try {
        await store.noteDiagnosticsWarning(a.id);
      } catch {
        /* Core save remains independent of optional log quota. */
      }
    }
  }
  async function keepRetry(provider,descriptor){
    const evicted=await intents.keepRetry(provider,descriptor,now());
    for(const id of evicted??[]){
      const row=await store.disableRetry?.(id).catch(()=>null);
      if(row)try{void Promise.resolve(observe(row)).catch(()=>{});}catch{}
    }
  }
  async function publish(attempt) {
    try { await notify(attempt); } catch {}
    return attempt;
  }
  async function execute(input, id, {native = false, resume, interactive = native, onAccepted, retry}, job) {
    const {provider} = input;
    const {signal}=job.controller;
    const waitFor=promise=>wait(promise,signal);
    const createdAt = new Date().toISOString();
    const identity = JSON.stringify([
      provider,
      input.sourceUrl,
      input.hostUrl || "",
      input.filename || "",
    ]);
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(identity),
    );
    const requestHash = Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    let a = {
      id,
      requestHash,
      provider,
      filename: "download",
      hostUrl: safeUrl(input.hostUrl),
      sourceUrl: safeUrl(input.sourceUrl),
      createdAt,
      updatedAt: createdAt,
      state: "RECEIVED",
      ...(retry?{parentAttemptId:retry.id}:{})
    };
    if (resume) {
      a = await store.getAttempt(id);
      if (!a || a.provider !== provider || a.requestHash !== requestHash || !WAITING.has(a.state))
        throw fail("PENDING_SAVE_NOT_RESUMABLE", "The original save is no longer waiting.");
    } else {
      const started = await store.begin(a);
      if (!started.created) return started.attempt;
      await event(a, "RECEIVED");
    }
    const canWait = native && !!intents;
    let retained = resume, keepWaiting = false, binding=resume?.identity??retry?.identity;
    async function park(state, error, identity) {
      const intent = {id, input, identity,
        expiresAt: retained?.expiresAt ?? now() + CONTINUE_WINDOW_MS};
      if (pendingExpired(intent, now())) throw expired();
      signal.throwIfAborted();
      await intents.keep(provider, intent, now());
      retained = intent;
      const info = safeError(error);
      a = await store.patch(id, {state, ...info, resumeUntil: intent.expiresAt});
      await event(a, state, "Uncertain", {code: info.code});
    }
    const verify = () => auth.authorization
      ? auth.authorization(provider)
      : auth.token(provider).then(accessToken => ({accessToken}));
    const setStage = async state => {
      a = await store.patch(id, {state, code: undefined, message: undefined, nextAction: undefined});
      await event(a, state);
    };
    let uploadStarted = false;
    try {
      signal.throwIfAborted();
      publicSource(input.sourceUrl);
      if (resume && pendingExpired(resume, now())) throw expired();
      await setStage("AUTH_CHECK");
      // Obtain a live, account-verified token once. Shelf status is only a
      // projection and cannot authorize a durable save.
      let grant;
      try {
        grant = await waitFor(verify());
      } catch (error) {
        signal.throwIfAborted();
        if (!canWait || !interactive || !(authorizeOnClick.has(error.code) || awaitGesture.has(error.code))) throw error;
        await park("AWAITING_AUTH", error, retained?.identity ?? auth.binding?.(provider));
        try { await waitFor(auth.connect(provider)); }
        catch (loginError) {
          signal.throwIfAborted();
          if (!awaitGesture.has(loginError.code)) throw loginError;
          a = await store.patch(id, safeError(loginError));
          keepWaiting = true;
          return await publish(a);
        }
        grant = await waitFor(verify());
      }
      if (binding && !identityMatches(provider, binding, grant.identity))
        throw fail("AUTH_ACCOUNT_CHANGED", "This pending save belongs to the original account or root.");
      if (retained && pendingExpired(retained, now())) throw expired();
      binding=grant.identity;
      await setStage("SOURCE_CHECK");
      let source;
      try {
        source = await acquire(input,signal);
        signal.throwIfAborted();
        if(retry?.filename)source.filename=retry.filename;
      }
      catch (error) {
        if (!canWait || error.code !== "SOURCE_PERMISSION_REQUIRED") throw error;
        await park("AWAITING_SOURCE", error, grant.identity);
        keepWaiting = true;
        return await publish(a);
      }
      signal.throwIfAborted();
      if (retained && pendingExpired(retained, now())) throw expired();
      a = await store.patch(id, {
        filename: source.filename,
        mime: source.mime,
        bytes: source.bytes.byteLength,
        preview: source.preview,
        state: "UPLOADING",
        cancellable:true,
      });
      if (native && !resume) passiveObservation(onAccepted);
      await event(a, "UPLOADING");
      const began = now();
      signal.throwIfAborted();
      uploadStarted = true;
      const receipt = await adapters[provider].upload({
        bytes: source.bytes,
        signal,
        onCommitting:()=>{
          signal.throwIfAborted();
          job.committing=true;
          void store.patch(id,{cancellable:false}).then(row=>{
            try{void Promise.resolve(observe(row)).catch(()=>{});}catch{}
          }).catch(()=>{});
        },
        filename: source.filename,
        mime: source.mime,
        token: grant.accessToken,
        expectedRoot: provider === "onedrive" ? grant.identity?.[1] : undefined,
        attemptId: id,
        onConfirming: async () => {
          a = await store.patch(id, { state: "CONFIRMING" });
          await event(a, "CONFIRMING");
        },
      });
      if (a.state !== "CONFIRMING") {
        a = await store.patch(id, { state: "CONFIRMING" });
        await event(a, "CONFIRMING");
      }
      if (
        receipt?.confirmed !== true ||
        receipt.provider !== provider ||
        !receipt.id ||
        !(
          receipt.name === source.filename ||
          receipt.requestedName === source.filename
        ) ||
        Number(receipt.size) !== source.bytes.byteLength
      )
        throw Object.assign(
          fail(
            "CONFIRMATION_MISMATCH",
            "Provider confirmation did not match the intended file.",
            "Inspect the provider before retrying to avoid duplicates.",
          ),
          { uncertain: true },
        );
      const durationMs = Math.max(0, now() - began);
      const savedTo = {
        provider, accountId: grant.identity?.[0],
        ...(provider === "dropbox" ? {namespace: grant.identity?.[1], path: receipt.path ?? null} : {}),
        ...(provider === "onedrive" ? {rootId: grant.identity?.[1]} : {}),
      };
      a = await store.finish(id, {
        state: "SAVED",
        code: undefined,
        resumeUntil: undefined,
        filename: receipt.name,
        confirmed: true,
        objectId: receipt.id,
        destination: savedTo,
        durationMs,
        ...(warnings.has(id)
          ? { diagnosticsWarning: "DIAGNOSTICS_STORAGE_UNAVAILABLE" }
          : {}),
        message: "Provider confirmed the saved file.",
        nextAction: "View the file on the provider website.",
      }, onVerified);
      await event(a, "SAVED", "Success", {
        bytes: a.bytes,
        durationMs,
        objectId: a.objectId,
        destination: savedTo,
        filename: a.filename,
        speedBps:
          durationMs > 0 ? Math.round((a.bytes * 1000) / durationMs) : null,
      });
    } catch (e) {
      const cancelled=signal.aborted&&!job.committing;
      const error=safeError(cancelled?stopped():e);
      const state=cancelled?'CANCELLED':e.uncertain||(uploadStarted&&!e.definitive)?'UNCERTAIN':'FAILED';
      let expiresAt;
      const until=retained?.expiresAt??retry?.expiresAt??now()+CONTINUE_WINDOW_MS;
      if(state!=='UNCERTAIN'&&!job.committing&&binding?.[0]&&intents?.keepRetry&&
          !pendingExpired({expiresAt:until},now())&&!['AUTH_ACCOUNT_CHANGED','PENDING_SAVE_EXISTS'].includes(error.code)){
        try{
          await keepRetry(provider,{id,input,identity:binding,
            ...(uploadStarted?{filename:a.filename}:{}),expiresAt:until});
          expiresAt=until;
        }catch{/* Retry is optional. */}
      }
      // If durable finalization fails, never show SAVED or increment in a separate transaction.
      a = await store.finish(id, {
        state,
        resumeUntil: undefined,
        preview: undefined,
        retryable: expiresAt!==undefined,
        retryExpiresAt: expiresAt,
        ...error,
        ...(warnings.has(id)
          ? { diagnosticsWarning: "DIAGNOSTICS_STORAGE_UNAVAILABLE" }
          : {}),
      });
      await event(a, state, state === "FAILED" ? "Failure" : state === "CANCELLED" ? "Cancelled" : "Uncertain", {
        code: error.code,
        cause: error.message,
        ...(Number.isInteger(e.httpStatus) ? { httpStatus: e.httpStatus } : {}),
      });
    } finally {
      if (retained && !keepWaiting) await intents.remove(provider, id).catch(() => {});
    }
    if (warnings.has(id))
      a = { ...a, diagnosticsWarning: "DIAGNOSTICS_STORAGE_UNAVAILABLE" };
    return publish(a);
  }
  function start(input, options = {}) {
      providerId(input.provider);
      if(signingOut.has(input.provider))throw signOutBusy();
      const id = input.requestId || crypto.randomUUID();
      if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(id))
        throw fail(
          "INVALID_REQUEST_ID",
          "Use an 8–100 character request ID containing letters, numbers, underscores or hyphens.",
        );
      const identity = JSON.stringify([
        input.provider,
        input.sourceUrl,
        input.hostUrl || "",
        input.filename || "",
      ]);
      if(cancelling.has(id)||stopping&&(options.resume||options.retry))throw stopped();
      if (running.has(id)) {
        const existing = running.get(id);
        if (existing.identity !== identity)
          throw fail(
            "IDEMPOTENCY_CONFLICT",
            "This request ID belongs to a different save.",
            "Use a new request ID for a new save.",
          );
        return existing.promise;
      }
      if (running.size >= MAX_ACTIVE_SAVES)
        throw fail("RESOURCE_BUSY", "Two provider saves are already running.", "Wait for a save to finish, then try again.");
      const job={identity,provider:input.provider,controller:new AbortController(),committing:false};
      const promise = execute(input, id, options,job).finally(() => {
        running.delete(id);
        warnings.delete(id);
      });
      job.promise=promise;
      running.set(id, job);
      return promise;
  }
  async function pending(provider) {
    const intent = await intents?.get(provider);
    if (!intent) return null;
    const row = await store.getAttempt(intent.id);
    if (!row || row.provider !== provider || !WAITING.has(row.state)) return null;
    if (pendingExpired(intent, now())) return null;
    return {id: row.id, provider, state: row.state, expiresAt: intent.expiresAt};
  }
  async function resume(provider, id, interactive = true) {
    const intent = await intents?.get(provider);
    if (intent?.id !== id || intent.input?.provider !== provider)
      throw fail("PENDING_SAVE_NOT_FOUND", "The pending save is no longer available in this browser session.");
    return start({...intent.input, requestId: id}, {native: true, resume: intent, interactive});
  }
  async function cancel(provider,id){
    const live=running.get(id);
    if(live?.provider===provider){
      if(live.committing)return {state:'unsupported',code:'PROVIDER_COMMIT_IN_PROGRESS'};
      if(!live.controller.signal.aborted){
        live.controller.abort(stopped());
        void store.patch(id,{cancelRequested:true}).then(row=>{
          try{void Promise.resolve(observe(row)).catch(()=>{});}catch{}
        }).catch(()=>{});
      }
      return {state:'cancelling'};
    }
    if(cancelling.has(id))return {state:'cancelling'};
    cancelling.add(id);
    try{
      const intent=await intents?.get(provider);
      const row=await store.getAttempt(id);
      if(!row||row.provider!==provider||!WAITING.has(row.state))return {state:'unsupported',code:'SAVE_NOT_CANCELLABLE'};
      let expiresAt;
      if(intent?.id===id&&intent.identity?.[0]&&!pendingExpired(intent,now())&&intents.keepRetry){
        try{await keepRetry(provider,intent);expiresAt=intent.expiresAt;}catch{}
      }
      const result=await store.finish(id,{state:'CANCELLED',...safeError(stopped()),resumeUntil:undefined,
        retryable:expiresAt!==undefined,retryExpiresAt:expiresAt});
      await intents?.remove(provider,id).catch(()=>{});
      await event(result,'CANCELLED','Cancelled');
      await publish(result);
      return {state:result.state==='CANCELLED'?'cancelled':'finished'};
    }finally{cancelling.delete(id);}
  }
  async function cancelAll(){
    if(stopping)return [];
    stopping=true;
    try{
      const live=[...running].map(([id,job])=>cancel(job.provider,id));
      const waiting=PROVIDERS.map(async({id:provider})=>{
        const intent=await intents?.get(provider);
        return intent&&!running.has(intent.id)?cancel(provider,intent.id):null;
      });
      return (await Promise.allSettled([...live,...waiting]))
        .map(result=>result.status==='fulfilled'?result.value:{state:'unsupported'}).filter(Boolean);
    }finally{stopping=false;}
  }
  async function expirePending(){
    for(const {id:provider} of PROVIDERS){
      const intent=await intents?.get(provider);
      if(!intent||running.has(intent.id)||cancelling.has(intent.id)||!pendingExpired(intent,now()))continue;
      cancelling.add(intent.id);
      try{
        const row=await store.getAttempt(intent.id);
        if(row?.provider===provider&&WAITING.has(row.state)){
          const result=await store.finish(row.id,{state:'FAILED',...safeError(expired()),resumeUntil:undefined});
          await event(result,'FAILED','Failure',{code:result.code});
          await publish(result);
        }
        await intents.remove(provider,intent.id);
      }finally{cancelling.delete(intent.id);}
    }
  }
  async function retry(provider,id){
    providerId(provider);
    if(retrying.has(id))throw fail('SAVE_RETRY_IN_PROGRESS','This save is already being retried.');
    retrying.add(id);
    try{
      const row=await store.getAttempt(id);
      if(row?.provider!==provider||!row.retryable||row.retryAttemptId||!['FAILED','CANCELLED'].includes(row.state))
        throw fail('SAVE_RETRY_UNAVAILABLE','The original save cannot be safely retried.');
      const intent=await intents?.getRetry?.(provider,id);
      if(intent?.id!==id||!intent.identity?.[0]||pendingExpired(intent,now()))throw expired();
      const grant=await auth.authorization(provider);
      if(!identityMatches(provider,intent.identity,grant.identity))
        throw fail('AUTH_ACCOUNT_CHANGED','Reconnect the original account to retry this save.');
      if(stopping||running.size>=MAX_ACTIVE_SAVES)throw fail('RESOURCE_BUSY','Wait for an active save to finish.');
      if(!await intents.takeRetry(provider,id))throw expired();
      const result=await start({...intent.input,requestId:crypto.randomUUID()},{retry:intent});
      if(store.disableRetry){
        const updated=await store.disableRetry(id,result.id);
        try{void Promise.resolve(observe(updated)).catch(()=>{});}catch{}
      }
      return result;
    }finally{retrying.delete(id);}
  }
  return {
    start, pending, resume, cancel, cancelAll, expirePending, retry, withProviderIdle,
    async afterLogin(provider) {
      const waiting = await pending(provider);
      if (waiting?.state === "AWAITING_AUTH") return resume(provider, waiting.id, false);
    },
  };
}
