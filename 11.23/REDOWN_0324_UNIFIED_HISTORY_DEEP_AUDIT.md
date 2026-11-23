# REDOWN 0.3.24 — Unified History: source audit, failure model and architectural decision record
Date: 2026-11-23
Status: DESIGN / IMPLEMENTATION NOT YET PERFORMED
Foundation: cd4c8dd3bc11700376d30da050d6050a0eb1edb9
Immutable tag: redown-0.3.24-KNOWN-GOOD-FOUNDATION-2026-11-23
Source-reviewed branch: documentation only, rooted exactly at the tagged commit.

## 0. Decision and evidentiary limits

DECISION: make unified chronological History the next focused development run. Implement an independent one-click Basic History export first; then a read-only two-source History coordinator; then a History presentation and coordinated exports. Never merge source databases. Keep the canonical saving engines, shortcut dispatch, screenshot capture, authentication, counters, and working Basic cards untouched.

The owner reported on Windows Chrome that changing all four shortcuts from Global to In Chrome made 0.3.24 work. This is owner-observed operational evidence, NOT proof that all live providers passed sustained or restart testing, nor proof of the precise Chrome permission cause. Do not import 0.3.25 shortcut recovery patches or infer they are necessary. The tag remains immutable.

This audit reviewed actual files in the tagged GitHub tree; it did not run a new installed Windows browser session, perform production cloud readbacks, measure low-memory desktop performance, or alter source code. All proposed algorithms and limits are DESIGN PROPOSALS, not verified implementations. Existing 0.3.24 verification report docs/integration/REDOWN_0324_P0_VERIFICATION.md states installed/live provider acceptance remained unverified in its original environment. Do not convert fixture PASS into live PASS.

## 1. Canonical source map (verified from the 0.3.24 commit)

| Path | Existing implementation | Why it matters |
| --- | --- | --- |
| src/basic/lib/store.js | redown-remote-basic-v1 IndexedDB; attempts, events, ledger, meta; attempts index createdAt and [provider, createdAt]; historyList page/offset; historyGet/Delete/Clear; separate diagnostic events | Canonical Basic History; no copying to another permanent store |
| src/basic/lib/api.js | Basic API v1, redown-basic-v1 channel, strict input contract, history.list/get/delete/clear, diagnostics.exportZip, trusted app sender | All new Basic reads must use a trusted, backward-compatible API |
| src/basic/host.mjs | Lazy Basic durable opening; recover interrupted attempts on open; isolated auth/status; broadcast redown-basic-attempt | A History read may trigger pre-existing Basic recovery; distinguish that from coordinator writes |
| src/basic/lib/coordinator.js | One Basic operation identity; createdAt at initiation; provider-confirmed SAVED after object ID/confirmation checks; FAILED/UNCERTAIN terminal states | Do not fabricate stronger proof or redo saves |
| src/basic/lib/zip.js | Existing diagnostics ZIP contains events, not all History attempts; default diagnostics retention 4000 events, ZIP cap 16 MiB | Never implement Basic History download by renaming diagnostics.exportZip |
| extension/basic-diagnostics-export.mjs | Existing RAW diagnostics button and confirmation | Preserve it separately; do not replace it |
| src/persistence/current-store.mjs | click2cloud-current-v1; remote-result:* records, legacy remoteResults array, customerHistoryPage cursor by at + operationId; retained timestamp at creation | Canonical remote/R2 History and compatibility behavior |
| src/api/service.mjs | inspectRemoteHistory customer API and source-specific screenshot sanitization | Preserve trust boundary and screenshot/privacy semantics |
| src/history/model.mjs | History record projection, screenshot state mapping, range, year/week/day groups, legacy CSV/JSON/JSONL export | Reuse proven functionality instead of reimplementing from scratch |
| extension/history-page.mjs | Existing preview/navigation/retry/URLs, eager loading into rows, page size 25, settings and exports | Improve loader; preserve every existing action |
| extension/app.mjs | History navigation, screenshot/remote-result invalidation, Basic attempt broadcast handled for cards/notifications but not History invalidation | Add a narrowly scoped Basic History refresh trigger |
| src/chrome/trusted-sender.mjs | Only same-extension extension/app.html allowed | Keep sender trust validation intact |

Existing relevant tests: tests/history.test.mjs, tests/basic-core.test.mjs, tests/basic-host.test.mjs, scripts/test-customer-history-browser.mjs, scripts/test-basic-reliability-browser.mjs. Existing tests do NOT establish mixed-provider pagination correctness.

## 2. High-risk source findings (ranked)

### H01 — Basic offset pagination shifts under new inserts (P0 correctness)
history.list currently uses page, pageSize and c.advance(offset), index createdAt. If a save arrives between page reads, indices shift and repeated or missing rows become possible. A cross-cloud merge that concatenates pages is not correct. Proposed solution: additive read-only history.cursorPage or equivalent; no change to existing history.list; use IndexDB index order (createdAt, primaryKey), a bounded continuation token, deterministic tie handling and explicit end-of-source. Validate limit, continuation token, source identity, range and expiry. No store version bump unless a demonstrated test requires it. IMPORTANT: records missing createdAt are absent from the createdAt index; account for them using a lazy compatibility path and an explicit Undated group rather than silently omitting.

### H02 — Remote customer pages rescan remote-result entries (P0 scaling)
current-store customerHistoryPage considers legacy and indexed-by-ID remote-result:* state records, keeps a bounded top-K by timestamp and operation ID, but scans the remote-result key range for each requested page. It bounds returned page memory, not total per-page scan cost. Under long History this may become O(N x pages) or worse due to best-array sorting. Benchmark 1K/10K/50K remote records and 100+ pages; do not claim proven speed. Keep no migration by default. If indexing becomes essential, first propose a separately tested additive ephemeral/index read-through strategy with fresh/rebuildable projections and no canonical replacement. No silent data migration or change to current configuration store recovery semantics.

### H03 — Shelf eagerly loads whole remote History (P0 memory)
extension/history-page.mjs load() iterates all cursor pages into all[] and then rows[]. Display itself pages 25, but resident data is all retained remote records. Do NOT add all Basic records to this same array. New loader needs current page + bounded lookahead, cancellation and cleanup. Preserve screenshot lazy preview caps and existing styles, grouped date labels, keyboard and focus. Keep a separate unchanged legacy loader as a developer fallback until parity proven.

### H04 — Basic notifications do not invalidate History (P1 correctness/feedback)
extension/app.mjs handles redown-basic-attempt for Basic card updates and notifications, but it does not call History invalidation, unlike remote-result/screenshot-history-changed. Add an isolated source-qualified invalidation queue on the Shelf. Debounce small updates, never poll forever, keep scroll/focus and refresh only affected visible cards. When an old pending attempt becomes SAVED, update its status without a phantom new operation; when a new save arrives, expose New activity available to avoid resorting under the reader.

### H05 — Mixed clocks, timestamp precision and identity collisions (P0 correctness)
Basic createdAt is an ISO string set on save start; updatedAt is later. Remote at is a numeric epoch millisecond retained across row updates, updatedAt separate; screenshot plan.startedAt may exist but should not replace canonical row.at without evidence. Choose initiation timestamp as timeline key, then source + original ID as deterministic tie-breakers. Normalize epoch ms in UTC; display using selected timezone. Assign composite UI key (source, provider, original ID), not bare operationId. Do not turn missing/invalid dates into current time. Undated section remains navigable and exportable.

### H06 — Verification semantics differ (P0 integrity)
Basic SAVED requires patch.objectId and confirmed:true, and stores a provider receipt/ledger; this means provider-confirmed, not necessarily an independent fresh object readback today. Remote receipt projection uses state==='verified' plus receipt + proofKind, screenshot may have confirmed, partial, unknown, pending, failed, blocked outputs. Preserve exact original states and source proof references. Do not silently color all SAVED rows as independently readback-verified. Do not increment any counter on History render.

### H07 — Screenshot logical operation vs multiple outputs (P0 counting)
A screenshot can have several destination outputs. A primary History row represents the original screenshot operation with nested per-destination outputs, not one unrelated row per output. If exposing per-destination views, explicitly distinguish operation count from file count. Preserve existing screenshot preview, retry, checksum verification and navigation. Neither collapsing nor expanding History may trigger a save or alter receipt.

### H08 — Wrapper/duplicate and legacy handling (P0 completeness)
Remote HISTORY filters readiness and redundant depth-click wrappers. The customer store also checks canonical records and a legacy remoteResults collection and prefers canonical record over legacy same operation ID. A naive normalized merge can double-count or hide valid old records; use source-specific readers and regression fixtures. Preserve customerRows filtering and source's canonical vs legacy precedence. Basic ledger receipts are NOT substitute History attempts after history.delete/clear.

### H09 — Multiple stores are not one atomic snapshot (P0 export honesty)
Two IndexedDB databases and pages cannot be read with an automatically atomic cross-store snapshot. Concurrent insertion, update, deletion and recovery can change visible results. Do not promise mathematically impossible full atomicity using a pair of cursors. Proposed: capture source-specific high-water marks/continuation state, read bounded chronological pages, detect cursor stall, duplicate keys and changed/vanished records, compare available consistency markers/counts; fail closed on detected inconsistency, offer retry, and label what consistency is and isn't proven. Never silently claim exhaustive success after a cursor error. A stable snapshot requires explicit design; consider a short frozen ID manifest only if memory budget and tests justify it. No implicit write locks or blocking cloud saves.

### H10 — Basic History read can invoke preexisting recovery (P1 isolation)
src/basic/host.mjs durable() calls store.recover(signal) before handing out read APIs; this can mark abandoned saves UNCERTAIN. New coordinator is read-only, but opening Basic is not entirely side-effect-free in existing 0.3.24 behavior. Keep recovery intact and document status changes; do not add new recovery operations or initiate auth on History opening. A blocked DB must not blank independent remote History.

### H11 — Basic diagnostics retention is not History retention (P0 export)
Existing ZIP exports eventChunk from events; default diagnosticsCap=4000, independent from attempts. Browser ZIP is capped at 16 MiB, and bytes are accumulated in memory. A one-click Basic History download MUST export all retained attempts via Basic's History read API, not diagnostics events or ZIP. Preserve existing RAW diagnostics separately.

### H12 — Download streaming / browser capabilities (P1 usability)
Existing remote History export uses showSaveFilePicker writable stream when available, else buffers only up to 16 MiB and errors. Proposed single-click Basic JSONL export should use a separate, tested stream-to-file method in the Shelf where available, no new Chrome permissions, no cloud writes, no authorization prompts. A fallback may use an explicitly bounded Blob and a truthful EXPORT_STREAM_REQUIRED result; never output a truncated file labeled complete. On abort, avoid leaving a misleading completed filename. Verify save picker user-gesture behavior on installed Windows Chrome.

### H13 — Privacy and trust boundary (P0 security/correctness)
Basic history records can contain sanitized source URLs, host pages, filenames, destination IDs and account references. Existing Basic safeUrl strips recognized sensitive query patterns on captured URLs but is best effort, not a guarantee all private material is absent. Export a deliberate, allowlisted, redacted schema by default; never blindly JSON.stringify entire IndexedDB objects, auth state, tokens, headers, diagnostic bodies or secret paths. Preserve existing remote privacy and screenshot projection semantics. Do not bypass trustedAppSender or allow content scripts/websites to call the History API. No new broad host permissions.

### H14 — History availability must be independent from provider readiness (P0 usability)
History should read local stored evidence without connecting to an OAuth provider. Treat read-source failure as source unavailable, not zero records. Display partial-results banner and source-specific retry. One-click Basic export must be wired outside unified merge logic; if remote source fails or renderer errors, independent Basic export still functions. Preserve the currently available Remotes, Files, and History navigation.

### H15 — Deletion, retention and badges (P0 data preservation)
Existing Basic history.delete/clear can remove attempts; badge ledger intentionally may retain proof counts; the exporter must not claim deleted History is recoverable. No new global clear/delete. Route any existing card action only through original source and original ID. Display filter changes never mutate data. Export total refers to available retained records, not all saves ever made. Avoid extra writes to badge, OAuth, configuration or recorder stores.

### H16 — Date grouping and page UX (P1)
Existing History uses year/week/day and an ISO week-year helper. Around New Year's, ISO week-year can differ from calendar year; preserve or clarify that existing semantics rather than silently relabeling historical groups. Pages should remain chronological and group headers must not suggest completeness of an unscanned year. Existing "Page X of Y" may require costly global totals; favor Previous/Next and accurate "more available" until a bounded total can be established, with display wording tested. No false zero-state before both sources respond.

### H17 — Regressions from broad source edits (P0 release gate)
Version 0.3.24 is owner-verified operational with shortcut scope In Chrome. The tag pin is not a guarantee that a future development branch won't import 0.3.25; enforce a zero-code-drift baseline check and an allowlist of touched files. Never cherry-pick 0.3.25 shortcut recovery, edit manifest shortcut permission, add screen capture or modify clouds. The only acceptable additions to Basic storage/host/API are read-only cursor/summary endpoints and tests; edits to recovery, auth or save transaction code require separate explicit review.

### H18 — Fixture results are not owner's Windows Chrome results (P0 honesty)
Existing tests cover individual Basic, remote History, exports and synthetic Chromium fixtures; original docs say installed acceptance was blocked. Require explicit owner Windows Chrome screenshot, Files/search and History shortcuts with In Chrome scope, real save to each authorized provider, remote readbacks where possible, browser restart, full-profile stress and data preservation. A fixture pass cannot be relabeled installed/live success.

## 3. Approved design: two adapters, a coordinator, one UI; independent export

- Basic adapter: trusted Basic API, newly additive history.cursorPage (or equivalently named) over existing attempts index; fallback support for missing timestamps; provides source-specific status interpretation and source-qualified IDs.
- Remote adapter: existing inspectRemoteHistory(customer:true, limit <=100) with canonical/legacy de-duplication; protect current screenshot redaction and legacy behavior.
- Coordinator: merge stable sorted source runs, preserve continuation tokens, bounded page buffers (e.g. 25 visible + 25-100 lookahead/source); dedupe only identical canonical source IDs, never same filename across providers; cancel on navigation; distinguish partial source availability. A "source high-water-mark" freeze and refresh banner prevent concurrent inserts from shifting older pages; document mutation limitations.
- UI: preserve "The Rest is History" and year/week/day, screenshot previews, navigation, per-output checksums, host and public URL disclosure, receipts, filters, timezone, themes, keyboard and accessibility. Source-specific card renderer/adapter only; no universal fake GO TO. Header has exactly one independent "Download Basic History" button mounted outside merge subtree, plus existing "Export History" advanced control.
- Basic exporter: local trusted Basic records ONLY, newest-first chronological JSONL default, schema version and source, timestamp, explicit status/proof level, IDs, error codes and available receipt fields; safe redaction default. Stable paging, bounded writer, terminal checksum/count/footer and verification before success. No extra cloud API requests or permission prompts. Do not reuse diagnostic event ZIP. Existing RAW diagnostics stays intact.
- Combined exporter: Basic-only, Remote-only, All; existing JSON, JSONL, CSV; all selected retained data, not UI page, with consistent chronology and privacy, screenshot inclusion and date ranges; preserve legacy remote-only schema/consumer compatibility or version a new combined schema with explicit reader support.
- Robustness: one disabled/unavailable adapter never suppresses another; set explicit incomplete marker; no fake "0 records" when reads fail. A compatibility toggle, dev-only flag or rollback path should restore legacy remote History without touching canonical data. Do not create persistent duplicate History.

## 4. Implementation choices — prefer and reject

PREFER:
1. Small standalone projection and cursor modules with pure tests.
2. Additive Basic API with version-compatible older history.list unchanged.
3. Read-only IndexDB operations, no schema changes or migrations at the first milestone.
4. Lazy per-record previews and static UI-level status cards.
5. Source-accurate status names: "Provider confirmed" for Basic SAVED; "Remote verified" only where evidence supports it.
6. Accurate exported snapshot/count metadata and independent diagnostics.
7. Documented stopping points and recoverable commits.
8. First run evidence compare against tagged 0.3.24, branch anchored to tag.

REJECT:
1. Concatenating existing visible Basic/Remote pages then sorting.
2. Fetching full Basic and Remote history into Shelf memory.
3. Mirroring both histories into a third canonical database.
4. Altering recorder, screenshot capture, Chrome command handlers, OAuth or native save logic.
5. Event-ZIP masquerading as Basic History export.
6. Showing a full success banner after a partial failed export.
7. Conflating same filenames with duplicate operations.
8. Claiming old deleted Basic History is recoverable.
9. Broad sweeps of CSS/navigation/existing interactions for aesthetic perfection.
10. Claiming no regression without the full installed and provider verification gates.

## 5. One-shot sequence, each with hard stop / checkpoint

**Gate 0 (baseline):** Confirm exact 0.3.24 tagged commit ancestor. Ensure documentation-only branch differs from tag only in 11.23/* before coding. Record git status, source hashes, extension ID, existing tests and fixture limits. Never build from 0.3.25 branch head. Protect all user data.

**Gate 1 (Basic independent export):** First deliver add-only Basic read cursor and one-click JSONL exporter. Test 0/1/25/40/100/1001/10k+, equal timestamps, missing createdAt, deleted records, read failure, interruptions, redaction and no extra IndexedDB writes. Compare exported IDs/count with direct read of canonical attempts. Preserve diagnostics ZIP.

**Gate 2 (merge correctness):** Implement pure k-way merge and adapters. Use 25-record pages, deterministic composite keys and continuation; test skewed distribution (99% Basic / 99% Remote), ties, missing dates, legacy duplicates, insert/update/delete during traversal and source failure. An adapter that cannot prove stable continuation must not be silently accepted.

**Gate 3 (UI integration):** Replace eager load behind existing History page only after parity tests; add source filters, Basic event invalidation, status legend and partial-results banner; preserve every existing preview/navigation/retry path. Keep old presenter accessible to development rollback.

**Gate 4 (coordinated exports):** Reuse normalized reader, stream complete Basic/Remote/All, respect date & screenshot settings, privacy, counts, failure detection, schema compatibility. Ensure independent Basic button still works without coordinator.

**Gate 5 (regressions and release decision):** Automated focused, full suite, build, docs reference, fixture Chromium and accessibility tests; label known preexisting failures. Windows owner runs Chrome In Chrome shortcuts, Basic cards, repeated right-click saves, screenshot R2 readback, 3 provider readbacks, restart and stress sessions. If any critical regression or lost record, do NOT publish ready-for-release claims; stop or revert scope-specific commits to last passing checkpoint.

## 6. Testing matrix, metrics and adversarial cases

- Identity: same original ID across sources, identical filenames across providers, same timestamps, duplicate legacy remote wrapper, a screenshot with 3 destination outputs, repeated attempt update.
- Ordering: page boundary ties, oldest data, undated data, non-UTC timezone & DST, clock skew, ISO-week year boundary, all filters, reverse chronological export.
- Freshness: new entry during page traversal, pending to SAVED, deleted between pages, interrupted worker, recovery reclassifies status; stable view + new-activity notice.
- Completeness: exact equality of canonical retained attempt IDs vs exported Basic IDs; exact equality of qualified remote customer IDs vs output; no double-counted nested screenshot outputs.
- Scalability: 0/1/25/26/100/1001/10000 per source and 50000 mixed fixture, plus 99:1 skew. Measure first-view time, page latency p50/p95, disk read counts, peak Heap/DOM nodes, preview queue size, export memory/bytes, MV3 worker startup. Accept based on comparison to tagged 0.3.24 on same machine and justified budget; no unsupported hard guarantee.
- Isolation: Basic DB missing/blocked/corrupt, remote CURRENT missing/blocked/corrupt, separate OAuth signed out, unavailable provider network, file picker cancellation, low disk/quota, aborted navigation, malformed cursor, unexpected message response, stale tabs.
- Security: untrusted sender, malicious filenames/URLs, credential-like query/path, HTML injection, CSV formula injection, privacy export redaction including nested screenshot metadata, raw diagnostics unaffected.
- UI: all existing themes at several Shelf widths, keyboard/focus, render while source unavailable, grouping, screenshot preview GO TO/retry/URL, image preview lazy concurrency (existing cap 2), old History fallback, Basic provider cards.
- No writes: instrument IndexedDB and Chrome API operations to prove History/export causes no save/provision/auth/counter/permission writes beyond existing Basic host recovery behavior. Baseline output hashes for canonical source rows before/after controlled test.
- Installed: test owner's Windows Chrome profile, startup/refresh/full Chrome restart, In Chrome shortcuts, real authenticated provider saves & readbacks. Keep synthetic/test result labels separate.

## 7. Acceptance invariants

A. No canonical records deleted/rewritten; zero migrations; user configuration preserved.
B. All existing source-qualified, eligible retained records appear exactly once in All History and relevant export.
C. Proven initialization-time chronology; status is source-faithful; absent values explicitly unavailable.
D. Continued pagination reaches oldest retained record; partial sources are labeled incomplete, never empty.
E. Independent Basic History download works when Cloudflare UI or remote reads fail.
F. No unauthorized cloud calls; local History/export doesn't authenticate, upload, retry, count, or provision.
G. Existing screenshot/Chrome shortcuts, Basic cards, remote saves, themes, previews and exports preserved.
H. Exact 0.3.24 ancestry and an independently recoverable fallback.
I. Final report lists changed files, API contracts, schema, tests, baseline/perf evidence, installed Chrome gates, known failures, and precise commit SHA.

## 8. Remaining open questions to resolve in code / tests, not by guessing

1. Does every legacy Basic attempt have createdAt? If not, how many? Use indexed cursor for dated rows and bounded lazy fallthrough for undated rows; do not invent times.
2. How much of Cloudflare's remote History cost is scanning/sorting? Measure before index/migration designs.
3. How is total page count computed without full-history scans? Prefer honest "Older/End" semantics and optional count after bounded calculation.
4. How will source mutation during multi-database export be detected? Define snapshot contract and tested failure behavior; never pretend full cross-IDB atomicity.
5. Will the owner's Windows Chrome allow streaming file picker in Shelf? Verify; maintain explicit non-truncating fallback.
6. How does date grouping behave around ISO week-year boundary? Keep existing semantics unless a separate user-visible change is accepted.
7. Which Basic destinations/actions are actually available for old records? Show only verified capabilities, not invented Cloudflare GO TO.
8. How does legacy CURRENT projection behave with missing/invalid at? Verify source cursor never drops last undated entry.
9. How does switching between theme widths affect virtualized row height, expanded details, and focus? Real browser check.
10. Does installing new build over owner's original profile preserve extension ID, IndexedDB and OAuth? Verify no distribution path change.

## 9. Non-goals

No screenshot/global shortcut repair. No new universal cloud file verifier in this run. No R2 resource provisioning. No replacing Basic or remote save engines. No syncing or backing up History to cloud. No newly automated deletion. No claim that one exporter proves current remote file existence. No attempt to recover previously deleted History.

## 10. Success definition

The next build is accepted only when independent Basic History export and unified chronological History are complete, bounded, source-faithful, demonstrably non-destructive, and regression-tested against 0.3.24. Fixture PASS is development confidence only; owner Windows Chrome and actual provider readbacks remain explicit release gates until performed.
