# Screenshot Logic — FROZEN V1 Execution Contract

**Status:** DESIGN FROZEN by owner, November 20, 2026. **Location:** `/screenshot-logic/`. **Purpose:** the single concise, authoritative implementation contract for the Click2Cloud Screenshot-to-Cloud engine. This freezes behavior, not a claim that feature code already exists or passed live tests. Do NOT alter its user-visible semantics without a new owner decision.

## V0.3.21 SHORTCUT UX UPDATE — ONE LOGICAL SCREENSHOT SIGNAL

**Owner-approved revision (2026-11-20):** In v0.3.21 provide ONE logical screenshot signal available while Chrome is focused on normal websites, with the preferred **two-key `Alt+Q` default**, and a predeclared fallback **`Ctrl+Shift+Y`** when `Alt+Q` is unavailable or conflicts. Both physical shortcuts, if assigned, invoke the **EXACT SAME** screenshot signal and matching rule set; they are NOT distinct routing modes. This consumes up to two of Chrome's four suggested default shortcut assignments; preserve the existing F7/F8/F9 Explorer-local shortcuts.

**Do not promise OS-global or literally every browser surface:** These are ordinary Chrome-scoped manifest commands, NOT `global:true`; they should work while the user browses ordinary HTTP(S) tabs and Chrome has keyboard focus, even if the Click2Cloud app/shelf is closed. Chrome/OS/other extensions may claim a combination, the user may disable it, and capture can be restricted by browser permissions or special pages. Verify real `chrome.commands.getAll()` assignments, test ordinary third-party websites, report unsupported pages honestly. The extension CANNOT programmatically remap Chrome-wide shortcuts after installation.

**Manifest proposal, to be verified in installed Chrome on target operating systems:**

```json
"commands": {
  "screenshot.capture.primary": { "suggested_key": { "default": "Alt+Q" }, "description": "Save screenshot to matching cloud folders" },
  "screenshot.capture.fallback": { "suggested_key": { "default": "Ctrl+Shift+Y" }, "description": "Alternate screenshot shortcut" }
}
```

Use a single `chrome.commands.onCommand` listener; both command IDs map to one `screenshot.capture` internal **signal type**. A single physical keypress produces only one command event/capture and one upload. Separate presses on either shortcut produce separate capture IDs. Do not invoke both commands in response to the same event. If primary is not registered, check the actual fallback assignment before displaying it; if neither is assigned, surface a quiet, accurate settings hint with a link to Chrome's shortcut settings. Don't invent automatic runtime key rebinding or falsely display the proposed default as active.

**SIMPLIFIED V0.3.21 SCREENSHOT RULES UI: NO PER-CARD SHORTCUT SETTINGS.** More → Screenshot remains `Website / URL scope → authorized Cloudflare folder → Save`, with saved cards, individual Active toggle and X delete. Cards may be named/edited and may contain multiple website OR conditions and multiple destination folders in their full editor, but **they have no assign/chord control**. File Explorer `Screenshot2Here` quick popup simply creates or updates a normal rule with the selected destination; NO shortcut setup or shortcut card selection is needed. All saved active screenshot rules are automatic listeners of the ONE logical screenshot signal.

**Critical behavior:** When the user presses Alt+Q or its verified fallback, ALL active rules with matching website conditions contribute their destinations, even if the user has ONLY website→folder cards. Do NOT require a separate matching shortcut-bound 'anchor rule' or invisible starter rule for a capture to happen. If zero active matching rules, do not capture/upload. A website-only rule never autonomously captures without the user's keypress. Preserve the single-target browser right-click Screenshot action as an independent trigger, not additive unless explicitly chosen.

**Legacy config migration:** Preserve existing screenshot rule IDs, Active state, OR website conditions and authorized destination lists. Existing proposed shortcut bindings, if stored, become non-operative metadata for future advanced support and must not suppress an otherwise matching rule. Do not silently delete user configurations or create duplicate output targets. The optional `redown/screenshots/` preset is just a normal authorized editable rule and must not be a hidden prerequisite or an additional unwanted copy.

**Frozen fundamentals unchanged:** All matching rules additive; one rule counts once despite multiple matching OR conditions; one capture and one inbound browser upload per keypress; dedup ON yields one file per canonical directory per capture, OFF yields one file per rule→directory association. Keep immutable plan, output/capture IDs, independent Worker receipts, partial recovery and exact cloud destinations.

**Additional acceptance:** primary key on a regular website works with shelf closed; fallback triggers identical rules; primary and fallback are checked in actual `commands.getAll()`; a saved website→folder rule alone receives a screenshot; mismatched site/disabled card does not; no per-card shortcut controls are displayed; F7/F8/F9 Explorer keys unchanged; unsupported browser surfaces do not trigger false success.

---

## Non-negotiable behavior

- **Keyboard shortcut = SIGNAL**, not a screenshot operation belonging to an individual card. ONE supported user keypress emits ONE screenshot signal, creates ONE capture of the entire visible webpage viewport of the active tab, and initiates ONE browser-to-Worker upload; all eligible rules are listeners.
- Every **ACTIVE Screenshot rule** subscribes to the ONE logical screenshot signal (Alt+Q or its verified fallback). ALL active rules matching the current website contribute their saved destinations. No per-card shortcut ownership, winner, priority, Exclusive Save or automatic deactivation.
- Every matching **website-only additive rule** also contributes its authorized destination when a supported screenshot shortcut capture occurs. Website-only rules never initiate screenshots on their own.
- A saved rule card may contain zero or more website conditions and one or more destination folders. Website conditions are **OR**, NOT separate claims: if several conditions on ONE card match, that card contributes each of its distinct folders **once**. Empty website list = All websites. A card cannot contain the exact same authorized destination twice.
- **Settings → Screenshot → Single file per screenshot per directory** is **ON by default**, persisted. ON means one NEW screenshot object per canonical directory FOR THE CURRENT CAPTURE, even if 100 rules request it. OFF means one distinct new object per matching `ruleId → canonicalDirectoryId` association. A NEW keypress creates a NEW screenshot, even if yesterday's screenshot is already in that directory. No historical directory scans for deduplication.
- A right-click browser **Screenshot → chosen folder** is a SINGLE-target user-triggered capture, not an additive shortcut signal. File Explorer `Screenshot2Here` configures a matching website/folder rule under the same default signal; its Save button never takes a screenshot.
- Only user-triggered, permission-authorized captures. Default content is the **whole VISIBLE active-tab viewport**, with no crop (not the browser address bar/tab strip, other tabs, hidden page, full scrollable webpage or other monitors). Never misrepresent the capture extent.

## Canonical components and sequence

1. **One central screenshot signal dispatcher** listens for the two declared Chrome command IDs (preferred Alt+Q and fallback Ctrl+Shift+Y) and maps either to ONE logical signal (or accepts the independent one-off Screenshot action). Every active saved screenshot rule subscribes to this logical signal; no card registers a Chrome listener or initiates its own capture.
2. **Bind trusted browser state:** record window ID, active tab ID, current observed URL and navigation identity with one immutable configuration snapshot/version. If **no active rule matches the trusted current page**, do not capture. Website-created cards ARE sufficient to match the single user-triggered shortcut signal; none can capture autonomously.
3. **Pure rule matching:** include EVERY active saved Screenshot rule whose 0+ website OR-conditions match the page and record its immutable rule ID ONCE. All cards share the one logical shortcut signal. Match website scopes precisely: All websites; domain + subdomains; exact hostname (all paths); exact normalized page URL. Avoid substring traps, stale queries and untrusted webpage text.
4. **Build ONE immutable capture plan** with `signalId`, `captureId`, `jobId`, trusted tab/window/page, matched rule IDs, per-rule authorized targets, exact canonical destination identities, dedup setting, planned output IDs/keys and configuration version. Freeze it before upload. Changes to cards, scope, activation, destinations, shortcuts or dedup settings affect ONLY later captures.
5. **Apply dedup switch:** ON groups output intents by exact canonical directory; OFF retains one output for each distinct rule→directory association. Overlapping website conditions in the same card do not create extra intents. A rule cannot add the same destination twice.
6. **Capture once:** `chrome.tabs.captureVisibleTab(windowId)` captures the current active tab of THAT WINDOW, not a tabId parameter. Check active tab/window/navigation before and after capture. Abort WITHOUT uploading potentially wrong-page pixels if tab identity, focus or navigation is uncertain. Honor actual Chrome permission and screenshot restrictions.
7. **Upload once to the existing trusted Click2Cloud Worker**, with a securely scoped, bounded payload and validated immutable plan. The Worker independently authorizes EVERY target and performs per-destination physical writes. Limit memory, write concurrency and workload; one upload body is not a reusable one-shot stream without explicitly safe buffering/staging.
8. **Verify and receipt:** One aggregate job and independent physical-output states: pending / verified / failed / uncertain / skipped. Record contributing rules, canonical targets, object keys, bytes, timestamps, attempts and actual verification evidence in existing shared recorder and Raw/Secure exports, never image pixels or credentials. Partial success is not total success.

## The four mandatory reliability safeguards

### 1. Central signal dispatcher

- Preserve existing `src/api/shortcuts.mjs` shortcut validation/uniqueness for unrelated UI-local Explorer commands F7/F8/F9. The browser's `Alt+Q` and `Ctrl+Shift+Y` commands are declared in `manifest.json` and both map to one screenshot signal; do not pass them through the Explorer-only chord validator, nor introduce per-rule browser command assignments.
- Browser-wide shortcut support requires a real `commands` declaration in `extension/manifest.json` and an actual Chrome assignment (`chrome.commands.getAll()` / `chrome://extensions/shortcuts`). The current manifest has no such registration. A local UI-stored shortcut is NOT automatically a Chrome-wide hotkey.
- `Ctrl+Shift+F6` was an older proposed screenshot preset and is still reserved in the local Explorer validator; it is **NOT** the v0.3.21 screenshot default. Do not resurrect F6. Prefer `Alt+Q` with a `Ctrl+Shift+Y` fallback, and report only assignments actually confirmed by Chrome.
- One real user action gets one signal; two distinct rapid keypresses get TWO signals. Avoid time-window debouncing that drops legitimate new screenshots. Do not dispatch a separate screenshot per card.

### 2. Immutable capture plan

- All match results and target identities are snapshotted. A disable/delete/edit during upload does not silently redirect or cancel the already accepted intent, except actual permission revocation must be enforced at write time.
- Match the same intended webpage that will be captured. Chrome can change its active tab before `captureVisibleTab` completes; revalidate window/tab/navigation immediately before and after capture and fail closed if uncertain.
- Match validation occurs before bytes leave Chrome; the Worker always revalidates actual authorized destination bindings and quotas.

### 3. Unique capture and output IDs

- `signalId`: one actual trigger event. `captureId`: the image produced for that trigger. `jobId` / `operationId`: one Worker fan-out job. `ruleId`: immutable saved rule identity. `outputId`: immutable identity of one planned R2 object.
- Setting ON: output ID/key is derived deterministically from `(captureId, canonicalDirectoryId)`; include all contributing rule IDs in its receipt. Setting OFF: derive from `(captureId, ruleId, canonicalDirectoryId)` with a stable ordinal only if a truly distinct explicit intent exists.
- Retry of an existing output uses SAME IDs/keys and first checks durable verified/pending state, so a lost ACK or Worker restart cannot duplicate cloud files. A genuinely new keypress uses a fresh captureId/key. If original bytes are no longer available after an interrupted job, do not recapture and call it the same retry.
- Use durable per-output claims, conditional writes/readback and idempotent partial recovery where possible. An HTTP 202/worker acceptance is not proof the object exists in R2.

### 4. Canonical directory identities

- Directory identity = provider + immutable authorized connection/account + exact verified bucket/container identity + provider-canonical directory key prefix. Use this SAME pure identity logic in rules/planning and trusted validation; display labels never define identity.
- R2 key prefixes are case-sensitive: no arbitrary lowercasing, Unicode rewriting, percent-decoding, path collapsing or imagined folder equality. Normalize only representations proven equivalent by the provider, e.g. a validated root/trailing directory delimiter.
- Two visually identical folder names in different accounts or buckets are DISTINCT; different exact R2 prefixes remain distinct; the same actual bucket+prefix has one identity even if selected through different UI aliases.

## UI and card semantics — frozen

- Shelf **More → Screenshot** shows a simple **Website/URL scope → authorized Cloudflare directory → Save** form and the saved screenshot cards beneath it (25 per page, unlimited pages). This creator makes **website-only additive cards**; it has NO shortcut field and does not capture on Save.
- Saved cards show their name, website scope, destinations/summary, **Active ON/OFF** independent toggle and **X Delete**. Clicking the card body opens its type-specific full manager; toggle/X must not open the editor or capture anything. Disabled cards stay saved and editable; deletion removes configuration, not cloud objects.
- Saved Screenshot card editor has two scrollable lists: **Websites (OR conditions; empty = All websites)** and **Destinations (one or more folders)**; v0.3.21 has **NO per-card shortcut field or editor**. Each card remains independently addressable by immutable rule ID.
- File Explorer directory right-click **Screenshot2Here** is a compact setup popup: create a normal screenshot website→folder rule, OR select an exact saved card by stable ruleId and choose **Add this folder** or **Replace selected folder** (select exact old destination row). **NO shortcut entry, configuration or reassignment.** Save only edits rules; Cancel leaves cards unchanged.
- Chrome browser-command assignments are verified for the single logical screenshot signal and its optional fallback; all screenshot cards are automatically subscribed. Retain independent Explorer F7/F8/F9 UI-local shortcuts. No Exclusive Save, priority/owner takeover or shortcut-per-rule configuration.

## Authorization and Worker limitations

- Current `src/cloudflare/worker.mjs` validates a single account/bucket/prefix capability, and `right2cloud-module/src/cloudflare-worker.mjs` writes a single destination. A screenshot-specific multi-target Worker extension is NEW work. Implement trustworthy SAME-bucket multi-prefix fan-out first, with independent signed/scoped target validation; other buckets/accounts only after actual configured permissions/bindings and tests.
- Reuse existing recorder, File API and conditional/verified R2 write patterns; do not rewrite Simple, Narrow, Depth, right-click saves or create a parallel diagnostics/Worker service.

## Required test matrix

| Case | Capture / browser upload | Physical R2 outputs |
|---|---|---|
| No matching active screenshot rule | 0 / 0 | 0 |
| 100 active cards share one logical screenshot signal and match | 1 / 1 | Depends only on dedup and distinct rule→folder intents |
| Ten distinct matching rules → same canonical directory, setting ON | 1 / 1 | 1 new file |
| Same ten rules → same directory, setting OFF | 1 / 1 | 10 different files |
| One card has three matching website conditions and one target | 1 / 1 | 1 file regardless of ON/OFF |
| Three distinct canonical directories, setting ON | 1 / 1 | 3 files |
| Two distinct intentional shortcut keypresses | 2 / 2 | Two fresh capture identities; never coalesce events |
| One-off browser right-click Screenshot to folder X | 1 / 1 | Exactly one in X, not other additive-rule folders |

Also test same display folder across distinct accounts, R2 case sensitivity, mid-upload config mutation, navigation/tab switching, 26+ paginated cards, invalid Chrome binding, stale authorization, a forged Worker destination, second-target write failure, response loss, per-output retry, no duplicate file on retry and unrelated right-click/History regressions.

## Freeze / change-control statement

**FROZEN (with Nov 20 owner-approved shortcut UX refinement):** one Chrome-wide-in-browser logical screenshot signal (preferred Alt+Q, fallback Ctrl+Shift+Y), no screenshot per-card shortcut UI, all active matching website/folder cards subscribed, additive matching, one card counted once, no Exclusive Save, default dedup ON, per-rule copies OFF, one capture/upload, one-off chosen-folder exception, UI entry points, canonical identity and immutable/idempotent execution. Further semantic changes require owner approval.

**Status as of freeze:** The documentation is committed. The new screenshot engine, Chrome registration and multi-target Worker were NOT demonstrated in a real installed extension or R2 in this document.

Historical details and the deep audit: [previous Screenshot handoff](../next-codex/SCREENSHOT_TO_CLOUD_CONTEXT_MENU_AND_ADDITIVE_RULES_2026-11-19.md) and [architecture audit](../next-codex/SCREENSHOT_AND_AUTOREROUTE_ARCHITECTURE_AUDIT_2026-11-20.md). If they conflict, THIS frozen contract wins.