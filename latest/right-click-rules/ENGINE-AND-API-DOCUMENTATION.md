# Click2Cloud Right-Click Engine and Menu Configuration — Source ↔ API Documentation

## Depth-only provider root clarification — November 13, 2026

`src/core/menu-spec.mjs:providerRootSave`, owned by `3+1.1`
`previewNativeMenu` / `previewConfigChange` (pure) and
`commitConfigChange` / `reconcileNativeMenu` (application), labels the root save
of an inlined sole Depth bucket with its actual bucket name. The predicate
requires Depth, a physical root prefix, the Cloudflare provider as parent, and
a root placement ancestor. It does not match arbitrary `Save here` text.
Otherwise projection is unchanged. Nested named bucket/folder `Save here`
actions, all target/action/item IDs, availability checks, configuration and
Worker authorization remain unchanged. No destination is deleted or provisioned.
Inspect `previewNativeMenu` and `inspectNativeACK` separately; an ACK does not
prove rendering or a save. The narrow exception avoids stranding the sole root.

`extension/depth-destinations.css` scopes layout to the Depth manager list;
its eye/delete/depth controls still stage drafts and use the existing explicit
shared Save. Tests: `depth-scope-regression.test.mjs`,
`logic2real-depth-save.test.mjs`, `scripts/test-depth-layout.mjs`.
See [audit and remaining blocking P1](../../codex/11.13.2026-0355/IMPLEMENTATION_REPORT.md).
Actual native rendering and R2 readback are unverified in this environment.

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

Cold startup uses the same trusted message handler: registry-declared inspect methods wait for validated `dataReady` rather than unrelated Chrome registration callbacks; effectful methods retain `ready`. Storage-integrity rejection still produces structured startup errors. Sender and API authorization gates are identical; native ACK remains a separate fact. A controlled actual-background/browser test holds create callbacks and proves this ordering without claiming genuine installed Chrome timing.

## 0.3.12: image bytes, gallery and local Explorer geometry

`readFileChunk` remains the sole authenticated byte RPC for image previews/thumbnails/gallery. Failed File API results with no usable code now propagate an actual bounded read error or FILE_READ_FAILED rather than the misleading failed code OK. The Shelf verifies range identity/length, byte signatures, bounded header dimensions and browser decode; stored health text cannot appear as an image. This does not independently prove the owner's reported cloud object contents.

One bounded source-Blob cache serves virtual-window thumbnails and the full viewer; authority/folder/refresh/file mutation/verified-save changes invalidate it. Thumbnail decode has bounded concurrency/pixels and explicit object-URL disposal; image/gallery cursor and arrows are pure local presentation over ordered loaded authorized entries. No new image endpoint, cloud resize call or original webpage URL is used.

The sole new durable change is `setExplorerLayout` inside existing `previewConfigChange`/`commitConfigChange`, with closed typed `explorerLayout:{split:number (0..100),toolbarRows:integer (1..7)}`. Old configuration defaults to exact 50/50 and one row; no destination/auth/settings are reset. Pointer/keyboard geometry, More overflow and ResizeObserver/RAF are local. Changed gestures commit once after release; no-op clicks do not write. The two separators expose names, orientation, values, focus and pending-save state. More reuses the same command nodes/handlers and differs from Load more files. Display-only layout commits retain a currently valid native ACK; pending ACK stays truthful.

Remotes hosts the existing connection UI without the Explorer tree; Settings also occupies full content width. Switching tabs preserves Explorer state. Footer left stays empty; contextual accessible notifications and existing API receipts retain errors. A delayed History summary cannot overwrite a newer action error. Manager Default controls use existing makeDefault/clearDefault, preserve exact stored targets, disable competing Default controls until the same canonical commit settles, and show the chosen target even outside the current filter.

See `docs/evidence/image-gallery/SOURCE.md` for API/GUI audit, exact policies, causal findings, limitations and source-pinned test handoff. Native compiler/dispatch, OAuth, Worker deployment/protocol and verified saves are unchanged; no installed Windows/live pass is inferred from decoded fixture pixels.

## 0.3.13 controlling override: Remotes first, login only

The November 8 Boot/login contract supersedes older automatic next-login initialization: loginBegin now authenticates and verifies account identity only. It does not create/reuse buckets, prepare Workers, initialize destinations or reconcile native menus, even with durable setup approval. Existing initializeCloudflare/approveCloudflareSetup/repair APIs remain explicit authorized setup transitions. Stored destinations, Default, Quick choices, OAuth, Worker plans and approval records are preserved.

Authentication/introspection methods (loginBegin/loginStatus/loginCancel/disconnect/getProviderConnections/describeCapabilities/inspectShelfAttention/getEngineHealth) no longer require CURRENT or native readiness. Sender, schemas, permissions, confirmations and response gates remain canonical. `loginBegin({verifyOnly:true})` reuses existing OAuth authority/status for pending identity verification without R2 or another consent flow. getEngineHealth completes a read-only inspection and reports storage blocked separately from native/backup state. State-dependent methods continue validating CURRENT and prior-native missing-record evidence; no empty/default state is invented on errors.

Background trusted-storage and CurrentStore open attempts are coalesced but do not retain rejection forever. Native maintenance belongs to actual install/browser-start lifecycle events, explicit configuration/setup or native-save dispatch, never Shelf opening/OAuth. The existing single message handler delegates dependencies to the same API. Developer `.ready` now means validated local state, not native menu installation.

Every new Shelf document paints Remotes first, before optional reads. One quiet transient retry/read timeout applies only to boot inspections. Missing/corrupt storage stays blocked and visible as a small contextual card while independent login works. Old fragments/attention do not open another view/dialog; latest tab intent is retained. The tab listener targets only `header nav [data-view]`, preventing clicks on nested controls from invoking the layout container's tab handler. Existing connection elements are retained safely even when detached by provider status. Safe local-service diagnostics and actionable auth errors replace generic startup/apology/Retry screens.

See docs/evidence/remotes-boot/SOURCE.md and HANDOFF.md for production-module baseline reproductions, repeated openings/reloads/full-process restart, fault cases, exact source pins and external Windows/MV3/OAuth blockers. Fixture Chrome APIs or synthetic OAuth replies are not live browser-consent proof.

## CURRENT loss recovery hardening — 0.3.14

The existing `3+1.1` `getEngineHealth` now reports safe physical CURRENT presence/counts, establishment/native relation and bounded origin/subreason. It does not export records or initialize a missing database. Normal login/Remotes remain independent. Direct store readers/writers and engine saves enforce the same established-loss fence; the registrar rechecks CURRENT before prepare and before native clear, stopping if prepare persistence fails.

`requestRestorePreview` remains under trusted restore scope but is read-only (`effectful:false`) and can inspect when CURRENT is missing. It returns a complete validated local-journal or cross-namespace-manifest-verified external candidate, proof token and conflicts, or an honest unavailable/partial result. Native MenuSpec is never a complete candidate. `restoreRightClickMenu` requires `previewToken` and `idempotencyKey`, plus `expectedRevision` when CURRENT is readable. Existing confirmation/account-binding authorization remains. Apply first verifies external private preimage preservation, then atomically checks surviving rows/evidence and restores through CurrentStore, reads back and requests actual native ACK. Unrelated history/setup/handles remain in place. Fingerprint change, stale/conflicting evidence or unavailable preservation blocks mutation. Old revision-only calls cannot trigger an empty reset.

Read [forensic handoff and state matrix](../../docs/evidence/current-recovery/FORENSIC-HANDOFF.md) and source-linked C2C-PERSIST-1…7 in CURRENT workings. Actual owner Windows restoration remains an open external acceptance gate. Strict IDB writes and local provenance are not guarantees against deletion of every independent copy.


## CURRENT loss agent reliability ratchet — 0.3.15

The canonical API remains `3+1.1`. `describeCapabilities({section:'reliability'})` derives operation schemas, owners, permissions, effects, dependencies, completion evidence, invariants, known failures and explicit coverage gaps from the existing toolRegistry and Glaciaring catalog. `getEngineHealth({view:'trace',operationId,cursor,limit})` uses existing paginated diagnostic ownership; `getEngineHealth({view:'support'})` returns a sanitized local incident report, never raw configuration/URLs/account names. Help → Diagnose reviews this same report; clipboard sharing is explicit, with no uploads. Read-only inspection does not flush or write breadcrumbs. Normal operational faults may enqueue bounded, asynchronous metadata breadcrumbs; unreadable/unknown diagnostic storage is preserved.

Existing recovery APIs support a separately labeled owner rebuild: `chooseBackupLocation({purpose:'rebuild'})` verifies a host-selected private profile copy; `requestRestorePreview({rebuild:{accountId,changes,acknowledgeUnknown:true}})` previews new owner choices only when CURRENT is entirely absent with no surviving journal/checkpoints. Empty changes expose partial native clues without inventing hidden/mode/default semantics. `restoreRightClickMenu({rebuild,previewToken,idempotencyKey})` requires trusted short-lived method/account authority, explicit human approval, verified preservation, unchanged evidence and durable CurrentStore readback. Both prior and new affected account intent must be authorized, including native principals when CURRENT is lost. Changed intent cannot reuse an idempotency receipt. Native reconciliation failures remain visibly pending after a committed repair. The provenance is OWNER_CONFIRMED_REBUILD, result REBUILT_WITH_OWNER_CONFIRMATION, originalStateRestored:false; remote success remains NOT_VERIFIED. Existing complete verified restoration is separate.

No login provisioning, storage resets, native-as-authority recovery, or new engine. See [full forensic/reliability handoff](../../docs/evidence/reliability-ratchet/HANDOFF.md), [source map](../../docs/evidence/reliability-ratchet/system-map.json), CURRENT workings and executable C2C-PERSIST/AGENT/REBUILD/DIAG/RATCHET invariants. Owner Windows original-state recovery, installed native behavior and current-run live R2 remain external gates; original loss cause remains UNKNOWN.


## Owner override — explicit Login prepares saving (0.3.16)

`loginBegin({})` still performs the approved interactive OAuth first, independently of CURRENT. Once CONNECTED, the same canonical API validates durable configuration, checks existing initializeCloudflare/account authorization, and calls the existing initializer with host-only setup consent. Only genuinely empty configuration creates/reuses lowercase redown and sets an ordinary Simple destination/default after verified probe. Existing custom destinations/defaults win. Successful initialization reconciles the existing menu compiler/registrar and requires native ACK. `loginBegin` returns authentication plus a separately identified/staged initialization result: setup/storage/native failures do not turn OAuth into a failure or claim readiness. Agent login-only authority cannot provision. `verifyOnly`, passive status, refresh and startup never provision. The GUI Login disclosure covers infrastructure and possible billing; no redundant setup approval is required in normal use. Sign out is available directly in Remotes even if settings cannot be read.

After a successful upload, only read-only capability checks retry brief route propagation errors, bounded to eight checks; probe/write requests are never replayed automatically. Every successful save still requires the production Worker and independent R2 receipt verification. Existing unprovable historical CURRENT loss remains protected and blocked, never silently replaced. See [evidence and limitations](../../docs/evidence/login-ready-product/HANDOFF.md).


## R2 image preview/download compatibility — 0.3.17

The existing `readFileChunk` API and Universal File API `readChunk` own all Explorer image/download bytes. R2 JSON bare ETags and HTTP quoted ETags normalize to the same opaque strong identity; weak/missing identities and actual mismatches remain blocked. If-Match is correctly quoted but never trusted without checking the response ETag. The management endpoint's ignored Range/full200 responses are consumed through bounded forward windows; real206 responses still require exact Content-Range and byte counts. The adapter retains at most four open response readers and four64KiB replay windows per reader, cancels on EOF/error, and expires idle readers after5s. It does not buffer whole objects. A new GET can safely skip a prefix after reader loss, using the same validator; no permanent read session or new API is introduced.

`readPreviewBytes` checks listed size/strong identity, offsets, totals, exact chunk lengths and completion. Preview/thumbnail decoding remains byte-derived. Downloads use this same reader with a local streaming sink through the existing Save picker: open the writer only after validated bytes, abort failed writes, await close, then confirm file size via getFile before success. Actual empty objects remain valid; nonempty objects cannot report successful zero-byte writes. Local picker/DOM actions stay local; trusted agents use the same readFileChunk and byte validator. Upload/Worker/OAuth/setup/native-menu owners are unchanged. See [root cause and verification](../../docs/evidence/image-read-download/HANDOFF.md).


## Phased upgrade Phase 1 — native Narrow hierarchy (0.3.18)

The canonical composite compiler now retains the selected Narrow leaf's actual parentPlacement ancestry, rather than reducing the projector to a flat destination list. Explicit Narrow selection is the opt-in hierarchy: even one Narrow path can be Cloudflare → customized ancestors → final save; ordinary single Simple/default remains flat and explicit Flat remains an override. Unassigned natural bucket wrappers are omitted; explicit root titles are preserved. Shared ancestors merge only when physical identity, displayed title and visible parent match; collision disambiguation and exact target action binding stay canonical. Preview/configuration APIs, native Chrome parent IDs and resolver use this same MenuSpec. Simple/Depth projectors and storage are unchanged. Baseline checkpoint is3b24320. See docs/evidence/phased-upgrades/phase1/HANDOFF.md for executable and installed/live proof classes.


## Phase 2 — reversible Narrow ancestor visibility

Existing create/updateDestination changes accept optional Narrow-only visibilityMode all/hide-all/custom. Legacy missing mode means custom and retains every stored level flag. All reveals original hierarchy; hide-all suppresses ancestors only; the deepest directory is always visible/actionable. Bulk switches never overwrite custom levels. Restore custom visibility selects the retained snapshot; editing specific levels explicitly selects custom mode. Checkbox/select-all excludes the final directory. Persisted state, GUI and projector use the same levelHidden rule, with no cloud-key changes. Existing recovery/export validation accepts this optional configuration property; no new recovery mechanism.


## Phase 3 — destination switches and visibility

Existing configuration API enforces Default/Quick exclusion: Quick ON clears matching global Default; Default ON clears matching Quick in all saved modes; OFF enables neither. Legacy dual-flag data retains Default and normalizes only its conflicting Quick flags; read is non-mutating and the next ordinary atomic commit persists normalized flags. No destinations/history are removed. Narrow Quick now uses the same alternative direct-placement semantics as Simple, with its own selected mode and final title.

Every manager row has an eye titled exactly Change Visibility. Simple/Narrow use updateDestination.hidden; Depth uses the existing setDepthDisplayBuckets scopes with optional hidden, preserving other options. Hiding suppresses the relevant mode's choice/Quick and any hidden-Default fallback (including Flat), without clearing the saved Default or objects. Visible alternatives in another mode remain independent. Depth rows have no Make Default button. Stored visibility survives restart; the same spec/native reconciliation/resolver enforces hidden/stale dispatch blocking.

Phase 4 (2026-11-09): gallery `openEntry` reserves `.image-frame` geometry within a responsive, bounded dialog before the existing `readFileChunk`/image-reader/decode lifecycle runs. Local visual layout needs no new API; preview and download keep the same canonical authorized reads and verified identity/byte semantics. Long titles truncate visually; original filename is preserved. Loading/error/portrait/landscape changes cannot resize controls or frame. True viewport changes resize the frame. Browser geometry evidence: `docs/evidence/phased-upgrades/phase4/`. No loader media or provenance added in this phase.

2026-11-09 consolidated Gate A supersedes historical target-dedup/Flat-exclusive rules. `setShowInChrome` retains all three independent booleans. `compileMenuSpec` includes every checked projector, preserves Narrow AND Depth parent placements, and keys native save routes by mode/placement (physical action authority remains exact targetKey). A real descendant Depth tree branches; an empty bucket can remain one direct leaf. Flat never vetoes checked trees: it permits only the legacy unassigned Default shortcut, never a hidden/unchecked assigned route or fabricated directory in a selected Depth bucket. Quick promotes its selected presentation, leaving independent routes to the same target intact. Identical siblings receive deterministic readable `(2)`, `(3)` suffixes, never silent removal.

`createDestination(mode:nested)` permits another presentation at an existing physical target and generates a stable persisted ID. Updates/deletion/eye address that ID; legacy IDs remain unchanged. Repeated Simple targets remain rejected. Nested projection merges common structural ancestors only when physical prefix, visible parent and title match, and retains separate selected save placements/IDs. `previewNativeMenu`, `inspectMenuTree` and `previewContextMenu` expose presentationId; native dispatch still validates exact generation, acknowledged route and fresh target authority. Default remains one physical target and clears Quick on all corresponding presentations; Quick ON clears that target's Default.

Explicit Depth scope/display configuration requests read-only paginated folder discovery to maxDepth through the existing File API, then exact scoped readiness checks before native reconciliation. Passive boot/inspection does not crawl. Missing/partial/error inventory is not an empty-bucket assertion. No new cloud resources, source bytes, user config deletion or menu engine. See `docs/evidence/composition-remaining/gate-a/` for source, callback-native/browser and genuine live R2 proof boundaries.

Gate B / Phase5: `getGalleryLoadingVisual({includeMedia?:boolean})` is trusted inspect; `setGalleryLoadingVisual({expectedRevision,mode:'math'|'media'|'plain',media?:{name,type,base64},removeMedia?:boolean})` is trusted configure. Same operations drive Settings and agents. One Blob (8MiB local visual memory/storage budget, unrelated to cloud transfer size) plus preference/revision is held in existing CurrentStore's `galleryLoadingVisual` record, independent of destination configuration and backups. Revision mismatch/invalid content/type/oversize fails before replacement; removing is explicit; choosing math/plain retains media until Remove. No uploads, network URLs or new engine. Supported types: PNG/JPEG/WebP/GIF/muted looping MP4. The browser decodes valid media; corrupt/unsupported decoding or autoplay failure falls back to math. GIF retains its encoded animation/looping; reduced-motion/offscreen uses a still frame. Media object URLs/decoders, visibility/motion/intersection listeners and math RAF are released on decode, error, cancel/navigation/close. Mathematical equations and colors are isolated in `loading-visuals/math.mjs`; media is isolated in `media.mjs`; one small lifecycle owner mounts either inside the existing fixed frame. Existing `readFileChunk` and download semantics are unchanged.

Gate C / Phase6: the existing `galleryStep`/`moveGallery` sequence remains local presentation logic; underlying previews/downloads retain canonical read APIs. Previous/Next use fixed44×36 controls, restrained SVG chevrons, explicit tooltips, ArrowLeft/ArrowRight shortcuts, visible focus/hover/disabled states and unchanged first/last/epoch guards. No new API or gallery engine is needed for local pointer/keyboard focus and drawing. Browser tests cover boundaries, pointer/keyboard, rapid navigation, retained geometry and screenshots alongside existing preview/download and loader tests.

Gate D / Phase7 (0.3.19): the canonical compiler now freezes a per-save `provenance` selection snapshot in the same MenuSpec generation as the registered route. `presentationId` identifies the saved Simple/Narrow configuration; `entryId` is the actual selected native item. The resolver returns this exact immutable snapshot only after ordinary acknowledged-generation/action/target/fresh-authority validation; engine dispatch passes it to the existing remote saver. The capability HMAC binds operation, source digest, destination and provenance digest; initial Worker authentication AND lease renewal validate it. Metadata never supplies destination authority.

Schema1: user mode `simple`/`narrow`/`depth`; provider/bucket/actual directory components; exact selected native menuPath/entryId. Simple records displayed title, configured title, its labelSource and collapsed ancestors. Narrow records the selected presentation ID, full configured/natural level titles including hidden levels, effective visibility flags and visibilityMode. Optional custom bucket presentation is explicit. Depth invents no Narrow-style settings. The Worker derives original filename after ordinary response-filename handling, then records the actual keep-both stored filename and operationId. Menu titles never rename objects. Later settings changes cannot alter an older click snapshot.

During the ORIGINAL conditional R2 put, customMetadata has operationId plus ASCII-safe JSON `click2cloud`. Combined UTF-8 keys+values must fit R2's actual2KiB service budget; overflow rejects explicitly before write (PROVENANCE_TOO_LARGE), never truncates fields or rewrites an object afterward. Streaming/spooling and conditional-create semantics are unchanged. Separate R2 HEAD verification compares actual metadata, operation, key/version/ETag/size with the intended frozen selection and receipt. Independent live acceptance additionally GETs and hashes bytes and reads S3 custom metadata. No page/source URL, access token, signing key or unrelated configuration is added to metadata; previous URL-based importer metadata is no longer emitted. Old objects without metadata remain readable.

`dispatchSave`/native/explorer dispatch share the same engine; `previewNativeMenu`, `inspectMenuTree` and `previewContextMenu` expose selection provenance, and existing receipt/history inspections return verified object provenance. No new transfer API. Legacy low-level remote module clients that provide no selected menu snapshot remain protocol-compatible and do not fabricate one; all canonical composite Cloudflare save routes supply it. Readiness probes/file operations keep their existing distinct semantics. The Worker code digest changes: an existing production Worker requires the existing explicitly approved upgrade path; this run only deploys an authorized isolated test Worker. No claim that an unchanged production Worker supports new metadata.

Final loader regression hardening: a missing/corrupt local visual record reports LOADING_MEDIA_INVALID and falls back inside the frame, preserving a selected plain/math preference and all destination records. Settings can explicitly replace/remove the bad local visual using its retained revision. No new recovery mechanism or automatic cloud/config reset.

Quick snapshot detail: an actual promoted Narrow Quick placement records `placement:quick`, effective `visibilityMode:hide-all` and only the final level visible, while `configuredVisibilityMode` retains its saved all/custom/hide-all choice. `menuPath` records the direct native shortcut. This avoids claiming configured ancestors were displayed on a promoted click. Ordinary Narrow snapshots are unchanged; no settings are mutated.

Creation identity detail: NEW Narrow IDs are allocated deterministically from the configuration creation revision/slot/collision sequence, independently of physical targetKey. Deleting/recreating in a later revision creates a new ID; existing/legacy IDs never change. Preview/retry stays deterministic. `createDestination` accepts optional hidden/quick flags with the same validation/exclusion rules as update, so existing confirmed-rebuild GUI code can describe its initial choices atomically without guessing a target-derived ID. No recovery machinery or extra API was added; Simple duplicate-target semantics remain intact.

### Depth native click lifecycle — November 13 P0 repair (historical pre-recovery behavior)

`src/modes/depth/native-click.mjs:createDepthNativeClick` owns Depth-only
native preflight and click-attempt observation. `registrar.handleClick` delegates
only `origin.mode=depth` rows; cold worker metadata may classify the row but never
authorize a persisted ACK. Fresh account membership and scoped Worker READY are
required; only that exact target's readiness observation refreshes. Original
engine/resolver/transport still recheck current authority, generation and receipt.
Unready status is blocked with a read-only plan subreason; no provisioning/retry.
`inspectRemoteHistory` displays `kind=depth-click` attempts separately from actual
remote receipts, using existing CURRENT storage. Native application semantics,
configuration APIs and all menu projection stay unchanged. See
[Depth P0 evidence](../../codex/11.13.2026-0355/DEPTH_P0_REPAIR/TEST_RESULTS.md).
Native Chrome/R2 results remain unverified; fixture success is not release proof.

### Working-first Depth repairs — November 13

`src/modes/depth/native-click.mjs` isolates optional click-record failures from
safe dispatch and returns `depthRecordCode` without changing transfer truth.
`createDepthFeedback` independently attempts existing notification/badge/message
channels even if optional lastDepthClick persistence fails. A later diagnostic
plan observation is prefixed FOLLOWUP; it is not the rejecting read's snapshot.

Depth native callbacks now pass an internal invocation-local authorization
function through `registrar.handleClickBase` → background dispatch → engine.save.
The engine selects it only for a bound `origin.mode=depth` row. Fresh OAuth,
exact scoped Worker status, current generation/configuration, capability and
independent receipt verification remain required. Simple/Narrow retain the
original getAuthorization path; no Depth click writes shared readiness snapshots.
No public API schema, registry key, upload implementation or menu is changed.
Owning APIs remain `dispatchSave` / `inspectRemoteHistory`; physical Chrome/R2
verification is separate. Evidence: tests/depth-working-save.test.mjs and
codex/11.13.2026-0355/DEPTH_WORKING_FIRST_IMPLEMENTATION/FIXES_AND_VERIFICATION.md.

### Exact-bucket missing-plan recovery — November 13 ship repair

`recoverCloudflareDestination({target,expectedRevision?,idempotencyKey?,authorizeSetup?})`
is the narrow trusted `3+1.1` provision action in `src/api/service.mjs`. Native
Depth preflight calls it only after current CURRENT/configuration/generation and
native ACK validation. Its immutable target is the clicked account, connection,
bucket and prefix. Default and other configured buckets are never fallbacks.
The API and Shelf use `onboarding.recoverDestination`; there is no second saver.

Existing durable account or exact-bucket setup approval permits missing-plan
creation/resume with live required grants. Without approval the original click
is not saved and exact-target Shelf attention offers informed authorization.
`authorizeSetup:true` requires host confirmation; code upgrades and signing-key
renewal require that explicit action even when ordinary setup approval exists.
The confirmation explains Worker/R2 usage and shared per-bucket key renewal.
An unknown/mismatched remote identity is never overwritten. Existing prefix
scope is retained; a scope mismatch stays blocked with scoped-change guidance.

`deployment.prepare` persists a generated name/key before deployment, inspects
retained account/bucket/R2/DO/signing bindings, and reuses pending deployment
identity after interruption. `remoteTransport:digest([accountId,bucketName])`
remains the one physical registry entry across modes/folders. The private
`destination-recovery:` pointer selects the same-bucket setup ledger; legacy
matching initialization records can resume. An uncertain probe is inspected by
its original operation ID and never automatically replayed. Readiness requires
fresh exact scoped capabilities, actual verified R2 probe, `markVerified`, and
a final fresh status. Saved configurations, Default and Quick are not edited.

After recovery the canonical compiler/registrar refreshes only the selected
Depth bucket's discovery, preserves unrelated snapshots, and requires the exact
actionable native row in the current ACK. The original click returns
`FRESH_CLICK_REQUIRED`; its source URL/bytes are neither retained nor replayed.
A new click uses the original common resolver/engine/signed transport with
independent object verification. Shelf no longer interprets `completed` alone
as readiness: `selectedSetupReady` requires fresh exact transport proof and
current exact-target native ACK. Permission denial, stale code, restricted
scope, uncertain probe, missing approval and incomplete menu remain distinct.

Evidence: `tests/depth-plan-recovery.test.mjs` executes actual provisioning
metadata/module construction, typed API, native callbacks, signed workerd
requests and independent local R2 byte readback. Recovery/deployment/UI suites
cover consent, restart, lost replies, scope/account isolation and no replay.
Browser DOM tests use synthetic RPC. These are not owner Chrome or live
Cloudflare R2 proof; administrator policy blocks unpacked loading in this runner.

## Two-tier observer (V2 review branch, November 14, 2026)

`src/chrome/registrar.mjs:handleClick` remains the only native listener's owner.
It gives each delivered action a random `attemptId`, invokes optional
`observeClick` without awaiting IO, and reports the same terminal outcome in
`finally`. `handleClickBase` and the existing Depth wrapper retain their
route, generation and authorization decisions. Their existing `3+1.1`
`dispatchSave`/`dispatchExplorerSave`/`invokeProviderAction` ownership is unchanged.
An observer exception is caught and never authorizes, retries or changes a save.
The optional callback travels with each invocation into `engine.save`; it sees
`dispatch.enter` and already-existing source/authorization/transfer/verification
boundaries. It is not the older Glaciaring reason-code channel. Transport adds
only a first-request response-header latency observation, never an extra request.

`extension/background.mjs` statically imports the MV3-compatible host graph and
defers guarded initialization independently of native startup. A bounded early BASIC-only checkpoint buffer does not retain RAW URLs.
Failure leaves the original dispatcher available. This observer has no authority
over CURRENT, OAuth, menu ACKs, provider writes, History or counters.

Settings uses a separate local `{channel:'recorder',version:2,method,params}`
protocol, accepted only by the existing `appSenderDecision` for the exact Shelf
URL and extension identity. Methods: `status`, `debug`, `capacity`, `start`,
`stop`, `runs`, `snapshot`, `page`. RAW Start and export each require consent;
capacity shrink requires confirmation. These are not additional `3+1.1` cloud
commands or agent grants. See the [implementation and field matrix](../../docs/evidence/two-tier-diagnostics/IMPLEMENTATION.md).

Two independent IndexedDB archives own BASIC rolling attempts and opt-in rich
segments. Stop fences rich admission synchronously; pending writes remain
unconfirmed until actual settlement. Read/export never probes providers or
re-uploads. Unknown times/bytes/proof remain explicit N/A. Linux fake-native,
real-IDB and ZIP tests are separate from installed Chrome and R2 evidence.
The latter remain BLOCKED/NOT RUN; no installed behavior claim follows from ACKs.


### MV3 compatibility gate and current verification limit

The build now rejects dynamic imports anywhere in the manifest worker import/re-export
graph, including computed imports. HTML-page imports are outside this worker policy.
Recorder initialization failure is distinct from not-ready/request-unavailable; only
bounded causal names/stages are returned. Static module parse/evaluation failure is
still a whole-worker risk, so parse and browser-worker tests accompany this change.
Installed/native acceptance is BLOCKED by policy here and is never inferred from
Node or HTTP-worker fixtures. See [two-phase evidence](../../docs/evidence/mv3-suite-reliability/REPORT.md).

### Recorder-first complete export (November 14 review)

The Settings-only recorder v2 `snapshot` / `page` protocol remains local and sender/
Debug gated; RAW still requires consent. It confers no cloud or agent authority.
`exportComplete` now internally reads all Basic snapshot positions and rich segments,
validates counts/sequences/source hash chain, streams page encodings into bounded
native Blob chunks, computes incremental SHA-256/ZIP CRCs and starts one download.
Snapshot ordinal cursors are explicit `basicNext`/`snapshotPosition`; durable Basic
sequence numbers are preserved separately. Missing/evicted/gapped/unconfirmed data
is named in PARTIAL coverage; corruption, cancellation and interrupted reads cannot
report COMPLETE. 256 MiB is the explicit encoded payload budget; oversize fails
without truncation or manual parts. The panel defaults to the available rich run,
retains an explicit Basic-only choice and never equates a download request with a
physical disk write. `exportPart` remains only for compatibility, not product UX.
Source: recorder export/storage/host + Settings panel; tests:
`recorder-complete-export.test.mjs`, `test-recorder-complete-export.mjs`, independent
Python ZIP/CRC/hash/CSV verifier. Real Chromium page/IDB/download proof is separate
from installed Chrome and live R2; neither is inferred from these fixtures.
