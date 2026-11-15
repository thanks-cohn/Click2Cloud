# Visual review — a design assessment, not certification

High Polish is a candidate built-in desktop aesthetic through API 1.0. Standard remains the baseline. This is a screenshot-supported engineering/design review; final owner taste acceptance and installed Windows acceptance remain open.

The reproducible matrix is `C2C_AESTHETIC_EVIDENCE=work/foundation/aesthetic node scripts/test-aesthetic-browser.mjs`: Standard/High Polish × Dark/Light × 1100/600/360px. It captures Remotes, Explorer, History, Settings, More and context menus. Additional captures cover gallery, help/diagnostics and all three Destinations tabs; narrow Settings cards are scrolled individually. Selected originals are in `screenshots/`; running the script regenerates the full matrix.

| Concrete consistency check | Review/result |
| --- | --- |
| Composition and hierarchy | Strong page titles, consistent card dividers, understated navigation, aligned settings controls; practical Explorer density and virtual row heights retained. |
| Typography | One system family, tabular figures, restrained weights, explicit secondary text and metadata scale. |
| Rhythm/geometry | Shared page/card spacing, control radius, surface radius, overlay elevation; no decorative blur or continuous effects. |
| Whole-app coverage | Header/nav/footer, Remotes cards, Explorer tree/address/list/toolbar, menus, dialogs, gallery, History details/status/pagination, Settings/recovery/diagnostics. |
| Clipping and focus | More edge hit-tests pass in both appearances, three widths and both palettes; Escape returns to its trigger. Scrollbars and viewport collision remain owned by the functional overlay. |
| Narrow layout | 360px header fits; content wraps; History timestamps occupy a separate line; controls remain reachable. Narrow secondary Settings cards were inspected for wrapping. |
| Color/contrast | Built-in primary/secondary text against background/surface/raised colors meet 4.5:1, focus meets 3:1 in both palettes (automated palette checks). These are not a full assistive-technology audit. |
| Motion | Reduced-motion disables transitions; no aesthetic RAF/timers. Image loader remains its separate shared implementation. |

Defects found and corrected during review: the original font lacked the brand arrow glyph, so the aesthetic renders a tiny CSS arrow; interpolated background colors could briefly lower contrast during palette switching, so surfaces now switch instantly; native file-upload buttons received the same control treatment; sibling page buttons gained consistent separation. The History pending-read/reopen race found by functional tests was repaired, with the two-read budget shared across page changes.

See `before-more-360.png` versus `after-more-360.png`; `standard-dark-1100-settings.png` versus `high-polish-dark-1100-settings.png`; corresponding narrow Remotes/History screenshots; both gallery screenshots; and the Help/Depth dialog samples.

Playwright click-to-visible samples (six per appearance across palettes/widths) are in `interaction-measurements.json`. They include automation overhead and different layouts, so they cannot establish a Windows input-to-paint improvement or a statistically reliable performance comparison. No live save latency claim is made.

Remaining visual proof gaps: actual Windows fonts/native controls, real installed Shelf resizing, screen-reader use, and owner subjective premium-quality acceptance. Chromium administrator policy blocks unpacked-extension loading; screenshots use production app code with explicit fixture transport.
