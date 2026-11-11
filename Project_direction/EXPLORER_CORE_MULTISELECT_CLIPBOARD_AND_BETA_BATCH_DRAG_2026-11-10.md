# Click2Cloud project direction — Core file selection and external clipboard; beta batch drag, folders and future ZIP

Date: 2026-11-10
Status: **OWNER DIRECTIVE — product requirements / roadmap, NOT implemented or verified by this document**
Repository: thanks-cohn/Click2Cloud ONLY
Scope: Click2Cloud cloud File Explorer and existing cloud-to-browser file handoff. Keep REDOWN untouched.

## Crucial classification: CORE versus BETA

**CORE / NECESSARY / CONTINUOUS DEVELOPMENT — NOT BETA:**
1. Native-file-manager-like **multi-file selection**: plain click, Ctrl-click to add/remove nonadjacent files, Shift-click to select ranges, and appropriate keyboard selection shortcuts, using a deterministic selection model.
2. **Real Copy command and Ctrl+C** for selected cloud files, **using the operating-system/browser clipboard**, not merely Shelf-internal state.
3. **Paste outside Click2Cloud** with Ctrl+V into a different website/application when the receiving target supports the clipboard's actual file/image MIME format(s). Do not misrepresent copying a URL, filename or a Shelf-private selection as file clipboard copy.
4. It must work consistently for ordinary everyday use across navigation, selection, preview and permitted browser contexts. Treat correctness, graceful failure, recoverability, performance and clear capability reporting as core acceptance gates. Do not mark these as experimental or postpone indefinitely behind folder drag.
5. Direct thumbnail/list-row dragging without first opening a preview is core Explorer usability. A readily usable in-Explorer filename search bar is also an expected foundational feature.

**BETA / FUTURE / OPT-IN OR CLEARLY BETA-LABELED:**
1. Drag **multiple selected files in one gesture** from cloud Explorer to an accepting website (as opposed to the reported existing single-file handoff).
2. Drag a **folder** into an accepting website, expanding it into its eligible individual files for a batch handoff.
3. Later: packaging/dragging selected files or folder contents as **ZIP** when appropriate.

**The BETA label covers the new bulk drag/folder/ZIP transport, not basic selection and Copy/Paste.** Do not market the core capabilities as optional curiosities. Also do not claim anything is already implemented merely because this direction has been documented.

## Context and owner-observed shortcomings

- Owner reports Click2Cloud already successfully drags an individual cloud file/image into a browser website. Preserve that working implementation; do not build a second drag engine.
- Present bug: the image is draggable only AFTER opening its Preview; the same image cannot currently be dragged directly by grabbing its closed Explorer thumbnail/tile. Make closed thumbnails and file rows useful drag handles.
- Owner wants a visible search bar in the cloud Explorer, analogous to REDOWN's existing file search, to discover files without manual folder traversal.
- Owner insists **Copy** works beyond the Shelf and can transfer files through an actual clipboard into external sites, not just relocate content inside Click2Cloud.

## CORE requirement A — selection semantics and keyboard behavior

- Plain click selects one item. Ctrl-click toggles individual additional items, including nonadjacent ones. Shift-click selects a contiguous range between stable anchor and clicked item in the current ordered view; Ctrl+Shift adds an explicit range according to platform conventions.
- Ctrl+A (when Explorer has focus) selects all eligible files in the clearly indicated current selection scope; do not hijack page/browser Select All. Keyboard focus, Space, arrow keys and accessible selection announcements must work coherently.
- Selected files must be visually distinct with selection count, bounded resource usage, clear-deselect action and consistent behavior across list/grid views, pagination, search and sorting. Do not secretly select records outside the declared scope.
- Preserve IDs for selected items across harmless UI changes; do not substitute a different file after sort/filter/navigation. On navigating to a different folder, follow an explicit documented persistence/clear-selection policy.
- Single click selects, double click previews, and pointer drag beyond a movement threshold initiates existing handoff. Dragging a selected item must not accidentally clear the rest of the selection.
- Build one canonical selection-state and file-manifest API consumed by both Copy and Drag; GUI must call it. Avoid a parallel UI-only transfer engine. Never eagerly download all selected file bytes just to show thumbnails or maintain selection.

## CORE requirement B — genuine external clipboard Copy/Paste

- Explorer context menu includes **Copy**; Ctrl+C with focused selected files performs the same action. Copy must be available for one file and for multiple selected files.
- Put **real usable file/image payloads** on the OS/browser clipboard when permitted, so a user can leave the extension and paste into an accepting target, such as a website's attachment/paste surface. This is explicitly NOT a Shelf-only clipboard, copied link list, names-only text or synthetic internal paste.
- Respect clipboard/browser constraints, user gestures, maximum sizes and accepted formats. File clipboard payloads, multiple distinct files and arbitrary MIME types are **not universally supported through standard web/Chrome extension Clipboard APIs**; investigate exact Chrome/Windows limits rather than assuming they work. Where the web platform cannot produce true multi-file clipboard interoperability, design and validate a safe opt-in native-desktop bridge if necessary, with explicit install/permissions/security, or state the limitation transparently while working toward the mandatory outcome.
- **The CORE requirement does not authorize false claims of universal paste compatibility:** the destination website or application ultimately controls whether it handles pasted data, especially multiple files. Build a test matrix for actual paste targets (ChatGPT, Google, Yandex and representative editors) and report support/unsupported combinations. Do not fabricate clipboard or paste events to bypass their security model.
- If the clipboard API cannot represent every chosen file, do **not** silently put only the first file, plain-text URLs, or filenames on the clipboard while saying “Copied N files.” Report what actually reached the system clipboard; offer an explicit secure alternative (e.g. native bridge or drag) without mislabeling it as completed.
- Use lazy, bounded, authorized cloud reads, preserve filenames/types/order, avoid unbounded memory usage, and handle access expiry, cancellation, partial reads, storage budgets and temporary staging cleanly. The user must be able to cancel.
- Do not expose authenticated cloud URLs, temporary bearer URLs, source-page URLs or credentials to outside sites as an invisible fallback.
- Make external clipboard behavior dependable, not fragile: no stale clipboard from previous selection masquerading as current, no success before actual write, no lingering staged file blobs beyond the declared retention policy.

## CORE requirement C — direct drag from a closed thumbnail and file search

- A file tile, image thumbnail, icon or row is a legitimate drag source even if the Preview is never opened.
- Single click selects; double click previews; user drag directly starts the existing cloud-to-browser transfer engine. Preserve verified existing single-file functionality and avoid preload storms.
- Add fast Explorer search above the file listing. Search filenames in the current folder and, where genuinely supported, optionally All folders; clearly label scope, permissions, stale indexes and paged coverage.
- Selected search results can be copied or dragged with their real identities/paths. Keep first input paint fast, cancel stale queries and do not block UI on full cloud listing.

## BETA requirement D — multi-file drag as one payload

- Shift/Ctrl/core selection produces a manifest that can **also** be handed to the beta batch-drag transport.
- Dragging the selected group from any selected thumbnail/row to an accepting site should offer every eligible actual file, not just a representative image or a list of URLs.
- Not every website accepts multiple File objects or a drag payload in the same manner; validate actual browser DataTransfer / file handoff capabilities, receiving-site restrictions and user activation. A synthetic drop is not proof of acceptance.
- Enforce bounded concurrency, per-file byte limits, overall batch byte/file-count budgets, retries that are safe from duplicate handoff, cancellation, and lazy byte resolution. Per-file statuses must distinguish eligible, rejected type, oversized, unauthorized, unavailable, prepared, dispatched and (only if observable) accepted.
- Show a clear **BETA** designation and truthful compatibility note on multi-file/folder drops; preserve stable single-file drag when a target is incompatible.

## BETA requirement E — folder drag expands eligible contents

- Support selecting and dragging a folder from Click2Cloud Explorer, with a confirmation/preview of what will be offered to the destination (file count, total known size, types, omissions).
- Safely traverse authorized cloud folders with explicit bounded depth, pagination, symlink/cycle protections where relevant, rate-limits, cancellation and partial/inaccessible subtree handling.
- **Primary desired mode:** On a website accepting multiple uploads, hand off the eligible files individually as a batch (for example, images that satisfy site's accepted MIME types), preserving a clear account of skipped/unsupported types.
- Do not claim that dropping a folder into a website can force the site to recurse or accept file structure. Some targets allow folders, some only individual File objects, and some only one file; support is receiver-controlled.
- Do not automatically zip as an unannounced fallback. A later distinct **ZIP bundle** mode may package selected files or full folder contents when the target accepts an archive, with explicit user choice, privacy, filenames/path safety and progress reporting.
- Never upload more files than the user explicitly chose/approved; private cloud files remain user-controlled. No silent bulk export on hover or click.

## Architecture, performance, and credibility

- Continue API-first: one canonical Explorer selection/manifest, clipboard export and batch handoff API; UI calls these, and each operation has states, error codes, observability and deterministic cleanup.
- Reuse the already working cloud-to-browser handoff. Keep CORE Clipboard interoperability separate from BETA drag, but share the file resolver and permission model.
- Preserve fast Explorer responsiveness: avoid heavy work during selection, right-click first paint, search typing or view changes. Stream on demand; stage only within bounded memory/storage quotas.
- Explicitly distinguish three outcomes: **selected**, **prepared/transferred into clipboard or drag payload**, and **accepted by the external website**. Do not invent website acceptance confirmations.
- Document an honest support matrix for Windows Chrome and target applications; if native assistance is needed for reliable external multi-file clipboard, require explicit user consent.
- Label experimental folder/batch/ZIP drag **BETA** in applicable UI/docs; stable core selection/copy need not carry a BETA label. Do not make claims of zero risk or universal target support.
- This is project-direction documentation only. No implementation, testing, live cloud access, cross-repo changes, or implicit release approval is conveyed.

## Phased build and acceptance

**Core must be continuously worked toward and not dismissed as beta:**
1. Consistent Shift-click range, Ctrl-click toggle, keyboard selection, multi-file selection state and selection counter under list/grid/search.
2. Copy command and Ctrl+C actually place one and multiple files into external clipboard **where supported**, with observed outcome and explicit unsupported limitation when not.
3. Ctrl+V on representative accepting websites demonstrably works with real clipboard file/image payload, without first opening Preview and without internal Shelf clipboard. Test real Windows Chrome, not only synthetic tests.
4. Single-file thumbnail/row drag without preview, without losing existing Preview-based drop functionality.
5. Fast in-Explorer filename search.

**Beta milestones, separately gated and labeled:**
6. Multi-file drag exports a selected set, and reports per-file outcomes without assuming target accepted it.
7. Folder drag enumerates and offers all eligible files within safe resource limits, with user-confirmed scope and truthful target compatibility.
8. Later opt-in ZIP packaging / ZIP drag, with robust resource and privacy controls.

Owner priority: Native-file-explorer behavior should be fundamental and dependable; do not sacrifice stable single-file/cloud interaction or performance for ambitious batch/folder export.
