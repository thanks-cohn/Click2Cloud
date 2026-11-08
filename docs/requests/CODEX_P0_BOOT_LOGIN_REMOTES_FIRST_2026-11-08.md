# CODEX P0 — Fix Click2Cloud Boot API and Cloudflare login: Remotes first, every time

First read `Issues_and_Bugs/Bugs/P0_SHELF_BOOT_LOGIN_FAILURE_REMOTES_FIRST_2026-11-08.md`.

**User-reproduced regression, Windows Chrome 0.3.12:** On each Shelf open, the app commonly shows a full-page startup error. Retry usually restores Remotes, but Cloudflare displays `ENGINE_STARTUP_FAILED`. Log in then produces a generic failure; Save results and other buttons do nothing.

**Owner's intended startup:** Each time the Shelf opens, show **Remotes** as its default main content. If not signed in, show a functional **Cloudflare Log in** button. The user clicks it, signs in, and remains on Remotes with truthful authentication status. **End of login flow.** Do not trigger background R2 setup, Worker/bucket provisioning, automatic destination creation, or native-menu registration merely from opening Shelf or completing OAuth. Existing stored approvals and configured destinations must remain intact.

## Fix existing code; no cosmetic-only workaround

1. Reproduce and locate the earliest failing boundary in `extension/app.mjs:bootstrap`, `background.mjs:dataReady/ready`, `src/api/service.mjs:invoke`, the CurrentStore/IndexedDB and OAuth service. Determine whether the failure is a persistent rejected startup promise, transient service-worker race, storage error, native reconciliation failure or another verified cause. Record safe error codes and evidence, not guesses.
2. Decouple **loginBegin/loginStatus** and other independent read-only capabilities from unrelated native-menu/R2 startup work wherever safe. Keep one versioned canonical API and validation/authorization. Do not introduce a shadow login API or weaken genuine stored-state integrity checks.
3. Render Remotes immediately on startup; optional failures must not replace it with a full-page "Startup unavailable"/apology. On genuine blocking local-storage failure, keep Remotes visible with a small accurate, actionable recovery explanation; never invent a connected session or working saved configuration. Show session and saving readiness as separate states.
4. Replace silent no-ops with functional controls or specific contextual error feedback: **Log in, Save results, Cloudflare status, Manage Destinations, tabs**. Do not leave disabled-looking controls enabled but ineffective. Clear obsolete global errors after state changes without hiding current failures.
5. No forced navigation by background attention, OAuth callbacks, old URL fragments or async events during an ordinary Shelf opening. Preserve an explicitly clicked tab until another user action; new Shelf opens should start at Remotes. Bounded quiet retry for transient boot is allowed, but never an endless Retry ritual.
6. Follow GUI-to-API parity: reuse `loginBegin/loginStatus`, `getConfiguration`, `getEngineHealth`, `describeCapabilities`, `inspectRemoteHistory` and existing typed diagnostics. No duplicate APIs, configuration owner, login handlers or startup flow. Preserve exact Simple/Narrow/Depth, Default, Quick Select, OAuth/session, Worker configuration and setup approval. Do not reset browser storage or edit REDOWN.
7. Add tests using the production runtime for repeat Shelf open/reopen/reload, browser cold start, MV3 worker wake, slow/failed native reconciliation, authentication, interrupted sign-in, offline Cloudflare, unreadable/missing/corrupt CurrentStore and saved user destinations. Verify login doesn't trigger setup or writes; all clicks respond; no false login or remote-save success. Run available focused/browser tests and provide a Windows Chrome owner test plan. Label actual installed Chrome/live R2 checks separately from fixtures.

**Acceptance:** Shelf open → Remotes appears immediately → Cloudflare login starts and completes when authorized → no startup apology, no Retry required, no automatic provisioning → other actions work or clearly explain their own limitation.

**P0 ALPHA BLOCKER — BOOT FIRST · LOGIN ONLY · ONE CANONICAL API · NO BLOAT · NO DATA LOSS.**
