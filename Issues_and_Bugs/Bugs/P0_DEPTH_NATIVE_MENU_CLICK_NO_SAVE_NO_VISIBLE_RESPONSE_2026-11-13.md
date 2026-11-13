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
