# Click2Cloud Right-Click Engine and Menu Configuration — Source ↔ API Documentation

**Documentation contract and current-source map | November 7, 2026**  
**Applies to:** Click2Cloud's own Simple / Narrow / Depth engine, Quick Select, Default, the native Chrome context menu, destination configuration and right-click save dispatcher.  
**Scope boundary:** The REDOWN repository is a **read-only functional reference** for useful right-click transfer and File Explorer capabilities; **Click2Cloud owns its menu system and configuration rules**. This does **not** authorize copying all of REDOWN.  
**Historical evidence baseline:** Click2Cloud `main` at `34eb3f56ccbbc51c45ee9711e0b99e492ed98e16`. **Current restoration source:** `9e8a16d09a53bb1b414d5fd1e34a190a3861160d`; sections 4–5 describe its repaired behavior. Source was inspected, but **the source map is not a claim of installed-Chrome verification or comprehensive runtime-test coverage**. Read latest source again before implementing or declaring verified.

## 1. Owner's non-negotiable documentation requirement

**Every meaningful right-click-engine and menu-configuration function MUST have documentation explaining how it really works, explicitly referencing its corresponding typed API operation.** The documentation is part of the contract, not optional commentary or a one-time architecture overview.

Each mechanism MUST have a traceable record answering all of:

1. **Trigger**: Which GUI button, Chrome native menu item, API call, or internal event starts it?
2. **API**: What is the exact versioned `3+1.1` API method, scope, input schema, output schema, authorization and confirmation requirement? If internal-only, which public/trusted API operation owns it, and why is there no independent user action?
3. **Implementation**: Which exact source file, function and branch handle the request?
4. **Inputs and precedence**: What menu mode, state, account, target, generation, visibility, Quick, Default, authorization and inventory data are read?
5. **IF / THEN / ELSE**: What are the exact decisions, branch order, deduplication rules, default rules and fallback/error conditions?
6. **Mutations and external effects**: Which persisted settings, native Chrome menu entries, remote objects, receipts or History records change? Which remain unchanged?
7. **Observable result**: What can API callers inspect afterward? Which native rows, labels, targets, roles and parent IDs should exist? What error codes and retry/reconciliation behavior are expected?
8. **Evidence**: What tests and *actual* Chrome/provider observations confirm the behavior, and which areas are NOT TESTED/BLOCKED?
9. **Change history**: Which committed source changes modify the behavior? When a rule changes, is the affected API contract, source documentation and CURRENT behavior map updated in the **same changeset**?

**One source of truth:** GUI and Chrome registrations are projections of the same state and canonical engine/API. Do not maintain contradictory narrative documents or generate an alternative engine from these docs.

## 2. How the current installed-extension path is wired (source verified)

```text
Destination manager (extension/app.mjs)
    └── trusted message {channel: "engine", version:"3+1.1", method, params}
        └── extension/background.mjs: trusted sender check
            └── src/api/service.mjs: createEngineApi().invoke(request, actor)
                ├── schema + scope + per-account authorization checks
                ├── src/api/config.mjs: applyConfigChanges(state, changes)
                ├── src/persistence/current-store.mjs: commitProduct(...)
                └── reconcile()
                    └── src/core/engine.mjs: compile({mode:"composite", ...})
                        └── src/core/menu-spec.mjs: compileMenuSpec(...)
                            ├── src/modes/simple/index.mjs: project(...)
                            ├── src/modes/nested/index.mjs: project(...)
                            └── src/modes/depth/index.mjs: project(...)
                        └── src/core/engine.mjs: apply(spec)
                            └── src/chrome/registrar.mjs:
                                generateChromePlan(spec) → removeAll → create
                                → native ACK / persisted generation
```

```text
Actual Chrome context-menu click
    └── src/chrome/registrar.mjs: onClicked → handleClick(...)
        ├── verify current acknowledged generation and authorization
        ├── src/core/action-resolver.mjs:
        │   resolveMenuAction(...) to select the intended target/action
        └── extension/background.mjs: dispatch
            └── src/core/engine.mjs: save(...)
                ├── provider/setup action (only if menu row demands it)
                └── verified remote-save / provider transfer path
                    └── completion, receipt and History only after confirmation
```

**Do not infer native rendering from an API acknowledgment.** The registrar distinguishes generated plans, Chrome ACKs and independently observed rendering. If tests cannot inspect the installed Chrome menu, report the rendering as **NOT VERIFIED**, not PASS.

### Current source ownership

| Module | Responsibility | Corresponding API (or owning API method) |
| --- | --- | --- |
| `src/api/service.mjs` | Typed registry, request validation, authorization/confirmation, configuration and save dispatch | All listed `3+1.1` methods; `describeCapabilities` enumerates the tools |
| `src/api/config.mjs` | Product preferences, validated change types, Default and Quick persistence mutations | `previewConfigChange`, `commitConfigChange`, `getConfiguration` |
| `src/persistence/current-store.mjs` | Authoritative durable configuration, revision/idempotency journal, desired/applied generation | `commitConfigChange`, `getConfiguration`, `getEngineHealth`, `inspectNativeACK` |
| `src/modes/simple/index.mjs` | Simple configured, non-hidden leaf destinations and `quick` projection | `listDestinations`, `previewNativeMenu`, `previewConfigChange` |
| `src/modes/nested/index.mjs` | Narrow (internally `nested`) path projections, hidden levels, Save here branches | `listDestinations`, `previewNativeMenu`, `inspectMenuTree` |
| `src/modes/depth/index.mjs` | Inventory-derived bucket/folder tree to configured maxDepth | `getConfiguration`, `previewNativeMenu`, `inspectMenuTree`, `commitConfigChange` |
| `src/core/menu-identity.mjs` | Target/scope identity, canonical prefix, availability, stable IDs | All configuration, menu-inspection and save APIs through their owning engine |
| `src/core/menu-spec.mjs` | Single production composite projection: Default, Quick, provider entries, flat/submenu, deduplication, omissions | `previewNativeMenu`, `previewContextMenu`, `inspectMenuTree`, `previewConfigChange` |
| `src/core/engine.mjs` | Compile, persist desired generation, register, resolve, authorize and dispatch saving | `reconcileNativeMenu`, `dispatchSave`, `dispatchExplorerSave`, `invokeProviderAction` |
| `src/chrome/registrar.mjs` | Chrome native registration, validation, ACK/generation, native click and observed rendering | `inspectNativeACK`, `reconcileNativeMenu`, `previewNativeMenu` |
| `extension/background.mjs` | Chrome service worker, permission boundary, API host, native-to-engine save wiring | Trusted `3+1.1` API host; right-click dispatch and provider authorization |
| `extension/app.mjs` | GUI for manager, Quick/Default/edit/delete, Simple/Narrow/Depth preferences and preview | Calls `commitConfigChange`, `previewNativeMenu` and other corresponding methods |
| `11.2026/workings/right-click-workings.json` | Preserved actual baseline and CURRENT IF/THEN/ELSE rule-to-proof map | Evidence for the full GUI → API → code → Chrome contract |

**Important distinction:** `src/core/menu-compiler.mjs` also exists as a pure menu compiler. The production engine source reviewed here imports `compileMenuSpec` from `src/core/menu-spec.mjs`. Any future work MUST trace all imports and tests before deciding whether the other compiler is legacy, compatibility, or independently used. Do not let it become a second native-menu authority.

## 3. Exact typed API contract — current `src/api/service.mjs`

The API is a **trusted local, versioned** service (`version: "3+1.1"`). It is *not* an arbitrary network server or unrestricted public extension API. Requests enter the service worker through an authenticated/trusted sender or a specifically authorized agent gateway.

Example trusted request shape:

```json
{
  "version": "3+1.1",
  "method": "previewNativeMenu",
  "params": {}
}
```

Response envelope defined by the service:

```text
{
  version: "3+1.1",
  state: "completed" | "partial" | "blocked" | "failed" | "uncertain" | "cancelled",
  code: string,
  data?: ...,
  diagnostic?: ...,
  receipt?: ...
}
```

**All methods below are *actual registry entries* at the reviewed source commit; they are not proposed imaginary endpoints.**

| API method | Scope | What it exposes or changes |
| --- | --- | --- |
| `describeCapabilities` | inspect | Versioned tool registry, explicit implemented/blocked provider capabilities |
| `getConfiguration` | inspect | Current product state, mode configs, Default, show flags and generations |
| `listDestinations` | inspect | Paginated Simple/Narrow configured destinations (`narrow` maps to `nested`) |
| `previewConfigChange` | configure | Validates candidate changes, shows resulting configuration and menu diff **without committing** |
| `commitConfigChange` | configure | Validates and commits config transaction with expected revision and idempotency key, then attempts native reconciliation; returns new state and native/backup outcome |
| `previewNativeMenu` | inspect | Recompiles canonical logical menu from current state and inventory |
| `previewContextMenu` | inspect | Context-specific logical menu; reports whether an acknowledged native generation was available |
| `inspectMenuTree` | inspect | Paged inspection of one retained menu generation and its omissions |
| `inspectNativeACK` | inspect | Current desired/generated/applied/acknowledged generation, row ACKs and independent observation coverage |
| `reconcileNativeMenu` | configure | Explicitly reapply the current menu when expected generation agrees |
| `getEngineHealth` | inspect | Revision, generation and native evidence/coverage |
| `getOrganizationSuggestion` | inspect | Suggestion to organize a crowded top-level menu |
| `dispatchSave` | execute | Source and menu item/generation through the canonical engine; explicitly authorized/confirmed, operation idempotency |
| `dispatchExplorerSave` | execute | Explorer source through the canonical engine where supported; must not claim unsupported source/transport capability works |
| `invokeProviderAction` | execute | Authorized provider action or selected canonical provider row; confirmation and reserved operation required |
| `inspectRemoteHistory` / `inspectRemoteReceipt` | inspect | Provider-backed outcome inspection; do not confuse readiness probe with a real remote save |
| `openRemoteResult` | inspect | Inspects a recorded verified receipt to navigate to its saved object |
| `loginBegin` / `loginStatus` / `disconnect` | auth / inspect | Provider lifecycle under existing human-consent and trusted-actor rules |

`toolRegistry` in `src/api/service.mjs` is the authoritative **machine-readable method/schema catalog**. Documentation MUST stay synchronized with its definitions and the actual `invoke` handler branches.

### Current configuration change vocabulary

`src/api/config.mjs` defines:

```text
createDestination(mode,target,label?,levels?)
updateDestination(mode,id,label?,levels?,hidden?,quick?,order?)
deleteDestinationConfig(mode,id)
makeDefault(target)
clearDefault()
setShowInChrome(show)
setDepthDisplayBuckets(scopes)
setProviderPlacement(provider,placement)
setProviderMenuVisibility(provider,visible)
setTheme(theme)
setView(view)
setFavorite(connectionId,favorite)
setAutoOpenAttention(visible)
dismissOrganizationSuggestion(signature)
updateRecoveryPolicy(policy)
```

These are `changes[].type` **values within** `previewConfigChange` and `commitConfigChange`; they are **not** separate top-level API method names.

Example: promoting an existing Simple destination to Quick Select, *after obtaining real revision and destination ID from `getConfiguration` or `listDestinations`*:

```json
{
  "version": "3+1.1",
  "method": "previewConfigChange",
  "params": {
    "expectedRevision": 12,
    "changes": [
      {"type":"updateDestination","mode":"simple","id":"EXISTING_DESTINATION_ID","quick":true}
    ]
  }
}
```

`12` and `EXISTING_DESTINATION_ID` are explanatory placeholders, **not** real values or authority to modify configuration. A subsequent `commitConfigChange` requires an `idempotencyKey`, current revision, and permission; deletion also requires confirmation.

### GUI ↔ API touchpoints (actual source)

- **Manager → Make Default**: `extension/app.mjs` issues `makeDefault` through its `change(...)` helper → `commitConfigChange` → `applyConfigChanges` → transaction → reconcile.
- **Manager → Quick Select**: `updateDestination` with `quick: !d.quick` → same API/config pipeline.
- **Manager → Hide/Show**: `updateDestination` with `hidden` → same API/config pipeline.
- **Manager → Edit**: opens the destination editor, which submits configuration changes through the same API.
- **Manager → Remove assignment**: `deleteDestinationConfig` through the same API plus explicit confirmation; cloud objects themselves are not deleted by merely removing an assignment.
- **Settings/Editor → Simple/Narrow/Depth presentation**: `setShowInChrome` and/or mode-specific configuration; the current composite compiler reads `product.show`.
- **Manager → Organize**: `setProviderPlacement`; inspect the actual compiler for whether each desired placement is honored before claiming visual parity.
- **Native right-click → Save**: Chrome registrar → canonical resolver → `engine.save`; the programmatic sibling is `dispatchSave`, subject to the same authority, target, generation and completion contract. Native user gestures and provider OAuth consent are not impersonated by an API caller.

## 4. Restoration implementation — source revision 9e8a16d

`compileMenuSpec` remains the production owner. It projects the existing independent modes, filters provider visibility, deduplicates exact Cloudflare targets and includes the eligible Default. It then promotes visible Simple Quick targets out of the ordinary Cloudflare list. A Default with Quick ON retains that stored flag but its redundant shortcut is suppressed. Only remaining Cloudflare choices determine attention (zero), flat save (one), or submenu (two or more). Four ordinary provider roots precede Quick siblings. Explicit Flat preserves Quick shortcuts. No available Default is guessed when only Quick assignments survive.

`previewNativeMenu.data.composition` explains `defaultKey`, `quickTargets`, `defaultQuickSuppressed`, `cloudflareChoiceCount` and `cloudflareShape`; it does not write preferences. `previewConfigChange` returns candidate configuration and diff; `commitConfigChange` persists with revision/idempotency checks and reconciles through the existing registrar. Simple, Narrow and Depth configuration stores remain independent. No REDOWN menu engine is imported.

| Input | Canonical output |
| --- | --- |
| Default redown + Quick 4chan | Flat Cloudflare → redown, then sibling 4chan |
| Quick OFF on 4chan | One Cloudflare submenu with redown and 4chan |
| Default redown + Quick 4chan + ordinary Photos | Cloudflare submenu redown/Photos; 4chan sibling |
| All non-default destinations Quick | Flat Cloudflare → Default, Quick siblings |
| Default also Quick | Preserve flag, suppress redundant Default shortcut |
| Cloudflare visibility OFF | No Cloudflare target rows; retain destinations/session |
| No Default and only Quick | Flat attention Cloudflare plus Quick; do not invent Default |

Tests: `tests/latest-quick-rules.test.mjs` proves decision cases, preview/commit, callback ACK, exact routing, stale ID rejection, stored flags and restart with fixture Chrome callbacks. `scripts/test-product-browser.mjs` proves API assignment → genuine app manager Quick toggle → API topology readback in real Chromium with fixture transport/registrar. Neither establishes installed native rendering. The genuine unpacked-extension attempt is BLOCKED by administrator policy; see `docs/evidence/redown-restoration/real-shelf-receipt.json`.

## 5. Source acquisition and operational API ownership

Native page/link/image/audio/video contexts use media → link → page source precedence. The canonical `dispatchSave` schema accepts these contexts. Ordinary page saving is HTML response acquisition, not a rendered/offline page archive. `sourceFromClick` validates HTTPS and provides filename intent; Worker response metadata can infer an extension. No file-type allowlist limits ordinary opaque bytes.

Cloudflare native `fetch` replaces the custom socket/TLS/parser path. Every redirect undergoes public URL and DNS checks; native fetch re-resolves, so this is not an IP-pinning guarantee. The existing writer provides known-length streaming, bounded unknown-length staging, conditional Keep Both and fresh R2 verification. See the functional parity matrix for real limits and unimplemented source workflows.

| Mechanism | Canonical API / effects / evidence |
| --- | --- |
| Remote save | `dispatchSave`, existing native `engine.save`; account authorization, signed operation, live independent R2 bytes verified |
| Existing Worker update | `repairCloudflareDestination`; explicit Shelf button, same Worker/binding/plan; build digest mismatch blocks stale READY, no silent production deploy |
| File/folder mutations | `fileAction` execute scope; source/destination account/prefix checks, explicit destructive confirmation and idempotency; existing File API → same signed Worker/DO owner |
| Context descriptors | `inspectExplorerContextMenu`; pure enabled/action descriptors used by GUI; clipboard carries transient intent, effects go through fileAction |
| Result inspection | `inspectRemoteReceipt` read-only completed envelope even for stored blocked transfer; original state/code retained in data |
| GO TO | `openRemoteResult`; verified recorded receipt plus fresh stat/size/ETag; missing/changed object cannot claim success |
| Provenance | `inspectRemoteReceipt`/`inspectRemoteHistory`; recognizable credential parameters removed before bounded source metadata persistence |

Same-bucket mkdir/copy/move/rename/delete supports files and recursive folders with durable per-object journaling, conditional copy and post-write HEAD verification. There is no automatic uncertain replay. R2 does not support conditional DELETE; externally concurrent replacement can race a checked delete (`atomicDelete:false`). Cross-bucket/private source transfers, uploads, archives and three non-Cloudflare providers are not completed. Do not infer full parity from method names or adapter capabilities.

## 6. Correctness and predictability contract

Use the words accurately:

- **Deterministic projection**: Same validated configuration, inventory, authorization/readiness observations, generation and settings produce the same logical menu rows and target resolution. Stable IDs, parent relationships, ordering and deduplication do not depend on arbitrary timing.
- **Versioned and observable**: Every meaningful action maps to one typed API method, named configuration change, persisted revision, logical menu spec, native registration generation and inspectable result/receipt.
- **No hidden divergence**: A Quick/Default/visibility edit must generate the same new menu whether triggered by GUI or authorized API client. After restart, recovered configuration and recomputed menu agree.
- **Not deterministic cloud networks**: External provider, source fetch, OAuth and concurrency can fail. Their operation states and final confirmation should be reproducible as **rules and evidence**, not falsely promised as identical network outcomes.
- **No false success**: A native context-menu ACK proves registration, *not rendered layout*, and a Cloudflare readiness object proves R2 readiness, *not* an ordinary right-click file save. Completion requires actual provider confirmation/verification.

## 7. Mandatory in-source documentation for every future implementation change

The repository should include **source-adjacent JSDoc or equivalent** on every meaningful export/branch across the engine and configuration code. Documentation should *follow* the code, never substitute for the code's execution.

For each function, write concise, factually correct comments covering:

```text
@responsibility         What this function owns (and does not own)
@api                    Corresponding exact 3+1.1 API method(s); internal-only if appropriate
@inputs                 State, mode, target, generation, context, authorization
@decision               IF/THEN/ELSE conditions, precedence and collision policy
@effects                Durable writes, Chrome registrations, cloud operations, none if pure
@returns                Success, blocked, failed, partial/uncertain and receipt contract
@invariants             One owner, authorization, idempotency, no false success, stable IDs
@tests                  Test cases and runtime-evidence classification
@rule                   Link to matching behavior rule in CURRENT workings JSON
```

For a pure projection function, the documentation may reference `previewNativeMenu` as its owning inspection API; **do not invent a fake user-level API per private helper**. For GUI-visible functionality, use an existing API equivalent or add a correct, trusted new method when a real gap is verified.

**Every rule change must update all applicable surfaces atomically:**

```text
1. Actual source implementation and concise in-source comments
2. Exact typed API method/schema or existing API-equivalence mapping
3. latest/right-click-rules/README.md (normative rule if behavior is intentionally changed)
4. This source ↔ API map
5. 11.2026/workings/right-click-workings.json CURRENT
6. Unit/contract/native/e2e tests and honest evidence status
```

Do not alter the immutable baseline in the workings file. The JSON is large and intentionally incomplete in portions; completeness must be **proved**, never declared by editing a status field.

## 8. Acceptance and anti-drift test cases

For **each** exposed right-click and configuration mechanism, tests must verify:

1. `getConfiguration` and `listDestinations` expose the actual stored data.
2. `previewConfigChange` shows the same logical target, mode, label, Quick/Default/hidden settings and menu diff that `commitConfigChange` subsequently applies.
3. `previewNativeMenu` and `inspectMenuTree` report exact item IDs, action IDs, `parentId`, role, visible/enabled state, target and omissions.
4. `inspectNativeACK` matches Chrome's accepted generation; independently verified installed Chrome rendering agrees with those rows.
5. Right-click and `dispatchSave` select the same exact account/bucket/prefix and obey identical permission and verification rules.
6. Mode independence: changing Simple must not unexpectedly rewrite Narrow or Depth configuration; changing Narrow/Depth should retain their own semantics.
7. Default + Quick combinations, two non-Quick destinations, hiding, disabling, deleting, disconnected/setup, duplicate labels, stale generation and restart all follow the documented IF/THEN/ELSE rules.
8. If the source is not saved or verification is absent, result stays blocked/failed/partial/uncertain; no verified History or GO TO is fabricated.
9. No GUI-only action omits an API equivalent; no listed API operation exists solely as decorative documentation.
10. Tests report separate statuses: **SOURCE VERIFIED**, **UNIT/CONTRACT TEST PASS**, **CHROME FIXTURE PASS**, **INSTALLED CHROME PASS**, **LIVE PROVIDER PASS**, **BLOCKED**, **NOT TESTED**. Never claim full 1:1 parity from a subset.

**Definition of done for documentation:** A new engineer or agent can select any right-click entry or configuration control, follow the exact GUI → API → source → state → native Chrome → outcome trace without guessing, verify it in tests, and identify any known mismatch **without mistaking intention for implemented fact**.

## 9. Work and deployment limits

This file establishes **documentation requirements and a source-verified starting map**, not a silent code edit. It does **not** mean in-source JSDoc already covers all functions, that every interface is currently API-equivalent, or that installed Chrome rendering is proven. The Quick placement repair has source/local/browser-fixture evidence as described above.

Subsequent Codex source changes must complete the in-source annotations and maintain the mapping as part of the same work. Do not clone REDOWN's legacy menu engine. Do not edit REDOWN, modify user settings, alter OAuth provider registrations, or deploy production Workers merely because this document exists.

**OWNER SUMMARY: Document the entire Click2Cloud right-click engine and configuration system according to what it ACTUALLY does, naming its real API, with a continuously updated proof-backed 1:1 mapping. Preserve Click2Cloud's Simple/Narrow/Depth design, and use REDOWN as a functional reference for the right-click/Explorer power—not an instruction to clone all of REDOWN.**

## Permanent destinations / one-click Explorer repair (0.3.10)

The active implementation request is `docs/requests/P0_FIX_PERMANENT_DESTINATIONS_SETUP_AND_EXPLORER_2026-11-07.md`. Persisted entries in **any mode/account/provider**, including hidden/inactive/Quick, or an existing Default take precedence over initialization. Account auth/inventory failure changes usability, never saved membership.

| Source mechanism | Exact trusted API / decisions and effects |
| --- | --- |
| CURRENT `loadState/read/getModeConfig` | `getConfiguration`, `listDestinations` and all writers share validation. Established missing/corrupt/conflicting rows produce recovery errors, not fresh empty defaults. Presence marker holds no duplicate settings. |
| CURRENT `commitProduct/saveModeConfig` | `commitConfigChange` and initialization use atomic transactions. Missing standalone mode rows are materialized during legacy migration even if identical; product and every mode revision fence stale writers. |
| Onboarding `initializeAccount/setupLocked` | `loginBegin` → `initializeCloudflare` reads durable state before fallback; global nonempty guard is rechecked during setup. Default-only links exact target. Genuine empty state + next authorized login + retained/new actual consent may create/reuse redown and persist Simple root + Default after verification. Passive status never provisions. |
| Account approval | `inspectCloudflare.onboarding.setupAuthorized` reports a nonsecret boolean. Saved consent is independent of OAuth sessions; read-only readiness reports `SETUP_RESUME_REQUIRED`. Known previous initialization with missing consent reports `SETUP_APPROVAL_RECORD_MISSING`, never fabricates consent or offers first-run setup. |
| Saved manager | `getConfiguration/listDestinations` work offline; manager exposes Simple/Narrow/Depth counts, Default and paginated rows. Depth removal uses existing setDepthDisplayBuckets transaction and confirmation. Local membership never depends on cloud enumeration. |
| Explorer entry | New `enterExplorer` inspect-scope operation returns current accounts/buckets, target or RECONNECT_REQUIRED/CHOOSE_ACCOUNT/CHOOSE_BUCKET. Uses same File API/auth owner; trusted agents need all-configuration authority because preferred/default and account choices can span accounts. GUI top tab, reconnect and legacy entry buttons use it. |
| Explicit Explorer navigation | Existing `navigateExplorer` verifies current Cloudflare identity/account, then stores nonsecret target in CURRENT and uses existing navigation host. `enterExplorer` reads it, validates account/bucket availability, does not rewrite Default or stored choices. |
| Startup | Existing native-registration evidence plus missing CURRENT generation blocks with CONFIGURATION_RECORD_MISSING. Shelf displays recovery/retry, not a fresh-install empty view. Unavailable OAuth status permits viewing saved local rows. |

Inspection schemas remain closed and versioned `3+1.1`; `listDestinations` now accepts depth and returns scopes as well as destinations. Configuration writes keep expectedRevision/idempotency and destructive confirmation. Existing native Quick promotion and independent Simple/Narrow/Depth projectors are unchanged. Every transfer action still rechecks live authority.

See `docs/evidence/permanent-destinations/ROOT-CAUSES.md`, browser regression receipts and handoff for proof classifications. No claim of Windows installed-Chrome success follows from real browser IndexedDB or fixture native callbacks. The immutable `permanenceBefore` snapshot and CURRENT source hashes are maintained in the canonical workings map.

## 0.3.11: responsive Explorer and complete destination Save

The owner follow-up makes `+ Right Click → Save` the complete assignment workflow. `commitConfigChange` persists the exact target, refreshes readiness only for its added targets, compiles through the same V3+1 engine and returns the Chrome ACK plus `destinationReadiness`. New folders reuse a same-code verified R2 write in the **same bucket**, together with a current exact scoped Worker capability and current account authority. The Worker still enforces its binding/prefix and every actual transfer rechecks authorization. No probe/write/deployment is hidden in configuration or menu inspection. Missing Workers, stale code, scope mismatch and permissions remain explicit Shelf blockers, not a second native `· Set up` destination. Saved labels, stable action IDs and the existing Simple/Narrow/Depth/Quick rules are preserved.

`getInventory` projects local saved observations by default. It no longer awaits a network sweep over every saved destination during boot/menu inspection. Only an explicit destination Save requests its exact new readiness checks; fresh transfer dispatch still verifies the target. Display-only `setView`/`setTheme` persists normally while retaining a currently acknowledged menu rather than re-registering it; pending/missing ACK is reported honestly.

| Mechanism | Canonical API / exact behavior |
| --- | --- |
| Immediate context shell | GUI imports the same pure `describeExplorerContextMenu` used by `inspectExplorerContextMenu`. All shell controls start disabled. The trusted response reconciles enabled actions by canonical ID, considering current account/auth and known write grants. Selection/navigation/close epochs reject stale replies. Dispatch rechecks authority; shell paint is no permission grant. |
| Persistent shell/viewport | `enterExplorer`, `navigateExplorer`, `listFolders` and existing configuration owner. Toolbar/scrollport retain identity through routine navigation; tab switches restore viewport scroll. RAF updates only the visible window, preserving logical keys and focus. |
| Read cache | Existing listing reader coalesces immutable metadata pages with TTL and bounded three-request concurrency. Caches clear on connection notifications. Signals cancel queued/subscriber work; already-dispatched runtime IPC cannot be physically recalled and its stale replies are ignored. No write replay or authority caching. |
| View | Existing `setView` now accepts details/list/grid. GUI feedback uses pending intent immediately, then the same serialized commitConfigChange transaction persists it or rolls presentation back on failure. Grid virtualizes fixed-size icon tiles, not whole-directory thumbnails. |
| Address | Pure cloud URI format/parse and visual middle ellipsis. Focus/copy retains the exact full URI. Enter validates current authorized account/bucket pages through listAuthorizedBuckets, then navigateExplorer; a file is checked with fileMetadata and selected. Escape restores actual location. No key mutation or new navigation API. |
| Preview | `readFileChunk` supplies bounded, identity-checked ranges (up to three concurrent reads after the first identity-bearing range), immediate loading feedback and epoch cancellation. Text is visibly truncated at the existing preview budget; images use the existing provider memory budget. No full arbitrary file body is serialized in one message. |
| Manager | Exactly one visible Explorer entrypoint, the persistent footer Manage Destinations button. Its existing saved configuration/API functionality remains available offline; duplicate toolbar/context entries removed. |
| Timing | Opt-in local Performance Timeline (`localStorage.click2cloudPerformance='1'`, reload). Fixed event names and numeric durations only, bounded retention; no paths/URLs/tokens. Two RAF paint opportunities are not physical display latency or a Windows/native-input proof. |

Detailed before/after evidence, source hashes, real-workerd destination byte checks, installed-Chrome blockers and portable Windows measurement commands are in `docs/evidence/zero-stutter/`. No genuine live provider or Windows result is inferred from fixtures or Chrome callback ACKs.
