# P1 — Depth destinations must not offer Make Default in Destinations Manager

**Reported:** 2026-11-09
**Status:** Implemented in phased Phase3; fixture UI verified, installed Chrome acceptance BLOCKED
**Area:** Click2Cloud → Destinations Manager → Depth mode

## Bug / requirement

In the Depth section of Destinations Manager, **"Make Default" must not be offered as an option for Depth entries**.

Depth is a folder-hierarchy display mode, not an interface for assigning Default destinations. Do not show the Make Default control/button/menu action on any Depth row. Keep the corresponding Default functionality available only in the appropriate destination-management contexts that support it.

## Expected behavior

- Depth rows do not display or expose **Make Default** in the Destinations Manager, including overflow/context menus.
- Depth folder viewing/configuration remains unchanged.
- Existing Default settings are preserved; removing the Depth UI action does not delete or reassign an established Default.
- Simple/Narrow management and right-click saving remain unchanged.
- Avoid rendering a dead or disabled Make Default button in Depth; the option should be absent.

## Acceptance

Inspect Depth Destinations Manager UI and any relevant action menus: no Make Default control. Test against existing Default configuration, and verify it remains intact. No implementation or test completion claimed by this issue record.

Evidence: `docs/evidence/phased-upgrades/phase3/verification.json`. Existing Default is preserved; manager control is absent rather than disabled.
