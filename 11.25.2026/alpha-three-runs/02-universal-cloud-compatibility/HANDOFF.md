# Part 2 checkpoint — P0.0 transport and resource repair

**Owner acceptance is open.** The Part 2 branch contains a buildable P0.0 repair candidate. The exact approved base is `ade3a1b60ccef6728c236236cd95030fb8cc8652`. Both `b18888cad769b6780c2ce8deade38ecb991b9b17` and `1bad4007678fd3f2dcb628a3681598850feeb36e` are ancestors. The nine active specifications were copied byte for byte from `896b456b7cf975d6c1dd3e8abea28a103765051b`. The matrix identifies the production entry points and evidence requirements. [Action coverage matrix](ACTION_COVERAGE_V1.md)

| Candidate identity | Value |
| --- | --- |
| Branch | `codex/redown-11-27-2026-part-2-p0-transport` |
| Tested implementation commit | `1627f59e6f759eb80fb2c4d9d5126abde312ecd5` |
| Extension and Python CLI | `0.3.32.5` |
| Extension ID | `ajppphdiamdobknpamcheohmdbdbeoal` |
| Cloudflare OAuth callback | `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/cloudflare` |
| File API and native wire | `3+1.1` and `1.0.0` |
| Packaged Worker digest | `WII8-sbOYHDudzbYd5B6X64NzhFwTIYRPhaqJM4_TdI` |

## Repair and evidence boundaries

- The Laboratory records each attempt and upload intent in its existing append-only journal. Its production status request uses the frozen campaign, original operation ID, account, bucket, path, size and admitted source SHA-256. A confirmed receipt must match the key, version, ETag, size and operation ID. A status response can be retried within its own bounded allocation even with zero replay reserve. Only a matching precommit checkpoint, or a spool closed before submission in the same run, can authorize a replay. Unknown publication stays fenced for scoped recovery. Retry deferrals and exhausted budgets are explicit.
- The signed file transport records the CURRENT commit fence immediately before posting the signed move. In a proven precommit replay, the same operation can reuse its existing staging object only when the durable key, strong ETag and version match. It reads the staged bytes again under that ETag and checks the version before the move. Foreign or changed staging is fenced. The existing production move and final verification remain in use. Confirmed completions still use the same CURRENT and Queue/History projection.
- Native frames keep the existing lengths and JSON format. Encoding avoids a second combined buffer. Allocation failure is typed before the first byte is sent when possible. An interrupted read closes the connection. The campaign records resource rejection or best-effort interruption and keeps existing confirmed records and publication fences. The offline report reconstructs from the last durable journal if finalization fails. Retained-file evidence checks the frozen remote key, exact relative output path, size and SHA-256.
- The campaign reports transfer, inventory, location, reopened disk and benchmark evidence independently. The original combined location verdict remains readable by existing receipt tools. A frozen expected-file mismatch blocks a write window before admission unless explicitly allowed for diagnostics. Diagnostic overrides retain the failing workload verdict. A fresh corrected run uses `--new-run` and the corrected `--expect-files` after reviewing the original manifest.
- The resource harness samples Node, Workerd, Python CLI and Python native host by process, plus local disk and system memory. Windows adds available commit and private committed bytes where readable. Optional `--chrome-pid` observes a deliberate Chrome process tree. Short-lived processes can fall between samples. The Lab samples local headroom on preflight and at bounded intervals during a campaign and preserves a 4 MiB receipt-disk margin and 32 MiB physical/commit margins when counters are available. These thresholds are conservative admission floors. Browser OPFS errors remain separately typed. Actual sustained Windows pressure and the original MemoryError cause are open.

## Verification results

| Evidence | Result |
| --- | --- |
| Local Workerd/R2 and Python native faults | PASS. 100 and 555 exact uploads, one verified notification per logical ID, 100 and 555 independently reopened SHA-256 copies, zero staging leftovers. |
| Focused JavaScript and Python | PASS. 744 focused JavaScript tests, 28 Python passes and two Windows skips. Seed 3372 executed 4,096 transport cases. Case 72 also ran in isolation. |
| Full JavaScript | FAIL. 877 of 878 passed. The sole failure is the inherited non-Narrow/non-Depth menu digest fixture. The exact approved base failed the same test. |
| Packaged browser | PASS. Fourteen disconnected extension views in bundled Chromium 143. Chromium browser fixtures also verified real OPFS, closed-Shelf retrieval, ZIP delivery and 1,000 child upload outcomes with one folder History record. |
| Live and Windows reference | NOT_TESTED. The task used local provider fixtures and spent $0 on Cloudflare. |

The machine-readable evidence records tested revisions, exact cases, resource samples and local receipt locations. The fault campaigns ran on Linux with ample headroom. The 555-file run captured sustained Python and Workerd samples. The 100-file repeat and the disconnected packaged-browser run also captured steady-state Node samples. Inherited Windows conditions require the owner gates below. [Evidence](evidence.json) · [Summary](SUMMARY.txt)

## Reproduce the local checks

The fixture routes Cloudflare traffic only to local Workerd. The CLI flag `--live` inside the fixture uses the existing affirmative Laboratory command and its injected local provider. Resource and fixture summaries print under `lab-local/verification`. The campaign retains `operations.ndjson`, `checkpoint.json`, `summary.json`, `SUMMARY.txt`, and per-window audit, benchmark and resource sample records. The checked-in evidence is redacted. Exclude pairing state, private source bindings and downloaded payloads from shared receipts.

Windows CMD setup and focused tests from the repository root:

```cmd
git fetch origin codex/redown-11-27-2026-part-2-p0-transport
git switch -c codex/redown-11-27-2026-part-2-p0-transport FETCH_HEAD
npm ci && npm run build:extension
py -3 -m venv lab-local\.venv
lab-local\.venv\Scripts\python.exe -m pip install -e 11.25.2026\live-python-lab\python
lab-local\.venv\Scripts\redown-lab.exe init
lab-local\.venv\Scripts\redown-lab.exe install-host --extension-id ajppphdiamdobknpamcheohmdbdbeoal
lab-local\.venv\Scripts\redown-lab.exe --version
set "P1=11.25.2026\alpha-three-runs\01-reliability-foundation"
set "P2=11.25.2026\alpha-three-runs\02-universal-cloud-compatibility"
node --test tests\part2-p0-transport.test.mjs tests\part1-reliability.test.mjs tests\explorer-upload.test.mjs tests\workings.test.mjs
lab-local\.venv\Scripts\python.exe -m unittest discover -s 11.25.2026\live-python-lab\python\tests -v
set "REDOWN_PART2_CASES=4096"
lab-local\.venv\Scripts\python.exe -m unittest discover -s 11.25.2026\live-python-lab\python\tests -p test_part2_transport.py -v
set "REDOWN_PART2_CASE=72"
lab-local\.venv\Scripts\python.exe -m unittest discover -s 11.25.2026\live-python-lab\python\tests -p test_part2_transport.py -v
set "REDOWN_PART2_CASE="
set "REDOWN_PART2_CASES="
call "%P2%\part2-lab.cmd" faults 100 && call "%P2%\part2-lab.cmd" faults 555
```

The seeded default is 3372. Set `REDOWN_PART2_SEED` and `REDOWN_PART2_CASE` for a reported failing case. Linux uses `PYTHONPATH=11.25.2026/live-python-lab/python python -m unittest discover -s 11.25.2026/live-python-lab/python/tests -v` and `python scripts/profile-python-lab.py --files 100`, then `--files 555`. For the short campaign that also tests zero replay reserve, offline continuation, and count mismatch, use `REDOWN_OWNER_FIXTURE_FILES=8 node scripts/verify-python-lab.mjs` on Linux. On Windows set `REDOWN_OWNER_FIXTURE_FILES=8`, run the same Node script, then clear the variable.

For an existing local branch, switch to it and fast-forward the fetched tip with `git merge --ff-only FETCH_HEAD`. Reload `dist\click2cloud` in `chrome://extensions` and verify the version and ID above. Keep the existing Chrome profile, saved configuration and OAuth authorization. Use the inherited installed Windows and archive checklist. [Part 1 handoff](../01-reliability-foundation/HANDOFF.md)

## Owner acceptance in dependency order

1. Run the Windows fault commands above on the reference machine. Confirm 100 then 555 verified uploads and reopened downloads, exact paths and sizes, zero unexplained staging, one verified result per logical ID, no unhandled exception and no unresolved operations. Share the resource summaries and the effective Windows headroom. If the machine cannot safely meet the legitimate space or commit requirement, keep this gate blocked.
2. Inspect the original historical receipt bundle offline. The known 578 live uploads and 578 independent streamed SHA-256 matches remain valid. The historical workload expected 555, the historical combined location result was FAIL, and the original audit observations and 997-byte staging identity were unavailable in this workspace. The fixture reproduces how an expected-count mismatch can fail the historical combined verdict despite exact location matches. Use the actual original observations to establish the historical reason. Preserve the first bundle and local originals.
3. With enough disk for 336,467,559 retained bytes plus working space, fully restart Chrome and pair a read-only grant for the original exact campaign. Reopen all 578 files against the frozen manifest. If using an alternate disk, work from a verified copy of the bundle in the Laboratory's authorized runs directory on that volume. Preserve the original bundle. The overall expected-count mismatch remains open even if the retained disk verdict passes.
4. After Windows faults pass, pair an explicit read-write grant for one fresh, isolated QA prefix and run the **100-file** live round trip. Pair a read-only exact-campaign grant for the download-only phase if running it separately. Record transfer, frozen inventory, location, retained disk and benchmark verdicts and request/byte ceilings. Each existing wrapper uses a $4 modeled cap. Keep the total within the authorized ceiling. The 555 live uploads in 40 minutes remain a separate target.

```cmd
set "OLD_RUN=REPLACE_WITH_ORIGINAL_ABSOLUTE_RECEIPT_BUNDLE"
lab-local\.venv\Scripts\redown-lab.exe check-location --run "%OLD_RUN%"
lab-local\.venv\Scripts\redown-lab.exe download-campaign --run "%OLD_RUN%" --retain-downloads --authorization-minutes 75 --execution-seconds 3600 --benchmark-seconds 2400 --concurrency 1 --retry-reserve 2 --approve-cost-usd 4 --live
lab-local\.venv\Scripts\redown-lab.exe check-downloads --run "%OLD_RUN%" --all-windows
call "%P1%\part1-lab.cmd" fixtures 100
call "%P1%\part1-lab.cmd" round-trip 100
set "NEW_RUN=REPLACE_WITH_NEW_ABSOLUTE_RECEIPT_BUNDLE"
lab-local\.venv\Scripts\redown-lab.exe check-location --run "%NEW_RUN%"
lab-local\.venv\Scripts\redown-lab.exe check-downloads --run "%NEW_RUN%" --all-windows
lab-local\.venv\Scripts\redown-lab.exe report --run "%NEW_RUN%"
```

For unverified publication, use the printed `continue-campaign` command with the original source and an exact authorized campaign grant. With read-only authorization, `audit-location` can inspect and reconcile exact signed publication evidence without a cloud mutation. The old 997-byte staging object requires its original scoped listing and owned stage identity to justify any recovery. Leave unmatched staging in place and report it. Keep all installed Chrome, right-click, restart, native registration/revocation, low-disk and archive gates from Part 1.

## Next dependency

Windows acceptance and the post-repair 100-file live R2 gate govern advancement. P0.1 shared account/auth/capabilities and migration, P0.2 destination resolution, P0.3 operation/admission/completion and fault isolation, P0.4 durability qualification, and dependent all-provider bidirectional transfers, internal Lab and rdata continuity remain blocked. R2 local results do not establish Google Drive, OneDrive or Dropbox transfers. The Part 3 requests in the branch are reference material for the later handoff.
