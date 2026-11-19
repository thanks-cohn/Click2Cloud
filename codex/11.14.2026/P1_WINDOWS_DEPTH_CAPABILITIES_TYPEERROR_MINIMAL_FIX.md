> **SUPERSEDED AS THE NEXT EXECUTION ENTRYPOINT (2026-11-14):** Run `codex/11.14.2026/P1_SEQUENTIAL_DEPTH_THEN_RECORDER_ONE_CLICK_EXPORT_AND_TRUTHFUL_TRACE.md` instead. The sequential request retains this file's Depth acceptance/safety requirements, then gates one-click complete export and truthful recorder attribution. This file is preserved as a focused Phase 1 reference; do not run it as a separate new Codex job.

# Codex request — Fix ONE Windows Depth capability-fetch failure at its root

**Priority P1. Scope one defect only. Not a general pass.**

**Repository:** thanks-cohn/Click2Cloud
**Implement from:** fix/mv3-recorder-suite-reliability (last observed tip 098ae67c76b00d664388c1e89b925ee00a1c0036). Create a NEW review branch. Do not use main as implementation base or alter the protected Base 0.1 tag.

**Read before work:** docs/evidence/windows-depth-2026-11-14/ISOLATED_CAPABILITIES_FAILURE.md (on main), and Issues_and_Bugs/Bugs/P1_FULL_SUITE_INTERMITTENT_DEPTH_GENERATION_AUTHORIZATION_2026-11-14.md.

### Verified reproduction

Windows Node v24.21.0:
- Isolated tests/depth-plan-recovery.test.mjs: 3/3 FAILED (recorder OFF / BASIC / EXPANSIVE).
- Full suite: 3/3 PASSED 392/392.
- All three isolated failures originate at a thrown **TypeError on /capabilities** inside the local fixture's Miniflare/workerd dispatchFetch wrapper at tests/depth-plan-recovery.test.mjs:56.
- OFF/EXPANSIVE: fixture /operation already VERIFIED (R2_HEAD_VERSION_SIZE), /verify returned completed, then one final /capabilities request throws -> TRANSPORT_UNAVAILABLE -> AUTHORIZATION_LOST -> uncertain.
- BASIC: /capabilities throws BEFORE write -> TRANSPORT_UNAVAILABLE -> empty authorizedTargets -> SCOPE_UNAUTHORIZED.
- During failures desired/applied/ACK are generation 3, pending 0; auth session matches; cap has ~120s left. This is not evidence of a genuine revoked scope or generation mismatch.
- These are **local workerd fixtures**, NOT a production R2 failure.

### Required small fix

1. Reproduce the failing isolated Depth case. At the fixture fetch boundary, capture a **safe cause** of the TypeError (stable error code/causeName and stack-module/lifecycle only, no credentials/tokens/headers/URLs). Determine exactly why Miniflare dispatchFetch threw. Test hypotheses (request options, worker lifecycle, teardown, request reentrancy, fixture isolation or runtime/version) against evidence, not guesses.
2. Fix **only** the proven cause with the smallest change. If the defect is fixture-only, production auth/transport logic must stay intact. If production defect, demonstrate its actual mechanism before changing production code.
3. Add a deterministic regression that fails before and passes after for the identified mechanism. Keep genuine authority-revocation and stale-generation negative controls, and never reclassify unknown/uncertain as verified or silently replay a write.
4. Acceptance: provide original failing trace excerpt, mechanism, exact diff, and five consecutive **actual Windows** isolated passes, plus one complete focused suite (392 or higher) pass and zero new failures. If Windows not accessible, report Windows NOT RUN and give one-line CMD verification; Linux-only PASS cannot close this issue.
5. Preserve all existing Chrome profiles, CURRENT, saved destinations, remote cloud objects, worker deployments, manifest identity, Base 0.1 milestone and existing branch. No merge or deploy without approval.

### Not in scope

Do not work on one-click RAW/SECURE ZIP export or diagnostics provider/mode/verified classification. Those are separately tracked recorder defects.

**Final handoff:** root cause (with stack/trace proof), minimal files changed, before/after test evidence, new review branch and commit, Windows verification status. If cause unknown, report UNRESOLVED rather than a synthetic green test.
