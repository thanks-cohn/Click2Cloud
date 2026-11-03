# V3+1 — Delta-first inventory storage: canonical names and recovery contract

**Owner-approved direction (2026-11-03); implementation pending.** This supersedes the old idea of rewriting daily and weekly full JSON inventories. The goal is minimal duplication even for extremely large cloud accounts.

## Canonical vocabulary and filenames

| Logical component | Canonical file/key example | Contract |
|---|---|---|
| **Full Snapshot** (immutable base checkpoint) | `snapshots/snapshot-2026-11-03T180000Z.json.zst` | One complete **known** authorized directory graph at captured generation; produced occasionally (typically weekly), not for every edit |
| **Daily Index** (immutable or versioned manifest of sealed day) | `indexes/daily/daily-2026-11-03.index.json` | References the day's **existing** immutable delta segments by key, first/last sequence and digest, without copying events |
| **Weekly Index** (small manifest) | `indexes/weekly/weekly-2026-W45.index.json` | References daily indexes and their checksums; no duplicated deltas |
| **HEAD** (small current-state pointer) | `HEAD.json` | Versioned schema, last-known snapshot ID, latest committed generation, included journal references, `updatedAt`, completeness and scopes; no full-tree rewrite |
| **Delta Segment** (immutable actual change payload) | `journals/delta-2026-11-03T181245Z-000101-000125.jsonl.zst` | One contiguous, idempotent namespace-scoped sequence range of real committed changed records |

**Name formatting:** `YYYY-MM-DDTHHmmssZ` is an unambiguous UTC timestamp safe for object keys and Windows filenames. Day/weekly period labels are based on the owner's selected calendar-timezone policy (e.g. `2026-11-03` and ISO `2026-W45`), separately from the actual UTC instant. Never claim a scheduled operation happened while Chrome was sleeping; use real captured-at timestamps.

**HEAD is intentionally not timestamp-named**: it is a stable lookup key whose content is a monotonically versioned manifest with `updatedAt`. Each previous HEAD generation should remain recoverable via immutable manifests or pointer lineage before advancing.

**Daily and Weekly Index files are references, not redundant event collections.** An active journal tail exists transactionally in IndexedDB. R2 object storage has no in-place append in the usual PUT flow, so flush live changes as bounded immutable timestamped delta segments and then publish a small, verified manifest/pointer. Do not rewrite a growing remote `current-delta-journal.json` on each edit.

## Current-state equation

```text
CURRENT = latest verified Full Snapshot
          + ordered sealed Daily Delta Segments since that snapshot
          + ordered committed live Delta Segments (tail)
```

The application **materializes** the current full known graph in an indexed database for fast menu projection. `HEAD.json` is a pointer into that graph's recovery chain, not a second copied full tree. An export API may still produce `current.json` as a complete portable view on request; that is a derivative export, not a second mutable source of truth.

A weekly new snapshot is generated from the **committed local/indexed known graph**, *not automatically a full cloud rescan*. The known graph may be incomplete/stale relative to external cloud operations. Completion/coverage/freshness are explicit metadata; never confuse a complete serialization with exhaustive up-to-the-second provider coverage.

## Change handling

- **REDOWN-confirmed folder changes**: update changed indexed nodes + append one idempotent event transactionally, immediately reproject affected Depth menu entries. No whole-tree rewrite or global rescan.
- **REDOWN upload into an unchanged existing folder**: do not generate a redundant directory-structure delta; transfer receipt/history is separate. New previously unknown folders can be added as directory discovery events when verified.
- **External provider edits**: may be unknown until a supported provider event or bounded targeted reconciliation observes them; do not promise instantaneous capture without provider notification/permissions. Repeat observation of unchanged paths produces zero semantic events.
- **Safety**: missing/partial pages, stale authorization, and timeout do not imply deletion; only confirmed deletion or complete authoritative scoped verification permits tombstones. Revoked scopes fail closed for saves even if retained as historical records.
- **Selected Depth** only changes menu projection; it cannot discard deep graph knowledge or trigger whole-tree scans.

## Atomicity, rollover, corruption and restore

- Local IndexedDB transaction: changed directory records, corresponding journal events, generation/HEAD metadata, and scan checkpoint must commit together. Native Chrome menu calls and remote R2 synchronization are **separate steps** with truthful pending/failure status.
- Daily/Weekly/Off policy governs **history checkpoint frequency**, not whether live deltas/current graph exist. Default may be Daily for historical restore points while full snapshot compaction remains a size/threshold-aware weekly or longer operation; never create a huge duplicate full graph daily.
- Seal day/weekly indexes on real eligible activity or an authorized scheduler; current tail can span a sleeping/offline boundary without fabricated snapshots. Roll forward idempotently.
- To restore: validate snapshot digest/schema and provider identity, load snapshot, replay ordered segments with validated non-overlapping sequence ranges, then compare reconstructed generation/checksums with HEAD. A corrupted segment/pointer fails safely and uses the last verified recovery point.
- To survive clearing Chrome extension storage: store encrypted/authenticated snapshot and journal segments **outside Chrome** in a user-authorized private storage location with verified readback, plus a viable key/reconnection recovery method. Public R2 buckets must never host private directory inventories. Automatic external recovery is **not yet implemented**.
- Segment rotation/compaction may delete redundant payloads **only after** new snapshot materialization and readback verification, no outstanding HEAD references, and retention/history policy checks. Never lose access to promised historical versions.

## Multi-cloud isolation

Namespace all snapshot, journal, and pointer keys by exact provider-kind, connection identity, storage namespace, account, and bucket/container identifier. Two accounts with the same `photos` bucket must never collide. Depth owns graph and journals. Simple/Narrow own their own menu semantics and may reference stable location identities via a neutral provider interface, never by editing the Depth journal. The shared menu registry only combines finished descriptor output.

## Verification

1. Build a known 16-level R2 hierarchy and run Depth presentation=1. Verify the graph still contains all known deeper levels.
2. Simulate 100,000+ unchanged paths and one folder add: exactly one semantic delta event and no snapshot rewrite.
3. Seal day/week manifests: same segment payloads are referenced once, not duplicated.
4. Snapshot + day indexes + live segments recreate a byte-for-byte canonical graph and exact generation.
5. Crash/partial upload/fault injection: HEAD only points to fully committed immutable objects; no missing data or duplicate replay.
6. External change remains unknown until observed, then is journaled once; repeated unchanged rechecks produce no new semantic deltas.
7. Cold restart and verified external encrypted restore work without needing a full provider sweep.
8. Mode isolation: Simple and future Narrow never mutate Depth graph/journal and Depth presentation changes never mutate their configurations.

## Relationship to V3 source

REDOWN V3's existing CURRENT implementation already has transactional `records`, `journal`, `pointers`, `backups`, and Daily/Weekly/Off; see `thanks-cohn/REDOWN/NEED_TO_DO/fundamentals.md` and `FOREVER_WORKS/v3/P0_PERSISTENT_RIGHT_CLICK_TREE_WORK_REQUEST.md`. It did not implement automatic remote immutable segment publication, independently stored recoverable encrypted snapshots or this final nomenclature. V3+1 must evolve the behavior without silently claiming the gap is complete.
