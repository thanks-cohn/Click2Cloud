# V3+1 — Complete condition → behavior → evidence contract
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


<!-- CONTINUED: further sections covering Chrome, saves, providers, failures, migrations, acceptance and evidence follow below. -->
