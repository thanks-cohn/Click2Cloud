# CODEX INVESTIGATION & REPAIR BRIEF
## Click2Cloud: Custom Simple destinations fail — cross-repository REDOWN reference study

**Date:** 2026-11-16  
**Severity:** P1 / Critical core workflow  
**Primary repository (fix target):** `thanks-cohn/Click2Cloud`  
**Reference repository (read-only):** `thanks-cohn/REDOWN`  
**Existing tracking issue:** https://github.com/thanks-cohn/Click2Cloud/issues/16  
**Affected diagnostic build:** Click2Cloud `0.3.19`, commit `e188dc7f86b522207226bf30f8f6c25fec2a0a1e`

> **Codex mission:** Investigate both repositories. Find out what REDOWN did correctly (or differently) when mapping a newly chosen bucket/folder to an already prepared Cloudflare upload path. Learn from or selectively port its battle-tested invariants or narrowly scoped code into Click2Cloud **only where justified**. Fix Click2Cloud's custom Simple-destination save failures without copying REDOWN's older bugs, bypassing Click2Cloud API-first design, or damaging the functioning `redown` baseline.

---

## 1. What the owner actually reproduced

1. Sign in to Click2Cloud/Cloudflare.
2. Right-click an image and save to the original/default Cloudflare **`redown`** bucket. **Works**.
3. Create a **new Simple destination** and right-click to save there. **Does not work**.
4. Make that new destination the **Default**. Right-click save **still fails**.
5. Remove every other Simple choice so the newly created destination is **both the only menu choice and Default**. Right-click save **still fails**.

The owner expects a configured, authorized destination to work after its required readiness/setup is completed, irrespective of whether it is the original `redown`, a different bucket, the new Default, or the only Simple entry. The system must not send data to the wrong bucket or silently fall back to `redown`.

**Reproducible symptom:** repeated custom-destination failure after configuration changes. **Not yet a confirmed mechanism:** we have not shown precisely which bucket each logged attempt targeted. The defect is in the exact-destination readiness/selection/setup/dispatch chain until narrowed by instrumentation and tests.

## 2. What the supplied ZIP actually proves

Diagnostic archive: `Click2Cloud-RAW-fca3ee81-0b38-4170-a45e-0163006bcc6f.zip` (available from the owner's original ChatGPT conversation; **not stored in GitHub by this document**). Manifest snapshot: `fca3ee81-0b38-4170-a45e-0163006bcc6f`.

| Evidence | Observed |
|---|---|
| Committed attempts | 12 |
| Independently verified saves | 4 |
| Blocked saves | 8 |
| Blocked by `WORKER_SETUP_REQUIRED` | 7 |
| Blocked by `SOURCE_DENIED` | 1 (separate source issue) |
| All attempts' provider/mode | `cloudflare` / `simple` |
| Verified attempt sequences | 2, 3, 6, 8 |
| Worker-setup-blocked sequences | 4, 5, 7, 9, 10, 11, 12 |
| Detailed rich-event file | Empty (`full-events.jsonl`, 0 bytes) |
| Manifest | `COMPLETE` snapshot of the 12 committed BASIC rows; not evidence all attempted events were captured |

Sequence 3 through 12 used the same page/source hosts (`boards.4chan.org` / `i.4cdn.org`) and the same logged extension worker epoch; verified and setup-blocked outcomes interleave, including at menu generation 20. This disfavors a wholesale R2 outage or a source-site-wide problem and strongly suggests a target-dependent difference. The logs **do not identify each selected bucket, prefix or destination ID**; treat “all successes were redown” as owner-reported rather than proven by diagnostic linkage.

The `R2_HEAD_VERSION_SIZE` evidence on successful attempts supports independently verified saves. `COMPLETE` in the archive refers to locally committed diagnostic snapshot coverage, **not live Cloudflare certification**.

### Key diagnostic limitations to address

- No correlatable, privacy-safe per-click destination fingerprint or default-vs-explicit choice.
- No clear per-destination Worker plan lookup, approval, provisioning, scope or readiness transition in the BASIC rows.
- `full-events.jsonl` empty; don't infer steps happened simply because their downstream effect is visible.
- Distinguish inability to authorize the selected target from inability to provision it, a stale menu mapping, and an actual upload failure.

## 3. Code review starting points — Click2Cloud exact affected commit

Read the implementation, don't assume file paths or behavior remain unchanged on current `main`.

1. `src/cloudflare/deployment.mjs` — `createProvisioner`, `prepare`, `lookup`, `markVerified`. Worker plans are keyed by a digest of **account ID + bucket name**, with per-prefix scope and verified-target proofs. `markVerified` can throw `WORKER_SETUP_REQUIRED` when no ready plan exists.
2. `src/cloudflare/transport.mjs` — `createRemoteTransport`, `cap`, `status`, `save`, `probe`. `cap` rejects a missing, unready or mismatched account/bucket Worker plan with `WORKER_SETUP_REQUIRED`.
3. `src/cloudflare/onboarding.mjs` — initial setup and `recoverCloudflareDestination`. Recovery has separate **per-bucket approval**, provisioner/worker setup, and exact-target probe handling. Check whether GUI-created Simple destinations actually present/execute this path.
4. `src/api/service.mjs` — `commitConfigChange` persists config, refreshes native menu, produces `destinationReadiness`; inspect whether it **provisions** new destinations or simply reports nonready state. In the affected build the visible config-change branch computes readiness but does not directly call `recoverCloudflareDestination`.
5. `extension/background.mjs` — `remoteReady` (including its short-lived cache), `getAuthorization`, native click delivery, `engine.save`, and setup UI/attention route. Watch for exact-target readiness collapsing into a generic `SCOPE_UNAUTHORIZED` result.
6. `src/core/engine.mjs` — `resolveMenuAction`, the selected target, `onProviderAction` setup-only fallback, reauthorization, and remote-save dispatch.
7. `src/modes/simple/index.mjs`, `src/core/menu-compiler.mjs`, `src/core/menu-spec.mjs`, `src/core/menu-identity.mjs` — verify Simple destination identity survives config → menu → click without fallback.
8. `tests/cloudflare-destination-recovery.test.mjs` — existing recovery assertions. **Add true Simple configuration → native click → readiness → verified save integration tests**; a pure recovery unit test does not cover the user's sequence.

**Specific suspected seam:** a new Simple destination may become a valid menu entry before its exact bucket has a ready Worker plan, while initial login already prepared the original `redown` bucket. Changing Default affects selection, **not Cloudflare Worker provisioning**. This is a working hypothesis for Codex to prove or refute.

## 4. Required second-repository study: REDOWN (read-only)

Inspect `thanks-cohn/REDOWN` alongside Click2Cloud. **This is expressly authorized as a code-review/reference comparison. The requested repair target is Click2Cloud only; do not edit REDOWN without new explicit instruction.**

Start in REDOWN at:

- `extension/right-click-v3.js` — checks `prepared(d, profiles)` by matching Cloudflare profile ID, account, bucket, `workerUrl` and `token`. `validate` and `eligible` reject or suppress destinations without that prepared profile. `simpleTargets`, `simpleProjection`, and `resolve` handle custom destinations, activated buckets and menu selection. Compare this **readiness gating** against Click2Cloud's Simple projection.
- `extension/right-click-current.js` — scopes directory records with profile/account/Worker endpoint/bucket; tracks menu configuration and defaults.
- `extension/background.js` — Cloudflare Worker creation, R2 bindings, remote upload and verified receipt handling. Identify the actual provision/activate-before-save sequence rather than copying large embedded strings.
- `extension/cloudflare-api.js`, `extension/destination-config.js`, `extension/right-click-chooser.js`, `extension/right-click-legacy.js` — account/bucket selection, activation/repair, and user-facing readiness boundaries.
- REDOWN tests and historical tags/commits **only if relevant and actually present**, favoring the known functioning path rather than assuming the current branch is a validated gold standard.

### Key architectural difference to test, not prematurely assert

**Observed REDOWN code**: V3's `prepared()` requires a matching activated bucket profile containing Worker endpoint and token, and `eligible()` refuses to treat an unprepared destination as selectable. REDOWN's Simple menu also has special original-`redown` behavior; inspect this carefully, as it is *not* proof every custom-bucket path worked flawlessly.

**Observed Click2Cloud code**: provider readiness is mediated through a separate per-account/per-bucket transport plan and exact-target capability proof; Simple config changes can be committed independently of provisioning. This may be the missing connection. It does **not** establish REDOWN never experienced this class of bug: its older code and known regressions are not an unquestioned reference implementation.

### Ask Codex to produce a comparison table before patching

For every row below, provide REDOWN function/path, Click2Cloud function/path, observed behavior, evidence, and recommendation:

- Initial `redown` provisioning, including consent and binding.
- New bucket activation/preparation after login.
- New prefix/folder in an already prepared bucket.
- Menu entry creation, disabled/attention states, and changing Default.
- Click resolution and exact account/bucket/prefix identity.
- Worker reuse versus new Worker deployment and bucket binding.
- OAuth/account roles, permissions, explicit setup approval, and repair UX.
- Remote-only transfer, authoritative receipt verification, and duplicate-save prevention.
- Resuming a blocked click after reauthorization/repair.
- Background-worker restarts, stale menu generations, and saved state consistency.

## 5. Porting policy: learn first, transplant only selectively

Porting REDOWN logic is **allowed as a candidate engineering approach, not an unconditional instruction**. Prefer a narrowly scoped adaptation, a shared tested utility, or a state-transition invariant over wholesale copying.

**Good ideas to evaluate**:

- REDOWN's pre-execution invariant: **a menu choice is not save-ready solely because it is configured or Default**; it must resolve to a prepared, currently authorized exact bucket/profile.
- Explicit activation and verified Worker/bucket binding before a menu row is marked ready.
- Deterministic identity `(provider, account, bucket, prefix)` through config, native menu, click and receipt.
- User-facing setup/repair action for an unready destination, preserving the exact pending target and operation.
- Evidence-driven remote-only verification and robust feedback (success only after independent provider confirmation).

**Do not transplant**:

- REDOWN's legacy all-in-one background architecture, direct GUI/provider calls, secret-bearing profile persistence, or legacy debug surface without review.
- Any behavior that silently substitutes the `redown` bucket for a nonready requested destination.
- Unapproved Worker creation, billable R2 activation or repeated probe writes.
- Local download as a substitute for Click2Cloud TRUE REMOTE saves.
- REDOWN's known problematic behavior (login loops, uncertain history, false success, Narrow bucket-root avoidance) or brittle special cases.

**Required decision:** After comparison, Codex must explicitly choose one: (A) fix Click2Cloud native owner using REDOWN invariants only, (B) port one or more small REDOWN functions with tests/adapters, or (C) extract a shared reusable module under strict API compatibility. Include why this is safer than alternatives, how it preserves Click2Cloud's API-first contract, and what it deliberately leaves behind.

## 6. Reproduction and regression matrix

Use fixtures and a controlled local test harness first. Include a real Chrome test plan that the owner can perform, without asserting that mocked tests prove actual remote R2 operation.

| Case | Required result |
|---|---|
| A. Existing `redown` default and menu item | Still saves with independent receipt verification. |
| B. New Simple destination pointing to **different R2 bucket** | If not ready, clearly requests exact-bucket setup/approval; once prepared, saves to precisely that bucket. |
| C. New Simple destination pointing to **different folder/prefix of prepared `redown` bucket** | Reuses appropriate existing bucket Worker when permitted, with correct prefix-scope/capability check; save verified at exact path. |
| D. Set B or C as Default | Default resolution points to B/C; readiness isn't falsely inherited from original `redown`. |
| E. Remove other Simple choices; leave B/C only | Right-click still routes to B/C, never implicit `redown`. |
| F. Switch Default back and forth | No stale readiness cache, target mismatch or incorrect bucket. |
| G. Denied/missing setup consent | No Worker creation or write; actionable message, retained target, no success count. |
| H. Missing OAuth scope/role or rejected Worker deployment | Correct distinct error and repair action; no unsafe fallback. |
| I. Pending uncertain probe, restart, later resume | Inspect previous operation; no duplicate writes; preserve original exact target. |
| J. Stale native menu generation/click | Fail closed with explicit remediation, never upload elsewhere. |
| K. Same-bucket Narrow/Depth and other providers | Regression checks; no effects from Simple fix. |
| L. Network/source failure during ready destination | Preserve accurate error category and verified-only completion. |

Also simulate configuration changes in quick succession and the click occurring while a new destination is still being activated. Cover both `WORKER_SETUP_REQUIRED` and `SCOPE_UNAUTHORIZED`/disabled-menu outcomes as appropriate.

## 7. Implementation constraints and owner safety rules

1. **API first, always:** every GUI action (create destination, setup/repair, Default, connection, readiness, save) must map to an API action; do not build a privileged one-off GUI-only bypass.
2. Preserve durable configuration, existing receipts, history, buckets, workers, OAuth grants, and the user's installed Chrome extension.
3. **No false green success, no counter increment until authoritative verification, no fallback upload to `redown`.** Independent remote readback must confirm account/bucket/prefix/object/size/version as supported by the provider receipt contract.
4. Use the existing per-bucket setup ledger and explicit user authorization rules. Reuse a compatible ready Worker only when binding and prefix security checks establish it is safe.
5. If a save click requires setup, do not fire an unapproved background mutation; provide a precise action and, if safe, preserve the pending intent for user-driven resume. Do not store sensitive page/source URLs in Cloudflare or share them as destination metadata.
6. Improve **privacy-safe** diagnostic correlation (opaque ID and stage classification) without recording credentials, tokens or unredacted source URLs.
7. No bulk refactor, no migration of the whole REDOWN architecture, no change to other providers unless tests demonstrate a necessary shared correction.
8. Preserve known-good tags, working branches, and the working Click2Cloud `redown` baseline. **Do not create a second phase/porting branch, merge, or release automatically.** First produce an investigation/decision report; then do a narrowly scoped fix on an isolated branch only when work proceeds under the owner's phase/validation policy. The owner must validate the first phase before expanding to any separate cross-repo extraction phase.

## 8. Requested Codex deliverables

**Phase 1 — Investigate and document (must precede copying or porting):**

- Reproduce the symptom and obtain evidence mapping outcomes to exact, privacy-safe destination identity.
- Review both repositories; include concrete function paths and behavioral differences.
- Identify the root cause (or list remaining unknowns with discriminating test steps); separate the symptom from the mechanism.
- Present the **port-vs-adapt-vs-native-fix decision** with minimal blast radius.
- Provide a test plan and precise changes to propose. **No speculative broad code port.**

**Phase 2 — Minimal repair after phase-1 decision and owner approval/validation checkpoint:**

- Implement only the approved minimal changes in Click2Cloud; port limited REDOWN code only if justified.
- Add test matrix coverage and validate no regressions, no unauthorized writes, and correct exact-target receipts.
- Supply before/after run evidence, test commands/results, changed files, and rollback instructions.
- Preserve `redown` functioning. Do not merge or tag release-ready until the owner tests it in Chrome.

**Minimum acceptance criterion:** Existing `redown` still works; a newly configured Simple destination in another bucket is correctly setup/authorized and saves remotely there; same-bucket folder destinations work; Default and only-choice states resolve correctly; failures show actionable setup/repair; success counts only on verified destination receipt.

## 9. Codex copy/paste kickoff

> Investigate Click2Cloud issue #16 using **both** `thanks-cohn/Click2Cloud` (repair target) and `thanks-cohn/REDOWN` (**read-only reference**). Read the full document `Click2Cloud-Codex-CrossRepo-Investigation-2026-11-16.md` and the linked issue before changing code. The original `redown` save works while newly created Simple destinations fail, even after Default/only-choice selection. The affected build's archive has 12 attempts (4 verified, 7 `WORKER_SETUP_REQUIRED`, 1 `SOURCE_DENIED`), but lacks a reliable per-attempt target ID, so do not assert an unproven root cause. Compare REDOWN's prepared-profile gating and Worker/activation path with Click2Cloud's per-bucket provisioning, Simple config, native menu and recovery API. **Phase 1: investigate, reproduce and propose a minimal port/adapt/native-fix decision; do not modify REDOWN or create a second porting branch.** Preserve the functioning `redown` baseline and all exact-target safety guarantees. Only proceed to a narrow Click2Cloud repair under the owner's explicit phase/validation checkpoint; do not merge or release without Chrome testing.

---

**Reference links**  
Click2Cloud issue: https://github.com/thanks-cohn/Click2Cloud/issues/16  
Click2Cloud repo: https://github.com/thanks-cohn/Click2Cloud  
REDOWN repo: https://github.com/thanks-cohn/REDOWN  
Affected Click2Cloud commit: https://github.com/thanks-cohn/Click2Cloud/commit/e188dc7f86b522207226bf30f8f6c25fec2a0a1e