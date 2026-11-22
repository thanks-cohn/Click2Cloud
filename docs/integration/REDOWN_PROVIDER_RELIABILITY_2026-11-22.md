# REDOWN provider reliability verification

The isolated storage and OAuth changes and all four Shelf refinements are implemented on
`codex/redown-basic-api-integration-0323-alpha-base-2026-11-21`. Local acceptance passed for the
Basic auth, verified-save, and data-preservation workflows. The alpha launch gate remains open
pending installed Chrome and Edge and real-provider results.

## Reproduction and new behavior

- Baseline `38e432d6c2b82ecbb8df82fdb9f905079bb828c3` was a clean checkout of the existing
  feature branch. One deliberately pending Basic IndexedDB open left simultaneous Google,
  OneDrive, Dropbox, GO TO, and counter requests unanswered at the fixture's 100 ms observation
  limit. The integrated browser build existed and the policy-blocked result occurred before
  a worker target could be observed. The owner's original outage cause and original Chrome
  disappearance remain unknown.
- The same trusted Basic API v1 routes auth, passive status, and provider-site navigation
  independently of the durable store. Opening or recovering the original database has one
  shared deadline. IndexedDB open is uncancellable, so an unsettled request retains its slot
  and a late connection is closed. An interrupted recovery transaction is aborted. History,
  counters, diagnostics, and save admission still await completed recovery. Pre-existing
  interrupted attempts become `UNCERTAIN` without replay.
- Each provider has independent sign-in and verification flights. Reconnect stages and verifies
  a candidate against the recorded account or root before committing it. Cancellation, bad
  callbacks, and mismatched identities preserve the previous record. Rotated Dropbox and
  OneDrive refresh credentials are persisted before follow-up probes. A per-provider browser
  session marker guards an outstanding OAuth window across worker restarts. It contains an
  ID and timestamp, and expires after ten minutes. A restarted worker leaves the original
  callback with its original browser request.
- Google verifies the Drive permission ID and retries one stale cached token after a 401,
  without a second interactive window. The provider cards use safe failure codes, bounded
  message waits, and targeted status events. Passive status may reuse a recent verification
  for 30 seconds. Refresh and save admission verify current provider authorization.
- The build retains extension ID `ajppphdiamdobknpamcheohmdbdbeoal`, manifest version 0.3.23,
  permissions, client registrations, and all four native command definitions. The package
  uses one MV3 worker and the existing native menu registrar. The Cloudflare engine and OAuth
  source matched the baseline byte for byte.

## Source comparison

| Original behavior and source | Adopted for Click2Cloud | Evidence and exclusions |
| --- | --- | --- |
| Google quiet restore, click-only consent, account proof, cached-token eviction after 401. The Google auth module is identical across the three references. [Google auth](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/extension/google-drive-auth.js) | Preserve Chrome Identity and the unified Drive client. Require an established local binding for passive renewal. Classify browser, configuration, network, consent and HTTP errors. | Google auth tests cover cancellation, identity drift, cached 401 recovery, unsupported browser and a hung token call. Earlier extension IDs, provider queue and Drive upload writer were excluded. |
| Dropbox independent consent and refresh, trusted storage, exact root and restart verification. [Dropbox auth](https://github.com/thanks-cohn/REDOWN/blob/7b9d1cc7faa7511ed57e9e09b1b5281380fede2d/extension/dropbox-auth.js) | Reuse Basic PKCE and refresh storage. Verify default-root access and bind the reported home namespace on an existing account's next verification. | Tests cover account and namespace drift, root checks, reconnect rollback, and rotation before a failed probe. Original full team-root routing, a parallel queue and namespace override were excluded. |
| OneDrive single active sign-in and refresh, exact state and redirect, account and drive-root verification. [OneDrive auth](https://github.com/thanks-cohn/REDOWN/blob/653ad9b5fdd59532df571514fc60053d8a7b13bb/extension/onedrive-auth.js) | Retain the unified Entra registration and Basic Graph account and root probes. Publish success only after the credential commit. | Tests cover root drift, 24-hour and 48-hour expiry, cancellation and stale refresh commits. Separate OAuth diagnostic flow and older Graph uploader were excluded. |
| One synchronous entry and provider-specific dispatch. Later revisions improved interrupted-save receipts but introduced additional recorder machinery. [November 3 checkpoint](https://github.com/thanks-cohn/REDOWN/tree/checkpoint/2026-11-03-good-before-p0-menu-startup-repair) [Later checkpoint](https://github.com/thanks-cohn/REDOWN/tree/95-percent-plus-success) [Latest original worker](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/extension/service-worker.js) | Keep the present registrar and Basic IndexedDB recovery fence. Use one account-verified authorization call per save. | Built-module tests cover startup dispatch, blocked IndexedDB and lost receipts. The old worker, provider upload writers, recovery alarms, and capless archive were excluded. |
| Basic main at `75a738803e61cf7fa62c50328aa6ca5cc2cd70dc` owns the v1 API, save coordinator, ledger and ZIP exporter. [Basic architecture](https://github.com/thanks-cohn/redown-basic/blob/75a738803e61cf7fa62c50328aa6ca5cc2cd70dc/docs/ARCHITECTURE.md) | Keep its existing database and coordinator as the sole Basic save authority. | Preserve the version-1 IndexedDB layout, credential namespace, 32 MiB source payload limit, two-save cap, diagnostic retention, and existing 16 MiB ZIP limit. |

The November 3 tag records a native menu startup problem. The later tag records 119 completed or
verified attempts and two blocked attempts among 121 retained. The wider reported session and
the apparent browser crash lack enough retained evidence for a session-wide rate. Both tags
and the original main tip were resolved to their documented commits before selecting patterns.

## Evidence and remaining gates

| Check | Baseline | Final implementation |
| --- | --- | --- |
| `npm run test:focused` | 635 passed | 686 passed |
| `npm test` | 726 passed, one failed | 777 passed, the same one failed |
| Build and API reference | Passed | Passed, including 78 API methods and three documented shortcut commands |
| Targeted Basic, History, screenshot, native and reliability suite | 104 Basic tests passed | 217 targeted tests passed |
| Right2Cloud module | — | 49 passed |
| Customer History and Aesthetic Chromium fixtures | Baseline package captured for the paired header check | 13 History gates and 29 Aesthetic gates passed |

The retained full-suite failure is the archived non-Narrow/non-Depth composition digest
assertion at `tests/depth-scope-regression.test.mjs:46`.

| Gate | Local result | Installed and live result |
| --- | --- | --- |
| Cold start and native menus | **PASS** with the packaged worker in Chromium. One runtime message listener, one command listener, one install listener, one startup listener, one native click listener, and the existing two alarm listeners. A cold native click reached the Basic coordinator while another provider's check succeeded. | **UNVERIFIED**. Chromium 156.0.8078.79 returned `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR` for the actual unpacked build. Installed cold boot, disable/enable, update over a real profile, real browser-worker termination and native menu rendering remain open. Edge was unavailable. |
| Basic storage and verified saves | **PASS** for stuck/blocked opens, queued recovery abort, corrupt fixture, quota failure, wrong account, invalid receipt, lost commit acknowledgment, and over-limit source. All three adapter fixtures exercised independent object identity, filename and byte/checksum verification with exactly one durable success count. | **UNVERIFIED** against installed profile data and live providers. |
| Google Drive | **PASS** for Chrome Identity fixtures including stale cache, cancellation and readiness isolation. | **UNVERIFIED** in installed Chrome. Verify the Click2Cloud REDOWN Alpha extension client in Google Cloud Console, its association with the packaged extension ID, Drive API enablement, consent audience/test users, `drive.file`, and an actual `about.get` response. Edge requires a supported and registered Google flow if its Identity token API is unavailable. |
| Dropbox | **PASS** for PKCE, cancellation, home-root binding, token rotation, restart and verified-save fixtures. | **UNVERIFIED** in Chrome and Edge. Verify the installed app's exact `/dropbox` callback, scopes and app-folder/home-root behavior using the owner's Dropbox registration. |
| OneDrive | **PASS** for PKCE, early rejection, original Graph account/root, expiry, rotation and verified-save fixtures. | **UNVERIFIED** in Chrome and Edge. Verify the Entra SPA `/onedrive` redirect, supported account types, delegated `Files.ReadWrite`, `User.Read` and `offline_access`, and the extension origin's token exchange. |
| Cloudflare R2 | **PASS** for synthetic connected-state availability during a blocked Basic store and existing local Worker/R2 tests. The existing `click2cloudOAuth` record stayed readable while Basic used its own credential namespace. | **UNVERIFIED** for Windows Chrome OAuth, native TRUE REMOTE writes and independent live verification. |
| Stored histories and diagnostics | **PASS**. The old build seeded `saved-before-upgrade`, `failed-before-upgrade`, `uncertain-before-upgrade`, and `uploading-before-restart`. The candidate retained four IDs, three unchanged terminal timestamps, unchanged creation timestamps and ordering across two pages, one confirmed ledger count, all four associated diagnostic events and the retained settings. It opened a readable existing ZIP export while collection was off. Recovery changed only the interrupted attempt to `UNCERTAIN`; a new explicit failed click added one result and left the confirmed count at one. | **UNVERIFIED** on an installed customer profile. |
| Shelf UI | **PASS** for 192 header geometries and 64 screenshot Host URL theme/width cases. The existing title and manifest identity were checked from the built files. History verified a real Chromium fixture-profile restart, correct placement, legacy fallback, one disclosure per operation and JSON/JSONL/CSV plus screenshots-excluded exports. The actual packaged launcher fixture showed both shortcut statuses for assigned, missing, cleared and customized bindings, and preserved a dismissal on update/reload. Both command IDs made one capture each through separate saved rules in the local fixture. | **UNVERIFIED** for Chrome's browser-owned title row, actual key registration/conflicts, and physical shortcut dispatch in an installed build. |

The header sweep covered Minimal and Frames with all five built-in palette font sets, Remote V1,
Golden Age, Oceania, and Nostalgia Kawaii, Dungeon Master and Heroine. Theme-owned palettes
apply to Remote V1, Golden Age, Oceania and Nostalgia. Widths were 280, 320, 360, 480, 600 and
1100 CSS pixels in light and dark. The History sweep used the same theme inventory at 320 and
360 pixels. The existing connected-state button label is now `Reconnect`; `Sign In`,
`Refresh` and `GO TO` retain their behavior. Basic has no user-facing disconnect action on
this branch. A reconnect to a different account remains blocked.

If Edge lacks the Chrome token API, the remaining owner-console work is to confirm a Google
OAuth client type supported by the installed Edge extension's redirect flow, register its exact
callback and consent audience, and verify that code exchange can operate without a client
secret in the extension. The existing Chrome client stays bound to its registered flow.

## Resource observations

Three serial baseline/candidate pairs used Linux Chromium 156, five logical CPUs and 34,087 MiB
of visible system memory. Each build ran 20 card mount/close cycles against one packaged worker
fixture in a real renderer with IndexedDB and mocked browser APIs. Timings and heap sizes below are
medians of the three pairs. CDP TaskDuration covers renderer work with the fixture. It is distinct
from OS-level service worker or panel CPU. An earlier run with concurrent browser jobs produced a
larger timing difference. The serial pairs had overlapping ranges.

| Measurement | Baseline | Candidate |
| --- | ---: | ---: |
| First card mount to ready | 56 ms | 55 ms |
| Median reopen to ready | 7 ms | 7 ms |
| Renderer task duration across the run | 200 ms | 196 ms |
| JS heap after cycle 20, before forced GC | 3,988,524 bytes | 4,421,592 bytes |
| Retained JS heap after forced GC | 2,666,376 bytes | 2,656,672 bytes |
| Provider verification calls | 80 | 5 |
| Local storage reads / writes | 139 / 25 | 22 / 6 |
| Credential writes / access-level calls | 20 / 82 | 1 / 2 |
| Basic DB opens / maximum open Basic handles | 1 / 1 | 1 / 1 |
| Basic DB transactions | 61 | 61 |
| JavaScript timers created / peak outstanding / idle outstanding | 10 / 2 / 0 | 134 / 11 / 0 |
| Mock Chrome alarms | 2 | 2 |

The extra short-lived timers bound message, auth and storage waits. Provider fixture accesses fell
as recent verified states were reused, and passive polling remained absent. The hung-operation
tests confirmed single active open and per-provider verification lanes. **UNVERIFIED** for
installed browser worker and panel RSS peaks, Windows performance at 4 GB RAM, an actual disk
near capacity, and sustained installed worker restarts. Quota injection exercised atomic
ledger finalization and optional diagnostic failure independently.

## Pushed implementation checkpoints

| Commit | Checkpoint |
| --- | --- |
| `5efea66379a1b7461991aadbfab54b4cb3288929` | Isolate provider requests from database recovery |
| `7e85322aeffcbe302a09a36928dcdd35bb8478c8` | Stage and verify replacement grants |
| `316beb76db138a8da7df703983b86adf6c3a386f` | Test packaged lifecycle and persisted Basic data |
| `92b5ce682975f80f21dda7a4fc3cf8c4710d9e80` | Compact Shelf header and Reconnect label |
| `85b28526261be4ad814d226d1e6b7f0972277231` | Screenshot Host URL disclosure and preference |
| `e8c2fc83f0f9fc4e2d6d728cc53d18196f8a18c4` | Both browser shortcut statuses and first-run repair |

## Reproduction commands

Run the following from the existing Click2Cloud checkout with the supplied Node 24 toolchain.
The paired fixture commands accept `C2C_BASELINE_BUILD` pointing to the saved package built
from `38e432d6c2b82ecbb8df82fdb9f905079bb828c3`. Keep browser evidence in a disposable output
directory using the script's evidence environment variable.

```sh
npm run build:extension
npm run test:focused
npm test
npm run check:api-docs
node --test right2cloud-module/tests/module.test.mjs
node scripts/test-basic-reliability-browser.mjs
node scripts/test-shelf-header-browser.mjs
node scripts/test-screenshot-history-url-browser.mjs
```

An authorized installed-build session must verify each provider's actual native right-click
write and independent object ID, filename and byte/hash readback against one Basic History
record, one counter increment and a diagnostics ZIP. A disposable installed profile can then
exercise worker termination, reload, browser restart and conflicting keyboard assignments.
