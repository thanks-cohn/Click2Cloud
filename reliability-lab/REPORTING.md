# Evidence, metrics and release gates

## Every run
Record run ID, git SHA, built extension version, platform/OS, Chrome version, profile type, runner version, seed, fixture/provider mode, start/end/actual duration, concurrency, data sizes, requested vs executed cases, resource/cost caps, and stop reason. Keep production credentials and private URLs out of output. Distinguish scheduled, completed, skipped, blocked and not attempted.

Per operation JSONL: scenario_id, operation_id, layer (unit/fixture/worker/native-browser/live/manual), user action, provider/mode, sanitized destination, expected result, observed terminal state, independent evidence type, bytes, expected/actual hash when supported, latency_ms, retry count, error code, reconciliation result, assertions and pass/fail/skip. Do not label uncertain as verified; a provider receipt alone is not independent final byte proof.

## Metrics
- Attempted vs executed vs terminal; verified successes, expected rejections, unexpected failures, uncertain outcomes, duplicate commits, wrong destinations, missing/extra History entries, phantom success notifications.
- p50/p95/p99 and max latency with sample count, separate menu compilation/native registration/click dispatch/transfer/verification; cold vs warm, per provider/mode/size. Compare like-for-like; do not aggregate fixtures with live cloud.
- Peak and steady memory for extension worker/Shelf/browser as measurable, CPU, retained records, request counts, uploaded/downloaded bytes, staging leftovers, cleanup failures. Account for GC and idle baseline; do not claim leak from one peak.
- Browser screenshots/native evidence and actual OS interactions; unsupported environment recorded as blocked. Native menu fixture proof cannot substitute for live provider proof.
- Baseline vs candidate: use same seed/workload/environment. Provisional review trigger: >20% p95 regression with adequate sample size and meaningful absolute delta, or sustained memory growth after warm-up; calibrate actual budgets and noise from baseline, not invented guarantees. Critical correctness failures block regardless of latency.

## Release gating
Mandatory: no wrong destination, no false success, no unintended delete/overwrite, no duplicate committed file for same operation identity, no lost retained records/configuration, no credentials exposed. Zero unexpected failures in critical deterministic tests; expected injected failures must be classified correctly and recover where contract requires. Native menu available after login/reconnect in supported contexts; all three modes correct; Cloudflare Upload GUI wired to existing API and actual destination. Evidence gaps explicitly block declaring the relevant gate passed. No claim of Windows or live cloud testing unless executed. Record remaining uncertainty and owner acceptance separately.

## Example summary (illustrative only, not results)
| Layer | Requested | Executed | Pass | Fail | Blocked/skipped |
|---|---:|---:|---:|---:|---:|
| Fixture menu | 30,000 | — | — | — | — |
| Mixed sequences | 10,000 actions | — | — | — | — |
| Native browser | 60 selections | — | — | — | — |
| Live R2 smoke | <=20 writes | — | — | — | — |
| Manual daily | 2,000 saves | — | — | — | — |

## Defect register
Severity P0 data loss/false success/wrong destination/auth boundary; P1 broken supported workflow or sustained reliability regression; P2 visual/performance issue without functional loss. Each defect: exact build/seed, reproduction, expected/actual, evidence link, impact, suspected vs confirmed root cause, patch and regression test, retest result. Preserve failures instead of rerunning until green without explanation.

## Owner's daily 2,000-image feedback workflow
Owner uses normal ReDown in real Chrome, across day, with existing destinations and permissions; no forced workload or requirement to reach target. Record build SHA/version, approximate sessions, modes and counts, failed/uncertain saves, restart/reconnect times and sanitized diagnostic/receipt export. Avoid collecting URLs or personal image content unless needed and explicitly shared. Compare observed operations with recorder coverage; missing logs are evidence gaps, not verified successes. Correlate with lab scenarios and add reproducible regressions. Manual usage supplements fixture, native and live proof, not replacement. No destructive operations on personal files.
