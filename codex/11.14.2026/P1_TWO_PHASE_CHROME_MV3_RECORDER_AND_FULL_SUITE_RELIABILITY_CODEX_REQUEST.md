# CODEX REQUEST — Two-phase Chrome MV3 diagnostics repair + Windows full-suite reliability

**Date:** 2026-11-14 (America/Chicago)  
**Priority:** P1 implementation/quality investigation; **P0 release gate** for any regression to native right-click saving, authorization, private data, or owner storage  
**Repository:** `thanks-cohn/Click2Cloud`  
**Document status:** REQUEST ONLY. Creating this file does **not** implement, approve deployment, merge or modify a running Chrome installation.  
**Source-of-truth implementation branch:** `feat/base01-two-tier-diagnostics` (latest observed branch tip `4878aa26d989b4344cccb92481db5273f6bcf6a1`; fetch and verify exact current SHA before changing anything).  
**Protected owner-tested Base 0.1:** annotated tag `milestone/a-sure-winner-base-0.1` => `0d50ab82c10555ae49d617b90be588057a1fa6b6`. Do not move, amend, delete, or deploy over this.  
**Other freeze marker:** `pre-diagnostic-addition` may reference an older main revision; do not confuse it with the Base 0.1 source.  
**Implementation instruction:** Create a NEW, separate `fix/` or `codex/` review branch FROM `feat/base01-two-tier-diagnostics`; do **not** implement these repairs from `main`. Keep `main` and the feature branch unmodified except as separately approved. Do not merge, deploy, publish, change OAuth registration, or install into the owner's normal Chrome profile without explicit permission.

## 0. Read the authoritative existing work

Before edits, inspect and cite exact lines in:

- Original V2 two-tier design on the **feature branch**: `codex/11.14.2026/P1_V2_TWO_TIER_NONBLOCKING_RIGHT_CLICK_DIAGNOSTICS_CODEX_REQUEST.md`. It is **not currently present on main**. This document governs Basic/Expansive behavior and cannot be silently superseded.
- `docs/evidence/two-tier-diagnostics/IMPLEMENTATION.md` and `docs/evidence/two-tier-diagnostics/VALIDATION.md` on the feature branch. Their 385/385 focused tests, 49/49 module tests, Chrome harness and 100k synthetic event results are **prior Linux evidence**, **not** installed Windows Chrome acceptance.
- Existing owner-reported issue on `main`: `Issues_and_Bugs/Bugs/P1_FULL_SUITE_INTERMITTENT_DEPTH_GENERATION_AUTHORIZATION_2026-11-14.md` (file path relative to repository root).
- Actual relevant code, not inferred behavior: `extension/background.mjs`, `extension/recorder-panel.mjs`, `extension/app.mjs`, `src/recorder/host.mjs`, `src/recorder/recorder.mjs`, `src/recorder/storage.mjs`, `src/recorder/writer.mjs`, `src/recorder/export.mjs`, `src/chrome/registrar.mjs`, `src/chrome/trusted-sender.mjs`, `src/core/engine.mjs`, `src/cloudflare/transport.mjs`, `src/cloudflare/onboarding.mjs`, `src/auth/cloudflare-oauth.mjs`, `extension/manifest.json`, `scripts/build-extension.mjs`, `tests/depth-plan-recovery.test.mjs`, `tests/workings.test.mjs`, `tests/final-focused.mjs` and the extension test runners.

First record `git status --short`, `git rev-parse HEAD`, actual branch/tags, Node/npm versions, Chrome version when available, and the original baseline test outcomes. Preserve unrelated local modifications; no blanket reset, clean, checkout of owner's active profile or cleanup of saved data.

## 1. Observed owner evidence — do not conflate the two defects

The owner installed/tested the new 0.3.19 build from a **separate Windows Git worktree**. The Windows command `node --test right2cloud-module/tests/module.test.mjs && npm run build:extension` passed **49/49 module tests** and produced `dist/click2cloud/` with the existing extension ID `ajppphdiamdobknpamcheohmdbdbeoal`. This is packaging success, not browser acceptance.

**A — Chrome recorder failure:** In the installed Chrome extension, pressing **Start Expansive Forensic Recording** did not start a run. The diagnostics panel surfaced **`RECORDER_IMPORT_FAILED`**. In `extension/background.mjs`, the background worker currently calls `void import('../src/recorder/host.mjs')...` and maps *any* import or host-initialization rejection into that one code. Chromium MV3 module service workers do not support JavaScript dynamic `import()` in that context. Also inspect `src/recorder/host.mjs` for the dynamic `import('./schema.mjs')` and `import('./storage.mjs')` in the export path, plus any other background-worker-reachable dynamic imports. **The observed error does not itself prove which thrown exception happened:** determine the exact runtime exception in Chrome and fix the complete reachable chain. Dynamic import in an ordinary extension HTML page (e.g. the Settings panel) is a different context; audit by runtime context, not a blind project-wide replacement.

**B — Full-suite flakiness:** The focused Windows full suite counted 385 tests, with multiple 384/385 runs and one 383/385 run. The first `tests/depth-plan-recovery.test.mjs` test intermittently failed with **`STALE_GENERATION`** (blocked, near line 85) and **`AUTHORIZATION_LOST`** (uncertain, near line 83), where the fixture expected `completed`. The isolated `node --test tests/depth-plan-recovery.test.mjs` later passed **4/4**. These are different outcomes; DO NOT assume either source code race, diagnostics overhead, fixture contention, timing sensitivity or Cloudflare production failure before measurement.

**C — Windows fingerprint noise:** `tests/workings.test.mjs` additionally detected apparent stale hashes for `extension/app.css`, then `extension/app.html`, then `extension/app.mjs`. Git reported `i/lf w/crlf`; manually converting each worktree file to LF made that check progress to the next file. Distinguish **byte-level normalization failure** from an actual semantic/source drift. The temporary local worktree normalization is not an approved source fix; there may be more affected tracked files.

**D — Separate Cloudflare observation, OUTSIDE this repair scope:** On login, UI reported `Cloudflare connected · SERVICE_UNAVAILABLE · worker-capability`. In `src/cloudflare/worker.mjs`, `SERVICE_UNAVAILABLE` can be emitted when the Worker fails to reach the `CLAIMS` Durable Object (outer catch), and onboarding labels `worker-capability` when capability/readiness is blocked. Preserve this as independent evidence; don't claim an OAuth failure, don't attribute it to the recorder and do **not** redeploy or replace Workers as part of this two-phase task. Only include a non-mutating diagnostic note if relevant.

## 2. Phase 1 — Repair and **physically verify** MV3 recorder startup

**Mandatory first phase.** Phase 2 may be prepared in parallel as read-only analysis, but do not declare Phase 1 complete from Node tests alone.

### 2.1 Root-cause the exact browser exception

1. Reproduce the installed extension failure in a **disposable Chrome user-data directory/profile** with the unpacked build from the implementation branch, never the owner's normal profile. This extension has the **same extension ID** as the owner's working one: loading/overwriting it in the everyday profile risks replacing the working version and confusing storage.
2. Inspect `chrome://extensions` → Click2Cloud → **service worker / Inspect views**, record the earliest worker startup/import error and event chronology. Capture sanitized error message, stack/module path, Chrome version and extension build SHA. Avoid exposing token values, signed URLs, account identifiers or private profile storage.
3. Confirm which dynamic imports are reachable in the MV3 service worker and whether failure is caused by unsupported `import()`, dependency loading, module parse error, initialization exception, storage open, or other causes. Explicitly differentiate `RECORDER_IMPORT_FAILED`, `RECORDER_NOT_READY`, and `RECORDER_UNAVAILABLE`. The current catch collapses distinct errors; replace misleading diagnostics with bounded, privacy-safe causal classifications.
4. Audit the **entire packaging/dependency chain** (`manifest.json`, relative module URLs, `scripts/build-extension.mjs`, `dist/click2cloud` contents, `src/build-info.mjs`, imports from `right2cloud-module/src`). Inspect the compiled files actually loaded by Chrome; a successful build alone is insufficient.

### 2.2 Implement an MV3-compatible fail-open architecture

- Replace **service-worker-reachable dynamic imports** with an MV3-supported strategy (e.g. static ESM imports, with deliberately lazy execution and guarded initialization). The alternative must run under the actual MV3 browser runtime, not only Node/Chromium page scripts. No `eval`, remotely hosted modules, weakened CSP or extra extension permissions.
- Preserve the original **fail-open contract**. The existing Chrome native context menu registration, listener and save dispatcher MUST survive recorder database/open, writer, startup, decoding, export and settings failures. Do not make awaited recorder readiness a prerequisite to registering the one native click listener or processing a save. A static module's syntax/import-time failure can fatally prevent the worker from starting; therefore ensure all new dependencies parse in actual Chrome, minimize top-level side effects, and add a browser gate that would reveal fatal evaluation errors.
- Keep exactly ONE `chrome.contextMenus.onClicked` listener. Avoid duplicate recording on service-worker restarts, duplicate callbacks, extra polling or any recorder-initiated Cloudflare request.
- Preserve Basic best-effort continuous rolling attempts (default newest 4,000, adjustable), canonical N/A fields, verifiable outcomes, and provider-neutral schema. Basic works with Debug OFF, absent Shelf, Expansive OFF and after restart when storage permits.
- Preserve Expansive explicit consent, editable 4,000 detailed-event cap or Unlimited, **Start/Stop**, no overwrite of finite incident beginning, durable `ACTIVE / STOPPED / LIMIT_REACHED` states, bounded writer memory, no fake claimed capture during offline windows.
- Maintain **SECURE and RAW ZIP**, privacy boundaries and independent readback of the generated ZIP parts. RAW may contain sensitive source/destination metadata; do not publish raw artifacts, credentials or full user URLs to PRs/issues.
- Fix the Settings UX so a failed **Start** reports a clear error **next to that control**, not only underneath RAW/SECURE export controls. When start succeeds, show explicit `ACTIVE` state, Stop button and run ID/event count (without claiming captured data before commitment); Stop also remains available during slow start. Keep the existing Debug OFF safety semantics.
- Preserve the original working Simple/Narrow/Depth menu, generation ACK, account authorization, Saved Destinations, Default and Quick Select, context-menu save, fallback behavior, worker operations, CURRENT storage and extension ID.

### 2.3 Phase 1 tests

- New **static MV3 service-worker import policy** test: fail CI if any background-worker-reachable module uses unsupported dynamic `import()`. Traverse static import/re-export graph, including recorder/export dependencies; do not falsely ban ordinary extension-page-only imports. Include negative fixture proving the gate detects an illegal dynamic import. Validate browser support from current authoritative Chrome documentation.
- Actual unpacked extension, installed to a **clean disposable Chrome profile**, verifies worker registration, zero uncaught module errors, Debug preference on/off, Basic always on, Start consent, `ACTIVE`, Stop, finite-limit closure, Debug OFF, reload/restart, and both SECURE and RAW ZIP download+inspect. Validate the chosen Chrome version/OS and whether the app UI can reach the dedicated recorder message channel. Separate synthetic/browser harness and native right-click outcomes.
- Fault injection: recorder module/storage failures, blocked IndexedDB, writer rejection, quota pressure, short-running service worker, start-stop race, over-capacity, malformed events, rapid overlapping clicks. Prove failures do not suppress native menu registration or save dispatch. No false verified outcomes, no silent raw metadata leakage.
- Run `npm run test:focused`, `node --test right2cloud-module/tests/module.test.mjs`, `npm run build:extension`. Check full `dist/click2cloud` after rebuild, plus tests proving no change to manifest ID/OAuth/CURRENT and no Worker code difference.
- If this execution environment cannot load a real unpacked Chrome extension (policy/OS restriction), mark actual Chrome gate **BLOCKED/NOT RUN**, produce a reproducible Windows acceptance procedure and do NOT claim Phase 1 physically PASS. Owner's previous `RECORDER_IMPORT_FAILED` is genuine evidence; do not overwrite it with simulated green results.

### 2.4 Phase 1 exit gate

Deliver a source/root-cause explanation and precise before/after runtime evidence. Demonstrate that the real installed MV3 worker can initialize the recorder, that Start really creates a run, and that native saves still work (or explicitly classify what is **NOT VERIFIED**). Do not merge or publish.

## 3. Phase 2 — Investigate and remove 385-test full-suite instability

**Only after Phase 1 repair is technically complete, without changing Phase 1's scope or disguising browser gates.**

### 3.1 Make the flaky Depth scenario explain itself

- Read the detailed `Issues_and_Bugs/Bugs/P1_FULL_SUITE_INTERMITTENT_DEPTH_GENERATION_AUTHORIZATION_2026-11-14.md` report. Capture pre-fix isolated 4/4 and full-suite 384/385/383/385 observations separately.
- Reproduce `tests/depth-plan-recovery.test.mjs` under many *independent* repetitions: isolated, full focused suite, serial execution, default concurrency, and load stress. Record run command, exact source SHA, Node/Windows/Chrome versions, which assertion failed and distribution of outcomes. Avoid indefinite looping: use a bounded, explicit sample count (e.g. 10 isolated + 10 full-suite if feasible), with individual archived summaries.
- Instrument **fixture-only, opt-in, safe** state snapshots at the logical await boundaries in `src/core/engine.mjs`, `src/chrome/registrar.mjs`, `src/modes/depth/native-click.mjs`, `src/cloudflare/transport.mjs` and `tests/depth-plan-recovery.test.mjs`: desired/applied/ACK generations, pending apply state, target identity hashes, account/session equality, authorization rechecks, lease/capability expiration, workerd readiness, and lifecycle/disposal. Use deterministic evidence, no tokens, signed capabilities or R2 secrets.
- Determine whether the full-suite overlaps a Miniflare/workerd fixture, global dependency, async teardown, timing, request mock, or menu generation application. A test that returns `uncertain` may be correctly fail-closed, but the unwanted authorization loss still requires explanation; do not classify a passing retry as a repair.
- Compare with protected Base 0.1 and with recorder disabled/Basic/Expansive on the same runner, code revision and load. Attribute any performance/regression to measured causes only; do not assume diagnostics is to blame.
- Change the minimal culpable code/test-harness behavior and add a regression gate. **Never** bypass authorization/recheck, raise token expiry merely to silence the test, swallow an error, perform unapproved write retries, weaken exact-generation validation or change an expected `completed` to `uncertain` without independently proving the contract was wrong.

### 3.2 Repair Windows LF/CRLF fingerprint reproducibility independently

- Prove which tracked files have Git index LF but Windows worktree CRLF and which hashes `tests/workings.test.mjs` compares. Fingerprint checks operate on raw bytes; line ending transformations are not automatically semantic source drift.
- Implement a repository-portable solution, such as narrowly scoped tracked `.gitattributes` `text eol=lf` rules for precise text-file paths (after auditing current policies/side effects), or an equally robust normalization-aware test protocol that still detects actual content changes. Specify whether canonical hash is **repository bytes** or **working tree bytes**, and prove source-integrity protection survives deliberate content changes. Do not rebaseline correct expected SHA values to hide a Windows checkout difference, and do not recommend manually fixing files one by one as the permanent solution.
- Verify clean checkout and reproducibility on Windows CMD, with `git ls-files --eol` evidence for affected files, and on Linux. Preserve legitimate user changes: no hard reset/clean of owner working directories. If tests require `workings` map update for an actual source modification, update it accurately with review evidence.

### 3.3 Repeatable test acceptance

Required commands (adapt only if scripts genuinely change, explaining why):

```cmd
npm run test:focused
node --test right2cloud-module/tests/module.test.mjs
npm run build:extension
```

- Focused suite target: all tests passing (currently 385; if additional regression tests are added, report the **new** total, not a misleading fixed 385). Module suite target: all tests passing (currently 49). Build and manifest ID verified.
- Explicitly report test flakiness sample size and reproduction rate **before and after**. Repeat the full suite enough times to establish credible stabilization; a single clean run is not sufficient given demonstrated intermittency.
- Demonstrate real rejection of stale generation, wrong-account, lost-authorization and unknown write receipt; no false verified state or unintended replay.
- Do not silently skip, delete, `only`-filter, quarantine, rewrite away or suppress the original Depth regression. Any platform-specific test deferral requires an explicit NOT RUN justification and owner review.
- Maintain a strict boundary: ***automated test PASS is not real Chrome native save PASS***. Installed Chrome + remote verified R2 objects remains separately gated.

## 4. End-to-end acceptance, privacy and reporting

1. **Baseline freeze:** Base 0.1 tag SHA and existing branch tips unchanged; no OAuth client/key/redirect/manifest ID change, no user CURRENT clearing, no saved destination changes, no Worker deployment, no remote files deleted.
2. **Phase 1:** Real Chrome MV3 worker loads; `RECORDER_IMPORT_FAILED` absent because exact cause was corrected, not simply hidden. BASIC continuously records with Debug OFF; EXPANSIVE Start/Stop and cap; private RAW/SECURE export integrity, appropriate UX feedback; recorder storage faults cannot stall native saving.
3. **Phase 2:** Windows clean-checkout fingerprints pass; Depth test reproducibly passes both isolated and in the complete suite; repeated full suite and module tests pass; negative failure-safety assertions remain.
4. **Manual native acceptance:** In disposable profile, conduct a small set of approved real context-menu clicks and verify each resulting object independently in an explicitly approved disposable Cloudflare R2 test bucket/prefix **only when authorized**. If no cloud permission is granted, never improvise a write or deploy and mark this gate **NOT RUN**. Do not confuse mock workerd R2 evidence with live provider readback.
5. **Perf and interference:** Report paired OFF/BASIC/EXPANSIVE click-to-dispatch and click-to-verified p50/p95/p99 when measurable. Report N/A for unobservable metrics rather than fabricating; compare same conditions; ensure recorder failures are invisible to save scheduling.
6. **Documentation:** Update scope-appropriate issue/evidence files with exact commands, source SHA, environment, PASS/FAIL/BLOCKED/NOT RUN, root cause, before/after excerpts, limitations and reviewer instructions. Include source link and an independent verification checklist. Safe diagnostics only; never paste RAW sensitive URLs or credentials.
7. **Delivery:** Push the **new review branch** with small reviewable commits only if normal project workflow authorizes a push. Give branch/commit links and a clear owner Windows CMD test script. Do **not** merge to main, move tags, publish the extension, mutate the owner's live installation, deploy Cloudflare Worker, or mark the release accepted without explicit approval.

## 5. Explicit non-goals

- Do not rewrite the whole Click2Cloud architecture, replace the recorder with a separate extension, install a native Windows helper, or add new cloud providers.
- Do not alter Workers, remote objects, OAuth registrations, live account permissions, primary Chrome profile or production R2 setup to repair diagnostics.
- Do not let the separate `SERVICE_UNAVAILABLE · worker-capability` observation derail the two-phase request; report it as an independently unresolved Cloudflare capability issue if observed again.
- Do not optimize solely for a green console. The owner's core objective is **logic2real convergence**: what native Chrome *actually does* must match documented source behavior and test claims.

## 6. Required final Codex handoff format

Provide:

| Gate | Before | After | Evidence & exact environment | Residual risk |
| --- | --- | --- | --- | --- |
| MV3 worker/module startup | `RECORDER_IMPORT_FAILED` in installed Chrome | PASS/FAIL/BLOCKED | Real Chrome worker console + source SHA | ... |
| BASIC, Debug OFF | unverified in owner's Chrome | PASS/FAIL/BLOCKED | retention/status after clicks | ... |
| EXPANSIVE Start/Stop | Start failed | PASS/FAIL/BLOCKED | run ID, ACTIVE→STOPPED, commitment | ... |
| SECURE/RAW export | physical Chrome unverified | PASS/FAIL/BLOCKED | ZIP part/hash + privacy check | ... |
| Native saving with recorder faults | not physically verified | PASS/FAIL/BLOCKED | native menu and independent remote readback | ... |
| Depth full-suite intermittency | STALE_GENERATION / AUTHORIZATION_LOST | PASS/FAIL/BLOCKED | n repeats, fixture/real classification | ... |
| Windows LF/CRLF integrity test | repeated stale byte-hash failures | PASS/FAIL/BLOCKED | clean checkout, `git ls-files --eol`, integrity negative control | ... |
| Module/build | 49/49, build PASS | PASS/FAIL/BLOCKED | Windows/Linux versions | ... |
| Separate Cloudflare Worker capability | `SERVICE_UNAVAILABLE` observed | OPEN / independently checked | **No** Worker mutation for this task | ... |

For every gate distinguish **SOURCE ASSERTION / NODE FIXTURE / BROWSER HARNESS / INSTALLED NATIVE CHROME / REAL CLOUDFLARE R2**. The deliverable is a trustworthy before/after record, not merely a green checkmark.
