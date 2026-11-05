# Click2Cloud V3+1 — UI-First Scaffold

**Status: interactive presentation scaffold; NO production engine, provider auth, cloud reads/writes, real native Chrome menu registration, or persisted CURRENT records.**

Open `scaffold/index.html` in a browser to explore the interaction. This prototype is the first stage for building the actual **V3+1 right-click engine** using Click2Cloud's existing compiler, CURRENT/REDOWN source references and Universal File API boundary. It is NOT a simulated claim of real cloud saves.

## Product boundary — V3+1 is the engine

**V3+1** is responsible for canonical destination configuration, Simple/Narrow/Depth projection, deterministic menu nodes, the native Chrome context-menu registration/receipts, account-aware click resolution, persistence and recovery. Cloudflare **TRUE REMOTE** is a **provider-specific transport strategy** behind V3+1, NOT the name or architecture of this engine. Google Drive/Dropbox/OneDrive remain independent provider adapters.

## UX contract to implement

1. The Click2Cloud dashboard reuses its own **Universal File API** for a real File Explorer. A user selects a folder; at the top of that Explorer/dashboard is **+ Right Click**. Clicking it opens **one reusable destination editor** for the exact selected account/bucket/prefix. The Explorer may also surface the same command in its local folder context menu.
2. **Popup Setup tab** is always visible and contains only **Menu Title (OPTIONAL)** and a **Simple / Narrow switch**. There is a **Save** button fixed at the bottom, visible for both modes and both tabs; Cancel alongside it.
3. **Simple = one submenu pop-out.** Save an exact folder with an optional menu title; native Chrome **REDOWN → Cloudflare → [saved destination title]** displays one destination leaf inside the Cloudflare submenu, without a hierarchy of folders. Multiple saved Simple options may be siblings; an omitted title falls back to the selected folder/bucket name. When **only the default uncustomized `redown` root** exists, **REDOWN → Cloudflare** is itself an actionable leaf, next to other cloud provider leaves.
4. **Narrow = branches into submenus.** Selecting Narrow INSTANTLY reveals a second popup tab **Menu Titles**. It has **two columns**, top to bottom: actual source bucket/folder segment on LEFT (readonly), corresponding **optional** editable menu display title on RIGHT. It begins at actual bucket, continues through each ancestor, and ends at the exact chosen directory. The Setup Menu Title populates the RIGHT field of the **BOTTOM row**, and changes in that field update Setup bidirectionally. If labels remain blank, use actual segment names in output. Save compiles a natural submenu tree of the configured ancestor path; **not** a single flattened leaf.
5. Switching **Narrow → Simple** makes **Menu Titles disappear entirely** (not a disabled tab). If the user was on Menu Titles, return to Setup safely. Switching to Narrow again reveals it with unsaved draft values preserved; no actual cloud folders are renamed.
6. **Depth** is an independent switch/depth value acting on an already authorized local folder index. It needs no per-folder + Right Click configuration and does not appear in the saved Simple/Narrow list. Mode changes must stay fast and must not automatically rescan R2.
7. A small circular **pointer icon**, aesthetically situated **beneath and toward the RIGHT of the odometer section** in the Click2Cloud dashboard/Shelf-equivalent, opens **Saved Right-Click Destinations**, showing **two independently scrollable, paginated subsections: Simple and Narrow**.
8. Clicking **ANY saved row** reopens **the SAME editor**, prefilled with the record's title/mode and, if Narrow, path-title aliases. The persistent Save button modifies the **existing canonical record ID**, without duplicates; Cancel leaves it unchanged. If the mode is changed, the record moves between sections only after Save.
9. The selected location and its actual path are **immutable** in the popup. Menu titles are aliases for the Chrome menu, never the R2 path or provider identity.
10. The **V3+1 mode-specific native menu projection**, not the editor itself, determines menu depth. The editor must not make new default buckets, upload files, alter OAuth or Worker bindings, or claim a save is verified.

### Native menu shape (examples)

```text
DEFAULT-ONLY (no explicitly saved destinations)
REDOWN
  Cloudflare                 ← one actionable leaf, saves to redown root
  Google Drive               ← independent provider leaf
  Dropbox
  OneDrive

SIMPLE (one pop-out, flat destination choices)
REDOWN
  Cloudflare ▸
    My Photos                ← redown/Art/Photography
    Invoices                 ← redown/Work/Invoices
  Google Drive
  Dropbox
  OneDrive

NARROW (the branch follows the actual selected location)
REDOWN
  Cloudflare ▸
    redown ▸
      Art ▸
        My Photos            ← redown/Art/Photography
```

These are *three separate views* selected by V3+1, not an instruction to display every branch or mode simultaneously. The actual selected folder has the same exact destination in Simple and Narrow.

## Scaffold contents

- `index.html`: standalone visual Explorer/dashboard plus reusable popup and saved-destination manager.
- `styles.css`: styled and responsive layout with keyboard focus/scrolling.
- `app.mjs`: browser-only in-memory demonstration of the required editor workflow. **No network calls, no real cloud credentials, no persistent state, no Chrome contextMenus.** Demo entries are marked as such.
- `README.md`: this architecture boundary and acceptance checklist.

## V3+1 engine build plan (later, not part of scaffold)

1. Replace the static Explorer paths with the existing `src/explorer/index.mjs` (Universal File API) and authenticated host transports; do not build a competing cloud file API.
2. Introduce an editor controller accepting `{location:{provider,accountId,bucketName,prefix,segments}, recordId?}`. If `recordId` is set, load and edit that record, not create a new record.
3. Add canonical transactional CURRENT-backed `saveDestination`, `listDestinations({mode,page,pageSize})`, `updateDestination(recordId,patch,expectedRevision)` and `getDestination(recordId)` methods. Preserve exact IDs, valid ancestry and existing authorized provider scope; page locally without cloud reads. Never persist secrets in the UI.
4. Map the canonical saved entries to existing `src/core/menu-compiler.mjs` via a pure V3+1 projector. Simple is flat **under Cloudflare**; Narrow emits hierarchical ancestor menu nodes; Depth emits the authorized cached folder tree. The default-only direct Cloudflare leaf must not be implemented as a submenu.
5. Render the same effective menu plan in dashboard preview and Chrome native `contextMenus`, with generation+ACK, error and recovery. Ensure actual browser native submenu behavior, not just HTML approximations.
6. Provider dispatch happens **after** exact action resolution: Cloudflare uses Worker URL-fetch → R2 (TRUE REMOTE) with verified R2 receipt; Drive/Dropbox/OneDrive use byte-upload adapters with their own verification. **V3+1 governs menu intent; neither the menu mode nor the popup defines the transfer mechanism.**
7. Test popup visibility, bidirectional bottom title sync, optional blank title fallback, fixed Save position, in-place saved-row edits, independent paging, stable ID/collision handling, direct default-only leaf, true Simple single-depth and Narrow multi-depth, Depth isolation, context menu ACK, worker restart and actual verified upload.

## Source and requirement pointers

- [Latest Explorer + two-tab popup + saved destination UX](../NEED_TO_DO/2026-11-05_EXPLORER_ADD_TO_RIGHT_CLICK_TWO_TAB_POPUP.md)
- [REDOWN CURRENT/V3 source extraction](../FOREVER_WORKS/REDOWN_CURRENT_V3_SOURCE_EXTRACTION_2026-11-05.md)
- [V3+1 Codex execution contract](../FOREVER_WORKS/CODEX_REBUILD_FROM_REDOWN_CURRENT_V3_EXTRACTION_2026-11-05.md)
- [Instant mode-switching requirements](../NEED_TO_DO/2026-11-05_INSTANT_SIMPLE_NARROW_DEPTH_SWITCHING.md)

**Source-of-truth precedence:** This document captures the owner's latest UX wording. Where earlier docs describe Simple as a single global marker, a native Cloudflare leaf with no configured locations, or mistakenly call TRUE REMOTE the "V3+1 engine", use these latest distinctions. Do not claim this scaffold has implemented any engine behavior until actual code and tests prove it.
