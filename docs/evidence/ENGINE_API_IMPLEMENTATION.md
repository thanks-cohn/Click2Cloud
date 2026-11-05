# Implementation evidence — 2026-11-05

Branch: `feat/glaciaring-agent-debug`. This is an API-first implementation increment, **not completed scaffold acceptance**. No production deployment, transplant, main merge, billing change, public endpoint or ChatGPT connector installation occurred. The historic scenario project was not read or run.

## Kept / refactored / added

- Kept the existing engine save resolver, source capture, verified dispatcher, mode projectors, Universal File API/R2 adapter, native registrar, CURRENT IndexedDB owner, and read-only Glaciaring API.
- Added the headless `src/api/` service, typed contracts, tool schemas, scoped permission owner, separate agent gateway and JSON-lines client. GUI messages and trusted in-process agents call this same service.
- Added the composite compiler over existing projectors, saved Show/Flat semantics, Narrow ancestor aliases, atomic product transactions and local product journal. Legacy mode edits keep product state synchronized.
- Replaced the diagnostic-only extension entry point with a product host, Remotes/Explorer, one three-tab popup with Show immediately above Save, destination manager and Recovery Settings.
- Added independent Click2Cloud PKCE OAuth code, external filesystem recovery adapters and a resumable metadata crawler. Existing upload/readback code is reused; no duplicate uploader was introduced.

## Evidence table

| Class | Status | Actual evidence / limit |
|---|---|---|
| Reproducible unpacked build | PASS | `npm run build:extension` → `dist/chrome-unpacked/manifest.json`, extension assets and engine sources. Build is not installation proof. |
| Shared headless domain API | PASS (focused checks) | `node tests/engine-api-focused.test.mjs`: 5 tests, 0 failures. Create Simple/Narrow, additive projection, hidden configs, exclusive direct Flat, restored Show combination, depth 50, preview/commit, revision/confirmation/replay restrictions. Chrome callback double is explicitly not native evidence. |
| External physical disk | PASS (Linux filesystem) | Same test suite writes/readbacks real temp files, checks monthly/year rollover, corrupts CURRENT, replays verified snapshots/journals, restores through the same API. Chrome registrar is a test double; Windows/uninstall acceptance is not established. |
| Continuous outline lifecycle | PASS (isolated provider transport + real disk) | Same tests exercise first pass, silent auth pause, same-identity continuation, and a later pass after advancing 15 days. No real cloud listing or two-week live operation is claimed. |
| Actual IndexedDB | PASS | `python scripts/test-indexeddb.py`: actual Chromium HTTP test origin; revision 1 committed, stale revision rejected, reopened revision 1 and hidden Simple state preserved; a subsequent product destination commit also passed the legacy encrypted bundle validator. This is not an installed extension test. |
| OAuth security protocol | PASS (isolated transport) | `node tests/oauth-focused.test.mjs`: 2 tests; mismatched callback rejected before token exchange, S256/public-client exchange, parallel refresh coordination/rotation, tokens absent from status, disconnect blocks requests. |
| Existing focused modules | PASS | Direct execution of `engine.test.mjs` (3), `chrome-registrar.test.mjs` (13), `canonical-menu.test.mjs` (18), `persistence.test.mjs` (4), `universal-file-api.test.mjs` (7): 45 tests, 0 failures. Not live provider/native acceptance. |
| Installed extension / actual native ACK | BLOCKED | Actual Chromium `Extensions.loadUnpacked` returned `Loading of unpacked extensions is disabled by the administrator.` `/etc/chromium/policies/managed/extensions.json` contains `ExtensionInstallBlocklist: ["*"]`. No policy was altered or bypassed. No native ACK or rendering screenshot is claimed. |
| Real OAuth consent / two-hour session | BLOCKED | No user consent session or verified registered scope IDs available. No Cloudflare connector tool or Cloudflare credential variable binding is available in this task. Browser extension installation is also blocked. |
| Authorized Worker upload / independent R2 readback | BLOCKED | No authenticated Worker transport is available. The known lab Worker has no assumed public route. The extension explicitly retains `workerReady:false`, so cloud saves fail closed; no speculative provider receipt. |
| Windows Automatic/Documents roots | NOT IMPLEMENTED / BLOCKED ACCEPTANCE | No Windows native companion or Windows runtime. Manual user-authorized directory adapter exists, but cannot be exercised here because browser policy also denies filesystem access. Root copy/verify/switch and known-folder discovery remain implementation work. |
| Installed GUI journeys | BLOCKED / NOT TESTED | Source/build exist. Native installed UI, real popup interactions, MV3 restart and uninstall/reinstall acceptance could not run under administrator policy. |
| Glaciaring | PRESERVED; NEW UI PARITY NOT TESTED | Existing read-only debug host remains separate. Existing focused engine tests pass diagnostic-off/error behavior. Complete new-UI instrumentation and parity acceptance remain work. |
| MCP / ChatGPT | NOT CONNECTED | Versioned tool registry and local IPC adapter only. No public listener or external connector. |

## Exact OAuth identity

Independent public manifest key derives extension ID `ajppphdiamdobknpamcheohmdbdbeoal`.

Callback to register for the existing public client `59535938bc4cc093003b4385a7e2b005`:

`https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/cloudflare`

This URI is derived from the checked-in public key, **not observed from an installed extension**. The actual installed `chrome.identity.getRedirectURL('cloudflare')` remains the final authority. Enter only the exact scope IDs verified for that client; dashboard permission labels are not treated as IDs.

## Remaining implementation and acceptance gaps

This is not a shippable completed product. In addition to the external blockers:

- Implement the authenticated Worker/service path and verify actual source → R2 final bytes independently in the approved disposable prefix. No writes were attempted here.
- Implement Windows native companion discovery, both known folders, migration and root verification. Validate native Chrome install, menus, click/save, worker restart and real external-folder restore after reinstall.
- Finish separate cached depth-index persistence, per-bucket recovery crawls, policy-filtered historical protection, Monday catch-up checkpoints, bounded retention/storage-pressure handling and robust cross-namespace crash recovery. Current journals contain full state events, not compact semantic deltas.
- Harden whole-cloud portable-manifest import/verification, invalid cursor recovery, durable operation identity, restart/reinstall discovery, rate limiting and all failure classes. Completed manifests now identify externally read-back page namespaces and a SHA256 page chain, but full portable-import acceptance remains untested.
- Preview/approval/grant/idempotency caches are process-local. Durable cross-restart idempotency and long-operation cancellation/progress contracts need completion. Do not replay uncertain saves.
- Other S3/Drive/Dropbox/OneDrive adapters are not connected or claimed implemented by this build. Chrome manager shortcut and complete Explorer UX parity remain work.
- Complete the public method/response schemas, typed results and domain API surface for all scaffold families; current registry describes only implemented operations.

The saved environment draft contains tested build/focused-check instructions and startup guidance plus Cloudflare API/OAuth host additions. Draft persistence is confirmed; runtime application and publication are not. Review/save environment settings and publish only when appropriate; publication does not remove the implementation/acceptance gaps above.
