# P1 — Shelf header More and sun/moon control overlap after resize (Emerald Forest)

**Owner report:** November 21, 2026.  
**Status:** OPEN, owner-reported visual regression; not fixed or reproduced in installed Chrome by this report.  
**Priority:** P1 / high-visibility UI defect, **below the separate P0 native Chrome right-click menu disappearance**.  
**Where:** The Shelf's **top application header**, NOT Chrome's native right-click menu, and not the floating dropdown contents themselves.

## Owner reproduction

> Expand the Shelf far to the left, then drag its right-hand divider back to shrink it; with certain appearance palettes such as **Emerald Forest**, the **More** button is incorrectly overlaid on the adjacent **sun/moon theme toggle**, producing an ugly collision.

The precise pixel width, theme (light/dark), Chrome zoom and full matrix of affected palettes are not yet measured. Do not attribute root cause to the Emerald palette itself merely because that is a user-reported reproducer.

## Expected polished behavior

- **More**, its hit target, and the **sun/moon** theme toggle never overlap in any width, resize direction, palette, light/dark mode, or reopened Shelf state. Each has a distinct visible button boundary, reasonable spacing, keyboard focus indicator, and independent click area.
- All the header navigation remains accessible. As the Shelf narrows, use an intentional **responsive priority/collapse** strategy: switch the More label to its compact icon, shorten File Explorer to Files, move lower-priority History/navigation actions into the existing More dropdown as necessary, or apply another deliberate small-screen layout. **Never solve by hiding the theme control, clipping a critical button, reducing hit areas below useful size, or stacking hit targets.**
- When the Shelf widens again, restore the normal layout without leaving a stale compact state or overlapping controls. Repeat expand → shrink → expand cycles to catch breakpoint/history-dependent behavior.
- The compact More popup itself should anchor correctly, remain within the visible Shelf bounds, maintain keyboard and pointer accessibility and not cover the sun/moon trigger before it opens.
- Keep the current header structure, existing one More control and single theme control, five Bit o' Polish palettes, Minimal/Remote V1 selection, and responsive features. **No new UI system or rewrite of the navigation.**

## Source inspection starting points (branch `codex/click2cloud-0.3.21`)

- `extension/app.html`: header contains a 3-column structure: brand, `nav` with `.header-more > #header-more`, and independent `#theme` with `.theme-sun`/`.theme-moon`.
- `extension/app.css` header rules near lines 123–149: grid `auto minmax(0,1fr) auto`, flex `nav` with `white-space:nowrap`, fixed 36px theme button, breakpoint-only changes at 480/350/310/260px and absolute-positioned More dropdown. **Investigate nav intrinsic width/shrink and whether its controls overflow their grid track into the adjacent theme column.**
- `extension/aesthetic.css` overlays themed geometry/spacing; `src/aesthetic/packages.mjs` defines **Emerald Forest**. Check whether typography, border, padding or token substitutions alter header width. Do not make an Emerald-only patch unless root cause proves it.
- `extension/app.mjs` owns More open/close and theme events; existing navigation/shortcut functionality must remain unchanged.

**These are inspection leads, not a proven root cause.**

**Issue tracking:** [GitHub #20](https://github.com/thanks-cohn/Click2Cloud/issues/20). This is tracked in `Issues_and_Bugs/README.md` and `next-codex/` beneath the native-menu P0.

## Acceptance / evidence

1. In real installed Windows Chrome, activate Bit o' Polish **Emerald Forest**; widen the Shelf from the right edge, then narrow it through the header's desktop/compact breakpoints. No `More` / theme control collision, clipping, or click interception.
2. Repeat with **Original Rose, Ocean Blue, Amethyst, Sunset Amber**, and with saved palette switching while narrow; test light and dark. Repeat at 100% and at an increased browser zoom.
3. Verify typical narrow Shelf widths as well as wider states (e.g., 250, 300, 350, 420, 480, 600 px as supported by actual Chrome panel dimensions); no unexpected horizontal scrollbar or hidden essential control.
4. Both controls independently click and keyboard-focus; More opens/closes its menu, menu items remain reachable, theme toggles without altering the selected palette, and dropdown stays within view.
5. Confirm no regression to the Remotes, Explorer, History and More navigation; no new CSS overrides of cloud/save logic; capture sanitized before/after screenshots at the offending width and palette.

**Proof status:** Owner-reported only. Neither browser reproduction nor a CSS correction is claimed by this document.

**Related:** [P0 disappearing native right-click menu](P0_CRITICAL_NATIVE_RIGHT_CLICK_MENU_MISSING_AFTER_LOGIN_2026-11-21.md) is a distinct **release blocker** that takes priority. The header More control is unrelated to Chrome's native context-menu registrar.
