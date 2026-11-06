# NEXT CODEX REQUEST — Click2Cloud V3+1 premium popup baseline, per-destination Hide, and honest Chrome layout choices
Date: 2026-11-05
Repository: thanks-cohn/Click2Cloud
Target branch: feat/glaciaring-agent-debug
Status: OWNER UX REQUIREMENTS / NEXT IMPLEMENTATION REQUEST. This document is not a claim that the changes exist.
Scope: The actual /scaffold Click2Cloud Chrome-extension product, not REDOWN production.
Priority: AFTER / in coordination with the current AGENTS.md scaffold-first real-product mission. Do not displace essential OAuth, Boot, verified save, durable CURRENT or true native registration.

## 0. Read-first and scope boundary

Read AGENTS.md, docs/CODEX_P0_BUILD_SCAFFOLD_V3P1_AGENT_READY.md, scaffold/README.md, scaffold/gui/README.md, scaffold/gui/CHROME_EXTENSION_LIVE_ACCEPTANCE.md, extension/app.{html,mjs,css}, src/core/{composite-menu,menu-spec,engine}.mjs, the Simple/Narrow/Depth projectors, the CURRENT store, and the native registrar/dispatcher before editing. The existing app already has a working-shaped popup, a destinations list and distinct mode projections, but its current light-blue CSS, row operations and menu-layout presentation do not constitute the owner-approved final premium UX. Inspect, don't assume the branch's runtime works.

This request refines the *existing one-engine /scaffold contract*; it does not authorize a second menu engine, a separate debug-only UI, modification of REDOWN V3, broadened cloud scopes, new cloud provisioning, a rewrite of the Universal File API, or the old 500/1000-case synthetic atlas. Implement focused installed-browser testing wherever possible. Keep existing Simple/Narrow/Depth/All/Flat Show-in-Chrome controls in the ONE + Right Click popup DIRECTLY ABOVE Save as AGENTS.md specifies; never reintroduce an Explorer hierarchy toggle.

## 1. Owner's core interaction contract

The user saves an exact destination once, then can choose independently whether it appears in menus. Stored configuration, menu visibility, provider authorization/readiness, and transfer execution are separate concepts. No action called Hide is allowed to delete or overwrite a destination, a cloud object, its aliases, its backup record, its menu identity, or its account authorization. Hide is reversible and should be the most convenient way to clean up a crowded menu without losing years of user configuration.

For a folder in the Click2Cloud Explorer, right-click => + Right Click opens the single compact configuration popup bound to THAT clicked folder (not stale selected folder). Top + Right Click uses current selected folder. Choose Simple, Narrow, or Depth. Simple: each configured location is a one-click leaf under its S3 provider no matter how many real path segments the bucket contains. Narrow: only chosen destination paths generate their natural ancestor branches. Depth: explicitly enabled authorized bucket scopes generate browseable branches. Simple, Narrow and Depth can coexist when Show includes each; Flat remains the already-defined exclusive direct-save projection. When only the uncustomized Cloudflare default is available, Cloudflare itself can be a leaf. Google Drive, Dropbox and OneDrive are flat direct actions, never submenu parents. MEGA/other S3-compatible provider gets its own S3 branch only after its real native adapter, authorization, click routing and receipts are verified. Do not invent support.

Do not overload a file-right-click with destination editing. On an actual file in Click2Cloud Explorer, the contextual menu should foreground "Save to Cloud" using the exact compiled, current menu and verified route (with any applicable provider submenu); next offer only *actually implemented, permitted* everyday actions such as Open/Preview, Download, Copy/Move/Rename/Delete, with clear separators and confirmations for destructive actions. Disabled/inapplicable functions must not masquerade as working. On an ordinary web page, do not replace or hijack Chrome's native menu; project only supported REDOWN/Click2Cloud entries into the extension's part of that menu.

## 2. TWO LAYOUTS — DEFAULT FLAT / PROVIDER-FIRST; REDOWN GROUPED ONLY BY EXPLICIT REQUEST

Owner decision (overrides prior wording): **Flat / Providers first is the default on clean installation and on migration when no valid prior explicit layout preference is stored.** Do not default to Grouped. Only show a manually created REDOWN provider hub/extra REDOWN arrow if the user deliberately selects **REDOWN grouped** in Settings. Persist the user's explicit choice across restart and recovery; never force a migration that changes a previously chosen and verified layout.

Settings "Right-click layout" uses two clear, compact choices and a compiler-derived preview:

(A) **Flat · Providers first [DEFAULT]**: at the first level REDOWN/Click2Cloud controls within its Chrome-assigned extension menu grouping, list Google Drive, Dropbox, OneDrive as immediately actionable **leaf rows**. Cloudflare R2 and verified MEGA/other S3-compatible providers appear as sibling provider rows, and only these may expand into configured Simple/Narrow/Depth destinations. No *additional REDOWN submenu* is created by Click2Cloud. One configured S3 default may remain a provider leaf, per the existing native engine contract. This is the closest feasible native Chrome representation of the owner's "flat providers" goal.

(B) **REDOWN grouped [OPT-IN ONLY]**: intentionally insert a REDOWN submenu **inside** the extension's browser grouping, then nest provider siblings beneath this explicit REDOWN node. Google Drive, Dropbox and OneDrive still have no children. Only Cloudflare and independently verified S3 provider rows may expand.

**Honest Chrome capability:** Chrome automatically collapses multiple visible entries from a single extension under ONE browser-created parent. The extension cannot force Google Drive, Dropbox, OneDrive, Cloudflare to be independent top-level entries in the outermost web-page context menu all at once. https://developer.chrome.com/docs/extensions/reference/api/contextMenus. This mandated group is *not* the optional REDOWN-created folder of option B. Therefore native installed Chrome should distinguish (A) browser-created extension group > provider rows and (B) browser-created extension group > REDOWN > provider rows. In Click2Cloud's OWN Explorer/dashboard context menu, option A may genuinely show the provider rows at the outermost level (we own that UI). Never fake browser-owned geometry or claim native rootless layout success. Use actual installed-browser screenshot and native parent-ID evidence before saying Applied.

Changing this Settings choice must affect only presentation, not saved destinations, aliases, Show selectors, tokens/permissions, account identity or transfers. Render a real menu preview using the canonical compiler, never static illustrations as source of truth. Chrome ACK required for Applied; failure reports Retry and retains saved state.

**Avoid two "Flat" meanings:** Settings "Flat · Providers first" governs outer provider layout. The existing + Right Click popup Show-in-Chrome **Flat** means the exclusive *single Cloudflare default direct-save mode*. Preserve that existing canonical behavior and storage key; show sufficient UI microcopy, e.g. "Flat (single Cloudflare save)", so users do not confuse it with the Settings layout choice. No new hierarchy toggle in Explorer.

## 3. Destination Manager: first-class HIDE/SHOW action on EVERY configured row

Maintain one manager pop-out with Simple/Narrow filter at top; preserve at most 20 items/page with Previous/Next and search if useful. Each row displays:
- Friendly title (or lowest-folder fallback) prominent.
- One subtle line of exact provider / bucket / path, truncated visually but fully accessible by tooltip/keyboard, no credential data.
- Exactly ONE always-visible per-row button: **Hide** in neutral outline when currently shown; after clicking it becomes **Show** in red-accented styling, with a subtly muted Hidden row. Button text is the NEXT action, so the state is also conveyed in adjacent status text. Clicking Show reverses it without an Edit modal.
- Edit and Delete as icon controls with tooltips and accessible labels. Delete requires confirmation; hiding does not.
- Optional subtle "Hidden" status text, not an attention-grabbing colored pill. Disabled due to authorization must be differentiated from user-hidden.

Default: newly added Simple/Narrow destination is visible (true) unless user expressly sets otherwise. Hidden destination must remain in list, search, backup, undo/history and the same canonical ID; reopening after browser restart preserves hidden state. Save/Apply should update the actual Chrome native projection without destroying and reconstructing underlying saved targets unnecessarily. A failure to apply is truthfully reported and retryable; do not report success from local storage alone.

Per-entry hide contract:
- Simple hidden => no leaf for that configured entry.
- Narrow hidden => remove that configured terminal Save action. Keep any ancestor node ONLY if required to navigate to another visible descendant; hide empty ancestors/unused branches. Hidden parent selection must not hide its separately visible child choices and vice versa.
- If the same exact account/bucket/prefix is exposed through another enabled mode or automatically generated Depth, the user must not be surprised by a still-visible route. Prefer an explicit exact-target "Hide from all right-click modes" policy, keyed on immutable identity and checked in every projection while preserving navigational ancestors for visible descendants. If the smallest compatible implementation instead distinguishes per-entry Hide and all-mode Exclude, label both clearly and provide direct navigation to the setting that still exposes the path; never silently claim that Hide hides a path globally while Depth still shows a save there. Keep exclusion scoped only to exact target by default, not an entire subtree, and make Show reversible.
- A hidden destination cannot accidentally be saved through a stale menu item after native re-registration; dispatcher validates current visibility and exact authorization. An explicit internal API-driven save to a hidden destination requires separately authorized programmatic permission and is not implicitly blocked merely because a UI shortcut is hidden.
- Flat mode's exact Default Save Selection has distinct authority: hiding a configured Simple/Narrow shortcut does not silently change Flat default. If the owner picks global exact-target exclusion, present a clear conflict message for Flat default and require a new explicit default before enabling it, rather than surprise-routing.
- "All" in the Show area enables the three mode categories, not a global unhide of every personally hidden destination.
- Hidden counts ("7 shown · 3 hidden") and Restore all / Show all only as a clear, confirmed bulk action if warranted; do not overload the default popup.

Storage/API: introduce or adapt a backward-compatible visibility/exclusion field, not the existing enabled/ready OAuth flags. Default old records to visible. Persist with revisions in canonical CURRENT; journal/restore/reinstall must faithfully preserve it. Expose typed commands for list/read visibility, preview hide/show change, commit hide/show with revision/idempotency, inspect generated menu and explanation for omission, and inspect native ACK. This is a mutation requiring authorized command gateway; keep Glaciaring read-only.

## 4. Visual design: Pinterest-like minimalism, NOT a clone

Primary inspiration: minimal premium collection-management UI. Palette: near-black #101114 background, elevated surface #1C1D22, bold red #E60023 reserved for primary CTA, active selection and controlled highlights, white #FAFAFA type, muted #A6A6AC metadata, thin neutral border #33343A. No borrowed Pinterest imagery, marks or exact product screens.

Minimal but expensive-feeling: precise alignment, generous balanced whitespace, excellent type hierarchy, small crisp icons, 8–14px controlled radii, near-invisible separators, subtle hover/micro-motion, no giant shadows, neon, busy gradients, arbitrary decorative cards, childish toggles or giant dialogs. Accessible readable contrast, strong focus-visible outlines, responsive narrow viewport, reduced-motion support, keyboard-first operations. Red is NOT the error color by default when it causes ambiguity with brand accents; use sensible textual status.

"+ Right Click" popup: width appropriate to content with responsive max-height; three top tabs Simple / Narrow / Depth, a single precise target-path capsule, title input only where relevant, Narrow-only two-column ancestor title editor (only when Narrow selected), Depth only bucket scopes/depth, and Show-in-Chrome controls directly above sticky Save/Cancel. Cancel/Escape discards drafts. No detached debug.exe/window or surprise navigation. Manage Destinations: one stable popup; list row -> in-place edit with Back beneath the Simple/Narrow switch; Hide/Show stays on the list, immediate but reversible; Delete remains separate and guarded. Manager never shifts wildly on typing, scroll, toggle, or Chrome ACK; preserve focus and the current page/filter. User should be able to add/hide/show/reorder destinations without learning technical "prefix" terminology unless expanding an advanced path detail.

Settings "Right-click layout" should be a small, visual two-choice segmented/card control with a true compiler-derived preview and explicit preview provenance (native Chrome vs app-owned). Show pending/Applied/Retry error with actual ACK; changing layout must never mutate provider credentials or any destination. Style the whole app consistently, including Explorer context menus, not just this one modal.

## 5. Programmatic, testable behavioral contracts

All GUI actions and agent-facing commands operate on ONE canonical domain state and ONE registrar and save dispatcher. They must share exact identity, explicit revision, idempotency, and structured receipts. Preserve accurate distinctions: request accepted, persisted in CURRENT, native menu ACKed, auth-ready, provider transfer verified, externally backed up. No timer-based success. Never pass original source/page/browsing URLs into provider metadata; only approved transfer inputs and minimal file metadata. Keep secrets out of logs, exports and API introspection.

Codex must produce an inspectable decision matrix for at least:
- New vs existing visible/hidden destination; any folder depth; root vs child.
- Same target saved in Simple and Narrow; Depth ON/OFF; global exact-target hiding behavior.
- Hidden ancestor with visible descendant, hidden descendant with visible ancestor, empty branch.
- Compact vs Grouped and Flat with 0/1/many providers, 0/1/many S3 locations.
- Disconnected/expired/reconnected provider; unsupported provider and no OAuth.
- Multiple S3 accounts with identical labels/paths; collision handling without misrouting.
- Edit label, hide/show, Delete, Cancel, restart, recovery restore and backup replay.
- Browser unavailable, native registration failure, stale menu ID, interrupted MV3 worker.
- Real file right-click inside Explorer vs web page right-click outside.
For each, list CURRENT state, expected projected node IDs + parents, user-visible outcome, actual dispatch target (when action), error/partial states, and the evidence that verifies each. Unit/fixture PASS must never be conflated with installed Chrome or live cloud PASS.

## 6. Acceptance journeys — implement, not merely describe

1. Connect an authorized disposable Cloudflare test account and navigate a deep path. Right-click folder, + Right Click > Simple > save. Repeat for 4 unrelated paths (several buckets and differing path depths). All visible leaves route exactly to their individual full prefixes.
2. Open Manage Destinations. Hide #2 and #3. Their labels disappear from the real Chrome projection after ACK, but list, ID, path, aliases and CURRENT remain. Reload, restart service worker, quit/reopen browser and recover from validated backup; visibility is identical. Show #2 and it returns at the correct identity/order. No cloud objects changed.
3. Save a Narrow path with 4 ancestor levels and an additional visible descendant under one hidden terminal node. Hide that terminal: its exact Save action vanishes, the required ancestor to reach the other visible descendant remains, and nothing else is deleted. Test Depth collision and all-mode exclusion semantics explicitly.
4. Toggle Show Simple/Narrow/Depth/All/Flat in + Right Click. Verify independent storage, no stealth unhide, no mode configuration overwrite, no stale native rows. Flat never chooses a different folder when its target is unavailable/hidden.
5. Switch Settings between Compact and Grouped. Inspect actual Chrome context menu via installed unpacked MV3 extension, capture screenshots and native node-ID/parent receipts. Explicitly report whether Chrome's automatic extension grouping makes the requested distinction indistinguishable; do not fabricate rootless entries. Test dashboard/Explorer's genuinely compact custom menu independently.
6. Right-click an actual file in the Explorer, choose a supported cloud destination, and verify upload/read-back and truthful History/receipt. Test disconnection, unsupported providers and failure: no false success, wrong account or unexpected provider.
7. Run focused GUI accessibility, keyboard, contrast, reduced motion and small-screen tests; report specific fixes with screenshots (not only pass counters). Avoid old simulated 500/1000-case testing as a substitute.

## 7. Deliverables and integration sequence

- Implement actual compact dark-red UI and reusable popups in Click2Cloud existing product on the designated feature branch only.
- Implement visibility policy and canonical CURRENT migration, compiler projection, native reconciliation and typed agent gateway alongside GUI, preserving saved records.
- Implement Settings layout modes to the extent truthful under Chrome restrictions; include clear copy and evidence where a native shape is impossible.
- Make file-right-click Explorer dispatch and the Chrome right-click use the SAME compiled menu/action identities and actual authorized save implementation.
- Provide a before/after design capture, real browser menu capture, API/behavior truth table, focused tests, PASS/FAIL/BLOCKED/NOT TESTED receipts and a reversible commit.
- Do not merge or transplant into REDOWN V3 yet. Once Click2Cloud's actual GUI and behavior are proven, use V3 as a controlled comparison baseline; extract observational parity cases and only then plan a non-destructive V3 stabilization/migration. Do not claim V3+1 parity merely because mocks or snapshots agree.

Success criterion: A new user can pick any deep folder, add it in one popup, see the actual immediate menu entry, Hide it without deleting, Show it instantly, and perform a verified save—with exact accessible GUI and programmatic receipts. A clean native layout with real browser constraints is better than a beautiful but impossible promise.


## OWNER CLARIFICATION — CONTROLLING HIDE INTERACTION ADDENDUM

**READ AND IMPLEMENT:** [`CODEX_NARROW_SELECT_HIDE_LEVELS_AND_SIMPLE_ONE_CLICK_TOGGLE_2026-11-05.md`](CODEX_NARROW_SELECT_HIDE_LEVELS_AND_SIMPLE_ONE_CLICK_TOGGLE_2026-11-05.md). It supersedes any wording here implying Narrow Hide only removes a terminal Save action. **Simple rows must have exactly ONE always-visible toggle button whose label and color change between Hide and Show (no editor/modal); Narrow's two-column Menu Titles view must have Select Mode, then ONE changing Hide selected/Show selected action placed directly ABOVE sticky Save/Cancel. Hiding levels compresses the visible menu branch without altering any real folder path.** Only Save commits the Narrow draft; Cancel discards it. Whole-destination Hide and individual Narrow-level Hide are distinct. Settings layout defaults to Flat/providers-first; REDOWN grouped is opt-in. Shared engine, CURRENT persistence, native ACK, recovery and typed API contracts apply to both.


## OWNER ADDENDUM — QUICK SELECT PRIORITY SHORTCUTS

Read and implement [Quick Select priority requirements](CODEX_QUICK_SELECT_SIMPLE_PRIORITY_MENU_2026-11-05.md) as part of this GUI baseline. Any Simple destination may be promoted by a visible manager-row Quick Select control, with a stable user-reorderable priority. The user's two chosen favorites must render **first inside Click2Cloud's own native menu group**, above provider rows, in both Settings Flat/provider-first (default) and explicit REDOWN grouped modes; other installed extensions do not consume our internal two priority positions. Chrome automatically creates a grouping parent whenever an extension has multiple simultaneous menu entries, even when it is the only installed extension. Do not promise two independent outermost webpage context-menu entries. Preserve exact target, Hide state, CURRENT, and native ACK/receipt truth.
