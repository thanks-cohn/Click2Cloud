# Restoration handoff — November 7, 2026

Implementation source commit: **9e8a16d09a53bb1b414d5fd1e34a190a3861160d** on `dev/p0-redown-restoration`, rebased on latest observed main **5a12e1a** (the incoming changes were owner documentation). This report/evidence commit is a later commit; the receipt pins the tested runtime revision and exact source digest. No main merge/push or production deployment performed. REDOWN original checkout remains clean and unchanged.

**Result: actual isolated Cloudflare remote acquisition and R2 byte verification work; full applicable REDOWN parity and installed Windows acceptance remain incomplete.** See [FUNCTIONAL-PARITY.md](FUNCTIONAL-PARITY.md) for the entire applicable workflow inventory, implementation ownership, evidence and prioritized missing capabilities. The three other providers are code gaps as well as external OAuth registration/verification gaps. This is not a claim that completing token registration alone makes them work.

## Repairs and source ownership

- Removed unsupported custom TCP/TLS/HTTP parsing egress. Cloudflare native HTTPS fetch now owns TLS/HTTP, with public URL/DNS validation and manual per-hop redirects. Native fetch may re-resolve: residual DNS rebinding race explicitly disclosed, no fictional literal-IP guarantee.
- Preserved known-length streaming, bounded unknown-length spool, conditional Keep Both, final R2 version/size verification and exact operation ownership. Corrected encoded Content-Length handling for native decoded bodies. Spool cleanup follows final verification and removes only identity-matching staging parts.
- Preserved useful source metadata with recognizable credential-query removal and bounded provider metadata; response filename/MIME inference and page URL source fallback added.
- Build includes expected Worker module digest. Old deployed code cannot masquerade as ready because its saved old plan agrees with itself. Shelf's explicit **Update existing Worker** uses existing repair API/plan/Worker; no automatic production update and no uncertain-operation replay.
- Added canonical `fileAction` through existing Universal File API and same signed Worker/DO owner: same-bucket mkdir/copy/move/rename/delete, recursive folders, scoped authorization, conditional copies and durable per-object journals. GUI context actions use API descriptors; transient clipboard carries only intent. New file transport is an internal provider port, not another public API or engine. Cross-bucket remains explicitly unsupported. R2 checked deletion is not atomic against external clients.
- Fresh stat/size/ETag before History GO TO; preserved original failed receipt and completed read-only inspection envelope.
- Fixed owner-approved Quick placement in existing `menu-spec.mjs`: four provider roots first, promoted Quick siblings omitted from CF child count, redundant Default Quick suppressed without preference changes. Existing Simple/Narrow/Depth configurations/projectors, registrar, resolver, identity, OAuth profile and setup ledger retained.
- Updated source comments/types, latest engine/API map and canonical workings JSON; immutable original and pre-restoration snapshots preserved and checked.

## Verification

| Gate | Result / artifact |
| --- | --- |
| Focused suite | **238 PASS, 0 FAIL**, 50,637.8ms; [focused.txt](focused.txt). Includes actual workerd/R2/DO, 70MiB local source, canonical file actions, paired evaluated REDOWN functions, native callback/generation and Quick routing tests. These are not live website/installed Chrome claims. |
| Additional immutable-baseline/current-source drift tests | **3 PASS**; [workings-tests.txt](workings-tests.txt). Added protection after the full suite; no production source changed afterward. |
| Real Chromium app | **20 PASS, 3 BLOCKED, 1 NOT_TESTED**; [browser/browser-results.json](browser/browser-results.json), screenshots. Genuine app/IDB with fixture provider/registrar, including API→GUI→API Quick and file actions, failed receipts, navigation, persistence and GO TO. |
| Genuine unpacked extension/Shelf | **BLOCKED**, Chromium155.0.8059.79 administrator policy. [real-shelf-receipt.json](real-shelf-receipt.json) records exact revision, build/source/Worker digests and describeCapabilities request; response null because install denied. No policy bypass. |
| Actual Cloudflare Worker + R2 | **PASS**, [live-provider.json](live-provider.json). Updated only preauthorized existing isolated test Worker, existing redown bucket, unique disposable prefix; production untouched. Environment API token, not owner Windows OAuth. |
| Actual byte proofs | Text2,262; PNG10,380; real302 redirect2,262; unknown-length1,048,576 bytes. Separate S3 GET bytes/hash match independently fetched source; exact File API stat/list key and ETag. |
| Negative real sources | expired.badssl HTTP526→SOURCE_UNAVAILABLE and stored blocked receipt; private127.0.0.1→SOURCE_DENIED before claim (no operation to inspect). No phantom success. |
| Actual file actions | mkdir/copy/rename, S3 byte readback, old-key404, recursive folder delete and cleanup404 in same live receipt. |
| Cleanup | Final matrix exact disposable objects confirmed absent. Initial test harness encountered gzip/weak HEAD ETag and refused uncertain deletion; corrected identity-encoding test request verified identity before cleanup. [cleanup-recovery.json](cleanup-recovery.json), prior partial matrix retained. |
| Build | PASS; [build.txt](build.txt). Manifest identity remains `ajppphdiamdobknpamcheohmdbdbeoal`, version0.3.9. No TS compiler run claimed. |

Before→after outcome evidence: old real isolated Worker failed in `source.fetch/headers` with `SOURCE_HTTP_INVALID/http-empty-response`, no ordinary object readback (historical `../save-receipt-repair/`). New production source in isolated Worker acquired and independently verified all four positive sources above. That proves removal of the demonstrated egress blocker, not installed Windows completion. No valid before/after installed Explorer latency benchmark was obtained. Existing local tests prove cached sorting and bounded viewport work, not equal or superior REDOWN real-user latency.

Deployed module digest in live receipt equals final build Worker digest: `IwTaIK4em1_mwIygmpbfULfJWUZln3ggKnG5suyu-NA`. Runtime source digest: `36d272768e49011074bbc1e13180fc2db10b3ed1074af8e4fb979a748c78741e`. No production code changed after this receipt.

The retained `browser/file-actions-failure.png` records the earlier fixture listing bug (the fake provider included the current folder as its own child). The fixture was corrected to match the actual R2 adapter. The final browser receipt and cross-surface screenshot passed; the historical image is not evidence of a remaining production failure.

## Windows acceptance on this branch (not yet merged)

In CMD, from the existing Click2Cloud checkout:

```bat
git fetch origin
REM This branch is local to the coding workspace until separately pushed.
REM Once made available, check out dev/p0-redown-restoration; do not reset user work.
npm ci
npm run test:focused
npm run build:extension
```

Load/reload the **existing extension** from `dist\click2cloud` at `chrome://extensions`; retain the same ID and browser profile. Do not remove the extension or clear storage. Confirm0.3.9. Open the Shelf, inspect saved destinations/default and login state. If existing Worker code is old, use **Update existing Worker** once: this is an explicit production update and requires owner approval; it preserves Worker name/binding/bucket and does not automatically replay blocked operations. No repeated setup authorization or bucket recreation should occur.

Test on ordinary public HTTPS text and image URLs. Right-click Cloudflare and verify direct save to chosen destination with no Shelf detour when READY. Inspect receipt, History and GO TO; independently check object bytes/key. Repeat same filename, test a custom folder and restart. Test redown Default + 4chan Quick: four provider roots then 4chan sibling, CF flat to redown; toggle Quick OFF and verify only one CF submenu, then back ON. Inspect API state/topology/ACK and compare actual menu. Capture safe error codes/stages if blocked; never copy tokens or raw sensitive URLs into diagnostics.

The branch has not been pushed or merged; these instructions explicitly depend on making the reviewed branch available. No claims about actual Windows outcome until receipts exist.

## Remaining acceptance blockers

Administrator policy blocks installed extension in this cloud browser. Owner Windows OAuth/renewal and actual native rendering/click/GO TO remain unverified. Other provider implementations/registrations, private/cross-bucket Explorer saves, generated/gallery sources, multi-selection mutation, uploads/archives/public-URL and richer previews remain listed gaps. Large live transfer, browser shutdown/restart recovery, concurrent external deletion races and comprehensive performance comparisons need further evidence. Full parity is therefore **NOT DONE**.
