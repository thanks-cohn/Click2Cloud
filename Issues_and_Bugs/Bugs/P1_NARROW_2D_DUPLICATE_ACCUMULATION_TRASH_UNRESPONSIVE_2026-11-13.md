# P1 BUG — Narrow '2D' destinations accumulate; trash fails while Edit works

**Owner observed:** 2026-11-13 15:24:33 CST (America/Chicago, UTC-06:00)  
**Status:** OPEN — reproduced by owner in installed Chrome; cause and durable-state classification NOT VERIFIED  
**Area:** Click2Cloud → Destinations Manager → Narrow (internal `nested`), Chrome context menu, configuration persistence  
**Repository branch inspected:** `codex/depth-working-first-implementation` at `cc8a25231a63fb137e4b7257d3c89fe25560cf85`  
**Severity:** P1 functional/data-integrity risk; escalate to P0 if configured destinations or other modes are lost/rewritten

## Owner's exact observations

1. Owner added Narrow destination(s) labeled **`2D`**, later used the trash control, then added `2D` again. Rather than reliably disappearing, multiple `2D` entries accumulated; at report time approximately **ten** were visible.
2. In **Destinations Manager → Narrow**, **Edit responds normally**, but **Trash does not produce the intended deletion** for the `2D` entries. It is NOT established whether the browser `confirm()` dialog is blocked, fails to surface, is dismissed, or whether deletion is staged but not durably committed.
3. The real R2 bucket is **`valentiens`**. Its first child `2D` appears directly under the **Cloudflare** native right-click entry, with the `valentiens` bucket level omitted. The bucket-label presentation is tracked as a separate issue.
4. Owner previously observed surprising Depth/Narrow interactions when removing apparent destinations; audit should verify that deleting an individual Narrow row never changes `configs.depth.scopes` or other independent configuration.

## Current source signals — evidence, not a root-cause verdict

- `src/modes/nested/index.mjs` creates Narrow config with `normalizedDestinations(..., {multipleTargets:true})`, so intentionally separate Narrow presentations of the same physical target are legal.
- `src/api/config.mjs` `createDestination` for `nested` generates a unique presentation ID and does not use the Simple same-target `DESTINATION_EXISTS` guard; repeated identical create requests may therefore accumulate distinct rows.
- `extension/app.mjs` binds the manager delete button using a native `confirm('Remove this destination from the configuration when you save? ...')`. On confirmation, it stages `deleteDestinationConfig` for that row's exact ID and rerenders; durability requires the shared Save workflow.
- `bindDestinationSave` may leave some controls disabled after a configuration commit when Chrome menu registration is incomplete. However, owner's **Edit works while Trash does not**, so generic disabled-controls behavior does **not** by itself explain the observed row-specific problem.
- The installed browser's actual in-memory draft, persisted `configs.nested.destinations`, compiler projection, acknowledged `chrome.contextMenus`, and cloud contents have NOT been compared.

## Required repair and safeguards

1. Preserve existing IndexedDB CURRENT configuration, original destinations, Depth scopes, unrelated modes, Default/Quick flags, OAuth approval, cloud objects and folder contents. **No storage reset, reinstall, bulk delete, silent deduplication, or automatic cleanup.**
2. Diagnose the `2D` rows by **stable presentation ID**, `target.accountId`, `target.bucketName`, `target.prefix`, label, and ancestor-level labels. Distinguish intentionally separate menu presentations from accidental repeated adds. Redact credentials and tokens from logs.
3. Independently inspect the live DOM handler and confirmation behavior for each Trash control. Verify whether a click triggers a prompt, creates a pending `deleteDestinationConfig`, and survives `Save`. A reliable in-app confirmation may be preferable to `window.confirm` if proven necessary.
4. Surface staged-versus-durable deletion clearly; if config saves but native registration fails, state each outcome separately and offer non-destructive retry.
5. Guard accidental identical re-adds (same destination + presentation settings) with a deliberate choice or useful diagnostic, **without prohibiting two intentional Narrow presentations of the same folder when labels/settings differ**.
6. Deleting **one chosen Narrow presentation ID** removes exactly that presentation after an explicit durable Save. It must not delete sibling Narrow presentations, Simple/Depth/Default configurations, or files in R2.
7. Verify fresh configuration, preview menu, acknowledged Chrome menu, actual native clicks and persisted reopen/restart state. The `2D` row count must not rise after delete/re-add unless the user explicitly adds another independent presentation.

## Acceptance / evidence

- Reproduce roughly ten same-label entries (in a disposable fixture or safe in-place non-destructive observation); inspect persisted IDs and projected rows.
- **Edit works; Trash triggers an understandable confirmation**; cancel makes no change; confirm shows pending deletion; Save commits one intended ID; reopen shows one fewer.
- Repeat for multiple rows and for a failed or partial menu reconciliation. No old rows spontaneously return and no new rows appear without a creation event.
- Show Simple/Narrow/Depth together with a Narrow target already inside a Depth tree; custom labels remain independent and deletion of Narrow does not alter Depth.
- Capture before/after configuration revisions, menu generation/ack and installed-Chrome observations. Mark unperformed checks **NOT VERIFIED**.

**This file records the issue; no code repair or installed-Chrome success is claimed.**  
**Related:** [bucket root visibility rule](../Issues/P1_CLOUDFLARE_NARROW_BUCKET_LABEL_VISIBILITY_REDOWN_EXCEPTION_2026-11-13.md); [independent mode contract](../Issues/P0_RIGHT_CLICK_INDEPENDENT_MODE_DISPLAY_AND_ROW_VISIBILITY_2026-11-09.md); [shared Save control](../Issues/P1_MANAGE_DESTINATIONS_EXPLICIT_SAVE_BUTTON_2026-11-12.md).
