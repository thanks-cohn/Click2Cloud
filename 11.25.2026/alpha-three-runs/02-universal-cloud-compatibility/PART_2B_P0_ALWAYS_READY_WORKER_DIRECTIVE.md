# Part 2B — P0: Always-ready Worker and save-first reliability

**Date:** 2026-11-27  
**Status:** Owner directive for the next Codex request; implementation and acceptance pending.  
**Baseline:** Click2Cloud / ReDown 0.3.32.5, `ea8e1d8d495fe276de48063b1640340d3c2f7cce`. Part 2 P0.0 remains unaccepted. This document is standalone and mandatory input for Part 2B; it does not supersede unresolved Part 2 acceptance gates.

## 1. Product mandate

### Primary owner acceptance: it just works

A brand-new user opens ReDown, completes normal account login and any genuinely required provider authorization, right-clicks a destination, saves it as a save location, then uses that location for a save. **The first save works. The end.** No prior Depth save, Shelf visit, manual Worker preparation, extra repair click, waiting ritual, or unexplained readiness error. Destination registration itself must initiate any permitted preparation necessary for first use; if the user clicks save immediately, the same operation must join or initiate readiness recovery and continue automatically when possible. A new configured location must not depend on any other location having been used first.

Test this exact user-visible journey independently in Simple, Narrow and Depth, on a clean new-user profile and on returning-user profiles, including immediately after destination registration. Verify the actual saved object at the requested location and record the number of extra user interventions (target: zero beyond normal login, destination selection and the original save). A real external outage or missing provider authorization is a separately classified blocker, not a passing first-use test. A background preparation success alone is not acceptance; the first actual save must complete and be verified.

**The user's job is to save files. ReDown's job is to make that possible. Maintaining the Worker must not become the user's responsibility.**

Prioritize immediate legitimate saves, automatic recovery, preservation of the user's time and durable recovery of incomplete operations. A user should not need to know about Worker deployment, generations, readiness caches, ledgers, initialization order, the Shelf, or another menu mode. A recoverable internal condition must not become a terminal user-facing error merely because an internal precondition has not been initialized.

The design objective is the highest practical probability of readiness for both brand-new and returning users, including after months of inactivity. No absolute uptime promise is possible during external outages, revoked permissions or unavailable source content. Preserve essential account authorization, privacy, exact destination identity and truthful completion; simplify or eliminate redundant internal gates rather than weaken actual access controls. Never silently redirect to another account, bucket or prefix, broaden permissions, or claim that an unverified save succeeded.

## 2. Evidence and investigation

- Owner reports original REDOWN performed over 1,000 saves reliably, including repeated sign-in/sign-out. This is owner experience, not independently measured comparative reliability.
- Recent owner report: a new user's Simple/Narrow saves reported Worker not ready until a Depth save was attempted. The exact causal branch is unconfirmed. Treat this as a first-use P0 defect; do not assume the reported sequence proves causality.
- Windows local fault campaigns on 0.3.32.5: first 100-file run 99/100, one pending after campaign-wide retry reserve exhaustion and 11 bytes staged; second run 100/100 uploads and 100/100 reopened SHA-256 downloads with no staging leftovers. Two 555-file attempts failed at upload-readiness before generating the workload, reporting WORKER_UNAVAILABLE. No live Cloudflare writes occurred. The five-second resource profiler collected only one sample during one 3.747-second failure; resource exhaustion and the underlying transport exception remain unconfirmed.
- Do not conflate local Workerd/Miniflare startup failure, Chrome MV3 service-worker lifecycle, and deployed Cloudflare Worker readiness. Trace each independently and correlate errors.

Mandatory immutable cross-repository study:
- [Original REDOWN](https://github.com/thanks-cohn/REDOWN/tree/c78babc314acc5891203e95b169f027756e956c1): `extension/background.js` (preparedProfile, provisioning, health and save paths); `extension/right-click-v3.js` (prepared/eligible, Simple and Narrow target resolution); identify historical owner-validated working revisions where possible.
- [Current Click2Cloud](https://github.com/thanks-cohn/Click2Cloud/tree/ea8e1d8d495fe276de48063b1640340d3c2f7cce): `extension/background.mjs` (remoteReady, prepared, recoverConfiguredTarget, depthClick, invokeProviderAction, nativeReady); `src/cloudflare/onboarding.mjs`, `deployment.mjs`, `transport.mjs`, native registrar and save engine; `src/chrome/python-lab/session.mjs`, diagnostics and local fixture scripts.
- Review existing November 13 and 16 Worker setup investigations and worker-permission handoff; distinguish historical reports from current source and verified evidence.
- Compare initialization, profile/plan ownership, authorized recovery, OAuth, cold start, first save, storage durability and provider verification. Existing source shows original prepared-profile reuse and a newer separate transport-plan/readiness system, mode-specific Depth recovery, negative readiness caching and default-target-oriented login initialization. These are leads, not proof of the new-user incident.
- Produce a source-anchored before/after decision table: retain, consolidate, remove or repair each gate, with its actual reason and evidence. Do not blindly port legacy code or replace the verified transport engine.

## 3. Required architecture

Consolidate existing readiness, preparation and recovery into one shared authority (reuse existing provisioner/ledger/transport where feasible; do not create competing engines). Every Worker-backed entry point must use it, especially Simple, Narrow and Depth, irrespective of which mode was previously used. Explorer, screenshots, uploads and laboratory paths must reuse the same applicable readiness infrastructure without altering unrelated provider behavior.

- Proactive: after authenticated login, reconnect and destination changes, initialize or reconcile relevant configured and already-authorized destinations, not just the default. Prioritize requested/active destinations; use bounded concurrency, avoid blocking unrelated destinations or UI.
- Preventive: recover persisted state on install/update, browser startup and MV3 wake; register listeners correctly, support suspension rather than rely on an immortal background process. Revalidate existing Worker identity and capabilities; invalidate stale negative cache on relevant changes; avoid repeated probes or redeployments on healthy paths.
- Reactive: on first save, resolve exact destination and authority, check readiness, coalesce concurrent initialization per exact account/bucket and relevant scope, and automatically recover using existing authorization. Continue the original operation when its source, identity, authorization and generation remain valid. No automatic second click solely because repair completed; request new interaction only if genuinely required, e.g. expired user gesture/source capability.
- Durable: persist recoverable setup phases and operation identity before consequential work where possible. Resume interrupted setup and pending saves on supported wake/restart; use stable identity, bounded retry/backoff, verification and reconciliation before replaying uncertain writes. Retain recoverable pending status and actionable evidence on genuine blockers.
- Healthy existing Worker: reuse immediately when valid. Missing local record: recover only verifiably owned matching deployment/credentials. Interrupted deployment: inspect and resume exact existing plan. Deleted Worker: recreate only if ownership, scope, authority and existing consent permit; otherwise provide a precise action. Temporary network failure: retry reads/reconciliation; do not infer redeployment is needed. Revoked authorization: retain configuration, never bypass it.
- Separate nonessential history, diagnostics, cosmetic state and ancillary storage from the critical transfer path. Degrade gracefully where safe; do not sacrifice verified completion or required durable recovery evidence. Never report success falsely.
- Preserve existing OAuth client, extension identity, destination choices and menu semantics unless evidence justifies a narrowly scoped change. No new permissions, billing changes, live deployments or destructive actions without required authorization.

## 4. Remove needless user-visible blockers

Audit all producers and consumers of WORKER_SETUP_REQUIRED, WORKER_UNAVAILABLE, WORKER_NOT_READY, REPAIR_REQUIRED, WRITE_PROOF_REQUIRED, FRESH_CLICK_REQUIRED and associated readiness/authorization codes. Trace exact failed predicates and distinguish recoverable internal conditions from genuine external/authorization blockers. Remove duplicated checks or stale gates only with equivalent safety and verification. Avoid requiring another feature, Shelf open, Depth activation, manual refresh, reinstall, sign-out/sign-in or repeated approval as a workaround.

A configured destination is not proof of Worker readiness; conversely missing/stale cached readiness is not proof the Worker is unusable. A valid fresh capability and exact-target verified transfer are the operational truth.

## 5. Transport resilience and diagnostics

Address the existing Part 2 P0.0 blockers in the same reliability program. Use bounded per-operation retries plus workload-sensitive campaign reserve, respecting approved cost/traffic/request/time ceilings and reserving audit capacity. Distinguish publication observations from actual replay attempts; never blindly replay uncertain writes. Recover or clearly retain owned staging; no unrelated cleanup.

Investigate local fixture startup errors separately, preserve sanitized underlying transport exception, phase, timing and correlation ID, and capture process/system resources on startup, failure and exit even for runs shorter than the sample interval. Do not hide failures by rerunning until green. Preserve existing receipts; no credentials or private source bindings in shareable outputs.

**Customer recovery is mandatory:** when automatic recovery cannot finish, retain failed/pending/uncertain operations and failed batch children in the existing durable Queue. Offer simple Retry and Retry All Failed, repeatable by deliberate customer action without an arbitrary lifetime retry cutoff. Each recovery window remains bounded and authorized; reconcile uncertainty before replay, coalesce duplicate clicks, preserve source and target, and never repeat confirmed siblings or debit the same logical save twice. If the original source or authorization is genuinely unavailable, offer the specific corrective action. The active Part 2 customer-visible Queue recovery section governs details; shared semantics in 2B.2, actual controls and failed-child recovery in 2B.3. No unrelated scope expansion in 2B.1.

**Latest owner direction — source details and truthful Shelf lifecycle:** Reuse original recorded Source URL and Host URL/actual screenshot context in collapsed failed Queue details (Open/Copy, privacy-safe); keep Retry primary and preserve original bytes when feasible. Trace actual ordinary Upload button/API, batch scheduler and feedback, including partial 41/43 notification ineligibility and failed-source cleanup. Prefer automatic, independently owned background transfers; say Keep the Shelf open during any necessary source preparation or unsupported transfer phase rather than falsely imply completion or safe closure. No forced window or needless user intervention. The active Part 2 source-links/upload-feedback/lifecycle section controls implementation and evidence in 2B.2–2B.4; 2B.1 remains Worker readiness.

## 6. Acceptance and locally executable evidence

Produce reproducible Windows-compatible scripts and receipts exercising actual production paths, not a mock that simply asserts readiness. Use independent clean fixture state for first-use cases; prove no earlier Depth action, initialized profile or cached readiness can contaminate Simple/Narrow tests. Separately test returning users with persisted state. Keep evidence classes (unit/fixture, packaged browser, installed Chrome, live R2) distinct.

Required coverage:
- Fresh login → first Simple save; fresh login → first Narrow save; fresh login → first Depth save; Simple/Narrow with Depth never activated and Shelf never opened.
- Existing healthy Worker reuse; second/non-default destination; multiple accounts/buckets/prefixes; repeated reconnect; restart, suspension, extension update, offline-to-online, concurrent first saves.
- Missing/stale record, interrupted deployment, expired token, transient transport error, missing Worker, denied authority, ambiguous publication; valid recovery vs genuine blocker; no duplicate deployment or write, no wrong-target write, no false success.
- Ancillary history/diagnostics/storage failure must not block a legitimate save when safe to proceed.
- Proposed local regression targets: 100 independently reset sessions per menu mode, 100 returning-user sessions, 100 cold restarts, 100 recoverable failure cases. Require all eligible cases to pass; report unexecuted cases honestly. No claim of production availability from these finite tests.
- Preserve current acceptance: Windows 100 and 555 fault round trips (predeclared repeat plan in Part 2), fresh authorized live R2 100-file round trip, installed-browser gates and independent first-use cases. Historical retained-copy verification follows the roadmap historical-evidence procedure; absent originals are not a pass, substitution needs explicit owner approval. Do not waive a current gate.

Receipts must include source/build identity, exact logical target (safe aliases where needed), prior state, trigger/mode, readiness transitions, failed predicate, recovery attempts and results, operation identity, publication verification, retry accounting, remaining staging, and final outcome. Provide straightforward CMD entry points with automatic fixture pairing where applicable; real provider grants remain explicit.

## 7. Handoff to next Codex request

This is the overriding P0 save-first/readiness directive for Part 2B. Shortcut infrastructure is a separate requested scope (shared dispatcher and focused Shelf-local shortcuts), subordinate to the Worker readiness and transport repair. Preserve unrelated behavior and previous reliability improvements.

The immediate checkpoint is Part 2B.1; the Part 2 execution index controls the next slice. Use the existing authorized continuation branch and the owner's maximum 45-minute session, minute-35 handoff preparation and minute-45 push (earlier when complete). Subsequent checkpoints repair recovery/retry and fixture startup, consumer filename/partial batch behavior, and integrated Windows/live qualification. Codex runs affordable focused/build/packaged tests before handoff and provides exact CMD and receipts for owner-only tests. Do not present a partial checkpoint as accepted.

**P0 invariant:** Every configured and authorized destination must be independently usable from its first invocation, regardless of menu mode, prior feature usage, Shelf visibility, browser lifetime or initialization order. Recoverable internal Worker failures must automatically initiate bounded, verified recovery without unrelated user actions. If a save cannot complete now, preserve recoverable work where technically possible and explain the genuine blocker precisely.
