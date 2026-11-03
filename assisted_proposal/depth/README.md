# Depth — V3+1 Assisted Proposal

## Codex self-contained rebuild package

Start with [CODEX_START_HERE.md](CODEX_START_HERE.md). This directory contains the immutable V3 original algorithm and CURRENT implementation under `reference/`, executable isolated reference contracts under `src/` and `tests/`, and detailed, ordered rebuild instructions in documents 01–07. **Only two tiny reference functions exist so far; the production-grade rebuild remains to be implemented and verified.**


**Date:** November 3, 2026. **Status:** Authoritative *proposed* Depth contract for this branch, **not** completed implementation.

Depth is **one independent engine**. This directory documents what **Depth owns, what it can read, and what it is forbidden to touch**. For the entire four-engine isolation boundary see [Independent Engine Ownership Contract](../ENGINE_ISOLATION_CONTRACT.md).

## Depth's exclusive responsibilities

1. **Participating scopes and display setting:** Track opt-in cloud accounts/buckets and numeric right-click menu depth (currently 1..10). These are Depth-only settings, separate from its inventory generation.
2. **Full *known* directory topology:** Build and retain a maximum-reachable-depth **folder index** of explicitly authorized scopes; an initial bounded, paginated, resumable crawl is needed. The menu's chosen display depth must **never** stop the long-term inventory from discovering deeper folders, discard already-known nodes, or force a whole-tree rescan merely because the display depth changes.
3. **Verified incremental updates:** Consume REDOWN-confirmed folder mutations, permitted provider change-feed observations, and selected manual **Scan and Update** reconciliation. Diff exact cloud identities, append only semantic directory changes; unchanged observations emit no directory-change delta.
4. **Depth-owned storage:** Maintain independent local materialized folder graph, scoped scan frontier/checkpoints, directory journal sequence, generation, freshness/completeness, adaptive immutable snapshot references and restore metadata. Use the delta-first design in [Storage and Checkpoints](../STORAGE_AND_CHECKPOINTS.md), without duplicating an entire graph per day/week.
5. **Pure menu projection:** Express the current authorized, known folder hierarchy up to the user's selected menu depth (root level 0, real folder names, exact `Save here` actions for branches, direct boundary leaves). Output deterministic stable IDs and exact provider/account/bucket/prefix targets. Chrome's native menu-entry budget bounds *presentation*, never stored directory knowledge.
6. **Safe resolution:** Revalidate clicked actions against the currently registered plan and current account/scope permissions. Fail closed on stale/unauthorized/omitted rows; never route by visible label or fall back to an unrelated default.

## What Depth must NEVER own or call

- **Simple:** no `simpleConfig`, no flat shortcut labels/defaults, no Simple projection, no writes to Simple revisions.
- **Narrow:** no Narrow aliases, selected paths or presentation hierarchy; the new Narrow renderer will be a separate engine.
- **Time Machine:** no historical file `file_id` biography, per-file tracking selections, Premium entitlement, as-of file-history query, or writes to RFIS settings, events, revisions or retention state.
- **Chrome registry internals:** Depth outputs a finished descriptor plan to a neutral registry but does not manage global multi-provider composition, mode switching, native `removeAll`, or direct menu registration.
- **File storage operations:** reading a directory for inventory never creates, copies, deletes, or changes cloud content. Actual save/delete/create operations belong to the verified provider dispatcher.

**Shared provider adapters are allowed as neutral input** (list exact scoped folders and verified change observations). A provider event can fan out to Depth and Time Machine independently; their databases and generations stay separate. Depth must not subscribe to **Time Machine tracking-selection events** as folder mutations.

## The exact tracking isolation guarantee

```text
User: Time Machine > Track existing directory "Clients/2026"
  Time Machine tracking revision: +1
  Time Machine's own index/event activity: permitted
  Depth configuration revision:    UNCHANGED
  Depth directory generation:      UNCHANGED
  Depth directory knowledge:       UNCHANGED
  Depth scan frontier:             UNCHANGED
  Depth native menu plan / IDs:    UNCHANGED
  Simple/Narrow configuration:     UNCHANGED
  Cloud directory mutations:       NONE
```

The only legitimate reason Depth's menu **could** later change is **independent verification of an actual underlying cloud folder-structure change**, not a history-tracking preference. If a Time Machine tracking scan observes a real previously unknown folder, the architecture must not secretly rewrite Depth merely because the user enabled tracking. Depth can independently ingest that same verified provider change via its own neutral observation subscription and authority checks; its menu is never driven directly by Time Machine.

## Scoped Scan and Update

From a **real Explorer directory context menu**, offer a fast **Scan This Folder (immediate children)** and an explicit **Scan Folder and Subfolders (recursive)**. Verify the selected exact folder path with a bounded, resumable scan. Update only verified records in that exact scope. A partial page or failure cannot imply remote deletion; no global reset, no unrequested bucket reads. For an unchanged subtree produce zero semantic journal deltas. Show exact checked scope, complete/partial, observed additions/removals, and resume affordance. A recursive scan of bucket root is bucket-wide and should be labeled as such.

## Current and historical storage boundaries

- The Depth folder index is designed for **fast present-tense navigation**, with enough retained directory history for reconstruction/recovery. The separate Premium Time Machine stores full file identity and historical placement lineage.
- **Full Snapshot:** occasional verified immutable snapshot of complete *known* directory graph; this is a serialization of CURRENT, **not an automatic full provider rescan**.
- **Delta Segment:** immutable batch of changed directory records with monotonically increasing namespace-scoped sequence numbers; no repeats for unchanged paths.
- **Daily / Weekly Index:** small manifest references to snapshots/segments; not duplicate full JSON tree. Daily/Weekly/Off determines restoration-point labels.
- **HEAD:** small stable latest verified manifest/generation pointer; no unverified segment references. Large remote backups require an independently authorized encrypted private destination and actual read-back verification.
- Maintain last-known-good folders after crash, failed scan, or network/auth loss; authorization to save still must be checked before dispatch.
- Compaction may never break promised historical reconstruction; Time Machine independently enforces stronger retention of its own file events.

## Verification gates

1. Seed a real R2 folder hierarchy deeper than 10 under multiple distinct accounts/buckets; while menu depth is 1, prove the durable inventory retains all levels and that 1→10→2→10 only reprojects native entries.
2. One confirmed REDOWN folder mutation updates only the affected Depth record and one directory event; a file upload into an existing folder produces **no redundant directory event**.
3. Change a **Time Machine tracking selection only** and assert byte-for-byte identical Depth config/inventory generation/menu plan/IDs/routes and zero Depth listing calls.
4. Switch Simple or Narrow: preserve Depth inventory and scan frontier and no new cloud enumeration merely due to mode selection.
5. Scan a selected subtree, repeat it unchanged, then inject failure/timeout/partial cursor: no false deletions; unrelated scopes untouched.
6. Replay immutable snapshot and delta segments to the exact Depth generation; corrupt or missing segments produce explicit recovery failure.
7. Disconnect/revoke one bucket: old history retained but unsafe save actions disabled; unaffected buckets remain operational.
8. Verify flat non-S3 provider menus and unrelated provider registration are not changed by a Depth-only revision.
9. Confirm real installed Chrome native submenu IDs and route receipts before transplanting; static unit tests alone cannot establish browser/provider parity.

## Relationship to original V3

Original REDOWN V3 source-preserved baseline:
- `../../original_proposition/src/modes/depth-v3.mjs`
- `../../original_proposition/tests/simple-depth-extraction.test.mjs`

That V3 code still bounds discovery by selected display depth and uses shared Simple default logic in the old combined wrapper; **it is not the finished assisted full-index architecture**. Keep the baseline unchanged for proof-based comparison. No Narrow rewrite, live provider registration, external backup writer or independent Time Machine runtime is claimed to exist yet.
