import { CONFIG } from "../config.js";
import { safeError } from "./common.js";

export const AUTH_SCOPES = Object.freeze({
  google: ["https://www.googleapis.com/auth/drive.file"],
  dropbox: ["account_info.read", "files.metadata.read", "files.content.write"],
  onedrive: ["Files.ReadWrite", "User.Read", "offline_access"],
});
const ENDPOINTS = {
  dropbox: {
    authorize: "https://www.dropbox.com/oauth2/authorize",
    token: "https://api.dropboxapi.com/oauth2/token",
  },
  onedrive: {
    authorize: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  },
};
const OAUTH_WINDOW_MS = 10 * 60000;
const STATUS_FRESH_MS = 30000;
const fail = (
  code,
  message,
  nextAction = "Reconnect/Approve this provider, then retry the save.",
) => Object.assign(new Error(message), { code, nextAction });
const b64 = (value) =>
  btoa(String.fromCharCode(...new Uint8Array(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const normalized = (s) =>
  s.toLowerCase().replace(/^https:\/\/graph.microsoft.com\//, "");
const granted = (id, scopes) =>
  AUTH_SCOPES[id]
    .filter((s) => s !== "offline_access")
    .every((s) => Array.isArray(scopes) && scopes.some(
      value => typeof value === "string" && normalized(value) === normalized(s),
    ));

function browserAuthFailure(error) {
  const detail = String(error?.message ?? "");
  if (/not supported|not implemented|unsupported/i.test(detail))
    return fail("AUTH_BROWSER_UNSUPPORTED", "This browser does not support the extension's configured sign-in flow.");
  if (/invalid.client|bad client|redirect.mismatch|oauth2.*not declared/i.test(detail))
    return fail("OAUTH_CONFIG_REQUIRED", "The browser could not use the registered OAuth client.");
  if (/administrat|enterprise|blocked by policy/i.test(detail))
    return fail("AUTH_POLICY_BLOCKED", "Browser or account policy prevented extension sign-in.",
      "Check the browser profile and extension sign-in policy.");
  if (/user gesture|user activation/i.test(detail))
    return fail("AUTH_GESTURE_REQUIRED", "Chrome requires a direct action to open sign-in.",
      "Continue the pending save from the Shelf.");
  if (/user did not approve|user rejected|closed by (?:the )?user|user (?:closed|denied|cancel[le]+d)|access_denied|\bcancell?ed\b/i.test(detail))
    return fail("AUTH_CANCELLED", "Authorization was cancelled or declined.");
  if (/not signed in|no (?:chrome )?account|browser sign.in.*disabled/i.test(detail))
    return fail("AUTH_PROFILE_REQUIRED", "The browser profile has no eligible signed-in account.",
      "Sign in to the Google Chrome profile before retrying Drive authorization.");
  if (/interaction required|not granted or revoked|user interaction/i.test(detail))
    return fail("AUTH_REQUIRED", "Authorize this extension before saving.");
  if (/network|connection|temporarily unavailable|page could not be loaded/i.test(detail))
    return fail("AUTH_NETWORK", "The browser could not reach the authorization provider.", "Check connectivity and try again.");
  return fail("AUTH_BROWSER_FAILED", "The browser could not complete authorization.",
    "Check browser sign-in and the extension's OAuth registration, then try again.");
}

export function identityMatches(id, previous, actual) {
  // Older Dropbox credentials stored only the account ID. Bind the home root
  // when that same account is next verified. Uploads still use the default root.
  return Array.isArray(previous) && Array.isArray(actual) && previous.every((part, index) => part === actual[index]) &&
    (previous.length === actual.length || (id === "dropbox" && previous.length === 1));
}

export function createAuth({
  chrome,
  fetch = globalThis.fetch,
  config = CONFIG,
  now = Date.now,
  crypto = globalThis.crypto,
  trustedStorage = async () => {
    const level = { accessLevel: "TRUSTED_CONTEXTS" };
    await chrome.storage.local.setAccessLevel(level);
    await chrome.storage.session?.setAccessLevel?.(level);
  },
  onStatus = () => {},
  checkTimeoutMs = 38000,
}) {
  const slots = Object.fromEntries(Object.keys(AUTH_SCOPES).map(id => [id, {epoch: 0}]));
  const changed = () => fail("AUTH_CHANGED", "Authorization changed while checking access.",
    "Wait for Sign In to finish, then retry.");
  const connecting = () => fail("AUTH_CONNECTING", "Authorization is in progress.",
    "Finish or close the sign-in window before retrying.");
  const key = (id) => `redownRemoteBasicV1:auth:${id}`;
  function valid(id) {
    if (!Object.hasOwn(AUTH_SCOPES, id))
      throw fail(
        "PROVIDER_INVALID",
        "Unknown provider.",
        "Choose one of the three supported providers.",
      );
  }
  async function storage(work) {
    try {
      return await work();
    } catch {
      throw fail(
        "AUTH_STORAGE_UNAVAILABLE",
        "Secure browser credential storage is unavailable.",
        "Check browser extension storage, then Refresh.",
      );
    }
  }
  let secured;
  function secure() {
    if (!secured) {
      secured = storage(trustedStorage);
      void secured.catch(() => { secured = undefined; });
    }
    return secured;
  }
  const load = (id) => storage(async () => (await chrome.storage.local.get(key(id)))[key(id)]);
  function save(id, record, ticket, signal, replace = false) {
    const slot = slots[id];
    // Serialize the actual local storage commit. A refresh may run during a
    // popup and preserve a rotation if consent fails, but cannot win after a
    // different, verified credential has been committed.
    const pending = (slot.commit ?? Promise.resolve()).catch(() => {}).then(async () => {
      signal.throwIfAborted();
      if (slot.epoch !== ticket) throw changed();
      await storage(() => chrome.storage.local.set({ [key(id)]: record }));
      if (replace) slot.epoch++;
    });
    slot.commit = pending;
    const clear = () => { if (slot.commit === pending) slot.commit = undefined; };
    void pending.then(clear, clear);
    return pending;
  }
  function client(id) {
    const value =
      id === "google"
        ? chrome.runtime.getManifest().oauth2?.client_id
        : config.clientIds?.[id];
    if (
      typeof value !== "string" ||
      !value ||
      /CONFIGURE|REPLACE|placeholder/i.test(value)
    )
      throw fail(
        "OAUTH_CONFIG_REQUIRED",
        "REDOWN needs a registered OAuth client for this provider.",
        "Follow README OAuth setup for REDOWN Basic, reload, and Sign In.",
      );
    return value;
  }
  async function http(url, options, signal) {
    signal.throwIfAborted();
    let response;
    try {
      response = await fetch(url, {
        ...options,
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "no-referrer",
        signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
      });
    } catch {
      signal.throwIfAborted();
      throw fail(
        "AUTH_NETWORK",
        "Could not reach the authorization provider.",
        "Check connectivity and Refresh; use Reconnect if permission was revoked.",
      );
    }
    if (response.status === 401 || response.status === 403)
      throw Object.assign(fail(
        "AUTH_REVOKED",
        `Provider access was rejected (HTTP ${response.status}).`,
      ), {httpStatus: response.status});
    return response;
  }
  async function probe(id, accessToken, expected, signal, verifyRoot = false) {
    const paths =
      id === "google"
        ? [
            "https://www.googleapis.com/drive/v3/about?fields=user(permissionId)",
          ]
        : id === "dropbox"
          ? ["https://api.dropboxapi.com/2/users/get_current_account"]
          : [
              "https://graph.microsoft.com/v1.0/me?$select=id",
              "https://graph.microsoft.com/v1.0/me/drive/root?$select=id",
            ];
    const identity = [];
    for (const path of paths) {
      const response = await http(path, {
        method: id === "dropbox" ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(id === "dropbox" ? { "Content-Type": "application/json" } : {}),
        },
        ...(id === "dropbox" ? { body: "null" } : {}),
      }, signal);
      if (!response.ok)
        throw fail(
          "AUTH_READINESS_HTTP",
          `Provider readiness could not be verified (HTTP ${response.status}).`,
          "Refresh later; do not assume the provider website login permits uploads.",
        );
      let data;
      try {
        data = await response.json();
      } catch {
        throw fail(
          "AUTH_RESPONSE_INVALID",
          "Provider readiness response was invalid.",
        );
      }
      const value =
        id === "google"
          ? data?.user?.permissionId
          : id === "dropbox"
            ? data?.account_id
            : data?.id;
      if (typeof value !== "string" || !value)
        throw fail(
          "AUTH_RESPONSE_INVALID",
          "Provider did not identify the extension account or root.",
        );
      identity.push(value);
      if (id === "dropbox") {
        const home = data.root_info?.home_namespace_id;
        if (typeof home !== "string" || !/^\d+$/.test(home))
          throw fail("AUTH_RESPONSE_INVALID", "Dropbox did not identify the authorized home namespace.");
        identity.push(home);
      }
    }
    if (expected && !identityMatches(id, expected, identity))
      throw fail(
        "AUTH_ACCOUNT_CHANGED",
        "The authorized account or root changed.",
      );
    if (id === "dropbox" && (verifyRoot || expected?.length !== identity.length)) {
      // Test the same implicit root used by the existing Basic adapter.
      const response = await http("https://api.dropboxapi.com/2/files/list_folder", {
        method: "POST",
        headers: {Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json"},
        body: '{"path":"","limit":1}',
      }, signal);
      if (!response.ok) throw fail("AUTH_ROOT_UNAVAILABLE",
        `Dropbox could not verify the authorized root (HTTP ${response.status}).`,
        "Refresh or Reconnect using the original Dropbox account.");
      // The listing itself is not used or retained.
      await response.body?.cancel().catch(() => {});
    }
    return identity;
  }
  async function exchange(id, parameters, oldScopes, signal) {
    const response = await http(ENDPOINTS[id].token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: client(id), ...parameters }),
    }, signal);
    // Never include raw OAuth descriptions, codes or bodies in user errors/logs.
    let result;
    try {
      result = await response.json();
    } catch {
      throw fail(
        "AUTH_RESPONSE_INVALID",
        "Authorization provider returned an invalid token response.",
      );
    }
    if (!response.ok) {
      const registration = /\b(AADSTS(?:9002326|9002327|50011))\b/.exec(result?.error_description ?? "")?.[1];
      if (registration || result?.error === "invalid_client")
        throw fail("OAUTH_CONFIG_REQUIRED", `The provider rejected the OAuth registration${registration ? ` (${registration})` : ""}.`);
      if (result?.error === "invalid_grant" && parameters.grant_type === "refresh_token")
        throw fail("AUTH_REVOKED", "The provider no longer accepts the saved grant.");
    }
    if (
      !response.ok ||
      typeof result?.access_token !== "string" ||
      !result.access_token ||
      !Number.isFinite(result.expires_in) ||
      result.expires_in <= 0
    )
      throw fail(
        "AUTH_TOKEN_REJECTED",
        `Authorization could not be renewed (HTTP ${response.status}).`,
      );
    const scopes =
      typeof result.scope === "string"
        ? result.scope.split(/\s+/).filter(Boolean)
        : oldScopes || [];
    if (!granted(id, scopes))
      throw fail(
        "AUTH_SCOPE_REQUIRED",
        "Upload and verification permissions have not been granted.",
      );
    return {
      accessToken: result.access_token,
      refreshToken: typeof result.refresh_token === "string" ? result.refresh_token : undefined,
      expiresAt: now() + result.expires_in * 1000,
      scopes,
    };
  }
  async function browserCall(method, args) {
    if (typeof chrome.identity?.[method] !== "function")
      throw fail("AUTH_BROWSER_UNSUPPORTED", "This browser does not support the extension's configured sign-in flow.");
    try {
      return await chrome.identity[method](args);
    } catch (error) {
      throw browserAuthFailure(error);
    }
  }

  async function interactive(id, signal, open) {
    const session = chrome.storage?.session;
    if (!session?.get || !session.set || !session.remove)
      throw fail("AUTH_BROWSER_UNSUPPORTED", "This browser cannot safely track a sign-in across worker restarts.");
    const pendingKey = `redownRemoteBasicV1:pendingOAuth:${id}`;
    const current = await storage(async () => (await session.get(pendingKey))[pendingKey]);
    const started = now();
    const age = started - current?.started;
    if (age >= 0 && age < OAUTH_WINDOW_MS) throw connecting();
    const marker = {id: crypto.randomUUID(), started};
    signal.throwIfAborted();
    await storage(() => session.set({[pendingKey]: marker}));
    try {
      signal.throwIfAborted();
      const response = await open();
      signal.throwIfAborted();
      if (now() - started < 0 || now() - started > OAUTH_WINDOW_MS)
        throw fail("AUTH_WINDOW_TIMEOUT", "The sign-in window expired.");
      return response;
    } finally {
      // Chrome delivers this response only to the caller that opened the flow.
      // A restarted worker never redeems a callback from this marker.
      await storage(async () => {
        if ((await session.get(pendingKey))[pendingKey]?.id === marker.id)
          await session.remove(pendingKey);
      }).catch(() => {});
    }
  }

  async function googleToken(prompt, expected, ticket, signal) {
    async function read(allowPrompt) {
      signal.throwIfAborted();
      const request = () => browserCall("getAuthToken", {
        interactive: allowPrompt,
        scopes: AUTH_SCOPES.google,
        enableGranularPermissions: true,
      });
      const result = allowPrompt ? await interactive("google", signal, request) : await request();
      const accessToken = typeof result === "string" ? result : result?.token;
      const scopes = typeof result === "string" ? AUTH_SCOPES.google : result?.grantedScopes;
      if (!accessToken) throw fail("AUTH_REQUIRED", "Google did not supply an extension access token.");
      if (!granted("google", scopes))
        throw fail("AUTH_SCOPE_REQUIRED", "Google Drive upload permission was not granted.");
      return {accessToken, scopes};
    }
    let token = await read(prompt), identity;
    try {
      identity = await probe("google", token.accessToken, expected, signal);
    } catch (error) {
      if (error.httpStatus !== 401) throw error;
      signal.throwIfAborted();
      if (slots.google.epoch !== ticket) throw changed();
      await browserCall("removeCachedAuthToken", {token: token.accessToken});
      // One passive retry of an expired cached token. Never open a second popup.
      token = await read(false);
      identity = await probe("google", token.accessToken, expected, signal);
    }
    return {...token, identity};
  }

  async function oauthToken(id, record, ticket, signal) {
    let renewed = false;
    async function renew() {
      const token = await exchange(id, {
        grant_type: "refresh_token",
        refresh_token: record.refreshToken,
        ...(id === "onedrive" ? {scope: AUTH_SCOPES[id].join(" ")} : {}),
      }, record.scopes, signal);
      record = {...record, ...token, refreshToken: token.refreshToken || record.refreshToken};
      // This is still bound to the previously verified identity. Store the
      // possibly rotated grant before any follow-up probe or worker suspension.
      await save(id, record, ticket, signal);
      renewed = true;
    }
    if (!record.accessToken || !Number.isFinite(record.expiresAt) || record.expiresAt <= now() + 60000)
      await renew();
    let identity;
    try {
      identity = await probe(id, record.accessToken, record.identity, signal);
    } catch (error) {
      if (renewed || error.httpStatus !== 401) throw error;
      await renew();
      identity = await probe(id, record.accessToken, record.identity, signal);
    }
    if (identity.length !== record.identity.length)
      await save(id, {...record, identity}, ticket, signal);
    return {accessToken:record.accessToken, identity};
  }

  function flight(slot, name, ms, timeoutError, work) {
    if (slot[name]) return slot[name].result;
    const controller = new AbortController(), ticket = slot.epoch;
    const {signal} = controller;
    const timeout = setTimeout(() => controller.abort(timeoutError()), ms);
    const aborted = new Promise((_, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), {once: true});
    });
    const running = Promise.resolve().then(() => work(ticket, signal));
    const result = Promise.race([running, aborted]).finally(() => clearTimeout(timeout));
    slot[name] = {result, ticket};
    // Keep the slot until an uncancellable browser request actually settles.
    // Deadlines release callers. They cannot authorize another popup or write.
    const clear = () => { slot[name] = undefined; };
    void running.then(clear, clear);
    return result;
  }

  function rememberRecord(id, record) {
    slots[id].connected = Boolean(record?.connected);
    slots[id].binding = Array.isArray(record?.identity) ? record.identity : null;
  }
  function ready(id) {
    return {provider: id, connected: true, authorized: true, ready: true, phase: "ready",
      reason: "READY", nextAction: "Right-click a supported file to save."};
  }
  function unavailable(id, error) {
    const {code: reason, message, nextAction} = safeError(error);
    const {connected = false} = slots[id];
    const phase = {
      AUTH_CONNECTING: "connecting", AUTH_CHANGED: "checking",
      AUTH_STORAGE_UNAVAILABLE: "storage-unavailable",
      AUTH_BROWSER_UNSUPPORTED: "browser-api-unsupported",
      AUTH_NETWORK: "network-temporary", AUTH_CHECK_TIMEOUT: "network-temporary",
      AUTH_REQUIRED: connected ? "reconnect-needed" : "disconnected",
      AUTH_SCOPE_REQUIRED: "reconnect-needed", AUTH_REVOKED: "reconnect-needed",
      AUTH_ACCOUNT_CHANGED: "reconnect-needed",
    }[reason] ?? "auth-failed";
    return {provider: id, connected, authorized: false, ready: false, phase, reason, message, nextAction};
  }
  function publish(status) {
    try { onStatus(status); } catch {}
    return status;
  }
  function authorization(id) {
    valid(id);
    const slot = slots[id];
    if (slot.login) return Promise.reject(connecting());
    if (slot.check && slot.check.ticket !== slot.epoch) return Promise.reject(changed());
    slot.checked = undefined;
    return flight(slot, "check", checkTimeoutMs, () => fail(
      "AUTH_CHECK_TIMEOUT", "Authorization could not be checked in time.",
      "Check browser storage and connectivity, then Refresh.",
    ), async (ticket, signal) => {
      client(id);
      await secure();
      signal.throwIfAborted();
      const record = await load(id);
      if (slot.epoch !== ticket) throw changed();
      rememberRecord(id, record);
      if (id === "google" && typeof chrome.identity?.getAuthToken !== "function")
        throw fail("AUTH_BROWSER_UNSUPPORTED", "Google Drive needs the browser's extension token API.");
      if (!record?.connected || (id !== "google" && !record.refreshToken))
        throw fail("AUTH_REQUIRED", "Sign In to authorize this extension before saving.");
      if (!granted(id, record.scopes))
        throw fail("AUTH_SCOPE_REQUIRED", "Required upload permissions are missing.");
      if (!Array.isArray(record.identity) || !record.identity.length)
        throw fail("AUTH_REQUIRED", "Reconnect to verify the saved account.");
      const {accessToken, identity} = id === "google"
        ? await googleToken(false, record.identity, ticket, signal)
        : await oauthToken(id, record, ticket, signal);
      signal.throwIfAborted();
      if (slot.epoch !== ticket || slot.login) throw changed();
      return {accessToken, identity};
    });
  }
  async function status(id, broadcast = false) {
    valid(id);
    const slot = slots[id], ticket = slot.epoch;
    let result;
    try {
      await authorization(id);
      result = ready(id);
    } catch (error) {
      result = unavailable(id, error);
    }
    if (slot.epoch !== ticket) return slot.checked?.result ?? unavailable(id, changed());
    if (!slot.login) {
      slot.checked = {result, at: now()};
      if (broadcast) publish(result);
    }
    return result;
  }
  function snapshot(id) {
    valid(id);
    const slot = slots[id];
    if (slot.login) return unavailable(id, connecting());
    const age = now() - slot.checked?.at;
    const maxAge = slot.checked?.result.ready ? STATUS_FRESH_MS : 3000;
    if (!slot.check && age >= 0 && age < maxAge) return slot.checked.result;
    return status(id);
  }

  async function pkce(id, clientId, signal) {
    if (typeof chrome.identity?.getRedirectURL !== "function")
      throw fail("AUTH_BROWSER_UNSUPPORTED", "This browser does not support provider redirects.");
    const redirect = chrome.identity.getRedirectURL(id);
    if (redirect !== `https://${chrome.runtime.id}.chromiumapp.org/${id}`)
      throw fail("OAUTH_CONFIG_REQUIRED", "The browser returned an unexpected extension redirect.");
    const nonce = b64(crypto.getRandomValues(new Uint8Array(32)));
    const verifier = b64(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = b64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
    const authorize = new URL(ENDPOINTS[id].authorize);
    authorize.search = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirect,
      code_challenge: challenge,
      code_challenge_method: "S256",
      state: nonce,
      scope: AUTH_SCOPES[id].join(" "),
      ...(id === "dropbox" ? {token_access_type: "offline"} : {response_mode: "query"}),
    });
    const request = () => browserCall("launchWebAuthFlow", {url: authorize.href, interactive: true});
    const response = await interactive(id, signal, request);
    const callback = URL.parse(response);
    if (!callback)
      throw fail("AUTH_CALLBACK_MISSING", "The browser closed sign-in without returning an authorization callback.",
        "Check the registered extension redirect, then retry sign-in.");
    if (callback.origin + callback.pathname !== redirect ||
        callback.hash || callback.username || callback.password ||
        callback.searchParams.getAll("state").length !== 1 ||
        callback.searchParams.get("state") !== nonce)
      throw fail("AUTH_CALLBACK_INVALID", "Authorization callback was mismatched or invalid.");
    if (callback.searchParams.has("error")) {
      const reason = callback.searchParams.get("error");
      if (reason === "access_denied") throw fail("AUTH_CANCELLED", "Provider authorization was declined.");
      if (reason === "invalid_client" || reason === "unauthorized_client")
        throw fail("OAUTH_CONFIG_REQUIRED", "The provider rejected the registered OAuth client.");
      throw fail("AUTH_CALLBACK_REJECTED", "The provider could not complete the authorization callback.");
    }
    const codes = callback.searchParams.getAll("code");
    if (codes.length !== 1 || !codes[0])
      throw fail("AUTH_CALLBACK_INVALID", "Authorization callback did not contain a single code.");
    return exchange(id, {
      grant_type: "authorization_code",
      code: codes[0],
      code_verifier: verifier,
      redirect_uri: redirect,
      ...(id === "onedrive" ? {scope: AUTH_SCOPES[id].join(" ")} : {}),
    }, undefined, signal);
  }
  async function connect(id) {
    valid(id);
    const slot = slots[id];
    return flight(slot, "login", OAUTH_WINDOW_MS, () => fail(
      "AUTH_WINDOW_TIMEOUT", "The sign-in window could not complete in time.",
      "Close the authorization window and try again.",
    ), async (ticket, signal) => {
      slot.checked = undefined;
      const clientId = client(id);
      const method = id === "google" ? "getAuthToken" : "launchWebAuthFlow";
      if (typeof chrome.identity?.[method] !== "function")
        throw fail("AUTH_BROWSER_UNSUPPORTED", "This browser does not support the extension's configured sign-in flow.");
      await secure();
      signal.throwIfAborted();
      const previous = await load(id);
      rememberRecord(id, previous);
      const expected = previous?.identity;
      let record;
      if (id === "google") {
        // Chrome owns Google's token cache. Keep existing consent intact and
        // evict only a token Drive actually rejects with 401.
        const {scopes, identity} = await googleToken(true, expected, ticket, signal);
        record = {connected: true, scopes, identity};
      } else {
        const candidate = await pkce(id, clientId, signal);
        if (!candidate.refreshToken)
          throw fail("AUTH_OFFLINE_REQUIRED", "Offline authorization was not granted.");
        const identity = await probe(id, candidate.accessToken, expected, signal, true);
        record = {...candidate, identity, connected: true};
      }
      await save(id, record, ticket, signal, true);
      rememberRecord(id, record);
      const result = ready(id);
      slot.checked = {result, at: now()};
      return publish(result);
    });
  }
  return {status, snapshot, connect, reconnect: connect, authorization,
    token: async id => (await authorization(id)).accessToken,
    binding: id => slots[id]?.binding ?? null,
    refresh: id => status(id, true)};
}
