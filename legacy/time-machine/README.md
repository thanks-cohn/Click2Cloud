# Legacy V3 Time Machine foundation: what's real and what remains open

**Historical source:** [V3 persistent CURRENT work request](https://github.com/thanks-cohn/REDOWN/blob/5041b5763541812c505c9cde6e8f79cb23a7b193/FOREVER_WORKS/v3/P0_PERSISTENT_RIGHT_CLICK_TREE_WORK_REQUEST.md), [current IndexedDB journal](https://github.com/thanks-cohn/REDOWN/blob/5041b5763541812c505c9cde6e8f79cb23a7b193/extension/right-click-current.js), [RFIS identity history proposal](https://github.com/thanks-cohn/REDOWN/blob/5041b5763541812c505c9cde6e8f79cb23a7b193/docs/proposals/RFIS_PERSISTENT_FILE_IDENTITY_HISTORY.md). **New owner:** [independent assisted Time Machine](../../assisted_proposal/TIME_MACHINE_ARCHITECTURE.md).

## Useful historical ideas already present

- **CURRENT-first:** one durable known graph, journal changed records, named historical recovery points, and a current-generation pointer. Don't rewrite whole large-cloud directories on every rename or every midnight.
- **Transactional semantic changes:** V3 `records` and `journal` update in one IndexedDB transaction; include previous/current values. These are sufficient for limited menu-state audit, *not automatically the rich long-lived file identities* envisioned for Time Machine.
- **Daily/Weekly/Off exists only as on-use local rollover.** The new time-machine-friendly model uses small daily/weekly **reference indexes**, adaptive full snapshots, immutable retained event segments and separate historical coverage metadata.
- **Original questions:** `What Was Here?`, `What Changed?`, and `Find This File?` are more ambitious than restoring a present-time folder graph. Stable file identity, previous placements and last-observed state require a dedicated optional subsystem.

## Gaps not to lose between engines

1. **Observed date is not created date.** A folder/file discovered on Tuesday could have been created remotely months earlier. Distinguish `observedAt` from provider-authoritative `effectiveAt` and leave the latter unknown if unsupported.
2. **“As of” reconstruction requires older snapshots and journals.** Compaction of Depth's current graph must not erase old Time Machine history segments promised by retention. But Time Machine cannot force Depth to keep its internal menu state forever.
3. **Tracking a folder is not creating a cloud folder.** Checking a Time Machine tracking entry must never mutate Depth generation, native menus, Simple/Narrow aliases or cloud storage. Verified provider structural changes may independently inform both engines through neutral event fan-out.
4. **Metadata history does not restore bytes.** A former path can be reconstructed from journal, while restoring deleted contents requires independently retained file bytes or provider object versioning. The UI must not promise byte restore from location history.
5. **History/privacy:** stored filenames, paths and URL provenance may expose personal information. Off-browser backup requires a user-authorized private encrypted destination, schemas, key recovery, and retention/deletion policies. Never back up private metadata to a public R2 development domain.
6. **Large-cloud performance:** event streams might lack complete coverage; user-scoped directory Scan and Update is a bounded repair, not retroactive certainty about when an external change happened.

**Do not** put file-history tables, Premium entitlement checks or Time Machine selection writes inside the Depth inventory engine. This legacy memo records an obligation, not a replacement for the assisted architecture.
