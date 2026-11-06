# Codex addendum — Simple one-click Hide/Show; Narrow multi-select Hide Levels

> **FINAL REQUEST SUPERSEDES CONFLICTING UX RULES (Nov. 5):** [CODEX_FINAL_V3P1_GUI_WINDOWS_EXPLORER_LOGIN_AND_API_2026-11-05.md](CODEX_FINAL_V3P1_GUI_WINDOWS_EXPLORER_LOGIN_AND_API_2026-11-05.md) is the controlling next Codex implementation contract. Older layout, threshold, Quick Select, default/favorite and GUI behavior here are historical wherever they conflict. Keep only non-conflicting engineering/security requirements. This is NOT evidence of product implementation.
Date: 2026-11-05
Branch: feat/glaciaring-agent-debug
Status: Owner-approved NEXT GUI baseline requirement. This document does not claim implementation.
Companion: docs/CODEX_NEXT_GUI_BASELINE_HIDE_VISIBILITY_AND_NATIVE_LAYOUT_2026-11-05.md
READ first: AGENTS.md and the current /scaffold instructions. This addendum refines the companion's Narrow Hide contract, not the production REDOWN V3 code.

## 1. Simple destination manager — immediate at-a-glance toggle

Every Simple destination row has **exactly ONE always-visible button**. Its label and color change on click; there are NOT two separate Hide and Show buttons and no modal:
- When the destination is visible, the single button reads **Hide** (neutral/dark outline, clear affordance). Clicking it hides the shortcut.
- When hidden, that SAME button reads **Show** (red accent), and the row remains in place, subtly muted with readable "Hidden" status. Clicking it shows the shortcut again.
- The button label names the next available action, while row status makes the current state obvious. Do not rely on color alone.
- One click toggles just the displayed shortcut; no confirmation, extra modal, destructive action, or editing required.
- Preserve account, bucket, full prefix, alias, canonical ID, order, saved state, journal/backups, and any unrelated mode configuration. No cloud folder/object changes.
- Optimistically indicate "Updating…" if needed, then only report "Applied" on real Chrome native menu ACK. On failure, show a compact "Retry" affordance and coherent persisted-vs-applied status; no false success.
- Simple row retains subtle separate Edit and confirmed Delete controls; Hide is NOT Delete and must be obvious at a glance.
- Provide accessible button names and states and keyboard operation; no tiny hover-only controls that users cannot discover.
- Hiding one Simple shortcut does not automatically hide an independently represented Narrow/Depth route. Expose per-mode visibility truthfully; any optional cross-mode exclusion must have its own explicit scope and name.

## 2. Narrow two-column Menu Titles editor — SELECT MODE IS MANDATORY

**Select Mode is the only required level-hiding interaction.** Do not implement a magic text command, parser, or alias syntax for hiding levels. Users interact with rows and a single action button, not keywords.

The existing two-column editor remains: original exact path segment (immutable) on left, editable presentation Menu Title on right, ordered bucket root → final selected folder. Selecting a row does NOT edit its real directory name.

In Select mode:
- Display a compact checkbox/selection square on each level row, with click selection, Shift-click range selection and Ctrl/Cmd-click toggles for nonadjacent rows. Plain checkbox selection without modifiers must work. Keyboard navigation/selection and visible focus required.
- Add small **Select all**, **Clear selection**, selected count, and ONE action button directly **ABOVE the bottom Save / Cancel row**. The button is **Hide selected** (neutral/dark outline) for selected visible or mixed levels; click hides them in the unsaved draft, then that SAME button changes to **Show selected** (red accent) when the selected levels are all hidden. Clicking again restores them in the draft. A mixed set deterministically defaults to Hide selected; never silently flip only part of the selection.
- That one action button must be unmistakable but not decorative. A compact "Selected: 8" and "Hidden: 8" status lets the user understand what will happen without relying on color alone. No separate floating action panel or second Show/Hide button.
- All changes remain **DRAFTS** until the user explicitly hits the fixed-bottom **Save** beneath the action button. Only Save commits atomically to canonical CURRENT and reconciles native Chrome. Cancel/Escape discards unsaved drafts; no Chrome changes leak from selection or preview.
- Hidden level rows remain visible in editor, clearly but subtly dimmed/marked, and can be reselected and shown. Show restores the previous menu title and original order.
- Long ancestor lists must scroll within the popup without losing sticky controls, focus or selection.
- Compact Pinterest-inspired near-black/red/white visual language from companion request, no excessive panels or flourishes.

A whole Narrow destination may also have a manager-level **Hide destination** button, but this is a DIFFERENT operation from **Hide level(s)**. The former removes the configured destination from menu presentation; the latter compresses that destination's visible ancestor chain while retaining its save action. The manager-level destination toggle follows the SAME single-button Hide/Show convention as Simple.

## 3. Compression semantics: menu presentation only

Example real full prefix: `redown/01/02/03/04/05/06/07/08/09/10/11/12/13/14/15/16/17/18/19/20/`
If selected menu levels 11–18 are hidden, the visible projected chain displays levels 01–10, 19, 20, in correct order with **no empty flyouts**. The clickable final destination still saves to the full original 20-level prefix. The real cloud object's key/prefix is NEVER rewritten.

Represent the visibility independently of aliases and transfer authority, keyed by stable destination ID and canonical prefix-segment identity rather than label/index. Recommended conceptual persisted form:
`{destinationId, target, destinationVisible:true, levels:[{segmentPrefix, alias, menuVisible:true|false}, ...]}`
Do not confuse visibility with enabled authorization or delete. Migrate old configs to all levels visible while preserving aliases, full targets, and revisions. Save this in CURRENT, logs/journals/backups/recovery; return it through typed agent APIs, with scoped authorized preview/batch mutation and operation receipts. Debug observer remains read-only.

Shared branch complication: two different configured Narrow paths may share a visible ancestor. Deduplicate into one natural branch only where canonical identities and visible presentation allow it; if a hidden ancestor is needed for routing to another visible destination, remove that ancestor's displayed menu level but preserve navigation through the closest visible ancestor, without silently hiding independently configured destinations. Avoid label collisions through explicit stable disambiguation and never merge different accounts or buckets. A visible parent destination that has children must still offer an explicit, correct Save Here leaf when necessary. Hiding the final selected folder's *menu level* must never make the save action disappear into the wrong ancestor: attach an explicit, user-understandable actionable leaf to the nearest visible parent. Do not allow hiding the Cloudflare/MEGA provider heading itself as a Narrow path-level operation; hide provider via its own connection/visibility setting, if supported.

A live popup menu preview must use the SAME compiled model as the real native menu. Actual applied status requires Chrome registration ACK, and live save status requires provider-confirmed receipt.

## 4. Layout default from owner clarification

The Settings **Flat · Providers first** layout is the default. **REDOWN grouped** is displayed only after the user explicitly requests it. Actual native Chrome can auto-group multiple extension items under its own extension parent; Flat means *no additional developer-created REDOWN submenu*. A true outermost provider-first menu is available inside the app-owned Explorer context menu. Do not pretend Chrome can show four independent outermost extension menu entries. This Settings layout is independent of the existing popup Show-in-Chrome Flat (exclusive direct Cloudflare save).

## 5. Programmatic operation and tests

Expose one typed batch command with semantics equivalent to `setNarrowLevelVisibility({destinationId, segmentPrefixes:[...], visible:false, expectedRevision, idempotencyKey})`; the GUI calls exactly this command through the same engine as future authorized agents. Include a corresponding read/inspect and preview change endpoint. No reserved text command exists for hiding. No hidden parser or special alias syntax; the API receives typed boolean visibility fields with immutable level identities.

Run focused acceptance for:
1. Simple row Hide then Show without Edit and without changing target/ID/path; retry native failures; survive restart and restore.
2. Narrow 20-level case hiding 11–18 in one selected-range action and restoring them, preserving full save target and ordering.
3. Nonadjacent selections, Shift-range, selecting all, Cancel, accessibility, small viewport, keyboard.
4. Hidden middle/first/final segment, shared ancestors, different accounts, duplicate aliases, visible child under compressed ancestor, "Save here", and no empty/fake menu nodes.
5. Simple/Narrow/Depth co-display, Flat default distinction, native menu ACK and real provider save verification.
6. Agent API batch update and readback give identical result to GUI; keep diagnostics read-only and never report mocks as real Chrome success.

Implement on Click2Cloud feature branch only. Do NOT modify REDOWN V3 or silently merge into main.
