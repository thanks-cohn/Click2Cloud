# MV3 recorder and full-suite investigation

**Review branch:** `fix/mv3-recorder-suite-reliability`.
**Implementation base:** `4878aa26d989b4344cccb92481db5273f6bcf6a1` on
`feat/base01-two-tier-diagnostics`, not main. The invoked request and issue were
read from main `87e34eca5a4571252274a87b5af6f6f9c0c3ae5f` and copied unchanged
before adding this investigation note. Base 0.1 remains
`0d50ab82c10555ae49d617b90be588057a1fa6b6`.

Final functional tests reference `d6390f5`; later harness provenance/documentation edits preserve production bytes.

**Outcome:** MV3-incompatible imports and the checkout newline policy are repaired.
The owner's intermittent **Windows** Depth failure did **not** reproduce here;
its incident root cause remains OPEN. No authorization/generation/expiry rule was
relaxed or changed to manufacture a passing test. Installed Chrome, Windows CMD
and live Cloudflare acceptance remain BLOCKED/NOT RUN. No release acceptance.

## Environment and provenance

Linux, Node v24.22.1, npm 11.9.0, Chromium 156.0.8078.79, four CPU quota cores,
32 GiB cgroup memory limit. Repetition processes used at most two jobs per cohort.
Other explicitly identified browser/Base control checks sometimes shared the host;
results are not a controlled causal overhead experiment. Tests used local workerd
R2/SQLite, fake OAuth/management/native ports, never owner cloud resources.

`source-audit.json` cites immutable input SHA, exact line anchors and SHA-256 for
every source/request/evidence file named in the assignment. Key input anchors:

- `extension/background.mjs:168`: dynamic host import; `:225` collapses its rejection
  and host initialization failures into `RECORDER_IMPORT_FAILED`.
- `src/recorder/host.mjs:29`: additional dynamic imports in the SECURE read path.
- `extension/app.mjs:616`: dynamic import in an ordinary Shelf document; this is
  permitted and intentionally retained.
- `tests/depth-plan-recovery.test.mjs:54`, `:59`, `:66`, `:69`, `:83`, `:85`:
  local request/current/auth ports, dispatcher and the original positive assertions.
- `tests/workings.test.mjs:11`: SHA-256 of raw working file bytes; the owner reported
  `i/lf w/crlf`, a different byte stream from the canonical repository LF bytes.

## Phase 1 — exact failure, repair, and limits

Current Chrome documentation explicitly says dynamic `import()` is unsupported
in extension service workers:
https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics
(accessed November 14, 2026).

A **real Chromium module ServiceWorker**, using an isolated HTTP test origin and
profile, reproduced:

```text
TypeError: import() is disallowed on ServiceWorkerGlobalScope by the HTML specification.
```

See `before-worker.json` for the sanitized fixture stack. This is a browser
service-worker reproduction of the actual unsupported operation. It is **not**
the owner's unavailable installed-extension console stack. The genuine unpacked
extension probe is rejected by administrator policy; that policy was not bypassed.
The old Node/page tests passing did not test this service-worker restriction.

### Source changes

- `background.mjs` statically imports the small host graph. Initialization executes
  later in a guarded Promise, never awaited by native listener registration or a
  save. `RECORDER_NOT_READY`, `RECORDER_INITIALIZATION_FAILED` with bounded cause
  name/stage, and request-level `RECORDER_UNAVAILABLE` now mean distinct things.
  No raw exception string, signed URL or credential is exported by startup reporting.
- `host.mjs` statically imports schema and digest functions, repairing SECURE export
  as well as startup. Ordinary page-only dynamic imports remain supported.
- `recorder-panel.mjs` reports failed Start beside Start/Stop, restores its label,
  and exposes ACTIVE/run ID/commit count on success. Stop remains available while
  Start is pending. No new collection consent, permission or cloud action exists.
- `mv3-import-policy.mjs` uses esbuild's parser/resolver across static imports and
  re-exports from the manifest worker entry. It rejects both literal and computed
  dynamic imports. A nested illegal import is a negative control; page-only imports
  and comments are excluded. The builder gates source **before** replacing dist.
- Static ESM syntax/evaluation errors cannot be caught by a later initialization
  guard. The parse/import gate and real worker harness reduce that risk; the full
  installed-background evaluation gate remains explicitly BLOCKED.

The packaged dist graph also passed inspection (`phase1-packaged-imports.json`).
No manifest key/ID, OAuth, CURRENT, menu owner, Worker code or cloud operation changed.
Exactly one native listener remains in the existing registrar. Existing hanging,
throwing, quota/open-recovery, writer rejection, pressure, race and 20/100/1000-click
Node gates still run in the focused suite; those are not native Chrome proofs.

### Browser evidence

Five independent clean-profile **HTTP module worker** runs passed BASIC with Debug
OFF, explicit Start, ACTIVE, finite LIMIT_REACHED, Stop, Debug OFF, full process
restart, v2 worker messaging, both actual browser ZIP downloads and adjacent error
feedback. Chrome storage/native ports are explicit fixtures; IndexedDB and worker
execution are real. A failed early harness used Playwright 1.57's synchronous
`waitForFunction` poller with a Promise-returning predicate. It accepted that Promise
before testing the resolved boolean. Explicit awaited status polling corrected this
**test harness** error; no product status rule was weakened to satisfy it.

Downloaded synthetic ZIPs were independently unzipped in Python: CRC, every manifest
file hash, privacy mode and seeded-marker exclusion passed. RAW stays local in `/tmp`;
no new RAW ZIP is added to the branch. See `phase1-zip-verification.json`. The separate
100k real-IDB/segmented export harness also passed after the import repair. It remains
fixture feasibility, not installed-native/Windows/real-provider evidence.

## Phase 2 — measured investigation, not an invented fix

### Repetition results

| Cohort / source | Isolated original Depth test | Full focused suite | Failures |
| --- | --- | --- | --- |
| Original feature `4878aa2` initial baseline | NOT RUN here; owner Windows isolated 4/4 reported separately | 385/385 once | 0 |
| Before Phase 2, frozen archive of Phase 1 `79fb73f` | 10 independent runs, 4/4 each | 10 independent runs, 387/387 each | 0 |
| After tracing/LF policy `391ca27` | 10 independent runs, 4/4 each | 10 independent runs, 392/392 each | 0 |
| Protected Base 0.1 archive | 3 independent runs, 4/4 each | 1 run, 372/372 | 0 |
| Explicit CPU contention, OFF/BASIC/EXPANSIVE | 3 further runs, 4/4 each | not another full cohort | 0 |
| Final source `d6390f5` | controls retained | 392/392 once | 0 |

387 adds the two MV3 policy gates to the original 385; 392 additionally includes one
checkout integrity test and four deterministic authority controls. No original test
was removed, skipped, quarantined or changed from `completed` to `uncertain`.
The full cohorts include one explicit `--test --test-concurrency=1` run each and
nine default direct focused runners, using two independent process slots. CPU
stress creates four disposable Node workers with an 8-second upper budget; only
the isolated test fixture enables them, and its finally block terminates them.

Exact commands, exits, counts, source SHAs and individual logs are preserved in
`before-repetitions.json`, `after-repetitions.json`, `base01-repetitions.json` and
corresponding `*-runs/` directories. Passing negative-test titles contain
`STALE_GENERATION`: summaries distinguish these text mentions from failing outcomes.
No matching title was counted as an incident and no failed run was dropped.
Before and after local reproduction rate is **0/20 Depth executions per cohort**
(10 isolated + 10 full), not evidence that the owner's Windows incident is fixed.

### Safe causal evidence

`tests/fixtures/depth-observation.mjs` is opt-in via `C2C_DEPTH_TRACE_DIR`. It wraps
fixture ports at real current-read, generation desired/applied, native resolver,
dispatch, engine boundary, capability request/response, authorization return and
workerd disposal boundaries. It records target identity hashes, endpoint *classes*,
bounded codes, ACK/pending state, measured remaining lease and session comparison.
It never writes bearer tokens, signing secrets, raw headers or source URLs.
OFF/BASIC/EXPANSIVE use the same real local Worker path; recorder ports in this
Node comparison are explicitly memory fixtures, not disk-backed Chrome storage.

Representative traces for all modes and CPU runs are included. Successful runs
show desired/applied/ACK progress 1→2→3, no unexpected pending registration during
writes, matching signed fixture sessions and leases far above expiry. There is no
observed authorization rejection from which to establish the Windows incident's cause.

The deterministic controls establish two important **possible mechanisms**, not
retroactive claims about the owner's failing run:

1. The original fixture dispatcher forwards `generation` directly. A reconnect
   fallback can omit it; the engine then correctly returns STALE_GENERATION even
   when desired/applied generation did not change. The production background already
   has a generation fallback. This control is reproduced against Base 0.1 too.
2. Post-write session or generation loss correctly returns uncertain/AUTHORIZATION_LOST
   and performs one write, with no retry or false verified result. Unchanged authority
   completes once. The existing module suite also rejects expired/wrong-principal
   authority and unknown/lost receipts without a PUT/replay.

Because neither unexpected path occurred in the repeated positive scenario, no
production authorization fix is justified. The owner issue remains OPEN, and the
new Windows-safe traces are the next evidence needed. A passing retry is not a repair.

### LF/CRLF root cause and portable repair

The reported integrity failure has a distinct established cause: raw LF and CRLF
bytes hash differently. `.gitattributes` now enforces `text eol=lf` for the precise
fingerprinted text extensions under src, extension and right2cloud-module/src;
PNG remains binary. There is no whole-repository renormalization, reset, content
rewrite or expected-hash substitution. The workings hash protocol stays raw-byte
SHA-256 against canonical repository LF bytes; existing immutable baselines remain.

A temporary Git fixture reproduces `i/lf w/crlf` with autocrlf=true, then proves fresh
checkout with the policy gives identical LF bytes for every representative type,
leaves binary bytes unchanged, and still rejects a deliberate content modification.
See `checkout-integrity.txt` and `linux-eol-after.txt`. This is Git's actual checkout
conversion on Linux, **not** Windows CMD execution. Real Windows clean checkout is
NOT RUN; the independent script/procedure is in `WINDOWS_ACCEPTANCE.md`.

### Performance disclosure

`paired-fixture-metrics.json` preserves all per-mode/cohort p50/p95/p99 and sample
counts. In full-suite traces, OFF/BASIC/EXPANSIVE click→dispatch p95 was respectively
13.31 / 15.26 / 32.06 ms (32 / 24 / 24 verified fixture samples); dispatch includes
local capability/auth awaits and shared scheduler load. Terminal verified fixture
result p95 was 124.18 / 70.53 / 78.19 ms. These noisy, unequal-size samples do **not**
establish causal recorder overhead or a physical latency budget. The higher EXPANSIVE
dispatch tail is disclosed, not omitted. The separate 1000-call browser fixture data
also remains available in `recorder-browser-results.json`.

Native Chrome click→dispatch / click→verified and live provider latency are **N/A**.
No success toast, fake ACK or fixture receipt is promoted to physical readback.

## Final gates

| Gate | Before | After | Evidence & exact environment | Residual risk |
| --- | --- | --- | --- | --- |
| MV3 startup | owner RECORDER_IMPORT_FAILED; unsupported operation reproduced | SOURCE/BROWSER HARNESS PASS; INSTALLED BLOCKED | Chromium 156 Linux module worker + graph/build gates | Owner's exact installed stack and full extension evaluation unavailable |
| BASIC, Debug OFF | installed behavior unverified | BROWSER HARNESS PASS; INSTALLED BLOCKED | real worker/IDB, fixture native/Chrome ports | no real native delivered click |
| EXPANSIVE Start/Stop | owner Start failed | BROWSER HARNESS PASS; INSTALLED BLOCKED | 5 independent profiles, ACTIVE/cap/Stop/restart | actual Windows idle/reload remains unverified |
| SECURE/RAW export | physical extension unverified | BROWSER HARNESS PASS; INSTALLED BLOCKED | real browser downloads, Python CRC/hash/privacy readback | customer RAW and real extension download not tested |
| Native saves under recorder faults | not physically verified | NODE FIXTURE PASS; INSTALLED/R2 BLOCKED | original 20/100/1000 fault gates retained | real native/R2 permission and policy |
| Depth full-suite intermittency | owner STALE_GENERATION / AUTHORIZATION_LOST | Linux repeated PASS; WINDOWS OPEN/NOT RUN | 10 before + 10 after full cohorts, controls and traces | incident cause not reproduced or repaired |
| Windows LF/CRLF | owner byte-hash failures | POLICY/GIT FIXTURE PASS; WINDOWS NOT RUN | autocrlf checkout negative/positive/tamper controls | owner must run clean Windows checkout |
| Module/build | 49/49 + build | PASS (Linux) | Node 24.22.1; unchanged ID/OAuth/Worker modules | Windows rerun pending |
| Cloudflare worker capability | owner SERVICE_UNAVAILABLE | OPEN; NOT CHECKED LIVE | no Worker/account request or mutation | separate CLAIMS/provider issue |

## Independent review and preservation checklist

- Review source commit `79fb73f` (Phase 1), `391ca27` (Phase 2 investigation/policy),
  and later narrow policy/test refinements. Production save/auth/generation code
  is unchanged from the feature base. No Worker deployment or new provider exists.
- Run `npm run test:focused`, module tests and build; inspect the built worker graph.
  Use `scripts/test-recorder-worker.mjs` for browser service-worker coverage and
  `scripts/test-shelf-extension.mjs` for the separate genuine-side-panel policy gate.
- Verify `feat/base01-two-tier-diagnostics` still points to 4878aa2 and Base 0.1 to
  0d50ab8. Main, manifest ID/key, OAuth, CURRENT, destinations and live profiles remain
  untouched. Only the new review branch is eligible for a normal review push.
- Follow `WINDOWS_ACCEPTANCE.md` / `scripts/test-windows-recorder.cmd` in a fresh
  checkout and disposable Chrome profile. Do not install over the normal owner profile.
- Keep the Windows Depth issue OPEN until a failing trace supports a specific fix
  and the same bounded suite passes there. Do not deploy, merge, publish, extend
  expiry, bypass a recheck, retry a write, delete data or suppress an assertion.
- Real R2 writes require explicit approved account and disposable prefix; none was
  authorized here. The separate SERVICE_UNAVAILABLE report is not an OAuth or
  recorder finding and was not used to justify infrastructure changes.
