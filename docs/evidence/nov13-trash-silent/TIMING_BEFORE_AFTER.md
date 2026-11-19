# Timing before/after and source phase audit

**Priority invariant: RIGHT-CLICK SAVE WORKS, BUT TRASH DOES NOT — SIMPLE, NARROW, DEPTH.** This profiling is read-only and ran alongside the dedicated Trash repair; no performance code was changed before the Trash gate.

## Evidence and reproducibility

Baseline: immutable source archive `b0d11f1b`, `/tmp/c2c-silent-before`; browser **Chromium 156.0.8078.79**, Linux headless, viewport 1100×900. Timestamp and raw samples are in [timing-before.json](timing-before.json). [TIMING_HARNESS.mjs](TIMING_HARNESS.mjs) loads the actual app and CURRENT modules, actual browser DOM and IndexedDB, through the existing `tests/product-browser-host.mjs` fixture. It injects synthetic OAuth/provider and runtime messaging. The browser profile/context is disposable; no owner's configuration or real cloud resource is changed.

Run from the repository root after creating the exact baseline archive:

```
C2C_TIMING_ROOT=/tmp/c2c-silent-before C2C_TIMING_OUT=/tmp/c2c-timing-before.json node docs/evidence/nov13-trash-silent/TIMING_HARNESS.mjs
```

A later after run must use the tested current tree and the same script/viewport/sample counts. File hashes/build digest and tests belong with final evidence. Do not rerun using a mutating source tree or overwrite historical evidence. The supplied synthetic receipt/message sequence is a presentation test only, not remote verification.

**Measurement definition:** each interaction is an in-page programmatic button click timestamp, followed by its expected DOM readiness condition, then the next `requestAnimationFrame`. It is a local UI response proxy, **not** a human hardware gesture-to-photon measurement, native Chrome menu rendering latency, real extension IPC latency or network save timing. Frame quantization can dominate small values. p50/p95 use nearest-rank order statistics; n=1 values are single observations, not reliable percentiles. The shared cloud executor was not performance-isolated, so small before/after deltas cannot establish causation.

## Executed local UI timing comparison

Milliseconds; all local fixture readiness checks PASS. No performance threshold was invented for correctness.

| Interaction | n | Before p50 | Before p95 | Before maximum | After p50 / p95 / max ms |
| --- | ---: | ---: | ---: | ---: | --- |
| manager-open | 20 | 30.3 | 39.2 | 39.2 | 30.5 / 50.9 / 51.3 |
| manager-narrow | 20 | 11.1 | 19.1 | 31.3 | 14.3 / 17.3 / 39.1 |
| manager-depth | 20 | 11.2 | 18.6 | 18.7 | 12.3 / 16.5 / 24.2 |
| manager-simple | 20 | 10.1 | 21.1 | 24.5 | 11.0 / 17.4 / 18.1 |
| settings-tab | 20 | 28.7 | 89.8 | 97.6 | 31.9 / 38.0 / 39.2 |
| remotes-tab | 20 | 11.1 | 17.2 | 18.3 | 11.7 / 17.5 / 31.8 |
| explorer-first | 1 | 65.5 | 65.5 | 65.5 | 16.8 / 16.8 / 16.8 |
| remotes-from-explorer | 10 | 7.6 | 16.5 | 16.5 | 8.3 / 16.7 / 16.7 |
| explorer-warm | 10 | 11.7 | 27.2 | 27.2 | 11.0 / 16.3 / 16.3 |

First Explorer entry tests only grid-shell visibility and one frame; it does not await complete folder contents or any real network.

Cold startup proxy: **1262.8 ms** from host page.goto initiation to fixture ready + Manage enabled, n=1. Browser first-paint and first-contentful-paint: **544 ms**, n=1. Initial fixture module import/API creation and reconciliation contributed **389.6 ms** to first queued RPC duration. This is not evidence that the production extension service worker takes those times, nor that the app's entire first meaningful paint waits for those calls.

## Trash-first gate timings (separate focused harness)

Final `scripts/test-manager-trash.mjs` result: **13/13 checks PASS**. Raw evidence: [trash-timing-source.json](trash-timing-source.json). Production app/API/CURRENT/projector/registrar, real Chromium at 640×800, injected provider/native callbacks; not installed Chrome or R2. Before: 15 activations (five per mode) with the native confirmation forced false produced no visible response/staging. That models the suspected suppressed-confirm path; it is not proof of the owner's installed modal cause.

| Mode | Click→inline confirmation n | p50 ms | p95 ms | Confirm→draft ms (n=1) | Save→inline response ms (n=1) | IPC→commit+fixture ACK ms (n=1) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Simple | 5 | 10.2 | 12.4 | 11.9 | 12.7 | 145.0 |
| Narrow | 5 | 7.9 | 9.0 | 33.2 | 12.8 | 132.1 |
| Depth | 5 | 10.5 | 12.7 | 20.1 | 11.9 | 133.4 |

The inline-response duration and durable commit duration are different gates. A fast response does not mean the native menu is already ACKed or a cloud object was saved. Focused assertions cover confirmation/Cancel, exact ID/scope staging and Save, pagination, reload, missing ACK/retry, revision conflict and sole Depth removal. Deletion has zero cloud mutation calls. Working-save regression is reported separately by the root agent (78/78 reported at the Trash checkpoint). Installed Trash acceptance remains UNVERIFIED; complete fixture gates before Debug/performance changes are therefore the progression gate allowed by the owner's request.

## Completed fixture IPC durations during that run

These encompass browser in-process API/CURRENT fixture work, not a real extension boundary or Cloudflare latency. Counts are completed calls in the measured sequence, not a guarantee about all background work.

| Method | n completed | Before p50 ms | Before p95 ms |
| --- | ---: | ---: | ---: |
| describeCapabilities | 1 | 389.6 | 389.6 |
| loginStatus | 1 | 389.6 | 389.6 |
| getConfiguration | 21 | 4.8 | 18.2 |
| inspectShelfAttention | 1 | 0.1 | 0.1 |
| inspectRemoteHistory | 34 | 11.1 | 93.0 |
| listAuthorizedBuckets | 20 | 4.9 | 15.4 |
| inspectBackupRoots | 20 | 0.3 | 1.5 |
| getGalleryLoadingVisual | 20 | 2.9 | 24.1 |
| enterExplorer | 1 | 11.8 | 11.8 |
| listFolders | 2 | 5.0 | 20.2 |
| inspectRemoteReceipt | 1 | 19.1 | 19.1 |

**SOURCE + measured opportunity:** every Remotes render asks `inspectRemoteHistory` with no pagination; 34 such calls completed in this sequence. Depth tab availability asks `listAuthorizedBuckets`; 20 calls completed for 20 Depth tab visits. These are candidates for careful per-document/in-flight reuse only if traces identify them as a real blocker. They do not justify caching account readiness indefinitely, changing target routing, hiding failed requests, or rewriting the click pipeline. Settings already starts backup-root/visual reads in parallel; no serialized network bottleneck was demonstrated by this UI fixture.

## Native save phases — source facts and explicit limits

| Phase | Checked baseline owner | Actual evidence here | Safe conclusion |
| --- | --- | --- | --- |
| Mouse gesture → Chrome native menu visible | Installed native rows; Chrome renderer owns popup/scrolling | **UNVERIFIED/BLOCKED**: no installed extension access in managed Chrome | No menu-open speed number, no claim that removing status text accelerates native rendering |
| Native item selection → worker wake/resolve | registrar.handleClick; background.beforeClick → nativeReady | Source inspection; no real onClicked measurement | Matching current intent/ACK may avoid reapply; stale configuration can legitimately require reconcile. Do not bypass ACK or saved-target checks |
| Reconcile/application | engine compile/apply; registrar removeAll/create and callbacks | Existing isolated suites only; no timed native callbacks | Full sequential registration can cost time; no proof of excess reapply frequency in the owner's profile. No registrar optimization proposed |
| Authorization/readiness → accepted dispatch | Depth preflight, invocation-local Depth authorize, engine authorize/rechecks, remote transport status/capability | Source facts; existing fixture tests exercise outcomes | Repeated checks exist, but distinct security/session/generation checks cannot be removed speculatively |
| Accepted → source fetch/upload/readback | transport.save and Worker; existing per-boundary timings on saved remote results | **UNVERIFIED** for actual Cloudflare network and R2 saves here | Use existing operation timings to distinguish true network delay from UI latency, never report fixture success as verified cloud save |
| Result → visible diagnostic overhead | recordRemote → remote-result; createDepthFeedback → depth-click-outcome; app.status | Executed synthetic sequence exposed four visible box texts; raw events retained | Proven presentation repetition, not a measured save pipeline stall or a diagnosis of the owner's exact three messages |
| Native attention/OS notification | provider-panel.open/notify; createDepthFeedback | Source inspection only | Delivery/gesture policy remains **UNVERIFIED**, and a mocked notifications.create callback is not OS-visible evidence |

## Lowest-risk priorities after Trash gate

1. Make Debug OFF hide the fixed box before boot and at every later status call; expose legitimate failures quietly at the relevant action/result. This directly addresses observed baseline rendering without altering saving.
2. Add/reuse one profile Debug presentation preference and bounded safe detail reuse. Existing durable outcomes/receipts/health are sufficient; no tracing database or queue replacement.
3. If actual traces warrant it, coalesce redundant noncritical read-only UI requests while keeping explicit refresh/account/config changes fresh and preserving current controls. Do not optimize readiness/authorization/transport based only on this synthetic app timing.
4. Keep the working native right-click save as a non-regression invariant. Actual native open/dispatch/verified completion and Windows responsiveness still need authorized physical measurements; no arbitrary depth/sibling cap is a performance fix.

## After results — same production-UI fixture harness

After snapshot `/tmp/c2c-silent-after`, same Chromium version, viewport, sample counts, synthetic source/IPC and measurement script: **PASS**. Raw [timing-after.json](timing-after.json), source snapshot hashes in [timing-provenance.json](timing-provenance.json). No runtime preference storage mock was added for this comparison: default OFF works with an absent optional presentation-preference binding. Persistence/toggle/cross-document behavior is tested separately by the dedicated Debug harness, not claimed by these timings.

- Replayed the same synthetic accepted → transfer.upload → verified → final Depth result: **zero visible floating-box observations**. Underlying diagnostic text can change while the box stays hidden; durable synthetic result inspection still executes. No native/R2 save or OS delivery is implied.
- All warm local response p95 measurements in this sample remain under 100 ms. Some medians increase and some tails decrease. The source changes target confirmation and quiet presentation, not the native dispatch or network pipeline. **No causal application-wide speedup is established** from these limited, shared-executor samples.
- Cold fixture-ready proxy after: **1456.2 ms**, n=1, versus **1262.8 ms** before. Initial host-module/RPC setup after: **550.7 ms**, n=1, versus 389.6 ms before. That fixture cold startup did not improve; do not conceal it or label it the real extension worker wake time.
- Completed RPC counts remain the same, including 34 history reads and 20 Depth bucket-availability reads. No caching, registration/reconciliation, authorization, transport or save-path optimization was made based on these measurements.
- The original Trash gate timings above use the immutable gate result copied before Debug changes. A later all-three-mode rerun with Debug OFF also passed 13/13; its concurrent-run timings are a different sample and must not replace that original table silently.

Actual native menu-open speed, installed click→dispatch, Worker network latency, Windows OS notification delivery and R2 verified-save completion remain **UNVERIFIED/BLOCKED**, as stated in the phase table. Debug ON/OFF toggle and reload/late-event visibility results belong to the dedicated Debug test report. These UI samples do not establish a typical-desktop guarantee or a whole-app latency percentile.


Precise snapshot note: after the timing capture, the hidden footer button label changed from “Save results” to “Review save results” to disambiguate the action in the Debug UI fixture. The measured IDs/readiness selectors and all app JS/CSS/preference/notification module hashes remain identical to the timing snapshot; [timing-provenance.json](timing-provenance.json) retains the exact captured HTML hash rather than pretending it was the later one. No performance claim depends on that label.

Dedicated Debug UI run (separate from timing harness): **11/11 checks PASS**, **1,524 visibility samples, zero Debug-OFF violations**, as reported by its owning UI agent and retained in [debug-ui-source.json](debug-ui-source.json). It covers delayed boot, three pending/uncertain/completed message sequences, quiet failure/result access, ON/OFF, cross-document preference, reload, fail-closed storage errors, safe Health and unchanged privilege/configuration/auth/provisioning counters. These are actual Chromium production app/preference/API/IDB with injected storage/provider/lifecycle messages, not actual Chrome native clicks/R2 or physical OS notification observation. See [quiet failure screenshot](debug-off-inline-feedback.png).

Final test-only addition: the dedicated Debug browser fixture also exercised the quiet footer at 320px with blocked/uncertain outcomes, both action buttons inside the viewport and keyboard navigation retained. This passed without any CSS/source change; screenshot: [320px quiet feedback](debug-off-320px-feedback.png). Native/R2 evidence status is unchanged.
