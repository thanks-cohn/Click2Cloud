# CODEX REQUEST — Click2Cloud V3+1 final GUI, quiet login, Windows-style Explorer, and programmatic API
Date: 2026-11-05
Repository: thanks-cohn/Click2Cloud
Historical implementation branch: feat/glaciaring-agent-debug (not the next-run branch; see AGENTS.md)
Status: FINAL OWNER-APPROVED CONSOLIDATED REQUEST, NOT A CLAIM OF IMPLEMENTATION.

> **Updated owner priority (2026-11-06):** This November 5 document is a historical reference **for non-conflicting requirements only**. The controlling native-menu shape, Cloudflare naming, automatic initial `redown` destination, flat-to-nested transition and continuous ~30-minute Codex working cadence are in `AGENTS.md` and `docs/CODEX_SMALL_MILESTONES_TO_SURPASS_REDOWN_2026-11-06.md`. Earlier assertions here that this is the single controlling request do **not** override those newer instructions. Preserve other approved UI/API behavior.
>
## Authority and scope

**HISTORICAL NOVEMBER 5 OWNER UX/BEHAVIOR REQUEST.** The newer November 6 menu rules and current main-based Codex branch instructions in AGENTS.md take precedence. It replaces conflicting earlier November 5 menu-layout, Quick Select, threshold, Hide and GUI drafts:
- docs/CODEX_NEXT_GUI_BASELINE_HIDE_VISIBILITY_AND_NATIVE_LAYOUT_2026-11-05.md
- docs/CODEX_NARROW_SELECT_HIDE_LEVELS_AND_SIMPLE_ONE_CLICK_TOGGLE_2026-11-05.md
- docs/CODEX_QUICK_SELECT_SIMPLE_PRIORITY_MENU_2026-11-05.md
- docs/CODEX_SMART_SEVEN_ENTRY_MENU_ORGANIZATION_PROMPT_2026-11-05.md

Preserve non-conflicting engineering and security requirements from AGENTS.md, docs/CODEX_P0_BUILD_SCAFFOLD_V3P1_AGENT_READY.md, scaffold/README.md, scaffold/gui/README.md, scaffold/gui/REDOWN_OAUTH_EXTRACTION.md, scaffold/gui/CHROME_EXTENSION_LIVE_ACCEPTANCE.md and independent recovery/Whole Cloud contracts. Do not pursue the retired 500/1,000-scenario synthetic atlas or a separate mock-only menu engine.

**DO NOT INCLUDE the former "V3 versus V3+1 strategy" section, staged comparison roadmap, or production-migration discussion.** Build Click2Cloud as a real product on this feature branch; no merge/deploy without authorization.

**Inspect the ACTUAL feature branch first.** At specification time its extension/manifest.json identified a diagnostic Glaciaring Lab, and extension/app.html, app.mjs, app.css and a dedicated src/auth folder were NOT present on this branch, although other refs mentioned them. Existing core, registrar, Explorer and persistence modules may be reusable, but a document is not proof of an installed working OAuth or GUI. Port/create the product on the actual target branch; do not claim it is already present.

## Priorities

1. **Log in must be simple**: user clicks Log in, completes the provider's normal sign-in, and returns Connected; no unrelated screen, process or interruption.
2. File Explorer must look and work like **traditional Windows File Explorer**: familiar navigation, panes, columns, toolbars and context menus; absolutely minimal decoration.
3. Premium yet restrained black/red/white app styling with instant Light/Dark switch.
4. Simple and Narrow destination controls should require almost no explanation. Keep all original pencil/trash controls.
5. Real native Chrome menu, highest priority to promoted Quick Select shortcuts, user-controlled provider nesting, exact default folder.
6. **EVERY meaningful workflow must aim to be programmatically accessible through an expanded versioned, typed and permission-gated V3+1 API**. UI and API must use ONE canonical state, ONE compiler, ONE registrar and ONE dispatcher.

## One aesthetic system: minimal, premium, themeable

Dark by default: near-black #101114, charcoal #1C1D22, white #FAFAFA text, muted gray #A6A6AC, restrained red accent #E60023. Light mode: clean off-white/white surfaces with near-black text and same red accent. Original Pinterest-like precision, not copied Pinterest graphics, no heavy neon, excessive ornaments, needless gradients, giant dialogs or confusing decorative widgets.

One Light/Dark control in Settings, optionally duplicated in the main app chrome, switches immediately across Remotes, File Explorer, Destination Manager, all editable popups and Settings. Persist preference and expose get/set via typed API. Ensure text contrast, clear focus rings, screen reader labels, reduced motion, narrow screen and high-DPI behavior. **Chrome-owned native context menus cannot be themed by our extension.** Do not fake them.

## Windows-standard File Explorer — key visual priority

Make Explorer instantly familiar to a Windows 11 user. **Layout and usability take priority over REDOWN-like ornamental dashboard design.**

- Conventional left navigation pane: cloud connections/accounts, S3 buckets, expandable folder tree, selection highlight and folders visible without an artificial "Browse folders" gate.
- Normal top toolbar: Back / Forward / Up / Refresh, breadcrumb address navigation, search if actually supported, view switch, and appropriately placed + Right Click / Manage Destinations controls. No extra "hierarchy" toggle.
- Familiar main Details/List view with columns Name, Date Modified, Type, Size wherever source metadata allows. Optional grid/thumbnails. Ordinary file/folder icons, selection rectangle/row highlight, sort if supported, clear empty/loading/error states, stable scrolling and pagination.
- Double-click folders to navigate, preview/open files according to actual capability. Familiar keyboard operations: arrows, Enter, Escape, Shift+F10, Tab, Ctrl/Shift multiselect, F2 for supported Rename, Delete with confirmation. Never steal focus while user types.
- Folder context menu: Open, + Right Click, **Make Default**, Manage Destinations, and only implemented supported file operations. File context menu: save to cloud using the SAME compiled provider/destination router, Open/Preview, Download, Copy/Move/Rename/Delete only if real and authorized. Unavailable actions must never masquerade as working.
- No overlapping popouts, separate Python debug.exe windows, unexpected new pages, or styling that looks like a marketing dashboard instead of a file manager.
- Reuse existing Universal File API, authenticated provider listings and exact source IDs. No parallel Explorer backend, fabricated files/folders or guessed account.

## Login flow — intentionally quiet, standalone, human-approved

**Click Log in -> provider's normal sign-in/consent -> return Connected. NOTHING ELSE should start during login.**

- Each supported provider card displays exactly one obvious Log in / Connect action when disconnected. Launch its real registered OAuth/provider login for the Click2Cloud extension identity. A genuine provider-managed login/consent browser window is allowed; unrelated app dialogs, arbitrary "enter scope IDs" text prompts, debug popups and manual token-copy requirements are NOT.
- Use only required registered scopes, validate state/PKCE/redirect and verify account identity. Do not reuse REDOWN extension credentials or pretend a Cloudflare Worker binding substitutes for user's OAuth. If provider registration/configuration is unavailable, show a compact truthful error and Retry/Connection setup required, not false Connected.
- Never simultaneously create buckets or folders, activate billing, scan whole clouds, start uploads, trigger Save Whole Cloud, reconfigure menus, interrupt login with recovery questions, jump unexpectedly to Explorer, or open gratuitous pages.
- On successful callback, update card and minimal connection status; allow Explorer to load when requested. Auth failures/cancellation return to disconnected with simple retry. Already-authorized optional background jobs can resume quietly after a normal same-account reconnection only under existing specific opt-in rules and never block or nag during sign-in.
- Expose safe login begin/status/cancel/disconnect and identity/authorization inspection through the typed API; actual provider consent always needs the human interaction. Never log/export tokens.

## + Right Click popup — preserve existing modes and save semantics

One compact reusable popup bound to the EXACT clicked folder (never stale selected folder), three configuration tabs Simple / Narrow / Depth, immutable original provider/account/bucket/prefix, optional presentation title, sticky Save/Cancel. Aliases NEVER rename a cloud object or change the full destination prefix.

Simple: any deep folder becomes a one-click destination leaf under S3 provider. Multiple independent saved locations, deepest folder fallback menu title.

Narrow: configured paths form nested natural hierarchy; Narrow-only TWO-COLUMN Menu Titles editor shows actual immutable folder segment on left and optional editable menu title on right. No text-magic hide convention whatsoever.

Depth: independently enabled, actually authorized buckets and discovered folder trees; starting display depth 10 without arbitrary hard max, distinct from background recovery crawl depth. Do not invent undiscovered paths.

Show in Chrome remains ONLY in the + Right Click popup, immediately above Save/Cancel: Simple ON/OFF, Narrow ON/OFF, Depth ON/OFF, All and existing exclusive **Flat (one direct Cloudflare default save)**. Do not confuse that special Flat projection with Settings' default provider-first layout. Simple/Narrow/Depth may coexist when selected, and hiding a mode never deletes saved configurations. Cancel/Escape discards drafts and does not alter native menus. No separate Explorer hierarchy toggle.

## Destination Manager — simple row controls

One elegant pop-out with Simple/Narrow filter at top (FILTER, not mode conversion), max 20 saved records per page, Previous/Next, stable scroll/page, in-place editor, Back-to-Destinations under filter. No unnecessary nested settings windows.

Every **Simple** destination row has FOUR immediately available controls:
1. **ONE Hide / Show button** that changes its text and color after click: when shown button says Hide; when hidden says Show, and the row remains present/muted. Direct reversible action; no extra editor/modal, no confirmation, no cloud deletion. Indicate native menu ACK/pending failure truthfully.
2. **ONE Quick Select / Quick ✓ button** that changes its text and color immediately when clicked. Toggles promotion of the SAME Simple saved destination to direct-save first-level action within Chrome's extension grouping. No other modal, no extra edit screen.
3. **Pencil icon** — preserve current edit Menu Title workflow (never rename real folder).
4. **Trash icon** — preserve current confirmed removal of saved destination CONFIG ONLY (not actual cloud folder/file).

A hidden destination can remain Quick Select ON; Hide wins until user selects Show. Preserve exact canonical ID/target, title, flags and order, including across restart/restore. The user should not have to learn internal terms like prefix to operate this manager.

## Narrow Select Mode — skip intermediate menu levels safely

In the existing Narrow two-column Menu Titles editor, add obvious **Select Mode**. Click or check arbitrary ancestor rows, multi-select nonadjacent or Shift-range, Select All/Clear, show selection count. ONE changing action button directly **above the bottom Save/Cancel footer** reads Hide selected for visible/mixed selection or Show selected for already hidden selection, with matching clear color/state. It modifies only draft projection; **Save** commits the visibility changes atomically and reconciles real Chrome; Cancel discards.

Example: true Cloudflare prefix has 20 directory levels. Hide levels 11–18; Chrome should show levels 1–10, 19, 20, in the same order, and saving must still use the **unaltered exact 20-level destination path**. Do not rename provider objects or folders. No empty intermediary flyout menus. Correctly preserve shared ancestors, independent sibling destinations, Save Here on a hidden final label, collision safety across different accounts/buckets, and reliable Show restoring old labels/order. Distinguish whole-destination Hide from individual level Hide.

## Default Location, Quick Select, Favorite Cloud are different things

- **Default Location ONLY. NO Default Cloud feature.** User right-clicks an EXACT real folder in Explorer and chooses **Make Default**. Store one exact provider/connection/account/bucket/folder prefix, explicitly user-chosen. No redown bucket probing, creation, guessing, automatic fallback or side effect.
- **Quick Select** is a per-Simple-destination promoted direct-save shortcut, user-controlled and prioritized first. If same target is default and promoted, do not make duplicate identical native actions.
- **Favorite Cloud** is just an optional persistent Settings marker per actual cloud connection. It has **ZERO effect** on menu nesting, priority, auto-placement, default location, permissions or save routing in this iteration. Expose marker via API for future use, no telemetry.

## Chrome layout and Organize Right-Click popup

Default layout: **Providers first**, no redundant REDOWN-created root. Chrome itself automatically groups multiple visible extension entries under one browser-created extension parent. Do not pretend user can bypass that parent or alter ordering against other extensions. The 6-item ACTION_MENU_TOP_LEVEL_LIMIT applies to extension toolbar-action menus, NOT a general limit of six web-page right-click actions (official Chrome docs: https://developer.chrome.com/docs/extensions/reference/api/contextMenus).

Destination Manager top toolbar has **one small circular sliders-horizontal icon** with tooltip/accessible name **Organize Right-Click**. Opens one premium, compact popup available ANY TIME. Every supported/visible cloud provider has ONE changeable **Keep Direct / Under REDOWN** toggle, preview, Save/Cancel. This preference controls provider PLACEMENT ONLY; never modifies auth, original exact folder, save command or Quick Select. No unnecessary additional permission.

**Quick Selects ALWAYS appear first and directly clickable at the first level INSIDE Chrome's automatically created extension grouping**, to the extent the user has enabled their Simple display and not hidden a specific shortcut. Their first two entries are highest ordered, followed by any others in saved user order; do not impose hard two-Quick limit. When one provider gets nested, Quick Selects are NOT nested with it.

Providers with Keep Direct are immediate siblings of Quick Selects (Cloudflare/verified S3 may still expand for their configured folder destinations; Google Drive/Dropbox/OneDrive stay actionable one-click leaves). Providers with Under REDOWN appear under ONE additional **Other Clouds** submenu (avoid REDOWN -> REDOWN). They retain real supported internal S3 menus if applicable. No fake MEGA support until real adapter, auth and verified native click exist. An unconnected provider can't be silently treated as working.

On a user change that takes the **visible direct-entry count above SIX** (7 or more), offer a subtle nonblocking suggestion to Organize Right-Click. Count = visible Quick Select leaf actions + visible direct provider headings/leaves. Do not count nested descendants, hidden actions, separators, utility items or Chrome's automatic parent. Examples: 4+2=6 no prompt; 4+3=7 prompt; 5+2=7 prompt; 6+1=7 prompt. This is a PRODUCT USABILITY TRIGGER, NOT a hard API limit. Never automatically regroup; user can choose to Keep Direct, Under REDOWN, or dismiss. Suppress repeated suggestions for same unchanged preference/count, never interrupt login/upload/startup. The circular button always opens the same popup.

In-app Explorer right-click menus and real Chrome menus should derive from SAME compiler, but the app-owned UI may have a genuinely outermost menu; only real installed Chrome + registration ACK can establish browser behavior.

## Complete, better V3+1 programmatic API — mandatory, not optional

**EVERY meaningful GUI workflow and setting must be inspectable and operable through a versioned, typed, secure first-party V3+1 domain API.** This is a fundamental INCREMENT AND BETTERMENT of the existing API. Do not create GUI-only mutable state or a parallel API-only cloud/menu implementation. The GUI should be a thin presentation adapter over the SAME domain commands, state, identities, provider authorization and native menu registrar/dispatcher used by authorized agents and headless tests. A future MCP/ChatGPT adapter is a downstream optional connector, not something to pretend already active.

API coverage:
- Capability discovery, version/schema, exact provider/connection/account IDs, redacted auth/ready status, normal OAuth begin/status/cancel/disconnect (human provider consent remains interactive).
- Explorer provider/account/bucket/folder listing, pagination, file metadata and supported file operations through existing Universal File API. Navigation/selection state where appropriate.
- Simple/Narrow/Depth create/inspect/update/delete, immutable actual target, aliases, Hide/Show, Quick Select pin/order, Narrow batch selected-level show/hide, Show-in-Chrome modes, exact Make Default, provider Keep Direct/Under REDOWN layout, menu preview and omission reasons.
- Theme get/set, favorite cloud metadata get/set, organization suggestion count/eligibility/dismissal, in-app popup/view preferences where meaningful, authorized recovery/backup status and operations, optional Whole Cloud status, saved CURRENT revision.
- Native menu desired/compiled/registered ACK and source-account-aware save dispatch with verified provider response/readback. Every GUI change produces a typed before/after state/revision, explicit result/partial/error code and structured operation receipt.

Use stable IDs; expectedRevision/expectedGeneration fences and idempotency keys for writes, pagination/cursors for large lists, transparent state transitions, permission checks, guarded destructive actions and explicit auth scope. Authorize mutating agent calls through a SEPARATE opted-in secure local gateway; **Glaciaring diagnostics stay READ-ONLY**. Do not provide a public arbitrary network endpoint or credentials to API clients, never bypass human OAuth consent, and don't leak source/page/browsing URLs, tokens or sensitive metadata to provider APIs or diagnostic/backup/telemetry output. Future analytics are OFF absent informed opt-in. API must be usable to produce deterministic "when user does X, IF condition THEN outcome ELSE reason" behavior maps without screen scraping.

## Persistence, recovery, and truthful execution

Keep canonical versioned CURRENT and existing external-backup/journal goals; migrate safely, preserving stored aliases, simple/narrow/depth modes, target identities, hide flags, Quick priority, Narrow hidden-level flags, exact default location, theme, favorite cloud marker, provider placement, popup dismissal. Do not claim local IndexedDB alone survives uninstall. Keep real native contextMenus reconciliation resilient to MV3 worker restart and stale registered items. Persisted state, browser ACK, provider auth-ready, upload response and verified readback are independent proof classes.

Preserve original Recovery Mode and Save Whole Cloud features where supported, but these jobs MUST NOT interrupt normal provider login. No background work without the prior explicit authorization. No timer-based success. No hidden account fallback.

## Focused acceptance tests with independent real evidence

1. Fresh install: user clicks Cloudflare Log in, genuine provider sign-in runs without extra scope text prompts, provisioning, background full-cloud scans, unrelated popouts/tabs or surprise navigations. Successful callback updates connected state. OAuth unconfigured => truthful BLOCKED; cancelled => quiet disconnected/retry.
2. Actual Explorer shows Windows-style left tree, conventional toolbar/breadcrumbs, Details columns, normal folder double-click and right-click, correct file icons and real provider listings. Keyboard, multiselect, resizing, accessibility and small-window tests.
3. Folder right-click Make Default captures the exact real provider/account/bucket/full folder prefix. Nothing else is created or redirected.
4. Four Simple folder shortcuts at varying depths; each row shows SINGLE Hide/Show and SINGLE Quick Select toggle, plus preserved pencil and confirmed trash. Hidden+Quick state persists, order stable, native menu reflects it after ACK.
5. Narrow 20-level path: multi-select hide middle 8 levels, press Hide selected then Save. Correct compressed visible order, unchanged full upload path; test Show restore, shared children, hidden final segment and overlapping configured paths.
6. Show Simple/Narrow/Depth independently, All and deliberate exclusive Flat, preserve configs, no silent appearance toggle. Genuine Depth supports explicit buckets and actual discovered nodes.
7. Quick Select ordering: first two strongest, others follow, no duplicate default action, all directly under Chrome automatic extension grouping when Simple visible; test disconnected account and failed dispatch.
8. Organize popup: 4 providers+2 quick =6 no suggestion; add 3rd quick =>7 suggestion; 5 providers+2 quick=>7 suggestion. Dismiss and no nag, open at will by circular sliders, provider-level Keep Direct/Under REDOWN edits only parents, never actual route or Quick shortcuts. Verify Chrome screenshot and native ACK.
9. Light/Dark theme across EVERY app view; favorite marker storage changes no menu behavior; no attempt to theme Chrome's system context menu.
10. Test each domain operation from authorized API without GUI automation: read before/after, revisions, idempotent retry, permission failure, version negotiation. Confirm diagnostic Glaciaring cannot write and API status reflects actual native/provider receipts.
11. Restart/kill MV3 worker; reconcile menu without duplicates, preserve CURRENT and (where available) validated external recovery; reauth with correct account identity, no bogus success.
12. Actual native Chrome save and Explorer-to-cloud save with verified provider receipt/readback to EXACT account/bucket/full prefix; separate PASS/FAIL/BLOCKED/NOT TESTED with browser screenshots and source evidence.

## Deliverables

- A real installable Chrome MV3 Click2Cloud extension on the target feature branch, not a mock/demo-only GUI.
- Premium minimal Dark/Light product surfaces and **ordinary Windows-style File Explorer**.
- **User-initiated, quiet working OAuth login** and real authenticated provider listing.
- Working + Right Click, Simple and Narrow manager, Quick Select, Hide/Show, Default Location, favorite-only marker, and selective provider organization from small circular sliders popup.
- A **significantly expanded headless typed V3+1 programmatic API** covering all meaningful user operations, using the same engine and permission model as GUI.
- Source-backed concise acceptance report, installed extension path, native menu ACK, verified save receipts and explicit blockers; commits to the new development branch created from the latest main, under the November 6 AGENTS.md rule.

**Definition of done:** user logs in normally, browses a familiar standard Explorer, manages exact cloud destinations with simple direct controls, obtains reliable Chrome Quick Saves, and can inspect/automate every meaningful permitted operation via the same secure V3+1 API.
