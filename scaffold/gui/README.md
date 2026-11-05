# Click2Cloud V3+1 — GUI extraction from REDOWN (Codex handoff)

**Status: SOURCE-BACKED GUI DESIGN AND TEST HANDOFF ONLY.** No runnable GUI has been built by these files. Codex will implement it in this directory.  
**Extracted:** 2026-11-05  
**Read-only reference:** `thanks-cohn/REDOWN` commit `75fd1425d0db5270c725b3e4ef8e9ab124c3083a`  
**Implementation target:** `thanks-cohn/Click2Cloud/scaffold/gui/`  
**Authority:** Latest [V3+1 scaffold](../README.md) and [independent Menu Configuration Recovery](../MENU_DESTINATIONS_DURABLE_RECOVERY.md) override REDOWN's old exclusive mode/editing behavior.

## 1. Basic premise being extracted

**REDOWN's core user experience is a cloud companion that lets the user browse real cloud folders and save a web item to a precisely chosen cloud location from the Chrome right-click menu.** The basic REDOWN visual language is a polished cloud dashboard/Shelf plus a real File Explorer, not a standalone settings form.

Preserve the successful, visible REDOWN navigation concepts; **replace V3's awkward global setup tree with the Click2Cloud V3+1 workflow**. Do not transplant the V3 controller as the new engine. The GUI serves the independently implemented V3+1 compiler and provider adapters.

| REDOWN surface and what it currently does | Click2Cloud GUI extraction / changed target |
|---|---|
| **Shelf/home:** provider cards, cloud connection status, quick navigation to files, History and Settings, odometer area | **Remotes** is the default landing view, with recognizable Cloudflare / Drive / Dropbox / OneDrive cards; show a clear **File Explorer** entry and the small circular **Manage Destinations pointer below/right of the odometer**. Demo uses visibly simulated providers. |
| **Explorer left sidebar:** connection/account picker, Saved Destinations, Storage Buckets, Bucket Tools, dock navigation | Keep a premium, accessible account/bucket sidebar; selection immediately exposes the folder tree using the **existing Universal File API**. No redundant setup tree to create a path the user just selected. |
| **Explorer main workspace:** back/forward/up, Refresh, breadcrumbs, folder listing, grid/list, filtering, upload/new folder, preview, file operations | Reuse these as recognizable file-browser affordances. At the Explorer TOP beside the other relevant controls put **+ Right Click**, **tree-glyph Depth ON/OFF**, and **Manage Destinations**. Only controls with a real fixture/adapter action are enabled in demo mode. |
| **Existing V3 Setup:** global Simple/Nested → Narrow/Level controls, mandatory label, separate parent/path form, Browse folders, Apply | **REJECT as UX.** New compact **+ Right Click** popup: Setup tab (optional Menu Title, Simple/Narrow selection) and Narrow-only Menu Titles tab (two-column immutable actual folders/editable display titles). Save fixed at bottom. |
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

## 3. Codex must build HERE; the GUI must be launchable

**Required launch contract after implementation:**
- Implement a real entry point `scaffold/gui/index.html` with modules, style and assets **inside Click2Cloud** (relative imports of existing `src/` modules are allowed). This file does not yet exist.
- Implement `npm run demo` as a self-contained local dev server, opening or clearly printing the exact browser URL `http://localhost:4173/scaffold/gui/`. It must work on Windows 11 and Node >=20. Never ask users to open a `file://` HTML page or require the REDOWN extension just to see Demo.
- Implement `npm run test:gui` for automated interaction tests. Provide an optional `scripts/start-gui.ps1` double-click/PowerShell Windows launcher if practical. Do not claim commands work until tested.
- Default to **DEMO (simulated cloud)** mode. All demo-only data and actions visibly identify themselves. A fake transfer may show `SIMULATED` but **never `Verified upload` or verified real R2 success**.
- Include a user-selectable **Connected / Integration** mode only after an authorized Click2Cloud Chrome host bridge exists. The current REDOWN bridge intentionally rejects standalone `localhost` privileged calls: do not bypass sender authorization or copy live tokens into a web app.
- Actual native Chrome context menus cannot run in the local web page. Preview them via the SAME **pure combined V3+1 compiler output**. Add a separate minimal MV3 test-extension harness for real native Chrome registration and routing, with one writer, one listener, deterministic IDs and runtime acknowledgements.
- Keep REDOWN read-only throughout Click2Cloud development. No side effects to production Cloudflare, accounts, Workers or buckets during demo.

**Work area suggestion:**
```text
scaffold/
  README.md                    authoritative V3+1 end state
  MENU_DESTINATIONS_DURABLE_RECOVERY.md
  gui/
    README.md                  THIS REDOWN GUI extraction and implementation/launch contract
    TEST_JOURNEYS.md           manual + automated E2E acceptance
    demo-fixtures.json         synthetic folder and menu seeds (NO credentials)
    index.html                 ← Codex IMPLEMENTS later
    app.mjs                    ← Codex IMPLEMENTS later
    style.css                  ← Codex IMPLEMENTS later
```

## 4. GUI navigation hierarchy and interaction contracts

1. **Remotes (DEFAULT)** — small cloud/provider cards and connection state, odometer, quick **Explorer / Manage Destinations** routes. In demo, card says `Demo disconnected/connected`, not a live OAuth claim.
2. **File Explorer** — left authorized account/bucket tree; main breadcrumbs + selectable folder/file rows and preview (minimum: folder navigation and folder selection). **+ Right Click**, Depth tree switch and Manage Destinations near Explorer top, always findable.
3. **+ Right Click creation popup** — Setup tab is the default, optional title, **Simple / Narrow** switch; Narrow introduces Menu Titles tab with actual ancestor names LEFT and optional aliases RIGHT, final title synchronized. Save at bottom on either tab; Cancel unchanged.
4. **Manage Destinations popup** — its own *single* modal/panel; two modes as **list filters** at top; scroll and 20 entries per page with independent page positions; every row has X (confirm removes config only). Clicking a row swaps list → editor **in the same popup**; Back immediately below filter and Escape return to same page. Simple editor one row; Narrow editor all ancestor rows; Save updates existing ID.
5. **Depth tree toggle** — **beside + Right Click**; tree-glyph ON/OFF, level selector, auto-include ALL indexed authorized directories to selected level. All saved Simple/Narrow choices remain present when Depth is ON or OFF. Persist last depth selection.
6. **Native menu preview** — always generated from the real combined compiler, annotating Simple, Narrow, Depth and flat provider leaves. Both `REDOWN → Cloudflare` direct-only default and correct nested/flat cases must be represented. Unique path actions even when display labels collide. Preview route click shows exact provider/account/bucket/prefix and refuses unknown/unverified.
7. **Settings** — toggle **Show Manage Destinations in Chrome menu** without hiding Explorer/Shelf control; separate backup status/policies for Menu Config and Depth Index; Menu Config backups WEEKLY by default or DAILY; clearly show independent storage health.
8. **Recovery Lab** — simulate IndexedDB/cache loss, extension uninstall/reinstall and invalid CURRENT/journal; restore from external independent menu and depth recovery roots without a full cloud rescan and without dropping per-level aliases. Never present LocalStorage/IndexedDB itself as uninstall-proof storage.
9. **Status and trust** — display whether each action is `Draft`, `Saved to working state`, `Externally backed up`, `Chrome applied`, `Simulated`, or `Provider verified` as distinct truthful stages.

## 5. Visual intent

REDOWN's source has an approachable premium look: spaced account sidebar, restrained badges, rounded file rows/cards, themed high-contrast surfaces and meaningful hover/focus states. Preserve the recognizable brand, not exact old markup:
- Functional file browser FIRST, aesthetic CSS on top. Separate view state from canonical data and provider operations. Never use decoration to conceal a broken action.
- Compatible with REDOWN's **Porcelain / Midnight / Neon** theme direction. Start with one polished theme and make theme tokens extensible rather than cloning all theme effects now.
- Real intuitive folder expansion. No `Browse folders` gate for revealing an already indexed tree. No typing-focus theft and no offscreen floating/stuck dialogs.
- Popup fits and scrolls; footer Save anchored inside it. ESC/back keyboard, ARIA labels, pointer/keyboard parity, responsive narrow windows, reduced-motion support.
- Do not copy bundled font files into the repo, depend on paid assets, or use images/icons from unrelated products.

## 6. Exit gate and actual testing

The GUI is **NOT DONE** until:
- `npm run demo` opens the workbench in a real browser after a clean checkout, without REDOWN or Cloudflare auth.
- All GUI actions call actual state/controller/engine operations, not dead buttons and static text swaps.
- `npm run test:gui` executes deterministic automated journeys from [TEST_JOURNEYS.md](./TEST_JOURNEYS.md).
- Source IDs, menu paths and versions survive GUI reload and external recovery after simulated storage deletion.
- A separate installed Chrome harness verifies real native menu branching, permissions, limits, service-worker restart and ACK. Browser-only preview is **not** native proof.
- Only then introduce actual Cloudflare TRUE REMOTE verification (Worker fetch → R2 independent read-back) and other provider bytes upload. No false success on a timer.

## 7. Codex's first implementation pass

1. Read `../README.md`, `../MENU_DESTINATIONS_DURABLE_RECOVERY.md`, this file, `TEST_JOURNEYS.md`, `demo-fixtures.json`; inspect `src/core/menu-compiler.mjs` and `src/explorer/index.mjs`.
2. Implement workbench shell and synthetic File API provider; get launching browser GUI and reliable folder selection.
3. Implement the **new canonical menu model + combined compiler**; attach creation popup and manager; add in-GUI menu preview and tests. Do not "solve" the demo by retaining exclusive one-mode `compileMenu({mode})`.
4. Add Depth toggle and indexed tree budget/completeness indicators, then independent external recovery engine and Recovery Lab.
5. Add native MV3 test harness, verified provider transport integration behind authenticated adapter, evidence and rollback.
6. Report a truthful feature-by-feature PASS/FAIL/NOT TESTED table with actual commands/CI receipts. No REDOWN V3 production edits.

**Do not build a visual imitation of V3's original global settings form. Build the V3+1 UX described above.**
