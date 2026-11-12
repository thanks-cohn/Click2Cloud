# CRITICAL / P0 — Unified GO TO, LOGIN, and REFRESH architecture

**Product:** Click2Cloud  
**Written:** 2026-11-12 (America/Chicago)  
**Status:** Authoritative **proposed product architecture** and acceptance contract; **not an implementation claim**  
**Priority:** **CRITICAL / P0**, because silent authentication loss can make right-click saving unusable while the UI still appears connected.  
**Related project direction:** [OAuth readiness and independent recovery](../Project_direction/CRITICAL_OAUTH_READINESS_SEPARATE_GO_TO_RECONNECT_2026-11-12.md)  
**Sibling architecture:** [Depth menus](depth.md)

## 1. Foundational separation: three distinct functions

> **GO TO visits. LOGIN establishes a new extension connection. REFRESH verifies, renews or repairs an existing one.**

**Do not confuse:**
1. **Website navigation / web session:** whether visiting the provider's website opens it, or asks that browser session to log in. The extension usually has no reliable permission-preserving way to know the site's cookie/session status in advance.
2. **Extension authorization:** whether Click2Cloud can obtain and use the sanctioned provider OAuth credentials or, for R2, the separate approved credential mechanism.
3. **Save readiness:** whether the correct account, exact selected destination, required permissions, provider availability, and transfer engine are currently sufficient to attempt a save. It is still **not** proof of a completed upload.

A remembered account, a successful prior save, a browser tab that displays Drive, or a stored `connected` flag is **not** evidence that Click2Cloud has valid current upload authorization.

## 2. The compact provider tile: GO TO + a neighboring refresh icon

### Normal, previously connected account

```text
Google Drive                                 Ready to save
┌────────────────────┐  ┌─────────┐
│       GO TO        │  │   ⟳     │
└────────────────────┘  └─────────┘
     open website        check / renew / reconnect
```

- **GO TO** remains the main visual affordance while a meaningful known cloud destination exists. It opens the configured provider website, account route, or destination. It is navigation-only: **no OAuth, no upload, no implicit login repair**.
- **Refresh icon** is an **independent button immediately next to GO TO**, always discoverable even if the cached account status is `connected`. It is neither a click region inside GO TO nor a replacement primary label. Its accessible name includes the provider (e.g., `Check or reconnect Google Drive access`), with a tooltip and visible keyboard focus.
- Under normal healthy operation, refresh is **neutral** (thin neutral outline, neutral icon, no tinted warning).
- A separate short status line indicates actual save-readiness, e.g. **Ready to save**, **Checking access**, **Reconnect required**, **Provider unavailable**, **Permission denied**, or **Readiness unknown**. Website navigation is never used to assert readiness.

### Truly unconnected account

```text
Google Drive                                 Not connected
┌────────────────────┐  ┌─────────┐
│       LOGIN        │  │   ⟳     │
└────────────────────┘  └─────────┘
    initial consent       check / recovery as supported
```

- Show **LOGIN** primarily when there has **never been a configured connection** or disconnection is positively established (including an explicit user sign-out).
- LOGIN starts the official provider authorization/setup process from a user gesture, preserving current product-approved setup boundaries.
- For a **known account with revoked or expired extension consent**, do **not** automatically replace GO TO with a catch-all LOGIN. Keep GO TO for navigation and display **Reconnect required** on the adjacent refresh icon and status.
- If no meaningful destination URL/account navigation exists, GO TO need not be shown as an empty or deceptive action; a standalone LOGIN is appropriate.
- When a user deliberately disconnects, preserve saved destinations/configuration/History unless an explicitly confirmed separate data-removal operation applies.

**Technical honesty:** GO TO is not proof that a website's browser login is valid. It may legitimately open the provider's login page. Without invasive cookie/session access, `known provider destination` is a safe criterion for offering GO TO; `website definitely still logged in` is not. Do not add cookie scraping, hidden pages, overbroad browsing permissions or automatic login probes to manufacture certainty.

## 3. Exact refresh icon color system — owner's approved design

**Red denotes actionable OAuth repair, not just an elapsed token timer.** Access tokens commonly expire; silent renewal should be normal.

| Observed state | GO TO | Refresh icon | Status / tooltip |
| --- | --- | --- | --- |
| Known account, current auth and readiness valid | Available | Neutral icon + neutral outline | Ready to save |
| Token expiring or expired; silent renewal succeeds | Available | Remains neutral | Ready to save |
| Silent renewal in progress / access being checked | Available | Neutral; subtle busy treatment | Checking access |
| Grant expired and **cannot** silently renew, consent required | Available | **Red outline, slightly red icon and subtle red-tinted background** | Reconnect required |
| Grant explicitly revoked / missing required OAuth scopes | Available if destination known | **Red outline, muted red tint** | Reconnect required or permission required |
| Provider 429 / HTTP 5xx / timeout / Graph 503 | Available if destination known | **Amber / warm warning**, **not red** | Service temporarily unavailable; retry later |
| State unverified / diagnostic service unavailable | Available if destination known | Neutral or restrained informational state | Readiness unknown |
| Never linked or explicitly disconnected | LOGIN | Neutral or optional secondary recovery button | Not connected |

**Visual specifics:** a thin, restrained red outline; a *slight* red change in icon color and background tint; no flashing, shaking or aggressive animation; keep sufficient contrast in light, dark and high-contrast themes. Pair color with a tooltip/text label because color alone is not accessible. If reconnection succeeds and actual authorization is verified, return to neutral. Never switch an outage to OAuth red without positive evidence of broken permission.

## 4. What clicking each control does

### GO TO — navigation only

```text
User clicks GO TO
    -> resolve provider/account's safe known destination URL
    -> open website/destination in normal browser context
    -> do not alter credentials, connected status, queue, History or transfer counters
```

Opening a website may show a provider login page; this does **not** mean Click2Cloud was logged out or that a pending save was completed.

### LOGIN — initial connection / genuinely disconnected

```text
User clicks LOGIN
    -> sanctioned provider-specific login / consent
    -> verify intended provider + account + necessary scopes
    -> retain existing user configuration and scoped approvals
    -> show GO TO and adjacent refresh only once a known connection is established
    -> separately establish current upload readiness
```

Do not silently change a saved account, destination, Quick Select, Default, folder or bucket, or allocate billable cloud resources merely because a generic login button was clicked; follow the current explicitly approved account/setup policy.

### REFRESH — *check first, request consent only when required*

```text
User clicks refresh icon
  -> deduplicate concurrent checks for that exact provider/account
  -> noninteractive provider-auth/status verification
  -> renew an access token silently where the sanctioned API supports it
      -> if verified: status Ready to save; neutral icon
      -> if consent missing/revoked: explicit user-triggered official authorization flow
          -> if authorized and exact identity/destination verified: Ready to save, neutral icon
          -> if canceled/denied: Reconnect required, red icon, original settings unchanged
      -> if provider API unavailable / 503 / timeout: Provider unavailable, amber icon; bounded retry guidance
      -> if still unknown: Readiness unknown; no fabricated success
```

**Do not** use "refresh" as an unconditional sign-out or a way to wipe and recreate auth. Do not automatically create unsolicited OAuth windows during startup, passive polling, queue draining or background errors. A directly clicked refresh icon is an authorized user gesture, but do not surprise users with a password prompt from unrelated automatic activity.

## 5. Unified canonical connection state model

The Shelf, fallback popup, independent right-click engine and trusted local API must consume the **same provider/account-scoped truth**. A provider adapter may have separate authentication mechanisms; UI branches should not invent their own credentials or readiness state.

Suggested conceptual fields (not new implemented method names):

- `providerKey`, `accountKey`, `configuredDestination` — known identities without leaking credentials.
- `accountKnown` / `explicitlyDisconnected` — onboarding/navigation state, distinct from live auth.
- `authState`: `unknown | checking | valid | consent_required | denied | disconnected`.
- `authLastVerifiedAt`, `authVerificationSource`, `authVerificationStale` — do not interpret a cached connected string as a perpetual guarantee.
- `providerReachability`: `unknown | available | temporarily_unavailable`.
- `destinationCapability`: `unknown | verified | unavailable | permission_denied`.
- `saveReadiness`: `ready | checking | reconnect_required | service_unavailable | unavailable | unknown`.
- `reasonCode`, `retryable`, `nextSafeAction` — sanitized provider-specific diagnostics.
- `lastVerifiedSave` — historical independently confirmed success, **not** auth readiness.

Consult the actual trusted `3+1.1` API registry (`loginBegin`, `loginStatus`, `disconnect`, `getConfiguration`, etc.) before implementing new methods; use one canonical provider adapter/status contract and existing trusted actor boundaries. Native/GUI projections must share this model.

### Fault classification matters more than a single "connected" flag

- Google `OAuth2 not granted or revoked`: authorization is not available; user-facing **Reconnect required**, red icon when consent is genuinely required.
- Microsoft Graph HTTP 503: **temporary provider/API failure**; keep navigation and preserve credentials; amber state, not LOGIN.
- `401` / `invalid_grant`: inspect provider-specific meaning and refresh outcome before declaring consent revoked. A generic failed HTTP request without response details is **unknown**, not automatically a permanent login failure.
- `403`: could be missing scopes, administrator denial, permission to a particular destination, or quota; classify using actual provider evidence. Do not paint every 403 as fixable by OAuth.
- `429` / network transport error / transient 5xx: bounded backoff/retry guidance; no login loop.
- Chrome service-worker suspension or Shelf failure: recover status from durable truth without inventing an absent account or a verified save.

## 6. Recovery without risking cloud data

When a right-click save meets an authorization barrier:

1. Retain the attempt ID, provider, account, intended destination and safe durable save-intent metadata.
2. Show **Reconnect [provider]** through the refresh affordance; when the Shelf is broken, expose an independent popup or sanctioned user-triggered recovery surface.
3. On reauthorization, **verify same account and destination** before any resume.
4. Reconcile uncertain cloud writes with existing provider receipts first. Do not blindly retry a possibly completed upload or increment counters on login alone.
5. Other healthy providers and existing context-menu registrations must remain operational.

Preserve History, pending jobs, default/narrow/depth selections, setup consent records, verified receipts, counters, browser storage and forensic evidence. Never recommend reinstall/clear-storage as routine OAuth repair.

## 7. Confirmed REDOWN predecessor case motivating this rule

On 2026-11-12, REDOWN's Google Drive Shelf retained `GO TO` while right-click attempts ended `interrupted · PROVIDER_FAILED` and the saved transfer showed `OAuth2 not granted or revoked.`. In the Shelf, the owner explicitly invoked the existing interactive `googleDriveOpen` procedure; Google showed a consent form, and real saves subsequently worked. **What caused the permission to become unavailable remains unproven** (normal expiry, revocation or Chrome lifecycle are possibilities, not findings).

Separately, OneDrive returned Graph HTTP 503 and a Microsoft web login showed HTTP 503. These data points must not be collapsed into a single OAuth expiration diagnosis.

Related evidence/specification: [predecessor login/readiness report](../Issues_and_Bugs/provider-connected-but-right-click-save-unauthorized.md).

## 8. Release-blocking acceptance matrix

1. Existing known Google account + unavailable extension OAuth + working Google website: GO TO stays available; **red refresh** is visible, clickable and keyboard-accessible; official Google consent can restore verified saving without DevTools.
2. Silent refresh succeeds: no red icon, no unnecessary login prompt, no loss of exact destination.
3. Explicit revocation, missing scopes, canceled consent, account-switch attempt: truthfully classified; preserved configuration and pending jobs; no wrong-account upload or false success.
4. Microsoft Graph 503, throttling and offline errors: **amber**/temporary provider state, no destructive logout or mandatory repeated login.
5. User never connected: LOGIN is visible and functional; no fabricated GO TO target.
6. Browser website session logged out but extension token valid: GO TO can open provider website login; saving may remain available if API capability is valid.
7. Shelf fails or worker restarts: popup/right-click offers safe provider-specific reconnection; other healthy providers remain usable.
8. Tiny Shelf width, dark/light themes, hover/focus, reduced motion and keyboard/screen reader access: refresh remains obvious but restrained.
9. Reconnect is not a save receipt, and no uncertain upload is replayed without reconciliation; verified counts remain truthful.
10. Test in actual installed Windows Chrome with real authorized provider flow and real remote receipt; separate this from unit tests/isolated browser mocks.

## 9. Implementation ownership and versioning

This paper is a **product architecture**, not an assertion that these behaviors exist today. Any implementation must reconcile this paper with the actual current `AGENTS.md` owner overrides, provider auth adapters, Shelf/popup UI, and trusted API method contracts; record observed installed-browser and provider results. The project-direction OAuth rule remains consistent; this paper adds the owner's approved **refresh icon placement and red/amber visual semantics**.

**Release blocker:** The previous REDOWN experience—GO TO shown with no discoverable way to restore OAuth—is unacceptable in Click2Cloud.
