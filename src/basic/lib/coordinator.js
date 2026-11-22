import { fail, providerId, safeUrl, safeError, WAITING } from "./common.js";
import { acquireSource, publicSource } from "./source.js";
import { identityMatches } from "./auth.js";
import { CONTINUE_WINDOW_MS, pendingExpired } from "./intent.js";
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
  intents,
  onVerified = () => {},
  now = () => Date.now(),
}) {
  const running = new Map(),
    warnings = new Set();
  async function event(a, stage, outcome = "Uncertain", extra = {}) {
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
  async function publish(attempt) {
    try { await notify(attempt); } catch {}
    return attempt;
  }
  async function execute(input, id, {native = false, resume, interactive = native} = {}) {
    const {provider} = input;
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
    let retained = resume, keepWaiting = false;
    async function park(state, error, identity) {
      const intent = {id, input, identity,
        expiresAt: retained?.expiresAt ?? now() + CONTINUE_WINDOW_MS};
      if (pendingExpired(intent, now())) throw expired();
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
      publicSource(input.sourceUrl);
      if (resume && pendingExpired(resume, now())) throw expired();
      await setStage("AUTH_CHECK");
      // Obtain a live, account-verified token once. Shelf status is only a
      // projection and cannot authorize a durable save.
      let grant;
      try {
        grant = await verify();
      } catch (error) {
        if (!canWait || !interactive || !(authorizeOnClick.has(error.code) || awaitGesture.has(error.code))) throw error;
        await park("AWAITING_AUTH", error, retained?.identity ?? auth.binding?.(provider));
        try { await auth.connect(provider); }
        catch (loginError) {
          if (!awaitGesture.has(loginError.code)) throw loginError;
          a = await store.patch(id, safeError(loginError));
          keepWaiting = true;
          return await publish(a);
        }
        grant = await verify();
      }
      if (retained?.identity && !identityMatches(provider, retained.identity, grant.identity))
        throw fail("AUTH_ACCOUNT_CHANGED", "This pending save belongs to the original account or root.");
      if (retained && pendingExpired(retained, now())) throw expired();
      await setStage("SOURCE_CHECK");
      let source;
      try { source = await acquire(input); }
      catch (error) {
        if (!canWait || error.code !== "SOURCE_PERMISSION_REQUIRED") throw error;
        await park("AWAITING_SOURCE", error, grant.identity);
        keepWaiting = true;
        return await publish(a);
      }
      if (retained && pendingExpired(retained, now())) throw expired();
      a = await store.patch(id, {
        filename: source.filename,
        mime: source.mime,
        bytes: source.bytes.byteLength,
        preview: source.preview,
        state: "UPLOADING",
      });
      await event(a, "UPLOADING");
      const began = now();
      uploadStarted = true;
      const receipt = await adapters[provider].upload({
        bytes: source.bytes,
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
      });
      if (a.state === "SAVED") {
        try { void Promise.resolve(onVerified(a)).catch(() => {}); } catch {}
      }
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
      const error = safeError(e);
      const state =
        e.uncertain || (uploadStarted && !e.definitive)
          ? "UNCERTAIN"
          : "FAILED";
      // If durable finalization fails, never show SAVED or increment in a separate transaction.
      a = await store.finish(id, {
        state,
        resumeUntil: undefined,
        ...error,
        ...(warnings.has(id)
          ? { diagnosticsWarning: "DIAGNOSTICS_STORAGE_UNAVAILABLE" }
          : {}),
      });
      await event(a, state, state === "FAILED" ? "Failure" : "Uncertain", {
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
      const promise = execute(input, id, options).finally(() => {
        running.delete(id);
        warnings.delete(id);
      });
      running.set(id, { identity, promise });
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
  return {
    start, pending, resume,
    async afterLogin(provider) {
      const waiting = await pending(provider);
      if (waiting?.state === "AWAITING_AUTH") return resume(provider, waiting.id, false);
    },
  };
}
