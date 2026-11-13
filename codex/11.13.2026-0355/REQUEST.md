# CODEX REQUEST — Canonical Logic2Real Audit, Scorecard, Depth UI Module, Cloudflare Provider Exception

**Requested:** 2026-11-13 03:55 America/Chicago  
**Target path:** `codex/11.13.2026-0355/REQUEST.md`  
**Repository:** thanks-cohn/Click2Cloud  
**Starting branch:** `codex/logic2real-depth-save` (published Depth/Save repair, originally `bd8da5e`)  
**Disposition:** Work on an isolated branch; **DO NOT merge to main** without explicit user approval.

# 0. Mission and critical boundaries

Perform three coordinated but distinguishable workstreams:

1. **Depth Destinations Manager UI:** isolate its styles in a dedicated, scoped CSS module and upgrade its layout to a beautiful, intuitive, professionally standardized system of compact controls, spacing, alignment, clear labels and accessible interactions. The oversized eye and trash buttons are a reported defect. Treat CSS flex stretching as a hypothesis to verify, not as a proven diagnosis.
2. **One narrow native-menu exception:** remove the generic **“Save here” immediately inside the Cloudflare provider flyout** beneath REDOWN, where it appears alongside configured options, **without altering other destinations or right-click logic**. A “Save here” under a *named bucket or actual folder* remains valid and must stay. Carefully disambiguate parentage and actions by identity, not merely matching text.
3. **Whole-system Logic2Real canonical specification and audit:** extract **ALL** relevant rules governing the right-click menu and its configuration, display, persistence, application, routing, saves, failure states, authentication, concurrency, and recovery. Standardize Intent → Implementation → Reality → Discrepancy for every rule. Include a **quantitative Logic2Real score** with explicit metric definitions, weights, evidence quality, uncertainty and before/after comparisons.

Existing Depth projection and shared Save functionality are reported to work well; do not accidentally regress them. Preserve the exact provider/account/connection/bucket/prefix identity of every remaining action.

**Priority:** protect user-visible functionality; do not “fix” a visual anomaly by changing unrelated business logic. No rewrites for their own sake. Do not silently alter Simple, Narrow, Flat, Default, Quick, or inter-provider semantics. Do not push a merge to main.

# 1. Mandatory repository orientation / baseline

Read before touching code:
- `AGENTS.md` and relevant nested instructions.
- `architecture/depth.md`, `architecture/README.md`, `architecture/debug.md`.
- `Issues_and_Bugs/Bugs/P2_DEPTH_VISIBILITY_DELETE_BUTTONS_OVERSIZED_2026-11-13.md`.
- The prior logic2real Depth audit and reports, where present, including `AUDIT.md` and any files linked by it.
- `extension/app.mjs`, `extension/app.css`, `extension/app.html`, `extension/background.mjs`, `extension/manifest.json`, `scripts/build-extension.mjs`.
- `src/core/menu-spec.mjs`, `src/core/composite-menu.mjs`, `src/core/menu-compiler.mjs`, `src/core/menu-identity.mjs`, `src/core/menu-provenance.mjs`, `src/core/engine.mjs`, `src/core/action-resolver.mjs`, `src/core/save-dispatcher.mjs`.
- `src/chrome/registrar.mjs` and related application/acknowledgment/recovery infrastructure.
- Tests and docs for Simple/Narrow/Depth, default, menu visibility, user gestures, routing and restart; locate relevant callers automatically. Never assume these are the only files or rules.

First record branch/HEAD, build artifact identity/version, extension ID/redirect (without secrets), dirty files, and a baseline test inventory. Do not discard local evidence or overwrite user changes. Trace exact call paths from Manager input → draft → Save → storage/revision → compiled menu → Chrome menu creation → click identity → save dispatcher → actual R2 target → history/status. Trace failure and restart paths separately.

# 2. Workstream A — Beautiful standardized Depth Destinations Manager

## Symptoms and concrete hypothesis

Depth visibility (eye) and trash controls look disproportionately large while Simple and Narrow look properly proportioned. Current manager markup uses a `.dest-row .controls` flex container; Depth adds a taller `<label>Depth <input type=number>…</label>` next to icon buttons. Global label margins, block input and width rules, wrapping, and default flex cross-axis stretching may explain inflated buttons. Verify using DOM rectangles and computed styles in real Chrome. Do not claim causation merely from static inspection.

## Build the CSS module

- Create a **dedicated Depth Destinations Manager stylesheet** e.g. `extension/depth-destinations.css` (final name according to project conventions), with explicitly scoped selectors based on a Depth tab root/class. Register in extension HTML and `scripts/build-extension.mjs` so rebuilding produces the correct `dist/click2cloud` artifact. Check packaged CSS presence and loading, not just source.
- Scope all visual rules so Simple/Narrow and unrelated explorer, dialogs, provider flyouts and popup styles remain untouched.
- Make consistent row spacing, typography, bucket/account identity, secondary path, action alignment, icon sizes and button dimensions. Adapt gracefully for narrow modal/shelf widths, long labels, many rows, input focus, keyboard interaction, hidden destinations, pagination, disabled states, zoom, and responsive wrapping.
- Group each Depth bucket's **maximum depth** label and numeric control clearly, without inadvertently growing the visibility/delete buttons. Constrain input width and label margins intentionally. Keep sensible accessible pointer/keyboard targets, focus-visible, screen reader labels.
- Prefer visual language/components from existing well-proportioned Simple/Narrow controls. The result should feel unified, not like a separate unrelated redesign. Aesthetic aims: beautiful, clear at a glance, compact without crowding, standard rhythm, obvious control meaning.
- Preserve draft-vs-committed changes, explicit shared Save, retry/ack status, hidden state, selection identities and all button actions. Do not accidentally save drafts when clicking an eye, remove, edit, page, or modal control.
- Provide before/after screenshots and computed-style/rectangle comparisons for Depth vs Simple/Narrow; demonstrate actual correction of inflated eye/trash dimensions. Include at least narrow and normal widths, expanded list, long bucket name, keyboard focus and high zoom. If browser is blocked, report **unverified** not passed.

## Acceptance

Depth eye/trash remain compact and aligned across row/input variants; nothing stretches unintentionally; controls remain usable; style module is in build; existing behavior fully retained; screenshots prove improved layout.

# 3. Workstream B — Extremely narrow Cloudflare “Save here” exception

## Precise user rule

In the right-click menu:

```text
REDOWN
  Cloudflare >
    Save here      <-- REMOVE ONLY THIS ambiguous provider-immediate generic action
    [configured choices ...]   <-- PRESERVE
```

Do **not** globally remove “Save here”. The following remains correct:

```text
REDOWN > Cloudflare > [identifiable bucket] > Save here
REDOWN > Cloudflare > [identifiable bucket] > [folder] > Save here
```

The user does not want a generic provider-level save action, because **Cloudflare is a provider, not an R2 bucket or folder**. Do not change the semantics of any valid nested save; do not alter Direct/one-destination optimizations or Depth nesting unless strictly required to enforce this one exception. Check real behavior in Chrome before deciding which row is offending. Distinguish a provider-immediate action from the single-bucket Depth root action whose bucket label may have been flattened for presentation: ambiguous routing/identification must be audited explicitly, and a uniquely configured target must not silently disappear.

## Implementation protocol

1. Reproduce and capture the exact menu. Identify the offending row by `parentId`, `id`, `role`, `origin`, `placement`, `target`, `presentationId`, configuration provenance and action mapping. This is essential: a literal label search is not enough.
2. Determine whether it originates from an old compiler, current composite projection, Depth root flattening, default/Home alias, or another source. Describe which exact rule creates it and why.
3. Add an explicit, centrally documented, narrowly scoped menu-composition/presentation rule. Suppress **only** the immediate child `Save here` beneath Cloudflare when that entry is a generic provider-level save action. Preserve all other menu entries, including real folder “Save here” actions and valid configured root choices. If ambiguity would strand an otherwise unique destination, introduce a minimal **identifiable bucket-target presentation** rather than deleting access to that destination. State any such unavoidable tension and obtain evidence; don't silently change behavior.
4. Never delete a saved destination configuration, default mapping, bucket scope, folder path, saved depth, or actual R2 object. The exception is about displayed actions, **not data deletion**.
5. Maintain exact target identity and stable menu-click IDs for surviving actions insofar as possible; compare before/after leaf action identities and target lists. If any target reachability changes, report it as an explicit failure needing review.
6. Test single bucket, multiple buckets, no folders, first-level children, multiple nested folders, same-named folders across buckets, mixed Simple/Narrow/Depth, Default/Quick, Show toggles, flat-provider handling and folder refresh, including hidden / unavailable targets.
7. Assert by structural parent ID, not merely whether the label “Save here” exists somewhere. Regression tests should prove there is no forbidden Cloudflare-immediate generic child **and** nested Save here entries still exist at each valid branch.
8. Compare actual Chrome registered rows and live right-click screenshots with the expected menu; actual clicks must save to exact target identities when authorized. Preserve or document failed/blocked cases honestly.

## Acceptance

Cloudflare's immediate submenu no longer exposes the unqualified provider-level “Save here”. All configured alternatives and valid nested actions are present and functional; menu order, labels (other than necessary exception), routes and default/quick behavior unchanged; no new logic2real discrepancy.

# 4. Workstream C — Extract the COMPLETE Logic2Real rulebook

**This is a systematic source-to-reality audit, not merely a summary of the two repairs.**

## Scope: inventory every right-click rule

At minimum include:

- Browser entry point, context eligibility (image/link/video/audio/page), permissions, Chrome API capabilities/constraints, provider ownership/labels and the REDOWN root.
- Mode settings: Simple, Narrow/`nested`, Depth per bucket, Flat; independent/additive Show flags and provider visibility; exact exclusivity or non-exclusivity from authoritative source. Describe undocumented legacy disagreements rather than assuming a winner.
- Configuration management: create/update/delete, explicit shared Save, draft isolation, defaults, Quick, aliases/custom titles, visibility eye, per-bucket depth, independent buckets, paging, error feedback, validity and scope.
- Menu projection: deterministic ordering, root/provider nodes, leaf vs branch, maximum depth, one-bucket vs multiple, empty vs failed inventory, nested children, “Save here”, immediate Cloudflare exception, root actions, duplicate names, collision resolution, fallback/default/Quick and flattening/one-choice optimization.
- Application: compiled spec/generation/revision, menu clearing/creation, asynchronous races, Chrome service-worker lifecycle, persisted desired vs acknowledged applied menu, retries, stale generations, stale snapshots, menu rehydration after restart.
- Click: menu IDs, exact target ownership, dispatch, multiple accounts/buckets/duplicate prefixes, direct/indirect actions, provider-action vs save action, disabled/unavailable entries, source capture/URL validation, credentials/auth, retries, successful upload, R2 object key derivation, readback/history/counters, failure reporting.
- Resilience and security: Cloudflare authorization, expired tokens/reauth prompts, worker unavailable, popup/shelf fallback, “headless zombie” goals versus browser-enforced limits, invalid/incomplete inventories, crash/restart, offline/latency/race, do not leak credentials. Distinguish implemented guarantees from aspirations.
- Accessibility and presentation: visible labels and disambiguation, nested semantics, action discovery, consistent UI treatment, keyboard where applicable, icon/status semantics.
- Relevant external multi-provider influences, when those affect the REDOWN context menu.
- Backward-compatibility, migrations, older documentation contradictions, test fixtures, known Simple/Narrow issues and other open gaps.
- Add any further rules uncovered; **“not limited to these”** means exhaustive discovery, not merely copying this list.

## Standardized canonical rule record

Each rule gets a stable, versioned identifier (e.g. `L2R-MENU-001`), status and the following fields:

```yaml
id: L2R-MENU-001
category: rendering | configuration | routing | resilience | security | ...
priority: P0 | P1 | P2 | P3
source_of_intent: [exact docs/user instruction and precedence/ambiguity]
intent: [plain statement, unambiguous invariant]
preconditions: [state, selected modes, inventory, authorization, context]
input_scenarios: [fixture IDs with account/bucket/prefix/depth]
expected_menu: [exact hierarchy, labels, roles, ordering, click target]
expected_state: [draft/persisted/applied]
expected_click_result: [provider/connection/account/bucket/object prefix]
implementation_trace: [file:function:line or stable symbol, transformations]
observed_simulation: [test name, result, evidence]
observed_live_chrome: [browser version, build commit, context, evidence or UNVERIFIED]
observed_real_write: [R2 readback evidence, sanitized, or UNVERIFIED]
discrepancy: [intent minus implemented and/or reality; exact symptoms]
root_cause: [confirmed | suspected | unknown]
fix_status: [open | fixed-code-only | live-verified | blocked]
regression_tests: [test names]
confidence: [strong | moderate | weak and reason]
owner_notes: [dependencies, ambiguity, decisions]
```

Any rule with no executable coverage, unverified Chrome outcome, or conflicting docs must remain visibly open. Link each rule to supporting tests/files, ideally machine-readable YAML/JSON plus readable Markdown. Do not invent evidence, rule precedence, confidence, or actual save results.

## Build a traceability matrix

Produce one row per rule with: rule ID, intended outcome, implementation status, simulated outcome, installed-Chrome outcome, actual save/readback outcome where applicable, discrepancy type/severity, measured evidence coverage, owner/action. Maintain a separate “not a spec / unresolved product decision” register for ambiguities.

Standardize **four** conceptual columns prominently:

1. **INTENT**: what project rule or user specification requires.
2. **IMPLEMENTATION**: what checked-in code, compiled menu, state model and tests actually attempt.
3. **REALITY**: what a user sees and can successfully do in live Chrome and in destination cloud storage.
4. **DISCREPANCY**: exact observable delta among the first three (including inability to verify).

This contract must remain reusable for every future Codex iteration. Explain the observation methods and what falsifies each rule.

# 5. Logic2Real quantitative scoring — REQUIRED

A bare “12/12 tests pass” is not sufficient. Develop a **transparent, reproducible score** showing how much of intended logic is implemented and actually proven to work. **Avoid false precision.**

## Rule-level scoring

For each rule `r`, separately score on a 0–1 scale (with `UNVERIFIED` as missing evidence, not as a pass):

- `I_r`: **Implementation fidelity** — actual checked-in code matches the normative rule, including edge cases.
- `T_r`: **Automated test fidelity** — assertions meaningfully exercise the specified behavior with correct expectations, not merely snapshots or mocks of the same code.
- `C_r`: **Chrome reality fidelity** — installed extension's actual native right-click menu reflects the expected roles, hierarchy, labels, availability and clickability.
- `R_r`: **Routing/outcome fidelity** — real user click chooses the correct account/bucket/prefix, remote write succeeds or correctly fails, readback and observable history match (only when applicable).
- `S_r`: **State/application consistency** — saved configuration, projected/desired menu, acknowledged Chrome menu and actual menu converge, including retry and worker restart (when applicable).
- `E_r`: **Evidence quality** — unambiguous screenshots/logs, commit/build provenance, reproducibility and independent checks; distinguish real instrumentation from a simulator.

Grade each applicable dimension: `1.00 = observed correct across representative and specified edges`, `0.50 = partially supported/mixed`, `0.00 = tested and violated`, `U = unverified`, `NA = genuinely inapplicable with reason`. Encourage more granular values only with a consistent rubric and traceable raw counts. Missing data must never be silently equated to success.

## Weights and aggregation

Use priority-weighted rule weights, explicitly justified; suggested defaults `P0=8, P1=4, P2=2, P3=1`. If criticality is uncertain, flag it rather than gaming weighting.

Suggested dimension weights *within applicable verified observations*:
- Implementation `I`: **20%**
- Automated tests `T`: **10%**
- Chrome reality `C`: **25%**
- Real routing/outcome `R`: **25%**
- State consistency `S`: **15%**
- Evidence quality `E`: **5%**

These are a starting specification; document any change and retain baseline weights for before/after comparison. Drop only genuinely inapplicable dimensions and renormalize their weights per rule, **never** drop unverified dimensions merely to inflate a score.

Define:

```text
known_score = 100 × (sum(priority_weight × dimension_weight × observed_score)
                     / sum(priority_weight × dimension_weight) OVER VERIFIED APPLICABLE CELLS)

evidence_coverage = 100 × (sum(priority_weight × dimension_weight) OVER VERIFIED APPLICABLE CELLS
                          / sum(priority_weight × dimension_weight) OVER ALL APPLICABLE CELLS)

conservative_verified_score = 100 × (sum(priority_weight × dimension_weight × observed_score)
                                     / sum(priority_weight × dimension_weight) OVER ALL APPLICABLE CELLS)
```

For the conservative score, **U contributes zero evidence credit, not a measured functional failure**. Always show the 3 numbers side-by-side; label unverified correctly. Publish by dimension and category as well as total. If there are no verified cells, known_score is `N/A`. Preserve unrounded figures internally and display rounded percentages.

Also report:
- **Gap index** `= 100 − conservative_verified_score`, clearly split into **proven mismatches** vs **unverified exposure**, not conflated.
- **Verified discrepancy rate** `= weighted failed/partially failed rule-dimension observations ÷ verified applicable observations` with stated handling of partial scores.
- **Critical rule gate**: every P0 rule must be verified for its applicable Chrome/save/state dimensions before claiming “zero logic2real gap” or production readiness.
- **Rule coverage** (defined rules mapped to implementation/tests), **scenario coverage** (named edge cases verified), **real Chrome coverage**, **real write/readback coverage**, **recovery coverage**, **regression count**, **exact-target correctness** (matching account/bucket/prefix / eligible clicked object keys), and **configuration ↔ installed-menu agreement** across tested transitions.
- Differentiate `not implemented`, `implemented but diverges from intended`, `simulation passes but live differs`, `live works but docs conflict`, `not observed`.
- Sample sizes, denominator, test versions and timestamps for every headline figure. Do not imply statistics establish guarantees for untested environments.

## Example score report layout

```text
Logic2Real Scorecard — <branch/commit/build/Chrome>
Known fidelity among verified evidence: __ /100
Evidence coverage: __%
Conservative verified score: __ /100
Gap index: __ points
  Proven discrepancy contribution: __ points
  Unverified evidence exposure: __ points

Category | Applicable rules | Implementation | Tests | Chrome | Routing | State | Evidence | Coverage
Rendering | ... 
Depth | ...
Simple | ...
Narrow | ...
Configuration | ...
Routing | ...
Recovery | ...
Security/auth | ...

P0 gates: __ passed / __ applicable; __ failed; __ unverified
Before vs after: same rubric/scenarios/weights, delta, remaining problems
```

Implement an optional small script that reads canonical rule/results data and computes this score, with fixture-based tests checking arithmetic and `U/NA` treatment. Don't create impressive-looking but arbitrary scores. Baseline past tests may support only I/T and should not be reused as proof of C/R/S.

# 6. Required testing: code, Chrome, genuine destinations

1. Rerun extension build, focused suite, full offline suite and any related UI/browser tests; record exact pass/fail and baseline legacy failures (e.g. existing Simple golden case), never suppress without explanation.
2. Add targeted layout regression tests where feasible and a structural test for the Cloudflare-immediate exception, preserving all nested Save here actions and exact save target identity.
3. Run test matrix crossing mode(s), bucket count (0/1/2/4), empty/nonempty/deep hierarchy, depth (1/4/5/10), visibility and Show states, same-named folders and accounts, Simple/Narrow/Depth coexistence, Quick/Default, refresh/failed crawl, stale menu retries, Save drafts, service worker restart.
4. Observe **native installed Chrome menu**, not merely simulated JavaScript menu. Gather actual screenshots, menu rows, context visibility and action identity; note if Chrome cannot expose some fields and how you verified indirectly.
5. Where consent/credentials and safe test buckets are available, perform minimal disposable R2 writes and readback across representative leaf/root/intermediate paths; verify exact target. **Never authorize unexpected remote writes** and never reveal tokens. If blocked, mark R UNVERIFIED rather than PASS.
6. Test configuration persistence/atomic explicit Save, menu generation acknowledgment, failure-to-apply warning and retry, browser/service-worker restart, shelf closed/failed fallback and history/counter behavior where implemented.
7. Quantify before/after using the **same** scoring rubric, weights and fixture inventory. If live baseline is unavailable, explicitly report that comparison as unavailable, not fabricated.
8. Never claim “logic2real = zero” from passing unit tests. Explicitly distinguish before/after code correctness vs verified end-to-end reality.

# 7. Artifact structure / required deliverables

Store all new Codex-generated audit artifacts under `codex/11.13.2026-0355/`, unless executable scripts/tests or the actual CSS/source repair must live in their normal application directories:

- `REQUEST.md` — this complete directive.
- `RULES.md` — human-readable comprehensive, indexed normative rulebook.
- `RULES.json` or `RULES.yaml` — machine-readable canonical per-rule audit records, including evidence status.
- `TRACEABILITY.md` — Intent / Implementation / Reality / Discrepancy matrix with exact file references and open decisions.
- `SCORING.md` — scoring rubric, weight choices, formulas, missing-data semantics, methodology.
- `SCORECARD_BEFORE_AFTER.md` — real computed scores and deltas, metric breakdowns, denominators, confidence and sample sizes.
- `TEST_MATRIX.md` — unit/integration/live scenario table, status and source of proof.
- `EVIDENCE/` — sanitized screenshots, logs and representative menu/route traces if possible.
- `IMPLEMENTATION_REPORT.md` — diagnosis, smallest code edits, build inclusion, CSS module rationale, exception placement, no-regression diff, remaining gaps, and final merge recommendation.

Prefer stable links to large preexisting documents rather than unnecessary duplication. Add documentation of how future Codex runs maintain the rule registry and rescore it after changes.

# 8. Completion gates / final response

**Two repair gates**
- Depth layout looks standardized, accessible and clearly proportioned in native UI. Module is packaged and scoped.
- Only the prohibited provider-immediate generic Cloudflare “Save here” is removed/clarified. All other destinations, valid nested Save here actions, behavior and exact routing remain intact.

**Audit gates**
- All discoverable rules indexed with provenance; disputes/unverified cases marked.
- Scorecard is computed from records, not guessed; known score/coverage/conservative score/gap decomposition shown.
- Evidence supports claim strength. Distinct P0, P1, P2 discrepancies and unverified scenarios identified.
- Simulation, installed Chrome and actual R2 outcomes never conflated.

Report exact branch/commit and files changed, what was tested, before/after UI, the Logic2Real score and coverage by metric, live proof vs unverified, remaining discrepancies, and explicit **MERGE READY / CONDITIONALLY READY / NOT READY**. No merge into main, no blanket right-click rewrites, no unauthorized data/configuration modification.

**Guiding principle:** If the project says a right-click should do X, identify the exact rule, prove the code attempts X, observe whether Chrome actually offers X, prove where the click writes, measure the discrepancy and evidence coverage, then close the gap without destabilizing unrelated behavior.


# 9. NEW LIVE P1 REGRESSION — Depth destination WORKER_SETUP_REQUIRED (2026-11-13)

**Mandatory addition to this request; this workstream takes precedence over cosmetic closure and must be incorporated into Logic2Real.** See `Issues_and_Bugs/Bugs/P1_DEPTH_DESTINATION_WORKER_SETUP_REQUIRED_2026-11-13.md`.

User-verified real Chrome: Simple and Narrow destinations saved successfully and their files appeared in cloud storage. A Depth destination involving an `Images` directory failed and prompted **“Prepare Cloudflare in Remotes before saving.”** Advanced diagnostic: `{"state":"REPAIR_REQUIRED","worker":"WORKER_SETUP_REQUIRED"}`.

**Crucial correction:** The user does **not** know whether the failed click was a nested “Save here” or a child directory/leaf. Treat the exact clicked action as UNKNOWN, not as proven “Save here”; test both classes and establish exact menu row ID, parent, canonical target and operation ID on reproduction.

The source has a candidate trigger in `src/cloudflare/transport.mjs`: readiness capability demands a ready plan matching account, bucket and protocol. `src/cloudflare/deployment.mjs` keys plans by account/bucket. Determine whether the failing Depth path and successful control paths share a bucket/account, and which exact readiness comparison rejected it. This is a hypothesis; do not mark root cause established. A supplied separate diagnostic file has earliest retained `SCOPE_UNAUTHORIZED`, but lacks proof it is the same incident as this failure: correlate using operation IDs/timestamps or keep separate.

Requirements: trace native menu → action ID → exact target → authorization → worker plan lookup → error provenance → save result. Compare Depth and Simple/Narrow targets and create controls for same-bucket/different-prefix and different-bucket cases. Add tests and reproducible live Chrome/R2 readback when authorized. Do not silently repair/provision/deploy workers, reset OAuth, move buckets, or alter functioning Simple/Narrow routing. Record P1 in the rule registry, traceability matrix, test matrix and Logic2Real scoring: confirmed real-world failure, action identity and cause not established, live outcome coverage partial. Fix narrowly only after evidence.

**Release gate:** This P1 must either be proven fixed end-to-end or explicitly remain a blocking discrepancy in the report. UI styling and menu-label success alone cannot justify “merge ready”.


# 10. NON-NEGOTIABLE CORRECTION — MODE FAULT CONTAINMENT; DO NOT REENGINEER SIMPLE OR NARROW

**User directive (2026-11-13):** Simple and Narrow are currently working and must be **left unchanged for now**. The job is to prevent Depth failures from affecting them, now or in future. Do **NOT** interpret a Depth save fault as a mandate to merge the modes into one universal save engine, reconfigure all providers, change Simple/Narrow workflows, or rebuild their logic. The UI/menu arrangement is liked and should be preserved.

## Invariants and scope

- **C2C-ISOLATION-DEPTH-001:** A Depth-specific failure of inventory, worker readiness, action resolution, configuration, refresh, rendering, registration, or click/save must **not** block, invalidate, delete, degrade, or change independently valid Simple and Narrow destinations.
- **C2C-ISOLATION-SIMPLE-002 / NARROW-003:** The same containment principle applies in reverse as a general architecture goal, but do not modify working Simple/Narrow implementations as part of this scoped Depth fix.
- Preserve the exact existing Simple/Narrow menu behavior, stored configuration, authorization, target identities, save semantics, and end-to-end success.
- Keep independently attributable mode health, diagnostic status, failure boundaries and recovery. An error in one mode should not be mislabeled as a global Cloudflare outage.
- Shared interfaces and Chrome platform APIs may exist, but **do not create a shared failure domain**: one mode's failure cannot escalate to a full-menu outage. Prefer mode-scoped validation/compilation/application, preservation of last-known-good unaffected registrations, granular retry, and an explicit safe fallback.
- Specifically audit `src/chrome/registrar.mjs`: its `removeAll()` plus recreate-all sequence can potentially propagate a single Depth row creation failure to the acknowledged menu generation and operation of otherwise healthy modes. This is an **architectural risk, NOT a proven explanation** of the observed `NATIVE_APPLY_INCOMPLETE`. Determine the actual failed row and callback code before attributing cause. Evaluate whether safe mode-local registration or transaction-like preservation of other modes is feasible within Chrome extension API limits. Do not fake atomicity or impossible Chrome guarantees.
- Treat the observed `NATIVE_APPLY_INCOMPLETE` separately from the Depth `WORKER_SETUP_REQUIRED` failure unless operation-level evidence connects them.
- The user explicitly **does not want** a universal merged Simple/Narrow/Depth save engine. Do not propose or implement that as a fix.

## Tests/gates

- Force failure at each Depth boundary (inventory, projection, native menu registration, worker setup, upload) while verifying Simple and Narrow still render and successfully save.
- Repeat after restart, refresh, reconfiguration, failed Save/Retry, and with the shelf/manager closed.
- Test intact Simple/Narrow target routing and actual R2 readback before and after each Depth fault-injection scenario.
- Never claim fault isolation from simulated tests alone; report actual installed Chrome outcomes as verified or unverified.
- Add isolation invariants to RULES, TRACEABILITY, TEST_MATRIX and Logic2Real scorecard with P0 significance.
- **Release gate:** A Depth failure that can interrupt a working Simple or Narrow save is a critical cross-mode regression; cannot declare merge-ready.
