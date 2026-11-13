# Experimental — Pluggable Animation Studio, Playlists, Random Rotation, and Custom Visuals

**Recorded:** 2026-11-13  
**Status:** Experimental product direction / documentation only; not implemented or enabled by this document.  
**Primary product:** Click2Cloud; architecture may be reusable by REDOWN and other ecosystem apps.

## Owner's vision

Turn the **entire gallery loading-animation feature** into one small, self-contained, interchangeable module. Click2Cloud should own *where and when* a loading visual is shown, but should not need to know the animation's mathematics, media type, playlist ordering, or rendering implementation.

Users should be able to:
- Keep today's mathematical animation unchanged as **Classic Geometry**, the permanent default and safe fallback.
- Choose **one** installed animation, or select **several** animations at once.
- Choose **random rotation** across a selected subset (for example, pick three presets and vary the visual between image changes).
- Choose a **fixed sequence** (A → B → C → A), with a user-defined order.
- Optionally switch during a long load on a timer, rather than only when the next image begins loading.
- Mix *types* in the same playlist: built-in mathematical animations, a local GIF, an image, or supported local video. Later, explore compositing/layering multiple visuals together.
- Eventually explore carefully isolated user-supplied animation definitions/code and opt-in remote URL sources, **not** privileged arbitrary scripts or unsolicited network fetching.
- Restore Classic Geometry with a single action; any invalid or failed selection must degrade gracefully without affecting file reads, navigation, credentials, or saves.

This is a **visual plugin/playlist system**, not a rewrite of the gallery or cloud engine. Replacing an image, GIF, mathematical preset, playlist order, or default choice should not require modifying the workings of Click2Cloud.

## What already exists (source inspection as of 2026-11-13)

The current implementation is **partially modular**:

- `src/explorer/loading-visual.mjs` owns the loading visual's mount/unmount, visibility pause, reduced-motion response, and fallback to mathematical geometry.
- `src/explorer/loading-visuals/math.mjs` contains the existing canvas-based mathematical animation and exposes `mountMath(container)`, which returns `setPaused`, `setReducedMotion`, and `destroy`.
- `src/explorer/loading-visuals/media.mjs` independently displays a supplied **local Blob** as image/GIF/video, with cleanup of object URLs.
- `src/explorer/loading-visual-config.mjs` validates and describes local loading media; it currently supports `math`, `media`, and `plain` modes.
- `src/api/service.mjs` exposes `getGalleryLoadingVisual` and `setGalleryLoadingVisual`. `src/persistence/current-store.mjs` stores the selected loading visual separately.
- `extension/app.mjs` mounts/unmounts the visual during gallery image loading; `extension/app.css` gives it a fixed visual frame.
- `tests/gallery-loading.test.mjs` tests media validation, API boundaries, and isolation from cloud network reads.

**Important gap:** the existing `math` mode has only one hardwired mathematical renderer, not an extensible registry, user-selected subset, playlist, randomizer, sequence scheduler, or configurable mathematical preset ID. Gallery navigation currently **restarts a loading visual between images**, rather than implementing a separate animation that blends the old image into the new image. Do not confuse *loading visuals* with *image-to-image transitions*. These can eventually share the animation package, but should remain distinct responsibilities.

This inventory is a **static code review**, not proof of a new feature in a live Chrome extension.

## Minimal design — one visual slot, one animation package

Keep the application-side contract minimal:

```text
Click2Cloud gallery (owns image navigation/read/decode)
                |
                v
        mountAnimationSlot(frame, preferences)
                |
                v
    animation package (independent)
      - built-in registry and permanent Classic fallback
      - selection: single / random / sequence
      - optional timer rotation
      - renderer adapters: math / local media / plain
      - lifecycle, accessibility, cleanup
                |
                v
       one active visual in the existing frame
```

The animation package should expose a small host interface, such as `mountAnimationSlot(container, options)` returning `setPaused`, `setReducedMotion`, `updateSelection` (if needed), and `destroy`. Prefer adapting the existing modules rather than creating parallel engines.

A single **registry** maps stable preset identifiers (e.g. `classic-geometry`, `lissajous`, `rose-curves`, `local-gif:…`) to renderers. Each renderer follows the existing lifecycle style: mount → pause/resume → reduced-motion update → destroy. The scheduler chooses the *next preset ID*; it does not draw anything. Renderers draw; they do not choose playlists or access clouds. Application code only mounts the slot and unmounts it on image readiness, cancellation, or navigation.

Do not make the core image read, download, save dispatcher, Chrome right-click menu, authentication, or canonical File API depend on animation availability.

## User-facing preferences (future)

1. **Classic Geometry (default)** — no visual, timing, or performance change to the currently shipped animation.
2. **Single** — always use one chosen animation.
3. **Random selection** — choose from the enabled subset for each new image-loading event; avoid immediate repeats when two or more choices are available.
4. **Sequence** — move through user-ordered presets on successive image-loading events and wrap around at the end. Persist the chosen order and settings; decide explicitly whether the current sequence position is session-only (recommended initially).
5. **Timed rotation (optional)** — while one image is still loading, switch to another chosen preset every N seconds; stop all timers when loading completes or the gallery closes. **Not needed for the initial MVP.**
6. **Composition/layers (later)** — mix two or more visuals on the same frame, with explicit ordering and opacity; separate from *playlist rotation* so the first version stays small.

Potential settings controls: preset checkboxes, reorder arrows/dragging for sequence, Single / Random / Sequence selection, optional timer, preview, **Restore Classic Default**. Empty selections and deleted/unavailable presets automatically resolve to Classic Geometry without deleting the user's recorded choices; tell the user when fallback is active.

**Illustrative configuration only (not the current API schema):**

```json
{
  "schemaVersion": 1,
  "playback": "sequence",
  "selectedPresetIds": ["classic-geometry", "lissajous", "my-gif:local-1"],
  "orderedPresetIds": ["my-gif:local-1", "classic-geometry", "lissajous"],
  "rotateOn": "new-image-load",
  "timedRotationSeconds": null,
  "fallbackPresetId": "classic-geometry"
}
```

Do not replace the current `mode: 'math' | 'media' | 'plain'` API contract abruptly. Prefer a versioned, additive preference model and migration that maps all existing users to identical behavior. For a minimally invasive first phase, keep `mode: 'math'` as Classic Geometry unless a new preset/playlist is explicitly chosen.

## Animation kinds and future extensibility

- **Existing mathematical geometry:** preserve the exact current code and appearance, potentially relocating it behind a stable `classic-geometry` adapter without behavior changes.
- **Additional built-in mathematical presets:** independent files with unique IDs; examples include Lissajous figures, rose curves, Fourier epicycles, and Lorenz attractor visualizations. Adding or removing a preset must not require changes to the gallery flow.
- **Local user media:** preserve existing image/GIF/MP4 validation, local-only storage, 8 MiB limit, and media failure fallback. Multiple media selections may require a new versioned media catalog and clear local storage quotas; don't silently rewrite the existing one-item persistence.
- **User-supplied animation code (research only):** never evaluate arbitrary JavaScript in the extension's privileged page, background worker, or authenticated File API context. Prefer a declarative, bounded animation description or a sandboxed renderer with no extension APIs, credentials, cloud requests, storage, or cross-origin access; enforce CPU/memory/time limits and a kill switch. If that isolation cannot be proven, omit custom code.
- **Remote URLs (research only):** no URL loading by default. An opt-in URL feature would need explicit user action, fetch restrictions, allowlisted types, size/time limits, CSP/privacy review, and a local cached/validated asset; never permit arbitrary scripts or leak file/source/account data.
- **Curated ecosystem packs (future):** distribute original first-party animations as named, versioned packs. Some may be available through the Click2Cloud/REDOWN family only. Do not imply that client-side animation bytes or code can be made impossible to capture or reverse engineer; exclusivity is primarily about distribution, curation, licensing, and app integration.

## Randomization and sequence rules

- Random: eligible set = installed, validated, enabled entries; choose a new preset each *new image-loading event* and preferably exclude the immediately previous one where at least two are available.
- Sequence: advance exactly once on a legitimate new image-loading event, not on repeated renders, async preference fetches, failed decoding, or re-mounting the same loading frame.
- Plain placeholder remains a legitimate explicit user choice, not necessarily an animation.
- If the selected animation fails to mount, render, or decode, immediately fall back to Classic Geometry and preserve a truthful diagnostic; never stall image loading.
- Cancel stale loading work, visual frames, object URLs, observers, and optional timers as soon as a new image supersedes the previous one.
- Respect `prefers-reduced-motion` (still frame/static fallback) and page visibility/intersection pauses. Animation effects should be visually subordinate to actual image readiness and error messages.
- Make selection deterministic in tests by injecting a random number source or explicit playlist cursor; do not let randomization make UI regressions impossible to reproduce.

## Separation from transitions between already displayed images

This document primarily concerns **what visual appears during a loading gap between images**, because that's the feature present in Click2Cloud today. Future crossfades, wipes, or mathematics-driven *image-to-image* transitions should use their own transition adapter with previous/next decoded images and must never alter cloud-read semantics. A future unified animation package could offer both **loading visuals** and **image transitions** as separate plugin kinds; do not force the same renderer contract on both prematurely.

## Incremental proposal — protect the current experience

**Phase 0 — extract without visible change:** Consolidate the existing visual host behind a single import/interface. Preserve Classic Geometry exactly, preserve `math/media/plain`, and add regression tests for pause, teardown, failure fallback, reduced motion, and rapid image changes. The former experience remains indistinguishable from today's.

**Phase 1 — registry and playlist:** Add stable built-in IDs and Single / Random / Sequence support. Start with Classic Geometry plus one small demonstration preset, if desired. Preserve and migrate old settings without data loss; rotate once per new image-loading event. The gallery calls the same entry point.

**Phase 2 — user-selectable media collection:** Reuse current local media renderer and validation; add a carefully bounded multi-item catalog, mixed-type playlists, reordering, previews, and a one-click reset. No new cloud permissions.

**Phase 3 — optional additions:** Timed rotation, layering/composition, curated packs, and research on restricted custom code and URL imports, each independently feature-gated.

**Out of scope for initial delivery:** A new animation editor, marketplace, backend, DRM/copy-proof claims, remote execution service, autoplay while no image is loading, or changes to Chrome right-click save behavior.

## Acceptance checklist for any future Codex implementation

- [ ] Current Classic Geometry renders exactly as before, with unchanged default settings, as documented by visual and lifecycle regression tests.
- [ ] Entire animation package can be enabled/disabled or replaced without editing cloud reader, File API, auth, right-click menu, or save dispatcher.
- [ ] Single, Random, and Sequence play only enabled, installed, valid presets; random avoids immediate repeats where possible; sequence order/wrapping is correct.
- [ ] Switching images rapidly, cancelling loads, closing dialogs, changing tabs, or changing preferences never leaks RAF loops, timers, object URLs, listeners, or observers; no stale visual appears over a newer image.
- [ ] Lost/corrupt preset or failed GIF/video always falls back to Classic Geometry without masking image-read errors.
- [ ] Existing `mode` values and locally stored user media survive the schema migration; no accidental preference wipes, repeated prompts, or permission expansion.
- [ ] Reduced-motion and background-tab tests pass; measured rendering overhead stays low enough for responsive Explorer interactions.
- [ ] Sequence advances on genuine events, not settings refresh or async double-mount; random selection is reproducible under an injected seeded source.
- [ ] Actual Chrome Shelf/gallery acceptance verifies the visible result in addition to unit tests; distinguish source tests from browser proof.
- [ ] Code/URL experiments, if ever proposed, pass explicit sandbox/privacy/security review before shipping.

## Product rationale

This keeps the application mechanically simple while letting animation content grow independently. Users might build a personal three-animation playlist, use random rotation, select only their favorite GIFs, or enjoy curated Click2Cloud/REDOWN-exclusive mathematical effects. A rotating collection can make the software recognizable without making reliable cloud saving dependent on a visual feature. Treat scarcity/exclusivity as a **creative catalog and distribution strategy**, never as a claim of perfect technical prevention of copying or a reason to impair ordinary product functionality.

**Documentation only.** This proposal does not authorize implementation, new permissions, network fetches, or replacement of the existing default animation.
