# Two-tier diagnostics V2 — review implementation

Implementation base: `0d50ab82c10555ae49d617b90be588057a1fa6b6`
(`milestone/a-sure-winner-base-0.1`). The owner explicitly selected this base
in chat after discovery showed latest `main` (`1817bec042132fc3eea33d23d441f2b26aac2342`)
diverged and lacked its newer fixes. Branch: `feat/base01-two-tier-diagnostics`.
V2 and V1 are preserved verbatim from the request branch at `8838a126523329bf3ac8d406efeedf7fd879a6b1`.
No merge, push, deployment, publication, owner profile access, database reset or
remote mutation was performed. The milestone tag remains unchanged.

## Baseline and scope

- Main inspection: 319/319 focused tests, 49/49 module tests, extension build PASS.
- Selected Base 0.1 before code edits: **372/372 focused tests PASS**. The historical
  CSS fingerprint and local workerd uncertain failures did not reproduce.
- Baseline unpacked-extension probe on main: BLOCKED by
  `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR`. This is not a Base 0.1 native-save pass.
- Chrome policy is respected. New browser tests use disposable Linux profiles,
  an HTTP fixture and real disk-backed IndexedDB. Fake native/provider results
  are labelled as such. No Windows or live R2 result is inferred from them.

ReDown was inspected at `91ff98ff682d0ecc2a850d2ebf0400d2b2dd5808` under `/tmp`,
including runtime/save evidence, forensic, flight, capless archive/controls,
export source and the November 12 incident report/review. This is an independent
implementation of the documented principles, not copied ReDown code. ReDown
source was not edited or executed. Its proprietary license is retained there.

## Architecture / production diff

| File | Change and authority |
| --- | --- |
| `src/chrome/registrar.mjs` | Optional no-throw invocation-local observer around existing single listener, including Depth wrapper and early blocked outcomes. Existing route/auth decisions retained. |
| `src/core/engine.mjs` | Optional `observation` sees dispatch and existing boundaries, separately from Glaciaring. No awaited recorder operation. |
| `src/cloudflare/transport.mjs` | Observe response-header latency of the existing initial `/remote-save` request. No new HTTP operation. |
| `extension/background.mjs` | Lazy optional recorder host; bounded early BASIC-only checkpoints; existing trusted message owner handles recorder v2 channel. |
| `extension/app.mjs` | Add optional Debug panel; explicit stop when hiding Debug. Existing preference works independently of recorder import. |
| `extension/recorder-panel.mjs` | Settings-only UI, history/statistics, rolling cap, Start/Stop, Unlimited, archive pagination, same-snapshot multipart ZIP controls. |
| `src/recorder/schema.mjs`, `contract.d.ts` | Fixed v2 BASIC field slots, typed availability, provider-neutral measurements and strict SECURE projections. |
| `src/recorder/provider-observation.mjs` | Cloudflare's existing independent proof translation; tests register mock adapters only. |
| `src/recorder/recorder.mjs` | Bounded attempt correlation, separate queues, stop/admission fence and epoch semantics. |
| `src/recorder/storage.mjs` | Independent diagnostic DBs, pending/reservation recovery, immutable rich segments and disk snapshot rows; never opens CURRENT. |
| `src/recorder/writer.mjs` | Bounded batched writer; actual settlement owns serialization; no deadline releases ownership. Backoff needs a later observation/manual flush, no keepalive. |
| `src/recorder/host.mjs` | Exact Shelf sender is checked by existing background owner; version/method/parameter checks, consent, local read-only exports. No new agent grant. |
| `src/recorder/export.mjs` | One bounded ZIP part at a time, fixed CSV columns, JSON availability, per-file/segment/part hashes; no provider IO. |

Manifest, extension key/ID, OAuth redirect, CURRENT schema, saved destinations,
menu compiler, native permissions, source acquisition and Worker code are unchanged.
The built Worker code digest remains independently checked by the normal builder.
The workings CURRENT hashes are refreshed; immutable historical baselines remain intact.

### Storage and failure contracts

BASIC `click2cloud-basic-v2` contains controls, one row per attempt (sparse compact
values), sequence index, metric indexes, immutable selected snapshots and their
paged rows. Default capacity 4,000 rolls; growing does not restore evicted rows.
Shrinking requires confirmation. Completed rows are evicted first. If outstanding
pending rows themselves exceed physical capacity, oldest pressure loss increments
explicit gap accounting. Runtime active ledger is bounded at 4,096 attempts.
Epoch recovery marks retained pending rows interrupted; it never retries a save.

EXPANSIVE `click2cloud-forensic-v2` contains durable runs, reservations, immutable
segments and control identity. Each batch reserves sequence range, hashes outside
the transaction, then atomically finalizes segment/control and removes reservation.
A pending range on restart is unconfirmed, not a fabricated crash. The last
committed digest is checked on recovery; exports verify each RAW segment digest.
Finite admission stops at N with LIMIT_REACHED; earlier segments are not pruned.
Unlimited removes the event cap, not resource limits. Old runs remain selectable
through paginated archive loading. Stop fences admission immediately; queued writes
may still be unconfirmed. A Stop during Start is fenced too.

Each writer has at most 4,096 queued items and an estimated 4 MiB queue budget,
plus one in-flight batch of up to 128. Rich payload size accounting includes
allowlisted literal string lengths. This bounds queues, not whole-browser RSS.
The recorder has no timeout that abandons ownership of a still-running write.
Failures preserve earlier segments and a bounded retry queue; health reports
drops/failures/pending and a last-commit risk. No absolute crash-proof guarantee.
A dead import does not prevent the native listener. Early BASIC checkpoints are
bounded to 256 attempts / 32 signals each, omit RAW and disclose overflow counts.

## Source-to-field observation matrix

`null` plus `availability[field]={value:'N/A',reason:...}` is materialized at read
and export. UI renders null as literal N/A. Zero is retained only when observed.

| Field family | Real source / unit / privacy / proof |
| --- | --- |
| attemptId, schemaVersion | Registrar UUID per delivered invocation; v2 constant. No URL-based join. |
| clickTimestampUtc, workerEpoch | Delivered callback wall timestamp and recorder random epoch. `performance.now` durations are within an epoch; cross-epoch total is N/A. Epoch loss is UNKNOWN, not a diagnosed browser crash. |
| appId/version/build | Existing BUILD_INFO; no hardware fingerprint. Source checkout revision may be unavailable rather than claimed installed SHA. |
| pageOrigin / websiteHost | Parsed `info.pageUrl` or supplied tab URL; no path/query/fragment/userinfo. SECURE redacts even hosts. |
| sourceOrigin / sourceHost / sanitized URL | Separately parsed `srcUrl`/`linkUrl`/page selection; BASIC stores origin only. No private path, filename or signed URL in BASIC. |
| provider / mode / context | Existing menu target/provider/origin mode and native click media/link class. `nested` maps to Narrow; unsupported identity explicitly other. |
| state / reasonCode | Same authoritative registrar terminal result; completed without independent proof remains uncertain. Uppercase bounded code only, no free-form BASIC error. |
| proofLevel / evidenceClass | Cloudflare adapter requires existing `completion:verified` plus `proofKind:independent-head-version-size`. Mock adapters explicitly label fixture-only. No recorder probe. |
| bytesObserved / bytesVerified | Existing authoritative receipt size via provider observer; verified byte count only with independent proof. No body reads. |
| clickToDispatchMs | Delivered monotonic tick to engine entry; milliseconds, no context-menu-opening claim. |
| sourceAcquireMs | Existing local capture.acquire start/end where emitted. Cloudflare TRUE REMOTE path skips local capture: N/A. |
| sourceReadThroughputBytesPerSecond | Observed bytes / actual source interval if both present and interval > 0. Otherwise N/A. |
| providerRequestLatencyMs | Existing initial transport request send → response headers, ms. Request-level latency, NOT RTT. Polling duration is not this value. |
| uploadElapsedMs / upload throughput | Existing direct-provider upload boundaries where available; remote Worker envelope includes source/polling so is not treated as measured upload. Cloudflare upload speed is N/A today. R2 physical disk speed is also N/A. |
| verificationElapsedMs | Existing transfer.verify start/end, ms. It is the verification request operation, not R2 hardware timing. |
| clickToVerifiedMs / effective bytes/s | Only independent existing proof permits total duration and verified bytes / total interval. Missing proof or cross-epoch timing stays N/A. |
| outcomeCompleteness / missingFields / dataLossFlag | Terminal/pending/interrupted, explicit canonical absent slots, queue pressure/gap evidence; no lifetime completeness claim. |
| Rich URL/source/target/error families | Explicit consent only; bounded literal allowlist, already observed fields. Unsupported final URLs, redirect chains, HTTP headers, packet/chunk timings and original exceptions remain N/A. Headers/tokens/file content are never intentionally captured. |
| Rich stages / health | Existing owner signals, run sequence/epoch, queue/write accounting and hash/reservation evidence. No invented provider/auth/source stage. |
| Recorder write bytes/s | Encoded diagnostic archive bytes / measured local commit interval, labelled diagnostic storage only. No cloud-speed interpretation. |

Full-window counts, denominators, groups by provider/mode/proof class and exact
metric mean/p50/p95/p99/sample counts are computed from indexed retained rows.
Recent history renders at most 20 rows; recent-sample summaries explicitly say
128 rows. Full-snapshot summary accompanies multipart exports; per-part summary
is separately labelled. These are rolling observed windows, never lifetime rates.
No compatible ReDown bundle import has been tested or implemented here.

## Privacy / export

The same selected BASIC disk snapshot and rich committed high-water are reused
for RAW/SECURE. Active later appends are excluded. RAW requires a fresh export
confirmation and a consented rich run; BASIC-only RAW cannot reconstruct URLs.
SECURE projects fixed enum/numeric fields, redacts hosts/literals/free-form errors,
and never exports arbitrary nested objects. Generated ZIP names are fixed strings
plus random snapshot UUID / part number. No private value enters a ZIP filename.

Each bounded ZIP part contains MANIFEST, README, fixed BASIC CSV + JSONL, rich
JSONL, full-window/part summaries, health and coverage. Part manifest records
ordering, previous ZIP hash, per-file hashes and projected segment hashes. The
UI prepares one part and requires explicit next-part action; cancellation preserves
the archive. A generated download is not claimed physically written to Windows disk.
No cloud requests, auth refresh, CURRENT writes or repair happen during export.

## ReDown regression mapping

| Observed issue | This implementation / evidence |
| --- | --- |
| 35,417 attempted / 4,000 retained | BASIC rolling is intentional and eviction counted; rich 4k/10k/100k runs retain first and last with no silent 4k ring. |
| 384 startup entries / ≥895 dropped | Per-epoch UNKNOWN and durable reservations expose gaps. Undelivered events and pre-commit crash loss remain unknown. |
| Deadline released write lock early | Node R02/R03 hold ownership through late success/reject, then serial retry. |
| 100 health writes / 100 events | Node R01 coalesces 100 into one commit; health is not itself logged. |
| SECURE filename carried RAW | Both ZIPs decompressed entry-by-entry with synthetic sentinels; manifest/content mode checked, not filename alone. |
| Chrome unavailable until Reload | ROOT CAUSE UNKNOWN. No claim that this recorder fixes or diagnoses the external disappearance. |

## Reproduction / remaining release gates

Run in `/workspace/Click2Cloud` with Node >=22 and `/usr/bin/chromium`:

```sh
npm ci --cache /workspace/.npm-cache --ignore-scripts --no-audit --no-fund
npm run test:focused
node --test right2cloud-module/tests/module.test.mjs
npm run build:extension
C2C_RECORDER_EVIDENCE=/tmp/c2c-recorder-browser node scripts/test-recorder-browser.mjs
C2C_HEADLESS=1 C2C_SHELF_EVIDENCE_DIR=/tmp/c2c-current-shelf npm run test:shelf:extension
```

See `results.json`, `gate-matrix.json`, logs and `settings-debug.png` beside this
file. Only synthetic RAW data is included. The installed probe reports its actual
BLOCKED status. Missing installed/native/Windows/cloud results are not test passes.

**Not release accepted:** 2,000 genuine provider-verified Simple/Narrow/Depth saves,
actual Windows native menu timing and Task Manager memory, idle/wake/update/kill
fault points during real cloud writes/export, full physical download/picker failure
coverage, compatible ReDown bundle import, and exhaustive corruption/quota/power-loss
coverage remain blocked or not run. The gate matrix records partial local coverage
without promoting it to an end-to-end pass. Some source/upload/chunk metrics cannot
be observed without a separate change to the existing Worker protocol and remain N/A.

Owner acceptance sequence: preserve the existing functioning profile externally;
review the branch/build first; use an independently authorized disposable Windows
profile and test prefix; verify OFF/BASIC/FULL actual native saves and readback,
then restarts/kill points and private RAW/SECURE downloads. Do not reset the current
profile. Source rollback means rebuilding the unchanged milestone, not deleting
CURRENT, OAuth, extension storage or cloud objects. No install into the owner's
working profile is authorized by these local tests.
