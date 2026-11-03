# Legacy Destination Manager — useful interaction mechanics, harmful old coupling

**Actual source:** [V3 UI](https://github.com/thanks-cohn/REDOWN/blob/5041b5763541812c505c9cde6e8f79cb23a7b193/extension/beta/right-click-v3-ui.js), [first-open forensic reproduction](https://github.com/thanks-cohn/REDOWN/blob/94a1a5f0699eec904d989a3823d22f9bf2bd131d/FOREVER_WORKS/v3-plus-one-master-audit/05_FOLDER_BROWSER_FIRST_OPEN_FORENSICS.md), [old folder outline contract](https://github.com/thanks-cohn/REDOWN/blob/5041b5763541812c505c9cde6e8f79cb23a7b193/FOREVER_WORKS/v3/TREE_EDITOR_IMPLEMENTATION.md). **New owner contract:** [Destination Manager](../../destination_manager/).

## Mechanisms worth borrowing invisibly

- **Accessible tree navigation:** `role=tree/treeitem/group`, roving focus, `aria-expanded`, `aria-selected`, Arrow Up/Down/Left/Right, Home/End/Enter, keyboard typeahead (700ms), Escape popup handling, F2/keyboard rename and Delete where appropriate. These are existing mechanisms, not certification of assistive-tech quality.
- **Focus and form survival during rerender:** V3 captures current edit input value/selection and focused control index before replacing the outline; restores focused input, expanded rows and open menu details afterward. New React/DOM implementation must offer equivalent predictable focus/scroll restoration without reintroducing the typing-steals-focus bug.
- **Draft saving / conflict handling:** V3 uses expected revisions, serialized save queues, session draft recovery, a distinct `Save Changes`/Apply receipt and status. Reuse concepts with separate per-mode state and clearer persistence semantics.
- **Keep source folder names exact.** A folder row's real prefix is a separate field from its menu title. Breadcrumbs may be shortened visually but accessible exact location must remain inspectable, especially with duplicate labels/accounts.

## Confirmed V3 bug to avoid

On fresh load, account and bucket rows are automatically expanded but their folder pages are **not requested**. The bucket arrow toggles expansion only; its fetch path requires an `folder:` key, while the bucket has a `bucket:` key. Only clicking **Browse folders** sends the first root list request. The audit's local DOM fixture observed requests `0 → 0 → 1 → 2` (cold load, bucket arrow, Browse, child arrow). Fix by listing a bucket's immediate children on first expansion, not by scanning the whole cloud or requiring an extra page.

## Missing UX and concurrency details in the new proposal

1. **One tree, no ornamental controls.** The owner's definitive navigator is a conventional indented folder tree with **only an empty or checked circle** at left, disclosure chevron, folder icon and name. A checked circle represents ≥1 saved aliases at that exact location; clicking it starts a **new Add** flow, never bulk removal. No count badge, extra “More”, separate folder Browse button, or inline title editor.
2. **Tiny popup only.** `Simple | Narrow` for this new destination, optional menu title blank = terminal folder, preview, Cancel/Add. If adding to the inactive mode, persist there but do **not** silently switch registered native mode. This intentionally supersedes older tree/form complexity.
3. **Two screens, two jobs.** Browse = location selection; Existing Destinations = item-specific Rename / red X. Deleting one saved destination must not delete cloud objects, remove another alias or clear the fixed Simple `redown` default.
4. **Per-folder observable status.** At minimum `unknown/loading/partial/complete/empty/error/stale`, with explicit Load more/Retry on branch when needed. Global status-only strings confuse empty folder with failed request.
5. **Scoped request key:** exact `connectionId/accountId/bucketId/prefix/cursor` + account authorization generation + monotonically increasing request ticket. Ignore late responses after switching accounts, collapsing a branch, editing title or reselecting another folder; abort when supported.
6. **Initial discovery and cache:** fetch only visible/expanded children lazily, reuse fresh completed pages, allow manual branch refresh, preserve known paths on error. Page reload may seed trusted saved observations but must mark stale rather than promise real-time correctness. Never make Depth's private index the picker authority.
7. **Multiwindow and forms:** two editors can open, rename and delete same alias. Reject stale expected revisions, keep unsaved draft, offer Reload/Retry or deterministic rebase. Enter/Escape cannot accidentally toggle folder expansion; selection stays stable through async pages.
8. **Long folder names/accessibility:** expose full path via tooltip/ARIA, scroll to selected, preserve keyboard traversal and contrast across Porcelain/Midnight/Neon; honor reduced motion. Optional polish cannot block the add workflow.
9. **Native/clipboard safety:** a visual “Added” is not a verified native registration; show “Saved, pending Apply” until proper registry acknowledgment. A popup Cancel is no save, no checked state, no cloud write.

## Acceptance especially worth adding

Cold empty/multi-page/large bucket; first bucket arrow loads exactly one root page; repeated collapse/expand doesn't refetch unnecessarily; account swap ignores stale result; focus inside title input survives background listing completion; cancel doesn't check circle; two same-path aliases survive rename and red X; Depth tab hides the browser altogether; screen-reader tree semantics; real Chrome browser test, not just DOM fixture.
