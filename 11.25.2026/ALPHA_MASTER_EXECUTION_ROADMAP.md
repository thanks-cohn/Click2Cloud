# ReDown master execution roadmap — dependency-ordered
2026-11-26. Companion to ALPHA_SKILLS_AND_ACCEPTANCE_CHECKLIST.md and STAGE_CODEX_REQUEST.md.

## Purpose and authority
Each completed assignment must make subsequent work easier through reusable production logic, verified contracts, fixtures, evidence or documented interfaces. Public alpha is Right-click → Save to Cloud across Google Drive, OneDrive, Dropbox and Cloudflare R2. Proposed $12/year unlimited ReDown usage, subject to provider limits. Generic S3 deferred. This is a strategic cross-branch roadmap, not an instruction to execute all stages on this branch. The existing stage specification governs Part 3; preserve its owner-approved Part 1 predecessor requirement, its exact scope, and Part 3-before-surface-overhaul requirement. Reconcile the newer roadmap with the historical staged release numbering and owner approval before integration; do not silently merge moving tips or assume alpha readiness.

## Execution sequence
| Order | Assignment | Dependency benefit | Priority |
|---|---|---|---|
| 1 | Automatic error recovery | Shared reliable transfer and publication reconciliation infrastructure | P0 |
| 2 | Automatic receipts and interruption recovery | Durable evidence and diagnostic continuity for subsequent failures | P0 |
| 3 | Right-click and authentication reliability | Dependable core entry points and authorization | P0 |
| 4 | Cloud usage continuity and default redown folder | Persistent account and destination management | P0 |
| 5 | Multi-provider Python Laboratory | Independently testable shared provider contracts | P0 |
| 6 | Comprehensive four-provider acceptance testing | Verified production baseline | P0 |
| 7 | Commercial licensing and alpha packaging | Customer-ready distribution and license recovery | P0 |
| 8 | Final alpha regression audit | Evidence-based release readiness | P0 |
| 9 | Part 3 — Media & Manifest | Reuses verified authorized reads, account bindings and test infrastructure | P1 |
| 10 | Onyx aesthetic refinement | Polishes verified behavior without destabilizing it | P2 |

### 1. Transfer recovery engine
Automatic bounded retries, safe reconciliation before potentially duplicate writes, no blind retries, no duplicate publications or usage deductions, recovery from temporary HTTP failures. Acceptance: 555/555 unique verified publications in deterministic injected-502 regression, including lost acknowledgment cases. Maintain existing durable intent/operation identity; stages 1 and 2 can share a minimal journal contract from the outset.

### 2. Evidence and continuity infrastructure
Automatic local JSON receipts, durable checkpoints, interruption recovery, resumable campaigns, honest uncertain outcomes, authorization-respecting continuation. Preserve existing production interfaces. Provide reusable receipts, fault injection and regression harnesses rather than parallel implementations.

### 3. Right-click and authentication
Cold boots, browser restarts, MV3 suspension, context menu readiness after login, automatic token refresh where supported, reconnection and stable account bindings. Reuse recovery/evidence from earlier stages and verify real UI and production entry points.

### 4. Cloud usage continuity
Persistent free allowance, ordinary uninstall/reinstall abuse resistance without deceptive storage, default redown folder and optional original direct-to-drive mode. Reuse stable account identity, authorization and durable operation accounting.

### 5. Universal Python Laboratory
Extend existing manifest, receipt, verification, authentication and recovery contracts to Google Drive, OneDrive and Dropbox alongside Cloudflare R2. Provider-specific adapters only where required. Shared production logic, internal development tooling, no unnecessary public-facing controls.

### 6. Four-provider acceptance testing
Thousands of saves as staged acceptance targets, login/restart cycles, authorization failures, reconnections and long-duration operation. Independent destination/content verification where supported, bounded QA grants/costs and synthetic files. Record actual results, not extrapolated passes. Detailed targets in ALPHA_SKILLS_AND_ACCEPTANCE_CHECKLIST.md.

### 7. Commercial infrastructure
Proposed $12 annual license, free allowance enforcement, paid license recovery, privacy and permissions, applicable store compliance, public alpha packaging. Preserve working features in development; alpha surface should be intentionally minimal.

### 8. Alpha release audit
Verify ordinary customer workflow: connect cloud, right-click, save, confirm. Regress protected behavior and obtain owner acceptance; no automatic public release. One feature. Four clouds. Right-click. Save. Done.

### 9. Part 3 — Media & Manifest
Existing dedicated branch and authoritative STAGE_CODEX_REQUEST.md. MP4/WebM video, MP3/WAV/M4A audio, authorized remote streaming and seeking, Screenshot Manifest import/export, atomic configuration restoration and shared programmatically verifiable interfaces. Complete required predecessor integration and inherited gates before implementation. Reuse provider reads, auth, resource cleanup and validated account binding/storage. Preserve format restrictions, safety and existing scope. Not a public right-click alpha gate in this strategic proposal.

### 10. Onyx surface refinement
Final aesthetic refinements, animations, navigation, typography and interface consistency. Existing separate surface-overhaul branch remains last; integrate exact approved Part 3 tip and regress prior behavior. Do not redesign the verified engine.

## Branch handoffs
- codex/redown-11-26-2026-cloud-usage-continuity already specifies assignments 1, 2 and 4: execute relevant work in dependency order, do not duplicate specs. Review exact approved integration points before carrying changes forward.
- codex/redown-11-26-2026-fixture-library-mvf45 provides newer Laboratory evidence and infrastructure; assess approved tip and minimal integration, do not assume it is already an ancestor.
- codex/redown-11-25-2026-part-1-priority is the required historical predecessor for Part 3. Retain owner acceptance, ancestry and inherited regression gates; old Part 2 is historical, not an extra stage.
- codex/redown-11-25-2026-part-3-media-manifest hosts this roadmap and the existing Part 3 request. Do not implement unrelated roadmap assignments here.
- codex/redown-11-25-2026-remotes-onyx-makeover remains the separate final surface-overhaul stage.

Every handoff should include exact base/candidate commits, implementation and reusable interfaces, reproducible scripts/commands, test evidence by layer, outstanding blockers, and the next approved dependency. Do not assume a stage passed just because its spec exists. Use focused bounded sessions, not one giant rewrite. Actual branch ancestry and completion must be verified at execution.

## Current progress snapshot
| Item | State |
|---|---|
| Cloudflare live transfer baseline | 554/555 confirmed |
| Durable transfer receipts | Operational |
| Independent location auditing | Operational |
| Automatic error recovery | Specified |
| Automatic interruption receipts | Specified |
| Cloud usage continuity | Specified |
| Right-click reliability audit | Outstanding |
| Multi-provider Laboratory | Outstanding |
| Commercial alpha | Outstanding |
| Part 3 | Specification ready, implementation prerequisite remains |
| Final aesthetic refinement | Deferred |

The 555-file live campaign had one reported HTTP 502 failure and no recorded campaign retry; independent final content hashing is not established by the location audit. The above statuses reflect prior discussion and evidence, not a fresh full repository audit.

Build the engine first. Verify it. Commercialize it. Then expand its capabilities.
