# it should be the best in its class, this system, robust, durable, and be able to last in the wold indeifnately with minimal modifications

> **Owner's founding goal — November 21, 2026.** Build a system that remains dependable through ordinary customer usage, unpredictable browser behavior, cloud outages, interrupted transfers, years of software evolution, and increasingly demanding workloads. It should be best in its class, exceptionally robust and durable, and maintainable with minimal intervention. Design for an exceptionally long useful life, not a brief demonstration of features.
>
> **Engineering interpretation:** The target is *extremely low customer-visible failure, zero known silent data corruption or false-success paths at release, predictable recovery, and stable behavior under change*. Literal zero lifetime bugs or indefinite operation cannot be guaranteed by software running on third-party browsers, networks and cloud services. Instead, prove reliability continuously, avoid hidden failures, and make failures safe, diagnosable, reversible, and uncommon.

**Status:** Long-term architectural charter and execution plan; **not** evidence that repairs have already been implemented, that any release meets these targets, or that any Chrome/Cloudflare operation has been independently verified. Maintain this document as the product grows.

**Current project:** Click2Cloud / REDOWN, source version **0.3.22**, branch **codex/minimal-baseline-palette-fonts-quiet-screenshots-2026-11-20**. Known-broken immutable source baseline: [redown-0.3.22-BROKEN-pre-repair-2026-11-21](https://github.com/thanks-cohn/Click2Cloud/tree/redown-0.3.22-BROKEN-pre-repair-2026-11-21) = **91aad92e11ccd3ad28bbc4c40ca1ec3be614ec32**. The companion immediate P0 engineering request is [next_codex_request-11.21.2026.md](next_codex_request-11.21.2026.md).

---

## NEW OWNER OVERRIDE — permanent fast-path and History invariants (November 21, 2026)

**A. Native right-click must remain accessible:** On eligible Chrome pages with enabled extension/provider, right-click is ALWAYS the lightweight independent entrypoint—even under screenshot bursts, many uploads, a stuck remote Worker, or History rendering. Never repeatedly clear the menu or tie it to a global upload/diagnostics/History lock.

**B. No crashes from fast successive actions:** Ordinary right-clicks and screenshot shortcuts, even if rapidly repeated, must not trigger runaway RAM/CPU, 2 GB extension-driven spikes, unbounded active jobs/PNG bytes, event listeners, lost handlers, stuck Shelf or worker crashes. Keep quick gesture admission and bounded expensive concurrency; under true platform/browser quota, respond with an honest retryable busy/rate-limit result. No arbitrary slowdown and no unlimited in-memory queue. **Durability mechanisms that materially degrade click speed, screenshot speed, responsiveness or memory are unacceptable without measured justification and explicit owner approval.**

**C. Automatic History updates:** Right-click saves and *logged-in* screenshot jobs automatically appear/update in the open History page after durable recording, with pending and final status reflecting the same operation. History is complete since the first entry, with no arbitrary cap, but updates must be batched/targeted rather than reloading all History or decoding every image after each event.

**D. Logged-out screenshot shortcuts must produce NO History:** Check authorization before screenshot capture and any persistent pending/failure checkpoint. A shortcut pressed while logged out should give only transient login feedback—not a History entry, retry-cache PNG or upload. Repeated logged-out shortcuts leave History unchanged. If an authenticated screenshot was accepted and authentication later expires, its real accepted operation stays in History with its truthful failure/uncertain outcome.

**E. No speculative heavyweight job platform:** Durable Objects, alarm scheduling, Workflows, Queues and frequent checkpointing are NOT mandated. Prioritize correctness and fast stability; first reproduce a real interruption and measure whether existing operation identity/readback resolves it. Propose the lightest optional recoverability enhancement *only when evidence establishes a gap*. Avoid new databases/remote services, per-byte checkpoints and extra hot-path cloud calls without explicit owner approval.

**These are P0 behavioral requirements, ahead of optional long-running remote execution work.** Companion implementation request: [next-codex/NEXT_CODEX_REQUEST_2026-11-21_P0_RIGHT_CLICK_ALWAYS_AND_LONGEVITY.md](next-codex/NEXT_CODEX_REQUEST_2026-11-21_P0_RIGHT_CLICK_ALWAYS_AND_LONGEVITY.md), including B01–B09 tests.

---

## I. Product promise: durability before feature count

The user should experience a quiet, dependable, right-click-first product. Clicking an eligible native menu item should **always expose the intended extension action** in Chrome-supported contexts when the extension is installed, enabled, working and its visibility setting is on. The user should not need to restart Chrome, reload the extension, open the Shelf or repeat login to resurrect native menus.

A transfer must have exactly one meaningful disposition: **verified saved to its exact authorized target**, **provably not begun/blocked**, or **explicitly uncertain or recoverable** with an operation ID. The application must never convert an unverified attempt into success or retry an ambiguous remote write blindly.

Reliability means all of the following **simultaneously**:

1. **Available entrypoint:** native Chrome menu and independent Shelf access remain usable wherever Chrome permits, without waiting for remote resources.
2. **Correct target:** authorized account, bucket, directory/prefix, item identity, presentation mode and Quick/Default selection are never silently substituted.
3. **Real completion:** source acquisition, authorized remote write, independent provider readback, receipt and History agree.
4. **Durable intent:** validated user configuration persists through normal extension/Chrome restarts and updates; a cache miss is not a data-loss event.
5. **Recoverable interruption:** when execution can genuinely resume, it does so safely; when it cannot, it says why.
6. **Fault isolation:** one broken screen, provider, profile, operation, screenshot, diagnostic or Depth discovery does not disable other independent operations.
7. **Low resource cost:** bounded memory, disk metadata, CPU, API calls, cloud billing and visible UI latency; no accidental always-on worker.
8. **Secure by default:** least authority, exact per-destination credentials/capabilities, no unauthorized public access, no secrets in reports, no unapproved resource creation.
9. **Understandable operation:** users get actionable errors and trustworthy receipts rather than opaque generic failures.
10. **Long-lived compatibility:** a future Chrome version, worker deployment or feature addition should rarely require rewriting stable working components.

**Immediate blocking defect:** In the tagged 0.3.22 baseline, the native menu may disappear after login. The P0 requirement is to restore it using **non-destructive reconciliation**. Do not defer this to a theoretical future cloud platform.

## II. Keep the three independent systems distinct

### A. Chrome MV3 service worker — availability and dispatch

Owns event listeners, canonical native-menu reconciliation, current configuration reads, OAuth event handling, native click dispatch, bounded diagnostics and handoff to the remote engine. It is **ephemeral**: suspension is normal, not necessarily a crash. Never expect in-memory variables or timers to persist forever. Synchronous event listener registration and safe load/evaluation are essential.

**Non-negotiable:** The native menu is pre-registered with Chrome; rendering the user's next right-click should not depend on an online API, a Shelf render, folder inventory, Worker provisioning or a long database scan. Save permission and exact target are checked at click time. Any optional module failing should not remove the essential entrypoint where a safe architectural separation is possible.

### B. Cloudflare Worker / Durable Object — execution and remote truth

Owns authenticated remote source acquisition, exact scoped destination, bounded transfer execution, durable operation identity, verified object metadata, result reconciliation and intentionally controlled recovery. It may continue after the browser is gone **only within the guarantees of the chosen execution platform and only if the source remains remotely accessible and authorized**.

**Important:** A Durable Object transaction, a stored claim, an asynchronous waitUntil task, a Lease or a pending response do not by themselves constitute guaranteed restartable background execution. Recovery needs a **real rescheduling mechanism** and a valid resume procedure.

### C. CurrentStore / IndexedDB / chrome.storage — durable customer intent

Owns user selections, destination/Default/Quick/Simple/Narrow/Depth state, setup permissions, safe migration checkpoints, desired/applied menu generations and small diagnostics. Use **existing** storage rather than new redundant configuration databases. Never equate missing, corrupt, unreadable or incompatible established state with genuine zero configuration.

**No extra local file staging is required to make the right-click menu reliable.** This system is TRUE REMOTE: the download does not have to enter the user's Downloads directory before being uploaded. Small browser-stored metadata and credentials are still necessary. No local browser storage can guarantee recovery after a user/browser explicitly erases extension storage; provide secure, explicit export/restore options for that different threat.

## III. Source-grounded comparison: what the existing projects already teach us

This section is a **source audit**, not an installed-customer benchmark.

### REDOWN — valuable robustness patterns

Sources inspected at [REDOWN main c78babc](https://github.com/thanks-cohn/REDOWN/tree/c78babc314acc5891203e95b169f027756e956c1):

- [extension/background.js menu lane](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/extension/background.js#L2487-L2660): establishes a local REDOWN root and Manage entry before a complex rebuild; updates surviving Chrome entries, creates missing ones, and selectively removes obsolete descendants; serializes/coalesces changes rather than clearing the whole tree.
- [worker-load startup path](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/extension/background.js#L2836-L2848): reconciles at each successful worker activation in addition to installation and browser startup.
- [guarded classic-worker bootstrap](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/extension/service-worker.js): preserves the pre-existing toolbar entry when its larger classic background import fails. This is a **design lesson**, not code to copy verbatim into Click2Cloud's ESM worker.
- [boot implementation report](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/docs/boot/IMPLEMENTATION.md): previously, normal registration called removeAll even after restoring a minimal menu; a dropped create acknowledgement or missing ID cache could cause destructive reset. The source-level fix removed ordinary full resets in the reproduced harness and retained Manage/root. Tests covered 20 worker activations. Its *actual installed owner incident* remains unproven and installed-Chrome acceptance remained blocked in its report.
- [embedded bucket Worker provisioning](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/extension/background.js#L1160-L1315): per-bucket Worker, pre-existing credential reuse, reachability/health check, real R2 write/readback, bounded deployment retry. This is useful for setup correctness and understandable repair.
- [ordinary REDOWN Cloudflare remote-save flow](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/extension/background.js#L2070-L2155): Worker HTTP request followed by remote verification; uncertain outcomes are distinguished. The inspected path is **not a demonstrated durable, restartable execution queue**.
- The separate [REDOWN worker/src/index.js](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/worker/src/index.js) provides a simpler asset-ingest Worker; do **not** mistake this standalone source for all per-bucket inline Worker scripts deployed by REDOWN's extension.

**Best transferable lesson:** Preserve customer access even when rebuilding, setup, auth, inventory, diagnostics or remote execution fail. **Do not copy** the whole product, its legacy menus, its classic-worker wrapper or its broader feature surface.

### Click2Cloud 0.3.22 — stronger remote-operation groundwork, serious availability gaps

Sources pinned to the actual [0.3.22 known-broken commit](https://github.com/thanks-cohn/Click2Cloud/tree/91aad92e11ccd3ad28bbc4c40ca1ec3be614ec32):

- [src/chrome/registrar.mjs](https://github.com/thanks-cohn/Click2Cloud/blob/91aad92e11ccd3ad28bbc4c40ca1ec3be614ec32/src/chrome/registrar.mjs#L112-L191): **ordinary apply calls chrome.contextMenus.removeAll() and recreates the entire native tree**. If a create fails, times out or the worker stops midway, a previously healthy menu is at risk. **Confirmed source-level failure hazard; not independently established as the owner's exact incident.**
- [extension/background.mjs](https://github.com/thanks-cohn/Click2Cloud/blob/91aad92e11ccd3ad28bbc4c40ca1ec3be614ec32/extension/background.mjs#L402-L414): has nativeReady, but the inspected source calls it from install/browser-start rather than unconditionally on each worker activation; certain rejection paths suppress their errors. The OAuth onConnected handler does not directly reconcile.
- [src/api/service.mjs](https://github.com/thanks-cohn/Click2Cloud/blob/91aad92e11ccd3ad28bbc4c40ca1ec3be614ec32/src/api/service.mjs#L365-L394): after successful login, incomplete initialization with **no saved destinations** can bypass the native-registration branch. This is a **reproduction hypothesis**, not a confirmed installed-Chrome root cause.
- [src/cloudflare/worker.mjs](https://github.com/thanks-cohn/Click2Cloud/blob/91aad92e11ccd3ad28bbc4c40ca1ec3be614ec32/src/cloudflare/worker.mjs): Durable Object **RemoteClaims** uses transactional operation claims keyed by identity, signed scope checks, authorization/session checks, pending/operation responses, lease support and verification of R2 results.
- [src/cloudflare/transport.mjs](https://github.com/thanks-cohn/Click2Cloud/blob/91aad92e11ccd3ad28bbc4c40ca1ec3be614ec32/src/cloudflare/transport.mjs): typed signed capabilities, exact destination/plan/session verification, read-only status polling, lease refresh, operation ID and independent verification.
- [src/cloudflare/deployment.mjs](https://github.com/thanks-cohn/Click2Cloud/blob/91aad92e11ccd3ad28bbc4c40ca1ec3be614ec32/src/cloudflare/deployment.mjs): explicit authorization for provisioning, account/bucket binding checks, version/code digest checks, pending-plan handling and protection against unapproved Worker replacement. These prevent dangerous mismatches, but can create a **customer-visible blocked state** without a well-designed compatibility/repair path.
- [src/cloudflare/resources.mjs](https://github.com/thanks-cohn/Click2Cloud/blob/91aad92e11ccd3ad28bbc4c40ca1ec3be614ec32/src/cloudflare/resources.mjs): a declared per-job memory budget and capacity bound rather than unbounded in-memory parallelism. These are source constants, **not measured production headroom**.
- **Critical limitation:** In the inspected remote-save path, accepted work is started with **this.state.waitUntil(task)** and a persisted claim; no automatic Durable Object alarm-based restart handler was identified in the inspected Worker. The result can be queried/reconciled, but this is **not proof every interrupted job restarts and eventually completes.** Do not promise post-browser-close completion until interruption/restart has been demonstrated.
- Older Cloudflare development receipts document fixture, build and module success while installed Chrome or live Cloudflare tests were blocked. No current customer-scale MTBF, exact right-click availability or no-loss metric was established by this audit.

**Architectural conclusion:** Keep Click2Cloud's **canonical V3+1.1 API + signed and verifiable remote execution protocol** as the foundation. Integrate the *proven source-level principles* of REDOWN's non-destructive entrypoint recovery. Then finish truly resumable remote execution, simplify operational failure states and test against actual customer environments.

## IV. Twelve longevity principles — permanent engineering rules

### 1. Small stable core; optional subsystems fail separately

Make the minimal **right-click → exact intent → dispatch/receipt** path the most thoroughly tested code. The Shelf, Explorer, gallery, search, themes, screenshot features, Get URL, Bulk operations, History rendering, diagnostics and future Auto-Reroute may rely on the core but **must not be able to prevent it loading** merely because an optional dependency fails. Keep imports and dependencies auditable; optional modules must not introduce cascading startup failure.

### 2. One source of truth, one writer per state domain

CURRENT is authoritative for saved configuration. The menu compiler is authoritative for desired native entries. The registrar is the **only** writer of Chrome native-menu registration. The remote operation ledger is authoritative for remote job identity; R2 itself is authoritative for actual object existence/content. A receipt reflects the observed boundary, not another competing source of truth. Avoid a second menu engine, conflicting UI-only logic or competing cloud writers.

### 3. Correctness before optimization

No silent fallback to another bucket, an old account, a fabricated prefix, an assumed Default or a permissive public URL. A user deliberately removing a destination must not have it silently recreated by cache recovery. No duplicate Cloudflare rows or imaginary Depth folders. Failed verification must not become a success card.

### 4. Prefer update, then create, then justified removal

For Chrome menus and remote configuration, non-destructive reconciliation is the default. Prepare a correct new plan before mutation. Reconcile stable IDs by parent-first update/create, and selectively remove only obsolete entities. On missing native cache, do not infer Chrome has deleted all entries. Preserve viable provider/attention/Manage access through every supported failure.

### 5. Design for crashes between any two statements

Assume interruption before/after every durable write, callback, provider action, acknowledgement, network response and status update. Persist **intent before side effect**, and **verified evidence after side effect**. On restart, read durable state and reconcile; do not infer an operation failed just because its initiating browser vanished. Retain an explicit **unknown/uncertain** state when evidence is insufficient.

### 6. Idempotency at every meaningful external boundary

Each remote operation needs a durable unique ID and canonical immutable account/bucket/key/source fingerprint, a strategy against duplicate overwrites, and a bounded replay policy. **At-least-once execution plus idempotent effect** is more realistic than promising exactly-once distributed execution. Use conditional creation/ETag/version checks as supported, validate source stability, and never retry a possibly committed destructive operation without read-only reconciliation first.

### 7. Authentication is not readiness, and readiness is not completion

Cloudflare OAuth CONNECTED does not imply Worker deployed, R2 write permission, native menu installed or object saved. A Worker responding to a health probe is not proof a specific customer's bucket and prefix can be written to. Every stage has a separate truthful state and receipt. In particular, native menu visibility must remain independent of remote readiness.

### 8. Bounded resources and pressure-aware admission

Enforce size, concurrency, CPU, memory, streaming, per-account rate and outstanding-work limits. Introduce fair admission so one customer's large transfer cannot starve smaller unrelated work. On quota saturation return **retryable with a reason**, not an endless spinner or a partial success. Never assume Cloudflare isolates, Durable Objects and browser workers have unlimited life, CPU or storage.

### 9. Security is an availability prerequisite

Signed grants should bind principal, account, bucket, prefix, operation, purpose and expiration; workers must validate actual binding identity and revoked credentials. Strict URL and redirect validation reduces SSRF risk. Private-by-default R2; custom domain/public exposure only with explicit user authorization. No stale authorization caching that turns an old valid menu into an unauthorized upload. Logs and support bundles never leak credentials.

### 10. Backward compatibility must be intentional and finite

Version the typed API, remote protocol, Worker capabilities, configuration schema, receipts and migration records. Provide tested **expand → deploy compatible reader → migrate → contract** workflows. Support an explicit minimum compatible Worker release rather than forcing every healthy customer to redeploy immediately on every extension update; **do not weaken security or bypass genuine incompatible changes**. Keep same extension ID and OAuth redirect when updating. Preserve old data read paths until migrations are verified.

### 11. Every repair is observable and reversible

A repair never means "clear all local data and start over." Identify the failing boundary and perform only its allowed mutation. Have read-only inspection, explicit bounded retry, safe rollback to the previously verified Worker/code plan when feasible, and preserved configuration. Record before/after generation, attempt ID, stage and reason code. New deployments should support a controlled rollout and rollback without stranding customers.

### 12. Long-term simplicity is part of robustness

Remove obsolete compatibility adapters only after telemetry/tests prove safe removal; eliminate duplicate state, repeated retries and unnecessary wakeups. Don't add an extra cloud server or database to heal a problem that can be solved inside the existing canonical registrar. Enforce a small stable abstraction boundary so a provider, browser change or UI redesign requires localized modifications rather than rewrites.

## V. Priority design: right-click must ALWAYS be accessible

Implement the detailed P0 request in [next_codex_request-11.21.2026.md](next_codex_request-11.21.2026.md) before broader background durability work:

1. Register a minimal enabled provider-specific action (including Cloudflare before first login) without waiting for cloud setup, network or folder discovery.
2. Preserve correct native semantics: Click2Cloud's own provider menu, user visibility OFF, Simple/Narrow/Depth/Quick/Default and no extra REDOWN submenu. REDOWN's root/Manage pattern is an availability principle, not permission to replace Click2Cloud's menu contract.
3. Replace routine full-tree **removeAll** with stable-ID incremental registration, targeted removal and safe ordering.
4. Reconcile on **every worker load**, install/start, successful login/reconnect, and committed destination/visibility change using the same serialized native writer.
5. Diagnose partial/missing Chrome ACK without lying about rendered rows; Chrome ACK is not OS-level visibility proof.
6. Preserve CURRENT and last-known valid entries if one provider/child fails; stale entries fail closed on click after revalidating exact CURRENT authorization.
7. If Chrome completely prohibits registration, give honest independent Shelf/toolbar attention where supported. No extension can show Chrome-owned native entries on restricted pages, when disabled or when its worker cannot evaluate.

**P0 success criterion:** On real Windows Chrome, enabled native items appear before login and immediately after login/reconnect without reopening the Shelf, and remain usable after worker suspension/restart, while settings and exact remote destinations survive.

## VI. Priority design: restartable remote operations

**Performance/complexity veto:** This section is a **conditional future design**, not authorization to build a heavy scheduler or repeated checkpoints. Current right-click and screenshot throughput, peak/settled RAM and crash resistance are more important than speculative unattended execution. Do not implement a new queue, Workflows service, alarm coordinator or per-byte journal merely because the architecture could support it. Demonstrate a customer-relevant recovery gap, measure baseline, choose the smallest safe change, and obtain explicit owner approval for new infrastructure or significant runtime overhead. The existing fast remote-save behavior must remain fast. Screenshots in particular should never be blocked by ordinary remote-job orchestration or generate hidden History rows while logged out.

### A. Separate admission, execution, verification and delivery

Suggested canonical state machine:

~~~text
CREATED → AUTHORIZED → DURABLY_ADMITTED → RUNNING
                                     ├→ VERIFIED → RECEIPT_RECORDED
                                     ├→ NEEDS_RECOVERY → RECONCILING → RUNNING
                                     ├→ BLOCKED / EXPIRED / CANCELLED
                                     └→ UNCERTAIN (explicit, never fake SUCCESS)
~~~

All transitions must validate operation identity, generation/lease and current authorization. The state machine should be small, explicit, inspectable and versioned.

### B. A durable claim is necessary, but a scheduler is also necessary

The current **RemoteClaims** Durable Object remembers intent, can check some completed writes and exposes status, but **waitUntil alone is not an indefinitely durable executor**. Investigate a true durable restart mechanism appropriate for long jobs: Durable Object alarms, Cloudflare Workflows or Queues. Choose based on real platform guarantees, costs, source re-fetch semantics, state size and limits; do not create a second active executor accidentally.

For **each** candidate mechanism, prove:

- Browser closes immediately after admission; command remains recoverable.
- Cloudflare invocation is interrupted during source fetch, multipart write or receipt persistence; a new scheduled attempt resumes only if safe and authorized.
- Two invocations simultaneously claim the same operation; **at most one intended remote effect** occurs, with read-only reconciliation of ambiguous outcomes.
- Source URL expires or changes content; never save the wrong bytes and call it the original.
- Authorization expires or is revoked; recoverable operation pauses/blocks rather than continuing beyond its permitted authority.
- Worker code updates mid-flight; versioned job records remain readable and migration is deliberate.
- R2 write succeeds but response is lost; read back exact key/size/hash/metadata before deciding whether to retry.
- Large transfer exceeds any single execution window; retry from a verified checkpoint where platform and source support it, otherwise provide a truthful bounded failure.

**No automatic replay of a vanished source.** Authenticated browser-only files, expiring signed URLs, cookies, pages requiring an active tab or local disk files may not be fetchable by a remote worker after Chrome exits. Classify operations as **independent remote source**, **browser-dependent** or **native-desktop-dependent** and display a truthful persistence guarantee for each. A future native desktop helper is an optional recovery tier, not a hidden prerequisite for basic right-click saves.

### C. Source, object and final receipt must correspond exactly

For every operation, fix canonical identity:

- Account/provider/Worker binding and exact bucket/prefix/key.
- Source URL fingerprint and source metadata where available.
- Requested filename/content type and expected transfer policy.
- Immutable operation ID, authenticated session, scope and execution code/protocol version.
- Expected bytes/hash where determinable, conditional write semantics and final independent provider proof.
- History and receipt ID linked to this exact operation, never a related success.

For streaming/multipart, keep metadata small and incremental; no unbounded full payload in Durable Object memory. Track parts/checkpoints with verified object state and avoid storing customer content in logs.

## VII. Cloudflare deployment and compatibility that survive years

**Current risk:** Customer-specific Worker provisioning can be blocked by Cloudflare account permissions, new-Worker creation restrictions, unresolved subdomains, R2 bindings, stale code digests, unavailable endpoints or a partially completed setup. A secure blocked state is better than provisioning the wrong resource, but it must not become a permanent dead end.

**Required design:**

- Separate **identity of the resource** from **version of code** and **current readiness**. Maintain a stable per-account/bucket plan and explicit safe migration history.
- Prefer **reuse of a healthy existing Worker**; don't redeploy on login, Shelf opening or each extension update.
- Before deployment, compare actual account permissions and existing script/bindings. Respect the required user consent and Cloudflare's authorization model. Do not request unauthorized billing or expand resource scope silently.
- Distinguish create vs update grants and explain the precise required permission. No generic "try logging in again" when the real cause is an absent Workers Admin role.
- A Worker version mismatch must produce a meaningful **compatible/upgrade-required/blocked** state. When a compatible protocol is already safe, permit use without needless recompilation. On incompatible security changes, stop safely and provide an explicit upgrade path.
- Use a **prepare → validate bindings → upload → enable → health check → bounded write/readback → mark-ready** sequence, recording durable checkpoints. If a late step fails, retain the prior verified setup and reconcile rather than creating a random second Worker.
- Stage migrations and rollouts; new extension and old Worker coexist only within a tested compatibility window.
- Treat deployed Worker code provenance, module hashes and dependency closure as verifiable artifacts; resist accidental deployment of mismatched code.
- Require read-only status checks to have minimal permissions and costs. Do not turn every user opening Remotes into a remote setup run.
- Document Cloudflare service limits and costs at actual deployment plan level; do not infer them from source constants or local fixtures.

## VIII. Browser resilience without a large local footprint

- Register essential MV3 event listeners early. Review ESM import graph and optional modules for cold-start errors; do not transplant REDOWN's classic importScripts entrypoint into a module worker.
- Keep the smallest entrypoint and native registration owner independently testable from Explorer, screenshot, public URL and theme code.
- Ensure cold boot, OAuth callback, all modes and native menu receive no accidental dependency on Shelf rendering.
- Keep only bounded configuration, operation metadata, native receipt generations, and optional diagnostics in existing browser stores. No uncontrolled JSON/event duplication, no actual file bytes staged through Downloads.
- Preserve the user's explicitly opt-in unlimited/capless forensic recorder semantics separately from the default bounded runtime diagnostics. If export/storage quota is exhausted, disclose it and degrade diagnostics rather than disabling saving. RAW and SECURE redaction must remain distinct.
- A new Chrome profile or intentional deletion of browser data is different from a worker crash. Offer explicit encrypted export/import/restore or a future authorized backup strategy without pretending a local IndexedDB backup survives profile erasure.

## IX. Zero-known-bug release policy and measurable reliability

**Zero reported bugs** is an aspiration, not a defensible promise. Replace it with **no known release-blocking defects, no known silent corruption, no false verified success, complete failure accountability, and independently measured customer-visible rates**. Expose limitations explicitly.

Proposed **targets**, not current performance:

| Measurement | Aspirational target | How to count honestly |
| --- | --- | --- |
| Native menu availability | 99.99% or better on supported Chrome contexts | Independently observed eligible right-click occasions with enabled extension and provider visibility ON; exclude explicitly restricted pages and disabled installs, do **not** exclude valid errors simply to improve the denominator |
| Authorized remote-save outcome | 99.9% or better verified or clearly reconciled within a declared service window | Count each distinct accepted customer operation once; split verified, blocked, failed, uncertain and recovery-in-progress |
| False verified success | 0 known in accepted releases | Independent R2 readback required, with exact bucket/key/size and stronger hashes where available |
| Undisclosed or lost operation | 0 known in accepted releases | Every durable admission has a recoverable ID and inspectable terminal/uncertain state; retention windows documented |
| Unintended overwrite or cross-bucket save | 0 known in accepted releases | Conditional writes, operation fingerprints and account/bucket/prefix assertions |
| Native registration-destructive resets | 0 during ordinary supported update/recovery | Instrument exact Chrome menu removeAll usage and deliberate exceptional controls separately |
| Regression against baseline | 0 newly introduced critical failures | Compare against immutable 0.3.22 bad tag, retained fixtures and exact source before/after |

Keep **separate** measures for: installed Windows Chrome behavior, synthetic browser fixtures, isolated Worker tests, actual Cloudflare R2 writes, cross-version migrations, offline/restart recovery, and field reports. Do not combine fixture success with production reliability metrics.

**Sample-size discipline:** Do not report five-nines reliability from a few clean tests. For rare failures, enough independent trials and real diverse profiles are needed to estimate rates credibly. A long stress test is useful but does not substitute for representativeness, fault injection or real user devices.

## X. Mandatory fault-injection campaign

Build a reproducible **failure matrix**, automated wherever possible, while running essential end-to-end gates in installed Chrome and an authorized disposable R2 environment.

| Class | Failure injected or observed | Release expectation |
| --- | --- | --- |
| Chrome | Initial install, upgrade, worker cold boot, suspension/wake, reload, Chrome restart | Right-click available on eligible contexts; exact saved state preserved |
| Native | Create/update/remove callback fails, callback never arrives, ID cache missing, interrupted parent/child apply | Known-good menu not erased; repair state truthful, stable IDs, no duplicate action |
| Auth | First login, reconnect, reconsent, token expiry, revoked account, missing scope | Native provider action remains visible; unsafe save blocked; config retained |
| Storage | Stale/current generation, missing CURRENT record, IndexedDB version conflict, quota failure | No fabricated empty profile, cross-mode loss or destructive overwrite |
| Setup | Bucket absent, Worker denied, partial deployment, incompatible digest, reused existing Worker | No unintended creation; safe resume or actionable blocked state |
| Execution | Browser closes after admission; Worker exits during download, multipart write or result persistence | Durable or honestly uncertain operation; safe resume only when supported |
| Duplication | Double-click, duplicate requests, replayed message, simultaneous lease renewal | One canonical operation outcome; no duplicate unintended write |
| Network | DNS/source timeout, redirects, HTTP 429/5xx, network offline, Worker unavailable | Bounded retry/backoff; fail safely; user can inspect outcome |
| Integrity | R2 write completes but HTTP response disappears; wrong bucket, wrong prefix, wrong checksum | Independent exact-target readback; never claim verified wrong result |
| Capacity | Long file, 1000+ right-click saves, concurrent users, memory/quota pressure | Admission limits, fairness, no runaway CPU/holding of browser |
| Schema | Old extension with new Worker and vice versa; data migration interrupted | Explicit compatible or blocked state; prior data still readable |
| UI | Shelf fails; Search/screenshot optional module errors; theme resize | Essential right-click, login and basic Settings independent |
| Logging | Recorder disabled, secure export, capless opt-in enabled, quota/full disk | No secret leakage; no saving blocked by diagnostics; honest incomplete export |
| Security | Revocation during operation, forged Worker capability, wrong connection or source | Fail closed for remote effects; safe native attention remains |
| Privacy | Public domain absent, private bucket, source provenance in customer receipt | No silent sharing; redaction and user control |

**Stress practice:** Exercise rapid-fire right-clicks (100/500/1,000), screenshot shortcuts (10/50/100 with Chrome capture quota), mixed save/screenshot bursts, History open/closed, and 1,000+ repeated saves. Test that unauthenticated screenshot shortcuts create exactly **zero History records**, while accepted logged-in saves/screenshots update History without manual refresh. Verify no 2 GB extension-driven memory spike, growing listener count, native menu disappearance, unbounded PNG Blob retention, full-history reload on every burst or worker crash. Measure per-process peak/settled RAM, latency, task count, History refresh cost and actual provider verification; platform limits return truthful errors. Use the prior 900–1000-save experience as a floor for repeated automated exercises, then increase concurrency, failures and test diversity. For every run, report exact attempts, independent provider receipts, false successes, wrong-target cases, unexpected duplicates, unresolved states, memory/resources, browser/version and elapsed time. Do not claim a 1000/1000 pass if receipts are merely simulation acknowledgements.

## XI. Observability without becoming a second source of failure

Each operation should be traceable across **browser gesture → native item ID → CURRENT generation → auth/intent → Cloudflare Worker claim → R2 write → readback → receipt/History** with a stable correlation ID and bounded stage events.

Minimum events to distinguish include:

- Worker evaluation/start and critical import failure; listener registered; native root/provider requested and ACK classification.
- Native desired versus applied generation, partial errors, timed out callbacks, worker epoch and actual installed UI observation where available.
- OAuth CONNECTED, scope/identity observed, menu reconcile scheduled/completed/blocked and separation from resource setup.
- Remote operation created/authorized/admitted; source fetch; bytes progressed/checkpoint; Worker invocation interruption; recovery scheduled; read-only R2 proof; final terminal/uncertain state.
- Explicit distinction among **request accepted**, **Chrome acknowledged**, **Worker accepted**, **R2 object verified**, **History recorded** and **user-facing completion**.

**Report privacy:** Default secure diagnostics avoid access tokens, raw source URLs, object contents and secret bindings. RAW versus SECURE exports remain explicit and distinct. Bounded default traces should never hold an upload hostage. Where the user enables capless forensic logging, respect its opt-in storage warning and handle quota exhaustion transparently.

**Customer support contract:** A single sanitized report should establish where and why the operation stopped, whether retry is safe, and whether customer intervention is genuinely needed. Never ask the user to clear all Chrome storage as a routine fix.

## XII. Long-horizon maintenance and operational discipline

### Dependability without endless rewrites

- **Architectural decision records:** For every material protocol, storage, recovery or security change, record the reason, alternatives, irreversible decisions, old compatibility contract and rollback path.
- **Core invariants as tests:** Keep explicit invariants for right-click visibility, one registrar, exact authorized destination, durable configuration, no false success and no silent resource mutation. Review each release against them.
- **Dependency governance:** Pin runtime dependencies, reproduce builds, check bundled MV3 imports, keep licenses clear, audit vulnerability advisories and migrate carefully.
- **Feature isolation:** New providers adapt to the stable typed API, not custom one-off menu handlers. New UI themes and gallery code never modify the save engine.
- **Release trains:** Canary → limited rollout → monitored cohort → stable, with build hashes and rollback plan. Do not auto-erase customers' data when reverting code.
- **Backup and migration rehearsals:** Verify migrations forward and, where supported, safe rollback; make exports usable independently from the UI that created them.
- **Provider downtime policy:** Define degraded operations by capability; read-only or cached views may remain, write operations must never be guessed.
- **Cost governance:** Measure per-1000 operations Worker invocations, Durable Object storage, R2 requests, metadata writes, retries and troubleshooting overhead. Prefer small bounded mechanisms that materially improve durability.
- **Customer incident follow-up:** Distinguish customer reports from confirmed source causes. Fix the minimal cause, add a regression fixture and perform independent Chrome/provider acceptance. Keep a chronology of all customer-visible incidents and tests.

### Proposed release stages

**Gate 0 — Freeze evidence:** Keep the broken 0.3.22 tag, capture customer Chrome diagnosis and exact source/build identity. No deletion/reset/cleanup that loses the reproduction.

**Gate 1 — P0 right-click availability:** Implement the companion native-menu repair; prove first login, no destinations, worker wake and partial registration without losing the entry.

**Gate 2 — Transfer correctness:** Assert exact account/bucket/prefix, conditional/idempotent writes, immutable operation identity and independent R2 verification. Do not let source/download ambiguity become a false receipt.

**Gate 3 — Durable unattended execution (optional, evidence/approval gated):** First prove a genuine unrecoverable job failure; benchmark interruption recovery versus normal save/screenshot speed, RAM, checkpoints and cloud costs. Do not implement a heavyweight scheduler or frequent journal unless the smallest safe method is approved and maintains fast-path performance. Record precise unsupported long-job cases.

**Gate 4 — Upgrade and customer resilience:** Test old/new extension↔Worker compatibility, existing account permissions, broken setup recovery, package/manifest verification, Chrome profile migrations and safe rollback.

**Gate 5 — Multi-customer scale:** Inject overload, repeated 1000+ right-click saves, screenshot shortcut bursts, open-History update floods, logged-out screenshot exclusions, concurrent customers and realistic network faults. Meet measured release SLOs without compromising security or remote-first simplicity.

**Gate 6 — Maintainability:** Periodically remove dead branches, measure long-term costs and update the compatibility policy. Only refactor working foundational parts when evidence justifies the risk.

## XIII. Deliverables for any engineer or Codex agent implementing this charter

1. **Inventory and proof boundaries:** Identify exact current source, affected owners, baseline commit, installed extension path, Worker deployment code and operator-approved test environment; label confirmed, probable, unverified and blocked findings.
2. **Small, isolated patches:** Prefer changes to existing registrar, boot, typed API, transport, Worker claim or migration owner. No second writer, surprise local cache, unapproved new service, unrelated redesign or secret logging.
3. **Before/after failure reproduction:** The old tagged baseline demonstrably fails the targeted injected mechanism; the new code passes the same fixture and adds stronger regression cases.
4. **Typed, versioned contracts:** Document method, IF/THEN/ELSE, authorization, persisted mutation, native effect, remote effect, final receipt and safe failure handling for each changed mechanism.
5. **Real installed acceptance:** Chrome native-menu rendering and exact user gestures on Windows; explicit authorized test account/bucket for any live R2 write. If unavailable, report BLOCKED rather than "verified".
6. **Resource and security review:** Prove bounded memory, concurrency, retries, cost, data handling, credential scope, public visibility and backwards compatibility.
7. **Source↔API and user-visible documentation:** Update existing latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md and 11.2026/workings/right-click-workings.json when expressed menu logic changes; keep desired rules distinct from real implementation.
8. **Truthful completion report:** Commit SHAs, changed files, test output, known residual risks, observed customer behavior and one minimal rollback/recovery procedure.
9. **Release discipline:** A separate FIXED/verified tag may be created **only** after actual repaired installed-browser acceptance; never move the protected known-bad tag.

### Permanent principle

> **The strongest system is not one that pretends failure cannot happen. It is one in which ordinary failure cannot destroy the customer's configuration, corrupt their destination, erase their access, duplicate a save, or manufacture a successful receipt—and in which recoverable work can safely continue without requiring the customer to understand the machinery.**

**This document defines the long-lived quality bar. Source code, tests, observed browser/Cloudflare behavior and release history—not this document alone—must establish whether the product has reached it.**
