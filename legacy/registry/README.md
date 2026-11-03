# Legacy native Chrome registry, routing and other-provider separation

**Actual source:** [V3 reconcile/buildMenus](https://github.com/thanks-cohn/REDOWN/blob/5041b5763541812c505c9cde6e8f79cb23a7b193/extension/background.js#L2420-L2610), [source resolver](https://github.com/thanks-cohn/REDOWN/blob/5041b5763541812c505c9cde6e8f79cb23a7b193/extension/right-click-v3.js#L230-L270), [V3 Mechanics Atlas](https://github.com/thanks-cohn/REDOWN/blob/94a1a5f0699eec904d989a3823d22f9bf2bd131d/FOREVER_WORKS/v3-plus-one-master-audit/02_MECHANICS_ATLAS.md), [independent-provider audit](https://github.com/thanks-cohn/REDOWN/blob/94a1a5f0699eec904d989a3823d22f9bf2bd131d/FOREVER_WORKS/v3-plus-one-master-audit/07_S3_ADAPTER_AND_CLOUD_ISOLATION.md). **New owner:** neutral registrar in [engine isolation contract](../../assisted_proposal/ENGINE_ISOLATION_CONTRACT.md).

## Preserve

- **Keep REDOWN root and Manage destinations mounted.** V3 `ensureMenuAccess()` updates existing root/Manage or creates missing; doesn't reset `removeAll` for each change. Even if a provider crashes, essential access to the Shelf/manager should remain.
- **Parent-first validated descriptors.** Prevalidate unique opaque IDs and existing parents before calling native Chrome, and preserve provider/account/bucket/exact prefix in a sidecar action route; never route by menu title. A record's immutable ID must survive rename.
- **Fresh click authority.** V3 `resolve()` checks the clicked ID is still an **actionable leaf of the CURRENT plan**, then matches prepared profile and exact prefix. Stale/removed IDs and synthetic branch IDs resolve null. New registrar must also check current permission/session and never fall back to the Explorer's selected folder.
- **Actual callback acknowledgment.** Chrome context menu APIs require checking `runtime.lastError` in callback lifetime; V3 uses bounded 5-second callbacks, update→create fallback, `applying/registered/superseded/failed` status and a generation/application-key receipt. Keep desired/applied/visible distinction.
- **Reorder is not atomic.** Chrome `update` cannot reorder native sibling positions; structural changes may require removing/recreating rows in reverse parent order. V3 preserves root/Manage and last known IDs; new per-contributor registry needs a last-valid plan and localized failure reporting.
- **Acknowledge exact generation.** If config/auth/profiles change before registration finishes, the old receipt is **superseded**, not proof that the newest plan is installed. Save/apply user-visible labels must never equate local draft persistence with live installed native menu.

## Source-backed cross-provider bug to eliminate

In current `buildMenus()`, Dropbox uses `RedownGoogleDriveMenu.composeSibling()`; OneDrive uses a further composer. The provider menu fragments are therefore **not fully independent** despite separate source files. A shared background import error can prevent downstream providers from registering. Moving a provider's row can trigger recreation of all destination rows.

**Required V3+1 boundary:** each provider/mode supplies a validated, namespaced immutable fragment `{providerId, revision, entries, ownedActions}` to one neutral registrar. It must never import another provider's composer. One provider's failure must preserve the last acknowledged valid plan of the other providers and the root/Manage rows.

## Tests and OPEN design gates

- Duplicate visible labels + same prefix: two different `v3p1:<mode>:<UUID>` IDs, identical route if requested; ensure Chrome accepts both and display may be indistinguishable by text intentionally.
- One same destination in Simple and Narrow uses distinct IDs; inactive mode's rows **aren't registered** even though Existing Destinations can list them.
- Same `Photos` bucket across two distinct S3 accounts cannot collide or cross-route.
- Leaf↔submenu flip for Cloudflare after login/R2/bucket readiness; a parent cannot also save as a leaf, so disambiguate action kinds.
- Native callback timeout, lost callback after actual create, duplicate-ID error, stale remove, reorder, no stored native ID cache, service-worker restart mid-registration and rapid app switch.
- Invalid provider fragment, unplug Google Drive, failed Dropbox auth, broken OneDrive composer; other siblings must survive.
- One native plan may be temporarily incomplete during reorder; report truthful pending/failure and retry rather than declaring the entire menu atomically committed. Distinguish **menu acknowledged** from **file save verified**.

**Do not transplant** old `buildMenus()` cross-provider composition or `removeAll` behavior into new mode modules.
