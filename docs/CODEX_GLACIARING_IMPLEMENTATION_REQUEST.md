# CODEX — Implement GLACIARING for Click2Cloud V3+1 (P0)

**Repository:** `thanks-cohn/Click2Cloud`  
**Starting branch:** `docs/glaciaring-agent-debug` (the latest specification and corrected owner intent live here; they are not yet on `main`)  
**Reference repository:** `thanks-cohn/REDOWN` — read-only for this work  
**Mission:** Build a **comprehensively inspectable and traceable right-click engine** with a near-negligible, measured hot-path instrumentation cost. Make it easier for Codex and ChatGPT Work to accurately discover the full set of failures and regressions, **never** easier to overlook them. Deliver working code, tests and proof—not more architecture-only prose.

## 0. Preflight and exact document authority

Read, in this order, before making changes:

1. [P0 correction: complete inspectability, NO diagnostic shortcuts](CODEX_BUILD_REAL_V3_PLUS_ONE_NOW.md#p0-correction--complete-inspectability-no-diagnostic-shortcuts-owner-requirement). This takes precedence over *all* earlier efficiency/minimal-traversal wording.
2. [Full V3+1 implementation request](CODEX_BUILD_REAL_V3_PLUS_ONE_NOW.md) and [autonomous runbook](CODEX_AUTONOMOUS_V3P1_RUNBOOK.md).
3. [Glaciaring design seed](V3P1_GLACIARING_AGENTIC_DEBUG_API_SEED.md).
4. [Glaciaring owner intent](references/GLACIARING_MINIMAL_TRAVERSAL_OWNER_INTENT.md) and [canonical menu/convergence owner intent](references/CANONICAL_MENU_CONVERGENCE_OWNER_INTENT.md).
5. [Complete behavioral contract](V3P1_COMPLETE_CONDITION_TO_BEHAVIOR_CONTRACT.md) and [source-backed REDOWN V3 preservation review](../final-review/V3_VS_V3PLUS1_SOURCE_AUDIT_2026-11-03.md).

Treat these as **one contract**: the full runbook retains security and lab constraints; the P0 no-shortcuts correction resolves ambiguous wording; the owner references explain intent. Report irreconcilable contradictions transparently; do not silently discard requirements.

Read the actual current Click2Cloud and REDOWN source, pin commit/blob hashes, and run baseline tests **before** edits. Some described components may still be unimplemented; distinguish actual code from documents. Never mark a conceptual design as PASS.

## 1. Outcome: a programmatic surface agents and humans can fully inspect

All supported critical behavior in the right-click workflow must be queryable from a common, versioned, safe diagnostic surface—not reconstructed from a screenshot or guessed from an inaccessible Chrome context menu. At minimum cover:

`connection → permissions/R2 entitlement → default bucket/Worker activation → provider capability → file API/inventory → Simple/Nested/Depth inputs and projections → canonical MenuSpec → Chrome native registrar → click resolver → source acquisition → SaveIntent → upload → independent provider verification → REDOWN History/feedback → persistence/MV3 recovery`.

Include normal, blocked, failed, uncertain, cancelled, stale, concurrent, partial and interrupted paths. Every implemented operation, state transition and **material error/decision branch** must map to a source-owned signal/reason code, correlation identity and verifiable test. Every menu item at every supported depth must be inspectable along with its omissions, action route and effective applied generation.

The inspectable surface must expose the **entire available evidence** by bounded pagination and transparent completeness/gap indicators. No truncation without disclosure; no artificially shallow traversal; no skipping independent faults just because an earlier fault was found.

## 2. Logical menu first: one canonical MenuSpec, four evidence states

Build the canonical MenuSpec and a shared pure action resolver before any new menu UI. Each ordered row contains stable item ID, parent, sibling index, native type, exact logical label and context, enabled/visibility, branch/save/separator/navigation role, origin mode/provider, reason for inclusion or exclusion, and action identity bound to provider/connection/account/container/prefix. Keep credentials out of models and exported receipts. Distinguish repeated placements of the same action.

Provide:
- Read-only whole-tree inspection and paginated traversal at arbitrary supported depth.
- Bounded omission/ineligibility index with truthful coverage limits.
- Immutable versioned known-good snapshots and structured diffs across generations.
- A human mirror **derived from the identical model**, plus agent-readable schema. Neither surface invents extra menu semantics.
- Shared pure resolution for native menu item ID, mirror selection and diagnostic simulation; simulation causes **zero** provider writes, fetches, History changes or success effects.
- Explicit evidence distinction: **desired** model, **generated** Chrome plan, **ACKnowledged** native API operations, and **independently observed** behavior from installed Chrome tests. A Chrome API ACK cannot prove pixel-perfect rendering; never claim access to hidden Chrome internals.
- Independent Simple, Nested/Narrow and Depth persisted state and tests; unchanged Google Drive, Dropbox, OneDrive flat peers; preserve special Cloudflare default Home save and Native Chrome limitations.

This is the user's **editable logical digital twin**. The agent should be able to produce the intended Chrome menu from the same source-of-truth without the owner re-explaining every nested interaction.

## 3. GLACIARING: broad detection coverage, cheap evidence capture

**Coverage first.** Create a source-backed observability inventory that includes all supported critical operations, material branches, state transitions, failure classes, and external interfaces, including provider adapters added in future. Each inventory row records owner/source anchor, checkpoint(s), typed reason codes, correlation IDs, positive and negative tests, completeness, and any unobservable boundary.

Instrument efficiently: optional injected sink; compact typed values, stable stage IDs, generation/revision/epoch/correlation IDs and bounded per-boundary facts; no ordinary hot-path stack capture, JSON serialization, deep cloning, synchronous disk writes, network telemetry or raw private details. Implement a bounded fixed-size memory buffer plus explicitly marked dropped/evicted/stale/missing observations. The ability to fail-open **as diagnostics** must never change protected authorization or verified-upload business outcomes.

Do **not** suppress or sample away a mandatory critical state/error outcome. Optimize compact representation, allocation, amortized indexing, and deferred query/rendering instead. Treat any proposed signal simplification as invalid if it makes two relevant failure classes indistinguishable.

Separate:
1. **Quiet normal operation:** cheap instrumentation where it passes measured benchmarks; no verbose console spam or diagnostic panels.
2. **Explicit authorized Debug Mode:** inspect complete available map, menu, operation timeline, errors and state transitions.
3. **Deferred failure analysis:** on failure/uncertainty, reconstruct correlated evidence and produce a bounded, paginated, sanitized Agent Debug Receipt outside critical click processing.

A regular user must still receive actual save failure feedback even with Debug Mode off. The instrumentation subsystem is never allowed to perform repairs, mutate cloud resources or silently replay uncertain uploads.

## 4. Correlate, but NEVER shortcut the diagnosis

For a concrete failed attempt, expose all observed relevant dependencies, blocked downstream effects, retries, alternative causes, simultaneous independent failures, and gaps. A likely first failure can **prioritize investigation**, not terminate it. Don't claim the entire module is healthy because a particular boundary emitted green. Don't turn missing data into success. Don't infer cause from chronological proximity.

Return evidence-backed candidate root causes with:
- Exact observed signal IDs and typed status, operation/generation/epoch/correlation provenance.
- Prerequisite and dependent edges, plus independent failures and unknowns.
- Scope, confidence qualification, owning source anchor, related tests and minimal focused reproduction.
- A compact safe export another Codex/Work conversation can consume directly without repeatedly asking for screenshots, logs or temporary source instrumentation.

Prove by adversarial tests: deceptively green parent with hidden failed child, completely absent checkpoint, stale Chrome ACK, drop/eviction, independently broken sibling provider, false provider receipt, incomplete Depth scan, ambiguous write after timeout, MV3 suspension and a failure chain where the last symptom is not the origin.

**No diagnostic pass is allowed when mandatory faults are invisible**; use explicit FAIL/COVERAGE_GAP/UNKNOWN, including after a different problem was already found.

## 5. Minimal but complete agent-facing API

Implement the smallest **stable interface that still exposes the complete supported evidence**. Use the [seed's API v1](V3P1_GLACIARING_AGENTIC_DEBUG_API_SEED.md#agent-api-v1) as a starting point, adjusting its shape only with documented compatibility rationale. Candidate operations: `describeEngine`, `inspectMenu`, `inspectOperation`, `getDiagnosticSnapshot`, `simulateMenuAction`, and structured menu-generation diffs. Require paging/continuations, coverage/gap indicators, typed envelopes, versioning and immutable generation scopes; all diagnostic query and simulation routes are read-only.

Define a safe user-authorized export/hand-off for Codex and ChatGPT Work running outside the user's Chrome process. No anonymous HTTP debugging service, public Cloudflare Worker endpoint, silent cloud upload, privilege escalation, agent bypass of extension sender authorization, or transfer of tokens/source URLs/private filenames in receipts. Protect against hostile labels and secrets hiding inside errors.

Do not build a new general-purpose runtime profiler, duplicate OAuth system, File Explorer, uploader, or History/counter database.

## 6. Use REDOWN's strengths rather than reinventing them

Inspect and **reuse/adapt safely** the existing REDOWN:
- IndexedDB CURRENT, change journal, encrypted backup and desired/applied revisions.
- Resumable bounded folder discovery and versioned inventory, including partial pages and fair bucket budgets.
- One Chrome registrar, callback acknowledgement, menu recovery and MV3 restart pathways.
- Real Cloudflare activation, Worker capability gates and verified R2 HEAD/readback receipts.
- Flat independent provider fragments and one verified completion handoff.
- Existing sanitized runtime/Explorer diagnostic conventions and source/tests.

Do **not** transplant shared Simple/Nested state, activation-driven Depth participation, page-specific privileged sender coupling, or other existing defects. Do **not** modify REDOWN production source. Keep S3 capability and future module evolution provider-neutral: adding an adapter must not require changing Glaciaring's core or rewriting Simple/Nested/Depth.

## 7. Performance is an acceptance gate, NOT an excuse for missing errors

With **identical source-defined critical coverage and fault corpus**, benchmark diagnostics disabled, cheap normal operation and explicit Debug Mode. Report p50/p95/p99 latency for compiled menus, Chrome Apply and click-to-dispatch (separately from network), heap growth, ring occupancy, evictions/drops, receipt size and export latency, and the environment. Use provisional budgets from the seed but replace claims with measured evidence.

If required coverage conflicts with the target latency, **redesign capture/encoding and move expensive work off-path**. Do not silently disable checks, narrow trees, drop hard error cases or call an unmeasured result “negligible.”

**Follow-up execution requirement:** [Codex golden 500→1,000 expansion and engine test contract](CODEX_EXPAND_GOLDEN_500_TO_1000_AND_VALIDATE_V3P1.md). Existing [500-case atlas](milestones/V3P1_GOLDEN_500_SCENARIO_ATLAS.json) is a draft descriptive baseline; it does not establish passed independent golden assertions or native Chrome parity. Preserve coverage, do not inflate counts with trivial variations, and do not allow the compiler to generate its own expected answer.

## New release-blocking M0–M10 milestone: programmatic V3+1 Scenario Laboratory

Follow [the owner-approved Scenario Laboratory plan](milestones/V3P1_SCENARIO_LAB_PRELAUNCH.md) and [its source-derived 337-case inventory](milestones/V3P1_CONTRACT_SCENARIOS.json) **before declaring V3+1 launch ready**. This is analogous to REDOWN's Python Universal File API laboratory: an optional thin Python/agent CLI controls **the real engine through a bounded local/authorized bridge**; independent oracles verify exact MenuSpec/actions, state transitions, bytes/provider receipts and Glaciaring diagnosis. **Never build a second engine, API, uploader, Worker or Explorer merely to simulate success.**

Start by implementing a machine-readable **scenario registry/runner and drift checker**, which map every existing contract condition to exact assertions and required evidence classes. Then implement reproducible state-machine, combinatorial/pairwise and seeded property/fault-injection suites, and permanently capture every regression. Incomplete error/path/branch coverage, a skipped or missing test, and unknown evidence must remain visible, even when another fault is already diagnosed.

A logical/API test can validate thousands of scenarios without clicking through Chrome, but native Chrome behavior, live R2 verified saves, real MV3 recovery, migration/rollback and repeat latency remain separate release-blocking gates. Do not call existing 121 unit tests “337 scenarios passed.” Produce a commit-pinned, machine-readable prelaunch ledger: all scenario IDs, supported operation/branch mapping, profiles, statuses (PASS/FAIL/BLOCKED/NOT_TESTED/UNSUPPORTED/PARTIAL/UNKNOWN), Glaciaring traces, source/test refs, replay seeds, proof type and open blockers. Public launch requires **complete applicable evidence**, not merely a large number of simulated green cases.

## 8. Test and delivery gates

Perform implementation in cohesive steps, each independently testable:

1. Baseline source/test receipts and source-backed coverage ledger.
2. Canonical identity, full MenuSpec/omission tree, pure resolver and golden baselines.
3. Single native Chrome registrar generation proof, restart recovery and read-only mirror.
4. Complete critical-boundary optional instrumentation across the actual modules and provider handoffs.
5. Correlated timelines/causal graphs, gap detection, sanitized receipts and local agent API.
6. Adversarial failure injection; verify error detection and completeness before evaluating investigation efficiency.
7. Browser-native parity, real provider receipt/readback and MV3 integration when environment and previously approved lab authorization allow.
8. Repeated measured latency/memory A/B benchmarks; only then compare whether agents need fewer rounds of debugging.

**Required regression scenarios:** mode replacement without touching other modes; same-name bucket/path in different accounts; full nested row/omission inspection; Home save vs navigation; partial folder discovery; multiple provider leaves; one failed Worker with others active; lost native acknowledgement; stale generation; malformed receipt; two concurrent independent faults; intentionally missing or misleading beacon; diagnostics disabled/throwing; restart with gaps.

For each gate record `PASS / FAIL / BLOCKED / NOT_TESTED` with actual test command/result, source revision, known limitations, and evidence class (unit, integration, installed Chrome, authenticated provider receipt). Existing 26 tests or a Cloudflare Worker Build do **not** certify new live functionality. If unavailable browser, OAuth or billing consent blocks only certain steps, keep progressing on independently testable code and clearly explain the narrow blocker. Never invent successful tests.

## 9. Repository and scope controls

- Commit and push **Click2Cloud only**, on a focused implementation branch based on `docs/glaciaring-agent-debug`. Open a PR or leave a reviewable branch as repository policy allows. Do not transplant/modify REDOWN automatically.
- Keep Cloudflare lab private; read-only compatibility against existing workers outside explicitly approved disposable fixtures; no billing authorization bypass, OAuth impersonation, source URL telemetry, token commits or changes to public access.
- Do not create a second permanent file engine or duplicate the native menu owner. Do not rewrite the runtime wholesale. Implement through compatible seams, narrow adapters and testable modules.
- An agent must not optimize completion statistics by skipping errors or reducing test coverage. Unknown evidence remains visible.
- End with a **concrete agent demo**: supply a readable full menu tree plus a simulated selection, then introduce a cascading failure and independent second fault. Show a truthful, fully inspectable receipt with both failures, all observed evidence and explicit gaps, plus the focused source/tests that a future coding agent should inspect. Finally show measured hot-path overhead.

## Definition of DONE

**DONE** requires: comprehensive covered-and-testable critical state/error catalog; faithful programmatic menu inspection and human/agent equivalence; real desired/generated/ACK/observed separation; detection of masked and independent faults with honest gaps; correct auth/receipt semantics; safe agent handoff; and *measured* low overhead. **Fewer Codex/Work iterations are a consequence, never a substitute for correctness and visibility.**

If a mandatory proof is unavailable, report **BLOCKED/NOT_TESTED** and the evidence missing—never “everything works.”
