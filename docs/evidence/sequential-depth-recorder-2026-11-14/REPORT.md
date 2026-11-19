# Sequential Depth / recorder repair — gated blocker report

**NOT READY FOR FINAL ACCEPTANCE.** Phase 1's incident root cause remains unknown.
The requested sequential execution stops at that gate. No Depth incident fix,
complete recorder ZIP fix, or recorder attribution fix is claimed.

Review branch: [`review/sequential-depth-recorder-2026-11-14`](https://github.com/thanks-cohn/Click2Cloud/tree/review/sequential-depth-recorder-2026-11-14).
Diagnostic source/test/evidence commit:
[`db51f926fcd4a12ec178ba6b0f47e4de6df1394b`](https://github.com/thanks-cohn/Click2Cloud/commit/db51f926fcd4a12ec178ba6b0f47e4de6df1394b).

Implementation base was verified against remote HEAD:
`fix/mv3-recorder-suite-reliability` = `098ae67c76b00d664388c1e89b925ee00a1c0036`.
The complete sequential request and its required Windows evidence were read from
main `0c077fc88dd1402290b7ec54fd03928daa76278b`. Request SHA-256 and changed-file
hashes are in [source.json](source.json). The original `work` branch was not moved.

## Phase gates

| Condition | Result | Evidence / reason |
| --- | --- | --- |
| Phase 1: original TypeError underlying cause established | FAIL — gate unmet | No available-host reproduction; original Windows evidence lacks cause and stack |
| Phase 1: deterministic incident regression red → green | NOT VERIFIED | No identified incident mechanism; the diagnostic regression below is distinct |
| Phase 1: available-host isolated repetitions | PASS | Six per Node version, 12/12 processes, 4/4 each; OFF/BASIC/EXPANSIVE twice per version |
| Phase 1: complete focused suites | PASS | Four independent processes, 396/396 each; two per Node version |
| Phase 1: genuine authority/receipt safety controls | PASS | 96/96 module/safety tests; also retained in focused coverage where applicable |
| Phase 1: five consecutive isolated runs + full suite on Windows | NOT VERIFIED / NOT RUN | No Windows runtime available |
| Phase 2: one-click complete ZIP | NOT RUN | Phase 1 gate prohibits advancing |
| Phase 3: native → host → Basic/Rich truthful attribution | NOT RUN | Phase 1 gate prohibits advancing |
| Phase 4: final build, browser and cross-gate acceptance | NOT RUN | Earlier gates unmet; earlier-phase safety tests above are not final acceptance |
| CHROME_INSTALLED / native rendered menu acceptance | NOT VERIFIED / NOT RUN | No loaded-extension/native browser test performed in this gated execution |
| LIVE_R2 | NOT VERIFIED / NOT RUN | Only local workerd/R2 fixtures; no owner cloud resources used |

## Phase 1: what is established, and what is missing

The owner evidence on main reports three Windows isolated failures, OFF/BASIC/
EXPANSIVE, versus three full-suite passes. OFF/EXPANSIVE reached fixture
`/operation` verified and `/verify` completed before a later `/capabilities`
TypeError; BASIC failed before the write. Generation desired/applied/ACK stayed
3, session matched and roughly 120 seconds remained. Those historical runs are
owner evidence, **not newly executed samples here**. The privately supplied
original RAW archives and full Windows traces were not available in this checkout.

The old catch at `tests/depth-plan-recovery.test.mjs` encloses all of:

1. `await worker.mf.ready` and origin access;
2. `await worker.mf.dispatchFetch(...)`;
3. the optional tracing `await response.clone().json()`.

It reports only `error.name`. Thus even the precise throwing sub-operation was
not distinguished. Miniflare's installed dispatch implementation additionally
constructs a Request, awaits its local undici fetch, and can revive a Worker
exception. A bare TypeError does not identify which mechanism occurred. This
inspection does **not** establish a request, socket, Worker, teardown, auth or
production defect as the owner's incident cause.

**Concrete blocker:** no failing Windows execution with the actual throwing
boundary, bounded stack-module locations and cause code is available. Both Linux
Node versions below stayed green, including the owner's exact Node v24.21.0.
No production auth/transport correction can be justified from that evidence, and
no real incident regression can honestly be manufactured. Per request rule 1,
Phases 2–4 were not started.

## Small diagnostic correction actually committed

The change is confined to the test harness, tests and a local diagnosis runner:

- `tests/fixtures/depth-fetch-diagnostics.mjs` splits ready, dispatch and trace-read
  boundaries. It retains bounded allowlisted cause/name/code/message classes and
  known module/line locations. It reports local fixture identity, request ordinal,
  lifecycle, in-flight count, signal-aborted flag, loopback/protocol class and
  origin-change flag without recording actual origins.
- The existing Depth fixture records starting/ready/disposing/disposed boundaries.
  It uses the wrapper with identical request options and preserves the original
  response or thrown exception. It does not retry or change any save assertion.
- Four dedicated tests cover cause retention, synthetic Windows stack-path privacy,
  unknown/throwing fields, single-attempt/request identity, boundary distinctions
  and trace-off response preservation. The focused runner imports these tests.
- `scripts/diagnose-depth-fixture.mjs` runs six serial isolated processes followed
  by two complete focused suites. Every failure remains in the results. Missing
  trace/counts are explicit failures. Outputs use a fresh unique `work/` directory.

Production `src/`, `extension/`, `right2cloud-module/src/`, manifest identity,
OAuth, generation/authorization/verification rules, CURRENT and native recorder
behavior have no diff from implementation base. No release or cloud mutation,
merge, deployment or Chrome-profile installation occurred.

### Deterministic red/green: diagnostic capture only

[check-capture.mjs](check-capture.mjs) executes the exact old fetch wrapper
extracted from `098ae67` and the new wrapper with the same deliberately injected
synthetic TypeError/cause. Exact commands, from repo root:

```
node docs/evidence/sequential-depth-recorder-2026-11-14/check-capture.mjs before
node docs/evidence/sequential-depth-recorder-2026-11-14/check-capture.mjs after
```

Actual results: before **exit 1**, after **exit 0**. See
[capture-before.txt](capture-before.txt) and [capture-after.txt](capture-after.txt).
The old wrapper loses `UND_ERR_SOCKET` and the throwing boundary; the new wrapper
retains both without private exception text. Both rethrow the same original error.
**The socket cause was injected, not discovered in the owner's failure.** This
proves the diagnostic improvement, not the required Depth root-cause repair.
The expected failing diagnostic run is retained and never counted as a product
incident reproduction or a passing regression. An initial development probe and
the preserved reproduction script each ran once before and once after: two
expected before-failures and two after-passes. The preserved-script logs are linked
above; these synthetic checks are separate from every incident repetition.

## Fresh available-host results and exact commands

Host: Debian GNU/Linux 13 x64. Locked Miniflare 4.20260730.0, undici 7.28.0,
workerd 1.20260730.1. Real local workerd/R2/claims and independent fixture byte
readback; management/OAuth/native ports and recorder comparison stores are fixtures.
Evidence class: **NODE_FIXTURE**, never CHROME_INSTALLED or LIVE_R2.

| Cohort | Isolated Depth processes | Full focused processes | Unexpected failures |
| --- | --- | --- | --- |
| Original base, Node v24.22.1, OFF | 1 × 4/4 | Not run before patch | 0/1 |
| Diagnostic patch, Node v24.22.1, repetition runner jobs=2 | 6 × 4/4 | 2 × 396/396 | 0/8 |
| Diagnostic patch, Node v24.21.0, serial runner | 6 × 4/4 | 2 × 396/396 | 0/8 |
| Dedicated diagnostic tests, Node v24.22.1 | 2 × 4/4 | Included in each new focused suite | 0/2 standalone |
| Separate safety/modules, Node v24.22.1 | 96/96 cases in one process invocation | Not an additional focused suite | 0/1 |

All initiated test processes are included. The expected synthetic before-capture
failure above is separate. No failed repetition was dropped or retried until green.
The full suite increased from 392 to 396 solely by adding the four diagnostic tests.
The separate safety/module invocation overlapped part of the v24.22.1 cohort.
These wall-clock durations are not a controlled performance or recorder-overhead
measurement; no native Chrome latency conclusion is drawn from them.

For each of the 16 patched isolated/full Depth executions: 751 trace events,
87 successful fixture requests, zero `request.error`, nine native fixture clicks
(eight completed plus the intended FRESH_CLICK_REQUIRED setup click). Requests
observed the ready lifecycle, no origin changes, and zero wrapper requests in
flight when disposal began. These are observations of successful samples, not
proof that the same lifecycle held during the owner's failing Windows samples.

Exact v24.22.1 command templates (each invocation and mode is in
[node-24.22.1/summary.json](node-24.22.1/summary.json)):

```sh
C2C_DEPTH_RECORDER_MODE=OFF C2C_DEPTH_TRACE_DIR=work/sequential/baseline-off node --test tests/depth-plan-recovery.test.mjs
C2C_DEPTH_RECORDER_MODE=<OFF|BASIC|EXPANSIVE> C2C_DEPTH_TRACE_DIR=work/sequential/repetitions/isolated-<n>-trace node --test tests/depth-plan-recovery.test.mjs
C2C_DEPTH_RECORDER_MODE=OFF C2C_DEPTH_TRACE_DIR=work/sequential/repetitions/full-1-trace node --test --test-concurrency=1 tests/final-focused.mjs
C2C_DEPTH_RECORDER_MODE=EXPANSIVE C2C_DEPTH_TRACE_DIR=work/sequential/repetitions/full-2-trace node tests/final-focused.mjs
node --test tests/depth-fetch-diagnostics.test.mjs
node --test tests/depth-authority-race.test.mjs tests/cloudflare-deployment.test.mjs tests/cloudflare-destination-recovery.test.mjs tests/cloudflare-onboarding.test.mjs tests/save-receipt-repair.test.mjs right2cloud-module/tests/module.test.mjs
```

Exact v24.21.0 acquisition/execution:

```sh
npm exec --cache /workspace/.npm-cache --yes --package=node@24.21.0 -- node --version
npm exec --cache /workspace/.npm-cache --yes --package=node@24.21.0 -- node scripts/diagnose-depth-fixture.mjs
```

That Linux version comparison is not Windows emulation. See
[node-24.21.0/summary.json](node-24.21.0/summary.json).
The node executable's absolute cache path is replaced by its version in the
committed summary. Full logs and losslessly compressed synthetic traces are kept
for every repetition. [ARTIFACTS.json](ARTIFACTS.json) documents transformations
and original trace digests; [SHA256.json](SHA256.json) verifies evidence files.
Synthetic rejected-URL test titles are numbered in the committed module log;
counts and outcomes are unchanged. No user RAW recording is committed.

Safety evidence in [safety-modules.txt](safety-modules.txt) includes genuinely
stale generation, expired capabilities, missing/revoked authority, prewrite
revocation with no PUT, postwrite session/generation loss remaining uncertain,
proof mismatch rejection, lost commit response without replay, and exact-account/
exact-scope recovery guards. None was disabled or relaxed.

## ZIP and recorder gates left unverified

| Required ZIP condition | Result in this execution |
| --- | --- |
| All 102/102 events, one click, one ZIP, hashes and coverage | NOT RUN |
| All 10,000/10,000 events, one click, one ZIP, independent parse | NOT RUN |
| 100,000 stress, eviction/sparse/gap/corruption/cancel/failure controls | NOT RUN |
| RAW/SECURE browser download and redaction acceptance | NOT RUN |

No product ZIP was generated in this gated execution. The recorder paging defect
remains open; compressed **fixture test traces** are not recorder ZIP evidence.

The requested Phase 3 native-to-host truth table likewise has no new results:

| Host observation scenario | Provider / mode / proof / measurement mapping |
| --- | --- |
| Successful independent R2 readback, Simple | NOT RUN |
| Narrow (`nested`) / Depth / actual generation mapping | NOT RUN |
| Postwrite auth loss, missing receipt, invalid size/version, wrong target | NOT RUN |
| Stale generation, worker restart, missing completion, slow/throwing recorder | NOT RUN |

Some underlying save safety cases passed in existing tests above. They do not
prove the missing end-to-end recorder host attribution, truthful timing mapping
or installed Chrome behavior. There is no fabricated availability or timing value.

## Windows diagnosis and acceptance command

Use a **new review checkout** and Node v24.21.0; no normal Chrome profile is needed.
After cloning this review branch and entering its root, this single CMD line
installs locked dependencies, runs six serial isolated executions (all three
modes twice), two complete focused suites and the diagnostic/auth/module controls:

```cmd
npm ci --no-audit --no-fund && node scripts/diagnose-depth-fixture.mjs && node --test tests/depth-fetch-diagnostics.test.mjs tests/depth-authority-race.test.mjs right2cloud-module/tests/module.test.mjs
```

The runner continues through its eight samples to retain every failure and then
returns nonzero if any failed. The trailing module command runs only when that
runner is green. Preserve the first failing trace's `request.error` boundary,
`error.frames`, `error.cause` and lifecycle. It contains no raw exception text or
credentials. A missing/unclassified cause remains unknown, not an inferred socket
or auth diagnosis. Inspect the local corresponding module line without publishing
unsanitized messages or unrelated files.

The next implementation must establish the actual failing mechanism, add its
real baseline-red/repaired-green regression, make the smallest culpable-layer
fix, and pass the Phase 1 gate before implementing one-click ZIP and recorder
attribution. **Passing this diagnosis command alone does not establish root cause
or close the incident.** Actual Windows acceptance has not been run here.

Final remote readback: implementation base remained `098ae67`. Main independently
advanced from the initial request pin `0c077fc` to `998ad15ceb2bdcd856b6bae49492493c5e3f506d`
(two Narrow bucket-root issue documentation commits). Fetch/diff confirmed the invoked
sequential request and required Windows Depth evidence were unchanged. No main push
was performed. Protected Base 0.1 was read only (`5ec93a7` annotated tag, peeled commit `0d50ab82c10555ae49d617b90be588057a1fa6b6`).
No protected branch/tag, owner profile, saved state, production Worker or object
was modified. Only this new review branch is delivered for review.
