# Click2Cloud — REDOWN V3+1

Click2Cloud develops an isolated V3+1 right-click destination engine and Glaciaring Agent Debug API. The canonical menu, pure resolver, native registrar, independent modes, durable configuration, inventory discovery and verified dispatcher are working libraries with a diagnostic MV3 harness. Live saves require an authorized host supplying the existing REDOWN transports and provider session; the standalone harness does not invent those credentials. See [actual evidence and limitations](docs/GLACIARING_EVIDENCE.md).

Run `npm test` for the positive/adversarial suite, `node scripts/demo-glaciaring.mjs` for a complete synthetic menu and two-fault agent receipt, and `node --expose-gc scripts/benchmark-glaciaring.mjs` for matched latency/memory measurements. `node scripts/test-native-chrome.mjs` separately checks real Chromium capabilities and IndexedDB; exit 2 reports an explicit administrator policy block on unpacked extensions. It needs an installed Playwright module, configurable via `C2C_PLAYWRIGHT_MODULE`.

## Invariants

1. **Three independent mode configurations** produce one canonical deterministic menu specification; the same normalized inputs produce byte-for-byte equivalent output. The legacy bootstrap `compileMenu` remains compatible; new hosts use `compileMenuSpec` and `createEngine`.
2. **One real dispatcher** is called by both the Portal UI and the Chrome native context-menu adapter. Nothing is marked successful until the destination provider verifies the upload.
3. **Provider isolation:** Cloudflare R2 exposes Simple, Narrow, Depth; Google Drive, Dropbox, and OneDrive remain flat native leaf entries. Future S3 providers are siblings, never nested under Cloudflare.
4. **Mode isolation:** Simple, Narrow and Depth are independent projections over a shared canonical folder tree. Narrow contains only configured paths; Depth includes all discovered paths to the selected limit (including unconfigured folders); Simple is flat.
5. **No silent ambiguity:** Validation catches duplicate menu IDs, duplicate canonical destinations, label collisions, missing folder nodes, invalid ancestry, and context mismatch before registration; policy-driven conflict handling never silently reassigns saves.
6. **No manual transplant until verified:** REDOWN's current engine remains unchanged during development. Replace it only after fixture, compiler, Portal E2E, native-Chrome, provider-upload, restart, and rollback tests pass.
7. **Reconciliation:** Chrome menu registration is an idempotent projection of the current specification. On error, surface failure and allow restoring last-known-good state.
8. **Privacy:** Cloud providers receive file bytes, filename/extension and only required metadata—not original page URL, link URL, or browsing provenance.

## Actual R2 test infrastructure

A real bucket named `redown` was created in Cloudflare R2 on 2026-11-03. It contains an isolated testing prefix `__redown_v3plus1_lab__/` populated with 133 zero-byte trailing-slash directory markers. It includes a depth-spine of 15 nested `level-NN` nodes, a 12×4 broad tree, identical leaves under distinct parents, empty folders, mode-isolation branches, and naming edge cases. See `fixtures/R2_TEST_TREE.md`.

R2 stores **objects**, not genuine operating-system directories; trailing-slash marker objects make empty virtual folders visible. **Do not erase or rewrite unrelated bucket contents.**

## Intended architecture

```
Provider discovery -> canonical tree -> validated configuration -> pure compiler -> MenuSpec
                                                                        |-> Portal renderer (real saves)
                                                                        |-> Chrome native adapter
Both renderers -> shared SaveIntent dispatcher -> provider byte upload -> verified receipt
```

**Golden right-click atlas:** [500 source-linked scenario descriptions](docs/milestones/V3P1_GOLDEN_500_SCENARIO_ATLAS.json) (337 contract cases + 163 new user journeys). **Codex follow-up:** [expand to 1,000 without filler, implement independent oracles and execute the real engine](docs/CODEX_EXPAND_GOLDEN_500_TO_1000_AND_VALIDATE_V3P1.md). These are **test specifications**, not claims of 500 or 1,000 passing tests. The real Chrome/cloud/performance/rollback gates remain mandatory.

## Pre-launch Scenario Laboratory — release-blocking milestones

**Owner requirement:** [M0–M10 Universal Scenario Laboratory milestones](docs/milestones/V3P1_SCENARIO_LAB_PRELAUNCH.md), modeled on REDOWN's thin Python → authorized extension → Universal File API testing approach. A [machine-readable baseline inventory](docs/milestones/V3P1_CONTRACT_SCENARIOS.json) captures **337 existing behavioral contract cases, 27 illustrative API operations, and 7 acceptance examples**, all honestly marked unverified until individually mapped to tests and required proof.

The future agent/CLI runner must call the **actual V3+1 JavaScript engine and REDOWN Universal File API adapters**, not a parallel mock implementation. Deterministic property, scenario, state-machine, combinatorial and fault-injection tests validate logical behavior; installed Chrome, authorized live provider receipts, REDOWN migration and latency remain **separate mandatory acceptance gates**. Every scenario must have an inspectable PASS/FAIL/PARTIAL/BLOCKED/NOT_TESTED/UNSUPPORTED/UNKNOWN verdict, Glaciaring evidence, source revision and replay seed. A failed or missing P0 proof blocks public release. The current 121 passing local tests do **not** satisfy the unrun prelaunch catalog.

## Project milestones

- [ ] Capture current REDOWN V3 real behavior and compatibility requirements.
- [ ] Implement versioned schemas and deterministic pure menu compiler.
- [ ] Build reusable live R2 tree discovery, pagination, and safe folder creation.
- [ ] Implement Portal with live image context menu and actual provider save pipeline.
- [ ] Develop repeatable fixture, property, integration, Chrome E2E and provider verification tests.
- [ ] Prove restart recovery, idempotent registration, collision behavior and account sign-in gating.
- [ ] Integrate into REDOWN behind a removable feature flag with rollback.
- [ ] Remove legacy menu engine only after verified parity and migration.

This repository is a separate development track, not REDOWN's production branch.

## V3+1 Universal Engine API contract

The complete, editable [V3+1 Universal Engine API & Behavioral Contract](docs/V3P1_COMPLETE_CONDITION_TO_BEHAVIOR_CONTRACT.md) specifies state detection, real API operations, dashboard Refresh/Activate behavior, independent Simple/Nested/Depth engines, Chrome menus, live saves, other providers, failure recovery, security and transplant acceptance. This is a target specification, not an assertion that every capability is implemented. Follow the [autonomous Codex runbook](docs/CODEX_AUTONOMOUS_V3P1_RUNBOOK.md) and its [implementation request](docs/CODEX_BUILD_REAL_V3_PLUS_ONE_NOW.md).
