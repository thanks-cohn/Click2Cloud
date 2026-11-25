# REDOWN 0.3.31 Part 1 candidate

Part 1 is ready for installed-browser and authorized-provider acceptance. Chromium's administrator policy blocked unpacked extension installation in this environment. No live Cloudflare writes or Windows notification checks ran. The installed and live P0 acceptance gates remain open.

The application baseline was `3fd22f78408dac44155647b211ea37b623450fc1`. The requested branch started at `1a12244388617410a2729d8f12e1b9b4d38d1898`. The completed candidate source and verified build revision are `19d49c6eac2782fc001afbf6b696baa0ae8c2a0f`. The report and captured evidence follow it on the same branch.

The build identifies itself as **0.3.31 Part 1 candidate** via `version_name`. The numeric manifest, existing Chrome extension ID and OAuth callback are preserved. `npm run build:extension` creates the unpacked test package at `dist/click2cloud/`. The Screenshot Manifest and new audio/video playback remain assigned to Part 2.

## Console Era notification

The 0.3.30 route could drop an offer while the renderer was obtaining its tab/window identity. The existing claim budget also included artwork decoding and a second asynchronous Shelf context check from inside the claim handler. The Part 1 worker chooses the route before offering delivery. The addressed top-level renderer claims its token, then independently acknowledges the paint. The worker keeps its coalescing, claims and previous-notice clear operations per window. A missing ACK after a valid claim stays unconfirmed and does not trigger duplicate delivery.

The original Console Era PNG is byte-identical to the 0.3.29 reference at `31cce6680b5a3d76eb6b4e6bd1b7e4d82c5ebe69`. SHA-256 `409cf9242887d1c132a9790b84942111f9f46d8a669dfc2e109456ef687fbe52`. The packaged Chromium fixture compares the original and candidate Large geometry and exercises all four provider treatments, both requested positions, all sizes, the original animation timing, reduced motion, hover, keyboard/X dismissal and expiry. The worker fixture covers late replies, window identity and changed preferences. Real Chrome renderer delivery and the original customer's field failure remain unverified.

Only the prior REDOWN success ID `redown-verified-save` is cleared through the native notifications API. Verified saves, receipts, Queue and History continue through the existing owners. The bounded Glaciaring `chrome.save-notice` boundary records rendered, unconfirmed and unavailable outcomes without URLs or user filenames.

## Cloudflare local uploads

Explorer's Upload control opens one of two browser pickers. Both use `planLocalUpload` and `localUploadKey` in `src/chrome/local-upload-plan.mjs`. Planning checks the exact Cloudflare target and every relative path, including the selected folder name, with a 10,000-file ceiling and a yield every 128 entries. It validates before file dispatch. An empty directory has no file entries in the browser picker and cannot be represented by this upload path. File uploads retain the existing keep-both behavior and surface renamed outcomes. Folder uploads keep exact paths and skip colliding object keys.

Readiness is scoped to provider, account, connection, bucket and browsing folder. An identical positive result can be reused for 30 seconds and concurrent checks are deduplicated. The trusted Shelf `redown-local-upload` port receives correlated checks and a batch start. The worker revalidates live write readiness at batch start and checks the original account, session and scopes for each file. A location change during the picker or planning cancels the selection. Dispatch pins the destination and completion refreshes only the corresponding folder.

The port accepts a staged, single-use File ticket bound to the batch and index. Browser IndexedDB holds one staged file at a time per batch and passes metadata only over messaging. The worker accepts at most two simultaneous file transfers. It persists a per-file claim for the exact object key and records the point at which the final signed commit could be sent. The existing Universal File API stages the browser File, compares the cloud read-back to its byte stream, then uses the established conditional signed move. The final Worker receipt independently observes the key, byte count, version and ETag. This is staging byte comparison plus final R2 object identity verification.

Queue, History and the existing verified-save signal consume per-file outcomes. Cancellation stops new work and preserves a potentially committed operation as unconfirmed. The Queue **Check receipt** action asks the same provider transport for the interrupted operation ID. A persisted claim fences uncertain outcomes from blind replay. A browser restart cannot restore unselected handles and requires the user to select the remaining files again. Ambiguous remote staging objects can remain available for inspection.

The isolated workerd integration uses the production signed file and R2 code. It independently compares exact inventory and bytes after single-file, zero-byte, nested Unicode, same-basename and 2 MiB transfers. An existing-key collision caused no additional staging PUT. The lost-acknowledgement case recovered the final signed receipt by read-only inspection with one staging PUT and one matching final object. The browser fixture covers the real file and directory picker interfaces, nested paths, selection-independent readiness and cancellation using a synthetic Chrome port. Live provider, quota/disk exhaustion, actual worker termination and the full large/long-running workload are outstanding.

## History, appearance and Settings

- Host and Source each have their own bounded per-record disclosure outside Details. Fresh defaults are collapsed. Earlier explicit Basic URL preferences migrate to both defaults, and an earlier explicit screenshot Host URL preference migrates to the Host default. Valid recorded URLs use safe HTTP(S) links with opener isolation. Invalid and missing values display N/A.
- Chrome keeps the existing main frame and Screenshots surface. The paired 365 px Chromium captures and computed styles cover both Chrome color modes. Tabs keep the selected crimson fill, and the standalone crescent changes with intentional color-mode switching. The three-dot option styling uses the active theme without adding borders or shadows to individual options.
- Explorer and History previews reserve the top-right close-control position while the filename wraps. Settings keeps the attention preference at the bottom. Remote V1 keeps Programmatic Access, including the existing inspection action. Existing API methods, grants and authorization remain available independently of the theme.

## Recorded validation

| Command | Observed result |
| --- | --- |
| Baseline `npm test` | 833 passed, 2 failed of 835 |
| Candidate `npm test` | 838 passed, 1 failed of 839. The existing composition digest assertion at `tests/depth-scope-regression.test.mjs:41` remains. |
| `npm run test:focused` | Candidate 709 passed. Baseline 708 passed. |
| `node --test --test-isolation=none tests/{release-0327,explorer-upload,restoration-files,queue-history-v2,history,shelf-history-toggle,aesthetic,workings,reliability-ratchet}.test.mjs` | 76 passed, including production upload transport with local workerd/R2. |
| `C2C_BASELINE_BUILD=/workspace/scratch/0330-packaged C2C_0328_EVIDENCE=work/0331-browser node scripts/test-0328-browser.mjs` | 16 packaged Chromium checks passed with zero page errors. The paired screenshots are pixel-identical below the header in both color modes. [Browser receipt](evidence/part-1/packaged-browser.json) |
| `C2C_BASELINE_BUILD=work/0329-console-reference node scripts/test-console-save-notice-browser.mjs` | Passed original renderer comparison, geometry, provider colors, lifetime and controls in Chromium with fixture Chrome messaging. The reference directory contained the original `extension/console-save-notice.js` from `31cce668`. |
| `npm run check:api-docs` | Passed. 78 engine methods and 3 shortcuts. |
| `npm run build:extension` | Passed. The candidate Worker code digest matched 0.3.30. |
| `C2C_HEADLESS=1 C2C_SHELF_EVIDENCE_DIR=work/0331-installed npm run test:shelf:extension` | Blocked. Chromium returned `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR`. [Installed Chromium receipt](evidence/part-1/installed-chromium.json) |
| `node scripts/test-queue-v2-browser.mjs` | The real unpacked extension page returned `ERR_BLOCKED_BY_CLIENT`. |
| `npm run test:browser` | The installed gate recorded the administrator block. The older fallback fixture timed out expecting a startup heading with punctuation absent from the 0.3.30 baseline markup. |
| Baseline `node scripts/test-shelf-header-browser.mjs` | The older fixture stopped on its hardcoded 0.3.24 manifest assertion. The current packaged suite covered header geometry and themes. |

Chrome Screenshots captures for [baseline dark](evidence/part-1/baseline-screenshots-dark-365.png), [candidate dark](evidence/part-1/candidate-screenshots-dark-365.png), [baseline light](evidence/part-1/baseline-screenshots-light-365.png) and [candidate light](evidence/part-1/candidate-screenshots-light-365.png).

The baseline full-suite failures were the existing non-Narrow/non-Depth composition digest assertion and the stale CURRENT workings map. The historical snapshots remain immutable. The candidate updated the current-source ownership and workings maps.

The host ran Node 24.22.1 and Chromium 155.0.8059.79. Automated fixtures used isolated synthetic content. No production resources, credentials or existing user profile were used.
