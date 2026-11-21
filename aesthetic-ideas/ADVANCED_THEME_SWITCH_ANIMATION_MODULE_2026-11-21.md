# Aesthetic Ideas — Advanced Theme Switch Animation Module

**Owner request:** November 21, 2026  
**Product:** REDOWN / Click2Cloud 0.3.23 roadmap  
**Status:** Approved optional Aesthetic API idea, specification only; NOT implemented by writing this file  
**Implementation priority:** After the P0 repair of the disappearing native Chrome right-click menu and its real Chrome regression proof. Do not let an animation delay or destabilize that release gate.

## Intent — "living color" theme switching

Add an optional **Advanced Animations** switch to Settings → Appearance, entirely under the Aesthetic API. The user hovers near the existing sun/moon appearance control, and a compact constellation of **small, glossy colored spheres** opens around it. The spheres suggest depth through size, perspective, shadow, layering and positioning, but remain independently clickable/focusable. Each sphere corresponds to an installed **Shelf theme** or, in a clearly labeled second-level picker, an appropriate theme-specific style. It is a theme chooser, not a separate save feature or Chrome-wide shortcut.

When the user selects a sphere:

1. The spheres **drop away together** in a brief, playful gravity-inspired motion, not a physically simulated scene.
2. The chosen theme's colors **spread aesthetically across the visible Shelf**—an intentionally stylized wash/wave of color. The color-change stage briefly affects surfaces, navigation and component accents, while existing readable foreground/font styling is retained.
3. Only **after the surface/color stage**, the selected theme's typography (font roles, weight and text colors) joins the transition.
4. A **single narrow, quick "anime sheen" glint** passes through the main text/header region, like a sliver of light or energy. It must not become a strobe, repeated bright flash, fullscreen whiteout or continuous moving overlay.
5. The selected theme arrives in its **complete final styling**: color, typography, control shapes, cards, spacing, R tile and all other theme-defined presentation rules. The exact theme selection is persisted through the existing Aesthetic API.

This is a visual flourish around **real theme selection**, never a simulated theme switch: the authoritative selected theme remains correct even if an animation is interrupted, reduced, disabled or unavailable.

## Settings and default behavior

- New setting **Advanced Animations: Off / On**, with **Off as the safe default**.
- With Advanced Animations **Off**, the existing sun/moon button and theme selector retain their familiar function, with only **one or two very inexpensive baseline feedback effects** allowed for all users (e.g. a 100–160 ms opacity/tint feedback and a subtle focus/selection confirmation). No spheres, particle renderer, font sheen, extra mounted UI, moving blur or heavyweight scene.
- With Advanced Animations **On**, the sphere constellation and staged theme-change choreography become available **only within the Shelf**, not in Chrome's native right-click menu, browser toolbar badge or external side-panel header.
- The setting is independent of the selected theme and nested style, and is persisted in a small presentation-only preference. It does **not** change cloud-related CURRENT configuration, account credentials, OAuth, saved destinations, History, screenshot jobs or the native menu registrar.
- A dedicated **Preview effect** control may trigger a demonstration inside Settings without applying a different stored theme; the real picker still commits selected themes using Aesthetic API's own verified selection mechanism.
- If the user enables **Reduce Motion** in the operating system/browser, automatically skip the advanced choreography and switch immediately with minimal nonmoving confirmation, even if the in-app toggle was left On. Also respect high-contrast and accessibility modes.
- User may disable advanced motion at any point; this must immediately remove active visual overlays and listeners, without reverting a theme that has already been committed.

## Pointer and keyboard interaction

- The **sun/moon button remains an independently clickable Light/Dark toggle**. Its hit target must never be swallowed by the spheres. Avoid recreating the already-reported **More menu / sun-moon overlap** at compact widths.
- Hover/focus near the appearance area may reveal a small clearly bounded constellation/popup, but support **click/tap to open** on touch/pen devices and an accessible adjacent appearance-picker control or explicit button—do not rely on hover only.
- Each sphere represents an actual available theme with an **accessible name**, visible/assistive label or tooltip and focus ring. Spheres remain easy to target at small Shelf widths; they must not become too tiny for real use. An alternative **list-based menu** is available for keyboard/screen-reader interaction.
- Keyboard: focus the picker, arrow through choices as appropriate to menu/listbox semantics, Enter/Space to select, Escape to dismiss and return focus to the trigger. Follow established Shelf local keyboard ownership; **no Chrome-wide shortcut commands**.
- At compact widths, reposition or simplify the constellation, or fall back to a conventional list. Never place animated balls over the More trigger, moon/sun control, confirmation buttons or form inputs. Ensure keyboard focus is never trapped in an unmounted element.
- Selecting **Nostalgia** may reveal its three internal style choices (**Kawaii, Dungeon Master, Heroine**) in an explicit second step or submenu; do not misrepresent Minimal's five original palettes as standalone themes. The ball colors should match the actual corresponding theme/style preview.

## Aesthetic API isolation (mandatory)

**All effect code is a detachable Aesthetic API animation module. It must never be an essential import of, or gate for, REDOWN's core.**

Proposed implementation layout, after P0:
\`\`\`text
src/aesthetic/
  host.mjs                 # existing theme registry / authoritative apply+restore
  packages.mjs             # existing theme descriptions
  motion/
    theme-switch-motion.mjs  # OPTIONAL mount/unmount/controller
    sphere-picker.mjs        # OPTIONAL visual theme selection renderer
extension/
  aesthetic-motion.css    # OPTIONAL scoped stylesheet; no global override
aesthetic-ideas/
  ADVANCED_THEME_SWITCH_ANIMATION_MODULE_2026-11-21.md  # this design/acceptance spec
\`\`\`

The module exposes a compact visual-only interface such as
\`mountThemeSwitcher({anchor, root, listThemes, selectTheme, motionPreference}) → {open,close,destroy}\`.
Names are **proposed**, not claims that those exports exist today.

- **Authority boundary:** The existing trusted Aesthetic API owns theme and style eligibility, selection, persistence, color roles and typography. The visual module accepts *only* a finite, validated list of themes and makes a callback on direct user selection. No remote JavaScript, arbitrary CSS or data from cloud files.
- **No privileged capabilities:** Do not import or call \`src/core/engine.mjs\`, \`extension/background.mjs\`, native \`chrome.contextMenus\`, OAuth, Cloudflare workers, screenshot providers, History persistence or file transfer APIs. No access to cloud tokens or arbitrary network activity.
- **Lifecycle:** Mount on demand when advanced mode is enabled and the picker is used; close/destroy removes listeners, animation handles, popup DOM, observers and references. Use a single active transition controller with cancellation/coalescing; a second selection cancels/replaces the first without queueing unlimited motion.
- **Graceful removal:** If either motion module/CSS file is deleted, unregistered, fails to import or throws while animating, theme selection must still work through the native standard Aesthetic API selector, with instant fallback and no blank Shelf. The native Chrome right-click menu and extension worker **must be unaffected**.
- **CSS/styling:** Scoped root/overlay classes only. Do not animate thousands of individual filenames, History rows or thumbnail nodes. Prefer **one bounded overlay layer** and compositor-friendly \`transform\` + \`opacity\`. Use CSS custom-property switching only through the host; no eager image snapshots, canvas/WebGL, animated filters, large blur radii, heavy shadows, motion libraries or background workers.
- **Typography staging:** Change the authoritative theme promptly via Aesthetic API and visually choreograph only the overlay; ensure the actual final theme tokens/contrast and screen-reader semantic state remain accurate. Never delay focus, confirmation, saving or route changes until a visual timer ends. If typography font fallback differs by OS, complete without layout jank or remote font loads.
- **No asset licensing surprises:** No sampled copyrighted audio, anime clips, third-party game/logo art, remote icon or font assets. Implement spheres, drops and one glint with light CSS or bundled original tiny vectors.

## Performance and failure limits

- **Absolute rule:** Animation is never on the right-click/menu/transfer hot path. Not on MV3 worker startup, context-menu registration, service-worker wake, screenshot capture, Explorer loading, History sync or the external SNES-style green badge flash.
- A bounded fixed count of spheres (for example ≤8 visible at once), **at most one active overlay and one transition**, with no retained animation queue, long timer chains or event-listener accumulation.
- Use a concise choreography (design target **~350–650 ms total**) while allowing instantaneous completion when the user selects Reduced Motion, a tab becomes hidden, the Shelf closes, the user navigates or resources are constrained. These are visual targets, not a wait requirement.
- Under CPU/memory pressure or missing feature support, **switch the theme immediately** and omit motion. Treat failure to animate as a harmless presentation error, not an action failure.
- Avoid large repaint rectangles, fullscreen CSS filters, per-row transitions or layout thrashing. Test p95 responsiveness and before/peak/post-idle memory in the actual Chrome Shelf; do not claim specific RAM guarantees without measurements.
- Do not play any animation during active worker restart or force the extension service worker to remain alive.
- Respect reduced motion and avoid rapid repeated bright flashes or intense screen-wide luminance spikes.

## Test and acceptance matrix

1. **Off by default:** initial install and existing-user upgrade show no spheres, retain original theme switch and familiar Light/Dark control; optional basic one/two low-cost feedback effects work even with Advanced Off.
2. **On:** hover/focus/tap opens a selectable theme constellation; each ball is a clickable/focusable real theme; compact widths use safe positioning/list fallback; no header More/moon collision.
3. **Sequence:** selection causes bounded simultaneous ball drop → localized color wash → typography arrival → one thin glint → stable finished theme. No ghost overlays or residual old-font colors.
4. **Interactions:** light/dark works independently; keyboard/screen-reader alternatives; Esc dismiss; tapping/hover loss works; switching again during animation cancels previous and commits latest selection. Nostalgia nested styles remain correct.
5. **Persistence:** user chooses advanced Off/On and themes; close/reopen Shelf and restart Chrome; independent Aesthetic preference restores; no lost saved Minimal palette or Nostalgia variant.
6. **No-motion/degraded:** reduced motion, hidden Shelf, background window, unsupported CSS feature, missing motion module, corrupted preference or thrown effect still yield a usable theme picker and correct final theme.
7. **Burst and longevity:** 100+ repeated open/select/close operations; event listener/overlay counters return to baseline, no memory climb or animation backlog; successful right-click and screenshot operations run concurrently unaffected.
8. **Removal test:** physically omit the optional motion module/assets in a test build and verify build/start/Theme selection/Remotes/Explorer/History/native Chrome right-click and verified remote-save path remain functional; distinguish browser evidence from simulation.

## Delivery status and relationship to P0

This document creates **no runtime implementation**. Treat it as a scoped Aesthetic API motion-module specification in \`/aesthetic-ideas\`. The **first release gate remains fixing and independently verifying the disappearing native Chrome right-click menu** using \`next-codex/NEXT_CODEX_REQUEST_2026-11-21_P0_RIGHT_CLICK_ALWAYS_AND_LONGEVITY.md\`. Advanced animation is a later opt-in presentation milestone. **Do not let its presence in the repository displace the right-click repair or the required themes.**
