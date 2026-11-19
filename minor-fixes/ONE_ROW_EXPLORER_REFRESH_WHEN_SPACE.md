# Minor fix — one-row Explorer toolbar uses spare space for Refresh

**Status:** Requested, not yet implemented.

When Explorer is visible and the toolbar is configured for **exactly one row**, there appears to be a little unused space that may fit the already-existing **Refresh (⟳)** button. If measurement of actual available width confirms it fits without overlap, let the existing Refresh button appear directly in that single-row toolbar rather than hiding it in More.

- Reuse the existing `#refresh` button, click handler and `extension/explorer-layout.mjs` packing logic. **Do not invent a second Refresh button or duplicate provider reads.**
- Measure available width dynamically, including the More button, navigation and Search. Show Refresh **only if it truly fits**. If it does not fit, preserve the existing overflow/More behavior. Never force a second row when the user chose one.
- Preserve Back/Forward/Up, filename Search's existing priority and Ctrl+Shift+F8 toolbar row toggle. Do not shrink hit targets into unusable widths or overlap controls.
- A focused test at the reported single-row Explorer state should show the button if room exists, or verify correct More fallback otherwise. No broad viewport/theme matrix.

**Grounding:** `extension/app.mjs` owns `#refresh`; `extension/explorer-layout.mjs` currently includes it in `navigation=['back','forward','up','refresh']`. Adjust placement/width accounting, **not** reload semantics. Any apparent spare width must be validated against actual DOM dimensions.
