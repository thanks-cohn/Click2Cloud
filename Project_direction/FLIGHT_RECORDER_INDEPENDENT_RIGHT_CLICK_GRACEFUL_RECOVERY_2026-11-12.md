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
