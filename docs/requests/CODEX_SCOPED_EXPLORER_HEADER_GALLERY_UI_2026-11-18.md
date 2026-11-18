# CODEX REQUEST — Click2Cloud scoped header, gallery and search-toolbar polish

**Date:** 2026-11-18  
**Status:** Focused UI implementation request, separate from the two research-only architecture tasks.  
**Repository:** thanks-cohn/Click2Cloud  
**Primary source:** [Current File Explorer search and UI proposal](../../codex-ideas/FILE-EXPLORER-FILENAME-SEARCH-BAR-2026-11-18.md)  
**Schedule:** First complete the read-only IndexedDB filename-inventory design; then tackle this narrowly scoped UI work; **last** do the read-only Click2Cloud vs ReDown architecture decision. If the user has not separately authorized implementation when running, provide an implementation plan only; do not modify code.

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

## Required validation & stop condition

- Inspect existing implementation before changing anything. Work only in a **dedicated isolated feature branch**, not `main`. Do not touch REDOWN.
- Make scoped UI updates only if implementation has been expressly authorized. Never change the cloud save engine, Worker deployment, authorization, receipts, destination configuration semantics, File API transport or IndexedDB production data as part of header/footer polish.
- Test default Shelf width, narrow/wide sizes, all themes, dark/light, mouse and keyboard, Debug Mode ON/OFF, header More focus, one/two rows, collapsed left pane, 50/50 reset, gallery height before/after and normal save error visibility. Assert sun/moon **never appears on second header row**.
- Report exact changes, before/after screenshots, tests, failures, unverified behavior and rollback. Do not claim real installed-Chrome success if unavailable.
- Preserve the order of the independent research tasks: **filename/IndexedDB design FIRST, final cross-repo architecture evaluation LAST**. Neither research-only request authorizes code changes.
