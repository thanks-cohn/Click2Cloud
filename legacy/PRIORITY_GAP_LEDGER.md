# V3 lessons → V3+1 priority gap ledger

This is the quick Codex triage view; read the area-specific documents for mechanism and source. A **gap** can be a missing specification, an incomplete reference model, or missing integration/evidence. **No status below claims the installed new engine already works.**

| Priority | Legacy evidence / lesson | New owner | Current status / necessary next action |
|---|---|---|---|
| **P0** | Current Click2Cloud prototype compiler rejects same-label siblings and duplicate Narrow target paths, despite latest owner allowing both | **New per-mode menu compiler** | **DIRECT CODE CONFLICT**: preserve unique record/action IDs and duplicate visible labels/targets, do not copy old de-duplication; see [new-repo conflicts](CURRENT_CLICK2CLOUD_CONFLICTS.md) |
| **P0** | Old `migrate()` merges two distinct aliases if profile, prefix and label match | **Migration** | **NOT COVERED IN RUNTIME**: preserve every original ID, provenance and rollback; test exact duplicate-title+path records and parentId |
| **P0** | V3 shared rightClickV3 array and mirrored direct writers can clobber states | **Mode config + storage** | **CONTRACT ONLY**: per-mode CAS revisions and one durable authority; multiwindow/IDB+mirror fault injection |
| **P0** | Dropbox composer depends on Google Drive; OneDrive further chained | **Neutral registry** | **CONTRACT ONLY**: per-provider isolated contributions, last acknowledged valid plan, failed-module/bootstrap tests |
| **P0** | Native menu calls are non-atomic, callbacks can be lost; registration ≠ save success | **Registry + History** | **CONTRACT ONLY**: truthful pending/superseded/failed, root/Manage survive, correct exact route on click |
| **P0** | Existing V3 explicit setup creates `redown`, generic Activate Buckets only enumerates | **Simple first-run** | **REFERENCE ONLY**: invoke authorized idempotent onboarding and verified root write, regardless of other buckets |
| **P0** | Existing source URL can flow to Worker metadata, contrary to later owner privacy rule | **Provider upload adapter** | **OPEN**: browser-fetched bytes + minimal filename only; inspect actual outbound payload in authorized test |
| **P1** | Selected Narrow parent with children needs exact `Save here`, sibling alias leaves | **Narrow compiler** | **PARTIAL SPEC**: immutable separate IDs with duplicate text, preserve selected-parent action, test actual native projection |
| **P1** | Old root alias suppressed in Simple; duplicate labels auto-suffixed | **Simple projection** | **INTENTIONAL DIFFERENCE**: owner wants every alias distinct, including identical labels; don't dedupe by path/title |
| **P1** | Folder Browse cold start requires extra click; keyboard/focus handling exists | **Destination Manager** | **SPEC ONLY**: first expansion must fetch lazy children; scoped tickets, focus, keyboard, empty/error/partial |
| **P1** | Depth indexes only selected display depth and has lifetime `known=5000` cap | **Depth indexer** | **UNIMPLEMENTED**: full-known graph independent of visible 1–10, resumable slices, fair budgets and no false deletes |
| **P1** | Current IndexedDB backup/journal real, external encrypted restore and replay incomplete | **Storage + Time Machine** | **REFERENCE/CONTRACT**: immutable segment lineage, adaptive snapshots, verified external private backup/restoration |
| **P1** | Change to R2 permission/Worker after cached plan can leave stale authorized-looking row | **Provider readiness + registry** | **OPEN**: revalidate exact connection/account/bucket scope on action, reject no-route/expired |
| **P1** | Native limit and branch partial truncation can strand actions | **Narrow + Depth projector** | **PARTIAL**: parent+Save here atomic budget, root fairness, More destinations discoverability |
| **P2** | V3 coalesces same paths; owner once proposed two distinct named *whole* branches | **Future Narrow feature** | **UNRESOLVED/ADVANCED**: separate branch-instance IDs only if owner approves, outside minimalist navigator |
| **P2** | Existing UI supports F2/keyboard/roving focus; new minimal interface might drop them | **Destination Manager** | **NEEDS ACCESSIBILITY QA**: preserve keyboard, screen reader semantics, reduced motion and scroll |
| **P2** | Two independently named entries can share a title, making native UI visually ambiguous | **Manager + registry** | **OWNER-APPROVED IDENTITY**: keep exact duplicate title and action IDs; disclose targets in Existing Destinations |
| **P2** | V3 history export and “what existed” diverge from full RFIS identity history | **Time Machine** | **CONTRACT ONLY**: independent file biographies, observedAt truth, metadata ≠ recoverable file bytes |

## Immediate Codex reading sequence

1. [Narrow](narrow/README.md), [Simple](simple/README.md), [Depth](depth/README.md), [Manager](destination-manager/README.md).
2. [Storage and migration](storage-and-migration/README.md) and [native registry](registry/README.md) **before** choosing a new database or writing Chrome action handlers.
3. [Providers](providers-and-saves/README.md) and [Time Machine](time-machine/README.md) before declaring a generalized multi-cloud architecture.
4. [Verification](tests-and-release/README.md) before any PR is proposed for REDOWN production.

**This folder is an evidence-backed difference map, not a request to rebuild all V3 features at once.** Each gap should land as a focused independently testable change with explicit source parity, mode isolation and rollback.
