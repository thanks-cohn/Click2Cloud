# P0 — Click2Cloud V3+1: Cloudflare end-to-end delivery and REDOWN parity

## Target and acceptance
- Implement in `thanks-cohn/Click2Cloud`; inspect latest `main` first.
- Treat `thanks-cohn/REDOWN` `main` as a **read-only functional reference**, not code to transplant uncritically.
- Deliver working Click2Cloud Cloudflare login, automatic authorized `redown` R2 preparation, Worker provisioning, native right-click save, verified R2 object, Explorer and History.
- Preserve one canonical V3+1 API and GUI-to-API parity. Avoid competing engines, setup wizards, duplicate destinations, or unsupported success claims.
- Distinguish source review/local tests from actual Windows Chrome and Cloudflare verification.

## Confirmed Windows error
Click2Cloud 0.3.6 observed **HTTP 403** from `PUT /accounts/{account_id}/workers/scripts/{script_name}` while creating a Worker, surfaced as `WORKER_PERMISSION_DENIED`. No numeric Cloudflare error code was returned in the available diagnostic. This establishes denial of Worker upload, not the exact missing authorization. The `redown` bucket was separately observed to exist.

## OAuth client — owner-selected nine REQUIRED permissions
The Click2Cloud Cloudflare OAuth client editor shows:

| Label | Scope |
| --- | --- |
| Workers Admin | `workers-scripts.admin` |
| Workers Content Read-Only | `workers-scripts.content_read` |
| Workers Editor | `workers-scripts.edit` |
| Workers R2 Storage Bucket Item Read | `workers-r2-bucket-item.read` |
| Workers R2 Storage Bucket Item Write | `workers-r2-bucket-item.write` |
| Workers R2 Storage Read | `workers-r2.read` |
| Workers R2 Storage Write | `workers-r2.write` |
| Workers Routes Read | `workers-routes.read` |
| Workers Routes Write | `workers-routes.write` |

These replace earlier seven-scope drafts. Confirm registration was saved and actual grants were issued. Update the **existing** Click2Cloud OAuth request and validation to recognize the Admin creation permission; preserve client ID, extension ID, callback, saved auth/session and destinations. Determine whether `offline_access` is registered before requesting it; preserve supported refresh. Do not assume requested scopes equal issued authority or bypass provider errors. Routes access does not authorize unrelated routing features.

## REDOWN comparison
Review REDOWN `extension/cloudflare-auth.js`, `cloudflare-api.js`, `background.js`, especially bucket initialization, Workers.dev subdomain discovery, Worker upload/enable, verification, context menus, transfer and History. REDOWN has legacy `workers-scripts.read/write` and a different client; match observable behaviors and capability, not literal OAuth strings. Keep REDOWN unchanged. Produce a traceable REDOWN/Click2Cloud behavior matrix for login, provisioning, menu, transfers, recovery, Explorer/History with SOURCE / LOCAL / LIVE / BLOCKED evidence classes.

## Required implementation
1. On explicit login verify account/authorization, preserve existing defaults and destinations, and require one-time approval for resource preparation if not already granted.
2. Reuse/create lowercase `redown` bucket only when needed; verify, never blindly retry uncertain creation.
3. Inspect account Workers.dev subdomain before upload, preserve account-wide settings, and display precise corrective actions when unavailable.
4. Reuse saved Worker identity, private signing, R2 and Durable Object bindings, code digest and operation ledger. Distinguish create/update/inspect and ensure actual creation-capable authorization. Deploy once; resume only a missing step after interruption. No duplicate Workers.
5. Make safe API diagnostics capture method, endpoint template, HTTP status, numeric Cloudflare codes when present and scope evidence, without secret leakage.
6. Verify deployed Worker operation, binding, actual R2 proof and native Chrome menu acknowledgment before reporting READY.
7. Preserve the expected flat provider rows; Cloudflare nesting only when configured destinations require it. `redown/` must be an ordinary editable/removable Simple destination. Preserve Simple/Narrow/Depth and apply native menu state from one authority.
8. TRUE REMOTE Worker fetches eligible HTTPS data to R2. Respect network restrictions, idempotency, correct object key, integrity verification and privacy. Never show success for a click, pending request, or uncertain write.
9. Explorer, History, verified receipt and GO TO must identify the same actual object. Non-implemented providers cannot report successful saves.
10. Keep every meaningful GUI action backed by corresponding stable V3+1 API methods with equivalent inputs, authorization, validation, state, errors, side effects, idempotency and results. GUI = API = persisted state = external effect wherever verifiable.

## Non-negotiable tests
Test requested versus issued scopes, OAuth reconsent, refresh, Worker create versus edit authority, subdomain preflight, Worker deployment/enable and binding, interrupted recovery, destination/menu ACK, GUI-to-API parity, real save receipt/readback, Explorer and History. Build the extension and run genuine browser tests wherever supported. An earlier managed Chromium environment blocked unpacked installation; this does **not** prove the owner's Windows installation is broken.

**Live acceptance:** existing extension installed/reloaded without clearing data -> new grant authorized -> existing bucket/Worker reused or deployed -> Worker verified -> right-click eligible file -> independently verified R2 object -> matching Explorer and History -> repeated save without setup loop. Mark LIVE-VERIFIED only when actually observed. If the coding environment lacks Windows Chrome or owner OAuth, provide one short reproducible Windows acceptance procedure and do not claim an unobserved pass.

## Deliverables
Working implementation committed on an appropriate branch, traceable REDOWN parity matrix, API behavior evidence, test commands and results, source files changed, remaining blockers, exact owner reconsent/reload steps. Do not modify REDOWN or silently deploy to production.

**NO BLOAT. ONE CANONICAL V3+1 API. REDOWN FUNCTIONAL PARITY OR BETTER. REAL VERIFICATION.**
