# Glaciaring implementation and acceptance evidence

Implemented on `feat/glaciaring-agent-debug`, starting at `da81723333667242ebecddcacb8be00c3c2daa97` (`docs/glaciaring-agent-debug`). This is working isolated engine code and a diagnostic lab harness, **not a production transplant or a claim of complete live acceptance**. Evidence was collected on November 3, 2026, America/Chicago.

Implementation commit: `3a9e4a3897872f494c8394ed2f5e33e47a38991a`. Benchmark collection preceded this commit, so its Git HEAD field names the starting revision; every recorded implementation source SHA-256 was subsequently checked against the committed files and matched. The evidence is for those exact file hashes, not the unmodified starting source.

## Reproduce and inspect

```sh
cd /workspace/Click2Cloud
npm test
node scripts/demo-glaciaring.mjs
node --expose-gc scripts/benchmark-glaciaring.mjs
node scripts/test-native-chrome.mjs
```

The last command needs installed Chromium/Playwright; `C2C_CHROMIUM` and `C2C_PLAYWRIGHT_MODULE` select their paths. Exit **2** with JSON `BLOCKED` preserves the administrator's unpacked-extension policy. The runner still executes independent real-browser tests. No commands above write to providers. The native runner creates and removes its own temporary static loopback fixture server, browser profile and staged extension; it exposes no diagnostic HTTP service.

`npm test` now executes actual cases in-process, rather than accepting a file-only child-process result in this executor. A deliberately failing assertion was verified to exit 1. The pinned starting source, exported to a temporary directory, separately passes **26** actual baseline cases. The final implementation passes **121**, with no skips or expected failures; see [full output](evidence/test-results.txt).

## Implementation ownership and coverage

[The machine-readable observability inventory](evidence/observability-inventory.json) contains checkpoint ownership, source/test anchors, reason vocabulary and explicit partial/unobservable boundaries. Its provider branch inventory maps the preserved REDOWN adapter's material rejections to typed child signals. Gateway observations do not certify hidden provider/Chrome internals. A catalogue status of `partial` remains partial even when the source-owned unit tests pass.

| Area | Working code and evidence | Result / remaining limit |
|---|---|---|
| Canonical menu, omissions, identities | `src/core/menu-{identity,spec}.mjs`; full tree paging, immutable generations, stable item/action identity, exact account/container/prefix binding, structural diffs; `tests/canonical-menu.test.mjs`, committed `tests/fixtures/menu-golden.json` | PASS logical fixtures, depth 20, repeated names, explicit Home save and independent flat peers. Unknown/incomplete inventory is disclosed. |
| Independent modes | `src/modes/{simple,nested,depth}/index.mjs`; own schema, revision, validator, migration, projector; replacement/CAS/isolation tests | PASS local configuration and projection. Mode migrations are v1 schema migrations, **not full production legacy V3 migration**. |
| Native registration | `src/chrome/registrar.mjs`; one owner/listener, serialized parent-first callback ACKs, per-row generation/epoch evidence, retries, immutable bindings, stale/colliding generations rejected, missing child detection | PASS injected Chrome contract tests. **BLOCKED installed extension** by administrator policy; no native registration/render/click proof claimed. |
| Human/agent pairing | `src/chrome/mirror.mjs`, shared `action-resolver.mjs`, `extension/`; same canonical rows, text-only DOM labels, zero-write simulation | PASS resolver and real browser 58-row DOM mirror. DOM parity is separate from native Chrome UI. |
| Inventory and file operations | `src/inventory/discovery.mjs`, `src/explorer/observed-api.mjs`; extracted API reuse, fair scoped frontier, repeated-cursor detection, resumable pages, safe subtree completeness, all supported operation gateway outcomes | PASS partial/failing/descendant-first/budget/cancellation fixtures. Listings grant no authorization or Worker readiness. Actual five-bucket discovery BLOCKED by missing authorized provider host. |
| Capture and dispatch | `src/core/{engine,source-capture,save-dispatcher}.mjs`; current authorization before capture and upload, native generation race checks, exact original bytes/minimal destination metadata | PASS positive/adversarial integration, debug off/on/throwing parity. Current capture is bounded whole bytes (32 MiB default), not an uncapped streaming-size claim. |
| Provider verification | `src/explorer/save-provider.mjs`; original REDOWN upload/staging path, final exact-parent KEEP BOTH validation, independent stat → byte stream comparison → stable stat | PASS actual extracted R2 adapter with injected Worker/HTTP protocol, including extra/short/mismatched/stalled readback and false receipt. **BLOCKED live authenticated provider receipt/readback.** |
| Authorization, entitlement, activation | Existing dashboard/bridge owners instrumented without sender bypass, read-only Refresh, separate partial/auth/capability outcomes, independent failures retained | PASS guards/control contracts. Real existing session, entitlement and activation service remain external trusted-host requirements. No new OAuth, billing or duplicate provisioner. |
| History and feedback | One injected `onVerifiedCompletion` handoff only after independent verification; actual failure callback independent of Debug Mode; uncertain writes never replay automatically | PASS local handoff/failure tests. Actual REDOWN History/counters and exactly-once recovery across live suspension remain BLOCKED/NOT_TESTED. No second History DB. |
| Persistence | `src/persistence/`; adapted REDOWN transactional CURRENT/journal, independent modes, desired/applied fences, daily checkpoints, explicit AES-GCM backup, strict schemas, empty-store restore with renewed auth/ACK | PASS Node and **8 real Chromium IndexedDB assertion groups**, including concurrent CAS and interrupted transactions. Cold IDB connection reopen is not full browser/MV3 restart. |
| Diagnostics | `src/glaciaring/`; optional fail-open capture, 512 × 63-byte fixed slots, typed provenance/dependencies, all independent faults, missing/stale/dropped/evicted/expired/overflow gaps, bounded query snapshots | PASS fault encoding across every declared checkpoint plus owner-level negative tests. Buffer loss never becomes health. Signals are volatile across worker restart, with explicit gaps. |
| Agent API and handoff | `describeEngine`, `inspectMenu`, `inspectOperation`, `getDiagnosticSnapshot`, `simulateMenuAction`, `diffMenuGenerations`, `exportReceipt`; strict local sender/document grants, expiry, separate one-use export grants, aliases and paged gap storms | PASS API/security fixtures, >1,000-gap retrieval, per-page export caps and zero provider effects. Installed extension host interaction remains blocked by browser policy. |

## Concrete agent demo

[The runnable demo and complete receipt](evidence/agent-demo.json) contain the full readable public synthetic tree, every paginated agent menu/omission row, a selection resolved through the same pure resolver, and all available diagnostic pages. It performs **zero capture, provider writes, History writes or success effects**.

Operation **700** has an observed Worker `CAPABILITY_MISMATCH`, explicitly dependent blocked upload and skipped completion, plus an intentionally absent verification checkpoint. Operation **701** independently reports `RECEIPT_MISMATCH`. Both candidates survive the receipt; the second is not falsely attributed to the first. Every candidate points to source/tests, with missing observations and partial inventory retained. Exports for real private menus use aliases; this demo's readable raw names are public fixture data only.

## Performance evidence

[Final measured distributions](evidence/performance-final.json) record p50/p95/p99, paired deltas, cold-instance samples, memory, occupancy, evictions, export cost, source SHA-256 fingerprints and environment. Node 24.22.1 / Linux x64; 120 warm samples per variant plus warmup, balanced six-permutation disabled/passive/debug ordering. Capture and fault corpus are identical across variants. Explicit Debug Mode uses the same compact capture; query/export work is deferred.

**Overall performance acceptance remains FAIL.** The first optimized balanced run passes the provisional Node/injected-Chrome performance gates, but the [same-source repeat](evidence/performance-repeat.json) fails compile p95: passive reference +2.95 ms (1 ms allowance), passive 1,000-folder +15.56 ms and Debug +11.00 ms (2.65 ms allowance). These are unresolved wall-latency regressions in the measured gate, not waived as noise. Normal click, native-API fixture Apply, memory, export and capture-integrity gates pass in both optimized runs. A controlled-runtime investigation is still needed to distinguish capture cost, GC and scheduling variance; repeated low-overhead acceptance is **not established**. Click-handler-to-injected-dispatch passive **paired delta p50 0.00011 ms, p95 0.05713 ms, p99 0.12844 ms**, excluding source/provider network work. Normal event backing storage is **32,256 bytes**; the measured heap-plus-backing estimate is **58,960 bytes** per instance. A 512-event authorized export took **9.04 ms p95**, with **23,220 bytes maximum page / 185,452 bytes total**. The repeat passive paired click deltas are p95 **0.08574 ms**, p99 **0.17392 ms**; heap-plus-backing is 59,413 bytes and export p95 11.21 ms. Source-defined signal drops were **0**; expected ring evictions are explicitly recorded, including 48 after 560 compile events and 512 after the 1,024-event retention exercise.

These measurements have substantial shared-host scheduling/GC variance: the 359-row compile p99 increased from 22.77 to 25.06 ms in the optimized run even though its p95 gate passed. Negative p95 deltas do **not** establish a speedup. Earlier failures and the intervening pass are preserved, including the [pre-optimization balanced pass](evidence/performance-before-id-optimization-pass.json) and its [failed same-source repeat](evidence/performance-before-id-optimization-repeat-fail.json), where the 1,000-folder Debug compile p95 delta was 14.34 ms against a 5.32 ms allowance. That failure prompted an exact split-32-bit FNV1a64 optimization, removing per-byte BigInt work without changing a single ID or reducing coverage; randomized Unicode/surrogate/long-string oracle tests and committed goldens prove compatibility. Other earlier runs: [unknown-vocabulary failure](evidence/performance-before-vocabulary-fix.json), [pre-balanced-order compile failures](evidence/performance-before-balanced-order.json). They are not erased by the final result. Installed-Chrome timing, cold MV3 timing and reduced agent iteration counts remain **NOT_TESTED**; no production “negligible overhead” claim is justified by Node fixtures alone.

## Provenance, external gates and safety

Read-only REDOWN reference: commit `89211efc08bfb6f4370f9293cc98ebea2050f859`. Reused transaction/ACK/readback patterns were inspected in actual source. The protected extracted files remain byte-identical:

| File | Git blob |
|---|---|
| `src/explorer/file-api.mjs` | `3feb05ad7ce54e9e0a2c502f81b1a13e19852481` |
| `src/explorer/configuration.mjs` | `cacd58e7e516c82237be2fb13b511695384ebd9c` |
| `src/explorer/r2-adapter.mjs` | `f40d7c848d8d5d4cc5b45b6d99a9bf86f0ff6727` |

`cloudflare-api.js`, the lab Worker, Wrangler deployment settings and REDOWN production were not changed. The historical REDOWN `remoteIngest` still forwards a source URL; its wrapper reports `PROVENANCE_SHARED_LEGACY`. The new save dispatcher forwards bytes/minimal metadata and does not label legacy remote ingestion provenance-free.

[Actual browser evidence](evidence/native-chrome.json) is **BLOCKED** with `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR`; browser policy was not changed. Native completion requires an administrator-approved Chrome profile that permits installing this isolated extension. Real provider verification additionally needs the existing authorized host session/transport and scoped lab access. This instance reports no configured provider secrets, runtime bindings or outbound identities. Existing Git HTTPS authentication works; no token was requested or copied. Service bindings do not substitute for provider authorization.

No production deployment, public Worker route, new OAuth consent, billing change or cloud object mutation was performed. Full legacy V3 import/transplant/rollback and actual provider leaves/History in REDOWN remain separate uncompleted acceptance gates; per-mode schema migration and encrypted local restore do not claim those proofs. The compile-tail performance gate is also **FAIL**, pending further reproducible profiling. Because these gates are open, the owner's full **DONE** definition is not claimed. This branch is reviewable working code with explicit remaining acceptance work, not a production-ready release.

Environment `start_skill` was saved with tested working directories, startup/validation commands, authentication limits, the no-worktree rule and browser-block semantics. No dependency installation was needed. Draft persistence does not publish a snapshot: review/save the environment settings and publish through the product when desired.
