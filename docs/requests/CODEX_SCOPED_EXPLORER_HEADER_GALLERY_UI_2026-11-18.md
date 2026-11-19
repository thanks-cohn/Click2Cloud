# CODEX REQUEST — Click2Cloud scoped header, gallery and search-toolbar polish

**Date:** 2026-11-18  
**Status:** STEP 1 — focused UI IMPLEMENTATION. STEP 2 filename/IndexedDB is now also IMPLEMENTATION; only STEP 3 final cloud-engine audit is read-only.  
**Repository:** thanks-cohn/Click2Cloud  
**Primary source:** [Current File Explorer search and UI proposal](../../codex-ideas/FILE-EXPLORER-FILENAME-SEARCH-BAR-2026-11-18.md)  
**Execution order (updated user instruction): STEP 1 = UX FIXES FIRST; STEP 2 = IMPLEMENT [working File API filename search + persistent IndexedDB cache](CODEX_IMPLEMENT_FILENAME_SEARCH_INDEXEDDB_2026-11-18.md); STEP 3 = final READ-ONLY Click2Cloud vs ReDown cloud-engine architecture audit.** Finish focused header/footer/Settings/Debug/New Folder UI corrections first; then ship actual filename search with tests; only then research the enterprise architecture. Work on an isolated feature branch, never main; do not modify ReDown or deploy cloud resources. No cloud-engine/provisioning/security redesign is authorized by this UI task.

## Mandatory top-header layout: SUN/MOON UPPER-RIGHT, FIRST ROW, NEVER WRAP

**The sun/moon Light/Dark button (`#theme`) must remain at the FAR UPPER-RIGHT CORNER OF THE TOP APPLICATION HEADER ROW at ALL times. It must NEVER be pushed down into a second row, especially at the Shelf's actual default window size. The user explicitly does NOT want it in the upper-left.**

Inspect `extension/app.html`, `extension/app.css`, `extension/aesthetic.css` and the actual rendered responsive layout. The DOM currently places `#theme` after `<nav>`, yet the visual layout can wrap at narrow sizes. Fix the *layout*, not the theme logic:

- Dedicate a non-shrinking right-end header slot to the sun/moon switch, and explicitly prevent its line wrapping, clipping, hiding or displacement into More.
- Shift Remotes / File Explorer / History / header More tabs left as needed, trim wasteful gaps/padding while retaining readable labels and comfortable spacing, and preserve the brand without overlap.
- At the default Shelf viewport, **the entire application header occupies one row** and `#theme` is at its far-right end. At narrower supported widths, reduce nonessential spacing or place less-critical tab items in an accessible overflow as a last resort, but *never* place `#theme` on row two.
- Preserve theme behavior (light/dark switch), accessible name, focus order, keyboard support and all three themes: Bit o' Polish, Remote V1 and Minimal. Note that header More and Explorer toolbar More are different controls.

**Test with screenshots and bounding-box assertions** at the actual default Shelf width plus several narrower/wider widths. Assert that the sun/moon button top aligns with the first header row, sits at the right edge with padding, never overlaps nav or branding, and does not cause increased header height.

## Remove bottom footer permanently; maximize gallery

Current `extension/app.html` has a global footer containing `#action-feedback`, `#show-save-results`, and `#manage`. **Remove the full-width, always-present bottom footer and any reserved footer height**, giving that vertical space to the Explorer's real `#files` gallery/list viewport.

- **Manage Destinations (`#manage`):** move to a small floating/sticky LEFT-side control, preferably near the lower-left sidebar. Keep exactly the existing manager action, disabled/readiness policy, keyboard accessibility, and visibility even when the tree pane is collapsed. Do not obscure gallery tiles, scrolling, or the splitter, or consume an entire bottom row.
- **Review save results (`#show-save-results`):** this BUTTON is visible only with **Debug Mode ON**, and should live with debug controls, not a global footer. With Debug Mode OFF it must remain hidden even on error/uncertain saves. Keep the existing History access, receipts, error notices and relevant recovery guidance functional for non-debug users.
- Move `#action-feedback` to a compact, accessible nonpersistent status/toast or contextual notification that doesn't reserve gallery height. Do not suppress critical failed/uncertain-save warnings, loading state or accessibility announcements.
- Do NOT accidentally remove Explorer pagination (Load more), directory listing progress, item counts, selection state or existing safety/consent dialogs.

## Remotes page: Cloudflare status and Save results are Debug-Mode-only buttons

**New explicit user request (2026-11-18):** The two adjacent Remotes-page buttons **Cloudflare status** and **Save results** are unwanted in normal use. They must **both disappear when Debug Mode is OFF**, and appear **only when Debug Mode is ON**. They are **not** the same control as the already specified footer `Review save results` button.

**Exact source in `extension/app.mjs`:** `<button id="cloudflare-setup">Cloudflare status</button><button id="remote-history">Save results</button>` in the Remotes view markup. These currently bind to `cloudflarePanel` and `show('history')`. Preserve those handlers when the buttons are visible in Debug Mode.

- Make the **single authoritative Debug Mode state** (`debugPreference` / `applyDebugMode`) control **both** `#cloudflare-setup` and `#remote-history`, alongside `#show-save-results` and `#help-diagnose`. Synchronize on boot, preference restoration, re-render, view switch and live toggling; hidden elements must not leave empty gaps or remain keyboard-focusable.
- With Debug Mode **OFF**, do **not** show the two Remotes buttons in **Minimal, Bit o' Polish or Remote V1**. With Debug Mode **ON**, they may appear together in a compact diagnostic area, retaining exactly their existing actions.
- Preserve the header's normal **History** navigation, so ordinary users can still inspect saves without the diagnostic shortcut; never delete history, receipts or the underlying diagnostic API.
- Critical **Cloudflare setup approvals, permissions, live status, explicit failure messages and safe recovery** must still be visible/actionable through the ordinary setup/remotes workflow. Do not hide the essential `authorize-setup`, `prepare-selected`, `review-selected` or relevant recovery controls simply because `#cloudflare-setup` is debug-only. If that particular panel is the sole remaining route to a necessary recovery action, expose that action in a suitable ordinary place independently.
- An error or uncertain save must still produce a concise accessible warning/recovery route but **must not unhide either button when Debug Mode is OFF**.
- Regression tests must assert both buttons hidden (including from keyboard) when Debug Mode OFF on initial load, after save failure and after navigation, and visible/clickable with Debug Mode ON, across all aesthetics and viewport sizes; verify no stale dialogs or focus traps on a mode switch.

## Header More: Help · Diagnose ONLY in Debug Mode

- `Settings` is always available through the global header More menu, including when Debug Mode is OFF.
- `Help · Diagnose` (`#help-diagnose`) **appears and is keyboard-accessible ONLY when Debug Mode is ON**. When OFF, it must be hidden, excluded from tab and arrow-key navigation, and untriggerable from a stale open menu.
- Base menu rendering and `applyDebugMode` / `debugPreference` / `quietFeedback` should have ONE authoritative debug-visibility owner. Handle toggles without reload, initial preference restore, open menu focus, and mode changes.
- This is **UI visibility**, not a security boundary. Preserve the underlying diagnostics and error recovery paths.

## File Explorer toolbar / search placement

Use the above proposal as ground truth for this area, without conflating the Explorer toolbar and the global header.

- Keep Back / Forward / Up / Refresh navigation; place a **flexible filename search field in leftover space just BEFORE Explorer More** whenever it has enough width. When narrow, hide the search field first, leaving navigation and More intact, with search discoverable through More if appropriate.
- Replace the visible primary directory-address field role with Search. Keep a secondary accessible Go-to-path route.
- Search submission uses **Enter**, not every keystroke. The **File API owns the search**, not a GUI-only filtering engine. V1 is immediate children of the current directory; future `:nested` and `bucket/folder:nested` remain future API/search-bar commands rather than mandatory V1 recursion.
- **UX-first dependency rule:** Implement independent UI fixes in STEP 1 first. The complete File API/IndexedDB **implementation is explicitly authorized in STEP 2**, so defer enabling the Search input until it is functionally connected to the real API and verified persistent inventory. Preserve normal address navigation meanwhile. Do not ship fake or GUI-only search; do not let this dependency block sun/moon, footer, debug, shortcut, Settings or New Folder fixes.
- Keep **+ Right Click** fully functional and in its established second-row position if the toolbar expands.
- Add one shortcut to toggle Explorer toolbar between one/two rows (reusing existing `#toolbar-splitter` state) and another independent shortcut to reset left-tree/right-gallery `#pane-splitter` to 50/50. Validate key chords do not collide with OS/Chrome and aren't caught during text composition.
- Preserve responsive search even in single-row mode when width allows. Do not create a second layout engine.

## Minimal mode: remove the redundant "Login and usage" disclosure block

**User-requested UI change:** In **Minimal** appearance, remove the standalone collapsible section that currently reads:

> **Login and usage**  
> Login may prepare a private Worker and verify a small R2 file. Cloudflare usage may incur charges.

**Exact inspected source:** `extension/app.mjs` renders this as a `<details class="minimal-only"><summary>Login and usage</summary>...</details>` in the **Remotes** view. `extension/aesthetic.css` currently reveals every `.minimal-only` wrapper in Minimal mode. Remove **this particular redundant, space-consuming Remotes details block** from Minimal mode; do not indiscriminately hide unrelated `.minimal-only` warnings, diagnostics, or actionable recovery notices.

**Important disclosure requirement:** The text concerns potentially chargeable Cloudflare Worker/R2 actions and consent. Removing this *redundant UI block* must **not** conceal those facts before users authorize setup or operations. Make sure an accessible, concise explanation of any Worker preparation, verification writes and possible Cloudflare charges remains visible at the relevant login/setup/consent decision. Preserve existing mandatory confirmation and permission disclosures in all three themes and the Destinations Manager. Do not assume a login is free or silently authorize paid actions.

Regression check: Minimal Remotes no longer shows the literal `Login and usage` accordion; ordinary Remotes functionality and meaningful consent/cost notice remain correct; Bit o' Polish and Remote V1 unaffected; no change to Worker, R2, OAuth or save logic.

## Settings: Debug-only advanced sections and readable text wrapping

**User request (2026-11-18):** Declutter the Settings page. The following full Settings cards must be **hidden when Debug Mode is OFF**, and remain available and functional when Debug Mode is ON:

1. **Recovery Mode** — the ENTIRE card: external storage status/blocked note, Cadence weekly/daily selector, Simple Recovery, Narrow Recovery, Bucket recovery crawl and depth controls, Windows Backup Location (Automatic · Local AppData / Documents), external-folder explanation, Choose external backup folder, Back up now, and Restore My Right-Click Menu.
2. **Save Whole Cloud** — the ENTIRE card: account selections, Enable/Stop selected accounts, Inspect jobs, associated job status/output.
3. **Connection** — the ENTIRE Settings card: OAuth redirect URI such as `https://<extension-id>.chromiumapp.org/cloudflare` and the `Disconnect Cloudflare` button.

**Exact code:** `extension/app.mjs` builds three consecutive `<div class="card">` blocks, headed `Recovery Mode`, `Save Whole Cloud`, and `Connection`. Assign clear stable card IDs or a `data-debug-only` role for these containers, rather than hiding only selected inner text. Do not confuse the **Settings Connection card** with the Remotes sign-in/status UI or the sidebar `#connection`.

**Debug OFF:** cards and all their children are fully absent from visible layout, tab/focus order and accessibility navigation, with NO blank gaps. **Debug ON:** show all three with saved selections/statuses, existing working actions, no duplicated controls and no destructive changes just from toggling visibility.

**Essential access:** The existing `Sign out` button (`#sign-out`) in Remotes must remain available so normal users can disconnect; keep required login permissions, setup consent, notifications, reconnection, ordinary History, and any essential recovery path available outside Debug Mode. Ensure the `Debug Mode` control itself is always visible under Settings so the extra panels can be enabled when needed.

**Fix narrow-width text overflow:** The long OAuth redirect URI in the Settings Connection card, including `https://<extension-id>.chromiumapp.org/cloudflare`, must **wrap within its card instead of overflowing**. Apply suitable CSS to its own text element such as `overflow-wrap:anywhere`, `word-break:break-word` and `min-width:0`, with no forced page-wide horizontal scrolling and no broken keyboard interactions. In the Remotes diagnostic button group, `Cloudflare status` and `Save results` must also have readable spacing or wrap/stack at narrow widths rather than appearing as `Cloudflare statusSave results`. The ordinary user should not see these debug-only buttons at all when Debug OFF.

Use one authoritative `debugPreference`/`applyDebugMode` gate on load, Settings re-render, navigation and mode toggle, returning focus to a visible control if hiding a card with focused content. Test Debug OFF/ON/OFF, persistence/reload, 320px-ish/narrow/default/wide panels and all three aesthetics, ensuring zero overflow and appropriate retained settings.

## New Folder: no unnecessary generic Worker/R2 warning popup

**User request:** Clicking **New Folder** should not be interrupted by this generic modal during routine folder creation:

> This action may prepare a private Worker for all paths in the selected bucket or bind both selected buckets for a transfer. Cloudflare may charge for Worker and R2 usage.

**Inspected source:** `extension/app.mjs` defines this exact string as `workerCost`; `offerFilePreparation` wraps `fileActionGUI('mkdir')` and calls `setupDisclosure` only when `fileAction` fails with `FILE_SETUP_APPROVAL_REQUIRED`. The warning is generic and inaccurately mentions binding *both buckets for a transfer* during a single-bucket folder creation.

**Desired behavior:**
- On an already authorized/prepared bucket, **New Folder** opens the normal lightweight name form and creates/validates the directory with no additional setup/Worker/cost popup. Verify no spurious `FILE_SETUP_APPROVAL_REQUIRED` and no repeated prompt due to stale readiness, routing or state. Do not force implicit Worker reprovisioning to create folders.
- Where first-time Worker preparation, expanded bucket binding or genuinely chargeable setup **actually requires new user approval**, do **not** silently bypass the authorization/consent gate. Instead present a **single, accurate, contextual approval prompt** specifically describing the required *folder setup* and possible Cloudflare costs, with clear Continue/Cancel. Never show an unrelated cross-bucket transfer disclosure for mkdir. After consent, resume the same validated intent without duplicate folder creation.
- Do not conflate the **normal New Folder name form** with the unwanted extra disclosure. Keep name validation, permission checks, cancellation, verified creation, progress/error reporting, and exact target prefix identity.
- If this is currently shown on every creation, investigate the exact `FILE_SETUP_APPROVAL_REQUIRED` cause/authority readiness path **before modifying behavior**. Do not hard-code `authorizeSetup:true`, suppress real approval requirements, or weaken session/account isolation.
- Test prepared single-bucket mkdir, first-time unprepared bucket, authorization denial, lost/repeated reply, reauth, multiple consecutive mkdirs, root and nested directories, and no regressions to copy/move approval and save receipts. Nothing is deployed or written to real R2 as part of tests without explicit separately granted authorization.

**Implementation boundary:** This is a small correctness/UX fix; if addressing the duplicate approval requires changing security or provisioning semantics, stop and report the evidence instead of silently broadening this UI task. The separate IndexedDB cache and final cross-repo architecture requests are still research-only.

## Required validation & stop condition

- Inspect existing implementation before changing anything. Work only in a **dedicated isolated feature branch**, not `main`. Do not touch REDOWN.
- Make scoped UI updates only if implementation has been expressly authorized. Never change the cloud save engine, Worker deployment, authorization, receipts, destination configuration semantics, File API transport or IndexedDB production data as part of header/footer polish.
- Test default Shelf width, narrow/wide sizes, all themes, dark/light, mouse and keyboard, Debug Mode ON/OFF, header More focus, one/two rows, collapsed left pane, 50/50 reset, gallery height before/after and normal save error visibility. Assert sun/moon **never appears on second header row**.
- Report exact changes, before/after screenshots, tests, failures, unverified behavior and rollback. Do not claim real installed-Chrome success if unavailable.
- **Order must be UX fixes FIRST, real filename-search/IndexedDB IMPLEMENTATION SECOND, final READ-ONLY cross-repo architecture evaluation LAST.** This scope does not authorize security/provisioning redesign; the final architecture audit must not edit either repository.
