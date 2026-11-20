# Screenshot Logic — FROZEN V1 Execution Contract

**Status:** DESIGN FROZEN by owner, November 20, 2026. **Location:** `/screenshot-logic/`. **Purpose:** the single concise, authoritative implementation contract for the Click2Cloud Screenshot-to-Cloud engine. This freezes behavior, not a claim that feature code already exists or passed live tests. Do NOT alter its user-visible semantics without a new owner decision.

## Non-negotiable behavior

- **Keyboard shortcut = SIGNAL**, not a screenshot operation belonging to an individual card. ONE supported user keypress emits ONE screenshot signal, creates ONE capture of the entire visible webpage viewport of the active tab, and initiates ONE browser-to-Worker upload; all eligible rules are listeners.
- Multiple **ACTIVE** screenshot shortcut cards may use the SAME assigned key combination. ALL matching cards contribute their saved destinations. Never ask to deactivate a previously assigned screenshot card. No shortcut-card winner or priority, no Exclusive Save, no automatic rule deactivation.
- Every matching **website-only additive rule** also contributes its authorized destination when a supported screenshot shortcut capture occurs. Website-only rules never initiate screenshots on their own.
- A shortcut card may contain zero or more website conditions and one or more destination folders. Its website conditions are **OR**, NOT separate output claims: if several conditions on ONE card match, that card still contributes each of its folders **once**. Empty website list = All websites. A single card must not contain the exact same authorized destination twice.
- **Settings → Screenshot → Single file per screenshot per directory** is **ON by default**, persisted. ON means one NEW screenshot object per canonical directory FOR THE CURRENT CAPTURE, even if 100 rules request it. OFF means one distinct new object per matching `ruleId → canonicalDirectoryId` association. A NEW keypress creates a NEW screenshot, even if yesterday's screenshot is already in that directory. No historical directory scans for deduplication.
- A right-click browser **Screenshot → chosen folder** is explicitly a SINGLE-target, user-triggered capture and does not implicitly activate the additive shortcut listener set. The `Screenshot2Here` File Explorer right-click action CONFIGURES a shortcut-to-folder route; pressing its Save button never captures anything.
- Only user-triggered, permission-authorized captures. Default content is the **whole VISIBLE active-tab viewport**, with no crop (not the browser address bar/tab strip, other tabs, hidden page, full scrollable webpage or other monitors). Never misrepresent the capture extent.

## Canonical components and sequence

1. **One central screenshot signal dispatcher** listens for actual Chrome command events (or the explicitly authorized one-off screenshot action). A screenshot shortcut signal includes normalized real registered command/keys and stable trigger type. Many saved screenshot cards SUBSCRIBE to the signal; cards do not register separate Chrome event listeners or independently invoke capture.
2. **Bind trusted browser state:** record window ID, active tab ID, current observed URL and navigation identity with one immutable configuration snapshot/version. If no active shortcut-bearing card matches the real key AND trusted page, do not capture; website-only rules alone cannot trigger capture.
3. **Pure rule matching:** include EVERY active same-signal shortcut card whose 0+ website OR-conditions match the page; add EVERY active matching website-only rule; record each contributing immutable rule ID once. Match website scopes precisely: All websites; domain + subdomains; exact hostname (all paths); exact normalized page URL. Avoid hostname substring traps, stale queries or untrusted webpage text.
4. **Build ONE immutable capture plan** with `signalId`, `captureId`, `jobId`, trusted tab/window/page, matched rule IDs, per-rule authorized targets, exact canonical destination identities, dedup setting, planned output IDs/keys and configuration version. Freeze it before upload. Changes to cards, scope, activation, destinations, shortcuts or dedup settings affect ONLY later captures.
5. **Apply dedup switch:** ON groups output intents by exact canonical directory; OFF retains one output for each distinct rule→directory association. Overlapping website conditions in the same card do not create extra intents. A rule cannot add the same destination twice.
6. **Capture once:** `chrome.tabs.captureVisibleTab(windowId)` captures the current active tab of THAT WINDOW, not a tabId parameter. Check active tab/window/navigation before and after capture. Abort WITHOUT uploading potentially wrong-page pixels if tab identity, focus or navigation is uncertain. Honor actual Chrome permission and screenshot restrictions.
7. **Upload once to the existing trusted Click2Cloud Worker**, with a securely scoped, bounded payload and validated immutable plan. The Worker independently authorizes EVERY target and performs per-destination physical writes. Limit memory, write concurrency and workload; one upload body is not a reusable one-shot stream without explicitly safe buffering/staging.
8. **Verify and receipt:** One aggregate job and independent physical-output states: pending / verified / failed / uncertain / skipped. Record contributing rules, canonical targets, object keys, bytes, timestamps, attempts and actual verification evidence in existing shared recorder and Raw/Secure exports, never image pixels or credentials. Partial success is not total success.

## The four mandatory reliability safeguards

### 1. Central signal dispatcher

- Preserve existing `src/api/shortcuts.mjs` protection between unrelated commands such as Screenshot and Toggle Shelf/History. Its current unique-command bindings cannot be reused as a one-rule-per-shortcut registry; keep an independent many-rule-to-one-signal subscription relation.
- Browser-wide shortcut support requires a real `commands` declaration in `extension/manifest.json` and an actual Chrome assignment (`chrome.commands.getAll()` / `chrome://extensions/shortcuts`). The current manifest has no such registration. A local UI-stored shortcut is NOT automatically a Chrome-wide hotkey.
- The current local shortcut validator reserves `Ctrl+Shift+F6` even though old docs suggest it as a default. Audit why, resolve real conflicts, and do not claim that example works until Chrome reports it assigned.
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
- Shortcut-card manager has two scrollable editors: **Websites (OR conditions; empty = All websites)** and **Destinations (one or more folders)**; a saved card's shortcut can be edited only through its own manager. Never edit another card because they share the same shortcut string.
- File Explorer directory right-click **Screenshot2Here** is a compact setup popup: create a shortcut card, OR select an exact saved card by stable ruleId and choose **Add this folder** or **Replace selected folder** (select exact old destination row). Save persists a card edit only; Cancel leaves all cards unchanged.
- Existing unrelated Chrome command collisions are blocked; two screenshot cards with the same supported shortcut are deliberately NOT a conflict. No Exclusive Save or priority/owner takeover logic anywhere.

## Authorization and Worker limitations

- Current `src/cloudflare/worker.mjs` validates a single account/bucket/prefix capability, and `right2cloud-module/src/cloudflare-worker.mjs` writes a single destination. A screenshot-specific multi-target Worker extension is NEW work. Implement trustworthy SAME-bucket multi-prefix fan-out first, with independent signed/scoped target validation; other buckets/accounts only after actual configured permissions/bindings and tests.
- Reuse existing recorder, File API and conditional/verified R2 write patterns; do not rewrite Simple, Narrow, Depth, right-click saves or create a parallel diagnostics/Worker service.

## Required test matrix

| Case | Capture / browser upload | Physical R2 outputs |
|---|---|---|
| No matching active shortcut card | 0 / 0 | 0 |
| 100 active cards share one shortcut and match | 1 / 1 | Depends only on dedup and distinct rule→folder intents |
| Ten distinct matching rules → same canonical directory, setting ON | 1 / 1 | 1 new file |
| Same ten rules → same directory, setting OFF | 1 / 1 | 10 different files |
| One card has three matching website conditions and one target | 1 / 1 | 1 file regardless of ON/OFF |
| Three distinct canonical directories, setting ON | 1 / 1 | 3 files |
| Two distinct intentional shortcut keypresses | 2 / 2 | Two fresh capture identities; never coalesce events |
| One-off browser right-click Screenshot to folder X | 1 / 1 | Exactly one in X, not other additive-rule folders |

Also test same display folder across distinct accounts, R2 case sensitivity, mid-upload config mutation, navigation/tab switching, 26+ paginated cards, invalid Chrome binding, stale authorization, a forged Worker destination, second-target write failure, response loss, per-output retry, no duplicate file on retry and unrelated right-click/History regressions.

## Freeze / change-control statement

**FROZEN:** signal semantics, additive matching, one card counted once, no Exclusive Save, default dedup ON, per-rule copies OFF, one capture/upload, one-off chosen-folder exception, UI entry points, canonical identity and immutable/idempotent execution. Any new request that changes these semantics needs explicit owner approval. Codex may fix implementation details and add tests without rewriting this contract.

**Status as of freeze:** The documentation is committed. The new screenshot engine, Chrome registration and multi-target Worker were NOT demonstrated in a real installed extension or R2 in this document.

Historical details and the deep audit: [previous Screenshot handoff](../next-codex/SCREENSHOT_TO_CLOUD_CONTEXT_MENU_AND_ADDITIVE_RULES_2026-11-19.md) and [architecture audit](../next-codex/SCREENSHOT_AND_AUTOREROUTE_ARCHITECTURE_AUDIT_2026-11-20.md). If they conflict, THIS frozen contract wins.