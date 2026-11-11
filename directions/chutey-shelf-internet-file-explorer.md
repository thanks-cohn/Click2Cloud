# Direction: The Internet as Your File Explorer — Chutey Shelf in Click2Cloud / REDOWN

**Status:** Foundational product direction. **Core Explorer multi-selection, copy/paste and multi-file drag are REQUIRED ongoing engineering goals**, not beta features. Future folder-to-website drop and ZIP packaging are separate opt-in experiments; implement the core safely alongside existing P0 priorities.  
**Date:** 2026-11-10

## The vision

> Imagine if the file explorer **was the Shelf**, and you could do everything an ordinary local file explorer does, but with the internet. The browser and internet become your domain and interface. You are free to drag, drop, select, copy, and move things between locations.

Bring the full **Chutey-style file explorer experience** into Click2Cloud / REDOWN. Make the Shelf a true working surface for files on the web, not just a history tray or cloud destination chooser. The user should perceive one coherent workspace spanning browser pages, local files (when authorized), and connected clouds.

## Essential interactions

- Drag images and other supported files **from browser pages into the Shelf or an exact cloud folder**. The drop target determines which provider, bucket, folder, or path receives the file.
- Drag files **out of the Shelf and connected cloud explorers** and into compatible websites and browser apps, such as ChatGPT, Yandex, and Google services; also support the reverse direction where possible.
- Drag and drop **between connected clouds, cloud folders, and local destinations** (when authorized), with clear copy-vs-move semantics.
- **REQUIRED CORE, CONTINUOUS WORK:** Multi-select many images and files with ordinary explorer gestures (Ctrl/Cmd-click toggles, Shift-click range, Ctrl/Cmd+A Select All). Drag an entire selection to a compatible website using actual file bytes, directly from closed thumbnails/rows without opening Preview. Preserve existing working single-image preview drag.
- **REQUIRED CORE, CONTINUOUS WORK:** Copy selected images/files using Ctrl/Cmd+C or Copy files; paste the selected actual files/images using Ctrl/Cmd+V into compatible websites, apps, or destinations. This must be pursued as a regular Explorer feature, not treated as beta. Preserve the precise selection and real bytes/filenames; explain browser/site clipboard limits, especially multi-file clipboard restrictions, without silently substituting links or filenames for bytes. Explore Copy, Cut, Paste, Copy as image, and Copy files as distinct actions.
- Preserve familiar explorer basics: browse folders, thumbnails, previews, keyboard navigation, rename, create folder, copy/move, delete, selection, and visible progress with undo/recovery where feasible.

## Necessary core operations versus experimental folder transfer

**Owner priority clarification (2026-11-10):** Desktop-like Ctrl/Cmd/Shift selection, selecting many files, actual file Copy and Paste into compatible websites, and dragging multiple selected cloud files to websites are **essential features that Click2Cloud must consistently work toward and improve**. They are NOT optional beta-only enhancements. Direct thumbnail drag without opening Preview is also a core usability requirement.

The optional **BETA** applies specifically to dropping an **entire cloud folder** onto a website and expanding its acceptable children as individual files, with user-visible compatibility filtering and confirmation. ZIP/package transfer is an even later experiment. Neither should hold back implementation, testing or refinement of required core selection, copy, paste and multi-file dragging.

See [Detailed requirements — core multi-select/copy/paste and beta folder drop](../Project_direction/BETA_FOLDER_TO_WEBSITE_BULK_DROP_2026-11-10.md). The filename uses BETA because it documents the *folder* experiment; it must never be interpreted as downgrading the selection/clipboard/multi-file operations to beta.

## A second pathway beyond perfect right-click integration

Right-click remote saving remains important, especially Cloudflare R2 **TRUE REMOTE**, but **must not be the only way to use a provider**. If a provider offers safe authorized listing, read, and write APIs, the explorer can still let a user open folders and explicitly drag/copy files to and from them—even when right-click save integration is incomplete.

This is not permission to claim unsupported providers are working. Provider-specific capabilities must be detected and represented honestly; OAuth scopes and authorization for listing/reading/writing may differ. A user who is signed in is not necessarily save-ready.

## Design and architecture principles

1. **Shelf = explorer, not a separate afterthought.** Keep Chutey's coherent navigation, selection, preview, and drag/drop mental model.
2. **One-to-one GUI/API parity.** Every core action—select, enumerate, read, copy, paste, upload, download, transfer, inspect job status, retry—must have an underlying testable operation wherever technically possible; GUI consumes those operations.
3. **Drop intent is unambiguous.** Highlight the precise destination folder. Validate provider permissions and effective destination before bytes move; show explicit receipts and actual verification before declaring success.
4. **Respect privacy.** Do not send browser page/source URLs to a storage provider as file metadata; transfer only the required bytes, name/type and path information. Handle private cloud reads with limited-time credentials and no unintended exposure.
5. **Bridge technical boundaries honestly.** Clipboard APIs, native file drags, cross-tab drags, and website drop zones have browser/OS restrictions. Prototype and test compatibility by browser and target site. A browser extension may need a narrowly scoped native Chutey companion for OS-level file clipboard/drop capabilities. Never pretend a drag or clipboard transfer occurred if only a URL was copied.
6. **Treat bulk operations as first-class.** Multiple selections, queueing, progress, cancellation, retries, conflict handling, and memory-safe streaming or temporary staging where needed. Preserve verified Cloudflare true-remote semantics; do not silently download data through the browser and call it true remote.
7. **Do not bloat.** Build toward familiar, dependable basic interactions before adding visual spectacle or rare advanced features.

## Commercial direction

The ambition is to become **fundamental infrastructure for how people handle files across the browser and the internet**, not merely a shortcut for saving downloads. Selecting a large group of images, copying them to the clipboard, and depositing them exactly where wanted should feel as basic and reliable as using a desktop file explorer.

This everyday utility is the justification for a **$12/year introductory/founder bundle**: users pay for a reliable workflow they use constantly, rather than a feature they occasionally remember exists. This is a product hypothesis to validate with real users, not a proven willingness-to-pay claim.

## Suggested validation

Prototype the smallest end-to-end sequence: select many cloud images in the Shelf → bulk copy/drag → paste/drop into a compatible web app → verify real file bytes, filenames, selection order, and error reporting. Independently test browser image → exact cloud folder via drop. Document browser and site limitations and compare results against Chutey's existing behavior.

**Core multi-select, copy/paste and multi-file drag are mandatory ongoing product work, to be engineered and tested safely without interrupting existing P0 reliability priorities. Only whole-folder drop and possible ZIP packaging remain future experimental beta directions.**
