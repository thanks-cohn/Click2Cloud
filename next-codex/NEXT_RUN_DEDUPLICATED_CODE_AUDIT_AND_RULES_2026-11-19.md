# CLICK2CLOUD 0.3.21 — FINAL CANONICAL CODEX REQUEST

**Date/Owner decisions:** November 20, 2026. **Repository:** `thanks-cohn/Click2Cloud`. **Base:** current GitHub `main`, currently product version `0.3.20`. **Next intended release:** **0.3.21**. **This file is the authoritative next Codex run.** It replaces conflicting/historical instructions previously in this long handoff. Source code/build changes are NOT claimed to have happened.

## Read these specifications IN THIS ORDER

1. **[FINAL screenshot implementation contract](../screenshot-logic-final/README.md) — MANDATORY, AUTHORITY FOR ALL SCREENSHOT BEHAVIOR.** Read it and its **[exact test matrix](../screenshot-logic-final/TEST_MATRIX.md)** in full BEFORE coding. This final directory defines every trigger, website condition, one-capture sequence, fan-out, card UI, dedup switch, IDs, retry and receipts.
2. **[Bit o' Polish five color schemes](BIT_O_POLISH_FIVE_COLOR_SCHEMES_0.3.21_2026-11-20.md)** — Mandatory Settings/Aesthetic API change in this release.
3. **[Get URL directory simple TXT/domain preference](GET_URL_DIRECTORY_SIMPLE_TEXT_PRODUCTION_DOMAIN_PREFERENCE_2026-11-19.md)** — mandatory existing UI/export enhancements.
4. **[Destinations Manager visual polish](DESTINATIONS_MANAGER_POLISHED_STRUCTURED_DIALOG_2026-11-19.md)** — UI-only changes preserving existing save engines.
5. **[Shared diagnostics / Raw-Secure](LIGHTWEIGHT_DIAGNOSTICS_AND_RAW_SECURE_ZIPS_FOR_RULE_TRANSFERS_2026-11-19.md)** — apply ONLY screenshot and existing right-click save scope in 0.3.21; ignore deferred Auto-Reroute sections.
6. Current actual `extension/`, `src/`, `tests/` and package sources — compare working 0.3.20 implementation before changing code.

**Explicit precedence:** `/screenshot-logic-final/` WINS. **Do NOT execute** old `/screenshot-logic/`, `next-codex/SCREENSHOT_TO_CLOUD_CONTEXT_MENU_AND_ADDITIVE_RULES_2026-11-19.md`, or historical 0.3.20 handoffs where they describe per-card shortcut selection, special shortcut-anchor cards, F6/F10 screenshot defaults, an Auto-Reroute Rules page, or other superseded behavior. Those older files may supply background ONLY if they do not conflict with this final request.

## 0.3.21 IN SCOPE / OUT OF SCOPE

**IN:** Existing Search lifecycle repair; Get URL cards/configuration and two directory URL exports; existing Minimal appearance warning cleanup; Bit o' Polish remains the default aesthetic with FIVE selectable color palettes under it in Settings; first-class More → Screenshot screen; both screenshot shortcuts and full additive screenshot/Worker feature; Explorer Screenshot2Here setup and separate browser-right-click one-off; improved Destinations Manager visuals; real Chrome Shelf ↔ History shortcut; extension of shared RAW/SECURE diagnostics for screenshot; tests, build, 0.3.21 release.

**OUT:** **ALL Auto-Reroute** — no More → Rules entry, no file-extension download-routing rules, no download cards, no Chrome download interception, no Chrome original-file-byte streaming, no Auto-Reroute Worker handlers, no download-specific docs as implementation tasks. **Auto-Reroute's complete requirements are preserved exclusively for the separate [0.3.22 Codex run](AUTO_REROUTE_0.3.22_SEPARATE_CODEX_REQUEST_2026-11-20.md) and [`/auto-reroute/README.md`](../auto-reroute/README.md).** Preserve existing manual Explorer Download, file-export and other existing download code, which are NOT Auto-Reroute.

**Do NOT redo 0.3.20 features** already implemented: current Explorer Search engine, V3+1.1 File API, normal right-click saves, Simple/Narrow/Depth, native context menus, OAuth/Cloudflare connection, existing Explorer file browsing, existing Get URL underlying API/export grouping, History, recorder, aesthetic packages, gallery/explorer layout, native routing or existing profile state. Fix precise deltas only. Do NOT open a new right-click wrong-bucket P0 investigation in this run (owner excluded that separate workstream). No destructive production cloud modifications.

## 1. Search — fix input lifecycle, preserve filter

- Existing Explorer filename search is functional, but its pop-out currently closes after Enter and Escape clears its query/results. Fix this behavior without rebuilding the Search engine.
- **Enter:** run/refresh current filename search while keeping input/pop-out open. Repeated Enter, errors and zero results must not close it.
- **Only Escape or X at the far RIGHT INSIDE the search field** hides that search field/pop-out; clicks on results, harmless focus changes and repaint must NOT close it. Hide does NOT clear search text or filtered results.
- Reopen same folder: input restores last query and filtered results remain visible until explicit Clear or relevant folder/account change. Provide deliberate Clear action; preserve paging, site-specific results and current F7 command.
- **Proof:** type `photo`, Enter → still open and filtered; Escape or X → search field hidden but list STILL filtered; reopen → `photo` still present; explicit Clear → normal file listing. Test keyboard, pointer and scope changes. Correct old fixtures that explicitly assert the unwanted Enter-to-close behavior.

## 2. Get URL — true immediate public URLs and copyable cards

- Reuse existing `getPublicUrls`, domain status, current Get URL flag, first-time allow gate and object URL exporter. Clicking an item Get URL displays verified active full object URLs IMMEDIATELY beneath the domain field (including any actually verified developmental `r2.dev` URLs); do not require pressing Enter before showing already known URLs.
- Input, `Submit`, `Copy All` occupy ONE row in that exact order. Clicking Submit or pressing Enter runs the identical domain verification/association workflow without closing popup. A newly VERIFIED associated custom domain immediately yields its full correct object URL in the same dialog. Don't fabricate DNS/domain provisioning when actual Cloudflare API cannot do it.
- List URLs as bounded-height internally scrolling FULL-CARD click-to-copy items, with keyboard Enter/Space copy. `Copy All` copies every displayed verified URL, including scrolled-out URLs, one per line and no duplicates. Clear copy success/error feedback.
- Developmental URL cards must have BOTH their own accessible contrasting visual/tint/border and a visible `Development URL` label; ordinary verified custom-domain cards use neutral styling. Never imply anonymous reachability was tested if only association was validated.
- When no public URL endpoint is verified, show an honest empty state/Recheck and real setup guidance; never invent public URLs from private R2 keys.

## 3. Directory Get URL — two modes, NONRECURSIVE, four checkboxes

- Offer **`One Link per Asset — Simple Text File`**: for each selected immediate child file, choose ONE verified public URL (prefer active custom-domain URL when requested), output one URL per line, no header/metadata/FILE markers. Two public domains for the same file do NOT produce two lines in Simple TXT.
- Offer **`Get All URLs for Directory`**: include every verified distinct URL for every selected immediate child file, GROUPED by file identity, in existing structured TXT/CSV/JSON formats (do not flatten per-file groups and do not rebuild exporter).
- Both modes are STRICTLY NONRECURSIVE: if selecting `photos/`, include `photos/a.jpg`, exclude `photos/folder/b.jpg`. Exclude folder markers, nested descendants and siblings; paginate entire immediate listing before claiming completeness. Existing directory-ZIP Download recursion remains unchanged.
- File type checkboxes exactly **Images**, **Audio**, **Video**, **All files** (All checked by default). Images/Audio/Video can be checked together as a UNION; checking All clears narrower boxes, selecting narrower clears All. With zero selected disable export. `All files` includes every actual file type, including ZIP/CBZ/PDF/source/extensionless; it is unrelated to deferred Auto-Reroute allowed types.
- Simple TXT has checkbox **`Use non-developmental URLs where possible`**; prefer verified active custom domains over verified `r2.dev` when checked. If only developmental URLs exist, prompt `Only developmental URLs exist. Add domain?` with optional authorized association/Recheck, but allow unchecking preference to export developmental URLs immediately without demanding setup or restarting export.
- Proof fixture: 3 immediate files × 2 public domains → Simple TXT **3 lines**, Get All **3 file groups/6 links**. Nested child excluded in BOTH. Test empty/partial/unavailable domains and exact prefix/Unicode keys.

## 4. Appearance — Bit o' Polish DEFAULT + five colors; Minimal cleanup

- **Bit o' Polish (`high-polish`) IS AND REMAINS THE DEFAULT** for fresh profiles in 0.3.21. Current `src/aesthetic/host.mjs.restore()` already defaults to `high-polish` on missing aesthetic preference: KEEP IT. Do NOT make Minimal the default. Minimal and Remote V1 remain selectable and saved choices remain respected.
- In **Settings → Appearance**, add FIVE labeled selectable palette swatches **directly UNDER Bit o' Polish Appearance selection**: `Original Rose` (default and exact current 0.3.20 colors), `Ocean Blue`, `Emerald Forest`, `Amethyst`, `Sunset Amber`. These recolor Bit o' Polish only (all light/dark background, surface, raised, text, muted, border, accent, selection, focus tokens), without switching aesthetic package or changing layout/typography/geometry/motion. Preserve existing independent Dark/Light mode.
- Implement using **existing Aesthetic API** `src/aesthetic/packages.mjs`, `src/aesthetic/host.mjs`, typed tokens and `extension/aesthetic.css`. Persist separate palette ID; immediate live repaint; restore on restart, switch between aesthetics without color leakage. Follow [five-scheme spec](BIT_O_POLISH_FIVE_COLOR_SCHEMES_0.3.21_2026-11-20.md). No second theme system.
- Clean up only **unwanted generic/technical warnings IN Minimal** (ordinary Remotes intro/selected setup status, `This action needs attention. Review the current panel or History.` and intrusive automatic reconnect/worker-detail boilerplate) while preserving genuinely actionable errors, reconnect operations, shared diagnostics, History and explicit debug views. Do not indiscriminately suppress real failures or add new generic replacement text.

## 5. Screenshot-to-Cloud — NEW FIRST-CLASS More entry, FINAL frozen behavior

**DO NOT IMPROVISE; IMPLEMENT [`/screenshot-logic-final/README.md`](../screenshot-logic-final/README.md) and [`TEST_MATRIX.md`](../screenshot-logic-final/TEST_MATRIX.md) exactly.** This section repeats the key logical execution contract to make it impossible to confuse the older docs with the final decision.

### 5A. Screenshot UI, exactly

- More ▾ contains **Screenshot directly above Settings**. NO new Rules/Auto-Reroute menu item in 0.3.21. Clicking Screenshot shows one compact form: **Website (All / domain+subdomains / exact host / exact page URL) → authorized Cloudflare R2 directory → Save**. Card appears immediately beneath; Active/Inactive toggle, X Delete, click card body to edit. 25/page with no rule-total cap.
- ZERO shortcut pickers, shortcut ownership, exclusive toggles or priority fields in main form, saved card or card editor. Full card editor may manage multiple OR website conditions and multiple unique destinations, with one Save. Screenshot2Here in File Explorer creates or updates one of these same rule cards without assigning/changing any shortcut.
- `Screenshot → exact folder` via BROWSER right-click is an independent one-off capture of ONLY that folder, not a normal additive shortcut event. Saving a rule (in Screenshot page or Screenshot2Here) never captures anything.

### 5B. Both independent screenshot keys work at the same time

- Declare TWO screenshot Chrome commands with suggested defaults `Alt+Q` **AND** `Ctrl+Shift+Y`, BOTH ON BY DEFAULT (when Chrome accepts them). They are equally functional, not primary/backup modes. Both command IDs map into the SAME logical screenshot signal and the SAME full additive matching rules.
- Register ONE real Chrome `chrome.commands.onCommand` dispatch in the background service worker; work on ordinary supported websites while Click2Cloud Shelf is closed. Check actual assignments using `chrome.commands.getAll()`; show truthful active keys and any missing-key guidance. Neither is an OS-global shortcut and the extension cannot assign them programmatically after installation. Preserve Explorer-local F7/F8/F9.
- A website→folder screenshot card ALONE is enough; no hidden anchor shortcut card. When either key is pressed and no active rule matches, do nothing. When many active cards match, ALL contribute destinations. Two different presses yield TWO different capture IDs/images/sets of objects.

### 5C. EXACT one-capture execution sequence

1. On a delivered Alt+Q OR Ctrl+Shift+Y command, central dispatcher creates a NEW `signalId` and `captureId` for THIS event; no per-rule screenshot listeners or speculative hardware-keypress debounce.
2. Read Chrome's focused window, active tab ID, trusted current page URL/navigation identity. Snapshot ALL active screenshot cards and website conditions (OR within a card); match all cards against that page once per rule ID. If zero intents, don't capture.
3. Freeze ONE immutable Capture Plan: command/signal, tab+window+URL/navigation, configuration version, global dedup ON/OFF, matched rule IDs, exact authorized R2 targets, `operationId/jobId`, distinct planned `outputId`s/cloud object keys. Mid-flight edits apply to next capture, not this one.
4. Dedup **ON by default**: one NEW file per canonical authorized provider/account/bucket/exact-prefix directory **PER THIS CAPTURE**, collecting all contributing rule IDs. Dedup OFF: one NEW file per matched rule ID→canonical directory association. A rule with 3 OR-matching website conditions counts ONCE; no historical old-cloud-file dedup. Distinct buckets/accounts never collapse because folder labels match.
5. Verify active tab identity immediately before calling `chrome.tabs.captureVisibleTab(windowId)` ONCE: it captures the VISIBLE active webpage viewport, not browser frame/another tab/below-fold page. Verify tab/window/navigation again after; if uncertain/changed, abort and report no wrong-tab upload. Respect real Chrome capture rate/permission limitations.
6. Upload captured screenshot bytes from Chrome to the EXISTING trusted Worker ONCE regardless of number of rules. Worker writes to the exact previously authorized planned targets with independent real R2 object verification, honest per-output confirmed/failed/partial/unknown status. Don't invent unsupported cross-account/bucket fan-out.
7. Receipts in the existing recorder correlate captureId, signalId, jobId, rule contributors and every physical outputId/key, byte counts, timestamps and actual verification. RAW is detailed; SECURE redacts for sharing. HTTP ACK isn't proof the R2 object exists.
8. Retry unresolved outputs ONLY with SAME original capture IDs/keys where original bytes remain recoverable; don't recapture and falsely claim it is the retry; don't duplicate successful outputs. New keypress creates a NEW capture/file even in the same directory.

### 5D. Critical proof cases

- No matching active cards → 0 captures/uploads. ONE matching website-only card → 1 capture, 1 upload, 1 target. Rule A Google→X plus Rule B All-sites→Y on Google → TWO independent R2 outputs, not a winner.
- 10 distinct matched rules all target SAME directory: dedup ON → 1 capture/1 browser upload/**1 R2 object**; OFF → 1 capture/1 upload/**10 distinct R2 objects**. Single card matching 3 OR sites→one target→1 object in BOTH settings.
- 100 matched rules, 3 distinct folders ON → one capture/upload/3 objects. Repeated separate keypresses get distinct IDs. On tab switch during capture, never upload wrong-page image.
- Partial R2 failures, lost ACK, Worker restart and retry → truthful independent statuses, stable object keys and no duplicate writes. Two shortcuts both independently work on real ordinary Chrome tabs with shelf closed. Browser one-off right-click saves ONLY selected folder.

## 6. Screenshot diagnostics and RAW/SECURE ZIPs

- Extend ONE existing `src/recorder`/History/export framework, not parallel recorders. Add screenshot events and per-target success/failure/verification details with stable schema and event correlation. Keep existing ordinary right-click operations and new screenshot operations distinguishable.
- Provide RAW and SECURE modes. RAW retains operationally useful detailed metadata and source URL where relevant; SECURE is explicitly redacted for sharing. Add available scope selector `existing right-click saves` vs `screenshot captures` (and optionally All), not a future Auto-Reroute scope as an active 0.3.21 feature. Recorder errors should not silently corrupt a successful save.

## 7. Shelf ↔ History Chrome keyboard toggle

- Add ONE real manifest command (separate from BOTH screenshot commands) to toggle the existing Click2Cloud Shelf panel to History on ordinary Chrome webpages. **Closed** → open Shelf directly at existing History; **open other view** → switch to History; **already on History** → close that same panel. Next press cycles accordingly. Do not create a new History tab/store.
- Preserve per-window state; distinguish multiple Chrome windows, manual panel closes, concurrent rapid presses, Chrome sidePanel API availability, and navigation while the Shelf loads. Use existing `extension/app.html`, `extension/app.mjs` History view and `src/chrome/provider-panel.mjs`. The default shortcut for this THIRD command (if one is assigned) must not conflict with Alt+Q, Ctrl+Shift+Y or local F7/F8/F9; confirm supported manifest syntax and available Chrome suggested-default slots.
- In Settings → Keyboard Shortcuts, show actual Chrome binding via `chrome.commands.getAll()` and a **Change shortcut** action opening Chrome's extension shortcut management. Chrome does not offer a programmatic rebinding API; don't pretend an in-app text field changes Chrome-wide bindings.
- Test closed/open-History/open-other view, fast repeat, manual close, multiwindow and actual Chrome behavior. Do not make a Shelf/History toggle trigger screenshot/save.

## 8. Destinations Manager visual polish — UI ONLY

- Reorganize existing Destinations Manager popup with a coherent header, Simple/Narrow/Depth mode tabs, current/default destination summary, aligned destination cards and actions, Show in Chrome controls, readable status and Save/pagination footer; especially visually attractive in Minimal and Bit o' Polish.
- Preserve its existing single draft→Save model, exact provider targets, Quick/Default/visibility, delete confirmations, native menu ACK, and **20/page** pagination (NOT Screenshot's 25/page). No rewriting right-click save engines or account data.

## 9. Implementation method, release and reporting

1. Fetch CURRENT `main` HEAD; verify current product 0.3.20 code and existing tests. Create new feature branch; keep main unchanged until verified. Read final specs in the order above; do NOT follow outdated archive specs when conflicting.
2. Repair Search and Get URL deltas; verify with focused tests and commit/push.
3. Implement Bit o' Polish five-palette Settings/Aesthetic API integration; preserve default Bit o' Polish, Minimal selection and Dark/Light. Apply Minimal warning cleanup. Test and commit/push.
4. Implement screenshot More entry, ordinary rule cards, the two real manifest-default commands, one central dispatcher, snapshot/matcher, one visible-tab capture and one browser upload, existing Worker fan-out and receipts. Prove actual Chrome/R2 where possible; commit/push independent milestones.
5. Implement Shelf→History keyboard toggle and Destinations Manager UI polish with isolated tests and no screenshot collisions; commit/push.
6. Run full existing and new focused/browser regression tests, review source/Chrome permissions and target constraints, build Chrome extension. Version `package.json`, lockfile as applicable, `extension/manifest.json`, bundled build metadata **consistently to 0.3.21** ONLY at verified ready-to-release stage. `manifest_version: 3` remains Chrome MV3.
7. Provide a final table of DONE/REPAIRED/NOT TESTED/BLOCKED by task, exact changed files, pushed branch and commit SHAs, genuine test counts/failures, real installed Chrome and disposable R2 evidence where available, honest limitations and resulting installable extension build/release artifact. Do not hide incomplete work, weaken tests just to pass, or claim Auto-Reroute was implemented.

## FINAL RELEASE INVARIANTS

**Must be true before claiming completed 0.3.21:** (A) **More → Screenshot** exists as its OWN menu entry above Settings; (B) ONLY the simple website→directory screenshot rule cards exist in that feature, NO per-card keys; (C) BOTH Alt+Q and Ctrl+Shift+Y have suggested Chrome defaults, both do identical work if Chrome assigns them; (D) one actual screenshot capture and browser upload can fan out to all matching directories with exact dedup ON/OFF and inspectable receipts; (E) Bit o' Polish is DEFAULT and has exactly FIVE selectable palettes under it; (F) existing Search/Get URL/Manager/History fixes and regressions are verified; (G) **NO AUTO-REROUTE or `More → Rules` appears in 0.3.21**.
