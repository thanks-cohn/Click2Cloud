# V3+1 Engine API v1

The foundation is `src/api/service.mjs` over `createEngine`, the existing mode projectors, CURRENT and Chrome registrar. The GUI and the in-process agent gateway invoke `api.invoke({version:1, method, params}, actor)`. Glaciaring remains a separate read-only observer. No HTTP, public localhost, external Chrome message or MCP server is opened.

`src/api/service.d.ts` provides TypeScript input contracts; `toolRegistry` provides versioned tool discovery and JSON Schema inputs. Unsupported versions/methods and unknown input keys are rejected. `describeCapabilities` is the authoritative implemented method list, rather than a promise that every scaffold capability is complete.

## Configuration transaction

1. `getConfiguration` returns the canonical revision, Simple/Narrow/Depth configurations, Show, prior Show combination, Flat target and separate recovery policy.
2. `previewConfigChange` takes `expectedRevision` and a `change`. Changes include `createDestination`, `updateDestination`, `deleteDestinationConfig`, `setDepthDisplayBuckets`, `setShowInChrome`, `setFlatDefault`, `updateRecoveryPolicy`, or an atomic `batch` of up to 16 changes. `narrow` maps to the existing `nested` owner.
3. The preview returns an expiring, actor-bound `previewId`, proposed configuration and native-menu diff. It has no persistence or cloud-write effect.
4. The trusted host separately obtains user approval for that exact preview.
5. `commitConfigChange` takes `previewId`, `expectedRevision`, and `idempotencyKey`. It commits the same CURRENT transaction for every client, reconciles native Chrome, then attempts external backup. Revision, native outcome and external receipt are distinct.

Destination paths/IDs cannot be changed by a label update. Hiding a mode preserves records. Flat uses only the explicitly saved target. Narrow aliases are optional, ordered from bucket through selected folder. Conflicting shared ancestor aliases fail validation. Depth has no arbitrary display-depth maximum; incomplete logical menu budgets block application.

`listDestinations` is revision/cursor scoped (default 20, maximum 100). `previewNativeMenu` returns the existing pageable menu inspector's first bounded page. `inspectNativeACK` distinguishes desired/generated/callback ACK/independent native observation. `reconcileNativeMenu` invokes the real registrar when the host is available. Startup never trusts a persisted ACK as evidence for a new worker.

## Recovery and provider operations

`requestRestorePreview` reads a verified external recovery root and uses local cached knowledge; `restoreRightClickMenu` requires the stronger restore authority and separate confirmation. It never requests a cloud-wide scan. Manual File System Access folder selection is supported in the extension UI; Windows Automatic/Documents native-companion discovery and migration are not implemented.

`listAccounts`, `listAuthorizedBuckets`, and `listFolders` use the existing Universal File API and authorized Cloudflare transport. No provider is connected by this implementation task. Non-success provider errors are reduced to safe reason codes. `dispatchSave` uses the existing engine resolver/capture/dispatcher/readback pipeline and a separately confirmed execute grant. The extension intentionally keeps Worker readiness false until an authorized Worker transport is supplied; it cannot currently perform a live verified save.

`listRecoveryPolicies`, `inspectBackupRoots`, `enableWholeCloudJob`, `disableWholeCloudJob`, and `inspectWholeCloudJobs` expose recovery/outline state. Enabling a job requires explicit confirmation and an authorized external root. Whole-cloud jobs process one bounded provider page per scheduler opportunity, persist external checkpoints and account-specific chunks, pause without login UI, and continue later weekly/daily passes. The Chrome alarm runs only while Chrome supports scheduling. These hooks have not been accepted in installed Chrome. Per-bucket recovery crawls, retention/storage-pressure handling, scheduler crash hardening and complete portable export-manifest validation remain work.

## Agent security and local IPC

The host supplies `authorize` and `confirm`; absent authority fails closed. `createPermissions` grants explicit methods, account IDs and expiry and validates read results against account scope. For least privilege, global account enumeration is denied to scoped agent grants. Configuration confirmation checks the whole resulting configuration; an actor cannot use a preview to modify another account. `createAgentGateway` additionally binds an opaque in-memory handle to an authenticated actor, method allowlist, expiry and revocation. Handles and credentials are never in recovery files.

Inside an installed extension's trusted service-worker DevTools, `click2cloud.grantAgent({actor,methods,accounts,expiresAt})` issues a host-owned grant; `approveAgent({actor,previewId})` approves a specific configuration/restore preview. Effectful operations without previews bind approval to `{actor,method,params}`. These functions are not exposed to external messages. The GUI uses the same service with a trusted-page sender restriction. A future authenticated native companion must supply caller identity rather than accepting a client-asserted actor.

`node scripts/agent-client.mjs /absolute/trusted-host.mjs` runs a JSON-lines client. The host module exports `createSession()` returning `{api,actor}` and owns consent/Chrome availability. It does not manufacture a connected Chrome host. MCP tool discovery is adapter-ready; no MCP/ChatGPT connector is installed.

Current preview, approval, grant and idempotency caches are process-local. Retry identity does not survive worker termination; an interrupted save must be independently reconciled before retry. Do not treat this as production-grade durable idempotency. The CLI output limit is bounded; its readline input buffering is not yet a hostile-stream resource boundary.

## Validation

- `npm run build:extension`: `dist/chrome-unpacked/` (load this folder).
- `npm run test:engine-api`: focused domain, permissions, external disk/replay and outline lifecycle checks. Native callbacks and providers in these tests are explicitly doubles.
- `node tests/oauth-focused.test.mjs`: PKCE callback and coordinated refresh protocol checks with a test transport; not live OAuth.
- `python scripts/test-indexeddb.py`: actual Chromium IndexedDB revision/reopen check on a local HTTP test origin; needs Python Playwright and Chromium.

Meaningful errors include `PERMISSION_DENIED`, `INVALID_REQUEST`, `REVISION_CONFLICT`, `CONFIRMATION_REQUIRED`, `PREVIEW_INVALID`, `STALE_CURSOR`, `EXTERNAL_RECOVERY_UNAVAILABLE`, `PROVIDER_PAGINATION_UNAVAILABLE`, and `MENU_BUDGET_EXCEEDED`. Unknown provider failures never become successful receipts.
