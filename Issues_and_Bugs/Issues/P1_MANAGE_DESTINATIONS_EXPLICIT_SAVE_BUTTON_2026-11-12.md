# P1 UX ISSUE — Add an explicit Save button in Manage Destinations

**Owner requested:** 2026-11-12 (America/Chicago)  
**Product:** Click2Cloud  
**Priority:** P1 UX; must not interfere with P0 right-click Save failure investigation  
**Status:** REQUESTED / NOT IMPLEMENTED OR VERIFIED.

## Owner's request

> In **Manage Destinations**, provide a clear **Save** button.

Today the owner cannot readily trust whether edits to a destination, mode, visibility, selected bucket or depth are being saved. The action should be explicit and discoverable, not implied by closing the editor, navigating away, or a misleading generic status.

## Proposed UI

- A prominently discoverable **Save** control within the Manage Destinations editor/dialog, placed near **Cancel/Close** and accessible at small Shelf widths. This is a **configuration Save**, distinct from **right-click Save file to cloud**.
- Show current unsaved/dirty state with minimal visual clutter; **Save** enables when the user has valid pending edits. Preserve existing fast in-place controls that intentionally apply immediately, but label/handle them consistently. Do not unintentionally move existing quick toggles into an unsaved draft.
- Clicking **Save** calls the existing canonical typed configuration API (inspect `previewConfigChange` / `commitConfigChange` and the real `3+1.1` registry), validates the expected revision, commits atomically, and confirms durability and any native-menu reconciliation result separately.
- If configuration persisted but native right-click registration is still pending/failed, show **Saved configuration; menu update needs attention** instead of falsely declaring the whole save failed or quietly rolling configuration back.
- Failure should preserve all draft edits and previously committed state. Explain the specific conflict, missing permission, unavailable storage, or stale revision, with a safe retry; no silent data loss or forced resets.
- **Cancel** must not destroy already committed independent immediate toggles. The draft/save model must be documented clearly and tested across Simple/Narrow/Depth, hidden rows, Default/Quick and multiple accounts.

## Acceptance tests

1. Modify a destination label/folder/bucket scope/depth; click **Save**; leave and reopen Manage Destinations; the exact intended value persists.
2. Save with multiple pending changes; all succeed atomically or a clear conflict/error retains the unsaved draft. No partial override of saved destinations.
3. Existing immediate toggles, if retained, visibly communicate immediate persistence without requiring double-save.
4. Closing without Save follows one explicit design: prompt to discard/keep editing when dirty, rather than silently losing a change.
5. Save does not create cloud objects, upload files, silently alter Defaults, remove other entries, repeat setup approval, mutate production Worker/R2 or reset credentials.
6. Native menu preview and actual generation reconcile consistently; avoid false "Saved" if the durable commit was never acknowledged.
7. Minimal, attractive, keyboard accessible, responsive in light/dark themes.

**Related but separate critical bug:** [Right-click Save fails with generic operation message](../Bugs/P0_RIGHT_CLICK_SAVE_ACTION_GENERIC_OPERATION_FAILED_2026-11-12.md). Two distinct Save buttons have different functions; don't conflate them.

**Scope:** UX/specification request only; no runtime implementation claimed.
