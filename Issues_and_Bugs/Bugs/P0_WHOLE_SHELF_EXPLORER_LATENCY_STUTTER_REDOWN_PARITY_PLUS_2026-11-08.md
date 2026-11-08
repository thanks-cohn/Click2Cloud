# P0 — Entire Shelf File Explorer is laggy/stuttery: REDOWN-informed, faster-than-REDOWN repair

**Reported:** 2026-11-08 by owner · **Severity:** P0 / release blocker · **State:** OPEN; real owner Windows latency is not yet profiled or repaired.  
**Product:** Click2Cloud v0.3.10 (`main` inspected at `110d06ca04fbf254786e2d8f2fbfed0b39ee4493`).  
**Read before implementation:** [Codex implementation assignment](../../docs/requests/CODEX_P0_ZERO_STUTTER_EXPLORER_PERFORMANCE_REDOWN_REFERENCE_2026-11-08.md), [original context-menu P0](P0_EXPLORER_CONTEXT_MENU_LATENCY_AND_RESPONSIVENESS_2026-11-07.md), [permanent destinations P0](../../bugs/CRITICAL/P0_DESTINATION_PERSISTENCE_REAUTH_EXPLORER_STARTUP_2026-11-07.md).

## Owner-observed failure / product requirement

The **whole Click2Cloud Shelf File Explorer feels abnormally slow**: noticeable lag, stutters, delayed reactions, excessive latency on ordinary interactions. Earlier the owner singled out **right-click file context menus** taking an unacceptable time to appear. This is not merely a context-menu cosmetics complaint. It includes the entire browsing/interaction loop: opening File Explorer, choosing cloud/bucket/folders, expanding the left tree, selecting files, scrolling, right-clicking, switching views, previewing, returning Back/Forward, and operating the manager.

**Required direction:** Take proven good engineering patterns from the current REDOWN Explorer when useful, **improve on them** rather than wholesale transplanting old UI/code. Click2Cloud should be exceptionally responsive, fluid, low-memory and low-overhead, even with many files and slow Cloudflare responses. UI selection and visible feedback should not be held hostage by network reads or MV3 worker wake.

**Do not claim ZERO milliseconds or instant Cloudflare network responses.** Fast local interactions and instant honest loading feedback are mandatory; remote listing/completion still require real provider authority and receipts.

## Exact source comparison and testable hypotheses

Source pinned: Click2Cloud `110d06c`; REDOWN `e58bf99f`, inspected 2026-11-08. These are SOURCE findings; the user's installed Chrome has not been traced.

### Click2Cloud — likely hot paths

- `extension/app.mjs:contextFor` **awaits** `api('inspectExplorerContextMenu')` before making `#context` visible. A cold MV3 wake/IPC delay can directly delay first menu paint. Its menu labels/enablement come from canonical `src/api/explorer-context-menu.mjs`. **Do not introduce a competing menu policy.** Use an immediate safe shell and then reconcile typed API descriptors, or an identical versioned locally imported pure descriptor followed by authoritative dispatch-time revalidation.
- `extension/app.mjs:show`, `renderExplorer`, `navigate`, `loadListing`: `renderExplorer` replaces all `#main` HTML (including toolbar and `#files`), reattaches handlers, calls `renderFiles`; `navigate` also invokes a trusted `navigateExplorer` API before `loadListing`. Audit extra DOM resets, lost scroll/selection/paint, serial waits and duplicate tree/list requests. Reuse stable DOM and patch only affected regions where measurable. Preserve API navigation semantics and durable last location.
- `renderFiles` reconstructs a table, while `renderWindow` swaps tbody HTML for the current window; `updateSelection` edits only visible rows, and `src/explorer/listing-view.mjs` already caches natural sorting and virtualizes. **Do not discard the working virtualizer**; investigate repeated full rebuilds, synchronous layout reads, focus/layout thrash, wheel/scroll handler work, and large string creation. Make selection/scroll near-frame-limited and maintain keyboard accessibility.
- `loadTree` and nested `listingReader.page` call trusted APIs; audit request waterfalls, redundant enumeration, remote denial/backoff and stale callback reentrancy. A remote request may be slow; the UI cannot freeze. Keep exact API-backed, authorized account/bucket/prefix identity and genuine failure surfacing.
- `openEntry` asks `readFile` for preview bytes; keep previews asynchronous, cancellable, bounded and separate from selection/navigation. Never download whole arbitrary objects or expose source URLs to providers. Thumbnails must be lazy, bounded, low concurrency and never block interactions.
- `suggestion`, `connections`, `focusShelf`, `enterExplorer`, `getInventory` and other initialization/readiness paths may race or serialize with the UI. Measure end-to-end, not infer source cost.
- `src/api/service.mjs`, background API host/queues and `src/explorer/read-coalescer.mjs` should be examined for contention and redundant permission/readiness checks. Do not weaken auth or bypass the canonical API.

### REDOWN — patterns to study, selectively adapt/improve

- `extension/shelf-explorer.mjs:scheduleRows`: coalesces redraws with `requestAnimationFrame`; passive scroll listener; view activation/visibility gating.
- `extension/shelf-explorer.mjs:renderRows` and `extension/shelf-explorer-model.mjs:windowRange/offsetRange`: viewport-only rendering, cached sort/layout/prefix sums, stable logical canvas, geometry reused across resize, and restoration of scroll anchor. Cache invalidation and adaptive grids are useful **as patterns**, not copied wholesale.
- `extension/shelf-explorer.mjs:showMenu`: builds and reveals a local context menu synchronously using already-available action states. Click2Cloud should achieve equivalent immediate feedback **without** relying on stale privilege or bypassing its canonical typed descriptors.
- `extension/shelf-explorer-model.mjs:children`: TTL page cache, coalesced inflight page reads, max bounded concurrency, aborted stale navigation and epoch checks.
- REDOWN's `docs/runtime/verification/storage-popout-performance/summary.json`: source-backed case study measuring DOM/layers/frame pacing under 12 vs 120 buckets; use the *method* (trace layers, layout, frame times, repeat opens), not those numerical results as Click2Cloud live benchmarks.
- **Reuse permission/license notices and follow original code provenance.** Do not paste copied third-party/Chute logic without respecting license obligations.

### Existing evidence that is NOT a Windows pass

- Click2Cloud `docs/evidence/nov07-master/explorer-current.json` is a **Chromium app with fixture API**. It records synchronous click/context handler durations in low milliseconds for 100/1k/10k rows but **two initial long tasks (133ms, 82ms)** at 100-row case; it does not measure click-to-visible-menu paint in a real installed extension against OAuth/Cloudflare. Do not cite low handler timings as proof the user experiences no lag.
- `scripts/measure-explorer.mjs` explicitly uses local fake APIs and a `/opt/codex/...` browser dependency; augment with portable Windows installed-extension measurement, not silently relabel fixture evidence as live.
- Previously reported P0 context-menu issue remains open. The source path still awaits IPC before display at inspected revision.

## Performance contract — targets to validate on real stated hardware

These are **aspirational release targets**, not measurements or guarantees for arbitrary hardware/network:
- Single-row selection, keyboard focus, menu close, basic navigation controls: immediate feedback at next paint, **p95 event-to-first-visual-change ≤50ms**, warm reasonably powered desktop, absent deliberate CPU overload.
- Right-click menu: **p95 ≤50ms warm**, visibly immediate loading/disabled shell **≤100ms on cold MV3 worker**; authorization/data-dependent items may enable later, but pointer isn't blocked by that check. Record p50/p95/p99 and longest outliers.
- Wheel/scroll and splitter resize while 1,000 or 10,000 items are logically present: target smooth ~60fps at 60Hz display, **p95 frame interval ≤20ms**, no repeating Explorer-caused >50ms long tasks; preserve stable content/scroll anchors.
- First Explorer-tab click: visible responsive shell and selected account/cloud context immediately, authorized data appears incrementally when available. Report time to first interaction, time to tree populated, time to first actual file row and API round-trip separately; don't promise cloud contents before response.
- Warm cached folder navigation: maintain selection/scroll state and avoid flicker/duplicate whole-panel rebuilds, aiming p95 first feedback ≤50ms; cold folder completion is limited by actual Cloudflare latency, reported separately.
- After a high-latency/failing 403/500/offline request, application remains interactive and retains its last verified listing/selection with honest stale/unavailable labels. No frozen controls or misleading fake saved state.
- Memory/DOM bounded proportional to visible viewport and a small overscan, not arbitrary total file count, across Details/List/Grid once Grid is implemented.

## P0 implementation order

1. **Instrument first and reproduce owner symptoms.** Add low-overhead opt-in trace for event→first paint and step timings: `contextmenu`→selection→API send→MV3 wake→descriptor→DOM→paint; file navigation→tree→authorized list→first rows; scroll frame deltas/Long Tasks; select/preview/resize; count requests and DOM nodes/listeners/layers. Redact tokens, URLs, private bucket paths and file bodies. Real Windows Chrome is the acceptance target.
2. **Immediate context menu.** Render synchronously without awaiting IPC; show safe disabled placeholders as necessary. All privileged actions derive from canonical descriptors/validated local snapshot and **revalidate on actual API invocation**; stale async updates invalidated by selection/navigation epoch. No invented success, no second action engine. Preserve Shift+F10 and focus return.
3. **Stable Explorer shell and bounded painting.** Avoid resetting the entire DOM for routine row selection, menu, refresh, tab click, sort or folder changes; reuse existing virtualizer; schedule updates on animation frames; guard stale renders and preserve scroll/selection. Optimize only proven hotspots.
4. **Nonblocking cloud reads.** Keep one Universal File API, account-scoped identity and durable intended source. Avoid waiting on cloud for controls that can render from local state. Coalesce duplicate reads, introduce bounded concurrency and cancellation for stale selections, pages, previews and tree expansion. Preserve error diagnosis/cursors and non-faked empty state.
5. **Responsive tree / Grid/Details/List.** Honor the separate UX issue for a single footer Manage Destinations button, editable full-path field and Grid; ensure each view is lightweight rather than piling on thumbnails/effects. Grid must not fetch all image bytes.
6. **Regression and repeatable measurement.** Before/after exact environment and commit, cold/warm, slow/offline, 0/1/100/1k/10k entries, 1/10/100 buckets, large/long names, resize and scroll, pointer/keyboard, after OAuth reconnection. Compare three or more runs and include p50/p95/p99, first paint and long-task traces. Regressions are a release blocker. Distinguish actual Windows installed extension from local Chromium fixtures; label BLOCKED if unable to install.
7. **Architecture and safety.** Preserve permanent Simple/Narrow/Depth/Quick/Default user state, one-time Cloudflare setup approval, next-login zero-config `redown` behavior, native Chrome menu ACK, TRUE REMOTE, independently verified R2 receipts, History GO TO, and full GUI↔API parity. Do not create competing owners, fake loading data, auto-run billable Worker provisioning, or modify REDOWN.

## Definition of done

The real owner Windows build is responsive during ordinary browsing and after cold start, not just fast in fixtures. The requested before/after trace shows where latency was removed. Negative network/auth tests prove the UI stays fluid *while accurately indicating unavailable cloud data*. No cloud result is fabricated, no saved destination disappears, and no private source URLs are forwarded to cloud providers. If live Windows Chrome can't be measured, **mark acceptance BLOCKED, not PASS**.

**Owner directive: ZERO PERCEPTIBLE LAG is the design target. SPEED FIRST, without correctness, privacy, accessibility, or authorization shortcuts.**

## Implementation candidate — November 8, 2026

Runtime candidate `97c2806` (0.3.11) implements the production-source repair on `dev/p0-zero-stutter`. See [source findings](../../docs/evidence/zero-stutter/SOURCE.md), [handoff and Windows acceptance](../../docs/evidence/zero-stutter/HANDOFF.md), and [measured fixture comparison](../../docs/evidence/zero-stutter/PERFORMANCE.md). Original observations above are historical baseline evidence. This issue is **not closed as owner-verified**: genuine installed Chrome is blocked by administrator policy, and live new-destination save/readback remains blocked by unavailable existing test-Worker signing authority. Passing fixtures are separately classified.
