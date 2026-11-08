# Explorer 0.3.12 performance and image evidence

Final runtime `5201ab23a9f01ffab4e86ee60d6233eaf18ce7ad`; Chromium 155/Linux, 1280×850. Before is the committed 0.3.11 fixture record at `97c2806eeb1f656ab69e7843085517e189663968` in ../zero-stutter/after-1-buckets.json. Its critical source hashes were checked against starting main `80b8e14`; they match. Both use the same 3-repeat, 1-bucket, 0/1/100/1,000/10,000-item matrix and event-to-visible-DOM plus two RAF paint opportunities. New layout starts 50/50; old file viewport geometry differs as part of the actual UI change.

**Fixture proxies are not physical paint, native-input EventTiming, actual MV3 wake, owner Windows Chrome or Cloudflare network speed.**

| Interaction / frame proxy (ms) | Before p50 / p95 / p99 / max | After p50 / p95 / p99 / max |
|---|---|---|
| selection | 32.9 / 33.3 / 34.7 / 34.7 | 32.9 / 33.5 / 35.4 / 35.4 |
| menu | 33.3 / 34.5 / 43.9 / 43.9 | 33.2 / 33.7 / 34.6 / 34.6 |
| slowMenu | 32.6 / 33.3 / 33.3 / 33.3 | 32.8 / 33.4 / 33.4 / 33.4 |
| frames | 16.7 / 16.7 / 16.8 / 33.4 | 16.7 / 16.7 / 16.8 / 33.4 |

The slowMenu case injects 2,100 ms into descriptor inspection. A local disabled shell remains responsive while authorization completes; it does not fabricate completed actions.

Final matrix Long Tasks: `[]`. Last cumulative CDP layout/style/heap before: `{"LayoutCount": 646, "RecalcStyleCount": 1202, "LayoutDuration": 0.501848, "RecalcStyleDuration": 0.233505, "JSHeapUsedSize": 5229208}`; after: `{"LayoutCount": 673, "RecalcStyleCount": 1348, "LayoutDuration": 0.506105, "RecalcStyleDuration": 0.256675, "JSHeapUsedSize": 5318080}`. These are cumulative fixture-process counters, not per-interaction attribution, whole-browser memory, decoded image GPU memory or a leak test. Raw method/request duration and DOM records remain in performance.json.

## Separate 60-second navigation/scroll stress

543 navigation samples; max live DOM 267. Frames p50/p95/p99/max: 16.7 / 16.7 / 16.8 / 116.6 ms. Observed Long Tasks: `[]`.

This shorter run does not clear the prior ten-minute tail risks (including the previously recorded 568 ms Long Task and 1,050 ms frame gap). No universal zero-stutter claim is made. Durations differ, so raw stress Long Task counts are not presented as a comparable reduction.

## Genuine decoded fixture-image Grid

The old Grid had no image thumbnails, so an old-versus-new image-decode speed comparison would be misleading. The separate image browser suite verifies actual PNG/JPEG/WebP/GIF pixel colors and dimensions through the typed API. Its 30-RAF alternating-scroll windows report below. Reads are incremental after the initial visible thumbnail, not all session reads. All image data/auth/native callbacks are synthetic fixtures; no live R2 object content is implied.

| Logical images | Scroll proxy p50 / p95 / p99 / max ms | Extra reads during scroll | Rendered tiles | Live DOM |
|---|---|---|---|---|
| 0 | 16.6 / 16.9 / 17.1 / 17.1 | 0 | 0 | 112 |
| 1 | 16.6 / 17.2 / 17.5 / 17.5 | 0 | 1 | 117 |
| 100 | 16.7 / 17.0 / 17.1 / 17.1 | 12 | 28 | 232 |
| 1000 | 16.6 / 19.1 / 61.6 / 61.6 | 12 | 28 | 232 |
| 10000 | 16.7 / 17.7 / 18.3 / 18.3 | 12 | 28 | 232 |

The image/browser suite also asserts no additional image reads across seven splitter positions with cached images, no RPC during toolbar pointermove, two concurrent thumbnail reads, 52 tab transitions with no folder re-listing, persisted geometry, truthful invalid/denied reads, rapid gallery cancellation and single exact Default selection. Browser results preserve all samples/outliers. Windows path handling in both standalone harnesses is corrected; its execution on Windows is NOT TESTED. See HANDOFF.md for acceptance commands and remaining external blockers.
