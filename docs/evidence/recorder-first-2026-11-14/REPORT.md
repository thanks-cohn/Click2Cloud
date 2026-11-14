# Recorder-first repairs — implemented and verified on the available host

**Result:** complete one-click ZIP export, native recorder identity/proof joins,
and available measurements/recovery are repaired. Available-host integration is
green. **Installed Chrome, Windows and LIVE_R2 remain NOT VERIFIED; NOT READY FOR
FINAL ACCEPTANCE.** The separate Windows Depth cause remains unresolved and did
not block these independent repairs.

Request read from main `7fe3a0c815280e6c605452d66d77020410c91c75`. New branch:
[`review/recorder-first-complete-export-2026-11-14`](https://github.com/thanks-cohn/Click2Cloud/tree/review/recorder-first-complete-export-2026-11-14),
created from verified remote `review/sequential-depth-recorder-2026-11-14`
`7f6808eef170933c1a793c021c2564118a5d6be3`, not main. Final implementation SHA:
`5d79d238aef2f953aed20826d829987b9399943a`; later commits contain test/evidence/handoff
only. The delivery response supplies the final review/report tip.

## Acceptance ledger

| Phase | Implemented files / source cause | Baseline / after | Outcome and environment |
| --- | --- | --- | --- |
| A | recorder-panel, recorder export/storage/host, archive-stream: UI exposed one internal segment and an unclicked anchor; cursor position was not explicitly distinguished from durable sequence | Baseline one export click fetched one page, zero downloads; repaired UI downloads 0/102/10k/100k entirely in one action/file, independent hashes/CRC/count/CSV checks | PASS — Node + real Chromium UI/IDB/download, fixture messaging ports |
| B | registrar, host, provider-observation, transport, schema: cold click observed row before hydration; host retained that initial binding; verification adapter accepted flags without correlated HEAD proof | Two baseline failures → repaired tests; actual listener→host→engine→transport→workerd/R2→terminal→Basic/Rich/export truth table | PASS — NODE_FIXTURE, actual local workerd/R2, memory recorder ports |
| C | recorder/schema/storage, engine completion observations, passive observer utility, startup buffering: timings omitted, source timestamps replaced, generic missing reasons; restart reservation gaps could duplicate | Baseline 0/2; final affected set 44/44; subsequent expanded focused suites 418/418; real IDB migration/restart/cancel/interruption/late-commit checks | PASS — Node + HTTP browser/IDB fixtures |
| D | closed diagnostic vocabulary, 512 MiB payload bound, selected-run snapshot guard, browser harness activation fence | First focused 415/416; corrected 416/416 then four 418/418, last two final production source. Build + 55 module/MV3/authority tests pass | PASS available-host integration; CHROME_INSTALLED BLOCKED by administrator policy |
| E | Existing Depth diagnostics retained; no speculative auth fix | Fresh OFF/BASIC/EXPANSIVE isolated 4/4 each, no local request errors; Windows unavailable | UNRESOLVED — WINDOWS OWNER TEST REQUIRED |

Source commits, each kept independently reviewable:

- [7886aa1](https://github.com/thanks-cohn/Click2Cloud/commit/7886aa1c3d4b3a6915d5c322cd991b7b4b150349): complete one-action snapshot ZIP.
- [bc1eb5f](https://github.com/thanks-cohn/Click2Cloud/commit/bc1eb5fec5ff84263e2d333ce64d8cb9d5dd023c): resolved identity + correlated independent proof.
- [d9f22f4](https://github.com/thanks-cohn/Click2Cloud/commit/d9f22f4de284044f6d313a1730c896d994dbc5b1): timings, availability, observer isolation and restart recovery.
- [5d79d23](https://github.com/thanks-cohn/Click2Cloud/commit/5d79d238aef2f953aed20826d829987b9399943a): final integration corrections and stress evidence.

Detailed source/evidence notes: [A](PHASE_A.md), [B](PHASE_B.md), [C](PHASE_C.md),
[D](PHASE_D.md), [E](PHASE_E.md). Owner RAW recordings were unavailable and are not
claimed as independently inspected. All committed generated recordings are synthetic.

## One-click ZIP proof

[phase-d-browser-final.json](phase-d-browser-final.json) and
[phase-d-stress-final.json](phase-d-stress-final.json) record one export action,
one automatic download, exact counts, original ZIP byte size/hash and page count.
RAW includes its separate privacy confirmation. No manual Next/download-part UI.

| Mode | Rich events | Basic attempts | ZIP bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| SECURE | 0/0 | 0 | 5,834 | `6e138840aa4862888cab00eafb631154a0ec29d15b70ecc97efc03f28823b9dd` |
| RAW | 0/0 | 0 | 5,819 | `23add0929b48039053d07e67071c13f691549cb2787fa4fd09befadd2101ad24` |
| SECURE | 102/102 | 21 | 427,956 | `85b28fb5213bf72f7cbc8a37ff809b6369f7320eb53b854be97e92e9070b2503` |
| RAW | 102/102 | 21 | 225,696 | `02ad79d4443c4e7f416dda348a1bcd45581be7729a9fcef3d2615af34d883f76` |
| SECURE | 10,000/10,000 | 2,000 | 40,982,776 | `63fbcf4ff0ef30935c924e951790bc51a27ff56680bd6f50173faae834b06b55` |
| RAW | 10,000/10,000 | 2,000 | 21,142,761 | `81b7c17494ee4be843679d86d2145b66a3e9b00c6e87b287cc94e0ac5cd7a1ae` |
| SECURE | 100,000/100,000 | 2,000 | 320,058,710 | `ac533f1dbcc49ce2148d92a8fa8e8830e2cac116e8ba9b6e123680332f4b037c` |
| RAW | 100,000/100,000 | 2,000 | 117,968,695 | `a9a40f1a467529932d1cfd80d1a49c636bfc6680375ce877d64786af55e7499f` |

Every archive passed the independent Python standard-library verifier: ZIP CRC,
every manifest file SHA-256, rich count/unique sequence coverage, Basic attempt
uniqueness, CSV/JSON field agreement, coverage counts and SECURE sentinel exclusion.
The archive's overall SHA also matches the UI hash. Required files are included:
Basic JSONL/CSV, full-events JSONL, performance summary, recorder health, coverage,
README and manifest. 100k archives are verified, not merely prepared blob anchors.

[final-artifacts.json](final-artifacts.json) lists complete lossless `.zip.gz`
synthetic browser downloads with original ZIP hashes. Decompress, then run
`scripts/verify-recorder-zip.py ZIP EXPECTED_RICH_COUNT RAW-or-SECURE`.
This includes final ordinary/stress archives, module-worker downloads and PARTIAL
recovery. They are data artifacts, never owner RAW or live-cloud evidence.

Processing keeps one decoded storage page, incrementally hashes/encodes it and
retains bounded native Blob chunks. The encoded payload budget is 512 MiB; larger
payloads fail explicitly without returning a truncated archive. Heap before/after
observations are not peak/controlled performance measurements. Automatic multipart
packaging above the limit is not implemented; an explicit actionable failure is.

Sparse/evicted/unconfirmed cases remain explicit. Real IDB rolling/recovery now
exports **260/260 retained Basic rows at durable high-water 601**, across multiple
pages, after migration preserves the prior capacity and an explicit fixture capacity
change. The earlier 123-row run is also retained. Snapshot ordinal and durable
sequence are separate. Later committed events are excluded. Cancellation keeps
recordings, starts no download, and reads interrupted by a worker failure report
FAILED. Newly selected rich runs cannot reuse an older run's snapshot. Unknown
unreceived/last-commit risk is preserved as UNKNOWN, never converted into zero.

## Native truth and useful measurements

[native-truth-table.json](native-truth-table.json): 30 cases, each using the actual
native listener, canonical engine/transport and local workerd/R2 bytes. Recorder
ports here are memory fixtures; the separate browser tests prove IDB/export paths.

| Scenario | Save result | Recorded provider / mode | Recorded proof/state |
| --- | --- | --- | --- |
| Warm or cold success | completed; real 3-byte R2 readback | cloudflare / simple, narrow (`nested`), depth | independently_verified / verified |
| Post-write authority loss | uncertain; one write, no replay | same correct identity | unknown / uncertain |
| History completion fails | partial; receipt/timings preserved | same correct identity | unknown / uncertain, COMPLETION_PENDING |
| Invalid observed size/proof, missing observed receipt, wrong target | actual save remains completed | same mode; mismatched binding cannot verify | unknown / uncertain, explicit proof availability |
| Stale generation | blocked, zero writes | observed identity/generation | unknown / blocked |
| Throwing or stalled observer | actual save/bytes/request order preserved | missing observation stays unavailable | no invented recording/proof |

Verified recording requires final successful completion plus the same selected
target, remote operation, receipt and independently observed HEAD key/size/ETag/
version through `acceptProof`. `R2_HEAD_VERSION_SIZE` alone cannot verify anything.
Initial unavailable identity is corrected only from the actual post-hydration row.
Unreceived startup proof remains unverified with an explicit startup gap.

| Detail | Recorded meaning / missing reason |
| --- | --- |
| Click→dispatch, click→verified, end-to-end | Same-epoch monotonic spans; cross_epoch/interrupted otherwise |
| Dispatch preparation, intent authorization, capability, rechecks | Existing measured transport blocks, including cumulative rechecks |
| First provider request latency | Response-header request duration, not network RTT or upload time |
| Worker request and transport lifetime | Includes polling/waits; not upload throughput |
| Verification and History completion | Actual observed start/end spans; unsuccessful History stays unverified |
| Byte size / effective speed | Receipt/readback size; rates only with positive observed denominators |
| True-remote source acquisition / upload | not_applicable; no invented duration or speed |
| Zero-duration sample | Measured zero retained; associated rate N/A / invalid_measurement |
| Absent detail / SECURE private fields | not_observed / redacted respectively |

Source timestamps, worker epochs, per-attempt correlations and observed menu
ACK generation are retained. DB v3 adds indices without resetting diagnostics;
pending attempts become interrupted, unconfirmed rich ranges stay unconfirmed,
restart gaps are deduplicated, and sequence resumes above reserved high-water.
Seven 1,000-click modes prove saves continue with OFF/BASIC/EXPANSIVE, synchronous
throws, rejecting async factories/callbacks and stalled observation. No benchmark
here establishes installed-native latency or zero overhead.

## Commands, failed attempts and independent rerun

Available host: Linux x64, Node v24.22.1, Chromium 155.0.8059.79, locked Miniflare
4.20260730.0/workerd 1.20260730.1. [delivery-build.json](delivery-build.json) pins
source hashes/build digest and unchanged extension ID `ajppphdiamdobknpamcheohmdbdbeoal`.
Node >=22 and Python 3 executable as `python` are required for the independent verifier.
The automated browser commands below were exercised on Linux; installed Windows
acceptance is separate.

Exact command families used, with numbered attempt logs preserved:

```sh
# Baseline files served unchanged from 7f6808e in an isolated local directory.
git archive 7f6808e src extension | tar -x -C work/recorder-first/baseline
C2C_EXPORT_ROOT=work/recorder-first/baseline C2C_EXPORT_BASELINE=1 C2C_EXPORT_EVIDENCE=work/recorder-first/browser-before node scripts/test-recorder-complete-export.mjs
node --test tests/recorder-complete-export.test.mjs
C2C_EXPORT_EVIDENCE=work/recorder-first/browser-after-fixed C2C_EXPORT_STRESS=1 node scripts/test-recorder-complete-export.mjs
node --test tests/recorder-native-truth.test.mjs
node --test tests/recorder-native-truth.test.mjs tests/recorder.test.mjs tests/depth-authority-race.test.mjs tests/mv3-import-policy.test.mjs
node --test tests/recorder-measurements.test.mjs
node --test tests/recorder-measurements.test.mjs tests/recorder-native-truth.test.mjs tests/recorder.test.mjs tests/boundary-instrumentation.test.mjs tests/depth-authority-race.test.mjs
node scripts/test-recorder-recovery.mjs
node --test tests/workings.test.mjs
npm run build:extension
node --test tests/mv3-import-policy.test.mjs right2cloud-module/tests/module.test.mjs tests/depth-authority-race.test.mjs
npm run test:focused
C2C_EXPORT_EVIDENCE=work/recorder-first/final-browser-4 node scripts/test-recorder-complete-export.mjs
C2C_EXPORT_EVIDENCE=work/recorder-first/final-stress C2C_EXPORT_ONLY_STRESS=1 node scripts/test-recorder-complete-export.mjs
C2C_WORKER_EVIDENCE=work/recorder-first/final-worker-2 node scripts/test-recorder-worker.mjs
C2C_SHELF_EVIDENCE_DIR=work/recorder-first/installed-probe C2C_HEADLESS=1 npm run test:shelf:extension
# E last: independently once each with MODE=OFF, BASIC, EXPANSIVE.
C2C_DEPTH_RECORDER_MODE=MODE C2C_DEPTH_TRACE_DIR=work/recorder-first/depth-last/MODE node --test tests/depth-plan-recovery.test.mjs
```

Every failed attempt remains in the committed logs/ledgers:

- A: expected baseline one-click failure; development SECURE null-predecessor failure;
  repaired Node 11/11 then 12/12 and browser 8/8. The final exporter adds the budget
  regression (13 cases in the focused runner).
- B: baseline 0/2; repaired 2/2. First integration 2/3 because its harness searched
  only the first segment for a terminal event. The corrected harness reads every
  segment and retains the terminal assertion: 3/3, then combined 22/22.
- C: baseline 0/2; 18/18 then 20/20 affected runs. A new startup test's syntax error
  produced 39/40 and 0/1; corrected fixture then 44/44. No business assertion removed.
- D: full run 1 **415/416** (missing vocabulary entries), run 2 **416/416**, runs
  3–6 **418/418** each; runs 5–6 are the final production source. The initial 100k
  SECURE size-limit failure and initial worker activation timeout remain visible;
  corrected stress and three subsequent worker flows pass. Module/MV3/authority
  **55/55**. Final ordinary browser **6/6**, final stress **2/2**, recovery **5/5**.
- E: three fresh isolated Depth runs **4/4 each**, 87 requests each, no request errors.
  No actual Windows run or root-cause regression is claimed.

No failed retry was removed from a denominator. Log-only transformations replace
review-root paths and synthetic fixture URLs; outcomes/counts are retained. Worker
negative-control exception text is reduced to its known cause class. `SHA256.json`
verifies the evidence files; archive metadata verifies the decompressed ZIP bytes.
The retired scenario atlas/default broad runner was not executed.

## Owner acceptance and remaining gates

Use a **new checkout of this review branch**. In Windows CMD, with Node (prefer
24.21.0) and Python 3 available, one local acceptance command:

```cmd
python --version && npm ci --no-audit --no-fund && npm run test:focused && npm run build:extension && node scripts/diagnose-depth-fixture.mjs
```

The final command preserves six isolated modes and two full focused results and
safe cause/lifecycle traces. If Windows Depth fails, preserve the first
`request.error` boundary/cause/module frames. No passing retry explains its cause.

For physically installed Chrome, use a fresh disposable Chrome profile, never the
ordinary profile/Base 0.1 installation (same extension ID). If policy permits,
load `dist/click2cloud`, inspect worker startup, confirm Basic with Debug OFF,
explicitly consent/start Expansive, deliver a safe native gesture, stop and inspect
the selected run. Unauthenticated gestures must remain blocked/uncertain. Press
SECURE ZIP once and verify the download/counts/hashes; RAW requires privacy consent
and stays local. Repeat after Reload/restart. If unpacked loading is denied, keep
BLOCKED; do not bypass policy. No real account/cloud connection is required for
the automated synthetic tests. A live disposable R2 save is a separate optional,
explicit owner-controlled acceptance step, not performed here.

Remaining: installed Windows native rendering/recording/export proof, live provider
proof, and the unresolved Windows-only local /capabilities TypeError. Its cause was
not inferred from the separate browser activation harness correction. Original
review branch, protected Base 0.1, manifest identity, persisted CURRENT/destinations,
OAuth authority and deployed resources were not modified. No merge/deployment.
