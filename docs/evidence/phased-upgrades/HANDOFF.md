# Phased upgrade handoff — November 9, 2026

Development branch: `dev/phased-narrow-gallery-provenance`, based on main `9e8916d`. The baseline tag remains `checkpoint/click2cloud-working-before-major-upgrades-2026-11-09` → `3b24320138ff0ebbf50a0e6a912a5d2800038676`. REDOWN is read-only and unchanged. No merge, push, production deployment, provisioning, object overwrite or reset was performed. Extension0.3.18 retains its identity/API and unchanged Worker digest.

| Phase | Implemented production behavior | Representative gate / evidence | Runtime commit |
|---|---|---|---|
| 1 | Preserve actual Narrow ancestors through canonical composite compilation, bounded stable placement identities; exact target dispatch | PASS: checkpoint comparison, actual parent IDs/native callback ACK, real Shelf/API/IDB, independent R2 exact-key readback. Installed native UI blocked | `72c0432e15d6da059a033f66d26736b10db7d09d` |
| 2 | All/hide-all/custom ancestor visibility; deepest actionable; custom flags retained | PASS: repeated GUI/API/storage/relogin toggles; live Worker/R2 bytes under same physical prefix | `bc3e85a96421914c5d7308ce44180106331c9700` |
| 3 | Default/Quick mutually exclusive and togglable; per-row eye; hidden Default/Quick not resurfacing; legacy normalization without row loss | PASS: real disposable browser IDB/migration, GUI/engine parity; live Quick and restored-eye saves independently verified; hidden stale generation blocked | `5c66247a79c0f7ef1814676f786e3e6d75837787` |
| 4 | Responsive reserved gallery frame and fixed controls independent of intrinsic image/loading/error dimensions | PASS: measured470.3125px →0px maximum geometry shift; 26 browser gates incl. complete download regressions | `e6994d901948773934c32a011ec8e926e2449eae` |
| 5 | Isolated math/custom local media loaders | NOT IMPLEMENTED; next chronological phase | — |
| 6 | Previous/Next visual polish | NOT IMPLEMENTED; depends on5 | — |
| 7 | Authenticated immutable dual-hierarchy object metadata | NOT IMPLEMENTED; no Worker protocol/deployment changes | — |

Each phase directory contains verification.json, HANDOFF.md and raw receipts. Phase3 focused suite:302 pass/0 fail. Final Phase4 suite/build receipts are in phase4. The current workings JSON and API documentation track the changes, retaining immutable baseline snapshots.

## Proof boundaries / remaining acceptance

Live receipts use the real canonical compiler/registrar/engine and existing isolated Worker, create only unique test-prefix PNG objects, and independently signed-S3-read exact bytes/key. Callback Chrome registration and environment-provided authority are explicitly fixtures; these are **not** installed Chrome native user-click/OAuth proofs. Browser GUI tests execute actual app/API/IDB/decoder and OPFS; HTTP object bytes, OAuth, picker and contextMenus callbacks are fixtures.

The genuine unpacked-extension attempt at Phase4 revision is BLOCKED: `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR` in managed Chromium155/Linux. No bypass. Real Windows native menu rendering/click, extension OAuth, full Chrome restart and extension-to-cloud end-to-end acceptance remain unverified. Do not declare overall product or all seven phases PASS.

For authorized Windows acceptance: build this branch with `npm ci` then `npm run build:extension`; reload the existing extension identity without clearing storage. Retain existing login/destinations. Add the four-level Narrow path with customized titles, verify actual Cloudflare→human→money-maker→guns→swole parent hierarchy, dispatch ordinary public image and independently verify exact physical bucket/prefix/key. Repeat all/hide-all/custom, multiple/shared paths, Simple/Depth, Default↔Quick and eye hide/restore, then restart/relogin. Check gallery with portrait/landscape/GIF/slow/error images, and complete downloaded bytes. Preserve prior destinations and resources throughout. Browser fixture success does not replace this test.

## Reproduction

- `npm run test:focused`
- `npm run build:extension`
- `C2C_NARROW_PHASE=3 C2C_NARROW_EVIDENCE=/tmp/c2c-narrow node scripts/test-phased-narrow-browser.mjs` (checkpoint archive must exist at `/tmp/c2c-working-checkpoint`; derive with git archive, not a working-tree reset)
- `C2C_GALLERY_GEOMETRY=1 C2C_IMAGE_EVIDENCE=/tmp/c2c-gallery node scripts/test-image-gallery-browser.mjs`
- `C2C_HEADLESS=1 C2C_SHELF_EVIDENCE_DIR=/tmp/c2c-installed node scripts/test-shelf-extension.mjs` (expected policy block here)

Live scripts require configured credentials, the existing private test-Worker plan and separately approved new test-prefix writes. They never deploy. Do not copy credentials into reports.
