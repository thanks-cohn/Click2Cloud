# CODEX P0 — Perfect native menu-rule alignment and REDOWN-class File Explorer responsiveness

**Owner-approved working-session contract · 2026-11-06**  
**Repository:** `thanks-cohn/Click2Cloud`  
**Source:** latest `main`; create a **new development branch** for the implementation. Preserve historical `feat/glaciaring-agent-debug`, REDOWN and production infrastructure.  
**Work rhythm:** approximately **30 minutes of continuous engineering**, advancing through multiple related milestones, committing cohesive fixes as progress allows, then a detailed technical handoff. The milestone list is an acceptance checklist, **not a per-run work limit**.

## Mission

**Make Click2Cloud's real installed Chrome native right-click saving follow EVERY November 6 rule exactly, and make Click2Cloud File Explorer navigation, folder traversal, selection, file context menu and rendering at least as responsive and dependable as REDOWN.** Repair startup, native registration, provider routing and related P0 integration bugs. Implement functionality rather than writing another proposal. Work on the largest user-facing defects first and continue to the next related defect throughout the working session.

## Controlling requirements — read these in order

1. `AGENTS.md` — November 6 precedence and approved Cloudflare lifecycle.
2. `foundations/cloudflare/README.md` — first-use and returning-user diagrams, especially **2A** and **2B**.
3. `foundations/other_clouds/README.md` — other three flat providers and compact login UI.
4. `docs/CODEX_NOV06_RULE_CONFLICT_AUDIT_AND_HANDOFF.md` — resolved conflicts and branch warning.
5. `docs/CODEX_SMALL_MILESTONES_TO_SURPASS_REDOWN_2026-11-06.md` — continuing checkpoints M00–M08, then relevant P1.
6. `bugs/CRITICAL/P0_EXPLORER_FILE_LEFT_CLICK_RIGHT_CLICK_FREEZES_UI_2026-11-06.md`.
7. Inspect **current actual source code**. Read older `scaffold/` and Nov 5 specifications only when consistent with the controlling requirements.

REDOWN behavior reference (READ-ONLY): `thanks-cohn/REDOWN` modules `extension/right-click-v3.js`, `extension/shelf-explorer.mjs`, `extension/shelf-explorer-model.mjs`, `extension/history-navigation.js`, `extension/entry-bootstrap.js`, `extension/boot.js`, and provider adapter modules as needed. Reproduce good behavior in the EXISTING Click2Cloud V3+1/MenuSpec/Universal File API system; **do not transplant REDOWN's competing historical engines or edit REDOWN**.

## P0-A — Native Chrome menu MUST match this exact decision table

Chrome's own extension grouping, if present, is acceptable; the extension must not insert an extra REDOWN/provider grouping of its own.

```text
DEFAULT — four provider entries in this exact order:
Google Drive                 [single provider item]
Dropbox                      [single provider item]
OneDrive                     [single provider item]
Cloudflare                   [single provider item; DIRECT save to redown when ready]

AFTER USER EXPLICITLY CHOOSES AND ASSIGNS PHOTOS AS AN EXTRA CLOUDFLARE TARGET:
Google Drive
Dropbox
OneDrive
Cloudflare                   [ONE parent, never a duplicate sibling]
  redown                     [exact initial bucket root, while assigned]
  Photos                     [the chosen second bucket/folder target]

AFTER USER REMOVES/DELETES redown AND Photos IS THE SOLE ASSIGNED TARGET:
Google Drive
Dropbox
OneDrive
Cloudflare                   [flat DIRECT save to Photos; no recreated redown]

NO ACTIVE ASSIGNED TARGETS AFTER PREVIOUS INITIAL SETUP:
Google Drive
Dropbox
OneDrive
Cloudflare                   [flat clickable action → Manage Destinations if connected]

SETTINGS HIDES CLOUDFLARE:
Google Drive
Dropbox
OneDrive
(no Cloudflare entry or descendants; credentials and saved targets retained)
```

**Authoritative transitions** (test all without inventing extra menu elements):

| State | Menu shape / action |
| --- | --- |
| New install, no account/buckets/destinations | Four visible, clickable **flat** provider entries when Settings visibility ON. Cloudflare opens compact provider login/approved first-time setup; other providers have their own compact login/availability state. |
| Cloudflare signed-in but initial setup not approved/completed | One flat Cloudflare item; require only the actual one-time approved setup. Login itself must not create buckets. |
| Approved first-use: `redown` exists | Reuse exact lowercase `redown` and verify Worker/R2 write+readback; initial save destination is bucket `redown` root key prefix `''`, **not** `redown/redown/`. |
| Approved first-use: `redown` absent, even with zero other buckets | Create lowercase `redown` exactly once during separately approved setup, verify readiness and select initial root; no manual destination editor needed. |
| One active, chosen Cloudflare target | Exactly one native clickable **Cloudflare** leaf; direct save to that target when ready. **No requirement to select Flat mode manually.** |
| Another bucket is created but NOT chosen/assigned to the Chrome menu | Unchanged. Existing bucket count alone has no bearing on menu nesting. |
| User explicitly assigns second distinct active Cloudflare target | Replace Cloudflare leaf with **one Cloudflare submenu** containing BOTH active targets, including `redown` if it is still assigned. No separate `Cloudflare R2` row. |
| Two or more active targets | One Cloudflare submenu with the exact distinct active children; do not duplicate the same target projected by different Simple/Narrow/Depth modes. |
| User removes an extra assignment, leaving one | Cloudflare automatically becomes a direct flat leaf to sole survivor; native ACK and persisted config agree. |
| User intentionally deletes/unassigns `redown`, leaving one other assigned target | No bucket recreation. Cloudflare becomes flat to survivor, with default reconciled and persistently saved. |
| User intentionally removes every destination after prior initialization | Cloudflare stays flat and clickable; connected user opens existing **Manage Destinations**, not setup/activation and not an invented target. Disconnected user sees compact sign-in first and then Manage Destinations. |
| Current target temporarily unreachable / permission revoked / Worker failed | Clearly report exact unavailable/repair state. Never equate network failure with confirmed deletion; never silently switch target or recreate `redown`. |
| Provider checkbox OFF in Settings | Entire corresponding native provider row/descendants disappears, preserving OAuth, files, assigned targets, other providers, mode state. Restoring ON reproduces its correct menu state. |
| Custom explicit default and optional Simple/Narrow/Depth/Flat modes | Keep user's intended target and active display choices; hidden/disabled destinations do not inflate the visible count; mode editing must not mutate unrelated mode data. |
| Browser reload, extension update or service-worker restart | Reconcile identical native tree/IDs, no duplicate rows, valid ACK and click target, no account/config loss. |

Native **provider label is `Cloudflare`** only. `Cloudflare R2` may remain in service/setup descriptions but never as a second native item. Provider order is Google Drive → Dropbox → OneDrive → Cloudflare. Quick shortcuts, if expressly configured, must not duplicate the canonical provider row.

**A ready native click actually saves**, not merely opens the full dashboard, placeholder app, provider setup, browser tab, or History. Cloudflare TRUE REMOTE: Worker fetches an eligible source, writes exact authorized bucket/prefix, independently verifies remote bytes/readback, then records a verified History/GO TO result. No success animation/counter on uncertainty, timeout or failure. Account-scoped permission and minimal metadata remain intact. No arbitrary app-imposed source/size/duration limitations; honor real browser/provider constraints and avoid unsafe private-network fetching.

Other provider items remain flat. Do not claim Drive/Dropbox/OneDrive working uploads until real adapters and real provider readback exist. A disconnected provider gets the small `One Click Away!` provider-specific card, not a fictitious success.

## P0-B — Repair actual menu engine and dispatch, not documentation

Inspect and correct these CURRENT Click2Cloud source paths first:

- `src/core/menu-spec.mjs`: composite compiler currently emits provider action rows and other Cloudflare branches/default saves, including label `Cloudflare R2` and `REDOWN → Cloudflare`; converge to **one canonical Cloudflare owner/entry** per state. Preserve stable IDs, correct parent references, action identity, generation, exact account/target mapping and Settings visibility.
- `src/chrome/registrar.mjs` and `extension/background.mjs`: register the actual native menu, repair stale/doubled registration and click dispatch, use ACK for applied generation, handle Chrome MV3 suspension/restart, avoid duplicate listeners and phantom success.
- `src/cloudflare/onboarding.mjs`: first-time `redown` setup only with consent, permanently respect initialized/removed state; zero assigned after onboarding must route directly to existing Manage Destinations for connected users. No first-time rewrite after deletion.
- `src/api/service.mjs`, `src/api/config.mjs`, `extension/app.mjs`: Settings per-cloud visibility and destination assignment/removal must use shared versioned configuration mutations, preserve persistence and trigger correct native reconciliation.
- `src/core/action-resolver.mjs` and `src/api/menu-view.mjs`: validate actual target and native generation, distinguish provider login action from save action, show one canonical menu structure inside Explorer where applicable.
- `extension/manifest.json`, `extension/background.mjs`, `extension/app.html`, build script: toolbar click and startup must actually open a responsive application without a running developer server.

Where several paths own the same action, **remove the duplicate ownership** through a minimal refactor of the current engine. Avoid a parallel registrar, new save engine, or a second configuration store. Preserve existing user settings and migration.

## P0-C — File Explorer must match/exceed REDOWN's traversal performance

Current defect evidence: `extension/app.mjs` `updateSelection()` calls `ordered()` once for **each row**; `ordered()` clones and sorts all entries, which can approach `O(n² log n)` per interaction. File row/contextmenu handlers and full-row rendering can also amplify the cost. Compare REDOWN's `extension/shelf-explorer.mjs` `renderRows()`/cached `sortedEntries`/visible window and `extension/shelf-explorer-model.mjs` request coalescing and cancellation.

Fix in real code, with performance measurements:

1. Cache sorted entries **once per list/sort/filter revision**, create a stable key→row/index lookup, and change only affected selection attributes. Selection/right-click must not trigger repeated full-list sorting or full DOM reconstruction.
2. Use visible-row/viewport rendering or equivalent to keep large directories responsive, with correct variable-height/layout handling if needed. No artificial file-count cap. Avoid long main-thread tasks, runaway rerenders, expensive work on pointer events, and detached listener leaks.
3. Folder tree navigation: accounts → buckets → folders → nested folders; expand/collapse with clear keyboard behavior; accurate breadcrumb, Up, Back, Forward, Refresh, multi-folder navigation, state preservation and exact target identity.
4. API/data flow: paginate large listings, deduplicate in-flight requests, cancel/ignore stale responses when switching folders, bound caches sensibly, invalidate on confirmed mutation and recover gracefully after MV3 restarts. Do not tie selection responsiveness to network fetches or thumbnail loading.
5. File left-click and right-click: immediate correct selection with Ctrl/Shift/multiple selection; context menu opens near pointer with the correct clicked item and does not navigate/save unexpectedly; keyboard focus/Arrow/Home/End/Enter/Escape behavior remains usable.
6. Real context actions as available via the canonical File API: Open, Preview, Download, Copy/Move/Paste, Rename, Delete, New Folder, Save to configured provider. Support capability distinctions truthfully and require confirmation for destructive actions. No fake no-op actions that claim success.
7. Previews/thumbnails: lazy, cancelable and asynchronous; side/window preview and double-click navigation may enhance the experience but never freeze the UI. Close/release resources on navigation and handle inaccessible/large files gracefully.
8. Empty folders, inaccessible folders, hundreds/thousands of mixed files, repeated rapid clicks, burst navigation, provider errors, and reloads must not freeze/crash the page. Keep UI conventions close to familiar Windows Explorer and reduce unnecessary jargon.
9. Check nearby REDOWN-derived defects that materially block P0 usability (Explorer GO TO, exact folder routing, stale history, service-worker recovery, provider reconnect loop). Port proven **behavior**, not REDOWN's older coupling/bugs.

**Performance acceptance (not assumed measurements):** use the same hardware/browser and comparable fixtures to compare REDOWN and Click2Cloud. Record before/after for selection, context-menu-open latency, directory traversal, 1k+ and larger practical listings, memory/DOM row count, long tasks, and API request counts. Aim for no noticeable interaction lag and at least REDOWN-equivalent results. Treat repeated seconds-long hangs, main-thread stalls and page crashes as failures regardless of fixture results. If REDOWN baseline cannot be exercised, state that explicitly and still provide measured Click2Cloud evidence.

## P0-D — Verification matrix, evidence, and regression coverage

- Run existing focused node tests and add targeted deterministic cases for 0/1/2+ active destinations, hidden provider, unused discovered bucket, custom default, explicit redown deletion with 1 survivor or 0 survivors, initializing first-use exactly once, restart/reconciliation, stale generation, multiple Cloudflare accounts, and mode collision prevention.
- Verify installed Chrome **native contextMenus** appearance and click dispatch with image/link/source contexts, not only a generated model or in-app HTML menu.
- Verify actual Cloudflare OAuth readiness, explicit one-time approval, Worker route, upload, remote content verification, History/GO TO. Use disposable authorized test objects; don't overwrite production data or change billable provider state without approval.
- Regression-test Explorer pointerdown/click/contextmenu, folder traversal, paging, cancellation, selection, reload, auth failure, and large listing performance; use DevTools Performance trace or automated browser profiling where available.
- Run `npm run test:focused`, relevant module tests (including `right2cloud-module/tests/module.test.mjs`), `npm run build:extension`, and browser tests where environment permits. Diagnose prior CI failures; don't suppress tests or rename failures as passed.
- Keep the real extension loadable from its documented built directory and usable without a persistent terminal process. Preserve OAuth, config, data, and privacy boundaries.
- For each end-to-end claim distinguish **PASS**, **FAIL**, **BLOCKED**, **NOT TESTED**. Unit fixtures cannot establish live Chrome or cloud success. Avoid ungrounded claims and fabricated timing numbers.

## Continuous execution and 30-minute handoff

This is an **implementation run**, not a request for another roadmap, audit-only document or mock-only demo. Start from the current `main`, branch for engineering work, make source changes and test iteratively. **Keep working for approximately 30 minutes**, completing as many directly connected P0 repairs as practical, with small meaningful commits. Progress from menu correctness to saving to Explorer reliability, and continue working on independent Explorer/CI issues when external OAuth/Chrome/cloud verification is blocked. No per-milestone artificial timebox; no fabricated duration.

Provide a **handoff at the end** with:
- working branch + commit SHA for each change; exact before→after of menu, save routing, startup, and Explorer responsiveness;
- explicit native menu state for every required scenario, including all four Settings toggles;
- real Chrome tests / actual R2 verification and independent readback where possible, or exact blockers and reproduction;
- before/after Explorer timings, listing size, CPU/memory/DOM/API observations, navigation/context-menu evidence;
- tests passed/failed, CI status and unresolved defects;
- next engineering actions in priority order.

**Definition of success:** the installed Click2Cloud extension opens reliably, the right-click menu exactly matches the owner-approved rules, a ready Cloudflare click truly saves to its intended R2 location, and Explorer traverses and responds without lag, stalls or crashes at REDOWN-level quality or better. Do not represent documentation edits or passing simulation-only tests as completed product functionality.
