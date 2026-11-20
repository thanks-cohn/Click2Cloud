# Click2Cloud 0.3.21 — Bit o' Polish: Five Built-in Color Palettes

**Final owner request (November 20, 2026):** Leave **Bit o' Polish** (`high-polish`) as the fresh-install default aesthetic in Click2Cloud **0.3.21**. Under Settings → Appearance, when Bit o' Polish is selected, let users recolor that same aesthetic by choosing **exactly five color schemes**. Changing color must NOT switch the selected aesthetic to a different package. Keep `Minimal` and `Remote V1` as independent selectable aesthetics and preserve existing Light/Dark mode.

## The exact everyday Settings UI

```text
Settings
  Appearance
    Appearance: [ Bit o' Polish   v ]
    Color scheme:
      (●) Original Rose       ( ) Ocean Blue         ( ) Emerald Forest
      ( ) Amethyst            ( ) Sunset Amber
      [Five labeled, clickable color-swatch previews]
    Theme: [Dark / Light]  ← existing independent mode
```

- The five options appear directly UNDER the existing Appearance dropdown and only apply while `high-polish` is selected. Each scheme provides a full coherent palette of background/surfaces/text/accents/focus/selection/borders for BOTH Light and Dark. Maintain readable contrast and the current layout, typography, motion and geometry.
- Clicking a scheme repaints immediately; no separate Save button, no reload, no extra warnings or new theme tab. Persist the selection independently of the aesthetic ID; after reopening the Shelf or switching away to Minimal and back to Bit o' Polish, restore the selected color scheme.
- Default scheme **Original Rose** must produce EXACTLY the current high-polish colors, not a recolored reinterpretation. With no prior stored aesthetic selection, `Bit o' Polish` remains the default. Existing explicit user theme choices are never forcibly overwritten.

## Exactly five built-in palettes

| id | UI label | Direction | Suggested light background / accent | Suggested dark background / accent |
|---|---|---|---|---|
| `original-rose` | Original Rose | Existing neutral slate and pink/red; unchanged | `#F4F5F7` / `#B7193E` | `#12151B` / `#FF6687` |
| `ocean-blue` | Ocean Blue | Elegant cool blue and lightly frosted surfaces | `#F1F6FB` / `#1458BA` | `#101722` / `#78B6FF` |
| `emerald-forest` | Emerald Forest | Dark green, pale mineral mint | `#F2F8F5` / `#166C56` | `#101C19` / `#79E0BD` |
| `amethyst` | Amethyst | Clean lilac and purple | `#F6F3FB` / `#7542AD` | `#181323` / `#C4A1FF` |
| `sunset-amber` | Sunset Amber | Warm ivory, copper and amber | `#FBF6F0` / `#A35405` | `#211810` / `#FFC36A` |

The values above are visual anchors; author the full existing Aesthetic color-token family and tune contrast/legibility. `original-rose` MUST exactly preserve the existing highPolish token palette.

## Implementation — extend current Aesthetic API, not another theme engine

- Current sources: `src/aesthetic/packages.mjs` provides the three appearance packages and typed tokens; `src/aesthetic/host.mjs` handles validation, CSS-variable painting and persistence via `aestheticPreferenceV1`; `extension/aesthetic.css` renders CSS tokens; `extension/app.mjs` already has Settings Appearance and Light/Dark selectors. Extend those narrowly.
- Maintain the existing `high-polish` package ID and unchanged aesthetics `minimal` and `standard` (`Remote V1`). Five built-in schemes are **color token overlays** selected under `high-polish`, NOT five extra packages in `aesthetic.list()` and NOT a new independent stylesheet or shadow theme registry.
- Extend the existing Aesthetic API host with validated palette registry/read/apply methods (e.g. `listPalettes`, `getPalette`, `applyPalette`) or a small adjacent Aesthetic API module. Use supported `color.background`, `color.surface`, `color.raised`, `color.text`, `color.muted`, `color.border`, `color.accent`, `color.selection`, `color.focus` typed tokens with BOTH `light` and `dark` values.
- `host.paint(id)` currently removes/applies its CSS variables when an appearance changes; apply the selected palette overlay only *after* applying base `high-polish` tokens, and clear it on other aesthetics. The separate `state.product.theme` dark/light flag still drives the existing light/dark selector and header toggle.
- Persist a small, validated palette ID in storage SEPARATE from the aesthetic choice, e.g. `aestheticPalettePreferenceV1: {schemaVersion:1,id:'ocean-blue'}`. A missing or invalid stored palette falls back to `original-rose` without changing an existing valid aesthetic. Keep current fresh-install default: `src/aesthetic/host.mjs.restore()` currently returns `high-polish` when no stored preference exists. Do NOT change it to Minimal or standard.
- Aesthetic API token validation should reject any unknown/nonbuilt-in palette and invalid color value; do not accept arbitrary user CSS in this feature. Keyboard navigation, labels, selected-state accessibility and light/dark contrast remain usable. UI should update in place without losing focus.

## Tests / acceptance

1. Fresh profile: Bit o' Polish selected, Original Rose selected; visuals exactly match current theme in BOTH dark and light.
2. Each other scheme recolors the whole Bit o' Polish visual system (not just one button accent). Aesthetic selection still reads Bit o' Polish throughout.
3. Switch to Minimal and Remote V1: no Bit o' Polish color overlay leaks. Switch back: last chosen palette restores.
4. Reload browser and Shelf: palette persists, selected aesthetic and existing Dark/Light selection persist independently; invalid palette storage falls back to Original Rose.
5. Exactly 5 named palette options, swatch previews, keyboard/focus accessibility, no layout jumps, no new theme package switching, no changes to cloud save engines or Screenshot behavior.

**Scope:** This is IN SCOPE for the **0.3.21 Codex run**. Auto-Reroute is a separate deferred 0.3.22 Codex request.