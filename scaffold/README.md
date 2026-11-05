# Click2Cloud V3+1 — Documentation-Only Scaffold

**Status: DOCUMENTATION ONLY. This is the design and implementation handoff for Codex; no UI prototype, production V3+1 engine, provider auth, live cloud operations, native Chrome menu changes, or CURRENT storage work is implemented by this scaffold.**

Use this Markdown specification as the starting point for future **V3+1 right-click engine** construction. Existing Click2Cloud code, REDOWN source references, and the Universal File API boundary remain architectural inputs, not completed integration. No runnable demo or live save is supplied here.

## Product boundary — V3+1 is the engine

**V3+1** is responsible for canonical destination configuration, Simple/Narrow/Depth projection, deterministic menu nodes, the native Chrome context-menu registration/receipts, account-aware click resolution, persistence and recovery. Cloudflare **TRUE REMOTE** is a **provider-specific transport strategy** behind V3+1, NOT the name or architecture of this engine. Google Drive/Dropbox/OneDrive remain independent provider adapters.

## UX contract to implement

1. The Click2Cloud dashboard reuses its own **Universal File API** for a real File Explorer. A user selects a folder; at the top of that Explorer/dashboard is **+ Right Click**. Clicking it opens **one reusable destination editor** for the exact selected account/bucket/prefix. The Explorer may also surface the same command in its local folder context menu.
2. **The ONE `+ Right Click` popup has THREE configuration tabs: Simple / Narrow / Depth**, plus a persistent **Show in Chrome** area directly ABOVE its fixed-bottom **Save / Cancel** buttons. Simple and Narrow edit exact selected/clicked folder destinations. Depth configures per-bucket **Chrome display** participation and depth (new bucket default **10**, NOT a hardcoded maximum). Only Narrow exposes its two-column Menu Titles tab. The Show area independently chooses Simple, Narrow and Depth ON/OFF; **All** turns all three on; **Flat** is an exclusive Cloudflare direct-save presentation. Saved destinations are NEVER deleted when hidden. Configuration edits and Show selections are DRAFTS until explicit **Save**; Cancel/Escape discards all popup drafts.
3. **Simple = one submenu pop-out.** Save an exact folder with an optional menu title; native Chrome **REDOWN → Cloudflare → [saved destination title]** displays one destination leaf inside the Cloudflare submenu, without a hierarchy of folders. Multiple saved Simple options may be siblings; an omitted title falls back to the selected folder/bucket name. When **only the default uncustomized `redown` root** exists, **REDOWN → Cloudflare** is itself an actionable leaf, next to other cloud provider leaves.
4. **Narrow = branches into submenus.** Selecting Narrow INSTANTLY reveals a second popup tab **Menu Titles**. It has **two columns**, top to bottom: actual source bucket/folder segment on LEFT (readonly), corresponding **optional** editable menu display title on RIGHT. It begins at actual bucket, continues through each ancestor, and ends at the exact chosen directory. The Setup Menu Title populates the RIGHT field of the **BOTTOM row**, and changes in that field update Setup bidirectionally. If labels remain blank, use actual segment names in output. Save compiles a natural submenu tree of the configured ancestor path; **not** a single flattened leaf.
5. Switching **Narrow → Simple** makes **Menu Titles disappear entirely** (not a disabled tab). If the user was on Menu Titles, return to Setup safely. Switching to Narrow again reveals it with unsaved draft values preserved; no actual cloud folders are renamed.
6. **REMOVE the separate Explorer hierarchy/tree toggle entirely.** The ONLY user control for what Chrome displays is **Show in Chrome**, inside the `+ Right Click` popup above Save: independent Simple/Narrow/Depth toggles, **All** shortcut, and exclusive **Flat** mode. Depth's third configuration tab separately chooses enabled display buckets and each bucket's displayed depth (default 10, without an app-imposed maximum). Depth display requires BOTH the saved Show:Depth selection AND a saved enabled bucket. If either is OFF/empty, Depth contributes no Chrome branches; Simple and Narrow visibility depend on their own saved Show toggles. Neither switching display nor choosing Flat mutates saved destinations or recovery settings.
7. **Manage Destinations** is available from the Click2Cloud File Explorer (top button and Explorer local right-click menu) and from the small circular **pointer icon beneath/right of the dashboard odometer**. In the final native Chrome menu, **REDOWN → Manage Destinations** is an optional sibling entry; a Settings switch can hide only this Chrome shortcut without removing Explorer/dashboard access. This is the required behavior for a future implemented Settings control; there is no working Chrome registration or demo checkbox in this documentation-only scaffold.
8. The separate **Manage Destinations pop-out is ONE window**, with **one Simple/Narrow filter switch at its top**, a vertically scrollable list of **at most 20 saved entries per page** with Previous/Next pagination, and an **X at the right end of each entry**. The switch changes **which saved category is listed**; it does NOT convert a record between modes. Clicking any row replaces the list **within the SAME pop-out** with an editor for the SAME canonical destination ID. **Directly beneath the switch** show **← Back to Destinations** in edit mode. **Escape or Back** returns to the filtered/paginated list without saving; Escape from the list closes the pop-out. Simple editing is TWO columns: immutable original/current location or directory name on the left; one editable Menu Title on the right, with a persistent Save button at the bottom. Narrow editing uses the TWO-COLUMN top-down sequence of every original directory level on the left and editable menu titles on the right, with the same bottom Save. Save edits the original record in place; never create duplicates, rename cloud folders or delete original files. X removes only the saved right-click configuration after an inline confirmation, not the actual cloud data.
9. The selected location and its actual path are **immutable** in the popup. Menu titles are aliases for the Chrome menu, never the R2 path or provider identity.
10. The **V3+1 native menu composer projects the SAVED Show selection**: if Simple is ON include persistent Simple choices; if Narrow is ON include persistent Narrow branches; if Depth is ON include the automatic trees for the buckets enabled in the Depth tab; All means those three together. **Flat** overrides Cloudflare's menu projection with a SINGLE actionable `REDOWN → Cloudflare` native leaf bound to the separate user-designated **Default Save Selection** target (no nested Cloudflare menu); independent flat Drive/Dropbox/OneDrive provider siblings are unaffected. Show toggles do not delete configs. Collision-safe deterministic identities and Chrome registration receipts are required. The editor never silently changes cloud data, OAuth, Worker bindings or verification status.

### Native menu shape (examples)

```text
DEFAULT-ONLY (no explicitly saved destinations)
REDOWN
  Cloudflare                 ← one actionable leaf, saves to redown root
  Google Drive               ← independent provider leaf
  Dropbox
  OneDrive

SIMPLE (one pop-out, flat destination choices)
REDOWN
  Cloudflare ▸
    My Photos                ← redown/Art/Photography
    Invoices                 ← redown/Work/Invoices
  Google Drive
  Dropbox
  OneDrive

NARROW (the branch follows the actual selected location)
REDOWN
  Cloudflare ▸
    redown ▸
      Art ▸
        My Photos            ← redown/Art/Photography
```

The three examples above isolate individual menu shapes **for illustration only**. In the FINAL V3+1 model, **saved Simple choices and saved Narrow branches COEXIST**, and **Depth can be toggled ON to add its discovered tree alongside both**. Turning Depth OFF removes only its generated branches. The actual selected folder may be represented differently in Simple and Narrow without changing the cloud destination. Do NOT implement historical mutually exclusive projection semantics.

## Popup visibility, Depth display, and Flat default — controlling owner decision

**There is NO hierarchy button next to File Explorer's `+ Right Click`. Remove it from Explorer toolbars, local context menus, GUI fixtures and implementation instructions.** Only `+ Right Click` and `Manage Destinations` remain among these Explorer controls.

### Configure destinations, then choose what Chrome shows

- On a folder inside Explorer, **right-click → `+ Right Click`** opens the exact same single popup as the top `+ Right Click` button. Simple and Narrow target the **right-clicked folder**, not a stale global selection. Depth is bucket-wide, not selected-folder-specific.
- Three configuration tabs: **Simple | Narrow | Depth**. Simple saves one flat menu destination and optional title. Narrow saves the exact path with optional per-ancestor menu titles (Narrow-only Menu Titles tab). Depth lists all authorized buckets with independent **display-enabled checkbox + Chrome display depth** for each; initial depth **10** but **NO hardwired application maximum**. Chrome/platform limits must be detected and reported, not treated as 10. There is no Depth Menu Titles tab.
- **Persistent bottom-of-popup area, DIRECTLY ABOVE Save:** `Show in Chrome: [Simple ON/OFF] [Narrow ON/OFF] [Depth ON/OFF] [All] [Flat]`. Simple, Narrow and Depth are combinable toggles. **All** sets all three ON. **Flat** is a mutually exclusive Cloudflare presentation; selecting it clears the active display combination but **preserves the last saved combination** for effortless return. Returning from Flat restores the prior combination unless user explicitly edits it.
- Initial presentation before customization should show all available saved choices by default (Simple/Narrow/Depth if configured and eligible); no hidden implicit global "active mode" that drops other records. If the user chooses only Narrow, show only saved Narrow branches. Only Simple shows only Simple destinations. Simple + Narrow without Depth remains valid even when no display buckets are selected. If Depth is selected in Show but all Depth display buckets are OFF, generate **zero Depth branches** rather than inventing a hierarchy.
- **Save is the commit barrier** for any changes to destination configuration and Show selections. Cancel/Escape discards drafts. Saving a new destination does NOT forcibly enable its display type, and hiding a type never deletes any saved configuration. The real Chrome menu must be recompiled from committed state with accurate desired/applied generation ACK; there is no second visibility switch elsewhere.
- Keep independent flat Google Drive/Dropbox/OneDrive siblings. Apply Show/Flat to the **Cloudflare submenu/leaf only**.

### Flat mode and Default Save Selection

- Explorer's LOCAL folder right-click context menu contains **`Default Save Selection`** alongside `+ Right Click` and `Manage Destinations`. Choosing this for a folder records an **exact verified provider connection/account/bucket/folder target** as the Flat default, independent of all Simple/Narrow/Depth records. The folder must be writable/authorized at save time and revalidated at actual upload time. Changing Flat default never deletes or renames cloud folders.
- With **Flat** selected and saved, the actual Chrome native menu has **`REDOWN → Cloudflare` as ONE immediately actionable leaf**, not a nested Cloudflare submenu. Clicking it saves to exactly the last user-designated Default Save Selection. Do not create a false "success" if authorization/target/upload verification fails. If there is no valid default target, require user selection or truthfully disable/refuse rather than guess another folder.
- Switching away from Flat returns to the saved Simple/Narrow/Depth display combination and its exact destinations; changing displayed modes never overwrites the Flat target. The Flat default itself has a durable config identity, journal entry and backup coverage.

### Examples of committed Chrome presentation

```text
Show [Simple ✓] [Narrow ✗] [Depth ✗] → Cloudflare ▸ My Photos; Invoices
Show [Simple ✗] [Narrow ✓] [Depth ✗] → Cloudflare ▸ Creative Work ▸ Photography
Show [Simple ✓] [Narrow ✓] [Depth ✗] → BOTH, no autogenerated hierarchy
Show [Simple ✗] [Narrow ✗] [Depth ✓] → only indexed hierarchy of saved enabled Depth display buckets
Show [All]                           → Simple + Narrow + Depth (when configured)
Show [Flat]                          → REDOWN → Cloudflare (one click to Flat default; NO submenu)
```

**Recovery Mode does not control Chrome display.** Settings → Recovery Mode independently chooses what is protected, how often, and how deeply buckets are indexed. Full contract is in [MENU_DESTINATIONS_DURABLE_RECOVERY.md](./MENU_DESTINATIONS_DURABLE_RECOVERY.md). There is no hardcoded Depth-10 display cap; 10 is only the newly configured bucket DEFAULT. Do not silently truncate supported deeper requests; report native Chrome menu budget/limitations explicitly and preserve saved target values.

**Acceptance examples:** Save a Simple destination while Show:Narrow-only; Simple stays stored but hidden. Enable Simple then Save; both appear. All then Flat then return; all data and prior composition survive. Empty Depth bucket selection produces no Depth nodes. Context-menu `Default Save Selection` sets Flat's exact target and native Flat remains a direct Cloudflare leaf. Cancel/Escape never leaks unsaved display choices into Chrome. Restart/recover restores all saved configs, Show selection, Flat target and current authorized menu without cross-account rebinding.

## Manage Destinations pop-out — newest owner decision

### Entry points and Settings

- **Click2Cloud File Explorer**: dedicated **Manage Destinations** button in its top controls and **Manage Destinations** inside its local folder right-click menu (alongside `+ Right Click`).
- **Click2Cloud dashboard / REDOWN-Shelf-style area**: small **circular pointer icon, beneath and to the RIGHT of the odometer** opens the same manager pop-out.
- **Chrome-native right-click menu (future real engine)**: optional `REDOWN → Manage Destinations` shortcut placed alongside provider entries in the pop-out. The **Right-Click Settings** checkbox can toggle that Chrome menu entry OFF. Turning it OFF **never removes** either File Explorer or Shelf/dashboard access. The future implementation must register/reconcile the native shortcut with Chrome; this Markdown specification does not implement it.

### List view

- **One independent manager pop-out** with a **Simple / Narrow segmented switch fixed at the TOP**. The switch is a **filter**, not a conversion or a global V3+1 mode selection.
- Scroll vertically through only the selected category of manually saved destination rows. Each row shows menu title + immutable actual account/bucket/path. No Depth-discovered autogenerated folders appear as saved rows.
- Cap **the visible page at exactly 20 entries**, with Previous/Next navigation and page count. Do not cap the total number of saved entries at 20. Keep each category's page position when opening/returning from its edit view.
- An **X on the RIGHT of EVERY saved row** removes that *saved menu configuration only*, not the actual remote cloud folder/file. Show an inline confirmation (no extra stacked popup). Re-render the native menu only after a real successful CURRENT change when implementation is connected.

### Editing within the SAME pop-out

- Clicking ANY row replaces the list area with that entry's edit view **in the same pop-out**. Do not stack a second popup.
- **Always show the Simple/Narrow filter switch at the top**. **Directly UNDER it**, while editing, display **← Back to Destinations**. Clicking Back or pressing **Escape** returns to the list and discards unsaved edits; Escape while viewing the list closes the pop-out.
- If Simple is selected, the editor displays **one single two-column row**: the original/current directory name (read-only) on the left, the **Menu Title** editable input on the right.
- If Narrow is selected, the editor goes **straight to the two-column Menu Titles view**: all real directory levels from bucket to selected folder top-down on the left, each optional menu-display title on the right. These are never cloud-folder renames.
- **Save is fixed at the BOTTOM of the manager in edit state**, whether Simple or Narrow. Saving updates the existing ID with changed titles/aliases and returns to the list. The switch itself does not turn Simple into Narrow or move rows between categories.

### Implementation and proof requirements

- Keep the original `+ Right Click` **configuration** popup distinct from Manage Destinations. Its top choices are Simple/Narrow/Depth, Narrow-only Menu Titles appear only in Narrow, and the persistent bottom Show in Chrome Simple/Narrow/Depth/All/Flat section sits immediately above Save/Cancel.
- The manager reuses **the same canonical destination record format and edit validation**, even though it uses a simpler **single-screen-in-place** editor presentation. Use actual `CURRENT` transactions once the engine is connected.
- Manager rendering and pagination are local; no R2 listing or OAuth refresh just to display or edit an already configured destination.
- **Documentation only:** There is no interactive prototype under `scaffold/`; no functionality, tests or provider receipts are claimed by these notes. Codex must write and test the actual V3+1 implementation independently.
- Acceptance examples: 0/1/20/21/45 saved entries; Simple/Narrow filtering; page changes; row→same popup editor; Back/Escape without Save; real Save updates same ID; X confirmation, no remote deletion; Chrome manager shortcut hidden without removing Explorer access; **no Explorer hierarchy toggle**; popup Show selections preserve all saved modes.

## Independent crash/uninstall recovery — REQUIRED BEFORE V3+1 SHIPPING

**[Durable recovery contract](./MENU_DESTINATIONS_DURABLE_RECOVERY.md)** governs distinct, externally durable configuration and inventory recovery. In **Settings → Recovery Mode**, users select **Weekly (default)** or **Daily**, enable **Simple Recovery** ON/OFF and **Narrow Recovery** ON/OFF independently, and expand a bucket list to enable/disable **Depth Recovery** for each bucket with its OWN recovery crawl depth. Recovery depth is independent from the popup's Chrome **display depth**, with no arbitrary code-imposed maximum. Recovery can remain enabled while a corresponding mode is hidden from Chrome, and vice versa.

- **Menu configuration**: `menu-config/CURRENT.json` with ordered semantic delta journal and independent immutable weekly/daily recovery snapshots for protected Simple/Narrow destinations, aliases, exact IDs, Show selection, Flat default and other stable menu settings. Only enabled modes receive new scheduled history; disabling recovery does NOT delete live destinations or existing backups.
- **Depth display configuration**: `depth-config/CURRENT.json` protects enabled Chrome-display buckets, per-bucket *display* depths, and related committed settings. This is **NOT** the same as the recovery crawl depth policy.
- **Depth recovery knowledge base**: separate `depth-index/CURRENT.json`, journal and snapshots for discovered folder graphs with cursors, completeness/freshness and each enabled recovery bucket's desired *recovery* depth. Keep recovery schedule/toggles themselves externally durable. Incremental scans are resumable and preserve validated known folders if incomplete.
- **Monday weekly checkpoints by default** (or Daily option) provide verified `weekly.json` latest checkpoint pointers/copies and immutable dated snapshots, while CURRENT and journals update after each committed configuration edit or verified index change; weekly schedules never imply CURRENT updates only once per week. A true Monday run needs available authorized companion scheduler; otherwise detect missed run and catch up at next possible execution, reporting actual time.
- **Restore both accidental deletion and error loss** through validated CURRENT or selected earlier dated snapshot plus contiguous journal replay. Intentional deletion stays deleted in current state unless user explicitly requests rollback. Recover exactly Simple, Narrow, Depth display config, Flat default, Show selection and the independently recoverable folder index subject to enabled recovery coverage and surviving backups. No silent fallback to unrelated accounts; provider OAuth may need renewal.
- **Uninstall survival requires a separate valid external backup** outside Chrome's origin/profile, such as an authorized native companion or approved folder. Local IndexedDB alone does not satisfy this. Backup pending/failure is visible and never presented as protected. Do not claim any of this is already implemented.

**Backup Location in Settings:** Offer TWO selectable Windows recovery roots: **Automatic (default)** = %LOCALAPPDATA%\Click2Cloud\Recovery\ (native-companion-managed), or **Documents** = Documents\Click2Cloud\Backups\ (user-visible). The selected root stores the actual CURRENT.json, monthly journal/YYYY-MM.jsonl, weekly/daily snapshots and manifests for all recovery namespaces; Documents is NOT merely an export destination. Allow changing the active location safely with copy + verification before switch, keep prior data on failure, and do not assume both paths are written concurrently. Monthly journal file names roll over dynamically across years (2026-11.jsonl is only an example), and event sequences continue across months. See [recovery storage contract](./MENU_DESTINATIONS_DURABLE_RECOVERY.md).

**Save Whole Cloud (at the BOTTOM of Settings → Recovery Mode):** An independent multi-select dropdown lists all connected authorized Cloudflare R2 accounts AND other connected S3-compatible accounts (one checkbox per exact connection), followed by a **Save Whole Cloud** button. It creates a READ-ONLY outline of ALL accessible buckets and ALL key/folder paths in each selected cloud—not object bytes, and not limited by Depth Recovery or Chrome display depths. Capture lasts AS MANY WEEKS AS NECESSARY. Weekly is default resume/progress cadence (Daily if selected); uninterrupted real scheduling requires the native companion. Preserve verified incremental coverage, cursors, progress and starting week across crashes/restarts. **If OAuth is lost, PAUSE — Reconnect Required; on the next successful login to the SAME account automatically RESUME from the last valid checkpoint** (relist invalidated cursors only). Generate dated account-safe filenames, e.g. `backup-cloudflare-week45-2026.json`, `backup-cloudflare-week45-50-2026.json`, or `backup-cloudflare-week52-2026-to-week03-2027.json`; never claim partial results complete. This is separate from scheduled recovery and popup Show. **[Full whole-cloud contract](./WHOLE_CLOUD_OUTLINE_EXPORT.md).**

## Required real Chrome + OAuth proof — latest owner clarification

The PRIMARY Codex deliverable is a **complete installable Click2Cloud MV3 Chrome extension** with real Explorer, Connect Cloudflare OAuth, **native Chrome `contextMenus`**, and authenticated Worker→R2 saves verified by read-back. **The existing Cloudflare Workers are live Codex test infrastructure; Worker/service bindings do not replace a user-authorized browser OAuth connection.** Synthetic folders may be used for stress/fault injection only; fake menus, fake OAuth and simulated saves DO NOT count as successful extension tests.

- [Installable extension, real native-menu and Worker/R2 exit criteria](./gui/CHROME_EXTENSION_LIVE_ACCEPTANCE.md).
- [Extracted REDOWN Cloudflare OAuth scopes and PKCE/redirect/refresh requirements](./gui/REDOWN_OAUTH_EXTRACTION.md).
- [Updated real Chrome + OAuth + provider test journeys](./gui/TEST_JOURNEYS.md).

OAuth registration must match **Click2Cloud's own extension ID**; do not copy REDOWN's manifest key, private credential or existing token. Do not claim any current extension or OAuth implementation is already finished based on this documentation.

## GUI source extraction and post-Codex test entry point

**[GUI handoff based on current REDOWN](./gui/README.md)** lives under `scaffold/gui/`. This is a **source-backed, documentation-only extraction** of REDOWN's Shelf/Remotes, cloud account/bucket sidebar, File Explorer actions, navigation and right-click menu premise. It intentionally **does not copy V3's old global setup form** or modify REDOWN.

- [Exact REDOWN GUI source map and Codex GUI/launcher contract](./gui/README.md) — build the actual GUI under `scaffold/gui/`, with a **real installable Chrome MV3 extension**, Cloudflare OAuth, native contextMenus and verified R2 save as the primary exit gate; optional `npm run demo` and compiler preview are development conveniences.
- [Synthetic accounts, buckets, folders, Simple/Narrow aliases and stress-case seed data](./gui/demo-fixtures.json) — no credentials or real cloud writes.
- [GUI interaction, native Chrome and external recovery test journeys](./gui/TEST_JOURNEYS.md) — required post-Codex proof rather than decorative click demonstrations.
- **Not yet implemented:** `scaffold/gui/index.html`, GUI runtime, `npm run demo`, `npm run test:gui`, and standalone Chrome test harness. The specification requires Codex to create them, then verify actual launch/results. No simulated UI is claimed as functioning today.

## Scaffold contents

- `README.md` (this file): authoritative UX workflow, mode semantics, saved destination manager, architecture separation and V3+1 build/acceptance instructions.
- `MENU_DESTINATIONS_DURABLE_RECOVERY.md`: independent uninstall-safe menu configuration, Depth display configuration and Depth recovery index; CURRENT.json + delta journals + weekly/daily snapshots + Recovery Mode controls.
- `gui/README.md`, `gui/TEST_JOURNEYS.md`, `gui/demo-fixtures.json`: source-backed REDOWN GUI baseline, real extension/OAuth/native-menu testable contract, with safe synthetic fixture data only for fault and edge-case testing.
- No runnable app, HTML prototype, CSS, JavaScript controller or test harness is created by this scaffold. Build those in a future explicitly authorized implementation run.

## V3+1 engine build plan (later, not part of scaffold)

1. Replace the static Explorer paths with the existing `src/explorer/index.mjs` (Universal File API) and authenticated host transports; do not build a competing cloud file API.
2. Introduce an editor controller accepting `{location:{provider,accountId,bucketName,prefix,segments}, recordId?}`. If `recordId` is set, load and edit that record, not create a new record.
3. Add canonical transactional CURRENT-backed `saveDestination`, `listDestinations({mode,page,pageSize})`, `updateDestination(recordId,patch,expectedRevision)` and `getDestination(recordId)` methods. Preserve exact IDs, valid ancestry and existing authorized provider scope; page locally without cloud reads. Never persist secrets in the UI.
4. Adapt the canonical compiler into a **saved-Show-filtered composite** projector. It independently includes Simple, Narrow and per-bucket Depth when their Show toggles are ON; All enables all three; Flat chooses the sole direct-save Cloudflare leaf with no Cloudflare submenu. Preserve records when hidden. Respect each bucket's saved DISPLAY depth (10 default, no imposed cap), independent of its RECOVERY crawl depth. Use exact flat default identity, collisions and native ACK; keep unrelated providers flat.
5. Render the same effective menu plan in dashboard preview and Chrome native `contextMenus`, with generation+ACK, error and recovery. Ensure actual browser native submenu behavior, not just HTML approximations.
6. Provider dispatch happens **after** exact action resolution: Cloudflare uses Worker URL-fetch → R2 (TRUE REMOTE) with verified R2 receipt; Drive/Dropbox/OneDrive use byte-upload adapters with their own verification. **V3+1 governs menu intent; neither the menu mode nor the popup defines the transfer mechanism.**
7. Test three-choice popup, Show ON/OFF combinations + All + Flat + Cancel/Save, default selection via Explorer folder context menu, no hierarchy toolbar, Narrow aliases and bottom title sync; **manager 20/page Simple/Narrow filter, X and same-window editor**; recovery Weekly/Daily and Simple/Narrow ON/OFF, per-bucket independent recovery depth, CURRENT/journal/checkpoint restoration and backup failures; deterministic actions, Chrome ACK, worker restart and verified real uploads. **Do not read/run/expand the 1,000-scenario project**.

## Source and requirement pointers

- [Latest Explorer + two-tab popup + saved destination UX](../NEED_TO_DO/2026-11-05_EXPLORER_ADD_TO_RIGHT_CLICK_TWO_TAB_POPUP.md)
- [REDOWN CURRENT/V3 source extraction](../FOREVER_WORKS/REDOWN_CURRENT_V3_SOURCE_EXTRACTION_2026-11-05.md)
- [V3+1 Codex execution contract](../FOREVER_WORKS/CODEX_REBUILD_FROM_REDOWN_CURRENT_V3_EXTRACTION_2026-11-05.md)
- [Instant mode-switching requirements](../NEED_TO_DO/2026-11-05_INSTANT_SIMPLE_NARROW_DEPTH_SWITCHING.md)

**Source-of-truth precedence:** The dated `/scaffold/README.md` and its [independent menu recovery contract](./MENU_DESTINATIONS_DURABLE_RECOVERY.md) define the **latest owner-approved end state**. Earlier FOREVER_WORKS/NEED_TO_DO/docs V3+1 source mappings are evidence and implementation references, but any old statements about (a) a single global Simple marker, (b) mutually exclusive Simple/Narrow/Depth projections, (c) a separate Explorer hierarchy toggle, (d) treating saved destinations as automatically displayed irrespective of popup Show selection, (e) in-Chrome backup being uninstall-safe, (f) mixing Depth's Chrome display depth with recovery crawl depth, or (g) TRUE REMOTE being the V3+1 engine are **superseded**. Resolve conflicts to this scaffold explicitly before coding, preserve REDOWN implementation facts as historical, and do not claim current implementation/test completion based only on documentation.
