# CODEX PHASE 2 — Fix new Simple destination saves (HELD until owner approval)

**Status: DOCUMENTED, NOT AUTHORIZED TO EXECUTE YET.**  
**Issue:** https://github.com/thanks-cohn/Click2Cloud/issues/16  
**Primary repo:** `thanks-cohn/Click2Cloud` — this is the only implementation target.  
**Read-only reference:** `thanks-cohn/REDOWN`.  
**Before this document:** [Phase 1 investigation](CODEX_P1_SIMPLE_DESTINATION_REDOWN_CROSS_REPO_PHASE1.md), [sanitized evidence + owner benchmark](DIAGNOSTIC_EVIDENCE_AND_REDOWN_ACCEPTANCE.md), and [START HERE](START_HERE_SIMPLE_DESTINATION_REDOWN_REFERENCE.md).

## Execution gate

This is an implementation-stage request, **not** a continuation automatically authorized by reading it. Codex must first deliver Phase 1's side-by-side source comparison, reproduction evidence, root-cause hypothesis with discriminating tests, and explicit **native repair vs selective REDOWN port vs shared extraction** decision. Stop and request the owner's approval for the proposed minimal approach. **Do not open a second extraction/porting branch, edit REDOWN, deploy a Worker, modify user storage, merge, tag or publish without required authorization.**

Protect the owner's known-good tags and current installed extension. If there is already a related in-progress branch, inspect it before creating another; do not churn branches or overwrite it.

## Required behavior after approval

1. A correctly configured Simple entry targeting an already-authorized R2 bucket/folder must resolve and save at its exact `provider/accountId/connectionId/bucketName/prefix`. A different bucket must have its **own verified compatible Worker binding/capability** or actionable exact-bucket setup recovery; a different prefix in a compatible ready bucket should safely reuse the existing Worker only when its allowed prefix scope permits it.
2. `redown` remains functional; the new target must not depend on `redown` as the default, and changing Default/only-choice membership must never redirect the selected upload.
3. Configuring a destination is distinct from becoming **save-ready**. If preparation is required, show the precise user action, honoring durable, previously granted setup approval; do not require needless repeat consent, do not auto-bill or create Workers without actual authorization.
4. A blocked native click should retain its requested target and user intent **locally and safely** for a user-controlled retry/resume where feasible. Avoid reissuing a write when an earlier attempt may have completed; reconcile by operation/receipt identity. Do not send page/source URLs or metadata to Cloudflare; honor existing privacy requirements.
5. OAuth sign-out/reconnect must preserve all Simple/Narrow/Depth entries, Default, Quick, hidden entries, account/bucket selection, and setup-ledger history. A normal subsequent authorized login should reverify/reuse infrastructure and not force repeated manual preparation. Login/OAuth success must remain independent of an unavailable Worker; report attention separately.
6. Never report save success or increment counters until the provider-independent HEAD/readback confirms object identity, correct destination, size and available version/hash evidence. No wrong-bucket fallback. No ghost success during setup, source or network errors.
7. Maintain GUI ↔ versioned `3+1.1` API parity and one canonical engine/registrar. Keep CURRENT/source documentation synchronized with each implemented rule and the immutable baseline preserved.

## Minimal implementation procedure (after owner authorization)

- Read both repos at the exact target commit and current branch. Capture prechange `git status`, branch/ref, baseline test outcomes, relevant CURRENT/approval state assumptions, and exact test reproduction.
- Implement smallest targeted fix after Phase 1's decision. Prefer proven REDOWN readiness invariants and small adaptable utilities; do **not** transplant its monolithic background worker or secrets-bearing profile model.
- Keep explicit separation between `commitConfigChange`, per-target readiness, `recoverCloudflareDestination`, native menu projection, right-click resolver and remote transport. If the UX needs a new public action, implement it in the typed service/API and route GUI through it.
- Add privacy-safe per-attempt correlation (opaque target ID, menu generation, readiness classification, setup outcome, final receipt identity). Do not introduce a RAW diagnostic leak.
- Use an isolated, clearly named **Click2Cloud-only** repair branch after phase gate, unless the owner specifies another branch. No modification of REDOWN.

## Test matrix — must implement and run

| ID | Test | Required result |
| --- | --- | --- |
| S01 | Existing authorized `redown` Simple save | verified exact R2 receipt, unchanged |
| S02 | New Simple root in a different R2 bucket | actionable setup if needed; verified save after approved preparation |
| S03 | New Simple folder inside ready `redown` bucket | Worker reuse only when compatible; exact prefix verified |
| S04 | New target made Default | default selection resolves new target; no phantom `redown` |
| S05 | New target as only Simple row + Default | still correct; no dependency on first-installed bucket |
| S06 | Rapid switching of Default and Simple membership | stable native generation; no stale/mismatched target |
| S07 | Logout, relogin, reconsent and MV3 restart | durable entries, consent, Worker reuse and appropriate readiness |
| S08 | Missing setup approval, scope or account role | precise refusal/action; no Worker mutation until approved |
| S09 | Already-ready worker and different prefix | correct binding/scope; no unnecessary redeployment |
| S10 | Wrong account/bucket/plan, deleted bucket, stale Worker | fail closed; no wrong-target writes |
| S11 | Uncertain prior probe/write + retry | inspect/reconcile, no duplicate writes |
| S12 | Invalid source/site denies fetch | correct source error, not `WORKER_SETUP_REQUIRED` |
| S13 | Native Chrome menu disabled/attention row | action accurately matches actual readiness; no inert silent click |
| S14 | Narrow, Depth, Quick, other-provider surfaces | no regression from Simple fix |
| S15 | Full test suite and Windows Chrome real-user acceptance | report separate evidence classes; never overstate fixtures |

Tests must distinguish **unit**, **mock Chrome**, **installed real Chrome**, and **live authorized Cloudflare**. A mock receipt never counts as live verification.

## Reports and delivery gate

Produce a concise final handoff with:
- Proven cause and before/after trace, with alternative hypotheses ruled out.
- Source diff grouped by API/state, menu, provisioning, retry and diagnostics.
- Tests and commands, including failures or environmental limitations.
- Exact actions the owner should test in installed Windows Chrome using both an existing `redown` and a new bucket/folder.
- Rollback instructions and known-good tag/ref.
- PASS / FAIL / BLOCKED / NOT TESTED by evidence class.

**Hard stop:** Commit only on the isolated working branch, leave merge and release to the owner after actual Chrome verification. Nothing about reading this document constitutes permission to perform Phase 2.
