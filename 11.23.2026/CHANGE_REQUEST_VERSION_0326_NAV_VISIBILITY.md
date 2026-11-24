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

## 2. Settings — choose a TAB LOCATION, not an ON/OFF state

**Owner terminology correction:** The user does NOT want tabs "enabled/disabled", "on/off", "shown/hidden", or a binary switch labeled "Show in Top Bar." The user wants exactly two mutually exclusive **PLACEMENT CHOICES for each eligible navigation tab**:

**Settings → Customize Navigation**

| Section | Placement (one choice) |
| --- | --- |
| Files | **Visible** / More menu |
| Remotes | **Visible** / More menu |
| Queue | **Visible** / More menu |
| History | Visible / **More menu** |
| Settings | **Visible** / More menu |

Use a clearly labeled two-option segmented control, radio group, or dropdown for each section. The values must be user-facing **"Visible"** and **"More menu"** (not "ON", "OFF", "Hidden", "Disabled", "Enable", or "Pin"). "Visible" means a tab appears in the TOP BAR; "More menu" means the tab is accessible within the `⋯` menu. Both choices keep the feature **enabled and fully functional**.

- The default TOP BAR is **Files | Remotes | Queue | Settings | ⋯**. **History** defaults to **More menu**. This is only a configurable default, never a hard-coded rule.
- Every actual eligible app section gets an independent, persistent **location** value of **Visible** or **More menu**. Include eligible sections discovered from existing navigation, without inventing unsupported screens. Never place the existing **Downloads** navigation entry in More (including Debug Mode or responsive fallback); its underlying backend and History V2 Download buttons still work.
- Selecting **Visible** for History immediately puts History in the top bar and removes its listing from More. Selecting **More menu** for Queue relocates Queue into the menu; Live Jobs and History V2 are not deleted or disabled.
- Selecting **More menu** for Settings keeps Settings accessible through `⋯`, including Customize Navigation, so the user can move Settings back to **Visible**. The `⋯` menu remains accessible at all times.
- Respect narrow layouts by rendering overflow within More, but treat overflow as **temporary presentation** that does not rewrite the user's persisted location preferences.
- No section appears twice. Store stable section IDs and one location choice each. Persist across close/reopen, reload, Chrome restart, theme change, account reconnect and normal navigation without losing current route/data.
- **Reset to Defaults** restores the placement choices shown above and does not reset unrelated preferences, destinations, auth, History or files.
- Apply to Remote V1, Bit o' Polish, Frames and all supported visual themes; ensure keyboard access and screen-reader labels. No unsupported third state, no removal of functionality.

### Non-negotiable behavior tests

1. Default after fresh install: Files / Remotes / Queue / Settings each read **Visible**, History reads **More menu**; corresponding top/menu placements match exactly.
2. Change **History → Visible**: immediate top-bar display, absent from More; then change **History → More menu** and verify the reverse.
3. Change **Queue → More menu**, then **Visible**: it relocates without losing Queue jobs, History V2 contents or current state.
4. Change **Settings → More menu**: Settings remains reachable from More, including the Customize Navigation card; change it back to **Visible**.
5. Verify independent choices, keyboard accessibility, no duplicate routes, and responsive overflow under varied window widths.
6. Reload Shelf, restart Chrome/extension, change themes: chosen placement values remain intact.
7. Reset to Defaults restores the declared Visible/More menu preferences, preserving unrelated settings.
8. With Debug Mode ON/OFF, a Downloads menu route never appears in More, while individual saved-file downloads still work.
9. Execute real installed Chrome UI tests where possible; separate actual browser evidence from fixture tests.

**P0 failure:** Any On/Off toggle, permanently fixed top bar, "Hidden/Disabled" option that actually disables a section, unpersisted choices, inaccessible Settings, or lost app state fails acceptance.

## 3. Scope and unchanged preservation rules

- Four stacked Remotes cards, source provider APIs, screenshot shortcut default Alt+Q with None selectable, legacy History, Download on every collapsed History V2 card, all theme behavior, right-click saves, authentication, and Diagnostics must remain intact.
- History V2 and Live Jobs are alpha modules in Queue, with old History preserved; no permanent cutover.
- The updated version and navigation customization are mandatory to this **same** Codex run. Do not defer them. Document final commit SHA and actual Chrome version proof.

