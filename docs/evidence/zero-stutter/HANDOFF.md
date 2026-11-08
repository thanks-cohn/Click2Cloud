# Explorer responsiveness and complete destination Save — 0.3.11

Development branch: `dev/p0-zero-stutter`, based on main `04644f431a960b7ea61c231fa28e3fba33f166e2`.
Runtime candidate: `97c2806eeb1f656ab69e7843085517e189663968`; implementation also includes `dde99db4952bcf35a50c4832440e94e8a3ce774b`.
Extension identity remains `ajppphdiamdobknpamcheohmdbdbeoal`. Worker digest remains `IwTaIK4em1_mwIygmpbfULfJWUZln3ggKnG5suyu-NA`.

## Result and limits

Production source now paints a disabled context-menu shell immediately, retains Explorer DOM, caches/coalesces bounded metadata reads, supports virtual Grid and exact editable cloud addresses, and displays preview loading before bounded range reads. Trusted inspections no longer wait for unrelated native-registration callbacks. Operations still use the one canonical API, current authorization, and dispatch-time checks. See [SOURCE.md](SOURCE.md) for actual causal findings and API/security behavior.

`+ Right Click → Save` persists the exact target first, refreshes its readiness and awaits canonical native registration. Same-bucket, same-code verified Worker write proof is reusable only with a current exact-target capability and current authorization. Saved native labels never acquire a `· Set up` suffix. A genuine missing Worker, permission or destination scope remains a visible Shelf blocker; no infrastructure is silently created or scope widened. Configuration, saved approval, defaults and credentials are preserved.

This is a tested implementation candidate, **not a claimed installed-Windows/live-provider end-to-end pass**. The mandatory ordinary-webpage image → newly saved exact folder → independent live R2 readback remains BLOCKED. No Worker was deployed, no cloud objects were written, no REDOWN files were changed and main was not merged.

## Verification classes

- Focused regression suite: **260 PASS / 0 FAIL**. Includes destination proof reuse, scope rejection, persistence and preview/menu/cache behavior. See focused-tests.txt.
- CURRENT/baseline integrity: **5 PASS**; immutable pre-change snapshots retained.
- Chromium production-app/API/IndexedDB fixtures: **30 PASS / 3 BLOCKED / 1 NOT_TESTED**, pinned to runtime candidate with clean runtime source. Includes GUI destination Save and exact-target dispatch in Simple/Narrow/Depth, reconnect, full browser restart persistence, stale menu responses, immediate disabled shell, retained DOM, Grid/address and inspection released before held native registration. This uses fixture authorization/native callbacks; it does not prove Chrome's installed native menu.
- Local workerd/R2: actual isolated local R2 storage independently returns the bytes written into two new exact folder prefixes using the same prepared Worker. This is storage-backed local evidence, **not Cloudflare production R2**. See the cloudflare integration test and focused log.
- Genuine unpacked Chrome attempt: **BLOCKED `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR`**, Chromium 155/Linux. Exact describeCapabilities request and null response are in real-shelf-receipt.json. No policy bypass was attempted.
- Existing isolated Cloudflare Worker settings read: HTTP 200, ownership and R2/prefix binding confirmed. Signed remote test **BLOCKED `EXISTING_TEST_SIGNING_KEY_NOT_READABLE`**. Cloudflare does not return the existing secret signing binding. No rotation/deployment or direct-S3 substitute was used. See live-destination-preflight.json.

REDOWN reference main `e58bf99f4851f635cecc572e483ae35e184677f2` was inspected read-only. Its rendering/caching principles informed the implementation; no legacy engine or third-party Explorer was imported. Reference hashes are in reference.json.

## Performance evidence

See PERFORMANCE.md and comparison.json for final before/after measurements, source hashes, all outliers and the ten-minute stress run. Each matrix uses 3 repeats of 0/1/100/1,000/10,000 items, with separate 1/10/100-bucket runs. The 2.1-second API delay is intentionally injected to isolate the menu dependency.

These are real Chromium executing production app code with synthetic read-only cloud fixtures. Timings end at visible DOM plus two RAF paint opportunities; they are **not physical display latency, native-input EventTiming, field INP, real MV3 wake latency or owner Windows data**. Raw records include Long Tasks, frames, DOM/heap/layout counters, method timing and source hashes. Preliminary records are explicitly separated and are not final-source acceptance.

## Remaining defects and next gates

1. Owner Windows Chrome must validate actual native menu, actual input-to-paint and real cloud save in the existing profile. No release-wide zero-stutter claim follows from Linux fixture p95, especially where stress Long Tasks/outliers remain.
2. A signed existing test Worker transport is required for live new-prefix readback. The current test binding secret cannot be read back. Preserve existing resources; do not rotate/deploy merely to relabel this run as passing.
3. Already-sent Chrome runtime IPC cannot be physically cancelled. Epoch checks prevent stale results from changing UI; cancellation stops queued work and future range reads.
4. External recovery-directory availability remains independent of local configuration/native ACK. A missing external backup path must not erase saved destinations or fabricate backup success.
5. Unready destinations keep their chosen labels and route to Shelf diagnostics. They are not falsely advertised as save-ready; exact readiness is reported by the canonical destination commit response.

## Windows acceptance: preserve your current profile

Use CMD in your existing checkout. Save unrelated edits before switching branches; do not uninstall the extension, clear storage, reset OAuth or deploy a Worker for this repair.

```bat
cd /d "%USERPROFILE%\Click2Cloud-FRESH"
git status --short
git fetch origin
git switch dev/p0-zero-stutter
git pull --ff-only
npm ci
npm run test:focused
npm run build:extension
```

In chrome://extensions, reload the **existing** unpacked extension from the built extension directory (use the build command's printed path). Confirm the same ID and version 0.3.11. Open Shelf once; existing destinations, Default and approval must remain. Do not load a second copy with a different identity.

For each Simple/Narrow/Depth mode, navigate to a real connected bucket/folder, right-click that location → **+ Right Click**, choose its label/options → **Save**. The native menu must update with that exact label and no Set up suffix. On an ordinary public HTTPS webpage right-click an image/link, choose the new destination, then independently verify object bytes and the exact bucket/key using R2 (not only the success banner). Check Explorer and History GO TO. Repeat for a second distinct folder, reconnect, and full Chrome restart; compare saved configuration/Default before and after. If authority/scope genuinely fails, export only the safe stage/code diagnostics displayed in Shelf; never share tokens, source URLs or private keys.

For real input latency, inspect the existing Shelf document in Chrome DevTools, enable instrumentation once, reload, exercise actual pointer/keyboard/scroll/navigation/view/preview actions and capture a Performance trace:

```js
localStorage.setItem('click2cloudPerformance','1'); location.reload();
// After exercising the Shelf:
copy(JSON.stringify(performance.getEntriesByType('measure')
  .filter(e => e.name.startsWith('c2c.explorer.'))
  .map(e => ({name:e.name, ms:e.duration})), null, 2));
```

Those local fixed-name measures contain durations only. Use the actual Performance trace for native input/Long Tasks; do not mistake the double-RAF proxy for physical paint. Disable with localStorage.removeItem('click2cloudPerformance') and reload.

The portable fixture benchmark below creates an isolated temporary fixture profile; it does not verify your installed extension or R2:

```bat
set "C2C_CHROME_EXECUTABLE=C:\Program Files\Google\Chrome\Application\chrome.exe"
node scripts/measure-explorer.mjs --runs 3 --buckets 1 --stress-seconds 600 --output explorer-fixture.json
node scripts/measure-explorer.mjs --runs 3 --buckets 10 --output explorer-10-buckets.json
node scripts/measure-explorer.mjs --runs 3 --buckets 100 --output explorer-100-buckets.json
```

An optional existing authorized CDP session can be observed with `--cdp http://127.0.0.1:9222 --app-url chrome-extension://ajppphdiamdobknpamcheohmdbdbeoal/extension/app.html`. This requires that browser already expose debugging; it does not bypass policy, recreate your profile or provision resources.

## Changed source and canonical owners

| Mechanism | Source | Existing canonical API / owner |
|---|---|---|
| Immediate disabled context shell, stable viewport/tree, Grid, address and preview | extension/app.mjs, extension/app.css | inspectExplorerContextMenu, navigateExplorer, listBuckets, stat, readFileChunk; actual context operations retain existing trusted file APIs |
| Sorted immutable page cache, bounded/coalesced metadata, virtual rows/tiles | src/explorer/listing-view.mjs, location-view.mjs | Presentation over existing Universal File API; no second file/config engine |
| View/Grid persistence and exact destination readiness | src/api/service.mjs, config.mjs, service.d.ts | commitConfigChange / setView, createDestination, makeDefault; same CurrentStore transaction and native reconciliation |
| Local context descriptor and authorization availability | src/api/explorer-context-menu.mjs | inspectExplorerContextMenu; same pure producer for disabled shell and trusted response |
| Boot/menu inventory and trusted cold inspections | extension/background.mjs | Existing single trusted runtime handler, registry inspect scope, dataReady/ready; all sender and schema gates retained |
| Exact capability, same-bucket write proof and honest scope block | src/cloudflare/transport.mjs | Existing checkCloudflareReady / TRUE REMOTE transport and current authority |
| Saved native labels and attention routing | src/core/menu-spec.mjs | Existing Simple/Narrow/Depth compiler/registrar/dispatchSave; no extra menu engine |
| Optional duration-only local instrumentation | src/explorer/performance.mjs | Performance Timeline observer; no diagnostic mutation API |

Full behavior/source fingerprints are in 11.2026/workings/right-click-workings.json CURRENT; previous baselines remain immutable. Narrative API ownership is also updated in latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md. Worker source, OAuth grants and provisioning implementation were not rewritten.

## Performance acceptance is still open

Final 1/10/100-bucket fixture warm-menu p95 is 34.5/33.9/34.5 ms, versus 68.9/68.7/67.6 ms baseline. Injected-delay p95 is 33.3/34.9/35.4 ms versus 2167.1/2167.8/2182.7 ms. Selection p95 remains about 33–34 ms. These demonstrate removal of the menu API dependency, not a universal speedup: the 100-bucket menu p99/max worsened from 69.4 to 119.4 ms in this run. The final ten-minute stress produced 5,418 samples, max 261 live DOM elements, frame p95 16.8 ms, **max frame gap 1,050 ms** and **nine Long Tasks, max 568 ms**. Tail regressions and owner input latency remain release gates; do not label this candidate universally zero-stutter. Raw values are preserved in PERFORMANCE.md/comparison.json.
