# Branch 1 implementation and verification handoff

**Status: implemented; automated checks PASS; mandatory installed-extension gate BLOCKED. Branch 2 was not created or started.** The master request explicitly requires stopping on Branch 1 blockers before creating Branch 2. No merge, tag, release, deployment or live Cloudflare mutation was performed.

## Exact revisions and sequence

- Latest remote customer-history base, checked at start and again at finish: `220e5f4e15baeb52fd600ad08f9078f8598a7a2f`.
- Unchanged annotated checkpoint tag resolves to `a3a672754156f88bb572bfb4275d1471f0ccb4a6`; tag object `02baceefd945e0fe4b16e334bc5de391a6ab899d`.
- Branch: `implement/explorer-aesthetic-foundation-2026-11-15`.
- `a660497a08db583727d189cb4717c5f1c98cf713`: More overlay + shared History loader, focused functional tests and evidence. This was committed and passed before aesthetic implementation began.
- `967f7238e20a1ebc25362c46b7471ed3c6848f5f`: Aesthetic API 1.0, High Polish, implementation docs/schema/example, visual matrix and History rapid-reopen/cross-page read-budget hardening. This is the final runtime-source commit. The following handoff/evidence commit changes documentation only.
- Main requirements were read at `9bdec3b7093fca740dc0af7b76ace27940d8ec79`. No main implementation code was merged. Two inherited issue-register documentation conflicts were reconciled with that main revision for ordinary merge compatibility; the baseline's review notes are retained in `INHERITED_HISTORY_NOTES.md`.

## Before / after

| Area | Before | After |
| --- | --- | --- |
| Explorer More | Edge hit-test reproduces clipping at 360px; nested overflow ancestors defeat local z-index. | Body portal + native popover top layer, viewport collision, resize/scroll anchoring; edge hit-tests pass at 1100/600/360. Focus, Escape, outside close and canonical command nodes preserved. |
| History preview | Text placeholder only. | Existing math/media/plain renderer and same gallery preference; independent preference reads, no extra cloud reads. Success/error/abort/collapse/offscreen/page/departure teardown; rapid reopen retries; global two-read budget. |
| Appearance | Standard and independent Light/Dark. | Same Standard plus High Polish through one isolated, versioned declarative host; separate local preference, safe fallback and no privileged package code. |
| Core behavior | Existing save/auth/configuration/History APIs. | No save routing, auth, provider scopes, remote writer or native compiler changes. Tests retain exact data and pending reads during appearance switching. |

API implementation: `docs/api/AESTHETIC_API_V1.md`, `AESTHETIC_PACKAGE_V1.schema.json`, `aesthetic-high-polish.example.json`. Runtime source is `src/aesthetic/host.mjs` / `packages.mjs`, trusted presentation adapter `extension/aesthetic.css`. The existing loading renderer was not rewritten. No URL functionality or URL CLI is implemented on Branch 1.

## Verification

| Command/check | Result/evidence |
| --- | --- |
| Baseline `npm test` | PASS 534/534. |
| Final `npm test` | PASS 539/539; `full-test.log`. |
| `npm run test:focused` | PASS 465/465; `focused-test.log`. |
| `node --test right2cloud-module/tests/module.test.mjs` | PASS 49/49; `save-module-test.log`. |
| Aesthetic + workings focused checks | PASS 10/10; the five new aesthetic tests also run in the full suite. |
| `node scripts/test-foundation-browser.mjs` | PASS 12 gates, production app/API/IDB with fixture provider; `final-functional.json`. Math/plain/PNG/GIF/MP4/fallback, failure, cancellation, rapid reopen, background/reduced motion, zero remaining test Blob URLs/RAF. |
| `node scripts/test-customer-history-browser.mjs` | PASS 11 gates; `history-browser.json`. 101 operations, 25/page, structured export, exact GO TO across file types, bounded previews and toolbar regression. |
| `node scripts/test-aesthetic-browser.mjs` | PASS 16 gates; `aesthetic-browser.json`. Full visual matrix, UI preference persistence, zero engine calls/data changes on toggle, 30 mid-read switches preserving History DOM/read, reduced motion. |
| `npm run build:extension` | PASS at runtime commit `967f723…`; `build.log`. |
| `C2C_HEADLESS=1 npm run test:shelf:extension` | **BLOCKED**, exit 2: `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR`; `native-extension.json` / `.log`. Exact source revision and digest are in the receipt. Policy was not bypassed. |
| Windows installed Chrome, real native Simple/Narrow/Depth saving, real OAuth/R2 readback | **NOT VERIFIED** in this environment. Unit/local-workerd evidence is separate. |
| Live public access/domain/DNS changes | **NOT RUN**, no authorization and no changes made. |

An interim full-suite run saw a stale workings fingerprint because source was edited while the suite was running. The map was updated and the final suite was rerun against stable source: 539/539. Final source is unchanged after the tested runtime commit. No failures are being relabeled as passes.

The visual review and remaining subjective/accessibility/platform gaps are in `VISUAL_REVIEW.md`. The final checks do not establish owner Windows behavior or close pre-existing Windows Depth issues. The built-in package intentionally exposes bounded declarative tokens; public installation and unrestricted third-party styling are not implemented.

## Required next step and branch relationship

Use Chrome that permits unpacked extensions and verify the genuine Shelf/native regression gate with this exact source, without changing the owner's normal profile or Cloudflare resources. Preserve the Branch 1 head while resolving any resulting issues. Only after the gate passes, create `implement/explorer-aesthetic-plus-urls-2026-11-15` directly from the final verified Branch 1 SHA. Then implement the detailed URL specification and rerun all Branch 1 checks. No Branch 2 ancestry or URL test result exists yet; claiming either would be false.

Comparison commands:

```sh
git log --oneline 220e5f4e15baeb52fd600ad08f9078f8598a7a2f..implement/explorer-aesthetic-foundation-2026-11-15
git diff --stat 220e5f4e15baeb52fd600ad08f9078f8598a7a2f..implement/explorer-aesthetic-foundation-2026-11-15
git merge-base --is-ancestor 220e5f4e15baeb52fd600ad08f9078f8598a7a2f implement/explorer-aesthetic-foundation-2026-11-15
# After native verification and creating/finishing Branch 2, the required check is:
# git merge-base --is-ancestor <verified-branch1-head> <branch2-head>
```

A read-only `git merge-tree --write-tree origin/main <branch1-head>` checks compatibility; it does not merge branches or move refs. The initial preview found only the two inherited issue-document conflicts. They were reconciled without main code import and without losing the baseline review notes. The final preview passes with no conflicts; see `merge-compatibility.json`. Later unreviewed changes can still introduce conflicts.
