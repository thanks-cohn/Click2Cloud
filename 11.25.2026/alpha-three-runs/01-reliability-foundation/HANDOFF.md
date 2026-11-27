# ReDown Part 1 reliability foundation

**Owner acceptance is open.** This branch contains the Part 1 candidate and reproducible local QA. Read the machine-readable [evidence](evidence.json) and [run summary](SUMMARY.txt) for exact results.

| Identity | Value |
| --- | --- |
| Implementation branch | `codex/redown-11-26-2026-part-1-reliability-foundation` |
| Laboratory baseline | `1bad4007678fd3f2dcb628a3681598850feeb36e` |
| Candidate source commit | `b18888cad769b6780c2ce8deade38ecb991b9b17` |
| Specification | `codex/redown-11-25-2026-part-3-media-manifest` at `e2eb4da67bb5700ed457eb91d2db582545da8a59` |
| Extension and Python CLI | `0.3.32.4` |
| File API and native wire | `3+1.1` and `1.0.0` |
| Extension ID | `ajppphdiamdobknpamcheohmdbdbeoal` |
| OAuth redirect | `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/cloudflare` |
| Cloudflare Worker digest | `WII8-sbOYHDudzbYd5B6X64NzhFwTIYRPhaqJM4_TdI` |

The first implementation commit, `309e4842cfcb2606b6d4fdffd534560608825945`, is a direct child of the Laboratory baseline. The handoff sits in a documentation commit on the same branch. The pinned specifications for all three parts are copied verbatim to preserve the planning lineage. This implementation covers Part 1.

## Production boundaries for Part 2

| Boundary | Owner and behavior |
| --- | --- |
| Ordinary R2 uploads | `src/chrome/local-upload-service.mjs` retains the existing R2 staging, byte readback, signed conditional publication, and final confirmation. The batch journal retains the child operation ID across a proven precommit retry. A subsequent owner reconciles the exact production checkpoint before attempting a possible publication. Commits with ambiguous acknowledgement stay fenced. |
| Ordinary R2 downloads | `src/chrome/local-download-service.mjs` takes an already approved Chrome file handle from a single-use CURRENT staging record. The service worker persists the job, freezes source identity and inventory, uses the production R2 File API and publishes through Chrome's writable file handle. A reopened size check is the delivery evidence. A worker lost across file close leaves uncertainty. A still-authorized pre-publication retry restarts the temporary output. Two active jobs share the existing conservative browser limit for their direction. |
| Download formats | Explorer single files, selected-file ZIP, recursive ZIP, tagged PNG, and existing metadata/tag sidecars use the same writer. ZIP32 checks bytes and overhead plus entry count before streaming. Existing ZIP entry failure and exact-path behaviors remain visible. Archives record member disposition and CRC. Browser delivery evidence does not include independently reopened contents. |
| Queue and optional export | CURRENT stores download intent, frozen inventory and publication evidence. `src/queue/receipts.mjs` projects the same job ID to Queue. `src/chrome/receipt-delivery.mjs` records Chrome download acceptance and terminal delivery separately from transfer completion. Upload export options and their default are preserved. The new automatic download JSON option defaults to OFF. Use manual export for oversized receipts when automatic delivery needs a Shelf or exceeds Chrome's data URL limit. |
| Laboratory | The Python CLI drives the existing native protocol and production adapters. It appends journal intent, attempt, retry and acknowledgement events, writes bounded checkpoints and emits finalized JSON and text. Offline replay handles torn journal tails and missing final snapshots. Retained files are staged, flushed, published with an exclusive same-filesystem hard link, and reopened for SHA-256. Abandoned stages after abrupt process death require inspection. |
| Read-only selection | `download-selection` starts from a trusted Settings grant bound to the exact R2 account, bucket and prefix. The browser freezes a digest from its paginated listing, checks every subsequent read against its frozen identity, and meters independent read attempts. Recovery requires the same scope and inventory digest. An existing object without a trusted original hash has transport and reopened-disk evidence. A round trip compares to the frozen original SHA-256. |
| Upload History | Admission captures Show uploads in History. Folder children remain in durable operation records and Queue. The batch journal updates one root projection per selected folder using the existing History store. Verified requires all planned eligible children to meet production verification. The archive persists the first decodable, authorized image chosen from the first eight verified image candidates. Individual manually uploaded files reuse the existing cards with web-origin fields omitted. |
| Accounting and entitlement | Keep `provider + stable account + logical operation ID` as the idempotency basis. Use `begin` and `admitDownload` for ordinary admission, `admitCampaign` and `admitReadSelection` for Laboratory reservation, and `readRemoteResult` / `readDownload` for reconciliation. Attempt counts and modeled Laboratory usage are distinct from logical success. The baseline has scoped grants and Laboratory counters, but the source inventory found no production allowance ledger, licensing/activation account continuity, or paid entitlement resolver to update here. Part 2 can attach conditional reservations at admission and settle only the authoritative logical result. Maintain the existing policy for Downloads and paid use. |

The schema changes are additive. CURRENT and the upload journal retain their IndexedDB database versions. Existing Journal, Queue and History records keep their IDs and compatibility fields. Native wire commands remain compatible and the new read-selection command requires the candidate CLI and extension together. Older builds cannot drive the new background download records or interpret their local publication uncertainty. Finish or reconcile pending transfers before changing builds. A normal extension reload uses the same extension ID and profile.

Onyx review covered the planning tip `a9d6d9e6` and prototype tip `221dbe5`. Unique functional candidates included screenshot notice suppression for a parked pointer (`05bd2cf`, `a30f977`), reconnect-to-Browse handoff (`73ab187`), startup paint coordination (`f51926d`), and projectile targeting (`8879b44`). No release-blocking defect for these mechanisms was confirmed on this baseline. Visual transplant, provider expansion, continuity, commerce, and media manifests remain in their assigned runs.

## Windows CMD setup

Run at the repository root with Node.js 22+, Python 3.10+, the existing Windows Chrome profile and a filesystem that supports hard links for retained files. Wait for existing jobs to settle. For a new local implementation branch:

```cmd
git fetch origin codex/redown-11-26-2026-part-1-reliability-foundation
git switch --track origin/codex/redown-11-26-2026-part-1-reliability-foundation
npm ci && npm run build:extension
py -3 -m venv lab-local\.venv
lab-local\.venv\Scripts\python.exe -m pip install -e 11.25.2026\live-python-lab\python
lab-local\.venv\Scripts\redown-lab.exe init
lab-local\.venv\Scripts\redown-lab.exe install-host --extension-id ajppphdiamdobknpamcheohmdbdbeoal
lab-local\.venv\Scripts\redown-lab.exe --version
```

On a repeat checkout, switch to the existing local implementation branch and fast-forward from the fetched branch using `git merge --ff-only FETCH_HEAD`. Reload `dist\click2cloud` at `chrome://extensions` and check the version and ID above. Retain the current profile, account, OAuth grant and destinations.

## Local verification commands

```cmd
set "P1=11.25.2026\alpha-three-runs\01-reliability-foundation"
npm run build:extension
npm test
node --test tests\part1-reliability.test.mjs tests\explorer-upload.test.mjs tests\workings.test.mjs
lab-local\.venv\Scripts\python.exe -m unittest discover -s 11.25.2026\live-python-lab\python\tests -v
node scripts\verify-python-lab-settings.mjs
node scripts\verify-durable-local-download.mjs
set "REDOWN_GUI_FIXTURE_FILES=1000"
set "REDOWN_GUI_FIXTURE_HISTORY=1"
node scripts\verify-durable-local-upload.mjs
set "REDOWN_OWNER_FIXTURE_FILES=24"
node scripts\verify-python-lab.mjs
set "REDOWN_OWNER_FIXTURE_FILES="
call "%P1%\part1-lab.cmd" faults 555
```

The fault campaign uses only native loopback, local Workerd and fixture R2. It injects one pre-publication upload 502, drops one post-publication upload acknowledgement, and injects one read 502. The offline recovery leg removes a terminal download result from a copied fixture receipt and reopens the final files. It does not expose a fault injection endpoint in production. The wrapper also accepts 100 and 1,000. On Linux, set the file count and fault flag inline.

```bash
REDOWN_OWNER_FIXTURE_FILES=555 REDOWN_RELIABILITY_FAULTS=1 node scripts/verify-python-lab.mjs
PYTHONPATH=11.25.2026/live-python-lab/python python -m unittest discover -s 11.25.2026/live-python-lab/python/tests -v
```

## Authorized R2 campaigns

Use the Settings Laboratory card on the intended account and an existing QA bucket. Review the proposed resource ceilings, approve a 75-minute session, and use **Copy CMD** to pair. For upload or round trip choose **Read and write a fresh QA prefix**. The 100, 555 and 1,000 file wrappers use a single transfer slot and an explicit modeled cost ceiling. Review the effective policy before increasing any ceiling.

```cmd
call "%P1%\part1-lab.cmd" fixtures 100
call "%P1%\part1-lab.cmd" upload 100
call "%P1%\part1-lab.cmd" round-trip 100
set "REDOWN_RECEIPT=REPLACE_WITH_PRINTED_ABSOLUTE_RUN_PATH"
call "%P1%\part1-lab.cmd" download 100 "%REDOWN_RECEIPT%"
lab-local\.venv\Scripts\redown-lab.exe check-location --run "%REDOWN_RECEIPT%"
lab-local\.venv\Scripts\redown-lab.exe check-downloads --run "%REDOWN_RECEIPT%" --all-windows
lab-local\.venv\Scripts\redown-lab.exe report --run "%REDOWN_RECEIPT%"
```

Repeat with 555 and 1,000 in a fresh QA scope when needed for grant headroom. `download` reads the previous upload's exact keys. You can pair a read-only recovery grant for that campaign. Round trip writes the files, checks their locations, and independently compares reopened local copies to the original hashes. Receipt metadata and a location audit remain available even if SHA-256 evidence is missing.

For a preexisting folder, select **Download from an existing folder (read only)**. Choose the same account and existing bucket. Enter its exact folder prefix and a read-attempt ceiling with headroom for retries. Empty prefix grants read access to the selected bucket root and should be intentional. In CMD, select an existing authorized local output directory on the desired disk.

```cmd
call "%P1%\part1-lab.cmd" selection 100 "D:\Authorized QA Output"
set "REDOWN_RECEIPT=REPLACE_WITH_PRINTED_ABSOLUTE_RUN_PATH"
lab-local\.venv\Scripts\redown-lab.exe check-downloads --run "%REDOWN_RECEIPT%"
lab-local\.venv\Scripts\redown-lab.exe report --run "%REDOWN_RECEIPT%"
```

For interrupted selected-folder reads, pair a fresh read-only grant for the same account, bucket and prefix. Run the printed continuation command with `download-selection --run "%REDOWN_RECEIPT%" --resume-downloads`. Use `--clear-cancel` only after intentionally ending a local cancellation. The new grant rescans and checks the frozen digest. It can reopen already delivered files and skips them when their publication evidence matches. A changed listing blocks continuation. The exact user-selected output path is in `private-download-output.json` for local recovery.

## Installed Windows Chrome smoke

```cmd
call "%P1%\installed-chrome-smoke.cmd" "https://YOUR-APPROVED-QA-HOST/page-01.html" "your-qa-bucket/your-approved-prefix/"
```

1. On a cold browser launch, check Remotes and the configured saved destinations. Log in, inspect the actual native Chrome menu and use one known QA link with Simple, Narrow, Depth and Save Here as applicable. Confirm the exact returned remote key and one verified Queue/History result. Check the same behavior after service-worker stop, Chrome restart, reconnect, and extension update/reload. Confirm logout blocks new provider dispatch.
2. In Explorer, download a zero-byte file and an ordinary file. Close the Shelf while the ordinary file is running, then reopen Downloads and check the receipt. Compare on-disk bytes to known fixtures.
3. Select two real files, right-click one and choose **Download**. Open the ZIP and verify both entries. Download a recursive folder with nested files, zero-byte files and a directory marker. Extract it and compare expected paths, sizes and known hashes. Exercise metadata and tag options where already enabled.
4. In an isolated QA destination, check cancellation, changed source, selected destination conflict and low disk. Confirm incomplete output remains explicit. Try one ZIP32 size-limit case without committing a large transfer.
5. Upload a nested folder with multiple image candidates. Confirm one root card, accurate verified/partial status, minimal details and stable representative after reload. Change Show uploads in History before a second upload. Compare Queue and receipts across both jobs. Right-click web saves keep their source details.

### 1,000 actual right-click saves

```cmd
py -3 "%P1%\part1-fixtures.py" create "lab-local\part1-native-1000" --files 1000 --native
```

The generator creates 20 pages of 50 unique benign text file links and `expected.json`. Serve the generated pages and `files` tree from an owner-approved public HTTPS static location. Select an explicitly authorized, isolated QA R2 destination and record its exact account, bucket and prefix before starting. Open page 1, use the actual Chrome context menu's configured REDOWN save leaf for each link, and record completed pages. Keep the same destination across the workload. A page link's ordinary click does not invoke the save. This workload is operator-driven because the browser fixture cannot operate installed Windows Chrome's native context menu.

After draining Queue, use a new read-only selection grant on the exact QA prefix and retain the downloads. Run the offline fixture checker on the resulting directory that contains the downloaded `part1-*.txt` files.

```cmd
py -3 "%P1%\part1-fixtures.py" check "lab-local\part1-native-1000\expected.json" "D:\PATH-TO-RETAINED-TRANSFER-FILES"
```

Accept 1,000 exact file keys, 1,000 matching reopened hashes, zero extras and no unexplained duplicate or uncertain outcomes. Check one History result per intended save. The public source files are synthetic. The run must remain within the owner's authorised provider/cost limits.

## Receipts and remaining gates

The candidate suite passed 873 of 874 JavaScript tests. The sole failure is the baseline menu digest check. All 25 focused JavaScript regressions passed, and the Python suite passed 20 with two Windows-only skips. The managed Linux Chromium installation blocked the unpacked Shelf test. The OPFS browser and Workerd fixtures provide separate local evidence.

- Laboratory writes the absolute receipt path to CMD. Share `summary.json`, `SUMMARY.txt`, `operations.ndjson`, `checkpoint.json`, `resolved-manifest.json`, and relevant `window-receipts` or `inventory-receipts`. Review filenames, object keys and account references before sharing. Exclude private binding files, retained payloads and native pairing state.
- Local browser and Workerd evidence has independent limits. Installed Windows picker permissions across worker and browser restart, live provider behavior, cold native menus and the native 1,000-save workload remain **NOT_TESTED**. Run the Windows smoke before advancing Part 2.
- Large ZIP64/directory delivery remains **BLOCKED** by ZIP32 capability limits. Folder ZIP compatibility remains. Browser file-handle verification confirms the published size. Independently reopened archive extraction and SHA-256 remain separate acceptance tests.
- Chrome downloads have explicit scope, cancellation, fixed retries and durable uncertainty. Some active downloads need reselection on restart when Chrome no longer grants a stored handle. The existing History re-download surface retains its established Chrome delivery path. Ordinary basic-provider download expansion and cross-provider retry capabilities remain for Part 2.
- Laboratory's remaining fault matrix includes real Windows reparse races and low disk, abrupt loss with stale local stages, rate limiting, native disconnect/revocation mid-campaign, and source mutation during pagination. Hard-link publication requires support on the selected filesystem. A successful injected local fixture does not certify a live owner's path.
- Bounded ordinary uploads need more installed testing for rate limits and production account changes. After an exhausted or ambiguous staging attempt, incomplete provider staging may still require exact-scope inspection. The verified injected success run produced zero staging leftovers. Native web-save retry policy remains the existing policy.
- Receipt writer and authorization are separate. Capture the final benchmark cutoff, workload verdict and transfer verdict independently. A campaign can pass every attempted transfer and fail its expected-file gate. The 869/870 baseline JS failure on the non-Narrow/non-Depth digest and the old release-browser heading mismatch were both reproduced on the pinned baseline.
