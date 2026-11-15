# Project direction — Whole Cloud: an accumulating hierarchy map

**Date:** 2026-11-14  
**Product:** Click2Cloud  
**Status:** Owner-directed product vision and implementation acceptance direction. This document records intended behavior; it is **not** evidence of a completed feature or a request to mutate any cloud resources.

## Founding idea: use elapsed time, not a disruptive full scan

The owner imagines an extension used for **three hours a day over seven days**: that is **21 hours of opportunities** for a low-impact background crawler to incrementally learn the user's cloud hierarchy while Chrome is open and the provider connection remains authorized.

The user should not have to request a large one-shot crawl, keep the interface open, or wait for completion before benefiting. Every successful unit of discovery becomes reusable knowledge. Twenty-one hours is a motivating example of *available time*, **not** a guarantee of 21 hours of uninterrupted execution or complete coverage; MV3 service workers, alarms, device sleep, permissions, provider quotas and network conditions affect actual progress.

**Core promise:** *The longer I use Click2Cloud, the more complete and useful my map of my authorized cloud becomes—without making ordinary saving feel slower.*

## What “Whole Cloud” means

- Enumerate **every bucket or container that the connected OAuth identity is actually authorized to list**, not merely the two buckets currently selected for Depth or the paths in Simple/Narrow.
- Incrementally list the objects/keys within every authorized bucket, following provider pagination and its own durable continuation cursor.
- Derive a **hierarchical directory tree** from keys/prefixes. For Cloudflare R2, folders are logical prefixes, not necessarily physical directory objects. An empty prefix with no object/marker and no provider listing evidence cannot be magically discovered.
- Preserve bucket identity, exact canonical path, hierarchy, useful non-sensitive metadata and observation timestamps. Retain the option to reconstruct an outline from durable object-listing pages, preferably with a usable indexed tree view.
- **Metadata/structure first:** this does **not** imply downloading or backing up all file bytes, sharing data with a server, or creating cloud buckets and marker objects.
- Distinguish the **account-wide historical inventory** from destination configuration, native right-click menus, live remote readiness, and backups of user settings. Their lifetimes and correctness must not depend on each other.

## Operating model: gradual, bounded, observable

1. **Consent and start.** User enables account-scoped Whole Cloud discovery while already authorized. Use only actual provider-granted scopes; never infer extra access from a prior configuration or initiate provisioning as a side effect.
2. **Opportunistic scanning.** Schedule small, resource-bounded units of work during eligible online/authorized periods. Keep low priority, bounded API calls, sensible backoff, and no obstruction to foreground right-click saves or Explorer interaction. Distinguish browser-open time from successfully executed work.
3. **Persist every discovered page before advancing.** Write page contents and cursor/identity/revision progress durably, verify the write, and only then advance. Already captured pages survive crashes, shutdown, failed OAuth, slow API responses and reinstall when their separate user-selected external backup remains accessible.
4. **Resume, do not reset.** After Chrome starts or a valid account reconnects, inspect the existing checkpoint for that exact provider/account, validate it, and continue from the last confirmed page. Resume must be idempotent and resistant to repeated/lost callbacks.
5. **Partial is useful.** A 10%-complete crawl can already expose a truthful, browsable partial tree. Show explicit coverage, discovered buckets, processed pages, last successful progress and any blocked portions.
6. **Finish and refresh.** After one complete pass, mark the snapshot complete **as of an observation window**, then perform low-impact future passes to update paths and freshness. A completed pass is not an atomic or permanently current snapshot.
7. **Offline access.** Users can browse the last persisted hierarchy when disconnected, clearly labeled as historical/offline. Display missing/uncertain/permission-denied regions honestly; do not silently remove historical discoveries just because a later request fails.
8. **Control.** Offer Pause, Resume, Stop and deliberately scoped Clear/Delete of this inventory, without touching the user's actual cloud objects, their Simple/Narrow/Depth assignments or unrelated backup evidence. Make stored metadata volume and cleanup policy visible.

## Reliability and UX invariants

- **Time must compound into knowledge.** Do not require a final completed pass to retain or show discovered paths. No full-crawl restart on routine restart/reconnect.
- **Read-only remote behavior.** No R2 bucket creation, marker creation, object writes/deletes, Worker deployment, scope escalation, or provider-wide modification from the crawler. Honor disconnected/revoked accounts.
- **No silent errors.** State transitions must separate `DUE`, `RUNNING`, `PAUSED_AUTH`, `PAUSED_OFFLINE`, `PARTIAL`, `VERIFYING`, `COMPLETE` or scheduled refresh, with a durable failure reason, retry/backoff and last successful checkpoint. `RUNNING` is not proof that a worker is active.
- **Truthful counters.** Record buckets known, buckets fully enumerated, pages saved, keys/folders observed, scan coverage (when calculable), last good step, last error, next eligible tick and status of the backup root. Never report “100% complete” based only on a bucket list.
- **Crash and directory safety.** If a recovery root is unavailable, permission was lost, or a newer `CURRENT` record is corrupt, preserve evidence and surface the exact problem. Do not silently fall back to a stale `DUE` state as though no progress ever occurred; never overwrite a newer valid checkpoint with an earlier record.
- **Independence.** Whole Cloud inventory must survive changes to Depth scope selection, menu-manifest export/import, Default, Quick and unrelated destination changes. No dependency on user maintaining the original 37-action right-click menu.
- **Privacy.** Keep inventories private to the local authorized user-selected storage, minimize metadata, exclude credentials and signed URLs, and make exports explicitly user-initiated. State that paths and filenames can themselves be sensitive.
- **Performance.** One scan tick must not monopolize Chrome's service worker, network bandwidth or CPU, or delay a foreground save; apply adaptive pace/backoff and per-account fairness. No requirement to keep a side panel open.

## Relationship to existing Click2Cloud capabilities

- **Depth mode:** derives a *live* right-click hierarchy from selected bucket scopes. Its two stored bucket roots may legitimately render 20+ folder actions. Depth configuration is not the full inventory.
- **Portable menu manifest:** records configured Simple/Narrow routes and selected Depth scopes; it need not embed stale discovered object listings. The Whole Cloud hierarchy is a separate independently maintained artifact, with an optional future snapshot export.
- **Recovery / depth-index:** existing `depth-index-*` namespaces represent per-scope discovered folders. A Whole Cloud job/checkpoint such as `whole-cloud-<id>` records progress; the actual complete account-wide outline needs durable enumerated pages or an equivalent indexed representation.
- **Current implementation status, based on the observed November 14 Windows run:** a job listed seven Cloudflare buckets but showed zero persisted object pages; subsequent UI status showed an earlier `DUE` checkpoint than the `RUNNING` record read from disk. **Root cause is unverified.** Do not assert that an entire cloud was indexed. Investigate recovery-root identity, checkpoint replay/fallback, scheduled tick failures and missing observable error receipts.

## Acceptance scenarios for a future implementation

1. An OAuth-authorized account with seven buckets (only two selected for Depth) eventually lists and traverses **all seven authorized buckets** without needing changes to Depth.
2. Run for three hours/day across a week under realistic Chrome MV3 sleep/wake and restart conditions. Every *successfully executed* tick results in honest progress; repeat sessions accumulate rather than reset. Report actual active crawl time, API pages, keys and discovered prefixes, not just elapsed wall-clock time.
3. Stop after the first durable object page: a `whole-cloud-*-page-*` or equivalent durable page/index exists, and a partial offline tree is already browsable.
4. Stop Chrome mid-page, disconnect OAuth, revoke permissions, lose external-folder access and reboot. On authorized recovery, resume from the last **verified** cursor without discarding pages or inventing coverage. Keep precise blocking statuses.
5. Present older and newer `CURRENT`/journal/checkpoint records, including a corrupt or inaccessible newest file: choose the newest provably valid record or block loudly; do not appear to rewind silently.
6. After a complete pass, produce a verifiable account-wide hierarchy export or indexed local outline with clear freshness and source identity; offline browsing must work without a live provider token.
7. Distinguish a deleted object, unobservable empty folder, newly created prefix, partial listing, eventual consistency and provider denial; preserve historical sightings with timestamped freshness.
8. Benchmark real installed Chrome responsiveness and R2 calls while a crawl is active; ordinary right-click saves must remain responsive, exact-target and separately verified.
9. Prove the crawler never changed cloud data, inferred extra OAuth grants, wiped a destination/menu configuration or leaked sensitive object names off-device.

## Roadmap treatment

**Strategic product pillar / P1 reliability work, not an implemented claim.** Build on the existing typed API, provider authorization, durable recovery and one-page-per-tick design rather than creating a competing crawler. First repair the observed stalled/rewound checkpoints and add inspectable, persisted progress/errors; then expose an offline hierarchy browser and incremental refresh. Preserve existing P0 login, CURRENT-data loss, save correctness and native right-click performance gates.

**Owner principle:** **Twenty-one hours of accumulated usage must not equal zero retained knowledge merely because the crawl hasn't reached its final page.**
