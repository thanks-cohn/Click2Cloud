# Aesthetic Ideas — Modular Presentation and Motion

This folder holds **ideas and implementation specifications** for optional, detachable features owned by REDOWN's Aesthetic API (`src/aesthetic/`). A design note here is not evidence that the feature has been implemented or tested.

## Ideas

- [Advanced Theme Switch Animation Module](ADVANCED_THEME_SWITCH_ANIMATION_MODULE_2026-11-21.md) — optional Settings toggle: theme spheres near the Shelf's sun/moon area, drop-on-selection motion, controlled color-wave transition, typography change and a single anime-style sheen. Advanced animation is **OFF by default**; one or two lightweight ordinary feedback effects may remain available to everyone. Includes reduced-motion, touch/keyboard, memory, cancellation and module-removal requirements.

## Architectural rule

The base Aesthetic API remains usable without this folder's feature. Runtime implementation, if approved after the current P0 repair, belongs in a separate optional module under `src/aesthetic/motion/` with scoped CSS; it must never be imported by the privileged Chrome context-menu registrar, OAuth, remote-save engine, screenshot pipeline or History persistence. Removing the module must leave the extension functional and the theme selector able to switch instantly.

**Absolute development priority:** Fix, implement and verify the disappearing native right-click menu using [the controlling REDOWN 0.3.23 request](../next-codex/NEXT_CODEX_REQUEST_2026-11-21_P0_RIGHT_CLICK_ALWAYS_AND_LONGEVITY.md) before spending implementation effort on advanced animations.
