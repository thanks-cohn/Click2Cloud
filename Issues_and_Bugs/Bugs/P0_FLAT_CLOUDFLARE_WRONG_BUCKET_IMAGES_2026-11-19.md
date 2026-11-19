# P0 — Flat Cloudflare right-click saves go to `images` despite only new bucket being configured

**Date:** 2026-11-19. **Status:** OPEN, owner-observed; root cause NOT confirmed. **Severity:** P0 destination integrity: potential unexpected cloud writes.  
**Build under investigation:** `codex/ux-filename-search-audit-2026-11-18`, Windows Chrome Click2Cloud v0.3.19, installed user build `1f366aa`. The bug may predate this branch.

## Owner report and screenshot

Owner removed `redown` as Default, reports **only one remaining saved destination**, a newly created bucket, and says **all saves via the flat `Cloudflare` menu go into the unrelated `images` bucket**. There must be no silent fallback to another bucket. The later supplied Chrome screenshot shows the Click2Cloud File Explorer with a bucket tree/list, but does **not** include the current native Chrome right-click menu target, latest configuration snapshot or a verified receipt. An earlier owner screenshot (November 18) visibly displayed a distinct top-level `images` Quick item alongside the `Cloudflare` submenu, so an old Quick route exists in historical visual evidence, but is **not proof it remains configured now**. Do not assume the user clicked that item, that it is still active, or that the wrong bucket is caused by a Quick shortcut.

## Source findings (2026-11-19 review)

- `src/core/menu-spec.mjs` composite `candidates` are projected saved Simple/Narrow/Depth rows, plus *only* an unassigned persisted Default; no enumeration of all R2 buckets for flat-save routing, and no fallback to bucket `images`. With `active.length===1&&!hierarchy`, direct Cloudflare leaf gets **that exact candidate target**.
- `src/api/config.mjs` `clearDefault` only clears Default; it doesn't remove persisted destination rows or Quick assignments. Removal of a destination can promote the sole remaining eligible target to Default.
- `src/core/action-resolver.mjs` verifies `stableId('action',targetKey(row.target))` and exact scope; `src/core/engine.mjs` uses the resolved row target and rejects stale current generations.
- `src/chrome/registrar.mjs` uses native acknowledged row by exact `menuItemId`; `extension/background.mjs` receives native clicks, checks generation, and dispatches their row target. Chrome menu desired/ACK or multiple installed extensions may differ from the visual saved list.
- `src/cloudflare/transport.mjs` checks plan bucket matches target; `src/cloudflare/deployment.mjs` binds `STORAGE` to intended R2 bucket, and `src/cloudflare/worker.mjs` checks destination bucket against `BUCKET_NAME`. These guardrails do not support an intentional cross-bucket fallback.

**Hypotheses, not findings:** old Quick assignment in a different mode, duplicate/hidden active destination, label/target mismatch, native menu generation mismatch, two installed extensions/context menu items, a past pending job or receipt misattributed to a new click, or a logic flaw bypassing route/binding checks. **Exact cause requires logs.**

## P0 investigation instructions — READ-ONLY FIRST

**STOP writing more test files to unexpected bucket.** Do not delete anything in R2, reinstall extension, clear Chrome extension storage, sign out or reset menus until evidence is preserved. Inspect only existing saves.

1. Export **SECURE** diagnostics and inspect last wrong-destination operation(s), capture native Chrome menu label, exact clicked `menuItemId`, acknowledged generation, immutable `row.target` (provider/account/bucket/prefix), `actionId`, route resolution, `remoteOperationId`, source URL, return state, and verified receipt's full destination. Do not log OAuth tokens, Worker secrets, raw signed grants or user content.
2. Read side-by-side **`getConfiguration`**, **`previewNativeMenu`**, **`inspectNativeACK`**, and **`getEngineHealth`**, with same account ID scoping. Compare `product.defaultTarget`, `configs.simple.destinations`, `configs.nested.destinations`, `configs.depth.scopes`, `product.show`, each `quick` flag, and actual native rows matching Cloudflare/Quick/images/new bucket. Identify any extra hidden or stale target.
3. Verify the onClicked event is coming from the *intended extension ID* and item/generation, not a separate `REDOWN Basic` extension or an old, duplicated Chrome registration. Record local ID only in private evidence.
4. Compare receipt `destination.bucketName` and `key` to read-only R2 object list/time metadata for the **same exact operation**. Distinguish actual fresh writes to `images` from earlier objects, pending operations, or browsing `images` in File Explorer.
5. Unit/regression fixture: create product with **Default null**, one **new-bucket** saved destination, no `images` in any config; apply native menu, invoke flat Cloudflare, assert target `new-bucket` end-to-end. Repeat after removing prior Default `redown`, deleting a previous `images` Quick (if one was configured), editing UI label only, after MV3 restart and Chrome menu reconcile. Any unexpected target must fail closed, not silently route.
6. Prefer source-level targeted fix + route/receipt verification; guard at click admission and Worker receipt so if clicked row and intended user-selected destination diverge, block explicitly and surface diagnostic. **Do not silently reset config or auto-create/re-route targets.**
7. Report actual root cause and exact code paths, tests, before/after snapshots, and Chrome proof. Do not claim fixed based on speculative deletion or refresh.

## Desired behavior

The only saved nonhidden eligible destination is the sole Cloudflare flat menu target, whether or not a Default exists; a separate Quick can exist only if it remains explicitly configured. No stale bucket survives as an eligible click once owner has removed its route and native menu acknowledged the change. Every receipt exposes the exact target and proof of where the object was written.

**Related:** [Next-Codex work](../../next-codex/README.md), [Canonical menu tests](../../tests/canonical-menu.test.mjs).
