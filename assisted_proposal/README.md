# Assisted Proposal — V3+1 + Time Machine

**Recommendation, 2026-11-03.** This is the alternative architecture I would build. It is a **design and pure reference-model proposal**, not a deployed REDOWN replacement or a finished live Portal.

Read this beside [the untouched original proposition](../original_proposition/). The original's copied V3 Simple and Depth code, tests, and owner delta-first specification are preserved there; it is not overwritten by this recommendation.

## Decisive distinction

The original proposition already has the right economic intuition: a full checkpoint plus small journal changes, daily/weekly indexes, an up-to-date CURRENT, and user-directed scanning. The assisted proposal makes it **Time Machine-safe** by treating every historical journal segment as evidence that cannot silently disappear when the latest state is compacted.

The important new boundary is that **Time Machine and Depth are not the same subsystem**.

| Module | May own | Must not call or modify |
|---|---|---|
| Simple engine | Its own shortcuts, flat menu projection, defaults, order | Narrow, Depth, Time Machine internals |
| Depth engine | Own per-scope directory index, verified discovery/frontiers, selected display depth, folder tree projection | Simple/Narrow configuration, file-history internals |
| Narrow engine (future replacement) | Its own shortcut aliases, chosen path expression | Simple, Depth, Time Machine internals |
| Time Machine / RFIS (independent, optional) | File identity, placement biography, history timelines, as-of queries, historical evidence | Any menu engine internals |
| Provider adapter / verified operation events | Authenticated list/change-stream/save receipts and authoritative identity/observations | UI mode decisions |
| Mode-neutral menu registrar | One selected mode **per connection**, aggregate independently owned provider fragments, root/provider sibling menus, native acknowledgement/routing | Cloud inventory, journal generation or mode state |

**No mode imports another mode.** Provider adapters and a typed verified-change event bus are neutral infrastructure, not calls between modes. Depth may maintain its own minimal directory journal even when Premium RFIS is disabled. Time Machine independently subscribes to permitted provider events and maintains the richer file-identity history. Free core saving must not depend on Time Machine.

## Files

- [Universal S3/S4 connectors](../universal_connectors/README.md) — per-connection mode selection, distinct MEGA S3 and MEGA native providers, multi-connection native registration and storage namespaces
- [depth/README.md](depth/README.md) — authoritative Depth-only ownership, full-folder index, delta journal, menu projection and strict cross-system isolation invariants
- [ENGINE_ISOLATION_CONTRACT.md](ENGINE_ISOLATION_CONTRACT.md) — the four independent state owners (Simple, Narrow, Depth, Time Machine), shared provider/event seams, registry permissions and regression acceptance
- [TIME_MACHINE_ARCHITECTURE.md](TIME_MACHINE_ARCHITECTURE.md) — historical queries, source evidence and RFIS semantics
- [STORAGE_AND_CHECKPOINTS.md](STORAGE_AND_CHECKPOINTS.md) — one adaptive snapshot, lossless journals, daily/weekly lightweight indexes, atomic HEAD, recovery
- [SCAN_AND_UPDATE.md](SCAN_AND_UPDATE.md) — bounded folder-only or recursive subtree reconciliation
- [src/time-machine-replay.mjs](src/time-machine-replay.mjs) — small pure JavaScript point-in-time replay reference
- [tests/time-machine-replay.test.mjs](tests/time-machine-replay.test.mjs) — self-contained reference-contract tests

## Why not rewrite the current engines right now?

The source-preserved REDOWN V3 Simple and Depth algorithms remain in `../original_proposition/src/modes/`. First prove their parity, then change only the independent index/discovery pipeline and neutral registry seam. Narrow is a later clean-room rewrite. Do not transplant into production REDOWN until native Chrome, multi-bucket real R2, restart, recovery, and Time Machine correctness gates pass.

## Independent external references reviewed

- `thanks-cohn/REDOWN/NEED_TO_DO/fundamentals.md`: CURRENT-first, transactional deltas, Daily default / Weekly / Off, independent provider namespaces
- `thanks-cohn/REDOWN/FOREVER_WORKS/v3/P0_PERSISTENT_RIGHT_CLICK_TREE_WORK_REQUEST.md`: recoverable full-known tree, targeted refresh, immutable historical states, three future Time Machine queries
- `thanks-cohn/REDOWN/docs/proposals/RFIS_PERSISTENT_FILE_IDENTITY_HISTORY.md`: stable file ID, placement history, observed-versus-effective dates, lossless segmented events, Premium separation

**Implementation status:** these proposed modules are not yet wired to live provider notifications, on-device IndexedDB, encrypted R2 backup, entitlement, or Chrome context menus.
