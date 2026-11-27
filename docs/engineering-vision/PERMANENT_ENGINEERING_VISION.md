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

## 9. Truth above appearances — discretion above interruption

Never report a successful operation without adequate verification. An accurate partial result is preferable to misleading success; an honest limitation is preferable to an unreliable promise. Truthful state is mandatory, but the amount of unsolicited presentation is the customer's choice.

**Settings → Transfer feedback: Silent / Normal**

- **Silent:** routine progress notifications, success Transmissions, partial-result notices and recoverable-error popups are quiet. Automatic preparation, retry, recovery and verification still occur. Accurate current status, verified results, unfinished items, reasons and recovery controls remain accessible in Queue and the applicable History/receipt views. Do not erase records or suppress necessary user instructions.
- **Normal:** show concise meaningful progress and verified completion, partial outcomes and actionable failure feedback using the existing feedback surfaces and notification preferences. Coalesce messages; do not narrate every internal attempt, poll or Worker repair. For example, “41 of 43 files verified · 2 available for retry” is not full-batch success.
- In either mode, show essential instructions at the relevant interaction when genuinely necessary: required authorization, source reselection, or “Keep the Shelf open while ReDown prepares this upload” when closing would interrupt. No needless forced windows or modal prompts. Silent does not mean false success, hidden actionable state or a weaker engine.
- Reuse the existing notification/visual feedback settings and canonical outcome events. Do not invent a second notification engine, parallel success state or an independent transfer pipeline. Persist the preference across normal lifecycle changes. Preserve existing explicit notification choices when migrating; resolve the exact default and migration consistently with the active product specification rather than silently overriding customers' settings.

The distinction is presentation only: both modes have identical admission, execution, recovery, verification, accounting, Queue, receipts and integrity rules. Required feedback and privacy behavior must be tested in both modes.

## 10. Engineering improvements must compound

Each implementation checkpoint should leave ReDown more coherent, operable, observable, verifiable and dependable. Reuse proven components, consolidate duplicated ownership, and permanently eliminate demonstrated failure classes. Prefer a small set of universal invariants tested across actual entry points to a growing collection of disconnected patches.

Evidence over claims: build and focused tests, actual packaged GUI behavior, installed browser behavior and authorized live-provider verification are separate proof classes. Use existing Laboratory and Python tooling to generate independent manifests, receipts, fault/recovery tests and reproducible evidence. Do not hide failed runs, substitute mock success for production proof or advance through an unaccepted dependency.

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
