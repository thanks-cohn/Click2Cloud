# CODEX EXTRACTION MISSION — right2cloud-module
## Complete REDOWN V3 Cloudflare right-click TRUE REMOTE save, isolated and prepared for future S3 destination adapters

**Date:** November 6, 2026  
**Repository:** thanks-cohn/Click2Cloud  
**Working branch:** feat/glaciaring-agent-debug  
**Reference code:** thanks-cohn/REDOWN, read-only  
**Module name:** right2cloud-module  
**Mission:** EXTRACT → DECOUPLE → IMPLEMENT AN INDEPENDENT CANDIDATE → TEST → AUDIT → STOP.  
**Not authorized:** integrating into live Click2Cloud V3+1, modifying existing Click2Cloud runtime, merging, deploying Workers, provisioning resources, managing real credentials, or executing live cloud mutations.

**THE OWNER'S INTENT IN ONE SENTENCE:** Salvage **everything needed for REDOWN V3's actual working “right-click a web file → Cloudflare Worker remotely fetches it → uploads into Cloudflare R2 → verifies the result”** and nothing else; package that complete capability as a clean, working, separately inspectable module that can later plug into Click2Cloud V3+1 and, in later runs, target MEGA S4, Amazon S3 and other S3-compatible destinations through an adapter contract.

This is **not** a request to restore, modernize, rebuild, or import the REDOWN V3 engine wholesale. We are leaving the rest of V3 behind. The next implementation run can connect the approved extracted module to V3+1, but NOT this run.

### Relationship to other instructions

This document is the controlling *specific extraction task*. Respect security, branch boundaries, privacy, live-provider evidence and file ownership requirements in AGENTS.md. Earlier broad P0 upload plans and FOREVER_WORKS reconstruction plans are references, **not additional work orders** for this run.

The earlier extraction exists on the **main branch** under:
- FOREVER_WORKS/README.md
- FOREVER_WORKS/REDOWN_CURRENT_V3_SOURCE_EXTRACTION_2026-11-05.md
- FOREVER_WORKS/CODEX_REBUILD_FROM_REDOWN_CURRENT_V3_EXTRACTION_2026-11-05.md

If these files are not present on the working branch, **read them via GitHub or git show origin/main:<path>**, without merging or cherry-picking the rest of main into this branch. Reuse the extraction. Do not repeat the entire V3 audit or treat its description as proof of Click2Cloud functionality.

# 1. Strict scope: exactly the original Cloudflare remote-save ability

The essential functional pipeline to extract is:

    Chrome context-menu click [host outside module]
            |
            v
    selected source reference + exact authorized R2 destination
            |
            v
    right2cloud-module browser-side coordinator
            | source selection/filename & trust validation
            | account/bucket/prefix/Worker capability authorization
            | correlated attempt ID, no fallback destination
            v
    authenticated Cloudflare Worker request
            |
            v
    Worker validates request, permissions, source URL and redirects
            |
            v
    Worker remotely FETCHES source bytes (not to the user's disk)
            |
            v
    Worker writes bytes into target Cloudflare R2 binding
            | handles real size, object identity, keep-both conflict,
            | stream/body constraints, failures and ambiguous writes
            v
    independently inspect actual final R2 object
            |
            v
    result = VERIFIED / FAILED / BLOCKED / UNCERTAIN / CANCELLED
            |
            v
    V3+1 host may later record History/UI/counter [NOT part of module]

**Do not “extract” only chrome.contextMenus.onClicked or only a dispatcher interface. Include the actual relevant Worker source-acquisition, streaming/write, authentication and verification implementation.** Everything necessary for the Cloudflare R2 **remote fetch → remote write** capability must be present as code or a narrowly specified, injected host capability, with its real origins documented.

Deliver an implementation-ready, importable candidate. Fake adapters are acceptable only for isolated testing; do **not** substitute mocks or TODO methods for required Cloudflare R2 logic and claim the module functional. The final candidate will be called “not integrated / not live verified” until the future run proves it on actual authorized resources.

# 2. What must NOT be extracted

Exclude entirely, and prove via dependency audit:

- REDOWN's V3 Simple/Narrow/Depth/Level modes, menu compiler, menus, contextMenus registrar, menu IDs, labels and menu rendering.
- REDOWN V3 destination editor, Explorer screen, Shelf, options/settings, preview UI, themes, animations, sounds and mascot.
- Legacy CURRENT IndexedDB schemas, JSONL journals, backups, migration, broad folder discovery, history UI, user notifications, dashboard cards and default-bucket provisioning.
- REDOWN startup/BOOT architecture, Chrome service-worker wrapper, old right-click engine and competing event listeners.
- Google Drive, Dropbox and OneDrive source/transport/provider modules; no code import, abstractions tailored around them, or parity work for them.
- Existing Click2Cloud V3+1 runtime modifications or automatic new product behavior.
- Any hidden fallback to a global/last-used bucket; arbitrary public URL publishing, public-file activation, automatic Worker deployment, billing or new bucket creation.

These are not necessary to make a source file go remotely into an authorized bucket. If a function from REDOWN mingles necessary transfer logic with any of the above, **extract/refactor the necessary logic only** and write down what was rejected.

# 3. Allowed files and STOP boundary

**Only add/edit files within:**

    FOREVER_WORKS/right2cloud-module/

Suggested small structure (adapt to actual separation, do not inflate it gratuitously):

    FOREVER_WORKS/right2cloud-module/
      README.md
      API_CONTRACT.md
      SOURCE_MAP.md
      KEEP_ADAPT_REJECT.md
      SECURITY_PRIVACY_AND_LIMITS.md
      S3_ADAPTER_FUTURE.md
      TEST_REPORT.md
      REVIEW_GATE.md
      src/
        right2cloud-module.mjs       // safe browser/host operation coordinator
        cloudflare-r2-port.mjs       // exact authorized R2 destination
        cloudflare-worker-handler.mjs// extracted TRUE REMOTE Worker behavior
        source-policy.mjs            // URL/redirect/source trust policy
        verification.mjs             // independent final R2 receipt
        destination-port.mjs         // tiny provider-neutral destination interface
      tests/
        *.test.mjs

Do not edit preexisting: extension/, src/, scripts/, package.json, package-lock.json, manifest files, AGENTS.md, existing docs, README outside your new module, tests elsewhere, or REDOWN repository. Do not integrate via import, register Chrome listeners, attach to the existing API registry or change the extension build.

Test with **self-contained** commands such as:

    node --test FOREVER_WORKS/right2cloud-module/tests/*.test.mjs

No live OAuth, no deployed Worker writes, no production secrets, no cloud buckets touched, no real provider API mutations.

# 4. Source-grounded extraction from REDOWN V3

First use existing FOREVER_WORKS extraction, then confirm the exact relevant source edges in the READ-ONLY REDOWN repository. Record pinned source commit and source line/function for each edge.

At minimum trace:

A. Native event information to selected source:
- REDOWN extension/background.js contextMenus.onClicked.
- saveResolvedRightClick, selectedUrl and corresponding filename derivation.
- Source precedence for image srcUrl / linkUrl / supported media, including unsupported source forms.
- Which values are V3 menu-specific and must be supplied by V3+1 as an already resolved destination instead.

B. Trust and prepared destination:
- Worker/profile resolution for exact Cloudflare account ID, R2 bucket and prefix; verify currently connected/authorized account and Worker deployment identity.
- Worker route and Bearer auth; exact path validation, failed capabilities, handling of revoked credentials and unexpected redirects.
- No importing REDOWN profiles/settings or automatic provisioning code; express these as injected trusted host responsibilities.

C. Worker TRUE REMOTE source acquisition:
- Original Worker request contract (sourceUrl, exact folder, filename, authorization).
- Remote fetch logic, validated HTTPS source, redirect handling, forbidden private hosts/ports/loopback, credential/cookie policy, abort/deadline, size and content-type handling.
- Any buffering fallback for unknown content length, Worker memory/resource constraints and claims that are only conditionally streaming.
- Explicit checks against unsafe source URLs; avoid overclaiming SSRF protections that have not been tested.

D. R2 write:
- How Worker selects exact destination key, enforces allowed prefix and implements KEEP BOTH without overwriting.
- How the Worker writes an R2 object through bound storage.
- Content length, binary integrity and streaming constraints.
- Provider write result; what actual R2 APIs/conditions demonstrate completion.
- Staging/rollback or uncertainty handling, if actually implemented; do not invent guarantees.

E. Post-write independent verification:
- REDOWN verifyCloudflareReceipt and relevant Worker headObject operation.
- Independent R2 HEAD/readback result, key/prefix, byte count, ETag/object identity, live authorization.
- Identify the historical check on sourceUrl customMetadata as a privacy/coupling hazard; do not import it automatically.
- When a HEAD establishes object existence but cannot prove identical content, report the evidentiary limit and design a checksum/readback route for future live verification.

F. Final outcome:
- Whether original REDOWN records a save in History only after verification; which outcomes are uncertain.
- Extract only provider-neutral status/receipt. Do not copy History, notifications, counter or UI behaviors.

For every edge label: SOURCE DIRECTLY VERIFIED / SOURCE DOCUMENTED BUT NOT VERIFIED / PROPOSED CLEAN REPLACEMENT. Cite exact pinned file/function/line and note if the main branch has diverged.

# 5. Important principle: one remote-fetch engine, selectable destination writer

Do not couple source acquisition permanently to R2. Separate two responsibilities:

    Right2Cloud source/transfer coordinator
      = "What did the user select? Can we remotely fetch it safely?"
                   |
                   v
    DestinationWriter interface
      = "Which authorized object store should receive these bytes?"

**Implement only ONE real destination writer in this run: Cloudflare R2.**

Expose a narrow, stable port so later Codex work can add S3-compatible writers without modifying the browser right-click caller or reimplementing safe source validation/fetch.

Candidate conceptual contract (Codex should refine to match actual Worker APIs, do not mistake example syntax for completed interface):

    RemoteSaveRequest {
      operationId,
      source: { url, filename?, contentTypeHint? },
      destination: {
        provider: "cloudflare-r2",
        connectionId,
        accountId,
        bucketName,
        prefix,
        conflict: "keep-both"
      },
      authorizedCapability, // privately held, never passed to untrusted page
      signal?
    }

    DestinationWriter {
      providerKind,
      capabilities({ destination, principal }),
      prepare({ destination, filename, expectedLength?, contentType?, operationId }),
      write({ prepared, sourceBody, expectedLength?, contentType?, signal? }),
      verify({ prepared, writeReceipt, expectedContentProof? }),
      inspectPending?({ operationId, destination }),
      abortPending?({ operationId, destination })
    }

Do not require every provider to implement unsupported operations. Retain a small core mandatory contract and explicit optional capabilities. Avoid overengineering an entire Universal File API, registry, desktop client or universal engine here.

**Worker-side adapter matters:** A browser-side S3 adapter cannot simply be called inside a Cloudflare Worker. Future S3 destinations need a Worker-compatible implementation, credentials available ONLY through approved trusted execution, proper signing, and independent provider verification.

Potential later execution path:

    Right click → right2cloud-module → Cloudflare Worker remote fetch
                                            |
                                        DestinationWriter
                                            |
                                 +----------+-----------+
                                 |                      |
                         Cloudflare R2          S3-compatible writer
                                                   |
                                        MEGA S4 / Amazon S3 /
                                        other compatible endpoints

**Cloudflare as compute/transport is NOT the same as Cloudflare R2 as storage.** A future save to MEGA S4 should be able to stream from the Worker directly to MEGA's S3 endpoint without first staging everything in the user's R2 bucket unless a strictly justified, explicitly accepted route requires staging.

# 6. Cloudflare R2 writer: complete extracted candidate

Within isolated module, implement:
- Proper typed input/output and capability requirements.
- Worker request/response protocol and version handshake, with no unauthenticated write path.
- Exact bucket/prefix authorization and a trusted Worker-bound bucket reference: do not accept arbitrary bucket strings as permission to access arbitrary bindings.
- Safe filename and key construction; preserve extension and Unicode without traversing folders.
- KEEP BOTH collision policy (or safe explicit blocked state if a truly atomic non-overwriting claim cannot be proven; never silent replace).
- Actual Worker remote fetch, response validation, bounded redirects, no user browser download.
- Body handling with truthful memory, duration and object-size limits; streaming only where supported. Extract V3's known-good path, but isolate unknown-length buffering as a documented hazard for later remediation.
- R2 write through available Worker binding and proper awaited completion.
- Independent R2 readback/HEAD verification and safe receipt mapping. Detect object mismatch and account/bucket/prefix mismatch.
- Typed failures/uncertainty, cancellation, progress events where observable; no simulated success based on HTTP 200 or arbitrary timers.
- Source URL never included in final R2 object metadata as a default; future additional object metadata is explicit and privacy-reviewed.

Expose a host-facing adapter so future V3+1 can pass already-authorized destination and Worker capability, without importing any V3 state.

# 7. Future S3 adapters: design now, don't implement now

We will likely want:

- MEGA S4 (MEGA's S3-compatible object storage, not ordinary MEGA Drive).
- Amazon S3.
- Other S3-compatible services, each with an explicitly verified endpoint/signing region and provider-specific behavior.

**Do not implement these writers or request credentials this run.** Define only the extension point and compliance requirements. Future writer should require:

1. Exact provider/connection/account/bucket/key identity.
2. Trusted endpoint/region selection. NEVER guess AWS signing region or assume MEGA S4 endpoints share AWS behavior.
3. Credential isolation: no browser page tokens, no credentials embedded in public extension or repository, no cross-user access; approved encrypted/secrets binding strategy.
4. SigV4 or provider-compatible authentication and HTTPS transport implemented inside trusted Worker/endpoint. Signatures must cover exact body, content type, checksum/streaming constraints where required.
5. Source bytes streamed/forwarded from Worker to destination endpoint through bounded memory, backpressure, proper content length and multipart when needed. Avoid promising unlimited files given Cloudflare Worker and S3-compatible provider constraints.
6. Provider upload modes: simple PUT, multipart/resumable only as supported/verified, abort/reconcile uncertain writes, correct cleanup semantics.
7. Default KEEP BOTH, preferably conditional writes or collision-safe IDs. Avoid assuming all S3-compatible endpoints support identical conditional semantics.
8. Independent final HEAD/readback/hash where possible. ETag alone is not a universal full-file checksum.
9. Error/uncertainty contract shared with R2 writer but errors categorized for provider-specific differences.
10. Clear authority boundaries, protection against SSRF and arbitrary third-party upload endpoints, bounded egress costs and explicit user permission for new destinations.
11. A capability matrix stating provider-supported or unsupported operations, object-size limits, host/region restrictions and evidence class.
12. No source URL, page URL, referrer, link URL or browsing provenance forwarded as S3 destination headers, object metadata or logs. **The Cloudflare Worker itself necessarily receives source URL to perform TRUE REMOTE fetch; document this plainly.**

Provide a concise worked example showing how future MEGA S4 and Amazon S3 writers would plug into the same interface *without implementing them*. Include expected capability negotiation and error codes. An example or test double is fine, but must not be advertised as a working MEGA/Amazon integration.

# 8. Future Universal File API relationship: interoperable, not secretly coupled

The module MUST be designed to be accepted into V3+1's existing authoritative engine and Universal File API later.

Inspect (READ ONLY):

- Click2Cloud src/core/engine.mjs and save-dispatcher.mjs
- Click2Cloud src/chrome/registrar.mjs
- Click2Cloud src/explorer/file-api.mjs, index.mjs, r2-adapter.mjs, save-provider.mjs
- Click2Cloud extension/background.mjs and src/auth/cloudflare-oauth.mjs

The existing Universal File API currently wraps injected R2 adapter operations. The fact that another S3 adapter exists somewhere DOES NOT make Worker-side TRUE REMOTE to that S3 automatically functional.

Write a clear **integration mapping** (no code changes):

- V3+1 native right-click handler owns event and exact action ID.
- V3+1 canonical menu/destination resolver produces an authenticated immutable destination and file source reference.
- Right2Cloud module performs the Cloudflare Worker remote-fetch/save through the future authorized host bridge.
- An R2 or future S3 DestinationWriter performs provider-specific write/verify.
- V3+1 dispatcher receives typed outcome, then History/feedback; only independently verified success triggers celebrations.
- Universal File API shares destination identity, adapter capability reporting and object verification semantics. Do not create a competing file API or duplicate routing registry.

Separate **integration-ready API** from **integrated product**. This run proves only the former.

# 9. Privacy, trust and data flow — critical

REDOWN original Cloudflare TRUE REMOTE passes sourceUrl to its Worker. That is a fact, not a bug to hide or relabel. The Worker must know which public source to retrieve.

Mandatory clean-room safety rules for extracted candidate:
- The Worker accepts only authorized, validated, bounded HTTPS source retrieval. Redirect every hop through same validation and safe network policy.
- Never forward the user browser's cookies, site tokens, authentication, headers, tab data, or personal browsing metadata to source or destination unless an explicit future reviewed mechanism allows it.
- The Worker must not become an open fetch proxy, arbitrary upload relay, or SSRF tunnel.
- The authenticated user's authorized destination must be bound to the Worker principal. Do not let client-supplied account/bucket/endpoint values override trusted Worker bindings.
- Source URL is only disclosed to the Cloudflare Worker performing remote fetch. Do not automatically persist it in R2 customMetadata or propagate it to MEGA S4/Amazon S3 destination objects or destination logs.
- No raw source URL, credentials, token, secret, signed S3 request, personal file content or unredacted endpoint query in diagnostics/test evidence.
- Verify CORS/Worker/browser requirements truthfully; remote Worker fetch is different from browser CORS behavior. Unsupported protected sources must report BLOCKED, not browser-download fallback.
- Keep authorization capability-scoped, least-privilege and revocable; verify expiration before a write.
- Recognize that a Cloudflare-hosted Worker handling source URLs has different privacy properties from an entirely browser-byte-only save. Document that tradeoff, do not claim zero third-party knowledge.
- No automatic public R2 URL creation, S3 ACL changes, or object sharing.
- If source has query tokens or redirects with credentials, handle as sensitive; scrub evidence and prevent publication.
- External upload endpoints must come from trusted user-approved provider configuration, not raw arbitrary URLs in untrusted messages.

# 10. State and results — small, exact and future-proof

An operation should return a typed, inspectable result with:
- operationId
- state: verified | failed | blocked | uncertain | cancelled
- safe code
- provider kind
- account/bucket/final key scoped identity (redacted only where appropriate)
- byte count / content identity proof when available
- verification evidence class
- whether provider may have committed a write
- optional safe diagnosis/reconciliation instructions

History and UI belong to V3+1, not module.

IF/THEN/ELSE rules:
- IF source invalid → BLOCKED; no Worker fetch or write.
- IF source redirects to unsafe host → BLOCKED; no provider commit.
- IF Worker/auth capability missing → BLOCKED; no write.
- IF target identity or current authorization differs → BLOCKED; never substitute another bucket.
- IF original file cannot be fetched remotely → FAILED/BLOCKED by known cause, never reported saved.
- IF content length unknown → choose bounded supported Worker path; else fail explicitly, do not pretend constant-memory streaming.
- IF target key exists → KEEP BOTH or explicitly return conflict; never silently overwrite.
- IF write request times out after dispatch → UNCERTAIN; never blindly replay.
- IF Worker reports ok but final R2 object not verified → UNCERTAIN/FAILED; never mark verified.
- IF final key, prefix, size or content proof mismatches → not verified.
- IF cancellation happens before dispatch → CANCELLED; if after possible write → UNCERTAIN, with inspect.
- IF verified object exists in exact authorized destination → VERIFIED with receipt.
- IF a future writer is not actually installed → NOT_SUPPORTED/BLOCKED; no R2 fallback or fake MEGA destination.

No arbitrary retries of writes after uncertain network outcomes. Read-only inspection/reconciliation is distinct from replay.

# 11. KEEP / ADAPT / REJECT inheritance audit (mandatory)

Prove that the extracted code contains **no inherited V3 trash**.

For each relevant REDOWN function/dependency, classify:
- KEEP: functionality needed for real Cloudflare remote save.
- ADAPT: required behavior extracted into smaller secure neutral code.
- REJECT: V3 legacy UI/state/menu/provisioning/other-cloud coupling, unsafe assumptions or privacy leak.

Must examine and explicitly mark:
- Original sourceUrl metadata and independent verification coupling.
- V3 saved profiles / hardcoded Worker URLs / token assumptions.
- V3 automatic Worker provisioning, bucket activation and public URL handling.
- Original public-HTTPS-only requirement, SSRF/redirect handling, protected sources.
- 300 MiB default Worker fallback and unknown-length buffering.
- Keep Both vs overwrite on collisions; lack of atomicity.
- Provider completion vs verification, timer-based feedback, History entries.
- Extension-specific globals, menu registration, storage, boot, UI, tabs, downloads.
- Any external dependencies / licensing obligations from extracted code.
- Unverified behavior or source comments that aren't backed by tests.

Include exact source-function/line ranges and candidate destination module location, with evidence. Every imported/copy-pasted line from REDOWN should be identifiable. Aim for minimal, reviewable re-expression where source license and architecture warrant.

# 12. Isolated tests: prove contracts, NOT live deployment

Write focused self-contained tests covering:

A. Source event normalization and allowed URL schemes.
B. Worker request valid + wrong/missing authorization.
C. Unsupported endpoint/redirect/private address denied.
D. Correct R2 binding and exact bucket/prefix identity.
E. Full fake HTTP source body → Worker R2-bound fake write → independent fake HEAD/readback → verified.
F. Worker successfully writes but returns malformed/incomplete receipt → no verified result.
G. HEAD absent/key mismatch/byte count mismatch/content mismatch → no verified result.
H. Duplicate file conflict returns distinct safe key or blocked conflict, never overwrite.
I. Unknown-length body and Worker memory cap scenario.
J. Fetch timeout/HTTP error/body stream error, cancellation and uncertain write.
K. Worker restart / duplicate invocation / operation identity: no hidden replay of ambiguous write.
L. Original source URL not sent as R2 metadata; future S3 writer sample receives only bytes/object control fields.
M. Fake S3 writer demonstrates interface polymorphism but performs no real S3 write and does not import provider-specific code.
N. Module imports work without Chrome globals, V3 UI, or existing V3+1 runtime.
O. All changes limited to new module folder.

Report exact command/results and limitations. Mocks + synthetic Worker env are **local module contract evidence**, not native-Chrome evidence or live-R2 evidence. Do not claim functionality actually reached a cloud object in this run.

# 13. Deliverables before STOP

1. Executable candidate source: actual Cloudflare Worker source-fetch + R2 writing + verification mechanism and safe host coordination.
2. Explicit injected credentials/capability contract, not credentials or provisioning.
3. A tiny DestinationWriter interface with ONLY R2 implemented and documented S3 future path.
4. API_CONTRACT.md with request/result shapes, trust boundaries, example invocation and V3+1 integration sketch.
5. SOURCE_MAP.md pinned REDOWN source links/functions, code paths and side-effect dependencies.
6. KEEP_ADAPT_REJECT.md contamination report listing all inherited/removed risks.
7. S3_ADAPTER_FUTURE.md mapping MEGA S4, Amazon S3 and generic S3 differences without implementing providers.
8. SECURITY_PRIVACY_AND_LIMITS.md: Cloudflare Worker source URL exposure; R2 object metadata protections; exact account binding; endpoint approval; size/Worker limits and remaining risks.
9. Test code/results proving module behavior and identifying what is NOT verified.
10. REVIEW_GATE.md with **owner + ChatGPT inspection checklist** and a clear inventory of all new files/exports.
11. Diff evidence showing **NO modification** to any existing Click2Cloud V3+1 runtime file or REDOWN.
12. A concrete future Codex integration checklist, but NO implementation of that integration.

## Owner review gate — STOP

The last output must explicitly state:

    RIGHT2CLOUD-MODULE EXTRACTED — READY FOR OWNER + CHATGPT AUDIT
    NOT INTEGRATED WITH V3+1
    NOT DEPLOYED
    NO LIVE R2 / S3 TRANSFER CLAIMED
    GOOGLE DRIVE, DROPBOX AND ONEDRIVE OUT OF SCOPE

Owner + ChatGPT will inspect the extracted candidate, source provenance, hidden dependencies, V3 contamination, Worker trust boundary, transport behavior, R2 correctness and S3 adapter readiness.

Only after express approval will a **new, separate** Codex task wire the accepted module into Click2Cloud V3+1's native right-click operation and existing Universal File API. Only a later approved run may implement a real MEGA S4, Amazon S3 or other S3-compatible Worker-side DestinationWriter and test it on a disposable authorized account.

# 14. Short Codex starter prompt

> Work in thanks-cohn/Click2Cloud, branch feat/glaciaring-agent-debug. Read FOREVER_WORKS/right2cloud-module.md as the ONLY controlling extraction mission. Reuse the existing FOREVER_WORKS extraction from main as reference. Extract the **entire necessary working REDOWN V3 Cloudflare TRUE REMOTE right-click → Worker remote fetch → actual R2 upload → independent verification** capability into an isolated executable candidate in FOREVER_WORKS/right2cloud-module/. Do not extract V3 menu/GUI/state, and do not modify the Click2Cloud V3+1 runtime. Separate a tiny Worker-side DestinationWriter port so a future run can add MEGA S4, Amazon S3 and other S3-compatible storage without modifying the right-click/fetch core. Only Cloudflare R2 writer is implemented now. No Drive/Dropbox/OneDrive. No real cloud mutation, deployment or integration. Produce source-pinned KEEP/ADAPT/REJECT audit, focused isolated tests and owner review checklist, then STOP.
