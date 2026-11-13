# Codex P0 Request: Repair Depth Click → Actual R2 Save, Without Touching Simple or Narrow

Date: 2026-11-13
Repository: thanks-cohn/Click2Cloud
Start from current remote codex/depth-p0-click-save (latest committed HEAD; verify it).
Branch for implementation: create a NEW isolated repair branch from that HEAD; do not merge main.
Priority: P0 — a real installed Windows Chrome Depth click is blocked at the Worker-plan lookup.

## Mission — one intensive Codex run

**Make Depth right-click saves work with the same authorized Cloudflare bucket/Worker and the same verified remote saving infrastructure that already works for Simple/Narrow.**

**HARD NONINTERFERENCE REQUIREMENT: Do not modify Simple or Narrow source, configuration schemas, menu identities, saved destination records, visibility, their click paths, or user-facing behavior.** Do not refactor them. Do not rewrite or replace their established saving infrastructure. They are known-good controls, not implementation targets. If a shared integration file needs a fix, make it strictly gated to Depth-origin actions and demonstrate non-Depth byte-for-byte behavioral equivalence. Keep Depth's own IDs and its own discovery/configuration/hierarchy. Do not turn discovered Depth folders into Narrow destination records.

Preserve the existing Depth right-click appearance, nesting, root/Save here/leaf actions, current configured maxDepth values, bucket selection, sibling folders, Chrome's native scrolling, and settings. No arbitrary depth or sibling cap; user explicitly rejected a fixed depth-10 limit. No unrelated UI or feature work.

**Do not treat changing mode, folder, or depth as a reason to deploy a new Worker.** In the current code, Worker preparation is keyed to [accountId,bucketName] and is reused across authorized prefixes within that bucket. Do not remove authorization or Worker readback checks, borrow another bucket's Worker, copy a signing secret, auto-provision or reconfigure Cloudflare resources, reset login, delete data, or weaken fail-closed behavior. If a genuinely different unprepared bucket is selected, accurately report that it needs an explicitly approved setup instead of pretending to save.

## Exact LIVE evidence that must anchor the investigation

Installed Windows Chrome, extension ID ajppphdiamdobknpamcheohmdbdbeoal, local user build at commit 6beaccf (the branch may now contain follow-up documentation). The owner clicked a Depth native destination and got:

- Depth click ID: depth-click:8437ba75-8344-4a57-9d3d-b50188942bd4.
- UI: "Depth: not saved (WORKER_SETUP_REQUIRED / PLAN_MISSING)."
- Item ID: c2c:item:fac90211f53a2d2a.
- Parent ID: c2c:item:132c8a263c99277b.
- role=save; actionKind=attention; mode=depth.
- generation=26; acknowledgedGeneration=26; nativeCode=NATIVE_ACKNOWLEDGED.
- First failing boundary: stage=worker; reason=PLAN_MISSING.
- The Depth record is NOT an upload/transfer receipt. Do not claim it is.

INDEPENDENT POSITIVE CONTROL: The same owner provided an actual independently verified NARROW save:
- Operation ID: 0a90880e-4efe-470e-a2bc-326eb975e68d.
- state=verified; code=R2_HEAD_VERSION_SIZE; proofKind=independent-head-version-size.
- R2 bucket=redown; key=.click2cloud-readiness/4728e57b-1282-4d82-bbd4-c8358f967938/348s.jpg.
- provenance.mode=narrow; save data was verified at 31571 bytes.
- Account identity for the Narrow save is present in the private receipt but MUST NOT be copied into public test fixtures/reports.
- This proves an R2 Worker/capability was functioning for Narrow's selected account+bucket at that time. **It does NOT yet prove the failed Depth click selected the same account+bucket or that the plan still exists.**

Previous work: codex/11.13.2026-0355/DEPTH_P0_CLICK_SAVE_REPAIR_REQUEST.md and codex/11.13.2026-0355/DEPTH_P0_REPAIR/{AUDIT.md,REMAINING_GAPS.md,FIXES.md,TEST_RESULTS.md}; GitHub issue #12 and Issues_and_Bugs/Bugs/P0_DEPTH_NATIVE_MENU_CLICK_NO_SAVE_NO_VISIBLE_RESPONSE_2026-11-13.md.

## Phase 1 — establish the first real divergence, not a guessed fix

Start by reading source and tests:
- src/modes/depth/{index.mjs,native-click.mjs}, src/explorer/depth-inventory.mjs, src/explorer/r2-adapter.mjs
- src/core/{menu-spec.mjs,menu-identity.mjs,action-resolver.mjs,engine.mjs}
- src/chrome/registrar.mjs, extension/background.mjs, extension/app.mjs
- src/cloudflare/{deployment.mjs,transport.mjs,onboarding.mjs,wire.mjs}
- src/persistence/current-store.mjs
- tests/depth-p0-click.test.mjs, tests/logic2real-depth-save.test.mjs, tests/depth-scope-regression.test.mjs
- applicable AGENTS.md and nested repository instructions.

Read the exact live Depth outcome and verified Narrow outcome as *different* operations. Determine:
1. The canonical account ID + bucket name (+connection) + prefix selected by the failed Depth row. If owner-local data isn't accessible to Codex, give a **small read-only script** for the owner to compare the two locally, showing only sameAccount, sameBucket, sameConnection and sanitized bucket names. Do NOT infer equality from menu labels or the receipt of another operation.
2. How Depth menu generation obtains its account, bucket, prefix, authorized scope, workerReady state and actual click row from inventory. Determine whether the Depth-selected bucket is a different bucket, a wrong normalized target, a stale cached record, or exactly the same bucket as Narrow.
3. How the provisioner computes/stores/looks up the local plan key. Confirm src/cloudflare/deployment.mjs uses digest([accountId,bucketName]) to store under chrome.storage.local key remoteTransport:<digest>; root/prefix must not alter the key. Trace exact keys, but never log storage secrets, full plan blobs, tokens, or URLs.
4. Whether the plan was ever created for the failed bucket, persists now, had been lost, moved, was stored under another profile/extension ID, or was never required because a different account/bucket was selected.
5. Whether auth and Worker capability/readiness are conflated in a way that creates false PLAN_MISSING or false WORKER_SETUP_REQUIRED, especially for Depth-origin 'attention' rows.
6. Why Depth's discovered folder tree may exist even when no Worker plan exists: directory discovery uses authenticated Cloudflare R2 listing, which is a different prerequisite from authorized remote-save Worker preparation. Do not blame discovery timing without proof.
7. Whether present code uses the same physical save route and Worker registry for identical Simple/Narrow/Depth canonical targets. Distinguish harmless different presentation IDs from harmful different physical target keys.

Produce before-fix, reproducible evidence for the first failed predicate, not just a plausible code review.

## Phase 2 — implement the narrowly scoped fix

**Successful target:** For an already prepared, authorized account+bucket, any valid Depth root, intermediate 'Save here', or leaf should use the *same bucket Worker plan and existing remote transport* as the verified Simple/Narrow path, with only the authorized prefix differing.

Repair whichever Depth-specific bug(s) are proven by Phase 1. Possible root classes:
- Wrong account/bucket selection or target normalization during Depth inventory/projection/commit.
- Depth-only stale readiness/plan association, missing loaded snapshot or improper cache key.
- Wrong Depth attention-vs-save action classification or fallback; a healthy same-bucket Worker must not be blocked by an extra Depth-only precheck.
- Incorrect route from clicked Depth row to canonical shared destination.
- False blocker caused by Depth inventory discovery state rather than Worker scope.
- Inability to safely reconcile a genuinely missing local plan *without* inventing secrets or provisioning. For this case only, show a precise, existing approved setup/recovery action and preserve data. Explicit consent required for Worker creation/update.

Avoid a new Worker per folder, a Depth-specific upload engine, importing Narrow IDs, any forced re-auth, and any mode-wide change. Do not make unready saves 'pass' by skipping required checks. If plan genuinely missing, it is a legitimate blocking prerequisite that must be diagnosed truthfully, not bypassed.

If proposed repair requires modifying a shared file, the changed code path must be explicitly limited to Depth-origin inputs; characterize exact non-Depth behavior before/after. If a broader change is genuinely unavoidable, don't make it: document why and the narrowest approval-worthy follow-up.

## Phase 3 — acceptance tests for actual saving

Add rigorous regression tests with real modules where possible, not simply mocked success:
A. Same exact account+bucket+prefix used by Narrow and Depth returns the SAME Worker-plan key and target mapping. Narrow's own code and save outcomes remain unchanged.
B. Depth root, intermediate 'Save here', and terminal folder work with a single prepared bucket Worker; exact object keys/prefixes and independent verification are correct.
C. Depth discovery at different configured depths does not change Worker-plan identity or trigger per-folder deployment.
D. Same folder name in multiple accounts/buckets cannot collide; Depth native IDs stay different from Narrow native IDs, while physical target identity is canonical for the same destination.
E. Different account/bucket correctly requires separate preparation; never reuse a Worker plan from the wrong bucket, even if names or paths match.
F. A missing/pending/invalid Worker plan is blocked accurately; do not auto-provision; no fabricated transfer receipt or false 'verified' UI.
G. Already-ready status should not be overruled by stale negative Depth cache. Respect up-to-date scope checks on every save.
H. Native generation ACK is correct; click passes through authorized dispatcher, source validation, capability, transfer, independent readback and Save Results. Simulate real onClicked callbacks with async Chrome API acknowledgments.
I. Wide/deep trees with 5, 20 and many sibling folders preserve current Depth hierarchy and native scroll behavior; no arbitrary caps, no premature flattening.
J. Structural, golden and behavioral comparison of Simple and Narrow before/after, with no changes to their code. Preserve existing mode invariants and configurations. Run focused, full, Chrome/DOM, Worker transport, and module tests.

Run locally available verification AND describe evidence class honestly. Previous Codex sandbox could not load unpacked extensions (UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR). If still blocked, do NOT claim a real Windows Chrome/R2 save: provide exact safe operator instructions for building/reloading the existing extension without deleting profile storage, testing one disposable public test file through Depth and reading back the exact authorized R2 object.

## Phase 4 — release and reports

- Preserve owner local working file docs/evidence/shelf-engine/real-shelf-receipt.json; never force reset, clean, or discard uncommitted files.
- Report source HEAD, clean/dirty status, changed files and why each edit is Depth-only.
- Compare baseline/final failures. One older CI browser regression expected a Quick flag true while actual false; do not modify Narrow/Simple to silence it. Record if still occurring.
- Add short AUDIT, REPRO, FIX, NONINTERFERENCE, TEST_RESULTS, WINDOWS_VERIFICATION and REMAINING_GAPS reports under codex/11.13.2026-0355/DEPTH_LIVE_PLAN_MISSING_REPAIR/.
- Link evidence to GitHub issue #12 without incorrectly closing it before real end-to-end validation.
- Commit working source/test repairs to a new isolated branch; do not merge main.
- End with exact before/after for real Depth click (blocked vs verified), whether same account+bucket was established, every unsupported step marked UNVERIFIED, and READY/NOT READY.
- The task is to actually fix the working authorized Depth save in one run as much as evidence and permissions allow. Do not stop at documentation if a reproducible code defect can be repaired.

**Bottom line: Simple and Narrow are already working. Leave them completely alone. Make Depth select the correct physical destination and use the same proven, correctly authorized account+bucket Worker/transport as other modes, while retaining fully independent Depth discovery, menu configuration and IDs.**
