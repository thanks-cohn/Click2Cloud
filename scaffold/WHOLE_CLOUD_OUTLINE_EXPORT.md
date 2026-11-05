# Click2Cloud — Save Whole Cloud: dated multi-week cloud-outline capture

**Status:** Binding owner product and Codex implementation contract. DOCUMENTATION ONLY; no working exporter, scheduler or real-cloud capture is established by this document.

## Settings placement and user interaction

At the VERY BOTTOM of **Settings → Recovery Mode**, after Weekly/Daily, Simple/Narrow recovery switches, expandable bucket Depth Recovery, and Backup Location:

1. **Connected Clouds dropdown** supports MULTIPLE CHECKED selections. Show every connected authorized **Cloudflare R2 account** AND **each other connected S3-compatible cloud/account** (e.g., AWS S3, Wasabi or other actually supported S3 endpoint). Include Select All and Clear All. Distinguish same-name providers by exact provider, connection ID, account ID, endpoint/region identity. Unauthorized/logged-out entries may be shown as Reconnect Required but never treated as available.
2. **Save Whole Cloud** button below the dropdown starts a durable, READ-ONLY full cloud-outline capture job for EVERY checked cloud connection, not just the active/default one. The button stays at the BOTTOM of Recovery Mode. No checkbox means disabled with explanation. Provide an accessible per-connection progress display: started at, last scan, discovered buckets, keys/paths, incomplete ranges, status, attempts, next resume, export pathname and integrity.
3. This is a **metadata-outline backup**, NOT a copy of cloud file bytes. Include every bucket and every accessible key/prefix/folder path in the chosen account using authorized provider listing APIs, not only configured Simple/Narrow destinations or the selected Depth Recovery/display bucket subsets. No application-defined maximum depth.
4. One selected provider account may produce multiple separate exports if required by account distinction or size. Never mix two accounts under an ambiguous display name. Never list/overwrite buckets/objects without scoped authorization.

## Duration — ONE-TIME ACTIVATION, SILENT CONTINUOUS MAINTENANCE FOREVER

**Explicit owner requirement:** **Save Whole Cloud is a single opt-in, NOT a task the user must repeatedly restart.** Once the user has explicitly selected their Cloudflare/S3 accounts and clicked Save Whole Cloud, Click2Cloud quietly keeps building and updating each selected account's read-only cloud outline **indefinitely**, without any application-imposed week or year limit, while its authorization remains valid and the user has not disabled it. One initial full capture may require 1, 5, 50 or more weeks. When that full pass completes, finalize a validated dated immutable snapshot, but **leave the capture subscription ACTIVE**, checking for newly added/removed/changed folders and keys in subsequent passes and periodically finalizing new dated snapshots. A first successful "Complete" is a snapshot milestone, **NOT a stop signal**.

- **Weekly is the DEFAULT quiet progress/checkpoint/resume cadence**, and Daily is available via Recovery Mode. The explicit first activation starts processing promptly; later scheduled passes continue without new user actions, including after Chrome or companion restarts. A new week neither completes nor cancels an unfinished pass.
- The authorized native companion schedules operations when available; if Chrome/companion cannot run, quietly mark overdue and resume on the next available execution. Never promise work while no scheduler runs.
- Keep durable read-only incremental job state, per-account bucket/key inventory, pagination cursor/frontier or restartable page identity, incomplete ranges, verified observations, revisions, timestamps and integrity. Persist to the selected external recovery folder using small durable commits and append-only journal; no giant full scan in RAM.
- Browser-on behavior is **low-priority, bounded and nonblocking**: throttle API pages, CPU, disk and bandwidth so normal browsing, the normal Cloudflare login flow, Click2Cloud File Explorer and right-click saves stay responsive. Reschedule on load/idle when safe; do not interfere with provider auth.
- Use authorized read/list APIs and safe rate-limits. Revisit changed portions where provider capabilities permit and periodically verify full listing coverage; never assume every S3 API offers a change feed. Retain known prior rows after a failed page with stale/partial labels; record deletions only with sufficient verification. A large cloud changing during a weeks-long pass does not equal an atomic single-time snapshot.
- Each fully covered pass may create a new immutable **backup-<provider>-<start-to-finish-week-range>.json**, plus an account-safe collision suffix if needed; multiple completed passes must never overwrite one another. While running, keep resumable internal state and optionally PARTIAL exports clearly labeled; COMPLETE means verified traversal for that pass, NOT deactivation.


## Authorization — never interrupt login, silently pause and resume

**After first activation, NEVER nag the user about the Whole Cloud feature.** No Save Whole Cloud confirmation again, modal, popup, toast, notification, consent prompt, badge or automatic navigation. In particular, **never insert a Whole Cloud step in the user's ordinary login flow**. Use only previously granted, currently valid read/list permission.

- If an already-issued token is valid, carry on silently. If the provider issues usable refresh credentials and permits silent renewal, refresh safely in the background. No OAuth access token is assumed to have infinite validity; NEVER bypass authorization expiry, scope restrictions, revocation or a deliberate disconnect.
- If authorized access disappears or silent renewal fails, **silently PAUSE** that account's job and preserve every verified outline observation, original start week, frontier and journal in the external recovery directory. Internally record `PAUSED_AUTH`; an unobtrusive "Paused — Reconnect Required" indication is visible **only when the user voluntarily opens Recovery Settings/History or diagnostics**. Do not display login demands or notifications from the Whole Cloud service itself.
- On the **next normal successful login to that SAME provider connection/account** (not a different account), after ordinary login has already succeeded, silently check the existing read/list authority and **AUTO-RESUME** the still-active job from its last durable checkpoint. Do not delay login, show any new screen or require another Save Whole Cloud click. If old page cursors expired during the pause, re-enumerate only the invalidated ranges and deduplicate without discarding known valid data.
- No new scopes are requested without explicit user action. Failed login or insufficient permissions leaves the job quietly paused; no repeated prompts or surprise consent escalation. Explicit user Stop, opt-out, remove-cloud or disconnect is authoritative and disables automatic resumption for that account until explicit reactivation.
- If the extension is reinstalled and its working storage is lost but the independent recovery root survives, restore the durable subscription and progress. If the user later reconnects that identical account, continue the original long-running outline subscription automatically without reselecting it.
- Never export tokens, S3 secrets, private browsing provenance or credentials in the outline or journal. Keep per-connection identity checks, privacy boundaries, network throttling, provider rate limits and robust error status.


## Dated output filenames — actual start/completion week span

Owner's filename format: **backup-<cloud-provider-name>-<date>.json**, adapted to record the FULL ISO week range that discovery occupied.

Examples (illustrative, never hardcoded):
- Complete within one week: **backup-cloudflare-week45-2026.json**
- Started week 45, completed week 50 of the same ISO year: **backup-cloudflare-week45-50-2026.json**
- Spanning an ISO week-year boundary: **backup-cloudflare-week52-2026-to-week03-2027.json**
- Other providers: **backup-aws-s3-week45-50-2026.json**, **backup-wasabi-week45-50-2026.json**

If two or more accounts share a provider, add a stable, safe account discriminator to the provider portion (e.g. **backup-cloudflare-account-a-week45-50-2026.json**). Sanitize names and prevent overwriting independent backups. Week/year come from ACTUAL scan start and completion (or last partial coverage date) using correct ISO week-year calculations.

**During an incomplete scan pass**, maintain durable resumable progress and optionally dated exports explicitly labeled PARTIAL. On COMPLETE for a particular pass, atomically finalize its validated dated JSON without overwriting an older pass, then **automatically proceed with the future scheduled refresh cycle forever while enabled**. A completed snapshot does not complete or disable the subscription. Use bounded chunks and portable manifests for very large outlines rather than repeatedly rewriting huge JSON.

JSON outline should retain schema/kind/version, exact cloud provider+account identity (not credentials), started/completed timestamps, ISO week range, bucket identities, full observed object key or directory/prefix paths, scan coverage and observation timestamps, complete/partial status, resumability/manifest and checksum validation. No object payloads and no browsing provenance.

## Relationship to existing recovery and Chrome menu

- Save Whole Cloud is **separate from** the popup Simple/Narrow/Depth configurations, popup-only Show Simple/Narrow/Depth/All/Flat and Flat default target. Never modify Chrome contextMenus just to capture a cloud outline.
- It is also distinct from the per-bucket **Depth Recovery** setting (which may cover only selected buckets to chosen crawl depths). Whole Cloud does ALL available buckets/keys for each checked account regardless of that setting, with read-only permissions.
- It writes to the user's chosen Recovery Mode Backup Location: **%LOCALAPPDATA%\Click2Cloud\Recovery\** (Automatic default), or **Documents\Click2Cloud\Backups\** (Documents alternative). Changes to Backup Location must carry the job checkpoints, progress journals and partial/final exports through copy→verify→switch without loss or silent restart.
- Regular four recovery namespaces (menu-config, depth-config, depth-index, recovery-policy) keep separate CURRENT, monthly delta journals and Weekly/Daily immutable snapshots. Whole-cloud jobs need their own scoped durable namespace and progress journal; reusing verified depth-index data as a starting hint is fine, but never assume it proves all-account completeness.
- Whole Cloud Outline helps recover and inspect historical directory/key *knowledge*; it **cannot restore deleted cloud object BYTES**. No automatic remote writes, billing changes, bucket creation or source mutation.

## Focused real acceptance

1. Two Cloudflare accounts + one S3-compatible account, check all: one independent job per account with exact stable identities; all authorized buckets and paginated keys covered. Failures in one account do not stall the others.
2. Start in ISO week45 2026, complete first full pass in week50: finalize **backup-cloudflare-week45-50-2026.json** but KEEP the account subscription active and produce later dated verified refresh snapshots without additional clicks; across year boundaries use both ISO years. There is no time cap.
3. Lose OAuth mid-scan or between completed refresh passes: silently pause and preserve verified data. **No backup notification, modal, login prompt or login delay.** The next ordinary successful login to the SAME account silently resumes from last durable checkpoint; another account must not resume it. Explicit user Stop/disconnect must prevent automatic resume.
4. Weekly quiet progress and continuing refreshes by default; Daily when chosen. Test first pass completion followed by years of continued read-only updates, browser actively in use without lag, background OAuth silent refresh where issued, browser closed with functioning companion and missed-scheduler catch-up. Login must not display extra recovery UI.
5. Incomplete or inaccessible bucket, revoked read scope, rate limits, disk-full, malformed page, corrupted checkpoint, changed cloud during scan and final JSON write failure: accurately disclose partial/blocked state. Never silently claim COMPLETE or delete old verified discoveries.
6. Validate exported JSON against independently listed cloud sample paths. No object payloads, keys/tokens, source URLs or unintended remote writes. Do NOT read, run or expand the old 1,000-scenario project to satisfy this feature.
