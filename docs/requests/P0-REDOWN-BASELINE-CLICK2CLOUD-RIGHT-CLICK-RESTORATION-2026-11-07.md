# P0 CODEX REQUEST — RESTORE WORKING REDOWN FUNCTIONALITY IN CLICK2CLOUD
**Owner direction — November 7, 2026. Source audit + implementation assignment for Codex.**

## 1. Primary directive: MAKE CLICK2CLOUD WORK

Use **thanks-cohn/REDOWN as the functional baseline**. Click2Cloud exists primarily to reconstruct, stabilize, document, and conclusively verify REDOWN's RIGHT-CLICK system. It is NOT supposed to become a different cloud application with unnecessarily complicated networking, transfer, privacy, or storage architecture.

**Make THE CHANGE THAT NEEDS TO BE MADE.** Do not reinterpret the owner instruction as "smallest change," "minimal patch," "keep the current design," or "rewrite everything." Audit actual code, retain what works, and replace/reconstruct defective subsystems as extensively as needed to achieve reliable operation. The rest of the product should stay broadly REDOWN-equivalent except where real severe errors demand correction. FUNCTIONALITY FIRST. NO BLOAT. NO INVENTED REQUIREMENTS.

This document is an implementation assignment for a subsequent Codex run. Its creation itself authorizes **documentation only**. During the Codex job, implement in a fresh Click2Cloud development branch, not REDOWN; never silently merge, publish, or modify live production Cloudflare resources.

## 2. Repository authority and starting evidence

- Read-only functional reference: **thanks-cohn/REDOWN**, specifically extension/background.js, right-click-v3.js, cloudflare-auth.js, cloudflare-api.js, Shelf/History and Explorer modules.
- Implementation repository: **thanks-cohn/Click2Cloud**, starting from latest main and a new development branch.
- Read **AGENTS.md**, **docs/CODEX_MASTER_2026-11-07_SINGLE_ENGINE_REDOWN_PARITY_AND_WORKINGS.md**, **docs/requests/P0-CLICK2CLOUD-V3PLUS1-REDOWN-PARITY.md**, and **11.2026/workings/right-click-workings.json**. Respect the established 0/1/2+ menu, removal/default, login, OAuth, setup, API and native-ack invariants. This request clarifies the OWNER'S overriding goal of REDOWN functional equivalence and allows necessary replacement of defective code—not just incremental patches.
- The latest audited main at authoring: **21c6f24e826a751a605260967f30c836494b7afc**, release **0.3.8**. Codex MUST inspect the actual current checkout first, not assume the SHA remains HEAD.
- Evidence: docs/evidence/save-receipt-repair/HANDOFF.md, verification.json, live-provider.json and the owner's Windows remote receipts. Distinguish actual Cloudflare and Windows results from fixtures. Preserve the baseline *before* changing code.

## 3. Verified REDOWN versus Click2Cloud implementation differences

### REDOWN — reference implementation
In REDOWN extension/background.js:
- checkedFetch(raw, hops=5) validates source HTTPS and hostname and uses native Cloudflare **fetch(url, {redirect:'manual'})** with per-hop redirect validation. No custom HTTPS request serialization or TLS socket parser.
- Remote Worker calls checkedFetch(sourceUrl), then streams known-length response bytes via FixedLengthStream into R2; unknown-length path buffers bytes subject to its current MAX_BYTES policy. It produces a real R2 save result/key.
- REDOWN source metadata includes sourceUrl, publicPath, publicUrl, importedBy, importedAt. These are established useful capabilities. **Do not label REDOWN's provenance feature an inherent bug**; address actual credential-leak or severe security hazards specifically and preserve useful source History/metadata as appropriate.
- This is a **source-verified implementation**, not a claim that all REDOWN current production saves have been independently live-tested in this assignment.

### Click2Cloud 0.3.8 — current implementation
Relevant files:
- src/cloudflare/public-egress.mjs — custom DoH, IP selection, TCP, startTls, request write, response-header/chunk parsing.
- right2cloud-module/src/source-fetch.mjs — source URL/redirect/filename/content-type, stream.
- right2cloud-module/src/cloudflare-worker.mjs — source-fetch stage and R2 write; bounded stage diagnostics.
- right2cloud-module/src/cloudflare-r2-writer.mjs — conditional R2 write, streaming/spooling/verification.
- src/cloudflare/worker.mjs — authenticated Durable Object claims/operation/readiness endpoints.
- src/cloudflare/transport.mjs — typed authenticated remote transport, operation and verification.
- src/core/engine.mjs, extension/background.mjs, src/api/service.mjs — canonical Chrome click dispatch, API and outcomes.
- src/cloudflare/deployment.mjs and onboarding.mjs — existing provisioning/repair, not a second worker engine.

The new custom networking stack has suffered multiple actual workerd incompatibilities: unsupported redirect:'error', unsupported TLS ALPNProtocols, rejected outbound Node TLS connection, native socket/TLS premature EOF and incomplete HTTP response. Local injection/mock success did not prove live source transfer.

## 4. Real results: do not confuse readiness with successful right-click

Owner's Windows Chrome and Cloudflare session **verified a 57-byte R2 readiness file** inside existing lowercase redown: R2_READBACK_BYTES / independent-get-byte-comparison. This validates readiness-object storage and readback, not remote acquisition of an ordinary website file.

Owner's repeated ordinary right-click saves produced blocked / REQUEST_FAILED. The 0.3.8 receipt viewer fix correctly shows the saved blocked result. Authorization, capability and rechecks completed; Worker request failed before R2 object verification.

Isolated actual Cloudflare test Worker, after 0.3.8 repairs, reported:
- state blocked, code **SOURCE_HTTP_INVALID**
- diagnostic stage **source.fetch**, sourceStage **headers**, sourceReason **http-empty-response**.
- Worker/source response EOF occurred before destination.prepare and before any real object write.
- Independent provider readback for that ordinary file: **NOT REACHED**. Actual installed Windows right-click after corrected transfer: **NOT VERIFIED**.
- Production Worker and isolated test Worker are distinct. Do not assume extension rebuild deploys new Worker code.

## 5. Engineering correction — the full necessary repair, NOT merely a small patch

**Use REDOWN's native Cloudflare HTTPS fetch workflow as the functional foundation.** Audit what is genuinely useful in both implementations, then remove/replace/rework the defective Click2Cloud egress architecture **as much as necessary**. Stop accumulating brittle compatibility patches around custom TLS sockets if they are not required for a successful remote downloader.

Target user workflow:
**native Chrome right-click → selected source → canonical destination resolution and authorization → existing Cloudflare Worker fetches source remotely → R2 object written → independent verification → accurate History/GO TO.**

The Chrome user must not have to visit Cloudflare, open another tab, manually paste URLs, choose a bucket on every click, download full source bytes to their computer, or sign in again on normal ready saves.

Specific requirements:
1. Reconstruct public HTTPS source acquisition using Cloudflare's normal, supported fetch() behavior, preserving practical REDOWN parity for files, images, content length known/unknown, filenames, legitimate redirects and clear failures. Do not roll a parallel network engine.
2. Preserve genuine baseline safety against private-network access, redirect abuse, authorization bypass, credentials leaking in unsafe logs/metadata, and unbounded memory. Audit concrete security tradeoffs honestly: native fetch is not mathematically identical to custom literal-IP pinning. Do not overclaim DNS-rebinding guarantees, but do not leave the program broken due to hypothetical perfect assurances. Consult actual Cloudflare API/runtime behaviors and test.
3. Audit and adapt **R2 byte transport**: REDOWN known-length FixedLengthStream and unknown-length path versus Click2Cloud streaming, bounded spool and conditional PUT. Choose a production-capable working implementation based on proof—not an arbitrary mandate to copy all REDOWN code. Preserve large-file practicality, provider/platform limits, backpressure, overwrite avoidance and correct object metadata.
4. Retain **REDOWN useful metadata and History functionality** unless a demonstrated severe problem warrants handling. Do not stage a speculative privacy redesign. Explicit owner preference: WORKING MODEL / REDOWN FUNCTIONALITY first.
5. Respect already-authorized existing R2 redown bucket, Worker, session, stored destination and current user-selected defaults. No new Worker or bucket is needed merely to fix source fetching.
6. Remove obsolete custom socket/TLS and HTTP parser code when no longer needed. Avoid dead second paths, wrappers and contradictory capability claims.

## 6. Preserve the right-click product contract

Do not rebuild or replace V3+1's one menu compiler, native registrar, resolver, OAuth owner, API, trusted state store or Explorer File API unless actual failure proves reconstruction necessary; **repair/reconstruct the broken part** under one owner.

- Four initial flat provider entries in order: Google Drive, Dropbox, OneDrive, Cloudflare, subject to provider Settings visibility.
- Cloudflare **zero** assigned/visible destination: one flat attention/Manage Destinations action appropriate to user state, never unapproved resource creation.
- Exactly **one** assigned/visible Cloudflare destination: one flat direct-save entry.
- **Two or more** active assigned Cloudflare destinations: ONE Cloudflare submenu with exact destinations. Mere discovery/creation of unassigned buckets does not cause nesting.
- redown is a removable assignment: removing it never deletes the real R2 bucket or recreates the assignment; surviving single destination becomes flat. Intentional default/user folders win.
- Connected + READY: direct save from native right-click without extra interface; disconnected users see existing provider-focused Shelf login, OAuth only after explicit Log in.
- Preserve correct session refresh, native ACK, restart survival, history truth, no false SUCCESS, and GO TO only for verified objects.
- Other cloud rows remain; do not claim their uploads verified without actual provider evidence.

## 7. High-impact defects to fix where actually demonstrated

Fix necessary serious errors, not unrelated speculative redesign:
- Click shows success without provider confirmation; no object exists, wrong key/bucket/folder or corrupted/incomplete bytes.
- Duplicate or destructive uploads, collision errors, retries of uncertain writes.
- Wrong login/account/destination, lost choices after extension or service-worker restart, unapproved cloud creation, confused 401/403.
- Broken receipt display, missing accurate History/GO TO, UI crash or blocked save with opaque code.
- Concrete SSRF or unauthorized access risk, exposed access credentials and uncontrolled memory use.
- Unnecessary production code complexity that is itself causing source failures.

**Do not add arbitrary file, queue, depth, throughput, session or size caps as a development phase restriction.** Honor genuine provider, Chrome and resource limits.

## 8. Proof-first test matrix — no green fixtures as a substitute for reality

A. Extract and document REDOWN's actual working source/redirect/known-size/unknown-size/R2 behavior and limits, with source-line mapping.
B. Capture immutable pre-change Click2Cloud behavior map and reproduce the exact previous REQUEST_FAILED and subsequent SOURCE_HTTP_INVALID in supported environments.
C. Test source fetch with normal HTTPS text and image; redirects and redirects to blocked schemes/addresses; invalid cert, missing Content-Length, chunked response, corrupt/early EOF, abort/lease loss; preserve clear stage codes. Include mixed real public hosts.
D. Test valid unknown-length and large transfers without unbounded RAM or arbitrary caps; verify conditional R2 writes, duplicate filenames and KEEP BOTH.
E. **Real Cloudflare isolated approved test Worker**: fetch public HTTPS source, save in authorized isolated prefix of existing redown, inspect verified receipt, independently read object bytes using provider-backed readback. Record size, key, digest/ETag where appropriate and cleanup only exact authorized disposable test objects. Never touch production without explicit permission.
F. **Real Windows installed Chrome**: native context-menu click, correct menu target and destination, real source→Worker→R2 verification, History GO TO and second ordinary save. If owner environment unavailable: BLOCKED, not PASS.
G. Distinct scenarios: image, small text, duplicate filename, redirect, failure without phantom SUCCESS, reload/restart, existing default/custom folder, 0/1/2+ menus and redown removal.
H. Maintain GUI→trusted versioned API parity for every touched meaningful mechanism, including errors, permissions, confirmation, state and operations.
I. Verify ordinary source URL isn't accidentally converted into a private URL or an unsafe redirect; do not silently remove REDOWN features merely for a redesign.
J. Test actual existing Worker **version/digest** propagation independently of extension rebuild; old blocked operation is never silently replayed.

Distinguish evidence status strictly: SOURCE VERIFIED / TEST PASS / BROWSER FIXTURE PASS / LOCAL WORKER PASS / LIVE CLOUDFLARE PASS / INSTALLED CHROME PASS / BLOCKED / NOT TESTED.

## 9. Source-to-behavior parity, NO BLOAT and delivery

Maintain **11.2026/workings/right-click-workings.json** as actual 1:1 observed truth: pre-change baseline stays preserved; updated CURRENT maps if/then/else rules, GUI/native action, exact API, authorization, state transitions, successful and failing cloud effects and evidence. Update in the same changeset as behavior changes and keep its drift checks valid. Do not falsely mark incomplete checks verified.

For every new abstraction or removed legacy subsystem, show concrete reason. Do not introduce a second engine, duplicate OAuth owner, shadow configuration, shadow menus, error-suppressing compatibility bridge or redundant persistent state. Do not optimize for minimal diff size: **make whatever change is required to produce the functioning REDOWN-equivalent product**.

Deliver: precise REDOWN↔Click2Cloud difference table; original defect and root-cause analysis; source modules kept/replaced/removed; actual committed repair on a new branch; tests and exact classifications; independent live R2 receipts where authorized; installed Windows proof when possible; accurate remaining blockers; commit SHA; no merge or production deployment without owner permission.

## 9A. OWNER CLARIFICATION — FULL REDOWN FUNCTIONALITY, FULL API PARITY, NO SEVERE DEFECTS

**This section is the controlling goal of the next Codex implementation.** Codex has access to **both full repositories**: `thanks-cohn/REDOWN` (READ ONLY) and `thanks-cohn/Click2Cloud` (implementation target). **INSPECT REDOWN ITSELF IN DEPTH.** Do not use this handoff, its selected excerpts, or a short list of known files as a substitute for reading and tracing the source. Discover actual capabilities and behavior throughout REDOWN.

### Outcome precedence — FUNCTIONALITY FIRST

1. **WORKING REDOWN-EQUIVALENT FUNCTIONALITY is the number-one acceptance condition.** Click2Cloud must actually perform REDOWN's practical, useful workflows as REDOWN does for the user, with the same or better results, responsiveness and behavior. Most of the application should retain REDOWN's functional experience. Click2Cloud's primary reason for existing is to make the native RIGHT-CLICK system reliable, fully documented and tested. Right-click is the P0, not a justification to silently omit the rest.
2. **FULL PROGRAMMATIC ACCESS is a coequal required property of that working result**, not a replacement for it: every meaningful REDOWN capability translated into Click2Cloud must also be reachable through the existing trusted, versioned, typed V3+1 / Universal File API, with equivalent validation, authorization, side effects, outcomes and inspection. The GUI and native menu are **clients of the canonical API/business logic**. No GUI-only hidden business logic, shadow APIs or duplicate engines. API tests passing while the actual product fails does **NOT** count as DONE.
3. **Do not inherit severe REDOWN defects.** Extract REDOWN's useful mechanisms and semantics; detect and correct genuine source-demonstrable or reproduced severe issues (false success, damaged/missing files, lost state, wrong destination, dangerous authorization/security errors, memory explosions, destructive writes, severe Explorer/History failures). Preserve the *capability* while fixing the bad implementation. Avoid speculative "improvements" that change otherwise working features.
4. **Make the change that needs to be made.** Replace a whole broken subsystem if warranted; keep a sound one intact. Not "smallest possible patch," not gratuitous rewrite. NO BLOAT.

### Direct REDOWN-to-Click2Cloud extraction and translation

Codex MUST perform a repository-wide discovery and trace of **all consequential REDOWN functionality**, including capabilities not listed here. Inspect native menus; modes/destination management; OAuth/account lifecycle; Cloudflare and other providers; source fetching; TRUE REMOTE transfers; file/folder manipulation; Explorer, navigation, selection and previews; History/GO TO/Quick Glance; URL/metadata features; settings; import/export; and recovery. For each capability, identify the actual REDOWN entrypoint, code owner, state, data and network flow, observable result, failure behavior, and specific serious defects if any.

Build an evidence-linked translation matrix containing for EACH real REDOWN capability:
**REDOWN source/code path → observed/source-verified REDOWN user behavior → corresponding Click2Cloud code/UI → canonical typed API operation → authorization and user-gesture/consent constraints → inputs/state/side effects → desired matching working outcome → actual tests and remaining gaps.**

A feature without a matching working Click2Cloud outcome is a FUNCTIONAL GAP. A feature without equivalent programmatic access is an API GAP. Neither gap may be silently dropped, marked complete, or "fixed" by removing the feature. An unsupported REDOWN feature or platform-impossible programmatic gesture must be identified specifically and truthfully, not faked.

**Functional equivalence means real operations, not screenshots or architecture diagrams.** For instance, if REDOWN saves a right-clicked remote image into an R2 folder and makes it findable in Explorer/History, the Click2Cloud GUI AND programmatic operation must genuinely perform and confirm the same task on an actual authorized account. If REDOWN has a navigable/usable feature, the Click2Cloud counterpart must actually be navigable/usable—not merely show the corresponding button.

### Transparent, predictable, conditionally deterministic, fully inspectable

Use the following precise terminology in code/documentation:
- **Deterministic decision logic:** Given the same explicit inputs, configured menu generation, authorizations, persisted state and relevant observations, routing and validation yield the same decision/target. No hidden GUI-only precedence, unpredictable fallbacks, cross-mode state mutation or time-based "success."
- **Predictable external outcomes:** Actual network, provider, concurrency and OAuth outcomes are NOT deterministic. Define observable states, bounded errors, operation IDs, idempotency, exact authorization/confirmation, reconciliation and independent receipts; make interrupted/uncertain cases safely inspectable instead of pretending they succeeded.
- **Transparent:** Programmatic callers can read what is configured, why an operation resolves or fails, what was attempted and whether a provider independently confirmed completion, via safe structured codes and read-only inspection APIs.
- **API-equivalent:** GUI and API call the **same domain operation**, with the same permission checks, data model, validation, durable state and provider side effects. Real Chrome user gestures, browser file pickers, and provider OAuth consent cannot be impersonated; expose equivalent authorized intent/configuration/state/result where direct invocation is platform-restricted. Never bypass user consent to manufacture parity.

### Non-negotiable test and documentation gates

- First preserve the **immutable actual pre-change baseline** in `11.2026/workings/right-click-workings.json`; update CURRENT after changes. Source-backed IF/THEN/ELSE mapping must match implemented state, API, native menu, GUI and provider effects.
- Run paired REDOWN↔Click2Cloud **functional behavior tests**, not just comparison of code signatures. Test representative files, downloads, right-click 0/1/2+ menus, state persistence, folder/tree behavior, login, History/GO TO and any other discovered high-value workflows. Compare both correct and failing outcomes.
- For each meaningful GUI action, test the API equivalent and **cross-surface continuity**: programmatic changes appear in the GUI/native menu; GUI changes appear in API readback; both produce the same verified cloud result. Log all unmapped and unimplemented operations.
- Keep actual installed Chrome proof and authorized **live** Cloudflare/R2 source-byte readback as hard gates; simulations, fixtures, readiness probe or API contract success do not stand in for true user functionality.
- Distinguish SOURCE-VERIFIED, LOCAL-TESTED, BROWSER-FIXTURE-TESTED, LIVE-CLOUDFLARE-VERIFIED, INSTALLED-CHROME-VERIFIED, BLOCKED and NOT-TESTED. Do not claim complete parity if REDOWN-wide extraction or a key scenario remains untested.
- Handoff must enumerate REDOWN capabilities **preserved, translated, repaired, deliberately rejected for proven severe defect, not yet implemented** with links to both repo sources, associated API method, tests and exact evidence. No hidden scope reduction.

**FINAL OWNER ACCEPTANCE:** The user should get a **working product JUST AS REDOWN functions**, with the improved reliable right-click system, **all meaningful functions programmatically accessible through the canonical API**, transparent and predictable decisions, and severe defects not carried forward. Nothing short of actual working behavior is accepted. FUNCTIONALITY FIRST. FULL PARITY. NO BLOAT.

## 10. Definition of DONE

Click2Cloud is NOT fixed when only OAuth succeeds, a Worker responds READY, a simulated API test passes, or a 57-byte readiness file is verified.

**DONE** means a user on a real installed Chrome can right-click an ordinary supported web asset, select their configured Cloudflare target and have the actual bytes remotely saved in the correct R2 bucket/path, independently confirmed, recorded in accurate History and reachable through GO TO. Repeat the operation, preserve collision policy, custom destinations and menu state after restart. All documented UI/API/native behaviors must match proven execution.

**FINAL OWNER RULE: REDOWN IS THE FUNCTIONAL FOUNDATION. CLICK2CLOUD EXISTS TO FIX THE RIGHT-CLICK SYSTEM. MAKE THE CHANGE THAT NEEDS TO BE MADE. FUNCTIONALITY FIRST. NO BLOAT. NO INVENTED REQUIREMENTS.**
