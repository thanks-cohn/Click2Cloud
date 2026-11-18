# CODEX REQUEST — Design the best practical IndexedDB filename inventory & search cache (READ ONLY)

**Date:** 2026-11-18  
**Status:** Final architecture DESIGN, not implementation.  
**Product:** Click2Cloud, Cloudflare R2 first; reusable File API/provider adapters later.  
**User objective:** Repeated filename searches should be answered from a **durable local IndexedDB inventory** rather than repeatedly asking Cloudflare R2 for names already fetched. No downloading file contents to match filenames.

## First understand the existing application, then design

1. Read [the current File Explorer search/toolbar idea](../../codex-ideas/FILE-EXPLORER-FILENAME-SEARCH-BAR-2026-11-18.md) closely. **V1 only searches immediate files and folders inside the directory supplied to the API**. The UI knows the Explorer's current directory; the direct API must receive a resolved account/bucket/directory.
2. Inspect `src/explorer/listing-view.mjs` and its `createListingReader`. As of the inspected branch it uses an **in-memory**, bounded **64-page**, **10-second TTL** listing cache with shared outstanding requests, cancellation and epoch invalidation; **do not create a competing cache**. Determine how to layer a persistent IndexedDB inventory beneath/alongside it with one coherent freshness owner.
3. Inspect `extension/app.mjs` (`listFolders`/Explorer navigation and pagination, list reader, file CRUD, account changes, gallery, history), the File API/broker, Worker R2 listing/prefix handling, and existing IndexedDB stores and test fixtures wherever present. Locate actual transaction contexts: shelf/page, MV3 extension service worker, any background/desktop relays. Cite repo paths/functions.
4. Confirm the current provider listing and pagination/continuation contracts, folder-marker vs inferred common-prefix semantics and any R2 limitations. **Do not assume Cloudflare R2 offers server-side substring filename search**.

## Design requirements — aim for a dependable, exceptionally good implementation

### 1. Reusable File API, GUI as client

Propose specific method contracts with types for `searchDirectoryNames`, `refreshDirectory`, optional `getCachedDirectory` and future `searchNames({directory, scope: 'nested'})`. Show how UI input `photo` maps to a current-directory search, while a **future** `:nested photo` and `bucket/folder:nested photo` map to explicit resolved API targets. **Enter submits** and the File API runs the search, not GUI-only filtering. Preserve precise account/bucket/folder identity and returned actionable file/folder IDs.

### 2. IndexedDB schema and query strategy

Design an **actual versioned IndexedDB schema** with exact stores, primary keys, secondary indexes and example records. At minimum evaluate:
- directory inventory records keyed by **provider connection/account ID + bucket ID/name + canonical prefix** with `fetchedAt`, `validatedAt`, `expiresAt`, `complete`, `nextCursor`/scan status, generation and associated listing identity;
- file and **immediate child folder** name entries with exact key/prefix, `parentPrefix`, normalized searchable basename, type and minimal safe metadata;
- persistent listing/page state and rebuild/reconciliation markers *only if required*;
- optional full-text substring indexing (e.g. n-gram inverted index), **only if benchmarks show scanning one directory's IndexedDB index is inadequate**. A normal B-tree index does not efficiently answer arbitrary `includes()` substring queries; compare direct-child scan, prefix query and n-gram/inverted approaches honestly.
  
Define canonical escaping, Unicode normalization/case folding policy, duplicate names across directories, object-key case sensitivity, folder markers vs inferred prefixes, schema upgrades and data integrity constraints. Include a realistic records/indexes example for `bucket/photos/` and `bucket/photos/2025/`.

### 3. Freshness, authority, and no false results

**Crucial truth:** IndexedDB is a **local metadata cache**, NOT a source of cloud truth and does not receive external upload/deletion notifications automatically. Design explicit **cache-first + stale-while-revalidate** or other defensible policy:
- fresh **complete** directory listing: local query without network;
- cache missing/incomplete/stale: clear read behavior and controlled listing/refresh;
- changing the search term inside an already cached directory: local only until invalidation/refresh policy requires network;
- refresh manually or on a defined schedule, with optional background revalidation and honest `source: cache|cloud`, `asOf`, `complete`, `stale`, `refreshing` provenance;
- never silently treat an incomplete first page as exhaustive; preserve continuation, cancellation and bounded listings;
- multi-device/external cloud writes are unknowable from IndexedDB alone: show how and when users can notice/refresh, and how to avoid permanent false negatives;
- low-connectivity/offline mode: visible **last-known cached** results, never fake online verification.

Propose a TTL/freshness strategy by use case, with reasoning and configurable parameters rather than fabricated freshness guarantees.

### 4. Mutations, crashes, concurrency and security

- Invalidate or reconcile inventories affected by **create folder, bucket creation/deletion, rename, upload, copy, move, delete, reconnect, sign-out or permission changes**; distinguish rename across parents, source/destination generations and parent directory invalidation.
- Cache updates from local operations are **tentative until the real cloud operation/receipt is verified**; no cached entry should be treated as independently verified save proof. On uncertain write outcomes, invalidate or mark uncertain, reconcile through existing receipt/transport.
- Account/bucket namespaces must never bleed between identities; safeguard against OAuth account switch and stale async responses.
- Support MV3 worker sleeping/restarts, multiple extension contexts/tabs, transactional writes, race-free generation fencing, idempotent upserts, dedupe, crash midway through paging, schema migration and safe rebuild. IndexedDB writes should be bounded and performed in short transactions.
- Enforce privacy/security: only minimum required name/path metadata, no OAuth tokens/passwords in search stores; document retained metadata exposure on shared devices, wipe controls on disconnect/clear, quotas, storage errors and private-browsing behavior.
- Limit storage using practical size caps, eviction prioritization, last-access and storage-pressure handling. A stale/missing cache must never block successful ordinary File Explorer browsing or saves.

### 5. Efficiency and measurable quality

Design **one coherent inventory owner**, not two independent sources of truth (existing in-memory listing reader + IndexedDB). Use efficient bulk transactional ingestion, exact parent-prefix range access, lazy directory population, request coalescing, paginated fetch, backpressure, deduplication, and minimal Cloudflare API calls. Explain cache warm-up without an unsolicited full-bucket crawl.

Analyze cold vs warm searches at 100, 10,000 and 1 million object **simulated workloads**, directory distribution, number of accounts, open-folder bursts and nested subtree searches. Include a reproducible benchmarking plan for:
- p50/p95 search latency (cache cold/warm), UI input-to-results, memory and IndexedDB footprint;
- provider requests avoided, real refresh volume, database mutation time;
- search accuracy/false negatives, completeness and stale result signaling;
- crash/reload survival, transaction failure, quota exhaustion, simultaneous tabs and race conditions.

Do not promise sub-millisecond searches, zero provider calls or complete global search without proof. For huge directories, be explicit about a possible indexing threshold or different architecture if necessary.

### 6. Future `:nested`, but DON'T overbuild V1

V1 scope is **immediate child names in one named directory**, and must remain small. Design the schema so later recursive results across all descendant/sibling branches of the current subtree can be efficiently discovered **without full redesign**, possibly requiring progressive background inventory; show how to communicate partial recursive coverage. Explicit inline search-bar path syntax `bucket/directory/child:nested query` is a future option, not a V1 feature or license to crawl all buckets now.

Keep architecture provider-agnostic at the File API contract, but do not claim other cloud provider pagination semantics are identical.

## Your decision output (in the Codex reply; NO repo edits)

1. **Recommended design and why** — a concise executive verdict, including how it layers with `createListingReader` and who owns freshness.
2. **Precise proposed IndexedDB schema**, index definitions, normalizer behavior, example data and migration strategy.
3. **Contracts and sequence diagrams** for cold directory search, repeated warm search, stale refresh, offline search, mutation invalidation and future `:nested`.
4. **State/invariants table** for `complete` vs `partial`, `fresh` vs `stale`, selected directory, pages/cursors, account authorization changes and last-known-only results.
5. **Failure-mode matrix:** wrong-account leakage, missed external additions, deleted/moved files, partial paging, crash, corrupted DB, quota pressure, repeated refresh storms, stale worker messages and inconsistent transactions; show mitigation and fallback.
6. **R2 call budget, latency, storage and benchmarking plan**, backed by current source, with estimates explicitly labeled.
7. **V1 smallest safe implementation sequence for a FUTURE request**, tests/gates and rollback plan, including no regressions to Simple/Narrow/Depth, receipts, File Explorer CRUD and the Aesthetic API.
8. Explicitly list unresolved technical questions, alternative designs rejected and objective reasons.

## STRICT read-only stop condition

- **Do not write, edit, create, format, delete, commit or push any repo file (including docs).** Present design/report in Codex reply only.
- **Do not implement the cache, the GUI, a parser, migrations, search methods or tests now.** Do not touch production IndexedDB data or browser local storage.
- No Cloudflare calls that mutate anything, deployments, permission changes, live data writes or benchmarking against user cloud resources.
- Do not modify Click2Cloud or ReDown; do not change `main`.
- You may inspect source, existing tests and historical evidence **read-only**. If a reference doesn't exist, locate the actual source and note it.
- **Stop after giving the design**. A later explicit request will authorize code changes and experiments.
