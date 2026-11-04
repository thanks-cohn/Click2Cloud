# CODEX P0 — Expand the V3+1 Golden Atlas from 500 to 1,000 genuinely distinct scenarios; turn the atlas into real engine acceptance tests

**Repository:** `thanks-cohn/Click2Cloud`  
**Starting branch:** `feat/glaciaring-agent-debug` (or branch HEAD containing the 500-case atlas)  
**Reference:** `thanks-cohn/REDOWN` (read-only; use actual Universal File API patterns, never create a second engine)  
**Status:** Engineering request for a future Codex implementation run; **not a claim the 1,000 scenarios exist or passed**.  
**Core objective:** Make the true Click2Cloud V3+1 right-click engine increasingly reliable and faithful to the owner's vision by combining **independently specified expected behavior**, **programmatic scenario execution**, **complete Glaciaring evidence**, **measured low overhead**, and **real Chrome/provider acceptance**.

## 0. Required reading; authority and source version

Read these documents and current source, not just this prompt:

1. [500-case draft atlas](milestones/V3P1_GOLDEN_500_SCENARIO_ATLAS.json): **337 source-derived behavioral requirements + 163 additional user-journey drafts**. Every row currently requires individually mapped executable assertions. They are *not* 500 verified golden tests.
2. [163 new user-journey drafts](milestones/V3P1_163_ADDITIONAL_USER_JOURNEYS.json).
3. [Source-derived 337-case manifest](milestones/V3P1_CONTRACT_SCENARIOS.json) and [V3+1 complete behavioral contract](V3P1_COMPLETE_CONDITION_TO_BEHAVIOR_CONTRACT.md).
4. [M0–M10 Scenario Laboratory prelaunch gates](milestones/V3P1_SCENARIO_LAB_PRELAUNCH.md).
5. [Glaciaring no-shortcuts implementation contract](CODEX_GLACIARING_IMPLEMENTATION_REQUEST.md), [full V3+1 Codex contract](CODEX_BUILD_REAL_V3_PLUS_ONE_NOW.md), and [autonomous runbook](CODEX_AUTONOMOUS_V3P1_RUNBOOK.md).
6. [REDOWN V3 vs V3+1 source audit](../final-review/V3_VS_V3PLUS1_SOURCE_AUDIT_2026-11-03.md) and actual protected REDOWN source/tests.
7. Existing **real implementation**: `src/core/{engine,menu-spec,action-resolver}.mjs`, `src/modes/`, `src/chrome/`, `src/explorer/`, `src/glaciaring/`, `src/persistence/`, `tests/` and `scripts/`. Pin starting revision and record exact baseline test results.

**Absolute priority:** A test that passes because its expected output was copied from a faulty implementation is worthless. The approved product contract and independently authored behavioral expectations are authoritative; the implementation is the subject under test. Never quietly edit a golden expected result to make a failing implementation appear correct.

## 1. First stabilize and validate the existing 500

- Verify the 337 source case IDs still map to the same underlying contract rows; do not renumber stable IDs.
- Inspect all 163 added drafts and reconcile overlap, contradictions and vague expected outcomes against the source audit, normative contract, Chrome API limits and original user intent. Preserve ambiguous cases as **OWNER_DECISION_REQUIRED**, with explicit alternatives and impact; never invent final UX policy.
- Formalize each case with **initial state**, ordered **user or system actions**, **expected entire logical menu tree and relevant exact action identities** (or exact changed-subtree plus stated unchanged invariants), **expected operation/side effects**, **prohibited side effects**, **failure/uncertainty states**, and **required independent evidence classes**.
- Replace vague terms like “appropriate login state,” “intended tree,” or “valid menu” with executable observable requirements wherever the product policy already exists. Unknown native disconnected-provider presentation stays an explicitly unresolved decision; don't disguise it with a convenient assumption.
- Do not count a row as an *approved executable golden case* until it has an independent oracle, runnable fixture, assertion set, provenance and (where required) real provider/native evidence. The manifest may truthfully contain unapproved/test-unmapped draft cases without being allowed to claim overall completeness.

## 2. Expand 500 → 1,000 without padding or near-duplicates

**Target: 500 additional distinct behavioral scenarios** (`C2C-G501` through `C2C-G1000` or a collision-free stable identity scheme), for a **total atlas of exactly 1,000 descriptive scenarios**. Generate from the actual owner product model and source-backed condition/error/state coverage—not by arbitrary filename, timestamp, bucket name, title, provider substitution or reordered prose.

A new case must **justify its novelty** versus *all existing 500 and the other 499 new ones*. Require at least one documented substantive distinction:

- A different reachable starting **authorization/entitlement/Worker/mode/provider/config/inventory/lifecycle state** that changes a permissible outcome;
- A new or different ordered **state transition** or cross-module dependency (e.g., saved config → changed inventory → pending native apply → click);
- A different exact **menu structure/target/role/ordering/omission/ineligibility** or isolation invariant;
- A different material **error/uncertainty/cancellation/concurrency/recovery** pathway, or an independently failing sibling alongside an earlier fault;
- A different security, privacy, idempotency, verification, History/GO TO or provider-capability **invariant**;
- A proven **boundary condition** (size/Unicode/depth/capacity/same-label account/cursor/restart) with a newly required distinct assertion or failure.

**Similarity alone is not duplication.** Two cases that start with the same providers or include the same click may be distinct when their mutations, expected menus, failure semantics or independent oracles differ. Conversely, renaming the bucket, changing a random seed, reversing synonyms, swapping providers while all relevant semantics remain identical, or rephrasing a previous test does **not** count toward 1,000.

Build a **novelty ledger** per added scenario: nearest comparable case IDs, substantive distinguishing input/transition/expected output/invariant, source-backed relevance, reason it deserves separate acceptance, and oracle/test owner. Perform exact normalized duplicate checks **and** semantic overlap review; output an explicit `DUPLICATE_OR_UNJUSTIFIED` status rather than silently accepting count-padding. Do not optimize for the number 1,000 at the expense of truthful behaviors or reproducible coverage. If only 900 genuinely defensible cases are available, **report 900** and the remaining missing coverage questions—do not manufacture 100 cases.

Coverage domains to explore deeply:
- Connection matrix: zero/one/multiple cloud providers, disconnected vs expired vs partially authorized, changing connection while menu open or worker sleeping, default selected account vs same-named account.
- First use: Cloudflare R2 entitlement state, user-granted enrollment, default redown bucket creation/reuse, partial Worker preparation and independent activation.
- Simple: one direct default leaf; extra destination submenu + separator + Home default-save; user labels, collision/duplicate management and independent mode state.
- Nested/Narrow: actual natural ancestors, configured-only leaves, actionable ancestor **Save here** child, labels at different levels, shared branches, inaccessible paths and autocomplete/pills.
- Depth: selected buckets, bucket-wide discovered folders (including not manually configured), levels 1/3/10/16+, partial/stale inventory, fair limits, overflow/incomplete rows, mode isolation.
- Provider peers: Drive/Dropbox/OneDrive are **flat direct native rows** and independent of Cloudflare mode projections; future S3 accounts are independent provider namespaces.
- Menu lifecycle: canonical desired/generated/Chrome ACK/independently observed, stale/colliding IDs, remove/update/create callback failures, revision races, MV3 sleep/restart and missing browser evidence.
- Click intent: right-click context type, correct provider/account/bucket/prefix/filename, cancel/interrupt, invalid capture, Web/Portal mirror parity and NO fake success.
- File API/transfer: browser-fetched original bytes and minimal metadata, real provider readback, KEEP BOTH, path collision, large file vs actual supported limits, uncertain write and exactly-once History/feedback.
- Persistence: CURRENT revisions, journal, backups, restore without tokens, rollback and REDOWN V3 migration.
- Glaciaring: every material state/error branch, absent/evicted signal, false green gateway, multiple independent failures, privacy/redaction and low-overhead capture.
- Whole-user journeys: combinations of the above in meaningful sequences; use the owner's exact interaction model (click → menu changes → more clickable branches → actual engine action) as the primary unit.

## 3. Build the Scenario Laboratory around the ACTUAL JS engine

Replicate the successful **REDOWN Python Universal File API Laboratory pattern**, not its implementation language as an end in itself. Design a stable, versioned programmatic orchestration surface that invokes current V3+1 JavaScript production modules and authorized provider adapters. Thin Python may communicate with a Node test process/JSONL bridge; pure Node is acceptable if it has equivalent agent-scriptability. No alternate Python implementation of menu semantics, cloud file engine, provider OAuth, Worker, History or native registrar.

For a scenario, the lab must:
1. Construct exact initial state using validated fixture/adapters;
2. Perform the ordered actions against the **real owner modules**;
3. Capture MenuSpec, item/parent/action IDs, all relevant config/inventory revisions and generated vs ACK native state;
4. Traverse submenu rows logically (including all nested depths) using the same action resolver and the real side-effect-free simulation path;
5. Exercise authorized mock/fixture fault injections to prove negative branches and actual effects;
6. Compare **independent expected results** with observed outputs, including things that **must NOT change**;
7. Capture complete available Glaciaring events, gaps, and fault chains without suppressing a second unrelated failure;
8. Report exact PASS/FAIL/BLOCKED/NOT_TESTED/UNKNOWN/PARTIAL/UNSUPPORTED per required evidence class and stable reproduction seed.

Make fixed deterministic 1,000-case golden runs and generated campaigns (e.g., **10,000+ deterministic logical permutations**) separate: the same behavior with 10,000 random seeds is not 10,000 golden scenarios. A run count is never a coverage percentage.

Run fast, exhaustive finite-state tests when practical, pairwise/targeted three-way interactions, state-machine walks, property/mutation and fault-injection tests. Use generated high-volume fixture tests to find new defects; when they reveal a **new material behavior** or regression, promote a minimized, independently reviewed test into the permanent golden atlas.

## 4. Stop agents from grading their own code

- Keep normative scenario source/oracles separate from compiler-generated outputs and captured actual result snapshots.
- Prove that a deliberate single-behavior mutation causes the expected specific golden failure. Do this for mode leakage, wrong account prefix, missing native child, stale generation, false provider receipt, missing diagnosis beacon and ignored independent fault.
- If a changed implementation fails a previously approved oracle, **fix the implementation or flag a legitimate changed requirement for owner review**. Do not auto-update goldens.
- Keep an append-only regression history and old failing receipts; new green results do not erase a previously reproduced failure without a passing rerun on the corrected code.
- Explicitly report the full ratio: **coverage of declared requirements, actual mapped tests, implemented logic vs simulated fixture, native Chrome verification, authenticated R2/provider readback and History parity**.
- Codex/Work must never remove scenarios, weaken assertions, suppress errors, sample away mandatory observation signals, or relabel BLOCKED/UNKNOWN as PASS to satisfy output or latency goals.

## 5. Proof hierarchy and release gates

1. **Logical fidelity:** deterministic menu models, independent configs, pure resolver and exact action identity in 1,000 described golden cases; scenario runner maps and executes as many as genuinely implemented with independent assertions.
2. **Adversarial reliability:** comprehensive fault catalog with truthful missing observations, independent faults, no unauthorized writes or false success.
3. **Real Chrome:** installed-browser registration/click parity across representative mode/profile changes, service worker recovery, native limits and visual/native constraints. A web mirror or injected ACK is **not** a real native click.
4. **Real authorized providers:** disposable scoped R2/provider tests under explicit authorization; verify actual destination object and content bytes/hash, token scopes, rollback/reconciliation. Existing Worker bindings or a token do not establish provider permission.
5. **Preserved REDOWN:** other providers' flat leaves, Shelf/History GO TO, stored configurations, one shared service owner and reversible legacy V3 migration.
6. **Measured low overhead:** repeat A/B p50/p95/p99 compilation, registration and click-dispatch under **identical mandatory instrumentation**, including the existing failed compilation latency gate. A first-pass benchmark is insufficient if its repeat fails.

Create a versioned, commit-pinned **Scenario Coverage Certificate**: `allDeclaredRows`, `approvedGoldenCount`, `runnableGoldenCount`, `passedByEvidenceClass`, `generatedCases`, `detectedFaults`, `unobserved`, `blocked`, `nonduplicateNewCases`, `performance`, `nativeChrome`, `liveProvider`, `migrationRollback`, `releaseReady`. **No public launch** if mandatory cases or integration gates remain unverified.

## 6. Iteration / delivery instructions

- Work on a focused branch from the latest `feat/glaciaring-agent-debug` commit. Commit cohesive, reviewable steps; preserve the 500-case source atlas and original case IDs.
- First audit/normalize 500 descriptions; write novelty/scope schema, independent oracle design and scenario registry validation; then write the **500 meaningful new cases** and run duplicate checks.
- Next connect the runner to **existing** JS mode modules, menu compiler, registrar fixtures, engine and Glaciaring. Do not rebuild a second engine or defer execution indefinitely behind more docs.
- Implement incremental test suites. Fix defects through narrowly owned source changes; re-run relevant golden/regression/fault suites after every correction, then the full suite.
- Continue independent tests if native Chrome or authorized cloud credentials are unavailable; mark those exact gates BLOCKED/NOT_TESTED. Do not bypass administrators' Chrome policies or OAuth/billing consent.
- Use reference REDOWN code read-only; no production deployment, cloud billing, unsolicited OAuth, broad live mutations or auto-merge to main.
- Finish with a human-readable menu walk-through from the golden atlas, real scenario-run examples, novelty ledger, precise run counts, failed cases, Glaciaring receipts, measured latency, and a **truthful readiness verdict**, including all owner decisions still unresolved.

## Definition of success

The deliverable is **not “1,000 passing test names.”** It is a faithful, versioned **right-click behavioral constitution**, with up to 1,000 demonstrably distinct golden journeys, automated verification against the actual engine, complete diagnostic traceability, regression protection, and remaining real-world gates explicitly visible.

**Goal: make the final V3+1 engine more correct, more modular, more predictable, easier to test and harder to regress—without adding right-click latency.**
