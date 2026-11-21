# Proposal — Click2Cloud-first REDOWN Basic modular alpha, under Click2Cloud's extension identity

**Recorded:** November 21, 2026  
**Source repository:** `thanks-cohn/Click2Cloud`  
**Target:** A NEW integration branch in Click2Cloud, created only from a pinned, successfully verified P0 right-click baseline  
**Status:** Codex-ready proposal; no transplant, registration change, OAuth connection, production release or installed-Chrome verification has been performed by this document

## Owner's exact proposal and recommended decision

**YES — recommended:** Once the current Click2Cloud Codex run has fixed and independently verified that the native right-click menu reliably appears, create **a new branch inside the Click2Cloud repository FROM that exact proven commit**, and transplant REDOWN Basic's reusable Google Drive, Dropbox and OneDrive provider code **as isolated modules**. Keep the Click2Cloud extension's existing stable Chrome extension ID for this integration edition, and adapt each imported module's OAuth **registration/profile** to that installed extension ID.

Do NOT use the original REDOWN extension ID yet, do NOT replace the original REDOWN installation, do NOT overwrite Click2Cloud's repaired working branch, and do NOT overwrite the existing REDOWN Basic donor branch. After an independently verified combined alpha exists, decide whether/how to rehost it into REDOWN's repository as a separate later deployment step.

**The Click2Cloud ID observed from the current registered manifest/redirect is `ajppphdiamdobknpamcheohmdbdbeoal`**. This ID should remain stable as long as the same public manifest identity is preserved, but Codex MUST compare it with `chrome.runtime.id` from the actual packaged/installed build; do not assume that editing the display name to "REDOWN" changed the ID. The original REDOWN extension ID is a different application identity and should not be copied onto this integration branch.

## Architecture — Basic is a module, NOT a second extension

```text
Click2Cloud proven P0 host, NEW integration branch
  ├─ ONE Chrome MV3 service worker (existing Click2Cloud host)
  ├─ ONE canonical native right-click menu compiler + registrar + event listener
  ├─ ONE shared menu/configuration API and exact-target dispatch
  ├─ Cloudflare R2 provider (the existing true-remote path, unchanged)
  ├─ REDOWN Basic provider modules (isolated, optional)
  │   ├─ Google Drive OAuth / uploader / provider readback
  │   ├─ Dropbox OAuth / uploader / provider readback
  │   └─ OneDrive OAuth / uploader / provider readback
  ├─ ONE user-facing History / verified receipt projection / daily badge
  ├─ ONE Shelf with distinct provider cards (no second Basic Shelf application)
  ├─ ONE detachable Aesthetic API for all host and Basic user interfaces
  └─ ONE Click2Cloud-identity deployment profile for this alpha
```

**Shared boundaries:** native right-click menu, configuration interface, Aesthetic API and host operation/History projection; provider-specific authentication, upload and proof logic remain independently owned inside each Basic module. A missing/erroring Basic module cannot prevent Cloudflare right-click registration, R2 upload, Shelf startup or History access. Each Basic provider can be disabled independently, and its menu disappears/reverts to an honest setup action without erasing unrelated menu nodes. Do not import Basic's independent service worker, duplicate `chrome.contextMenus` registration, duplicate command router, competing badge counter, standalone IndexedDB schema or entire standalone Shelf.

**Provider capabilities remain honest:** Basic can supply flat native right-click save targets; Cloudflare's Depth/Narrow/Simple hierarchy remains untouched. Do not imply Basic has Cloudflare's remote-file Explorer/rename/move API unless separately implemented and verified. Basic's documented bounded client-side source reader (32 MiB donor limit) must NOT replace Cloudflare's direct remote-save pipeline.

## OAuth — 'rewrite it' means configure the same proven protocols for the Click2Cloud ID

**Keep secure flow implementations, change the host-bound public registration/profile where required. Do NOT replace tested OAuth/PKCE/session code wholesale, copy tokens, embed client secrets or bypass provider registration.**

| Provider | Planned integration under Click2Cloud ID | Registration / live-check requirement |
| --- | --- | --- |
| **Cloudflare** | Keep Click2Cloud's existing Cloudflare OAuth client, scopes and `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/cloudflare` callback during initial combined testing | Verify actual installed ID, registered redirect and account/scopes; do not transplant REDOWN's older Cloudflare auth handler. |
| **Google Drive** | Adapt Basic Google Chrome Identity flow to the Click2Cloud build's manifest and installation ID | Original REDOWN's Google Chrome-extension OAuth client is bound to REDOWN's different extension ID. Normally create/use a Google **Chrome Extension OAuth client for the Click2Cloud ID** (potentially within the already approved Google Cloud project; new app-consent review is not automatically required, but registration/testing restrictions still apply). Add public `oauth2.client_id`/scopes correctly. Test real consent and authorized Drive upload+metadata verification. |
| **Dropbox** | Keep proven Basic OAuth authorization-code+PKCE flow, set profile to Click2Cloud ID | Existing Dropbox app key may be reused **if** exact `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/dropbox` is permitted/registered in the app console, scopes/root access are correct and live consent succeeds. Otherwise use a separate test app. |
| **OneDrive** | Keep proven Basic Microsoft auth-code+PKCE/refresh logic and profile | Existing Entra public client may be reused if `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/onedrive` is registered with the correct platform/tenant/scopes and the Chrome extension token exchange passes Microsoft Origin/CORS rules. Some registrations require changes or a different app platform. Validate, don't assume. |

- **No automatic reapplication for every provider.** We can reuse existing registration infrastructure if it accepts the Click2Cloud-ID callbacks and scopes. Google usually needs a Chrome-extension OAuth client explicitly registered for this distinct ID; Dropbox often only needs an additional registered redirect. Whether provider console changes require review/consent depends on the registration and requested scope.
- **Codex can change source configuration**, add a small identity-profile adapter and test registration mismatches. **Codex cannot safely make a provider accept an unregistered redirect just by changing local code**; any necessary console-side changes must be listed as owner actions and handled with explicit approval.
- Verify actual `chrome.runtime.id` and `chrome.identity.getRedirectURL('dropbox')` / `('onedrive')`; compare to the selected profile at boot. Prevent silent retries/reconnect loops under wrong IDs. Wrong or absent registration => **SETUP REQUIRED**; no false "Connected".
- Never copy existing REDOWN/Basic access tokens, refresh tokens, OAuth state, PKCE verifiers, cookies, local account credentials, or IndexedDB data. Users may need to reconnect. Keep Basic storage keys versioned/namespaced and do not clear pre-existing Click2Cloud state.
- Explicitly audit `permissions`, `optional_host_permissions`, manifest OAuth client and provider API origins. Grant only needed permissions and clearly explain new permissions to users.

## Sequential plan — safety gates

### GATE 0. Repair the right-click menu now and keep it repaired forever

Before any transplant, finish `next-codex/NEXT_CODEX_REQUEST_2026-11-21_P0_RIGHT_CLICK_ALWAYS_AND_LONGEVITY.md` with an actual source repair. Test native menu availability **before/after login, after reconnect, Chrome start/reload, service-worker suspend/wake, provider offline/recovery and rapid click bursts**. Verify real installed-Chrome menu rendering and independent R2 object receipts, not just fixtures/registration ACK. Test 100/500/1,000 save actions and screenshot bursts, memory/latency and no menu disappearance. Pin one passing source SHA. **If P0 fails, stop.**

### GATE 1. Branch from the passed Click2Cloud baseline

Create a new branch in `thanks-cohn/Click2Cloud` from that exact pinned good commit, such as `alpha/redown-basic-module-click2cloud-id`. Do not change the source P0 branch or original REDOWN main. Produce source maps/checksum and provenance of imported REDOWN Basic adapter files; retain relevant LICENSE and third-party notices. Maintain an easy `git diff` from the golden Click2Cloud base.

### GATE 2. Import ONLY the required Basic modules

Use `thanks-cohn/REDOWN` branch `basic/portable-rehost-v1` as read-only donor for `extension/lib/auth.js`, `lib/identity.js`, `providers/index.js`, supporting source/verification code and **the tests**. The donor branch's `docs/TRANSPLANT_MANIFEST.json` pins provenance and `docs/PORTABLE_VERIFICATION.md` records **135 passing local tests**, but installed Chrome and live saves remain unverified. Put integrated modules in a dedicated namespace (e.g. `src/providers/basic/`) and adapt to existing Click2Cloud contracts. Do not attempt a whole Git merge of unrelated histories or boot two MV3 entrypoints.

### GATE 3. Add one registration adapter and link the host seam

Use a single selected deployment profile for **Click2Cloud identity**. In code, expose separately configured public registration/client, scopes, redirect expectations, auth status and provider-specific save/verification. Preserve existing Cloudflare auth implementation. Provider module lifecycle should be optional/isolated and must not block native menu registration on first worker activation. Share only the menu/configuration/Aesthetic API and the host operation/History/badge projection, not raw credential stores or upload internals.

### GATE 4. Acceptance in an isolated Chrome profile

Install the integrated build in a separate, owner-approved Chrome profile **without replacing the normal Click2Cloud/REDOWN installation**. Validate actual installed extension ID. First test Cloudflare alone with Basic modules OFF. Then enable Basic one provider at a time, proving Google, Dropbox and OneDrive login, refresh, relogin, actual image/link right-click, exact upload location, verified remote file readback, failure semantics, History, counts and memory. Repeat worker restart/menu survival and rapid mixed-provider tests. Test malformed identity config, missing registration, account mismatch, partial and uncertain upload, screenshot bursts, and removals (disable Basic and confirm Cloudflare is unaffected).

### GATE 5. Rehost to REDOWN repo/identity LATER, if desired

Once combined Click2Cloud-ID alpha is proven, separately transplant that full composite into a **fresh REDOWN integration branch** as a new edition. Swapping to REDOWN's existing ID requires a second audited public identity/deployment profile, registered callbacks and storage safety. **Do not modify REDOWN/main or an existing user's installation automatically.** Treat this as a deployment migration, not an in-place blind OAuth/client-ID rewrite.

### GATE 6. Candidate alpha / rollback

Alpha only when *every advertised provider* passes installed Chrome and live provider readback gates (or is clearly unavailable/disabled with no unsupported claims). Maintain baseline snapshots, isolated browser data, deterministic profile packaging and a rollback recipe. No false success/badge increments, no loss of user destinations, no mysterious menu disappearance, no leaking tokens/source URLs into provider metadata. If a Basic provider fails, disable its module without affecting Cloudflare and retain accurate error/History records. The Aesthetic API must style the provider cards when available, and deleting any optional theme/advanced animation must never affect auth/menu/saving.

## Specific regression/interaction matrix

| Risk | Prevent by design | How to prove |
| --- | --- | --- |
| Native context menu disappears again | Single canonical host menu owner, no routine destructive `removeAll`, no await on Basic auth during registration | Real Chrome before/after login/reconnect, worker wake/offline, repeated saves, provider toggles |
| Multiple workers/listeners/menu IDs collide | Basic module is not a second extension; only host registers native menus | Static import/manifest audit, collision fixtures, installed Chrome menu tree |
| OAuth failure under Click2Cloud ID | Per-provider public profile, actual runtime ID/redirect validation, exact provider console registration | Real login/refresh/consent and provider readback, not mocks only |
| User config/token overwritten | Versioned namespaces, no secret migration, explicit reconnect and optional reviewed export/import | Upgrade/restart/storage isolation tests in disposable profiles |
| Basic errors crash Cloudflare or UI | Guard module load/initialization, per-provider failed status, separate optional UI | Remove/throw each module and verify Cloudflare R2 native menu/save unchanged |
| Duplicate History and badge counts | One host operation ID + confirmed receipt projection | Mixed save replay/partial/uncertain tests |
| Memory spikes | Keep Basic bounded source acquisition independent of true-remote Cloudflare, small concurrency limits | 100/500/1000 bursts, p95 response, peak and settled RAM |
| Theme breaks a provider | Aesthetic API applies presentational tokens only; removable package/fallback | Unregister every optional theme with Basic and R2 still fully functional |

## Codex starter AFTER Gate 0 (NOT for the current P0 repair run)

> Work in `thanks-cohn/Click2Cloud`. First confirm that the native right-click P0 repair has passed on installed Chrome; otherwise STOP and finish P0. Pin the verified Click2Cloud commit and create a NEW integration branch from it. Read `proposals/CLICK2CLOUD_FIRST_REDOWN_BASIC_MODULAR_ALPHA_2026-11-21.md` and the donor `thanks-cohn/REDOWN:basic/portable-rehost-v1`. Import REDOWN Basic **only as three provider modules** within the existing Click2Cloud host. One MV3 worker, native menu/config API, Shelf, History and Aesthetic API remain authoritative. Keep Cloudflare R2 unchanged. Configure Basic OAuth against the ACTUAL installed Click2Cloud extension identity and report exactly which Google/Dropbox/Microsoft app registration/redirect changes need owner action; never claim unregistered callbacks will work. Implement staged tests and real readback, show progress/blockers, commit code, and leave both working source branches and REDOWN main unchanged.

**Decision summary:** Build the composite on a NEW Click2Cloud branch first, using Click2Cloud's existing ID for alpha integration and its repaired right-click engine as the foundation. REDOWN Basic is removable provider modules, not a second extension. Reuse approved OAuth registrations where compatible; Google needs a Chrome-extension client registered for the actual Click2Cloud ID. Rehosting under original REDOWN identity is a separate, optional last step.
