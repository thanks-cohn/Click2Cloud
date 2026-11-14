# CODEX IMPLEMENTATION REQUEST V2 — Click2Cloud's nonblocking, two-tier, multicloud-ready Right-Click Diagnostics

**Owner design finalized:** 2026-11-14 (America/Chicago)  
**Classification:** P1 scoped diagnostic feature, with **P0 noninterference and privacy release gates**.  
**Repository:** thanks-cohn/Click2Cloud  
**Execution status:** REQUEST ONLY. **This documentation commit is NOT approval to change application code right now.** A future explicit Codex invocation authorizes implementation on a NEW review branch, not on the current working installation.  
**Protected milestone:** milestone/a-sure-winner-base-0.1 at 0d50ab82c10555ae49d617b90be588057a1fa6b6. Preserve the live Chrome extension ID, CURRENT, destinations, provider credentials, native menus, owner data and cloud resources.  
**Authority:** This V2 request **supersedes conflicting design details** of codex/11.13.2026-0355/P1_INDEPENDENT_RIGHT_CLICK_RECORDER_100K_RAW_SECURE_REDOWN_LESSONS_CODEX_REQUEST.md, specifically its single-tier Start/Stop assumption, 4,000 limits, record retention and missing-field treatment. Retain its ReDown research, fault matrix, architecture constraints and remaining nonconflicting acceptance gates. Do not independently implement both different specifications.

## 0 — OWNER'S EXPECTED PRODUCT (READ BEFORE TOUCHING SOURCE)

**One universal right-click observability system, two completely different recording depths:**

**TIER A — BASIC DIAGNOSTICS (ON BY DEFAULT, CONTINUOUS):** For every *delivered Click2Cloud save attempt*, keep one compact, continuously updated record of what was saved, from which site/source (privacy-safe default), to which provider/mode, whether it was actually verified, and **how fast**. Include source-fetch timing, click-to-save end-to-end time, upload/writing time and speed, known provider request latency, verification timing and basic error reason. Every unavailable field must display **N/A**, not disappear. The data feeds meaningful success/failure percentages, recent history and comparisons with ReDown and future products/models.

The BASIC store retains the **newest 4,000 attempt records by default**. This is a **ROLLING capacity**: after 4,000 rows, inserting row 4,001 evicts the oldest, and capture continues forever while storage works. In Settings → Debug, an **editable numeric input** can set the capacity to 10,000, 100,000, or another valid positive safe-integer value within actual device/quota feasibility. The setting persists across Chrome boots/restarts. There is **no fixed hidden 4,000-event cap**. Do not confuse 4,000 basic attempts with 4,000 fine-grained events.

**TIER B — EXPANSIVE FORENSIC FIELDS (OFF BY DEFAULT, EXPLICIT START/STOP):** A separate **Start Expansive Forensic Recording** button toggles to **Stop Expansive Forensic Recording** and captures a deep ReDown-like per-click, per-stage timeline: all permitted directly observed URL/source/target/error/proof/worker/restart/write evidence, detailed timestamps, provider actions, network metadata, packet/chunk timings where actually observed, measured upload throughput, diagnostic storage throughput, and evidence-quality notes. A user can stop the large recorder at ANY time and BASIC stays on. Default detailed event limit per run: **4,000**; independently editable open number field, or an explicit **Unlimited** choice (no application event cap, subject to bounded memory, quota and runtime safety). Unlike BASIC, never silently overwrite the beginning of an expansive incident: finite expansive run **stops admitting new detailed events** on reaching its cap, preserving the capture with an explicit LIMIT_REACHED status. For Unlimited, preserve until stopped or physical storage/resource safety forces honest incompleteness.

Both tiers share the same safe **attemptId correlation**, but **NOT** shared storage ownership, an always-on heavyweight collector, upload authority, menus, storage locks or a UI dependency. Both can export complete consistent locally recorded evidence as **RAW ZIP / SECURE ZIP** with clear snapshot and coverage metadata. Expansive RAW requires explicit consent and a warning because legitimately observed source/page URLs and error strings may be private or signed.

**Non-negotiable:** Logging may fail, become slow, fill up, hit quota, crash or be disabled; **right-click saving MUST still work**. Multiple rapid clicks should be recorded independently whenever Chrome actually delivers them and recorder storage can accept them. Never serialize the save operation behind recorder IO. An overloaded recorder cannot stall cloud saving, Chrome native menus, startup or the Shelf.

**This is for Cloudflare NOW, other supported providers LATER.** Implement a universal provider-neutral observation contract now, with Cloudflare's existing real path plus mock future Google Drive / OneDrive / Dropbox / fifth-provider adapters in tests only. Do NOT add production cloud providers under this task.

## 1 — SPECIFICATION PRIORITY & NON-INTERFERENCE

- Preserve the owner's working Base 0.1 implementation and the current native Chrome context menu behavior, including Simple/Narrow/Depth routing, Save/Trash, menu generation durability, shelf-less right-click saving, OAuth and fallbacks.
- Future Codex must first verify exact working branch, latest approved SHA, clean/dirty status, baseline command outputs and known historical failures. Do not reinterpret source-only results as installed Chrome evidence.
- Create a NEW scoped feature branch from the current owner-approved implementation. Do not modify the milestone tag, overwrite uncommitted artifacts, uninstall extension, change OAuth redirect/extension ID, reset a Chrome profile, delete CURRENT or database, clear storage, mutate cloud resources without an explicitly authorized disposable test prefix, deploy workers, publish an extension, or merge without approval.
- Audit / cite the existing actual sources before edits: extension/background.mjs, src/chrome/registrar.mjs, src/core/engine.mjs, src/core/boundary-observation.mjs, src/glaciaring/index.mjs, src/chrome/debug-preference.mjs, extension/app.mjs / app.css, src/chrome/trusted-sender.mjs, src/api/service.mjs, src/modes/depth/native-click.mjs, src/cloudflare/transport.mjs, src/persistence/current-store.mjs, build/manifest tests. Source paths are starting hints, not permission to refactor.
- The existing registrar's **ONE Chrome contextMenus.onClicked listener** remains the sole entry; no second listener, no service worker duplication, no browser-wide click interception, no content-script surveillance and no recorder-owned route/authorization decision.
- Adopt narrow, synchronous, no-throw typed observer hooks and an independent best-effort async writer. If registering the recorder itself fails, the native click listener must still register and right-click saving must still function.
- No recorder-owned provider HTTP request, auth refresh, probe, retry, R2 verification request, source fetch, byte-read, remote folder enumeration, or transfer re-enqueue. It records only normal existing observations and legitimate receipts.
- No new permissions, third-party analytics, server telemetry, data sharing, automatic RAW export, native executable, external listener, weak CSP, secrets collection, or new provider implementation.
- Preserve ReDown's actual unresolved browser disappearance as **ROOT CAUSE UNKNOWN**. Do not claim diagnostic code was conclusively responsible or that this V2 guarantees crash-proof Chrome.

## 2 — FIELD CONTRACT: BASIC ALWAYS CAPTURES WHAT IT CAN, NEVER SILENTLY OMITS

Every basic row has stable, required **schema slots**, even when some instrumentation cannot observe them. The **visible value is N/A** in Settings, exports and reports, and the machine-readable export MUST contain an explicit key plus a machine-classifiable availability reason. Do **not** silently skip unknown fields, fabricate a value, infer milliseconds from timestamps in different worker epochs, substitute zero for N/A, or abort the entire record merely because one field is missing.

**Compact BASIC schema:** The underlying on-disk representation may use tight typed columns + versioned schema; these conceptual fields must survive read/export.

| Domain | Required field | Data and fallback |
| --- | --- | --- |
| Correlation | attemptId, schemaVersion | Unique typed ID; **mandatory on delivered save click** |
| Time | clickTimestampUtc | ISO timestamp if the observer received a native click; otherwise N/A with reason |
| Device/build comparison | appId, appVersion/build, workerEpoch | Stable provenance when available; no hidden device fingerprint |
| Source context | pageOrigin / websiteHost | Parsed safe hostname/origin only; **N/A** for unavailable or unsafe |
| Source context | sourceOrigin / sourceHost | Asset/CDN source distinguished from hosting site; **N/A** if no valid source |
| Source reference | sourceUrlSanitized | Optional safe sanitized form only (never signed/private query/fragment/userinfo/path identifiers); otherwise N/A |
| Routing | providerId | cloudflare now; normalized future providers; unknown remains explicit |
| Routing | mode and context | simple / narrow / depth / other; image / link / page / video / audio / other |
| Outcome | state and standardized reasonCode | pending / verified / failed / blocked / cancelled / uncertain / interrupted / N/A; error code N/A if no error observed |
| Provenance | proofLevel, evidenceClass | Independently verified vs provider-accepted vs fixture-only vs N/A |
| Volume | bytesObserved, bytesVerified | Only numbers actually known; N/A if unknown; zero only when proven zero |
| Timing | clickToDispatchMs | Native delivered click to existing dispatch-entry boundary |
| Timing | sourceAcquireMs | Existing source acquisition start → end |
| Timing | sourceReadThroughputBytesPerSecond | Actual source bytes divided by measured source acquisition duration |
| Timing | providerRequestLatencyMs | Existing provider request start → response/ack, **not invented network RTT** |
| Timing | uploadElapsedMs | Existing upload-stage boundary start → end |
| Timing | uploadThroughputBytesPerSecond | Observed upload bytes / upload duration, if both known |
| Timing | verificationElapsedMs | Existing actual verification start → proof completion |
| Timing | clickToVerifiedMs | Delivered click → **independently verified** remote save; N/A if no proof |
| Timing | endToEndEffectiveBytesPerSecond | Verified bytes / click-to-verified seconds |
| Data quality | outcomeCompleteness, missingFields, dataLossFlag | Explicit gaps, unknowns, lost service worker window and availability reasons |

**N/A rule (P0):** Default UI/CSV/summary must literally display **N/A** for missing measurements. Versioned JSON/JSONL must retain canonical keys: either use an explicit "N/A" sentinel or typed value=null **plus an availability map** stating N/A and a reason such as not_observed / not_applicable / unavailable / unsupported / interrupted / redacted / invalid_measurement. Schema must be stable across rows. No returning just an empty object or deleting metric keys. Choose compact on-disk encoding; materialize N/A at read/export to avoid repeated huge strings per event. Missing optional values never prevent capture of the other available values or cause full-row rejection.

**Truth rules:**
- Click delivered by Chrome is the first provable native click timestamp. Do not claim to measure the time the user opened the context menu before the extension received the click.
- If the source is an image CDN different from the hosting website, preserve this distinction; N/A for source if not present. Browser-restricted URLs and absent tab/page information cannot be guessed.
- No raw URL, credential, userinfo, query string, signed preview link, filename, private account/folder name or original error string in default BASIC. Hostname/origin may itself be sensitive; offer privacy-safe SECURE projection with privacy review and optional host redaction.
- BASIC recording does NOT require Debug Mode ON. Debug controls only *manage and display* basic history. A missing Shelf or crashed/closed settings page does not stop the best-effort native observation path.
- One BASIC row per delivered save attempt. Create the smallest possible pending checkpoint and update the SAME attempt row as authoritative evidence arrives; do NOT generate an ordinary history row for each of its ten or twenty stage transitions.
- Overlapping/multi-tab clicks have distinct attempt IDs, separate pending/final outcomes and no last-click global variable. Duplicate provider callbacks must not double-count completion.
- Don't mistake provider accepted/upload completed, History row, or success toast for independent verified save. When proof is absent, preserve the attempt as uncertain/N/A, never fake a success.
- Basic fields are available for comparison with ReDown and any later model/app via versioned schema and explicit proof levels.

## 3 — PRECISE PERFORMANCE / SPEED / LATENCY SEMANTICS

Record **basic speed and timing** continuously, not only when expansive recording is ON. Measure by existing source/transport/proof callbacks; do not make extra network calls to improve a metric.

| Reported measurement | Definition | Validity |
| --- | --- | --- |
| Click-to-dispatch latency | t(dispatch entered) - t(delivered native click) | ms; same clock epoch |
| Source-read latency | t(source completed) - t(source began) | ms; don't equate to network RTT |
| Source-read throughput | measured source bytes / source-read elapsed seconds | bytes/s and MiB/s; N/A if missing |
| Provider response latency | t(first real response/ack) - t(request send) | ms; label request-level, **not RTT** |
| Upload/remote-writing time | t(upload stage complete) - t(upload stage start) | ms; single or multipart scope explicitly shown |
| Upload/remote-writing speed | bytes actually transferred / measured upload-stage seconds | bytes/s and MiB/s; not claimed R2 disk write speed |
| Verification latency | t(verification result) - t(verification began) | ms; proof level explicit |
| Click-to-save time | t(independently verified final receipt) - t(delivered native click) | ms; N/A unless verified |
| End-to-end effective transfer speed | independently verified bytes / click-to-verified seconds | bytes/s; includes source, auth, queue, upload and verification |
| Recorder write speed | local diagnostic archive bytes committed / local IndexedDB write interval | bytes/s; diagnostic health only, NOT cloud upload speed |
| Verified success percentage | unique verified eligible native save attempts / eligible observed attempts in a defined, sufficiently complete window | separate failed, blocked, cancelled, uncertain and still pending |
| Resolved-only success percentage | verified / conclusively resolved eligible outcomes | display both denominators and coverage; no “lifetime” claim from a rolling window |

**No fake precision:** Use performance.now() inside the same worker/page clock epoch. Across worker restart, monotonic clocks reset; mark multi-epoch durations N/A/uncertain unless independently trustworthy wall-clock bounds exist. If source duration is known but source byte count is not, duration remains recorded while speed is N/A. If an operation completed on remote storage but the response was lost, status is uncertain until independent proof is legitimately obtained; never auto-retry for diagnostics. Percentiles (p50, p95, p99) carry sample sizes and measurement scope; do not mix bytes/s across files of completely different sizes without displaying distributions.

**Comparisons:** ReDown, Click2Cloud and future providers/models use comparable field names/units, app/build ID, provider, mode, context, sample counts, known test conditions (hardware/browser/OS/network/file size when available and permitted), proof level and data completeness. Show per-provider/per-mode stats and label noncomparable cases. Aggregate rates must not silently combine provider acceptance with independent verification.

## 4 — TWO INDEPENDENT DATA STORES & RETENTION CONTRACTS

### BASIC — rolling history, default 4,000

- A separately versioned local archive retains the **newest N attempt rows**; N is a saved integer chosen in Settings → Debug via an open numeric input, default **4000** (accept 10000, 100000, etc., as device/quota permits; validate safe integer and realistic capacity without inventing a Chrome-fixed cap).
- When record N+1 is admitted, remove **only the oldest eligible completed/archived row**, preserving outstanding attempt state until outcome reconciliation or explicitly marking it incomplete. A bounded pending ledger must not allow an unlimited pending buildup; its pressure is surfaced rather than silently losing failures.
- Keep durable configuration and high-water accounting independent of the main CURRENT setting. Do not mutate nativeRegistration or user destinations. The rolling capacity is not a lifetime save counter. Expose earliest and latest retained date, number of evicted basic records, known gaps, and the denominator actually used for percentages.
- Changing 4000 → 10000 preserves the existing 4000 and retains subsequent rows until 10000; evicted data cannot be reconstructed. Changing 10000 → 4000 warns before deleting older 6000 and must never erase full forensic archives or provider History.
- Use **bounded batched/coalesced writes**, low write amplification and read pagination. Even basic mode continuously needs a small amount of persistence; don't promise “zero writes.” Persist minimal startup/pending checkpoint and authoritative final result with durable truth or disclose missing last-commit risk.
- Basic runs normally at all times, including Debug OFF, full recorder OFF, after Stop, after quota recovery, during Shelf failure, Chrome startup and independent normal service-worker wakes. Do not install a keepalive loop merely to collect events.
- If storage fails, recorder must remain **best effort**: retain a bounded memory suffix when possible, retry later with conservative backoff when appropriate (without making duplicate rows), mark unknown/dropped ranges and continue to accept newly delivered observations **whenever resource safety allows**. Never block saves, infinite-loop retries, or falsely claim completeness after a hard crash. A rolling capacity can operate indefinitely over time, but browser-managed disk is finite and Chrome may not deliver events while disabled.

### EXPANSIVE — separate opt-in deep-forensic archive

- Starts only after deliberate Debug-panel user action + consent; Debug OFF does not turn on rich capture.
- Default limit **4,000 fine-grained events per recording session**, editable to any positive safe integer subject to browser feasibility, plus an explicit **Unlimited** mode. A finite detailed capture records through N and then **stops**, retaining the beginning; it does NOT roll away the early incident as basic history does.
- A run is identified by a durable runId, consent/privacy level, timestamps, start/stop state and clear committed/admitted/pending/dropped/gap counters. Separate index lets the user select any earlier stored run for export, without auto-deleting previous archives when a new run starts.
- Use append-only immutable segmented IndexedDB batches, bounded queue/memory, durable pending reservations, sequence monotonicity across restarts, integrity hashes and an explicit gap ledger where possible. No misleading “capless means infinite hardware.” Browser quota, crash, hard kill, corruption, OS eviction and missing commit acknowledgments are real limits; preserve older confirmed segments and report incomplete.
- Stop is ALWAYS accessible and immediately ends new rich-event admission; it never stops BASIC or cloud saving. Already admitted writes may complete. If a write remains pending after Stop, show it as pending/unconfirmed, not complete.
- Changing Debug OFF while expansive recording is active must require a safe Stop/confirm workflow; no hidden unconsented RAW collection. Existing historical forensics remain archived.
- Export while ACTIVE makes a stable committed high-water snapshot and states that later events are excluded. Export after STOP, after Chrome restart and after reopen continues to work even if current capture is disabled.
- RAW captures legitimately observed exact page/source/final URLs, destination fields, error texts and selected metadata ONLY after explicit opt-in. Never intentionally collect password, token, cookie, Authorization header, full body/file content or unrelated browsing data. SECURE is independently whitelisted and secret-leak tested.
- The full recorder must not require the basic store to be writable, and failure of the expansive database must not erase the basic ring. Their correlation uses typed stable attempt IDs, not shared transactions.

## 5 — EXPANSIVE REPLAY OF REDOWN'S FIELDS WITHOUT REPEATING ITS DEFECTS

The rich collector includes BASIC information plus every legitimately observable ReDown-style *field family*:
1. Native delivered click, menu ID/action, provenance, mode, generation, route intent, resolved target and destination identity (RAW where consented).
2. Source pageUrl, srcUrl, linkUrl, actual sourceUrl, final URL/redirect chain, source-site versus CDN, filename/media type and observed size (RAW only for sensitive literal values).
3. Provider-specific account/connection/bucket/prefix/key/folder/file/drive identities, provider operation/job ID, HTTP request/response classification, upload session or chunk offsets and byte totals where observable.
4. Stage and event names: CLICK_RECEIVED, ROUTE_RESOLVED, AUTH_CHECKED, ADMITTED, SOURCE_REQUEST, PROVIDER_WRITE, REMOTE_VERIFY, HISTORY_COMMIT, COUNTER_COMMIT, TERMINAL and provider-namespaced stages; do not invent unsupported stages to fill the chart.
5. Outcome, reason code, original observed exception name/message/stack (RAW only where explicitly consented and allowed), selected HTTP status and non-secret response headers, retry/resume/worker restart/unknown state.
6. Verification evidence and its scope, independent receipt/reference, byte counts, provider proof revision/etag/hash **where genuinely observed**; distinguish provider accepted from independently verified.
7. All observed source-fetch/upload/write/verification latency and throughput metrics, stage durations, end-to-end click-to-verified and interstage waiting, plus local recorder writer diagnostics.
8. Per-epoch boot/runtime health, worker import/ready when observable, browser restart/update classification, diagnostics queue depth/write latency/lock waits, storage/quota failures, dropped/unconfirmed events, hash integrity and missing segments.
9. Unknown or unsupported fields remain present as N/A, with reason/status and provenance; no fabricated source URL, redirect URL, stopwatch estimate, remote success, crash reason or OS disk speed.

**Use ReDown's *newer durable archive design principles*, not its old automatic large forensic recorder.** Source-ground in REDOWN:
- extension/runtime-diagnostics.js (compact attempts with 100-window/24 events/20 observations, 256 runtime/24h; this is NOT a copyable 4,000-basic default);
- extension/save-evidence.js (typed allowed reason codes and safe source/provider classifications);
- extension/forensic-diagnostics.js (older automatic detailed ledger, 4,000 records / 4 MiB / 7d);
- extension/flight-recorder.js and extension/capless-archive.js (opt-in capless segmented archive, small early epoch breadcrumbs, bounded memory);
- extension/forensic-download.js, extension/capless-controls.js, extension/diagnostic-bundle.js, tests/flight-recorder-storage.test.mjs, tests/capless-archive.test.mjs;
- docs/P0_CRASH_CAPLESS_REPORT_2026-11-12.md and docs/P0_CRASH_CAPLESS_REVIEW_2026-11-12.md.

**Recorded ReDown mistakes to regression-test explicitly:**
- 35,417 attempted forensic events with only 4,000 retained (31,417 dropped/pruned); tests must prove basic N-row rolling behavior is intentional/visible and the expansive N-event capture cannot silently prune the incident start.
- 384 retained startup trace entries and ≥895 earlier dropped, plus unconfirmed/failed writes: completeness, old/new epochs and missing ranges must be explicit. No “we recorded everything” claim when Chrome or recorder was unavailable.
- A timed-out storage write could later succeed, but serialization was released too early. A latency deadline is **NOT** a write cancellation. Keep writer ownership until actual settle; no Promise.race stale write race.
- Repeated unchanged health writes (100 healthy events → 100 health writes) created amplification; coalesce or deduplicate and avoid diagnostics recursively logging each other.
- One “SECURE”-named ZIP internally carried RAW evidence; validate *decompressed entries* and manifests, not merely filename.
- The extension became inaccessible until Reload; **root cause still unresolved**, do not claim recorder is confirmed cause or any design can guarantee against Chrome-level crashes.
- ReDown 100k synthetic success in Linux Chromium fixture is feasibility evidence, NOT owner-installed Windows proof, not real Cloudflare save proof, and not a guarantee of zero stalls.

## 6 — PROVIDER-NEUTRAL ARCHITECTURE AND CONCURRENCY

~~~text
ONE existing native menu listener and Click2Cloud save engine
                         |
            safe typed observational seam
                         |
              correlate attemptId
                 /           \
      BASIC one-row record    EXPANSIVE per-stage events
      continuous by default   opt-in ONLY
         rolling N               append-only run
            |                         |
       own bounded queue         own bounded queue
       own local database        own local database
            |                         |
       basic summaries      rich timeline + forensic ZIPs
                 \           /
          read-only comparison / exports
~~~

- These are **observers**, not control-plane participants. No second native onClicked listener, new always-on worker, independent transfer engine, server, shared mutex, per-event huge chrome.storage.local writes, synchronous ZIP compression on click, or cloud API calls by diagnostics.
- Per-click observer invocation must be tiny, synchronous, try/catch protected and free of awaiting IndexedDB/Chrome storage/network. The actual save is dispatched immediately along its original path whether recorder DB is slow/broken or not. Debug Settings remains optional and cannot gate native saving.
- Support genuine **overlapping concurrent clicks** across sources/tabs/destinations/providers: distinct attempt ID, start time, row, stage group, operation ID/proof links, no global “current click,” no confusion from out-of-order provider completions.
- Do not serialize **saves** behind the recorder queue. The recorder may serialize its own append transactions; bounded independent queues/batches may reorder arrival at commit, but persisted sequence, causal IDs and original observation timestamps must reconstruct a truthful order without overwriting or coalescing distinct clicks.
- Every delivered click is eligible for a basic attempt row; if it cannot be durably stored owing to actual Chrome/storage limitations, preserve truthful gap/loss metadata and continue best-effort accepting later clicks. “Keep recording” means do not voluntarily stop collection because one field or event failed, **not** pretend that a hard-killed Chrome worker recorded events it never received.
- A field absent for one click never blocks its other fields, row, following clicks, or the save. Unknown provider action/metadata yields N/A in defined slots, not a recorder crash.
- Use backpressure **within the recorder**, never the save path. On sustained overload, employ bounded memory and explicit drop/gap counters rather than OOM or freeze. A policy may prioritize compact outcome and missing-data markers over verbose diagnostic sub-events. **Never silently drop distinct basic delivered attempts** or silently change user cap: report any unavoidable loss; quantify via lower bounds.
- On worker restart: durable run/control identity, small epoch head, pending queue recovery, completed sequence/digest validation, explicit previous-epoch-UNKNOWN and proof reconciliation **without re-uploading**. If export, writer and Stop race, snapshot must be consistent and non-mutating.
- Full archive can use independent batched commit and streamed ZIP output; never call zipSync on one huge 100k-event in-memory collection. Do not hold UI thread while compressing 100k records.
- Future Google Drive, OneDrive, Dropbox and arbitrary provider: add only a small adapter translating *already observed* provider-specific events and proof strengths into the shared envelope. No change to BASIC DB, full DB, event cap, UI or exporter is needed. Validate with mock adapters, not false live claims.

## 7 — UI: BASIC ROLLING CONTROL + EXPANSIVE START/STOP

Inside existing Settings → Debug, only visible after Debug Mode ON:
- **Basic Diagnostics — Always On**. The automatic collector exists even when Debug OFF. Display current 4,000-record (editable) rolling capacity, actual retained count, evicted/gap counts, date window, success/failure/blocked/uncertain counts, verified percentage with numerator/denominator, and mean/p50/p95 total save time and upload rate with sample sizes. Present recorded N/A for absent metrics, never blank dashboard holes.
- **Retain newest [ 4000 ] basic save attempts**. A normal editable numeric input, positive integers only; save value persistently. Changing to 10,000 grows the retention window from now; capacity is **not** number of events to capture before recording stops. Shrink may evict old records, with transparent confirmation.
- **Expansive Forensic Fields — Off**. Input **Maximum rich events [ 4000 ]**; optional **Unlimited** check; **Start Expansive Forensic Recording** button. After start: **Stop Expansive Forensic Recording** button, active badge, run ID, committed/dropped/unconfirmed count, capacity/size, provider and source latency histograms only if cheap. Display no fake green “complete.”
- Export **RAW ZIP** and **SECURE ZIP** for chosen basic-window snapshot / expansive session snapshot. RAW privacy confirmation; SECURE sharing default. Available while full recording runs and after Stop. Show snapshot identity and if two exports refer to same boundary.
- Stop rich capture at any time; basic logging continues. Disabling Debug while rich capture is running must explicitly resolve/stop it before hiding controls. No permanently visible popups, toast storms, scrolling UI updates every millisecond, or keepalive timers.
- Accessible keyboard interaction, AT status, responsive layout, no dependency on Cloudflare connected state to inspect previously captured data.

## 8 — EXPORT / PRIVACY / DATA COMPLETENESS

- RAW ZIP and SECURE ZIP are **two projections of the exact same chosen committed snapshot** (run ID, high-water event/attempt sequence and selected capture window); do not collect new data merely to export or apply incompatible truncation. Include privacy mode in **manifest and content**, not just filename.
- Both exports include versioned MANIFEST.json, README, basic-attempts.jsonl/CSV with **fixed canonical columns including N/A**, enriched full-events JSONL for full runs, coverage/gaps/unconfirmed ledger, performance-summary.json with denominators and proof strength, integrity hashes/segment ordering, and recorder health. If an expansive run was not started, don't pretend its rich fields were captured: show N/A / not_recorded.
- RAW may include only **legitimately captured, explicitly consented** exact source/page/final URLs, selected destination/provider data and original errors. Never deliberately capture cookies, access/refresh tokens, Authorization headers, passwords, unrelated navigation history or file content; RAW remains locally stored, never auto-uploaded or put on public GitHub.
- SECURE uses a strict **allowlist**, not a shallow “remove URL strings” filter. Scrub signed links, userinfo, URLs/paths, filenames, accounts/bucket/folder IDs, original/free-form messages, arbitrary nested objects, secret-bearing headers, ZIP metadata and README examples. Stable locally keyed HMAC correlations can replace identifiers; key excluded from ZIP. Source/provider host category may remain only when privacy-review approved.
- Decompress both exports during tests and compare every entry including filename, manifest, JSONL, README and ZIP comments against seeded synthetic secret sentinels. A SECURE filename containing RAW data is a P0 failure.
- Stream or partition big archives (cursor + bounded memory, multipart manifest, deterministic part ordering/hashes). A generated local download is not asserted to be physically on Windows disk without verification. Cancel/low disk/revoked picker permissions must not delete original evidence or stall saves.
- N/A must be present in every exported basic canonical field when unavailable. Export code must not “clean up” incomplete rows into empty objects, or discard them from performance denominators without stating the exclusion.

## 9 — REQUIRED TEST MATRIX (SCOPE THESE BEFORE TOUCHING USER PROFILE)

Run existing trusted Click2Cloud suites first, do not hide baseline unrelated failures (previously stale extension/app.css workings fingerprint and a local Worker/R2 File API 'uncertain' outcome were observed). Capture exact version/branch/test evidence; if baseline has changed, record differences.

### BASIC continuous, field completeness and rolling cap
- B01: Debug OFF + user never opens Shelf: genuine delivered click creates basic attempt and actual save still verifies.
- B02: 4,000 unique attempts → 4,000 rows; attempt 4,001 evicts exactly oldest eligible row, no capture stop.
- B03: Change 4,000 → 10,000 without resetting archive; preserved historical rows remain and newest grow to 10,000. A previously overwritten row is NOT recreated.
- B04: Lower 10,000 → 4,000 with explicit warning; no user destinations or expansive runs erased.
- B05: Editable arbitrary positive safe integer including 100,000, validation for empty/0/-1/float/NaN/huge unsafe/quota unavailable; no secret fallback to 4,000.
- B06: A click with NO pageUrl, sourceUrl, bytes, provider response, proof or duration still has a row with N/A canonical fields + explicit reason; next click is unaffected.
- B07: Missing source speed only: known source latency remains; bad provider proof only affects verified outcome, not timestamps or source URL category.
- B08: Basic source/provider distinction on embedded CDN versus host, without copying signed/private URLs into default store or SECURE.
- B09: BASIC 1-row-per-attempt with pending→final update, duplicate callbacks exact-once, separate counts for verified/failed/blocked/uncertain/cancelled.
- B10: Success percentages show numerator, denominator, time window, sample count, missing/gap coverage, and correct zero-sample N/A (never NaN or unjustified 100%).
- B11: BASIC latest 4,000 rows remains efficient on low-end memory and disk; no unbounded list rendering.
- B12: Basic captures while full recorder stops, fails, is disabled, has exceeded quota, or exports; disclose any storage loss.

### Timing, throughput and fair cross-model comparison
- P01: Known source acquisition bytes + timestamps yield correct ms, bytes/s, MiB/s, and click-to-verified.
- P02: Source bytes N/A but source latency measured → source speed N/A; don't suppress rest of row.
- P03: Provider response latency is labeled request-to-response, not network RTT; if only upload duration exists, RTT N/A.
- P04: R2 physical disk-writing throughput N/A unless measured by a genuine authorized provider signal; do not mislabel HTTP transfer speed.
- P05: Zero-byte verified transfer does not divide by zero; N/A when elapsed = 0/unobserved; known zero bytes remain numeric zero.
- P06: Cold vs warm, source-site/CDN, Simple/Narrow/Depth, provider, file-size buckets: per-group p50/p95/p99 show sample counts, units and proof levels.
- P07: Worker epoch change mid-attempt doesn't subtract unrelated performance.now values; conservative N/A/uncertain.
- P08: Comparing ReDown/Click2Cloud/future model retains app/build/provider/OS/browser/known hardware and network context where available, and marks incomparable conditions.
- P09: Off/on paired benchmarks quantify recorder hook overhead, storage write frequency, JS heap and Chrome Task Manager RSS, with genuine native saves and simulated levels explicitly separated.
- P10: Upload vs source-read vs end-to-end speed vs local archive write speed never mixed in labels or computations.

### Expansive start/stop, event capture and burst behavior
- F01: Default full recording OFF; Basic ON. Debug switch ON reveals controls without beginning large capture.
- F02: Start → Stop label/status; 4,000 rich events admitted; then stops at cap, preserves earliest events, reports LIMIT_REACHED (not rolling).
- F03: Rich cap changed to 10,000 and 100,000; full archive captures both old and new events, contiguous sequence and no hidden 4,000/4 MiB/7d prune.
- F04: Unlimited mode runs until user Stop or safety limit; bounded queue, quota failure/incomplete truth; no false infinity promise.
- F05: Stop instantly prevents new rich-event admission, already queued events settle when possible, and BASIC never stops.
- F06: Browser reload while ACTIVE, after STOP and during export; run/archive/control restore without duplicated stages or re-upload.
- F07: Multiple Shelf windows Start/Stop races: one authoritative run, no silent RAW active after Debug OFF.
- F08: 20, 100 and 1,000 concurrent/rapid delivered clicks across tabs and providers: distinct IDs, no cross-talk, no missed *durably acceptable* records, out-of-order completion reconciled correctly.
- F09: One field's extraction throws; observer records other fields and N/A, later clicks still captured, save unaffected.
- F10: Synthetic provider adapter mock Google Drive/OneDrive/Dropbox/unknown uses same schema and archive/export and provider-neutral core.
- F11: Full-only request for exact RAW URL/error sees genuine observed values; if capture started after incident, old values N/A rather than fabricated.

### ReDown failure regression, crash & restart
- R01: 100 healthy events do not produce 100 redundant health writes; prevent write amplification/logging-the-logger loop.
- R02: A timed-out IndexedDB/storage write later SUCCEEDS; prior serialization owns it until actual settlement; later batch cannot overwrite or race.
- R03: Late REJECTED write and second queued write cause clear gap/unconfirmed, not a dropped promise or phantom success.
- R04: Storage quota exceeded, denied, blocked database, versionchange, corrupt journal, partial batch: recorder degrades and continues best effort; saves still work.
- R05: Worker idle→wake, Chrome normal boot, browser restart, extension Reload/update, killed worker **in disposable test profile**: no erased CURRENT/menu, no forgotten cap/consent, no duplicate upload or listener.
- R06: Kill worker just after click, during local batch, during provider write, after response before receipt, during Stop and ZIP export: reflect actual observation/UNKNOWN, do not invent browser crash or re-upload.
- R07: Broken recorder import or IDB open MUST NOT break context menu listener, right-click save, Shelf, credentials, or native menu repair; preferably fail open by lazy module isolation.
- R08: Under overload, queued rich events may create explicit gaps but **never block provider saves**; basic priority attempt outcome retained where feasible, otherwise honest loss lower bound.
- R09: ReDown old forensic 4,000/35,417 event loss and 384 startup cap are not silently repeated in expansive archive; basic 4,000 rolling behavior remains intentionally bounded.
- R10: Installed Chrome pre-/post-restart with recorder OFF, BASIC only, EXPANSIVE ON. Compare real latency and UI responsiveness; browser-level disappearance remains an independently investigated unknown if it recurs.

### Export and security
- E01: RAW/SECURE generated from identical basic snapshot and identical rich run snapshot; same ID/high-water, no mutations.
- E02: RAW contains actual approved observed fields; exact signed URLs are only allowed under informed RAW consent.
- E03: SECURE contains no planted token, private path, filename, email/account or original stack/error sentinel anywhere inside decompressed ZIP/manifest/README/comments; reject mislabelled ZIP.
- E04: Missing canonical fields show N/A in UI, CSV and JSON availability metadata; fixed schema across rows/providers.
- E05: Export 4k, 10k and 100k committed detailed events with streaming/multipart; earliest retained entry present, hashes valid, bounded memory, no giant zipSync buffer.
- E06: RAW cancelled, picker revoked, low quota, export while recording and export during Stop are truthful and don't destroy source archive.
- E07: ZIP build/download performs zero provider HTTP requests, remote writes, token refreshes, CURRENT/native menu mutations or unrequested background repairs.

### Physical and acceptance separation
- A01: At least 2,000 real provider verified saves distributed across Simple/Narrow/Depth/mixed for release acceptance (where owner environment permits); distinguish Codex mocks vs installed Windows Chrome and actual Cloudflare R2 readback.
- A02: 100,000 synthetic events through **real disk-backed browser IndexedDB**, plus measured bounded CPU/heap/RSS, plus separate owner Windows installed test when possible; test never claims the latter from Linux fixture.
- A03: Record exact before/after source SHA, browser/OS, extension ID, CPU/memory, startup timings, click-to-verified timings, provider writes and all known failures; no cherry-picked denominator.
- A04: No duplicate chrome.contextMenus.onClicked listener, cloud upload, History receipt or counter under instrumentation; single owner remains.
- A05: Recorder OFF, BASIC only, and FULL on all preserve shelf-less save and crash fallback, including worker/Chrome restarts.
- A06: Tests label PASS / FAIL / BLOCKED / NOT RUN, evidence class, precise commands and artifacts. Admin-blocked installed Chrome must remain BLOCKED, not “test passed.”

## 10 — IMPLEMENTATION PHASES FOR CODEX (DO NOT SHORT-CIRCUIT)

**Phase 0: discovery / baseline.** Read Click2Cloud source and ReDown documentation above, enumerate actual available event boundaries, map each BASIC/EXPANSIVE field to real source or N/A; record the local baseline 370/372 caveat only if still reproducible; identify unimplemented events instead of silently claiming instrumentation. Design tests before changing code.

**Phase 1: tiny provider-neutral observation seam.** Add no-throw typed observation callbacks to existing *single* registrar/engine where safe, preserving original dispatch semantics; prove native saving without recorder import/IDB. Introduce stable attempt ID correlation under concurrency, never leak untrusted source data.

**Phase 2: continuous BASIC rolling history.** Add the compact per-attempt record schema, default 4,000 rolling IndexedDB history and editable Settings field; compute true metrics from existing events; N/A for missing fields; bounded batches; percentage and per-mode/provider comparisons; test eviction/growth/restart/multiple-click overlap.

**Phase 3: opt-in EXPANSIVE archive.** Add separate Start/Stop, default 4,000 rich-event per-run cap + editable/unlimited, original ReDown-level observed field families, independent batched append-only storage, restart recovery, seq/gap/health integrity. Keep BASIC unaffected.

**Phase 4: RAW/SECURE export, comparison and privacy.** Same-snapshot reader for both tiers, streamed or multipart ZIP, consent, SECURE allowlist, N/A columns, ReDown/source-model comparison schema, seeded secret-leak tests.

**Phase 5: measured noninterference and owner acceptance.** Focused regression/stress/late-storage/crash tests, first with mocks then actual disk-backed Chromium; genuine installed Chrome and actual R2 only with the owner's available authorized environment. Preserve unresolved external failure states.

**Stop/rollback rule:** If native menu ownership, verified saves, Shelf, memory safety or privacy regress, **STOP** and report/block rather than weakening gate. Keep source branch reviewable; do not merge, deploy, edit user Chrome profile or reset storage without owner authorization. Safe rollback means return to tagged source/build, not deleting user profile/extension data.

## 11 — DELIVERABLES, EVIDENCE & SIGNOFF

Codex must deliver, on an isolated review branch:

1. Source-to-field observation matrix: exactly where each basic and expansive field originates, measured versus N/A, data-sensitive classification, unit and proof level.
2. Architecture and diff: no duplicate listener/worker/provider IO, two storage schemas and no shared critical locks. List every changed production file and new hook.
3. Screenshot/fixture of Settings → Debug: basic always ON with editable 4,000 rolling count; expansive Start → Stop, 4,000 default/open numeric input/unlimited, status and ZIP buttons. No other UI regression.
4. Typed v2 schema + tests showing **fixed field presence with N/A**, reason metadata, no inference, and source-vs-provider timing distinct.
5. Correct basic-window eviction evidence at 4,001 and 10,001, limit increases/decreases, current persisted limit and restart recovery.
6. Deep forensic run samples at 4,000/10,000/100,000 events: integrity digests, sequence/gap ledger, bounded resources and rich stage timelines, with secret-free synthetic data committed only.
7. Identically bounded RAW + SECURE ZIP examples, manifest/hash and decompressed seeded-sensitive-data tests.
8. Paired metrics on identical workloads: click→dispatch, source latency/read throughput, provider request latency (or N/A), upload throughput, verification, total click→verified, recorder write rate, CPU/heap/Chrome process RAM; report missing and noncomparable samples honestly.
9. Burst-concurrency tests 20/100/1000 clicks, worker restart/Chrome boot/crash-adjacent tests, delayed storage race regression, full recorder failure while verified native saves still succeed, and no duplicate cloud writes.
10. Per-provider observation adapter contract + mock adapters for Google Drive, OneDrive, Dropbox, unknown fifth provider; no additional provider product integration.
11. ReDown problem-specific comparison: 4k old ring/dropped history, late storage lock issue, redundant health writes, SECURE ZIP label leak and unresolved Chrome disappearance; demonstrate what actually changed and what cannot be guaranteed.
12. Final gate table PASS/FAIL/BLOCKED/NOT RUN for ALL relevant cases, exact revision/commands/evidence tier, remaining gaps and recommended safe owner test sequence for Windows real Chrome and R2.

### Lightweight future Codex invocation (not permission to execute now)

> Read codex/11.14.2026/P1_V2_TWO_TIER_NONBLOCKING_RIGHT_CLICK_DIAGNOSTICS_CODEX_REQUEST.md in full, together with the older ReDown lessons request and its cited source. This V2 is authoritative where designs differ. Build the two-tier always-on compact BASIC rolling 4,000-attempt history (editable cap), with per-attempt timing, upload/writing speed, latency, source/site fields and explicit N/A for every unavailable canonical field. Add opt-in EXPANSIVE ReDown-level Start/Stop forensics with independent editable 4,000-event limit or Unlimited, durable batched archive and RAW/SECURE ZIPs. Make it provider-neutral, fast, restart/crash-tolerant, and absolutely nonblocking for native saves under bursts or storage failures. Use a fresh review branch, preserve the Base 0.1 milestone and current Chrome profile, implement with measured tests and honest gaps, do not merge or deploy.
