# Final plan — make Depth save through the existing engine

**Decision: partly endorse the candidate, replace its implied architecture change with a conditional surgical repair.** The existing code already implements Depth row → canonical target → shared engine/Worker. A new adapter, a second saving path, blanket preflight removal or registrar redesign is not the first fix. First identify whether the clicked physical bucket has the correct local plan in the same profile. Then correct exactly one demonstrated defect or satisfy a genuinely missing prerequisite with existing, explicitly authorized means.

This review makes **no application changes**. Baseline: `c7e75ce727cc81b78148d9e4c1f0510311dd44b0`. Read [the deficit ledger first](INITIAL_PROPOSAL_DEFICITS.md), especially D02–09 and D23–26. The review branch is `codex/depth-working-first-proposal-review`. Older linked implementation instructions are evidence, not authority to implement during this review.

## 1. Facts, unknowns and protected boundaries

**Established from the recorded Windows report, not independently repeated here:** build `6beaccf`, version 0.3.19, extension `ajppphdiamdobknpamcheohmdbdbeoal`; Depth click `depth-click:8437ba75-8344-4a57-9d3d-b50188942bd4` reached worker preflight with desired/ACK generation 26 and a diagnostic `WORKER_SETUP_REQUIRED / PLAN_MISSING`. A separate Narrow operation `0a90880e-4efe-470e-a2bc-326eb975e68d` verified a 31,571-byte object under `redown`. The latter proves its own historical outcome only. The clicked Depth target, same-account/bucket equivalence and contemporaneous local plan state remain unknown publicly. `PLAN_MISSING` is a later lookup observation (D04), not a retained snapshot of the rejection.

**Source-confirmed:** provisioner lookup key is the digest of account+bucket; changing folder prefix or menu mode does not change it. Transport checks canonical connection, prefixScope, session, protocol, Worker code and independent proof. Listing is separate. A missing plan contains no usable signing authority to send through the common engine. Depth and Narrow should have independent native item IDs even when physical action/target identity is shared.

**Do not change:** Simple/Narrow modules or behavior; provider visibility; their native IDs, configuration, defaults/Quick/history; existing menu structure/labels/scroll; discovery depth/sibling counts; shared registry key, identity scheme or Worker layout; OAuth/scopes; existing transfer/verification/conflict policy. No migration/reset/reinstall, new logger, scheduler, generic adapter, per-folder Worker, new dependency, or automatic remote mutation. No configuration “fix” that silently chooses redown instead of the clicked target.

A Depth guard is necessary but not sufficient isolation: shared caches and remote Workers can affect controls (D11/D23). If a necessary change cannot remain isolated, stop that specific modification and present the bounded shared proposal. Do not claim unchanged behavior from file diffs alone.

## 2. First decision: read-only owner-local comparison

Perform once in the **existing installed extension's service-worker DevTools**, not a website console, with the profile containing the reported records. Do not reload, switch profile, approve setup, login again or clear anything first. Record build revision/sourceDigest and Chrome version locally; the same version string is insufficient. Keep actual account/bucket/prefix values private. The snippet below verifies the existing database and uses a readonly transaction (aborting any schema upgrade), reads current registrar metadata and named plan entries, computes production keys and prints booleans/metadata; it does not call remote.status, save, setup or any storage write. No full plan, token, secret, URL, source bytes or account ID is printed.

```js
await (async () => {
  const {digest, PROTOCOL} = await import(chrome.runtime.getURL('src/cloudflare/wire.mjs'));
  const {BUILD_INFO} = await import(chrome.runtime.getURL('src/build-info.mjs'));
  const dbName = 'click2cloud-current-v1';
  if (typeof indexedDB.databases !== 'function'
      || !(await indexedDB.databases()).some(d => d.name === dbName)) {
    console.log({status:'STOP: existing database unavailable; do not initialize/reset it'}); return;
  }
  const db = await new Promise((resolve,reject) => {
    const q = indexedDB.open(dbName);
    q.onupgradeneeded = () => { q.transaction.abort(); reject(Error('STOP: unexpected database creation/upgrade')); };
    q.onerror = () => reject(Error('STOP: existing database could not be read'));
    q.onblocked = () => reject(Error('STOP: database access blocked'));
    q.onsuccess = () => resolve(q.result);
  });
  let depth, narrow;
  try {
    if (!db.objectStoreNames.contains('state')) throw Error('STOP: unexpected existing schema');
    const store = db.transaction('state','readonly').objectStore('state');
    const read = id => new Promise((resolve,reject) => {
      const q = store.get(id); q.onsuccess = () => resolve(q.result?.value);
      q.onerror = () => reject(Error('STOP: result read failed'));
    });
    const ids = ['depth-click:8437ba75-8344-4a57-9d3d-b50188942bd4','0a90880e-4efe-470e-a2bc-326eb975e68d'];
    const [a,b,legacy] = await Promise.all([read('remote-result:'+ids[0]),read('remote-result:'+ids[1]),read('remoteResults')]);
    depth = a ?? (Array.isArray(legacy) ? legacy.find(r => r.operationId === ids[0]) : null);
    narrow = b ?? (Array.isArray(legacy) ? legacy.find(r => r.operationId === ids[1]) : null);
  } finally { db.close(); }
  const physical = d => d && ['cloudflare','cloudflare-r2'].includes(d.provider) && ['accountId','bucketName','connectionId'].every(k => typeof d[k] === 'string' && d[k])
    && typeof d.prefix === 'string'
    ? {accountId:d.accountId, bucketName:d.bucketName, connectionId:d.connectionId,
       prefix:d.prefix.endsWith('/') ? d.prefix.slice(0,-1) : d.prefix} : null;
  const a = physical(depth?.destination);
  const b = physical(narrow?.receipt?.destination ?? narrow?.destination);
  const eq = (x,y,k) => x && y ? x[k] === y[k] : null;
  const equalTarget = (x,y) => x && y
    ? ['accountId','bucketName','connectionId','prefix'].every(k => x[k] === y[k]) : null;
  let trace = null;
  try { trace = JSON.parse(depth?.stage ?? 'null'); } catch {}
  const native = click2cloud.registrar.inspect();
  const row = native.desired?.rows.find(r => r.id === trace?.itemId);
  const meta = async t => {
    if (!t) return {recordDestinationUsable:false};
    const key = 'remoteTransport:' + await digest([t.accountId,t.bucketName]);
    const p = (await chrome.storage.local.get(key))[key];
    return {
      recordDestinationUsable:true,
      connectionValid:t.connectionId === 'cloudflare:' + t.accountId,
      planPresent:p != null,
      planState:p == null ? null : ['ready','pending'].includes(p.state) ? p.state : 'other',
      planIdentityMatches:p == null ? null : p.accountId === t.accountId && p.bucketName === t.bucketName,
      protocolMatches:p == null ? null : p.protocol === PROTOCOL,
      codeMatchesBuild:p == null ? null : p.codeDigest === BUILD_INFO.workerCodeDigest,
      selectedPrefixWithinPlan:p == null ? null : !p.prefixScope
        || t.prefix === p.prefixScope || t.prefix.startsWith(p.prefixScope + '/'),
      currentCodeWriteProofPresent:p == null ? null : !!p.codeDigest
        && Object.values(p.verifiedTargets ?? {}).some(v => v?.codeDigest === p.codeDigest)
    };
  };
  const [depthPlan, narrowPlan] = await Promise.all([meta(a),meta(b)]);
  console.log(JSON.stringify({
    build:{revision:BUILD_INFO.revision,sourceDigest:BUILD_INFO.sourceDigest,version:BUILD_INFO.extensionVersion},
    depthRecordPresent:!!depth,narrowRecordPresent:!!narrow,
    narrowRecordVerified:narrow?.state === 'verified',narrowReceiptPresent:!!narrow?.receipt,
    recordReceiptTargetAgrees:equalTarget(physical(narrow?.destination),physical(narrow?.receipt?.destination)),
    depthAt:depth?.at ?? null,narrowAt:narrow?.at ?? null,
    sameAccount:eq(a,b,'accountId'),sameBucket:eq(a,b,'bucketName'),
    sameConnection:eq(a,b,'connectionId'),samePrefix:eq(a,b,'prefix'),
    bucketRelation:a && b ? (a.bucketName === b.bucketName ? 'same bucket name' : 'different bucket names') : 'unknown',
    currentRowPresent:!!row,currentRowIsDepth:row?.origin?.mode === 'depth',
    currentRowMatchesRecordedDestination:equalTarget(a,physical(row?.target)),
    recordedGeneration:trace?.generation ?? null,recordedAck:trace?.acknowledgedGeneration ?? null,
    currentGeneration:native.desired?.generation ?? null,currentAck:native.acknowledgedGeneration,
    nativePending:native.pending,depthPlan,narrowPlan
  },null,2));
})();
```

These summaries are **current local metadata**, not current cloud readiness or historical proof. They intentionally omit actual bucket names; the owner can label them privately if necessary. A missing record or null comparison means **unknown**, never “different” or “fresh install”. A changed plan between the two reads remains possible. A currently present compatible plan does not prove it was present at the old click. The new build/profile may not retain the old records; do not switch/reset profiles as a diagnostic shortcut.

**Use the result to select one branch:**

| Observation | Immediate interpretation | Minimum next action / permissible future change |
| --- | --- | --- |
| Depth target differs from Narrow and is the owner's intended selection; its plan is genuinely absent | Legitimately different prerequisite is plausible, no proven routing bug | No save-engine change. Validate an existing exact-bucket approved preparation path and its effects; owner authorization remains required. Never switch to Narrow's bucket to make the test pass. |
| Depth row/record differs from its configured selected scope or original intent | Candidate Depth producer/stale-selection defect | Reproduce at selection → inventory → projector → bound row; correct only the earliest wrong Depth transformation. Preserve IDs/other targets where semantics permit; stale old selection fails visibly. |
| Same canonical connection/account/bucket in one profile, current lookup inconsistent | A shared physical registry entry should be addressed, but historical cause is not established | Reproduce actual storage key/load/lifecycle using production provisioner. Correct a proven Depth read/association bug only. No alternate key scan, foreign secret borrowing or parallel registry. If the store/provisioner itself is broken for all modes, stop and propose that bounded shared repair separately. |
| Matching plan now exists but is pending, stale-code, scope-restricted or lacks write proof | Not “just another folder”; a different prerequisite is unready | Retain distinct pending/PREPARED/upgrade/scope outcomes. Diagnose owned interrupted setup/readback under existing scope; no widening or redeploy until explicitly authorized. |
| Same target, valid current plan and scoped readiness, but Depth still diverts to attention | Candidate false Depth blocker | Add real-module paired regression, then make the smallest Depth-only freshness/fallback correction. Keep native/current/session/capability checks; prove no cached-negative FRESH_CLICK_REQUIRED regression. |
| No records/current row or inaccessible local state | Evidence unavailable, not license to reset | Keep history intact. Give one new safe reproduction using current metadata only when authorized. Complete fixture analysis independently; leave exact historical cause unknown. |

## 3. Ranked options

Rankings describe usefulness **under the observed condition**, not invented probabilities.

| Choice | Code touched / isolation | Chance of helping this save | Complexity / migration / failure risk | Recommendation |
| --- | --- | --- | --- | --- |
| A. Correct exact prerequisite or demonstrated Depth target/association fault | None for a legitimate prerequisite; otherwise its existing Depth producer/integration branch only | Directly addresses missing plan/incorrect selected target when proven | Lowest change; no migration. Safe remedy may require explicit remote authority or validated existing private state recovery | **First choice** |
| B. Preserve current pipeline; remove only a proven Depth observational storage/feedback blocker | native-click and Depth feedback block, tests; no engine/registry change | Helps the specific storage/no-response case, not PLAN_MISSING | Small but must distinguish optional attempt history from mandatory authoritative persistence | Small independent patch only after its failing test; do not substitute for plan resolution |
| C. Reduce duplicated Depth preflight through a tested Depth-scoped host boundary | Depth hook plus narrowly gated host use of the existing engine | Useful only if a demonstrated readiness divergence remains with a good plan | Medium: cache/session/attention behavior is shared. No extra global cache; no bypass of capability checks | Conditional follow-up, after A; not a prerequisite for one working save |
| D. Globally separate authorization/readiness or redesign shared registrar/save pipeline | Shared host/engine/transport paths | Does not supply a missing secret; may benefit later design | Highest protected-mode regression surface and verification burden | **Defer/reject for this P0** unless separately authorized from a concrete shared defect |
| E. New Depth adapter, upload engine, per-folder Worker or credential/registry migration | New abstractions/state/identity/resource layout | No evidence it fixes the failed plan lookup | Duplicates existing ownership, threatens identity/security/noninterference | **Reject** |

The better solution is A's evidence-driven decision tree. A valid final result may be “no application-code defect; selected bucket needed approved preparation”, provided the owner then achieves the required save under proper authority. Reporting only a better error does not meet the working-file gate.

## 4. Exact future implementation sequence and ownership

1. **Freeze the baseline.** Fetch current source again, preserve dirty owner files and existing profile state, record source/build digest and native ID. Run focused baseline checks and capture known failures. Record Simple/Narrow configuration, menu plans and save controls without editing their settings.
2. **Resolve §2 once.** No new diagnostic subsystem. Use existing records and the production key computation. If it gives a genuine prerequisite branch, do not start a routing refactor.
3. **Reproduce the selected failing predicate with real modules.** Keep current small unit tests, but add one production-wiring fixture using existing provisioner load/store, onboarding, background host where feasible, engine, remote transport and existing Worker/workerd harness. Inject OAuth/browser/provider boundaries only. Assert that a missing registry entry cannot be a verified save. Independently inspect fixture storage/readback, not a returned `verified` literal. Production module probes in the evidence index already show lookup identity and diagnostic-read ambiguity; they are not live repairs.
4. **Implement one surgical correction, if demonstrated.**
   - Wrong target: current `src/modes/depth/index.mjs`, `src/explorer/depth-inventory.mjs` or Depth-selected inventory/commit branch in `extension/background.mjs`, whichever first diverges. Do not change common normalization to make an invalid target acceptable.
   - Wrong association/freshness/fallback: `src/modes/depth/native-click.mjs` and the existing Depth-origin integration in `extension/background.mjs`. Preserve resolver/engine dispatch; do not call remote.save directly from a new Depth upload path. Avoid generic getAuthorization semantics changes. No lookup of another account/bucket on failure.
   - Optional logging blocker: allow an observation failure to be reported without preempting the unchanged safe engine. Do **not** relax CURRENT, generation, required operation persistence or transport completion. Isolate lastDepthClick write failure from existing notification/status delivery. Reuse current record kinds/UI; no new persistence layer.
   - Exact preparation route gap: if a discovered child cannot use existing repair, use its configured Depth root **only for setup target selection**, keep the clicked child as save destination, preserve Default/Quick. A root association is not permission to probe/rebuild the root or widen a restricted prefixScope. Use an existing target-safe remedy within the allowed scope, or leave it blocked and propose the bounded change. First prove this is required and authority-safe. Existing repair may rebuild/write a probe and update metadata; audit those effects before recommending or invoking it. Another-account Default guard is not removed globally. If this cannot be isolated, stop the shared change for review.
5. **Do not blindly restore or recreate a Worker.** Missing local secret cannot be recovered by bucket listing, ordinary configuration backup or guessing a URL. A validated already-supported same-profile private recovery path may be used only with appropriate authority. Otherwise disclose owned creation/update and readiness-write effects and obtain explicit permission when not already granted for that exact operation. An approved setup ledger does not manufacture live grants or authorize changing a working shared Worker. This review grants none of those actions.
6. **Run the focused matrix in §5**, then required existing checks. Compare outcomes and call/target/state equivalence for protected modes, not just source filenames. Retain known failures separately; no golden refresh or mode change to suppress them.
7. **Verify the physical save before optional cleanup.** One authorized native link/root save with exact R2 proof first, then intermediate/leaf, second bucket if already authorized, controls and reload. If the environment blocks native/cloud access, complete local work and give §6 to the operator; state the gate is open.
8. **Only then consider simplification.** Deleting the preflight must preserve current freshness, exact capability/session checks and error UX through the established engine. Keep useful existing diagnostics; do not expand tracing, register new APIs or redesign the menu for elegance. Measure prefix-check amplification only when it blocks the successful path.

**Leave alone by default:** `src/modes/simple`, `src/modes/nested`, menu compiler/spec/identity, registrar ACK algorithm, registry digest, shared transport/upload/verification, OAuth and deployment authority. Tests may exercise them without changing them. Shared integration-file edits require an explicit Depth-only execution predicate and mixed-mode controls; deeper shared changes require separate review.

## 5. Minimum test and collision proof matrix

| Gate | Assertions / failure controls | Evidence required |
| --- | --- | --- |
| Physical key identity | Same valid account+bucket across root/Images/Artwork and modes addresses same production digest; foreign bucket/account differs; unsupported second connection is rejected | Production provisioner with injected metadata-only store, then owner-local equality flags |
| Prefix/capability | Preserve canonical root/trailing slash, case/Unicode/object keys; restricted prefix and allowed descendants work, sibling escape/root outside scope fails; code/session/proof changes are rechecked | Existing transport + actual Worker fixture; no blanket bucket READY reuse |
| Menu identity | Depth/Narrow native IDs distinct; exact physical action identity shared where appropriate; duplicate names, multiple accounts/buckets, explicit collisions, Default/Quick, additive modes, visibility/Flat, root qualification | Complete before/after plans and configurations, not label matching |
| Actual dispatch | Root, intermediate Save here and terminal; existing source selection/permission/context rules and source privacy retained | Production callback/host/engine/transport fixture; native click → real Worker → real object separately |
| Missing/unready plan | Stable missing, pending, malformed/mismatched account/bucket/protocol, PREPARED, stale build, lost session and changing diagnostic snapshot never fabricate receipt or silently create Worker | Zero provisioning on click; exact first failing boundary/observation distinguished |
| Runtime noninterference | Separate Simple and Narrow, Depth off/on, same and different targets; cold/warm cache, Depth success/failure, session loss, concurrent config change; unchanged controls' destinations/outcomes/state/calls | Existing baseline plus production host interleavings; no new mode behavior |
| ACK/restart | Current complete ACK required, partial create/remove failure, cold worker recovery followed by READY/PREPARED/missing status, stale IDs/config/revision while awaiting preflight; persisted row metadata never write authority | Existing registrar tests plus one production-host lifecycle fixture; native failure timing remains a physical gate |
| Feedback/persistence | Optional attempt append versus mandatory CURRENT/operation failure; failed lastDepthClick write still attempts established UI feedback; notification/Shelf policy limits; results open/closed | Production feedback callback and current-store/UI fixture; delivery verified in Chrome separately |
| Outcome/retry | Click ID → remote operation → final receipt/object; exact conflict-resolved key/version/size, uncertainty/partial/history loss; no automatic replay; fresh explicit retry after a confirmed pre-upload block | Independent fixture/cloud object check; do not require deduplicating two separate deliberate user intents |
| Tree/scale | Selected depth beyond ten; 5/20/100+ siblings and multiple buckets; same actual nested structure/scroll, marker/virtual folder and bounded/failed discovery; request/time counts only if implicated | Generated plans plus actual native rendering; no depth/sibling/row cap to pass tests |

Re-run repository-supported `npm run test:focused`, full `npm test`, `node --test right2cloud-module/tests/module.test.mjs`, affected Depth/transport/registrar suites, relevant production UI/host tests, and `npm run build:extension` **during a future implementation**. Keep runner exit status and actual test counts. Existing 387/388 full-suite result is prior evidence, not a fresh pass. Locate the exact Quick browser artifact before assigning cause; known stale script selectors/draft assumptions do not authorize changing Simple/Narrow. Repair stale tests only in a separately justified test-only change preserving current explicit Save semantics.

## 6. Physical definition of done and short operator check

A future implementation is **ready only when** the existing installed Chrome menu's permitted root, intermediate Save here and terminal clicks produce independently verified files in their intended connection/account/bucket/prefix, using existing authorized infrastructure. Same/different-bucket behavior, negative cases and protected Simple/Narrow controls must also remain correct. Where a prerequisite was genuinely missing, record exactly which approved remedy resolved it; no claiming a routing patch did so.

For an authorized operator:

1. Use the existing extension/profile and exact intended build; record revision/sourceDigest and Chrome version. Reload the existing extension in place only after preserving the incident evidence; never remove it or clear storage. Confirm desired=current ACK with no pending native application.
2. Use the existing permitted test location and one disposable public source. Click its permitted Depth root once; if root is outside an existing restricted prefix, expect an accurate scope block instead of an upload. Match `depth-click` ID to remote operation and actual receipt. Check the actual R2 object/key/version/size independently. An attempt record, READY, generated plan or callback `completed` is insufficient.
3. Repeat intermediate/terminal paths and an already authorized second bucket. Check conflict-resolved keys stay under the intended prefix and root does not become bucket/bucket/. Do not automatically repeat an uncertain transfer.
4. Compare unchanged Simple and Narrow controls before/after, with Save Results open/closed and after normal reload/worker recovery. Observe actual feedback and native scrolling; no permission revocation or production Worker modification as a test.
5. Export only sanitized operation/generation/target-equality/receipt metadata; keep accounts, prefixes, source credentials and plan secrets private. If blocked, report the exact unmet gate and target-safe next action. Keep issue #12 OPEN until required real saves and noninterference are established.

**Current status: proposal reviewed; Depth implementation readiness NOT ESTABLISHED.** This review performs no new native/cloud operations and makes no runtime fix. Prior native loading was administrator-blocked; owner Windows now supplied an acknowledged failed attempt, which advances diagnosis but does not establish a successful Depth save. No numerical “reliability improvement” is credited to documents.

## 7. Significant changes to the initial proposal

| Proposal clause | Decision | Replacement / reason and evidence | Complexity change | Protects / trade-off |
| --- | --- | --- | --- | --- |
| §4 architecture diagram | Retain as current boundary, reject as a new deliverable | Already wired in engine/background (D01) | Less code; no adapter by default | Avoids duplicate identity/save logic; fix remains conditional |
| §2 missing-plan diagnosis | Qualify | Diagnostic-time read, not atomic rejecting snapshot (D03–04, probe P1) | One existing-metadata comparison; no new tracing | Prevents misdirected repair; historical ambiguity may remain |
| §4.1/§4.5 minimum fix | Replace with branching decision | Exact target/prerequisite first; no-code resolution allowed (D02/D05) | Smallest demonstrated change | Direct route to a working file; may need owner action |
| §4.2/§5.7 remedy | Strengthen and target-bind | Existing resume may choose Default, child repair may be rejected, setup may rebuild/probe/commit (D06–07) | Reuse existing flow only if validated; no recovery framework | Preserves working Worker/settings; explicit authority needed |
| §4.3 simplify preflight | Defer blanket removal | Current shared authorization still uses READY; remove only with equivalent production-wiring proof (D09–10) | No immediate refactor | Avoids FRESH_CLICK_REQUIRED regression; temporary duplicate checks retained |
| §4 thin reporting | Make an explicit small reliability candidate | Attempt/feedback storage gates exist (D12–13) | Fewer blocking dependencies; no extra record store | Real saves/feedback survive optional observation failure; required safety remains |
| §5.1 no effect on controls | Strengthen | Mixed-mode runtime/cache and shared-resource controls, not only mode-source diff (D11/D23/D26) | Small focused tests | Detects indirect regressions; no promise from hashes alone |
| §5.3–4 same Worker | Retain with qualification | Plan identity is bucket-wide, capability/scope is exact-prefix/current-session (D08/D15) | No Worker-per-folder or registry redesign | Prevents scope escape; legitimately restricted targets can remain blocked |
| §6.5–6 identity tests | Clarify expected results | Remote/menu representations differ; unsupported second connection must reject; collision checks stay (D15–16) | Existing normalization/IDs retained | Avoids false mismatch and invented multi-connection migration |
| §6.9–11 recovery/scale/ACK | Defer unless first failing boundary | ACK=26 for the reported case; bounded inventory is not automatically stale; scale impact unmeasured (D17–20) | Avoids wide refactors and caps | Keeps current menu and scrolling; tests remain required |
| §6.12/§7.H success | Strengthen correlation/conflict/retry | Actual native→remote receipt→independent object, uncertain outcomes distinct (D21–22/D30) | Existing evidence path only | Prevents fake success, wrong-prefix and duplicate retries |
| §6.15 tests | Strengthen evidence labeling | Fixture status/verified values are injected; Quick script drift not a mode bug (D24–25) | One real-module path plus controls, not a test platform | Distinguishes simulation from physical success |
| §7 handoff | Replace open-ended exploration with §2–6 gates | Read-only review now; one demonstrated correction later (D27–29) | Bounded scope and clear stop conditions | Prioritizes actual saving; no architecture work without evidence |

No superior alternative upload architecture was found or needed. The improvement is a smaller, evidence-gated use of the current one, not an elegance-driven rewrite. See [compact future request](IMPLEMENTATION_HANDOFF.md).
