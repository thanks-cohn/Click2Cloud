import test from "node:test";
import assert from "node:assert/strict";
import { createAuth, AUTH_SCOPES, DROPBOX_PREVIEW_SCOPE } from "../src/basic/lib/auth.js";
const NOW = 1700000000000;
const json = (value, status = 200) =>
  new Response(JSON.stringify(value), { status });
function setup({
  id = "dropbox",
  initial,
  expired = false,
  missingScope = false,
  cancelled = false,
  badState = false,
  denied = false,
  revoked = false,
  accountChanged = false,
  noConfig = false,
  noScopeResponse = false,
  noExpiry = false,
  holdFirstToken = false,
  holdPopup = false,
  browserError,
  staleGoogle = false,
  badNamespace = false,
  dropboxPreviewGranted = false,
  badRoot = false,
  distinctRotations = false,
  failProbeAfterExchange = false,
  hangGoogle = false,
  checkTimeoutMs,
} = {}) {
  let releaseToken, firstTokenStarted, secondTokenStarted;
  const gate = new Promise((resolve) => {
    releaseToken = resolve;
  });
  const waitForToken = new Promise((resolve) => {
    firstTokenStarted = resolve;
  });
  const waitForSecondToken = new Promise((resolve) => {
    secondTokenStarted = resolve;
  });
  let time = NOW, releasePopup, popupStarted;
  const pendingPopup = new Promise(resolve => {releasePopup = resolve;});
  const waitForPopup = new Promise(resolve => {popupStarted = resolve;});
  let exchanges = 0, googleProbes = 0;
  const store = {}, session = {}, statusEvents = [];
  if (initial)
    store["redownRemoteBasicV1:auth:" + id] = {
      connected: true,
      accessToken: "access",
      refreshToken: "refresh",
      expiresAt: expired ? NOW - 1 : noExpiry ? undefined : NOW + 3600000,
      scopes: missingScope ? [] : AUTH_SCOPES[id],
      identity:
        id === "dropbox"
          ? ["account"]
          : id === "onedrive"
            ? ["account", "root"]
            : ["account"],
    };
  const calls = [],
    popups = [],
    native = [],
    levels = [];
  const chrome = {
    storage: {
      local: {
        get: async (key) => ({ [key]: store[key] }),
        set: async (value) => Object.assign(store, value),
        remove: async (key) => {
          delete store[key];
        },
        setAccessLevel: async (level) => levels.push(level),
      },
      session: {
        get: async key => ({[key]: session[key]}),
        set: async value => Object.assign(session, value),
        remove: async key => {delete session[key];},
      },
    },
    runtime: {
      id: "independent",
      getManifest: () => ({
        oauth2: {
          client_id: noConfig
            ? "CONFIGURE_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
            : "123-own.apps.googleusercontent.com",
        },
      }),
    },
    identity: {
      getRedirectURL: (id) => `https://independent.chromiumapp.org/${id}`,
      getAuthToken: async (options) => {
        native.push(options);
        if (hangGoogle) await gate;
        if (browserError || cancelled) throw Error(browserError ?? "The user did not approve access. Private popup details.");
        return {
          token: "google-access",
          grantedScopes: missingScope ? [] : AUTH_SCOPES.google,
        };
      },
      removeCachedAuthToken: async (options) =>
        calls.push({ removed: options.token }),
      launchWebAuthFlow: async (options) => {
        popups.push(options);
        popupStarted();
        if (holdPopup) await pendingPopup;
        if (cancelled) throw Error("The user closed the authorization window. Private popup details.");
        const url = new URL(options.url);
        const redirect = new URL(url.searchParams.get("redirect_uri"));
        redirect.searchParams.set(
          "state",
          badState ? "other-state" : url.searchParams.get("state"),
        );
        redirect.searchParams.set(
          denied ? "error" : "code",
          denied ? "access_denied" : "authorization-code",
        );
        return redirect.href;
      },
    },
  };
  const fetch = async (url, options) => {
    calls.push({ url, options });
    if (url.includes("/oauth2/token") || url.endsWith("/v2.0/token")) {
      const exchange = ++exchanges;
      if (exchange === 2) secondTokenStarted();
      if (holdFirstToken && exchange === 1) {
        firstTokenStarted();
        await gate;
      }
      return json({
        access_token: "new-access",
        refresh_token: distinctRotations ? "rotation-" + exchange : "rotated-refresh",
        expires_in: 3600,
        ...(!noScopeResponse
          ? { scope: missingScope ? "User.Read" : url.includes("dropboxapi")&&dropboxPreviewGranted
            ? [...AUTH_SCOPES.dropbox,DROPBOX_PREVIEW_SCOPE].join(" ")
            : AUTH_SCOPES[url.includes("dropboxapi") ? "dropbox" : "onedrive"].join(" ") }
          : {}),
      });
    }
    if (revoked || (staleGoogle && url.includes("googleapis") && ++googleProbes === 1))
      return json({ secret: "never exposed" }, 401);
    if (failProbeAfterExchange && exchanges === 1) throw TypeError("private connection details");
    const account = accountChanged ? "other-account" : "account";
    if (url.includes("googleapis"))
      return json({ user: { permissionId: account } });
    if (url.endsWith("/files/list_folder")) return json({entries: []});
    if (url.includes("dropboxapi"))
      return json({ account_id: account, root_info: {home_namespace_id: badNamespace ? "1002" : "1001"} });
    return json({ id: url.includes("root?") ? (badRoot ? "other-root" : "root") : account });
  };
  const restart = () => createAuth({
      chrome,
      fetch,
      config: {
        clientIds: noConfig
          ? {}
          : { dropbox: "own-key", onedrive: "own-client" },
      },
      now: () => time,
      onStatus: result => statusEvents.push(result),
      checkTimeoutMs,
  });
  return {
    auth: restart(),
    restart,
    advance: ms => {time += ms;},
    chrome,
    session,
    statusEvents,
    calls,
    popups,
    native,
    store,
    levels,
    releaseToken,
    waitForToken,
    waitForSecondToken,
    waitForPopup,
    releasePopup,
  };
}
for (const id of ["google", "dropbox", "onedrive"]) {
  test(`${id}: absent OAuth config is not confused with website login`, async () => {
    const f = setup({ id, noConfig: true });
    const status = await f.auth.status(id);
    assert.equal(status.ready, false);
    assert.equal(status.connected, false);
    assert.equal(status.reason, "OAUTH_CONFIG_REQUIRED");
    assert.equal(f.popups.length, 0);
    assert.equal(f.calls.length, 0);
  });
  test(`${id}: valid refresh checks real provider without interactive popup`, async () => {
    const f = setup({ id, initial: true });
    const status = await f.auth.refresh(id);
    assert.equal(status.ready, true);
    assert.equal(status.connected, true);
    assert.equal(status.authorized, true);
    assert.equal(f.popups.length, 0);
    assert.ok(f.native.every((o) => o.interactive === false));
    assert.ok(!f.calls.some((c) => c.url?.includes("/token")));
  });
  test(`${id}: revoked access makes readiness false, even with prior connection and website cookies`, async () => {
    const f = setup({ id, initial: true, revoked: true });
    const status = await f.auth.status(id);
    assert.equal(status.connected, true);
    assert.equal(status.authorized, false);
    assert.equal(status.ready, false);
    assert.equal(status.reason, "AUTH_REVOKED");
    assert.equal(f.popups.length, 0);
    if (id === "google")
      assert.ok(f.calls.some((c) => c.removed === "google-access"));
  });

for (const id of ["google", "dropbox", "onedrive"]) {
  test(`${id}: reconnect cancellation and changed identity keep the original grant`, async () => {
    for (const [options, code] of [
      [{cancelled: true}, "AUTH_CANCELLED"],
      [{accountChanged: true}, "AUTH_ACCOUNT_CHANGED"],
    ]) {
      const f = setup({id, initial: true, ...options});
      const persisted = structuredClone(f.store);
      await assert.rejects(f.auth.reconnect(id), {code});
      assert.deepEqual(f.store, persisted);
      assert.deepEqual(f.session, {});
    }
  });
}

test("Google's unsupported, setup, network and unknown browser failures never read as cancellation", async () => {
  for (const [browserError, code] of [
    ["This function is not supported. Private details", "AUTH_BROWSER_UNSUPPORTED"],
    ["OAuth2 request failed: bad client id private", "OAUTH_CONFIG_REQUIRED"],
    ["Authorization page could not be loaded. private", "AUTH_NETWORK"],
    ["Unexpected private provider details", "AUTH_BROWSER_FAILED"],
  ]) {
    const f = setup({id: "google", browserError});
    await assert.rejects(f.auth.connect("google"), error => error.code === code && !error.message.includes("private"));
    assert.deepEqual(f.store, {});
  }
  const unsupported = setup({id: "google", initial: true});
  delete unsupported.chrome.identity.getAuthToken;
  assert.equal((await unsupported.auth.status("google")).phase, "browser-api-unsupported");
  await assert.rejects(unsupported.auth.connect("google"), {code: "AUTH_BROWSER_UNSUPPORTED"});
  assert.equal((await unsupported.auth.connect("onedrive")).ready, true);
});

test("Concurrent OAuth joins one provider flight and restart won't open a duplicate window", async () => {
  const f = setup({holdPopup: true});
  const first = f.auth.connect("dropbox");
  await f.waitForPopup;
  const same = f.auth.reconnect("dropbox");
  const restarted = f.restart();
  await assert.rejects(restarted.connect("dropbox"), {code: "AUTH_CONNECTING"});
  assert.equal((await f.auth.status("dropbox")).phase, "connecting");
  assert.equal((await f.auth.status("onedrive")).phase, "disconnected");
  assert.equal(f.popups.length, 1);
  assert.deepEqual(Object.keys(Object.values(f.session)[0]).sort(), ["id", "started"]);
  f.releasePopup();
  const both = await Promise.all([first, same]);
  assert(both.every(result => result.ready));
  assert.equal(f.statusEvents.length, 1);
  assert.deepEqual(f.session, {});
  assert.equal((await restarted.status("dropbox")).ready, true);
  assert.equal(f.popups.length, 1);
});

test("A hung Google token request releases callers without stacking requests or blocking Dropbox", async () => {
  const f = setup({id: "google", initial: true, hangGoogle: true, checkTimeoutMs: 35});
  const hung = f.auth.status("google");
  const dropbox = await f.auth.connect("dropbox");
  assert.equal(dropbox.ready, true);
  assert.equal((await hung).reason, "AUTH_CHECK_TIMEOUT");
  assert.equal((await f.auth.refresh("google")).reason, "AUTH_CHECK_TIMEOUT");
  assert.equal(f.native.length, 1);
  f.releaseToken();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await f.auth.refresh("google")).ready, true);
});

test("Passive Google status and Refresh never request a browser grant before recorded Sign In", async () => {
  const f = setup({id: "google"});
  const status = await f.auth.snapshot("google");
  assert.equal(status.phase, "disconnected");
  assert.equal((await f.auth.refresh("google")).ready, false);
  assert.deepEqual(f.native, []);
  assert.deepEqual(f.store, {});
});

test("Dropbox preserves legacy account binding, verifies today's root, and rejects a changed namespace", async () => {
  const f = setup({id: "dropbox", initial: true});
  assert.equal((await f.auth.status("dropbox")).ready, true);
  assert.deepEqual(f.store["redownRemoteBasicV1:auth:dropbox"].identity, ["account", "1001"]);
  assert.equal(f.calls.filter(c => c.url?.endsWith("/files/list_folder")).length, 1);
  const checked = f.calls.length;
  assert.equal((await f.auth.snapshot("dropbox")).ready, true);
  assert.equal(f.calls.length, checked);
  const moved = setup({id: "dropbox", initial: true, badNamespace: true});
  moved.store["redownRemoteBasicV1:auth:dropbox"].identity.push("1001");
  await assert.rejects(moved.auth.token("dropbox"), {code: "AUTH_ACCOUNT_CHANGED"});
  await assert.rejects(moved.auth.reconnect("dropbox"), {code: "AUTH_ACCOUNT_CHANGED"});
  assert.deepEqual(moved.store["redownRemoteBasicV1:auth:dropbox"].identity, ["account", "1001"]);
});

test('Dropbox History consent requests only the optional read scope and keeps the save grant on denial or account change',async()=>{
  const record='redownRemoteBasicV1:auth:dropbox';
  const expected=['account','1001'];
  const f=setup({initial:true,dropboxPreviewGranted:true});
  await f.auth.status('dropbox');
  assert.equal(f.popups.length,0);
  await f.auth.reconnect('dropbox',expected);
  const requested=new URL(f.popups[0].url).searchParams.get('scope').split(' ');
  assert.deepEqual(requested,[...AUTH_SCOPES.dropbox,DROPBOX_PREVIEW_SCOPE]);
  assert(f.store[record].scopes.includes(DROPBOX_PREVIEW_SCOPE));
  assert.deepEqual(f.store[record].identity,expected);
  for(const [options,code] of [
    [{},'PREVIEW_READ_SCOPE_MISSING'],
    [{cancelled:true},'AUTH_CANCELLED'],
    [{dropboxPreviewGranted:true,badNamespace:true},'AUTH_ACCOUNT_CHANGED']
  ]){
    const attempt=setup({initial:true,...options}),before=structuredClone(attempt.store);
    await assert.rejects(attempt.auth.reconnect('dropbox',expected),{code});
    assert.deepEqual(attempt.store,before);
  }
  const other=setup({initial:true});
  await assert.rejects(other.auth.reconnect('dropbox',['other','1001']),{code:'AUTH_ACCOUNT_CHANGED'});
  assert.equal(other.popups.length,0);
});

test("OneDrive refuses a changed root for both a save and interactive replacement", async () => {
  const f = setup({id: "onedrive", initial: true, badRoot: true});
  const persisted = structuredClone(f.store);
  await assert.rejects(f.auth.token("onedrive"), {code: "AUTH_ACCOUNT_CHANGED"});
  await assert.rejects(f.auth.reconnect("onedrive"), {code: "AUTH_ACCOUNT_CHANGED"});
  assert.deepEqual(f.store, persisted);
});

for (const id of ["dropbox", "onedrive"]) {
  test(`${id}: runtime restart and 24/48-hour expiry reuse offline authorization with rotated refresh persistence`, async () => {
    const f = setup({id, initial: true, distinctRotations: true});
    for (let day = 1; day <= 2; day++) {
      f.advance(24 * 60 * 60 * 1000);
      assert.equal((await f.restart().refresh(id)).ready, true);
      assert.equal(f.store["redownRemoteBasicV1:auth:" + id].refreshToken, "rotation-" + day);
    }
    const exchanges = f.calls.filter(c => c.url?.includes("/token"));
    assert.equal(exchanges.length, 2);
    assert.equal(exchanges[1].options.body.get("refresh_token"), "rotation-1");
    assert.equal(f.popups.length, 0);
  });
  test(`${id}: cancelled reconnect doesn't discard credentials that refresh concurrently`, async () => {
    const f = setup({id, initial: true, expired: true, holdFirstToken: true, cancelled: true});
    const checked = f.auth.token(id);
    await f.waitForToken;
    await assert.rejects(f.auth.reconnect(id), {code: "AUTH_CANCELLED"});
    f.releaseToken();
    assert.equal(await checked, "new-access");
    assert.equal(f.store["redownRemoteBasicV1:auth:" + id].refreshToken, "rotated-refresh");
  });
  test(`${id}: rotation survives a failed post-exchange identity probe without claiming ready`, async () => {
    const f = setup({id, initial: true, expired: true, failProbeAfterExchange: true, distinctRotations: true});
    const failed = await f.auth.refresh(id);
    assert.equal(failed.phase, "network-temporary");
    assert.equal(failed.authorized, false);
    assert.doesNotMatch(failed.message, /private/);
    assert.equal(f.store["redownRemoteBasicV1:auth:" + id].refreshToken, "rotation-1");
    f.advance(24 * 60 * 60 * 1000);
    assert.equal((await f.restart().refresh(id)).ready, true);
    assert.equal(f.calls.filter(c => c.url?.includes("/token"))[1].options.body.get("refresh_token"), "rotation-1");
  });
}
  test(`${id}: missing scopes require targeted approval instead of assuming ready`, async () => {
    const f = setup({ id, initial: true, missingScope: true });
    const status = await f.auth.status(id);
    assert.equal(status.ready, false);
    assert.equal(status.authorized, false);
    assert.equal(status.reason, "AUTH_SCOPE_REQUIRED");
    assert.match(status.nextAction, /Reconnect\/Approve/);
    assert.equal(f.popups.length, 0);
  });
  test(`${id}: cancelled sign-in preserves safe reason and no refresh credential`, async () => {
    const f = setup({ id, cancelled: true });
    await assert.rejects(f.auth.connect(id), { code: "AUTH_CANCELLED" });
    assert.equal(f.store["redownRemoteBasicV1:auth:" + id], undefined);
  });
  test(`${id}: account switch detected instead of silently changing destination`, async () => {
    const f = setup({ id, initial: true, accountChanged: true });
    const status = await f.auth.status(id);
    assert.equal(status.ready, false);
    assert.equal(status.reason, "AUTH_ACCOUNT_CHANGED");
  });
}
for (const id of ["dropbox", "onedrive"]) {
  test(`${id}: PKCE uses independent client, exact redirect/state and stores verified rotated token`, async () => {
    const f = setup({ id });
    assert.equal((await f.auth.connect(id)).ready, true);
    const u = new URL(f.popups[0].url);
    assert.equal(
      u.searchParams.get("client_id"),
      id === "dropbox" ? "own-key" : "own-client",
    );
    assert.equal(u.searchParams.get("code_challenge_method"), "S256");
    assert.equal(u.searchParams.get("code_challenge").length, 43);
    const exchange = f.calls.find((c) => c.url.includes("/token"));
    assert.equal(exchange.options.body.get("code_verifier").length, 43);
    assert.equal(exchange.options.body.get("client_secret"), null);
    assert.equal(f.store["redownRemoteBasicV1:auth:" + id].refreshToken, "rotated-refresh");
    assert.ok(f.levels.every((v) => v.accessLevel === "TRUSTED_CONTEXTS"));
  });
  test(`${id}: expired and missing-expiry access tokens silently refresh without forcing OAuth`, async () => {
    for (const options of [{ expired: true }, { noExpiry: true }]) {
      const f = setup({ id, initial: true, ...options });
      assert.equal(await f.auth.token(id), "new-access");
      assert.equal(f.popups.length, 0);
      assert.equal(f.store["redownRemoteBasicV1:auth:" + id].refreshToken, "rotated-refresh");
      assert.equal(f.calls.filter((c) => c.url.includes("/token")).length, 1);
    }
  });
  test(`${id}: wrong callback state rejected before token exchange`, async () => {
    const f = setup({ id, badState: true });
    await assert.rejects(f.auth.connect(id), { code: "AUTH_CALLBACK_INVALID" });
    assert.equal(f.calls.length, 0);
  });
  test(`${id}: provider-denied consent has safe actionable error`, async () => {
    const f = setup({ id, denied: true });
    await assert.rejects(f.auth.connect(id), { code: "AUTH_CANCELLED" });
    assert.equal(f.calls.length, 0);
  });
  test(`${id}: missing token scope cannot authenticate new client, refresh may retain verified prior scopes`, async () => {
    const f = setup({ id, noScopeResponse: true });
    await assert.rejects(f.auth.connect(id), { code: "AUTH_SCOPE_REQUIRED" });
    const old = setup({
      id,
      initial: true,
      expired: true,
      noScopeResponse: true,
    });
    assert.equal((await old.auth.refresh(id)).ready, true);
  });
  test(`${id}: concurrent refresh callers share one token exchange`, async () => {
    const f = setup({ id, initial: true, expired: true });
    const tokens = await Promise.all([
      f.auth.token(id),
      f.auth.token(id),
      f.auth.token(id),
    ]);
    assert.deepEqual(tokens, ["new-access", "new-access", "new-access"]);
    assert.equal(f.calls.filter((c) => c.url.includes("/token")).length, 1);
  });
}
test("unknown provider is rejected before touching OAuth", async () => {
  const f = setup();
  await assert.rejects(f.auth.connect("r2"), { code: "PROVIDER_INVALID" });
});
test("Google reconnect preserves valid Chrome consent and only retries a real 401 noninteractively", async () => {
  const f = setup({ id: "google", initial: true });
  assert.equal((await f.auth.reconnect("google")).ready, true);
  assert.equal(f.calls.filter(c => c.removed).length, 0);
  assert.deepEqual(f.native.map(v => v.interactive), [true]);
  const expired = setup({id: "google", initial: true, staleGoogle: true});
  assert.equal((await expired.auth.reconnect("google")).ready, true);
  assert.equal(expired.calls.filter(c => c.removed).length, 1);
  assert.deepEqual(expired.native.map(v => v.interactive), [true, false]);
});

for (const id of ["dropbox", "onedrive"])
  test(`${id}: stale in-flight refresh cannot overwrite a newer explicit connection`, async () => {
    const f = setup({ id, initial: true, expired: true, holdFirstToken: true, distinctRotations: true });
    const old = f.auth.token(id);
    const rejection = assert.rejects(old, { code: "AUTH_CHANGED" });
    await f.waitForToken;
    // Start the newer connection, let it reach the token exchange, then release
    // the stale exchange. Its old generation must be rejected before persisting.
    const current = f.auth.connect(id);
    await f.waitForSecondToken;
    f.releaseToken();
    await rejection;
    assert.equal((await current).ready, true);
    assert.equal(f.store["redownRemoteBasicV1:auth:" + id].refreshToken, "rotation-2");
  });
