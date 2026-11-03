# Codex V3+1 — Autonomous implementation and live REDOWN-parity acceptance

**Authority:** `thanks-cohn/Click2Cloud` only. The original `thanks-cohn/REDOWN` is a *read-only behavioral reference* and eventual transplant target, not a build/deployment target for this run.

## The mandate
**Execute the entire feasible engineering run without a new user prompt:** inspect, implement, test, repair, commit, push, inspect CI/Cloudflare builds, and report evidence. Never substitute a design document or mock controls for working code. The user's existing authorization allows automated development within the isolated Click2Cloud project and the documented disposable test prefixes; it does not authorize changing R2 subscription/billing, user OAuth consent, external account permissions, or production REDOWN infrastructure.

**Specialized scope:** V3+1 is a modular **right-click destination engine and editor**, NOT a clone of the full REDOWN Explorer/dashboard. Reuse REDOWN's extracted Universal File API and real Worker protocol. Build the minimum practical configuration workbench needed to see and exercise native Chrome context menus, selected directories, Refresh, Activate Buckets, and real save receipts.

## The three independently replaceable modes — hard invariant

Structure (file names illustrative; use clean actual module boundaries):

```text
src/modes/simple/{config,validate,project}.mjs
src/modes/nested/{config,validate,project}.mjs
src/modes/depth/{config,validate,project}.mjs
src/core/{menu-spec,mode-controller,menu-registrar,save-dispatcher}.mjs
src/explorer/*          ← imported REDOWN Universal File API and Cloudflare transport
src/dashboard/*         ← one shared Refresh/activation service; no mode coupling
```

- **Simple** is a flat list of manually configured actionable destinations, default label = final folder component, otherwise bucket name.
- **Nested / Narrow** contains only explicitly configured authorized destinations and their natural ancestors, including explicit `Save here` where an actionable parent also has children.
- **Depth** projects all discovered eligible children to the selected depth (including unconfigured folders), with explicit `Save here` on actionable branches; depth 1–10+ if supported without breaking Chrome limits.
- Each mode owns **its own persisted configuration, revision, validation, projection, tests and migrations**. No mode imports another mode's internal implementation or writes another's config. All consume a shared **read-only** versioned, paginated authenticated inventory snapshot and output the same validated `MenuSpec` and canonical SaveIntent IDs.
- Switching modes NEVER rewrites inactive configurations; editing Simple NEVER changes Nested or Depth. A new actual folder discovery updates read-only inventory without mutating mode preferences. Replacing one module must preserve the other two unchanged.
- The shared mode controller selects which projection is registered. One Chrome native menu registrar with stable IDs and one save dispatcher only; no duplicate roots/listeners.

## REDOWN Refresh and Activate Buckets — actual behavior, not decoration

Existing REDOWN reference: `extension/beta/explorer.html`, `extension/beta/explorer.mjs` (`refreshConnection`, `listing`, `loadAccounts`, `paintActivation`, `prepare.onclick`) and `extension/background.js` (`activateAllBuckets`, `runGlobalActivation`, `preparedProfile`, `deployCloudflareProfile`, `setupRedownQuickDestination`, `reconcileMenus`). Exact source is the authority.

- **Refresh**: when a folder is selected, call `api.run('list',{source})` for its actual objects and cursor, then update its inventory display; without a selection, `api.run('accounts')` and `api.run('buckets')` for real discovery. **Read only. Never provision, deploy, create, reconfigure, or activate from Refresh**. On genuine connectivity/auth failures, report actionable state; do not quietly change the bucket.
- **Activate Buckets**: request the existing REDOWN authenticated `activateAllBuckets` operation after authorization, with `confirmed:true`, existing account/bucket enumeration, per-bucket preparation/Worker capability verification, state persistence, partial/retry-failed semantics and Chrome menu acknowledgement. Never declare Ready until actual status confirms worker, authorized bucket, and native registration. Activation does NOT enroll in R2 billing, automatically grant OAuth permissions, or expose private objects publicly.
- **Normal first run is automatic** after a valid user's explicit Cloudflare connection/approval and verified R2 entitlement: reuse/create lowercase `redown` through REDOWN's `setupRedownQuickDestination`-equivalent trusted service, prepare Worker/binding and default Simple save, enumerate/prepare existing buckets, reconcile native menu, and verify. Keep the Activate Buckets button permanently visible for user-invoked repair/retry; pulse it only on actual activation/repair failures. Autostart must be idempotent, deduplicated and resumable across MV3 suspension; must not repeat/create extra resources after an uncertain response.
- **Enable R2** is a distinct conditional control when a *verified* R2 not-entitled/subscription state requires user action; it sends the user to Cloudflare's own consent/checkout. Never conflate an empty bucket list, 401/403, access denial or transient 5xx with inactive subscription. **Reconnect & Approve** is distinct when OAuth scopes/access are insufficient. Do not programmatically accept paid terms or alter billing.
- Make **the shared activation service**, not any Simple/Nested/Depth module, own provisioning, tokens and verified readiness.
- The existing Click2Cloud workbench under `dashboard/` and `src/dashboard/` is a partial starting point. Its `redown-bridge.mjs` intentionally refuses activation from a standalone unauthorized page because REDOWN currently permits only its `beta/explorer.html` sender. **Fix this limitation correctly in Click2Cloud's own trusted MV3 host/service architecture**; do not spoof the original extension URL, copy tokens, bypass sender validation, or loosen the production REDOWN handler.
  - Prefer a Click2Cloud extension-local privileged background host with an explicit sender allowlist for its own dashboard route, permission check, current authenticated session and the same REDOWN production service implementation; invoke the shared service through a narrow message protocol. If a standalone Portal is also used, it must not be an unauthenticated HTTP proxy to Workers or credentials.
  - `confirmed:true` should derive from a previously granted user setup authorization or a direct user activation gesture, NOT a fabricated consent. Background autonomous recovery may proceed only within already-authorized scope.
  - Distinguish `blocked/no-auth` from `failed`. Keep usable read-only UI instead of rendering a fake success or disabling every feature on an unrelated failure.
- Preserve the proven source semantics of `src/explorer/file-api.mjs`, `configuration.mjs`, `r2-adapter.mjs`, and `cloudflare-api.js` unless a narrowly scoped compatibility fix is demonstrated by tests. They were copied from REDOWN; any changes need provenance and parity tests.

## Real Chrome native right-click, not just DOM previews

Run a minimal real MV3 extension harness inside Click2Cloud with the same native Chrome limitations and a genuine root/composer/dispatcher. REDOWN reference: `extension/right-click-v3.js` is the Cloudflare-specific projection/resolver; `extension/background.js` owns the only menu registrar and click listener; `extension/google-drive-menu.js`, `extension/dropbox-menu.js`, `extension/onedrive-menu.js` contribute independent flat provider leaves. **Do not rewrite those providers or convert them into V3 modules.** Demonstrate that unchanged provider fragments survive each mode selection/rebuild. Do not incorrectly treat legacy 'Home' as Explorer navigation: default Cloudflare Home, where present, is an exact root save action.

The minimal workbench shows live bucket folder data, mode controls, destination editor (Parents/Siblings/Children horizontally scrolling pills and autocomplete), Preview/Apply, Refresh and Activate Buckets. It does NOT need a second full File Explorer, history system, cloud file manager, multi-provider OAuth implementation or theme engine. Native Chrome right-click must be separately proven; a hand-drawn web menu cannot certify Chrome behavior.

## Automation / decision policy

1. Start by reading the current REDOWN *source*, not historical proposals; record commit/blob hashes for protected reference files and distinguish current source reality from prior specs.
2. Inspect existing Click2Cloud sources and tests, including `src/dashboard/controls.mjs`, `src/dashboard/redown-bridge.mjs`, `dashboard/`, and extracted API. Run `npm test`; fix baseline regressions before expanding.
3. Implement real modules **incrementally**, with tests of mode isolation, menu identity and original REDOWN operation contracts. Do not ask design questions for already specified semantics. Choose narrow compatible defaults for unspecified nonsecurity decisions and document them.
4. Use the already connected `thanks-cohn/Click2Cloud` → `click2cloud-v3p1-r2-lab` automatic Cloudflare Worker Builds pipeline; do not assume a Worker build is an interactive Chrome extension test. Inspect its logs after pushing commits and repair failures within scope. The lab Worker is intentionally private/no public routes.
5. Verify real REDOWN Worker interactions through existing lab Service Bindings and already authorized credentials, when available. Service bindings alone do not confer Worker bearer tokens, Cloudflare OAuth consent or browser Chrome identity. No secret or OAuth token in GitHub, fixture URLs, logs or native menu IDs.
6. **Only write/delete within named disposable test prefixes on approved buckets**. Other 19 REDOWN Worker services are read-only compatibility targets unless scoped test authorization exists. Never alter REDOWN source/deployment, customer bucket files, public access or billing. No implicit user data migrations.
7. Explicitly separate the historical REDOWN TRUE REMOTE ingestion (source URL reaches REDOWN's Worker) from the new provider privacy goal (source bytes/minimal metadata to destination providers). Preserve fidelity and mark unproven privacy or size promises not yet supported. Do not fake transport completion.
8. Run focused unit/property/integration, real native-Chrome where available, and provider receipt/read-back checks. On known transient failures, retry bounded safe reads; on ambiguous writes inspect/reconcile first, never blind retry.
9. **Continue autonomously through nonblocked work.** If permissions, browser installation, a new OAuth grant, account-level R2 enrollment, or billing consent truly require the user, record a precise BLOCKED gate, a specific smallest required user action, and keep implementing/testing every independently possible component. Do not claim the entire run passed when any gate is blocked.
10. Commit coherent changes and push to **Click2Cloud only**; use main for lab-only implementation when the repo permits, since it triggers Cloudflare auto-build. If branch/ruleset requires PR, create/publish it instead without stalling engineering. End with links, commit IDs, actual commands, scoped live evidence and PASS/FAIL/BLOCKED/NOT TESTED for each gate.

## Stop conditions (do not override)
- Any operation requiring a new payment, account-wide administrative entitlement or OAuth consent cannot be auto-approved.
- No unauthorized route around sender checks, no public admin endpoint, no cross-extension impersonation, no secrets in source.
- No write or deployment into production REDOWN or non-lab customer storage.
- No 'success' or incremental counters before a verified provider receipt.
- No release or transplant into REDOWN until explicit review of migration/rollback and installed-Chrome acceptance.
