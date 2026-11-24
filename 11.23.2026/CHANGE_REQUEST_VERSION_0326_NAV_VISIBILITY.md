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

## 2. Settings MUST let the USER customize TOP TAB VISIBILITY

This feature was ALWAYS required. **It is not an optional fixed default or an admin-only/test-only toggle.** Implement a clearly discoverable, functional **Settings → Customize Navigation** card.

- Show one independent, accessible, persisted **Show in Top Bar** / pinned visibility control for **each eligible application section/tab** present in the actual 0.3.24-derived navigation registry (e.g. Files, Remotes, Queue, History, Settings and other actually supported navigable sections). Do not invent new sections or falsely omit eligible ones.
- The user can decide which eligible tabs appear directly across the **TOP navigation strip** and which move to **⋯ More**. A section unpinned from the top **MUST NOT become inaccessible**: it appears in ⋯ More instead, subject to the separate Downloads exclusion.
- **Default top strip:** `Files | Remotes | Queue | Settings | ⋯`; History is in More initially. The user must be able to pin History to the top, unpin Queue, or unpin Settings and still reach all sections, including Settings itself through More.
- Keep **⋯ More** discoverable and operational even when few tabs are pinned. Respect narrow layouts: temporarily overflowing pinned tabs to More is okay, but it must NOT silently rewrite the user's saved visibility preferences or cause duplicate routes.
- Provide **Reset to Defaults** that restores the original default visible-top sections and default More membership, without resetting unrelated settings, credentials, destinations, History, or files.
- Save preferences durably using existing safe settings storage; restore identically after Shelf closure, extension reload, Chrome restart, theme changes, and navigation. Use stable section identifiers, not fragile text labels, indexes, DOM positions or hardcoded one-off History behavior.
- The top-bar toggle governs **presentation/placement only**: it does not disable a section's APIs, data, event handling, save engine, operations or diagnostics. Tabs and pending work stay available regardless of pinning.
- **Never display `Downloads` in ⋯ More** (including Debug Mode ON, responsive fallback and Reset); do not erase existing actual download/file APIs. Existing Download buttons in History V2 remain supported.
- Enforce compact high-quality design across Remote V1, Bit o' Polish, Frames, and any other actual supported theme, with clear focus/ARIA semantics and a usable small-width layout.

### Non-negotiable behavior tests

1. Fresh/default state: top navigation is **Files | Remotes | Queue | Settings | ⋯** and History lives inside More.
2. Toggle **History → Show in Top Bar ON** in Settings: History appears on top immediately; it does not appear twice in More. Toggle OFF: it disappears from top and returns to More.
3. Toggle **Queue OFF**, verify it moves into More without losing Live Jobs or History V2 data; turn it back ON, state is preserved.
4. Toggle **Settings OFF**: Settings remains accessible from More, so user can reopen Customize Navigation and re-pin it. Never strand the user.
5. Toggle eligible sections individually, test many pinned sections and responsive overflow, focus/keyboard operation and one route per section.
6. Reload Shelf, restart extension, switch themes and verify saved pin choices are unchanged.
7. Click **Reset to Defaults** and confirm exactly the default top and More groupings, with unrelated state untouched.
8. With Debug Mode ON and OFF, downloads backend stays functional but a `Downloads` nav entry never appears in More.
9. Real installed Chrome UI interactions where available; distinguish synthetic fixtures from actual browser evidence.

**Release blocker:** A fixed set of header tabs with no user-visible Settings controls, toggles that fail to persist, unpinned tabs that become inaccessible, or Settings that becomes impossible to reopen is a failed implementation.

## 3. Scope and unchanged preservation rules

- Four stacked Remotes cards, source provider APIs, screenshot shortcut default Alt+Q with None selectable, legacy History, Download on every collapsed History V2 card, all theme behavior, right-click saves, authentication, and Diagnostics must remain intact.
- History V2 and Live Jobs are alpha modules in Queue, with old History preserved; no permanent cutover.
- The updated version and navigation customization are mandatory to this **same** Codex run. Do not defer them. Document final commit SHA and actual Chrome version proof.

