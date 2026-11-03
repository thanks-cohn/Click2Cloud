# Legacy persistence, export, migration and concurrent writer lessons

**Actual source:** [V3 CURRENT](https://github.com/thanks-cohn/REDOWN/blob/5041b5763541812c505c9cde6e8f79cb23a7b193/extension/right-click-current.js), [V3 source migration](https://github.com/thanks-cohn/REDOWN/blob/5041b5763541812c505c9cde6e8f79cb23a7b193/extension/right-click-v3.js#L270-L310), [background writers](https://github.com/thanks-cohn/REDOWN/blob/5041b5763541812c505c9cde6e8f79cb23a7b193/extension/background.js#L1043-L1096), [storage forensic audit](https://github.com/thanks-cohn/REDOWN/blob/94a1a5f0699eec904d989a3823d22f9bf2bd131d/FOREVER_WORKS/v3-plus-one-master-audit/06_STORAGE_INDEX_AND_JSON_REALITY.md). **New owners:** separate mode config stores, Depth own directory journal, optional RFIS history and neutral transactional registry state.

## What already exists

- Local IndexedDB database `redown-right-click-current` version 1 has `state,records,journal,pointers,backups`.
- `commitPatch()` uses **one IDB readwrite transaction** for multiple stores, compares old/current semantic record values and writes only changed journal entries. One aborted transaction rolls back all involved records. This is a strong pattern to adapt, not something to discard lightly.
- Daily(default)/Weekly/Off policy controls **on-use period rollover** and backup snapshots. `dump()` exports a JSON object with JSONL journal content. A logical `chrome.storage.local['right-click.json']` snapshot is not an actual continuously rewritten external `current.json` file.
- `readState()` reconstructs directory-node rows and invalidates freshness if identity key diverges. `acknowledge()` distinguishes desired vs native-applied pointer generations.
- `restore()` validates a backup, imports into a clean store and resets applied markers. This is **not** proof of automatic restore after uninstall or Chrome cache deletion. External encrypted backups and replay remain separate new work.

## Important migration hazards not fully specified in new drafts

1. **The old shared array is not two independent mode stores.** It holds `rightClickV3.destinations` with IDs, `parentId`, label, prefix, enabled and array ordering; Simple & Narrow used the SAME records. A new migration must preserve these old records as data, then create separate versioned Simple and Narrow views **with provenance** and without linking future edits.
2. **Duplicate identity can be destroyed by old migration.** `migrate()` rejects same ID (correct) **OR** an already copied record sharing `profileId,prefix,label` (not acceptable under new identical-path/title aliases). Do **not** run the old dedup step over the new data or silently delete user-created aliases; log recoverable conflicts and preserve each distinct original ID.
3. **ParentId and old hierarchy carry meaning.** Invalid/circular/mismatched parent references are flattened with a recovery record, not always restored exactly. Import should first export validated original+raw migration provenance, then choose specific per-mode compatibility transforms and allow rollback.
4. **Default bucket authorizations are exact.** The old `defaultBucket` is a pointer to a prepared `profileId/accountId/bucketName`, not a label. Never overwrite a user-chosen default when automatically creating `redown` for a fresh account, and never infer readiness from cached profile alone.
5. **There were bypass writers.** `setupRedownQuickDestination` directly writes `chrome.storage.local.rightClickV3`; global activation and scope edits have their own writers; `ensureV3Only()` migration also writes local. Even when normal `commitV3Current` is transactional, bypasses create possible mirrored-state divergence. Inventory **all** writers before migrating.
6. **Scope generation ≠ menu presentation revision ≠ data event sequence ≠ Chrome acknowledgment.** Version separately. This is needed to prevent an optimistic add/rename from being reported installed before a newer account or different mode was selected.
7. **Two windows and crash recovery.** One UI may save against an old revision; a durable compare-and-swap should reject or safely merge before it can overwrite the other. Persist unsaved draft state only where appropriate, and make cancel/reload unambiguous.
8. **Quota and compaction.** Huge clouds cannot receive duplicate full snapshots daily. Keep current graph materialized, small immutable journal segments and a small HEAD. Daily/weekly indexes reference segments; compaction is adaptive and cannot discard historical segments needed by promised Time Machine queries.
9. **Secrets and private history.** The old `safe()` omits selected token-like *field names* but does not prove a complete recursive privacy boundary; use strict schema allowlists and encrypted, user-authorized off-Chrome storage with tested key recovery. Private directory names are sensitive even without tokens.

## Required migration acceptance

- One original record with explicit `parentId`, one disabled record and two separate IDs with identical `prefix+label` all survive compatibility import or enter a **visible recovery report**, never silently disappear.
- Restore an existing manually chosen `redown` default and an alternate account without switching accounts or re-creating the bucket.
- Establish per-owner config revisions; switch Simple→Narrow→Depth and verify unrelated stores' generation/hash are bit-for-bit unchanged.
- Inject: IDB commit success but mirror fails, mirror success but IDB aborted, native menu rejection, restart during write, two concurrent editors, stale scan callback and partially uploaded external snapshot.
- Backup+ordered delta replay produces exact canonical graph at generation N; as-of query for earlier N remains possible after compaction if history retained.
- Recovery after deliberate deletion of Chrome extension storage is **OPEN** until a separate encrypted private verified external snapshot+segment chain and key reconnection exist.

**Never wipe existing REDOWN owner data or assume installing Click2Cloud migrates another extension's storage automatically.** User-controlled import and account authorization are separate design stages.
