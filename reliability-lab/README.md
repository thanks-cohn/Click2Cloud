# REDOWN Reliability Lab — Codex implementation request

## Branch and baseline
Work exclusively on `codex/redown-reliability-lab`. Initial documentation snapshot derives from `codex/redown-0329-visual-refinement` at `8126fc6e294987ebda7f451099d40898cceae954`. Its package.json still reports 0.3.28; the 0.3.29 implementation is not yet present in that snapshot. Do not treat this as a completed 0.3.29 baseline or overwrite the active release branch. Before implementing the lab, identify the completed, tested 0.3.29 commit and incorporate it on this branch with owner approval if needed; record exact baseline and merge ancestry. Do not run release changes concurrently on the same branch. No version bump merely for lab documentation.

## Objective
Build a permanent, repeatable reliability harness for production ReDown operations. Use existing APIs and production pathways, not duplicate engines or fake passing tests. Cover actual Simple, Narrow and Depth modes, including their native Chrome lifecycle, and Cloudflare Explorer create, delete, rename, local Upload menu integration, navigation, receipts, History and Queue. Include Basic providers for their existing remote-save and supported browsing behavior only; do not extend the Cloudflare-only local Upload feature to them.

Read repository instructions, inspect current API contracts and existing scripts, establish baseline before changes. Read TEST-MATRIX.md and REPORTING.md. Counts and thresholds are proposed targets, not observed performance. Use deterministic seeds and reproducible scenarios; parameterize count, seed, concurrency, duration and evidence path. Do not spend live cloud resources simply to attain fixture counts.

## Existing source anchors (verified present at baseline)
- src/explorer/file-api.mjs: createFileApi; methods include mkdir, upload, delete, rename, stat, list, download, createBucket, remoteIngest, etc. Audit exact signatures and result contracts; do not invent new public endpoints.
- src/explorer/r2-adapter.mjs: local-file upload uses temporary staging, size check, byte-for-byte staging readback and final provider receipt (not independent final SHA-256). Independently check final bytes in lab when possible.
- scripts/benchmark-narrow-depth.mjs: production transport/Depth lifecycle with controlled fake transport, simple/nested/depth cases; verify mapping of nested to Narrow rather than assume.
- scripts/benchmark-r2-save.mjs: local workerd/Miniflare production worker benchmark, not live R2.
- scripts/test-native-menu-browser.mjs: headed Chromium unpacked extension, disposable X11 profile, OS screenshots of native menu. Do not equate X11 evidence with Windows evidence.
- scripts/test-native-chrome.mjs delegates to test-product-browser.mjs; distinguish actual native installation and provider proof from fixture behavior.
- scripts/test-scoped-explorer-ux-browser.mjs: production Shelf in Chromium with fixture provider/Chrome transport; narrow viewport coverage. Not live-provider proof.
- Existing menu, history, screenshot, queue, receipt tests, benchmark-history-v2.mjs, assert-reliability-receipts.mjs, test-depth-click-history.mjs, test-queue-v2-browser.mjs, test-screenshot-browser.mjs and test-screenshot-history-url-browser.mjs. Audit rather than assume coverage.
- package.json exposes npm test, test:focused, test:engine-api, test:api, test:browser, test:shelf:extension, test:release-browser, check:api-docs, build:extension. Inspect requirements and run compatible tests from root with Node >=22.

## Layers and execution plan
1. Inventory production call sites and write a coverage map from user action -> API -> transport -> provider -> verification -> Queue/History/diagnostics. Identify unsupported paths explicitly.
2. Run current tests and benchmarks unchanged; capture baseline. Reuse deterministic fixtures, fake IndexedDB, Miniflare and Playwright already present. Add targeted missing assertions, then reusable scenario runner.
3. Fast unit/contract fixtures: high-volume, offline, mock transport faults; no live credentials. Worker integration: production worker with local storage/bindings and controlled HTTP source. Distinguish mocked dependency boundaries.
4. Browser integration: use built extension and disposable profiles; actual login/reauth paths with authorized test accounts when available; fixtures labelled as such. Verify native menu presence, hierarchy, selection, and destination via OS/native input or observation; injected clicks alone do not prove native menus. Exercise real file picker wiring via browser file input with synthetic local files, and keyboard navigation. Windows native Chrome checks are separate when runner is Linux.
5. Opt-in live R2 test campaigns on explicitly authorized QA destinations; Basic live saves only where credentials and isolated destinations exist. Separate live budget, request rate, concurrency, byte cap and timeout; default live OFF. Reconcile ambiguous outcomes before retry. Do not access or mutate personal buckets, change public access, create/delete production resources or rotate credentials.
6. Long-duration soak, restart/recovery and regression comparisons. No promise to execute day-long tests in one Codex session; provide commands and checkpointed resumable runs, actual observed duration and remaining work.
7. Fix reproduced defects narrowly, with failing regression tests first; preserve existing architecture and 0.3.29 design. No broad rewrites or security/permission relaxation. Report all changes and remaining risks. Commit/push only lab branch.

## Safety and cost controls
Use synthetic non-private images with deterministic bytes and hashes. Offline fixtures use no uncontrolled network. Live requires explicit opt-in and verified test account/bucket/prefix allowlist; use dedicated QA bucket only, e.g. click2cloud-qa if owner approves; unique run prefix `reliability-lab/<run-id>/`. Reject empty/root/outside-prefix targets, cross-account operations and unsafe paths. Delete only objects owned and recorded by current run; use manifest and preflight for cleanup; no blanket bucket wipe, no production deletion, no bucket deletion. For create-bucket live tests require separate explicit authorization and unique names; otherwise fixture only. Never automatically retry ambiguous writes/deletes or auth failures. Enforce max live operations, bytes, concurrency, wall time and rate limits; default small smoke 20 writes <=20 MiB and concurrency 1, escalate only with explicit owner approval. Count verification/list/delete requests separately. Stop on safety violation, unexpected costs, unauthorized scope or corrupted data. No secrets in logs or commits. Retain uncertain objects for manual reconciliation rather than blindly clean up.

## Deliverables
- Coverage map and reproducible runner with dry-run/default offline mode; document actual CLI and prerequisites after implementation.
- Scenario-level assertions and deterministic test data; tests for runner guardrails themselves.
- Separate fixture, worker, browser-native, live and manual evidence; JSON/JSONL and readable summary per REPORTING.md.
- Baseline/candidate measurements and prioritized defect register with reproduction and regression tests.
- One command for quick offline smoke and one documented opt-in command for each larger tier. CI quick suite; longer suites explicitly scheduled by owner/CI, not claimed as automatically running.
- Preserve production data and functional APIs. Lab is not a separate product or new upload API.

Release gate: zero observed false successes, wrong destinations, unauthorized destructive actions, silent data loss or duplicate committed objects for same operation identity; zero unresolved critical reliability regressions in mandatory tests. Block release on missing mandatory evidence rather than marking skipped as passed. No claim of guaranteed year-long reliability from finite tests.
