# Next-Codex P1 — Destinations Manager popup needs a polished, structured layout

**Owner request:** November 19, 2026. **Status:** Visual/presentation redesign request, **not** a request to rewrite the destination engine. Inspect the existing `extension/app.mjs` `manager()` dialog and its CSS before changing anything.

> Owner intent: "the Destinations Manager popup looks amateurish; even in Minimal, a little structure goes a long way."

## Target experience

Create a **clean, intentional, well-organized Destinations Manager modal**, even in the **Minimal** aesthetic. It should feel designed rather than like ungrouped labels/buttons. Preserve its working Simple/Narrow/Depth configuration, exact buckets/prefixes, Quick/Default/Visibility, the shared Save draft flow, and native menu ACK verification.

Suggested information hierarchy (presentation only, adapt to current design tokens):

1. **Header**: strong "Destinations" title, close X, concise one-line purpose/subtitle; intentional alignment/spacing.
2. **Mode tabs** immediately below header: **Simple | Narrow | Depth** as visually cohesive segmented tabs with a clear active state and stable placement; keep the Organize action as a compact secondary utility rather than randomly floating next to the tabs.
3. **Current configuration summary**: concise, readable default-destination location/No default, and essential connection availability only where relevant. Long provider/account/bucket/prefix labels wrap/truncate with an accessible full value, never spill into controls.
4. **Destinations list**: separate, consistent rows/cards with a strong destination name, secondary provider/bucket/full path, and a clearly aligned actions region. Group associated controls logically: Make Default, Quick, visibility, Edit (when applicable), Delete (destructive), and Depth number entry in the Depth mode. Consistent icon sizes and clickable targets, align rows into a deliberate grid; avoid squeezing text/controls into a ragged pile. Strong empty states with "Browse Cloudflare buckets" path.
5. **Chrome menu visibility**: its own clearly separated section headed **Show in Chrome**, with the Simple/Narrow/Depth checkboxes on one organized row when space allows (existing behavior), never mixed into destination row actions.
6. **Secondary setup/usage details**: use a quiet explanation or collapsible disclosure for genuinely important information instead of dominating the dialog. Do not suppress mandatory authorization or cost disclosures when a sensitive operation actually requires consent; do not reintroduce the technical selected-destination card into Minimal Remotes.
7. **Sticky/sensible footer**: unambiguous unsaved/saved/error status, Previous/Next and `x–y of n` pagination, and the single prominent **Save** button. Keep Save accessible while scrolling a long list; don't turn row toggles into immediate irreversible saves. Deletion remains draft-only until Save, with the existing confirmation and safe focus restoration.

## Minimal is still polished

Minimal means **fewer distractions, not absence of structure**. Favor balanced whitespace, consistent borders or gentle separators, restrained typography hierarchy, aligned button/checkbox groups, and a clear primary action; no oversized "eye" or trash icons, no visual clutter, no unnecessary animations. Use existing CSS variables/design tokens to respect Light/Dark and other aesthetics; do not impose a new theme engine, decorative gradients or random colors.

Use a responsive, bounded modal: header and footer remain usable, the list/body scrolls independently where needed, long names never cause horizontal overflow, and the layout degrades cleanly at narrow widths. Dialog, tab selection, icon buttons, keyboard focus, forms, screen-reader names and Enter/Escape behavior must remain accessible. Keep existing mode/tab state, working draft state, pagination (currently 20 per page), and state when switching modes. **Do not accidentally impose the separately requested 25-per-page rule limit from Rules/Screenshot on Destinations Manager.** This is a visual organization task only.

## Specific grounded sources and constraints

- `extension/app.mjs` `manager(filter='simple',page=0,session=null,message='')` (around line 904) builds a single large template with tabs, default summary, flat list, bucket browser, Show in Chrome, disclosures, Save and paging.
- `rowHtml()` emits destination name + details + several independent buttons in `.dest-row`, without much explicit hierarchy. `showInChrome()` already produces the checkbox row; **preserve its correct logic**.
- `destinationDraft`, `bindDestinationSave`, staged edits, `rerender`, `withDepthInputs`, `stageScopes`, mode switching, deletion confirmation, and `makeExplorerDefault` already exist and are not to be recreated.
- Use localized CSS under a manager-specific class (e.g. `.destinations-manager`) in `extension/app.css` and only the necessary markup grouping; isolate layout from engine and native saving.
- Do not modify unrelated file explorer context menus, security/permission routing or Cloudflare Worker code. No new persistence store, new Save mechanism or theme rewrite.

## Focused acceptance and evidence

1. Screenshot or browser fixture of the Destinations Manager in Minimal: clear title, tabs, default summary, list rows/actions, grouped Show in Chrome and Save/footer; coherent visual alignment and spacing.
2. Repeat for Simple/Narrow/Depth with empty and populated lists, narrow/modal width, long folder name, and a Depth editable number field; no overlap/clipping/giant icons.
3. Stage Quick/Visibility/Default/Edit/Delete/Depth updates → switch modes and paginate → draft survives correctly; Save commits once and native ACK proof stays truthful. Cancel/delete confirmation retains safe semantics.
4. 20+ existing destinations still page as before; do not change it to 25 due to the unrelated Rules feature.
5. No regressions to ordinary right-click saving, selected exact destination, permission checks, or existing themes. Code and source-level/Chrome fixture tests must be reported separately from real installed Chrome observations.

**Presentation polish only. Preserve functioning source code.**
