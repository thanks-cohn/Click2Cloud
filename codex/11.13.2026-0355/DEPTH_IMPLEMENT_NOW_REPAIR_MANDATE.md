# P0 CODEX IMPLEMENTATION — FIX DEPTH RIGHT-CLICK SAVING NOW

> **1. DO NOT AFFECT SIMPLE OR NARROW.** They work. Preserve their code, settings, menu IDs, menu placement, Default/Quick, save routes, and real saved-file behavior. A Depth-only change that alters their shared cache behavior also counts as a regression.
>
> **2. MAKE DEPTH ACTUALLY SAVE.** The existing Chrome right-click Depth menu already discovers and displays R2 buckets/folders. Keep its exact hierarchy, labels, roots, "Save here", terminal leaves, sibling scrolling, configured depth and multiple buckets. Fix the click-to-R2-save path, not its appearance.
>
> **3. THIS IS AN IMPLEMENTATION REQUEST, NOT A PROPOSAL REVIEW.** **Edit production source AND tests. Commit functioning repairs.** Do not return only an audit, future plan, diagnostic report, or "we cannot determine the owner's private plan state." A missing private observation is a constraint on one *claim*, not an excuse to leave independently reproducible code defects unfixed.
>
> **4. PRIORITIZE WORKING SAVES OVER EXTRA COMPLEXITY.** No new upload engine, new Worker per folder, new menu framework, separate Depth credentials, speculative security overhaul, redundant logs, dashboards or sprawling abstraction. Fix the smallest real defects in existing paths. Preserve necessary current checks rather than bypassing them.
>
> **5. BE PRECISE ABOUT PROOF.** Simulated success is not actual Cloudflare R2 readback. Do not fabricate a verified upload. Still complete all repair and test work you can in this run.

Repository: `thanks-cohn/Click2Cloud`. Work **on branch `codex/depth-working-first-implementation`**, already created from reviewed commit `25d38e55d26ec552b2a2a25f9a6ceb5eddde1ad4`; fetch current remote HEAD before editing, do not switch to main or merge. Keep original user Chrome data and local dirty files untouched.

## What actually works / fails today

- **Simple and Narrow:** functional; real Narrow operation `0a90880e-4efe-470e-a2bc-326eb975e68d` independently verified file `348s.jpg` in bucket `redown` with `R2_HEAD_VERSION_SIZE` (31,571 bytes). Preserve this control.
- **Depth menu:** actual Windows Chrome menu rendered and acknowledged: desired generation 26, acknowledged generation 26, `NATIVE_ACKNOWLEDGED`.
- **Depth click:** actual `depth-click:8437ba75-8344-4a57-9d3d-b50188942bd4` resulted `WORKER_SETUP_REQUIRED / PLAN_MISSING` at stage `worker`, `actionKind=attention`, without a transfer. This is not a verified save.
- **Unknown:** Whether that failed Depth selection and Narrow control targeted the *same* Cloudflare account/bucket in the same profile at the relevant time. The follow-up diagnostic lookup is not an atomic snapshot of the first failing lookup. **Do not infer otherwise or invent a secret.**
- Current shared provisioner stores Worker plans under `remoteTransport:<digest([accountId,bucketName])>`; folder prefix and menu mode must not affect the bucket Worker-plan key. Shared transport enforces current prefix capability and independent verification.

Review reference — **read, then IMPLEMENT**, despite the review-only instruction in that historical document:
`codex/11.13.2026-0355/DEPTH_WORKING_FIRST_REVIEW/FINAL_IMPLEMENTATION_PLAN.md` and
`codex/11.13.2026-0355/DEPTH_WORKING_FIRST_REVIEW/INITIAL_PROPOSAL_DEFICITS.md`.
This new instruction supersedes their "no implementation during this review" restriction. Read relevant `AGENTS.md` instructions.

## Required repairs to produce, independently of owner's private state

**A. Fix the CONFIRMED optional logging blocker — mandatory production patch.**
`src/modes/depth/native-click.mjs` currently awaits `record('pending','DEPTH_CLICK_STARTED')` before `run()` within a catch that returns a blocked result. If optional attempt-history persistence fails, it can abort an otherwise valid save. Make best-effort *observational* click recording non-blocking to the authoritative existing saving pipeline. Preserve required CURRENT, native generation, source, authenticated transport, operation reservation and receipt/history safety. Record/report an observation failure via the existing output shape where possible. Do **not** turn an actual failed/uncertain transfer into success. Add an injected storage-write failure test proving **one valid save still dispatches**; add the opposite mandatory-CURRENT failure test proving it **does not** dispatch.

**B. Fix the CONFIRMED optional feedback blocker — mandatory production patch.**
`extension/background.mjs`'s Depth feedback callback awaits `chrome.storage.local.set({lastDepthClick:outcome})` ahead of notifications/badge/extension message. If that optional set fails, all later feedback may be skipped. Isolate that error so available existing feedback mechanisms still execute. No new UI/logging service. Add a test for local.set rejection with ensuing notification/message attempts and honest outcome classification.

These two patches are known, actionable bugs. **DO NOT end the run without modifying these production paths and adding/running tests**, unless you show an exact blocking technical contradiction in the current source; do not replace them with docs.

## Primary live failure: work the remaining Depth→Worker→save path NOW

**C. Trace exact clicked Depth destination to the existing shared save route.**
Inspect `src/modes/depth/index.mjs`, `src/explorer/depth-inventory.mjs`, `src/core/menu-spec.mjs`, `src/core/action-resolver.mjs`, `src/chrome/registrar.mjs`, `extension/background.mjs`, `src/core/engine.mjs`, `src/modes/depth/native-click.mjs`, `src/cloudflare/{deployment,transport,onboarding,wire}.mjs` and existing tests.

Compare one canonical physical target `{provider,connectionId,accountId,bucketName,prefix}` from Depth against the existing working Narrow/control path. Use real canonical functions. Assert that identical account+bucket has **identical registry key** independent of prefix/depth/mode; mismatched account or bucket never borrows the plan. Depth/native presentation IDs must remain distinct from Narrow's; same physical action identity is intentional. Fix any **demonstrated Depth-specific mismatch** in producer/selection/lookup or attention/fallback. Do not alter Narrow or Simple.

**D. Reproduce the first failing predicate using production modules, NOT only mocks returning READY/verified.**
Build the smallest useful test through the actual `createProvisioner.lookup`, `createRemoteTransport.status`, native Depth click, existing dispatch/engine and existing Worker/fixture where feasible. Substitute authorized browser/Cloudflare boundary inputs, but inspect an object/receipt at the simulated storage boundary rather than blindly returning a verified literal. Include:
- present ready plan + same-bucket root/intermediate/leaf → correct destination and verified save;
- stable missing plan → accurate block, no transfer or invented success;
- ready → pending/null between reads → no misleading assumption that later `PLAN_MISSING` was the original rejecting state;
- valid plan with stale-negative snapshot → successful Depth dispatch without altering Simple/Narrow's behavior;
- wrong bucket/account/connection and prefix-restricted plan → no cross-target save;
- changed generation/ACK, expired authority, failed/uncertain transfer → honest block, no fake receipt.

**E. Repair any reproduced Depth-specific sequencing/fallback defect.**
Check whether Depth's fresh Worker preflight, shared `getAuthorization` readiness snapshot, `actionKind=attention`, and setup-only fallback contradict one another. A good plan and current authorized target must not be falsely blocked or routed to `FRESH_CLICK_REQUIRED`. Fix the **earliest demonstrated** Depth-origin divergence with a small patch. Do not merely delete the preflight: the common engine's cached-negative authorization still exists. Preserve existing native and transport checks. If a shared file must change, narrowly gate the behavior to Depth and **prove mixed-mode noninterference**.

**F. If the bucket genuinely has no prepared, compatible local Worker plan:**
Do not "fix" by substituting Narrow's `redown` bucket, guessing/restoring secrets, inventing local plan data, or auto-deploying. Demonstrate the exact requested account/bucket fails honestly, and whether the *existing approved, exact-target* setup path can be used without unintentionally rebuilding a healthy Worker, changing Default/Quick, or widening prefixScope. Improve existing Depth-target routing/feedback only if a precise defect is reproduced. This legitimate account-specific prerequisite may require owner action later; it must **NOT** prevent completing A, B, D, E and all other reproducible repairs first.

## Noninterference and performance guardrails

- NO changes to `src/modes/simple/` or `src/modes/nested/`; no rewriting their configs or item IDs. No new per-folder Worker deployment.
- Keep `src/core/menu-spec.mjs`, identity, registrar authority, Worker deployment and shared upload path unchanged unless a minimal proven fix makes that unavoidable. If touching a shared file, show exact Depth gating and before/after mixed-mode runtime evidence.
- Test Simple+Narrow with Depth OFF and ON, same and different physical target, fresh/stale readiness, reconnect, worker restart, concurrent menu/config changes. No changed menu choices, destination, upload or receipt for controls.
- Preserve user-selected depth beyond ten and many sibling folders, stable native IDs, bucket root and "Save here" semantics; no artificial menu cap or layout redesign.
- Avoid a request per folder just to prove bucket Worker existence if this is a reproducible save-blocking issue; do not redesign discovery/registration merely to optimize a hypothetical benchmark.
- Source, configuration and storage changes should be small, justified and directly tied to **successful native right-click saves**.

## Required execution and release gate

1. Establish a baseline and capture known failures without editing/refreshing golden output to hide regressions. Existing Simple golden mismatch and GitHub Actions Quick browser assertion are separate known issues; **do not modify Simple or Narrow to make them pass**.
2. **Make real source edits** to A and B and any independently proven C–E fault. Commit tests as part of the source change. Documentation alone is a failed outcome for this request.
3. Run focused Depth, native, Worker/transport, current-store, relevant integration and Simple/Narrow control tests, `npm run test:focused`, `node --test right2cloud-module/tests/module.test.mjs`, `npm run build:extension`, and available CI/browser gates. Preserve exact failures and runner exit statuses. Don't run `npm audit fix --force` or churn dependencies.
4. If native Chrome+Cloudflare are accessible, **prove** native Depth root, intermediate "Save here", leaf → exact R2 object/key, independent readback and correct UI; then re-run protected Simple/Narrow saves. If native Chrome/R2 is inaccessible, execute all local repairs and integration tests anyway, and explicitly mark only *physical* tests UNVERIFIED.
5. Commit implementation and tests on **`codex/depth-working-first-implementation`**. Keep `main` untouched, do not merge, do not reset/delete the owner's local evidence. Link the commit and concise `FIXES_AND_VERIFICATION.md`. Do not produce an extra proposal or a second exhaustive deficits report.

## Final response contract — code, not excuses

Report:
- **Files actually modified** and what real defect each changed line fixes.
- **Reproduced before → passing after** results for A and B and other repaired defects, with test commands.
- **Depth saving now:** exact proof level (unit/integration/native Chrome/real R2), avoiding fabricated success.
- **Simple/Narrow unchanged:** runtime/control evidence and any test failures.
- **Remaining blocker, if any:** one exact actionable item only, separated from completed repairs.
- **Commit SHA and branch.**

**A successful response must include implementation commits, not just "we don't know if accounts match" or "please run a diagnostic."** If private live state is unavailable, do not guess the live failure's cause; complete the source fixes and prove the available runtime path, then state the single remaining physical verification. **Make the right-click save WORK.**
