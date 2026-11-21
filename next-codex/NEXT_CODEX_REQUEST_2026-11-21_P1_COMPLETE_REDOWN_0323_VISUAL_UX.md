# CONTROLLING CODEX IMPLEMENTATION REQUEST — REDOWN 0.3.23 P1 COMPLETION
## November 21, 2026 — ACTUALLY IMPLEMENT ALL REMAINING FEATURES, ON THE NEW BRANCH

**DO THE WORK, NOT JUST AN AUDIT, PLAN, TODO, DOCUMENTATION UPDATE OR A PARTIAL THEME DEMO.**

### Repository, branch, provenance and owner decision

- Repository: thanks-cohn/Click2Cloud.
- **WORK ONLY ON:** codex/redown-0323-p1-complete-visual-ux-2026-11-21.
- **EXACT STARTING BASE:** c2b608f3c4c9344713d83ed73b98120b0bef8106 (the pushed 0.3.23 P0 repair).
- Do not write to the prior codex/minimal-baseline-palette-fonts-quiet-screenshots-2026-11-20 branch, main, or any REDOWN or redown-basic repository. No REDOWN Basic transplant in this run.
- Do not reset, delete, force-push or rewrite the protected diagnostic tag redown-0.3.22-BROKEN-pre-repair-2026-11-21.
- Owner reports the repaired 0.3.23 right-click entry appears in a fresh Chrome profile and in the original Chrome profile **after an uninstall/reinstall**. The owner has now expressly authorized moving to P1 implementation. Therefore **DO NOT use the previous 'P0 first, stop all visual implementation' instruction as a reason to defer these tasks again**.
- This owner's P1 authorization does **not** magically turn P0 into independently verified reliability. Original-profile upgrade without uninstall, correct complete menu hierarchy, post-login/reconnect, Chrome restarts and live authorized R2 readback remain open acceptance tests. Preserve the working baseline and never call an unverified behavior PASS. If a real P0 regression is found, document/escalate it, restore baseline behavior, and do not ship a broken release. It does not authorize skipping the requested P1 implementation.
- Build identity from the current source is extension ID ajppphdiamdobknpamcheohmdbdbeoal, version 0.3.23. Keep manifest public key, identity, OAuth redirects, Cloudflare worker and provider authority unchanged.
- User's local npm ci/build:extension command succeeded and reported this extension ID. npm install-scripts reported *warnings* for esbuild/workerd postinstall review; those messages did not indicate a build failure. Review npm audit/install-script security evidence; do not blindly approve scripts or upgrade dependencies as a cosmetic workaround.

### Read-first source of truth — preserve all original requirements

Read the FULL existing:
1. next-codex/NEXT_CODEX_REQUEST_2026-11-21_P0_RIGHT_CLICK_ALWAYS_AND_LONGEVITY.md — **especially P1 sections from 'Version 0.3.23 REDOWN branding' through 'FIX Emerald Forest More/theme collision', and required milestone/report sections**.
2. aesthetic-ideas/ADVANCED_THEME_SWITCH_ANIMATION_MODULE_2026-11-21.md (OPTIONAL design idea ONLY, see below).
3. src/aesthetic/packages.mjs, src/aesthetic/host.mjs, extension/aesthetic.css, extension/app.css, extension/app.html, extension/app.mjs and all existing gallery, immersive, keyboard, Search, badge and screenshot modules.
4. docs/evidence/redown-0323/VERIFICATION.md, docs/evidence/redown-0323/verification.json and GitHub Actions run 44927295094. Learn the test limitations rather than calling the release verified.
5. latest/right-click-rules/README.md and latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md only as **preservation and regression contracts**. No menu-system rewrite.

Where the prior master P0 request says 'do not implement appearance until P0 is independently proved', this NEW owner-approved P1 request supersedes only that *work-order restriction*. The original detailed P1 visual designs, keyboard semantics, accessibility, tests, modular isolation, and full set of deliverables remain controlling and mandatory. Do not silently drop or weaken any of them. When in doubt, use the old P1 specification's exact behavior.

## REQUIRED MILESTONE A — Chrome-owned external REDOWN red R icon (not the internal Shelf R)

- Actually generate the approved glossy, rounded, bright RED button with a **bold centered white uppercase R** and no arrow, inspired by the owner's reference to a vintage red B button, but make original artwork.
- Produce sharp real PNGs at **16, 32, 48 and 128 px**, inspect every existing icon usage and wire all necessary manifest icons/action default_icon and other Chrome-owned references so toolbar, Extensions list and side-panel header use it. Merely renaming REDOWN or keeping extension/menu-icon.png unchanged is NOT acceptance.
- **Chrome's external icon is always red/white regardless of active Shelf theme**, light/dark mode or badge flash. Do not confuse it with the approximately 30x30 internal Shelf brand-tile R; retain that markup, dimensions, position and hit target.
- Prove generated files exist in dist/click2cloud and visibly render in a genuine installed Chrome screenshot; test 16px readability.

## REQUIRED MILESTONE B — FIVE COMPLETE AESTHETIC API THEMES, NOT FIVE NEW PALETTES

The Theme selector must offer EXACTLY these complete themes:
1. **Minimal** / existing Bit o' Polish default, keeping its original five separately selectable palettes: Original Rose, Ocean Blue, Emerald Forest, Amethyst, Sunset Amber.
2. **Remote V1**, original selectable legacy appearance.
3. **Golden Age**, full creative pinboard-inspired presentation system.
4. **Oceania**, full early-2010s personal-blog/dashboard-inspired presentation system.
5. **Nostalgia**, one full 1980s arcade attitude + early 1990s 16-bit console-inspired presentation system with precisely THREE **Nostalgia Style** choices (only visible inside Nostalgia): **Kawaii (Neon Pink)**, **Dungeon Master**, **Heroine**.

**Do not create sixth/seventh Minimal palettes, label Ocean Blue 'Oceania', or make three separate top-level Nostalgia themes.** Preserve preference keys, stable theme identifiers, the pre-existing default and Minimal palette memory through theme switching, Shelf reopening and browser restart. The Minimal five-palette picker appears ONLY for Minimal. Nostalgia style picker appears ONLY for Nostalgia; no new independent theme engine.

**Golden Age:** Premium polished modern creator/pinboard style; airy white/off-white and charcoal, vivid REDOWN red, refined rounded panels/cards, strong readable sans headings, proportioned visual gallery and fine divider hierarchy. Both light and dark designed intentionally. Internal R becomes white on saturated #E60023 red when selected. No borrowed logos/assets, heavy masonry refactor or unvirtualized gallery.

**Oceania:** Distinct 2011–2014 Tumblr-era blog/dashboard spirit: deep navy/blue-gray frame, slate panels, white/gray layered post cards, editorial serif headings + clean sans utility, warm ivory accents, genuine light and dark variants. Internal R becomes warm ivory #F4EBD8 on muted navy #35465C with suitable serif letterform. No Tumblr logo or direct proprietary mimicry. It is NOT Minimal's Ocean Blue palette.

**Nostalgia / Kawaii:** Full playful candy neon-pink arcade presentation; #FF4FA9 tile with deep plum #3C174D high-contrast bold R (adjust plum for contrast if necessary), cream/lilac/retro accents and readable rounded headline stacks. Purposeful controls, panels, History, Explorer and previews, not merely a pink accent.

**Nostalgia / Dungeon Master:** Full dark fantasy/retro-game interface with **liquid black stone** static CSS depth, graphite/obsidian panels, refined metallic edges and original pixel-edged accents; bold white #FFFFFF R on black #08090B tile; clear focus/separators, restrained local serif display, readable body text. No shader/continuous GPU effects.

**Nostalgia / Heroine:** Full flamboyant 1980s glam-punk/glam-rock treatment, bold slanted headline personality, tastefully limited original cheetah/leopard accents and strong accessible contrast. Codex has explicit creative discretion to choose its distinct R tile colors and font pairs; report the choices and capture screenshots. No copyrighted music, logos, borrowed artwork or full-screen patterns.

**Completeness means** all five themes and all Nostalgia styles actually design the **entire Shelf**: header, internal R tile, nav, tabs, buttons, Remote cards, File Explorer grid/list/thumbnails, gallery and image preview chrome, History timeline/cards, settings, search, forms, menus, dialogs, selected/hover/focus/disabled states, empty/loading/errors and light/dark. They must differ in intentional component geometry, typography, spacing, borders/elevation and visual hierarchy—not simply recolor CSS variables.

**Detachable Aesthetic API:** Register theme descriptors in src/aesthetic/packages.mjs and use the existing src/aesthetic/host.mjs interface, scoped data-aesthetic/data-nostalgia-style styling and existing preference persistence. No second rendering engine, independent global state or extra Worker. Unknown/missing/corrupt theme or missing CSS must fall back to a readable built-in appearance, without resetting destinations, accounts, credentials, history or saved Minimal palette. Tests must actually remove or disable **each optional theme and each Nostalgia style** and prove fallback, startup, Explorer, History and right-click/save isolation. Do not import themes from core auth, menu registrar, R2 transport, screenshot or persistence modules.

**Resources:** No external fonts, image services, WebGL, heavyweight shader/blur, background streaming, hot image-cache duplication or unbounded listeners. Use small original bundled decoration/static CSS, system fonts and reduced-motion support. Preserve gallery virtualization, History pagination, stable focus and responsive layout.

## REQUIRED MILESTONE C — Emerald Forest More vs sun/moon collision

- Fix the real header overlap after **expand -> shrink -> expand -> shrink**, starting with Emerald Forest.
- header nav .header-more, #theme, header grid, flex min-content, dropdown anchoring and breakpoints must lay out without colliding or stealing hit targets, while each control stays independently usable.
- Test all five Minimal palettes, Remote V1, Golden Age, Oceania and each Nostalgia style in light and dark at ~260 / 310 / 350 / 480 px and wider widths.
- More dropdown must remain in bounds, Esc closes it once, click-away and keyboard accessibility work, no hidden theme toggle. Add DOM rectangle/no-overlap and actual browser screenshot evidence.
- No mutation to Chrome native menu or changing the internal R tile merely to repair this collision.

## REQUIRED MILESTONE D — Verified-save badge count + crisp two-pulse green flash

- Extend, do not replace, the existing src/chrome/daily-badge.mjs and its existing real verified-save history projection. Preserve timezone/day rollover and independently verified local download count behavior.
- Count one genuinely **verified** right-click save per unique operation ID, and **one verified screenshot capture per unique capture/operation ID** once any intended output is independently confirmed, NOT once per fanout destination, callback, retry or status refresh.
- Never increment for logged-out screenshot shortcuts, pending, blocked, failed, unverified or uncertain events. Do not invent an R2 receipt from a screenshot request's admission.
- On a normal verified success, flash only the Chrome **numbered badge background**: green ~100 ms, normal ~85 ms, green ~100 ms, then restore normal badge background. Sharp SNES-like pulses, no smooth fade. The external R icon never changes from red.
- Use one bounded flash coordinator, coalesce animations under bursts without losing count, restore normal state on error/idle/worker restart; do not queue 100 timers or reread full lifetime History on every operation.
- Test multiple simultaneous verified saves, screenshot fanout partial success, duplicates, midnight rollover, worker wake, error and no-credentials paths.

## REQUIRED MILESTONE E — Premium gallery preview controls without circular bubbles

- In the regular gallery preview, replace the visually awkward lopsided triangle/circular controls with **balanced mirrored elegant chevrons**, no persistent circular backgrounds/outlines/disks; appropriate breathing room around image and filename.
- Retain large invisible click/touch hit targets, clear noncircular keyboard focus, correct previous/next boundaries and existing user interaction.
- Preserve original gallery engine, lazy image loading, rename flow, original R tile and lightbox/immersive semantics. Test across themes, first/middle/last image and narrow/wide Shelf.

## REQUIRED MILESTONE F — Shelf-local Search toggle, Enter retention, and immersive keyboard behavior

**Search:** Reuse the already-remappable Shelf-only Ctrl+Shift+F7 command (src/api/shortcuts.mjs and existing layout/shortcut dispatcher), with no extra browser-wide shortcut or manifest commands. First press opens/focuses Explorer filename Search. Second press while Search input focused merely moves focus safely away, **without hiding Search or clearing its query/results**. Third press refocuses. Search remains visible on Enter; only explicit Esc or its far-right X dismisses it. Keep unrelated input/edit/rename shortcut guards intact.

**Preview:** In normal gallery, Left/Right navigate files and Esc closes gallery. In immersive fit/100%, Left/Right may navigate as existing behavior. When immersive zoom is ABOVE fit, all four arrows pan the SAME image within bounded scroll limits; they must NOT navigate files. + / Shift+= / NumpadAdd zoom in, - / NumpadSubtract zoom out, synced to existing bottom zoom slider and 100-400% bounds. Image click toggles fit/zoom and Fit restores 100%. **Esc is staged, one transition per press:** zoomed immersive -> immersive fit -> ordinary gallery same image -> File Explorer. If already immersive fit, first Esc exits immersive, then next Esc closes gallery.
- Reuse extension/immersive-view.mjs, extension/app.mjs and existing controllers, not a second image viewer or duplicate image download/cache.
- Prevent duplicate keyboard handling/dialog cancel, protect focused rename/text fields, IME composition and sliders, restore focus and dispose observers on closure. Test >100 open/zoom/pan/close cycles with bounded resources and no listener accumulation.

## OPTIONAL ONLY — Advanced theme-switch animation

The existing aesthetic-ideas/ADVANCED_THEME_SWITCH_ANIMATION_MODULE_2026-11-21.md records an **OPTIONAL** future independent module with tiny theme spheres, falling transition, color wave, sheen and reduced-motion. It is NOT an excuse to skip the mandatory five full themes. Do not add it as a mandatory deliverable or a reason to defer simpler required UX. If implemented after all mandatory P1 milestones, it must be independently removable under src/aesthetic/motion/, OFF by default, and its absence must not break a theme selector or the product. Do not make it a continuous heavyweight effect.

## CI / real-browser acceptance and preservation

The latest known GitHub Actions run for the starting commit is **44927295094, conclusion FAILURE**. It includes **passing focused unit tests (510), right2cloud module tests (49), extension build and live History browser burst**. It also includes:
- Native Chrome menu test: the 'REDOWN' top-level item was observed but the test did NOT find the expected 'Cloudflare' submenu.
- Screenshot browser test: hard-coded old 0.3.22 expectation versus current 0.3.23. Diagnose/reconcile this stale assertion after confirming actual manifest identity; don't fake a pass.
- Legacy Boot/Login browser test: timed out waiting for exact 'Log in' button; determine whether fixture is outdated or UI genuinely broken; never just disable the failing gate.
- Appearance browser test: timed out waiting for img.preview; inspect the workflow and fixture versus actual preview behavior.

Run npm ci, npm test, npm run test:focused, npm run build:extension and the relevant browser scripts; make smallest justified test fixes, **never simply delete/skips failing tests**. CI failure is not an automatic reason to defer all P1 implementation, but a failed critical gate means release remains BLOCKED until resolved/evidenced. Separate flaky, stale-selector, Chrome policy, untested and real production failures.

**Mandatory nonregressions:** native Chrome REDOWN menu + correctly identified Cloudflare action on supported pages; before/after login and reconnect, worker startup/restart, no duplicated entries, exact Simple/Narrow/Depth/Default/Quick routes; cloud saving still remote with verified R2 receipts; settings/palette persist; history live refreshes; logged-out screenshot shortcuts create no ghost History; screenshot capture remains bounded and doesn’t disrupt menu or uploads; Get URL, rename, Explorer, preview and existing download/tokens remain unchanged except explicitly requested UI. Preserve the original Chrome extension ID, manifest key, all OAuth clients/redirects, no new permissions, and current independent Cloudflare Worker.

**Actual Windows Chrome acceptance:** install a built artifact in a disposable browser profile; capture real UI screenshots for light/dark for **each complete theme and Nostalgia substyle**, R icon in Chrome toolbar and side-panel header, More/theme at narrow widths, gallery controls and immersive UI, and right-click submenu. If no installed Chrome is available, mark the affected checks BLOCKED and provide exact owner-run steps; no fabricated proof. A fresh install working does NOT independently prove an old installation upgrades without reinstall; report that as remaining P0 compatibility risk.

**Acceptance table** for every milestone: code committed? built? unit? browser simulated? real installed Chrome? visual screenshots? regression? OPEN/BLOCKED reasons? Include changed file list, test counts, screenshots, memory/CPU observations and any unfinished tasks.

## EXECUTION / GIT DELIVERY REQUIREMENTS

1. Checkout the **existing NEW P1 branch** codex/redown-0323-p1-complete-visual-ux-2026-11-21 at its actual GitHub head, and verify commit ancestry includes c2b608f3. Do not recreate from main and do not merge REDOWN Basic.
2. Make real source, CSS, assets and test changes. Each milestone should be an independent focused commit; tests/release report updated as applicable.
3. Do not STOP after making the first icon or writing a proposal. Complete A through F and all three Nostalgia styles. If the runtime or environment prevents full completion, preserve all finished work as commits, report exactly which milestones remain and why, and do not claim 0.3.23 P1 finished.
4. Push the exact NEW branch with non-force upstream push. If push errors, preserve local commits and show exact Git stderr, last commit SHA and dirty status. NEVER reset/discard work or report pushed unless verified on GitHub.
5. At end, give a concise complete list of DONE / INCOMPLETE / BLOCKED, direct GitHub branch/commit URLs, results by real test proof class, installed-Chrome limitations, and any decisions requiring owner action.

**Bottom line: Owner has specifically asked for the REST of the November 21 full Codex request NOW. All five complete themes, Nostalgia's three styles, external red R, verified badge/double flash, circle-free gallery chevrons, keyboard/immersive controls and Emerald Forest collision MUST be implemented on this new P1 branch. Do not defer them behind the already-implemented P0 source-repair milestone again. Keep shipping claims honest and keep the cloud-saving core untouched.**
