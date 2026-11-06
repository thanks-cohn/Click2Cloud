# CODEX ADDENDUM — Simple Quick Select and priority favorites
Date: 2026-11-05
Repo: thanks-cohn/Click2Cloud
Branch: feat/glaciaring-agent-debug
Status: Owner-requested next implementation specification; NOT a runtime completion claim.

Read AGENTS.md and /scaffold controlling contract, then docs/CODEX_NEXT_GUI_BASELINE_HIDE_VISIBILITY_AND_NATIVE_LAYOUT_2026-11-05.md and docs/CODEX_NARROW_SELECT_HIDE_LEVELS_AND_SIMPLE_ONE_CLICK_TOGGLE_2026-11-05.md first. Build this in Click2Cloud's same V3+1 canonical engine, CURRENT, native registrar/dispatcher, GUI and typed authorized API, not in REDOWN V3.

## Product intent
Let a user mark **any saved Simple destination** as **Quick Select**, making its exact saved account/bucket/deep folder an immediately actionable provider-sibling menu row rather than requiring another Cloudflare/MEGA/S3 submenu hover. This is a presentation promotion, not a new location, copied configuration, cloud rename, transfer implementation or third engine.

Simple destination manager must show an immediately legible **Quick Select** pin/star toggle on every row, alongside the existing SINGLE button whose text/color alternates Hide/Show. No extra editor required. A subtle selected state and accessible label, reorder controls and disabled/unavailable explanation are required. Persist via an independently typed `quickSelect` flag plus an explicit stable user order/priority field on the SAME destination ID. Default OFF for new/migrated rows.

## Priority rule: first TWO choices
User explicitly asks to prioritize at least two favorites even if other extensions crowd Chrome's menu.

Place the user's chosen Quick Select #1 and #2 at the VERY TOP of Click2Cloud's own menu contents, ahead of Google Drive, Dropbox, OneDrive, Cloudflare R2, MEGA S4 and other supported providers. Order stable, configurable and restored across browser worker restart/backup recovery. Extra promoted Simple destinations, if supported by native menu capacity/UX, follow these two (or live under a truthful "More Quick Selects" fallback after visible priority slots); never silently discard them. No arbitrary five-total-slot cap because 5 provider rows exist.

Native **Flat · Providers First (DEFAULT)** presentation:
[Chrome-created extension grouping, when multiple extension items are visible]
  ★ User Quick Select #1           <- exact Simple destination / direct save
  ★ User Quick Select #2           <- exact Simple destination / direct save
  other Quick Selects, if any      <- direct actions or explicit documented overflow
  --- [optional]
  Google Drive                     <- leaf
  Dropbox                          <- leaf
  OneDrive                         <- leaf
  Cloudflare R2 >                  <- real configured S3 destinations
  MEGA S4 >                        <- only when adapter truly ready

**REDOWN Grouped (OPT-IN)** adds an additional explicit REDOWN branch inside the Chrome-created extension group; priority Quick Selects are the first items under that user-selected REDOWN branch, then providers. In Click2Cloud-owned Explorer custom context menu the Flat presentation may show these actions at its actual first level, because it controls that UI.

## Platform limits: do not mislead
Chrome official contextMenus documentation: https://developer.chrome.com/docs/extensions/reference/api/contextMenus. Multiple visible entries from a single extension are automatically collapsed under one browser-created parent. This holds **even if REDOWN is the only installed extension**. The browser, not our extension, controls placement relative to other extensions. We CANNOT force two independently visible Quick Select items at the outermost webpage right-click level; we CAN control their order at the top of our own grouping. `ACTION_MENU_TOP_LEVEL_LIMIT = 6` applies specifically to the toolbar action context menu, not a five-slot global budget for normal webpage right-click entries. Never promise more than real installed-browser evidence demonstrates. A fallback when native Chrome cannot display both must preserve both saved pins and report a truthful incomplete/pending state, never false "Applied."

## Coexistence with Hide, modes and Flat defaults
- Simple Quick Select ON + Simple destination shown + Show:Simple ON => promoted, one visible native action at provider-sibling level; by default do not duplicate the same Simple action inside its S3 submenu.
- Quick Select OFF => original visible Simple action under S3 provider.
- Simple Hide => no menu shortcut for that Simple record, even if pinned; retain pin/order and saved path; Show restores its prior priority placement.
- Narrow and Depth records remain independently configured; pinning a Simple shortcut never silently deletes or hides their own representations of that target. Explain any apparent duplicates with compiler-derived menu preview.
- Existing Show-in-Chrome **Flat (exclusive Cloudflare default save)** is DIFFERENT from Settings **Flat · Providers First**. For popup Flat, suspend promoted Simple shortcuts but preserve pin preferences. For Settings Flat, always permit them under the Chrome-required grouping.
- If a Quick Select route is not authorized/ready, fail closed: disabled or truthfully omitted, NEVER silently route to another provider/account/folder. Click success depends on verified receipt; menu application success depends on Chrome ACK.
- Stable IDs, collision-safe titles, full target identity and no browsing provenance leakage to cloud API metadata. Reordering/pinning must not mutate the actual S3 prefix, cloud objects, account grants or unrelated mode configs.

## Programmatic API / acceptance
Expose a typed authorized `setSimpleQuickSelect({destinationId,quickSelect,priority,expectedRevision,idempotencyKey})` or equivalent through the SAME domain gateway used by GUI, plus inspect/read and exact compiled projection. Glaciaring remains read-only. Revisioned and replay-safe CURRENT/journals/backups must include pins and priorities.

Prove in installed Windows Chrome where possible: with only REDOWN installed and with many other extensions; 0,1,2,5,10+ Quick Selects; 5 provider rows; flat default vs grouped opt-in; hidden pinned shortcut; swapping priorities; restart/recovery; stale menu ID; duplicate labels across S3 accounts; provider disconnect; literal deep-prefix save readback; native menu ACK. Test visual placement; distinguish PASS/FAIL/BLOCKED/NOT TESTED. Do NOT use a mock/screenshot alone to claim independently outermost browser entries or verified R2 uploads.

Only update Click2Cloud feature branch, never REDOWN production or main without explicit request.
