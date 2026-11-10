# Click2Cloud 0.3.19 — remaining architecture handoff

November 9, 2026. Development branch: `dev/composition-loaders-provenance`, started from main `e8c8990`. Final executable evidence revision: `0186b8bbf7f7bd1da3817a38183c709e25384ea4`. Later handoff/CI/type-declaration edits do not alter executable product behavior. The owner subsequently authorized pushing to main; latest remote documentation is reconciled separately.

**Source implementation and representative acceptance are complete for Gate A and Phases 5–7. Actual installed Windows Chrome acceptance is BLOCKED/unverified. Do not call this an installed or production rollout pass.**

The immutable checkpoint remains `checkpoint/click2cloud-working-before-major-upgrades-2026-11-09` → `3b24320138ff0ebbf50a0e6a912a5d2800038676`. REDOWN is unchanged. No user storage reset, token deletion, destination removal or production deployment was performed. Existing Cloudflare OAuth, initialization and image read/download owners were retained. Only a new isolated test Worker/DO and new unique objects in the previously approved `__click2cloud_true_remote_test__/provenance/` scope were created; that isolated Worker was updated for the final metadata serializer. Existing cloud objects were not overwritten/deleted.

| Gate | Implementation / source commit | Verification |
|---|---|---|
| A | `58d017fe3053685b62c5a8c5de2554c26ef3af0f` plus final identity/Flat refinements | All 16 show+Flat combinations; genuine Narrow/Depth parent IDs; separate Narrow presentations of one physical target; GUI checkmarks/eye/reload/relogin; multiple Depth buckets and limits; live exact-prefix saves. [Initial evidence](gate-a/verification.json), [final composition receipt](gate-e/composition/results.json). |
| B / 5 | `7ea43e143bc391b5b5afc94fb85a6460cccf43d8` plus corrupt-local-visual hardening | Isolated math/media modules; trusted local preference API; PNG/JPEG/WebP/GIF/muted looping MP4; replacement, reduced motion, cleanup, malformed preference fallback and persistence. [Evidence](gate-b/verification.json), [final gallery](gate-e/gallery/results.json). |
| C / 6 | `80bc8d2b8e80cb3c28b0ef370f5dc0be72775e01` | Existing gallery logic retained; fixed chevrons, keyboard/pointer, focus, disabled first/last, rapid navigation and stable geometry. [Evidence](gate-c/verification.json). |
| D / 7 | `58db7f1857781f4d168dd89b58c52344edceae51` plus Quick visibility refinement | Ten actual isolated Cloudflare saves; independent signed S3 GET bytes/custom metadata; exact selected route and physical path, original/stored collision filenames. [Evidence](gate-d/verification.json). |
| E | Final evidence at `0186b8bbf7f7bd1da3817a38183c709e25384ea4` | 319 focused tests, 49 module tests, 28 combined gallery gates, 26 live-read browser gates, 7 composition gates; 30 persistence passes + 3 intentionally reproduced historic baseline defects; login/save/logout/relogin/process restart workflow. [Full acceptance matrix](gate-e/verification.json). |

Full changed paths by gate and from the original main are in [changed-files.json](changed-files.json). Every raw receipt states its source revision and proof class.

## Root causes and repairs

The composite compiler previously reduced Depth to target-keyed leaves, while Flat filtered out checked Narrow/Depth projectors. A global target map also erased meaningful overlapping mode/presentation identities. It now retains actual parentPlacement for both trees, composes checked modes additively, and distinguishes route identity from physical action authority. A real descendant Depth tree branches; an empty bucket has no fabricated folders. Flat cannot veto selected trees or create a false missing-Default error when checked routes already exist.

Distinct Narrow destinations can share the exact physical bucket/prefix. NEW presentation IDs are allocated from creation state, independently of targetKey; legacy/existing IDs are preserved. Rename, hide or delete addresses the saved ID. Readable deterministic `(2)` sibling suffixes resolve collisions without dropping choices. Simple duplicate-target protection remains. Initial hidden/quick options use the same canonical create API, removing the old GUI need to guess an ID. Default remains one physical target; Quick/Default exclusion and mode/row-eye gates remain authoritative.

Explicit Depth configuration performs paginated read-only discovery to the requested depth. Passive inspection/boot does not start a crawl. Incomplete or failing inventory is never proof of an empty bucket. First-time large-bucket discovery and exact readiness checks are network-bound; no instant-configuration latency claim is made.

The gallery keeps Phase4's fixed responsive frame. Math equations/drawing reside only in `src/explorer/loading-visuals/math.mjs`; custom Blob presentation resides in `media.mjs`; one small lifecycle owner mounts/cleans either. Trusted get/setGalleryLoadingVisual APIs use an independent record in the existing CurrentStore, not a new state engine/database. One 8 MiB local-visual budget does not cap cloud transfers. Invalid local preferences fall back visibly and can be explicitly replaced/removed; user destinations remain intact. GIF uses its encoded looping; reduced-motion/offscreen paths use a still frame. MP4 is muted/looping; decode/autoplay failure falls back gracefully. URLs/decoders/listeners/RAF are released on completion/error/cancel/navigation.

The compiler freezes the selected provenance snapshot with its acknowledged menu generation. The resolver/engine supplies that exact selection; HMAC grants bind operation, source digest, destination and snapshot digest, including lease renewal. The original conditional Worker put stores versioned ASCII-safe JSON under `click2cloud` custom metadata, within R2's actual combined 2 KiB key/value budget. Oversize rejects explicitly before write. There is no browser byte staging or second metadata rewrite. Separate HEAD verification checks actual metadata against receipt/selection, alongside operation/key/size/ETag/version; independent S3 GET checks bytes and metadata again.

Simple records its displayed/configured title and label source; Narrow records full physical directories and configured titles including hidden levels; Depth invents no Narrow settings. A promoted Narrow Quick records effective collapsed visibility separately from its saved visibility choice. Original filename is resolved by the existing source/response filename rules; stored filename reflects actual keep-both renaming. No source/page URLs or credentials are generated into new metadata. Existing metadata-less objects remain readable. Legacy low-level clients without a menu route stay compatible without fabricated selection metadata; all canonical composite Cloudflare save routes supply the snapshot.

## What the evidence actually proves

- **LIVE WORKER/R2 PASS:** ten final saves: Simple custom/natural; Narrow all/hide-all/mixed/original/Quick; Depth deep; keep-both first/second. Both Narrow presentations resolve to the same actual prefix. Every saved PNG has matching independent bytes/SHA256 and custom metadata, selected entry/presentation IDs and truthful filenames. [Raw live receipt](gate-d/live.json).
- **LIVE R2 READ + BROWSER PASS:** real existing R2 PNG, JPEG, WebP, GIF and 3,717,007-byte PNG decode/preview and byte-identical OPFS downloads through the production reader. The local proxy, OAuth/Chrome messaging and file picker are fixtures. [Receipt](gate-e/live-image-reads/results.json).
- **REAL BROWSER / FIXTURE PROVIDER PASS:** actual Shelf/API/IndexedDB/decoder/OPFS and local workerd/R2/DO execute. Chrome contextMenus callbacks, OAuth, management and selected source responses are explicitly fixtures. The login workflow includes independent local R2 readback and a full disposable browser-process restart. It is not real Cloudflare OAuth or an installed Windows click.
- **PERSISTENCE PASS:** 50 reopen cycles plus genuine disposable Chromium SIGKILL/restart preserve two Narrow presentations, all mode checkmarks, exact local MP4 bytes and approval/configuration. Historic baseline reproductions are labeled REPRODUCED, not current failures. [Receipt](gate-e/persistence/browser.json).
- **GEOMETRY PASS:** 0px per-image box/control shift across portrait/landscape/GIF/large/slow/failed/rapid navigation; viewport resizing remains responsive. Raw frame timings remain in the receipts. They are shared-cloud Chromium samples, not Windows zero-stutter certification; earlier concurrent stress pauses are retained.
- **BUILD MATCH PASS:** read-only Cloudflare settings confirm the isolated Worker digest and prefix binding match the final extension build. [Receipt](gate-e/cloudflare-worker-read-only.json).
- **INSTALLED ACCEPTANCE BLOCKED:** genuine unpacked-extension attempt in Chromium 155/Linux returned `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR`, response null. No policy bypass. [Exact request/build/blocker receipt](gate-e/installed/real-shelf-receipt.json).

## Remaining blockers / next actions

1. Verify the same extension identity in the owner's actual Windows Chrome: native rendered menu, actual OAuth and grants, ready right-click dispatch, restart and independent cloud outcome. Fixture ACK is not native rendering evidence.
2. Upgrade the existing production Worker only with explicit authority, using the retained approved upgrade path. Its current production resources were deliberately left unchanged; new metadata support requires the tested digest. The existing Worker-upgrade diagnostic now names the version/metadata requirement.
3. Google Drive/Dropbox/OneDrive remain their existing intentional placeholders; no OAuth registration or provider implementation was invented. The new remote-main provider authorization/compact-toolbar/manager issue documents are retained as queued work, not claimed fixed here.
4. Owner-profile historical CURRENT physical loss/recovery remains unverified; this run added no recovery platform or silent reset.

## Reproduction and release use

`npm ci`, `npm run test:focused`, `node --test right2cloud-module/tests/module.test.mjs`, `npm run build:extension`.

Browser commands use the existing Chromium executable override and produce their own explicit proof classes:

```sh
C2C_NARROW_PHASE=3 C2C_COMPOSITION_GATE=1 C2C_NARROW_EVIDENCE=/tmp/c2c-menu node scripts/test-phased-narrow-browser.mjs
C2C_GALLERY_GEOMETRY=1 C2C_GALLERY_LOADING=1 C2C_GALLERY_NAVIGATION=1 C2C_IMAGE_EVIDENCE=/tmp/c2c-gallery node scripts/test-image-gallery-browser.mjs
C2C_BOOT_WORKFLOW=1 C2C_BOOT_EVIDENCE=/tmp/c2c-login node scripts/test-boot-login-browser.mjs
C2C_RECOVERY_EVIDENCE=/tmp/c2c-persistence node scripts/test-current-recovery-browser.mjs
```

The existing CI job now runs the new composition and gallery gates; no live cloud mutations or credentials are added to CI. Required historical archives are prepared by that job. The Narrow checkpoint archive is `/tmp/c2c-working-checkpoint` from the immutable checkpoint commit. Live scripts require configured private credentials, the private isolated plan and explicit approved-write flags; use inherited proxy support (`NODE_USE_ENV_PROXY=1` here). Do not repeat provisioning against a production Worker as a test.

On Windows, after pulling the published main, run `npm ci` then `npm run build:extension`; reload the existing extension from `dist\click2cloud` in chrome://extensions. Do not uninstall or clear storage. Confirm the same ID `ajppphdiamdobknpamcheohmdbdbeoal`, existing destinations/login/approval and ordinary saves before/after restart. Any production Worker upgrade requires the explicit approved action above. Preserve configuration and independently verify the exact R2 key/bytes/metadata; do not treat Shelf text as proof.
