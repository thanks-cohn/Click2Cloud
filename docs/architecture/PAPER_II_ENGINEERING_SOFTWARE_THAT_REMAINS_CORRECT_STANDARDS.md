# Engineering Software That Remains Correct

*Five Established Principles for Preventing Architectural Regressions and Achieving Production Excellence*

## Abstract

Software reliability is frequently approached as a consequence of good programming: write deterministic algorithms, organize components logically, expose documented interfaces, and test the resulting implementation.

These practices are necessary, but they are not sufficient.

A system may satisfy every local specification while violating the assumptions connecting its components. An application may pass hundreds of tests yet fail when persistent state disappears, when an operation is interrupted, or when previously independent mechanisms disagree about the user's intentions.

The deeper problem is a failure of *systems assurance*: the discipline of establishing and maintaining justified confidence that a system satisfies its requirements under its intended operating conditions.

Fortunately, software engineering has developed mature principles for addressing these problems. International standards, formal specification techniques, failure analysis, transaction theory, and production reliability engineering provide complementary methods for understanding and preventing such defects.

Five concepts are especially important:

**Quality attributes as measurable requirements; correctness as an invariant; state as a protected authority; failure as an anticipated operating condition; and release readiness as an evidence-based decision.**

Together, these principles offer a practical foundation for building software that does not merely work when tested, but remains trustworthy as it evolves.

---

## I. Quality Must Be Specified Before Functionality

**Foundational discipline: Quality Attribute Engineering**

**Established references:** ISO/IEC 25010:2023 and ISO/IEC/IEEE 42010:2022.

One of the most consequential mistakes in software development is to specify what a system should accomplish without equally specifying the qualities it must preserve while accomplishing it.

A functional requirement might state that a user can save a configuration.

That statement does not establish whether the configuration must survive an application restart, a failed migration, a browser update, an interrupted write, or the loss of one storage mechanism.

These are quality requirements, not merely implementation details.

[ISO/IEC 25010:2023](https://www.iso.org/standard/78176.html) provides an internationally standardized model for specifying and evaluating software product quality. It encompasses characteristics such as reliability, performance efficiency, security, maintainability, and functional suitability.

[ISO/IEC/IEEE 42010:2022](https://standards.ieee.org/ieee/42010/6846/) addresses the systematic description of software and systems architecture, including architectural concerns, viewpoints, and relationships.

Neither standard automatically produces a reliable design. Their importance lies in requiring engineers to reason beyond isolated features.

### The governing principle

**Every important product capability must have explicit quality requirements that survive changes to its implementation.**

For example, saving a configuration should be accompanied by requirements concerning its durability, recoverability, consistency, security, and compatibility across versions.

These requirements should be measurable.

Instead of simply stating that startup must be reliable, define the expected startup behavior, the conditions in which it must remain available, the acceptable latency, and how failures must be reported.

Instead of stating that data must be preserved, define which failures must be tolerated, which recovery sources are required, and what happens when recovery is impossible.

The architecture must then be evaluated against these requirements before implementation begins.

**Why this prevents regressions:** A feature can no longer be declared successful merely because its main function works. It must also satisfy its permanent quality obligations.

---

## II. Correctness Must Be Expressed as Invariants

**Foundational discipline: Design by Contract and Formal Methods**

**Established practice:** Formal specification, state-machine modeling, invariant checking, and techniques such as TLA+.

Conventional testing usually examines particular examples of behavior.

An invariant expresses a property that must remain true throughout every permitted execution of the system.

This distinction is fundamental.

A test may demonstrate that saving a configuration works correctly.

An invariant might establish that no operation may replace an established user's configuration with defaults merely because the authoritative records have become inaccessible.

The first describes a successful example. The second defines a permanent architectural prohibition.

The proper design process begins by identifying these non-negotiable properties.

Examples include:

- An operation cannot be reported as successful without the required completion evidence.
- Missing information cannot automatically be interpreted as an empty or new state.
- An outdated configuration cannot authorize a present operation.
- A failed transaction cannot expose partially committed authoritative state.
- An unrelated subsystem failure cannot invalidate an independently functioning capability.

These invariants should be expressed in the actual domain model, not merely in documentation.

### Formal modeling

State-machine modeling describes the legitimate states of a system and the transitions permitted between them.

A persistent configuration system, for example, might distinguish *uninitialized*, *valid*, *unavailable*, *inconsistent*, *recoverable*, and *recovery pending*.

Every transition must have defined prerequisites and outcomes.

A formal model can then explore combinations that engineers might overlook through ordinary reasoning.

[TLA+](https://docs.tlapl.us/) is one established technique for specifying and model-checking concurrent and stateful systems. It can help discover unsafe sequences before they are translated into production code.

Formal methods distinguish between safety properties—something bad must never happen—and liveness properties—something good must eventually happen under the relevant assumptions.

Both matter.

A system that safely refuses every operation may protect its data but fail its purpose. A system that always makes progress by ignoring integrity problems may appear available while destroying trust.

### The governing principle

**Specify what must always remain true and what must eventually become possible, then verify that the architecture permits both.**

Formal modeling does not eliminate the need for implementation testing. The code must still be shown to implement the model correctly.

But it reduces an important class of design errors: cases where the implementation behaves exactly as written, yet the underlying design permits an invalid state.

**Why this prevents regressions:** Correctness becomes a permanent constraint on future changes, rather than a collection of assumptions that each developer must independently rediscover.

---

## III. State Must Be Authoritative, Durable, and Recoverable

**Foundational discipline: Transactional Integrity and Recovery Engineering**

**Established foundations:** ACID transaction principles, journaling, consistency models, backup verification, and disaster recovery engineering.

Persistent state is not simply information stored on disk.

It represents continuity between the system's past and present.

An application that loses its configuration but continues operating as though it were newly installed has not merely lost data. It has lost knowledge of its own history.

This is especially dangerous when multiple subsystems retain independent representations of the same underlying information.

One may retain an old configuration. Another may lose its records. A third may reconstruct defaults.

Without a defined authority, these mechanisms can produce mutually inconsistent conclusions.

### A single authority, multiple protected copies

An authoritative state model must establish which record governs decisions and which records exist only for caching, observation, or recovery.

Multiple physical copies can improve resilience, but copies must not become competing authorities.

A recovery copy must be independently validated before it can replace authoritative state.

The system must determine whether that copy is complete, compatible with the current schema, and consistent with known user intentions.

An outdated snapshot cannot automatically be treated as current truth.

### Atomicity and durability

Transactional design seeks to ensure that a logical operation is committed completely or not at all.

Where all relevant data resides within one transactional storage system, related changes should generally be committed together.

When an operation spans independent storage systems, a single atomic transaction may not be available.

In that case, the architecture needs a deliberate protocol for tracking what was prepared, committed, acknowledged, and left unresolved.

It must preserve enough evidence to resume or recover safely following interruption.

For multi-step operations, idempotency and explicit recovery or compensation may be appropriate. However, retrying an operation is not automatically safe merely because the previous response was lost.

### Recovery as a product guarantee

Backups are valuable only when they can actually be read and restored.

A reliable system needs verified recovery copies, defined retention and failure boundaries, a documented restoration process, and tests demonstrating that restored information preserves its intended meaning.

Recovery objectives should describe how much data loss and downtime the product is designed to tolerate.

These are related to **Recovery Point Objectives (RPO)** and **Recovery Time Objectives (RTO)** in established reliability engineering.

The [AWS Well-Architected Reliability guidance](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html) treats resilience, consistent change management, backups, failure recovery, and recovery testing as essential design concerns.

### The governing principle

**No established state may be replaced, reconstructed, or forgotten without a validated reason and a controlled transition.**

A missing database is not proof of a new installation.

A valid authentication session is not proof that configuration survived.

An old interface snapshot is not proof that its referenced resources remain current.

**Why this prevents regressions:** Storage inconsistency becomes an explicitly detected and recoverable state rather than an opportunity for accidental reinitialization.

---

## IV. Failure Must Be Analyzed Before It Occurs

**Foundational discipline: Failure Mode and Effects Analysis (FMEA)**

**International standard:** IEC 60812:2018.

Most software development concentrates on the intended sequence of operations.

A more mature discipline examines the consequences when each step fails, behaves incorrectly, produces incomplete information, or fails to communicate its outcome.

[IEC 60812:2018](https://webstore.iec.ch/en/publication/26359) standardizes the planning and application of Failure Mode and Effects Analysis, including the examination of failure modes and their local and broader effects.

The idea is straightforward.

For each important component or operation, engineers systematically investigate:

**What can fail? What causes the failure? What else becomes affected? How will the failure be detected? What prevents its consequences from spreading?**

This analysis should happen during design, not only after users report defects.

### Failure propagation is the real enemy

A storage-read failure should not necessarily disable authentication.

A network outage should not erase a saved destination.

An interface-rendering exception should not silently cancel an unrelated operation.

A stale response should not reverse a newer user decision.

Each of these failures becomes more serious when it crosses an unnecessary architectural boundary.

Fault containment requires that a failure remain within the smallest appropriate scope.

Where safe, the system should continue providing independent capabilities. Where continued operation would compromise integrity, the affected operation should stop explicitly.

This is the difference between graceful degradation and dangerous error concealment.

### Fault injection

Once potential failures are identified, they should be deliberately introduced into the test environment.

A process can be terminated immediately before a transaction commits. Storage access can be denied. A response can arrive late. Two changes can race. A previously valid configuration can become inaccessible.

The question is not whether the program throws an exception.

The question is whether it preserves the required invariants when that exception occurs.

### The governing principle

**Every critical dependency must have a documented failure model and a tested containment strategy.**

The goal is not to predict every conceivable future defect.

It is to systematically identify the most consequential failure modes and prevent local failures from becoming cascading system failures.

**Why this prevents regressions:** Engineers stop assuming that a successful dependency call is the normal case around which everything else can safely be organized.

---

## V. Production Readiness Must Be Proven, Not Declared

**Foundational discipline: Risk-Based Verification and Site Reliability Engineering**

**Established references:** ISO/IEC/IEEE 29119 software testing standards and Google's Site Reliability Engineering practices.

A large passing test suite does not establish that a product is reliable.

It establishes that the product passed the tests that were executed under the conditions represented by those tests.

Those boundaries matter.

A simulated browser environment cannot, by itself, establish behavior under every real browser lifecycle condition.

A successful isolated API test does not prove the complete user workflow.

A configuration test using a freshly created database does not prove that an established installation survives a migration.

The testing program must therefore be structured around risk and independent evidence.

The [ISO/IEC/IEEE 29119 series](https://committee.iso.org/sites/jtc1sc7/home/projects/flagship-standards/isoiecieee-29119-series.html) provides standardized software testing concepts, processes, documentation, and test design techniques.

These can support a disciplined verification strategy without requiring every small project to adopt unnecessary paperwork.

### The evidence hierarchy

Component tests establish local correctness.

Integration tests establish that components communicate as intended.

Fault-injection and state-transition tests challenge assumptions about failure and concurrency.

Migration tests verify continuity across software versions.

Actual installed-environment tests verify that the product behaves correctly under real platform constraints.

No single category replaces the others.

Crucially, the tests used to approve a change should be derived from independent requirements and invariants—not solely from assumptions made while implementing that change.

Otherwise, an implementation and its test suite can agree perfectly while both are wrong.

### Reliability as a measurable outcome

Google's [Site Reliability Engineering practices](https://sre.google/sre-book/service-best-practices/) emphasize defining Service Level Objectives (SLOs) around real user experience and using error budgets to balance reliability against the pace of change.

This principle can be adapted beyond large online services.

A software product can define observable goals for startup availability, successful operation rates, latency, configuration preservation, and recovery behavior.

The numerical targets should be based on product requirements and evidence, not selected merely because they look impressive.

When critical reliability goals are repeatedly violated, unrelated feature development should slow or stop until the underlying causes are corrected.

### Release gates

A change should be eligible for release only when the relevant quality requirements, invariants, migrations, failure scenarios, and production-environment checks have been satisfied.

An incomplete test must be recorded as incomplete, not converted into success.

A failed acceptance criterion must remain visible even if every other test passes.

Every discovered regression should become a permanent test that protects against the same failure class.

### The governing principle

**A release is approved by demonstrated preservation of required behavior, not by the volume of completed code or the number of passing tests.**

**Why this prevents regressions:** It becomes difficult to mistake local implementation success for whole-product readiness.

---

## VI. Bringing the Five Principles Together

These disciplines should not be implemented as five unrelated administrative programs.

They form a single engineering process.

Quality engineering establishes what the product must guarantee.

Formal specification defines the states and invariants required to satisfy those guarantees.

Transactional and recovery engineering preserve their validity across time.

Failure analysis identifies circumstances capable of violating them.

Verification and production readiness establish the evidence required before users are exposed to a change.

The process can be summarized as:

**Define quality → Specify invariants → Protect state → Anticipate failure → Demand evidence.**

This sequence should govern both initial development and every subsequent modification.

For an automated coding agent, the same discipline becomes an execution contract.

The agent should first identify the affected invariants and dependencies, reproduce the relevant baseline, implement the smallest coherent change, test adverse state transitions, compare before-and-after behavior, and report the actual limits of verification.

A change that satisfies its local requirement while violating a higher-level invariant is incomplete.

A change that passes simulated tests but has not undergone required real-environment acceptance is not fully verified.

And a change that removes an error message without resolving the inconsistent state beneath it is not a repair.

## VII. The Higher Principle: Assurance Over Apparent Correctness

These five disciplines lead to a broader architectural philosophy:

**The quality of a system should be measured by the strength of the evidence supporting its guarantees.**

Documentation expresses intention.

Code expresses implementation.

Tests provide observations.

Formal models examine possible behavior within explicit assumptions.

Production evidence demonstrates what happened under actual conditions.

None of these is sufficient alone.

Their value comes from maintaining a consistent relationship among them.

For every critical guarantee, an engineering organization should be able to explain what enforces it, what could invalidate it, how those conditions are tested, and what evidence supports the current release.

This is an *assurance argument*: a reasoned claim supported by inspectable evidence.

Such an argument is never an unconditional proof that all future failures are impossible.

It is a disciplined basis for trusting the product within its stated operating conditions.

The highest engineering standard is therefore not to promise that software can never fail.

It is to ensure that failure has been anticipated where reasonably possible, that unexpected failures are detected rather than disguised, that their consequences are contained, and that the system can recover whenever sufficient trustworthy evidence remains.

---

## Conclusion

Exceptional software does not emerge merely from clever implementation, deterministic algorithms, comprehensive interfaces, or extensive testing.

It emerges from the alignment of requirements, architecture, state, execution, recovery, and evidence.

The five essential disciplines are:

**1. Quality by specification.** Define measurable product guarantees before implementation.

**2. Correctness by invariant.** Make invalid states and transitions explicit and mechanically enforceable.

**3. Continuity by durable authority.** Preserve user intent through transactions, validated recovery, and unambiguous ownership of state.

**4. Resilience by failure analysis.** Anticipate failure modes and contain their consequences.

**5. Trust by verification.** Approve releases through independent, risk-based, production-relevant evidence.

No standard or methodology eliminates every defect. Standards must be adapted to the scale, risks, and architecture of the product.

But applying these principles together changes the fundamental character of software development.

Instead of continually discovering that individually successful changes have damaged the whole system, engineering becomes the disciplined preservation of a small set of permanent truths.

**The best possible product is not the one with the most elaborate architecture. It is the simplest architecture capable of maintaining its guarantees under the widest reasonably anticipated range of conditions.**

That is the foundation of software that remains dependable as it grows.
