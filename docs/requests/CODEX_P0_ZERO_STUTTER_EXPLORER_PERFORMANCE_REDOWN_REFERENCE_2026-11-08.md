# CODEX EXECUTION REQUEST — P0: Make Click2Cloud Shelf Explorer radically faster than the current build

**Owner directive 2026-11-08:** "The file explorer in the Shelf is beyond slow. It lags and stutters; latency is obscene. Learn from REDOWN where possible, but improve on the design. Minimum latency, no lag, no slow."

**This is an implementation task, not a documentation-only task.** Fix the source, test the actual behavior, record performance before/after and ship a reviewable repair. Do not falsely claim real Windows or live Cloudflare validation when unavailable.

## Mandatory reading / source references

1. [P0 root defect, source comparison, performance targets](../../Issues_and_Bugs/Bugs/P0_WHOLE_SHELF_EXPLORER_LATENCY_STUTTER_REDOWN_PARITY_PLUS_2026-11-08.md).
2. [Original right-click context-menu P0](../../Issues_and_Bugs/Bugs/P0_EXPLORER_CONTEXT_MENU_LATENCY_AND_RESPONSIVENESS_2026-11-07.md).
3. [Explorer UI requirements: Grid, address field, single manager button](../../Issues_and_Bugs/Issues/P1_EXPLORER_SINGLE_MANAGER_ADDRESS_FIELD_AND_GRID_VIEW_2026-11-07.md).
4. [P0 destination permanence / saved setup approval](P0_FIX_PERMANENT_DESTINATIONS_SETUP_AND_EXPLORER_2026-11-07.md).
5. **Read-only** REDOWN source at `thanks-cohn/REDOWN`, inspect `extension/shelf-explorer.mjs`, `extension/shelf-explorer-model.mjs`, `extension/beta/file-api.mjs`, `docs/runtime/verification/storage-popout-performance/summary.json`, and `chute-reference/extension/explorer-view.js` when relevant. Learn from patterns, **do not migrate old REDOWN architecture wholesale** and do not edit REDOWN.
6. Click2Cloud current `extension/app.mjs`, `src/explorer/listing-view.mjs`, `src/explorer/read-coalescer.mjs`, `src/api/explorer-context-menu.mjs`, `src/api/service.mjs`, `extension/background.mjs`, `scripts/measure-explorer.mjs`, and `docs/evidence/nov07-master/explorer-current.json`.

## Execution instructions

**Phase 1: Baseline and causal proof.**
- Inspect the current latest main/ongoing PRs, preserve uncommitted work and avoid collisions. Record exact revision, build, extension ID and test type.
- Reproduce file menu latency, blank/slow first Explorer, slow navigation, tree expansion, scrolling/resize, multi-selection, preview, view switching and reconnect. Capture p50/p95/p99 interaction-to-*paint*, not merely sync handler runtime, plus Long Tasks, frame pacing, layout/style work, memory, rendered row count, network/IPC count, request waterfalls, MV3 cold start and cancellation behavior.
- Establish whether context menu blocks on `inspectExplorerContextMenu`, repeated `#main.innerHTML` reconstruction, double tree/list requests, or expensive render/paint. All are hypotheses until timed. Fixture evidence must be labeled differently from installed Chrome/cloud.
- Use REDOWN's stable viewport rendering, frame-scheduled update, read coalescing, bounded concurrency, stale-navigation cancellation and immediate context-menu presentation as **reference design patterns**. Evaluate improvement with measurements rather than uncritically copying it. Respect third-party/Chute provenance and licenses.

**Phase 2: Repair the real bottlenecks, prioritized.**
- **Priority A: synchronous first-paint context menu.** Right-click should immediately show a local, safe menu shell without `await chrome.runtime.sendMessage`. Obtain/reconcile the canonical API descriptor asynchronously; privileged controls start disabled/verify state; dispatch-time permission/identity revalidation remains mandatory. Never use a duplicate rules engine. Reject stale descriptor responses. Correct pointer/keyboard/Shift+F10 behavior.
- **Priority B: responsive Explorer structure.** Keep persistent toolbar, tree and file viewport nodes when possible; patch affected portions instead of rebuilding entire `#main` repeatedly. Preserve selected keys, focus, scroll anchor, visual stability, Back/Forward, one-click opening, and present offline/skeleton state honestly while loading. Keep Remotes as startup tab.
- **Priority C: efficient virtualization and minimal layout.** Preserve existing `createListingOrder`/windowing and working tests. Limit row/list DOM updates to visible range and actual changed state. Batch paint on RAF or equivalent only when it improves responsiveness; use passive wheel listeners and avoid costly layout reads/writes within the same event. Avoid aggressive virtual rows that break accessibility.
- **Priority D: independent, bounded, cancellable reads.** Cached identity-specific authorized folder pages; deduplicate inflight calls; bound concurrency; cancel/epoch-discard obsolete requests. Tree/list/preview must not queue behind unrelated config work or full-cloud scans. Keep retry semantics for 401/403/429 and retain last verified visible data only with accurate stale indicator. Never claim an empty folder because a read failed.
- **Priority E: list/grid/preview polish only after input latency fixed.** Add the owner's Grid/address/single-manager requirements where the work naturally overlaps; do not let thumbnails, animations, sorting or lazy preview impact click/scroll. Support missing/long file names and many folders without arbitrary hard caps.
- **Priority F: avoid real cloud writes during benchmarking**, except explicit safely scoped owner-authorized smoke tests. Do not reset Chrome profile, clear IndexedDB, uninstall extension or overwrite saved destinations. Do not alter OAuth grants/extension ID or deploy Workers for a UI performance fix.

**Phase 3: Integrity and acceptance.**
- Run existing focused suite, API parity tests, and Chromium fixture suite; fix only legitimate regressions. Audit all UI meaningful mechanisms against their trusted API counterparts. Update the CURRENT workings documentation/source fingerprint as needed, **not immutable baseline**.
- Add reproducible performance scripts portable to Windows; `scripts/measure-explorer.mjs` currently hardcodes a Codex/Linux Playwright module path and fixture environment. No owner Windows measurement claim without installed Windows Chrome and real interaction.
- Track cold and warm timings, 0/1/100/1,000/10,000 item folders, 1/10/100 buckets, same exact account, nested paths, slow 2s+ API, disconnected/reconnected provider, tab switching, quick scroll+right-click, repeated selection with ongoing preview, and 10-minute navigation stress.
- Targets on normal powered Windows desktop: warm context menu initial paint p95 ≤50 ms; first disabled shell during cold worker wake ≤100 ms; selection/keyboard interaction first paint p95 ≤50 ms; 60Hz scroll p95 frame interval ≤20 ms with no repeated Explorer-caused >50ms Long Tasks. Cloud-authorized contents may take longer; first responsive feedback must not. Record actual failures honestly; do not fake target attainment.
- Confirm no missing destinations or Default, no duplicate/new provider setup approval, no false save success, no stale action privilege, no extra backend mutations, and complete right-click save → File API list → Explorer → History GO TO.
- Deliver exact changed paths, root cause evidence, before/after traces, test output, remaining blockers and minimally reproducible Windows verification commands. No success rhetoric until validated.

## Pass condition

Click2Cloud feels **immediate** for local UI actions while authenticated cloud data loads asynchronously; it retains full Universal File API/TRUE REMOTE security and correctness, without REDOWN-era bloat, new APIs that duplicate old logic, or slow animation tricks. Owner installed Chrome validation remains independently required.

**NO BLOAT · NO INPUT-BLOCKING NETWORK WAITS · NO STUTTER · ONE CANONICAL API · ZERO DATA LOSS.**
