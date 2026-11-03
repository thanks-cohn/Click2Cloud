# Codex request — Standard V3+1 Destination Manager with independent multi-alias rows

**Target branch:** `feature/original-vs-assisted-depth-proposals`. **Scope:** `destination_manager/` UI and neutral interfaces. The actual menu engines retain separate private configuration and projection modules.

Implement the owner's [Manager specification](README.md), based on [the pure reference model](src/manager-model.mjs) and [tests](tests/manager-model.test.mjs).

1. Primary top switch `Simple | Narrow | Depth`. Simple and Narrow display the same standardized file-directory tree with subtle indentation, left circular Add/select controls, separate expand chevrons, and no Browse-folders prerequisite.
2. Secondary `Browse Folders | Existing Destinations` view appears only in Simple/Narrow. Existing Destinations is an aggregate **read-only list** across both modes with owner badge, exact path, editable title and **red ×** delete action. Each mutation is routed to **only the owning mode config** with expected revision; X deletes one saved entry, not remote data.
3. A folder's circle opens a small menu-title popup with an optional blank title (lowest directory by default), bucket-name option or typed custom title, preview and Add/Cancel. A circle remains available after 1/2/100 aliases exist; show count if useful. NEVER use it to remove all aliases ambiguously.
4. The same exact folder can have unlimited separately stored destinations (subject native Chrome capacity) under different **or identical displayed labels**, including multiple entries in the same mode. Each entry has its own stable immutable UUID/opaque ID; registry IDs include mode namespace. **DO NOT dedupe by title, path, bucket or menu-mode.** A duplicate display-title confirmation may be offered, but **must be allow-able**. Rename changes only the chosen record's title; X deletes only that record.
5. Simple produces flat menu leaves; Narrow produces the chosen ancestor branch with only terminal label customized. Their configs do not import, call or write one another. A shared tree is an **editor/read interface**, not a Depth index. Only active mode is registered in Chrome.
6. Switching to Depth completely hides tree, popup and Existing Destinations. Show only bucket checkboxes and depth number 1..10 plus Apply; no folder selection or custom labels.
7. Preserve per-mode drafts across switching and commit only on `Save Changes/Apply`; Chrome native registration acknowledgement is separate. Do not claim success early.
8. Preserve Simple-only Cloudflare login/R2 gate and automatic `redown` default under `simple/original_proposition/`. Preserve Depth's independent max-depth graph/journal and Time Machine separation.
9. Test 2 identical labels+paths, 3 aliases across both modes, rename one, remove one, immutable ID and exact prefix resolution, no cloud deletes, nested tree indentation, Depth hide-all, restart, stale native IDs, registry ID collisions and real Chrome capacity. Report source/test receipts and remaining installed-browser gaps. No production REDOWN transplant without owner authorization.

Do not silently merge PR or edit production REDOWN as part of this isolated manager task.
