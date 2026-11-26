# REDOWN 0.3.32.3 Python Laboratory repair

The Windows source fix was committed first in `3298632c91f4223095952250a1c4c7f3829f63a9`. It binds the opened file to the selected path by device, file ID, size, and mtime. A Windows no-follow read handle excludes ordinary concurrent writes and renames while staging. The same handle supplies Windows `ChangeTime` before and after the read. The shared reader still checks exact EOF, parent and file reparse protections, and frozen SHA-256. Linux retains its ctime comparison. Manifest validation, the actual bytes sent to the browser spool, and read-only recovery use the shared source checks.

Tested production commit `ae4b80cc879072ca60a9094500027b168be4d8ab` builds extension and CLI version `0.3.32.3`, API `3+1.1`, native protocol `1.0.0`. Extension source SHA-256 is `bcc79e44a64885a92f200a82150228b8a7a4582f99be230ad549eca79b8b9e4f`. Worker digest is `WII8-sbOYHDudzbYd5B6X64NzhFwTIYRPhaqJM4_TdI`, the prior verified digest. The extension ID remains `ajppphdiamdobknpamcheohmdbdbeoal`. In your build, the packaged revision follows the checked-out commit, including handoff-only commits. [Structured verification receipt](verification.json)

## Build in Windows Command Prompt

Use Git, Node 22 or newer, and the Windows Python launcher. Python 3.14.7 matches the original Windows report. These commands use a fresh checkout and a private virtual environment.

```cmd
git clone --single-branch --branch codex/redown-11-25-2026-python-lab-live-repair https://github.com/thanks-cohn/Click2Cloud.git redown-python-lab-repair && cd redown-python-lab-repair
git rev-parse HEAD && npm ci && npm run build:extension && type dist\click2cloud\src\build-info.mjs
py -3.14 -m venv lab-local\.venv && lab-local\.venv\Scripts\python.exe -m pip install -e 11.25.2026\live-python-lab\python && lab-local\.venv\Scripts\redown-lab.exe --version && lab-local\.venv\Scripts\redown-lab.exe init
lab-local\.venv\Scripts\redown-lab.exe install-host --extension-id ajppphdiamdobknpamcheohmdbdbeoal
```

Open `chrome://extensions` in a profile that permits unpacked extensions. Load `dist\click2cloud`, or rebuild from the existing unpacked extension’s own checkout and use its **Reload** button. Confirm version **0.3.32.3** and the ID above. Keep the Chrome profile open for the session. For a clean install, a separate permitted Chrome profile lets you exercise the initial permission prompt alongside the existing granted profile.

To build in the existing extension checkout, run the following from that clean repository root before the build and installation commands above. If the repair branch already exists there, use `git switch codex/redown-11-25-2026-python-lab-live-repair && git merge --ff-only FETCH_HEAD` after the fetch.

```cmd
git fetch origin refs/heads/codex/redown-11-25-2026-python-lab-live-repair && git switch -c codex/redown-11-25-2026-python-lab-live-repair FETCH_HEAD
```

## Verify generated files without Chrome or Cloudflare

```cmd
set "LAB=lab-local\.venv\Scripts\redown-lab.exe"
set "LABPY=lab-local\.venv\Scripts\python.exe"
set "ACCEPT=11.25.2026\python-lab-live-repair\windows-acceptance.py"
call 11.25.2026\python-lab-live-repair\verify-windows-inventory.cmd > "lab-local\windows-source-probe-03323.json" && type "lab-local\windows-source-probe-03323.json" && "%LABPY%" "%ACCEPT%" prepare > "lab-local\windows-fixtures-03323.json"
type "lab-local\windows-fixtures-03323.json"
```

The test suite generates PNG, JPEG, text, ZIP, zero-byte, and Unicode-named files and inventories them in separate Python processes. Windows cases exercise write sharing, rename and replacement denial, and a junction. The suite reports whether the local Windows profile permits symbolic-link creation. The probe records which attributes differed across the path and handle observations of a disposable PNG and verifies its SHA-256. `prepare` creates a two-text-file baseline of 35 bytes and a five-file nested corpus containing a 989,488-byte PNG. Its output directory is exclusive.

## Check readiness and pair

1. Sign in through **Remotes** and open **Settings → Python Laboratory**. Choose **Configure session**, an existing dedicated QA bucket with a prepared Worker, and **Read and write a fresh QA prefix**.
2. Use **Check readiness** for a read-only capability report. **Export diagnostics** saves a JSON receipt even when pairing fails. The receipt distinguishes permission, callable API, selected bucket, Worker readiness, OPFS, host launch, handshake, and pairing stages. A doctor or readiness pass establishes only the reported checks.
3. Approve the selected bucket and click **Start session**. On a profile that prompts for native messaging, allow the optional permission. If the card reports `NATIVE_API_UNAVAILABLE`, wait for REDOWN work to finish, reload REDOWN once from `chrome://extensions`, reopen Settings, and retry. If the issue persists, export diagnostics from the card.
4. Once the card shows **Ready to pair**, click **Copy CMD** and run the copied command in the repository root within two minutes. Keep that one-time code private. End the first profile’s laboratory session before repeating the pairing check on the existing granted profile.

```cmd
"%LAB%" doctor --diagnostics > "lab-local\cli-local-03323.json"
"%LAB%" doctor --session && "%LAB%" doctor --session --diagnostics > "lab-local\cli-session-03323.json"
```

Expect `READY`, the exact extension build, and the selected isolated QA scope. The sanitized CLI report can be shared. Ordinary doctor output, workload receipts, and local data belong in private `lab-local\`. When no browser endpoint exists, `doctor --session --diagnostics` writes a blocked report and exits 2. The browser export gives the launch or handshake stage when available.

## Recheck the original source without writes

Point `ORIGINAL_INPUT` at the original stable Windows source directory. This tests the actual root that previously failed, with its original source metadata. The path stays local.

```cmd
set "ORIGINAL_INPUT=PASTE_THE_ORIGINAL_ABSOLUTE_INPUT_DIRECTORY_HERE"
"%LAB%" doctor --session && "%LAB%" corpus --input "%ORIGINAL_INPUT%" --operations round-trip --dry-run --manifest original-recheck-03323.json --plan-receipt original-offline-03323.json && "%LAB%" validate --input "%ORIGINAL_INPUT%" --manifest "lab-local\manifests\original-recheck-03323.json" --session --plan-receipt original-session-03323.json
```

If `SOURCE_CHANGED` returns, preserve the blocked JSON with its stage, reason, and attribute names. If it reports `WINDOWS_SHARING_VIOLATION`, finish any writes to the source and retry. Choose fresh manifest and receipt names for each attempt. Progress lines are provisional until `Inventory complete` prints the final count.

## Run the two-file baseline, then the five-file corpus

Plan the two-file round trip and confirm the same manifest is ready with the paired session.

```cmd
"%LAB%" doctor --session && "%LAB%" corpus --input "lab-local\windows-acceptance-03323\two" --max-files 2 --operations round-trip --dry-run --manifest windows-two-03323.json --plan-receipt windows-two-offline-03323.json && "%LAB%" validate --input "lab-local\windows-acceptance-03323\two" --manifest "lab-local\manifests\windows-two-03323.json" --session --plan-receipt windows-two-session-03323.json
```

Review the estimate and scope printed by validation. If you approve the live QA writes and a modeled ceiling of USD 0.10, run this command. Use a lower approved ceiling when appropriate.

```cmd
"%LAB%" run --input "lab-local\windows-acceptance-03323\two" --manifest "lab-local\manifests\windows-two-03323.json" --live --approve-cost-usd 0.10
```

Set `LABRUN` to the actual directory printed after `Run`, then inspect the operation journal and independently rehash both retained copies. Expect two `UPLOAD_SHA256_VERIFIED` results and 35 verified bytes.

```cmd
set "LABRUN=PASTE_THE_PRINTED_RUN_DIRECTORY_HERE"
"%LAB%" report --run "%LABRUN%" && "%LABPY%" "%ACCEPT%" check --run "%LABRUN%" --files 2 > "lab-local\windows-two-hash-check-03323.json" && type "lab-local\windows-two-hash-check-03323.json"
```

After the two-file check passes, repeat with the five-file corpus.

```cmd
"%LAB%" doctor --session && "%LAB%" corpus --input "lab-local\windows-acceptance-03323\five" --max-files 5 --operations round-trip --dry-run --manifest windows-five-03323.json --plan-receipt windows-five-offline-03323.json && "%LAB%" validate --input "lab-local\windows-acceptance-03323\five" --manifest "lab-local\manifests\windows-five-03323.json" --session --plan-receipt windows-five-session-03323.json
```

After reviewing and approving that separate live plan, run the exact validated manifest.

```cmd
"%LAB%" run --input "lab-local\windows-acceptance-03323\five" --manifest "lab-local\manifests\windows-five-03323.json" --live --approve-cost-usd 0.10
set "LABRUN=PASTE_THE_NEW_RUN_DIRECTORY_HERE"
"%LAB%" report --run "%LABRUN%" && "%LABPY%" "%ACCEPT%" check --run "%LABRUN%" --files 5 > "lab-local\windows-five-hash-check-03323.json" && type "lab-local\windows-five-hash-check-03323.json"
```

Expect five verified copies, including the zero-byte file. The empty directory appears in the manifest. The checker reads `operations.ndjson`, matches the frozen scenario, acknowledgement, key, size, ETag and available version, then compares source, R2 stream, CLI stream, and retained-copy SHA-256 values. Exit 2 means a gate blocked. Review the JSON even if the shell stops the remaining `&&` commands.

## Run the approved original corpus and scale after a pass

After the five-file hash check passes, revalidate the original manifest against the current session. Review the scope and estimate before approving its live QA run separately. Replace `N` with the manifest's actual file count.

```cmd
"%LAB%" doctor --session && "%LAB%" validate --input "%ORIGINAL_INPUT%" --manifest "lab-local\manifests\original-recheck-03323.json" --session --plan-receipt original-live-preflight-03323.json
```

```cmd
"%LAB%" run --input "%ORIGINAL_INPUT%" --manifest "lab-local\manifests\original-recheck-03323.json" --live --approve-cost-usd 0.10
set "LABRUN=PASTE_THE_ORIGINAL_RUN_DIRECTORY_HERE"
"%LAB%" report --run "%LABRUN%" && "%LABPY%" "%ACCEPT%" check --run "%LABRUN%" --files N
```

After the five-file check passes, prepare separate 10-, 20-, and 30-file source folders as needed. Repeat the doctor, dry-run, paired validation, explicit live approval, and copy-check sequence in that order for each count. Set `--max-files` and `--files` to the actual count and use distinct filenames. Advance only after the prior hash check passes and the next plan fits the remaining grant or a fresh explicitly approved grant. The bound is one transfer, 8 MiB per file and spool, 250 session file slots, 640 MiB modeled traffic, 8,192 provider request units, and 1,500 operations. The planner can admit fewer files than the inventory limit.

After collecting evidence, use **End and revoke**. For an uncertain commit, the existing `reconcile` or `resume` command observes the original approved QA scope. [Recovery commands](../live-python-lab/HANDOFF.md#verification-commands-and-evidence)

## Evidence boundaries

The owner’s 0.3.32.2 Windows records isolate the mismatched attribute and include a separate successful two-file live baseline. On hosted Windows x64, Python 3.14.7 and 3.14.10 each passed 18 tests and skipped the POSIX-only concurrent mutation case. On both versions, the generated 989,488-byte PNG differed only in `st_ctime_ns` between the path and handle observations. The handle’s Windows `ChangeTime` stayed stable through the read and the expected SHA-256 matched. [Windows matrix run](https://github.com/thanks-cohn/Click2Cloud/actions/runs/45758486024)

The 0.3.32.3 local checks exercise the production native relay, upload service, signed Worker, and independent readback against workerd/R2 fixtures. Installed Windows Chrome startup, the original owner PNG, and production Cloudflare round trips are owner acceptance gates for this release. [Before and after verification](verification.json)

The full Node suite passed 868 of 869 tests. The remaining menu-composition digest failure was reproduced on the repair branch’s starting commit. The owner separately reported three high-severity npm dependency findings and esbuild/workerd install-script warnings on the prior Windows setup. The local audit also found three high-severity entries. The release retains the existing locked dependency versions.
