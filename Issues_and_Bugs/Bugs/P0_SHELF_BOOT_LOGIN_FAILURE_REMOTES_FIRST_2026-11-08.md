# P0 urgent: Shelf startup failure and blocked Cloudflare login (2026-11-08)

**Source:** Owner report and screenshots, Click2Cloud 0.3.12 on Windows Chrome. **Status:** OPEN; fix not yet implemented.

## Observed
- On nearly every Shelf open, a full-page startup error appears instead of Remotes. This is not limited to extension reload.
- Retry usually restores the Remotes view, but the Cloudflare card still says "Connection unavailable · ENGINE_STARTUP_FAILED".
- Clicking Log in shows "The operation could not be completed. Inspect the relevant panel for details." No usable Cloudflare sign-in.
- Save results and other buttons appear inert.
- A previous global startup error persists after Retry. User does not want apology text, error splash screens, or debug text in the normal UI.

## Owner's exact product behavior
Opening the Shelf must always show the **Remotes** tab, with a working **Cloudflare Log in** if not already connected. Let the user log in: **that is the whole login flow**. Authentication must not trigger R2 setup, bucket creation, Worker deployment, or background native-menu registration as a prerequisite. If connected, show a truthful connected state; do not claim saving works solely because login succeeded. Other tabs only appear after explicit user selection. Real errors belong in contextual provider controls or explicit diagnostics, not an apology screen.

## Source inspection
- `extension/app.mjs:bootstrap` awaits configuration, connection inspection, capabilities and Shelf attention; any rejection replaces Remotes with a full-page "Startup unavailable".
- `extension/background.mjs` gates inspect calls on `dataReady` and other calls on `ready`, which includes native-menu reconciliation; failure leads to `ENGINE_STARTUP_FAILED`.
- `src/api/service.mjs:invoke` reads CurrentStore before serving login/auth methods.
- `extension/background.mjs:onConnected` and `src/api/service.mjs:loginBegin` can automatically run `initializeCloudflare` following authentication. The owner now specifically requires login-only behavior.
- Existing integrity checks in `src/persistence/current-store.mjs` must remain authoritative; do not mask real saved-state corruption or replace saved locations.

## Required repair
Identify and fix the first failing boot dependency and its transient/permanent error boundary. Render Remotes immediately and keep it visible even if optional startup checks fail. Make existing canonical loginBegin/loginStatus usable independently of unrelated R2 setup or menu registration where safely possible. Keep saved configuration intact, expose clear recovery for genuine storage errors, and make Save results/Cloudflare status/Manager actions work or return visible specific errors. Clear stale global error text. No automatic setup on login.

## Acceptance
Test installed Windows Chrome across repeated Shelf reopen, extension reload, browser restart, MV3 worker wake/suspend, slow storage, rejected native registration, offline R2, cancelled OAuth and existing saved destinations. No repeated Retry ritual. Log in opens real Cloudflare OAuth and ends with an honest authentication state, without altering cloud resources. Other controls do not silently fail; API and GUI match; no data loss, no false readiness or save-success claims. Record fixture versus live results separately.

**Priority:** Boot API + login reliability before further polish. **Do not edit REDOWN.**

## Implementation candidate — 0.3.13

The development branch `dev/p0-remotes-boot-login` implements the controlling login-only policy. Baseline production-runtime tests reproduce both a sticky startup rejection after a single IDB-open error and the whole-Shelf tab click binding that reset descendant controls. See [source findings](../../docs/evidence/remotes-boot/SOURCE.md), [handoff and Windows acceptance](../../docs/evidence/remotes-boot/HANDOFF.md), and source-pinned receipts. This issue is not marked owner-Windows verified from fixture tests; installed Chrome/MV3/live OAuth remain separate acceptance gates. No cloud resources or saved user configuration were reset.
