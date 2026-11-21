# File Explorer follow-up validation

The seven changes build on the existing File Explorer and signed R2 operations. The Windows Chrome and live R2 release check remains open. [Rename reproduction and Windows test procedure](README.md)

| Area | Existing behavior and change | Evidence scope |
| --- | --- | --- |
| Cloud and image clipboard | Explorer already had context-menu Copy, Cut and Paste. File-pane Ctrl+C/X/V now use the same references and transfers. Ctrl+C on one supported image also attempts a real PNG clipboard write. The image action can be invoked by itself from the context menu. Multiple selections still copy their cloud references. | Linux Chrome pasted one PNG into a separate receiving page. Windows Chrome and ChatGPT paste are unverified. |
| List width | The single Name column inherits the Explorer pane width. Filenames expose their full text through a tooltip. Details uses its own columns and Grid retains its tiles. | Installed Linux Chrome tested the splitter controls and compared Name width with the full List pane. |
| Busy cursors and mini-toast | Five Aesthetic API cursor packages persist independently of themes and palettes. A cursor runs while an operation is pending. The small themed status appears once per action and clears automatically. | Package persistence and fallback tests, plus a live browser capture with the ring and folder-creation status. |
| Marquee | Blank-space drag works with the existing virtualized renderer. Ctrl toggles intersecting items. Shift adds them to the selection. Escape restores the prior selection, and edge scrolling is capped. | Installed Linux Chrome fixture with small folders and a paged 1,200-file directory. |
| Explorer essentials | F2 uses the shared Rename flow. Delete and right-click Delete share selected targets and the existing confirmation preference. Refresh, parent navigation, type-to-select, New Folder, drag-to-folder and resizable Details columns are available in Explorer. Current-folder selection survives refresh and view changes. Clipboard references persist across Shelf reopen within the Chrome session for selections of up to 512 items. Settings lists local fixed shortcuts and active Chrome-wide shortcuts. | Installed Linux Chrome exercised keyboard and pointer actions and verified storage outcomes with the existing Worker running on local workerd. |
| Remotes headline | The exact sentences occupy one intact line each. | Installed Linux Chrome checked 280, 360 and 570 pixels across seven appearances in light and dark mode. |
| History hero | The exact slogan replaces the technical introduction. The operation total appears with pagination and record timestamps keep the chosen timezone. | Browser checks covered both color modes across all appearances. History tests cover storage and rendering contracts. |

The image clipboard uses one pending read with an 8 MiB input ceiling and a four-megapixel limit. JPEG, GIF and WebP convert to a single PNG after dimension checks. The clipboard path retains no image cache. The marquee updates only changed indices and mounts only the existing visible window.

The receiving page decoded a 120 × 80 PNG from the actual paste event. The browser exercised marquee with 1, 4, 100, 1,000 loaded items and a 1,200-item total. The Remotes matrix ran 42 checks, and the History hero ran 14 appearance and color-mode checks. [List](list-full-width.png) · [Busy cursor and status](busy-cursor-and-toast.png) · [Grid selection](virtualized-grid-selection.png) · [Remotes](remotes-two-lines.png) · [History](history-hero.png)

## Local test commands

```sh
npm run build:extension
npm run test:focused
npm run test:api
node --test tests/explorer-file-approval.test.mjs right2cloud-module/tests/module.test.mjs
npm run check:api-docs
npm run test:release-browser
node scripts/test-rename-browser.mjs
C2C_EXPLORER_ESSENTIALS=1 node scripts/test-rename-browser.mjs
```

Set `C2C_CHROME_EXECUTABLE` to the local Chrome for Testing executable and `C2C_RENAME_EVIDENCE` to capture the browser screenshots. The installed-browser tests use disposable profiles, a local TLS fixture and the repository Worker running on workerd. They keep Cloudflare traffic inside the fixture.

The focused suite passed 526 tests. The API suite passed 16, the combined File API approval and remote-save module checks passed 52, and the release browser suite passed nine gates. The API reference checker verified 78 methods and three configurable Shelf commands.

The native menu harness verified installed Chrome rendering for page, image and link contexts, the logged-out Cloudflare dispatch, and recovery after MV3 worker stop. Standalone unpacked extension reload timed out on both main and the patch in this environment. The older `npm run test:browser` fixture also failed at the login-only expectation on both revisions. The native save routing and Worker readback tests passed against local emulation.
