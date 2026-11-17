# START HERE — Click2Cloud Simple destinations vs REDOWN (Codex, 2026-11-16)

> **NEW NOVEMBER 17 FIELD EVIDENCE — READ FIRST:** [Owner live test: login did not leave custom destination ready; Inspect/prepare succeeds; subsequent REPAIR_REQUIRED appears before verified save; source-read failure after rich recording](../11.17.2026/OWNER_LIVE_TEST_LOGIN_PREPARE_REPAIR_SOURCE_FAILURE.md). The owner **has not run this Codex request yet**. Investigate the existing auto-initialization path, per-click status correlation, and recorder/source-fetch independence. Do not mistake this additional baseline test for a regression from an attempted fix.

**Priority:** P1 / critical core right-click save.  
**Code implementation target:** `thanks-cohn/Click2Cloud`.  
**Proven behavioral reference:** `thanks-cohn/REDOWN`, **read-only**.  
**Issue:** https://github.com/thanks-cohn/Click2Cloud/issues/16

## READ THESE IN ORDER

1. [Phase 1 — full REDOWN vs Click2Cloud cross-repo investigation brief](CODEX_P1_SIMPLE_DESTINATION_REDOWN_CROSS_REPO_PHASE1.md). **Run this phase now.**
2. [Sanitized diagnostic evidence and REDOWN acceptance benchmark](DIAGNOSTIC_EVIDENCE_AND_REDOWN_ACCEPTANCE.md). Owner reports >1,000 working REDOWN downloads and many successful logout/login cycles; preserve this easy real-world behavior.
3. [Formal bug record and exact reproduction](../../Issues_and_Bugs/Bugs/P1_SIMPLE_DESTINATION_WORKER_SETUP_REQUIRED_AFTER_DEFAULT_2026-11-16.md), plus [GitHub issue #16](https://github.com/thanks-cohn/Click2Cloud/issues/16).
4. [Phase 2 — implementation request, HELD for owner review/approval](CODEX_PHASE2_SIMPLE_DESTINATION_REPAIR_HELD_FOR_APPROVAL.md). **Read to understand acceptance; do not execute or open another branch yet.**

## MANDATORY existing repository contracts

Before touching engine code, read [AGENTS.md](../../AGENTS.md), especially the current Nov 9 login override, durable saved-destination/consent precedence and requirement to document actual behavior. Read [right-click engine ↔ API source map](../../latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md) and [CURRENT workings map](../../11.2026/workings/right-click-workings.json). The latest source and higher-priority owner rules prevail over stale historical docs; note conflicts instead of silently inventing a policy. Other unrelated P0 tasks remain independently tracked; do not mutate those areas opportunistically.

## Repro in one sentence

Owner can save with the original `redown` Cloudflare Simple destination, but a newly configured Simple destination fails even after becoming Default and then the only menu choice. Diagnostic ZIP: **4 verified, 7 `WORKER_SETUP_REQUIRED`, 1 `SOURCE_DENIED`**, no exact destination ID in BASIC rows. Cause **not yet confirmed**.

## Owner's desired product behavior

> REDOWN has practically worked for over 1,000 downloads and through countless sign-outs. Click2Cloud must learn what REDOWN got right: once I log in, I want to right-click and save to the exact configured cloud folder or bucket, reliably, without repeated manual repair.

Treat this as the desired UX and firsthand user evidence, not a claim that historical REDOWN code is universally defect-free. **Study REDOWN carefully; port only a justified, tested subset, within Click2Cloud's canonical API-first architecture.**

## Phase controls

- **NOW:** inspect both repos, reproduce target selection/readiness, identify the real cause and propose minimal repair vs selective port; produce evidence and test plan.
- **HOLD:** implementation Phase 2 until the owner reviews Phase 1. Do not create a second porting/extraction branch in advance.
- **ALWAYS:** no REDOWN modifications, no resets/deletions, no automatic unapproved Cloudflare setup, no secret leaks, no default-to-`redown` substitution for failed target, no false verified receipt, no merge or release before installed Chrome validation.

## Short kickoff prompt

```text
Read codex/11.16.2026/START_HERE_SIMPLE_DESTINATION_REDOWN_REFERENCE.md and follow its Phase 1 links for Click2Cloud issue #16. Inspect BOTH thanks-cohn/Click2Cloud and thanks-cohn/REDOWN; REDOWN is the read-only benchmark, with 1,000+ successful owner-reported saves and reliable logout/login behavior. Investigate why new Simple destinations fail even when Default/only-choice (7 WORKER_SETUP_REQUIRED in the diagnostic snapshot), compare REDOWN activation/ready-profile gating with Click2Cloud's per-bucket plan, and recommend the smallest safe fix or selective port. Begin Phase 1 only: investigate, reproduce, and report. Do not modify REDOWN, execute Phase 2, make a second branch, merge or release without my review.
```
