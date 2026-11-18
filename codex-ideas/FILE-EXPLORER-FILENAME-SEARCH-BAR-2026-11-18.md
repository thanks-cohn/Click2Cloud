# Click2Cloud Idea: Filename Search — File API First, GUI Overlay

**Date:** 2026-11-18  
**Status:** Feature proposal — not implemented  
**Area:** Click2Cloud File API + File Explorer  
**Design:** A reusable API function is the feature; the search bar is a small GUI overlay calling it.

**Research-only Codex task:** [Read-only Codex IndexedDB inventory/cache architecture request](../docs/requests/CODEX_READ_ONLY_INDEXEDDB_FILENAME_CACHE_ARCHITECTURE_2026-11-18.md). Codex must inspect and produce a design/decision in its response; it is NOT authorized to edit either repository or run live cloud changes.

## V1 — simple, current-directory-only search

The **first implementation (V1)** is intentionally narrow: search for **file and immediate child directory names inside exactly the directory supplied to the API**. No recursive search, no other directories, no bucket-wide walk, no cross-account aggregation.

The GUI supplies the **currently open Explorer directory** as the API scope and displays matching entries in the existing File Explorer list. It is a presentation layer **over the API function**, not a separate search engine in the UI. **The API always receives an explicit named directory/bucket target**; only the GUI can omit that from what the user types because Explorer already knows the location.

- At bucket root (`bucket/`), search only files and folder names immediately inside that root.
- At `bucket/photos/`, search only files and immediate child folders in `photos/`, **not** `photos/2025/`.
- At `bucket/photos/2025/`, search only direct children of that specific location.
- A folder can appear as a result even if R2 represents it only as a common prefix rather than an explicit folder-marker object.
- Match partial names, case-insensitively by default, including file extensions.
- Support pagination/continuations for large directories, distinguish complete from incomplete search results, and return exact identifiers suitable for existing Explorer actions.
- Search is read-only and must obey authorization, current connection, bucket and prefix boundaries.
- The GUI must invalidate results on directory change, support clear/reset, and show concise empty/loading/error feedback.
- Keep the GUI available in Bit o' Polish, Remote V1 and Minimal; do not tie search behavior to a theme.

### Illustrative V1 API (not implemented)

Adapt the current Click2Cloud File API convention rather than introducing a competing API:

```ts
searchDirectoryNames({
  connectionId,
  accountId,
  bucketName,
  directoryPrefix, // '' = current bucket root, else the exact current folder
  query,           // partial file or immediate child directory name
  pageToken,
  pageSize
}) -> {
  entries: Array<{
    name: string,
    type: 'file' | 'directory',
    keyOrPrefix: string,
    parentPrefix: string
  }>,
  nextPageToken?: string,
  complete: boolean
}
```

**V1 implementation rule:** Only enumerate and match **one directory level** (e.g., delimiter-aware listing). Do **not** download file contents or scan all descendants to answer a V1 search. The GUI is just a small input/results overlay on that underlying API.

### Responsive toolbar: search fills available space before More

**Latest user clarification (2026-11-18):** The current File Explorer toolbar already has the right navigation controls (Back, Forward, Up and Refresh). **Keep those controls intact.** The unused horizontal space **between the navigation controls and the `More` button** should become a flexible **filename search input whenever sufficient width is available**. The goal is to gain search without wasting space or forcing an additional row.

**Examples, schematic only:**

```text
Wide enough (single visible row):
[ ← ][ → ][ ↑ ][ ⟳ ] [ Search filenames................. ] [ More ]

Too narrow for a usable search input:
[ ← ][ → ][ ↑ ][ ⟳ ][ More ]
                     (Search collapses; navigation remains)
```

If the panel is *extremely* narrow, adapt button spacing and overflow gracefully; preserve **Back, Forward, Up and More** as the minimum navigation/overflow controls and retain Refresh wherever possible. Do not compress the search field into an unusable sliver or overlap buttons.

- The **search input is an elastic/flexibly sized element** that occupies leftover horizontal room **after essential navigation buttons** and **before More**. Set a minimum usable input width, test actual text legibility, and hide/collapse the search input first when that minimum is unavailable. When the panel widens, automatically restore the search field without requiring a separate click.
- **`More` remains accessible in the compact state**, including when there is no search bar. Search may be reachable through More when collapsed, but that must not introduce a new permanent row. Keep the existing More action and overflow behavior.
- The current `#location` **Address** input is **not** the desired primary field. Replace its visible toolbar role with a filename search field, and retain any useful Go-to-path/address navigation through a secondary accessible route rather than removing it outright.
- **Enter submits the query** to the reusable File API; typing alone doesn't call Cloudflare or launch a search. V1 searches only the current directory's immediate files and child folders. A future `:nested` or `bucket/directory/child:nested` expression uses this same field and Enter behavior.
- The search must fit without displacing the existing navigation or `More` button and without stealing gallery space through unnecessary toolbar rows. Respect keyboard navigation, focus if the search collapses during resize, theme styling and input accessibility.

**When the user deliberately expands the toolbar to two rows**, retain the existing two-row experience, including **`+ Right Click`** on its established second-row position with **exactly the same action**. Give the search field as much useful width as the expanded layout permits; do not duplicate it in two places. If there is adequate horizontal space even in one-row mode, **show search there as well**—search is responsive, **not exclusively a two-row feature**.

### One-shortcut toggle for toolbar height, independent of responsive search

The Explorer already uses `#toolbar-splitter` with keyboard Up/Down and persisted `toolbarRows` in `extension/explorer-layout.mjs`. Add a **single keyboard shortcut** that toggles its row-height preference between **1 row and 2 rows**, reusing the current layout controller (not a second toolbar engine).

- **Press #1:** 1 → 2 rows. Expanded commands such as **+ Right Click** appear in their established positions; search fills available space near More.
- **Press #2:** 2 → 1 row. Return to compact navigation plus More; **show search automatically if the available width can still accommodate it**, otherwise hide search. Do not force search hidden at all widths.
- Further presses alternate 1 ↔ 2 rows. From a manually configured 3+-row state, first shortcut press may collapse to 1, then next expands to 2. Manual drag and separator arrow keys continue working.
- Keep this shortcut distinct from the **50/50 left/right pane reset** shortcut. Do not change the pane split when toggling toolbar height.
- Avoid Chrome/OS/input conflicts, IME composition, and inadvertent key capture; publish an accessible shortcut hint after verifying the chosen chord. Persist toolbar row preference and restore focus safely after a collapse.
- Browser tests: wide and narrow widths for both row states; auto-appear/disappear of search on resize; stable order Back/Forward/Up/Refresh → Search (when fitting) → More; no overflow/overlap; no duplicate search; unchanged More, + Right Click, manual splitter and right-click save behavior.

**Priority rule if earlier text conflicts:** The latest requirement is **responsive search occupying spare space in a one-row or two-row toolbar**. The one-row layout does **not** automatically ban search. When space is too narrow, it falls back to navigation plus More. This supersedes the earlier fixed rule that search is only revealed at two rows.

### Remove the persistent bottom footer; float Manage Destinations on the left

**Additional user-requested gallery-space refinement (2026-11-18):** The current global app footer in `extension/app.html` is:

```html
<footer>
  <span id="action-feedback" role="status" aria-live="polite" hidden></span>
  <button id="show-save-results" hidden>Review save results</button>
  <button disabled id="manage">Manage Destinations</button>
</footer>
```

**Desired outcome:** **Remove this persistent full-width footer row entirely, releasing its occupied height for the File Explorer gallery and file list.** Avoid replacing it with another always-visible, full-width row or reserving unused footer space.

- **Manage Destinations** remains an ordinary, always-available action when it is functionally permitted, but is rendered as a **small floating/sticky control on the far left**, preferably anchored near the lower-left of the cloud-navigation/sidebar region. It must **not consume a full horizontal row**, obscure image tiles, impede the sidebar/tree or splitter, or block scrolling. Keep the existing `#manage` click behavior, permission gating and keyboard accessibility. When the left pane is collapsed or narrow, give it a responsive unobtrusive placement rather than letting it disappear or cover gallery items.
- **Review save results** (existing `#show-save-results`) is **visible only while Debug Mode is ON**. When Debug Mode is OFF, it must **not be displayed**, including when a routine error or uncertain save would previously reveal the button. It may be placed with debug tools/in the debugging controls instead of in a footer. When Debug Mode is ON, retain its existing action of opening Save results / History. Keep the general History view and its data available by their existing normal navigation; **the button's visibility is what changes, not operation history or receipts**.
- The existing `applyDebugMode` and `quietFeedback` in `extension/app.mjs` currently manage debug state and conditionally reveal `#show-save-results`. Make the **Debug Mode gate authoritative** across initialization, errors, state changes and re-renders. Turning Debug Mode OFF immediately hides the button; turning it ON reveals the debug-only affordance according to the chosen debug layout.
- The footer also currently owns `#action-feedback`, an accessible live status/error region. **Do not discard real errors, warnings, accessibility announcements or safety-critical save uncertainty when removing the footer.** Move required transient feedback to a compact non-layout-consuming toast/status region or another relevant panel with `role="status"`/appropriate live announcement. Keep actionable guidance if a save is blocked/uncertain and retain a non-debug path to inspect History; do not misrepresent failure as success.
- This specifically targets the **persistent app footer** containing Manage Destinations and Review save results. Do **not** accidentally remove File Explorer's own conditional **Load more** pagination button, loading/errors, item count semantics, file selection, or permission/consent notices. Where these can consume gallery height, redesign carefully without making large directory listings inaccessible.
- The freed vertical space should be granted to the **actual gallery/file viewport** (`#files`) in all three appearance themes. Honor safe-area padding, keyboard focus, scroll visibility and popup sizes. No giant overlay or opaque sticky strip along the bottom.

**Acceptance criteria:**

1. With Debug Mode OFF, the File Explorer has **no full-width bottom footer** and **no Review save results button**, regardless of ordinary saves and failures; necessary save warnings still appear accessibly and History still works.
2. **Manage Destinations** is visible near the left edge as a compact floating/sticky button and opens exactly the same Destinations Manager as before.
3. With Debug Mode ON, **Review save results** is available in the debug UI and opens the same results/History destination, without restoring the permanent full-width footer.
4. Narrow/split/one-row/two-row layouts preserve keyboard accessibility, avoid covering file thumbnails, and display **more vertical gallery space** than before.
5. Existing file pagination, feedback/error notices, destructive confirmations, right-click saves and all Explorer actions still function.

**Implementation boundary:** Presentation/layout changes only for this request. Do not modify backend save semantics, receipts, History persistence, cloud authorization, or transfer operations.

### Independent shortcut: restore a 50/50 left/right panel split (mouse-free recovery)

**User request (2026-11-18):** Add **another keyboard shortcut**, separate from the one-row/two-row toolbar shortcut, that immediately restores the File Explorer's **left folder tree and right files/gallery panel to exactly 50% / 50%**. This is especially important if mouse dragging is unavailable, unreliable, or the divider has been pushed so far that a pane is hard to access.

- This shortcut is a **reset command**, not a toggle. Every press sets the horizontal pane split to **50/50**, regardless of its current value (including fully collapsed left/right pane). It must **not alter the toolbar height or row count**.
- Use the **existing `#pane-splitter` and `installExplorerLayout` split preference** in `extension/explorer-layout.mjs`. The current code already supports keyboard Left/Right adjustment and double-click to reset to 50%. The new shortcut should invoke the equivalent `split = 50` operation without requiring mouse interaction, divider focus or manual dragging.
- Persist the reset using the same existing preferences/storage pathway, and refresh the layout immediately without unnecessarily changing cloud state, save destinations, current folder, selections, or files.
- Scope the command to **File Explorer**, and avoid conflicting with Chrome/system shortcuts, normal typing, editable inputs, IME composition, or the separate toolbar-row toggle. Choose and document the actual key chord during implementation after checking existing shortcuts; ideally provide a configurable binding or a visible keyboard-hint in Help/More.
- Keep the existing drag, keyboard arrows, and divider double-click behavior. The shortcut is an extra *accessibility and recovery* path, not a replacement.
- Provide a brief accessible confirmation such as `Panels reset to 50/50` if useful, without introducing a persistent bottom/footer bar or covering the gallery.
- Test from left-pane-collapsed (0%), right-pane-collapsed (100%), off-center (e.g. 20/80), and already-balanced (50/50) states. Test repeat press, reload persistence, narrow widths, keyboard-only interaction, focus safety, and no interaction with the toolbar-row shortcut.

**Purpose:** one immediate, predictable way to recover a balanced folder-tree/gallery layout when the mouse or separator is difficult to use.

### V1 acceptance examples

1. From `bucket/`, query `photo` finds `bucket/photo.jpg` and `bucket/photographs/`, but **not** `bucket/archive/photo.jpg`.
2. From `bucket/archive/`, query `photo` can find `bucket/archive/photo.jpg`, but not `bucket/photo.jpg`.
3. A directory with thousands of direct children is searched correctly across pages, without claiming that a partially scanned page is complete.
4. Changing the currently viewed directory changes the API's directory context; old results never leak into the new view.
5. The same File API operation can be called without the Explorer UI; the GUI does no independent searching.

## Future — `:nested`, explicit directory paths, and the same syntax in the API and search bar (not V1)

**Ordinary searches are local to the directory currently displayed.** Searching for `report` matches file and immediate child-folder names there only. **`:nested ` is an opt-in recursion modifier**, not a directory name or a command that moves the user somewhere else.

When File Explorer is at `bucket/projects/`:

```text
bucket/
  outside/report.txt                    <- excluded; outside projects/
  projects/                             <- CURRENT LOCATION
    report.txt                          <- matches "report" and ":nested report"
    client-A/
      report.txt                        <- matches ":nested report"
      drafts/report-final.txt           <- matches ":nested report"
    client-B/                           <- sibling of client-A, still inside projects/
      report.txt                        <- matches ":nested report"
```

- **`report`** → direct children of `bucket/projects/` only.
- **`:nested report`** → the **entire subtree** rooted at `bucket/projects/`: files and directories immediately inside it and every descendant, **including sibling child branches** such as `client-A/` and `client-B/`.
- **`:nested`** on its own activates nested scope for the current location; a term may then be typed. Empty-query behavior (e.g., paginated subtree browse versus waiting for a term) should be decided explicitly.
- At the **bucket root**, `:nested report` recursively covers the entire bucket. At a nested folder, it **never goes above that folder or into sibling folders of the current folder**.

### Explicit location syntax — a goal for the future File API **and the GUI search bar**

The File API must accept a caller-supplied, **fully resolved location**—unlike the Explorer GUI, it has no implicit current directory. An intended path expression is:

```text
bucket/directory/child:nested
```

That means: **search recursively within `bucket/directory/child/`**, including that folder's direct contents and all descendants. A search term can follow the scope expression:

```text
bucket/directory/child:nested report
```

This path expression is **not API-only**. The **File Explorer search bar should eventually accept it as well**, so users can target a different authorized directory **without first navigating there**. The GUI can either infer the current directory when omitted or accept a user-specified directory path.

| Search-bar input | Resolved target | Scope |
| --- | --- | --- |
| `report` | Current Explorer directory | Immediate children only |
| `:nested report` | Current Explorer directory | Entire nested subtree |
| `bucket/directory/child:nested report` | Explicit named `bucket/directory/child/` | Entire nested subtree |
| `bucket/directory/child:nested` | Explicit named `bucket/directory/child/` | Nested scope, awaiting/showing results according to empty-query policy |

Later, an explicit target without the `:nested` modifier may use the default **immediate-children-only** scope. That syntax should be specified and tested before implementation.

### File API semantics versus GUI shorthand

Conceptually, the API receives a normalized operation such as:

```ts
searchNames({
  connectionId,
  accountId,
  bucketName: "bucket",
  directory: "directory/child/",
  scope: "nested",
  query: "report"
})
```

The textual expression `bucket/directory/child:nested report` is a **convenient command-language representation** of the same structured API request. The engine resolves and validates the target, scope and query independently. Do not interpret the entire command as a literal filename.

**Implementation design requirements for future syntax:**

- Resolve `bucket/directory/child:nested` against the authorized connection; do not allow the path expression to switch accounts or access unapproved buckets.
- Support unambiguous relative paths where appropriate, but avoid guessing between a partial filename and a path. Establish escaping/quoting rules for filenames that contain spaces or colons.
- Apply `:nested` to **all descendants** of the selected root, not to an arbitrary one-branch walk; return exact paths to distinguish duplicate filenames.
- Route both GUI shorthand and explicit GUI paths through the **same File API**, which owns pagination, recursion, cancellation, completeness, session validation and result identity. No parallel GUI-only search engine.
- Keep result loading bounded, report incomplete pages accurately, and invalidate stale results if the search root, query or authorization changes.

### Separation from V1

**V1 remains deliberately simple:** one supplied directory, direct child filenames/folders only, and a GUI search bar calling that API. Recursive `:nested`, explicit inline directory targeting, and `bucket/directory/child:nested` are **future extensions** and must not delay V1.

## Header, debug-only support controls and gallery-space changes — final clarified UI directives

**Latest final placement instruction (2026-11-18): The Light/Dark (sun/moon) switch must ALWAYS remain at the FAR UPPER-RIGHT, on the FIRST ROW of the application header, including at the shelf's DEFAULT window size. It must NEVER be pushed to a second line.** This supersedes earlier conflicting upper-left language. The current `button#theme` appears after the nav in `extension/app.html`; retain its far-right position conceptually and correct the flex/responsive layout so the control has **reserved non-wrapping space**.

**Header layout priorities, in order:**

1. `#theme` (sun/moon) **right-aligned, first row, visible and click/keyboard-accessible** at default shelf size, narrow supported sizes and wider sizes. Do **not** hide it, send it to a new row or allow it to clip.
2. Remotes, File Explorer, History and global More tabs may **shift a little LEFT** and shrink excessive spaces/gaps/padding while **retaining proper, comfortable spacing**, readable/usable controls and tab order. Reduce waste before making drastic compromises. Branding must not collide with tabs; apply compact responsive branding only if needed.
3. Keep the full header **on a single row** at the actual default shelf viewport (not only at wide desktop widths). Do not artificially increase header height, force horizontal scrolling or collapse the sun/moon into a menu. Test computed positions and screenshot at real default shelf width, at narrow supported widths and across Bit o' Polish, Remote V1 and Minimal in light and dark modes.
4. The header `More` is **different** from the File Explorer toolbar `More`. Preserve both menus and their actions.

**Gallery-space and debug controls — implement together:**

- **Remove the permanent app-wide bottom footer** entirely (not merely hide its contents), release its occupied height to `#files` gallery/list, and preserve real save errors, uncertain outcomes, accessible transient status messages, History access and essential pagination.
- **Manage Destinations** (`#manage`) becomes a small sticky/floating control on the **LEFT**, ideally by the lower-left sidebar without blocking tree or gallery. Keep its old action, readiness state and keyboard accessibility, including when left pane collapses.
- **Review save results** (`#show-save-results`) is a **Debug Mode ON-only** button. It never appears when Debug Mode is OFF, even if an operation is uncertain or fails; save errors and ordinary History access must nevertheless remain available. Place it in debug UI, not a reinstated footer.
- Under header **More**, **Help · Diagnose** (`#help-diagnose`) is **visible and reachable ONLY in Debug Mode ON**. When OFF, it is hidden from sight, tab focus and keyboard menu navigation, and cannot be invoked via an already open stale menu. **Settings stays accessible** so users can enable debug.
- In `extension/app.mjs`, centralize the authoritative debug gate via `debugPreference` / `applyDebugMode` and coordinate `quietFeedback`, menu-item visibility, focus and arrow-key behavior. Debug Mode is a UI visibility preference, **not security authorization**. Do not remove underlying diagnostics or receipt evidence.
- Check keyboard navigation and 1-/2-row Explorer toolbar, narrow pane widths, light/dark theme and all three aesthetic options. Test no footer gap, increased gallery height, floating Manage Destinations, no diagnostics buttons outside Debug Mode.

**Scope:** A separately authorized Codex UI implementation may change header/footer/layout and debug entry visibility with focused tests. The filename-cache architecture research and the final cross-repo operations-engine audit remain read-only and must not edit repositories, production storage or Cloudflare resources.

## Delivery boundaries

**V1 is only the direct-children search API with a GUI overlay.** Recursive search and `:nested` are roadmap extensions, not prerequisites to ship V1.

This is documentation only. Do not modify Click2Cloud implementation code, cloud deployments, right-click Simple/Narrow/Depth behavior, Explorer CRUD, current saves, or the Aesthetic API for this note.
