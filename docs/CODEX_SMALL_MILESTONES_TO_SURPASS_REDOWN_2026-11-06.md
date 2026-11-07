# Click2Cloud → Better Than REDOWN: Small, Verifiable Codex Milestones

**Created:** 2026-11-06  
**Target repository:** `thanks-cohn/Click2Cloud`  
**Comparison:** `thanks-cohn/REDOWN` current `main` at `e58bf99f4851f635cecc572e483ae35e184677f2`; Click2Cloud `main` at `a9e9711649d60ce57814f3cd6d3ff90fbacc800c` when surveyed.  
**Type:** product behavior / engineering milestone roadmap; **NO runtime changes from this document**.  
**North star:** Keep Click2Cloud's smaller V3+1 / Universal File API architecture, reproduce REDOWN's genuinely valuable capabilities, and exceed REDOWN in usability, resilience, speed, traceability, and practical programmatic access. **Do not transplant REDOWN's older competing engines.**

## Read these foundation diagrams first

- `foundations/cloudflare/README.md` — initial and returning Cloudflare UX, including the flat-to-nested rule and TRUE REMOTE.
- `foundations/other_clouds/README.md` — Google Drive, Dropbox, OneDrive native entries, direct-save behavior, and the tiny **One Click Away!** provider login cards.
- `bugs/CRITICAL/P0_EXPLORER_FILE_LEFT_CLICK_RIGHT_CLICK_FREEZES_UI_2026-11-06.md`.
- `docs/audits/CLICK2CLOUD_P0_RIGHT_CLICK_FORENSIC_REPORT.md` and `docs/evidence/CLICK2CLOUD_P0_LIVE_ACCEPTANCE.md` — separate verified source findings from live acceptance that remains blocked/not tested.

## What is valuable in REDOWN (behavioral references, NOT blanket code-copy targets)

| Benefit | REDOWN source evidence | Click2Cloud direction |
| --- | --- | --- |
| One intuitive Cloudflare item that nests **only if there are extra destinations**, default bucket `redown` | `extension/right-click-v3.js` (`simpleTargets`, `simpleProjection`) | One canonical menu contribution; four provider leaves initially; preserve redown until explicitly removed |
| More responsive file selection, windowed rows, cached sorting, context menu, navigation | `extension/shelf-explorer.mjs`; `extension/shelf-explorer-model.mjs` | Cache/order once per revision; virtualize visible rows; cancel stale requests |
| File context actions (Preview, Open in Window, Rename, Delete, Copy, Move, Paste, Download, New Folder) | `extension/shelf-explorer.mjs` (`showMenu`, actions) | Standard Windows-like Explorer interface, API-backed, no freezes |
| Efficient listing, paging, request coalescing, cancellation and navigation state | `extension/shelf-explorer-model.mjs` | Reuse proven patterns, not old presentation glue |
| Preview, side preview, window preview, lazy thumbnails and navigation | `extension/shelf-explorer.mjs`, `extension/preview-navigation.mjs` | Make optional/async, never block selection |
| Durable History, date grouping, cloud destinations, GO TO | `extension/shelf-history.js`, `extension/history-navigation.js` | Persist actual transfer evidence, reliable exact-destination GO TO |
| Quick Glance image history | `extension/history-quick-glance.js`, `extension/history-image-source.js` | A later non-blocking history feature |
| Provider integrations and distinct login states | `extension/google-drive-provider.js`, `extension/dropbox-provider.js`, `extension/onedrive-provider.js` plus auth/API files | One adapter per provider; single native leaf each; bytes/filename only to providers |
| Startup diagnostics, observable menu repair | `extension/entry-bootstrap.js`, `extension/boot.js`, `extension/runtime-diagnostics.js` | Click2Cloud Boot/Debug API observes *actual* startup/click/upload, never only simulations |
| Drag-out and handoff | `extension/chute-drag.mjs`, `extension/shelf-explorer.mjs` | Later verified Chute/Rcomplex file handoff, tested per destination |

**Do not copy:** REDOWN legacy menu registrars, old Worker/transfer pathways, duplicated provider owners, old artificial queue/size/preview limits as product limits, decorative complexity before the core works, simulated green results, or unverified claims of functional provider integrations. REDOWN source is proprietary; reuse implementation code only with the owner's proper authorization, preserve notices, and prefer reproducing verified behavior using Click2Cloud's own engine/API.

## P0 — It MUST open, right-click, save and remain responsive

Milestones are **small checkpoints within a continuous working session**, not limits on how much Codex should accomplish. The owner wants **approximately 30 minutes of continuous work per session**, advancing through as many high-priority fixes as practical, followed by a detailed handoff. Begin with broken startup, real native right-click saving, and Explorer freezes. Each checkpoint needs truthful evidence: PASS only with required validation; BLOCKED / NOT LIVE VERIFIED when an external resource is unavailable. Continue with unblocked work rather than substituting fixture results for live proof.

### M00 — Startup: click the extension icon and OPEN Click2Cloud
- **Inspect:** `extension/manifest.json`, `extension/background.mjs`, `extension/app.mjs`, `scripts/build-extension.mjs`, `src/build-info.mjs`; compare REDOWN `extension/entry-bootstrap.js` and `extension/boot.js`.
- **Fix:** Build/install entrypoint, missing module imports, MV3 service-worker exceptions, dead initialization, and unresolved UI loading. No background terminal/server required in normal use. Do not wipe existing browser storage.
- **PASS:** Installed toolbar click reliably opens a responsive UI; refreshing/reloading/restarting the worker does not strand it at Loading; startup errors and current build are inspectable. If browser installation blocked, deliver exact proof of the blocker.

### M01 — Native menu: exactly four flat provider leaves, one Cloudflare
- **Inspect:** Click2Cloud `src/core/menu-spec.mjs`, `src/core/action-resolver.mjs`, `src/chrome/registrar.mjs`; REDOWN `extension/right-click-v3.js`.
- **Fix:** Initial Click2Cloud grouping displays exactly **Google Drive, Dropbox, OneDrive, Cloudflare**, **even with no account, no bucket and no configured destination**; Cloudflare is clickable and routes to minimal login/setup until ready, then becomes the same direct-save leaf. No duplicate "Cloudflare R2" + "Cloudflare", no unnecessary REDOWN menu, no premature nesting. Stable native IDs and ACK; Chrome constraints observed.
- **PASS:** Fresh / signed-in / reloaded / last custom destination deleted: exactly one Cloudflare leaf while no extras. Independently inspect native menu, not just generated model. Other three are visible but must not pretend to have working upload adapters.

### M02 — Cloudflare `redown` is the one-time initial default
- **Inspect:** `src/cloudflare/onboarding.mjs`, `src/api/config.mjs`, `src/persistence/current-store.mjs`, `src/core/menu-spec.mjs`.
- **Fix:** On an authorized, approved first-time single-account connection, check whether exact lowercase bucket `redown` exists. **If YES, reuse it; if NO (including zero R2 buckets), create `redown` once as the initial setup**, then prepare/verify transfer capability and select the root of bucket `redown` (prefix `''`) as default. No manual bucket naming, location selection, extra R2 bucket, or mode configuration. The flat native Cloudflare leaf must be present and clickable even before the bucket exists; until ready it launches the tiny One Click Away! login/setup card, not a fake save. Later explicit custom default wins, and `redown` remains available until explicitly removed; intentionally deleted buckets are never silently recreated. Handle multiple accounts without guessing.
- **PASS:** New account starts with a working `redown` after consent/setup; returning user does not redo setup; custom target preserved; deleting `redown` does not trigger silent recreation. The `menuCustomized` flag never hides a legitimate default.

### M03 — Single Cloudflare entry changes to ONE submenu only with extras
- **Fix:** Cloudflare's native menu shape is driven by the **count of assigned Cloudflare save locations** (not all R2 buckets). Zero assignments: flat clickable provider login/approved first-time setup if new, **or opens Manage Destinations when a connected returning user has no assigned locations**; one assignment: flat direct-save leaf to the sole exact location (initially `redown/` after approved setup). Assign a second bucket/folder (e.g., Photos): immediately produce ONE **Cloudflare → redown / Photos** submenu, no duplicate Cloudflare R2 item. Creating a second R2 bucket without assigning it does not nest the menu. Deliberately delete/remove `redown` while Photos remains assigned: remove `redown` from menu/config, update default to the sole survivor, and return to one flat **Cloudflare** leaf saving to Photos. Never silently recreate removed `redown` or confuse network errors with deletion. Preserve named destinations, Narrow/Depth behavior, canonical API and native ACK.
- **PASS:** Test 0/1/2/3 assigned destinations including an initialized account with no location that opens Manage Destinations, creation without assignment, second assignment, removal of second, explicit deletion of `redown` with one survivor, deletion of last assigned destination, user-chosen default, reload, and exact account/bucket/prefix resolution. Each transition gives exactly one Cloudflare provider row and correct leaf/submenu shape with real native ACK.

### M04 — Native right-click READY means SAVE, not dashboard
- **Inspect:** `extension/background.mjs` dispatch, `src/chrome/registrar.mjs`, `src/core/engine.mjs`, `src/cloudflare/onboarding.mjs`.
- **Fix:** One Chrome native click on ready Cloudflare resolves the *save action* and immediately starts the intended R2 transfer; never funnels the ready provider through setup and `openShelf()`. Check only selected provider/destination on hot path; no scanning every configured destination before a simple save. A disconnected provider may open the compact provider-specific onboarding UI. Preserve current authorized destination.
- **PASS:** Ready: right-click → Cloudflare → remote operation ID without opening a dashboard/tab. Logged out: only explicit, correct login state. Onboarding is not a substitute for a save.

### M05 — TRUE REMOTE transfer with actual destination proof
- **Inspect:** `src/cloudflare/transport.mjs`, `src/cloudflare/worker.mjs`, `right2cloud-module/`, receipt/history.
- **Fix:** Worker fetches eligible public HTTPS source without browser-staging bytes; save to exact R2 bucket/prefix; independent destination readback; verified result only after proof, with meaningful failure/uncertain states and retry-by-inspection. No arbitrary app-imposed site, file-size, or operation-duration restrictions; observe actual platform limits and guard against unsafe private-address/source redirection. Do not send source/page/referrer URL as R2 object metadata.
- **PASS:** Controlled real-source bytes equal independent downloaded R2 object; exact filename/path; no dashboard. Include known/unknown lengths and slow transfers; don't call unit tests live acceptance.

### M06 — Actual native Chrome acceptance + traceable Boot/Debug API
- **Fix:** Record installed build revision, native click received, item/generation, auth status, chosen target, dispatched Worker operation ID, verified R2 receipt, and Explorer refresh under a correlatable operation chain. Fix any diagnostic simulator not connected to the real resolver. Keep traces sanitized and bounded; do not leak credentials, source URLs or personal file names into exports. Expose passive inspection APIs and boot health.
- **PASS:** Owner can collect a single read-only trace showing exactly which stage a **real** right-click did or did not reach. Installed Chrome + live R2 required for live PASS; if unavailable mark BLOCKED and show steps.

### M07 — Explorer selection freeze: repair the exact shared path
- **Inspect:** Click2Cloud `extension/app.mjs` `ordered()`, `updateSelection()`, `renderFiles()`, `contextFor()`; REDOWN `extension/shelf-explorer.mjs` `select()`.
- **Fix:** Never re-sort all entries inside a loop over each row. Cache sorted rows once per listing/sort, index by key, update selected visible elements rather than rebuilding the full listing; keep Shift/Ctrl/keyboard semantics and focus.
- **PASS:** Single click/right-click opens/responds without hanging; verify with actual Chrome performance measurements and small / thousands of files. No arbitrary row-count caps as workaround.

### M08 — Explorer listing, navigation and File API response performance
- **Inspect:** REDOWN `extension/shelf-explorer-model.mjs` request coalescing, cancellation and virtual windows; Click2Cloud `src/explorer/` and `src/api/service.mjs`.
- **Fix:** Paginated lazy reads, cancel/ignore stale navigation, dedupe in-flight requests, cache per authorized location and invalidate on confirmed changes, render only visible rows. Separate UI interaction from provider network latency, allow instant selection while Refresh is running.
- **PASS:** Large listings load progressively and stay responsive; scrolling, folder changes, Back/Forward/Refresh and service-worker restart recover without runaway requests or stalls. API-backed state and UI agree.

## P1 — Match REDOWN's genuinely useful Explorer + provider functionality

### M09 — Windows-like Explorer context actions, backed by File API
- Implement one ordinary file/folder right-click menu with **Open / Preview / Download / Rename / Copy / Move / Paste / Delete / New Folder** as applicable. Reuse REDOWN's user-visible semantics and Click2Cloud's own file API; do not copy REDOWN's old message ownership.
- No "Save to cloud" action that only says transfer unsupported while pretending success. Expose actual capability and disabled/not-ready states.
- **PASS:** Each *supported* action performs a real provider mutation with correct conflict policy (KEEP BOTH by default where applicable), refreshes exact folder, has API equivalent, and never blocks UI. Unsupported actions must be honestly labeled.

### M10 — Nonblocking previews
- Side preview by default where appropriate, explicit window preview, reliable double-click behavior; preview media asynchronously and release URLs on navigation. Preview-byte limits can be separate from file upload/download capability.
- **PASS:** Large files do not freeze Explorer; navigation and selection remain responsive; cancelled/failed previews never report file loss.

### M11 — Durable Save History and verified GO TO
- REDOWN references: `extension/shelf-history.js`, `extension/history-navigation.js`.
- **PASS:** Every transfer has persisted operation/status and exact provider/path, including uncertain/failed. Verified item has GO TO that navigates/highlights the real cloud file. Reload/history pagination works; no unverified "success".

### M12 — Other clouds: tiny selected-provider login card
- **Desired:** `One Click Away!` / provider icon / provider name / one `Sign in` button, in a compact extension-owned panel, NOT the full dashboard; follow `foundations/other_clouds/README.md`. OAuth consent may need a provider-owned browser window, but the Click2Cloud UI itself stays minimal.
- **PASS:** Clicking each unconnected provider displays ONLY its relevant minimal card, and no fake saved result. Returning connected/ready provider goes straight to actual adapter when implemented.

### M13 — Google Drive provider adapter: one real end-to-end path
- REDOWN reference: `extension/google-drive-provider.js` plus its auth/API/stream helpers. Preserve Click2Cloud's canonical dispatcher and versioned API.
- **PASS:** Connect once, selected destination, native right-click upload, provider-confirmed file and verified Explorer/History record, no original source/page URL sent to provider API. Record tested source constraints. Do not copy legacy open-tab transfer hacks.

### M14 — Dropbox provider adapter: one real end-to-end path
- REDOWN reference: `extension/dropbox-provider.js`, auth/API helpers. Avoid REDOWN's older queue cap and login-loop defects.
- **PASS:** Native right-click→actual Dropbox object, correct destination, reauthorization and uncertain result behavior, provider readback, no fake +1 count.

### M15 — OneDrive provider adapter: one real end-to-end path
- REDOWN reference: `extension/onedrive-provider.js`, auth/API helpers. Avoid earlier "public HTTPS only" transfer assumptions if browser-authorized byte transport is technically available.
- **PASS:** Native right-click→actual OneDrive item, explicit selected drive/folder, verified receipt, no source URL shared with destination provider, no forced extra tab except OAuth/provider consent.

### M16 — Simple/Narrow/Depth configuration without cross-mode collisions
- REDOWN reference: `extension/right-click-v3.js`; preserve Click2Cloud `src/modes/` and one menu projection.
- **PASS:** Editing one mode doesn't alter other modes. Simple leafs, Narrow configured paths, Depth discovered folder levels. Save Changes produces actual native ACK; one Cloudflare provider owner and no duplicate providers. Ordinary default never requires entering the editor.

### M17 — File API parity, robust conflict policies, and provider management
- Finish the meaningful `src/explorer/file-api.mjs` operations through supported provider adapters; inspect currently blocked mutations in `extension/background.mjs`. State capabilities truthfully. Pair GUI behavior with stable, typed, permission-scoped API where possible; browser-owned gestures/consent need programmatic inspection/trigger where supported, not pretend one-to-one replicas.
- **PASS:** Same path, permission, outcome and error semantics whether initiated through UI or trusted API. Test KEEP BOTH, cancellation, partial success, permission revoked, and cross-folder/cross-bucket operations.

## P2 — Surpass REDOWN after P0/P1 are genuinely usable

### M18 — History Quick Glance
- Lazy visible previews, fixed-size placeholders, cancelable fetch, thumbnails/preview source fallback, no all-at-once memory use; REDOWN `extension/history-quick-glance.js`. **PASS:** all historical records browseable, UI stable, preview resource usage bounded without treating thumbnail constraints as file caps.

### M19 — Durable recovery + Boot API
- REDOWN references: `extension/boot.js`, `extension/right-click-current.js`, `extension/runtime-diagnostics.js`. Keep Click2Cloud's canonical persistent configuration and existing API; add inspectable boot, repair and configuration recovery without wiping auth or user destinations. **PASS:** restart/update/menu recovery does not lose configured destinations; true installed state distinguished from historical ACK.

### M20 — Chute/Rcomplex drag-and-drop, verified handoff
- Reference `extension/chute-drag.mjs` behavior, NOT its old browser buffering limits. Work within browser/provider mechanics; prove target accepts real bytes (ChatGPT, Yandex, Google where permitted). **PASS:** no claim of delivered file when only a drag gesture was emitted; no page stall.

### M21 — Aesthetics LAST
- Clean Windows-like Explorer naming, minimal cards, hover options, optional themes/mascot, verified-success effects. Copy REDOWN's polish selectively, not its coupled animation logic. **PASS:** no essential action hidden behind effects, no perceptible performance regression, animations only after verified save.

## Provider visibility and empty-Cloudflare navigation (current P0 acceptance)

- Settings has four independent ON-by-default native provider toggles (Google Drive, Dropbox, OneDrive, Cloudflare). Hiding one removes its native menu rows but preserves account authorization and saved destination config. Restoring it reuses its existing configuration and canonical API with native ACK.
- Cloudflare with no remaining chosen/assigned destinations **after initial onboarding** is still a flat clickable provider entry. Connected: open **Manage Destinations**. Disconnected: sign-in first, then Manage Destinations. Never recreate previously deleted `redown`.
- Code owner: existing product configuration API, MenuSpec registrar and the existing Manage Destinations surface, not a new engine.
- See `foundations/cloudflare/README.md` Diagram 2A/2B.

## Exact default menu and default-bucket examples

```text
FIRST INSTALL / ZERO CLOUDFLARE BUCKETS / ONLY redown AFTER APPROVED SETUP:
Click2Cloud
  Google Drive
  Dropbox
  OneDrive
  Cloudflare                  ← directly saves to Cloudflare / redown /

AFTER USER ADDS AN EXTRA CLOUDFLARE DESTINATION:
Click2Cloud
  Google Drive
  Dropbox
  OneDrive
  Cloudflare                  ← one submenu, not a duplicate sibling
    redown                    ← persists until intentionally removed
    Photos                    ← example configured extra destination

AFTER LAST EXTRA IS REMOVED:
Click2Cloud
  Google Drive
  Dropbox
  OneDrive
  Cloudflare                  ← flat direct save to sole assigned destination

AFTER USER DELETES/UNASSIGNS redown BUT KEEPS Photos:
Click2Cloud
  Google Drive
  Dropbox
  OneDrive
  Cloudflare                  ← flat direct save to Photos; redown is absent

SECOND BUCKET EXISTS BUT WAS NOT ASSIGNED TO CLOUDFLARE:
Click2Cloud
  Google Drive
  Dropbox
  OneDrive
  Cloudflare                  ← stays flat, still targets sole assigned destination

READY CLOUD PROVIDER:
native right-click → select provider → save to exact location → verified result
NO dashboard / extra setup tab / login loop.

NOT CONNECTED / NO R2 BUCKET YET:
flat native Cloudflare entry is already visible and clickable
right-click → Cloudflare → compact 'One Click Away!' Cloudflare login
provider OAuth and approved first-run setup → check for redown → reuse or create redown
verify Worker and save destination → subsequent fresh clicks save directly to redown
never present authorization/setup as a successful save.
```

Notes: The `redown` bucket is the approved initial default, not permission to recreate an intentionally deleted bucket. Native nesting counts **assigned destinations**, not all existing buckets. An explicitly selected default takes precedence until intentionally removed; if it is deliberately removed and one assigned destination survives, that sole survivor becomes the direct-save/default target. If deletion is unconfirmed, preserve safety and show a clear error rather than guessing. Where Chrome groups extension entries under one parent, accept that browser grouping; do not add a redundant extension-authored parent.

## Continuous 30-minute Codex working-session contract

1. **First read AGENTS.md, the two foundation diagram files, this roadmap, and the specific REDOWN comparison module(s) for the current milestone.**
2. **Work continuously for approximately 30 minutes, moving through multiple numbered milestones.** Milestones are progress checkpoints; complete as many connected P0 fixes as practical. Repair startup, native menu layout, direct R2 saving, and Explorer responsiveness in priority order. While live Chrome or provider testing is blocked externally, advance independent implementation and regression coverage. Make small coherent code changes and commits without rewriting the V3+1 engine or File API.
3. Red/green: make a targeted test fail with the old behavior, fix it, and test the actual browser/UI when feasible; document source-only tests distinctly from real Chrome/provider tests.
4. Always preserve saved destinations, explicitly changed defaults, OAuth state and user data. Never delete local/browser storage, replace unrelated cloud objects or provision billable cloud resources silently.
5. No arbitrary product-imposed website, upload-size, time, queue or file-list ceilings. Acknowledge real browser, compute and cloud limits and essential credential/network isolation. Errors must be understandable, not disguised as setup instructions.
6. For every GUI action whose business operation can be reasonably exposed programmatically, use the same underlying typed API. A browser UI gesture or provider consent screen is not a synthetic API action.
7. Deliver: changed files, exact behavior before→after, automated tests, real installed-Chrome/provider proof or explicit BLOCKED, any known remaining defects, final commit SHA. **Do not mark PASS if real acceptance wasn't performed.**
8. After each completed checkpoint, immediately advance to the next highest-priority unfinished task **in the same session**. Around the end of the requested 30-minute working window (subject to the execution environment's available runtime), deliver a handoff containing commits, completed/partial/blocked milestones, tests, exact remaining issues, and the next actions for the following session. If elapsed-time measurement is unavailable, report completed work without inventing duration.

## Starter prompt for a continuous 30-minute Codex session

> Read `AGENTS.md`, `docs/CODEX_SMALL_MILESTONES_TO_SURPASS_REDOWN_2026-11-06.md`, `foundations/cloudflare/README.md` and `foundations/other_clouds/README.md` in Click2Cloud. Read REDOWN's `extension/entry-bootstrap.js` and `extension/boot.js` as **read-only behavioral references**.
>
> **Work continuously for approximately 30 minutes, across multiple M00–M08 checkpoints.** Click2Cloud must launch reliably; its default menu must have four flat provider entries (Google Drive, Dropbox, OneDrive, and one Cloudflare); the ready Cloudflare entry must save directly to the authorized default `redown` bucket; adding an extra Cloudflare destination should create one submenu; Explorer file clicks and context menus must remain responsive. Diagnose and implement real fixes, use REDOWN as a behavioral reference, retain the V3+1 engine and practical GUI/API parity, and add focused tests. Preserve user storage, OAuth, destinations, and actual security boundaries. Work on unblocked improvements if live Chrome/R2 testing is unavailable. Make coherent commits as you progress and deliver a detailed handoff at the end of the working window: changes, evidence, blockers, and next tasks. No arbitrary product caps or dashboard detours for a ready save.
