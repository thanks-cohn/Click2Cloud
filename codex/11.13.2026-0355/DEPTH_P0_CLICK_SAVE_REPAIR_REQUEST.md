# CODEX REQUEST — P0 Depth Native-Click → Verified R2 Save Repair (STRICTLY DEPTH ONLY)

**Date:** 2026-11-13  
**Repository:** \`thanks-cohn/Click2Cloud\`  
**Starting branch:** \`codex/depth-repair-audit\`, including the later bug-documentation commits. Build baseline originally \`08f7d29170a98db29aa3c10ff16b5fe5da40ce61\`; record actual HEAD at execution.  
**Priority:** P0 — user can click Depth destinations in native Chrome but observes no save or visible response.  
**Final destination:** isolated repair branch, no merge to main without user request.

## 0. OWNER DIRECTIVE — READ THIS FIRST

**Fix Depth actually saving. DO NOT change anything else.**

The owner **likes the existing right-click menu architecture, hierarchy, nesting, and scrolling**. The menu is not to be redesigned, flattened, artificially limited, simplified, or replaced. The current separate product modes are not a mandate for a unified execution engine. Do not introduce universal/multi-mode saving architecture. Other mode implementations and working behaviors are **OUT OF SCOPE**. Do not expand the task into a cross-mode failure-containment rewrite. Preserve configured destinations, authorization, account/bucket/prefix identities, menu order, existing labels other than already-approved fixes, visibility settings, native actions, stored data, and providers.

- Repair only Depth-specific behavior, and use the smallest possible, Depth-guarded integration edits if genuinely necessary.
- Do not change any unrelated mode, default/Quick behavior, generic right-click menu semantics, or cloud connection settings.
- Do not delete/recreate existing Worker deployments, reauthorize accounts, modify OAuth grants, reset storage, clear saved destinations, rewrite R2 bindings, or move existing objects as a troubleshooting shortcut.
- Do not bypass security checks or call failed writes “successful.” Never make unexpected or destructive remote writes.
- Do not merge to \`main\`.
- If the proven Depth fix **necessarily** impacts unrelated behavior, stop that specific code modification, document the collision and offer a bounded review option. Do not broaden scope unilaterally.
- Noninterference tests for unaffected features are allowed and mandatory, but **their implementations are not to be modified**.
- Existing dedicated Depth CSS and Cloudflare provider-immediate root-label clarification are already done; don't undo or redesign them in this request.

**Max depth clarification:** **DO NOT introduce or assume a fixed ten-level cap.** The user explicitly retracted that suggestion; it was confusion with another product. Depth should continue respecting the owner's per-bucket configured depth and existing validation rules. Multiple siblings (5, 20, or more) are valid. Chrome's native submenu scroll/overflow is intentional. Do not add artificial row caps, sibling caps, pagination-in-menus, flattening, or arbitrary depth reductions. Confirm behavior with branching examples without presuming menu size is the incident cause. Unopened submenus still have registered entries, so native registration errors must be measured independently of visible scroll behavior.

## 1. WHY THIS IS A P0 — LIVE OBSERVATIONS VS UNVERIFIED CAUSES

Reported from the owner's installed Windows Chrome extension:

1. Other configured destination selections had previously saved successfully and their files were personally verified in Cloudflare R2. **Leave those implementations alone.**
2. A Depth selection involving \`Images\` returned **“Prepare Cloudflare in Remotes before saving.”** Advanced diagnostics: \`{"state":"REPAIR_REQUIRED","worker":"WORKER_SETUP_REQUIRED"}\`.
3. The owner clarified they **cannot recall** if that click was a branch's \`Save here\` or a child-directory leaf. Treat clicked row as unknown until traced.
4. Another diagnostic reported \`{"state":"NATIVE_APPLY_INCOMPLETE","code":"NATIVE_APPLY_INCOMPLETE"}\` after an R2 page refresh. Do not infer it occurred in the same operation as (2).
5. After building \`codex/depth-repair-audit\`, visible Depth menu entries remained clickable but appeared to do nothing. **“No visible result” is not yet proof that the click callback did not run or that zero bytes reached R2**. Determine the first boundary that diverged.
6. A separate pasted diagnostic had an earliest-retained \`SCOPE_UNAUTHORIZED\` code, with original cause unknown. Do not conflate it with either new incident without operation/time correlation.
7. Prior Codex produced 319/319 focused, 23/23 targeted, 49/49 module tests, full offline 370/371 with an existing unrelated golden failure, and 888/888 preserved target/action/item identities across 384 simulated menu scenarios. **It did NOT verify installed Chrome → real R2 saves.** The Codex environment previously reported \`UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR\`. Do not claim that fixture passes fix the live failure.

Primary tracked issue: GitHub **#12**, \`Issues_and_Bugs/Bugs/P0_DEPTH_NATIVE_MENU_CLICK_NO_SAVE_NO_VISIBLE_RESPONSE_2026-11-13.md\`. Related: \`Issues_and_Bugs/Bugs/P1_DEPTH_DESTINATION_WORKER_SETUP_REQUIRED_2026-11-13.md\`, separate observation \`NATIVE_APPLY_INCOMPLETE\`. This run must go **beyond read-only investigation** and repair demonstrated, reproducible Depth faults as far as available evidence allows.

## 2. READ BEFORE EDITING; PRESERVE EVIDENCE

Read \`AGENTS.md\` and nested instructions, \`architecture/depth.md\`, and:

- \`codex/11.13.2026-0355/WORKER_SETUP_REQUIRED_INVESTIGATION.md\`
- \`codex/11.13.2026-0355/HANDOFF.md\`, \`IMPLEMENTATION_REPORT.md\`, \`RULES.md\`, \`RULES.json\`, \`TRACEABILITY.md\`, \`TEST_MATRIX.md\`, \`SCORING.md\`.
- \`src/modes/depth/index.mjs\`, \`src/explorer/depth-inventory.mjs\`, \`src/core/menu-identity.mjs\`, \`src/core/menu-spec.mjs\`, \`src/core/action-resolver.mjs\`, \`src/core/engine.mjs\`, \`src/chrome/registrar.mjs\`.
- \`extension/background.mjs\`, \`extension/app.mjs\`, \`src/api/service.mjs\`, \`src/cloudflare/transport.mjs\`, \`src/cloudflare/deployment.mjs\`, \`src/cloudflare/onboarding.mjs\`, \`src/chrome/provider-panel.mjs\`.
- Tests: \`tests/logic2real-depth-save.test.mjs\`, \`tests/depth-scope-regression.test.mjs\`, \`tests/chrome-registrar.test.mjs\`, \`tests/boot-runtime-host.mjs\`, and other relevant menu/transport/boundary tests.

Record branch and commit, dirty changes, build digest and extension ID, baseline failures, Chrome version, manifest/service worker state, and what the environment actually supports. **Never discard owner's evidence**. Use additive sanitized test evidence. No \`git reset --hard\`, automatic stash loss, or forced checkout.

## 3. BASELINE MODEL: EXACT DEPTH ACTION LIFECYCLE

Trace with exact file:function:line references; obtain runtime operation correlation where possible:

\`\`\`text
saved Depth bucket + maxDepth + hidden + Show in Chrome
    ↓
depth inventory / qualified folder prefixes / completeness and staleness
    ↓
Depth projector: root, intermediate branch + Save here, terminal leaf
    ↓
composite menu: provider hierarchy, parent IDs, native IDs, action IDs, origin
    ↓
Chrome contextMenus remove/create, per-item ACK, desired/applied generation
    ↓
actual native onClicked(menuItemId, context, tab)
    ↓
background onGesture → beforeClick → nativeReady/reconcile → item validation
    ↓
registrar getAuthorization → source mode/role and exact target
    ↓
action resolver (authorization, enabled, context, stable binding)
    ↓
engine.save + conditional attention/setup path
    ↓
Cloudflare status, Worker plan lookup and scoped capability
    ↓
R2 upload, independent readback/verification
    ↓
durable save outcome, Save Results and immediately visible feedback
\`\`\`

For every boundary list: expected condition, actual code, failure/blocked result, whether the next boundary executes, what the user sees, whether there is an audit record, and the **first divergence** in any reproducer. Capture exact \`itemId\`, \`parentId\`, \`role\`, \`actionKind\`, \`origin.mode\`, \`targetKey\`, normalized \`prefix\`, mode scope, generation IDs, native ACK code, operation ID, worker-plan state, selected account/bucket, and remote receipt/key. Redact account IDs when exporting; **never include OAuth token, Worker secret, signed URL, authentication header, source bytes, or credential-bearing URL**.

The actual action might be a nested \`Save here\`, terminal leaf, flattened single-scope root, or unavailable attention action; investigate them all without assuming the original click.

## 4. CODE-LEVEL RISK CANDIDATES TO PROVE/DISPROVE

### 4A. Enabled native save row may intentionally be *attention*, not a save

\`src/core/menu-spec.mjs\` around lines 100–106 detects \`SCOPE_UNAUTHORIZED\` or \`WORKER_UNVERIFIED\` and sets \`setupProvider='cloudflare'\`, \`actionKind='attention'\` and \`enabled=true\`, even though \`role='save'\`. \`src/modes/depth/index.mjs\` makes real root/intermediate/leaf rows. \`availabilityReasons\` depends on \`authorized\`, \`stale\`, \`workerReady\`, \`writable\`, and inventory completeness.

**Test:** when an unready Depth row appears clickable, exactly which fallback occurs? Is it represented as “save” visually when the action can only show setup? Is the blocker immediately communicated? Is an unintended later \`FRESH_CLICK_REQUIRED\` experienced as no-op? Fix the *Depth-only observable failure* without weakening fail-closed authorization or silently deploying infrastructure.

### 4B. Native ACK failure can invalidate current click authority

\`src/chrome/registrar.mjs\` around 125–163 uses \`removeAll()\`, then creates rows sequentially. A failed \`create\` or parent ACK leads to \`NATIVE_APPLY_INCOMPLETE\`; the registrar sets \`acknowledged=null\` if any row failed. \`resolveClick\` around 174–181 rejects all clicks without a matching complete acknowledged generation. \`extension/background.mjs\` \`beforeClick\` around 142–148 invokes \`nativeReady()\` before matching previous/current IDs. \`nativeReady()\` around 211–214 can schedule reconciliation, so a user's click and menu regeneration may race.

**Tests:** failure of a Depth *child* create, of a Depth *parent* create, of the root, of \`removeAll\`, ACK timeout, stale generation and service worker restart; distinguish a benign partial UI from missing action authority. Record first failed item, source owner, Chrome code and dependency chain. Determine whether the observed \`NATIVE_APPLY_INCOMPLETE\` came from registrar application, readiness wrapper (\`src/api/service.mjs\` 141–151), or another stage. **Do not automatically redesign the shared native registrar.** Fix a demonstrated Depth-specific invalid plan/state transition if possible; if a truly shared registrar architecture change is essential, provide a precise proposal for approval rather than implementing it across the product.

### 4C. Potential fallback integration mismatch — test explicitly

\`src/chrome/registrar.mjs\` \`handleClick\` around 194–203 sometimes calls \`dispatch({providerAction:'cloudflare',reconnectOnly:true,target:row.target,itemId:row.id}, ...)\` on auth failure. But \`extension/background.mjs\` \`dispatch:async(action,{info,generation})=>...\` around 149–152 appears to **ignore the supplied \`action\`** and dispatches by \`info.menuItemId\` using \`engine.save\`. This is a **confirmed source-level contract mismatch**, though not yet proven to cause the user's Depth click failure.

Reproduce it with a Depth unready action and inspect resulting \`getAuthorization\`, setupOnly, attention display and returned outcome. Only if proven relevant, implement the narrowest Depth-guarded fix. No generic provider-flow change without approval.

### 4D. Authorization conflates exact Worker readiness with target authority

\`extension/background.mjs\` \`remoteReady\` around 42 caches ready state for ten seconds by full \`targetKey\` (includes prefix); \`getAuthorization\` around 135–141 includes a target only if OAuth membership AND \`remoteReady(target)\` succeeds. The resolver then reports \`SCOPE_UNAUTHORIZED\` when the authorizedTargets array lacks the target. This can disguise **“Worker not ready / prefix not ready / status transient”** as **scope unauthorized**, and the callback may enter setup attention instead of uploading.

Test same account+bucket with multiple valid prefixes, verified/“PREPARED”/pending/missing Worker plans, stale readiness cache, disconnected session, different account, different bucket and prefix outside an authorized scope. Determine first false predicate; preserve true security denials. Provide **accurate Depth-specific diagnostic subreason** without exposing secrets or allowing a blocked save to proceed.

### 4E. Generic WORKER_SETUP_REQUIRED has multiple origins

\`src/cloudflare/transport.mjs\` \`cap(target)\` around 8–13 checks the target account and then uses \`lookup(target)\`; it throws \`WORKER_SETUP_REQUIRED\` for absent/not-ready plan, mismatched account, bucket or protocol. \`src/cloudflare/deployment.mjs\` \`lookup\` keys Worker plan by \`digest([accountId,bucketName])\`: **a new directory prefix in the same bucket does not, by itself, require another Worker**. \`src/cloudflare/onboarding.mjs\` \`checkFresh\` maps unready status to \`REPAIR_REQUIRED\` and the UI displays a generic instruction.

**Test:** root, \`Images/\`, \`Images/Artwork/\` in the same account+bucket, both a \`Save here\` and terminal folder, then a truly different bucket. Identify which exact plan lookup predicate failed, whether status is \`PREPARED\` rather than missing setup, whether a stale plan or code digest exists, and whether configured scope is valid. Do not borrow a plan from another bucket, alter Worker bindings, weaken permission checking, or auto-provision without consent. If the genuine root cause is an unprepared *different* bucket, report precise needed setup and keep the operation blocked—do not fake a code fix.

### 4F. Pre-transport click failures can be nearly invisible

\`extension/background.mjs\` \`onOutcome\` around 152 stores a lastSave result and sets an extension badge; \`extension/app.mjs\` \`remoteHistory\` around 601–613 primarily reads records persisted by remote transport. \`src/core/engine.mjs\` can return \`STALE_GENERATION\`, \`SCOPE_UNAUTHORIZED\`, \`AUTH_REQUIRED\`, or \`ACTION_BINDING_INVALID\` **before remote.save** records any operation. Some fallback errors and early exits may not appear in Save Results. \`src/chrome/registrar.mjs\` onClicked listener fires \`void handleClick(...)\`, and some exceptional provider-fallback catches return without \`onOutcome\`.

**P0 fix:** Every Depth click should have a correlated, durable/safely sanitized outcome record (including a pre-upload blocked reason) and understandable, actionable user feedback. “Not saved because [specific issue]” is better than an unexplained click. Use existing UX where feasible and respect Chrome user-gesture rules; don't claim a popup opened unless observed. Do not pollute normal successful remote history with fabricated transfer receipts; distinguish click attempts from actual remote operations.

### 4G. Discovery and incomplete inventory must not masquerade as actionable folders

\`src/explorer/depth-inventory.mjs\` performs paginated discovery to the configured depth. At the maximum *selected* depth it marks \`complete=false\` when it encounters a folder, even if that last-level folder was legitimately enumerated and traversal intentionally ended at the requested limit. Check whether this semantically mislabels “incomplete beyond selected limit” and triggers \`DEPTH_DISCOVERY_REQUIRED\` or menu readiness confusion. Reproduce with an actual specified limit and children at the boundary; distinguish forbidden partial pages/network errors from deliberate stopping. Fix only if demonstrated to affect Depth action validity or misleading diagnostics. **No fixed max-depth cap.**

### 4H. Menu size, IDs and collisions — test, don't assume

- Chrome's native scrollbar visually handles many sibling entries; **there is no user-requested sibling cap**.
- Chrome still creates entries for unopened branches. Large selected trees can increase the number of \`contextMenus.create\` operations; measure actual Chrome API outcomes and timing with 5/20 siblings, nested branches and multiple buckets before claiming menu volume is at fault.
- \`src/core/menu-spec.mjs\` uses presentation IDs and target-derived action IDs, \`targetKey\` includes provider, connection, account, bucket and prefix. This is sound in principle. Multiple modes may intentionally save to an identical target; do not confuse identical physical action IDs with colliding native menu row IDs.
- Test duplicate folder names in different buckets/accounts, same label in one parent, root-folder name collision, normalized trailing slashes, branch vs leaf, and the special provider-immediate root label. Confirm Chrome parent nodes exist before children, stable IDs, no orphan and no action bound to a wrong prefix.
- Check \`CONTEXT_MISMATCH\` from source type (image/link/page/video/audio), source capture validity and the effect of a missing \`srcUrl\`/link URL, including permission denial. Do not reclassify a blocked save as success.

## 5. FIX STRATEGY, ORDERED FOR HIGHEST ONE-RUN SUCCESS

**Stage 1 — Forensic reproducibility (read-only):** Enumerate all guards/early returns with their first failure, and instrument Depth-origin click attempts with per-boundary codes. Produce deterministic test fixtures for known error conditions. Make no broad speculative changes.

**Stage 2 — Directly relevant, proven Depth defects:** Repair as many P0-relevant, reproducible issues as possible in one run, separately and minimally: (a) incorrect Depth action/state/ACK mapping; (b) broken Depth authorization/readiness fallback if demonstrated; (c) inaccurate/missing Depth click outcome feedback; (d) incomplete Depth inventory state if a demonstrated blocker. Keep the native hierarchy and remote protection intact.

**Stage 3 — Failure-recovery tests:** Click twice without duplicating uploads, retry after actual setup, retry after temporary network failure, reopen/reload side panel, reload extension and worker service, refresh inventory, and intentionally fail a Depth child menu creation. Never replay an uncertain write without receipt inspection. Do not silently reset persisted configuration.

**Stage 4 — Physical validation:** In an extension-capable Windows Chrome with the existing authorized account and user-consented disposable test object, test a root, intermediate Save here, and terminal leaf within the intended bucket, and a second selected bucket if authorized. Capture actual Chrome \`menuItemId\`, ACK, click outcome, and R2 receipt/key/readback. If the Codex environment still disallows extension loading or Cloudflare access, mark this **UNVERIFIED** and provide a very short Windows operator test/repro script using the owner's already configured extension build path, rather than claiming completion.

**Stage 5 — Noninterference check:** Assert byte-identical plans and behavior for input cases with Depth disabled where possible; check no code/behavior changes outside the allowed Depth scope. No edits to unrelated mode modules. No new row/sibling caps. No new dependency or config migration unless strictly necessary and user-approved.

## 6. REQUIRED TEST MATRIX

For each scenario record **generated menu**, **Chrome ACK (mock vs native)**, **click result**, **authorization**, **Worker status**, **expected exact R2 destination**, **remote fixture result**, **real readback if available**, and **feedback shown**, with clear evidence class. Minimum:

1. One bucket with only root → root save.
2. One bucket with \`Images/\` → root \`Save here\`, \`Images\` terminal save.
3. One bucket with \`Images/Artwork/\` → intermediate \`Save here\` and terminal \`Artwork\` save.
4. Multiple selected buckets; independent account/bucket/prefix and unique target mapping.
5. Five siblings, twenty siblings, same-named siblings under different parent branches and multi-level nesting; no arbitrary caps.
6. Single-bucket vs multi-bucket root presentation/“Save here” logic; no accidental provider-level generic action regression.
7. A folder newly discovered after prior menu generation; correct reapply and stale click outcome.
8. Worker plan ready, prepared (not fully verified), missing, pending, wrong account, wrong bucket, wrong protocol, expired/changed authorization, invalid scope; accurate error not misleading generic “click did nothing.”
9. Native create failure for Depth root, child and independent sibling; failed parent, partial generation, stale ACK and restart. Distinguish actual callback failure vs generated plan vs cached/persisted state.
10. Prefix normalization, identity collisions, hidden/disabled scopes, scope authorization and partial inventory.
11. Source image/link/page (and other supported contexts); no response must always be classified at first failing boundary.
12. Auth denial at each stage, status network timeout, remote pending/uncertain write, verifier failure, durable history failure; never false success or automatic unsafe replay.
13. Click while Save Results open and closed; prove observation does not change save dispatch.
14. Roundtrip correct root/intermediate/terminal target path and an independently verified receipt (simulated and real when authorized).
15. Depth guard noninterference: unchanged menus and save outcomes where Depth is not selected; **no modification** to unrelated implementations.

Use direct \`registrar.handleClick\` fixtures *and* a more realistic emitted \`contextMenus.onClicked\` listener with real async callback boundaries in the fake Chrome harness. Test \`lastError\` timing, clicked item identity, and differing desired/acknowledged generation. Do not count \`engine.save\` mocks as proof that the real Cloudflare Worker accepted a file.

## 7. ACCEPTANCE CRITERIA (NOT MERELY TEST COUNTS)

- **Depth click-to-save works** for each permitted root, branch Save here and terminal leaf, with exact destination identity and receipts when real authorization is available.
- If a legitimate Worker/auth/setup prerequisite is missing, the user is **immediately told the actual issue** and the operation is properly recorded as blocked; nothing is silently ignored.
- No Deep click falsely claims success. All failed/blocked/uncertain outcomes are differentiable from “Saved and independently verified.”
- A Depth-specific error does not trigger modifications elsewhere; preserved configs, existing menu shape and every unaffected action/route are unchanged.
- No arbitrary max-depth, sibling or row caps; no automatic flattening; native menu scroll remains Chrome's.
- Baseline and final focused tests, full offline suite, extension build, source digest and callback-level failure-injection tests are reported, including retained known failures.
- Installed Chrome and Cloudflare R2 validation are **separate explicit gates**. Do not write “verified” if the environment never performed them.
- The fix is isolated. If the only remaining blocker is a genuine missing Worker plan for a different selected bucket, explain this plainly and do not attempt unauthorized provisioning.

## 8. DELIVERABLES

Save under \`codex/11.13.2026-0355/DEPTH_P0_REPAIR/\`:
- \`AUDIT.md\` — precise source trace, risk ranking, expected vs observed, code-level facts vs hypotheses.
- \`REPRODUCERS.md\` — fixtures and scripts for the first failure of each path; operation and evidence correlations.
- \`FIXES.md\` — each changed file/function and *why* the change is strictly Depth-scoped, with before/after behavior and regression proofs.
- \`TEST_RESULTS.md\` — tests, matrix, native/simulated split, retained baseline failures, failure injection and exact destination keys.
- \`OPERATOR_VERIFICATION.md\` — concise Windows CMD/Chrome steps for the owner if Codex cannot install their extension; safe, non-destructive, no secret export.
- \`REMAINING_GAPS.md\` — unresolved root cause, remaining unverified live evidence, risky shared architectural findings requiring separate approval, P0 gate status.
- Update the relevant P0 bug record/issue only with established evidence; maintain separation from old WORKER_SETUP_REQUIRED and NATIVE_APPLY_INCOMPLETE until correlated.
- Update Logic2Real Depth-specific records and scorecard (implementation/tests/native/real R2 each separate); don't fabricate improved real-world fidelity.

Make actual source/test changes in their normal directories, not copied into documentation. Finish by reporting HEAD, commits, changed files, exact P0 resolved vs unresolved, build/test outcomes, actual Chrome status, actual Cloudflare R2 status, and **MERGE READY / NOT READY**, with justification.

## 9. FINAL INSTRUCTIONS

The priority is a **functioning Depth save**, not more beautiful screenshots or a refactor. You have full authority to perform an intensive read, reproduce, write Depth-scoped code and tests, and verify inside available authorized tools, without unnecessary questions. But do not overclaim. If installed Chrome/Cloudflare authorization is unavailable, fix reproducible code defects in the current run and provide the smallest remaining live verification step for the owner.

**Remember:** Depth only; preserve the menu; keep its real directory hierarchy and native scroll; no artificial depth-10 rule; no modifications outside the narrowly justified Depth repair.