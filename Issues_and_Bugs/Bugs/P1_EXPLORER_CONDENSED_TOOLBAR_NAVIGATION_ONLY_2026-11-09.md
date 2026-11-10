# P1 — Explorer condensed toolbar must show only Back, Forward, Up, Refresh and More

**Reported:** 2026-11-09
**Status:** OPEN — owner-reported UX regression/requirement, no code changed
**Area:** Click2Cloud Shelf → File Explorer → command container above file list → adjustable horizontal toolbar-height splitter

## Exact requested behavior

When the user slides the **horizontal divider/slider directly below the File Explorer command toolbar** up to its **most condensed / one-row state**, the visible command strip above the files must contain **exactly these five controls, in this order**:

```text
[Back] [Forward] [Up] [Refresh] [More ▾]
```

That means **ONLY** those four navigation controls plus the **More dropdown**. Do not prioritize or retain the editable address/location field, the Details/List/Grid view switcher, `+ Right Click`, or other secondary controls as visible peers in the fully condensed state.

Any other toolbar controls must remain available via **More** rather than disappearing or being disabled/deleted. The **expanded toolbar** must continue to expose additional actions according to the existing adjustable-height behavior. Condensing a toolbar is a **presentation change**, not removal of functionality.

**Important nomenclature:** This is the **File Explorer command toolbar above the file list** (`#explorer-commands`) and its **height slider** (`#toolbar-splitter`), not the vertical folder/file pane splitter, not the Chrome native right-click menu, not the File Explorer file context menu, and not the *Load more files* pagination button `#more`. The requested dropdown is `#toolbar-more` with `#toolbar-overflow`.

## Source-observed explanation (main as of 2026-11-09)

- `extension/app.mjs` builds `#command-items` in this sequence: `#back`, `#forward`, `#up`, `#refresh`, editable `#location` in `.address`, `#view-switch`, and `#add-location`; it separately creates `#toolbar-more` and `#toolbar-overflow`.
- `extension/explorer-layout.mjs` calculates row budget using `preference.toolbarRows` (minimum 1), but its current priority list is **address → + Right Click → Back → Up → Refresh → Forward → view switch**. At one row, it selects as much of that list as fits, rather than enforcing the owner's specified four navigation controls plus More.
- `extension/app.css` styles `#explorer-commands`, `#command-items`, `#toolbar-more` and `#toolbar-overflow`. Current responsive sizing may influence which of the desired buttons fit; ensure the compact strip remains usable at supported widths.

These are concrete source observations, **not evidence of a completed repair**.

## Required design / implementation

1. Treat **minimum height / 1 toolbar row** as an explicit *condensed* presentation preset, independent of accidental DOM order and screen-width fit heuristics.
2. In that state, pin only `#back`, `#forward`, `#up`, `#refresh` visibly, in that order; `#toolbar-more` always shows as the fifth visible dropdown trigger, and **all other command controls live inside `#toolbar-overflow`**.
3. Back/Forward/Up still properly enable or disable based on navigation history/current prefix. A disabled control **stays visible** in the condensed strip.
4. Moving the slider down to expand restores the existing fuller toolbar layout and actions. Returning to condensed repeats the exact five-control lineup; no preferences, navigation history, address contents, file selection or user configuration are lost.
5. Other command actions inside More remain accessible, keyboard-operable and usable (especially the location/address input, view switcher, and `+ Right Click`). Moving a focused control into/out of More must handle focus without loss or trapping.
6. `#toolbar-more` expands/closes the dropdown via click, Escape and outside click; update `aria-expanded` and accessibility labels correctly. No overlap/clipping of the file list, folder pane or dropdown.
7. Toolbar height/rows still persist through the canonical `setExplorerLayout` configuration/API flow (`product.explorerLayout.toolbarRows`), including relaunch; **do not introduce a separate conflicting compact-mode preference**.
8. Avoid affecting the distinct `#more` load-more pagination action beneath files, the Gallery Previous/Next controls, or Chrome's native right-click layout.

## Acceptance tests

- Set toolbar height slider to **one row**: visible DOM controls are **Back, Forward, Up, Refresh, More** only, in that exact order. Confirm address, `+ Right Click` and view selection are in the dropdown and functional.
- Disable Back/Forward due to empty history: both remain present, appropriately disabled.
- Expand to multiple rows: useful controls return to toolbar; condense again: exactly five controls, no duplicates.
- Resize Shelf/window to narrower and wider supported widths: no overlap, hidden required controls or unusable More dropdown.
- Use keyboard/assistive navigation; test focus and Escape. Verify More `aria-expanded` accurately reflects state.
- Reload extension and return to Explorer: saved `toolbarRows=1` consistently restores the condensed layout.
- Regress address navigation, Right Click destination assignment, View mode, file list actions, toolbar drag/keyboard controls, and performance. Do not change working TRUE REMOTE or provider/menu APIs.
- Verify in a real browser DOM, not only source assertions. Distinguish installed Windows Chrome evidence from headless/fixture tests.

**No implementation or deployment is authorized by recording this bug.**
