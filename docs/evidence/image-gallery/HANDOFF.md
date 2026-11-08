# Click2Cloud 0.3.12 — image/Grid/gallery/Remotes/layout handoff

Runtime candidate: `5201ab2` (implementation commits `d4703a9`, `0f19795`, `5201ab2`) on `dev/explorer-image-gallery`, from main `80b8e14`. Extension ID remains `ajppphdiamdobknpamcheohmdbdbeoal`. This branch implements the complete requested Explorer ergonomics inside the existing canonical API; no deployment or main merge is included.

## Actual changes

- Image previews now render verified PNG/JPEG/WebP/GIF pixels through the existing authenticated range API. The failed-File-API → outer `code:OK` defect is repaired; HTTP read failures retain safe numeric status codes. Unsupported/corrupt/oversized/unreadable images show actionable failures and Download. Actual browser decode is required before showing the image.
- Grid loads genuine thumbnails only for its virtual window, with bounded concurrency, byte/pixel budgets and explicit disposal. The same image-byte cache serves thumbnails and the enlarged viewer. No public/source webpage URL or additional backend is used.
- Remotes and Settings occupy full content width, without the Explorer tree or either divider. Remotes receives the same existing connection DOM/handlers, preserving ordinary login/reconnect. Returning to Explorer restores tree/path/selection/scroll.
- Vertical separator starts exactly 50/50 on a fresh configuration, moves edge-to-edge and retains a reachable handle at both extremes. Pointer capture, keyboard arrows/Home/End, double-click reset, cancellation/tab switch/blur and accessible state are implemented. A collapsed file pane stops thumbnail work and recovers locally.
- Horizontal toolbar separator adjusts from one compact row to the actual useful number of rows. More contains the same hidden command nodes/handlers, including address/View/+ Right Click. It is distinct from Load more files. No pointer frame triggers RPC, listing or native registration. Geometry recalculates locally and cached image bytes are reused.
- Both explicit geometry choices persist with typed `setExplorerLayout` in existing `commitConfigChange`. Old products receive `{split:50,toolbarRows:1}` without replacing destinations, approval, defaults or authentication. No-op clicks do not create commits.
- The image-only gallery uses loaded display order, skips folders/nonimages and stops at boundaries. ←/→ and visible controls update selection/title/pixels together; superseded reads/decodes cannot publish. ESC closes, disposes URLs and restores origin focus. Input/select and other dialogs do not become galleries.
- Footer bottom-left is empty. Accessible action notifications, inline list state, image errors, provider cards and receipts remain. Raw code-only notifications are translated; safe API/explicit diagnostic breadcrumbs remain. Late historical summaries no longer overwrite newer action errors.
- The linked Default-toggle dependency is implemented with existing makeDefault/clearDefault: A → clear A → B → A, one exact stored pointer, no extra Save or setup. Manager shows current Default even outside its filter; competing default controls wait for the canonical commit.

Source audit, API ownership and precise resource policies: [SOURCE.md](SOURCE.md). Actual before/after and large-image-window measurements: [PERFORMANCE.md](PERFORMANCE.md).

## Evidence classification

Final results: **269 focused PASS / 0 FAIL; 15 image/layout browser PASS; 30 product-browser PASS / 3 BLOCKED / 1 NOT_TESTED**. Exact source revision and installation receipt are in verification.json and accompanying logs. Browser image tests assert nonzero decoded dimensions and actual colored pixels for all four formats, not just `<img>` tags or filenames. Large logical image folders, rapid gallery races, corrupt/health-text reads, nested API failure, seven pane positions, pointer/keyboard toolbar overflow, 52 tab transitions, persistence and Default toggles are exercised.

These execute production app/API code and real browser IndexedDB with synthetic authorization/provider/native callbacks. They are **not owner-installed Windows Chrome, actual native right-click rendering or live R2 writes**. Existing local workerd/R2 transfer verification is part of the focused suite, independently classified from live cloud.

The read-only configured R2 request for the owner-reported WebP filename at `redown` root returned **HTTP 404 / NoSuchKey**. A subsequent metadata-only pass examined all 190 listed objects in that configured bucket, with no exact basename match. The actual owner object/account/bucket is not identified. Other buckets and unrelated object contents were not read. Therefore the original owner's bytes and any suspected stored `OK` response remain **unverified**. The error-envelope flaw is independently reproducible and fixed; that is not proof that an old cloud save was correct. No cloud resource or object was modified.

Genuine unpacked extension installation is attempted again on the final revision; consult real-shelf-receipt.json for the actual result. No installation-policy bypass, Worker deployment or credential rotation is used. Owner Windows/native image and live R2 acceptance remain separate gates.

## Architecture and preserved data

Meaningful operations remain `readFileChunk`, `fileMetadata`, `listFolders`, configuration preview/commit, Default selection, file actions, receipts and existing provider/login APIs. New durable layout fields use that same closed schema, revision/idempotency and CurrentStore. Pointer gestures, overflow, focus, decoding and gallery cursor are intentionally local; they do not merit separate trusted APIs.

Native Simple/Narrow/Depth/Quick/default/compiler/registrar and TRUE REMOTE save paths remain canonical. Worker code/protocol, OAuth permissions/client identity, saved approval ledger and REDOWN are unchanged. Existing baseline fingerprints are retained; CURRENT source/API behavior map is updated. Preview budgets are resource protections, not transfer caps.

## Known limits and remaining acceptance

1. No installed Windows or live-provider end-to-end pass is claimed. Test the actual extension and exact objects in the existing owner profile.
2. Gallery traverses the loaded ordered listing only; at an edge it stops and explicitly notes additional listing pages, rather than fetching every file or wrapping unexpectedly.
3. Thumbnails support objects up to 4 MiB; full image previews retain the existing 64-MiB budget, with 64-million-pixel and validated-header checks (including JPEG metadata beyond 64 KiB). Larger/unsupported headers receive an honest Download fallback. These limits protect decoding/cache memory and do not limit remote saves.
4. Queued/stale work is cancelled/discarded; already-sent runtime IPC cannot be physically recalled. Browser decoder/GC transient memory is not equal to the nominal cache payload budget.
5. Fixture RAF timings are not native input EventTiming, physical paint latency, real network speed or proof of universally zero stutter. Raw outliers remain in the performance records; prior long-run tail risks are not erased by short passing samples.

## Windows CMD and owner acceptance

In the existing checkout, preserve unrelated edits and use:

```bat
git status --short
git fetch origin
git switch dev/explorer-image-gallery
git pull --ff-only
npm ci
npm run test:focused
npm run build:extension
```

Reload the **existing** extension in chrome://extensions using the build command's `dist/click2cloud` directory. Confirm version 0.3.12 and the same extension ID. Do not uninstall, clear IndexedDB, reset OAuth or deploy a Worker for this UI change.

1. Open Remotes and Settings: full-width own content, no Explorer tree/dividers; normal login/status remains reachable. Existing destinations/default/setup approval must remain.
2. Open Explorer once; with no prior splitter choice confirm exactly centered 50/50. Drag to 0/10/25/50/75/90/100%, restore either collapsed pane, use Home/End/arrows and double-click reset. Repeat with a narrow Shelf and Chrome restart. Confirm exact path, selected file and scroll are retained.
3. Open a folder with known valid PNG/JPEG/WebP/GIF from the **actual connected cloud**. Grid must show decoded thumbnails, double-click/Enter must show the actual image, and narrow/widen must fit without cropping/stretching or repeated downloads. A full modal uses viewport space independently of collapsed panes.
4. In the enlarged image use Right/Left A→B→A with folders/nonimages mixed in. Test rapid repeated arrows, invalid/deleted/denied objects, first/last boundaries, ESC/focus and another dialog/input. Real failures must be visible with Download where permitted, never literal OK.
5. Drag the toolbar upward to compact + More and downward until every action fits. Verify every hidden action, address, View and + Right Click is reachable; More is not Load more files. Resize should not reload cloud contents or regenerate native menus per frame.
6. Toggle Manager Default A→A(clear)→B→A. Reconnect/restart and verify saved destinations and exact pointer. Test native right-click save to the selected existing ready destination, then independently read back the exact R2 object and compare bytes; confirm Explorer and History GO TO. UI fixture saves are not that proof.
7. Footer left stays blank through boot/login/errors/preview/selection; errors remain visible contextually. Use the explicit safe diagnostics/receipts for support without exporting credentials or source URLs.

Optional portable fixture test:

```bat
set "C2C_CHROME_EXECUTABLE=C:\Program Files\Google\Chrome\Application\chrome.exe"
node scripts/test-image-gallery-browser.mjs
node scripts/measure-explorer.mjs --runs 3 --buckets 1 --stress-seconds 60 --output explorer-0.3.12-fixture.json
```

These use isolated synthetic fixtures, not your installed profile. For actual input latency use Chrome's Performance trace in the existing Shelf; optional duration-only measures can be enabled with `localStorage.setItem('click2cloudPerformance','1')` and reload. Do not equate their double-RAF paint opportunities to physical display latency.

## Measured result and changed paths

The comparable Linux fixture menu p95 is 33.7 ms (prior 34.5 ms), selection p95 33.5 ms (prior 33.3 ms), and injected-delay menu p95 33.4 ms (prior 33.3 ms). This preserves immediate local feedback; tiny differences are not claimed as meaningful speedups. The 60-second stress observed 543 navigations, frame p95 16.7 ms, max gap 116.6 ms and no observed Long Tasks. This does not close prior longer-run tail risks or owner Windows acceptance.

The complete changed-file inventory is changed-files.txt. Production changes are in extension/app.mjs, app.html, app.css, explorer-layout.mjs; src/explorer/image-preview.mjs, layout.mjs and r2-adapter.mjs; src/api/config.mjs, service.mjs and service.d.ts; version/build metadata. Tests include image-gallery.test.mjs, generated four-format image assets, the existing product-browser fixture/suite, and the standalone image/browser and portable performance harness. Narrative and CURRENT source fingerprints are synchronized.
