# Click2Cloud MASTER Codex implementation contract — November 7, 2026

**P0: ONE ENGINE · NO BLOAT · VERIFIED BEHAVIOR · SIMPLE REDOWN DEFAULT · REDOWN-CLASS PERFORMANCE · API PARITY**

This is the **single current implementation assignment** for thanks-cohn/Click2Cloud, not thanks-cohn/REDOWN. Follow this contract and the owner-approved native menu and deletion rules. The old diagram/popup specifications are historical wherever contradictory. **Implement code, not another architectural proposal.** REDOWN is read-only reference material; never edit, merge, migrate, or import its legacy competing engines.

Start from the latest Click2Cloud main and create a new working branch. Do not merge, publish, deploy, change Cloudflare OAuth-client registration, or change production cloud resources during this request without the owner's separate express approval. Where live tests require account resources, report BLOCKED and use safe mocks instead of mutating them.

## 0. Fundamental outcome — how this product MUST feel

The entire normal Cloudflare experience must become:

1. **Connect:** The user logs in to Cloudflare through the existing authorized OAuth process and grants the minimum applicable permissions.
2. **R2 detection:** Examine the authorized selected account using **read-only API calls**. If R2 is unavailable, disabled, unactivated, requires checkout, or cannot be reliably verified as available: **do absolutely no infrastructure setup or cloud mutation**. Do not auto-open or navigate to the R2 website; do not try to enable, subscribe, purchase, provision, create buckets, create Workers/Durable Objects, write test objects, or retry indefinitely. Persist no speculative "R2 active" inference. User will fix R2 manually. Display only a truthful status when they explicitly inspect connection state or the disconnected/unready action requires feedback. A 403/unknown API error is NOT evidence that R2 is unactivated.
3. **R2 confirmed active:** For a genuinely new, eligible first-use account with approved setup authority, inspect exact bucket name **redown** (lowercase) in that account. **YES: reuse its contents untouched. NO: create that one bucket** within the user's approved initial setup. Bucket prefix is empty string (root), never redown/redown/.
4. **Prepare and verify:** Reuse any existing compatible authorized Worker/transfer infrastructure; only provision missing **necessary** components under the same explicit one-time initial setup approval, respecting any charges. Verify transfer capability with a small independently read-back R2 object and exact account/bucket authority. No READY until the verification succeeds.
5. **Save:** Set Cloudflare default to that redown bucket root only if user never picked another default. On the next fresh right-click, **Cloudflare saves directly** to that exact destination, verifies provider receipt/readback, and records actual History/GO TO. **No dashboard, mode editor, extra menu, login interface, setup page or tab in the READY path.**

"Log in → READY → Right-click → DONE" is the everyday experience. First-time infrastructure work occurs only if R2 is confirmed and the user authorizes it; no false assertion that OAuth alone authorizes billable actions. Never silently replay a source clicked before login/setup.

## 1. One source of truth for behavior; separate desired contract from actual execution

The **existing** Click2Cloud V3+1 compiler, native registrar, resolver, provider dispatch, OAuth owner, Cloudflare transfer owner, and Universal File API remain the only production machinery. Use those implementations; repair them in place. GUI, native Chrome menu, file explorer, notifications and programmatic clients call the SAME versioned domain operations. No new "V4", alternative bootstrap, shadow MenuSpec, extra save pipeline, duplicate token store, second registrar, or parallel onboarding engine.

REDOWN's useful right-click and Explorer behavior is a **benchmark**, not a license to migrate its older implementations wholesale. Borrow measured algorithms and UX semantics, map them to Click2Cloud's current data model, remove stale seams, and simplify rather than adding wrappers.

**Precedence:** this contract for the new user journey, then the unchanged November 6 native menu / consent / deletion invariants in AGENTS.md, then foundation diagrams 2A/2B for menu topology, then older foundation diagrams only if consistent, then the prior November 7 popup/Shelf preferences solely for attention presentation. Any unavoidable conflict must be recorded as a specific rule conflict and resolved according to this precedence; never quietly implement both alternatives.

## 2. MANDATORY first deliverable — 1:1 code-to-behavior documentation

The canonical, human-and-machine-readable map of what **the code actually does** is:

**11.2026/workings/right-click-workings.json**

**Before the first runtime refactor**, Codex must audit the exact current checkout/commit and replace the initial INCOMPLETE bootstrap JSON with a **complete, evidence-linked BASELINE of actual pre-change implementation**, covering ALL right-click entry points, menu states, authentication, R2 detection, first-time creation, transfer, Explorer interaction, Settings, errors, retries, persistence, OAuth refresh, and user-visible navigation. Do not write expectations as existing facts. A mapping without source locations and observed unit/integration/runtime evidence is not complete.

The same JSON must then contain the **CURRENT implementation snapshot after every functional change**, with the pre-refactor baseline preserved in the file for comparison. Any agent must be able to open this ONE file and determine: "This is exactly how this checked-out revision behaves; here are its preconditions, branches, actions, API calls, side effects, failure routes, persistence, and tests." Do not use it as a proxy for tests; verify it against actual source and runnable evidence.

Minimum JSON schema/content:

- metadata: product, document version, generatedBy, **git commit SHA**, generatedAt, auditStatus, source paths/hashes, verification levels and uncovered/blocked conditions;
- snapshots: immutable **baseline-before-changes** with source SHA plus **current-after-changes**, and an ordered change-log mapping commits/behavior IDs, with no overwritten original observations;
- entrypoints: Chrome contextMenus registration and click, action click, popup/Shelf, API invocation, provider actions, Explorer context menu, Settings mutation and lifecycle/restart;
- **every reachable state transition**: stable rule ID, state/preconditions, user/system trigger, exact guard including precedence, action, versioned API method, provider/connection/account/bucket/prefix identity, next state, UI effect, external resource effect, persistence, errors, retry/idempotency semantics, verification and source reference;
- menu projection: 0/1/2+ actual active assigned targets, user-hidden provider, provider order, mode visibility, duplicate suppression, account ambiguity, explicit redown deletion, reconnect and restart;
- dataflow: V3+1 compiler → registration ACK → action resolver → permission → provider OAuth/refresh → R2 check/explicit provisioning → transfer → independent receipt → history/Explorer, and actual branch divergence;
- API parity matrix: each meaningful GUI/native action → existing or added minimal API tool, same auth/validation/result/observable state, unsupported capability marked explicitly;
- errors and diagnostics: specific codes for OAuth revoked, wrong account, actual missing scope vs generic 403, R2 inactive, R2 unknown, bucket missing, Worker repair, failed native popup/Shelf, transaction failure, uncertain upload, verification pending;
- evidence: test name/file, fixture ID, expected/actual outcome, whether it is simulation, installed Chrome proof, live provider proof or NOT TESTED; link report/artifact path where present;
- explicit unknowns: never replace a missing source observation with a guessed result; mark UNKNOWN/BLOCKED with why.

A source module changed without a corresponding updated JSON behavior entry and regression test is **not an accepted change**. Add a **lightweight deterministic check** in existing test/build infrastructure that parses/validates the JSON, checks required state/behavior IDs, source refs and source-revision freshness, and fails changes that modify right-click/OAuth/onboarding/Explorer routing without updating the map. Avoid building a bespoke telemetry service or framework to do this. No tokens, secrets, source URLs, browser history, private file names or account IDs in the JSON. Use symbolic account and bucket identity labels instead.

The initial checked-in JSON is deliberately marked INCOMPLETE. **Do not represent it as verified 1:1 until Codex has audited the actual code and tests.** Once validated, set auditStatus=SOURCE_VERIFIED or RUNTIME_VERIFIED as warranted, and record precise coverage and remaining gaps. The map describes reality, including defects; this master document describes intended behavior. Do not falsely make the two agree by rewriting prose.

## 3. Cloudflare R2 availability and first-run state machine

Decisions must be deterministic, account-scoped and persistent:

- **NOT_LOGGED_IN:** one provider-specific login affordance through the chosen attention UI; real Cloudflare OAuth starts only when Log in is explicitly selected. If OAuth succeeds, remember selected account and least-privileged grants. No bucket or Worker mutation during login.
- **AUTHORIZED, R2_CONFIRMED_UNAVAILABLE:** no automatic Cloudflare resource mutations, activation, checkout, browser redirection, probe write, repeated polling, or silent "help." Mark R2 unavailable and wait for user's own manual correction. A later explicit "Check again" may make a read-only retry.
- **AUTHORIZED, R2_UNKNOWN / PERMISSION_OR_NETWORK_ERROR:** keep separate from confirmed inactive; never assume no R2 or try creation. Explain actual safe failure code on inspection. In particular, Click2Cloud's existing onboarding maps every HTTP 403 to INSUFFICIENT_PERMISSION: replace this undifferentiated behavior with truthful diagnosis derived from redacted provider errors and scopes without guessing.
- **AUTHORIZED, R2_CONFIRMED_READY, FIRST_USE, REDOWN_EXISTS:** reuse bucket exactly, do not overwrite/delete old keys; prepare/verify necessary capabilities under user-approved setup if not already available.
- **AUTHORIZED, R2_CONFIRMED_READY, FIRST_USE, REDOWN_ABSENT:** under a single **explicit approved initial setup** create only exact redown, idempotently reconcile create races and recover unknown completion; then prepare/verify capability. If approval is denied, do nothing in Cloudflare.
- **READY, RETURNING_USER:** bypass setup every time; current exact authorized user-selected destination wins. Previously selected folder or custom default is never replaced by redown.
- **INITIALIZED, REDOWN_INTENTIONALLY_UNASSIGNED/DELETED:** never recreate bucket or reassign it without fresh explicit request. Unassigning a menu target is not remote deletion. Remote deletion requires separate destructive confirmation. With one remaining chosen target use a flat Cloudflare save to that survivor; with none, Manage Destinations.
- **BUCKET_OR_WORKER_TEMPORARILY_UNAVAILABLE:** do not infer deletion, recreate bucket, silently change destination, or claim READY. Offer honest explicit repair only where safe.
- **MULTIPLE_ACCOUNTS:** do not pick an arbitrary account; require explicit account choice and preserve it.
- **EXISTING_R2_BUT_NO_WORKER:** approved setup should prepare minimum required infrastructure; no extra hidden action and no repeated provisioning on normal saves.
- **OAUTH_EXPIRED:** attempt valid refresh transparently; reauthorize only if refresh fails/revoked. Never extend tokens beyond provider controls.

The R2 API's actual subscription/availability check is **read-only**. Do not use bucket-list 403 as proof of inactivity. Do not build a separate R2 activation flow; no automatic external R2 website visit and no hidden account setup. Where the user has not enabled R2, the application must not try to fix R2. Distinguish unknown subscription status from denied write permissions. A small retained probe object may incur charges and must be disclosed within the one-time approval.

## 4. Native right-click topology — keep the already approved menu invariant

New install: four flat native provider entries, in exact order:

1. Google Drive
2. Dropbox
3. OneDrive
4. Cloudflare

Their presence does not imply that non-Cloudflare adapters are implemented. Each provider is clickable when shown, but a save is only claimed after that provider really confirms it. Settings independently hides/show provider rows (ON by default), preserving account OAuth and destinations. No extra extension-authored REDOWN submenu.

Cloudflare has **one** native entry, titled Cloudflare (not another Cloudflare R2 sibling). **0 distinct active user-assigned save targets:** flat attention/Manage Destinations action; for a brand-new eligible account it leads through first-time readiness. **1:** one flat direct-save leaf to exact target. **2 or more:** one Cloudflare submenu with only distinct active assigned targets. Unassigned buckets never inflate this count, hidden or disabled modes never inflate it, duplicate projections of the same bucket/folder never inflate it. User-selected flat override is optional, not required for first use. Removing redown with a surviving destination immediately flattens. Native Chrome registration must agree with the versioned MenuSpec and ACK after restarts/updates, with stable IDs and no stale-click action.

NO secondary engine may independently register native items. Do not weaken the 0/1/2+ or redown lifecycle rules for convenience.

## 5. Login attention: preserve the current explicit preference without multiple auth systems

Until expressly changed by the owner, the November 7 approved presentation remains:

- When login is genuinely needed, default **Automatically open login** ON: try the small **toolbar-anchored extension action popup** for exactly the chosen provider; **if the popup API fails, record the failure and attempt the REDOWN-like Shelf/side panel** with that provider highlighted; if Shelf also fails, record the failure and show the provider-specific notification.
- If that Settings preference is OFF: **do not open any extension login UI automatically**; show only the correct provider notification, e.g., "Please log in to Cloudflare".
- If logged in but attention is needed for missing destination or explicit first-time setup, say "Choose destination" or "Setup required" rather than falsely asking them to log in.
- Only **one extension-owned interface at a time**; no independently implemented popup OAuth, Shelf OAuth or dashboard OAuth. Both login UIs are thin clients of the same authority. A provider-controlled consent window is distinct and allowed.
- Do not allow popup-to-Shelf fallback complexity to delay READY saves, invent an additional connection model or force multiple windows into the user's workspace. Chrome user-gesture restrictions may block automatic popup/Shelf opening; the notification and toolbar action remain the reliable last resort. Diagnose actual Chrome outcome and mark unsupported behavior BLOCKED rather than fabricating a successful panel open.

Keep the current choice distinct from older hypothetical Shelf-only discussion; if the owner later approves Shelf-only, make a single explicit rule change rather than implementing both conflicting default choices.

## 6. TRUE REMOTE, correctness, provider privacy, and honest proof

Cloudflare: Worker-to-R2 TRUE REMOTE; do not fall back to local/browser bytes or surprise other providers. Exact account and target resolved and authorized at dispatch and write time. Maintain safe URL validation, pinned public-network transport where required and no SSRF/private-network exposure. Do not send original browsing provenance or page/frame/link URLs to storage providers. Provider API metadata must be minimal. Cloudflare Worker may need the selected source URL to fetch; protect it as an ephemeral transfer input and do not leak it in third-party provider metadata, logs, history exports or permanent debug snapshots.

Verified remote receipt/readback **before** any SUCCESS, counter increment, GO TO, or completed History result. Pending/uncertain operations must not be blindly replayed. Maintain idempotency and reconciliation. Preserve explicit approval for new cloud resources and provider-imposed billing. No optimistic timer-based success.

**No artificial limits:** remove unjustified application-created file count, listing, nesting depth, source size, transfer size, transfer duration, queue length or API batch ceilings. Honor actual Chrome, transport and provider constraints. Use bounded-memory streaming/chunking, pagination and backpressure rather than unrestricted RAM. Document genuine immutable platform limits; do not promise mathematically unlimited transfers, and never bypass security checks to chase "no caps."

Other three clouds: their one flat native row must remain; implement actual uploads only when genuine provider adapters/auth/receipt verification exist. Do not claim parity just because a placeholder button appears.

## 7. REDOWN's speed and power, absorbed into current Click2Cloud — no bloat

Read REDOWN in thanks-cohn/REDOWN as behavioral/performance reference, especially:

- extension/background.js (native contextMenus.onClicked, resolveActiveRightClick, saveResolvedRightClick, verified completion)
- extension/right-click-v3.js (single direct save vs configured menu hierarchy)
- extension/shelf-explorer.mjs (cached sortedEntries, renderRows/viewport, selections, Windows-style context actions)
- extension/shelf-explorer-model.mjs (paging, navigation identity, coalescing, stale-request cancellation)
- extension/history-navigation.js and extension/shelf-history.js (accurate GO TO, durable History)
- extension/cloudflare-auth.js and extension/cloudflare-api.js (refresh and provider request handling)
- extension/preview-navigation.mjs and related file-preview modules (responsive side/window previews)

Implement these strengths **inside** the existing Click2Cloud Explorer/Universal File API and the current menu service. Required user-facing behavior: instant normal left/right-click selection, correct Ctrl/Shift selection, context menu near clicked object, exact nested traversal, reliable folder Back/Forward/Up/breadcrumbs, nonblocking previews, paginated and windowed large listings, stable cached sorting, request coalescing/cancellation, bounded caches, visible/accurate load and error states, correct object mutation refresh, History GO TO pointing to the actual verified destination.

**No duplicate Explorer implementation, no copying old bugs, no arbitrary directory item cap.** Measure actual Windows/Chrome results against REDOWN using identical practical workloads (100, 1,000, 10,000 files where platform/test setup permits), selection/contextmenu, network/API counts, long main-thread tasks, CPU/memory/DOM rows and folder traversal latency. Unit tests do not substitute for installed extension profiling; record BLOCKED if not available. Acceptance is at least REDOWN-equivalent usability with no noticeable freezes.

## 8. Programmatically accessible WHERE POSSIBLE, with no extra headway

**GUI-to-API parity:** Every meaningful action (login intent/status, connection states, selected-provider navigation, Cloudflare setup approval, check readiness, bucket assignment/default, native menu configuration and visibility, file operations, errors/repair, read history, GO TO, notification preference) must map to a stable, typed, versioned **existing** domain API operation where technically and safely possible. Same authorization/confirmation, validation, side effects, error states and results; GUI and native menu are clients. Do not create REST servers, public agent ports, an MCP server, a new gateway, or extra persistence just to satisfy parity. Extend the existing local trusted File API minimally; add a new operation only if no suitable existing one can represent it. UI-only Chrome visual affordances and provider OAuth consent UI remain user-gesture/permission-gated and cannot be forced by agent calls.

Maintain read-only diagnostics for actual behavior tracing without personal data or secret disclosure. Minimum surface, maximum composability.

## 9. Permanent NO BLOAT development rules

- **No additional ownership if existing ownership can be repaired.** For every new module, field, branch, runner or process, document why no existing owner suffices, what was deleted/consolidated, and the resulting simpler call path.
- Never add an error-suppressing "compatibility shim" instead of fixing the failing source. Preserve necessary migrations for existing users, not dead code indefinitely.
- No new synthetic rule atlas or many-hundred-test explosion. Add a compact but meaningful decision table and regression tests that cover the critical cross-product interactions, particularly newly emergent states from combined settings.
- Fix **root causes** of INCORRECT_MENU, INSUFFICIENT_PERMISSION, missing worker readiness, file freeze and interrupted transfer. Do not replace evidence with a green screenshot.
- Limit state machines to actual user-visible differences. Keep enough state to preserve deletions, defaults, accounts, authorization and idempotency; do not store redundant derived state.
- Preserve the now-canonical mechanics of Simple/Narrow/Depth without cross-mode mutation; optional customization must never obstruct the four flat initial native entries.
- The observed-behavior JSON and tests must travel **in the same changeset** as a behavioral source change. Conflicts between nominal rules and actual behavior are defects, not excuses to silently reinterpret the spec.

## 10. Acceptance matrix — REQUIRED

Implement tests for each of the following, and name the corresponding entry in right-click-workings.json:

A. Brand-new account, R2 CONFIRMED ACTIVE, bucket redown EXISTING → reuse intact; approved necessary Worker setup only; exact root default; subsequent click saved and verified.
B. Brand-new account, R2 CONFIRMED ACTIVE, bucket redown ABSENT → one approved setup creates redown once; verified; root default; subsequent click saved and verified.
C. Brand-new account, R2 CONFIRMED INACTIVE or no R2 subscription → **zero Cloudflare infrastructure mutations**, zero automatic activation website redirect, no optimistic READY, user fixes manually.
D. R2 status UNKNOWN, network outage or bucket listing HTTP 403 → no mutations and correct specific UNKNOWN/PERMISSION status; do not misclassify as inactive.
E. User cancels or refuses initial setup approval → no bucket, Worker, Durable Object or probe creation; preserve authorization state.
F. Returning user with redown created → zero repeated provisioning; direct verified save, no extra login.
G. User explicitly selects Photos folder as default → right-click uses Photos, never silently reverts to redown.
H. User deletes/unassigns redown with Photos as the sole assigned target → flat Cloudflare save to Photos, no recreation.
I. User removes all selected destinations after initialization → flat Cloudflare opens Manage Destinations, not first-time bucket creation.
J. A second ACTIVE ASSIGNED Cloudflare target is added → exactly one Cloudflare submenu, distinct exact targets; an unassigned new bucket has no effect.
K. Four default flat provider leaves; each provider Settings hidden/restored independently; no duplicate Cloudflare R2 or REDOWN menu group.
L. OAuth expired but refresh works → direct verified save; revoked refresh → truthful login UI/notification; no replay after reauthorization.
M. Default auto-login ON: popup first, diagnostics after failed opening, Shelf fallback, notification last resort; auto-login OFF: provider-specific notification only. No false login notification for connected users missing a destination.
N. MV3 worker restart, browser restart, update or failed native registration ACK → exact menu, account, destination and log preserved; no duplicate entries or false saves.
O. Actually installed Chrome native click and actual disposable authorized R2 write plus independent readback. Distinguish unit fixture from installed/live PASS.
P. File Explorer 100, 1k, 10k practical entries, sorting/selection/right-click, nested navigation, rapid switching, cancelled requests, preview and History GO TO; compare results against read-only REDOWN.
Q. API parity of every touched GUI/native action, with permission/side-effect match.
R. Right-click-workings.json contains **baseline and current, full state coverage and source references**, is valid JSON, stays synchronized with commit and passes the lightweight stale-map enforcement check.

## 11. Engineering order, cadence and final handoff

**First:** snapshot/code-audit *the current implementation* into 11.2026/workings/right-click-workings.json, mark all unverified paths as such, and preserve its baseline permanently. **Second:** simplify/repair R2 OAuth/readiness and proper first-time redown setup, ensuring the NO-R2-NO-ACTION invariant. **Third:** repair direct right-click menu/dispatcher and independent R2 save receipts. **Fourth:** absorb REDOWN-class Explorer, preview, history and UI performance in the current API. **Fifth:** make all touched GUI actions API-equivalent and add lightweight documentation/behavior drift checks. Update the JSON continuously—not as a final afterthought.

Work continuously for approximately 30 minutes per Codex run and advance across as many meaningful connected milestones as possible. Commit actual functioning improvements with relevant tests; if time is insufficient, prioritize actual user-visible reliability and JSON/source truth. Do not claim unperformed work. Report branch, each commit SHA, baseline and current behavior-map coverage, exact test PASS/FAIL/BLOCKED/NOT TESTED, actual Chrome/cloud proof, latency measurements, remaining gaps and the next prioritized concrete steps.

**Definition of DONE:** an installed Click2Cloud extension whose simple initial Cloudflare use is LOGIN → R2 available? → REDOWN exists? reuse : create once with approval → independently verify → flat native RIGHT-CLICK saves; a missing R2 subscription triggers no cloud/resource action; four provider native rows are initially flat; REDOWN's useful Explorer speed and right-click behavior are reproduced without additional competing engines; GUI workflows are programmatically accessible where safe; and /11.2026/workings/right-click-workings.json tells the **verifiable truth about the real source code** at the corresponding commit.
