# CODEX REQUEST — REDOWN Proven Provider Reliability Transplant, Without Losing Basic History/Diagnostics
**Date:** 2026-11-22  
**Priority:** P0 / alpha blocker  
**Request type:** A *future Codex implementation run*; creation of this Markdown file is documentation only.

## 0. Owner's problem and objective

The owner reports: in newly integrated REDOWN Remote/Click2Cloud, Google Drive Sign In sometimes flashes and reports "Google authorization was cancelled or denied" (even in Google Chrome); by the following day Google Drive, Dropbox, **and** OneDrive provider cards were all unavailable. The owner reports the older REDOWN family seldom exhibited these symptoms. Some earlier Codex browser tests confirmed menus and simulated saves, **not live OAuth + successful writes to all three providers**.

**Mission:** Study **everything useful and demonstrably relevant** in original REDOWN's more mature three-provider authentication, connectivity, reconnect/refresh, startup recovery, queued-attempt durability, event handling, and resource discipline. Selectively *transplant and adapt* those behaviors into the **existing** REDOWN Remote Google Drive, OneDrive, and Dropbox cards, while **preserving REDOWN Basic's API v1, durable save engine, History, confirmation ledger, counters, diagnostics, and ZIP export intact**. Maximize practical reliability and minimize Chrome MV3 startup, CPU, storage I/O, RAM, and message pressure. **Do not assume** prior REDOWN was crash-free or that any single architectural cause has already been proven.

**No general redesign:** Keep the existing three cards in their present Remotes location, existing Aesthetic API, themes, all original actions and Cloudflare R2 card, and the current Shelf/header/panel layout. The **only explicitly authorized UI changes beyond provider reliability** are the in-Shelf branding correction (section 0A), the connected-provider button label correction (section 0B), and the screenshot History Host URL disclosure plus its expansion preference (section 0C). No tab reshuffle, panel sizing changes, Bad Boy theme, licensing/paywall features, new History UI or broader visual overhaul. This run is **provider reliability plus these three narrowly scoped UI refinements**, not a broad aesthetics or History-redesign workstream.


## 0A. Owner-approved surgical header branding correction — ONE change inside the Shelf

**The owner's screenshot shows TWO distinct branding regions. Do not confuse them.** The owner explicitly clarified: **"the top most [branding] preserved but the bottom one actually inside the shelf [should] simply become an iconic R"**.

**What must remain untouched (TOPMOST / browser-controlled title row):** In the Chrome/Edge side panel, the **very top row outside the dark application content** currently displays the small red R browser/extension icon followed by the text **REDOWN**, plus the browser's own panel controls. **Preserve this entire topmost title row exactly as displayed.** Do not modify `extension/manifest.json` name/title/icons, `<title>REDOWN</title>`, extension ID/key, browser-owned title UI, toolbar branding, or the browser's panel controls to accomplish this task. This is the **ONE** location where visible **REDOWN** text should remain in the two branding rows.

**What must change (SECOND row / dark in-app Shelf header):** The current application-owned header in `extension/app.html` has:

```html
<header class="app-header">
  <div class="brand-lockup"><img src="icons/redown-32.png" width="20" height="20" alt=""><strong>REDOWN</strong></div>
  <nav aria-label="Application"> ...existing Remotes / Files / History navigation... </nav>
  ...existing theme control...
</header>
```

Replace **only the in-app `.brand-lockup` icon+visible wordmark** with a **single larger copy of the existing red R asset** (the same graphic identity; do NOT replace it with plain letter R typography or import an old `.brand-tile` or invent a new logo). **Remove only this lower visible `<strong>REDOWN</strong>`**, not the topmost browser title text. The current in-Shelf image is rendered at **20 × 20 CSS pixels**. Increase its *displayed size by approximately 75%* to **35 × 35 CSS pixels** (20 × 1.75 = 35), with a small layout tolerance of **about 34–36px** only if needed for clean single-row fit. **Do not make it huge or enlarge the header**; choose appropriate asset resolution (`icons/redown-32.png`, `icons/redown-48.png`, or existing higher resolution from the current icon family), preserve aspect ratio and sharp edges. Do not stretch or distort the image, change its colors, redraw it, or make it lopsided. Preserve accessible branding: a suitable `alt="REDOWN"` / accessible name for the solitary application-logo image, without restoring visible wordmark text.

**Exact layout intent — ALL CONTROLS ON ONE ROW, NO EXCEPTIONS:** ONE coherent horizontal **application** header row, including its rightmost control: **[existing iconic red R, enlarged]  [Remotes]  [Files]  [History]  [More / ⋯ dropdown]  [theme button]**. The theme button is **ON THIS SAME LINE**, at the right edge. More / ⋯ is **ON THIS SAME LINE**, between History and the theme control. **No control may wrap onto a second line** at normal supported Shelf widths; no second header band, no stacked theme button, no hidden/forgotten More menu, no overflow off-screen, and no horizontal scrolling. The R is the leftmost visual anchor, with visually balanced/even gaps and aligned control centers. Use a single-row no-wrap grid/flex layout with responsive spacing, compact tab paddings, and icon-only **More / ⋯** at narrow widths if necessary; preserve keyboard, focus, accessible labels, and dropdown behavior. Keep every control visible at the owner's narrow side-panel width shown in the screenshot (~360px content width), and test at the smallest supported panel width, with a legitimate layout fallback rather than secretly adding a row. Preserve current header height/position (~existing 56px desktop baseline) except minimal alignment adjustment necessary for the ~35px R (75% larger than the original 20px icon). Keep the Remotes/Explorer panels below as high as the compact single-row header allows; **never shift the content panels downward or leave a vacant wordmark row**. Preserve the existing lower panel, splitter, bottom Manage Destinations area, interactions and existing responsive navigation. This specific request is **NOT** an instruction to move the browser's REDOWN title, remove a different icon, or redo the Shelf.

**Mandatory text mockup (SINGLE ROW, theme does not drop below):**

```text
TOP / browser-owned, unchanged:  [small R] REDOWN
INNER / app-owned, change:     [ICONIC RED R]   Remotes   Files   History   ⋯   [theme]
────────────────────────────────────────────────────────────────────────────
CONTENT immediately below:    All Your Clouds. One Place. / provider cards / Explorer
```

**Responsive rule — no wrapping OR collisions:** At narrow side-panel widths, keep the R, Remotes, Files, History, More/⋯ dropdown, and theme button **all on the same row**, with no overlapping icons/text, clipped labels, touching hit targets, off-screen elements, scrollbars, or collision between adjacent controls. First reclaim the space of the removed inner REDOWN wordmark; then adjust gaps, horizontal padding, and individual control padding; and, **if still necessary, slightly reduce navigation text size** with a readable, responsive CSS rule that uses existing Aesthetic API typography/color tokens. **Do not shrink the red R drastically, collapse labels into illegibility, or shrink the 3-dot/theme hit areas until they are hard to use.** Use the existing compact `Files` label at narrow widths as intended. Keep all controls keyboard accessible, with visible focus states, minimum reasonable tap targets and no overlapping clickable rectangles. Do not hide, drop, relocate, or omit the More menu or theme toggle; never put them on a second row. This is a **hard acceptance criterion**.

**TEST EVERY REAL THEME — NOT JUST DEFAULT DARK:** Enumerate all themes/palettes exposed by the actual `src/aesthetic/packages.mjs` and `src/aesthetic/host.mjs` API at implementation time, **not merely a hardcoded subset**. At present this includes **Minimal, Remote V1 (Standard), Golden Age, Oceania, Nostalgia with its Kawaii / Dungeon Master / Heroine substyles, and Frames**; also cover every applicable built-in palette, light and dark variants, and any relevant font preference. Test the theme/variant combinations that are actually supported and mark unsupported combinations as such rather than silently ignoring them. Each theme's unique fonts, letter spacing, weight, button chrome and padding may change actual control widths: **re-evaluate geometry after the theme CSS/font has loaded**, not only in the initial default theme. All themes must render the identical single-row structure without collisions, missing More control, broken dropdown popover, broken theme toggle, text clipping, overlapping focus outlines, or vertical shift into the two content panels. Keep theme styling governed by the **existing Aesthetic API** and avoid hardcoded CSS that fights theme selectors/tokens.

**Targeted proof — automatic geometry + visual tests:** Compare before/after at **multiple compact and expanded side-panel widths**, including the owner's ~360px view and the smallest supported width, across **every theme, substyle, applicable palette, and light/dark presentation**. Assert with browser `getBoundingClientRect()` measurements that the R, Remotes, Files/Explorer, History, More, and theme button: **(a)** all have approximately the same vertical center, **(b)** do not overlap or collide, **(c)** are fully inside the header viewport without overflow, **(d)** have usable individual interaction regions, and **(e)** do not produce a second header row. Check `scrollWidth` versus `clientWidth`, dropdown opening/closing, accessible labels/keyboard/focus, and saved/theme changes that dynamically alter fonts. Capture representative before/after browser screenshots and **add or update regression tests** for the full theme matrix; enumerate combinations actually exercised, failures, and any unverified runtime cases in the Codex handoff. Verify separately that the browser-owned top title still shows the small R + REDOWN while the inner header shows **only one 35px R and no REDOWN text**; content panels should begin immediately below with no lost vertical space. If browser-owned top row cannot be changed programmatically, **do not try**—this request specifically preserves it.

**Scope precedence:** Section 0A explicitly overrides any later sentence in this request saying "no R/wordmark styling" or "no unrelated Shelf visuals" **only for this one exact change**. Every other visual/layout change remains prohibited. This branding correction is small and must not distract from the provider-reliability P0 investigation.

## 0B. Owner-approved provider card label — exactly "Reconnect"

For each existing REDOWN Basic provider card (**Google Drive, OneDrive, Dropbox**) in Remotes, replace the **visible** connected-state action label `Reconnect / Approve` or `Reconnect/Approve` with **exactly `Reconnect`**. When disconnected, keep the label **`Sign In`**. Keep **`Refresh`** and **`GO TO`** unchanged. This is a **presentation-only text correction**: preserve the existing underlying `auth.reconnect` API operation, OAuth scope/consent and approval behavior, security boundaries, click handlers, recovery, and accurate readiness/errors. Do not rename the operation, skip permissions, remove approval where required, or change unrelated Cloudflare R2 labels.

Verify all three cards at connected and disconnected states, including after a service-worker restart and after reauthorization. Assert that visible button text is **never** `Reconnect / Approve` and remains **`Reconnect`** whenever the button performs reconnect. Do not add an extra row, enlarge cards, change other buttons, or compromise the responsive layout. The existing `must-do.11.22.2026.md` may be consulted for background, but do **not** import its separate TRUE REMOTE subtitle work into this run.

## 0C. Screenshot History: standalone expandable Host URL BELOW the image + Settings preference

**Exact owner request:** Every screenshot's History preview should show the captured page's Host URL in **its own small expandable "Host URL" row directly beneath the actual screenshot image**, not inside the existing destination `URLs` section, not as a copyable card and not as another History entry.

```text
[ Screenshot image preview ]
▸ Host URL
```

Expanded:

```text
[ Screenshot image preview ]
▾ Host URL
    https://example.com/the-page-where-the-screenshot-was-taken
```

**Separate from cloud links:** The existing destination-specific `URLs` disclosure/card describes the uploaded object and must stay intact, in its current position and with its current behavior. The new **Host URL** is the original webpage **at screenshot capture time**, not a blob/image/R2/public-object URL or the page currently open in the browser. Display this under **the image itself** within its preview area, before destination cards. A screenshot saved to several destinations has **one** Host URL disclosure, not a duplicate for each destination. Do not insert it inside `URLs` or add any "Copy" button/card.

**Use existing records, no new capture system:** `extension/screenshot-background.mjs` already records `historyContext:captureHistoryContext({pageUrl:job.plan.context?.url})`. `src/history/model.mjs` already projects `historyRecord().hostPageURL`. `extension/history-page.mjs` currently has the screenshot preview plus Capture details with an existing Page link. Reuse `r.hostPageURL` in a lightweight `<details><summary>Host URL</summary>...</details>` immediately after the screenshot image preview, preserving lazy loading and current screenshot card functionality. Show the existing stored URL in plain readable text (or a simple ordinary link); **do not** reuse the destination public-URL copyable-card component. For missing older host URLs, simply show "Host URL not captured"; do not invent or fetch a value. Avoid unnecessary duplicate Page URL presentation in Capture details without removing its canonical data.

**NEW HISTORY SETTING — default is NO / collapsed:**
- Add a small yes/no checkbox to **Settings → History**, labeled **"Expand screenshot Host URL by default"**. Initial/default state: **unchecked (No)**.
- **Unchecked:** each screenshot's Host URL disclosure starts **collapsed**; the user can click it open individually.
- **Checked:** each screenshot's Host URL disclosure starts **expanded** when History screenshot previews are rendered; the user can still collapse or re-expand any individual row manually. It is a default, **not** a forced-open lock.
- Persist this single boolean preference using the **existing History preferences mechanism** (`getHistoryPreferences` / `setHistoryPreferences`, associated storage) where compatible. Missing/older preferences default to `false`. Keep the existing History display-range, image-preview expansion, timezone and export settings unchanged. The user's manual per-row toggle should not immediately reset during unrelated async image-load/status updates; when genuinely reinitializing the view, follow the stored default.
- This setting affects **display only**, not which URL is recorded or exported, and it is **not** another privacy setting, permission or confirmation prompt. No new History database, indexer, background job, or polling loop.

**No new URL-privacy system:** The owner does **not** want any additional privacy toggles, domain-hiding, opt-in prompts, filtering layers or security machinery for this disclosure. Use the **already stored Host URL** exposed by the existing History model and **leave the current URL-handling/export behavior as it is**. Do not change the current browser permissions or provider upload metadata. Do not transmit page/source URLs to cloud providers merely to display them in local History.

**History export:** The Host URL must be exported as the already-existing `hostPageURL` property associated with the screenshot's operation ID when the user exports History **with screenshots included**, in **JSON, JSONL and CSV**. The current `src/history/model.mjs` `exportHistory()` already includes that field for normal History exports; verify it and fix any actual omission with minimal code. Do not create a separate exporter, duplicate field, new diagnostic events, or change Basic History/diagnostics. Keep the **existing** History export selection/behavior, including its existing privacy checkbox, unchanged; the new default-expansion checkbox has no effect on export contents.

**Required tests:** Host URL appears directly below screenshot image (never under destination `URLs`); no copyable URL card; default unchecked/collapsed; checked/expanded; manual per-record toggle works in both modes; setting persists across History navigation, panel close/reopen and browser restart; no flicker/reset on async preview load; no duplicate disclosure for multi-destination screenshots; missing legacy URLs show honest fallback; all themes and narrow widths remain usable; JSON/JSONL/CSV exported screenshot records retain the correct captured `hostPageURL` and operation ID; screenshots-excluded exports still exclude screenshots; previously retained records, diagnostics and screenshot verification remain unchanged. Report actual browser vs fixture results honestly.

## 1. STRICT authorized repository and precedence

- **WRITE ONLY:** `thanks-cohn/Click2Cloud`, existing branch `codex/redown-basic-api-integration-0323-alpha-base-2026-11-21`.
- **READ ONLY:** `thanks-cohn/REDOWN` (exact references below) and `thanks-cohn/redown-basic` `main`.
- Do not create/switch branches, merge into `main`, force-push, change source repos, deploy Cloudflare production, or publish Chrome Web Store.
- This document is the **sole controlling implementation request for this dedicated P0 reliability Codex run**. Other requests, including `must-do.11.22.2026.md` (which also contains a separate TRUE REMOTE subtitle change) and `codex-request-redown-aesthetic-polish-cloudflare-independent-menus-2026-11-21.md`, are reference/context or **separate tasks**; don't expand scope to implement them **except** that this document independently authorizes the `Reconnect` visible-label change in section 0B. Do **not** implement the TRUE REMOTE subtitle task here. Preserve current presentation and existing owner-approved strings, including any prior improvements already present.
- **DO IMPLEMENT:** inspect, diagnose, patch source, add focused tests, run tests, commit, and push changes to this **same branch** once the owner starts this Codex run. Do not stop after a plan or code audit. If a live-provider step is inaccessible, do everything safely testable and report the blocked live gate as `UNVERIFIED`, never `PASS`.

## 2. Exact historical REDOWN comparison set (not just the oldest version)

Read and compare **all three** before selecting source patterns:

1. **Owner-approved good checkpoint** — `thanks-cohn/REDOWN`, annotated tag `checkpoint/2026-11-03-good-before-p0-menu-startup-repair`; source commit `7b9d1cc7faa7511ed57e9e09b1b5281380fede2d`. It was owner-rated good, but its tag explicitly documents a native-menu startup/reconciliation problem.
2. **Later high-success checkpoint** — `thanks-cohn/REDOWN`, tag `95-percent-plus-success`; source commit `653ad9b5fdd59532df571514fc60053d8a7b13bb`. The tag describes **119 completed/verified and 2 blocked among only 121 retained attempts** from a larger session; it is NOT an independently measured 95% rate across 900–1,000 operations, and explicitly records an unresolved apparent Chrome disappearance/crash. **Do not transplant unbounded diagnostic logging or other possible crash contributors.**
3. **Latest original REDOWN `main`**, observed at commit `c78babc314acc5891203e95b169f027756e956c1` (re-read latest actual tip). Compare subsequent auth-related branches only when relevant and proven better, but **do not** silently substitute a historical or experimental revision for these anchors.

Critical source files to inspect on each applicable REDOWN revision:
- `extension/google-drive-provider.js`, `extension/google-drive-stream.js`, `extension/google-drive-auth.js`, `extension/shelf-google-drive.js`
- `extension/dropbox-auth.js`, `extension/dropbox-provider.js`, `extension/shelf-dropbox.js`
- `extension/onedrive-auth.js`, `extension/onedrive-provider.js`, `extension/shelf-onedrive.js`, `extension/onedrive-oauth-diagnostic.js`
- `extension/background.js` (provider-specific dispatch) and `extension/service-worker.js` (startup handling) — **behavioral references only**; do not copy their entire worker/bootstrap or parallel registrar.
- Provider-relevant tests `tests/google-drive.test.mjs`, `tests/dropbox.test.mjs`, `tests/onedrive.test.mjs`, `tests/onedrive-connected.test.mjs`, `tests/consolidated-dropbox-login.test.mjs`, `tests/windows-oauth-history.test.mjs`, `tests/worker-bootstrap-first-install.test.mjs`, plus resource/recovery tests relevant to any borrowed logic.

Inspect the destination's **current actual source**, not just stale documentation:
- `src/basic/host.mjs`, `src/basic/lib/auth.js`, `src/basic/lib/api.js`, `src/basic/lib/coordinator.js`, `src/basic/lib/store.js`, `src/basic/lib/common.js`, `src/basic/lib/source.js`, `src/basic/providers/index.js`, `src/basic/lib/zip.js`
- `extension/background.mjs`, `extension/basic-provider-cards.mjs`, `extension/basic-diagnostics-export.mjs`, `extension/app.mjs`, `extension/manifest.json`, `src/chrome/trusted-sender.mjs`
- `docs/integration/REDOWN_BASIC_INTEGRATION.md` and `docs/integration/REDOWN_BASIC_API_OAUTH_REHOST_REFERENCE_2026-11-21.md`
- `tests/basic-auth.test.mjs`, `tests/basic-host.test.mjs`, `tests/basic-core.test.mjs`, `tests/basic-providers.test.mjs`, `tests/basic-diagnostics-export.test.mjs`, related native-menu integration tests.

In final handoff, include a concise **source-vs-destination transplant matrix**: original behavior / historical revision / evidence or rationale / new implementation / tests / deliberately rejected heavier or unreliable components.

## 3. Source-supported architecture problem: fix it without losing Basic

Current destination `src/basic/host.mjs` calls `trustedStorage()` → `openStore(indexedDB,'redown-remote-basic-v1')` → `store.recover()` **before creating and servicing Basic's common API host**. As written, a failure in this shared initialization may make **all three providers' Sign In, Refresh, GO TO, and status operations** unavailable at once. Its `request()` catches broad initialization exceptions and replies `STORAGE_UNAVAILABLE`; `extension/basic-provider-cards.mjs` may display the generic `Provider unavailable.` fallback on missing/invalid replies. **This is a credible failure path, not proof of the owner's exact runtime cause**.

**Required safe design:**
- Separate **lightweight authentication/status/navigation availability** from **durable save/History/diagnostics initialization**. A failed/pending Basic IndexedDB recovery must NOT prevent Sign In/Refresh/Reconnect, truthful status/error reporting, or the pure `providers.goTo` website action.
- Keep **the trusted sender boundary** and **same `redown-basic-v1`, `api:1`, `op`, `input` contract**. Don't open APIs to arbitrary websites, content scripts, other extensions or untrusted pages.
- Each provider's auth state, pending login, refresh, and error/retry logic must be isolated: a broken Google grant, blocked Dropbox OAuth, failed OneDrive refresh, or one bad database operation must not lock the other two cards.
- A save **MUST NOT** bypass `src/basic/lib/coordinator.js` and the durable Basic IndexedDB ledger merely because the auth-only service works. If durable save storage is unavailable, fail closed *for new saves*, preserve already-pending/uncertain attempts, give a truthful recoverable error, and permit safe retry after storage returns.
- Recover from an initialization failure with bounded retry/on-demand reinitialization (no permanently rejected promise), and preserve previously committed store data. Do not erase the database, replace it with a parallel ledger, or auto-reset connection state.

## 4. Extract proven original REDOWN behavior, not entire files

### A. Authentication and reconnect: Google Drive, Dropbox, OneDrive
- Compare actual good/latest REDOWN implementations and select **per-provider, single-flight login and refresh** behavior: one interactive login per provider/gesture; join a legitimate in-flight request; no duplicate OAuth popups; prevent stale async completion after disconnect/reconnect (epochs, identity checks); clear active in-memory promises on settlement.
- Authenticate **only after explicit Sign In / Reconnect / user save gesture** where supported; restoring the Shelf, checking status, startup/restart, and passive Refresh must not unexpectedly launch consent.
- Distinguish `disconnected`, `connecting`, `checking`, `ready`, `reconnect-needed`, `auth-failed`, `browser-api-unsupported`, `storage-unavailable`, and `network-temporary` where appropriate. **Do not report every exception as user cancellation.** Current Google `getAuthToken` catch maps all exceptions to `AUTH_CANCELLED` for interactive login; fix categorization using safe cause codes, while never leaking OAuth codes or tokens.
- **Google Chrome:** preserve the intended Chrome Identity flow and scopes, verify the **unified destination extension ID and Google OAuth client registration**. Confirm `drive.file` grants and real Drive `about.get` identity check; handle stale cached token (401) correctly. Do not reuse the original REDOWN extension ID or its old Google OAuth client blindly.
- **Microsoft Edge:** assess whether this installed build supports the Chrome-only Google token API and provide a **supported and registered** Google OAuth flow (e.g. authorization-code + PKCE through supported identity redirect flow) if necessary. Verify Google client type, redirect, authorization and token-exchange requirements before implementing a fallback; **never assume the Chrome Extension OAuth client supports a different redirect/browser**. If registrations cannot be validated or live Edge OAuth cannot be tested, report `UNVERIFIED/BLOCKED` with exact required owner-console action, rather than fake success. Do not change the Cloudflare login or other provider behavior to work around Edge.
- **Dropbox and OneDrive:** use their original REDOWN patterns where sound: PKCE and nonce/state validation, offline refresh credentials stored securely, root/namespace/drive/account verification, 401/403 handling, rotating refresh persistence *before* follow-up work, reconnection after expiry, and recovery on MV3 restart. Preserve the unified REDOWN Basic API's provider scopes and configured new client apps.
- Correct any `connect()`/status/readiness race, deadlock, repeated popup, or stale `connected` projection. A stored `connected` flag is NOT token proof. A token-verified live status is NOT a verified file save.
- Preserve provider identity isolation: never save to an account/root other than the one the current authorization actually verified. No silent account switch.

### B. Keep the three existing Basic cards, responsive and usable
- Preserve original card controls **Sign In / context-sensitive Reconnect, Refresh and GO TO**, their OAuth actions, and existing Remotes placement/Aesthetic API styling. **Connected button reads exactly `Reconnect`, never `Reconnect / Approve` or `Reconnect/Approve`; disconnected button reads `Sign In`. This is label-only; the underlying approval/reconnect functionality stays intact (section 0B).** Don't import REDOWN's old Shelf CSS, old separate cards, or a competing visual/branding engine.
- Maintain targeted `chrome.storage.onChanged` or equivalent authenticated event-driven updates: paint status promptly, dedupe in-flight clicks, ensure buttons re-enable after failure, and never flash/loop on mount. Follow original REDOWN's separation of transient action feedback from durable connection state. Avoid per-card tight timers/polling.
- Ensure GO TO remains **navigation only** and works without provider authorization or Basic database availability; it is not a login nor a readiness assertion.
- Clear generic `Provider unavailable.` / `Google authorization was cancelled` misdiagnoses; show user-safe specific code/action (configuration, unsupported browser, real cancellation, lost connection, storage, worker unavailable, etc). Include actionable diagnostics that distinguish UI message timeout/rejection, worker failure, OAuth failure, IndexedDB failure and provider HTTP failure.
- Do not inadvertently implement pending separate design-only requests: keep label, typography and header changes scoped to already approved/implemented code. No R replacement.

### C. MV3 startup/restart/recovery with LOW OVERHEAD
- Follow sound elements of original provider-specific startup and queue recovery, **not** its entire 200KB+ background script or any unbounded forensic writer.
- Preserve **one extension service worker, one native `contextMenus` registrar/owner and one Basic API host entry point**. No duplicate event listener/registrar, extra service worker, secondary extension, service worker keepalive loop, periodic all-cloud polling or network-heavy initial discovery.
- Register browser event listeners synchronously on worker evaluation; lazily initialize only the subsystem actually needed. Do not delay native Basic menu registration on Cloudflare availability or history-heavy reads.
- A worker restart/suspension must not create duplicate OAuth windows, discard a real saved intent, falsely announce success, or poison `ready` until browser restart. Recover saved attempts by durable ID and reconcile uncertain provider results *without double-uploading*.
- Use bounded, serialized, idempotent recovery with backoff only where justified, coalesced per-provider refresh/in-flight operations, finite timeouts, and bounded persistence. Prefer event-triggered checks on open/click/retry to redundant frequent network probes.
- Keep memory and disk pressure low on constrained Windows hardware (~4GB system RAM and sometimes <1GB free disk). **Measure** worker/side-panel startup CPU and memory, number of timers/listeners/alarms, number of storage writes, open DB handles, queued promises, and growth across repeated worker lifecycles; compare before/after with reproducible instrumentation. No fake performance guarantees or arbitrary numbers substituted for actual benchmarks.
- Look for and repair only **evidence-backed** resource leaks or over-bursty behaviors in touched provider paths. Bounded log retention and safe diagnostics errors matter; do not enable capless logging, retain all images in memory, spin on failed requests or add huge DOM watchers.

## 5. NON-NEGOTIABLE: Preserve the transplanted REDOWN Basic system

This is explicitly *not* a request to replace Basic with REDOWN's old transfer/history engine. **REDOWN Basic continues to own the following contracts and durable data, even if auth and recovery internals are improved:**

- API v1 `redown-basic-v1` and existing operations: `providers.*`, `auth.connect/reconnect/refresh`, `saves.*`, `history.*`, `counter.get`, `settings.*`, and `diagnostics.*`, especially `diagnostics.exportZip` and the Settings action **Export Other Cloud Provider Diagnostics**.
- The Basic indexed database `redown-remote-basic-v1`, its saved attempts, ledger, event records, History pagination/search semantics as currently supported, receipt keys, idempotency and retention/settings. Treat its schema/data as user-owned. **No reset, silent clearing, replacement, destructive migration or automatic importing of the old REDOWN history.** If a schema change is truly necessary, preserve old records with versioned and rollback-tested migrations; prefer none.
- Basic's verified-upload semantics: provider-confirmed object identity/name/bytes or integrity readback, no false `SAVED` / counters / toast from a login or upload request, and `UNCERTAIN` instead of blind replay after ambiguous commits. `src/basic/lib/coordinator.js` and existing provider adapters remain the authority for successful Basic saves, not copied original REDOWN upload writers.
- All existing Basic RAW diagnostics API calls, event provenance (according to current privacy policy), diagnostics toggle/cap, ZIP format/16 MiB cap, cancellation/error messages, and local export. Preserve Cloudflare diagnostic paths separately. If optional diagnostic writes fail, mark degraded diagnostics truthfully but do not falsely mark successful saves as failed (or vice versa). If core storage fails, do not fabricate a durable receipt.
- Keep the existing Basic account-credential namespace `redownRemoteBasicV1:auth:*` compatible unless a safe and reversible migration is demonstrated. Do not overwrite credentials with old REDOWN namespaces. Prevent token/refresh credential exposure in telemetry, history, diagnostics ZIP or the user-facing panel.
- The host's Cloudflare R2/TRUE REMOTE engine, native menu routing, OAuth, History, Explorer, Aesthetic API and worker integrity receipts remain unchanged except absolutely necessary narrow integration wiring.

**Regression proof required:**
1. Populate existing Basic DB with multiple `SAVED`, `FAILED`, `UNCERTAIN` attempts and diagnostic events/settings. Upgrade to patched build *without deleting browser data*. Check same IDs, timestamps, counts, status, History ordering/pagination, event associations, diagnostics settings, export-readability, and zero duplicated entries/counters.
2. Simulate Basic DB unavailable/corrupt/recover-in-progress: still allow auth/status/GO TO where secure, but **no Basic save without a durable attempt**, no unknown success, and no data loss; after recovery old ledger and ZIP remain readable.
3. Simulate account/token expiration, refresh race, real cancellation, failure in one provider, MV3 suspend/restart, closing the Shelf, and 24h/48h time advance. Ensure the other two providers and Cloudflare remain independent.
4. ZIP export on healthy Basic store still goes through **existing** implementation; no new recorder/database or enlarged log cap to solve the outage.

## 6. Performance and quality gates

Implement focused deterministic tests plus real-browser tests **where the environment permits**:

- Fresh install; real Google/Dropbox/OneDrive consent and `about/get_current_account/Graph` authorization checks; never label each one ready without verification.
- Chrome **and Edge** supported flows; record tested version/extension ID and clarify Chrome-specific vs Edge-specific APIs/clients. For all three, verify end-to-end **native right-click → actual provider write → independent object ID, filename, size and byte/hash readback → single Basic History record → single success count → export diagnostics**. Fake or simulated provider responses are not live confirmation.
- Close/reopen Shelf 20 times, restart worker repeatedly, reload extension, restart Chrome, and simulate next-day/48h token expiry. Verify no unexpected login popup, permanent spinner, sticky disabled buttons, duplicate listeners, lost menus, repeated full-list scans, unnecessary network calls, or runaway memory/log growth.
- Stress **bounded** concurrent login attempts, multiple cards clicked quickly, network outages, auth cancellations, quota/IndexedDB failures and slow providers; verify predictable recovery, meaningful codes, stable resource usage and no wrong-account writes.
- Compare **baseline versus after** for peak/steady-state worker memory, panel memory, UI responsiveness, startup latency, timer/alarm frequency, indexed storage operations, diagnostic events per user action, and open database/active promises. Report measured values, methodology, machine and any unmeasured dimensions; **performance regressions require investigation**.
- Run `npm run test:focused`, `npm test`, `npm run build:extension`, `npm run check:api-docs`, plus new targeted tests. Do not reclassify prior archived Depth digest/authorization failures as new regressions; document them separately. Do not declare browser-live acceptance from fixtures alone.

## 7. Deliverables and completion criteria

1. **Actual code changes** on the authorized Click2Cloud feature branch: provider-specific auth/resilience behavior adapted from original REDOWN; decoupled service availability; safe Basic API bridging; focused tests.
2. A concise **transplant matrix** with source revisions/paths and what was **adopted vs rejected** (especially crash-risk/high-overhead features).
3. Test report: `PASS / FAIL / UNVERIFIED` per **each provider** and per **Chrome vs Edge**, simulated vs actual provider receipt, plus memory/CPU/storage observations. If live OAuth console access or provider credentials unavailable, report exact blocker without requesting secrets or pretending completion.
4. History/diagnostics integrity report with existing record counts/sample IDs before-and-after in test fixtures, zero data loss/duplicate success, verified export ZIP. No production credential dumps.
5. **The three surgical UI changes**: header branding in section 0A; provider-card label in section 0B (exactly `Reconnect`); and screenshot History Host URL disclosure **beneath the image**, plus the **unchecked-by-default Settings checkbox** and existing History-export coverage in section 0C. Preserve every other appearance detail.
6. **Focused commits and a normal git push** to the same existing branch. Verify GitHub remote contains all commits; report SHA(s). No branch creation, merge, force push, production deployment or Web Store publication.

**Completion standard:** The three Basic cards remain usable after cold start, during unrelated provider failure, and after overnight restarts; original REDOWN's worthwhile low-overhead behavior is recovered **without replacing or damaging Basic's History, diagnostics, verified ledger or counters**. If browser/live-cloud confirmation is blocked, say **UNVERIFIED** and do not claim the P0 is closed.

**Avoid overreach:** Except for the three precise UI corrections authorized in **sections 0A, 0B and 0C**, do not fix unrelated Shelf visuals, other R/wordmark styling, pyramid copy, API licensing, payment systems, Bad Boy aesthetic, Cloudflare onboarding, History redesign or other older Codex requests. Do not recreate original REDOWN's full background/queue architecture inside this integrated host.
