# Cloudflare Worker permissions — implementation and REDOWN comparison

**Status: compatible code repairs and local regressions implemented. The original Windows HTTP request and numeric error code were discarded by 0.3.5 and remain UNKNOWN. No live Windows authorization fix or successful deployment/save is claimed.**

Branch: `dev/p0-worker-permission-diagnostics`, starting at main `7ba73eaea7b8efb4e139b9a8d99c5bd0e7072706`. Extension version 0.3.6; same extension ID, OAuth client ID and outgoing requested scopes. No Cloudflare resource was created/changed/deleted; no merge, push or deployment was performed. REDOWN's checkout was not changed.

Runtime commit: `2498da593138c0ef596c4809a8c130a5ad57acdd` (the following evidence commit changes no runtime source). **221 focused tests PASS;16 real-Chromium local-fixture gates PASS; build/type check and source-drift/baseline checks PASS.** One REDOWN reference authorization-URL VM test PASS. Genuine unpacked extension remains BLOCKED.

## What is verified, in priority order

| Question | Verified finding | What is still unknown |
|---|---|---|
| Can edit-only authority create a new Worker? | **No.** Cloudflare's current Workers roles guidance says Editor can read/update/deploy existing Workers but cannot create/delete them. New Worker creation requires **Workers Admin at Workers product scope**; per-Worker permission cannot authorize a resource that does not exist yet. | Windows token's actual issued grants and selected-account role were not captured. Scope-string resemblance alone is not a complete OAuth-client permission mapping. |
| What does Click2Cloud request? | 0.3.5 requests `workers-r2.read`, `workers-r2.write`, `workers-scripts.content_read`, `workers-scripts.edit`, `offline_access`. Its local precheck accepted edit and then proceeded to a new-Worker upload; that check was not evidence of create authority. | This client's registered/approved scopes and any extra effective create authority cannot be read from repository source. No blind request-scope or client-registration change was made. |
| What does REDOWN request? | Main `e58bf99f4851f635cecc572e483ae35e184677f2`, `extension/cloudflare-auth.js:121`, requests R2 read/write and **Workers Scripts read/write** with a **different OAuth client**. Its actual authorization-URL unit test passed against an immutable temporary source snapshot. | A different client and a passing VM test do not prove this client can obtain the same grant. REDOWN live login/deployment was not rerun here. |
| Is legacy Workers Scripts Write supported? | Current official OpenAPI still accepts **Workers Scripts Write** for Worker upload and script-subdomain enable. Cloudflare roles guidance says existing legacy permissions continue to work. Click2Cloud now recognizes canonical read/write grants if actually issued. | Whether Click2Cloud's own OAuth registration can issue that legacy scope is unverified. We did not copy REDOWN's client or silently broaden scopes. |
| Account Workers.dev subdomain access? | OpenAPI GET `/accounts/{account_id}/workers/subdomain` lists **Workers Scripts Write or Read**; PUT for account-subdomain creation lists **Workers Scripts Write**. This is account-level configuration, not proof supplied by an individual existing-Worker edit grant. | Public OpenAPI permission groups do not expose this OAuth app's private scope registration. No invented `account-settings` scope was added. |
| Which Windows request returned403? | Owner confirmed only WORKER_PERMISSION_DENIED; HTTP403 was inferred from 0.3.5's mapping. Method, endpoint, numeric code and actual grants were **not captured**. | They cannot be retroactively reconstructed from that code. The new safe diagnostic must capture the next controlled missing step; no synthetic example is presented as the Windows response. |

**Supported conclusion:** creating a Worker using merely edit authority is an invalid authorization assumption, and the scope-profile difference is a strong lead. **Not a proven conclusion:** that the reported403 was definitely the initial PUT, or that merely changing OAuth strings would fix this client's account authorization. The shared upload API accepts existing-Worker Editor operations too; its broad endpoint permission list must not erase the documented create/update distinction.

Official evidence: [current create/edit guidance excerpt](official-create-versus-edit.json) from Cloudflare's immutable docs commit `53ce9b502646fdc019b8184b29b9f1054939e1b6`; [exact endpoint permission groups](official-api-permissions.json) from Cloudflare's OpenAPI, with content SHA256. Public docs were retrieved through Cloudflare's GitHub repositories because the documentation website returned403 in this environment.

## Full REDOWN source trace and compatibility decisions

REDOWN main was read from immutable GitHub objects into `/tmp/redown-main-reference`, because the actual REDOWN checkout's origin/main was older. No checkout, fetch, edits or tests were performed inside the user's REDOWN repository. `redown-reference.json` records exact source hashes.

| Step | REDOWN main source-derived behavior | Click2Cloud comparison / decision |
|---|---|---|
| Shelf → OAuth | `shelf.js:128`, `background.js:3134`, `cloudflare-auth.js`: explicit login, PKCE/state, persisted attempt and callback claim. Separate client and legacy popup ownership. | Preserve the single existing Click2Cloud Shelf/API/OAuth owner; do not copy client, window ownership or callback architecture. |
| Session/renewal | `cloudflare-api.js:11`: lock and rotation; transient failures preserve session. Its authenticationRejected also treats generic Authentication error403 as token rejection and can replay writes after refresh. | Keep existing safe refresh/session fences; **do not copy blind write replay**. Generic Cloudflare10000 Authentication error on403 no longer falsely forces token renewal/reauth. |
| Account/bucket | `background.js:1007–1095`: account identity, bucket pagination, create exact lowercase redown only if absent, relist; reuse an existing healthy profile. | Preserve V1 choices/defaults and exact root; keep existing ledger recovery, canonical ordinary Simple registration and actual native ACK. No legacy page/item caps imported. |
| Account subdomain | `background.js:1097–1115`: GET before upload; on any unsuccessful read attempts PUT with generated account-wide subdomains. | **Reuse read-before-upload ordering. Do not copy implicit account-wide creation after a denied read.** Missing subdomain requires an explicit account-administrator remedy. |
| Worker identity / lock | `background.js:1120–1140`: lock, existing profile/token reuse and stable script name. | Keep the already persisted Click2Cloud name/key/bucket plan. Never generate another Worker to escape a denial. |
| Upload / enable | `background.js:1142–1179`: multipart PUT script then POST script/subdomain; errors distinguish upload versus enable with status and raw response excerpt. | Keep same official endpoint sequence; add safe method/endpoint/status/numeric-code evidence. Raw body excerpts/headers/credentials are not exported. Account GET now precedes both writes. |
| Bindings | REDOWN uses R2 STORAGE and metadata/public-asset settings; legacy Worker has a 300MiB profile field and embeds a shared secret. | Preserve Click2Cloud's R2 STORAGE, private signing binding, exact account/bucket/prefix/digest and Durable Object claims. No public-assets fallback, raw source-URL storage or legacy size cap copied. |
| Readiness | `background.js:1180–1254`: bounded Worker health polling, binding write, then save profile. | Keep stronger current authenticated capability, controlled R2 probe/readback and native ACK; do not replace them with an HTTP200/URL/timer. |
| Remote save | `background.js:2038–2107`: Worker fetches source into R2; separate headObject verifies exact key/size/etag/source metadata, then session-bound verified receipt/history. `3006–3012` calls verifier before completed history. | Preserve current conditional/idempotent Worker transfer and fresh provider receipt/readback. No browser bytes, raw provenance, second engine or false completion. |

REDOWN can avoid a new-deployment failure by reusing a healthy existing Worker; its successful right-click does not prove a fresh Worker creation would be authorized with Click2Cloud's client. Its account subdomain may also already exist. These are code-derived explanations, not newly executed live tests.

The REDOWN history entry `24b3a1415655` removed `offline_access` after its own client rejection; it did **not** rename Workers read/write scopes. This reinforces that clients have distinct registrations. Click2Cloud's outgoing profile is deliberately unchanged pending actual registration/grant evidence.

## Actual repairs

1. **One existing provisioner boundary** records a closed safe diagnostic: operation, create/update/inspection intent, method, masked endpoint, real HTTP status, numeric provider codes, timestamp/request ID when present, auth challenge, selected-account identity verification, required API permission alternatives and documented new-Worker Admin requirement.
2. Provider-returned grants are distinct from session assumptions. `grantedScopes` is null when provider grants were not recorded; `sessionScopes` and `scopeEvidence` make legacy/default-requested data explicit. Unrecognized scope names are omitted and counted via omittedScopeCount/scopeListComplete; they are not silently represented as a complete issued grant list. Unknown values, tokens, account/script IDs, raw error messages, request bodies and authorization headers are discarded. Canonical Workers read/write and existing legacy sessions are recognized; actual HTTP authorization is always enforced.
3. Account subdomain GET runs before any Worker PUT or script-enable POST. No code creates an account subdomain, changes OAuth registration, activates billing or grants permission. Settings inspection now preserves its real failure instead of reducing it to PROVISION_RECONCILE_REQUIRED.
4. The existing owned transport plan and private setup ledger retain the last safe failure. Automatic initialization cannot repeat the denied step. Explicit `initializeCloudflare({resume:true})` reuses approval, operation, exact name/key/bucket. A matching interrupted upload is inspected and skips reupload; only the missing enable step is retried. Resolving permission and then losing local completion does not leave a stale permission failure masking probe recovery.
5. The existing Shelf shows corrective action and **Safe Cloudflare diagnostics**, and replaces repeated approval with **Resume existing setup after correction**. The same typed V3+1 API/envelope exposes the diagnosis. No new wizard, message handler, server, token owner, registry or engine.

## Evidence classes / limitations

- `focused.txt`: complete focused suite, including OAuth/security/destination/recovery regressions and new endpoint/create-versus-edit/sanitization/no-retry/resume tests.
- `worker-permission-tests.txt`: compact new decision table; any403/code10000 here is explicitly simulated, not the owner's response.
- `browser/browser-results.json`: real Chromium executes the actual app/API/IDB with simulated provider denial. It checks endpoint/status/code display, no repeated approval, zero automatic repeated preparation, and explicit recovery without bucket recreation. [Screenshot](browser/precise-worker-denial-fixture.png) is a fixture image.
- `redown-scope-test.txt`: one actual REDOWN authorization-URL test, passed in a VM from immutable source. No REDOWN/live-cloud success is inferred.
- `read-only-endpoints.json`: environment API-token GETs returned200 for account subdomain and an existing owned script's settings. This is **not the Windows OAuth identity** and proves no new-Worker create permission.
- `real-shelf-receipt.json`: genuine unpacked-extension attempt; managed Chromium blocks loading with UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. No Windows Chrome, real owner OAuth or live create/save/readback was available here. No live PUT/POST was attempted by this work.

The original baseline and prior Issue #4 snapshot in the canonical workings JSON remain intact. BEFORE records the exact information loss in0.3.5; CURRENT records the new code and unknown live cause. No claim that fixtures solve an external authorization requirement.

## Straightforward Windows validation — keep your data

After obtaining the repaired branch/commits in your checkout (this work is not merged/pushed automatically):

```bat
npm ci
npm run build:extension
```

1. Open `chrome://extensions`, keep ID `ajppphdiamdobknpamcheohmdbdbeoal`, and **Reload the same extension**. Confirm the new build is0.3.6. Do not uninstall, clear storage, disconnect OAuth or delete redown/destinations.
2. Open the Shelf → **Cloudflare status**. A newly captured failure appears with **Safe Cloudflare diagnostics**. Expand it and copy that JSON only; it excludes credentials and raw request bodies.
3. The0.3.5 failure details cannot be recovered. If it only shows an interrupted setup with saved approval, use **Inspect / resume existing setup once** to capture the missing step. It first reads account/Worker state and reuses the existing name; after a captured denial, stop and inspect the result. Do not repeatedly approve setup or repeatedly press Resume.
4. If intent is `create` and upload is denied, have the account/OAuth-client administrator verify **product-level Workers Admin or the actual supported legacy create-capable grant** for the selected account. An individual-Worker Editor role cannot create a new Worker. Check this client's approved/issued scopes; REDOWN's different registration is not proof. Do not blindly add scopes. If registration/grants change, reconnect only as required to obtain them; retain saved setup and destinations.
5. After the recorded cause is corrected, press **Resume existing setup after correction once**. Only a verified probe and actual native ACK can report ready. Then perform a fresh right-click and independently verify its R2 object/receipt/History GO TO; that live acceptance remains untested here.

Return the safe JSON (`operation`, `workerIntent`, method/endpoint, HTTPstatus, providerCodes, granted/session scopes/evidence and request ID). That supplies the actual missing evidence for a definitive Windows-specific root cause. Do not paste tokens, private keys or full network requests.
