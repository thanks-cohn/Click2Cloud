# ReDown — Permanent Engineering Vision

Owner direction • November 27, 2026

**Extraordinary reliability through extraordinary simplicity.**

This standing vision governs engineering choices across ReDown's development and maintenance. It is not a separate implementation assignment, a research project, or authorization for a wholesale rewrite. Read it alongside the [existing engineering and verification vision](README.md) and [owner's intended implementation](../../11.25.2026/MY_INTENDED_IMPLEMENTATION.md). The active roadmap and execution index determine the current work; the latest explicit owner decisions govern product policy.

The [Customer Experience Vision](CUSTOMER_EXPERIENCE_VISION.md) is the concrete behavioral target for these principles: independent first-use Simple, Narrow and Depth saves, everyday reliability, recovery and long-term continuity.

## 1. Simplicity is the ultimate architectural objective

Prefer one elegant, dependable mechanism over multiple mechanisms addressing variations of the same problem. Every mechanism must justify its existence. Remove unnecessary complexity while preserving proven capabilities. Small, specialized modules with clear ownership are desirable; competing owners, overlapping state machines and redundant infrastructure are not.

Repair and extend before replacing. Consolidate overlapping responsibilities after proving compatibility. Replacement requires evidence of necessity, a safe migration and owner approval where required by the active specification.

## 2. Always work

The customer's responsibility is to choose what to save and where to save it. ReDown owns initialization, preparation, execution, recovery and verification. The normal first-use path must not require another feature, repeated clicks, manual Worker maintenance or unnecessary configuration. Reuse valid authorization and prepare or recover automatically. Genuine provider, permission, storage and source limitations must be handled honestly, not disguised or bypassed.

## 3. One engine, many interfaces

GUI, native context menus, shortcuts, screenshots, Queue, Laboratory and future integrations are interfaces to shared production capabilities. Use one authoritative application-operation contract, exact logical operation identity, destination and outcome, with provider-specific adapters and scoped authorization. Human and agent paths should share the applicable admission, recovery, verification and cancellation behavior. Repair once; benefit every applicable interface. Presentation must not independently determine success.

## 4. Persistence is fundamental

Preserve accepted intent, exact authorized destination, progress, recoverable sources and outcomes across interruptions wherever technically possible. Treat the existing IndexedDB source persistence, durable upload journal and background scheduler as critical production infrastructure. Repair and qualify them in place before inventing replacements. Maintain bounded source retention, durable recovery records and safe cleanup. Verify actual execution after Shelf closure, worker eviction and browser restart. Do not claim execution while Chrome is completely closed, or promise safe Shelf closure before independent ownership is proven. If a phase genuinely depends on the Shelf, say so before that phase.

## 5. Self-reconciliation over manual repair

Compare desired and observed state, then recover discrepancies automatically. Use one authoritative readiness mechanism and coordinated preparation per applicable deployment identity and authorization scope. Fence stale results, reuse healthy infrastructure, reconcile uncertain publication before replay, and preserve verified work. Bound automatic attempts and resources without arbitrary lifetime limits on deliberate retries.

When automatic recovery cannot finish, retain unsuccessful items in Queue with Retry and Retry All Failed. Preserve exact source bytes where feasible; show expandable recorded Source URL and Host URL/original screenshot context when applicable, respecting privacy. If original bytes are no longer available, offer a simple genuine corrective action rather than fabricate recovery. Do not duplicate confirmed files, charges or completion events.

## 6. Established engineering over unnecessary invention

ReDown is a persistent, self-reconciling, browser-native universal file-operation engine. The architectural direction is decided: use established principles within the existing V3+1 engine, IndexedDB, journal and scheduler, not a collection of new frameworks.

| Reference | Principle to apply |
| --- | --- |
| [Rclone](https://github.com/rclone/rclone) | Universal file operations, provider abstraction and consistent transfer recovery. |
| [Kubernetes](https://kubernetes.io/docs/concepts/architecture/controller/) | Desired-state reconciliation and clear responsibility for readiness. |
| [Temporal](https://docs.temporal.io/) | Durable execution, stable operation identity and recovery of unfinished work. |
| [Chromium](https://chromium.googlesource.com/chromium/src/) | Transfer ownership independent of an observational GUI. |
| [Uppy](https://uppy.io/docs/golden-retriever/) | Browser source recovery and retryable uploads within actual browser limits. |
| [SQLite](https://www.sqlite.org/atomiccommit.html) | Transactional integrity and rigorous failure testing. |
| [Syncthing](https://github.com/syncthing/syncthing) | Content integrity and safe file publication. |

The first three are primary architectural analogies; the others are supporting references. Original REDOWN remains a read-only, product-specific reference where relevant. These references are not mandatory software dependencies, guarantees of parity, or instructions to reproduce their infrastructure. Use them for targeted implementation questions, not a session-long survey of alternatives. Preserve licensing, platform compatibility and existing working behavior.

## 7. Longevity over short-term convenience

Expect customers to return after a day, a month or a year. Preserve saved configuration, genuine setup approval and authorized identity across ordinary lifecycle changes. Design for browser restarts, updates, provider interruptions and resource pressure. Avoid recurring setup rituals, unbounded storage growth and frequent maintenance. Measure real durability; simulated lifecycles are not evidence of elapsed real-world reliability.

## 8. Failure must remain contained

One unavailable provider, account, optional feature or damaged component should not unnecessarily disable unrelated legitimate work. Isolate failures at the smallest appropriate boundary, with fair scheduling and bounded resources. History, previews, animation, feedback and diagnostics must not become competing transfer authorities or block valid saves.

**Recovery is not a prerequisite to unrelated work.** After interruption, restore the independently usable application and recover affected operations in bounded background work. Protect genuine shared prerequisites; never bypass authorization or unresolved publication/eligibility fences. Keep provider-specific details in thin modules behind one authoritative contract; preserve compatible deployed infrastructure and avoid build-driven replacement. Bound long-term storage and rotate eligible resolved local records under simple user-configurable retention, never discard unresolved work or delete cloud content to make space.

## 9. Truth above appearances — discretion above interruption

Never report a successful operation without adequate verification. An accurate partial result is preferable to misleading success; an honest limitation is preferable to an unreliable promise. Truthful state is mandatory, but the amount of unsolicited presentation is the customer's choice.

**Settings → Transfer feedback: Silent / Normal**

- **Silent:** unsolicited transfer notifications (including optional failure/recapture notices), routine progress, success Transmissions and partial-result popups are quiet. Automatic preparation, retry, recovery and verification still occur. Accurate current status, verified results, unfinished items, reasons and recovery controls remain accessible in Queue and the applicable History/receipt views. Do not erase records or suppress necessary inline instructions.
- **Normal:** show concise meaningful progress and verified completion, partial outcomes and actionable failure feedback using the existing feedback surfaces and notification preferences. Coalesce messages; do not narrate every internal attempt, poll or Worker repair. For example, “41 of 43 files verified · 2 available for retry” is not full-batch success.
- In either mode, show essential instructions at the relevant interaction when genuinely necessary: required authorization, source reselection, or “Keep the Shelf open while ReDown prepares this upload” when closing would interrupt. No needless forced windows or modal prompts. Silent does not mean false success, hidden actionable state or a weaker engine.
- Reuse the existing notification/visual feedback settings and canonical outcome events. Do not invent a second notification engine, parallel success state or an independent transfer pipeline. Persist the preference across normal lifecycle changes. Normal with notifications enabled is the new-install default; the customer can disable them later through Silent. Preserve existing explicit disabled/enabled notification and animation choices when migrating. Necessary inline instructions and durable actionable state remain even when unsolicited notices are disabled; no forced popup or Shelf opening. Notification delivery is best-effort deduplicated and never determines operation success.

The distinction is presentation only: both modes have identical admission, execution, recovery, verification, accounting, Queue, receipts and integrity rules. Required feedback and privacy behavior must be tested in both modes.

## 10. Engineering improvements must compound

Each implementation checkpoint should leave ReDown more coherent, operable, observable, verifiable and dependable. Reuse proven components, consolidate duplicated ownership, and permanently eliminate demonstrated failure classes. Prefer a small set of universal invariants tested across actual entry points to a growing collection of disconnected patches.

Evidence over claims: build and focused tests, actual packaged GUI behavior, installed browser behavior and authorized live-provider verification are separate proof classes. Use existing Laboratory and Python tooling to generate independent manifests, receipts, fault/recovery tests and reproducible evidence. Do not hide failed runs, substitute mock success for production proof or advance through an unaccepted dependency.

**API-first means script-first evidence, not feature count.** Make the actual production mechanisms observable and callable through the existing authorized Python/CMD Laboratory wherever meaningful. Every ordinary engineering change should become independently testable; use simple observed true/false/unknown results, independent expectations, repeatable scenarios and permanent regressions. An agent should find and repair elementary failures before a customer does. Actual browser-only interactions require actual browser evidence; no simulated success, new unrestricted RPC or duplicate engine. The customer should never know about Workers, diagnostic tooling or internal recovery.

## 11. Close the logical simulation-to-reality gap — design for agent-maintainability

**Our long-term ambition is software that is designed to be maintained by agents, with human verification concentrated at genuine reality boundaries and exceptional cases.**

In robotics, the simulation-to-reality (sim-to-real) gap describes the discrepancy between behavior in a simulated environment and behavior in the physical world. ReDown has an analogous challenge, but our principal subject is not physics. It is the logical behavior of the product: application state, customer intent, authorization, destinations, lifecycle transitions, concurrency, interruption, provider responses, persistence, recovery and independently verified outcomes.

An agent can readily manipulate a logical experiment. It can generate an input, select a known initial state, exercise a production capability, introduce a precisely defined disturbance, observe the result and compare that result with an independent expectation. The difficulty is making that experiment genuinely representative of what the customer experiences. Closing this logical sim-to-real gap is therefore an architectural objective, not merely a testing task.

### Design the product to be accessible to its maintainers

Every applicable production capability should become meaningfully observable, callable and reproducible through the existing scoped APIs and Python/CMD Laboratory. The agent must exercise the actual mechanisms responsible for customer outcomes, not an imitation that happens to satisfy a test.

- Keep one authoritative production contract behind the applicable human and agent entry points, with thin platform/provider adapters and clear ownership.
- Represent logical state, operations, configuration and outcomes through stable, versioned, inspectable contracts.
- Make initial conditions reproducible using validated manifests, synthetic inputs, seeds and explicit lifecycle transitions.
- Provide independent expected outcomes, actual evidence, typed errors, safe fault injection, operation correlation and exact readback where applicable.
- Preserve regression experiments and engineering knowledge across revisions, sessions and agents. A new agent should be able to inherit the repository, understand the vision, reproduce a failure and verify a repair without needing the original conversation.
- Keep test access scoped, authenticated and isolated. Agent accessibility does not mean unrestricted RPC, exposure of credentials, a production backdoor, unauthorized cloud mutations or duplicate execution machinery.

The [Scenario-Driven Reliability Engineering methodology](SCENARIO_DRIVEN_RELIABILITY_ENGINEERING.md) provides the practical experiment model. The [Exceptional-Outlier Principle](EXCEPTIONAL_OUTLIER_PRINCIPLE.md) sets the coverage objective: account for ordinary supported usage so thoroughly that newly discovered defects increasingly arise in exceptional conditions rather than everyday operations.

### Make simulation and reality correct each other

The Laboratory should be close enough to production that most logical defects can be reproduced, diagnosed, repaired and regression-tested without a person repeatedly operating the interface. Actual customer-facing evidence must then calibrate that model.

Use a continuous feedback loop:

1. Establish a customer-facing behavioral invariant.
2. Reproduce it with the same applicable production logic under controlled conditions.
3. Compare independent expected and actual outcomes.
4. Qualify real browser input, installed behavior and authorized live-provider behavior at the appropriate checkpoints.
5. Identify any discrepancy between the logical experiment and reality.
6. Refine the experiment, instrumentation or responsible production mechanism, and preserve the discrepancy as a permanent regression where reproducible.

A passing local fixture cannot erase a failing installed-browser or live-provider result. The same seed reproduces the declared experiment, not every timing or environmental detail. Browser permissions, operating-system behavior, real network conditions, provider changes and hardware constraints remain genuine boundaries. Where those boundaries cannot be represented faithfully, retain them as explicit real-world verification requirements rather than disguising them as solved.

For example, the present right-click Laboratory tests production readiness and save logic with synthetic sources and a controlled local Worker/R2 environment. Its recorded Windows failures exposed differences in initialization and uncertain probe recovery. Comparing successful and unsuccessful receipts narrowed the investigation without requiring the owner to manually inspect every transfer. It is an early example of the desired feedback loop, not evidence that the logical sim-to-real gap is already closed.

### The agent-maintainable software objective

We aspire to make ReDown an example of a product whose ordinary upkeep and maintenance can be performed predominantly by capable engineering agents. In principle, sufficiently comprehensive logical coverage, simple shared architecture and faithful verification could make nearly all routine maintenance agent-executable.

The intended maintenance cycle is: reproduce, diagnose, repair the responsible mechanism, exercise relevant regressions, check the broader supported behavior, and produce an evidence-backed handoff. Agents should do this autonomously within approved scope, rather than requiring a separate human prompt for each ordinary engineering decision.

Human effort should increasingly concentrate on occasional real-world calibration, genuine native and authorized live verification, novel or exceptional conditions, subjective customer experience, material product decisions and approval of consequential changes where required. Human verification must remain whenever the evidence, risk or acceptance contract demands it; frequency should decrease through demonstrated capability, not by removing safeguards.

This is a research and engineering ambition, not a claim that ReDown is already fully agent-maintainable, uniquely so, or capable of unsupervised production operation. Do not infer that simulated coverage guarantees real-world reliability. Measure progress through verified workflow coverage, reproducibility, the ability to transfer maintenance between agents, independently validated repairs and reductions in routine owner intervention without weakening evidence.

**Build not merely a product that agents can modify, but a product whose behavior agents can understand, reproduce, verify and responsibly maintain.**

## Vision-first engineering autonomy

Every agent reads this vision and the Customer Experience Vision before interpreting an individual request. Use the decided architecture and working references to resolve ordinary engineering details independently, anticipate related failures within the authorized checkpoint, and verify whole behavioral classes rather than wait for a separate prompt per issue. Ask the owner only for genuine unresolved product-policy, permission, cost, compatibility or scope decisions; record the affected blocker and proceed with independent work. The owner sets the destination; the agent chooses the simplest justified implementation path. This is bounded autonomy, not permission to bypass acceptance or implement later checkpoints. A handoff explains concrete improvements and evidence, not merely compliance language.

## Governing hierarchy

1. Permanent engineering vision: why we engineer this way.
2. Reference architecture: how the existing system should operate.
3. Product specification: what the customer must be able to accomplish.
4. Execution roadmap and index: in what order, with which acceptance gates.
5. Individual Codex request: what to implement now.

An individual request must not inadvertently undermine the standing vision. The latest explicit owner decision resolves genuine policy conflicts; otherwise document and isolate the conflict rather than inventing a new product rule. Preserve authorization, exact destination and real evidence throughout. Implement the active checkpoint, not every aspiration in this document.

**The agent exercises the machinery. The human experiences its fruits.**
