# REDOWN 0.3.23 P1 verification

The six P1 implementation milestones are on the owner-approved branch. Release
acceptance is **blocked** pending the remaining native Chrome, Windows profile,
and authorized R2 checks below.

- Branch `codex/redown-0323-p1-complete-visual-ux-2026-11-21`. The fetched branch head was `83a04a8bbe6367e641a4a7c16d70e5dd491578fa`, immediately after the requested P0 base `c2b608f3c4c9344713d83ed73b98120b0bef8106`.
- Build identity `ajppphdiamdobknpamcheohmdbdbeoal`, version `0.3.23`, OAuth callback `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/cloudflare`. The build packaged all four manifest/action icon sizes. The manifest public key, commands, permissions, provider OAuth, Worker source and menu engine match the base.
- Heroine pairs amber `#FFC979` with black cherry `#3B1629` for the internal R. Slanted Arial Black gives headings a poster-like treatment, while Trebuchet MS keeps utility text readable. A small original cheetah-print CSS accent sits under the Remotes introduction.

## Acceptance table

| Milestone | Implementation and build | Unit and Chromium fixture evidence | Installed Linux Chrome evidence | Open acceptance |
| --- | --- | --- | --- | --- |
| A. External R | `460f129`. Original glossy white R on red. 16, 32, 48 and 128 px PNGs. The build validates the manifest and dimensions. | Inspected 16 and 128 px assets. 16 px glyph has a distinct stem, bowl and diagonal. | Chrome for Testing loaded the icon manifest. The X11 native test saved `toolbar-and-side-panel.png` after a real Cloudflare click. | Visual review of the toolbar, extension list and outer side-panel header in Windows Chrome. |
| B. Aesthetic API | `b464800`. Minimal, Remote V1, Golden Age, Oceania and one Nostalgia theme with Kawaii, Dungeon Master and Heroine. The existing theme preference keeps the last Nostalgia style. | 7 aesthetic unit checks. Chromium rendered both modes with populated Explorer and History. Each optional theme and each Nostalgia style was removed from the registry in unit tests and its CSS was blocked in browser tests. Minimal fallback, Explorer, exact-route save to fixture R2, and the matching History record passed for all six cases. | 14 installed Shelf mode/style combinations passed in a disconnected disposable Linux profile. | Windows theme screenshots and installed native/menu/provider checks with the optional CSS removed. |
| C. More and color mode | `7b2cd84`, `ecd3562`. Separate header hit areas, bounded menu, responsive History placement and Escape focus return. | Eleven appearance choices × two modes. Width sequence includes repeated 900 → 260 → 900 → 260 and checks at 310, 350 and 480 px. DOM rectangles, pointer hit testing, keyboard open, Escape and click-away were exercised. | The installed appearance suite exercised production Settings and the More menu. | Real Windows side-panel resizing and independent hit testing at the owner’s display scale. |
| D. Badge | `2760716`. First durable independent confirmation counts once per save or screenshot capture. One timed green/normal/green sequence per accepted animation. | 3 dedicated checks plus existing local-download and screenshot cases. One 100-event burst, partial fanout, duplicate receipts, DST midnight, wake and error recovery. Chromium IndexedDB proved one callback and a stable timestamp across concurrent updates, retry after midnight and reopen. | Installed Chrome screenshot save and retry passed using the isolated HTTPS/R2 fixture. | Windows toolbar pulse and authorization against real R2. |
| E. Chevrons | `f3a27c9`. Mirrored chevrons with transparent 44 × 44 px hit targets and rectangular keyboard focus. | Browser checks cover first/middle/last and pointer and keyboard navigation. Geometry checked at 310 and 900 px across the theme matrix. Gallery resources, rename and download covered by the gallery and release suites. | Installed screenshot preview and exact-file navigation passed using the HTTPS fixture. | Windows gallery visuals and interactions. |
| F. Search and immersive | `20fb430`. Remappable Shelf Search focus toggle, Enter retention, bounded four-arrow pan, synchronized zoom, and three-stage Escape. | Seven Search browser gates passed. The gallery suite passed 29 checks, including rename input protection, first/last navigation, slider ownership, focus return and 105 open/zoom/pan/close cycles. | Installed screenshot preview exercised the three-stage Escape with the HTTPS fixture. | Actual Windows side-panel focus, keyboard and restart verification. |

## Test evidence

- `npm ci --ignore-scripts --no-audit --no-fund` passed. The pinned esbuild and workerd packages declare install scripts. The CI-style install did not execute them and the build and test binaries worked. `npm audit` reported three high-severity dev dependency nodes involving Miniflare, sharp and undici. `npm audit --omit=dev` reported zero findings. The package pins and lockfile are unchanged.
- `npm test` 612 passed. `npm run test:focused` 520 passed. The independent right2cloud module suite 49 passed. Extension build and the API command documentation check passed.
- Chromium fixture suites passed 18 P1 checks, 7 filename Search checks, 29 gallery checks, 20 appearance checks, 13 live History checks, 30 CURRENT recovery checks, 16 boot/login checks and 9 release-UX checks. The CURRENT suite also reproduced its historical reference failures in their archived source. The local installed Shelf runner returned `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR`.
- The 105-cycle Chromium run measured 11,370,696 bytes of collected JS heap before the loop and 11,329,044 after. Documents were 2 → 2, DOM nodes 3,462 → 3,453 and JS listeners 352 → 355. Renderer main-thread tasks totaled about 1.04 seconds during the loop. Zoom and pan triggered zero additional image reads. These are fixture renderer measurements. Windows process memory, CPU and live R2 stress remain open.
- GitHub Actions proved installed Chrome for Testing 158.0.8127.36 showed REDOWN and one Cloudflare action on page, image and link on a fresh profile. The actual signed-out native click returned `LOGIN_REQUIRED`. The Get URL and installed screenshot save/retry flows passed against the HTTPS fixture. Separate artifacts contain installed Settings and Remotes screenshots for all fourteen theme/style modes. [Actions run 44932356129](https://github.com/thanks-cohn/Click2Cloud/actions/runs/44932356129)
- The browser gates now check the packaged version and original manifest key, close the support dialog before opening the exact Explorer file, and provide Chrome storage before the boot fixture imports app code. The native menu test opens Chrome’s actual parent row before reading OCR. Earlier runs reached the fresh-install checks, then timed out collecting worker wake evidence. Run 44932356129 reached the wake ACK, then OCR selected a REDOWN label outside the native menu. The updated harness narrows OCR to the position of the actual context gesture. Subsequent run results appear in the Actions history. [Branch Actions](https://github.com/thanks-cohn/Click2Cloud/actions?query=branch%3Acodex%2Fredown-0323-p1-complete-visual-ux-2026-11-21)

- The browser login workflow passed through four fixture-native right-click saves with separate workerd R2 reads. It created one fixture bucket and uploaded one fixture Worker across first login, two reconnects and a new Chromium process. The repaired callback fixture now supports Chrome’s create, update and remove semantics.
- [Machine-readable acceptance record](p1-verification.json)

### Screenshots

The two sheets below were composed from production Shelf screenshots rendered in Chromium with fixture messaging and provider data. The Actions artifacts hold individual screenshots, separate installed Linux Chrome views, and OS-rendered native menus.

- [Theme and light/dark comparisons](p1-shelf-themes.png)
- [Narrow header, gallery chevrons and immersive zoom](p1-header-gallery.png)

## Windows and authorized R2 checks

1. On the exact P1 branch, run `npm ci --ignore-scripts` and `npm run build:extension`. Launch Chrome with a new profile directory. In `chrome://extensions`, turn on Developer mode, load `dist/click2cloud`, and pin REDOWN. Confirm the ID and version above. Capture the extension list, toolbar and outer Shelf header at normal scale.
2. In the new profile, capture the native REDOWN group on an ordinary HTTPS page, link and image before login. Confirm the Cloudflare action opens its connection surface and a logged-out screenshot shortcut adds zero History rows and zero badge count.
3. Using an authorized disposable account and bucket, sign in, reconnect, restart Chrome and let the extension worker suspend between checks. Verify the exact Simple, Narrow, Depth, Default and Quick save targets. Test zero, one and multiple assignments, a bucket that remains unassigned, and removal back to one assignment. Capture the actual native menu and check for duplicates. Keep the first-run setup approval and bucket data under the owner’s control.
4. Make a real right-click save and a screenshot capture with more than one output. Independently read back the exact R2 keys and compare object bytes with their receipts. Confirm the badge increments once for each operation, including partial fanout with one confirmed output, and remains stable across retries and worker wake. Record the two badge pulses at a high frame rate and verify the red R stays visible.
5. For each complete theme and Nostalgia style in both color modes, capture Settings, Remotes, History, Explorer/details and grid, gallery and immersive preview. Reproduce the Emerald Forest expand/shrink sequence at 260, 310, 350 and 480 px. Use keyboard and pointer for More, change color mode, and verify no overlap or lost focus. Run the Search toggle, query retention, slider navigation and staged Escape in the genuine Shelf.
6. In disposable builds, remove each optional theme stylesheet and each Nostalgia style stylesheet in turn while that presentation is saved. Reload and repeat a native save and screenshot check with the authorized disposable target. Compare the resulting History and existing preferences.
7. Test an upgrade in the original Windows profile in place, with the existing extension and credentials retained. Record that result separately from the disposable fresh install. Compare Chrome Task Manager before, during and after the documented P0 mixed save/screenshot bursts, and retain the provider receipts and observed menu tree.

## Changed files

`git diff --name-status 83a04a8bbe6367e641a4a7c16d70e5dd491578fa..HEAD`
lists the full set. The changed production files are grouped here for review.

- Branding and packaging. `extension/manifest.json`, `extension/icons/redown-{16,32,48,128}.png`, removed `extension/menu-icon.png`, and `scripts/build-extension.mjs`.
- Shelf and theme presentation. `extension/app.html`, `extension/app.css`, `extension/aesthetic.css`, `extension/app.mjs`, `extension/themes/{components,golden-age,oceania,kawaii,dungeon-master,heroine}.css`, and `src/aesthetic/{host,packages}.mjs`.
- Search and viewer controls. `extension/explorer-layout.mjs`, `extension/shortcut-settings.mjs`, and `extension/immersive-view.mjs`.
- Badge and durable receipt projection. `extension/background.mjs`, `extension/screenshot-background.mjs`, `src/chrome/daily-badge.mjs`, `src/history/{verified-save,screenshot-output}.mjs`, and `src/persistence/current-store.mjs`.
- Verification. `tests/{aesthetic.test,boot-runtime-host,daily-badge.test,final-focused,login-ready-browser-fixture}.mjs`, `scripts/gallery-immersive-browser-check.mjs`, `scripts/test-{aesthetic,boot-login,filename-search,image-gallery,native-menu,redown-p1,redown-p1-installed,release-0320,screenshot}-browser.mjs`, and `.github/workflows/test.yml`.
- Traceability. `11.2026/workings/right-click-workings.json`, `latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md`, this report and the two screenshot sheets.
