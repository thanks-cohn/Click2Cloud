# NEXT CODEX RUN — Right-click composition, Depth nesting and non-destructive display visibility

**Status:** READY FOR LATER. **Do not start until the current Codex work is finished/reconciled.**
**Repo:** `thanks-cohn/Click2Cloud`
**Work issue:** [Right-click architecture contract](../Issues_and_Bugs/Issues/P0_RIGHT_CLICK_INDEPENDENT_MODE_DISPLAY_AND_ROW_VISIBILITY_2026-11-09.md)
**Depth bug:** [Depth missing real selected-bucket nesting](../Issues_and_Bugs/Bugs/P0_DEPTH_SINGLE_BUCKET_BRANCH_AND_NESTING_MISSING_2026-11-09.md)
**Depth UX:** [No Make Default on Depth rows](../Issues_and_Bugs/Issues/P1_DEPTH_DESTINATIONS_MANAGER_NO_MAKE_DEFAULT_2026-11-09.md)
**Previously filed broader staged roadmap:** [Phased Narrow/gallery/provenance work order](../docs/requests/2026-11-09-phased-narrow-gallery-r2-provenance.md)
**Known-good checkpoint:** `checkpoint/click2cloud-working-before-major-upgrades-2026-11-09` (`3b24320138ff0ebbf50a0e6a912a5d2800038676`).

## Starter instruction to Codex

**First read all three linked Issues_and_Bugs entries and inspect the actual latest branch/main and active work. Do not overwrite or re-implement the existing in-progress Narrow/gallery/provenance modifications.** Determine which requirements have already been implemented, then fix only the remaining right-click architecture gaps, in order. Preserve the checkpoint and uncommitted user changes. No reset, backup detour, or new architecture platform.

The user requires three independent retained configuration families: **Simple**, **Narrow** (internally `nested`) and **Depth**. The **Show in Chrome** checkmarks `product.show.simple`, `product.show.nested`, `product.show.depth` are independent, additive visibility filters; NOT mutually exclusive mode selections. Checking Depth **must not uncheck, hide, invalidate or delete** Simple/Narrow. Unchecking a display mode hides only that mode's entries in Chrome; switching it back on restores existing saved entries and custom labels.

### Order / gates

**Gate 0 — baseline / concurrency check**
- Inspect current branch, diff, latest main, in-progress Codex commits, active tagged checkpoint and current tests.
- Preserve prior work. Do not blindly reset files or push a conflicting overwrite. Confirm which parts are still broken before patching.
- Protect working login/logout, TRUE REMOTE verified save, image read/download and user settings.

**Gate 1 — Depth bucket discovery and native tree (fix the bug first)**
- Reproduce current user observation: existing multiple Narrow and perhaps one Simple destination, Depth checked/selected with an R2 bucket that has real descendant folders; Depth nested menu absent.
- Trace `configs.depth.scopes`, inventory complete/stale state, `src/modes/depth/index.mjs`, `src/core/menu-spec.mjs`, native adapter parent IDs and ACK.
- Ensure a **single Depth-selected bucket with eligible subfolders yields a genuine nested Cloudflare submenu**, overriding the generic single-save-leaf flat rule. Never force fake nesting for a bucket without eligible folders.
- Respect per-bucket `maxDepth`, account/bucket identities, real R2 prefix and unchanged TRUE REMOTE save operation.
- Verify parent IDs, actionable folder path and correct save object in R2 if live access exists.

**Gate 2 — independent additive mode checkmarks and composite menu**
- All 8 combinations of Simple/Narrow/Depth display booleans yield correct visibility while all mode-specific configs remain intact.
- A checked Depth tree must remain nested **alongside** checked Simple and Narrow entries. A checked Narrow path must retain custom ancestor labels and nesting. Fix flattening or loss of parent placement in composite compiler.
- Keep original flat provider placeholders and flat-single-action presentation policy **except where an explicitly selected Narrow/Depth hierarchy requires genuine branching**. Existing `product.show.flat` must not silently discard checked mode trees; make its interaction explicit and test it.
- If identical physical destinations appear through multiple modes, compose a deterministic, usable native menu without silently dropping the mode presentation/selected path; check label collisions, Default/Quick placement and Chrome item limits.
- Turning mode off changes display state only, not saved paths, buckets, depth, labels, visibility flags or R2 objects. Turning back on restores exact configuration.

**Gate 3 — individual Change Visibility eye (non-destructive)**
- In the scrollable Destinations Manager put a directly clickable eye on each saved Simple/Narrow destination row and each applicable selected Depth bucket/scope row. Hover tooltip exactly `Change Visibility`; no edit dialog needed.
- Eye OFF hides that row's save choice (or selected Depth bucket tree) from right-click while preserving the entire configuration, and remains visible in Manager. Eye ON restores it.
- Mode checkbox is a separate AND gate: `mode checked && row visible` to contribute to menu. Unchecking a mode does not modify individual eyes.
- **Narrow Hide All / Show All** remains distinct: collapse ancestor labels to the *last directory* versus re-expand; it never removes the destination. Do not conflate it with the row eye.
- Avoid resurrecting a hidden destination via Default fallback or Quick promotion. Define deterministic behavior, test with Default/Quick flag interactions and stale menu generations.
- Use canonical API with persistence and API/GUI equivalence. Avoid gratuitous state stores.

**Gate 4 — cross-control invariants and Depth UX**
- On destinations supporting both, Default and Quick Select are clickable mutually exclusive switches. Selecting one clears the other; toggling the active one off yields neither. One global Default max; saved state must reflect actual choice rather than merely visually hiding a duplicate.
- Depth Destinations Manager rows do not offer **Make Default**, per separate issue. Existing Default elsewhere is unchanged.
- Confirm unaffected Simple/Narrow/Depth independent settings under frequent mode/eye/default/quick changes.

**Gate 5 — real regression / evidence**
- Test all-mode matrix, one Depth bucket with/without actual child directories, multiple Depth buckets, overlapping Simple/Narrow, custom Narrow labels and hidden ancestors, per-row eye, restored configurations, restart/login, native Chrome ACK and correct save target.
- Unit/browser fixtures useful but not substitutes for actual installed Chrome. Label each receipt as fixture, live-provider, installed/native, BLOCKED or NOT TESTED. Do not declare product PASS until real save works.
- Do not alter Cloudflare resources except explicitly authorized test objects, nor redo unrelated gallery or R2 metadata work.
- Commit focused changes with descriptive SHAs and report before/after behavior, exact files changed and remaining limits.

## Hard invariants

`configured != visible` — hiding is not deleting.

`Simple/Narrow/Depth` display flags are independent.

`Depth one selected bucket with eligible child directories => nested directory choices`.

`Depth one selected bucket without child directories != forced nesting`.

`Narrow Hide All => final directory still actionable at unchanged physical prefix`.

`row eye OFF => that configured entry omitted without erasure`.

`Default ON on target => Quick OFF; Quick ON on target => Default OFF` where those controls exist.

`no fake success`, `API ↔ GUI parity`, `preserve currently working code`.

**This file is a queued work order only. It must not disrupt the ongoing Codex implementation.**
