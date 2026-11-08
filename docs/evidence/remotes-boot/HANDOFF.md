# Click2Cloud 0.3.13 — Remotes-first boot and authentication only

Branch: `dev/p0-remotes-boot-login`, based on main `0222969`. Runtime commits: `45661da` and `9d3bbe7`. Exact final source/build/test pins are in verification.json and browser receipts. Extension ID remains `ajppphdiamdobknpamcheohmdbdbeoal`.

## What was repaired

Two failures were reproduced against the actual baseline source:

1. One transient IndexedDB-open exception poisoned the cached CurrentStore opening promise and background dataReady/ready for the worker lifetime. Later loginStatus, getConfiguration and loginBegin all returned **ENGINE_STARTUP_FAILED**, startup cause **STORAGE_UNAVAILABLE**, after the injected one-shot fault ended.
2. The tab click selector matched **the whole `#shell[data-view]` container**, not just header tabs. A real Cloudflare-status descendant click invoked that container's tab handler and immediately replaced Remotes. This explains a concrete source mechanism for inert/reset controls. The selector now matches only header navigation buttons; current runtime tests assert the layout container has no tab handler.

The original owner's exact Windows exception was not captured. The receipts prove these source mechanisms, not an invented Windows stack trace.

Authentication/capability APIs now run independently of CURRENT and native menu initialization. Credential-storage access is still required and trusted; failed access/open attempts can recover on a new request. CurrentStore integrity and prior-native missing-record checks still protect every state-dependent operation. No fake empty configuration is supplied. Health inspections report storage/native/backup separately and return a completed read-only envelope even when a component is blocked.

Normal login performs **OAuth + account identity verification only**. Both automatic setup paths were removed: API loginBegin and OAuth onConnected no longer initialize Cloudflare or reconcile menus. A pending identity can use the existing loginBegin with verifyOnly. Saved setup approval remains durable but is not a trigger for login-time work. Explicit approved setup/repair APIs remain available when the user selects them.

Remotes renders immediately before optional reads. Slow/failed config, native registration, history or capabilities cannot replace it with a startup apology/Retry screen. One bounded quiet retry applies only to transient boot reads; genuine corrupt/missing records remain visible in a small diagnostic card. The existing login/connection element is retained safely when provider details detach it. Synchronous/asynchronous action errors are visible, and late callbacks cannot select another tab.

Fresh documents start on Remotes. Chrome 141+ actual sidePanel.onOpened events also return a **retained** Shelf to Remotes, close stale dialogs and affect only the containing window. This is not implemented using ordinary focus, visibility or OAuth return, which would steal the selected tab. Chrome's official event/field reference was checked; live installed event behavior remains an external gate.

## Verification

**Final: 272 focused PASS / 0 FAIL; 14 boot/login runtime PASS plus 2 baseline REPRODUCED; 30 broader product-browser PASS / 3 BLOCKED / 1 NOT_TESTED; 15 image/layout PASS.** Runtime source: `9d3bbe79f2ef5a58573f2a72d2aa1c01f1e0f513`, clean production source for all final browser receipts. Consult verification.json and full logs for source/build pins. The production-runtime browser harness imports the real Shelf, background, OAuth, API, CurrentStore, sender handler and native registrar. It uses real Chromium and real IndexedDB with explicit simulated Chrome APIs and synthetic provider replies. It tests:

- Healthy startup/login, transient synchronous IDB open, transient trusted-storage access, slow storage, corrupt records and missing established records.
- Explicitly failed/hung native registration while independent login works. Those two tests deliberately start native maintenance; normal boot/login scenarios assert zero menu registrations.
- Offline identity, verify-only recovery, failed token network request with actionable feedback and user retry, cancelled sign-in and late callback.
- Twelve same-profile reloads, a full Chromium process restart, retained-document reopening, own-window targeting, stale hash/attention/navigation, tabs and functional controls.
- Exact saved Simple/Narrow/Depth, Default, Quick choices, approval and configuration equality; corrupt/missing raw records remain unchanged. Authentication does not rewrite them.
- **Zero non-auth provider requests or resource writes during login**, even with a saved setup approval. Token exchange and account identity calls are separately counted. Safe request/response receipts include actual login states and absence of an initialization result.

The existing focused suite, broader product-browser suite and image/layout suite remain separate regression evidence, including local workerd/R2 save/readback. Historical tests expecting automatic setup from login were changed to require an explicit setup invocation; setup permissions, native ACK failure and data preservation assertions remain.

**Evidence limits:** Production-code fixtures are not actual Chrome storage/identity APIs, real MV3 suspension, installed Windows Chrome or live Cloudflare consent. The genuine unpacked-extension attempt is **BLOCKED: UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR**. The executor is Linux; actual Windows startup, real MV3 suspension/wake and live OAuth consent were **NOT TESTED**. No live OAuth/R2 pass is inferred from mocks. No cloud resources were deployed or modified. REDOWN and main remain unchanged by this branch.

## Exact code/API ownership

- extension/app.html / app.mjs: immediate Remotes, independent optional reads, contextual errors, scoped header-tab binding, retained connection controls, stale-intent guards and actual reopen handling.
- extension/background.mjs: retryable trusted-storage access, current-read integrity adapter, auth-only connection notifications, explicit native lifecycle/save owner; one trusted message handler.
- src/api/service.mjs / service.d.ts: auth/introspection independence, verifyOnly on the existing loginBegin, structured current-read diagnostics and health results. No second API or auth endpoint.
- src/auth/cloudflare-oauth.mjs: verified authentication survives notification failure; PKCE, registered scopes, redirect, session/refresh and cancellation fences are unchanged.
- src/persistence/current-store.mjs: clear rejected open attempts / closed cached connection without replaying writes or resetting records.
- src/chrome/provider-panel.mjs: existing Shelf owner forwards actual own-panel open events, without performing setup or authentication.

CURRENT source/behavior documentation is synchronized; immutable prior snapshots remain. AGENTS.md now explicitly states that this owner contract overrides historical automatic next-login redown initialization rules. Complete paths: changed-files.txt.

## Windows CMD acceptance — use the existing profile

```bat
git status --short
git fetch origin
git switch dev/p0-remotes-boot-login
git pull --ff-only
npm ci
npm run test:focused
npm run build:extension
```

Reload the **existing** unpacked extension from the build command's dist/click2cloud path. Confirm version **0.3.13** and the same extension ID. Do not uninstall, clear browser storage, delete destinations or redeploy a Worker.

1. Open Shelf: Remotes must appear first without an apology or Retry. Close/reopen at least 20 times, reload the extension, suspend/wake its worker, and completely restart Chrome. Repeat with an existing session and while signed out. Remotes must be first on actual reopen; merely focusing the browser must preserve the tab you selected.
2. Log in. The real Cloudflare authorization window must start from the button and finish on a truthful authentication state. **End of flow:** no R2/Worker setup, destination/default creation, provider dashboard or native-registration prerequisite. Existing destinations, approval, account and Worker configuration must remain.
3. While sign-in is pending select Settings or Explorer; late OAuth/attention events must not steal that tab. Cancel and retry sign-in, test offline network and restore it, and verify useful failure wording. A failed identity check must not claim Connected.
4. Click Save results, Cloudflare status, Manage Destinations and tabs. Each must open the requested function or explain its own actual limitation. Nested controls must not act as tab buttons. Cloudflare status is an explicit read; setup occurs only if you explicitly choose an approved setup/repair action.
5. Compare existing Simple/Narrow/Depth destinations, Quick/hidden choices and Default before/after reconnect/reload/restart. Do not intentionally corrupt your real profile. The isolated regressions already exercise missing/corrupt state without overwriting it.
6. Existing ready native saves should still use their exact saved destination and independently verified receipt; perform any real write acceptance only under your existing authorized test procedure. No live save is claimed by this boot repair.

If a problem remains, inspect the actual extension service-worker console and request the safe canonical health result:

```js
await globalThis.click2cloud.api.invoke({version:'3+1.1',method:'getEngineHealth',params:{}},'gui')
```

Report only version, state/code, storage/native status and safe stage/causeName. The small Remotes **Local service diagnostics** section likewise preserves the safe failing request/stage. Do not export tokens, Chrome storage dumps, callback URLs, private object data or configuration containing sensitive paths.

The standalone runtime fixture runner is `node scripts/test-boot-login-browser.mjs`. Baseline reproduction expects a read-only git archive of commit 0222969 at /tmp/c2c-boot-before (the managed-environment run records this baseline). It is a production-source fixture test, not an installed-Windows test. Real owner acceptance remains independently required.
