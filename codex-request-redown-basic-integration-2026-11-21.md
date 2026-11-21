# CODEX IMPLEMENTATION REQUEST — REDOWN Basic API rehost into REDOWN Remote
**Date:** 2026-11-21  
**Repository:** `thanks-cohn/Click2Cloud`  
**REQUIRED working branch:** `codex/redown-basic-api-integration-0323-alpha-base-2026-11-21`  
**Exact source base/tag:** `redown-0.3.23-alpha-base` → `400c0509a36e76c2c5bd5ef5c5426fa5d5709db9`  
**READ-ONLY source repository + ALLOWED branch:** `thanks-cohn/redown-basic` @ **`main` only**, observed commit `75a738803e61cf7fa62c50328aa6ca5cc2cd70dc` (verify its HEAD without switching to any other branch)  
**Detailed mandatory reference:** [docs/integration/REDOWN_BASIC_API_OAUTH_REHOST_REFERENCE_2026-11-21.md](docs/integration/REDOWN_BASIC_API_OAUTH_REHOST_REFERENCE_2026-11-21.md)

## TWO-REPOSITORY BRANCH LOCK — NO EXCEPTIONS WITHOUT OWNER APPROVAL

The owner will supply Codex with **BOTH repositories**. Work ONLY with these two explicitly designated branches:

| Role | Repository | Sole allowed branch | Rules |
| --- | --- | --- | --- |
| **Destination / writable** | `thanks-cohn/Click2Cloud` | **`codex/redown-basic-api-integration-0323-alpha-base-2026-11-21`** | Implement, run tests, commit and push changes **only here**. Branch is based on tagged `redown-0.3.23-alpha-base` / `400c050`. |
| **Source / read-only** | `thanks-cohn/redown-basic` | **`main`** | Inspect and transplant the specified Basic modules **from this branch only**. Do not edit, commit, push, or create branches in this source repository. |

**STOP rather than silently switching** if the repository/branch identifiers available in Codex do not match the above. Do not checkout, pull from, cherry-pick, compare, merge or otherwise use alternate branches, tags or worktrees, including the historical Basic portability branch or the old Click2Cloud planning/main branches. Historic names in older notes are background, **not authorization**. Do not create a third integration branch. If the owner changes the supplied branch, seek explicit approval before changing these constraints.

## OWNER'S DIRECT INSTRUCTION

**IMPLEMENT, TEST, COMMIT AND PUSH** the REDOWN Basic integration. This is **not** a request for another plan-only document or an entire UI transplant. The source branch already exists and is based on the owner's tagged, favorably reviewed alpha milestone, "AT A GLANCE GREAT!" Start actual implementation work on that branch. Do not switch to the old planning branch or replace the preserved alpha-base.

**Critical verification distinction:** The P0 Rename candidate on alpha-base was reproduced/fixed in local tests but **Windows Chrome and live Cloudflare R2 are still UNVERIFIED**. The owner wants integration development to begin now. **Do not block code implementation solely because live verification is pending**, but **do not claim this is release-ready, merge to main, deploy, modify production R2/Workers, or close the release gate** until actual live Remote and provider acceptance evidence exists. Never call a successful build a live save verification.

## PRODUCT VISION / NON-NEGOTIABLE VISIBILITY BOUNDARY

Host REDOWN Remote (existing Cloudflare R2 feature-rich extension) remains intact and in charge. REDOWN Basic contributes a **minimal independent provider subsystem** for **Google Drive, OneDrive and Dropbox**.

**Visually show ONLY**:
1. Add a prominent H1 slogan **`From the Web to your Cloud.`** directly below the existing Remotes tabs and above the provider cards. Then stack **three separate, full-width VERTICAL cards in a SINGLE COLUMN**, exactly in order **Google Drive → OneDrive → Dropbox**. Place the **existing Cloudflare R2 login section immediately below Dropbox**. Absolutely NO horizontal three-card row, grid columns, wrapping into multiple columns, or reduced mini-card tiles. Host Aesthetic API and semantic styling hooks alone control appearance.
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

**Phase 1 — Headless Basic API rehost.** Inspect **only REDOWN Basic `main`**, verify and record its commit, and record that source for every transplanted module. Isolate coordinator/auth/adapters/source/store/ledger/diagnostics in clear host modules with bounded IO and namespaced storage (no collisions/erasure of Remote records). Keep `SAVED`, `FAILED`, `UNCERTAIN` truthful; only independent provider confirmation increments counters exactly once. When a worker is interrupted mid-upload, record `UNCERTAIN`, don't silently reupload or miscount. Preserve Basic validation/idempotency, immutable attempt IDs, privacy/redaction, and diagnostics independence. No claim that prior standalone Basic extension storage automatically migrates.

**Phase 2 — OAuth wiring.** Configure public IDs/scopes/redirects in host build and trusted config without changing extension identity. Authenticate each provider separately. Maintain GO TO as a navigation action, NEVER a replacement for actual Connect/Reconnect/Refresh/readiness. Handle invalid state, expired/revoked tokens, consent failure and unsupported origin without degrading R2. Do not add client secrets or new servers. Ensure real Chrome extension redirect state/PKCE is verified.

**MANDATORY VISUAL LAYOUT AND PRESERVED BASIC CARD BUTTONS (owner clarification):**
- Within the existing **Remotes** page, below its existing navigation tabs, render **exact H1 slogan:** `From the Web to your Cloud.` Use the existing host Aesthetic API heading typography; no additional generic subtitle unless already part of existing Remotes design.
- Immediately below, a single vertical stack of **three full-width independent provider cards**, in order: **Google Drive**, **OneDrive**, **Dropbox**. Each must have adequate padding, consistent space between cards, and responsive **one-column** composition at every Shelf width. **Do not horizontally arrange or grid the cards, even on wide viewports.**
- Under Dropbox, retain the **existing Cloudflare R2 login** in its original functional form. These are four distinct full-width sections in that order.
- **Do NOT simplify Basic provider cards to generic Connect tiles.** Preserve their previously developed functional actions, behavior and feedback: primary **Sign In** for unconnected users, dynamically **Reconnect / Approve** when appropriate, **Refresh** for silent/readiness refresh, and separate **GO TO** provider website action. Include the existing readiness indicator/status, reason/next action, and recent save result/feedback if provided by the Basic API, with accurate live states. GO TO must not impersonate OAuth readiness. Preserve semantics of transient success/failure card feedback and reduced motion; don't replay animation on render.
- The buttons and content are transplanted **functionally**, but **not Basic's CSS**. Adapt structural markup into host-owned semantic components so the **existing Aesthetic API** owns color, font, background, border, spacing, focus, motion and button aesthetics without competing rules. Only limited host-owned structural hooks may be added; never import Basic's `shelf.css` or parallel theme selectors.
- Test card ordering, H1 exact wording, all action labels/states, narrow width, visual harmony with Cloudflare, Aesthetic API palette switching, and screen-reader/keyboard flow.

**Phase 3 — Only three cards, host-styled, ABOVE Cloudflare.** Place Google Drive, OneDrive and Dropbox cards **immediately above the current Cloudflare R2 login area on the existing Remotes screen**, with tasteful shared spacing, alignment and responsive grouping. Do not replace, bury, move to another tab, or break the Cloudflare card or its login. Use native host patterns to keep a premium unified appearance even at narrow Shelf widths; do not require a wide desktop layout. Each new card has functional login/status/reconnect/GO TO actions, accessible focus/disabled/loading states and reduced-motion behavior.

**ZERO COMPETING BASIC PRESENTATION RULES:** The Basic transplant must arrive with **no independent visual skin**. Extract provider card actions/semantic markup and their headless auth/provider behavior, **not** Basic's CSS declarations, color variables, fixed font sizing, hard-coded backgrounds, shadows, borders, gradients, custom themes, inline CSS styling, or generic selectors. No Basic `shelf.css`; no Basic theme switcher. Use the REDOWN host's existing card markup/semantic adapter, and when truly necessary, add only small **host-owned, narrowly scoped structural layout hooks** for card arrangement that do not override Aesthetic API colors, typography, spacing tokens, radii, focus or states. Avoid `!important`, global `.card` overrides and new parallel theme variables. The Aesthetic API should fully restyle every provider card when theme/palette changes; design must not visually compete with the existing Cloudflare card. Test all five host appearance palettes and light/dark modes plus narrow/wide layouts. Provider event presentation cannot lie about saved/uncertain results. Card rendering must not break a cold boot or Remote's existing UI.

**Phase 4 — One native menu owner.** Extend the host's single existing `chrome.contextMenus` reconciliation/dispatch for three provider choices. One MV3 service worker; don't initialize Basic `background.js` as second worker or register duplicate callbacks. Maintain Cloudflare menus across startup, OAuth completion/reconnect, extension reload, Chrome restart and worker suspension. A Basic failure must not unregister R2 or other Basic menus.

**Phase 5 — Integration API and tests.** Expose History data, attempts, counter, diagnostics list/export and settings via host-trusted API for future scripting/automation; preserve host History and Diagnostics rather than duplicate tabs. Test schema validation, authorization rejection, storage failure isolation, request idempotency, readback, stream/memory bounds, repeated menus, worker restarts, collisions, profile persistence and UI theme breadth. Reuse/fix Basic tests in the host test harness, and add regression tests for R2 menu and Rename isolation.

**Phase 6 — Live provider acceptance and report.** With an authorized Chrome profile, run native right-click saves to Google Drive, OneDrive, Dropbox and existing R2 test destination, read back independent object ID/name/bytes/hash where supported, verify receipts/History/confirmed-only ledger. Test reconnect/expired token and worker stop/restart. If live Windows/R2 or any provider login/save is not available, **label the corresponding gate UNVERIFIED**, keep branch isolated, and report exact steps needed. Do not merge/deploy.

## FULL AESTHETIC API COVERAGE AND NEW THEME: FRAMES — OWNER REQUIREMENT

**Quality bar:** Deliver a cohesive, finished, professional, premium Windows-desktop-style user experience, not merely an API transplant with working buttons. The generated mockup is **one illustration of the direction**, **not** a frozen universal blue/light skin; the UI **MUST dynamically honor whichever theme, active color palette, typography selection, light/dark mode, busy-cursor style, and other supported Aesthetic API preferences the user selects in Settings**. Retain user-selected appearance through restart; do not secretly force a theme/palette or make Frames the default unless an existing explicit user preference requests it.

**New selectable host theme: `Frames`**
- Create a **first-class, persistent, selectable "Frames" theme** in existing Settings appearance/theme controls, alongside current themes, **without deleting, replacing, renaming, or resetting any existing theme or palette**.
- Design direction: premium professional Windows-inspired desktop interface (Windows productivity feel, NOT a pixel-for-pixel copy of Microsoft UI). Refined panel frames, structured but airy surfaces, crisp legible typography, calibrated control density, disciplined whitespace, subtle depth/highlights, precise separators, well-defined active/focus/hover states, and accessible contrast. Sophisticated rather than flashy; avoid heavy visual effects, memory-heavy assets or gratuitous animations.
- Use the **existing host Aesthetic API and host-owned theme/token/semantic-adapter mechanisms**. Audit `src/aesthetic/packages.mjs`, `src/aesthetic/host.mjs`, `extension/aesthetic.css`, existing Settings appearance registration and variant styles to implement Frames in the correct architecture. `Frames` must be a **theme/style**, not a hardwired blue palette; color selection stays independently configurable. It must have light/dark behavior and be compatible with all existing configurable palette options (including Original Rose, Ocean Blue, Emerald Forest, Amethyst, Sunset Amber, where applicable) and available typography choices. Add only necessary host-owned semantic selectors and vetted tokens; no parallel theme engine, no raw CSS inside data-only aesthetic manifests, no style specificity wars or `!important` overrides.
- Frames styling must apply across the **entire existing extension**, including header/tabs, Remotes and four-provider vertical stack, Cloudflare login and settings, Explorer List/Details/Grid, History, diagnostics, normal preview, immersive viewer, overlays, dialogs, menus, progress/feedback, controls, keyboard focus and status states; do not only skin three Basic cards. Do not alter cloud engine APIs, command ownership or permissions from visual code.
- Preserve established component semantics, contrast, keyboard flow, reduced-motion behavior, popovers, dropdown alignment and narrow Shelf resilience. Any pre-existing theme/color mode combination must continue to look coherent.

**Theme and quality acceptance matrix:**
1. Enumerate actual supported themes, palettes, typography/appearance preferences and light/dark variants from the live code; add Frames to the selectable theme inventory and test **all supported theme × palette × light/dark combinations**, plus available font/spacing settings and busy cursor alternatives where practical. Do not assume the historical palette count is fixed.
2. Test the Remotes page with the exact H1 `From the Web to your Cloud.` and **three vertically stacked provider cards, then existing Cloudflare**, at narrow and expanded Shelf widths. Each card retains Sign In / contextual Reconnect / Refresh / GO TO, readiness reason and actual status. At no width should the three become horizontal tiles or overlap tabs.
3. Validate card layout, readable wrapping, spacing, line-height, button grouping, no horizontal overflow, minimum hit targets, contrasts, keyboard/focus order, disabled/loading/error/success/uncertain states, dark mode, reduced motion and color preference persistence after restart. No unthemed white blocks under dark mode or out-of-palette fixed blues.
4. Automated regression tests should verify theme registration/selection/persistence/fallback and CSS isolation, plus screenshots/visual checks of real installed-browser themes across key widths. A theme failure must be visual-only and never stop R2 or Basic saves.
5. Run existing build, menu, Rename, Aesthetic API, Explorer, History and UI suites before proposing merge. Record browser screenshots/test evidence and specific remaining defects. Fix rough edges to the highest feasible production-quality standard; **never equate visual polish or passing mocks with production acceptance**.

**Deployment gate:** The owner wants a **deployment-quality finished product**, so treat polish and reliability as acceptance criteria. However deployment is **NOT authorized** and the release remains **NOT READY** until Windows Chrome/live Cloudflare R2 and real Google/OneDrive/Dropbox OAuth and native right-click object-byte verification have actually passed. Complete coding and available tests on this branch, and report missing live proofs truthfully.

## PERFORMANCE AND FOLLOW-ON ROADMAP

The owner specifically values the **small footprint, instant native right-click utility, modularity and ability to script API tests**. No extra Cloudflare Workers, storage relay, long-running backend, broad caching, new telemetry pipeline, unbounded image/object buffering or second save engine. Maintain existing Explorer virtualization and bounded Basic source reads. Add measurement/regression evidence rather than claims such as "crash-proof".

**Deferred future feature:** Chutey-inspired **multiple cloud-file drag-and-drop into supported websites**, potentially ChatGPT and other upload targets; investigate virtual file handles, bounded staging, genuine destination compatibility and permissions later. **Do not implement or claim this future feature during this Basic integration.** The existing Chutey project is not to be merged into this task.

## STOP / DONE RULES AND FINAL CODEX REPORT

- **This run must attempt substantive integration source code and tests, not merely edit documentation.** Do as much as the authorized environment permits, and push completed work onto the dedicated branch with atomic commits. Don't halt the whole run simply because live credentials/Chrome are unavailable.
- Do **not** merge to `main`, re-tag or move `redown-0.3.23-alpha-base`, deploy, edit production Workers/buckets, reset user profiles, silently alter console permissions or erase Remote settings.
- Deliver: (1) Basic source revision and module map, (2) exact new architecture/host API and scope of UI change, (3) public OAuth configuration status by provider, (4) tests run with counts/commands and direct vs simulated coverage, (5) independent real-save receipt/hash evidence per provider or explicit UNVERIFIED, (6) native Cloudflare regression and Rename gate status, (7) exact branch/commit links, (8) outstanding risks and next operator steps.
- If partial, distinguish **implemented**, **unit/simulation tested**, **real-browser tested**, **live-cloud verified**, and **blocked/unverified** separately. No green success claim based solely on unit tests or OAuth website navigation.

**Read the detailed reference file before editing anything. The owner explicitly wants to build on the AT A GLANCE GREAT alpha snapshot without sacrificing its native R2 functionality.**
