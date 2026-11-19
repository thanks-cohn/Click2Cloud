# P1 — Destinations dialogs: Show in Chrome heading above one aligned checkbox row

**Reported:** November 18, 2026  
**Status:** REQUESTED / NOT IMPLEMENTED.  
**Scope:** Click2Cloud Destinations Manager dialog **and** Add/Edit Destination pop-up; presentation-only.

## Owner request

In the Destinations pop-up, the **Show in Chrome** section is visually disjointed. Place the heading **on its own row**, with the three mode checkboxes **together on the row directly underneath**, properly spaced and aligned:

**Show in Chrome**

[☑ Simple]  [☑ Narrow]  [☑ Depth]

Checkboxes should follow the heading rather than sit on the same disjointed wrapping line. The three belong to ONE logical grouped control; in very narrow windows let the row wrap gracefully or compact the gaps without crushing labels. Keep the checkbox/label hit targets obvious.

## Inspected current source

- `extension/app.mjs` Add/Edit Destination renders `#show-controls` as a single inline string: `<span>Show in Chrome</span>` followed by `[data-show="simple|nested|depth"]` plus **All** and **Flat** controls. Keep All/Flat in a **separate subordinate action row** (or aligned action area) rather than interrupting the three checkboxes.
- `extension/app.mjs` Destinations Manager currently renders `<div class="show-controls"><span>Show in Chrome</span>` followed by `[data-manager-show="simple|nested|depth"]`.
- `extension/app.css` currently applies `.dialog-foot,.show-controls{display:flex;align-items:center;gap:8px;padding:12px 20px;border-top:1px solid var(--line);flex-wrap:wrap}`. Shared wrap styling makes the group appear inconsistent at different widths.

## Acceptance

1. Use semantic `<fieldset>`/`<legend>` or accessible grouped header + control rows; do not duplicate labels or introduce independent checkbox state. Preserve mode identities `simple`, `nested` (displayed as **Narrow**), and `depth`.
2. Verify the heading followed immediately by three visually adjacent aligned checkboxes in the actual owner-reported dialog, preserving ordinary operation. Do not require a full aesthetic/theme/viewport test matrix.
3. All/Flat in Add/Edit Destination remain functional and visually separated from mode checkboxes.
4. Checkbox toggles must stage the same `setShowInChrome` change, never auto-save prematurely. Keep existing draft/Save/Cancel/retry, mode-specific menus, actual native application status and accessibility.
5. No Worker, OAuth, right-click engine, R2 or saved destination logic changes. Add DOM row bounding-box assertions and before/after screenshots.

**Linked next run:** [next-codex master](../../next-codex/CODEX_NEXT_EXPLORER_SEARCH_UI_AND_WORKER_IMPLEMENTATION_2026-11-18.md).
