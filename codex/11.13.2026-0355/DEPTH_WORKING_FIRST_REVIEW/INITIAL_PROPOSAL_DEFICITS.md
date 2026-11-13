# Initial proposal deficits — reviewed before the final plan

Audit baseline: `c7e75ce727cc81b78148d9e4c1f0510311dd44b0`, fetched from `origin/codex/depth-p0-click-save`, November 13, 2026. Input: [the original proposal](../DEPTH_RIGHT_CLICK_WORKING_FIRST_PROPOSAL_FOR_CODEX.md). This is a proposal review only. No application changes or cloud operations are authorized by it. References below identify files and stable symbols/line anchors at that baseline; see [evidence index](EVIDENCE_AND_VERIFICATION.md).

**Conclusion:** the candidate is directionally right but under-specified as an implementation plan. Its main architecture already exists. It cannot make a genuinely absent account/bucket Worker plan appear. The first decision is a private, read-only target/state comparison, followed by one conditional repair. Neither preflight deletion nor a new adapter is justified as the default fix. The ledger includes sound/resolved elements explicitly; risks are not asserted as causes of the owner's incident.

Evidence labels: **live-report** = owner observation recorded in the repository, not independently reproduced here; **source** = checked code; **local-test** = executed synthetic/production-module check; **inference** = consequence requiring verification. Severity **P0** means a possible actual-save/release blocker, not that every item caused the reported failure; **P1** reliability/isolation; **P2** deferred optimization; **not a defect** retained protection. State is independently stated for each item.

## D01 — Proposed architecture is already the current path

- **Proposal:** §4 candidate diagram; questions 4–5 suggest a new Depth-to-target adapter.
- **Class / state / severity:** unsupported missing-component assumption; disproven as a general architectural gap; P1 unnecessary-change risk.
- **Evidence:** source: `registrar.mjs:213–219`, `background.mjs:159–165`, `engine.mjs:89–99` already resolve an immutable physical target and call the shared `remote.save`.
- **Consequence:** an adapter can duplicate normalization, drift identities and consume time without supplying the missing plan.
- **Disposition / replacement:** retain the ownership split as documentation; reject a new adapter unless an actual Depth mapping mismatch is reproduced. Fix its originating transformation if found. Trade-off: there is no predetermined code patch before diagnosis.
- **Verification:** trace one actual row through the existing resolver to transport; compare canonical target and production plan key, not labels.

## D02 — Same account/bucket is still unknown

- **Proposal:** §1 desired shared infrastructure, §2 positive Narrow control, §4 question 1, §5.3.
- **Class / state / severity:** explicitly acknowledged unknown, but no executable decision procedure; open/unverified; P0.
- **Evidence:** live-report: Depth click `depth-click:8437ba75-8344-4a57-9d3d-b50188942bd4` has no public account/bucket target. Narrow operation `0a90880e-4efe-470e-a2bc-326eb975e68d` verified a `redown` destination. Different operations do not prove equality.
- **Consequence:** changing routing or reusing Narrow's plan could send files to an unrelated destination.
- **Disposition / replacement:** keep this uncertainty; make the read-only comparison in [plan §2](FINAL_IMPLEMENTATION_PLAN.md#2-first-decision-read-only-owner-local-comparison) the first gate. Compare connection/account/bucket and report prefix equality separately; unequal prefixes are expected.
- **Verification:** owner-local booleans with missing-record and receipt/record-consistency checks; no private account IDs in public artifacts.

## D03 — Current state cannot retrospectively establish incident state

- **Proposal:** §2 asks whether the plan still existed; §6.1 mentions profile/time, without a capture protocol.
- **Class / state / severity:** missing evidence/provenance requirement; open; P1.
- **Evidence:** source: local lookup is mutable `chrome.storage.local` (`background:40`); histories record `at` (`current-store:267`), but do not snapshot the rejecting plan. The public records lack matching timestamps/profile identity.
- **Consequence:** a plan found now does not disprove a historical absence; a missing plan now does not prove it was never prepared. Reload, profile change, setup and code changes can invalidate comparisons.
- **Disposition / replacement:** record browser/profile locally, extension ID, build revision **and sourceDigest**, current row/generation, record times and intervening changes. Repeat a single attempt only when authorized. Do not reset/reinstall to obtain a clean baseline. Trade-off: one current comparison may leave the historical cause unknown.
- **Verification:** evidence tied to one build/profile/time window; missing records explicitly stop historical attribution.

## D04 — PLAN_MISSING is a later observation, not an atomic rejection reason

- **Proposal:** §2 “first observed failure ... PLAN_MISSING”; §3/§6.8 treat missing-plan diagnosis as the branch to explain.
- **Class / state / severity:** confirmed diagnostic attribution limitation; open; P1, potentially P0 if it directs unsafe repair.
- **Evidence:** source: `native-click:27–30` calls `transport.status`, then performs another lookup. `transport:24` reads selected plan, `cap:8–9` reads again and rejects, and status can read proof again. Local production-module probe **P1** in the evidence index returns `WORKER_SETUP_REQUIRED / PLAN_MISSING` when the rejecting read was actually a **pending** plan and the later read was null; no network occurred.
- **Consequence:** “plan missing at the exact rejecting read” and “never prepared” are stronger than the available evidence. A repair recommendation may target the wrong state.
- **Disposition / replacement:** retain the report as evidence of a missing diagnostic-time lookup. If state changes reproduce, tie any future diagnostic to its rejecting observation or label the follow-up read clearly. Do not redesign shared transport just to perfect diagnostics before fixing a stable demonstrated prerequisite.
- **Verification:** changing-plan and stable-missing controls; no inference of a race in the owner's browser from the synthetic probe.

## D05 — A genuine missing prerequisite has no routing-only fix

- **Proposal:** §4 questions 2–5 and §7 request a minimum code change that makes a real save succeed.
- **Class / state / severity:** missing explicit no-code outcome; open decision; P0.
- **Evidence:** source: `transport:8–15` requires a ready matching plan to sign a capability. `deployment:69` looks up the exact account/bucket digest. Listing does not supply the signing key.
- **Consequence:** bypassing preflight or mapping Depth to Narrow cannot turn an absent plan into a valid capability.
- **Disposition / replacement:** rank “no saving-code change; resolve an existing, legitimately missing prerequisite with explicit authority” first when that is the observed case. If no safe approved remedy is available, state the precise external blocker rather than manufacture a patch. Trade-off: success may require an owner action.
- **Verification:** stable empty lookup never dispatches/writes; properly prepared same target later saves through unchanged existing transport.

## D06 — “Existing approved repair/resume” is not inherently safe or target-specific

- **Proposal:** §4.2, §5.7, §6.8 call for an existing approved remedy but do not specify its target/effects.
- **Class / state / severity:** confirmed integration constraints omitted from the proposed remedy; open; P0.
- **Evidence:** `app:127–129` resume calls `initializeCloudflare`, whose target selection uses global Default/account (`onboarding:46–60`). Explicit repair requires an exact configured target (`onboarding:91–96`); Depth saves bucket-root scopes (`depth/index:5–10`), not individual discovered folder records. Explicit repair can pass `rebuild:true` (`onboarding:124`), enable a Worker route, write a readiness probe (`138–141`) and commit setup metadata (`145–147`). A Default in another account is also rejected (`92`).
- **Consequence:** “click Resume” can select a different target, fail `TARGET_NOT_CONFIGURED` for a child, or redeploy shared infrastructure. The probe itself writes an object. It is not read-only recovery.
- **Disposition / replacement:** use existing **exact-target** repair only after proving its scope and effects. For preparation association only, relate a child to its already selected Depth bucket root; preserve the child's prefix for saving. If an existing prefixScope excludes root but allows the child, never probe/rebuild root or widen scope just to satisfy repair membership; require a target-safe permitted remedy or stop that change. Do not create Narrow records or change Default to satisfy setup. Where current guards make that unsafe, propose a Depth-origin target-binding correction separately with explicit scope; do not globally remove guards.
- **Verification:** child/root, nondefault bucket, other-account Default, same-account working controls; assert approved remote effects and unchanged destinations/defaults. No setup executed during this review.

## D07 — Lost secret recovery is not bucket discovery

- **Proposal:** §4.2/§6.8 correctly warn against guessing credentials, but leave “recovery” unspecified.
- **Class / state / severity:** missing operational distinction; open; P0.
- **Evidence:** `deployment:55–65` generates a new random name and secret when no plan exists, stores a pending plan, then uploads it. The code cannot obtain an old signing secret by listing buckets or knowing the Worker name. Ordinary menu/configuration backup is not evidence of a complete transport-secret backup.
- **Consequence:** invoking setup may create a second Worker rather than recover the existing one; an arbitrary old/foreign profile blob could restore the wrong authority.
- **Disposition / replacement:** distinguish never-prepared, known-profile mismatch, recoverable validated same-profile state, and lost unrecoverable secret. Only an established authorized recovery path may restore matching private state; otherwise explicit owned preparation/repair with disclosed effects is required. No secret copy from another account/registry namespace and no new recovery subsystem.
- **Verification:** metadata-only presence/compatibility checks, known interruption replay tests, no resource creation during diagnosis; stop rather than invent credentials.

## D08 — Bucket-wide identity does not mean bucket-wide prefix authority

- **Proposal:** §3 plan reuse and §5.3–4 “same bucket Worker” can be overgeneralized.
- **Class / state / severity:** necessary qualification; implemented guard already present; not a defect in existing scope enforcement, P0 if bypassed.
- **Evidence:** `transport:13` enforces `prefixScope`; status requires matching current code and same-code verifiedTargets proof (`24–27`). A deployed ready plan may return **PREPARED**, not READY. Capability/save rechecks remain necessary.
- **Consequence:** replacing per-prefix authorization with “bucket was ready once” can authorize an excluded folder or accept obsolete proof.
- **Disposition / replacement:** reuse bucket **plan identity**, never blanket write authority. Preserve prefix/session/code-digest checks, PREPARED, upgrade-required and revoked outcomes. Do not deploy a Worker per folder; do not widen prefixScope automatically. Trade-off: legitimate selected folders may remain blocked pending explicitly authorized scope preparation.
- **Verification:** exact prefix, allowed descendant, similarly named sibling escape, bucket root outside a restricted prefix, changed session/build and proof; different buckets never borrow a plan.

## D09 — Deleting the preflight is not a demonstrated fix

- **Proposal:** §4.3 and “Depth ... hooks do not block a valid save independently”.
- **Class / state / severity:** unproven simplification; current dependency confirmed; open; P0.
- **Evidence:** `background:43,136–143` still gates authorizedTargets on cached READY. `engine:81,92` can enter setupOnly; `onboarding:159` returns FRESH_CLICK_REQUIRED on a READY setup-only path. The paired existing test injects these conditions; it does not exercise the full production background (D24).
- **Consequence:** removing the wrapper also removes its fresh observation update, potentially restoring a zero-write fallback; missing plans remain missing in the shared transport anyway.
- **Disposition / replacement:** retain the preflight temporarily, not as ideal permanent architecture. First establish the exact prerequisite. Simplify only after a real-module paired test proves the remaining engine path gets fresh exact-target readiness and retains failure feedback. Do not call removal the PLAN_MISSING repair.
- **Verification:** before/after production-wiring stale-negative, READY, absent-plan and PREPARED tests, plus native/R2 success. No authorization bypass accepted.

## D10 — “One authority” needs a concrete boundary, not fewer security checks

- **Proposal:** §4 shared ownership, §6.2–3 authorization/readiness separation.
- **Class / state / severity:** under-specified shared-boundary change; open; P1/P0 isolation risk.
- **Evidence:** readiness is read in Depth preflight, background authorization, onboarding check and transport capability; `engine:97` rechecks at dispatch. These checks serve different purposes. `getAuthorization` conflates readiness and membership; it is shared with working modes.
- **Consequence:** globally changing that contract can alter Simple/Narrow availability, fallback and retries. Removing rechecks to reduce duplication creates time-of-check/time-of-use exposure.
- **Disposition / replacement:** keep transport capability/verification and current engine/native authority as the enforcement path. Distinguish readiness explanation from authority semantically; do not globally rewrite getAuthorization for this P0. A Depth-only, call-scoped adjustment is eligible only after a false blocker is proven and a shared-function conditional can be isolated/tested. Otherwise defer broader design.
- **Verification:** denied membership, expired session, prefix rejection and menu change after preflight must still stop dispatch; non-Depth path/call graph unchanged.

## D11 — A Depth guard does not isolate shared mutable cache effects

- **Proposal:** rules 1/4, §5.1 and §6.13 assume guarding a shared edit by Depth origin is enough.
- **Class / state / severity:** confirmed cross-mode interaction path, not a demonstrated wrong upload; open; P1.
- **Evidence:** `background:42–43,143` uses the **same snapshots Map** for Depth refreshReady and all modes' remoteReady. A Depth click to a shared physical target can affect the next Simple/Narrow cache hit even if their source is unchanged.
- **Consequence:** Depth-off menu hashes cannot establish unchanged Simple/Narrow runtime behavior. Altering cache/session lifetime can change when a control rechecks readiness.
- **Disposition / replacement:** test mixed interleavings with identical targets and session/config changes. Preserve current behavior for a minimal prerequisite fix; if changing cache semantics becomes necessary, prefer invocation-scoped state over a new global cache and prove noninterference before accepting it. Trade-off: extra tests, not another upload engine.
- **Verification:** Simple/Narrow before/after a Depth click, warm/cold, same/different target, session loss; compare outcomes, destinations, calls and stored state.

## D12 — Attempt logging currently blocks the save it observes

- **Proposal:** §4 permits thin reporting only if it does not independently block a valid save; §1 prioritizes actual files.
- **Class / state / severity:** confirmed current code conflicts with proposed principle; open; P0 for the affected storage failure, not the reported missing-plan cause.
- **Evidence:** `native-click:17–19,39` awaits the new pending click record before run; the current storage-error test intentionally asserts zero dispatch. This is separate from indispensable durable configuration/remote-operation safety.
- **Consequence:** click-log quota/write failure can prevent an otherwise readable, authorized configured target from reaching the engine.
- **Disposition / replacement:** explicitly distinguish observational attempt logging from required authoritative persistence. In a future bounded Depth change, a nonessential attempt-log failure should not skip the original engine; the engine's own durable guards remain mandatory. Report unavailable observation through existing feedback, never bypass missing/corrupt CURRENT or operation reservation. No extra log store.
- **Verification:** independently inject attempt-log failure versus CURRENT/remote-operation safety failure. First may reach the safe engine; second must remain blocked. This audit implements neither change.

## D13 — Feedback has its own storage gate and late-delivery risk

- **Proposal:** §1.6, §5.8 require immediate understandable outcomes without internal logs.
- **Class / state / severity:** confirmed failure path plus unverified user-delivery timing; open; P1, P0 for silent failure case.
- **Evidence:** `background:144` awaits lastDepthClick storage before notification/message catches; its rejection aborts all feedback, then `native-click:43` swallows it. Feedback otherwise waits until preflight/run ends; network requests can take up to 30 seconds each (`transport:18`).
- **Consequence:** precisely a storage failure can suppress the only visible explanation; a blocked/tardy click still appears inert. A recordCode can also be lost at this boundary.
- **Disposition / replacement:** decouple failure notification/open-Shelf status from optional lastDepthClick persistence in a small Depth-only correction, with best-effort delivery and no new UI/logging service. Retain truthful pending/uncertain labels; don't promise Chrome permits a late panel open.
- **Verification:** actual production feedback callback with local.set rejection, closed/open Shelf, notifications denied, delayed status; no synthetic “visible” credit for merely invoking a spy.

## D14 — Attention classification is intentional; fallback action handling is separate

- **Proposal:** §6.4 asks whether role=save plus actionKind=attention is wrong.
- **Class / state / severity:** classification itself not a defect; fallback source contract mismatch confirmed, incident attribution unverified; P1.
- **Evidence:** `menu-spec:101–106` deliberately preserves target/label/action while enabling attention. `registrar:194–203` can dispatch a provider fallback action; `background:159–161` reconstructs engine.save from menuItemId. Current Depth preflight intercepts the stable unready live case before that callback.
- **Consequence:** renaming/reclassifying menu rows could break existing UX without fixing the registry. Conversely, unconditional preflight removal can expose the mismatch.
- **Disposition / replacement:** retain menu classification/IDs. Test fallback integration through actual callback wiring, not only spies. If it fails for a proven Depth case, correct only the Depth integration branch; leave protected provider paths alone.
- **Verification:** ready/unready attention rows, provider-action versus physical save, preserved exact clicked target, meaningful terminal result and zero unexpected upload.

## D15 — Physical representations differ, and arbitrary second connections are unsupported

- **Proposal:** §1.4, §6.5 canonical consistency and same-account/two-connection test.
- **Class / state / severity:** missing normalization/valid-domain definition; source-confirmed; P0 if wrong target reused.
- **Evidence:** menu target uses provider `cloudflare` and trailing slash (`menu-identity:14–38`); remote destination uses `cloudflare-r2` and strips slash (`wire:4–6`). Transport requires connectionId exactly `cloudflare:<accountId>` (`wire:5`). Production lookup probe P2 rejects an arbitrary second connection as DESTINATION_INVALID.
- **Consequence:** naive JSON comparison reports false mismatch; “support two connections” would expand architecture and registry ownership beyond Depth repair.
- **Disposition / replacement:** compare semantic connection/account/bucket fields across stored remote records and normalize prefix for comparison only. Test rejection for unsupported connection IDs rather than invent aliases or change the key. Preserve case/Unicode/object-prefix identity; no speculative decoding, lowercasing or path rewriting.
- **Verification:** root, trailing slash, invalid slash/traversal, duplicate names across buckets/accounts, unsupported connection rejection with no fallback.

## D16 — Independent native IDs and collision handling already exist

- **Proposal:** §3 and §6.6 collision/identity questions.
- **Class / state / severity:** largely resolved design invariant; residual hash collision risk remains; not a defect requiring a new ID scheme.
- **Evidence:** `menu-identity:38–51` separates target/scope keys and 64-bit stable ID; `menu-spec:86–106` distinguishes native placements/action IDs and checks duplicate/collision states. Same physical target may intentionally share actionId across different native rows.
- **Consequence:** copying Narrow IDs, resetting IDs or replacing the hash to “fix” PLAN_MISSING would risk stale routing and configured presentation. Hash collisions are not mathematically impossible.
- **Disposition / replacement:** keep the current identities, binding validation and explicit collision failure; test actual identity properties. Defer a new ID registry unless a real collision is reproduced. Trade-off: an explicit collision would still require isolated diagnosis.
- **Verification:** same target/different modes gives distinct native IDs and equal physical action identity; duplicate sibling labels disambiguate without changing targets; stale/forged binding fails.

## D17 — Native ACK is necessary but is not the observed first failure

- **Proposal:** §3/§6.11 registrar/restart reliability concerns.
- **Class / state / severity:** valid future risk already guarded; observed ACK failure hypothesis disproven for the supplied acknowledged attempt; P1.
- **Evidence:** live-report generation 26 equals acknowledged 26 with NATIVE_ACKNOWLEDGED. `registrar:125–181` fails closed for partial application; `213–219` cold metadata only classifies. `background:152–157` and engine recheck current generations/config.
- **Consequence:** redesigning the registrar cannot supply the plan; trusting historical ACK or bypassing failed creates could authorize stale actions.
- **Disposition / replacement:** preserve full-ACK semantics and native scrolling; test restart/reapply/concurrent config transitions as regressions, not the primary fix. Retain the separate old NATIVE_APPLY_INCOMPLETE incident.
- **Verification:** failed parent/child/removeAll/timeouts, first failed row, no upload; cold start re-acquires current authority; changed target after preflight never routes via an old selection.

## D18 — Listing success is neither a Worker plan nor a save grant

- **Proposal:** §1.2–5 and §3 describe discovery versus preparation correctly but do not turn that distinction into a stop rule.
- **Class / state / severity:** not a defect in listing; operational assumption remains open; P0 if bypassed.
- **Evidence:** `r2-adapter.mjs:list/page` uses authenticated bucket/object listing. `background:83–105` can discover prefixes before independently checking readiness; `transport:8–15` needs a local plan and scoped grant.
- **Consequence:** visible folders can legitimately be attention entries. The menu cannot prove a usable Worker or justify generating credentials.
- **Disposition / replacement:** keep discovery/readiness separate and require exact plan existence/compatibility before diagnosing mapping. Do not recreate a Worker just because a folder is new.
- **Verification:** listing succeeds with an empty local plan registry; click accurately blocks with no transport write.

## D19 — Complete, stale and pending describe different discovery states

- **Proposal:** §6.9 risks accidental replacement of valid bounded enumeration with “failure”.
- **Class / state / severity:** partly resolved and partly open recovery/scale risk; P1.
- **Evidence:** `depth-inventory:9–20` throws on failed pages, invalid immediate child or repeated cursor; marks complete=false at the configured boundary. `background:90–114` retains pending markers and considers listedDepth when determining stale. Boundary completion is not full-cloud completeness. `getInventory:97–105` persists completed results after the selection loop, so a later bucket failure deserves interruption tests.
- **Consequence:** interpreting a bounded valid scan as empty/invalid can disable real destinations; treating a failed page as complete can invent readiness. Refactoring recovery broadly could harm stored state.
- **Disposition / replacement:** preserve current semantics for this plan. Test bounded versus failed/stalled pages and multi-bucket interruption before touching Depth discovery. Repair only a reproduced save-blocking state transition; no full-cloud rescan requirement.
- **Verification:** boundary at chosen limit, increasing/decreasing limit, marker-only/virtual folders, interrupted pages and restart with pending marker; exact paths retained.

## D20 — Per-prefix checks can amplify work, but optimization is not the current remedy

- **Proposal:** §3/§6.10 request avoidance of redundant checks without measured thresholds.
- **Class / state / severity:** source-supported cost, runtime impact unmeasured; open; P2 unless measured as a blocker.
- **Evidence:** `background:118–127` enumerates root plus each in-range folder for readiness with concurrency four; `transport.status:24` includes capability/authority calls; native apply creates entries sequentially. A bucket-wide cache cannot replace prefix-scope enforcement.
- **Consequence:** wide trees may cause latency; indiscriminate caching can grant a disallowed prefix or leak readiness across sessions. A benchmark project can also distract from PLAN_MISSING.
- **Disposition / replacement:** measure request count/duration for 5/20/100+ siblings and multiple buckets with existing tools after the missing-plan branch is resolved. Only coalesce identical in-flight read-only checks or reuse safe bucket metadata if measured necessary; retain exact capability checks. No arbitrary caps or new scheduler.
- **Verification:** counts and elapsed time, failures/cancellation/rate limits, same/different prefix/session; actual native scrolling remains separately observed.

## D21 — The acknowledged attempt did not test source acquisition or transfer

- **Proposal:** §5.2/§7.H definition of working save could be satisfied too early after plan lookup succeeds.
- **Class / state / severity:** missing downstream gate specificity; open/unverified; P0.
- **Evidence:** Depth wrapper stops at worker status before `run`; `background:159–161` sourceFromClick and `engine:93–99` transport dispatch are downstream. No Depth R2 receipt accompanies the reported failure.
- **Consequence:** repairing plan availability can expose an independent source URL, context, permission, capability or transfer failure. A READY label is not a saved file.
- **Disposition / replacement:** first test one safe link with actual production wiring through Worker verification; then representative image/page/video/audio contexts as supported. Preserve source precedence and privacy; do not weaken checks to claim a save.
- **Verification:** same native clicked ID, canonical target, remote operation and independently inspected R2 object for root/intermediate/terminal; no success inferred from wrapper completion alone.

## D22 — Exact-key proof must account for the existing conflict policy and failure truth

- **Proposal:** §5.8/§7.H specify verified objects, but omit overwrite/conflict/retry semantics.
- **Class / state / severity:** missing requirement; open test gate; P0.
- **Evidence:** `wire:6` uses conflictPolicy=keep-both; `engine:98–100` and `transport:31–48` distinguish verified, partial, pending and uncertain outcomes. Independent HEAD/version/size is stronger than a spy receipt.
- **Consequence:** a suffixed conflict key may be correct; matching only the original filename can falsely fail verification or encourage unsafe replay. Conversely, a click-attempt record or an old object can be mistaken for this transfer.
- **Disposition / replacement:** correlate click to remote operation and final receipt key; validate intended account/bucket/prefix plus actual conflict-resolved filename, version/size and content evidence where available. No automatic retry of uncertain writes. Two deliberate clicks need not imply one upload; define explicit retries versus new intents.
- **Verification:** existing filename conflict, lost completion/history and uncertain verification; inspect receipt before retry, never invent success or delete an object to clean the evidence.

## D23 — Shared-resource effects can violate noninterference without a source edit

- **Proposal:** rules 1/4, §5.1 and §6.13 protect mode source but do not fully specify remote-resource isolation.
- **Class / state / severity:** operational collision risk; open; P0.
- **Evidence:** modes can use one account/bucket plan; `deployment.prepare` may rebuild that same Worker and `onboarding` may commit global setup metadata. Default/account selectors are shared.
- **Consequence:** even a Depth-triggered repair could interrupt Narrow's working Worker, alter prefixScope, rotate authority or change global defaults/configuration. “No edits to Narrow files” is insufficient.
- **Disposition / replacement:** never redeploy a healthy shared Worker merely to fix a Depth route; require a proven target/prerequisite defect and explicit authority for any shared-resource effect. Snapshot/compare control plan metadata, code digest, scope, settings and real control outcome; do not export secrets. Stop the specific shared change if isolation cannot be established.
- **Verification:** Simple/Narrow same and different bucket controls before/after, immutable menu/config state and known authorized readback; no hidden setup side effects.

## D24 — Prior callback tests do not prove production plan/Worker equivalence

- **Proposal:** §3 tests and §6.15 need an explicit evidence ceiling.
- **Class / state / severity:** confirmed test limitation; open; P1, P0 if treated as real-save proof.
- **Evidence:** `depth-p0-click.test:12–14` injects READY status, lookup returning null, a boolean readiness cache, a manufactured FRESH_CLICK_REQUIRED provider callback, and remoteSave returning verified. That useful paired fixture does not run actual background→provisioner→transport→Worker acceptance. `depth-scope-regression:15–21` toggles Simple/Narrow together; its resolver supplies the selected row's own target as authorization.
- **Consequence:** a self-consistent mock can pass while an actual plan is missing, a shared cache differs or a Worker rejects the capability.
- **Disposition / replacement:** retain small wiring tests, add one targeted real-module path with production lookup, transport/capabilities and existing workerd/Worker fixture. Inject only OAuth/provider/storage boundaries and failures; assert exact object data independently. No second test platform or giant atlas. Live Windows/R2 remains indispensable.
- **Verification:** empty registry cannot yield a verified save; one prepared plan serves valid root/intermediate/leaf; wrong bucket/account/prefix/code fail. Name mock/native/Worker-local/cloud evidence separately.

## D25 — Existing full-suite and Quick browser failures need separate baselines

- **Proposal:** §6.15 mentions the Simple golden and Quick assertion without specifying source/contract diagnosis.
- **Class / state / severity:** historical known failure plus confirmed browser-test drift; current historical Quick outcome unverified; P1 test validity.
- **Evidence:** prior committed `DEPTH_P0_REPAIR/EVIDENCE/final-full.log` shows 387/388 and a Simple golden mismatch. `scripts/test-phased-narrow-browser.mjs:19–26` reads flags immediately after edits without shared Save, and uses obsolete manager selectors; current `app:344–374,476–498` stages then commits on Save and uses data-manager-mode.
- **Consequence:** blanket “all tests pass” can hide pre-existing failures; changing Simple/Narrow behavior to satisfy stale tests would violate the task.
- **Disposition / replacement:** baseline exact failing assertion, build and runner. Treat the obsolete test as contract drift requiring a separately justified test-only update; do not assert it caused a particular historical CI failure without that artifact. Do not suppress the Simple golden failure or mutate protected modes.
- **Verification:** current assertions mapped to actual UI Save contract, separate historical/fresh outcomes, preserved controls. This review reruns limited existing suites only, not that browser gate.

## D26 — Noninterference requires runtime controls with Depth enabled

- **Proposal:** §5.1/§6.13/§7.F focus on preserved IDs and unchanged mode implementations.
- **Class / state / severity:** missing sufficiency criterion; open; P0.
- **Evidence:** generated 192 Depth-off hashes do not run background/transport; D11/D23 identify shared cache/resource channels. Existing native IDs and configurations can remain equal while a save outcome changes.
- **Consequence:** a plan may promise “completely untouched” without detecting mixed-mode runtime regressions.
- **Disposition / replacement:** freeze source/lockfiles/configuration and complete menu plans, then compare Simple/Narrow outcomes and calls before/after Depth activity in mixed modes, same target and distinct targets. Compare established semantics, not wall-clock equality or identical operation UUIDs. Roll back only the new Depth patch if a new control regression appears; never reset user state.
- **Verification:** no changed native IDs/order/availability/routes/Default/Quick; saved control keys and current authority remain correct under cold/warm/session/config-change interleavings.

## D27 — Operator instructions need a safe, bounded observation, not a debug project

- **Proposal:** §6.1/§7.J ask for owner observations/handoff but supply no executable comparison.
- **Class / state / severity:** missing practical prerequisite; open; P1.
- **Evidence:** the existing current.readRemoteResult/registrar inspection and chrome.storage.local lookup suffice; no new endpoint or export format is needed. Full plan blobs contain secrets; histories contain private targets and possibly source provenance.
- **Consequence:** asking for a raw diagnostic dump risks credentials/privacy and imposes work without deciding the correct branch.
- **Disposition / replacement:** give one read-only local snippet that prints presence/consistency/equality and plan metadata booleans only. It must handle absent records/current rows and keep actual account/prefix values private. No package/install/login step for this diagnosis; copy only the small summary. Trade-off: no retrospective certainty when records are gone.
- **Verification:** missing records and different-account tests; snippet never prints entire plans, tokens, URLs, account IDs or full history. See final plan.

## D28 — “Existing remedy” must be ordinary actionable UX, not more diagnostics

- **Proposal:** §1.6, §4 thin UI reporting, §5.7.
- **Class / state / severity:** under-specified operator action; open; P1.
- **Evidence:** existing message points to Save Results; setup UI has target selection constraints (D06). Adding another code/log does not prepare a bucket or correct a target.
- **Consequence:** the owner may receive a more precise PLAN_MISSING without a safe route to save.
- **Disposition / replacement:** explain the exact selected bucket prerequisite and the explicit existing target-safe action if validated. For a wrong target, fix Depth's erroneous source mapping; for a valid unprepared target, do not silently switch it to redown. Reuse existing UI/records; no new dashboard or per-folder status system.
- **Verification:** owner can complete the intended permitted root/branch/leaf save without reading internal traces; blocked/uncertain messages remain accurate if remedies are unavailable.

## D29 — Implementation scope must follow a terminating decision tree

- **Proposal:** §7 asks for a final plan while older linked requests demand implementation in an intensive run; the candidate leaves several possible architecture projects open.
- **Class / state / severity:** scope/priority ambiguity and missing stop conditions; resolved by current user request and the revised plan; P1.
- **Evidence:** this request and original rule 6 explicitly authorize documents only. Older implementation mandates do not override that. ACK/refactoring/performance questions do not supersede the live worker-stage evidence.
- **Consequence:** implementation now or open-ended discovery would violate intent; a future run might spend its whole window building generic tracing instead of resolving a prerequisite.
- **Disposition / replacement:** commit only review documents now. Future run: bounded read-only classification → one demonstrated target/prerequisite correction → exact native/R2 proof; if missing information is decisive, name it and stop that branch while completing independent tests. Defer architecture cleanup and scale work unless they are actual blockers.
- **Verification:** review commit contains only the new review directory; future diff constrained by branch condition, no migrations/reset/infrastructure work without scope.

## D30 — Build/test results and improved diagnostics cannot close the live gate

- **Proposal:** §5.9/§7.H are sound but the release handoff lacks a compact evidence rule.
- **Class / state / severity:** retained requirement with strengthened stop gate; live Depth success still unverified; P0.
- **Evidence:** owner report verifies a Narrow object, not a Depth one. Existing administrator-blocked native receipts remain prior-run evidence; this review performs no new installed Chrome or R2 test. Version 0.3.19 alone does not identify a built source digest/dirty tree.
- **Consequence:** a passing local suite, a score increase or a completed click record could incorrectly close issue #12.
- **Disposition / replacement:** require correlated native root/intermediate/leaf clicks and independent exact-destination cloud results plus Simple/Narrow controls. Distinguish review approval from implementation readiness. No numeric score uplift from proposal documents. If live blocked, provide short Windows verification and keep NOT READY.
- **Verification:** build revision+digest, Chrome version, current ACK, click/remote IDs, actual conflict-resolved key and independent HEAD/version/size; absence of any required observation stays UNVERIFIED.

## D31 — Cold-worker recovery does not necessarily execute the same preflight path

- **Proposal:** §6.11 and §7 reliability accept a generic restart check without spelling out post-recovery saving.
- **Class / state / severity:** confirmed branch difference, behavioral impact unverified; open; P1.
- **Evidence:** `native-click:21–22` goes directly to run when current ACK is pending/missing; `background:152–157` can recover it later inside beforeClick. The new preflight's READY refresh is not rerun in that branch. The existing cold-worker test only proves metadata classification and fail-closed ACK, not a successful recovered save.
- **Consequence:** a warm-click fix may not cover the first post-restart click; an old setup-only diversion could remain under particular cache/recovery timing. This is not the supplied warm generation-26 failure.
- **Disposition / replacement:** require a single production-host cold recovery → current ACK → same prepared target → save test, with READY/PREPARED/missing variants. Correct only a demonstrated Depth sequencing defect; do not trust historical ACK or add startup provisioning. Trade-off: one additional lifecycle regression, no registrar redesign.
- **Verification:** first valid click after recovery either uploads to the exact target with proof or accurately blocks; no extra click requirement silently assumed.

## D32 — A diagnostic read should not initialize missing profile state

- **Proposal:** §6.1/§7.J call for safe read-only comparison without describing the read path.
- **Class / state / severity:** operational side-effect omission; source-confirmed, avoided by revised snippet; P1.
- **Evidence:** `current-store.mjs:19–33,268` readRemoteResult uses establishment/open machinery; `background:32,35` may set trusted access levels on first initialization. A missing database can otherwise enter schema creation. This is not proof that an ordinary already-initialized owner read changes product state.
- **Consequence:** a supposedly diagnostic script can initialize a wrong/empty profile or obscure evidence if it assumes absence means a fresh user.
- **Disposition / replacement:** the final comparison checks existing DB presence, uses an existing-store readonly transaction and aborts any unexpected creation/upgrade; no calls to setup/save or store-read initialization. This is a temporary documented observation, not a new app data API or migration. It is intentionally tied to the audited schema; unexpected schema stops.
- **Verification:** syntax check plus manual side-effect review; no owner records read in this review. A missing/blocked/schema-mismatched DB returns STOP instead of creating/resetting it.

## Original proposal coverage check

Every section and mandatory seed was reviewed; entries may intentionally span sections.

| Original element | Coverage / disposition |
| --- | --- |
| Header rules 1–6, repository/ref/date/status | D01, D23, D26, D29–30; retain Depth-only, existing design and review-only boundaries |
| §1 current setup and six expected steps | D01–02, D08, D15, D18, D21–23, D28; preserve working mode/menu design, sharpen readiness and proof |
| §2 real outcomes and unknown equality | D02–05, D17, D21, D27, D30; retain evidence without equating operations |
| §3 code claims and file inventory | D04, D08–20, D24–25; confirm lookups/normalization and distinguish observations |
| §4 candidate ownership/diagram/why | D01, D06–15; partly retain; current implementation already uses common transport |
| §4 questions 1 / 2 / 3 / 4 / 5 / 6 | D02–03 / D05–08 / D09–14 / D01,D15–16 / D05,D20–22,D28–29 / D24–26,D30 |
| §5 criteria 1–10 | D06–08, D15–17, D21–26, D28–30; retain exact targets, no unauthorized setup and real-save gate; strengthen runtime isolation |
| §6 audit fields and seeds 1–4 | D02–04,D06–07 / D09–10 / D10–11 / D14 |
| §6 seeds 5–8 | D15 / D16–17 / D08,D23 / D05–07 |
| §6 seeds 9–12 | D18–19 / D20 / D17,D31 / D21–22,D30 |
| §6 seeds 13–16 | D11,D23,D26 / D01,D12–13,D28–29 / D24–25 / additional D03–04,D06,D11–13,D22,D27,D29,D31,D32 |
| §6 per-item states, no bad-news omission and coverage requirement | Every entry states classification, current state, severity, evidence, consequence, disposition/trade-off and verification; this table closes coverage |
| §7 deliverables A–J, location and decision rule | Ledger first; final plan covers recommendation, facts, ranked options, exact boundaries, identity tests, tradeoffs, done gate and compact future request |

Further material omissions identified beyond the seed list include non-atomic plan diagnostics (D04), exact-target setup selection/rebuild/probe effects (D06), shared mutable cache/resource noninterference (D11/D23), observation storage blocking both save and feedback (D12/D13), conflict-resolved keys/retry intent (D22), and bounded safe operator evidence and non-initializing reads (D27/D32). None is silently reclassified as the proven owner incident cause.
