# V3+1 Right-click Destination Manager — definitive UI and identity contract

**Owner direction (2026-11-03). Status: proposed UI + testable neutral model, NOT a deployed Chrome/REDOWN feature.**

## Final minimalist circle → popup flow (owner's latest decision)

**Supersedes earlier popup options and folder count badges.** Keep the navigator **literally a standard indented directory tree**. Each row shows just a **circle on the left**, a separate expand chevron, the folder icon and its real folder name:

```text
○ ▾ redown
    ○ ▾ Photos
        ✓ ▾ Weddings
            ○   2026
```

A circle has exactly **two appearances**: empty (`○`) or filled with a checkmark (`✓`). There are **no numbers, badges, mode labels, per-row action menus, or count markers** in the navigator. Filled means **one or more saved destination entries reference this exact folder in either mode**; it is not a unique checkbox tying the folder to a single saved entry.

**Clicking any circle, including a filled circle, always starts a new Add Destination flow.** It temporarily appears checked while the popup is open; Cancel discards that preview, without creating an entry. In the small anchored popup offer **only**:

1. **Simple | Narrow** choice (preselected from the current Simple/Narrow editor tab; user may change it here).
2. **Menu title** — one optional blank input. When empty, use the last directory name; for a selected bucket root, use the bucket name. To use the bucket name for a subfolder, the user can type it—no separate label-choice widget.
3. A compact **right-click preview** that reflects the chosen mode and title.
4. **Cancel** and **Add destination**.

**After Add destination**, generate a fresh immutable destination ID, persist the selected entry through **only that mode's transactional config writer**, then close the popup and display a brief unobtrusive **“Added to Simple”** or **“Added to Narrow”** confirmation, leaving the user in Browse Folders. If choosing the other mode in the popup, save in that mode **without silently changing the currently active registered native menu**. The top Simple/Narrow/Depth switch still controls the active editor/menu presentation; the popup choice controls the *new entry's owning mode*.

A second click on the same checked circle starts another Add flow, permitting **two entries with the same cloud path and identical visible title**. They are independent because they have distinct immutable IDs. **Existing Destinations alone** handles individual menu-title rename and red `×` removal. A red `×` removes one saved entry, never the underlying cloud folder; when the last alias of that exact path is removed, its navigator circle becomes empty again.

Depth still hides this entire tree and all destination popups, showing only its own bucket checkmarks and depth indicator. This UI contract does **not** grant Simple or Narrow access to Depth's internal graph/journal.

A duplicate-title warning may be a subtle note in Existing Destinations but **must never add a blocking extra step to the navigator's Add flow**. Preserve two identical titles if the user intentionally adds them.

## Layout: three modes at the top

```text
Right-click Destinations
[ Simple ] [ Narrow ] [ Depth ]                 <- primary mode switch

Simple / Narrow:
[ Browse Folders ] [ Existing Destinations ]    <- secondary view

Browse Folders:
  (✓) ▾ 📁 redown
       (○) ▾ 📁 Photos
            (✓) ▾ 📁 Weddings                 <- one or more aliases exist
                 (○) 📁 2026
  (○) ▾ 📁 bucket-1
  (○) 📁 bucket-2

Circle click -> anchored popup
  [ Simple ] [ Narrow ]                        <- for THIS new entry
  Menu title (optional): [                    ]  <- blank means lowest folder
  Menu preview: ...
  [ Cancel ] [ Add destination ]

Existing Destinations:
  Mode        Menu title           Exact cloud path             Actions
  Simple      Wedding Archive      redown/Photos/Weddings       [Rename] [×]
  Simple      Family Photos        redown/Photos/Weddings       [Rename] [×]
  Narrow      Weddings             redown/Photos/Weddings       [Rename] [×]

Depth:
  [x] redown       [ ] bucket-1      [x] bucket-2
  Menu depth  [------●--------] [4]
  (no tree, no folder label popup, no Existing Destinations subview)
```

### Directory and selection behavior

- Simple and Narrow share a **neutral directory-picker UI**, not each other's implementation. It is a conventional file directory with modest 16–20 px descendant indentation, thin optional guide lines, separate expand chevrons and circles/checkmarks on the **left** of each folder.
- The circle **opens an Add Destination popup** even if this location already has one or more entries. Show only an empty or a checked circle; **no count badge**. A checked circle simply means at least one saved entry already points here. Never toggle/delete a saved record ambiguously from a single circle; Existing Destinations is the editing/removal surface.
- Popup has exactly a **Simple/Narrow** choice, one optional initially blank menu-title input, a small preview, Cancel and Add destination. Blank resolves to terminal folder name (or selected bucket root name). Do not show additional label-source buttons. The top switch governs current menu/editor mode; popup selection controls the **new entry's owner**, which may differ without silently switching the native menu.
- Simple emits **one flat menu leaf per saved entry**. Narrow emits the selected path with true ancestors and only the terminal segment renamed. Depth's private engine is not imported or modified by either.
- Multiple entries pointing to an **identical provider/account/bucket/prefix** are allowed. Multiple entries with **identical visible titles** are ALSO allowed, simultaneously, after optional collision confirmation. They do not collide because every saved entry receives its own **immutable, opaque destination ID** on creation. The native registry ID is namespaced by mode plus saved ID. **Titles, file paths, and mode selection are not identity keys.**
- Clicking Rename updates only the chosen record's `menuTitle`; it does not alter its ID, cloud target, sibling aliases, or provider objects. Clicking the red **×** removes only that record from the relevant mode's selected list; it never deletes the remote folder, other aliases, or another mode's entry. No deletions in the navigator. A hard-coded `redown` default may be hidden/reduced to one flat `Cloudflare` save leaf but cannot be deleted as a remote bucket via this UI.
- `Existing Destinations` can show `All` (both Simple and Narrow) with explicit mode tags, plus `Simple` and `Narrow` filters. The aggregation is **read-only**. Each Rename/Delete command is routed only to that row's owning mode state reducer. Only the active mode is registered in Chrome's native menu, even though both modes' saved entries are visible in the manager.
- A default per-mode draft is retained when switching top tabs. Switching tabs alone never registers a half-edited menu. `Save Changes / Apply` applies **one selected mode's finished plan** via the neutral registrar with explicit native acknowledgement and rollback on error.

### Depth is visually and logically separate

Selecting **Depth** completely hides the folder tree, folder circles, popup, and Existing Destinations view. Show only **bucket checkboxes and the numeric depth indicator (1–10)** plus shared Apply/status controls. This setting controls only the right-click menu's visible depth, not the long-term Depth-owned full-cloud inventory. Depth never reads any Simple/Narrow saved aliases, and changing Depth settings does not mutate them.

### Onboarding-specific Simple rules

Simple-only Cloudflare login/R2 entitlement, automatic exact lowercase `redown` provisioning, and initial bucket-root suggestions are documented in `../simple/original_proposition/`. The default `REDOWN → Cloudflare` flat action saves to `redown/` if optional destinations are all hidden/unchecked. After a user deliberately clears optional selections, **no new buckets are auto-reselected**; they add/check desired entries manually.

### Architecture handoff

Neutral authorized folder listing -> neutral tree manager -> `{mode, id, target, title}` typed intent -> **only chosen mode's reducer** -> finished menu descriptors -> neutral Chrome registry. No imports between Simple, Narrow, Depth or Time Machine. The private Time Machine tracking subsystem neither adds nor deletes menu shortcuts.

## Regression acceptance

1. Two Simple entries with identical title and exact same cloud prefix are both visible as distinct rows, both generate distinct native IDs, and both resolve to the correct same target.
2. Add the same folder twice with different labels, then once as Narrow; all three records exist independently; changing active mode doesn't delete inactive records.
3. Rename just one; only its label changes, internal ID and exact target stay identical. Delete only one using ×; the other entries remain, and zero provider deletion commands are issued.
4. Circle is only empty/checked, with NO counts. Clicking any circle (even checked) opens the same minimal popup to add another alias; cancel changes nothing.
5. Duplicate **title** warning can be acknowledged and accepted; same-folder/different-title never causes unnecessary collision-blocking.
6. Simple/Narrow use an indented, lazily expandable tree with separate chevron and circle; Depth hides it entirely and shows only buckets + depth.
7. Existing Destinations All/filtered views show both modes with correct owner and do not leak state changes across reducers.
8. Unchecking/clearing all optional Simple entries leaves exactly one default `Cloudflare` save leaf targeting `redown/`, and later new buckets remain unchecked.
9. Save Changes/Apply never claims installed native success until Chrome acknowledges generation; failed registers retain editor draft and previous live plan.
10. File hierarchy is read via an independent neutral provider adapter, NOT another mode's private inventory/cache/journal.

Reference modules are illustrative only. Real provider auth, IndexedDB persistence, UI event handlers and installed Chrome tests remain implementation work.
