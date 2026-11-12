# Console-First Observability, supported by a Diagnostic Introspection API.

**Product:** Click2Cloud  
**Recorded:** 2026-11-12 (America/Chicago)  
**Status:** Owner-requested foundational project direction; NOT implemented or verified by this document  
**Priority:** Foundational architecture and debugging UX; required for practical P0 fault investigation

## The governing idea

> **Console-First Observability, supported by a Diagnostic Introspection API.**

Click2Cloud should be deliberately small, functional, easy to understand, and easy to diagnose. Its engineering superpower should be that **a few simple, safe commands in Chrome F12 DevTools quickly answer what went wrong, where, why the evidence supports that answer, and what to do next**. Debugging shouldn't require reading hundreds of disconnected logs, reverse engineering Chrome storage keys, or maintaining a huge graphical diagnostics dashboard.

Terminology:
- **Console-First Observability:** the F12 console is the preferred engineering inspection surface, with a handful of high-value, human-readable commands.
- **Diagnostic Introspection API:** a stable, authorized, typed interface for querying the app's real internal state, latest operations, errors, configuration, health, permissions and confirmed outcomes.
- **White-box diagnostics / self-diagnosing software:** related engineering ideas; a system exposes its own interpretable facts and honest limitations rather than generic "Something went wrong."
- **Minimal functional interface:** simple presentation and reusable CSS, not a forest of visual widgets. Retain usability, accessibility and essential human-readable recovery actions for ordinary users.

**Important:** Console-first means *first-class for developer troubleshooting*, not "force normal users to open DevTools to understand basic errors." Ordinary UI must still explain failures and show a safe action. GUI, F12 and automated tests all read from **one canonical diagnostic truth**, not three conflicting versions of application status.

## 1. Desired F12 experience

The following represents a **proposed interface** — these are examples, NOT existing Click2Cloud commands or API method names:

```javascript
await C2C.debug.help()                      // available safe commands and examples
await C2C.debug.health()                    // worker, storage, menu, queue, providers
await C2C.debug.lastFailure()               // last actionable failure and supporting evidence
await C2C.debug.explain("DESTINATION_EXISTS")// why this error happened; safe next action
await C2C.debug.operation("operation-id")   // the full known save/config timeline
await C2C.debug.menu()                      // Simple / Narrow / Depth, native ACK, omissions
await C2C.debug.auth()                      // per-provider OAuth and upload readiness, no tokens
await C2C.debug.storage()                   // CURRENT integrity, revision, unknown vs empty
await C2C.debug.exportSafe()                // explicit sanitized diagnostic export
```

**Required ergonomics:**
- `help()` explains commands and whether to use Shelf/Options F12 or the extension service-worker DevTools. The commands must be accessible only in trusted extension contexts, **not ordinary web pages**.
- `health()`, `lastFailure()`, and `explain()` normally respond quickly from bounded persisted evidence, without a slow cloud crawl, unsolicited login prompt, heavy system scan, or write operation.
- Output is concise, structured and easy to read, e.g., a small object/table showing `status`, `component`, `stage`, `reasonCode`, `evidence`, `unknowns`, `nextSafeAction`, `lastUpdated`.
- Display **observed**, **inferred**, and **unknown** separately. A missing log or stale worker is not proof that an operation was successful.
- One command should identify the last relevant incident across a service-worker restart using durable operation IDs. Keep exact capture gaps and data freshness visible.

## 2. Real incident illustrating the benefit

On November 12 the owner pressed **Save** inside Click2Cloud's **+ Right Click** menu-configuration dialog. The UI displayed:

`The operation could not be completed. Inspect the relevant panel for details.`

Only after a separate DevTools DOM inspection did the real code emerge:

```text
code: DESTINATION_EXISTS
diagnostic: DESTINATION_EXISTS
```

Current source inspection confirms `src/api/config.mjs` rejects a `createDestination` operation in **Simple** mode when that exact canonical target is already configured. `extension/app.mjs` routes a fresh + Right Click configuration Save through `createDestination`, and its UI maps unfamiliar uppercase codes to a useless generic message. This error **does not by itself prove a cloud-file upload was attempted or failed**.

The proposed one-command explanation should look approximately like:

```text
Action: + Right Click > Save configuration
Result: blocked
Code: DESTINATION_EXISTS
Component: configuration / Simple mode
Evidence: existing Simple target matched requested canonical target
Meaning: that location is already assigned to the right-click menu
Next: Manage Destinations > Simple > Edit existing
Remote upload: not established by this configuration action
Data changed: no confirmed change by the rejected operation
```

Do not hardcode a cause without checking the current operation's actual evidence. The example demonstrates **the kind of diagnosis**, not proof that the exact user's full persisted state was inspected.

## 3. One canonical engine and one source of diagnostic truth

Use the existing trusted versioned Click2Cloud `3+1.1` API, authorization boundaries, canonical engine, durable CURRENT configuration and actual operation/receipt evidence. Relevant existing read-only capabilities to inspect and reuse before designing additions include `getEngineHealth`, `inspectNativeACK`, `previewNativeMenu`, `inspectMenuTree`, `getConfiguration`, `getProviderConnections`, `loginStatus`, and `describeCapabilities` (verify current method definitions in `src/api/service.mjs`).

**Do not create an independent competing debug engine or duplicate state store.** Design a minimal, documented console adapter over existing safe read APIs with a small stable schema. Share the same reason-code catalog, health semantics and operation IDs with UI diagnostics, History, native right-click actions and automation tests.

Capture at meaningful checkpoints:

```text
User action
  -> received intent and operation ID
  -> canonical config/menu/target resolution
  -> account authorization and scope verification
  -> Chrome native menu registration/click acknowledgement
  -> source retrieval / API request
  -> cloud write
  -> remote receipt / verification
  -> persisted History / counter / final outcome
```

Only include stages actually applicable to a particular operation: a **menu-configuration Save** need not have source retrieval or cloud-write steps. No phase or completion may be fabricated.

## 4. Reason codes should be immediately explainable

Maintain structured explanations for high-value failures: duplicate destination (`DESTINATION_EXISTS`), missing permission/expired grant, transient provider HTTP 503, exact selected Depth submenu missing, storage unavailable, stale/failed Chrome native ACK, source rejection, upload uncertain, worker restart and incomplete incident recording. For each code, give:
- Plain-language meaning and **which action** it belongs to.
- Original typed reason and exact phase, without hiding it behind `PROVIDER_FAILED` or "Inspect relevant panel."
- Confidence and linked evidence/correlation ID.
- A safe user action (e.g., **Edit existing** rather than recreating an identical Simple target).
- Whether a retry could duplicate a possibly completed remote save.
- Whether any configuration mutation or verified remote write was observed.

This code catalog is a contract shared by F12, GUI and support exports, not a giant ad-hoc string mapping in the UI.

## 5. Minimal UI and minimal CSS as a performance principle

- Prioritize reliable right-click saving, fast menus, destination clarity, exact remote target binding and truthful receipts over heavy decoration.
- Prefer a few carefully styled components, restrained colors, readable spacing, consistent themes, real keyboard focus and concise status text. Avoid duplicative DOM structures, animation-heavy embellishments, CSS proliferation and unnecessary third-party frameworks.
- Preserve necessary accessibility, user-consent flows and helpful confirmation/error messages. A bare status code with no repair action is not "minimalism"—it is missing functionality.
- Keep configuration UI small while supporting explicit **Manage Destinations Save**, robust Simple/Narrow/Depth modes, and independent provider **GO TO / LOGIN / REFRESH** controls with the red outline for verified consent-required OAuth and amber for provider outages.
- Fault isolation: a broken Shelf or developer UI must not bring down the right-click dispatcher or erase saved destinations. Existing fallback popup and recovery architecture remain authoritative.

## 6. Trust, security and privacy boundary

- **Read-only by default.** `health()`, `auth()`, `explain()` and `menu()` must never upload, reconnect interactively, delete, reset, provision, or alter configuration. Explicitly labeled mutation tools (if ever provided) still require all existing permissions, user confirmation, identity binding and audit trails.
- The interface may appear in DevTools of the **authorized extension page** and/or a vetted extension-worker context; ordinary webpages must not be able to call its privileged actions. Never expose a generic globally accessible external API or cross-origin message bridge.
- Default outputs are **safe/sanitized**. No OAuth/refresh tokens, authorization headers, passwords, cookies, signed URLs, private file contents or raw cloud credentials. Exporting RAW records is separate, private and explicitly opt-in; diagnostics must never be silently transmitted.
- Bound record counts, response sizes, read time and concurrency. Never stall browser event delivery or the canonical save path just so diagnostics can finish. Mark stale data and capture gaps honestly.
- Preserve all user data, CURRENT state, saved destinations, original History/receipts, failed-job evidence and recorder records across inspection, Chrome restart and extension update. Avoid "clear data and retry" as standard troubleshooting.

## 7. Acceptance criteria

1. Reproduce owner-observed `DESTINATION_EXISTS`: **one F12 command** explains duplicate Simple configuration, source module/stage, preserved state and Edit existing action. Ordinary UI also displays an actionable message.
2. A missing/revoked Google authorization explains **Reconnect required** without confusing GO TO website navigation with OAuth upload readiness; the independent refresh icon is shown appropriately. A temporary OneDrive Graph 503 is classified as a provider/network outage, not revoked login.
3. A selected Depth bucket with one real child produces inspectable `Save here` + nested tree; two selected buckets produce separate nested/leaf entries. The console identifies selected depth, menu generation, omissions and Chrome ACK.
4. A real right-click save can be followed by ID through actual receiving click, route, source, provider write, receipt, History and counters. If confirmation is missing, show `uncertain`, not verified.
5. Worker sleep/restart, Shelf failures, storage corruption, auth revocation and offline provider each produce an honest last-known checkpoint and diagnostic coverage, not a fake comprehensive incident.
6. Benchmarks demonstrate that a few typical queries are fast, bounded and do not increase right-click-to-first-feedback latency or Shelf mount time materially.
7. Keyboard accessibility, readable error states and concise functionality remain in normal UI. A user without DevTools expertise can still recover from common problems.
8. A test webpage cannot invoke the privileged introspection API; default exports are sanitized and no credentials leak. No diagnostic command triggers an unexpected cloud mutation.
9. Source-level, unit, isolated-browser and **installed Windows Chrome/live-provider** evidence are reported separately. Tests or documentation alone do not certify feature implementation.

## Relationships

- [Independent right-click saves, diagnostics and Headless Zombie Mode](FLIGHT_RECORDER_INDEPENDENT_RIGHT_CLICK_GRACEFUL_RECOVERY_2026-11-12.md)
- [CRITICAL OAuth readiness and navigation separation](CRITICAL_OAUTH_READINESS_SEPARATE_GO_TO_RECONNECT_2026-11-12.md)
- [GO TO / LOGIN / REFRESH architecture](../architecture/go-to-login-refresh.md)
- [Cloudflare Depth architecture](../architecture/depth.md)
- [Owner-observed DESTINATION_EXISTS issue](../Issues_and_Bugs/Bugs/P0_RIGHT_CLICK_SAVE_ACTION_GENERIC_OPERATION_FAILED_2026-11-12.md)
- [Manage Destinations explicit Save request](../Issues_and_Bugs/Issues/P1_MANAGE_DESTINATIONS_EXPLICIT_SAVE_BUTTON_2026-11-12.md)

**No runtime changes are authorized or claimed by creating this architectural paper.**
