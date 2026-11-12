# Click2Cloud architecture papers

These papers record owner-approved product behavior and architectural acceptance requirements. They are **not evidence that corresponding Chrome extension runtime changes have been implemented or tested**.

- **[GO TO / LOGIN / REFRESH](go-to-login-refresh.md)** — CRITICAL provider navigation-versus-authorization contract, independent refresh icon next to GO TO, restrained red outline/tint for consent-required OAuth failures, amber for temporary provider outages, user-triggered login recovery, and safe save-intent handling.
- **[Depth](depth.md)** — CRITICAL Cloudflare R2 Depth bucket selection and exact flat-versus-submenu rules; one bucket with even one eligible child yields Save here plus nested children; multiple selected buckets always yield a Cloudflare submenu; each bucket retains its own maximum depth and the Simple/Narrow/Depth display modes remain additive.
- **[Debug Mode and Queue](debug.md)** — Settings-bottom Debug toggle, a minimal everyday Queue (time, filename, location and honest progress/outcome), expandable per-item technical evidence when enabled, and safe Clear all semantics.

**Related current open issues:** [Right-click Save failure and generic error](../Issues_and_Bugs/Bugs/P0_RIGHT_CLICK_SAVE_ACTION_GENERIC_OPERATION_FAILED_2026-11-12.md) and [explicit Save button in Manage Destinations](../Issues_and_Bugs/Issues/P1_MANAGE_DESTINATIONS_EXPLICIT_SAVE_BUTTON_2026-11-12.md).

Follow `AGENTS.md`, the trusted versioned API contracts, non-destructive CURRENT configuration requirements, and installed-browser verification gates when implementing.
