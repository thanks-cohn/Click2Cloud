# P1 — Preview/gallery cleanup and double-click filename rename

**Reported:** November 18, 2026  
**Status:** REQUESTED / NOT IMPLEMENTED.  
**Scope:** Click2Cloud Shelf → File Explorer → image preview/gallery dialog.

## Requirements

1. **Remove** the unnecessary visible gallery-controls copy **"Images in this loaded folder"** including the trailing "more files may be loaded in Explorer" line from the preview/gallery area. **Keep Previous and Next arrows**, disabled states and real keyboard navigation. If information about partial folder loading is genuinely needed, communicate it via a small accessible state elsewhere, not the persistent decorative caption or a wide blank spacer.
2. **Double-click the file name at the top of the preview dialog to rename it.** It should enter an unobtrusive editable filename state, prefilled with the object's actual current basename (preserve extension/whole key appropriately). Let Enter submit; Escape cancel; show pending and verified/uncertain outcomes and name conflicts. The rename must call the **existing trusted File API `fileActionGUI('rename',entry,origin)` / canonical rename path**, not an unverified client-only label edit. It must not silently rename merely from a click.
3. The preview title may be implemented as a focusable button that also supports keyboard-triggered rename (Enter/F2 as appropriate), with explanatory accessible label. Preserve dialog close/back, downloaded preview blob, image navigation, gallery position and source identity. **Do NOT open a separate Rename popup/modal or any secondary name dialog.** Double-clicking must immediately edit the existing filename INLINE, then Enter commits via the canonical File API and Escape cancels. Show conflicts adjacent to the filename, and prevent stale image selection/wrong-object actions if the user switches gallery items during the request. See [minor fixes: inline rename](../../minor-fixes/IMAGE_RENAME_INLINE_NO_POPUP.md).
4. Changes to file name must invalidate/reconcile affected parent IndexedDB directory inventory and refresh the displayed object after verified rename. Keep original if failed/uncertain; do not claim success when a remote effect has not been independently verified.
5. Verify source identity, collisions, Unicode filenames, navigation while editing and focused rename keyboard behavior. Do not require repeating the same tests across every theme.

## Current code evidence

- `extension/app.mjs` `galleryControls(e)` currently generates `<span>Images in this loaded folder...`; `openEntry(e)` opens `dialog(e.displayName??e.key, ...)`, placing the name in `#dialog-title`.
- `extension/app.mjs` `fileActionGUI('rename', entry, origin)` already exists as a context-menu mutation and uses the canonical File API `fileAction` operation. Reuse its validation, errors, setup authorization and receipt semantics rather than building a new rename transport.
- The preview's `ArrowLeft`/`ArrowRight` gallery handlers explicitly ignore text inputs; preserve this while renaming.
- No direct image-byte edits or EXIF changes are requested here. Metadata/URL/tag editing belongs to [the separate experimental proposal](../../next-codex/experimental/CODEX_EXPERIMENTAL_GET_URLS_AND_IMAGE_TAG_METADATA_2026-11-18.md).

**Linked next run:** [next-codex master](../../next-codex/CODEX_NEXT_EXPLORER_SEARCH_UI_AND_WORKER_IMPLEMENTATION_2026-11-18.md).
