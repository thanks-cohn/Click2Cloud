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

## 5. Appearance: dropdown selector and genuinely stripped-down **Minimal** theme

### Appearance selector (applies to theme choice across the app)

Replace the existing two-way Appearance/theme **switch** with a normal **dropdown/select** in the same Appearance settings location. Its options must be:
1. **Bit o' Polish** — remain default and preserve existing visuals.
2. **Remote V1** — preserve existing legacy visuals.
3. **Minimal** — new option described below.

A theme switch is no longer appropriate with three or more options. Persist selection, restore it on reload, and use the existing extensible, isolated presentation system so future themes add one dropdown item rather than more switches. Avoid changing unrelated appearance settings or modifying how the other two themes look.

### Minimal means content and commands, not explanatory prose

**Product intent:** Primarily just the File Explorer with **bucket names, directory names, filenames, icons, essential navigation, top tabs, toolbar buttons and their working commands**. Elegant typography, deliberate alignment, compact but comfortable spacing, little ornament, clean neutral colors and legible focus/hover states. Avoid large instructional panels, decorative cards, verbose status blocks or repeated explanatory microcopy.

When **Minimal** is selected:

- **File Explorer:** show bucket/folder/file names, breadcrumb/path when needed, selection indications, top tab options, basic toolbar buttons/menus, and operational commands. Hide nonessential debug/status copy at the bottom-left (and elsewhere), technical Worker details, repeated instruction text, redundant captions, decorative descriptions and raw JSON. The bottom-left debug text must be **absent from the visible Minimal interface**, not merely less prominent.
- **Destinations popup/manager:** retain selected destinations, edit controls, Save/Make Default where applicable, and meaningful success/error states. **Remove this explanatory paragraph from the visible Minimal popup:** “Save prepares or maintains the private Cloudflare Worker for the selected destinations and checks a small R2 verification file when needed. Worker and R2 usage may incur charges.” Also remove extraneous explanatory sentences like **“Availability depends on the connected account.”** Do not replace them with similarly verbose phrasing. Necessary disclosure about possible charges should still be accessible at the action where charges may first be authorized (e.g. setup confirmation or an on-demand info affordance); do not silently consent to billed operations.
- **Shelf/Remotes/Settings:** keep functional navigation and critical status/action labels but strip unnecessary help paragraphs, debug blocks, repetitive explanatory text, tool-internal nomenclature, verbose success descriptions and decorative labels. Don't remove user-requested functional controls.
- **Dialogs/popups:** no unsolicited diagnostic popups, raw debug JSON, Worker error codes or long developer explanations. Use terse user-facing errors only when an operation actually fails and requires attention, with optional existing diagnostics access for technical details. Don't suppress authentication recovery, destructive confirmations, actionable failures, or meaningful pending/success feedback.
- **Visual design:** elegant modern UI/font hierarchy; filenames easy to scan; whitespace measured rather than sparse; unobtrusive borders, restrained neutral palette, coherent icon and text alignment; compact layout with comfortably accessible hit targets; keyboard and screen-reader access preserved.
- **Isolation:** Minimal is a presentation-only skin/copy-density mode. Do not change Worker provisioning, OAuth, permissions, save routing, receipts, File Explorer state/operations, or actual diagnostics collection. Existing themes keep their original text and styling.

### Explicit text removal and Remotes replacement — Minimal theme ONLY

The following are literal examples of **visible UI text that must not render in Minimal**. Remove the redundant *text blocks*, not the associated buttons, tabs, account controls, navigation, or their behavior. This includes repeated copies of the same technical error. Do not merely fade the text or leave empty whitespace.

**Remove from routine Minimal presentation:**

> The existing Worker is scoped to a different folder. Review the required destination capability in Cloudflare status; no resources were changed.

> The existing Worker is scoped to a different folder. Review the required destination capability in Cloudflare status; no resources were changed. This action cannot expand the Worker’s scope. Select a permitted configured folder, or obtain an explicitly approved scoped repair.

> Save uncertain. Inspect before retrying.

> Google Drive, Dropbox and OneDrive are not available yet.

> Connect an account, browse its folders, and choose where to save.

> Signed in to Cloudflare.

> Login authorizes preparing or reusing redown and the save Worker when needed, plus a small verification file. Cloudflare may charge for usage. Existing destinations are preserved.

Also hide routine redundant **“Cloudflare — Connected”** informational text block in Minimal. Keep the actual Cloudflare remote row, connection indicator as needed, account selector, functional login/reconnect actions, **Cloudflare status** button, **Save results** button, and all other existing operational buttons. The buttons must remain clickable and retain the same behavior. Do not turn the status/reconnect area into a new screen.

**Replace the removed descriptive/connected-status copy in Remotes with exactly this succinct tagline:**

> **The Future is Now. True Remote is Here.**

Style as one elegant, restrained typographic line or a natural two-line wrap in constrained width. Do not add long explanatory text under it.

**Error-handling nuance:** The listed verbose debug strings must not occupy the Minimal UI, even during a scope error. However, never misrepresent a failed operation as success or erase an active problem: replace technical prose with a short relevant inline status such as “Save unavailable” / “Couldn’t create folder” and keep existing **Cloudflare status**, **Save results**, or **Advanced diagnostics** affordances to inspect detail. In particular, an uncertain save must never be automatically retried without checking its outcome. Error detail remains available in on-demand diagnostic views; no new diagnostic components. Cost/authorization disclosures required before a new paid setup action remain accessible at that point, not as persistent Remotes prose.

**Verification:** Screenshot-test the actual Minimal Shelf, Remotes and Destinations states, including an error state; assert the phrases above are absent from visible Minimal UI; confirm tabs/buttons remain and work; confirm tagline exact spelling/case/punctuation; ensure Bit o' Polish and Remote V1 stay unchanged.

**Acceptance checks:** dropdown offers precisely Bit o' Polish / Remote V1 / Minimal and remembers selection; switch is removed; Minimal Explorer displays filenames, directories, buckets and functional toolbar/tabs without bottom-left debug text; Destinations popup lacks the cited Worker preparation/charges paragraph and the availability sentence in normal view; no essential commands are hidden; user-facing actionable errors and required cost disclosures remain accessible; switching to older themes restores existing presentation without regression. Do not introduce Matrix.

## 6. Verification and delivery

Create/fix deterministic tests plus live account tests when legitimately authorized, using disposable test buckets/object keys rather than destructive tests on user data.

Acceptance cases: root/nested New Folder; new bucket; copy/paste within/across buckets; move/rename/delete; Make Default; unrelated bucket isolation; Narrow saves at every ancestor including bucket root and multiple branches; old-Worker migration; reconnect; latency comparison; Appearance dropdown/selection persistence; Minimal Explorer removing bottom-left debug text; Destinations popup explanatory copy removal; core-command visibility, actionable error presentation, and existing-theme regressions; Simple/Depth/right-click regression.

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
