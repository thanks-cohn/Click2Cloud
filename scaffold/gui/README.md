# Click2Cloud V3+1 — GUI extraction from REDOWN (Codex handoff)

**Status: SOURCE-BACKED GUI DESIGN AND TEST HANDOFF ONLY.** No runnable GUI has been built by these files. Codex will implement it. **The primary deliverable is an installable Chrome MV3 extension with working Cloudflare OAuth and REAL native right-click saving via Workers/R2.**  
**Extracted:** 2026-11-05  
**Read-only reference:** `thanks-cohn/REDOWN` commit `75fd1425d0db5270c725b3e4ef8e9ab124c3083a`  
**Implementation target:** `thanks-cohn/Click2Cloud/scaffold/gui/`  
**Authority:** Latest [V3+1 scaffold](../README.md), [independent Menu Configuration Recovery](../MENU_DESTINATIONS_DURABLE_RECOVERY.md), [actual Chrome + real Worker acceptance](./CHROME_EXTENSION_LIVE_ACCEPTANCE.md) and [REDOWN OAuth extraction](./REDOWN_OAUTH_EXTRACTION.md) override REDOWN's old exclusive mode/editing behavior and earlier mock-cloud-first testing.

## 1. Basic premise being extracted

**REDOWN's core user experience is a cloud companion that lets the user browse real cloud folders and save a web item to a precisely chosen cloud location from the Chrome right-click menu.** The basic REDOWN visual language is a polished cloud dashboard/Shelf plus a real File Explorer, not a standalone settings form.

Preserve the successful, visible REDOWN navigation concepts; **replace V3's awkward global setup tree with the Click2Cloud V3+1 workflow**. Do not transplant the V3 controller as the new engine. The GUI serves the independently implemented V3+1 compiler and provider adapters.

| REDOWN surface and what it currently does | Click2Cloud GUI extraction / changed target |
|---|---|
| **Shelf/home:** provider cards, cloud connection status, quick navigation to files, History and Settings, odometer area | **Remotes** is the default landing view, with recognizable Cloudflare / Drive / Dropbox / OneDrive cards; show a clear **File Explorer** entry and the small circular **Manage Destinations pointer below/right of the odometer**. Demo uses visibly simulated providers. |
| **Explorer left sidebar:** connection/account picker, Saved Destinations, Storage Buckets, Bucket Tools, dock navigation | Keep a premium, accessible account/bucket sidebar; selection immediately exposes the folder tree using the **existing Universal File API**. No redundant setup tree to create a path the user just selected. |
| **Explorer main workspace:** back/forward/up, Refresh, breadcrumbs, folder listing, grid/list, filtering, upload/new folder, preview, file operations | Reuse these as recognizable file-browser affordances. At Explorer TOP put **+ Right Click** and **Manage Destinations**; **DO NOT add a separate hierarchy toggle**. The popup's bottom **Show in Chrome** controls visibility exclusively, while the third Depth tab saves independent per-bucket display levels. Explorer folder local context menu includes `+ Right Click` AND `Default Save Selection` for Flat. Only controls with a real fixture/adapter action are enabled in demo mode. |
| **Existing V3 Setup:** global Simple/Nested → Narrow/Level controls, mandatory label, separate parent/path form, Browse folders, Apply | **REJECT as UX.** New compact **+ Right Click** popup with **Simple / Narrow / Depth** configuration tabs. Simple has optional title; Narrow alone has two-column Menu Titles; Depth lists authorized buckets with independent display ON/OFF and depth (**default 10, no hard maximum**). A persistent **Show in Chrome** row ABOVE Save has independent Simple/Narrow/Depth toggles, plus **All** (select all) and **Flat** (exclusive, direct Cloudflare). Explicit Save commits; Cancel/Escape discards drafts. Recovery Mode is configured separately in Settings. |
| **Current REDOWN native right-click menu:** REDOWN root, Cloudflare destination rows, independent Drive/Dropbox/OneDrive rows, Manage Destinations | V3+1 builds one COMPOSITE menu with saved **Simple flat Cloudflare leaves + saved Narrow hierarchical branches + optional additive Depth tree**. Other provider leaves stay flat. Browser GUI shows a real compiler-driven preview, not a hand-coded picture of a menu. |
| **Current Manage destinations:** Chrome action opens the Explorer's old setup section | New dedicated **one-pop-out manager**; Simple/Narrow filter on top, maximum 20 entries **per page**, scroll/pagination, X to remove only the configured menu item, click row to edit inside same pop-out, **Back to Destinations directly below switch**, Escape goes back then closes. Settings can hide only Chrome shortcut. |
| **Settings/backup:** storage preferences and optional manual encrypted backup | Dedicated settings for menu shortcut, separate **menu configuration** and **Depth index** recovery status. Menu configs: externally durable CURRENT, journal, **weekly backups by default**, daily option; real user-created titles survive valid backup-based reinstall recovery. Depth backup stays independent. |

**Scope discipline:** This workbench must test right-click destinations while borrowing REDOWN's familiar Explorer/dashboard architecture. It must not rebuild all of REDOWN's archive preview, Shelf History, URL publishing, billing or full cloud account provisioning merely to make a V3+1 GUI.

## 2. Exact REDOWN source provenance (inspect; do not blindly copy)

Every link below is pinned to the inspected REDOWN commit:

| Source | Evidence to extract | Target use |
|---|---|---|
| [`extension/beta/explorer.html`](https://github.com/thanks-cohn/REDOWN/blob/75fd1425d0db5270c725b3e4ef8e9ab124c3083a/extension/beta/explorer.html) | Lines 14–66 sidebar; 68–110 headers/toolbars; 133–160 older Right-click setup | Semantic main layout and affordances; **not** old form |
| [`extension/beta/explorer.mjs`](https://github.com/thanks-cohn/REDOWN/blob/75fd1425d0db5270c725b3e4ef8e9ab124c3083a/extension/beta/explorer.mjs) | Selected-folder handling and Explorer context menu near lines 195 and 370 | Selected location as immutable `account/bucket/prefix`; local folder right-click action |
| [`extension/beta/explorer.css`](https://github.com/thanks-cohn/REDOWN/blob/75fd1425d0db5270c725b3e4ef8e9ab124c3083a/extension/beta/explorer.css) | Light porcelain-like tokens, sidebar/main grid, file list/grid, preview-resize patterns | Visual language and layout proportions, not dependent stylesheet import |
| [`extension/beta/dashboard.css`](https://github.com/thanks-cohn/REDOWN/blob/75fd1425d0db5270c725b3e4ef8e9ab124c3083a/extension/beta/dashboard.css) | Compact toolbar and responsive Explorer layouts | Accessible responsive top controls |
| [`extension/shelf.html`](https://github.com/thanks-cohn/REDOWN/blob/75fd1425d0db5270c725b3e4ef8e9ab124c3083a/extension/shelf.html) | Cloud/Remotes cards, History, Settings, Files entry and dashboard | Premium navigation home; not an iframe or full Shelf clone |
| [`extension/shelf.css`](https://github.com/thanks-cohn/REDOWN/blob/75fd1425d0db5270c725b3e4ef8e9ab124c3083a/extension/shelf.css) | Theme variables and cards across Porcelain, Midnight, Neon | Theme direction; do **NOT** copy/download font files |
| [`extension/beta/right-click-v3-ui.js`](https://github.com/thanks-cohn/REDOWN/blob/75fd1425d0db5270c725b3e4ef8e9ab124c3083a/extension/beta/right-click-v3-ui.js) | V3's tree focus/keyboard safeguards, optimistic validation/serialized apply | KEEP interaction lessons; REPLACE screen, mode semantics |
| [`extension/right-click-v3.js`](https://github.com/thanks-cohn/REDOWN/blob/75fd1425d0db5270c725b3e4ef8e9ab124c3083a/extension/right-click-v3.js) | Natural ancestor construction, exact path resolution, Depth discovery limits | Engine reference only; **old mutually exclusive project() must change** |
| [`extension/background.js`](https://github.com/thanks-cohn/REDOWN/blob/75fd1425d0db5270c725b3e4ef8e9ab124c3083a/extension/background.js) | Lines 2603–2620 Chrome root/menu registration; 2947–2969 native click resolution | Source truth for native adapter and verified routing, not a script for browser-only GUI |
| [`extension/right-click-current.js`](https://github.com/thanks-cohn/REDOWN/blob/75fd1425d0db5270c725b3e4ef8e9ab124c3083a/extension/right-click-current.js) + [backup settings](https://github.com/thanks-cohn/REDOWN/blob/75fd1425d0db5270c725b3e4ef8e9ab124c3083a/extension/right-click-backup-settings.js) | IndexedDB CURRENT, journal, backup cadence and manual encrypted file export | Adapt persistence mechanics; build NEW independent external menu backup |

The Click2Cloud repo already contains `src/explorer/{file-api.mjs,r2-adapter.mjs,configuration.mjs}` and `src/dashboard/{controls.mjs,redown-bridge.mjs}`, a basic `dashboard/` host-dependent screen, and `src/core/menu-compiler.mjs`. Reuse them as sources; do **not** pretend that REDOWN-host-only actions function in an ordinary `http://localhost` page.

## 3. Codex must build a REAL Chrome extension with this GUI

**Primary deliverable:** A working **Manifest V3 unpacked Chrome extension** with `manifest.json`, service worker, Click2Cloud Explorer page, real Cloudflare OAuth (registered for its own extension identity), menu controller/registrar/dispatcher, authenticated Worker/R2 integration and proper install instructions.

- User installs in `chrome://extensions` → Developer mode → **Load unpacked**. Clicking its toolbar icon opens Click2Cloud **Remotes**, with a direct entry to its File Explorer. Neither REDOWN V3 nor a localhost server may be required for the actual extension to work.
- The GUI's `+ Right Click`, Simple, Narrow, additive Depth and Manage Destinations actions must register/modify the **real Chrome native `contextMenus`** through one canonical V3+1 compiler. A browser-page illustration is never native-menu acceptance.
- **OAuth IS REQUIRED:** The user must be able to click Connect Cloudflare inside the installed extension and grant the requested scopes, then browse actual authorized R2 bucket/folder data. Copy the verified REDOWN OAuth behavior, but use a valid Click2Cloud-specific OAuth client registration/redirect. See [OAuth contract](./REDOWN_OAUTH_EXTRACTION.md).
- **Real Worker testing:** Use the existing `click2cloud-v3p1-r2-lab` Worker, the actual `redown` bucket and **only the authorized disposable test prefix** for end-to-end saves/verification. Worker service bindings alone do NOT substitute for extension OAuth or ensure a publicly reachable Worker endpoint.
- `npm run demo` / `npm run test:gui` may be included as developer conveniences, but the **main acceptance is the installed extension** (actual native Chrome menus, real user auth, real Worker upload + independent R2 readback). Synthetic fixtures remain only for isolated unit tests and fault injection.
- If a Cloudflare OAuth client registration or redirect permission cannot be granted by Codex, report **BLOCKED** with the exact required user action. Keep implementing and testing the unaffected extension code; never fake connection.
- Preserve REDOWN source and unrelated production buckets/Workers unchanged. Do not copy credentials/tokens or bypass the extension's sender authorization.

**Proposed build tree (actual layout up to Codex):**
```text
scaffold/
  README.md                           authoritative V3+1 UX/spec
  MENU_DESTINATIONS_DURABLE_RECOVERY.md
  gui/
    README.md                         this REDOWN GUI extraction
    CHROME_EXTENSION_LIVE_ACCEPTANCE.md
    REDOWN_OAUTH_EXTRACTION.md
    TEST_JOURNEYS.md
    demo-fixtures.json                ONLY edge-case and fault-injection fixture data
src/                                  reusable actual engine and API modules
extension/ OR dist/chrome-unpacked/   Codex IMPLEMENTS the load-unpacked MV3 product
```


### P0 — Popup controls ALL Chrome visibility; no Explorer hierarchy button

**Remove the former little hierarchy/tree button completely.** There is no separate visibility toggle in File Explorer. The single `+ Right Click` popup has **Simple | Narrow | Depth** top configuration tabs and, immediately above its anchored bottom Save/Cancel, **Show in Chrome: Simple [ON/OFF] | Narrow [ON/OFF] | Depth [ON/OFF] | All | Flat**. The three display booleans can coexist; All enables all three; Flat is exclusive and temporarily replaces Cloudflare hierarchy with a one-click native `REDOWN → Cloudflare` leaf. Returning from Flat restores previously selected display booleans. The saved destination records persist when hidden. No unsaved drafts leak to Chrome.

**Depth tab** displays authorized buckets, each with an independent ON/OFF for **Chrome DISPLAY** and positive integer display depth (**initial default 10 only; no hard-coded max**). Show:Depth controls whether that saved projection appears. If no Depth display buckets are checked, there are no autogenerated branches even if Show:Depth is ON. This is NOT Recovery Mode.

**Explorer folder's local context menu** contains `+ Right Click`, `Default Save Selection`, and Manage Destinations. `Default Save Selection` binds Flat to the exact authorized account/bucket/folder identity. **Flat requires that verified target**, produces no Cloudflare submenu, and must not silently choose another bucket. Simple/Narrow still target the actual right-clicked folder.

**Settings → Recovery Mode** controls **Weekly (Monday; default) or Daily**, Simple Recovery ON/OFF, Narrow Recovery ON/OFF, and an expandable authorized bucket list with independent Depth Recovery ON/OFF and an independent **recovery crawl depth** per bucket (no arbitrary software maximum). Backup/restore captures chosen Show/Flat state and the separately saved Depth display/recovery configs. CURRENT updates on confirmed changes; delta journals record events; historical immutable weekly/daily snapshots and verified weekly.json give recovery points outside Chrome storage. See [independent Recovery specification](../MENU_DESTINATIONS_DURABLE_RECOVERY.md).

## 4. GUI navigation hierarchy and interaction contracts

1. **Remotes (DEFAULT)** — small cloud/provider cards and connection state, odometer, quick **Explorer / Manage Destinations** routes. Real OAuth connection status must be shown (not mocked as connected).
2. **File Explorer** — left authorized account/bucket tree; main breadcrumbs + selectable folder/file rows and preview (minimum: folder navigation and folder selection). **+ Right Click** and **Manage Destinations** at Explorer top, always findable; **NO hierarchy button**. Folder context menu includes `+ Right Click`, `Default Save Selection`, and Manage Destinations.
3. **+ Right Click configuration popup** — **THREE tabs: Simple / Narrow / Depth**. Simple/Narrow target exact Explorer clicked/selected folder; Narrow alone reveals two-column Menu Titles and synchronized bottom label. **Depth tab** selects each authorized bucket's Chrome DISPLAY inclusion and depth (default 10; NO app cap); selected folder does not constrain it. **Above bottom Save** show the persistent **Simple / Narrow / Depth / All / Flat** visibility controls. Save commits both configured changes and visibility; Cancel/Escape discards drafts. Folder right-click → `+ Right Click` opens the same popup.
4. **Manage Destinations popup** — its own *single* modal/panel; two modes as **list filters** at top; scroll and 20 entries per page with independent page positions; every row has X (confirm removes config only). Clicking a row swaps list → editor **in the same popup**; Back immediately below filter and Escape return to same page. Simple editor one row; Narrow editor all ancestor rows; Save updates existing ID.
5. **Show in Chrome (popup-only)** — independent visibility booleans Simple, Narrow, Depth, All convenience selector and exclusive Flat. ONLY saved selection changes native Chrome output; hiding never deletes underlying saved routes. Flat is a direct-save actionable Cloudflare leaf targeting the separately saved `Default Save Selection`. Do not show an Explorer hierarchy toggle or infer mode visibility from last edited tab.
6. **Native menu and optional preview** — real Chrome contextMenus registered from ONE compiler, with preview of committed popup Show combination. All merges Simple/Narrow/Depth; Flat renders **only one direct actionable Cloudflare leaf without Cloudflare submenu**, retaining independent flat provider siblings. Exact scoped Flat target and collision-safe identities are mandatory. Native click rechecks authorization and cannot pretend save success.
7. **Settings** — `Show Manage Destinations in Chrome menu` option without hiding Explorer control; dedicated **Recovery Mode** Weekly (default, Monday)/Daily with Simple and Narrow Recovery ON/OFF and expandable bucket list with independent Depth Recovery ON/OFF + crawl-depth numeric inputs; report separate menu-config, depth-config, depth-index, recovery-policy CURRENT/journal/weekly health. These recovery selections do not alter popup Show or its display depth.
8. **Focused Recovery proof** — simulate browser loss, accidental deletion, corrupt CURRENT/journal, partial bucket crawl and external backup unavailable. Verify restoring Simple/Narrow/Depth, popup Show/Flat target, separate Depth display/recovery depths and Weekly/Daily ON/OFF policy from independent external recovery files. No 1,000-scenario testing project.
9. **Status and trust** — display whether each action is `Draft`, `Saved to working state`, `Externally backed up`, `Chrome applied`, `Chrome registered`, or `Provider verified` as distinct truthful stages.

**Backup Location selection (Settings, NOT the + Right Click popup):** Under Recovery Mode/Backup, offer exactly two radio/select choices: **Automatic (default)** = %LOCALAPPDATA%\Click2Cloud\Recovery\ managed by the authorized Windows companion, and **Documents** = Documents\Click2Cloud\Backups\ at the actual Windows Documents known-folder location. The selected location receives the complete actual CURRENT.json, month-scoped journal/YYYY-MM.jsonl, historical dated weekly/daily snapshots and manifests for menu-config, depth-config, depth-index and recovery-policy. Do not treat Documents as export-only. Show active resolved path, last verified backup, write/restore health and a guarded change-location control (copy, validate, switch; no silent delete). The month/year in 2026-11.jsonl is an EXAMPLE; generate filenames for every current month, and continue event sequences across monthly/year boundaries. Only one active destination is selected at a time; don't claim automatic duplication.

**Save Whole Cloud (Recovery Mode bottom):** A polished multiselect dropdown checks multiple connected authorized Cloudflare R2 accounts and other S3 cloud accounts, with a **Save Whole Cloud** button BELOW it at the bottom of Settings → Recovery Mode. Start an independent READ-ONLY entire-account bucket+key outline capture per selected cloud, not just user-selected Depth folders. **No time cap**; continue across as many weeks as necessary with Weekly default resumption cadence or Daily if chosen; durable incremental progress, no giant in-memory list. OAuth loss pauses without deleting progress; the **next successful login to that SAME cloud account auto-resumes**. Final dated names reflect actual start-through-completion ISO weeks, e.g. `backup-cloudflare-week45-50-2026.json`, with different accounts disambiguated and partial exports explicitly incomplete. Destination is the selected external recovery folder. See [Save Whole Cloud source of truth](../WHOLE_CLOUD_OUTLINE_EXPORT.md).

**One-click menu restore:** Recovery Mode Settings has **Restore My Right-Click Menu**, distinct from Save Whole Cloud. Ask the authorized companion to locate the Automatic or Documents recovery root; choose last valid CURRENT+monthly deltas or verified historical snapshot; restore exact saved Simple/Narrow/Depth/Show/Flat and cached directory index into IndexedDB; re-register REAL Chrome native menu with ACK without full bucket rescan. On reinstall, display **Backup Found** passively, not a surprise modal. Missing OAuth leaves provider actions Pending Reconnect until next ordinary authorized login. See [restore contract](../RESTORE_RIGHT_CLICK_MENU.md).

**Programmatic parity:** Every real Explorer/creation/manager/backup action delegates to the same versioned headless V3+1 domain service used by authorized agent commands. Glaciaring observes source-owned events and does not become a write-enabled engine. A secure local agent gateway exposes inspect, preview, scoped configure, protected restore and (if authorized) real save; consent/authorization scope, idempotency, account identity, and diagnostics are mandatory. Future MCP/plugin support is an adapter, not a second engine or public API by default.

## 5. Visual intent

REDOWN's source has an approachable premium look: spaced account sidebar, restrained badges, rounded file rows/cards, themed high-contrast surfaces and meaningful hover/focus states. Preserve the recognizable brand, not exact old markup:
- Functional file browser FIRST, aesthetic CSS on top. Separate view state from canonical data and provider operations. Never use decoration to conceal a broken action.
- Compatible with REDOWN's **Porcelain / Midnight / Neon** theme direction. Start with one polished theme and make theme tokens extensible rather than cloning all theme effects now.
- Real intuitive folder expansion. No `Browse folders` gate for revealing an already indexed tree. No typing-focus theft and no offscreen floating/stuck dialogs.
- Popup fits and scrolls; footer Save anchored inside it. ESC/back keyboard, ARIA labels, pointer/keyboard parity, responsive narrow windows, reduced-motion support.
- Do not copy bundled font files into the repo, depend on paid assets, or use images/icons from unrelated products.

## 6. Exit gate and actual testing

The GUI/extension is **NOT DONE** until:
- Actual unpacked extension loads in Chrome, independent of REDOWN and localhost, with Click2Cloud's real Remotes and File Explorer.
- **Actual Cloudflare OAuth** works under Click2Cloud's extension ID and scopes; auth can be refreshed/reconnected without erasing saved menus.
- Actual R2 bucket/folder inventory loads and exact selected folder targets are verified.
- All GUI actions invoke canonical engine/controller methods and real Chrome contextMenus reflect **saved Show:Simple/Narrow/Depth/All/Flat** and exact Flat destination with native ACK, no hierarchy toolbar and worker restart recovery.
- **A real right-click on an external image or link saves it via authorized Worker to the correct test prefix**, verified by an independent R2 read-back, without false success on timers.
- Menu, Depth display, Depth index and Recovery Mode settings/deltas/weekly backups meet `../MENU_DESTINATIONS_DURABLE_RECOVERY.md`.
- `TEST_JOURNEYS.md` passes native Chrome + real provider acceptance, or shows a precise **BLOCKED** external consent gate; mocks do not count as passed live features.
- Actual build/install path, test commands, evidence, and PASS/FAIL/NOT TESTED results are provided.

## 7. Codex's first implementation pass

1. Read `../README.md`, `../MENU_DESTINATIONS_DURABLE_RECOVERY.md`, `CHROME_EXTENSION_LIVE_ACCEPTANCE.md`, `REDOWN_OAUTH_EXTRACTION.md`, this file, `TEST_JOURNEYS.md`; inspect `src/core/menu-compiler.mjs` and `src/explorer/index.mjs`.
2. Build an unpacked MV3 extension with real Explorer GUI, then integrate Click2Cloud-specific OAuth, real account/bucket discovery and authenticated Worker access. Do not import REDOWN's extension identity or tokens.
3. Implement Show-filtered composite engine and real `chrome.contextMenus` registration; wire **three-tab Simple/Narrow/Depth popup and bottom Show:Simple/Narrow/Depth/All/Flat + Save**, remove hierarchy toolbar, and wire Explorer folder `Default Save Selection` to exact Flat target. Preserve independent manager.
4. Verify a real image/link right-click save under disposable R2 test prefix and independent read-back; test Chrome worker suspension/installation/reload.
5. Build Settings Recovery Mode Weekly/Daily, Simple/Narrow ON/OFF, independent per-bucket recovery depths, distinct durable CURRENT/journals/dated weekly backups, and focused end-to-end failure/recovery tests. Do NOT pursue the old 1,000-scenario expansion project.
6. Report actual installable package path, real-Chrome OAuth/menu/saving evidence and explicit PASS/FAIL/BLOCKED, with no REDOWN V3 production edits.

**Do not build a visual imitation of V3's original global settings form. Build the V3+1 UX described above.**
