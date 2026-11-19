# P1 BUG — Whole Cloud crawl stalls at zero object pages; live job and external checkpoint disagree

**Reported:** 2026-11-15 (owner's Windows Chrome installation)  
**Status:** OPEN — owner-observed; root cause, exact active recovery root and next-tick errors unverified  
**Area:** Click2Cloud, read-only Whole Cloud account-wide hierarchy crawler, MV3 scheduled ticks, OAuth, File System Access external recovery, namespace journals / `CURRENT.json`.  
**Priority:** P1 reliability investigation. **Do not derail the current owner-requested Simple/Narrow/Depth right-click acceptance test.**

## Intended behavior

Once a user opts in and a cloud account is authenticated/authorized, Click2Cloud slowly enumerates **all authorized buckets**, then each bucket's object keys/prefixes, incrementally builds a historical folder hierarchy and commits **every successfully crawled page durably** before moving the cursor. Pausing, closing Chrome, refreshing authorization or restarting should not discard already learned paths. Partial and historical trees should remain available even when the full scan has not finished. This is **metadata/inventory**, not copying all object bytes.

An example product vision is 3 hours of normal extension use per day over seven days: 21 hours of potential low-impact discovery opportunities, not a guarantee of uninterrupted MV3 worker execution. More details: [owner-approved Whole Cloud direction](../../Project_direction/OPPORTUNISTIC_WHOLE_CLOUD_HIERARCHY_DISCOVERY_2026-11-14.md).

## Installed Windows evidence supplied by owner

Backup root examined: `C:\Users\jg202\Desktop\backup` (path is owner-local, not proof the installed extension currently points to it).

- `whole-cloud-51ba0f5a69d822ab/CURRENT.json` decoded `namespace: whole-cloud-51ba0f5a69d822ab`, `sequence: 2`, `state: RUNNING`, `bucketIndex: 0`, `page: 0`, `complete: false`, `bucketsLoaded: true`.
- The durable record listed seven buckets: `click2cloud-qa`, `click2cloud-qa-2`, `images`, `redown`, `study`, `valentine`, `valentines`.
- The owner ran `dir /b "C:\Users\jg202\Desktop\backup\whole-cloud*"`: only `whole-cloud-51ba0f5a69d822ab` and `whole-cloud-subscriptions` were shown. **No `whole-cloud-*-page-*` namespace directories** were observed there.
- The owner ran `dir /b "C:\Users\jg202\Desktop\backup\backup-cloudflare*.json"`: `File Not Found` — no completed Whole Cloud export observed in that directory.
- A later `type "...\whole-cloud-51ba0f5a69d822ab\CURRENT.json"` returned **the identical sequence 2, RUNNING, bucketIndex 0, page 0, checksum**.
- Meanwhile the installed **Settings → Show Whole Cloud Jobs** returned the **same Cloudflare account** with `state: DUE`, `revision: 1`, `bucketIndex: 0`, `buckets: []`, `page: 0`, `complete: false`. This appears **older than the saved sequence 2** with `bucketsLoaded: true`.

**What this proves:** The inspected external root does not show any durable object pages, and the interface's job state differs from the inspected file. It does **not** prove that the cloud contains no folders, that objects have been deleted, which backup root the extension actually uses, or why the difference occurred.

## Source-level leads, not a root-cause conclusion

- `src/api/whole-cloud.mjs`: `tick` runs one bounded stage per call. First bucket listing saves the bucket list and returns; subsequent ticks should `listRaw` a bucket and `writeNamespace('whole-cloud-<id>-page-<revision>-<page>')`, advance `page`, and save the job; eventual verification/export follows. Check stale `nextDue`, `bucketsLoaded`, `bucketCursor` transitions and valid cursor advancement.
- `extension/background.mjs`: `chrome.alarms.create('whole-cloud',{periodInMinutes:1})` runs the job; the alarm handler catches errors without persisting/reporting them. A repeating exception may leave an old `RUNNING` state and **zero visible errors**.
- `src/persistence/external-recovery.mjs`: `readNamespace` reads `CURRENT.json`, may fall back to older `backups/*.json` and replays `journal/*.jsonl` sequences. Investigate actual attached backup root and granted File System Access permissions; the correctness of rollback/fallback when current differs from old weekly checkpoints; checksum/journal-gaps and preservation of valid newer states.
- The owner had recently reloaded/reinstalled the extension and experienced lost local destinations. Investigate whether it was connected to a *different* backup root; **do not assume** this is the same bug as CURRENT menu configuration loss.

## Required next diagnostic step (read-only first)

1. Inspect the live extension's **actual attached recovery-root identity, read/write permission, namespace location and latest validated sequence**; compare to the Windows filesystem root shown above without writing into it.
2. Capture the scheduled job's last tick attempt, `listRaw` response/error code, OAuth and bucket-scope readiness, actual page write result, timestamp and next due time.
3. Cross-check the `CURRENT.json`, backup snapshots and JSONL journal for the job namespace and page namespaces, including checksum/replay and fallback behavior. Preserve originals before any repair.
4. Distinguish “job has not ticked,” “cannot list objects,” “external directory permission denied,” “write failure,” “stale checkpoint read,” “different backup root” and “hidden exception.” No guess presented as a confirmed cause.
5. Repair only the identified source owner(s), make errors durable and inspectable, make progress/resumption idempotent, and prove that once pages are read they persist and are exposed as a truthful partial hierarchy.

## Acceptance / logic2real tests

- Confirm real selected account has seven or otherwise correctly discovered authorized buckets, even if Depth selects only two.
- After the bucket-list checkpoint, a successful subsequent tick writes and validates a page namespace; `page`, `bucketIndex`, cursor, and status advance in durable storage in the correct order.
- Stop Chrome mid-crawl and restart: exact previously verified progress and known paths remain; no silent reset to `DUE`.
- Simulate revoked OAuth, a non-granted external directory, a corrupt latest checkpoint, stale or missing journal, provider list timeout, lost response, and MV3 worker suspension. Each yields visible, honest status and preserves valid historical information.
- Recover/reauthorize the **same** user-selected root; do not overwrite prior evidence or fresh working menu configuration.
- Separate fixture tests from real installed Windows Chrome and independently verified R2 object-path listings. Never say complete until all pages are actually confirmed.

## Safety / scope

- **READ-ONLY cloud crawling**. No cloud object/bucket creation, delete, rename, Worker deployment or provider permission bypass.
- Do not clear user-owned external backup directory, `CURRENT`, journals, menu destinations, OAuth grants or existing R2 objects while diagnosing.
- Treat this report as a separate **Whole Cloud P1**. The user's immediate next task is native Chrome **right-click Simple/Narrow/Depth testing**, not crawler implementation.

**This report documents evidence and investigation requirements only. It is not a claim that the crawler has been repaired.**
