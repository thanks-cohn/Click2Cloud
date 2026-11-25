# REDOWN 0.3.32 Part 1 candidate

The candidate starts at the latest requested branch tip, `28e67aa29d534273459157bc9d48c0dcc751fab2`. The packaged software revision is `a6e129184b1350e3df0bbe5e6ea6cbe75f6dca4c` on `codex/redown-11-25-2026-part-1-priority`. The manifest reports `0.3.32` and `0.3.32 Part 1 candidate`. The installed identity, OAuth callback and Worker digest remain compatible. [Build receipt](evidence/part-1-0332/build-info.json)

## Completed work

- Files and multiple selected folder roots enter the same validated Cloudflare batch path. The folder picker lets the owner add roots, then confirm once. Authorization and the destination stay pinned to the browsing folder. Write-readiness checks are scoped and shared across identical fresh requests. The More menu shows actionable errors for unavailable writes.
- The worker owns the batch checkpoint. The Shelf stages one disk-backed File per batch at a time, and the service allows two active batches. Plans validate all paths before dispatch, including nested Unicode paths, duplicate destination paths and staging-key limits. Standalone files keep the existing keep-both naming policy. Folder and mixed selections skip conflicting keys.
- The existing signed R2 write and readback path records each file in Queue and History. Progress distinguishes uploaded, verified, skipped, failed, cancelled, unconfirmed and unprocessed counts. An interrupted Shelf can let the active file settle. Unavailable handles require explicit reselection, and paused batches continue from the canonical remaining paths. Read-only reconciliation handles known interrupted commits without replay.
- Only a fully verified selection can request a Console Era success notice. The worker reserves one batch delivery, retains claims and acknowledges the existing custom renderer. Rapid unrelated saves retain their existing coalescing. The original `redown-console-r.png` is byte-identical to 0.3.29. The observed older per-file success call explains repeat flashes. The cause of the reported Shelf disappearance remains unproven.
- Debug Mode exposes the opt-in **Produce and download receipts after uploads automatically**. Each admitted terminal batch can request one aggregate versioned JSON file. Turning Debug off invalidates that opt-in. The receipt records key and byte evidence and identifies unavailable checksums. Independent SHA-256 verification lives in the lab.
- YAML, JSON, source, configuration and common text files use the authorized `readFile` API. The stream is capped at 512 KiB and cancels stale reads. Text is inert and scrollable in both directions. Existing Download and top-right X behavior remain available.

## Windows CMD

Use [the runner guide](upload-recovery/runner/README.md) for exact CMD commands, GUI fixtures, authorized read-only R2 setup, recovery cases and expected receipt schemas.

```cmd
git clone --single-branch --branch codex/redown-11-25-2026-part-1-priority https://github.com/thanks-cohn/Click2Cloud.git redown-0332
cd redown-0332
git rev-parse HEAD
npm ci
npm run build:extension
node -p "require('./dist/click2cloud/manifest.json').version"
set "REDOWN_UPLOAD_LAB=11.25.2026\upload-recovery\runner\upload_lab.py"
py -3 "%REDOWN_UPLOAD_LAB%" run --out work\0332-smoke --files 5 --bytes 5120 --mode folder --roots 2 --timeout 60
py -3 "%REDOWN_UPLOAD_LAB%" run --out work\0332-owner-68 --tier 04-owner-regression --mode folder --roots 2 --timeout 600
py -3 "%REDOWN_UPLOAD_LAB%" prepare --out work\0332-gui --files 5 --bytes 5120 --mode folder --roots 2 --format yaml
```

Chrome loads the unpacked `dist\click2cloud` directory. To create a ZIP from the locally verified build in Windows CMD, run `tar -a -c -f work\REDOWN-0.3.32-Part1.zip -C dist\click2cloud .`. GitHub Actions published `click2cloud-unpacked` for the exact software revision. The archive SHA-256 reported by GitHub is `26525f4aa69a665862ef194cbd0b22c8e6c3721484a8a8d3c7d18473a9cf289b`. [Download unpacked extension ZIP](https://github.com/thanks-cohn/Click2Cloud/actions/runs/45723802626/artifacts/15073267151)

## Observed verification

| Check | Result |
| --- | --- |
| Source-tip baseline `npm test` | 838 passed, 1 failed. The existing non-Narrow/non-Depth composition digest assertion is the failure. |
| Candidate `npm test` | 841 passed, 1 failed. The same composition digest assertion also fails at the branch tip before this work. |
| Candidate `npm run test:focused` | 716 passed locally, and the exact packaging revision passed this step in GitHub Actions. |
| Exact source focused contract subset | 51 passed across upload, Debug, Queue and History, workings and API ownership. |
| `npm run check:api-docs` | 78 API methods and 3 shortcuts verified. |
| `npm run build:extension` | Packaged 0.3.32 at the exact software revision with extension ID `ajppphdiamdobknpamcheohmdbdbeoal`. |
| Python local workerd/R2 | Six small integration cases passed across success, last-child collision, lost ACK, restart, resume and concurrent batches. Each compares independent R2 inventory and SHA-256 and counts signed commits, notices and receipt requests. |
| Owner-sized replay in local workerd/R2 | 68 files and 8,000,000 bytes verified, 68 staging PUTs and 68 signed commits, one custom offer and one aggregate receipt request. [Independent receipt](evidence/part-1-0332/lab-owner-68.json) |
| Packaged Chromium with fixture Chrome/provider boundaries | 17 checks passed, with zero page errors. This includes the pinned multi-folder GUI, cancellation, Debug setting and inert text, with a 0.3.30 computed-style comparison. [Browser receipt](evidence/part-1-0332/packaged-chromium.json) |
| Console Era packaged renderer against 0.3.29 | Passed original Large geometry, provider palettes, placement, all sizes, duration, effects, expiry and dismissal in Chromium. [Renderer receipt](evidence/part-1-0332/console-renderer.json) |
| Installed Chrome appearance in GitHub Actions | The existing appearance step passed on the packaged software revision. [Workflow](https://github.com/thanks-cohn/Click2Cloud/actions/runs/45723802626) |
| Installed Shelf in this executor | `BLOCKED` by `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR`. [Installed-check receipt](evidence/part-1-0332/installed-chromium.json) |

The local API cases used the exact upload implementation from `f11fe34a59dcad3548ca7cfca65b68299f54b049`. The packaging revision incorporates a follow-up that records receipt failures with the existing numeric diagnostic trace identity and preserves Queue's existing history-only deduplication. The packaged browser, installed policy check and targeted contract subset used the packaging revision.

## Outstanding acceptance

Real Windows Chrome picker, native-menu and actual notification delivery still need the owner's administrator-approved profile. The local Chromium renderer and API acknowledgements do not establish live paint or physical receipt download. Live R2, authorization expiry against real accounts, low disk, profile lifecycle and larger/long-lived workloads remain for the owner lab. No production cloud resources were written. The safe local runner can execute successive tiers and retain the first failing result. Interrupted automatic delivery attempts can be unconfirmed. Very large automatic JSON receipts need the initiating Shelf for Blob download.

Part 1 remains a candidate pending the owner’s installed and separately authorized live acceptance. Part 3 and the surface overhaul are deferred.
