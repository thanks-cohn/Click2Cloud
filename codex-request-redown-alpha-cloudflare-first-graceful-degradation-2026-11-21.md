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
- Remotes page exact order: `From the Web to your Cloud.`; compact Google Drive, OneDrive and Dropbox cards (original meaningful buttons); **two separate rows** `The Future is NOW.` and `True Remote is Here.`; original Cloudflare R2 section below. Cloudflare R2 logic must not be rebuilt. No permanent status essays.
- Maintain genuinely distinct **Frames** (crafted Windows-inspired), **Golden Age** (Pinterest-like appropriate masonry) and **Oceania** (nostalgic Tumblr-era) through the Aesthetic API, accessible and lightweight in narrow side panels. These must not delay fixing P0 functional regressions or introduce expensive preview rendering. Follow detailed visual directions in the referenced doc.

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
