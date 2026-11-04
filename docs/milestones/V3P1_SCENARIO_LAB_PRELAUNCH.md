# Click2Cloud V3+1 — Universal Scenario Laboratory and Pre-Launch Milestones

**Owner mandate · November 3, 2026 · P0 release acceptance contract**  
**Scope:** Click2Cloud V3+1 right-click engine, canonical MenuSpec, native Chrome projection, Glaciaring, actual source capture/transfer, provider handoff, REDOWN integration and rollback.  
**Status:** TARGET PLAN, **not** a statement that these milestones have passed. This milestone must be satisfied **before any public release**, regardless of calendar launch date.  
**Companion source of truth:** [337-case generated behavior inventory](V3P1_CONTRACT_SCENARIOS.json), derived from [the actual 29-section V3+1 condition-to-behavior contract](../V3P1_COMPLETE_CONDITION_TO_BEHAVIOR_CONTRACT.md), alongside [the Glaciaring evidence report](../GLACIARING_EVIDENCE.md). The 337 existing behavioral rows are a **baseline**, not the end of coverage.

## Owner's intent: repeat what worked with REDOWN's Python Universal File API

REDOWN's Python Laboratory previously used a **thin external orchestrator** to exercise REDOWN's **actual Universal File API**, rather than reimplementing the cloud/file engine in Python or clicking through every Explorer operation. The intended data path was **Python command / lab → authorized extension bridge → Universal File API → scoped R2 provider**, with independently checked readback/integrity, structured machine-readable JSON, error classification, and reproducible test scenarios. The distinction mattered: deterministic API/provider conformance could be proved independently of graphical interaction, while browser-dependent behavior still needed separate proof.

**Apply the same philosophy to V3+1:**

```text
Python/CLI/agent scenario orchestrator (thin; repeatable seeds, assertions, reports)
       |
       v
Actual Click2Cloud JS V3+1 engine/API through an explicit test adapter
       |---- Simple / Nested / Depth isolated configs and projections
       |---- Canonical MenuSpec / pure resolver / simulation
       |---- Real Chrome registrar adapter (fixture OR authorized installed Chrome)
       |---- Real Universal File API / existing REDOWN provider transport
       |---- Auth, activation, capture, save, independent receipt, History handoff
       |
       v
Glaciaring: full critical-boundary evidence, missing-signal flags, correlations
       |
       v
Independent oracle(s): golden tree/actions, invariant checks, provider readback,
                    SHA-256 / exact bytes, source/target state, native evidence
       |
       v
Versioned scenario verdict + complete repro seed + accepted regression baseline
```

**No competing implementation of menu behavior, uploader, Worker, auth, History, or existing laboratory.** The lab controls inputs and asserts outputs; the production JS engine/service owners perform the work. Use the existing `tests/run.mjs`, `scripts/demo-glaciaring.mjs`, `scripts/benchmark-glaciaring.mjs` and `scripts/test-native-chrome.mjs` as starting points. A lightweight Python CLI is desirable as an orchestration/agent interface, **not a separate semantics implementation**; it must speak a bounded, versioned JSON-lines or equivalent process contract to Node/authorized extension adapters and perform zero independent provider writes.

## What “every possible scenario” means, without claiming mathematical infinity

It is impossible to enumerate infinitely many filenames, object sizes, site implementations and timings. Instead, require **complete traceability for every declared supported operation, material condition, guard, branch, error code, state transition, menu role and provider capability**, plus generated combinations and boundary variations. The total discoverable space must be **enumerated or explicitly marked UNKNOWN**; never silently declare 100% coverage using only happy-path fixtures.

1. **Contract-row completeness:** Map all 337 existing condition→behavior→proof rows in sections 3–25 to stable case IDs in `V3P1_CONTRACT_SCENARIOS.json`. None may vanish; any contract edit adds or reconciles case IDs and tests. Keep sections 26 (27 illustrative API operations) and 27 (7 acceptance examples) as separately tracked registries.
2. **Code-path completeness:** Source analysis maps each relevant supported branch/state/error code/adapter path to a corresponding scenario or justified explicitly untestable boundary. Reverse mapping flags orphan tests, unimplemented behaviors and catalog drift.
3. **State-machine completeness:** Generate bounded walks through permitted/forbidden mode, auth, activation, native generation, MV3 and save-state transitions; test return to baseline and idempotency after retries/restarts.
4. **Combinatorial coverage:** Pairwise and risk-based 3-way interactions across documented dimensions; exhaustive Cartesian combinations for small critical finite state machines. Add seeded property/fuzz/mutation tests for huge or unbounded inputs.
5. **Regression permanence:** Every new bug receives a stable `BUG-...` scenario, saved minimized seed, before/after evidence and a permanent test. Unfixed failing scenarios remain visible.
6. **Evidence classes remain distinct:** A passing injected-Chrome test, local R2 adapter test or DOM mirror **cannot** close an installed-Chrome or live-provider proof requirement. Record the distinct required proofs per scenario.
7. **Honest outcomes:** `PASS`, `FAIL`, `BLOCKED`, `NOT_TESTED`, `UNSUPPORTED`, `PARTIAL`, `UNKNOWN`; never transform a blocked case into success, omit a failing row, or waive a P0 category for speed.
8. **Release criterion is coverage + correctness, not a raw test count.** 121 existing passing tests are valuable evidence but do not automatically mark any of the 337 source rows PASS until their real assertions and proof class are mapped.

## Pre-launch milestones (order matters; progress must be durable)

| Gate | Milestone / owner deliverable | Exit evidence | Current classification |
|---|---|---|---|
| **M0** | **Inventory & coverage ledger:** derive stable IDs from all condition rows; map 27 illustrative API operations and 7 acceptance examples; link source line, test/oracle, failure class, proof requirements; validate drift in CI | Executable manifest; every declared row accounted for; unmapped rows block gate | **OPEN** — baseline manifest created, runnable coverage verifier not yet implemented |
| **M1** | **Thin scenario driver:** versioned scenario input/output; execute the **real JS V3+1 modules** and trusted adapters with replayable seeds; optional Python CLI wrapper, no duplicated engine/logic | Single command runs a selected scenario and a complete suite; consistent exit codes, JSON + Markdown/JUnit summaries | **OPEN** — existing JS tests/demo are partial foundation |
| **M2** | **Menu model exhaustive laboratory:** generated Simple/Nested/Depth, independent settings, all tree levels, same-name routes across providers, Home/Save-here/separator/overflow, omissions and every action ID | Structural/semantic snapshots + action resolution oracle + lossless pagination + mode-isolation and golden diffs | **PARTIAL** — existing canonical fixture tests; expanded matrix unrun |
| **M3** | **Fault & recovery laboratory:** every critical conditional/negative branch, unauthorized/revoked/stale/error/partial/uncertain cases, independent/cascading faults, sink disabled/throwing and missing checkpoints | Machine-readable fault coverage, accurate Glaciaring traces and gaps; no hidden failures; reproducible failure graphs | **PARTIAL** — current unit-stage fault corpus, no full code-branch proof |
| **M4** | **Durability and concurrency:** current/journal, interrupted Apply, two windows/CAS, restart/worker suspension, safe retry, recovery and rollback; security/permission and redaction properties | Node + real browser storage/restart evidence; exact state/ACK invariants and rollback snapshots | **PARTIAL** — IDB/Node tests, real MV3 suspension pending |
| **M5** | **Provider-neutral File API parity:** real existing Universal File API operations, source bytes, KEEP BOTH, 0-byte/large/Unicode, permissions, paged inventory, provider adapters, staged transfer, exact destination and independent SHA-256/readback | Real API code path; independent result oracles; scope/restriction logs; don't fabricate uncapped support | **PARTIAL** — injected transport/adapter tests, live auth pending |
| **M6** | **Live authorized R2 integration:** existing lab scoped prefixes and optional disposable providers; first-run R2 activation, exact buckets/Worker readiness, read-only Refresh, failed-target retry, actual provider verification, privacy | Approved independent provider object proof + content hash + setup/permission receipts; no unsafe writes | **BLOCKED** — authorized host/session and scoped live acceptance not yet demonstrated |
| **M7** | **Installed native Chrome parity:** real right-click-before-Shelf menus, user-visible order/labels/submenus, native click routes, context filtering, apply/reload/restart/limits and MV3 recovery; Portal mirror never substitutes | Actual installed Chrome evidence vs MenuSpec; repeatable native test fixture and labeled observations | **BLOCKED** — current environment reports unpacked extension administrator restriction |
| **M8** | **Latency and resource correctness:** comprehensive mandatory observation coverage under disabled/passive/debug modes; cold/warm/full/deep/large, short bursts, bounded memory and report export; no false low-overhead claim | Repeated A/B tests with identical scenario corpus, p50/p95/p99, memory, drops, confidence and no sacrificed signals | **FAIL** — existing repeat menu-compilation p95 gate failed |
| **M9** | **REDOWN compatibility & rollback:** preservation of other-provider flat menus, history GO TO/feedback, migration from actual V3, one registrar and auth owner, backup and feature-flagged reversible transplant | Dedicated staging migration + installed Chrome + real provider/History acceptance; rollback passes | **NOT_TESTED** — isolated prototype not transplanted |
| **M10** | **Release evidence audit & sign-off:** finish all required suites, reconcile failures, preserve unsupported cases, inspect coverage drift and sign actual release candidate commit | Immutable release manifest with every gate status, source hashes, run receipts, known limitations, explicit release decision | **NOT_TESTED** — **PUBLIC LAUNCH BLOCKED** |

**Gate labels above are a snapshot of available November 3 evidence, not a claim of comprehensive independent verification.** Codex must keep them synchronized with a generated evidence ledger; do not overwrite historical results or mark a gate PASS merely because a new smoke test passed.

## Scenario dimensions: generate without missing interaction classes

Use the full condition taxonomy in the behavioral contract as the authoritative starting set and expand with a versioned dimension registry:

| Dimension | Minimum equivalence classes / transitions |
|---|---|
| Mode | Simple, Nested/Narrow, Depth; repeated mode switches; separate config revisions and migrations |
| Destinations | none, default only, 2+ siblings, ancestor+child, duplicate label/target, same-named folder in distinct account/provider, default Home |
| Shape | empty, singleton, depth 1/3/10/16+, wide 12×4, 300-node, 1,000-node, unsupported native max/overflow, partial missing child |
| Inventory | complete, paginated, stale, partial, cursor repeated, delayed, scope denied, missing marker, separately updated while editor open |
| Connection | connected, absent, expired, revoked, restricted grant, partial account, entitlement enabled/disabled/unknown |
| Activation & Worker | ready, absent, capability mismatch, deploy pending/failure, partial bucket success, retry-failed, restart, no billing approval |
| Context | image, page, link, video, frame, unsupported source, same image in Portal and Chrome |
| Capture | authorized, broken source, cross-origin/denied, 0-byte, exact binary, large/limit, interrupted, timeout, unresponsive stream |
| Menu registration | unchanged, initial, reorder, callback ACK, failed/lost/delayed ACK, duplicate ID, stale generation, remove/rebuild, service worker cold start |
| Save & provider | exact route, conflicting filename KEEP BOTH, auth races, upload timeout, ambiguous commit, short/extra/mismatched byte readback, independent failure, no blinded retry |
| Completion | receipt verified, receipt mismatch, History handoff pending, no false success, exactly-once counters, failed icon/dot signal |
| Lifecycle | one/two windows, fast repeated saves (10+), restart between any two stages, storage crash, schema migration/rollback |
| Interface | search/autocomplete/parent-sibling-child pills, Apply focus preservation, mode isolation, visual mirror and actual native click |
| Privacy/security | untrusted sender, unauthorized diagnostic read/export, hostile label, raw secret/URL canary, provider provenance exclusion |

**Coverage plan:** all supported atomic cases, all mandatory negative branches, all observed critical edges and states, pairwise interactions, selected 3-way interaction coverage (auth×mode×provider; native generation×revision×restart; inventory×mode×activation; capture×upload×receipt), bounded exhaustive small FSMs, and deterministic property/fuzz campaigns including empty/Unicode/long-path inputs. The coverage report must name untested combinations rather than claiming infinite completeness.

## Programmatic test contract (example; not yet implemented)

A future thin CLI may run:

```sh
# Examples illustrate the required operator experience. These commands do NOT exist yet.
python -m click2cloud.lab run --scenario C2C-S14-cf95513b --seed 20261103 --profile fixture
python -m click2cloud.lab run --suite prelaunch --seed 20261103 --profile fixture --report-dir runs/
python -m click2cloud.lab run --suite native --profile authorized-chrome
python -m click2cloud.lab run --suite provider --profile approved-r2-lab
python -m click2cloud.lab coverage --fail-on-unmapped --fail-on-silent-gaps
python -m click2cloud.lab reproduce --receipt runs/<run-id>/receipt.json
```

Prefer a **single Node service adapter that invokes the real production modules**; a Python process should only coordinate scenarios/assert results and may be omitted if an equivalent scriptable operator interface already exists. Do not require installing two competing runtimes for the released extension. The CLI is engineering-only and read-only by default; real provider writes require separately approved test scope and authorized host identity.

### Required versioned inputs

```json
{
  "schemaVersion": "1.0",
  "scenarioId": "C2C-S14-cf95513b",
  "seed": 20261103,
  "profile": "fixture",
  "engineRevision": "git-sha",
  "initialState": {"mode": "nested", "inventoryRevision": 4},
  "steps": [{"operation": "compileMenu"}, {"operation": "applyNativeMenu"}],
  "inject": [{"boundary": "chrome.ack", "failureCode": "NATIVE_ACK_UNKNOWN"}],
  "assert": [
    {"subject": "native.acknowledgedGeneration", "operator": "unchanged"},
    {"subject": "glaciaring.gaps", "operator": "contains", "value": "NATIVE_ACK_UNKNOWN"},
    {"subject": "providerWrites", "operator": "equals", "value": 0}
  ]
}
```

An actual scenario definition must be validated against real exported operations, authorized adapters and formal schemas; do not treat these illustrative field names as existing source signatures.

### Required results, evidence and reproducibility

For each scenario and each execution profile, store:
- Stable scenario/contract-row ID, mode/provider/account *alias*, source file+line and explicit initial state/seed.
- Exact input, step sequence, expected outcome/invariants and the **real** actual observed result.
- Status, reason codes, failure/uncertainty classification, known gaps and retries.
- MenuSpec digest/diff and desired/generated/ACK/observed evidence as applicable.
- Glaciaring operation/generation/epoch and relevant paged trace/receipt; missing signals explicitly named.
- Source/build/test/fixture fingerprints, run timestamp, OS/Chrome/Node versions, elapsed and resources.
- Evidence class and links to test output, provider verification, independently computed hashes or browser observations.
- On failure: smallest reproducible seed/steps, first observed suspects **and all independent/unknown faults**, permanent regression ID, tracked issue/fix commit.
- Report formats: `summary.json`, `results.jsonl`, `coverage.json`, `failures.json`, Markdown summary, optional JUnit XML. Controlled run bounds and explicit interrupted state.

**No private credentials, original URLs, private filenames, object contents, or personal browsing history in git-tracked evidence.** Use synthetic or approved public fixtures, salted/opaque aliases and user-approved local encrypted evidence when private details are genuinely required.

## Scenario status and release blocking

- `PASS` = proof exists for the scenario **and every required evidence class**, not just unit tests.
- `FAIL` = supported behavior violates the contract, a safety/security/privacy invariant, accuracy, or measured performance.
- `PARTIAL` = some required layers tested but other mandatory proofs absent.
- `BLOCKED` = a named environmental/permission gate with exact minimal owner action and independent work remaining.
- `NOT_TESTED` = scenario not executed with the required fixture/profile.
- `UNSUPPORTED` = explicit product capability limitation with documented expected refusal; **not** a loophole for unimplemented promised features. Unsupported cases must themselves test safe, truthful rejection.
- `UNKNOWN` = incomplete, stale, dropped or irreconcilable evidence; never pass.
- Unexpected output or `UNKNOWN` for safety/critical scenarios blocks release. Each `FAIL` has a permanent reproducible test and is resolved or explicitly remains a launch blocker.
- No blanket waivers, exclusion lists or silent downsampling to meet launch dates. A change to supported scope or a documented limitation needs explicit owner approval and independent compatibility review.
- Every promised P0 behavior, supported transition and mandatory evidence class must reach `PASS` in the release candidate. An environment `BLOCKED` or `NOT_TESTED` for native Chrome/real provider/History cannot be counted as a passed launch gate.
- The programmatic lab proves engine correctness across broad generated scenarios; **a smaller, risk-based but mandatory installed-Chrome and live-provider corpus** verifies integration parity where logical fixtures cannot provide evidence.
- Rerun full regression catalog after any change to compiler, resolver, registration, auth, adapter, persistence or Glaciaring vocabulary. CI fails on a missing previously accepted case or unsupported/unexplained catalog drift.

## Milestone execution policy: no busywork and no false confidence

Implement M0/M1 first and derive acceptance scenarios from the actual source contracts/tests. Do not rebuild the engine, introduce redundant upload stacks, or make an ornamental dashboard to drive a single scenario. Use one automated CLI or API entrypoint to run targeted suites and obtain programmatic outputs, with every boundary queryable through Glaciaring. Tests must check **outcomes and side effects**, not only that telemetry emitted a code.

For initial smoke tests follow the existing bounded laboratory preference: **20–30 representative files, ~30-minute cap and explicit handoff**. Longer exhaustive/stress campaigns run as separate authorized test profiles, not by repeatedly writing customer clouds. No arbitrary production save-size cap should be inferred from a small test-run budget.

**Before public launch**, publish a commit-pinned **Scenario Coverage Certificate** containing the contract/source inventory count, generated scenario count and seeds, statement/transition/branch/error coverage, valid evidence class counts, unresolved and blocked test IDs, real Chrome/provider gate results, performance distributions and a truthful `releaseReady: false/true` decision. The user must be able to inspect precisely **what works, what fails, and what remains unknown** without manually reenacting the entire UI.

## Instructions for Codex / Work

Create the Scenario Laboratory as an **incrementally testable thin layer around the actual V3+1 engine**, analogous to REDOWN's Python Universal File API Laboratory. Add explicit milestone tracking and proof links to every implementation PR. Each new feature must add source-backed scenarios and tests **before** claiming completion. Work through all independently testable gates even if native Chrome or authenticated R2 is unavailable, and mark those as blocked. Preserve REDOWN production as a read-only reference and do not modify live customer objects, production Workers, OAuth consent or billing. **Never hide a fault to improve diagnostic throughput or test counts.**
