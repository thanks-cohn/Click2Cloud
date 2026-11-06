# NEXT CODEX ADDENDUM — Smart seven-entry menu organization suggestion
Date: 2026-11-05
Repo: thanks-cohn/Click2Cloud
Working branch: feat/glaciaring-agent-debug
Status: OWNER PRODUCT REQUIREMENT; implementation NOT claimed.

Read AGENTS.md, scaffold/README.md, docs/CODEX_NEXT_GUI_BASELINE_HIDE_VISIBILITY_AND_NATIVE_LAYOUT_2026-11-05.md, docs/CODEX_NARROW_SELECT_HIDE_LEVELS_AND_SIMPLE_ONE_CLICK_TOGGLE_2026-11-05.md and docs/CODEX_QUICK_SELECT_SIMPLE_PRIORITY_MENU_2026-11-05.md. This addendum makes the **opt-in REDOWN grouped layout mean a provider drawer with Quick Select favorites kept outside it**, superseding older specs that would bury Quick Selects under that REDOWN branch. Follow the existing real /scaffold-first mission; no duplicate engine, no REDOWN V3 modifications.

## Owner decision

If the user's Click2Cloud right-click menu has **more than SEVEN visible first-level direct items** (for example: five cloud providers + three or more Quick Selects), offer ONE tasteful, in-app suggestion to switch from the default flat/provider-first layout to the optional organized REDOWN layout. The suggested organization must keep ALL Quick Select shortcuts **directly visible at the first level inside Chrome's required extension-owned menu group**, and place the provider choices under one additional, user-requested **REDOWN · All Clouds** submenu. Do NOT put the Quick Selects inside that extra submenu.

Native browser preview, default flat:
  [Chrome automatically creates extension group when multiple extension items visible]
    ★ Photography              DIRECT SAVE
    ★ Client Work              DIRECT SAVE
    ★ Videos                   DIRECT SAVE
    ★ Personal                 DIRECT SAVE
    ★ Invoices                 DIRECT SAVE
    --------
    Google Drive               DIRECT SAVE
    Dropbox                    DIRECT SAVE
    OneDrive                   DIRECT SAVE
    Cloudflare R2 >            provider-specific Simple/Narrow/Depth
    MEGA S4 >                  provider-specific modes only if implemented and verified

After accepting organized REDOWN:
  [Chrome automatic extension group]
    ★ Photography              DIRECT SAVE
    ★ Client Work              DIRECT SAVE
    ★ Videos                   DIRECT SAVE
    ★ Personal                 DIRECT SAVE
    ★ Invoices                 DIRECT SAVE
    --------
    REDOWN · All Clouds >
      Google Drive             DIRECT SAVE
      Dropbox                  DIRECT SAVE
      OneDrive                 DIRECT SAVE
      Cloudflare R2 >          exact authorized configured locations
      MEGA S4 >                only when real S3 adapter is verified

Other action rows (e.g., Manage Destinations) remain accessible, ideally after a separator, but are NOT counted in the seven direct-save/navigation provider+Quick threshold. When only one extension item is visible, use real Chrome native behavior; do not insert an unnecessary fake grouping parent.

## Trigger definition

Count what is actually displayed at the immediate provider/Quick level of the **current default flat menu**:
- +1 for each visible actionable Quick Select leaf (regardless of real path depth; if unavailable but displayed disabled, include as occupying visual space).
- +1 for each visible provider row, whether a direct-save leaf or an expandable S3 provider heading.
- Do NOT count separators, hidden destinations, descendants inside provider S3 menus, labels, non-provider management utilities, the Chrome-generated parent, or already grouped provider children.
- Proposed usability threshold **strictly > 7** (8 triggers); NOT a Chrome API quota. The Chrome action toolbar context-menu's separate 6-item API limit must not be confused with a normal webpage right-click menu.
- Offer when adding the entry/pinning Quick Select or changing a settings visibility choice increases the potential direct count above seven; avoid prompts on startup, background sync, every page load, menu click, ordinary cloud reconnect, or active save. Show a small unobtrusive inline/deliberate modal AFTER successful save of config (not before save or inside the browser's native right-click menu).
- Count source is the SAME canonical menu compiler/presentation state, not a separate heuristic that drifts; expose count as a read-only typed API inspection field.

## UX copy and controls

Title: "Your right-click menu is getting crowded"
Body (dynamic): "You have {count} direct entries. Move cloud providers under REDOWN while keeping your Quick Selects one click away."
Buttons: Primary "Organize under REDOWN"; secondary "Keep flat layout". Optional subdued "Preview layout".
Styling: premium Pinterest-inspired restrained red on near-black with white text, small popup, balanced spacing. No oversized warning icon or fear-based claims. Neither threshold nor prompt should block or disable creating more Quick Selects. Always permit user to reject. Persist dismissal by layout+count state; do not nag again for the same or lower count. If user later adds materially more items (e.g., threshold + 3 since dismissal) a new one-time suggestion is acceptable, with "Don't suggest again" in Settings. Explicit manually chosen grouped/flat layout should be respected; do not auto-change it. When the popup is displayed, ensure Save, ongoing transfers and keyboard focus aren't interrupted.

## Behavior on acceptance

- Move PROVIDER rows as a presentation-only reparent, ordered by stable configured provider priority, under REDOWN · All Clouds.
- Keep Quick Select rows immediately in Chrome's own extension grouping, at the top, ordered by existing stable user Quick Select priority.
- No extra Cloudflare/MEGA S3 nest besides the authorized existing provider's inner submenu. Google Drive, Dropbox, OneDrive remain direct leaves beneath the provider drawer.
- Preserve every configured destination's immutable ID, provider/account/bucket/deep prefix, labels, visibility, original Simple/Narrow/Depth mode state, Show settings, saved Quick Select order and Flat single-Cloudflare direct default.
- User may later return to the initial flat/provider-first layout from Settings at any time; maintain both as pure projections. Avoid clashing with existing + Right Click popup Show:Flat (single Cloudflare default) by naming Settings layouts "Providers first (default)" and "Organize cloud providers under REDOWN".
- Chrome's automatic extension grouping cannot be removed. The suggestion makes Quick Selects *directly accessible within that browser-owned extension menu*, never independent entries on the outermost webpage context menu. Show accurate before/after screenshots of actual installed Chrome, and never promise this changes relative ordering versus other extensions.
- Settings must reflect the active layout; visual preview uses the same real compiler as the registrar. "Applied" only on actual native ACK; if registration fails, preserve chosen config and show pending/Retry Apply, no fake successful switch.
- Cloud provider auth/readiness and verified transfer receipts remain independent; no success on timer; no cloud object rename or location rewrite.

## API and testing

Store `menuLayout = 'providers-first' | 'redown-provider-drawer'` and a versioned suggestion dismissal record in canonical CURRENT, journal, backup/restore. New installs default to providers-first. Do not silently reinterpret a previously deliberate user selection on migration; migrate safely, documenting any old enum compatibility. Authorized typed `setMenuLayout` should preview + commit with revision/idempotency, and expose a read-only `inspectMenuLayout` with visibleQuickSelectCount, visibleProviderCount, totalDirectCount, suggestionEligible, expected Chrome-owned grouping and projected parent IDs. Debug/Glaciaring remains read-only.

Acceptance:
1. 5 visible providers + 2 Quick Selects = 7 => NO prompt; adding third = 8 => one suggestion.
2. 5 + 5 => 10 => suggest, user accepts => Quick Selects still first-level, providers under REDOWN; exact saves unchanged.
3. User dismisses => remain flat and allow more than seven; reopen manager/restart without repeated prompt; setting can still be changed manually.
4. Reorder, hide and show a Quick Select; hide remains persisted, pinned state retained; projection updates with ACK and priority order.
5. Save/Cancel, rapid toggling, service-worker restart, disconnected providers, label collisions, failed native menu reconciliation, backup restoration, old layout migrations.
6. Browser right-click image/link/page and in-app Explorer file context; accurately distinguish Chrome-owned grouping from our added submenu; capture actual installed Chrome screenshots, route IDs, click receipts and PASS/FAIL/BLOCKED/NOT TESTED.
7. Programmatic API must change/inspect the SAME state and compiler as GUI. Do not introduce a second native menu writer, a new browser permission, or overwrite REDOWN.

Implement in Click2Cloud's designated feature branch only; do not auto-merge to main or transplant to REDOWN V3 until measured parity.
