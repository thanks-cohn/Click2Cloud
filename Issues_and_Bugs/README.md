# Click2Cloud — Issues and Bugs

**Repository issue register; owner-reported November 7, 2026.** These Markdown files are scoped Codex work items, not evidence that any change has been implemented. Keep defects separate from feature/UX requirements and record actual Chrome test results before closing.

**Current most urgent Explorer performance P0:** [Whole-Shelf Explorer stutter/latency, REDOWN-informed improvements](Bugs/P0_WHOLE_SHELF_EXPLORER_LATENCY_STUTTER_REDOWN_PARITY_PLUS_2026-11-08.md), with an [implementation-ready Codex assignment](../docs/requests/CODEX_P0_ZERO_STUTTER_EXPLORER_PERFORMANCE_REDOWN_REFERENCE_2026-11-08.md). This is a broader owner-reported latency defect than the earlier right-click-only P0; measure input-to-paint in installed Chrome, then repair code.

## Bugs (existing functionality fails or is unacceptably slow)

- [P0 — Explorer right-click menu latency and overall responsiveness](Bugs/P0_EXPLORER_CONTEXT_MENU_LATENCY_AND_RESPONSIVENESS_2026-11-07.md). Core file interaction must feel instant, be secure, and be measured with real before/after Windows Chrome traces.
- [Earlier P0 — Explorer file left/right click can freeze](../bugs/CRITICAL/P0_EXPLORER_FILE_LEFT_CLICK_RIGHT_CLICK_FREEZES_UI_2026-11-06.md). Existing report lives under the older root `bugs/` directory; it is related, not silently moved or resolved.
- [Existing P0 — Destinations lost after login; recurring approval; Explorer opens blank](../bugs/CRITICAL/P0_DESTINATION_PERSISTENCE_REAUTH_EXPLORER_STARTUP_2026-11-07.md). Maintain the current owner priority: saved configurations and approvals survive OAuth cycles.

## Issues (desired UX, controls, presentation, and missing capabilities)

- [Explorer — one bottom-right Manage Destinations button, conventional full-path address entry, and Grid view](Issues/P1_EXPLORER_SINGLE_MANAGER_ADDRESS_FIELD_AND_GRID_VIEW_2026-11-07.md).

## Shared requirements

- Click2Cloud's Simple, Narrow, Depth, Quick Select, Default, canonical API and Explorer data model remain authoritative.
- Prioritize performance from the start: responsiveness is a core product criterion, not a final polish pass. Rendering a local UI context menu must not wait unnecessarily for remote network or service-worker readiness, but permission checks and cloud writes must remain authoritative.
- Do not reset user storage, remove saved destinations, overwrite setup approval, mutate production Cloudflare resources, or change REDOWN as a quick fix.
- Keep source ↔ API ↔ UI ↔ persisted behavior documentation and tests synchronized, including the immutable baseline and CURRENT behavior map; report PASS, FAIL, BLOCKED and NOT TESTED separately.
