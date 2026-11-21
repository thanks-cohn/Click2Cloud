# REDOWN Basic → REDOWN Remote: API-first integration reference
**Date:** 2026-11-21
**Status:** Active implementation handoff for Codex on the dedicated integration branch. This document specifies the work; it is not evidence that Basic has been transplanted. **Windows Chrome and live R2 on alpha-base remain UNVERIFIED; release gate OPEN.** Do not merge or deploy without separate acceptance.
**Integration branch:** `codex/redown-basic-api-integration-0323-alpha-base-2026-11-21`
**Exact source tag:** `redown-0.3.23-alpha-base` → `400c0509a36e76c2c5bd5ef5c5426fa5d5709db9`, confirmed from annotated Git tag. This preserves the P0 Rename candidate and seven Explorer/Shelf improvements.
**Planning ancestry:** The earlier planning sheet lives on `planning/redown-basic-api-oauth-reference-2026-11-21`; this file has been carried onto the actual code-integration branch, based on alpha-base **not** the older planning/main commit.
**Execution decision (owner, November 21):** Begin isolated Basic integration coding **now** on alpha-base. Do not misrepresent pending Windows Chrome/live R2 validation as done, and do not merge/deploy until repaired Remote and combined-provider acceptance tests pass.

## Owner's objective

Create one unified REDOWN Chrome MV3 extension with:
- **REDOWN Remote**, the existing Click2Cloud/Cloudflare R2 system, kept reliable and isolated.
- **REDOWN Basic**, transplanted as an independent, API-oriented Google Drive, OneDrive and Dropbox engine.
- **One host Aesthetic API and one native Chrome right-click menu owner.** Basic failures must not break Remote or each other.

**Only Basic's login/provider cards and right-click provider actions are to become visible in the host.** Bring Basic's History *data and engine*, diagnostics *data and code*, verified-save ledger, provider adapters, authentication/readiness logic and save coordinator as HEADLESS MODULES accessible via the host's trusted APIs. **Do not transplant Basic's History tab, Diagnostics tab, Settings tab, navigation, full Shelf, styling system or standalone worker bootstrap.**

## Labeled implementation sequence

**Step 1 — Preserve alpha-base and its outstanding release gate.** The P0 Rename candidate and seven Explorer/Shelf changes are committed at `400c050` and annotated as `redown-0.3.23-alpha-base`. The owner has compiled this build and explicitly authorized beginning integration from it. The Windows Chrome/live R2 Rename and native save tests still have to be completed. **Proceed with the integration implementation, but do not declare the foundation verified or release/merge any combined extension until the live checks pass.**

**Step 2 — Use the dedicated existing implementation branch.** Work in `codex/redown-basic-api-integration-0323-alpha-base-2026-11-21`, created from the exact alpha-base commit `400c0509a36e76c2c5bd5ef5c5426fa5d5709db9`. **Do not branch from planning/main and do not modify the preserved tag.**

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
| Dropbox | [Dropbox App Console](https://www.dropbox.com/developers/apps); owner-provided app name **REDOWN**; public **App Key/client ID** `h0mbahfonf0zkul` (November 21, 2026). Intended redirect `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/dropbox` | Owner directly confirmed these four scopes enabled in the Dropbox app console: **`account_info.read`, `files.metadata.read`, `files.content.write`, `files.content.read`**. All three original Basic-required scopes are present; `files.content.read` may support independent content verification but should be used only if needed. Owner separately confirmed the exact redirect URI is registered. Independently validate its use by the Chrome OAuth flow, account permissions/consent, PKCE/offline refresh and app-folder/full-access scope. | **App name/key, four scopes and redirect owner-confirmed; live OAuth login and real save NOT verified** |

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

- Host: [thanks-cohn/Click2Cloud](https://github.com/thanks-cohn/Click2Cloud), **current integration base is the actual alpha-base tag commit `400c0509a36e76c2c5bd5ef5c5426fa5d5709db9`**. Do not use the older `main` planning parent `7532bec`.
- [REDOWN 0.3.23 Codex repair request](../../codex-request-2026-11-21.md) and [detailed backlog](../../codex-next-1248-11212026.md) must be respected before integration.
- [Host Aesthetic API contract](../../docs/api/AESTHETIC_API_V1.md) documents semantic tokens and how to style host controls without modifying engine authority; verify actual host package availability on the repaired target branch.
- [GO TO versus OAuth readiness requirement](../../Project_direction/CRITICAL_OAUTH_READINESS_SEPARATE_GO_TO_RECONNECT_2026-11-12.md) is mandatory for all provider cards.

## Hard boundaries and exclusions

- Preserve the existing R2 engine, saved destinations, native menus, receipts, diagnostics, History, OAuth extension identity, screenshot and Get URL behaviors. Do not silently replace existing Remote pages or overwrite their records.
- **No transplanted Basic History tab, Diagnostics tab, standalone UI, CSS, extra worker, second contextMenus registrar, cloud server/relay or new Aesthetic API engine.**
- Keep Basic as an isolated provider module; any Basic failure must not break R2 login, first boot, right-click saving, Shelf or other providers.
- Preserve Basic's existing recording of `SAVED`, `FAILED`, `UNCERTAIN`; only proven saves count. History deletion does not delete cloud files or ledger data; diagnostics may be disabled independently of saves.
- Do not claim "fully integrated" on mocked tests alone. Test actual browser authorization and actual provider writes, or explicitly mark unverified.
- **State at handoff:** This file does not itself transplant code or configure OAuth. The dedicated branch is now available for Codex to implement the modules. Its preserved parent tag must remain unchanged; do not merge or deploy without real Chrome/live-provider gates.

## Additional owner-confirmed Dropbox facts (November 21, 2026)

- Developer app name: `REDOWN`.
- Public App Key: `h0mbahfonf0zkul`.
- Redirect URI **confirmed saved in app console**: `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/dropbox`.
- App console enabled scopes: `account_info.read`, `files.metadata.read`, `files.content.write`, `files.content.read`.
- This confirms the **console configuration as reported by the owner**, **not** successful Chrome OAuth code exchange, refresh, or real Dropbox upload/readback. Do not request the App Secret.
- The Google and OneDrive public registrations are recovered from prior configuration notes, **not independently live-verified**.

## Execution and release distinction

- **Begin implementation now** from the alpha-base tag, in this new integration branch. The user is asking for the Codex coding task, not another planning-only exercise.
- **Hold merge/deploy/release.** Windows Chrome and live Cloudflare R2 Rename/right-click remain UNVERIFIED on the foundation. All three provider live OAuth and actual object/byte verification remain UNVERIFIED. Any partial integration status must name this explicitly.
- Keep Basic API v1 separate from REDOWN Remote File API 3+1.1. Implement a namespaced trusted adapter compatible with the host worker; do not expose a new unrestricted `chrome.runtime.onMessage` consumer or HTTP endpoint.
- Only the **three Basic auth/provider cards and three native browser right-click provider actions** are newly visible. Reuse existing Remote History/Diagnostics surfaces as needed to consume headless Basic data; do not introduce Basic versions of those tabs.
- Keep memory use measured and bounded, preserve virtualized Explorer and Cloudflare R2 operations. **Future Chutey multi-file drag-and-drop is explicitly out of scope for this integration** and remains a later roadmap item.

## At-a-glance integration outcome

Visible Basic-derived elements: **3 login cards + menu actions**.
Headless Basic-derived systems: **OAuth/provider adapters + save coordinator + History DATA/ledger + diagnostics code/data + trusted API**.
Presentation owner: **existing REDOWN Aesthetic API**.
Native menu owner: **existing REDOWN Remote worker/registrar**.
Branch for real implementation: **`codex/redown-basic-api-integration-0323-alpha-base-2026-11-21` already created from alpha-base `400c050`**, with live verification still outstanding.
