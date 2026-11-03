# V3+1 Depth — complete cloud index, independent menu depth, and durable JSON recovery

**Owner correction, 2026-11-03. This supersedes any Click2Cloud text that describes selected Depth 1–10 as the limit of the persistent cloud inventory.**

## Intent and immutable separation

Depth has TWO distinct numbers:

- **Inventory scan depth:** no arbitrary menu-depth ceiling. Continue collecting the entire reachable, authorized cloud folder hierarchy through all actual cloud levels, using provider pagination, recursion/frontier queues, and bounded, resumable scanning. Report partial knowledge as partial. The only stopping conditions are a truly exhausted traversal, loss of authorization, provider/API limits, or a deliberate user-approved scope.
- **Menu presentation depth:** the user-visible Depth 1–10 setting from the existing V3 contract (potentially adjustable later). This only selects how much of the indexed tree is expressed in a right-click menu. It must **never** trigger the deletion of deeper graph nodes or act as the scan's permanent upper bound.

Depth is not configured-shortcuts lookup. It starts from selected, activated bucket roots; independent folder inventory is the source of its hierarchy, and native Chrome presents a bounded view subject to menu-entry constraints. Existing folder identities must be exact provider/account/bucket/prefix or provider equivalent, not display labels.

**Simple** owns only Simple configuration, aliases, labels and flat destination projection. **Narrow** will be wholly rewritten later and owns only Narrow-specific configuration and shortcuts. **Depth** owns discovery, graph, scope, snapshots, depth setting and projection. They must not import, call, or write one another. They may call provider adapters that expose read and save functionality. A neutral registry accepts only the chosen mode's finished descriptors and routes stable IDs without interpreting mode-private state.

## Three durable information layers

1. **Live current graph:** append/update verified provider folder observations into an indexed graph (locally IndexedDB or equivalent while Chrome is running). Changes become visible promptly in the Portal and next valid registered menu projection. Preserve last-known-good nodes on incomplete pages.
2. **Incremental append-only journal:** record versioned, scoped changes (new folder, renamed/moved path if safely observable, tombstone only with confirmed absence/deletion evidence, scan-frontier progress, authorization transitions). An unchanged observation need not create a duplicate event. Journal segments carry monotonic sequence numbers, base snapshot IDs, checksums and transaction metadata; replay must be deterministic and idempotent.
3. **Periodic JSON snapshots:** write a complete, validated **daily `current.json`** and **weekly `weekly.json`** snapshot of the accumulated directory graph, including scan frontier and completeness state. Use dated/versioned keys (for example `daily/YYYY-MM-DD/current.json` and `weekly/YYYY-Www/weekly.json`), plus a small verified latest pointer. Snapshot is cumulative, not a copy of just the day/week's newly visited folders. Changes between snapshots are replayed from the journal. Period rollover is on scheduled maintenance and on next actual use; a sleeping/offline client may not write at exactly midnight.

### Browser-data deletion recovery

**IndexedDB and chrome.storage.local are not sufficient after the user deletes Chrome extension data or uninstalls it.** For genuine recovery, the portable JSON snapshots and journal must also live **outside the extension's local storage** in a private authenticated, encrypted and verified destination (e.g. an explicitly provisioned private R2 backup/index location). Never store the folder index in a public `r2.dev` bucket or log credentials/tokens in snapshots. Restore requires the user to authorize/reconnect the provider and private backup store as needed. Verify schema, cryptographic integrity, authorized account/bucket identities, base snapshot and replay order before restoring. Fail closed for missing authorization or mismatching scope. External backup and fully automated recovery are **not** features of the current extracted V3 code.

A backup may include private directory names, so treat it as sensitive information with appropriate encryption, permissions, retention and restore controls. Use commit-then-pointer checkpointing; never overwrite the only recoverable backup before verifying the replacement.

## Incremental/full discovery scheduling

- On connection/activation, expose verified bucket roots immediately and start a **bounded background crawl**; continue from persisted per-bucket frontier across service-worker restarts rather than blocking right-clicks.
- On observation or user-created folder, update the graph and journal promptly; refresh affected subtrees without rescanning all buckets.
- On daily maintenance, reconcile changed/bounded subtrees and checkpoint a cumulative `current.json` with the latest progress.
- On weekly maintenance, produce a recoverable `weekly.json` snapshot and reconcile progressively deeper branches until full authorized traversal is complete. Daily/weekly describes persistence cadence, not an instruction to rescan a giant cloud from scratch every day.
- On manual Refresh, resume/reconcile explicitly selected scopes. Do not equate an empty partial page to folder deletion; only confirmed mutations or complete, consistent observations permit tombstones.
- If a cloud contains more folders than can be scanned in the current request/page/time budget, keep a durable frontier, show truthful progress and eventually continue. Never claim the entire cloud has been collected if any participating scope is still incomplete.
- Source/click provenance and access tokens do not belong in the inventory JSON or provider object-upload payloads.

## Right-click expression (unchanged user-facing semantics)

For a discovered chain `redown/depth-spine/level-01/.../level-15`, a menu set to Depth 3 shows only `depth-spine/level-01/level-02` relative to bucket root. The graph **still remembers** levels 3–15. Selecting Depth 10 simply reprojects an already-known graph without a new crawl, assuming the cached snapshot remains authorized/fresh enough for the requested action. Nodes with children receive a precise `Save here`; boundary nodes are actionable. Stable IDs map to precise identity+prefix. Chrome's native entry budget may truncate the *menu* without truncating the *graph*.

## Tests and acceptance

1. Seed a real private 16-level chain and wide/unconfigured siblings; complete indexing to the actual maximum while menu is set to Depth 1.
2. Change menu 1→10→2→10 with **zero graph deletions** and **no scans caused solely by changing presentation**; byte-for-byte equivalent projections for unchanged snapshots.
3. Enforce mode isolation: Depth graph/config/snapshot changes do not alter Simple/Narrow and vice versa.
4. Pause mid-pagination; restart browser/service worker; deterministically resume from stored frontier, preserving known folders.
5. Inject partial/error/expired cursor/authorization failure; preserve last valid graph and show incomplete status, no false tombstones/successes.
6. Create a new folder outside REDOWN and reconcile the new branch; prove ordinary user changes become visible.
7. Daily graph snapshot, weekly graph snapshot, and incremental journal replay reconstruct the same canonical graph, with hashes/sequence checks.
8. Delete all local extension IndexedDB/storage in a disposable profile, reconnect, download a **private external backup**, verify and restore graph and configuration; fail when no independent backup exists.
9. Verify public bucket and private bucket object data are not confused with private index-backup visibility.

## Exact current REDOWN vs owner intent

The source-preserved V3 `extension/right-click-v3.js` currently uses `limits.depth=10`, includes presentation depth in `inventoryKey`, and `discover` stops at `options.depth`. Its `rememberedNodes` also limits cached node level to `limits.depth`. This is **not yet compliant** with the owner's V3+1 full-index intent.

The `src/modes/depth-v3.mjs` file is a traceable V3 baseline extraction only. It deliberately preserves that code for parity and audit. The V3+1 implementation must **separate a maximum-depth independent indexer from the preserved Depth menu projector**, then make the projection a pure view of the persisted graph. Do not silently change Simple, Narrow, or REDOWN production to do so.

The old REDOWN CURRENT IndexedDB implementation already has state/records/journal/pointers/backups and an exportable JSONL journal; its daily/weekly backup policy rolls over on use. It does **not** currently produce continuous physical `current.json`/`weekly.json` files or automatically persist recoverable independent cloud backups. That gap must be implemented and tested rather than described as shipped.
