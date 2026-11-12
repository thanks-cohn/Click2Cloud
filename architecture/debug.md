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

## 3. Shelf placement and navigation — Queue bottom-left, Manage Destinations bottom-right

**Owner-approved Shelf location:** Add **one Queue button at the far bottom-left of the persistent Shelf footer**, on **the very same row** as the existing **single Manage Destinations button at the far bottom-right**. Keep a generous flexible gap between them and balanced, comfortable footer-edge and button padding. Do not move Manage Destinations or duplicate it elsewhere.

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│ ↗ Click2Cloud   Remotes   File Explorer   Settings   Help · Diagnose   ☀ / ◐ │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│                 Main content: Remotes / Explorer / Settings / Queue            │
│                                                                               │
├───────────────────────────────────────────────────────────────────────────────┤
│   [ Queue ]                                       [ Manage Destinations ]     │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Queue is an internal Shelf page, not a modal or a separate window.** Clicking the footer Queue button changes the central content, **not** the global header. The existing header options remain visible and fully usable, exactly as the owner specified: **↗ Click2Cloud; Remotes; File Explorer; Settings; Help · Diagnose; ☀ / ◐**. From the Queue page, users can click Remotes or File Explorer directly to navigate back, or use Settings, Help · Diagnose, and the theme control normally. Do not replace these controls with a Queue-only toolbar, disable them or force the user to close/reopen the Shelf.

Keep the shared footer visible on Queue as well. A subtle selected state on Queue is allowed without inventing another top navigation tab. Return to File Explorer should restore the meaningful folder/selection/scroll state where feasible; unrelated Queue progress continues independently of the view. The Explorer-specific side tree may be omitted while Queue content is open if needed, but the global header/footer remain.

**Current source/layout anchor (reference only; no code edits in this paper):** `extension/app.html` already contains the persistent global header and a footer with `#manage`; `extension/app.css` already gives that footer flex alignment and padding. The future implementation should reuse this shell and small shared styling, not create a second UI or queue engine.

**Acceptance:** one row with Queue far-left and Manage Destinations far-right, ample padding and no overlap at responsive widths; Queue view shows the unchanged navigable top options; clicking any top navigation option actually exits Queue; returning does not lose authoritative Queue entries or duplicate saves.

---

## 4. The Queue — a normal, dedicated page

The Queue is a first-class, simple **page** reachable from normal navigation. Users can open it without enabling Debug Mode; it is **not** a developer-only page, modal that disappears, or a fake duplicate of History.

Its job is to answer three ordinary questions: **what did I try to save, where was it going, and what happened?** It should also show real progress during pending/active work and not imply success before receipt verification.

### Queue with Debug Mode OFF: the ideal default

```text
QUEUE                 [Pause all / Resume all] [Clear successful] [Clear all]

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
- Actions stay minimal: a single **Pause all / Resume all** control and two cleanup buttons, **Clear successful** and **Clear all**; no crowded collection of per-row debug buttons in normal mode.

**Important distinction:** `attempted save` / `queued` / `sent` / `uploading` is never equivalent to `verified saved`. If a file may have arrived but no receipt was confirmed, show **Uncertain** and do not blindly retry. The Queue is a view of durable operation records, not a list of only successful files.

### Expandable Queue cards and smart initial expansion

**Every Queue item is a collapsible/expandable card.** Its compact header (time, filename, intended saved-to location, and truthful state/progress) is always visible. The disclosure arrow or card header expands/collapses the richer detail **in place**, not in a new browser page or modal. The owner wants these clear threshold rules:

- **Debug Mode OFF:** use clean compact one-line rows; no expanded developer diagnostics are forced into the ordinary view.
- **Debug Mode ON, 1–19 items:** **all cards initially expanded**. At 19, all 19 can be expanded without extra clicks.
- **Debug Mode ON, 20 or more items:** **only the first five cards initially expanded**, in current visible order (normally newest attempts first); all others are collapsed by default. If there are 100 items, expand 1–5 and collapse 6–100.
- **Manual user changes always win:** anyone may collapse the first five, expand item 50, or collapse everything. Progress updates, re-renders and scrolling must not unexpectedly reset those choices. On first entry or first enabling Debug Mode, apply defaults; afterward preserve manually selected expansion keyed by stable operation ID.
- Render large lists using pagination/virtualization and **lazy-load expanded evidence only**. Expanding the first five must not secretly load all 100 diagnostics or generate heavy network/API traffic. Automatic rules should not expand 100 unbounded raw event timelines or cause a significant Shelf performance regression.
- Use an actual disclosure button, `aria-expanded`, keyboard Enter/Space, visible focus, clear heading, and responsive readable card layout. Expanded content should appear beneath its own matching header; do not change the order of existing jobs.
- Expanded state is only a presentation preference; it never pauses, retries, authorizes or deletes a save. Clearing a Queue entry discards its presentation state; paused jobs keep their cards.

### Required Debug card anatomy — lessons from REDOWN incidents

Make each expanded card a compact, self-explaining diagnostic report. Put **the answer first**, then evidence progressively:

**A. What happened and what next?**
- Honest state: queued, paused, source-fetching, uploading, verifying, verified completed, blocked, failed, cancelled or uncertain.
- Concise human explanation, **exact original typed error/code and stage**, provider origin, how confident the classification is, and one actionable **Next safe action**.
- Do not disguise `OAuth2 not granted or revoked`, `ONEDRIVE_GRAPH_503`, a source that returned HTML instead of a file, or an unknown source length as the same generic `PROVIDER_FAILED`.

**B. URL provenance — required fields, with `N/A` when not observed**

Every expanded card should have a small **URLs / Source provenance** section. These URLs are essential when diagnosing a source-file failure, redirect, hotlink blocking, cloud verification and native context-menu routing:

| Field | Meaning | If not captured or unavailable |
| --- | --- | --- |
| **Host page URL** / **Webpage URL** | Original webpage where the user invoked the right-click or discovered the content (`pageUrl`) | **N/A** |
| **Source URL** / **Asset URL** | Exact candidate image/file/link requested for saving, where legitimately available (`sourceUrl`) | **N/A** |
| **Original image URL** | Original context-menu `srcUrl` if distinct from selected source | **N/A** |
| **Original link URL** | Original anchor/link target `linkUrl` where applicable | **N/A** |
| **Initial request URL** | Observed source-fetch URL, if distinct from source candidate | **N/A** |
| **Final resolved URL** | Actual post-redirect request URL if the fetch/redirect was observed | **N/A** |
| **Redirect chain** | Observed intermediary URL(s), paged/limited if long, no invented redirects | **N/A** |
| **Provider result URL** | Verified provider-returned open/view link where actually provided and safe to show | **N/A** |
| **Other related URL** | A relevant observed referer, canonical page, alternative source, or provider API endpoint for a specific failing stage, only if useful and safe | **N/A** |

**Never guess or synthesize URLs solely from filenames, bucket labels or provider assumptions.** Distinguish the host page from the source asset: they may be different domains and both may be needed to reproduce an issue. If several related URLs are observed, label their individual roles instead of dumping an unlabeled array. A redacted/unsafe URL is not the same as missing evidence: show **Redacted** or the safely masked URL when its existence is known; reserve **N/A** for genuinely unavailable/not captured/not applicable. For a redirect chain with no observed redirects, show `N/A` or `No redirect observed` only if verified by actual capture.

**Privacy requirement:** URL strings can contain signed access credentials, tokens, session IDs or personally sensitive paths/query parameters. Debug Mode must **never expose those secrets merely because the toggle was enabled**. Where safe, display the full URL with copy/open controls in trusted Click2Cloud UI; otherwise show a safe masked/redacted form, and require a **separate, explicitly authorized private RAW inspection/export flow** for any genuinely sensitive literal URL. Do not expose credentials to untrusted webpage JavaScript, public logs or default support bundles. Preserve original URL evidence according to explicit consent, retention and privacy policy; diagnostics must not initiate extra network fetches merely to populate absent URL fields.

**C. Transfer progress and remote outcome**
- Attempted time, start/update times, actual progress (bytes/known total, percent only when known), source response type, attempts/backoff, provider upload/write stage and remote receipt/verification state.
- Distinguish **dispatch ACK**, **queued**, **bytes sent**, **provider accepted**, and **verified saved**. If receipt isn't confirmed, say **Not verified** or **Uncertain**—never fabricate a success.

**D. Authorization and exact destination**
- Provider and nonsecret account alias, selected destination identity (bucket/folder/prefix), configured Simple/Narrow/Depth menu presentation where relevant, access/scope and destination-readiness classifications, relevant HTTP status and bounded recovery recommendation.
- **Google OAuth unavailable:** show **Reconnect required**, not a successful GO TO website session.
- **OneDrive Graph HTTP 503:** show temporary provider unavailability, not a blanket LOGIN/consent revoked diagnosis.
- **Source length unknown on a provider requiring exact bytes:** show that provider-specific source/protocol constraint, not an invented upload failure.

**E. Short, verified event timeline**
- Only stages actually observed: native click received, intent queued, menu route resolved, source requested, source response validated, provider authorization, provider write, verification, final History update or failure.
- Include stage timestamps, operation/attempt ID, retry count, worker epoch, native menu ID/generation/ACK when applicable, and observed/inferred/unknown evidence gaps.
- Distinguish unrelated **configuration** errors such as `DESTINATION_EXISTS` from actual native cloud save operations; they are not equivalent failures.

**F. Advanced technical details (nested disclosure / lazy load)**
- Sanitized exception name/message/stack where available, provider status/body classification (never private response bodies), file type/size, remote receipt ID and storage/flight-recorder linkage where available.
- Offer **Copy safe diagnostics**, **Explain failure**, **View full timeline** and **F12 command guide** with trusted, read-only behavior. No tokens, cookies, private file bodies, signed URL secrets, or credentials in these ordinary actions.

**Illustrative expanded card (not real data):**

```text
▼ 14:25   scan.png   OneDrive / Documents        NEEDS ATTENTION

  WHAT HAPPENED
  Stage              Verify provider / drive
  Code               ONEDRIVE_GRAPH_503
  HTTP               503 · Service unavailable
  Next step          Retry when provider recovers; login may be fine

  URLS / SOURCE PROVENANCE
  Host page URL      https://example.org/article                  [example]
  Source URL         https://cdn.example.org/assets/scan.png      [example]
  Original image URL N/A
  Original link URL  N/A
  Final resolved URL N/A
  Redirect chain     N/A
  Provider result    N/A

  TRANSFER
  Attempts           1
  Bytes / total      Unknown / Unknown
  Remote receipt     Not verified
  Operation ID       op-...
  Timeline           queued → verifying identity → blocked

  [Copy safe diagnostics]  [Full timeline]  [Technical details ▸]
```

The example URLs use placeholder domains and are **illustrative**, not claims about the owner's actual browsing. Real cards must fill each field from captured, appropriately authorized evidence and display `N/A` otherwise.

---
### Queue with Debug Mode ON: reveal the underlying evidence

The same queue rows stay in the same order and location; each may expand to show the **A–F sections above**, including URL provenance. The compact example below is only a short summary; full details remain available on expansion:

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
  ├─ Host page URL:         N/A (if not captured)
  ├─ Source URL:            N/A (if not captured)
  ├─ Related URLs:          N/A (if not captured)
  ├─ Runtime:               worker epoch / request correlation
  ├─ Queue lifecycle:       accepted → auth checked → blocked
  ├─ Receipt:               not verified
  └─ Next safe action:      Try again when provider is available
```

Permitted **bounded, sanitized** extra fields, where actually observed:
- host page URL, source URL, original src/link URLs, observed redirect/final URL and other relevant URLs when captured and safe; display **N/A** for unavailable fields;
- unique attempt/operation ID, parent intent ID, provider adapter and intended account alias;
- exact canonical mode and selected configured destination (Simple / Narrow / Depth, bucket/prefix), only to authorized users and redacted in exports as appropriate;
- real state-machine phase, timestamps, elapsed times, worker epoch, source-kind, file-type, known bytes/total, retry count and backoff;
- original sanitized error code and component, provider HTTP category/status, connectivity/permission state, queue persistence/checkpoint, remote verification/receipt state;
- native right-click menu item ID/generation/ACK and known provenance where relevant;
- coverage/gaps: `observed` versus `inferred` versus `unknown`, incomplete capture or stale health;
- actions like **Copy safe diagnostic summary**, **Inspect this operation**, **Explain failure**, **Export sanitized report**, and **Open F12 command guide**.

Do not dump an unbounded event stream into every expanded row. Offer a compact first expanded view, then on-demand paging/detail inspection. Reuse the existing trusted API and evidence store instead of maintaining a second queue, duplicate job state or UI-only error reasoning.

## 5. Queue controls: Pause all / Resume all, Clear successful, Clear all

**Owner's definitive behavior (2026-11-12):** The ordinary Queue page has **three functions** available regardless of Debug Mode: **Pause all / Resume all** (one stateful control), **Clear successful**, and **Clear all**. They perform three different operations. In particular, **Clear all is a TOTAL operational Queue reset**, not an archival filter or cosmetic view clear.

### Pause all — stop progressing without deleting anything

- A visible **Pause all** button pauses processing across **all providers' Queue items**, not merely the currently displayed page. Persist a queue-level `paused` state so worker suspension, Chrome restart, opening another Shelf, or periodic alarms do not silently resume dispatch.
- **Preserve every entry**, all original source/target metadata and durable checkpoints, exact account/bucket/folder bindings, retries, intended operation IDs, status, receipt evidence and pending/uncertain work. Do not cancel/delete/reset jobs or mark paused items as failed. Preserve all existing cloud files.
- Pause stops dispatching additional queued tasks, automatic retries and provider write scheduling. For an already active transfer: use the provider adapter's **supported safe pause** or checkpoint at a resumable boundary; otherwise request a best-effort abort and reconcile any uncertain remote result before further action. Do not pretend pausing instantly undoes an already-sent request or that every provider supports byte-perfect mid-upload resume.
- Show **Pausing…** until active work has safely reached a checkpoint, then **Paused**. Keep the queue rows visible, with preserved actual progress and a restrained paused marker. Any in-flight completion that arrives before pause takes effect must be recorded honestly.
- New save intents received while paused may be admitted to the durable queue, clearly marked **Queued · Paused**, but must not be dispatched until the user resumes; if admission is unsafe or capacity-limited, explain that explicitly rather than dropping the click.
- Do not launch OAuth windows, delete sessions or modify user destinations as a side effect of pausing.

### Resume all — pick up where processing stopped

- When the Queue is paused, the same control becomes **Resume all**.
- Clicking Resume all clears the persisted `paused` flag and reactivates the **existing** durable queue using canonical scheduler and provider adapters. Continue from validated checkpoints where supported; otherwise revalidate authority, source, provider and exact destination before sending anything.
- Ensure stable operation IDs/idempotency and verify provider receipts before any retry of an **uncertain** or partially completed write. A paused in-flight request may have finished remotely; never blindly replay it or double-increment verified success.
- Resume does not recreate entries previously removed by a confirmed **Clear all**. If a provider remains unauthorized or unavailable, leave its entries visibly blocked/needs-attention; healthy providers may continue independently.
- Provide a truthful short summary such as **Processing resumed** or **3 queued · 1 needs attention** using real current counts.

### Clear successful — remove only past verified successes

- **Clear successful** removes **only terminal, provider-verified completed/successful entries** from the operational Queue list. It does not touch pending, active, paused, queued, verifying, failed, blocked, awaiting authorization, cancelled or uncertain entries.
- This narrow cleanup does not need the full-reset confirmation. After the action the other rows remain present exactly as before.
- A click acknowledged, 100% bytes sent, or an unverified provider status is **not** successful for this purpose. Preserve verified receipts and historical evidence separately from the operational Queue; do not delete remote files or change counters.
- If no verified successful entry exists, disable the action or show **No successful entries to clear**.

### Clear all — total Queue reset, including pending jobs

**This is explicitly destructive to pending work.** Clear all removes **every Queue item**, including pending jobs and retry schedules, and stops queue processing so they do not reappear or resume later.

**Naming decision:** Keep the short, conventional Queue action label **Clear all** alongside **Clear successful**. Internally, this is a **total operational Queue reset**, not merely clearing the visual list. The confirmation makes the destructive scope explicit. Do not rename the visible button to a vague **Reset** or **Delete history**, since neither tells users what Queue entries it affects.

**Approved proposed confirmation dialog — wording and buttons exactly as supplied by the owner:**

```text
Clear entire queue?

This will remove all queue entries, including pending saves, and attempt to stop active transfers.

This cannot be undone. Files already uploaded to cloud storage will not be deleted.

[No]    [Yes, clear all]
```

Use the title **Clear entire queue?**, a secondary **No** button, and a visually distinct destructive **Yes, clear all** action. This is the confirmation copy; keep longer implementation details about cancellation limits in the architecture and diagnostics rather than cluttering the dialog.

- **No:** dismiss the confirmation and make no changes.
- **Yes, clear all:** use one authoritative, serialized, auditable **reset queue** operation: atomically prevent new dispatch of old work, clear queued/pending/retry/paused operations, and request cancellation of active work across all providers. It resets the Queue to an **empty, unpaused, ready-for-new-work** state.
- Use a durable reset **generation/epoch and cancellation guards** so old service-worker callbacks, alarms, restarted Shelf instances and async completion handlers cannot reinsert deleted jobs, resume old retries or publish false verified receipts.
- **Active transfer limitation:** a request already accepted by a remote cloud might complete despite cancellation, and some transfer protocols cannot be cancelled cleanly. The UI must not claim all remote effects were undone. Finish the best-effort abort/reconciliation safely; retain a minimal diagnostic/audit marker for in-flight remote uncertainty outside the reset Queue, without silently requeueing the abandoned operation.
- **No cloud file deletion.** Resetting Queue items does not remove already uploaded objects, account connections, configuration, Default/Quick/Depth destinations, verified receipts/immutable History, or the forensic flight recorder. The **total reset applies to the operational Queue and unfinished work**, not an account or the entire application's persisted settings.
- If a cancellation or queue-store reset cannot complete safely, report **Reset incomplete** and exactly which actions remain active or uncertain. Never display **Queue cleared** while background old jobs can continue unnoticed. User must be able to inspect the incomplete state and retry the authorized reset safely.
- A new right-click save after a successful reset is **new work** and may be enqueued normally. Do not let old operation IDs or delayed messages be mistaken for new jobs.

### Boundaries between the three functions

| Control | Successful rows | Failed/blocked/uncertain rows | Pending/paused rows | Active transfers | Queue paused flag |
| --- | --- | --- | --- | --- | --- |
| **Pause all** | Retained | Retained | Retained, not dispatched | Safely pause / checkpoint / best-effort abort | Set to paused |
| **Resume all** | Retained | Retained; no blind uncertain retry | Resume valid pending work | Resume only after validation | Clear paused flag |
| **Clear successful** | Removed from Queue | Retained | Retained | Unaffected | Unchanged |
| **Clear all → Yes** | Removed | Removed from operational Queue | **Removed/cancelled** | **Cancellation requested; uncertainty handled honestly** | Reset to unpaused |

The Queue controls must use the same canonical operation state accessible from the Diagnostic Introspection API; **Debug Mode does not change their semantics**.

## 6. One canonical operation model behind ordinary and debug views

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

## 7. What appears elsewhere when Debug Mode is ON

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

## 8. Security, privacy and resilience

- F12 debugging is available in trusted extension contexts, not arbitrary websites. Do not expose privileged debug operations via an untrusted web-page global or insecure message bridge.
- Diagnostic introspection is **read-only by default**. `Clear all` and explicit setting changes are separate, permissioned UI actions; no debug command automatically logs in, uploads or mutates cloud data.
- No passwords, OAuth access/refresh tokens, auth codes, cookies, signed source URLs, authorization headers, private file bodies or secrets in UI details or ordinary exports. RAW forensic export is independently authorized and never auto-uploaded.
- Status must identify incomplete evidence honestly. If the browser exits before a checkpoint is written, Debug Mode cannot fabricate missing events.
- If the Shelf fails, Debug Mode cannot be the only way to diagnose or recover: maintain the existing minimal popup, robust right-click path and independent F12/safe diagnostics where browser APIs allow.

## 9. Acceptance tests

1. Settings includes a bottom-positioned **Debug** entry; OFF is the initial default. Toggling ON immediately reveals contextual diagnostic affordances and OFF hides them without affecting active saves, connection state or recorded evidence.
2. Queue page always exists without Debug Mode; rows show **time, filename, saved-to location, truthful status/progress** and **Pause all / Resume all**, **Clear successful**, **Clear all** controls.
3. While uploading, only actual measured bytes/known total produce numeric progress; a successful verified receipt—not dispatch ACK—produces Saved. An ambiguous outcome appears as Uncertain.
4. Enabling Debug Mode supplies independently expandable cards with accurate provider, phase, error, attempts, IDs, receipt and next safe action. **1–19 items initially all expanded; 20+ initially first five expanded only**, with manual choices preserved. **Host page URL, source URL and other related URLs** are labeled and shown when observed/safe, otherwise **N/A** (or **Redacted** for known sensitive values).
5. **Clear successful** removes only receipt-verified past successes; every other Queue item stays. **Pause all** persists across worker restarts and preserves all jobs while stopping further dispatch; **Resume all** safely continues without duplicate uploads. **Clear all** requires **Yes / No** confirmation, and **Yes** resets the complete operational Queue including pending, paused and scheduled retries, stopping active transfers where feasible; no old worker/alarms can recreate them. Existing remote files, saved settings and separate forensic/History evidence remain intact.
6. Restart Chrome and suspend/restart the MV3 service worker; retained jobs and paused state survive normally without unintended resume. Following **Clear all**, the reset generation persists and no discarded pending job can resurrect or retry.
7. A real `DESTINATION_EXISTS` configuration error is explained as such, not confused with a failed cloud upload. Temporary provider HTTP 503 remains separate from revoked OAuth.
8. Default UI remains compact at narrow widths, in light/dark themes, keyboard/screen-reader accessible, and not slowed by heavyweight debug code when OFF. The **Queue** control occupies the far-left of the existing persistent footer, **Manage Destinations** stays far-right with generous padding, and the **↗ Click2Cloud / Remotes / File Explorer / Settings / Help · Diagnose / ☀ / ◐** header remains usable for navigating back while Queue is open.
9. Default F12 introspection and Debug Mode show the same canonical operation IDs and status. No sensitive secret leakage or untrusted website access.
10. Unit, installed Windows Chrome and real-provider results are reported separately. A prose specification or mock Queue is not proof of implementation.

## 10. References and implementation ownership

- [Console-First Observability / Diagnostic Introspection API](../Project_direction/CONSOLE_FIRST_MINIMAL_DEBUGGABLE_ARCHITECTURE_2026-11-12.md)
- [Right-click, flight recorder, headless recovery](../Project_direction/FLIGHT_RECORDER_INDEPENDENT_RIGHT_CLICK_GRACEFUL_RECOVERY_2026-11-12.md)
- [GO TO / LOGIN / REFRESH](go-to-login-refresh.md)
- [Depth menus](depth.md)
- [+ Right Click configuration error: DESTINATION_EXISTS](../Issues_and_Bugs/Bugs/P0_RIGHT_CLICK_SAVE_ACTION_GENERIC_OPERATION_FAILED_2026-11-12.md)
- [Manage Destinations explicit Save](../Issues_and_Bugs/Issues/P1_MANAGE_DESTINATIONS_EXPLICIT_SAVE_BUTTON_2026-11-12.md)

**This paper specifies the destination architecture. It does not change Click2Cloud runtime code, create a Queue page, add a Settings toggle or claim actual browser verification.**
