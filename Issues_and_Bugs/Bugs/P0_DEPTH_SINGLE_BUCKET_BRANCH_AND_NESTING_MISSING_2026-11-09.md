# P0 — Depth bucket nesting missing; composite right-click display must preserve all selected modes

**Reported:** 2026-11-09
**Status:** OPEN — owner-confirmed reproduction and corrected requirement; implementation not verified
**Area:** Right-click menu / Depth / selected Cloudflare R2 bucket / Chrome native menu
**Companion architecture issue:** [Independent mode display and non-destructive visibility](../Issues/P0_RIGHT_CLICK_INDEPENDENT_MODE_DISPLAY_AND_ROW_VISIBILITY_2026-11-09.md)

## Exact bug

The user configured multiple Narrow destinations and potentially one Simple destination, selected a bucket for Depth, enabled Depth in the right-click **Show** display options, and the actual nested folders available in that Depth bucket **did not appear**.

This is a menu compilation/display bug, NOT authorization to discard Narrow or Simple entries, NOT a requirement to force a submenu for every Depth bucket, and NOT a request to make Depth exclusive.

## Canonical product nomenclature

- **Simple**: separately saved direct destinations (`configs.simple.destinations`).
- **Narrow**: user-facing name of the internally named **Nested** mode (`configs.nested.destinations`).
- **Depth**: selected bucket scopes plus numeric maximum folder depth (`configs.depth.scopes`).
- **Show in Chrome / display checkmarks**: independent booleans `product.show.simple`, `product.show.nested`, `product.show.depth` (plus existing `flat` presentation setting).
- **Individual Change Visibility eye**: independently hides/restores a specific saved destination or supported Depth bucket row without deleting it; separate requested UI/behavior.
- **Default / Quick Select**: separately configured choices, not substitutes for the Show checkmarks.

Do not describe `product.show.depth = true` as “switching exclusively to Depth.” The intended behavior is additive.

## Correct rule: real folder nesting determines branch versus leaf

When a Depth-selected R2 bucket has discoverable, eligible child directories within the selected maximum depth, the **Depth portion** of the Cloudflare native right-click menu must expose the real bucket/directory hierarchy.

**Single-bucket exception to flat-single-destination policy:** One Depth-selected **bucket with eligible subdirectories** must not be treated as one flat save action. It contains multiple navigable folder choices, so Cloudflare must branch and expose them even if there is only one selected Depth bucket.

If that bucket has **no** eligible subdirectories, no fabricated hierarchy is required; a flat bucket save action may be appropriate under existing menu rules.

Example with one selected `redown` bucket, directory `Images/Artwork`, and sufficient depth:

```text
Cloudflare R2 >
  redown >
    Images >
      Artwork [save action]
```

The exact necessary parent placements and optional `Save here` actions must be determined by actual folder hierarchy and Chrome's native constraints. Clicking the leaf must save under `redown/Images/Artwork/`, not a flattened/incorrect root.

## Cross-mode behavior — the corrected requirement

**Selecting or checking Depth must never invalidate, delete, replace or automatically uncheck existing Simple or Narrow destinations.** All mode-specific configs remain durable.

- **Simple + Narrow + Depth checked:** all contribute their applicable saved/eligible menu entries.
- **Only Depth checked:** only Depth's eligible entries are displayed, **without deleting or rewriting** Simple/Narrow configurations.
- **Simple + Depth checked:** show both.
- **Narrow + Depth checked:** show both.
- **Depth unchecked:** do not display Depth entries; its selected buckets and depth settings remain stored and return when checked again.
- An individually hidden destination stays configured and reversible through the row eye; the mode checkmark and eye are independent visibility gates.
- The existing Flat presentation option must not silently override selected Depth hierarchy or suppress a requested mode; document its intended interaction before implementation rather than silently reinterpreting it.

With overlapping destinations or shared ancestor folders, compose an intelligible native menu that does not drop actionable targets or erase mode-specific custom labels/hierarchy. Never turn an explicit Nested/Depth tree into flat actions merely by deduplicating identical destination targets. Honor native Chrome submenu/ID limits with truthful diagnostics, not false success.

**Important:** Display checkmarks are independent inclusion filters, **not a mutually exclusive `Simple | Narrow | Depth` radio selection**. They control menu visibility, not configuration persistence.

## Reproduction and expected results

1. Configure several Narrow paths; optionally one Simple location; select one Depth bucket with known nested folders and a sufficient numeric depth.
2. Check **Show Depth** without unchecking Simple or Narrow. Expect all checked modes to contribute; the Depth-selected bucket shows actual directory nesting.
3. Uncheck Simple and Narrow, leaving Depth checked. Expect only Depth entries, still nested; Simple/Narrow settings are untouched.
4. Uncheck Depth and recheck Simple/Narrow. Their previous destinations and menu titles return. Recheck Depth; its bucket and depth are unchanged.
5. Test only one Depth bucket **without** eligible child folders. A single flat bucket action is permissible; no artificial directory fabrication.
6. Test multiple Depth buckets and multiple directory levels, respecting depth limits, identities and permission/inventory status.
7. Toggle one row's **Change Visibility** eye where supported: only that entry disappears/returns, no deletion. An entire unchecked mode remains undisplayed regardless of individual eye state.
8. Persist and repeat after Chrome restart and OAuth sign-out/sign-in.
9. In actual Chrome select a deep Depth target and verify the object exists at the exact R2 bucket/key/prefix using TRUE REMOTE verification.

## Investigation boundaries (hypotheses, not asserted root cause)

- `src/modes/depth/index.mjs` `project` and discovery completeness.
- `src/modes/nested/index.mjs` independently maintained parent placements.
- `src/core/menu-spec.mjs` composite projection, `product.show`, Default/Quick/flat placement, loss of `parentPlacement` when reconstructing provider rows, and branch/leaf counts.
- `src/api/config.mjs` `setShowInChrome` and persistence.
- Native Chrome item registration, real parent-child IDs, apply ACK and selected-click dispatch.

## Acceptance evidence

Test checked-mode combinations, non-destructive persistence, one Depth bucket with/without descendants, multiple buckets, native menu hierarchy, selected real physical R2 key, visibility gates, Chrome restart and relogin.

Separate actual installed Chrome/R2 evidence from fixture receipts; do not claim production PASS without observed real behavior. Protect the prior working checkpoint and existing TRUE REMOTE save engine.

Related separate UX issue: [Depth entries must not offer Make Default](../Issues/P1_DEPTH_DESTINATIONS_MANAGER_NO_MAKE_DEFAULT_2026-11-09.md).

**No implementation or application-code changes are claimed by this issue record.**

Implementation update: Gate A source58d017f; representative fixture and isolated live Worker/R2 gates PASS. Actual installed Windows native acceptance remains BLOCKED/unverified. Exact receipts: `docs/evidence/composition-remaining/gate-a/verification.json`. Original incident text retained above.
