# P1 BUG — Shelf Explorer WebP preview displays “OK” instead of image

**Reported:** 2026-11-08 by owner, with Windows Chrome screenshot · **Version:** Click2Cloud 0.3.11 · **Status:** OPEN, visually reproduced by owner; no code fix or cloud byte proof yet. **Severity:** P1 for broken preview; **P0 alpha blocker** if cloud-saved bytes are wrong or success was falsely verified.

## Observed

In actual Click2Cloud Shelf Explorer, selecting/opening an object labeled `0195_Shiny_Quagsire.webp` displays a dialog with that file name but body text **`OK`** instead of the actual WebP picture; only Download is visible. The adjacent browser page shows a candidate image, but does not prove the cloud object is correct. A generic status must never substitute for actual pixels.

**Expected:** Authenticated valid image objects show their actual decoded pixels, bounded to the preview area; missing/invalid/unauthorized objects show specific truthful failure, not `OK`.

**Separate related regression:** [Grid mode uses icons rather than genuine thumbnails](P1_EXPLORER_GRID_VIEW_HAS_NO_IMAGE_THUMBNAILS_2026-11-08.md).

## Code-level investigation targets (current source on main, Nov 8)

- `extension/app.mjs:openEntry` (lines ~196–214) invokes the trusted `readFileChunk` API, consumes 64 KiB ranges, assembles a Blob and emits `<img class="preview">` based on the `.webp` extension. Its catch renders `error.message` directly; trace why the visible result is precisely `OK`.
- `extension/app.mjs:api` unwraps the **outer** typed RPC result to `result.data`. `src/api/service.mjs` passes through `fileApi.run('readChunk',params)`, which has a second **inner** `{id,state,data,error,code}` envelope. Test when the inner file operation fails while the outer inspection says `code:OK`: do **not** treat an outer successful request or `OK` as proof of usable image bytes.
- `src/explorer/r2-adapter.mjs:readChunk` enforces real HTTP 206, Content-Range, exact byte lengths and ETag. Verify safe returned states at every boundary and that multipart assembly preserves the whole image exactly.
- Validate actual `<img>` creation, URL.createObjectURL lifetime, image decode (`naturalWidth/naturalHeight`), modal replacement, CSS, and cancel/rapid-switch races.
- Independently inspect existing cloud object size/content type/magic bytes/hash using authorized **read-only** access; do not infer that because the filename ends `.webp` the bytes are a valid image. If the file contains a literal text health response `OK`, classify the **save path** as potentially falsely verified, NOT as a preview-only flaw.

## Acceptance criteria

1. Real WebP, PNG, JPEG, GIF previews render image pixels in installed Chrome and remain visible until dismissed.
2. Invalid/corrupted/truncated/nonimage bytes, incorrect MIME, deleted object, expired token, HTTP 403, nested API `failed` and network errors are distinctly and truthfully handled. A standalone `OK` is never shown as preview content or as an ambiguous error.
3. Bounded/lazy reads, proper cancellation, object URL disposal, and no duplicate File API engines, page/source URL leakage, or unapproved provider writes.
4. Add focused and real-browser tests for valid WebP decode and nested API envelope failures. Fixture tests are not proof of the user's live R2 object.
5. If stored object contents differ from verified intended bytes, escalate to P0 save-integrity defect; do not declare this resolved with a CSS-only fix.

**Owner evidence:** Screenshot attached to conversation Nov 8, 2026. The bug document intentionally avoids copying the user's image or asserting a local sandbox path.
