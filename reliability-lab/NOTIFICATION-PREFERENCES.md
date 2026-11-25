# Follow-up: Console Era v2 notification preferences

Owner feedback on 0.3.29: the success notification is currently dead center. Preserve the approved animation, but allow the user to choose its position and box size in Settings.

## Requirements
- Add Show success notifications toggle, default enabled. Off suppresses both custom and fallback success notifications and dismisses any active success notification; preserve errors, Queue, History, receipts, toolbar badges and all save operations. Disable position/size controls while off without losing preferences.
- Add Position: Center / Right. Right (bottom-right) is the default for missing preferences, with a safe inset, matching the owner's 0.3.29 screenshot. Center remains selectable; preserve explicit choices.
- Add Size: Small / Standard / Large as proposed presets; Standard preserves 0.3.29 dimensions. Derive responsive sizing from the existing component and keep the whole box within the viewport. No clipping, overlapping controls or unreadable text. Do not move the Shelf itself.
- Persist both preferences through the existing settings and Aesthetic API mechanisms; validate missing/invalid values, preserve explicit saved values across upgrades/restarts. Apply on the next notification and update an active notification if possible without restarting its timer or animation.
- Preserve approved PNG, timing, provider palettes, reduced-motion behavior, 10-second expiry, manual X, deduplication, verified-success semantics, native fallback and existing notification enable/disable settings. No new permissions or notification engine.
- Scope these controls to the custom Console Era notification surface; do not imply control over OS-native notification placement/size. Inspect actual code and document platform/surface limitations.
- Test baseline first; implement separately from lab infrastructure changes with clear commits. No unrelated visual redesign.

## Behavioral test additions
Cross both positions and all three proposed sizes with every supported provider palette, narrow/normal/wide surfaces, reduced motion, keyboard dismissal, rapid successive verified saves, changing settings while notification is active, theme changes, restart, and missing/invalid stored preferences. Verify geometry, clipping, legibility, click targets, unchanged operation identity and expiry. Test preference persistence and native fallback separately. Include user changing position and size during ordinary mixed-operation journeys. Keep live provider restrictions from README. Do not claim actual Windows/native verification from fixture-only evidence.
