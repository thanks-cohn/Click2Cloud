# P0 CODEX IMPLEMENTATION REQUEST — Real Chrome right-click → browser bytes → remote cloud (REDOWN behavioral parity)

Date: 2026-11-05
Repository: thanks-cohn/Click2Cloud
Development branch: feat/glaciaring-agent-debug
Priority: P0 / release-blocking
Task type: IMPLEMENT AND VERIFY, not merely audit, simulate, document, or create another menu engine.
Scope of this request: make Click2Cloud's installed Chrome MV3 right-click menu reliably save actual web files to an authorized cloud destination. Start with working Cloudflare R2. Keep a provider-neutral foundation; establish other-provider parity only through real authorized implementations.
Production safety: REDOWN is READ ONLY. Do not merge, deploy, publish a Worker, provision paid resources, touch production objects, or mutate REDOWN without separate owner authorization.

## 0. The owner's non-negotiable objective

REDOWN can perform right-click cloud saving. Click2Cloud must achieve the same user-visible outcome with a cleaner V3+1 architecture, not by importing REDOWN's defects.

User experience after connection + separately completed destination setup:

1. User right-clicks an image, downloadable link, video, or audio source on an ordinary web page.
2. Chrome displays a Click2Cloud native context-menu entry with their configured exact destination(s).
3. One destination click immediately dispatches the save; no intermediate transfer page, download dialog, pop-out, app tab, clipboard step, manual file chooser, or redundant login.
4. The BROWSER acquires the source bytes and sends those bytes and the minimum necessary filename/content-type/destination metadata to the authorized provider-side upload endpoint.
5. No original source URL, page URL, referrer, link URL, frame URL, browser history, or browsing provenance is transmitted to the cloud provider/Worker as part of the upload, included in remote object metadata, or leaked through remote logs.
6. The provider really stores the file in the exact authorized account/bucket/folder, preserving useful filename/extension.
7. Only an independently verified provider receipt creates success/history/counter/celebration. Failed or uncertain operations must not pretend to succeed.
8. Click2Cloud can show meaningful status and a retry/inspect-safe route without sending the user to an unrelated app.
9. The workflow remains stable after Chrome restarts, MV3 service-worker sleep/restart, Chrome updates, logout/reconnect, and menu-configuration changes.
10. Large files use bounded-memory streaming, chunking/multipart/resumable transport where supported; do not retain the current arbitrary 32 MiB capture ceiling as the product promise.

This is behavioral parity, NOT an instruction to transplant REDOWN's network, history, OAuth, menu, bootstrap, provisioning, UI, or provider implementations wholesale.

## 1. Read governing instructions and inspect REAL code first

Read AGENTS.md and docs/CODEX_FINAL_V3P1_GUI_WINDOWS_EXPLORER_LOGIN_AND_API_2026-11-05.md; retain their established UX semantics, programmatic API, quiet login, conventional Explorer, provider identity, and privacy guardrails. This P0 document supplements those contracts specifically for real right-click/remote-save completion.

Inspect these Click2Cloud source files and their direct dependencies before editing:

- extension/manifest.json; extension/background.mjs; extension/app.mjs; extension/README.md.
- scripts/build-extension.mjs; package.json; scripts/test-native-chrome.mjs.
- src/chrome/registrar.mjs; src/core/engine.mjs; src/core/menu-spec.mjs; src/core/action-resolver.mjs; src/core/save-dispatcher.mjs; src/core/source-capture.mjs; src/core/menu-identity.mjs.
- src/explorer/index.mjs; src/explorer/file-api.mjs; src/explorer/r2-adapter.mjs; src/explorer/save-provider.mjs; src/auth/cloudflare-oauth.mjs.
- src/api/service.mjs; src/api/config.mjs; src/persistence/current-store.mjs; src/inventory/discovery.mjs.
- The focused tests of native registrar, menu compiler, capture/dispatcher, OAuth, integration, recovery, and real browser.
- Existing provider/environment constraints in docs/evidence/final-v3p1/ACCEPTANCE.md; do not confuse earlier fixtures with installed Chrome or R2 results.

READ-ONLY behavioral comparison to thanks-cohn/REDOWN, particularly:

- extension/background.js: native menu build/reconcile, contextMenus.onClicked dispatch, selectedUrl/saveResolvedRightClick, Cloudflare verified receipt, onInstalled/onStartup/worker-load reconciliation.
- extension/right-click-v3.js: projection/destination lookup only; do not migrate its intertwined mode data.
- extension/service-worker.js and extension/boot.js: resilient boot/recovery lessons, but DO NOT clone second competing boot/menu ownership.
- extension/beta/r2-adapter.mjs: cloud management/transport capability flow, independently validate API support before use.
- extension/google-drive-provider.js, extension/google-drive-stream.js, extension/dropbox-provider.js, extension/onedrive-provider.js: byte-upload/resume/provider receipt patterns; inspect for current defects rather than treating as approved code.
- Relevant cloud Worker source and official Cloudflare R2 upload/streaming/multipart documentation; verify endpoints and current account/Worker constraints.

Produce a short factual current-vs-required behavior map, identifying each actual gating condition and owner module. Label hypotheses as hypotheses. Keep it alongside test evidence; then implement.

## 2. Observed P0 blockers — source-grounded starting point

The following are observed in the current repository; Codex must recheck HEAD and explain any differences:

A. extension/background.mjs send() supports cfAccounts and cfBuckets only; other requests throw AUTHORIZED_WORKER_TRANSPORT_UNAVAILABLE. Therefore the old Explorer adapter's mutating message operations do not have a usable host-side bridge.

B. extension/background.mjs wraps fileApi.run() and immediately blocks every operation other than accounts, buckets, list, listRaw, stat, preview, readStream. Upload is explicitly blocked before staging object bytes. Some permitted reads may still fail because the actual send/http transport doesn't support the requested provider endpoint.

C. getInventory() normalizes every scope to workerReady:false and creates new discovered scopes with workerReady:false. getAuthorization() filters authorizedTargets on scope.authorized && scope.workerReady; it will therefore return NO authorized writable targets even after the user has signed in. Do not fix this by lying about readiness; replace the stub with a REAL current authorized transport capability proof.

D. src/core/menu-identity.mjs availabilityReasons() requires workerReady:true, so generated save rows can be disabled with WORKER_UNVERIFIED. Fix capability verification and actionable UI, not the security requirement.

E. src/core/menu-spec.mjs composite projection can remove unused branches and yield zero root rows with zero configured destinations. An installed extension must always expose a native Click2Cloud entry with useful Setup/Manage actions, even if logged out or unconfigured, while save actions remain disabled/absent without authority.

F. src/core/source-capture.mjs defaults maxBytes=32*1024*1024 and allocates a complete Uint8Array. src/core/engine.mjs Explorer-save source limit is also 32 MiB. src/api/service.mjs describes and validates 33,554,432 bytes; extension/app.mjs rejects files above that and arrays whole file bytes. src/explorer/r2-adapter.mjs has a separate 300 MB beta cap. These boundaries are a fragmented, unsuitable large-file path. Provide a single audited streaming-oriented policy with provider-specific real limits.

G. extension/background.mjs authorizeSource checks chrome.permissions.contains() for source origin; optional_host_permissions exist in manifest, but no complete user-facing permission acquisition/retry path is demonstrated. Do not assume context-menu clicks magically grant all cross-origin source access. Prove each supported source class.

H. src/explorer/r2-adapter.mjs remoteIngest() forwards sourceUrl to an ingest message. The REDOWN Cloudflare right-click ingestCloudflareAtPrefix() uses a Worker POST containing sourceUrl. That is NOT acceptable for Click2Cloud's byte-only privacy contract. Never enable this URL-ingest as the new save path.

I. REDOWN's Cloudflare verification currently checks remote metadata for sourceUrl. Do not copy that privacy-breaking metadata check. Instead verify size, key, R2 object identity and independently streamed content/checksum where appropriately feasible.

J. The existing registrar and dispatcher already have valuable canonical-generation, exact-target authorization, browser ACK, and independent-receipt concepts. Fix their integration instead of inventing another registrar, engine, context-menu writer, or uploader.

K. The present implementation acceptance report marks real installed-native Chrome verification, normal human Cloudflare OAuth, and live save/read-back blocked. An npm PASS or browser fixture PASS does not overrule those missing live proof classes.

These are source-level findings, not a claim that the user's current installed Chrome profile or R2 account has been directly tested in this request.

## 3. Required execution architecture — one authoritative path

Implement and document the actual chain:

Chrome extension installed → native contextMenus registration ACK → right-click info and tab context → exact stable menu item/action ID → CURRENT saved config and acknowledged generation → live Cloudflare account + bucket + destination authorization → source origin permission → browser source-byte reader → authorized upload transport → provider commit and remote readback → verified result → history/counter/status → GUI and versioned programmatic API.

The core architecture must stay:

- ONE canonical CURRENT configuration and target identity: provider + connectionId + accountId + bucketName + normalized prefix.
- ONE menu projection/compiler with independent Simple/Narrow/Depth source configuration.
- ONE Chrome native registrar and event owner, already src/chrome/registrar.mjs.
- ONE save resolver/dispatcher and a provider-neutral upload/verification interface, already src/core/engine.mjs + save-dispatcher.mjs.
- ONE Universal File API abstraction for Explorer and programmatic clients. Browser right-click and Explorer save must call the same domain save logic, with different trusted input acquisition where necessary.
- A transport capability owner responsible for real R2/Worker readiness, byte-upload, multipart/session state, readback, and bounded permissions. A simulated readiness flag must never authorize writes.
- Glaciaring/diagnostics remain observers, not a second write-capable engine.
- No widening of privileges or second public debugging listener for convenience.

Make the internal programmatic API reflect real upload capabilities, provider limits, expected authorization prompts, current menu/native ACK, pending jobs and verified outcomes. Do not advertise unavailable write capabilities as ready.

## 4. Native Chrome menu: immediate, visible, actionable, recoverable

Required Chrome behaviors:

- After a correct local build with npm run build:extension and loading dist/click2cloud through chrome://extensions → Load unpacked, menu registration works on normal image/link/video/audio context menus.
- A useful Click2Cloud root / Manage Destinations / Connect Cloudflare or Set Up Destination action is present when no cloud has been configured or the user is logged out. These are navigation/setup actions, not fake save leaves, and do not require provider authorization to render.
- When a single exact Default Location is configured and Flat is selected, provide a SINGLE directly-clickable Click2Cloud → Cloudflare leaf, with no extra folder submenu. When extra paths/modes are enabled, faithfully project the requested hierarchy and the existing direct/Quick/Other Clouds ordering.
- Simple = flat explicit configured destinations. Narrow = natural hierarchy of configured paths only, preserving per-level labels, hide decisions and collision rules. Depth = discovered bucket hierarchy to selected depth, including not-manually-configured folders. Changes to one mode do not corrupt another.
- Configured Google Drive / Dropbox / OneDrive menus remain separate flat native provider leaves IF their real adapter and auth are available; Cloudflare nested menu support remains independent. Never advertise placeholder providers as functional.
- Every save leaf binds immutable target identity, stable action ID, context applicability and current generation. Changing aliases/labels must not send files to a different target. Stale menu actions fail closed.
- Exact clicked account, bucket and prefix must be immutable during the current operation; no fallback to arbitrary bucket or login-default destination.
- Rebuild menus on install, reload, Chrome start, worker activation, after configuration changes, after successful relevant capability/auth state changes, and after explicitly requested restore. Do this through serialized existing registrar, preserving durable desired state and using fresh Chrome ACK; never equate local saved desired generation with applied Chrome menu.
- Validate parent-first ordering, allowed context types, browser callbacks, Chrome runtime.lastError, partial apply and failure recovery; make management route available after partial failure. Avoid unnecessary removeAll if reliable incremental reconciliation can be added safely, but preserve correctness and one registrar owner. Avoid duplicate menu rows and listeners.
- Handle “no destination”, missing Worker, expired OAuth, permission required and disconnected account gracefully and visibly; menu can exist without falsely claiming that saves are available.
- Right-click click-to-attempt acknowledgment may fire immediately as a distinct visual event. No SUCCESS, number increment, History success or ball celebration until verified provider result.

## 5. Actual browser source capture — privacy first, real bytes

Support ordinary direct-file scenarios with source priority and explicit treatment:

- Image source: info.srcUrl when the clicked media is an image. Download the actual selected bytes rather than an HTML page or unrelated thumbnail when possible.
- Downloadable link: info.linkUrl when user selected link context. Respect URL/response media information, Content-Disposition, filename/path normalization and extension preservation; reject unexpected HTML/login pages unless intentionally saved as HTML by a supported documented feature.
- Video and audio: support Chrome context media sources where readable and authorized; if blob/media-stream/DRM restrictions prevent safe access, explain an accurate unsupported state. Do not promise universal extraction.
- Page / arbitrary selection: expose setup/management; only treat page content as a save if its semantics have been explicitly designed and implemented, not by silently uploading HTML.
- Relative/source URLs, redirects, data/blob URLs and signed query strings: validate carefully. Do not leak auth query strings to the destination; resolve permitted cases and block unsupported cases with a useful reason.
- Observe redirects and re-check destination origins/permissions and sensitive-host restrictions. Do not circumvent CORS, browser site restrictions, DRM or authorization. No cookie forwarding to provider. Authenticated private sources may require explicit supported permission/consent.
- Chrome optional_host_permissions need a secure UX: if original source origin permission is absent, show a user-triggered permission flow with explicit origin and continuation/retry; do not silently fail or request <all_urls> as a blanket shortcut.
- Source capture and upload must not create a file in Downloads, temporary disk, a separate transfer tab or a full-content IndexedDB cache. Stream chunks from browser toward provider; bound memory independent of total file size.
- Use one trustworthy filename sanitizer that preserves the safe extension, excludes traversal/null/control characters, supports Unicode and long names within provider key limits.
- Prevent SSRF/private-network requests when a Worker or companion is ever involved; all original URL fetching is performed by the authorized browser, not delegated to cloud provider.
- The provider/Worker sees only the destination object key, valid MIME type, size/chunk/checksum fields, verified account/session/upload authorization, and file bytes. Never include the original URL, page URL, link URL, referrer, source host, tab title or browsing provenance in request body, headers, remote object metadata or remote diagnostics.
- Local History MAY retain user-approved provenance for personal review according to existing privacy settings; it must not become provider metadata. Diagnostics and exports must redact sensitive URL/query/token data.

## 6. Cloudflare R2 real upload transport — remove stub honestly

Do NOT simply flip workerReady:true or return success from a mock. Implement a secure, authorized, deployed-or-configured real transport with separate capabilities:

1. Account and bucket discoverability through current OAuth scopes.
2. Read/list support through a confirmed supported API/Worker endpoint.
3. Separate write capability check by account + bucket + authenticated Worker/binding/session, with operation/endpoint version and exact bucket target.
4. Actual browser-byte upload transport, including efficient small files and scalable multipart/resumable upload for large files when Cloudflare's official constraints permit.
5. Provider metadata HEAD/list/object verification, plus independent size/content integrity check appropriate to the transport.
6. Explicit failure states: not connected, scope denied, account mismatch, bucket missing, Worker not configured, Worker not reachable, transport version mismatch, quota, rate limit, request too large, session expired, source fetch failure, write uncertain.
7. Revocation and reconnect must remove write capability until revalidated.
8. The implementation must not silently create buckets, deploy Workers, enable public R2 URLs, alter billing, request broader scopes, add custom domains, or mutate production resources. Provide a clearly labeled setup/authorization action when those are necessary.
9. Login remains QUIET: pressing Log in opens the normal Cloudflare user-consent flow and records the session. It does NOT itself navigate the app, provision a bucket, perform background mutation, start whole-cloud scanning, rebuild configs, or request extra unrelated permission. Post-login setup is explicit and independent.
10. If credentials/tokens must be added for a private authorized bucket/Worker, offer a clearly authorized Add Token / Configure Upload endpoint flow in the appropriate bucket Settings area. Persist secrets securely in privileged extension storage; never in page scripts, public repo, URL, debug receipts or plaintext exports.

For Cloudflare transport selection: compare direct authorized Worker byte PUT/POST and valid presigned R2 S3 multipart approaches against CURRENT official provider documentation. Select the smallest secure deployable approach actually supported. Do not assume the existing management REST object path or an old REDOWN “ingest sourceUrl” endpoint is a valid direct upload API. Keep provider secrets out of page scripts. Worker never fetches the original source URL. If no write endpoint is available without owner-controlled deployment, implement the safe setup path and clearly mark live upload BLOCKED until it is provisioned; do not falsify a test.

The current src/explorer/r2-adapter.mjs staging + byte verification + final commit concept may be adapted, but only after verifying every endpoint, response, permission, conflict behavior, size restriction and rollback path. Keep conflict default KEEP BOTH; duplicate filenames must not silently overwrite. Exact final object key/prefix must be verified.

## 7. Large files and resumability: no arbitrary 32 MiB claim

- Audit every hard limit in source-capture, engine, Explorer, GUI, API schema, adapter and Worker. State each documented provider/transport limit and source of truth.
- Replace whole-file byte arrays in the large-file path with bounded streaming and/or upload sessions. Use stable job IDs and idempotency/commit receipts; avoid holding complete file buffers or serializing megabytes into chrome.runtime.sendMessage.
- Chunk/multipart where supported, using bounded concurrency/backpressure; verify correct finalize/abort semantics, checksum/size if supported, and limits per part/object/account.
- Persist only minimum job metadata required for safe interruption handling, not full source bytes or unapproved browsing data. Never silently replay a possibly committed upload; inspect its exact remote job/object first.
- User promise should be “up to actual provider/transport limits” — not an invented limitless cap or 5 TB claim without confirming provider-specific limits. Do not cap at 32 MB/300 MB merely because old beta code did.
- Test empty files, tiny text, binary content, Unicode filenames, 4–32 MiB, a file above 32 MiB, a multi-part-size file, and larger files where authorized testing resources permit. Record coverage and unresolved limits precisely.
- Preserve privacy and no-local-disk behavior throughout. If a browser/network cannot acquire or upload a particular resource, show why instead of falling back to local download.

## 8. Click → verify → History and UI truth

Lifecycle must be explicit and programmatically queryable:

CAPTURE_REQUESTED → SOURCE_AUTHORIZED → SOURCE_READ_STARTED → SOURCE_READY/STREAMING → DESTINATION_AUTHORIZED → UPLOAD_SESSION_STARTED → BYTES_SENT → REMOTE_COMMIT_ACK → REMOTE_VERIFY_STARTED → VERIFIED_SUCCESS → HISTORY_COMMITTED.

Failure/uncertain/cancelled paths are separate terminal/recoverable states.

- Immediate tiny click acknowledgment is NOT save success.
- Verified success must be tied to the exact account, bucket, prefix, final key, expected total byte count and immutable operation ID.
- Remote verification must be independent of a Worker “ok:true” or HTTP 200 alone. Prefer provider readback against expected streamed hash/size; where whole-file readback is expensive, use officially supported strong checksum and object HEAD with a documented threat/correctness model. ETag alone may not prove multipart content equality; do not assert it does.
- If upload was acknowledged but verification is incomplete, mark UNCERTAIN and offer Inspect/Refresh/Go To; never silently retry as a new write.
- History should record filename, timestamp, provider + exact destination, status, verified receipt ID/key and actionable GO TO on verified entries. Do not remove this defining feature. Keep source URLs local and subject to existing History/privacy tier rules.
- On confirmed completion only: increment count, emit verified success, maintain progress/transfer receipt. On failure: appropriate quiet indicator and inspectable History reason. Restore failed-save indicator without flashing SUCCESS.
- Do not change existing art/themes unless required to wire actual terminal status. UI polish is secondary to functional proof, but no deceptive feedback is allowed.

## 9. REDOWN reference: import the lesson, not the bug

Required contrast table in delivery:

- What REDOWN demonstrably does at native menu registration, click dispatch, active target resolution, capture, upload, verification, history, recovery.
- Which of those behaviors Click2Cloud currently has and which it does not.
- Which REDOWN design is unsafe/obsolete relative to the Click2Cloud contract and must NOT be copied.
- Exact Click2Cloud replacement owner/file for each gap.

Explicit “DO NOT COPY” examples:

- REDOWN Cloudflare Worker sourceUrl remote-ingest body.
- REDOWN metadata of original sourceUrl stored on the cloud object.
- Any REDOWN upload path that navigates to an extra browser page or requires local Downloads.
- REDOWN legacy/right-click mode coupling, redundant registrars, unexplained nested provider menus, timer-based fake success, lost GO TO, silent account fallback, hardcoded public-HTTPS-only assumption beyond justified source support.
- Unverified/provider-specific claimed success and any privileged debug endpoint.

Preserve working ideas only after tests: parent-first native menus, startup reconciliation, exact clicked target, serialized application, safe provider account verification, idempotent jobs, actual remote readback and confirmed History.

## 10. Provider parity beyond Cloudflare — phased, not fabricated

Cloudflare R2 is P0 unblocker and first real acceptance target. Build transport/provider-neutral APIs so future independent adapters work without disturbing V3+1 menu projection. Then, when authorized test connections are available, add/prove Google Drive, Dropbox and OneDrive with their real provider authentication, browser-fetched bytes and exact provider receipts.

- Each non-S3 provider remains one native leaf under Click2Cloud, not nested.
- Provider login is one-time normal authorization; no unwanted transfer tab after connection.
- Verify provider API maximum, chunked/resumable upload protocol, destination scope, account isolation and binary content.
- Reconcile REDOWN working behavior but do not lift brittle permission/account assumptions.
- Absence of connected provider OAuth must produce NOT TESTED/BLOCKED, never “supported” or PASS.
- Do not let future-provider placeholders block the finished Cloudflare path.

## 11. Chrome MV3 and boot resilience

- Background module must be loadable from generated dist/click2cloud/manifest.json with its relative module imports.
- One documented Windows CMD build/install path; include a real build test that checks every manifest-referenced file exists in dist.
- Avoid logic that accidentally requires the source repo “extension” folder be loaded directly; the build folder is the installable artifact.
- Register event listeners synchronously at worker module evaluation; asynchronous initialization must not drop first-click events.
- Reconcile native menu on every appropriate worker activation and after Chrome startup/install/config changes. Respect actual Chrome callback ACK; never infer Chrome installation from stale IndexedDB.
- Ensure one click invokes one operation (no duplicate listener/worker route).
- Preserve/restore pending/uncertain jobs and current menu generation. Boot and current-state recovery must be testable programmatically and must not create competing engines.
- Service-worker termination in the middle of capture/upload/verify must yield safe eventual state, no spurious success and no automatic duplicate write.
- Keep source-origin permission prompts achievable from a real user gesture; if Chrome's permission API requires an extension page/UI transition, provide the smallest honest action and resume safely after approval.

## 12. Required IF / THEN / ELSE acceptance scenarios (not substitute for real tests)

01. IF extension freshly installed with no account THEN native Click2Cloud Setup/Manage appears; ELSE diagnose absent menu, not “works”.
02. IF correct dist build selected THEN background loads and menu ACK appears; ELSE show actionable packaging/boot error.
03. IF user connects Cloudflare THEN only OAuth state changes; ELSE no auto-provision/scan/navigation.
04. IF account connected but upload Worker is not configured THEN destination remains non-writable with explicit setup route; ELSE never flip readiness by assumption.
05. IF capability probe succeeds for exact authorized bucket THEN writable readiness may be true; ELSE remain false.
06. IF Simple root default configured and Flat selected THEN one direct Cloudflare save leaf appears; ELSE no accidental second submenu.
07. IF Narrow configured paths selected THEN only selected paths appear with exact hierarchy; ELSE never discover unrelated Narrow paths.
08. IF Depth enabled THEN discovered non-configured folders to selected depth appear; ELSE no fabricated folders.
09. IF a path exists in one mode and another mode is edited THEN first mode's configuration remains unchanged; ELSE fail test.
10. IF user right-clicks normal image URL THEN file's true bytes save to selected destination; ELSE show capture failure.
11. IF user right-clicks downloadable link THEN content, filename, extension are preserved; ELSE reject HTML/login response rather than claiming binary success.
12. IF video/audio source is readable and authorized THEN bytes can save; ELSE meaningful unsupported state.
13. IF source permission absent THEN clear explicit permission request/retry; ELSE no silent drop.
14. IF source redirects to an unapproved origin THEN stop/revalidate permission; ELSE do not silently follow.
15. IF source is blob/data/DRM-protected/stream-only THEN supported cases are captured safely and unsupported cases truthfully blocked; ELSE no invented transfer.
16. IF source content is empty THEN produce valid zero-byte remote object if supported; ELSE accurate provider error.
17. IF file is above 32 MiB and within supported provider limits THEN chunk/stream without arbitrary 32 MiB rejection; ELSE document actual limit.
18. IF filename contains Unicode/spaces/extension THEN remote key preserves safe semantics; ELSE sanitize traversal and illegal characters.
19. IF two destinations share labels THEN stable unique item identities map to exact paths; ELSE fail closed on collisions.
20. IF user chooses account A/bucket X/folder P THEN never write to B/Y/Q; ELSE no account/default fallback.
21. IF cloud rejects token/permission THEN no bytes sent, no success; ELSE authorized session remains valid only after recheck.
22. IF cloud upload returns HTTP success without a provider receipt THEN operation remains unverified; ELSE only real receipt permits verification.
23. IF remote HEAD/readback size/content differs THEN fail/uncertain and inspect; ELSE mark success only after independent evidence.
24. IF upload commit uncertain after network loss THEN do not blindly replay; ELSE inspect exact key/upload session.
25. IF keep-both conflict THEN choose a distinct safe final key without overwrite; ELSE no silent replace.
26. IF user right-clicks twice rapidly THEN produce two independently tracked jobs (or a deliberate clearly acknowledged dedup policy); ELSE no lost/duplicate phantom save.
27. IF menu generation changes during source fetch THEN revalidate exact authorization/route before upload; ELSE fail closed.
28. IF OAuth account switches during upload THEN prevent newly unauthorized writes and correctly classify in-flight uncertainty; ELSE no cross-account upload.
29. IF MV3 worker sleeps or crashes THEN startup recovers menu and job state safely; ELSE show recoverable failure.
30. IF native ACK fails THEN UI indicates pending/partial and Manage remains accessible; ELSE never claim applied.
31. IF user disconnects THEN save actions become unavailable while remembered paths persist; ELSE no destructive reset.
32. IF user reconnects the same account THEN explicit setup/capability proof restores actionability; ELSE no implicit provider cross-binding.
33. IF user right-clicks inside Click2Cloud Explorer THEN source cloud entry can be saved to other authorized destinations through same dispatcher; ELSE show exact capability limitation.
34. IF provider confirms verified success THEN History records exact destination + GO TO and counter increments once; ELSE no early success animation.
35. IF operation fails or is uncertain THEN History accurately distinguishes outcome, and laser/failure feedback follows product settings; ELSE never mark it successful.
36. IF provider API receives an upload THEN instrumentation confirms NO source URL, page URL or browsing provenance in request or object metadata; ELSE security test FAIL.
37. IF app's programmatic API reports writable capability THEN an actual corresponding authorized route is ready; ELSE must report blocked/unavailable.
38. IF manual Chrome test cannot run due policy/environment THEN mark BLOCKED with policy evidence and obtain user-run reproducible steps; ELSE do not substitute fixture results.
39. IF R2 Worker needs deployment, billing, or new token THEN stop and obtain explicit owner authorization; ELSE do not create any resources.
40. IF build/tests pass only with mocks THEN label fixture pass, not live save pass; ELSE require separately proven provider readback.

Expand focused tests only when they directly demonstrate the live product. Do NOT return to the retired 500/1,000 synthetic scenario expansion.

## 13. Real end-to-end test matrix (proof classes)

For each case capture: Git SHA/branch, unpacked build location, extension ID, Chrome version, test timestamp, provider/account/bucket *non-secret* identifier, precise menu ID/generation, source class and sanitized URL category, exact chosen prefix, file byte count, source hash where appropriate, upload ID, final object key, provider receipt/readback/hash, resulting History entry, and PASS/FAIL/BLOCKED/NOT TESTED.

Test classes:

A. Build/load: npm run build:extension, manifest asset resolution, real installed Chrome worker, no Errors.
B. Native UI: Chrome contextMenu pixels/visibility, root/setup, Simple, Narrow, Depth, Flat, restart, partial-ACK recovery. Include real mouse clicks, not only page-level fake Chrome mocks.
C. User OAuth: actual consent, correct Click2Cloud extension ID/redirect, authorized R2 account/bucket discover, no post-login side effects, token refresh/revoke/reconnect.
D. Real transfer: 1-pixel PNG, webp/jpg/gif as available, PDF, text, nontrivial binary, downloadable link, Unicode name, duplicate conflict, >32 MiB, and permitted chunked file. Use disposable test files/objects with owner consent.
E. Privacy: inspect outgoing requests to Worker/provider and R2 object metadata for absence of source URLs/provenance; no disk file in Downloads; no secret leak in diagnostics.
F. Failure: wrong/expired auth, deleted bucket, missing Worker, denied origin, blocked redirects, upload timeout, provider 4xx/5xx, MV3 shutdown, stale config, remote partial commit, readback mismatch, offline.
G. GUI/API parity: same account/bucket/folder, same status, same verified receipt semantics for Chrome native click, Explorer save and typed authorized API.
H. History/feedback: no premature success, exactly-once counter/history completion, exact GO TO, uncertainty inspection.
I. Security: cross-account attempt denied, no generic exposed write API, permission request meaningful, no source URL to provider, no arbitrary upload Worker accessible without scoped authorization.

Do not claim that fixture browser output proves actual installed native context menus. If CI/browser policy prevents installation, report exact policy and ask for a reproducible user's local Chrome smoke-test run, without asserting PASS. Cloudflare credentials, tokens, Worker mutation routes and paid resources must never be fabricated.

## 14. Implementation order, commits and accountability

Phase 0 — Inspect & record: baseline commit, actual call graph from menu to transport, failures per gate, documented REDOWN comparison. Reproduce user's missing/ineffective right-click with current built extension.

Phase 1 — Native install and menu baseline: correctly packaged MV3; durable root/setup when unconfigured; current menu ACK; real click dispatch and source context mapping; recovery after MV3 restart.

Phase 2 — Secure Cloudflare capability: verify OAuth account/bucket read path, add explicit authorized Worker endpoint/transport setup, establish verified exact writable capability. No cloud changes before owner consent.

Phase 3 — Browser byte capture: permission UX, stream source bytes and trustworthy filename; redact provenance to provider. Browser → authorized endpoint only.

Phase 4 — Actual upload, commit and independent verify: provider adapter wired through existing dispatcher; keep-both conflict and exact path; no premature success; History GO TO receipt.

Phase 5 — Streaming/resume/large files and interruption safety: remove disconnected hardcoded caps, bounded memory, upload session introspection and uncertainty recovery.

Phase 6 — Multi-entry modes, cross-provider/Explorer parity, current-state/Boot/API introspection, comprehensive focused live tests.

Use small reviewable commits with source/test evidence. Keep REDOWN files unchanged. Do not deploy Worker or merge to main without explicit authorization. Do not overwrite cloud data. Protect genuine secrets and test data.

## 15. Deliverables to owner — mandatory

1. A functional unpacked Chrome extension generated in dist/click2cloud, with exact Windows CMD build and Load unpacked steps.
2. Implemented source changes, tests and commit SHAs on the development branch.
3. One current-vs-required IF/THEN/ELSE behavior map with file/line owners and remaining gaps.
4. Evidence file in docs/evidence/right-click-real-upload/ describing native Chrome ACK, human OAuth, real upload, provider byte readback, History, interruption, >32 MiB and privacy tests.
5. Machine-readable programmatic receipt examples for menu state, capability state, click attempt, upload job, provider verification, and History commit. Mask all secrets and provenance.
6. A separate PASS / FAIL / BLOCKED / NOT TESTED matrix; state untested provider/size coverage explicitly.
7. The exact first-run steps for a user who has just loaded the extension; connect only when requested, then explicitly prepare a default destination, then right-click and see a verified cloud object.
8. If a legitimate cloud Worker must be configured/deployed: smallest necessary scope, endpoints, permissions, source/metadata privacy constraints, security checks and user-approved setup steps, with no false claim that this was already done.
9. A concise description of which REDOWN behaviors were reused conceptually, which were intentionally NOT copied, and why.
10. No unrelated GUI redesign, marketing work, 500/1,000-case synthetic regression expansion or REDOWN production edits.

## 16. Hard acceptance / stop rule

DONE means a human user can install the generated Click2Cloud MV3 extension, connect/authorize Cloudflare normally, explicitly configure an exact destination, right-click a real file on a web page, and have that file's real browser-captured bytes arrive in the correct R2 bucket and folder without local downloading, while source URLs never reach the provider, and Click2Cloud records independently verified success with History GO TO. All other tests must support this core path, not substitute for it.

If the Worker is not provisioned, authorization is missing, Chrome policy prevents native testing, or uploads cannot be independently verified, do all safely implementable work, report the precise remaining blocker and required owner action, and mark this P0 NOT DONE. Never convert “a click was captured”, “a menu appeared”, “HTTP 200”, “a fixture passed”, or “a file might exist” into a false successful save.
