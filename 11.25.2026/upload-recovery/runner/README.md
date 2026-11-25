# REDOWN 0.3.32 upload verification

This test tool uses the current Part 1 code. The historical legacy and comprehensive imports document earlier transports and results. This tool adapts their seeded inventory, intent journal, checkpoint and independent download checks. It stays outside the extension package.

## Windows CMD setup

Install Git, Node.js 22 or newer, and Python 3.10 or newer with the Windows Python launcher. Run these commands in **Command Prompt**. If you already have a checkout, enter that checkout and start at `git fetch`.

```cmd
git clone --single-branch --branch codex/redown-11-25-2026-part-1-priority https://github.com/thanks-cohn/Click2Cloud.git redown-0332
cd redown-0332
git fetch origin codex/redown-11-25-2026-part-1-priority
git switch codex/redown-11-25-2026-part-1-priority
git pull --ff-only origin codex/redown-11-25-2026-part-1-priority
git rev-parse HEAD
node --version
py -3 --version
npm ci
npm run build:extension
node -p "require('./dist/click2cloud/manifest.json').version"
set "REDOWN_UPLOAD_LAB=11.25.2026\upload-recovery\runner\upload_lab.py"
```

Load the unpacked directory `dist\click2cloud` at `chrome://extensions` in an administrator-approved QA Chrome profile. The extension ID is `ajppphdiamdobknpamcheohmdbdbeoal` and the manifest version is `0.3.32`. The build process packages the same ID, OAuth callback, code and assets. Chrome may require you to reload the existing unpacked entry when switching revisions. The existing GitHub workflow uploads the unpacked build as `click2cloud-unpacked` when its build and artifact steps pass.

## Automated API mode

No cloud credentials or live Cloudflare writes are needed. The Python runner starts one bounded Node child per case. It calls the production planner, batch controller, durable stores, Cloudflare upload service, Universal File API, signing transport and Worker in local workerd. The test adapter substitutes isolated OAuth authority, Cloudflare management REST transport and Chrome renderer/download responses. It lists the local R2 binding and hashes its bytes independently of the production upload response. The Chrome fixture claims an offer and acknowledges it, so its notification results describe API delivery. Visual paint is checked separately.

```cmd
py -3 "%REDOWN_UPLOAD_LAB%" run --out work\0332-api-smoke --files 5 --bytes 5120 --mode folder --roots 2 --depth 2 --timeout 60
py -3 "%REDOWN_UPLOAD_LAB%" run --out work\0332-api-regression --tier 04-owner-regression --mode folder --roots 2 --timeout 600
py -3 "%REDOWN_UPLOAD_LAB%" run --out work\0332-api-faults-last --scenario last-conflict --timeout 60
py -3 "%REDOWN_UPLOAD_LAB%" run --out work\0332-api-faults-restart --scenario restart --timeout 60
py -3 "%REDOWN_UPLOAD_LAB%" run --out work\0332-api-faults-resume --scenario resume --timeout 60
py -3 "%REDOWN_UPLOAD_LAB%" run --out work\0332-api-faults-ack --scenario lost-ack --timeout 60
py -3 "%REDOWN_UPLOAD_LAB%" run --out work\0332-api-contracts --through 04-owner-regression --mode mixed --timeout 600
```

To see other cases, run `py -3 "%REDOWN_UPLOAD_LAB%" run --help`. The planner also supports standalone files and synthetic mixed selections. `keep-both` uses `--mode files`. Use at least two fixtures for cases that interrupt the final child. The default disk budget is 512 MiB across selected tiers. Higher byte tiers and 10,000-file progression require an explicitly adequate `--budget` and `--timeout`. Larger checks belong in the local lab. The 24- and 240-file tiers use synthetic size/count equivalents. The 308, 569 and 2,221 tiers match historical counts only. The runner does not load any historical payloads or access earlier cloud namespaces.

Each case stores `expected.json`, the independent generated corpus, `events.ndjson`, `integration.json`, and any automatic receipt captured by the test adapter. The top-level `summary.json` carries every requested stage and leaves later cases `NOT_RUN` when a prior stage fails. `--resume` revalidates and reuses matching PASS receipts, then runs the next stage. A failed or ambiguous run is retained for review. Use a new output directory for a deliberate new test. No automatic mutation replay occurs. A timeout stops the local child. If it stopped before producing a receipt, the verdict is `BLOCKED`. Timings include Node/workerd overhead. The reported high water is sampled Node RSS and staged test File bytes. Chrome allocator, profile disk usage and live throughput require separate observations.

## Python-assisted real GUI mode

Use a dedicated, empty QA prefix in an authorized Cloudflare bucket that already has an approved REDOWN Worker. Python generates the selection and expected inventory before the GUI session. Use the generated prefix printed by the script.

```cmd
py -3 "%REDOWN_UPLOAD_LAB%" prepare --out work\0332-gui --files 5 --bytes 5120 --mode folder --roots 2 --depth 2 --format yaml
start "" "%CD%\work\0332-gui\corpus"
```

1. In REDOWN Settings, turn on Debug Mode and check **Produce and download receipts after uploads automatically**. Verify that the checkbox is initially off. Enable success notices and allow them while Shelf is open for the visual case.
2. In Files, open the exact QA destination. Choose **More**, **Upload**, **Upload folders**. Select the first generated folder, click **Add another folder** and select the second. Confirm once with **Start upload**. For a standalone file case, generate with `--mode files` and use **Upload files**.
3. Observe Preparing, Uploading, Verifying, and the terminal result. Verify the Original Console Era notice appears once on full success and after all files verify. Verify no Chrome/Windows native success alert. For a cancellation, confirm there is no success notice. Chrome exposes one folder per picker interaction. Empty directories do not produce file entries.
4. Locate the one `redown-upload-receipt-<batch-id>.json` file from Chrome Downloads. Copy the observation template and replace each null with your observed boolean or count.

```cmd
copy "11.25.2026\upload-recovery\runner\gui-observations.json" "work\0332-gui\observations.json"
notepad "work\0332-gui\observations.json"
set "REDOWN_RECEIPT=C:\path\to\redown-upload-receipt-BATCH-ID.json"
py -3 "%REDOWN_UPLOAD_LAB%" verify --expected work\0332-gui\expected.json --receipt "%REDOWN_RECEIPT%" --observations work\0332-gui\observations.json --out work\0332-gui\gui-result.json
```

The last command writes receipt and owner-observation checks. It reports independent cloud verification as `BLOCKED` until authorized readback is supplied. With temporary read-only R2 S3 credentials scoped to the QA bucket, put the key ID and secret in `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in your local CMD environment. Avoid copying them into fixtures or reports. For temporary credentials, also provide `AWS_SESSION_TOKEN` if your issuer supplies one.

```cmd
py -3 -m pip install boto3
set "REDOWN_R2_ACCOUNT=YOUR_32_CHARACTER_ACCOUNT_ID"
set "REDOWN_R2_BUCKET=YOUR_QA_BUCKET_NAME"
py -3 "%REDOWN_UPLOAD_LAB%" verify --expected work\0332-gui\expected.json --receipt "%REDOWN_RECEIPT%" --observations work\0332-gui\observations.json --out work\0332-gui\gui-result.json --read-r2 --account "%REDOWN_R2_ACCOUNT%" --bucket "%REDOWN_R2_BUCKET%" --timeout 180
set "AWS_ACCESS_KEY_ID="
set "AWS_SECRET_ACCESS_KEY="
set "AWS_SESSION_TOKEN="
```

Readback checks exact listed keys, duplicate entries, sizes, and streamed SHA-256 hashes. The verifier uses the expected files as its authority for remote content. It does no cloud writes or cleanup. With `--expect cancelled`, `--expect failed` or `--expect unconfirmed`, pass each intentionally expected committed file using a repeated `--committed-path "relative/path.ext"`. A fresh prefix avoids mixing baseline user objects with the comparison. A completed batch downloaded with Debug enabled includes its recorded notification state. A browser ACK and a user-observed paint are separate evidence.

Close the Shelf during a test to check recovery. If an in-flight file settles, it may finish normally. If undispatched files still require source handles, reopen Files at the pinned target and choose **Check upload receipt** if shown. A reconciled paused batch exposes **Reselect for upload**. Select the original folders or the remaining files with their original paths and sizes. Already-accounted files stay out of the remaining plan. A terminal unconfirmed file has a per-file **Check receipt** action in Queue. That action checks provider evidence without replaying the write or retroactively turning the batch into a success.

## Shared programmatic contract

The trusted `redown-local-upload` Chrome port is restricted to the extension's own Shelf document. It carries validated target and selection metadata, single-use IndexedDB File tickets and results. It does not accept paths for arbitrary disk access. External test clients use the same `createLocalUploadBatches` and `createLocalUploadService` modules with explicit provider dependencies. The existing V3+1 grants and permissions are unchanged. Text preview is a read-only specialization of the existing `readFile` API.

| Operation | Input and authority | Result |
| --- | --- | --- |
| Check | Exact Cloudflare provider, account, connection, bucket and prefix. Current R2 scopes and prepared Worker are required. | Readiness or a typed block. The Shelf reuses an identical positive check for 30 seconds. |
| Begin | Batch UUID, target, mode, bounded descriptors containing name, relative path and size. | The validated plan, pinned target, total and persistent checkpoint. |
| Step | Owner port lease, same target, next index and staged single-use File ticket. | Per-file verified, skipped, failed, cancelled or unconfirmed outcome and aggregate progress. |
| Stop | The owning port requests cancellation or closes. | Stop dispatching. A close allows active work to settle before persisting a pause when more handles are needed. |
| Inspect | Pinned target and optional batch UUID. | Current phase, counters and optional versioned JSON data. |
| Reconcile | A stopped batch and same authorized account and target. | Read-only Worker proof, known reselection needed, or unresolved commit. |
| Resume | A paused batch with resolved in-flight state and new explicit selection. | Revalidates target and files and returns indices for remaining files in canonical order. |

The receipt schema is `redown.upload-batch` version 1. It includes a stable batch ID, times, intended target, expected/observed counts, per-file planned and observed keys and sizes, statuses, error codes and actual verification evidence. SHA-256 is null in the extension receipt because its production proof compares staging bytes and then verifies the final R2 object by key, size, ETag and version. The laboratory independently downloads the final bytes and calculates SHA-256. Full-batch success and receipt downloads reserve one durable attempt each before invoking Chrome. If a worker stops at that boundary, an attempt can remain unconfirmed. For very large JSON, Chrome needs the initiating Shelf open to provide the download Blob. Notification or receipt failure does not change verified uploads. Keep personal receipt paths and account references private.

Browser fixture and installed checks can be invoked separately from CMD.

```cmd
npm run test:focused
npm run check:api-docs
set "C2C_CHROME_EXECUTABLE=C:\Program Files\Google\Chrome\Application\chrome.exe"
set "C2C_0328_EVIDENCE=work\0332-packaged-browser"
node scripts\test-0328-browser.mjs
node scripts\test-console-save-notice-browser.mjs
```
