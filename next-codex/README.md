# Next Codex — Click2Cloud execution queue (2026-11-18)

**Master implementation request:** [Search/gallery/Manager UX → audited Worker changes → experimental URLs + tags](CODEX_NEXT_EXPLORER_SEARCH_UI_AND_WORKER_IMPLEMENTATION_2026-11-18.md).

## Already changed on this feature branch

- Removed redundant **Toggle one or two toolbar rows (Ctrl+Shift+F8)** and **Reset panels to 50/50 (Ctrl+Shift+F9)** from Explorer More, retaining the underlying keyboard shortcuts: `e314e624`.
- Added a browser regression assertion that those buttons stay absent: `77d4b3c1`.
- These small source changes are **not yet confirmed on the user's installed Windows Chrome**. **Next-Codex must additionally put shortcut references and editable key-binding controls in a dedicated Keyboard Shortcuts card at the VERY BOTTOM of ordinary Settings**, never in Explorer More, with persistent user remapping, collision checks and Restore defaults.

## Next scoped implementation

1. [Search hidden in expanded Explorer toolbar](../Issues_and_Bugs/Bugs/P1_EXPLORER_FILENAME_SEARCH_HIDDEN_DESPITE_EXPANDED_TOOLBAR_SPACE_2026-11-18.md)
2. [Ctrl+Shift+F7 Search pop-out](../Issues_and_Bugs/Issues/P1_EXPLORER_FILENAME_SEARCH_POPOUT_SHORTCUT_2026-11-18.md)
3. [Preview caption removal and double-click file rename](../Issues_and_Bugs/Issues/P1_GALLERY_PREVIEW_REMOVE_CAPTION_AND_DOUBLE_CLICK_RENAME_2026-11-18.md)
4. [Destinations Show in Chrome 3-checkbox row](../Issues_and_Bugs/Issues/P1_DESTINATIONS_SHOW_IN_CHROME_CHECKBOX_ROW_2026-11-18.md)
5. [Editable F8/F9/F7 keyboard shortcuts in bottom Settings card](../Issues_and_Bugs/Issues/P1_USER_EDITABLE_KEYBOARD_SHORTCUTS_IN_SETTINGS_2026-11-19.md)
5. **Implement**, behind separately testable feature flags and strong rollback, the [completed Worker architecture audit](../docs/evidence/ux-filename-search-audit/ARCHITECTURE-AUDIT.md)'s immediate receipt/route fixes and compatible destination-owned adapter architecture. No live deployment merely because of this document.

## Experimental

[Right-click multiple Get/Add URLs with Cloudflare custom domains, directory URL export, and persistent image metadata tags](experimental/CODEX_EXPERIMENTAL_GET_URLS_AND_IMAGE_TAG_METADATA_2026-11-18.md) — new feature, not yet shipped. Experiment flag OFF by default.

**Rule:** Don't conflate documentation with implemented code; report the tested status and commit of every milestone. Protect existing verified saving and avoid unauthorized production Cloudflare changes.
