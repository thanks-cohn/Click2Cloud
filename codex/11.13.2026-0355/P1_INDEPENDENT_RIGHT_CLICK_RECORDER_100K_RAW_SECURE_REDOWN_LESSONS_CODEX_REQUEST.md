# CODEX REQUEST — Click2Cloud independent right-click flight/forensic recorder (user-controlled 100,000+ events, RAW + SECURE ZIP, ReDown regression lessons)

**Recorded:** 2026-11-13, America/Chicago
**Repository:** thanks-cohn/Click2Cloud
**Priority:** P1 new diagnostic capability; **P0 regression gate** for right-click saving, native menu ownership, Chrome boot/Shelf availability, user configuration and credentials.
**Status:** IMPLEMENTATION REQUEST FOR A FUTURE CODEX RUN. **This file itself is documentation only. Do not infer that the recorder is implemented, tested, installed or launched.**
**Current verified owner baseline:** annotated tag milestone/a-sure-winner-base-0.1, source commit 0d50ab82c10555ae49d617b90be588057a1fa6b6, Chrome extension v0.3.19, stable ID ajppphdiamdobknpamcheohmdbdbeoal. The owner confirmed the working right-click menu and repaired Simple/Narrow/Depth Trash controls in installed Windows Chrome. Do not overwrite that milestone, source tag, Chrome profile, connected accounts or recovery records.
**Current request location:** This instruction belongs on the existing documentation-bearing branch codex/trash-silent-logic2real. Its publication does NOT authorize automatically editing application code or installing a build.

## 0. OWNER INTENT — DO NOT SUBSTITUTE A DIFFERENT FEATURE

Make a self-contained **Right-Click Recorder** for Click2Cloud, using the best reusable lessons from ReDown but avoiding its previous diagnostic failure modes:

1. The UI exists in **Settings → Debug**, and is revealed **only after the user turns Debug Mode ON**. Keep the current Debug switch OFF by default and keep normal mode quiet.
2. A prominent **Start Recording** button becomes **Stop Recording** once the user starts. No automatic high-volume forensic collection in ordinary use. The user owns the start/stop boundary. An existing, small critical safety breadcrumb system may continue if already present, but is **not** this recorder.
3. Before starting a new run, set the **maximum number of events to collect** (the owner's example: 100,000). The specific chosen value must be honored for that run; no hidden 4,000-event/4 MiB/seven-day pruning can silently override it. Validate and disclose browser quota and practical resource boundaries. Show separately **observed right-click attempts** and **recorded events**, because one click generates multiple events.
4. Capture every **delivered Click2Cloud native menu action** during that user-opted-in run, with timing and correlated stages: native click, action/target resolution, mode, current config generation, authorization, source acquisition, dispatch, Cloudflare Worker/R2 write, independent verification, history/feedback, final truth. Include failure/recovery/boot/worker epochs. Be explicit that Chrome does not expose every ordinary context-menu opening or every click that never reached the extension; never claim impossible universal click interception.
5. A user may **Export RAW ZIP** and **Export SECURE ZIP** **during recording, immediately after Stop, and after reopening Settings**. These are two views of the **same immutable event snapshot**, not two independent collectors. SECURE is the safer sharing format; RAW is private and intentionally may hold full observed source/page URLs and original errors when the user expressly opted into that level of collection.
6. Implement as a **modular observer and separate versioned storage**, never a second save engine, a second Chrome context-menu listener, a new worker, a browser-wide monitoring service or a UI-rendering dependency for dispatch. If recording fails, stops, is full, exceeds quota, or crashes, saving must keep working correctly.
7. Make exports useful for a defensible **ReDown versus Click2Cloud baseline**. Compare verified completion rates, failures, uncertain outcomes, latency and recovery under matched scenarios, with the same denominator and evidence class. Never claim success just because a recorder reports a green stage.
8. This is NOT a request for ReDown gamification/counters, another diagnostic dashboard, **implementing new cloud providers now** (only future-compatible observer adapters and synthetic fixtures), changing API semantics, fixing unrelated File API operations, publishing to a store or claiming launch certification.

**Primary invariant: the recorder must never make the right-click engine less reliable than the frozen Base 0.1 build.**

## 1. WORKFLOW & CHANGE DISCIPLINE (future Codex run)

- Before implementation: identify repository, branch, HEAD, working-tree changes, Chrome build/extension ID, existing diagnostic consumers and the frozen Base 0.1 tag. Inventory relevant source and tests and record which regression gates currently pass/fail. Note that the owner's Windows focused test on the Base 0.1 source had 370/372 passing, with (a) stale extension/app.css SHA in the current workings map and (b) a local workerd/R2 File API mutation returning uncertain. **Do not misattribute those existing failures to the recorder, hide them or blindly rewrite assertions.**
- Make a NEW focused implementation branch based on the latest owner-approved Click2Cloud code, retaining this request and its file history. Never implement directly on the tag or rewrite the milestone, and do not merge to main or deploy without an explicit owner decision.
- Protect all user modifications (especially local docs/evidence/shelf-engine/real-shelf-receipt.json), IndexedDB CURRENT/journals, nativeRegistration generations, backup files, OAuth sessions, account assignments and provider objects. Never suggest a reset, uninstall, chrome.storage.local.clear(), indexedDB.deleteDatabase() or git reset --hard as a test workaround.
- Scope changes to self-contained recorder modules, a narrow **existing-owner** observation interface, a small Debug Settings control, read-only local ZIP exports, and focused tests/docs. Avoid refactoring menu compiler, Chrome registrar, service-worker bootstrap, login, transport, Worker provisioning, CURRENT, Cloudflare adapter, File API, History/counters, or notification behavior.
- Use repository skills/AGENTS.md and source as authoritative for current behavior. Source-ground all new APIs and explicit trusted-sender constraints before changing files.
- Keep the existing owner-tested right-click save pathways byte-identical when possible; if a tiny instrumentation callback edit is unavoidable, document a before/after behavior/latency/route diff and independent regression tests. No speculative “cleanup” changes or dependency upgrades.
- Do not introduce new broad permissions, external telemetry, public endpoints, native host installers, servers, provider requests, or remote uploads. ZIP generation is local and explicitly requested. Preserve CSP, stable manifest key, OAuth redirect and exact extension ID.
- Deliver a reviewable diff, tests, browser/worker reports, privacy audit, fail-open proof, and a clear owner-controlled Windows installation plan. If source changes cannot be safely verified, report blockers and stop instead of claiming completion.

## 2. SOURCE INVENTORY TO STUDY FIRST (do not blindly copy)

**Click2Cloud current production seams**
- extension/background.mjs — one existing context-menu registrar; onGesture/beforeClick/dispatch/onOutcome wiring, registered as one real native listener. Reuse observational callbacks only.
- src/chrome/registrar.mjs — one contextMenus.onClicked listener and native registration/ACK; preserve resolveClick, menu generations and dispatch outcomes. Never add another competing listener or let the recorder hold the gesture.
- src/core/engine.mjs — single save owner with correlated auth.check, resolver, capture.acquire, intent, worker.capability, transfer.upload, transfer.verify and completion.history boundaries.
- src/glaciaring/index.mjs and its catalog/agent APIs — existing compact, bounded diagnostics; **do not just raise its 512-slot in-memory ring to 100,000**, and do not mistake agent diagnostic grants for user capture consent.
- src/chrome/debug-preference.mjs and extension/app.mjs/app.css — Debug Mode OFF default, currently hides the floating status box; make the Recorder card appear under Debug details without recreating the distracting overlay.
- src/chrome/trusted-sender.mjs, src/api/service.mjs, extension/background.mjs messaging — all new commands are versioned, allowlisted, owner-authenticated and read-only for export; observer must not obtain authority to save/provision/delete.
- src/core/boundary-observation.mjs, src/modes/depth/native-click.mjs and remote result/receipt storage — study exact correlation and the Depth special path; do not fake unsupported stages.
- docs/evidence/nov13-trash-silent/CHANGES_AND_TESTS.md; docs/evidence/nov13-trash-silent/LOGIC2REAL_MATRIX.md; Project_direction/FLIGHT_RECORDER_INDEPENDENT_RIGHT_CLICK_GRACEFUL_RECOVERY_2026-11-12.md; launch-readiness/base-0.1/CLICK2CLOUD_EXHAUSTIVE_LAUNCH_READINESS_CHECKLIST_2026-11-13.md.

**ReDown reference implementation — implementation and negative lessons**
- thanks-cohn/REDOWN/extension/forensic-diagnostics.js, extension/forensic-download.js, docs/FORENSIC_EXPORTS_2026-11-12.md.
- thanks-cohn/REDOWN/extension/flight-recorder.js, extension/capless-archive.js, extension/capless-controls.js, extension/startup-crash-trace.js, extension/entry-bootstrap.js.
- thanks-cohn/REDOWN/docs/P0_CRASH_CAPLESS_REPORT_2026-11-12.md, docs/P0_CRASH_CAPLESS_REVIEW_2026-11-12.md, docs/verification/p0-capless-2026-11-12/README.md.
- thanks-cohn/REDOWN/codex/2026-11-12-p0-crash-root-cause-flight-recorder-capless.md; CODEX_REQUESTS/P1_AUTOMATIC_FORENSIC_DIAGNOSTICS_TWO_ADDITIONAL_EXPORT_BUTTONS_2026-11-12.md; CODEX_REQUESTS/P1_DIAGNOSTIC_SOURCE_PAGE_URL_CONTEXT_2026-11-12.md.
- ReDown's stress/controls/browser harnesses: tests/flight-recorder-storage.test.mjs, tests/capless-archive.test.mjs, tests/capless-controls.test.mjs, scripts/capless-stress.mjs, scripts/capless-browser.mjs.

Inspect, adapt narrowly, document provenance and retain license constraints. ReDown's architecture and installed evidence are NOT proof Click2Cloud is ready, and REDOWN files are not a drop-in authorization interface.

## 3. WHAT REDOWN ACTUALLY TAUGHT US — TURN EACH INTO AN EXPLICIT REGRESSION GATE

ReDown's incident on 2026-11-12 was severe: the extension and Options became inaccessible until Reload. **Its original browser-level cause is unresolved.** This instruction must not claim the recorder caused the disappearance or that capless logging fixed it. The evidence supports particular recorder defects and gaps:

| ReDown observation (source-grounded) | Click2Cloud prevention / test |
| --- | --- |
| Forensics retained **4,000 of 35,417 attempted events**; ≥31,417 were dropped/pruned. These are EVENT attempts, not saves. Legacy ledger imposed 4,000 records / 4 MiB / seven days. | User's chosen 100,000-event run is **not** silently trimmed to a legacy window. The export must enumerate the complete committed run, or state precisely how many records/ranges are incomplete. Never compute a save success rate from raw event count. |
| Startup trace only kept 384 entries with ≥895 earlier dropped; ≥11 unconfirmed writes and ≥4 storage failures. | Record small durable per-epoch/lifecycle checkpoints and honest earlier gaps; pin actionable incidents separately. Missing history remains unknown, not “never happened.” |
| Four Chrome storage reads/writes crossed a 1,000 ms deadline but later completed, around 1.18–1.72 s total. An old Promise.race released serialization too early. | **A diagnostic deadline is a warning, not cancellation or transaction completion.** Keep ordered ownership until the actual IndexedDB/Chrome operation settles. Test slow eventual success, late reject, queued second write and worker interruption. No concurrent stale success overwriting newer data. |
| Health status was redundantly rewritten on every healthy event (100 events produced 100 health writes, later repaired to ≤2). | Coalesce/dedupe health writes; avoid event-by-event chrome.storage.local churn and recursive “log the logger” storms. Record backlog/write/lock metrics without amplifying them. |
| At least one ZIP named SECURE actually contained RAW. The two owner captures shared the exact same startup events; filenames and duplicate archives were misleading. | Generate privacy projections independently; read and inspect actual ZIP entry bytes in tests. Encode mode in manifest AND filename; RAW/SECURE must be distinguishable by content. Exporting same snapshot twice does not count as independent test incidents. |
| A full ZIP could not honestly be assembled from old pruned bounded ledgers; browser quota and async commits leave unconfirmed ranges. | Separate versioned durable archive with stable run ID, sequence, immutable committed segments, digests/manifest and gap ledger. Snapshot at a committed high-water mark; never label partial ZIP “complete.” |
| ReDown capless fixes use append-only disk-backed JSONL chunks, SHA-256 chain, durable pending reservation, atomic finalize, dedupe/unique attempts, strict durability when supported, separate incident envelope and local streamed/multipart export. | Reuse these proven **principles** when suitable, but audit exact Chrome/IndexedDB behavior before porting. No OS-level fsync promise. Handle corruption and identity changes without erasing old data. |
| 100,000 synthetic events passed in a Node fake-IDB run and an isolated Linux Chromium disk-backed IDB fixture. | Treat this as feasibility evidence only. Re-run a Click2Cloud-specific 100k capture in actual extension context; Windows installed UI, real service-worker lifecycle and Chrome Task Manager memory/CPU remain separate, necessary acceptance. |
| A hard kill can precede an asynchronous write. A new worker epoch / onInstalled update does not prove “crash.” | Pre-incident small breadcrumbs + next-boot recovery; mark absent terminal events INTERRUPTED / UNKNOWN, never infer a kernel/browser/GPU crash from silence. Require external owner-observed Chrome Errors/Task Manager when the extension is inaccessible. |
| ReDown's storage failures did not establish the cause of the simultaneous YouTube problem, disk pressure, GPU issue or complete extension disappearance. | Separate observed source defects, hypotheses and independent Windows evidence. Recorder must not claim to diagnose outside-browser process crashes from inaccessible in-extension APIs. |
| RAW forensic URLs/errors can contain signed secrets; ordinary SECURE exports must not contain raw paths/tokens/accounts. Raw private archive was rightly kept off public GitHub. | Explicit consent and privacy warning; no automatic network export; a strict SECURE allowlist with seeded sentinel leak tests; test export while offline, without waking provider or writing cloud data. |
| Existing ReDown HTML/CSS, seven-file diagnostics bundle, buttons, History and counters were preserved rather than repurposed. | Preserve current Debug controls, Save Results, History, CURRENT, receipts, menu and UI layout. New Recorder is additive and removable without altering business behavior. |
| A full repository reliability wrapper unintentionally launched a broad suite; acceptance remained incomplete. | Execute recorded narrow test commands first; log any broader or blocked runs honestly. No green badge based on an incomplete run; no changing fixtures simply to “pass.” |

ReDown reports explicitly separate **demonstrated repaired diagnostic defects** from **unresolved installed-Chrome disappearance**. Preserve that line in every report.

## 4. UI AND OWNER EXPERIENCE CONTRACT

In Settings, keep the existing Debug section and Debug Mode checkbox. **Only when Debug Mode is ON**, add a compact self-contained panel:

- Header: **Right-Click Recorder**; one-line note “Records Click2Cloud menu actions only; stored locally.”
- IDLE: button **Start Recording**; editable numeric maximum event count (including 100,000) with input validation, practical storage estimate and privacy mode declaration.
- ACTIVE: same button becomes **Stop Recording**; display clear ACTIVE indicator and an accessible live status: run ID, started at, **observed clicks**, recorded committed events, pending queue, maximum events, dropped/unconfirmed/gap count and storage state. No large floating status box, sound, OS notification chain or expensive per-event DOM redraw.
- STOPPING: prevent double starts/stops and wait for a bounded graceful drain/snapshot decision without blocking saves. If pending writes cannot settle, show “Stopped; incomplete/unconfirmed events” rather than “Complete.”
- STOPPED: preserve archive and display run ID, time range, complete vs incomplete status, final committed count, gaps, and both export buttons; permit a new run with a fresh run ID without deleting the old.
- **Export RAW ZIP** and **Export SECURE ZIP** stay available during ACTIVE and after STOP, and after closing/reopening Settings. While ACTIVE, each export snapshots a stable high-water boundary and explicitly excludes events committed later.
- RAW export requires a conspicuous confirmation **each time**: may contain full website/source URLs, signed query credentials, account/folder identities, filenames and original errors; never auto-share.
- SECURE export is the preferred button; label it unambiguously and report the actual redaction state.
- Add read-only list of retained user-created runs with summary and ability to choose a run for export. Do not automatically erase older runs just because Start was clicked again. Explicit deletion, if ever offered, must ask for confirmation and must only target one selected recorder archive.
- Buttons are keyboard accessible, tab order is correct, screen readers announce state transitions, reduced motion and narrow Shelf widths are supported.
- Changing Debug Mode OFF while a run is active must not allow hidden sensitive recording: **warn/confirm and stop collection with a truthful state** before hiding it (or offer explicit Stop/Cancel). Never silently record sensitive RAW with no visible reachable controls. Toggling Debug OFF does not erase archived evidence.
- Stop means no new events admitted after the stop high-water boundary; events accepted before Stop may finish durability and must be included or clearly marked unconfirmed. A later unrelated save does not extend a stopped run.
- The exact user's chosen maximum N is a **per-run admission limit of recorded events**, not a quota on successful uploads, not the number of clicks, and not a 4,000-event hidden internal ring. At N, automatically enter a finalizing/STOPPED state with a clear “event limit reached” cause, preserving all earlier committed evidence.
- If available storage cannot honor the requested N, warn before Start; do not promise capacity or allocate N entries in RAM. If quota fails mid-run, mark the run incomplete/stalled and preserve all prior history. Explicit user choice is needed to retry or start a fresh run.
- The recorder remains entirely optional. **No UI change outside the Debug Settings panel** unless required for an accessible, minimal “recording active” indicator.

## 5. ARCHITECTURE: AUDIT-FIRST, FAIL-OPEN, MODULAR

Design a small internal module group (names illustrative, not mandatory):

~~~text
src/recorder/
  schema.mjs                 typed event, run, reason, provenance schemas
  controller.mjs             explicit Start/Stop state machine, consent and limit
  observer.mjs               tiny non-blocking emit/hook surface, one run owner
  archive.mjs                separate versioned IndexedDB append-only segments
  reconcile.mjs              epoch/restart/pending recovery, integrity and gaps
  export.mjs                 read-only snapshot cursor and secure projection
  metrics.mjs                uniform attempt-centered measurements/comparison
extension/
  ...existing single app/settings + existing background/registrar hooks
tests/
  ...focused recorder/boot/export/privacy/noninterference cases
~~~

- One canonical **recorder run controller** persists control state separately from CURRENT and native registration. Start/Stop use explicit user gestures and trusted Chrome extension sender validation; an untrusted page/content script cannot enable, export or configure the recorder.
- One durable, independent **IndexedDB recorder namespace** storing run headers, monotonic event sequence, committed immutable segment metadata, checksums, pending reservations and gap markers. Use bounded batch writer + backpressure, not unbounded arrays or per-event large Chrome storage writes.
- **No second menu event listener** and no own save queue. Hook once into existing registrar's onGesture / relevant lifecycle boundary and engine diagnostics. The recorder's callback is wrapped in try/catch and must never throw/reject into dispatch or prevent the native gesture from completing.
- Link native gesture to one stable **attemptId**, transport/proof IDs and engine diagnostic operation ID where they are legitimately shared. A save may start before its remote operation ID is known; preserve explicit provenance links instead of guessing from timestamp proximity. For a direct Depth recovery/setup click, distinguish attention or blocked action from a successful save.
- Existing compact glaciaring diagnostics remain in place. The large archive is a **consumer of observational evidence** when requested; it must not replace current always-on critical safety traces, elevate diagnostic privileges or require the engine to wait for recorder writes.
- No recording hook may make an additional HTTP request, query a user's source URL, poll R2, enumerate accounts, extend token lifetime, change authorization, retry upload or inspect file bytes merely for analytics.
- Recovery of a worker's new epoch must not resurrect a completed/expired run or create duplicate event IDs. An ACTIVE run explicitly consented by the user may resume on the next worker wake using the same run ID if still valid; mark uncovered intervals and previous epoch termination as UNKNOWN. If control metadata is corrupt or missing, **fail closed for new sensitive recording** but preserve archive; never synthesize fresh consent. The UI must clearly say if capture was interrupted.
- Healthy diagnostic status updates must be deduplicated/coalesced; do not recursively log status of each status write. Warnings must not free serialization locks before underlying writes actually settle. Async failure is contained in recorder ownership and never bubbles into protected save operations.
- Failed/aborted IndexedDB transactions, quota exhaustion, DB versionchange/blocked opens, browser shutdown, extension upgrade, stale cursors, duplicate event IDs, corrupt pending journal, hash mismatch, missing schema migration, worker sleep, multiple Shelf windows, clock rollback and export racing Stop all require explicit tests.
- Use browser-supported storage and local export APIs only. Do not pretend the extension can bypass quota, persist on disk after profile clearing, or capture events after Chrome has disabled all extension code. If File System Access is unavailable, use a controlled multipart/streaming alternative or block clearly; do not silently create a huge in-memory zipSync copy.
- Avoid high-frequency UI repainting, persistent intervals that keep MV3 alive, global promise locks shared with saves, and large chrome.storage.local.get(null) scans at each click. Measure overhead against the same baseline source/destinations.

### Recorder-defined trust boundary

The recorder can observe approved, typed and bounded fields, but cannot:
- call provider create/update/delete/upload/provision;
- replay or acknowledge pending saving work;
- mutate current generation, menu registrations, destination configs, settings (except its own recorded preference/consent), History or counters;
- inspect unrelated browsing history, cookies, auth headers, private filesystem, local network or another extension's database;
- silently upload RAW/SECURE material to any server.

If any of these permissions appear necessary, stop and seek a separate explicit design approval instead of expanding scope.

## 5A. FUTURE-PROOF MULTICLOUD OBSERVABILITY — CLOUDFLARE NOW, ANY PROVIDER LATER

**New owner requirement (2026-11-13):** The recorder must be fundamentally **provider-agnostic**. Build and validate the core against real Click2Cloud/Cloudflare now, while making later Google Drive, Microsoft OneDrive, Dropbox, and any future supported cloud provider trivial to instrument using **small observational adapters/submodules**. ReDown's existing multi-provider recorder is an architectural reference, not an excuse to copy its old caps/fragile storage behavior.

**Scope boundary:** The future Codex implementation of THIS request adds diagnostics for **currently supported Click2Cloud Cloudflare flows only**, plus synthetic provider-adapter contract fixtures. **Do not implement, enable, authenticate, provision, advertise, or simulate production support for Google Drive, OneDrive or Dropbox now.** Their names in this section mean **forward-compatible design**, not provider release approval.

### The invariant: a new provider never requires a recorder rewrite

~~~text
[Chrome's ONE existing contextMenus.onClicked owner]
                       |
          [existing canonical menu + SaveIntent]
                       |
           [provider-neutral observer seam]  <--- no transport authority
             |     |       |      |
       Cloudflare  Drive  OneDrive Dropbox ... future
       observed    adapter adapter  adapter      adapter
          |           provider-specific receipt → generic evidence envelope
          +-----------+-------+------+----------+
                      |
           [ONE run controller / event schema]
                      |
        [ONE durable append-only local archive]
                      |
        [ONE RAW / ONE SECURE ZIP projection]
                      |
        [provider breakdown + comparable metrics]
~~~

- **Single recorder schema, run controller, persistence layer, start/stop controls, event-limit accounting, exporters and comparison engine** for *all* providers. Never spawn one per-provider recorder, one ZIP implementation per provider or multiple native Chrome listeners.
- A tiny **provider observer adapter** (not a saving adapter) translates typed, **already-observed** data from an existing provider's save path into the **same standardized capture contract**. No provider-specific cloud request is issued by diagnostics. The core must recognize an unknown provider ID as a typed, incomplete/unsupported observation, not throw, drop the click, or fall back to “Cloudflare.”
- Reuse existing Click2Cloud's trusted canonical native-click/save-attempt ID and join whatever real provider-specific request/receipt IDs become available; **do not guess joins from timestamp, filename, account name or URL**. Future provider retry/callback semantics may differ; each module indicates provenance and verified vs accepted vs uncertain.
- Provider-specific **optional metadata** is namespaced and schema-versioned. Keep a **stable common event envelope**: runId, attemptId, eventId, sequence, timestamp, workerEpoch, menuGeneration, mode, context, providerId, providerAction, stage, outcome, source class, destination class, latencies, proof classification, error category, evidence class and completeness. A Google Drive file ID is not an R2 object key; OneDrive driveItem IDs, Dropbox paths and R2 key+ETag are not interchangeable. Preserve their original typed evidence in the RAW view only where observed and consented, while using privacy-safe opaque references in SECURE.
- Adopt **generic semantic stages** for all providers (delivered click → route/auth → source capture → write admitted → provider response → verification → final disposition). Providers may add **namespaced provider stages** for upload sessions, resumable chunks, conflict handling, destination resolution, rate limits, async commits and remote readback. An unavailable stage must be \`not_observed\` or \`not_applicable\`, not fabricated merely to align graphs.
- **Provider verification contract:** each provider module refers to the real, authoritative completion/proof from its own existing save pipeline. A successful Drive HTTP response is not necessarily equivalent to a verified R2 object readback; normalizer distinguishes \`provider_accepted\`, \`provider_confirmed\`, \`independently_verified\`, \`partial\`, \`uncertain\`, \`failed\`, and \`unknown\` with exact evidence scope. Report provider-specific verification strength separately rather than artificially equalizing success rates.
- **Provider/connection isolation:** recorder failures for Google, OneDrive or Dropbox must not affect Cloudflare saves, and broken Cloudflare observability cannot disable other healthy providers. One disconnected provider must not stop the recorder or erase its other providers' event history.
- **Provider additions as submodules:** document the minimal registration/interface (e.g. \`observeProviderEvent({providerId, attemptId, stage, result, receiptRef, ...})\`) with validation, versioning, capability flags, supported outcomes, privacy-filter projection, and a provider fixture. Do not export tokens or raw provider response bodies through arbitrary extension/plugin fields. Unknown fields are rejected/omitted from SECURE by default, and RAW only stores explicitly allowed legitimate observations.
- **No recorder changes to add providers:** when Click2Cloud later supports an additional cloud, adding its provider-specific observation module and declarative capability mapping should be sufficient. The Debug UI, archive writer, 100,000-event limits, RAW/SECURE exporters, and generic success/failure metrics **must not require editing**.
- Make metrics **per provider and aggregate**: observed native clicks, eligible save attempts, provider-confirmed receipts, independently verified saves, uncertain/failed/blocked attempts, dropped recorder events, p50/p95/p99 timings and recovery rates. Aggregate only commensurate denominators and report comparison exclusions. Cross-provider save operations count once per actual intended independent destination/operation, never once per emitted stage or duplicate callback.
- **Security differences are real:** Google, OneDrive and Dropbox may return opaque file IDs, resumable-session URLs, signed preview/temporary links and provider-specific sensitive error messages; neither RAW nor SECURE may deliberately record OAuth tokens/cookies/headers/body content, and SECURE must remove such values even when nested or disguised.
- No implicit dependency on Cloudflare Worker/R2 code, bucket names, R2 authorization scopes, Worker digests, URL-privacy assumptions, or Cloudflare-only menu structures inside the generic recorder. Cloudflare-specific details live in its tiny observer adapter.

### Multicloud adapter proof **before** any additional real provider integration

Add isolated, deterministic **mock observer adapters only** for Google Drive, OneDrive, Dropbox and one invented future provider. Feed each the exact same generic click→upload→provider proof→outcome sequence plus appropriate provider-specific optional events. Verify all events use the same persistent writer and same two exporters; no changes to the recorder core, UI or export module when swapping providers. No OAuth credentials, extra network permissions, cloud writes, simulated “live success” claims or new provider UI.

Suggested future-proof tests:

- **R51** Cloudflare's actual existing save path records through the generic observer contract, without injecting Cloudflare terms into the core archive/export code.
- **R52** Synthetic Google Drive provider adapter plugs into the registry; captures a delivered right-click, account/file ID as optional scoped metadata and accurate completion/unknown semantics using no real provider access.
- **R53** Synthetic OneDrive and Dropbox adapters do likewise, exercising resumable/delayed-ack/temporary-link/path identity differences without weakening privacy.
- **R54** Synthetic unknown/fifth provider, unsupported capability and missing receipt do not crash the native listener, recorder, ZIP exporter or any actual save; unsupported/unverified fields remain explicit.
- **R55** A multicloud mixed run interleaves four provider adapters and 100,000 total events in ONE run/DB: sequences unique; per-provider/aggregate counts correct; same RAW/SECURE ZIP format; secure redaction passes provider-specific sentinel tests.
- **R56** Provider-specific storage/auth/rate-limit failures are attributed only to the relevant attempt/provider and do not break unrelated healthy provider recordings or cloud saves.
- **R57** Adding a new mock provider requires ONLY a module/registry declaration and contract tests, **zero modifications** to archive writer, run controller, Debug UI and export processor. If not achieved, document the design shortfall rather than claiming plug-and-play extensibility.
- **R58** Comparison report can group by provider and cross-provider verified evidence strength; incomparable proof standards are reported separately instead of inflating overall success percentage.

**Future integration rule:** When the user later authorizes Google Drive/OneDrive/Dropbox implementation, add each through its already-working save provider pipeline. The recorder merely observes; the provider's save/authorization/retry code continues to own its operations. ReDown's multi-provider diagnostics may provide source patterns and test cases, but the Click2Cloud recorder remains independent of ReDown runtime/storage.

## 6. EVENT MODEL & EVIDENCE TRUTH CONTRACT

Each delivered native Click2Cloud action yields **one attempt**, with **multiple events** linked by stable attemptId. Suggested schema (derive from actual source and version):

~~~json
{
  "schemaVersion": 1,
  "runId": "opaque uuid",
  "eventId": "opaque uuid",
  "sequence": 1,
  "attemptId": "opaque uuid",
  "workerEpoch": "opaque id",
  "timestampUtc": "ISO 8601",
  "monotonicOffsetMs": 2.3,
  "extensionVersion": "0.3.19",
  "buildCommit": "40-character source commit or unavailable",
  "component": "native-registrar",
  "stage": "CLICK_DELIVERED",
  "outcome": "observed",
  "mode": "simple | narrow | depth | flat | provider-action | unknown",
  "menuGeneration": 123,
  "menuItemRef": "non-secret stable correlation identity",
  "provider": "cloudflare | future provider | unknown",
  "context": "image | link | page | video | audio | other",
  "operationId": null,
  "source": {"pageUrl": "observed or not_observed", "sourceUrl": "observed or not_observed"},
  "destination": {"identity": "observed or not_observed"},
  "statusCode": null,
  "durationMs": null,
  "evidenceClass": "installed_chrome_observed | local_fixture | inferred | not_observed"
}
~~~

A representative **stage vocabulary**, where observable, should include: EXTENSION_WORKER_EPOCH_BEGIN, CORE_IMPORT_READY/FAILED, MENU_GENERATION_DESIRED, MENU_NATIVE_ACK, CLICK_DELIVERED, CLICK_ROW_LOOKUP, MENU_ACTION_RESOLVED, STALE_OR_DISABLED_REJECTED, AUTH_CHECKED, SOURCE_SELECTED, SOURCE_FETCH_STARTED/FAILED/COMPLETE, PROVIDER_WRITE_STARTED/FAILED/UNCERTAIN, PROVIDER_WRITE_ACK, INDEPENDENT_READBACK_VERIFIED/REJECTED/NOT_OBSERVED, HISTORY_HANDOFF, FINAL_COMPLETED/FAILED/BLOCKED/CANCELLED/UNCERTAIN, WORKER_EPOCH_INTERRUPTED_OR_UNKNOWN, RECORDER_WRITE_FAILED, RECORDER_GAP and RECORDER_SNAPSHOT_BOUNDARY.

Do not invent a stage that is not emitted, assume provider ACK is physical success, or call native ACK actual Chrome menu visibility. A successful attempt MUST use the existing authoritative verified transfer receipt; for absent proof report UNKNOWN/UNCERTAIN rather than COMPLETED.

The capture must distinguish:
- pageUrl (hosting page) vs srcUrl/linkUrl (actual selected media/link) vs final URL (only if the real source-fetch path observed redirects);
- source hosting/CDN errors vs provider/Worker errors vs local recorder/storage errors; never infer cloud fault merely from a failed website request;
- expected destination (mode, account/bucket/prefix identity) vs resolved physical destination vs actual remote readback, with privacy-safe correlation in SECURE;
- original error *when legitimately observed* vs normalized error category; missing details explicitly not_observed;
- unique **clicked action count** vs event count vs verified save count vs history rows vs remote operations;
- UTC time versus local display, worker epoch versus browser restart versus extension update versus confirmed external crash evidence;
- event persistence state: admitted, pending, committed, unconfirmed, dropped (lower bound), corrupt, missing, explicitly excluded from snapshot.

**No phantom success**: a provider-ACK signal, one green UI status, or a remote operation ID does not count as independently verified save. **No phantom failure**: a lost response may represent a completed remote write; mark uncertain and inspect separately, never auto-retry solely to satisfy a metric.

### RAW capture and exactness

On Start, clearly explain the privacy level: user-consented RAW diagnostic evidence can include precise source/page URLs, route/destination identifiers and original error strings that were already observed in normal execution. Capture **only metadata directly related to delivered Click2Cloud actions**, and don't intentionally collect browser cookies, OAuth access/refresh tokens, authorization headers, passwords, arbitrary response bodies, file contents, or all-tab navigation history.

Do not call a ZIP RAW if it actually reconstructs/guesses redacted values, silently removes stored fields, or uses a different source of truth. Provenance and not_observed must remain explicit.

### SECURE projection

Build a separately validated **allowlist projection** from the same raw snapshot. Remove or irreversibly anonymize query parameters, fragments, signed URLs, userinfo, sensitive paths, account/bucket/folder IDs, filenames and free-form error strings/stack frames. Safe provider and stage categories, bounded durations, status codes and locally consistent opaque correlation IDs may remain. Consider installation-local keyed HMAC for identifiers; never export the HMAC key or deterministic public hashes of guessable private identifiers.

Prove with seeded sentinel values that SECURE ZIP's actual uncompressed bytes and nested fields contain **zero sensitive sentinels**, including in manifest, filenames, duplicate metadata, JSONL, README and ZIP comments. A RAW warning is necessary; it is not sufficient to protect SECURE. Preserve the original raw store untouched by both exports.

## 7. SESSION, RETENTION, COUNTS & CRASH SEMANTICS

Run states: IDLE / STARTING / ACTIVE / STOPPING / STOPPED_COMPLETE / STOPPED_INCOMPLETE / LIMIT_REACHED / RECORDER_UNAVAILABLE. State changes must be durable or report unsaved status; no UI optimism.

- A user Start requires explicit persistent scoped consent for the selected run and privacy level, validated maxEvents, an archive identity and a generated run UUID.
- A user Stop records durable stop request/high-water and disallows subsequent admission; flush accepted queued batches when possible. If a worker dies mid-flush, persist a pending reservation/journal and mark uncertain in next epoch.
- Stored run archives remain after Stop, switching settings tabs and Chrome restart. No seven-day or 4k automatic deletion behind the user's back. If a future retention policy is approved, it must be explicit, opt-in and never rewrite the evidence of an already recorded run.
- If prior archive identity, schema, segment chain or pending content is corrupt/missing, do NOT silently reset with a new ID, wipe records or mark a green state. Keep earlier evidence; report exact gaps/repair-needed with read-only export if possible.
- Each run has admitted/committed/exported counts and *known lower bounds* of dropped, unconfirmed and invalid events. These values are never interchangeable.
- Count actual **successful saves** by unique verified attempt IDs/receipts, not by event count, provider-write starts, completed stage strings or History size. Never derive a lifetime success rate from partial historical records.
- Record every delivered click after Start where recording is enabled. Do not infer undelivered Chrome events, pre-start user actions or user activity while Chrome is closed.
- Under normal Chrome idle suspension, reopening the panel shows ACTIVE vs STOPPED truth based on persisted state and any recovery; worker epochs do not silently make a brand-new session. If continuing the approved ACTIVE run is impossible, show INTERRUPTED/INCOMPLETE, retain events and request explicit user action.
- App source code/config/status timestamps and alert counters must be scoped to their actual snapshot. Never merge records from ReDown or a different Chrome profile into the same run ID.

## 8. ZIP EXPORT — WHOLE EVIDENCE, NO MISLABELED “SECURE”

Both buttons operate on the **same run and same committed snapshot high-water sequence**. If the user generates RAW and SECURE separately, store/display a snapshot ID and let the second button re-use that selected snapshot; if the active run advanced in between, explicitly offer new snapshot instead of pretending equivalence.

Proposed contents for each ZIP, or a verified multipart set when large:
- README.md: extension/build/OS/browser evidence scope, capture window, privacy warning and how to inspect; clear that a generated download is NOT proof the OS wrote the file.
- MANIFEST.json: schema, run ID, snapshot ID, high-water seq, privacy mode, capture consent, counts, known gaps/unconfirmed ranges, byte/part count, file hashes, backend availability, export method, evidence class and any missing sections.
- events.jsonl or segmented events-*.jsonl: chronological, sequenced complete events within the boundary; do not silently limit to last 100/4,000 or an arbitrary 512/100k sample.
- attempts-summary.jsonl: attempt-level classifications, verified saves, failures, blocks, uncertainties, p50/p95/p99 timings, unique destinations/modes where safe, plus missing denominator/censoring notes.
- recorder-health.json: bounded writer metrics, lock/slow-write samples, queue depth, quota estimate, unconfirmed and drop counters; no credential-bearing storage values.
- integrity.json: SHA-256 digests, verified immutable chain, missing/corrupt segment list and part order (hashes of sensitive RAW content may remain private within RAW; SECURE should hash secure projected contents).
- optional comparison-schema.json: stable names/units for importing SECURE ReDown baseline without claiming both products emit identical internal stages.

**Large archive execution:** stream/cursor read and incrementally ZIP with bounded memory and backpressure; where browser API cannot sustain one file, use deterministic multipart ZIPs with a complete part manifest and an actionable “Export next part” control. Do not use fflate.zipSync on the whole 100k-event archive or make the Shelf load everything in a string/Blob at once. Support cancellation and partial export recovery without touching recorded events. Generate local file(s) only on explicit user gesture; no remote upload.

**Privacy hard gate:** Do not trust filename mode. Unit test the ZIP's decompressed bytes, entry inventories, and manifests. A file labeled SECURE with RAW source URLs is a P0 leak, not a cosmetic bug. Nothing is auto-uploaded or committed to GitHub.

**Export during recording:** take a stable snapshot at the last confirmed transaction and mark earlier pending/unconfirmed ranges. A concurrent Stop, restart, append or second export cannot mutate that snapshot; new events belong to a later boundary. False “ZIP fully saved to disk” messages are prohibited where Chrome only acknowledged initiating download.

## 9. REDOWN ↔ CLICK2CLOUD BASELINE COMPARISON

Provide a **separate, read-only comparison workflow**, not shared live browser storage, remote account access or a second telemetry service.

- Normalize ReDown and Click2Cloud **SECURE** exports into a common versioned comparison schema with evidence/source application labels, separately preserving original event semantics. ReDown export compatibility must be proven from actual samples or tests; if no compatible ReDown bundle is supplied, mark “ReDown import not tested,” do not invent it.
- The denominator is **observed eligible delivered menu save attempts** in an explicit interval with known completeness, not total events, not number of raw ZIP rows, not historical odometer and not remote HEAD count by itself.
- Compare by mode/context/provider/site when representable: attempt count, unique verified remote saves, blocked/cancelled/uncertain/failed, first-click and terminal latencies, p50/p95/p99, cold/warm boot-to-first-valid-save, retry/restart reconciliation, duplicate attempt or remote-object counts, and coverage gaps.
- For unlike provider capabilities, route modes or incomplete snapshots, label **non-comparable** rather than treating missing ReDown fields as successful/failed.
- Both apps' results should be backed by independent physical provider readback for any claimed verified rate, or clearly labeled as fixture-only/recorded-receipt-only. Comparing two simulated logs is not launch proof.
- Track recorder overhead: per-click capture latency and CPU, storage write frequency, peak queue, heap/RSS where measured, browser launch time and Chrome responsiveness. Compare OFF vs ON and Click2Cloud vs ReDown at matched workload.
- Include a side-by-side report of **documented intended behavior vs actual observed Chrome menu/save behavior** (the Click2Cloud logic2real gap), especially Simple/Narrow/Depth and stale menu generations. No invented native menu observation from registrar ACKs.
- Treat a same-contents duplicate export as one incident source; do not inflate the comparison sample.

## 10. REQUIRED REGRESSION / FAULT TEST MATRIX

Create deterministic fixtures and actual installed-Chrome procedures. Every test has a stable ID, exact precondition, reproducible input, expected outcome, observed outcome, and evidence class. Suggested minimum:

### A. Baseline + OFF-by-default noninterference
- R01: Base 0.1 native right-click save (Simple, Narrow, Depth), exact remote target and verified bytes unchanged with recorder **OFF**.
- R02: Debug OFF and recorder never enabled: no new high-volume archive, no GUI flicker, unchanged cold boot, routing, authentication, provider permissions and bundle behavior.
- R03: With Debug ON but recorder IDLE, no high-frequency writes. Existing Debug safe summary and quiet floating-status behavior unchanged.
- R04: No duplicate contextMenus.onClicked listener, no duplicate toolbar owner, no action dispatch delays/extra cloud writes.
- R05: Throwing recorder getter, callback, IDB or ZIP subsystem never changes save result, complete/uncertain truth, menu ACK, History or counter.
- R06: Existing native Chrome save works even when Shelf cannot render and recorder Settings is inaccessible; recorder never becomes a required boot import.
- R07: Legacy fixed 512/4k event buffers remain intact, but **are not the collector** for the 100k run.

### B. Consent, UI, session boundaries
- R08: Only Settings → Debug ON reveals Recorder. Start → Stop label/state/keyboard/ARIA correct.
- R09: Start canceled/denied/failed leaves IDLE; no sensitive data captured.
- R10: 100000 max accepted; 99999/100000/100001 event boundaries correct; one extra event is explicitly outside run.
- R11: Invalid negative/float/NaN/infinity/overrange inputs rejected; quota estimation never promises exact disk availability.
- R12: Stop twice/start twice/multi-window races yield one true authoritative run.
- R13: Close/reopen Shelf or settings while ACTIVE and STOPPED retains correct status; Debug OFF during ACTIVE cannot leave hidden RAW recording.
- R14: New run gets new UUID, old events preserved and selectable; no cross-run contamination.
- R15: Export RAW & SECURE before Stop and after Stop using same snapshot boundary; no mutation of ledger.

### C. Real Chrome boot, service-worker life and crash-adjacent behavior (MUST REPEAT)
- R16: Cold Chrome boot, click before opening Shelf; recorder captures delivered native click and saves.
- R17: Warm boot/Shelf close-reopen 20 cycles; 0 lost config, 0 duplicate listeners, 0 false successes.
- R18: MV3 idle suspension → natural worker wake; session and sequence resume honestly.
- R19: Kill/terminate service worker **only in disposable test profile** just after admission, mid-batch, during write, during Stop, during export; recover from pending reservations without overwrite or replay of provider write.
- R20: Chrome **restart** while ACTIVE, after Stop, after ZIP snapshot, during remote source fetch, after provider write/before receipt; verify both recorder and remote truth independently.
- R21: Extension Reload/update with same ID + storage; Old run survives version upgrade; no login/destination loss; no destructive migrations.
- R22: Entire Shelf boot exception and second-window render failure; right-click still works, recorder becomes inspectable on a healthy trusted surface if one exists.
- R23: Startup/core-import failure with recorder unavailable; no pretend crash reason or assurance about failed worker; exact external Chrome Errors collection steps documented.
- R24: If Chrome extension becomes unavailable until Reload, capture what is available externally **before Reload**; mark internal timeline incomplete, avoid claiming it caught the crash cause.
- R25: Repeat R16–R24 under OFF/ON with measured startup and Chrome responsiveness; unexpected stale generations and error-state divergence fail the gate.

### D. Data integrity, writer concurrency and quotas
- R26: Delayed storage write exceeds diagnostic warning threshold then succeeds; lock remains owned until actual settle; later state cannot race ahead.
- R27: Late reject, abort, transaction conflict, quota error, permission denial, DB blocked/versionchange, read-only period and disk pressure: older segments remain readable, run incomplete/warnings truthful.
- R28: 100 healthy events produce coalesced health updates, not 100 redundant writes; no logging-of-logging storm.
- R29: Fast multi-context producers and serial append have unique event IDs, total ordering and durable high-water; no duplicate/reordered/colliding sequences.
- R30: Restart between reserving sequence and commit: pending durable reservation recovered as verified committed or explicit gap, never silently reused.
- R31: Corrupt segment hash, missing pending journal and archive identity mismatch fail closed without wiping archive or manufacturing a fresh run.
- R32: Writer queue saturates: no unbounded RAM, no blocked save; drop/gap count explicit lower bound; STOP cannot claim complete.
- R33: 100,000 synthetic events with real disk-backed browser IDB; oldest and newest hashes and snapshots present; memory bounded; valid complete segmented export when storage is sufficient.
- R34: Large individual event rejects wholly with error/gap, never silently truncates a sensitive payload into malformed JSON.

### E. ZIP export, security and fidelity
- R35: RAW retains literal observed page URL and source URL, source-versus-CDN distinction, original error and exact observed final destination when capture was consented; truly missing fields remain not_observed.
- R36: SECURE contains none of seeded signed tokens, query/fragment, account/bucket names, paths, filenames, free-form messages or stack sentinels, even in metadata/manifests.
- R37: Deliberately simulate old ReDown “SECURE filename containing RAW” defect: validator must reject ZIP mode/content mismatch.
- R38: RAW cancel does nothing and does not delete data; same underlying snapshot/attempt IDs in both outputs.
- R39: Streaming/multipart >100k ZIPs preserve all committed entries with part chain/hash/manifest; no hidden export last-100/4k limit.
- R40: Export during append, concurrent Stop, worker restart, revoked File System Access permission, user cancel and low quota; fail without corrupting recorded run or falsely claiming OS download complete.
- R41: ZIP exports make **zero provider requests, zero remote writes, zero unexpected worker wake/provision, zero configuration mutations**.
- R42: Export with no prior run/corrupt run returns accurate unavailable/incomplete status and never fabricates fake events.

### F. Real saves / cross-product measurement
- R43: Fixture and independent actual R2 test-prefix runs compare source bytes/key/target and unique verified attempt with logger OFF and ON.
- R44: Source/asset errors, 403/429/5xx, Cloudflare auth expiry/reconsent, unsupported URLs, wrong account/bucket, partial transfers and lost replies have correct blocked/failed/uncertain categories without replay.
- R45: At least 2,000 physical saves distributed Simple/Narrow/Depth/mixed, interleaved with repeated Chrome restarts and controlled crash scenarios in a disposable environment; every claimed success independently verified. Recording is not allowed to change observed business outcomes.
- R46: Match exported ReDown SECURE sample to Click2Cloud schema where present; missing fields mark noncomparable; one ZIP duplicated twice is not two independent incidents.
- R47: Recorder CPU/heap/Chrome Task Manager RSS, storage write frequency, queue/backlog and input-to-first-paint/click-to-save latency measured OFF vs ON at 100, 1k, 10k, 50k and 100k events.
- R48: Full right-click pipeline still saves when recorder is stopped, quota exhausted, corrupt, or disabled.
- R49: Explicit known Windows failures (stale workings SHA and local Worker fileAction uncertain) are retained as baseline issues, diagnosed independently, not disguised as recorder success/failure.
- R50: Installed owner Windows Chrome/real R2 acceptance, build SHA, extension ID, 100k archival/export demonstration, and post-reload continuity documented **separately** from Node/Linux mock tests.

Add tests for timezone jumps, multi-profile separation, browser incognito restrictions if applicable, storage quota estimates unavailable, pure keyboard interaction, Chrome accessibility, concurrent RAW/SECURE exports, very long URLs under bound, JSONL injection, ZIP slip/path handling, memory exhaustion, drop-counter accuracy and malicious untrusted runtime messages. Do not inflate PASS counts by duplicating same tests.

## 11. MANDATORY PERFORMANCE BUDGET / NONINTERFERENCE EVIDENCE

Before source changes, capture cold/warm boot, right-click-menu latency, 100/1000-click saves, Shelf startup, memory, storage writes and recorder-OFF diagnostic activity. After changes repeat identically.

- Event emission itself should be tiny, non-blocking and best-effort. Define and empirically justify a concrete overhead budget; for example a **target** of p95 extra native-click scheduling overhead below 2 ms and negligible added lag when OFF, but do not mistake a target for measured evidence.
- Do not await archive writes on Chrome's critical native-click gesture, source capture, remote dispatch, token refresh, menu registration or Shelf boot. Do not add synchronization locks shared with CURRENT/registrar/storage setup.
- At 100k events demonstrate bounded JS heap and writer backlog using an actual disk-backed Chrome context; note CPU/RSS, disk consumption and browser version. The ReDown Linux stress fixture is precedent, not proof on this product or on the owner's Windows machine.
- A dead recorder must not create a feedback OS notification storm, block Debug settings, trigger a permanent load loop, or cause a background 1-minute polling loop to keep MV3 alive.
- Stop, export and Settings navigation should stay responsive with 100k events; use indexed cursors and bounded pages.
- Provide a *source-hash/route/menu-spec* noninterference matrix against Base 0.1 and direct native physical observations, distinguishing unverified boundaries.

## 12. REQUIRED DELIVERABLES & SIGNOFF

Produce exactly the artifacts needed to prove the owner-requested feature works, not a broad repository rewrite:

1. **Source-grounded ReDown lessons table:** original 4k/384 ring and actual dropped/late-write/health-write/ZIP privacy defects; which are reproduced by a failing regression fixture, which are adopted by design, and which remained unknown external Chrome symptoms.
2. **Before/after architecture map:** exact narrow hooks, single menu owner, no new permissions, no duplicated transport, retained old diagnostics/CURRENT. Document every changed production source file and its purpose.
3. **Settings screenshot/fixture:** Debug OFF → no recorder controls; Debug ON → editable 100k cap and Start; ACTIVE → Stop and stats; STOPPED → both ZIP exports; keyboard/ARIA and compact widths.
4. **Schemas and archive description:** run/event/attempt JSON schemas, immutable segment/hash manifest, gap semantics, consent/privacy model, stopped-vs-active persistence and upgrade policy.
5. **Complete export samples** with synthetic data only: RAW and SECURE ZIP, decoded manifest and byte-by-byte secret-leak test; live customer RAW evidence must never enter GitHub.
6. **Reusable comparison schema/report:** explicit observed denominators, ReDown-vs-Click2Cloud stage mapping, valid/invalid comparisons, verified save success frequency, p50/p95/p99 and repeatable manual testing instructions.
7. **Tests and logs** showing at least one failing pre-change reproduction of applicable integration absence/defects, focused tests after changes, synthetic 100k real disk-backed browser archive, restart/crash/quota/late-write scenarios, and preserved baseline regressions.
8. **Actual installed-Chrome report** on Windows, where available, showing loaded extension identity/version, genuine native-menu clicks, genuine provider verification and user-visible ZIP files. If unavailable, label BLOCKED; simulated/mocked Chrome APIs cannot be called installed Chrome proof.
9. **Safety and privacy review:** no additional permissions/secret collection, no cloud calls from exporter, no accidental export of sensitive RAW in SECURE, no logging while Debug hidden and consent absent, no old data reset, no automatic telemetry.
10. **Final verdict:** PASS / FAIL / BLOCKED / NOT RUN for every criterion; remaining gaps, source and build commit, tested Chrome/OS, exact instructions to reproduce and safe rollback to the frozen milestone.

**DO NOT**:
- change ReDown code;
- make feature changes merely by reading this Codex request;
- overwrite the Base 0.1 tag or push a release;
- reset OAuth, CURRENT, backups, menus, user history or remote objects;
- “fix” two existing unrelated test failures by silencing tests;
- redesign the main Shelf, Cloudflare provisioning, depth/Flat/Narrow behavior or save engine;
- store user RAW ZIPs in a public Git repository;
- call 100k synthetic events proof of installed-Windows crash resilience;
- claim Chrome's external process-crash root cause has been established;
- use a successful ZIP filename as proof its internal data is actually SECURE.

**Decision gate:** When future Codex finishes, leave the implementation in its review branch, do not load it into the owner's functioning Chrome profile or merge it without explicit approval. The owner can then decide whether to build, reload, test and promote it. Until that approval, the preserved Base 0.1 remains the current working product.

---

### Light Codex invocation for later (not an execution trigger)

> Read codex/11.13.2026-0355/P1_INDEPENDENT_RIGHT_CLICK_RECORDER_100K_RAW_SECURE_REDOWN_LESSONS_CODEX_REQUEST.md and carry out its scoped recorder implementation on a separate review branch. Preserve milestone/a-sure-winner-base-0.1 and the current Chrome profile. First audit the ReDown incident evidence and Click2Cloud native owner; implement only with evidence-backed noninterference tests. Deliver RAW/SECURE ZIP privacy checks, 100k disk-backed stress, boot/crash/restart proofs, and an honest installed/live test matrix. Do not merge, publish or touch ReDown without explicit owner authorization.
