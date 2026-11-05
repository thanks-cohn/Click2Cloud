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
| **Explorer main workspace:** back/forward/up, Refresh, breadcrumbs, folder listing, grid/list, filtering, upload/new folder, preview, file operations | Reuse these as recognizable file-browser affordances. At the Explorer TOP beside the other relevant controls put **+ Right Click**, a **tree-glyph toggle ONLY for showing/hiding SAVED Depth hierarchy in Chrome's native right-click menu**, and **Manage Destinations**. Per-bucket Depth participation/levels are edited exclusively through the popup's third Depth option, not beside the toggle. Only controls with a real fixture/adapter action are enabled in demo mode. |
| **Existing V3 Setup:** global Simple/Nested → Narrow/Level controls, mandatory label, separate parent/path form, Browse folders, Apply | **REJECT as UX.** New compact **+ Right Click** popup with **Simple / Narrow / Depth** choices. Simple has optional Menu Title; Narrow alone reveals the two-column Menu Titles tab; **Depth instead lists authorized buckets with per-bucket ON/OFF and depth (default 10)**. All three require the popup's fixed-bottom **Save** to commit. Cancel/Escape discards drafts. |
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


### P0 — Save Depth inside popup; hierarchy button displays saved settings only

In `+ Right Click`, choose **Simple | Narrow | Depth**. Selecting Depth displays authorized bucket rows with independent enabled checkbox and depth value (**default 10**), and a bottom **Save** button. The user MUST click Save to persist those per-bucket choices. The Explorer tree/hierarchy button beside `+ Right Click` simply shows/hides the **already saved** Depth branch projection in Chrome's actual native menu; it cannot edit levels, enable buckets or apply unsaved drafts. This toggle is a display preference, not the Depth configuration Save. The local Explorer folder context menu also has `+ Right Click`; Simple/Narrow use the exact right-clicked folder, while Depth is bucket-wide. Both manual types remain visible in either toggle position.

## 4. GUI navigation hierarchy and interaction contracts

1. **Remotes (DEFAULT)** — small cloud/provider cards and connection state, odometer, quick **Explorer / Manage Destinations** routes. Real OAuth connection status must be shown (not mocked as connected).
2. **File Explorer** — left authorized account/bucket tree; main breadcrumbs + selectable folder/file rows and preview (minimum: folder navigation and folder selection). **+ Right Click**, Depth tree switch and Manage Destinations near Explorer top, always findable.
3. **+ Right Click configuration popup** — **THREE selectable options: Simple / Narrow / Depth**. Simple and Narrow target the exact Explorer clicked/selected folder; Narrow alone reveals the two-column Menu Titles tab and synchronized bottom title. **Depth shows every authorized bucket with its own participation checkbox and saved depth value, starting at 10 per bucket; the selected folder does not constrain Depth**. Every change is a draft until **Save** is clicked at bottom; Cancel/Escape discards it. Folder right-click → `+ Right Click` opens this exact same popup.
4. **Manage Destinations popup** — its own *single* modal/panel; two modes as **list filters** at top; scroll and 20 entries per page with independent page positions; every row has X (confirm removes config only). Clicking a row swaps list → editor **in the same popup**; Back immediately below filter and Escape return to same page. Simple editor one row; Narrow editor all ancestor rows; Save updates existing ID.
5. **Hierarchy visibility toggle** — **beside + Right Click**; the tree-glyph has a single job: **show/hide the last SAVED Depth per-bucket hierarchies in real Chrome right-click menus**. No level selector or per-bucket editor beside the button. Depth levels and participation are only edited and explicitly Saved through the popup's third option. Toggling ON compiles eligible indexed folders up to each participating bucket's saved depth; OFF removes only autogenerated branches, not Simple/Narrow or saved settings. Persist the visibility choice separately.
6. **Native menu and optional preview** — real Chrome contextMenus must be registered from the same combined compiler, with optional GUI preview annotating Simple, Narrow, Depth and flat provider leaves. Both `REDOWN → Cloudflare` direct-only default and correct nested/flat cases must be represented. Unique path actions even when display labels collide. Native click resolves exact provider/account/bucket/prefix and refuses unknown/unverified.
7. **Settings** — toggle **Show Manage Destinations in Chrome menu** without hiding Explorer/Shelf control; separate backup status/policies for Menu Config and Depth Index; Menu Config backups WEEKLY by default or DAILY; clearly show independent storage health.
8. **Recovery Lab** — simulate IndexedDB/cache loss, extension uninstall/reinstall and invalid CURRENT/journal; restore from external independent menu and depth recovery roots without a full cloud rescan and without dropping per-level aliases. Never present LocalStorage/IndexedDB itself as uninstall-proof storage.
9. **Status and trust** — display whether each action is `Draft`, `Saved to working state`, `Externally backed up`, `Chrome applied`, `Chrome registered`, or `Provider verified` as distinct truthful stages.

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
- All GUI actions invoke canonical engine/controller methods, and **native Chrome contextMenus** genuinely match Simple + Narrow + additive Depth with verified registration ACK and worker restart recovery.
- **A real right-click on an external image or link saves it via authorized Worker to the correct test prefix**, verified by an independent R2 read-back, without false success on timers.
- Separate menu and Depth backups/recovery meet `../MENU_DESTINATIONS_DURABLE_RECOVERY.md`.
- `TEST_JOURNEYS.md` passes native Chrome + real provider acceptance, or shows a precise **BLOCKED** external consent gate; mocks do not count as passed live features.
- Actual build/install path, test commands, evidence, and PASS/FAIL/NOT TESTED results are provided.

## 7. Codex's first implementation pass

1. Read `../README.md`, `../MENU_DESTINATIONS_DURABLE_RECOVERY.md`, `CHROME_EXTENSION_LIVE_ACCEPTANCE.md`, `REDOWN_OAUTH_EXTRACTION.md`, this file, `TEST_JOURNEYS.md`; inspect `src/core/menu-compiler.mjs` and `src/explorer/index.mjs`.
2. Build an unpacked MV3 extension with real Explorer GUI, then integrate Click2Cloud-specific OAuth, real account/bucket discovery and authenticated Worker access. Do not import REDOWN's extension identity or tokens.
3. Implement composite Simple + Narrow + additive Depth engine and real `chrome.contextMenus` registration; wire **three-choice Simple/Narrow/Depth popup**, per-bucket Depth settings requiring Save, and **display-only hierarchy toolbar toggle** to canonical committed state; preserve the independent manager.
4. Verify a real image/link right-click save under disposable R2 test prefix and independent read-back; test Chrome worker suspension/installation/reload.
5. Build separate external backups/recovery and failure tests; keep synthetic fixtures for independent fault scenarios.
6. Report actual installable package path, real-Chrome OAuth/menu/saving evidence and explicit PASS/FAIL/BLOCKED, with no REDOWN V3 production edits.

**Do not build a visual imitation of V3's original global settings form. Build the V3+1 UX described above.**
