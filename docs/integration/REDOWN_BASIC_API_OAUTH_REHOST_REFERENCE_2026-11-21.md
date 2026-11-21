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

## OAuth reference sheet for the next Codex integration — PUBLIC IDENTIFIERS, NO SECRETS

**Provenance:** The following Google and Microsoft IDs were recovered from the owner's earlier ChatGPT/TinyFish configuration discussions and explicitly supplied again on November 21, 2026. **They have NOT been independently re-read from the provider consoles as part of this documentation edit**. Codex MUST compare each against its actual authorized console registration and test browser login before treating it as working. A mismatch is a blocker to be reported, not silently corrected.

**Host target extension ID:** `ajppphdiamdobknpamcheohmdbdbeoal` (shown by REDOWN 0.3.23 build). Ensure the rehosted build retains the exact intended ID/manifest key and OAuth callback identity.
**Existing R2 callback to preserve:** `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/cloudflare`.

| Provider | Recovered public OAuth information | Configuration checks | Verified status |
| --- | --- | --- | --- |
| Google Drive | [Google Cloud Console](https://console.cloud.google.com/) project `redown-click2cloud`; Chrome extension OAuth client **Click2Cloud REDOWN Alpha**; **client ID:** `763628402500-nnvp04squ9dfpbsvp64egvgkhddlb0ff.apps.googleusercontent.com`; target Chrome extension ID above | Inspect actual Google client registration, Drive API, consent/test users, scope `https://www.googleapis.com/auth/drive.file`; in a combined extension, configure OAuth using the host manifest and approved Chrome identity API | **Recorded, NOT live-login/save verified** |
| OneDrive | [Microsoft Entra](https://entra.microsoft.com/) app **REDOWN**; **application/client ID:** `a8e034a8-6462-4022-b3f3-a79ffb6b1b84`; recorded SPA platform; added redirect `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/onedrive` | Verify registration, supported accounts, callback persistence, delegated `Files.ReadWrite` / `User.Read` / `offline_access`, PKCE/public-client platform behavior, and origin/CORS acceptance (notably `AADSTS9002326`/`AADSTS9002327`). Preserve original REDOWN redirects. | **Recorded, NOT live-login/save verified** |
| Dropbox | [Dropbox App Console](https://www.dropbox.com/developers/apps); reuse earlier Dropbox app **if confirmed**. **App key/client ID not recovered**. Intended redirect `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/dropbox` | Find correct Dropbox app in authorized console, confirm exact app key, add/verify the redirect and `account_info.read`, `files.metadata.read`, `files.content.write`; PKCE/offline refresh and app-folder/full-access scope. | **Missing app key and final redirect verification** |

**Codex OAuth instructions:**
1. These are **PUBLIC client identifiers** and console pointers, not OAuth tokens, credentials or evidence of successful authorization. Do not request or commit secrets, passwords, private keys, refresh/access tokens, cookies or authenticated browser state.
2. Migrate Basic's use of `extension/config.js` and `extension/manifest.json` into the single **host** extension configuration. Do not copy Basic's standalone extension ID, original OAuth registration, independent service-worker bootstrap, or storage permissions unreviewed.
3. Confirm that each provider's configured OAuth app really authorizes the **combined host extension** at the expected callback; verify `chrome.identity.getRedirectURL('dropbox')` and `chrome.identity.getRedirectURL('onedrive')` behavior, Google manifest/client alignment and least-privilege scopes.
4. Verify live provider sign-in, token refresh/reconnect and a disposable **native right-click save with independent object/filename/byte readback** for each provider, with owner's authorized test environment only. If live access is unavailable, leave the gate **UNVERIFIED** rather than claiming completion.
5. Implement only the three OAuth/login **cards** visually, styled by the host Aesthetic API. Basic's History **data**, confirmations/counter/ledger and Diagnostics **code/data** remain internal API modules, without importing their tabs or CSS. One existing REDOWN Remote worker owns the native context menus; it delegates to Basic's provider coordinator.
6. Do not change Cloudflare OAuth or the existing R2 save engine. An auth problem for any one provider cannot disable the others.

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
