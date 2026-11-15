# Click2Cloud — next Codex change: reuse existing image-loading visual in History

**Owner clarification, November 15, 2026.**
**Scope:** One small integration change for Click2Cloud History previews. **No Aesthetic API work**, no new animation engine, no new themes, no changes to the save pipeline, cloud permissions, or feature-specific loading logic.

## Required behavior

- History image previews must use **the same existing configurable loading visual** that Click2Cloud already uses while loading images in File Explorer/gallery.
- Reuse the **existing selected setting and renderer**, not a new History-specific preference or copy of the math/GIF/media implementation.
- Respect the existing supported `math`, `media` (validated local image/GIF/video), and `plain` visual settings, including fallback behavior and `prefers-reduced-motion`.
- Render the currently selected loading visual during a real pending History image preview load; remove/destroy the visual when the preview completes, fails, is canceled, becomes hidden, the page changes, or History is exited. Leave a clear error message on failure.
- Changes to the global/gallery loading visual preference must be honored by subsequent History image-loading events, without requiring a distinct setting.
- Keep existing History semantics: read-only save receipts, 25 operations per page, pre-expanded/lazy previews, bounded two-at-a-time image loads, visibility observers, aborts, file-type restrictions, 4 MiB preview limit, and real GO TO. An animation must never delay, block or restart a file read.
- Do not create infinite animation loops, detached observers, stale overlays, leaked Blob URLs, or growing memory use as pages/images change. Pause when hidden or backgrounded and honor reduced-motion.
- Apply only when an actual preview is loading; don't play the visual endlessly for non-image rows, unloaded/offscreen rows, or after download completes.

## Existing modules to reuse (inspect current branch before changes)

- `src/explorer/loading-visual.mjs`: `mountLoadingVisual(container, selection)` with teardown and math/media/plain fallback, pause and visibility logic.
- `src/explorer/loading-visual-config.mjs`: selected media configuration/validation.
- `src/explorer/loading-visuals/math.mjs` and `media.mjs`: existing renderer modules.
- `extension/app.mjs`: existing gallery use of the loading visual and selected preference.
- `extension/history-page.mjs` (customer-history branch): currently uses `el.textContent='Loading image…'` in `preview()`, with independent paginated/lazy preview scheduling. Replace only the **History loading placeholder presentation**, not its reader/queue logic.
- `extension/app.css`: ensure loading visual fits thumbnail frame without overlap, clipping, or affecting other panes.

## Verification

1. Switch global existing loading visual among mathematical, media, plain; History previews display each selected mode exactly while fetching, and retain identical preview results.
2. Run multiple image previews across page changes, expanded/collapsed History rows, delayed errors, aborts, hidden-tab and reduced-motion; ensure each visual properly tears down.
3. Confirm no additional Cloudflare requests, no change to image readiness timings attributable to the presentation, no new permissions, and zero impact on Simple/Narrow/Depth native save and all regular Explorer flows.
4. Document PASS/FAIL/BLOCKED and installed-Chrome vs fixture-only evidence accurately.

**Out of scope:** Public Aesthetic API, high-polish application theme, third-party themes or styling, animation playlists, domain Get URL, directory TXT exports, cross-cloud transfers. These are separate requests.

**User's exact intent:** *We already have an animation module for loading images. Simply apply the same module to History.*
