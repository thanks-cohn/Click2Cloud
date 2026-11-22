# CODEX P0 — REDOWN 0.3.25: latent shortcut defects, causality audit, Chrome-first permanent repair, and Global best effort

## Mission and release standard

**Deliver a robust REDOWN 0.3.25.** Investigate the observed 0.3.23 → 0.3.24 shortcut failures as possible **pre-existing latent bugs exposed under different conditions**, determine what is proven versus merely suspected, implement the smallest permanent repairs, test them, document the evidence, and preserve all unrelated 0.3.24 improvements.

**HARD RELEASE GATE: every supported shortcut MUST actually work in official Google Chrome in the `In Chrome` scope.** Do not ship 0.3.25 merely because commands dispatch or errors are handled gracefully. The two screenshot shortcuts must produce real valid PNGs on supported ordinary Chrome tabs, with accurate cloud/History receipts. Files/search must actually open/select Files and focus its search box; History must actually open/switch/close as specified. All internal Shelf shortcuts must work when their UI has focus. An Edge pass, mock pass, or Linux Chrome pass cannot replace official **Windows 11 Google Chrome** acceptance.

**SECONDARY GOAL: try to make the four shortcuts work in `Global` mode as far as Chrome permits, WITHOUT ANY REGRESSION to `In Chrome`.** Global is *best-effort, not a release blocker* when the browser/OS does not provide the necessary active tab, user gesture, permissions, or foreground window. Test it separately and retain every genuinely working Global capability. Do NOT weaken `In Chrome`, silently change the user's scope/bindings, capture an unrelated tab, add unsafe permissions, or claim a blocked Global screenshot succeeded. If Global cannot complete a particular operation under browser rules, give precise actionable feedback and document the limitation. **A guarded failure in Global is not a screenshot success.** Prioritize reliability, privacy, and the Chrome-first experience.

Read the pre-existing request `codex-request-redown-0325-chrome-first-shortcuts-desktop-capture-2026-11-22.md` for full existing product requirements. **This new request supersedes that request if instructions conflict on latent-cause assumptions, Chrome-versus-Global priority, acceptance, or execution order.**

## Repo, branch, version provenance and safety

- **Only writable repo:** `thanks-cohn/Click2Cloud`.
- **Only writable existing branch:** `codex/redown-basic-api-integration-0323-alpha-base-2026-11-21`. Do not create/switch/merge branches, alter main or other repos, force-push or deploy.
- **Owner-observed WORKING BEHAVIORAL reference 0.3.23:** commit `5e1cb5faeb2c629ad5d66f62507a39b574847531`. A working experience **does not prove defect-free implementation**.
- **Owner-observed REGRESSION/EXPOSURE version 0.3.24:** commit `cd4c8dd3bc11700376d30da050d6050a0eb1edb9`. It may have introduced, exposed, amplified or coincided with latent bugs. Don't call it the working baseline.
- **Required repair deliverable:** `0.3.25`, with manifest, package, lockfile, build metadata and actual packaged extension consistently versioned. Preserve the extension ID/key and upgrade-data compatibility. Don't call it shipped/installed/Windows-verified unless that is true.
- Check current branch HEAD, git status, generated/package state, Codex artifacts, and any candidate fixes FIRST. If recent independent Codex work already modified the files, evaluate and build on it; don't overwrite or reimplement blindly. Commit/push only safe tested changes to the single authorized branch.
- Read `AGENTS.md` and applicable preservation instructions. No migration reset, shortcut rebinding, storage wipe, OAuth/Cloudflare re-provision, new long-lived background worker, unnecessary permissions, unrelated UI redesign, or regression to Basic/Drive/Dropbox/OneDrive/R2, right-click, verify-before-success, screenshot history, counter, Shelf navigation or themes.

## Source-grounded leads from independent inspection (validate current candidate before editing)

1. `src/chrome/provider-panel.mjs` has identical 0.3.23/0.3.24 blob `049ebf21782b1995460d5dd09b7edd5f35b823da`. In `createShelfHistoryToggle.command(tab,intent)`, when `tab?.windowId` is missing, it calls `chrome.windows.getLastFocused().then(...regularCommand...)` before `chrome.sidePanel.open({windowId})`. That Promise handoff can lose Chrome's mandatory temporary user gesture. In contrast, the with-tab path invokes `open` synchronously. Existing `showIntent` maps a rejected open to broad `SHELF_OPEN_FAILED`. Audit search AND History, cold-state restoration, race conditions, rapid toggle parity, early queues, onOpened/onClosed and focus acknowledgments.
2. `src/chrome/visible-tab-screenshot.mjs` is unchanged across versions (blob `42cb499ff0b3c4ada0f487ef3e0050885b377ae8`). `openVisibleTabSource` accepts absent command Tab, queries the focused window's active tab, validates URL/frame, then calls `chrome.tabs.captureVisibleTab`. **Discovering a tab isn't identical to possessing an `activeTab` grant or a required host permission.** Examine effective permissions, permission withholding, browser command scope, tab/document and window focus. Avoid wrong-tab captures.
3. `src/screenshot/capture.mjs` is unchanged (blob `f58e0668bc934b99790a76928ecf913c91a2eb5b`). Its screenshot `start()` concurrently resolves authority and tab observation, awaits checkpoints and matching rules, then captures. Trace exact timings/permission state, but don't declare async latency alone to be the cause without controlled evidence. Ensure capture occurs for the original intended document and receipt handling remains truthful.
4. `extension/background.mjs` registers `chrome.commands.onCommand` and dispatches screenshot commands and `shelf.history.toggle` / `shelf.explorer.search`. Audit synchronous registration, cold MV3 worker, command/tab argument, errors silently swallowed, and command listener lifecycle.
5. `extension/app.mjs` has `pendingSearchFocus` / `focusPendingSearch()`: it requires Explorer view, document focus, a source, connected state and successful focusSearch. This is an **additional independent failure boundary**. A panel open PASS is not a filename-search focus PASS. Test connected providers, disconnected Cloudflare, Basic-only, empty directory and restoration without inventing a cloud source.
6. `extension/manifest.json` moved broad `https://*/*` and `http://*/*` from optional to required host permissions in 0.3.24. This is confirmed but **not proven to cause shortcuts to fail**. The reference commits differ by **13 commits**, with other changed files. Audit upgrade grants/withheld access, but don't over-attribute.
7. `tests/shelf-history-toggle.test.mjs` primarily supplies explicit `windowId`; it omits tabless Global and lost-user-gesture simulation. `tests/screenshot.test.mjs` largely uses stub tabs and mocked `captureVisibleTab`, not real Chrome grants. Expand coverage; keep fixtures separate from installed Chrome evidence.
8. `extension/shortcut-settings.mjs` and `src/chrome/command-bindings.mjs`: actual effective Chrome bindings come from `chrome.commands.getAll()`; manifest suggested keys do NOT define all users' saved assignments. Preserve user-configured `Ctrl+Shift+F`, `Alt+Q`, etc.
9. At source-audit time current authorized branch still showed `0.3.24` in `extension/manifest.json` and `package.json`; previous 0.3.25 request was documentation, not evidence of a finished package. Re-read the live branch and don't assume it is unchanged since this audit.

**Useful APIs/docs:** `https://developer.chrome.com/docs/extensions/reference/api/commands`; `https://developer.chrome.com/docs/extensions/reference/api/sidePanel`; `https://developer.chrome.com/docs/extensions/reference/api/tabs`; `https://developer.chrome.com/docs/extensions/develop/concepts/activeTab`.

## Incorporate previous independent Chrome verification without exaggeration

Prior Codex reported using **official Chrome on Linux** with live keystrokes:
- Both comparison builds sometimes worked with `In Chrome` scope on that environment; this did **not** reproduce the owner's Windows failures.
- Changing shortcuts to `Global` reproduced two issues: screenshot command without a usable tab grant; and Shelf path using an asynchronous window lookup that lost the user gesture.
- A candidate safely rejected unsupported tabless capture and restored Files/search and History when Chrome was focused; a Linux in-place upgrade reportedly preserved user binding and screenshot History.

Collect raw evidence/artifacts and browser versions. Treat statements unaccompanied by files as **reported evidence**, not new independent verification. Distinguish `capture refused safely` from `image successfully captured and saved`. Do not infer a version-specific Windows root cause from a Global-only Linux reproduction.

## Phase 1 — Causal forensics before repairs

Build a **version × configuration × context comparison** for ALL four browser commands, then compare repaired candidate:

- Versions: 0.3.23 clean, 0.3.24 clean, real 0.3.23→0.3.24 update, and 0.3.23→0.3.25 plus 0.3.24→0.3.25 upgrade.
- Official Chrome Windows 11 (primary), official Chrome Linux where available (support), Edge as separate compatibility comparison.
- For each browser: real effective shortcut assignment, `In Chrome` and `Global`, Chrome foreground/background, focused ordinary HTTPS page, no command Tab, multiple normal windows, protected/non-ordinary pages, withheld site permissions, update approval pending, Chrome/service-worker restart, Shelf closed/open/opening, user-customized bindings.
- Explicitly inspect host permission vs `activeTab` grants, extension identity and source package SHA, Chrome version, whether a command was delivered, actual rejection text/category, elapsed async boundaries and the resulting user-visible feedback. Never log tokens, actual private URLs or screen contents.
- Test screenshot with an authenticated destination separately from *capture permission itself*; use local/fake upload where necessary to isolate it. Test Shelf `sidePanel.open` separately from post-open Files routing and search focus.
- Produce evidence table per case: `KEY -> COMMAND_DELIVERED -> TAB/WINDOW -> GRANT -> API_CALL -> API_RESULT -> UI_FOCUS or PNG -> RECEIPT -> HISTORY`. Status must be **PASS / FAIL / BLOCKED_BY_CHROME / UNVERIFIED**, with OS and browser stated. Do not conflate no command delivery, missing tab, permission error, lost gesture, missing window, failed focus or cloud upload failure.
- To attribute causality: show a controlled situation in which 0.3.23 passes while 0.3.24 fails **and** isolate the responsible difference. If BOTH fail under the same Global setup, label the underlying bug *latent in both*. If permission-update causality cannot be reproduced, say *not established*. Document trigger, underlying defect, amplification by upgrade (if shown) and exact uncertainty separately.

## Phase 2 — P0 permanent `In Chrome` repair, all shortcut outcomes

**Hard mandate: succeed on ordinary supported Chrome tabs while Chrome has focus and the shortcut is assigned In Chrome.** No fallback that silently converts working Chrome commands into Global-only behavior; no deferral of P0 for optional Global/desktop work.

Reserved Chrome command identities, in **exact priority order** (only these four browser-level slots; preserve effective custom bindings):
1. `screenshot.capture.alt-q` — Alt+Q primary screenshot.
2. `screenshot.capture.ctrl-shift-y` — secondary screenshot, default Ctrl+Shift+Y.
3. `shelf.explorer.search` — Files filename finder; owner custom key Ctrl+Shift+F, although manifest suggestion is Alt+Shift+F.
4. `shelf.history.toggle` — History pop-out/toggle; preserve effective custom key.

Other shortcuts remain working **inside focused Shelf/Explorer**, not competing for Chrome command slots. Do not remove existing features.

Implementation expectations:
- **Screenshot:** command received -> correct currently focused permitted ordinary Chrome tab -> browser-authorized image capture -> nonempty valid PNG -> expected screenshot history with correct URL and stable target -> upload/verify where configured. Graceful blocked statuses when auth unavailable; capture and save are independently reported, with no false verified receipt or increment. Handle rapid presses, tab navigations, window swaps, missing command tab, MV3 restarts, partial uploads and PNG limits without wrong-window captures.
- **Files:** one supported assigned keystroke must open/select Shelf Files and **focus filename search**, even if the panel was initially closed or open on another tab. Don't count just `sidePanel.open()` or view-change as success. If the search UI exists without Cloudflare connection, decouple focus from needless provider-auth gating where safely possible; display honest offline/search limitations and preserve saved settings.
- **History:** one keystroke opens/switches to History and the next toggles/returns according to established UX, including already open panel and rapid presses. No dangling intent, duplicate windows, or wrongly closed Shelf.
- **Gesture safety:** invoke gesture-gated `chrome.sidePanel.open` directly within the supported command's activation whenever the necessary window/tab ID is available. Don't insert await, Promise callbacks, storage reads, `getLastFocused` or other asynchronous work *before* the gesture-requiring API. Resolve post-open intent and focus asynchronously with sequencing and acknowledgment. For tabless cases, use a documented supported design or mark blocked; never invent a gesture.
- **Error clarity:** preserve sanitized Chrome API error category and stage in diagnostics; show short useful user-facing errors. Do not collapse every failure into `SHELF_OPEN_FAILED` or `CHROME_CAPTURE_PERMISSION_DENIED`. No raw secrets/site URLs.
- **Tests:** deterministic gesture-sensitive fake that rejects `sidePanel.open` if invoked after first Promise/microtask; missing-Tab, distinct focused vs last-focused windows, permission denied, worker cold start, rapid toggles, UI acknowledgment, search focus, saved bindings and actual output identity. Real Chrome tests must assert completed outcome, not listener event.

## Phase 3 — Global-mode effort (strictly subordinate to `In Chrome`)

Research and experimentally validate which four commands can run as `Global` within **real official Chrome**:
- **Chrome is in focus, but a command is configured Global:** Can it safely use granted host access or valid command-provided tab context? If so implement documented supported capture and panel open while avoiding wrong tab/window selection.
- **Chrome is NOT in focus:** Chrome may omit the tab/window and/or an `activeTab` grant. Test whether History/Files can open a clearly identified existing Chrome window via a supported gesture-preserving approach; avoid an async `getLastFocused` lookup that invalidates the gesture. Do not open the wrong user window or steal foreground unexpectedly.
- **Screenshots outside Chrome:** A global shortcut does not automatically authorize capturing other Windows applications. Investigate officially supported Chrome `desktopCapture` picker/consent and whether a native Windows companion would be required. Optional explicit user-consented desktop/window capture must be a separate mode/capability; **NEVER** replace normal Alt+Q tab screenshot with a picker, silently grant itself permission, or capture unrelated browser tabs. If no safe supported path exists, report a limitation and offer a clear conscious in-Chrome/consent alternative.
- **Regression isolation:** implement Global as an explicit opt-in conditional path only where genuinely supported. Add side-by-side tests with identical bindings and full scenarios to prove **every In Chrome flow still passes after Global enhancements**. If any Global experiment makes In Chrome unreliable or alters actual key assignments, revert/remove that experiment before delivery. Global failures are informative but may not block release when browser/OS constraints are established; any In Chrome failure on a supported tab **blocks release**.
- **No wishful fallback:** don't merely swallow the Global error, report success after an error, or label `BLOCKED_BY_CHROME` without actual API/browser evidence. No polling, keyboard hooks or external native host added without explicit owner approval.

## Phase 4 — URL-independent desktop capture research (after Chrome P0 passes)

Preserve the prior request's Phase B, but do not let it jeopardize 0.3.25 stability. Research explicit screen/window picker and native-companion options, document whether available in Chrome and for Global. Implement only a small, supported, opt-in user-consented solution if safe and feasible **after** the four In Chrome commands pass. Otherwise deliver a capability/limitations decision and postpone implementation. For genuinely URL-less captures, History shows **`N/A`** in Host URL and any absent source/page URL field (nonclickable), with real timestamp, preview and receipts, no synthetic `chrome://`, `file://` or last-webpage URL. No false success for cancellation, no unauthorised capture and no extra ledger.

## Phase 5 — regressions, preservation, package and independent evidence

- Run existing source and browser suites plus new tests: `tests/screenshot.test.mjs`, `tests/shelf-history-toggle.test.mjs`, focused API and provider preservation tests, full package build, and where available installed official Chrome. Include tests verifying the browser-level four-slot count, effective user bindings, Shelf-internal keys, histories, data integrity and permissions.
- Upgrade in place without resetting: preserve extension ID, account associations, `Ctrl+Shift+F` user assignment, screenshot History, existing cloud statuses, contexts/destinations, verified-save counters, menu order, Shelf themes and all saved data. Do not falsify Chrome permissions or grant source access silently.
- Resource constraints: keep responsiveness and bounded memory important for an approximately 4 GB RAM Windows 11 machine. Do not add always-on loops, heavy resident capture infrastructure or large unbounded PNG buffers.
- Windows official Chrome installed release acceptance is independent: fresh profile plus existing profile upgraded from 0.3.23/0.3.24; actual `In Chrome` assigned keys; ordinary HTTPS tab screenshot and provider-confirmed receipt; Files search actually focused; History actually toggles; cold/restarted background; same test after Global work. If no Windows environment, mark **WINDOWS CHROME GATE: UNVERIFIED/BLOCKED**, provide reproducible exact owner steps and DO NOT claim fully ready.
- Report Chrome and Edge separately. A Linux or Edge pass cannot satisfy Windows Chrome.
- Update `docs/integration/REDOWN_0324_SHORTCUT_CAUSAL_AUDIT_0325_REPAIR.md` (new forensic root-cause report) and `P0-safety-risk-register.md`. Include three-version commit/build digests, affected files/lines, latent-versus-introduced distinction, exact reproducible trigger, user-gesture timing evidence, Chrome permission state, full four-command matrix by In Chrome vs Global, before/after installed tests, screenshot PNG and verified receipt result, URL-less status, regression tests, risks and unsupported environments.
- Any remaining hypotheses are labeled **HYPOTHESIS**, browser limitations **BROWSER-BLOCKED**, unavailable tests **UNVERIFIED**. Distinguish fix merged, package built, installed tested, and released.

## Acceptance checklist — do NOT close P0 prematurely

1. **In Chrome primary:** Alt+Q screenshot PASS on permitted supported page with actual PNG and correct outcome; alternate screenshot PASS; Files/search PASS with field actually focused in one press; History PASS with correct toggle. Chrome-authorized limits acknowledged only where relevant. All Shelf-only shortcuts independently pass in Shelf focus.
2. **Global secondary:** each of four separately rated PASS / FAILED / BROWSER-BLOCKED / UNVERIFIED with exact evidence. Attempt meaningful enhancements; reject any that damage `In Chrome` reliability. `Global` does not redefine the primary In Chrome acceptance gate.
3. **Causality:** prove which defects were already latent in 0.3.23 vs actually introduced by 0.3.24, and identify why this user's 0.3.24 upgrade exposed them *only if experimentally supported*. Don't invent a single neat cause.
4. **Persistence and safety:** same extension ID; no lost keybindings, History or destinations; no duplicate save counter, wrong tab, false upload receipt, unapproved permissions or data reset.
5. **Version and evidence:** source/build exactly `0.3.25`, tests and honest Windows Chrome status, final report and risk register updated, commit+push on the sole authorized branch. If a P0 mandatory `In Chrome` condition fails/unverifiable, state it plainly and do not call release-ready.

**Owner's core intent:** `In Chrome` must be rock-solid first; Global should work wherever safely feasible but may never cause a regression to In Chrome. Find and document latent failures now so no future minor version exposes the same bugs again.
