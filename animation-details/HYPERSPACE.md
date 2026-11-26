# Hyperspace — Header corridor and energy release

## Visual intention

A quiet interface becomes a perspective highway: the bottom dividing line splits at the center, curves toward the top, gathers momentum, and races outward. The background regions never dissolve independently. Each rail and its corresponding header-color surface use the same Bézier boundary. There are no circular masks, independently expanding blobs, full-screen flashes, or rotating rectangles. The ReDown logo and sun/moon remain visible; they move upward by at most 12 CSS pixels during release to leave space for the rising content. The original header layout remains available. The header paint retracts with the page lift, preventing the fixed hover region from hiding page headings.

## Timeline and controls

| Phase | Timing | Behavior |
| --- | --- | --- |
| Idle | 5 seconds | Only uninterrupted absence of hover arms the effect. Initial launch may arm the idle timer; changing tabs never arms it. |
| Split | 1.8 seconds | The line separates from the center; its tips climb to the top and create an 80 CSS-pixel opening (bounded on exceptionally narrow windows). Curves create a vanishing-point highway. |
| Charge | 5 seconds by default | Light streaks begin near the bottom of both rails and travel upward toward the horizon, starting at two rail lengths per second and accelerating continuously throughout the configured time. The colors remain separated at the curves. During the final 28% of charge (up to 1.2 seconds), both rails arch inward and the navigation dips slightly, like a spring being compressed. |
| Release | Energy-dependent | The accumulated inward tension and small downward navigation dip reverse into the release: the rails visibly bow away from the center as pressure strikes their interior. The deformed rails and the header surfaces then surge outward together. Navigation text is launched upward beyond the header and viewport, with a late fade only as it exits. The lower content is pulled upward by the same cubic release impulse. The rail glints lengthen briefly and gain a final burst of travel before vanishing with the color boundary. |
| Settle | Energy-dependent | A stronger, energy-dependent upward overshoot settles into a constant final position. |
| Open | Indefinite | The page color fills the header space and the page stays raised. No ongoing animation-frame loop. |
| Return | Up to about 0.88 seconds | Header hover reverses from the current state and restores the surfaces, navigation and content together. No restart from an unrelated frame. |

Settings → Aesthetic → Header Hyperspace offers an enable switch and a buildup duration of 1–20 whole seconds, persisted locally in `headerHyperspaceV1`. The buildup is separate from the initial fixed five-second idle delay. Longer buildup produces a deeper outward bend, a stronger, quicker outward release and more upward overshoot, without changing the final geometry. Limits are deliberate to keep motion legible and bounded.

## Energy model

For charge time c in seconds, the shimmer's travel (in rail lengths) is 2c + 0.225c². Velocity is its derivative, 2 + 0.45c. Travel is integrated instead of abruptly switching animation durations. Streak length and opacity increase within bounds; opacity never flashes the whole header.

Normalized release energy grows approximately linearly with buildup seconds (0.35 + 0.65 × seconds / 5, bounded to 0.4–2.8). The release starts with a visible pressure wave: the rail interior bows outward while its endpoints barely move. The peak curvature grows with charge duration. The inward tension is bounded to keep the mirrored curves apart, and the navigation dips by up to 8 CSS pixels. The compression unwinds continuously into the outward bow, without adding time to the configured buildup. At the default five-second charge, the flex lasts 125 ms, followed by a 440 ms cubic-ease-out exit. Longer charging deepens the bow and accelerates the exit; bounded overshoot increases with energy. The curve and color boundary remain identical at every frame. The rail translation, navigation ejection and content lift share the same release impulse. Hover restoration interpolates from the current navigation position instead of snapping it back. Both finish in the same layout for every configured duration. The page rises up to 40 CSS pixels at rest and up to 54 pixels at the peak, bounded by the real header height, the measured heading clearance and the persistent controls. Scrolled pages use a conservative clearance. The clipped paint retracts with the lift.

## Interaction contract

- Applies to all Shelf tabs and skins except File Explorer.
- No tab-switch trigger. Navigation cancels pending or running motion without starting it.
- Returning the pointer during idle cancels the timer; returning during any animation phase starts a continuous restoration.
- Hovering again while restoring does not restart restoration.
- Menu closure or DOM-only pointerleave cannot arm the timer.
- Keyboard focus and activation restore navigation immediately for accessibility; direct clicks and entering Explorer also restore without waiting.
- Reduced motion, disabling the setting, theme changes, viewport resize, and document hiding cancel and clean up the effect.
- No authentication, provider, file, destination, or engine state is modified.
- All temporary elements, CSS variables, and frame handles are removed on cleanup. No animation runs after settling until the next interaction.

## Implementation

- `extension/hyperspace.mjs`: preference, pure geometry/timing, rendering, idle and restoration controller.
- `extension/hyperspace.css`: active-state-only styling.
- `extension/app.html`, `extension/app.mjs`: Shelf integration and settings mounting.
- `scripts/test-hyperspace.mjs`: deterministic timing, geometry and energy checks.
- `scripts/test-onyx-remotes-browser.mjs`: existing Onyx browser fixture extended with clock-driven integration checks.

The original header and Manage Destinations animation remain independent. The implementation needs live Chrome visual acceptance before the aesthetic is considered verified.
