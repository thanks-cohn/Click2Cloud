# Codex starter — AFTER REDOWN Remote P0 is repaired and verified

Read the complete integration reference (mandatory):
[REDOWN_BASIC_API_OAUTH_REHOST_REFERENCE_2026-11-21.md](./REDOWN_BASIC_API_OAUTH_REHOST_REFERENCE_2026-11-21.md)

**Do not execute this integration on an unverified/broken Remote baseline.** First establish the fixed/verified REDOWN Remote commit and tag. Create a NEW integration branch based on that exact commit. This planning branch preserves documentation only and is not the implementation base.

## Objective
Integrate [thanks-cohn/redown-basic](https://github.com/thanks-cohn/redown-basic) as an isolated **API-centric provider module** within Click2Cloud/REDOWN Remote. Preserve the existing Cloudflare R2 engine, existing Chrome context-menu owner, stable extension identity, Shelf, existing History/Diagnostics interfaces and the Aesthetic API. No competing worker/engine/menu registrar.

**VISUAL TRANSPLANT — ONLY** the Google Drive, OneDrive and Dropbox **provider/login cards** and their actions in the existing Shelf, plus Google/OneDrive/Dropbox items in the existing native Chrome right-click menu. They must inherit Aesthetic API tokens, layout and semantic styling; **do not copy Basic's old CSS or standalone Shelf UI**. Native browser context menu has OS-controlled appearance.

**HEADLESS TRANSPLANT —** Basic's OAuth/readiness/reconnect, provider adapters, source/transfer coordinator and verified saving, attempts/History **DATA**, confirmed-save ledger/counter, and diagnostics event storage/export and logic. Adapt through a trusted namespaced API. **No new Basic History tab, Diagnostics tab, Settings tab, or second navigation system.** Preserve accurate success/failure/uncertain states. Do not promise migration of records from a separately installed Basic extension without a separately approved data import.

## OAuth identifiers recorded from the owner's earlier configuration sessions
**Verify all of these against authorized provider consoles; remembered public IDs are not proof of live registration/consent.**
- **Target Chrome extension ID:** `ajppphdiamdobknpamcheohmdbdbeoal`.
- **Google Drive:** project `redown-click2cloud`, Chrome OAuth client `Click2Cloud REDOWN Alpha`, public client ID `763628402500-nnvp04squ9dfpbsvp64egvgkhddlb0ff.apps.googleusercontent.com`, intended `drive.file` scope.
- **OneDrive:** Microsoft Entra `REDOWN` app; public application/client ID `a8e034a8-6462-4022-b3f3-a79ffb6b1b84`, callback `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/onedrive`; verify SPA/public-client PKCE, `Files.ReadWrite` / `User.Read` / `offline_access` and token-exchange CORS/platform acceptance, preserving existing redirects.
- **Dropbox:** previously discussed Dropbox app; **app key not recovered / redirect unverified**, so locate and verify correct app before implementation. Intended callback `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/dropbox`, scopes `account_info.read`, `files.metadata.read`, `files.content.write`.
- **Cloudflare (MUST preserve):** `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/cloudflare`.

**No secrets in chat or repository.** Never store OAuth tokens, client secrets, refresh tokens, passwords, cookies or private keys in documentation. Validate actual Chrome OAuth redirects, accounts/scopes, and test with authorized disposable provider objects.

## Implementation and acceptance sequence
1. Verify latest fixed and tested Remote commit; preserve with tag; create a NEW code integration branch from it.
2. Audit Basic's API v1 and tests: `docs/API.md`, `extension/lib/api.js`, `coordinator.js`, `store.js`, `auth.js`, `providers/index.js`. Rehost as an internal host-compatible module without widening sender authority.
3. Verify the recorded OAuth registration details per provider; configure host manifest/client wiring while preserving target Chrome ID and Cloudflare OAuth.
4. Render **only Basic's three login/provider cards**, rebuilt using host semantic components and Aesthetic API styles. GO TO and Login/Reconnect remain separate.
5. Have the **existing Remote native menu registrar** own Google, Dropbox and OneDrive entries and delegate to Basic's provider coordinator. No second `onClicked` registration or `onInstalled` menu setup.
6. Expose Basic History records/attempts, ledger, counters and diagnostics through internal API contracts, without mounting Basic's History or Diagnostics tabs or replacing Remote's existing data.
7. Test real Chrome sign-in and each provider's disposable right-click save with independent object/filename/byte verification. Test worker restart, native menu stability, auth expiry, isolation, data preservation, CSS/themes and bounded resources.
8. Report implemented/blocked/unverified status, evidence, exact commit/branch, and any credentials-console steps that require the owner's own authorized session. Do not merge, deploy or claim release-ready if live provider acceptance is missing.

This is a future implementation prompt; saving this Markdown document does **not** authorize changes to application source in the current session.