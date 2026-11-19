# CODEX REQUEST — STEP 2: IMPLEMENT real File API filename search + persistent IndexedDB inventory

**Date:** 2026-11-18  
**Status:** **IMPLEMENTATION AUTHORIZED** by the user. This is a working feature request, **NOT research-only**.  
**Repo:** `thanks-cohn/Click2Cloud`. **Work on an isolated feature branch; do not change `main` or ReDown.**  
**Sequence:** **STEP 1: scoped UX fixes** → **STEP 2: IMPLEMENT this complete filename system** → **STEP 3: final READ-ONLY Click2Cloud versus ReDown architecture investigation**. Do not start Step 3 before this is tested and reported.

## Product requirement: ship a working filename system, not just a design

Create a production-quality, reusable **File API filename/folder-name search** backed by a **persistent IndexedDB metadata inventory**. Repeated searches for filenames that have already been indexed should search LOCAL IndexedDB rather than repeatedly calling Cloudflare R2. The GUI is a small client of the shared File API, **not a parallel search engine**. Cloudflare R2 is the remote source of truth and IndexedDB is a verifiably scoped, freshness-aware *cache*, not cloud authority.

**Concrete output at the end:** real code wired end-to-end; working V1 API; working Search input/results in File Explorer; durable IndexedDB records; correct cache/freshness/invalidation; automated tests and benchmark evidence; report precise changed files, tested scenarios and remaining gaps.

Read and follow [the complete File Explorer feature/UX proposal](../../codex-ideas/FILE-EXPLORER-FILENAME-SEARCH-BAR-2026-11-18.md) and [prior IndexedDB research specification](CODEX_READ_ONLY_INDEXEDDB_FILENAME_CACHE_ARCHITECTURE_2026-11-18.md) for architectural questions, **but the present request supersedes all prior "design-only/read-only" language for the filename/search feature itself**. The older file remains technical background, not the active execution instruction. Do not alter any previously approved UX decisions.

## 1. Inspect the actual current implementation before editing

- Pin/report exact current source commit(s) and follow existing extension build/test conventions. Audit `src/explorer/listing-view.mjs` (`createListingReader`, currently in-memory bounded page cache, TTL, request coalescing and abort/epoch logic), `extension/app.mjs` (`listingReader`, `listFolders`, `loadListing`, navigation, Explorer toolbar, history, CRUD, theme and connected account transitions), and associated API/engine dispatcher/Worker/inventory source.
- Find the existing IndexedDB stores, schema version, migration pattern, transaction ownership and MV3 context. Never assume it is safe to open a new ad-hoc database without inspecting current storage.
- Audit the existing Cloudflare folder listing with `prefix`, `delimiter`, cursor/page continuation and common-prefix directory semantics; distinguish actual files, folder-marker objects and inferred folders. **R2 does not provide a general-purpose server-side substring filename search**; search metadata obtained through authorized directory listing.
- Reuse established File API contracts and network authorization/reconnect/recovery, not direct R2 calls from a new UI path. Do not replace or weaken the actual save/transfer engines.

## 2. Implement the real V1 File API search

V1 searches **only names of immediate files and immediate child folders of one explicitly identified directory**, even when there are thousands of entries across many listing pages. Scope must include verified provider/connection, account, bucket and canonical directory prefix.

- Implement a stable API operation (e.g. `searchDirectoryNames({connectionId,accountId,bucketName,directoryPrefix,query,pageToken,pageSize,refresh?})`) using existing naming and dispatch conventions, including version/permission checks.
- Use case-insensitive partial basename matching with defined Unicode normalization and consistent filenames/extension behavior; preserve exact object keys and types in returned actions; do not download object content or infer a broader search scope.
- Return records with exact key/prefix, folder/file kind and parent, as well as trustworthy `nextPageToken`, `complete`, and **cache provenance** (`source:cache|cloud|offline`, `asOf`, `stale`, `refreshing` or equivalent), with a stable documented error contract.
- Distinguish `complete directory inventory` from a page of matches and distinguish exhausted search-result pagination from exhausted provider-listing pagination. A first R2 listing page must NOT be called a complete search. If no network and only partial inventory exists, clearly label results partial instead of asserting no matches.
- Empty search resets to ordinary current-directory browse; no unrelated directory or account is searched, and stale results never bleed into the next view.

## 3. Implement durable IndexedDB filename inventory

Design and actually create/update the necessary **versioned stores, keys and indexes** in the application's appropriate IndexedDB owner. At minimum store per-scope directory manifest (complete/incomplete, cursor/checkpoint as needed, fetch/validation times, freshness policy, generation, provenance) and **exact immediate-child metadata** indexed by connection/account/bucket/parentPrefix and normalized basename.

- Persist the minimum metadata necessary to search, no full file bytes, OAuth tokens, passwords, private credentials or unrelated account data. Canonicalize scope and keys deterministically so same names in different parents/accounts cannot collide.
- For V1, prefer a practical **scoped directory-entry index + local filter** when fast enough; evaluate prefix and substring patterns honestly. IndexedDB B-tree indexes do not directly accelerate arbitrary `includes` queries. Add more complex n-gram indexes ONLY if reproducible measurements justify them.
- Reuse/integrate the existing 10-second in-memory `createListingReader` cache, request coalescing and epoch cancellation. Have **one authoritative metadata-cache policy**—not two independently inconsistent freshness owners. Choose practical cache lifetime, capacity, schema/version upgrades and bounded eviction; show values and rationale.
- Paginate large remote inventories using bounded concurrency, backpressure and short durable IndexedDB transactions. Atomically publish a directory as `complete` **only after all pages for the intended generation have been ingested**. On crash, storage quota failure or lost reply, leave it `partial/stale` rather than a false-complete inventory.
- A **warm, complete, still-fresh** directory search should query IndexedDB and issue **zero R2 listing calls for the query**. Repeated different search terms within the same still-fresh directory should also use local data. Coalesce concurrent cold misses/refreshes, and allow an explicit Refresh to revalidate.
- When offline/stale/incomplete, provide a visible honest last-known/partial state and non-destructive fallbacks. IndexedDB failure must never block ordinary Explorer listing or right-click saves. Avoid silent false negatives and permanent stale caches.

## 4. Refresh, invalidation, account and mutation safety

- On create folder, file upload, delete, rename, copy, move and bucket operation, invalidate or reconcile exactly affected parent directories/buckets. Include BOTH source and destination parents for moves; apply cache updates only after verified cloud completion.
- On pending/uncertain/failed writes, mark affected scope stale and reconcile through existing receipt machinery; **do not represent the local inventory as independently verified cloud save proof**.
- External-device/provider-side changes are not announced to local IndexedDB. Implement a defensible TTL and manual-refresh path, optional controlled stale-while-revalidate, plus clear timestamps/source labels, and do not promise continuous cross-device synchronization.
- On sign-out, account switch, token/session/permission changes, clear or isolate affected scopes as privacy and correctness require; reject late async responses using generation/session fencing.
- Handle MV3 background restart, multiple Shelf windows, concurrent readers, transaction aborts, corrupt/stale rows, storage-pressure/quota and schema migration. Avoid uncontrolled background full-bucket crawls, startup delays or permission expansion.
- No live Worker provisioning or Cloudflare deployment simply to populate the search cache; do not request account-wide access that existing authorized current-folder listing did not need.

## 5. Implement and wire the File Explorer search UI

- Maintain the already requested single-row header with the sun/moon **top-right at all default/narrow supported sizes**, all Debug Mode-only controls and footer cleanup from the UX-first step. Do not regress those features.
- Add a **real, focusable Search filenames… input** in the unused horizontal space **after Back/Forward/Up/Refresh and before the Explorer More button**. Size it responsively: show when usable width exists; hide/collapse FIRST when tight while preserving navigation and More. It can also appear in the single-row toolbar; 2-row mode keeps **+ Right Click**. Do not duplicate search or leave a broken placeholder.
- Press **Enter** to execute the File API operation; do **not** call the cloud on every keystroke. Clear/escape resets to ordinary directory listing; directory change cancels/invalidates the display and updates the API scope; changing theme or window size does not change API semantics.
- When collapsed, provide a discoverable keyboard/More path to search without introducing a permanent third row or moving the header sun/moon.
- Preserve Go-to-path/address navigation via Explorer More or suitable accessible shortcut, but make filename search the main visible input whenever room allows.
- Render actual matching folder/file rows in existing Explorer list/gallery with existing selection and file actions; support loading, empty, partial, stale, offline and error states with honest counts and accessible announcements. Never show "no results" if only one page of a directory was inspected.

## 6. Tests, benchmarks, safety and acceptance gates

**Do not claim success solely because the code compiles.** Add real isolated automated tests using fake IndexedDB and/or browser Chromium fixtures where appropriate, with mock listing/Worker API and no user cloud mutations. Validate:

1. Cold search lists and ingests all required directory pages; warm repeated searches fetch from IndexedDB and produce **no extra provider listing calls** while fresh.
2. Case-insensitive partial matching, file extensions, common-prefix folders, folder markers, Unicode, duplicates under different parents and account/bucket isolation.
3. Directory with large paginated contents; cancellation during paging; incomplete/expired inventory; honest result provenance/completeness.
4. Folder creation, upload, copy, move, rename, delete, uncertain outcome, external write aging/refresh and sign-out/account switch; correct invalidation and no authorization leakage.
5. Crash mid-pagination, MV3 restart, simultaneous Shelf tabs, stale async response, failed IndexedDB transaction, quota pressure, migration and safe fallback with no save-engine regression.
6. GUI at default/narrow/wide Shelf widths, all three aesthetics, Debug OFF/ON, search responsive placement, Enter-only submission, keyboard shortcuts, 50/50 reset, ordinary listing and existing Explorer CRUD/right-click behavior.
7. Benchmarks at 100, 10,000 and simulated 1,000,000 file inventories (representative distributions); report cold/warm p50/p95, memory/DB size, request counts avoided, result correctness and limitations with actual measured samples. Do not fabricate SLOs.

Run focused tests, full existing automated suite and extension build. Report what could not run or could not be validated in **installed Chrome/real authorized Cloudflare**. Do not deploy, use production buckets, silently overwrite data or broaden OAuth permissions as part of this task. If real-cloud validation requires user authorization, report it as unverified.

## 7. Delivery contract / stop condition

- **IMPLEMENT** the V1 feature code; do not stop at a report, placeholder, schema-only migration or UI-only mockup.
- **Commit** implementation and tests to your isolated branch, not `main`, and report commit SHA, changed files, public API contract and status of exact acceptance gates.
- No unrequested implementation of future `:nested`, bulk full-bucket crawls, unrelated UX, infrastructure migration, or ReDown changes. Keep future recursive scope possible in the schema/API without making it part of V1.
- If a gate fails, show the evidence and mark the feature incomplete rather than claiming it shipped.
- After reporting STEP 2, move to STEP 3's **READ-ONLY** architecture audit only once this phase has an honest completed/blocked status. **The audit must not edit either repo.**
