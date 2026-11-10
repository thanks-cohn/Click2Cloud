# Provider connected but right-click saves are unauthorized

Status: **Open / diagnosis required**
Date: 2026-11-09
Affected: **Google Drive, Dropbox, OneDrive**
Not in scope: Cloudflare R2 (reported as working for this issue)

## Reported symptoms

In REDOWN, the provider may display **GO TO** and permit opening the cloud destination. This feels like a successful sign-in, yet the corresponding right-click save does not work. Similar trouble has been reported for Google Drive, Dropbox and OneDrive in the Click2Cloud workflow. Do not assume the cause is OAuth without inspecting failures.

## Issues / bugs to investigate

1. **Misleading connected/GO TO status.** Provider sign-in or browsing works but the UI does not distinguish account connection from actual upload ability.
2. **Right-click save failure with an authenticated account.** Diagnose missing write scopes/consent, expired/revoked credentials, insufficient destination permissions, incorrect API calls, or broken extension/background/engine routing. Capture provider-specific errors, rather than guessing.
3. **Missing minimal-permission repair flow.** When the specific problem is authorization, offer a contextual `Grant Save Access` / `Reconnect to Save` action using the provider's proper OAuth flow. Prefer incremental consent where supported; never bypass provider consent.
4. **No reliable save-readiness model.** Distinguish `CONNECTED` (identity known), `WRITE_AUTHORIZED` (upload credentials/scopes valid), `DESTINATION_WRITABLE` (target can accept writes), `REPAIR_REQUIRED`, and verified completed saves. Having a token or GO TO access is not proof of writability.
5. **Interrupted save intent.** Persist the original provider, target and requested save long enough to resume *once* after successful reauthorization and validation, without duplicate uploads. If source bytes/URL cannot be safely resumed, show a clear retry action rather than claiming success.
6. **Misleading success states.** Never animate success, increment counters, or create a successful receipt on sign-in, OAuth callback, mere request dispatch, or a timer. Only provider-confirmed upload (and applicable verification) counts.

## Expected behavior

- On connection and before a save where practical, verify the minimum required upload capability without unnecessarily uploading test files.
- If a right-click save hits an authorization failure, identify the provider and exact actionable failure, retain the requested target, and present the shortest permitted OAuth re-consent path.
- Once reauthorized, recheck write capability and resume safely, or explain an administrator/policy restriction that consent cannot fix.
- A valid GO TO action must not be presented as evidence that right-click saves are ready.
- Keep Cloudflare R2 behavior unchanged.

## API-first acceptance tests

The GUI must consume the same documented APIs used for connection state, authorization/permission inspection, permission repair, right-click save, resume, and verified receipts.

- Google Drive, Dropbox, OneDrive: logged in but missing write scope; token expired/revoked; consent cancelled; destination not writable; administrator denied; API routing failure; successful repair and one verified save.
- Ensure missing permissions are separated from transport/engine bugs.
- Confirm zero false-positive success events and no duplicated uploads after retry.
- Ensure GO TO remains available when browsing is permitted even if saving is not, but show truthful save status.

**This is an issue/specification record, not a verified root-cause finding or an implemented fix.**
