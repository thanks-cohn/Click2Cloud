# NEXT CODEX IMPLEMENTATION REQUEST — November 21, 2026
# P0 RIGHT-CLICK ALWAYS + LONGEVITY, DURABILITY AND ROBUSTNESS

> **THE GOAL IS FOR THE RIGHT-CLICK MENU TO ALWAYS BE ACCESSIBLE.**
>
> **LONG-TERM PRODUCT GOAL:** It should be the best in its class: robust, durable and able to last in the world indefinitely with minimal modifications. Aim for zero known silent data loss, zero false-success outcomes and as few customer-visible defects as evidence and platform limits permit.
>
> Implement real improvements to the existing Click2Cloud source. This is **NOT** merely another analysis, document or speculative rewrite. **The right-click issue is P0 and the first release gate**. Worker durability is a deliberately scoped, subsequent gate. Do not trade known-good remote-save behavior for a massive redesign.

## 0. Read-first controlling documents, correct repository and baseline

**Repository:** \`thanks-cohn/Click2Cloud\`.

**Working source:** branch \`codex/minimal-baseline-palette-fonts-quiet-screenshots-2026-11-20\`, manifest version **0.3.22**.

**Preserved known-broken baseline:** annotated tag \`redown-0.3.22-BROKEN-pre-repair-2026-11-21\`, source commit \`91aad92e11ccd3ad28bbc4c40ca1ec3be614ec32\`. **Never delete, rewrite, retarget or replace this tag.** The documentation commits after it do not mean the code was repaired.

**Required read order, all in the current Click2Cloud branch:**

1. [\`/next_codex_request-11.21.2026.md\`](../next_codex_request-11.21.2026.md) — **controlling P0 right-click audit, ten principles and R01–R22 acceptance scenarios**.
2. [\`/longetivity-and-robustness.md\`](../longetivity-and-robustness.md) — **founding longevity charter**, browser/remote/storage boundaries, restartable execution, compatibility, customer-scale fault testing and staged release policy.
3. [\`/AGENTS.md\`](../AGENTS.md) — current project ownership/authorization/precedence; the newest controlling owner rule prevails over historical contradictory sections.
4. [\`/latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md\`](../latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md) — exact typed API ownership, native mode projection, Simple/Narrow/Depth/Quick/Default and source↔API documentation.
5. [\`/11.2026/workings/right-click-workings.json\`](../11.2026/workings/right-click-workings.json) — actual, versioned configuration/behavior map.
6. [\`/Issues_and_Bugs/README.md\`](../Issues_and_Bugs/README.md) — existing issue ownership and evidence.
7. [REDOWN background native menu](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/extension/background.js#L2487-L2660), [worker-activation reconciliation](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/extension/background.js#L2836-L2848), [BOOT repair findings](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/docs/boot/IMPLEMENTATION.md) and [BOOT tests](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/tests/boot.test.mjs) — **read-only reference, not a codebase to transplant**.

**Branch/process:** Record current Git SHA and status, then work on a **new P0 repair branch based on the current 0.3.22 working head**, not on 0.3.21, not on the immutable known-broken tag, and not on REDOWN or \`main\`. Make focused commits and provide their hashes. Preserve all existing files and owner data. If branch creation is unavailable, do not change production/main; report the limitation.

**Evidence boundary:** No one has yet proved the precise cause of the owner's installed-Chrome missing-menu incident. Confirmed source hazards are below. ReDown's relevant fixture results do not certify either product in the owner's Windows Chrome. This request and the two charters are **not implementation evidence**.

---

## 1. P0 scope: eliminate the disappearing native right-click menu

### Observed symptom and controlling outcome

The owner reports the native **Chrome** extension right-click action disappears, especially immediately after login. This is not the in-Shelf Explorer's context menu, not a merely failed save, and not yet proven to be a Chrome-wide issue.

**The acceptance rule:** on a supported Chrome page, image or link, when the extension and provider visibility are enabled, the extension's native provider entry remains present **before login, after first login/reconnect, on worker wake, after restart, after a failed child registration, and while Cloudflare is offline**. The user must not need to reopen the Shelf, refresh the page, reset storage, reauthenticate merely to restore a menu, reload the extension or restart Chrome.

Restricted Chrome pages, disabled extension, failed worker registration/evaluation and Chrome API denial are documented platform limitations—not pretend-success cases. A visible unready provider entry may open its proper login/attention/Manage path; it **must not fake a completed remote save**.

### Source-level defects to reproduce before modifying code

- \`src/chrome/registrar.mjs\`: the existing \`apply\` path explicitly clears acknowledged state and runs \`await native('removeAll', [])\` before parent-first creation. A failed child, ambiguous callback or interrupted rebuild can erase the old working menu. **Confirmed source hazard, installed incident hypothesis.**
- \`extension/background.mjs\`: \`nativeReady()\` reconciles but is wired to \`runtime.onInstalled\`/\`onStartup\`; no unconditional nativeReady on ordinary successful module-worker activation is visible in the inspected source. The handlers silently swallow failures. A click handler cannot heal a **completely missing** native entry by requiring the user first to click that missing entry.
- \`extension/background.mjs\` OAuth \`onConnected\`: clears snapshots and emits \`connection-changed\`, but does not directly request native reconciliation.
- \`src/api/service.mjs\` \`loginBegin\`: after successful OAuth, initialization that is blocked/incomplete **without saved destinations** can bypass the \`applyCurrent\` reconciliation branch. OAuth success is already separate from setup failure and must stay separate.
- \`extension/manifest.json\` version 0.3.22 includes \`contextMenus\` permission, so avoid inventing a missing-permission diagnosis. Confirm real Chrome worker errors and loaded extension path.
- \`readCurrent()\` has an established-state protection: desired prior native generation cannot silently become freshly empty CURRENT generation zero. Preserve this fence even if menu registration is degraded.

**Investigation must identify first missing transition:** worker evaluated → listener registered → minimum native provider action → canonical CURRENT loaded → desired plan compiled → Chrome API requested → callback acknowledged → user independently sees OS native entry → click routes to canonical action. Failure can be at any stage; do not equate Chrome ACK with rendered UI.

### Required P0 implementation

**P0.1 — Independent minimal entrypoint.** Install/maintain the smallest *existing-approved* provider/attention action as early as Chrome permits. Cloudflare must be a single clickable native entry even with zero saved targets or before first login, subject to the user's visibility setting. Keep each other enabled provider's approved behavior. Do not add an unnecessary REDOWN root, duplicate Cloudflare heading, imaginary folder or additional menu owner. No network, R2, setup, Worker deployment, Shelf, screenshot, theme or directory scan as a prerequisite for basic native access.

**P0.2 — Incremental, non-destructive Chrome registrar.** Within the existing one-and-only \`createChromeRegistrar\`, replace routine \`removeAll\` with a stable-ID, parent-first plan/diff: update appropriate existing rows; create missing rows; selectively delete obsolete rows only when justified by desired configuration or Chrome's ordering constraints. Preserve the existing entry/recovery action through partial failures. Handle update/move/order restrictions explicitly and with the narrowest subtree replacement. A lost \`create\` callback is **uncertain**—do not assume nothing was created. Missing in-memory/durable registration-ID cache is **unknown**, not permission to reset the whole menu. No duplicate entries; no stale unauthorized save.

**P0.3 — Lifecycle and login recovery.** Reconcile at install, browser startup, **every actual MV3 worker activation**, successful first login, reconnect/reconsent, provider ON/OFF and validated destination/Default/Quick/Simple/Narrow/Depth edits. **Do not rely on onStartup as worker-wake notification.** Use the same serialized registrar/API path and coalesce repeated same-generation requests to avoid storms. Login success must not be cancelled by menu/setup failure; a failed setup must not erase available native provider actions. No background keepalive loop.

**P0.4 — Preserve customer truth and correct clicks.** CURRENT/IndexedDB/browser settings are the authority; never overwrite established state with empty synthesized defaults. Preserve accounts, saved and intentionally hidden targets, account permissions, user-selected Default/Quick, exact bucket/prefix, all Simple/Narrow/Depth hierarchy and previous verified receipts. A retained old/native row is *display recovery*, never authorization: clicking revalidates current identity, generation, account, target, permissions and source. Block clearly on stale/deleted/unauthorized target instead of rerouting to a random or default bucket.

**P0.5 — Bounded diagnostics and explicit emergency repair.** Reuse existing \`nativeRegistration\`, CURRENT, \`chrome.storage.local\`, IndexedDB and existing recorder. Add small bounded state/attempt/epoch/ACK/error codes and the login→reconcile trace. Errors must not disappear through empty catches without a record. Keep RAW vs SECURE export guarantees; do not log secrets or original source URLs in secure reports. A targeted manual native-repair control can be available as a last resort but must not be required for normal use. A healthy no-op should not churn native menu entries.

### P0 proof gates before any durability feature is attempted

Implement the R01–R22 matrix in the controlling P0 document as relevant, especially:

- **Cold first install:** no saved destinations and no login, native enabled Cloudflare action visible on actual eligible page/image/link and click reaches accurate login/attention; no unintended bucket creation.
- **First successful login:** immediate native entry without refresh/reopening Shelf, both when setup completes and when setup fails with no saved target.
- **Existing customer reconnect:** same saved menu structure and exact target IDs through logout/reconnect/reconsent.
- **20+ worker activations in the harness:** native rows survive, no ordinary \`removeAll\`, no duplicate event listeners and no destructive config writes.
- **Native failure injection:** lost callback, create timeout, failed parent/child, unknown ID cache, concurrent startup/login/Apply, interrupted generation and missing CURRENT; previous safe entry remains available.
- **Mode and destination regression:** Simple one-leaf vs multiple, Narrow ancestor visibility, Depth real folders only, Quick/Default, provider visibility OFF/ON, different accounts/buckets, correct action on click.
- **Actual installed Windows Chrome:** observe the native rendered entry, exact menu gesture and authorized disposable R2 save/readback where permitted, comparing the unchanged bad tag with the repaired build.
- **Separate truth:** unit fixtures, mocks, Chrome API ACK, visually rendered native menu, Worker response, R2 verified object and History receipt are different evidence classes. Mark each **PASS / FAIL / BLOCKED / NOT TESTED**.

**P0 release gate:** Do not call the native-menu defect FIXED until real installed Chrome acceptance passes in the affected use case. If the environment blocks unpacked Chrome or live provider verification, finish safe, testable source repairs and mark real acceptance **BLOCKED/OPEN**. Never claim success based on a screenshot fixture or ACK.

---

## 2. P1 follow-on: make the remote Worker as durable as its receipts

**This is a second, explicitly separated workstream.** Start implementation only after the P0 native source patch and focused regressions have been completed and isolated. If the available Codex run is insufficient, leave a precise design, scoped follow-up task and reproducible test fixtures rather than performing an unreviewed Worker overhaul in the same patch.

### What Click2Cloud already does well (preserve it)

- \`src/cloudflare/worker.mjs\` uses Durable Object \`RemoteClaims\` with transactional operation ID claims, signed per-operation authorization, account/bucket/prefix binding, lease bookkeeping, pending status and independent R2 verification/reconciliation of ambiguous results.
- \`src/cloudflare/transport.mjs\` uses scoped capabilities, plan identity, status polling, lease renewal, exact target and final verification. \`src/cloudflare/writer-registry.mjs\` validates a single intended provider writer.
- \`src/cloudflare/deployment.mjs\` checks explicit setup approval, account authority, existing Worker bindings, code digest and pending deployment state; it prevents silent unauthorized replacement.
- \`src/cloudflare/resources.mjs\` declares bounded memory/concurrent admission, although actual customer headroom and failure behavior need measurement.
- Actual customer file content remains remote-first; no local Downloads-directory staging, disk spool or new local browser database should be introduced merely to harden job bookkeeping.

### P1 risk: durable claim ≠ durable unattended executor

The current \`RemoteClaims.fetch\` admits a job durably and uses \`this.state.waitUntil(task)\` to run it; accepted transfers may return \`202 REMOTE_ACCEPTED\` with \`/operation\` polling. **This does not prove a long-running job resumes automatically if the Cloudflare execution itself stops.** There is no demonstrated alarm/restart scheduler in the inspected save path. Durable record and a replay-safe result query are not the same as a guaranteed restarted network fetch/stream/multipart upload.

**P1.1 — Prove the failure boundary before choosing infrastructure.** Add deterministic interruptions between claim, source fetch, first remote bytes, multipart part, final R2 write, provider ACK and receipt persistence. Check actual current Durable Object lifecycle/Cloudflare runtime limits and customer plan caps. Distinguish "R2 object already exists and can be independently verified" from "job definitely needs a replay." Measure costs, limits and source accessibility.

**P1.2 — Design the smallest genuine execution recovery path.** Evaluate Durable Object alarms **versus** Cloudflare Queues **versus** Workflows; choose only one primary coordinator justified by platform guarantees, cost, rate/concurrency and supported job duration. A remotely inaccessible source, expired URL or browser-authenticated resource may be **non-resumable** after Chrome closes. Never promise unrestricted unattended transfer. Prevent two active writers for the same operation; maintain durable intent, attempt/lease/fencing identity, persisted checkpoint, bounded retry schedule, explicit terminal expiry and read-only reconciliation before retry.

**P1.3 — Idempotency and exactly the intended remote effect.** Stable operation ID and immutable target/source fingerprint; conditional R2 write/ETag/version protections as supported; account/bucket/prefix must match every stage. If a response is lost after a successful remote write, first read R2 and verify key, bytes, checksum/metadata as supported. No automatic second write of an uncertain mutation without proof. Distinguish verified, blocked, failed, pending and uncertain.

**P1.4 — Safety and source types.** Split independent publicly/authorized remotely fetchable sources from browser-only, tab-only, short-lived signed-URL or native-device sources. On revocation, check capability at every allowed boundary and stop safely. Do not embed browser cookies/credentials in a Worker, widen Cloudflare permissions, make a bucket public or create new billable infrastructure without explicit approval.

**P1.5 — Version compatibility.** Existing healthy customer Workers must not need redeployment merely because the extension was updated. Design stable protocol version/capability negotiation, tested compatible version window, migration and explicit blocked upgrade path for genuinely incompatible security changes. Use account/bucket-scoped plans, code digests, staged deployment, explicit setup authority, bounded health/write-readback checks and rollback to the last verified compatible plan when safe. Never silently replace a healthy Worker or change extension ID/OAuth identity.

**P1.6 — Outcome:** A supported source can continue/recover after Chrome closes only when durable execution was actually committed and the source remains accessible. Others receive a truthful \`needs-browser\`, \`blocked\` or \`uncertain\` result. **No invented remote completion.** If scheduler changes would expand customer cost or require new infrastructure, supply a separately scoped proposal/evidence and obtain explicit approval before deploying it.

---

## 3. P2 product longevity and low-maintenance quality gates

These rules apply immediately to implementation choices, but do **not** justify a sweeping rewrite.

1. **Small stable core:** isolate right-click/menu/dispatch from Explorer, Shelf, theme, Screenshot, Search, Get URL, History UI, Auto-Reroute and experimental features. Fail optional subsystems separately.
2. **One writer per domain:** canonical CURRENT for configuration; one compiler/registrar for native entries; one remote operation ledger; R2 as truth for actual file bytes.
3. **Crash-consistent state:** deliberate order \`record intent → execute authorized effect → verify actual result → record receipt\`; crashes anywhere lead to safe reconciliation, not guessing.
4. **Backward compatibility:** version config/API/Worker/receipts, test old extension vs new Worker and vice versa, and preserve data through migrations and rollbacks.
5. **Bounded resources:** browser wakeups, memory, cloud CPU, Durable Object transactions, concurrency, retries, object-size limits, API cost and local metadata must be bounded and measured. No always-on loop just to feel reliable.
6. **Observability, not dependency:** sanitized correlation IDs and exact stage results. Diagnostics failure or quota exhaustion must not block saving. Existing capless forensic logging remains a deliberate explicit user option; default traces remain bounded.
7. **Security:** signed target- and session-bound capabilities; provider-role checks; no credential disclosure or public bucket exposure as an error workaround.
8. **No false promises:** no literal 100% availability claim for restricted Chrome contexts or cloud outages. Report what is guaranteed, conditional, uncertain and unverified.
9. **Low maintenance:** pin dependency/build versions, validate the MV3 import graph, keep simple module boundaries, maintain readable source↔API docs and release rollback plans, avoid unnecessary third services.
10. **Change isolation:** new provider or optional feature cannot break existing Cloudflare menu or save engine; Depth errors cannot interfere with Simple/Narrow; Shelf layout changes never mutate native registration.

**Targets are proposed SLOs, not current facts:** ≥99.99% eligible native-menu appearance, ≥99.9% properly accounted-for authorized save attempts, zero known false verified outcomes, zero known silent wrong-target writes or data loss, and inspectable status for every admitted remote operation. Define denominators, exclusions and observation windows before reporting results. No synthetic-test marketing claims.

---

## 4. Execution sequence and files to change

### Milestone A — P0 diagnostic reproduction and menu repair (must implement now)

1. Read source and preserve the pinned known-bad tag. Reproduce failure in a targeted test based on actual 0.3.22 registrar and a simulated Chrome API that loses a callback/fails after removeAll.
2. Modify the canonical \`src/chrome/registrar.mjs\` to avoid routine full resets and preserve basic menu access on partial failure, while respecting exact existing menu projector and API behavior.
3. Modify \`extension/background.mjs\` and, if required, \`src/api/service.mjs\` to make worker-load and post-login/reconnect reconciliation reliable, idempotent and independent of R2 readiness.
4. Add focused tests with clean failure receipts, including initial no-configuration, blocked setup after successful OAuth and multi-mode/target routing nonregressions.
5. Build/validate the MV3 package; test in installed Chrome when permitted; keep failure categories honest.
6. Update \`latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md\`, and \`11.2026/workings/right-click-workings.json\` if expressed logic changes. Keep the original tagged historical baseline immutable.

**Gate A:** No proven destructive loss of native menu in tested supported failure cases, first-login menu always returns when Chrome permits, exact right-click routing and config preserved. Real installed-Chrome evidence required for "fixed."

### Milestone B — Remote executor audit and bounded proof (follow immediately after A, but keep commits separate)

1. Trace \`src/cloudflare/worker.mjs\`, \`src/cloudflare/transport.mjs\`, \`src/cloudflare/deployment.mjs\`, \`right2cloud-module/src/*\` and Durable Object claim/recovery boundaries.
2. Produce failure-injection fixtures for worker interruption, remote write ACK loss, job duplicate admission, 30-second lease transitions, revoked authorization and browser shutdown.
3. If the smallest safe recovery mechanism is confirmed and does not require new unauthorized infrastructure/permissions, implement a **separately reviewed** minimal scheduler with one coordinator, checkpoints and idempotent restart; otherwise deliver an exact design proposal and leave live infrastructure unchanged.
4. Measure before/after operation status and performance; test actual Cloudflare when owner-approved credentials/test bucket are available.

**Gate B:** Proven safe interruption/restart behavior for supported sources, not merely \`waitUntil\` or saved claims. Never report an indefinite running task if it is really orphaned.

### Milestone C — Upgrade, operations and release hardening (separate follow-up if necessary)

1. Test older customer Workers, build digest mismatch, safe explicit upgrade and recovery from partially completed provisioning.
2. Test 1000+ operations and realistic multiclient/network failures, with bounded resource/memory/cost reporting.
3. Add concise support receipts, rollback paths and release compatibility matrix.
4. Do not destabilize approved P0 right-click fixes while pursuing broader resilience.

**Gate C:** Real customer-scale evidence; source fixtures and cloud mocks are reported separately.

---

## 5. Non-negotiable preservation / out-of-scope firewall

- No whole-project rewrite, no replacement API, no competing native-menu dispatcher or Worker, no second configuration source of truth.
- No \`git reset --hard\` or cleaning/deleting established user data, no clearing Chrome profile/extensions, no rewriting the known-broken tag, no unauthorized change of \`main\`.
- No changed extension manifest key/ID, OAuth redirect, Cloudflare permissions or account binding merely to address a menu symptom.
- No new buckets, Worker deployments, billable infrastructure, public domain attachment, remote deletion or token rotation without existing explicit approval and exact authorization.
- No blind local file download→upload staging, no new browser disk cache, no large extra IndexedDB database. Small durable metadata is appropriate; actual file bytes stay true remote.
- No bogus auto-default, root bucket recreation, multiple Cloudflare headings, fabricated folders or unintended changes to Simple/Narrow/Depth/Default/Quick.
- No deletion or mangling of History, Search, Screenshots, Shelf, Get URL, lightbox, Bit o' Polish themes, or work already underway on separate 0.3.22 Auto-Reroute; nonregression tests only unless separately authorized.
- No claiming a mock test, simulated Worker, saved \`nativeRegistration\` ACK, screenshot fixture, \`202 Accepted\`, or Worker response means visible menu or verified R2 save.
- If Chrome forbids unpacked installation or the environment has no authorized test account, document **BLOCKED** and provide exact owner-run real-Chrome test steps. Do not bypass policies or invent test evidence.
- When encountering older contradictory directions, use controlling newer owner instructions; isolate and document unresolved contradictions rather than silently changing user-visible behavior.

---

## 6. Required test campaigns and report format

### Phase A core release gates (all must be accounted for)

- First install (zero saved config) before login; first login success with and without cloud setup; reconnect; OAuth expired/revoked; Cloudflare offline.
- Chrome worker load/install/start/suspend/wake; original Windows profile; multiple tabs/windows; page, image and link supported contexts.
- Lost \`contextMenus.create\` callback, create/update/remove rejection, interrupted generation, missing native-ID cache with surviving entries, repeated concurrent events, malformed CURRENT.
- Right-click modes Simple/Narrow/Depth, one/multiple actual buckets, default/quick destinations, provider visibility settings, wrong-account protection.
- Precise click outcome: authorized save gives exact R2 object/readback; unauthorized/unready click produces attention/blocked, not a false success.
- Repeated no-op wake (at least 20 simulated activations): no full menu reset, duplicate handlers, runaway I/O or profile mutation.

### Phase B cloud durability gates (only if explicitly in implementation scope)

- Crash/interruption at every job state transition, browser close immediately after durable admission, restart/duplicate attempt, lost remote ACK after successful R2 write, expired source URL, long-running multipart operation and Worker code version change.
- Resource exhaustion, honest busy/429, bounded exponential backoff where appropriate, no duplicate unintended write, cancellation and revocation, expired grant.
- Real Cloudflare remote test only with approved disposable R2 resources; record object truth independently.

### Report artifacts

Maintain a human-readable and machine-readable before/after table with **scenario, baseline commit, patch commit, test method, environment, actual outcome, expected outcome, proof class, PASS/FAIL/BLOCKED/NOT TESTED, and remaining risk**. Explicitly distinguish:

1. **Source inspected**.
2. **Unit/fault fixture passed**.
3. **Chrome API acknowledged**.
4. **Installed Windows Chrome visibly rendered and clicked**.
5. **Cloudflare Worker accepted remotely**.
6. **Actual R2 object verified by independent readback**.
7. **History/receipt truthfully recorded**.

**No release or \`FIXED-verified\` tag until items 4 and 6 are independently observed for the critical paths, if actual provider write is part of the claimed fix.** Do not move the pre-repair known-bad tag.

---

## 7. Required end-of-run delivery to the owner

Provide **bullet-by-bullet**:

- Work branch, precise starting SHA, new commit hashes, changed files and clean/dirty working-tree state.
- Which of the known 0.3.22 failure mechanisms was actually reproduced, and which remain hypotheses.
- Implementation summary of non-destructive native registration and why it does not remove healthy entries.
- Concrete post-login, reconnect, no-destination and worker-load behavior proved.
- Exact Simple/Narrow/Depth/Quick/Default and other-provider nonregressions.
- Native registration test count, before/after failures, production-vs-fixture evidence and any new failing tests.
- Real Windows Chrome menu outcomes and original-profile acceptance status **or** explicit blocker.
- R2 remote verification status, signed auth/operation ID fidelity and no-wrong-target evidence.
- Worker-durability audit result: completed safe code, deferred scheduler, or still-open interruption risks—**not a claim of unattended support without restart proof**.
- Data preservation and security checks; no new local file caching or unauthorized infrastructure changes.
- Unresolved issues, risk ranked P0/P1/P2 and exact next smallest safe milestone.
- Confirmation that \`redown-0.3.22-BROKEN-pre-repair-2026-11-21\` is still intact.

## Final acceptance contract

> **The native right-click action is available whenever Chrome legitimately permits it, including before login and immediately after login/reconnect. Failed setup or a worker restart cannot silently erase a working action. An actual click either starts the exact authorized remote save and produces an independently verified receipt, or tells the user truthfully why the operation is blocked or uncertain. Saved configuration is never destroyed to make the menu return. Remote jobs resume unattended only when a real durable scheduler and accessible source make that guarantee true.**

**Execute Milestone A first. Do not call the product robust merely because this request exists. Prove each boundary, preserve the customer's state and keep the long-lived system simple enough to maintain for years.**
