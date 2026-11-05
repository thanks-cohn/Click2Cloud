# FOREVER WORKS — Codex Execution Contract: Reconstruct Click2Cloud from REDOWN's Proven CURRENT/V3 Boundaries

**Date:** 2026-11-05  
**Target repository:** thanks-cohn/Click2Cloud  
**Reference repository:** thanks-cohn/REDOWN (READ ONLY)  
**Pinned REDOWN source:** 0fe8f7dce301027ad53e1958e037b82652c57088  
**Precondition:** Read [REDOWN_CURRENT_V3_SOURCE_EXTRACTION_2026-11-05.md](./REDOWN_CURRENT_V3_SOURCE_EXTRACTION_2026-11-05.md) in full before changing code. It defines SOURCE vs OWNER-NEW vs TARGET/GAP.  
**Other required references:** [Click2Cloud runbook](../docs/CODEX_AUTONOMOUS_V3P1_RUNBOOK.md), [complete behavioral contract](../docs/V3P1_COMPLETE_CONDITION_TO_BEHAVIOR_CONTRACT.md), and [owner's latest fast-mode/marker note](../NEED_TO_DO/2026-11-05_INSTANT_SIMPLE_NARROW_DEPTH_SWITCHING.md).

**This document is a work request and correctness contract, NOT a claim the functionality has been delivered.**

## A. Nonnegotiable product semantics (newest owner decision wins)

### What the menu does

- REDOWN is the root native Chrome context-menu heading.
- Eligible providers appear as independent children, not hidden under one another.
- **Cloudflare R2 is TRUE REMOTE.** On a right-click it transmits the selected source URL + exact authorized destination to the user's matching Cloudflare Worker, which fetches the bytes from the internet and stores them in R2. It does not download the source bytes through the user's browser for the existing TRUE REMOTE operation.
- **Drive/Dropbox/OneDrive remain flat leaf siblings**, each using their own authenticated browser-mediated file-byte upload and verified result (no webpage provenance sent to provider APIs). Never pass these through the Cloudflare menu compiler.
- An emitted menu ID is a request to an exact authorized action. Do not infer routing from the visible label, last-clicked bucket, stale cache, or global default on a failed lookup.

### The three modes (selection logic only; transport never changes)

**Simple** = user selects a single authorized cloud location and marks it Simple. Chrome receives **REDOWN → Cloudflare** as one actionable flat leaf; clicking it TRUE REMOTE saves to the exact marked account/bucket/prefix. With no marker, use uniquely authorized default lowercase redown root. Other configured locations do not automatically turn Simple into a submenu.

**Narrow** = user manually configures many eligible destinations and custom menu labels. Chrome displays a natural nested hierarchy of those configured paths and necessary ancestors, including Save here at a selectable parent that has children. Unconfigured directories do not appear. This is the **simple nesting option**.

**Depth** = using cached canonical discovered folders, display authorized paths up to the selected depth, including eligible paths not explicitly configured. Distinguish confirmed/partial/incomplete nodes and never advertise stale authorization.

Selecting any mode must not mutate the other two mode configurations or perform an unsolicited remote listing. **Mode selector click-to-visible state target: p95 <100 ms on warmed valid local data, measured, not assumed.** Native Chrome registration may finish asynchronously; do not say Applied until matching ACK.

## B. Existing Click2Cloud state — do not confuse scaffolding with completion

Source-verified current files:
- src/core/menu-compiler.mjs: pure compileMenu(mode,bucket,folders,config,flatProviders); currently eagerly normalizes all folders even for Simple, emits Cloudflare as a menu wrapper, and uses repeated child scans for nested modes. It needs identity, performance, and owner semantics review.
- src/core/save-dispatcher.mjs: dispatchSave currently requires file.bytes to be a Uint8Array and calls provider.upload(bytes). **This is incompatible with TRUE REMOTE Cloudflare!** Do not send every Cloudflare save through this byte-only interface.
- src/explorer/index.mjs, file-api.mjs, configuration.mjs, r2-adapter.mjs: actual extracted REDOWN Universal File API modules, require injected trusted background message transport and authenticated HTTP; reuse rather than writing a second explorer API.
- src/dashboard/controls.mjs and src/dashboard/redown-bridge.mjs: extension-hosted UI/transport scaffold; bridge deliberately rejects privileged activation from an unauthorized standalone dashboard page. Preserve its fail-closed sender verification.
- dashboard/ and tests/: partial Portal/fixture harness. Tests and an isolated Cloudflare lab build do not automatically prove installed Chrome menu registration or live user-authenticated R2 TRUE REMOTE.
- wrangler.toml targets an isolated Click2Cloud lab Worker. **DO NOT modify/replace any REDOWN production Worker or customer bucket.**
- REDOWN V3 source is read-only until explicit post-acceptance transplant authorization.

## C. Required module boundaries

Keep a single authorized canonical service, not a pile of duplicative modes, alternate engines, or source-specific hacks:

    Cloudflare auth + Worker capabilities
       -> provider-account-bucket identities
       -> versioned CURRENT IndexedDB graph + journal/backup
       -> immutable normalized snapshot + per-mode config
       -> deterministic compiler producing MenuSpec + exact SaveIntent
       -> Portal renderer and Chrome native registrar
       -> click-time reauthorization and provider-specific dispatcher
           |-> Cloudflare R2 TRUE REMOTE Worker ingest (URL control only)
           |-> Drive/Dropbox/OneDrive browser-byte upload adapters
       -> provider-confirmed receipt -> History/counter/success

Each mode is a presentation over the same authorized canonical destination graph, with separate preferences. Preview and production Chrome renderer must agree on exact effective action IDs, titles, scope and ancestry. No fake Portal that draws menus without actually saving.

### Contract-level interfaces to design, not necessarily exact public signatures

- readCurrent(scope?) -> {version,profiles/identities,configuredDestinations,folderIndex,modeConfig,desiredGeneration,appliedGeneration}; may return incomplete/stale flags; NEVER return secret tokens to UI.
- setSimpleMarker({profileId,accountId,bucketName,prefix}, expectedRevision) -> atomic config update with explicit account identity, no delete or cloud side effects.
- projectMenu(snapshot, mode) -> pure {nodes,actions,complete,warnings,generation}; Simple requires no full directory scan; Narrow proportional to configured entries; Depth uses indexed child adjacency.
- registerNative(plan, expectedGeneration) -> Chrome create/update/remove ACK plus stale-generation rejection; preserve root and management recovery on failures.
- resolveClick(actionId, latestCurrent, auth) -> exact, current and permission-checked destination with transport strategy; stale or revoked IDs return a typed rejection.
- dispatchTrueRemote({sourceUrl,destination,filename}, auth) -> trusted Cloudflare Worker URL-based ingest, returning a receipt only after R2 HEAD/byte/identity verification. **The browser must not prefetch full bytes.**
- dispatchBrowserBytes({sourceReference,destination,filename}, providerAuth) -> browser fetches bytes and uploads through appropriate non-Cloudflare adapter with source URL excluded from provider payload.
- recordOutcome({attempt,verifiedReceipt,uncertainty}) -> no counter/success animation until authoritative verification, idempotent by delivery ID.

These are *behavioral interfaces* for Codex to map to existing code. Avoid gratuitous public API or file reorganizations when existing tested functions already satisfy the contract.

## D. Canonical CURRENT / JSONL extraction tasks

1. Reuse semantics from REDOWN extension/right-click-current.js: state, records, journal, pointers, dated backups; single logical transaction for config/record/journal/generation; namespace by provider/account/bucket/endpoint; no plaintext secrets in exports.
2. Scope reads and writes to actual changed rows rather than copying every directory record on a presentation-only toggle; keep atomicity, crash consistency, generation version and backup semantics.
3. Keep a derived versioned JSON snapshot (the REDOWN key right-click.json is not a standalone runtime CURRENT.json file), but IndexedDB CURRENT remains canonical. Cache misses read CURRENT; stale/invalid JSON cannot override revoked credentials.
4. Protect partial directory observations. A scan that times out or returns a partial page never deletes unrelated previously verified rows, nor falsely says full inventory is complete.
5. Keep daily/weekly/off policy, journal continuity, and optional encrypted owner backup with restore validation. An import does not grant OAuth or Worker secrets.
6. A file appearing in several accounts/buckets must have distinct canonical identities despite identical folder names or menu labels.
7. Directory updates are incremental deltas after verified provider mutations; no gratuitous full-scan every mode switch.

## E. Pure menu compiler tasks

### Simple (must be the *fastest* path)
- Build single actionable Cloudflare node under REDOWN from one validated Simple marker/default. Do not synthesize an intermediate Cloudflare submenu, redown child or Home leaf.
- Do not traverse full folders, compute Depth inventory, or block on TTL when showing Simple.
- Keep user Menu Label as saved metadata for the destination (use in setup/Narrow where needed), while preserving the native provider label **Cloudflare** for flat Simple.
- Support changing the marker without deleting Narrow routes, resetting Depth preferences, provisioning cloud files, or inventing account scope.

### Narrow
- Build a canonical trie/parent-child map from *only* user-configured paths.
- Preserve exact configured label and action ID; ancestry auto-generated only as needed; collision prompts and Save here leaves.
- No remote folder reads required merely to switch to Narrow if known authorized configured paths remain valid.

### Depth
- Use a pre-indexed adjacency/parent map of authorized discovered nodes keyed by namespace and normalized path. Avoid repeated pathSet scans and nested quadratic loops when growing huge trees.
- Respect selected depth and actual folder names, including eligible unconfigured folder paths, per-bucket participation.
- Bound native plan to Chrome limits; report if incomplete. Reuse previously indexed nodes even when TTL expires for a background refresh, subject to real authorization and staleness checks; do not treat stale observation as current permission.
- Do not use Depth cache freshness as a reason to block Simple/Narrow.

### Cross-mode independence
- A mode switch is a pure, local projection; only the chosen mode is shown. Repeating the same mode with same canonical snapshot gives the same MenuSpec/action IDs.
- No changes to cloud files, R2 activation, provider credentials, global default or other mode configs on a mode switch.
- Script/apply registration is distinct from selection. Stale native menu generations cannot dispatch another mode's action.

## F. Chrome native integration and responsive switching

1. Register root and Manage destinations upfront before any directory discovery. Never wait for the right-click event to build an entire menu tree.
2. Use native contextMenus API callbacks to establish success/error. Invalidate only changed items; preserve root and control entries on failure. In-place labels can use update; structural reordering may need carefully ordered remove/create.
3. Maintain desired/applied generation and current plan fingerprint. No false green Saved/Applied when native create/update/remove failed or timed out.
4. Dedupe concurrent storage.onChanged, worker wake, alarm and mode-change rebuild triggers. Do not block editor click feedback on serialized native registration. Preserve actual chronological edit intent when user rapidly toggles Depth → Simple → Narrow → Depth.
5. Read local CURRENT snapshot first; project Simple/Narrow synchronously/microtask-fast where possible. Discovery is explicitly separately initiated or scheduled for Level; background refresh can publish a newer generation without freezing the editor.
6. Keep service worker boot/recovery predictable. On startup, use safe base-menu access + last authorized snapshot, reconcile registration and recover after partial state errors.
7. Keep SOURCE-WITNESSED Chrome callback constraints and native hierarchy maximum; do not claim every arbitrary deep tree fits the system menu.

**Required timings:** instrument event start, UI painted, CURRENT read, normalize/index/compile, native plan diff, Chrome callback ACK, refresh start/end, and whether actual cloud discovery happened. Report p50/p95 across >30 warm switches and cold worker cases for each direction and realistic folder counts.

## G. Cloudflare TRUE REMOTE security and receipt contract

This is the defining Cloudflare branch. Source pinned: REDOWN extension/background.js Worker checkedFetch (209–225), remote ingest (653–729), background ingest+verification (2038–2108), and Chrome click (2934–3030).

**Require an explicit transport strategy** (for example, transportKind=trueRemoteUrl for Cloudflare, browserBytes for Drive/Dropbox/OneDrive). The strategy is determined by provider/capability, not Simple/Narrow/Depth.

TRUE REMOTE steps:
1. User picks one native Cloudflare action on a supported image/link/media/page URL (srcUrl before linkUrl before pageUrl), or equivalent authorized Portal context.
2. Trusted controller reads exact destination identity and validates HTTPS; checks approved profile/Worker before issuing a control request with the source URL and exact target bucket/prefix/name.
3. Prepared authorized Worker validates bearer secret, HTTPS/private-host/redirect safety and source response, then fetches the original source remotely. The browser remains out of the file-byte path.
4. Worker stores bytes in R2 via stream/length-bounded body where possible; unknown-length source may require bounded buffering. Apply explicit limits, memory/timeouts and honest unsupported-source errors.
5. Choose Keep Both safely; verify exact returned key is under selected folder; re-read R2 HEAD/metadata and compare size/ETag/source metadata with live auth session before completion.
6. Only then record a new verified successful delivery, counters, History/GO TO and success flash. If upload outcome uncertain, keep 'may exist' and inspect before retry; never duplicate blindly.
7. **Privacy:** Cloudflare's Worker receives sourceUrl to fetch and currently stores it in R2 object custom metadata. That is NOT the same as browserBytes providers, which must not receive original source URLs. Do not advertise zero-URL disclosure for true remote. Never forward login cookies or raw browser headers to public source servers or other providers.
8. Fail clearly if source requires browser cookies/authentication, is not public HTTPS, has unsafe redirects, is too large for Worker/provider budget, or blocks remote fetch. Do not silently substitute browserBytes and still label it TRUE REMOTE.

**Limits are not unlimited:** REDOWN embedded Worker historically defaults to 300 MiB MAX_BYTES when not configured; stream sizing and unknown-length buffering remain constraints. Click2Cloud may improve the protocol only with measurement and compatibility proof, not by removing checks.

## H. First-run/activation/provider behaviors to preserve

- One explicit authorized Cloudflare login, selected account and matching R2 capability; use existing OAuth and scoped permissions. Login alone is not a save.
- Reuse/create lowercase redown bucket only as authorized by existing first-run/activation contract. Never delete/recreate nonempty buckets or assume Cloudflare billing accepted.
- Bucket profile ties actual R2 STORAGE binding, Worker endpoint and credentials to one exact account/bucket. Worker health/capability checks are not optional labels.
- Refresh is a read; Activate Buckets is a privileged, separately confirmed operation. Infrastructure activation MUST NOT silently add unintended Simple/Narrow/Depth menu destinations.
- Other cloud providers are independent authenticated flat siblings; do not pass their source URL as provider metadata. On provider auth/signout changes, only affect authorized provider menu fragments and relevant save intents.
- User-facing cloud GO TO and History/counters are evidence-driven; menu refactors must not introduce false success or remove existing navigation.

## I. Mandatory test and acceptance matrix

Write/port automated tests and present results **with exact commands, environments and current run evidence**, not merely references to old REDOWN logs:

1. **Compiler:** deterministic output; default Simple direct Cloudflare leaf; marked Simple exact subfolder; no extra Simple menu options; Narrow configured-only multi-route labels; Depth includes allowed unconfigured; collision, cycle, disabled ancestor, same label across accounts.
2. **CURRENT:** rollback on fault-injected transaction failure; journal per semantic change; no changes on identical snapshot; daily/weekly/off; concurrency in two windows; auth revocation; stale JSON/backup; session restart; pointer native acknowledgment on matching generation.
3. **Performance:** each of six direction transitions among Simple/Narrow/Depth, including change Depth 1/10; 0/100/5,000 cached folder nodes; 0/5/200 configured routes; 30+ iterations warm and cold; no network calls on warmed mode switch. Report click → UI p95 and registration time separately.
4. **Native:** installed Chrome MV3 right-click submenu UI (not only DOM mocks); update/create/remove ACK, worker restart, missing IDs, reorder, duplicate IDs, malformed parent graph, root/Manage preserved, no stale unauthorized save.
5. **TRUE REMOTE:** controlled public HTTPS source reachable from Worker, actual URL-control POST, Worker remote fetch, byte-accurate verified R2 object/size/metadata, no local browser asset fetch or download, exact prefix, Keep Both, bad URLs, private host, redirect, auth expiry, unsafe/cookie-gated targets, unknown-length source, capped size.
6. **Other providers:** one Google Drive/Dropbox/OneDrive sibling, no nested Cloudflare ownership, real byte upload contract where authenticated, no source provenance, exact receipt and failure lifecycle.
7. **UX:** keyboard/focus in editor, Add/Rename/Delete/Undo, Save Changes vs Apply status, rapid mode switching, deep links/management, permissions denied, missing worker, stale cache.
8. **Security and correctness:** stable one-use click intent on overflow if still necessary, no silent fallback to another destination, no secrets in logs/backups, bounded resource consumption.
9. **Compatibility:** compare REDOWN current source projections against extracted Click2Cloud except where OWNER-NEW explicitly overrides; run a side-by-side behavior table and explain every intentional difference.
10. **Evidence ladder:** distinguish static extraction, mocked unit tests, real installed-Chrome native menu, live Cloudflare Worker receipt, and independent byte verification. Never call a Cloudflare build green if browser/Worker tests were blocked.

## J. Staged workflow, stopping conditions and deliverables

**Phase 0: Audit** REDOWN pinned commit; inventory Click2Cloud current files; run baseline tests; produce a concise KEEP/ADAPT/REJECT map and small, reproducible traces. Read license/third-party boundaries. Do not rewrite modules prematurely.

**Phase 1: Canonical graph and compiler** with one effective Simple marker, Narrow trie, Depth indexed projection, deterministic identities and unit tests. Preserve extracted Universal File API as the file-operation boundary.

**Phase 2: Native menu and CURRENT** deterministic snapshot, journal/backup, high-speed transitions, safe Chrome registrar, sender-checked configuration and restoration.

**Phase 3: TRUE REMOTE Cloudflare transport** through existing Worker protocol, with a separate verified browserBytes dispatcher for other providers and honest uncertain outcomes.

**Phase 4: Real Portal / R2 / Chrome acceptance**; versioned migration+rollback plan; reproducible screenshots/recordings and access-safe lab results. Only authorized disposable prefixes may receive test writes.

**Phase 5: Hand back for explicit review**. Do NOT touch thanks-cohn/REDOWN production files, deploy to production Workers, or merge a REDOWN PR without new authorization. Keep this as a Click2Cloud development/verification track.

**Required deliverables:**
- Source-to-target file/function mapping and KEEP/ADAPT/REJECT decisions.
- A real implementation (when Codex is separately launched for it) with focused commits and tests, not a revised speculation-only document.
- TRUE REMOTE Cloudflare side-by-side proof, native Chrome proof and transparent unverified items.
- Exact measured mode performance, no regressed default and no stale save routes.
- Commit SHAs, CI/test results, controlled Worker receipt, safe rollback and residual risk list.

**Completion rule:** The Click2Cloud V3+1 engine may replace REDOWN V3 only after it can demonstrate that **Cloudflare TRUE REMOTE still means Worker-fetch→R2**, the three newly specified mode semantics are correct and near-instant using populated CURRENT, multi-cloud siblings stay isolated, actual Chrome menus work, and the target file is provider-verified. Passing mocks alone is insufficient.

**END — Codex-ready contract; not a completed implementation.**
