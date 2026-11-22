# REDOWN 0.3.24 P0 implementation and verification

The 0.3.24 implementation is on `codex/redown-basic-api-integration-0323-alpha-base-2026-11-21`.
The installed-browser acceptance gate is **blocked**. Linux Chromium 156.0.8078.79 refused the
actual unpacked package with `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR` before a worker could
start. The owner’s Windows profile, original Bing resource, November 22 Dropbox diagnostic ZIP,
and authenticated provider accounts were unavailable. Live acceptance and alpha readiness remain open.

## Baseline and source comparison

The starting worktree was clean at `2b0c37fb0ff991ffd9bbc267236c656babc54b7d`. The baseline
packaged as 0.3.23 with extension ID `ajppphdiamdobknpamcheohmdbdbeoal`. It used a single MV3
worker and native menu registrar, the separate `redown-remote-basic-v1` IndexedDB database at
version 1, and Basic’s `redownRemoteBasicV1:auth:` credential namespace. The Cloudflare credential
namespace was `click2cloudOAuth`. The manifest had four browser commands and optional broad web
source hosts. The paired fixture observed one runtime message, command, install, startup, and
native-click listener and two alarm listeners.

| Area | Original REDOWN checkpoint | Click2Cloud 0.3.23 gap and 0.3.24 implementation |
| --- | --- | --- |
| Website access | At `653ad9b`, required HTTP/HTTPS hosts made the normal native click work across granted sites. The checkpoint mostly used credentialless source reads. | Optional hosts and generic fetch errors produced per-site permission prompts and a second right-click. Broad hosts now require Chrome approval. The fetch checks effective permission, omits credentials and referrer, validates inspectable redirect targets, and classifies source failures. The source cap remains 32 MiB and two active saves. |
| Drive | Native Google consent used Chrome Identity with account proof and worker-owned transfer state. | Basic now retains the exact native save when authorization needs attention and reuses the current Drive client. Silent success, stale cache, browser/profile/policy errors, cancellation and grant verification have distinct paths. |
| Dropbox | A durable `awaiting-auth` job resumed after login. The original uploader independently checked provider acknowledgment. | Basic uses the existing coordinator and ledger for the same attempt. Readback records the verified account, home namespace, reported path when available, filename and object ID locally. The existing upload route still uses the app’s authorized default root. The claimed three `SAVED` outcomes from nine attempts could not be checked against the unavailable ZIP or the actual Dropbox account. |
| OneDrive | The old OAuth flow used PKCE and an exact `chromiumapp.org/onedrive` callback. First login still asked for another click. | The owner’s later retest confirmed actual OneDrive saves after site approval. Basic retains its Graph upload and independent confirmation. The same pending ID can continue after OAuth and source access. The callback, state, token exchange, identity, root and receipt phases have distinct outcomes. |
| Startup and recovery | The November 3 startup checkpoint (`7b9d1cc`) and later main (`c78babc`) provided lifecycle and provider comparisons. The `653ad9b` tag retained 119 verified or complete attempts and two blocked among 121 records. The larger session and apparent browser disappearance remain unresolved. | Basic retains one coordinator, native registrar, MV3 worker, existing storage and trusted API v1. Outstanding writes with ambiguous acknowledgments remain `UNCERTAIN`. Auth/status and provider navigation remain available when the Basic save DB is blocked. |
| Toolbar | The old extension used persisted receipts and a toolbar flash. In the integrated branch the toolbar showed the existing local-day total and `1k+` cap. | The original daily indicator now includes verified Basic receipts alongside existing host receipts, screenshots and completed local downloads. Static green icon variants replace continuous drawing and alternate with the number badge. |

Basic main at `75a738803e61cf7fa62c50328aa6ca5cc2cd70dc` guided the API, storage and verified
receipt checks. The implementation uses the existing Click2Cloud adapters, original Basic v1
database and provider-specific authorization. Source and page URLs remain local under the existing
History and diagnostic policy. Provider requests carry file bytes and the metadata needed to save
and verify them. [95-percent-plus-success](https://github.com/thanks-cohn/REDOWN/tree/653ad9b5fdd59532df571514fc60053d8a7b13bb) · [November 3](https://github.com/thanks-cohn/REDOWN/tree/7b9d1cc7faa7511ed57e9e09b1b5281380fede2d) · [Original main reviewed](https://github.com/thanks-cohn/REDOWN/tree/c78babc314acc5891203e95b169f027756e956c1) · [Basic architecture](https://github.com/thanks-cohn/redown-basic/tree/75a738803e61cf7fa62c50328aa6ca5cc2cd70dc)

## Permission and data behavior

- Chrome’s approval for the new required website access can appear during installation or update.
  Chrome site access and enterprise policies remain authoritative. Effective permission is checked
  before reading a source. A genuine withheld grant can retain the attempt and offer one explicit
  web access action in the Shelf. Normal granted saves avoid a per-site dialog. An actual transport,
  HTTP, login/HTML, partial-file or invalid source error gets its own outcome in local records and
  transient feedback.
- Standard Chromium Fetch returned an opaque redirect with no visible `Location` in the local
  redirect probe. Code can validate and follow an inspectable public hop. An opaque hop fails
  closed before sending the redirected request. Affected sources need a direct file URL. Real
  Bing/CDN behavior and Chrome’s DNS and local-network policy remain release gates.
- A pre-write pending save is tied to its provider, original attempt, source and any verified
  account/root. The exact private input stays in trusted session storage for a ten-minute window.
  It can survive MV3 worker recreation within the Chrome session. After a full browser exit,
  an unfinished intent whose session input is gone cannot automatically resume. Completed receipts
  remain durable. A replacement native save requires a new user gesture.
- The daily projection is recorded in the same transaction as each verified Basic receipt and the
  existing lifetime count. Failed, pending, canceled, uncertain and duplicate outcomes earn no
  count or animation. A resumable audit processes up to 64 legacy ledger rows per pass. Old records
  with a verified date join the matching local day. Previously deleted records with no available
  date retain lifetime credit. A temporary `+` suffix indicates a verified lower bound during an
  incomplete projection. The `1k+` cap and local midnight rollover still apply.
- Files, Remotes, History and More share the existing header row. The slogan has two lines in
  all themes. Heroine loses its decorative strip and related spacing. History, diagnostics,
  installed commands, and the File Explorer destination and accessible name are preserved.

## Test results and resource observations

| Test | Baseline | 0.3.24 candidate |
| --- | --- | --- |
| `npm run test:focused` | 686 passed | 701 passed |
| `npm test` | 777 passed, one failed | 792 passed, same one failed |
| `npm run build:extension` | PASS | PASS. Package, lockfile, manifest and build metadata agree on 0.3.24. |
| `npm run check:api-docs` | PASS | PASS. 78 API methods and three documented shortcuts. |
| Packaged Chromium lifecycle fixture | PASS | PASS. Tested cold dispatch, blocked Basic DB, old credentials and History, isolated outages, safe diagnostics ZIP, consent and readback, durable badge, and an already-authorized one-click save. |
| Packaged Shelf fixture | Baseline package captured | PASS. 192 nav/slogan/theme/palette/width cases, keyboard/navigation, pending-save feedback, and shortcut status. |
| Aesthetic and screenshot History URL | Prior regression fixtures passed | PASS. 29 Aesthetic checks and 64 History theme/width cases, including existing preferences after fixture restart. |
| Real unpacked browser | BLOCKED by Chromium administrator policy | BLOCKED by the same policy. |

The full-suite failure is the same archived non-Narrow/non-Depth composition digest assertion
at `tests/depth-scope-regression.test.mjs:46`, with the same differing digests as the baseline.
The code candidate was built from `132260f00a9dc6703d848391b31570866d28ad4a` with source digest
`8f15d4550bb0c84e92593c069b6ab8ae4d8fb001066f7c4f457de37d2a99139a`.
[Installed-browser receipt](../evidence/redown-0324/installed-chromium.json)

Three serial baseline/candidate pairs used real Chromium IndexedDB and CDP renderer metrics.
Each measured 20 provider card mounts with the packaged worker modules in the renderer, synthetic
Chrome API calls and provider responses. Renderer task and heap numbers reflect that fixture.

| Median measurement | Baseline | 0.3.24 candidate |
| --- | ---: | ---: |
| First mount to authorization ready | 40 ms | 43 ms |
| Reopen to authorization ready | 6 ms | 5 ms |
| Renderer task time | 162 ms | 166 ms |
| Renderer JS heap after cycle 20 | 4,382,768 bytes | 4,404,116 bytes |
| Renderer JS heap after forced collection | 2,664,180 bytes | 2,690,832 bytes |
| Local storage reads / writes | 22 / 6 | 22 / 6 |
| Basic DB opens / maximum open handles | 1 / 1 | 1 / 1 |
| Basic DB transactions | 61 | 4 |
| Provider readbacks / writes / popups during mounts | 5 / 0 / 0 | 5 / 0 / 0 |
| Timers created / peak outstanding / idle outstanding | 134 / 11 / 0 | 134 / 11 / 0 |

The candidate removes repeated latest-outcome scans on idle card mounts. Its new toolbar projection
uses a bounded one-time audit and reads the current day's totals after verified writes. Tests
covered 24-hour and 48-hour expiry, token rotation, revocation, canceled consent, a blocked open,
injected quota failure, overlapping requests, excessive source size, interrupted attempts and
lost commit acknowledgments. Peak OS memory, disk pressure, actual worker CPU and long-session
stability on a 4 GB Windows computer remain **unverified**. [Fixture measurements and receipt trace](../evidence/redown-0324/chromium-fixture.json)

The toolbar chase uses 140 ms for each green state and 24 ms for each handoff, or 632 ms of
scheduled intervals. The three measured fixture traces finished in 634, 635 and 634 ms. The
recorded order was **R green → idle → badge green → idle → R green → idle → badge green → idle**.
All four icon sizes preserve the white R silhouette. The linked stills show the icon assets on
light/dark backgrounds and the actual Heroine Shelf fixture at 360 CSS pixels.
[Light toolbar assets](../evidence/redown-0324/toolbar-assets-light.png) · [Dark toolbar assets](../evidence/redown-0324/toolbar-assets-dark.png) · [Heroine Shelf fixture](../evidence/redown-0324/heroine-shelf-360.png)

## Installed acceptance still required

| Gate | Verified locally | Installed and live status |
| --- | --- | --- |
| Chrome startup and profile upgrade | One packaged worker fixture, cold native dispatch and provider isolation. Existing Basic data and settings survived fixture upgrade, failed database open and recovery. | **UNVERIFIED** on Windows Chrome and Edge. Install, enable/disable, update over the existing profile, transport, native menus and real MV3 restart are blocked by unavailable environments. |
| Source access | Permission outcomes, credentialless direct reads, blocked/redacted source categories and bounded buffers tested. | **UNVERIFIED** for the owner’s Bing resource, another known public image, controlled failing URLs and actual Chrome permission controls. Opaque redirects remain unsupported. |
| Google Drive | Tests covered native gesture continuation, cached-token retry, scope and account proof, rejected/canceled auth and independent provider status. | **UNVERIFIED**. In Google Cloud Console check the current Chrome Extension OAuth client’s binding to `ajppphdiamdobknpamcheohmdbdbeoal`, Drive API enablement, consent audience and test users, and `drive.file`. Capture Chrome Identity’s safe result category and a Drive `about.get` identity before verifying a real object. For Edge, first confirm that its installed Google auth flow has a matching supported OAuth client and registration. |
| OneDrive | Packaged Chromium fixture traced a native click, `S256` callback, token exchange, account/root probe, withheld site access, same-ID continuation, independent object proof and a durable receipt with badge `+1`. The later ready click saved without a popup or Shelf detour. | **UNVERIFIED**. In Microsoft Entra App registrations, check `a8e034a8-6462-4022-b3f3-a79ffb6b1b84`, the exact `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/onedrive` redirect, intended account types for `/common`, SPA/public-client configuration for the PKCE token exchange, and delegated `Files.ReadWrite`, `User.Read` and `offline_access`. Verify the actual file in the intended account/root and its receipt after Chrome restart. |
| Dropbox | PKCE, same-intent continuation, token rotation, account/root guards and independent object proof passed with synthetic provider responses. | **UNVERIFIED**. Confirm the Dropbox app’s registered `/dropbox` redirect for the same extension ID, access type and granted scopes. Correlate the original ZIP with the intended account, app folder or home namespace, actual path, filename and object ID from readback. |
| Cloudflare R2 | Credential isolation, refresh/revocation paths and the existing local Workerd/R2 tests. The Cloudflare provider, OAuth and Worker source match the baseline. | **UNVERIFIED**. A stored `redown/` destination is configuration. Confirm the safe refresh result and exact account/bucket readiness. A missing refresh grant or provider `invalid_grant` can produce `REAUTH_REQUIRED`. Verify an actual TRUE REMOTE save in the original account. |
| Toolbar | Simulated Chrome Action calls showed two alternating R/badge pulses, no overlap, restore to idle and durable post-restart count. A rapid batch kept all receipt counts and bounded the animation queue. | **UNVERIFIED** for the actual pinned toolbar, system theme backgrounds, real Chrome worker suspension and recovery. |

[P0 safety risk register](../../P0-safety-risk-register.md) · [P0 request](../../codex-request-redown-basic-95pct-click-once-save-2026-11-22.md)

## Implementation checkpoints

| Scope | Verified GitHub commit |
| --- | --- |
| Required source permissions and failure classification | `ccda4f8f0908038f3e18aed3d4f826dfa34c415c` |
| Same-intent provider authorization and source continuation | `38a8ff82ae44d7373019a20e3f53fb555fbdbe64` |
| Global badge projection and alternating chase | `d9b72a0e06d52273fa1097e31e55ce70f8af470f` |
| 0.3.24 version, Shelf navigation, slogan and Heroine | `6957e7a036cd2f6b706e82cd58ade1422daf9336` |
| Compatible Shelf module and authorized native fixture | `132260f00a9dc6703d848391b31570866d28ad4a` |
