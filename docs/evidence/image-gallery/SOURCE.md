# Explorer image, layout and Remotes repair — source findings

Base: main `80b8e14` (November 8, 2026); development branch `dev/explorer-image-gallery`, extension 0.3.12, unchanged ID `ajppphdiamdobknpamcheohmdbdbeoal`.

## Inspected owners and causal findings

The pre-edit API/GUI audit traced `extension/app.mjs` → existing `readFileChunk` registry entry → authorized File API `readChunk` → R2 range validation → inner File API result → outer typed result → Shelf Blob/decode. Existing `listFolders`, `fileMetadata`, `getConfiguration`, `commitConfigChange`, `makeDefault` and `clearDefault` already own meaningful data/configuration operations; no new image/gallery backend is necessary. Layout is the only new durable preference and extends the existing closed configuration schema.

1. **The literal OK error is reproducible from source.** `createFileApi.run` catches an adapter error as `{state:'failed',error:...,code:undefined}`. `service.mjs` correctly propagates failed state but used `data.code ?? 'OK'`; Shelf `api()` throws that code and the former preview catch rendered it. Read failures now obtain a bounded actual code from an existing code-shaped error or `FILE_READ_FAILED`; failed code `OK` is rejected too. The underlying failure remains inspectable. This proves an error-envelope defect, not that the owner's cloud bytes are healthy. The read-only check at the existing redown root returned 404/NoSuchKey. A subsequent metadata-only listing examined 190 objects in that configured bucket, with zero exact basename matches. No unrelated object contents or other buckets were scanned and no writes were done. Exact live object contents remain unverified.
2. **Grid contained no images.** It only emitted folder/document emoji. It now lazily obtains actual object bytes through the same read API, validates range/identity, reads supported image signatures and dimensions, and downsamples with the browser decoder. Invalid bytes and failed decode never masquerade as successful images.
3. **Remotes depended on the Explorer aside for normal login.** Hiding only the tree would lose login or leave unrelated layout. The existing connection DOM/handlers are moved into Remotes' own card and returned to Explorer; no second OAuth client is introduced. Settings and Remotes hide the whole aside and separators. Existing tree/viewport remain detached or hidden, not cleared by tab changes.
4. **The previous CSS resize grip enforced pane minimums/maxima.** Explicit pointer-captured vertical/horizontal separators now update local CSS/layout on RAF. No network/config/native call occurs per pointermove. A changed completed gesture persists through `setExplorerLayout` in `commitConfigChange`; a click/no-op does not write. Both endpoints remain reachable, default/reset is exactly 50/50. Toolbar fit derives from actual command geometry, reparenting the same controls into More instead of duplicating handlers/actions.
5. **Gallery replacement lost keyboard focus.** The existing reusable dialog now restores a meaningful focused control when replacing its body. Only an active image gallery handles Left/Right, stops at loaded-list boundaries, skips nonimages/folders, and ignores inputs/selects. Abort/epoch checks discard superseded reads/decodes. ESC disposes the URL and restores originating file focus.
6. **A late History inspection could overwrite a newer error.** Historical result summaries now update their own Remotes element, not the global notification. Footer left is empty; operational notifications remain accessible above the footer or inline/in the active dialog. Raw code-only messages receive plain user wording; safe code breadcrumbs remain available through the existing API and explicit DOM diagnostic attributes. No file bytes/URLs/credentials enter diagnostic logs.

## API/GUI parity

| Mechanism | Single canonical owner | Deliberately local presentation |
|---|---|---|
| Actual image/text bytes and image errors | `readFileChunk`; existing source/account/scope checks and range/ETag proof | Blob URLs, header checks, image decode, loading/error DOM |
| Thumbnail and full viewer | Same `createImageReader` source cache and existing File API | Visible-window scheduling, bounded decode/downsample, URL disposal |
| Gallery | Existing ordered authorized `listFolders` entries and `readFileChunk` | Pure `galleryStep`, current index, buttons/keyboard; loaded items only, no surprise wrap or full-folder byte scan |
| Pane/toolbar preferences | `getConfiguration`, `previewConfigChange`, `commitConfigChange` with `setExplorerLayout:{explorerLayout:{split,toolbarRows}}` | Pure splitter geometry; RAF drag/ResizeObserver; no resize RPC |
| Layout validation/migration | `src/api/config.mjs` defaults old products to `{split:50,toolbarRows:1}`, closed schema and typed Change | Actual row fit clamps display to useful rows; saves explicit user intent, not transient viewport sizes |
| Toolbar More | Same existing Back/Forward/Up/Refresh/address/View/+ Right Click DOM nodes and listeners | Fit/overflow/focus; distinct from `#more` Load more files |
| Default toggle dependency | Existing `makeDefault` / `clearDefault`, same exact target/current revision/native ACK | One pressed selection control per saved target, header shows exact Default across filters; disable controls during commit to avoid racing revisions |
| Remotes/Settings | Existing login/status/readiness/history APIs | Reparent existing connection controls; tab/pane visibility and scroll/focus |

Native menu compiler/registrar, TRUE REMOTE Worker implementation, OAuth grants, approval ledger, destinations and History persistence are not replaced. New preferences are local configuration data, not cloud resources. `setExplorerLayout` joins existing display-only commits that retain an already valid native ACK, while reporting missing/pending ACK truthfully. Original permission and response-authorization gates remain.

## Resource and correctness policy

- Source cache: at most 24 image Blobs / 32 MiB, identity includes connection/account/bucket/key and known metadata version; 10-second reuse freshness. Listing refresh, folder/authority changes, successful file mutations and verified save notifications invalidate image state. No authority is cached.
- Thumbnail scheduler: only virtual window candidates, two image reads at a time, one range at a time per thumbnail; four-MiB object budget. At most 256 decoded thumbnail URLs with maximum 128×128 pixels (~16 MiB pixel payload), explicit URL revocation. Native decoder/GC transient process memory is not claimed to equal that payload budget.
- Enlarged viewer: existing 64-MiB image and 512-KiB text budgets; after first identity range, up to three 64-KiB reads concurrently. Header parsing starts with 64 KiB; JPEG metadata beyond that prefix is parsed from the already authenticated, budget-bounded Blob without new network reads. Images above 64 million decoded pixels or with invalid/unavailable dimensions receive an honest Download fallback. These are preview resource budgets, not remote transfer caps.
- ETag/total/offset/byte count/done are verified for every chunk. MIME comes from bytes, not untrusted filename/MIME alone. Browser decode and nonzero natural dimensions are required before display. No SVG/HTML inline execution, original source URL forwarding or public object URL substitution.
- Queued obsolete work stops; already-dispatched runtime IPC cannot be physically recalled. Cancelled responses cannot publish pixels or selection. Resize reuses decoded/byte cache entries, suspends hidden file-pane work and recomputes virtual geometry locally.

## Evidence boundary

Actual Chromium decode/pixel assertions use small generated, nonprivate PNG/JPEG/WebP/GIF objects through the real typed API and synthetic authorized provider. They are not owner R2 bytes or installed Windows Chrome. Final source-pinned browser/focused/performance receipts and outstanding external acceptance are in HANDOFF.md. REDOWN and live cloud resources remain untouched.
