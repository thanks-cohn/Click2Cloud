# OWNER OVERRIDE — REDOWN 0.3.26 + USER-CONFIGURABLE TOP NAVIGATION

**Date:** 2026-11-24
**Authorized implementation branch:** `codex/queue-history-v2-0324-verified-2026-11-24`
**Immutable code ancestry and original feature baseline:** REDOWN 0.3.24 at `cd4c8dd3bc11700376d30da050d6050a0eb1edb9`
**New branch/release version:** **REDOWN 0.3.26**

This is a current, approved work-order amendment, not future/deferred scope. The originally tested code remains 0.3.24 as a base; the new product's version must be 0.3.26.

## 1. Version is 0.3.26 — what Chrome must display

- The authorized branch now has `package.json`, root `package-lock.json`, `extension/manifest.json`, and source `src/build-info.mjs` set to **0.3.26**. DO NOT revert them to 0.3.24 while implementing Queue/History V2.
- The generated `dist/click2cloud/manifest.json` MUST say `"version": "0.3.26"`, so `chrome://extensions` displays **REDOWN version 0.3.26** when this completed build is loaded/reloaded. Do not confuse the base **commit** version with the branch/release **product** version.
- Keep the existing manifest key / extension ID, OAuth identity, name, permissions unless separately needed and justified; preserve installed profile data. No extension uninstall or storage reset is authorized.
- `scripts/build-extension.mjs` creates generated build info from the manifest; ensure packaged `src/build-info.mjs` and all other applicable version presentations agree on **0.3.26**. Avoid stale/mismatched 0.3.24 and 0.3.25 version strings for the resulting installed build.
- Perform an automatic build assertion: `require('./package.json').version === '0.3.26'`, `require('./package-lock.json').version === '0.3.26'`, root lock package's version `=== '0.3.26'`, `require('./extension/manifest.json').version === '0.3.26'`, and generated `dist/click2cloud/manifest.json` version `=== '0.3.26'`. Validate final installed Chrome extensions card where browser access is possible.
- Do NOT start from the separate 0.3.25 repair branch or failed Queue V2 0.3.23 branch. Their code must not be copied. The version 0.3.26 is a **label for new work descended from 0.3.24**, not permission to merge intermediate versions.

## 2. Settings — three-way tab placement: Main tab / More menu / Gone

**LATEST OWNER DECISION, CONTROLLING OVER ALL EARLIER TWO-WAY / ON-OFF INSTRUCTIONS.**

In **Settings → Customize Navigation**, give each eligible navigation section one mutually exclusive **three-way selection** (segmented control, radio group, or dropdown) labeled EXACTLY:

1. **Main tab** — show the tab in the top navigation bar.
2. **More menu** — list the tab inside the `⋯` three-dot menu only.
3. **Gone** — hide this section's navigation entry from BOTH top bar and the `⋯` menu.

**"Gone" changes navigation visibility only, NOT the feature's implementation or data.** It must not delete History, change cloud credentials, pause uploads, disable saves, remove services/APIs, or destroy settings. Do not replace this selector with an on/off toggle.

### Default tab placement — owner-locked

| Section | Default placement |
| --- | --- |
| **Files** | **Main tab** |
| **Remotes** | **Main tab** |
| **Queue** | **Main tab** |
| **Settings** | **More menu** |
| **History** (legacy during alpha) | **More menu** |
| **Every other eligible, existing app section** | **More menu** |

**Default top navigation:** **Files | Remotes | Queue | ⋯**. *Only* these three content tabs belong in the initial main bar. **All other eligible sections go inside the three-dot More menu by default, including Settings and History.** Do NOT add Settings to the default main bar. The user's per-section choice may later move any eligible section into Main tab, More menu, or Gone.

**Downloads exception:** The previously approved rule remains: an old standalone **Downloads** navigation entry must NEVER be put inside More, including in default configuration, Debug Mode, narrow layouts or reset. Do not resurrect or invent that entry merely because "everything else" starts in More. Existing file-download APIs and every History V2 card's Download action are retained.

### Placement behavior, persistence and recovery

- Store one stable-ID placement value per eligible navigation section, one of `main`, `more`, `gone`. Never give one section duplicate entries or confuse hidden with disabled functionality.
- **Main tab:** user sees and can select the section in the top row. **More menu:** section only appears within the three-dot menu. **Gone:** section does not appear in either; backing data/engines remain intact.
- Moving a tab among all three choices takes effect immediately and persists across extension/Shelf reload, Chrome restart and theme changes. Responsive overflow may temporarily put main tabs in More but must not overwrite saved placement.
- The `⋯` three-dot button remains available in all configurations, including when every eligible tab is Gone.
- **Recovery when Settings is Gone:** expose a stable **Customize Navigation** recovery action in the three-dot menu separate from the optional Settings navigation entry. This opens the placement controls, even when Settings itself is Gone. Keep this recovery action available in all navigation states; it is not an additional Settings tab. If needed, also provide an accessible keyboard fallback, but do not rely on an undocumented keyboard-only route.
- **Reset to Defaults** restores only the navigation values shown above; preserve unrelated settings, authorizations, remote locations, Queue jobs, and History records.
- Keep state stable and actions accessible across Remote V1, Bit o' Polish, Frames and actual supported themes, including narrow windows, high zoom, and keyboard/screen-reader usage.

### Mandatory acceptance tests

1. Fresh start: **Files | Remotes | Queue | ⋯** is the visible top navigation. **Settings, History, every other eligible tab are in More**, except forbidden Downloads; no duplicate tabs.
2. From Settings → Customize Navigation, change **History** among **Main tab → More menu → Gone → Main tab**; verify placement after each and that History data is unchanged.
3. Move **Queue** to More menu and Gone, then Main tab again; Live Jobs and V2 records remain in place without losing data or interrupting saves.
4. Set **Settings** to Gone; it disappears from top AND More. Open the dedicated **Customize Navigation** recovery action from More and restore Settings.
5. Move **Files** and **Remotes** to More menu or Gone and back without mutating provider connection, authorization, files, or save destinations.
6. Change several placements together, check keyboard usability and responsive overflow, and verify no inaccessible or duplicate navigation.
7. Reload/restart and change themes; all placements persist. Reset to Defaults restores **only** Files/Remotes/Queue to Main tab and all other eligible sections to More menu (Downloads exception), preserving unrelated state.
8. Debug Mode ON/OFF and all layout fallbacks: Downloads never appears in More; actual History V2 Download buttons continue functioning.
9. Use the real installed Chrome extension when available; distinguish genuine browser proof from simulated fixtures.

**FAIL / P0 blocker:** A two-way control, an On/Off toggle, a static top bar, an unavailable Gone choice, Settings becoming irretrievable, unavailable More menu, lost user data, or Settings shown in the DEFAULT top bar violates this order.

## 3. Scope and unchanged preservation rules

- Four stacked Remotes cards, source provider APIs, screenshot shortcut default Alt+Q with None selectable, legacy History, Download on every collapsed History V2 card, all theme behavior, right-click saves, authentication, and Diagnostics must remain intact.
- History V2 and Live Jobs are alpha modules in Queue, with old History preserved; no permanent cutover.
- The updated version and navigation customization are mandatory to this **same** Codex run. Do not defer them. Document final commit SHA and actual Chrome version proof.

