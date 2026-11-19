# Enterprise-Scale Cloud Operations Engine
## Reusable Worker-to-Worker Transfers + Verifiable Operations
**Project:** Click2Cloud (candidate shared foundation for ReDown and the future uni-file API)  
**Status:** Architecture proposal / Codex idea — **not implemented or approved for production**  
**Priority:** P0 architecture evaluation; implementation gated on evidence  
**Date:** 2026-11-18  
**Scope:** Cloudflare R2 first; later extend through provider adapters  
**Baseline:** Click2Cloud implementation `6c401f59667e6a5cf3cac3d90562e85e53e30f6c`; audit archival commit `5657976fb6b66313a9c30b0d8d9959c3e015b223`; protected pre-overhaul tag `pre-r2-worker-overhaul-narrow-explorer-minimal-v0.3.19-2026-11-18` (`c337e41`)

> **Product directive:** Build a cloud operations engine that can grow from one user's right-click save to large enterprises handling many accounts, buckets, objects, simultaneous transfers, and long-running jobs—without sacrificing security, independently inspectable receipts, speed, recovery, or predictable operating cost. We are aiming for a winning general-purpose foundation, not merely making the current per-pair implementation pass a few tests.

**Research-only Codex task — EXECUTE LAST:** [Final read-only Codex architecture decision request](../docs/requests/CODEX_FINAL_READ_ONLY_CLOUD_ENGINE_ARCHITECTURE_DECISION_2026-11-18.md). Run this only AFTER the scoped UX fixes (first) and filename/IndexedDB design (second). Codex must inspect and produce a design/decision in its response; it is NOT authorized to edit either repository or run live cloud changes.

## 1. Evidence that motivated this proposal

**Primary decision source — full comparative audit:** [Click2Cloud vs. full ReDown, 2026-11-18](../docs/evidence/r2-operations-overhaul/Click2Cloud-vs-ReDown-audit.md). This is the direct source for the architectural comparison and recommendations. The audit assessed Click2Cloud `6c401f5` and ReDown `c78babc`; it explicitly found that:

- **Click2Cloud** routes authorized same-account cross-bucket transfers through a **dual-bound Worker**, verifies destination version/size before source deletion, and maintains durable operation claims and short-lived signed grants. Distinct-account transfer is unsupported. Pair Workers consume deployment capacity.
- **ReDown** uses independently authorized source/destination bucket profiles, whose Workers communicate to move data across buckets **and route across distinct accounts**. It returns richer per-item/partial results. Its current transfer path passes a source profile bearer into the destination Worker; that practice should **not** be transplanted unchanged.
- **Both** have a non-atomic check-then-delete exposure for moves when other clients concurrently modify an R2 object; neither should claim atomic cross-bucket moves.
- The audit **did not establish a live speed winner**. Its first recommendation was paired testing in installed Chrome against authorized disposable Cloudflare resources; its second was measuring pair-Worker count/setup cost before extending to cross-account transfers.

**Implementation and testing context:** [R2 operations overhaul handoff](../docs/evidence/r2-operations-overhaul/HANDOFF.md) and [raw local benchmark data](../docs/evidence/r2-operations-overhaul/save-benchmark.json). The handoff reports 546 regression tests and 24 Chromium fixtures passing, but **not live Cloudflare, real installed Chrome menus, or physical cross-bucket operations**. The 1 MiB / 260 ms delayed-source local-workerd p50 improved from 1081/1109/1089 ms to 408/418/395 ms for Simple/Narrow/Depth. Immediate-source results were mixed; these results do **not** measure installed-Chrome click-to-verified latency or enterprise transfer throughput.

**Relevant pinned source for design examination:**
- [Click2Cloud's dual-bucket target routing](https://github.com/thanks-cohn/Click2Cloud/blob/6c401f59667e6a5cf3cac3d90562e85e53e30f6c/src/cloudflare/file-transport.mjs)
- [Click2Cloud Worker provisioning and per-pair plan identity](https://github.com/thanks-cohn/Click2Cloud/blob/6c401f59667e6a5cf3cac3d90562e85e53e30f6c/src/cloudflare/deployment.mjs)
- [Click2Cloud verified file copy/move and source guards](https://github.com/thanks-cohn/Click2Cloud/blob/6c401f59667e6a5cf3cac3d90562e85e53e30f6c/src/cloudflare/files.mjs)
- [ReDown `transferExplorerObjects` / `preparedProfile` source](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/extension/background.js)

**Evidence versus design judgment:** The comparative facts above come from the audit and pinned code. The recommendation to build a reusable Worker-to-Worker **hybrid** is a *proposed engineering direction*, **not** a finding that a new system has been proved cheaper, faster, safer, or reliable at enterprise scale.

## 2. Architectural problem

Today a new Click2Cloud source/destination **bucket pair** may need its own Worker deployment with both R2 bindings. For `B` buckets, a fully connected *directional* arrangement has up to `B × (B - 1)` distinct source→destination pair configurations (e.g. 10 buckets → 90 potential configurations), **not necessarily 90 deployed Workers**: real demand, direction reuse, and implementation choices matter.

That scaling shape can increase deployment counts, setup permissions, management overhead, quota pressure, repair surfaces, and time before a new transfer is usable. Actual cost and provider limits must be measured rather than assumed.

ReDown's **one reusable Worker per bucket** pattern offers a more scalable foundation for routing between buckets and separately authorized accounts, but blindly copying its bearer handoff would weaken Click2Cloud's operation-specific authorization model.

## 3. Target architecture (proposed, subject to spike)

```text
Chrome / Desktop / API client
          |
          v
Authenticated orchestration + durable job/receipt ledger
  - account/tenant boundaries, policy checks, idempotency
  - signed short-lived operation-bound grants
  - queue/scheduler, retry/reconcile, observability
          |
          v
Reusable authorized endpoint agents (not one Worker per pair)
  Source bucket/account Worker  <-- scoped transfer protocol -->
  Destination bucket/account Worker
          |
          v
Independent object/receipt verification + per-item status
```

Core principles:

1. **No per-pair Worker deployment as the default data path.** Prefer reusable, explicitly authorized Workers/agents per bucket, account, or other bounded unit. Compare these granularities experimentally; don't hard-code one-worker-per-bucket without capacity evidence.
2. **Inter-Worker protocol with least privilege.** Authenticate both sides using narrowly scoped, short-lived, audience-bound grants tied to operation ID, authorized source, authorized destination, object set/prefix, allowed verb, account/tenant identity, expiry and replay controls. **Do not pass unrestricted long-lived source profile bearer credentials to destination Workers.** Evaluate capability validation and revocation semantics under session loss.
3. **Cross-account by design, not implicit privilege.** Each account and resource grants its own transfer permission; neither connection inherits authority over the other. Deny unauthorized cross-account/cross-tenant routes, and retain tenant isolation, policy enforcement, auditability, and credential rotation.
4. **Durable orchestration.** Each job and object gets stable identities, state transitions, retry fences, independent read-after-write verification and a reconciliation path for unknown outcomes. Uncertain completion must never be silently relabeled success or blindly replayed.
5. **Streaming, multipart, resumability.** Avoid full-file staging in the Chrome browser. Support large objects above the current single-PUT constraint with chunking/multipart, backpressure, bounded memory and bandwidth, network interruption recovery, and documented provider-specific limits.
6. **Auditable, machine-inspectable receipts.** A versioned JSON/JSONL receipt contract should document inputs, identities (without exposing secrets), planned actions, bytes, object/version identity, independent HEAD/checks, verified outcomes, partial failures, times and costs where measurable. Provide a human-readable rendering too. Distinguish *verified*, *pending*, *uncertain*, *failed* and *skipped*.
7. **Per-object partial success.** Return deterministic status for every object, collision/conflict policy, copy/verify/delete stages, partial move outcomes, and safe user/operator next steps. Borrow ReDown's richer per-item reporting without sacrificing Click2Cloud's durable claims.
8. **Safety under concurrent writers.** Model the R2 check-to-delete race as a real limitation. Investigate version-aware policies, object-generation fencing, immutable staging or alternative workflows. Never claim atomicity absent a provider guarantee; fail safely with explicit receipts.
9. **Operational governance.** Quotas, concurrency limits, tenant isolation, retention controls, log redaction, role-based controls, permission revocation, reversible configuration, and cost/usage telemetry belong in the baseline architecture.
10. **Product isolation.** Do not regress Simple/Narrow/Depth menu routing, File Explorer CRUD, fallback/reconnect flows, Aesthetic API themes, existing save receipts, or native Chrome reliability. A presentation change must not alter transfer semantics.

## 4. Enterprise requirements and acceptance gates

The following are **targets to validate**, not claims about today's product:

| Dimension | Proposed gate / measurement |
| --- | --- |
| Infrastructure growth | Demonstrate Worker/deployment growth at 1, 10, 100 and 1,000 buckets across relevant account groupings; no mandatory deployment per directional pair. Report count, quota headroom, startup overhead and costs. |
| Authorization | Negative tests: wrong account, tenant crossing, grant replay, expired/revoked grants, forged object/path, session change, lost OAuth, compromised endpoint assumptions. No unauthorized object reads/writes/deletes. |
| Correctness | Byte integrity, size/ETag/version where applicable, exact destination, operation ID, no accidental overwrites or duplicate writes, provenance, independent verification, and explicit uncertain outcomes. |
| Throughput | Benchmark 1, 10, 100 and 1,000 concurrent jobs (within safe disposable-resource budgets), varied object counts/sizes and representative network conditions; report p50/p95/p99 and sustained throughput. |
| Large transfers | Exercise small objects, millions-of-object inventories in simulation, multipart large-object tests under actual provider limits, cancellation, resume, backpressure and bounded memory. |
| Failure recovery | Inject lost replies, 429s, revoked access, worker restart, expired grants, source mutation, partial destination write, quota exhaustion and mid-move interruption. Reconcile safely, never silently lose data. |
| Cost & limits | Measure Cloudflare Worker count, requests, CPU, bandwidth, storage, durable state, setup latency, quota use and variable cost at multiple scales. No ungrounded cost promises. |
| End-user reliability | Installed-Chrome right-click + Explorer tests across Simple/Narrow/Depth, root/ancestor saves, reconnect, menus, and fallback behavior; prove unchanged or improved correctness. |
| Service objectives | Define separately for interactive save latency and bulk transfer completion; set numeric SLOs only **after** baseline measurements and workload agreement. |
| Auditability | Every completed or uncertain operation has queryable durable evidence and exportable machine-readable receipts; verify schema and integrity with automated tests. |

Any claimed enterprise-grade result must identify test environment, sample size, fixtures vs live infrastructure, limits, failures, latency distribution, throughput and cost. A green unit suite is necessary but insufficient.

## 5. Alternative designs to compare before committing to migration

A. **Existing pair-Worker approach (control).** Retain current implementation for comparison and rollback. Measure actual pair setup/deployment costs and verify whether pair reuse mitigates growth.

B. **Reusable bucket-to-bucket Workers (ReDown-inspired).** Independent endpoint agents, but replace bearer forwarding with narrow signed authorization. Verify stream path, transfer failure semantics and each side's responsibilities.

C. **Reusable account-level Worker or orchestrated transfer service.** Potentially fewer deployments; evaluate broader binding permissions, tenant isolation, provider API limits, latency and operational complexity.

D. **Provider-native copy/transfer where available.** Prefer native server-side primitives only when their security boundaries, verification guarantees, range/multipart support and cost are understood.

**Decision criteria:** security first, integrity/recovery, infrastructure scaling, provider compatibility, real latency/throughput, complexity, operational cost, and ease of rollback. Record trade-offs and findings explicitly. Do not select an option merely because ReDown currently uses a related pattern.

## 6. Proposed implementation sequence

**Phase 0 — Preserve and measure.** Keep pre-overhaul tag `c337e41` and current implementation `6c401f5` unchanged. Establish live Chrome/Cloudflare correctness for current Explorer operations and all save modes; obtain paired baseline and infrastructure-cost data. Document gaps.

**Phase 1 — Read-only design and threat review.** Compare A–D, review ReDown and Click2Cloud code/evidence, diagram authorization and job states, describe concurrency/race handling, define grants and receipt schema. No deployment or product code changes in this phase.

**Phase 2 — Isolated prototype.** Implement a reusable transfer protocol against **disposable, explicitly authorized** test buckets/accounts; leave existing default paths intact. Add contract tests and deny-by-default security fixtures. Do not migrate real user data.

**Phase 3 — Correctness and scale gates.** Complete fault-injection, multi-account, large-object, load, cost and side-by-side benchmarks; produce versioned evidence and objective go/no-go review.

**Phase 4 — Controlled opt-in.** Feature-flag by verified connection/account, preserve existing pair path as fallback, support reversible migration and read-only status/reconciliation. Require explicit approvals for any new permissions, Worker deployments or live storage mutations.

**Phase 5 — Promote only on evidence.** Make the reusable architecture the default only when audited requirements pass, regression risk is acceptable, realistic workload results justify it, and rollback is verified. Separately evaluate reuse as a common engine for ReDown and uni-file API.

## 7. Immediate Codex deliverable

**First task is a design-and-measurement request, not an automatic rewrite.**

Produce an evidence-linked decision record with:
- precise current per-pair Worker lifecycle, pair count growth, binding and provisioning authority;
- exact ReDown reusable-source/destination transfer flow, credential forwarding risks, partial results and cross-account routing;
- feasible short-lived grant protocol preserving Click2Cloud's operation claims and receipts;
- a comparative prototype/test plan for A–D, including security, scale, latency, throughput, provider quotas, money cost, and rollback;
- prioritized issues, unknowns, recommended architecture, and objective acceptance criteria.

**Explicit constraints:** Do not modify ReDown. Do not silently deploy, broaden authority, expose tokens, delete data, or replace Click2Cloud's current working transfer path. Any implementation must be separately requested, staged, tested, and reviewed.

## 8. Decision record

- **Observed:** Current pair-bound Click2Cloud approach has potential deployment scaling pressure; ReDown supports reusable-profile cross-account routing. Both have verifiable strengths and material limitations. Sources: comparative audit and implementation handoff linked above.
- **Inferred:** A hybrid reusable endpoint protocol *could* avoid pair explosion while retaining Click2Cloud's stronger authorization and durable verification model.
- **Not established:** Which architecture wins in real-world speed, security review, total cost, massive concurrency, or enterprise reliability. Those require new experiments.
- **Proposal:** Evaluate and design the hybrid as a P0 enterprise architecture initiative; do not sacrifice the verified existing behavior while pursuing it.
