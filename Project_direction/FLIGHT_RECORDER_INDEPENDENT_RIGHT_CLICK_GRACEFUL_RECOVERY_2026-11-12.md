# Product Direction — Independent Right-Click Saving, Flight Recorder, Resilient API, and User Diagnostics

**Recorded:** 2026-11-12  
**Product:** Click2Cloud; selectively reuse proven REDOWN diagnostic mechanisms  
**Status:** Proposed architecture/product direction, not a claim that functionality is implemented.

## Non-negotiable reliability principle

> The Shelf is an optional interface to the save engine, not a prerequisite for saving. A broken Shelf must not prevent a user from right-clicking and saving to a previously configured, supported cloud destination.

A Shelf crash, broken render, failed startup, or inability to restore its state must not by itself disable the browser context-menu flow. The Shelf should be recoverable by an obvious **Reload Shelf** action. Reloading the Shelf should reconnect to persisted jobs, configuration and history instead of resetting work or claiming an upload succeeded. If the Shelf is confusing or invisible, right-click saving should still work and show truthful lightweight feedback.

Technical limits must be acknowledged: if the browser, extension worker, permissions, credentials or provider is unavailable, no extension can guarantee a successful upload. In those cases preserve eligible save intents and provide clear recovery; never claim guaranteed delivery.

## 1. Adopt REDOWN's flight-recorder crash diagnostics after validation

Investigate REDOWN's flight-recorder design and **port or adapt it only after it demonstrably captures useful crash evidence**. Build a Click2Cloud-specific event schema and validate it in installed browser/extension tests. Collect evidence for:
- cold boot, failed boot, initialization stage, extension lifecycle, runtime/worker starts and stops;
- Shelf mount/unmount and render errors, component failures and reload attempts;
- context menu creation/click handling, right-click dispatch, destination selection and cloud transfer stages;
- asynchronous exceptions, rejected promises, timeouts, provider errors, OAuth/auth readiness, quota, offline state and storage failures;
- build/version, sanitized environment metadata, correlation IDs, durations, retries, state transitions, outcomes and last-known healthy checkpoint;
- continuity across a crash or restart via bounded durable buffers, session IDs, crash markers and next-launch recovery.

Implement an **opt-in advanced diagnostic mode** with configurable retention/export and, where sensible, uncapped *viewing/export* using streaming or pagination rather than an arbitrary 4,000-event display limit. Storage still needs explicit disk/privacy safeguards and backpressure. Separate diagnostic telemetry from user content and secrets. Never log OAuth tokens, passwords, private URLs with sensitive query strings, file contents or cloud credentials; redact identifiers before export and require explicit consent before sending.

A report should distinguish observed facts, inferred failure causes and unobserved gaps. If a process terminates too early to write full diagnostics, persist pre-crash checkpoints and detect incomplete previous sessions on next boot.

## 2. Build a superior, versioned internal bot/automation API

Create a testable, documented API used by human UI and controlled internal bot/test automation, not an unrestricted public control surface. The API must expose structured health/readiness, startup phase, feature availability, menu registration, dispatch, operation IDs, retries, recoveries, and validated cloud-provider receipts.

Keep the essential right-click/context-menu registration and save dispatcher independent of Shelf rendering. Use one canonical dispatch engine, durable operation state and independently recoverable lifecycle components, rather than two conflicting upload implementations. Automation should be able to reproduce startup and failure scenarios and collect machine-readable evidence.

## 3. Fail gracefully — never let Shelf failure disable the right click path

Required behavior matrix:
- Shelf fails to boot -> context menus and previously configured destinations still work, where extension services and authentication allow.
- Shelf crashes in use -> running saves and right-click dispatch remain independent; Shelf may be reloaded separately.
- Shelf reloads -> reconnect to the canonical operation queue and display actual persisted outcomes; no duplicate transfers or fake successes.
- Extension worker restarts -> rehydrate menus and reconcile unfinished saves from durable checkpoints; handle Chrome's extension lifecycle explicitly.
- Cloud provider/auth failure -> retain truthful pending/failed status and offer targeted reconnect/retry, without breaking saves to healthy providers.
- Malformed advanced configuration -> default to a verified safe and minimal mode rather than taking down the whole app.
- A save cannot be safely queued -> tell the user clearly, with a recovery action rather than silently dropping the attempt.

The architectural target is **fault isolation**: Shelf (presentation) / context-menu adapter / durable queue / provider adapters / observability are separately restartable or degradable. A manual **Reload Shelf** button should be discoverable from a healthy surface such as a popup or settings page that does not depend on Shelf boot. No unnecessary reload of the extension or browser should be required.

## 4. Advanced Diagnostics & Send Bug Report

Provide an approachable **Advanced Diagnostics** page even if the Shelf is broken; expose it through a stable extension settings/popup path. Show recorded failure metadata, last crash, status, report preview, diagnostic ID and export controls. Give users a short checklist:
- When did it fail? **On boot / While using / During a save / While reconnecting / Not sure**.
- What happened? **Shelf missing or unresponsive / Right-click option missing / Right-click did nothing / Login issue / Destination missing / Upload failed / Other**.
- Did **Reload Shelf** help? **Yes / No / Haven't tried**.
- **Anything else?** Optional plain-text details.

Offer **Preview diagnostics**, **Send bug report**, and **Export report**. Clearly explain what data will be transmitted, permit omission of optional environment details, automatically strip secrets, require consent, and provide feedback with a report ID when confirmed received. Consider offline report queueing with user consent and retriable delivery.

The report pipeline should route deduplicated, privacy-safe evidence to maintainers with severity, release and reproduction context. A confirmation is not the same as a promise of immediate resolution.

## 5. Support experience: turn reports into trust

Proposed customer-facing copy:

> **Found a bug? Help us fix it.** If you purchased Click2Cloud or have an active annual subscription, send us a diagnostic report. We'll investigate confirmed issues without an additional bug-fix fee, and make the corrected version available to you as soon as it is released. Your report helps make Click2Cloud more reliable for everyone.

Avoid promising every bug will be repaired immediately, each customer gets an individualized build, or fixes will bypass browser-store review/approval. Core product bug fixes should not depend on purchase status; paid customers may receive clearly defined support priority if actually offered.

## 6. Acceptance criteria before claiming success

1. Force a Shelf boot exception: save through context menu still works on a healthy configured provider.
2. Force an in-use Shelf crash: independent right-click dispatcher remains reachable, and Shelf reload restores honest history.
3. Inject worker suspension/restart: menus recover; pending operations reconcile without false receipts or unintended duplicates.
4. Break one provider's authentication: other valid providers remain operational; failed provider explains how to reconnect.
5. Crash during startup before UI mount: next startup surfaces previous incomplete-session markers and useful checkpoints.
6. Verify user report contains enough structured events to diagnose failure without transmitting secrets or file content.
7. Exercise many consecutive right-click saves, failures, reloads and recovery cycles to uncover state drift, stale menu bindings and silent drops.
8. Ensure users can enter Diagnostics and **Reload Shelf** even when Shelf rendering is broken.
9. Validate observed evidence across repeated real installed-extension tests; retain known gaps.

**Priority:** High architectural reliability direction, starting with independently functioning context-menu saves and fault isolation, then validated flight recorder, bot/test diagnostics API, self-service reporting and support copy.

**Relationship to existing plans:** Complements Project_direction/REDOWN_TACTILE_MACHINE_CLICK2CLOUD_MINIMAL_REFERENCE_BASELINE_2026-11-12.md and the existing persistent queue and verified-save direction. Do not compromise the deliberately minimal Click2Cloud UI with REDOWN-specific styling.


## 7. Headless Zombie Mode — three-tier graceful fallback

**Internal team nickname:** **Headless Zombie Mode**. This is an affectionate engineering shorthand for Click2Cloud's refusal to lose its core job when optional UI components fail. It is not a promise of literal crash-proof software or a required customer-facing brand.

**Design mantra:** *The Shelf may die; the popup should still work; the right-click menu must be our last dependable line of defense.*

### Tier 1 — Full Shelf (preferred experience)

The Shelf remains the primary, richer UI for cloud saves, destination selection, configuration and status. A Shelf crash or failed boot must be contained to its UI boundary. Offer a visible Reload Shelf action; restoration reads persisted state rather than resetting destinations, queue or receipts.

### Tier 2 — Independent extension popup (graceful fallback)

If the Shelf cannot render, open, initialize or recover, the normal browser toolbar extension popup is the user's fully usable fallback control panel. Build it as an **independent minimal entry point**; it must not import a Shelf-only boot path or depend on Shelf state in memory.

The popup must support:
- provider sign-in and reauthentication through sanctioned OAuth/login flows;
- selection, creation where supported, and management of configured cloud destinations/accounts/folders/buckets;
- default destination assignment and right-click menu configuration, including simple/narrow/depth choices when applicable;
- current health, queued/saved/failed status and truthful recent history;
- Reload Shelf and Advanced Diagnostics / Export / Send Bug Report;
- clear guidance if extension permissions, browser services, or a provider are truly unavailable.

A broken Shelf should **never force the user to repair the Shelf just to sign in, manage destinations, or keep saving**. The popup should degrade to simple reliable native controls if advanced presentation/configuration fails.

### Tier 3 — Headless context-menu engine (last-resort core)

The **right-click action and configured right-click destination menus** are core service capabilities, independent of both Shelf and popup rendering. Treat them as the most resilient path, with durable snapshot of last-known-good menu configuration and validated destinations. Persist a safe default destination and reconstruct registrations on worker startup or extension lifecycle events, with reconciliation and health checks.

- Register/rebuild browser context menus without waiting for Shelf or popup boot.
- Avoid coupling right-click handlers to open UI ports, in-memory Shelf-only configuration, or transient component state.
- If a new menu configuration is corrupt, preserve or roll back to a validated last-known-good snapshot, retaining usable destinations rather than clearing every menu.
- If configuration storage is temporarily unreadable, fall back only to verified known-safe choices; do not silently upload to an unintended account, folder or bucket.
- Queue and persist eligible intents before volatile work where possible; ensure deduplication, bounded retries, explicit failure state and verified cloud receipts.
- Recover after extension worker suspension and restart and restore menus where browser APIs permit; distinguish *click accepted*, *queued*, *uploading*, *verified saved* and *failed*.
- If no authorized provider/valid destination exists, right-click can still explain the missing setup and route users to the popup; it must not fabricate success.

### Failure isolation matrix

| Failure | Full Shelf | Extension popup | Right-click/save engine |
| --- | --- | --- | --- |
| Shelf won't start | Unavailable; reload option | **Must remain usable** | **Must remain usable with valid configuration** |
| Shelf crashes while saving | Recover/reopen | **Remains usable** | **Continue/reconcile independent jobs** |
| Popup UI fails | May remain available | Unavailable | **Must remain usable with last-known-good destinations** |
| Both UI surfaces fail | Unavailable | Unavailable | **Aim to preserve registered menus and eligible saves** |
| Extension worker restarts | Reconnect after startup | Reconnect after startup | **Re-register menus, rehydrate durable queue** |
| Provider auth expired | Can show reconnect | **Must support re-login** | Preserve truthful failure/pending status; other providers usable |

**Engineering honesty:** Chrome extension runtime termination, browser shutdown, missing permissions, inaccessible storage, expired authentication and provider outages are external hard limits. "Crash-proof" means **maximum feasible fault tolerance demonstrated by adversarial testing**, not an absolute guarantee that every possible crash still permits uploads. A context-menu click itself must never be falsely reported as a completed cloud save.

### Headless Zombie Mode acceptance tests

1. Inject an exception before Shelf boot and verify popup login, destination management and right-click saving independently.
2. Crash Shelf after setup; ensure last-known-good nested right-click menu continues functioning.
3. Break popup rendering while Shelf is unavailable; verify right-click can save to a correctly configured, authorized destination.
4. Corrupt a proposed menu change; verify rollback to validated menu snapshot instead of disappearing menus.
5. Repeatedly suspend/restart extension workers and verify lifecycle re-registration, queue reconciliation and no duplicate verified saves.
6. Expire one provider's tokens; verify the popup can reauthenticate and other providers' right-click paths remain usable.
7. Reload Shelf after failure and verify it reconstructs from shared persisted truth, not a second divergent state.
8. Record fault injection and recovery events in the flight recorder, including the active tier, reason for fallback, menu registration state and recovery outcome.

**Development priority:** Right-click/menu independence first, popup-Shelf separation second, full fallback diagnostics and controlled fault-injection testing alongside implementation. Preserve Click2Cloud's simple design; resilience should not require REDOWN's richer interface.


## 8. Provider-specific emergency reauthentication — the login lifeline

**Product idea:** When the Shelf will not open (and even when the normal extension popup is unavailable), a power user should still have a way to reauthorize an expired provider without repairing or relaunching the Shelf. This is a **fourth recovery capability within Headless Zombie Mode**, not a fourth main UI tier.

- Right-click actions remain registered independently of the Shelf and popup; an expired token should disable only the affected provider's authenticated transfer, not the entire right-click menu or healthy providers.
- If a user invokes an expired provider, retain a truthful pending/needs-authorization intent where safe and show an explicit **Reconnect [provider]** action via an independent, minimal recovery surface. If all primary UI surfaces are down, launch a small provider-specific recovery/sign-in window from a supported user gesture, subject to browser permission and popup restrictions.
- Use the provider's **official, sanctioned OAuth authorization flow**, preferably through the browser extension identity API or an approved redirect and PKCE mechanism as appropriate. The recovery surface is branded as Click2Cloud only for explanation and control; the provider's credential entry remains on the provider's own trusted page. Never ask users to type provider passwords or copy tokens into an untrusted extension dialog.
- Do **not** automatically spawn unsolicited windows when tokens expire in the background: avoid surprising interruptions and phishing-like behavior. Prompt only when the user explicitly attempts a save/reconnect or initiates recovery, and provide a cancel/later option.
- The sign-in coordinator and callback handling must be independent of Shelf rendering and popup rendering. Preserve provider/account context across authorization and verify that returned credentials bind to the intended account and destination; do not silently switch accounts or save to an unexpected folder.
- On successful reauthentication, refresh the provider's readiness, reconstruct destination menus where needed, and offer safe resumption of pending intents with deduplication and confirmation/receipt checks. On cancel, network failure or denied consent, leave honest actionable **Needs sign-in** state; other providers keep working.
- Support each provider independently: R2 requires its own supported credential strategy; do not label API keys as OAuth or claim every provider uses the same sign-in flow.
- Record expiry, recovery prompt, initiation, callback outcome, and resulting save state in the flight recorder **without recording tokens, passwords, auth codes or private account data**. Avoid exposing secrets in window URLs or diagnostic exports.

**Acceptance tests:** (1) Shelf fails + provider OAuth expires -> right-click displays actionable reconnect, independent authentication completes and saving resumes; (2) Shelf and popup both fail -> a user-triggered authorized recovery path remains available to the extent browser APIs allow; (3) cancel/deny auth -> no silent upload or loss of pending status; (4) one provider expires -> all other valid destinations remain functional; (5) sign-in recovery and duplicate context-menu clicks do not duplicate uploads.

**Non-negotiable limit:** If the extension runtime or browser authorization APIs themselves are unavailable, a new login window cannot be guaranteed. The goal is an unusually robust recovery lifeline, not an impossible promise that every infrastructure failure is survivable.

## 9. CRITICAL / P0 — GO TO must never substitute for LOGIN / RECONNECT

**Owner-confirmed REDOWN live regression (2026-11-12):** Google Drive's Shelf displayed **GO TO** from its stale saved `connected` state while native saves failed with `OAuth2 not granted or revoked`. The existing user-triggered Google OAuth authorization command launched a consent form, after which saves worked again. This proves a visible recovery action was missing; it does **not** prove why the OAuth grant became unavailable.

**Click2Cloud release-blocking direction:** **GO TO (website navigation)** and **LOGIN / RECONNECT (extension authorization recovery)** must remain two independent controls for every provider. Never infer valid OAuth, write scopes, destination writability or upload readiness from a working provider website or past `connected` flag. Verify access noninteractively where possible, then distinguish revoked scopes from temporary network/provider failures (e.g. Microsoft Graph HTTP 503); preserve jobs, configured destinations and History. Keep recovery available in the Shelf, popup and authorized headless fallback. No false success or duplicate replay.

**Full binding requirement, owner evidence and acceptance tests:** [CRITICAL OAuth readiness: separate GO TO and RECONNECT](CRITICAL_OAUTH_READINESS_SEPARATE_GO_TO_RECONNECT_2026-11-12.md). This is a **P0 product-direction requirement**, not a claim of implemented code.
