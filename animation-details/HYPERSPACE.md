# Hyperspace — Header corridor and energy release

## Visual intention

A quiet interface becomes a perspective highway: the bottom dividing line splits at the center, curves toward the top, gathers momentum, and races outward. The background regions never dissolve independently. Each rail and its corresponding header-color surface use the same Bézier boundary. There are no circular masks, independently expanding blobs, full-screen flashes, or rotating rectangles. The ReDown logo and sun/moon stay in place. The original header layout remains available. The header paint retracts with the page lift, preventing the fixed hover region from hiding page headings.

## Timeline and controls

| Phase | Timing | Behavior |
| --- | --- | --- |
| Idle | 5 seconds | Only uninterrupted absence of hover arms the effect. Initial launch may arm the idle timer; changing tabs never arms it. |
| Split | 1.8 seconds | The line separates from the center; its tips climb to the top and create an 80 CSS-pixel opening (bounded on exceptionally narrow windows). Curves create a vanishing-point highway. |
| Charge | 5 seconds by default | Light streaks begin near the bottom of both rails and travel upward toward the horizon, starting almost imperceptibly and accelerating continuously throughout the configured time. The colors remain separated at the curves. |
| Release | Energy-dependent | The rails and the header surfaces move outward together. Navigation text fades and lower content is pulled upward by the same release. |
| Settle | Energy-dependent | A small, bounded upward overshoot settles into a constant final position. |
| Open | Indefinite | The page color fills the header space and the page stays raised. No ongoing animation-frame loop. |
| Return | Up to about 0.88 seconds | Header hover reverses from the current state and restores the surfaces, navigation and content together. No restart from an unrelated frame. |

Settings → Aesthetic → Header Hyperspace offers an enable switch and a buildup duration of 1–20 whole seconds, persisted locally in `headerHyperspaceV1`. The buildup is separate from the initial fixed five-second idle delay. Longer buildup produces a stronger, quicker outward release and more upward overshoot, without changing the final geometry. Limits are deliberate to keep motion legible and bounded.

## Energy model

For charge time c in seconds, the shimmer's travel (in rail lengths) is 0.015c + 0.008c² + 0.020c³. Velocity is its derivative, 0.015 + 0.016c + 0.060c². Travel is integrated instead of abruptly switching animation durations. Streak length and opacity increase within bounds; opacity never flashes the whole header.

Normalized release energy is the square root of buildup seconds / 5, bounded to 0.4–2. Energy shortens the release interval and increases the small upward overshoot. The rail translation and content lift are sampled from the same release clock. Both finish in the same layout for every configured duration. The page rises at most 28 CSS pixels at rest, additionally limited by the real header height so that the logo/theme controls retain room.

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
