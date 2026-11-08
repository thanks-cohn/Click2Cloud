# Final performance evidence

Baseline: `04644f4`; runtime candidate: `97c2806` (0.3.11). Chromium 155/Linux, 1280×850. Three repeats per bucket count × 0/1/100/1,000/10,000 items. Each positive item case has eight warm interactions and one menu with an injected 2,100 ms descriptor delay. No user cloud writes.

These are fixture double-RAF paint-opportunity timings. The delay causally isolates the API dependency; it is not actual Cloudflare latency or MV3 cold wake. Owner Windows native input and live provider acceptance remain BLOCKED. No universal zero-stutter or Windows target attainment claim.

| Buckets | Menu p50/p95/p99 before → after (ms) | Delayed-menu p95 before → after (ms) | Selection p95 before → after (ms) | Frame p95 before → after (ms) |
|---|---|---|---|---|
| 1 | 66.6/68.9/78.1 → 33.3/34.5/43.9 | 2167.1 → 33.3 | 33.4 → 33.3 | 16.8 → 16.7 |
| 10 | 66.6/68.7/129.5 → 33.3/33.9/50.4 | 2167.8 → 34.9 | 33.5 → 33.6 | 16.7 → 16.7 |
| 100 | 66.6/67.6/69.4 → 33.3/34.5/119.4 | 2182.7 → 35.4 | 34.0 → 33.6 | 16.8 → 16.8 |

## Outliers, frame pacing and bounded rendering

All raw samples, maxima, Long Tasks with timestamps/phases, request durations, DOM counters, layout/style work and JS heap are retained in the six before/after JSON files. CDP counters are cumulative within each matrix run; they are not attributed solely to Explorer interaction or cross-process memory proof. Do not infer a leak from one cumulative snapshot.

- **1 buckets:** menu max 78.1 → 43.9 ms; final frame max 33.4 ms. Matrix Long Tasks before/after 0/0; raw after Long Tasks: `[]`. Max visible rows 23; retained shell for every measured case: True. API method counts before `{"getConfiguration": 1, "loginStatus": 1, "describeCapabilities": 1, "inspectShelfAttention": 1, "inspectRemoteHistory": 1, "enterExplorer": 1, "listFolders": 16, "navigateExplorer": 15, "inspectExplorerContextMenu": 108}`, after `{"getConfiguration": 1, "loginStatus": 1, "describeCapabilities": 1, "inspectShelfAttention": 1, "inspectRemoteHistory": 1, "enterExplorer": 1, "listFolders": 16, "navigateExplorer": 15, "inspectExplorerContextMenu": 108}`.

- **10 buckets:** menu max 129.5 → 50.4 ms; final frame max 116.7 ms. Matrix Long Tasks before/after 1/1; raw after Long Tasks: `[{"at":40545.5,"ms":119,"phase":"interaction"}]`. Max visible rows 23; retained shell for every measured case: True. API method counts before `{"getConfiguration": 1, "loginStatus": 1, "describeCapabilities": 1, "inspectShelfAttention": 1, "inspectRemoteHistory": 1, "enterExplorer": 1, "navigateExplorer": 16, "listFolders": 16, "inspectExplorerContextMenu": 108}`, after `{"getConfiguration": 1, "loginStatus": 1, "describeCapabilities": 1, "inspectShelfAttention": 1, "inspectRemoteHistory": 1, "enterExplorer": 1, "navigateExplorer": 16, "listFolders": 16, "inspectExplorerContextMenu": 108}`.

- **100 buckets:** menu max 69.4 → 119.4 ms; final frame max 100.0 ms. Matrix Long Tasks before/after 2/0; raw after Long Tasks: `[]`. Max visible rows 23; retained shell for every measured case: True. API method counts before `{"getConfiguration": 1, "loginStatus": 1, "describeCapabilities": 1, "inspectShelfAttention": 1, "inspectRemoteHistory": 1, "enterExplorer": 1, "navigateExplorer": 16, "listFolders": 16, "inspectExplorerContextMenu": 108}`, after `{"getConfiguration": 1, "loginStatus": 1, "describeCapabilities": 1, "inspectShelfAttention": 1, "inspectRemoteHistory": 1, "enterExplorer": 1, "navigateExplorer": 16, "listFolders": 16, "inspectExplorerContextMenu": 108}`.

## Ten-minute final-source navigation/scroll stress

5418 navigation samples, maximum live DOM 261 elements. Frame p50/p95/p99/max: 16.7/16.8/16.8/1050.0 ms.

9 observed Long Tasks: `[{"at":88971.60000000149,"ms":57},{"at":127056.69999999925,"ms":180},{"at":165382.5,"ms":119},{"at":165502.1000000015,"ms":97},{"at":170554.5,"ms":568},{"at":432214.5,"ms":111},{"at":432894.1000000015,"ms":76},{"at":540727.6000000015,"ms":97},{"at":611833.6999999993,"ms":120}]`. These tails remain evidence to investigate; p95 does not erase them. The browser/OS/fixture workload attribution is not independently isolated, so no claim that every Long Task is fixed or Explorer-caused.

## Cold start and omitted external proof

The production background-module regression deliberately holds native-registration callbacks and proves trusted configuration inspection returns before release. That is a controlled dependency test, not a measured owner MV3/Windows cold wake. Genuine unpacked extension installation was blocked by administrator policy; existing live Worker transport lacks the unreadable signing secret. See HANDOFF.md and the independent receipts. Preview, Grid, address, offline state and reconnect use browser functional regressions; there is no invented per-action Windows percentile for them.

Preliminary records are retained under preliminary/ and excluded from this comparison. Source hashes were checked against the frozen runtime candidate for all final after records.

## Separate short CPU diagnostic

A subsequent 60-second sampled CPU diagnostic on the same runtime (10,000 entries, one bucket) observed 530 navigations, no Long Tasks, frame p95 16.8 ms and max 216.7 ms. About 53.5 of 60.1 sampled seconds were idle; largest named app self samples were renderWindow (~1.04 s total) and loadListing (~0.71 s total). This did not reproduce or explain the ten-minute run's 568 ms task/1,050 ms frame gap. Do not assign an unproven cause or discard the longer-run failure. The independent raw trace, sampling description and totals are cpu-diagnostic.cpuprofile.gz, cpu-diagnostic-run.json and cpu-diagnostic.json. Profiling can perturb execution; these values are excluded from the final comparison matrix.
