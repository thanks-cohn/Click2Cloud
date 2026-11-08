# P0 Critical — Saved destinations disappear after login; repeated redown setup approval; Explorer requires a second click

**Reported:** November 7, 2026 · Windows Chrome, Click2Cloud 0.3.9-era checkout  
**Severity:** P0 product reliability / trust / retention. **Status:** Owner-reported behavior, source paths identified, root cause NOT independently reproduced.  
**Do not mislabel as solved.** This document is a factual defect report, not a code implementation.

## Owner report — exact practical consequences

1. After logging out, reconnecting, or logging back into Click2Cloud, **Manage Destinations appears to have lost the user's configured entries**. The user may have many saved Simple, Narrow, Depth, Quick Select, named, hidden and custom destinations. All must be preserved.
2. Previously authorized/approved Cloudflare R2 `redown` setup appears to **ask for approval repeatedly**, as if this were the first time the account had ever been configured. The user wants: **log back in → Click2Cloud remembers the same account/destinations/Worker → direct verified right-click save**.
3. The expected **Default = redown** is not consistently restored or displayed. No code path may silently clear a chosen Default, invent a new Default after intentional removal, or replace custom user choices.
4. Clicking the **File Explorer** tab at the top opens an unpopulated Explorer. The user has to click a second **Open File Explorer** button before the Cloudflare tree appears on the left. This is an unnecessary double navigation. Explorer should open *already displaying and selecting* the connected cloud and an appropriate saved location.
5. The user considers configuration loss unacceptable for release, independently of whether cloud authorization is currently valid. Even if OAuth cannot reconnect, **the destinations must remain stored and visible**, clearly marked temporarily unavailable.

**Owner principle:** Cloud authentication and cloud-resource setup are NOT the source of truth for menu configuration. No logout, token renewal, disconnected state, failed check, Worker status or UI render may delete the user's preferences. Save settings durably once, reuse them indefinitely unless the user explicitly edits/deletes them, the browser profile/storage is intentionally removed, or a supported migration is explicitly performed.

## Scope and evidence classification

- **OWNER-OBSERVED:** Appearing empty Manage Destinations, reappearing authorization/approval, blank Explorer after first click, missing `redown` Default.
- **SOURCE-VERIFIED at Click2Cloud main `f062983c062ec0fa55d935848025d0919ef99a16`:**
  - `src/persistence/current-store.mjs` `createCurrentStore`, `read`, `commitProduct`, `readSetupOperation` and `writeSetupOperation` use IndexedDB `click2cloud-current-v1` with `state`, `journal`, and `checkpoints`; the mode/product state and `setup:<id>` approval records are separate from OAuth tokens.
  - `src/persistence/current-store.mjs:read` defaults to fresh mode config/product when rows are absent. This is appropriate on first install but potentially obscures *why* an established installation appears empty. **Absence is not proof the login path deleted the data.**
  - `src/auth/cloudflare-oauth.mjs` stores OAuth in `chrome.storage.local` under `click2cloudOAuth`; explicit `disconnect` removes this token key, not the `click2cloud-current-v1` database.
  - `src/cloudflare/onboarding.mjs:initializeAccount` reads configured targets and `setupApproved(accountId)` (a saved IndexedDB ledger). It returns READY without setup when the chosen target is ready, otherwise can return `SETUP_APPROVAL_REQUIRED`; the initial approved path adds `redown` as an ordinary editable Simple entry and Default after verification.
  - `src/cloudflare/onboarding.mjs:initializeAccount` can also select no target or return `CHOOSE_DESTINATION`, `WRONG_ACCOUNT`, `DESTINATION_UNAVAILABLE`, `REPAIR_REQUIRED`. These outcomes must not be conflated with local data erasure.
  - `src/api/config.mjs:productState` defaults to `defaultTarget:null`; intentional `deleteDestinationConfig` and `clearDefault` can change the default. Check these authorized mutations and their journal before alleging automatic deletion.
  - `extension/app.mjs:connections` clears the Explorer's in-memory tree, selection, `source` and navigation history whenever a different connection becomes disconnected; on status change it does not automatically restore the tree after reconnect.
  - `extension/app.mjs:show('explorer')` calls `renderExplorer`, **not** `loadTree` or an initial selection; `loadTree` is currently called by the separate `Open File Explorer` buttons. `bootstrap` explicitly starts in Remotes and `source=null`.
  - `extension/background.mjs` stores `explorerLocation` in `chrome.storage.session`, but `extension/app.mjs` currently has no corresponding general startup restore path for that selection. Session storage is not an appropriate *sole* permanent location for a user's Explorer preference.
  - `src/api/service.mjs` exposes `getConfiguration`, `listDestinations`, `commitConfigChange`, `loginStatus`, `initializeCloudflare`, `inspectCloudflare`, `navigateExplorer`, `listAccounts`, `listAuthorizedBuckets`, `listFolders`, `previewNativeMenu`, `inspectNativeACK`. All fixes must reuse the existing trusted API and not invent GUI-only state.
- **NOT PROVEN:** The exact point of configuration loss, whether IndexedDB was deleted, whether a different Chrome profile/extension ID was loaded, whether the manager filtered records, or whether setup approval was truly erased versus merely being presented through a confusing resume UI. Codex must prove which condition occurred.
- **Important:** A new Chrome profile, a changed extension ID, uninstall/clear storage, or browser storage removal is a different persistence boundary. Diagnose and disclose it; do not promise persistence through deleted local storage without a separately approved backup/sync/restore mechanism.

## Expected invariants

**I. Durable menu data** — Simple, Narrow, Depth (all configuration), custom targets/account IDs/bucket/prefix, Default, Quick, labels, visibility, order, revisions, setup approval record and active selected account are stored durably per installation. They must survive explicit sign-out, auth expiry, refresh, reconsent, cloud outage, failed Worker readiness, browser/service-worker restart, normal same-ID extension update and ordinary login. Authentication state can become `DISCONNECTED`; configuration remains **readable while disconnected**.

**II. Unambiguous state dimensions** — Distinguish:
- `saved configuration exists`
- `currently authorized to view/save`
- `selected account matches saved target`
- `R2 bucket exists/accessible`
- `Worker setup approved/persisted`
- `Worker installed and matches current required digest`
- `destination verified READY`
- `native Chrome menu acknowledged`

Never substitute an unauthenticated or transiently empty cloud inventory for durable configuration. A disconnected menu entry may be disabled/marked reconnect-required, **not deleted or recreated**. The manager must show unready saved destinations with accurate statuses.

**III. One-time setup without unsafe automatic reauthorization** — For an already approved and verified same-account `redown` setup, subsequent login should reconnect and inspect/reuse it, **not ask to approve creation again**. Reuse the existing owned Worker and R2 bucket whenever valid. If the Worker genuinely needs a code update or cloud grants are missing, say exactly what is missing and request the *specific necessary* consent/action only. OAuth can legitimately require user login again; that does **not** imply renewed approval for existing bucket creation. Never silently change billable resources, escalate permissions, retry uncertain remote writes or infer consent on a different account.

**IV. Default** — First installation with no saved assignments and explicit required approval can create/reuse exact lowercase `redown` once and mark its ROOT as a normal editable Simple assignment and Default. Once customized, preserve user choice indefinitely. Explicitly removed `redown` must stay removed; do not fabricate it because the user signed in. If saved records exist but Default is missing, present a clear selection/repair state; do not destroy the remaining assignments.

**V. Explorer click is sufficient** — On clicking the top File Explorer tab, populate the left cloud/account tree immediately and select the preferred connected account and prior saved location where valid; otherwise the Default bucket/root; then the sole connected account's `redown` root if actually present; otherwise the first authorized sensible location or a clear choice for multiple accounts. Do not invent bucket presence. Authorization failures show a non-destructive reconnect state and preserve the intended location for later restoration. No intermediate **Open File Explorer** gate for an already connected user; retain Remotes as the app's normal startup tab.

**VI. Observability** — The UI and API must expose actual persisted revisions, mode counts, selected/default target and reason for an unavailable item. A critical read, migration, account mismatch or reconciliation failure must not be silently replaced with a blank fresh-install UI. No source URLs, auth tokens, credentials or private file bodies in logs.

## Diagnostic investigation required before writing repairs

1. Confirm exact installed Chrome profile, extension ID `ajppphdiamdobknpamcheohmdbdbeoal`, build revision and `0.3.9` (do not remove/reinstall or clear existing storage).
2. Before sign-out, obtain **read-only** `getConfiguration` response (product/default/revision and Simple/Narrow/Depth counts), `listDestinations`, setup-ledger presence/identity through an authorized diagnostic, and `previewNativeMenu`/ACK. Do NOT export secrets.
3. Perform explicit disconnect; compare configuration and setup ledger **before any new login**. Then login same account; compare immediately after OAuth, after `initializeCloudflare`, after `api.reconcile` and after manager render. Capture the **first** point where values diverge.
4. Check IndexedDB `click2cloud-current-v1` persisted store and write journal without modifying it. Investigate any `commitProduct` calls, migration, data clearing, cold boot, scope/account filtering and unintended default overwrite.
5. Compare stored `defaultTarget` and `cloudflare.selectedAccountId` with the actual authenticated account; a mismatch is NOT grounds to delete the records.
6. Confirm whether a repeated button is truly `approveCloudflareSetup` or `repairCloudflareDestination`/`initializeCloudflare(resume:true)`, and whether the ledger was missing or still contained approval.
7. Reproduce File Explorer tab → `show('explorer')` → tree bootstrap; verify the tree is empty until a button invokes `loadTree`. Capture a source-to-API trace.
8. Keep pre-change data and a safely redacted state/evidence bundle. If storage is truly missing, use available **validated** recovery tools; never silently overwrite prior user configuration, write a fabricated default, or auto-create a remote bucket.

## Severity / acceptance gate

This defect blocks production and any REDOWN transplant **even if the transfers themselves pass**. A product cannot claim reliable right-click saving when a user with hundreds of saved destinations must reauthorize setup, reselect the cloud and rebuild their menu after logging back in.

The explicit implementation assignment is **[`docs/requests/P0_FIX_PERMANENT_DESTINATIONS_SETUP_AND_EXPLORER_2026-11-07.md`](../../docs/requests/P0_FIX_PERMANENT_DESTINATIONS_SETUP_AND_EXPLORER_2026-11-07.md)**.

**NO BLOAT · NO LOSS OF SAVED LOCATIONS · NO AUTOMATIC BILLABLE RESOURCE MUTATIONS · GUI/API PARITY · HONEST EVIDENCE.**
