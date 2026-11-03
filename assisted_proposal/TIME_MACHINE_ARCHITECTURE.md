# Assisted proposal — Time Machine and RFIS historical contract

This expands rather than replaces the owner's delta-first concept. **A current directory tree is not sufficient to answer historical questions.** Time Machine requires long-lived, identity-linked, auditable events, including uncertainty.

## User-facing historical questions

1. **What Was Here?** Select a provider/account/bucket/folder and an *as-of* instant or recorded generation. Reconstruct the objects and folders **known to REDOWN as of that observation time** from the appropriate immutable snapshot plus ordered journal segments. Show gaps or incomplete coverage instead of inventing remote state.
2. **What Changed?** Between two instants/generations, list confirmed additions, removals, moves, renames, provider metadata updates, and any unknown/candidate relationships. Preserve the triggering actor/source, verification and revision. Distinguish a user operation from a cloud listing observation.
3. **Find This File?** Locate a stable `file_id` across its verified placements, account or bucket moves, and rename history. A path is not an identity. Two copies of the same bytes are not automatically the same file.

## Independent file identity versus Depth directory index

- Depth's authoritative purpose is the full **known folder topology** and its bounded right-click projection. It must function in Free or Premium regardless of whether RFIS is enabled.
- RFIS/Time Machine is a separately permissioned optional history subsystem. The October 2026 RFIS specification explicitly intended rich persistent identity histories for Premium while preserving useful Basic functionality.
- A verified REDOWN operation emits one neutral, idempotent event envelope after provider confirmation. Depth may ingest an affected-directory change; Time Machine may ingest file identity/placement changes when enabled. Neither directly imports or edits the other's records.
- R2 keys identify object **locations**, not necessarily durable file identities. Moves or renames performed *inside* REDOWN can carry stable file IDs when confirmed. External observations do not prove two similarly sized or hashed objects are the same entity.
- Keep a separate lightweight operational transfer History (attempt, pending, verified, failure) from historical object **identity**. A failed save is not an object-created event.

## Typed event evidence

Every committed history event must specify at minimum:
```json
{
  "schemaVersion": 1,
  "namespace": "providerKind/connectionId/accountId/containerId",
  "seq": 125,
  "eventId": "unique-idempotent-event-id",
  "entityKind": "file",
  "entityId": "stable-file-id",
  "kind": "moved",
  "observedAt": "2026-11-03T18:12:45Z",
  "effectiveAt": null,
  "source": "verified-redown-operation",
  "verification": "confirmed",
  "before": {"placement": "photos/old.webp"},
  "after": {"placement": "archive/old.webp"}
}
```

Here `effectiveAt:null` means the true external occurrence time is unknown. Real REDOWN-confirmed operation time may be known; listing time and provider LastModified never become a fabricated creation date. For each event, capture the source, confidence, canonical connection/placement, expected previous revision, stable `eventId`, monotonic per-namespace `seq`, and enough reversible before/after information for deterministic replay. Source provenance for the original web page must not be forwarded to cloud-provider upload APIs.

Two distinct timestamps:
- **Observation timeline** is exact to when REDOWN observed or confirmed an event; it enables defensible `as-of` questions.
- **Provider/effective timeline** is reported only where supported by authoritative evidence; never backdate a newly discovered folder as if REDOWN knew it existed then.

## Time travel and retained history

```text
Snapshot at generation S
 + sealed segments (S+1..G)
 + committed live events
 = state at generation G
```

Choose the latest retained snapshot no later than the requested generation; replay its required events in sequence. A snapshot from *after* a query instant cannot recover an earlier state on its own. Never discard/overwrite older deltas that historical queries still reference. After compaction, retain or cold-archive old segments and historical snapshot/manifest lineage with verifiable hashes. Any explicit user history deletion may invalidate earlier as-of queries; mark coverage gaps and honor deletion completely (including copies/archives governed by the policy).

Daily/Weekly/Off chooses the **frequency of named historical restore points**, not whether the current-state event log is appended. Daily can create a tiny named checkpoint manifest rather than a new complete full-cloud serialization. New full snapshots are adaptive and optional; long replay chains are avoided with measured thresholds, not an unconditional large weekly full rewrite.

Time Machine records folder names, paths and metadata that may be private. Encrypted externally stored backups must use a user-authorized **private** destination and supported key recovery; never put these in public development R2 buckets. Preserve independent provider-scoped event sequences and explicit multi-writer conflict handling. Unverifiable provider changes are shown as uncertain, not confirmed.

## An important limitation

A historical *metadata* index answers what REDOWN saw and where a file was, **not** whether deleted file bytes can be restored. Actual content restoration requires source provider object versioning, object retention or separately backed-up bytes and the corresponding authorization. Do not promise Time Machine restores file contents based solely on these journals.

## Required acceptance

- Create file at `A/photo.webp`, confirmed move to `B/photo.webp`: same file ID; as-of before/after resolves different locations, current is B.
- Independent copy with identical SHA-256 stays a separate file ID.
- An externally discovered object has `firstSeenAt` but unknown true creation time.
- Reconstruct exact state at arbitrary generations from immutable snapshot + sealed journals; daily/weekly index references don't duplicate event bytes.
- Compaction improves replay without erasing promised historical queries; missing segment causes an explicit coverage gap, never a false absence.
- Interrupted/duplicate operations are idempotent; noncontiguous sequence, conflicting retry, or mismatched account ID are rejected.
- Historical queries obey current authorization and configured retention/privacy controls.
- Depth display 1→10→2→10 does not alter file histories; switching to Simple or Narrow does not disable Time Machine or rewrite its journals.
- 100K+ items and synthetic high churn: benchmark memory, replay time, compaction overhead and storage before selecting codec (Zstandard is a candidate, not a mandatory runtime dependency).

## Existing source authority

- [REDOWN RFIS history and persistent identity](https://github.com/thanks-cohn/REDOWN/blob/main/docs/proposals/RFIS_PERSISTENT_FILE_IDENTITY_HISTORY.md)
- [REDOWN CURRENT-first and daily backup contract](https://github.com/thanks-cohn/REDOWN/blob/main/NEED_TO_DO/fundamentals.md)
- [REDOWN V3 persistent tree work request](https://github.com/thanks-cohn/REDOWN/blob/main/FOREVER_WORKS/v3/P0_PERSISTENT_RIGHT_CLICK_TREE_WORK_REQUEST.md)
