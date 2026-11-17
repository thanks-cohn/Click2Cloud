# Universal File API — independent repository charter and phased Chutey OS roadmap
**Owner direction:** 2026-11-17  
**Proposed dedicated repository:** `thanks-cohn/universal_file_API` (not yet created at time of this charter)  
**Status:** Architecture and extraction plan, not an implemented, audited or deployed service.  
**Current staging location:** `thanks-cohn/Click2Cloud/docs/UNIVERSAL_FILE_API_REPOSITORY_CHARTER_2026-11-17.md`  
**Canonical mandate:** The **same core API and operation contracts** must serve every GUI, browser extension, native application, CLI, provider and future authorized agent bridge. Avoid duplicated state engines.

## 0. Evidence and golden-source intake FIRST
1. Read `thanks-cohn/REDOWN/AGENTS.md`, `thanks-cohn/Click2Cloud/AGENTS.md`, and `thanks-cohn/chute/README.md`. Existing P0/Forever Works, user configuration and rollback protections take precedence over refactoring.
2. Reconstruct the **actual presently working REDOWN Universal File API** starting from:
   - `REDOWN/extension/beta/file-api.mjs` — `createFileApi(adapter)`, `run`, `batch`, policy and preferences; methods listed below.
   - `REDOWN/extension/beta/configuration.mjs` — option defaults, validation, operation-specific options.
   - `REDOWN/extension/beta/r2-adapter.mjs` — the Cloudflare R2 file operations and existing authenticated host dependencies.
   - `REDOWN/extension/beta/*` GUI and its background/Worker message handlers; `REDOWN/extension/cloudflare-api.js`, `extension/background.js`, `extension/shelf-explorer.mjs`.
   - `REDOWN/docs/MEGA_S4_IMPLEMENTATION.md` — existing MEGA S4 (S3-compatible) vertical slice and explicit limits; identify actual implementation from source, not presumed full parity.
   - `Click2Cloud/docs/UNIVERSAL_FILE_API_EXTRACTION.md` — 2026-11-03 extraction of three REDOWN beta modules; `Click2Cloud/src/explorer/` has subsequently evolved and must be diffed, not assumed identical.
   - `Click2Cloud/right2cloud-module/API_CONTRACT.md`, `SECURITY_PRIVACY_LIMITS.md` — TRUE REMOTE coordinator, verification, authorization and receipt boundary.
   - `chute/src/chute/explorer/` — local Windows filesystem, grants, media, job receipts and file-actions; preserve current Request 3 repair work.
3. Produce `OPERATION_INVENTORY.md` mapping *every source operation* to symbol, file, provider, auth requirements, byte path, safety/cancellation, live/fixture evidence, known limits, customer-visible UI calls, planned canonical contract and tests. Do not claim an operation works because its method exists.
4. Pin hashes and behavior fixtures for REDOWN's currently dependable flows and known bugs; distinguish source present, unit tested, installed-Chrome tested, provider-live tested, and owner-observed. Frozen references must remain auditable. Never import secrets.
5. Do **not** remove or alter REDOWN's installed working implementation as part of extraction. Build compatibility adapters and prove exact parity before consumers switch.

### Source API operation inventory (names from REDOWN `file-api.mjs`)
`listRaw`, `readStream`, `connectionStatus`, `connect`, `disconnect`, `accounts`, `buckets`, `list`, `stat`, `upload`, `download`, `mkdir`, `copy`, `move`, `rename`, `delete`, `remoteIngest`, `preview`, `publicUrls`, `createBucket`, `profiles`, `prepareBucket`, `transferHistory`, `archiveEntries`, `archiveEntryUrl`, `extractArchiveEntry`, `inspect`. API facade also has `run`, `batch`, `setPolicy`, `getPreferences`, `getDefaults`, `setPreferences`, `capabilities`. Name-list is a discovery inventory, **not** proof of support in each provider.

## Phase I — Extract and preserve the working Universal File API
- Establish independent package(s) with the original source as read-only references and a compatibility test matrix. Keep `createFileApi`/operation behavior stable while disentangling REDOWN UI assumptions, `chrome.runtime`, Cloudflare management API and per-bucket Worker transport.
- One canonical `FileOperation`, `ProviderAddress`, `Entry`, `Capability`, `OperationReceipt`, `Progress`, `Error`, `HistoryRecord` and `TransferJob` contract. Require versioned schemas and explicit feature negotiation: `unsupported` is better than a fake completed operation.
- Stable hierarchical identity: provider type, connection/account ID, bucket/container/drive/root, path/key, normalized display name, pagination cursor, object version/ETag, size, modified time, hashes when actually computed. Keep filename paths and secret provider credentials out of public URLs and logs.
- Preserve exact states `completed/verified`, `partial`, `failed`, `cancelled`, `uncertain`, `blocked` as appropriate. Only provider-confirmed destination verification creates a success receipt. Unknown write outcome must be reconciled before retry.
- Provider adapter / trusted host ports are the *only* backend-specific components. GUI, Chrome menu, developer CLI, automation and agent tools must call the SAME public service and guardrails. A provider's missing capability cannot be silently simulated.

## Phase II — One coherent, multi-provider Explorer GUI BEFORE system-wide abstraction
Build a polished, FAST single Explorer product on top of the extracted API. Start from the already existing REDOWN UI, audit what actually works, and reuse the strongest navigation and context-menu behavior rather than rewriting blindly.

**Multi-account, multi-window, multi-tab:** open separate independent Explorer tabs or panes for:
- Cloudflare R2 (multiple authorized accounts/buckets).
- MEGA **S4** S3-compatible (do not confuse with MEGA Cloud Drive).
- Other **S3-compatible providers** (separate adapter/auth/signing-region/endpoint capability; never assume universal S3 parity).
- Future Google Drive, Dropbox, OneDrive and other services only when real adapters and sign-in are implemented and verified.
- Local roots through Chutey's native guarded filesystem adapter in a later integration milestone.

Each tab/pane remembers its independent provider identity, current path, history/back-forward, scroll, selection, sorting, filter/search, view mode, media preview and connection status. A disconnected provider remains visible with its saved tree and honest offline status; never reset another provider's credentials/destinations. Support two-pane cross-cloud copy with explicit source/destination, independent checksum and destination verification, collision rules and resumable/journaled large transfers where supported. Stream bytes; do not materialize multi-GB files in Chrome RAM or local disk unless explicitly selected.

**GUI parity:** toolbar, tab manager, tree, breadcrumbs, search, context menus (Open/Reveal, Copy/Move, Rename, New Folder, Delete, Preview, Transfers), drag/drop, receipts and diagnostics call the same API. Render menus immediately and resolve authorized operations asynchronously. No accidental GUI-only writers. Keep CPU/memory bounded and interactive while transfers/streaming continue. Make no false promises of currently unsupported operations.

**Required provider proof:** connection/account discovery, paged list and exact root, stat, preview/media, copy/move/rename/delete, upload/download, cross-account transfers, abort/429/retry, auth expiry and repair, unknown-length sources, hash/size checks, failure/uncertain reconciliation, directory persistence, multi-window concurrency and crash/restart. Test R2 and MEGA S4 separately; future providers have explicit not-implemented gates.

## Phase III — Abstract the *proven* Explorer into shared Universal File API infrastructure
Only once Phase II passes real-browser and live-approved provider gates, separate:
- `core`: typed, versioned operations; immutable IDs; capability discovery; normalization; scheduler; receipts; verification; scoped auth.
- `adapters`: R2, MEGA S4/generic S3, optional Google Drive/Dropbox/OneDrive, and Chutey local filesystem; credentials stay in each trusted host.
- `transfers`: source stream -> bounded transfer -> independent destination verify, journaling, recovery; privacy-specific paths for remote ingest.
- `metadata`: indexed folder hierarchy, stable identity, optional streaming SHA-256, snapshot diff and searchable catalog. SHA-256 denotes byte equality, not semantic image identity or a backup.
- `ui`: reusable Explorer components, layouts and theming; each application can own its own shell without cloning data engines.
- `integrations`: REDOWN, Click2Cloud, Chutey, browser extension, native app, developer CLI, authorized automation and future ChatGPT connector. One API version, explicit client capabilities and conformance suite across every adapter.

**Privacy/security:** REDOWN's historical true-remote fetch and Click2Cloud's bytes-only/no-source-URL provider privacy contract are different; keep transfer modes explicitly labeled and opt-in, never silently forward source URLs to a storage provider. Never expose Cloudflare credentials, OAuth tokens, local path authority, source URLs or file bytes to untrusted pages/agents. All privilege changes, deletes, external transfers and cloud uploads require correct scopes, intent and verified results.

## Phase IV — Chutey OS, only AFTER the shared API + Explorer stabilize
Two products/editions sharing the SAME core library and trusted native filesystem service, not two incompatible forks:

**A. Chutey OS — Basics / Community Edition (working name):**
- Approachable GUI Explorer, clearly explained approved folders, previews and Open/Reveal, file organization, safe clipboard, local/cloud mounts, history, snapshots, optional simplified floating companion. No required coding or terminal experience.
- No automatic whole-system access. A user selects precise local folders and cloud connections. Safe default is read-only discovery; writes/delete/export require explicit authority and review.

**B. Chutey OS — Developer Edition:**
- **Always-on-top compact CMD/terminal-style file Explorer/command console**, with user-controlled size/minimize/close; never auto-hide merely because the mouse leaves it, and no interference with normal Explorer/Chrome. Search and navigate local + authorized cloud resources via the canonical Universal File API.
- Start with structured, typed commands (`ls`, `find`, `stat`, `hash`, `diff`, `plan`, `copy`, `move`, `restore`) and a dry-run option. Full Windows shell execution, if ever offered, is a **separate explicit privileged feature**, not implicit in file API permission. Include scripts, SDK, CLI, API docs, audit trail and transparent transfer receipts.
- Developer may grant broader local/cloud scopes consciously; **never silently default to the whole machine**. Separate explicit read, write, delete, command-execution and export scopes with safe per-operation confirmation/limits and reversible transactions where possible.

**Chutey Time Machine (future milestone):** hierarchy + timestamps + object identities + SHA-256 enable change tracking and duplicate discovery. Actual historical restore requires storing versioned original bytes or content-addressed backup objects, retention policies and verified restore; hashes alone cannot restore deleted or overwritten files. The UI can diff snapshots, verify backups and selectively restore. Share the same metadata layer across cloud and local.

**ChatGPT/agent integration (future, opt-in):** expose only capability-limited, consented tools via a trusted local/remote bridge (e.g. MCP/custom integration *where supported*), with metadata-first operation and explicit previews/approval for modifications. A Chrome extension alone is **not** authority for unrestricted ChatGPT filesystem access. ChatGPT may operate on hashes/hierarchy for comparison and duplicate detection without seeing image bytes; visual/semantic analysis needs tags or separate vision processing. Support session expiration, auditable plans, rate limits, prompt-injection resistance and an immediate revoke switch.

## Phase V — Validation, release and branch strategy
1. Extract source and its tests on an isolated branch, record provenance and untouched REDOWN rollback.
2. Build verified R2 + MEGA S4 multi-tab Explorer; add other S3 adapters only after separate proof. Preserve user state, OAuth/destinations, idempotent transfers and partial/uncertain receipts.
3. Stabilize UI responsiveness, concurrent streams, copy/clipboard, cancellation, 30-minute playback while browsing, and real low-memory Windows/Chrome use. Keep performance modes (Efficiency/Balanced/Turbo) grounded in measurements where incorporated.
4. Freeze a demonstrably stable cross-provider Explorer API version. Migrate REDOWN/Click2Cloud/Chutey via individually tested adapters, no flag-day rewrite.
5. Then branch product shells `chutey-os-basics` and `chutey-os-developer` from shared tagged API releases. The always-on-top CMD-like console belongs to the Developer shell; it must not change core permission semantics.
6. Only then pursue snapshot/Time Machine and optional ChatGPT MCP integration.

**Success gates:** actual installed Chrome and native Windows tests; real, approved cloud source and destination confirmation; independent byte/hash verification; stable Windows 4GB RAM behavior; 30-minute playback with folder navigation; no false success; no lost configuration; no silent side effects. Report PASS/FAIL/BLOCKED/NOT_TESTED and exact versions. Existing docs are source evidence, not product acceptance.

## Codex entry
Start in the current REDOWN, Click2Cloud and chute repositories. Produce a frozen evidence-backed API/function inventory, compatibility matrix, adapter test plan, GUI navigation plan and smallest safe extraction PR. Keep production deployments and existing user data unchanged. Do **not** immediately build Chutey OS editions, attempt full-system control or redeploy Workers. The new `universal_file_API` GitHub repository should hold this charter, API contracts, conformance fixtures and compatibility wrappers after it is created with owner access.
