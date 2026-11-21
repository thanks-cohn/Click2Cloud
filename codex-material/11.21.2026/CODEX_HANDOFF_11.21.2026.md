# Codex handoff — November 21, 2026: REDOWN title, RIGHT-CLICK ALWAYS, Shelf header layout

**Owner request date:** 2026-11-21 (America/Chicago)  
**Repository:** `thanks-cohn/Click2Cloud`  
**Inspected branch:** `codex/click2cloud-0.3.21`  
**Work type:** Canonical handoff of owner requirements + source-reviewed leads. **Not a claim of repaired code or real installed-Chrome testing.**  
**Priority:** P0 browser-native right-click availability first; P1 Shelf header collision second; preserve the already-committed display-name change and other roadmap items.

## 1. Priority / controlling context

This document consolidates **everything newly requested in the November 21 exchange**. It supplements the existing 0.3.21 Codex request rather than replacing its validated Screenshot/Get URL/appearance specifications.

**Do in order:**

1. **P0 CRITICAL / RELEASE BLOCKER:** Restore and prove **native Chrome right-click menu availability at all normal supported contexts, especially immediately after successful login/reconnect**. Source investigation + real installed-Chrome reproduction are required. [Full P0 report](../../Issues_and_Bugs/Bugs/P0_CRITICAL_NATIVE_RIGHT_CLICK_MENU_MISSING_AFTER_LOGIN_2026-11-21.md) and [GitHub #19](https://github.com/thanks-cohn/Click2Cloud/issues/19).
2. **P1 UI REGRESSION:** Fix overlap of the Shelf header's **More** control and adjacent **sun/moon** button after dragging the Shelf wider and then narrower, reproduced by owner with **Emerald Forest**. [Full P1 report](../../Issues_and_Bugs/Bugs/P1_SHELF_HEADER_MORE_THEME_OVERLAP_ON_RESIZE_EMERALD_FOREST_2026-11-21.md) and [GitHub #20](https://github.com/thanks-cohn/Click2Cloud/issues/20).
3. **Existing branding source change:** Chrome's extension/side-panel title must say **REDOWN** rather than Click2Cloud, without changing the stable extension ID, public key, OAuth redirect, storage/data, save logic, or current version. The source manifest was **already edited and committed** on the inspected branch; rebuild/load and validate it in real Chrome. **Branding is NOT a solution to the P0.**
4. Continue the non-conflicting original 0.3.21 queue afterward: [canonical Codex request](../../next-codex/NEXT_RUN_DEDUPLICATED_CODE_AUDIT_AND_RULES_2026-11-19.md), [queue index](../../next-codex/README.md), and [latest timestamped notes](../../codex-timestamp-latets.md). The November 21 priorities are newly owner-mandated and supersede older ordering *only for these fixes*. The unrelated wrong-bucket P0 workstream remains separately tracked; do not silently broaden this run to it.

**Company/reliability design principle:** Dependability must cover **availability and correctness**, not merely redundant components. When one interface or worker fails, the product should recover without losing existing user state or falsely declaring a save. The native menu is the core feature and takes precedence over polish; diagnostics and recovery are part of the requirement.

## 2. REDOWN — Chrome title, narrow cosmetic change

### Owner observation

The user's screenshot shows **Click2Cloud at the top of Chrome's side panel** (Chrome-owned extension header). Desired Chrome header label: **REDOWN**.

### Source inspection / already committed

In `extension/manifest.json`, the current inspected branch already has:

```json
"name": "REDOWN",
"short_name": "REDOWN",
"action": {
  "default_title": "REDOWN — Remotes"
}
```

- The stable manifest `key` remains unchanged; so should the extension ID `ajppphdiamdobknpamcheohmdbdbeoal` and corresponding OAuth redirect.
- `scripts/build-extension.mjs` copies source `extension/manifest.json` to `dist/click2cloud/manifest.json` and enforces the existing extension ID. **Do not rename the distribution folder as a requirement**.
- Existing source `extension/app.html` still contains a Click2Cloud document title and internal header label. These are **not the Chrome-owned side-panel title** and were not included in the requested narrow rename; do not launch a broad internal/brand rename without owner authorization.
- The inspected manifest declares product version `0.3.20` on the `codex/click2cloud-0.3.21` branch. Do not falsely claim the installed version is `0.3.21` or that local Chrome has already been updated.

**Verification:** Run `npm run build:extension` locally, reload the same unpacked extension in `chrome://extensions`, close/reopen the side panel, and verify the *Chrome-provided top label* reads `REDOWN`. Confirm the extension ID and OAuth still match. No build or Chrome proof was run by the documentation author.

## 3. P0 CRITICAL — RIGHT-CLICK ALWAYS, especially on successful login

**User's essential requirement:** The native extension-owned Chrome right-click save menu **MUST ALWAYS WORK in normal supported browser contexts, ESPECIALLY RIGHT AFTER LOGIN**. The owner reports it presently does **not appear**. This is a **release blocker**, not a cosmetic issue, and **not** merely the in-Shelf File Explorer menu.

### Required invariant

- Enabled native save/provider entries appear without requiring Shelf reopening, tab refresh, a manual restore control, extension reload, or full Chrome restart.
- Before authorization (fresh install), enabled provider entries should still appear with a truthful login/attention action. Basic menu presence must not depend on Cloudflare R2, Worker readiness, cloud inventory, or the Shelf being available.
- Immediately upon login, OAuth reconnect/reconsent or returning account authorization, the canonical saved configuration must reconcile into Chrome's native menu. Account or Worker unready states may block an actual save with accurate guidance, **not silently hide the enabled menu**.
- On MV3 background worker sleep/wake, extension/Chrome restart, menu preference change, Simple/Narrow/Depth/Quick/Default edits, or transient provider/network faults: preserve menu configuration, repair failed/incomplete registration safely, and show actionable diagnostics if registration cannot be verified.
- Respect intentional provider visibility OFF and browser-restricted contexts, such as Chrome-managed pages: `ALWAYS` means **every eligible Chrome context that the extension can legitimately control**, not impossible overrides of browser restrictions.
- A visible menu is **not a verified save**. A click must produce (a) authorized exact-target upload with matching external verification and receipt or (b) a specific, visible error/attention state. Never fabricate successful completion.

### Source-reviewed leads (NOT proven root cause)

- `extension/manifest.json` already grants `contextMenus`.
- `extension/background.mjs` has a `nativeReady()` lifecycle reconciliation attempt on `runtime.onInstalled` and `runtime.onStartup`, with rejected promises currently swallowed via `.catch(()=>{})`. Audit errors, startup race, partial registration and the correctness of last-known state.
- The same file's `oauth` `onConnected` callback clears snapshots and sends `connection-changed`, but **does not itself explicitly reconcile native menus**.
- In `src/api/service.mjs`, `loginBegin` reconciliation occurs in conditional initializer paths; investigate the case where initialization is blocked and **no saved destinations** exist, where no `applyCurrent` call was evident in the inspected branch. This is a specific hypothesis requiring installed-Chrome proof, **not an asserted defect cause**.
- `src/chrome/registrar.mjs` applies `contextMenus.removeAll` followed by per-item `create`/ACK and tracks acknowledged/applied generations and partial failures. Investigate empty/partial native menu after an interrupted apply; do not blindly remove entries, misread ACK as visual proof, or start a second registrar.
- Existing canonical mechanism and expected menu topology are documented by `latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md` and `11.2026/workings/right-click-workings.json`.

### Minimum real Chrome acceptance

1. On a supported image/link/page, test **fresh/never connected**; configured visible provider entries appear and lead to accurate login/attention.
2. Test **successful first login, saved-target login, reconnect and OAuth reconsent**; immediately inspect Chrome's real rendered menu without manual recovery or Shelf reload.
3. Repeat with cloud setup blocked, network unavailable and Worker unavailable; menus stay correctly exposed, clicks give honest failures.
4. Reload extension and restart Chrome; suspend and wake MV3 worker; confirm persistent entries and accurate route mapping.
5. Toggle Simple, Narrow, Depth, Quick and Default; test zero/one/multiple configured targets and explicit provider visibility OFF/ON; no ghost/duplicate/omitted entries.
6. For enabled save leaves, correlate menu ID + generation + exact account/bucket/prefix to actual verified provider object or explicit blocked/error result.
7. Report test results as **PASS/FAIL/BLOCKED/NOT TESTED** with Chrome screenshots, safe diagnostic trace, commit/build SHA, generation/ACK and relevant receipts. Synthetic fixtures and native ACK alone **cannot** close the P0.

**Hard boundaries:** Keep saved CURRENT and recovery provenance; never erase profile, destinations, Quick/Default, historic menus or OAuth identity to conceal the problem. No unapproved Cloudflare mutations, hidden new engine, weakened permission checks, or false provider successes.

## 4. P1 — Emerald Forest resize collision: More overlaps sun/moon

**Owner reproduction:** In the Chrome Shelf with a palette such as **Emerald Forest**, drag the Shelf leftward to widen it, then back rightward to narrow it. The top **More** dropdown trigger overlays the separate **sun/moon** theme toggle.

**Expected:** The two controls and their pointer/keyboard hitboxes **never overlap** at any supported width, light/dark theme, palette, zoom or resize direction. Widening again should restore the proper desktop layout. The **More popup must anchor correctly within the Shelf**, and theme toggling must continue to work.

**Source inspection leads:**

- `extension/app.html`: brand + nav/More + independent `#theme` grid structure.
- `extension/app.css` (~lines 123–149): `.app-header` uses `grid-template-columns:auto minmax(0,1fr) auto`, child nav uses non-wrapping flex items, the theme control has fixed 36px size, and the layout relies on fixed width media breakpoints.
- `extension/aesthetic.css` and `src/aesthetic/packages.mjs`: visual tokens and palette overlays including Emerald Forest. Whether the palette contributes to the overlap is **not determined**.

**Repair contract:** Adjust the existing responsive header layout deliberately (proper grid/flex min-width handling, safe nav overflow/collapse, compact More icon, compact Files label, moving lower-priority navigation into the **existing** More menu when necessary). Preserve a single More and a single theme toggle; **do not hide the sun/moon control or make inaccessible overlapping click targets**. Do not create a new aesthetic engine or patch Emerald Forest in isolation unless causality is proven.

**Acceptance:** Real Shelf expand → shrink → expand cycles across **Original Rose, Ocean Blue, Emerald Forest, Amethyst, Sunset Amber**, both light/dark, normal and increased zoom. Test small/medium/wide widths, click + keyboard focus, distinct hit areas, menu visibility, no clipping/forced horizontal overflow and no changes to navigation, save behavior or user palette persistence. Owner observation exists; **no installed-Chrome fix is proven yet**.

## 5. Explicitly related but distinct issues

- [P0 right-click menu completely absent, #19](https://github.com/thanks-cohn/Click2Cloud/issues/19) — **THIS** is the new release blocker.
- [P1 top header More/theme overlap, #20](https://github.com/thanks-cohn/Click2Cloud/issues/20) — **THIS** is the new styling regression.
- [Prior Depth leaf can be clicked with no visible save](../../Issues_and_Bugs/Bugs/P0_DEPTH_NATIVE_MENU_CLICK_NO_SAVE_NO_VISIBLE_RESPONSE_2026-11-13.md) — a **different** reported failure.
- [Prior Narrow bucket-root omission](../../Issues_and_Bugs/Bugs/P0_CRITICAL_NARROW_BUCKET_ROOT_MISSING_FROM_NESTED_RIGHT_CLICK_MENU_2026-11-14.md) — a **different** menu-layout issue.
- [Prior potential wrong-destination/false success](../../Issues_and_Bugs/Bugs/P0_POTENTIAL_FALSE_VERIFIED_SAVE_WRONG_DESTINATION_STATUS_CONFLICT_2026-11-17.md) — keep separately tracked; do not mix its root-cause investigation into this mandatory menu-availability repair without direct evidence.

## 6. Date-separated existing material

The following Markdown files have **2026-11-20** in their filenames (see [November 20 file inventory](FOUND_11.20.2026_MARKDOWN.md)):

1. [Bit o' Polish five palettes](../../next-codex/BIT_O_POLISH_FIVE_COLOR_SCHEMES_0.3.21_2026-11-20.md) — source of the Emerald Forest palette requirement.
2. [Screenshot + Auto-Reroute architecture audit](../../next-codex/SCREENSHOT_AND_AUTOREROUTE_ARCHITECTURE_AUDIT_2026-11-20.md) — earlier audit; its own override says newer final owner decisions govern.
3. [Auto-Reroute 0.3.22 separate request](../../next-codex/AUTO_REROUTE_0.3.22_SEPARATE_CODEX_REQUEST_2026-11-20.md) — **deferred** from 0.3.21; do not implement as part of the fixes above.

**Scope firewall:** 0.3.21 Screenshot-to-Cloud remains governed by `screenshot-logic-final/`; 0.3.22 Auto-Reroute remains separately deferred. Neither is a prerequisite for the P0 menu fix. This date-stamped handoff does **not** silently override established UI/feature contracts except the owner-specified priority and regression fixes.

## 7. Honest handoff status (as documented November 21)

| Work item | State |
| --- | --- |
| Change Chrome side-panel/extension title to REDOWN in source manifest | **Already committed on branch**; local rebuild/installed Chrome proof pending |
| Native Chrome menu availability immediately after login / ongoing reliability | **P0 OPEN**, source clues inspected; **code repair and real Chrome proof pending** |
| More overlapping sun/moon after Shelf resize | **P1 OPEN**, owner reproduction and CSS clues documented; **code repair and Chrome proof pending** |
| Existing 0.3.21 Search/Get URL/Screenshot/Bit o' Polish queue | Preserve existing authoritative specs; do not reimplement already verified code |
| Separate Auto-Reroute 0.3.22 | **Deferred** |

**For Codex:** Read the reports and active source, fix the P0 first, test real installed Chrome, then fix the P1. Commit code separately from documentation, and report exact SHA, successful/failed tests, verified native rendering, any blocked external-provider test and remaining risks. Do **not** claim this file implements or validates the repairs.
