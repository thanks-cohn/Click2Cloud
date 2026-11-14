# Click2Cloud — exhaustive launch-readiness test checklist

**Date:** November 13, 2026  
**Baseline milestone:** `milestone/a-sure-winner-base-0.1` → `0d50ab82c10555ae49d617b90be588057a1fa6b6`  
**Status:** proposed TEST PLAN, not evidence that cases have passed. No code changes authorized by this document.  
**Target:** actual Chrome extension on Windows + live authorized Cloudflare R2, backed by independent remote readbacks and reusable safe fixtures.

## How to use this document

- **Result:** mark the checkbox only after PASS. Otherwise record **FAIL, BLOCKED, NOT RUN, or N/A** in your execution log. An unchecked line is not a failure by itself.
- **P0** = must pass before public release; **P1** = important beta/launch quality; **P2** = additional compatibility coverage.
- **LIVE** = actually installed Windows Chrome and authorized real service; **MIXED** = live and/or fixture, with evidence class recorded; **ISOLATED** = disposable Chrome profile/local fixture only. A synthetic Chrome ACK is never proof of an actual menu or remote upload.
- **Every PASS** must log build SHA, installed extension ID, exact steps, actual/expected, timestamp, sanitized operation ID, route, and independent verification where relevant.
- **Do not test destructive faults on the existing Chrome profile or important Cloudflare buckets.** Use a dedicated test profile, separate lab R2 prefix and synthetic fault-injection harness. Never clear the owner’s real Chrome storage, erase OAuth, delete cloud files, or reset production history just to test recovery.
- **Controlled crashes** mean service-worker termination, browser test-process termination, or fixture-injected exceptions **in a disposable test environment**. Don’t induce operating-system or hardware faults.
- Some historical architecture directions are **proposed, not yet implemented** (e.g., external diagnostics and long-lived queue). For unimplemented items, record **BLOCKED / NOT IMPLEMENTED** rather than inventing success.
- For any unavailable second account/provider, mark **N/A** with justification; do not claim cross-account/provider verification without real support.

## Release-blocking stop rules

**Stop release** if any reproducible P0 case causes wrong bucket/prefix, lost configuration, corrupted/short bytes marked successful, unexpected duplicate cloud write, wrong-account access, secret exposure, unapproved cloud-resource change, or a right-click action that stops working after a normal restart without a safe recovery path.

**Known issues to resolve/disposition:** On the owner’s Windows run, 370/372 focused tests passed; failures were a stale `extension/app.css` workings-map hash and a File API workerd/R2 operation returning `uncertain` rather than `completed`. Historical golden-menu and Narrow `valentiens/2D` label gaps also remain documented. Do not turn these into green claims without evidence.

## Suggested repeated boot/crash cadence

1. **Before campaign:** one clean cold Chrome boot, menu check, headless save, UI startup, and cloud readback.
2. **Every 100 verified saves:** close/reopen Shelf and confirm configuration, menu and History.
3. **Every 250 verified saves:** close and restart Chrome, then perform immediate cold-worker right-click test.
4. **At 500, 1,000, 1,500 and 2,000 saves:** repeat the full boot/restart/worker termination smoke suite in a disposable test profile.
5. **At least once per campaign:** normal Windows restart; at least one test after extended sleep/hibernation.
6. **Crash campaign:** use fault injection before source fetch, during streaming, after R2 commit/before receipt, after verified receipt/before History, during menu reconciliation, and during configuration commit. Record expected recovery state individually.
7. **Before release sign-off:** perform a final fresh boot, worker restart, crash isolation and independent R2 readback without developer-only tools propping up the extension.

## Per-test evidence log template

```text
Test ID:             Result: PASS / FAIL / BLOCKED / NOT RUN / N/A
Build SHA / Version: Chrome / Windows / Profile:
Start and end time:  Warm or cold? Debug mode:
Expected:            Actual:
Operation ID:        Config revision / native generation:
Expected route:      Observed account / bucket / prefix / key:
Source bytes/hash:   Remote bytes/hash/readback:
Screenshot/log:      Evidence class: LIVE / ISOLATED / FIXTURE
Issue link / next action:
```

---

## 1. Safety, baseline, and evidence

- [ ] **P01 · P0 · LIVE** — Record the exact Git commit, build source digest, extension version, extension ID, Chrome version, Windows build, active Chrome profile, and test date. **PASS when:** Every result can be traced to precisely the installed build; never infer installed revision from the repo checkout alone.
- [ ] **P02 · P0 · LIVE** — Verify Chrome is loading the correct freshly built `dist/click2cloud` directory rather than an old unpacked folder. **PASS when:** The installed extension has the intended manifest/ID and newest files.
- [ ] **P03 · P0 · LIVE** — Make a verified, locally retained copy of configuration/recovery evidence using an existing supported backup path before fault tests. **PASS when:** Backup readback works; secrets and identifiers are not pasted into public reports.
- [ ] **P04 · P0 · LIVE** — Define a disposable Cloudflare test prefix and never use owner production keys or the existing `valentiens/2D` data for destructive tests. **PASS when:** Write/delete tests cannot affect important files or buckets.
- [ ] **P05 · P0 · LIVE** — Start from a known valid configuration with saved Simple, Narrow, Depth, hidden/default/Quick choices and record expected menu routes. **PASS when:** Before/after comparison is possible without resetting the owner's real profile.
- [ ] **P06 · P0 · MIXED** — Capture one right-click save and independent cloud readback as the control example. **PASS when:** Correct exact account, bucket, prefix, object key, size, and bytes verified.
- [ ] **P07 · P0 · MIXED** — Prove tests never treat synthetic Chrome callbacks, local workerd or fixture OAuth as real Chrome/provider acceptance. **PASS when:** Each report labels LIVE, FIXTURE, and BLOCKED accurately.
- [ ] **P08 · P0 · LIVE** — Confirm Debug Mode is OFF before the quiet-default tests. **PASS when:** The global floating status box is absent, including during initial boot.
- [ ] **P09 · P0 · LIVE** — Record all preexisting failing tests and intent gaps separately before attributing new regressions. **PASS when:** Known Windows workings-map hash failure, uncertain File API test, historical golden-menu mismatch, and Narrow label discrepancy are not concealed.
- [ ] **P10 · P0 · ISOLATED** — Create a dedicated Chrome test profile for restart/crash and fault-injection scenarios; keep owner profile intact. **PASS when:** Chrome profiles and extension state are unambiguously separated.
- [ ] **P11 · P1 · LIVE** — Create a log for each case: result, timestamp, build, test data, expected vs actual, operation ID, sanitized screenshot/trace, and cloud receipt. **PASS when:** Every PASS is reproducible, and each FAIL becomes an actionable bug.
- [ ] **P12 · P1 · LIVE** — Repeat core scenarios with Debug ON, then OFF, and compare same saving results. **PASS when:** Debug preferences alter presentation only, not transfer or auth truth.

## 2. Boot, startup, shutdown, and restart — repeat across the campaign

- [ ] **B01 · P0 · LIVE** — Cold-boot Chrome after a normal Windows startup with Click2Cloud installed but Shelf closed. **PASS when:** Previously saved right-click menu is available and resolves to persisted targets.
- [ ] **B02 · P0 · LIVE** — Cold-boot Chrome with the Shelf opened immediately. **PASS when:** Remotes/controls render without data loss or a frozen startup.
- [ ] **B03 · P0 · LIVE** — Cold-boot Chrome and right-click-save before ever opening the Shelf. **PASS when:** Saving does not require the Shelf to be manually opened.
- [ ] **B04 · P0 · LIVE** — Close all Chrome windows normally, reopen, and right-click-save again. **PASS when:** Menu and session state recover, no re-registration divergence or duplicate write.
- [ ] **B05 · P0 · LIVE** — Reload the unpacked extension at `chrome://extensions` and immediately right-click-save. **PASS when:** Menu and exact destination return without a manual configuration rebuild.
- [ ] **B06 · P0 · LIVE** — Open two Shelf instances, close one, then navigate/save from the other. **PASS when:** No conflicting UI ownership, deleted entries, or lost pending save.
- [ ] **B07 · P0 · LIVE** — Restart Chrome after changing a Simple destination and clicking Save. **PASS when:** The exact edited route persists and native menu matches it.
- [ ] **B08 · P0 · LIVE** — Restart Chrome after changing a Narrow presentation and clicking Save. **PASS when:** The presentation ID, title, ancestor structure and target persist.
- [ ] **B09 · P0 · LIVE** — Restart Chrome after changing a Depth bucket depth/visibility and clicking Save. **PASS when:** Depth setting and actual menu depth survive the restart.
- [ ] **B10 · P0 · LIVE** — Close the Shelf midway through an upload while leaving Chrome running. **PASS when:** Upload completion/uncertainty is recorded; closing the UI does not falsely cancel it.
- [ ] **B11 · P0 · LIVE** — Reopen Shelf after a completed upload without refreshing Chrome. **PASS when:** History/receipt displays true persisted outcome, not a second upload.
- [ ] **B12 · P0 · LIVE** — Restart Chrome with Debug Mode OFF, inspect during the first frame of Shelf startup. **PASS when:** No transient floating status box appears.
- [ ] **B13 · P0 · LIVE** — Restart Chrome with Debug Mode ON and verify selected preference and safe diagnostic state. **PASS when:** Preference persists without granting privileged debug authorization.
- [ ] **B14 · P0 · LIVE** — Boot with network disconnected and previously saved menu/configuration. **PASS when:** Local UI remains honest, destinations are preserved; no invented successful save.
- [ ] **B15 · P0 · LIVE** — Boot after an expired Cloudflare authorization without manually resetting credentials. **PASS when:** UI identifies reconnect requirement and preserves all configured targets.
- [ ] **B16 · P0 · LIVE** — Boot while one recovery source/backup path is unavailable. **PASS when:** Unrelated Remotes and healthy operations remain usable; no silent reset.
- [ ] **B17 · P0 · LIVE** — Close and reopen Chrome ten times over at least two test sessions. **PASS when:** No drift in destination count, generation, menu order, Default or Quick.
- [ ] **B18 · P1 · LIVE** — Boot after Windows sleep/hibernate/resume, then save immediately. **PASS when:** No stale service-worker/menu assumptions or incorrect daily-state carryover.
- [ ] **B19 · P1 · LIVE** — Restart Windows normally with Chrome closed and launch the same Chrome profile. **PASS when:** Menus, config, auth expectations and verified history persist where designed.
- [ ] **B20 · P1 · LIVE** — Launch Chrome after a browser update or security patch. **PASS when:** Extension still loads, menus remain registered, and no new permission surprise occurs.

## 3. Crashes, worker termination, fault isolation, and recovery

- [ ] **C01 · P0 · ISOLATED** — Close the Shelf while right-click saves are being dispatched, then reopen it. **PASS when:** Independent save engine continues or reports real uncertainty; no UI-induced duplicate.
- [ ] **C02 · P0 · ISOLATED** — Inject a controlled Shelf render exception in a disposable fixture while the worker and menu are healthy. **PASS when:** Previously registered right-click saving remains usable; user can recover UI.
- [ ] **C03 · P0 · ISOLATED** — Force a controlled Shelf boot failure before the first view mounts. **PASS when:** Context-menu path remains independent when browser/worker is healthy, or clearly reports blocker.
- [ ] **C04 · P0 · ISOLATED** — Terminate/restart the extension service worker while it is idle; inspect menu afterward. **PASS when:** Previously saved configuration reconciles to exact native menu; no empty generation.
- [ ] **C05 · P0 · ISOLATED** — Terminate/restart worker after selecting menu item but before dispatch (controlled test hook). **PASS when:** Intent is not silently lost or falsely counted; if unrecoverable, user can inspect truthful state.
- [ ] **C06 · P0 · ISOLATED** — Terminate worker after durable operation reservation but before source acquisition. **PASS when:** Recovery does not create a duplicate operation or invent a remote receipt.
- [ ] **C07 · P0 · ISOLATED** — Terminate worker during source fetching/streaming in disposable test context. **PASS when:** Incomplete result remains pending/uncertain/failed as appropriate; no truncated verified file.
- [ ] **C08 · P0 · ISOLATED** — Terminate worker after remote commit but before response/receipt processing. **PASS when:** Read-only receipt inspection resolves ambiguous outcome, without unsafe automatic replay.
- [ ] **C09 · P0 · ISOLATED** — Terminate worker after verified save but before writing local History. **PASS when:** Remote success remains honest, History recovery is safe, and no second upload occurs.
- [ ] **C10 · P0 · ISOLATED** — Terminate worker during native menu re-registration after `removeAll` has begun. **PASS when:** No stale ACK claims; next permitted reconciliation restores complete intended menu.
- [ ] **C11 · P0 · ISOLATED** — Kill only a disposable Shelf browser tab while manager confirmation is open. **PASS when:** No configuration deletion until shared Save commits; opening manager restores saved state.
- [ ] **C12 · P0 · ISOLATED** — Crash/terminate a disposable Chrome test process with an in-flight save; relaunch it. **PASS when:** No data loss/corruption and no false completion; uncertain operation is inspectable.
- [ ] **C13 · P0 · ISOLATED** — Crash/terminate a disposable browser process after config CURRENT commit but before native ACK. **PASS when:** Persisted config wins, native menus reconcile on launch, no phantom deletions.
- [ ] **C14 · P0 · ISOLATED** — Simulate a storage write exception during config Save. **PASS when:** Old verified CURRENT remains intact; UI reports not-saved/needs retry.
- [ ] **C15 · P0 · ISOLATED** — Simulate a storage read failure at startup. **PASS when:** App does not interpret established user state as a fresh empty install and recreate `redown`.
- [ ] **C16 · P0 · ISOLATED** — Simulate missing CURRENT records with an existing nonzero native registration (past known incident). **PASS when:** Recovery protection blocks destructive fallback, preserves evidence and prompts safe recovery.
- [ ] **C17 · P0 · ISOLATED** — Simulate corrupted CURRENT/journal record and inspect valid historical checkpoint recovery. **PASS when:** Only verified backup restores after explicit user action; unauthorized writes are blocked.
- [ ] **C18 · P0 · ISOLATED** — Simulate an unavailable cloud Worker while Shelf fails independently. **PASS when:** Neither failure overwrites configuration; healthy local UI and unrelated operations survive.
- [ ] **C19 · P0 · ISOLATED** — Simulate two rapid browser/worker starts racing to perform native menu maintenance. **PASS when:** One consistent generation is registered; callbacks cannot interleave into mixed menus.
- [ ] **C20 · P0 · ISOLATED** — Simulate repeated failed menu create callbacks/timeouts followed by healthy restart. **PASS when:** No green acknowledgment without actual ACK; eventual reconciliation is idempotent.
- [ ] **C21 · P1 · ISOLATED** — Recover after exception thrown inside optional diagnostics event sink. **PASS when:** Save business result and native registration remain unchanged.
- [ ] **C22 · P1 · ISOLATED** — Recover after an unusable external backup location or full test disk. **PASS when:** No corruption of primary CURRENT or verified file contents; backup failure is disclosed.
- [ ] **C23 · P1 · ISOLATED** — Repeat controlled crash at first byte, midpoint, final byte, and immediately after verified receipt. **PASS when:** Every crash phase has coherent, distinct outcome and no duplicate save.
- [ ] **C24 · P1 · ISOLATED** — Repeat cold boot and worker termination 25 times using fixture automation. **PASS when:** No accumulating listeners, menu-generation drift, stale callbacks, or memory growth.

## 4. Native right-click menu: visibility, correctness, responsiveness

- [ ] **M01 · P0 · LIVE** — Right-click a valid web image with one Simple target. **PASS when:** Correct native item appears promptly and saves to exact target.
- [ ] **M02 · P0 · LIVE** — Right-click a valid web link with one Narrow target. **PASS when:** Intended ancestor/leaf hierarchy appears and correct target receives bytes.
- [ ] **M03 · P0 · LIVE** — Right-click with only a Depth bucket enabled and actual child folders present. **PASS when:** Depth children branch correctly and parent Save here routes correctly.
- [ ] **M04 · P0 · LIVE** — Right-click with a root-only Depth bucket and no descendants. **PASS when:** Flat/compact root remains actionable without fabricated children.
- [ ] **M05 · P0 · LIVE** — Right-click with multiple Depth buckets, each with different configured maximum depths. **PASS when:** Every bucket preserves independent subtree and action targets.
- [ ] **M06 · P0 · LIVE** — Right-click with Simple, Narrow and Depth enabled simultaneously. **PASS when:** No route silently disappears, duplicates improperly merge, or hijacks an exact target.
- [ ] **M07 · P0 · LIVE** — Toggle each mode hidden, then visible, without deleting its configurations. **PASS when:** Menu presentation changes and returns; stored config is unchanged.
- [ ] **M08 · P0 · LIVE** — Change Default destination to another test prefix and inspect right-click menu. **PASS when:** Default resolves new exact location with no stale prior target.
- [ ] **M09 · P0 · LIVE** — Select Quick on a test destination and verify menu precedence/visibility. **PASS when:** Quick projects according to stored rule without overwriting other target state.
- [ ] **M10 · P0 · LIVE** — Remove only selected Narrow presentation sharing same physical target with another. **PASS when:** Survivor remains in native menu and still saves to same physical target.
- [ ] **M11 · P0 · LIVE** — Save menu edits, inspect native menu immediately, and check after fresh Chrome restart. **PASS when:** Desired plan, Chrome ACK and physically visible hierarchy converge.
- [ ] **M12 · P0 · LIVE** — Right-click immediately after opening Chrome with extension worker cold. **PASS when:** First gesture is handled with truthful readiness and no stale route dispatch.
- [ ] **M13 · P0 · LIVE** — Right-click while changing destinations in another Shelf window. **PASS when:** Never route a stale click to a newly assigned different bucket or prefix.
- [ ] **M14 · P0 · LIVE** — Right-click on page, image, link, text selection, and browser-supported media. **PASS when:** Only appropriate context actions appear; no invalid source acquisition.
- [ ] **M15 · P0 · LIVE** — Inspect long menus with 20+ siblings and deep ancestry on Windows. **PASS when:** All intended items remain accessible; no lost rows or accidental focus traps.
- [ ] **M16 · P1 · LIVE** — Measure right-click gesture to visible menu on cold/warm browser, large/small tree. **PASS when:** Record median/p95 and source of delay; preserve fast UI without sacrificing correctness.
- [ ] **M17 · P1 · LIVE** — Press Escape while menu is open, then immediately open it again. **PASS when:** No pending save or changed selection from dismissed context menu.
- [ ] **M18 · P1 · LIVE** — Open multiple context menus in rapid succession on different pages/tabs. **PASS when:** No wrong-source capture, duplicate save, or selection leakage.
- [ ] **M19 · P1 · LIVE** — Check `valentiens/2D` Narrow unlabeled hierarchy against desired `Cloudflare > valentiens > 2D`. **PASS when:** Record current known presentation gap; do not mark it PASS merely because physical target is correct.
- [ ] **M20 · P1 · LIVE** — Compare selected menu action ID against generated spec, ACK, and actual R2 destination. **PASS when:** logic2real report explains any mismatch among intent, code, native plan and real outcome.

## 5. Destinations Manager, Trash, Save, Default and Quick

- [ ] **D01 · P0 · LIVE** — Simple: click Trash on a disposable row and choose Cancel. **PASS when:** Row and CURRENT remain unchanged; no cloud deletion.
- [ ] **D02 · P0 · LIVE** — Narrow: click Trash on a disposable row and choose Cancel or Escape. **PASS when:** Exact presentation remains unchanged, including duplicate-label peers.
- [ ] **D03 · P0 · LIVE** — Depth: click Trash on a disposable bucket scope and choose Cancel. **PASS when:** Scope and other bucket settings remain unchanged.
- [ ] **D04 · P0 · LIVE** — Simple: confirm Trash but close manager before pressing Save. **PASS when:** Removal is staged only; opening manager again shows original persisted entry.
- [ ] **D05 · P0 · LIVE** — Narrow: confirm Trash then Save with two same-title presentations. **PASS when:** Exactly selected stable ID disappears and the other one remains.
- [ ] **D06 · P0 · LIVE** — Depth: confirm Trash then Save while another bucket scope exists. **PASS when:** Exactly selected scope disappears; unrelated maxDepth and hidden flag survive.
- [ ] **D07 · P0 · LIVE** — Trash last Simple destination, commit, and restart. **PASS when:** No unintended deletion of Narrow/Depth or surprise R2 resource mutation.
- [ ] **D08 · P0 · LIVE** — Trash last Depth bucket scope, commit, and restart. **PASS when:** No phantom Depth item and no effect on other mode configurations.
- [ ] **D09 · P0 · LIVE** — Rapidly click Trash twice on the same row. **PASS when:** One confirmation and at most one staged removal; no duplicate listeners.
- [ ] **D10 · P0 · LIVE** — Attempt Save while deletion confirmation is pending. **PASS when:** Save is disabled/guarded; no half-confirmed deletion is persisted.
- [ ] **D11 · P0 · LIVE** — Edit menu title and Save, then restart Chrome. **PASS when:** Custom label persists and saved physical target never changes.
- [ ] **D12 · P0 · LIVE** — Hide and unhide an entry; confirm physical files and stored config remain untouched. **PASS when:** Visibility affects menu projection only, not cloud content.
- [ ] **D13 · P0 · LIVE** — Switch Simple/Narrow/Depth tabs with unsaved staged changes. **PASS when:** No accidental cross-mode commit or silent loss of user intent.
- [ ] **D14 · P0 · LIVE** — Two Shelf windows stage conflicting changes; save the first then second. **PASS when:** Second receives revision-conflict/retry path, not silent overwrite.
- [ ] **D15 · P0 · LIVE** — Native menu update fails after config Save committed. **PASS when:** UI distinguishes durable saved config from pending/failed Chrome ACK; retry recovers.
- [ ] **D16 · P1 · LIVE** — Page through more than 20 destinations and Trash an entry on later page. **PASS when:** Correct global row identity removed, paging/scroll/focus stay stable.
- [ ] **D17 · P1 · LIVE** — Try Unicode, punctuation and identical labels for destination presentation. **PASS when:** UI escapes safely and preserves exact physical path and edit ID.
- [ ] **D18 · P1 · LIVE** — Try Default in three same-target Narrow entries with different IDs. **PASS when:** Observe and document physical-target-wide Default semantics without deleting any peer.
- [ ] **D19 · P1 · LIVE** — Change Depth depth from 1 to 10 to 5 and compare actual folder hierarchy. **PASS when:** Bounded recursion matches configured maximum without altering R2 contents.
- [ ] **D20 · P1 · LIVE** — Verify a single actual `Save here` entry for every actionable folder ancestor. **PASS when:** Parent saves work; no accidental send to first child.

## 6. Real save sources, filenames, object identity and bytes

- [ ] **S01 · P0 · LIVE** — Save a small PNG image and read it back independently from the intended R2 prefix. **PASS when:** Exact bytes, content type, key and size match the source.
- [ ] **S02 · P0 · LIVE** — Save a JPEG image, including a real-world image URL with safe query parameters. **PASS when:** No unintended URL/filename disclosure; exact bytes verify.
- [ ] **S03 · P0 · LIVE** — Save a web link to a valid supported public source. **PASS when:** Final result is verified; no fake success on unsupported source.
- [ ] **S04 · P0 · LIVE** — Save a file or image with spaces, parentheses, Unicode and punctuation in title. **PASS when:** Canonical filename/path behavior is safe and deterministic.
- [ ] **S05 · P0 · LIVE** — Save two different files with the same filename to same destination. **PASS when:** Documented collision rule (keep-both or replacement where selected) is followed, neither silent overwrite nor false success.
- [ ] **S06 · P0 · LIVE** — Save same URL twice deliberately as separate user operations. **PASS when:** Two legitimate user intents obey documented duplicate/collision policy; no unintended auto-replay.
- [ ] **S07 · P0 · LIVE** — Save a resource through a public redirect chain. **PASS when:** Allowed redirects remain within safety policy and final byte verification succeeds.
- [ ] **S08 · P0 · LIVE** — Save a source with wrong or missing Content-Length metadata. **PASS when:** Streaming/verification correctly detects actual bytes and rejects truncation.
- [ ] **S09 · P0 · LIVE** — Save 0-byte object where supported and verify remote bytes. **PASS when:** Verified empty file isn't mistaken for failed transfer or missing object.
- [ ] **S10 · P0 · LIVE** — Save a moderate file larger than the normal quick test payload. **PASS when:** No browser memory spike, truncation, or missing remote receipt.
- [ ] **S11 · P0 · LIVE** — Save a large file exceeding 32 MiB when supported and authorized. **PASS when:** Streamed upload preserves exact bytes with bounded memory, honest completion.
- [ ] **S12 · P0 · LIVE** — Save to nested `bucket/folder/subfolder` in Depth and separately Narrow. **PASS when:** Both actions preserve selected exact prefix; no fallback to root or Default.
- [ ] **S13 · P0 · LIVE** — Save to two similarly named buckets under separate test accounts (if available). **PASS when:** Account and connection binding prevent cross-account misrouting.
- [ ] **S14 · P0 · LIVE** — Capture source while navigating another Chrome tab before save completes. **PASS when:** Original source URL/bytes and selected destination are immutable.
- [ ] **S15 · P1 · LIVE** — Save media link, audio/video source or selection when supported by the menu. **PASS when:** Only supported context is offered; unsupported sources fail truthfully without corrupt content.
- [ ] **S16 · P1 · LIVE** — Save data with HTML-sensitive filename characters and inspect menu/receipt/UI. **PASS when:** No injection into HTML, logging or destination path.
- [ ] **S17 · P1 · LIVE** — Save with same physical target exposed through Simple and Narrow presentations. **PASS when:** Each chosen action resolves target correctly and accounting doesn't count internal callbacks twice.
- [ ] **S18 · P1 · LIVE** — Attempt unsupported, inaccessible or 404 source. **PASS when:** No verified success and no incorrectly committed final object.

## 7. Data integrity, deduplication, durable receipts, and idempotency

- [ ] **I01 · P0 · MIXED** — For each reported success independently compare cloud account, bucket, prefix, key, byte length and SHA-256 or equivalent content hash. **PASS when:** Exact target and complete bytes match original source; no reliance on badge alone.
- [ ] **I02 · P0 · MIXED** — Re-deliver a callback with the same operation/delivery identity in a fixture. **PASS when:** Exactly one logical completion; no extra remote write or increment.
- [ ] **I03 · P0 · MIXED** — Drop reply after a confirmed R2 PUT in a controlled proxy/fixture. **PASS when:** Outcome stays uncertain until read-only reconciliation proves result; no automatic duplicate PUT.
- [ ] **I04 · P0 · MIXED** — Simulate a partial remote stream that closes early. **PASS when:** No truncated object is considered verified successful.
- [ ] **I05 · P0 · MIXED** — Simulate remote HEAD success with mismatched final size or key. **PASS when:** Save is not marked completed for wrong object or wrong byte count.
- [ ] **I06 · P0 · MIXED** — Simulate successful upload but local history write failing. **PASS when:** Verified cloud outcome remains distinct from missing local record and supports safe recovery.
- [ ] **I07 · P0 · MIXED** — Simulate local history success but remote delivery unconfirmed. **PASS when:** History may record attempt, but cannot claim verified completion.
- [ ] **I08 · P0 · MIXED** — Simulate two simultaneous clicks for the same exact source and destination. **PASS when:** Independent user intents vs duplicated callbacks are distinguished explicitly.
- [ ] **I09 · P0 · MIXED** — Force a slow remote readback confirmation. **PASS when:** Progress stays pending; green/success waits for actual final proof.
- [ ] **I10 · P0 · MIXED** — Simulate provider replying 200/OK with malformed success payload. **PASS when:** No final completed outcome without the required actual verifier.
- [ ] **I11 · P0 · MIXED** — Simulate stale generation action ID after menu changed. **PASS when:** Never reroute to a newly mapped target; block with truthful recovery.
- [ ] **I12 · P0 · MIXED** — Compare persisted operation receipt with Cloudflare's object after restart. **PASS when:** No lost state, stale receipt, or false key association.
- [ ] **I13 · P1 · MIXED** — Run mixed retries after offline/online toggling. **PASS when:** Only explicitly safe retry paths repeat; ambiguous writes require inspection.
- [ ] **I14 · P1 · MIXED** — Run multi-file browser actions in parallel where supported. **PASS when:** Each object has independent ID/receipt with no cross-file correlation.
- [ ] **I15 · P1 · MIXED** — Use objects of known identical size but different bytes. **PASS when:** Hash/readback distinguishes mismatched data even when size matches.

## 8. OAuth, authorization, accounts, and session lifecycle

- [ ] **A01 · P0 · LIVE** — Connect a supported Cloudflare account from signed-out state. **PASS when:** Actual verified account identity and expected scopes are established.
- [ ] **A02 · P0 · LIVE** — Restart Chrome with valid existing login; save again. **PASS when:** No unnecessary login or setup prompt solely due to browser restart.
- [ ] **A03 · P0 · LIVE** — Let token expire (or use controlled auth fixture), then attempt save. **PASS when:** No unsafe save or fabricated success; reconnect action is clear.
- [ ] **A04 · P0 · LIVE** — Complete normal reauthentication and use old saved targets. **PASS when:** Destinations, Default/Quick, and per-bucket Depth remain unchanged.
- [ ] **A05 · P0 · MIXED** — Reject/cancel OAuth consent mid-flow. **PASS when:** No stale connected status, lost settings, or partial account authorization.
- [ ] **A06 · P0 · MIXED** — Simulate wrong-account token or selected target from another account. **PASS when:** Authorization blocks cross-account access before network mutation.
- [ ] **A07 · P0 · MIXED** — Simulate revoked scope, missing Worker permission and read-only permission separately. **PASS when:** Distinct, actionable errors without unapproved provisioning.
- [ ] **A08 · P0 · MIXED** — Simulate token-refresh transient outage then later recovery. **PASS when:** Valid session isn't permanently destroyed by a temporary network fault.
- [ ] **A09 · P0 · LIVE** — Disconnect the Cloudflare session through the intended UI, then reconnect. **PASS when:** Saved destination metadata remains per policy; no object deletion.
- [ ] **A10 · P0 · MIXED** — Simulate simultaneous token refresh requests from multiple saves. **PASS when:** Refresh is coalesced and writes don't race against expired authorization.
- [ ] **A11 · P1 · MIXED** — Use two authorized accounts and change active selection during another save. **PASS when:** Every save retains the original selected authorized account and exact target.
- [ ] **A12 · P1 · LIVE** — Verify extension-specific OAuth redirect and installed extension ID in actual Chrome. **PASS when:** No REDOWN identity/token substitution or redirect mismatch.
- [ ] **A13 · P1 · MIXED** — Check failed/aborted reauthorization does not replay an old clicked source. **PASS when:** No surprising late upload after reconnect without user-authorized continuation.

## 9. Cloudflare Worker/R2 readiness, setup and account-level recovery

- [ ] **W01 · P0 · LIVE** — Use an already prepared approved bucket; restart extension and save. **PASS when:** Existing Worker/approval is reused; no unnecessary setup or redeploy.
- [ ] **W02 · P0 · MIXED** — Simulate missing Worker on a chosen Depth bucket. **PASS when:** Reports setup/repair required for that exact bucket, not a generic fallback.
- [ ] **W03 · P0 · MIXED** — Simulate Worker ready for bucket A, not B; attempt B action. **PASS when:** A's readiness cannot authorize B; B remains contextual and protected.
- [ ] **W04 · P0 · MIXED** — Simulate stale Worker digest/capability for selected target. **PASS when:** No false READY, no send to incompatible endpoint, no silent migration.
- [ ] **W05 · P0 · MIXED** — Simulate Worker/R2 403, 404, timeout and service outage independently. **PASS when:** Different cause codes and safe next actions; no implicit expensive provisioning.
- [ ] **W06 · P0 · MIXED** — Simulate missing signed secret or owned Worker repair requirement. **PASS when:** Explicit account-scoped authorization/consent before modifying infrastructure.
- [ ] **W07 · P0 · MIXED** — Simulate Worker replying after local timeout but remote write committed. **PASS when:** Receipt reconciliation prevents duplicate content and false failure.
- [ ] **W08 · P0 · LIVE** — Verify one live save via readback, then compare `Save here` parent and child prefixes. **PASS when:** Worker validates exact R2 target scope and final keys.
- [ ] **W09 · P1 · MIXED** — Set two Depth scopes in one account with different readiness conditions. **PASS when:** Recovery of one cannot mark the other READY without independent proof.
- [ ] **W10 · P1 · MIXED** — Simulate partial R2 listing for deep discovered folders. **PASS when:** Depth doesn't treat partial inventory as an empty bucket.
- [ ] **W11 · P1 · LIVE** — Exercise read-only bucket/folder discovery with many paginated results. **PASS when:** Every reachable page is handled without arbitrary 1,000-bucket assumption.
- [ ] **W12 · P1 · MIXED** — Simulate an interrupted setup and explicit resume. **PASS when:** Existing owned resources are inspected/reused, not duplicated.

## 10. Networks, slow connections, offline, proxy and capacity

- [ ] **N01 · P0 · LIVE** — Disconnect network before opening Shelf, then inspect already registered right-click menu. **PASS when:** Menu remains locally coherent even though remote saving cannot complete.
- [ ] **N02 · P0 · LIVE** — Attempt save while offline. **PASS when:** Outcome blocked/pending as designed, never confirmed; intent isn't silently replayed unsafely.
- [ ] **N03 · P0 · ISOLATED** — Drop connectivity during source download in a disposable test profile. **PASS when:** No short object marked complete and no unsolicited duplicate when network returns.
- [ ] **N04 · P0 · ISOLATED** — Drop connectivity during remote upload and restore it. **PASS when:** Ambiguous outcome remains inspectable, retry is idempotent/explicit as appropriate.
- [ ] **N05 · P0 · MIXED** — Simulate DNS failure or connection reset to Cloudflare. **PASS when:** Typed safe error and recovery; no raw secrets in message.
- [ ] **N06 · P0 · MIXED** — Simulate 429/rate limiting for listing and upload separately. **PASS when:** No retry storm; user receives honest pending/failed status.
- [ ] **N07 · P0 · MIXED** — Simulate 5xx and late Worker response for an exact destination. **PASS when:** No claim of completed without receipt; next legitimate save remains possible.
- [ ] **N08 · P1 · LIVE** — Compare wired/Wi-Fi and intentionally throttled network cases. **PASS when:** First UI feedback stays responsive while network stage latency is measured separately.
- [ ] **N09 · P1 · MIXED** — Fire many simultaneous save requests with limited provider concurrency. **PASS when:** Memory/CPU remain bounded; each operation has unique outcome.
- [ ] **N10 · P1 · MIXED** — Simulate stalled streaming response and timeout. **PASS when:** Operation terminates or explicitly remains pending; browser UI does not freeze.
- [ ] **N11 · P1 · MIXED** — Simulate storage quota on local evidence and backup writing. **PASS when:** Real remote outcome remains correct; local history failure is surfaced appropriately.
- [ ] **N12 · P1 · LIVE** — Run sustained saving after an extended idle period or device sleep. **PASS when:** Worker wake and token freshness are handled without extra manual intervention where possible.

## 11. Persistence, backups, migrations, restoration and updates

- [ ] **R01 · P0 · LIVE** — Reload Shelf after many edits and verified saves. **PASS when:** Correct CURRENT configuration and History remain.
- [ ] **R02 · P0 · LIVE** — Reload extension after many edits and verified saves. **PASS when:** Exact existing configuration, IDs, mode settings and menu registration remain.
- [ ] **R03 · P0 · LIVE** — Restart Chrome after several hundred mixed saves. **PASS when:** No missing destinations, orphaned menu IDs, altered Default or wiped History.
- [ ] **R04 · P0 · LIVE** — Restart Windows normally after a verified checkpoint and compare state. **PASS when:** No data loss or unsolicited new-user initialization.
- [ ] **R05 · P0 · ISOLATED** — Simulate CURRENT absent while old native registration evidence exists. **PASS when:** System blocks destructive fresh-setup fallback; recovery evidence preserved.
- [ ] **R06 · P0 · ISOLATED** — Simulate one missing mode record, one damaged journal, and invalid integrity marker separately. **PASS when:** No silent synthesis/overwrite of existing user configuration.
- [ ] **R07 · P0 · ISOLATED** — Restore from a valid recovery checkpoint in disposable test data only. **PASS when:** Original saved targets, generation and menu hierarchy return after explicit approval.
- [ ] **R08 · P0 · ISOLATED** — Try malformed/tampered/incomplete recovery archive. **PASS when:** Fails safely; original CURRENT survives; no fabricated successful recovery.
- [ ] **R09 · P0 · ISOLATED** — Simulate disk full during CURRENT commit and recovery copy writing. **PASS when:** Old durable data not replaced with incomplete new state.
- [ ] **R10 · P0 · LIVE** — Update unpacked extension in place without uninstalling (same extension ID). **PASS when:** Saved settings/history/OAuth behavior persist; no unexpected permission loss.
- [ ] **R11 · P0 · ISOLATED** — Simulate restart between CURRENT commit and Chrome menu persistence/ACK. **PASS when:** On next boot menu reconciles to CURRENT, not stale last native plan.
- [ ] **R12 · P0 · ISOLATED** — Simulate native menu registration storage newer than CURRENT storage. **PASS when:** Guard detects mismatch; never quietly resets to empty state.
- [ ] **R13 · P1 · ISOLATED** — Test forward migration from an older valid profile fixture to current schema. **PASS when:** Every saved target, ID, hidden flag, depth and approval survives or gets honest migration report.
- [ ] **R14 · P1 · ISOLATED** — Downgrade in disposable profile only to older built artifact, then return to new version. **PASS when:** No undiagnosed destructive schema fallback; unsupported downgrade is declared if blocked.
- [ ] **R15 · P1 · LIVE** — Change recovery schedule/policy and restart. **PASS when:** Week/day policy and independent per-bucket crawl preferences persist correctly.
- [ ] **R16 · P1 · ISOLATED** — Test scheduled backup with source temporarily unavailable. **PASS when:** No blank backup replaces previous verified checkpoint.
- [ ] **R17 · P1 · ISOLATED** — Test multiple concurrent manager edits plus backup checkpoint. **PASS when:** Result is a coherent snapshot with one consistent revision.
- [ ] **R18 · P1 · ISOLATED** — Verify profile deletion/uninstall in separate disposable profile does NOT get mislabeled as recoverable unless external backup exists. **PASS when:** Recovery promise reflects actual stored artifacts and limits.

## 12. Shelf UI, silent Debug Mode, accessibility and usability

- [ ] **U01 · P0 · LIVE** — With Debug OFF, right-click-save three times while Shelf is open. **PASS when:** Zero flashes of global floating status box; normal verified saves are quiet.
- [ ] **U02 · P0 · LIVE** — With Debug OFF, start Shelf cold and immediately inspect status-box space. **PASS when:** The global floating box never flashes before settings load.
- [ ] **U03 · P0 · LIVE** — With Debug OFF, cause a deliberate invalid save from a disposable source. **PASS when:** Real failure is discoverable via nonfloating actionable path without technical notification spam.
- [ ] **U04 · P0 · LIVE** — Turn Debug ON while a previous status exists, inspect safe details, then OFF. **PASS when:** ON reveals diagnostics; OFF hides details immediately without resetting jobs.
- [ ] **U05 · P0 · LIVE** — Turn Debug OFF in one Shelf and observe another open Shelf. **PASS when:** Preference propagates across UI instances without stale visible overlay.
- [ ] **U06 · P0 · LIVE** — Use keyboard alone to reach Trash confirmation, Cancel/Escape, Save, Settings Debug. **PASS when:** Focusable controls and accessible labels work; no trap in modal.
- [ ] **U07 · P0 · LIVE** — Disconnect and reconnect while Shelf is on Explorer or Settings. **PASS when:** No unrelated automatic navigation erases user context unnecessarily.
- [ ] **U08 · P1 · LIVE** — Test a 320 px wide Shelf viewport on Windows scaling 100%, 125%, 150%. **PASS when:** Footer controls and settings remain reachable without horizontal overflow.
- [ ] **U09 · P1 · LIVE** — Test light/dark theme and reduced-motion setting. **PASS when:** Text, focus rings and diagnostic/error notices remain legible and don't depend on motion.
- [ ] **U10 · P1 · LIVE** — Test an empty Explorer, 1 item, 500 items, and large folder with many rows. **PASS when:** UI remains responsive and scroll position stable; no forced full DOM render.
- [ ] **U11 · P1 · LIVE** — Rapidly change Explorer path and switch views during slow listing. **PASS when:** Stale data doesn't overwrite newer path; navigation remains usable.
- [ ] **U12 · P1 · LIVE** — Inspect cancellation and history/receipt details during pending save. **PASS when:** UI clearly distinguishes pending, verified, failed and uncertain.
- [ ] **U13 · P1 · LIVE** — Screen-reader inspect of status/badge, buttons and inline confirmation. **PASS when:** Actions and outcome aren't conveyed by color alone.
- [ ] **U14 · P1 · LIVE** — Open Help/Diagnose in Debug OFF and ON. **PASS when:** Safe summary remains available explicitly without privacy leak or intrusive overlays.

## 13. Security, permissions, privacy and provider boundaries

- [ ] **Q01 · P0 · MIXED** — Attempt unauthorized account/bucket/prefix target in fixture. **PASS when:** Request is rejected before upload; no fallback to Default or unrelated account.
- [ ] **Q02 · P0 · MIXED** — Attempt traversal paths, malicious percent-encoding and reserved names. **PASS when:** Canonical path handling blocks out-of-scope file writes.
- [ ] **Q03 · P0 · MIXED** — Attempt private/loopback/metadata source addresses via URL redirects. **PASS when:** Unsafe network fetches are blocked by existing policy.
- [ ] **Q04 · P0 · MIXED** — Attempt malformed RPC message from untrusted webpage to extension runtime. **PASS when:** Privileged API refuses external sender and never discloses credentials.
- [ ] **Q05 · P0 · MIXED** — Attempt debug-host privileged functions with Debug UI ON but without explicit host grant. **PASS when:** No unintended elevation, exports or remote writes.
- [ ] **Q06 · P0 · MIXED** — Inspect logs, history, support report, native messages and UI for tokens and signed URLs. **PASS when:** Secrets/cookies/auth headers/private query strings aren't exposed.
- [ ] **Q07 · P0 · LIVE** — Inspect Chrome extension's actual permissions and any prompt on update. **PASS when:** Only justified permissions appear; no unexpected broad access.
- [ ] **Q08 · P0 · MIXED** — Simulate revoked permission during source capture or worker readiness. **PASS when:** Operation doesn't proceed with stale authority; truthful error.
- [ ] **Q09 · P1 · MIXED** — Test hostile HTML/JavaScript inside destination labels and remote filenames. **PASS when:** Rendered as inert text; no script execution or cross-profile leakage.
- [ ] **Q10 · P1 · MIXED** — Test read-only API misuse, forged generation ID and replayed one-use confirmation. **PASS when:** All closed schemas and authorization boundaries reject attempts.
- [ ] **Q11 · P1 · LIVE** — Review privacy policy, store disclosures, support export controls and retention statements against actual code. **PASS when:** Release claims reflect real behavior and user consent.
- [ ] **Q12 · P1 · MIXED** — Scan dependencies and review known severity findings without blindly applying breaking upgrades. **PASS when:** Any critical/high exploitable issue is addressed or clearly blocked with rationale.

## 14. Scale, concurrency, long-haul and 2,000-save distribution

- [ ] **L01 · P0 · LIVE** — Run 600 verified Simple saves spread across varied sources and destinations. **PASS when:** All 600 independently verify exact object bytes and have one final outcome each.
- [ ] **L02 · P0 · LIVE** — Run 600 verified Narrow saves across labeled/unlabeled paths and repeated labels. **PASS when:** All 600 resolve exact account/bucket/prefix; no drop or wrong route.
- [ ] **L03 · P0 · LIVE** — Run 600 verified Depth saves across root, branch, parent Save here and deep child paths. **PASS when:** All 600 verify correct prefix and content with Depth recursion intact.
- [ ] **L04 · P0 · LIVE** — Run 200 verified mixed-mode saves interleaved with Shelf reopen, worker restart, Chrome restart, and login refresh. **PASS when:** All 200 verify; no stale action or double commit across boundaries.
- [ ] **L05 · P0 · LIVE** — Keep an independent ledger for all 2,000 operations: ID, source digest, chosen route, actual R2 key, result and elapsed time. **PASS when:** Every claimed success has remote evidence; attempted vs successful is unambiguous.
- [ ] **L06 · P0 · LIVE** — After each group of 100 saves, fully close/reopen Shelf and inspect saved destinations. **PASS when:** No drift, silent reset, memory leak or UI state loss.
- [ ] **L07 · P0 · LIVE** — After groups of 250 and 1,000 saves, restart Chrome and perform first-save latency/reliability check. **PASS when:** Cold boot/menu/headless right-click continue without configuration rebuild.
- [ ] **L08 · P0 · LIVE** — After final save, restart Windows normally and verify a stratified sample of remote objects/receipts. **PASS when:** Stored files and local configuration/history remain consistent; report sample count.
- [ ] **L09 · P1 · LIVE** — Run a burst of 50–100 saves within a short controlled window using test resources. **PASS when:** Concurrency is bounded and outcomes reliable; no transport or badge spam.
- [ ] **L10 · P1 · LIVE** — Run 100 saves after several hours idle or overnight with normal system sleep allowed. **PASS when:** Token/session/worker wake do not create false success or lost operations.
- [ ] **L11 · P1 · LIVE** — Measure cold and warm menu render, click-to-dispatch, click-to-verified-receipt, Shelf first paint at 50th/500th/2000th operation. **PASS when:** Show p50/p95/p99, count, device info and performance trend; never mix network and UI timings.
- [ ] **L12 · P1 · LIVE** — Track total errors, honest uncertainty, manual retries, recovered failures, duplicated receipts, misroutes and data corruption over the campaign. **PASS when:** Report reliability by category, not only a headline success percentage.
- [ ] **L13 · P1 · LIVE** — Run provider permissions/reconnect check after last 2,000th save. **PASS when:** No unauthorized background setup or altered account targets.
- [ ] **L14 · P1 · LIVE** — Leave Chrome running for 24–72 hours of ordinary use, not constant traffic. **PASS when:** No background CPU/memory growth, stalls, menu disappearance or unsolicited UI.

## 15. Installation, browser compatibility and production presentation

- [ ] **K01 · P0 · LIVE** — Install unpacked extension in a clean disposable Chrome profile using the documented build folder. **PASS when:** Correct extension ID, startup, OAuth and native menus; no dependency on REDOWN being installed.
- [ ] **K02 · P0 · LIVE** — Reload existing in-place installation (same extension ID) rather than uninstalling it. **PASS when:** Old settings/targets/history are preserved.
- [ ] **K03 · P0 · LIVE** — Confirm no unnecessary cloud resource modification occurs during installation or first boot. **PASS when:** Setup/provisioning requires the established approved path and authority.
- [ ] **K04 · P0 · LIVE** — Check real Chrome native right-click on at least two distinct websites/contexts. **PASS when:** Menu appears and action dispatch works beyond a fixture or local web page.
- [ ] **K05 · P0 · LIVE** — Check extension toolbar/Shelf reachability after Chrome closes and reopens. **PASS when:** No popup dead end or repeated login when still valid.
- [ ] **K06 · P0 · LIVE** — Check actual installed extension and Cloudflare R2 response on Windows. **PASS when:** No claim of launch from simulated ACK or local workerd alone.
- [ ] **K07 · P1 · LIVE** — Test current supported Windows 10/11 Chrome versions and a second Windows device if possible. **PASS when:** No Windows-only path, encoding, timing or permission regression.
- [ ] **K08 · P1 · LIVE** — Test with common screen resolutions and display scaling. **PASS when:** UI never conceals Save, Manage Destinations, or confirmation controls.
- [ ] **K09 · P1 · LIVE** — Review Chrome Web Store listing screenshots, privacy disclosure, support contact, version notes and permissions. **PASS when:** All descriptions accurately describe existing features, no promised unbuilt providers/counters.
- [ ] **K10 · P1 · LIVE** — Verify any analytics and logging opt-in behavior under Debug OFF. **PASS when:** No surprise external telemetry, diagnostic notifications or sensitive uploads.
- [ ] **K11 · P1 · ISOLATED** — Check coexistence with another extension that also uses right-click submenus. **PASS when:** Click2Cloud does not interfere with other extensions or claim unrelated menu state.
- [ ] **K12 · P2 · LIVE** — Test high-DPI, touchpad right-click, keyboard context-menu key, and mouse gestures. **PASS when:** Actions accessible regardless of input method.

## 16. Release decisions, rollout, support and rollback

- [ ] **G01 · P0 · MIXED** — Re-run `npm run test:focused` on Windows and investigate known workings-map and File API failures. **PASS when:** No unexplained release-blocking failure; baseline-only discrepancies have documented evidence and disposition.
- [ ] **G02 · P0 · MIXED** — Re-run full suite and list every failure including the historical golden-menu mismatch. **PASS when:** No hidden skip, silent rewritten expected value, or misleading full-green claim.
- [ ] **G03 · P0 · LIVE** — Complete installed Chrome logic2real matrix for expected config → plan → actual menu → selected target → verified R2. **PASS when:** Every critical route has independent real observed evidence.
- [ ] **G04 · P0 · LIVE** — Verify the exact frozen release build/version/commit matches the owner-tested artifact. **PASS when:** Published package is byte-identical or fully traceable to approved release candidate.
- [ ] **G05 · P0 · LIVE** — Perform clean cold boot, warm restart, worker restart, Shelf crash and interrupted save tests immediately before release. **PASS when:** No newly introduced recovery or right-click regression.
- [ ] **G06 · P0 · LIVE** — Verify all P0 incidents closed or consciously launch-blocked, especially config loss and false completed upload. **PASS when:** No unexplained user-data-loss class, wrong-target class, or credential leak.
- [ ] **G07 · P0 · LIVE** — Run small external beta across several people/devices using only personal test data. **PASS when:** Real install/auth/menu/save/Trash paths succeed outside the original developer profile.
- [ ] **G08 · P0 · LIVE** — Document a non-destructive rollback to the milestone commit and a safe data-preserving extension update path. **PASS when:** Rollback is source/build restoration, not deleting user profiles or cloud data.
- [ ] **G09 · P1 · LIVE** — Review release notes clearly distinguishing current supported Cloudflare capability from future multi-cloud ideas. **PASS when:** Users aren't promised provider support, Queue, badges or counters not actually live.
- [ ] **G10 · P1 · LIVE** — Confirm a reproducible bug-report flow without revealing tokens or file contents. **PASS when:** A tester can report release, phase, sanitized operation ID and observed failure.
- [ ] **G11 · P1 · LIVE** — Measure first-time user onboarding and time-to-first verified save. **PASS when:** No hidden manual steps, surprise infrastructure setup or unexplained consent.
- [ ] **G12 · P1 · LIVE** — Establish a release acceptance sign-off with owner, test environment, P0/P1 exceptions and unresolved risks. **PASS when:** Decision is explicit and traceable, not inferred from 2,000 saves alone.

---

## Exit criteria / decision record

- [ ] No P0 FAIL/BLOCKED unless launch postponed or scope explicitly removed with documented customer disclosure.
- [ ] Real native Chrome menu and exact-provider byte verification established independently; fixture counts are reported separately.
- [ ] 2,000 verified saves have an independent ledger, with zero wrong-target and zero falsely verified/truncated results.
- [ ] Repeated Chrome boot/restart, service-worker stop/restart, Shelf crash and receipt-loss simulations show recoverable, truthful state.
- [ ] Configuration, preferences and old history survive supported in-place upgrade and normal Windows restart.
- [ ] Known Windows test failures and other intentional gaps are fixed or have explicit, defensible risk dispositions.
- [ ] Build is frozen and tagged; small external beta signs off independently.

**Interpretation:** 2,000 flawless verifications are strong evidence of correctness under the chosen sample, **not** a mathematical proof of zero defects across other networks, browsers, profiles or failure windows.

## Source references and constraints

This scenario design incorporates verified repository docs from `thanks-cohn/Click2Cloud`, including `scaffold/gui/CHROME_EXTENSION_LIVE_ACCEPTANCE.md`, `Project_direction/FLIGHT_RECORDER_INDEPENDENT_RIGHT_CLICK_GRACEFUL_RECOVERY_2026-11-12.md`, `docs/requests/CODEX_P0_CURRENT_STATE_LOSS_FORENSIC_RECOVERY_HARDENING_2026-11-08.md`, and `docs/evidence/nov13-trash-silent/CHANGES_AND_TESTS.md` on branch `codex/trash-silent-logic2real`. Proposed future architecture is explicitly not proof of existing implementation.

**Count:** 248 independently trackable scenarios, P0: 177, P1: 70, P2: 1.
