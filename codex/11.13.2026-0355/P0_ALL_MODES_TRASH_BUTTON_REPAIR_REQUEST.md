# CODEX REQUEST — P0 Fix Destinations Manager Trash Buttons (Simple + Narrow + Depth ONLY)

**Owner report:** 2026-11-13, America/Chicago  
**Repository:** `thanks-cohn/Click2Cloud`  
**Starting branch:** `codex/depth-working-first-implementation` (record exact HEAD before changes; owner reports bug in installed Windows Chrome)  
**Priority:** P0 functional UX — every destination Trash action is unusable, preventing owner-controlled removal of saved menu entries  
**Scope:** Fix the Trash-button click → confirmation → staged deletion → explicit Save → durable configuration → native menu reconciliation workflow in **ALL THREE** Destinations Manager tabs. NOTHING ELSE.  
**Deliverable:** Minimal source repair, focused regression tests, installed-browser observations, and before/after evidence. Do not merge into main.

## 0. Owner's directive — fix deletion, not the menu

> **NONE of the Trash buttons work: Simple, Narrow, or Depth. Edit responds, but Trash does not delete. Fix ONLY Trash across the three tabs.**

No redesign of Depth, Narrow, Simple, Cloudflare menus, visibility, folder hierarchy, bucket-label handling, Default, Quick Select, saved object routing, account authorization, or the rest of Destinations Manager. Do not solve other known issues under this work order. If you encounter other issues, document them without changing their code.

**Non-destructive constraints (mandatory):**
- Never clear/replace IndexedDB, `chrome.storage`, user configuration, saved destinations, approval state, OAuth tokens, or Cloudflare resources to reproduce or fix this.
- Never delete actual Cloudflare R2 objects, buckets, or folders. These Trash controls remove **menu configuration records only**.
- Never bulk-delete, auto-deduplicate, or “clean up” existing `2D` entries. They may be deliberately distinct Narrow presentations pointing to the same physical target.
- Never delete a Depth scope when the user intended to remove a Narrow or Simple destination, and vice versa. No hidden side effects to Default/Quick or mode display flags unless required by an existing contract and individually verified.
- Preserve all non-deleted records *byte-for-byte where practicable*, including presentation ID, target, labels, custom level labels, hidden flags, and per-bucket `maxDepth`.
- Do not modify tests to conceal failures or report fixture checks as proof of actual installed Chrome behavior.

## 1. Observed incident — treat these as facts, not proof of root cause

1. Owner had added `2D` Narrow destinations, attempted to Trash them, added again, and eventually saw approximately ten accumulated entries.
2. **Edit works** on those entries but **Trash appears inoperative**. It is not established whether a confirmation prompt appears, is suppressed, or whether a change reaches persistence.
3. Owner then explicitly confirmed this failure is **not Narrow-only**: **Simple Trash also fails and Depth Trash also fails. NONE of the three tabs can reliably delete its entries.**
4. Owner has observed three same-named `2D` rows change to “Default” together when one was selected, while another similarly named row did not. Source suggests the three may share a canonical physical target; this observation is diagnostic context ONLY. **Do not change Default logic in this task.**
5. Bucket `valentiens` and menu label/flattening behavior are separate issues and are **out of scope**.

A root cause has **not** yet been confirmed in the owner's live Chrome extension. Start with the shared failure point, verify a minimal repro, and avoid assuming CSS, browser dialogs, stale state, or duplicate IDs are definitively responsible.

## 2. Source investigation — precise entry points

On starting HEAD, inspect and instrument only the necessary paths:

- `extension/app.mjs`:
  - `manager(filter='simple', page=0, session=null, message='')`.
  - `rowHtml` emits per-row `<button data-delete="...">` in all modes.
  - `$$('[data-delete]').forEach(b => listen('[data-delete="'+b.dataset.delete+'"]', 'click', async () => {...}))` binds each Trash action.
  - Delete handler currently calls native `confirm('Remove this destination from the configuration when you save? Cloud files and folders are kept.')` BEFORE staging a change. If confirmation fails, is suppressed, or returns false, it exits silently.
  - Simple/Narrow stage `{type:'deleteDestinationConfig', mode:filter, id:items[i].id}`.
  - Depth stages `setDepthDisplayBuckets` with exactly the selected scope omitted.
  - `destinationDraft(session)`, `stageScopes`, `rerender`, `bindDestinationSave`, `change`, and explicit Save/Retry Save handle the draft and durability.
- `src/api/config.mjs` `applyConfigChanges`: validate mode-specific removal by unique ID and exact Depth scope; do not alter unrelated modes.
- `src/api/service.mjs` `commitConfigChange`: requires explicit confirmation flag/owner intent for deletions and Depth scope removal.
- `src/persistence/current-store.mjs`: atomic CURRENT commit, expected revision, idempotency handling, durable read-back.
- `src/chrome/registrar.mjs` / `src/core/menu-spec.mjs`: inspect-only unless *demonstrably essential* to reconcile removed entry, with no menu redesign.
- `extension/app.css` / `extension/depth-destinations.css`: inspect pointer hit-testing, overlays, focus, disabled state only if needed; no styling refresh.

**Particularly investigate the shared binding idiom** `$$('[data-delete]')` + `listen('[data-delete="N"]', ...)` and how the dialog rerender/replacement affects listeners, and whether `window.confirm` behaves reliably within the modal Shelf/Chrome extension context. Note that Edit uses a different binding path and works: this narrows, but does not prove, the failure point.

## 3. Required repaired behavior — one click, one record

For each of **Simple, Narrow, Depth**:

1. Click Trash on a visible saved row.
2. Show a **reliable, accessible confirmation** that clearly says it will remove only the destination/menu configuration and keep files and folders in cloud storage. Implement an in-app confirmation dialog if native `window.confirm` is the culprit, or otherwise repair the proven failure with the smallest patch.
3. **Cancel** changes absolutely nothing.
4. **Confirm** stages a deletion for exactly the intended row and provides visible “Unsaved changes” feedback. It must NOT silently delete the cloud destination or commit without the established Save workflow.
5. Click shared **Save** to commit the deletion atomically; distinct UI feedback must differentiate “configuration saved” from “Chrome menu update pending/failed,” without resurrecting an already-persisted deletion.
6. After Save, reopening Destinations Manager, closing/reopening the Shelf, and reloading/restarting installed Chrome must show the specific deleted configuration gone. The native right-click menu must cease offering the deleted entry after successful reconciliation; independently retained entries must still be present and work.
7. For **Narrow**, Trash by **presentation ID**, not canonical `targetKey`, label, visible position alone, or ancestor path. Intentional same-target/different-label presentations MUST survive individually.
8. For **Depth**, remove only the chosen `configs.depth.scopes` selection while preserving every remaining scope's target, depth, hidden state, and hierarchy.
9. For **Simple**, remove only the selected `configs.simple.destinations` row.
10. Correctly handle current manager pagination, repeated deletions in one draft, button click after another delete/rerender, tab switching with pending changes, quick repeated clicks, stale revision conflicts, and menu reconciliation retries. Never mis-map a displayed row index to another item.
11. Clear success/error feedback; no silent no-op when the callback errors, confirmation cannot be shown, stage fails, or persistence fails.

**Do not infer “deleted” from merely hiding a row in an unsaved draft.** Commit and independently read back the exact state before claiming success.

## 4. Focused test matrix — must test all three modes

| Case | Required result |
| --- | --- |
| Simple, one destination, Cancel | No state/menu change |
| Simple, one destination, Confirm + Save | Exactly one Simple record removed; others untouched |
| Narrow, two entries with identical physical target and distinct IDs/labels | Delete one only; sibling remains; correct path preserved |
| Narrow, multiple `2D` entries with same display title | One selected ID deleted, no accidental batch delete, no regeneration |
| Depth, two selected buckets with distinct `maxDepth` | Remove one scope only; other retained at same depth |
| Depth, only one bucket | After explicit confirm+Save, scope absent, no phantom tree |
| All three enabled, delete one from each in separate saves | No cross-mode config loss, no unexplained menu mutation |
| Multiple staged deletes before Save | Exactly selected entries removed, no stale-index error |
| Cancel/close with unsaved delete | No unintended durable removal; existing dirty-draft contract respected |
| Save commit succeeds, menu register fails/partial | Durable state accurate; Retry Save reconciles without recreating deleted entries |
| Revision conflict/extension background failure | Explain failure, no accidental loss or duplicate additions |
| Reopen manager, reload Shelf, Chrome restart | Deleted rows stay absent; other entries remain |
| Installed Chrome right-click menu | Deleted action absent; surviving actions route to correct targets |

Use isolated fixtures for destructive-looking repros. On the owner's profile, **read-only diagnostics or explicitly selected UI deletion only**; no scripted deletion of existing configurations without owner's explicit selection. Use a disposable test Chrome profile for automated add/delete tests, so the owner's data remains intact.

## 5. Verification and reporting

- Record starting commit, exact affected source lines, a minimal reproduction for each tab, the verified root cause (or clearly label unknown), a small targeted diff, and regression tests.
- Provide evidence for the stages: **button event fired → confirmation displayed/accepted → exact stable target ID staged → Save commit receipt → persisted state read-back → Chrome menu generation ACK → actual native menu action removed**.
- Distinguish **source/unit PASS**, **browser fixture PASS**, **installed Chrome PASS**, **live provider PASS**, **BLOCKED**, and **NOT TESTED**. Do not invent installed-Chrome access.
- Verify no R2 objects deleted, no credentials reset, no changes to Default/Quick/Depth hierarchy or bucket-label rules.
- Include before/after row counts and exact removed *presentation IDs* or Depth scope identities (without credentials).
- Do not merge to main. Commit the isolated repair and tests on the work branch and report the SHA, changed files, remaining gaps, and exact manual owner verification steps if live Chrome was inaccessible.

## 6. Scope lock

**Success is exactly this:** In Destinations Manager, **Trash works in Simple, Narrow, and Depth**, deleting exactly the selected saved configuration after confirmation and Save, without breaking other destinations. No further features or redesigns. Nothing else.

**Related owner report (context only):** `Issues_and_Bugs/Bugs/P1_NARROW_2D_DUPLICATE_ACCUMULATION_TRASH_UNRESPONSIVE_2026-11-13.md`. The Narrow duplicate-creation issue and bucket-label presentation issue are NOT authorized for repair here.
