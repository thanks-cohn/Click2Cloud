# P0 — Depth-selected bucket must expose its folder nesting, including when it is the only Depth location

**Reported:** 2026-11-09
**Status:** OPEN — specification correction; no implementation yet
**Area:** Destinations Manager → Depth bucket selection → Chrome right-click native menu

## Exact user requirement

**Depth is not required to create a submenu just because Depth mode is selected.** The requirement applies to the **bucket selected for Depth** and its actual available directory structure.

When a user selects a Cloudflare R2 bucket for Depth and that bucket **contains eligible nested directories**, Chrome's right-click menu **must show that real folder hierarchy** to the chosen depth. It must not flatten the bucket into a single Cloudflare save action, silently omit nested folders, or fall back to Simple/Narrow selections.

**Crucial exception to the old flat-single-location rule:** The rule “when there is only one destination, Cloudflare is a flat menu entry” **is superseded when the only Depth-selected location is a bucket with eligible nested directories**. The one bucket represents many potential nested destination choices, not one flat leaf. Cloudflare must branch to expose them.

Conversely, if that bucket contains no eligible subdirectories, there is **no artificial nesting requirement**. Don't fabricate folders or a submenu just to satisfy an always-branch rule. Present its valid bucket-level action or honest empty/unavailable state under existing behavior.

## User-observed bug

After configuring multiple Narrow destinations and perhaps one Simple destination, selecting Depth does **not display nested Depth options**. The selected bucket's actual eligible directories need to appear, independently of the existing Simple and Narrow selections.

## Examples

**A — One selected Depth bucket WITH nested folders:**

Physical bucket `redown` contains `Images/Artwork/`. Show Chrome's genuine nested hierarchy, e.g.:

```text
Cloudflare R2 >
  redown >
    Images >
      Artwork   [Save / Save here]
```

Depending on actual menu presentation policy, bucket-level saving may be available through a `Save here` leaf. The important guarantee is that the real nested folder choices remain accessible.

**B — One selected Depth bucket WITHOUT subdirectories:**

Physical bucket `redown` has no eligible directories. A single flat bucket-level action is acceptable. **Do not force a fake nested Cloudflare menu.**

**C — One Depth bucket plus configured Simple and Narrow entries:**

Set several Narrow destinations and one Simple; select one bucket for Depth, select Depth display. Expect the eligible bucket directory tree, not a flattened list of Simple/Narrow targets. Switching modes must not erase or corrupt other configurations.

**D — Multiple Depth buckets:** Each selected bucket's own eligible hierarchy must be represented, respecting account/bucket identity and configured depth.

## Implement / verify

1. Diagnose saved Depth-selected bucket(s), applied visibility/show mode, folder inventory availability and completeness, `src/modes/depth/index.mjs`, `src/core/menu-spec.mjs` canonical composition, and Chrome native parent IDs. The cause is not yet proven.
2. Determine branch-vs-leaf using the number and shape of **actual eligible displayed directory choices**, not merely “one selected Depth bucket.”
3. Respect configured depth and folder discovery, with truthful behavior if inventory is stale/incomplete; no invented folders.
4. Verify the same selected nested directory maps to the exact real R2 bucket/prefix and works with TRUE REMOTE verification. No changes to upload engine.
5. Keep Simple and Narrow independent; keep normal flat-single-location behavior where appropriate outside the Depth nested-bucket exception.
6. Follow separate issue `Issues_and_Bugs/Issues/P1_DEPTH_DESTINATIONS_MANAGER_NO_MAKE_DEFAULT_2026-11-09.md`: Depth destination-manager rows must NOT offer Make Default.

## Acceptance

- **One Depth-selected bucket, with 2+ eligible path levels:** real nested Chrome submenus, appropriate save actions, verified destination prefix, even though only one bucket was selected.
- **One Depth-selected bucket, no eligible subdirectories:** valid flat/bucket action is permissible, no fabricated nesting.
- **Depth chosen after Narrow/Simple configuration:** actual eligible Depth bucket folders appear; previous modes remain intact.
- **Depth depth-limit change:** eligible presented hierarchy changes to match the configured limit.
- Native parent/child IDs, apply acknowledgement, click dispatch and live R2 target where possible must be inspected. Do not claim real Windows Chrome acceptance from fixture-only tests.

No application code was changed by this record.
