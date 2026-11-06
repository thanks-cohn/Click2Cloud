# Milestone 01 implementation and operator handoff

Branch: `feat/cloudflare-true-remote-m01`, based on current main `b2a6979`.
This implements the foundation's remote-only route, not a claim of a completed
installed-Chrome/live-R2 acceptance session. REDOWN is unchanged at `a6c17f8`.

## Source integration map

| Existing owner | Change / insertion point | Focused evidence |
|---|---|---|
| `src/core/menu-spec.mjs` | Fresh composite projection has Google Drive, Dropbox, OneDrive, Cloudflare R2 as four actionable siblings. Existing explicit Flat, Simple/Narrow/Depth, Quick and placement projections remain authoritative. | canonical/final tests; new bootstrap test |
| `src/core/action-resolver.mjs` | Validates stable provider-action IDs without pretending a disconnected entry is authorized to write. Existing exact save intents retain their IDs. | registrar + integration tests |
| `src/chrome/registrar.mjs` | Still the sole registrar/ACK/event owner. Routes a legitimate setup action without demanding an already connected session; expired Cloudflare sessions offer the same auth owner. | registrar tests; browser boot fixture |
| `src/core/engine.mjs` | Cloudflare selects remote transport **before** capture. Missing remote transport is blocked, never a browser fallback. Numeric diagnostic IDs are explicitly adapted to opaque UUID remote-operation IDs. | actual engine → imported saver → workerd → R2 test, zero browser capture calls |
| `src/core/source-capture.mjs`, `save-dispatcher.mjs` | Unchanged browser route for eligible non-Cloudflare providers. Cloudflare Explorer sources lacking an authorized public remote source are explicitly unsupported before `stat`/`readStream`. | browser-route regressions use an explicitly synthetic non-R2 provider; Explorer no-staging test |
| `src/api/service.mjs`, declarations, permissions | Additive V3+1.1 methods, closed inputs, account binding, explicit provisioning scope and exact confirmation; source-bearing provider invocations resolve a canonical ACKed action. | onboarding/API tests |
| `src/api/config.mjs`, CURRENT | Migration-safe customization/onboarding markers; bounded redacted operation results in the existing CURRENT store. Worker secrets stay outside CURRENT/backups in trusted Chrome storage. | persistence/migration and browser-IDB tests |
| `src/auth/cloudflare-oauth.mjs` | Unchanged first-party OAuth implementation and registered scopes. No environment token is inserted into an extension OAuth session. | existing OAuth tests; live consent remains untested |
| `src/explorer/*` | Existing Universal File API and listing/preview owners retained. No new Explorer or generic S3 driver. | Explorer browser regression checks |
| `extension/background.mjs`, `app.mjs` | Connect the owners; add compact setup/status and result views. GUI actions use the shared API. | actual background boot + GUI fixtures in Chromium |
| `right2cloud-module/src/*` | Imported source remains unchanged; explicit provider/prefix/operation-ID adapters live under `src/cloudflare/`. | original 49 tests; imported source has no Git diff |

## Added trusted ports

`wire.mjs` translates `cloudflare` and trailing-slash prefixes to the imported
`cloudflare-r2` contract and signs bounded, short-lived capabilities. `transport.mjs`
uses the imported `createRemoteSaver` once per operation, authenticates one POST,
never retries a write, independently verifies the exact R2 receipt and rechecks
current authority. Production also revalidates the real OAuth account/bucket and
required R2 scopes across authorization boundaries; cached UI readiness does not
authorize a write.

`deployment.mjs` prepares one randomly named, authenticated per-account/bucket
Worker using the current user's OAuth grants. It stores the signing secret only
in trusted extension storage and Cloudflare secret bindings. It records a source
digest and checks that digest during readiness. An interrupted planned deployment
is reconciled read-only before any further authorized attempt. It cannot silently
overwrite an arbitrary existing Worker or recreate a returning user's bucket.

`worker.mjs` resolves only its immutable account/bucket/prefix binding, verifies
HMAC capabilities and session revocation, and atomically claims opaque operation
IDs in a SQLite-backed Durable Object. The edge rejects unsigned/invalid capabilities before invoking the Durable Object. Claims survive runtime restart and remain
after ambiguous outcomes. A separate authenticated read-only operation endpoint
can recover an available stored receipt and independently HEAD it; this does not
automatically replay a transfer or increment completion effects.

Operation results expose measured engine-dispatch preparation, cached/fresh readiness, authorization, capability, Worker request and
independent-verification timings. Setup results and setup history include measured Worker preparation/reuse time. Worker receipts distinguish source headers,
source preparation, destination preparation, and **stream-and-write** duration;
known-length source consumption overlaps the R2 write and is not mislabeled as
separate pure download time. Local-runtime timings are not live performance claims.

The R2 writer still uses `If-None-Match: *`. Sequential collisions select a suffix;
a concurrent race can truthfully return `CONFLICT`, never overwrite. ETag/version/
size/operation metadata verification is **storage evidence, not a source SHA-256**.
Destination metadata contains only opaque operation identity and a validated MIME
type. Source URLs, cookies, page/referrer information and signed capabilities are
not object metadata or operation-history fields. Platform logging policies are a
separate operator responsibility; Worker observability is disabled by deployment.

## Limits and source policy

- Only `raw.githubusercontent.com` and `upload.wikimedia.org` are enabled source
  hosts. These are controlled public hosts, not permission to fetch arbitrary
  websites. Every redirect is revalidated by the imported source policy.
- HTTPS only; no IP literals, credentials, local names, custom ports or HTML.
  Browser-authenticated sources and private Explorer files without a permitted
  remote source are unsupported. There is no local-file Cloudflare fallback.
- Known-length bodies stream with Cloudflare `FixedLengthStream`, up to 64 MiB.
  Unknown/decompressed bodies buffer up to 8 MiB, with approximately twice that
  payload memory plus overhead. Transfers have a 60-second Worker deadline;
  host transport has a 65-second deadline and grants expire after two minutes.
- URL validation alone does **not** prove DNS-rebinding protection. Production
  expansion of the host policy requires a reviewed egress/platform guarantee;
  there is no wildcard source permission, universal-size or universal-site claim.
- Claims/revocations are retained for safety and consume Durable Object storage.
  No claim is automatically deleted just because a response timed out.
- Disconnect sends revocation to prepared configured buckets and blocks new local
  saves during revocation. If the network prevents revocation delivery, an already
  issued capability can remain valid until its two-minute expiry. External OAuth
  revocation during an in-flight write may leave committed bytes; the host's final
  live authorization check reports uncertainty rather than success.
- A small, explicitly approved readiness object is retained under
  `.click2cloud-readiness/<uuid>/` in the exact selected destination. It is labeled
  as setup evidence and is not a replay of the source originally right-clicked.

## GUI ⇄ programmatic API

All operations below retain version `3+1.1`. Existing configuration operations,
revision fences and authenticated local gateway remain compatible.

| Visible action | API / result |
|---|---|
| Shelf Log in, Cancel sign-in, Disconnect | Existing `loginBegin`, `loginStatus`, `loginCancel`, `disconnect`; same OAuth owner |
| First native provider click / in-app provider preview | Canonical provider action; `invokeProviderAction` for setup, or `dispatchSave` with ACKed item/generation for a source |
| Google Drive / Dropbox / OneDrive placeholder | `invokeProviderAction` → `PROVIDER_NOT_IMPLEMENTED`; no save/history success |
| Supported sources and limits disclosure | `inspectCloudflare().sourcePolicy` and `.limits`; presentation-only expansion |
| Cloudflare setup / status | `inspectCloudflare`; exact pending/requested target and current readiness |
| Authorized-account selector | `selectCloudflareAccount`; no guessed multi-account default |
| Destination-to-check selector | Parameter to `checkCloudflareR2({accountId,target})`; no saved-default change |
| Continue / Check R2, foreground recheck | `checkCloudflareR2`; distinguishes inactive, permission, reconnect, network and unknown |
| Activate R2 on Cloudflare | `openCloudflareActivation`; only positively inactive R2; user owns billing/terms |
| Approve initial setup | `approveCloudflareSetup({accountId,expectedRevision,idempotencyKey})`; explicit provisioning grant/confirmation |
| Repair selected destination | `repairCloudflareDestination` with an optional **already configured** exact target; never changes another default or recreates a missing selected bucket |
| Make Default / Simple / Narrow / Depth / Quick / placement | Existing preview/commit configuration API, unchanged canonical IDs and mode owners |
| Ready native save / API save | Existing `dispatchSave`; Cloudflare remote branch, verified result only |
| Explorer save / local-file picker | Existing API; explicit unsupported remote-source result, no hidden Cloudflare browser upload |
| Save results / Inspect receipt | `inspectRemoteHistory`, `inspectRemoteReceipt`; receipt inspection can perform read-only reconciliation |

Provisioning requires a separately granted method with scope `provision` and exact
host approval. Non-GUI OAuth requires a trusted host-issued `interactiveAuth` grant
plus one exact approved operation; consent remains human-interactive. Configuration
and history inspection require the existing full-configuration/account permissions.
No external listener, public agent endpoint or client-issued grant was added.

## Toolchain and evidence

Node 24.22.1 was used for this session. Development tests now require Node 22+
(Miniflare 4), matching the existing CI Node major. Dependencies are locked and
`npm ci --ignore-scripts` is supported. CI runs the maintained explicit focused
allowlist, the imported 49 tests and the extension build; it does not execute the
owner-prohibited retired scenario atlas. Historical `npm test` is left unchanged
and is not reported as passing. No historical assertions or fixture files were
deleted to manufacture a green result.

## Evidence and blockers

Evidence files are under `docs/evidence/cloudflare-m01/` and distinguish fixtures,
real local workerd, actual deployment and blocked live acceptance.

- Baseline: 111 focused tests and the imported module's 49 tests passed.
- The current focused runner includes the new integration/onboarding tests.
  `INTEGRATION`: real workerd, SQLite Durable Object restart, R2 conditional writes,
  exact bytes in local R2, independent HEAD, replay refusal, revocation, MIME/privacy,
  and the full canonical engine-to-remote path. These are not real-account R2 writes.
- `REAL_CHROME` application fixtures: quiet OAuth wiring, Windows-style Explorer,
  20-level Narrow draft/commit, config/API parity, IndexedDB persistence, actual
  background-module boot and the new onboarding controls pass with simulated
  provider/Chrome transports. The unpacked extension itself is administrator-blocked
  (`UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR`). Native pixels/click/restart and
  real OAuth consent have not passed.
- `LIVE_CLOUDFLARE_DEPLOYMENT`: one isolated Worker,
  `click2cloud-r2-4bb6187ab91f42b081f9`, was accepted with the existing `redown` R2
  binding and `RemoteClaims` Durable Object. Only the approved
  `__click2cloud_true_remote_test__/` prefix is authorized by that test deployment.
  Existing REDOWN Workers, source files and objects were not changed.
- Worker invocation currently fails at the environment proxy (`CONNECT 403`) for
  `click2cloud-r2-4bb6187ab91f42b081f9.officialmahasbiz.workers.dev`. Therefore actual
  Worker source fetch, LIVE_R2 write/readback and cleanup have **not** passed.
  Deployment acceptance is not application READY.
- GitHub Git access works, but `api.github.com` requests are also proxy-denied.
  A review branch can be pushed; PR creation requires that network prerequisite.
  The exact Worker hostname, GitHub API host and existing OAuth host (`dash.cloudflare.com`) were saved to the environment draft, preserving
  other settings. The OAuth host is also required for future real consent testing. Saving a draft did not apply or publish it.

## Operator continuation

1. Review/save the pending network additions in environment settings and publish
   through the product when ready; the agent does not publish environments.
2. In an administrator-approved Chrome environment, build with
   `npm run build:extension`, then load `dist/click2cloud` unpacked. The existing
   extension identity/redirect stays
   `ajppphdiamdobknpamcheohmdbdbeoal` /
   `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/cloudflare`.
3. Use the Shelf's real Cloudflare OAuth. Verify actual account and scopes. If the
   registered OAuth grant cannot deploy Worker scripts, secret/R2 bindings or DO
   migrations, report that permission specifically; do not substitute the dev token.
4. Select the exact account, Check R2, and use the official activation link only
   if the authenticated API confirms activation is missing. Explicitly approve
   one-time infrastructure setup and its readiness object. READY requires the
   actual write/verification probe, not merely a deployed Worker.
5. For the already approved isolated test resource, run:
   `node scripts/cloudflare-live.mjs --approved-test-deploy --resume-owned-test-worker`.
   The helper validates that the previously recorded test Worker belongs to this
   account/bucket/prefix, updates only that Worker, generates a fresh private
   signing key and never prints it. Node cloud execution needs its inherited proxy
   (`NODE_USE_ENV_PROXY=1`) and configured `NODE_EXTRA_CA_CERTS`; never disable TLS.
6. The helper tests a real public PNG and link, independently verifies receipts,
   and deletes **only exact independently verified new test keys**, then checks
   absence. If anything is uncertain, inspect read-only before any deliberate new
   operation. Never use a new idempotency key as an automatic uncertain-write retry.
7. Installed acceptance: native four-item order, disconnected click/login, explicit
   account and setup, fresh ready click, then select another exact folder/default
   and save there. Remove/disconnect the selected destination: verify a repair
   response without redown recreation. Restart Chrome/Worker and repeat. Verify
   placeholder clicks never upload, and R2 metadata has no browsing provenance.

## MEGA NEXT RUN HANDOFF — no implementation in this run

Add a provider-specific trusted connection/capability adapter and a writer factory
next to `src/cloudflare/writer-registry.mjs`. The tested structural writer port is
`kind`, `capabilities`, `prepare`, `write`, `verify`; it receives only the remote
stream and necessary file metadata. Test doubles consume a stream without any
R2-version assumption. Production currently enables only R2.

Add the future provider's endpoint/region/SigV4/conditional-create and independent
verification logic there, with real provider-specific tests. Add its trusted host
saver to the engine's small `remoteSavers` port and explicitly adapt that provider's
intent validation/capability configuration; do not weaken R2 receipt verification.
Menu compilation, native registration, source acquisition and existing API action
identities do not need replacement. The future provider must write directly to
its destination, not via R2. Browser transport for eligible non-R2 providers remains
separate; Cloudflare's remote-only rule cannot be overridden by that port.

## Final validation receipts

The maintained focused suite passed **129/129** tests; the unchanged imported
module passed **49/49**. Extension build, **7** Chromium fixture gates, strict
TypeScript declaration checking and changed-module syntax checks passed.
See [machine-readable validation](../../docs/evidence/cloudflare-m01/verification.json),
[local Worker runtime](../../docs/evidence/cloudflare-m01/local-runtime.json),
[Cloudflare control plane](../../docs/evidence/cloudflare-m01/control-plane.json),
and [blocked live transfer](../../docs/evidence/cloudflare-m01/live-results.json).
