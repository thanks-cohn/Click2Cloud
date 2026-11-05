# P0 NEED TO DO — Right-click Explorer folder → Add to Right-Click (two-tab popup)

**Owner-approved specification:** November 5, 2026  
**Product:** Click2Cloud V3+1, later transplant candidate for REDOWN  
**Status:** documentation only; NOT implemented or verified  
**Authority:** This is the **latest user decision**, superseding earlier documents that incorrectly describe Simple as a single globally marked destination. It complements [instant mode switching](./2026-11-05_INSTANT_SIMPLE_NARROW_DEPTH_SWITCHING.md) and the [FOREVER_WORKS reference](../FOREVER_WORKS/README.md). Preserve current engine boundaries and real Cloudflare TRUE REMOTE.

## The entry point: ONE entry in the Explorer's own context menu

The user opens the **actual REDOWN File Explorer**, locates any currently authorized folder/bucket location, and **right-clicks that location**. The Explorer's context menu presents **Add to Right-Click** as **one command**. It does *not* show separate Simple/Narrow actions, and the user should not have to open a giant legacy destination-tree form.

Clicking **Add to Right-Click** opens a **small popup** anchored to the selected location; route identity is captured as provider/account/bucket/prefix (or equivalent exact authorized Cloudflare destination). This is an *Explorer configuration action*, not a right-click on a random webpage. Do not confuse it with the actual **Chrome web content native right-click menu**, which later consumes the saved configuration to dispatch a cloud save.

## The popup has exactly TWO tabs

### Tab 1 — Setup (the first/default tab)

**Only two settings:**
1. **Menu Title** — one editable text field. By default use selected folder's last path segment/bucket name, unless the existing menu entry being edited has its saved title.
2. **Simple / Narrow** — a two-choice switch/toggle. No extra mode builder, no path-editor fields cluttering the first tab.

The popup has an unambiguous **Save** action (and Cancel/close). The mode switch changes how *this configured location* is expressed in the right-click menu. It must never change the underlying actual folder/path or the selected provider transport.

**Simple behavior:**
- The selected location, with the user-entered **Menu Title**, becomes one **flat labeled destination option** under Cloudflare's submenu; this option invokes **Cloudflare TRUE REMOTE** directly to its exact original bucket/prefix.
- **Multiple Simple options are allowed** side by side under Cloudflare. Simple means *no ancestral folder nesting for each configured option*, **not** "only one marker in the entire account".
- Example after the user added folders individually:
  ```text
  REDOWN
    Cloudflare ▸
      My Photos       → redown/Art/Photography
      Invoices        → redown/Work/Invoices
      Downloads       → redown/Downloads
  ```
- **Special zero-extra-option default:** If the **only** active Cloudflare destination is the authorized default `redown` bucket root, show **REDOWN → Cloudflare** as a **single directly actionable leaf**, without a Cloudflare submenu, redundant `redown` child, Home or duplicated default option. Adding an explicitly titled Simple destination produces the labeled submenu option(s). Do not let an automatically activated bucket create unintended extra Simple options.
- Whether an explicitly added root destination also qualifies for the flat default or a labeled option must be handled consistently: default-only state is a distinct default/fallback; an intentional explicitly labeled selection is a configured menu option. Never hide a user's explicit configured label merely because the prefix is empty.
- Duplicate title/path conflicts should be surfaced and resolved deterministically without silently replacing or misrouting an existing option. Saved action IDs are tied to exact identity, not display strings.

**Narrow behavior:**
- Configures the same selected destination for naturally nested **manually configured paths**, with user-editable title at *every ancestor level* via Tab 2.
- Multiple Narrow routes may coexist; include only explicitly configured routes and necessary ancestors, not every cached folder.
- Narrow preserves the path's order and exact provider/account/bucket/prefix, regardless of displayed title choices.

### Tab 2 — Path Titles (available ONLY in Narrow mode)

**CRITICAL CONDITIONAL VISIBILITY — not merely disabled:** In **Simple**, the popup displays **ONLY the Setup tab**; the **Path Titles tab/button and its two-column table are completely HIDDEN, not greyed out or shown as an inactive second tab**. When the user selects **Narrow**, **Path Titles appears immediately** as a second selectable tab, containing the two-column top-to-bottom table. If the user switches back to **Simple**, **Path Titles disappears immediately**; if it was open, return the view and keyboard focus safely to Setup. Switching back to Narrow shows Path Titles again with any unsaved path-title draft preserved for this popup session. Nothing about hiding the tab deletes existing saved Narrow aliases or changes the chosen destination. This is a small **two-column top-to-bottom table**, not a graphical tree builder:

| Original location (read-only, left column) | Menu Title (editable, right column) |
| --- | --- |
| `redown` | `redown` or custom alias |
| `Art` | `My Creative World` |
| `Photography` | `My Photos` |

- Show **every segment from the selected bucket/root down to the final selected folder**, in the *original order*, one row per level.
- The **left** column is the **actual selected path** and is read-only; the **right** contains the optional/custom **Menu Title** input for that level. Default uncustomized ancestor titles to their real folder names, but do not overwrite an existing saved alias without user action.
- **Critical inheritance:** If the user has **already typed a Menu Title in Tab 1**, it **automatically appears in the right-hand Menu Title field on the LAST/BOTTOM row** in Path Titles (the destination they right-clicked). Editing this bottom field and returning to Setup must update the single Menu Title field there; both represent the **same draft value**, not two separate values.
- This prefill also applies when the user switches **Simple → Narrow** after typing a title, or reopens an existing destination for editing. Preserve the draft and all ancestor inputs across tab toggles and mode switches; no loss of focus mid-typing.
- The user may rename any intermediate **menu-display** segment to create a customized right-click path while the **real original cloud path is unchanged**. Example:
  ```text
  Real R2 path: redown / Art / Photography
  Narrow menu: REDOWN → Cloudflare → My Creative World → Visual Arts → My Photos
  Transfer target still: redown/Art/Photography
  ```
- Do not force everyone to visit this tab. If the user picks Narrow and presses Save immediately, use the real ancestor folder names and the entered final Menu Title.
- Where two independently configured Narrow routes share a canonical ancestor, **one consistent displayed menu title per shared ancestor** is required within the effective hierarchy. Detect conflicting aliases, ask the user to resolve explicitly, or use a transparent deterministic disambiguation; never silently overwrite previously configured siblings, change folder identity, or create duplicate ambiguous native menu IDs.
- Preserve per-account/bucket namespace and allow equal visible titles across distinct accounts with safe disambiguation and correct exact IDs.

### Save/Cancel

- **Save:** validate/sanitize user-entered titles; persist the selected destination, chosen Simple/Narrow presentation, final Menu Title, and Narrow per-segment aliases to **one canonical CURRENT IndexedDB-backed model** with a versioned revision. Update the menu projection and apply a native Chrome diff using existing registrar; retain an accurate pending/applied/failure state. No remote folder scan/provision/Cloudflare write is required to *configure* a menu entry.
- **Cancel:** discard popup-local changes without changing configured paths/labels, cloud contents, authorization or native menu.
- **Edit existing:** same popup prefilled from CURRENT, including saved mode, final title and path aliases. Reopening is not allowed to make duplicate entries by accident.
- The popup should be small, keyboard accessible, focus-safe, responsive, and theme-compatible. Use Cancel/Save; no extra wizard pages.

## Shelf: circular pointer icon → existing saved destinations

**Latest owner-approved navigation and layout:**
- On the **REDOWN Shelf**, place one **small, aesthetically integrated CIRCULAR icon showing a pointer/cursor**, **beneath the odometer section, aligned toward its RIGHT side**. It must be noticeable and usable without dominating the odometer or overlapping Shelf tabs.
- Its action opens a **Saved Right-Click Destinations** view/panel INSIDE the Shelf. This is the **one clear entry point for viewing and managing previously configured locations**; it is not the Chrome web-content right-click menu, and it does not open a browser tab or a duplicate legacy setup page.
- Organize existing saved destinations into **TWO clearly labeled subsections: Simple and Narrow**. Each subsection presents **ROWS** of saved destination entries, with a readable **Menu Title** and corresponding actual authorized cloud path (and provider/account/bucket distinction where needed), with a suitable small edit affordance. A row represents one saved location/option, **not an entire Depth-discovered tree**.
- The user can **scroll down** through entries. **Pagination MUST exist**, even for long lists; ideally scope the paging independently per Simple and Narrow subsection so paging one does not jump the other. Page sizes can be sensible defaults; do not introduce an arbitrary cap on total saved entries as an excuse for hiding them. Respect canonical storage/security and native Chrome menu limits transparently.
- **Clicking ANY part of ANY saved row** (Simple or Narrow) reopens the EXACT SAME two-tab **Add to Right-Click** popup used for creation, in **Edit existing** mode. Prepopulate **Setup → Menu Title and Simple/Narrow choice**; for Narrow also prepopulate **Path Titles → every saved ancestor alias, with the final/bottom alias synchronized to Setup's Menu Title**. The user can modify the title, switch Simple/Narrow, or rename Narrow path-display titles, and press **Save** again. Update the original canonical destination ID/record and move the row between subsections only if its mode changed; **NEVER create a duplicate destination or modify actual R2 files/paths**. Cancel closes without modification. Delete/remove should be deliberate and confirmed when relevant; no unintended cloud object deletion.
- Moving between Simple and Narrow in the popup updates category placement only after a successful save; maintain exact destination identity and avoid duplicate rows/entries.
- **Depth does not appear as a saved-location subsection** because it is a projection of the canonical directory index, not a user-created destination list. Depth remains controlled by its separate switch/settings.
- Accessibility and visual standard: circular button should have a meaningful name such as "Saved Right-Click Destinations", keyboard focus and visible tooltip; support keyboard rows, small-screen Shelf, theme contrast, responsive scrolling and usable navigation. Preserve the current odometer state and Shelf layout.
- The first draw and page changes should read **CURRENT's locally saved configured destination records**, NOT rescan R2, rerun the Depth index or wait on provider login. Changes then reconcile with the native Chrome menu asynchronously and report actual applied status.

**Illustrative rows:**
```text
                        [ ◉ ↖ ]   ← small circle/pointer under odometer (right)
Saved Right-Click Destinations

Simple
  My Photos            Cloudflare R2 · redown/Art/Photography
  Invoices             Cloudflare R2 · redown/Work/Invoices
  ...                  [scroll] [Previous  1  2  3  Next]

Narrow
  Creative Shots       Cloudflare R2 · redown/Art/Photography
  Project Docs         Cloudflare R2 · redown/Projects/Docs
  ...                  [scroll] [Previous  1  2  3  Next]
```
This is a conceptual layout, not a mandate for exact glyphs or page size. Avoid putting the new icon inside the odometer itself; the specified position is **below and right** of that section.

## Depth stays outside this popup

**Depth is a separate ON/OFF (or selected-mode) control and a numerical depth selector in the right-click settings.** It projects the locally cached, authorized folder tree up to the selected level, including eligible folders not hand-added. It does not need an Add to Right-Click command for every folder, and users do not need to configure Path Titles for Depth.

Depth switch should be fast on a warm CURRENT/indexed inventory. No unsolicited R2 scan just to switch away to Simple/Narrow.

## Important: Menu presentation != transfer strategy

All Cloudflare options—default root, Simple labeled choice, Narrow nested choice or Depth folder—must use **TRUE REMOTE**:

```text
Native Chrome web-content right-click action
  → exact committed authorized Cloudflare account / bucket / folder prefix
  → REDOWN sends source URL and control metadata to its matching Cloudflare Worker
  → Worker fetches file bytes directly from remote website
  → Worker streams / boundedly ingests into R2
  → actual R2 object HEAD / receipt validation
  → verified History / success / counter
```

**The browser does NOT download the web file bytes for Cloudflare TRUE REMOTE.** The Worker necessarily sees the source URL; do not misrepresent it as byte-only privacy. Drive/Dropbox/OneDrive remain separate flat providers with browser-mediated bytes and no source URL forwarded as cloud upload metadata.

## Nonnegotiable UI/logic acceptance examples

1. Right-click `redown/Art/Photography` in the **Explorer**, choose **Add to Right-Click** → small popup **Setup** selected, editable Menu Title and **Simple/Narrow** switch only.
2. Type **My Photos**, leave **Simple**, Save → Chrome **REDOWN → Cloudflare → My Photos** is actionable, saves TRUE REMOTE to `redown/Art/Photography`.
3. Add `redown/Work/Invoices` as Simple title **Invoices** → two Simple **sibling** title options in the Cloudflare submenu; no nested Art/Work folders.
4. With only the uncustomized default `redown` root present, **REDOWN → Cloudflare** is itself an actionable leaf with no submenu.
5. Enter **My Photos** in Setup, switch to **Narrow**, open **Path Titles** → left column `redown / Art / Photography` top-down, right column contains editable titles; bottom right **My Photos** already populated.
5a. With **Simple** selected, **Path Titles is entirely absent** (not a disabled tab and no two-column table). Selecting **Narrow** reveals Path Titles instantly. Switching **Narrow → Simple**, even while Path Titles is open, automatically returns to Setup and hides Path Titles; switching back to Narrow restores this popup session's unsaved row titles.
6. Edit left row `Art` to title **Visual Arts**; choose another custom root menu alias; save → Narrow Chrome menu titles reflect those aliases while TRUE REMOTE target remains exactly `redown/Art/Photography`.
7. Change the bottom Path Titles value to **My Pictures**; return to Setup → Menu Title shows **My Pictures** immediately. Cancel does not change canonical state.
8. Narrow selected but user never opens Path Titles → Save still generates natural ancestry with original parent folder names and entered bottom label.
9. Duplicate titles, alias collisions, concurrent popup edits, same-named folders in different buckets, cloud authorization changes and stale native IDs never redirect saves.
10. Changing between Simple, Narrow and Depth uses warmed CURRENT local data quickly; check separate UI paint latency, compiler time, native Chrome ACK, and R2 network reads.
11. Shelf circular pointer icon below/right of the odometer opens Saved Right-Click Destinations → TWO scrolling, paginated Simple and Narrow row sections; rows show existing titles and exact saved paths; selecting a row opens prefilled editing; no Depth inventory scan. No forced refresh for simple preference edits.
12. No duplicate menu registration, no old "single Simple marker" rule, no accidental breaking of other provider flat leaves, no Chrome-native success claimed without ACK.

## Relationship to older documents

This **latest** popup specification expressly **supersedes** the "one effective Simple marker" interpretation in earlier Nov 5 NEED_TO_DO and FOREVER_WORKS docs. Those documents must be amended to avoid contradictory implementation instructions. Keep REDOWN original-code findings labeled [SOURCE], the newer owner design labeled [OWNER-NEW], and testing/proposed behavior labeled [TARGET/GAP].

**This is a documentation/requirements request, not authorization to modify REDOWN application code or deploy a Worker.**
