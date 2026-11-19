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

## Final scope additions — baseline backup, Minimal Remotes and release 0.3.20

- **Pre-implementation rollback baseline:** manifest/package currently **0.3.19**; verified baseline code commit `77d4b3c1df0886cc4b81cefa29b69aa8e2b05b3c`. Suggested **manual annotated tag**: `click2cloud-v0.3.19-pre-0.3.20` (not claimed pushed).
- **Minimal Remotes cleanup:** [hide selected-destination setup and exact Save-unavailable warning; remove duplicate inner Cloudflare heading](../Issues_and_Bugs/Issues/P1_MINIMAL_REMOTES_HIDE_SETUP_AND_DUPLICATE_CLOUDFLARE_TITLE_2026-11-19.md). Keep only `☁ Cloudflare R2` as the Cloudflare card's heading and retain connection status/login/reconnect, existing auth logic and basic features.
- **Future optional agent-ready design:** [API-centered, scriptable-by-design, repeatable API-level test harness, finished programmer documentation, and actual Chrome 0.3.20 release version](CODEX_AGENT_READY_SCRIPTABLE_API_AND_VERSION_0_3_20_2026-11-19.md). Human UI and future authorized automation should share the real file/cloud APIs wherever practical; no premature desktop-control agent, new permission model, gratuitous API layer or unnecessary complexity.
- **0.3.20 is a FINAL BUILT VERSION REQUIREMENT**, not a tag or finished artifact now. Codex must update `extension/manifest.json`, `package.json`, `package-lock.json`, build outputs and actual `chrome://extensions` version on the next implementation branch; keep the current 0.3.19 rollback source untouched.
- **End deliverables:** complete and accurate `docs/api/API-COMMAND-REFERENCE.md` documenting ALL actual methods, quick-start for programmers, invocation/parameter/return/permissions/effects examples, an automated exact registry-vs-doc coverage test, and instructions to run repeatable API function tests.

## New minor fixes (November 19)

[**Four current minor fixes and one future-only multi-cloud UI concept**](../minor-fixes/README.md):

- In the **single-row Explorer toolbar**, use genuine spare width to show the existing Refresh control when it fits, without moving Search unnecessarily.
- Remove the redundant visible **Cloud connections** heading in Explorer; leave the cloud tree and accessibility intact.
- **Image filename rename must be immediate and INLINE** on double-click at the top of preview. **No separate Rename popup.** Enter to commit, Escape to cancel, existing File API.
- **Explorer folder → right-click Make Default must work for ANY authorized folder.** Automatically create/reuse its exact **Simple destination** and make it the default, with no manual mode, path entry or Destinations Manager setup; reuse existing trusted API and confirm actual native menu readiness without claiming success prematurely. No extra user steps when existing authorization suffices.
- **Future only (do not implement now):** connected-provider tabs alongside Cloudflare for eventual multi-cloud navigation.

## Cross-cutting rule — API-first when it actually helps

**The entire project should stay scriptable:** implement tags, URL mappings, directory URL exports, bulk download modes, metadata and machine-readable receipts through the **existing V3+1.1 API / File API where practical**, with useful stable commands and schemas. But **do not add complexity** or fake API wrappers for simple local UI; fulfill the requested behavior exactly. **History remains unchanged**, reserved for existing right-click saves. No blanket six-width/theme/aesthetic/keyboard test matrix; use focused tests that prove the specific requested functionality.

## Existing API Command and Shortcut Extension + complete developer documentation

**Single ordered workstream:** canonical command metadata first → shortcut resolver/bindings second → Settings editor third. Do not build these as competing systems or duplicate the feature under two names.

- [Command and Shortcut Extension of the existing V3+1.1 API](CODEX_EXISTING_API_COMMAND_SHORTCUT_METADATA_2026-11-19.md): programmers should be able to bind shortcuts to eligible current/future API operations without a second execution API. Settings is only the GUI editor.
- **Mandatory at the end of next-Codex:** a finished `docs/api/API-COMMAND-REFERENCE.md` with a few explanatory sentences **for every API method** (baseline inspected: 70, recount at final HEAD), its schema/effects/permissions/examples, plus automated exact registry-vs-doc coverage validation. UI-only commands and future screenshot-to-cloud must be distinguished.
- Remotes hero: make **"The Future is Now. True Remote is Here."** the prominent headline, with **"Nothing ever gets downloaded to your computer."** as the subtitle; demote/remove the existing larger "Your clouds, one place." text without changing cloud authority.

## Daily Chrome extension toolbar icon badge (NOT the Shelf)

[Daily count ON THE EXISTING CHROME EXTENSION TOOLBAR ICON](../Issues_and_Bugs/Issues/P1_DAILY_CHROME_EXTENSION_ICON_BADGE_2026-11-19.md) is **requested, not implemented**. Use `chrome.action.setBadgeText` on the existing pinned toolbar icon, counting verified completions from existing History and resetting at local midnight even when the Shelf is closed. **No Shelf counter or new Shelf header UI.** Preserve existing icon-click functionality; Chrome controls whether an action is pinned.

## Experimental

[Right-click multiple Get/Add URLs with Cloudflare custom domains, directory URL export, and persistent image metadata tags](experimental/CODEX_EXPERIMENTAL_GET_URLS_AND_IMAGE_TAG_METADATA_2026-11-18.md) — new feature, not yet shipped. Experiment flag OFF by default.

**Get URL first-time question for BOTH files and directories:** If no valid public URL mapping exists, ask exactly **`Allow Public URL?` Yes / No**. Yes opens the domain association setup; No leaves everything private. Both object types use the same first-time UI before their normal URL editor/export flow. This is documented in experimental section 2B.

**Bulk Get URL data organization:** Multiple URLs for one R2 file must be grouped under the same unambiguous file/object ID in every CSV, TXT and JSON directory export, and in its receipt. JSON: one file with `urls[]`; CSV: URL rows linked by the same object ID and indexed; TXT: each file header followed by its URL lines. Preserve file count separately from URL count. See experimental section 2B.

**Also requested:** Three distinct image right-click options: **Download**, **Download with Tags**, **Download with All Metadata**, with the original unchanged and a full safe JSON manifest in the all-metadata ZIP. The new variants remain experimental. See section 2C of the experimental URL/tag specification.

**Directory download + presentation:** Both individual files and directories support the two gated optional modes. In ordinary Settings, Show Download with Tags and Show Download with Metadata govern whether the two extra right-click actions appear (OFF until validated); Nest under Download governs direct siblings versus submenu (DEFAULT OFF). Recursive directory ZIP includes file bytes and readable tags/metadata manifest. See experimental specification, section 2D.

**WE GOT THE RECEIPTS — mandatory by default:** Every bulk directory ZIP download, whether plain, with Tags or with All Metadata, automatically contains exactly one comprehensive source-to-archive reconciliation receipt named **`RRReceipt-<time-stamp>-<job-number>.json`**. Each job gets a distinct UTC millisecond timestamp plus stable unique job number/ID. **Receipt exists ONLY INSIDE the downloaded ZIP; never in History, Save Results, Downloads cards, a separate download or a second receipt store. History stays exactly as it is for right-click saving.** No extra receipt prompts, no extra public API and no Worker overhaul. See experimental section 2E.

**More → Downloads (Debug ON only):** a separate diagnostic view with **one expandable card per major download**, prominently showing the directory name, timestamp, mode and status, and additional safe progress/error details when expanded. It may display the receipt **filename only**, never its content. It is not ordinary History, and turning Debug OFF hides it. See [the Debug Downloads issue](../Issues_and_Bugs/Issues/P1_DEBUG_DOWNLOADS_MORE_SECTION_2026-11-19.md).

**Rule:** Don't conflate documentation with implemented code; report the tested status and commit of every milestone. Protect existing verified saving and avoid unauthorized production Cloudflare changes.
