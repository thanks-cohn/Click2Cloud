# ReDown — Scenario-Driven Reliability Engineering (SDRE)

Owner-directed engineering methodology • November 27, 2026

**Every realistic customer experience should become an executable experiment. Every discovered failure should teach the software how to avoid repeating it.**

SDRE is our proposed name for the combination of scenario-based testing, reproducible seeded experiments, lifecycle testing, fault injection, independent outcome verification and permanent regression engineering. It is not a claim to have invented those established techniques or a new testing framework. It is the way we apply them together to the ReDown vision.

Read alongside the [Permanent Engineering Vision](PERMANENT_ENGINEERING_VISION.md), [Customer Experience Vision](CUSTOMER_EXPERIENCE_VISION.md) and [original engineering and verification vision](README.md). The [active execution index](../../11.25.2026/alpha-three-runs/02-universal-cloud-compatibility/PART_2_EXECUTION_INDEX.md) remains the single next-task authority. This document explains a standing method, not a new checkpoint, permission to expand scope, or a declaration that any candidate is accepted.

## 1. The vision that drives the method

**Extraordinary reliability through extraordinary simplicity.**

The owner wants a customer to install ReDown, connect a cloud, choose where files go and simply use it. A customer who chooses Simple, Narrow or Depth must be able to save on their first eligible authorized click independently of the other modes. They should not need to open the Shelf again, prepare a Worker manually or learn the internal architecture.

A week later, connectivity may disappear. Months later, the browser or extension may have updated. A year later, the customer may return to an old configuration. ReDown should preserve legitimate intent and recover its own machinery where possible, without sacrificing authorization, exact destinations, truthful outcomes or integrity.

We cannot realize that vision by testing only a fresh installation under ideal circumstances. Nor can we establish a year of actual reliability merely by simulating a year. We can, however, turn foreseeable lifecycle conditions into reproducible experiments, qualify real installed behavior separately, and maintain those experiments as the software evolves.

The user's responsibility is to choose what to save and where. The agent's responsibility is to understand, exercise and improve the machinery. The owner should not need to invent a new engineering prompt for every minor failure or manually manufacture hundreds of test files.

## 2. What makes this different from ordinary functional testing?

A functional test asks: Does the Save operation work?

A scenario-driven test asks: Does the original authorized Save operation still work if the Worker is absent, the extension background context is interrupted, the deployment acknowledgment is lost, a compatible build has been installed, or a temporary network failure occurs?

A reliability test also asks what happens when success is impossible. Revoked authorization must prevent a write. An uncertain remote outcome must not be replayed blindly. A failed operation must remain truthful and recoverable within the applicable retention and resource contracts.

| Established technique | Role in SDRE |
| --- | --- |
| Scenario-based testing | Translate realistic customer journeys into precise initial conditions, actions and expected outcomes. |
| Model-based assertions | Describe expected state and invariants independently of implementation results; formal state models may be added where useful, but are not claimed to exist everywhere today. |
| Seeded randomized testing | Exercise diverse combinations in reproducible order. |
| Fault injection | Deliberately introduce a known failure and prove it was exercised. |
| Lifecycle testing | Exercise first use, returning sessions, updates, interruption and restoration. |
| Resilience testing | Verify automatic recovery and safe containment when recovery is not possible. |
| Regression testing | Preserve a deterministic experiment for every material discovered failure class. |
| Independent verification | Compare actual provider objects and bytes with expected identity, location and content rather than trusting presentation. |

The goal is coverage of meaningful customer conditions, not a large test count for its own sake. Repeating a single ideal path a thousand times is not equivalent to exploring a hundred diverse failure conditions. Both varied scenarios and sustained workloads have their place.

## 3. The experiment as the unit of engineering

Each experiment should describe:

1. **Customer intention:** the behavior the customer is trying to accomplish.
2. **Initial conditions:** build, provider, mode, account authorization, destination, persisted and volatile state, applicable resource limits and required isolation.
3. **Input:** exact benign source bytes or source identity, operation, target and interaction; seed and case identifier where generated.
4. **Disturbance:** which lifecycle transition or failure is introduced, where, and how to establish that it actually occurred.
5. **Independent oracle:** expected result and invariants, established before observing execution.
6. **Actual evidence:** correlated production events, typed observations, errors, timing, publication counts and independent readback as applicable.
7. **Verdict:** PASS, FAIL, BLOCKED or NOT_TESTED, with reasons and evidence class. Unknown observations remain unknown.
8. **Restoration:** safe disposal of isolated test resources, retention of evidence, and restoration of any deliberately changed test configuration.
9. **Replay:** exact revision, seed, case, environment, commands and any required human interaction.

The workflow is:

```text
Customer Experience Vision
    -> Behavioral invariant
    -> Scenario / manifest / independent expectation
    -> Actual production path under controlled conditions
    -> Observation and independent verification
    -> Diagnose first meaningful divergence
    -> Repair existing authoritative mechanism
    -> Permanent regression and broader qualification
    -> Updated engineering knowledge
```

An experiment is not a second implementation of the feature. Expectations and observations must be independently derived, while the tested path uses the same applicable production contracts as ordinary users. Do not add a second Worker manager, transfer engine, shortcut recognizer, scheduler or accounting ledger merely to make a test pass.

## 4. Actual implementation today: Checkpoint 2B.1

The existing Python/CMD Laboratory already embodies this method for Cloudflare R2 right-click readiness. The source reference for this explanation is candidate [c644643](https://github.com/thanks-cohn/Click2Cloud/commit/c644643b538d3addaa211e072fcc8ed210464fcc), ReDown 0.3.32.6. Later revisions may extend it; use the active execution index for current implementation and acceptance status.

### 4.1 Source map

| Component | Actual responsibility |
| --- | --- |
| [right_click.py](../../11.25.2026/live-python-lab/python/redown_live_lab/right_click.py) | Generates scenario plans, deterministic payloads and expected SHA-256 values, invokes the Node fixture and independently compares observations against expected predicates. |
| [part2-lab.cmd](../../11.25.2026/alpha-three-runs/02-universal-cloud-compatibility/part2-lab.cmd) | Existing Windows command entry point for the Laboratory. |
| [verify-python-lab.mjs](../../scripts/verify-python-lab.mjs) | Existing Node verification runner used by the Python right-click fixture. |
| [right-click-lab.mjs](../../tests/fixtures/right-click-lab.mjs) | Exercises production registration, authorization, save, readiness, transport and verification functions against an isolated local runtime, collecting observations. |
| [onboarding.mjs](../../src/cloudflare/onboarding.mjs) | Existing Cloudflare onboarding/readiness mechanism exercised by the fixture, not a new test-specific recovery engine. |
| [HANDOFF_2B1.md](../../11.25.2026/alpha-three-runs/02-universal-cloud-compatibility/HANDOFF_2B1.md) | Candidate history, implemented changes, limitations and acceptance gates. |
| [CASE_83_EVIDENCE.json](../../11.25.2026/alpha-three-runs/02-universal-cloud-compatibility/CASE_83_EVIDENCE.json) | Durable evidence for the earlier Case 83 investigation and repairs. |

### 4.2 Ten realistic conditions

The generator uses three menu modes (Simple, Narrow, Depth; Narrow is internally named nested) and ten conditions. Its fixed focused opening cases cover core paths; subsequent seeded shuffles of mode/condition combinations broaden the coverage. The campaign contains repeated and varied scenarios, not 100 distinct failure classes. A specific regression is pinned at seed 271127, Case 83.

| Scenario | Customer situation / experiment |
| --- | --- |
| cold | First use with no retained Worker proof or initialized provider runtime. |
| registration-race | Save while location registration/preparation is still completing. |
| returning | Return to valid previously prepared infrastructure. |
| compatible-build | Reuse compatible infrastructure after a build change rather than needlessly redeploy. |
| transient-health | Temporary Worker health communication failure. |
| revoked | Authorization loss; correct denial and zero publication are success for this negative test. |
| sibling | Save to two intended authorized locations while reusing deployment infrastructure. |
| lost-deploy-ack | Deployment succeeds but its acknowledgment is lost. |
| endpoint-missing | Previously prepared Worker endpoint disappears and must be recovered. |
| evicted-setup | Extension background execution is interrupted during preparation. |

Each experiment uses small synthetic source content, a scoped QA destination, actual applicable production functions, and isolated local Worker/R2 fixtures. The ordinary right-click action is simulated through the registrar/dispatch boundary, not a physical native Chrome menu click.

### 4.3 Commands and receipts

From the authorized repository root in Windows CMD, using the existing installed Laboratory environment:

```cmd
call 11.25.2026\alpha-three-runs\02-universal-cloud-compatibility\part2-lab.cmd right-click --seed 271127 --cases 100
call 11.25.2026\alpha-three-runs\02-universal-cloud-compatibility\part2-lab.cmd right-click --seed 271127 --case 83
call 11.25.2026\alpha-three-runs\02-universal-cloud-compatibility\part2-lab.cmd right-click --seed 271127 --case 65
```

The seed and case reproduce the declared plan, not the precise timing of the operating system, sockets, scheduling or an accidental transport fault. Preserve environment and build identity and make unintentional failures deliberately reproducible through targeted fault injection.

Each run has a separate directory under `lab-local/verification/right-click-<run-id>/` containing:

- `scenario-plan.json`: expected mode, condition, source, destination, hash and other independent expectations.
- `observations.json`: observed production outcomes, runtime identity and available execution traces; updated after each completed scenario.
- `summary.json`: final independently evaluated verdicts and differences, including PASS/FAIL/NOT_TESTED counts, when the runner completes.
- `fixture.log`: redirected subprocess output.

The current evidence layer is `paired-python/native-loopback-production-registrar-signed-workerd-r2`. These tests do not prove physical Chrome input, real Cloudflare writes, screenshot behavior or large-file performance. Read-only verification must not warm a deliberately cold test.

### 4.4 What constitutes success

The Python oracle checks the correct isolated mode, actual menu compilation/registration acknowledgment, cold-state behavior, source admission, Worker responsiveness, dispatch, exact destination, publication count, object count, expected SHA-256, scope denial and manual-intervention expectation. It checks applicable fault-exercised evidence and deployment counts. The Case 83 regression adds explicit original-operation verification, two injected capability faults, peak runtime count, initial health code and readiness-probe checks.

For a single eligible save, the desired result is the original authorized operation, one intended publication, exact content, no unnecessary manual intervention. Sibling experiments intentionally save two files. Revocation experiments correctly expect no write. Do not confuse an expected denial with a failed experiment or a successful scenario with proof of all other scenarios.

The desired customer invariant is independent first-click saving in all three modes, including automatic recovery, with no prior unrelated mode needed. Actual installed native input and authorized live R2 qualification are separate acceptance gates.

## 5. The method in action: two real discoveries

This history is a reference snapshot, based on owner-supplied Windows receipts and the source/handoff at the cited revisions. Preserve full local receipts outside Git; do not publish private paths, source URLs, tokens or unrelated customer data.

### Case 83 — Missing endpoint and a misleading aggregate failure

- At `3a7ab09`, the Windows 100-case campaign returned 99 PASS and 1 FAIL. Case 83 failed at readiness after endpoint loss, without publication. Isolated replay reproduced the failure.
- At `c6b506e`, five isolated owner replays yielded FAIL, PASS, FAIL, FAIL, FAIL. The successful receipt showed one replacement deployment, two injected ECONNRESET capability faults, original-operation preservation, one publication and exact hash.
- Comparison with the inspected failed receipt showed something different: an assertion at fixture line 181 during initial warm write-probe preparation, before endpoint removal. No recorded transport events or completed scenario observation. The generic assertion lost the detailed probe result.
- At `c644643`, the Laboratory warm setup checks signed capability before probing, captures sanitized probe outcome and preserves the initialization assertion. The production recovery mechanism was not changed by this follow-up. Hosted tests passed according to the handoff; the owner then completed a full 100-case Windows campaign with Case 83 passing.

Lesson: identical aggregate FAIL labels can conceal entirely different boundaries. Separate fixture initialization, actual fault execution and production behavior. Do not change a proven recovery mechanism merely to repair an invalid experiment. Do not claim the original intermittent cause is fully established when evidence is missing.

### Case 65 — Evicted setup and an unintended transport reset

The owner campaign at `c644643`, seed 271127, completed with 99 PASS, 1 FAIL and 0 NOT_TESTED. Case 65 (Depth, evicted-setup) failed:

- One deployment, one readiness probe request.
- Non-injected ECONNRESET on /probe, recorded duration 220 ms, Windows errno -4077.
- Final outcome READINESS_RECONCILE_REQUIRED, uncertain; zero publication requests and zero objects.
- Original authorized save was not dispatched.

Unlike the inspected warm-initialization failure, this experiment reached the production readiness path. The root cause of the socket reset is not established. The safe next investigation is to distinguish local fixture/runtime transport failure from production recovery limitations, then test read-only reconciliation of the original probe identity and continuation of the original save where justified. Never blindly repeat an uncertain write. A permanent deterministic regression for this failure class is a proposed next deliverable, not a completed test.

The campaign did not pass acceptance. One passing Case 83 does not establish the disappearance of all intermittent failures. Installed Windows native input and authorized live-provider evidence remain distinct outstanding requirements.

## 6. The proposed evolution: manifests as executable experiments

The owner wants to reduce human supervision while making real GUI testing repeatable. The existing scenario plan is the initial working example. Extend this principle incrementally through the existing Laboratory when its applicable checkpoint permits.

**Separate customer configuration from test instructions.** A production configuration manifest describes portable choices. A Laboratory experiment can reference a validated configuration manifest plus explicit initial conditions, synthetic inputs, human instructions, expected outcomes and fault controls. Production imports must never execute test fault instructions, arbitrary code or unapproved cloud writes.

| Configuration domain | Example future experiment |
| --- | --- |
| Right-click manifest | Import known authorized routes, exercise each mode from fresh state, verify exact target and mode independence. |
| Shortcut manifest | Import scoped assignments, exercise real key input, check conflicts, site boundaries, focus, release/blur and one action per gesture. |
| Screenshot manifest | Import known website rules and destinations, capture intended test tab, verify exact source, provider and content with no wrong-tab fallback. |
| Universal configuration manifest | One export/import of the three domains; validate shared registry and destination references, preview unresolved locations and obtain consolidated explicit approval for selected missing locations. No credentials in the manifest. |
| Transfer corpus manifest | Generate known file/folder inputs; introduce bounded interruptions; verify original content, safe retry of only unfinished work, exact paths and no duplicate accounting. |

The proposed unified customer manifest retains modular domains internally. Individual component exports may remain useful for focused testing. In the future, a professor or research team could share a portable workflow, but a recipient must connect their own authorized accounts, review mappings and approve missing-location creation. This is a proposed customer workflow, not a current implemented claim or an immediate expansion of Part 2B.1.

For browser-managed shortcuts, use actual registration evidence and supported manual browser actions where required. For screenshot tests, respect permissions, actual tab identity and capture limits. Do not automate away a native interaction and then report native success.

## 7. Operational quality of the Laboratory

The Laboratory must itself be dependable. At the owner baseline, the sequential right-click runner redirected subprocess output to a log and printed its first summary at completion. The owner experienced a long silent campaign, and that runner had no campaign timeout.

The Case 65 follow-up adds live case and phase reporting, elapsed time, and pass and fail counts derived from the Python verdict. It bounds both the active case and the campaign, terminates the fixture process tree on interruption, and retains partial receipts. The deterministic Case 65 replay uses the original probe and save identities. Reference Windows and higher evidence layers still require qualification. [Checkpoint handoff](../../11.25.2026/alpha-three-runs/02-universal-cloud-compatibility/HANDOFF_2B1.md#case-65-interrupted-readiness-probe)

Operational goals for this and subsequent checkpoints:

- Live current-case and phase display, elapsed time, last progress, observed/pass/fail/untested counts (do not confuse observation with final verdict).
- Bounded phase and campaign execution, cancellation, process cleanup and preserved partial evidence.
- Sanitized typed diagnostics at initialization, transport, recovery, verification and teardown boundaries.
- Focused single-case replay, permanent fault injection, quick regression tier and separate extended campaigns.
- Resource measurements at meaningful boundaries; identify genuine startup/teardown failures rather than treating a timeout or high memory observation as root cause.
- Fresh isolation when necessary, deliberate persisted state for returning tests, no hidden prewarming.
- No arbitrary sleep/timeout inflation, blind retries, lowered assertions or replacement of failing runs with favorable runs.

Preserve current APIs and evidence formats where possible. The checkpoint handoff records which improvements are implemented and verified.

## 8. Evidence hierarchy and acceptance discipline

| Evidence | What it can establish |
| --- | --- |
| Unit and deterministic contract tests | Specific behavior and invariants under declared conditions. |
| Paired local production-path fixture | Actual applicable production logic with controlled local provider/runtime and independent synthetic data evidence. |
| Packaged browser tests | Actual extension packaging and exercised browser behavior, within the test's interaction and provider limitations. |
| Installed reference Windows/native input | Real supported browser interaction under documented owner conditions. |
| Authorized live provider | Actual remote writes/readback, authorization and provider-specific behavior within approved QA scope. |
| Sustained lifecycle and soak testing | Observed durability over the tested conditions and time, not proof of future universal reliability. |

Never substitute one evidence layer for another. Record exact revision, platform, seed, case counts, limits, skipped tests and unaccepted gates. Preserve negative evidence and unknowns. Respect local disk and provider cost budgets, account scopes, authorization, retention and privacy. Do not make unauthorized live mutations or use customer files as a fault-injection corpus.

## 9. Vision-driven agent autonomy

Before a change, the agent should understand the customer journey, actual source and working reference, and select the smallest set of relevant experiments. During the change, the agent should diagnose differences, autonomously resolve ordinary engineering details within the authorized checkpoint, and preserve the shared architecture. Afterward, the agent should rerun the new deterministic regression, applicable established regressions and required broader evidence tiers, then hand off the smallest remaining owner action.

Ask the owner only for genuine unresolved product, authorization, cost, compatibility or scope decisions, and necessary native or live verification. A handoff should provide concise commands, exact candidate identity, results, evidence and outstanding blockers. Agents must not advance past unaccepted gates merely because a session ended.

The owner sets the destination. The agents build and exercise the machinery. The Laboratory retains the accumulated knowledge so that another agent can inherit the project from its source, specifications and evidence instead of requiring the original conversation.

## 10. Long-term objective

The methodology should grow alongside ReDown: independent right-click readiness, durable background transfers, universal provider contracts, screenshot and contextual shortcut interactions, portable configuration, entitlement continuity and integrated lifecycle qualification. The existing roadmap controls when each becomes implementation work.

The successful outcome is not the most elaborate test system. It is a small coherent production architecture supported by meaningful, reusable experiments that catch failures early and make maintenance progressively less dependent on manual direction.

**We are not merely testing what the software does. We are testing what happens to the software throughout its existence.**

**The agent exercises the machinery. The human experiences its fruits.**
