# P1 — Destinations Manager: compact separated rows; remove internal debug summary from pop-out

**Reported:** 2026-11-09
**Status:** OPEN — owner-requested UI correction, not implemented by this document
**Area:** Shelf → Destinations Manager pop-out/dialog (NOT native Chrome right-click menu)
**Priority:** UX polish; preserve stable working version and current transfer behavior

## The owner's exact requirements

1. **Clear visual separation for each destination row.** A long list of saved Simple/Narrow/Depth locations must not look like a continuous sea of icons and text. Each row needs a legible boundary or thin horizontal divider, a clear primary destination title, and a secondary readable physical Cloudflare R2 bucket/prefix. Use compact, tasteful spacing and consistent alignment of row controls; avoid oversized cards or decorative clutter. Group/tabs for Simple, Narrow, Depth stay intelligible.
2. **Do not display the internal saved-config/debug summary in the Destinations pop-out.** Specifically remove the top paragraphs equivalent to:
   - `Saved locally: 1 Simple · 3 Narrow · 0 Depth. Availability depends on the connected account.`
   - `Saved Default: <account-id> · redown/`
   - and the corresponding generic `No default selected` debug/status line where it is part of the same header dump.
   
   The example counts and identifier are illustrative; remove these **types of messages for all states**, not only those literal values.
3. **The information must remain programmatically accessible for DEBUG/diagnostics**, with no replacement verbose user-facing debug box. Counts by mode, stored Default account/bucket/prefix, and relevant availability/connection facts should be derivable through the existing **trusted `getConfiguration` API** plus appropriate provider/readiness status, or exposed through a small authorized structured diagnostic operation if a necessary field is genuinely missing. Do NOT build a second configuration store or duplicate persistence mechanism just for debug output.
4. **Keep the important functional controls visible and understandable**, such as active Default and Quick Select state on appropriate rows, the `Change Visibility` eye, Edit and other relevant actions, and Clear Default wherever already appropriately offered. Removing the raw account-ID banner must not make it impossible for a user to tell which destination is selected as Default; use the row's existing state/control. Do not display raw account IDs just to convey ordinary location status.
5. **Preserve actual behavior**: no changes to saved configurations, row visibility, Default/Quick exclusivity, Depth's no-Make-Default rule, API authorization, Explorer navigation, TRUE REMOTE saves, or Cloudflare resources.

## Source-verified reason for the current problem (main as inspected November 9)

- `extension/app.mjs` function `manager(filter='simple',page=0)` creates the `Destinations` dialog with an initial paragraph beginning `Saved locally:` and another paragraph beginning `Saved Default:` (or `No default selected`). It interpolates `state.configs.simple.destinations.length`, `state.configs.nested.destinations.length`, `state.configs.depth.scopes.length`, `connection.state`, and `state.product.defaultTarget.accountId/bucketName/prefix`.
- `refreshState()` already fetches trusted `getConfiguration`, showing the underlying data exists separately from these GUI paragraphs.
- The individual destination row uses `.dest-row` and currently renders its controls together; ensure dividers and a compact layout are scoped to these rows without changing action/data bindings.
- **Debug data retention is NOT a requirement to show a Debug panel in the pop-out.** The owner specifically wants it programmatically accessible but out of the user-facing Destinations dialog.

## Expected compact presentation

Example (representative only):

```text
Destinations                        [Simple] [Narrow] [Depth]

Artwork                 [eye] [edit] [more]
Cloudflare R2 · redown/Images/Artwork
────────────────────────────────────────
Swole                   [eye] [edit] [more]
Cloudflare R2 · redown/body/arm/bicep/muscle
────────────────────────────────────────
Projects                [eye] [edit] [more]
Cloudflare R2 · redown/Projects
────────────────────────────────────────
```

Preserve functional Default/Quick controls with an orderly placement (inline status/compact toggle or a consistent row action group); the above is not authorization to remove them. Avoid icons for different rows blending together. Maintain usable hit targets, accessible labels, keyboard focus order, truncation that reveals full underlying paths on focus/tooltip, and narrow-width responsiveness.

**There should be no visible `Saved locally` mode-count banner, no `Availability depends on the connected account` boilerplate, and no raw `Saved Default: <account-id>` paragraph above the destination list.**

## Debug/access contract

- Programmatic authorized retrieval should return or allow computing:
  - saved config counts: Simple destinations, Narrow (internal `nested`) destinations, selected Depth bucket scopes;
  - default target (account identity, bucket, prefix), if selected;
  - relevant connection/readiness state (authoritative current source, not inferred from list counts);
  - optionally menu generation/visible-vs-hidden state, if already supported by the canonical diagnostics API.
- Counts are **saved configuration counts**, not necessarily currently available destinations. Keep this distinction in diagnostics.
- Do not place new account identifiers, sensitive tokens, or internal state in the ordinary pop-out. Respect existing API caller permissions and redaction when sharing/copying diagnostics. No secrets/passwords/URLs.
- Preserve existing `getConfiguration` and diagnostic capabilities. If additional API is needed, document schema, authorization and error model; GUI should not maintain a divergent debug copy.

## Acceptance tests

1. Open Destinations Manager in each Simple, Narrow, Depth tab (including zero entries and disconnected state): **no debug count banner or raw Default/account-ID paragraph**.
2. Verify every row has a clear divider/boundary, primary title, secondary physical location and consistently arranged controls at small and large Shelf widths.
3. For 20+ rows with paging/scrolling, icons and text remain visually associated with the correct row; hover/focus actions never act on adjacent entries.
4. Eye/Edit/Quick/Default/delete or additional actions still work with correct row identity, persistence and canonical API; no duplicate/removed buttons due to cleanup.
5. Programmatically retrieve or derive the same counts and Default identity via trusted APIs; connection availability remains its own source of truth. Do not require opening Destinations to inspect these facts.
6. Existing Default is intelligible from its row without showing the raw account ID; Depth still lacks Make Default.
7. No changes to cloud resources, saved user config, native Chrome right-click menu, successful TRUE REMOTE saves or unrelated Explorer behavior.
8. Report browser DOM screenshot/measurement evidence and distinguish actual installed Chrome tests from fixtures.

**This file documents a proposed UI change only; the current good-working application has not been modified.**
