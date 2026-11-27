# Part 2 execution index — single next-task authority
**Owner-directed post-audit revision, 2026-11-27.**
Authorized branch: `codex/redown-11-27-2026-part-2-3-continuation`. Work on its latest verified tip, not historical base branches. Runtime baseline: 0.3.32.5; tested implementation `1627f59e6f759eb80fb2c4d9d5126abde312ecd5`, handoff `ea8e1d8d495fe276de48063b1640340d3c2f7cce`. The newer documentation commits do not change runtime evidence or imply acceptance.

## Current session: 2B.1 — independent Worker and menu readiness
Status: NOT_IMPLEMENTED / NOT_ACCEPTED. All subsequent checkpoints remain BLOCKED by applicable prerequisites.
Read in this order: this index, the active Part 2 CODEX_REQUEST.md, PART_2B_P0_ALWAYS_READY_WORKER_DIRECTIVE.md, existing HANDOFF.md/evidence.json (historical checkpoint), and applicable production source and tests. Read repository AGENTS.md. The master roadmap defines cross-stage order, the active Part 2 request defines detailed behavior, the Worker directive defines the highest-priority first-use invariant, and the active Part 3 request and annex define downstream dependencies. Older commits and prior planning branches are evidence/reference only. Latest owner-approved direction wins; do not execute competing historic branch or stage instructions.

### Immediate deliverable
Investigate actual original REDOWN and current Click2Cloud Worker/readiness/menu paths; record a source-anchored comparison, not conjecture. Repair the actual shared production readiness path. A new or returning user logs in, registers an authorized destination, then uses it immediately via Simple, Narrow or Depth: one save submission, verified completion, no unrelated prior Depth action, no forced Shelf opening after registration, no manual Worker initialization, no unnecessary second click. Reuse working production infrastructure. Keep authorization, exact target, original source and truthful verification.
- Register routes idempotently, handle login/registration/save races, recover or join in-progress preparation, freeze the original authorized intent and preserve source when feasible. Do not let readiness caches or unrelated feature state suppress valid dispatch.
- Coalesce recovery per actual deployment identity/scope; fence stale completions and persist necessary recovery state across MV3 eviction. Healthy Worker reuse, bounded prioritized preparation, no per-directory deployments or speculative busy keepalive.
- Distinguish Chrome MV3, deployed Cloudflare Worker and local Workerd fixture failures. Preserve existing exact-once transport and resource/receipt safeguards.
- Run focused regressions exercising independent fresh Simple, Narrow and Depth flows and returning-user, second target, immediate/raced first save, eviction/reconnect, concurrent preparation and real authorization loss. Test actual menu registration and dispatch and verified content; no initialized-state contamination. Use benign isolated fixtures; report evidence layers, exact executed counts and skipped/blocked tests.
- Scope only necessary supporting fixes. Do not begin universal provider expansion, new shortcut UI, new accounting or Part 3 in this session. If a discovered defect belongs to 2B.2 or 2B.3, record it; fix a minimal prerequisite only when needed for the current repair.

## Ordered checkpoints
| Checkpoint | Output | Gate |
|---|---|---|
| 2B.1 | Source study, independent first-use Worker/menu readiness | Focused regression, packaged tests/build and owner acceptance of relevant actual first-use evidence |
| 2B.2 | **Critical P0: repair and qualify existing IndexedDB source persistence, journal and background scheduler in place**; bounded automatic/manual retry, Queue retention, Shelf lifecycle and startup/resource diagnostics | Prove actual ownership and closure/restart recovery, source preservation and no duplicate publication; shared consumer/Lab behavior; no lifetime retry cutoff |
| 2B.3 | Filename compatibility, Queue Retry/Retry All Failed and expandable source/host links, ordinary Upload button/API parity, partial outcome feedback and failed-child-only recovery | 43-file benign analogue, repeatable retries, durable Queue after restart, source links/privacy, truthful close/open behavior and partial/verified feedback, no duplicate successful children or charges |
| 2B.4 | Integrated reference Windows and authorized R2 qualification | Predeclared repetitions, exact reopened SHA-256, current live 100 round trip, inherited gates; historical missing-artifact decision separately |
| 2C | Account/auth/capabilities/migration and default resolver | Shared real identity and target/fallback behavior |
| 2D | Shared save/retrieval, functional durable local accounting, isolation, Shortcut API, media/manifest foundation | Real local reservations/settlement and tested production contracts before additional providers |
| 2E | Four provider adapters and bidirectional Lab | Provider-specific mapping and independent evidence |
| 2F | RData replicas, reinstall and entitlement continuity | Extend same local ledger; no duplicate accounting system |
| 2G | Integrated durability and dependency closure | Owner-accepted Part 2 candidate and executable dependency ledger |
| Part 3 | V1 integration using accepted Part 2 foundation | Separate accepted-feature and release evidence |

## Session rules
45-minute maximum, not required duration. Prepare handoff by minute 35; push to the designated branch and hand off by minute 45, earlier if done. Deliver a coherent buildable checkpoint and focused reproducible CMD/test commands, not a lengthy agent-run stress campaign. Preserve receipts and previous results. Codex diagnoses/fixes affordable deterministic and packaged failures; owner performs necessary installed Windows/live/extended checks. Mark actual PASS/FAIL/BLOCKED/NOT_TESTED per evidence layer; no hiding failed runs, counting skips as passes or assuming acceptance. Current required gates cannot be waived; missing historical evidence may be substituted only with explicit owner approval and separate equivalent current proof. No unapproved live writes or release.
Update this index with actual candidate SHA, version, change summary, evidence and smallest next blocker at each handoff. Do not advance the active checkpoint merely because a session ended. A blocked owner gate permits only explicitly owner-approved independent work with no dependency on that gate.
