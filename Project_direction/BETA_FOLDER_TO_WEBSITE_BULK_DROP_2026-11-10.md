# Product direction — Explorer multi-select, clipboard, and folder-to-website bulk drop (BETA)

**Date:** November 10, 2026  
**Status:** Future **BETA** proposal, not implemented, released, or guaranteed.  
**Scope:** Click2Cloud cloud file Explorer, using the existing drag-and-drop infrastructure.  
**Related:** [Chutey browser file explorer vision](../directions/chutey-shelf-internet-file-explorer.md)

## Owner's vision

> Pick up one file, a group of files, or eventually an entire folder from Click2Cloud and drop it on a compatible website. Rather than sending only one image, offer every supported image or file in that selection. Also let users select multiple files with Ctrl or Shift, **Copy**, and **Paste** actual files into a website as naturally as with a desktop file explorer. Explore optional ZIP packaging later.

The Explorer should behave like a familiar local file explorer, but across the web and the user's authorized cloud storage. Preview must be optional rather than a prerequisite for file operations.

**Owner-reported current milestone, not independently verified in this document:** an image can already be dragged from the Click2Cloud cloud Explorer into a website **after opening the image in Preview**. Dragging a closed thumbnail directly is not yet working. Protect and reuse the existing successful transfer path; don't create a competing drag engine.

## Interaction specification — multi-selection FIRST

Treat native Explorer selection semantics as a fundamental building block of the future beta:

- **Click** one thumbnail/file row: select that file. **Drag** the selected file from its *closed* thumbnail or row without opening Preview.
- **Ctrl+click** (Windows/Linux) or **Cmd+click** (macOS): toggle individual files in or out of a noncontiguous selection, preserving the other selected files.
- **Shift+click:** select the contiguous range between selection anchor and clicked file, across the currently displayed order; keep the anchor predictable through list/grid changes.
- **Ctrl+A / Cmd+A:** select all files in the clearly defined current scope (current folder/current filtered results as UI indicates); never unexpectedly select every file in the cloud.
- **Ctrl+C / Cmd+C:** Copy selected files for an authorized, supported clipboard transfer; also supply an explicit **Copy files** action.
- **Ctrl+V / Cmd+V** on a compatible website: paste actual image/file content when supported, ideally **multiple selected files together**; not merely a list of text filenames, local filesystem paths, or cloud URLs masquerading as files.
- **Drag any selected thumbnail/row:** drag the complete selected set as a multi-file handoff, not only the one image under the pointer. Visibly indicate the number of files being carried.
- **Click elsewhere / Escape:** use familiar selection/deselect/cancel behavior; don't leave stale transfer states or unexpected clipboard data.
- **Right-click selection:** retain selected items and show Copy / supported file actions; do not destroy a multi-selection by opening its context menu.

These selection behaviors should be consistent in grid, thumbnail, and list views; support keyboard focus and work without first loading full-resolution previews. Names, bytes, MIME types, order and per-file errors must be preserved where possible.

## Two ways to send the SAME selection to a website

### A. Multi-file drag-and-drop — beta

1. Select several cloud images/documents using Ctrl, Shift or Select All.
2. Grab any selected thumbnail or file row, with no Preview requirement.
3. Drag to a compatible website's genuine file drop zone (e.g., a website that accepts multiple file uploads).
4. Reuse the existing authorized byte/file handoff path to present each eligible real file. Do not treat remote URLs or a visual drag alone as proof of successful file delivery.
5. Preflight incompatible types, count, aggregate size, permissions and other known constraints. Make partial rejection explicit and ask before silently omitting user-selected items.
6. Clearly distinguish **files prepared**, **handoff attempted** and **website upload/acceptance verified** (the last cannot generally be determined by an extension).

### B. Copy-to-clipboard and paste — beta, separate compatibility matrix

1. Select multiple files using exactly the same Explorer selection.
2. Choose **Copy files** or press Ctrl+C / Cmd+C.
3. Copy actual transferable file/image data through an authorized clipboard capability **where technically supported**. A plain-text URL list is a separate action named **Copy links**, not a fake file copy.
4. On a compatible website, press Ctrl+V / Cmd+V to paste files/images, ideally all selected items.
5. Recognize browser/OS clipboard API restrictions: image/png clipboard support does **not** imply arbitrary file-list or multi-file native clipboard support. Some websites handle only one pasted image, even if they accept multiple files by drag/drop. Test this distinction per browser/site; do not advertise universal native multi-file clipboard parity.
6. Where direct multi-file clipboard payloads are unsupported, present an honest, explicit alternative such as **Drag selected files**, a user-approved individual-file handoff, or a later *Download as ZIP*. Do NOT silently paste cloud URLs, trigger simulated Ctrl+V events or claim that unsupported clipboard formats succeeded.
7. Minimize temporary storage; obtain bytes lazily following a deliberate user action, protect private cloud data, limit retention, and provide cancel/clear. Handle clipboard overwrites gracefully.

**Key architectural rule:** Selection state is shared by the drag and copy paths; transfer transport may differ because web drag-and-drop and system clipboard capabilities are not interchangeable. Reuse the existing core file-read and staging API, without a second independent transfer engine.

## Folder-to-website bulk drag — later BETA milestone

- User drags an existing cloud folder into an accepting web page. Click2Cloud enumerates the user-authorized files **on demand**, not just because the user browsed the folder.
- Default beta operation is **expand folder to individual accepted files** (particularly images), rather than assume the destination website understands folders or directory trees.
- Support a user-visible preflight: number/estimated size, filtering of compatible files, permissions/authorization, nested subfolders (opt-in or clearly scoped), naming conflicts, target batch limits and unknown compatibility.
- If a website supports only images, offer only selected compatible images after confirmation; if it supports documents, offer supported documents too. Do not guess that a specific third-party website accepts a MIME type or the total batch.
- Preserve privacy: do not unintentionally disclose all children of a private folder. Require explicit user confirmation for potentially large exports, and never send a cloud access token/source URL where actual file bytes are intended.
- No assumed folder acceptance. If browser/site will not accept multiple files, report limits or offer a safe fallback. No claims of successful website upload without actual evidence.
- Allow progress, cancellation and bounded-memory staging; do not freeze the Explorer, preload huge folders, or retain bytes indefinitely. Avoid duplicate handoffs and recursive symlink/path hazards where relevant.

## Optional ZIP mode — later experimental possibility, NOT in first beta

- Consider user-selected **Package as ZIP** to preserve relative folder paths or upload one archive to a site that explicitly supports archives.
- Never auto-zip without the user's consent. ZIP support does not mean the website will unpack or accept it.
- Validate safe paths/names, conflicts, file/aggregate limits, resource use and browser memory constraints.

## Product credibility and stability policy

**Display the name: BETA — Bulk Drag, Copy & Folder Drop.** Keep the experimental capability **opt-in / OFF by default**.

- Existing single-image preview drag must remain reliable and unchanged for people not in the beta.
- Feature flag and independent failure boundaries must protect normal Click2Cloud login/OAuth, cloud navigation, right-click saves, History, and saved destinations.
- No assertion that any website, Chrome build, or clipboard implementation supports multi-file paste without direct testing.
- No false completed-upload receipt: an extension may observe its own file handoff but often cannot inspect third-party upload acceptance.
- No silent browser disk fallback for Cloudflare **TRUE REMOTE right-click saves**. Explicit user-directed drag/copy transport is a separate boundary and should be represented accurately.
- Respect provider privacy: remote file listing/reads require appropriate authorization; send only the user-selected bytes/names and necessary transfer metadata to target websites, not cloud tokens.
- API-first, one-to-one operation parity, no new parallel transport engine, no destructive state reset, no premature implementation promise.
- This document records **direction only**. Do not start shipping beta code based solely on its existence; stability and current P0 work retain priority.

## Measurable acceptance criteria before broad availability

1. Direct drag from a **closed thumbnail** to a compatible test drop zone works, while Preview drag remains functional.
2. Ctrl/Cmd-click toggles individual files; Shift-click selects contiguous ranges; Ctrl/Cmd+A works within a visible, defined scope.
3. Dragging one selected item with 2, 10, and 50 selected files carries the correct set. Verify real bytes, correct filenames, no phantom items, and per-file error reporting at a controlled receiving fixture.
4. Ctrl/Cmd+C and Ctrl/Cmd+V paste actual file/image bytes **where supported**, including multiple items only when both browser clipboard and target website genuinely support it. Clearly surface limitations elsewhere; never fake success.
5. Copy and Drag share the same selection snapshot: no stale selection, accidental extra files, or automatic background export.
6. A folder with images, documents and unsupported files produces accurate preflight and only user-confirmed compatible file handoffs; test empty folders, nested folders, duplicate basenames, large groups, cancellations and unavailable cloud reads.
7. No Explorer stutter/resource spikes, no auth/session breaks, no regressions to normal single-file drag and normal provider saving.
8. Document a **browser × target-site × mode (drag or paste) × file-count** compatibility matrix, distinguishing real site acceptance from local synthetic test coverage.

**Long-term goal:** Cloud files should be usable with the same instinctive keyboard shortcuts and drag gestures as ordinary local files, while remaining technically honest about website and browser boundaries.
