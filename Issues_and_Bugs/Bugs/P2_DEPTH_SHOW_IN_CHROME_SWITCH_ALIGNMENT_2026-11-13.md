# P2 UI bug — Depth Destinations: "Show in Chrome" controls split into an awkward extra row

**Reported:** 2026-11-13, live Chrome screenshot after building commit `08f7d29` (`codex/depth-repair-audit`).  
**Status:** Open, visual defect reproduced in user-supplied screenshot.  
**Severity:** P2 visual clarity/standardization. **Not** a save failure or a configuration-logic issue.  
**Area:** Destinations Manager → Depth tab → "Show in Chrome" section.

## Observed

At the right-side Chrome shelf width shown in the supplied screenshot, the "Show in Chrome" caption is followed by the checked **Simple** and **Narrow** boxes in the same horizontal line, while the checked **Depth** checkbox is orphaned on a second line with substantial unused horizontal space. It looks inconsistent, accidental and unprofessional relative to the otherwise compact, newly improved Depth controls.

The three toggles are visible and appear checked. This screenshot is **not evidence of a toggle state or persistence malfunction**; the issue is their visual layout.

## Expected design

- **Simple, Narrow and Depth checkboxes should be grouped together in a single aligned horizontal row whenever there is sufficient horizontal room**, including the user's ordinary shelf/modal width shown in the screenshot where possible with sensible label placement.
- If the heading plus the three toggles cannot fit neatly in one line, put the heading **"Show in Chrome" on its own line** and group all three toggles in a compact, consistently spaced row beneath it; do not leave Depth as an isolated orphan after the other two.
- On genuinely narrow viewports or high zoom, allow an accessible, purposeful responsive layout (two rows or a clean stacked group if necessary), without overflow, overlap, tiny click targets, clipped labels or horizontal scrolling.
- Maintain consistent checkbox dimensions, focus indicators, label click area and spacing, in the visual language of the rest of Destinations Manager.
- Keep the layout visually standardized when viewing Depth; scope any CSS/DOM adjustment to this manager section so other UI is not affected.

## Suspected cause / code references (verify)

`extension/app.mjs` Destinations dialog creates one `<div class="show-controls">` containing a `<span>Show in Chrome</span>` and three `<label><input data-manager-show=...>` nodes. `extension/app.css` applies global `.show-controls{display:flex;align-items:center;gap:8px;padding:12px 20px;flex-wrap:wrap}` and global `label{display:block;margin:10px 0}`. The combined label sizes, margins, heading and padding are likely driving orphaned Depth wrapping. Inspect actual computed dimensions instead of assuming this is definitively the cause. The newer `extension/depth-destinations.css` scopes *destination row* styles but does not appear to govern the separate Show in Chrome bar.

## Scope restriction

**Presentation-only change in Depth Destinations Manager's "Show in Chrome" section.** Do not change checkbox `data-manager-show` values, `setShowInChrome` semantics, Save behavior, application state, persistence, right-click menu generation, Depth selection, worker/authorization routing or any unrelated functionality. Do not redesign other modes. No changes to the overall native context-menu hierarchy are requested by this bug.

## Acceptance / verification

1. At the screenshot's shelf width, no orphaned Depth toggle; all three checkboxes appear consistently aligned (prefer one row of controls, heading above if needed).
2. Verify both narrow and wider modal/shelf widths, long translations if supported, zoom 100% and high zoom, and keyboard label/focus usability.
3. Confirm before/after screenshot and computed bounding-box positions, no clipping.
4. Confirm toggling and saving produce the same configuration and that native right-click behavior is unaffected.
5. Keep this separate from open P1 Depth `WORKER_SETUP_REQUIRED` and `NATIVE_APPLY_INCOMPLETE` investigations.
