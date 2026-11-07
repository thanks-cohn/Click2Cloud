# Issue #4 — V1 implementation handoff

Implementation is on `dev/issue-4-v1-auto-redown`, from latest main `93410b4b3715dac40afa3f4682aeac998803b3d9`. Version **0.3.5**, unchanged extension ID. **Local implementation checks pass; the issue's genuine installed Windows Chrome + live R2 acceptance remains BLOCKED / NOT TESTED. Do not close the issue as live-verified.** No merge, push, deployment, production permission change or live cloud mutation was performed. REDOWN stayed clean and unchanged at `a6c17f8d0be22131d5cc38b060da4f8f3544800f`.

Controlling contract: https://github.com/thanks-cohn/Click2Cloud/issues/4 (read completely, including V1 deletion override; no comments were present). AGENTS.md now records that precedence so old permanent-deletion and modal-setup rules cannot silently win later.

Commits: `5be8e89` implements V1 setup/ordinary registration; `437fa21` completes pre-mutation agent account fencing and the Default badge. The evidence-only commit containing this report pins runtime revision `437fa2180e397c7053eb0884e732dd1f3509e4d3`.

Final recorded results: **209 focused tests PASS**, **15 browser fixture gates PASS / 0 FAIL**, extension build PASS, strict TypeScript declaration check PASS, workings drift/baseline gate PASS. Genuine unpacked Shelf: **BLOCKED**. Exact logs and JSON receipts are in this directory.

## Concrete production changes

- `src/cloudflare/onboarding.mjs`: explicit login/initialization reads both default and all saved assignments, verifies selected account, and preserves existing choices. A default-only target is linked locally to one ordinary Simple row. With no default or saved assignment, exact `redown` root is reused or created under existing setup approval, then registered via shared createDestination/makeDefault semantics after verified probe. Old initialized/removed markers do not permanently suppress the next explicit login. Passive boot, status, alarms and refresh do not create resources.
- `src/api/config.mjs` and `service.mjs`: moved the existing configuration-change function into its existing config owner; manual and automatic entries share IDs, validation and mutation semantics. There is no second registry or menu engine. Registration/default share one CURRENT transaction. User labels, hidden flags, order, modes and chosen defaults are preserved.
- Existing private setup ledger stores account-specific billable approval, in-progress pointer, dispatched operation and completion. It is not transferable configuration, OAuth authority or a new persistence owner. OAuth alone cannot authorize provisioning. Same-owner single flight and account-level Web Locks serialize initialization. Lost create responses are rediscovered read-only; a dispatched probe is inspected with its original operation ID. Concurrent configuration edits stop setup rather than overwrite intent. A new explicit key cannot bypass an unfinished same-target operation.
- `src/api/service.mjs`: added only `initializeCloudflare` (provision scope) because login-driven/resumed initialization is neither a passive status check nor a fresh approval. Existing loginBegin calls it through the same domain owner. Agents need separate provision authority and verified account bindings before any mutation; approveCloudflareSetup/repair retain their existing confirmation gate. Setup cannot claim complete when native ACK failed or its assigned target is disabled.
- `extension/background.mjs`: same OAuth owner and existing callback path initialize after a recovered OAuth callback; normal login uses the same API without duplicate provisioning. Saved exact targets get bounded read-only readiness checks before menu compilation, fixing the disabled-leaf cache gap. No new engine or handler was added; the 0.3.4 Shelf sender/response security repair is preserved.
- `extension/app.mjs`: removed the setup modal, Current Default Location selector and required Continue / Check R2 step. Already-approved login prepares automatically without setup UI. If billable consent is genuinely missing, the necessary action appears inline; it is never inferred from OAuth. Status/repair are optional inline diagnostics. The ordinary manager row displays `redown`, `Cloudflare R2 · redown/`, and Default badge, with the same edit/hide/default/config-delete controls as other rows. No cloud delete is attached to configuration removal.

No provider driver, server, gateway, polling engine, generic S3/MEGA implementation or production dependency was added. Other provider adapters remain honestly unavailable. The existing V3+1 compiler/registrar/resolver, conditional remote transfer and provider-receipt verification remain canonical.

## Before / after source and screenshots

The permanent November 7 baseline digest remains unchanged. `11.2026/workings/right-click-workings.json:issue4Before` reconstructs the pre-change behavior from immutable main Git objects and records actual source hashes/defects; CURRENT tracks the implementation and the same-change-set drift test. It has 66 behavior entries, 76 runtime source hashes and 54 typed API operations. `oneToOneVerified` remains false, since exhaustive/live proof is unavailable.

| Before on 0.3.4 | After on 0.3.5 |
|---|---|
| Default set without a manager entry | One ordinary Simple root entry and the same target as default |
| Login ends before automatic setup | Approved explicit login initializes, verifies, then reconciles native ACK |
| Last-entry deletion suppresses future initialization forever | Empty configuration can initialize again at next explicit login |
| Modal setup, destination selector and manual check gate | No normal setup modal; only necessary missing approval appears inline |
| Empty readiness cache can disable a verified destination | Read-only saved-target readiness feeds the actual native compiler |

Screenshots are **actual Chromium with local API/provider fixtures, not live cloud or installed-extension proof**:

- [Before modal on 0.3.4](before-modal-0.3.4-fixture.png): retained from the earlier source-pinned Shelf evidence; its runtime source matches pre-change main. This is historical evidence, not a newly executed baseline run.
- [After: ready inline, no setup dialog](browser/v1-ready-inline-fixture.png).
- [After: ordinary redown row with Default badge](browser/v1-ordinary-redown-default-fixture.png).

## Validation / evidence classes

The focused suite includes the compact Issue #4 decision table plus existing OAuth, security, storage, menu, transfer and Explorer regressions. It covers active-existing/absent bucket, custom assignments/defaults, default-only migration, delete-last/relogin reuse, surviving destinations, wrong account/missing scope/denied approval, repeated/concurrent initialization, lost create reply, worker restart, probe completion loss, concurrent user edits, native ACK failure and pre-mutation agent account scoping. Old tests asserting permanent empty-state suppression were updated to the explicit V1 contract; security guards were retained.

The browser runner executes the actual app, API, IndexedDB, compiler, registrar, dispatch/save completion and History GO TO with fake provider responses. It asserts an enabled exact-target leaf, ordinary manager controls/default badge, zero setup JS dialogs, config-only delete, and next-login reuse without another approval popup. This is meaningful integration evidence and is **not a real Chrome context-menu gesture or live R2 write**.

Read-only Cloudflare discovery (`read-only-cloudflare.json`) returned HTTP200/success and confirmed `redown` exists. Identity was the configured environment API token, **not extension OAuth**. No bucket/object/Worker was created, changed or deleted. This establishes read access/existence only.

The genuine unpacked test (`real-shelf-receipt.json`) records source revision, build digest, exact describeCapabilities request, null response and BLOCKED. Managed Chromium enforces `ExtensionInstallBlocklist: ["*"]` and returned `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR`. No policy bypass was attempted. An isolated genuine Shelf could not be loaded; no owner OAuth consent or Windows browser was available. No live setup/deployment/write was authorized in this run, so independent R2 save/readback/History GO TO remains NOT TESTED.

## Remaining acceptance work

1. In an administrator-authorized Windows Chrome installation, load this same-key 0.3.5 build and run `npm run test:shelf:extension`. The test uses a disposable profile and never clears the normal user's profile. Capture genuine Shelf/engine receipt.
2. With the owner's real extension OAuth session and separately approved setup authority, exercise existing/absent redown, an existing custom default, last-entry deletion/relogin, and the fresh native right-click. Independently inspect the actual R2 object/version/size and History GO TO. Deployments or live test writes need separate authorization.
3. If Cloudflare returns policy/scope/network failures, report those safe provider diagnostics. Do not broaden OAuth registration or replace saved destinations to make a test green. Ambiguous dispatched writes remain inspection-first; they are not blindly replayed.

No known failing local test remains in the recorded final checks. Genuine installed/native/live acceptance is unresolved; fixture success does not satisfy that gate. Existing provider transfer limits and unsupported adapters are unchanged.
