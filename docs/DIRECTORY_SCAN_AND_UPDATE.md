# V3+1 — Directory context action: Scan and Update

**Owner directive, 2026-11-03. Status: approved product contract; not implemented.**

## User experience

Within the **real REDOWN / Click2Cloud Portal Explorer** (not a simulator), right-click an existing directory and choose:

```text
Directory context menu
├── Save here
├── Scan and Update                 ← selected directory + its descendants
└── Scan This Level Only           ← optional fast alternative, immediate children
```

The core owner request is **Scan and Update**, an explicit, user-initiated, exact-location reconciliation. It must not start an unrelated provider-wide/bucket-wide traversal. Default **Scan and Update** covers the directory **and its subtree** (including descendants); otherwise users could believe a nested change had been found when only immediate children were checked. An optional shallow command can provide instant limited-scope checking but must explicitly say it does *not* verify deeper descendants. Scanning a bucket root is a whole-bucket request, and the UI must make that scope/cost clear before starting.

The command is available against connected/authorized providers with appropriate listing permissions; for providers without directory enumeration support, show a specific capability/permission message rather than pretend the scan succeeded. In the Chrome native context menu, Chrome cannot natively treat a remote Explorer folder row as a page object; the Portal/Explorer owns the action. A later native `REDOWN → Refresh Folder Listing…` chooser may invoke the **same** service with a selected canonical folder ID.

## Exact inputs and isolation

```text
scanAndUpdate({
  providerKind,
  connectionId,
  accountId,
  bucketOrContainerId,
  folderIdentity,    // exact opaque folder ID or canonical prefix
  recursive: true,   // selected subtree only
  expectedScopeRevision,
  clientRequestId    // idempotency/recovery
})
```

Never identify a target by its menu label, display name, page URL, or currently selected unrelated Explorer folder. Retain provider-specific identity and Unicode/case-sensitive segments. Scanning is a **Depth-owned inventory operation**; it does not modify Simple or future Narrow shortcut configuration. Their independently defined menu projections can consume updated provider-observed location identities *through neutral read interfaces* without either engine importing Depth internals. Only the shared menu registrar handles rendering current mode descriptors.

## Operational sequence

1. Verify connected provider identity, authorization/scope revision and requested folder. Mark requested scan as **checking**, not **complete**.
2. Read that folder's actual list pages via the authenticated provider adapter. When recursive, walk only descendants beneath its exact boundary. No downloading object file contents required to discover folder structure.
3. Paginate, enforce quotas/deadlines/concurrency limits, and save durable frontier/checkpoints so a large subtree can resume after MV3 suspension or network interruption. Never exceed requested ancestor boundary. Outside the subtree, perform **zero** directory reads/writes.
4. Diff the provider's verified observations against the persisted CURRENT graph *for exactly the scanned scope*. Emit semantic events only for actual adds, explicit/moved/renamed paths when safely established, and confirmed deletions; unchanged nodes emit **zero** directory deltas. Do not infer a rename from coincidentally matching names or sizes without proof; it may be a delete+add if verified.
5. For every verified batch, write changed graph records, append immutable-sequenced delta events to the local journal, persist scan frontier/completeness and advance CURRENT generation in **one transactional commit**. The remote `HEAD.json` / segment publishing pipeline is asynchronous with verified readback and may be pending; **do not rewrite the Full Snapshot** or duplicate its contents because of the scan.
6. Reproject/reconcile the active Depth menu from the current authorized graph through the neutral registry. A Simple/Narrow user remains in their chosen mode, with those mode configs untouched. Native Chrome registration acknowledgment is distinct from inventory transaction success.
7. Report useful results: `N new folders · M changed · K confirmed removed · U unchanged · scope/path · last checked · complete/partial`. Only say **Up to date for this folder and descendants** after every requested page/scope was checked successfully. If partial, display `Scan incomplete—resume` and the exact checked boundary, without claiming absence of unknown descendants.

## Absolute safety requirements

- A missing node on a partial listing, failed page, rate limit, expired token, stale/invalid cursor, bounded timeout or lost worker does **NOT** authorize a tombstone or deletion of previously known paths.
- Deletion/tombstone requires provider-confirmed explicit mutation or authoritative complete listing with scoped absence evidence and relevant consistency guarantees. File-less virtual R2 folders may disappear without object/marker evidence; treat this according to provider semantics.
- Complete subfolder read cannot prove that unrelated siblings outside the chosen subtree were checked. Never reset CURRENT to a smaller scan result.
- Read-only scans never alter files, folders, ACLs, public URLs, source contents, or remote objects. In particular, an absent directory marker is not permission to synthesize/delete a remote directory.
- On authorization loss, stop, retain already known history, and require reauthorization before any save action. Don't leak private folder names through logs, exports or public buckets.
- External changes may remain unknown until this action, scheduled targeted reconciliation, or supported provider events; do not promise immediate omniscience.
- Right-clicking **Scan and Update** must not consume the user's upload quotas or trigger SUCCESS! save animations; it is an inventory reconciliation, not a saved-file transfer.

## Delta-first storage effect

- `HEAD.json` references latest committed/verified graph generation plus associated segment lineage; an IndexedDB materialized graph supplies fast live reads.
- `journals/delta-<UTC>-<firstSeq>-<lastSeq>.jsonl.zst` stores **only changed records**.
- `indexes/daily/` and `indexes/weekly/` reference those immutable delta segments without repackaging their contents.
- `snapshots/snapshot-<UTC>.json.zst` is an infrequent immutable Full Snapshot. Targeted scans do not produce a new Full Snapshot.
- If a scan finds zero semantic changes, update **scope observation/checkpoint metadata only**; it should create no node-change delta and should not inflate daily indexes with redundant graph copies.

## Required acceptance / demonstrations

1. Create an external folder underneath a deep `redown/__redown_v3plus1_lab__` branch; run **Scan and Update** on its parent; only the new node is journaled, and the parent Depth menu updates.
2. Repeat the same scan unchanged: zero node edits, zero duplicate journal deltas; progress may update.
3. Rename/delete an external folder in chosen subtree: safe verification produces exact add/remove or confirmed move semantics; unrelated branches untouched.
4. Scan a 10,000+ node subtree under an intentionally low page/time budget; pause/resume across MV3 suspension, no missing-node deletions.
5. Scan one of `redown-bucket-1` through `redown-bucket-4`; all other bucket graph generations and histories remain unchanged.
6. Change Simple label while scanning: Simple alias stays unchanged; Narrow state and Depth presentation depth unchanged.
7. Partial/401/403/429/timeout/invalid cursor returns explicit **partial**, last-known-good tree retained, no false `up to date`.
8. Rebuild CURRENT from Full Snapshot + Daily/Weekly Index references + sealed/live Delta Segments, with precise generation and stable canonical folder IDs.

Original V3 source inspiration: `thanks-cohn/REDOWN/FOREVER_WORKS/v3/P0_PERSISTENT_RIGHT_CLICK_TREE_WORK_REQUEST.md` section `Targeted manual repair: Refresh Folder Listing…` proposed a shallow default with optional recursion. **V3+1 explicitly makes recursive subtree verification the default for the new Scan and Update command**, with an optional named shallow alternative so scope is never ambiguous.
