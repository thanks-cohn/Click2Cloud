# Click2Cloud — Issues and Bugs

**Repository issue register; owner-reported November 7, 2026.** These Markdown files are scoped Codex work items, not evidence that any change has been implemented. Keep defects separate from feature/UX requirements and record actual Chrome test results before closing.

**Current Explorer performance P0 (after CURRENT data-integrity blocker):** [Whole-Shelf Explorer stutter/latency, REDOWN-informed improvements](Bugs/P0_WHOLE_SHELF_EXPLORER_LATENCY_STUTTER_REDOWN_PARITY_PLUS_2026-11-08.md), with an [implementation-ready Codex assignment](../docs/requests/CODEX_P0_ZERO_STUTTER_EXPLORER_PERFORMANCE_REDOWN_REFERENCE_2026-11-08.md). This is a broader owner-reported latency defect than the earlier right-click-only P0; measure input-to-paint in installed Chrome, then repair code.

## Bugs (existing functionality fails or is unacceptably slow)

- **P1 — Explorer condensed toolbar shows wrong controls:** [one-row slider must show only Back, Forward, Up, Refresh, More](Bugs/P1_EXPLORER_CONDENSED_TOOLBAR_NAVIGATION_ONLY_2026-11-09.md). Preserve every other command inside More and keep expanded toolbar behavior; no application code changed by this report.

- **P0 HIGHEST PRIORITY — established user CURRENT records missing, but Chrome still retains menu generation 583:** [owner's installed-Chrome incident](Bugs/P0_CONNECTED_BUT_EXPLORER_SETTINGS_CONFIG_RECORD_MISSING_2026-11-08.md) · [extensive Codex forensic recovery, repair and prevention assignment](../docs/requests/CODEX_P0_CURRENT_STATE_LOSS_FORENSIC_RECOVERY_HARDENING_2026-11-08.md). Implementation on `dev/p0-current-recovery` (`84f0e19`, 0.3.14): [forensic repair/evidence](../docs/evidence/current-recovery/FORENSIC-HANDOFF.md). **OPEN:** original owner Windows profile/recovery and destructive trigger remain unverified. Protect data first; do not reset native metadata or claim recovery without independent proof.
- **P0 URGENT — Shelf startup fails repeatedly; Cloudflare login and Save results unusable:** [owner bug](Bugs/P0_SHELF_BOOT_LOGIN_FAILURE_REMOTES_FIRST_2026-11-08.md) · [next Codex repair task](../docs/requests/CODEX_P0_BOOT_LOGIN_REMOTES_FIRST_2026-11-08.md). Boot must show Remotes and allow login without R2/Worker/menu prerequisites; no apology splash or repeated Retry.
- [P1 — WebP preview displays “OK” instead of image](Bugs/P1_EXPLORER_IMAGE_PREVIEW_DISPLAYS_OK_INSTEAD_OF_IMAGE_2026-11-08.md). Screenshot-reproduced on Windows Chrome; diagnose nested File API status/bytes and verify actual saved object integrity.
- [P1 — Grid view renders file icons instead of actual image thumbnails](Bugs/P1_EXPLORER_GRID_VIEW_HAS_NO_IMAGE_THUMBNAILS_2026-11-08.md). Source-confirmed: current Grid does not create image elements; fix with authenticated, bounded, visible-only thumbnail reads.
- [P0 — Explorer right-click menu latency and overall responsiveness](Bugs/P0_EXPLORER_CONTEXT_MENU_LATENCY_AND_RESPONSIVENESS_2026-11-07.md). Core file interaction must feel instant, be secure, and be measured with real before/after Windows Chrome traces.
- [Earlier P0 — Explorer file left/right click can freeze](../bugs/CRITICAL/P0_EXPLORER_FILE_LEFT_CLICK_RIGHT_CLICK_FREEZES_UI_2026-11-06.md). Existing report lives under the older root `bugs/` directory; it is related, not silently moved or resolved.
- [Existing P0 — Destinations lost after login; recurring approval; Explorer opens blank](../bugs/CRITICAL/P0_DESTINATION_PERSISTENCE_REAUTH_EXPLORER_STARTUP_2026-11-07.md). Maintain the current owner priority: saved configurations and approvals survive OAuth cycles.

## Issues (desired UX, controls, presentation, and missing capabilities)

- **P1 — Destinations Manager visual clarity and debug/UI separation:** [compact rows with dividers; remove Saved locally/Saved Default diagnostic banners from dialog](Issues/P1_DESTINATIONS_MANAGER_COMPACT_DIVIDED_ROWS_NO_DIAGNOSTIC_BANNER_2026-11-09.md). Keep mode counts, Default identity and connection status accessible through trusted programmatic diagnostics, not dumped above saved destinations.

- [Remotes — full-width independent screen without Explorer left navigation](Issues/P1_REMOTES_TAB_MUST_NOT_SHOW_EXPLORER_LEFT_NAVIGATION_PANEL_2026-11-08.md). Hide the entire file tree outside File Explorer; retain login cards and restore Explorer state when returning.
- [Explorer — one bottom-right Manage Destinations button, conventional full-path address entry, and Grid view](Issues/P1_EXPLORER_SINGLE_MANAGER_ADDRESS_FIELD_AND_GRID_VIEW_2026-11-07.md).

## Full-suite

- **P1 — OPEN: intermittent Depth save in Windows full-suite tests** ([failure log and investigation gates](Bugs/P1_FULL_SUITE_INTERMITTENT_DEPTH_GENERATION_AUTHORIZATION_2026-11-14.md)). The `feat/base01-two-tier-diagnostics` worktree passed 384/385 tests in the latest owner run, but `tests/depth-plan-recovery.test.mjs` intermittently returned `STALE_GENERATION` or `AUTHORIZATION_LOST` where the fixture expected `completed`; the same Depth file passed 4/4 in isolation. Root cause unverified; do not dilute authorization checks or claim live-provider regression. Windows LF/CRLF fingerprint mismatches are recorded as separate test-environment observations in the same report.

## Shared requirements

- Click2Cloud's Simple, Narrow, Depth, Quick Select, Default, canonical API and Explorer data model remain authoritative.
- Prioritize performance from the start: responsiveness is a core product criterion, not a final polish pass. Rendering a local UI context menu must not wait unnecessarily for remote network or service-worker readiness, but permission checks and cloud writes must remain authoritative.
- Do not reset user storage, remove saved destinations, overwrite setup approval, mutate production Cloudflare resources, or change REDOWN as a quick fix.
- Keep source ↔ API ↔ UI ↔ persisted behavior documentation and tests synchronized, including the immutable baseline and CURRENT behavior map; report PASS, FAIL, BLOCKED and NOT TESTED separately.


CURRENT incident follow-up: 0.3.15 production repairs and evidence are on `dev/p0-agent-reliability-ratchet` ([handoff](../docs/evidence/reliability-ratchet/HANDOFF.md)). Original physical deletion and owner Windows recovery remain OPEN; assisted rebuild is new owner-confirmed intent, not recovered history. No production-ready claim or live-provider pass.

## November 9 right-click menu corrections (source implemented; installed acceptance pending)

- **P0 BUG — Depth selected-bucket hierarchy does not appear:** [Depth nesting and single-bucket nested exception](Bugs/P0_DEPTH_SINGLE_BUCKET_BRANCH_AND_NESTING_MISSING_2026-11-09.md). An eligible nested Depth bucket must branch even when it is the sole Depth-selected bucket; no artificial submenu when the bucket has no eligible directories.
- **P0 ARCHITECTURE / UX ISSUE — display checkmarks must be additive and non-destructive:** [Independent Simple/Narrow/Depth display plus per-row Change Visibility](Issues/P0_RIGHT_CLICK_INDEPENDENT_MODE_DISPLAY_AND_ROW_VISIBILITY_2026-11-09.md). User-facing `Narrow` is internal `nested`; `product.show.simple/nested/depth` are independent visibility checkmarks, not exclusive modes. Unchecking a mode never removes its saved destinations or Depth bucket selections.
- **P1 UX ISSUE — Depth Destinations Manager does not offer Make Default:** [Depth row action rule](Issues/P1_DEPTH_DESTINATIONS_MANAGER_NO_MAKE_DEFAULT_2026-11-09.md).

The original issue records retain the observed defects and requirements. Source repairs, representative browser tests and isolated live R2 evidence are now documented in [the consolidated handoff](../docs/evidence/composition-remaining/HANDOFF.md). Actual installed Windows acceptance remains unverified; newer queued issues remain open.

## November 12 owner reports — OPEN

- **P0 owner finding: + Right Click → Save configuration reports `DESTINATION_EXISTS`, but the UI hides the code.** [Console evidence, root-source branch and Edit existing UX](Bugs/P0_RIGHT_CLICK_SAVE_ACTION_GENERIC_OPERATION_FAILED_2026-11-12.md). The duplicate Simple destination guard explains this rejected configuration action; it is NOT proof that a native cloud upload failed.
- **P1 UX ISSUE: explicit Save button inside Manage Destinations.** [Configuration Save control and durable-commit acceptance](Issues/P1_MANAGE_DESTINATIONS_EXPLICIT_SAVE_BUTTON_2026-11-12.md). Do not confuse configuration Save with native context-menu file Save; preserve existing immediate controls and saved configuration.
- **CRITICAL architecture reference:** [Depth bucket submenu/Save here rules](../architecture/depth.md) and [GO TO / LOGIN / REFRESH, red OAuth icon](../architecture/go-to-login-refresh.md).

## November 14 owner report — CRITICAL / OPEN

- **P0 CRITICAL — Narrow omits bucket-root save choice inside the bucket submenu:** [Narrow bucket root missing from nested Chrome right-click menu](Bugs/P0_CRITICAL_NARROW_BUCKET_ROOT_MISSING_FROM_NESTED_RIGHT_CLICK_MENU_2026-11-14.md). The bucket remains the submenu parent; its first actionable child must save to root (`prefix: ""`), followed by its configured child folders. Currently Simple is an unwanted workaround; investigate apparent first-child substitution. Installed-Chrome acceptance and live R2 key verification pending.

- **P0 CRITICAL — Depth-only right-click collapses to one flat Cloudflare save action with an unknown destination:** [Reopened Depth native hierarchy bug; November 14 owner recurrence](Bugs/P0_DEPTH_SINGLE_BUCKET_BRANCH_AND_NESTING_MISSING_2026-11-09.md). With only Depth folders selected, the bucket's eligible nested folders must appear; no silent fallback to an ambiguous flat action. Prior source/test passes are not installed-Chrome acceptance. Actual save target requires independent R2 verification.
