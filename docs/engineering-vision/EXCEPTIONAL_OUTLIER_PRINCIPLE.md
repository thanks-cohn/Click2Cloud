# ReDown — The Exceptional-Outlier Principle

Permanent engineering objective • November 27, 2026

**The customer should not be our testing infrastructure. The Laboratory should be.**

The ambition is to account for ordinary customer usage, foreseeable lifecycle transitions and recoverable failures so thoroughly that software defects increasingly become exceptional outliers rather than routine customer experiences.

This is the coverage objective of [Scenario-Driven Reliability Engineering (SDRE)](SCENARIO_DRIVEN_RELIABILITY_ENGINEERING.md). It follows from the [Permanent Engineering Vision](PERMANENT_ENGINEERING_VISION.md) and the [Customer Experience Vision](CUSTOMER_EXPERIENCE_VISION.md): extraordinary reliability through extraordinary simplicity.

This document establishes a standing engineering principle, not a separate implementation assignment, a claim of bug-free software or authorization to bypass the [active execution index](../../11.25.2026/alpha-three-runs/02-universal-cloud-compatibility/PART_2_EXECUTION_INDEX.md).

## 1. The destination

Imagine a mature ReDown installation. A customer connects a cloud, chooses a location and saves a file. They upload a folder, close the Shelf when the operation is durably accepted, configure a shortcut, capture a screenshot, switch accounts, update the extension, lose connectivity and return months later.

These are not exceptional events. They are ordinary life for a piece of software.

Our engineering objective is to anticipate these experiences before the customer encounters them. The overwhelming majority of supported everyday workflows should have been exercised under realistic conditions, with independent verification and established recovery behavior.

When defects eventually surface, we want them increasingly to arise from genuinely unusual combinations, novel provider changes, unexpected environmental behavior or severe edge cases — not from elementary operations that we could readily have tested beforehand.

This is an asymptotic objective, not a guarantee that every remaining defect will be rare. Actual defect frequency requires evidence from real usage over time. A rare defect can still be severe; security, authorization, integrity and data-loss failures remain unacceptable merely because they occur infrequently.

## 2. Account for the life of the product, not just its features

Testing a right-click save once establishes very little about the experience of using ReDown for a year.

A supported capability must be considered across its meaningful lifecycle: initial configuration, immediate first use, repeated use, changes in configuration, interruption, recovery, update, restart, reconnect and return after inactivity.

| Area | Coverage objective |
| --- | --- |
| Ordinary customer journeys | Comprehensive coverage of declared supported workflows and critical behavioral invariants. |
| Common interruptions | Systematic testing of network loss, expired authorization, interrupted preparation, uncertain outcomes and supported recovery. |
| Installation and lifecycle | First use, restart, update, migration, reinstall and returning-user conditions. |
| Configuration diversity | Relevant combinations of modes, providers, account identities, destinations, shortcuts and preferences. |
| Concurrent operations and resource pressure | Representative scheduling, competing work, bounded storage and constrained environments. |
| Multiple interacting failures | Targeted combinations selected by risk, shared dependencies and discovered failure boundaries. |
| Previously discovered defects | Permanent reproducible regression coverage. |
| Unforeseen conditions | Safe containment, truthful status, diagnostic evidence and subsequent regression development. |

Comprehensive coverage means comprehensive against an explicitly defined supported scope. It does not mean enumerating every possible machine state, proving all possible interactions or exhausting an infinite input space.

## 3. Discover failure classes before customers discover symptoms

An incident is not merely a request to patch a particular symptom. It is an opportunity to identify the underlying class of failures and examine every relevant entry point sharing that responsibility.

For example, a missing Worker endpoint is one situation in a broader readiness problem. An uncertain readiness probe, interrupted setup, lost deployment acknowledgment or temporary capability failure may exercise related state transitions. The agent should establish the shared invariants, identify meaningful neighboring conditions and test them through the existing authoritative mechanism.

This does not authorize unrelated scope expansion. Repair the smallest responsible boundary, add applicable neighboring regressions and carry unresolved dependencies forward through the execution index.

Do not add separate recovery machinery for every scenario. Simplicity is a prerequisite for sustainable coverage: a shared production contract allows one verified repair to protect multiple customer workflows.

## 4. The coverage map

Maintain a progressively richer map of supported customer behavior and evidence. For each meaningful combination, identify the scenario, expected invariants, test implementation, actual evidence class, last tested revision and outstanding limitations.

Use the existing SDRE experiment model, scenario manifests, receipts and dependency ledger rather than creating a competing truth source.

The principal dimensions include:

- **Entry point:** right-click, manual upload, retrieval, screenshot, Shortcut + Click and applicable file operations.
- **Provider and identity:** each supported adapter, authorized account, account switching and genuine permission boundaries.
- **Configuration:** relevant modes, destination resolution, rules, defaults, preferences and manifest restoration.
- **Lifecycle:** cold, returning, updated, interrupted, restarted, reconnected and restored installations.
- **Failure and resource conditions:** unavailable endpoints, transient transport faults, uncertain writes, concurrency, disk limits and other applicable constraints.
- **Outcome:** exact target and content, authorized admission, correct refusal, durable recovery, independent verification and no duplicate effects.

These dimensions describe the eventual product-wide objective. Their current implementation and required evidence depend on the accepted roadmap stage.

Prioritize critical invariants and common journeys first. Use representative combinations, targeted boundary tests, seeded generation and sustained workload tests to expand coverage efficiently. For high-risk interactions, test additional combinations deliberately rather than assuming pairwise coverage is sufficient.

A large number of passing tests is not itself a measure of how much customer usage has been accounted for.

## 5. Evidence of progress

The objective must remain observable. Prefer meaningful measures over a single impressive test count.

Track supported workflows with qualified evidence, uncovered or blocked scenarios, critical invariants with permanent regressions, failures by execution boundary, recovery outcomes, repeated failures across revisions and relevant real-world reliability observations where available.

Distinguish the local production-path fixture, packaged-browser, installed-browser, authorized live-provider and sustained-use evidence layers. A passing simulation is not a guarantee of real-world reliability. An untested case is not a pass. A correct denial of an unauthorized action is not a defect.

Real usage frequency may inform priorities when lawful, privacy-preserving and genuinely available; do not invent percentages, require unnecessary telemetry or infer a customer failure rate from a synthetic campaign.

Release acceptance remains governed by existing mandatory gates. Do not redefine them to make a candidate appear mature.

## 6. Engineering knowledge must compound

Every material discovered defect should leave behind more than a patch:

1. A preserved record of what actually happened and under which conditions.
2. A reproducible experiment, or an explicit record of why reproduction remains unavailable.
3. A diagnosis supported by evidence, distinguishing hypotheses from established causes.
4. A repair to the existing responsible mechanism.
5. A permanent regression and relevant neighboring-condition tests.
6. Qualification of affected production paths at the required evidence levels.

Future agents should inherit the experiments and the reasoning behind their invariants, not need to rediscover the same failures through customer complaints.

The existing right-click Laboratory demonstrates this direction. Case 83 exposed both a recovery problem and a distinct warm-initialization failure; Case 65 exposed an uncertain readiness probe after an unintended connection reset. These are examples of accumulated engineering knowledge, not proof that the corresponding failure classes are fully resolved. See the SDRE document for the recorded history and current evidence limitations.

## 7. The exceptional-outlier standard

As the product matures, ordinary operations should become uneventful. Known recoverable conditions should have established recovery paths. Previously discovered defects should be difficult to reintroduce unnoticed. Unfamiliar conditions should be contained and observable instead of silently corrupting data or disabling unrelated work.

An unusual incident must still receive attention proportional to its severity. No amount of successful ordinary usage excuses incorrect authorization, lost data, duplicate charges or false verification.

The remaining responsibility of the human tester should increasingly concentrate on genuine native interactions, real-provider qualification, new product decisions and the unusual cases that require human judgment. Agents should autonomously exercise and diagnose the ordinary machinery within their authorized scope.

We are not trying to build the largest testing apparatus. We are trying to make the supported product so thoroughly understood, exercised and protected that its ordinary operation ceases to be an experiment for the customer.

**Most foreseeable usage should already be accounted for. Defects should become exceptions, not expectations.**

**The customer should not be our testing infrastructure. The Laboratory should be.**
