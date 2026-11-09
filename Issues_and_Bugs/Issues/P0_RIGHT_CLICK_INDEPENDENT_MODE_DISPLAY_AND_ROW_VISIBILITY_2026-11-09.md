# P0 — Right-click architecture: independent Simple/Narrow/Depth display and non-destructive visibility

**Reported:** 2026-11-09
**Status:** OPEN — requested architecture and UX behavior; NOT IMPLEMENTED
**Area:** Destinations Manager, Show in Chrome, native Chrome right-click menu
**Implementation work order:** [post-current Codex task](../../codex/CODEX_NEXT_RIGHT_CLICK_COMPOSITION_AND_VISIBILITY_2026-11-09.md)
**Related bug:** [Depth nesting and single-bucket exception](../Bugs/P0_DEPTH_SINGLE_BUCKET_BRANCH_AND_NESTING_MISSING_2026-11-09.md)

## Definitive product model

**Save configuration, display inclusion, and individual visibility are independent concerns.**

- A destination remains stored until explicitly deleted. Hiding or turning off display for a mode must NEVER delete, rewrite, invalidate, or silently unset its saved locations.
- User-facing **Simple** maps to `configs.simple.destinations`; display checkbox `product.show.simple`.
- User-facing **Narrow** maps to internal **nested** (`configs.nested.destinations`); display checkbox `product.show.nested`.
- User-facing **Depth** maps to `configs.depth.scopes`, with selected R2 buckets and `maxDepth`; display checkbox `product.show.depth`.
- Existing **Flat** is a presentation option (`product.show.flat`), NOT permission to erase explicitly enabled Narrow or Depth hierarchies. Resolve the interaction transparently; do not silently flatten a selected Depth bucket that contains eligible nested directories.
- All three mode display checkboxes are **nonexclusive**. Checking Depth is ADDITIVE; it does not automatically uncheck or suppress Simple or Narrow.
- Turning off a mode's display checkbox controls only Chrome visibility; turning it on restores the saved entries unchanged.

## Required combinations

| Show Simple | Show Narrow | Show Depth | Chrome content |
| --- | --- | --- | --- |
| ON | ON | ON | All three modes contribute |
| ON | OFF | ON | Simple plus Depth |
| OFF | ON | ON | Narrow plus Depth |
| OFF | OFF | ON | Depth only |
| ON | ON | OFF | Simple plus Narrow |
| OFF | OFF | OFF | No mode-specific configured save destinations; settings retained |

Provider placeholders and authenticated provider actions remain subject to their existing independent visibility settings; no phantom saving or false Ready state.

## Depth's specific rendering rule

Selecting a single Depth bucket is **not the same as selecting one leaf save destination**. If the selected bucket has eligible nested directories within configured depth, Cloudflare MUST expose a native submenu tree for that real hierarchy even if it is the sole Depth-selected bucket. This overrides the old one-location→flat-leaf rule in that case.

If no eligible descendant directories exist, a flat bucket-level action is fine; never fabricate folders or force depth nesting without actual descendants.

When several Narrow and/or Simple entries exist, they must not prevent the checked Depth bucket tree from appearing.

## Individual destination visibility — Change Visibility eye

Every saved Simple or Narrow destination row in the scrollable Destinations Manager has a directly clickable eye icon. Depth's saved **bucket/scope rows** also receive individual visibility where applicable; do not misrepresent dynamically discovered directory levels as separately saved destinations unless explicitly modeled.

- Hover tooltip is exactly **Change Visibility**.
- Click hides only that saved entry/scope from right-click display, without opening the editor.
- Click again restores the same entry.
- Hidden entries remain listed, editable, and deletable, with original paths, titles, bucket and depth retained.
- Mode-wide checkbox and row eye operate independently: mode checked AND row visible is required for a given configured entry to contribute. Turning a whole mode off does not reset its row eyes; turning it back on restores only individually visible entries.
- Narrow's **Hide All / Show All** is a DIFFERENT control: suppresses/reveals ancestor labels along a chosen Narrow path, but leaves the last directory actionable. The row eye instead removes/restores the whole save choice.
- Ensure hidden Default/Quick destinations are not resurrected by fallback or Quick promotion. Define a deterministic explicit rule and test it; never redirect saves to a hidden target.
- A hidden Depth scope should not accidentally publish its discovered descendant entries.

## Default and Quick Select — separate invariant

On any destination where both controls are offered, clicking **Default** turns off Quick Select for that destination; clicking **Quick Select** clears that destination's Default. Neither control is permanently disabled. Clicking the active control again makes it OFF. At most one global Default; persisted configuration must never leave both flags ON on the same target. Do not simply hide duplicate UI while retaining contradictory state.

Depth Destinations Manager rows must **not offer Make Default**: [separate issue](P1_DEPTH_DESTINATIONS_MANAGER_NO_MAKE_DEFAULT_2026-11-09.md).

## Menu compiler and API acceptance

Use canonical API for `setShowInChrome` and per-entry visibility; do not create a GUI-only state. A saved menu specification must preserve Narrow and Depth parent-child placements through composite compilation and native registration; avoid flattening or silently discarding configured paths when deduplicating overlapping physical targets. Explicitly resolve overlap without losing target routing or configured titles.

Inspect or repair `src/core/menu-spec.mjs`, `src/modes/{simple,nested,depth}/`, `src/api/config.mjs`, persistence and Chrome native registration/ACK, based on reproducible evidence, not guesses. Do not change working TRUE REMOTE upload, OAuth, Explorer read/download, cloud objects, or unrelated modules. Preserve the working checkpoint `checkpoint/click2cloud-working-before-major-upgrades-2026-11-09`.

## Acceptance matrix

1. Display each mode individually, each pair, all three, and none; no hidden config lost.
2. One Depth bucket **with** nested directories: actual submenu, real parent IDs and verified deep R2 target.
3. One Depth bucket **without** subdirectories: no invented folder tree; sensible direct bucket action.
4. Multiple Narrow paths with custom labels and shared ancestors, plus Depth; all requested structures and actionable destinations survive composition.
5. Eye toggles immediate, persisted, reversible, no deletion or editor opening; interactions with mode checkbox and hidden Default/Quick tested.
6. Disable then re-enable each mode; stored destinations unchanged, native menu accurately rehydrated.
7. Chrome restart and OAuth sign-out/re-login preserve display settings and configurations.
8. Independently verify GUI/API state, menu-generation and registration ACK, click dispatch target and actual R2 saved object where available.
9. Distinguish real installed-browser/live Cloudflare results from fixtures. An unperformed native installed test is BLOCKED/NOT TESTED, not PASS.

**Implementation is scheduled AFTER current in-progress fixes. This issue records the corrected architecture; no runtime fix is claimed.**
