# R2 operations, Narrow, save latency and Minimal

Implementation branch `codex/p0-r2-operations-narrow-speed-matrix-2026-11-18`.
The pre-overhaul tag `pre-r2-worker-overhaul-narrow-explorer-minimal-v0.3.19-2026-11-18`
peels to `c337e415596be01f061e161f167d9f5aed13825c`.

## Cause and implementation

- Existing prefix-limited Worker plans rejected siblings and ancestors in
  both the extension broker and Worker. New primary plans are bucket-wide.
  Explicit setup has an in-place migration with old binding checks, a
  recoverable pending deployment, root capability verification and an
  independent readiness probe. Named destination routing stays exact.
- Explorer mutations previously passed through a single-bucket Worker whose
  availability was tied to destination setup. The same authenticated API
  now prepares on demand after disclosure and consent. Cross-bucket copy and
  move have independently checked source and destination bindings with no
  browser byte staging. New Folder uses a Shelf form and confirms the
  marker. Creation in Explorer More reads back the chosen account and bucket.
- Native Chrome ACK is a menu concern. Explorer writes can run without it.
  Exact recovery avoids an unrelated depth-readiness sweep. Make Default
  checks the proposed target before replacing durable state and restores
  the prior Default on an unacknowledged or unavailable route.
- Narrow uses its existing curated chain and exact ancestor route IDs.
  Bucket-wide authorization enables root and intermediate Save here
  actions. The terminal action retains its user-configured title. Hidden
  levels, Quick promotion, Simple and bounded Depth remain distinct.
- Minimal uses Aesthetic API 1.1 and its closed text-role registry. The
  setting is a three-option dropdown. Disclosure, failure state, navigation
  and real commands remain accessible. Chromium fixture tests exercise a
  root and nested New Folder, a denied create, Explorer More bucket
  creation, dark and light appearance at 360/600/1100 px, and theme changes
  during an active file read.

## Verification boundaries

The workerd fixtures use the production Worker and R2 binding interface.
Cloudflare management and OAuth are controlled fixtures. They cover owned
prefix migration and lost reply, same- and cross-bucket files and metadata,
folder markers, move/delete source guards, denied binding and anonymous
requests, verified Create Bucket readback after a lost response, and a
denied Make Default preserving the old location. The save journey verifies
exact bytes at Simple, Narrow (including root and intermediate ancestors)
and Depth destinations. Chromium tests exercise actual app DOM and
IndexedDB with fixture provider and menu callbacks.

Cross-account transfers require different authorization/binding design and
remain blocked. Cross-bucket support is for authorized pairs in one account
and needs Workers creation authority when a pair Worker does not yet exist.
Existing R2 objects above the single PUT limit are rejected before copy.
R2 delete has a residual check-to-delete race across independent clients.
A failed physical Chrome registration still remains visible as incomplete.

## Save-speed comparison

Run `node scripts/benchmark-r2-save.mjs` from the repository root. It runs
both production Worker revisions in disposable local workerd instances.
Both sides use the same file sizes, mock HTTPS source, delay, 25 ms authority
checks and R2 binding interface. The clock starts at transport entry, after
Chrome and menu dispatch. There are ten samples per cell per build and
zero failures across 180 writes verified by receipt and exact object HEAD.
With ten samples, the nearest-rank p95 and p99 both select the maximum.

| Mode | Bytes and source delay | Before p50/p95/p99 ms | After p50/p95/p99 ms |
| --- | --- | --- | --- |
| Simple | 1 KiB, immediate | 86/159/159 | 73/143/143 |
| Simple | 1 MiB, immediate | 140/183/183 | 117/138/138 |
| Simple | 1 MiB, 260 ms | 1081/1085/1085 | 408/596/596 |
| Narrow | 1 KiB, immediate | 74/110/110 | 78/154/154 |
| Narrow | 1 MiB, immediate | 108/1098/1098 | 159/258/258 |
| Narrow | 1 MiB, 260 ms | 1109/1180/1180 | 418/463/463 |
| Depth | 1 KiB, immediate | 79/132/132 | 81/109/109 |
| Depth | 1 MiB, immediate | 117/331/331 | 133/191/191 |
| Depth | 1 MiB, 260 ms | 1089/1132/1132 | 395/423/423 |

The delayed Simple median Worker request and polling stage fell from
1023 to 351 ms. Median live-authority fixture time stayed at 50 ms, and
final verification stayed at 6 to 5 ms. A first iteration that waited
200 ms and then applied the full polling interval increased delayed tail
latency. The final code uses a short Worker hint and anchors a still-pending
request to the original polling cadence. It avoids the redundant worker
round-trip for timely writes and preserves independent verification.
The raw output contains all stage distributions, first samples and observed
request sequences. Immediate cases had mixed medians and tail outcomes.
No benchmark result measures Chrome input latency or live Cloudflare.

[Raw benchmark data](save-benchmark.json)

## Executed checks

- `npm test` passed 546 tests with no failures or skips.
- `node scripts/test-aesthetic-browser.mjs` passed 24 Chromium fixture gates.
  These include the actual dropdown, visible and hidden copy, responsive
  menu layout, explicit error UI, a pending read and a pending save that
  retained their data and behavior through theme changes.
- The three built-in theme manifests passed the published JSON Schema.
- `npm run build:extension` passed. The disposable installed Shelf runner
  reported `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR`. Physical Chrome
  menu rendering, live OAuth, Worker deployment on Cloudflare and live R2
  operations remain unverified in this environment.
