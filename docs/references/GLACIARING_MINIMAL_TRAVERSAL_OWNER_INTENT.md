# GLACIARING — Owner's clarified principle: minimal traversal, strategic diagnostic coverage

**Status:** Owner-intent reference for V3+1 design. Not an implementation claim.  
**Scope:** All important interfaces the right-click engine interacts with, including external providers and browser registration.  
**Relationship:** Complements [the Glaciaring API seed](../V3P1_GLACIARING_AGENTIC_DEBUG_API_SEED.md) and [the canonical menu/convergence reference](CANONICAL_MENU_CONVERGENCE_OWNER_INTENT.md). Preserve existing REDOWN mechanisms where viable.

## Mandatory correction: complete coverage is the premise

**This reference must NEVER be used as permission for an AI agent to cut corners.** The owner's intent is to create a **complete programmatic inspection surface** for supported V3+1 critical operations, states, failure paths, menu structure, context menu actions and external boundaries, so that reliable evidence is cheap to *access and interpret*. Reducing investigation time is **not** the same as reducing instrumentation coverage, tests, queries needed to verify a diagnosis, or fault detection.

- **Prioritize fidelity and coverage:** Cover every supported critical boundary, state transition, error class and relevant independent path. One compact checkpoint may represent multiple operations **only if it still distinguishes the failures that matter**. Add signals when ambiguity would hide a fault.
- **Every failure must remain discoverable.** Never hide, suppress, relabel, sample away or silently omit a mandatory error to lower overhead or make a dashboard look clean. Missing observations must be explicit UNKNOWN/COVERAGE_GAP.
- **No premature root cause:** An initial failure beacon helps navigate; it does not authorize excluding unrelated defects, skipping other required checks, or declaring a root cause without corroboration.
- **Efficiency is downstream:** The programmatic map, indexing, correct codes, canonical MenuSpec, error correlation and bounded export save agent labor. Debugging-efficiency comparisons are valid **only after** coverage and accuracy are independently established. An agent cannot pass by inspecting fewer files or doing fewer runs if it missed a supported defect.
- **Performance is a simultaneous design constraint:** Compress/encode signals, use bounded memory, cache indexing and defer rendering/serialization outside the hot path, **not** fewer essential observations. If latency budgets conflict with comprehensive coverage, improve the method or report an unmet gate rather than weakening fault detection.
- **Full access when requested:** A query can paginate or progressively retrieve evidence, but must expose the complete currently available trace, menu tree, omissions, failures and gaps, without silent cutoffs.

Read the [P0 no-shortcut Codex correction](../CODEX_BUILD_REAL_V3_PLUS_ONE_NOW.md#p0-correction--complete-inspectability-no-diagnostic-shortcuts-owner-requirement) as the overriding implementation contract for any wording below that might sound like an optimization target.

## 1. The precise meaning of Glaciaring

**Glaciaring is primarily about reducing diagnostic traversal and repeated engineering work.** It does **not** mean generating an exhaustive deep trace of every execution or running an expensive causal-analysis engine continuously.

The owner's analogy: *We do not need to travel to the bottom of a glacier to know something is happening beneath it.* Just as smoke can identify where to investigate for fire, inexpensive strategically placed signs can reveal which region of an engine warrants closer attention.

**Design objective:** Make **every supported critical behavior and fault class programmatically inspectable through appropriately sufficient cheap signals**, while minimizing the runtime cost and effort required to retrieve/interpret those signals. Allow a human, ChatGPT Work, or Codex to narrow the suspected failure region before reading thousands of lines, adding temporary logs, or repeatedly reproducing the issue. This reduces unnecessary Codex/Work runs.

Glaciaring is successful when a diagnostic question like **“Why did my right-click save fail?”** quickly yields:

- A concise map of last observed states at significant boundaries.
- Which prerequisites were observed to pass, fail, block, or remain unknown.
- The earliest **observed** suspicious boundary in the relevant action chain.
- The modules or operations that should be examined next.
- A short explanation of why unrelated regions are less likely to be responsible, not falsely declared flawless.
- The smallest relevant code/test/source anchors and safe reproduction inputs.

**Guarantee complete critical-boundary fault visibility with efficient encoding and retrieval.** Reduced investigation is a consequence—not an objective that may be achieved by skipping checks.

## 2. Coverage is about important boundaries, not lines of code

The owner used **90% coverage as an illustration**: even a map of most meaningful interactions would shrink the area where faults can hide. **90% is not a proven measurement or permission to ignore the remainder.** Aim for complete coverage of the *critical boundaries*, with transparent gaps and an expandable catalog.

An individual signal may cover an important gateway for hundreds of internal functions. Conversely, 90% source-line coverage with no meaningful boundary statuses can be nearly useless for fault localization.

Coverage model:

| Boundary class | Example inexpensive signal | What it narrows |
|---|---|---|
| Connection and authorization | `authCheck: verified / revoked / unknown` | OAuth/session vs engine logic |
| R2 enrollment and bucket activation | `activation: ready / partial / blocked` | Provisioning vs menu presentation |
| Worker capabilities | `workerCapabilities: compatible / mismatch` | Binding/version vs dispatcher |
| Universal File API and adapter | `list: ok / partial / timeout` | Provider listing vs projection |
| Inventory | `scanRevision, coverage, completeness` | Stale/unfinished tree vs mode error |
| Simple, Narrow, Depth projector | `projection: ok, revision, outputCount` | Which mode changed its expected output |
| Menu compiler | `specDigest, invariantResult` | Intended structure vs registration |
| Chrome registration | `desiredGen, ackGen, applyOutcome` | Plan vs acknowledged native API |
| Click resolver | `selectedAction, resolveStatus` | Wrong route vs source capture |
| Source capture | `capture: ok / denied / unsupported` | Source acquisition vs destination |
| Upload / verification | `upload: pending / uncertain / verified` | Network/commit vs receipt |
| History / feedback handoff | `completion: committed / skipped` | Verified save vs presentation |
| Persistence and MV3 lifecycle | `revision, workerEpoch, recoveryStatus` | Cross-window races and restart gaps |

These are **boundary examples**, not a demand for one log statement for every function. Newly added S3 adapters or independent modes should register the same sparse categories without changing the observability core.

## 3. The sparse signal principle

An acceptable normal-path signal can be a tiny enum/integer value plus a correlation/epoch/generation identifier when needed; it need not capture full arguments, stack traces, objects, timing strings, URLs, or Cloudflare responses.

Three cost tiers:

1. **Always-cheap observation:** Tiny, bounded, coarse-grained state counters/flags or ring-buffer breadcrumbs at truly critical boundaries, if benchmarked overhead is acceptable. This must not block business operations.
2. **Debug Mode / diagnostics on demand:** Show localized status, recent typed events, module maps, bounded timelines and source/test anchors. These must be accessible only through explicitly authorized diagnostic interfaces.
3. **Failure escalation:** On a definitive failure or uncertain write, preserve all relevant **already-sanitized** observable facts and explicitly mark missing observations; construct a bounded, complete-within-scope graph or paginated receipt *after* latency-critical work. No unrestricted capture or automatic network probes.

**Debug output should not appear in the ordinary product UI or flood the console.** In non-debug operation, short-lived internal signals may exist if inexpensive; detailed output, exports, panels and console rendering are gated by Debug Mode or direct authorized debugging. Critical user-facing failure notices remain available independently of Debug Mode—don't hide an actual failed save from a user merely because diagnostics are off.

Keep instruments optional and fail-open *as observations*. A failed instrumentation sink must never break a valid save. Business authorization and verification gates remain fail-closed.

## 4. Minimal-traversal diagnostic algorithm (conceptual)

Given a failed action:

1. Start with the concrete failed operation, not a global exhaustive system scan.
2. Read the relevant cheap boundary map for that attempt/generation/worker epoch.
3. Ignore unrelated modules unless there is a relevant dependency edge or shared failure evidence.
4. Walk **backwards over documented prerequisites** and **forwards over dependent blocked effects** to locate candidate origins while maintaining visibility of independent and sibling faults; an early failure is a lead, never proof the rest can be skipped.
5. If a prerequisite has no evidence, label it **UNKNOWN**; escalate instrumentation or a focused test only for that gap.
6. Distinguish **origin candidate**, **cascade symptom**, **independent simultaneous fault**, and **observation gap**.
7. Produce a narrow explanation, a source/test anchor list and the next highest-value diagnostic question. Never assert causation from clock order alone.
8. Save a sanitized, bounded receipt so the next agent can start from the discovered boundary, not redo the full investigation.

### Illustrative example

```text
AUTH OK → MENU SPEC OK → CHROME ACK OK → RESOLVE OK
                                            ↓
                               WORKER CAPABILITY FAILED
                                            ↓
                                   UPLOAD BLOCKED
                                            ↓
                               HISTORY SUCCESS SKIPPED
```

An agent begins at the **Worker capability boundary** rather than rewriting Simple, blaming Chrome or inspecting all of History. The preceding checks narrow its first investigation; they do not certify that every line in those modules is perfect.

## 5. Performance, visibility and measurable success

Evaluate Glaciaring by **diagnostic travel saved**, not the total number of log records:

- **After comprehensive fault detection is demonstrated**, number of modules/source files an agent must examine to locate a known injected fault.
- Number of additional instrument/reproduce cycles and Codex/Work interactions required.
- Median/p95 time to identify the first relevant boundary (controlled fault suite).
- Coverage of critical boundary and state-transition categories, with explicit unknowns.
- False attribution rate: how often a candidate cause was confidently misidentified.
- Hot-path latency delta, memory budget and dropped-event counts with diagnostics enabled vs disabled.
- Ability to diagnose cascading *and* unrelated simultaneous failures.

Provisional performance numbers in the [Glaciaring seed](../V3P1_GLACIARING_AGENTIC_DEBUG_API_SEED.md) are **targets to measure**, not proven characteristics. Optimize checkpoint placement instead of indiscriminately increasing logging.

## 6. What Glaciaring is NOT

- Not 90% of source lines filled with `console.log`.
- Not a full deep trace or stack capture for every normal right-click.
- Not a cloud telemetry service or a reason to transmit users' browsing data.
- Not a permanent, verbose debug console visible to ordinary users.
- Not an extra independent Worker/activation/file-transfer/History implementation.
- Not a guarantee that a green checkpoint proves an entire module correct.
- Not autonomous unapproved code changes or infinite repair loops.

## 7. Implementation acceptance (future Codex)

- Inject one fault at each important boundary; a local diagnostic query should identify the earliest **observed** failed dependency with useful coverage and bounded query work.
- Inject two independent faults and one cascade; the graph must not collapse them into one invented cause.
- Disable diagnostic instrumentation entirely; menu, activation, capture, saves and History must still behave correctly.
- Benchmark high-frequency right-click gestures and large/deep menus; enforce near-negligible incremental overhead against uninstrumented baseline.
- Demonstrate that normal mode does **not** print debug records into the console/UI, while explicitly authorized Debug Mode can inspect them.
- Remove a checkpoint deliberately; the report must show **UNKNOWN/coverage gap** instead of a green inference.
- First establish equivalent or better fault-detection completeness/accuracy with and without Glaciaring on the same full fault catalog; **only then** compare agent investigation time/work, never accepting fewer inspected paths as a substitute for correct diagnosis.

**Owner's non-negotiable summary:** *Everything important should be available for immediate programmatic inspection and every critical error should remain detectable. Tiny strategic signals make evidence easier and faster to interpret, without skipping anything or increasing right-click latency.*
