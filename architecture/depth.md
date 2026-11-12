# Depth — selected Cloudflare buckets and truthful right-click nesting

**Project:** Click2Cloud  
**Recorded:** 2026-11-12 (America/Chicago)  
**Priority:** CRITICAL / P0 menu correctness  
**Status:** Architectural requirement; not a new implementation or claim of verified native Windows behavior.

## Governing rule

> **Depth is chosen by R2 bucket and a persisted maximum directory depth. A sole, root-only selected Depth bucket may render as one flat Cloudflare save entry ONLY if no other Cloudflare choices are displayed and its inventory genuinely has no eligible children. A bucket with even ONE child MUST branch, showing Save here for its root and the actual child tree. If more than one Depth bucket is selected, Cloudflare MUST branch into the selected buckets, each respecting its own selected depth and real directory structure.**

The **one-child exception** overrides the ordinary "one destination → one flat menu entry" optimization. Do not turn a nonempty Depth hierarchy into a flat root save just because exactly one bucket was selected.

## Selecting and displaying Depth

- The user saves one or more specifically selected **Cloudflare R2 bucket scopes** (bucket/account/connection identity) and each bucket's own positive **maximum depth**. The depth is chosen beforehand and retained until explicitly changed; the UI normally offers levels 1–10. At scope root, level = 0; immediate children = 1; grandchildren = 2.
- A selected bucket's menu targets come from **actual authorized R2 inventory**, including eligible directory/prefix paths and folder-marker objects. Do not fabricate a folder because the label looks like a folder.
- Only folders inside that bucket's configured depth can appear. At the maximum depth, an included node without further included children is a save leaf even when deeper folders exist beyond the limit.
- Selected scope, individually visible scope (eye), **Show Depth** mode checkmark, account eligibility, inventory completeness, and valid destination must all be considered. Hiding the mode or scope does **not** delete the scope or depth selection.
- Simple, Narrow (internally `nested`), and Depth are **independent additive modes**: the Chrome "Show" flags are not a mutually exclusive radio selector. Turning Depth ON must not turn Simple or Narrow OFF, overwrite Quick/Default, change the selected bucket, or change an existing folder path.

## Canonical right-click examples

These examples show the **Cloudflare portion** of the native menu; `>` means a submenu and `[save]` means a real clickable operation routed to the indicated R2 bucket/prefix.

### 1. Exactly one Depth bucket; only its root, zero eligible children

```text
Click2Cloud
  Cloudflare                         [save to redown/]
```

**Permitted FLAT case.** `redown` is the sole applicable Cloudflare entry; inventory is complete/fresh, its root exists, and it has no eligible children within selected depth. A needless empty flyout is not required. This exception does not permit silent flattening of multiple visible mode entries.

### 2. Exactly one Depth bucket; exactly ONE immediate child

```text
Click2Cloud
  Cloudflare >
    redown >
      Save here                      [save to redown/]
      Images                         [save to redown/Images/]
```

**MANDATORY NESTED case.** Exactly one eligible child is enough. Cloudflare must pop out; bucket root `redown` becomes a branch with **Save here** for root and the real child as a save leaf. Never replace this with a single `Cloudflare` save action to `redown/`.

### 3. One bucket with multiple levels; selected Depth 2

```text
Click2Cloud
  Cloudflare >
    redown >
      Save here                      [save to redown/]
      Images >
        Save here                    [save to redown/Images/]
        Artwork                      [save to redown/Images/Artwork/]
      Projects                       [save to redown/Projects/]
```

If `Images/Artwork/Deep/` exists but exceeds `maxDepth=2`, `Deep` must not appear. An internal node with included children has **Save here**; terminal nodes are clickable save leaves. Do not make users choose whether to save to a parent by clicking a non-actionable submenu label.

### 4. MULTIPLE selected Depth buckets; some with children, some root-only

```text
Click2Cloud
  Cloudflare >
    redown >
      Save here                      [save to redown/]
      Images                         [save to redown/Images/]
    archives                         [save to archives/]
    projects >
      Save here                      [save to projects/]
      2026 >
        Save here                    [save to projects/2026/]
        Launch                       [save to projects/2026/Launch/]
```

**MANDATORY Cloudflare submenu.** Every selected visible Depth bucket receives a distinct entry. Each has **its own saved depth** and only its own eligible child directories. `archives` has no child and remains a simple **save leaf inside the Cloudflare submenu**, not a fabricated empty nested flyout. `redown` and `projects` must keep their real hierarchies.

### 5. One root-only Depth bucket plus other checked modes

```text
Click2Cloud
  Cloudflare >
    My Simple destination            [save to configured Simple target]
    redown                           [save to redown/]
```

A root-only Depth bucket is **not** the only Cloudflare choice if there are other visible Simple/Narrow/Quick/Default choices. Cloudflare must disambiguate them instead of routing its single provider row silently to one target. The actual Narrow hierarchy must not be flattened. The selection/visibility controls must remain independent.

## Compiler decision, explicitly

Conceptual rules for the **existing one canonical compiler**; **do not implement a second engine**.

1. Read the persisted Depth scopes and their `maxDepth` values from canonical configuration.
2. Exclude Depth mode if Show Depth is unchecked; exclude individually hidden scopes without deleting them.
3. For each visible scope, use trustworthy, authorized paginated R2 inventory and include root plus eligible child folder nodes up to that scope's `maxDepth`.
4. For any included folder node with **at least one included child**, generate a `branch` and an explicit child save action labeled **Save here** targeting the node's own exact bucket/prefix; then add each real included child under it.
5. For included nodes with **no** included child, generate a `save` leaf targeting the exact bucket/prefix.
6. Compose with all other independently enabled Simple/Narrow/Quick/Default presentations, preserving display labels, stable presentation IDs, ancestor parent placements and exact target identity.
7. If exactly one actionable Cloudflare destination remains, with **no selected real hierarchy**, it may render as a flat provider leaf. In every other case, Cloudflare gets a provider submenu containing the required bucket/tree/other choices.
8. Never mark an uncertain inventory as "empty". On listing failure, stale pages, permissions failure or incomplete pagination, preserve prior validated safe menu or show a clear incomplete/disabled action. Do **not** silently flatten an unknown subtree or auto-route a root save to an unintended location.

**Scope count is not actionable row count.** One bucket can represent many destinations when it has children. More than one selected bucket demands a provider submenu even if each bucket has only a root.

**Folder discovery must be exact.** Directory marker objects and real prefixes count where a trusted inventory adapter returns them. Child existence means at least one eligible descendant inside configured depth. A file stored directly at root is not itself a directory.

## Persistence, identity and fault isolation

- Keep each Depth bucket selection and its own max depth across OAuth relogin, Chrome restart, Shelf crash, mode checkbox toggles, right-click menu regeneration, and storage migration. Failed reads do not mean an empty configuration.
- A hidden Depth bucket cannot expose its child rows; re-showing must restore the same scope. Hidden Simple or Narrow entries must not silently become visible because of a Depth change.
- Repeated Narrow presentations of the same physical target may have different saved UI labels and presentation identities where supported; preserve those identities without duplicating underlying remote writes.
- Depth Destinations Manager bucket/scope rows do not offer **Make Default** under the existing owner issue; Quick/Default elsewhere are independent.
- Menu item IDs, parent IDs, native ACK, click resolution and actual saved object keys must map to the **same exact bucket + prefix**. Menu display, successful click dispatch, History and remote verification must agree. "Registered menu" is not a verified upload.

## Source/API ownership — do not fork the engine

Current relevant Click2Cloud modules:
- `src/modes/depth/index.mjs`: selected scopes, per-bucket max depth, eligible folder projection, branch and Save here rows.
- `src/core/menu-spec.mjs`: deterministic composition of mode projections and Cloudflare native provider row shape.
- `src/core/menu-identity.mjs`: canonical account/bucket/prefix target IDs.
- `src/api/config.mjs`, `src/persistence/current-store.mjs`: validated non-destructive saved state and mode flags.
- `src/chrome/registrar.mjs` and `extension/background.mjs`: native Chrome menu registration and authoritative click routing.
- Trusted API `3+1.1`: `getConfiguration`, `previewConfigChange`, `commitConfigChange`, `previewNativeMenu`, `inspectMenuTree`, `inspectNativeACK`, `reconcileNativeMenu`, `dispatchSave` — check `src/api/service.mjs` for authoritative real signatures.

See also `latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md`, `Issues_and_Bugs/Bugs/P0_DEPTH_SINGLE_BUCKET_BRANCH_AND_NESTING_MISSING_2026-11-09.md`, and `Issues_and_Bugs/Issues/P0_RIGHT_CLICK_INDEPENDENT_MODE_DISPLAY_AND_ROW_VISIBILITY_2026-11-09.md`.

## CRITICAL acceptance matrix

| Test | Required menu/behavior |
| --- | --- |
| One selected Depth bucket, proven no children, no other Cloudflare targets | Flat Cloudflare save to root **permitted** |
| One selected Depth bucket with exactly one child at depth 1 | **Cloudflare > bucket > Save here + child**, correct two targets |
| Single bucket with children at depths 1–3 | Real nested levels; **Save here** on branches; no fake levels |
| Selected Depth 1 and deeper real descendants | Only in-range level; leaf at depth 1, no unexpected deeper options |
| Two root-only selected buckets | **Cloudflare >** two separate bucket root save leaves |
| Multiple selected buckets with mixed descendants/depths | Per-bucket branches and leaves, each own max depth |
| Sole root-only Depth scope plus visible Simple/Narrow choice | Cloudflare submenu with both; no silent default override |
| Depth + Simple + Narrow all shown | All modes preserved; Depth nesting remains intact |
| Mode toggle and row visibility eye | Correct include/exclude with **no config loss** |
| Stale, incomplete or failed R2 inventory | Do not misclassify unknown as empty or overwrite known menu |
| Browser/worker restart and OAuth reconnect | Same saved scopes/depth/target identities; registered native tree rebuilt |
| Real installed Chrome click on nested leaf | Actual object saved **and verified** under exact R2 bucket/prefix |

Validate source/unit tests, source-to-native menu plan, Chrome registration ACK, installed Windows Chrome submenu behavior and real R2 object separately. Existing historical source/isolated browser evidence is **not** blanket proof of installed Windows success.

**Explicit non-goal:** This document does not authorize resetting cloud buckets, changing OAuth, uploading test objects into production unexpectedly, or implementing a new competing right-click engine.
