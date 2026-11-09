# Click2Cloud 0.3.16 — Login → verified saving

Implemented on `dev/p0-login-ready-product`, from main `3b80df9`. Runtime source: `d5840130ceebd76d09149abfe14ea2695f853477`. Evidence/docs follow in a separate commit. API remains 3+1.1; extension ID remains `ajppphdiamdobknpamcheohmdbdbeoal`. No REDOWN changes or merge/push.

**Overall installed-product acceptance: BLOCKED.** The new normal workflow works in the production app/background + local Worker/R2 browser test. Actual live Worker-to-R2 transfers and independent S3 readbacks also pass. These are distinct proofs: this environment cannot prove the owner's Windows OAuth/native menu/restart workflow.

## What was wrong and what changed

At 3b80df9, `loginBegin` intentionally stopped after OAuth. Normal GUI Login never called `initializeCloudflare`; its initializer required a separately recorded setup approval. Remotes explicitly told the user that login did not prepare storage. That implemented the previous login-only contract and conflicted with the owner's new required experience. A user could be CONNECTED without any usable default or native save route.

Normal explicit Login now performs approved OAuth first, independently of settings. When connected, the same canonical API reads durable configuration, enforces the existing provisioning/account grant, and calls the existing initializer with disclosed setup consent. It reuses or creates lowercase redown only for genuinely empty configuration; verifies the existing TRUE REMOTE Worker and a readiness object's bytes; registers an ordinary Simple destination/default; then requires native Chrome ACK. Saved destinations/defaults win. Existing setup approval/operation identity and Worker plans remain reusable. Explicit Login can resume the same failed setup after access correction and update the existing Worker when code requires it. No new engine, configuration store, setup wizard or observability framework.

Authentication returns its own successful result even if initialization fails. `data.initialization` carries a separate operation ID, state, code and stage. Provider diagnostics and the exact Worker endpoint/status/codes remain visible. R2 activation/permission problems show the specific corrective action. Chrome ACK failures never display Ready. Remotes now offers Sign out directly, independently of Settings.

An initial live newly deployed Worker capability request returned RESPONSE_INVALID; a later request to the same Worker succeeded without redeployment. This observation does not prove the cause of the transient response. The initializer now retries only read-only capability checks for RESPONSE_INVALID, TRANSPORT_UNAVAILABLE or WORKER_BUILD_MISMATCH, at most eight checks (250ms exponential delay, capped at2s). It never retries a dispatched probe/save as success, nor repeats writes because a timer elapsed. Capability denial stops before the readiness write. Deterministic tests reproduce the temporary invalid-response sequence and permanent denial.

`verifyOnly`, passive boot/status/refresh still do not provision. An agent with only login authority cannot create approval or provision; it also needs the existing initializeCloudflare/account/full-configuration authority. Human consent remains required for interactive Login. The GUI explains that Login authorizes necessary storage/Worker preparation and a small verification file, which Cloudflare may bill. No OAuth scopes, client identity or security checks were bypassed.

## Data preservation and the unresolved lost installation

No existing destination, credential, bucket or object was removed or reset. Normal fresh Login does not require a profile backup, recovery wizard or destination configuration. Custom/default/hidden/other-account entries continue to prevent an empty-state initializer from replacing them.

**This does not reconstruct the owner's previously erased CURRENT.** With native generation583 and missing historical records, OAuth still works, but initialization returns `CONFIGURATION_RECORD_MISSING` at `configuration`. There is no complete independent original configuration available here. Treating this as fresh and overwriting it would violate the owner's no-data-loss requirement. The original physical deletion cause and original hidden/mode/default intent remain UNKNOWN. No full-profile backup is demanded by this assignment, and no automatic reset was introduced. That existing lost-profile state is a separate unresolved blocker to claiming the owner's installation is working.

## Actual verification

See `verification.json` for the eleven requested acceptance steps, receipt IDs, source pin, build digest and classifications.

- Focused production/module tests: **286 PASS, 0 FAIL**. Remote module: **49 PASS, 0 FAIL**. Final source/current-document drift tests:10 PASS.
- `workflow/results.json`: real Chromium runs actual Shelf, background, trusted API, real IndexedDB, workerd, Durable Objects and local R2. Chrome callbacks, OAuth, Cloudflare management responses and source HTTPS are explicit fixtures. Three Login cycles, two Sign outs, four right-click dispatches/saves, independent local R2 PNG-byte readbacks and full browser-process restart PASS. Exactly one bucket creation and one Worker upload across all cycles; one ordinary saved destination; no second setup approval or configuration dialog. The test observes verified durable receipts rather than merely awaiting a truthy asynchronous predicate.
- `boot/results.json`:16 PASS and2 old defects REPRODUCED. Covers corrupt/missing/all-lost CURRENT, inaccessible/transient storage, OAuth outage/cancel, native failure,50 reloads and same-profile browser restart. No cloud writes in those negative fixtures; saved state preserved.
- `persistence/browser.json`:29 PASS,3 historical defects REPRODUCED; real Chromium IDB crash/termination/migration/recovery/security cases. All destructive injection stays in disposable profiles.
- `live-provider.json`: actual environment API-token authorization uploaded a **new isolated test Worker** bound to existing redown and restricted to `__click2cloud_true_remote_test__`. The final pinned run reused that same Worker without another upload. Two new unique PNG saves completed TRUE REMOTE; independent signed S3 GETs returned HTTP200,10,380bytes each, SHA256 `dffd702034de08fc0d11eebc90e0118a3f8615e1d798a1796656646cf862da60`, matching source bytes. Worker source digest is unchanged: `IwTaIK4em1_mwIygmpbfULfJWUZln3ggKnG5suyu-NA`. No browser download/reupload. Only new test objects were retained; no existing Worker or object was changed/deleted. One isolated Worker was created in this run; private signing plan remains outside Git. This is **not extension OAuth or native right-click proof**.
- `live-preflight.json`: GET bucket discovery HTTP200 confirmed redown. `/user/tokens/verify` returned401/code1000 for the configured credential, while the actual account bucket and deployment operations succeeded. The user-token verification endpoint's result is not treated as proof that the working account/resource authority is invalid or as proof of extension OAuth grants.
- `installed/real-shelf-receipt.json`: genuine unpacked-extension attempt, actual Chrome CDP, response:null, **BLOCKED — UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR**. Policy was not bypassed. An earlier headed attempt lacked DISPLAY; the final headless attempt reached the actual administrator-policy blocker.

Existing CI now also executes the production Shelf→local workerd login/logout/restart workflow in the existing test job. Hosted CI has not run because this branch is not published. Fixture proof is never promoted to installed or live proof.

## Repeatable commands

```sh
npm run test:focused
node --test right2cloud-module/tests/module.test.mjs
npm run build:extension
C2C_BOOT_WORKFLOW=1 C2C_BOOT_EVIDENCE=docs/evidence/login-ready-product/workflow node scripts/test-boot-login-browser.mjs
C2C_BOOT_EVIDENCE=docs/evidence/login-ready-product/boot node scripts/test-boot-login-browser.mjs
C2C_RECOVERY_EVIDENCE=docs/evidence/login-ready-product/persistence node scripts/test-current-recovery-browser.mjs
C2C_HEADLESS=1 C2C_SHELF_EVIDENCE_DIR=docs/evidence/login-ready-product/installed node scripts/test-shelf-extension.mjs
```

Browser baseline archives are the existing paths/commits in `.github/workflows/test.yml`; set C2C_CHROME_EXECUTABLE if needed. Fault cases use generated disposable profiles only. The live harness is opt-in: `NODE_USE_ENV_PROXY=1 node scripts/test-login-ready-live.mjs --approved-isolated-worker`. It reads configured environment variables privately; it may deploy one isolated Worker and retain new unique test objects. Do not run it without corresponding cloud authorization. It is a provider-component test, not an OAuth substitute.

## Windows acceptance after delivery of the reviewed commit

This branch is committed locally, not merged/pushed. Once the revision is available in your checkout, use CMD in `C:\Users\jg202\Click2Cloud-FRESH`:

```bat
npm ci
npm run build:extension
```

Reload the existing unpacked extension from `dist\click2cloud`, retaining the same extension ID. Do not uninstall, clear storage, delete nativeRegistration or alter saved generations. No full-profile backup or manual setup is required for a healthy/fresh configuration.

1. Open Shelf → Remotes. Click Log in and complete actual Cloudflare OAuth. Expect Ready to save only after provider readiness and Chrome ACK. If blocked, retain the specific initialization stage/code/HTTP/provider codes; do not repeat setup approval.
2. Right-click a public HTTPS image → the Cloudflare destination. Require the verified Save results receipt and independent object inspection at the exact R2 key.
3. Sign out directly in Remotes. Verify destinations remain. Log in again; no new default or Worker should replace the saved one. Save a second image and verify the new object.
4. Close Chrome completely, reopen it and repeat the save. Confirm saved Default, destinations, Settings/Explorer and OAuth continuity.
5. If the known CURRENT-loss condition remains, report initialization `configuration/CONFIGURATION_RECORD_MISSING`; it has not been restored by this run. Do not use an empty-state reset to manufacture acceptance.

**Not verified here:** actual Windows installed Shelf/identity consent/native menu ACK/right-click/sign-out/re-login/restart; the owner's original profile and lost configuration. Live API-token saves do not prove those steps. Production success is not declared.
