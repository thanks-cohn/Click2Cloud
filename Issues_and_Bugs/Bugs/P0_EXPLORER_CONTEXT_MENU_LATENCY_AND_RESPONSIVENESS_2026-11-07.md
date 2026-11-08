# P0 BUG — Click2Cloud Explorer right-click menu is too slow; performance and responsiveness regression

**Reported:** November 7, 2026  
**Product:** Click2Cloud Shelf / built-in File Explorer, and related interactive UI  
**Severity:** P0 performance and core-usability defect · **Status:** Owner-observed, not yet independently timed or repaired  
**Implementation:** Codex should diagnose, repair, instrument, and verify. This issue is NOT proof the bug is already fixed.  
**Related earlier defect:** [Explorer file left/right click freezes](../../bugs/CRITICAL/P0_EXPLORER_FILE_LEFT_CLICK_RIGHT_CLICK_FREEZES_UI_2026-11-06.md) — may overlap; preserve its evidence and do not claim either is resolved without a fresh trace.

## User's report

"When I right-click a file, the Explorer context menu takes forever to pop out. The interface feels rough, laggy and insufficiently responsive. Click2Cloud is supposed to be the fastest, smoothest, most responsive practical cloud-file Explorer possible; performance is foundational, not optional polish."

Actual delays have NOT been measured; do not invent numbers or claim a proven single root cause. Diagnose p50/p95/p99 click-to-first-menu-paint and the source of its latency on installed Chrome, both warm and cold.

## Source evidence / high-priority hypothesis

Reviewed against `main` (source inspected November 7, 2026):

- `extension/app.mjs`: File-row `oncontextmenu` calls `selectRow(...)` then awaits `contextFor(...)`. `contextFor` currently **awaits** `api('inspectExplorerContextMenu', ...)` **before building or showing** `#context`. An asynchronous extension service worker wakeup, message transport, authorization/status check, or unexpectedly slow handler may directly delay the menu's appearance. **This is a testable hypothesis, not a demonstrated root cause.**
- `src/api/explorer-context-menu.mjs:describeExplorerContextMenu` is a synchronous pure descriptor producer; inspect the API's service path, gating and host readiness to identify why first paint might be blocked.
- `extension/app.mjs:selectRow`, `updateSelection`, `ordered`, `renderFiles`/`renderWindow`, `listingOrder` and `#files` DOM behavior can add CPU/layout work. Current `updateSelection` computes ordered rows once, but profile it under big lists; do not assume the November 6 freeze bug is solved in deployed Chrome.
- `extension/app.css` positions `#context` using fixed positioning; `getBoundingClientRect` and focus movement can force layout after DOM changes. Test the impact.
- `src/api/service.mjs` provides the canonical typed `inspectExplorerContextMenu` operation; **keep GUI/API parity**, including action identities and authoritative permission/enablement checks. Do not create a parallel rules engine solely for instant rendering.
- Cloud folder enumeration, remote metadata reads, actual file preview/transfer, OAuth refresh, Worker readiness and native Chrome menu reconciliation should not be unnecessary prerequisites to rendering an ordinary Explorer context menu.

## Required engineering response

1. **Instrument first.** Measure from actual `contextmenu` event to first visible, interactive menu paint; capture phase durations for selection, ordering, service-worker wake, message delivery, `inspectExplorerContextMenu`, descriptor mapping, DOM creation/layout, focus. Track event-loop long tasks and p50/p95/p99 across a defined device/profile.
2. **Make first paint immediate from safe local information.** Prefer a cached, versioned, pure and deterministic menu descriptor or a minimal local menu shell, then asynchronously reconcile enabled states from the existing canonical API. Context navigation/open/preview actions must remain authoritative; all operations recheck current identity, permissions and selected target **at dispatch**. Cached values must never bypass auth/authorization or show fraudulent enabled actions.
3. **Avoid blocking on slow IPC/network.** An API delay, service worker cold start, Cloudflare offline/403/5xx or slow folder scan cannot make the menu invisible or lock the UI. Render predictable disabled/loading states as needed, retain visible feedback, and update when correct guarded results arrive. Discard stale async replies after navigation or file selection changes; guard reentrancy.
4. **Keep interactions responsive everywhere:** left-click selection, right-click menu, double-click open, keyboard Shift+F10 and navigation, drag/scroll/resize, switching Details/List/Grid, and the Manage Destinations dialog. No synchronous full-cloud scan, per-row network call, repeated heavy sorting, or unnecessary total DOM rebuild on trivial actions. Preserve large lists via virtualization/paging without arbitrary small hard limits.
5. **Prioritize speed without compromising security:** one canonical API owner, no new privileged bypass, no false permission, no fake completed action, no unverified save, no stale-click to wrong bucket, no extra menu engine, no brittle timing animation pretending work finished.
6. Keep meaningful GUI actions and state observable through the existing versioned API; source comments must reference their actual API equivalence. Update `11.2026/workings/right-click-workings.json` CURRENT and corresponding tests when source changes; preserve immutable baseline.
7. Benchmark and report before/after. **Proposed performance budget, to validate on stated hardware:** warm local menu paint p95 ≤100 ms; cold-service-worker menu paint ideally ≤200 ms and visibly responsive sooner; selection feedback within a frame when practical; zero >50 ms main-thread long tasks attributable to ordinary single-item context-menu work. These are **targets**, not current measured performance or excuses for sacrificing correctness. Report constraints and actual results if targets cannot be met.

## Mandatory test matrix

- File and folder row, background, tree node; mouse, touchpad and Shift+F10; empty folder; Details, List and future Grid.
- 1, 100, 1,000 and 10,000+ loaded/listed objects (practical test fixture), wide/deep filenames; repeat right-click across rapidly changed selections.
- Warm and cold Chrome MV3 service-worker path, offline/slow API, expired OAuth, disconnected Cloudflare, Worker repair state, stale service message, hidden/revoked action, permission change between menu opening and click.
- Confirm correct action labels, enabled/disabled state, correct target, no unauthorized API dispatch, no navigation/file modification just from opening the context menu.
- Verify actual Windows Chrome in addition to fixture/profiling benchmarks; record FAIL/BLOCKED/NOT TESTED honestly and provide reproducible steps for the owner's installed extension.

## Acceptance / release blocker

A user can right-click any file or folder and get prompt, stable visual feedback without noticeable freeze, with correctly permission-gated context actions. The UI remains responsive while remote/cloud operations occur asynchronously. **Do not call this fixed based only on a unit test, an API response or an animation.**

**Guiding principle:** **PERFORMANCE IS THE PRODUCT.** Click2Cloud's cloud power must not make ordinary Explorer interactions slower or less usable than a conventional local file explorer. **NO BLOAT · NO UNNECESSARY WAITING · NO GUI/API DIVERGENCE.**
