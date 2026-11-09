# CODEX P0 — Fix CURRENT Loss and Build the Agent-Native Reliability Ratchet

**Owner directive — November 8, 2026.** Repository: \`thanks-cohn/Click2Cloud\`. Future release brand: REDOWN. **This Markdown document is a future Codex implementation request. Creating it does NOT authorize code edits, Chrome/profile mutations, Cloudflare changes, deployment or automatic data recovery right now.**

## The objective, with no ambiguity

The owner wants Click2Cloud V3+1 to be maintainable by a very small engineering team even if deployed to millions or billions of installations. The more engineering work we complete, the **less debugging each additional feature or regression should require**. Each solved fault must permanently improve our ability to detect, explain, reproduce, prevent and, where possible, safely repair related faults. The system must be deeply accessible to authorized coding agents—every significant subsystem, state transition, boundary, dependency, permission, persistence owner and operation should be **machine-discoverable and inspectable**.

**The priority is to fix the actual product**, not create a new theory, another engine, a separate agent service, a second configuration authority or a cosmetic error-message patch. Maintain one fast, deterministic V3+1 engine with one canonical API. Extend existing CurrentStore, Glaciaring, trusted agent gateway and tests. No bloat, no redesign for its own sake, no unverified claims.

**A thought experiment that must guide acceptance:** If this exact software were installed on one billion computers tomorrow, would ordinary right-click saving, sign-in, settings, Explorer and recovery work *most of the time*? What failures would users face? Could engineers recognize and group those failures, repair them without destroying state, and roll out fixes confidently? Estimate and test what is feasible; **never claim billion-user readiness based on a laptop, simulated environment or a large test count**.

### Required reading before any later implementation

1. \`AGENTS.md\` (latest owner priorities, NO BLOAT, durable saved destinations, Remotes-first/login-only OAuth, strict GUI→API parity, privacy, performance and TRUE REMOTE).
2. \`docs/architecture/PAPER_I_BEYOND_CORRECT_CODE_FIRST_PRINCIPLES.md\`.
3. \`docs/architecture/PAPER_II_ENGINEERING_SOFTWARE_THAT_REMAINS_CORRECT_STANDARDS.md\`.
4. \`docs/requests/CODEX_P0_CURRENT_STATE_LOSS_FORENSIC_RECOVERY_HARDENING_2026-11-08.md\`.
5. \`Issues_and_Bugs/Bugs/P0_CONNECTED_BUT_EXPLORER_SETTINGS_CONFIG_RECORD_MISSING_2026-11-08.md\`.
6. \`docs/evidence/current-recovery/FORENSIC-HANDOFF.md\`, \`verification.json\`, \`docs/evidence/observability-inventory.json\`.
7. Existing source owners: \`src/persistence/current-store.mjs\`, \`src/api/service.mjs\`, \`src/api/service.d.ts\`, \`src/api/gateway.mjs\`, \`src/api/permissions.mjs\`, \`src/core/engine.mjs\`, \`src/chrome/registrar.mjs\`, \`src/core/boundary-observation.mjs\`, \`src/glaciaring/index.mjs\`, \`src/glaciaring/catalog.mjs\`, \`src/glaciaring/agent-api.mjs\`, \`scripts/agent-client.mjs\`, \`extension/background.mjs\`, \`extension/app.mjs\` and their existing tests, source hashes and CI.

**Before implementation**, inspect latest real \`main\` and use a dedicated development branch. Respect current higher-precedence rules where old documents disagree. Do not edit \`thanks-cohn/REDOWN\`, change extension ID, destroy user data or mutate live cloud resources. Future code changes require a separate Codex run; this file alone is not a deployment approval.

---

## 1. The P0 incident you must actually understand and fix

The owner has run safe, **read-only diagnostics in the existing Windows Chrome profile**, not merely synthetic tests:

- Cloudflare OAuth remains connected, but File Explorer and Settings are blocked by \`CONFIGURATION_RECORD_MISSING\`.
- An earlier native Chrome right-click menu exists in \`chrome.storage.local.nativeRegistration.desired\` at **generation 583**.
- CURRENT IndexedDB (\`click2cloud-current-v1\`) lacked \`product\`, \`mode:simple\`, \`mode:nested\`, \`mode:depth\`, \`generation\` and \`configurationIntegrity\`.
- Earlier \`current.read()\` synthesized default generation 0 when configuration/journal/integrity were all absent; the native generation guard then blocked operations. This is the **proven immediate logical defect**, not proof of the original physical deletion mechanism.
- After installing 0.3.14, \`getEngineHealth\` returned \`{state:'completed',code:'OK'}\` for the *inspection call*, but correctly classified the underlying installation as \`ESTABLISHED_MISSING\`, \`ESTABLISHED_BOUNDARY_MISSING\`, storage \`blocked\` with \`CONFIGURATION_RECORD_MISSING\`.
- \`requestRestorePreview\` returned \`available:false\`, \`reason:'EXTERNAL_RECOVERY_UNAVAILABLE'\`, \`provenance:null\`, \`nativeSalvage:'PARTIAL_PROJECTION_ONLY_NOT_RESTORABLE'\`.
- **Newest owner results:** \`remainingRecords:0\`, \`journalCount:0\`, \`checkpointCount:0\`, \`sameOriginDatabaseCount:1\`, \`externalRecoveryState:'BLOCKED'\`, \`externalRecoveryCode:'EXTERNAL_RECOVERY_UNAVAILABLE'\`.

**Therefore: detection is now working, original settings have NOT been recovered, and the original reason they disappeared remains UNKNOWN.** Do not blame OAuth without proof. The generation-583 MenuSpec is partial historical evidence, **not a complete configuration backup**; do not fabricate Simple/Narrow/Depth, hidden, Quick or Default from it. No evidence implies user objects were deleted from Cloudflare. Other *independent* original-profile/backups might still survive outside the inspected origin; do not assume they exist either.

The 0.3.14 recovery work already added provenance fences, atomicity and safe previews. Its reported 275 focused passes, 24 Chromium CURRENT passes and other fixture receipts are valuable but **not actual owner-profile recovery or live R2 acceptance**. Reuse and improve that work. Do not rewrite it.

### 1A. Establish the root cause as far as evidence genuinely permits

Forensic source/history audit across 0.3.12, 0.3.13, 0.3.14 and current HEAD:
- all CURRENT and Chrome-local writers, setup and recovery paths, migrations, IndexedDB open/upgrade/versionchange, transaction errors, journal/checkpoint retention, repair, storage-policy/eviction, extension ID/origin/profile consistency, worker start/termination, native desired/applied/ACK and registration lifecycle;
- every cross-store ordering window where Chrome retains a menu plan while CURRENT lacks configuration;
- earliest *observed/proven* invalid transition, separately from the unknown original physical disappearance.

Produce a source-linked **causal map** and evidence classifications: \`OWNER_PROVEN\`, \`SOURCE_PROVEN\`, \`REPRODUCED_EQUIVALENT\`, \`PLAUSIBLE_UNPROVEN\`, \`RULED_OUT\`, \`UNKNOWN\`. If no surviving trace proves physical deletion cause, **say UNKNOWN** rather than guessing. Preserve baseline reproduction and build a permanent test for the exact combination: **generation 583 + all required CURRENT rows absent + zero journal/checkpoints + OAuth connected**.

### 1B. Hard data-preservation stop

Before any future repair or rebuild in the owner's real Windows profile, the owner must close Chrome and independently preserve a **complete private, verified copy** of the original Chrome User Data/profile (including the extension IndexedDB and Local Extension Settings). Never claim the copy was created unless verified. No private snapshots, OAuth tokens, raw destination paths, account IDs, source URLs or history in GitHub, chat, tickets or telemetry. Test all destructive faults only in disposable isolated browser profiles.

**Forbidden:** deleting/reinitializing CURRENT, \`indexedDB.deleteDatabase\`, \`chrome.storage.local.clear\`, deleting \`nativeRegistration\`, uninstall/reinstall, manually changing generation 583, destroying the old native menu to hide conflict, default \`redown\` creation on login, auto-approving OAuth permissions, Worker/R2 provisioning by inspection, or fabricating recovery.

### 1C. Complete verified restoration, when an independent source survives

Build on existing \`requestRestorePreview\` / \`restoreRightClickMenu\` and canonical recovery owner. Inspect local evidence and user-authorized *actually present* independent backups; validate schema, integrity, origin/account identity, revision, all modes, labels, hidden/Quick/Default and applicable setup state. Detect conflicts/stale snapshots. Preview locally, secure user approval, preserve verified preimage, apply idempotently through one authoritative CURRENT transaction, independently read back, then reconcile the native menu from validated CURRENT and demand fresh actual Chrome ACK. Separately verify true remote readiness/save. Never silently fill missing fields.

### 1D. If original configuration is not recoverable: restore usability honestly

The current reported case has no **validated complete** candidate. Implement the smallest *separate* assisted reconstruction flow through the existing canonical config APIs:
- Read-only *local* preview of what the historical native plan actually proves; explicitly identify missing/unknown semantics.
- Let the owner confirm real account identity, intended target folders, modes, labels, Quick flags, Default and any approvals. Do not invent previously saved choices or permissions.
- Require a private original preimage, a clear exact preview and explicit authorization before any new configuration commit. Do not create cloud resources merely to inspect/rebuild local configuration.
- Result must be clearly labeled \`REBUILT_WITH_OWNER_CONFIRMATION\`, **not** \`ORIGINAL_STATE_RESTORED\`. If safe prerequisites are absent, return \`BLOCKED\`.
- Keep Remotes/login independent; make Explorer/Settings display a humane recovery/rebuild workflow rather than remain unusable indefinitely.
- Original forensic P0 remains open where the data-loss cause remains unproven.

---

## 2. Turn the two architectural papers into enforceable engineering rules

Adopt, without bureaucratic bloat, the five disciplines: (1) explicit/measurable quality attributes; (2) Design by Contract, state machines and invariant checking; (3) authoritative state, durability and verified recovery; (4) FMEA and tested fault containment; (5) independent risk-based release acceptance.

Establish one **machine-readable invariant registry** with stable IDs, source owner, evidence class, affected API/GUI/native surface, failure conditions and exact test IDs. Required examples:
- Established missing state can never be interpreted as fresh.
- No configuration commit without durable atomic boundary and readback.
- No native save or menu clear from unknown/stale CURRENT.
- Login, configured destination, permission, Worker readiness and verified save remain distinct.
- No cloud/remote success claim without independently verified proof.
- No destructive replay after ambiguous outcomes; retries honor idempotency.
- Loss of one subsystem does not poison independent auth or unrelated UI.
- No silent replacement of user destinations, Default or approvals.
- Agent diagnostics cannot mutate product state or impersonate authorization.
- Recovery/rebuild cannot pretend to restore unknown original data.
- New GUI domain behavior must invoke the same canonical API domain owner.

CI must enforce the most critical invariants in actual source/real-IDB/browser integration tests and report unmapped paths. State machine tests must include concurrency, startup, migration, crash, cold reload and interrupted remote operations. Explicitly mark a claim as *not proven* if only synthetic tests cover it.

---

## 3. Deep Agent-Native Inspectability and Control — extend what exists

The owner requires **far deeper than GUI/API parity**. Authorized Codex/engineering agents must be able to deeply inspect and understand every critical mechanism and operation, its state history and the cause/evidence of failure, and to plan and execute approved repairs. Build using **the existing V3+1 toolRegistry/service API, Glaciaring, boundary-observation and trusted gateway**; no new parallel engine, HTTP debug listener, remote admin server, universal token, or separate state authority.

### 3A. Self-describing machine-readable system map

A single versioned, queryable, source-backed **ownership/dependency manifest** for every meaningful operation and critical runtime boundary:
- API method, schema/version, source owner, GUI/native adapters, permission/effect class, business state authority, storage owner;
- inputs, preconditions, expected transition, postconditions, revision/generation/idempotency rules, success/ACK/remote verification evidence;
- dependencies, invariant IDs, error code taxonomy, recovery/support class, corresponding tests/fixtures, build/source hash;
- evidence coverage \`VERIFIED\`, \`PARTIAL\`, \`UNOBSERVED\`, \`EXTERNAL_NOT_TESTED\` and why.

Derive/check it from existing registry/catalog/source declarations rather than creating manual competing truth. Machine-check new operations: missing owner, unknown authorization class, untested critical invariant, outdated source/test path, duplicate domain owner, and GUI-only business logic should fail CI. Include machine-queryable gaps rather than asserting omniscience.

### 3B. Causal flight recorder with low overhead

Extend existing Glaciaring compact ring buffer and boundary-observation to correlate Boot, CURRENT reads/commits/migrations/recovery, auth, permissions, native compile/apply/callback ACK, Explorer, context-menu dispatch, true remote Worker transfer, storage write, independent HEAD verification and history.

Record operation/parent/retry IDs, worker epoch, build/schema, safe revision/generation evidence, stage, dependency, typed outcome/code, timestamps, latency, proof class and declared gaps. Save **minimal high-severity durable breadcrumbs** that can survive MV3 service-worker termination where storage is intact, with bounded volume/retention and clearly reported dropped/expired events. A recorder cannot recreate unobserved history or events erased with all storage; report \`UNKNOWN\`/\`UNOBSERVED\` explicitly. Diagnosing should never delay context-menu paint, produce a false save, or become a new cause of storage failure.

Never log raw user files, page/source URLs, object names, bucket names, tokens, account IDs, filenames, full private MenuSpec or arbitrary raw exception strings into an exported diagnostic artifact. Bounded local private state review may use separately scoped approval; exported support bundles remain sanitized by construction.

### 3C. Complete trusted agent workflow

The same canonical versioned API should let an authorized local agent:
1. **Discover** every critical operation/owner/invariant and report coverage gaps.
2. **Inspect** current configuration health, provenance, native ACK/registration, auth state class, recovery coverage and supported runtime evidence.
3. **Trace** a particular operation and its causal dependencies; distinguish *first observed failure* from actual unknown underlying cause.
4. **Reproduce** an incident as a sanitized synthetic fixture using production modules/real IndexedDB; mark every simulated Chrome/provider boundary.
5. **Compare** behavior across builds, versions and state migrations, with exact changed-source and test linkage.
6. **Plan** a repair/recovery/rebuild dry-run, conflicts and preservation requirements.
7. **Execute** only through existing domain APIs with host-owned short-lived account/method-scoped grants, explicit human confirmation where relevant, idempotency, provenance and rollback/recovery safeguards.
8. **Verify** durable readback, exact native ACK and (when expressly authorized) independent provider success; otherwise return \`BLOCKED\`/\`NOT_TESTED\` without fictional success.

Developers may use deep fault injection and detailed instrumentation **inside isolated/disposable environments**. End-user agents do not get arbitrary browser/OS access merely because diagnostics exist. The capability limitation should be strong authorization and privacy, not hidden/uninspectable domain functionality.

### 3D. One-click user support and issue clustering

Produce a clean **Help → Diagnose → Review report** experience with explicit opt-in sharing. The generated report should contain a reproducible incident ID, product/build/schema, categorized state and failure signature, causal checkpoints, missing evidence, known/unknown cause, recovery readiness and relevant invariant/test IDs—never raw private user content. Tie identical error signatures into grouped incidents so millions of similar failures do not become millions of separate engineering investigations. Do not upload anything without owner approval. Provide user-visible plain-language explanations and a safe next action.

### 3E. Compounding reliability ratchet: each failure pays forward

Build a single durable **Failure Knowledge Registry** integrated with tests (not a second error handling engine). For each confirmed defect:
- stable root-cause signature and invariant owner;
- precise reproduction fixture, including the *previously failing* baseline and the corrected behavior;
- linked source, repair commit and real evidence;
- privacy-safe diagnostic classification and recovery rule;
- CI coverage and explicit deployment/installed-environment acceptance status.

Every production fix MUST add/update the relevant invariant/failure-mode tests and source mapping. CI should detect when an old known case stops being tested, a failure is reclassified as healthy, or observability disappears without an explicit coverage downgrade and review. Do not accumulate thousands of redundant tests; deduplicate equivalent failures, use state/model/property tests and scenario coverage to catch *new interactions*. Agents should spend less time locating architecture and more time reproducing/repairing the actual fault.

---

## 4. Performance, privacy, scaling and the 'one billion installations' design review

Do not design as though every client continuously streams high-detail traces to a central server. Use **local-first, bounded, low-overhead evidence**, severity-triggered breadcrumbs, opt-in redacted support reports, aggregated privacy-safe signatures where explicitly allowed, and reversible diagnostic escalation. Document retention, limits, redaction, access control and deletion behavior.

Measure cold/warm Boot/Remotes, native menu handling, Explorer input-to-paint, save dispatch, persistence read/write and memory/CPU/diagnostic overhead before and after. Include worker suspend/restart, offline/expired OAuth, quota, permission failure, full/partial storage loss and high-count destination menus. Never trade actual verification for speed or claim fixture timings establish Windows performance.

Create a **scale-readiness failure analysis**: assumptions for million/billion clients; client local storage/storage eviction, extension lifecycle, OAuth/provider quotas, R2/Worker rate limits, support cost per incident, privacy, version skew, upgrade rollback and staged releases. Assign confidence to each: \`PROVEN\`, \`SIMULATED\`, \`BLOCKED\`, \`NOT_TESTED\`. Recommend the smallest actual engineering gates that prevent irresponsible release—not premature centralized infrastructure.

---

## 5. Mandatory test and acceptance matrix

**First reproduce** the historical six-record-absent + native-583 + zero journal/checkpoints + connected OAuth scenario against the old baseline using real Chromium IDB, real production modules and synthetic identities. Record expected blocked/detection results after the fix. Verify no unauthorized writes and no source URL leakage.

Cover additionally:
- truly fresh versus established/missing/corrupt/conflicting CURRENT; old schema/embedded config migration; partial checkpoints; lost journal; stale native ACK; conflicting recovery proof;
- transaction aborts at every actual storage boundary, Chrome-local/IDB commit ordering, response loss, quota and blocked IDB, IndexedDB version change, concurrent changes, MV3 service-worker termination/restart, full Chrome restart, cross-version upgrade;
- read-only health/agent discovery/trace/report with ZERO mutations; intentionally missing/evicted diagnostic events must return partial/unknown rather than green;
- complete verified backup recovery, no-backup blocked state, partial native-menu salvage preview, explicit owner-approved rebuild (not restore), second-run idempotency and exact post-recovery menu state;
- OAuth independent of CURRENT failure, no repeated setup or auto resources, permission renewal without losing saved user choices, provider placeholders never pretending saves;
- actual Cloudflare TRUE REMOTE save, independent HEAD/object verification, verified history and GO TO *only when externally authorized*, distinctly reported from synthetic local tests;
- all agent permissions: bad sender, expired/wrong account grant, client-asserted debug scope, prompt-injection-like hostile data, malicious report content, oversized/cyclic traces, privacy redaction bypass, revoked approval, multi-profile and schema mismatch;
- startup performance and menu/Explorer responsiveness, repeated reloads and failure injection without bloated diagnostics.

Separate test receipts by **real Windows installed Chrome, actual browser IDB fixture, dependency-mocked Chrome, provider mock, live authorized provider**. A passing mock is not live acceptance; 275 passing tests are not a billion-system reliability certificate. Provide exact version/build/source SHA and repeatable commands.

## 6. Completion criteria and deliverables

The later Codex run must deliver:
1. **Working changes** in existing owners—not a second architecture—and exact files/commits changed.
2. Root-cause analysis with proven/unknown distinction and full data lineage, explaining why existing tests missed it.
3. Original-state recovery only if actual independent evidence exists; otherwise safe blocked behavior **plus usable owner-approved assisted rebuild** without pretending historic restoration.
4. Source-backed system map/ownership and invariant registry, fully queryable through trusted canonical agent API with visible coverage gaps.
5. Bounded causal recorder + durable critical breadcrumbs + privacy-safe support report + opt-in sharing, with measured overhead.
6. Reproducible incident/failure knowledge registry and mandatory CI reliability ratchet with permanent regression cases.
7. Verified read/plan/authorized execute/verify agent interfaces and adversarial security tests; no broad remote-control surface.
8. Real installed Windows Chrome acceptance plan, stable extension ID, original-profile preservation, actual menu/Explorer/Settings/auth and independent R2 save proof when authorized.
9. A clear **release gate**: \`READY\`, \`BLOCKED\`, \`SIMULATED_ONLY\`, \`NOT_TESTED\`, and known limitations. **Never claim production-ready until external gates truly pass.**

**Highest-priority order:** preserve the user's existing profile → investigate cause and independent recovery → implement safe usable repair/rebuild → enforce persistence invariants → complete agent-native observability and support → build reliable CI ratchet → verify real installed behavior and scale assumptions.

**Success standard:** ordinary operations are boring, fast and dependable; a previously known failure cannot silently reappear without breaking an executable guard; any new failure is identifiable through preserved structured evidence whenever that evidence survives; an authorized agent can locate and explain it quickly; all repair outcomes are honest and verified. **Reliability should compound as the product matures.**

**Document-only instruction for the conversation creating this file:** do not modify runtime files, AGENTS.md, tests or cloud resources. Only add this Markdown request to Click2Cloud. The coding agent implements the task only in a later, separate run.
