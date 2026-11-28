# ReDown 0.3.32.6 · Checkpoint 2B.1

**Candidate status** · implemented, owner acceptance open. This checkpoint preserves the existing extension ID, Cloudflare OAuth callback, signed Worker protocol and native relay wire. The production Worker bundle has the same digest as 0.3.32.5. The existing upload source store, journal and scheduler remain in place. [Execution index](PART_2_EXECUTION_INDEX.md)

## What changed for the first save

Simple, Narrow and Depth register the exact authorized route before Worker preparation finishes. The common save dispatcher snapshots the original target and source, then joins or starts bounded preparation. It continues the same logical operation after rechecking the current OAuth session and the acknowledged route. A retained exact route can survive native reconciliation. A removed or changed route or authorization fences the save.

Destination registration records confirmed setup authority in the existing ledger. Login prepares a bounded set of configured buckets. Startup can resume existing setup work. The first save can independently prepare any other approved target, including an eligible Narrow ancestor. Concurrent preparation serializes on the deployed account/bucket binding. The existing Worker probe and claims prevent blind replay after a lost response. An authenticated capability must match the retained deployment's digest, exact binding and required wire features. A new extension bundle can reuse a healthy prior Worker. [API and engine behavior](../../../latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md)

## Source comparison

The reported sequence in which a Depth save unlocked Simple and Narrow is owner evidence. The branch exposed two reproducible mechanisms that can lead to that symptom. It required a ready local plan before Simple and Narrow could dispatch, and the Depth observer could repair the plan and end the original gesture with `FRESH_CLICK_REQUIRED`. The original customer incident has no correlated per-click trace establishing its exact cause.

| Boundary | Original REDOWN | Continuation candidate |
| --- | --- | --- |
| Prepared profile and identity | `preparedProfile` finds the account/bucket profile and validates its Worker version, storage binding and safe-transfer capability. The profile includes its Worker URL and credential. | `createProvisioner` and `createCloudflareOnboarding` retain the existing durable account/bucket plan, exact prefix and OAuth session fence. Healthy compatible Workers are reused after authenticated checks. A control-plane 404 is required to recreate the same owned script after its endpoint disappears. |
| OAuth and initialization | `preparedProfile` can provision through the established Cloudflare profile path. Its Beta option blocks implicit provisioning. | Only recorded approval and actual provider grants authorize preparation. Login, destination registration and click recovery converge on the same Worker plan. The existing empty-account and chosen-default policies still govern onboarding. |
| Menu registration and routing | `right-click-v3.js` checks `prepared`/`eligible` before projection and resolves the exact configured profile and prefix. Native reconciliation uses existing Chrome callbacks. | The canonical compiler and registrar keep exact action IDs. The acknowledged route remains selectable when Worker proof is the sole missing prerequisite. An existing valid session and the exact action are checked again at dispatch. |
| Source admission and recovery | `saveResolvedRightClick` resolves the selected URL and stored configured target; existing Worker calls can repair some authorization failures. | The common signed save retains original source and logical ID while it waits. A cold, concurrent or recoverable preparation stays in one submission. A lost publication response stays fenced. The existing source journal for uploads is unchanged. |
| Publication and readback | `ingestCloudflareAtPrefix` is followed by `verifyCloudflareReceipt` before recording completion. | The existing signed Worker publication and independent R2 verification remain the consumer proof. The Lab separately reopens object bytes and compares SHA-256 against Python’s independent expected manifest. |

[Original REDOWN background, pinned](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/extension/background.js#L1725) · [Original native menu, pinned](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/extension/right-click-v3.js#L251) · [Continuation baseline background](https://github.com/thanks-cohn/Click2Cloud/blob/d22de456bfb7258600327996d326f154710a995a/extension/background.mjs#L289) · [Historical Worker permission evidence](../../../docs/evidence/worker-permission/HANDOFF.md)

## Observed results

| Evidence layer | Result |
| --- | --- |
| Full JavaScript and focused suites | 881/881 and 747/747 passed. |
| Python | 28 passed. Two Windows-only checks skipped on Linux. |
| Paired Python/native-relay/Workerd campaign | 100/100 seeded cases passed, with separate exact-key and reopened SHA-256 comparisons. Case 14 passed in isolation after a simulated host eviction during pending setup. |
| Packaged Chromium 143, direct registrar submission | 3/3 mode-only profiles verified one exact publication during a held deployment. Chrome reported zero Shelf contexts and no opening event. |
| Actual Chromium 143 native menu on Linux/X11 | 9/9 across three consecutive runs with one extension load per profile. Each trial recorded one native delivery, one exact publication, one reopened SHA-256 match and zero Shelf openings. |
| Chromium Shelf fixture | 19/19 verified GUI/production-owner cases with isolated Chrome callbacks and provider fixtures. |
| Linux native relay fault round trip | 100/100 and 555/555 uploads independently reopened with matching SHA-256. Each run exercised upload and read faults plus a lost acknowledgement. One publication per logical file and zero residual staging bytes. |
| Cloudflare connector read-only | One account, 53 Worker scripts and eight buckets accessible. Five sampled ReDown Worker settings records matched the expected binding shape and baseline deployed digest. |
| Installed Windows and live authorized save | Owner gate open. The candidate completed zero writes to live Cloudflare. |

Earlier fixture failures are retained in the evidence. The packaged fixture now loads the extension once. An earlier loader combined startup flags with a CDP install fallback and saw duplicate publication. The three subsequent runs used a single loader and checked Chrome delivery and publication separately. The historical menu digest failure was reproduced on the authorized base and traced to the Basic provider release, which changed two fields. The regression now checks those approved fields and independently reconstructs the unchanged historical digest. [Seeded case receipts](RIGHT_CLICK_CASES_2B1.ndjson) · [Evidence](EVIDENCE_2B1.json)

## Reproduce from Windows Command Prompt

These commands start from a fresh checkout of the continuation branch. Node 22+, Python 3 and Git are required. The packaged browser command uses the Playwright Chromium build and an OpenSSL executable to create a disposable loopback certificate. Git for Windows supplies OpenSSL in its `usr\bin` when installed in the default location.

```cmd
git clone --single-branch --branch codex/redown-11-27-2026-part-2-3-continuation https://github.com/thanks-cohn/Click2Cloud.git redown-2b1
cd redown-2b1
npm ci && npm run build:extension
py -3 -m venv lab-local\.venv
lab-local\.venv\Scripts\python.exe -m pip install -e 11.25.2026\live-python-lab\python
call 11.25.2026\alpha-three-runs\02-universal-cloud-compatibility\part2-lab.cmd right-click --seed 271127
call 11.25.2026\alpha-three-runs\02-universal-cloud-compatibility\part2-lab.cmd right-click --seed 271127 --cases 100
call 11.25.2026\alpha-three-runs\02-universal-cloud-compatibility\part2-lab.cmd right-click --seed 271127 --case 12
npm run test:focused
lab-local\.venv\Scripts\python.exe -m unittest discover -s 11.25.2026\live-python-lab\python\tests
set "PATH=%ProgramFiles%\Git\usr\bin;%PATH%"
npx playwright-core install chromium
set "REDOWN_PLAYWRIGHT_CHROMIUM=1"
node scripts\test-right-click-readiness-browser.mjs
```

The Lab fixture writes `scenario-plan.json`, `observations.json`, `summary.json` and `fixture.log` under the printed `lab-local\verification\right-click-…` directory. `--case` replays a case using the same seed and independent expected bytes. The packaged runner prints a separate `summary.json`. Both fixture commands use isolated local R2 and leave the connected account untouched.

### Installed browser and authorized provider acceptance

Use isolated profiles and a dedicated, approved Cloudflare QA bucket or prefix. Run one profile per mode with no previous saves. Connect in Remotes, register just that mode's selected location and close the Shelf. Make one native Save selection on a known public fixture and retain its expected SHA-256 independently. Check the exact provider path, original operation ID and independent content readback. Repeat for a returning profile and an approved second location. Keep unrelated Depth configuration and prior saves out of the Simple-only and Narrow-only cases.

For optional read-only evidence, register the native helper, select **Download from an existing folder (read only)** in Python Laboratory Settings, approve the exact QA prefix and use its one-time **Copy CMD** command. This observer does not prepare the Worker. Run these commands after pairing, changing `qa/first-save/` to the actual approved prefix. The value of `--mode` is `simple`, `narrow` or `depth`.

```cmd
lab-local\.venv\Scripts\redown-lab.exe install-host --extension-id ajppphdiamdobknpamcheohmdbdbeoal
lab-local\.venv\Scripts\redown-lab.exe right-click-inspect --mode simple --prefix "qa/first-save/" > lab-local\simple-first-save.json
lab-local\.venv\Scripts\redown-lab.exe download-selection --retain-downloads --live --approve-cost-usd 0.10
certutil -hashfile "PATH-PRINTED-BY-LAB\first-save.txt" SHA256
```

The retained test file must match the independently recorded fixture hash and exact requested key. The dedicated prefix can include a small readiness object. Inspect the exact requested test file in the readback manifest. The read-only receipt can correlate a known operation with `--operation-id`. A native menu that was rendered and selected must be recorded outside the RPC. Chrome's callback and production provider receipt distinguish registration, delivery, publication and byte proof.

The existing Windows fault gates remain in force. The current execution plan requires two consecutive complete 100-file and two consecutive complete 555-file round trips on the same qualified runtime. Keep each receipt. [Inherited Part 2 handoff](HANDOFF.md)

```cmd
call 11.25.2026\alpha-three-runs\02-universal-cloud-compatibility\part2-lab.cmd faults 100
call 11.25.2026\alpha-three-runs\02-universal-cloud-compatibility\part2-lab.cmd faults 555
```

## Acceptance boundaries

The per-run evidence records the exact implementation revision, candidate results, diagnostic signals, and remaining gates. The Cloudflare connector reached account inventory and an owned Worker settings sample. The packaged extension's signed Cloudflare grant and a live-provider round trip need the explicitly scoped QA context. Installed Windows and accepted live first-use evidence remain open. The inherited staging, source retention, failed-child recovery and historical acceptance decisions stay with their assigned checkpoints. A supplementary check of archived Worker c337e41 observed authenticated health and signed verification. Independent byte readback for that archived build is incomplete.

A Worker plan missing from a profile with an established setup ledger cannot be reconstructed without the owning signing material. ReDown preserves the ledger and rejects a duplicate deployment. Interrupted user-source admission before a remote claim remains within the 2B.2 durable execution qualification. [Machine-readable evidence](EVIDENCE_2B1.json) · [Part 2 requests](CODEX_REQUEST.md)

## Case 83 Windows follow-up

The owner recorded 99/100 on ReDown 0.3.32.6 at `3a7ab092d0eedf812a0c06b96b2fa137f2f73bd9`. Case 83 failed in that campaign and in both isolated replays. Authorization, source admission and menu registration succeeded. The first failed boundary was `worker.health` with `WORKER_ENDPOINT_MISSING`. There was one replacement deployment, a subsequent `TRANSPORT_UNAVAILABLE`, and zero publication requests or objects. The owner’s reported observations and the earlier Linux receipts are retained. The raw Windows receipts were unavailable in this workspace. [Case 83 evidence](CASE_83_EVIDENCE.json)

The unmodified case passed in the Linux laboratory. A deterministic fault at the first capability read after deployment was tolerated on the baseline. A second fault at the final capability read after the verified readiness probe reproduced the owner’s error sequence and zero publication counts. The baseline returned the final transient error directly from `recoverDestinationLocked`. The correction reuses the existing bounded capability-read policy there. Each retry is read-only and revalidates the existing session, destination scope and approval. The verified probe and deployment are reused, and publication still requires fresh authenticated readiness and the dispatcher’s original operation, source and authorized target. Persistent transport failure remains a failure. [Engine and API contract](../../../latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md)

In this command, the initial missing endpoint is injected by the local fixture. The management-plane calls and Worker requests run against local fixtures. Cloudflare confirms script settings and the `workers.dev` route are separate controls. No live deployment took place during this investigation. The baseline fixture also kept the retired Workerd process and its sockets alive while starting the replacement. The fixture now disposes the retired runtime first and records safe local error and cause codes at startup or dispatch. The summaries available for the owner runs do not establish the native socket error or prove that runtime overlap triggered it. [Cloudflare workers.dev routing](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)

The permanent regression checks the original initial error, both transient faults, one replacement deployment, one readiness probe, the original operation ID and source, exactly one publication to `qa/folder/depth-083.txt`, and a matching reopened SHA-256. Hosted Windows CI verified all these checks on `2f2ee4022175963de1d10b7d56e6e9af30871d6b` using Node 22.23.5. The workflow retains the scenario and observations on failure. [Windows CI job](https://github.com/thanks-cohn/Click2Cloud/actions/runs/46099369866/job/140838072254) · [Windows receipt artifact](https://github.com/thanks-cohn/Click2Cloud/actions/runs/46099369866/artifacts/15244558703)

The full Linux campaign passed 100/100 with independent reopened hashes. JavaScript passed 883/883 full and 749/749 focused. Python passed 28 tests with two Windows-only checks skipped on Linux. The Shelf browser fixture passed 19/19. The packaged Chromium run timed out waiting for the extension service worker under this workspace’s unpacked-extension policy, and the Playwright download was blocked by the environment’s network policy. The two other hosted CI jobs failed in the same steps as the baseline run. [Candidate CI](https://github.com/thanks-cohn/Click2Cloud/actions/runs/46099369866) · [Baseline CI](https://github.com/thanks-cohn/Click2Cloud/actions/runs/46093329344)

For reference-machine qualification, keep each receipt and run the isolated case followed by the full campaign on the same candidate.

```cmd
call 11.25.2026\alpha-three-runs\02-universal-cloud-compatibility\part2-lab.cmd right-click --seed 271127 --case 83
call 11.25.2026\alpha-three-runs\02-universal-cloud-compatibility\part2-lab.cmd right-click --seed 271127 --cases 100
```

Checkpoint 2B.1 stays open pending successful reference Windows verification and its existing acceptance gates.

### Warm initialization follow-up at c6b506e

The owner identified a failure at the initial `transport.probe` assertion on Windows. The receipt contained `ERR_ASSERTION` and an empty `fixtureTransport`. The endpoint was still present and the fault experiment had yet to start. The empty exception trace leaves the actual probe outcome and Windows transport cause unknown. The successful receipt separately verifies recovery from both injected resets with one exact publication and matching reopened bytes. [Owner observations and prior evidence](CASE_83_EVIDENCE.json) · [Successful Windows receipt](https://github.com/thanks-cohn/Click2Cloud/actions/runs/46099855219/artifacts/15244937591)

The warm fixture had treated a local runtime start and R2 proxy handle as sufficient to send its write probe. It now exercises the exact signed capability endpoint first, following production ordering. The receipt retains the sanitized probe outcome, operation ID, HTTP status, timing and any dispatch exception. On an uncertain probe, a read-only inspection of the same ID records whether the bytes are present. The initial probe must still verify for the scenario to start. Two controls retain an HTTP 503 outcome with an empty exception list and a lost response after a real write that read-only inspection verifies. Both stop before recovery. Hosted Windows CI passed the instrumented Case 83 replay. The full reference Windows campaign still gates acceptance for both fixture initialization and recovery. [Hosted Windows receipt](https://github.com/thanks-cohn/Click2Cloud/actions/runs/46103263246/artifacts/15245733177)

### Case 65 interrupted readiness probe

The reference Windows campaign on `c644643b538d3addaa211e072fcc8ed210464fcc` passed 99/100. Case 83 passed. Depth Case 65 lost its `/probe` reply after 220 ms with `ECONNRESET` and Windows errno `-4077`. The fixture calls Miniflare's local Workerd dispatch for this endpoint. The reported trace locates the reset on that loopback path. The component that initiated the reset and the original probe's write outcome remain unknown. The permanent regression deliberately drops the reply after a real probe write and verified readback. The baseline reproduces `READINESS_RECONCILE_REQUIRED` with zero publication requests. [Evidence](CASE_65_EVIDENCE.json)

The setup ledger already recorded the probe ID, but the first save returned when its reply was uncertain. The same active save now performs bounded `/probe-status` reads using that persisted ID and exact target. Matching verified bytes allow the normal capability and dispatch checks to continue. An explicit pre-write rejection records noncompletion. Missing bytes or an unavailable status retain uncertainty and never authorize a write replay. Case 65 requires one deployment, one probe write, readback under the original probe ID, one publication under the original save ID and an independently verified SHA-256.

The CMD runner prints each case, its phase and elapsed campaign time to stderr, with a heartbeat during quiet intervals. It retains `progress.ndjson`, atomically checkpoints `observations.json`, and writes the final verdict to `summary.json`. Each running case has a 120-second limit. The campaign deadline defaults to 30 seconds plus 20 seconds per scheduled case, with a 120-second minimum. Override it with `--timeout-seconds`. A cutoff fails the active case and retains all completed receipts. Remaining cases are marked `NOT_TESTED`.

```cmd
call 11.25.2026\alpha-three-runs\02-universal-cloud-compatibility\part2-lab.cmd right-click --seed 271127 --case 65 --timeout-seconds 90
call 11.25.2026\alpha-three-runs\02-universal-cloud-compatibility\part2-lab.cmd right-click --seed 271127 --cases 100
```

Checkpoint 2B.1 remains open for the full reference Windows campaign and the existing installed-browser and live-provider gates.
