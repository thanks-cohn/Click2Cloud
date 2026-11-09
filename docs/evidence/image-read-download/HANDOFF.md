# Image previews and complete downloads — 0.3.17

Runtime repair: `96a3262d2aa9eb4c24ddbcdc1b05c7c3d00d1bab`, branch `dev/p0-image-read-download`, starting main `3d55dc0`. Evidence/docs are committed separately. No merge or push. All final runtime receipts identify this revision with clean runtime source; build and artifact hashes are indexed in `verification.json`.

## ROOT CAUSE

Two independently reproduced incompatibilities in `src/explorer/r2-adapter.mjs:readChunk`:

1. Cloudflare's object-list JSON contains an **unquoted** opaque ETag. Its object GET returns the same strong tag **quoted**. The old exact string comparison incorrectly threw OBJECT_CHANGED. The old production adapter at3d55dc0 reproduces that exception against actual intact R2 objects (`live-provider.json:baseline`).
2. The management object endpoint returned the complete **HTTP200** body without Content-Range despite requesting bytes0–9. It also returned200 for a deliberately stale If-Match. Correcting quotation alone would expose the old206-only RANGE_NOT_SUPPORTED failure. `http-compatibility.json` records all three live variants. Request conditions alone cannot certify identity on this endpoint.

The old download opened its local writer before confirming any readable bytes. It also did not bind its first read to the listed ETag/size or perform post-close file-size readback. Failed initial reads could leave a newly selected empty placeholder; the exact owner's Windows zero-byte incident was not directly captured. This is a source-derived failure path, not a claim that every possible Windows disk failure has been diagnosed.

## REDOWN COMPARISON

Read-only reference revision: `a6c17f8d0be22131d5cc38b060da4f8f3544800f`.

| Actual REDOWN path | Observed source behavior / adaptation |
|---|---|
| `extension/options.js:showWorkspacePreview` → `extension/cloudflare-api.js:preview/readableResponse/request` | Authenticated full object GET → bounded Blob/object URL → image decode; no incorrect raw-list/header ETag comparison or206 requirement. Reused the full-response compatibility principle, while retaining stronger identity/count verification. |
| `extension/shelf-explorer.mjs:side/pumpThumb` → Universal File API preview → `extension/beta/r2-adapter.mjs:preview` | Full GET for side/full preview and visible queued thumbnail work; abort/revoke stale object URLs. Existing Click2Cloud thumbnail/decoder/gallery behavior remains; no REDOWN menu architecture or thumbnail-size restrictions imported. |
| `extension/history-image-source.js:cloud` and `history-quick-glance.js:decode` | Reads the saved R2 destination through authenticated management GET; createImageBitmap plus bounded canvas-generated thumbnail. Inspected as another successful full-response path; no browsing-source download substituted for the saved object. |
| `extension/cloudflare-api.js:download` → Chrome downloads; beta adapter waits for terminal state | ID-correlated onChanged/search distinguishes started, complete and interrupted. Some older background paths return only a started ID. Click2Cloud keeps its existing user-authorized file picker; equivalent completion is awaited writable close plus file-size readback. No extra downloads permission or framework. |

These are code-derived reference observations, not a new live REDOWN certification. REDOWN was not modified.

## REPAIR

- Normalize quoted/bare strong ETags once through existing file-identity helpers. Quote outgoing If-Match; independently compare returned identity. Weak/missing identities,412 and real mismatches fail explicitly.
- Support actual full200 bodies in the existing readChunk adapter. Keep bounded forward response readers and64KiB RPC windows; no whole-object provider cache or quadratic reread for ordinary sequential/concurrent windows. At most four open responses, each retaining at most four replay windows; EOF/error cancels, idle readers expire after5s. A lost reader can open a fresh validated response and skip to the requested offset. This remains the same trusted readFileChunk API.
- Keep strict206 offset/Content-Range/total/actual-byte validation. Full200 verifies complete advertised length and EOF. A complete response is one pinned object snapshot; a replacement cannot mix bytes across versions. Fresh stale-listing reads and replacements between206 requests are rejected.
- Previews/thumbnails also check listed size and canonical identity. Existing byte signature, decoded-pixel, memory, account and prefix protections remain.
- Download through the same byte validator with a streaming local sink. Validate before opening the writer, abort on error, await close, then verify getFile().size before completion. Preserve full filename/extension. A legitimate empty object is allowed; a nonempty zero-byte write cannot succeed. Progress is reset before each new download so an earlier success cannot masquerade as the new result.

No production changes to `src/auth`, `src/core`, `src/chrome`, `src/cloudflare`, or `right2cloud-module`. No OAuth, default/destination initialization, native menu or TRUE REMOTE upload changes. The existing diagnostic code list merely declares the two read/write error codes; no new instrumentation/framework. Version0.3.17; extension ID unchanged; API3+1.1 unchanged.

## IMAGE DISPLAY / DOWNLOAD EVIDENCE

`browser/results.json`: **25 PASS** using real production Shelf/API/adapter/decoder and actual browser OPFS files; HTTP200/quoted-ETag, Chrome/auth/picker boundaries are explicit fixtures. PNG/JPEG/WebP/GIF and a1,050,096-byte valid JPEG decode and download byte-identically. Injected read, partial-write, close and dropped-byte failures never claim success; preexisting files survive abort. Also verifies genuine206 version replacement, thumbnail/grid/gallery behavior, logout/login retrieval and bounded rendering.

`live-provider.json`: actual R2 listing and authenticated management reads; repeated complete reads, stale-ETag rejection and independent signed S3 GET for every image. **PASS**, including reproduced old-adapter failure. `live-browser/results.json`: **25 PASS** with actual R2 object bytes fetched through a local test proxy into the real Shelf/API/R2 adapter, decoded thumbnails/full previews and actual OPFS downloads. Auth/listing host, Chrome messaging and file picker are substituted and labeled; this is not a genuine installed-extension claim.

| Actual live object | Bytes | SHA256 prefix; full digest in receipts |
|---|---:|---|
| PNG |290|603a3661c340|
| JPEG |1504|0af299be18fa|
| WebP |334|8a2b885b0912|
| GIF |418|e62ad96d55dc|
| Larger PNG,1200×900 |3,717,007|0ace60117316|

All five downloaded files decode in Chromium and match independently read R2 bytes. The larger PNG is a conditional **new test seed**, not a claimed TRUE REMOTE transfer. Test objects remain under new unique `__click2cloud_true_remote_test__/images-*` prefixes; existing objects were not overwritten/deleted. No Worker was deployed or changed.

## REGRESSION

- **293 focused tests PASS**, zero failures; **49 remote-module tests PASS**. Focused guards retain exact existing API account/prefix/security behavior. Dedicated read tests include no-ETag/weak-ETag, malformed/truncated/extra bodies, valid empty objects, real206, duplicate/concurrent windows, cancellation and sink failures.
- The unchanged deployed Worker remotely saved PNG, JPEG, WebP and GIF from public test sources; actual provider receipts verified each. Independent R2 S3 reads match originals. Worker digest remains `IwTaIK4em1_mwIygmpbfULfJWUZln3ggKnG5suyu-NA`.
- Actual browser GUI sign-out/login preserves destinations and retrieves images again; **OAuth is a fixture**. No live reconsent was attempted.
- The existing CI job now runs the image/read/download browser regression. Hosted CI has not run because this branch is not published.

## REMAINING LIMITATIONS / REPEAT

`installed/real-shelf-receipt.json`: genuine unpacked Chrome attempt **BLOCKED — UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR**, response:null, no policy bypass. Actual Windows installed origin/RPC, native file picker/filesystem behavior and native right-click→Explorer→download acceptance remain **NOT VERIFIED**. Browser OPFS and live R2 component proofs are kept separate. A cancelled/failed native picker can reserve a new empty placeholder; it must never be reported as a completed nonempty download. Existing destinations and cloud files must not be removed to repair this feature.

Repeat locally: `npm run test:focused`; `node --test right2cloud-module/tests/module.test.mjs`; `npm run build:extension`; `C2C_IMAGE_EVIDENCE=<new evidence folder> node scripts/test-image-gallery-browser.mjs`. The real-provider harness is explicitly opt-in (`NODE_USE_ENV_PROXY=1 node scripts/test-image-read-live.mjs --approved-test-prefix-writes`), needs existing owned isolated test-Worker plan/environment credentials plus the archived3d55dc0 reference, and adds only new test-prefix objects. `C2C_IMAGE_LIVE=1` enables the browser's live-byte proxy after that harness passes. No credentials are exported.

After delivery, rebuild and reload the existing extension, without uninstall/reset. Verify an existing saved PNG/JPEG/WebP/GIF appears in Grid, opens enlarged, downloads under its complete filename, and matches the exact R2 object's size/hash. Repeat after sign-out/sign-in. A fresh right-click save must still verify in R2 and then pass the same read/download checks. Native Windows acceptance is still required before declaring the entire installed chain proven.
