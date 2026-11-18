# CLICK AND DONE

## Comparison

Primary reference is full REDOWN's annotated `95-percent-plus-success` tag at
`653ad9b5fdd59532df571514fc60053d8a7b13bb`. The baseline Click2Cloud branch
started at `2a3799c2`, with the same runtime as `e188dc7`. REDOWN Basic was
excluded. The later full REDOWN `4b59b58` changes delayed diagnostic writes and
adds an opt-in durable flight archive. Those changes are separate from the
tag's save path.

| Boundary | Tagged full REDOWN | Click2Cloud baseline and change |
| --- | --- | --- |
| Route and setup | `resolveActiveRightClick` restores the durable V3 model and resolves the currently saved exact profile. `preparedProfile` reuses an account/bucket Worker after a read-only check. V3 requests disallow provisioning from the ordinary click. | Manager Save persisted CURRENT and applied Chrome rows, then inspected some added targets. It never called exact destination setup, and Depth scopes were absent from the added-target completion check. Keep CURRENT and the canonical mode compiler. Run the existing scoped setup owner during Save, then gate completion on preparation, discovery and ACK. |
| Warm transfer | `ingestCloudflareAtPrefix` sends one synchronous ingest request after the profile check, with another capability check for exact-path edge cases. `verifyCloudflareReceipt` issues an independent HEAD and checks key, size, ETag, source metadata and OAuth session. | Click2Cloud accepts into an asynchronous durable Worker job, polls, and independently verifies the final receipt. It also performed management API reads while constructing grants and while rechecking or polling. Keep durable claims, exact destination binding, leases, conditional R2 writes, immutable provenance and independent HEAD. Remove duplicate route authorization and management calls that do not add a transfer boundary. |
| Restart and isolation | REDOWN reuses saved V3 data. Its click path still repeats some storage reads and can block a new save when prior History needs reconciliation. The tag's reload incident records an apparent disappearance and timeouts without proving a Chrome crash. | Reproject retained CURRENT, plan and Depth inventory and get fresh Chrome callbacks. Keep the established-state loss fence. Pending History and optional observers no longer precede remote dispatch. A failed terminal History write leaves a partial result carrying the verified remote receipt. |
| Recovery | V3 refuses to silently provision a missing Worker during the ordinary click. | Reuse the existing exact-target ledger and read-only reconciliation of uncertain writes. A native click that repairs a known missing plan uses only retained approval and reports that a fresh gesture is needed. A known scope mismatch requires explicit scope resolution. |

These mechanisms explain the difference in request count and exposure to
serial round trips. Comparable live samples are unavailable. Source-host
latency, object size, polling cadence, radio/network conditions, browser wakeup
and Cloudflare processing can affect the reported difference. The REDOWN
subsecond-to-two-second recollection and the tag name supply no measured
distribution. The separate Click2Cloud `a3a67275` checkpoint documents
107/107 traceable objects and 141 successful saves, with a Depth conflict and
a blocked operation. The later Guti `e188dc7` exports report 161 verified
attempts among 178, including 37 additional recorded verified attempts. The
Guti verified subset was reported at 4.25 s median, 12.11 s p95 and 23.93 s
slowest. These are profile- and recorder-specific observations.

## Local evidence

- The workerd journey in `tests/depth-plan-recovery.test.mjs` uses the
  production provisioner, signed Worker transport, claims and actual workerd
  R2 bindings. Cloudflare management and source responses are fixtures. It
  verifies first Save and exact first click in all three modes, including
  Depth root, parent and nested leaf, one deployment and one probe per newly
  configured bucket, an incomplete Chrome ACK and same-key retry, mode
  switching, reconstructed host, session loss and return, and an isolated
  History failure after a verified write. Existing tests cover uncertain
  probe and upload replay and scoped authorization.
- The focused Chromium browser runner exercises the actual Destinations
  Manager and browser IndexedDB. Simple, Narrow and Depth each reported
  ready, returned an exact-route result, and left the expected fixture object.
  The three paths reused one fixture Worker for the selected bucket. The older
  broad product browser runner stops at its auth-only login assertion on
  both this branch and the pinned baseline. Both runs observed the existing
  explicit Login initialization creating its fixture bucket and Worker.
- The transport benchmark controls management, Worker and poll timing across
  12 attempts in each of six mode/lifecycle cells per revision. Cold here
  means a new transport instance. The baseline makes 4–6 live-authority
  calls for these poll counts and the update makes 2. No timing here includes
  Chrome delivery, background startup or real Cloudflare, and the benchmark
  uses synthetic proof payloads. No failures or stalls occurred in the
  timed sample. The separate workerd regression suite exercises interrupted
  and rejected operations.

| Mode | Fixture | Dispatch median ms before → after | Verified median / p95 / max ms before → after |
| --- | --- | --- | --- |
| Simple | Cold | 93 → 47 | 376 / 488 / 488 → 238 / 290 / 290 |
| Simple | Warm | 92 → 47 | 373 / 472 / 472 → 236 / 287 / 287 |
| Narrow | Cold | 92 → 47 | 373 / 473 / 473 → 239 / 291 / 291 |
| Narrow | Warm | 91 → 47 | 373 / 472 / 472 → 237 / 288 / 288 |
| Depth | Cold | 92 → 47 | 376 / 474 / 474 → 238 / 287 / 287 |
| Depth | Warm | 93 → 49 | 378 / 477 / 477 → 241 / 293 / 293 |

Reproduce from the repository root:

```bash
npm ci
npm test
npm run build:extension
node scripts/test-click-and-done-browser.mjs
node codex/11.18.2026/benchmark-click-and-done.mjs
```

The recorded distribution, including dispatch p95 and maximum, is in
[click-and-done-transport-benchmark.json](click-and-done-transport-benchmark.json).

## Installed Chrome and live Cloudflare — blocked

The repository's disposable-profile installed-Shelf runner reached Chromium
and returned `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR`. This machine
could not exercise native menu rendering or a physical click. No live
Cloudflare account or Worker mutation was used. Worker modules and their
deployed protocol are compatible with the existing build and were left out
of this change. The build's Worker digest matched the pinned baseline
(`Nyd2B_8P0CiVwmx9-r1H1k2vcwtywH0MeTMmNL1bCrM`). Existing prefix-limited plans deliberately block a
destination outside their scope. For example, a Depth root needs a
root-authorized plan and cannot borrow a narrower plan. The existing native
generation fence also means a genuine Chrome registration failure prevents
claiming complete menu application.

### Owner verification on an authorized browser and account

1. Build this branch and reload its existing unpacked extension in an
   authorized test Chrome profile. Preserve the Guti profile and historical
   exports as a separate labeled baseline. Use a disposable, explicitly
   authorized R2 bucket per mode for first-setup measurements.
2. Log in normally. In Destinations Manager configure a Simple folder, a
   Narrow nested folder, and a Depth bucket with at least a root, parent and
   leaf. For each mode press **Save** and wait for **Ready for right-click**.
   Capture native entries and immediately save the same controlled public
   HTTPS asset to each intended level. Verify exact account, bucket, key,
   size, ETag and version independently in R2 and match the History receipt.
   Record any need for a separate Worker action as a failure of the journey.
3. Repeat warm saves and repeat after closing Shelf, suspending the extension
   worker, restarting Chrome, switching modes and signing out and back in.
   Verify that signed-out clicks write nothing and that returning sessions use
   existing ready Workers. Reconcile an intentionally interrupted attempt by
   operation ID and inspect the exact key before any fresh click.
4. Record build, browser/profile label, mode, operation IDs, failures and
   timeouts plus click-to-pending-feedback, click-to-provider request and
   click-to-verified time for each repeat. Compare against a separately
   labeled control on the same objects, network and provider. Report
   count, median, p95 and slowest per mode and temperature.
