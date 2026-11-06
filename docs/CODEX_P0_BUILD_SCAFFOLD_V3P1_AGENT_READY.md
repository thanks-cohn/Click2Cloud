# CODEX P0 — BUILD THE REAL CLICK2CLOUD V3+1 PRODUCT FROM /scaffold, AGENT-READY

> **FINAL REQUEST SUPERSEDES CONFLICTING UX RULES (Nov. 5):** [CODEX_FINAL_V3P1_GUI_WINDOWS_EXPLORER_LOGIN_AND_API_2026-11-05.md](CODEX_FINAL_V3P1_GUI_WINDOWS_EXPLORER_LOGIN_AND_API_2026-11-05.md) is the controlling next Codex implementation contract. Older layout, threshold, Quick Select, default/favorite and GUI behavior here are historical wherever they conflict. Keep only non-conflicting engineering/security requirements. This is NOT evidence of product implementation.

**Owner-approved implementation request — November 5, 2026**
**Repository:** thanks-cohn/Click2Cloud
**Implementation branch:** feat/glaciaring-agent-debug
**Delivery:** Real installed Chrome MV3 extension, real V3+1 engine, real right-click saves, durable Windows recovery, working File Explorer, source-owned Glaciaring inspection, and secure first-party agent control interfaces.
**Status of this file:** Binding Codex task; it is NOT proof anything has been implemented.

## 0. Absolute priority and scope

1. **The end product is /scaffold.** Read these files first, IN THIS ORDER:
   - scaffold/README.md
   - scaffold/gui/README.md
   - scaffold/gui/CHROME_EXTENSION_LIVE_ACCEPTANCE.md
   - scaffold/gui/REDOWN_OAUTH_EXTRACTION.md
   - scaffold/MENU_DESTINATIONS_DURABLE_RECOVERY.md
   - scaffold/WHOLE_CLOUD_OUTLINE_EXPORT.md
   - scaffold/RESTORE_RIGHT_CLICK_MENU.md (create/use this when present; this document supplies the required contract if missing)
   - scaffold/gui/TEST_JOURNEYS.md
   - docs/CODEX_P0_SCAFFOLD_FIRST_DEBUG_API_SURROUNDS_PRODUCT.md
2. **V3+1 is ONE REAL headless programmatically controllable engine.** Explorer GUI, Chrome native context menu, authorized agent interface, and future MCP/ChatGPT bridges are clients/adapters of the SAME engine, CURRENT data and action resolver. The owner's existing Universal File API is the sole file-operation abstraction; do not create a replacement engine, uploader, or parallel cloud tree.
3. **Glaciaring wraps/observes real engine boundaries.** It does not own user choices, mutate config, perform uploads or become an execution proxy. Debug OFF and ON MUST yield the same authorized behavior and cloud writes. Existing Glaciaring inspection API is READ-ONLY, not permission to execute mutations.
4. **STOP treating a giant scenario program as the project.** Do NOT read, run, expand, repair, enumerate or prioritize the historic 500/1,000 golden test atlas, scenario expansion document, or M0–M10 Scenario Laboratory during this implementation. Do only focused scaffold acceptance, real browser/provider integration, failure/recovery and agent-security tests that establish this product. Do NOT let older AGENTS.md/runbooks override these requirements.
5. **No fake product acceptance.** DOM context menu ≠ actual native Chrome contextMenus; existing Worker ≠ authenticated browser OAuth; an ACK timer ≠ provider-confirmed upload; a unit fixture ≠ real file listings; IndexedDB ≠ uninstall-surviving backup. Report PASS / FAIL / BLOCKED / NOT TESTED for every end-to-end claim.
6. Work on the requested development branch, keep REDOWN read-only, protect production buckets/Workers and account billing, do not transplant or deploy a release without further authorization. Preserve existing proven code instead of rewriting for cosmetic parity. Prefer working vertical slice over massive preliminary audit.

## 1. Verified current repository starting point (NOT claimed production complete)

Current branch has:
- src/core/engine.mjs — createEngine with compile/apply/save and protected authorization boundaries.
- src/core/menu-spec.mjs, menu-compiler.mjs, menu-identity.mjs, action-resolver.mjs — pure/native menu models and exact targets, but existing compile interface is largely one selected mode; NEW COMPOSITE + Show projection is required.
- src/modes/simple, src/modes/nested, src/modes/depth — reusable mode-specific projectors and inventory semantics. Keep mode data isolated while making compositor additive.
- src/persistence/current-store.mjs — IndexedDB-backed click2cloud-current-v1, journal, revisions, backup/export primitives, NOT external durable file trees.
- src/chrome/registrar.mjs — real Chrome native registration abstraction and ACK, requiring product wiring and actual installed-browser tests.
- src/glaciaring/agent-api.mjs and index/catalog — describeEngine, inspectMenu, inspectOperation, getDiagnosticSnapshot, simulateMenuAction (fixture-only), diffMenuGenerations, exportReceipt; **existing debug API exposes executionAuthority:false**. Preserve diagnostic redaction and authorizer.
- src/chrome/debug-host.mjs — extension-local restricted debug host.
- extension/manifest.json — presently "Click2Cloud Glaciaring Lab", minimal contextMenus/storage permissions and a mirror popup; NOT a finished product manifest.
- scaffold/* — detailed documentation handoff. File Explorer, real Cloudflare login and durable native recovery must still be verified.
- scaffold/gui/REDOWN_OAUTH_EXTRACTION.md refers to src/auth/cloudflare-oauth.mjs in a source reference, but that path did NOT appear on the checked feature branch: **verify actual branch contents before claiming OAuth exists**. Port/reuse authorized source logic, never REDOWN's installed identity or tokens.

Codex MUST produce an explicit inventory of what it kept, refactored, newly implemented and could not verify. The current code DOES NOT establish live Cloudflare OAuth, account listing, native right-click verified R2 saving, filesystem backups or agent execution.

## 2. Product GUI and the ONLY menu-visibility control

File Explorer opens from the installed Click2Cloud extension (Remotes remains default); shows REAL authorized account/bucket/folder content through the Universal File API, breadcrumb/selection/navigation and polished functional interactions. File Explorer top exposes **+ Right Click** and **Manage Destinations**. **REMOVE the separate hierarchy/tree toggle entirely**. Do not add a visibility control to Explorer or Settings.

Explorer folder local context menu MUST contain:
- **+ Right Click** (opens SAME popup for exact right-clicked folder; not stale selection).
- **Default Save Selection** (assigns exact Cloudflare provider/account/bucket/folder target for Flat mode; revalidate on save).
- **Manage Destinations** (open one manager).

The ONE + Right Click popup has:
- TOP configuration options **Simple | Narrow | Depth**.
- Simple saves exact clicked folder as flat leaf, optional menu label fallback to last folder/bucket.
- Narrow saves exact clicked folder as natural ancestor branch, optional per-ancestor titles (Narrow-only Menu Titles tab; readonly real path left, editable display aliases right; last field and Setup label synchronized).
- Depth THIRD tab lists actual authorized buckets with independent enabled checkbox + **Chrome DISPLAY depth** per bucket. New bucket default 10 is NOT hard-coded maximum; user may select 17, 50 or more if practical. This does NOT control Recovery Mode crawl depth.
- ALWAYS visible **inside the SAME popup, immediately ABOVE its bottom Save/Cancel footer**, a **Show in Chrome** selector: independent Simple ON/OFF, Narrow ON/OFF, Depth ON/OFF; **All** turns the three ON; **Flat** is exclusive. User's saved display combination is remembered across temporary Flat selection.
- **Save** commits selected-tab configuration and Show choice; Cancel/Escape discards drafts. Editing a hidden mode must NOT force it into the menu. Hiding it must NEVER delete saved configs. No other control anywhere chooses what Chrome shows.
- Native Chrome projection is one deterministic collision-safe menu from saved Show state: only Simple; only Narrow; both; only Depth enabled display buckets; All; or Flat. If Depth Show ON but no display buckets enabled, generate zero Depth branches. No arbitrary capped display depth 10; handle actual Chrome limits with truthful overbudget status instead of silently corrupting menus.
- Flat yields a SINGLE immediate actionable **REDOWN → Cloudflare** native leaf with NO nested Cloudflare pop-out, using the exact user-designated Default Save Selection; no guessed fallback. Google Drive/Dropbox/OneDrive remain independent flat siblings, not folded into Cloudflare. A default-only Cloudflare root may also be direct when appropriate.
- One Manage Destinations pop-out (not stacked): Simple/Narrow list filter, page size 20, pagination, X removes ONLY menu config with confirmation; selecting a row edits existing immutable record/path and labels in SAME pop-out, Back below filter and Escape/cancel without save. Preserve IDs.
- Real Chrome contextMenus registration, one listener and one canonical click resolver. Implement desired / compiled / registered-ACK / observed status as separate facts, persistent across MV3 worker restart; reconcile without duplicate branches or stale generations.

## 3. Complete headless V3+1 service + agent-native architecture

Build explicit, versioned, typed public **in-process programmatic contracts** over the SAME engine used by GUI. Do not make access depend on DOM click automation or simulated menus. Add request/response schema validation, capabilities description, pagination/cursors, stable resource IDs, known reason codes, version negotiation, progress/cancellation for long operations, idempotency keys and expectedRevision/expectedGeneration optimistic fences. Actions must be individually testable without launching the GUI, but real native application requires Chrome host capabilities.

### Required headless tool families (names are suggested; schema and behaviors mandatory)

READ / INSPECT, normally local and consented:
- describeCapabilities / getEngineHealth / getProviderConnections
- listAccounts / listAuthorizedBuckets / listFolders (bounded, paginated, direct Universal File API)
- listDestinations / getDestination / inspectSavedShow / inspectFlatDefault
- previewNativeMenu / inspectMenuTree / inspectNativeGeneration / inspectNativeACK
- inspectOperation / getDiagnosticSnapshot / explainFailure / diffMenuGenerations
- listRecoveryPolicies / inspectBackupRoots / listRecoveryPoints / verifyRecoveryPoint
- inspectWholeCloudJobs / inspectWholeCloudCoverage / listSupportedAgentPermissions

CONFIGURATION, privileged with user-defined authorization:
- createDestination / updateDestination / deleteDestinationConfig (never delete cloud object)
- setDepthDisplayBuckets / setShowInChrome / setFlatDefault
- updateRecoveryPolicy / chooseBackupLocation / enableWholeCloudJob / disableWholeCloudJob
- previewConfigChange and commitConfigChange (expectedRevision, scoped identity, explicit authorization)
- requestRestorePreview / restoreRightClickMenu (higher-trust restore grant; protected replace/merge)
- reconcileNativeMenu (authorized Chrome host only, no invented ACK)

EFFECTFUL / HIGH RISK, individually approved:
- dispatchSave from real supported source/context, using exact persisted target and normal authorization, verified provider receipts; never bypass right-click pipeline, privacy or Cloudflare capability.
- deleteRemoteFile / deleteBucket / bulk cloud modification **NOT** implicitly exposed. If ever added, distinct destructive permission and per-operation user confirmation. No user agent needs these for menu setup/debug/backup.

Expose both **observed** and **effective** states, and distinguish AVAILABLE, UNAUTHORIZED, BLOCKED, UNSUPPORTED, UNKNOWN, FAILED, PARTIAL, NOT_TESTED. No agent command may synthesize a verified provider receipt. All meaningful user UI gestures and agent commands should call the SAME source-owned app service functions; share transaction and MenuSpec code, not just data shape.

### Glaciaring versus action authority

- Existing Glaciaring READ-only diagnostic API retains its sender restrictions, token/label/URL redaction, local bounded pages/receipts and no cloud-write authority. Keep simulateMenuAction explicitly simulation-only.
- Implement a SEPARATE authorized **Agent Command Gateway** invoking real V3+1 domain methods; it must not mutate through diagnostic snapshots and must not bypass authorization owner. The gateway is a thin adapter, not second engine. Both GUI and agent gateway generate identical source-owned diagnostics.
- Agent-facing scopes / grants: **inspect** (read-only redacted status), **configure** (explicitly granted scoped edits), **execute** (file save, only after authorized source/target validation), **restore** (preview and confirmation), optionally **admin/destructive** (NOT implemented by default). Connection/account scoping, expiration, revocation and least privilege enforced server-side by trusted host.
- Use schema-validated, auditable commands: capability grants bind to authenticated user/extension/origin, caller identity, requested method, exact account/namespace, time limit and optional one-action user approval. No open public localhost listener, no arbitrary external Chrome runtime message control, no reusable bearer token in logs/JSON backups, no remote code execution, no cross-account fallback.
- Always provide **dry-run/preview** for potentially surprising changes and a diff for menu changes, including account/path/Show differences. Do not allow an agent to bypass approval by replaying another call or forging a debug sender.
- Once approved, a command executes even if GUI closed, provided the trusted engine/Chrome/companion is available. If Chrome/native host is unavailable, report BLOCKED, not pretend to update a menu.

### Future ChatGPT, Codex and MCP compatibility

- Implement an **adapter-ready MCP tool schema registry** mapping stable agent tool names and typed inputs/outputs to the above trusted gateway. Versioned JSON Schema/tool descriptions should be independent of any LLM vendor, composable with future ChatGPT plugins, Codex and other MCP-capable clients.
- First deliver a **local developer CLI/JSON-lines IPC or equivalent bounded agent client** that exercises actual engine methods (inspect and authorized config) using the same schemas. With a connected native companion, a future secure local/private MCP server can host those exact adapters without moving business logic; **do not open a public MCP endpoint or Cloudflare Worker API by default**.
- If implementing a usable MCP bridge in this run, make it explicit opt-in, client authenticated, scoped to local trusted companion, disable external network bind by default, no secrets in tool results, and test unauthorized clients. Future ChatGPT connection still needs user installation/approval of plugin/connector and supported transport; never claim ChatGPT is already directly connected.
- Agent tool discovery / capability manifest should include build/version, schema version, error reasons, authorization required, whether action is read-only/effectful, expected host availability, and redaction level. Avoid a large hand-authored fixed command list that diverges from domain methods.
- Extensibility requirement: future native desktop app and more S3 providers use the same versioned service, permissions, and telemetry without rewriting the engine.

## 4. Real installed Chrome extension / Cloudflare OAuth / actual saves

- Manifest V3 installable unpacked folder with stable extension ID, real extension Remotes home, File Explorer and + Right Click UI; required host permissions only, strict CSP. Do not deliver a mirror-only "Glaciaring Lab" and call it product.
- Create/port Click2Cloud-specific Cloudflare OAuth Authorization Code + PKCE S256, real redirect from chrome.identity.getRedirectURL('cloudflare'), refresh if issued, generation-based refresh coordination, protected session state, clear revoked/expired behavior. The P0 owner client ID recorded in docs/CODEX_P0_SCAFFOLD_FIRST_DEBUG_API_SURROUNDS_PRODUCT.md is public-client configuration only: verify exact registered client, grants and redirect. Never copy REDOWN's installed tokens, private app keys or secrets.
- Need genuine account/bucket/folder discovery; Cloudflare Workers are live lab infrastructure, not a stand-in for an OAuth login. Existing lab Worker may have no public workers.dev route; first verify authorized management API and Worker/service path and report precise BLOCKED external prerequisites if any. Do not enable production public routes, change billing or grant scopes without user authorization.
- Test real installed Chrome native menu image/link action using disposable permitted R2 test prefix, exact authorized target, Worker TRUE REMOTE strategy where documented, real independent R2 readback; provider verified outcome gates success. Google Drive/Dropbox/OneDrive byte-upload adapters remain independently flat and should only be claimed verified if actually connected/tested; no browsing/source/page URLs sent to byte-upload providers.
- Scoped exact route resolution + source capture + provider receipt, no speculative success, no cloud write from recovery or menu preview, and no duplicate menu registration after crash/reload.

## 5. Durable Windows Recovery Mode, separate from Chrome menu visibility

Settings → Recovery Mode (NOT + Right Click) includes:
- Weekly (default Monday) or Daily historical snapshot cadence.
- Simple Recovery ON/OFF and Narrow Recovery ON/OFF independently.
- Expandable authorized buckets each Recovery ON/OFF and own unlimited-in-principle **recovery crawl depth**, independent of popup Depth **DISPLAY depth**. No app hard maximum; support paged/resumable scanning with truthful rate limiting and incomplete coverage.
- Backup Location exactly two user choices: **Automatic (default): %LOCALAPPDATA%\Click2Cloud\Recovery\**, and **Documents: actual Windows Documents known folder\Click2Cloud\Backups\**. The selected root receives ACTUAL recovery files, not merely exports. To change: copy ALL valid CURRENT/journals/backups/job state → verify checksums/readback → switch active root, preserve original on failure. Only one active root unless separately enabled secondary copy.
- External durable storage owned by authorized shared Windows native companion or user-authorized filesystem; IndexedDB/chrome.storage alone never meet uninstall-survival. No arbitrary filesystem access from unprivileged extension.
- Four independent file namespaces: menu-config (Simple/Narrow + Show/Flat), depth-config (Depth DISPLAY bucket scope/level), depth-index (verified known folder graph and completeness) and recovery-policy (schedule, toggles, recovery bucket scopes/depths), plus whole-cloud job namespace.
- Per namespace **CURRENT.json** updated atomically after EVERY confirmed relevant change, ordered append-only **journal/YYYY-MM.jsonl** deltas updated immediately (fresh file EACH month, global monotonic order across year rollover), **backups/weekly.json** pointer/copy of newest verified checkpoint and immutable dated **YYYY-Www.json** snapshots each eligible week; Daily analog **YYYY-MM-DD.json** when selected. Credentials and browsing history never in backup. Backup cadence does not throttle CURRENT/journal writes.
- Verify schema/version, checksum and account/connection identity; maintain journal tombstones and replay; separate namespaces fail independently, no cross-mode reset on damaged index. Use bounded disk retention and truthful storage pressure warnings, never silently discard history.
- No "restored" or "backed up" status until validated independent filesystem receipt and native Chrome ACK as applicable.

## 6. Restore My Right-Click Menu — required user button

Add to Settings → Recovery Mode **Restore My Right-Click Menu**, clearly separate from Save Whole Cloud. This MUST restore the existing last-saved menu **without requiring remote rescan**:
1. On empty/corrupt browser data or reinstall, authorized native companion discovers BOTH configured Windows recovery candidates; if not reachable, offer **Choose Existing Backup Folder**. Chrome extension cannot directly search Windows paths.
2. Show passive Backup Found status and restore button; do not hijack normal login or auto-overwrite nonempty working data. If both candidates exist, let user choose a valid source; preserve existing data until restore.
3. On press: validate per-namespace latest CURRENT + contiguous later journal entries; if bad, use latest valid weekly/daily dated snapshot + verified post-checkpoint deltas. Older snapshot can be user selected to undo accidental deletions; never silently resurrect intentional removal.
4. Restore exact destination IDs, Simple labels/order, Narrow ancestors/aliases, Depth display bucket depth, Depth cached folder graph, popup Show choice, Flat target, Recovery Mode settings to canonical IndexedDB via safe transactional generation fence. Recompile one MenuSpec and REGISTER ACTUAL Chrome contextMenus with ACK. Target is **immediate local restoration** without full cloud listing.
5. Missing provider OAuth is not a reason to erase visible recovered configuration: show disconnected/pending-reconnect and BLOCK any save to unverified account. Next NORMAL successful login to the SAME account silently revalidates saved routes without requiring another restore. Do NOT claim live cloud saving until authorized.
6. Glaciaring explains recovery source, integrity, config restored, native generation/ACK and provider auth independently. Test cache corruption, uninstall/reinstall with external backup, stale index, two candidate roots and missing/corrupt CURRENT.

## 7. Save Whole Cloud — one-time activation, silent lifelong outline backup

At the BOTTOM of Settings → Recovery Mode, BELOW normal backup controls, add:
- A multi-select connected **Clouds** dropdown listing all authorized Cloudflare R2 accounts and other actually supported S3-compatible connected accounts, each by exact connection/account ID. All/Clear selection; not limited to Depth display/recovery selected buckets.
- **Save Whole Cloud** button. Clicking ONCE activates one independent authorized **READ-ONLY full account metadata/key/folder outline** job per checked cloud. No cloud object bytes. No app depth cap or total duration limit. It may take 5, 50, or more weeks. It continues forever after initial completed traversal, quietly refreshing weekly by default or daily if configured, so one complete export does NOT stop the job.
- Capture each bucket and key/prefix, all paginated provider listings, cursors/frontiers, incomplete ranges, timestamps, account-specific revisions and integrity. Durable incremental checkpoint/journal outside Chrome, bounded RAM/network/disk; reuse valid known data but never mistake a partial scan for complete or assume a frozen point-in-time cloud. Do not throttle user right-click saves or login; prioritize interaction.
- Dated immutable export names preserving actual scan week/year range: **backup-cloudflare-week45-2026.json**, **backup-cloudflare-week45-50-2026.json**, **backup-cloudflare-week52-2026-to-week03-2027.json**. Other S3 provider names and same-name account discriminator included; avoid collisions, and each further completed refresh writes another distinct dated revision. Partial exports clearly labeled PARTIAL. Huge accounts can use chunked JSON with portable manifest/checksums.
- Silent automatic auth lifecycle: use already-authorized access; silently refresh token only where consent/grants permit. Lost OAuth = account job PAUSED_AUTH with all verified knowledge preserved; **never open a popup, login dialog, nag, badge, toast or notification because of this backup**. On the user's next NORMAL successful login to the SAME matching account, quietly revalidate read/list scopes and RESUME from saved frontier, no extra button click. Wrong account must NOT inherit job; explicit Stop/disconnect/opt-out prevents automatic resume. No auto-consent or privilege escalation.
- If Chrome/companion closed and scheduler cannot work, record due/missed status and catch up next opportunity; do not claim endless active execution without a running scheduler.
- This feature is read-only metadata knowledge, never actual file content restoration or an excuse to change Cloudflare bucket configuration.

## 8. Delivery sequence (do actual engineering, not a proposal-only run)

**M1 — Honest baseline (brief).** Record actual sources present/absent on branch and limitations, map scaffold requirements to existing modules. Don't spend the run auditing for days. Remove old docs/UI assumptions, particularly separate Explorer hierarchy toggle and single selected mode. Glaciaring inspection stays intact.

**M2 — Real composable core and headless service.** Canonical stable config with mode-isolated state, saved Show toggles, Flat target; pure combined compiler, exact action resolver, shared GUI/agent service functions; persistence transactions and native registrar adapter.

**M3 — Real MV3 product.** Working Remotes, File Explorer, one three-tab + Right Click popup with Show above Save, local folder actions, manager, real Chrome contextMenus with verified ACK and MV3 restart. No HTML-only native menu success.

**M4 — OAuth and provider path.** Click2Cloud OAuth registration/redirect and real account/bucket/folder lists; actual authorized Worker/R2 save to disposable lab prefix with independent readback. Report precise owner consent/OAuth-registration dependency if blocked.

**M5 — Filesystem backup + fast restoration.** Shared companion interface, both Windows roots, CURRENT/monthly journal/weekly/daily snapshots, recovery policies and **Restore My Right-Click Menu** from last valid CURRENT into IndexedDB and actual Chrome ACK without full cloud crawl.

**M6 — Save Whole Cloud.** Multi-provider selection, durable endless read-only crawling, resumable after restarts/OAuth loss, silent reconnect after normal login, weekly/daily forever, dated account-safe exports, bounded resource use. If only a subset of provider adapters is present, implement clear supported/unsupported capabilities without claiming all connected providers tested.

**M7 — Secure agents.** Full typed headless API and local client; preserve Glaciaring observer; separate authorized command gateway with scoped permissions, safe preview/commit and real-engine dispatch; MCP schema/adapter readiness. End-to-end tests of inspection, approved edit, rejection of unauthorized edit, protected restore and real Chrome menu sync. External ChatGPT plugin installation is NOT required to pass first-party API acceptance, but the engine interface must be adaptable without rewriting.

**M8 — Focused cross-layer acceptance.** Real Chrome install/menus/restarts, auth, live provider readback, multi-account collision and wrong-account rejection; exact Flat, Simple/Narrow/Depth/All, no explorer hierarchy button; popup drafts vs Save; file-scoped recovery and restore after reinstall; 2-week+ whole cloud simulated resume chronology plus live limited provider pages; no login nag; diagnostics parity and resource budgets. Do NOT run the old 1,000-scenario initiative.

Deliver implementation code, package/build location, actual test commands/results, event receipts, known BLOCKED external prerequisites and exact changed paths. Do not claim features tested without proof. If a full requirement is technically blocked, implement independently available work and state exact missing consent/capability/host fact.

## 9. Engineering invariants / pitfalls to eliminate

- Menu visibility lives **ONLY inside + Right Click popup**. NO Explorer hierarchy button. Recovery Mode controls backup, not Chrome Show selection.
- Saving destination ≠ showing destination; display ON/OFF does not delete user work.
- Depth DISPLAY and Depth RECOVERY depths are separate per-bucket settings, each unlimited in schema (resource-bounded reality and Chrome native limitations must be truthfully reported).
- Default Simple/Narrow coexist; direct Flat = one actionable Cloudflare leaf, exact designated folder, no Cloudflare submenu.
- CURRENT + journals are continuously updated; weekly/daily controls dated recovery checkpoints only.
- Whole Cloud activation is ongoing silent subscription with no set completion date, rather than one-shot finite export. Completed dated capture is a historical checkpoint.
- Reinstall menu restoration is local-file IndexedDB rehydrate → native Chrome apply, not "wait for full cloud scan".
- Lost auth never triggers surprise backup prompts, and backup never grants more cloud scopes than user approved.
- No cross-account rebinding, no guessed folder path, no destructive remote action during menu edit, backup or recovery.
- Glaciaring is read-only observer; authorized agent command gateway uses real same engine methods. No exposed public debug service, tokens or unbounded command interface.
- Use correct Chrome/Cloudflare/provider constraints verified against actual API and receipts, not optimistic assumptions.
- Documentation is a specification, not evidence of a working product.

## 10. Completion report format

A. Commit/branch and changed paths.
B. Installable Chrome extension exact folder and reproducible build command.
C. What actually works in REAL installed Chrome + screenshot/trace/ACK evidence.
D. Real OAuth status, exact callback URI if owner must register it, actual R2 readback receipt.
E. One-click restore from CURRENT test (external folder → IndexedDB → native Chrome ACK).
F. Whole Cloud status and same-account reconnect/resume proof or clearly blocked status.
G. Agent service methods and auth gate proof; Glaciaring inspection parity; MCP adapter status (ready vs actually connected).
H. PASS / FAIL / BLOCKED / NOT TESTED per scaffold journey; missing user actions to unblock.
I. No claims of production deployment, public endpoint, ChatGPT connector installation or all-provider support without direct proof.

**END STATE:** The user has a genuine Click2Cloud extension using one agent-ready V3+1 engine and one Universal File API, with native right-click saves, a durable GUI/menu configuration, true external recovery, quiet continuous metadata backup and deep source-owned Glaciaring diagnostics. The same authorized engine commands are programmatically callable by future local agents, Codex, ChatGPT plugins or MCP clients without building a second engine.
