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

## 2. Settings — Main tab / More menu / Gone, with Settings protected

**LATEST OWNER DECISION — controlling over older two-way toggle and unrestricted three-way language.** The More menu is the **THREE-DOT `⋯` BUTTON** in the top navigation. Do not replace it with an unrelated hamburger icon or textual "More" tab.

Implement **Settings → Customize Navigation** with these mutually exclusive placement options:

| Actual eligible section | Allowed placement options | Default |
| --- | --- | --- |
| Files | Main tab / More menu / Gone | **Main tab** |
| Remotes | Main tab / More menu / Gone | **Main tab** |
| Queue | Main tab / More menu / Gone | **Main tab** |
| History (legacy during alpha) | Main tab / More menu / Gone | **More menu** |
| **Settings** | **Main tab / More menu ONLY — Gone forbidden** | **More menu** |
| Every other eligible existing section, except the excluded Downloads entry | Main tab / More menu / Gone | **More menu** |

These are placements, **not on/off or feature activation settings**. Use per-section segmented controls, radio groups or an accessible dropdown. Show the user-facing names **"Main tab"**, **"More menu"**, **"Gone"**. For Settings, show only the first two options. The app must reject attempts to set Settings to `gone` through restored configuration, import, malformed stored settings or direct internal calls, correcting legacy invalid values to `more` safely.

**Default TOP BAR:** **Files | Remotes | Queue | ⋯** and NOTHING ELSE. Settings, History and every other eligible section appear inside `⋯` initially, except Downloads: it NEVER appears in `⋯`, even in Debug Mode. Do not invent a Downloads tab or delete the existing download/file API; every History V2 card keeps its approved file Download action.

### Placement behavior

- **Main tab:** exactly one top-row entry. **More menu:** exactly one entry in the three-dot dropdown. **Gone:** no entry in either; underlying service/data remain available and operational, with no account/file/history changes.
- **Settings cannot be removed from navigation.** It can only move between **Main tab** and **More menu**. `⋯` must remain discoverable even with all other eligible tabs Gone. No special escape hatch is needed when Settings is Gone because that state MUST BE IMPOSSIBLE.
- Save placement values by stable section ID through existing preferences. Each change updates the UI immediately and persists through Shelf reopening, Chrome restart, and theme switching. A section can be temporarily overflowed on narrow screens without changing saved placement.
- Never duplicate a tab across top and `⋯`; hiding a tab cannot stop its background work or delete information. Maintain consistent keyboard navigation, focus, ARIA names, touch targets and responsive layout.
- Include **Reset to Defaults** restoring Files/Remotes/Queue to Main tab and Settings/History/all other eligible sections to More menu (excluding Downloads); do not reset other settings, cloud connections, history or files.

### Mandatory acceptance

1. Initial main navigation shows exactly **Files | Remotes | Queue | ⋯**, where `⋯` is a three-dot control. Settings and History are inside `⋯`, not on top.
2. For History, Queue, Files and Remotes, exercise **Main tab → More menu → Gone** and back, proving locations, durable preferences and no data loss.
3. Settings presents only **Main tab / More menu**. Try to supply `gone` through persisted or test API state; reject/repair it and keep Settings accessible.
4. `⋯` remains reachable and correctly sized in all themes, narrow windows and with other sections Gone. Never show duplicate routes.
5. Reload extension/restart Chrome; placements remain. Reset restores exact defaults without affecting accounts/History.
6. No Downloads menu entry in Debug Mode ON/OFF, responsiveness or reset. Existing per-card file Download continues to function.
7. Report actual installed Chrome interaction evidence separately from simulated tests.

**P0 FAIL:** binary ON/OFF control, allowing Settings = Gone, a hidden/inaccessible Settings route, misrepresenting the three-dot More control, Settings in the DEFAULT top bar, lost state, or a fixed noncustomizable header.

## 3. Scope and unchanged preservation rules

- Four stacked Remotes cards, source provider APIs, screenshot shortcut default Alt+Q with None selectable, legacy History, Download on every collapsed History V2 card, all theme behavior, right-click saves, authentication, and Diagnostics must remain intact.
- History V2 and Live Jobs are alpha modules in Queue, with old History preserved; no permanent cutover.
- The updated version and navigation customization are mandatory to this **same** Codex run. Do not defer them. Document final commit SHA and actual Chrome version proof.

