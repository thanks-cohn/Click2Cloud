# Click2Cloud — sequential, gated P1 repairs: Depth → complete one-click export → truthful recorder → Chrome acceptance

**Directive:** This is **one Codex execution**, containing **small repairs in strict order**. Identify one root cause, make the smallest appropriate fix, prove it, then move to the next. **Results, not a planning document or another speculative audit.** Do not pause to ask the owner for a new Codex run between phases.

**Repo:** `thanks-cohn/Click2Cloud`. **Implementation base:** `fix/mv3-recorder-suite-reliability`, last confirmed tip `098ae67c76b00d664388c1e89b925ee00a1c0036`. Verify the current remote HEAD, create **one new review branch** from that branch, and use sequential, reviewable commits (one per verified fix, plus tests). Do not implement on `main`; `main` holds this request/evidence. Do not merge/deploy without approval. Never mutate `milestone/a-sure-winner-base-0.1`, the owner's normal Chrome profile, their original review/test checkout, live Cloudflare, CURRENT, saved destinations, or customer objects.

**Read the following existing evidence before changes:**
- `docs/evidence/windows-depth-2026-11-14/ISOLATED_CAPABILITIES_FAILURE.md` (on `main`)
- `codex/11.14.2026/P1_WINDOWS_DEPTH_CAPABILITIES_TYPEERROR_MINIMAL_FIX.md` (on `main`; its *one-defect scope restriction is superseded by this sequential request*, but its Depth safety gates still apply)
- `Issues_and_Bugs/Bugs/P1_FULL_SUITE_INTERMITTENT_DEPTH_GENERATION_AUTHORIZATION_2026-11-14.md` (on `main`)
- `docs/evidence/mv3-suite-reliability/REPORT.md` and `WINDOWS_ACCEPTANCE.md` on implementation base.
- Existing actual Chrome observation: Expansive recorder became ACTIVE after fixing the MV3 static import graph; Chrome context menu produced a real R2 file with immutable provenance metadata. But exported Basic rows show `other / other / uncertain` despite `R2_HEAD_VERSION_SIZE` evidence; users needed repeated **Prepare next ZIP part** clicks to export only **10 of 102** rich events across three archives. The complete original RAW files were supplied privately to ChatGPT and are **not automatically available in this repo**; use this as an observation to reproduce, not fabricated raw evidence.

## Rules that prevent recurring unproven fixes

1. **Sequential gates:** Phase N+1 may start **only after** Phase N has a proven root-cause explanation, a focused regression that fails on prior code and passes on repaired code, and all runnable safety tests passing. If not, **stop with a precise blocker**, not a fake success or a switch to unrelated work. Do not seek intermediate user confirmation for routine local edits/tests.
2. **Minimum surgical correction:** No app-wide rewrites, no architecture swap, no unrelated feature work, no modified assertions to hide failures, no retrying unconfirmed cloud writes, no turning uncertain into verified based on a status string alone. Preserve two-tier recorder: Basic best effort always on; Expansive only by explicit consent.
3. **Test proof must be meaningful:** Report exact command, environment, pass/fail counts, original failure, new deterministic red/green test and expected invariants. Repeating an intermittent test until it passes is **not** proof; failed runs remain in denominator. Provide explicit `PASS / FAIL / NOT RUN` for each gate.
4. **No secrets in the repo:** No RAW URL or signed request, credentials, headers, user filenames, private paths or arbitrary exception text in committed traces. Test fixtures must be synthetic. Do not persist complete user-provided RAW archives or unredacted Windows traces in GitHub.
5. **No silent degradation:** An unavailable metric stays `N/A` *with a reason*; missing/partial/corrupt data stays explicitly incomplete. The UI must not imply completion from merely generating a download URL. The recorder must never affect the saved object or its provider outcome.
6. **Final deliverable is running code on the new review branch plus concrete evidence**, not only Markdown and test recommendations. Report external installed-Windows Chrome and live R2 gates as NOT VERIFIED if Codex cannot physically exercise them. Do not declare all issues fixed before those acceptance tests.

## Phase 1 — FIX exactly the Windows Depth local /capabilities TypeError

**Existing reproduction:** Windows Node v24.21.0, isolated `tests/depth-plan-recovery.test.mjs` FAILED 3/3, while 392/392 full suite PASSED 3/3. OFF & EXPANSIVE failed after local Worker `/operation` and `/verify` with `AUTHORIZATION_LOST`; BASIC failed before save with `SCOPE_UNAUTHORIZED`. Every failing trace has a **TypeError** thrown by `tests/depth-plan-recovery.test.mjs:56` on fixture Miniflare/workerd `/capabilities`, translated to `TRANSPORT_UNAVAILABLE`. Generation stays desired/applied/ACK=3, pending=0, same auth session, ~120 seconds token life. This is **not** proof of a real Cloudflare outage or revoked authority.

**Do:**
- Capture a sanitized origin/stack/cause and relevant fixture lifecycle around `worker.mf.dispatchFetch`; prove exactly *why* that TypeError happened. Compare isolated vs full test runner, not by assumption. Fix whichever *minimal layer* is culpable, ideally test fixture if proven; only modify production auth if its own defect is demonstrated.
- Add a deterministic regression that genuinely reproduces identified root mechanism and fails on baseline, passes on fix. Retain the original Depth test and genuine revoked/stale/session-expiry negative controls. NEVER bypass `authorize()`, falsify verification or auto-replay uncertain writes.
- Run repeated isolated Depth in OFF/BASIC/EXPANSIVE and at least two complete focused suites plus relevant module tests. Require **5 consecutive isolated tests and a full focused suite on actual Windows** for Windows acceptance; when running on a non-Windows host, still prove root cause and automated gate there but label owner Windows acceptance **NOT RUN**, with a single copy/paste CMD command. No stale tests from prior runs counted as new proof.

**Phase 1 gate:** Source/stack explains TypeError, baseline regression red → repaired green, repeated isolated and full suite green on available host, genuine auth-negative cases still reject. Commit first patch with evidence. If root unknown or gate red, STOP and report the exact blocker; do not mask defect and continue.

## Phase 2 — FIX complete ONE-CLICK forensic archive export

**Existing reproducible UX defect:** `extension/recorder-panel.mjs` `next()` exposes one underlying IndexedDB rich segment per UI part. `src/recorder/storage.mjs` `rich.page()` returns one segment; `src/recorder/export.mjs` writes one uncompressed ZIP per page. User received 6 + 2 + 2 rich events in three manually requested ZIPs, with 92/102 still not downloaded. This is NOT an intentional user-facing feature. Also audit cursor termination carefully: `basicAfter` is a **sequence number**, while `snapshot.basic.count` is a **count**; don't use mismatched coordinates to declare export complete, especially under rolling evictions.

**Required behavior:** One user click on **Export Complete Recording** (RAW or SECURE) produces **one complete ZIP** for ordinary/large recordings including **at least 10,000 committed events**; never asks the user to click `Prepare next ZIP part`, never silently truncates. Automatic internal pagination, bounded/streaming processing, complete-snapshot manifest, progress + cancel, and file-level integrity hash verification. Show full vs partial distinction and explicit retained/evicted/gaps/unconfirmed coverage. Snapshot is a fixed committed boundary; no later events sneak in and no earlier committed event is omitted or duplicated. Keep RAW opt-in/consent and SECURE redactions separate; no network/cloud activity, credentials, or extra authority granted for export.

- Prefer a single stream-built ZIP with verifiable expected event/attempt counts and no unbounded in-memory array; if a truly huge archive exceeds concrete browser/file API limits, **automatically** generate all necessary parts after the one user action with ordering/hash chain and visible count/limit, or produce a clear actionable failure; no manual next-part UI and no silently missing tail. **At 10,000 events the acceptance test MUST produce one ZIP and one click.**
- Keep UI responsive; progress is actual snapshots/pages/events/bytes (not fake timer). Do not allow popup closure or service worker suspension to cause a false Complete result. Cancellation is explicit and does not delete stored recording.
- Verify actual browser-generated ZIP contents can be parsed, hashes match `MANIFEST.json`, rich sequence coverage matches committed high-water excluding explicitly declared gaps, basic snapshot coverage is correct after evictions, and TXT/CSV/JSON representations agree. Test zero events, 102 events (all 102), 10,000, stress 100,000 if supported, sparse sequences, segment boundaries, interrupted/canceled/export failure, RAW/SECURE redaction, malformed/corrupt segment, bounded memory, independent ZIP parse. If stream/save API prevents one file at 10k, **do not pass phase**.

**Phase 2 gate:** Automated UI/click test proves one action launches complete 10k-event ZIP and integrity verification, no manual paging; a real browser runtime export is exercised when available. Add deterministic tests, commit surgical fix only after green.

## Phase 3 — FIX real native right-click recorder attribution and truthful completion

**Known symptom:** Real Chrome Basic rows displayed provider `other`, mode `other`, outcome `uncertain` with `R2_HEAD_VERSION_SIZE` in `reasonCode`, despite owner inspecting R2 object + provenance. Recorder started ACTIVE in installed Chrome, so this is **not** the old `RECORDER_IMPORT_FAILED` issue. A code like `R2_HEAD_VERSION_SIZE` alone cannot authorize a transition to verified: trace real authoritative receipt and independent HEAD proof end to end.

**Do:**
- Follow a single Chrome contextMenus click: source `row`, exact `origin.mode` and `target.provider`, menu generation/ACK, `engine.save`, `createRemoteTransport.save`, post-write readback receipt, terminal outcome `native.terminal`, `src/recorder/host.mjs` → `providerObservation` → `src/recorder/recorder.mjs` Basic/Rich schemas. Identify **specific missing/incorrect join or normalization**, not “make outcome green.”
- Preserve authoritative terminology for Simple/Narrow/Depth (including internal `nested` alias where applicable), Cloudflare provider identity, canonical destination where privacy mode allows, and menu generation if actually observed. If identity genuinely unknown, leave unknown with an explicit availability reason, never invent.
- Verified state **only** with genuine independent R2 proof and final successful completion, correct operation correlation, and non-stale authority; otherwise partial, blocked, uncertain etc. remain truthful. Counterexamples: saved object without recorded completion, post-write auth loss, missing receipt, invalid size/version proof, wrong target, stale generation, worker restart.
- Capture all *available* authoritative timings (dispatch/capability/authorization/upload/verification/end-to-end), bytes and throughput only with valid sample denominators. Separate `not_observed`, `not_applicable`, `cross_epoch`, `redacted`, `interrupted` rather than a deceptive 0 or universal N/A. Preserve original event timestamps, correlation identifiers, worker epoch boundaries, dropped/gaps, source context and privacy rules. Never introduce expensive synchronous instrumentation on right-click hot path.
- Add exact synthetic terminal tests with real `contextMenus` → host observation path, not only isolated recorder adapter tests, including successful Simple save recognized as `cloudflare / simple / verified` after independent test R2 readback, Narrow/Depth identity, distinct unsuccessful writes, and thrown/slow recorder isolation.

**Phase 3 gate:** An end-to-end fixture test demonstrates correct provider/mode/generation/proof/measurement mapping AND rejects falsified success. Real installed Chrome verification remains separate until owner completes it. Commit a narrow fix; don't change legitimate underlying write outcomes.

## Phase 4 — cross-gate and owner-ready final handoff

Do **not** invent live acceptance. Run the entire focused suite repeatedly, module tests, `npm run build:extension`, MV3 import-policy test, RAW/SECURE export checks and no-recorder-overhead negative control on available host. Include a disposable loaded-extension browser test (start/stop, native right-click delivered, safe fixture/test destination, completed export ZIP independently parsed) **only if tools actually allow it**. Use a separate Chrome profile; extension ID is shared with protected Base 0.1 build. Do not require owner to connect real Cloudflare resources for automated code tests; a live disposable R2 acceptance is an optional explicit owner-controlled step. Never overwrite their installed extension in the real profile.

**Provide one final report** under `docs/evidence/` on your NEW review branch with:
1. Phase/condition `PASS`, `FAIL` or `NOT VERIFIED` and links to source commits;
2. Root cause and smallest code diff **per phase** (not just symptoms);
3. Before/after reproductions, red/green regression, exact tests and repeated sample denominator (all failing runs included);
4. ZIP evidence: count **102/102** and **10,000/10,000**, one click, one ZIP, verified hash and coverage, no manual paging;
5. Successful and unsuccessful right-click truth-table (provider, mode, expected proof, recorded proof, durations/availability);
6. `NODE_FIXTURE` vs `CHROME_INSTALLED` vs `LIVE_R2` clearly distinguished;
7. Remaining gaps, exact single-line Windows owner acceptance command(s), and clear review branch + commit URLs.

**Definition of done:** All internal phase gates pass on the available platform; if Windows or physically installed Chrome unavailable, label those gates NOT VERIFIED and explicitly state **NOT READY FOR FINAL ACCEPTANCE**. Never label the whole recorder fully fixed on Linux-only proof, even if everything compiles. No additional unrelated analysis-only iteration without a source-level fix or a named concrete blocker.

**Important:** This request **supersedes the one-defect-only restriction** of the earlier `P1_WINDOWS_DEPTH_CAPABILITIES_TYPEERROR_MINIMAL_FIX.md`, but **retains that request's detailed safety and evidence requirements**. Every phase is a *small, targeted repair*, not an omnibus refactor.
