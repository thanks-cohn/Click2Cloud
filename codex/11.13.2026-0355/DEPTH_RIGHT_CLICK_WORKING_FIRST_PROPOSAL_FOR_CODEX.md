# DO NOT AFFECT SIMPLE OR NARROW — Depth Right-Click Saving Proposal for Codex

> **RULE #1 — DO NOT AFFECT SIMPLE OR NARROW.** Both work. Preserve their implementations, native menu IDs, configuration, UI and saving behavior. They are baseline controls, not repair targets.
>
> **RULE #2 — MAKE DEPTH WORK.** The existing Chrome right-click Depth menu already displays discovered folders. Selecting a bucket root, folder's "Save here", or leaf must actually save a file to that R2 destination. A successful build, new diagnostics or mocked tests are **not** equivalent to an actual saved and verified file.
>
> **RULE #3 — KEEP THE EXISTING RIGHT-CLICK MENU DESIGN.** Preserve the current look, parent/child nesting, bucket roots, "Save here", terminal leaves, multiple buckets, sibling scrolling and user-selected depth. No redesign, flattening or arbitrary caps.
>
> **RULE #4 — MINIMAL COMPLEXITY.** Prefer the smallest sound correction that makes saving reliable. Do not add another upload engine, per-folder Workers, unnecessary log layers, speculative infrastructure, or unrelated security/auth redesign. Preserve existing checks; this task isn't about expanding them.
>
> **RULE #5 — EXPLICITLY AUDIT THE INITIAL PROPOSAL'S DEFICITS AND ISSUES.** Before endorsing or replacing this plan, Codex must produce an exhaustive, evidence-labeled deficiency ledger covering **every material flaw, unsupported assumption, omission, unresolved defect, collision risk, redundancy, inefficiency, failure mode, and unnecessary complexity** in the proposal it receives. State what is wrong (or unproven), where, how it affects a real right-click save, severity, evidence, and exactly how to repair or defer it. **Do not quietly omit flaws or imply the proposal is sound merely because its intentions are good.** Distinguish demonstrated bugs from design risks and unknowns; do not invent defects for the sake of a longer list.
>
> **RULE #6 — THIS DOCUMENT REQUESTS A PROPOSAL, NOT AN IMPLEMENTATION.** Codex is encouraged to disagree with this architecture and suggest a simpler or better solution. **Do not edit application code, deploy Cloudflare resources, or implement a fix in this review.** Audit and produce a practical final plan. For every meaningful change you recommend to this proposal, explain **what changed, why, expected benefit, trade-off, and evidence**.

Repository: `thanks-cohn/Click2Cloud`  
Reference: latest remote `codex/depth-p0-click-save`; verify exact source HEAD and branch before auditing.  
Date: November 13, 2026  
Status: **Design proposal seeking Codex evaluation and improved final plan — not approval to build.**

---

## 1. Our current right-click setup, and precisely what we want

Click2Cloud lets a user right-click an image, link, or supported source in Chrome and select a Cloudflare R2 destination through Chrome's **existing native context menu**.

- **Simple:** Shows explicitly configured save destinations. **Already works. Leave it alone.**
- **Narrow:** Shows manually selected paths in a configurable nested tree. **Already works. Leave it alone.**
- **Depth:** Given a selected R2 bucket and configured discovery depth, recursively discovers folder prefixes and displays them in an existing native nested context menu. **The menu displays content but a real owner test shows that a clicked Depth save does not complete. Fix saving, not the menu's appearance.**

For Depth we expect:
1. User chooses one or more R2 buckets and a depth setting. No artificial depth 10 cap; use the selected configuration.
2. Existing discovery lists the actual folder tree down to the chosen depth.
3. Existing right-click menu displays roots, intermediate branches with "Save here", and terminal save rows.
4. Clicking an entry produces the correct **connection + account + bucket + prefix** without relying on Narrow's IDs or saved path records.
5. The **existing shared** Worker/remote-save infrastructure uploads the chosen file to the exact authorized R2 object key and independently verifies it.
6. Success or failure is accurate and immediately understandable. The user need not inspect internal trace logs for an ordinary save.

We are **not** asking for a second saving product, redesigned menus, new UI widgets, a worker-per-path system, or an elaborate platform rewrite.

## 2. The owner's REAL results — not hypotheses

Windows installation: user built application changes at `6beaccf` on `codex/depth-p0-click-save`. Extension ID `ajppphdiamdobknpamcheohmdbdbeoal`, version `0.3.19`.

**Real failed Depth click:**
- "Depth: not saved (WORKER_SETUP_REQUIRED / PLAN_MISSING)"
- Click record `depth-click:8437ba75-8344-4a57-9d3d-b50188942bd4`.
- Menu `itemId=c2c:item:fac90211f53a2d2a`, `parentId=c2c:item:132c8a263c99277b`.
- `role=save`, `actionKind=attention`, `mode=depth`.
- `generation=26`; `acknowledgedGeneration=26`; `nativeCode=NATIVE_ACKNOWLEDGED`.
- First observed failure at `stage=worker`; `reason=PLAN_MISSING`.
- This is a blocked click record, **not** an upload receipt.

**Independent positive Narrow control:**
- Operation `0a90880e-4efe-470e-a2bc-326eb975e68d`.
- `state=verified`, `code=R2_HEAD_VERSION_SIZE`, `proofKind=independent-head-version-size`.
- `mode=narrow`; bucket `redown`.
- Verified file `.click2cloud-readiness/4728e57b-1282-4d82-bbd4-c8358f967938/348s.jpg`, size 31,571 bytes.

**Important unknown:** We have not established whether the failed Depth action targeted the **same account and bucket** as this successful Narrow operation. Do not assert equality from UI labels, file paths or assumptions. Compare exact canonical targets or ask for a safe owner-local read-only comparison. If these are different buckets, missing setup may be legitimate; if identical, determine why the local plan lookup differs now, including state/profile/time factors.

## 3. What our current code appears to do — Codex must independently verify

Relevant files:
- `src/modes/depth/index.mjs`, `src/explorer/depth-inventory.mjs`: Depth discovery and presentation.
- `src/explorer/r2-adapter.mjs`: existing authenticated Cloudflare R2 listing, used by the file API.
- `src/core/menu-identity.mjs`, `src/core/menu-spec.mjs`, `src/core/action-resolver.mjs`: target/action/menu identity and composition.
- `src/chrome/registrar.mjs`: native menu registration, ACK and click dispatch.
- `src/modes/depth/native-click.mjs`: added Depth-specific click readiness/preflight.
- `extension/background.mjs`: inventory, readiness snapshots, click wiring and authorization.
- `src/core/engine.mjs`, `src/cloudflare/deployment.mjs`, `src/cloudflare/transport.mjs`, `src/cloudflare/onboarding.mjs`: shared save engine, Worker plan, capabilities and approved setup.
- `src/persistence/current-store.mjs`: durable click/save history.
- `tests/depth-p0-click.test.mjs`, `tests/depth-scope-regression.test.mjs` and all relevant regression tests.
- `codex/11.13.2026-0355/DEPTH_P0_REPAIR/{AUDIT.md,REMAINING_GAPS.md,TEST_RESULTS.md}` and GitHub issue #12.

Observed design facts to check against code:
- A Worker plan is stored and looked up using a digest of **[accountId, bucketName]**, not per-folder prefix or menu mode; local storage uses `remoteTransport:<digest>`.
- A bound Worker can save to authorized prefixes within its configured bucket; a new depth/folder does not by itself need a new Worker.
- Directory listing works through authenticated Cloudflare R2 APIs and can succeed even if there is no locally saved Worker plan. Discovery is not proof that saving is ready.
- Distinct native item IDs for Depth and Narrow **are correct**, even when both address the exact same physical destination. Shared physical action/target identity is distinct from menu presentation identity.
- The recent Depth-only precheck calls `remote.status(target)` before passing the click to the shared engine. That can create a second readiness decision or double checks. **Audit whether that is necessary or causes diverging outcomes.**
- Existing `getAuthorization` filters target authorization through `remoteReady()`. Audit whether conflating account authorization with Worker readiness creates false failures or fallback behaviors.
- Depth readiness refresh may check every prefix even though Worker plan identity is bucket-wide. Avoid unnecessary request multiplication if it materially impacts saves/menus.
- Chrome menu generation uses sequential creation and full ACK semantics. It is a separate possible reliability risk, but the **observed** failing click was acknowledged; don't spend the whole run redesigning the registrar.
- Interrupted discovery can leave stale/pending state. Note future risks, but don't let speculative recovery changes distract from making Depth save.

## 4. My proposed correction — evaluate, don't assume it's optimal

**Candidate architecture: Depth independently discovers and presents a destination; the existing common saving engine owns everything after target selection.**

```text
Existing native Chrome right-click menu (PRESERVE EXACT BEHAVIOR)
    ├── Simple — configured destinations  [UNCHANGED]
    ├── Narrow — selected folder hierarchy [UNCHANGED]
    └── Depth — discovered hierarchy       [FIX CLICK→SAVE]
                  |
            Depth-specific selected row
                  |
        Canonical physical destination:
        provider / connection / account / bucket / prefix
                  |
             EXISTING shared
      authorization + Worker-plan lookup
             + R2 save engine
                  |
         Existing configured Worker
                  |
      R2 object + independent verification
```

**Responsibilities:**
- Depth owns its discovery, configured scope and depth, tree presentation, native menu identities and mapping a clicked row to a canonical physical destination.
- Shared infrastructure owns Worker-plan lookup, authentication and authorization, exact prefix capability, source validation, dispatch, upload, verification, outcome recording.
- Depth does not invent a second Worker or saving implementation. It may retain thin Depth-only UI reporting, provided those hooks do not block a valid save independently of the common engine.

**Specific questions for Codex:**
1. Is the *true simplest fix* to correct an incorrect Depth-selected account/bucket/target? Prove the mismatch or show none.
2. If `PLAN_MISSING` is genuinely true for the selected bucket, is that bucket actually unprepared? Is there a safe existing explicitly approved preparation/recovery path? A plan cannot be recreated from bucket names alone if its secret is missing. Do not invent or copy credentials.
3. Would removing or simplifying Depth's redundant readiness preflight safely yield the existing common engine's correct result? Check whether doing so would trigger an unwanted setup-only flow, silent failure, or skipped authorization; no bypass.
4. Could an **adapter** from Depth row → canonical save target be sufficient, retaining all IDs and menu appearance? Prefer this over new abstractions unless there is a proven reason otherwise.
5. What is the minimum viable change that will make a real Depth save succeed, and what risks remain for wide/deep trees?
6. What existing tests would prove Simple/Narrow didn't change? What live Windows Chrome + R2 checks are indispensable?

### Why I prefer this candidate

It minimizes divergent logic. In particular, Depth should not independently decide whether a bucket's Worker is usable if the common save pipeline already has an authoritative check. Independent menu identities are desirable; independent save authority is not.

**But this is a proposal, not a mandate.** If Codex can propose a simpler, more reliable way to reach the user goal with less code and fewer moving parts, choose it and explain why.

## 5. Non-negotiable acceptance criteria for any future implementation

1. **Simple and Narrow unchanged** in menu structure, IDs, configuration, history, click routing, saved destination and actual upload behavior. No edits to their mode implementations.
2. **Depth saves** from the *existing* menu to root, intermediate "Save here" and terminal paths; exact bucket/prefix and independent R2 readback.
3. Same account+bucket across modes resolves to the same *bucket-level* Worker plan; different account/bucket never borrows another's plan or secret.
4. Changing Depth discovery depth or selecting a new authorized folder within an existing prepared bucket must not trigger a separate Worker deployment.
5. Distinct Depth/Narrow native IDs; correct target binding even for identical folder names, multiple buckets and mixed modes. No stale/incorrect menu routing.
6. Preserve current Depth folder hierarchy and Chrome scrolling; don't cap siblings/depth to make testing easier.
7. A truly missing Worker plan is reported accurately and given a clear **existing, owner-approved** remedy; no automated Cloudflare mutation, token reset or secret invention.
8. A click that blocks or produces an uncertain outcome never claims a verified upload. A verified file must exist at its intended R2 key.
9. Real Windows Chrome results count separately from simulated tests. If Codex cannot run an unpacked extension or use owner's Cloudflare R2, say **UNVERIFIED** and supply a short actionable local test, instead of declaring success.
10. Keep changes focused and small. Explicitly justify any new abstraction, new persistence, new state, additional check, or shared-code change against the criterion **"does this help right-click actually save?"**

## 6. Mandatory initial-proposal deficiency audit — before a final recommendation

**Codex must audit THIS ORIGINAL document, not only the current implementation.** Its first deliverable should be a separate `INITIAL_PROPOSAL_DEFICITS.md` which itemizes **all material shortcomings of this proposal** before recommending a solution. This must be a critical review, not an approval exercise. For each issue, include:

| Field | Required answer |
| --- | --- |
| Proposal element | Quote or point to the exact section/claim/assumption being challenged |
| Classification | Proven code defect, observed live defect, design flaw, missing requirement, unproven assumption, trade-off, future risk, or unnecessary complexity |
| Evidence | File/function/test/operation reference; explicitly label inference and unverified hypotheses |
| User impact | How it could prevent a right-click save, misroute a file, break Simple/Narrow, or create unnecessary complexity |
| Severity | P0 actual-save blocker / P1 reliability / P2 later improvement / not a defect |
| Resolution | Retain, change, reject, replace, test before decision, or explicitly defer |
| Replacement & rationale | Precise proposed alternative, why simpler or more reliable, and its known downsides |
| Verification | Minimal test or live observation that proves the risk is addressed |

**At minimum, challenge these possible weaknesses rather than assuming them away:**

1. **Unproven account/bucket equivalence.** The real Depth `PLAN_MISSING` and verified Narrow save are different operations; do they even address the same account/bucket/profile, and did the local Worker plan still exist at the failed-click time? A plan cannot be reconstructed by guessing a name or inventing its signing secret.
2. **Extra Depth precheck versus common save authority.** Does the proposal keep an unnecessary second readiness decision, or could removing it cause a different fallback or a true scope bypass? Identify the correct single source of truth.
3. **Conflated authorization and readiness.** Does `getAuthorization` wrongly equate `remoteReady` with account authority, resulting in misleading `SCOPE_UNAUTHORIZED` or setup-only actions? Is a shared-layer change truly required, and how would it avoid regressing Simple/Narrow?
4. **Action kind and click dispatch.** Could `role=save` plus `actionKind=attention` be improperly rerouted by the registrar or engine? Account for the dispatcher taking a requested action while `extension/background.mjs` may reconstruct a save from `info.menuItemId`. Distinguish a genuine defect from a harmless intentional fallback.
5. **Canonical target consistency.** Are prefixes normalized identically by discovery, Depth projection, menu compiler, authorization, Worker lookup and R2 object-key builder? Test root, trailing slash, multi-bucket same folder, same bucket with two different connections, and mixed modes.
6. **Menu identity and collisions.** Preserve independent Depth/Narrow native entry IDs while sharing physical targets. Test stable-ID collision rejection, action-ID reuse by identical targets, sibling name duplication, parent placement, root Save here, stale click/generation, and mixed Quick/Default/composite placement. Don't claim hash collisions are mathematically impossible.
7. **Worker scope and reuse.** The plan is account+bucket-wide but `prefixScope` can limit where saves are allowed. Could a proposed automatic readiness reuse incorrectly authorize a different prefix? Could a different bucket accidentally borrow a plan? Do not bypass existing checks.
8. **Lost or inconsistent local Worker plan.** Does the proposal falsely assume an R2-listed bucket has a saved Worker plan, a live Worker can be rediscovered with its signing key, or a local plan can be auto-healed without consent? State precisely what is recoverable read-only versus what requires explicit setup.
9. **Depth discovery quality.** What if folder pages repeat, a listing fails midway, paths differ from Cloudflare's delimiter representation, root/empty folders are virtual, or discovered children reach the depth boundary? Could incorrect `complete`/stale/pending flags poison future saves? Do not mistake partial discovery for an empty bucket.
10. **Readiness amplification and scale.** Could each displayed folder trigger redundant network status checks and each menu rebuild re-register all entries? What is the measured impact of 5/20/100+ siblings and multiple buckets? Recommend a low-complexity remedy only if needed; no invented folder/depth caps.
11. **Chrome registration and worker restart.** Are all native rows ACKed? A single create failure can nullify complete ACK; is the proposal prepared for stale generations, service-worker restarts and durable vs current ACK? These concerns must not be conflated with this live acknowledged click.
12. **Successful-click verification.** Would a seemingly completed Depth click leave a file in the wrong bucket/prefix, show only a `depth-click` attempt instead of a transfer receipt, or treat a synthetic response as an R2 upload? Require exact key, independent HEAD/version/size proof, and no replay of uncertain transfers.
13. **Operational hazards and protecting working modes.** Could any recommended shared-code edit change Simple/Narrow behavior, menu IDs, configuration or authorization? Could migration/reset/reinstall change the existing extension ID, credentials or local plan? Include noninterference and preserve-user-state gates.
14. **Premature refactoring and scope creep.** Is an architecture rewrite, generic registry, new tracing subsystem, extra persistent format, dedicated worker-per-folder, or broader security redesign actually necessary for the P0 save? Reject anything that does not shorten the route to working Depth click saves.
15. **Test validity and hidden regressions.** Which current tests use simulated Chrome callbacks or injected Worker responses rather than actual installed Chrome and R2? Identify the previously reported full-suite Simple golden mismatch and Quick browser assertion without "fixing" protected modes. Distinguish verified results, new regressions and untested conditions.
16. **Any further deficits Codex discovers.** The above is a seed, **not a cap**. Examine the entire proposal and source for additional independent issues, conflicts between its own rules, vague success criteria, unjustified trade-offs, or stronger alternatives. Report them even if they challenge the proposed architecture.

For every line item, say whether it is **already resolved in the present code, genuinely open, disproven, or unverified**. A code risk alone is not proof that it caused the owner's failed Depth click.

**Do not hide bad news:** The document should clearly state if this proposal is overengineered, under-specified, wrong about the root cause, or imposes constraints that prevent the simplest successful repair.

**Finish with an explicit coverage check:** list every original proposal section and record whether it was reviewed, with links to corresponding deficit entries or an evidence-backed "no material deficit found." No blanket praise and no superficial "minor concerns" section.

## 7. What Codex should produce NOW — a FINAL PROPOSAL ONLY

**Do not change implementation code during this review.** Read the actual repository, critically test the premise with existing source and evidence, then create a succinct but substantive engineering proposal.

Deliver:
- **A. Initial proposal deficit ledger FIRST:** Produce `INITIAL_PROPOSAL_DEFICITS.md` using the mandatory full-section audit above; include every material problem with evidence, severity, practical consequence, and disposition. Explicitly report which deficits were missing from this initial proposal and how the revised plan fixes them.
- **B. Executive conclusion:** Is my candidate architecture the best fix? Yes / no / partly — why?
- **C. Confirmed facts vs unknowns:** Distinguish the real `PLAN_MISSING` result and verified Narrow save from speculation; state which additional owner observation (if any) is decisive.
- **D. Ranked solution choices:** (1) minimal surgical fix, (2) shared-boundary correction, (3) any alternative you judge better. Compare code touched, Simple/Narrow isolation, real-save probability, complexity, failure modes and migration risk.
- **E. Recommended final plan:** Exact code ownership, boundaries to change and **leave alone**, ordered steps from reproducer to fix to R2 proof. Explain how Depth reaches the established engine rather than creating a second one.
- **F. Identity/Worker collision proof plan:** Target/account/bucket/prefix and menu ID test matrix, account isolation, same-bucket Worker reuse, prefix restrictions, stale menu generations and changed configurations.
- **G. Reliability notes without mission creep:** Only actionable risks that could stop an actual right-click save; prioritize fixes that matter now vs explicitly defer later optimizations.
- **H. Working definition of done:** A real native Chrome Depth click that uploads, verifies the intended object, and does not regress Simple/Narrow.
- **I. Changes to THIS proposal and WHY:** Explicit table with "proposal clause", "Codex retain/change/reject", "replacement", "reason/evidence", "complexity change", and "what it protects or improves". If Codex's final proposal diverges from mine, explain each material deviation. If no better solution is found, say so rather than inventing work.
- **J. Short operator/Codex handoff:** One compact future implementation request, linked to the final plan, but **do not implement now**.

Save the explicit initial-proposal deficit ledger, followed by the final review and plan, under `codex/11.13.2026-0355/DEPTH_WORKING_FIRST_REVIEW/` on a **new isolated proposal branch**. If repository permissions permit, commit only those proposal documents. Do not merge into main. No source changes, no Worker setup, no OAuth reauthorization, no user configuration modifications.

**Decision rule:** Favor the smallest demonstrated path to a working Depth native save. Architecturally elegant solutions that add complexity without improving actual saving should lose to simpler ones. Protect Simple and Narrow completely. Invite and defend better alternatives with evidence.
