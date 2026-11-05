# V3+1 Scaffold — Independent, Uninstall-Surviving Menu Configuration Recovery

**Status:** Architecture and Codex requirements ONLY; no code implementation.  
**Date:** November 5, 2026  
**Applies to:** User-created **Simple and Narrow right-click menus**, destination/menu titles, custom Narrow per-ancestor aliases, and menu configuration preferences.  
**Separate subsystem:** Depth folder index and its own `CURRENT.json`/backup/journal lifecycle. Never confuse, overwrite or merge their independent recovery histories.

## Product promise

> The user should never need to rebuild carefully named Simple or Narrow right-click menus after a browser cache cleanup, extension storage reset, service-worker crash, IndexedDB corruption, extension uninstall/reinstall, or supported Chrome profile repair **when an independent valid recovery copy still exists**.

The underlying directory names do not change; menu aliases are persistent user work. No automatic recovery system can guarantee survival if ALL copies are deleted or storage hardware is lost.

## A. Two separate durable stores

| Subsystem | Contents and purpose |
| --- | --- |
| **Menu Config Recovery** (**this spec**) | Canonical user-created **Simple** entries and exact target identities, **Narrow** saved branches and their customizable display titles for every path segment, record IDs, enabled states, ordering, collision resolutions and menu settings. Small; update on every confirmed user change. |
| **Depth Directory Recovery** (separate spec) | Previously discovered cloud buckets/folders, canonical authorized directory graph, discovery cursors/completeness, levels, freshness observations, independent daily/weekly snapshots and deltas. Large; rebuild local IndexedDB graph without a full R2 scan when an authentic recovery copy survives. |

Both can be exposed through one V3+1 coordinator but MUST have distinct namespaces, files, validation, backup policies, journals and restore operations. A corrupt Depth index must not erase or block menu-config recovery, and corrupt menu-config backup must not erase surviving indexed directories.

## B. Menu configuration's independent CURRENT, journals and backup policy

**External durable backing location:** outside the Chrome extension's origin storage and outside the browser profile's files. Prefer the **shared authorized native companion** (Rcomplex/Click2Cloud) on Windows, with a configurable user-approved external folder and optional additional encrypted backup. A file merely persisted to IndexedDB, `chrome.storage.local`, or the Chrome profile **does not satisfy uninstall survival**. An independent location is necessary but still subject to its own cleanup policies, disk failure, deletion and permissions.

Illustrative file layout (names can change; API semantics must not):

```text
<independent user-approved recovery root>/
  click2cloud/
    menu-config/
      CURRENT.json                 # complete latest VERIFIED menu configuration checkpoint
      journal/
        2026-11.jsonl              # append-only ordered semantic deltas
      backups/
        2026-W45.json              # immutable weekly snapshot (DEFAULT)
        ...
      manifest.json                # schema, generations, checksums, backup policy
    depth-index/
      CURRENT.json                 # SEPARATE full known folder tree checkpoint
      journal/
      backups/
```

**`menu-config/CURRENT.json`** is a self-contained, versioned, credential-free snapshot sufficient to rehydrate **every original Simple/Narrow menu choice** with exact identity and custom display aliases. It is NOT REDOWN's existing IndexedDB `CURRENT` or `chrome.storage.local['right-click.json']`; those are source/compatibility references. Preserve its integrity using atomic temp-write + durable replace where supported, a validated schema, sequence/generation, hash/checksum and safe last-known-good fallback.

**Append-only delta journal** records every meaningful committed user change: add/remove/reorder destination; edit menu title; edit any ancestor alias; change Simple/Narrow status or visibility; and related menu preferences (if stored in this subsystem). Include event ID, monotonic sequence, timestamp, account/bucket namespace, exact record ID, base generation, operation and validation information. Idempotent replay: duplicate events cannot create duplicate menu rows or reorder incorrectly. No secrets, OAuth tokens or personal source URLs in backup/journal.

**Backup cadence (CONFIGURATION only):**
- **WEEKLY by DEFAULT**, user-selectable **DAILY**. This controls immutable historical checkpoint cadence.
- `CURRENT.json` is refreshed **after every successfully committed configuration change**, not only once a week. The journal records the same semantic change and remains continuous across backup periods.
- First backup is created when enabling durable storage / on initial valid configuration, then capture checkpoint on first eligible operation in a new day/week **or use a real scheduler** if a wall-clock guarantee is wanted. Do not claim cron-style daily/weekly schedules if implementation only performs rollover on use.
- Settings for menu-config backup policy are independent of Depth backup cadence. Changing one has zero side effects on the other.
- Retention, encryption/passphrase handling, rollback points, storage-space pressure and export/import must be explicit rather than deleting backups automatically without notice.
- Backup completion and recovery health must report actual write receipts, not claim success when disk or companion is unavailable.

## C. Crash-safe commit sequence

A canonical V3+1 menu edit needs to preserve consistent recorded intent across its working IndexedDB state, durable `CURRENT.json`, journal and native Chrome menu application:

1. Validate exact account/bucket/prefix/record ID and per-ancestor alias consistency; create unique change event with expected previous revision.
2. Apply the change atomically to the authoritative working V3+1 model (including journal/generation within the appropriate transaction where possible). Persist a durable recovery event and checkpoint through the companion, with explicit acknowledgement and crash-replay protocol; no false claim that IndexedDB+filesystem are one atomic transaction.
3. Do not acknowledge the **configuration as externally protected** until its independent recovery journal/`CURRENT.json` has been safely written, or clearly show **Backup pending / at risk** when the companion/storage is unavailable. Do not silently discard edits; retry safely.
4. Reconcile native Chrome `contextMenus` separately. **Saved** and **Applied to Chrome** are different states; only Chrome callback/generation ACK makes it Applied. On worker crash, replay pending intents and reconcile without double-applying or deleting another menu.
5. Concurrent edits in multiple extension windows/companion sessions use monotonic generation/expectedRevision, serialization and conflict handling. Never blindly select an older snapshot as authoritative.

## D. Recovery algorithm — reinstallation and browser storage loss

1. Detect IndexedDB/CURRENT missing, incompatible, corrupt or incomplete; **do not initialize an empty canonical model over an independently recoverable configuration**.
2. Discover authorized independent menu-config recovery root via the companion or an explicit user-granted location (reinstall may require reconnecting/re-authorizing the companion or choosing an existing file). If unavailable, offer safe read-only/recovery choices; do not assert recovery succeeded.
3. Validate `menu-config/CURRENT.json` schema/version/checksum and namespace. Replay subsequent verified ordered JSONL deltas only when sequence is contiguous and conflict-free; otherwise fall back to the latest valid immutable DAILY/WEEKLY checkpoint and replay from that snapshot.
4. Restore **Simple**: ALL exact destination records, optional titles, ordering and enabled status. Restore **Narrow**: ALL configured paths and exact per-level user-assigned titles. Exact bucket/profile identity must be preserved; account disconnect must not turn records into another user's bucket.
5. Rebuild browser IndexedDB and derived menu projection from that durable state. Recover Depth independently from **its separate recovery files**. Neither requires re-crawling the entire cloud directory merely to recover *known previous* state.
6. If provider authorization was cleared, user may need login/OAuth again before saves are re-enabled. Render restored destinations as **Pending reconnect** rather than silently binding them to unrelated credentials or discarding them.
7. Register native menu from current validated authorization; wait for Chrome receipt. Preserve recovery root/Manage functionality if registration fails. Never claim uploaded-file success from a restored menu config alone.
8. Recreate/verify secure external backup linkage after reinstall. Extension uninstall must **NOT** issue cleanup requests for durable backups. **Delete My Data** is separate and must require explicit, informed confirmation, including choosing whether to delete external copies.
9. Background verification of folder freshness may occur after recovery with bounded budgets, but must not erase saved aliases or force a full scan to show recoverable menus.

## E. Test matrix — hard acceptance

- Create 100+ Simple and Narrow entries with long nested paths and unique titles at each ancestor; record hash of exported semantic config.
- Save/Edit/Delete/reorder operations each update CURRENT and ordered delta journal; **default weekly**, switch to **daily**, reboot, and verify distinct backup schedules from Depth.
- Fault-inject crash between IndexedDB transaction, delta append, atomic `CURRENT.json` replace and native menu ACK; recover without missed or duplicate user edits.
- **Clear ordinary Chrome cache**, delete simulated extension IndexedDB and `chrome.storage.local`, and test Chrome extension **uninstall/reinstall** with external files retained; verify exact records/aliases/IDs/ordering restored and menu recompiled.
- Damage latest CURRENT but preserve weekly checkpoint + later valid deltas; restore exactly to last valid change, reject tampered/out-of-order delta and report the discrepancy.
- Lose both latest CURRENT and latest weekly checkpoint, retain older snapshot plus verified deltas; recover if contiguous; otherwise fail safely without fabricating state.
- Turn Depth ON/OFF and change its level during/after restore; all Simple/Narrow entries remain accessible; Depth corruption does not destroy menu configurations.
- Multi-account same folder labels, disconnected account, changed Worker URL, revoked bucket, cross-profile migration: no accidental routing to wrong cloud.
- Companion missing or offline, read-only filesystem, interrupted file replacement, antivirus file locks, disk full, no user-approved external location: save UI distinguishes **not backed up** from **backed up**, and recovery never claims success without verified file evidence.
- Recover weekly/daily snapshots after restart on Windows; retention and explicit data deletion are tested.

## F. Relationship to existing REDOWN sources

REDOWN `extension/right-click-current.js` **currently** uses one IndexedDB database (`redown-right-click-current`) with object stores `state`, `records`, `journal`, `pointers`, `backups`. `period()` supports **daily, weekly, off** and `commitPatch()` commits semantic changes and journal entries transactionally, with dated backups on use/rollover. Its `dump()` exports `journalJSONL`, and the backup module validates/encrypts exported bundles. REDOWN's `right-click.json` is a `chrome.storage.local` snapshot. **This does NOT yet produce the separate external files or uninstall-safe recovery described here.**

Reference: [REDOWN source extraction](../FOREVER_WORKS/REDOWN_CURRENT_V3_SOURCE_EXTRACTION_2026-11-05.md) and [Codex execution contract](../FOREVER_WORKS/CODEX_REBUILD_FROM_REDOWN_CURRENT_V3_EXTRACTION_2026-11-05.md). Reuse validated mechanisms, but **do not reuse an in-Chrome backup location as the sole durable copy**.

**Implementation state: NOT IMPLEMENTED. Documentation only.**
