# P0 investigation — + Right Click → Save reports DESTINATION_EXISTS, but UI hides the duplicate configuration conflict

**Owner reported:** 2026-11-12 (America/Chicago)  
**Product:** Click2Cloud (not REDOWN)  
**Priority:** P0 — core right-click saving path unusable in the reported attempt  
**Status:** OPEN — owner-reported in live usage; underlying error code, provider and exact failing phase **not yet captured**.


## 2026-11-12 owner console evidence — **the hidden error is now known**

The owner ran the read-only DevTools status inspection in the Click2Cloud UI:

```js
const el = document.querySelector("#status");
console.log({
  message: el?.textContent,
  code: el?.dataset.code,
  diagnostic: el?.dataset.diagnostic
});
```

Output:

```text
message: "The operation could not be completed. Inspect the relevant panel for details."
code: "DESTINATION_EXISTS"
diagnostic: "DESTINATION_EXISTS"
```

**Narrowed finding:** The user reports pressing **Save in `+ Right Click`**. That dialog edits Click2Cloud **menu configuration**; it is **not** itself a file-upload attempt. The earlier broad wording "right-click Save failed" must not be interpreted as a proven failure of a native cloud upload or provider write.

Source inspection at the current default branch:
- `extension/app.mjs` `openPopup(t, existing=null, fromManager=false)` calls `createDestination` if `existing` is absent, then `change(changes)` submits `commitConfigChange`. An existing entry opened through the **Manage Destinations pencil** is treated as `updateDestination`, not `createDestination`.
- `src/api/config.mjs` `applyConfigChanges` explicitly throws `DESTINATION_EXISTS` when `c.type === "createDestination"`, the mode is **Simple**, and a configured destination already has the same canonical `targetKey` (provider/account/bucket/prefix identity). This protects against duplicate Simple entries; it is **not** proof that authorization, Cloudflare Worker, R2 writes, or Chrome native menu dispatch failed.
- `extension/app.mjs` `status()` maps an unknown uppercase error to the generic message, hiding the precise `DESTINATION_EXISTS` condition.

**Most likely interpretation, conditional on the actual target:** The user selected a location already configured for **Simple**, and `+ Right Click` tried to create it a second time. The invariant against duplicate Simple target IDs should be preserved. Inspect the actual existing config and mode before claiming the same target was definitely present; the error code itself establishes the duplicate-check branch fired on the attempted new Simple destination.

**Expected UX repair (do not weaken duplicate protection):**
1. On `+ Right Click → Save`, check whether the selected canonical target already exists in that mode before submitting `createDestination`, or handle the typed `DESTINATION_EXISTS` API error deterministically.
2. Display **"This location is already in your Simple right-click destinations."**, with **Edit existing** (opens the authoritative saved entry) and **Cancel / Back**. If configured target is in a different mode, show the correct mode and semantics; do not rewrite or erase other independent Narrow presentations.
3. If the user intentionally edits an existing destination, submit `updateDestination` using its persisted ID and expected revision, not `createDestination`.
4. Preserve exact Default/Quick, label, visibility, Depth scopes, remote target, and persisted generations; do not implicitly change them by acknowledging the duplicate.
5. Distinguish **"Save changes to right-click configuration"** from **"Save file to cloud"** in labels and diagnostic stages. The separately requested **Save** button in Manage Destinations has its own configuration-only workflow.
6. An error should name the failing operation and recovery location; no blanket "Inspect relevant panel".
7. Test **new Simple target succeeds**, **existing Simple target shows edit route without mutation**, **existing entry edit persists**, **Narrow same-physical-target independent presentations stay supported**, **other mode selections preserved**, **Chrome native menu ACK and real upload tested separately**.

**Evidence boundary:** This console capture does **not** prove a native right-click-to-cloud upload was attempted or failed. Treat the native upload path as **NOT ESTABLISHED by this incident** until independent attempt/receipt data is supplied. Do not reproduce a destructive reset or provider write to diagnose a configuration duplicate.

---

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
