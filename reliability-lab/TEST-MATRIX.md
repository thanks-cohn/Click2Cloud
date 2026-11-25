# Reference only on UX branch: bulk matrix belongs to Reliability Lab

Use focused acceptance only; final NOTIFICATION-PREFERENCES.md and VISUAL-AND-HISTORY-FOLLOWUP.md override earlier visual and notification expectations. No global font overhaul; Liquid Black permanently dark; Large is baseline notification size.

# Realistic usage test matrix

All volumes below are proposed targets for Codex to parameterize, not completed tests. An operation is a user action or API invocation; HTTP calls, assertions, retries and committed files are separate counters. Scale fixture runs independently from browser and live runs. Use current supported menu depth/count limits; over-limit cases must produce truthful bounded behavior. No actual user files or unrestricted websites in fixtures.

## Usage profiles (seeded scenarios)

| ID | User category | Example daily workload | Realistic sequence and assertions |
|---|---|---|---|
| U01 | Casual collector | 15–40 saves, 3–5 browsing sessions | Simple mode, root and favorite destinations; save an image, close Shelf, reopen later, preview, download, check exact bytes and receipts. |
| U02 | Organized researcher | 80–200 saves, 10 folders, 15 searches, 10 renames | Narrow mode across nested destinations; navigate Back/Forward/Up/Refresh, create folder, right-click save, search by text and digits, rename and confirm location, delete only a disposable file. |
| U03 | Deep archive curator | 150–300 saves, 20 folder creations, 20 moves/renames, 30 lookups | Depth mode, multiple QA buckets and nested/sibling paths; validate correct menu hierarchy, exact destination and no phantom folders. Switch bucket, refresh, return to prior location. |
| U04 | Heavy image collector | 2,000 saves across an 8–12-hour day | 20 bursts of 100, with reading/idle intervals; mix Simple/Narrow/Depth sessions, occasional duplicate names, previews, searches, and restart. Fixture accelerated clock or real timed soak clearly distinguished. |
| U05 | Local-file organizer (R2) | 30–100 uploads in 5–10 batches, 10 folder operations | Open Explorer dropdown, Upload last, choose multiple local images, cancel picker once, switch folder while transfer runs, verify pinned destination, progress, final bytes and refresh. No Basic local Upload. |
| U06 | Screenshot-heavy workflow | 100–250 screenshots, short bursts of 2 | Shortcut and screenshot rules, default concurrency 2 where actual setting exists, logged out vs authenticated, History and previews; verify screenshot bytes/destination and no duplicate history. |
| U07 | Multi-cloud user | 60–120 remote saves across R2/Drive/Dropbox/OneDrive | Switch accounts and providers, reconnect one provider, verify isolation, Basic receipts and correct IDs; no assumption of equal capabilities or R2-only UI on Basic. |
| U08 | Long-lived browser session | 8–24 h, 100–400 saves, repeated idle intervals | Worker idle/wake, Shelf close/open, browser restart, auth expiry/reconnect, retained settings, right-click recovery and pending operation reconciliation. |
| U09 | Limited-resource user | 40–100 saves, 100k synthetic History records | Narrow Shelf widths, rapid scrolling/search, constrained test profile; monitor memory and responsiveness. Do not fill actual system disk or intentionally exhaust host RAM. |
| U10 | Unreliable network | 50–150 attempts with controlled failures | Timeout, 429/503, interrupted reads, delayed verification, auth failure, offline/reconnect; honest outcome, bounded retry, no phantom success or destructive replay. |
| U11 | Maintenance and cleanup | 25 create/upload/rename/delete cycles | Only owned fixture/QA objects, cancel confirmations, stale listing and conflict cases, ensure unrelated sentinels remain. |
| U12 | First-time and returning user | 5 cold installs/profile starts plus 20 reconnect cycles | Auth consent in appropriate test setup, menu available after login, correct default settings, explicit settings persist, no repeated prompts or false ready status. |

## Operation and fault matrix

| ID | Category | Cases | Proposed fixture target | Browser/native evidence |
|---|---|---|---:|---|
| M01 | Simple menu | empty/one/multi destination, root Save here, login/logout, refresh | 10,000 generations | 20 native selections + lifecycle |
| M02 | Narrow menu | selected/all modes if supported, nested paths, root Save here, multiple buckets | 10,000 | 20 native selections |
| M03 | Depth menu | root + child paths, siblings, maximum supported depth, wide tree, refresh | 10,000 | 20 native selections |
| M04 | Dispatch | correct menu IDs -> exact account/bucket/key, stale menu, duplicate event, unavailable source | 10,000 | 20 real context menu clicks across modes |
| F01 | Create | mkdir at root/nested, duplicate names, Unicode, invalid paths; create bucket fixture separately | 5,000 | 10 GUI folder creations |
| F02 | Upload (R2) | single/multi local files, empty-file support per API, small/large images, collision keep/skip/replace as supported, cancellation, pinned destination, staging uncertainty | 5,000 | 20 actual file-input selections; check Upload last, disabled in invalid context |
| F03 | Rename/move | same/cross folder where supported, collision, stale ETag, interruption | 5,000 | 10 GUI renames/moves |
| F04 | Delete | file/folder, cancel, stale identity, partial failure, foreign sentinel, ownership guard | 5,000 | 10 GUI deletions in isolated fixtures |
| F05 | Browse/read | back/forward/up/refresh, pagination, preview, download, stale response | 5,000 | 20 GUI sequences |
| S01 | Remote saves | real synthetic image bytes, sizes, duplicate names, 3 modes, correct source/provider | 10,000 | native dispatch plus actual result checks |
| S02 | Screenshot | shortcuts, rules, bursts, cancellation, login state, permissions | 1,000 | 20 real capture scenarios where supported |
| H01 | History | screen/Screenshot/partial/numeric/mixed, filters, old/new records, clear query, no matches vs empty range | 10,000 | 20 GUI queries |
| H02 | Queue/receipts | pending/verified/failure/uncertain, cancel vs dismiss, retry, duplicate events, expiry | 10,000 | 20 GUI scenarios |
| A01 | Auth/lifecycle | expiry, reauth, cold/warm, worker eviction, logout, browser restart | 1,000 | 20 controlled cycles; true worker termination evidence |
| X01 | Mixed state | seeded operations with model of expected inventory, settings and History | 10,000 actions | 10 sequences of 10–25 actions |
| X02 | Fault injection | 429, 503, timeout, disconnect, partial commit, delayed/duplicate events, storage write failure | 1,000 | 10 targeted browser scenarios |
| X03 | Visual/theme | all actual themes/palettes, narrow/normal widths, footer expiry/X, success animation, no duplicate toast, preview no flicker | exhaustive supported combinations for smoke | screenshots and actual assertions |
| X04 | Scale/soak | 100k synthetic records, 2k/day profile, worker restarts and memory plateau | 1k/10k/100k scale stages | 1h then 8h/24h separate opt-in sessions |

Targets overlap by design: do not sum them as unique saves or claim 100,000 real cloud uploads. Adjust to measured capacity; retain reasons for any reduced coverage. Fixture counts are not native or live counts.

## Example deterministic scenario: organized afternoon (seed 32917)
1. Create disposable QA directory A and nested B using existing mkdir. List both, record model.
2. Set Narrow; confirm expected native menu and Save here in A/B according to configured mode. Right-click synthetic image into B; verify destination, content and receipt.
3. Select Upload at bottom of toolbar dropdown; choose two local PNG files. While uploads are pending navigate to A; verify both still target B, no stale refresh hijacks current view. Confirm final bytes and history/queue behavior supported by production.
4. Switch to Depth, refresh and save a third image into B using native selection. Switch Simple and save to explicitly selected root of isolated test prefix, not the real bucket root.
5. Search History for screen, mixed case, partial filename and digits; clear and verify filter state. Preview image and navigate, observe stable Immersive View button.
6. Rename one owned file, verify old/new keys; intentionally collide with another owned file and assert selected conflict policy; leave unrelated sentinel untouched.
7. Inject transient timeout in a fixture run, reconcile before retry. Restart browser or suspend worker, assert menu recovery and no duplicate saves.
8. Delete owned test files and directories only; compare actual inventory to model and verify sentinel. Record all operation IDs, receipts, bytes, timings and any uncertainty.

## Data and execution profiles
- Typical images: deterministic PNG/JPEG fixtures (small 10–100 KiB; ordinary 100 KiB–2 MiB; occasional 5–20 MiB), varied filenames, Unicode and duplicate basenames. Generate valid fixtures; deterministic random bytes for binary tests only.
- Use arrival patterns: mostly sequential human-paced operations, bursts of 2–5, explicit larger concurrency stress only after baseline; idle periods and navigation. No artificial concurrency treated as typical usage.
- Tier quick: existing tests plus 10–20 cases per critical operation and one native smoke if available. Tier regression: target 100–1,000 per family, browser samples as above. Tier stress: high-volume fixture targets above. Tier soak: duration-labelled real-clock 1h/8h/24h, with bounded workload. Tier live: default opt-in smoke 20 writes max and <=20 MiB, later larger only explicitly approved. 
- Run with recorded random seed, actual mode settings, exact build SHA, environment and fixture version. Retain failed seed and minimal replay steps. Compare baseline and candidate on same machine and settings.

## Mandatory cold onboarding regression (P0)
See VISUAL-AND-HISTORY-FOLLOWUP.md for TARGET_NOT_DISCOVERED evidence and acceptance criteria. Separate fresh state for Simple-first, Narrow-first, Depth-first and all six orderings; never reuse a Depth-warmed fixture to prove independent first-use setup. Cross unprepared/prepared QA bucket, empty/nested paths, supported visibility/Flat/All choices, retry, restart and reconnect. Assert configuration persistence, native menu, exact destination dispatch, independent save verification and truthful receipts. Compare before/after Depth setup and record state transitions. Root cause unknown until reproduced. Include compact Refresh and appearance toggle accessibility, alignment and actual behavior in visual regression matrix.

### Automatic readiness / recovery visibility acceptance
For every supported destination-creation entry point, fresh Simple/Narrow/Depth must work following ordinary authorized login without separate setup or Repair Me. Exercise concurrent setup, already healthy targets, delayed discovery, unprepared isolated targets, bounded transient recovery, exhausted recoverable failures, manual Repair Me success/failure, logout and auth expiration. Assert no redundant healthy-worker deployment, unrelated bucket mutation or duplicate recovery; button hidden during healthy/automatic paths, visible only on eligible exhausted failure, gone on verified recovery. Verify compact bottom-right footer button and Manage Destinations bottom-left, keyboard and reduced motion. See authoritative follow-up for constraints.

### Final owner clarification — 0.3.30
A brand-new user after ordinary authorized login must be able to create and persist a valid Simple or Narrow destination and immediately perform a verified remote save, without prior Depth configuration, manual worker activation, separate bucket preparation, restart, or Repair Me interaction. This is a P0 release gate across every supported creation entry point; independently test clean Simple-first and Narrow-first states. Depth remains independently functional. Repair Me is the final approved label for the compact contextual last-resort control (all prior visibility, behavior and placement requirements remain unchanged).
Existing Frames skins and all existing Nostalgia themes/skins must retain their exact existing colors, typography, artwork and aesthetic styling from 0.3.29. Oceania typography remains protected exactly. Scope new Frames aesthetic/typography to Liquid Black only. Functional improvements remain applicable across themes; do not leak shared typography or aesthetic overrides into protected skins. Verify computed styles and visual regressions against baseline.
