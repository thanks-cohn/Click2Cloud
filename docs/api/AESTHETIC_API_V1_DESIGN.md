# Click2Cloud Aesthetic API v1 — design contract

**Status:** Design specification for a future Codex implementation. Not implemented or released by this document.
**Principle:** Aesthetics affect appearance only; they cannot change application behavior.

## Architecture

**High Polish is aesthetic overlay #1 implemented *through* the Aesthetic API, not a parallel styling system.** Settings → Appearance → High Polish Mode selects that first built-in overlay. OFF/default selects the existing Standard overlay. Switching does not reload, restart, or modify working cloud/auth/save/history behavior. Light/Dark remains an independent preference.

The **same versioned API** should eventually support third-party styles (classic Mac, Windows 98, retro, futuristic glass, etc.) without changes to the business logic or privileged application code. In v1, ship only Standard and High Polish; **document** public package extension points but do not build public installation, marketplace, or unrestricted styling/code loading.

## Reuse standards instead of inventing new ones

- Use **CSS custom properties** for design-token application and **semantic component selectors/parts** for styling hooks. Use standard CSS layering/scoping where supported. Avoid a new CSS execution engine.
- Follow **Design Tokens Community Group (DTCG)-style** token names/types where practical; document precise schema and versioning. Use predictable categories: color, typography, spacing, sizing, borders/radii, shadows/elevation, motion, focus/disabled/hover states.
- Manifest fields should follow ordinary JSON conventions, such as \`schemaVersion\`, \`id\`, \`name\`, \`version\`, \`compatibleApiVersion\`, \`tokens\`. Prefer semver for package compatibility and a JSON Schema/typed validator; do not invent complex proprietary syntax.
- Provide a documented **register / validate / apply / get-active / reset-to-standard** host interface. Theme packages only supply declarative tokens and allowed assets; never authorize cloud API calls, auth modifications, save routing or filesystem operations.
- Ensure names and semantics are intuitive for future authors. Provide versioned tokens, component inventory, example manifest, migration rules, compatibility/fallback behavior, and short copyable examples under \`docs/api/\`.

## Presentation-only boundaries

- Scope all styles and component overrides to the active aesthetic. No injection of privileged JavaScript, arbitrary networked code, direct access to cloud tokens, untrusted remote CSS, or user data. Validate uploaded assets/types/sizes if later supported.
- Style all areas consistently: nav, Remotes, Explorer tree/list/toolbar, context menus and overlays, gallery/previews, History, Settings, diagnostics, empty/error/loading states and accessible focus.
- Preserve keyboard/focus, contrast, sizing, responsive layout, overlay stacking, reduced-motion and performance; malformed/incompatible overlay falls back to Standard without deleting user settings.
- **Existing image-loading animation remains a separate, already implemented module.** History should reuse the same selected loading animation without creating a new renderer. Aesthetic themes do not take ownership of image-fetching or animation-setting persistence.

## Verification for the implementation run

1. High Polish is loaded through the **same Aesthetic API** as Standard, so deleting/disabling High Polish has no side effects on cloud operations.
2. Switching overlays mid-session leaves saved destinations, active jobs, History, credentials, selected loading animation and file reads untouched.
3. Confirm accessible, polished visual coverage across all pages and menus at varied window sizes and with light/dark.
4. Validate API manifest schema, version mismatch/fallback, bad tokens, overlay collisions and safe restoration.
5. Add real implementation documentation and minimal example package to \`docs/api/\` on the implementation branch. Clearly distinguish conceptual API names from actual exported functions.

**No public theme plugins are executed in this phase; only the documented extensibility contract is required.**
