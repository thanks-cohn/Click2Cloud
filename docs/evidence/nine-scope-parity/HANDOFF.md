# 0.3.7 — nine registered permissions and login-to-save parity

**Implementation/local integration PASS; actual owner Windows OAuth, Worker creation and live R2 save remain BLOCKED / NOT TESTED here.** No unobserved live pass is claimed. Working branch `dev/p0-nine-scope-working-parity` starts at latest main `67a6d35` and follows `docs/requests/P0-CLICK2CLOUD-V3PLUS1-REDOWN-PARITY.md`.

## Revisions and counts

- Runtime commits: `ebae853` and `6f8641db6ee732e07e5826ff9f312c4d8fa7b9f2`. Build **0.3.7**; the real-extension receipt pins this exact runtime revision and source digest.
- Focused tests: **229 PASS, 0 FAIL**. Browser fixture gates: **17 PASS, 0 FAIL, 3 BLOCKED, 1 NOT TESTED**. Strict API type check, extension build and source-map drift checks pass.
- The browser fixture gates and actual local Worker/R2 integration are separate proof classes; neither establishes owner OAuth consent or a live native save.

## What changed in production

- `src/auth/cloudflare-oauth.mjs` requests the owner's exact **nine** scopes: Workers Admin, Content Read-Only, Editor; R2 bucket-item read/write; R2 storage read/write; Routes read/write. No `offline_access` is requested because it is not in the confirmed registration. Client ID, extension key/ID, callback, PKCE and single OAuth owner remain unchanged.
- Existing sessions, access/refresh tokens and account state survive cancelled/rejected upgrades. Refresh and rotation still work when a refresh token is issued; old refresh tokens are retained within their existing session. No old token is silently promoted to Admin. Public `loginStatus.permissions` distinguishes requested scopes, provider-issued scopes or null, evidence, missing scopes, create capability and the need for reconsent. `refreshSupported` is only a boolean; credentials are never exported.
- A partial grant can remain authenticated but is explicitly incomplete. `invalid_scope` yields OAUTH_REGISTERED_SCOPES_REJECTED with the existing connection kept. A request that omitted provider scope metadata is not represented as a verified nine-scope issuance. Real provider mutation/readback remains necessary for success.
- `src/cloudflare/deployment.mjs` recognizes Admin as creation-capable and supported legacy write sessions; edit-only authority can update an inspected existing owned Worker but cannot create one. Known absence blocks PUT with a local preflight diagnostic (`httpStatus:null`, no fabricated provider code). The R2 bucket is also not newly created when the necessary create grant is known absent. Actual Cloudflare authorization still decides whether a permitted attempt succeeds; scope possession alone is not proof of account-level Admin authority.
- `src/cloudflare/onboarding.mjs` preserves the existing approval, target, Worker name/key, digest and setup ledger. A newly provider-issued Admin grant can resume a recorded non-Admin create denial once without another approval. An identical Admin grant with a fresh403 does not trigger repeated automatic provisioning. If the provider did not report grants, explicit existing-setup resume remains available; repeated reauthorization is not presented as a solution.
- The existing Shelf has **Update Cloudflare permissions / Reauthorize Cloudflare**, backed by the existing `loginBegin`. It does not disconnect or clear storage. Each button has one handler. Focused Shelf status reads current verified state instead of letting the old attention error obscure READY; Save results uses the same History API from that surface.
- No new runtime module, API owner, scope-setting wizard, gateway, provider engine or cloud-routing feature was introduced. Routes permissions do not trigger Route/custom-domain operations. Canonical V3+1 methods, account/actor grants, destination registration, native ACK, conditional transfer, privacy and verified receipts remain the owners.

The confirmed Windows0.3.6 failure was **PUT `/accounts/{account_id}/workers/scripts/{script_name}`, HTTP403 during creation**; its numeric code was unavailable. The missing Admin request was a demonstrated source/configuration defect, now corrected to the owner's authorized profile. A successful new owner consent and actual deployment are still needed to prove that account/client authorization is sufficient. No numeric error code is invented.

## REDOWN comparison — traceable evidence classes

Latest REDOWN main was confirmed unchanged at `e58bf99f4851f635cecc572e483ae35e184677f2`. Its actual immutable source trace and hashes are retained in [the preceding comparison](../worker-permission/HANDOFF.md) / `redown-reference.json`; the REDOWN checkout remained clean at `a6c17f8...`. No checkout, edit or deployment was performed there.

| Behavior | REDOWN source | Click2Cloud0.3.7 / evidence |
|---|---|---|
| Login/session | `extension/cloudflare-auth.js`, `cloudflare-api.js`: PKCE, callback claim, token retention and refresh; different client and legacy read/write scopes | Same existing C2C OAuth/API owner, now exact nine registration; reconsent/cancel/partial/unreported/refresh tests **LOCAL PASS**. Actual owner issuance **BLOCKED**. |
| R2 first use | `background.js:1056`: exact redown discovery/create, healthy profile reuse | Existing V1 canonical ordinary Simple row/default; saved choices preserved. Existing/absent/delete-last/relogin/recovery tests **LOCAL PASS**. Environment-token discovery **LIVE READ-ONLY**, not owner OAuth. |
| Workers authorization | REDOWN requests legacy Workers read/write | Modern Admin create grant is requested explicitly; Editor update versus create distinction retained. Official API/role guidance **SOURCE VERIFIED**. Actual owner new create permission **NOT TESTED**. |
| Subdomain/upload/bindings | `background.js:1097–1179`: account subdomain before upload, stable identity, R2 binding, script enable | Preserve read-before-write and exact saved Worker/key; retain C2C R2 + Durable Object/signing/digest bindings and missing-step recovery. **LOCAL PASS**. No blind account-subdomain creation on denied read. |
| Readiness/native menu | REDOWN health/write before profile/menu | Authenticated Worker capability + R2 probe/readback + actual registrar ACK required. Four flat initial provider rows; zero/one/multiple destination tests **LOCAL PASS**. Real native Chrome **BLOCKED**. |
| TRUE REMOTE save | REDOWN Worker fetches into R2, independent headObject before success | Real local workerd/R2/DO performs conditional save, independent readback, receipt inspection and API result. Source/control-plane/OAuth are explicitly simulated. **LOCAL INTEGRATION PASS**, not live Cloudflare. |
| Explorer/History/GO TO | REDOWN verified receipt identifies exact object | Existing Universal File API lists actual local R2 object; History and GO TO resolve identical key. Focused Shelf browser upgrade/save/History/GO TO **LOCAL PASS**. Actual Windows object **NOT TESTED**. |
| Recovery / GUI=API | REDOWN locks/profile reuse; legacy mutation/menu machinery | One existing C2C state/API/menu/transfer owner, no imported legacy engines. Grant/account/security/idempotency and preserved-operation tests **LOCAL PASS**. |

Not copied: REDOWN's separate popup/window ownership or client, implicit account-wide subdomain creation after errors, blind write replay, hardcoded legacy transfer cap, raw source-URL metadata, public-assets fallback or older default/menu engines. Other unfinished storage adapters and broader Explorer mutation features remain honestly unsupported; this run does not claim complete product-wide parity outside the specified Cloudflare workflow.

Official Durable Objects guidance confirms they do not need a separate role beyond the implementing Worker (`durable-object-permissions.json`); no unregistered extra DO scope was invented.

## Actual verification

- `focused.txt`: full focused suite, including exact nine-scope URL, partial/unreported grants, cancellation/invalid-scope preservation, refresh, Admin create/Editor update, preserved denial upgrade, V1 destinations, security and native ACK.
- `browser/browser-results.json`: actual Chromium app/API/IndexedDB with simulated OAuth/provider. The focused Shelf starts with a cached old-grant failure, makes exactly one reauthorization call, prepares once, creates **zero new buckets**, completes the original setup key, preserves the existing light theme, saves, and reaches the object through the actual History GO TO UI. No setup popup/renewed approval is needed. Screenshot: [focused Shelf → Explorer GO TO fixture](browser/nine-scope-reconsent-explorer-go-to-fixture.png).
- `local-worker-api-proof.json`: **actual local workerd, R2 and persistent SQLite Durable Object**. Canonical API dispatch → Worker save → real R2 object (`abc`) → fresh receipt inspection → real File API listing → History domain interface (an in-memory result store in this test; the browser separately exercises real IndexedDB) → same GO TO key `exact/api-parity.bin`. Native Chrome ACK, OAuth and management responses/source HTTPS are explicit fixtures. This proves local runtime integration, not a remote Cloudflare account or installed native gesture.
- `read-only-cloudflare.json`: fresh GET-only environment API-token checks for redown, account subdomain and existing isolated test Worker R2/DO bindings. This token is not injected into the extension and does not prove the owner's nine grants or new-Worker creation.
- `real-shelf-receipt.json`: genuine unpacked Chrome extension attempt on the exact committed build. Managed Chromium refuses installation with `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR`; no policy bypass was attempted. This says nothing about whether the owner's Windows installation can load it.

No remote bucket/object/Worker/route/subdomain was created, changed or deleted by this coding run. No production deployment, merge or push was performed. The workings JSON keeps all immutable baselines and now records the new confirmed Windows failure and nine-scope/current-source behavior. Scope and trace artifacts contain no credentials.

## One Windows acceptance procedure — preserve existing data

After obtaining these implementation commits (the working branch is not automatically merged/pushed):

1. In the Cloudflare OAuth client editor, confirm the **nine owner-selected permissions were saved**. Do not add `offline_access` or replace the client/redirect. Then in the repaired checkout run:

   ```bat
   npm ci
   npm run build:extension
   ```

2. In `chrome://extensions`, **Reload the existing same-ID extension** `ajppphdiamdobknpamcheohmdbdbeoal`; do not uninstall, clear storage, disconnect, delete destinations or recreate redown. Confirm build0.3.7.
3. In the Shelf choose **Update Cloudflare permissions** or **Reauthorize Cloudflare**. Complete the genuine provider consent. If Cloudflare rejects the profile, stop and correct the saved client registration; the old usable connection remains. For safe confirmation from the Shelf DevTools console:

   ```js
   const r = await chrome.runtime.sendMessage({channel:'engine', version:'3+1.1', method:'loginStatus', params:{}});
   console.log(r.data.permissions, {refreshSupported:r.data.refreshSupported});
   ```

   This prints no tokens. If `issuedScopes` is present, verify all nine and Admin; a partial grant is not complete. If it is null, the provider omitted scope metadata: do not claim issuance or repeatedly reconsent. Actual provider authorization/proof must establish the outcome.
4. Existing setup approval is reused. A newly issued Admin grant resumes the old failed operation automatically. If scope metadata was omitted, use **Resume existing setup after correction once**. If first-use approval truly was never granted, approve it once inline; sign-in is not billing consent. A new403 with Admin requested/issued can still mean insufficient account role or policy: copy **Safe Cloudflare diagnostics** and stop repeated attempts. Setup approval does not grant Cloudflare authority.
5. Only after READY and native ACK, right-click a small eligible public HTTPS file, for example `https://raw.githubusercontent.com/github/gitignore/main/Node.gitignore`, and choose Cloudflare. Verify the actual object/version/size in the chosen R2 destination, Save results' verified receipt, and GO TO highlighting that same object in Explorer. The default root is `redown/` only when no saved location/default previously existed; a custom saved target must win.
6. Repeat the save: no new setup prompt, bucket or Worker; collision policy must preserve existing objects. Confirm saved destinations and Simple/Narrow/Depth settings remain unchanged. Refresh/session tests can use `refreshSupported` and safe diagnostics without displaying credentials.

**Live acceptance is not complete until that installed Windows OAuth → existing setup → real native save → independent R2 object → matching Explorer/History workflow is observed.** This run provides code and local proof, not a fabricated live result.
