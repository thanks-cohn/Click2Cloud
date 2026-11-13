# P0 release blocker — Depth right-click entries can be clicked but appear to do nothing

**Reported:** 2026-11-13, after installing/building branch `codex/depth-repair-audit` (user previously verified locally at `08f7d29`).  
**Status:** Open; live user-reported failure; no root cause established.  
**Priority:** P0 for Depth release readiness.  
**Scope:** Depth behavior only. Other modes and all unrelated functionality are out of scope and must not be changed.

## Observed

User reports: **"depth doesnt work ... you can click on the things, and nothing happens."**

- Depth destinations/entries are visible and clickable in the native right-click menu.
- Clicking them produces **no apparent save or user-visible response**.
- The user did not provide a fresh click-operation ID, console trace, Save Results export, or confirmed remote-object lookup for this specific no-response attempt. Accordingly, distinguish **no visible feedback** from **confirmed zero dispatch**, **confirmed failed upload**, or **confirmed missing R2 object**. Those require evidence.
- Previously, a Depth save attempt surfaced `REPAIR_REQUIRED / WORKER_SETUP_REQUIRED` and `Prepare Cloudflare in Remotes before saving`; another observation surfaced `NATIVE_APPLY_INCOMPLETE`. Do **not** assert that the current apparent no-op has the same cause. The exact previously clicked folder/action was also uncertain.
- The separate Depth “Show in Chrome” UI alignment complaint is cosmetic and unrelated unless demonstrated otherwise.

## Expected

Every enabled, clickable Depth destination must either:
1. initiate a save to its exact authorized bucket/prefix and visibly report a verifiable result, **or**
2. return an actionable, accurate error explaining why it could not save.

**A menu action that silently does nothing is unacceptable.** The existing Depth hierarchy and visual structure must be preserved.

## Diagnosis required (read-only first)

- Reproduce on the installed Chrome extension, and identify the exact Depth menu entry (terminal child or internal folder “Save here”; do not assume), registered `menuItemId`, generation, selected canonical target, visibility/enabled state, parent/action IDs, and actual click handler invocation.
- Trace native Chrome `onClicked` → `extension/background.mjs` → registrar/engine/action resolver → authorization → Cloudflare Worker capability → transfer → remote object verification → Save Results/history/UI feedback. Identify the **first stage not reached** or exact blocked/failing code with sanitized evidence.
- Audit `NATIVE_APPLY_INCOMPLETE` acknowledgment generation and whether affected menu items have working handler bindings. Do not treat a displayed menu item as proof of successfully applied/acknowledged state.
- Compare new no-op incident to earlier `WORKER_SETUP_REQUIRED` only if they can be correlated by time/operation/evidence. Avoid inferring that opening Save Results caused the issue.
- Use safe non-destructive test targets, and only perform remote writes when explicitly authorized. Protect tokens and private identifiers.

## Acceptance

- Depth menu clicks yield a verified correct save to R2 or accurate actionable failure feedback; no silent no-op.
- Actual Chrome menu click and R2 readback verified for representative Depth root/child actions when authorized.
- No behavior or code changes to unrelated modes, configs or destinations; no broad engine/architecture rewrite.
- Remains a release blocker until fixed and observed end-to-end. Document precise Intent → Implementation → Reality → Discrepancy and Logic2Real scoring update.

**Related:** `Issues_and_Bugs/Bugs/P1_DEPTH_DESTINATION_WORKER_SETUP_REQUIRED_2026-11-13.md`; GitHub issue #11 concerns a distinct visual layout problem.

## Depth P0 code repair — isolated branch, November 13

Callback fixtures reproduce stale negative readiness → fallback setupOnly → FRESH_CLICK_REQUIRED with zero uploads. A Depth-only native wrapper now checks current scoped readiness, refreshes the exact observation when READY, and delegates to the existing protected resolver/engine. Genuine missing/unready plans block without provisioning, with safe plan subreason and separate durable depth-click outcome; Save Results distinguishes attempts from receipts. Root/intermediate/leaf fixture dispatch, failed native ACK and early failure feedback tests pass. Hierarchy/scroll/projection/caps are untouched.

This does **not** establish the original Windows cause or a real R2 fix. Native loading is administrator-blocked; actual clicks/readback remain UNVERIFIED and this issue remains OPEN. See [audit and remaining gaps](../../codex/11.13.2026-0355/DEPTH_P0_REPAIR/AUDIT.md). Separate WORKER_SETUP_REQUIRED and NATIVE_APPLY_INCOMPLETE observations are not merged into this incident.

## Live Windows reproduction — 2026-11-13: exact plan lookup failure established

On the owner's Windows Chrome installation after building the `codex/depth-p0-click-save` repair at commit `6beaccf`, a real Depth click now produces a definitive local diagnosis instead of appearing silent:

- UI: `Depth: not saved (WORKER_SETUP_REQUIRED / PLAN_MISSING)`.
- Durable Depth click ID: `depth-click:8437ba75-8344-4a57-9d3d-b50188942bd4`.
- Click row ID: `c2c:item:fac90211f53a2d2a`; parent ID: `c2c:item:132c8a263c99277b`.
- `role=save`, `actionKind=attention`, `mode=depth`.
- Desired and acknowledged menu generations **both 26**; `nativeCode=NATIVE_ACKNOWLEDGED`.
- First stopping stage: `worker`; plan reason: **`PLAN_MISSING`**.
- This is a *click attempt*, not a verified transfer or receipt.

The owner also provided a **distinct, successful Narrow R2 save**: operation `0a90880e-4efe-470e-a2bc-326eb975e68d`, verified by `R2_HEAD_VERSION_SIZE`, file `348s.jpg`, bucket `redown`, prefix `.click2cloud-readiness/.../`. Provenance confirms `mode=narrow`. This establishes that an R2 Worker/capability was functional for the Narrow destination at its operation time, **not** that Depth selected the identical account and bucket.

**Crucial code fact:** `src/cloudflare/deployment.mjs` persists and looks up a Worker plan by digest of **[accountId,bucketName]**, not by folder prefix or presentation mode; `extension/background.mjs` reads that exact digest via `chrome.storage.local`. `src/modes/depth/native-click.mjs` maps a missing lookup to `PLAN_MISSING`. Therefore, if the two recorded destinations have the same account+bucket in the same extension profile and no intervening plan deletion, this points to an unexpected state/key/lookup inconsistency, not a required new per-folder Worker. If the buckets differ, a missing plan may instead be expected for the unprepared bucket.

**Next decisive evidence (read-only):** Compare `(await click2cloud.current.readRemoteResult('depth-click:8437ba75-8344-4a57-9d3d-b50188942bd4')).destination` with `(await click2cloud.current.readRemoteResult('0a90880e-4efe-470e-a2bc-326eb975e68d')).destination`, locally in the service worker. Report only sameAccount/sameBucket flags and bucket names; do not export tokens, Worker secrets or full storage. Do not deploy/reset/provision a Worker or change any unrelated modes to diagnose this.

**Status:** Depth P0 still **OPEN**, live saved-click failure localized to missing exact account+bucket plan. Native click dispatch and ACK are no longer the failing boundary for this specific attempt. Real Depth R2 save remains unverified.
