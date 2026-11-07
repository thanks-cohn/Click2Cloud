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

Each numbered milestone is a **separate Codex run / one reviewable commit or small PR**, not a massive rewrite. Begin with M00. Do not mark a milestone PASS until its specific checks pass. If installed Chrome or provider access is blocked in Codex, mark **BLOCKED / NOT LIVE VERIFIED**, deliver local fixes/tests and exact owner steps rather than calling a fixture a live pass.

### M00 — Startup: click the extension icon and OPEN Click2Cloud
- **Inspect:** `extension/manifest.json`, `extension/background.mjs`, `extension/app.mjs`, `scripts/build-extension.mjs`, `src/build-info.mjs`; compare REDOWN `extension/entry-bootstrap.js` and `extension/boot.js`.
- **Fix:** Build/install entrypoint, missing module imports, MV3 service-worker exceptions, dead initialization, and unresolved UI loading. No background terminal/server required in normal use. Do not wipe existing browser storage.
- **PASS:** Installed toolbar click reliably opens a responsive UI; refreshing/reloading/restarting the worker does not strand it at Loading; startup errors and current build are inspectable. If browser installation blocked, deliver exact proof of the blocker.

### M01 — Native menu: exactly four flat provider leaves, one Cloudflare
- **Inspect:** Click2Cloud `src/core/menu-spec.mjs`, `src/core/action-resolver.mjs`, `src/chrome/registrar.mjs`; REDOWN `extension/right-click-v3.js`.
- **Fix:** Initial Click2Cloud grouping displays exactly **Google Drive, Dropbox, OneDrive, Cloudflare**; no duplicate "Cloudflare R2" + "Cloudflare", no unnecessary REDOWN menu, no premature nesting. Stable native IDs and ACK; Chrome constraints observed.
- **PASS:** Fresh / signed-in / reloaded / last custom destination deleted: exactly one Cloudflare leaf while no extras. Independently inspect native menu, not just generated model. Other three are visible but must not pretend to have working upload adapters.

### M02 — Cloudflare `redown` is the one-time initial default
- **Inspect:** `src/cloudflare/onboarding.mjs`, `src/api/config.mjs`, `src/persistence/current-store.mjs`, `src/core/menu-spec.mjs`.
- **Fix:** Once a single authorized Cloudflare account is known, the user's approved initial setup creates **or reuses lowercase `redown` exactly once** and prepares/verifies its transfer capability, then selects `redown/` with no manual bucket/default menu configuration. Readiness and authorization cannot be fabricated. Later explicit custom default wins, but `redown` remains a selectable active destination until **explicitly** removed; intentionally deleted buckets must not be silently recreated. Handle multiple accounts without guessing.
- **PASS:** New account starts with a working `redown` after consent/setup; returning user does not redo setup; custom target preserved; deleting `redown` does not trigger silent recreation. The `menuCustomized` flag never hides a legitimate default.

### M03 — Single Cloudflare entry changes to ONE submenu only with extras
- **Fix:** With only `redown/`: **Cloudflare** is a flat direct-save leaf. On adding another Cloudflare destination, replace that leaf with **Cloudflare → redown / Other chosen locations** (one additional native menu level for Simple configuration). Never render an independent Cloudflare R2 sibling or a second Cloudflare branch. With removal of last extra, return to flat **Cloudflare**. Preserve chosen default and named destinations, Narrow/Depth behavior where configured.
- **PASS:** Stable tree/IDs, no duplicate labels or branches, and exact account/bucket/prefix resolution through add/edit/remove and reload.

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

## Exact default menu and default-bucket examples

```text
FIRST INSTALL / ONLY redown:
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
  Cloudflare                  ← flat direct save again

READY CLOUD PROVIDER:
native right-click → select provider → save to exact location → verified result
NO dashboard / extra setup tab / login loop.

NOT CONNECTED:
native right-click → select provider → compact 'One Click Away!' panel
provider icon + name + Sign in → consent
next fresh right-click saves when provider and destination are genuinely ready.
```

Notes: The `redown` bucket is an approved initial default, not permission to recreate an intentionally deleted bucket. A user-chosen default takes precedence while `redown` remains an option until explicitly removed. Where Chrome itself groups the extension under one parent, that Chrome grouping is accepted; do not add a redundant in-extension parent.

## One-Codex-run-at-a-time contract

1. **First read AGENTS.md, the two foundation diagram files, this roadmap, and the specific REDOWN comparison module(s) for the current milestone.**
2. Execute **ONE numbered milestone per run**, smallest effective production change, focused regression test, independent evidence and one concise diff. Do not rewrite the menu engine, Explorer API or other modes. M00–M08 outrank all other work.
3. Red/green: make a targeted test fail with the old behavior, fix it, and test the actual browser/UI when feasible; document source-only tests distinctly from real Chrome/provider tests.
4. Always preserve saved destinations, explicitly changed defaults, OAuth state and user data. Never delete local/browser storage, replace unrelated cloud objects or provision billable cloud resources silently.
5. No arbitrary product-imposed website, upload-size, time, queue or file-list ceilings. Acknowledge real browser, compute and cloud limits and essential credential/network isolation. Errors must be understandable, not disguised as setup instructions.
6. For every GUI action whose business operation can be reasonably exposed programmatically, use the same underlying typed API. A browser UI gesture or provider consent screen is not a synthetic API action.
7. Deliver: changed files, exact behavior before→after, automated tests, real installed-Chrome/provider proof or explicit BLOCKED, any known remaining defects, final commit SHA. **Do not mark PASS if real acceptance wasn't performed.**
8. When a milestone is accepted, proceed to the next numbered milestone in a **new** run. No two-hour speculative feature expansion.

## Minimal starter prompt for the NEXT Codex run (M00)

> Read `AGENTS.md`, `docs/CODEX_SMALL_MILESTONES_TO_SURPASS_REDOWN_2026-11-06.md`, `foundations/cloudflare/README.md` and `foundations/other_clouds/README.md` in Click2Cloud. Read REDOWN's `extension/entry-bootstrap.js` and `extension/boot.js` as **read-only behavioral references**.
>
> **Execute M00 only: Click2Cloud must start and open when the Chrome toolbar icon is clicked.** Diagnose the actual build, service-worker/module lifecycle and UI init. Implement the smallest durable fix and targeted tests. Don't reset storage or redesign anything. Keep the canonical API. Validate with installed Chrome if possible; otherwise report exactly why blocked and provide owner steps. Commit the code and give before/after evidence. Do not move on to M01 until M00 is verified or the exact external acceptance blocker is recorded.
