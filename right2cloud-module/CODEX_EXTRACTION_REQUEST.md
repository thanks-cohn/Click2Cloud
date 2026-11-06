# CODEX MISSION — Extract REDOWN's REAL Cloudflare right-click save into right2cloud-module

**Date:** 2026-11-06  
**Source repository:** \`thanks-cohn/REDOWN\` — READ ONLY  
**Destination repository:** \`thanks-cohn/Click2Cloud\`  
**Destination branch:** \`feat/glaciaring-agent-debug\` (or the owner's current authorized Click2Cloud working branch; do not silently choose main)  
**Module directory:** \`Click2Cloud/right2cloud-module/\` at the repository root. **NOT inside FOREVER_WORKS.**  
**This run:** DIRECT SOURCE EXTRACTION → ISOLATED IMPLEMENTATION → TESTS → CONTAMINATION AUDIT → STOP FOR OWNER + CHATGPT REVIEW.  
**Future runs only:** Integrate into V3+1, deploy, run live cloud transfers, implement MEGA S4 / Amazon S3 adapters.

## NONNEGOTIABLE FIRST INSTRUCTION — BOTH REPOS ARE PROVIDED

The owner will provide the Codex agent access to **both full repositories**. Examine the REAL implementation in REDOWN directly, reading its actual source code and following live call dependencies. **Do NOT rely on, consult, summarize, cite as source, or use any previous FOREVER_WORKS extraction or documentation in either repository.** Do not substitute existing docs, diagrams, old agent summaries, assumptions or paraphrases for reading source. Docs may be useful outside this assignment, but **this extraction must stand entirely on its own with REDOWN implementation evidence.**

Do not assume two checkouts share a parent directory. First locate both working trees, verify each \`git remote\` / repository identity and relevant checked-out commit, and record the exact REDOWN source SHA. If REDOWN source is unavailable or not the expected repository, STOP without inventing code. If multiple REDOWN branches exist, identify which current implementation actually contains the Cloudflare right-click-to-R2 save pipeline; use its exact SHA, not a guessed branch. Do not reset, pull or mutate either repository to force a match.

## 0. THE GOAL — ONLY THE WORKING CLOUD SAVE MECHANISM

Extract **EVERY necessary part** of REDOWN V3's actual Cloudflare TRUE REMOTE save flow, faithfully enough that it can eventually be accepted into Click2Cloud V3+1:

    A user right-clicks a web file
            │
            ▼
    V3+1 will resolve the source and exact destination (FUTURE INTEGRATION)
            │
            ▼
    right2cloud-module (NEW, ISOLATED)
      • accepts a selected source
      • checks exact authorized Cloudflare destination and capability
      • dispatches authenticated remote-ingest request
            │
            ▼
    REAL Cloudflare Worker logic (EXTRACT FROM REDOWN SOURCE)
      • verifies caller and destination authority
      • validates source URL and redirects
      • fetches the source remotely (NOT through user's Downloads folder)
      • writes content to the authorized Cloudflare R2 storage binding
      • manages filename/key collision, transfer failure, uncertainty
            │
            ▼
    Independent provider-side verification
      • confirms actual object / key / size / supported integrity evidence
            │
            ▼
    typed VERIFIED / FAILED / BLOCKED / UNCERTAIN / CANCELLED result
            │
            ▼
    V3+1 will later display History, feedback and counters (NOT THIS RUN)

**This module must contain the essential WORKING Cloudflare Worker source-fetch and R2 object-writing logic, not just a context-menu handler, diagram, mock, promises, stub, or generic interface.** Retain all necessary stages—event-to-save input extraction, authorization requirements, prepared Worker transport, remote source acquisition, R2 write, receipt reconciliation and independent verification—as self-contained code or explicit, injection-ready trusted host capabilities with precise contracts. Never claim fully working production integration from isolated tests.

**Do not import REDOWN V3 as a dependency.** Extract the required mechanism into clear new code and explain any original source logic that had to be adapted.

## 1. SCOPE — KEEP THE CLOUDFARE SAVE, LEAVE V3 BEHIND

What we are extracting:
- What the right-click user gesture gives REDOWN (source URL type, filename and type hints, appropriate target identity).
- The minimum source-normalization and validity logic needed to make a supported source transferable.
- Exact Cloudflare account, R2 bucket, authorized prefix and prepared Worker capability resolution (host-injected as necessary).
- Authenticated browser/extension → Cloudflare Worker request/response contract.
- The **actual Worker-side** remote HTTPS fetch and safe redirect/source policy.
- Streaming/body handling, size/time limits, integrity constraints, R2 write and error/uncertain outcome.
- KEEP BOTH behavior or the actual safe collision strategy, not hidden overwrite.
- Actual independent R2 verification, including known limits of HEAD/ETag/content checks.
- Stable operation identity, security/trust boundary, transfer-result normalization and no premature success.

What we are **not** extracting:
- V3 menus, right-click setup screens, Simple/Narrow/Depth modes, menu compiler, native menu registration engine, context-menu nesting, custom labels or folder-tree discovery.
- V3 Explorer, Shelf, history UI, counters, sounds, mascots, animations, dashboard, settings or onboarding.
- V3 CURRENT/IndexedDB schemas, JSONL/backups, migrations, storage mirroring, full boot/recovery architecture or old state stores.
- Automatic Cloudflare bucket provisioning, worker deployment, R2 activation, OAuth popup UI or billing-changing configuration.
- Other clouds: **NO Google Drive, NO Dropbox, NO OneDrive extraction**. They are separate future modules and outside this mission.
- Any redesign/repair of V3 itself.
- Any edits to existing Click2Cloud V3+1 runtime or production behavior.

The generic Chrome right-click menu remains owned by V3+1; **right2cloud-module is a callable transfer capability**, not another competing menu engine.

## 2. SOURCE INSPECTION — TRACE ACTUAL CODE, NOT DOCUMENTATION

Read REDOWN source directly. START with these likely anchors; confirm function names/locations against actual checkout instead of trusting these hints:

- \`REDOWN/extension/background.js\`:
  - Native \`chrome.contextMenus.onClicked\` entry and source-selection inputs.
  - Right-click dispatcher / \`saveResolvedRightClick\` if present.
  - Cloudflare destination/account resolution and prepared Worker handshake.
  - \`ingestCloudflareAtPrefix\`, actual HTTP Worker ingest request and response, if present.
  - \`verifyCloudflareReceipt\`, actual independent HEAD/metadata/object validation, if present.
  - The embedded \`WORKER_SOURCE\` string: request handlers, bearer secret validation, source URL validation, redirect controls, bytes acquisition, key selection, \`env.STORAGE\` R2 upload, HEAD/stats and error handling.
- Any **actually invoked** helpers/modules needed for that specific Cloudflare save path. Follow imports, callbacks, Worker routes and dynamic dispatch edges end-to-end.
- Tests exercising that same path; classify what they demonstrate versus not.

Directly inspect code from the native click handler **through the actual Worker R2 write and return verification**. Draw a source-pinned call graph with each function, caller, callee, parameters, outputs, auth/trust context, side effects, failure/uncertain branches and file:line + commit. Include any relevant Worker code embedded in template strings, not just external \`worker/src\` if that file is unrelated.

**Don't assume \`REDOWN/worker/src/index.js\` is the Worker used by the extension:** determine which Worker REDOWN's real save requests actually reach. Source-ground it.

If crucial behavior is in a large mixed REDOWN function, extract/refactor *just that behavior* and explicitly document anything excluded. If an essential part appears broken/unverified in code, report it; don't assert old code is perfect merely because the product description says it works.

## 3. WHERE TO WRITE — STRICT FILE ALLOWLIST

You may create and edit files **ONLY beneath**:

    Click2Cloud/right2cloud-module/

Suggested arrangement (simplify if cleaner):

    right2cloud-module/
      README.md
      SOURCE_TRACE.md
      API_CONTRACT.md
      KEEP_ADAPT_REJECT.md
      SECURITY_PRIVACY_LIMITS.md
      FUTURE_S3_ADAPTER_CONTRACT.md
      REVIEW_GATE.md
      src/
        index.mjs
        save-coordinator.mjs
        cloudflare-worker.mjs
        cloudflare-r2-writer.mjs
        source-fetch.mjs
        verification.mjs
        destination-writer.mjs
      tests/
        *.test.mjs

All names except the root directory are suggestions; use the smallest readable module graph. It should be **actual importable JavaScript and actual Worker-compatible logic** with local tests—not documentation alone.

Never edit:
- REDOWN (anything).
- Click2Cloud \`extension/\`, \`src/\`, \`manifest*\`, \`package.json\`, build scripts, CI, root readme, existing tests, or any preexisting file outside the dedicated module.
- Do not create/change \`FOREVER_WORKS/\` files.
- Do not attach/import/activate the module in Click2Cloud runtime yet.
- Do not deploy, provision, perform a live write, update cloud objects, or attempt live OAuth. Those require separate authorization.

If the required extracted code needs a runtime primitive supplied by the future V3+1 host, define a small **injected port** and a runnable local test double; do not break the allowlist by editing the host. If an extracted Worker requires specific bindings or deployment config, describe exact prerequisites without deploying.

## 4. COMPLETE CLOUDFARE R2 TRUE REMOTE EXTRACTION

### 4A. Browser-facing operation, without V3 menu baggage
Design an importable \`right2cloud-module\` operation that receives a valid host-supplied source reference and an exact immutable destination. Example shape (refine if the source requires it):

    saveRemote({
      operationId,
      source: {url, filename?, contentTypeHint?},
      destination: {
        provider: "cloudflare-r2",
        connectionId, accountId, bucketName, prefix,
        conflictPolicy: "keep-both"
      },
      signal?
    }, trustedDependencies)
      → typed outcome

Keep native menu listener, Chrome registration and menu ID resolution **out**. V3+1 will later feed this operation; it must not infer a bucket from last-use state, human-readable label or stale menu label.

Trusted dependencies may include \`authorize\`, \`getPreparedWorkerCapability\`, \`authenticatedRequest\`, \`recheckAuthorization\`, \`verifyObject\`, \`clock\` and logging with redaction. Avoid requiring preexisting REDOWN state stores.

### 4B. Exact permission boundaries
- Validate exact provider, Cloudflare account, bucket and prefix against trusted approved identities, not merely untrusted string fields.
- Bind remote Worker auth to the correct user/account/bucket and least-privileged capability. No wildcard write route on public internet.
- Refuse stale/revoked capability or changed account. No default destination or cross-account fallback.
- Keep bearer secrets/OAuth tokens out of UI, page worlds, source URL query strings, debug logs and committed files.
- Worker provisioning and OAuth login are separately owned by the future host; no silent activation.

### 4C. Worker remote-fetch source validation
- Cloudflare Worker receives \`sourceUrl\` to fetch a public remote source. **This is the defining TRUE REMOTE mechanism.**
- Strictly validate HTTPS, target hosts/ports, redirect chains, forbidden/private/loopback/reserved hosts, dangerous URL forms, network redirects and timeouts. Include tests for known tricky cases and document network-level limits (DNS rebinding/re-resolution and Worker platform constraints).
- Never forward user's browser cookies, local credentials, login tokens, referrer, page URL or other browser provenance.
- Handle fetch errors, inaccessible/authenticated source pages, response types and binary bytes faithfully; never claim every website can be fetched.
- Preserve streaming where actually possible and honestly identify when Worker must buffer unknown-length bodies. Do not claim unlimited transfers absent test/platform evidence.
- Source URLs with signed query credentials are sensitive; do not expose in logs or provider metadata.

### 4D. Remote write into Cloudflare R2
- Extract R2 binding use from actual Working Worker source, including exact object-key rules and collision handling.
- Worker must have a trusted, authorized R2 binding/capability; never let client invent or escape bucket/prefix scope.
- Build safe filename/key handling, including Unicode/extensions, prefix boundaries, attempted traversal and unsafe separators.
- Preserve **KEEP BOTH** where feasible; if atomic non-overwrite is not proven for the actual API/implementation, explicitly identify the race and fail closed rather than silently destroy a prior object.
- Respect Cloudflare size, execution/memory, streaming and object limits; no arbitrary pretend 'no cap'.
- Await the actual write, return a receipt containing enough exact identity/size info for independent verification.
- Do not upload to user's local Downloads folder as a staging step.
- After a possibly committed write times out, produce \`UNCERTAIN\` and read-only reconciliation guidance; do not blindly repeat writes.

### 4E. Independent verification
- Extract REDOWN's independent R2 HEAD/readback flow or adapt it into a safe equivalent inside isolated code.
- Verify exact account/bucket/prefix/key identity and expected bytes; use cryptographic content proof where actually available and identify ETag/HEAD limitations.
- An HTTP success response from the Worker alone is **not** verified storage.
- Original V3 may have checked/stored \`sourceUrl\` in R2 custom metadata. **DO NOT inherit source provenance as object metadata.** Replace that check with a privacy-respecting proof/identity mechanism. Explicitly flag the difference.
- No green success / completed state until independent verification evidence is accepted. History and visual effects remain V3+1 responsibilities.

### 4F. Errors, uncertainty, cancellation, retries
At minimum preserve typed outcomes:
\`verified\`, \`failed\`, \`blocked\`, \`uncertain\`, \`cancelled\`.
Include safe machine-readable error codes; operationId; destination/provider identity; confirmed key/size/proof when known; reconciliation hints without secrets.
Distinguish:
- Failure before Worker dispatch (safe no-write).
- Worker fetch failure (known no-write).
- Worker write rejected (known failure).
- Potentially committed write with lost response (uncertain).
- Provider verified storage (verified).
- Abort before dispatch (cancelled).
- Abort after possible commit (uncertain).
- Key conflicts (keep both or explicit conflict; never overwrite).
- Wrong account/bucket/connection (blocked).

Exactly one logical save per operation and no implicit duplicate write attempts; an idempotency/reconciliation design must be evidence-based, not a hash of the selected URL alone.

## 5. IMPORTANT FUTURE ARCHITECTURE — WORKER-SIDE DESTINATION WRITERS

**Now:** Working Cloudflare Worker → Cloudflare R2 writer, extracted from REDOWN source.

**Later:** The *same* Cloudflare Worker remote-fetch source pipeline → MEGA S4, Amazon S3, and any approved S3-compatible storage through a small \`DestinationWriter\` interface.

Design this extension point NOW, but **do not build S3 credentials, signed requests, live S3 implementation or MEGA/Amazon adapters in this extraction run**.

Desired architecture:

    user right-clicks
       |
    V3+1 menu/destination resolver (later)
       |
    right2cloud-module (this extraction)
       |
    Cloudflare Worker: remote source URL validation + fetch
       |
    DestinationWriter (Worker-compatible port)
       |-- CloudflareR2Writer   [implement now]
       |-- MegaS4Writer        [future]
       |-- AmazonS3Writer      [future]
       |-- GenericS3Writer     [future; capability-gated]

The Cloudflare Worker is the remote transfer **compute** layer. Cloudflare R2 is one possible destination, not an obligatory intermediate hop. When the user later selects MEGA S4 or Amazon S3, the future writer should save there directly; do not route to R2 first by default.

A minimal conceptual Worker-side writer port might have:
- \`kind\`, \`capabilities\`, \`validateAuthorizedDestination\`
- \`prepare({destination, filename, sourceMetadata, operationId})\`
- \`write({prepared, bytesStream, length?, contentType?, signal?})\`
- \`verify({prepared, writeReceipt, expectedProof?})\`
- optional \`inspectPending\` and \`abortPending\`.

Refine to match actual Worker constraints, but keep the mandatory interface small. Provide a **contract-only sample** for a future S3 writer and a test double. Do not present it as functional real MEGA/Amazon storage support.

Future writer requirements to document now:
1. Exact provider + account/connection + bucket + key scope.
2. Trusted, user-authorized endpoint and signing region, with **no guessed MEGA signing region**.
3. Worker-side credential security and SigV4/provider-appropriate authentication; never transmit credentials to untrusted browser pages or to a public Worker invocation.
4. HTTPS request signing and supported content-length / checksum / streaming modes.
5. Multipart/resumable transfers where supported, bounded memory, explicit size/time limits, and safe reconciliation/abort.
6. Provider-specific collision and conditional write semantics. Not all S3-compatible services behave exactly like AWS S3.
7. Independent remote object HEAD/readback/checksum proof; ETags may not be full-file checksums, particularly with multipart.
8. No original source URL, page URL, link URL or referrer as object headers/metadata or provider logging payload.
9. Safe egress-cost and security boundaries; prevent using Worker as open arbitrary fetch/upload proxy.
10. Capability negotiation and typed NOT_SUPPORTED rather than hidden fallback to R2.

**Important distinction:** Click2Cloud's future/browser-side Universal File API S3 adapter is not automatically executable inside a Cloudflare Worker. A Worker-compatible writer must be explicitly implemented and tested later. Keep the bridge conceptually aligned with the Universal File API's destination identity and receipt semantics, but do not create a competing Universal File API or modify that system now.

## 6. V3+1 FUTURE ACCEPTANCE CONTRACT — DOCUMENT ONLY

You have both repos. Inspect Click2Cloud's **existing runtime source** READ ONLY to make the extracted module easy to accept later. Suitable anchors if present:
- \`Click2Cloud/extension/background.mjs\`
- \`Click2Cloud/src/core/engine.mjs\`
- \`Click2Cloud/src/core/save-dispatcher.mjs\`
- \`Click2Cloud/src/core/source-capture.mjs\`
- \`Click2Cloud/src/chrome/registrar.mjs\`
- \`Click2Cloud/src/explorer/file-api.mjs\` and relevant API adapters

Describe (do not implement) the exact integration seam:
1. V3+1 native context-menu event gives source / selected action.
2. V3+1's own destination resolver supplies exact authorized account/bucket/prefix.
3. V3+1 passes immutable SaveIntent and trusted Cloudflare Worker capability to right2cloud-module.
4. Module issues authenticated remote fetch/write and returns typed verified result.
5. V3+1 records verified History/counter/success and exposes the same operation through its programmatic API.

**Every meaningful GUI mechanism must have an equivalent callable API operation.** The new module exposes a programmatic operation usable by native right-click *and* future API clients, with equivalent authorization and observable result. It is not itself another GUI or menu system.

Do not implement these steps in Click2Cloud yet. In a separate later run, integration must be followed by real Chrome right-click and real, authorized provider-readback tests before claiming production functionality.

## 7. MANDATORY CONTAMINATION AUDIT — WHAT SURVIVES V3?

A major objective is to ensure **the rubbish and accidental coupling in V3 do not contaminate V3+1**.

For each directly traced REDOWN function and dependency, produce a KEEP / ADAPT / REJECT matrix with:
- REDOWN pinned source file / line / function.
- Actual purpose and call dependencies.
- Whether included, rewritten or excluded.
- Why required / why rejected.
- New candidate module location.
- Evidence and remaining unverified assumptions.

Actively reject:
- V3 menus, Simple/Narrow/Depth, setup, editor, CURRENT state stores and migrations.
- Legacy provider menus, provider-specific OAuth UI, Google Drive/Dropbox/OneDrive modules.
- Global last bucket, silent default destination and stale authorization.
- Embedded tokens, Cloudflare account identifiers hard-coded as authority, credentials in source.
- Browser provenance, original URL embedded in object metadata, HTTP/debug logs leaking secrets.
- Automatic activation/provisioning/deployment, writes during setup, popup/tab workarounds.
- Timer-based success, misleading verification receipts, arbitrary success counters.
- Arbitrary 32 MiB/300 MiB assumptions presented as unconditional limits or guarantees; accurately represent real platform constraints.
- All-in-memory unbounded buffers, unsafe source URLs, unchecked redirect/SSRF boundaries.
- Silent overwrite, ambiguous-write auto-retry, duplicate invocation.
- Borrowed REDOWN cross-module imports, background listeners, V3 storage or event handlers.

For suspected risks distinguish **actually present in inspected REDOWN**, **present in new candidate**, **present in existing V3+1**, or **potential issue only**. No unsupported accusations.

## 8. LOCAL IMPLEMENTATION TESTS — REAL CODE, FAKE EXTERNAL INFRASTRUCTURE

The candidate must implement actual source acquisition/R2 Worker code, but this run can test it only with injected mock source HTTP, Worker environment and R2 binding. **Mocks are not the shipped implementation.** Do not claim real R2 deployment or live saves.

Tests must include at least:
1. Import without Chrome, V3 runtime or REDOWN state.
2. Valid save intent with trusted exact destination.
3. Missing/expired/wrong Cloudflare authorization.
4. Source URL eligibility, private/loopback/redirect rejection, unsupported/missing source.
5. Worker request principal and exact storage binding.
6. Fake successful streamed source → actual extracted Worker handler → fake R2 binding write → independent fake HEAD/readback → verified.
7. No source URL stored as R2 metadata or passed to future S3 writer.
8. Binary fidelity, filename/Unicode/key handling and prefix boundary.
9. Keep Both collision behavior and no silent overwrite; concurrency uncertainty limitations documented.
10. Known-length stream, unknown-length body, size, deadline and partial failure.
11. Failed source GET, failed R2 PUT, malformed Worker response.
12. Lost response after possible commit → UNCERTAIN, no blind automatic re-write.
13. HEAD missing, wrong key/bucket/prefix/size/content evidence → not VERIFIED.
14. Cancellation before dispatch and after possible write.
15. Fake future S3 writer can satisfy the port; no real provider credential or network.
16. Every changed file is inside \`Click2Cloud/right2cloud-module/\`.
17. REDOWN remains byte-for-byte unchanged, V3+1 runtime remains unchanged.

Use commands that work without editing root build scripts, e.g.:

    node --test right2cloud-module/tests/*.test.mjs

If test support dependencies would require modifying root package files, avoid them or vendor only truly necessary, licensed local test helpers under the new module. Do not silently violate the allowlist.

If local tests cannot fully emulate Cloudflare's R2 bindings, document those test fidelity limits. Do not fabricate a live success claim.

## 9. DELIVERABLES AND STOP GATE

Before stopping, create within the new module directory:

- **Actual code** for an isolated right2cloud transfer coordinator, Worker remote-fetch implementation, complete R2 writer, and independent verification (with precise host-provided capabilities where required).
- Tests and exact test-results report; both passing and failing results shown truthfully.
- \`SOURCE_TRACE.md\`: original REDOWN code call graph sourced directly from checked-out code with pinned SHA, file:line and behavior.
- \`API_CONTRACT.md\`: import/export signatures, SaveIntent/results, trusted boundaries, future V3+1 caller sketch.
- \`KEEP_ADAPT_REJECT.md\`: precise inheritance contamination audit.
- \`FUTURE_S3_ADAPTER_CONTRACT.md\`: realistic MEGA S4 / Amazon S3 / generic S3 future insertion path, capabilities and auth/stream/security constraints.
- \`SECURITY_PRIVACY_LIMITS.md\`: truth about source URLs reaching Cloudflare, forbidden metadata leakage, redirects/SSRF, authorization and current file-size/streaming limits.
- \`REVIEW_GATE.md\`: owner + ChatGPT inspection checklist with every nontrivial imported source behavior and all unresolved decisions.
- File diff and Git status proving source REDOWN unchanged and target existing V3+1 unchanged.

An extraction is not complete if it consists only of a handoff document, if the real Worker implementation is absent, or if the R2 writer is fake. The code must be legitimately ready for a future integration run, even though live deployment and actual Chrome/provider proof are deferred.

Do not conceal unavoidable missing dependencies. If a critical REDOWN function cannot be safely extracted without rewriting unrelated runtime, isolate an explicit port and document exact missing integration requirements; report **PARTIAL** instead of claiming complete.

**WHEN THE ISOLATED EXTRACTION + TESTS + AUDIT ARE COMPLETE, STOP. Do NOT integrate or deploy.** The owner and ChatGPT will review whether any V3 legacy problems crossed the boundary. A separate authorized Codex run will connect the approved module to V3+1, and still later runs can implement Worker-side MEGA S4, Amazon S3 and additional S3 writer adapters.

The final Codex handoff must end with this clear status:

    right2cloud-module — EXTRACTED FROM ACTUAL REDOWN SOURCE
    Cloudflare TRUE REMOTE + R2 writer — ISOLATED CANDIDATE
    Future S3 writer seam — CONTRACT ONLY
    V3+1 RUNTIME — UNCHANGED
    REDOWN SOURCE — UNCHANGED
    NOT INTEGRATED / NOT DEPLOYED / NOT LIVE-VERIFIED
    NO GOOGLE DRIVE / DROPBOX / ONEDRIVE
    READY FOR OWNER + CHATGPT REVIEW

---

## LIGHTWEIGHT STARTER PROMPT FOR CODEX

**Both repositories are available to you.** Work in the Click2Cloud working branch and read \`Click2Cloud/right2cloud-module/CODEX_EXTRACTION_REQUEST.md\` as the controlling instruction.

**Extract directly from REDOWN's ACTUAL SOURCE CODE**, not from FOREVER_WORKS or any other prior extraction documents.

Trace and isolate the complete working REDOWN V3 Cloudflare right-click TRUE REMOTE flow—including browser coordinator, authenticated Worker request, actual Worker remote HTTPS fetch, R2 object writer, independent verification and failure/uncertainty logic. Build it as executable, isolated \`Click2Cloud/right2cloud-module/\` code and self-contained tests.

Keep ALL V3 menus, Simple/Narrow/Depth, UI, storage/state and unrelated code OUT. Do NOT extract Google Drive, Dropbox or OneDrive.

Make the Cloudflare Worker source-fetch engine accept a small **Worker-compatible DestinationWriter interface**, with **only Cloudflare R2 implemented now**, so future independent MEGA S4, Amazon S3 and generic S3 writers can be added without rebuilding right-click behavior. Design realistic safe authorization, stream and verification contracts.

Do not modify any preexisting Click2Cloud runtime files, REDOWN source, manifests or build scripts. Do not integrate into V3+1, deploy, authenticate to live services or perform real cloud writes.

Provide a source-pinned KEEP/ADAPT/REJECT audit, tests, privacy/security limits and a strict owner + ChatGPT review gate. **STOP after extraction.**
