# Click2Cloud 0.3.21 — FINAL Frozen Screenshot-to-Cloud Specification

**OWNER-FINAL / SINGLE SOURCE OF TRUTH — November 20, 2026.** This directory is the AUTHORITATIVE implementation and test contract for Screenshot-to-Cloud in Click2Cloud **0.3.21**. The earlier `/screenshot-logic/` and `next-codex/SCREENSHOT_TO_CLOUD_CONTEXT_MENU_AND_ADDITIVE_RULES_2026-11-19.md` are HISTORICAL REFERENCES ONLY; if any old text disagrees, **THIS directory wins**. Codex must READ AND IMPLEMENT THIS DIRECTORY, not ignore it. No Auto-Reroute in this version (reserved for a separate 0.3.22 run).

## 1. Exactly what the user experiences

**More ▾ → Screenshot → select Website / domain / subdomain / exact URL / All websites → select an exact authorized Cloudflare R2 directory → Save.** A saved card appears directly under the form. Each card has its own **Active ON/OFF** toggle and far-right **X Delete**; clicking the card body edits its website conditions and directory list. 25 cards per page; page 26+ instead of any global cap. Save CONFIGURES A RULE and NEVER takes a screenshot. No separate Capture tab and NO screenshot shortcut field anywhere in this form, the card, card editor or File Explorer setup popup. Existing other More entries remain; insert Screenshot directly ABOVE Settings. **Do not add More → Rules, Auto-Reroute or download-routing UI in 0.3.21.**

```text
More ▾
  Screenshot
  Settings

Screenshot
Website        [ Entire domain / subdomain / exact host / exact URL / All sites ]
Save to        [ Cloudflare R2 · account / bucket / screenshots/ ] [Change]
                                                          [ Save ]

Saved Screenshot Rules
  Rule 1  · google.com · R2/photos/               [Active ●] [X]
  Rule 2  · All websites · R2/general/           [Active ●] [X]
```

The Screenshot card is **not bound to any particular physical shortcut**. All active screenshot cards subscribe to ONE internal screenshot signal. A rule can be independently disabled without deleting it; X deletes only its configuration, never cloud objects. A card may be renamed and edited without altering its immutable ruleId. The full editor supports multiple **OR** website conditions (empty list = All websites) and multiple distinct authorized destination folders. A rule that matches via two website conditions still contributes only once, not once per website condition.

## 2. Two independently working default shortcuts — BOTH ON, SAME SIGNAL

- **Alt+Q** and **Ctrl+Shift+Y** are BOTH suggested and enabled as Chrome-scoped extension command defaults in `extension/manifest.json` on installation, subject to real Chrome/OS assignment availability. Neither is a standby key; NO primary/fallback switching, priority, failover logic, manual setup wizard or per-card shortcut ownership.
- Both distinct manifest command IDs (`screenshot.capture.alt-q`, `screenshot.capture.ctrl-shift-y`) feed one `chrome.commands.onCommand` listener and map to the EXACT SAME internal signal type `screenshot.capture`. Either key, when pressed on an eligible ordinary website while Chrome is focused, matches ALL currently active screenshot rule cards; one delivered command event generates ONE screenshot capture and ONE browser→Worker image upload. Different intentional keypresses create new capture IDs (even if the page and image look the same). Do not debounce away distinct presses or run two handlers for one event.
- Both shortcuts are intended to work while the Click2Cloud app/shelf is CLOSED; they are Chrome-browser-scoped, not system-wide shortcuts for other applications. Chrome-protected/internal pages and missing site/capture permissions may not be supported; report actual failures, do not fake success.
- Verify actual assignments using `chrome.commands.getAll()` after install; show `Alt+Q` / `Ctrl+Shift+Y` in a small Screenshot hint ONLY if actually registered. If one is unassigned, the other remains independently usable. Chrome does not send an event for a shortcut press it intercepted/ignored, so do not claim the app can synthesize an automatic replacement keypress. If neither is assigned, show a quiet direct link/instruction to Chrome's shortcut settings.
- Keep existing `Ctrl+Shift+F7` Explorer search, `Ctrl+Shift+F8` toolbar rows and `Ctrl+Shift+F9` panel split shortcuts unchanged. Those existing handlers operate in the Click2Cloud UI; they do NOT consume Chrome manifest-suggested shortcut defaults. The separate future Shelf→History Chrome command is NOT a screenshot signal. The old `Ctrl+Shift+F6` screenshot example is obsolete.

## 3. Precise screenshot trigger and matching rules

**Keyboard trigger:** Only a real user-initiated Chrome command event starts the additive rule processing. A website-only saved card is NOT a periodic/background capture instruction; it becomes eligible when the user presses EITHER default key. **There is NO required shortcut-bound anchor card** or hidden default rule. If no active screenshot rule matches the current trusted website, there is NO screenshot capture and NO cloud upload.

**Website scopes (explicit, stable and correctly compared):**

- `All websites`: any supported ordinary website URL.
- `Entire domain + subdomains`: the specified registrable/domain host and hosts below it, never similarly named outsiders such as `notexample.com`.
- `Exact hostname`: one host (e.g. `mail.google.com`) with any page path; not sibling/subdomain hosts.
- `Specific full URL`: only the exact intended page URL using defined URL normalization (no substring match).
- A rule's website list is an OR. Empty website list is All websites. Multiple matched conditions in ONE rule do not multiply output claims. Different active rules can overlap deliberately; each matching rule independently contributes its configured destinations. **No priority winner, Exclusive Save, takeover, implicit deactivation or most-specific suppression** for screenshot rules.

**Right-click actions must stay distinct:**

- Browser right-click `Screenshot → choose exact authorized folder` means a **ONE-OFF CAPTURE to ONLY that selected folder**. Do not implicitly add all matching automatic screenshot destinations for that action.
- Inside Click2Cloud File Explorer, folder right-click `Screenshot2Here` CONFIGURES/EDITS a normal screenshot rule: select website scope or All websites, choose NEW card or exact existing card by ruleId, and Add selected folder / Replace an explicitly chosen old folder; Save persists config, no screenshot, no shortcut picker. Multiple folder cards remain distinct by ruleId.

## 4. Exact capture logic — one image, one browser upload, many Worker writes

1. **Receive ONE genuine Chrome command event** for Alt+Q or Ctrl+Shift+Y. Map to `screenshot.capture`; allocate a new unique `signalId`/`captureId` for THIS action. Route via a SINGLE central dispatcher. Two genuine events are separate captures. Do not assume the command API provides a hardware keypress ID or auto-repeat flag; do not invent a debounce window that loses legitimate user presses.
2. **Read trusted current browser state** from Chrome APIs: active window and tab IDs, focused window, observed active-tab URL, navigation identity where observable. Check Chrome permissions/capture eligibility. The command-provided tab may help, but re-check actual active tab in its window because `chrome.tabs.captureVisibleTab(windowId)` captures the WINDOW'S CURRENTLY ACTIVE TAB, not a supplied tabId.
3. **Snapshot rule configuration exactly once:** all Active rules and their immutable rule IDs, website OR conditions, authorized R2 destination lists and the global dedup toggle. Match against the trustworthy tab URL. Build the complete list of `(ruleId, canonicalDirectoryId, authorizedTarget)` intents. If ZERO matching intents, stop without capture/upload.
4. **Freeze one immutable Capture Plan** containing captureId, signalId, operation/job ID, windowId/tabId, observed URL/navigation identity, rule configuration version/snapshot, matching contributor IDs, all exact authorized targets, dedup setting and deterministic physical output IDs/object keys. Once frozen, later changes to rules, websites, toggles, destinations or dedup setting apply only to a NEW screenshot. No destination substitution in flight.
5. **Apply per-capture directory dedup preference** (see §5 below) to produce a final physical output plan. Allocate each output its own stable immutable `outputId` and R2 object key; store ALL contributing rule IDs when dedup combines them.
6. **Check tab identity immediately before capture**, call `chrome.tabs.captureVisibleTab(windowId)` ONCE to capture the WHOLE VISIBLE webpage viewport (not browser chrome, address bar, another tab, monitor, cropped element or below-the-fold full page), and check tab/window/navigation immediately afterward. If the source tab changes or identity becomes uncertain, do not upload possibly wrong-page bytes; return a truthful capture-failure receipt. Treat rate limits and unavailable pages as errors, not successes.
7. **Send the captured image bytes from Chrome to the EXISTING Click2Cloud Worker ONCE** per actual command event, regardless of 1 or 1,000 rule destinations. This is a screenshot-specific byte transfer, NOT the deferred Auto-Reroute browser-download interception engine. Reuse the current Cloudflare connection and exact selected authorized folders; don't introduce a parallel cloud save engine or speculative authentication wizard.
8. **Worker distributes the ONE received image to the planned authorized R2 targets**, extending the existing single-target writer narrowly for screenshot fan-out. Begin with truly supported same-account/bucket multi-prefix targets. Do not fake cross-bucket/account support if current Worker deployment/bindings cannot deliver there; record such targets as blocked until supported. Preserve exact intended output keys, bounded memory/concurrency and real R2 write verification.
9. **Record per-output verification and aggregate job status** in the EXISTING recorder and History: confirmed, failed, pending/unknown, partial when mixed; exact output IDs/keys/destinations, rule contributor IDs, timestamps, bytes, actual verification method. Worker ACK alone isn't proof R2 stored the file. Preserve user-selectable Raw Receipt (detailed forensic information) and Secure Receipt (redacted sharing export), same recorder, no new diagnostics pipeline.
10. **Retry only failed/unconfirmed outputs of the SAME capture** using their SAME IDs/keys, never recapture and call it a retry, and never create new duplicate objects for already verified outputs. If original screenshot bytes cannot be recovered after interruption, mark retry blocked/unrecoverable honestly; a bounded temporary source object may be used when needed, with cleanup. A genuinely NEW user shortcut press always makes a NEW captureId and NEW cloud object(s).

## 5. Exact output behavior — additive and deterministic

**Global Setting:** `Settings → Screenshot → Single file per screenshot per directory` is **ON by default**, independently persisted and does not require the user to configure it in the everyday Screenshot rules UI.

- **ON:** one physical R2 object per DISTINCT canonical authorized directory PER CURRENT CAPTURE. Canonical identity includes provider + actual connection/account + bucket/container + provider-exact directory prefix. Multiple rules pointing at the same true directory produce ONE object with ALL contributor rule IDs in its receipt.
- **OFF:** one physical object per distinct **matching ruleId→canonicalDirectoryId** association, even if 100 rules point at one identical directory. If a card has several matching website conditions, it still counts as ONE card; it doesn't get copies per matched condition. Same rule cannot list identical destination twice. Distinct objects must have distinct stable keys.
- Canonical directory equality is about TRUE authorized target identity, not display labels. Two accounts or buckets with the same folder name must remain distinct. R2 key prefixes are case-sensitive; don't silently lowercase key paths, decode arbitrary bytes or collapse meaningful segments.
- Dedup is PER CAPTURE, not a search of old cloud objects. A new screenshot command always creates a new file even if the same directory contains past screenshots.
- No arbitrary product limit on how many rule cards can match. Worker may pace physical writes for actual resource limits, but must not silently skip requested outputs. If some writes cannot complete, receipt says exactly which.

**Canonical test examples:**

| Scenario (all matching rules use the SAME logical signal) | Captures | Chrome→Worker uploads | R2 objects if all writes succeed |
|---|---:|---:|---|
| No active matching rules | 0 | 0 | 0 |
| Rule A google.com→photos/ + Rule B All sites→general/ on Google | 1 | 1 | 2 (both modes) |
| 10 separate rules → SAME R2 directory, Dedup ON | 1 | 1 | 1 |
| 10 separate rules → SAME R2 directory, Dedup OFF | 1 | 1 | 10 |
| One rule, three matching OR website conditions, one directory | 1 | 1 | 1 (both modes) |
| 100 matching rules over three distinct directories, Dedup ON | 1 | 1 | 3 |
| Press Alt+Q, then Ctrl+Shift+Y separately on the same site | 2 | 2 | Two new captures with independent outputs |
| Browser right-click Screenshot to exact folder X | 1 | 1 | Exactly 1 in X, no other additive outputs |

## 6. Final Screenshot UI and storage expectations

- One normal Screenshot card type. Website→Folder→Save; each Active/Inactive toggle controls only itself; X removes only that rule; edit by clicking card; 25/page and no hard rule cap. Keep saved card IDs and names stable across restarts, pagination and edits. No screenshot on Save or editing.
- The card editor may include one OR-list of websites and one list of authorized R2 destinations, with Add/Edit/Remove and one Save action. No per-card shortcuts or capture mode UI, no Exclusive Save, no priority or arbitration controls, no extra Screenshot Capture/Delivery tab.
- More menu order in v0.3.21: **Screenshot directly above Settings**. `Rules`/Auto-Reroute entry will be added only in 0.3.22. Preserve other existing More entries when appropriate. Do not bury Screenshot inside Settings or File Explorer.
- Keep existing Chrome F7/F8/F9 in-Shelf shortcuts, normal right-click save engines (Simple/Narrow/Depth), Gallery, Get URL, OAuth and History untouched aside from necessary direct wiring.

## 7. Implementation boundaries and status

- Current baseline `extension/manifest.json` (0.3.20) has no Chrome `commands` yet: implementing the TWO real screenshot commands and their one dispatcher is new work. Validate manifest command keys on target Chrome; report actual assignments, conflicts and real installed behavior. Do not claim Chrome can programmatically change command keybindings at runtime.
- Current Cloudflare Worker authorizes/writes a single deployment-bound target. Screenshot multi-target fan-out is new work. Reuse its authenticated session and exact destination bindings without building an entire new hardening platform. Don't claim multi-account or multi-bucket behavior until truly verified.
- `screenshot-logic-final` IS the feature contract; the directory is documentation, not evidence of a completed implementation. The only release-success claim is a tested installed Chrome→existing Worker→actual R2 file plus correct receipts.

## 8. Required tests and release gates

Read [TEST_MATRIX.md](TEST_MATRIX.md) and implement every applicable deterministic fixture. Test real Chrome `commands.getAll()` assignments and key delivery with Shelf closed, proper capture scope and tab race, additivity/OR, dedup ON/OFF, one upload, Worker partial outcomes and retry identity, no unexpected right-click fan-out, and no regressions to existing features. Mark DONE/NOT TESTED/BLOCKED with evidence rather than claiming unverified Chrome/R2 success.

**No new screenshot semantics may be taken from the old `/screenshot-logic/` or long 2026-11-19 screenshot draft if they disagree with this final owner-approved document.**