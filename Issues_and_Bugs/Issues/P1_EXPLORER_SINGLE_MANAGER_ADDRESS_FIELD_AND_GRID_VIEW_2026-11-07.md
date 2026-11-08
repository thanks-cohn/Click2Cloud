# Click2Cloud Explorer UX issues — one Manage Destinations entry, standard location field, Grid view

**Reported:** November 7, 2026 · **Category:** Issues / usability and missing features · **Status:** Implemented in 0.3.11 candidate; owner Windows acceptance pending (see implementation note below).
**Area:** Click2Cloud extension Shelf File Explorer. Not the native web-page context menu.
**Related P0 bug:** [Explorer context-menu latency and responsiveness](../Bugs/P0_EXPLORER_CONTEXT_MENU_LATENCY_AND_RESPONSIVENESS_2026-11-07.md). All UI work here must remain fast.

## User's exact intent

1. **Only ONE visible `Manage Destinations` button** in the Shelf File Explorer: the existing button at **bottom-right**, in the persistent footer. The main Explorer toolbar and Explorer right-click context menu must not repeat it.
2. Replace the current breadcrumb-style location area with a **conventional editable address/location entry field**, showing the full selected cloud folder/file location. When space is cramped, visually **middle-ellipsize** the path, preserving meaningful beginning and last filename/folder, like `C:/location/.../filename.jpg` rather than removing the name. The example is an illustration of *display and truncation style*, **not** an instruction to pretend an R2 bucket is a Windows C: drive.
3. The current `Details / List` view selector must gain **Grid**. Grid shows recognizable icon/thumbnail tiles in a responsive layout with normal keyboard/mouse interaction, selection, navigation and an actual usable file context menu.
4. Every interaction should feel fast, consistent and low-latency. Appearance does not justify expensive blocking work, duplicate controls, or a second engine.

## Source-verified current implementation (reviewed November 7, 2026)

- `extension/app.html` already includes a persistent footer button `<button id="manage">Manage Destinations</button>` positioned on the right. `extension/app.mjs` wires `#manage` to `manager()`. **Retain this one.**
- `extension/app.mjs:renderExplorer` also adds toolbar `<button id="destinations">Manage Destinations</button>` and wires its click to `manager()`. **Remove this duplicate.**
- `extension/app.mjs:contextFor` also adds a folder/background context-menu `Manage Destinations` item. `src/api/explorer-context-menu.mjs:describeExplorerContextMenu` produces its corresponding `explorer.manageDestinations` descriptor. **Remove this duplicate from the built-in Explorer context menu and canonical descriptors**, while preserving other useful folder actions such as `+ Right Click` and `Make Default`. Do not remove the native browser menu's distinct separate configuration action where it belongs outside the Shelf.
- `extension/app.mjs:renderAddress` currently builds an array of breadcrumb buttons into `.address`, each representing an ancestor folder; `extension/app.css` uses `display:flex;overflow:auto` on `.address`. The user wants one entry field with full-path access, rather than many breadcrumb buttons.
- `extension/app.mjs:renderExplorer` currently shows only `Details` and `List`. `src/api/config.mjs:productState` validates `view` against `['details','list']`; `setView` is a saved config change through the trusted `commitConfigChange` API. **Extend this same model/API to `grid`**, do not introduce UI-only or nonpersistent view flags.
- `extension/app.mjs:renderFiles`/`renderWindow` currently use a virtualized HTML table; `extension/app.css` has a simplified List style. Grid needs a grid-aware renderer/virtualization path with preserved file identity, not a massive unvirtualized rebuild.

## I. Single bottom-right Manage Destinations button

**Desired:** With the Shelf File Explorer open, the **only visible Manage Destinations entrypoint is the footer's bottom-right `#manage`**. Keep it appropriately aligned and available, including when not logged in (stored configurations must still be inspectable offline per the separate P0 persistence fix).

- Remove the redundant toolbar button/handler and the redundant Explorer context menu item/descriptor.
- Leave `+ Right Click` (assign selected folder) and `Make Default` (choose exact selected destination) available in appropriate file/folder actions.
- Preserve the existing canonical `manager()`, `getConfiguration`, `listDestinations`, `commitConfigChange` and API permissions. Removing duplicate GUI buttons **does not** remove the programmatic API or saved destinations.
- Do not alter Chrome's native right-click menu's provider/destination rules as an accidental side effect.
- Regression: Search the actual Shelf DOM for user-visible `Manage Destinations` button labels while Explorer is open: **exactly one**, located in footer; menu opened by it displays the same permanent saved destinations and supports edit/Quick/Default/removal safely.

## II. Real location/address entry, complete path and middle ellipsis

**Desired:** A single address input or accessible entry widget in the Explorer toolbar. For example, for a Cloudflare connection with `redown` bucket:

```text
Full logical path:     Cloudflare / redown / photos / 2026 / trip / filename.jpg
At narrow viewport:   Cloudflare / redown / ... / filename.jpg
Actual stored target:  accountId + bucketName:"redown" + exact prefix/key
```

The full, exact, untruncated path must always be available on **focus, selection, copy and edit**. Middle ellipsis is a **visual presentation only**, not an actual `..` traversal segment, modification to object key, or truncated value sent to the API.

- Show full provider/account/bucket/prefix as unambiguous **cloud paths**, not fabricated `C:` Windows-local paths, unless the user actually browses a local-filesystem provider. For a selected *file*, show the exact filename; for a folder, show that folder. Never lose Unicode characters, spaces, punctuation or path separators.
- Support expected address-bar patterns: click/focus to reveal/select/copy the full value; optionally edit and press Enter to navigate to a valid saved/authorized cloud path through `navigateExplorer` and `listFolders`; Escape restores the current location; Back/Forward/Up preserve working behavior. If editing is provided, validate account/bucket scope, normalize legal path segments without mangling object keys, and reject unknown/mismatched/unauthorized targets without changing current selection.
- Implement responsive middle ellipsis based on **available field width**, not arbitrary character truncation alone. Favor beginning and final leaf name; deep paths or tight side-panel sizes still retain the ending file/folder. Provide full path via input's value and accessible description/tooltip; screen-reader text should not contain literal inserted ellipsis instead of the path.
- Synchronize address field immediately after navigation, Back/Forward, folder tree selection, restored Explorer location, rename/move where appropriate, and new selected file; do not trigger cloud network operations simply by focusing or copying the field.
- This is an Explorer navigation UI, **not** an API to mutate a cloud folder's name merely because the user edits path text.

## III. Add Grid to Details / List / Grid

**Desired selector:**

```text
View: [Details | List | Grid]
```

- Grid displays file/folder tiles with appropriate type icons and names; image thumbnails may use safe provider preview APIs with bounded asynchronous loading and a visible fallback. Do not load entire file bytes merely to populate a grid; no all-files download. Respect signed private access and avoid leaking source URLs to other services.
- Single click selects, double click navigates into folders/opens a supported preview, right-click opens the same performant canonical Explorer context menu, Shift/Ctrl multiple selection and keyboard movement work normally. Selection remains stable across view switches, and the current folder does not change on view switch.
- Tiles reflow as Shelf width changes; no horizontal overflow or clipped context menu. Use appropriately responsive, virtualized/incremental rendering for very large folders; prevent main-thread pauses on switch.
- Extend `src/api/config.mjs` product `view` validation and the trusted existing `setView` configuration change to accept `grid` while retaining backward compatibility and previously saved `details`/`list` values. Persist the new view in CURRENT, survive logout/relogin/extension reload, and expose it through `getConfiguration`.
- GUI calls the same trusted versioned configuration API; do not create a separate Grid setting in `chrome.storage.session` or a parallel preferences engine. Update `11.2026/workings/right-click-workings.json` CURRENT and the exact source/API mapping if any source files change; preserve immutable baseline.

## IV. Performance and acceptance constraints

1. The one footer manager button remains discoverable, focusable and operative; no duplicates inside the Explorer toolbar or built-in context menu, including when logged out.
2. Long cloud paths are fully copyable and correct; cramped view visually renders a middle ellipsis but original path is preserved; path input reflects folder/file selection accurately without accidental navigation on edit.
3. Details, List and Grid are all functional; view preference survives restart; file operations and context menu behave identically in all three.
4. Keep Cloudflare TRUE REMOTE saving, canonical File API, destination persistence, folder tree navigation, user-selected Default/Quick entries, permission checks and login unchanged unless explicitly part of a tested fix.
5. UI interactions remain responsive during slow network, R2 list, thumbnail failure, resize, 1,000+ files, and MV3 service worker wake. Use before/after measurements from [P0 performance bug](../Bugs/P0_EXPLORER_CONTEXT_MENU_LATENCY_AND_RESPONSIVENESS_2026-11-07.md).
6. Test the actual installed Windows Chrome extension as a separate acceptance class from unit/browser fixtures. Never claim installed-Chrome/Cloudflare PASS without real evidence.

**Scope:** Click2Cloud Explorer only. Do not modify REDOWN, bucket resources, OAuth registrations, private saved destination data, or the Chrome web-page native menu as side effects. **NO BLOAT · ONE MANAGER BUTTON · FULL ADDRESS · THREE VIEWS · FAST BY DESIGN.**

## Implementation candidate — November 8, 2026

Runtime candidate `97c2806` (0.3.11) implements the production-source repair on `dev/p0-zero-stutter`. See [source findings](../../docs/evidence/zero-stutter/SOURCE.md), [handoff and Windows acceptance](../../docs/evidence/zero-stutter/HANDOFF.md), and [measured fixture comparison](../../docs/evidence/zero-stutter/PERFORMANCE.md). Original observations above are historical baseline evidence. This issue is **not closed as owner-verified**: genuine installed Chrome is blocked by administrator policy, and live new-destination save/readback remains blocked by unavailable existing test-Worker signing authority. Passing fixtures are separately classified.
