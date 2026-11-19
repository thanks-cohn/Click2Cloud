# P1 — Dedicated keyboard shortcut to pop out and focus filename Search

**Reported:** November 18, 2026.  
**Status:** OPEN — next Codex implementation requested, not implemented at `1f366aa`.  
**Related installed-Chrome screenshot bug:** [Search hidden despite room in two-row toolbar](../Bugs/P1_EXPLORER_FILENAME_SEARCH_HIDDEN_DESPITE_EXPANDED_TOOLBAR_SPACE_2026-11-18.md).

## Requested behavior

Users must be able to make the filename Search field **pop out and receive keyboard focus instantly**, even when responsive layout places it in Explorer More.

- **Proposed default shortcut: Ctrl+Shift+F7**, alongside default Ctrl+Shift+F8 (toolbar rows) and Ctrl+Shift+F9 (reset 50/50 pane split). These are all **user-remappable from the final Keyboard Shortcuts section in Settings**, using one shared shortcut registry. Validate conflicts with Chrome/Windows before finalizing; use and document a safer default chord if required. See [Shortcut Settings requirement](P1_USER_EDITABLE_KEYBOARD_SHORTCUTS_IN_SETTINGS_2026-11-19.md).
- When Search is already inline and visible, focus its existing input. When hidden, show an accessible, compact search popover anchored to the Explorer toolbar and focus the **same Search form** immediately, no extra click or forced toolbar/upper-header row.
- Enter runs the existing current-directory `searchDirectoryNames` File API with persistent IndexedDB. Typing does not trigger cloud queries. Escape closes the popover and restores focus without silently clearing the typed query or search results. Clear explicitly resets the search.
- Preserve one authoritative search input and handler, existing query and selected folder scope, accessibility label, IME focus, and source/session fencing. No duplicate search engine or duplicate form.
- Do not intercept the shortcut in text controls, dialogs, open menus, or outside Explorer; retain the existing F8/F9 shortcuts and the top-right first-row theme switch.
- Add Chrome Shelf browser tests for inline, hidden, pop-out, repeated open, Enter, Escape, switching folders, account changes, narrow and wide, 1/2 toolbar rows, all themes, and no provider calls before Enter.

## Implementation guidance

`extension/explorer-layout.mjs` already owns the 1/2-row layout, Search reparenting and F8/F9 shortcuts. `extension/app.mjs` creates and handles `#filename-search-form`. Extend that one presentation flow rather than creating a second search pathway.

**See planned implementation:** [next-codex UX + Worker follow-up](../../next-codex/CODEX_NEXT_EXPLORER_SEARCH_UI_AND_WORKER_IMPLEMENTATION_2026-11-18.md). Treat this as a UI task, independent from the Worker migration.
