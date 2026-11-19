# P1 — User-editable keyboard shortcuts live at the bottom of Settings, not Explorer More

**Reported:** November 19, 2026. **Status:** REQUESTED for next Codex run; not yet implemented.  
**Applies to:** Click2Cloud Shelf / File Explorer in all three themes.

## Requested UX

The strings **"Toggle one or two toolbar rows (Ctrl+Shift+F8)"** and **"Reset panels to 50/50 (Ctrl+Shift+F9)"** must **never appear as action buttons in Explorer More** (nor be duplicated as buttons in the toolbar). They should instead be listed as **keyboard shortcut references in a clean "Keyboard Shortcuts" card at the VERY BOTTOM of Settings**. This section is part of ordinary Settings, always accessible when Debug Mode is OFF.

Also allow users to **change their keyboard combinations manually** within Settings and persist the custom bindings.

### Initial shortcuts

| Action (stable action ID) | Default | Scope |
| --- | --- | --- |
| Toggle between one/two Explorer toolbar rows (`explorer.toggleToolbarRows`) | **Ctrl+Shift+F8** | Explorer Shelf |
| Reset Explorer tree/gallery split to 50/50 (`explorer.resetPanelSplit`) | **Ctrl+Shift+F9** | Explorer Shelf |
| Pop out/focus filename Search (`explorer.focusSearch`) | **Ctrl+Shift+F7** (proposed; see linked feature) | Explorer Shelf |

The new F7 action is not implemented yet; coordinate with [the dedicated Search pop-out request](P1_EXPLORER_FILENAME_SEARCH_POPOUT_SHORTCUT_2026-11-18.md). Show only functional shortcuts as active; if F7 is not implemented when this UI ships, label it unavailable/coming with implementation instead of presenting a dead binding.

### Settings control design

- Insert **Keyboard Shortcuts** as the FINAL card/section in `renderSettings()`, **after History settings and other current settings content**, independently of `[data-debug-only]`. Title plus a tidy row per action showing its purpose and actual current key chord; buttons labeled **Change**, optional **Clear/Disable**, and one **Restore defaults** action with confirmation when customized.
- Clicking **Change** enters a deliberate **"Press your new shortcut…"** capture state; show a clear Cancel/Escape option. On keydown, normalize the chord and display a preview. Capture only keyboard events for that capture control; don't let a shortcut execute its action during remapping. Support keyboard-only and screen-reader use, with live region for errors and confirmation.
- Permit appropriate combinations with modifiers (Ctrl / Alt / Shift / Meta as supported), avoid accidental bare letters, Tab, Esc, OS/browser-reserved or assistive-technology chords, and prohibit exact duplicates across Click2Cloud actions. Detect known Chrome/Windows conflicts where possible and give an accurate message that extension UI cannot reliably detect every OS-level reservation.
- Settings must persist custom bindings in the extension's existing vetted preferences store, with schema/version migration, stable action identifiers, validation on read, atomic save/rollback on storage failures, and **immediate activation** in already-open Shelf/side-panel windows. Reload and MV3 service-worker restart must not revert user preferences; preserve existing F8/F9 defaults on first use.
- The actual `extension/explorer-layout.mjs` `keydown` handler is currently **hard-coded for F8/F9**. Replace the hard-coded chord match and inline tooltip text with a shared validated shortcut registry/resolver used by the Settings editor and Explorer keyboard listener; no divergent binding state. Integrate Search F7 shortcut in the same registry. Update accessible `aria-keyshortcuts` values to match users' selections. Preserve splitter pointer/drag and double-click actions.
- **Scope truth:** these shortcuts operate inside Click2Cloud's focused Shelf / extension app, not across arbitrary websites. Do not claim global Chrome/Windows hotkeys. If global behavior is ever requested, that is a distinct `chrome.commands` design with browser-managed constraints and `chrome://extensions/shortcuts` compatibility.
- No extra controls for toolbar toggle/panel reset are to appear in the Explorer More popover, and no extra persistent toolbar rows are allowed. The Settings section is the sole **visible shortcut reference/editor**. Accessibility labels on the real splitter controls may still expose their current shortcuts for assistive technology.
- Save only presentation preferences; do not modify cloud destinations, OAuth, R2, worker routing, receipts, or the engine.

## Exact current source / prior work

- `extension/explorer-layout.mjs` declares the F8/F9 `shortcuts` array and listens to document keydown, rejecting key events inside inputs, menus and dialogs.
- Redundant More-menu buttons were already removed in `e314e624033542a6ada94c0bd6b70b721c86757e`; follow-up test `77d4b3c1df0886cc4b81cefa29b69aa8e2b05b3c` guards against reappearance. Keep that behavior; remapping is additional work.
- `extension/app.mjs` `renderSettings()` currently appends the History settings card, then awaits `historyUI.settings(historySettings)` near its end. Append **Keyboard Shortcuts** last, so it remains truly at bottom regardless of dynamic History content.

## Acceptance gates

1. **Debug OFF and ON:** last visible Settings card is Keyboard Shortcuts with correct F8/F9 defaults and (once implemented) the F7 search shortcut.
2. Change F8 to an alternate allowed chord; it activates toolbar toggle, old F8 no longer triggers; F9 stays unchanged. Repeat for F9 and Search; verify Escape cancels edits and saved custom chords survive extension reload.
3. Restore defaults atomically, and verify originals work again; test disabling/re-enabling if implemented.
4. Reject conflicts with existing bindings and unsafe/bare/reserved keys with accessible error; capture prevents running actions; shortcut presses in other text controls/dialogs are ignored.
5. Regression: exactly zero "Toggle one or two toolbar rows" and "Reset panels to 50/50" command buttons in Explorer More at all viewports/themes, including after settings edit; actual splitter drag/double-click and keyboard shortcuts still work; no duplicate event listeners on Settings rerender.
6. When the browser has reserved a chosen chord or a chord isn't dispatched, don't claim it functions; provide alternative and document verification limits. Test installed Chrome on Windows separately from browser fixtures.

**Parent task:** [next-Codex implementation queue](../../next-codex/CODEX_NEXT_EXPLORER_SEARCH_UI_AND_WORKER_IMPLEMENTATION_2026-11-18.md).
