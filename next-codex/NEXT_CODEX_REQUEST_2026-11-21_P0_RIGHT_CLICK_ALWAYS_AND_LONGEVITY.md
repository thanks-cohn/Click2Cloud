# NEXT CODEX IMPLEMENTATION REQUEST — November 21, 2026
# P0 RIGHT-CLICK ALWAYS + LONGEVITY, DURABILITY AND ROBUSTNESS

> **THE GOAL IS FOR THE RIGHT-CLICK MENU TO ALWAYS BE ACCESSIBLE.**
>
> **LONG-TERM PRODUCT GOAL:** It should be the best in its class: robust, durable and able to last in the world indefinitely with minimal modifications. Aim for zero known silent data loss, zero false-success outcomes and as few customer-visible defects as evidence and platform limits permit.
>
> Implement real improvements to the existing Click2Cloud source. This is **NOT** merely another analysis, document or speculative rewrite. **The right-click issue is P0 and the first release gate**. Worker durability is a deliberately scoped, subsequent gate. Do not trade known-good remote-save behavior for a massive redesign.

## FULL 0.3.23 OWNER CONSOLIDATION — DO NOT DROP ANY PREVIOUS REQUIREMENT

**This is the comprehensive Codex request, not only an icon/badge ticket.** The following owner-approved work must be tracked together, **without treating every item as permission to rewrite the whole product**. Work in phased, independently tested commits; do P0 first. The earlier P0 audit, B01–B09 stress requirements and longevity charter below remain controlling.

### P0 — Always present, fast, crash-resistant right-click and screenshots

- **Chrome native right-click ALWAYS:** On eligible supported Chrome pages, a visible/enabled provider action appears before login, immediately after login/reconnect, and after worker activation/restart. Login and cloud status must not erase it. Refactor the existing one canonical registrar to eliminate ordinary destructive \`removeAll\` rebuilding; preserve stable IDs, safe recovery actions and exact Simple/Narrow/Depth/Quick/Default targets.
- **Zero uncontrolled RAM spikes from a simple gesture:** Aggressive repeated right-click saves and screenshot shortcuts must not produce 2 GB extension-generated memory growth, accumulating PNG blobs, stalled Chrome processes, repeated heavyweight initialization, lost gestures, or Shelf crashes. The user may click a lot; admissions stay quick, and expensive stages use measured, small, isolated concurrency bounds. A genuine browser capture quota is answered with honest transient feedback and without crashing; do not queue unlimited screenshot captures that would capture the wrong later tab.
- **Stress tests are release gates:** 100/500/1,000 repeated right-click saves; 10/50/100 rapid screenshot commands; mixed workloads and Chrome worker wake; measured before/peak/after-idle RAM, outstanding tasks, event-listener cleanup, p50/p95/p99 latency, no duplicate/wrong-target writes. Do not claim real Chrome success from simulated tests.
- **No heavyweight durability machinery by default:** No unnecessary global serialized save bottleneck, frequent network health checks, per-click/per-byte checkpoints, a second logging database, or complex new scheduler. Preserve true remote saving and fast ordinary behavior. Cloudflare execution recovery enhancements are optional, evidence-gated and implemented separately when they demonstrably improve an actual failure.

### P0 — Automatic History with an explicit logged-out screenshot exception

- **Live History:** Every genuinely accepted right-click remote-save attempt and authenticated screenshot attempt records its true state and automatically updates the open History view, including verified/failure/partial/uncertain transitions, **without refreshing or reopening**. The existing \`remote-result\` and \`screenshot-history-changed\` → \`historyUI.invalidate(operationId)\` path is the starting point. Preserve all-time historical retention, pagination, lazy previews and stable IDs; do not fully refetch/decode lifetime History for each event.
- **Logged-out screenshot shortcuts are NOT History events:** Check session BEFORE writing initial screenshot \`checkpoint(job)\`, capturing bytes or creating retry-cache entries. When the user is logged out, screenshot shortcut commands add **zero** pending, failed or ghost History rows, do not upload or increment the verified badge, and may display transient login attention. In particular inspect \`src/screenshot/capture.mjs:start()\` which currently checkpoints before \`uploader.authority()\` in the downstream delivery path. A screenshot validly accepted while logged in remains a real History attempt if auth expires later.
- **Preserve History under bursts:** Targeted coalesced invalidation with bounded queued IDs; avoid the current 64-dirty-ID fallback turning ordinary bursts into expensive complete-history rereads. Open/closed History and thousands of older rows must stay responsive. A late UI subscription should reconcile from durable records without an always-on polling loop.

### P1 — Version 0.3.23 REDOWN branding and external icon only

**Already committed in source (do NOT repeat, revert or downgrade):** \`extension/manifest.json\` now declares name/short_name \`REDOWN\`, version \`0.3.23\`, and action title \`REDOWN — Remotes\`; \`extension/app.html\` page \`<title>\`/accessible brand label was aligned to \`REDOWN\`; \`package.json\` and \`package-lock.json\` version are \`0.3.23\`. These metadata changes do NOT implement the red icon artwork or badge animation.

**Still to implement:** Replace the current Chrome toolbar/Extensions-list/Chrome-owned side-panel *outer header* icon (beside the REDOWN title) with the user's approved glossy, rounded, bright-red button bearing a bold white **R**, visually based on the user-provided vintage red **B**-button reference. Produce a crisp Chrome-compatible set (at least 16, 32, 48, 128px), use consistent icon references in the manifest/action as necessary, and validate actual appearance in installed Chrome. **The current \`extension/manifest.json\` points its 16px icon to \`extension/menu-icon.png\`; inspect all actual icon usages before replacing the referenced asset.** No arrow in that outer header.

**OUTER ICON VERSUS SHELF TILE:** The **Chrome-owned external REDOWN R icon** is always the red app-button icon, independent of palette. The **R tile INSIDE the Shelf** at \`extension/app.html\` under \`<strong class="brand-tile">R</strong>\` keeps its original appearance, markup, size and position **in every existing palette and Remote V1**. **Exception explicitly approved by the owner:** the **new sixth Pinboard Red palette ONLY** styles that same internal tile as bold white R on red through a palette-scoped CSS override; no global markup/icon replacement or other theme change.

### P1 — Accurate badge counting + SNES-style TWO-PULSE green success flash

- **Reuse the existing daily badge owner.** Inspect \`src/chrome/daily-badge.mjs\`, which currently counts verified \`kind=save\` remote rows plus separately verified local download totals, resets according to the configured timezone's local midnight, and uses a blue-gray badge background \`#253b70\`. \`extension/background.mjs:recordRemote\` already refreshes for verified saves. Extend this owner—**do not create a second independent counter**. Preserve current daily rollover/timezone and existing download tally unless the owner separately changes the meaning of the badge.
- **Count verified screenshot captures as well as right-click remote saves.** An authenticated screenshot may have multiple destination outputs: for the user's requested **+1 per successful screenshot**, count the unique capture/operation ID **once when at least one intended output is independently confirmed**, not +1 per fan-out destination, retry attempt, update message or duplicate callback; explicitly test partial multi-destination cases and document the chosen success definition. Count a verified right-click save **once per unique operation ID**. No increment for blocked, failed, pending, unknown/unverified or logged-out shortcut events. Verify real provider evidence before marking verified; avoid a hot-path full-History scan on every flash if a compact incremental read is safe.
- **Exactly two crisp green badge pulses per normal verified success**: \`GREEN 100ms → normal/off 85ms → GREEN 100ms → normal/restored\`, approximate SNES arcade timing with **no smooth fade**. Flash **only the numbered Chrome toolbar badge background**; the red external R icon remains red, and this visual effect does not change the internal Shelf R or its selected palette. Return to original normal badge color and correct number on completion, error, interruption and idle.
- **Burst coalescing:** Every distinct verified operation affects the correct count, but a rapid burst must **not** queue a hundred animations or create unbounded timers and memory. Maintain a single bounded visual animation coordinator; coalesce/drop redundant flash animations where needed without dropping verified counts. Avoid repeated whole-History scans and ensure badge/background restoration on MV3 activation where possible. Never block a save, screenshot, menu click or History recording to play a flash. Test worker suspension, concurrent screen captures, rapid verified saves, midnight rollover and updates to a verified result.
- **Source details:** Current \`src/chrome/daily-badge.mjs:countRows\` explicitly excludes \`kind !== 'save'\`; screenshot results are stored as \`kind:'screenshot-to-cloud'\`. The screenshot recorder lives in \`extension/screenshot-background.mjs\`. This is a real existing gap: a screenshot success currently doesn't automatically increment the ordinary save count. Change the projection narrowly and prove no wrong counts or duplicates.

### P1 Aesthetic API — NEW SIXTH selectable "Pinboard Red" palette (Pinterest-inspired)

**New owner instruction, superseding only the older unconditional "Shelf R never changes" rule:** Add a **new, selectable** Bit o' Polish palette called **Pinboard Red** (suggested stable ID \`pinboard-red\`). In **this palette only**, the **small R tile INSIDE the Shelf, at the extreme upper left**, becomes a **bold white R centered on a vivid red rounded-square background**, matching the REDOWN red-R identity approved for the *external Chrome extension icon*. Do **not** change the Shelf R tile in Original Rose, Ocean Blue, Emerald Forest, Amethyst, Sunset Amber or Remote V1. Keep the existing Shelf R markup, position, size and accessible label; apply the alternate colors/weight through **palette-scoped CSS**, not a global image replacement or app-wide brand-tile edit.

**Visual direction:** *Pinterest-inspired, not an official Pinterest theme*: friendly editorial clarity, clean modern rounded sans-serif typography, vivid red as an intentional accent, predominantly soft off-white/white surfaces, warm neutral gray separators, charcoal text, generous visual breathing room and subtly softened cards/buttons. It should feel approachable, energetic and polished, **not all-red**, not visually overwhelming or a direct copy of another company's logo or proprietary assets. Present the same polished visual character in File Explorer, Remotes, History, Settings and dialogs through the existing palette variables, without forcing a Pinterest-style heavy masonry grid, extra image loading, new fonts fetched from a server or reflowing the application's core layout.

**Suggested complete light/dark role palette for Codex to tune against contrast and actual screenshots:**

| Color role | Light | Dark |
| --- | --- | --- |
| background | \`#F7F7F7\` | \`#151517\` |
| surface | \`#FFFFFF\` | \`#232326\` |
| raised | \`#EFEFF0\` | \`#303034\` |
| text | \`#191919\` | \`#F7F7F8\` |
| muted | \`#626268\` | \`#B7B7BD\` |
| border | \`#E0E0E3\` | \`#414146\` |
| accent | \`#E60023\` | \`#FF5A6F\` |
| selection | \`#FCE5EA\` | \`#48252E\` |
| focus | \`#B8001B\` | \`#FF8595\` |

**Typography:** Use a bundled/available system sans stack—e.g. heading \`"Segoe UI", "Helvetica Neue", Arial, sans-serif\` at weight **700**, body \`"Segoe UI", "Helvetica Neue", Arial, sans-serif\` at **400**, controls \`"Segoe UI", Arial, sans-serif\` at **600**. Bold, friendly and immediately legible headings; consistent but not overly heavy buttons; readable long filenames, badges and History. No external font requests and no font binaries bundled without a separately justified reason. This is an aesthetic direction, **not a claim that Pinterest uses these exact fonts**.

**Implementation boundaries (source-grounded):**
1. \`src/aesthetic/packages.mjs\` currently declares exactly **five** palettes as \`{id,name,colors,fonts}\`; append a **sixth** \`pinboard-red\`, conforming to all nine required light/dark color-role pairs and three font roles. No replacement, renaming or preference migration of the existing five. **Do not change the default palette** (currently Original Rose) or Remote V1 compatibility.
2. \`src/aesthetic/host.mjs\` manages the single Aesthetic preference and independently persisted palette preference; it currently writes CSS role variables but does **not** expose the active palette as a DOM dataset attribute. Add a minimal, safe theme-scoped selector source such as \`root.dataset.palette=palette\` in its **existing paint/apply path** (with normal fallback) so that one CSS rule can style the brand tile **only** while \`data-aesthetic=minimal\` and \`data-palette=pinboard-red\`. Do not create a second theme manager or persistent storage namespace.
3. In \`extension/app.css\`, preserve the existing base \`.app-header>.brand-tile\` presentation for **all other palettes**. Add an explicitly scoped override for Pinboard Red: solid \`#E60023\` red background, \`#FFFFFF\` bold white R, existing ~30×30 tile and rounded corner radius (adjust only within this palette to match the approved REDOWN app-button shape). No layout expansion, SVG dependency, imported asset, font fetch or changes to outer Chrome icon/badge assets.
4. Colors, typography and subtle component refinement should flow through the existing \`extension/aesthetic.css\` CSS variables; **only** small opt-in Pinboard-specific presentational adjustments (such as button radius, card edge/spacing if needed) may be added when variable roles alone don't produce the intended premium feel. No new masonry virtualization logic, image operations or performance-heavy effects.
5. The **external toolbar/Chrome side-panel header red-R icon stays REDOWN red regardless of which Shelf palette is active**. Switching palette changes only Shelf presentation. The SNES double-green badge effect also remains independent of palette.
6. Contrast/accessibility: verify red primary buttons have readable white/contrasting text (do not accidentally rely on the existing \`--primary-text\` value if it makes light-on-light or dark-on-dark), focus states remain visible and WCAG AA contrast is tested where applicable. Preserve compact-header More/theme separation, properly spaced circle-free preview chevrons, keyboard shortcuts and no extra RAM/network usage.

**Acceptance tests:** The Settings palette picker lists **six** schemes; choosing Pinboard Red immediately paints every Shelf view in the new red/white/charcoal typography, and makes **only** the internal upper-left Shelf R tile white on red. Toggle light/dark; switch Pinboard → Original Rose → Emerald Forest → Remote V1 → Pinboard, then reload/reopen the Shelf, restart the worker and confirm the previous palette survives without creating duplicate state. Other palettes show their **unchanged original R tile**. Confirm no accidental red global overrides, theme/button overlap, layout regressions, text clipping, flicker, font download, additional network call or image cache. Test narrow and expanded Shelf widths.

**Sequencing:** This is P1 presentation work, after native menu/burst/History P0 fixes; isolate it in a distinct commit alongside but not entangled with the red Chrome icon, badge animation, preview polish or header overlap repair. **A theme should never affect native right-click availability, upload throughput, remote permissions or screenshot reliability.**

---

### P1 UX — premium gallery preview navigation arrows, NO CIRCLES

**Owner's explicit aesthetic change (November 21):** In the *regular Shelf preview/gallery*, the left/right arrows currently resemble little awkward or lopsided triangles trapped inside round buttons. Make the **arrow glyphs themselves** beautiful, symmetrical and refined; **remove the visible circular button backgrounds/outlines entirely**. The result should feel premium, clean, deliberate and appropriately spaced, not like tiny triangle-in-a-bubble controls.

**Source-grounded target:** \`extension/app.mjs:galleryControls(e)\` creates the existing \`#gallery-previous\` and \`#gallery-next\` buttons with SVG path chevrons and accessible labels. \`extension/app.css\` styles \`.gallery-controls .gallery-arrow\` with a visible filled background/hover, while a later rule \`[data-gallery] .gallery-arrow{width:36px;height:32px;border-radius:50%}\` explicitly makes the controls circular. **Edit this existing presentation layer and its SVG drawing if necessary; DO NOT replace the gallery navigation engine.**

**Implementation contract:**

- Use **matching, visually balanced, correctly proportioned thin-to-medium stroke chevrons** or a similarly polished minimalist arrow treatment (properly centered in equal-size left/right hit areas). No lopsided triangles, uneven stroke geometry, encircling disk, bubble, round border, filled tile, unnecessary flourish or clutter.
- **Increase the visual breathing room** between navigation controls and the gallery image/title, with symmetric spacing and clean baselines. Keep placement consistent with the existing Gallery/Preview header and responsive Shelf widths; avoid squeezing the image or causing overflow.
- **Keep generous invisible pointer hit targets** and visible keyboard focus indication. The visual arrow glyph may be small/elegant, but mouse/touch click access must not shrink with it. Hover/pressed/disabled states should use tasteful stroke/color/opacity or subtle noncircular feedback compatible with every Bit o' Polish palette, Remote V1 and both dark/light themes. A focused arrow must be discoverable for keyboard accessibility without reinstating a permanently visible circle.
- Preserve **previous/next image click behavior**, actual enabled/disabled boundary logic, keyboard left/right navigation in normal preview, and the separate immersive behavior: arrows pan the zoomed image inside immersive rather than navigating to another file. No extra preview copy, image re-fetch, event listener, worker wake or resource-heavy animation.
- **Do not change** either R brand tile while editing the arrows (the only internal tile recoloring is the separate new **Pinboard Red palette-specific** rule), nor the screenshot capture, History, native right-click menu, title/rename UI or unrelated dialogs.
- **Verify visually and functionally** at ordinary and narrow Shelf widths with short/long filenames, first/middle/last gallery item, all six Bit o' Polish palettes (including Pinboard Red), light/dark, focus/hover/disabled states and repeated open/next/previous/immersive/close cycles. Compare visual geometry and click hit areas before/after, and record actual Chrome acceptance separately from mock tests.

**Desired visual shorthand:** *Refined mirrored chevrons, no circles, better spacing, accessible invisible hit targets, no changes to underlying gallery semantics.*

---

### P1 UX — SHELF-LOCAL keyboard improvements: Ctrl+Shift+F7 Search toggle + immersive image navigation

**Owner clarification:** ALL keyboard behaviors below operate **only inside the REDOWN Shelf** when the Shelf owns focus. **Do NOT register any new Chrome-wide shortcut, modify \`extension/manifest.json\` commands or ask the user to visit \`chrome://extensions/shortcuts\`** for immersive navigation or zoom. The existing distinct Chrome-level command that opens Explorer is outside this request. Reuse existing Shelf listeners and controllers, with one owner for each event.

**U01 — Ctrl+Shift+F7 focuses Search, pressing again unfocuses it, then alternates.**
- Existing Shelf-only default command is \`explorer.focusSearch = Ctrl+Shift+F7\`, in \`src/api/shortcuts.mjs\`. Preserve user-remappable shortcuts and the exact registered binding; don't hard-code an unremappable second listener.
- First press, with File Explorer active and a valid directory: reveal the existing filename Search control (including popout as needed) and focus its input. The field remains visible until explicit **Esc** or far-right **X** dismissal, in line with the owner's previous rule; **Enter never hides Search**.
- Second press, **while the filename Search input itself is focused**: move keyboard focus to the prior safe Explorer element or Search opener. **Do NOT close/hide/dismiss Search**, clear text, cancel the running search, discard results or reset the listing. Third press refocuses the same Search.
- Source hazard: \`extension/shortcut-settings.mjs\` currently ignores shortcuts from **all input elements**, so this second press does not reach \`explorer.focusSearch\`; \`extension/explorer-layout.mjs\` maps the command directly to \`focusSearch\`, not a toggle. Route this shortcut **specifically** from the Search input through the same Shelf-local command owner while retaining text-input guards for every unrelated input (rename dialog, URL entry, settings, etc.). No duplicate global listener.
- When Search isn't available, do not force login, open Chrome shortcuts or steal focus. Avoid unnecessary API searches on focus-only changes. Preserve Esc/X behavior as separate explicit dismissal actions.

**U02 — Immersive preview keyboard precedence, zoom and three-level Esc.**
- The existing \`extension/immersive-view.mjs\` already changes the size of the same loaded image, supports click-to-toggle fit/200%, slider/fit (100–400%) and \`ResizeObserver\`; \`extension/app.mjs\` already owns gallery next/previous and dialog \`cancel\`. **Extend these components; do not add a second image viewer, network fetch or decoded image cache** just to navigate.
- When the image is in **normal gallery preview** (not immersive): **Left/Right** navigate previous/next images, and **Esc** closes the preview back to File Explorer, as before.
- When **immersive, fit at 100%**: **Left/Right** may continue to navigate previous/next images while keeping immersive mode, preserving existing behavior. **Up/Down** do not unexpectedly navigate gallery.
- When **immersive, zoomed above fit/100%**: **all four arrow keys (Up/Down/Left/Right) pan around the *same* image**, not to other gallery items. Pan by an appropriate bounded pixel step using existing frame scrolling; key-repeat may pan smoothly without creating unbounded timers, handlers or image buffers. Clamp to the real content edges. Do not navigate gallery on an arrow key while zoomed.
- In immersive mode **+ / Shift+= / NumpadAdd** zooms in one moderate increment and **- / NumpadSubtract** zooms out; clamp to the existing slider minimum/maximum, keep the slider/percentage in sync and preserve image focal point where practical. Clicking the image continues to toggle zoom and the existing Fit button still restores 100%.
- **Esc is a staged state machine, with exactly one step per keypress.** Starting immersive at e.g. 200%: **Esc #1 → immersive at fit/100%, with pan reset**; **Esc #2 → normal gallery preview of the same image**; **Esc #3 → close preview and return to File Explorer**. When immersive is already at fit/100%, Esc directly exits immersive to normal preview, and the following Esc closes the preview. When already in ordinary preview, Esc closes it once.
- Give dialog \`cancel\`, immersive viewer and gallery keyboard listeners **one unambiguous precedence**. Do not handle the same Esc twice, call \`moveGallery\` on zoomed arrows, or interfere with filename-rename input, sliders, text inputs, menu dialogs or IME composition. Only intercept keys while Shelf/preview owns focus; browser keys outside Shelf remain untouched.
- Closing or moving gallery must dispose observers/listeners and keep memory bounded. Zooming/panning must not download additional copies or create extra full-resolution buffers.

**Shelf-only UX test matrix:** Ctrl+Shift+F7 repeated first/second/third press, with Search on toolbar vs popout, Enter submission, Esc/X dismissal, while rename/edit inputs active; ordinary/immersive 100%/immersive >100% keys, keyboard zoom min/max, image click, Fit, three-stage Escape, next/previous image, focus/scroll restoration, and 100+ open–zoom–pan–close cycles with no listener or RAM growth. Check actual Windows Chrome side-panel/Shelf focus; no new manifest shortcut commands.

### P1 UX — FIX Emerald Forest More/theme collision, across palettes and repeated resizing

**Owner-reported, explicit repair requirement:** In **Emerald Forest**, the Shelf's top-right **More ▾** trigger/dropdown collides with and overlays the adjacent **sun/moon light/dark theme icon** after the user expands and then shrinks the Shelf. The controls must be **visibly separate, independently clickable and consistently placed** in BOTH dark and light themes, after repeated width changes. This must be FIXED rather than just documented.

**Source targets:** \`extension/app.html\` has \`header nav .header-more\` and a sibling \`#theme\` button; \`extension/app.css\` defines \`.app-header\` grid columns, \`nav\` flex with \`white-space:nowrap\`, responsive breakpoints and \`.header-more [role=menu]\` as \`position:absolute;right:0;top:100%;z-index:60\`. The header menu and the theme button may share space when width contracts. Palette variables alone may expose a layout bug, rather than being its proven cause. Investigate computed layout, min-content sizing, breakpoint changes and dropdown anchoring with screenshots/geometry before fixing.

**Required behavior:**
- At every supported Shelf width, the visible **More trigger and the sun/moon button never physically intersect, cover each other, steal hit targets or occupy the same grid/flex space**. The opened More menu must not obstruct the theme toggle in the collapsed header. Ensure its placement is within available viewport/shelf bounds without horizontal overflow; use appropriate responsive reflow/compact More affordance, gap and \`min-width:0\` where needed, not arbitrary hidden theme controls or noninteractive overlay patches.
- The theme button retains its own stable accessible hit area (currently nominal 36×36); More stays usable by mouse, keyboard, touch and screen reader. Opening/closing menu, changing theme and switching palettes does not shift or trap focus; Escape dismisses the menu exactly once; click-away works.
- Test **Emerald Forest first** and all **six Bit o' Polish palettes** (including Pinboard Red), both light/dark themes and widths around **260/310/350/480px** plus real wider/narrower side-panel sizes. Test the sequence **expand → shrink → expand → shrink**, open More before/after resizing, rotate/toggle theme, verify bounding rectangles do not overlap and independently click each control.
- Preserve the **Shelf R brand tile's markup, layout and hit area**, all header navigation and the separately requested external Chrome red-R extension icon. The separate **Pinboard Red** palette may recolor the internal R tile **only while selected**; the More/theme collision fix itself must not change any tile. No new header architecture or native Chrome menu changes.
- Add visual/geometry regression tests and actual installed-Shelf evidence; distinguish source fixture PASS from manually observed real Chrome acceptance. Don't label fixed until collision is absent under the owner's repro conditions.

**Timing:** Implement P0 menu/burst/History fixes first; this P1 UX repair and the Shelf-only keyboard improvements should be isolated in separate small commits, with regression tests. They do not require Chrome shortcut registration and may not introduce slow image operations, broad event listeners or extra RAM consumption.

### Long-horizon follow-on — low-maintenance, high-reliability Cloudflare operations

Preserve existing signed operation identity, exact account/bucket/key, Durable Object claim/readback verification and safe retries. An accepted Durable Object claim with \`waitUntil\` is not guaranteed independently restartable execution, so audit actual failure modes and remote source accessibility. **Do not deploy extra Queues/Workflows/alarms or persistent checkpoint machinery merely because it exists**. Propose a minimal measurable fix only if a reproduced customer-relevant interruption genuinely requires it and the owner approves added cost/complexity. Keep actual file content true remote, preserve Cloudflare authority, Worker bindings, OAuth/extension ID and customer configuration.

### Required staged delivery / report

1. **Milestone A / P0:** non-destructive menu repair, pre/post-login and worker wake, rapid-save/screenshot burst resistance, automatic live History, ZERO logged-out shortcut History entries; real Chrome evidence distinguished from fixtures.
2. **Milestone B / visual P1:** external glossy red R icon in toolbar/Chrome side-panel header regardless of Shelf theme; internal Shelf R unchanged in all **existing** palettes, **red background with bold white R only in new Pinboard Red**; six selectable palettes with Pinterest-inspired color/typography for Pinboard Red; daily verified screenshot+save count and double green SNES badge pulse; actual Chrome screenshot and memory/performance proof.
3. **Milestone C / separate P1 UX:** polished circle-free preview chevrons and spacing, Shelf-only Ctrl+Shift+F7 search toggle, immersive pan/zoom/Escape behavior, and Emerald Forest More/theme overlap repair across palettes and resize combinations; independent visual and functional regression results.
4. **Milestone D / conditional future:** remote-job interruption and backwards compatibility audit, no unnecessary scheduler, no net responsiveness regression.
5. **End-of-run:** exact branch/commit/test status, installed Chrome/path/build identity, independent provider receipts or honest blockers, memory p95/peak, all accepted actions accounted, badge count/double-flash test, History live refresh test, and unchanged known-broken 0.3.22 tag.

**No cosmetic feature justifies changing \`key\`, OAuth redirect, private data, permission grants or changing the actual native save engine beyond the separately specified P0 reliability patch.**

---

## OWNER PRIORITY OVERRIDE — TWO INVARIANTS PLUS AUTOMATIC HISTORY

**P0 #1: RIGHT-CLICK MUST ALWAYS BE AVAILABLE.** Enabled Chrome native menu entries must be available on supported pages before login, immediately after login/reconnect, after MV3 worker wake, and **while users are rapidly saving or taking screenshots**. Never tie menu registration/gesture admission to a transfer, UI, History refresh, cloud status or global upload lock. Do not rebuild the menu on each click.

**P0 #2: RAPID SUCCESSIVE ACTIONS MUST NOT CRASH OR BLOAT THE PRODUCT.** A single right-click must not cause an extension-generated multi-gigabyte (~2 GB) RAM spike. Repeated saves and screenshot shortcuts must not launch unbounded concurrent captures/PNG copies, network calls, progress writes, image previews, listeners or retained promises. Keep user gestures quick; bound only expensive downstream work. If a browser quota or true capacity limit is reached, issue immediate, honest BUSY/rate-limit status with an operation ID where accepted—never freeze, silently drop accepted distinct actions, or pretend success. **Reliability that makes normal saving materially slower is a regression.**

**P0 #3: BOTH RIGHT-CLICK SAVES AND SUCCESSFULLY AUTHORIZED SCREENSHOTS UPDATE HISTORY AUTOMATICALLY.** The open History page updates itself after an attempt is durably recorded and again when its status changes, without refresh, reopening the Shelf or manually switching views. Preserve the full lifetime History, honest pending/verified/blocked/uncertain distinctions, lazy thumbnails and stable operation IDs. Notifications are best-effort; durable data is authoritative.

**MANDATORY SCREENSHOT EXCEPTION: when the user is NOT LOGGED IN, pressing any screenshot shortcut MUST NOT create a History entry—not a pending record, not a failure record, and not a phantom screenshot.** Check authenticated session **before** screenshot job journaling and before capturing/retaining PNG bytes. A lightweight nonpersistent "Log in to take screenshots" notification/attention is permitted. If a valid logged-in screenshot starts and a later provider/auth/network failure occurs, **that accepted attempt does belong in History** with its true state; do not erase it retroactively. Apply the exception to each screenshot shortcut and the corresponding capture path; do not accidentally suppress unrelated right-click save results.

**Performance veto:** Do not introduce a heavy scheduler, per-byte/per-click checkpoints, a new global queue, duplicate persistent stores or per-result full-History reads. Benchmark latency, CPU, memory, listener counts, outstanding jobs and History refresh cost **before and after** any reliability patch. New durability work must be a net reliability improvement without severe hot-path slowdown.

---

## 0. Read-first controlling documents, correct repository and baseline

**Repository:** \`thanks-cohn/Click2Cloud\`.

**Working source:** branch \`codex/minimal-baseline-palette-fonts-quiet-screenshots-2026-11-20\`, currently manifest/package version **0.3.23** after branding metadata commits. The **original** protected broken reference is still 0.3.22. Repair the current 0.3.23 HEAD, using the 0.3.22 tag as the diagnostic before-baseline; never revert the manifest to 0.3.22.

**Preserved known-broken baseline:** annotated tag \`redown-0.3.22-BROKEN-pre-repair-2026-11-21\`, source commit \`91aad92e11ccd3ad28bbc4c40ca1ec3be614ec32\`. **Never delete, rewrite, retarget or replace this tag.** The documentation commits after it do not mean the code was repaired.

**Required read order, all in the current Click2Cloud branch:**

1. [\`/next_codex_request-11.21.2026.md\`](../next_codex_request-11.21.2026.md) — **controlling P0 right-click audit, ten principles and R01–R22 acceptance scenarios**.
2. [\`/longetivity-and-robustness.md\`](../longetivity-and-robustness.md) — **founding longevity charter**, browser/remote/storage boundaries, restartable execution, compatibility, customer-scale fault testing and staged release policy.
3. [\`/AGENTS.md\`](../AGENTS.md) — current project ownership/authorization/precedence; the newest controlling owner rule prevails over historical contradictory sections.
4. [\`/latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md\`](../latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md) — exact typed API ownership, native mode projection, Simple/Narrow/Depth/Quick/Default and source↔API documentation.
5. [\`/11.2026/workings/right-click-workings.json\`](../11.2026/workings/right-click-workings.json) — actual, versioned configuration/behavior map.
6. [\`/Issues_and_Bugs/README.md\`](../Issues_and_Bugs/README.md) — existing issue ownership and evidence.
7. [REDOWN background native menu](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/extension/background.js#L2487-L2660), [worker-activation reconciliation](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/extension/background.js#L2836-L2848), [BOOT repair findings](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/docs/boot/IMPLEMENTATION.md) and [BOOT tests](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/tests/boot.test.mjs) — **read-only reference, not a codebase to transplant**.

**Branch/process:** Record current Git SHA and status, then work on a **new P0 repair branch based on the current 0.3.22 working head**, not on 0.3.21, not on the immutable known-broken tag, and not on REDOWN or \`main\`. Make focused commits and provide their hashes. Preserve all existing files and owner data. If branch creation is unavailable, do not change production/main; report the limitation.

**Evidence boundary:** No one has yet proved the precise cause of the owner's installed-Chrome missing-menu incident. Confirmed source hazards are below. ReDown's relevant fixture results do not certify either product in the owner's Windows Chrome. This request and the two charters are **not implementation evidence**.

---

## 1. P0 scope: eliminate the disappearing native right-click menu

### Observed symptom and controlling outcome

The owner reports the native **Chrome** extension right-click action disappears, especially immediately after login. This is not the in-Shelf Explorer's context menu, not a merely failed save, and not yet proven to be a Chrome-wide issue.

**The acceptance rule:** on a supported Chrome page, image or link, when the extension and provider visibility are enabled, the extension's native provider entry remains present **before login, after first login/reconnect, on worker wake, after restart, after a failed child registration, and while Cloudflare is offline**. The user must not need to reopen the Shelf, refresh the page, reset storage, reauthenticate merely to restore a menu, reload the extension or restart Chrome.

Restricted Chrome pages, disabled extension, failed worker registration/evaluation and Chrome API denial are documented platform limitations—not pretend-success cases. A visible unready provider entry may open its proper login/attention/Manage path; it **must not fake a completed remote save**.

### Source-level defects to reproduce before modifying code

- \`src/chrome/registrar.mjs\`: the existing \`apply\` path explicitly clears acknowledged state and runs \`await native('removeAll', [])\` before parent-first creation. A failed child, ambiguous callback or interrupted rebuild can erase the old working menu. **Confirmed source hazard, installed incident hypothesis.**
- \`extension/background.mjs\`: \`nativeReady()\` reconciles but is wired to \`runtime.onInstalled\`/\`onStartup\`; no unconditional nativeReady on ordinary successful module-worker activation is visible in the inspected source. The handlers silently swallow failures. A click handler cannot heal a **completely missing** native entry by requiring the user first to click that missing entry.
- \`extension/background.mjs\` OAuth \`onConnected\`: clears snapshots and emits \`connection-changed\`, but does not directly request native reconciliation.
- \`src/api/service.mjs\` \`loginBegin\`: after successful OAuth, initialization that is blocked/incomplete **without saved destinations** can bypass the \`applyCurrent\` reconciliation branch. OAuth success is already separate from setup failure and must stay separate.
- \`extension/manifest.json\` version 0.3.22 includes \`contextMenus\` permission, so avoid inventing a missing-permission diagnosis. Confirm real Chrome worker errors and loaded extension path.
- \`readCurrent()\` has an established-state protection: desired prior native generation cannot silently become freshly empty CURRENT generation zero. Preserve this fence even if menu registration is degraded.

**Investigation must identify first missing transition:** worker evaluated → listener registered → minimum native provider action → canonical CURRENT loaded → desired plan compiled → Chrome API requested → callback acknowledged → user independently sees OS native entry → click routes to canonical action. Failure can be at any stage; do not equate Chrome ACK with rendered UI.

### Required P0 implementation

**P0.1 — Independent minimal entrypoint.** Install/maintain the smallest *existing-approved* provider/attention action as early as Chrome permits. Cloudflare must be a single clickable native entry even with zero saved targets or before first login, subject to the user's visibility setting. Keep each other enabled provider's approved behavior. Do not add an unnecessary REDOWN root, duplicate Cloudflare heading, imaginary folder or additional menu owner. No network, R2, setup, Worker deployment, Shelf, screenshot, theme or directory scan as a prerequisite for basic native access.

**P0.2 — Incremental, non-destructive Chrome registrar.** Within the existing one-and-only \`createChromeRegistrar\`, replace routine \`removeAll\` with a stable-ID, parent-first plan/diff: update appropriate existing rows; create missing rows; selectively delete obsolete rows only when justified by desired configuration or Chrome's ordering constraints. Preserve the existing entry/recovery action through partial failures. Handle update/move/order restrictions explicitly and with the narrowest subtree replacement. A lost \`create\` callback is **uncertain**—do not assume nothing was created. Missing in-memory/durable registration-ID cache is **unknown**, not permission to reset the whole menu. No duplicate entries; no stale unauthorized save.

**P0.3 — Lifecycle and login recovery.** Reconcile at install, browser startup, **every actual MV3 worker activation**, successful first login, reconnect/reconsent, provider ON/OFF and validated destination/Default/Quick/Simple/Narrow/Depth edits. **Do not rely on onStartup as worker-wake notification.** Use the same serialized registrar/API path and coalesce repeated same-generation requests to avoid storms. Login success must not be cancelled by menu/setup failure; a failed setup must not erase available native provider actions. No background keepalive loop.

**P0.4 — Preserve customer truth and correct clicks.** CURRENT/IndexedDB/browser settings are the authority; never overwrite established state with empty synthesized defaults. Preserve accounts, saved and intentionally hidden targets, account permissions, user-selected Default/Quick, exact bucket/prefix, all Simple/Narrow/Depth hierarchy and previous verified receipts. A retained old/native row is *display recovery*, never authorization: clicking revalidates current identity, generation, account, target, permissions and source. Block clearly on stale/deleted/unauthorized target instead of rerouting to a random or default bucket.

**P0.5 — Bounded diagnostics and explicit emergency repair.** Reuse existing \`nativeRegistration\`, CURRENT, \`chrome.storage.local\`, IndexedDB and existing recorder. Add small bounded state/attempt/epoch/ACK/error codes and the login→reconcile trace. Errors must not disappear through empty catches without a record. Keep RAW vs SECURE export guarantees; do not log secrets or original source URLs in secure reports. A targeted manual native-repair control can be available as a last resort but must not be required for normal use. A healthy no-op should not churn native menu entries.

### P0.6 — Rapid saves/screenshots, live History and logged-out shortcut exclusion

**Inspect these actual 0.3.22 source locations before changing code:**
- \`src/screenshot/capture.mjs\`: \`active\` tracks individual IDs, not an obvious global bound on many distinct captures; \`start()\` currently creates a pending job and calls \`void checkpoint(job)\` **before** session authorization. \`finish(job)\` journals failures. This may create a **logged-out shortcut History row**, violating the new requirement. Verify the complete caller authorization path and fix before committing.
- \`extension/screenshot-background.mjs\`: \`onCommand\` starts jobs; \`record(job)\` persists screenshot results and emits \`screenshot-history-changed\`; \`notify\` sends \`screenshot-result\`. Preserve the existing owner and separate transient logged-out attention from persisted accepted operations.
- \`src/screenshot/capture.mjs\`: \`deliver()\` may run **up to 3 output uploads per screenshot**, compounding concurrent captures; multiple structured-clone checkpoints and image hashing can be expensive under bursts. \`src/screenshot/retry-cache.mjs\` has a **48 MiB local cache quota**, not a hard limit on active in-memory Blobs. \`src/chrome/visible-tab-screenshot.mjs\` already classifies Chrome capture quota errors. No source inspection alone proves the owner's feared 2 GB spike; profile rather than presume.
- \`extension/background.mjs:recordRemote\` durably persists right-click save results and emits \`remote-result\`; \`extension/app.mjs\` handles both result channels and \`historyUI.invalidate\`. \`extension/history-page.mjs\` already coalesces invalidation for ~150ms, but **overflow at 64 distinct dirty IDs can force a full History reread**. On a long-lived History, repeated bursts could cause substantial unnecessary I/O and UI work. Keep the existing pipeline, fix its failure/race and burst cases—not a second History engine.

**Implementation must satisfy ALL:**
1. **Fast independent gesture admission:** right-click availability and dispatch never await ongoing transfers, screenshot conversions or History rendering. Preserve a separately accounted ID/receipt for every actually accepted action; don't conflate distinct gestures or accept work that cannot be tracked.
2. **Bound only expensive work:** enforce small empirically chosen limits for active screenshot capture, PNG/Blob bytes, screenshot fan-out, remote stream concurrency and preview decoding. Do not enqueue unlimited PNGs or hold original full-resolution bytes after no longer needed; release image references and event listeners on every completion/failure. Queueing screenshots must never capture a later page/tab instead of the original gesture; prefer immediate clear busy/rate-limit responses if valid immediate capture isn't possible. Don't impose one giant serial bottleneck on normal saves.
3. **Logged-out shortcut guard BEFORE writing History:** with no authenticated session, no screenshot History record, no retry cache, no upload and preferably no capture. Transient UI feedback only. Protect against session race: a screenshot accepted while logged in stays in History if auth subsequently expires and is marked blocked/uncertain as appropriate. Repeated logged-out shortcuts must leave History count and durable screenshot writes unchanged.
4. **Live History from the canonical record:** save results and screenshot captures publish bounded coalescible ID-based invalidations after durable result updates; History refreshes changed IDs without reopening or polling constantly. Pending→verified/failed/partial/uncertain transitions reuse the SAME ID; don't lose notifications when the panel is mounted/unmounted. Reopen/focus reconciles cheaply from persisted data, without re-fetching cloud bytes for a list update.
5. **History stays lightweight and complete:** no arbitrary lifetime cap, no full archive scan on ordinary bursts, no O(history-size) work per event, no automatic decoding of all thumbnails, no focus/scroll/selection loss. Maintain existing pagination, lazily loaded previews, export semantics and chronological ordering. Avoid writing whole job copies at each trivial progress callback.
6. **Fail independently and honestly:** optional History/cache/recorder failures must not make native menu disappear or crash the screenshot/save dispatcher. If actual Chrome capture quota or cloud quota is hit, report it promptly and keep the product usable.

| Test | Release acceptance |
| --- | --- |
| B01: 100, 500 and 1,000 rapid right-click saves | Menu stays registered/visible, responsive, exact account+bucket per operation, no extension crash, no runaway memory/tasks; all accepted operations accounted for |
| B02: 10, 50 and 100 rapid screenshot shortcuts | Stable bounded in-flight image bytes and output fan-out; Chrome quota produces honest busy/rate-limit result, not crash or false capture |
| B03: logged-out shortcut once and in bursts | ZERO screenshot History rows, ZERO screenshot retry-cache entries or uploads; transient login feedback allowed |
| B04: logged-in screenshot followed by auth expiration or network error | One retained History row with actual blocked/pending/uncertain state; correct operation ID and no false success |
| B05: History open during bursts of remote saves and screenshots | New rows/status changes appear automatically without refresh or reopening; no duplicate or lost IDs |
| B06: History closed, then reopened after work completes | Durable changes displayed accurately, including both types; no reliance on a live UI message |
| B07: 100+ unique result updates with thousands of old History records | Batched targeted updates, no repeated full archive rereads, no massive preview decode, preserved focus/scroll/pagination |
| B08: mixed save/screenshot/History interactions through worker wake | Native menu never starved, no accumulating listeners, blobs, orphaned promises or memory growth across repeated rounds |
| B09: repeat bursts in real Windows Chrome with process memory sampling | Record before/peak/post-idle RAM per process, latency p50/p95/p99, task counts, screenshot bytes, failures, receipts and Chrome version; actual hardware/browser tests distinct from mocks |

Do not treat "survived tests" as a proof of literally unlimited capacity. Actual capture quotas, user hardware and provider limits exist. **The goal is graceful, fast, predictable behavior under extreme customer clicking, never a crashed product.**

### P0 proof gates before any durability feature is attempted

Implement the R01–R22 matrix in the controlling P0 document as relevant, especially:

- **Cold first install:** no saved destinations and no login, native enabled Cloudflare action visible on actual eligible page/image/link and click reaches accurate login/attention; no unintended bucket creation.
- **First successful login:** immediate native entry without refresh/reopening Shelf, both when setup completes and when setup fails with no saved target.
- **Existing customer reconnect:** same saved menu structure and exact target IDs through logout/reconnect/reconsent.
- **20+ worker activations in the harness:** native rows survive, no ordinary \`removeAll\`, no duplicate event listeners and no destructive config writes.
- **Native failure injection:** lost callback, create timeout, failed parent/child, unknown ID cache, concurrent startup/login/Apply, interrupted generation and missing CURRENT; previous safe entry remains available.
- **Mode and destination regression:** Simple one-leaf vs multiple, Narrow ancestor visibility, Depth real folders only, Quick/Default, provider visibility OFF/ON, different accounts/buckets, correct action on click.
- **Actual installed Windows Chrome:** observe the native rendered entry, exact menu gesture and authorized disposable R2 save/readback where permitted, comparing the unchanged bad tag with the repaired build.
- **Separate truth:** unit fixtures, mocks, Chrome API ACK, visually rendered native menu, Worker response, R2 verified object and History receipt are different evidence classes. Mark each **PASS / FAIL / BLOCKED / NOT TESTED**.

**P0 release gate:** BOTH native-menu availability AND rapid-fire save/screenshot stability, plus automatic History updates and NO logged-out screenshot History records, must pass. Do not call the native-menu defect FIXED until real installed Chrome acceptance passes in the affected use case. If the environment blocks unpacked Chrome or live provider verification, finish safe, testable source repairs and mark real acceptance **BLOCKED/OPEN**. Never claim success based on a screenshot fixture or ACK.

---

## 2. P1 follow-on: make the remote Worker as durable as its receipts

**This is a second, explicitly separated workstream.** Start only after the P0 native menu, burst stability, logged-out screenshot exclusion and automatic History acceptance tests have passed. **Never add a scheduler because it sounds sophisticated.** An unnecessary scheduler, checkpoint or remote handshake is itself a reliability/performance regression. If the available Codex run is insufficient, leave a precise design, scoped follow-up task and reproducible test fixtures rather than performing an unreviewed Worker overhaul in the same patch.

### What Click2Cloud already does well (preserve it)

- \`src/cloudflare/worker.mjs\` uses Durable Object \`RemoteClaims\` with transactional operation ID claims, signed per-operation authorization, account/bucket/prefix binding, lease bookkeeping, pending status and independent R2 verification/reconciliation of ambiguous results.
- \`src/cloudflare/transport.mjs\` uses scoped capabilities, plan identity, status polling, lease renewal, exact target and final verification. \`src/cloudflare/writer-registry.mjs\` validates a single intended provider writer.
- \`src/cloudflare/deployment.mjs\` checks explicit setup approval, account authority, existing Worker bindings, code digest and pending deployment state; it prevents silent unauthorized replacement.
- \`src/cloudflare/resources.mjs\` declares bounded memory/concurrent admission, although actual customer headroom and failure behavior need measurement.
- Actual customer file content remains remote-first; no local Downloads-directory staging, disk spool or new local browser database should be introduced merely to harden job bookkeeping.

### P1 risk: durable claim ≠ durable unattended executor

The current \`RemoteClaims.fetch\` admits a job durably and uses \`this.state.waitUntil(task)\` to run it; accepted transfers may return \`202 REMOTE_ACCEPTED\` with \`/operation\` polling. **This does not prove a long-running job resumes automatically if the Cloudflare execution itself stops.** There is no demonstrated alarm/restart scheduler in the inspected save path. Durable record and a replay-safe result query are not the same as a guaranteed restarted network fetch/stream/multipart upload.

**P1.1 — Prove the failure boundary before choosing infrastructure.** Add deterministic interruptions between claim, source fetch, first remote bytes, multipart part, final R2 write, provider ACK and receipt persistence. Check actual current Durable Object lifecycle/Cloudflare runtime limits and customer plan caps. Distinguish "R2 object already exists and can be independently verified" from "job definitely needs a replay." Measure costs, limits and source accessibility.

**P1.2 — Design the smallest genuine execution recovery path.** Evaluate Durable Object alarms **versus** Cloudflare Queues **versus** Workflows; choose only one primary coordinator justified by platform guarantees, cost, rate/concurrency and supported job duration. A remotely inaccessible source, expired URL or browser-authenticated resource may be **non-resumable** after Chrome closes. Never promise unrestricted unattended transfer. Prevent two active writers for the same operation; maintain durable intent, attempt/lease/fencing identity, persisted checkpoint, bounded retry schedule, explicit terminal expiry and read-only reconciliation before retry.

**P1.3 — Idempotency and exactly the intended remote effect.** Stable operation ID and immutable target/source fingerprint; conditional R2 write/ETag/version protections as supported; account/bucket/prefix must match every stage. If a response is lost after a successful remote write, first read R2 and verify key, bytes, checksum/metadata as supported. No automatic second write of an uncertain mutation without proof. Distinguish verified, blocked, failed, pending and uncertain.

**P1.4 — Safety and source types.** Split independent publicly/authorized remotely fetchable sources from browser-only, tab-only, short-lived signed-URL or native-device sources. On revocation, check capability at every allowed boundary and stop safely. Do not embed browser cookies/credentials in a Worker, widen Cloudflare permissions, make a bucket public or create new billable infrastructure without explicit approval.

**P1.5 — Version compatibility.** Existing healthy customer Workers must not need redeployment merely because the extension was updated. Design stable protocol version/capability negotiation, tested compatible version window, migration and explicit blocked upgrade path for genuinely incompatible security changes. Use account/bucket-scoped plans, code digests, staged deployment, explicit setup authority, bounded health/write-readback checks and rollback to the last verified compatible plan when safe. Never silently replace a healthy Worker or change extension ID/OAuth identity.

**P1.6 — Outcome:** A supported source can continue/recover after Chrome closes only when durable execution was actually committed and the source remains accessible. Others receive a truthful \`needs-browser\`, \`blocked\` or \`uncertain\` result. **No invented remote completion.** If scheduler changes would expand customer cost or require new infrastructure, supply a separately scoped proposal/evidence and obtain explicit approval before deploying it.

---

## 3. P2 product longevity and low-maintenance quality gates

These rules apply immediately to implementation choices, but do **not** justify a sweeping rewrite.

1. **Small stable core:** isolate right-click/menu/dispatch from Explorer, Shelf, theme, Screenshot, Search, Get URL, History UI, Auto-Reroute and experimental features. Fail optional subsystems separately.
2. **One writer per domain:** canonical CURRENT for configuration; one compiler/registrar for native entries; one remote operation ledger; R2 as truth for actual file bytes.
3. **Crash-consistent state:** deliberate order \`record intent → execute authorized effect → verify actual result → record receipt\`; crashes anywhere lead to safe reconciliation, not guessing.
4. **Backward compatibility:** version config/API/Worker/receipts, test old extension vs new Worker and vice versa, and preserve data through migrations and rollbacks.
5. **Bounded resources:** browser wakeups, memory, cloud CPU, Durable Object transactions, concurrency, retries, object-size limits, API cost and local metadata must be bounded and measured. No always-on loop just to feel reliable.
6. **Observability, not dependency:** sanitized correlation IDs and exact stage results. Diagnostics failure or quota exhaustion must not block saving. Existing capless forensic logging remains a deliberate explicit user option; default traces remain bounded.
7. **Security:** signed target- and session-bound capabilities; provider-role checks; no credential disclosure or public bucket exposure as an error workaround.
8. **No false promises:** no literal 100% availability claim for restricted Chrome contexts or cloud outages. Report what is guaranteed, conditional, uncertain and unverified.
9. **Low maintenance:** pin dependency/build versions, validate the MV3 import graph, keep simple module boundaries, maintain readable source↔API docs and release rollback plans, avoid unnecessary third services.
10. **Change isolation:** new provider or optional feature cannot break existing Cloudflare menu or save engine; Depth errors cannot interfere with Simple/Narrow; Shelf layout changes never mutate native registration.

**Targets are proposed SLOs, not current facts:** ≥99.99% eligible native-menu appearance, ≥99.9% properly accounted-for authorized save attempts, zero known false verified outcomes, zero known silent wrong-target writes or data loss, and inspectable status for every admitted remote operation. Define denominators, exclusions and observation windows before reporting results. No synthetic-test marketing claims.

---

## 4. Execution sequence and files to change

### Milestone A — P0 diagnostic reproduction and menu repair (must implement now)

1. Read source and preserve the pinned known-bad tag. Reproduce failure in a targeted test based on actual 0.3.22 registrar and a simulated Chrome API that loses a callback/fails after removeAll.
2. Modify the canonical \`src/chrome/registrar.mjs\` to avoid routine full resets and preserve basic menu access on partial failure, while respecting exact existing menu projector and API behavior.
3. Modify \`extension/background.mjs\` and, if required, \`src/api/service.mjs\` to make worker-load and post-login/reconnect reconciliation reliable, idempotent and independent of R2 readiness.
4. Add focused tests with clean failure receipts, including initial no-configuration, blocked setup after successful OAuth and multi-mode/target routing nonregressions.
5. Build/validate the MV3 package; test in installed Chrome when permitted; keep failure categories honest.
6. Update \`latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md\`, and \`11.2026/workings/right-click-workings.json\` if expressed logic changes. Keep the original tagged historical baseline immutable.

**Gate A:** No proven destructive loss of native menu in tested supported failure cases, first-login menu always returns when Chrome permits, exact right-click routing and config preserved. Real installed-Chrome evidence required for "fixed."

### Milestone B — Minimal, speed-preserving remote interruption audit (no default heavy scheduler)

1. Trace \`src/cloudflare/worker.mjs\`, \`src/cloudflare/transport.mjs\`, \`src/cloudflare/deployment.mjs\`, \`right2cloud-module/src/*\` and Durable Object claim/recovery boundaries.
2. Produce failure-injection fixtures for worker interruption, remote write ACK loss, job duplicate admission, 30-second lease transitions, revoked authorization and browser shutdown.
3. **Do not implement a large new scheduler, workflow/queue service, per-byte checkpoint system, global lock or duplicated job database by default.** First demonstrate an actual unrecoverable interrupted job that cannot be handled by existing remote intent + safe readback. Research a minimal optional coordinator with necessary—not excessive—durable checkpoints. If new infrastructure/cost or material hot-path complexity is needed, propose it for explicit owner review and leave production unchanged until approval. Avoid repeated health checks or DB transactions on every normal save.
4. Benchmark before/after worker RAM, concurrent in-flight jobs, startup, right-click latency, screenshot duration, checkpoints/storage writes per operation, cloud calls per operation, History refresh work, p50/p95/p99 and crash rate. **Any material degradation fails this milestone** unless justified by a proven customer failure and explicitly accepted. Test actual Cloudflare only with owner-approved disposable resources.

**Gate B:** Better interruption handling **without slowing the existing ordinary click/screenshot path, increasing RAM or destabilizing burst workloads**. Only claim actual autonomous recovery after a platform-backed execution test. Otherwise retain the fast current path and record an honest OPEN risk, not a heavy speculative fix.

### Milestone C — Upgrade, operations and release hardening (separate follow-up if necessary)

1. Test older customer Workers, build digest mismatch, safe explicit upgrade and recovery from partially completed provisioning.
2. Test 1000+ operations and realistic multiclient/network failures, with bounded resource/memory/cost reporting.
3. Add concise support receipts, rollback paths and release compatibility matrix.
4. Do not destabilize approved P0 right-click fixes while pursuing broader resilience.

**Gate C:** Real customer-scale evidence; source fixtures and cloud mocks are reported separately.

---

## 5. Non-negotiable preservation / out-of-scope firewall

- No whole-project rewrite, no replacement API, no competing native-menu dispatcher or Worker, no second configuration source of truth.
- No \`git reset --hard\` or cleaning/deleting established user data, no clearing Chrome profile/extensions, no rewriting the known-broken tag, no unauthorized change of \`main\`.
- No changed extension manifest key/ID, OAuth redirect, Cloudflare permissions or account binding merely to address a menu symptom.
- No new buckets, Worker deployments, billable infrastructure, public domain attachment, remote deletion or token rotation without existing explicit approval and exact authorization.
- No blind local file download→upload staging, no new browser disk cache, no large extra IndexedDB database. Small durable metadata is appropriate; actual file bytes stay true remote.
- No bogus auto-default, root bucket recreation, multiple Cloudflare headings, fabricated folders or unintended changes to Simple/Narrow/Depth/Default/Quick.
- Preserve History, Search, Screenshots, Shelf, Get URL, lightbox, Bit o' Polish themes and separate Auto-Reroute. **Scoped repairs to live History updates, the logged-out screenshot logging exclusion, burst control and resource leaks ARE explicitly authorized by this November 21 owner override.** Do not redesign unrelated UI or cap historical records.
- No claiming a mock test, simulated Worker, saved \`nativeRegistration\` ACK, screenshot fixture, \`202 Accepted\`, or Worker response means visible menu or verified R2 save.
- If Chrome forbids unpacked installation or the environment has no authorized test account, document **BLOCKED** and provide exact owner-run real-Chrome test steps. Do not bypass policies or invent test evidence.
- When encountering older contradictory directions, use controlling newer owner instructions; isolate and document unresolved contradictions rather than silently changing user-visible behavior.

---

## 6. Required test campaigns and report format

### Phase A core release gates (all must be accounted for)

- Rapid-fire native save + screenshot tests B01–B09, screenshot shortcut **logged-out means zero History**, live History updates from both operation types without manual refresh, and measured bounded RAM/latency under load.

- First install (zero saved config) before login; first login success with and without cloud setup; reconnect; OAuth expired/revoked; Cloudflare offline.
- Chrome worker load/install/start/suspend/wake; original Windows profile; multiple tabs/windows; page, image and link supported contexts.
- Lost \`contextMenus.create\` callback, create/update/remove rejection, interrupted generation, missing native-ID cache with surviving entries, repeated concurrent events, malformed CURRENT.
- Right-click modes Simple/Narrow/Depth, one/multiple actual buckets, default/quick destinations, provider visibility settings, wrong-account protection.
- Precise click outcome: authorized save gives exact R2 object/readback; unauthorized/unready click produces attention/blocked, not a false success.
- Repeated no-op wake (at least 20 simulated activations): no full menu reset, duplicate handlers, runaway I/O or profile mutation.

### Phase B cloud durability gates (only if explicitly in implementation scope)

- Crash/interruption at every job state transition, browser close immediately after durable admission, restart/duplicate attempt, lost remote ACK after successful R2 write, expired source URL, long-running multipart operation and Worker code version change.
- Resource exhaustion, honest busy/429, bounded exponential backoff where appropriate, no duplicate unintended write, cancellation and revocation, expired grant.
- Real Cloudflare remote test only with approved disposable R2 resources; record object truth independently.

### Report artifacts

Maintain a human-readable and machine-readable before/after table with **scenario, baseline commit, patch commit, test method, environment, actual outcome, expected outcome, proof class, PASS/FAIL/BLOCKED/NOT TESTED, and remaining risk**. Explicitly distinguish:

1. **Source inspected**.
2. **Unit/fault fixture passed**.
3. **Chrome API acknowledged**.
4. **Installed Windows Chrome visibly rendered and clicked**.
5. **Cloudflare Worker accepted remotely**.
6. **Actual R2 object verified by independent readback**.
7. **History/receipt truthfully recorded**.

**No release or \`FIXED-verified\` tag until items 4 and 6 are independently observed for the critical paths, if actual provider write is part of the claimed fix.** Do not move the pre-repair known-bad tag.

---

## 7. Required end-of-run delivery to the owner

Provide **bullet-by-bullet**:

- Work branch, precise starting SHA, new commit hashes, changed files and clean/dirty working-tree state.
- Which of the known 0.3.22 failure mechanisms was actually reproduced, and which remain hypotheses.
- Implementation summary of non-destructive native registration and why it does not remove healthy entries.
- Measured rapid-action/screenshot stress results; in-flight PNG/Blob bounds, settled memory, p95 latency, screenshot quota behavior and whether any extension process crashed.
- Demonstrated automatic History updates for both save and screenshot, plus zero logged-out shortcut entries in History.
- Concrete post-login, reconnect, no-destination and worker-load behavior proved.
- Exact Simple/Narrow/Depth/Quick/Default and other-provider nonregressions.
- Native registration test count, before/after failures, production-vs-fixture evidence and any new failing tests.
- Real Windows Chrome menu outcomes and original-profile acceptance status **or** explicit blocker.
- R2 remote verification status, signed auth/operation ID fidelity and no-wrong-target evidence.
- Worker-durability audit result: completed safe code, deferred scheduler, or still-open interruption risks—**not a claim of unattended support without restart proof**.
- Data preservation and security checks; no new local file caching or unauthorized infrastructure changes.
- Unresolved issues, risk ranked P0/P1/P2 and exact next smallest safe milestone.
- Confirmation that \`redown-0.3.22-BROKEN-pre-repair-2026-11-21\` is still intact.

## Final acceptance contract

> **The native right-click action is available whenever Chrome legitimately permits it, including before login and immediately after login/reconnect. Failed setup or a worker restart cannot silently erase a working action. An actual click either starts the exact authorized remote save and produces an independently verified receipt, or tells the user truthfully why the operation is blocked or uncertain. Saved configuration is never destroyed to make the menu return. Remote jobs resume unattended only when a real durable scheduler and accessible source make that guarantee true.**

**Execute Milestone A first. Do not call the product robust merely because this request exists. Prove each boundary, preserve the customer's state and keep the long-lived system simple enough to maintain for years.**
