# P0 — R2 Worker Authority, Basic Explorer Operations, Narrow, Save Latency + Minimal Theme

**Repository:** thanks-cohn/Click2Cloud  
**Reference build:** `c337e41` (Click2Cloud 0.3.19)  
**Purpose:** Implementation brief for Codex, not evidence that fixes have been made.

## Nonnegotiable product behavior

A user who has authenticated to Cloudflare with appropriate R2 permissions must be able to create folders, create buckets, copy/paste, move, rename, delete, set defaults, and save to any authorized bucket and directory **without artificial per-folder Worker scope failures**. Basic operations must be reliable, immediate in feedback, and verifiably correct. Account-wide R2 operational capability is the product goal; respect real Cloudflare service limits and the authenticated account's actual granted permissions. Broad backend capability does **not** permit anonymous/public Worker requests.

### Observed failures to reproduce and diagnose
- `WORKER_DESTINATION_SCOPE_REQUIRED`, `REPAIR_REQUIRED` for `valentine/files/` after successful re-login.
- `NATIVE_APPLY_INCOMPLETE` involving bucket `redown` when the user was working in another bucket.
- File Explorer **New Folder** sometimes does nothing, even after refreshing.
- Some Narrow ancestor/root `Save here` actions are disabled; others work.
- `Make Default` reports configuration saved while destination is unavailable.
- Expired or rejected Cloudflare login was not surfaced promptly.

Do not conflate these errors; trace each one to its actual call path.

## 1. Worker capability architecture — remove artificial directory restrictions

Audit `src/cloudflare/deployment.mjs` and the surrounding R2 Worker, authorization, binding, and routing code. The existing `PREFIX_SCOPE`/saved `prefixScope` design rejects other folders within the same bucket. Design and implement authorized **account-wide R2 operation coverage** over all accessible buckets and directories. A Worker bound to one R2 bucket cannot automatically access unrelated buckets: if bindings or credentials are needed for multiple buckets, implement the appropriate routing and account-level provisioning mechanism behind the scenes. Never falsely claim all buckets are already accessible.

- No requirement for separate Worker permission/setup at each directory level.
- Root and nested saves work throughout authorized storage.
- User login and proper request authentication remain required. Validate target account/bucket and operation authorization on every request; do not make Workers public-write endpoints or expose secrets.
- Migrate pre-existing prefix-constrained Worker plans/bindings and keep user destinations/configuration. Require user approval for actual authorization or binding expansion when needed. Verify deployed state, not just local configuration.
- Clear and recoverable errors only when Cloudflare truly denies an operation; do not substitute another bucket's configured default.

**Evidence in reference code:** `prepare()` rejects a changed `prefixScope` with `WORKER_DESTINATION_SCOPE_REQUIRED`; plan reconciliation checks `PREFIX_SCOPE` binding. Eliminate the artificial restriction *and* update actual deployed configuration accordingly, not simply hide error strings.

## 2. Basic File Explorer operations are P0, independent of right-click menu modes

- **New Folder:** bucket root or any nested prefix; use Explorer's current selected account, bucket and path, never the stored default. Display naming UI and actionable error, recover from failure, never hang silently. Confirm folder marker/listing behavior for R2.
- **Copy/Paste:** within bucket and across authorized buckets; correct target path and exact source; no truncation, corruption or misleading success. Handle partial failures safely.
- **Create Bucket:** add only under **File Explorer → More → Create Bucket** (not the extension's global More or webpage right-click menu). Use selected account, follow Cloudflare's real creation rules; refresh Explorer once creation is verified.
- **Move/Rename/Delete:** preserve existing functionality; correct source/target and safe cross-bucket behavior. Do not delete source before confirmed successful move. File Explorer's existing right-click menu has **Delete** only; keep default destructive-action confirmation with optional Settings toggle to skip, as previously specified.
- **Make Default:** disable while target is genuinely unavailable, give short explanation, do not say saved when the target isn't usable; preserve current default after a failure. Do not confuse chosen destination with what user can do in Explorer.
- Authentication loss should surface promptly. As separately specified, if Shelf needs login, return to **Remotes** and change the existing **Log In** button text to **Reconnect**, with a subtle moving green edge shimmer; no additional screen or button. Restore normal appearance after authentication.

All ordinary R2 Explorer operations must function independently of whether Simple, Narrow or Depth is configured, and independently of whether Chrome has applied a native context menu.

## 3. Narrow — selected path and every ancestor are saveable

For selected `bucket/A/B/C/`, the menu includes independently actionable, correctly routed `Save here` for:

- `bucket/`
- `bucket/A/`
- `bucket/A/B/`
- `bucket/A/B/C/`

Every visible ancestor through the bucket root must be **enabled and saveable** when the account is authorized; no separately-selected-ancestor requirement. Do not invent/display unrelated siblings. Merge common ancestors without duplicate save entries when multiple branches are selected. Keep independent branches and multiple buckets correct. Narrow is **ancestor-chain projection**, Depth is **limited descendant discovery**; do not regress Simple or Depth. Verify actual saved R2 object targets, not just labels.

## 4. Investigate whether broader Worker capability can reduce save latency

**Measure first; do not presume that broad permissions automatically speed up upload.**

Profile click-to-dispatch → authorization/readiness → Worker invocation → fetch/upload → R2 acknowledgment → receipt/verification. Determine whether repeated readiness probes, Worker provisioning checks, redundant OAuth requests, prefix validation/routing, Worker startup, or unnecessary network round trips are costing time. Optimize only the demonstrated bottlenecks; retain authenticated authorization, successful-save integrity and receipt semantics. Avoid repeated setup work on every normal save when cached readiness is valid and correctly invalidated.

Benchmark same file sizes, source sites, destinations, network conditions and build setup before/after. Report p50/p95/p99, failures, and per-stage duration. Clearly distinguish simulated tests from independently observed live R2 writes. No false speed claims.

## 5. Add a selectable **Minimal** theme (replaces the Matrix theme request)

Under **existing Settings → Theme options**, add **Minimal** as a new selectable theme. Keep existing themes, particularly **Bit o' Polish** (default) and **Remote V1**, unchanged. Do not create a Matrix theme as part of this request.

**Design intent:** Beautiful, elegant, restrained, information-dense File Explorer and Shelf. Files and folders are the visual focus. Clear basic commands stay visible. Anything unnecessary to the user’s current task should recede or disappear.

- **Typography:** refined, highly readable UI font, concise labels, calm visual hierarchy; file and folder names must remain visible and legible. Choose compatible bundled/system fonts; no external runtime font loading.
- **Layout:** balanced whitespace, consistent compact spacing and alignment, minimal borders/shadows/ornament, thoughtful icon sizing, unobtrusive menus and controls. Do not shrink click targets below accessible sizes.
- **Copy reduction:** hide or greatly condense redundant descriptive text, instructional paragraphs, status chatter, technical metadata, secondary labels and repetitive hints *in the Minimal theme only*. Preserve file/folder names, basic commands (New Folder, Copy, Paste, Move, Rename, Delete, Create Bucket, Save here, Make Default), account/destination identification when necessary to prevent mistakes, and navigational context.
- **No debug popups:** routine internal diagnostics, raw JSON, Worker codes and developer-style popups must not interrupt Minimal-theme users. Keep technical details accessible through the existing Advanced diagnostics/on-demand troubleshooting interface. **Do not suppress real errors:** authentication failures, operation failures, permissions that truly require attention, confirmation of destructive actions (unless user disabled it), and meaningful progress/success feedback still need concise, actionable UI.
- **Colors:** subtle, restrained neutral palette with high contrast and selective accent color; elegant light/dark adaptation if supported. No Matrix green-terminal styling.
- **Scope:** apply consistently across the Shelf, Remotes, File Explorer, Settings, menus, dialogs and toast/status surfaces. The app’s functional capabilities, data, access control and operational feedback must be identical whichever theme is selected. Theme selection and persistence use the existing isolated extensible presentation layer.
- **Performance and accessibility:** avoid heavy animations, extra render work, or layout thrashing; keyboard accessibility, visible focus and screen-reader text remain intact. No change to Worker, OAuth, R2, save engine, receipts or diagnostics collection.

Test that Minimal theme reduces *visible clutter*, but no command disappears and no failure is silently hidden. Verify switching back to Bit o' Polish/Remote V1 restores their existing UI intact.

## 6. Verification and delivery

Create/fix deterministic tests plus live account tests when legitimately authorized, using disposable test buckets/object keys rather than destructive tests on user data.

Acceptance cases: root/nested New Folder; new bucket; copy/paste within/across buckets; move/rename/delete; Make Default; unrelated bucket isolation; Narrow saves at every ancestor including bucket root and multiple branches; old-Worker migration; reconnect; latency comparison; Minimal theme selection/persistence, core-command visibility, actionable error presentation, and other theme regressions; Simple/Depth/right-click regression.

**No new recorder, diagnostics pages, logging features, or unrelated UI redesign.** Fix underlying causes, not just messages; preserve existing user data/config. Record any Cloudflare limits that make a requested operation impossible rather than masking them. Work on an implementation branch, do not modify `main`, run builds/tests, commit and push. Report branch, SHA, tests, real-world verification, latency data, known limitations and precise changes. Do not rely on ephemeral ZIP URLs.

**Acceptance phrase:** "Create Folder creates a folder; Narrow saves from bucket root through the selected directory; all authorized R2 locations work without artificial folder scopes; theme selection stays isolated; faster save is proven by measurement."


## 7. Final phase ONLY — read-only Click2Cloud versus ReDown comparative audit

**Run this AFTER completing and committing the implementation, tests and save-speed benchmarks above. This phase is strictly read-only for BOTH repositories.**

- Identify the authoritative ReDown repository and the most relevant current branch/commit. Record exactly which ReDown revision was examined; if repository access or identification is uncertain, report that limitation rather than guessing.
- Compare the freshly implemented Click2Cloud revision with the actual ReDown revision using repository evidence. Contrast Worker authority/R2 architecture, provisioning and destination scoping, OAuth/session recovery, bucket/root and folder CRUD, copy/paste, Simple/Narrow/Depth right-click behavior (where comparable), resilience/error handling, verified save receipts, and observed end-to-end save performance.
- Identify capabilities or hardening techniques that ReDown has and Click2Cloud lacks, and vice versa, without assuming all differences are regressions. Explain why any remaining differences matter.
- Compare measured speed only when test conditions are reasonably comparable. If not, report separate figures and the reasons a direct speed claim would be unreliable.
- Prepare a **read-only audit report** covering a side-by-side matrix, source paths and commit SHAs, evidence, verified strengths, weaknesses, regressions, and prioritized **recommendations only**.
- **Do not modify, reformat, commit, push, configure, or deploy anything in either repository during this comparative-audit phase.** Do not apply recommendations, open remediation PRs, or change running infrastructure. Report findings for separate approval.

This final audit must not delay or replace the implementation and verification phases. Its output is an assessment, not code changes.
