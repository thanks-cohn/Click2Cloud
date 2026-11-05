# V3+1 Scaffold — Independent, Uninstall-Surviving Menu Configuration Recovery

**Status:** Architecture and Codex requirements ONLY; no code implementation.  
**Date:** November 5, 2026  
**Applies to:** Saved Simple/Narrow/Depth display configurations, **Show in Chrome** Simple/Narrow/Depth/All/Flat choices, exact Flat default save target, **Settings → Recovery Mode** Weekly/Daily schedule, Simple/Narrow recovery ON/OFF and per-bucket Depth Recovery ON/OFF + recovery crawl depth.  
**Distinct subsystems:** Menu configuration, Depth display configuration and Depth recovery folder index; each has its own CURRENT, journals, backup/restore lifecycle. Never confuse Chrome display depth with Recovery Mode crawl depth.

## Product promise

> The user should never need to rebuild carefully named Simple or Narrow right-click menus after a browser cache cleanup, extension storage reset, service-worker crash, IndexedDB corruption, extension uninstall/reinstall, or supported Chrome profile repair **when an independent valid recovery copy still exists**.

The underlying directory names do not change; menu aliases are persistent user work. No automatic recovery system can guarantee survival if ALL copies are deleted or storage hardware is lost.

## A. Settings → Recovery Mode and three independent durable recovery stores

Recovery Mode is a dedicated, aesthetically integrated Settings section, **not a mode in the `+ Right Click` popup**. The user selects **Weekly (default; Monday)** or **Daily** scheduled checkpoint cadence, turns **Simple Recovery** ON/OFF and **Narrow Recovery** ON/OFF independently, and expands **Depth Recovery Buckets** to view the full authorized bucket list. Each recovery bucket has its OWN ON/OFF checkbox and editable positive integer **recovery crawl depth**, with **no arbitrary app-imposed ceiling**. The selected recovery depth determines how far Click2Cloud may incrementally discover and preserve bucket folders. It is wholly independent of that bucket's **Chrome display depth**, configured in the popup Depth tab (default 10, no imposed max) and independent of Show:Depth ON/OFF.

- Enabling Simple Recovery protects original Simple destinations, custom titles, exact target IDs and ordering; enabling Narrow Recovery independently protects all Narrow paths and ancestor aliases. Disabling either prevents new scheduled recovery coverage for that type but **does not delete the live configuration or surviving prior recovery files**. Preserve the user's policy selection in durable recovery metadata. The user can re-enable without re-creating destinations.
- Depth Recovery buckets are **not** inherited from the popup's Depth-display bucket set. They are separately selected in Settings, can include buckets hidden from Chrome and can crawl deeper or shallower than popup display depth. Only user-authorized buckets are scanned. Recovery can run when no Depth rows are shown in Chrome.
- **Scheduled weekly checkpoint means every Monday while a working scheduler/authorized native companion is available**; if Chrome and companion cannot run, mark overdue and catch up on next supported launch, showing actual completion timestamp. Daily works analogously. Do not claim guaranteed background execution from a suspended/closed Chrome MV3 worker. Allow safe incremental/resumable discovery (pagination, rate limiting, time budgets) with truthful coverage/completeness. An incomplete scan updates only verified known observations and retains previous known data rather than wiping a valid graph. Do not confuse a folder-name/path index with a full copy of cloud file bytes.
- The **Show in Chrome** choices and Flat exact default target remain persisted even if their recovery-type toggle is OFF. Show toggles decide native menu projection only, not index scan/protection. All/Flat are presentation shortcuts, never destructive transforms.
- The recovery coordinator MUST preserve the schedule, protection toggles, selected recovery bucket identities/depths, last successful/attempted scan checkpoints, and integrity receipts in independent durable settings. Restoring one corrupt namespace must not damage another.

| Durable subsystem | Contains |
| --- | --- |
| **`menu-config/`** | User-created Simple and Narrow destinations, aliases, stable IDs, ordering, Show:Simple/Narrow/Depth/All/Flat state, and independent exact **Flat Default Save Selection**; their backup coverage is filtered by Simple/Narrow Recovery policy without deleting live data. |
| **`depth-config/`** | Chrome-display Depth bucket participation + *display depth*, default 10 for first setup, no arbitrary max, and display config revisions. These settings are distinct from cloud indexing. Recover committed display choices separately from directory graph loss. |
| **`depth-index/`** | Recovery Mode selected buckets + *recovery crawl depth*, authenticated known folder graph (no tokens), scan cursors/completeness/freshness, resumable discovery state, and independent deltas/checkpoints. |
| **`recovery-policy/`** | Weekly/Daily choice, Simple/Narrow backup ON/OFF, per-bucket Depth Recovery ON/OFF + crawl depth, last run/health/status metadata. May be an independently versioned manifest/config if same atomicity/recoverability is guaranteed. |

**External durable backing location:** outside the Chrome extension origin and browser profile. Prefer the authorized native companion (Rcomplex/Click2Cloud), or a user-approved independent folder with optional encryption. IndexedDB, `chrome.storage.local` and Chrome's own profile do **not** survive all reinstall scenarios. Missing external storage requires explicit **Backup pending / not protected** status.

Illustrative file structure:

```text
<authorized external recovery root>/click2cloud/
  menu-config/
    CURRENT.json
    journal/2026-11.jsonl
    backups/2026-W45.json          # immutable full checkpoint
    backups/weekly.json            # last verified WEEKLY snapshot/pointer
    manifest.json
  depth-config/
    CURRENT.json
    journal/2026-11.jsonl
    backups/2026-W45.json
    backups/weekly.json
    manifest.json
  depth-index/
    CURRENT.json
    journal/2026-11.jsonl
    backups/2026-W45.json
    backups/weekly.json
    manifest.json
  recovery-policy/
    CURRENT.json
    journal/2026-11.jsonl
    backups/2026-W45.json
```

### Backup Location — user-selected Windows recovery folder

Settings → **Backup / Recovery Mode** MUST offer exactly two clear **Backup Location** choices. The selected location is the REAL independent durable recovery root used for CURRENT, monthly delta journals, manifests, and historical backup snapshots—not a one-time export.

| Choice | Windows location | Role |
| --- | --- | --- |
| **Automatic (DEFAULT)** | **%LOCALAPPDATA%\Click2Cloud\Recovery\** | Native-companion-managed recovery outside Chrome cache/profile and extension-origin IndexedDB |
| **Documents** | **Documents\Click2Cloud\Backups\** | User-visible durable recovery outside Chrome cache/profile; resolve actual Windows Documents known-folder path instead of hardcoding user paths |

- Exactly **one** active recovery location is selected at a time; neither choice means both locations receive automatic copies. An optional second-copy feature would require separate opt-in.
- When the user changes the backup location, perform **Copy → checksum/readback Verify → Switch** across all namespaces, including CURRENT, journals, dated snapshots and policy metadata; preserve the old location until the destination is verified. On error, keep the old active root and show an accurate failure. Never delete the original without separate explicit confirmation.
- The shared authorized Windows native companion writes/reads the selected folder. The extension must not treat Chrome storage or IndexedDB as an uninstall-safe copy. The active location and recovery instructions must remain discoverable after reinstall (possibly requiring the user to select the surviving recovery directory).
- Both locations are outside Chrome's routine cache/extension-data deletion, **not** immune to Windows account deletion, disk cleanup, uninstaller removal, hardware failures or deliberate user deletion. Do not claim absolute safety.
- The local recovery folder contains no OAuth secrets, access tokens, or browsing-source URLs.

### Dynamic calendar filenames, NOT a November 2026-only system

Every **journal/YYYY-MM.jsonl** is a **format pattern**, not a hardcoded date. The companion automatically rolls over to a new append-only file every calendar month: **2026-11.jsonl**, **2026-12.jsonl**, **2027-01.jsonl**, and so on. Changes retain a **global monotonic sequence across monthly files** within each recovery namespace, ensuring replay across year boundaries. At month rollover, close/flush the prior file; do not overwrite, reset the sequence or discard old months.

Weekly dated backups use the ISO week-year convention **YYYY-Www.json** (e.g. **2026-W45.json**, **2026-W46.json**), with **backups/weekly.json** as the atomic latest verified alias/pointer, never a replacement for the immutable dated history. Daily dated backups use the actual calendar date **YYYY-MM-DD.json** when Daily is enabled. The example names in this document are **illustrative only**; dynamically calculate periods from the companion's correct local time and handle year boundaries.

### Back up everything: contents and cadence

When Simple Recovery and Narrow Recovery are enabled and the user enables desired buckets in Depth Recovery, the chosen recovery folder preserves:
- Full committed Simple destination names, IDs, folder locations and ordering; full Narrow paths and per-ancestor menu labels; popup-only Show settings and the verified Flat Default Save Selection.
- Depth's separately saved **DISPLAY** bucket selections/depths, separately saved **RECOVERY** buckets/depths, the known verified directory index and partial/resumable discovery state.
- Recovery Mode Weekly/Daily selection, per-mode/bucket recovery enablement, namespace versions, checksums, dated checkpoints and deltas. This is a backup of **configuration and directory knowledge**, not copies of actual cloud file contents or OAuth credentials.

**Weekly** creates an immutable complete historical checkpoint on the first eligible Monday while the authorized scheduler is operating (or transparently catches up when it resumes). **Daily** creates an immutable complete checkpoint on each eligible calendar day. **In BOTH cases, CURRENT.json is updated after every committed relevant change, and the monthly delta journal receives that change immediately.** The choice is historical snapshot frequency, not the frequency at which the latest recovery state is persisted.


### CURRENT.json, delta journal and weekly.json have DIFFERENT jobs

- **`CURRENT.json` = complete latest VERIFIED committed snapshot** for its subsystem. On every successful relevant save/change (or verified index update), atomically replace CURRENT (temp write + validated durable replace where possible). Include schema/version, namespace, exact account/bucket identities, sequence/generation, checksum/integrity data and coverage metadata. Never include OAuth secrets, raw source URLs or access tokens. It is updated **continuously**, NOT only weekly.
- **`journal/YYYY-MM.jsonl` = append-only semantic delta ledger** for every confirmed edit or verified index discovery: unique event ID, monotonic sequence, timestamp, type, target identity, prior revision, change and validation hashes. For example: `redown` Chrome display depth 8→12 belongs to **depth-config**; change `redown` recovery crawl depth 25→50 belongs to **recovery-policy**; a newly discovered folder belongs to **depth-index**; a Simple destination alias change belongs to **menu-config**. Idempotent replay must not duplicate entries; tombstones represent intentional deletion. No snapshot is reconstructed from an incomplete/noncontiguous journal as if complete.
- **`backups/2026-W45.json` = immutable dated fully validated weekly recovery snapshot** of all information *verified as known at that point*, including partial-scan coverage; not just Monday's newly discovered paths. **`backups/weekly.json` = atomic rolling alias/copy/pointer to the LATEST verified weekly checkpoint** for ease of recovery. Replacing weekly.json must not overwrite or erase immutable dated historical backups. If Daily selected, use analogous daily dated snapshots/pointer and retain explicit retention controls.
- A first valid backup is created when recovery is enabled/external storage is authorized. Subsequent WEEKLY checkpoints occur Monday when actually schedulable; Daily on the chosen daily cadence. Updating CURRENT/journal NEVER waits for weekly rollover. Existing backups are not silently deleted when a recovery toggle is switched OFF.
- Before claiming `Protected`, verify external write/readback or durable receipt. If a scheduled crawl fails or a filesystem write is unavailable, preserve last known valid CURRENT, journal and checkpoint, record errors and next resume cursor; never report complete when only partial.
- Restore: prefer validated CURRENT plus valid later deltas; if CURRENT is corrupt/missing, restore newest suitable verified weekly/daily snapshot then replay **contiguous valid post-snapshot journal entries**, rejecting tampered/gapped events. Select an older snapshot explicitly for accidental user deletion; never silently resurrect intentionally removed records. No cross-account rebinding, no guessed paths. Recover Simple/Narrow and Show/Flat, Depth *display* choices, independently recovered Depth folder graph and Recovery Mode policy. Reauthorization may be required after reinstall.

## C. Crash-safe commit sequence

A canonical V3+1 menu edit needs to preserve consistent recorded intent across its working IndexedDB state, durable `CURRENT.json`, journal and native Chrome menu application:

1. Validate exact account/bucket/prefix/record ID and per-ancestor alias consistency; create unique change event with expected previous revision.
2. Apply the change atomically to the authoritative working V3+1 model (including journal/generation within the appropriate transaction where possible). Persist a durable recovery event and checkpoint through the companion, with explicit acknowledgement and crash-replay protocol; no false claim that IndexedDB+filesystem are one atomic transaction.
3. Do not acknowledge the **configuration as externally protected** until its independent recovery journal/`CURRENT.json` has been safely written, or clearly show **Backup pending / at risk** when the companion/storage is unavailable. Do not silently discard edits; retry safely.
4. Reconcile native Chrome `contextMenus` separately. **Saved** and **Applied to Chrome** are different states; only Chrome callback/generation ACK makes it Applied. On worker crash, replay pending intents and reconcile without double-applying or deleting another menu.
5. Concurrent edits in multiple extension windows/companion sessions use monotonic generation/expectedRevision, serialization and conflict handling. Never blindly select an older snapshot as authoritative.

## D. Recovery algorithm — reinstallation, accidental deletion and browser loss

1. Detect Chrome storage/CURRENT missing, incomplete or corrupt, and pause unsafe reinitialization if an independent recoverable state exists. Do not overwrite surviving external backups with empty defaults.
2. Locate authorized external recovery roots through companion or explicitly approved folder. Validate **all four** namespaces (menu-config, depth-config, depth-index and recovery-policy) independently. If one is damaged, recover healthy peers without resetting them.
3. Load valid latest CURRENT per namespace; apply only contiguous independently verified journal deltas; if invalid, recover from `weekly.json`/immutable dated snapshot plus contiguous later deltas. Allow user-selected earlier restore point for intentionally deleted items. Respect recorded tombstones unless owner explicitly requests rollback.
4. Restore Simple destinations, Narrow branches and per-ancestor aliases, committed Show combination/All/Flat, and exact Default Save Selection target independently. Restore per-bucket Depth **Chrome display** selections and depths independently of folder graph/index and of per-bucket **recovery crawl** settings.
5. Restore Recovery Mode Week/Daily and Simple/Narrow ON/OFF, chosen bucket recoveries with their depths and confirmed scan cursors/completeness. Rebuild working IndexedDB and native menu from the saved Show selection; never reset recovered settings just because a provider connection is temporarily unauthorized.
6. Revalidate account/bucket authorization and actual save targets. Reconnect OAuth when needed; leave entries safely Pending reconnect rather than redirecting to a different account/bucket. Chrome native registration must independently ACK applied generation before saying menu is applied.
7. After restore, resume incomplete recovery crawls within authorized limits, not a forced full rescan. If a bucket has disappeared or a folder is now inaccessible, preserve historical indexed knowledge with honest stale/unverified labels; do not pretend a remote file or folder still exists.
8. Never delete durable backups as part of ordinary extension uninstall. Deleting external copies requires explicit separate informed user consent. Missing authorized external storage or all deleted copies means no guaranteed recovery.

## E. Test matrix — focused real scaffold acceptance

- In popup save Simple/Narrow/Depth and Show:Simple/Narrow/Depth/All/Flat; verify journals and CURRENT have exact committed state, including title aliases and exact Flat default target. Hide one category: live stored config remains unchanged. No separate hierarchy toolbar button exists.
- In Settings choose Weekly (Monday) and Daily in separate sessions; Simple Recovery ON/Narrow Recovery OFF and inverse; verify only enabled types receive new policy-governed historical protection, without deleting their live records or existing backups.
- Expand Recovery Mode bucket list; enable two buckets at Recovery Depth 50 and 4 while Depth popup display depths are 10 and 17; verify the two independent numbers remain distinct across save/restart/restore. No app-imposed maximum 10 for either setting. Simulate rate limits and paused scan with truthful incomplete status.
- Verify every change updates the appropriate independent CURRENT+delta journal. Confirm first verified checkpoint, weekly.json rolling pointer and immutable dated weekly checkpoint on actual Monday/supported scheduler (or missed-run catch-up), and Daily selected cadence.
- Deliberately corrupt CURRENT; restore from dated snapshot plus contiguous verified deltas. Simulate a missing journal segment and refuse false full restoration; test independent recovery of uncorrupted namespaces.
- Intentionally delete a Simple destination or a Narrow branch: it stays deleted in current state. Explicitly choose earlier weekly snapshot to restore it without mutating unrelated Depth and other modes.
- Remove browser IndexedDB/uninstall extension while valid external backup remains; require valid recovery of menu aliases, saved display modes, Flat destination, Depth display/recovery levels and known folder graph after reauthorization. Check no wrong-account routing, duplicate Chrome native menu entries or phantom verified uploads.
- Companion offline/disk-full, interrupted atomic replace, stale snapshots, partial index and revoked provider access show honest status; Glaciaring instruments real persistence/recovery, not a simulated parallel database. **Do not read, run or expand the old 1,000-scenario project for this task.**

## F. Relationship to existing REDOWN sources

REDOWN `extension/right-click-current.js` **currently** uses one IndexedDB database (`redown-right-click-current`) with object stores `state`, `records`, `journal`, `pointers`, `backups`. `period()` supports **daily, weekly, off** and `commitPatch()` commits semantic changes and journal entries transactionally, with dated backups on use/rollover. Its `dump()` exports `journalJSONL`, and the backup module validates/encrypts exported bundles. REDOWN's `right-click.json` is a `chrome.storage.local` snapshot. **This does NOT yet produce the separate external files or uninstall-safe recovery described here.**

Reference: [REDOWN source extraction](../FOREVER_WORKS/REDOWN_CURRENT_V3_SOURCE_EXTRACTION_2026-11-05.md) and [Codex execution contract](../FOREVER_WORKS/CODEX_REBUILD_FROM_REDOWN_CURRENT_V3_EXTRACTION_2026-11-05.md). Reuse validated mechanisms, but **do not reuse an in-Chrome backup location as the sole durable copy**.

**Implementation state: NOT IMPLEMENTED. Documentation only.**
