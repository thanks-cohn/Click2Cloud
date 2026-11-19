# P1 — Filename Search hidden in Explorer despite space in expanded toolbar

**Reported:** November 18, 2026 (Windows Chrome installed unpacked Click2Cloud, user screenshot, approximately 9:42 PM local).  
**Status:** OPEN — reproducible symptom shown by owner; code path examined; root cause is source-grounded but a local screen-width reproduction has not yet been performed.  
**Build:** `codex/ux-filename-search-audit-2026-11-18` @ `1f366aa7639aeef343c05925cf47dbe1a48f970d` (implemented filename search in `c1ea866baedb568fb44361573a9a558f2cd39818`), extension `0.3.19`, ID `ajppphdiamdobknpamcheohmdbdbeoal`.  
**Location:** Chrome Shelf / side panel → File Explorer → top command toolbar, at narrow/default side-panel width.  
**Screenshot:** User supplied a real installed-Chrome screenshot in the ChatGPT conversation on Nov 18, 2026, showing an expanded (two-row) Explorer toolbar. Screenshot was not uploaded into GitHub; preserve the original conversation image as independent owner evidence.

## What the user sees

The first command row shows Back, Forward, Up, Refresh and Explorer More (`…`). The next row visibly shows `+ Right Click` and `Details`, with Search **absent** despite the user's expectation that the two-row area should prioritize a useful filename-search field. The area above the file listing is available, yet the only apparent access to Search is through More. The filename-search implementation itself exists and is not the missing feature; the problem is **responsive placement/visibility**.

**Expected:** In the **expanded / two-row Explorer toolbar**, use the available horizontal and vertical space to keep a **real, focusable, readable filename search field visible** whenever there is usable room, particularly at the normal side-panel size. The field should appear near the navigation actions / before More, or in a deliberately planned second-row position. Preserve `+ Right Click`, especially the owner's requested placement, and move lower-priority View/Details controls to the More menu first if needed. Never reserve empty toolbar area while hiding Search because of a *first-row-only* test. In the explicitly condensed one-row mode, preserve its separate compact navigation/More contract unless that design is intentionally revised with user approval.

**Actual:** Search is hidden from the visible toolbar (moved to Explorer More) even when the two-row layout is used. The layout prioritizes `Details` and `+ Right Click` as secondary elements but doesn't reconsider Search for the second row.

## Source-grounded probable cause

`extension/explorer-layout.mjs`:

- Line 6 reads `const search=commands.querySelector('#filename-search-form');`.
- Lines 34–42 compute first-row `available` width, measure navigation actions, then add Search to `primary` **only** when **all four navigation buttons + gap + `--filename-search-min`** fit in one row:
  `if(primary.length===navigation.length&&used+gap+parseFloat(commandStyle.getPropertyValue('--filename-search-min'))<=available)primary.push(search);`
- Lines 43–49 compute the expanded `rows` and add only `secondary=['add-location','view-switch']` to `extra`; Search is **never reconsidered** for that second row. Instead it gets moved into `#toolbar-overflow` via `hidden=nodes.filter(...)`.
- `extension/app.css` defines `#command-items { --filename-search-min:154px; ... flex-wrap:wrap }` and `#command-items>#filename-search-form {flex:1; min-width:var(--filename-search-min)}` plus compact nav sizing. This unconditional 154px minimum combined with a first-row-only fit test is likely to hide Search at narrow shelf widths even when expanded layout could make room by prioritizing Search over View.

**Do not claim** that the screenshot alone proves the second row currently has 154 *contiguous* free pixels. Measure actual container and control widths in installed Chrome. The defect is that the placement algorithm ignores expanded-row opportunities and does not prioritize Search.

**Related:** [P1 — older condensed toolbar navigation-only requirement](P1_EXPLORER_CONDENSED_TOOLBAR_NAVIGATION_ONLY_2026-11-09.md); [filename search API contract](../../docs/evidence/filename-search.md). Do not conflate Explorer More with the global header More, or the pagination `#more`.

## Requested fix

1. Make **expanded row packing aware of Search**, not just the first row. Explicitly assign priorities: navigation stays on first row; Search is high priority when expanded; `+ Right Click` remains reachable/visible in expanded layout where feasible; View can move into More ahead of Search. Reduce wasted width/gaps responsively; measure the real available area.
2. Preserve a readable usable search input, without truncation, overlap, blank reserved rows, unintentional third row, or hiding the far-upper-right sun/moon in the **separate global header**.
3. Search remains one real `#filename-search-form` instance, using `searchDirectoryNames` File API and IndexedDB—no GUI-only filtering and no second source of truth. Reparent safely between toolbar and More without losing query text, keyboard focus, screen-reader labelling or submitted results.
4. If the panel becomes genuinely too narrow even after moving secondary controls, collapse Search into More with an accessible entry point; as soon as usable space becomes available, it should return, including when the user expands from one to two toolbar rows. Do not hardcode the width from one screenshot.
5. Test actual Shelf default width, 280/320/360/480/600/1100px, 1 and 2 toolbar rows, all three aesthetics, both light/dark themes, collapsed/50-50/custom left-tree split, focus and typing/Enter/Escape, details/list/grid changes, and display resize.
6. Verify keyboard shortcuts `Ctrl+Shift+F8` (toolbar rows) and `Ctrl+Shift+F9` (50/50 pane reset), and preservation of `+ Right Click` and existing File API action routing.
7. Add a browser regression test that specifically asserts the search input **is visible at the user-reported normal narrow two-row shelf state** when computed layout has sufficient space, and that the existing one-row compact contract remains intact.

## New user-requested keyboard shortcut: pop out/focus Search immediately

**Added requirement:** Search must be reachable **without using the mouse or opening Explorer More manually**, even when responsive layout has hidden the inline search form. Introduce a third **dedicated shortcut** for "Search filenames / Pop out search". Proposed consistent chord: **Ctrl+Shift+F7**, alongside existing **Ctrl+Shift+F8** (toggle toolbar rows) and **Ctrl+Shift+F9** (reset pane split). Confirm Ctrl+Shift+F7 does not conflict with Chrome, Windows, extension shortcuts or accessibility features before finalizing; if it does, select and document a safe alternative, preserving the established F8/F9 shortcuts.

Behavior and acceptance:

1. In File Explorer with Search **inline and visible**, the shortcut focuses the existing search input and selects its text (or preserves caret/query when appropriate). Do not spawn a redundant text field.
2. When inline Search is **hidden in More** because the toolbar is narrow or condensed, the shortcut **pops out a compact anchored Search overlay/popover** with the **same underlying search input/form**, automatically focuses it and makes it usable immediately. Do not require another click. Prefer an accessible popover rather than permanently adding toolbar rows or forcing the splitter height.
3. The shortcut works at the normal Windows Chrome Shelf/side-panel size, in both one-row and two-row toolbar states, and with collapsed or custom tree/gallery widths. Preserve the global top-right Sun/Moon switch and the existing **+ Right Click** control.
4. **Enter** submits to the existing `searchDirectoryNames` File API; typing alone does not issue remote requests. **Escape** closes the pop-out when appropriate, restores focus to its prior/trigger location and does not inadvertently discard results. Clearing the query explicitly resets to browsing. Reopening retains the query until the normal search-reset rules apply.
5. Avoid two competing Search form instances or duplicate event listeners. Preserve current source scope, IndexedDB inventory, visible results, session/authorization fencing, query text, keyboard focus and screen-reader naming when moving the existing form between toolbar/overflow/popover.
6. Suppress the shortcut while typing in other controls, interacting with a modal/menu, or using an IME; prevent collisions with the existing browser Find and accessibility commands. Expose the shortcut as `aria-keyshortcuts` on the Search control and in Explorer More/help text.
7. Add browser/installed-Chrome tests for **Ctrl+Shift+F7** at the owner-reported 360px shelf width, wide/compact toolbars, all themes and debug modes, consecutive activations, Escape, focus restoration and no extra provider reads until Enter. Test standard shortcuts F8/F9 continue working.

This shortcut is a **new implementation request**, not a claim it already exists in commit `1f366aa`.

## Separate question: `:nested` filename-search syntax

**NOT IMPLEMENTED in V1.** `docs/evidence/filename-search.md` says V1 searches only immediate children of the current directory and has **no recursive or inline path command**. The V3+1.1 `searchDirectoryNames({source,query,pageToken?,pageSize?,refresh?})` operation treats its `query` as a basename substring, not a `:nested` modifier; don't advertise recursion as working. The app's distinct `nested`/Narrow *context-menu mode* is unrelated to recursive filename search. Consider `:nested` a future separately scoped feature, not part of fixing search field visibility.

## Completion evidence

A screenshot/DOM bounding-box proof in installed Shelf at its default size showing visible Search on the expanded toolbar, tests for compact/expanded layouts and no overflow, keyboard/focus tests, and the exact commit/test results. Do not report resolved based only on source changes or fixture screenshots.
