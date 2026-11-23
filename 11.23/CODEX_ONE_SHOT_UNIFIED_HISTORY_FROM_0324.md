# CODEX IMPLEMENTATION REQUEST — REDOWN 0.3.24 Unified Chronological History + Independent Basic Export
Date: 2026-11-23
Priority: P0 source integrity / P1 cohesive History experience
Implementation branch: codex/redown-0324-unified-history-1123-docs (currently documentation-only from the foundation)
Immutable starting commit: cd4c8dd3bc11700376d30da050d6050a0eb1edb9
Read before editing: 11.23/REDOWN_0324_UNIFIED_HISTORY_DEEP_AUDIT.md
Status: REQUEST, NOT COMPLETED IMPLEMENTATION.

## Exact mandate

Implement, in one tightly scoped run with verifiable intermediate checkpoints:
1. ONE independent "Download Basic History" button (the canonical Google Drive / OneDrive / Dropbox attempt history; complete retained data; JSONL by default), separate from existing RAW Basic diagnostics ZIP.
2. ONE unified chronological History page, reading the original Basic and Cloudflare/ReDown History stores without combining databases, altering save engines, or changing canonical receipt semantics.
3. Three coordinated export scope choices (Basic only / Cloudflare only / All), chronological and complete, preserving current formats/filters/privacy and existing standalone Basic exporter.
4. A strict regression gate against the actual owner's working 0.3.24 configuration, particularly four shortcuts scoped "In Chrome".

Never begin from 0.3.25 or import 0.3.25 shortcut recovery. Do not "fix" Global scope in this run.

## 0. Start conditions and authority

- Confirm HEAD descends from 0.3.24 tag; report exact hash. This documentation branch was born from cd4c8dd and its initial changes are 11.23 docs only.
- Do not switch to 0.3.25 branch, rebase onto 0.3.25, cherry-pick old shortcut patches, or modify tag.
- Confirm proper writable branch exists before making any source changes; if executor is on a detached tag, stop and establish branch. Do not modify the separate user's Windows original Chrome profile or source workspace.
- Run/review AGENTS.md, 11.23 deep audit, and existing API docs. Owner's current History run scope supersedes unrelated older "mandatory next assignment" instructions in historical AGENTS sections for this run; never override current data preservation rules.
- Capture baseline git status, diff vs tag, source/build hashes and existing test results. Do not change package version or user extension ID without explicit requirement. Feature additions can use new internal API methods without changing Basic API version or removing existing contract.

## 1. Scope / file editing allowlist

Expected allowed changes, smallest possible:
- src/basic/lib/store.js: ONE additive readonly cursor query function; no writes or migration.
- src/basic/lib/api.js: ONE additive validated, same-extension-trusted cursor/History query API.
- src/basic/host.mjs: only necessary additive read-through hookup if required; leave durable recovery and coordinators unchanged.
- src/history/* new isolated files for normalized projections, coordinator, export utils; existing model for safe reuse.
- extension/history-page.mjs: bounded controller integration retaining legacy views/actions.
- extension/app.mjs: minimal Basic invalidation wiring and History launcher integration.
- extension/basic-history-export.mjs: independent exporter/new single button, mounted separately from timeline renderer.
- existing History CSS strictly for small card/provider/filter UI, theme-compatible.
- tests/* and scripts/* targeted tests for new API, source merge, browser and performance.
- docs/11.23 notes / reference docs as needed.

Explicitly prohibited unless a documented test proves absolutely necessary: extension/manifest.json, src/chrome/command-bindings.mjs, src/chrome/visible-tab-screenshot.mjs, src/chrome/provider-panel.mjs, src/cloudflare/screenshot-direct-upload.mjs, extension/screenshot-background.mjs, Cloudflare auth/Worker logic, src/basic/lib/coordinator.js save flow, Basic provider card implementation, native contextMenus registrar, toolbar counter logic, OAuth credential handling, setup authorization. No broad refactor, no extra grants, no new cloud resources, no new writable History database.

## 2. Basic cursor endpoint: exact requirements

Keep history.list/get/delete/clear unchanged for existing consumers. Add a read-only endpoint with a versioned name (example: history.cursorPage; choose final naming consistent with existing style):

Request:
- cursor?: opaque, versioned, source-bound token
- limit?: integer 1..100, default <=100
- optional filters for provider, bounded date range, includeUndated (only if independently tested)
- no arbitrary source ID, SQL-like predicate, cross-provider command or authorization argument.

Response:
- items: canonical attempt records, bounded, sorted descending by createdAt and primary key; allowed fields projected and validated
- nextCursor: opaque continuation or null
- complete: true ONLY when all eligible rows for this stream are read
- optional scan metadata/high-water mark where grounded; do not invent an atomic snapshot
- sourceVersion/schemaVersion for API compatibility.

Index strategy:
- Use attempts.createdAt and attempts primary key together; do not trust timestamp alone.
- For reverse index iteration, tie-break by primary key reliably. Investigate IDBIndex.openCursor and continuePrimaryKey availability; prove exact equal-timestamp traversal in Chromium. If browser implementation requires iterative skip among ties, keep bounded cursor reads without unbounded in-memory accumulation and measure tie worst case.
- Missing/unindexed createdAt records must be addressed explicitly, via bounded fallback/read-only scan, late undated group and comprehensive tests. Never silently drop them.
- Validate/deny malformed cursors, stale source version and excessive limits.
- Complete at end only, no infinite cursor cycles or repeated last item.
- Keep existing index and DB version; migrate neither existing attempts nor ledger.
- Do not add state-mutating code to respond to History queries. Existing Basic host's initial interruption recovery remains as-is; record that limitation.

Test with 0/1/25/40/41/100/1001/10k+, equal timestamp across all 100 items on page boundary, missing timestamps, invalid cursor, deleted row between calls and new inserted item.

## 3. Independent one-click Basic History exporter — first customer-facing milestone

Location:
- A single clearly labeled button "Download Basic History" in a stable History header/settings area independent of the merged-card renderer. If unified coordinator fails, leave this button mounted and operational.
- Do not overwrite/remove the existing Settings/Debug "Export Other Cloud Provider Diagnostics" ZIP button.
- No extra wizard; one click begins local save, with browser's ordinary file picker when configured.
- Show preparing/progress/cancel/completion/error without freezing the Shelf. Avoid treating download initiation as completed disk write.

Data source:
- ONLY canonical retained Basic attempts, read using the trusted Basic cursor/query endpoint.
- No event-ZIP, no Cloudflare service, no OAuth provider calls, no cloud readback, no Basic save attempts.
- A separate Basic export function must not call the unified timeline coordinator.
- Use read-only source APIs and bounded pages with cancellation.

Default output:
- JSONL, filename redown-basic-history-YYYY-MM-DD.jsonl, schema redown.basic-history/1.
- First line: export metadata (format/schema, scope, createdAt, timezone, ordering, privacy level, consistency guarantee/limitations).
- Next lines: one per retained attempt, source='basic', normalized provider label/ID, original ID, source-qualified ID, createdAt, updatedAt, recorded state, proof level, filename if available, sanitized source identity, destination/account and object identifiers if safely allowed, error code, available duration/size, receipt/provenance fields only if allowlisted.
- Closing line: counts by provider and state, records seen/written, optional checksum digest of deterministic stream, completeness status and source read errors (but never write a misleading success footer after errors). If write abort leaves a partial file, mark it unusable and explain.
- Newest first; stable tie-breaks; one line per attempt (not one per diagnostic event).
- Provider SAVED should describe provider confirmation, not independent current readback. Do not use blanket 'verified' labels.
- By default redact private browsing URL query strings, tokens, credentials, source URLs as appropriate; preserve enough non-sensitive timestamps/status/IDs to diagnose. Honor explicit existing privacy controls without unsafe raw object dumps.
- Export only available historical records; do not promise to recover history.delete / history.clear deleted attempts.

Delivery:
- Prefer File System Access writable stream while actual user click gesture is active, with asynchronous yielding, bounded memory and AbortSignal.
- If showSaveFilePicker unavailable, use only a proven small-size Blob fallback with exact byte cap and a clear streaming-support-required error. No truncated partial "success."
- Abort/cancel on requested operation only; no save counter writes. Validate dangerous filename/CSV payloads for other formats.
- Avoid base64 data URLs or zip assembly in service worker for unlimited History.
- Successful file completion must be validated after stream close with expected record count/coverage, not merely an issued Chrome download ID.

## 4. Normalized History projection (pure, no provider side effects)

Common display envelope:
  qualifiedId = source + ':' + provider + ':' + originalId
  source = 'basic' | 'remote'
  provider / accountRef (available, redacted)
  originalId
  initiatedAtEpochMs (nullable)
  updatedAtEpochMs (nullable)
  completedAtEpochMs / verifiedAtEpochMs (nullable and source-grounded)
  stateOriginal
  displayStatus / proofLevel
  filename, safe source host/name, destination summary, recorded error
  actionCapabilities and sourceReference (do not expose token/secret)
  screenshotNestedOutputs (referenced lazily; no forced duplication)

Use pure functions (unit-testable) that distinguish:
- Basic SAVED+confirmed+objectId -> provider-confirmed, NOT automatically independent remote current existence.
- Basic FAILED / UNCERTAIN / waiting -> source-accurate terminal/progress state.
- Remote row verified+receipt+proofKind -> proved source-defined receipt.
- Screenshot composite confirmed/partial/unknown/pending/failed/blocked -> preserve existing detailed per-output result and attempted count.
- Missing/inconsistent source fields -> unknown/unavailable, not inferred from other metadata.
- Timestamp validation strict; no fabricated dates or untrusted current-time fallback.
- Unknown provider identity -> generic provider label and intact original ID, not Cloudflare.

## 5. Unified timeline coordinator

Build a two-source deterministic merge on bounded streams:
1. Open Basic and remote readers independently, with source-specific failure handling and cancellation.
2. Read a bounded batch from each source. Both must produce stable chronological order for dated rows.
3. Compare each source's next row using (timestamp DESC; source+provider+recordID ASC), and take exactly one into output.
4. Continue each source as needed; preserve unused rows / continuation cursors between visible pages.
5. Return <=25 page entries plus next-state; never fetch all History into an array.
6. Add an Undated tail/source section for legacy incomplete timestamp records after dated traversal, preserving deterministic order and complete reachability.
7. Detect cursor stall, non-monotonic source pages, duplicate qualified IDs, missing continuation, unexpected source count and invalid state.
8. No duplicate from legacy remoteResults + canonical remote-result:*; preserve original remote preference rules.
9. Refresh strategy: keep the older page stable while user reads; new save broadcasts show "New activity available" / explicit refresh; status updates of existing visible rows may patch without reorder. Do not poll indefinitely.
10. Source errors return partial results + an explicit source unavailable marker; never label partial as all History or treat failure as empty dataset.
11. Choose Previous/Next / Load older UX that does not require an expensive count scan every time. If Page X of Y cannot be proven cheaply, report accurate available/unknown counts rather than fake totals.

Snapshot contract:
- Accept that two stores lack a single atomic transaction.
- Define high-water marks and an honest consistency token; record the exact guarantee of inserts/updates/deletes while scrolling. Do not silently claim an atomic snapshot.
- For export, detect concurrent changes where possible; stop with actionable error on proven inconsistency; do not misstate "every save ever" as "every retained record read".
- Avoid creating a full ID manifest unless tests show correctness cannot otherwise be achieved without it; if needed, use bounded spill-to-disk and explicit memory budgets rather than all IDs in RAM.

## 6. Existing History UI integration

Preserve:
- "The Rest is History" headline; year/week/day grouping; timezone and date filters.
- Existing screenshot and image previews, two active preview reads ceiling, 4/12MiB preview limits, object URL cleanup and cancellations.
- Screenshot retry, per-destination GO TO, recorded checksum/verification and URL displays.
- Existing remote GO TO, source page and destination info, metadata privacy and accessibility semantics.
- Existing toolbar/navigation, theme palette/Frames/Bit o' Polish visual compatibility, narrow Shelf layout, keyboard and screen reader focus.

Add:
- All | Basic | Cloudflare filter with correct upstream selection (not postloading every record).
- Provider-specific card logo/identity/status without losing detailed existing card controls.
- "Download Basic History" visible even if merged source fails.
- "New activity available" low-noise refresh indicator.
- "One source is unavailable; showing partial History" banner and per-source retry.
- One unified chronological selected page with no unlimited DOM nodes.
- Clear separation between recording a result and live confirmation: History reading never replays/authorizes a save.

Minimal extension/app.mjs integration:
- redown-basic-attempt notification currently updates Basic cards but not History; add a source-qualified History invalidation call with debounce.
- Keep remote-result and screenshot-history-changed handling untouched except feeding the correct isolated adapter invalidation.
- Keep Basic card updates and notifications exactly as before. No changes to screenshot shortcut or Shelf gesture logic.

## 7. Export coordinator (after standalone Basic export and UI passing)

Advanced Export History:
- Scope: Basic Only | Cloudflare Only | All.
- Existing format options JSON/JSONL/CSV where supported.
- Date: All Time/daily/weekly/custom, display/export timezone.
- Include screenshots toggle.
- Secure/redacted output defaults; existing privacy switch semantics protected.
- For scope=Cloudflare Only, preserve old output schema click2cloud.history/1 and compatibility, OR explicitly offer old-format export as separate compatibility option.
- For new combined scope, version new schema (e.g. redown.unified-history/1) and document fields/metadata/proof level; do not silently repurpose old schema.
- Use the same normalized ordering/IDs as the timeline; export must traverse all selected retained source rows, not visible page cache.
- Counts: total operations; by source, provider and state; separately count screenshot destination outputs, never conflate with top-level operations.
- Bounded memory streaming; detected source/page failure aborts rather than completing an incomplete file. No new remote network lookups.
- JSONL and JSON use valid structured metadata + footer; CSV must defend against spreadsheet formula injection; test quoted multiline filenames.

## 8. Hard acceptance and stop gates

Gate 0 — Baseline:
- git rev-parse, tagged ancestry, clean tree, package version, build, manifest/shortcut diff, fixture baseline. Do not proceed if HEAD includes 0.3.25 shortcut changes.

Gate 1 — Basic History exporter:
- Test every retained attempt included exactly once, no diagnostic cap, no 16MiB ZIP reuse, no cloud writes or state mutation, default privacy, honest failure on storage/file errors, bare empty dataset success. Preserve original diagnostics button. Record SHA.

Gate 2 — Readers and merge:
- Fixtures: 0/1/25/26/40/41/1001/10K per source; 50K+ mixed; 99:1 skew, dense equal timestamps, missing timestamp, partial sources, repeated attempts, screenshot multiple outputs, cross-source ID collision, legacy current rows, malicious metadata.
- Exact set equality vs canonical retained IDs in stable fixtures. Verify no gaps or duplicates across all pages. Record SHA.

Gate 3 — UI:
- All existing History unit and browser fixtures; screenshot previews/GO TO/retry, lazy image reads, date settings, existing export, filters, responsive themes/narrow widths, keyboard, focus, lifecycles. Source failure and status refresh. Record SHA.

Gate 4 — Exports:
- Verify each of three scopes contains exactly matching source IDs and correct ordering, redaction and state evidence; JSONL/JSON/CSV valid, large file memory bounded, browser fallback truthful, interrupted export non-success, concurrency caveats documented. Record SHA.

Gate 5 — Protected product:
- npm run check:api-docs
- npm run build:extension
- npm run test:focused
- npm test (compare pre-existing known failures vs new failures; no sweeping snapshot updates)
- relevant browser fixtures (existing history & Basic reliability suites plus new unified-history installed fixture)
- comparison of protected paths, package and manifest; any unrelated protected file edit -> STOP and revert that specific change.
- no source DB migration. Check IndexedDB before/after canonical records and source byte counts.
- no change to working Chrome shortcut scope; user-provided 0.3.24 is owner-verified in Chrome, Global intentionally deferred.
- Windows owner acceptance: actual Chrome In Chrome screenshot, secondary screenshot, Files/search, History shortcuts, installed extension startup, real provider saves & remote readbacks, restart/recovery, 4GB-class resource test and stress. If not executed label UNVERIFIED.

Hard stop:
- Any History record disappears unexpectedly; any duplicate/skipped record in stable fixture; any cross-source deletion; any upload/OAuth/permission triggered by History; any screenshot shortcut regression; any deceptive export completion; any uncontrolled heap/scan regression; or any 0.3.25 code import -> stop, preserve evidence and do not push a "ready" claim.

## 9. Performance review (must report numbers, never guess)

Report before/after on same hardware and same fixture:
- First visible History page paint (ms), warm/cold.
- 25-item page fetch latency p50/p95.
- IndexedDB cursor rows scanned/read per page per source.
- Peak renderer heap and DOM nodes for 1K/10K/50K mixed History.
- Preview concurrency and maximum decoded image memory.
- Stream export peak retained data and wall-clock rate, failure behavior.
- Background/worker CPU and startup latency with 0 and 10K records.
- Fixed view vs source-change refresh work.

Set realistic budget relative to tagged 0.3.24 without ungrounded claims. If repeated O(N x pages) Cloudflare scans fail budget, isolate optimization in read path with explicit before/after tests; do not mutate CURRENT canonical schema in the same general refactor.

## 10. Final deliverable report format

1. Foundation tag, first implementation ancestor and branch exact SHA.
2. Change list with why each file needed modification.
3. Core API request/response contract; normalization; cursor comparisons and missing dates.
4. Independent Basic export format and privacy policy.
5. Full completeness/consistency proof against ground-truth fixture records.
6. Mixed-provider pagination/large-data performance measurements.
7. Existing screenshot/shortcut/Basic card/nonregression verification.
8. Real installed Chrome and live provider proof: PASSED / FAILED / NOT RUN, no conflation.
9. Known limitations: no atomic cross-IDB snapshot, deleted History unrecoverable, provider-confirmed != fresh remote readback.
10. Recovery instructions / rollback SHA and checkpoints, exact pushed SHA and GitHub branch URL.

Final instruction: ONE TIMELINE, TWO INDEPENDENT CANONICAL HISTORIES, ONE INDEPENDENT BASIC EXPORT, ZERO UNAUTHORIZED SAVE PATH CHANGES. Work incrementally, verify every gate, and do not claim "fully working" until installed Windows Chrome gates actually pass.
