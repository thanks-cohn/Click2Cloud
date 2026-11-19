# NEXT CODEX RUN — CODE-AUDITED, DELTA-ONLY HANDOFF + RULES

**Date:** November 19, 2026
**Repository:** `thanks-cohn/Click2Cloud`
**Audited source branch/HEAD:** `codex/click2cloud-0.3.20` at `2481fcf9cba262efc421844079a13939ca5985aa`
**Priority:** Preserve completed 0.3.20 work; fix only demonstrated gaps; implement the newly specified Rules feature as a separate gated workstream.

> **This is the authoritative next-run request.** The large historical `next-codex/README.md` / `CODEX_NEXT_EXPLORER_SEARCH_UI_AND_WORKER_IMPLEMENTATION_2026-11-18.md` described work that WAS implemented on the 0.3.20 branch. **Do not blindly execute their old implementation steps again.** Read the present source and tests, compare current HEAD to the audited snapshot, and do only genuine remaining deltas. Older requirements remain useful as acceptance criteria, not as proof of missing code.

## 0. Ground rules and source audit before coding

1. Start from the **latest branch HEAD**, not 0.3.19 or the older `codex/redown-reliability-click-and-done-2026-11-18` branch. Create a **new implementation branch**, keep 0.3.20 as rollback, and do not touch `main`. No repeat "upgrade version to 0.3.20" work.
2. Read the actual production code, not just prose: `extension/app.mjs`, `extension/explorer-layout.mjs`, `extension/explorer-exports.mjs`, `extension/app.html`, `extension/background.mjs`, the V3+1.1 API and relevant tests. Identify the specific failing behavior before changing it.
3. **Present in source ≠ proven in real Windows Chrome/R2**. Record status as implemented+fixture tested, implemented but not live-verified, partial, unimplemented, or provider-blocked. Run focused tests and preserve existing successful behavior. Fix only the remaining gap; don't rebuild whole modules.
4. Distinguish the P0 wrong-bucket report from UX changes. No production-cloud modifications, destructive remaps or speculative fixes. Preserve existing Simple/Narrow/Depth routing, exact-target receipt evidence, right-click History, authorization and Worker topology.
5. Commit and push each safely independent milestone, providing a real GitHub SHA, diff and actual tests. Report blocked tasks and unverified real-environment claims separately; don't mark work complete from a file edit alone.

## 1. ALREADY BUILT — verification only, DO NOT REIMPLEMENT

| Earlier Codex task | Evidence in current branch | What to do |
| --- | --- | --- |
| Extension version 0.3.20 | `extension/manifest.json` and `package.json` both show `0.3.20` | Verify generated build/install version; **do not repeat the bump** |
| Filename search engine, current folder scope, paging, IndexedDB inventory | `src/api/service.mjs`, `extension/app.mjs`, `docs/evidence/filename-search.md`, `scripts/test-filename-search-browser.mjs` | Keep engine, only fix Search UI lifecycle below |
| Search pop-out and Ctrl+Shift+F7; expanded toolbar, F8/F9 and removed extra More controls | `extension/explorer-layout.mjs`, `scripts/test-release-0320-browser.mjs` | Verify/reuse; add X and preserve query/results |
| Editable shortcuts Settings card, collision checks, persistent binding resolver | `extension/shortcut-settings.mjs`, `src/api/shortcuts.mjs` | Verify only; do not build a second shortcut system |
| Inline image rename by double-click and caption removal | `extension/app.mjs` `bindInlineRename`; release-browser tests | Verify only |
| Any authorized folder → right-click Make Default, auto-create/reuse Simple destination | `extension/app.mjs` `makeExplorerDefault` with `ensureSimple:true`; release-browser tests | Verify exact target/native ACK; don't rewrite |
| Show in Chrome Simple/Narrow/Depth checkbox row; removed Cloud connections label; single-row Refresh when room | `extension/app.mjs`, `extension/explorer-layout.mjs` and browser tests | Verify only |
| New Remotes hero/subtitle and one Cloudflare heading in Remotes | `extension/app.mjs` `renderRemotes`, `renderConnection`; release-browser tests | Already present; remaining Minimal warnings below are separate |
| V3+1.1 shortcut/API registry and complete method reference | `src/api/service.mjs`, `src/api/shortcuts.mjs`, `docs/api/API-COMMAND-REFERENCE.md`, `scripts/check-api-command-docs.mjs` | Validate coverage of final HEAD; append only genuinely new API methods |
| Daily number on Chrome's extension toolbar badge, midnight rollover | `src/chrome/daily-badge.mjs`, `extension/background.mjs`, `tests/release-0320.test.mjs` | Fixture-implemented; check real Chrome when available; NO duplicate Shelf badge |
| Get URL flag, first-time Yes/No, existing active custom-domain lookup, exact-key URL derivation, directory URL CSV/JSON/TXT grouping | `extension/explorer-exports.mjs`, `src/api/service.mjs`, `src/explorer/object-exports.mjs` | **PARTIAL UI**: retain and improve existing Get URL flow, do not create a second engine |
| Optional tagged/metadata download paths, recursive directory ZIP receipts, Debug-only Downloads view | `extension/explorer-exports.mjs`, `src/explorer/download-archive.mjs`, release tests, `docs/api/EXPERIMENTAL-EXPORTS-0.3.20.md` | Feature-gated, implemented in source; verify rather than recreate |
| Tags editor and metadata reading | `extension/explorer-exports.mjs` | **PARTIAL**: actual persistent Cloudflare tag Save remains intentionally disabled pending safe verified conditional write; don't claim it works |

The existing release-browser fixture **asserts the old unwanted Search behavior** (Enter closes pop-out). Correct this test when repairing Search. Source/fixture success is not a live Chrome or Cloudflare guarantee.

## 2. REMAINING P1 A — Search stays open, closing preserves FILTERED RESULTS

**Confirmed defect:** `extension/app.mjs` `#filename-search-form` still calls `explorerLayoutUI.hide()` on Enter in a pop-out; its Escape handler calls `clearFilenameSearch()`. `extension/explorer-layout.mjs` also dismisses Search from general pointer/focus changes. No distinct far-right X close button is present.

**Owner contract, superseding old instructions:**
- Enter runs existing `searchDirectoryNames` **without closing the search input/pop-out**; repeat Enter, zero results and errors also keep it visible.
- **Only Escape or the far-right X inside the Search input** hides Search. A click on a file result, harmless focus change, resize, repaint or submission must not close it.
- Closing Search **does NOT clear the query or filtered results**. The Explorer file list remains filtered after the input is hidden. Reopening in the same folder restores the previous query and still displays those same results until changed or explicitly cleared.
- Maintain a distinct Clear search action; deliberately deleting the search text may clear the filter. Changing folder/account/auth invalidates stale scope safely.
- Keep one search form, the current search API/cache, and the established shortcuts.

Focused test: type `photo`, Enter → remains open/results; Escape or X → search field hidden but the SAME results still displayed; reopen → old `photo` remains; explicitly Clear → normal listing. Test inline and pop-out, keyboard and pointer, account/folder scope, no save regression.

## 3. REMAINING P1 B — Get URL is BOTH configuration and immediate result

**Existing code to preserve:** `extension/explorer-exports.mjs` `urls()` calls `getPublicUrls`; `urlEditor()` accepts Enter in the domain form and already renders existing verified domains as plain URL paragraphs with separate per-item Copy and a `Copy selected URLs` button. This **is partially implemented, not missing from scratch**. `src/api/service.mjs` currently detects active custom domains; a typed domain that is not linked is NOT automatically registered with Cloudflare.

**Final owner layout and behavior:**

```text
Get URL
Connected Cloudflare domain
Website/domain: [your-domain.com          ] [Submit] [Copy All]

Public URLs
[ https://domain-one.example/path/to/object.png ]   ← entire card copies this URL
[ https://domain-two.example/path/to/object.png ]   ← entire card copies this URL
  (scrollbar inside card list when many)
```

- Input → **Submit** → **Copy All** all on the same row, in that exact order. Pressing Enter in the input **and clicking Submit call the identical domain verification/link workflow**. Do not close the popup on submission.
- **Immediately show all existing, verified bucket-domain object URLs** as individual minimal cards beneath the input when opened. No prior user input needed.
- Once a newly submitted domain is confirmed associated with the exact account/bucket and active, the resulting full exact-key URL appears immediately in the list **without another click/reopen**; keep older URL cards.
- **Click ANYWHERE on one card to copy ONE URL** (including Enter/Space keyboard activation), not navigation; no separate Copy button inside each card. Provide subtle copy success/failure feedback.
- Copy All copies every displayed URL, including scrolled-out cards, one per line, unique, correct order; no per-domain checkbox prerequisite. Button stays right beside Submit while list scrolls.
- Cards are in a height-bounded **internally scrollable** area; keep input/action row visible. Handle long URLs/accessibility.
- With no verified public endpoint, show persistent Public URLs empty state and **Recheck**. If Cloudflare setup is needed, use existing explicit authorization and describe the missing Cloudflare step; **do not claim that Enter automatically adds DNS/bucket public access when provider code cannot do so**. Never silently expose private buckets.
- Current custom-domain reader does not prove enabled `r2.dev` discovery or anonymous GET reachability. Add truly supported provider read paths if safely feasible; otherwise report this limitation honestly. Distinguish a verified mapping from tested anonymous reachability. No guessed URLs or cross-bucket links. Preserve directory URL export and exact per-file identity.
- Reuse existing `getPublicUrls`, `objectUrls`, `verifiedDomains`, export flags, and first-time **Allow Public URL? Yes/No** gate; no new parallel implementation.

Focused tests: one/multiple existing domains, Submit=Enter, new domain verified in same dialog, invalid/mismatched domain, scrolling, click-one copies, Copy All including offscreen, clipboard errors, exact Unicode/prefix key, private/no public domain, directory URLs.

## 4. REMAINING P1 C — Minimal only: remove unwanted generic/technical warnings

- `extension/app.mjs` `quietFeedback()` still emits **`This action needs attention. Review the current panel or History.`** for unknown error states.
- `selectedSetupMarkup()` still injects `#selected-save-setup` into ordinary `renderRemotes()` on relevant cases, including Minimal.
- `#remote-summary-attention` can show unsolicited "Check History" warnings in Minimal.

**Remove these generic warning/technical preparation elements from the ordinary Minimal appearance**, including reconnect/errors/view refresh. No synonyms replacing the generic warning. **Do not remove** real failure state, authentication/reconnect actions, protection of actual cloud mutations, underlying repair capability, receipts, History or diagnostics. Non-Minimal and explicitly requested technical/debug views retain access. Don't redo the already-correct hero or Cloudflare title.

## 5. NEW FEATURE — top dropdown **Rules**, directly ABOVE Settings

**New owner request (Nov 19):** Provide a friendly **Rules** page where users configure automatic browser-download-to-cloud routing by file extension and exact cloud destination, name each rule, click **Save**, and manage existing rules. This is new functionality, **not** something already shipped in 0.3.20. Previous idea notes at `minor-fixes/major-fixes.md` are background only; do NOT reimplement an engine that isn't there, and do not confuse manual Explorer Download with automatic browser download routing.

### UI contract

- Add a **Rules** entry in the existing upper-right **More** dropdown, **immediately ABOVE Settings** (`extension/app.html` currently has Settings as its first menu item). It opens a dedicated Rules screen; don't bury it in the Settings page.
- Simple top-of-page **New/Edit Rule** form with fields: **Rule name**, **File extension/type** (e.g. png, jpg, pdf, zip; handle leading dot/case/canonical matching safely), **Destination cloud folder** selected from an actually authorized provider/account/bucket/path (folder picker or equivalent trustworthy selection), and **Save**. Also offer an optional website/source filter if feasible via existing rules architecture, while making extension + destination the simple primary path.
- **Name is user-editable**, with an automatically assigned default **`Rule 1`, `Rule 2`, `Rule 3` ...** when omitted. Use a persistent monotonic next-number/ID so deleting/reordering rules never silently renames existing rules; names are presentation, immutable internal IDs are used for execution.
- On successful Save, validate and **persist** the rule through the existing trusted local configuration/API architecture and show the saved rule **in a list underneath the form immediately**. Do not claim success before persistence is confirmed. Each saved card/row shows name, extension match, exact destination, and enabled status. Allow editing, enabling/disabling and deleting with appropriate safeguards. Keep previously saved rules across restart.
- **25 rules per page** in the saved-rules list. At rule 26 (or when count exceeds 25), show pagination (Previous/Next and current page; reliable order). 25 is a **page size, NOT a total-rule limit**. Editing/deleting while paginated must not lose data or duplicate rule numbers. Large lists should remain usable with keyboard/screen readers.
- If two enabled rules could match the same download, show a clear and deterministic precedence/priority policy (first in user-defined order or explicit priority). Never dispatch the same browser download twice or silently send to an unintended destination.
- Friendly empty state, field validation, safe error feedback, no confusing internal Worker/Cloudflare terminology in ordinary UI. A rule with no valid authorized destination cannot be enabled.

### Actual rerouting is an independent feasibility/safety gate — no fake success

- This UI is intended to configure **REAL automatic browser downloads routed to an exact cloud directory**, not merely store notes. **First audit existing code and Chrome's current download/network APIs to establish whether Click2Cloud can actually access authorized source bytes, handle links/redirects/cookies/CORS, and stream to R2 without staging an unwanted complete local file.** Do not assume Chrome's `downloads` event alone exposes the downloaded response body, or automatically intercept private/authenticated downloads. Do not add blanket invasive interception or new permissions without a specific justified implementation and consent.
- If technically and permission-wise feasible, implement the **smallest safe OFF-by-default rule execution slice** using existing File API/cloud transport, bounded memory, exact account/bucket/prefix, verified source and remote results, cancellation/failure reporting. A rule is not operational merely because a Save button succeeded.
- If not feasible with present APIs/permissions, **still implement the validated persistent rule-management interface if possible but plainly mark rules inactive/unavailable for auto-routing** (not a fake enabled switch); document the concrete blocker and separate native/desktop relay options for later. Do not claim real downloads were redirected. Preserve normal Chrome downloads if unmatched or the interception capability isn't established.
- Keep rule configuration and execution separated, use the existing V3+1.1 API where sensible, guard credentials/private content, and keep the existing right-click save History and ZIP receipts unmodified. Add small scoped diagnostics if execution exists, independently from existing save proof.

### Focused acceptance

A) User opens More → Rules **above Settings**, adds extension `png` to a selected authorized Cloudflare directory, leaves name empty, presses Save → persisted **Rule 1** appears below. B) Create another with a custom name; edit and disable it; restart/reopen, data remains. C) Create 26 → page 1 shows exactly 25, page 2 shows remaining 1, Previous/Next retains state. D) Invalid extension / missing authorization / duplicate/conflicting active rule produce clear feedback, not success. E) If execution is supported, run only controlled opt-in fixture/disposable-object tests for exact target, precedence, source access, byte verification and safe failure; if not supported, visibly disabled with an accurate blocker, never misleading "download redirected" confirmation.

## 5A. NEW — Screenshot-to-Cloud destinations, additive website rules and per-rule shortcuts

**Binding detailed handoff:** [SCREENSHOT_TO_CLOUD_CONTEXT_MENU_AND_ADDITIVE_RULES_2026-11-19.md](SCREENSHOT_TO_CLOUD_CONTEXT_MENU_AND_ADDITIVE_RULES_2026-11-19.md).

- **Browser right-click → Screenshot → choose exact authorized cloud bucket/folder**; alternatively explicitly apply matching screenshot rules. Clicking **Screenshot** in the Shelf's More dropdown opens a dedicated Screenshot Rules editor, not a capture.
- **More menu order:** Rules → Screenshot → Settings. Screenshot and download routing use separate rule collections.
- Screenshot Rules have optional name (Rule 1, Rule 2, ...), exact website/subdomain/wildcard matching, exact authorized destination, Save, list beneath the form, Edit, Activate/Disable, X Delete on the far right, and **25 rules per page**. General download Rules also get the X, switch, and 25-per-page structure.
- **Additive matching is essential:** one user-triggered screenshot can match multiple enabled rules and upload to **all distinct matching destinations** (e.g., three buckets/folders). Do not reject site overlap or force a single winner. Deduplicate only identical target identities and report independent upload outcomes for each.
- **One optional shortcut per Screenshot Rule:** pressing it explicitly captures and uploads to *that one rule's destination*, not every matching rule. Reuse the existing canonical shortcut registry, collision detection, persistence and Settings conventions; handle disabled rules and shortcut scope truthfully.
- Only user-triggered, Chrome-authorized captures. No hidden/background surveillance, invented permissions or claimed successful cloud delivery without evidence. This is new work, not an excuse to rebuild existing saves.

## 5B. P1 — Destinations Manager visual organization

**Binding detailed handoff:** [DESTINATIONS_MANAGER_POLISHED_STRUCTURED_DIALOG_2026-11-19.md](DESTINATIONS_MANAGER_POLISHED_STRUCTURED_DIALOG_2026-11-19.md).

- Restyle the *existing* `extension/app.mjs` `manager()` popup with a visually coherent header, mode tabs, current/default destination summary, well-aligned destination cards and action groups, separated Show in Chrome controls, readable status and a consistently placed Save/pagination footer.
- **Minimal must still be attractive and structured**: typography hierarchy, whitespace, restrained separators, consistent control sizes, long-name handling, responsive/modal scrolling and accessibility. No giant eye/trash controls or haphazard stacking.
- **UI-only:** preserve draft staging and single Save, Simple/Narrow/Depth modes, current 20-per-page Manager pagination, Quick/Default/visibility, delete confirmations, exact provider targets, native menu ACK, engine logic and other aesthetics. Do **not** mistakenly impose Rules' 25-per-page on Destinations Manager.

---

## 5C. NEW — one shared diagnostics system, scoped Raw/Secure ZIPs

**Binding contract:** [LIGHTWEIGHT_DIAGNOSTICS_AND_RAW_SECURE_ZIPS_FOR_RULE_TRANSFERS_2026-11-19.md](LIGHTWEIGHT_DIAGNOSTICS_AND_RAW_SECURE_ZIPS_FOR_RULE_TRANSFERS_2026-11-19.md).

Screenshot-to-Cloud and browser-download-reroute workflows must extend the **existing diagnostics/recorder/export framework**, not add parallel recorders, competing event writers, separate History, or colliding event IDs. Record cheap known quantities (filename, source/upload/cloud byte counts, UTC timestamps, rule, exact cloud target, operation/stage/status and truthful verification method). Keep the additive screenshot capture-to-many-destinations correlation explicit. Existing **Raw/Secure exporter** gets a workflow scope filter: `right-click saves` or `rule-based transfers`, yielding two compatible forensic ZIPs when desired; do not create two exporters. Advanced trace level reuses the existing gated diagnostics behavior. Logging/export failures never affect a transfer. Never expose secrets in Secure.

---

## 6. P0 — wrong destination must be independently triaged

`Issues_and_Bugs/Bugs/P0_FLAT_CLOUDFLARE_WRONG_BUCKET_IMAGES_2026-11-19.md` documents an owner-reported flat Cloudflare right-click save landing in `images` after another destination was configured. Root cause is **NOT proven**. This is higher consequence than UX polish.

Before any real save test, preserve read-only SECURE diagnostics, exact `menuItemId` / native acknowledged generation / intended account+bucket+key / provider binding / receipt identity, and distinguish stale Quick/hidden rows, another installed extension, or a genuine routing failure. No speculative reset, no real writes to wrong bucket, no broad Worker changes. Only patch a demonstrably wrong mapping with precise fixture+receipt regression tests. Report result separately.

## 7. Deferred, not part of this delta

Cloud persistent tag-writing is still **disabled** pending safe conditional metadata replacement; current `r2.dev` and new custom-domain administration are not proven; the **new screenshot feature remains pending implementation and Chrome permission verification** (see §5A), future multi-cloud tabs, full download auto-reroute architecture, desktop/native agents and wholesale Worker redesign are NOT automatically completed by this request. The **Rules UI** is newly requested, but real rerouting proceeds only through the explicit feasibility + safely verified gate above. No second API, second screenshot engine, second History store or parallel receipts ledger.

## 8. Milestones and truthful end report

1. **Read-only audit / P0 triage**: report what is already present, what is incomplete, and what is not testable on the current machine; preserve evidence.
2. **Search lifecycle repair**: focused Chrome fixture and regression tests; commit+push.
3. **Get URL UX delta**: reuse existing API, test public/private and multi-domain cases; commit+push.
4. **Minimal presentation cleanup**: focused theme/error tests; commit+push.
5. **Rules menu + validated persistent editor + page size 25**: separate isolated implementation; commit+push. Real download routing only after proven feasible, opt-in and correctly tested.
6. **Screenshot rule UI + right-click destination capture + per-rule shortcuts and shared diagnostics**: verify Chrome capture authority, implement additive multi-destination fan-out without rewriting existing save/shortcut/recorder engines; test exact targets and shared Raw/Secure export scopes; commit+push.
7. **Destinations Manager popup visual polish**: isolate structure/CSS, test Simple/Narrow/Depth draft/Save flows and native ACK; commit+push.
8. Full regression suites, build manifest validation, API registry-vs-doc coverage check, real Chrome/R2 verification only if actually possible. Do not unreasonably rewrite old tests to pass by removing assertions.
9. Return **a table of DONE/REPAIRED/NOT TESTED/BLOCKED**, exact file paths and commit SHAs, passing/failing tests, known warnings, and a working pushed branch. Preserve unchanged systems.

**Latest detailed Search/Get URL/Minimal user UX acceptance reference:** `/codex-timestamp-latets.md` (most recent instructions override any older conflicting mockups).
