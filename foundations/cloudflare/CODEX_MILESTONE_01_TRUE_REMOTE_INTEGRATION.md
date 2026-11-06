# CODEX IMPLEMENTATION REQUEST — MILESTONE 01
## Make Cloudflare R2 TRUE REMOTE work in Click2Cloud V3+1, without boxing us into a future rewrite

**Owner priority:** This run must make Cloudflare R2 genuinely usable for right-click saves. Do not build MEGA S4, Amazon S3, or a speculative universal S3 framework in this run.

**Repository:** thanks-cohn/Click2Cloud
**Controlling foundation documents:**
- [First-use and returning-user logic diagrams](README.md)
- [Cloudflare experience principles](EXPERIENCE_PRINCIPLES.md)

**Imported functional candidate:** right2cloud-module/ and its source trace, review gate, security limitations, verification tests and future S3 destination-writer contract.

**Work mode:** Implement on a fresh integration branch created from current Click2Cloud main. Preserve REDOWN read-only. Produce a reviewable PR, actual runnable code, evidence and a concise operator/test instruction sheet. This document is an execution request, not proof of completion.

---

# 0. The objective, in plain English

The user installs Click2Cloud and sees these native context-menu provider options in this initial order, all flat and actionable:

1. Google Drive — honest placeholder, not yet a working save provider.
2. Dropbox — honest placeholder, not yet a working save provider.
3. OneDrive — honest placeholder, not yet a working save provider.
4. Cloudflare R2 — the provider that **must work in this run**.

These are sibling entries inside Chrome's automatically managed extension grouping, without a second redundant REDOWN-created parent. The initial list must not be confused with the current exclusive Cloudflare-only special "Flat" display mode.

If the user clicks Cloudflare R2 for the first time, the app invokes its **existing Shelf Cloudflare OAuth** flow; if their authorized account has not activated R2, it offers the official R2 dashboard activation link; once authorized, the app creates/reuses a lowercase "redown" bucket **as a one-time initial default** and prepares the necessary trusted TRUE REMOTE Worker. Subsequent right-clicks save immediately into the **exact destination the user currently has configured**, not necessarily redown.

The actual byte path is:

~~~text
Existing Chrome native menu + V3+1 canonical menu/action resolver
    -> trusted source/destination/authorization validation
    -> remote transfer selection BEFORE browser byte capture
    -> imported right2cloud-module remote save coordinator
    -> authenticated Worker, remote public HTTPS source fetch
    -> trusted destination writer for the user's selected R2 bucket/prefix
    -> conditional R2 write + independent R2 readback/HEAD
    -> verified result shared with native menu, Shelf, History and API
~~~

Cloudflare's upload is **TRUE REMOTE ONLY**. Never fetch and re-upload file bytes in the browser as a fallback.

**The real design goal:** Once Cloudflare is working, adding a subsequent provider is *add a connection/provider implementation and destination writer, plus provider-specific tests and menu registration* — not redo the Chrome menu engine, API owner, source-fetch pipeline, or saved destination model. MEGA S4 will test this next; do not prebuild MEGA today.

---

# 1. Respect the foundation, not literal boxes as a new engine

Read BOTH Mermaid diagrams and the principles file before changing code. These are examples of user-intent-driven behavior, not instructions to create a separate controller for every possible condition.

Rules:
- Convention over configuration: initialize only what a new user genuinely lacks.
- Progressive disclosure: only ask the user for a necessary permission/action.
- Saved user configuration takes precedence over inferred defaults.
- Once initialized, ordinary right-click should be boring: authorize/check as needed, save and verify.
- No repeated R2 signup links for accounts that are already active.
- No silent recreation of deleted/disconnected redown buckets.
- No unexpected switch to another bucket if the selected destination is gone.
- No automatic replay of a clicked source after OAuth, billing activation or an ambiguous upload outcome.
- Cloudflare Worker is a transport; R2 is the destination here. The first-run redown bucket is **not** required as an intermediary for future clouds.

The implementation should **reduce operational complexity** by reusing existing owners, not add another menu engine, second configuration database, duplicate auth wizard, second Universal File API or parallel uploader.

---

# 2. Inspect source reality before making edits

Audit the following actual files and produce a short source-based integration map (file, function, current behavior, intended insertion point, affected tests):

**Click2Cloud existing owners:**
- src/core/menu-spec.mjs — one canonical menu compiler and mode composition.
- src/core/composite-menu.mjs — compatibility wrapper; do not establish separate authority.
- src/core/menu-identity.mjs and src/core/action-resolver.mjs — canonical exact targets and menu-action identities.
- src/chrome/registrar.mjs — the only native Chrome contextMenus registrar and ACK/dispatch owner.
- src/core/engine.mjs — source authorization, canonical save and current byte-capture dispatch.
- src/core/source-capture.mjs and src/core/save-dispatcher.mjs — existing browser-byte route; Cloudflare must bypass capture.
- src/api/service.mjs and its typed declarations/permissions — versioned API used by GUI and programmatic callers.
- src/api/config.mjs and persistence/current-store — saved product state, modes, migration and explicit default target.
- src/auth/cloudflare-oauth.mjs — existing Shelf OAuth owner.
- src/explorer/file-api.mjs and existing R2 adapter — Universal File API/Explorer; keep its source of authority.
- extension/background.mjs — current connection and native event wiring, presently not a functional authorized Worker mutation transport.
- extension/app.mjs, manifest.json and supporting UI — existing Click2Cloud design.
- tests and package scripts — current evidence, fixture tests, release blockers.

**Imported right2cloud module:**
- right2cloud-module/src/index.mjs — createRemoteSaver and host ports.
- right2cloud-module/src/cloudflare-worker.mjs — createWorker and Worker trusted ports.
- right2cloud-module/src/cloudflare-r2-writer.mjs — native R2 writer, conditional creation and verification.
- right2cloud-module/src/source-fetch.mjs — allowed host and redirect protections.
- right2cloud-module/src/verification.mjs, common.mjs — intent and receipt validation.
- right2cloud-module/API_CONTRACT.md, SOURCE_TRACE.md, KEEP_ADAPT_REJECT.md, SECURITY_PRIVACY_LIMITS.md, REVIEW_GATE.md, FUTURE_S3_ADAPTER_CONTRACT.md.

Known source mismatches requiring **explicit adapters**, not silent breaking normalization:
- V3+1 menu targets use provider "cloudflare" while the imported module expects "cloudflare-r2".
- V3+1 prefix conventions can have trailing "/" while the remote module expects a canonical normalized prefix.
- V3+1 currently invokes captureSelectedBytes before current dispatch; Cloudflare needs its remote branch earlier.
- extension/background.mjs currently sets workerReady:false and refuses actual writes with AUTHORIZED_WORKER_TRANSPORT_UNAVAILABLE. Remove those blockers **only after authenticated Worker readiness is real**.
- Existing isolated module local tests do not certify platform deployment, actual account/bucket binding, real Chrome installation or actual R2 writes.
- A shared verifier must not assume that every future S3-compatible provider provides R2's version fields; **do not weaken R2 verification to solve a future unimplemented problem**.

Document any further discrepancy discovered from reading the repo. Preserve existing behavior unrelated to these seams.

---

# 3. Native right-click configuration and onboarding

Implement the four default sibling provider entries on fresh installations without discarding or changing existing user-defined configurations.

**Menu behavior:**
- All four are visible from first install, including before any cloud login. A disconnected entry must remain selectable as a **setup action**; do not merely register a disabled save item.
- Google Drive, Dropbox and OneDrive are *nonfunctional placeholders* for this milestone. Selecting one shows a minimal explicit "Not available yet" result/UI; it must not trigger fake login, download, counters, history or a claimed successful save.
- Cloudflare R2 is the last initially visible entry. Selecting it starts the next required action: existing Shelf OAuth, R2 activation, approved first-run setup, destination repair, or an actual TRUE REMOTE save.
- The same canonical menu compiler must govern actual Chrome registration and in-app/Explorer menu previews. Actions use stable identifiers and the existing registrar's ACK, generation and authorization checks.
- The native Chrome grouping is browser-controlled; never claim Click2Cloud can reorder other extensions' menus.
- Once a user customizes Simple/Narrow/Depth, Quick Select, native placement, labels or exact default, those user preferences outrank bootstrap ordering. Custom mode paths continue to save to exact targets, not to the bootstrap cloud root.
- The default four-provider bootstrap is **not** the exclusive legacy product.show.flat toggle. Preserve that explicit feature and migration behavior without changing its meaning.
- A provider can be "configured to save" even when the session requires reconnect; preserve selected destination across sign-outs/reconnections.

**No unnecessary extra prompts:** A ready, authorized Cloudflare click is just a save. The R2 activation page appears only when R2 is **positively confirmed inactive**, not on generic API, token, scope or Worker failure.

**Native provider action model:** Separate setup/action dispatch semantics from resolved save actions as the smallest change compatible with the existing MenuSpec/registrar. One native menu owner, one action inspection API, one dispatch surface. Do not pass unauthenticated raw menu labels or URLs as destination authority.

---

# 4. First-time Cloudflare initialization

Implement the foundation diagrams with an idempotent, inspectable coordinator behind the existing V3+1 API, not a separate UI wizard.

The intended first-run process:

1. User clicks the Cloudflare native entry or existing Shelf Log in.
2. If not already authorized, use the **same existing** first-party Cloudflare OAuth action in the Shelf. No substitute token prompt; no new OAuth engine. Verify account identity, session, scopes, revocation and the actual connection selected.
3. Inspect R2 readiness for that authorized Cloudflare account. Distinguish ACTIVE, NOT_ACTIVATED, RECONNECT_REQUIRED, INSUFFICIENT_PERMISSION, ACCOUNT_AMBIGUOUS, NETWORK_UNAVAILABLE and UNKNOWN/unsupported API signals rather than guessing.
4. If R2 is confirmed not activated, take the user to the official R2 dashboard route: https://dash.cloudflare.com/?to=%2F%3Aaccount%2Fr2%2Foverview . Preserve pending setup; offer a single Continue / Check R2 after the user returns. Login to the Cloudflare website and Cloudflare OAuth are distinct. Billing/checkout is wholly user-controlled; never subscribe for them.
5. Once R2 is available, obtain the user-authorized first-run setup grant. For a never-initialized selected account, check exact bucket name "redown"; create it if missing, otherwise reuse it without altering or deleting existing objects. Treat concurrent existence races safely.
6. Provision or reuse the real authorized Worker and required scoped R2 binding/connection for **the selected Cloudflare account/bucket**. Verify any required scope and deployment feasibility. An arbitrary centrally hosted Worker is **not automatically bound to every customer's R2 bucket**. Establish the actual per-account deployment/binding or an explicitly authorized alternate secure R2 API route; never claim a binding that doesn't exist. Avoid broad resource creation or public unauthenticated endpoints.
7. Perform a controlled authorized real write/verification check (use a clearly identified, safely scoped test object) and clean it up only when safe and explicitly permitted. Do not use probe success to justify overwriting user data.
8. Set redown/ as the **initial** destination only if there is no previous explicit selected destination, and persist a migration-safe initialized/explicitly-changed distinction.
9. Mark Cloudflare READY only with evidence for current session, exact destination and Worker transport. Then the **next** user right-click should save without revisiting the onboarding.

When any prerequisite is missing, preserve progress and show the smallest appropriate next action; do not spin on signup checks, incorrectly assume purchase is complete, or fake success.

If the current OAuth registration cannot provide the exact Cloudflare scope for Worker deployment/bindings, expose the specific missing grant or operator setup step. Prefer completing a real authorized path; do not insert permanent unverified test credentials or bypass Cloudflare consent. This run must pursue full real functionality, with precise blockers only if actual external authorization prevents completion.

---

# 5. Returning-user behavior: user's destination is law

The onboarding coordinator must become invisible when the account is ready.

- Read the **stored exact** provider, connection ID, Cloudflare account, bucket and folder prefix selected by the user.
- If session authorization expired, use the same Shelf OAuth to reconnect **without losing the stored destination**.
- If an R2 account is active, don't show the activation link again.
- If the user moved from redown/ to any other authorized bucket/folder, save **there**.
- If redown was removed but a different selected destination remains usable, save there without recreating redown.
- If the **selected** bucket, prefix, connection or Worker access is missing, report Destination Unavailable and offer explicit Reconnect, Repair or Choose Destination. Never silently redirect or recreate the old bucket.
- If the user intentionally removed all destinations after onboarding, ask them to select one. Do not confuse this with never-initialized state or generate redown again.
- If the user voluntarily requests explicit re-initialization, guard it with real permission and ensure it cannot overwrite a user-selected configuration.
- Menus recompile only when canonical configuration/authorization readiness changes, not on each transient decoration/update.

Persist meaningful decisions; avoid “magic if bucket missing then create redown” shortcuts.

---

# 6. Integrate the actual imported TRUE REMOTE code

**Goal: one source fetch, one trusted Worker, destination-specific write and independent proof.**

- Reuse createRemoteSaver, createWorker, cloudflareR2Writer and sourceFetch from right2cloud-module with minimal hardening necessary for trustworthy production operation.
- Introduce a **small transfer-mode selection seam** after trusted menu/action/source/destination resolution and before existing captureSelectedBytes. For Cloudflare: choose worker-remote unconditionally; for future providers the router may choose compatible routes based on approved provider policy and capability. Do not restructure the whole engine to implement theoretical transport combinations today.
- Never send the selected file bytes through a browser download→upload path for Cloudflare; no automatic browser fallback if Worker cannot reach a URL.
- Do not deploy the old REDOWN embedded Worker as a blind string copy. Audit REDOWN's original working flow if helpful; import only the necessary behavior, not its GUI, menus, legacy storage or old state model.
- Implement the **real host ports**: authorize intent and selected account, prepare/revoke scoped Worker capability, authenticatedRequest, recheck authorization after awaits, independently verifyObject and map receipts to existing shared save outcomes.
- Implement the **real Worker ports**: authenticate principal, resolve exact bound destination, atomic durable claimOperation, check revocation, secure remote fetch, authorized writer selection, storage binding and response sanitization. Relying on an in-memory dedupe Map alone is insufficient across Worker instances/restarts.
- For R2 binding access, verify actual target-specific authorization. Do not trust the extension's claimed destination or a client-provided Worker URL as an authority. Authenticate the Worker request; bind account/bucket/prefix via trusted, immutable server-side configuration.
- Source acquisition: public HTTPS only unless securely expanded with proof. Validate URL/redirects, host allowlist, IP/SSRF and DNS rebinding protections via appropriate egress controls, content length, timeout and memory limits. Private or browser-authenticated sources may be unsupported; return a clear result without promising universal source support.
- Ensure file identity is stable, filename and content type are validated, and exact folder keys preserve user intent. Handle connectionId/bucketName/prefix identity conversion explicitly between V3+1 and imported module.
- Define and test transfer budgets for known and unknown lengths and Chrome/Worker restrictions. Don't advertise unsupported “unlimited” sizes; allow larger supported remote streams where the platform/provider combination proves them.
- **Keep Both by default:** use truly conditional no-overwrite creation. Resolve duplicate names without clobbering prior objects; enforce proper concurrency and bounded strategies. A read-then-PUT without atomic conditions is not sufficient.
- Independent R2 verification checks exact destination and immutable operation evidence; an HTTP 2xx or operation timer alone is not success. ETag does not automatically mean content hash. Uncertain writes go to read-only reconciliation, never blind retry.
- Success/history/counter signals only after a final verified outcome. Cancel/timeout/retry must not lie or duplicate uploads.

**Existing Explorer:** it must continue using the existing Universal File API. When an Explorer file is saved to Cloudflare via the canonical menu, route through the permitted TRUE REMOTE source mechanism **if a valid remote-accessible source exists**. If an authenticated cloud source cannot legally be fetched by the remote Worker, report a precise unsupported capability; do not secretly fall back to local/browser byte staging. Do not break Explorer listing/preview and non-save workflows.

---

# 7. Preserve future extensibility — without premature generalization

This is the central architectural constraint of the project.

Today: get **one genuine R2 writer** working through the imported module.

Tomorrow: add **MEGA S4** as the next independently tested destination, using the **same native menu engine, canonical action resolution, remote source-fetch, versioned API and Worker trust boundary**. MEGA will need its own authenticated connection, Worker-side SigV4 signing, endpoint/region/bucket config, supported upload semantics and provider-specific readback. Its bytes should go **Worker → MEGA S4**, not Worker → R2 → MEGA.

Later: once MEGA, Amazon S3 or another real S3-compatible provider demonstrates repeatable common behavior, **extract or expand one generic S3 protocol driver with provider profiles**. Do not attempt to guess today's universal abstraction from hypothetical compatibility. Leave a tested writer port now, not a sprawling cross-provider implementation.

The minimal present seam should reuse the existing right2cloud-module future-writer shape where feasible:

~~~js
// Structural contract only; not permission to install MEGA today.
writer.kind
writer.capabilities
writer.prepare({ destination, filename, operationId, signal })
writer.write({ prepared, body, length, contentType, operationId, signal })
writer.verify({ receipt, signal })
~~~

- Keep a trusted writer factory/registry seam that picks the one current R2 writer from validated capability/identity, not from client-supplied arbitrary endpoints.
- Only R2 is production-enabled now. A fake S3 writer in a test may demonstrate the seam remains extension-friendly, but **do not represent mock compatibility as MEGA or AWS integration**.
- Preserve the ability to vary authentication, endpoint, region, signing, conditional write, multipart implementation, retention, size limits and verification by provider **without rewriting core save behavior**.
- Capability flags must be truthfully determined and validated per provider. Reject unsupported operations explicitly.
- Do not require all providers to expose Cloudflare R2 version identifiers; keep a provider-specific verification proof format behind a shared verified/uncertain contract. The R2-specific proof stays strict in this milestone.
- Keep secrets in trusted browser/Worker-side boundaries appropriate for their risk; arbitrary provider credentials and signed endpoints must never be accepted unvalidated from a web page or menu event.
- Future browser-transfer for eligible non-R2 providers should remain architecturally possible **without altering Cloudflare's permanent remote-only policy**.
- Protect source privacy: destination writers receive byte stream and necessary file metadata, **not** the user's source URL, page URL, frame URL, or browsing provenance.
- **Do not prematurely overhaul the Universal File API** to make this happen. Add the smallest compatible protocol extension and tests.

**Extensibility acceptance test today:** demonstrate (with an isolated injected test writer, not a functional MEGA backend) that a writer can consume the Worker-provided stream and provide verification **without changing** menu compiler, native registrar, source-fetch module or API action identity. Document the exact files/additions a future MEGA implementer will need. If the seam requires touching every subsystem, simplify it before merging.

---

# 8. Every meaningful GUI interaction has equivalent programmatic API behavior

This is a **hard architectural requirement**: the application GUI is a client of domain/API operations, not the location of business rules. Avoid parallel GUI-only authorization, onboarding or save state.

Extend the existing typed/versioned V3+1 API in src/api/service.mjs and its declaration/permission layer, preserving compatible existing calls. Name operations according to actual current conventions; below is the required capability, not mandatory method-name spelling:

| GUI/native action | Shared underlying operation and inspectable result |
| --- | --- |
| View initial or configured native menu | Inspect canonical preview, registrations, generation/ACK, action bindings |
| Click Cloudflare entry before login | Invoke provider action; get required-login state; begin SAME Shelf OAuth flow |
| Shelf Cloudflare Log in | Existing OAuth begin/status/cancel with exact account |
| Finish/return from OAuth | Observe verified connection and scoped principal |
| Check R2 | Read-only R2 readiness inspection with differentiated error |
| Open R2 activation | Expose official URL and pending state; human follows link |
| Continue/Check again | Recheck R2 readiness, no duplicate checkout or re-login |
| Approve initial setup | Guarded, idempotent create-or-reuse bucket and Worker preparation |
| View ready state | Inspect exact bucket, authorized binding, capability and freshness |
| Choose folder / Make Default | Existing canonical config transaction + revision/ACK |
| Change Simple/Narrow/Depth/Quick/placement | Existing typed config transaction, same native recompile |
| Click ready Cloudflare entry | Canonical authorized TRUE REMOTE save, stable operation identity |
| View History / save result | Inspect operation status, receipt, verification class, uncertainty |
| Reconnect / repair / choose another | Permission-gated exact corrective operation; no silent changes |
| Click placeholder provider | Typed NOT_IMPLEMENTED / UNSUPPORTED outcome; no fake success |

- Define stable request/response schemas, typed states, validation, versioning strategy, permission scopes, correct account binding, idempotency keys and revision/generation fencing.
- API operations that modify remote infrastructure require explicit relevant grants and durable user intent. OAuth itself is human-interactive; an API can begin/inspect it but cannot fake consent.
- Menus and GUI call the same domain operations. Native click may be an event bridge; do not require physical clicking for tests or agents.
- Expose read-only diagnosis/status so Codex can test routes, readiness, menu projection and receipts programmatically without simulating UI events.
- UI and programmatic callers must agree on outcomes for cancelled OAuth, unactivated R2, missing bucket, unavailable Worker, invalid source, duplicate operation, uncertain upload and verified success.
- A real Chrome menu click still needs a distinct installed-Chrome acceptance test; API-level tests are not a substitute for native rendering.
- Keep API permissions restrictive and scope output to the authorized account. Never leak raw tokens or signed capabilities in debug traces, data exports or result receipts.
- Audit **every newly added visible GUI control** and expose a corresponding API operation; document mapping and gaps in the handoff.

---

# 9. Test real behavior — not just test doubles

Acceptance requires each level of evidence be labeled **MOCK, INTEGRATION, REAL_CHROME, LIVE_WORKER, LIVE_R2** as appropriate. Never promote simulated data or “HTTP accepted” to a live successful transfer.

**A. Deterministic unit and integration tests**
- First-install default has exactly four sibling entries in required order; disconnected Cloudflare remains actionable; other three cannot save.
- Existing Simple/Narrow/Depth/Quick Select/default/placement and stable IDs preserved through upgrades, reconnect, restore and refresh.
- Canonical action resolves the same exact destination from Chrome, Shelf and API.
- Worker-remote selection happens before any browser file-body capture for Cloudflare (instrument capture and assert **zero Cloudflare browser fetch/upload calls**).
- First-time setup versus already-initialized versus explicitly removed destination; no automatic redown recreation after a user deletes it.
- Successful R2 authorization does not imply purchased R2, and Worker readiness cannot be faked.
- Multi-account scoped permission, OAuth cancellation/expiry, R2 unactivated versus unauthorized/network failure, setup race and idempotency.
- R2 write collision, concurrent Keep Both, timeout/cancellation after dispatch, lost response, no automatic uncertain retry, revocation between stages.
- Source URL redirects, private IP/SSRF/egress refusal, invalid filename, unsafe bucket/prefix/path traversal, oversized and unknown-length bodies, Worker resource budget.
- Verified only with independently matched R2 readback; no success/history/counter on failed, missing or uncertain upload.
- A mock destination writer tests the **future extension seam only**; it must not imply MEGA S4 or generic S3 works.

**B. Chrome extension / Shelf**
- Extension builds/loads as a real MV3 extension.
- Chrome right-click displays the correct four items **without double nesting** in supported contexts.
- Click on unconnected Cloudflare uses current Shelf login.
- Click on connected ready Cloudflare dispatches to exact configured destination with no extra dialog.
- Existing Explorer remains usable, menus and context previews match native projection, and no regression in keyboard/focus or config persistence.
- Native ACK, service-worker restart and authenticated state renewal work without multiplying menu rows.
- Placeholder cloud clicks show correct availability without uploading.

**C. Live authorized Cloudflare and transfer**
- Real OAuth consent on a real user-authorized Cloudflare account, inspect granted scopes/account.
- If necessary, real R2 activation via user-controlled dashboard and successful readiness recheck.
- Actual first-run create/reuse redown for that account without overwriting user objects.
- Actual authenticated Worker prepared/deployed against the correct account/bucket; valid binding/credentials.
- Right-click **real public HTTPS image and real link** → Worker fetches bytes → R2 object appears at selected path.
- Independently HEAD/readback object size/identity; verify no misleading success prior to proof.
- Change default to another authorized bucket/folder, save again there; no forced redown routing.
- Remove or disconnect selected target and verify truthful repair outcome; no automatic recreation.
- Verify unauthorized private endpoints and redirects never fetch; prove no source URL/browsing provenance in destination object metadata.
- Repeat authorized save after closing/reopening Chrome and appropriate Worker restart.

**D. Evidence and operator handoff**
- Run actual repo test/build scripts plus focused new tests; report pass/fail counts, exact commands, source hashes/commits and screenshots or machine-readable outcomes.
- Record which steps were truly live versus isolated. Save redacted receipts and exact R2 key/bucket/account fingerprint (no tokens or secret URLs).
- Provide the smallest real configuration steps needed for installed Chrome + OAuth identity + approved Worker deployment; don't claim full auto-onboarding if Cloudflare permissions/deployment prohibit it.
- Identify limits: allowed public source domains, byte limits, R2 account/Worker security constraints, resource costs, outstanding bugs.
- Provide a brief **MEGA NEXT RUN HANDOFF**: exact writer registration seam, needed MEGA credential/config and SigV4 implementation, verification and tests; no MEGA code required now.

---

# 10. Completion gates

| Gate | Required outcome |
| --- | --- |
| G1 — Architecture | Existing V3+1 menu/registrar/API owners preserved; no new parallel engine |
| G2 — Default UX | Initial four flat provider entries, correct order and placeholders honest |
| G3 — Auth/onboarding | Same Shelf OAuth, R2 activation if genuinely needed, safe approved redown initialization |
| G4 — User configuration | Existing user-chosen destinations always override redown; no silent recreation |
| G5 — Remote-only route | Cloudflare dispatch cannot call browser byte-capture/upload, no fallback |
| G6 — Real Worker | Authenticated scoped Worker, real R2 binding, durable operation claim, remote fetch |
| G7 — Verified R2 | Actual write + independent readback, no unverified success, stable retry semantics |
| G8 — API parity | New GUI actions have typed permission-gated API counterparts and observable receipts |
| G9 — Extensibility | Minimal destination writer seam demonstrated with a structural double; no MEGA implementation |
| G10 — Live acceptance | Installed Chrome + user-authorized Cloudflare end-to-end evidence, or honestly identified external blocker |

**Delivery expectation:** Complete the implementation of Cloudflare R2 TRUE REMOTE, rather than merely draft it. Test everything you can. If real Cloudflare deployment, OAuth setup, external permissions or installed Chrome policy prevents an actual live test, report the specific blocker and the verified lower tier; do **not** manufacture a passing result or quietly revert to browser fetch. Provide a ready-to-run operator checklist for the remaining authorized live step.

# 11. Guardrails against overengineering

- **Cloudflare first. MEGA next. Generic S3 after proving actual commonalities.**
- Implement one small future-friendly writer seam; no new giant provider framework.
- Don't replace the V3+1 compiler, registrar, Explorer, API, Shelf design or persistent state owner.
- Don't rewrite REDOWN, import its legacy GUI or open unrelated feature work.
- Don't retrofit abstract capability flags that add no value without corresponding tests.
- Don't alter an explicitly chosen user destination while provisioning redown.
- Don't install placeholder upload implementations for Google Drive, Dropbox or OneDrive.
- Don't state that R2/MEGA/AWS or full automation works until their relevant live tests are independently verified.
- Keep visible user feedback intuitive, minimal, accurate and consistent with the existing Click2Cloud GUI.
- Leave the repo in a buildable and testable state with changes ready for review.

**Foundational decision:** We want *future clouds to be appended*, not an architectural refactor every time. The way to do that today is to make the first real provider work through properly isolated, narrowly scoped owners — and then let MEGA S4 prove the seam on the next run.

---

# 12. Codex final response format

Provide, in order:

1. **What now genuinely works**: Cloudflare connected, R2 activated, Worker prepared, native save, actual readback — each supported by the evidence tier achieved.
2. **What changed**: file paths and why; link to implementation branch/PR and commits.
3. **Verification receipts**: tests/builds with exact counts; real Chrome and Cloudflare evidence where available.
4. **Remaining blockers and supported manual steps**: especially OAuth consent, per-account Worker deployment/binding and real user-authorized cloud environment.
5. **GUI ⇄ programmatic API equivalence table** for every modified/new control.
6. **MEGA S4 next-run insertion points**: the small files/ports/config to add, with no menu or remote-fetch rewrite necessary.
7. **Regression proof**: Simple/Narrow/Depth, Quick Select, saved defaults, existing Explorer and user intent preservation.

**Final user promise being implemented: Right-click. Save. Infrastructure stays out of the way.**
