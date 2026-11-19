# Latest Codex follow-up — persistent Explorer filename Search

**Recorded:** November 19, 2026 (America/Chicago)  
**Source branch:** `codex/click2cloud-0.3.20`  
**Status:** NEXT CODEX RUN — REQUESTED, NOT YET IMPLEMENTED OR VERIFIED.

> **User requirement:** "For the search bar it should only disappear when Esc is pressed or the X on the far right. It should never disappear when the user presses Enter."

## Required behavior

1. **Enter searches; it does NOT close Search.** In Explorer, pressing **Enter** in the filename-search input runs the current-directory filename search through the **existing `searchDirectoryNames` API**, while keeping the same search field/pop-out **visible and usable**, with the query still displayed. This applies to success, empty matches, loading, error, and repeated Enter submissions.
2. **Only explicit dismissal closes an open Search panel:** **Escape** or the new, clearly visible **X close button at the far right of the Search bar**. Do not auto-dismiss Search after Enter, search completion, a file-list repaint, a harmless focus change or clicking results. Ordinary navigation away from Explorer may still tear down that view as expected.
3. **Place X inside the Search field area, at the far right.** It must be a genuine button (`aria-label="Close filename search"`) with reliable pointer and keyboard accessibility. Avoid confusing the browser's native `type=search` clear-X with this **Close** control; provide a deliberate single close behavior. Keep X usable both when Search is in its anchored pop-out and when the field is shown inline, without adding a duplicate search input.
4. **Escape and X should dismiss the search UI, not silently cancel/reset a completed search.** Preserve the typed query and search results when closing/reopening where the current folder/session remains valid; if clearing/resetting is desired, retain a **separately named explicit Clear search action**. If navigation or auth scope changes, use existing safe invalidation behavior rather than retaining stale results for a different folder.
5. **No accidental reparent/overflow disappearance:** If Search is open, responsive toolbar layout must not move it into a hidden More panel on Enter or subsequent render. It may remain an anchored pop-out. Maintain selected folder scope, composition/IME input handling, focus accessibility, and keyboard navigation.
6. After Enter, keep the search field visible even if focus moves deliberately to the results; repeat search without reopening. Do not use the layout-wide `hide()` method as a side effect of a search submission.

## Identified current code behavior to repair

- **`extension/app.mjs`**: `#filename-search-form` submit handler currently checks `input.closest('#toolbar-overflow,#filename-search-popout')` and, when true, calls **`explorerLayoutUI.hide()`** and focuses `#files` **before** `searchDirectoryNames(input.value)`. That is the direct cause of Search disappearing on Enter. Remove that automatic dismissal; submit the API search while leaving Search open.
- **`extension/app.mjs`**: `#filename-search` Escape listener currently calls `clearFilenameSearch()` in some cases. Separate **dismiss** from **clear** to meet the new contract, and avoid double Escape handling with the pop-out keyboard listener.
- **`extension/explorer-layout.mjs`**: `closeSearch()`, `focusSearch()`, search-panel `keydown` handler and responsive reparenting determine whether the pop-out is visible. Add a small explicit close hook reused by X and Escape, keep one source of truth, preserve the established search API and existing shortcut/remapping behavior.
- **`extension/app.mjs`** already has a separate `#clear-search` action; distinguish that from the new Search-bar X Close control.

## Focused acceptance tests (required)

- In one-row Explorer with Search in a **pop-out**, type `photo`, press **Enter** → query runs and Search **stays open**. Press Enter again → search reruns and stays open.
- Repeat with Search visible **inline** and with Search reached from **More/shortcut**.
- Zero matches and API errors do not close Search; `photo` remains editable.
- Click a result or focus the files list → Search remains visible until explicitly dismissed.
- **Escape** dismisses Search; reopening is usable and retains the query/results in the same folder when safe.
- **X** at far right dismisses Search just like Escape; it is keyboard-focusable and screen-reader labeled.
- **Clear search** is separate and intentionally resets query/results rather than just dismissing Search.
- No duplicate forms, no search on each keystroke, no provider upload/write, and no regression to filename inventory, correct cloud folder, Ctrl+Shift+F7 Search shortcut, F8/F9 controls, or right-click saves.

## Scope and handoff

This is a small **next-run Explorer UX fix**. Do not rewrite the search engine, replace the File API, modify Chrome right-click History, or add unrelated cloud/Worker architecture. Implement on a **separate next implementation branch** derived from `codex/click2cloud-0.3.20`; verify Chrome-facing behavior, commit and push the fix, and report the exact commit SHA and focused test evidence.

**Priority:** This new requirement supersedes older search instructions anywhere they suggest Enter may close the Search panel or Escape must silently clear the active search.
