# Click2Cloud V3+1 GUI — executable acceptance journeys for Codex

**Status:** Documentation-only test protocol. These are NOT passing tests; implement `npm run test:gui` and a separate real-Chrome test harness.  
**Premise:** Build the GUI from REDOWN's recognizable Explorer/Shelf layout, but test the **new V3+1 combined engine** from `../README.md`, not historical V3-exclusive mode switching.

## Test levels and truth labels

- **D (Demo GUI)** — local browser at `http://localhost:4173/scaffold/gui/`, synthetic folder/provider fixture, actual implemented GUI + state + compiler. May simulate transfer; MUST label it `SIMULATED`.
- **C (Native Chrome)** — minimal Click2Cloud MV3 harness loaded as an unpacked extension, real `chrome.contextMenus` create/update/remove callbacks, actual submenu nesting, worker termination/restart, one click handler. No simulated DOM menu counts as C.
- **P (Real provider)** — independent account authorization, Cloudflare TRUE REMOTE Worker fetch to R2 and read-back receipt; other providers separately validated. Never silently substitute browser-bytes for Cloudflare TRUE REMOTE.
- **R (Durable recovery)** — independent filesystem/native companion backup location outside the browser profile; fault-injected storage loss and verified import/replay. Saving solely in IndexedDB or localStorage does NOT count.

Every journey has observable expected state, deterministic test data, and an actual PASS/FAIL/NOT_TESTED result. Run tests from a fresh clone in Windows 11/Chrome with Node >=20 as supported.

## A. Required launch and basic REDOWN layout

| ID | Test action | Expected observable result / tier |
|---|---|---|
| GUI-01 | Run `npm run demo` after clean checkout with NO REDOWN extension, NO auth and no cloud network. Open `http://localhost:4173/scaffold/gui/`. | Real working page opens, clear Demo indicator, no sender-authorization errors, no fake provider status. D |
| GUI-02 | First load | **Remotes is default**, visible cloud provider cards, odometer area and Explorer / Manage navigation. No onboarding gate hides basic navigation. D |
| GUI-03 | Open File Explorer; choose demo account A's `redown` bucket; expand `Art`, select `Photography`. | Breadcrumb and immutable selected exact account/bucket/prefix reflect `demo-account-a/redown/Art/Photography`. Normal folder list and keyboard navigation work. D |
| GUI-04 | Right-click selected Explorer folder, and separately press toolbar `+ Right Click`. | Both launch the SAME compact creation popup for exactly the selected location; the local Explorer right-click menu also offers Manage Destinations. D |
| GUI-05 | Change viewport, keyboard focus, type quickly in popup, Escape. | No jump, popover overlap, focus theft or accidental cloud mutation; clean dismissal and responsive layout. D |

## B. V3+1 creation and menu compiler

| ID | Action | Expected observable result / tier |
|---|---|---|
| MODE-01 | With only `redown` default root (no manually saved options), Depth OFF | `REDOWN → Cloudflare` is one actionable default leaf alongside flat provider siblings. No duplicate or arbitrary Home. D/C |
| MODE-02 | Select `Art/Photography`; Simple; leave title empty; Save | One flat leaf is added under Cloudflare with fallback title `Photography`. Native tree contains no `Art`/ancestor chain for this Simple option. Exact target is unchanged. D/C |
| MODE-03 | Add another Simple option titled `Invoices`. | Both Simple leaves coexist; Save is a real persistent configuration action and compiler updates. D/C |
| MODE-04 | Select `Art/Photography/Portraits`; switch to Narrow. | **Menu Titles tab appears**; actual bucket and every ancestor name are read-only left column; optional display titles right column. D |
| MODE-05 | Enter Setup title `Portrait Albums`, switch Menu Titles tab, change Art to `Creative`, Photography to `Photo Library`; Save. | Final field is bidirectionally synchronized with Setup; Chrome projection branches `redown → Creative → Photo Library → Portrait Albums`, exact destination unchanged. D/C |
| MODE-06 | Narrow → Simple → Narrow without saving, then Cancel | Menu Titles disappears entirely in Simple and reappears with same local draft when back on Narrow; Cancel writes nothing. D |
| MODE-07 | Save a Simple leaf and a Narrow branch for different paths; toggle Depth ON level 2 and then level 3, then OFF. | **Both manually saved types are always present.** Depth adds all indexed authorized folders (including unconfigured folders) up to chosen level; OFF removes ONLY generated Depth nodes; returns remembered last level on ON. No unnecessary full cloud scan. D/C |
| MODE-08 | Configure the exact same folder in two accounts; apply duplicate aliases | Stable menu route IDs distinguish accounts; visible collisions receive explicit handling; no cross-account save. D/C |
| MODE-09 | Test an actionable folder that also has children | Parent folder submenu is not itself misleadingly clickable as a save leaf: explicit `Save here` action exists where necessary. D/C |
| MODE-10 | Test a large hierarchy at depths 1,2,3,10 and >Chrome's menu budget. | Deterministic bounded projection and a truthful incomplete/overflow notice; existing Simple and Narrow entries do not disappear silently to make room. D/C |
| MODE-11 | Rapidly edit alias titles during a pending menu application | No duplicate destination IDs, no stale native receipt marking the wrong generation as applied. D/C |

## C. Manage Destinations — one popup, 20/page

| ID | Action | Expected observable result / tier |
|---|---|---|
| MANAGE-01 | Open from Explorer button; separately from Explorer folder's own context menu; separately from circular pointer below/right of odometer. | All open **one consistent manager GUI**, no stacked popup. D |
| MANAGE-02 | Generate 21 Simple and 21 Narrow entries from `demo-fixtures.json` scenario `page-boundary`. | Simple page 1 has 20, page 2 has 1. Narrow page 1 has 20, page 2 has 1. Independent page state and scroll preserved. D |
| MANAGE-03 | Change manager's Simple/Narrow switch at top | Lists only matching records. This is a LIST FILTER, not a conversion of any record. D |
| MANAGE-04 | Click a Simple row | SAME popup content changes to edit: immutable actual directory name LEFT and ONE editable Menu Title RIGHT, Save at bottom. `← Back to Destinations` directly BELOW the top switch. D |
| MANAGE-05 | Edit a Simple title then press Back / Escape instead of Save | Return to previously filtered list/page, original persisted label unchanged. Escape on list closes manager. D |
| MANAGE-06 | Open a Narrow saved row | SAME popup opens directly to two-column path/aliases editor; all levels original/read-only on left and editable titles on right; Save at bottom. D |
| MANAGE-07 | Save edit | Updates the exact existing record ID and its aliases, not creates a duplicate; Chrome target stays identical. D/C |
| MANAGE-08 | Click row X, cancel confirmation; then confirm | Cancel preserves record; confirm removes only menu configuration, **never a cloud folder/file**, and updates composer. D/C |
| MANAGE-09 | Toggle Settings `Show Manage Destinations in Chrome menu` OFF | Native `REDOWN → Manage Destinations` entry disappears, but Explorer and odometer controls still open manager. ON restores menu entry. D/C |

## D. CURRENT, journals, backup and failure recovery

| ID | Action | Expected observable result / tier |
|---|---|---|
| REC-01 | Create/edit/remove/rename 100 Simple/Narrow records with custom ancestor aliases | `menu-config/CURRENT.json` changes on each confirmed save, ordered semantic deltas append; historical snapshot cadence **WEEKLY BY DEFAULT**, with separate DAILY option. Journal not paused between backups. R |
| REC-02 | Create an indexed Depth tree; switch Depth level, turn off | `depth-index/CURRENT.json`/journal stores the complete known authorized graph and discovery/completeness independently. No overwrite of menu-config recovery root. R |
| REC-03 | Deliberately clear the workbench IndexedDB and restart | Restore from independently durable snapshot + verified deltas with no full directory crawl. Check exact IDs, aliases, ordering, Simple, Narrow, Depth; no duplicate native menus. R/C |
| REC-04 | Simulate extension uninstall/reinstall with external recovery files preserved | User's defined menus and known index return, but cloud credentials require renewed authorization. No accidental wrong-account binding. R/C |
| REC-05 | Corrupt latest `CURRENT.json` and keep a valid weekly backup plus deltas | Integrity-check and replay last valid contiguous sequence; reject corrupted/noncontiguous entries with clear error, never silently drop all manually saved titles. R |
| REC-06 | Crash between working DB commit, journal write, external CURRENT replace and native ACK | Deterministic at-most-once semantic commit/replay and repaired desired-vs-applied generation; never claim backed-up/applied before acknowledged. R/C |
| REC-07 | Companion missing, file read-only/disk-full, or user-selected external path gone | GUI distinctly reports `Saved locally, external backup unavailable` instead of `Protected`. No misleading green success. R |
| REC-08 | Delete Depth recovery data but preserve menu-config backups; and vice versa | Recovery systems are independent. Restoring one does not delete the other's state or force cross-mode reset. R |

## E. Real Chrome / provider acceptance (NOT implied by demo)

| ID | Action | Required proof |
|---|---|---|
| CHROME-01 | Install standalone Click2Cloud test extension in Chrome | Actual nested submenus and default-only leaf, provider siblings, real Manage shortcut, auto-reconciliation after worker restart. One root, one listener. C |
| CHROME-02 | Click every menu leaf using file/image/link/page context | Same canonical route as GUI preview, exactly authorized provider/account/bucket/prefix, no phantom destination fallback. C |
| PROVIDER-01 | Cloudflare TRUE REMOTE public HTTPS test asset | Worker downloads remotely and writes R2; independently verify object and bytes before confirmed success. No browser bytes fallback claimed as TRUE REMOTE. P |
| PROVIDER-02 | Google Drive/Dropbox/OneDrive | Separate flat provider leaves, approved token transport and minimal bytes/filename metadata, real provider upload receipts before success. P |
| TRUST-01 | Disconnect/revoke account with existing saved menu | Keep recovery aliases but block save until reauthorized. Never redirect to some other connected account. C/P |

## Reporting template

```text
Feature: [MODE-07] Additive Depth keeps Simple and Narrow
Tier: Demo GUI / Native Chrome / Real Provider / Durable Recovery
Status: PASS | FAIL | BLOCKED | NOT_TESTED
Commit:
Commands:
Environment:
Evidence: screenshot path, compiler diff, Chrome native ACK, provider receipt,
          or external backup readback + integrity verification (as appropriate)
Known limitations:
```

**Minimum Codex handoff:** an operating GUI, command to launch it, commands/test results for GUI journeys, changed file list, and truthful declaration of untested Chrome/provider/backup tiers. Never substitute a screenshot or DOM mock for actual native menu or recovery proof.
