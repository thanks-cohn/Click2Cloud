# Codex V3+1 — Autonomous implementation and live REDOWN-parity acceptance

**Glaciaring focused execution brief:** [CODEX_GLACIARING_IMPLEMENTATION_REQUEST.md](CODEX_GLACIARING_IMPLEMENTATION_REQUEST.md). Use with the owner-approved P0 no-shortcuts correction and existing repo/lab authorization rules; do not equate efficiency with skipped error detection.

## PRIORITY OVERRIDE — Glaciaring is coverage, not a shortcut

**Read the [P0 no-shortcuts correction in the Codex request](CODEX_BUILD_REAL_V3_PLUS_ONE_NOW.md#p0-correction--complete-inspectability-no-diagnostic-shortcuts-owner-requirement) first. It overrides all earlier optimization-focused language in this runbook.** The real owner intent is an **entirely programmatically inspectable and traceable engine surface**, with inexpensive signals covering every critical supported state, branch, error, handoff, mode, provider and menu item. The benefit is quicker access to complete evidence—not fewer checks, ignored faults, or an easy-looking summary.

Never minimize the number of examined files, diagnostic queries, agent iterations or printed failures as an independent success metric. Never optimize CPU cost by silently reducing required detection coverage. Maintain a source-backed **critical-boundary coverage catalog**, fault-inject every meaningful error class, test missing/incorrect signals, and produce structured, paginated, complete-as-possible query surfaces including explicit gaps. If any mandatory boundary is unobservable, mark **GAP/BLOCKED/FAIL** rather than declaring “covered” from a nearby green checkpoint.

**Two simultaneous hard gates:** (1) no missed supported critical faults or concealed uncertainty; (2) negligible *measured* instrumentation overhead in right-click hot paths. If both cannot be met, document the failing gate and improve the instrumentation mechanism. Less diagnostic investigation and fewer Work/Codex repair cycles are only **secondary observed benefits after full detection/accuracy gates pass**.

**No early closure:** An earliest-observed suspicious signal is a navigation hint, not proof that all sibling paths, prerequisite chains or independent faults are healthy. Require fault-injection cases with multiple independent origins, deceptive green intermediates, missing events, stale menu ACK, false provider receipts and regression between Simple/Nested/Depth. Always show all failed/incomplete gates to the next agent.

**Agent diagnostics:** Follow the [Glaciaring seed](V3P1_GLACIARING_AGENTIC_DEBUG_API_SEED.md) for MenuSpec inspection, native acknowledgement evidence, bounded causal tracing and sanitized Agent Debug Receipts. Apply it alongside the existing mandates and [V3 vs. V3+1 source review](../final-review/V3_VS_V3PLUS1_SOURCE_AUDIT_2026-11-03.md). The diagnostics layer observes the same service owners and preserves their authority.

**Authority:** `thanks-cohn/Click2Cloud` only. The original `thanks-cohn/REDOWN` is a *read-only behavioral reference* and eventual transplant target, not a build/deployment target for this run.

**Complete functional API contract:** [V3P1_COMPLETE_CONDITION_TO_BEHAVIOR_CONTRACT.md](./V3P1_COMPLETE_CONDITION_TO_BEHAVIOR_CONTRACT.md). This is the canonical condition → behavior → evidence matrix and the proposed V3+1 Engine API surface. Trace each implemented journey to its engine operation and an actual test or external receipt, and record unimplemented cases honestly; no fake control or simulated cloud success.

## Glaciaring and convergence execution gates (P0 — diagnostics must save engineering work)

**Authoritative owner clarifications:** [Minimal-Traversal Glaciaring](references/GLACIARING_MINIMAL_TRAVERSAL_OWNER_INTENT.md) and [Canonical Menu Twin & Convergence](references/CANONICAL_MENU_CONVERGENCE_OWNER_INTENT.md). Follow the detailed P0 requirements and acceptance tests in [CODEX_BUILD_REAL_V3_PLUS_ONE_NOW.md](CODEX_BUILD_REAL_V3_PLUS_ONE_NOW.md#p0-glaciaring-minimal-diagnostic-traversal--canonical-menu-convergence-owner-requirement). They refine the existing design seed, not override security or REDOWN parity.

- **Build comprehensive inspectability with cheap boundary signals** across all supported operations, material branches and errors. A narrow navigation map may direct first inspection, but must not hide other failures or restrict available trace evidence. Record any missing/unknown/dropped observation and report it faithfully.
- **Keep right-click performance intact:** no deep cloning, routine stack traces, JSON serialization, disk writes, polling or network telemetry in the click hot path. An optional sink with bounded rings/fail-open instrumentation is the initial design; any escalation/graph/receipt happens outside the latency-critical path. Measured A/B p50/p95/p99 + memory budgets are release gates. No “zero overhead” claim without measurement.
- **Make the logical menu inspectable first:** humans and agents inspect the same canonical MenuSpec; mirror, native Chrome plan, omission index and action resolver must not diverge. Desired/generated/Chrome-ACK/independently-observed are separate evidence classes; a Chrome API acknowledgement cannot certify pixel rendering.
- **Preserve accepted behavior:** versioned baseline/golden menus and tests for Simple, Nested, Depth and unrelated provider leaves. Each patch produces a small diff and change-impact report, detecting regressions before they require another Work/Codex run.
- **Prove comprehensive fault detection first:** use a source-derived error matrix, deliberate signal gaps, cascading and independent faults, menu/provider/mode regressions and false receipts. Confirm no mandatory error is silently omitted, report misses/false attributions/UNKNOWN and retain full accessible evidence. **Only then** compare investigation time or iterations with diagnostics OFF/ON; never reward skipping checks.
- **User-visible vs diagnostic output:** real save failures remain visible to users in normal mode; internal debug codes, detailed traces and console output only in authenticated Debug Mode or explicit diagnostic export. Never put tokens, page/source URLs or object private data into the receipt.
- **Keep service ownership intact:** diagnostics cannot write, repair or replay cloud operations. A simulation performs no live actions. Preserve REDOWN's single registrar, activation, transfer and verified History handoff. Extend instrumented boundaries through adapter declarations, never mode-specific rewrites.
- **Implementation order:** canonical identities and mode-isolation baseline → shared resolver/MenuSpec and desired/ACK plan → optional sparse signals → minimal diagnosis and sanitized receipt → read/simulate API → fault-injection and installed Chrome parity checks → performance/efficiency benchmarks. Continue nonblocked work if browser or external cloud proof is unavailable.

**Stop-the-line rule:** Do not call Glaciaring complete until the entire declared critical-boundary catalog and each supported error class have traceable signals and adversarial tests; all faults and gaps remain visible even when an early candidate is identified; menu-model and provider/mode regressions are caught; diagnostic-off behavior and privacy remain correct; a stable agent-readable receipt exists; and measured hot-path budgets pass. Representative happy-path tests alone are insufficient.

## Mandatory pre-launch Scenario Laboratory milestones (M0–M10)

Read and execute [V3P1_SCENARIO_LAB_PRELAUNCH.md](milestones/V3P1_SCENARIO_LAB_PRELAUNCH.md) and its [337-case baseline inventory](milestones/V3P1_CONTRACT_SCENARIOS.json) as the formal pre-launch acceptance ledger, in addition to all existing runbook and Glaciaring requirements. **First implement the thin programmatic runner around the real engine and authoritative Universal File API**, analogous to REDOWN's Python Laboratory. The runner should exercise all supported critical states and failure branches deterministically, expand into property/state-machine/combinatorial scenarios, and export exact results and reproducible seeds for agent investigation. It must not recreate the engine or perform unauthorized cloud operations.

For every implementation stage, add source-linked scenario IDs, positive and negative assertions, exact Glaciaring evidence, immutable regression cases and status/proof class. Do not hide missing cases, skip errors for speed, or relabel simulation/injected Chrome/provider results as live. M0–M10—including actual installed Chrome, authenticated cloud receipts, repeat low-latency proof, REDOWN compatibility/rollback and a release-readiness certificate—must each be explicitly PASS, FAIL, BLOCKED, NOT_TESTED or PARTIAL. **No public launch while a mandatory gate remains unproven.** Continue independent fixture/API work when external permissions block a specific live gate.

## The mandate
**Execute the entire feasible engineering run without a new user prompt:** inspect, implement, test, repair, commit, push, inspect CI/Cloudflare builds, and report evidence. Never substitute a design document or mock controls for working code. The user's existing authorization allows automated development within the isolated Click2Cloud project and the documented disposable test prefixes; it does not authorize changing R2 subscription/billing, user OAuth consent, external account permissions, or production REDOWN infrastructure.

**Specialized scope:** V3+1 is a modular **right-click destination engine and editor**, NOT a clone of the full REDOWN Explorer/dashboard. Reuse REDOWN's extracted Universal File API and real Worker protocol. Build the minimum practical configuration workbench needed to see and exercise native Chrome context menus, selected directories, Refresh, Activate Buckets, and real save receipts.

## The three independently replaceable modes — hard invariant

Structure (file names illustrative; use clean actual module boundaries):

```text
src/modes/simple/{config,validate,project}.mjs
src/modes/nested/{config,validate,project}.mjs
src/modes/depth/{config,validate,project}.mjs
src/core/{menu-spec,mode-controller,menu-registrar,save-dispatcher}.mjs
src/explorer/*          ← imported REDOWN Universal File API and Cloudflare transport
src/dashboard/*         ← one shared Refresh/activation service; no mode coupling
```

- **Simple** is a flat list of manually configured actionable destinations, default label = final folder component, otherwise bucket name.
- **Nested / Narrow** contains only explicitly configured authorized destinations and their natural ancestors, including explicit `Save here` where an actionable parent also has children.
- **Depth** projects all discovered eligible children to the selected depth (including unconfigured folders), with explicit `Save here` on actionable branches; depth 1–10+ if supported without breaking Chrome limits.
- Each mode owns **its own persisted configuration, revision, validation, projection, tests and migrations**. No mode imports another mode's internal implementation or writes another's config. All consume a shared **read-only** versioned, paginated authenticated inventory snapshot and output the same validated `MenuSpec` and canonical SaveIntent IDs.
- Switching modes NEVER rewrites inactive configurations; editing Simple NEVER changes Nested or Depth. A new actual folder discovery updates read-only inventory without mutating mode preferences. Replacing one module must preserve the other two unchanged.
- The shared mode controller selects which projection is registered. One Chrome native menu registrar with stable IDs and one save dispatcher only; no duplicate roots/listeners.

## REDOWN Refresh and Activate Buckets — actual behavior, not decoration

Existing REDOWN reference: `extension/beta/explorer.html`, `extension/beta/explorer.mjs` (`refreshConnection`, `listing`, `loadAccounts`, `paintActivation`, `prepare.onclick`) and `extension/background.js` (`activateAllBuckets`, `runGlobalActivation`, `preparedProfile`, `deployCloudflareProfile`, `setupRedownQuickDestination`, `reconcileMenus`). Exact source is the authority.

- **Refresh**: when a folder is selected, call `api.run('list',{source})` for its actual objects and cursor, then update its inventory display; without a selection, `api.run('accounts')` and `api.run('buckets')` for real discovery. **Read only. Never provision, deploy, create, reconfigure, or activate from Refresh**. On genuine connectivity/auth failures, report actionable state; do not quietly change the bucket.
- **Activate Buckets**: request the existing REDOWN authenticated `activateAllBuckets` operation after authorization, with `confirmed:true`, existing account/bucket enumeration, per-bucket preparation/Worker capability verification, state persistence, partial/retry-failed semantics and Chrome menu acknowledgement. Never declare Ready until actual status confirms worker, authorized bucket, and native registration. Activation does NOT enroll in R2 billing, automatically grant OAuth permissions, or expose private objects publicly.
- **Normal first run is automatic** after a valid user's explicit Cloudflare connection/approval and verified R2 entitlement: reuse/create lowercase `redown` through REDOWN's `setupRedownQuickDestination`-equivalent trusted service, prepare Worker/binding and default Simple save, enumerate/prepare existing buckets, reconcile native menu, and verify. Keep the Activate Buckets button permanently visible for user-invoked repair/retry; pulse it only on actual activation/repair failures. Autostart must be idempotent, deduplicated and resumable across MV3 suspension; must not repeat/create extra resources after an uncertain response.
- **Enable R2** is a distinct conditional control when a *verified* R2 not-entitled/subscription state requires user action; it sends the user to Cloudflare's own consent/checkout. Never conflate an empty bucket list, 401/403, access denial or transient 5xx with inactive subscription. **Reconnect & Approve** is distinct when OAuth scopes/access are insufficient. Do not programmatically accept paid terms or alter billing.
- Make **the shared activation service**, not any Simple/Nested/Depth module, own provisioning, tokens and verified readiness.
- The existing Click2Cloud workbench under `dashboard/` and `src/dashboard/` is a partial starting point. Its `redown-bridge.mjs` intentionally refuses activation from a standalone unauthorized page because REDOWN currently permits only its `beta/explorer.html` sender. **Fix this limitation correctly in Click2Cloud's own trusted MV3 host/service architecture**; do not spoof the original extension URL, copy tokens, bypass sender validation, or loosen the production REDOWN handler.
  - Prefer a Click2Cloud extension-local privileged background host with an explicit sender allowlist for its own dashboard route, permission check, current authenticated session and the same REDOWN production service implementation; invoke the shared service through a narrow message protocol. If a standalone Portal is also used, it must not be an unauthenticated HTTP proxy to Workers or credentials.
  - `confirmed:true` should derive from a previously granted user setup authorization or a direct user activation gesture, NOT a fabricated consent. Background autonomous recovery may proceed only within already-authorized scope.
  - Distinguish `blocked/no-auth` from `failed`. Keep usable read-only UI instead of rendering a fake success or disabling every feature on an unrelated failure.
- Preserve the proven source semantics of `src/explorer/file-api.mjs`, `configuration.mjs`, `r2-adapter.mjs`, and `cloudflare-api.js` unless a narrowly scoped compatibility fix is demonstrated by tests. They were copied from REDOWN; any changes need provenance and parity tests.

## Real Chrome native right-click, not just DOM previews

Run a minimal real MV3 extension harness inside Click2Cloud with the same native Chrome limitations and a genuine root/composer/dispatcher. REDOWN reference: `extension/right-click-v3.js` is the Cloudflare-specific projection/resolver; `extension/background.js` owns the only menu registrar and click listener; `extension/google-drive-menu.js`, `extension/dropbox-menu.js`, `extension/onedrive-menu.js` contribute independent flat provider leaves. **Do not rewrite those providers or convert them into V3 modules.** Demonstrate that unchanged provider fragments survive each mode selection/rebuild. Do not incorrectly treat legacy 'Home' as Explorer navigation: default Cloudflare Home, where present, is an exact root save action.

The minimal workbench shows live bucket folder data, mode controls, destination editor (Parents/Siblings/Children horizontally scrolling pills and autocomplete), Preview/Apply, Refresh and Activate Buckets. It does NOT need a second full File Explorer, history system, cloud file manager, multi-provider OAuth implementation or theme engine. Native Chrome right-click must be separately proven; a hand-drawn web menu cannot certify Chrome behavior.

## Automation / decision policy

1. Start by reading the current REDOWN *source*, not historical proposals; record commit/blob hashes for protected reference files and distinguish current source reality from prior specs.
2. Inspect existing Click2Cloud sources and tests, including `src/dashboard/controls.mjs`, `src/dashboard/redown-bridge.mjs`, `dashboard/`, and extracted API. Run `npm test`; fix baseline regressions before expanding.
3. Implement real modules **incrementally**, with tests of mode isolation, menu identity and original REDOWN operation contracts. Do not ask design questions for already specified semantics. Choose narrow compatible defaults for unspecified nonsecurity decisions and document them.
4. Use the already connected `thanks-cohn/Click2Cloud` → `click2cloud-v3p1-r2-lab` automatic Cloudflare Worker Builds pipeline; do not assume a Worker build is an interactive Chrome extension test. Inspect its logs after pushing commits and repair failures within scope. The lab Worker is intentionally private/no public routes.
5. Verify real REDOWN Worker interactions through existing lab Service Bindings and already authorized credentials, when available. Service bindings alone do not confer Worker bearer tokens, Cloudflare OAuth consent or browser Chrome identity. No secret or OAuth token in GitHub, fixture URLs, logs or native menu IDs.
6. **Only write/delete within named disposable test prefixes on approved buckets**. Other 19 REDOWN Worker services are read-only compatibility targets unless scoped test authorization exists. Never alter REDOWN source/deployment, customer bucket files, public access or billing. No implicit user data migrations.
7. Explicitly separate the historical REDOWN TRUE REMOTE ingestion (source URL reaches REDOWN's Worker) from the new provider privacy goal (source bytes/minimal metadata to destination providers). Preserve fidelity and mark unproven privacy or size promises not yet supported. Do not fake transport completion.
8. Run focused unit/property/integration, real native-Chrome where available, and provider receipt/read-back checks. On known transient failures, retry bounded safe reads; on ambiguous writes inspect/reconcile first, never blind retry.
9. **Continue autonomously through nonblocked work.** If permissions, browser installation, a new OAuth grant, account-level R2 enrollment, or billing consent truly require the user, record a precise BLOCKED gate, a specific smallest required user action, and keep implementing/testing every independently possible component. Do not claim the entire run passed when any gate is blocked.
10. Commit coherent changes and push to **Click2Cloud only**; use main for lab-only implementation when the repo permits, since it triggers Cloudflare auto-build. If branch/ruleset requires PR, create/publish it instead without stalling engineering. End with links, commit IDs, actual commands, scoped live evidence and PASS/FAIL/BLOCKED/NOT TESTED for each gate.

## Stop conditions (do not override)
- Any operation requiring a new payment, account-wide administrative entitlement or OAuth consent cannot be auto-approved.
- No unauthorized route around sender checks, no public admin endpoint, no cross-extension impersonation, no secrets in source.
- No write or deployment into production REDOWN or non-lab customer storage.
- No 'success' or incremental counters before a verified provider receipt.
- No release or transplant into REDOWN until explicit review of migration/rollback and installed-Chrome acceptance.
