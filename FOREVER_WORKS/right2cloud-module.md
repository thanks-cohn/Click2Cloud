# CODEX EXTRACTION REQUEST — right2cloud-module

**Status:** STAGE 1 ONLY — EXTRACT, ISOLATE, DOCUMENT, TEST LOCALLY, THEN STOP.  
**Date:** 2026-11-06  
**Target:** thanks-cohn/Click2Cloud, branch feat/glaciaring-agent-debug  
**Reference:** thanks-cohn/REDOWN (READ ONLY; current V3 working save behavior)  
**Do not integrate, activate, deploy, or run live cloud writes in this phase.**

## Owner's precise intent

We want the **minimum reusable capability** underlying REDOWN V3's action:

> Right-click a web file → send the actual file to the selected cloud destination → establish real success or failure.

We do **NOT** want REDOWN V3's right-click **menu system**, Simple/Narrow/Depth configuration, UI, Explorer, CURRENT persistence implementation, recovery, history presentation, setup pages, odometer, themes, provider dashboards, or other incidental V3 architecture. These can remain in V3 forever.

We also do **NOT** want you to modify Click2Cloud V3+1's existing working product during extraction. **Create a completely isolated candidate module, with an explicit future integration contract, and stop.** A second Codex run may integrate it ONLY after owner + ChatGPT review of the extracted module.

**This file is the controlling scope for this run.** Earlier broad P0 specs (including docs/CODEX_P0_REAL_NATIVE_RIGHT_CLICK_BYTES_TO_CLOUD_PARITY_2026-11-05.md), legacy rebuild requests, and the broad FOREVER_WORKS reconstruction contract are **source material only**, not additional implementation scope.

## 1. Exact edit boundary

Allowed new files ONLY under:

    FOREVER_WORKS/right2cloud-module/

For example:

    FOREVER_WORKS/right2cloud-module/
      README.md
      EXTRACTED_CALL_GRAPH.md
      KEEP_ADAPT_REJECT.md
      SOURCE_PROVENANCE.md
      API_CONTRACT.md
      SECURITY_AND_PRIVACY_REVIEW.md
      REVIEW_GATE.md
      src/right2cloud-module.mjs
      src/transport-port.mjs
      tests/right2cloud-module.test.mjs
      fixtures/

These are illustrative; minimize files and dependencies. Create only what's needed for clear review. The directory may contain an independently executable pure module and local tests. No changes to existing files anywhere else, including package.json, manifests, app code, service workers, REDOWN, Cloudflare Workers, tests outside that new directory, or any preexisting FOREVER_WORKS files.

Do **not** add the module to existing imports, runtime message handlers, contextMenus listeners, build scripts, API registries, npm test scripts, application GUIs, provider adapters, or deploy configurations. Do **not** change Click2Cloud behavior yet.

If an isolated test must be run, use its own self-contained Node command (e.g. node --test FOREVER_WORKS/right2cloud-module/tests/right2cloud-module.test.mjs), requiring no existing build changes and no external service.

No cloud resource mutation, provisioning, Worker deployment, OAuth consent, login, billing, live upload or download. Do not create a public or localhost privileged endpoint. Do not copy credentials or hardcode private resource identifiers.

## 2. Reuse the V3 extraction already completed

First inspect these **existing** sources, as read-only reference:

- FOREVER_WORKS/README.md
- FOREVER_WORKS/REDOWN_CURRENT_V3_SOURCE_EXTRACTION_2026-11-05.md, **especially §§5–6**
- FOREVER_WORKS/CODEX_REBUILD_FROM_REDOWN_CURRENT_V3_EXTRACTION_2026-11-05.md, but **ONLY** the right-click save/transport/receipt aspects.

These documents already traced REDOWN and pinned a reference commit. **Do not repeat the full V3 extraction.** Check only the essential actual source call graph to validate the extraction's claims and discover hidden dependencies.

REDOWN reference starting points:

- extension/background.js: chrome.contextMenus.onClicked → saveResolvedRightClick → ingestCloudflareAtPrefix → verifyCloudflareReceipt
- Selected-source extraction and source validation
- Exact destination + session authorization checks
- Cloudflare Worker protocol, transfer request, response and R2 verification semantics
- Minimal error/uncertainty, collision and success handling

Read the Worker implementation where needed to understand actual transfer behavior, including which values cross the trust boundary. Do not copy its unrelated internals.

Read-only Click2Cloud compatibility anchors:

- extension/background.mjs
- src/chrome/registrar.mjs
- src/core/engine.mjs, action-resolver.mjs, save-dispatcher.mjs, source-capture.mjs
- src/explorer/save-provider.mjs, r2-adapter.mjs
- src/auth/cloudflare-oauth.mjs

These are **read-only**; use them only to define the future adapter's interface. No runtime wiring during this run.

## 3. Programmatically extract the mechanism, not the V3 implementation

Create a compact source-grounded call/dependency graph. For each **essential** stage:

1. Native user click is observed (but *do not implement a native menu listener in this isolated module*).
2. The caller passes a selected source reference and immutable exact destination identity.
3. Session/auth/current-provider capability is validated by host-provided dependencies.
4. The transport adapter acquires the intended content and performs a real authenticated cloud write in a future integrated host.
5. The adapter returns an object identity, byte count and unverified provider receipt.
6. A **separate verification step** confirms the actual object.
7. A typed terminal result is returned; the host can record success/history only if verification passes.

Trace the real REDOWN V3 success path and its failure branches. For each dependency categorize:

- **KEEP:** small, proven, neutral behavior necessary for any right-click cloud save.
- **ADAPT:** necessary behavior but intertwined with V3-specific state, privacy assumptions, old APIs, or error handling; extract the concept without wholesale copying.
- **REJECT:** unrelated or unsafe V3 coupling; must never be imported into V3+1.

The extraction must include source file and function, pinned SHA/line region, actual input, output, side effects, event/Worker boundary, success condition, failure condition and why it is needed. Distinguish directly inspected logic from unverified claims. Follow dynamic call edges manually when static tools cannot infer them.

Write an IF / THEN / ELSE table for the minimum remote-save process, including auth revoked, unsupported source, stale/wrong destination, Worker not ready, upload failed, uncertain write, remote object missing, mismatched size/hash, duplicate destination, cancellation and stale result.

Do not reconstruct old V3 menus, configuration or persistence to make the demonstration work.

## 4. Build a module as an isolated, unconnected candidate

The deliverable is an importable, independently testable JavaScript module named:

    right2cloud-module

with implementation in:

    FOREVER_WORKS/right2cloud-module/src/right2cloud-module.mjs

Preferred interface (adapt where demonstrably necessary):

    createRight2CloudModule({authorize, transport, verifier, now?})
      .save({source, destination, operationId, signal?})
      → {state, code, operationId, destination, finalKey?, byteCount?, verification?}

The module must not own Chrome menu registration, OAuth login, user interface, persistent engine state, History, provider tokens or cloud deployment. It receives **capability-scoped host dependencies**. It is therefore integration-ready later without being active now.

Mandatory behavior:

- Exact immutable destination (provider/account/connection/bucket/prefix); do not infer from label, last-used provider or default fallback.
- No false successes; success requires independent remote verification. HTTP 200 or a Worker claim alone is insufficient.
- Clear terminal codes/states: verified, blocked, failed, uncertain, cancelled.
- Authorization both before dispatch and when appropriate before commit; detect current-session changes.
- Explicit uncertain-commit semantics; never automatically replay a possible completed write.
- One invocation has one logical operation ID; no duplicate execution by hidden retries.
- Safe error codes, no raw tokens, private URLs or browsing provenance in logs/receipts.
- Conflict policy defaults KEEP BOTH; don't overwrite an object silently.
- Bounded/local-only tests with *injected fake adapters*; no real network access in Stage 1.
- No implementation of a second parallel domain engine. This is a **candidate operation primitive**, to be integrated through existing V3+1 engine/dispatcher only after audit.

## 5. Privacy and transfer strategies: isolate, don't accidentally inherit

REDOWN V3 Cloudflare TRUE REMOTE sends a selected **source URL to the Cloudflare Worker**, which fetches it. The existing FOREVER_WORKS documents accurately describe this, and REDOWN's historical R2 verification may depend on stored sourceUrl metadata.

Click2Cloud has separately articulated a **browser-fetched byte transport** where remote provider APIs receive only the file bytes + minimal metadata, no source URL or page provenance.

**These are different architectures. Do not silently choose or merge them.** In Stage 1:

- Model source-acquisition / transfer strategy as an explicit **port/capability**, not an implicit REDOWN URL-ingest default.
- Keep provider-specific strategies and their privacy properties explicit and documented.
- If inspecting REDOWN's TRUE REMOTE HTTP request, describe exactly what source data it transmits; do NOT replicate sourceUrl metadata automatically.
- Prefer a safe default that **does not hand original URLs to providers** without a future explicit, owner-reviewed strategy/permission.
- Do not rename a browser-byte upload “Worker-side TRUE REMOTE”; do not claim source-URL Worker fetch preserves source secrecy.
- Do not implement cloud ingress, provision Workers or deploy anything in this extraction phase.
- Flag all design decisions the owner must resolve **before** integration; do not block pure extraction on them.

## 6. Proactively detect V3 “trash” before we accept it

Create KEEP_ADAPT_REJECT.md with an **inheritance contamination audit**. Reject or quarantine:

- V3 Simple/Narrow/Depth or context-menu configuration logic.
- V3 global state/storage migration, old defaults, path/label fallback behavior and UI.
- V3 OAuth credentials, extension IDs, provider tokens and profile assumptions.
- URL source/page/referrer/metadata leakage, including the Worker sourceUrl and object customMetadata behavior.
- Old public-HTTPS-only source assumptions where not intrinsic to the chosen, future transport.
- Hardcoded magic size limits, all-in-memory buffering, unbounded retries and unknown-length memory risks.
- Early success counters, sounds, overlays, fake success on a timer or response, and unverified History entries.
- Background tabs, download-to-disk fallback and unnecessary popups.
- Automatic bucket creation/provisioning or billing-changing setup.
- Silent default-destination fallback, wrong-account writes, stale authorization, insecure redirect fetches, SSRF, or unchecked signed URLs.
- Double event registration, duplicate save dispatch, broad unnecessary permissions, untrusted message senders and public debug mutation APIs.
- Blind retry of ambiguous writes and overwrite-on-conflict.
- Any dependency that imports a V3 UI module or global state implicitly.

For each suspected contamination, show whether observed **in REDOWN source**, **in a copied candidate**, **in Click2Cloud already**, or **only a potential risk**. Do not accuse a source without evidence. Record precise rejection/remediation.

## 7. Focused tests without integration

Self-contained tests must cover:

1. Correct exact source/destination forwarded to injected transport with one operation ID.
2. Authorization denied → no transport call.
3. Transport unavailable → blocked, not verified.
4. Provider “ok” without independent verifier → not verified.
5. Verifier success with matching destination/size/content proof → verified.
6. Wrong account/bucket/prefix returned → reject.
7. Size/content/identity mismatch → not verified.
8. Transport timeout after possible commit → uncertain, **no** automatic retry.
9. Cancellation before write vs during potentially committed write → distinguish safe cancellation from uncertainty.
10. Duplicate desired key → KEEP BOTH contract, no silent overwrite.
11. No source-page/browsing-provenance forwarded to provider in the byte-only strategy.
12. No Chrome globals, menu registration, product storage mutations, Worker deployment or new runtime imports.

Tests using fake transports are **module contract tests only**. They are not real installed Chrome acceptance nor a verified R2 save. Do not claim otherwise.

## 8. Mandatory STOP + owner/ChatGPT review gate

When done, STOP. Do not ask another Codex step to integrate automatically.

Produce:

- A file list of **only new files** under FOREVER_WORKS/right2cloud-module/.
- The extracted minimal V3 call graph with source citations and pinned source commit.
- Runnable isolated module source and focused test command/results.
- KEEP/ADAPT/REJECT table and inheritance contamination analysis.
- API contract for a future Click2Cloud V3+1 integration (without edits to V3+1).
- A concrete list of unresolved choices, especially Cloudflare TRUE REMOTE vs browser-byte privacy and availability of genuine authenticated Worker transport.
- A clear review checklist for **the owner and ChatGPT**: every line copied/adapted from V3, every dependency, every source-data egress, every credential/capability assumption, every failure/uncertain path, every actual cloud write boundary.
- Evidence that all existing Click2Cloud runtime files, REDOWN, manifests, package.json, CI and deployed resources are **unchanged**.
- A hard label: **EXTRACTION READY FOR AUDIT; NOT INTEGRATED; NOT LIVE-VERIFIED.**

**Do NOT integrate the module into Click2Cloud until the owner and ChatGPT explicitly approve it after review.** A separate future Codex run will handle any wiring, live cloud tests, packaging and production readiness.

## 9. Starter prompt for the extraction run

> Read FOREVER_WORKS/right2cloud-module.md as the single controlling request. Extract the minimal underlying REDOWN V3 right-click-to-cloud-save behavior into a fully isolated, locally testable right2cloud-module under FOREVER_WORKS/right2cloud-module/. Reuse the already-completed FOREVER_WORKS source extraction. Leave the entire current Click2Cloud V3+1 runtime untouched. Do not integrate, deploy, alter menus, or perform live provider writes. Produce an exact source-backed KEEP/ADAPT/REJECT audit and STOP for owner + ChatGPT review. Integration is a separate future Codex run.
