# Assisted proposal — Lossless delta-first storage and adaptive checkpoints

## File/key layout (illustrative)

```text
indexes/<provider>/<connection>/<container>/
  HEAD.json
  snapshots/
    snapshot-2026-11-03T180000Z-g000100.json.zst
  journals/
    delta-2026-11-03T181245Z-g000101-g000125.jsonl.zst
  indexes/
    daily/daily-2026-11-03.index.json
    weekly/weekly-2026-W45.index.json
  recovery/
    manifest-g000125.json
```

All examples use a UTC timestamp formatted `YYYY-MM-DDTHHmmssZ` plus explicit per-namespace generation. Period labels reflect the selected local calendar policy. The R2 object keys need not match all literal folder names above, but their schema and meaning must be stable and versioned.

## Four distinct data forms

1. **Full Snapshot:** immutable compressed representation of the full **known** graph and (for entitled Time Machine) historical materialized file identities at a verified generation. Existing snapshots are never overwritten. The one-time initial inventory crawl is paginated/resumable and independent of selected menu depth.
2. **Delta Segments:** small immutable append-only groups of verified record changes, exact before/after/identity/provenance, monotonically sequenced and idempotent. Unchanged observations do not grow the semantic journal. Provider feed events require verification/deduplication; feeds may have gaps.
3. **Daily / Weekly Indexes:** small recovery-point manifests of generation ranges, segment references, hashes and completeness. Weekly indexes point to daily indexes rather than copying their contents. They can exist even when no full snapshot was taken during the period.
4. **HEAD:** tiny stable pointer with latest generation, snapshot lineage, segment hashes and last confirmed timestamps. It is **not** a duplicate full inventory and must never advance to unverified objects.

A local IndexedDB current-state graph is a read-optimized materialized projection; it can rebuild from the external private checkpoint chain. Chrome's native menu is separately pre-registered from this graph—no reads at the instant right-click opens.

## Adaptive snapshot and Time Machine retention

- Trigger snapshots based on **measured** replay time, number of segments/deltas, or mutation density, *not* because a giant cloud happened to reach Sunday. A weekly named **restore point** can simply reference the latest prior full snapshot and all later segments.
- Preserve historical Time Machine references: compaction creates a newer snapshot **without throwing away older events/snapshots still required by promised as-of history**. Cold/archive tiers can optimize cost but must remain accessible according to user retention settings.
- The user's history policy remains `Daily` (default), `Weekly`, `Off`; `Off` disables new dated restore-point labels, not CURRENT or the operational journal. Premium RFIS historical retention and explicit deletion are separate entitlement/policy choices.
- A full snapshot is **not** a provider-wide rescan. It is serialization of the committed known graph. Current coverage/freshness metadata must disclose external changes not yet discovered.
- Each provider/connection/container has separate namespace, cursor/frontier, generations, encryption scope, availability and history. Public read access to a bucket does not authorize public directory-index backups.

## Failure atomicity and multiwriter discipline

- On-device: use a single IndexedDB readwrite transaction for affected node records, events, verified scan cursor and CURRENT generation.
- Remote: upload immutable segment(s), validate exact bytes/hash/readback, upload immutable generation manifest, and **only then** advance HEAD using conditional update or single-writer/lease/conflict resolution. Remote publication may be pending after the local transaction; do not claim it already survived Chrome deletion until verified.
- Journal replay requires a valid chain: known snapshot checksum, ordered/non-overlapping segments with no sequence gaps, approved namespace and schema. Apply each event at most once; conflicting `eventId` is an error, not last-write-wins.
- Interrupted writes keep the last verified HEAD valid. Retain sufficient orphaned segments for safe garbage collection after references are examined.
- External deletion/revoke/reconnect cannot cause deletion of known metadata without explicit verified scope evidence and appropriate privacy/retention policy.
- Encrypt snapshots/segments/HEAD-related sensitive metadata before placing them in the independently authorized private backup destination. Authentication credentials are never exported; restoring requires reconnect. Test restore from a disposable Chrome profile with no prior IndexedDB data.

## Provider updates and targeted repair

- On a verified REDOWN-controlled folder mutation: update only affected records + journal and reproject the affected menu branch.
- On provider-side change feeds (where supported by scopes/capabilities): consume, verify, dedupe, update corresponding records and cursors. Never assume feed coverage of every possible external event.
- On targeted `Scan and Update`: inspect **only** selected subtree or immediate level; journal confirmed deltas. A partial scan cannot prove deletion.
- Periodic fair bounded reconciliation handles missed events and stale frontiers without routinely sweeping the whole account.

## Snapshot vs historical query — essential test

Suppose: `snapshot-G0`, events G1..G100, new adaptive `snapshot-G100`, events G101..G140. The current tree starts from G100. Time Machine query for G50 **must still be able to read snapshot-G0 + G1..G50**. Destroying G1..G99 just because the G100 snapshot exists would break Time Machine.

This remains a proposal until source-backed tests and real provider/browser checks prove the end-to-end chain.
