# CRITICAL / P0 — Never equate GO TO with OAuth readiness; always expose independent Reconnect

**Recorded:** 2026-11-12 (America/Chicago)  
**Product:** Click2Cloud, informed by an observed REDOWN Windows Chrome incident  
**Priority:** **CRITICAL / P0 — release-blocking reliability and recovery contract**  
**Status:** Product-direction requirement and reproducible predecessor finding; **not implemented or verified in Click2Cloud**.

## Non-negotiable product rule

> **A user being able to open a cloud website does not prove that Click2Cloud possesses a valid OAuth grant or can upload. GO TO and LOGIN / RECONNECT are separate capabilities and must never be mutually exclusive.**

Every supported provider/account has an independently accessible **GO TO** action for navigation and an independently accessible **LOGIN / RECONNECT** action for authorization repair. A stale `connected` flag, remembered account identity, working provider website session, previously successful save, or browser tab navigation must never suppress the reconnect action or count as verified save readiness.

This is an error **Click2Cloud must not repeat**.

## Owner-observed REDOWN failure and recovery (live Windows Chrome, 2026-11-12)

Evidence and observations, not an unproven root cause:

1. Google Drive had previously completed verified saves. Later, right-click attempts displayed `interrupted · PROVIDER_FAILED`.
2. The extension's `googleDriveTransfer` reported `status: uncertain`, `error: "OAuth2 not granted or revoked."`, `bytes: 0`, `total: null`. The last five inspected `googleDriveJobs` included three older `completed` jobs and two `uncertain` jobs, both at `phase: source`, `code: PROVIDER_FAILED`, `attempts: 3`, `reported: true`. Do **not** treat a generic reason or UI label as the original OAuth exception or as a remote upload receipt.
3. The REDOWN Shelf **still showed GO TO** for Google Drive and no visible LOGIN/RECONNECT action. GO TO opened the Google Drive website instead of renewing the extension's permission. The browser website session and extension OAuth grant were wrongly conflated in the user experience.
4. Read-only REDOWN source inspection confirmed that `shelf-google-drive.js` paints `GO TO` whenever the persisted `googleDriveState.phase === "connected"`; pressing that control in this state opens a Drive tab. The `googleDriveStatus` handler wakes the save queue but does **not** independently verify OAuth readiness.
5. From the Shelf context, invoking REDOWN's existing `chrome.runtime.sendMessage({type:"googleDriveOpen"})` launched Google's real consent/authorization form. **After the user authorized, Google Drive saves worked again.** This demonstrates an achievable recovery path without reinstalling or clearing history.
6. **Not proven:** why Chrome lost the usable Google OAuth grant (expiry, revocation, permissions, browser lifecycle, etc.). Do not label this definitively as normal token expiry. Do not conclude the two uncertain source-phase attempts were definitely absent remotely without checking provider records.
7. Separately, OneDrive reported `ONEDRIVE_GRAPH_503` and `ONEDRIVE_NETWORK`, with the Microsoft web login itself showing HTTP 503. That is a **provider/network availability class**, not proof of revoked OneDrive credentials. OneDrive's Shelf currently performs more active token/account verification than Google's, but both require the same independent navigation/reauthorization contract.

Relevant predecessor source inspection:
- REDOWN `extension/shelf-google-drive.js`: connection-state-gated `GO TO` / `LOGIN` button.
- REDOWN `extension/google-drive-provider.js`: `googleDriveOpen` invokes interactive `connect()`; `googleDriveStatus` wakes the queue.
- REDOWN `extension/shelf-onedrive.js` and `extension/onedrive-auth.js`: status check and refresh/Graph verification can set `reconnect`; transient Graph 503 must not be mistaken for lost consent.

## Required interaction model — two independent actions, one honest readiness indicator

**GO TO — navigation**
- Opens the provider's appropriate website or selected cloud destination, using the browser's existing website session if available.
- Exists whether the Click2Cloud extension is connected, disconnected, expired, revoked, offline, or experiencing provider API issues, subject only to a meaningful available destination URL.
- Never implies that Click2Cloud has upload permission. A navigation result is not an authorization check or remote-save proof.
- Does not trigger an OAuth flow, reconnect an extension credential, change account selection, or retry a file transfer.

**LOGIN / RECONNECT — extension authorization**
- Always discoverable independently in Shelf, extension popup/fallback and provider settings. Label appropriately: **LOGIN**, **RECONNECT**, or **CHECK ACCESS** based on known state, without hiding the ability to manually reauthorize even when state says connected.
- Uses the provider's official, sanctioned interactive OAuth/consent flow when the user explicitly chooses it; never captures provider passwords or solicits manual token pasting to an untrusted page.
- Distinguishes **refresh silently when possible** from **explicit user consent required**. No surprise unsolicited login windows merely because a background health check fails.
- Verifies the *correct* provider, account, required scope(s), destination binding and relevant capability after auth. Do not silently authorize a different account or rewrite the chosen destination.
- Never removes previously saved destinations, Quick/Default choices, setup approvals, jobs, receipts, counters or History merely because a token expires or a reconnect fails.
- Explicitly supports recovery when the Shelf is broken: minimal popup and, where browser APIs allow, a targeted user-triggered provider recovery path from the right-click intent.

**Status — truthful save readiness**
- Separate independently stored/observed concepts: `websiteNavigable` (not used as auth evidence), `accountKnown`, `oauthGrantState`, `tokenRefreshState`, `requiredScopesState`, `providerReachability`, `destinationWriteAccess`, `uploadReadiness`, and `lastVerifiedSave`.
- A persisted `connected` state is only a remembered projection, not everlasting proof of an OAuth token. Startup and Shelf opening should perform bounded noninteractive readiness checks where available, without blocking the UI or healthy right-click providers.
- Present **Ready to save** only with current verified credentials/scopes and destination readiness appropriate to the provider; otherwise **Checking access**, **Reconnect required**, **Service temporarily unavailable**, **Permission denied**, or **Readiness unknown**. Avoid claiming permanent writability from a token-only check or uploading test objects without consent.
- A Microsoft Graph 503, generic timeout, throttling/429, network outage or provider 5xx must be classified as **temporary reachability/verification failure** and follow bounded retry/backoff guidance, **not automatic OAuth revocation**. 401/invalid grant and missing scopes require provider-specific classification and recovery.
- Provider outages and failed auth must affect only the relevant provider/account; all healthy configured destinations remain functional.

## Save-intent and diagnostics guarantees

- When an authorization failure interrupts a right-click save, retain the original provider, account, exact destination and attempt ID as permitted; show an actionable **Reconnect [provider]** recovery path.
- Resume only after the intended account/target are reverified, and only when safe; reconcile uncertain jobs using provider receipts before any automatic write replay. Do not duplicate previously completed or ambiguous uploads, claim success on OAuth alone, or increment verified counters on login.
- Error reports must expose provider-specific code, phase, auth classification, HTTP status/retryability and whether the operation reached SOURCE / PROVIDER_WRITE / REMOTE_VERIFY; the generic `PROVIDER_FAILED` classification must not hide the actionable cause.
- Keep diagnostics read-only/nonblocking where possible. Preserve existing append-only evidence and incident data; never reset settings/history or delete logs as an authentication workaround. Do not export access tokens, refresh tokens, auth codes, signed URLs or unredacted RAW data into public issues.

## Release-blocking acceptance tests (P0)

1. **Reproduce the exact owner regression:** stored Google `connected` + Chrome reports `OAuth2 not granted or revoked` -> **GO TO remains available AND RECONNECT remains independently visible**; the UI does not call the provider upload-ready. User-triggered reconnect launches Google consent and a new *single* save can complete with verified remote receipt.
2. OAuth access token expires while refresh/renewal remains possible -> silent refresh succeeds without unnecessary repeated login prompts; state and selected account stay stable.
3. OAuth grant is revoked, refresh token invalid, scopes missing, admin denied or user cancels -> precise provider-specific actionable state, no false verified save, no destination or History loss; other providers still work.
4. Provider serves 429/500/502/503 or network timeout (including Graph 503) -> show temporary provider/API failure and retryability; do **not** classify it as revoked permission or force destructive reconnect.
5. Provider website GO TO works but extension access is revoked -> GO TO works independently, RECONNECT available, upload blocked until verified.
6. Extension OAuth works but website session is logged out -> authenticated extension may still save with correct validated API access; GO TO may require website login; no mistaken disconnection.
7. Shelf crash, popup fallback, worker suspend/restart, stale persisted state and long-running queue -> login/reconnect remains reachable through an authorized user gesture; no unintended duplicate uploads.
8. Change accounts during reconnect -> require explicit account confirmation/validated binding; preserve old saved locations; never silently retarget.
9. Multi-provider fault isolation: force Google revoke + OneDrive Graph 503 + healthy Dropbox/R2 -> actionable independent status for each; healthy saves still work.
10. Test installed Windows Chrome with real provider consent/save/receipt and stable trace evidence; unit tests or simulated Chrome APIs alone do not satisfy live acceptance.

## Scope, priority and cross-references

- **Priority:** **CRITICAL / P0**, across Google Drive, OneDrive, Dropbox and every future OAuth provider; for R2/other non-OAuth providers provide equivalent separated navigation and credential repair without mislabeling API keys as OAuth.
- **API-first:** One canonical authorization/readiness/recovery contract powers Shelf, popup, independent right-click fallback and automated tests. No duplicate login implementations for visual components.
- **Minimal UI:** Two clear actions can live in a compact provider card or options affordance; separation matters more than decorative styling.
- **Do not change REDOWN or Click2Cloud runtime code as part of merely recording this direction.** Implementation is future work, and real Windows/browser testing is still required.
- Related existing report: `Issues_and_Bugs/provider-connected-but-right-click-save-unauthorized.md`.
- Related resilience direction: `Project_direction/FLIGHT_RECORDER_INDEPENDENT_RIGHT_CLICK_GRACEFUL_RECOVERY_2026-11-12.md` (especially emergency provider reauthentication).
- Related constraint: preserve persistent destination state, configured right-click menus and the user's setup approval across auth/lifecycle failures; see `AGENTS.md`.
