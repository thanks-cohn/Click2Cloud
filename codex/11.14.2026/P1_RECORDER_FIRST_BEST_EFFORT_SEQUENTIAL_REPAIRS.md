# Codex — Click2Cloud recorder-first sequential repairs, KEEP GOING on independent blockers

**Priority P1 — Execute this request, implement code, and deliver working results. Do not repeat the old early-stop mistake.**

**Entry point:** This file on `main`.
**Repository:** `thanks-cohn/Click2Cloud`.
**Implementation base:** `review/sequential-depth-recorder-2026-11-14`, last confirmed HEAD `7f6808eef170933c1a793c021c2564118a5d6be3`. Confirm latest actual remote HEAD, make **a new review branch FROM THIS REVIEW BRANCH**, and retain the already committed fixture diagnostics. `main` is where this instruction lives, **not** the implementation base. Use separate small commits per completed repair. Do not overwrite or force-push the original review branch.

## Why this supersedes the old ordering

The earlier `codex/11.14.2026/P1_SEQUENTIAL_DEPTH_THEN_RECORDER_ONE_CLICK_EXPORT_AND_TRUTHFUL_TRACE.md` made an unknowable Windows-only Depth TypeError a hard gate. Its first phase stayed unresolved on Linux, and therefore it prevented implementation of the **two visible, independently actionable recorder defects**. That was the wrong dependency structure.

Read the previous request for engineering invariants and this report for what was actually done:
`docs/evidence/sequential-depth-recorder-2026-11-14/REPORT.md` on the implementation base.
Also read `docs/evidence/windows-depth-2026-11-14/ISOLATED_CAPABILITIES_FAILURE.md` on `main` for the separate Windows issue. Existing Chrome owner evidence: real extension Expansive ACTIVE; real R2 save/provenance; Basic recorded `other / other / uncertain` despite `R2_HEAD_VERSION_SIZE`; three manually exported RAW ZIP parts only covered rich events 1–10 of 102. This is source-reported owner evidence; complete private RAW data is not assumed accessible in the repo.

### CRITICAL WORK POLICY — iterative, nonblocking, honest

- **New execution priority, in order:** (1) complete one-click RAW/SECURE export; (2) truthful right-click recorder identity/verification; (3) detailed measurement/availability and resilience; (4) integrated build/browser checks; (5) Windows Depth local-fixture TypeError, **last**.
- **Solve each issue if possible**, with root-cause analysis, a minimal actual code change and focused tests. Aim for baseline-failing → repaired-passing regression for each. Commit each independently validated fix. **If a phase cannot be solved after a concrete diagnostic attempt, mark BLOCKED / PARTIAL, preserve precise evidence and move to the NEXT INDEPENDENT PHASE rather than abort the entire run.** Don't simply write a lengthy report and stop.
- Where a phase partially succeeds, **commit the safe verified sub-fix** and continue. Keep unresolved behavior explicitly failing/not verified; don't alter assertions, silence errors, or claim success.
- If a failure is infrastructure-specific (Windows, installed Chrome, Cloudflare) and the current runtime cannot reproduce it, **DO NOT block Linux-accessible implementation of other features**. Record NOT RUN on that host and provide one owner acceptance command or a short manual acceptance sequence.
- If a real source/dependency conflict makes later code work unsafe, isolate it and implement other independent work on the branch. Avoid incompatible partial changes. At the end, revisit any blocked issue **once** with new information from subsequent work; don't spend the whole run in an open-ended loop.
- **Actual deliverable:** implemented commits, tests, real generated/parsible export artifacts from synthetic data, counts and integrity evidence, and concise before/after truth tables. No “plan only,” no stopping after the first hard-to-reproduce bug, and no more tasks that merely improve logging while leaving both core recorder defects untouched.
- **Safety invariants:** No live Cloudflare writes/provisioning, credentials, unredacted RAW user exports in commits, automatic retries of ambiguous saves, false VERIFIED proof, changed menu semantics, changed provider route, changed manifest ID, or changes to CURRENT. Preserve Debug OFF by default, Basic best-effort always-on, Expansive opt-in, RAW explicit consent, SECURE redaction, no provider interference. Never modify protected `milestone/a-sure-winner-base-0.1`, ordinary user Chrome profile, or existing production extension. Don't merge/deploy without approval.

## Phase A (FIRST): ONE CLICK → ONE COMPLETE ZIP for 10,000 events

**Defect:** `extension/recorder-panel.mjs` exposes internal `next()` and manual `Prepare next ZIP part`. `src/recorder/storage.mjs` and `src/recorder/export.mjs` paginate one rich segment at a time. Owner's real export produced three RAW parts covering only **10 of 102** committed Expansive events, requiring manual clicks; 92 more remained unexported. Existing `basicAfter` cursor is sequence-based whereas `snapshot.basic.count` is a retained count; carefully verify end conditions after evictions/gaps.

**Required product UX:** User chooses the run and presses **RAW ZIP** or **SECURE ZIP** once (preserve any required RAW privacy confirmation). The extension obtains a fixed committed snapshot, pages over every Basic row and every Expansive segment internally, and **initiates a complete download automatically**, no manual `Download ZIP part` / `Prepare next ZIP part`. A selected Expansive run must genuinely export rich events, rather than silently defaulting to Basic-only. Display real progress/cancel and an unambiguous final COMPLETE, PARTIAL (with named missing ranges), FAILED, or CANCELED state.

**Testable minimum:** 102 committed synthetic events → **102/102 in one ZIP with one export action**. 10,000 committed synthetic rich events (and meaningful Basic attempts) → **10,000/10,000 in one ZIP with one action**. The ZIP must independently decompress, contain the full `basic-attempts.jsonl`, `basic-attempts.csv`, `full-events.jsonl`, summary, health, coverage, and manifest, with hashes matching exact bytes. No duplicate or skipped sequences/attempts; correct snapshot high-water, evicted-count and gap semantics. Distinguish high-water from number committed, and preexisting/unknown holes from a successful clean export. Use bounded/streaming memory, NOT concat-all-event-arrays for large runs. 100,000-event stress as reasonable; for truly browser-limit-exceeding data, graceful explicit failure or automatic packaging/parts after the **same one action**, with complete chained manifest; never require the user to click Next. Preserve RAW vs SECURE redaction and separation. A user click must actually start the download, not merely generate an unclicked blob anchor.

**Prove** UI click semantics, independent ZIP parse/count/hash check for 0/102/10k, sparse sequence, rolling eviction, partial/corrupt segment, cancellation, interrupted read, secure redaction. Test does NOT need live Cloudflare. Fix minimal code paths; commit. If blocked by browser-only API, still finish synthetic ZIP generator with tests and explicit browser gate; continue Phase B.

## Phase B (SECOND): TRUE provider/mode/save-outcome classification

**Defect:** Real Chrome Basic attempts display `providerId=other`, `mode=other`, `state=uncertain` and `proofLevel=unknown`, even when the owner's R2 object and recorded `R2_HEAD_VERSION_SIZE` are strong hints of an independent receipt. A code string is NOT itself verified proof.

**Source paths:** `src/chrome/registrar.mjs` click row matching; `src/core/engine.mjs` remote save result; `src/cloudflare/transport.mjs`; `src/recorder/host.mjs` `createRecorderHost.click`; `src/recorder/provider-observation.mjs`; `src/recorder/recorder.mjs`; `src/recorder/schema.mjs`. Trace actual menu row to native.terminal. In tests, run real call chain with synthetic workerd/R2 receipt.

**Required truth:**
- Successfully independently HEAD/size/version-verified Cloudflare Simple event → provider `cloudflare`, mode `simple`, context source as appropriate, canonical menu generation and correct terminal `verified` **only** if authoritative completion/receipt relationship actually supports it.
- Correct Narrow/nested and Depth identities and exact destination binding, without guessing or renaming unrelated business modes.
- Unknown/blocked/uncertain still truthful for postwrite lost authority, bad/wrong target, stale generation, cross-worker epoch, missing/invalid receipt, partial History handoff; no proof invention from `R2_HEAD_VERSION_SIZE` alone.
- Recorder observer error, slowness or absence cannot alter actual right-click save outcome, bytes, destination or request order.

**Testable gates:** Synthetic actual native `onClicked` → `observeClick` → transport + verified receipt → `native.terminal` → Basic and rich export. Explicit successful and unsuccessful truth table, field-level assertions and negative controls. Find and fix precise normalization/correlation defect; minimal patch and commit. Do not wait for Windows Depth.

## Phase C (THIRD): COMPLETE observed diagnostic detail, correct N/A reasons, crash safety

Goal: Recorder should be *useful* for the full right-click logic2real gap, not a collection of misleading zeros/nulls. Within the already-defined recorder's scope, capture actually observable start/finish timings (click, dispatch, auth, capability, provider request, verification, completion), byte size/speeds only when valid, exact event correlation and menu generation when available; don't invent source acquisition duration or throughput on true-remote paths.

Prove the source stages are emitted and mapped into secure/raw export, with availability reasons such as `not_observed`, `not_applicable`, `redacted`, `interrupted`, `cross_epoch`, as appropriate. Preserve original timestamps, worker epoch, event order, pending/unknown/gap counts and completeness. Avoid unbounded hot-path work and expensive content capture. Include worker restart/reload, 1000+ click stress and stopped Expansive/best-effort Basic cases. The tool is passive; normal cloud saving must work with diagnostics OFF, BASIC, EXPANSIVE, or throwing. Commit independently corrected detail and tests; move on if runtime-specific gate missing.

## Phase D (FOURTH): Integration, installed-Chrome readiness and regression

Run `npm run build:extension`, MV3 static-import policy, focused suites, recorder/export tests, and relevant module/safety controls on available host. If a disposable real browser is available, load unpacked extension in a **new disposable profile**, start Expansive, exercise native right-click with safe local/test fixture, export the complete run and parse saved ZIP. If not, mark `CHROME_INSTALLED NOT VERIFIED`, supply a minimal Windows owner acceptance checklist and keep working. Do NOT touch user's normal Chrome profile or any real Cloudflare resources.

Acceptance distinction: `NODE_FIXTURE` != `CHROME_INSTALLED` != `LIVE_R2`. Never claim a real Chrome save was verified from a Node test. A green 396/396 suite alone does not prove recorder export UX.

## Phase E (LAST): Best-effort Windows Depth /capabilities TypeError

The previous review branch contains improved **test fixture diagnostics**; previous Linux passes were **12 isolated tests (4/4 each), four focused suites (396/396 each), 96/96 safety/module tests**, but they did **not** reproduce or explain the Windows TypeError. Don't regress those diagnostics.

If actual Windows execution is available: use the existing `scripts/diagnose-depth-fixture.mjs` and bounded sanitized traces to identify the *specific* TypeError cause, repair **only the proven culpable layer**, write a red→green regression, repeat Windows isolated + full tests, preserve exact auth/stale fail-closed rules. If Windows unavailable or root cause undetermined after a genuine evidence-backed attempt, mark `UNRESOLVED — WINDOWS OWNER TEST REQUIRED` and move to final handoff; do not invent it and **do not block or roll back successful Phases A–D**. Do not count Linux tests as Windows acceptance or retest indefinitely hoping for a pass. The original traces on main already show it occurs at local workerd `/capabilities` TypeError, not proven lost scope, stale generation, or production Cloudflare defect.

## Final results / acceptance ledger (REQUIRED)

Write `docs/evidence/recorder-first-2026-11-14/REPORT.md` to new review branch including a compact matrix with **Phase, implemented file(s), source/root-cause proof, baseline failing case, after-fix test, outcome PASS/PARTIAL/BLOCKED/NOT RUN, verification environment**. Commit per phase; list original and final review SHA and changes. Include real generated synthetic export details **102/102** and **10,000/10,000** with independent verifier and blob size/hash, or explicitly record failed/incomplete case—not fictitious numbers. Include verified/uncertain Simple/Narrow/Depth truth table; missing metrics with why; all rejected/missing cases. Include complete exact command list and results (failed runs retained), Windows acceptance steps, Chrome acceptance steps, remaining open issues. If one phase fails, keep all independently successful improvements in review branch and still deliver a report; never label unverified feature fixed.

**Expected best-effort final result:** the recorder's one-click ZIP and data accuracy are actually repaired and ready for user Chrome verification, while the Windows-only Depth issue may still be separately open if not reproducible. This is acceptable as an honest, productive result. Shipping/merging is NOT authorized in this request.

**Do not ask the user for another Codex task to proceed from Phase A to Phase B. This one run covers all remaining phases.**
