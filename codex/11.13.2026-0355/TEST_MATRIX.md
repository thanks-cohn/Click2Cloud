# Test matrix and evidence classification

Baseline `a11dcf55b293a10cb8270084fee084db098221ec`. Version 0.3.19; Chromium 156.0.8078.79 Linux. All commands run from `/workspace/Click2Cloud` unless noted. Logs retain runner output; no tests are disabled or expectations changed outside the requested Depth root label.

| Check / scenario | Baseline | Final | Evidence / limitation |
| --- | --- | --- | --- |
| `npm ci --cache /workspace/.npm-cache --ignore-scripts --no-audit --no-fund` | PASS | retained | Frozen lockfile; writable cache corrects default home-cache failure; TLS/integrity remain enabled |
| `npm run build:extension` | PASS | PASS | build-before.log / build-after.log; packaged stylesheet link and module checked |
| `npm run test:focused` | 319/319 PASS | 319/319 PASS | focused-baseline-complete.log / focused-final.log |
| `npm test` full offline | 362/363 | 370/371 (one known failure) | Same existing Simple golden mismatch; final includes added focused regression/scoring tests |
| `node --test right2cloud-module/tests/module.test.mjs` | not rerun baseline | 49/49 PASS | module-after.log |
| `node --test tests/logic2real-score.test.mjs tests/depth-scope-regression.test.mjs tests/logic2real-depth-save.test.mjs` | new tests not present | 23/23 PASS | targeted-final.log; 384 combinations inside one matrix assertion |
| Original Depth shape fixtures | 12/12 | 12/12 | Existing logic2real-depth-save suite; only root label expectation adjusted |
| Modes / bucket counts / per-bucket limit | compared | 384/384 generated cases | Depth off/on; mixed controls; 0/1/2/4 buckets; 1/4/5/10; empty, chain, siblings; hidden false/true |
| Unrelated composition | baseline hashes | 192/192 byte-identical | non-depth-baseline.json; includes Quick and Narrow/Simple additive controls |
| All action/target identities | baseline snapshot | 888/888 preserved | menu-comparison.json; eight label/provenance changes only; 2,876 identical rows |
| Sole Depth root and nested Save here | generic root label | root bucket-qualified; nested retained | Structural parent/target assertions, never a global label removal |
| Same names across accounts/buckets | generated | preserved | Matrix and original registrar→engine fixture; no live identity claim |
| Shared Save storage error/retry/revision/discovery/ACK failure | fixture | PASS | Existing settings commit test; same-key retries and stale supersession tested |
| Fresh/empty/failed/incomplete crawl | fixture | PASS | Original bounded-discovery and replacement-inventory tests; unknown never proof of empty |
| Worker plan same-bucket different-prefix | not new live run | READY in synthetic controls | Production transport, signed fixture grants; root / Images / Images/same |
| Missing/state/account/bucket/protocol plan failures | no new live run | correctly blocked | No request/provisioning for five setup-required causes; original live cause unknown |
| Depth DOM eye/trash sizes at 1000/360 viewport | 81px tall / narrow wrap | 32×32px both widths | layout-{before,after}/results.json and screenshots; real Chromium, fixture IPC |
| Simple/Narrow DOM noninterference | recorded | exact same rectangles/styles | Browser script compares measurements against retained baseline |
| Long label, 23 scopes, paging, hidden draft, numeric input, focus, 150% zoom | captured | PASS local assertions/screenshots | layout screenshot pairs; no committed config changes from eye/delete |
| Native unpacked Chrome extension / genuine Shelf | BLOCKED | BLOCKED | shelf-{before,after}/real-shelf-receipt.json: UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR |
| Actual rendered native submenu screenshots / clicks | UNVERIFIED | UNVERIFIED | Administrator policy; generated plans cannot replace this evidence |
| Real R2 writes and independent destination readback | no authorized destination | UNVERIFIED | Zero new remote attempts; no credentials supplied |
| Real MV3 worker / browser restart and native rehydration | UNVERIFIED | UNVERIFIED | Offline registrar recovery checks pass; not installed runtime proof |
| Shelf closed/failed fallback, counters/history in real save | UNVERIFIED | UNVERIFIED | Source and fixture evidence only; no cloud success claimed |
| Reported WORKER_SETUP_REQUIRED | historical user failure | OPEN / BLOCKING | Read-only investigation report; clicked row remains unknown |

## Early attempts preserved rather than mistaken for final results

`focused-before.log` reports 137 cases but also an asynchronous ERR_MODULE_NOT_FOUND for miniflare while installation was incomplete. It is **not** a valid complete baseline. A fresh full baseline archive with installed dependencies produced 319/319 in focused-baseline-complete.log. `focused-after.log` and `offline-after.log` caught the required CURRENT workings-map update; it was synchronized without altering immutable baseline sections. Final logs supersede these attempts. No zero-test or interrupted run is counted as validation.

## Remaining matrix exposure

The 384-case product covers the listed axes, not every possible cross-product of network/auth/restart/default/quick/error state. Existing suites exercise Default/Quick conflict, hidden defaults, unavailable entries, stale generations and retries separately. Live default/quick, context visibility (image/link/audio/video/page), exact object-key correctness, recovery, arbitrary Chrome depth and user-gesture fallback remain unverified. Hidden modes, mixed buckets and offline observations are source/fixture checks only.

Baseline DOM reproduction: archive the exact baseline to an isolated temporary directory (not a worktree), then run `C2C_PHASE=before C2C_SOURCE_ROOT=/tmp/c2c-depth-baseline node scripts/test-depth-layout.mjs`. The server reads that archive; evidence remains in the active checkout. Run the normal after command only after baseline capture completes. This avoids mixing asynchronous attempt outputs. Final paired result files both contain six successful mode/width measurements.
