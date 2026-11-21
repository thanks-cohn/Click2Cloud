# REDOWN Basic → REDOWN Remote: API-first integration reference
**Date:** 2026-11-21
**Status:** Planning/reference only. No implementation, merge, release, or OAuth credential migration is authorized by this file.
**Planning branch:** `planning/redown-basic-api-oauth-reference-2026-11-21`. This branch was created from Click2Cloud `main` before the pending repair. For the actual transplant, branch afresh from the VERIFIED fixed REDOWN Remote commit; bring this sheet along as documentation.

## Owner's objective

Create one unified REDOWN Chrome MV3 extension with:
- **REDOWN Remote**, the existing Click2Cloud/Cloudflare R2 system, kept reliable and isolated.
- **REDOWN Basic**, transplanted as an independent, API-oriented Google Drive, OneDrive and Dropbox engine.
- **One host Aesthetic API and one native Chrome right-click menu owner.** Basic failures must not break Remote or each other.

**Only Basic's login/provider cards and right-click provider actions are to become visible in the host.** Bring Basic's History *data and engine*, diagnostics *data and code*, verified-save ledger, provider adapters, authentication/readiness logic and save coordinator as HEADLESS MODULES accessible via the host's trusted APIs. **Do not transplant Basic's History tab, Diagnostics tab, Settings tab, navigation, full Shelf, styling system or standalone worker bootstrap.**

## Labeled implementation sequence

**Step 1 — Repair and prove REDOWN Remote.** Resolve the existing P0 Rename regression first (Explorer, normal preview, immersive). Preserve native right-click and R2 save reliability. Require real Chrome/R2 verification, capture exact fixed commit and tag it. Do not claim the current planning branch already contains the repair.

**Step 2 — Branch from the repaired commit.** Create the actual code integration branch in `thanks-cohn/Click2Cloud` from the latest VERIFIED repaired REDOWN Remote branch/commit. The planning branch is a documentation landmark, **not** the integration code base.

**Step 3 — Audit the Basic API extraction.** Review source modules and existing tests to select the exact version to transplant. REDOWN Basic `main` documented internal **API v1**, `{api:1,op,input}`; the Shelf is a client, and the native right-click click handler calls the same coordinator. Rehost modules through **one namespaced, trusted adapter**, retaining validation and tight sender authorization rather than mounting Basic's old extension-ID-specific message interface unchanged.

**Step 4 — Move Basic's headless runtime, NOT tabs.** Reuse provider adapters, OAuth/reconnect/refresh/readiness, source acquisition, durable attempts and confirmation ledger, counters, optional diagnostics/event collection/ZIP export, and the API contracts. Preserve state and provenance. Expose read/operation APIs to the host; keep Basic storage and provider failures isolated. Do not create a second History or Diagnostics tab. Historical data from an existing separately installed Basic extension cannot be assumed to migrate automatically; any import is a separate user-authorized workflow.

**Step 5 — Rebind to the new OAuth applications.** Use the recently prepared/identified Google, OneDrive and Dropbox registrations for the **unified Click2Cloud extension ID**, not Basic's previous standalone OAuth defaults. Verify exact client ID, redirect/callback, scopes, account binding, consent settings, token refresh and real Chrome sign-in for each before claiming ready. Never place client secrets, access/refresh tokens, passwords, cookies or private keys in GitHub. Maintain existing Cloudflare callback and identity.

**Step 6 — Transplant ONLY the intended visual elements.** Present the three Basic provider/login cards in the existing REDOWN Remote Shelf/Remotes areas. Their appearance must be fully controlled by the host **Aesthetic API** tokens/semantic adapters (colors, typography, surfaces, spacing, focus and state). Keep Sign In/Reconnect independent of GO TO, and readiness truthful. **Do not copy `redown-basic/extension/shelf.css`, its theme toggle, or its separate application shell.**

**Step 7 — Integrate native right-click actions.** Adapt Basic's Google Drive, Dropbox and OneDrive save actions into the host's existing `chrome.contextMenus` registrar/reconciliation and dispatch. **One Chrome service worker and one menu owner.** REDOWN Remote/R2 right-click paths must remain functional, including startup, reconnect and MV3 worker restart. Native Chrome context menus cannot be visually styled by the Aesthetic API.

**Step 8 — Verify, isolate and document.** Require provider-by-provider real OAuth/right-click save acceptance with independently verified cloud object, filename and bytes, plus adverse tests for token expiry, interrupted saves, duplicate attempts, failed diagnostics, storage/quotas, Chrome restarts and cross-engine faults. Test all Aesthetic API themes and card interactions. Do not release or merge unless all relevant gates pass; label missing live tests UNVERIFIED.

## OAuth pointer/reference sheet — no credentials stored

**Target extension ID:** `ajppphdiamdobknpamcheohmdbdbeoal` (shown by Click2Cloud's REDOWN 0.3.23 build).
**Existing Cloudflare callback:** `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/cloudflare`. Do not break.
**Important:** The owners' earlier TinyFish console work is the intended registration source; these console pointers are *not* proof that the installed integrated extension has logged in or completed provider saving.

| Provider | Console pointer and recorded target | Configuration to inspect | Verification required |
| --- | --- | --- | --- |
| Google Drive | [Google Cloud Console](https://console.cloud.google.com/) → project **redown-click2cloud** → APIs & Services → Credentials / OAuth Clients → **Click2Cloud REDOWN Alpha** Chrome-extension OAuth client (owner-referenced recent configuration) | Chrome-extension client bound to target extension ID, Drive API, consent/test users, suitable `drive.file` scope | Check actual client and authorization in Chrome; test a disposable right-click save and independent readback |
| OneDrive | [Microsoft Entra](https://entra.microsoft.com/) → App registrations → **REDOWN** (owner-referenced existing app with added callback) | `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/onedrive`, delegated `Files.ReadWrite`, `User.Read`, `offline_access`, correct public-client/SPA platform and token CORS behavior | Confirm callback/platform persisted; validate interactive sign-in and real upload/readback without compromising the old redirect |
| Dropbox | [Dropbox App Console](https://www.dropbox.com/developers/apps) → locate the previously discussed reusable Dropbox app; **exact app name/key and final configured redirect not verified here** | Target callback `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/dropbox`, `account_info.read`, `files.metadata.read`, `files.content.write`, PKCE/offline refresh and correct app-folder/full-Dropbox scope | Confirm app key, redirect and permissions in console and test login/upload/readback |

**OAuth safety rule:** Client IDs may be public identifiers, but do not put anything secret in this reference. Do not assume a successful website GO TO means the extension has OAuth access. Confirm the target extension ID after integration and never silently alter existing registrations or permissions.

## Confirmed Basic API-centric architecture (source inspected)

Source repo: [thanks-cohn/redown-basic](https://github.com/thanks-cohn/redown-basic), `main` was `75a738803e61cf7fa62c50328aa6ca5cc2cd70dc` when inspected; the historical portability branch [implement/portable-shelf-auth-host-v1](https://github.com/thanks-cohn/redown-basic/tree/implement/portable-shelf-auth-host-v1) was `128ee88e2660327e87cba8b60865e6c0e92bc5d1`. Recheck before transplant.

- [docs/API.md](https://github.com/thanks-cohn/redown-basic/blob/main/docs/API.md) explicitly defines internal API v1: `api.describe`, `providers.list/getStatus/checkSaveReadiness/goTo`, `auth.connect/reconnect/refresh`, `saves.start/getAttempt`, `history.list/get/delete/clear`, `counter.get`, `diagnostics.list/getForAttempt/clear/exportZip`, and `settings.get/update`.
- [docs/ARCHITECTURE.md](https://github.com/thanks-cohn/redown-basic/blob/main/docs/ARCHITECTURE.md) documents the single coordinator, durable attempts, ledger/counter and diagnostics isolation, and a trusted-only internal message boundary. There is **no public HTTP API**.
- [extension/lib/api.js](https://github.com/thanks-cohn/redown-basic/blob/main/extension/lib/api.js), [lib/coordinator.js](https://github.com/thanks-cohn/redown-basic/blob/main/extension/lib/coordinator.js), [lib/store.js](https://github.com/thanks-cohn/redown-basic/blob/main/extension/lib/store.js), [lib/auth.js](https://github.com/thanks-cohn/redown-basic/blob/main/extension/lib/auth.js), [providers/index.js](https://github.com/thanks-cohn/redown-basic/blob/main/extension/providers/index.js) are the headless candidates.
- [extension/shelf.js](https://github.com/thanks-cohn/redown-basic/blob/main/extension/shelf.js) contains card UI as well as History/Diagnostics tabs: **extract the card behavior/semantics only**.
- [extension/background.js](https://github.com/thanks-cohn/redown-basic/blob/main/extension/background.js) owns Basic's standalone menu registrar/worker: **use its menu declarations/save dispatch concept, not its bootstrap or second listeners**.
- [extension/config.js](https://github.com/thanks-cohn/redown-basic/blob/main/extension/config.js) and [extension/manifest.json](https://github.com/thanks-cohn/redown-basic/blob/main/extension/manifest.json) are Basic's original OAuth slots; replace with verified integrated configuration rather than carrying its old identity into the host.
- The Basic README currently labels live Google/Dropbox/OneDrive right-click saves **UNVERIFIED**. Local tests do not imply provider acceptance.

## REDOWN Remote host and Aesthetic API pointers

- Host: [thanks-cohn/Click2Cloud](https://github.com/thanks-cohn/Click2Cloud), original `main` observed as `7532bec274a9cc20f3443c3aedbd8a587b012c42`, not the future repaired integration base.
- [REDOWN 0.3.23 Codex repair request](../../codex-request-2026-11-21.md) and [detailed backlog](../../codex-next-1248-11212026.md) must be respected before integration.
- [Host Aesthetic API contract](../../docs/api/AESTHETIC_API_V1.md) documents semantic tokens and how to style host controls without modifying engine authority; verify actual host package availability on the repaired target branch.
- [GO TO versus OAuth readiness requirement](../../Project_direction/CRITICAL_OAUTH_READINESS_SEPARATE_GO_TO_RECONNECT_2026-11-12.md) is mandatory for all provider cards.

## Hard boundaries and exclusions

- Preserve the existing R2 engine, saved destinations, native menus, receipts, diagnostics, History, OAuth extension identity, screenshot and Get URL behaviors. Do not silently replace existing Remote pages or overwrite their records.
- **No transplanted Basic History tab, Diagnostics tab, standalone UI, CSS, extra worker, second contextMenus registrar, cloud server/relay or new Aesthetic API engine.**
- Keep Basic as an isolated provider module; any Basic failure must not break R2 login, first boot, right-click saving, Shelf or other providers.
- Preserve Basic's existing recording of `SAVED`, `FAILED`, `UNCERTAIN`; only proven saves count. History deletion does not delete cloud files or ledger data; diagnostics may be disabled independently of saves.
- Do not claim "fully integrated" on mocked tests alone. Test actual browser authorization and actual provider writes, or explicitly mark unverified.
- **This is documentation only.** No code is transplanted, no OAuth configuration is changed, and the current base branch remains unchanged.

## At-a-glance integration outcome

Visible Basic-derived elements: **3 login cards + menu actions**.
Headless Basic-derived systems: **OAuth/provider adapters + save coordinator + History DATA/ledger + diagnostics code/data + trusted API**.
Presentation owner: **existing REDOWN Aesthetic API**.
Native menu owner: **existing REDOWN Remote worker/registrar**.
Branch for real implementation: **create later, from the verified fixed REDOWN Remote commit**.
