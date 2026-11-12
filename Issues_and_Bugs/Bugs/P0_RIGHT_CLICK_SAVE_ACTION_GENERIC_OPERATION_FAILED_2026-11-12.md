# P0 BUG — Right-click Save action does not work; generic operation failure hides the cause

**Owner reported:** 2026-11-12 (America/Chicago)  
**Product:** Click2Cloud (not REDOWN)  
**Priority:** P0 — core right-click saving path unusable in the reported attempt  
**Status:** OPEN — owner-reported in live usage; underlying error code, provider and exact failing phase **not yet captured**.

## Observed owner symptom

- The owner activates the **Save** action from Click2Cloud's right-click/context-menu workflow, but the save does **not** work.
- The application displays the exact message:

  > **The operation could not be completed. Inspect the relevant panel for details.**

- No verified remote receipt or independently confirmed cloud object for this failed attempt was provided. Do not claim the file was uploaded, or that it definitely was not uploaded, solely from this generic message.
- Do not assume this is the same as the separately observed REDOWN Google OAuth issue or Microsoft Graph HTTP 503. This is a new **Click2Cloud** incident.

## Source-inspection clue, not a verified cause

In `extension/app.mjs` the shared `status()` UI renderer recognizes an all-uppercase error code and maps any unmapped code to:

`The operation could not be completed. Inspect the relevant panel for details.`

It also stores the raw code in the status element's `data-code` / `data-diagnostic` attributes. This fallback is **non-actionable**: a user may receive it with no visible direct instruction about which panel, which operation, or how to recover. Inspect the actual error code and the failing canonical API response before attributing root cause.

## Required Codex investigation

1. Reproduce from a **real context-menu Save action** (not just a direct API call or a visual preview) on an eligible web resource. Identify the exact menu item/generation, configured provider/account/bucket/prefix, source origin/context, listener result and original trusted API response.
2. Capture a sanitized chain: GUI/native right click → `src/chrome/registrar.mjs`/context-menu adapter → `extension/background.mjs` → `src/api/service.mjs`/canonical save dispatcher → source fetching → provider write → remote verification → History/counter. Distinguish owner-visible message from the underlying code and exception.
3. Classify permission/onboarding/OAuth, R2/Worker readiness, missing CURRENT/configuration, invalid/stale menu ACK, source restrictions, API validation, network timeout, storage failure and remote failures **using evidence**, without choosing a root cause prematurely.
4. Surface the real provider/phase/code and a **specific safe next step** on the same relevant screen, with a link/route to the corresponding diagnostics panel. Never force the user to guess which panel is "relevant."
5. Preserve the original user-selected exact destination. Never silently reroute to root or a different cloud, delete configuration, re-create Cloudflare resources or clear OAuth to make the error disappear.
6. Keep a durable attempt record and report `blocked`/`failed`/`uncertain` accurately. A click, save button press, dispatch ACK or pending queue is **not** proof of a cloud save. Do not replay uncertain writes without provider receipt reconciliation.

## Acceptance

- The reported UI right-click Save works on a valid configured/provider-authorized target, and a real remote object and receipt are verified in installed Chrome where supported.
- Each injected error class shows the actual provider-specific error/phase and actionable recovery instead of the generic catch-all; pure UI tests cannot establish real cloud success.
- Distinguish right-click, native Chrome menu registration/ACK, local Explorer context-menu and provider Save button routes; avoid fixing only one surface while leaving the user's path broken.
- Preserve all user credentials, CURRENT state, saved destinations (Simple/Narrow/Depth/Quick/Default), setup approvals, jobs, History, counters, cloud files and diagnostics throughout testing.
- No new unnecessary permissions, hard resets, destructive cleanups or unrelated provider changes.

**Helpful next owner evidence (optional; not a prerequisite to logging/assigning):** The exact selected provider/menu item and the original status code from the UI diagnostics, rather than another generic screenshot. Do not request secrets or RAW diagnostic archives publicly.

**Disposition:** Record as an OPEN P0 bug; implementation and real Chrome proof outstanding.
