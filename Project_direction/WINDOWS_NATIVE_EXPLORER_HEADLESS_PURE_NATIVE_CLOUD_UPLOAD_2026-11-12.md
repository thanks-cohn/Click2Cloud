# Windows Explorer-to-Cloud — REDOWN Native Agent, Headless CLI, and Pure Native Mode

**Status:** Project direction / proposed feature (not implemented)
**Recorded:** 2026-11-12
**Products:** REDOWN desktop/native application; Click2Cloud shared provider/routing/queue engine

## Vision
Turn REDOWN into a Windows-to-cloud uploader that works independently of Chrome. Users can right-click files/folders in Windows File Explorer, choose their saved destination, and upload to Google Drive, Dropbox, OneDrive, Cloudflare R2, or future supported providers. Support an optional **Pure Native mode**, direct fast local browsing, and a scriptable headless CLI. Ordinary users should be able to sign in via official providers rather than manually creating API tokens; advanced users may explicitly import compatible credentials locally.

## Two connection modes
### 1. Managed sign-in (recommended default)
- User selects **Connect Google Drive / Dropbox / OneDrive** and completes supported provider OAuth consent in their browser/system sign-in UI.
- The desktop agent securely persists permissible credentials and refreshes access tokens when supported.
- No requirement for individual users to register developer apps or paste tokens.
- Reauthorization may still be required after revocation, expiry, policy changes, or invalid refresh credentials; never promise indefinite login.

### 2. Pure Native / local credential mode (advanced opt-in)
- Native desktop app communicates directly with supported cloud APIs; it is not dependent on a browser tab, browser service worker, REDOWN extension, or a separate remotely hosted REDOWN proxy for normal provider uploads.
- Let the user import or configure **provider-compatible** access tokens, refresh tokens, API tokens, or sanctioned local credential profiles **only when allowed by that provider's authentication scheme and terms**. Do not imply an arbitrary access token is renewable or sufficient forever.
- Import credentials into an encrypted, OS user-bound local secret store (e.g., Windows Credential Manager/DPAPI), not plaintext settings, a diagnostics file, command-line arguments, browser storage, or a server upload. Provide explicit account/scope verification, expiration info if known, rotate/revoke/remove controls, and a safe local-only credentials management UI.
- Preserve the distinction between short-lived bearer access tokens, refresh tokens, app credentials, and provider-specific API tokens. If the provider requires OAuth reconsent, an imported token cannot bypass it. Prefer official desktop OAuth+PKCE flows even for Pure Native when supported.
- **Pure Native means direct client-to-provider transfers, not lifetime login and not necessarily zero network traffic**. Cloud uploads still require connectivity to provider APIs. Avoid routing file bytes or secrets through REDOWN-controlled servers by default.
- Cloudflare R2 authorization can differ materially from consumer-drive OAuth: use a provider-supported signed/direct workflow and the least privileged credentials possible; never silently create cloud resources or overgrant scopes.

## Native local explorer
- Provide fast direct **local filesystem viewing** in the REDOWN desktop app, without round-tripping through Chrome or remote file-listing APIs for local folders.
- Separate a local-files panel from cloud-remote listings; direct filesystem enumeration is local, but remote inventories inherently require provider requests and can be cached carefully.
- Responsive list/grid/details, path bar, thumbnails and bounded virtualized rendering for huge folders; avoid blocking UI threads on disk scanning, network requests, icon generation or thumbnail processing.
- Show Windows files and folders with user-granted OS permissions, including multiple selections and drag/drop onto a cloud destination. Never claim native viewing bypasses filesystem access controls.

## Windows right-click
- Install an optional, removable Windows File Explorer context-menu command **Send to REDOWN**. Offer saved cloud targets, quick default and/or open destination picker.
- Use appropriate Windows 11 shell integration (evaluate IExplorerCommand and packaging) and Windows 10 compatibility. Keep shell menu construction extremely fast; enqueue work asynchronously in an isolated user-scoped agent.
- Support single file, multiple files and opt-in recursive folder upload, with accurate progress, KEEP BOTH where configured, no source deletion and independently verified success.

## Headless CLI and background agent
One canonical local queue/provider engine powers the GUI, shell integration and CLI. Example **proposed commands**, not implemented:
```powershell
redown auth login google-drive
redown auth import --provider dropbox --from-stdin
redown destinations list
redown upload "C:\Pictures\photo.png" --destination "Personal Drive"
redown upload "C:\Projects" --destination "Project Archive" --recursive
redown jobs list
redown jobs retry <job-id>
```
- Never accept secret values as plain command-line arguments or echo them into shell history. If import is supported, use a protected interactive input or restricted-permission file/STDIN with explicit warnings.
- Include noninteractive/headless uploads after valid authorization has been established; first-time OAuth consent may require a browser or provider-approved device flow.
- Durable user-scoped queue, per-job ID, deduplication, retry/cancel, exit codes and JSON output, storage state preservation, and independently verifiable provider receipts.
- An optional Chrome Native Messaging bridge may delegate permitted actions to the agent; authenticate/authorize IPC and strictly validate file paths and destinations. A web page must not get arbitrary native filesystem or token access.

## Shared product integration and security boundaries
`File Explorer / Native File Browser / CLI / (optional Browser Bridge) -> Local Agent -> Destination Resolver -> Durable Local Upload Queue -> Provider API -> Verified Receipt -> Native History / Shelf / Diagnostics`

- **Local-to-cloud uploads must not be mislabeled TRUE REMOTE**: TRUE REMOTE is source-URL-to-cloud with no client file staging.
- Credentials stay local in Pure Native mode; file contents travel to the provider and not through REDOWN-managed infrastructure by default.
- Exact local file paths, screen/clipboard contents and tokens are sensitive; redact diagnostics by default and require explicit local-only advanced logging and preview before export.
- Preserve existing destinations, defaults, account associations, and queue jobs across sign-out, failures, reinstalls when recoverable, and upgrades. Never interpret failed storage reads as an empty configuration.
- Login alone does not establish upload readiness; check scopes, destination permissions, quota and successful cloud-side verification separately.
- Maintain API-first shared job lifecycle so native and browser UIs cannot disagree about queued, successful, failed or retrying state.

## Phased delivery
1. Survey existing REDOWN native integration, Windows shell restrictions, supported provider OAuth/credential import policies, and storage model before choosing native host architecture.
2. CLI/native agent proof of concept: local file -> one existing authorized destination -> verified receipt, without Chrome open.
3. Managed OAuth connection UX for Google Drive, Dropbox and OneDrive; separately evaluate safe Pure Native credential import/provider compatibility.
4. Windows Explorer context menu, multi-file/folder handling and asynchronous queue with performance measurements.
5. Fast native local file viewer (virtualized listings/thumbnails) and drag/drop to cloud destinations.
6. Unify browser bridge, screenshot hotkey profiles, Shelf and native history; harden security, restarts, offline retry, installer/uninstaller, token revocation, large files and no-data-loss acceptance tests.

## Acceptance criteria
1. Upload a local Windows file through CLI, context menu and desktop browser to a supported authorized cloud without Chrome open.
2. New users can connect a provider through official sign-in; advanced users can import a compatible credential into a protected local secret store where allowed.
3. A short-lived imported token expiring does not create false claims of permanent access; user gets truthful reconnect/renewal options with pending jobs preserved.
4. Right-click opens promptly without blocking on provider network requests; native local browsing is responsive for large folders.
5. Source files never disappear on failed upload; destination choices do not reset on failed login; no phantom upload receipts.
6. Direct client-to-provider data path in Pure Native is inspectable, with no REDOWN-controlled upload relay unless explicitly chosen.
7. Existing high-priority configuration-recovery and reliability safeguards continue to take priority over new optional features.

**Non-goals:** bypass provider login/revocation rules, store plaintext tokens, promise perpetual credentials, bypass OS file permissions, or silently create cloud resources.
