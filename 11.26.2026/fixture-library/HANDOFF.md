# REDOWN 0.3.32.4 owner transfer handoff

The single-command owner upload and automatic independent location audit passed 600-file and 2,000-file local integration runs. The commands below run through the same REDOWN R2 staging verification, signed conditional publication, final R2 confirmation, and Queue/History accounting used by production uploads. The full specification remains open in the areas listed below. Windows owner and live Cloudflare acceptance are pending.

- Branch `codex/redown-11-26-2026-fixture-library-mvf45`
- Implementation checkpoint `d79b5cdcedab3dc397b3b59b7f9078fed827c122`
- Extension and Python CLI `0.3.32.4`, native wire `1.0.0`, production API `3+1.1`
- Extension ID `ajppphdiamdobknpamcheohmdbdbeoal`, existing OAuth callback, and Worker digest `WII8-sbOYHDudzbYd5B6X64NzhFwTIYRPhaqJM4_TdI`

## Windows CMD setup

Run from the existing repository root with Git, Node.js 22+ and Python 3.10+ installed. The two lines below apply when you have the previous release and have yet to create this local branch. `git switch` protects conflicting local edits. `lab-local\input`, prior runs, and the browser profile stay in place.

```cmd
git fetch origin refs/heads/codex/redown-11-26-2026-fixture-library-mvf45 && git switch -c codex/redown-11-26-2026-fixture-library-mvf45 FETCH_HEAD
npm ci && npm run build:extension && py -3 -m venv lab-local\.venv && lab-local\.venv\Scripts\python.exe -m pip install -e 11.25.2026\live-python-lab\python && lab-local\.venv\Scripts\redown-lab.exe init && lab-local\.venv\Scripts\redown-lab.exe install-host --extension-id ajppphdiamdobknpamcheohmdbdbeoal
```

If the local branch already exists, use this first line instead, followed by the same build/install line.

```cmd
git fetch origin refs/heads/codex/redown-11-26-2026-fixture-library-mvf45 && git switch codex/redown-11-26-2026-fixture-library-mvf45 && git merge --ff-only FETCH_HEAD
```

For a new checkout use `git clone --branch codex/redown-11-26-2026-fixture-library-mvf45 https://github.com/thanks-cohn/Click2Cloud.git`, enter the checkout, and run the build/install line.

1. Wait for existing jobs to finish. Reload the existing unpacked extension from `dist\click2cloud` in `chrome://extensions`. Verify version `0.3.32.4` and the ID above. Keep Chrome running during transfers.
2. Put the actual 600 files or their containing folder in `lab-local\input`. Putting the folder inside `input` includes its root name in each remote path. Top-level files retain their names. Nested paths, duplicate content under different keys, unknown formats, and zero-byte files are supported. Empty directories are recorded separately.
3. Connect in **Remotes** as usual. In **Settings → Python Laboratory → Configure session**, select your authorized account and existing prepared QA bucket. Select **Read and write a fresh QA prefix** and enter **75** minutes. Approve the displayed resource ceilings and click **Start session**. The default proposed ceilings cover the example below. Use the UI’s **Copy CMD** pairing command within two minutes, then run the transfer below. Pairing tickets stay in the existing private native boundary. Shelf and Settings can close after pairing.

## Upload all 600 and audit locations in one command

```cmd
lab-local\.venv\Scripts\redown-lab.exe campaign --input "lab-local\input" --output "owner-600" --operations upload --execution completion --benchmark-seconds 2400 --execution-seconds 3600 --inventory-seconds 1800 --transfer-seconds 300 --inactivity-seconds 120 --request-seconds 30 --upload-seconds 300 --verification-seconds 300 --authorization-minutes 75 --audit-seconds 300 --audit-requests 24 --audit-operations 56 --audit-traffic-bytes 8388608 --concurrency 1 --verification production --expect-files 600 --file-budget 600 --provider-requests 160000 --operation-budget 750 --traffic-bytes 8589934592 --temp-disk-bytes 1073741824 --approve-cost-usd 2.00 --live
```

The same command is available as `11.26.2026\fixture-library\owner-upload.cmd`. Change `--input` to a different source container if needed. `--output` selects a group beneath `lab-local\runs`. It must be outside the input. The CLI inventories and hashes the source, freezes the exact planned keys and operation IDs, checks the already approved resources, uploads, drains, and lists the isolated run prefix. The uploaded objects remain in that prefix for review. Production staging readback and final metadata confirmation still run. The independent audit uses authenticated R2 listing, so the owner upload creates no local file copies through any download leg.

The command's explicit ceilings support up to approximately 2 GiB of source bytes at the four-times modeled transfer multiplier, less the audit allocation. Browser quota can lower the effective temporary disk ceiling. If the command reports a shortfall, use the reported required and available values to adjust the named CLI limit, the trusted grant, or both. Failed preflight without admission produces frozen local evidence and no publication. After fixing an unadmitted shortfall, use the same command with `--new-run` to deliberately allocate a fresh isolated prefix. For 900 files use `--expect-files 900 --file-budget 900 --provider-requests 240000 --operation-budget 1050 --audit-requests 32 --audit-operations 80 --approve-cost-usd 3.00` and a new output group. Adjust byte and disk ceilings to your actual source and approval.

## Receipts and independent checker

The CLI prints the absolute receipt directory. The default example writes to `lab-local\runs\owner-600\<campaign-id>\`. `SUMMARY.txt` gives the result and exact shareable paths. All dates in the machine-readable files are timestamped independently of the local Windows display.

| File | Evidence |
|---|---|
| `resolved-manifest.json` | Frozen digest, scope, relative paths, planned sizes, source SHA-256, expected keys and operation IDs, inventory errors |
| `operations.ndjson` | Durable intent, provider acknowledgement, file result, and linked recovery events |
| `summary.json`, `SUMMARY.txt` | Latest window and cumulative publication totals, audit, errors, and evidence links |
| `checkpoint.json` | Latest in-progress counts for status and interruption diagnosis |
| `window-receipts\<window-id>\effective-policy.json` | Approved and proposed limits, actual grant expiry and local disk estimate |
| `window-receipts\<window-id>\benchmark.json` | Mode-specific score, cutoff, duration, bytes, throughput and latencies |
| `window-receipts\<window-id>\location-audit.json` | Independent observed inventory, expected-key and identity comparison, missing, extra, changed, duplicate, uncertain and staging evidence |
| `window-receipts\<window-id>\audit-observations.ndjson` | Independently observed pages and typed scan errors for offline replay |

Share the paths printed under **Proof files**, excluding any private binding or retained download copies. The receipts include the non-secret account, bucket, prefix and relative names needed to review the evidence. Review those names before sharing. Copy the printed absolute receipt directory into this CMD variable. The checker accepts the same format from a copied receipt bundle within `lab-local\runs` and needs no pairing or network access.

```cmd
set "REDOWN_RECEIPT=lab-local\runs\owner-600\REPLACE_WITH_PRINTED_CAMPAIGN_ID"
lab-local\.venv\Scripts\redown-lab.exe check-location --run "%REDOWN_RECEIPT%"
```

For success on the owner selection, confirm 600 eligible planned files, 600 production-confirmed publications, 600 exact matched remote keys, matching available size and object identity, a complete scoped scan, and zero unexplained missing, duplicate, renamed, conflicting, unexpected or uncertain entries. The R2 REST list can supply ETag and size without the Worker's object version. The report leaves that observed version null. A paginated listing is an observation over time. Independent final-content SHA-256 comes only from a requested content read, never from a location audit.

## Additional commands and recovery

If the original grant remains valid, the same pairing works across commands. After expiration or Chrome shutdown, select the recorded exact campaign in the Laboratory. Choose **Continue an existing campaign (read and write)** for pending uploads or **Read a previous QA prefix for audit or recovery** for a read-only grant. Approve the new duration and limits and pair once for that grant. The CLI prints a continuation command when an admitted window leaves work unfinished. It reuses the frozen scope and guards ambiguous publication with the existing production operation record and Worker inspection. If those sources cannot resolve a possible commit, the receipt remains uncertain.

```cmd
lab-local\.venv\Scripts\redown-lab.exe continue-campaign --run "%REDOWN_RECEIPT%" --input "lab-local\input" --execution completion --benchmark-seconds 2400 --execution-seconds 3600 --transfer-seconds 300 --inactivity-seconds 120 --request-seconds 30 --upload-seconds 300 --verification-seconds 300 --authorization-minutes 75 --audit-seconds 300 --audit-requests 24 --audit-operations 56 --audit-traffic-bytes 8388608 --concurrency 1 --approve-cost-usd 2.00 --live
lab-local\.venv\Scripts\redown-lab.exe audit-location --run "%REDOWN_RECEIPT%" --authorization-minutes 75 --request-seconds 30 --audit-seconds 300 --audit-requests 24 --audit-operations 56 --audit-traffic-bytes 8388608 --approve-cost-usd 0.10 --live
lab-local\.venv\Scripts\redown-lab.exe download-campaign --run "%REDOWN_RECEIPT%" --execution completion --benchmark-seconds 2400 --execution-seconds 3600 --transfer-seconds 300 --inactivity-seconds 120 --request-seconds 30 --authorization-minutes 75 --concurrency 1 --approve-cost-usd 0.10 --live
lab-local\.venv\Scripts\redown-lab.exe campaign --input "lab-local\input" --output "round-trip" --operations round-trip --verification sha256 --execution completion --benchmark-seconds 2400 --execution-seconds 3600 --transfer-seconds 300 --inactivity-seconds 120 --request-seconds 30 --upload-seconds 300 --verification-seconds 300 --authorization-minutes 75 --audit-seconds 300 --concurrency 1 --approve-cost-usd 3.00 --live
```

`download-campaign` reads original published keys with recorded identity and trusted SHA-256. Add `--retain-downloads` to save verified bytes under the window's `downloads` directory. Without it, the CLI hashes the read and leaves no saved copies. A retained copy is fsynced, and the CLI hash describes the bytes written. The program does not separately re-open that disk copy to hash it. `round-trip` requests both production publication and independent final-content SHA-256. Create a deliberate fresh campaign with `--new-run` when leaving an earlier unfinished run in place.

Use `status --run "%REDOWN_RECEIPT%"` to inspect progress and `cancel --run "%REDOWN_RECEIPT%"` from a second CMD to request a cooperative stop. `--clear-cancel` on continuation clears the local explicit cancellation marker. A complete later audit restarts the scoped listing and preserves earlier partial pages in their original windows. `0` is accepted, `1` is a failed check, `2` is blocked, `3` is incomplete or uncertain, and `130` is cancelled. Release the scope with **End and revoke** when done.

## Policy and limits

| Setting or constraint | Effective behavior |
|---|---|
| `--execution completion`, `--benchmark-seconds` | Default 2,400 seconds. Measures from invocation through transfer evidence. The cutoff does not stop completion-oriented dispatch. Use `2700` for 45 minutes. In `timed` mode the benchmark deadline also fences transfer admission. Older `run` and `corpus` manifests keep their original timing and SHA-256 defaults. |
| `--execution-seconds`, `--authorization-minutes` | Positive duration from browser admission and minimum previously granted total minutes. The example uses 3,600 seconds and a 75-minute grant. Preparation counts against actual grant time before admission. A grant shortfall blocks with the effective remaining time. A pairing code is still limited to two minutes and never extends the grant. Browser timers cap seconds at 2,147,483 and approved integral minutes at 35,791. |
| `--inventory-seconds` | Positive local inventory timeout, default 1,800 seconds. The independent execution timer starts at browser admission. |
| `--transfer-seconds`, `--inactivity-seconds` | Absolute per-file ceiling and time without real byte or phase progress. Defaults 300 and 120 seconds for the new campaign. Browser execution and grant deadlines also apply. `LAB_FILE_TRANSFER_TIMEOUT`, `LAB_TRANSFER_INACTIVITY` and `LAB_TRANSFER_DEADLINE` identify the attempted window or file limit. Chromium does not report continuous management PUT upload progress, so the inactivity timer can bind on a slow PUT. |
| `--request-seconds`, `--upload-seconds`, `--verification-seconds` | Authenticated control/metadata/GET timeout, staging PUT timeout, and production staging verification timeout. Defaults 30, 300 and 300 seconds, each no longer than `--transfer-seconds`. Control requests accept 1–30 seconds to fit the existing 35-second native relay and 40-second Python socket response waits. The background File API retains its separate Worker/message timeouts. Ordinary settings keep their existing defaults. |
| `--audit-seconds`, `--audit-requests`, `--audit-operations`, `--audit-traffic-bytes` | Audit seconds plus provider request, relay page and modeled metadata-byte ceilings. These are reserved inside the total grant. The audit uses the unused execution segment after transfer drain and records an incomplete scan if the reserve or scope expires. Preflight derives defaults from inventory and page bounds when omitted. |
| `--file-budget`, `--provider-requests`, `--operation-budget`, `--traffic-bytes`, `--temp-disk-bytes`, `--approve-cost-usd` | Maximum file attempts, provider request units, operation units, modeled bytes, browser spool bytes and modeled USD. Positive integer flags except the decimal dollar ceiling. All are checked against trusted UI ceilings and current headroom. One active file is staged at a time. `--admit-partial` or timed mode can leave work pending when supported by a smaller approved window. |
| `--concurrency` | The implemented Laboratory policy admits one fixed file slot. Other requested values are reported as unsupported. Ordinary background jobs share two production service slots across jobs, with one active child per ordinary job. |
| Cloudflare and browser limits | The production single-PUT policy limits files to 5 GiB minus 1 MiB and keys to 1,024 UTF-8 bytes, including attached prefixes. Actual storage class, account quota, API throttling, Cloudflare request limits, network, browser disk quota and Windows filesystem rules can be more restrictive. The estimated cost uses the repository's conservative request-unit and one-month byte rates, excluding free tier, storage duration beyond the model and any live account-specific pricing differences. [R2 limits](https://developers.cloudflare.com/r2/platform/limits/) · [API rate limits](https://developers.cloudflare.com/fundamentals/api/reference/limits/) · [R2 pricing](https://developers.cloudflare.com/r2/pricing/) |
| Native transfer and listing | `512 KiB` native frame, `128 KiB` source chunk, `350,000` serialized UTF-8 audit bytes with envelope headroom, and 128 requested R2 objects per audit provider page. Opaque relay cursors retain any unconsumed tail before advancing the provider cursor. [R2 List Objects API](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/objects/methods/list/) |

## Verification and scope of this checkpoint

| Workload | Actual result |
|---|---|
| 600 files, native loopback and production Worker source in local Workerd/R2 | PASS. 24,130,293 bytes. 600 unique publications and 600 location matches across five provider pages. Zero final-content GETs and zero staging leftovers. One slot. 133.842 s measured transfer window, 132.134 s summed active file attempts, 139.969 s including audit, checker and Queue assertions. File latency p50/p95 was 212/251 ms. |
| 2,000 files, same fixture path | PASS. 80,856,893 bytes. 448.053 s measured transfer window, 442.184 s summed active file attempts, 467.452 s including audit, checker and Queue assertions. 267.83 files/min and 180,463 B/s. 2,000 matches across 16 pages, zero final-content GETs and no staging leftovers. |
| 24-file mode and failure fixture | Read-only audit matched all 24 keys. Download-only under a read-write grant read and hash-verified 24 objects with zero new writes. Timed test published five of 12 and continued with seven new writes in the same prefix. A deliberately dropped publication acknowledgement resolved through production inspection with zero replayed writes. |
| 4,000-child ordinary upload driver | Chromium 156 with real File structured cloning, IndexedDB, worker execution and a local provider substitute. Initiating page closed before the first file dispatched. 4,000 verified fixture outcomes, 4,000 durable outcome rows, stored sources released. 76.895 s after page close. This rate is excluded from the R2 projections. |
| Build, Settings and regression checks | Extension build and installed Linux CLI version check passed. Chromium Settings/native-message fixture and service-worker OPFS checks passed. 73 focused JS tests passed, and the Python suite ran 19 with two Windows-only skips. The full JS suite passed 869 of 870. The unrelated non-Narrow/non-Depth baseline digest test also fails in a clean checkout of `5f538b4`. |

The 600-file checkpoint measured **268.97 files/min** and **180,289 B/s**. Applying that rate conditionally gives **10,758 files** (432,694,544 bytes) in 40 minutes, **12,103 files** (486,781,362 bytes) in 45 minutes, and **133.842 seconds** for 600 files before audit. Full fixture metrics are in `fixture-results.json`.

The owner fixture and all other measurements above ran without production Cloudflare writes. Native fixture rates include the loopback transport, durable evidence writes, and production verification against Workerd. They exclude the live network and account throttling. Conditional 40- and 45-minute rates assume an identical small-file mix, one unconstrained slot, ample input and authority, and stable fixture performance. These projections are arithmetic comparisons, not completed-run counts or live capacity. The separate benchmark and audit times do not mix upload and download performance.

```cmd
set "REDOWN_OWNER_FIXTURE_FILES=600"
node scripts\verify-python-lab.mjs
set "REDOWN_OWNER_FIXTURE_FILES=2000"
node scripts\verify-python-lab.mjs
set "REDOWN_OWNER_FIXTURE_FILES=24"
node scripts\verify-python-lab.mjs
set "REDOWN_OWNER_FIXTURE_FILES="
node scripts\verify-python-lab.mjs
node scripts\verify-python-lab-settings.mjs
```

`node scripts/verify-durable-local-upload.mjs` uses Chromium and defaults to 4,000 children. Set `C2C_CHROME_EXECUTABLE` to the browser executable if needed. `fetch-fixtures.py` is separate from acceptance and defaults to a no-network plan. Its temporary files live beside the chosen fixture output. If acquiring fixtures, select the actual completed fixture output as your campaign input and keep the sibling partials directory outside the scanned input.

## Remaining specification work

- Owner evidence for installed Windows Chrome native registration, the real 600 and 900 files, 2,000-file live throughput, and ordinary live 4,000-file upload/download remains pending. Browser quota, local disk pressure, revocation during a long large-file upload and live throttle behavior require further coverage.
- The ordinary one-selection upload uses Chrome’s durable File storage before accepting the job. Chrome may need local quota for the selection and can choose to copy the backing data. The background owns the accepted job and releases stored sources after accounting. Restart, unresolved ordinary publication and old port-driven reselection still have gaps. The new driver is single-slot per job. Pending per-child Queue rows, an expandable folder History aggregate and deterministic thumbnail selection remain open. Individual History continues to use the existing production receipts.
- Automatic ordinary upload receipts are OFF by default and snapshot category and size/count policy for the whole job. Manual export reads the durable batch evidence. Oversize automatic delivery still uses an open Shelf document, so those receipts can require manual export. Full download-ID reconciliation and supplemental ordinary receipt revisions remain open.
- The existing ordinary streamed ZIP download remains available. Its Shelf-independent ownership, durable browser download observation, dedicated automatic download receipt settings and consolidated download receipt schema remain open. New Laboratory download-only currently consumes a previous owner campaign, without external inventory import. The new round-trip CLI and representation-aware read are implemented. A full new-mode live round-trip and the encoded/weak-ETag matrix remain unverified.
- Configurable adaptive and multi-slot Laboratory scheduling, out-of-order child completion within one ordinary job, indexed recovery pickers, durable budgeting across browser restarts, complete phase diagnostics, per-manifest precedence for the new campaign policy, and configurable staging/archive retention remain open. Existing recovery scope age/count truncation and the ordinary seven-day batch-journal deletion were removed. Browser storage remains finite. A continued audit starts a new scan, preserving prior partial observations.
- Extended upload History was deferred. Existing individual **Download**, **Get URL** and URL copying are owned by `extension/history-v2-cards.mjs` and `extension/history-destination-urls.mjs`. Explorer folder download and URL export, including **Simple TXT**, are owned by `extension/explorer-exports.mjs`, `src/explorer/download-archive.mjs` and `src/explorer/object-exports.mjs`. No additional History-only transfer or URL engine was introduced.
