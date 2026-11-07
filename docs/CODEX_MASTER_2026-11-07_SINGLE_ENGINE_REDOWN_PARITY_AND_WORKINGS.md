# Click2Cloud MASTER Codex implementation contract — November 7, 2026

**P0: ONE ENGINE · NO BLOAT · STRICT 1:1 PARITY · NO ARTIFICIAL PHASE CAPS · SIMPLE REDOWN DEFAULT · FULL REDOWN FUNCTIONAL FLOOR · API PARITY**

This is the **single current implementation assignment** for thanks-cohn/Click2Cloud, not thanks-cohn/REDOWN. Follow this contract and the owner-approved native menu and deletion rules. The old diagram/popup specifications are historical wherever contradictory. **Implement code, not another architectural proposal.** REDOWN is read-only reference material; never edit, merge, migrate, or import its legacy competing engines.

Start from the latest Click2Cloud main and create a new working branch. Do not merge, publish, deploy, change Cloudflare OAuth-client registration, or change production cloud resources during this request without the owner's separate express approval. Where live tests require account resources, report BLOCKED and use safe mocks instead of mutating them.

## P0 OVERRIDE — STRICT 1:1 NATIVE-MENU PARITY AND FULL REDOWN FUNCTIONAL FLOOR

**No prototype, scaffold, demo, test-phase, MVP, beta-only, trial-run, or temporary-phase restrictions may be introduced into the new Click2Cloud implementation.** Build production-capable behavior now rather than artificially narrowing support because a feature is being developed or tested. Testing is mandatory as evidence, but a test environment is **not** permission to insert product limitations. If REDOWN can perform a supported right-click or Explorer workflow, Click2Cloud must be capable of performing the same workflow or a superior one, by reusing the present V3+1 engine, Universal File API, and shared API ownership—not by importing REDOWN's old competing implementation. Functional parity is a binding **engineering target**, never an unverified claim of current success. Keep necessary provider, Chrome, network, security, authorization, billing/consent and finite-resource constraints; do not promise impossible unlimited capacity or bypass safety to fake parity.

**The native-right-click rules are mandatory, not examples:**

1. **Four flat provider entries on install, exactly ordered:** Google Drive, Dropbox, OneDrive, Cloudflare; each present/clickable when its Settings visibility is ON (default). No extra extension-authored REDOWN submenu; no duplicate Cloudflare R2 row. Other providers must never misreport unimplemented uploads as successful.
2. **Cloudflare automatic nesting:** exactly one distinct active, explicitly user-assigned destination → one **flat direct-save** Cloudflare leaf. The instant a second distinct active displayed destination is assigned → one Cloudflare submenu with those destinations, including `redown` if still assigned. Merely discovering or creating a bucket does not nest. Hidden/inactive/duplicate representations do not inflate the count. Simple/Narrow/Depth custom modes must not accidentally override the approved default.
3. **`redown` is removable:** the default `redown` assignment is NOT permanent. Destinations Manager can remove it. Assignment removal neither deletes the real R2 bucket nor triggers its silent recreation/reassignment; remote bucket deletion is separate and separately confirmed. Preserve intentional removals across retries, reconnects, restarts and updates.
4. **Automatic flattening:** after removing `redown`, one surviving active destination → flat Cloudflare direct-save to that survivor. Zero after initialization → flat Cloudflare opens the appropriate **Manage Destinations** (after login if needed), never recreating `redown`. First-time eligible setup is distinct from returning empty configuration.
5. **Strict behavioral truth:** approved contract, current code, typed API, generated menu, Chrome's actually registered native items, persisted state, click dispatch, genuine save outcome and independent tests must all align. **`11.2026/workings/right-click-workings.json`** must retain pre-refactor observed behavior, continuously describe current observed behavior, separate desired vs actual outcomes, expose violations and edge cases, and show evidence status for every state transition. Never edit the JSON or diagrams to conceal a failure.
6. **GUI-to-API parity:** every meaningful Destinations Manager action—list, assign, remove, select, rename/edit where supported, choose/change default, manage visibility or modes—must have a stable, programmatically accessible operation in the **existing trusted versioned API**, with equivalent permission, confirmation, validation, persistence, error and observable result. Where direct programmatic interaction is forbidden by Chrome or provider consent, expose a permission-gated user-intent/state operation rather than bypassing consent. Do not create a new external API server/gateway.
7. **NO BLOAT:** preserve one canonical menu compiler, registrar, resolver, OAuth owner, state store and save pathway; remove collisions at their source. No alternative engines, shadow settings, duplicate registrations, speculative retries, wrapper layers masking defects, artificial limits, or parallel file explorers.

**Exact IF / THEN / ELSE acceptance invariants:**

- IF new user is disconnected THEN show only the selected provider's login attention flow; OAuth starts on explicit Log in; no fake save.
- IF authorized selected Cloudflare account has **R2 confirmed inactive/unavailable/unknown** THEN make **zero Cloudflare resource mutations and no automatic activation/checkout redirect**; the user will fix R2 manually. A failed bucket-list request or HTTP 403 alone is not proof of inactive R2.
- ELSE IF first eligible setup has confirmed available R2 and **user-approved infrastructure setup** THEN IF exact lowercase bucket `redown` exists, reuse it untouched; ELSE create it exactly once, recover creation races idempotently; prepare only needed Worker/claim infrastructure, verify real readback, set root prefix `''` as initial default unless a user default exists.
- IF connected and fully ready with exactly one active destination THEN one native Cloudflare click executes a real verified TRUE REMOTE save **immediately** with no popup, R2 site, dashboard, or destination editor.
- IF another Cloudflare bucket exists but is unassigned THEN native menu does not change. IF a second distinct active destination is assigned THEN one Cloudflare submenu appears. IF user removes `redown` leaving one then menu flattens and saves to the survivor. IF last assignment is removed after initialization THEN Manage Destinations opens and nothing is silently recreated.
- IF user hides a provider in Settings THEN its whole native row disappears without deleting OAuth, targets or files; IF re-enabled THEN exact prior applicable 0/1/2+ projection returns.
- IF the browser/service worker restarts, native registration changes, OAuth refresh occurs, or an in-flight operation becomes uncertain THEN preserve user choices, idempotency and truthful status; no phantom success or duplicate save.
- IF an Explorer or native-menu GUI action exists THEN the same underlying operation is inspectable and invokable through the existing domain API where allowed, with equivalent authorization and errors.
- IF a provider does not actually support an action THEN surface a truthful unsupported state rather than installing a fake, bounded, test-only success path.

**Full REDOWN functional floor, no arbitrary phase caps:** match its practical source/context support, cloud destination routing, multi-cloud adapter capabilities as each becomes genuinely operational, remote saving, nested paths, folder listing/traversal, multi-selection, preview, ordinary file operations, durable History/GO TO, background reliability and token renewal; remove unnecessary product-imposed limits on file bytes, batch/queue count, nesting, directory size, pagination, throughput and transfer duration. Respect genuine API and platform limits, guard finite memory with streaming/pagination/backpressure, and never claim external-provider operations work without verified proof. **No per-phase restrictions** such as "only 10 files for testing", "only public HTTP to ease the prototype", "only folders to depth 3", "only first 100 entries", "demo-only transfers", or "temporary single-provider caps" unless objectively forced by the relevant external platform; document exact evidence for unavoidable limits. No deliberate downgrade from working REDOWN behavior.

**Evidence gate:** first audit the currently checked-out repo and accurately populate the **immutable pre-change baseline** in `right-click-workings.json`. For every touched behavior, map user action → versioned API call → actual code owner/guard → native registration and action → persisted result → provider receipt/readback → Chrome/end-to-end tests. Cover 0/1/2+ assigned targets, additional unassigned buckets, removal and deliberate deletion, multiple accounts, startup/restart, Settings combinations, OAuth refresh and revocation, Cloudflare permission 403, inactive R2 no-action path, genuine upload confirmation and Explorer performance. Classify **PASS / FAIL / BLOCKED / NOT TESTED**; fixture-only tests never prove live Chrome or Cloudflare. Maintain a lightweight deterministic source/map drift gate. Produce coherent working commits and a technical handoff with unresolved defects: no greenwashing and no fake timing numbers.

**Instruction to Codex:** carry out the actual engineering in the existing Click2Cloud repo for the full practical functionality, rather than creating another implementation plan or prototype. Work through sequential high-value milestones in the continuous working session. Do not interpret the session duration as a cap on supported capabilities. The user has not authorized publishing, merging, modifying REDOWN, or making live Cloudflare/OAuth changes without explicit separate approval.

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

**Precedence:** this November 7 master for the new user journey, including Section 5's latest **Shelf-only** login interaction and Section 5A's verified OAuth parity; then the non-conflicting November 6 native menu/consent/deletion invariants in AGENTS.md; then foundation diagrams 2A/2B for menu topology; then older diagrams/briefs only when consistent. The earlier popup-first/fallback idea is superseded. Record actual runtime deviations in the workings JSON; never quietly implement two contradictory interaction systems.

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

## 5. FINAL LOGIN UX — REDOWN-style Shelf, one authentication owner, no duplicate login machinery

**LATEST OWNER DECISION (November 7):** Match REDOWN's genuinely working user experience: right-click when disconnected → one provider-specific **Log in** request in Click2Cloud's **Shelf**. The Shelf is the single standard extension-owned login/setup/repair surface (Chrome integrated side panel). This explicitly supersedes all earlier popup-first, new-window, popup-to-Shelf-fallback, separate login-card, automatic OAuth-on-open, and R2-website-redirection proposals. REDOWN's authentication and UI implementation is READ-ONLY reference; adapt what works to the existing Click2Cloud owner rather than copying REDOWN's old windows, extra listeners, token stores or coupling.

- **Connected AND READY:** direct native right-click → verified provider save, with **no** Shelf, popup, tab, onboarding dialog or redirection.
- **Disconnected:** user selects provider on native right-click → open Shelf to **exact selected provider**, with one clear **Log in** button; opening the Shelf cannot itself initiate OAuth or mutate resources. Other provider cards may be visible but not accidentally selected. Clicking Log in invokes the **one existing typed, trusted provider API** and the genuine consent screen where provider policy requires it. Do not replay pre-login source; next right-click saves when ready.
- **Authenticated but unready:** Shelf states the actual cause (R2 unavailable, account ambiguity, missing grant, first-use setup approval, Worker repair, or no chosen destination); it MUST NOT call an authenticated user "not logged in" unless their session is genuinely invalid. There is no automatic R2 activation/checkout, bucket creation, or infrastructure mutation if R2 is unavailable/unknown.
- **Settings — Automatically open login/attention (default ON):** ON tries to open the Shelf from the native context-menu user gesture. OFF does not automatically open any interface, showing a provider- and cause-specific Chrome notification instead ("Please log in to Cloudflare" only if disconnected; "Choose a Cloudflare destination" if connected but unconfigured; etc.). This toggle is independent of Settings provider menu Show/Hide.
- **Chrome gesture/API limitations:** opening a side panel may be rejected in some contexts. Use the Chrome-supported context-menu event to attempt it synchronously in the valid user-gesture window, record a sanitized error if it fails, and show the appropriate notification and passive action badge as fallback; do not create a second popup, tab or duplicate OAuth system. Never claim a Shelf opened without actual Chrome evidence. The user's manual toolbar/Shelf entry remains available.
- Provider-controlled OAuth consent may appear in a genuine secure browser authorization window; that is not a second Click2Cloud login UI.
- After real OAuth succeeds, refresh the Shelf's chosen-provider connection/readiness state. Silent refresh retains valid sessions so a user is not asked to log in on each save.

### 5A. Mandatory authentication parity with REDOWN, without inheriting its defects

**REDOWN logs in successfully; Click2Cloud must match that observable success with its own existing OAuth and API implementation.** Do a code-level comparison of REDOWN `extension/cloudflare-auth.js`, `extension/cloudflare-api.js`, and the Shelf's Cloudflare login wiring against Click2Cloud `src/auth/cloudflare-oauth.mjs`, `src/cloudflare/onboarding.mjs`, `src/cloudflare/inventory.mjs`, `src/api/service.mjs` and Shell routing. Extract working mechanisms rather than transplanting old services: user-initiated login; one OAuth attempt per action; correct registered client ID, redirect URI, granted scopes, verified selected account; surviving MV3 restart/callback; refresh-token rotation and concurrency safety; preserving valid sessions on transient network failures; refresh-on-expiry and a narrowly guarded retry only for actually expired/rejected tokens; correct logout/reconnect; sane cancellation; no browser-tab hijack.

**Known actual issue:** Click2Cloud maps all R2 bucket-list HTTP 403 responses to `INSUFFICIENT_PERMISSION`. Repair this root cause. Inspect and sanitize Cloudflare's actual errors/code and WWW-Authenticate information, actual token grants and account identity. Distinguish `TOKEN_EXPIRED`, `REAUTH_REQUIRED`, `INSUFFICIENT_SCOPE`, `WRONG_ACCOUNT`, `R2_CONFIRMED_INACTIVE`, `R2_STATUS_UNKNOWN`, `PROVIDER_AUTH_POLICY_DENIED`, `TRANSIENT_API_FAILURE` and `WORKER_PERMISSION_DENIED` based on evidence, not guesses. Do not confuse Chrome extension permissions with Cloudflare OAuth scopes. Do not broaden grants blindly: any scope update must be checked against the owner's actual registered OAuth client and Cloudflare's current API requirements. Do not change cloud app visibility, registration, billing or real user permissions without express authorization.

**Required end-to-end evidence:** authorize the registered Click2Cloud OAuth client using the authorized developer account in an installed Chrome extension; prove the full `Shelf Log in → provider OAuth consent → callback → token/session stored securely → selected account identity → read-only R2 check → approved first-use readiness when applicable → next native save` workflow. Separately test a non-owner user when suitable authorization exists, account switching/ambiguity, refresh after token expiry and MV3 restart, error recovery after timeout, revoked grant, missing scopes, R2 403 and temporary network loss. Mark real Chrome/Cloudflare checks BLOCKED when credentials/user consent are not available; fixtures are not live proof. Never represent login as repaired until real evidence supports it. OAuth can still legitimately fail due to actual external provider policy, but show the exact cause and necessary remedy rather than an invented generic INSUFFICIENT_PERMISSION message.

**No separate authentication architecture.** Repair `createCloudflareOAuth`, existing side-panel/Shelf routing, and existing trusted GUI-to-API operations; remove competing extension-owned popups/tab detours. Restore or introduce a Chrome Shelf panel only as one small UI adapter if the repo lacks it, without copying REDOWN's entire Shelf subsystem. With R2 confirmed unavailable/unknown, perform zero cloud resource mutations and wait for the user to handle R2 manually.

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
M. Default auto-attention ON: disconnected native click opens the SINGLE provider-focused Shelf, displays Log in and waits for user action; blocked Shelf opening produces truthful diagnostics and notification fallback, with no extension-owned popup/tab; Settings OFF shows the correct provider/cause notification only. No false login notification for connected users missing a destination.
N. MV3 worker restart, browser restart, update or failed native registration ACK → exact menu, account, destination and log preserved; no duplicate entries or false saves.
O. Actually installed Chrome native click and actual disposable authorized R2 write plus independent readback. Distinguish unit fixture from installed/live PASS.
P. File Explorer 100, 1k, 10k practical entries, sorting/selection/right-click, nested navigation, rapid switching, cancelled requests, preview and History GO TO; compare results against read-only REDOWN.
Q. API parity of every touched GUI/native action, with permission/side-effect match.
R. Right-click-workings.json contains **baseline and current, full state coverage and source references**, is valid JSON, stays synchronized with commit and passes the lightweight stale-map enforcement check.
S. Actual installed-Chrome login with the registered Click2Cloud OAuth client and authorized owner account: Shelf Log in → Cloudflare consent → callback → secure session → account-scoped R2 readiness → ready native direct save; preserve session over MV3 suspension/restart, and verify transparent refresh before asking login again.
T. Distinct 401, 403, expired token, revoked refresh, wrong account, registration/scope mismatch, R2 absent/unknown, account visibility policy and transient Cloudflare API failure produce their actual respective outcomes, with safe diagnostics and no confused INSUFFICIENT_PERMISSION or hidden provisioning.
U. REDOWN authentication behavior comparison is documented with source refs and tests showing which proven resilience was adopted into Click2Cloud and which old REDOWN implementation/coupling was intentionally NOT copied.

## 11. Engineering order, cadence and final handoff

**First:** snapshot/code-audit *the current implementation* into 11.2026/workings/right-click-workings.json, mark all unverified paths as such, and preserve its baseline permanently. **Second:** trace REDOWN's proven Shelf OAuth/refresh UX, implement the single Click2Cloud Shelf login and repair R2 OAuth/readiness and proper first-time redown setup, ensuring the NO-R2-NO-ACTION invariant. **Third:** repair direct right-click menu/dispatcher and independent R2 save receipts. **Fourth:** absorb REDOWN-class Explorer, preview, history and UI performance in the current API. **Fifth:** make all touched GUI actions API-equivalent and add lightweight documentation/behavior drift checks. Update the JSON continuously—not as a final afterthought.

Work continuously for approximately 30 minutes per Codex run and advance across as many meaningful connected milestones as possible. Commit actual functioning improvements with relevant tests; if time is insufficient, prioritize actual user-visible reliability and JSON/source truth. Do not claim unperformed work. Report branch, each commit SHA, baseline and current behavior-map coverage, exact test PASS/FAIL/BLOCKED/NOT TESTED, actual Chrome/cloud proof, latency measurements, remaining gaps and the next prioritized concrete steps.

**Definition of DONE:** an installed Click2Cloud extension whose simple initial Cloudflare use is LOGIN → R2 available? → REDOWN exists? reuse : create once with approval → independently verify → flat native RIGHT-CLICK saves; a missing R2 subscription triggers no cloud/resource action; four provider native rows are initially flat; REDOWN's useful Explorer speed and right-click behavior are reproduced without additional competing engines; GUI workflows are programmatically accessible where safe; and /11.2026/workings/right-click-workings.json tells the **verifiable truth about the real source code** at the corresponding commit.
