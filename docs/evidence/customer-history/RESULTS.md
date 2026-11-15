# Customer UX / History results

Implementation base: `a3a672754156f88bb572bfb4275d1471f0ccb4a6`.
Request read from `4a0c21e:codex/11.15.2026/CLICK2CLOUD_CUSTOMER_UX_HISTORY_PROVENANCE_PERFORMANCE_CODEX_REQUEST.md` before switching to the explicitly requested base. Review branch: `implement/customer-history-ux-2026-11-15`.
The existing annotated checkpoint tag still resolves to the implementation base.

## Before and after

| Area | Before | After |
| --- | --- | --- |
| Depth feedback, Debug OFF | Sends technical completion/pending text on the in-app channel | Routine completion/pending channel is silent; persistent outcomes, journal, badge and short actionable failure/uncertainty feedback remain |
| History | Diagnostic Save results dialog, 20-result load-more | Top-level customer page, 25 operations/page, local Year/ISO Week/Day groups and text/color status |
| Retention/preferences | No customer History controls | Forever retention; independent display range, timezone and all-page/first-page/closed image defaults |
| GO TO | Receipt shortcut navigates folder; selection may remain outside loaded/visible window | Exact-key stat/identity check, actual directory, paged listing search, visible focus/selection for all file types |
| Saved metadata | Written to R2 but not carried as an upload snapshot | Exact PUT http/custom metadata retained in receipts; legacy gaps/current-remote metadata labelled; sensitive customer fields redacted |
| Export | No structured customer History export | Settings JSON/JSONL/CSV across all matching operations, independent of display/page; streaming writer, inclusive timezone dates and optional privacy omission |
| Navigation | Separate Settings/Help header controls; minimum toolbar can hide navigation | Header More contains Settings then Help; minimum Explorer toolbar is Back/Forward/Up/Refresh/More |
| CURRENT authorization reads | Deserializes all retained state, including History | Exact configuration keys plus complete setup evidence; unchanged integrity guards |

No customer History Technical Details panel exists. Receipt/proof/trace inspection remains under Help · Diagnose → Inspect save diagnostics, and existing recorder facilities. Metadata contains upload fields only, with parsed click2cloud provenance; ETags/versions/timing are not added to it. Public object URLs are unavailable because this pipeline records no verified public URL; none are invented or enabled. Historic titles, source URLs and metadata are not backfilled.

## Performance evidence and limits

`persistence-performance.json` is a paired **local Chromium/IndexedDB** benchmark against the requested base: same database/configuration, 5,000 retained synthetic operations, 2 KiB synthetic payload per operation, five warmups and 50 measured CURRENT reads per side.

| CURRENT read, milliseconds | Before | After |
| --- | ---: | ---: |
| p50 | 84.6 | 0.4 |
| p95 | 123.1 | 0.7 |
| p99 | 135.9 | 0.9 |
| Longest observed | 135.9 | 0.9 |

This removes repeated local deserialization overhead; it does **not** explain or certify the owner's 5.1 s median / 38.6 s p95 live saves. The existing independent small-state recovery benchmark also measures sub-millisecond-to-1 ms reads; extra exact-key requests can add a small fixed cost on tiny stores. No “2 seconds always” claim.

The source still performs invocation-time account/capability checks, remote readiness, conditional creation, polling, and independent HEAD/size/version/provenance verification. New numeric Worker timings separate authentication, source headers, destination preparation, and overlapping streamed source-body/write; transport retains dispatch preparation, capability/auth checks, polling count, transfer and verification timing internally. Streamed source body and R2 write overlap and are deliberately reported together. Timing traces never contain URLs or secrets.

**NOT MEASURED:** equal-condition REDOWN runtime, installed Windows gesture/UI latency, cold/warm real OAuth/Worker regions, and live p50/p95/p99 by native mode. No authenticated Cloudflare account or ordinary owner profile was available. The historic Depth CONFLICT is not reproduced or assigned a cause: conditional occupied/racing-key refusal is possible, but no blanket retry or relabelling was added. Existing local conflict guards remain intact.

Customer History export reads use bounded page selection over the existing store. Without introducing an index/schema migration, each export cursor page scans retained operation keys. Very large histories can therefore take time to export, while page/output memory is bounded. Previews use two concurrent readers, an 8 MiB cache, 4 MiB per-source limit, 240×180 thumbnails, and no hidden collapsed-group requests. Larger images remain available through File Explorer.

## External acceptance and operational notes

| Gate | Status | Evidence / limitation |
| --- | --- | --- |
| Pristine base focused suite | PASS | 444 tests; isolated source archive, same installed dependencies |
| Model, export and exact-file navigation | PASS | Existing focused runner includes `tests/history.test.mjs` |
| Actual application browser UI | PASS | Disposable Chromium, real DOM/API/IndexedDB; explicit fake provider/Chrome transport |
| Save payload / Simple-Narrow-Depth regressions | PASS | Production engine/transport/local workerd/R2 plus independent byte and metadata readback; not live Cloudflare |
| CURRENT loss/corruption/recovery/crash guards | PASS | Existing real Chromium suite, including process SIGKILL/restart; synthetic profile/filesystem/Chrome callback fixtures |
| Unpacked extension in managed Chromium | BLOCKED | Administrator policy rejects unpacked extension loading; no bypass attempted |
| Installed Windows combined native menus, cold login and actual R2 saves | NOT TESTED | Requires owner's authorized browser/account |
| Live remote latency improvement and historic CONFLICT cause | NOT TESTED | No equivalent live benchmark/incident reproduction available |

Worker response/timing changes alter the code digest. Existing Workers require the normal explicit authorized update before accepting this build; the strict code-match and verification barriers remain. Nothing was deployed and no public access was enabled. Older Workers/records have no newly invented metadata snapshot. Local development builds are unpacked output, not release archives.

No REDOWN changes, merge, deployment, tag creation, release package, live object mutations, user-profile reset or destructive History retention occurred. Environment onboarding installed locked dependencies with scripts disabled; its reusable install script was saved as a draft, without publication.


## Final command evidence

- `npm run test:focused`: **465 passed, 0 failed, 0 skipped** (base: 444 passed).
- `node --test right2cloud-module/tests/module.test.mjs`: **49 passed**.
- `node scripts/test-customer-history-browser.mjs`: **11 PASS gates**, no page errors. Includes paged exact-key lookup, 101-record export in every format, image defaults on pages 1/2, hidden-group read suppression, and expand/condense controls.
- Existing real CURRENT recovery suite: **30 PASS, 3 expected historical reproductions**, no FAIL; includes process crash/restart and retained Simple/Narrow composition.
- `npm run build:extension` and `git diff --check`: **PASS**.
- `npm run test:shelf:extension` with a disposable headless profile: **BLOCKED**, exit 2, administrator unpacked-extension policy.

`local-save-traces.json` retains before/after transport traces through actual engine/Worker/local R2 for the same nine 3-byte saves per build, grouped by Simple/Narrow/Depth with sample p50/p95/p99/max. They test routing, independent proof, metadata and stage visibility, not Windows end-to-end latency. Quick/Default controls remain covered by the existing focused suite; installed owner-mode acceptance remains NOT TESTED. The post-change worker traces expose source-header/prepare/stream-write timing that the baseline did not report. No live 38.6-second tail cause is asserted from tiny fixture samples.

CSV includes a metadata row (`recordType=export`) even when no operations match. JSONL similarly begins with one export-metadata record. Count operations by their record type, not metadata headers. Sensitive fields are explicitly redacted while the original internal upload snapshot is preserved.

Screenshots: [History with source links and metadata](history-details.png), [condensed Explorer toolbar](explorer-condensed.png). All shown records are synthetic fixtures.
