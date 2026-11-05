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
| MODE-07 | Save Simple and Narrow and Depth bucket display settings, then choose popup **Show:Simple ON/Narrow ON/Depth OFF** and click Save. | Both manual menu types appear; Depth does not. All three saved configurations remain intact. No Explorer hierarchy toggle exists. **C** |
| MODE-07A | Popup Depth tab lists new authorized buckets. | Independent per-bucket display ON/OFF and depth, initialized **10** but accepting 17, 50 or larger supported positive integer with **no app-imposed limit**. **C** |
| MODE-07B | Change a Depth bucket display level and Show selections, then Cancel/Escape. | No changes leak to CURRENT or native Chrome menu. Previous committed selections and depths reload. **C** |
| MODE-07C | Enable Show:Depth but leave all Depth bucket display checkboxes unchecked, then Save. | Exactly zero generated Depth branches; Simple/Narrow visible only if their Show toggles are ON. **C** |
| MODE-07D | Turn Show:Simple OFF/Narrow ON/Depth OFF, Save; then Show:Simple ON/Narrow OFF/Depth OFF, Save. | Only Narrow in first menu; only Simple in second. Neither configuration is deleted or altered. **C** |
| MODE-07E | In popup select **All**, Save; later select **Flat**, Save; then return to prior saved composition. | All shows eligible Simple + Narrow + Depth. Flat produces only direct actionable Cloudflare leaf (no Cloudflare submenu) while other flat provider siblings remain; saved previous combination and configs recover unchanged. **C** |
| MODE-07F | Right-click a folder inside Explorer; choose `+ Right Click`. | Opens same three-tab popup for the actual clicked folder in Simple/Narrow, not a stale selected folder; Depth remains bucket-wide. **C** |
| MODE-07G | Right-click exact folder in Explorer; choose **Default Save Selection**. Then choose Flat above popup Save. | Committed exact provider/account/bucket/folder target is used by one-click `REDOWN → Cloudflare`, verified against current auth. Missing/unwritable target never silently falls back to another bucket. **C/P** |
| MODE-07H | Save destination when corresponding Show toggle is OFF; then enable Show and Save separately. | Destination persists while hidden and appears only after explicit Show change. Saving a destination never forcibly enables its display group. **C** |
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
| REC-01 | Configure Settings Recovery Mode **Weekly (Monday default)**, then Daily; toggle Simple Recovery ON/Narrow OFF, then inverse. | Policies persist and independently select backup coverage without deleting hidden/live records or existing snapshots. Actual scheduled/catch-up time is truthful. **R** |
| REC-02 | Expand Recovery Mode bucket list: bucket redown recovery depth 50 and photos recovery depth 4; popup Depth display levels 10 and 17. | Independent bucket inclusion and independently saved **recovery depth vs Chrome display depth** survive reload, with no imposed depth=10 max. Resumable partial scan reports incomplete honestly. **R/C** |
| REC-03 | Commit Show Simple/Narrow/Depth/All/Flat, Default Save Selection, bucket display and recovery choices. | Separate `menu-config`, `depth-config`, `depth-index`, `recovery-policy` CURRENT snapshots and sequence-validated delta journals persist corresponding state; secrets omitted. **R** |
| REC-04 | Perform valid weekly checkpoint. | A validated immutable dated full checkpoint is retained, `backups/weekly.json` points/copies latest verified snapshot; changing CURRENT afterwards does NOT overwrite older weekly file. Daily equivalent when selected. **R** |
| REC-05 | Corrupt CURRENT but preserve valid weekly checkpoint + contiguous subsequent deltas. | Restore exact latest valid settings, folder index and aliases; gaps/tampering block false full replay. **R** |
| REC-06 | Intentionally delete Narrow entry, then restore an earlier chosen recovery point. | Current deletion is respected until explicit rollback; old Narrow and titles return without changing unrelated Simple/Depth. **R/C** |
| REC-07 | Clear IndexedDB / uninstall & reinstall while separately stored valid external backups survive. | Restore Simple/Narrow/Depth, popup display choices, Flat target, per-bucket recovery depth and folder knowledge; OAuth reconnect if necessary; no wrong-account binding. **R/C** |
| REC-08 | Companion unavailable, filesystem read-only/disk-full, or 50-level recovery crawl interrupted. | Report incomplete/not protected truthfully; retain known index and resumable cursor; don't fabricate recovery receipts. **R** |
| REC-09 | Corrupt only Depth index, preserve other backup namespaces. | Restore intact Simple/Narrow/Depth-display/Flat/Recovery policies untouched; no forced loss of menu choices. **R** |

| REC-10 | In Settings → Backup Location choose Automatic (default) %LOCALAPPDATA%\Click2Cloud\Recovery\, then Documents\Click2Cloud\Backups\, then back. | Only the selected root is active. An existing backup root is copied and verified (all four recovery namespaces: CURRENT, monthly journals, dated snapshots, manifests) before switching; failed relocation keeps prior root and prior backups. Documents is the real backup root, not exports-only. No Chrome-profile storage used as sole durable copy. **R** |
| REC-11 | Commit configuration changes on November 30, December 1 and January 1 (cross-year) and then restore after CURRENT corruption. | Automatically generate distinct journal files by YYYY-MM for each month (2026-11.jsonl, 2026-12.jsonl, 2027-01.jsonl are illustrative only); preserve globally continuous per-namespace sequence numbers, ordered multi-month replay, and immutable dated weekly/daily backups. **R** |

| WHOLE-01 | Recovery Mode bottom: select two authorized Cloudflare connections and one connected S3 account, click Save Whole Cloud. | Per-account durable read-only bucket+key outline jobs begin independently, including buckets not configured for Depth, with exact account identities and distinct dated output names; no object payloads or credential leaks. **R/P** |
| WHOLE-02 | Start in ISO week45 2026, continue across weeks until week50, or cross year boundary. | Unlimited duration; Weekly is update/resume cadence not deadline. Valid complete files named `backup-cloudflare-week45-50-2026.json` and `backup-cloudflare-week52-2026-to-week03-2027.json` as appropriate; partial job isn't mislabeled COMPLETE. **R** |
| WHOLE-03 | Revoke/lose OAuth mid-scan, log back in to same cloud connection next week. | Pauses preserving verified discoveries, cursor/frontier and original start week; automatically resumes after successful same-account login, no extra Save Whole Cloud click; wrong account login never resumes; expired cursor re-enumerates only invalidated page. **R/P** |
| WHOLE-04 | Close Chrome/restart PC during long scan; resume with companion scheduler or recover after app reopen. | Durable job progress and coverage persist in selected external location, scheduler activity truthful, no forced restart from root or arbitrary time cutoff. **R** |
| WHOLE-05 | Test partial provider listings, empty bucket, provider 429, missing permission, disk-full or changed cloud. | Accurate partial/completeness and observation windows, resumable retries; no false full snapshot or remote writes. **R/P** |

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
