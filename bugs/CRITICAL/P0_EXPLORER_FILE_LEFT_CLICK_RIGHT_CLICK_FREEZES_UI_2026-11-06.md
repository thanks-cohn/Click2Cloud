# P0 — Click2Cloud Explorer freezes when clicking OR right-clicking a file

**Reported:** 2026-11-06
**Repository:** `thanks-cohn/Click2Cloud`
**Source baseline when recorded:** `main` at `8bf067427d2547fea7283b462b9f2879dc984bdc` (recheck before implementing)
**Status:** OPEN — user-observed, source paths identified, not yet reproduced/instrumented by Codex
**Severity:** P0 / CRITICAL — ordinary basic file interaction is unusable
**Scope:** Click2Cloud's own built-in File Explorer, not necessarily Chrome's native page context menu
**User report (verbatim intent):** “clicking and right clicking an file in clcik2cloud make sth eholw thign freeze”

## Observed problem

The user reports that interacting with a file in the Click2Cloud File Explorer using either **left click** or **right click** makes the entire interface appear to freeze. This is not merely an upload failure: the basic file Explorer interaction itself becomes unusable. The exact file type, row count, OS/UI runtime details, duration of freeze, and console errors were not supplied; do not invent them or claim a measured deadlock.

## Reproduction to perform

1. Build/install the current Click2Cloud extension, preserving existing user state and connections. Open Click2Cloud → File Explorer, select an authorized bucket/folder with one or more **files**.
2. Left-click an ordinary file row once; observe whether the selection updates immediately, all navigation/buttons remain responsive, and no unexpected synchronous work blocks the UI.
3. Return to a clean Explorer view, then **right-click** a file row; observe whether the Click2Cloud-owned context menu appears promptly, remains interactive, and the rest of the app remains responsive.
4. Independently test double-click to preview/open, keyboard selection, Shift/Ctrl selection, keyboard context menu (Shift+F10), folders versus files, and file counts from a few rows to large paginated listings.
5. Repeat after extension reload with normal connection state. Capture a sanitized browser performance trace, JS exceptions, event-loop long tasks, console messages, and reproducible steps. Do not log OAuth tokens, signed URLs or browsing provenance.

**Expected:** Left-click selects a file immediately. Right-click opens the file's contextual actions immediately. A preview/open is only initiated by its intended action. The Explorer never freezes, even with a large legitimate listing; expensive file/preview/network work must be asynchronous and cancellable.

**Actual:** User reports the whole Click2Cloud interface freezing on left-click and right-click on a file. Exact freeze mechanism and trigger size remain unverified.

## Source investigation pointers (NOT proven root causes)

In `extension/app.mjs` on the stated baseline:
- `renderFiles()` renders and installs click/context/keyboard row handlers.
- Left click changes `selected` and calls `updateSelection()`.
- Right click also changes `selected`, calls `updateSelection()`, then calls `contextFor(...)`.
- `updateSelection()` runs `ordered()` **inside the loop for every table row**. `ordered()` clones and sorts the entire `entries` array each time. This may cause **repeated whole-list sorting / main-thread CPU exhaustion** for medium or large file counts. It is a particularly high-priority shared-path suspect because BOTH reported mouse interactions call `updateSelection()`. Validate with a profiler; do not assert it is the only cause.
- `renderFiles()` also constructs one HTML table row per loaded entry and attaches individual event listeners; assess render volume, selection cost, DOM work, and whether pagination/bulk listing aggravates the freeze.
- `contextFor()` builds a contextual menu, calls `getBoundingClientRect()` for placement, then focuses an action. Check for forced synchronous layout and event reentrancy.
- `openEntry()` invokes `readFile` and allocates a Blob/preview; verify double-click / context menu Open paths separately so preview stalls are not confused with plain single-click stalls.
- `loadListing()` uses `refreshExplorer` / `listFolders`, loading epochs and render state; verify selection does not unnecessarily trigger network listings or repeated refresh.
- Examine `src/explorer`, versioned `src/api/service.mjs` entry/selection APIs, and any injected event listeners or linked mirror UI for secondary blocking work.

## Implementation requirements for the repair run

1. Diagnose actual main-thread blocking, exception/reentrancy, network stall or rendering bottleneck first; attach a minimal reproducible automated/browser performance case.
2. Fix the shared left/right selection path to scale with list size (e.g., compute ordered rows once per interaction, maintain stable key/index maps, update only changed row attributes, or virtualize rendering if necessary). Do **not** mask the bug by imposing arbitrary maximum file counts, artificial listing depth, file-size limits, or disabling context actions.
3. Make file context menus respond predictably without expensive synchronous list-wide work. Verify right-click does not trigger unintended upload/navigation.
4. Ensure preview/open operations remain independent, asynchronous, cancellable, and do not freeze Explorer on large files.
5. Test file and folder interactions, single/right/double click, keyboard access, Shift/Ctrl selection, small and large listings, page transitions, reloads and disconnected/slow provider states.
6. Use the existing canonical V3+1/File Explorer/API architecture. Every meaningful Explorer action retains a programmatic API equivalent. No new parallel UI engine or demo-only constraint.
7. Record **PASS / FAIL / BLOCKED / NOT TESTED** evidence, with source locations, before/after performance data and actual installed Chrome acceptance where available. Unit tests or a synthetic DOM alone are not live acceptance.

## Acceptance criteria

- File left-click is responsive, selections and focus stay correct.
- File right-click opens the intended Click2Cloud Explorer context menu and its actions respond.
- Neither interaction freezes the app or makes its other controls unresponsive.
- Large folder listings remain workable with **no arbitrary user-facing listing or file cap**.
- Keyboard and multi-selection semantics remain intact; folder navigation and file preview continue working.
- Root cause is supported by trace/test evidence, not guessed solely from this report.
- This bug is included in the ongoing P0 right-click repair acceptance scope; a passing external native menu test does **not** close this internal Explorer regression.

## Preservation / safety

Document-only bug filing. Do not reset the user's configuration, wipe cache/storage, remove destinations or make provider/cloud mutations as a debugging shortcut. Do not edit REDOWN.
