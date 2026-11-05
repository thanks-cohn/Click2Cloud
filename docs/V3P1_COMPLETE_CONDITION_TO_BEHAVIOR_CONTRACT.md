# V3+1 — Universal Engine API & Complete Behavioral Contract

> **P0 OWNER PRIORITY OVERRIDE — /scaffold IS THE END PRODUCT.** Read [the controlling scaffold-first Codex directive](CODEX_P0_SCAFFOLD_FIRST_DEBUG_API_SURROUNDS_PRODUCT.md) and `../scaffold/README.md` **before following older instructions**. Build the actual `/scaffold` GUI, composite **Simple + Narrow + optional additive Depth** real native Chrome menu and verified save pipeline. **Build/extend Glaciaring AROUND the real product/engine** as its low-overhead debug/diagnostic interface, not as the product itself or a prerequisite that postpones the product. Older exclusive-mode/minimal-workbench/1,000-tests-first wording is superseded. Maintain security, live-Chrome, OAuth, provider, resilience and honest proof requirements.
**Project:** Click2Cloud V3+1, intended as a transplantable replacement for REDOWN's Cloudflare right-click V3 engine.
**Applies to:** cloud connection, R2 enrollment status, bucket and Worker provisioning, shared Refresh and Activate Buckets, universal file API, folder inventory, independent Simple/Nested/Depth projections, destination editor, actual Chrome native right-click menu, capture/transfer/verification, other cloud siblings, restart/recovery, and migration.
**Owner standard:** The interface is only a surface above working APIs. Every enabled control must perform the real action and report its real outcome. No fake progress, assumed receipt, or success simply because a request was sent.
**Status:** **NORMATIVE TARGET / ACCEPTANCE SPECIFICATION, NOT A CLAIM THESE FEATURES ARE ALREADY IMPLEMENTED.**
**Scope:** V3+1 is a *specialized right-click configuration engine and test workbench*, **not** another complete file explorer. Existing REDOWN universal file operations and per-bucket Worker protocol are the substrate.
**Canonical implementation request:** [CODEX_BUILD_REAL_V3_PLUS_ONE_NOW.md](./CODEX_BUILD_REAL_V3_PLUS_ONE_NOW.md) and [CODEX_AUTONOMOUS_V3P1_RUNBOOK.md](./CODEX_AUTONOMOUS_V3P1_RUNBOOK.md).

## 0. How to read and edit this page
Each row defines **a detected condition**, **the required behavior**, and **minimum proof to mark it PASS**. Treat a row as incomplete until an implementation and a test/receipt establish the behavior. Permission requests, billing enrollment, or consent may require the user; the automated run continues everything else. Mark rows **PASS / FAIL / BLOCKED / NOT_TESTED**, with source commit, test, timestamp, and environment. A unit test is **not** a live Chrome or R2 upload receipt.

This is a *target contract*, and differs in places from REDOWN's current behavior. Source references for verification: REDOWN `extension/background.js` (`createBucket`, `setupRedownQuickDestination`, `deployCloudflareProfile`, `activateAllBuckets`, `runGlobalActivation`, `refreshV3Inventory`, `buildMenus`, `chrome.contextMenus.onClicked`); `extension/beta/explorer.mjs` (`refreshConnection`, `listing`, `loadAccounts`, `paintActivation`, `prepare.onclick`); `extension/right-click-v3.js`; `extension/google-drive-menu.js`, `dropbox-menu.js`, `onedrive-menu.js`; Click2Cloud `src/explorer/*`, `src/dashboard/*`, `src/core/*`.

## 1. Non-negotiable architecture
```text
Authorization / Cloudflare entitlement → Shared Activation Service
                 │                           ├─ Create/reuse 'redown'
                 │                           ├─ Provision/reuse REDOWN Worker
                 │                           ├─ Verify bucket/Worker capability
                 │                           └─ Report evidence and readiness
                 ↓
         Universal File API → authenticated provider adapters → real R2 / Workers
                 ↓
       Read-only canonical folder inventory, account + bucket + path scoped
           ┌──────────────┼──────────────┐
           ↓              ↓              ↓
      SIMPLE module   NESTED module   DEPTH module
       own state        own state       own state
           └──────────────┼──────────────┘
                          ↓
                 Versioned MenuSpec
                  ↙               ↘
          Workbench preview      Real Chrome registrar
                  \               /
                   Canonical SaveIntent
                          ↓
                 One verified dispatcher
                          ↓
         Provider receipt + independently checked outcome
```

**Importantly:** REDOWN's historical `remoteIngest` receives a source URL in its Worker, while Click2Cloud's newer provider-privacy goal is to forward file bytes and minimal metadata only. Do not treat these as the same mechanism. Preserve authentic REDOWN behavior until the privacy-correct path has been implemented and proven, and label any scope gap.

## 2. Condition taxonomy and priority
Use specific machine-readable reason codes. A top-level state is **not** derived solely from the presence of an OAuth token, a bucket name, or a menu row.
- **Connection:** `disconnected`, `authorizing`, `connected`, `expired`, `revoked`, `insufficient-scope`, `unknown`.
- **R2 enrollment:** `enabled`, `not-entitled`, `unknown`; an empty list is **not** not-entitled.
- **Bucket:** `absent`, `creating`, `found`, `accessible`, `inaccessible`, `unknown`.
- **Worker:** `absent`, `deploying`, `health-unverified`, `ready`, `failed`, `unknown`.
- **Activation:** `not-requested`, `running`, `ready`, `partial`, `failed`, `needs-user-action`.
- **Chrome menu:** `not-registered`, `applying`, `registered`, `superseded`, `failed`.
- **Save:** `queued`, `capturing`, `uploading`, `verifying`, `completed`, `partial`, `failed`, `cancelled`, `uncertain`.

**Decision precedence:** unreconciled write outcome → do not blindly retry; revoked/expired auth → reconnect; verified R2 entitlement issue → Enable R2; insufficient authorization → Reconnect & Approve; Worker/provisioning fault → Activate Buckets repair; read-only listing issue → Refresh; all dependencies verified → Ready. Only the relevant control gets the attention glow.

## 3. Cloudflare sign-in, authorization and account selection

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| User has not signed in | Show Connect Cloudflare; leave local editor readable but disable live saves/provisioning; never impersonate a session | No provider write; explicit disconnected state; connection flow opens on user gesture |
| User is authorizing | Display non-blocking pending state; deduplicate concurrent login requests; maintain stored menus without false readiness | Exactly one login attempt; no duplicate browser windows or profile mutations |
| OAuth authorization succeeds | Verify account identity, permission coverage and R2 capability before provisioning; begin authorized automatic setup | Authenticated account lookup and capability checks precede any 'Ready' status |
| OAuth window closed or authorization denied | Show cancelled/denied, preserve prior healthy configuration and files | No Worker or bucket changes; restartable login |
| Token near expiry with refresh token | Use REDOWN authenticated transport's refresh lock; safely retry eligible reads once | Only one refresh attempt during concurrent reads; no token exposed |
| Token expired without refresh or refresh rejected | Show Reconnect & Approve; never turn a 401 into an R2 subscription prompt | No provisioning; provider leaf cannot falsely save |
| 403 has insufficient Cloudflare scope | Report missing capability when ascertainable; show Reconnect & Approve only | Scoped permission error distinctly classified from not-entitled |
| 403 is ambiguous | Keep entitlement unknown; show check access or reconnect, not Enable R2 | No false billing diagnosis |
| Connected user has multiple Cloudflare accounts | Use explicit previously chosen account, not last-clicked bucket or arbitrary first result | Account identity stable across view changes, restarts and retries |
| Cloudflare account is removed or access revoked | Mark its profiles unusable, preserve destination definitions, fail related saves closed | Other accounts continue; no wrong-account Worker calls |
| Cloudflare accounts pagination | Collect all permitted accounts with bounded pages and repeated-cursor detection | Missing-page and repeated-cursor tests, no false complete flag |
| Cloudflare temporarily unreachable during sign-in verification | Preserve auth without claiming success; retry bounded safe read | Network error does not clear valid consent or provision |
| User signs out | Remove/expire local auth per REDOWN contract; maintain files and user-defined menu backup | No cloud object deletion; all saves requiring that auth are blocked |
| Account display name changes | Match stable account ID, not display label | Same destination still resolves to same account |


## 4. R2 enrollment, first-run bootstrap and default bucket

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| R2 confirmed enabled and authorized | Automatically ensure the default bucket and Worker, then register the default Simple right-click save without mandatory manual clicks | Live user-owned bucket and Worker verified; native menu acknowledged |
| R2 confirmed not enabled / not entitled | Show separate Enable R2 control linking to Cloudflare enrollment; never pulse Activate Buckets for payment | Entitlement-specific evidence; no automatic checkout/acceptance |
| R2 entitlement unknown because 401, 403 or timeout | Do not guess subscription state; display Check access / Reconnect as appropriate | No Enable R2 from speculative error classification |
| R2 enabled but account lists zero buckets | Create lowercase 'redown' after authorized setup; read back list to confirm creation | Exactly one redown bucket exists; worker then prepared |
| An existing 'redown' bucket is present | Reuse account+bucket, preserve objects and settings; do not recreate | No create call and no object overwrite |
| Existing 'redown' bucket contains user files | Proceed with preparation non-destructively; default destination is bucket root unless previous selected prefix exists | Original keys, public access and metadata unchanged |
| User's R2 bucket list has other names but no 'redown' | Create redown once; do not force user to rename any existing bucket | Existing buckets still exist; redown present |
| User has several authorized accounts | Provision default only in chosen/established account; do not create redown across all accounts | No accidental account-wide bucket proliferation |
| Bucket create returns success but list read-back fails | Mark outcome unverified; reconcile by querying bucket before any retry | No duplicate create/unchecked success |
| Bucket create times out after possible acceptance | Treat as uncertain and reconcile; never blind POST duplicate | No repeated uncontrolled create calls |
| Bucket name collisions or account quota reached | Report concrete failure, preserve unrelated buckets; Activate Buckets may offer retry after account action | No partial bogus default or other account fallback |
| Subscription completed externally | Detect on explicit Refresh or bounded lifecycle check; resume already authorized setup automatically | No additional manual Activate Buckets required |
| R2 feature is disabled after prior readiness | Invalidate save readiness and show Enable R2 only after actual entitlement evidence | No stale success and no unrelated deletions |
| User lacks Cloudflare API permission for bucket creation | Request narrow authorized permission rather than silently bypassing security | No unapproved bucket API write |
| User connects an account with pre-provisioned REDOWN Worker | Reuse healthy matching Worker and profile; avoid redeploy for label-only edits | Unchanged Worker version and existing files |


## 5. Worker lifecycle, bindings and health

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| Bucket exists but matching Worker absent | Provision REDOWN-compatible Worker bound to exact account+bucket after authorization | Deployment metadata, binding and health verified |
| Matching Worker already healthy (v6 protocol or compatible current version) | Reuse, preserving existing secret, route and data | No gratuitous redeploy or secret replacement |
| Worker source is incompatible with required actions | Report compatibility gap; perform controlled versioned upgrade/repair only when authorized | Capability handshake includes expected protocol, not merely HTTP 200 |
| Worker R2 STORAGE binding points to wrong bucket | Do not save; repair correct binding after verified authorization | Binding account+bucket identity matches selected destination |
| Worker script uploaded but workers.dev route not enabled | Enable permitted route where original REDOWN contract requires; verify exact URL | Reachable health check and exact script-name URL |
| Worker route responds HTML or non-JSON | Reject readiness; never assume health because HTTP 200 | Typed malformed-response failure |
| Worker health lacks secretConfigured or storageBound | Mark not ready and surface Activate Buckets repair | No save routing until both verified |
| Worker health claims ready but capability incompatible | Block affected operations, record capability mismatch | Contract handshake/feature test prevents false Ready |
| Worker token missing, stale or rejected | Use trusted repair path; never source a token from GitHub or expose in menu | Credentials stored in privileged host only |
| Worker private token rotates | Reconcile profile + Worker together, invalidate stale in-flight credentials safely | No broken paths pointing to old secret |
| R2 public access settings are intentionally disabled | Keep files private; activation must not enable public assets as a side effect | Provider config unchanged; private object inaccessible anonymously |
| Worker deployment fails midway | Persist stage and failure; retry safe steps after inspecting existing deployed script/binding | No duplicate Workers or false menu acknowledgement |
| Worker build succeeds but no public route exists in isolated lab | Count as build success only, not end-to-end app readiness | CI result separate from live Chrome and public endpoint tests |
| Worker health fails transiently | Bounded retry/backoff and optional manual Activate Buckets, no unbounded thrash | Time limit and final actionable message |
| Worker reports hard quota, script or entitlement error | Classify accurately; never reroute to unrelated Worker/bucket | No wrong-account writes |
| Additional bucket needs Worker | Prepare that bucket independently; default ready bucket remains usable | Per-bucket readiness and retries |
| 18 old REDOWN services + redown-root service exposed to lab | Reference actual Worker interfaces; restrict writes to explicitly approved disposable prefix targets | Binding names and per-Worker auth verified without touching customer objects |


## 6. Refresh — exact read-only REDOWN parity

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| Click Refresh with active bucket/folder | Call Universal File API list for selected account, bucket and prefix; update actual contents | Source operation 'list', no create/provision calls |
| Click Refresh without active folder | Discover authorized accounts then paginated bucket lists | Source operations 'accounts' and 'buckets' only |
| Current folder has more than one page | Maintain cursor and load all requested pages; no dropped or duplicated entries | Real cursor fixture test |
| No files exist in current prefix | Show truly empty, not R2 not enabled or activation failure | Successful empty list recorded |
| One account fails while others list | Keep successful results and surface partial discovery error; do not mark all ready | Per-account error evidence |
| Refresh succeeds after stale cached inventory | Replace or merge only read-only observations for the same account+bucket path | No Simple/Nested/Depth config mutation |
| Folder list request 401/403 | Show auth issue and Reconnect when appropriate; never activate Worker as implicit recovery | No provisioning from Refresh |
| Folder list returns 429/502/503/504 | Bounded safe-read retry using valid Retry-After, then actionable failure | No infinite retries or false success |
| Refresh is clicked during a save | Do not invalidate in-flight destination identity; reconcile resulting listing after receipt | No misrouted save |
| User switches accounts during Refresh | Discard superseded response, retain new account choice | Generation/cancellation test |
| Current folder disappears since last browse | Offer root/nearest valid location recovery; don't fabricate objects | No bucket mutation |
| Refresh from offline state | Show cached data clearly stale if available; preserve source identity | Never label cache as live listing |
| Refresh updates a Depth tree | Produce a new versioned inventory snapshot; Depth can reproject without resetting depth preference | Mode config hashes unchanged |
| Refresh updates Narrow folder visibility | Retain configured paths and warn if inaccessible; do not delete them | No silent menu selection loss |
| Refresh pressed repeatedly | Deduplicate/rate-limit reads and show stable progress | No runaway account enumeration |


## 7. Activate Buckets — exact privileged REDOWN parity

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| User clicks Activate Buckets while connected | Send a privileged, authorized activateAllBuckets request with explicit confirmation | Original REDOWN service behavior, not a fake state change |
| Auto-first-run setup was already authorized | Run equivalent idempotent activation in background without another UI click | Proof of previous consent and matching authorized account |
| User is disconnected | Do not attempt Worker deployment; offer Connect Cloudflare | Zero cloud writes |
| User is authorizing or activation already running | Deduplicate operation and show persisted progress | One activation job per session/authority |
| Accounts contain multiple eligible existing buckets | Enumerate and prepare each independently, record per-bucket state | Each account+bucket has a verified profile or typed failure |
| One bucket fails, others succeed | Mark partial; keep successful profiles and menu routes valid | No rollback of independent successes |
| Click Retry Failed Buckets | Retry only pending/failed/unverified targets; reuse verified successes | No redeploy of healthy Worker |
| Cloudflare session changes mid-activation | Stop/reconcile; never continue under unrelated account authorization | No mixed-session writes |
| MV3 service worker suspends during activation | Recover from persisted job and alarm/explicit next host wake as supported | No lost or duplicate job |
| Health verification passes but Chrome menu rejects registration | Do not claim everything ready; show menu registration problem separately | Activation status + registrar receipt are distinct |
| Activation status ready but discovered inventory has changed | Reconcile new eligible buckets and prevent false global Ready | All current eligible targets checked |
| New user bucket is created later | Detect on re-discovery and prepare if authorized; keep default working | No forced menu clutter |
| Activate Buckets called twice rapidly | Return same ongoing job and progress, not two deploy loops | No duplicate job IDs |
| R2 not subscribed / entitlement denied | Do not redirect Activate Buckets into payment; show separate Enable R2 | Correct control highlighted |
| Cloudflare permission insufficient | Show Reconnect & Approve; never disguise as Worker failure alone | Specific missing operation/capability |
| An 'unknown' Worker state occurs | Retain state and ask for inspection before destructive repair | No false success or unnecessary overwrite |
| User is viewing a different mode | Activation must not modify Simple/Nested/Depth choices, labels or revisions | All three mode snapshots byte-identical |


## 8. Shared inventory, identity and virtual folders

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| Read bucket folders | Use actual Universal File API and R2 delimiter/prefix listing; account+bucket+path identifies a node | No made-up folder tree |
| R2 uses object prefixes, not real directories | Recognize both virtual prefix entries and zero-byte trailing-slash markers | Empty folders show correctly |
| Folder exists only through descendants | Discover its natural ancestor even without explicit marker | Deep tree parity |
| Folder marker exists but no child files | Expose as empty folder, not an absent destination | Marker test |
| Folder name contains spaces, emoji, Unicode | Preserve exact name and path bytes; validate prohibited traversal | No lossy normalization |
| Sibling folders differ only by case | Preserve case-sensitive identity and distinct destinations | Exact-prefix resolution |
| Identical leaf names under different parents | Resolve with account/bucket/full prefix, never just label | Two distinct targets |
| Folder name is '.' or '..' or path contains empty segments | Reject unsafe navigation without modifying storage | Traversal test |
| Folder list is paginated with repeated cursor | Detect loop and return incomplete/inventory warning | No infinite loop or false complete |
| A discovered folder is removed remotely | Mark inaccessible/stale, preserve config for possible recovery, do not redirect to parent | No surprise save location |
| Deep folder tree exceeds Chrome menu limits | Bound projection with explicit warning, no unbounded recursion | Deterministic cap and accessible fallback |
| Folder inventory from one bucket is stale | Refresh that bucket only; do not invalidate unrelated scopes | Cache isolation |
| User owns buckets with same name in different accounts | Treat as distinct immutable account+bucket identities | No cross-account collision |
| Partial inventory timed out | Keep verified known nodes; mark unscanned branches incomplete | No implicit deletion of unvisited paths |
| Inventory refresh races destination Apply | Version-check source revision; reject/supersede obsolete result | Latest confirmed spec wins |
| Directory is not writable | Display folder but disable save action with explicit permission reason | Read permission != write permission |


## 9. Independent Simple mode

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| Simple selected | Project only Simple module's own configured flat destinations | Nested/Depth configs unchanged |
| Only one verified default bucket configured | Cloudflare should be directly actionable according to REDOWN native leaf contract | One-click native save with no extra page |
| Additional Simple paths configured | Render native actionable destinations as intended, with exact labels and path IDs | Every leaf resolves uniquely |
| No custom Simple label | Default to lowest folder name; if bucket root, bucket name | No blank/menu-debug text |
| User changes Simple label | Update Simple config and native label only; no changes to other mode settings | Other mode snapshot hashes unchanged |
| User removes a Simple destination | Remove only its native action, never delete the remote bucket/folder | R2 object count unchanged |
| User adds two locations in same bucket | Keep separate canonical IDs and independent destinations | No overwriting first location |
| Two Simple destinations share label | Ask use anyway or rename; if same display label retained, disambiguate deterministic actual menu identity | No silently ambiguous click |
| User changes default Simple target | Rebind only default after validating exact identity and authorization | Old default not used unexpectedly |
| Default is temporarily unverified | Disable only unverified save, show repair; do not redirect to another bucket silently | No false saving |
| User returns to Simple after months in Depth | Restore previous Simple destinations, order and labels | Round-trip test |
| Simple empty configuration | Offer non-actionable setup guidance without installing misleading save command | Click cannot navigate as if saved |


## 10. Independent Nested / Narrow mode

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| Nested selected | Project only Nested module's configured authorized endpoints plus natural ancestors | Simple and Depth configs unchanged |
| One configured deep path | Show correct natural ancestry, no mandatory Browse Folders click | Nested preview/native parity |
| Ancestor has no configured save intent | Render navigation branch only, not save action | No accidental parent save |
| Ancestor is itself a configured endpoint with children | Provide explicit Save here actionable child | Parent and descendant both reachable |
| Multiple selected leaves share ancestors | Merge shared branch once without deleting leaf-specific labels | Single common parent; distinct leaves |
| Two branches have duplicate leaf labels | Keep both if parent identities differ | No collision across unrelated parents |
| Two siblings use same custom label | Resolve collision explicitly before Apply, preserving configured identities | No duplicate native IDs/silent reroute |
| Custom label override on an intermediate level | Apply only to intended Nested step, not Simple or Depth folder names | Isolation test |
| User removes one configured Narrow leaf | Remove only that selection; prune unused display ancestor, not stored cloud folders | No object deletion or unrelated leaf loss |
| User adds path via autocomplete or pills | Persist exact canonical account/bucket/prefix and label | Same path from typing or clicking |
| Configured path no longer accessible | Retain definition as inactive and explain; do not redirect to root | No wrong-location save |
| User switches Nested → Simple → Nested | Restore exact selected branches, labels, order and expansion semantics | Config equality |


## 11. Independent Depth mode

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| Depth selected | Project actual eligible discovered folders to chosen depth, including ones never manually configured | Tree fetched from Universal File API |
| Depth=1 | Show bucket roots and first eligible folder layer according to formal depth convention | Golden snapshot |
| Depth changes 3→5→3 | Change Depth projection only, retain all verified inventory and other module state | Round-trip invariants |
| Depth=10 or deeper supported value | Render to configured limit within Chrome cap and safety budgets | Deep fixture test at 10 and 16 |
| Depth includes new remote folder | Expose after refresh if eligible, without manual destination configuration | Real listing test |
| Depth tree contains branch also actionable | Provide correct Save here child or action behavior under Chrome restrictions | No branch-as-leaf confusion |
| Bucket checked for Depth | Enable only chosen authorized bucket and correct root | No accidental bucket additions |
| Bucket unchecked for Depth | Remove only its Depth projection, not bucket activation/other modes | No storage changes |
| Huge/wide tree surpasses native limit | Offer bounded deterministic projection and explicit incomplete state | No Chrome failure or fake completeness |
| One bucket scan fails | Show other buckets; mark partial tree with retry path | No global removal |
| User switches Depth→Nested→Depth | Restore depth per bucket, checked buckets and eligible inventory | Isolation test |
| Depth sees an unconfigured path | Route real save to that exact path after auth verification | No forged destination |


## 12. Destination editor, autocomplete and hierarchy pills

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| Type a long destination path | Autocomplete from current authorized tree without stealing focus | Rapid typing/focus test |
| Click Parent pill | Navigate editor to exact parent, no cloud mutation | Path state matches actual ancestor |
| Click Sibling pill | Navigate to exact sibling, preserve bucket identity | No sibling from another account |
| Click Child pill | Navigate into exact discovered child | No invalid path concatenation |
| Parents/Siblings/Children rows overflow | Each row scrolls sideways, remains keyboard accessible | Mobile and desktop accessibility |
| Click + to add endpoint | Add to active mode only, validate permission/path first | Other mode state unchanged |
| Click red X remove | Remove configured menu target only, never delete folder object | No R2 write |
| Type path that has not been discovered | Offer safe refresh/discover or explicit create-folder choice, do not invent success | No phantom folder |
| Create new cloud folder requested | Invoke real mkdir/marker creation via Universal File API and read back before selection | Verified marker/visibility |
| Folder creation denied | Show failure; do not add working save destination | No enabled false route |
| Edit menu label | Preserve immutable route identity; labels may change without redirecting saves | Route same before/after |
| Duplicate destination exact identity | Ask explicit Use Anyway decision or reject, with deterministic unique ID policy | No silently duplicated transfer |
| Apply configuration | Validate complete resulting MenuSpec, invoke single native registrar, persist only on verified ack | Ack generation matches desired spec |
| Apply fails in Chrome | Retain previous known-good menu or reliable recovery, show failure | No false Applied |
| User closes editor with unsaved changes | Preserve committed config and optionally draft; no automatic cloud mutation | No unintended apply |



## 13. MenuSpec compiler, route identity and invariants

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| Same inventory and mode settings supplied twice | Compile an identical versioned MenuSpec; no DOM, Chrome or networking in compiler | Golden snapshot and permutation property test |
| Different accounts have same bucket and path names | Bind canonical route to provider+account+bucket+prefix, not label alone | Distinct stable IDs and correctly dispatched objects |
| Two nodes produce same ID hash | Detect collision and fail before native registration | Injected collision test |
| Active mode changes | Select only that module projection; other mode configs stay unchanged | Three-config before/after hash comparison |
| Localized menu labels change | Resolve action by immutable IDs rather than displayed text | Save target remains identical |
| Nested actionable parent also has children | Produce explicit Save here child appropriate for Chrome constraints | Native menu routes to parent and child separately |
| Duplicate sibling labels occur | Require explicit conflict handling or deterministic clarification; never silently reroute | Validation plus native click regression |
| Discovered nodes are only partially scanned | Mark incomplete; never advertise full Depth tree as complete | Pagination failure and incomplete flag |
| Menu is over the browser's practical limits | Enforce bounded deterministic projection with visible warning | Native registration and cap test |
| Spec contains stale profile reference | Fail safely; never silently select different/default provider | No object appears in wrong destination |
| Compiler receives a token-bearing profile | Never serialize credential in IDs, labels or diagnostics | Secret canary absent in MenuSpec |
| No actionable destinations exist | Display setup guidance; no misleading saved-success action | Click yields explicit setup state |

## 14. Native Chrome menu registration and lifecycle

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| Fresh extension with no menu installed | Create one REDOWN root, verified Cloudflare entries, other-provider peers | Installed Chrome menu tree |
| Existing REDOWN native menu already registered | Reconcile with one writer/one click handler without duplicate roots | Repeated startup snapshot |
| Simple selected | Register direct actionable Simple leaf/leaves only | Native Chrome click E2E |
| Nested selected | Register natural hierarchy of selected endpoints | Native parent and leaf E2E |
| Depth selected | Register discovered hierarchy to selected depth, within Chrome limits | Actual Depth 1,3,10,16 test where supported |
| Only one Cloudflare default is verified | Cloudflare may be one native direct-save leaf | One click verifies selected bucket |
| Extra Cloudflare destinations are configured | Expose intended siblings, separator and Home default-save last | Native hierarchy/order and Home writes |
| Google Drive/Dropbox/OneDrive exist | Keep independent direct native leaves; never pull into V3 mode compiler | Existing provider fragment parity |
| Future independent S3 storage exists | Expose as sibling provider namespace, not nested inside Cloudflare | Native sibling and correct ID |
| Native menu item exists with changed title | Reconcile safely without changing destination identity | Same ID resolves after label change |
| User rapidly presses Apply twice | Serialize requests; latest valid generation wins | No duplicate entries or stale applied status |
| Chrome registration rejects an item | Report actual rejected item; retain/recover known-good registration | Injected chrome.runtime.lastError |
| Chrome MV3 worker sleeps and resumes | Recreate correct menu from persisted authoritative state | Restart integration |
| Old native item remains after mode change | Remove stale item without removing unrelated provider routes | No ghost/duplicate menu entries |
| Browser cache clearing removes ephemeral menu cache | Rebuild from persisted config or explain absent backup truthfully | Fresh startup parity |
| Menu style has impossible web-only hover effects | Preserve valid native Chrome title/parent/separator presentation | Do not promise custom native rendering |
| Click on stale native route ID | Reject and offer Refresh/Apply, never redirect to arbitrary root | Zero unintended cloud writes |

## 15. Right-click source capture and routing

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| User right-clicks a normal image | Capture actual selected source and immutable destination intent | Verified real image bytes in selected R2 bucket |
| Image uses currentSrc/srcset | Resolve correct selected resource rather than page URL | Source-byte identity fixture |
| User right-clicks a downloadable link | Fetch actual linked resource where authorized | File bytes rather than HTML page |
| User right-clicks video/audio | Use supported media source or explain unsupported capture | No mislabeled success |
| Source is blob: or data: | Use authorized in-browser byte acquisition or surface limitation | No bogus remote URL |
| Source needs cookies/session | Respect host permissions and origin restrictions; never bypass them | Authorized capture or explicit failure |
| Source redirects to new URL | Apply redirect policy and filename resolution with safety checks | No dangerous target or wrong file |
| Source responds 401,403 or 404 | Return source-stage failure and no provider success | No saved object |
| Source returns unexpected HTML error body | Validate appropriate type/bytes, report mismatch | No false image receipt |
| Source has no useful filename | Generate safe name with appropriate extension when known | Valid object key |
| Many right-clicks occur rapidly | Give each intent stable unique attempt identity and bounded queue | No lost or cross-routed attempts |
| Mode changes after the click | Keep original selected destination snapshot for in-flight operation | Old attempt stays on selected path |
| Native route ID no longer exists | Fail closed; do not fallback to random/default bucket | No wrong-destination write |
| User right-clicks an example image in dashboard | Use same MenuSpec and real dispatcher; tutorial mock must be separately labeled | Actual R2 receipt vs demo proof |
| Site prohibits byte capture | Report permission/capability limitation; don't claim saved | No unauthorized request |
| Source exceeds currently supported upload route | Explain actual size/streaming constraint, no truncation | Large-file negative test |
| Source page offers deceptive download anchor | Capture real file only, not navigational wrapper page | Selected asset bytes proof |

## 16. SaveIntent, provider operations and privacy

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| User selects destination | Resolve exact provider, account, bucket, prefix, conflict policy and spec version | Canonical frozen SaveIntent |
| Cloudflare authorization missing | Stop only that provider's transfer, offer reconnect | No Cloudflare object and other provider unaffected |
| Worker absent/not ready | Report bucket activation repair, not navigate to Explorer Home | No false save |
| Configured folder becomes unwritable | Fail with exact destination; never save to parent/root instead | No misplaced object |
| Source bytes captured | Send file bytes and minimal filename/type/destination metadata | Provider request payload trace |
| Browser provenance is available | Keep source/page/frame/link URLs out of destination-provider API calls | Source privacy test |
| Old REDOWN remoteIngest mode would send URL to REDOWN Worker | Treat separately from browser-bytes route; document exact privacy and TRUE REMOTE distinction | Distinct flow and acceptance labels |
| Worker reports upload accepted without committed object | Remain pending/uncertain until confirmed | No counter increment |
| Object readback size/hash mismatches | Report failed/uncertain with evidence; preserve safe recovery | Mismatch test |
| Network breaks after PUT might have committed | Reconcile before retry; avoid duplicate writes | Attempt ID and target HEAD |
| Destination has existing same-name file | Apply KEEP BOTH by default or explicit conflict policy | Original preserved |
| Save spans several chunks/multipart stages | Bound memory and reconcile completion before success | Large binary test |
| User cancels before write | Stop safely and report cancelled | No object |
| User cancels after uncertain commit | Report uncertain and reconcile, not claim cancellation removed object | Provider reconciliation |
| Several targets are selected in batch | Track per-item outcomes and overall partial/complete truthfully | Batch result matrix |
| Another provider leaf was chosen | Use independent provider handler, not Cloudflare projector | Provider dispatch isolation |

## 17. Filename, path, folder and conflict edge cases

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| Object with destination filename already exists | KEEP BOTH generates distinct key preserving extension | Two objects present and verified |
| User explicitly chooses Replace | Require authorization/expected version then verify updated bytes | Overwrite-specific evidence |
| User chooses Skip | Do not write an object | Existing object unchanged |
| Concurrent same-name requests race | Resolve unique keys without destructive collision | No overwritten source |
| Path includes emoji, Unicode, punctuation or spaces | Preserve exact valid key encoding | Exact key readback |
| Path contains traversal, control characters or empty segments | Reject before cloud write | Validation test |
| Key exceeds provider length limits | Reject clearly; never silently truncate destination name | No partial object |
| Empty folder is stored as zero-byte marker | Treat as folder, append child key beneath prefix | Folder remains visible |
| Remote folder has only descendants but no marker | Discover virtual prefix and ancestors | Real listing |
| User creates a new destination folder | Call Universal File API mkdir, verify marker/readback before menu Apply | Actual object/marker exists |
| User deletes destination in editor | Delete config only, never delete cloud files or folder | R2 list unchanged |
| Folder removed outside app | Keep inaccessible definition until user reselects; never fallback to parent | No surprise root upload |
| Identical folder names exist under multiple parents | Use full qualified identity | Correct object path |

## 18. Transfer receipts, progress and feedback

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| Context action clicked | Optionally animate immediate click pulse, explicitly not success | No counter change |
| Source capture completed | Show capture stage not verified save | No SUCCESS! |
| Upload started | Show actual progress when available | No fabricated timer progress |
| Worker acknowledged staging only | Show staging/commit pending | No completed count |
| Destination object confirmed | Mark completed only after provider receipt + agreed verification level | Receipt and readback |
| Provider receipts only metadata, not bytes | Report verification level accurately; do not claim SHA256 checked | Receipt fields grounded |
| Receipt or readback ambiguous | Mark uncertain, no success effect | Ambiguous test |
| Cloud provider rejects login/permissions | Show failure, preserve pending job evidence | No card increment |
| Cloudflare upload succeeds but History write fails | Keep verified save receipt; separately repair local History | No duplicate upload on retry |
| Chrome restarts before receipt stored | Reconcile exact attempt and object outcome | No guessed success |
| Retries yield duplicate success callback | Deduplicate counters/animations by receipt identity | Exactly once effect |
| REDOWN History GO TO is used after transplant | Receipt contains exact provider/account/bucket/key path for existing History | Verified GO TO behavior |
| Free/Premium History views differ | Deliver canonical record to REDOWN History rather than build another History system | No preview or premium regression |
| Persistent failure indicator is active | Map true failed/uncertain statuses to existing REDOWN Shelf contract | No false completed feedback |

## 19. Google Drive, Dropbox, OneDrive and S3 compatibility

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| Google Drive is connected | Preserve direct flat native leaf and its existing independent handler | Menu/dispatch snapshot parity |
| Dropbox is connected | Preserve direct flat native leaf and its independent handler | No nested regression |
| OneDrive is connected | Preserve direct flat native leaf and its independent handler | No nested regression |
| Any other provider is disconnected | Show appropriate provider login or unavailable state | No bogus cloud save |
| Provider token expires | Only that provider enters reconnect state; Cloudflare modes remain usable | Provider isolation |
| Dropbox reports success without real object | Do not treat as verified; require credible receipt/readback | False-success regression |
| Google Drive tries opening a new tab for direct save | Treat as failed no-tab product acceptance until fixed | Native no-popout test |
| OneDrive receives source that is not public HTTPS | Use authorized browser-fetched bytes, not public-only rule | Private-source capture test |
| Provider account changes | Keep canonical connection identity, no silent target swap | Correct account selection |
| Flat provider label changes | Only shared root menu composition changes; V3 mode configs remain byte-identical | Isolation snapshot |
| Additional S3 provider joins | Own sibling, own destination namespace and auth; not Cloudflare subfolder | Native menu proof |
| Cross-provider transfer unavailable | Do not expose a pretend transfer action | Capability gating |

## 20. Network, permission, runtime and recovery failures

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| Network offline before a request | Show offline/stale state without cloud mutations | No write |
| Network drops during safe listing | Retry bounded safe reads or report incomplete | No fake complete tree |
| Network drops after ambiguous object write | Mark uncertain and reconcile, never blind re-upload | No duplicate |
| Cloudflare API 401 | Use valid refresh flow once or request Reconnect | No infinite login loop |
| Cloudflare API 403 | Differentiate missing permission vs subscription only with direct evidence | Correct button highlighted |
| Cloudflare Worker 404 | Classify missing Worker route separately from source URL 404 | Stage-specific error |
| R2 409 conflict | Use explicit conflict strategy | No unintended overwrite |
| 413 or configured size ceiling | Report route limit and preserve original file | No truncation |
| 429 or Retry-After | Bound retry and concurrency with backoff | No retry storm |
| 502/503/504 temporary errors | Retry reads safely; writes require outcome reconciliation first | No duplicate writes |
| Browser abort or timeouts | Preserve uncertain state if provider might have written | Attempt recovery record |
| One bucket activation fails | Preserve successful other buckets and working Simple default | Partial state |
| Local config persistence fails | Keep last acknowledged config; don't show Applied | No phantom state |
| MV3 service worker suspends | Persist jobs and recover on next authorized wake | Restart test |
| Worker returns HTTP 200 with malformed JSON | Reject false positive | No verified flag |
| Stored inventory is stale | Mark stale and refresh by exact bucket | No unknown nodes assumed writable |
| Cloudflare session switches mid-operation | Stop/reconcile; do not write to unrelated account | Cross-account isolation |
| Cleanup fails | Report safe remaining staging keys; don't delete anything else | No unintended object loss |

## 21. Persistence, migration and transplant rollback

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| Simple settings saved | Use isolated schema/revision and stable IDs | Cold restart proof |
| Nested settings saved | Keep independent configured endpoints and labels | Simple/Depth unmodified |
| Depth settings saved | Keep per-bucket scopes/limits only in Depth state | Simple/Nested unmodified |
| Folder inventory cached | Record account/bucket/prefix, completeness, revision and timestamp | No cross-account merge |
| Cloudflare reconnect occurs | Restore definitions but require renewed authorization before action | No stale auth |
| Import legacy V3 state | Migrate defaults, profiles, custom paths and labels without loss | Before/after invariant report |
| Legacy Simple and Narrow share one destination array | Make separate mode-owned copies on migration with explicit choices for ambiguities | No shared mutations after migration |
| Legacy Depth scopes migrated | Keep checked buckets and configured depth | Golden parity test |
| Legacy labels collide | Report conflict and preserve both canonical paths for resolution | No silent drop |
| Migration interrupted | Revert to known-good configuration and menu | Rollback test |
| V3+1 schema unavailable | Keep existing V3 enabled; don't remove menu routes | Feature-flag recovery |
| User requests rollback after transplant | Restore prior V3 state and native menu without deleting R2 objects | Verified cold restart |
| Storage cleared and no backup exists | Explain loss of config honestly; reauthorize as needed | No fabricated credentials |
| One mode module is swapped out | Migrate only its own schema; verify others have same snapshots | Module replacement test |
| Default target changes while save in progress | Freeze in-flight intent and use new default for later clicks | No cross-route save |
| Legacy provider flat rows exist | Retain unchanged Google/Dropbox/OneDrive registration and handlers | Provider parity proof |

## 22. Dashboard controls, onboarding and attention signals

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| R2 and all Workers verified | Show Ready; keep Activate Buckets accessible without pulse | Stable quiet UI |
| R2 definitely not enabled | Show separate pulsing Enable R2; never use Activate Buckets for billing | Correct conditional action |
| Permissions insufficient | Show Reconnect & Approve and missing permission when known | No false subscription diagnosis |
| Worker setup or repair required | Highlight Activate Buckets only | Correct service action |
| Some buckets failed activation | Show Retry Failed Buckets count; retry scoped failures | Healthy buckets not redeployed |
| Refresh listing failed | Highlight Refresh or Reconnect as appropriate, not Activate by default | Failure ownership |
| Default redown ready while other buckets preparing | Allow first Simple save immediately with secondary progress | Real save during partial setup |
| All buckets ready | Stop animation; show READY and verified native menu status | Worker+menu evidence |
| User clicks Enable R2 | Navigate to Cloudflare enrollment without auto-accepting terms | Billing gate |
| User cancels Cloudflare enrollment | Preserve needs-R2 state and no write | No unintended setup |
| Entitlement status unknown | Show Check R2 access instead of Enable R2 | No speculative paywall |
| Activate already running | Disable duplicate action and display persisted progress | One job |
| Reduced-motion preference enabled | Replace pulse with static meaningful attention signal | Accessibility test |
| Light/dark/Neon themes | Use adaptive contrast and readable titles | Theme proof |
| Keyboard-only user | All controls navigable with correct accessible names | Tab/Enter/Space |
| Save fails because source unavailable | Do not pulse Activate Buckets for unrelated source failure | Correct explanation |

## 23. Security, permissions and automated lab limits

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| Untrusted external page requests provisioning | Deny; only authorized trusted internal host/session may invoke it | Sender guard test |
| Click2Cloud dashboard has its own route | Use own trusted host; do not spoof REDOWN explorer.html URL | No bypass |
| Lab has a Service Binding to deployed Worker | Do not interpret binding as authorization to write any object | Bearer auth negative test |
| Cloudflare OAuth token or Worker token exists | Keep in trusted storage only; never in DOM/logs/menus/GitHub | Secret scan |
| Remote ingestion could accept arbitrary URL | Constrain allowed source/network behavior to prevent SSRF/open fetch proxy | Unsafe URL test |
| Private R2 bucket activated | Do not enable anonymous object public access | Unauthenticated GET must fail |
| User has not granted account scope | Block out-of-scope bucket/Worker operations | No write |
| Billing enrollment required | Never auto-accept or modify billing, even in autonomous Codex run | Explicit user-owned consent |
| User declines new OAuth scope | Continue independently feasible work without bypass | BLOCKED gate |
| Provider privacy promise active | Only bytes, filename/extension and required destination metadata to destination provider | Request trace |
| Historical REDOWN true-remote sends URL to REDOWN Worker | Describe separate trust boundary, do not mislabel as no-source-URL mode | Integration documentation |
| Unknown customer R2 data present | Never touch outside approved disposable prefixes | Scoped mutation audit |
| Automated cleanup requested | Delete only created and verified lab fixture objects | No collateral deletion |
| Build logs include sensitive values | Suppress/redact secrets in all diagnostic output | Automated scanner |

## 24. Integration test matrix and performance

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| Live redown prefix exists | Exercise approved __redown_v3plus1_lab__/ only | Scoped key list |
| Four redown-bucket-N targets available | Test multi-bucket/public-private distinctions | Per-bucket matrix |
| 19 REDOWN Worker bindings in lab | Confirm bindings and capability surface, without arbitrary writes | Cloudflare config evidence |
| Nested depth-spine fixture reaches 16 levels | Verify Depth 1,3,10,16 modes | Golden snapshots and Chrome native test |
| Wide 12x4 fixture tree | Exercise ordering, cap and multi-sibling collision | Property/stress results |
| Unicode/case-sensitive/duplicate leaf paths exist | Route to exact full prefix | Byte-level object name check |
| One mode edited while another active | Verify two inactive config hashes remain identical | Mode isolation acceptance |
| 200 MiB binary corpus exists | Run real upload/copy/readback hash within supported size and bounds | SHA256 equality, not simulated |
| Object exceeds current Worker max | Report actual route capability, no uncapped claim | Expected hard limit |
| 10+ rapid save attempts | Bound concurrency; verify unique attempts and receipts | Count exact objects |
| Native menu reconciled repeatedly | No duplicate root or listener after 100 builds | Installed Chrome test |
| Source or destination network fails mid-transfer | Separate simulated fault injection from live failure proof | Evidence categories |
| Chrome restart during active operation | Reconstruct state and reconcile exactly once | Real browser session |
| Cloudflare CI build passed | Report compiler/unit proof only; not equivalent to live installed Chrome | Build logs with environment |

## 25. Required end-to-end user journeys

| Detected condition / user action | Required V3+1 behavior | Acceptance proof |
|---|---|---|
| First-time authorized user, R2 enabled, zero buckets | Create/reuse redown, real Worker, initial Simple leaf, real save verified | End-to-end cloud account to native save |
| First-time user, R2 not enabled | Separate Enable R2 link, user approval, automatic resume setup | No Activate-as-payment confusion |
| User lacks adequate OAuth scope | Reconnect & Approve, continue after authorized grant | No unauthorized provisioning |
| Existing REDOWN user with many buckets | Reuse Workers and default; activate other buckets independently | No data loss or redeploy storm |
| User switches Simple↔Nested↔Depth repeatedly | Each mode restores its precise settings and native actions | Round-trip browser proof |
| User creates a deep nested destination via pills | Real inventory, editor add, menu Apply, right-click save | Correct deep object key |
| User chooses Depth for newly discovered folder | Automatic inventory update and native menu navigation | Unconfigured path save |
| User clicks Refresh after remote folder modification | Only listing updates; no Worker changes | Read-only trace |
| User clicks Activate Buckets after one Worker fails | Only failed target repaired; healthy default save remains usable | Partial resume proof |
| Source site returns a broken link | Error recorded; no false success or icon count | No R2 object |
| Provider confirms bytes and object metadata | SUCCESS! and count exactly once, History GO TO points to correct key | Provider receipt+REDOWN history |
| Chrome registration rejects a menu node | Repair/revert known-good menu without losing other provider leaves | Native rollback proof |
| REDOWN receives feature-flagged V3+1 transplant | Legacy config migrates, external providers intact, rollback reverses safely | Production-like Chrome parity in isolated test |

## 26. Formal Universal Engine API surface

The condition tables above become implementable contracts through a small, coherent API. Names below are **proposed interface names**, not claims that existing REDOWN modules already export them. Reuse the existing Universal File API and background/Chrome handlers behind these operations rather than creating another storage implementation.

| Engine operation (illustrative) | Inputs | Outputs / state | Side effects and required authority |
|---|---|---|---|
| `getConnectionStatus()` | connectionId? | per-account auth, scope, expiry and entitlement evidence | read only; privileged status |
| `connectCloudflare()` | user gesture, desired scopes | authorization pending/succeeded/denied | launches Cloudflare OAuth, user-approved |
| `checkR2Entitlement()` | accountId | enabled/not-entitled/unknown + evidence | read only; never interprets empty buckets as not-entitled |
| `listAccounts()` | paging/signal | account IDs, names, completeness | REDOWN Universal File API `accounts` |
| `listBuckets(accountId)` | paging/signal | buckets, cursor, completeness | REDOWN Universal File API `buckets` |
| `refreshInventory(target?)` | account/bucket/prefix? | versioned read-only snapshot, errors | REDOWN `list`; no provisioning |
| `ensureDefaultDestination(accountId)` | existing user setup authorization | exact `redown` profile + proof | authorized create/reuse bucket, verify Worker |
| `activateBuckets()` | authorized internal host/session | persisted per-bucket job and progress | REDOWN `activateAllBuckets` service, no billing |
| `retryFailedActivation(jobId)` | job/session | verified subset and per-target errors | no replay of ready targets |
| `getWorkerCapabilities(target)` | profile identity | version, actions, binding and secretConfigured evidence | authenticated health; read only |
| `listFolders(target, cursor?)` | account, bucket, prefix | canonical nodes, cursor, incomplete flag | REDOWN `list` |
| `createFolder(target)` | authorized bucket+prefix | provider-verified folder marker | REDOWN `mkdir`, never pretend |
| `getModeConfig(mode)` | simple/nested/depth | schema, revision, settings | read only |
| `saveModeConfig(mode, patch)` | expected revision, validated patch | new revision or conflict | affects selected mode only |
| `compileMenu(mode, inventory)` | immutable config + inventory | versioned MenuSpec or typed error | pure deterministic, no network |
| `previewMenu(spec)` | MenuSpec | workbench tree with action IDs | presentation only |
| `applyNativeMenu(spec)` | expected generation | Chrome acknowledgment, applied generation | single trusted native registrar |
| `resolveSaveIntent(menuId, context)` | exact action ID + source context | canonical frozen SaveIntent | no network or transfer yet |
| `captureSelectedBytes(source)` | browser-authorized source | bytes/stream + minimal metadata | browser fetch/capture respecting permissions |
| `dispatchSave(intent, file)` | verified destination + source bytes | attempt ID and provider receipt/outcome | real upload, never fake success |
| `getSaveStatus(attemptId)` | stable attempt ID | queued/capturing/uploading/verifying/completed/uncertain/etc. | status lookup |
| `reconcileSave(attemptId)` | uncertain job | provider-confirmed outcome or still uncertain | safe readback before retry |
| `retryFailedSave(attemptId)` | confirmed failed attempt + policy | new linked attempt and result | no blind uncertain replays |
| `getMenuRegistrationStatus()` | optional generation | applied/rejected/status, error | Chrome state evidence |
| `exportMigrationSnapshot()` | profile/config version | redacted, versioned backup | never include secrets |
| `migrateLegacyV3(snapshot)` | versioned REDOWN state | three independent configs and preview | controlled, reversible migration |
| `rollbackV3Transplant(checkpoint)` | explicit reviewed migration checkpoint | restored old menu and config | no cloud file deletion |

### Standard result envelope

```ts
type EngineResult<T> = {
  requestId: string;
  state: 'completed'|'partial'|'failed'|'uncertain'|'cancelled'|'blocked'|'pending';
  data?: T;
  error?: {code: string; message: string; stage: string; retryable: boolean};
  evidence?: {source: 'unit'|'integration'|'cloudflare'|'chrome-native'|'provider-receipt'; at: string; verificationLevel?: string};
  revision?: number;
};
type CanonicalTarget = {
  provider: string; connectionId: string; accountId: string;
  bucketName?: string; prefix: string;
};
```

The API result is not permission to lie to the user: `completed` for a save requires the agreed provider confirmation, `registered` for a menu requires actual Chrome acknowledgement, and `ready` for a Worker requires health/capability evidence.

### UI actions versus API calls

The dashboard and right-click surfaces issue **intent**, never privileged ad-hoc cloud mutations. Selecting a tab, switching list/grid or drawing pills is UI state. Clicking Refresh calls `refreshInventory`; clicking Activate calls `activateBuckets`; modifying a destination calls `saveModeConfig`; Save Changes calls `compileMenu` then `applyNativeMenu`; right-click saving calls `resolveSaveIntent`, `captureSelectedBytes` and `dispatchSave`. Only these trusted operations can actually mutate resources.

## 27. Acceptance evidence template

| ID | Scenario | Expected API operation | Evidence source | Status | Actual result / issue / commit |
|---|---|---|---|---|---|
| C2C-001 | First run R2 enabled, no buckets | ensureDefaultDestination → activateBuckets | Cloudflare + Chrome native | NOT_TESTED | |
| C2C-002 | Refresh selected folder | refreshInventory → list | Live R2 GET trace | NOT_TESTED | |
| C2C-003 | Activate one failed Worker | retryFailedActivation | Worker status + menu generation | NOT_TESTED | |
| C2C-004 | Switch modes without state contamination | saveModeConfig + compileMenu | Unit/property + native Chrome | NOT_TESTED | |
| C2C-005 | Right-click source image to exact selected bucket | dispatchSave + reconcileSave | Provider readback + original byte hash | NOT_TESTED | |
| C2C-006 | Register native menu failure | applyNativeMenu | Chrome API error + recovered menu | NOT_TESTED | |
| C2C-007 | Import REDOWN V3 and rollback | migrateLegacyV3 + rollbackV3Transplant | Test migration and restored menu | NOT_TESTED | |

**Evidence rubric:** `UNIT` proves deterministic logic only; `INTEGRATION` proves contracts with adapters; `REAL_CLOUDFLARE` proves actual authenticated cloud API/Worker operation; `NATIVE_CHROME` proves installed browser menu; `PROVIDER_RECEIPT` plus readback proves real saved object. A successful `npm test` or Workers Build must not be relabeled as full end-to-end proof.

## 28. Intended transplant boundary

**Replace the REDOWN Cloudflare V3 destination projection/resolve/configuration behind its existing background composer, not all of REDOWN.** Preserve Google Drive/Dropbox/OneDrive handlers and their flat native leaf routes, existing REDOWN auth/activation mechanisms, shelf/History, existing Explorer and real cloud files. The V3+1 workbench is temporary engineering UI, not a second permanent File Explorer. Require a reversible feature flag, lossless migration report, last-known-good menu checkpoint, verified native browser parity, verified real R2 saves, and explicit review before cutting over.

## 29. What Codex must deliver

The next Codex run must implement actual operations and tests, not merely copy tables into code. For every implemented row: link to source and test or actual provider/Chrome evidence. For unimplemented rows, report `NOT_TESTED`/`BLOCKED` honestly and don't surface a fully enabled UI control that cannot run. Auto-complete all independently authorized engineering work; ask user action only for genuine Cloudflare entitlement, consent or permission gates. REDOWN's original deployment and other customers' buckets remain unchanged throughout the isolated Click2Cloud run.

