# Next Codex — Click2Cloud execution queue (2026-11-18)

**Master implementation request:** [Explorer UX → existing API shortcuts and daily count → experimental URLs/tags/downloads → complete API reference](CODEX_NEXT_EXPLORER_SEARCH_UI_AND_WORKER_IMPLEMENTATION_2026-11-18.md).

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
**Out of scope for the next run:** the previously proposed Cloudflare Worker architecture overhaul (route migration, destination-owned executor redesign, pair-Worker changes and cross-account move redesign). The audit remains historical reference only; existing save behavior must be preserved. Do not add extra authorization/confirmation prompts as part of this removed phase.

## Existing API Command and Shortcut Extension + complete developer documentation

**Single ordered workstream:** canonical command metadata first → shortcut resolver/bindings second → Settings editor third. Do not build these as competing systems or duplicate the feature under two names.

- [Command and Shortcut Extension of the existing V3+1.1 API](CODEX_EXISTING_API_COMMAND_SHORTCUT_METADATA_2026-11-19.md): programmers should be able to bind shortcuts to eligible current/future API operations without a second execution API. Settings is only the GUI editor.
- **Mandatory at the end of next-Codex:** a finished `docs/api/API-COMMAND-REFERENCE.md` with a few explanatory sentences **for every API method** (baseline inspected: 70, recount at final HEAD), its schema/effects/permissions/examples, plus automated exact registry-vs-doc coverage validation. UI-only commands and future screenshot-to-cloud must be distinguished.
- Remotes hero: make **"The Future is Now. True Remote is Here."** the prominent headline, with **"Nothing ever gets downloaded to your computer."** as the subtitle; demote/remove the existing larger "Your clouds, one place." text without changing cloud authority.

## Daily Shelf downloads badge

[Always-visible, midnight-reset, top-right daily download count](../Issues_and_Bugs/Issues/P1_ALWAYS_VISIBLE_DAILY_SHELF_DOWNLOAD_COUNTER_2026-11-19.md) is **requested, not implemented**. Reuse verified History receipts and confirmed local download completions, never attempts. Preserve History and top-right Sun/Moon. Provide count and cloud-vs-local breakdown, correct timezone day rollover and restart recovery.

## Experimental

[Right-click multiple Get/Add URLs with Cloudflare custom domains, directory URL export, and persistent image metadata tags](experimental/CODEX_EXPERIMENTAL_GET_URLS_AND_IMAGE_TAG_METADATA_2026-11-18.md) — new feature, not yet shipped. Experiment flag OFF by default.

**Also requested:** Three distinct image right-click options: **Download**, **Download with Tags**, **Download with All Metadata**, with the original unchanged and a full safe JSON manifest in the all-metadata ZIP. The new variants remain experimental. See section 2C of the experimental URL/tag specification.

**Directory download + presentation:** Both individual files and directories support the two gated optional modes. In ordinary Settings, Show Download with Tags and Show Download with Metadata govern whether the two extra right-click actions appear (OFF until validated); Nest under Download governs direct siblings versus submenu (DEFAULT OFF). Recursive directory ZIP includes file bytes and readable tags/metadata manifest. See experimental specification, section 2D.

**WE GOT THE RECEIPTS — mandatory by default:** Every bulk directory download, including plain, with Tags, or with All Metadata, automatically includes a source-R2-inventory-to-exported-files reconciliation receipt (machine-readable versioned JSON inside completed ZIP; same canonical operation in ordinary History). Show expected vs packaged files and sizes, missing/changed/failed objects, hashes where genuinely verified, and honest local-delivery evidence. **No extra prompt, no opt-in, no separate API and no Worker overhaul.** See experimental section 2E.

**Rule:** Don't conflate documentation with implemented code; report the tested status and commit of every milestone. Protect existing verified saving and avoid unauthorized production Cloudflare changes.
