# CODEX IMPLEMENTATION REQUEST — REDOWN Basic API rehost into REDOWN Remote
**Date:** 2026-11-21  
**Repository:** `thanks-cohn/Click2Cloud`  
**REQUIRED working branch:** `codex/redown-basic-api-integration-0323-alpha-base-2026-11-21`  
**Exact source base/tag:** `redown-0.3.23-alpha-base` → `400c0509a36e76c2c5bd5ef5c5426fa5d5709db9`  
**Source provider project:** `thanks-cohn/redown-basic` (audit latest compatible source, with `main` baseline observed as `75a738803e61cf7fa62c50328aa6ca5cc2cd70dc`)  
**Detailed mandatory reference:** [docs/integration/REDOWN_BASIC_API_OAUTH_REHOST_REFERENCE_2026-11-21.md](docs/integration/REDOWN_BASIC_API_OAUTH_REHOST_REFERENCE_2026-11-21.md)

## OWNER'S DIRECT INSTRUCTION

**IMPLEMENT, TEST, COMMIT AND PUSH** the REDOWN Basic integration. This is **not** a request for another plan-only document or an entire UI transplant. The source branch already exists and is based on the owner's tagged, favorably reviewed alpha milestone, "AT A GLANCE GREAT!" Start actual implementation work on that branch. Do not switch to the old planning branch or replace the preserved alpha-base.

**Critical verification distinction:** The P0 Rename candidate on alpha-base was reproduced/fixed in local tests but **Windows Chrome and live Cloudflare R2 are still UNVERIFIED**. The owner wants integration development to begin now. **Do not block code implementation solely because live verification is pending**, but **do not claim this is release-ready, merge to main, deploy, modify production R2/Workers, or close the release gate** until actual live Remote and provider acceptance evidence exists. Never call a successful build a live save verification.

## PRODUCT VISION / NON-NEGOTIABLE VISIBILITY BOUNDARY

Host REDOWN Remote (existing Cloudflare R2 feature-rich extension) remains intact and in charge. REDOWN Basic contributes a **minimal independent provider subsystem** for **Google Drive, OneDrive and Dropbox**.

**Visually show ONLY**:
1. Exactly three provider/auth/login cards (Google Drive, OneDrive, Dropbox) added to the **existing host Shelf/Remotes** presentation, styled exclusively through the host Aesthetic API and semantic styling hooks.
2. Their three **native Chrome right-click save** choices under the **existing one Remote native menu owner**, with correct source context routing. Native menus are OS-controlled and cannot be styled by Aesthetic API.

**Transplant internally/headlessly**:
- Versioned trusted Basic API contracts, provider enumeration/readiness, connect/reconnect/refresh, safe GO TO, provider adapters, source acquisition and save coordinator.
- Independently stored attempts/History **DATA**, distinct proven-save ledger/counter, diagnostics events/queries/export (all internal APIs), provider-specific errors and receipts.
- No second History tab, no second Diagnostics tab, no Basic Settings tab/navigation, no Basic Shelf, no Basic CSS/theme, no Basic worker/bootstrap/onInstalled/onStartup/menu registrar, no parallel Cloudflare file engine. The existing host History/Diagnostics screens may display appropriate namespaced Basic information **without replacing host records, appearance or navigation**, but do not render Basic's original tabs.

**The existing Remote R2 save path, OAuth identity, Chrome extension ID, native menus, settings, Aesthetic API, File API 3+1.1, Explorer, preview/immersive Rename candidate, History, Diagnostics, screenshots, Get URL and user profile must be preserved.**

## API AND SOURCE AUDIT — DO BEFORE COPYING

Source REDOWN Basic documentation:
- `docs/API.md`: trusted *internal* API v1, request `{api:1,op,input}`, result `{ok:true,value}` or `{ok:false,error}`. Key operations `api.describe`, `providers.list/getStatus/checkSaveReadiness/goTo`, `auth.connect/reconnect/refresh`, `saves.start/getAttempt`, `history.list/get/delete/clear`, `counter.get`, `settings.get/update`, `diagnostics.list/getForAttempt/clear/exportZip`.
- `docs/ARCHITECTURE.md`: state machine, idempotency, durable attempts, confirmation ledger, diagnostics and authorized caller boundary.
- `extension/lib/api.js`, `lib/auth.js`, `lib/store.js`, `lib/coordinator.js`, `providers/index.js`, source acquisition and dependent modules: preferred headless extraction candidates.
- `extension/shelf.js`: inspect for login-card actions and semantics, **do not reuse whole UI**. `extension/shelf.css`: **do not transplant**.
- `extension/background.js`: inspect menu IDs and routing only; **do not run Basic's boot() or duplicate listener registration**. `extension/config.js` and `manifest.json` have placeholders and Basic's standalone identity; **do not copy those blindly**.

Host Aesthetic API: `docs/api/AESTHETIC_API_V1.md`, `src/aesthetic/host.mjs`, `src/aesthetic/packages.mjs`, `extension/aesthetic.css`. Confirm its actual 1.1 host behavior and active palette modes. The **Aesthetic API owns visual appearance only**, not provider authority or business logic.

**Internal API namespace:** Preserve the semantics of Basic API v1 through a namespaced/trusted host adapter. Do not collide with Remote's API 3+1.1 operation names, message envelope, storage schema or identity. Do not add an external HTTP API or expose privileged provider ops to untrusted web content, content scripts, cross-extension messages or arbitrary origins. Validate caller and input *before* effects. Keep per-provider errors independent.

## PUBLIC OAUTH REGISTRATIONS TO WIRE — OWNER-CONFIRMED WHERE INDICATED

**Target host Chrome extension ID:** `ajppphdiamdobknpamcheohmdbdbeoal`. The existing build uses a manifest key/identity guard. Verify the generated bundle retains this ID exactly; never drop the manifest key or change its OAuth callback identity.

| Provider | Public client configuration | Verification and least-privilege requirements |
| --- | --- | --- |
| Google Drive | Google project `redown-click2cloud`, Chrome Extension OAuth client `Click2Cloud REDOWN Alpha`, public client ID **`763628402500-nnvp04squ9dfpbsvp64egvgkhddlb0ff.apps.googleusercontent.com`** (recovered from owner's earlier console sessions) | Validate client registration and exact extension ID, Drive API enabled, consent/test users and `https://www.googleapis.com/auth/drive.file`. Use appropriate host manifest/Chrome identity integration; do not copy Basic's placeholder client. |
| OneDrive | Microsoft Entra app **`REDOWN`**, public application/client ID **`a8e034a8-6462-4022-b3f3-a79ffb6b1b84`** (recovered from earlier session); intended redirect `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/onedrive` | Validate registered redirect and SPA/public-client PKCE platform/origin behavior, `Files.ReadWrite`, `User.Read`, `offline_access` permissions. Check MSAL/token exchange CORS/AADSTS9002326/9002327 rather than changing security. Preserve existing app redirects. |
| Dropbox | **Owner supplied** developer app **`REDOWN`**, public App Key **`h0mbahfonf0zkul`**. **Owner confirms** redirect `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/dropbox` is **saved** in its App Console, and permissions `account_info.read`, `files.metadata.read`, `files.content.write`, `files.content.read` are enabled. | Verify runtime PKCE/state/nonce handling, redirect and user consent; ensure account access and refresh work. The additional `files.content.read` may be used when necessary for independent verification, not as a reason for expansive access. |
| Cloudflare R2 | Existing callback `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/cloudflare` | **MUST stay unchanged and functional.** |

**All client IDs above are public identifiers, not tokens, client secrets, or proof of live authorization.** Do not put passwords, App Secrets, private keys, access tokens, refresh tokens, cookies, authenticated HAR traces or sensitive response bodies in repo/diagnostics. Only use owner-authorized console access, user-mediated browser sign-in and disposable cloud objects. If a console cannot be reached, clearly mark its verification pending and continue safe code/test work.

## IMPLEMENTATION PHASES

**Phase 0 — Preserve alpha-base and record real baseline.** Confirm branch parent is `400c050`, no uncommitted changes, all existing extension/build entrypoints and one context menu owner. Run baseline focused tests. Preserve the working native R2 route and identity. Reference Rename local evidence in `docs/evidence/rename-p0/`. Record pending Windows/live R2 gates.

**Phase 1 — Headless Basic API rehost.** Select the appropriate Basic source commit and record origin for every transplanted module. Isolate coordinator/auth/adapters/source/store/ledger/diagnostics in clear host modules with bounded IO and namespaced storage (no collisions/erasure of Remote records). Keep `SAVED`, `FAILED`, `UNCERTAIN` truthful; only independent provider confirmation increments counters exactly once. When a worker is interrupted mid-upload, record `UNCERTAIN`, don't silently reupload or miscount. Preserve Basic validation/idempotency, immutable attempt IDs, privacy/redaction, and diagnostics independence. No claim that prior standalone Basic extension storage automatically migrates.

**Phase 2 — OAuth wiring.** Configure public IDs/scopes/redirects in host build and trusted config without changing extension identity. Authenticate each provider separately. Maintain GO TO as a navigation action, NEVER a replacement for actual Connect/Reconnect/Refresh/readiness. Handle invalid state, expired/revoked tokens, consent failure and unsupported origin without degrading R2. Do not add client secrets or new servers. Ensure real Chrome extension redirect state/PKCE is verified.

**Phase 3 — Only three cards, host-styled.** Add login/status/reconnect/GO TO actions for Google, OneDrive, Dropbox inside existing host Shelf/Remotes navigation; use Aesthetic API semantic tokens, current active themes/palettes, focus, disabled/loading and reduced-motion state. Do not import Basic's `shelf.css` or its History/Diagnostics/Settings pages. Provider event presentation cannot lie about saved/uncertain results. Card rendering must not break a cold boot or Remote's existing UI.

**Phase 4 — One native menu owner.** Extend the host's single existing `chrome.contextMenus` reconciliation/dispatch for three provider choices. One MV3 service worker; don't initialize Basic `background.js` as second worker or register duplicate callbacks. Maintain Cloudflare menus across startup, OAuth completion/reconnect, extension reload, Chrome restart and worker suspension. A Basic failure must not unregister R2 or other Basic menus.

**Phase 5 — Integration API and tests.** Expose History data, attempts, counter, diagnostics list/export and settings via host-trusted API for future scripting/automation; preserve host History and Diagnostics rather than duplicate tabs. Test schema validation, authorization rejection, storage failure isolation, request idempotency, readback, stream/memory bounds, repeated menus, worker restarts, collisions, profile persistence and UI theme breadth. Reuse/fix Basic tests in the host test harness, and add regression tests for R2 menu and Rename isolation.

**Phase 6 — Live provider acceptance and report.** With an authorized Chrome profile, run native right-click saves to Google Drive, OneDrive, Dropbox and existing R2 test destination, read back independent object ID/name/bytes/hash where supported, verify receipts/History/confirmed-only ledger. Test reconnect/expired token and worker stop/restart. If live Windows/R2 or any provider login/save is not available, **label the corresponding gate UNVERIFIED**, keep branch isolated, and report exact steps needed. Do not merge/deploy.

## PERFORMANCE AND FOLLOW-ON ROADMAP

The owner specifically values the **small footprint, instant native right-click utility, modularity and ability to script API tests**. No extra Cloudflare Workers, storage relay, long-running backend, broad caching, new telemetry pipeline, unbounded image/object buffering or second save engine. Maintain existing Explorer virtualization and bounded Basic source reads. Add measurement/regression evidence rather than claims such as "crash-proof".

**Deferred future feature:** Chutey-inspired **multiple cloud-file drag-and-drop into supported websites**, potentially ChatGPT and other upload targets; investigate virtual file handles, bounded staging, genuine destination compatibility and permissions later. **Do not implement or claim this future feature during this Basic integration.** The existing Chutey project is not to be merged into this task.

## STOP / DONE RULES AND FINAL CODEX REPORT

- **This run must attempt substantive integration source code and tests, not merely edit documentation.** Do as much as the authorized environment permits, and push completed work onto the dedicated branch with atomic commits. Don't halt the whole run simply because live credentials/Chrome are unavailable.
- Do **not** merge to `main`, re-tag or move `redown-0.3.23-alpha-base`, deploy, edit production Workers/buckets, reset user profiles, silently alter console permissions or erase Remote settings.
- Deliver: (1) Basic source revision and module map, (2) exact new architecture/host API and scope of UI change, (3) public OAuth configuration status by provider, (4) tests run with counts/commands and direct vs simulated coverage, (5) independent real-save receipt/hash evidence per provider or explicit UNVERIFIED, (6) native Cloudflare regression and Rename gate status, (7) exact branch/commit links, (8) outstanding risks and next operator steps.
- If partial, distinguish **implemented**, **unit/simulation tested**, **real-browser tested**, **live-cloud verified**, and **blocked/unverified** separately. No green success claim based solely on unit tests or OAuth website navigation.

**Read the detailed reference file before editing anything. The owner explicitly wants to build on the AT A GLANCE GREAT alpha snapshot without sacrificing its native R2 functionality.**
