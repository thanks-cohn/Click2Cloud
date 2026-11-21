# CODEX IMPLEMENTATION REQUEST — REDOWN Alpha: Cloudflare-First Reliability, Modular Integration & Graceful Degradation

**Date:** 2026-11-21  
**Owner's highest-priority instruction:** **WHATEVER HAPPENS TO ANY OTHER SUBSYSTEM, REDOWN'S ORIGINAL CLOUDFLARE R2 FUNCTIONALITY MUST SURVIVE.** Never sacrifice working Cloudflare behavior to gain a Basic provider feature or a prettier interface. An introduced Cloudflare regression is a **hard stop / alpha release blocker**. No false promise can guarantee availability during an actual Cloudflare outage, browser restriction or revoked authorization; the objective is that unrelated failures **never take down** the original Cloudflare system.

**Task status:** This file is the implementation brief for the **next separately initiated Codex run**. Authoring the file now is **documentation-only**, not permission for ChatGPT to alter application code, merge or deploy. When the owner supplies this request to Codex, carry out the prescribed implementation, tests, commits and push under the branch restrictions below.

## 1. EXACT repository and branch locks

- **ONLY writable destination:** `thanks-cohn/Click2Cloud`, branch `codex/redown-basic-api-integration-0323-alpha-base-2026-11-21`.
- **ONLY read-only source:** `thanks-cohn/redown-basic`, branch `main`.
- Do **not** create, switch, merge, cherry-pick from, push to or modify any other branch or repository. All implementation changes and commits go **only** to the destination branch. Do not change original release tags.
- Do not deploy, publish, merge to main, or claim alpha-ready until explicit release gates are met. Preserve existing extension identity, key, OAuth callback routes and native context menu ownership.
- Before coding, read fully: `codex-request-redown-basic-integration-2026-11-21.md`, `docs/integration/REDOWN_BASIC_API_OAUTH_REHOST_REFERENCE_2026-11-21.md`, `docs/integration/REDOWN_BASIC_INTEGRATION.md`, and especially `docs/integration/NEXT_CODEX_PREMIUM_VISUAL_DIRECTION_2026-11-21.md`. This request is the **current authoritative implementation prioritization**; recent owner requirements supersede old conflicting UI/UX suggestions. Source security and branch restrictions are never superseded.
- Record a reproducible baseline: current commit, build, focused tests, R2 tests, native-menu fixtures, browser fixtures, existing known failures and still-unverified live Cloudflare checks. Record evidence before touching shared files.

## 2. THE PRIME DIRECTIVE: CLOUDFLARE R2 MUST REMAIN INDEPENDENT AND INTACT

**Protected original REDOWN/Click2Cloud subsystem:**
- Cloudflare OAuth and existing provider authorization/repair;
- TRUE REMOTE R2 saving, Worker fetch/transfer and byte/receipt verification, bucket selection/defaults and first-run behavior;
- original Cloudflare History durable records, History UI semantics, per-entry GO TO identity, screenshot receipts, chronological browsing, exports, Explorer, preview and Rename;
- existing native right-click registration/dispatch for Cloudflare, Aesthetic API, verified-only toolbar counter and settings/recovery data.

**Non-negotiable protections:**
1. Do not rewrite, replace, transplant over, or migrate the Cloudflare saving engine, OAuth, History persistence, verified receipts, GO TO, Cloudflare provider card flow, Explorer or worker setup to accommodate Basic providers. Prefer a wrapper/adapter **outside** these protected internals.
2. There must remain **one** MV3 service worker, **one** native `chrome.contextMenus` owner, **one** host UI/Aesthetic API, and independent per-provider authorization. No second Basic extension shell, CSS system, History tab, Diagnostics tab or worker.
3. **Failure isolation:** a missing/malformed Google/OneDrive/Dropbox OAuth configuration, IndexedDB error, background initialization failure, feature-flag issue, request timeout, view exception, preview, History adapter or diagnostics exception must not interrupt Cloudflare initialization, login, readiness, menus, remote transfer, receipt confirmation, History, Explorer or screenshot pipeline.
4. **Do not await Basic startup, ZIP export or visual adapters on the critical Cloudflare startup/save path.** Initialize optional modules independently and tolerate their absence. Contain failures at module boundaries. Never share Basic credentials/storage transactions or global failure states with Cloudflare.
5. A Basic provider's failure is an **isolated provider failure**, never `HISTORY_UNAVAILABLE` for every provider or a global connection reset. One provider's `AUTH_REQUIRED` is not proof Cloudflare is disconnected.
6. **Fail closed on claimed results; fail gracefully on optional functionality.** Only a verified, provider-confirmed durable save may show success, create a verified badge increment or claim an exact GO TO. Failures and uncertain uploads remain truthful and cannot cause automatic duplicate upload retries.
7. No diagnostic logging problem should invalidate a legitimate verified save. No history preview or cosmetic issue should block sending/saving. If optional modules cannot load, Cloudflare remains useful and its current UI still navigable.
8. No provider's source URL or webpage URL is sent as upload metadata to Google/OneDrive/Dropbox/Cloudflare; provider adapters receive filename and file bytes only, preserving established privacy boundaries.

**Explicit kill switch / rollback protection:** Provide a narrow, testable way to disable **new Basic integration/adapters and combined UI** without disabling or changing existing Cloudflare capabilities. It must not change Cloudflare credentials or persisted records. Do not create a complicated new toggling framework; one narrowly scoped internal rollback switch is sufficient. Never conceal a Cloudflare regression behind feature flags and call alpha ready.

## 3. Minimal modular design — add, don't rewrite

Build only the smallest additive modules needed, with versioned narrow contracts and tests:
- **Basic provider boundary:** existing `src/basic/host.mjs` + trusted Basic v1 API own Google Drive, OneDrive and Dropbox auth, source acquisition, saved-object verification and attempts. Let the original host worker remain the sole native-menu owner.
- **History projection:** read Basic's existing store through `history.list`/`history.get`; map results to namespaced view-only records; render with one small Basic-only History card component. Never copy Basic records into Cloudflare's authoritative database or force the two databases into one.
- **Chronological feed composer:** merge **page/cursor-backed** Cloudflare results and Basic results by timestamp/operation ID for one visible timeline, search and export. Do not fetch all records into an `all[]` array. Repair the pre-existing History eager-loading issue in the narrowest possible way **without changing Cloudflare semantics/records/cards/GO TO**. Add a stable cursor interface to Basic only if needed; keep the existing Basic API callable.
- **Diagnostic coordination:** one customer-facing master control enables advanced/unlimited capture across all four providers, and one RAW/SECURE ZIP export gathers both independently owned systems. Preserve the existing recorder and Basic diagnostics DB. Do not introduce a third recording engine or globally block saves for logging.
- **Per-file GO TO and badge:** add a read-only Basic saved-object resolver for exact verified Google/OneDrive/Dropbox item navigation, and connect Basic verified receipts to the pre-existing daily toolbar badge; keep Cloudflare GO TO and badge semantics untouched.
- **Presentation:** all Basic modules use the host Aesthetic API; preserve Cloudflare card functionality, original Basic card button behaviors and no competing Basic CSS.

Keep all provider-specific logic in provider adapters, not scattered throughout the giant Shelf/History script. Prefer narrow additions over mass renames or large refactors. No destructive data migrations.

## 4. Owner's REQUIRED behavior — implement in priority order

### P0-A. Baseline Cloudflare protection / independent save reliability
- Prove current Cloudflare login, right-click save → remote confirmation, History, GO TO, Explorer, Rename, screenshots and badge remain functional **before and after** every shared integration change.
- Right-click user contract: **authorize the cloud provider, then right-click → save → done.** No repeated REDOWN permission buttons for third-party CDNs and no new REDOWN setup wizard. Engineer source acquisition to work on the first attempt wherever browser permissions/site policies allow. Never circumvent Chrome consent, authentication or site ACLs; if a browser-enforced approval cannot be avoided, make the limitation accurately visible and preserve pending intent where feasible.
- Specifically investigate OneDrive's `d24focqdekc5bg.cloudfront.net` unreadable-source failure and the generic `SOURCE_UNAVAILABLE` classification. A CDN-origin failure cannot disable all providers.
- Investigate Google Drive **Sign In briefly flashes and opens nothing in Edge**. The Google code currently uses `chrome.identity.getAuthToken`; check Edge support and implement supported OAuth flow where Edge is in scope. Test Chrome separately and report unverified browsers. Do not blame user cancellation when API initiation failed.
- Revalidate real successful/failed/uncertain result handling and exact byte verification per provider. No mock confirmations or cross-provider failure propagation.

### P0-B. Unified visible History — **CLOUDFLARE HISTORY IS SACROSANCT**
- **Keep all existing Cloudflare History storage, record display, previews, GO TO and verification as they currently work**. Add Google Drive, OneDrive and Dropbox History entries **alongside**, not in place of R2; one timeline, two independent source stores.
- Every independently verified Basic save gets **its own card**, not one card per provider: correct filename, provider icon/name, local date/timestamp, actual lazy-loaded image thumbnail when available (or honest file-type placeholder), status, an expandable **URLs** section with **1. Host Source URL (page of the original right-click) and 2. Source URL (direct media/file link)** first, and a per-entry **GO TO** that targets the exact verified saved object where possible. Generic provider-home must be labeled differently.
- Preserve missed/failed/pending/uncertain Basic attempts as truthful history records under existing visibility rules; preserve statuses in exports. No duplicated cards after refresh/restart or retry.
- Keep existing chronological grouping, search, filters, stable pagination and responsive themes; never display a fixed notification over Previous/Next. Hovering over a toast promptly dismisses it without an accidental underlying click.
- **One History export** (JSON/JSONL/CSV supported formats) includes **all four providers and applicable screenshots**, all requested pages/ranges, status, provider, timestamp, exact IDs and the two source URL fields when captured. Preserve Cloudflare export compatibility; don't silently export the visible 25 items only.
- Metadata-first storage; truly bounded cursor/page loading, lazy thumbnails; do not allocate a million-history-item array on a 4 GB RAM machine.

### P0-C. One switch / one ZIP diagnostics across ALL CLOUD providers
- In **existing Settings** the owner needs **ONE** visible `Unlimited Advanced Diagnostics — All Cloud Providers` switch. One activation enables relevant in-depth capture for Cloudflare, Google Drive, OneDrive and Dropbox, **without the 4,000-event app retention cap**. Do not make the owner set limits in two separate screens or independently start Basic's diagnostics.
- REDOWN's existing advanced forensic recorder remains its own engine; Basic keeps its own diagnostic event store and API. Both must provide genuinely useful source/host URL provenance, provider, timestamps, attempt/operation IDs, stages, errors and outcomes; do not claim identical advanced detail where one engine cannot observe a stage.
- Implement one `Export RAW Diagnostics ZIP` and same **SECURE** alternative. **One ZIP**, organized by source engine and provider, with complete available events, screenshots when appropriate, coverage and counts, no third database. RAW can expose sensitive browsing URLs: keep it local, warn clearly before deliberate sharing, do not include credentials/tokens or provider upload bytes. SECURE redacts sensitive values.
- Basic already supports `settings.update({diagnosticsEnabled:true,diagnosticsCap:null})`, `diagnostics.list`, and `diagnostics.exportZip`. REDOWN's rich recorder has different controls and its basic 4,000-entry cap must not be confused with rich-recording unlimited. Audit both separately and implement the smallest compatible adapter. Export code's existing Basic 16 MiB and REDOWN 512 MiB limits must not silently truncate; large exports should use bounded reads/streaming or return an explicit accurate partial/failure result. **No export process may freeze or crash Cloudflare saving.**
- Master switch reports ON for all only after both engines are actually configured. If one fails, others remain active; show which coverage is unavailable. Turning off collection must not delete prior evidence.

### P0-D. Toolbar + UI baseline
- Increment the Chrome toolbar's **one existing verified-only daily counter** for every independently verified right-click save across Cloudflare/Google/OneDrive/Dropbox and every independently verified cloud screenshot; deduplicate retries, duplicate receipts, worker restarts and multi-destination screenshot capture. Never count queued/failed/uncertain.
- Remotes page exact order: `All Your Clouds. One Place.`; compact Google Drive, OneDrive and Dropbox cards (original meaningful buttons); **two separate rows** `The Future is NOW.` and `True Remote is Here.`; original Cloudflare R2 section below. Cloudflare R2 logic must not be rebuilt. No permanent status essays.
- Maintain genuinely distinct **Frames** (crafted Windows-inspired), **Golden Age** (Pinterest-like appropriate masonry) and **Oceania** (nostalgic Tumblr-era) through the Aesthetic API, accessible and lightweight in narrow side panels. These must not delay fixing P0 functional regressions or introduce expensive preview rendering. Follow detailed visual directions in the referenced doc.

### P0-D1. Exact new Remotes slogan + non-sticky timed notification (owner update, Nov 21)

- **Replace the opening Remotes headline everywhere** (template, render-path, localization/fixtures/tests and any conflicting historical spec) with the exact owner-approved copy: **`All Your Clouds. One Place.`** Capitalization and final period matter. It must be the single opening Remotes H1 above the Google Drive card. This **supersedes** all earlier copies of `From the Web to your Cloud.`; keep the separate two-line `The Future is NOW.` / `True Remote is Here.` interlude before Cloudflare unchanged. Keep Aesthetic API styling and responsive wrapping.
- **P0 bug:** The visible bottom-right notification **`Review the current panel or History for details.`** has remained onscreen for **two hours** in the owner's Edge screenshot. It is transient status feedback, **NOT a persistent overlay, pinned banner, or indefinite alert**. Identify its real creation path and repair lifecycle end-to-end, not just hide it with CSS.
- Default **automatic self-dismiss timer**: ordinary informational/success toasts approximately **5 seconds**, more important error/recovery summary toasts approximately **8–10 seconds**; all must automatically disappear and release hit-testing after their bounded lifetime. If this exact generic notification is emitted, it must have a finite lifetime too. Preserve important failure details and recovery actions in durable History, per-operation details or diagnostics, **not a sticky notification**. Never hide an actionable authentication dialog/modal by treating it as a toast.
- **Second defense: instant hover-to-dismiss** remains owner-required. The notification must not obscure History Previous/Next, cloud actions or other controls, even before expiry. Provide an accessible keyboard-dismiss path and screen-reader announcement without stealing focus; respect reduced motion.
- Correctly cancel/replace stale timers and DOM nodes on rerender/navigation, avoid a stale timeout erasing a newer toast, prevent repeated re-emission of the same generic notification from status polling, service-worker wake, background message replay, reconnect events or history refresh, and never resurrect an expired/dismissed notification. Define notification identity/dedup and bounded display semantics; protect against memory/timer leaks in Chrome/Edge side panels.
- **Must test** fixed duration with fake clock where possible, auto-dismiss without user hover, hover dismissal, screen navigation, repeated identical events, errors, worker restart, close/reopen, rerenders, no hidden DOM interception, no two-hour survivors, narrow History pagination accessible and existing Cloudflare R2 operations unchanged. Capture before/after Edge screenshot and real Chrome verification. Make this an isolated UI change, no engine rewrite.

### P0-E. Three owner-confirmed Shelf UI repairs (Edge screenshot, Nov 21)

**Visual evidence:** owner-provided screenshot shows REDOWN in the narrow Microsoft Edge side panel. Treat this as an **exact UI request**, not an invitation for a navigation rewrite. Make the following three scoped repairs in the next Codex implementation; leave the cloud engines, History data and original Cloudflare logic untouched.

1. **Fix horizontal overflow in the app's navigation/shortcut row** (currently the dark top strip with R, Remotes, File Explorer, History, More and the appearance toggle). At narrow sidebar widths, the shortcut row must not clip labels, squeeze them into unreadability, hide buttons under More/the theme control, or create accidental two-line overlap. Use a genuinely responsive solution: preserve important direct tabs; allow keyboard-operable horizontal scrolling with clear focus/overflow affordances or a compact accessible overflow menu for less frequently used items, as appropriate. Never have a control that is visually present but unclickable. Respect browser zoom, accessibility text sizing, touch/pointer hit targets and reduced motion. Keep selected-tab state obvious. Do not let this repair accidentally hide the important History/Explorer/Remotes access.
2. **Remove only the redundant giant `History` heading inside the History page.** On the screenshot the content displays a large `History` heading followed by `The Rest is History`. The **only visible page headline at the top must be exactly `The Rest is History`**. Promote that existing phrase to the single accessible semantic `<h1>` of the History view, with the existing theme's polished typography; remove the extra visual heading and avoid a blank gap. Preserve the **History navigation tab**, History data, Cloudflare original record renderer, exports, pagination, preview, screenshot and GO TO.
3. **Restore REDOWN's small red-square/white-R icon immediately to the LEFT of the `REDOWN` wordmark in the topmost title/header**, so the combined icon + brand name is a compact polished lockup again (not plain text, and not a huge duplicate hero logo). Use the existing real `extension/icons/redown-16.png` / `redown-32.png` asset or appropriate existing icon registration, not an invented replacement or an external image URL. **Important ownership distinction:** in the screenshot, the white top bar `REDOWN ... X` appears to be the **browser-owned side-panel header** while the dark row below is extension-owned (already has a square R icon). Codex MUST first determine what Chrome/Edge actually allows: verify manifest/action icons, panel registration, browser-specific title and icon behavior. If browser-native chrome cannot display an extension-controlled icon there, **do not falsely claim to inject HTML into browser chrome** or create an ugly redundant header. Provide the closest faithful in-app brand lockup at the top of the extension-controlled surface, adjusting existing dark-bar logo/title arrangement rather than duplicating the R icon unnecessarily. Explicitly report the browser limitation and what renders in real Edge and Chrome; the owner's desired visual outcome remains the reference.

**Verification:** use the provided Edge screenshot to reproduce the narrow panel. Capture before/after screenshots on Edge and Chrome at narrow/wide widths, 100%/125% zoom, light/dark and at least Frames/Golden Age/Oceania. Test all nav items by pointer and keyboard; ensure no overflow clipping or invisible/unclickable targets. Confirm History displays only the chosen visible headline, one semantic h1, retains original Cloudflare functionality and paged controls, and that the REDOWN R mark visibly accompanies its title in the best browser-supported position. No regression in authenticated provider cards, right-click menu or account identity. Keep this as a small, reversibly committed UI-only change, after core Cloudflare reliability gates.

## 5. Failure-isolation and regression TEST MATRIX — mandatory

For every injected failure, explicitly confirm **Cloudflare's existing independent path remains functional**. The same test pattern must show unaffected Basic providers working when one fails.

| Fault / scenario | Must survive, without a global failure |
| --- | --- |
| Google/Dropbox/OneDrive OAuth failure or Edge unsupported auth API | Cloudflare login/menu/save/History/Explorer and other provider sessions |
| Basic IndexedDB unavailable/corrupt or Basic host initialization rejection | Cloudflare startup and History remain operational |
| Basic provider's source is CDN/redirect/HTML/403/429/unknown length | R2 unaffected; affected save marked failed/uncertain truthfully |
| Basic upload accepted but proof/readback uncertain | No false confirmation or duplicate replay; R2 unaffected |
| Cloudflare OAuth/Worker/R2 unavailable | Basic providers remain usable; R2 is accurately marked unavailable (cannot promise Cloudflare service itself works during its own outage) |
| Cloudflare History read unavailable | Basic cards can still render; Cloudflare records are neither erased nor fabricated |
| Basic History read or pagination fails | Existing Cloudflare History cards and navigation still render |
| History preview decode/timeout/corrupt thumb | Name, timestamp, URL expansion, GO TO and saves still work |
| Basic diagnostics disabled/fails, REDOWN recorder fails, or ZIP too large | Save and Cloudflare remain functional; export is explicitly partial/failed with missing coverage |
| Worker suspension/restart, duplicate receipt, repeated UI mount | No lost verified receipts, duplicate toolbar increments or repeated Basic History cards |
| 4,001+ diagnostics events with Unlimited enabled | Both engines report actual retention and gaps; no incorrectly claimed complete archives |
| 100+ saves per provider + day/week/year boundaries + very large history | Stable ordering, bounded memory, cursor pagination, correct two URLs and all-provider exports |
| Bad provider object ID or deleted/moved object | Per-entry GO TO reports missing/changed; never opens wrong file |
| Narrow viewport, hover-dismiss notification, theme/reduced-motion | Pagination/controls remain clickable and keyboard accessible; Cloudflare UI unchanged |
| Low disk/storage quota/browser-permission denial | Truthful, isolated failure without corrupting existing Cloudflare storage |
| Installed extension ID/OAuth callback/native menu owner change | **Forbidden regression**: protect pre-existing identity and only one context-menu owner |
| Cloudflare live R2 Rename, verified remote save/GO TO, screenshot | **Hard alpha acceptance gate**, not optional just because fixtures pass |

Tests must cover unit contracts, provider fixtures, fault injection, browser UI, actual ZIP contents, and *live* Windows Chrome OAuth + real object/byte verification for all four providers where owner environment can support it. Edge Google sign-in is a separate verification gate if Edge support is claimed. Never label unrun live tests PASS. Capture exact commands, counts, failing tests, Windows/build/version, commit SHA, evidence and remaining blockers.

## 6. Execution discipline — short path to a trustworthy alpha

1. **Baseline first; no speculative refactor.** Run/build/test and document starting Cloudflare behavior. Keep existing integrations intact.
2. **Secure containment.** Add only narrow fault boundaries to Basic entry points/History/diagnostics and protect Cloudflare startup/path. Add failure-injection tests **before** making broad UI changes.
3. **Fix real saving blockers** (Google sign-in, OneDrive CDN/source path, verified receipts) with provider-specific changes. Do not mix with aesthetic rewrites in one commit.
4. **Add Basic History cards as a separately testable feature**, read-only projection + paged composition + per-object GO TO + all-provider exports, leaving Cloudflare records/UI alone.
5. **Add master unlimited diagnostics and one RAW/SECURE ZIP** via existing APIs/export machinery. Verify actual ZIP content and completeness, including severe partial failures; run concurrently with saving to prove non-blocking behavior.
6. **Integrate toolbar badge and polish UX/themes** while preserving right-click, Explorer, History and Cloudflare functionality. Keep visual changes isolated from engine business logic.
7. After each stage run targeted, shared-path and Cloudflare regression tests; use small reversible commits only on the authorized branch. If a change makes Cloudflare fail, **STOP, revert the introducing change on this same branch**, and report it rather than continuing.
8. Finish with a table of **PASS / FAIL / UNVERIFIED** per provider and major feature, reproducible commands, commit SHAs, test artifacts, known gaps, rollback procedure and a truthful **ALPHA GO / NO-GO** recommendation. Do not merge, deploy or release automatically.

## 7. Hard alpha-launch GO / NO-GO criteria

**NO-GO** if any introduced regression affects Cloudflare R2 login/true-remote verified saving, first-run, bucket readiness, original History and GO TO, Explorer/Rename, screenshot preservation, native context menu registration, extension identity or record persistence. **NO-GO** if any provider reports success without independently verified durable cloud bytes, if a failing Basic service disables the rest, if a ZIP claims complete while silently dropping providers, if cross-provider History overwrites R2 records, or if essential Windows Chrome/live-cloud acceptance was not performed. Label untested functionality **UNVERIFIED**, not success.

The owner wants alpha soon, but **a protected, reliable Cloudflare foundation is more important than shipping every optional aesthetic detail on the same day**. Any remaining optional visual refinements can be itemized separately **without quietly removing or rewriting the owner's requirements**.

**Definition of done:** the original Cloudflare system works exactly as before; adding three providers produces independently usable login/save/History cards; failures stay isolated; one History view/export covers the relevant provider records; one unlimited diagnostics control and one RAW/SECURE ZIP provide truthful evidence; daily badge counts only verified saves/screenshots; the recorded live tests and release gates are satisfied. Everything else is a clearly named gap, not a hidden regression.
