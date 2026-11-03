# Depth — efficient CURRENT, journal and checkpoint chain

## Physical and logical structures

- Durable local graph: `directoryNodes`, keyed by `[providerKind,connectionId,accountId,containerId,exactPrefix]`. IndexedDB transactions update **only affected records**.
- Durable scan state: per-scope/parent cursor, pending child frontier, completeness/freshness, accepted observation generation and retry budget.
- Semantic journal: strict ordered namespace-scoped `seq` and stable idempotent `eventId`. Record confirmed directory adds/removes/moves or observation corrections, with precise `observedAt`. An unchanged check emits no semantic directory delta.
- Mutable `CURRENT` pointer: latest fully committed local graph generation; no external publish falsely marked durable.
- Independent encrypted external archive (optional user-approved) for recovery after deletion of Chrome storage, not in a public R2 bucket.

```text
HEAD.json
snapshots/snapshot-2026-11-03T180000Z-g000100.json.zst
journals/delta-2026-11-03T181245Z-g000101-g000125.jsonl.zst
indexes/daily/daily-2026-11-03.index.json
indexes/weekly/weekly-2026-W45.index.json
```

Full Snapshot = **known** directory graph at a verified generation. It is neither a guaranteed real-time cloud truth nor a fresh cloud rescan. Create adaptively when measured replay cost/segment count justifies it, not as a mandatory giant daily duplication.

Daily (default) / Weekly / Off schedules **named historical restore-point references**; the small daily/weekly indexes reference existing immutable delta segments and parent checkpoint(s), never duplicate event bodies. Off disables new historical restore-point labels, **not** CURRENT, its journal, or live menu safety.

## Atomicity and crash recovery

A single local transaction must commit graph changes, semantic journal sequence, scan cursor/frontier and CURRENT generation together. Native Chrome registration and remote backup upload are separate operations whose progress/failure is tracked independently. A new external HEAD can point only to verified immutable snapshot/segment/manifests with digest and valid lineage. Use a single-writer or generation-CAS/lease protocol for concurrent browsers.

Recovery validates scope identity, schema, snapshot digest, every contiguous segment/digest and target generation, then replays deterministically. On missing/corrupt segment: report incomplete, retain last verifiable generation. Never silently initialize empty CURRENT after a cache miss. A user who clears Chrome local extension data needs an **already verified independently stored** backup and reconnection/key recovery path; do not claim the local IndexedDB alone survives deletion.

Deletion/tombstones require confirmed provider mutation or complete authoritative, authorized parent listing with appropriate semantics; a missing child on partial/expired listing is not proof. R2 virtual prefixes inferred from keys differ from explicit directory marker objects.

Compaction may not remove segments still needed by retained snapshots/historical restore points; Time Machine's richer file biography and retention are independently owned.
