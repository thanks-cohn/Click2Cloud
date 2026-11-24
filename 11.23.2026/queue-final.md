# OWNER P0 OVERRIDE — 0.3.24-ONLY QUEUE / UX RESTART (2026-11-24)

> **CONTROLLING RULE: This header supersedes every contradictory baseline, branch, screenshot-shortcut default, implementation, and test claim in the original document below.** This branch contains revised documentation, not an implemented Queue V2.

## Immutable starting point

- **AUTHORIZED SOURCE FOUNDATION:** REDOWN **0.3.24**, exact Git commit `cd4c8dd3bc11700376d30da050d6050a0eb1edb9`, exact tag `redown-0.3.24-KNOWN-GOOD-FOUNDATION-2026-11-23`.
- **ONLY AUTHORIZED WORK BRANCH:** `codex/queue-history-v2-0324-verified-2026-11-24`. This branch was created directly from `cd4c8dd3bc11700376d30da050d6050a0eb1edb9`; maintain that ancestry throughout the run.
- **Documentation-only donor:** `1c1e6ea23f0f062740463d923fb53a8efdbbd544` contains the original Queue request/spec/audit. Copy its **three Markdown documents only**. Its application source, `main` head, and package version are NOT authorized starting points.
- **BLACKLIST / IGNORE:** `codex/queue-history-v2-2026-11-24`, `queue-v2-review`, and any Queue V2 implementation based on 0.3.23. NEVER merge/rebase/cherry-pick/copy/port its source as implementation, even to accelerate work. Do not use 0.3.25 as the baseline. Do not switch back to `main` to implement. Treat previous Queue test claims as nontransferable to 0.3.24.
- **STOP BEFORE CODING** if `git merge-base HEAD cd4c8dd3bc11700376d30da050d6050a0eb1edb9` does not equal `cd4c8dd3bc11700376d30da050d6050a0eb1edb9`, if working on a different branch, if the ORIGINAL BASE COMMIT (`cd4c8dd3`) did not identify 0.3.24, if the CURRENT authorized branch does not now identify **0.3.26** in `package.json`, `package-lock.json`, `extension/manifest.json`, or if the original four Remotes cards are missing. Original 0.3.24 base and current 0.3.26 work-branch version are intentionally different. Print any mismatch; never switch to 0.3.23, 0.3.25, `main`, or rejected Queue implementation.
- Begin with read-only baseline and parity inventory; then checkpoint-driven implementation ONLY in this branch. No destructive resets, no Chrome storage clearing, no cloud mutations merely to exercise UI.

## Mandatory preservation / regression gates

- Preserve the **FOUR stacked Remotes cards** from 0.3.24: **Google Drive, OneDrive, Dropbox, Cloudflare R2**; preserve `extension/basic-provider-cards.mjs`, all Basic API auth/status/pending-save/Continue save behaviors, Cloudflare onboarding, icons, button actions, existing data, and per-provider readiness logic.
- Preserve the **existing Remotes identity**: `All Your Clouds. / One Place.`; three Basic provider cards; `The Future is NOW. / True Remote is Here.`; separate Cloudflare R2 card. Apply ONLY authorized action-button layout cleanup. NO card deletion, consolidation, fake placeholders, `PROVIDER_NOT_IMPLEMENTED` fallback, or redesign that hides providers.
- Preserve File Explorer, screenshots, context menus (Depth, Narrow, Simple), connection/auth, current-store recovery and diagnostics, existing History, existing themes incl. Frames and Remote V1, keyboard shortcuts, right-click save, and cold boot. Queue/History observers must not block saving.
- **Screenshots form dropdown, NEW rules only:** in the **Screenshot Shortcut** select, show **Alt+Q preselected by default** when creating a rule. The existing blank/**None** option MUST REMAIN selectable, as must every other supported command. Do not automatically register/change Chrome shortcuts, create a screenshot rule, capture a screenshot, or overwrite existing rule selections. Editing an existing rule must keep its saved shortcut (including None); only the initial new-rule form selection changes. If Alt+Q is unassigned in Chrome, show the truthful actual status; do not fake a binding. Verify new rule Alt+Q, switch to None and save, edit existing None/other, reload and verify persistence.
- Queue V2 + History V2 must consume actual 0.3.24 provider/screenshot receipt and API contracts. Build truthful source-adapter coverage matrix. Do not use old Queue mocks or passing tests as provider integration evidence. Existing History continues working throughout alpha; no cutover without later owner approval.
- **Required gates before claiming success:** original 0.3.24 baseline inventory; four card UI and basic-provider service proof; screenshot form default/None/edit proof; side-by-side preserve/regress matrix; unit/integration/browser tests with explicit limitations; 100,000-record benchmark; full ZIP integrity/export proof; real Chrome and signed-in-provider checks separately labeled VERIFIED or UNVERIFIED. A failing preservation gate is a failed run irrespective of passing Queue tests.
- Never claim an extension installation or verified Chrome-profile state from unit tests. Never delete/replace a user's Chrome extension or storage.

Read `11.23.2026/BASELINE_AND_ACCEPTANCE_0324.md` first, then `AGENTS.md`, `CODEX_REQUEST_QUEUE_AND_UX.md`, `queue-final.md`, and `FINAL_CONSISTENCY_AUDIT.md`. `queue-final.md` is authoritative for Queue/History V2 functionality **subject to this immutable foundation/preservation override**. Superseded `queue.md` remains historical only.

---

# Click2Cloud — Unified Queue and Chronology-First History V2

**Proposal date:** 2026-11-23  
**Canonical document:** `11.23.2026/queue-final.md`  
**Status:** FINAL CONSOLIDATED PRODUCT SPECIFICATION for the focused Queue + approved UX Codex run; implementation, testing, and owner approval remain pending.  
**Scope:** Queue/History V2 plus only the explicitly approved UX changes in `CODEX_REQUEST_QUEUE_AND_UX.md`; no Screenshot Manifests, provider rewrites, or permanent History cutover.  
**Codex entry point:** `11.23.2026/CODEX_REQUEST_QUEUE_AND_UX.md` (which points here). This specification replaces conflicting historical drafts. `queue.md` is retained unmodified only for reference. Screenshot Manifests remain a separate, deferred work order.

> **The central idea:** Existing cloud-saving engines remain independent. Their APIs and durable receipts supply metadata to a small History Coordinator. The coordinator reconciles records by stable identity, persists them, and indexes them **chronologically**. During alpha, the Queue tab displays **Live Jobs above the actual future History V2**. At the later owner-authorized cutover, **Live Jobs remains the complete standalone Queue tab** and **the same History V2 module moves into the History tab**, without rewriting either engine. The temporary Queue History visibility timer is retired at cutover, without deleting historical data.

---

## Final decision lock — applies throughout this document

These are the **approved, non-optional product decisions**. If an older example, prior conversation or superseded planning document differs, use the decisions below and the active Codex request. Do not execute the future cutover in this run.

1. **During alpha:** one Queue tab shows a **complete professional Live Jobs manager above the new full History V2**; old History stays intact as a fallback. Both new modules must be independently mountable and scriptable/testable through existing production contracts.
2. **After a separately authorized cutover:** **Queue keeps the entire Live Jobs manager** and **History receives the same finished History V2**. Fully retire the old History implementation **only after verified parity, data continuity and approved rollback**. No duplicate new History feed remains inside Queue by default, and the temporary 15-minute Queue History visibility timer is removed. The cutover is **not** part of this work order.
3. **History content:** all real save attempts across Basic/Click2Cloud providers and screenshots, **unified by chronology**; exactly one stable record/card per destination-specific attempt, with its own timestamp. No new History events for rename, move, delete or other routine file management. Existing rename actions may update an existing saved record when reliably matched.
4. **Full parity:** the new History must preserve every applicable existing History field, source/host/asset/remote URL, available action, export, media preview, calendar hierarchy (day/week/month/year), and navigation behavior; show **`N/A`** for unavailable enabled fields. Compact/Full cards are **view presets**, not separate data models.
5. **Live Jobs:** active/working first; waiting last; failures/blocked/uncertain remain accessible for attention. Load **10 rows initially**, then lazy/virtualized scrolling. Jobs with authoritative success clear promptly **only after durable History acceptance or a safe recoverable checkpoint**. Jobs are never governed by the History visibility timer.
6. **Independent lifecycle and archive controls:** Live Jobs lifecycle; default **15-minute Hide** for terminal cards temporarily shown in Queue (OFF reveals retained entries); **History V2 archive retention** (Unlimited or user-configurable positive record cap; the *suggested initial capped-mode value is 200,000*, not a hard-coded maximum); **explicit Clear All History V2**. Cap overflow evicts the **oldest V2 metadata/cards**, never remote/cloud files. Hide never deletes. Destructive controls require informed approval, reliable source-reimport suppression, and recovery tests; unsafe destructive operations must fail closed rather than pretend to work.
7. **Pagination:** First `⏮`, Previous `◀`, **editable page number**, Next `▶`, Last `⏭`; correct total count, deep direct page jumps and accurate query-level filtering. **100,000 metadata entries is a synthetic benchmark, never a storage or interface cap; 200,000 is only the suggested *editable capped-mode number*.** Do not bulk-hydrate the database, calendar group, preview files, or exporter.
8. **Settings and export:** a top-level **Queue** category retains applicable existing History controls. The detailed **Export Queue History** Settings subsection appears only when the temporary 15-minute cleanup is OFF. **Regardless of that toggle, History V2 always offers an unobtrusive `Export Complete History ZIP` action from its own History toolbar/menu starting in alpha**; the export service is always callable, even for hidden retained records. One ZIP covers the whole retained archive (or an explicitly selected date range) rather than a page, with normalized records, available provider proof metadata, counts, manifest and integrity evidence; Diagnostics remains unchanged.
9. **Approved UX only:** customizable top navigation defaults to **Files | Remotes | Queue | Settings | ⋯**, History is in More by default, **Downloads never appears in More even under Debug Mode**, Remote V1 preserves all original Settings/status text, modern themes hide the two designated cards/status copy, Keyboard Shortcuts gets compact non-overflow indicators. **Remotes cards: Login *or* Reconnect top-right with padding; Refresh and GO TO bottom-right**, presentation-only, preserving auth and button behavior.
10. **Release safety:** preserve independent saving engines, no new privileged automation endpoint, no unauthorized live cloud mutation, no fabricated 403 recovery or verification claim, and no permanent History replacement in this run. Use checkpointed implementation, mock/integration/real-Chrome/provider evidence, and explicit PASS/FAIL/BLOCKED/UNVERIFIED results.

---

## 1. Product principles — non-negotiable

1. **Chronology unites everything.** Saves from Cloudflare R2/original Click2Cloud and Basic providers (Google Drive, OneDrive, Dropbox, and other actually supported providers) appear on one timeline, interleaved by timestamp. Screenshots belong to this same timeline.
2. **One destination-specific save attempt = one History record/card.** Each record has its own stable identity and timestamp. A multi-destination user action creates separate destination-specific records, linked to one parent action if available. A later status update must update the same record, never create a fictional second save.
3. **History V2 is a full successor, not a lightweight activity feed.** Audit current History and preserve **every verified field, action, preview/navigation capability, and export behavior**, plus cross-provider chronology and future presentation flexibility.
4. **No general file-operation activity log.** Renaming, moving, copying, or deleting a file does **not** create a new History entry. Where a rename of an already-saved object can be matched reliably, its original save card may reflect the current filename/location, but it retains its original save identity and timestamp; uncertain matches remain unchanged.
5. **Metadata locally; images on demand.** Store metadata, object locators, URLs where available, and compact evidence; do not bulk-store full images or preview bytes in History. Preview images come from the existing authorized URL/API path only when needed.
6. **Saving engines own saving.** The Queue, History, gallery, Settings, and coordinator are observers/consumers; they never become prerequisites for right-click saves, screenshots, authentication, upload, or provider verification. No second upload engine.
7. **Presentation never destroys data.** Hidden fields remain in the record and exports. The default 15-minute Hide policy affects only Queue visibility. Permanent deletion is an explicitly chosen, separately verified operation. **ZIP export must include hidden-but-retained records and remain accessible regardless of Queue visibility mode.**
8. **No false claims.** A provider success response, an independently verified saved object, and successful local History accounting are distinct facts. Show `N/A` for unavailable fields; never invent URLs, percentages, verification, timestamps, or successful outcomes.
9. **Alpha first.** Protect existing functionality, do deterministic tests against the real production contracts, and separately run real-browser/provider acceptance. Never declare release ready based only on mocks.
10. **Agent-native where safe.** Queue/History and approved UX operations should be scriptable, observable and verifiable through shared production logic and automated real-Chrome UI interaction where feasible, without introducing risky production hooks or changing the independent saving engines; see §9A.

## 2. Alpha UI — one Queue tab, two sections

The Queue tab contains two distinct, coordinated sections, with separate data retrieval and rendering:

```text
QUEUE
┌─────────────────────────────────────────────────────────────┐
│ LIVE JOBS                                                   │
│ Uploading screenshot-001.png   Cloudflare  18:42:11    64%  │
│ Uploading document.pdf         OneDrive    18:42:09    31%  │
│ Verifying reference.jpg        Google      18:41:58    N/A  │
│ Waiting photo-002.jpg          Dropbox     18:43:04    N/A  │
│                 (10 rows initially; scroll for more)        │
├─────────────────────────────────────────────────────────────┤
│ HISTORY V2                         [15-minute policy active] │
│ Nov 23, 2026                                                │
│ [photo.png         18:40:08  R2/Pictures  VERIFIED] [expand]│
│ [screenshot.png    18:38:12  Drive/Images UPLOADED] [expand]│
│ [notes.pdf         18:37:44  OneDrive/...  FAILED  ] [expand]│
│           Previous   Page 1 / N   Next                     │
└─────────────────────────────────────────────────────────────┘
```

Illustrative values only. The real interface follows the active Aesthetic API/theme, supports keyboard access and narrow widths, and never depends on mock records.

### 2.1 Upper section: Live Jobs

- Show **active/working operations first**, **waiting operations last**, in stable order within each state group. Where appropriate, show blocked/failed/uncertain entries as **Needs attention**, separately from running work, rather than silently losing them.
- Include screenshot-to-cloud jobs, normal right-click saves, and any other actual supported save/upload jobs from all providers.
- **Render/load 10 rows initially**, not 10 total. Support independently scrollable, effectively unbounded lazy loading of the **available job backlog**, with virtualization, bounded caches, stable scroll position, and no bulk DOM rendering.
- Each compact job row displays **filename, timestamp, real progress percentage if measurable, and clear state**. Provider/location can be added where space permits. Unknown numeric progress is **indeterminate or `N/A`, never fake 0%, 50%, or 100%**.
- Refresh affected rows efficiently from actual owner state; do not reconstruct the entire interface on every progress event. Avoid unbounded polling, timers, and listeners.
- A successful upload **clears from Live Jobs** once its success is authoritative **and its History record/receipt has been durably accepted or safely checkpointed for later reconciliation**. Do not leave successful jobs occupying the live list indefinitely.
- If the cloud saved successfully but History accounting temporarily failed, do not call the upload a failure or blindly retry bytes. Keep a visible recoverable `History sync needed`/attention indication until the receipt is safely reconciled; then clear the job.
- Failed, blocked, interrupted, and uncertain operations remain inspectable/actionable until acknowledged or resolved according to explicit policy; no silent disappearance or dangerous generic replay. Never assume a timed-out attempt failed to write remotely.
- Live Jobs **never** use the 15-minute History timer. Worker suspension/restart must not invent new jobs or lose admitted work.

### 2.1A Standalone-ready, professional Live Jobs manager (alpha and future)

- The **upper Jobs section must be the complete future standalone Queue tab**, merely hosted above History V2 during alpha. Implement it as an independently mountable, reusable module; do not build a disposable header or a second job engine.
- **Owner-approved final split (later, not in this run):** keep Live Jobs in Queue, relocate the exact tested History V2 module to the History tab, remove only the temporary lower History pane and its Queue-only 15-minute visibility policy. Do not duplicate records, migrate the database, re-upload anything, change provider ownership, or redesign the saving engines.
- Give the Queue a restrained, professional and confidence-inspiring UI: clearly labeled **Working**, **Waiting**, and **Needs attention** states; accurate state counts; filename, timestamp, provider/destination when available, and genuine progress or indeterminate feedback. Keep language unambiguous and actionable, not decorative.
- **Ten initial rows** means render/fetch batching, not a job-capacity limit. Use lazy independent scrolling/virtualization and stable, sensible ordering. Active operations precede waiting operations; uncertain, failed, and blocked cases remain visible in an attention section/filter until safely resolved or acknowledged.
- On authoritative success, clear the job from active Queue **only after a durable History receipt or recovery checkpoint**; the corresponding saved result appears in History V2. Do not leave successful jobs indefinitely or make them vanish without trace. Use a brief nonblocking completion indicator where an existing UI mechanism supports it.
- State accurately what the user needs to know: **Uploading**, **Verifying**, **Waiting**, **Needs login**, **Failed**, **Outcome uncertain**. A 403 does not automatically mean expired authentication; show the available provider-owned recovery path without automatically replaying a possibly completed write.
- When idle, show **No active jobs**—do not suggest that History is empty or that saving has stopped working. If History cannot load, Live Jobs must remain usable with a safe, clear status message.
- Preserve scroll, expanded details and keyboard focus across incremental progress events, tab switches, service-worker restarts, and narrow responsive layouts; maintain accessibility and all supported themes.
- Use **shared owner-state adapters**, not an alternative job scheduler or a second save pipeline. Make safe supported actions accessible through the existing production API; do not invent generic retry/cancel/remote mutation commands.
- Test Jobs and History V2 **mounted independently of one another**. The Queue must work even if History is closed or broken; History must work without the Queue being open. The future cutover is a small routing/composition change, **explicitly out of scope now**.

### 2.2 Lower section: full History V2

- This is the **actual new History system**, not a temporary notification feed.
- Show terminal saving outcomes (verified, uploaded without independent verification, failed, blocked, canceled, uncertain as applicable), each represented honestly. Nonterminal jobs stay above.
- Unite all providers and screenshots **in one strict chronology**, newest first by a documented timestamp rule; use deterministic tie-breakers.
- **Preserve the existing History calendar hierarchy** rather than flattening to a list of date labels: Today, Earlier This Week, Last Week / recent-week sections, then older records nested by **year → month → week → day**. Within each day, individual save cards remain sorted newest-first. Keep current expand/collapse behavior where supported, including pagination across the true indexed archive.
- Every card has its own **stable record identity, timestamp, filename, provider, and destination** when available; expand to reveal complete available information and actions.
- Supply accurate counts, search/filter/sort where existing History supports them, and **real pagination across the retained archive**. Bottom controls include **First (`⏮`), Previous (`◀`), editable numeric page input, Next (`▶`), Last (`⏭`)** with total pages and sensible disabled states. Typing a valid page number navigates directly; invalid/empty/out-of-range input is handled accessibly, without corrupting the selected page. Page controls are not limited to the recent or rendered window.
- Preserve exact current History behavior where verified: previews, gallery, lightbox, zoom, left/right navigation, `GO TO`/exact location, applicable inline rename, download/file actions, and every other existing History feature. Unsupported provider operations must be visibly capability-gated.
- **No new History event for a rename or move.** Existing History rename capability may operate on the saved object and update that card in place without changing its original save chronology. Rename itself is not logged as a save.
- Full History V2 can be viewed even if preview APIs are unavailable; show metadata and a clear preview-unavailable state, rather than dropping the record.

### 2.3 Calendar organization — preserve the proven History experience

- **Chronology is both the data index and the visual organization.** Reuse the actual current History grouping conventions rather than replace them with a flat list. The verified existing Shelf History implementation (`extension/shelf-history.js`, `organize`) uses a recent section (Today, Earlier This Week, Last Week, Two Weeks Ago, Three Weeks Ago as applicable), then older **year → month → ordinal week → day** grouping.
- Use the exact labels and grouping semantics supported by the owner's authorized Click2Cloud branch, after source audit; do not assume the ReDown default branch matches that build. Preserve day/week/month/year calendar behavior and the user's existing collapse/expand experience.
- Every save still owns its **own** card, stable ID and timestamp; the hierarchy is simply a set of chronological containers, not a new deduplication or record-identity boundary.
- Recent-week and older-month sections must transition correctly as time passes. Preserve proper ordering across year boundaries, daylight-saving changes, locale/timezone display, and years with very large archives.
- Group boundaries must work with indexed pagination without eagerly loading an entire day, week, month or year. Pagination must not silently duplicate or lose records at calendar boundaries.
- Match the existing History behavior before making cosmetic improvements; record deviations in the parity matrix and test Today, this week, previous weeks, older months, older years, new year transitions, and unknown dates.

### 2.4 Navigation — Downloads must not enter More

- **Do not show `Downloads` anywhere in the `⋯` More overflow menu, including with Debug Mode enabled.** This is a permanent product-navigation rule, not a cosmetic one-time hide.
- Apply the exclusion in the shared navigation/overflow registry, plus any debug-mode or fallback menu builders. Navigation reconfiguration, default resets, responsive overflow, theme switching and restart must not reintroduce it.
- Do not mistake this for permission to delete the Downloads implementation, records, APIs or other functionality. Preserve backend services and any authorized existing direct/internal routes, and document how users can access any still-supported feature without putting a `Downloads` item under More.
- Test both Debug Mode ON/OFF, all themes, narrow widths, customized tab arrangements and default reset. A debug-only duplicate Downloads entry is a regression.

### 2.5 Settings — label must be `Queue`, with full History options

- The user-facing Settings section for these controls is named **`Queue`**, not `History Queue`, `Queue History` or a second `History` settings panel.
- **Queue Settings is the home for the new History V2 controls** and must provide full parity with all *applicable* options and functionality currently offered by existing History Settings, plus the Queue-specific job/retention options. Inventory actual available settings first; do not guess or discard an option merely because it was not specifically named in this proposal.
- Reuse existing Settings contracts and values when safe; prevent option-name collisions or duplicated conflicting preferences between legacy History and Queue. The old History Settings and storage must remain intact during the alpha coexistence phase.
- The **Export Queue History** subsection belongs **inside Queue Settings** and is visible only when 15-minute automatic cleanup is OFF; the `Queue` parent section remains accessible regardless of cleanup state.
- Keep parity for existing supported export formats, date/day/week/month/year/all-time/custom range controls, plus other verified History Settings options. If a setting is inherently legacy-only, document and capability-gate it rather than silently dropping it.

### 2.6 Approved Remotes provider-card button arrangement (UX-only)

- **Login / Log in and Reconnect** are the existing primary account-access actions and both belong in the **top-right corner** of each applicable Remotes provider/destination card, with comfortable, theme-consistent top/right padding. Show **Login when disconnected or sign-in is needed** and **Reconnect when reconnection is applicable**, following the existing provider state and eligibility rules; do not force both controls to appear simultaneously or invent new authentication actions. Keep headings, status badges, account controls and error banners clear of the action area.
- **Refresh** and **GO TO** remain together in the **bottom-right** action area, with consistent spacing and responsive wrapping (Refresh before GO TO). Never move Login or Reconnect down beside them.
- Do not rewrite Login/Reconnect handlers, force either action for ineligible/unsupported providers, change provider permission/auth logic or break keyboard/ARIA semantics. Where a button is absent, do not reserve dead visual space. Preserve current conditional labels, loading/disabled states and keyboard focus.
- Implement across supported themes (including Remote V1) while preserving its separate Settings/status-copy parity. Confirm responsive, dark/light, **Login available**, **Reconnect available**, connected, disconnected, error, and loading states with browser interaction tests; verify there is no control collision in narrow cards.
- Treat this as the **only newly added Remotes-card layout scope**; do not redesign other card content.

## 3. Full History field parity: preserve *everything*, including URLs

Before modifying History, Codex must inventory both the **original Click2Cloud/Cloudflare History** and **Basic-provider History**, compare their actual storage contracts, UI fields, actions, export formats, edge cases, and screenshots. Record the comparison in a field-by-field and feature-by-feature parity matrix. Do not assume that the fields below are an exhaustive list; **the actual current implementation is authoritative**.

Fields to preserve when present include:

- Stable record ID, attempt ID, parent action ID and provider receipt/delivery ID.
- Provider, account reference, destination, bucket, remote folder/path, object key/file ID, namespace/drive ID, public/private designation where relevant.
- Filename, file type/MIME, extension, byte size, save method, operation type (ordinary save versus screenshot save), user-visible outcome.
- **Source URL, original/source-asset URL, host/page URL, remote/file URL, public URL, preview URL, and any other current URL field**, each with its **existing distinct meaning**. Do not silently substitute one for another.
- User action time, attempt/start time, terminal outcome time, record/update time, any verification time and meaningful existing timestamps.
- Verification method/evidence level, actual provider result, error code/message, retries/recovery information where available.
- Existing History links, preview/gallery/navigation targets and relevant metadata used to support actions.

**Missing-value rule:** If a field is enabled in the card and absent from the source record, show **`N/A`**. Never manufacture a host/source URL from an unrelated URL, invent a location, or claim verification based only on UI state.

For exports, preserve actual available metadata and field semantics, while avoiding accidental credential/secret disclosure. Use established secure/raw export conventions if present; specify exactly what each export variant includes.

## 4. History Coordinator — deliberately small and independent

```text
Original Click2Cloud/R2 receipts ─┐
                                   ├─> Read-only provider adapters / safe evidence feed
Basic provider jobs/receipts ──────┤                  │
Screenshot saving receipts ────────┘                  v
                                         HISTORY V2 COORDINATOR
                                      validate / normalize / reconcile
                                                   │
                                          durable IndexedDB index
                                                   │
                                   timestamp + stable record identity
                                                   │
                                                   v
                                            History V2 cards
                                            (durable records)

Live Jobs view  <── existing authoritative provider job state
(independent owner-backed projection, not a History-coordinator scheduler)
```

- Existing provider save state machines and verification rules remain the only authorities for actual saves.
- Adapters **read existing durable owner states/receipts** and normalize them; when a new event or receipt arrives, safely reconcile it into V2. Do not require invasive modifications to upload engines to satisfy UI needs.
- The coordinator validates schema, preserves provenance, assigns/derives stable namespaced V2 record identities, performs **idempotent upserts**, and indexes by chronology. It must not issue cloud writes, start OAuth, change destinations, or retry uploads.
- Provider adapter failures are isolated; one broken API must not blank the entire timeline.
- Startup/restart reconciliation must recover missing V2 indexes from durable source evidence **without duplicating records**; explicitly report any gaps if old source history was already truncated.
- Distinguish **cloud save outcome** from **local accounting outcome**. A verified remote object with an IndexedDB failure stays remotely verified, with an accounting warning and recoverable evidence.
- Keep original provider histories intact during this work order. No destructive merge or replacement of databases.
- Validate all schema and query inputs; do not allow URLs, filenames, or metadata from remote sources to become executable HTML.

### 4.1 Identity contract

- `actionId`: optional parent user action (e.g. one click saving to multiple clouds).
- `attemptId`: identity of the actual provider save attempt, stable through retry/recovery where available.
- `recordId`: stable **destination-specific** History V2 identity, namespaced by source/provider and collision-resistant; must not be based solely on filename, timestamp, size, URL, or display name.
- `providerObjectId` / object locator: remote file identity when available; a **file identity is not the same thing as a save-attempt identity**.
- `sourceRecordId`, `sourceApi`, and/or `deliveryId`: preserved provenance for reconciliation and diagnostics.
- Two saves to the same filename are two records if they are actually two distinct save attempts. One receipt replayed twice is **one** record. One user action saving to three clouds is **three destination-specific cards** and optionally one parent grouping.
- Renames update the existing saved object's display metadata only when reliably mapped; they do not modify `recordId`, count, original save timestamp, or create save events.

### 4.2 Timestamp contract

Store distinct timestamps where known: `requestedAt`, `startedAt`, `terminalAt`, `verifiedAt`, `recordedAt`, `updatedAt`.

- **Chronological position for terminal History:** use `terminalAt` (the outcome/completion event time) as the recommended immutable display-order timestamp. Show original request time in details. If existing History uses a different audited semantic, document and reconcile it explicitly rather than silently changing established behavior.
- Do not reorder a completed save because a later metadata update/rename arrived.
- Store numeric UTC epoch values internally; format in local timezone for user-facing labels; handle daylight-saving transitions.
- For equal timestamps, tie-break by stable `recordId`. For genuinely missing source timestamps, label the timestamp as unavailable/observed-at rather than fabricating a provider event time.
- The current time is for relative labels and the visibility filter, **not** the identity of an event.

### 4.3 Suggested minimal V2 envelope (illustrative, not an imposed replacement)

```json
{
  "schemaVersion": 1,
  "recordId": "cloudflare:account:attempt:destination",
  "actionId": "action-123",
  "attemptId": "attempt-456",
  "sourceApi": "click2cloud-r2",
  "provider": "cloudflare",
  "kind": "screenshot-save",
  "filename": "screenshot.png",
  "requestedAt": 1795488000000,
  "terminalAt": 1795488005000,
  "status": "verified",
  "destination": {"bucket": "pictures", "key": "captures/screenshot.png"},
  "sourceUrl": null,
  "hostUrl": null,
  "remoteUrl": null,
  "verification": {"level": "provider-object-readback", "result": "verified"}
}
```

Fields are examples only. Adapter schemas must be derived from **actual existing contracts**, preserve their existing distinctions, and make unavailable fields explicit. The UI displays `N/A` for `null` fields that are enabled for display.

## 5. Modular card-presentation API — full data, configurable display

Build **one History V2 engine and one reusable card system** with a validated, centralized, theme-compatible **presentation configuration**. The card must not hardcode individual provider schemas. Visibility switches affect **rendering only**, never data capture, storage, indexing, export, verification, or provider behavior.

### 5.1 Required presets

1. **Full History preset:** all applicable existing History fields, links and actions, with complete parity. Use this preset for alpha validation.
2. **Compact preset:** at minimum **filename, timestamp, location, and optional image preview that expands**. Other details are hidden, not deleted. Compact remains a reusable presentation preset, but the **approved eventual default** is standalone Queue for Jobs and standalone History for full History V2; no duplicate History list is required in Queue.
3. **Future user/custom preset support:** configuration-driven field visibility and component slots with explicit defaults. No need for a complex end-user editor in the first alpha, but the architecture must be extensible.

Example only:

```js
const full = {
  showFilename: true,
  showTimestamp: true,
  showLocation: true,
  showImagePreview: true,
  expandablePreview: true,
  showProvider: true,
  showSourceUrl: true,
  showHostUrl: true,
  showRemoteUrl: true,
  showFileSize: true,
  showVerification: true,
  showAdvancedDetails: true
};

const compact = {
  ...full,
  showSourceUrl: false,
  showHostUrl: false,
  showRemoteUrl: false,
  showFileSize: false,
  showVerification: false,
  showAdvancedDetails: false
};
```

- The exact field configuration must cover all **audited** legacy fields, not just this example.
- When a field is enabled but unavailable, display `N/A`; when disabled, remove the field and its layout gap entirely.
- Reuse current image preview, gallery, lightbox, zoom and keyboard behavior, with provider-aware access and clear failure fallback.
- Load preview media **only when visible or explicitly opened**, use bounded caching and cancellation, and release offscreen object URLs/decoding resources. Do not fetch 100,000 thumbnails at once.
- Respect all current themes, especially Remote V1 reference behavior and the Aesthetic API. No theme change may affect saving or stored history.
- A card configuration may be selected at the host/view level (`Queue`, `History`), so **the same record can look compact in Queue and full in History** without a second dataset.

## 6. Fifteen-minute Queue History visibility / retention

### 6.0 Three separate lifecycles — never conflate them

1. **Live Jobs lifetime:** Jobs stay in the upper panel while running/waiting. On authoritative success **and** durable History receipt or recoverable checkpoint, they clear from Jobs promptly. Failed/blocked/uncertain items remain actionable until resolution/acknowledgement under an independent Jobs policy. The 15-minute History visibility setting and History record cap cannot purge live or unresolved jobs.
2. **Queue History *visibility* lifetime:** By default the lower History cards are visible for 15 minutes from terminal outcome, then **hidden**, not removed from the retained archive. This can be switched OFF. Opt-in Delete is a separate destructive policy with explicit safety gates.
3. **History V2 archive *storage* retention:** **Default to Unlimited, without silent destruction**, bounded only by actual available browser/device storage. Independently offer opt-in **Capped** with an editable validated positive integer, suggested initial value **200,000** in capped mode. Capped means *retained V2 cards/metadata*, never saved cloud files, live jobs, diagnostic evidence, or the 100,000-record benchmark. At the cap, each newly accepted record may evict the **chronologically oldest** eligible V2 record(s), so the retained count stays at or below the chosen limit after safe maintenance. Nothing is held en masse in RAM. Enabling a destructive capped mode requires clear upfront consent, and reducing a cap below the current count requires an explicit impact preview/confirmation. If safe, idempotent eviction plus source-reimport suppression cannot be guaranteed, disable enforcement with a clear warning rather than silently dropping records. A count cap is not a *RAM cache cap*.
4. **Owner-initiated Clear All History V2:** Provide a separate, discoverable destructive control in **Queue Settings** that can permanently clear all **new History V2 metadata/cards and indexes**, regardless of whether automatic 15-minute hiding is ON or OFF. Show retained record count, clear scope, and irreversible consequences; offer **Export All History first** directly in the confirmation flow but allow the user to explicitly skip export. Require a second deliberate confirmation. This action never deletes remote cloud files, live Jobs, original legacy History during alpha, or independent forensic logs. Prevent wiped legacy records from being silently reimported after restart without suppressing genuinely new saves.

The **Queue** Settings card groups these controls clearly, as one would adjust shortcuts in Settings: Live Jobs behavior; lower Queue History visibility (15-minute Hide/Delete/OFF); History archive retention (**Unlimited** or **editable cap, suggested 200,000**, with oldest-record rollover); a separate **Clear All History V2** action; and applicable legacy History controls. Settings changes cannot require loading or rewriting the whole archive, except bounded explicitly authorized destructive maintenance for changed caps or full clear.

### 6.1 Settings contract

These controls are inside the user-facing **Queue** Settings section. Preserve and audit all applicable existing History Settings options here, without removing the original History preferences during alpha.

Default: **Automatic History Cleanup ON; 15 minutes; action = HIDE**.

Offer three effective configurations:

| Setting | Visible Queue History behavior | Underlying V2 records |
| --- | --- | --- |
| ON + **Hide** (default) | Terminal cards disappear from Queue after 15 minutes | **Retained**; can reappear with cleanup OFF |
| ON + **Delete** (explicit opt-in) | Terminal cards disappear after 15 minutes | Eligible V2 records **deleted** under confirmed, narrowly scoped retention policy |
| **OFF** | Complete retained chronology visible with pagination | **Retained**, no timer |

- Count 15 minutes from the **terminal outcome timestamp**; never from the original queued/requested time. Long-running or waiting jobs must not vanish on completion.
- Hidden entries remain indexed and exportable through the underlying API, even though their cards are not displayed in default Queue mode. Disabling cleanup immediately reveals retained hidden entries.
- **Delete is genuinely destructive to the new V2 archive**, not a hide flag. Require explicit confirmation and explain that original legacy histories, independent diagnostics, and cloud files are not deleted. No deletion of actual cloud assets.
- Avoid surprising retroactive mass deletion when the user switches from Hide/OFF to Delete. Use a separately documented effective-from policy and request additional approval for any retroactive scope.
- Prevent intentionally deleted V2 entries from silently reappearing after adapter rescans (bounded tombstones or an equivalently reliable exclusion policy); document associated storage costs, retention and recovery limitations.
- Cleanup must use transactional, restart-safe, bounded batches, including index removal. Never run destructive maintenance on the upload-critical path.
- Persist the setting across restarts; respond immediately to changes without leaving empty layout space.
- **Alpha release counsel:** implement and test the Delete option only if safe reconciliation and non-reimport guarantees are demonstrated. If not yet proven, ship it disabled with a documented reason. **Do not silently downgrade Delete to Hide.**

### 6.1A Archive capacity: Unlimited, editable cap, and oldest-record eviction

- Add an independent **History V2 storage limit** control inside the user-facing **Queue** Settings card. Default to **Unlimited** on first use; provide **Unlimited** and explicit opt-in **Capped** selections. Capped contains a clearly labeled editable numeric field: **Maximum History records**, prefilled with a **suggested 200,000**. Users can replace it with another valid positive safe integer at any time. *The suggestion is not a hard ceiling; 100,000 remains a benchmark only.* Unlimited means no application-imposed count cap, not infinite disk/quota.
- For newly installed configurations, do not silently turn on destructive capped eviction: require affirmative acceptance of the cap policy when selecting/enabling Capped. Remember the accepted selection across restarts. The suggested number **200,000** must be displayed before enabling. Do not show repeat confirmations for each ordinary overflow after opt-in.
- **Capped rollover semantics:** when the next eligible new History V2 card would exceed the limit, insert/update the authoritative record and remove the **oldest eligible V2 records by chronology**, using stable identity for timestamp ties. This is *logical archive eviction/pruning*, **NOT overwriting remote files or reusing existing History IDs**. An update to an existing card must not count as an additional entry or cause needless eviction. Preserve newest records and chronologically correct counts. Never evict live/waiting jobs, pending verification evidence, recoverable receipts or unrelated diagnostics.
- If the user lowers the maximum below the current retained count, show **current count**, **new maximum**, **number of V2 records proposed for eviction**, and an export-first option; require a separate confirmation. On cancellation, change nothing. Increasing the cap or selecting Unlimited must never cause deletions, nor can it recreate records already evicted.
- Use IndexedDB chronological indexes and bounded, checkpointed eviction batches/transactions; avoid reading all rows into JS, giant storage rewrites, UI blocking or risky synchronous work in upload-critical paths. Avoid leaking read transactions while pruning; handle concurrent insert/update, browser restarts, transaction failure and quota pressure. The archived record count and pagination must remain consistent after recovery.
- Because original provider/legacy receipt stores can be scanned later, reliably prevent *intentional cap-evicted or cleared V2 entries* from immediately reappearing on next projection/backfill. Specify a scalable source-checkpoint / exclusion strategy and test it with delayed receipts, restarted workers and account changes. Do not let a blanket timestamp cutoff discard valid new saves that legitimately arrive late.
- If the safe eviction contract cannot be met, **do not simulate eviction by hiding records** or claim the cap is enforced. Mark the control blocked, report why, and protect retained data; deliver the non-destructive Unlimited path rather than risking history corruption.

### 6.1B Clear All History V2 (explicit user command)

- Add a dedicated **Clear All History V2** action to Queue Settings, visibly separate from Hide/Delete timer controls, archive cap and Live Jobs. It is available regardless of timer state. Do **not** call it Clear Queue, because that may imply stopping active uploads.
- Before clearing, show the actual retained record count and spell out the precise scope: **all locally retained new History V2 entries/cards and indexes**, across all providers and screenshots. **Cloud files, provider accounts, active/queued/attention jobs, original legacy History during alpha, and independent forensic diagnostics are unaffected.**
- Offer **Export All History Before Clearing** in the confirmation workflow, using the same complete bounded export service even when `Export Queue History` is hidden under timer ON. **Export is recommended but optional**: the user may intentionally skip it, then confirm permanent deletion explicitly. Never claim completion before the archive and its indexes are actually cleared and the durable no-reimport checkpoint is committed.
- Make clear **this is not merely Hide**, and that previously evicted/deleted records are not restored by turning timer OFF or selecting Unlimited. Include an accessible cancel path, guarded confirmation, state-change isolation, and safe retry/recovery on interruption. Provide truthful progress/status for large clears without blocking normal upload execution.
- Clean up only V2-owned records/indexes and corresponding V2 presentation data, under transactional durability guarantees; do not delete provider-owned receipts or interfere with their save pathways. Introduce an appropriately scoped durable ingestion-generation/checkpoint or equivalent strategy so the same old source History does not immediately repopulate V2, while newly completed saves continue to be recorded normally.
- Agent-scriptable tests must cover clear with/without export, timer ON/OFF, 0/1/100,000 records, interrupted purge, restart, permission/quota errors, concurrent new saves, repeated clear, legacy reimport suppression, and post-clear fresh save. Never assert that clearing local metadata deleted a remote object.

### 6.2 Conditional Queue Settings subsection: Export Queue History

- The **top-level Settings section is labeled `Queue`**. Inside it, create an **Export Queue History** subsection/controls, not a separate top-level Settings category.
- While automatic cleanup is **ON** (Hide or Delete), **hide only the Export Queue History subsection and its related controls**, leaving Queue Settings and other applicable History-equivalent options available. Do not leave an empty layout gap.
- When automatic cleanup is **OFF**, **immediately reveal the complete Export Queue History subsection** inside Queue Settings with the same supported time ranges, export formats and applicable export options as current History.
- Match audited existing export controls; include supported choices for **Today/day, week, month, year, all time, and custom start/end range** where available. Do not invent options the old exporter cannot implement; extend it explicitly where needed.
- Underlying export service remains independently callable/testable even when the Settings card is hidden. **The small `Export Complete History ZIP` action on the History V2 view remains visible/available even while the detailed Settings export subsection is hidden**; it always covers all retained records unless a range is explicitly chosen. Turning cleanup OFF grants access to previously hidden retained cards, not deleted ones. See §6.2A.
- Export the **entire selected history range**, including records not loaded in the current page and all providers/screenshots. Preserve chronology, IDs, available URLs and metadata, original field meaning, statuses and verification distinctions. **ZIP is mandatory from alpha day one**; parity-preserving alternate formats may remain alongside it.
- Reuse established History export infrastructure/format options when possible. Use bounded batches, downloadable result with counts, and integrity evidence (e.g. manifest/checksum where appropriate), without staging the whole archive in memory.
- Do not include OAuth tokens, secrets, signed authorization parameters or other sensitive credentials unintentionally. Document redaction and raw/secure distinctions if both formats exist.
- Original History and its download/export facilities remain untouched in this work order.

### 6.2A Single-ZIP History V2 export — required from alpha day one

**This is part of Work Order 01, not deferred. It does not modify the independent Diagnostics, flight recorder, diagnostic exporter, or cloud upload/verification engines.**

- Provide **`Export Complete History ZIP` immediately in the History V2 toolbar or its compact overflow menu**. It must be keyboard accessible and unobtrusive, and work with Queue auto-hide **ON (Hide or Delete)** or **OFF**. This is distinct from the **detailed `Export Queue History` Settings subsection**, which remains hidden while auto-hide is ON exactly as previously decided. The `Clear All History V2` export-first confirmation may reuse the same ZIP exporter. The future permanent History tab retains this export action when History V2 moves there.
- A single invocation produces **one user-downloadable `.zip`** containing the **full selected set of locally retained History V2 records** across supported Basic and Click2Cloud providers and screenshot saves, even when cards are hidden by the 15-minute display rule, collapsed, on other pages or absent from memory. The default action is **All retained History V2**; optional existing-style day/week/month/year/custom-range export controls are available when selected. Be explicit that cap-evicted, permanently deleted, unavailable or never-recorded events **cannot** be recreated by export.
- The ZIP must be **structured and independently verifiable**, with a versioned `manifest.json` (schema/exporter version, created-at, selected UTC interval and time-zone interpretation, applied filtering, expected/written record counts, provider/outcome counts, source coverage/gaps, record sort order, file list, integrity digests) plus one complete, chronologically ordered **machine-readable records dataset** such as `history.jsonl`. Include JSON or CSV summaries/receipts only when useful and reasonably cheap; do **not** duplicate large byte payloads, cached thumbnails, source images, credentials, raw OAuth material or the Diagnostics archive. Preserve safe correlation identifiers (`recordId`, `attemptId`, provider IDs and delivery/receipt IDs when available) so exports can be compared with a **separate diagnostics export** later. Existing History export formats/actions must remain available according to the parity audit.
- For each record, preserve available filename, operation kind, original requested/terminal/verified timestamps, provider/account/destination and object references, source/host/original/remote/public URLs with correct semantics, remote result, upload and independent-verification evidence level, error codes and uncertainties. Represent absent fields as `null` in machine-readable data (`N/A` is a **UI** label); never fabricate proof or replace a missing URL with an unrelated one. A ZIP proves **what the extension recorded**, not necessarily that every remote object still exists. Distinguish verified-by-provider-proof, uploaded-only, blocked/failed/uncertain, and local accounting pending.
- **Sensitive data:** never export tokens, passwords, API secrets, private authorization headers, signed URL credentials or login session material. Provide a **safe/redacted ZIP by default**. When existing authorized raw-export conventions are present, an explicitly selected raw-metadata variant may preserve sensitive *non-secret* URL/path metadata with a clear privacy warning and documented boundaries; raw must **still exclude credentials**. Exports intended for diagnostic comparison must keep stable pseudonymous/correlation identifiers consistently so redacted History and separately exported Diagnostics can be joined without exposing secrets. If this cannot be safely established, stop or redact the risky field, record the limitation and do not assert a lossless raw export.
- **Memory-safe and restart-safe:** read records in bounded indexed batches/cursors and write ZIP entries using an actual bounded streaming or backpressure-aware strategy appropriate to available Chrome extension APIs. **Chunked DB reads followed by one giant in-memory Blob/string/array is not compliant.** Do not add a new unsafe browser permission or backend service simply to stream. If the platform cannot safely stream a large ZIP, provide a tested bounded-capacity fallback with explicit size limits/error before allocation rather than promising unlimited memory-safe downloads. Export is read-only; it never queues cloud saves or performs fresh cloud verification.
- **Consistent snapshot:** define a clear export high-watermark/snapshot boundary (e.g., an immutable set of record IDs/ordering cut off at export start, with version checking or an audited equivalent) so concurrent new saves, updates, cap eviction and Clear All cannot cause silently missed/duplicated records. Prefer preventing destructive V2 maintenance while the export snapshot is active or use a sound snapshot scheme. On interruption, incomplete files are not presented as successful exports. The ZIP manifest counts and hashes must match the actual ZIP entries, and ZIP integrity must be checked by a separate parser/verifier.
- **Machine-verifiable tests:** generate and export 0, 1, 50, 100,000 synthetic metadata records (without loading their images), validate ZIP with an independent reader, compare sorted IDs and counts to a consistent database snapshot, and test active 15-minute Hide, cleanup OFF, optional Delete, full/custom date ranges, duplicate IDs, missing URLs, concurrent arrivals, interrupted downloads, low disk/quota, and export-first Clear All. Measure peak *app-managed export memory* and runtime without claiming total Chrome process memory is fixed. Real provider proof requires separate authorized tests; never claim a synthetic ZIP proves actual cloud persistence.
- **Early alpha feasibility gate:** BEFORE integrating the full History UI, demonstrate that the chosen ZIP writer and download path work inside an actual unpacked Chrome extension. It must generate and independently verify a **single complete 100,000-record ZIP** with bounded app-managed memory. If this fails, mark mandatory ZIP export **BLOCKED** and the alpha work order **incomplete**; never substitute a partial ZIP or call a small-fixture mock a pass. Larger-than-tested archives must fail safely and clearly, not silently truncate.

**Primary design goal:** one complete ZIP gives the owner a portable, factual record of what History V2 knows and how it classified each attempt, making later cross-checking with unchanged Diagnostics possible.

## 7. Performance: 100,000-entry benchmark, adjustable retention, bounded memory

**Initial *benchmark*: 100,000 History V2 metadata entries, NOT a permanent record limit and NOT 100,000 live cloud uploads.** The user may choose Unlimited retention or set a custom positive maximum in Queue Settings (**suggested capped-mode value 200,000; automatically evict the oldest V2 metadata/card after the cap is reached, only when that policy has been safely authorized and verified**). The million-entry stress benchmark is deferred; records are not arbitrarily capped at 100,000.

- Generate 100,000 **deterministic synthetic metadata** records across the provider types, screenshot/ordinary saves, duplicate-looking names, timestamps, missing fields, and all terminal outcomes.
- Measure actual IndexedDB record/index size and overhead; do not promise a fixed storage size based on raw JSON estimates. Typical 500 B–2 KB raw metadata would be approximately 50–200 MB for 100,000 records, excluding DB overhead and varying evidence payload sizes.
- Use indexed chronology (`timestamp`, `recordId`), efficient date/range queries, and pagination that does not scan or hydrate all records.
- Prefer indexed cursor/keyset paging for sequential access. The UI **must** provide `⏮ First | ◀ Previous | [editable page number] / total | Next ▶ | Last ⏭`, with keyboard submission and validated/clamped numeric input. First/Last should use suitable index-direction access; arbitrary page-N jumps require sparse/indexed page anchors, a bounded offset-seek fallback, or an equivalent verified strategy. Do not promise constant-time random jumps without an index; benchmark deep direct jumps at 100,000 records. Ensure stable ordering during concurrent insertions, active visibility filters, and date grouping.
- Test **capped-mode 200,000 → 200,001 rollover** and a user-chosen smaller cap in a separate synthetic test; because the baseline benchmark is 100,000, do not misrepresent that baseline as evidence the 200,000 threshold was tested. Test explicit full archive purge separately. Use sparse bounded batches, not an in-memory list of all records.
- Render only the current page/card window. Never collect an entire day/week/month/year into a JavaScript array merely to group or count it. Apply the 15-minute visibility condition at the query layer **before** counting and paging. Keep the upper Jobs list independently virtualized and initially limited to 10 visible/fetched rows.
- Use lazy preview loading, decode cancellation and bounded memory caches; do not store or download original image bytes simply to list History.
- Export in chunks/streams, with honest progress, total count, schema/version, and reconciliation checks; test user cancellation/interruption and restart behavior. Never concatenate all chunks into a giant in-memory Blob as the last step. Define a consistent export snapshot boundary.
- Aim for only a few MiB of additional **application-controlled metadata/page buffers** during normal browsing, with bounded job rows, preview cache and export batches. This is a measured design target, not a guarantee about Chrome, decoded images, IndexedDB internals, or total process RAM. Test repeated open/close, filters, first/last/direct page jumps, archive reopening, partial corruption, quota pressure and 100k export. Report actual timings (including p95), peak incremental memory, output sizes, and hardware/browser environment. No invented performance claims.
- A storage quota failure must be visible and diagnosable. Saving engines must remain independent, while available receipts can be safely retried into History when storage recovers.

## 8. Provider/API correctness and authorization safeguards

- All provider results come from the actual Basic and original Click2Cloud APIs and authenticated receipts. Do not create a generic replacement cloud upload stack.
- Verify auth, permission, token expiration, scopes, rate limits, destination identity, and browser worker recovery using the existing provider-specific policies.
- HTTP 403 is **not** automatically an expired-token error. Distinguish explicit token-invalid responses from permission denial and rate limiting; never blindly refresh or repeat cloud writes.
- Reuse existing verified-success validators. Preserve `verified` versus `uploaded-but-unverified` versus `failed`/`blocked`/`uncertain` distinctions. A status field alone is not verification evidence.
- Preserve the exact provider object locator required for later preview/GO TO; don't assume an original URL or public URL stays valid indefinitely.
- When old authenticated previews require reauthentication, show an appropriate reconnect/open error without losing the historical card or claiming the file is missing.
- Do not expose credential-bearing URLs in presentation or exports; validate/sanitize external strings before use.

## 9. Alpha safety and implementation phases

Work only on **owner-authorized repositories and branches**. Read `AGENTS.md`; verify the actual target source ref, and do not assume ReDown `main` equals the current Click2Cloud branch. Preserve uncommitted changes and preexisting tests. No push/merge/deployment without explicit authorization.

**Implementation sequence (aligned with the active Codex request):**

1. **Read-only source audit and test baseline.** Confirm owner-authorized branches and commits; inspect existing History/Queue/job/accounting/export APIs; inventory all fields, settings, actions and Calendar behavior; produce a full parity matrix. No guessing from ReDown `main` if that is not the supplied Click2Cloud branch.
2. **Early real-Chrome ZIP feasibility and approved UX in isolation.** Before integrating the full History view, prove with a self-contained synthetic IndexedDB fixture that the actual unpacked Chrome extension can create/download and independently verify a complete single **100,000-record ZIP** with bounded app-managed memory. If this cannot be proven, report the P0 mandatory export gate as BLOCKED; do not silently downgrade it. Then implement modular navigation, Downloads exclusion from More, Remote V1 theme preservation, modern-theme presentation hiding, compact Keyboard Shortcuts display, and Remotes button placement (Login/Reconnect top-right; Refresh/GO TO bottom-right). Test layout and actions before beginning production-storage changes.
3. **Coordinator/storage and failure recovery.** Define small adapter contracts, source and destination identities, timestamp semantics and transactional idempotent upserts. Preserve existing History and saving engines. Backfill only in bounded, resumable batches; test restarts, concurrent updates and accounting failure.
4. **Indexed queries and scale proof.** Implement calendar-aware keyset pagination and honest counts, First/Previous/number/Next/Last access, visible-versus-retained filtering, independent Unlimited/custom cap configuration, secure full-range export. Benchmark 100,000 **synthetic metadata** entries, not real uploads or an artificial record cap.
5. **Professional standalone-ready Live Jobs and full History V2 views.** Build independent mounts, Jobs' 10-row lazy scrolling and safe success-clearing, full existing History parity, image previews on demand, Full/Compact card presets and accessible status/attention/empty states. During this run only, show Jobs above History V2 in Queue.
6. **Queue-only visibility settings and presentation.** Default 15-minute Hide; OFF revealing the retained archive; Delete/cap eviction only behind verified safety gates or visibly disabled. Show the `Export Queue History` Settings subsection only with automatic cleanup OFF. Ensure no timer/cleanup affects active Jobs.
7. **Regression, scripted Chrome and authorized provider acceptance.** Test real production contracts, actual UI gestures, memory/time bounds, clean/restored storage, 401/403 classification and provider-owned verification. Keep old History accessible, report unresolved blockers, and **STOP without cutover**.

**Execution scope:** Only the UX changes enumerated in `CODEX_REQUEST_QUEUE_AND_UX.md` accompany Queue/History V2. Screenshot Manifest work and the permanent replacement/retirement of old History are separate, owner-authorized work; this run only prepares safe boundaries for the later cutover.

## 9A. Agent-native engineering: automate the real application, not a copy of it

**Product philosophy:** Within the currently authorized Queue/History V2 and UX scope, make the implementation **programmatically operable, observable, and verifiable**. Human controls and agents should reach the **same underlying application logic** through different interaction surfaces. This is subordinate to saving-engine reliability, security, maintainability, and the small/simple product experience. It must **not** introduce a parallel upload engine, production automation server, new provider credentials, network port, or generalized app rewrite.

### 9A.1 Internal contracts first

- Favor small internal service contracts and validated interfaces for History queries/record reconciliation, Queue job presentation, retention preferences, page navigation, card field visibility, and Settings. Prefer to reuse existing APIs/DI seams; add only those essential to this scoped work.
- Human click handlers should be thin callers of these same contracts. Automated tests may invoke the underlying operations through test adapters, then separately exercise UI gestures and assert the same state. No duplicated business rules in test-only code.
- Providers and Chrome lifecycle authorities remain independently owned. Testability must never require altering a stable OAuth flow, upload protocol, retry schedule, native-menu registration, screenshot pipeline, or permission boundary.
- Do not confuse internal APIs with public HTTP endpoints. Do not expose writable, privileged or secret-bearing interfaces to web pages or external processes solely for automation. Test fixtures/failure injection belong in isolated test harnesses, not unlocked production modes.

### 9A.2 Layered, realistic automated verification

1. **Deterministic simulation:** seeded datasets (including 100k synthetic History records as a benchmark, not cap), years of timestamps, many projected jobs, 401/403 failures, corrupted/missing fields, duplicate/out-of-order receipts, IDB failures, exact paging and retention transitions. Injection uses existing production contracts with mocked external boundaries, and never performs uncontrolled real cloud writes.
2. **Actual Chrome integration:** load the real built extension in a disposable profile; use established browser-control tools to click buttons, type page numbers, expand cards, navigate `⋯`, switch themes, change Settings, verify persisted state, open previews, and exercise exports. Test keyboard/focus, narrow windows, Debug Mode, service-worker termination/restart and multiwindow storage behavior wherever tooling permits.
3. **True provider/native acceptance:** separately verify installed Chrome context menus, OAuth, real provider permissions and selected authorized saves. Synthetic `chrome.contextMenus` events and mocked 403 responses are useful tests but **not** evidence that native menus or genuine cloud saves worked. Where the agent cannot automate a gesture or grant, document a precise owner-assisted test rather than declaring success.

### 9A.3 Observability, stress and evidence

- Prefer safe read-only structured diagnostics identifying attempt/record identities, queue status, completion times, reconciliation state, page boundaries/counts, export integrity, and sanitized error categories. Never log/expose OAuth tokens, sensitive query strings, or raw user content.
- Assert the complete system invariants (one record per destination-specific attempt; replay idempotence; successful Jobs clear after durable receipt; missing preview never deletes its card; History/Queue failures never break saving; real pagination does not hydrate all records; calendar organization respects date boundaries; Downloads never appears in More).
- Capture exact fixture seeds, commands, exit codes, Chrome/build revisions, performance and memory measurements, structured JSON result artifacts, and browser screenshots when appropriate. Separate PASS/FAIL/BLOCKED/UNVERIFIED. Preserve reproducible failures rather than modifying tests to produce green results.
- Provide two test lanes: a fast deterministic suite for ordinary changes, and separately runnable heavy 100k/large-job/installed-Chrome/provider tests. Do not demand impossible simultaneous real uploads or load entire fixtures into process RAM just to stress the presentation.
- Produce a **coverage and automation-limitations matrix**, identifying testable internal operations, real UI interaction coverage, and all genuine provider/native behaviors still requiring validation.

**Guardrail:** Agent operability is a quality requirement for the in-scope product, not authorization for new features. If an automation seam raises security, complexity, or save-stability risk, avoid it and document the limitation. The shipped app must run normally even if every test harness is removed.

## 10. Test and acceptance matrix

Build meaningful unit, integration, failure-injection and real-browser tests (approximately 100 per major relevant category where useful; **coverage is more important than a numeric quota**).

**A. IDs and chronology**
- Same name across providers; different names for same remote object; distinct saves to same destination; one action to multiple destinations; repeated receipts; out-of-order provider events; equal timestamps; DST/date boundaries; missing times; account changes; rename updates without additional save cards; screenshots interleaved.

**B. Coordinator and durability**
- Worker restarts before/after upload, verify and History commit; duplicate delivery; IndexedDB unavailable/full/blocked; partial/out-of-order receipts; provider adapter failure isolation; backfill/legacy source coverage; restart/idempotent repair without reuploading bytes.

**C. Live Jobs**
- Ten initial rows; 11th and deep lazy scroll; 100k history with many queued jobs; stable working/waiting order; genuine progress versus indeterminate; successful job clears **after safe History reconciliation**; blocked/failed attention remains; ongoing jobs never expire after 15 minutes; repeated opening without listener/memory leak.

**D. History parity and media**
- All verified legacy fields including distinct source/host/remote URLs; enabled missing fields render `N/A`; Full preset matches legacy features; compact preset only hides presentation; **automatic day/week/month/year grouping with current History labels, collapsible sections and indexed pagination across boundaries**; gallery/lightbox/zoom/keyboard; preview auth expiry; precise GO TO; provider-specific rename capability; no rename/move/delete entries.
- **Navigation/Settings regressions:** Downloads never appears in the `⋯` More menu even with Debug Mode ON, after reset, on narrow widths or after theme switching. User-facing Settings section is `Queue` and exposes all audited, applicable History Settings options without altering original History preferences.

**E. Retention and exports**
- Default 15-minute Hide; timer starts at terminal time; OFF reveals hidden retained records; Delete requires confirmation, has nonretroactive default and cannot accidentally delete cloud files/legacy History; no silent reimport; **detailed Settings export subsection hidden while ON, available when OFF, but one complete History ZIP action is always available from the History view**; full/date-range export of the complete retained dataset with count and integrity comparison.
- ZIP validation: versioned manifest and sorted metadata records; absent URLs as `null`; no tokens; statuses/proof levels preserved; stable IDs for later correlation with untouched Diagnostics; run an independent ZIP reader/checksum verifier and reconcile all 100,000 synthetic record identities and counts against a fixed export boundary. Ensure interrupted/failed/low-storage ZIP generation never reports success or causes excessive memory use.

**F. Performance and provider regressions**
- 100,000 synthetic metadata records with accurate indexed pagination and no missing/duplicate records; bounded preview/RAM; multi-batch complete export; app responsive during listing; real installed Chrome right-click routing (Simple, Narrow, Depth), screenshot saves, provider OAuth/permissions, 403 classification, worker recovery, current History and theme regressions.

**Additional retention/pagination acceptance**
- `Unlimited` archive mode and custom count caps (e.g., 3, 500, 100,000 and above) are configurable in **Queue Settings**, persisted, validated, and isolated from the 15-minute UI visibility setting and independent Jobs lifetime. Count-limit changes do not bulk load History into memory. Destructive eviction requires its own safety acceptance; don't pass a fake cap that only hides rows.
- Test four navigation arrows plus editable page-number input (first, previous, arbitrary middle, next, last), correct disabled states, invalid input, deep jumps, direct jumps after new writes, and filters including 15-minute Hide. Page and calendar-query results are bounded.
- Test memory with 100,000 retained records without hydrating all of them; normal metadata/page buffers target a few MiB incremental, with honest process-wide measurements and exceptions reported.

**G. Agent-native coverage / actual browser interaction**
- Verify both direct internal-contract calls and browser-driven user interactions use the same application operations for navigation, Queue Settings, pagination, card presets, export and state. Confirm the harness can click/type/scroll, preserve focus, inspect results and verify persistence in an actual extension context.
- Scripted fault injection (MV3 worker stop, IDB abort/quota, duplicate/late receipts, auth denied/403, preview failure, export interruption) must produce deterministic, machine-checkable outcomes without adding a production backdoor or second upload implementation.
- Produce a repeatable fast test command, a separate heavy 100k benchmark command, a real-Chrome UI command, and a sanitized machine-readable report with PASS/FAIL/BLOCKED/UNVERIFIED and evidence per invariant. Explicitly list any native-menu/OAuth/provider steps requiring human validation.

### Release gates — do not waive

- **Exact record count and ordering** pass for 100,000 synthetic metadata items as a benchmark, **not** a maximum; no silent truncation at existing Queue or compatibility limits. Unlimited/custom retention settings and all four pagination arrows plus direct page input behave correctly.
- Every successful operation either has its corresponding durable History record or a **durable, visible, recoverable accounting-pending state**, with no duplicate upload.
- Real provider saves and representative auth/403 error paths are tested separately from mocks; unverified providers are not described as verified.
- History/Queue/UI crash cannot prevent or fabricate a native right-click or screenshot save.
- Existing History remains accessible as a fallback until full parity is demonstrated; **its calendar organization by day/week/month/year must be reproduced** in V2.
- Downloads never appears under `⋯` More (Debug Mode ON or OFF); the new Settings category is labeled `Queue`, retains applicable existing History Settings options, and conditionally reveals `Export Queue History` only when cleanup is OFF.
- No unknown delete behavior, cloud-file deletion side effect, or loss of old records during V2 development.
- **Complete History ZIP is downloadable from the first alpha implementation regardless of Queue visibility timer.** ZIP contains versioned manifest, normalized records, counts, actual available provider outcomes and proof levels, identifiers usable in later *separate* Diagnostics comparisons, and independent integrity checks; no credential leakage. Streaming or proven bounded fallback is required. Full historical range and counts/hashes reconcile on large synthetic datasets. Diagnostics implementation stays untouched.
- Actual tests, failures, environment, command lines, commits, and remaining risks are documented; no unsupported claim that alpha is ready.

## 11. Approved future split: standalone Queue + standalone History V2

**The final destination is decided; only the cutover date is deferred. Do not perform it in this Codex run.**

- **Queue tab stays:** A full, professional **Live Jobs manager** for working, waiting and needs-attention operations, real progress, accurate counts and safe provider-owned controls. Never treat the Jobs module as temporary or discard it after History moves.
- **History tab receives:** The **same History V2 engine and card module** already tested beneath Jobs in the alpha Queue. It retains chronology, the existing day/week/month/year structure, fields/URLs, previews, search, pagination, complete exports and optional presentation presets. **The goal is to completely retire and replace the previous History implementation**, not preserve it indefinitely; remove the legacy UI/routes/read paths only in a separate, owner-approved cutover after exact feature/field parity, complete retained data availability, accurate exports and rollback checkpoints are verified.
- **Remove only:** the temporary lower History pane from Queue and the 15-minute Queue-only History visibility rule. History in its permanent tab shows the retained archive subject to separately configured **archive retention**, not the temporary Queue display timer. Never delete records as a byproduct of the move.
- **No duplicate databases, migrations or upload rewrites.** Use independently mountable presentation modules and stable coordinator/owner contracts; the cutover should be a route/layout composition change. Keep old History available until owner-approved parity and migration acceptance.
- **Clear user mental model:** Queue answers *What is working, waiting or needs attention?* History answers *What was saved or attempted, when and where?* A successfully reconciled job clears from Queue and remains available in History.
- **Compact card flags stay reusable** if desired later; do not add a competing second History feed back into Queue by default.
- **Future validation:** independently mount Queue/History; exercise multiple windows, failed History storage, restarts, empty states, export, no missed/duplicate cards, no altered save timestamps and no save-engine regressions.

**Current alpha remains unchanged:** both sections are stacked in Queue; the existing old History tab stays untouched until a separately authorized cutover.

## 12. Required handoff artifacts from Codex

Place implementation documentation/evidence for Work Order 01 under the owner-approved project documentation path; link this proposal as the source of Queue/History requirements.

Deliver:

1. Actual source inventory for Basic, original Click2Cloud, screenshot, Queue, History, and export APIs, with file paths and commit refs.
2. Field-by-field and feature-by-feature **History parity matrix**, marking implemented / tested / unverified / unsupported by provider.
3. Versioned normalized-record schema, adapter contracts, identity and chronological sort rules, idempotent upsert/reconciliation algorithm and failure semantics.
4. IndexedDB storage/query/export design, migration/backfill strategy, deleted-record policy and explicit finite-storage caveats.
5. Standalone-ready Live Jobs owner/recovery integration, trustworthy professional status/attention/empty-state UX, safe success-clearing, independent mounting and virtualized/lazy rendering.
6. Full/Compact card configurations and examples of toggles (`showSourceUrl`, `showHostUrl`, etc.), with evidence that hidden fields are retained.
7. Retention and **Queue-labeled** Settings-export UI state table, full History Settings parity audit, Downloads exclusion from More (including Debug Mode), calendar hierarchy parity, test scenarios, cancellation and restart behavior.
8. 100k synthetic dataset generator, exact tests and results, record count comparisons, storage footprint, RAM/performance measurements and **single-ZIP export plus independent ZIP-integrity/manifest verification evidence** (including benchmark peak app-managed memory).
9. Small, authorized real-browser/provider acceptance evidence and reproducible 401/403/permission/accounting failure fixtures.
10. Baseline/regression report, known issues, explicit release blockers, working branch and commit hash. No claim of deployment or production verification without evidence.
11. **Agent-native testability handoff:** source/API seam map, UI automation script(s), deterministic fixtures/fault-injection instructions, machine-readable evidence, exact reproduction commands, and an automation-coverage/limitations matrix separating synthetic, installed-Chrome and genuine provider verification.

---

## Single Codex execution entry point

**Use `11.23.2026/CODEX_REQUEST_QUEUE_AND_UX.md` to start the current Codex run.** It must read this **`queue-final.md`** as the sole canonical Queue/History V2 specification. The original `queue.md` is an unmodified historical reference, **not** a second set of instructions. Do not launch deferred work, rebuild a saving engine, or perform the final History cutover.

**Final invariant:** *Providers save. Receipts establish their supported proof levels. The coordinator reconciles. Chronology orders. Cards present. One History ZIP exports what was actually recorded. Diagnostics remains independent. The Queue cannot break saving.*

---

## OWNER P0 RECONFIRMATION — 2026-11-24

This revised document is hosted on branch `codex/queue-history-v2-0324-verified-2026-11-24`, based on exact REDOWN 0.3.24 commit `cd4c8dd3bc11700376d30da050d6050a0eb1edb9`. Documentation was copied from `1c1e6ea23f0f062740463d923fb53a8efdbbd544` without importing its application source. Previous `codex/queue-history-v2-2026-11-24` is forbidden and must be ignored entirely for implementation. The new Screenshots rule shortcut defaults to Alt+Q while **None remains selectable**, with all existing values preserved. For conflicts, the controlling P0 override and `BASELINE_AND_ACCEPTANCE_0324.md` govern.

---

## OWNER-APPROVED ADDENDUM — INLINE DOWNLOAD ON EVERY HISTORY V2 CARD

**Mandatory, in this current alpha implementation:** Every History V2 save-result card, whether rendered in the Queue History region now or in the independently reusable History V2 component later, must have an **always-visible textual Download control** in its collapsed/header action area. **No expansion, More/Details submenu, preview/lightbox or separate Downloads tab** is necessary to download an actual supported saved file. This overrides any earlier card layout example that places Download only inside expanded details. Apply to both Compact and Full presets and all themes, with narrow-layout wrapping, keyboard and screen reader access.

**Semantics:** Download the remote saved object using existing authorized provider-owning file/download APIs from the 0.3.24 foundation; do NOT download the History record or ZIP, initiate another cloud save, mutate provider state, or create a new save-history event. Use source receipt/capability checks; if the object/provider cannot currently download, retain the visible disabled button with honest explanatory state rather than promise success. Multi-destination screenshot results require explicit matching to the chosen output, not arbitrary selection. Avoid fetching/buffering bytes until clicked; ensure bounded streaming/memory and no effect on other jobs/History. Keep **Export Complete History ZIP** separate and unchanged, and continue excluding the Downloads navigation entry from More.

**Acceptance:** The dedicated `11.23.2026/CHANGE_REQUEST_HISTORY_V2_CARD_DOWNLOAD.md` is the owner-approved test and implementation contract; include collapsed-card visuals, real provider readback where available, unsupported/expired-permission/missing-object scenarios, unchanged source receipts, accessibility and regression proof. Stop and report any unverified provider rather than assuming downloads work.

---

## OWNER-APPROVED RELEASE 0.3.26 + TOP-NAV VISIBILITY SETTINGS (MANDATORY)

**Exact source ancestry:** REDOWN 0.3.24 `cd4c8dd3`. **Work-branch and output extension version:** **0.3.26**. Source `package.json`, `package-lock.json`, `extension/manifest.json` and `src/build-info.mjs` have been bumped; the generated Chrome unpacked manifest must report **0.3.26**. Do not interpret the immutable 0.3.24 foundation as a requirement to keep the new version number at 0.3.24. The exact behavior and acceptance tests are in `11.23.2026/CHANGE_REQUEST_VERSION_0326_NAV_VISIBILITY.md`.

**Header tabs are USER-MODIFIABLE IN SETTINGS:** the Settings **Customize Navigation** card contains per-eligible-tab **Show in Top Bar** controls. Every supported tab can be independently pinned top or placed under `⋯ More` (except Downloads: it must never appear in More). Default top **Files | Remotes | Queue | Settings | ⋯**, History in More; users can move History to top, move Queue or Settings off the top without losing the section, and reset defaults. Persist across Chrome reloads and visual themes, preserve only one route per tab, preserve access to Settings from More if unpinned, and handle responsive overflow without silently altering preferences. This is a required FUNCTIONAL navigation system, not a decorative default header.
