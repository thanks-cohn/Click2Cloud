# P2 — Depth Destinations Manager visibility and trash controls are oversized

**Reported:** 2026-11-13  
**Status:** Open — visual defect, root cause unconfirmed  
**Area:** Click2Cloud > Destinations Manager > Depth configuration  
**Observed branch:** `codex/logic2real-depth-save` (reported after build of `bd8da5e`)  
**Priority:** P2 — visual/UI polish; no reported blocking functional regression

## Observed behavior

The visibility (eye) and delete (trash) action buttons associated with the Depth menu/configuration rows appear disproportionately large compared with the surrounding row content. The buttons look oversized and visually inconsistent, while equivalent controls in the other Destinations Manager sections are appropriately proportioned. User reports that Depth functionality otherwise appears to work well following the repair.

## Expected behavior

Depth visibility and trash actions should use the same compact, consistently sized icon-button style as equivalent actions elsewhere in the Destinations Manager. Icons and hit targets should be proportional to the row height, vertically centered, and not stretch or force the row to grow. Preserve accessible hit targets and clear focus/hover states.

## Investigation hypotheses (not confirmed)

Check for inherited `height: 100%`, flex/grid `align-items: stretch`, `flex: 1`, a broad button selector, unintended padding/min-height, or a Depth-specific row/container class overriding the shared compact icon-button styling. Compare computed styles and layout of the Depth buttons against identical controls in sections that look correct, including parent container rules. The cause is currently unknown; do not assume CSS stretching until inspected.

## Acceptance criteria

1. Depth eye and trash buttons visually match the corresponding compact controls in other manager sections at typical popup/shelf sizes.
2. Button dimensions stay stable for shallow/deep folder trees, long labels, expanded/collapsed rows, and narrow layouts; neither icons nor their containers stretch to row height.
3. Visibility and delete interactions still work, and click targets remain accessible.
4. No unrelated changes to the repaired Depth menu projection, save routing, or shared Save button.
5. Before/after screenshots and a check of the relevant computed CSS rules are recorded before closing.

**Scope:** Log this cosmetic regression for follow-up. Do not conflate with the Depth menu's fixed hierarchy/routing behavior.
