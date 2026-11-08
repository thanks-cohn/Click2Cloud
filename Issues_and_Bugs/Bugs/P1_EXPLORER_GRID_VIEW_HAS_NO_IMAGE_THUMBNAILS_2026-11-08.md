# P1 BUG — Click2Cloud Shelf Explorer Grid view has no image thumbnails

**Reported:** 2026-11-08 by owner · **Version:** Click2Cloud 0.3.11 · **Status:** OPEN, source confirms current Grid renders only icons and labels. **Priority:** P1 usability, subject to alpha-first scope.

## Observed and source proof

The owner reports **even Grid view does not display the images**.

In `extension/app.mjs:renderWindow` (current main lines ~185–192), the Grid template deliberately renders file tiles containing only `<span>${icon(e)}</span>` and a file label. The `icon` helper chooses `📁` or `▤`. It creates no `<img>`, does not request authenticated thumbnail bytes and does not render actual picture data. The present Grid is a tile layout, **not an image thumbnail grid**.

## Expected

For real image objects in the connected user's authorized cloud, **Grid shows genuine thumbnails of those exact objects**, not an image icon or filename alone. Nonimage types get appropriate static icons. Exact selected object and active account/bucket/path remain authoritative. A missing or denied preview shows a truthful lightweight placeholder without fake images.

This is related to but **not identical** to [WebP modal says OK](P1_EXPLORER_IMAGE_PREVIEW_DISPLAYS_OK_INSTEAD_OF_IMAGE_2026-11-08.md). Fix the underlying preview API shape first if necessary, then introduce proper thumbnail rendering.

## Constraints: performance is non-negotiable

- On-screen and small-overscan **only**: lazy-load visible thumbnails after initial Grid paint; never enumerate/download every file's bytes.
- Bound concurrent thumbnail reads and per-thumbnail bytes; use existing authorized Universal File API and its `readFileChunk` or appropriately minimal authenticated preview operation (if image formats require full bytes, cap and support only feasible sizes). No parallel/shadow API or provider source URL exposure.
- Cache by account + bucket + key + validated ETag/version; invalidate after mutation, auth change, navigation or version mismatch. Revoke object URLs/abort work for out-of-view and removed items. Do not inadvertently display images from another account or previous folder.
- Preserve full virtual scrolling, tile geometry, selection/focus, keyboard movement, Details/List modes and responsive side panel widths. No animation or effect may block UI. Preserve reduced-motion preference.
- For image formats supported by available decoders, test real `.webp`, `.png`, `.jpg`, `.gif`; broken/large/private objects should show consistent fallbacks.
- Grid mode must **not** be claimed implemented as an image preview grid until installed Chrome decoding and actual pixels are verified. The current test for bounded `gridWindow` is not thumbnail verification.
- Add tests for many items, quickly changing folders, scrolling far, denied reads, cache invalidation, blob cleanup, and image decode errors. Measure frame gaps and memory before/after. Do not create an alpha performance regression.

## Done

The owner opens Grid for a real cloud folder containing WebP/JPEG/PNG and sees actual thumbnails; clicking one opens a correct full preview. No fake success, privacy leakage, storage resets, Cloudflare provisioning, or per-item blocking of scrolling.

## Implementation candidate — 0.3.12

Production repair is on `dev/explorer-image-gallery` at runtime `5201ab2` (initial implementation `d4703a9`). See [source findings](../../docs/evidence/image-gallery/SOURCE.md) and [test handoff / remaining owner acceptance](../../docs/evidence/image-gallery/HANDOFF.md). This is not closed as owner-installed Chrome/live-object verified. Decoded fixture pixels are separately classified; a read-only check at the reported redown root returned 404/NoSuchKey and does not identify the actual owner object. Metadata-only discovery also found no matching basename among 190 objects in the configured redown bucket. No cloud writes or REDOWN modifications were made.
