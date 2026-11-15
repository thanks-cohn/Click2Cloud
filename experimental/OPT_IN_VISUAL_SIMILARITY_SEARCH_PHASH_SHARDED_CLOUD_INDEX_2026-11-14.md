# Experimental — Drag-and-drop image search across connected clouds

**Recorded:** 2026-11-14  
**Product:** Click2Cloud (future possibility for a native desktop companion)  
**Status:** Owner-proposed experimental direction only. NOT implemented, tested, enabled, or a promise of an existing feature.  
**Related strategic direction:** [Opportunistic Whole Cloud hierarchy discovery](../Project_direction/OPPORTUNISTIC_WHOLE_CLOUD_HIERARCHY_DISCOVERY_2026-11-14.md)  
**Related but distinct experiment:** [Cross-cloud dedupe and Time Machine](CROSS_CLOUD_DEDUPE_CANONICAL_MANIFEST_TIME_MACHINE_2026-11-12.md)

## The owner's central user experience

**Drop an image into Click2Cloud. Search an already prepared, private, multi-cloud visual index. See matches from every user-elected connected cloud location. Click a result to open the actual image or navigate to its original cloud folder.**

The goal is **fast indexed lookup**, not re-enumerating every cloud or downloading every image on each query. The progressively accumulated Whole Cloud inventory identifies candidates and preserves exact provider/account/bucket/drive/path and historical sightings. An **opt-in image fingerprinting stage** builds the visual index whenever image pixels are accessible with sufficient authorization.

Potential states of results:
- **Exact content match** — independently computed cryptographic content hash (e.g., SHA-256), not merely matching names, paths or provider ETags.
- **Near-duplicate or visually similar** — pHash/dHash/aHash or additional compact visual features, with distances/scores and clear approximate-match labeling.
- **Historical sighting** — a previously indexed path that may no longer exist or be accessible, clearly distinguished from a verified live file.
- **Unindexed candidate** — the hierarchy knows the path but image bytes were unavailable or not opted into; do not imply pHash coverage.

Select any result to open a provider-supported, authorized native link or use Click2Cloud Explorer's exact authenticated navigation to its containing directory and select/open the file. If a provider cannot furnish a reliable direct link, navigation is the fallback. Refresh authentication when necessary. **Never fabricate public URLs or assume old paths are still valid.**

## Why lookup can be almost instantaneous

**Precompute once; query an index many times.** During bounded background indexing, decode authorized image pixels or a suitable authorized thumbnail, normalize the image for the chosen algorithm, calculate pHash and complementary fingerprints, and store a compact searchable record. A newly dropped query image is locally fingerprinted; then local index search returns candidate cloud placements without issuing an inventory API call for every file.

- pHash is typically a compact perceptual fingerprint (often 64 bits) useful for approximate similarity, including some resized/recompressed versions.
- For small collections, Hamming-distance comparison against all pHashes can already be fast. For larger collections, use tested locality-sensitive hashing, multi-index hashing, BK-trees where appropriate, bit-prefix buckets, or other bounded candidate retrieval; assess recall, false positives and update costs empirically.
- Sharding by provider/account/elected root or fingerprint partition allows bounded memory and incremental refresh, provided cross-shard searches can reach all **selected** roots.
- Exact-content hash index provides fast byte-identical lookup independently of visual similarity.
- The index should map `fingerprint / item ID → many provider placements`, since one image may appear across several clouds.
- **Latency promise is qualified**: index-only candidate lookup can be near-instant on suitable hardware and index sizes; fingerprinting the query, loading indexes, preparing previews, and verifying/opening cloud content take additional time. Benchmark p50/p95 query latency, index size, recall, false positives and cloud-open latency separately.
- Avoid unjustified promises that SHA-256, ETags, or pHash alone prove visual identity. A perceptual hash can collide or miss transformations/crops; perceptual-nearest-neighbor results are **possible matches** until examined.

## Durable data model: JSONL knowledge, indexed query projections, temporal history

**Use append-only JSONL journals as a durable, reviewable record of discovery and changes; use materialized indexes for fast querying.** Sequentially scanning all JSONL lines on every image drop would defeat the owner's near-instant-search objective. Rebuildable on-disk binary/SQLite/indexed database or equally appropriate shard maps may serve queries, but JSONL events and immutable verified snapshots remain the trusted recovery trail. Keep these layers coherent without making the index an unbacked source of truth.

Proposed event types (not implemented schemas):
- `cloud.bucket.observed`, `cloud.path.observed`, `cloud.scan.partial`, `cloud.scan.completed`
- `image.indexing.elected`, `image.bytes.authorized`, `image.fingerprint.recorded`, `image.fingerprint.failed`
- `image.placement.observed`, `image.placement.changed`, `image.placement.no-longer-seen`, `image.placement.confirmed-missing`
- `index.shard.committed`, `index.shard.verified`, `history.snapshot.committed`

Suggested per-record fields: schema version, timestamp/observation window, event ID and sequence, provider, stable authorized account ID, bucket/container, normalized object key, object version or ETag (with hash caveats), observed size/type, content digest **if actually computed**, perceptual algorithm/version/parameters, fingerprint, elected-root scope, shard ID, last verified availability and source ledger/checksum reference.

Store **multiple placements** for one fingerprint; distinguish actual same content from approximate visual matches. Preserve unchanged older observations as history. Reconstruct time-based trees and diffs from immutable snapshots and event-ledger sequences. Infer no deletion merely because a partial crawl failed to observe a key.

**Important distinction from today's code:** The current `CURRENT.json` is a latest durable namespace state; current `journal/*.jsonl` writes are checksum-wrapped full state events, not yet specialized object-change deltas. The proposed append-only semantic deltas, snapshot index and fingerprints are future capabilities. Historical inventories do not preserve file bytes or guarantee recoverability.

## Example interaction (proposed, not implemented)

1. User authorizes Cloudflare/other supported providers and **elects directories** for image indexing, perhaps `Images/` on one bucket and `Archive/Photos/` on another cloud.
2. Whole Cloud slowly accumulates their object/path hierarchy during eligible sessions. Selected image candidates may receive separate rate-limited, permission-scoped byte/thumbnail reads to derive fingerprints.
3. Every successful fingerprint and placement is journaled and committed into a searchable shard. Historical changes do not erase old observation records.
4. User drags a JPG/PNG into the Click2Cloud search surface. Click2Cloud computes its pHash/other features locally, searches existing shards, and displays grouped matches from all participating clouds.
5. User chooses a result, and the extension or native companion opens the verified file or navigates to its parent path. Offline records are labeled and may require reconnection.
6. An optional history panel shows other clouds and **previous dates/paths** where that visual item was observed.

## Privacy, authorization and reliability constraints

- Opt-in **per connected provider/account and selected directory/prefix**; the account-wide metadata crawler does not silently grant authority to read or analyze image bytes. Avoid indexing unrelated directories.
- Default to local processing and local/user-selected storage. No uploading private images, fingerprints, indexes, credentials or filenames to the developer's servers or third-party similarity services without separately informed opt-in. Sharing a common local index **between authorized Click2Cloud components** does not imply public distribution or cross-user sharing.
- Keep secrets/token material out of JSONL, snapshots and exports; treat image fingerprints and paths as potentially sensitive. Provide data retention controls and clear/delete for elected visual index without deleting cloud objects.
- Permit reasonable quotas, size/type constraints, device/network budgets, and media safety checks. Bound background CPU/memory and API operations so right-click uploads remain responsive. Native companion may offer a separately controlled faster indexer but must retain the same permissions and canonical formats.
- Handle disconnected/revoked providers, changed files, inaccessible previews, corrupted shards, concurrent index updates, partial journal writes and crashed sessions. Store digest/algorithm versions and rebuild indexes deterministically from validated source records where feasible.
- A stale record is **historical evidence**, never proof that a present-day open action will succeed. Provider link/open is subject to live access.
- **Read-only cloud operation.** This experiment does not authorize bulk deletion, deduplication, moving cloud files, deploying Workers, provisioning buckets or bypassing provider access restrictions.

## Acceptance milestones for later Codex work

1. **M0 Read-only prototype:** user selects two sample authorized directories on separate providers or accounts, receives a path inventory, and index records are created without cloud writes.
2. **M1 Fingerprinting and matching:** compute robust pHash plus exact SHA-256 from authorized image content; query dropped images; measure exact-match precision, perceptual recall/false-positive rates, latency.
3. **M2 Fast local index:** shard the compact index and confirm query path does **not** enumerate the cloud or scan entire JSONL history. Report cold/warm p50/p95, shard count, index build cost and memory for realistic collection sizes.
4. **M3 Click-to-open:** verify the correct remote provider/account/path selected across multiple clouds. Reconnection and no-link navigation work without invented URLs.
5. **M4 Durable time-machine:** write append-only observations and snapshots; reconstruct selected historical dates, preserve deleted/moved history, and survive restart, reinstallation with separately preserved index, partial scans and damaged current state.
6. **M5 Background coexistence:** slow crawl/indexer under resource budgets while real right-click saves remain fast, reliable and independently verified.

## Owner's intended future promotion

Once independently implemented and proven, the concept can become a customer-facing differentiator:

> **“Drop a picture. Find it across your clouds.”**

Complementary message:

> **“The longer Click2Cloud learns your authorized storage, the more useful your private visual index becomes.”**

Show actual coverage, indexing limitations and historical freshness. Do not advertise near-instant lookup without measured performance on real collections, or promise access to files outside the user's granted/elected locations. The feature should reward continued normal use through real accumulated utility, **not fabricated daily streak pressure**.
