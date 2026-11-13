# Trash repair, silent Debug Mode, and verified boundaries

**RIGHT-CLICK SAVE WORKS, BUT TRASH DOES NOT — SIMPLE, NARROW, DEPTH** was the owner-reported starting defect. Working saves are an owner observation, not a new live-R2 claim by this runner. The Trash repair was implemented and verified first, before Debug changes.

Branch: `codex/trash-silent-logic2real`. Baseline: `b0d11f1bffdc3b46ace5ff0ed0f8063635be09a4`, fetched from `codex/depth-working-first-implementation`. Trash checkpoint: `967c11880e76843de05e283d50f2dfc6f94084ef`. Final production-code commit: `4ad2ff5d889da73db4ec533e2dfb302600786ff0`. The subsequent evidence commit adds reports, the read-only scenario exporter and an extra narrow-layout assertion; it does not change packaged application source. The published branch tip is reported in the handoff. No merge into main.

## Implemented behavior and cause

**Trash: local reproduction, installed cause unverified.** All three baseline handlers in `extension/app.mjs:manager` used native `window.confirm` and silently returned on false. With confirmation suppressed/false in an isolated Chromium fixture, all 15 activations produced no visible confirmation or draft change. This demonstrates the shared failure path; it does not establish why the owner's installed Chrome suppressed or rejected a prompt.

The manager now shows one keyboard-accessible inline confirmation inside its existing modal. Cancel, including Escape, preserves the complete draft and CURRENT. Remove from draft captures the selected Simple/Narrow presentation ID or exact Depth scope identity; it neither commits nor deletes a cloud object. Save is disabled while confirmation is pending. The existing shared Save commits atomically and reconciles the existing native menu. Its inline progress, revision-conflict and retry feedback remain visible with Debug OFF. Pagination, repeated confirmation, tab switching, duplicate Narrow targets, sole Depth removal and post-commit native failure are covered. The original Default/Quick normalization contract is unchanged.

**Debug:** `src/chrome/debug-preference.mjs` validates a single profile-local `chrome.storage.local.uiDebugMode` boolean. OFF is the default; initial reads and writes are race guarded. It grants no diagnostic, agent, account or cloud authority. Read failures and failed writes leave current-window presentation OFF; an unsaved preference is explained inline. Settings includes a bottom Debug Mode switch and an explicit safe-summary action using existing `getEngineHealth({view:'support'})`.

`extension/app.css` hides the floating `#status` before JavaScript/storage resolves unless Debug is explicitly ON. `status()` never unhides it while OFF; failures/required actions remain discoverable through a concise non-floating footer, existing action-local errors, badge and Save results. ON exposes retained status and safe diagnostics; OFF immediately hides the floating status and Settings Debug details across documents. Deliberately opened existing History/receipt/advanced diagnostics remain available; this preference does not revoke diagnostic grants or remove receipt evidence. Native Depth feedback and provider-attention fallbacks retain evidence/badges and stop technical OS notification chains in both modes. The 320px feedback layout has no horizontal overflow and both footer controls remain reachable by keyboard. No logging database or upload engine was introduced. Pending Remotes History now says Saving rather than falsely saying Not saved.

The old boot browser harness's technical completion waits now inspect attached status text, while actual failure visibility checks use the quiet footer. Its Quick assertion remains unchanged and still fails as on baseline; no assertion was disabled to obtain a green count.

## Preservation proof

No production changes were made to OAuth, Cloudflare provisioning/transport/Worker, CURRENT, configuration schemas, engine, compiler, action resolver or registrar. Eight relevant compiler/config/identity/resolver/registrar hashes are identical, and all 23 scenario outputs are byte-identical to baseline: saved configurations, inventory, composition, coverage, complete rows/IDs, native plans and resolved routes. See [the matrix](LOGIC2REAL_MATRIX.md) and [full raw traces](logic2real-current.json).

Worker code digest remains `UnCTefIZnYXQSDQvjehsP3DXfEm3AXcBVo6iBqVgwto`; this UI repair does not require a Worker upgrade. Extension version remains **0.3.19**, ID `ajppphdiamdobknpamcheohmdbdbeoal`. Tested build source digest: `61cf9d7d9a21b6dcdb267133a221f31ee88fb08192d1db922c1efb81eac7960f`; [build.json](build.json) identifies the tested source commit. Build output: `dist/click2cloud`.

No owner's profile, evidence receipt, configuration, OAuth token, approval or R2 object was modified/reset. All automated additions/removals used disposable fixture state. Earlier unrelated uncommitted work was preserved in a separate checkout and is not in this branch.

**WORKER_SETUP_REQUIRED investigation:** reviewed the established defect, exact-target recovery and readiness source read-only for this task. The published recovery implementation was preserved. No private owner Worker-plan registry or live Cloudflare state was inspected here, and no Worker was created/repaired by this task.

## Executed tests

Linux, Node **24.22.1**, Chromium **156.0.8078.79**. Counts overlap between suites and are not additive unique-test totals.

| Command / gate | Baseline | Final result | Evidence class |
| --- | --- | --- | --- |
| `node scripts/test-manager-trash.mjs` | 15 suppressed-confirm activations, no visible response | **13/13 PASS**, before Debug and again after | Production app/API/CURRENT with real Chromium/IDB; fixture provider/native callbacks |
| `node scripts/test-debug-mode-ui.mjs` | No toggle; synthetic sequence rendered four floating texts | **11/11 PASS**, 1,524 frame/mutation samples, **0 OFF visibility violations** | Production UI/preference/API; injected lifecycle/storage/provider |
| `node --test tests/debug-preference.test.mjs tests/nov07-auth-shelf.test.mjs` | Previous notification policy | **36/36 PASS** | Production preference/feedback/attention modules, controlled Chrome boundaries |
| `npm run test:focused` | **348/348 PASS** | **372/372 PASS** | Current production-module suite |
| `npm test` | **416 PASS / 1 FAIL**, 417 total | **440 PASS / 1 FAIL**, 441 total | Same pre-existing golden-menu mismatch |
| Save regression command below | **78/78 PASS** | **78/78 PASS**, including after Trash-first gate | Production modules + local workerd/R2, fixture public source/management/native callbacks |
| `node --test tests/workings.test.mjs` | PASS | **5/5 PASS** | Current source hashes synchronized; immutable historical digests preserved |
| `node scripts/test-logic2real-current.mjs OUT BASELINE_JSON` | Captured baseline | **85/85 checks**, 23 scenarios, 440 rows, 297 logical save routes | Pure production compiler/resolver + synthetic callback ACK; **one separately reported intent mismatch** |
| Boot browser command below | 9 PASS, 2 historical reproductions, 1 FAIL | Same **9 PASS / 2 REPRODUCED / 1 FAIL** | Production browser modules/IDB with synthetic Chrome/OAuth |
| `npm run build:extension` | Existing build available | **PASS** | Packaged production source, version/extension identity checks |
| `C2C_HEADLESS=1 C2C_SHELF_EVIDENCE_DIR=OUT npm run test:shelf:extension` | Blocked in this runner | **BLOCKED: UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR** | Actual Chromium extension loading attempt; no policy bypass |

Save regression command:

```sh
node --test tests/depth-working-save.test.mjs tests/depth-plan-recovery.test.mjs tests/cloudflare-destination-recovery.test.mjs tests/cloudflare-integration.test.mjs right2cloud-module/tests/*.test.mjs
```

This uses fixture source acquisition and independently verifies local workerd/R2 write/readback through production saving modules and verifies Simple/Narrow controls and exact Depth routes. It is **not live Cloudflare evidence**. The Windows `fileURLToPath` repairs already present in baseline were preserved; no actual Windows runner was available.

Boot harness reproduction (create `/tmp/c2c-silent-boot-baseline` from historical `0222969` first):

```sh
C2C_BOOT_BEFORE_ROOT=/tmp/c2c-silent-boot-baseline C2C_BOOT_EVIDENCE=/tmp/c2c-boot-results node scripts/test-boot-login-browser.mjs
```

The known failure remains `quick:true` expected versus `quick:false` actual in the owner-confirmed rebuild assertion. The full Node suite's failure remains `tests/golden-menu.test.mjs`'s existing golden drift. Both fail on the clean baseline. They are not new Trash/Debug regressions; neither expected fixtures nor Simple/Narrow behavior were changed. An intermediate full run also caught a source-map race while the footer label was being finalized; the final frozen-source run has only the baseline golden failure. The duplicate accessible Save results label caught during boot testing was fixed by naming the new footer action Review save results.

Raw logs: [logs/](logs/). Browser receipts: [Trash gate](trash-first.json), [Trash after Debug](trash-final.json), [Debug](debug-ui-source.json), [boot before](boot-before.json), [boot after](boot-after.json), [actual extension blocker](native-extension.json). Timing and message analysis: [TIMING_BEFORE_AFTER.md](TIMING_BEFORE_AFTER.md), [MESSAGE_AUDIT.md](MESSAGE_AUDIT.md).

## Measured improvement and limits

Before, suppressed confirmation produced no visible response in any mode. After, five trials/mode measured click-to-confirmation p50 **10.2 / 7.9 / 10.5 ms** and p95 **12.4 / 9.0 / 12.7 ms** for Simple/Narrow/Depth. Save progress appears independently of the later commit/ACK. These are local Chromium fixture measurements, not installed Chrome hardware latency.

The synthetic four-message floating sequence becomes zero visible OFF observations. General warm UI timings were already small and remain mixed; no causal whole-app, native-menu, save-dispatch or network speedup is claimed. The single cold fixture startup sample increased **1262.8 → 1456.2 ms**; its host initialization contributes substantially. See the full timing report rather than treating that as real extension-worker startup. No security checks, native registration or target resolution were bypassed to improve a timing.

## Remaining gaps and precise owner verification

**INSTALLED CHROME / LIVE R2 PHYSICAL GATE UNVERIFIED.** The real extension loader is blocked by administrator policy, and this runner has no owner-authenticated Cloudflare/Chrome state. No actual installed Trash click, three native right-click saves, OS notification delivery, Windows restart behavior or live R2 receipt is claimed.

On Windows, preserve all local modifications and existing Chrome state. Fetch/switch to the published branch without resetting anything, then use `npm.cmd ci`, `npm.cmd run test:focused`, and `npm.cmd run build:extension`. Reload the existing extension from its rebuilt `dist/click2cloud` folder; do not uninstall, clear storage or reauthorize just for this repair. Confirm extension ID and the built revision in `describeCapabilities`.

1. In each manager tab, explicitly select a disposable configuration row/scope. Trash must show the inline confirmation; Cancel/Escape leaves it unchanged. Confirm must say Unsaved changes. Close without Save and reopen: the row still exists. Confirm again and Save: exactly that selected ID/scope disappears; reopen Shelf and restart Chrome to check retention. For Narrow use two same-target/same-title presentations and verify the unselected ID survives; for Depth verify another bucket's maxDepth/hidden state stays unchanged. Independently confirm cloud files remain present.
2. With Debug OFF, perform three real eligible right-click saves, including Depth and a slow/not-ready case if one occurs naturally. Observe zero floating box flashes and zero technical notification chains. Use the quiet result/badge to inspect failures or uncertainty; require an independently verified receipt for every claimed success. Check actual R2 account/bucket/prefix/key, byte length and readback against the source, plus surviving Simple/Narrow routes.
3. Settings → Debug Mode ON: retained status and safe-summary details should be inspectable. OFF: the floating box and Settings Debug details hide immediately; open a second Shelf and restart Chrome to verify persistence. No privileged debug operation should become authorized merely by toggling this switch.
4. Independently inspect the actual native menu: deleted presentation/scope absent, surviving hierarchy, Save here semantics and scrolling preserved. Native ACK alone does not establish this physical behavior.

Remaining known source/intent discrepancy: unlabeled Narrow `valentiens/2D/` compiles as Cloudflare → 2D instead of the newly specified Cloudflare → valentiens → 2D. Correct physical target is retained; no menu redesign was authorized here. See the matrix for severity and counterexample. Keep both independent CI failures above visible; rerun their exact commands after any separately authorized correction.
