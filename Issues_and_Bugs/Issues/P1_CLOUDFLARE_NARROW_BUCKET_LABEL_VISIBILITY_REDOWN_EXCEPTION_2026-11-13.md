# P1 ISSUE — Preserve non-redown R2 bucket labels under Cloudflare in Narrow/combined menu

**Owner specified:** 2026-11-13 15:24:33 CST (America/Chicago, UTC-06:00)  
**Status:** OPEN — product rule confirmed by owner; implementation and installed-Chrome acceptance NOT VERIFIED  
**Area:** Native Chrome right-click menu composition: Cloudflare provider, Narrow (internal `nested`), Depth, Simple  
**Observed example:** R2 bucket `valentiens`, child folder `2D`

## Owner-requested visible hierarchy

For a non-`redown` R2 bucket, preserve its name as a visible level underneath Cloudflare:

```text
Cloudflare >
  valentiens >
    Save here             -> bucket root valentiens/
    2D >                  -> valentiens/2D/ (and eligible descendants)
    ... other siblings
```

**Wrong for this requested rule:** `Cloudflare > 2D` with the real `valentiens` bucket title silently skipped.

**Explicit exception:** The bucket named `redown` may retain its established flattening/Cloudflare-root presentation. Do NOT apply the exception to other bucket names. Flatten only where the existing meaningful choices/descendants and independently configured action routes still remain reachable.

**Retain `Save here`** for a bucket root or intermediate folder whose menu item must be a parent submenu. Leaf nodes can save directly. The label's appearance must never change `target.bucketName` or `target.prefix`.

## Related independent rendering invariants

- Simple, Narrow and Depth are separate additive projections. Showing multiple modes must retain every configured and eligible action, including overlap at the **same physical R2 bucket/prefix**.
- Narrow A with custom per-level menu titles and Narrow B using natural folder names can both point into an existing Depth hierarchy; their labels, stable presentation identities and actions remain distinct.
- Depth selected levels (e.g. one bucket maxDepth 5 and another maxDepth 6, when actual folders extend to level 10) cap visible descendants for **that specific bucket**; no hidden levels are deleted and no sibling mode changes those limits.
- When **one** eligible physical save action exists and no eligible descendants, a flat Cloudflare action is acceptable; avoid invented empty submenus. When **multiple** destinations or visible descendants exist, preserve a navigable hierarchy, including non-`redown` bucket names.
- Repeated same-label items must not be silently used as substitutes for distinct intentional presentations; distinguish collisions with predictable titles/IDs, not loss of an action.

## Source explanation to investigate

`src/core/menu-spec.mjs` currently recognizes a Narrow bucket-root `branch` with `row.parentPlacement === null && !row.target.prefix && !row.explicitLevel`, then maps that placement directly to the Cloudflare parent instead of emitting a labeled bucket node. This explains why an uncustomized `valentiens` bucket can be skipped. Change the presentation rule without changing target identity or unintentionally altering the `redown` exception, Depth flattening or overlapping Narrow routes.

## Acceptance tests

1. Narrow-only, bucket `valentiens`, child `2D`: menu is `Cloudflare > valentiens > 2D` (with `Save here` where needed); actual click saves to `valentiens/2D/`.
2. `redown` special case retains existing compact behavior and correctly routes `Save here`; don't flatten away real descendants.
3. Multiple non-`redown` buckets keep each bucket title; one root-only location stays sensibly flat only when that does not violate the owner's explicit bucket-label rule (record exact exception decision in test).
4. Overlapping custom-labeled and natural-label Narrow entries remain separately reachable alongside Depth; don't collapse same-target independent choices.
5. No mutation of config, other modes or R2 folder structure caused by menu labeling; verify installed-Chrome menus and real save targets, not just source previews.
6. Regression-check shared Default/Quick and the associated [Narrow duplicate/trash defect](../Bugs/P1_NARROW_2D_DUPLICATE_ACCUMULATION_TRASH_UNRESPONSIVE_2026-11-13.md).

**This file records the owner's desired behavior, not a completed change.**
