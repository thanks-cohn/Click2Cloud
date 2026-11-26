# REDOWN 0.3.32.2 Python Laboratory

The CLI runs manifests through an authenticated Chrome native helper and the existing Cloudflare R2 services. The local native-loopback and workerd/R2 fixture passed. Windows Chrome registration, the live Cloudflare round trip, and manual Shelf acceptance remain owner-run. The test environment's Chromium refused to load the unpacked extension because administrator policy disables it. The fixture submitted zero production writes.

- Branch `codex/redown-11-25-2026-live-python-lab`
- Starting branch tip `1b7f0469e8073907c4dba0f2e0e08dd90181ccb6`
- Tested implementation revision `1909c32471005660b670845174594af43279cb42`
- Extension and Python package `0.3.32.2`, native wire `1.0.0`, workload schema `redown.live-lab.workload/1`, production API `3+1.1`
- Extension ID `ajppphdiamdobknpamcheohmdbdbeoal` and unchanged Cloudflare callback. The tested package reported source digest `27c43ce83bba24597451c1f707d225912ead645cb1504464402063e7f6e22aa6` and Worker digest `WII8-sbOYHDudzbYd5B6X64NzhFwTIYRPhaqJM4_TdI`, which matches Part 1. Inspect the packaged revision in `dist\click2cloud\src\build-info.mjs`.

## First run from Windows Command Prompt

Install Git, Node.js 22+, and Python 3.10+ with the Windows `py` launcher. Use the repository root for the commands below. For a new checkout, start with this command.

```cmd
git clone --single-branch --branch codex/redown-11-25-2026-live-python-lab https://github.com/thanks-cohn/Click2Cloud.git redown-live && cd redown-live
```

Build the extension, install the CLI into its private virtual environment, and register the exact-origin native helper for your Windows user.

```cmd
npm ci && npm run build:extension && py -3 -m venv lab-local\.venv && lab-local\.venv\Scripts\python.exe -m pip install -e 11.25.2026\live-python-lab\python && lab-local\.venv\Scripts\redown-lab.exe init && lab-local\.venv\Scripts\redown-lab.exe install-host --extension-id ajppphdiamdobknpamcheohmdbdbeoal
```

1. Load or reload `dist\click2cloud` at `chrome://extensions` in a Chrome profile that permits unpacked extensions. Check version `0.3.32.2` and the ID above. Keep the Chrome profile running while the CLI is active.
2. Drop files or entire nested folders into the absolute `input` directory printed by `init`. The default is `lab-local\input`. An empty folder is recorded in the manifest. An unknown extension is treated as opaque bytes. An empty file is a valid zero-byte fixture.
3. Review a no-write plan. This command saves `lab-local\manifests\reviewed.json` and prints its path. Use a new filename for the next inventory.

```cmd
lab-local\.venv\Scripts\redown-lab.exe corpus --operations round-trip --dry-run --manifest reviewed.json
```

4. Sign in through **Remotes** as usual. Open **Settings → Python Laboratory → Configure session**. Select an existing, dedicated QA bucket with a prepared REDOWN Worker, select **Read and write a fresh QA prefix**, set a duration and approve access. Click **Start session** and approve Chrome's native-messaging permission if prompted. Run the exact **Copy CMD** command within two minutes. The card shows **Connected to Python CLI** during an authenticated connection and **Paired · CLI idle** between commands. Browser restarts, replacing the helper, or provider reauthentication can require a new session and code. Pairing does not depend on keeping the Settings page open.
5. Check the current grant and run an explicitly approved workload. `0.10` is the maximum modeled US-dollar usage you approve in this example. Use a lower ceiling or reduce the workload if needed. The estimate covers the scheduled requests and one month of retained R2 object storage under the displayed pricing model. It is not a Cloudflare billing quote, and retained objects can accrue storage charges in subsequent months.

```cmd
lab-local\.venv\Scripts\redown-lab.exe doctor --session && lab-local\.venv\Scripts\redown-lab.exe corpus --operations round-trip --live --approve-cost-usd 0.10
```

For upload-only, keep SHA-256 verification and omit the saved local copy.

```cmd
lab-local\.venv\Scripts\redown-lab.exe corpus --operations upload --live --approve-cost-usd 0.10
```

To run the exact manifest you reviewed, use its printed path. This command uses the filename from step 3.

```cmd
lab-local\.venv\Scripts\redown-lab.exe validate --manifest "lab-local\manifests\reviewed.json" --session && lab-local\.venv\Scripts\redown-lab.exe run --manifest "lab-local\manifests\reviewed.json" --live --approve-cost-usd 0.10
```

Use `--input "D:\QA Files"` to choose another source directory, `--destination "batch-A"` for a bucket-relative directory inside the run, and `--output round-trip-check` for an optional group under `lab-local\runs`. `corpus --help` lists file, size, traffic, request, disk, time and cost budget controls. A generated manifest uses logical local roots. Supply the same `--input` when rerunning a manifest generated from a nondefault source.

## Verification commands and evidence

```cmd
lab-local\.venv\Scripts\python.exe -m unittest discover -s 11.25.2026\live-python-lab\python\tests && node scripts\verify-python-lab.mjs && node scripts\verify-python-lab-settings.mjs && py -3 "11.25.2026\upload-recovery\runner\upload_lab.py" run --out lab-local\offline-regression --files 5 --bytes 5120 --mode folder --roots 2 --depth 2 --timeout 60
```

The native fixture starts the actual Python helper as a child, uses its framed loopback socket, runs the production local-upload service, production signed Worker, workerd/R2 emulator, and production stat/list/read-stream adapter. It checks exact origin and sender fences, wrong loopback and pairing secrets, code reuse, traversal and extra scope fields, limits, changed source and collisions, mixed nested corpus and zero-byte files, upload-only and saved-copy verification, Queue/History, manifest comparison, pre-dispatch cancellation, lost acknowledgement, and revocation. The Settings verifier checks the real rendered card and a Chromium service worker's disk-backed upload spool. It uses fixture Chrome messages for pairing. Detailed fixture evidence is printed under `lab-local\verification`. The existing offline lab uses its existing CLI and receipt schema.

For a small live smoke before trying your own corpus, run Quick, then Everyday. Run Heavy preflight without live approval.

```cmd
lab-local\.venv\Scripts\redown-lab.exe run --manifest 11.25.2026\live-python-lab\manifests\quick.json --live --approve-cost-usd 0.10
lab-local\.venv\Scripts\redown-lab.exe validate --manifest 11.25.2026\live-python-lab\manifests\everyday.json --session && lab-local\.venv\Scripts\redown-lab.exe run --manifest 11.25.2026\live-python-lab\manifests\everyday.json --live --approve-cost-usd 0.10
lab-local\.venv\Scripts\redown-lab.exe validate --manifest 11.25.2026\live-python-lab\manifests\heavy.json --dry-run --plan-receipt heavy-preflight.json
```

Heavy preflight should exit `2` and report file size, media generation, concurrency, run duration, transfer traffic, provider request limits, and unsupported cleanup. It retains the requested 100,000,000-byte sizes and 20/20/40 active targets in the manifest. Endurance preflight also blocks its requested browser-restart fault injection.

Each run prints its private directory. Use its actual path in place of `RUN_A` and `RUN_B` below. The frozen plan includes local overrides, exact fixture hashes, a stable scenario schedule, the approved destination, and a canonical resolved digest. `operations.ndjson` has intent, acknowledgements and results with the intended key, observed key/ETag/version when available, source hash, separate remote and CLI hashes, bytes, and timing. `summary.json` and `SUMMARY.txt` summarize the outcome and evidence locations. Verified copies are below the run's `downloads` directory. `lab-local\` is Git-ignored and contains owner files, generated manifests, output, and receipts. Keep this directory private.

```cmd
lab-local\.venv\Scripts\redown-lab.exe status --run RUN_A && lab-local\.venv\Scripts\redown-lab.exe report --run RUN_A
lab-local\.venv\Scripts\redown-lab.exe compare --before RUN_A --after RUN_B --output comparison.json
lab-local\.venv\Scripts\redown-lab.exe cancel --run RUN_A
```

Run the same manifest under two releases and compare their run directories. Supply the archived `manifest.json` and the same source directory to repeat the workload. `compare` also accepts a saved `--plan-receipt` filename to show unsupported or blocked preflight capabilities. The comparison reports changed manifest parameters and environment alongside stable scenario results. CLI exits are `0` success or valid preflight, `1` failed expectations or a detected regression, `2` blocked or invalid, `3` uncertain, and `130` cancelled. Ctrl+C or a second CMD running `cancel` requests a cooperative stop. If the commit may have reached the Worker, the original receipt remains uncertain.

For recovery, use the still-active original session, or choose **Read a previous QA prefix for recovery** in Settings and select the exact scope ID from `run.json`. Pair again if needed. Both commands verify the original manifest, frozen schedule and source inventory and use only read operations in that scope.

```cmd
lab-local\.venv\Scripts\redown-lab.exe reconcile --run RUN_A
lab-local\.venv\Scripts\redown-lab.exe resume --run RUN_A --expected-digest RESOLVED_DIGEST
```

Recovered evidence is appended under `recovery\<id>\`. The runner records whether the expected bytes are currently present. Missing objects or identity drift remain uncertain. To run a workload again, use `run --manifest` to get a fresh scope under the current grant. Close the session with **End and revoke** after collecting receipts. The CLI leaves QA objects in place for review.

## Production ownership and trust boundaries

| Lab operation | Production owner | Evidence |
| --- | --- | --- |
| Select scope and inspect capability | `extension/background.mjs`, current OAuth authority and R2 bucket listing, `checkDestination`, `remote.status` | Existing same-account bucket and compatible prepared Worker. Session and request budgets are reported by `doctor`. |
| Stage and publish upload | `src/chrome/local-upload-service.mjs` shared dispatch and durable CURRENT claim, Universal File API upload adapter, `src/cloudflare/file-transport.mjs` and signed Worker | Same conflict-safe staging, conditional final publication, queue and History entries as Explorer uploads. QA staging and final keys are below the fresh run prefix. |
| Independent final readback | `src/explorer/r2-adapter.mjs` `stat` and `readStream`, OAuth Object API | Exact key and size, strong ETag, version comparison where R2 supplies it, streamed SHA-256 in the extension and through the Python relay. |
| Metadata and list | Same production R2 adapter with session-bound reads and bounded pages | Exact observed object identity or expected list entries. |
| Recovery | Frozen local journal and the same read-only Object API | Separate evidence of expected bytes from the original prefix. No recovery mutation. |

The one optional Chrome permission is `nativeMessaging`. The Windows installer registers a pip-generated executable under HKCU with one exact `allowed_origins` entry. The relay also checks Chrome's invocation origin, binds to `127.0.0.1`, requires a private random endpoint key, and forwards only allowlisted protocol methods. Pairing codes are single-use, expire after two minutes, and have an attempt limit. The session ticket stays in the private native state directory and is bound to that helper instance. OAuth and signed Worker credentials stay inside the extension. The session checks account, OAuth session and required scopes, and ends on revoke, expiry, or helper disconnect. An upload already dispatched before a revocation may still have committed and must be observed separately.

The runtime adapts the included historical native frame relay, manifest duplicate-key handling, corpus inventory and OPFS staging design. The MIT-licensed SHA-256 implementation and its notice are carried from the vendored streaming snapshot. The old engine, provider authentication and Python GUI are outside the runtime. The Python package includes small generated test images and one-second audio/video assets, plus deterministic generators for text, documents, and archives.

## Current limits and remaining work

- **P0** is implemented through the fixture boundary. Windows Chrome native messaging, the actual prepared Cloudflare account, live same-version R2 readback, and GUI acceptance still need owner evidence. No worker deployment, OAuth scope expansion, or live writes were performed by Codex.
- **P1** supports one transfer slot, 8 MiB per file and OPFS spool, 250 grant file slots, up to 640 MiB modeled provider traffic, and 8,192 provider-call units per grant. The conservative preflight reserves up to 256 call units per upload and 8 per verification read, so an ordinary single manifest can reserve up to 31 verified uploads before other calls. Upload accounting models the staging PUT/readback, Worker read/publish and one final read. Provider retries, internal Worker actions, and ongoing storage charges can differ from modeled cost. Local corpus enumeration, per-file buffering, planned requests and disk are bounded. Empty folders are recorded without placeholder uploads.
- **P2** remains open for copy/move/rename/delete/mkdir, search, preview/public URL generation, true-remote URL saves, externally preseeded download sets, renewed long-running grants, automatic recovery of pre-dispatch work, and resource/performance measurement. The current manifest interface can express larger workloads and altered concurrency. The production bridge, worker admission and data plane need measured changes to support full encoded 100 MB files, 20 concurrent uploads or downloads, 40 bidirectional overlapping transfers, 1 GB+ files, and larger inventories. A future gate should measure per-direction active byte transfers, working-set RSS, disk high-water, provider requests, throughput and p50/p95 latency against each declared tier.

## Source and verification status

The feature is in `src/chrome/python-lab/`, `extension/python-lab-settings.mjs`, and the existing background and upload/file transport boundaries. The Python package, schema and example workloads are under this directory. The owner-runnable integration is `scripts/verify-python-lab.mjs`. The prior upload laboratory remains under `../upload-recovery/runner`.

| Verification layer | Result |
| --- | --- |
| Extension build and Python wheel | PASS. The build preserved the extension ID, OAuth callback, and deployed Worker digest. The wheel contains the CLI, native entry point, schema, and small fixtures. |
| Python workload contracts | PASS, six tests covering deterministic range resolution, supported and blocked profiles, schema semantics, budget rejection, path collisions, and switched sources. |
| Focused product tests | PASS, 716 tests. An additional 24 targeted upload, API, reliability and workings checks passed. |
| Native relay and production Worker under local workerd/R2 | PASS. Three corpus runs each confirmed three objects with independent hashes. Comprehensive confirmed 19 uploads, two preserved conflicts, 19 metadata checks, one listing, and 19 independent downloads. Lost acknowledgement reconciled after a new read-only grant with zero additional signed writes. |
| Existing upload laboratory | PASS, the five-file/two-root offline smoke. |
| Chromium browser fixture | PASS, the Settings card at 365 px and actual browser service-worker OPFS staging, hashing, and cleanup. |
| Installed extension | BLOCKED in this environment. Chromium returned `Loading of unpacked extensions is disabled by the administrator.` Windows host registration and the real Chrome permission prompt remain owner-run. |
| Production Cloudflare and manual Shelf | NOT TESTED. The acceptance commands above use the selected owner's active R2 and Worker authority. |

Two historical checks also failed directly from starting revision `1b7f046`: the non-Narrow/non-Depth golden digest in the full suite, and the older Shelf appearance test whose expected theme list omits Chrome. Their baselines remain intact. All new evidence is local and Git-ignored.
