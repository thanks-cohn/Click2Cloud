# Legacy Depth (V3 “Level”) — inventory and bounded projection lessons

**Actual source:** [REDOWN V3 Depth discovery](https://github.com/thanks-cohn/REDOWN/blob/5041b5763541812c505c9cde6e8f79cb23a7b193/extension/right-click-v3.js#L73-L189), [refresh and registration](https://github.com/thanks-cohn/REDOWN/blob/5041b5763541812c505c9cde6e8f79cb23a7b193/extension/background.js#L2355-L2415), [Level tests](https://github.com/thanks-cohn/REDOWN/blob/5041b5763541812c505c9cde6e8f79cb23a7b193/tests/right-click-v3.test.mjs). **New owner contract:** [assisted Depth rebuild](../../assisted_proposal/depth/).

## Preserve and generalize

- **Bucket root is depth zero.** Cloudflare provider heading is outside folder levels. Menu depths 1–10 refer to descendant levels from bucket root. Branches with children need separate **Save here** action; boundary leaf remains a direct save action.
- **Independent bucket participation.** V3 `rightClickV3LevelScopes` is distinct from manually added destinations and validates exact prepared `profileId,accountId,bucketName` identities. Revoked/disabled scopes cannot accidentally fall back to a manually configured shortcut. New Depth must keep its own settings/inventory generations.
- **Fair bounded exposure.** Its menu projection reserves every participating root before breadth-first child allocation, so a huge first bucket doesn't hide every later bucket. Parent `Save here` is reserved with the parent; a half-fitted branch is not acceptable. The 300-entry menu ceiling is an **app budget**, not a measured universal Chrome limit.
- **Defensive listing.** `childPrefixes()` uses delimited prefixes *and* object keys (including folders inferred from objects without markers); verifies slash boundaries, Unicode/exact names, invalid paths and paging. Repeated cursors, truncated-without-cursor, HTTP errors and unsupported prefixes produce partial/error rather than fake completeness.
- **Remember known directories rather than deleting on scan failure.** Prior nodes bound to the *same authorized account/bucket/endpoint* survive shorter display depth and partial scans. The audited synthetic 5→3→5 sequence retained known nodes. A scope change may invalidate write permission even when remembered historical metadata survives.
- **Don't list inside Chrome hover.** The live V3 menu is pre-registered from cached plans; discovery runs separately. New full-depth index must also preserve that interaction model.

## What to REPLACE, not copy

1. **Menu depth currently limits crawler depth.** `inventoryKey` includes `presentation.depth`; `discover()` only queues nodes with `level < selected depth`. This is the main architectural mismatch with the new requirement: **retain the full reachable known graph regardless of menu Depth 1–10**. The old depth/cursor key is a *parity reference*, not the new storage key.
2. **A scan “round” was bounded by 500 new folders, 5000 known nodes, 80 pages, 20 seconds, 8 seconds per page, 300 native entries and 5-minute TTL.** Keep safety limits per work slice and an honest incomplete UI; **do not turn the 5000 known nodes into a lifetime cap** for a large cloud. Resumable persistent frontier and background continuation are needed.
3. **Old synthetic node IDs omit connectionId/endpoint.** Extend exact scope namespace for multi-S3 and account isolation. Account labels alone are not identity.
4. **Reusing a remembered prefix doesn't prove it still exists or is writable.** Listing completeness/last verified time, current auth, write authorization and native menu registration acknowledgment are distinct claims. Don't falsely present aged inventory as an exhaustive live provider view.
5. **Current is still physically IndexedDB + chrome.storage mirror.** Its daily/weekly events are local/on-use, not verified external encrypted checkpoint files; Depth's new delta-first adaptive snapshots/head must be implemented and restored, not merely named.
6. **Root/bucket changes can race with stale listings.** Preserve prior graph and reject late results associated with old auth/participation scope generations. A failed page must never tombstone another branch.
7. **Deletion semantics of virtual folders are subtle.** R2 directories are object-key prefixes: deleting the last contained object may eliminate an inferred folder even without a folder-delete event. Absence evidence requires authoritative complete list and provider consistency handling; partial pages are not deletion proof.

## Must-have tests recovered from the old engine

- 11+ / 16-level hierarchy with display depth 1; retain all levels independently of menu view; 1→10→2→10 must not cause a whole provider scan purely because of the setting.
- Multiple buckets: broad first root, several narrower later roots; reserve all roots fairly.
- Parent vs boundary leaf exact action target; selected bucket root depth zero, no label rewriting.
- Delimiter+object listing, duplicate/marker prefixes, pagination, repeated/invalid cursor, unsupported Unicode/prefix validation and error recovery.
- MV3 suspend/resume and crash after journal commit but before menu apply; stable current graph, no bogus changed events.
- Manual **Scan and Update** immediate-only versus recursive subtree: exact boundary, no unrelated reads, no false deletions, idempotence.
- Browser installed menu item count/click proof and real authorized R2 test hierarchy verification.

New Depth's self-contained [source map](../../assisted_proposal/depth/01_SOURCE_MAP.md) already has baseline files. Keep this legacy memo for the **why** and missed acceptance details, not as a second indexer.
