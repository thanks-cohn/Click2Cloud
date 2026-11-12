# Debug architecture — minimal by default, expansive only when requested

**Product:** Click2Cloud  
**Recorded:** 2026-11-12 (America/Chicago)  
**Status:** Owner-directed product and UX architecture; **proposed, not implemented or live-verified**  
**Priority:** Foundational architecture, observability and interface simplicity  
**Companion:** [Console-First Observability, supported by a Diagnostic Introspection API](../Project_direction/CONSOLE_FIRST_MINIMAL_DEBUGGABLE_ARCHITECTURE_2026-11-12.md)

## 1. Core philosophy

> **Normal Click2Cloud should look like a simple utility. Turning on Debug Mode should reveal the machinery, without building a second application or changing how saves work.**

Click2Cloud should minimize the ordinary visible interface and avoid large decorative CSS systems, unnecessary widgets, duplicated logic or permanently visible diagnostics. **Utility and function come first.** Good visual design should make the right action unmistakable with few components, consistent spacing, understandable text, accessible controls and small, thoughtful styling.

**Debug Mode is a presentation and inspection switch, not a different save engine.** Its purpose is to reveal the rich evidence that already supports the same canonical operations. It may enable optional, explicitly disclosed deeper diagnostic capture where necessary, but should never silently switch upload behavior or replace one authoritative store with another.

This complements **Console-First Observability, supported by a Diagnostic Introspection API**: a few safe F12 commands are the quickest engineering investigation path; Debug Mode provides an optional **visual** way to explore the same facts. Both are views over one trusted API and persisted operation model.

## 2. A Debug entry at the bottom of Settings

- Add a clear **Debug** entry at the **very bottom of Click2Cloud Settings**, visually quieter than everyday settings. Keep it discoverable, keyboard-accessible and labeled; do not make it a hidden developer-only shortcut.
- Opening it presents a concise **Debug Mode ON / OFF** control, initially **OFF by default**. Explain that enabling it adds diagnostic information throughout the interface, particularly the Queue.
- **OFF:** ordinary pages and task rows stay visually minimal. The right-click save engine, canonical queue, History, authorization checks and standard error-handling still run as normal. Never cripple basic failure evidence merely to simplify the UI.
- **ON:** contextual diagnostic features become visible on relevant pages—extra row details, filters, operation IDs, failure reasons, phase timelines, safe copy/export actions and deeper inspect affordances—without replacing or rearranging the primary user actions.
- Make the state obvious inside Settings and optionally show a small neutral `DEBUG` indicator in an appropriate non-distracting location. Switching OFF immediately hides detailed overlays; **it does not erase recorded evidence, reset jobs, or stop active operations**.
- Persist the preference sensibly across normal Shelf reopen/reload; define profile-specific persistence and include an easy turn-off path. Do not make Debug Mode a prerequisite for collecting the basic operation ID, outcome, reason code and key timestamps used to investigate ordinary failures.
- For unusually sensitive or high-volume RAW capture, use a **separate explicit advanced consent**, a privacy warning and bounded retention/quota controls. Turning on ordinary visual Debug Mode must not automatically collect or expose full sensitive URLs, tokens, cookies, file contents or private credentials.

## 3. The Queue — a normal, dedicated page

The Queue is a first-class, simple **page** reachable from normal navigation. Users can open it without enabling Debug Mode; it is **not** a developer-only page, modal that disappears, or a fake duplicate of History.

Its job is to answer three ordinary questions: **what did I try to save, where was it going, and what happened?** It should also show real progress during pending/active work and not imply success before receipt verification.

### Queue with Debug Mode OFF: the ideal default

```text
QUEUE                                           [Clear all]

Time       File                       Saved to                  Outcome
14:28      holiday-photo.jpg          Drive / Pictures          ✓ Saved
14:27      assignment.pdf            R2 / redown / School      ◌ Saving 62%
14:25      scan.png                  OneDrive / Documents      ! Needs attention
14:22      archive.zip               Dropbox / Downloads       × Failed
```

**One compact row per operation, no diagnostic clutter:**
- **Time** of the attempted save (show locale-friendly time, accessible full timestamp if requested).
- **Filename** (safely escaped, truncated visually with full name available on hover/focus).
- **Destination** / location it was intended to be saved to, e.g. provider and exact configured folder label; do not invent a remote destination when not yet verified.
- **Outcome / progress** in one restrained status column or tiny inline indicator: queued, uploading with real available percentage, verifying, verified saved, needs login/attention, failed, cancelled or uncertain. A percentage requires a known total; otherwise show an honest indeterminate progress state.
- Keep each row visually restrained: no debug IDs, response bodies, raw request URLs, stacks, internal storage schemas or HTTP headers.
- The requested normal row remains effectively **time + file + destination**, plus the smallest truthful progress/result indicator necessary to fulfill the Queue's purpose.
- Actions stay minimal: **Clear all** at page level; no crowded collection of per-row debug buttons in normal mode.

**Important distinction:** `attempted save` / `queued` / `sent` / `uploading` is never equivalent to `verified saved`. If a file may have arrived but no receipt was confirmed, show **Uncertain** and do not blindly retry. The Queue is a view of durable operation records, not a list of only successful files.

### Queue with Debug Mode ON: reveal the underlying evidence

The same queue rows stay in the same order and location; each may now expand or show additional diagnostic sections:

```text
14:25   scan.png   OneDrive / Documents   ! Needs attention
  ├─ Operation ID:          op-...
  ├─ Provider / account:    OneDrive / account alias
  ├─ Stage:                 verify provider identity
  ├─ Code:                  ONEDRIVE_GRAPH_503
  ├─ HTTP:                  503 (temporary provider failure)
  ├─ Started / updated:     timestamps and duration
  ├─ Attempts / retries:    1 / bounded
  ├─ Bytes / total:         unknown / unknown
  ├─ Runtime:               worker epoch / request correlation
  ├─ Queue lifecycle:       accepted → auth checked → blocked
  ├─ Receipt:               not verified
  └─ Next safe action:      Try again when provider is available
```

Permitted **bounded, sanitized** extra fields, where actually observed:
- unique attempt/operation ID, parent intent ID, provider adapter and intended account alias;
- exact canonical mode and selected configured destination (Simple / Narrow / Depth, bucket/prefix), only to authorized users and redacted in exports as appropriate;
- real state-machine phase, timestamps, elapsed times, worker epoch, source-kind, file-type, known bytes/total, retry count and backoff;
- original sanitized error code and component, provider HTTP category/status, connectivity/permission state, queue persistence/checkpoint, remote verification/receipt state;
- native right-click menu item ID/generation/ACK and known provenance where relevant;
- coverage/gaps: `observed` versus `inferred` versus `unknown`, incomplete capture or stale health;
- actions like **Copy safe diagnostic summary**, **Inspect this operation**, **Explain failure**, **Export sanitized report**, and **Open F12 command guide**.

Do not dump an unbounded event stream into every expanded row. Offer a compact first expanded view, then on-demand paging/detail inspection. Reuse the existing trusted API and evidence store instead of maintaining a second queue, duplicate job state or UI-only error reasoning.

## 4. Clear all: clear the Queue display, not the user's cloud files or evidence

The owner requests a **Clear all** button in the Queue. Define it safely and understandably:

- **Clear all** removes or archives **terminal queue entries from the ordinary Queue view** (completed, failed, cancelled, and safely resolved cases) after the user confirms the action and sees the scope.
- **Active, queued, awaiting authorization and uncertain operations are never cancelled or silently abandoned by Clear all.** If some rows cannot be cleared, explain how many remain and why.
- Do **not** delete files from any provider, erase original History/verified receipts, erase the append-only forensic flight recorder, remove cloud destinations, reset counters or drop potentially recoverable intents.
- If users want to purge historical data or securely delete diagnostic archives, that must be a **separate explicit data-management control** with clear scope and confirmation. Clearing visible Queue rows is not a hidden data-destruction mechanism.
- In Debug Mode, show the distinction explicitly: `3 terminal rows hidden from Queue; 2 unresolved jobs retained; 0 cloud files changed` (illustrative copy; compute real numbers).
- Preserve authoritative operation IDs so hiding a row from the Queue cannot falsify actual History, cloud receipt verification or support for ongoing jobs.

These are intentional architectural semantics for Clear all; they should be validated with the owner if a future product design seeks more destructive deletion behavior.

## 5. One canonical operation model behind ordinary and debug views

The UI should not choose what counts as saved. The underlying validated engine must supply state:

```text
User right-click / save intent
      ↓
Canonical dispatch + durable operation ID
      ↓
Queued / source retrieval / permissions / provider write / verification
      ↓
Verified completed | blocked | failed | cancelled | uncertain
      ↓
The same data flows to:
    minimal Queue page
    Debug-expanded Queue rows (when enabled)
    History / provider receipts
    F12 Diagnostic Introspection API
    sanitized support export
```

- For every operation, persist a stable ID, intended provider/account/destination and truthfully observable lifecycle state; accept only actually observed stages and outcomes.
- A Shelf crash or worker restart must not make queue results disappear or stop correctly isolated right-click saves. Queue reopening reconstructs from durable state.
- All layers consume the current authoritative trusted `3+1.1` API; adapt existing `getEngineHealth`, `inspectRemoteReceipt`, `inspectNativeACK`, `getConfiguration` and related methods where applicable, and verify their latest signatures before changing code.
- Basic diagnostic capture is **independent of Debug Mode**; richer optional capture (especially RAW URLs) needs explicit consent.
- When Debug Mode is OFF, a simple error can still show a plain-language actionable next step; hiding raw details must not turn ordinary status messages into meaningless `PROVIDER_FAILED`.
- Avoid heavy CSS/animation, constant polling, expensive full-cloud scans, blocking writes and unbounded DOM row rendering. Use responsive, accessible minimal styles and paginate/virtualize longer queues where necessary.

## 6. What appears elsewhere when Debug Mode is ON

Debug is a global *presentation preference*, with contextual reveals—not a giant parallel settings application:

| Surface | Normal mode | Debug Mode ON |
| --- | --- | --- |
| Queue | Time, filename, target, status/progress | Expandable full operation detail, timeline, failure explanation, diagnostics |
| REMOTES / providers | GO TO, LOGIN when appropriate, independent refresh icon, simple readiness | Provider codes, non-secret scope/readiness facts, last refresh check and failure evidence |
| Right-click menus | Actual user destination choices, minimal actionable status | Inspector of generated menu generation, resolved target, omitted entries and native ACK; avoid dumping developer rows into native Chrome menu |
| Manage Destinations | Configured locations and clear Save action | Validated config revision, menu reconcile status and typed errors |
| History | Understandable verified outcome and saved location | Verified receipt metadata and source-to-provider timeline when safe |
| Settings | A single Debug entry at bottom | Toggle plus simple help and sanctioned safe export controls |

The same simple interface remains in place. We reveal relevant diagnostic affordances rather than imposing an entirely different layout, theme or behavior.

## 7. Security, privacy and resilience

- F12 debugging is available in trusted extension contexts, not arbitrary websites. Do not expose privileged debug operations via an untrusted web-page global or insecure message bridge.
- Diagnostic introspection is **read-only by default**. `Clear all` and explicit setting changes are separate, permissioned UI actions; no debug command automatically logs in, uploads or mutates cloud data.
- No passwords, OAuth access/refresh tokens, auth codes, cookies, signed source URLs, authorization headers, private file bodies or secrets in UI details or ordinary exports. RAW forensic export is independently authorized and never auto-uploaded.
- Status must identify incomplete evidence honestly. If the browser exits before a checkpoint is written, Debug Mode cannot fabricate missing events.
- If the Shelf fails, Debug Mode cannot be the only way to diagnose or recover: maintain the existing minimal popup, robust right-click path and independent F12/safe diagnostics where browser APIs allow.

## 8. Acceptance tests

1. Settings includes a bottom-positioned **Debug** entry; OFF is the initial default. Toggling ON immediately reveals contextual diagnostic affordances and OFF hides them without affecting active saves, connection state or recorded evidence.
2. Queue page always exists without Debug Mode; rows show **time, filename, saved-to location, truthful status/progress** and the single page-level **Clear all** action.
3. While uploading, only actual measured bytes/known total produce numeric progress; a successful verified receipt—not dispatch ACK—produces Saved. An ambiguous outcome appears as Uncertain.
4. Enabling Debug Mode expands each row with accurate provider, exact known phase, sanitized reason code, attempt and runtime IDs, retries, timestamps, receipt state and safe next step; unobserved data is explicitly Unknown.
5. `Clear all` removes visible resolved rows after confirmation, retains active/queued/uncertain operations and all History/forensic records, does not change any cloud objects and does not falsify counters.
6. Restart Chrome and suspend/restart the MV3 service worker; queue and preference restore from durable state without duplicate uploads or lost pending intents.
7. A real `DESTINATION_EXISTS` configuration error is explained as such, not confused with a failed cloud upload. Temporary provider HTTP 503 remains separate from revoked OAuth.
8. Default UI remains compact at narrow widths, in light/dark themes, keyboard/screen-reader accessible, and not slowed by heavyweight debug code when OFF.
9. Default F12 introspection and Debug Mode show the same canonical operation IDs and status. No sensitive secret leakage or untrusted website access.
10. Unit, installed Windows Chrome and real-provider results are reported separately. A prose specification or mock Queue is not proof of implementation.

## 9. References and implementation ownership

- [Console-First Observability / Diagnostic Introspection API](../Project_direction/CONSOLE_FIRST_MINIMAL_DEBUGGABLE_ARCHITECTURE_2026-11-12.md)
- [Right-click, flight recorder, headless recovery](../Project_direction/FLIGHT_RECORDER_INDEPENDENT_RIGHT_CLICK_GRACEFUL_RECOVERY_2026-11-12.md)
- [GO TO / LOGIN / REFRESH](go-to-login-refresh.md)
- [Depth menus](depth.md)
- [+ Right Click configuration error: DESTINATION_EXISTS](../Issues_and_Bugs/Bugs/P0_RIGHT_CLICK_SAVE_ACTION_GENERIC_OPERATION_FAILED_2026-11-12.md)
- [Manage Destinations explicit Save](../Issues_and_Bugs/Issues/P1_MANAGE_DESTINATIONS_EXPLICIT_SAVE_BUTTON_2026-11-12.md)

**This paper specifies the destination architecture. It does not change Click2Cloud runtime code, create a Queue page, add a Settings toggle or claim actual browser verification.**
