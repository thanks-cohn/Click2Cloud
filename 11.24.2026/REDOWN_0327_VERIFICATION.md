# REDOWN 0.3.27 verification

The implementation branch is `codex/redown-0327-ux-aesthetic-repair`. Its clean starting HEAD was `29b439eab42b65f9a4c520555a47c9c3ff6efcf0`. The changes from the required base `2404b39ca528e579f9a4bf312ccb5f29d5896c0d` to that HEAD were the two work-order documents. The starting package and manifest were 0.3.26. The package, lockfile, manifest and packaged build are 0.3.27. The Chrome extension ID, existing host grants, OAuth registrations and deployed Worker code digest match the starting build.

## Behavior and implementation

| Work order | Implementation and source |
| --- | --- |
| A · Remotes | `extension/app.mjs` restores the Cloudflare controls to the original full-width `#connection` layout. `extension/basic-provider-cards.mjs` and `extension/aesthetic.css` reserve status and information space, separate the auth and provider actions, and flash verified success twice. Long status details scroll within their reserved region. |
| B · Navigation and layout | `extension/navigation.mjs`, `extension/app.html`, `extension/app.css` and `extension/queue-page.mjs` enforce four main tabs and persist explicit order. The header fits a single row and moves tabs to More when space runs out. Files, Remotes and Queue remain the defaults. Legacy History is reachable from More. Queue headings, search, paging and the Manage Destinations footer use the existing controls. |
| C · History V2 | `extension/basic-history-preview.mjs`, `extension/history-v2-cards.mjs` and the Basic API use each original `history.get` record. Retained preview data stays in the original Basic store. The Cloudflare path still uses `openRemoteResult` and `readFileChunk`, with screenshot output and checksum checks. The Basic live read requires the saved object ID, account and applicable drive or namespace. Preview availability and errors are independent of Download. |
| C · Metadata | `extension/history-v2-preferences.mjs` defaults Hide N/A fields to on. Provider-specific fields and reset apply to History V2. The view updates open cards in place, including zero and false values, through extension storage. Legacy settings, receipt storage, export schema and search indexing retain their existing owners. |
| D · Feedback | `extension/projectile.js` and `src/aesthetic/projectile.mjs` render a brief charge, flight, tapered trail and burst. Basic admission and the Cloudflare Worker acceptance response drive the projectile. Durable first verification drives `src/chrome/daily-badge.mjs` and `src/chrome/save-notice.mjs`. The toolbar sequence is R → badge → R at 180 ms with 100 ms gaps. The green badge background leaves the count in its existing text channel. Partial screenshot delivery keeps its verified-output count. |

Visual feedback defaults to enabled, Normal speed and randomized colors. Theme matching uses the Aesthetic host's active accent. Reduced motion suppresses the projectile and shows static card success text. The content script uses the two existing web host grants. It keeps one recent point per frame in memory, sends no page coordinates or URLs to the worker, and creates DOM only during an active flight. Same-origin frames draw in the outer viewport. A cross-origin frame uses its own viewport when Chrome permits injection. Stale gestures, unavailable frames and restricted pages can skip feedback while the save continues.

## Verification

Commands run from the release checkout with Node 24.22.1 and Chromium 155.0.8059.79.

| Command | Result |
| --- | --- |
| `npm ci --no-audit --no-fund --cache /workspace/.npm-cache` | Installed the locked development dependencies. |
| `npm run build:extension` | Packaged `dist/click2cloud/` and passed the MV3 import and version gates. |
| `npm run check:api-docs` | Passed for 78 methods and three shortcut commands. |
| `npm test` | 810 passed of 811. Exercises existing auth, screenshot, right-click, Cloudflare `workerd` and R2, receipt, Queue and lifecycle suites. |
| `node --test --test-isolation=none tests/release-0327.test.mjs tests/queue-history-v2.test.mjs tests/daily-badge.test.mjs tests/workings.test.mjs` | 28 passed, including settings migration, both preview authorization and cancellation, toolbar opt-out and source-map integrity. |
| `node --test --test-isolation=none tests/basic-core.test.mjs tests/basic-auth.test.mjs tests/basic-providers.test.mjs tests/basic-host.test.mjs tests/queue-history-v2.test.mjs tests/screenshot.test.mjs tests/daily-badge.test.mjs tests/mv3-import-policy.test.mjs tests/release-0327.test.mjs` | 204 passed across Basic auth and provider adapters, screenshot receipts, badge restart, MV3 packaging and History V2. |
| `C2C_BASELINE_BUILD=work/0327/baseline-package node scripts/test-0327-browser.mjs` | Seven fixture gates passed, including 64 appearance and width combinations and Chromium decoding for four provider fixtures. |
| `C2C_BASELINE_BUILD=work/0327/baseline-package C2C_BASIC_EVIDENCE=work/0327/basic-browser node scripts/test-basic-reliability-browser.mjs` | Passed the Basic migration, OAuth isolation, pending native save, read-back and badge sequence fixture gates. |
| `C2C_HISTORY_V2_FIXTURE=1 C2C_HISTORY_V2_EVIDENCE=work/0327/scale node scripts/benchmark-history-v2.mjs` | Passed 100,000-record first, last and deep jumps and a complete disk-backed ZIP export in Chromium. Python independently verified CRC, SHA-256 and all 100,000 ordered identities. |
| `C2C_HISTORY_V2_FIXTURE=1 C2C_HISTORY_V2_COUNT=200000 C2C_HISTORY_V2_RETENTION=1 C2C_HISTORY_V2_EVIDENCE=work/0327/scale node scripts/benchmark-history-v2.mjs` | Passed capped rollover, explicit purge of 200,000 synthetic records and isolation from replayed records. |
| `C2C_HEADLESS=1 C2C_SHELF_EVIDENCE_DIR=work/0327/installed npm run test:shelf:extension` | `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR`. `scripts/test-queue-v2-browser.mjs` also failed to load the unpacked extension under this policy. |

The baseline suite passed 800 of 802 cases. The checked-in source-derived API map still identified a 0.3.24 build. Its version now matches the package. The existing `non-Narrow non-Depth composition stays byte-identical; Narrow intentionally gains actual bucket boundary` fixture has different golden menu digests on the base. The 0.3.27 work leaves those menu projections and golden digests intact. The older `npm run test:browser` harness timed out waiting for Log in on both versions. `scripts/test-scoped-explorer-ux-browser.mjs` reached the same Recovery Mode expectation failure on both versions.

The scale run used approximately 222 MiB of reported site storage. The ZIP was 46.8 MiB. The slowest sampled direct page read was 45.9 ms. Export took about 11.9 seconds with at most 100 records in a batch and approximately 29.1 MiB peak sampled JS heap. Hardware and storage affect these figures. Basic live reads allow two in flight and cap each image file at 4 MiB and 16 megapixels. Out-of-view thumbnails release their URLs, gallery navigation aborts stale loads, and the Cloudflare preview cache retains at most two entries. Retained images display at up to their native size until the user enters Zoom view. The projectile caps activity at four flights per worker and three per frame, with zero idle animations or polling timers.

The evidence directory contains synthetic fixtures and before/after screenshots. The scale receipts identify the pre-commit builds used for each run. [Browser checks and screenshots](../docs/evidence/redown-0327/) · [100,000-record export](../docs/evidence/redown-0327/benchmark-100000.json) · [200,000-record retention](../docs/evidence/redown-0327/benchmark-200000.json) · [Installed Chromium attempt](../docs/evidence/redown-0327/installed-chromium.json)

## Remaining external checks

Installed Chrome action-icon appearance, the native menu gesture through a real Shelf, OS notification presentation, and authenticated provider acceptance remain unverified. Chromium fixtures cover real rendering with synthetic identities and files. Google Drive and OneDrive can use authorized, bounded content reads through their existing grants. The normal Dropbox grant omits `files.content.read`, so Dropbox saves without usable retained previews report the missing access. Preview limits, missing receipts and expired or mismatched grants have distinct user-facing results.

## Rollback

Revert the release commit on `codex/redown-0327-ux-aesthetic-repair` and run `npm run build:extension`. Keep the browser profile, local databases and existing cloud data in place. The release adds presentation preferences while retaining the existing database schemas and extension ID.
