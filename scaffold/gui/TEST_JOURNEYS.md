# Click2Cloud V3+1 GUI — executable acceptance journeys for Codex

**Status:** Documentation-only acceptance protocol; these are NOT passing tests. Primary acceptance requires a **real unpacked Click2Cloud MV3 Chrome extension**, **actual Cloudflare OAuth** for its installed extension identity, **actual Chrome native context menus**, and real authorized Worker→R2 saves with independent readback. See [Chrome extension contract](./CHROME_EXTENSION_LIVE_ACCEPTANCE.md) and [REDOWN OAuth extraction](./REDOWN_OAUTH_EXTRACTION.md).

**Premise:** Borrow REDOWN's Explorer/Remotes layout, but implement the NEW V3+1 combined engine. **Existing Workers are Codex's live test infrastructure, not a replacement for browser OAuth.**

### Test classes and truthful proof

- **C = real Chrome** — extension loaded through `chrome://extensions` → Load unpacked; real `chrome.contextMenus` registration, branching, clicks and MV3 restart with ACK.
- **O = real OAuth** — user explicitly consents via Cloudflare to Click2Cloud's own registered extension/client/redirect; token and account verified, no copied REDOWN credentials.
- **P = real provider** — actual authorized Worker (lab service binding / authenticated route), disposable `redown/__redown_v3plus1_lab__/` R2 prefix, completed upload and independent object read-back.
- **R = independent durable recovery** — external filesystem/companion CURRENT, journals and backups outside Chrome profile; actual fault-injected data loss/replay.
- **F = isolated fault/fixture** — synthetic cases allowed ONLY for stress, failure handling and edge cases; these do not qualify as O/C/P successes.

Every test must report PASS / FAIL / BLOCKED / NOT TESTED with actual evidence. No simulated OAuth or DOM faux menu can count as a passing live test.

## A. Install + OAuth + basic REDOWN-style GUI (REAL)

| IC | Test action | Required result |
|---|---|---|
| CHROME-BOOT-01 | Build/package MV3 extension from clean Click2Cloud clone; load `manifest.json` directory through Developer mode → Load unpacked | Extension installs with no manifest/runtime errors; toolbar opens Click2Cloud Remotes; Explorer entry visible. **C** |
| OAUTH-01 | On independently installed Click2Cloud, press **Connect Cloudflare** | Real Cloudflare consent/login opens for Click2Cloud's own OAuth client/extension ID and accurate permissions; no REDOWN token reused. **O** |
| OAUTH-02 | Complete sign-in; inspect account state | Genuine Cloudflare management API confirms intended account, bucket access and token scope; no false ready based on token presence alone. **O** |
| OAUTH-03 | Refresh expiry, suspend/restart service worker, reconnect/revoke grant | Refresh/reconnect works when authorized; revoked connection safely blocks saves and preserves saved menu aliases. **O/C** |
| GUI-01 | Open Click2Cloud Explorer from toolbar / Remotes | Real Cloudflare `redown` bucket and actual authorized folders listed; no fictional account shown as connected. **C/O/P** |
| GUI-02 | Select a real folder in approved `__redown_v3plus1_lab__/` prefix | Breadcrumb shows exact authorized account/bucket/prefix. No manual path re-entry to create destination. **C/O/P** |
| GUI-03 | Right-click selected Explorer folder; use `+ Right Click` | The compact Simple/Narrow creation popup opens for actual selected location, with the same target in both entry paths. **C** |
| GUI-04 | Keyboard, focus, resize and Escape | Responsive popup, no focus theft, no accidental cloud writes. **C** |
| GUI-FIXTURE-01 | Inject synthetic 5000-folder hierarchy or timeout | Compiler handles bounded failures but does not count as real account/Worker/browser proof. **F** |

## B. V3+1 creation and menu compiler

| IC | Action | Expected observable result / tier |
|---|---|---|
| MODE-01 | With only `redown` default root (no manually saved options), Depth OFF | `REDOWN → Cloudflare` is one actionable default leaf alongside flat provider siblings. No duplicate or arbitrary Home. C |
| MODE-02 | Select `Art/Photography`; Simple; leave title empty; Save | One flat leaf is added under Cloudflare with fallback title `Photography`. Native tree contains no `Art`/ancestor chain for this Simple option. Exact target is unchanged. C |
| MODE-03 | Add another Simple option titled `Invoices`. | Both Simple leaves coexist; Save is a real persistent configuration action and compiler updates. C |
| MODE-04 | Select `Art/Photography/Portraits`; switch to Narrow. | **Menu Titles tab appears**; actual bucket and every ancestor name are read-only left column; optional display titles right column. C |
| MODE-05 | Enter Setup title `Portrait Albums`, switch Menu Titles tab, change Art to `Creative`, Photography to `Photo Library`; Save. | Final field is bidirectionally synchronized with Setup; Chrome projection branches `redown → Creative → Photo Library → Portrait Albums`, exact destination unchanged. C |
| MODE-06 | Narrow → Simple → Narrow without saving, then Cancel | Menu Titles disappears entirely in Simple and reappears with same local draft when back on Narrow; Cancel writes nothing. C |
| MODE-07 | Save a Simple leaf and a Narrow branch for different paths; toggle Depth ON level 2 and then level 3, then OFF. | **Both manually saved types are always present.** Depth adds all indexed authorized folders (including unconfigured folders) up to chosen level; OFF removes ONLY generated Depth nodes; returns remembered last level on ON. No unnecessary full cloud scan. C |
| MODE-08 | Configure the exact same folder in two accounts; apply duplicate aliases | Stable menu route IDs distinguish accounts; visible collisions receive explicit handling; no cross-account save. C |
| MODE-09 | Test an actionable folder that also has children | Parent folder submenu is not itself misleadingly clickable as a save leaf: explicit `Save here` action exists where necessary. C |
| MODE-10 | Test a large hierarchy at depths 1,2,3,10 and >Chrome's menu budget. | Deterministic bounded projection and a truthful incomplete/overflow notice; existing Simple and Narrow entries do not disappear silently to make room. C |
| MODE-11 | Rapidly edit alias titles during a pending menu application | No duplicate destination IDs, no stale native receipt marking the wrong generation as applied. C |

## C. Manage Destinations — one popup, 20/page

| IC | Action | Expected observable result / tier |
|---|---|---|
| MANAGE-01 | Open from Explorer button; separately from Explorer folder's own context menu; separately from circular pointer below/right of odometer. | All open **one consistent manager GUI**, no stacked popup. C |
| MANAGE-02 | Generate 21 Simple and 21 Narrow entries from `demo-fixtures.json` scenario `page-boundary`. | Simple page 1 has 20, page 2 has 1. Narrow page 1 has 20, page 2 has 1. Independent page state and scroll preserved. C |
| MANAGE-03 | Change manager's Simple/Narrow switch at top | Lists only matching records. This is a LIST FILTER, not a conversion of any record. C |
| MANAGE-04 | Click a Simple row | SAME popup content changes to edit: immutable actual directory name LEFT and ONE editable Menu Title RIGHT, Save at bottom. `← Back to Destinations` directly BELOW the top switch. C |
| MANAGE-05 | Edit a Simple title then press Back / Escape instead of Save | Return to previously filtered list/page, original persisted label unchanged. Escape on list closes manager. C |
| MANAGE-06 | Open a Narrow saved row | SAME popup opens directly to two-column path/aliases editor; all levels original/read-only on left and editable titles on right; Save at bottom. C |
| MANAGE-07 | Save edit | Updates the exact existing record ID and its aliases, not creates a duplicate; Chrome target stays identical. C |
| MANAGE-08 | Click row X, cancel confirmation; then confirm | Cancel preserves record; confirm removes only menu configuration, **never a cloud folder/file**, and updates composer. C |
| MANAGE-09 | Toggle Settings `Show Manage Destinations in Chrome menu` OFF | Native `REDOWN → Manage Destinations` entry disappears, but Explorer and odometer controls still open manager. ON restores menu entry. C |

## D. CURRENT, journals, backup and failure recovery

| IC | Action | Expected observable result / tier |
|---|---|---|
| REC-01 | Create/edit/remove/rename 100 Simple/Narrow records with custom ancestor aliases | `menu-config/CURRENT.json` changes on each confirmed save, ordered semantic deltas append; historical snapshot cadence **WEEKLY BY DEFAULT**, with separate DAILY option. Journal not paused between backups. R |
| REC-02 | Create an indexed Depth tree; switch Depth level, turn off | `depth-index/CURRENT.json`/journal stores the complete known authorized graph and discovery/completeness independently. No overwrite of menu-config recovery root. R |
| REC-03 | Deliberately clear the workbench IndexedDB and restart | Restore from independently durable snapshot + verified deltas with no full directory crawl. Check exact IDs, aliases, ordering, Simple, Narrow, Depth; no duplicate native menus. R/C |
| REC-04 | Simulate extension uninstall/reinstall with external recovery files preserved | User's defined menus and known index return, but cloud credentials require renewed authorization. No accidental wrong-account binding. R/C |
| REC-05 | Corrupt latest `CURRENT.json` and keep a valid weekly backup plus deltas | Integrity-check and replay last valid contiguous sequence; reject corrupted/noncontiguous entries with clear error, never silently drop all manually saved titles. R |
| REC-06 | Crash between working DB commit, journal write, external CURRENT replace and native ACK | Deterministic at-most-once semantic commit/replay and repaired desired-vs-applied generation; never claim backed-up/applied before acknowledged. R/C |
| REC-07 | Companion missing, file read-only/disk-full, or user-selected external path gone | GUI distinctly reports `Saved locally, external backup unavailable` instead of `Protected`. No misleading green success. R |
| REC-08 | Delete Depth recovery data but preserve menu-config backups; and vice versa | Recovery systems are independent. Restoring one does not delete the other's state or force cross-mode reset. R |

## E. Real native Chrome + Worker/R2 acceptance (MANDATORY, not optional after demo)

| IC | Action | Required proof |
|---|---|---|
| CHROME-01 | Install standalone Click2Cloud test extension in Chrome | Actual nested submenus and default-only leaf, provider siblings, real Manage shortcut, auto-reconciliation after worker restart. One root, one listener. C |
| CHROME-02 | Click every menu leaf using file/image/link/page context | Same canonical route as GUI preview, exactly authorized provider/account/bucket/prefix, no phantom destination fallback. C |
| PROVIDER-01 | Cloudflare TRUE REMOTE public HTTPS test asset | Worker downloads remotely and writes R2; independently verify object and bytes before confirmed success. No browser bytes fallback claimed as TRUE REMOTE. P |
| PROVIDER-02 | Google Drive/Dropbox/OneDrive | Separate flat provider leaves, approved token transport and minimal bytes/filename metadata, real provider upload receipts before success. P |
| TRUST-01 | Disconnect/revoke account with existing saved menu | Keep recovery aliases but block save until reauthorized. Never redirect to some other connected account. C/P |

## Reporting template

```text
Feature: [MODE-07] Additive Depth keeps Simple and Narrow
Tier: Real Chrome / Click2Cloud OAuth / Real Worker+R2 / Durable Recovery / Isolated fixture
Status: PASS | FAIL | BLOCKEC | NOT_TESTED
Commit:
Commands:
Environment:
Evidence: screenshot path, compiler diff, Chrome native ACK, provider receipt,
          or external backup readback + integrity verification (as appropriate)
Known limitations:
```

**Minimum Codex handoff:** an operating GUI, command to launch it, commands/test results for GUI journeys, changed file list, and truthful declaration of untested Chrome/provider/backup tiers. Never substitute a screenshot or DOM mock for actual native menu or recovery proof.
