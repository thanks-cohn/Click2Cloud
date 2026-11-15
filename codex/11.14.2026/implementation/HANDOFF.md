# IT WORKS — and here's what now works better.

Implementation branch: `fix/narrow-bucket-speed-depth-2026-11-14`, starting at requested review HEAD `fbb0a2514b1ccbe45ed49abecb4b5e541fb7ae09`. Clean initial checkout. Protected annotated tag `click2cloud-rightclick-v3-live-verified-2026-11-14` still resolves to `156ed15c0de5afe3c6d59f4a635db23962ab8600`; only the task document differed at the start. The final response records the new local commit SHA. Nothing was pushed, merged, deployed, or retagged.

The owner's **IT WORKS — 37/37** remains historical live evidence (Simple 6, Narrow 6, Depth 25). This environment has no owner Chrome profile, baseline RAW export, authorized live session, or complete original 37-location manifest. It cannot independently replay those exact live destinations or claim another 37/37 Windows/R2 pass.

## Narrow: BEFORE → intended → AFTER

Before: `Cloudflare → C2C-QA → Narrow → A/B/C`, with the second bucket becoming `C2C-QA (2)` and presentation titles such as `C2C-QA2/Narrow/A`. Physical keys were already distinct and correct. The composite compiler discarded uncustomized root placements; the Narrow projector emitted Save here only for explicit configured branch destinations.

After (generated native plan and callback ACK fixtures, not installed rendering):

```text
Cloudflare
├── click2cloud-qa
│   ├── Save here                         prefix ''
│   └── C2C-QA
│       ├── Save here                     prefix C2C-QA/
│       └── Narrow
│           ├── Save here                 prefix C2C-QA/Narrow/
│           ├── A                         prefix C2C-QA/Narrow/A/
│           ├── B                         prefix C2C-QA/Narrow/B/
│           └── C                         prefix C2C-QA/Narrow/C/
└── click2cloud-qa-2
    ├── Save here                         this bucket, prefix ''
    └── C2C-QA
        ├── Save here                     this bucket, prefix C2C-QA/
        └── Narrow
            ├── Save here                 this bucket, prefix C2C-QA/Narrow/
            ├── C2C-QA2/Narrow/A           this bucket, physical .../A/
            ├── C2C-QA2/Narrow/B           this bucket, physical .../B/
            └── C2C-QA2/Narrow/C           this bucket, physical .../C/
```

The second bucket's custom leaf titles remain presentation only. [Native plan comparison](native-plan-comparison.json) contains each generated ID, native parentId, physical target and selected provenance. Tests additionally ACK actual plan properties through fixture Chrome callbacks and resolve every root/intermediate/leaf to its exact target. Local workerd/R2 integration saves and independently reads root/intermediate Narrow bytes. Real Windows-native presentation and actual QA bucket metadata are NOT VERIFIED.

No config migration or saved record rewrite. Root display aliases are retained in configuration but no longer replace the physical bucket boundary; exported selected provenance reflects the title actually displayed. Stored presentation IDs, level flags, target bytes, Default and Quick remain intact. Native item IDs can change with structural parents; stale generations are rejected. Multiple accounts with the same bucket name are explicitly scope-disambiguated. Independently configured duplicate presentations remain separate, and explicit branch destinations avoid duplicate synthetic Save here actions. Hidden rows contribute no synthetic ancestor. Quick-only promotions leave no orphan structural actions. Hide All retains actual bucket plus deepest configured action. All eight mode combinations and Flat remain covered.

Ancestor presentation is not authorization: explicit/cold refresh checks exact visible curated ancestors, read-only, with at most four concurrent checks. No unrelated discovery or setup. Missing exact capability leaves Save here disabled (`NARROW_ANCESTOR_AUTHORIZATION_REQUIRED`), without automatic setup. Runtime resolver and signed transport still require the exact current target. Prefix-restricted Workers may allow an intermediate folder while denying root.

## Before/after timings

Controlled Node fixture, **12 samples per row per version** (144 saves each), same archived baseline/current production transport and Depth wrapper. Each request models 20ms latency; small/large source+write work models 5/25ms. Cold adds a stated 15ms modeled boot delay. No real image bytes, DNS/TLS, Chrome startup, source host, cache, or Cloudflare latency is measured. This isolates redundant readiness round trips; it is not a live benchmark. Simple/Narrow here deliberately use the uncached authorizer as a control; the real background already has a 10s exact-target readiness cache, so these absolute timings are not a prediction for those modes.

Total fixture click-to-independently-verified response, **p50/p95/max ms**:

| Mode | Condition | Bytes | Before | After |
| --- | --- | ---: | ---: | ---: |
| simple | cold | 1024 | 165.8/241.3/241.3 | 167.3/252.3/252.3 |
| simple | cold | 1048576 | 185.0/211.1/211.1 | 186.7/241.1/241.1 |
| simple | warm | 1024 | 151.7/191.8/191.8 | 150.7/221.0/221.0 |
| simple | warm | 1048576 | 169.3/220.4/220.4 | 170.7/226.4/226.4 |
| nested | cold | 1024 | 165.6/181.9/181.9 | 166.9/202.5/202.5 |
| nested | cold | 1048576 | 184.3/240.6/240.6 | 185.6/231.4/231.4 |
| nested | warm | 1024 | 149.1/152.4/152.4 | 152.8/191.0/191.0 |
| nested | warm | 1048576 | 170.2/209.1/209.1 | 169.7/187.5/187.5 |
| depth | cold | 1024 | 184.5/198.4/198.4 | 83.3/132.6/132.6 |
| depth | cold | 1048576 | 204.6/250.5/250.5 | 103.1/104.2/104.2 |
| depth | warm | 1024 | 170.4/239.4/239.4 | 67.6/112.4/112.4 |
| depth | warm | 1048576 | 190.1/242.0/242.0 | 88.4/90.4/90.4 |

Stage breakdown for the warm small-image control (p50/p95/max ms; stages overlap and must not be summed):

| Mode | Stage | Before | After |
| --- | --- | ---: | ---: |
| simple | preRemoteDispatchMs | 84.4/111.0/111.0 | 83.9/154.1/154.1 |
| simple | requestMs | 147.2/158.8/158.8 | 146.3/161.1/161.1 |
| simple | postVerificationMs | 20.9/58.5/58.5 | 21.0/24.6/24.6 |
| simple | intentAuthorizationMs | 21.0/23.0/23.0 | 21.0/37.0/37.0 |
| simple | capabilityMs | 0.0/4.0/4.0 | 0.0/7.0/7.0 |
| simple | authorizationRecheckMs | 42.0/77.0/77.0 | 42.0/45.0/45.0 |
| simple | workerRequestMs | 26.0/29.0/29.0 | 25.0/26.0/26.0 |
| simple | verificationMs | 20.0/23.0/23.0 | 20.0/20.0/20.0 |
| nested | preRemoteDispatchMs | 82.6/83.5/83.5 | 84.0/103.3/103.3 |
| nested | requestMs | 146.2/146.7/146.7 | 146.4/155.3/155.3 |
| nested | postVerificationMs | 20.7/24.0/24.0 | 21.2/60.3/60.3 |
| nested | intentAuthorizationMs | 21.0/21.0/21.0 | 21.0/21.0/21.0 |
| nested | capabilityMs | 0.0/1.0/1.0 | 0.0/3.0/3.0 |
| nested | authorizationRecheckMs | 41.0/45.0/45.0 | 42.0/71.0/71.0 |
| nested | workerRequestMs | 25.0/26.0/26.0 | 26.0/31.0/31.0 |
| nested | verificationMs | 20.0/21.0/21.0 | 20.0/26.0/26.0 |
| depth | preRemoteDispatchMs | 103.7/171.5/171.5 | 21.7/45.1/45.1 |
| depth | requestMs | 166.4/182.6/182.6 | 65.5/77.1/77.1 |
| depth | postVerificationMs | 21.0/22.0/22.0 | 0.5/5.3/5.3 |
| depth | intentAuthorizationMs | 21.0/40.0/40.0 | 0.0/1.0/1.0 |
| depth | capabilityMs | 0.0/3.0/3.0 | 0.0/1.0/1.0 |
| depth | authorizationRecheckMs | 41.0/42.0/42.0 | 0.0/5.0/5.0 |
| depth | workerRequestMs | 25.0/26.0/26.0 | 25.0/39.0/39.0 |
| depth | verificationMs | 20.0/21.0/21.0 | 20.0/24.0/24.0 |

[Before](benchmark-before.json) and [after](benchmark-after.json) include stage distributions for every size/condition, clock quality, sample counts and unavailable stages. `uncachedStatusAuthorizationMs` counts only the fallback status authorizer; reused checks are measured inside intent/authorizationRecheckMs, not claimed to cost zero.

Confirmed optimization: Depth's wrapper and repeated registrar/engine/preflight/pending/final authorization were each capable of requesting `/capabilities`. A single gesture now privately reuses its ready observation for up to 10 seconds while every authorization still checks current OAuth session/account, exact prefix, live plan identity/verified proof, signing binding and verifyAuthority. Changed bindings deny; expired/unrecognized observations fall back to fresh status. No persistent/global READY shortcut, grant widening, retry of uncertain writes or Worker code change.

Controlled Depth request count falls **6 → 1 per save**. The real local workerd recovery scenario falls **61 → 37 capability requests** while retaining the same eight saves, two readiness probes, eight operation reads and eight independent verifications. All nine optimized repetitions (three each OFF/BASIC/EXPANSIVE) passed all four registered tests: **36/36**, with 72 completed saves plus nine expected setup/fresh-click blocks. Timing noise in local workerd is substantial; no causal claim of live speed is made from those runs. See [repetition evidence](depth-repetition-summary.json).

The historical 9.56s median / 40.77s p95 and multi-second native pre-dispatch waits remain unmeasured here. Network/source/R2 latency floor, large real image streaming, cold Windows MV3, batch native clicks and remote performance budgets remain NOT TESTED. **Real-world speed improvement is not yet established; this is a measured reduction of the controlled readiness bottleneck.**

## Depth readiness and remaining discrepancies

| Symptom | Reproducer / transition / evidence | Status |
| --- | --- | --- |
| WORKER_SETUP_REQUIRED | Local exact B plan absent → retained approval → B-only setup/probe → new native ACK → FRESH_CLICK_REQUIRED → explicit second click → verified exact B object; A/config/Default preserved | Expected missing-plan case passes; owner's intermittent false-early case UNEXPLAINED |
| NATIVE_APPLY_INCOMPLETE | Local denied/partial callback ACK remains separate from remote state; recovery does not report a save and requests preparation | Failure classification fixture pass; owner's actual native ACK loss UNEXPLAINED |
| AUTHORIZATION_LOST | Isolated recovery repeated OFF/BASIC/EXPANSIVE with signed actual local Worker protocol and independent R2; no occurrence; binding/session/revocation changes deliberately deny | Historical intermittency UNEXPLAINED, not declared fixed |
| Premature readiness / uncertain writes | Setup never replays clicked source. Uncertain verification stays uncertain. Returned Depth outcome now includes selected target on every terminal path | Source implemented and fixture pass; live cycle NOT VERIFIED |
| Recorder counts and export | Existing closed-schema BASIC/EXPANSIVE, quota, reload, cold bootstrap, complete/partial RAW/SECURE export tests retained | Historical 111/88/172 capture gap UNEXPLAINED without original export; no fabricated reconciliation |
| Concurrent test exports | Focused/full suites share deterministic ZIP output filenames; simultaneous suite runs caused ZIP EOF in two focused tests while full passed | Test-run collision diagnosed; final suites run sequentially; no production recorder change |
| Golden fixture | Original Simple/Depth golden metadata predates current contexts/actionKind/presentation IDs | Refreshed only after confirming current Simple/Depth projections equal untouched handoff source byte-for-byte; historical snapshots/maps/tag unchanged |
| Mixed mode duplicate bucket labels | Same physical bucket may appear once per mode; existing deterministic sibling suffix applies to Depth while Narrow retains actual name | Preserved independent mode behavior; no physical scope coalescing |

No original owner profile/state was read or altered; no buckets/objects/Workers/OAuth permissions/credentials were changed. No live cloud credentials were requested. External approval remains necessary for live QA writes. Unpacked extension loading in this environment is blocked by Chromium administrator policy; genuine Shelf test reports BLOCKED, not PASS. Windows/live acceptance is a remaining gate.

## Implementation and reproduction

Canonical owners changed: Narrow projector; composite parent layout; Narrow selected provenance; background ancestor readiness observation; transport gesture proof; Depth native click context; closed diagnostic codes. Source-local API documentation and CURRENT hashes/behavior map are updated; immutable historical baselines are untouched. Focused tests, native fixtures and the reviewed golden fixture are updated for intentional new hierarchy.

Use Node 22+ (validated 24.22.1), `npm ci --ignore-scripts`, `npm run build:extension`, then run suites sequentially. Archive the requested baseline `src` and `right2cloud-module/src` beneath `/tmp/c2c-p1-before` using `git archive fbb0a2514b1ccbe45ed49abecb4b5e541fb7ae09 ... | tar -x -C /tmp/c2c-p1-before`. Benchmark baseline with `C2C_BENCH_SOURCE_ROOT=/tmp/c2c-p1-before node scripts/benchmark-narrow-depth.mjs work/before.json` and current without that variable. `scripts/audit-narrow-bucket-tree.mjs` consumes the same archived source. Neither creates a Git worktree or accesses live resources.

Reusable onboarding install_script/start_skill were saved as a draft (install, build, sequential checks and native-policy limitation). This does not publish or execute them. Review/save in environment settings and publish when desired; no publication is claimed here.


## Final executed checks

| Check | Outcome | Proof class |
| --- | --- | --- |
| Baseline focused suite | 418 passed, 0 failed/skipped | Untouched review source, local fixtures |
| Final `npm run test:focused` | 425 passed, 0 failed/cancelled/skipped | SOURCE IMPLEMENTED / FIXTURE PASS |
| Final `npm test` | 494 passed, 0 failed/cancelled/skipped | Full maintained project tests |
| Standalone module | 49 passed, 0 failed/skipped | Local shared saver protocol |
| Recovery isolated repetitions | 36 passed (9 runs × 4 tests), 0 failed | Actual local workerd/R2, OFF/BASIC/EXPANSIVE |
| Narrow boundary + private readiness checks | 4 + 3 passed; included above | NATIVE PLAN/ACK PASS / revocation and exact target fixtures |
| Production extension build | PASS, stable ID ajppphdiamdobknpamcheohmdbdbeoal | Build artifact only |
| Genuine Shelf acceptance | BLOCKED: UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR | Installed Chromium loading denied, not a rendering pass |
| New Windows / live QA R2 replay | NOT TESTED / NOT VERIFIED | Owner's historical 37/37 remains historical |

Final sequential suite run resolved the concurrent ZIP-file collision without relaxing recorder assertions or changing recorder production code. Source-byte unchanged controls and native tree/provenance regressions passed. Logs and generated archives stay under ignored work/onboarding; durable numeric timing data, repetition results and native plan comparison are committed beside this report.
