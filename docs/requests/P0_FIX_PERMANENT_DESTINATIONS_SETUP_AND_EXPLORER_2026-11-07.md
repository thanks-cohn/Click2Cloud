# P0 Codex Implementation — Permanent destinations, one-time Cloudflare setup, and one-click Explorer

**Owner-requested emergency repair — November 7, 2026**  
**Status:** Implementation assignment. Work is **NOT** completed by creation of this file.  
**First read:** [Source-backed critical defect report](../../bugs/CRITICAL/P0_DESTINATION_PERSISTENCE_REAUTH_EXPLORER_STARTUP_2026-11-07.md) and [right-click source/API map](../../latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md).  
**Code baseline:** Reinspect latest Click2Cloud source before edits; initial audit against `main:f062983c062ec0fa55d935848025d0919ef99a16`.  
**Scope:** Click2Cloud only. REDOWN is read-only reference. NO production Cloudflare mutations, no auth client replacement, no clearing user stores, no unconditional reset, no REDOWN edit.

## Required account-scoped setup-approval memory (no recurring approval prompts)

**The user has already approved the existing redown setup; that fact MUST persist.** Inspect the existing `approval:<accountId>` record through `readSetupOperation`/`writeSetupOperation`, its identity, and the completed initialization ledger across logout, login, Chrome/extension restart, OAuth token refresh and reconsent. Preserve existing account-scoped approval indefinitely unless the user explicitly revokes it or a valid applicable consent boundary changes; do not bind it to a short-lived OAuth access token/session ID. On subsequent same-account login reuse the saved approval, bucket, Worker bindings and destinations with read-only readiness checks, without recreating or asking the user to reapprove the same resource.

If Cloudflare actually needs the user to log in or reauthorize revoked/changed **OAuth permissions**, request that specific fresh authority and preserve the prior setup approval separately. A previously remembered local approval is not a way around real Cloudflare consent and cannot approve additional billable resources or cross-account scope. A failed auth step, missing permission, setup failure, missing approval record or user refusal may block cloud operations but **must leave all saved destinations, flags, labels, bucket/prefix assignments, Default and manager rows intact and visible**. These are independent domains.

**Must-prove regression:** Save three assignments + custom Default + Quick flag + account-scoped setup approval; sign out and confirm destinations AND approval still present; log in same account → no second setup approval; revoke OAuth authorization and confirm entries/approval still present but cloud writes blocked; reconsent → same entries/Default and no repeated setup approval; restart Chrome → same. Only a truly new unapproved setup requires one-time approval; its non-success never causes destination deletion. Verify actual Windows installed Chrome independently of fixture tests.

## ABSOLUTE IMPLEMENTATION PRECEDENCE — USER'S SAVED CONFIGURATION ALWAYS WINS

The most important owner requirement supersedes any weaker first-login/redown rule:

```text
durable = readAuthoritativePersistedConfiguration()
if read fails, storage is missing unexpectedly, schema is corrupt, or migration is uncertain:
    STOP with diagnostic/recovery; DO NOT initialize redown
else if durable has ANY saved destinations in ANY mode/account OR a saved Default:
    preserve every recorded entry and choice
    do not modify existing destinations/default due to login, auth, inventory or setup
    if Default-only, link exact target as ordinary manager entry without replacement
    if destinations exist but no Default, present selection/repair; do not substitute redown
    reconnect and project existing config into GUI/API/Chrome as permissions permit
else:  # proven genuine zero saved destination records AND no saved Default
    on NEXT successful authorized user login only:
        reuse existing lowercase redown bucket, or create when absent and authorized
        reuse prior account-specific setup approval, or request necessary new consent once
        verify Worker/R2; persist redown bucket ROOT as editable Simple row AND Default
    never trigger fallback on passive boot/status, deletion alone or failed auth
```

**Nonempty means ANY saved record**, including hidden/disabled/Quick destination entries, inactive display modes, Narrow/Depth assignments, saved records for another account and an existing Default with no manager row. Do **not** decide emptiness by current Chrome-visible menu item count, authorized bucket scan, currently selected account subset, cloud availability, or whether the user is logged in. Never overwrite, delete or recalculate a user's labels, target identities, bucket/prefixes, defaults, flags or ordering merely because login succeeded.

**Explicit acceptance assertions:**
- 1, 2, 100 and 1000 saved destinations remain identical across disconnect/login/restart, even when all are hidden, inactive, inaccessible, or under another account.
- A saved Default without any Simple row remains the same target, and may be linked to an ordinary editable manager row without destructive replacement.
- Saved assignments without Default remain untouched, with a clear selection state; `redown` is not auto-created.
- Zero stored destinations + `defaultTarget:null` after a confirmed successful durable read => the NEXT authorized login creates/reuses `redown`, saves an ordinary Simple root row plus Default and never asks for already retained account approval again.
- Delete the final destination, with no remaining Default => next authorized login triggers exactly the same empty-state fallback. A surviving destination in any mode/account cancels fallback.
- Failed IndexedDB read / account mismatch / expired OAuth / unknown R2 / missing bucket / no native visible rows => NOT a confirmed zero state and must not create or silently reset user data.
- GUI `getConfiguration`/`listDestinations`/menu preview and actual native menu must agree on what is *stored* versus what is *currently executable*. Preserve immutable pre-change snapshots; prove before/after with tests and Windows installed-Chrome evidence.

**This rule is the release gate.** No other onboarding convenience is allowed to run before this persisted-state precedence decision.

## Owner's direction

**A user logs into Click2Cloud once, approves a required initial setup once, and then simply uses it.** Even when Cloudflare requires a normal future OAuth login, **the user never loses their configured right-click destinations and does not have to approve creation/preparation of the same `redown` bucket again** unless a genuinely new resource/permission change requires explicit, scoped consent.

A customer with 100 or 1,000 saved destinations must not lose one because of sign-out, token refresh, an unavailable API, a stale Worker, browser restart, or a Shelf UI transition.

**Clicking File Explorer in the upper navigation must show the connected cloud on the left and select a valid preferred location immediately.** No additional "Open File Explorer" prompt or button is required when already connected.

We explicitly reject cosmetically hiding the symptoms. Fix the underlying state, initialization and routing. Preserve Click2Cloud's **Simple, Narrow, Depth, Quick Select, Default and single canonical V3+1 engine/API**, with full observable and documented GUI/API parity.

## Required implementation plan — sequential, evidence-driven

### P0-A. Preserve source and user data before change

1. Start from latest real development branch or a new branch based on current main; do not rewrite someone else's in-progress work. Inspect any concurrently running Codex branch/PR and avoid duplicate/conflicting edits.
2. Capture immutable, safely redacted before-state: product revision, configured Simple/Narrow/Depth assignment IDs/counts/targets (redact private identifiers in evidence), Default, selected Cloudflare account, Quick/hidden/order settings, a nonsecret yes/no per-account setup approval existence, native desired/applied generation and Chrome extension ID. Take an authorized validated backup if present; **do not reset IndexedDB or uninstall/clear browser data**.
3. Run a reproducible sequence (same ID/profile): connected with several assignments → save current snapshots → explicit disconnect → read same config while logged out → login again → read immediately before/after automatic onboarding and native reconcile → navigate to manager and Explorer. Collect the *first failing boundary*.
4. Determine whether configuration truly disappears from IndexedDB; manager only presents a filtered/empty view; product vs `mode:<mode>` records diverge; account selection points elsewhere; setup approval ledger became unavailable; or the extension/profile identity changed. Explain with source and evidence.
5. Establish a Windows Chrome acceptance case; local fixture-only success does not close this issue. Existing workerd and browser fixtures are useful but insufficient proof of restored persistence on owner Windows.

### P0-B. Make configuration permanent across auth transitions

1. Enforce the invariant: `getConfiguration`, `listDestinations`, manager render, menu preview, backed state and saved setup approval are independent of OAuth connection state. Sign-out/auth failure blocks cloud access **only**; it does not call `deleteDestinationConfig`, `clearDefault`, erase a mode store, or reset the current product.
2. Review `src/persistence/current-store.mjs` `read`/`commitProduct` and mode record precedence carefully. Boot/migration must not treat a read failure, wrong account, unknown cloud inventory, partially loaded DB or schema conflict as a new installation. Fail visibly and preserve last-known durable settings; never silently commit empty config. Preserve versioned schema/revision and atomic transactions. No destructive migration shortcuts.
3. If appropriate, add a tiny durable initialization marker/schema for distinguishing *genuinely new, never-configured installation* from an *established installation whose records became unavailable*. Do not invent recovered preferences or reset legitimate explicit empty state; do not introduce a second datastore or redundant state authority.
4. Validate that changes originating from the GUI and trusted API use the same `commitConfigChange` transaction and readback and are preserved for **all modes**. Verify default/account binding, labels, prefixes, hidden flags, Quick Select, display order and provider visibility.
5. Make `Manage Destinations` useful while disconnected: list saved destinations as locally stored, labeled `Reconnect to use` or equivalent when their provider is unauthorized. Read-only inspection must not require fresh OAuth. It must not display 'No saved destinations' merely because cloud inventory cannot be fetched. Preserve edit/remove affordances according to safe existing authorization rules; distinguish saved configuration from cloud accessibility.
6. Make the restoration behavior symmetric with authorized API callers. Evidence must show same saved config across sign-out, restart, login, crash/reconnect, transient HTTP 403/5xx, and successful refresh. Persist exact user decisions, not temporary discovery results.

### P0-C. Distinguish OAuth reauthorization from setup approval

1. Investigate `src/auth/cloudflare-oauth.mjs`, `src/cloudflare/onboarding.mjs`, `extension/background.mjs` and `src/api/service.mjs`. **OAuth access grants/tokens and the account-scoped setup-approval ledger are different things.** A user may need to sign in after token expiry/revocation; that cannot itself trigger a second resource-creation consent for the *same verified setup*.
2. If existing account + saved approval + valid bucket/Worker/default exist: login → read-only verification → reconnect/reconcile → READY → one right-click save. Do not show an "Authorize automatic setup" first-run prompt again. No unnecessary provisioning, no new `redown` create, no duplicate Worker or changed bucket.
3. If ANY valid saved custom destination or Default exists, preserve it; **do not recreate or override `redown`**. If the owner deliberately deletes `redown` but one or more other destinations remain, preserve those and never recreate `redown`. If the owner deliberately deletes the **last** saved assignment and clears/leaves no Default, the **NEXT successful authorized login** must automatically reuse/create `redown` as the ordinary editable Simple assignment and Default, honoring existing retained setup approval. Deletion alone and passive status must not trigger it.
4. If a saved assignment exists but its cloud bucket is inaccessible/missing: retain it and report **UNAVAILABLE/MISSING PERMISSION/MISSING BUCKET** precisely. Do not count this as zero configured destinations. If Worker is old/permissions actually changed, clearly label `Repair existing setup` or `Update existing Worker` and require only the necessary action/authority. Preserve saved approval and other destinations.
5. **Recurring empty-state initialization:** On EVERY next successful authorized login where the durable same-account configuration is **genuinely empty** (zero saved Cloudflare destinations AND no Default), automatically reuse the existing lowercase `redown` bucket or create it if absent, subject to R2 readiness, real authority and the retained account-scoped setup approval. This covers first install, user deletion of the last destination and later legitimate empty states. If the user already approved setup, DO NOT ask for approval again; if no approval was ever given, request the specific one-time consent before resource mutation. Verify the existing/new Worker and R2, then persist `redown` ROOT as a normal editable/deletable Simple row + Default. No silent R2 activation or unapproved billable action. If interrupted, resume same durable ledger. **Do not mistake data loss, failed IndexedDB reads, wrong profile/account or unavailable bucket inventory for empty saved configuration.**
6. Multi-account users must keep per-account choices and separate setup ledgers. An account mismatch must never erase other account configuration. Distinguish account selection from authenticated identity.
7. UI messages must distinguish **"Log in"** from **"Repair existing Worker"**, **"New setup approval required"** and **"Select destination"**. Never present a recurring authorization prompt when only a silent read-only check is necessary. No false Ready/Success.
8. The exact setup intent and authorization remains guarded by the existing trusted `3+1.1` API; no GUI-only bypass, privilege escalation, replays of uncertain writes, automatic resource mutation or unapproved production deployment.

### P0-D. File Explorer opens directly to the cloud on first click

1. In `extension/app.mjs`, the current top `[data-view=explorer]` handler goes through `show('explorer')` but not necessarily `loadTree`. Introduce **one canonical idempotent Explorer-enter operation** that opens, loads/refreshes the account/bucket tree, resolves selected location and navigates through the existing `navigateExplorer`/File API.
2. Initial selection precedence, only among verified authenticated/authorized targets:
   - restore the last deliberately selected Explorer location for the same account if still valid (save a nonsecret, account-bound reference durably as needed);
   - else the saved Default destination/bucket;
   - else the owner's saved selected Cloudflare account and its actual existing `redown` root if authorized;
   - else another unambiguous valid connected account/bucket;
   - else display a clear account/bucket selector for multiple choices, **without inventing a default or overwriting settings**.
3. On first click, show connected cloud names and their bucket rows in the LEFT Explorer navigation. The selected account should be expanded, the chosen bucket visible/selected, and the main pane listing it. Explicitly restore after successful login/reconnect when Explorer is visible; no double click.
4. `connections()` may invalidate outdated cached file listings after an actual identity/permission change, but it must **not destroy durable selected location** or require another "Open File Explorer" click after reconnection. Async loading must ignore stale generations and preserve the most recent user navigation.
5. Consolidate or remove redundant Explorer-open CTA in Remotes/connection section when it is only an unnecessary extra gate; the top navigation remains the canonical entry. **Remotes remains the default tab on application launch**, as separately required by the owner.
6. On disconnection, Explorer should keep saved account/location labels for orientation where safe, show accurate "Reconnect" status, and automatically restore available locations after authentication. Never show a fake empty cloud or claim live folder contents while disconnected.
7. Explorer should work with zero, one, multiple accounts, a missing default, removed bucket, disabled/hidden provider and stale saved location. No empty tree until the user manually presses a second button.
8. Make the Explorer startup path callable/observable via the existing trusted API, including `listAccounts`, `listAuthorizedBuckets`, `navigateExplorer`, `listFolders`, `getConfiguration` and `loginStatus`. If a genuinely missing public API equivalent is found, add it under the same canonical owner with typed schema, permissions and tests.

### P0-E. Menu, API and evidence alignment

1. Verify the menu still follows the owner-approved flat Cloudflare + promoted Quick Select topology in [latest rules](../../latest/right-click-rules/README.md). Disconnected saved menu rows must not disappear, silently reroute to a different account, or pretend to be live. When reconnecting, reapply the current chosen settings and wait for real Chrome ACK.
2. Maintain exact source → API → storage → native menu → behavior documentation, including the `11.2026/workings/right-click-workings.json` **CURRENT** source fingerprints, without rewriting the immutable baseline. Update [engine/API map](../../latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md) and source comments in the same change.
3. Do not conflate a test fixture passing with installed Chrome validation. Provide chronological evidence of account, config revision, mode counts, setup approval presence and native generation before/after each boundary. Tokens, account secrets, private URLs, raw Cloudflare errors and internal credentials must not be emitted.

## Required regression matrix

| Scenario | Must happen | Forbidden |
| --- | --- | --- |
| 1 initial login with approval, no prior config | Create/reuse `redown`; verify; persist Simple root + Default + approval | Fake READY or duplicate setup |
| 2 same-account logout → login | All configured destinations exactly unchanged; reconnect and save | Repeat setup approval or zeroed manager |
| 3 token expiry / refresh | Configuration unchanged; refresh if authorized, else precise login request | First-run reset |
| 4 revoked consent / partial scopes | Preserve entries/Default; report missing authority | Delete destination or silently escalate scopes |
| 5 restart Chrome/extension service worker | Restore full config, menu and retained setup ledger | User rebuilds menu |
| 6 extension update with same ID/profile | Data remains; safe migration and re-registration | Write empty defaults over stored state |
| 7 100+ Simple/Narrow/Depth entries, Quick and custom prefixes | Exact count/labels/ordering/targets survive sign-out and restart | Pagination hiding records presented as loss |
| 8 custom Default (not `redown`) | Reuse exact custom Default after login | Default overwritten with `redown` |
| 9 remove `redown` while other destinations survive | Preserve all surviving assignments/Default; never reinsert `redown` | Recreate because one named bucket disappeared |
| 10 delete LAST saved destination (and no Default), then next authorized login | Reuse/create `redown` automatically, persist ordinary Simple + Default, reuse prior account-scoped setup approval | Recreate on mere deletion/status/restart; ask approval again; ignore legitimate zero state |
| 11 Worker upgrade required | Show specific existing-Worker repair/upgrade, preserve approval/config | Present fresh bucket creation as necessary |
| 11 incorrect/changed Cloudflare account | Preserve both accounts' records, block unauthorized usage, offer selection | Misroute/delete or silently switch account |
| 12 transient Cloudflare/R2 outage | Show offline/unavailable, preserve settings | Treat unavailable inventory as empty database |
| 13 Explorer tab first click, one connected account | Left tree populated, correct bucket selected, file list shown | Extra `Open File Explorer` action |
| 14 Explorer first click, multiple accounts | Restore preferred account or request clear choice | Guess wrong account |
| 15 Explorer reconnect while open | Location restored after auth; no duplicate scan or race | Blank tree requiring button |
| 16 Manager while disconnected | Stored destination entries still visible with honest offline state | Blank manager labeled zero saved |
| 17 storage failure/corrupted state | Explicit error, preserve available recoverable data, no destructive overwrite; offer validated restore | Silently reinitialize fresh |
| 18 API vs GUI parity | Identical stored config and menu topology/readback across surfaces | GUI-only state or conflicting projection |
| 19 original logged-in image/link save | Cloudflare remains TRUE REMOTE; independently verified R2 receipt and GO TO | Browser-byte downgrade, timer-based success |
| 20 full Browser/Windows acceptance | Separate fixture vs real Chrome/Cloudflare pass evidence, including reload | Declare PASS from simulated callback |

## Required artifacts and definition of done

1. A before/after **root-cause report** naming the first proven failing boundary and the exact source branch, including any "lost" versus "not rendered" distinction.
2. Source implementation with **smallest coherent repair** through the existing persistence/auth/onboarding/UI/API owners; no parallel state store or second registrar/engine. Minimize code bloat, not correctness.
3. Unit/integration coverage for the entire matrix, real IndexedDB/revision tests and real Chromium app tests. **Real installed Windows Chrome smoke acceptance** must be reported separately; if it cannot run due to environment policy, mark BLOCKED and provide precise owner steps.
4. Exact saved configuration readback before sign-out, during disconnect, after login and after browser restart; counts, target identities, Default and Quick settings identical unless deliberately changed.
5. Proof same existing `redown` Worker/bucket reused; zero unauthorized new resource operations, only one initial approval. Genuine insufficient permissions are reported without losing records.
6. Explorer first top-tab click loads the selected cloud/bucket in the left pane and opens its contents, with no second button.
7. All source/API docs and CURRENT behavior map updated alongside tests; preserved immutable baseline and explicit unresolved gaps.

**STOP / DO NOT MERGE OR CLAIM READY if any saved destination can disappear after normal auth transition, if a previously approved ready setup asks for first-run setup again, if Explorer needs a second open action, or if a full Chrome release is claimed without evidence.**

**OWNER'S FINAL RULE: Right-click configuration is a durable user asset. Login grants temporary authority to use it; login never owns or deletes it. Existing saved destinations: 'LOG IN → READY → CLICK'. Genuine zero saved destinations and no Default: at the NEXT authorized login, reuse/create lowercase `redown`, verify, persist ordinary Simple + Default, then READY. Existing account-scoped setup approval must be reused without another prompt. Never cover up missing user data by pretending it is a genuine zero state.**

**NO BLOAT · NO DESTINATION LOSS · NO UNNECESSARY RE-APPROVAL · ONE-CLICK EXPLORER · FULL GUI/API PARITY.**
