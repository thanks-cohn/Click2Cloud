# P1 — Depth destination save blocked: WORKER_SETUP_REQUIRED (clicked entry unresolved)

**Reported:** 2026-11-13 (live installed Chrome extension)  
**Status:** Open / live failure reported / exact clicked row and root cause unverified  
**Priority:** P1, user-facing Depth save failure  
**Build reported in supplied diagnostic evidence:** 0.3.19 / `bd8da5e`  
**Modes:** Depth fails in a reported path near an `Images` directory; Simple and Narrow saves succeeded (user verified object arrival).

## Direct observations

- The user successfully saved files through configured **Simple** and **Narrow** destinations, then verified they arrived in their remote destinations.
- A right-click save through a **Depth** path involving `Images` failed, with the UI message: `Prepare Cloudflare in Remotes before saving.`
- Advanced diagnostics showed:
  ```json
  {"state":"REPAIR_REQUIRED","worker":"WORKER_SETUP_REQUIRED"}
  ```
- The user **cannot confirm whether the clicked item was a “Save here” action or a child-directory entry**. Do not assign the failure to either until a new traced reproduction establishes the actual Chrome menu item ID, role, parent, target, and destination prefix.
- The user opened Save Results while testing. Do not infer that opening it caused the failure; verify whether it changes timing or state independently.
- A separate user-provided diagnostic artifact named `Pasted text(7).txt` identifies build 0.3.19 / `bd8da5e`, contains an earliest *retained* failure `SCOPE_UNAUTHORIZED` at the resolver, and declares original physical cause unknown. **This artifact does not prove that `SCOPE_UNAUTHORIZED` and the new `WORKER_SETUP_REQUIRED` message belong to the same save attempt.** Correlate by operation ID/time if possible; otherwise keep incidents separate.

## Expected behavior

Any actionable Depth row representing a configured, authorized, available R2 destination must resolve to an exact `(provider,connectionId,accountId,bucketName,prefix)` and save with independent verification in that selected target; valid Depth saves must not fail because the menu path was compiled differently from Simple/Narrow. If a *specific bucket* genuinely lacks a ready Worker, report that bucket-specific unmet prerequisite without implying the entire Cloudflare connection is unconfigured. Do not bypass actual Worker setup, authority, target or scope checks.

## Candidate areas to investigate (not established causes)

- `src/cloudflare/transport.mjs` `cap(target)`: `WORKER_SETUP_REQUIRED` when `lookup(target)` returns no ready plan or its account/bucket/protocol differs from the clicked target.
- `src/cloudflare/deployment.mjs`: provisioning and lookup are keyed by `(accountId,bucketName)`, not generally by depth or prefix. If a Depth and a working Simple/Narrow entry truly share that exact account/bucket, compare their canonical identities and the lookup/reconstruction path before treating this as a Worker setup issue.
- `src/core/menu-spec.mjs`, `src/core/action-resolver.mjs`, `src/core/engine.mjs`, `extension/background.mjs`: provenance, node-to-click identity, auth target list and handoff to remote transport.
- Chrome installed menu registration/acknowledged generation, stale inventory, hidden/out-of-sync destinations and different account/bucket assignments.
- Save Results UI may expose errors not visible in ordinary flow; do not assume it affects routing.

## Required next reproduction and controls

1. Capture a clean single attempt: exact click path, whether it is a terminal child or `Save here`, native Chrome `menuItemId` and applied generation; sanitized operation ID, timestamps, state transition and Worker readiness error.
2. Capture the **canonical target fields** for the failing Depth action and each successful Simple/Narrow control: account ID (redacted/hashed in shared evidence), bucket name (redact if sensitive), normalized prefix, connection/provider and Worker plan identity/status. Never log secrets, signed grant, access token or URLs with credentials.
3. Compare same-account+same-bucket paths separately from different-bucket paths; test a direct Depth folder leaf and a nested branch `Save here` as distinct scenarios, without guessing the original action.
4. Determine precisely whether `WORKER_SETUP_REQUIRED` originated from missing plan, `plan.state`, account mismatch, bucket mismatch or protocol mismatch; add sanitized field-specific diagnostic codes if currently lost behind a generic message.
5. Do not automatically provision/redeploy a worker or mutate R2 permissions/bucket bindings without explicit authorization; no destructive resets of OAuth, saved destinations, drafts or configs. Existing successful modes must remain undisturbed.
6. Add regression tests reproducing verified failing branch plus same/different bucket scenarios, menu generation/click target mapping and Worker readiness for nested prefixes.
7. Verify real Chrome clicks and actual R2 write/readback, plus Save Results observation. Differentiate blocked-by-auth, blocked-by-worker-plan and true save mismatch.
8. Record **Intent → Implementation → Reality → Discrepancy** and incorporate this finding into Logic2Real rule registry and scorecard; mark real Depth routing as **FAILED in reported case**, exact root cause **UNKNOWN**, and coverage partial until reproduced.

## Acceptance

Identified affected action and target; root cause demonstrated by evidence; a narrowly scoped fix preserving Simple/Narrow/Depth settings and save semantics; real repeated Chrome→R2 write/readback with matching target; no unrelated menu, provider or worker changes. No claim of resolution before evidence.
