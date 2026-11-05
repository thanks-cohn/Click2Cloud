# Click2Cloud — Save Whole Cloud: dated multi-week cloud-outline capture

**Status:** Binding owner product and Codex implementation contract. DOCUMENTATION ONLY; no working exporter, scheduler or real-cloud capture is established by this document.

## Settings placement and user interaction

At the VERY BOTTOM of **Settings → Recovery Mode**, after Weekly/Daily, Simple/Narrow recovery switches, expandable bucket Depth Recovery, and Backup Location:

1. **Connected Clouds dropdown** supports MULTIPLE CHECKED selections. Show every connected authorized **Cloudflare R2 account** AND **each other connected S3-compatible cloud/account** (e.g., AWS S3, Wasabi or other actually supported S3 endpoint). Include Select All and Clear All. Distinguish same-name providers by exact provider, connection ID, account ID, endpoint/region identity. Unauthorized/logged-out entries may be shown as Reconnect Required but never treated as available.
2. **Save Whole Cloud** button below the dropdown starts a durable, READ-ONLY full cloud-outline capture job for EVERY checked cloud connection, not just the active/default one. The button stays at the BOTTOM of Recovery Mode. No checkbox means disabled with explanation. Provide an accessible per-connection progress display: started at, last scan, discovered buckets, keys/paths, incomplete ranges, status, attempts, next resume, export pathname and integrity.
3. This is a **metadata-outline backup**, NOT a copy of cloud file bytes. Include every bucket and every accessible key/prefix/folder path in the chosen account using authorized provider listing APIs, not only configured Simple/Narrow destinations or the selected Depth Recovery/display bucket subsets. No application-defined maximum depth.
4. One selected provider account may produce multiple separate exports if required by account distinction or size. Never mix two accounts under an ambiguous display name. Never list/overwrite buckets/objects without scoped authorization.

## Duration — AS MANY WEEKS AS NEEDED

**There is NO seven-day deadline and NO maximum number of weeks.** Capture begins when Save Whole Cloud is clicked and persists until every accessible authorized bucket/key listing has been covered (or the user explicitly cancels). If this needs two weeks, five weeks, 50 weeks, or longer, it keeps working and continues from verified progress.

- **Weekly is the DEFAULT progress/resume cadence** for recurring discovery passes, or **Daily** if the user's Recovery Mode cadence is Daily. The original click starts the job as soon as authorization and resources are available. A new week is NOT a new job and does NOT erase or finalize an unfinished job. The schedule determines when to resume/checkpoint, not a stop deadline.
- A shared authorized Windows native companion or equivalent functioning scheduler must perform real scheduled work if Chrome is closed; where it cannot operate, mark the job overdue and resume at the next possible opportunity. Never imply a dormant MV3 worker is running.
- Persist incremental discoveries, bucket list, key/prefix listing cursors or restartable page positions, outstanding frontiers, partial coverage, progress counters, validation/integrity, account identity, retries/backoff and fault records to durable filesystem CURRENT/checkpoints + append-only delta journal at the selected backup location. Use bounded-memory streamed and paginated scanning, no single giant in-RAM enumeration.
- Never replace previously verified discoveries with an empty tree merely because a later scan failed or returned only a partial page. Report incomplete/unreachable coverage honestly and keep enough provenance/timestamps to distinguish old observations from currently verified observations.
- The cloud may CHANGE during a multi-week crawl. Completion means all authorized listing partitions were traversed successfully in the documented observation window; it is NOT proof of a frozen point-in-time snapshot. Include first/last observation timestamps and incomplete/unverifiable paths. Where supported, revisit changed areas and state what consistency can actually be guaranteed.

## Lost OAuth: PAUSE and AUTO-RESUME on next successful login

**Explicit owner requirement:** If OAuth expires, is revoked, disappears because of browser storage loss, or the connected cloud loses authorization during Save Whole Cloud, immediately mark **Paused — Reconnect Required**. Preserve the full verified discovered outline, capture start date, last verified cursor/frontier/checkpoint and accumulated weeks in the independent backup folder. Do not restart the job from scratch, delete discoveries, fabricate progress, or claim Complete.

- **On the next SUCCESSFUL OAuth login for the SAME provider connection/account**, automatically revalidate provider identity and required read/list permissions, then **RESUME the existing capture from the last valid checkpoint** without requiring the user to click Save Whole Cloud again. A successful login to a DIFFERENT account must not resume that job against the wrong cloud.
- If provider-issued cursors expire over the pause, re-enumerate ONLY the invalid page/partition as necessary and deduplicate using stable account/bucket/key identity; keep all previously verified knowledge and the original capture start time. If permissions or bucket list have changed, mark unauthorized/unavailable areas accurately, never silently bind another bucket.
- A failed login or missing required scope keeps the job Paused — Reconnect Required, with truthful status and optional next user action. Never store OAuth access/refresh tokens or secret S3 keys in exported JSON or durable recovery journals.
- Reinstall may require user to reconnect the native companion/backup location first; restoring an independently durable active job should leave it paused until the matching account is successfully logged in, then resume automatically.

## Dated output filenames — actual start/completion week span

Owner's filename format: **backup-<cloud-provider-name>-<date>.json**, adapted to record the FULL ISO week range that discovery occupied.

Examples (illustrative, never hardcoded):
- Complete within one week: **backup-cloudflare-week45-2026.json**
- Started week 45, completed week 50 of the same ISO year: **backup-cloudflare-week45-50-2026.json**
- Spanning an ISO week-year boundary: **backup-cloudflare-week52-2026-to-week03-2027.json**
- Other providers: **backup-aws-s3-week45-50-2026.json**, **backup-wasabi-week45-50-2026.json**

If two or more accounts share a provider, add a stable, safe account discriminator to the provider portion (e.g. **backup-cloudflare-account-a-week45-50-2026.json**). Sanitize names and prevent overwriting independent backups. Week/year come from ACTUAL scan start and completion (or last partial coverage date) using correct ISO week-year calculations.

**During an incomplete job**, store durable resumable internal state and optional dated PARTIAL exports labeled partial in both metadata and interface. Do not falsely name a partial result a completed export. On COMPLETE, atomically finalize a validated portable JSON file with the true start-to-finish week range; do not rewrite the entire huge final JSON on every scan page. If JSON size becomes impractical, use bounded chunks plus a JSON manifest with complete index/checksums, and present a user-friendly export.

JSON outline should retain schema/kind/version, exact cloud provider+account identity (not credentials), started/completed timestamps, ISO week range, bucket identities, full observed object key or directory/prefix paths, scan coverage and observation timestamps, complete/partial status, resumability/manifest and checksum validation. No object payloads and no browsing provenance.

## Relationship to existing recovery and Chrome menu

- Save Whole Cloud is **separate from** the popup Simple/Narrow/Depth configurations, popup-only Show Simple/Narrow/Depth/All/Flat and Flat default target. Never modify Chrome contextMenus just to capture a cloud outline.
- It is also distinct from the per-bucket **Depth Recovery** setting (which may cover only selected buckets to chosen crawl depths). Whole Cloud does ALL available buckets/keys for each checked account regardless of that setting, with read-only permissions.
- It writes to the user's chosen Recovery Mode Backup Location: **%LOCALAPPDATA%\Click2Cloud\Recovery\** (Automatic default), or **Documents\Click2Cloud\Backups\** (Documents alternative). Changes to Backup Location must carry the job checkpoints, progress journals and partial/final exports through copy→verify→switch without loss or silent restart.
- Regular four recovery namespaces (menu-config, depth-config, depth-index, recovery-policy) keep separate CURRENT, monthly delta journals and Weekly/Daily immutable snapshots. Whole-cloud jobs need their own scoped durable namespace and progress journal; reusing verified depth-index data as a starting hint is fine, but never assume it proves all-account completeness.
- Whole Cloud Outline helps recover and inspect historical directory/key *knowledge*; it **cannot restore deleted cloud object BYTES**. No automatic remote writes, billing changes, bucket creation or source mutation.

## Focused real acceptance

1. Two Cloudflare accounts + one S3-compatible account, check all: one independent job per account with exact stable identities; all authorized buckets and paginated keys covered. Failures in one account do not stall the others.
2. Start in ISO week45 2026, pause across multiple weeks, finish in week50: final **backup-cloudflare-week45-50-2026.json**, not a falsely complete week45 file; across year boundaries use both ISO years. Allow arbitrary duration, including months.
3. Lose OAuth mid-scan: Paused — Reconnect Required, durable partial knowledge remains. Successful login to **same** account automatically resumes from last valid checkpoint; another account login must NOT resume it. Expired cursors rescan affected partition only; verified knowledge retained.
4. Weekly progress/update by default, Daily when chosen; Chrome closed with working companion executes scheduled resume; missing scheduler truthfully reports overdue and performs later catch-up.
5. Incomplete or inaccessible bucket, revoked read scope, rate limits, disk-full, malformed page, corrupted checkpoint, changed cloud during scan and final JSON write failure: accurately disclose partial/blocked state. Never silently claim COMPLETE or delete old verified discoveries.
6. Validate exported JSON against independently listed cloud sample paths. No object payloads, keys/tokens, source URLs or unintended remote writes. Do NOT read, run or expand the old 1,000-scenario project to satisfy this feature.
