# Start Codex: universal multi-provider S3/S4 integration into V3+1

**Repository:** `thanks-cohn/Click2Cloud`
**Branch:** `feature/original-vs-assisted-depth-proposals`
**Scope:** build isolated connector/registry integration and tests in this new repository; **do not change REDOWN production or connect a real account without separately approved credentials**.

Read in order:
1. `universal_connectors/README.md`
2. `universal_connectors/CONNECTOR_API.md`
3. `universal_connectors/EXISTING_FILE_API_BRIDGE.md` and actual REDOWN `extension/beta/file-api.mjs`\n4. `universal_connectors/src/connection-registry.mjs`, reference tests
5. `assisted_proposal/ENGINE_ISOLATION_CONTRACT.md`
6. `assisted_proposal/depth/` and `destination_manager/`
7. `legacy/registry/`, `legacy/providers-and-saves/`, `legacy/storage-and-migration/` and `legacy/CURRENT_CLICK2CLOUD_CONFLICTS.md`

Reuse the existing REDOWN `createFileApi(adapter)` and `api.run()/api.batch()` semantics as the normalized operations boundary. Inspect actual C3 S3-specific engine source before attempting a compatibility bridge; do not invent a new parallel file API or a second native menu registrar.\n\nImplement a **universal provider connection interface** in which MEGA S4 is only the first S3-compatible adapter fixture, not a hardcoded backend or a separate invented S4 protocol. Support multiple S3 connections and future S3-compatible providers behind the same capability/credential/read/list/upload/verify contract. The browser extension—not any remote Worker—owns native Chrome right-click registration.

**Change the prior one-global-mode registry assumption to per-connection active modes.** Allow `Cloudflare` in Simple and `MEGA S3` in Depth *at the same time*, plus fixed flat `Google Drive`, `OneDrive`, `Dropbox` and future separate `MEGA` native provider. Register all contributions as independent siblings under REDOWN; preserve ordering and unaffected providers when one fails. Each connection may independently select Simple/Narrow/Depth; inactive settings persist.

Preserve mode isolation within each connection. The neutral registry accepts finished entries only, with exact namespaced action IDs and target ownership; it never edits mode configs or journals. Never reject two different destination IDs because their labels or paths coincide. Read current `src/core/menu-compiler.mjs` as a **superseded early prototype** where duplicate Narrow paths, sibling labels and a global Cloudflare submenu are rejected/assumed; do not copy those rules.

Maintain **one Depth directory index per provider connection/account/endpoint/bucket**, with graph CURRENT, incremental journal segments, named daily/weekly reference indexes and adaptive snapshots. A menu depth of 1–10 affects presentation only. Time Machine's file identity tracking and retention remain separate. No full-provider scans on context menu opening, provider switching or periodic checkpoint generation.

For credential exchange, follow least privilege and consent; pass only opaque credential handles to neutral plans. Validate MEGA S4 S3/IAM API capabilities from official documentation and an *authorized test account*, not guesses. Respect account- and bucket-specific permission errors. Keep native `MEGA` distinct from `MEGA S3`, and any future vendor S3 account separate from Cloudflare R2 activation. Koofr only via independently verified supported adapter (officially WebDAV). Test exact save receipts and source-URL privacy.

**First commit should create a deterministic, fully tested multi-connection registration core.** Then add fake S3 adapters, fault injection, persistent connection store, installable Chrome native adapter, encrypted credential/key-handling boundary, MEGA S4 conformance tests when authorized. Keep backwards compatibility/migration to old V3 possible and report each open evidence gate. **Do not claim the installed engine is built merely because the reference tests pass.**
