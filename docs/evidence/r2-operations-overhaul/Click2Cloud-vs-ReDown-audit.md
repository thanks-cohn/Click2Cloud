# Click2Cloud versus full ReDown

This assessment used committed source and existing evidence. During the
audit no repository files, refs, settings, running services or cloud
resources changed.

- **Click2Cloud** `thanks-cohn/Click2Cloud`,
  `codex/p0-r2-operations-narrow-speed-matrix-2026-11-18`,
  `6c401f59667e6a5cf3cac3d90562e85e53e30f6c`. GitHub and the local checkout
  agreed. The pre-overhaul tag still peeled to `c337e41`.
- **ReDown** the full Cloudflare-capable `thanks-cohn/REDOWN`, whose remote
  default ref and `main` both matched checked-out commit
  `c78babc314acc5891203e95b169f027756e956c1`. The older
  `95-percent-plus-success` tag peels to `653ad9b5`. The main comparison uses
  the current source, including its post-tag recorder work.

| Area | Click2Cloud | ReDown |
| --- | --- | --- |
| Worker authority and provisioning | `src/cloudflare/deployment.mjs` and `onboarding.mjs` inspect and migrate an owned Worker in place after explicit bucket-scope approval. Bucket-wide binding plus short-lived, signed operation, destination and session grants. Retained plans and readiness probes cover reuse. | `extension/background.js` implements a bucket Worker and stored profile bearer. `preparedProfile` and `workerAcceptsProfile` check its capabilities. V3 ordinary ingest opts out of implicit provisioning, while the legacy flow has a provision/repair fallback. |
| OAuth and recovery | `src/auth/cloudflare-oauth.mjs` fences exact account paths and session changes. It refreshes credentials and only retries safe HTTP reads automatically after refresh. Shelf routes confirmed authentication loss to Remotes. | `extension/cloudflare-api.js` shares refresh locking across extension contexts, rejects a changed session, and honors short Retry-After on transient reads. The rejected-auth refresh branch can retry the original request, including a write. |
| Root and nested CRUD | `src/cloudflare/inventory.mjs` verifies the exact new bucket. `files.mjs` conditionally creates a folder marker and checks readback, copy output and source identity. Explorer mutations do not depend on Chrome native ACK. | `extension/background.js` provides bucket creation and Worker prefix creation, including a stricter create-only workflow. Rename uses verified move, and delete checks batched acknowledgments. |
| Copy and move | `file-transport.mjs` routes same-account cross-bucket operations to a dual-bound Worker. `files.mjs` streams between bindings, verifies destination versions and sizes before deleting, and uses durable claims. Distinct-account copies are unsupported. Pair Workers consume deployment capacity. | `transferExplorerObjects` uses independently selected authorized source and destination profiles and supports a route spanning distinct accounts. It batches transfers, checks each copy receipt and asks the source Worker to compare source and destination identities before deletion. It provides richer per-item partial results and readable collision suffixes. |
| Right-click modes | `src/modes/simple`, `nested` and `depth` support independent projections in the same menu. Narrow retains visible curated ancestors, with independently actionable root/intermediate destinations. Depth discovers descendants to the requested limit. The resolver binds exact routing to CURRENT and native generation. | `extension/right-click-v3.js` selects Simple, curated Narrow or Nested Level, with a More destinations chooser for overflow/incomplete projections. Prepared and active profiles constrain resolution. Level discovery has explicit budgets and a freshness window. |
| Receipts and resilience | `worker.mjs` and `transport.mjs` preserve durable operation claims, independent R2 HEAD, bounded leases and read-only reconciliation of uncertain PUTs. Verification checks key, size, version/ETag and operation identity/provenance. Destination and authorization rechecks can stop a successful transfer from being misreported after session loss. | `saveResolvedRightClick` and `verifyCloudflareReceipt` independently HEAD the expected object and check key, size, ETag and matching source metadata. A verified save can be reported as History pending. The inspected path gates a new save on reconciling past receipts. |
| Diagnostics and UX evidence | Actual local workerd tests cover receipts and transfers. Actively failing operations remain visible in Minimal. Aesthetic selection remains separate from CURRENT and dispatch. | `docs/P0_CRASH_CAPLESS_REPORT_2026-11-12.md` records 950 simulated native saves with independent fixture HEAD and coalesced diagnostic health writes, plus 100,000 synthetic browser recorder events. The opt-in flight archive provides richer lifetime observation after consent. |

Both products still rely on R2's non-atomic check-and-delete behavior for
moves. This matters when independent clients modify the same source.
Click2Cloud rejects cross-account transfers; ReDown's source supports
independently profiled endpoints, while physical success for that case
was not exercised in this audit. Click2Cloud's pair design avoids passing
a source bearer between Workers but creates more resources as bucket pair
usage grows.

## Performance evidence

Click2Cloud's controlled workerd test compared two revisions using the
same mock HTTPS source and OAuth delay. For a 1 MiB object with a 260 ms
source delay, transport-entry-to-verified p50 changed from 1081/1109/1089 ms
to 408/418/395 ms in Simple/Narrow/Depth. The after p95 and p99 were
596/463/423 ms. Immediate-source medians varied by mode and were not
uniform improvements. The compound Worker request/polling stage explains
most of the delayed-case savings. Local test results and per-stage timings
are in `docs/evidence/r2-operations-overhaul/save-benchmark.json`.

The inspected ReDown path uses profile capability inspection, a synchronous
ingest request and an independent HEAD. The 950-attempt recorder result
establishes local fixture correctness for its workload. It does not yield
a comparable live latency distribution. Earlier owner estimates and
Click2Cloud's historical recorder timings describe different workloads.
The audit found no controlled installed-Chrome plus live R2 comparison and
does not rank the two products by live speed.

## Prioritized recommendations

1. Run a paired test on authorized disposable Cloudflare resources in
   installed Chrome. Cover old Worker migration, root and folder CRUD,
   cross-bucket transfer, Native ACK failures and all three save modes.
   Record delivered-click, dispatch, provider and verified times with
   matching sources, profiles, object sizes and networks.
2. Measure pair Worker count and setup cost on a realistic set of buckets.
   Evaluate reducing that cost before considering distinct-account support.
   Preserve narrow session and operation authority in any future design.
3. Improve Click2Cloud's partial-transfer reporting per object and examine
   ReDown's bounded transient-read retry and More-destinations patterns.
   Examine Click2Cloud's durable operation claims and receipt identity as
   potential hardening for ReDown. Keep each change separate from this audit.

Source snapshots:
[Click2Cloud](https://github.com/thanks-cohn/Click2Cloud/tree/6c401f59667e6a5cf3cac3d90562e85e53e30f6c)
and [ReDown](https://github.com/thanks-cohn/REDOWN/tree/c78babc314acc5891203e95b169f027756e956c1).
