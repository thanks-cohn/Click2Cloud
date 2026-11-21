# P0 / CRITICAL — native Chrome right-click menu is missing, including immediately after login

**Owner report:** November 21, 2026 (America/Chicago).  
**Status:** OPEN — owner-reported critical failure; root cause unverified; release blocker.  
**Affected:** Click2Cloud browser extension's **native Chrome right-click save menu** (not merely the Explorer file-list context menu).  
**Observed version:** Owner's Windows Chrome screenshot shows the installed Click2Cloud side panel, but the exact installed build SHA, native-menu generation and diagnostic export were not supplied. Branch reviewed: `codex/click2cloud-0.3.21`.

## Report

> "the right click menu WONT APPEAR! and this is CRITICAL CRITICAL"  
> "the right clci menu must ALWAYS work! especially right after loggin! this is critical!"

The native extension-owned right-click entries are reportedly absent. The exact distinction between Chrome's entire context menu failing and the extension entry missing, and which page/image/link contexts are affected, still requires actual installed-Chrome observation. **Do not silently downgrade this to an individual save failure, nor assume a browser screenshot proves a native-menu cause.**

## Hard requirement: RIGHT-CLICK ALWAYS (supported Chrome contexts)

**The native save menu is the core product and MUST be continuously available on eligible ordinary Chrome pages/links/images, especially IMMEDIATELY after the user completes Login/Reconnect.** The user must never need to open/close the Shelf, revisit Manage Destinations, refresh a tab, manually "Restore menu," restart the extension, or restart Chrome to make the menu appear.

1. On first install (including disconnected/zero destinations), create the enabled, clickable provider actions; when not authorized, click must lead to accurate provider-specific login/attention, not disappear.
2. On **successful login/reconnect**, promptly reconcile the canonical persisted desired menu and independently confirm Chrome registration ACK; show enabled user-configured entries immediately, even if cloud/Worker readiness is not yet achieved. Never gate basic menu visibility on OAuth, R2 inventory, Worker provisioning, Shelf rendering, history preload, or network polling.
3. On extension/Chrome restart, MV3 worker activation/suspension/restart and normal settings/mode/Default/Quick changes, re-establish menu registration deterministically and idempotently without losing stored destinations or inventing new ones.
4. On transient authentication, current-store or registration errors, **fail visibly with a specific state and diagnostics**, preserve last known durable configuration and never overwrite it with a synthetic empty profile. Do not use a blind `removeAll` followed by an unverified partial/no-menu state as an apparently successful repair.
5. Existing visibility OFF preferences remain intentional exceptions; Chrome-prohibited pages/contexts and browser-managed menu restrictions must be documented rather than falsely promised as controllable by the extension.
6. Availability does not equal verified save. Every click must either initiate the authorized exact-target save with matching provider receipt or produce actionable honest feedback, without false completion.

## Investigate: exact current source locations

- `extension/manifest.json` grants `contextMenus`; absence is **not** explained by a missing declaration in the inspected source.
- `extension/background.mjs`: existing `nativeReady()` invokes `api.reconcile({refreshDepthReadiness:false})`, but `chrome.runtime.onInstalled` / `onStartup` calls suppress rejections with `.catch(()=>{})`. Determine whether registration was never attempted, stale, failed, or incorrectly considered acknowledged.
- `src/chrome/registrar.mjs`: `removeAll`, native `create` ACK/timeout, persistent desired/applied generation, failed-parent handling and partial outcomes. Preserve exact IDs and ensure registration failure is detectable and recoverable.
- Follow actual GUI OAuth `connect` / reconnect completion into the canonical menu reconciliation path. **Explicitly prove immediate post-login registration**; do not assume login automatically triggers native recreation just because startup does.
- Use `latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md`, `11.2026/workings/right-click-workings.json` and `Issues_and_Bugs/README.md`; treat source, desired rules and installed-Chrome evidence as distinct proof classes.

## Read-only diagnostics BEFORE changing state

1. Identify installed extension ID, exact commit/build, Chrome/profile, page URL class (redacted), right-click target (image/link/page), and explicit provider visibility settings.
2. Inspect `chrome://extensions` service-worker errors and native recorder; compare the durable desired menu generation/rows with current observed `chrome.contextMenus` ACKs/last outcome. Do not claim Chrome rendered a menu just because it acknowledged creation.
3. Trace `onInstalled`, `onStartup`, post-login/reconnect, CURRENT integrity fence, `nativeReady`, engine reconciliation, registrar apply/ACK and Chrome's actual rendered menu. Identify the **first missing transition**; distinguish storage corruption, stale generation, no registration, Chrome restriction and suspended worker.
4. Correlate live entry click ID to canonical target and save proof where test authorization exists. Capture sanitized diagnostics; never disclose tokens, cookies or sensitive URLs.

## Release-blocking acceptance matrix

- Brand-new profile, **before login**: enabled provider menu entries visible and clickable with honest login/attention path; no R2 provisioning.
- **Immediately after successful login**, without reopening Shelf or refreshing Chrome: actual menu entries visible on a supported page/image/link; configured destination IDs unchanged.
- After OAuth reconnect/reconsent, temporary network outage, unavailable Worker, and account readiness transitions: menu remains usable; disabled save is explained honestly.
- After ordinary extension reload, Chrome restart, MV3 suspend/wake, and service-worker error recovery: entries reappear deterministically with exact persisted configuration.
- After every Simple/Narrow/Depth, Default, Quick, provider ON/OFF, no-destination and multi-bucket scenario: same expected native layout; no ghost/duplicate entries, no silent loss.
- Each enabled actionable menu item gives verifiable R2 result or actionable blocked/error outcome; no phantom success. No unauthorized cloud mutations or unwanted new folders/buckets.
- Real **installed Windows Chrome** observation required, not only fixtures, command ACK, previews or simulated browser. Capture PASS/FAIL/BLOCKED/NOT TESTED with timestamps and sanitized receipts.

## Safety and scope

Repair **the existing canonical engine/registrar/API**; do not create a second context-menu owner, loosen account/source permissions, erase CURRENT, delete/reset Chrome profile, drop saved Quick/Default/Simple/Narrow/Depth settings, rotate extension key/ID or OAuth redirect, or mutate R2/Workers as a shortcut. This P0 supersedes the noncritical 0.3.21 styling/screenshot/search work until the native menu passes real installed-Chrome acceptance.

**Related:** `Issues_and_Bugs/Bugs/P0_DEPTH_NATIVE_MENU_CLICK_NO_SAVE_NO_VISIBLE_RESPONSE_2026-11-13.md`; `Issues_and_Bugs/Bugs/P0_CRITICAL_NARROW_BUCKET_ROOT_MISSING_FROM_NESTED_RIGHT_CLICK_MENU_2026-11-14.md`; `Issues_and_Bugs/Bugs/P0_POTENTIAL_FALSE_VERIFIED_SAVE_WRONG_DESTINATION_STATUS_CONFLICT_2026-11-17.md`. Those cover different failures; do not claim this new absence shares a proven cause.

**Separate cosmetic request:** Change the Chrome-provided side-panel/toolbar display name from Click2Cloud to **REDOWN**, preserving the extension's stable `key`, ID, OAuth identity, version, save architecture and internal brand unless separately authorized. The name change does **not** cure this P0.
