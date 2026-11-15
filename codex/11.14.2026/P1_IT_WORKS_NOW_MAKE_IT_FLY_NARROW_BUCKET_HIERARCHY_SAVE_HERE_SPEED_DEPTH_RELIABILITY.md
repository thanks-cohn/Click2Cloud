# CODEX IMPLEMENTATION REQUEST — **IT WORKS → NOW MAKE IT FLY**
## Click2Cloud native right-click V3: real Narrow bucket ancestry + “Save here”; dramatic speed improvement; Depth readiness reliability; truthful diagnostics

**Date:** 2026-11-14 (America/Chicago)  
**Repository:** `thanks-cohn/Click2Cloud`  
**Current handoff branch:** `review/recorder-first-complete-export-2026-11-14`  
**Protected, live-verified Git tag:** `click2cloud-rightclick-v3-live-verified-2026-11-14` (annotated tag points to commit `156ed15c0de5afe3c6d59f4a635db23962ab8600`).  
**Status:** CODEx WORK REQUEST ONLY. The creation of this file does **not** implement, test, deploy, or fix anything.  
**Priority:** P1 user-facing functionality/performance/reliability, with P0 no-regression, authorization, non-destructive-state and proof-truth gates.

# 0. The owner’s point: **IT WORKS.** Preserve this achievement.

The achievement is not merely a passing unit test: the owner actually used Chrome’s native right-click menu to save images into two real Cloudflare R2 QA buckets, and subsequently inspected actual stored objects and their operation metadata. The three distinct modes worked end-to-end against the planned destination set: **Simple 6/6; Narrow 6/6; Depth 25/25; 37/37 locations in the intended mode**. Depth reached its selected bucket's actual five-level hierarchy and sibling folders. R2 objects carried correct bucket, prefix, mode and operation IDs, and the latest documented Narrow diagnostic sequence matched **7/7** operations to actual R2 files. This is a **working baseline**, not a reason to rebuild the architecture.

The beauty to protect: a user can right-click an image, choose an exact cloud location, and it actually arrives in the correct R2 object key. Simple provides one-click configured choices; Narrow provides a *curated user-configured hierarchy*; Depth provides discovered bucket/folder navigation. The mission now is **make it fast, comprehensible, and reliably ready**, without changing what a save means or pretending completion.

**Keep the tag immutable.** Start a new implementation/review branch from an appropriate current HEAD after first recording exact SHA, dirty state and differences from the live tag. Do not overwrite, move or retag the milestone. Preserve the working installed Chrome extension identity, existing CURRENT data, configuration and approval, logged-in accounts, remote buckets/Workers, object contents and access. No reset, uninstall, destructive migration, automatic reprovisioning, cloud deletions, external deployment or GitHub push/merge without explicit owner authority.

# 1. FIRST: establish the logic2real gap, not guesses

Before changing code, audit how current source, stored configuration, projected menu tree, native Chrome parent IDs, onClicked route, Worker/R2 authorization, result notifications and RAW export correspond to the owner’s **actual** observations.

**Observed evidence to preserve as baseline (not fresh post-fix proof):**
- Narrow was represented like `Cloudflare → C2C-QA → Narrow → A` or `Cloudflare → C2C-QA (2) → Narrow → C2C-QA2/Narrow/A`; it did **not** clearly show real bucket names `click2cloud-qa` and `click2cloud-qa-2` as independent parents.
- Saves nonetheless reached exact physical `C2C-QA/Narrow/{A,B,C}` prefixes in both buckets, correctly distinguishing the buckets in R2 custom metadata. Display names such as `C2C-QA2/Narrow/A` were presentation labels, **not** physical keys.
- RAW baseline in the milestone: **111 attempts, 88 verified saves, 172 detailed events; median click-to-verified ≈ 9.56 s; p95 ≈ 40.77 s**. Individual delays included very slow pre-dispatch time; investigate, do not attribute to R2 without traces.
- Intermittent historical `WORKER_SETUP_REQUIRED` and separately observed `NATIVE_APPLY_INCOMPLETE` occurred even though later Depth saves worked. Also investigate `AUTHORIZATION_LOST` appearing in a Depth plan-recovery test. These are symptoms, **not established root causes**.
- QA coverage and live metadata are independent of installer/Chrome-native evidence. Do not claim the baseline proves all future or repaired behavior.

**Source leads to inspect, verify against current HEAD (not assertions of root cause):** `src/modes/nested/index.mjs` (internal `nested` = user-facing Narrow), `src/core/menu-spec.mjs` (composite layout, the branch that maps an unlabelled root Narrow row to the Cloudflare parent, and duplicate sibling label suffixes), `src/core/menu-identity.mjs` (exact `scopeKey` identity), `src/chrome/registrar.mjs` (native parent IDs, ACK and stable generations), `src/api/config.mjs`, `src/core/engine.mjs`, `src/core/action-resolver.mjs`, `src/modes/depth/index.mjs`, `extension/background.mjs`, current READY/Worker transport and recorder code. Check relevant tests and CURRENT workings map.

Produce an explicit **BEFORE discrepancy matrix**: required logic → present source behavior → actual generated parent tree → observed Chrome UX → verified R2 target/operation → evidence class → suspected/confirmed cause. Never conflate configured route label with bucket, mode with directory name, Chrome ACK with real rendered menu, or attempted save with verified R2 object.

# 2. BLOCKING REPAIR — Narrow ALWAYS shows the **real bucket parent**

**User-specified non-negotiable hierarchy**, for the two real QA buckets:

~~~text
Cloudflare
├── click2cloud-qa                       [REAL BUCKET PARENT]
│   ├── Save here                        [save at bucket root, prefix ""]
│   └── C2C-QA                           [configured/natural ancestor]
│       ├── Save here                    [prefix "C2C-QA/"]
│       └── Narrow
│           ├── Save here                [prefix "C2C-QA/Narrow/"]
│           ├── A                        [save "C2C-QA/Narrow/A/"]
│           ├── B                        [save "C2C-QA/Narrow/B/"]
│           └── C                        [save "C2C-QA/Narrow/C/"]
└── click2cloud-qa-2                     [SECOND REAL BUCKET PARENT]
    ├── Save here                        [this second bucket's root]
    └── C2C-QA                           [REAL PREFIX IS STILL "C2C-QA/"]
        ├── Save here
        └── Narrow
            ├── Save here
            ├── A                        [may display user custom title]
            ├── B
            └── C
~~~

**Acceptance rules:**
1. Under `Cloudflare`, every **configured, visible Narrow bucket** appears by its *actual* R2 `bucketName`, as its **own Chrome-native branch**. This remains true with one or multiple Narrow buckets; do not collapse the actual bucket root into Cloudflare because there is one branch or an uncustomized root. No fake `C2C-QA (2)` substitute for the bucket identity. If genuinely identical bucket names exist in different accounts/connections, disambiguate scope honestly without conflating their identities or leaking secrets; exact `provider+connectionId+accountId+bucketName` remains authoritative.
2. **Each navigable bucket/ancestor folder includes a sibling `Save here` item inside that submenu**, alongside its children—not outside the branch, not a leaf replacing children, and not a save silently redirected to the first/last child. Clicking bucket `Save here` targets exactly `prefix:''`; clicking `C2C-QA → Save here` targets `C2C-QA/`, etc. Leaves A/B/C retain direct save semantics. When a node has a specifically configured destination itself, avoid duplicate identical `Save here` actions and preserve its presentation provenance.
3. Narrow remains **curated**, unlike Depth: enumerate configured paths and only their necessary ancestors; do **not** discover and expose unrelated R2 directory trees or guess a bucket from “first child” or default. Every child must remain attached to its correct physical bucket irrespective of its label.
4. **Presentation is never permission.** These new ancestor/root `Save here` actions require actual exact-scope/current write authority and verified readiness. Do not broaden the user’s saved permission/approval simply because a child destination was configured. If current authorization contract does not permit ancestor writes, implement a minimally scoped explicit authorized route/capability contract or keep the action disabled with actionable truthful explanation; never bypass the canonical authorization gate. No new cloud resource provisioning as part of menu projection.
5. Preserve Narrow custom labels, hidden-level flags (`all`, `custom`, `hide-all`), per-row eye visibility, independent mode checkmarks, Quick/Default promotion, existing order and stable presentation IDs. **The bucket boundary is structural and mandatory**, even when a Narrow setting hides configured directory ancestors; Hide All must not hide or rename the real bucket. Keep deepest configured action available if permitted. Menu changes alone must **not mutate** persisted target prefix, physical key, saved record or metadata’s real location.
6. Independently configured presentations targeting the same actual prefix remain distinct, separately selectable/hideable, and preserve accurate selected-presentation provenance. Sharing bucket ancestors must not merge unrelated accounts or erase routes. Sibling labels, native item IDs and branch `parentId` must remain deterministic, stable and unique.
7. When Narrow is hidden or a destination is individually hidden, don't resurrect a route through the bucket's new `Save here` implementation. Define and test the exact visibility and authorization semantics of structural ancestor actions. The containing bucket branch may exist only for remaining visible, authorized/attention-eligible Narrow contributions; never show unrelated scopes.
8. Preserve Simple's quick direct leaves and Depth's discovered tree, including existing root `Save here` semantics; Narrow bucket ancestry must work in all eight combinations of Simple/Narrow/Depth visibility checkmarks. Honor Chrome native registration limits with truthful failures rather than silent flattening.

Tests must assert **native plan `parentId` relationships**, not merely printed strings. Update old tests intentionally expecting `Cloudflare → human → …` to require the explicit real bucket boundary and ancestor save actions. Prove each `Save here` resolves to the *exact* bucket/prefix with stable operation/provenance metadata; test multiple accounts, identical labels, custom names, zero/one/multiple children, hidden ancestors, root-target destinations, sibling collision, mode combos, restart/reconciliation and stale generation.

# 3. P0-UX PERFORMANCE — remote saving should be **very fast**

The product is a right-click utility: **the menu should feel immediate and the actual remote save should finish as quickly as safely possible**. Do not settle for making notifications appear faster while remote work remains slow.

1. Establish independent timestamps and distributions for: Chrome onClicked/gesture, cold/warm MV3 boot, menu route resolution, CURRENT read, auth refresh/revalidation, Worker readiness/capability, source acquisition (including redirects and bytes), queue/admission/dispatch, connection setup, Worker request, R2 put, independent readback/verification, History/receipt, recorder and final user feedback. Record clock-origin quality and unavailable stages as N/A, not fabricated zeroes.
2. Measure **warm and cold** repeated saves of small and larger images; vary source host, cache/connection state, selected mode, batch/repeated clicks and worker startup, with clear fixture vs installed Chrome/R2 distinctions. Report p50/p95/max and per-stage contribution. Reference recorded ≈9.56s median and ≈40.77s p95 only as prior baseline; collect a new comparable pre-change run.
3. Investigate especially multi-second **pre-dispatch waits** and unnecessary serialization, repeated auth or capability checks, expensive menu or storage work, recorder blocking, overlong timeouts/retries, redundant downloads/HEAD requests, lack of safe connection reuse, and cold-start behavior. Optimize the **measured** dominant path, not presumed network blame. Explore safe concurrency/pipelining/streaming and bounded reuse where the existing canonical architecture supports them.
4. **Aspirational UX budget:** native click acceptance/local acknowledgement feels immediate (aim sub-200ms warm when feasible), and small-image warm remote verification aims for low-single-digit seconds or better where network/source allow. These are ambitions, **not permission to fake verified completion**. Quantify achievable distributions across controlled conditions and state the external latency floor. Don't market arbitrary universal 1-second remote completion.
5. Preserve exact source bytes/filename, safe redirection/SSRF and public-network checks, auth boundaries, conflict/keep-both policy, idempotency, source URL/provenance safeguards, verified terminal receipts, independent remote readback and truthful uncertain outcomes. **Never trade correctness/security for a deceptively quick badge.** Incomplete/uncertain uploads must not be automatically replayed.

Provide a before/after benchmark table with sample sizes, conditions, p50/p95/max **for total click-to-verified and individual stages**, plus a narrative identifying confirmed root bottlenecks and exactly what changed.

# 4. P0 RELIABILITY — Depth works, but must stop lying about readiness

Reproduce and trace the owner-observed cycle: Depth sometimes reports `WORKER_SETUP_REQUIRED`, `NATIVE_APPLY_INCOMPLETE`, or another blocked/uncertain readiness state; later the same bucket/prefix can save successfully. The user's conclusion is not “Depth fails”—**Depth has been proven to work, but its readiness and failure experience is erratic**.

- Separate true absent Worker/setup approval, missing/expired provider token, insufficient scope, exact bucket/prefix capability, stale inventory, restored CURRENT/native generation, incomplete Chrome ACK, transient startup/cold boot, pending request and settled remote status. The message must identify the exact selected bucket/prefix and actionable cause; never borrow authority or readiness from another prefix/account.
- Establish whether error→success represents incorrect early readiness classification, eventual setup completion, a lost native ACK, stale generation, retry/refresh, or another documented mechanism. Trace timeline with safe operation IDs and state transitions. **Do not infer the root cause merely because retries happened to succeed.**
- No premature **terminal** failed toast while a legitimate bounded recovery is ongoing; no endless “working” spinner; no suppressed genuine failure; no false READY/VERIFIED. If provider state is genuinely blocked or user approval required, say so and wait for an explicit authorized action.
- Distinguish `NATIVE_APPLY_INCOMPLETE` menu-registration failure from remote-save failure. Verify actual Chrome native ACK, desired/applied generations and live menu, rather than assuming an ACK from persisted state.
- Investigate and stabilize the historically flaky `tests/depth-plan-recovery.test.mjs` case “absent Depth B plan is created for B, verified, persisted and reused; Narrow A and exact native destinations survive.” Owner's Windows output showed an isolated run reporting `AUTHORIZATION_LOST` and `uncertain` instead of `completed`, while other full runs passed 392/392. Repeat isolated/full under OFF/BASIC/EXPANSIVE diagnostics and trace the authorization/generation race. Do not just relax assertions or increase sleep time to conceal a real race.
- Strictly preserve one-use consent, grant provenance, durable setup ledgers, provider session separation, exact-scope authorization and the no-replay rule after uncertain writes. Never “repair” by resetting the profile, clearing configuration, creating surprise buckets/Workers, or unilaterally changing OAuth permissions.

For each observed failure produce **reproducer, root-cause evidence, fix or explicitly unresolved status, exact state transition, test and live-proof level**. Never label a formerly observed failure “fixed” solely because it didn't occur in one rerun.

# 5. Diagnostics — explain every slow or misleading save, without causing one

- Preserve two-tier recorder ownership: BASIC is bounded and continuously records delivered attempts; EXPANSIVE is explicitly controlled and provides richer forensic events. Neither may synchronously block save dispatch, menu construction, authentication or user feedback. Export RAW/SECURE correctly and truthfully.
- Ensure a safe attempt/operation ID ties `onClicked`, target at click time, source acquisition, Worker request, R2 receipt, verification, final UI/history and any blocked/uncertain stage across cold boots/restarts. Record **mode**, exact provider/account/bucket/prefix, *actual clicked menu path*, selected presentation ID, target key, event timestamps and readiness/generation, subject to the established RAW vs SECURE privacy rules.
- Distinguish BASIC attempt count vs EXPANSIVE event count vs number of attempts with detailed traces. Earlier exports marked partial or had detailed records covering far fewer than all attempts; diagnose whether capture window, recorder mode, restart/gap or genuine loss explains it. **COMPLETE means complete for the promised capture scope, not that every save magically has 24 events.**
- Measure source-fetch, pre-dispatch, upload, verify and feedback delay. Explicitly record omitted N/A data and evidence quality. Redact credentials, signed URL parameters, private headers and sensitive values; avoid writing arbitrary page content or token payloads into default BASIC logs.
- Test high-volume rapid clicking, recorder disabled, full quota, crashes and reload; diagnostics must fail closed/private and saving must not stall or be misreported.

# 6. Regression and proof matrix (required)

Baseline is **37/37 previously live-verified destinations**. A new source commit is NOT automatically another 37/37 installed-Chrome pass.

**A. Narrow menu and routing**
- Bucket 1 `click2cloud-qa`: A/B/C under actual `C2C-QA/Narrow/`; Bucket 2 `click2cloud-qa-2`: same physical prefixes, independently visible and never coalesced. Actual bucket names must be top-level children of Cloudflare for Narrow.
- Click/save at each bucket `Save here`, each intermediate ancestor `Save here` and each A/B/C leaf where authorized. Assert path bytes and R2 custom metadata. Distinguish forbidden root writes from successful authorized writes.
- Include hidden levels, Hide All, Show All, custom titles, two presentations to same target, two accounts with same bucket name, one Narrow route, mixed Simple/Narrow/Depth, Quick/Default, visibility eyes, offline/blocked state, Chrome reloading and native acknowledgement.

**B. Depth and readiness**
- Real five-level selected bucket and siblings; one/both scopes; maxDepth restrictions; immediate and delayed startup; credential refresh, missing Worker, stalled/lost ACK, stale generation, uncertain remote write. Recover safely and never cross-account.
- Repeat isolated Depth recovery cases and all diagnostic modes; count failures and capture reason.

**C. Simple and general**
- All six previously proven Simple-style routes; existing saved Default/Quick, direct one-click behavior and source provenance unaffected. No regression from new Narrow bucket branches. Preserve ordinary link/image/video/audio/page contexts wherever supported.

**D. Testing/evidence**
- Read `AGENTS.md`, `latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md`, and the existing CURRENT map at `11.2026/workings/right-click-workings.json` before edits.
- Add focused regression tests to `tests/phased-narrow.test.mjs`, `tests/golden-menu.test.mjs`, `tests/chrome-registrar.test.mjs`, `tests/depth-plan-recovery.test.mjs`, recorder/performance suites or the most accurate nearby suites. Don't leave old tests asserting intentionally wrong no-bucket hierarchy.
- Execute production build `npm run build:extension`, focused suite `npm run test:focused`, relevant isolated node tests, and full project tests `npm test` when feasible. Report exact pass/fail/skip and pre-existing vs introduced failures (including known intermittency).
- When available, test with **installed real Windows Chrome MV3** native contextMenus (parent IDs are not screenshots) and with explicitly approved live R2 operations. Retain user profile, extension ID and data. If unavailable, report `NOT VERIFIED` rather than claim live Chrome or R2 success. Use the original owner QA buckets only with permission; no destructive cleanup.
- Update source-local ownership docs and the **CURRENT** machine-readable rules map alongside implementation; preserve immutable historical workings and tag. A saved task request is not a code change.

# 7. Completion deliverable — a truthful before/after handoff

Return a compact executive summary beginning with **“IT WORKS — and here's what now works better.”** Then supply:
1. Baseline branch/SHA/tag, changed files and new commit SHA.
2. **BEFORE → intended → AFTER** Narrow menu tree with exact real bucket names, `Save here` levels, native `parentId` proof, click → target map and any legacy config migration details.
3. Timing table by mode/cold/warm/source size, with p50/p95/max and stage breakdown, plus bottleneck source locations. Explicitly say if performance remains inadequate.
4. Depth readiness timeline and root causes; previous errors `WORKER_SETUP_REQUIRED`, `NATIVE_APPLY_INCOMPLETE`, `AUTHORIZATION_LOST` each classified **FIXED with proof / STILL REPRODUCIBLE / UNEXPLAINED / NOT TESTED**.
5. Full executed test matrix and honest proof classes: **SOURCE IMPLEMENTED, FIXTURE PASS, NATIVE PLAN/ACK PASS, INSTALLED CHROME PASS, LIVE R2 PASS, BLOCKED, FAILED, NOT TESTED**.
6. Confirmation that existing accounts, buckets, user destinations, IDs, CURRENT, OAuth, configuration and installed Chrome profile were not destructively altered. Remaining gaps and next actions explicitly identified.

**Execution discipline:** Audit first, repair smallest canonical owners second, verify each repair third; keep Simple/Narrow/Depth independent, no parallel competing engines. Do not turn this into unrelated feature creation, queue/history redesign, or another new cloud provider.

**Final pass condition:** Narrow visibly presents `Cloudflare → actual R2 bucket → Save here + configured children`, and further ancestors also offer appropriately authorized `Save here`; routing remains exact; real save latency improves measurably; Depth stops producing false or unexplained early readiness failures to the degree evidence supports; 37/37 previously proven destination behaviors remain protected. **IT WORKS. NOW MAKE IT FLY.**
