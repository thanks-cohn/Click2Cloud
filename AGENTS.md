# AGENTS.md — Click2Cloud V3+1 agent engineering charter

> **P0 OWNER PRIORITY OVERRIDE — /scaffold IS THE END PRODUCT.** Read [the controlling scaffold-first Codex directive](docs/CODEX_P0_SCAFFOLD_FIRST_DEBUG_API_SURROUNDS_PRODUCT.md) and `scaffold/README.md` **before following older instructions**. Build the actual `/scaffold` GUI, composite **Simple + Narrow + optional additive Depth** real native Chrome menu and verified save pipeline. **Build/extend Glaciaring AROUND the real product/engine** as its low-overhead debug/diagnostic interface, not as the product itself or a prerequisite that postpones the product. Older exclusive-mode/minimal-workbench/1,000-tests-first wording is superseded. Maintain security, live-Chrome, OAuth, provider, resilience and honest proof requirements.

**IMPORTANT cross-project guiding architecture:** Read [the Universal Agentic Test Corpus & Pipeline](IMPORTANT/UNIVERSAL_AGENTIC_TEST_CORPUS_AND_PIPELINE.md) before implementing or declaring acceptance of BOOT, RIGHT-CLICK or UNIVERSAL FILE API changes. Its shared scenario kernel, source-owned adapters, independent goldens, complete Glaciaring/BOOT/File evidence, finite-state/interaction testing and permanent regression receipts are the default agentic workflow for Click2Cloud and REDOWN. The mirrored REDOWN document is kept aligned. All release-specific live Chrome/provider/rollback gates remain mandatory.

**Applies to:** all implementation, debugging, testing, integration and release-readiness work in this repository. Read this file **before** modifying code or altering test expectations.

## Guiding principle: real-engine iteration, not manual-click guesswork

The owner wants Click2Cloud V3+1 developed the way the successful **REDOWN Python Laboratory ↔ Universal File API** workflow worked: a thin programmatic controller exercises **actual engine/service operations**, obtains independently verified outcomes, and makes every meaningful user action traceable to the operation that really executes it.

For the right-click engine, the long-term mechanism is:

**1,000 distinct owner-intent golden journeys + an executable Scenario Laboratory + the Glaciaring Agent Debug API = a repeatable, evidence-driven build–diagnose–repair–regression loop.**

This is not a request for 1,000 test names or a second simulated engine. It is a requirement that humans and agents can programmatically exercise the **actual** Simple/Nested/Depth projectors, canonical MenuSpec, item/action resolver, native Chrome registration adapter, source capture, authorized Universal File API/provider handoffs and verification, persistence and History outcome boundaries. The full nested menu is inspectable through stable IDs; any logical click produces observable real-engine state/effects or an explicit safe refusal.

A correct run follows:

```text
Independently specified expected menu/behavior
  → deterministic scenario and action sequence
  → real V3+1 JavaScript engine and authorized adapters
  → independent oracle checks actual menu, action, state and side effects
  → Glaciaring reports all faults, correlations and missing observations
  → focused implementation repair (NOT weakened expectations)
  → replay failure + neighbors + full accepted regression suite
  → durable, versioned proof; repeat
```

**The desired result:** 900+ genuinely verified logical scenarios as a strong intermediate engineering checkpoint, preferably all 1,000, before final Chrome/provider verification. **Never treat 900 as a safety threshold, an acceptable failure budget, a release waiver, or proof of live Chrome/cloud parity.** Every P0 critical/safety/privacy requirement must pass, regardless of aggregate count. A failed/blocked/unimplemented scenario does not count as verified. The objective is productive iteration and truthful outputs, not maximizing a scoreboard.

## Mandatory references and their authority

Read these as **project-defining references**, not optional suggestions:

1. [Owner's executable golden atlas and 500-case baseline](docs/milestones/V3P1_GOLDEN_500_SCENARIO_ATLAS.json): 337 source-derived conditions + 163 additional owner-intent journeys, currently **draft scenarios, not passing executable oracles**. Keep their stable IDs.
2. [Codex expansion and iterative implementation request](docs/CODEX_EXPAND_GOLDEN_500_TO_1000_AND_VALIDATE_V3P1.md): build 500 further **substantively nonduplicate** scenarios, prove novelty, independently author oracles and iterate against the real engine.
3. [M0–M10 prelaunch Scenario Laboratory and coverage gates](docs/milestones/V3P1_SCENARIO_LAB_PRELAUNCH.md): the release-blocking testing charter, status semantics and required evidence.
4. [V3+1 condition-to-behavior contract](docs/V3P1_COMPLETE_CONDITION_TO_BEHAVIOR_CONTRACT.md) and [337-case original manifest](docs/milestones/V3P1_CONTRACT_SCENARIOS.json): normative user-action → real-operation → result/acceptance mapping.
5. [Glaciaring implementation contract](docs/CODEX_GLACIARING_IMPLEMENTATION_REQUEST.md) and [no-shortcuts correction](docs/CODEX_BUILD_REAL_V3_PLUS_ONE_NOW.md): comprehensive critical error/decision coverage, accurate correlations, honest gaps and negligible *measured* right-click instrumentation overhead.
6. [Source-backed REDOWN V3 versus V3+1 audit](final-review/V3_VS_V3PLUS1_SOURCE_AUDIT_2026-11-03.md): preserve proven REDOWN mechanisms; remove coupling and wrong assumptions, not established functionality.
7. [Autonomous V3+1 runbook](docs/CODEX_AUTONOMOUS_V3P1_RUNBOOK.md) and [implementation evidence](docs/GLACIARING_EVIDENCE.md): approved work scope and exact already-proven/unproven claims.

**Contract precedence:** the owner's specific behavioral requirements and approved independent golden outcomes outrank current implementation behavior. Existing known-good runtime invariants and authorization/privacy boundaries cannot be silently weakened. If two specifications conflict or native Chrome cannot express a desired menu, **flag a precise OWNER_DECISION_REQUIRED conflict**, identify options, and continue safe independent work rather than quietly choosing a convenient behavior.

## Agentic testing obligations

- **Actual engine, not a second implementation:** a Python script/agent CLI may orchestrate a bounded Node/extension adapter, but must call real JS V3+1 modules and authorized REDOWN Universal File API owners. Do not reimplement the menu semantics, provider upload, auth, History or Worker in Python.
- **Exact expected model:** each golden test should specify initial providers/accounts/entitlement/Worker/mode/inventory/config, ordered clicks and transitions, the intended full menu or changed subtree + guaranteed unchanged peers, exact action identities and destinations, resulting state and forbidden side effects. A user-facing click must map to a real operation and independently verified outcome or explicit unsupported state.
- **No circular goldens:** do not use compiler/mirror output as its own expected result; prevent auto-updating fixtures merely to turn failures green. Deliberate mutation tests must demonstrate the oracles catch wrong account, incorrect nesting, stale ACK, false receipt, cross-mode leak and missing Glaciaring signal.
- **Coverage before scores:** 1,000 is a target for truly distinct behaviors—not rephrased rows, renamed buckets or inflated seeds. Record nearest comparable case, meaningful new transition/condition/oracle and novelty rationale. Preserve all original cases and failing receipts. Do not silently prune regressions.
- **Continuous evidence:** run the narrow case then related invariants then the complete suite; save reproducible seeds, source/build IDs, observed/expected diffs, Glaciaring evidence, outcome/status and proof class. Track `PASS`, `FAIL`, `BLOCKED`, `NOT_TESTED`, `PARTIAL`, `UNSUPPORTED`, `UNKNOWN` precisely; missing/stale/dropped evidence never becomes PASS.
- **Full fault visibility:** Glaciaring is a cheap, *comprehensive critical-boundary* inspection surface, not an excuse to omit checks or stop at the first suspicious dependency. Retain independent simultaneous failures, cascades, negative branches and explicit unknowns. If low overhead conflicts with coverage, optimize signal layout, indexing and deferred processing; **do not sample away mandatory outcomes**.
- **Boundary of proof:** logical MenuSpec/fixture tests can validate broad behavior without repeated Chrome clicks. Native Chrome registration, click behavior, extension MV3 restarts, live authenticated provider receipts/byte readback, REDOWN migration/History and real latency must receive their **separate actual acceptance proof** before release. A DOM mirror, injected ACK, available Worker or passing `npm test` does not prove these.

## Important engine invariants to preserve

- Simple is flat; Nested/Narrow projects explicitly configured paths and natural ancestors; Depth projects eligible discovered bucket-wide paths to its selected limit. Their configurations, revisions, migrations and projectors must remain isolated.
- Google Drive, Dropbox and OneDrive are independent **flat native leaf entries**. Cloudflare may own its nested submenu. Future S3 providers are independent siblings, never nested under Cloudflare.
- One canonical deterministic, credential-free MenuSpec and action identity, one Chrome registrar/click owner, one authorized provider dispatcher, one verified completion/History handoff. Do not infer a destination from visible labels or silently redirect on stale/revoked paths.
- No actual success indicator/History completion/counter until independently verified provider result. The immediate click acknowledgment is not evidence of successful saving.
- Never expose private page/source URLs, provider tokens, credentials or browsing provenance in diagnostic exports or new byte-upload provider requests; distinguish REDOWN's historical URL-based remote-ingest behavior from privacy-preserving new uploads.
- No unauthorized token use, Cloudflare billing consent, public debug server, mutable customer bucket tests, silent live writes or automatic production transplant.

## Default next steps for an agent

Read current tests and baseline evidence; implement the **scenario registry/runner + independent oracle** first, then expand and map the atlas, perform adversarial iterations and repair source regressions. Keep the source audit and lab fixtures as references. Run installed Chrome/provider tests only in an explicitly authorized environment; mark environmental blockers honestly.

**Do not declare DONE because 900+, 1,000 or 10,000 test executions report green.** DONE requires evidence-backed behavior coverage, critical failure detection, measured low latency, live Chrome/provider parity where relevant, REDOWN preservation/migration and rollback, and a commit-pinned release certificate. Never merge or deploy to `main` without explicit owner direction.
