# REDOWN P0 safety risk register

Baseline: `2b0c37fb0ff991ffd9bbc267236c656babc54b7d` on the authorized Click2Cloud integration
branch. Primary comparison: REDOWN `653ad9b5fdd59532df571514fc60053d8a7b13bb`.
Use an isolated profile and synthetic records for fault injection. The installed-browser
probe returned `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR`. The owner's Chrome profile,
Bing source and November 22 Dropbox ZIP were unavailable for inspection.

| Location | Risk and evidence | Impact | Mitigation and regression proof | Status before changes |
| --- | --- | --- | --- | --- |
| Manifest, Basic source loader | **Observed, high likelihood.** Optional web access and the generic transport failure produce a per-site action even when access is granted. | High. Repeated dialogs and dropped save intent. | Declare required web access, preserve browser approval and withheld-site controls. Check each permitted origin before source work. Test denied, revoked, login/HTML and network cases separately. | Observed |
| Basic source URL and redirect handling | **Source-confirmed, high severity.** Existing credentialed follow fetch lacks explicit private-address and per-hop guards. | High. Widening access exposes private endpoints and credentials. | Use credentialless acquisition, validate targets before fetching, bound redirects/bytes/time, reject uninspectable redirects and private/literal targets, and keep provider requests byte-only. Test restricted origins and cleanup under cancellation. | Safety gate |
| Basic coordinator and DB recovery | **Source-confirmed, high likelihood.** Native AUTH_REQUIRED/website denial ends the gesture. Worker death after a final write can leave an ambiguous result. | Critical. Lost intent, wrong target, duplicate cloud object or false success. | Keep the canonical attempt ID and same coordinator. Fence provider account/root, bound waiting intents, distinguish pre-write interruption from an uncertain remote write, retain existing DB and enforce idempotent receipt commit. Test same-click resumption, interruption, duplicates and lost acknowledgments. | Safety gate |
| Browser OAuth and trusted storage | **Reported, exact installed cause unknown.** Google silently returns or rejects, OneDrive callback can close without completion. | High. Auth outage or loss of a valid grant. | Retain registrations, staged grants and independent provider lanes. Classify browser, policy, callback, token, identity and storage failures. Test expiry, revoked grants, cancellation, concurrent sign-in and account mismatch. | Installed phase unverified |
| Dropbox adapter and confirmation receipt | **Reported.** User cannot locate apparently saved objects. Existing adapter reads back object, name and bytes. | High. Verified write may be in a different account or app folder. | Trace actual verified destination metadata with privacy guards, preserve upload path unless a defect reproduces, and expose evidence in local History/diagnostics. Test exact readback and wrong-root failure. | Owner ZIP and live proof unavailable |
| Native menu dispatch and worker startup | **Known historical failure, medium likelihood.** Awaiting initialization, popup loops or repeated background work can lose native gestures or destabilize 4 GB systems. | Critical. Shelf and all provider menus may stop working. | Keep synchronous listeners and one registrar/worker. Conserve active-save and memory limits, run existing cold-start and browser fixture gates, and fail closed when storage is unhealthy. | Installed cold start unverified |
| Global toolbar accounting | **Source-confirmed, high likelihood.** The existing badge only reads host History and local download totals. Basic receipts never join the projection. | High. Undercounts, migration double counts, replay or quota corrupts totals. | Base totals on durable proof, join Basic accounting by verified operation, keep historical baseline and guard concurrent/restarted/replayed receipts. Test old stores, deleted History, rollover and failures. | Observed |
| Toolbar icon/badge success sequence | **Foreseeable.** Concurrent saves, late Chrome calls and worker interruption can overlap or strand green states. | Medium. False or stuck success indication and excess CPU. | Serialize bounded alternating stages using static artwork, reset on start/failure, coalesce overflow, and derive success solely from newly committed verified receipts. Test timings, mutual exclusion and restart restoration. | Safety gate |
| Shelf layout, API and version metadata | **Foreseeable.** Theme breakpoints, changed contracts or version drift can break navigation/render/upgrade. | High. Inaccessible tabs or failed install. | Reuse Aesthetic tokens; test the theme and width matrix, keep Basic v1 and stored preferences compatible, and verify the packaged manifest/extension ID. | Pending |
| Actual Windows memory, disk and provider verification | **Known evidence gap.** Managed Chromium runs fixture workflows only. | Critical for alpha. | Measure bounded fixture resource use and quota failure, keep live acceptance open, and specify owner-console and installed profile checks. | Unverified |

## Source permission checkpoint

- Packaged host permissions use required HTTP/HTTPS site access and Chrome's approval flow.
  Controlled reads report declined access, HTTP errors, actual unavailable transport, HTML and
  redirect rejection distinctly. Provider requests continue to receive only bytes and metadata.
- Opaque redirects remain a release risk. A Chromium loopback test returned
  `opaqueredirect`, status 0 and no Location for a manual redirect. The direct target received
  no request. Inspectable public hops pass independent per-hop access and address validation.
  Sources whose next hop is hidden need a direct file link. Installed extension redirect/CDN
  behavior and Chrome Local Network Access policy remain unverified.
- 162 targeted tests, packaged build, and the Aesthetic fixture passed. The baseline packaged
  lifecycle fixture passed. Baseline suites reported 686 focused passes and 777 full passes
  with one archived Depth digest failure.

## Pending save and provider evidence checkpoint

- Tested with 169 Basic and source audit checks. The packaged Chromium fixture delivered one
  native OneDrive menu click, ran the staged OAuth callback and exchange, held the granted
  account and root while source access was withheld, then resumed the same ID after recreating
  the worker fixture. The mock Graph readback matched the object ID, root, filename, length and
  checksum. IndexedDB retained one History receipt and one Basic lifetime increment after a
  further restart. Concurrent resume and canceled consent tests recorded no duplicate upload.
- The browser fixture exposed a real Chromium incompatibility with resizable source buffers.
  The source reader now detaches its growable buffer into fixed-length bytes before decoding,
  hashing or upload. The unknown-length browser case passed after the fix. Older engines use
  a single fixed buffer capped at 32 MiB.
- Pending URLs live in trusted Chrome session storage for at most the ten-minute authorization
  window. Only the attempt ID, stage and sanitized History fields survive browser exit. A missing
  or expired session cannot replay a write. Account/root mismatches stop before upload.
- Google readiness and consent errors, OneDrive callback phases, and Dropbox receipt destination
  fields are distinguishable in local evidence. Installed registration, account access and the
  owner's Dropbox object locations remain unverified. The Cloudflare grant and API paths were
  exercised for isolation in the fixture. Real token refresh and R2 access remain unverified.

## Global badge checkpoint

- Basic verification updates the original ledger, lifetime total, History and today's badge
  projection atomically in the existing version-1 database. The badge also counts existing
  Cloudflare/host receipts and local downloads. Replays cannot move a receipt to a new day or
  signal another success. History deletion retains any available legacy proof date. Older deleted
  receipts without a date keep their lifetime credit. They cannot be assigned to a specific day.
- The legacy audit is resumable in batches of 64 ledger entries. A badge ending in `+` during
  reconciliation shows a verified lower bound. The established `1k+` cap still applies. Missing
  or blocked Basic storage leaves Cloudflare and authenticated provider status independent.
- The toolbar uses static icon assets and four 140 ms pulses with three 24 ms handoffs. Packaged
  fixture recording showed two alternating icon and badge pulses with a normal final state and
  no simultaneous green. The queued work is capped at three chases including the active chase.
  Startup restores the normal icon and badge color without replaying animations. Pinned toolbar,
  operating system browser themes and real MV3 suspension are unverified.

## Shelf and version checkpoint

- The Shelf fixture passed 192 theme, palette, color mode and width cases, including 280 CSS
  pixels. Files, Remotes, History and More fit on one row. Each slogan sentence fits on one line.
  Heroine loses the decorative strip and its padding. The tested theme-owned framing remains.
- Files, Remotes, History, More, keyboard focus, provider actions and screenshot shortcut
  feedback remain reachable. A synthetic withheld grant continued the same attempt and a
  failed save produced a temporary notification outside the provider cards.
- The package, manifest and source build metadata report 0.3.24. The packaged extension ID,
  default icon, registered client, commands and single worker entry point match the baseline.

## Final verification status

- 701 focused tests passed. The full run passed 792 tests and reproduced the same archived
  Depth composition digest failure as 0.3.23. The build and API documentation checks passed.
- The repeatable paired Chromium fixture retained one Basic database handle and no idle timers.
  Twenty idle card mounts used 4 Basic transactions instead of 61. Median forced-collection
  renderer heap was about 27 KB higher and median task time was 4 ms higher. Windows memory,
  disk pressure and live service-worker behavior remain unverified.
- The unpacked 0.3.24 package was blocked before worker startup by the managed Chromium policy.
  Live OAuth, provider object and installed toolbar acceptance remain open. The observed
  opaque redirect restriction is recorded as a source compatibility blocker.

[0.3.24 implementation and verification report](docs/integration/REDOWN_0324_P0_VERIFICATION.md)

## 0.3.25 Chrome shortcut repair

The working behavioral baseline is `5e1cb5f`. The regression comparison is `cd4c8dd3`.
Browser approval and verified receipt behavior are separate from native command delivery.
Official Chrome for Windows is the primary acceptance environment. [Regression investigation](docs/integration/REDOWN_0324_SCREENSHOT_REGRESSION.md)

| Risk | Impact and safeguard | Evidence and remaining gate |
| --- | --- | --- |
| Web source grant and screenshot grant diverge | An HTTP(S) host grant can expose the URL while Chrome still denies `captureVisibleTab`. Keep existing source approval and check the command's tab/window. Report missing capture grant and browser page-access errors separately in bounded diagnostics. | Reproduced on official Linux Chrome with 0.3.24 Alt+Q set to Global. The owner's Windows grant state and command scope remain unverified. |
| Global shortcut or missing tab/window | Guessing the last active tab risks capturing an unrelated page. A tabless command must resolve one active document in a focused normal window. Chrome supplies or denies the capture grant. Focus or document changes abort before upload. Browser settings retain effective user bindings. | Targeted tests cover authorized tabless recovery, missing grants, unfocused and mismatched windows, and changed tabs/documents. Windows behavior remains open. |
| Navigation, focus and capture policy | A foreground change, browser page, protected page, withheld grant or rate limit may interrupt capture. Existing tab/window/document checks protect pixel and URL correspondence. Native failures publish allowlisted categories without raw URLs, tokens or error text. | Targeted tests cover moved tabs, unsupported pages, policy, grants, quota and malformed PNG. Windows policy behavior remains open. |
| Shelf open, routing and focus | Gesture rejection, unavailable API, missing window, cold session read and rapid shortcut presses can prevent routing or leave stale state. Use Chrome's native callback to retain the gesture for the tabless command, preserve the last real view on failure, and acknowledge focus only when the Shelf can receive keys. | Global tabless rejection and callback repair verified on official Linux Chrome. Its already-visible panel can retain webpage keyboard focus. Windows panel routing, focus and native close remain release gates. |
| Interrupted worker, oversized image or rapid presses | Keep existing two-capture admission bound, byte limit, observer cleanup and expiring retry bytes. Incomplete or invalid captures leave no verified receipt or positive count. | Screenshot, restart, duplicate, frozen-byte retry and badge fixtures exercise retained safeguards. Windows MV3 interruption remains open. |
| Cloud credentials and duplicate verified receipts | Keep screenshot bytes on the existing authorized R2 path. Provider metadata and diagnostics retain existing redaction. Readback verifies the exact keys and bytes, retries preserve confirmed outputs, and badge increments derive from durable proof. | Screenshot and Basic fixtures passed. Live provider and Windows toolbar verification for this build remain open. |
| Missing History URLs | Preserve stored data and URL safety checks. Render an absent URL as `N/A`, without a link. Keep privacy-enabled exports from disclosing browsing provenance. | History rendering/export tests cover absent values, retained URLs and privacy mode. |
| Future screen/window capture | Cancelled consent, blank/protected windows, leaked tracks, misleading History URLs or duplicate saves could expose private content or miscount. The feature remains gated on Windows P0. A future implementation needs an explicit browser picker, one selected source, bounded frame memory, cleanup on all exits and the existing verified receipt path. | Desktop picker, OS permission, native companion and global capture are unverified. |

The owner’s independent Windows recorder delivered 17 commands without a Tab and resolved an active HTTPS tab all 17 times. Missing callback context, Chrome capture permission, Shelf activation and final UI acknowledgement are separate proof boundaries. The existing Chrome-local breadcrumb store records bounded correlated steps with privacy-filtered RAW and SECURE export. A missing receiver, missing acknowledgement, worker interruption or quota failure can leave an incomplete trace. Exact native messages are limited to recognized patterns. Keyboard-layout changes may affect delivery before Chrome. The measured 17 events still reached Chrome, and there is no evidence that layout explained the subsequent Shelf failures. [Causal audit](docs/integration/REDOWN_0324_SHORTCUT_CAUSAL_AUDIT_0325_REPAIR.md)
