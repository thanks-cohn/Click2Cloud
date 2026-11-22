# NEXT CODEX RUN — REDOWN Premium Aesthetics + Cloudflare-Independent Right-Click + Existing Basic Diagnostics Button

Date: 2026-11-21
Status: OWNER-APPROVED **SCOPED FUTURE IMPLEMENTATION BRIEF** — documenting work only; this commit does not implement or release product code.

## A. Exact working boundaries and supersession

- **Destination repository:** `thanks-cohn/Click2Cloud`
- **ONLY writable branch:** `codex/redown-basic-api-integration-0323-alpha-base-2026-11-21`
- **READ-ONLY reference:** `thanks-cohn/REDOWN` / `main`. `thanks-cohn/redown-basic` / `main` is also READ-ONLY if consultation is necessary.
- Do not switch/create branches, merge, deploy, release, change the Chrome extension ID/manifest key, OAuth redirects, Cloudflare account/workers/buckets, or modify unrelated repositories.
- **THIS is the controlling scope for the next run.** The earlier, comprehensive `codex-request-redown-alpha-cloudflare-first-graceful-degradation-2026-11-21.md` and `docs/integration/NEXT_CODEX_PREMIUM_VISUAL_DIRECTION_2026-11-21.md` remain design/reference documents, but their History engineering, two History exports, multi-engine diagnostics overhaul, large ZIP streaming, recorder fixes, universal badge/counter, broad provider-source transport changes, and general resilience refactors **ARE NOT AUTHORIZED IN THIS RUN**. When conflicting, this narrowed owner scope takes precedence.
- Exactly **three deliverables**: (1) high-quality **aesthetic/visual UX** ported from the previous request; (2) **Cloudflare-independent Basic native right-click menus**; (3) **one Settings button** invoking already implemented Basic `diagnostics.exportZip`. No extra features. Implement in independently testable/reversible commits, not a sweeping rewrite.
- Keep the existing one native context-menu owner, one MV3 worker, `CURRENT` integrity fence, receipt verification, original Cloudflare R2 engine, Explorer, History record machinery, screenshot pipeline, and existing provider OAuth behavior. No invasive restructuring in the name of appearance.

## B. Workstream 1 — Bring forward ALL approved aesthetics and visual-polish requests from the preceding brief

**Exact reference:** `docs/integration/NEXT_CODEX_PREMIUM_VISUAL_DIRECTION_2026-11-21.md`, specifically its overall quality bar; Frames, Golden Age and Oceania identities; Remotes provider-card presentation; responsive hover/microinteraction; notifications; and the associated visual constraints. Also bring over `### P0-D`, `### P0-D1` and `### P0-E` from `codex-request-redown-alpha-cloudflare-first-graceful-degradation-2026-11-21.md` **only insofar as they concern presentation**. This section spells out the controlling details so Codex does not import unrelated P0 functional work.

### B1. Distinct complete premium identities, not three accent recolors

Use the existing `src/aesthetic/host.mjs`, `src/aesthetic/packages.mjs`, scoped CSS, and Settings preferences. **One Aesthetic API is the sole presentation authority.** Preserve **Minimal / Bit o' Polish**, the five established palettes (**Original Rose, Ocean Blue, Emerald Forest, Amethyst, Sunset Amber**), **Remote V1**, **Nostalgia and its existing three styles** (Kawaii, Dungeon Master, Heroine), independent Light/Dark, typography preferences, and user preference persistence. This run adds polish to existing identities and does NOT require a second theme engine, extra top-level nostalgia themes, or an advanced animated sphere chooser.

- **Frames:** meticulous, distinctive Windows-inspired premium desktop-tool craftsmanship. Geometric framing, sharp structural edges, carefully layered surfaces, premium typography, sophisticated alignment and negative space, deliberate light/shadow and tactile restrained focus/hover/pressed states. Frames must look like its OWN design language, not generic Windows HTML or another palette.
- **Golden Age:** convincing Pinterest-era inspiration-board mood: airy curated visual composition, warm and welcoming editorial hierarchy, large-radius media cards, refined elevation/whitespace. In applicable **image-heavy gallery surfaces**, use a genuine responsive staggered/masonry-style layout with varied image heights/aspect ratios and tidy gutters—not uniformly sized tiles. Preserve actual media aspect ratios and stable keyboard order; one-column fallback in narrow side panels. **Do not** force masonry on tabular Explorer rows, chronological History, or operational tables. Never eagerly fetch full-size gallery originals or disable current virtualization merely for the appearance.
- **Oceania:** distinct early/mid-2010s Tumblr-like personal blog/archive identity: intimate, expressive, nostalgic, dreamy indie/editorial typography, indigo/navy/dusk/sea-glass accents, post-like cards, subtle timestamps/tag-like metadata and delicate archival/grunge textures where cheap. Preserve truthful operational states; never mimic proprietary Tumblr logos/controls or mistake decorative post-actions for real file operations. Not a blue Golden Age, not corporate Frames.
- Apply the selected identity consistently to **Remotes, original History cards, Explorer file/gallery surfaces, Settings, dialogs, header/navigation, previews, menus, loading/empty/error states**, while preserving underlying logic and information density. Full light/dark design, narrow/wide panels, zoom, keyboard-focus affordances, contrast, reduced motion and low-resource operation. Themes must be independent of login, provider status and native menu dispatch.
- No external fonts, stock imagery, new tracking/assets feeds, WebGL, huge bundled backgrounds, continuous heavy animations, unbounded preview loading or expensive visual libraries.
- Capture side-by-side screenshots using the **same representative data** for Frames/Golden Age/Oceania in Remotes, History, Explorer, both light/dark. Report if styles are still merely recolorings. Keep Aesthetic API missing/invalid-theme fallback functional, with no effect on save engines.

### B2. Exact streamlined Remotes information architecture and text

Order **must** be:
1. A single opening H1 with **exact punctuation and case:** `All Your Clouds. One Place.` (replaces `From the Web to your Cloud.`).
2. **Google Drive** compact full-width provider card.
3. **OneDrive** compact full-width provider card.
4. **Dropbox** compact full-width provider card.
5. A **standalone editorial interlude with TWO distinct lines**: `The Future is NOW.` on line one, `True Remote is Here.` on line two. Never merge, truncate, or embed inside a card.
6. The **original Cloudflare R2** login/connection card and existing behavior.

- Normal Basic cards prominently present **only bundled recognizable icon, provider name, and ORIGINAL existing Basic actions**: Sign In, Reconnect/Approve, Refresh, GO TO where applicable. Preserve exact click wiring and truthful permission/readiness/error/accessibility info. Remove repetitive permanent status essays such as 'Not connected', 'No recent save attempt', 'Ready to Save' from the normal card face; surface crucial failures contextually or via accessible details, never fake readiness or success.
- Use the same hierarchy in Frames/Golden Age/Oceania while letting each theme give original visual character to the interlude, buttons and cards. Polish spacing, icon consistency and copy; avoid requiring Cloudflare connection to render Basic cards.
- Native browser-owned menu and Edge/Chrome side-panel chrome are outside app CSS; style only extension-owned UI.

### B3. Elegant hover, movement and state feedback

- Subtle card hover `scale(1.015–1.02)` and/or 1–3px lift, soft theme-aware shadow/border, ~160–200ms; no sibling layout shift, clipping, heavy GPU filters or oversized bounce. Clearly render keyboard focus and disabled/loading/pressed feedback without mistaking hover for verified save.
- Reuse existing CSS/palette tokens; respect `prefers-reduced-motion`, keyboard users, touch, accessibility, low-memory devices and narrow width. Visual polish must not change button action or focus/scroll restoration.

### B4. Notifications — ephemeral, non-obstructing, actually dismissing

- Repair the generic `Review the current panel or History for details.` notification that persisted ~2 hours in the owner's Edge screenshot. Fix the actual lifecycle, not merely CSS visibility.
- Neutral/success transient notices auto-expire at ~5s; error/recovery summaries ~8–10s. A transient toast is never permanently pinned, never hides History Previous/Next, navigation, provider buttons, input or dialog actions. Important errors remain reachable in existing durable surfaces.
- **Instant pointer hover dismissal**, plus keyboard-accessible dismiss; do not hijack focus, allow stale timers to clear newer messages, allow identical status polling/wake events to extend a notification forever, or resurrect dismissed notifications after remount. Deduplicate appropriately and clean timers/listeners. Exclude real actionable dialogs from auto-expiring toast rules.
- Test narrow Chrome/Edge, zoom, repeated identical messages, old timer vs newer toast, remount/navigation, hover, keyboard and no two-hour residual overlay.

### B5. Responsive navigation, History headline, REDOWN icon

- Repair overflow in extension-owned top row (R / Remotes / File Explorer / History / More / appearance sun-moon), notably narrow Edge side panels, zoom 100/125%, keyboard/touch. No clipped/unreachable links, colliding More + theme control or invisible click surfaces. Preserve direct access to core tabs, active indicator and keyboard focus. Compact accessible overflow or horizontal scroll is acceptable when genuinely usable.
- Remove **only** the giant redundant History H1. Make **`The Rest is History`** the **only visible page headline and one semantic H1**. Preserve original Cloudflare cards, GO TO, pagination, previews, screenshots, filters and History data. Do not implement Basic History integration, pagination rearchitecture, History exports or database changes under this headline fix.
- Restore the small **white R on red icon immediately left of REDOWN wordmark** in the highest **browser-supported** title/header position, reusing original provided icon assets. Investigate whether Edge's outer white title bar is browser-owned; do not claim extension HTML can edit browser chrome. If it cannot, provide a single restrained icon+title lockup in extension-owned header, **without duplicate R marks**. Report Chrome/Edge actual behavior and limitations.
- Preserve app-side palettes, fonts and existing visual identity preferences across reload/restart. Do not alter the original Cloudflare engine to support any appearance requirement.

## C. Workstream 2 — Cloudflare-independent native right-click menus (the ONLY functional engine change)

**Actual references checked:**
- `thanks-cohn/REDOWN` `main`: `extension/background.js` (`buildMenus`, `ensureMenuAccess`, provider-specific dispatch); `extension/google-drive-menu.js`, `extension/dropbox-menu.js`, `extension/onedrive-menu.js` and `tests/consolidated-flat-providers.test.mjs`.
- Target: `src/api/service.mjs` `buildAndApply` / `getInventory`; `extension/background.mjs` `getInventory`, `scheduleNative` and `nativeReady`; `src/core/menu-spec.mjs`; `src/chrome/registrar.mjs`; `src/basic/host.mjs`.

**User-visible requirement:** People who have **never had a Cloudflare account, have never enabled R2, are logged out, or have a transient/failed Cloudflare readiness check must still see and use the independent native Google Drive, OneDrive and Dropbox right-click entries.** Existing single native menu writer, CURRENT fences and original Cloudflare routes must survive untouched.

- Adapt REDOWN's **local-first composition and independent provider fragments**, but **DO NOT transplant its `background.js` or provider-fragment dependency chain**. REDOWN's Dropbox composer depends on Google existing and OneDrive depends on Dropbox; Click2Cloud must not repeat that fragility.
- Current compiler already creates separate Basic provider actions in `src/core/menu-spec.mjs` and existing click dispatcher routes them to Basic. Fix the **upstream reconciliation dependency**: `src/api/service.mjs` fetches Cloudflare inventory before compiling the combined plan. Cloudflare disconnected, declined R2 subscription, expired OAuth, offline network, API error or bounded readiness timeout must not prevent registration/reconciliation of independent Basic rows.
- Prefer validated CURRENT + locally cached Cloudflare inventory, provider-local availability, and separate bounded best-effort Cloudflare refresh. Treat missing Cloudflare readiness as Cloudflare-only pending/attention, **not** permission to mark it authorized and **not** a reason to remove Basic peers.
- Keep one current registrar, one click listener/worker, stable IDs, menu visibility settings, default/quick/narrow/depth Cloudflare routes, generation and Chrome ACK semantics; no blanket `removeAll`, second owner, new persistent menu state database or skipping CURRENT corruption fences. Preserve already acknowledged working entries on failed rebuild where Chrome allows.
- Basic menus should be available even before Basic provider sign-in; clicking an unauthenticated action must open existing provider-specific Sign In/recovery, not Cloudflare setup. Click-time recheck of provider-specific authorization remains mandatory; no fake saved receipt.
- A working Cloudflare connection must retain its exact existing native menu hierarchy and target routing. If Cloudflare-specific changes cannot be isolated in a small patch, stop and report why rather than rewriting R2.
- **Focused acceptance tests**: first install with zero Cloudflare connections; only Google signed in; only OneDrive; only Dropbox; Cloudflare disabled; R2 not subscribed; Cloudflare authentication expires; Cloudflare inventory rejects or never settles; offline restart; Cloudflare reconnected; mixed-provider profile; corrupted CURRENT without destructive reset; native `create/update` errors. Validate **real Chrome/Edge native item visibility and actual Basic save route** where possible, not compiler output alone. Old Cloudflare menu/save tests must continue passing.

## D. Workstream 3 — One Settings button calling ALREADY EXISTING Other Cloud Provider diagnostics API

**Exact label: `Export Other Cloud Provider Diagnostics`.**

- Add **one modest Settings button** (inside existing Diagnostics/Debug area, visually styled via Aesthetic API) with a short helper text noting **Google Drive, OneDrive, Dropbox**. It is separate from Cloudflare's existing export controls. Keep it accessible and visible where diagnostics are expected; do not create a new diagnostics dashboard.
- **Reuse the existing trusted Basic API as-is:** `src/basic/lib/api.js` declares and implements `diagnostics.exportZip` (via existing `redown-basic-v1` channel, `api:1`, `op:'diagnostics.exportZip'`, `input:{}`). It already invokes Basic's ZIP builder and calls `chrome.downloads.download({filename,saveAs:true})`. `src/basic/host.mjs` validates the trusted Shelf sender. Do not bypass or duplicate authorization and download logic.
- On direct user click, invoke once, disable button while pending, prevent rapid duplicate requests, display truthful started/downloading/failed status and reset accessibility state. A returned download ID means the browser download was initiated, not that the finished file is verified on disk. Show a private-RAW-data warning before intentional export/sharing; never auto-upload files.
- **Important existing limitation:** Basic's exporter currently has a **16 MiB maximum** and constructs an in-memory base64 URL. For THIS narrow run, do not raise the cap or build a new streaming ZIP engine. If limit is exceeded, show its existing `EXPORT_TOO_LARGE` feedback clearly, leave retained diagnostics untouched, and avoid repeated attempts that freeze the Shelf. The previously discussed 512 MiB streaming upgrade is **explicitly deferred**.
- Do not add a SECURE format, change Cloudflare recorder, rewrite `src/basic/lib/zip.js`, change Basic recording defaults/caps or build a combined diagnostic ZIP. No uncontrolled record collection.
- Tests: button exists in normal Settings/diagnostic context, one click sends correct trusted request, repeated clicks do not duplicate, success shows download initiated, API rejected/cancelled/store unavailable/16MiB exceeded handled without crash or false success. Cloudflare export remains unchanged.

## E. Mandatory execution/checks and exclusions

**Suggested independent commits:** (1) native provider menu independence with targeted REDOWN-derived fault tests; (2) Frames/Golden Age/Oceania + compatible existing appearance/palettes; (3) Remotes cards/slogan/icon/nav/History H1 and hover; (4) notification lifecycle repair; (5) Basic existing export button. Run relevant unit/browser and build checks after each stage and final regression suite.

**Minimum proof:** 
- Real or simulated Cloudflare R2 success, login, exactly targeted Simple/Narrow/Depth menus and preserved GO TO, History and Explorer; **never claim live proof where only mock tests ran**.
- Real-browser Chrome/Edge checks where available for Cloudflare-free right click with working Basic provider, known provider with Cloudflare connected, browser restart, negative Cloudflare inventory, original icon location and responsive themes.
- Visual before/after screenshots using the same representative data in all three premium themes and light/dark at narrow/wide widths and 100/125% zoom; test pointer/keyboard/reduced-motion/contrast.
- Notification timing, no overlays over History paging or controls, original Basic card buttons, exact owner-approved copy, one History H1.
- Diagnostics API invoked exactly once per click, respected old size limit, no Cloudflare interaction.
- Preserve established extension identity, native ID ownership, canonical CURRENT, verified R2 receipts, original History storage, provider OAuth and screenshot code. Report PASS / FAIL / UNVERIFIED with exact tests and changed files; stop before merge/deploy.

**Explicitly OUT OF SCOPE** (even if demanded by an older referenced document): Basic History card integration, merged History timeline architecture, any History exports, canonical storage/index migrations, Cloudflare recorder/diagnostics overhaul, master Unlimited settings change, new Basic SECURE format, ZIP streaming/512 MiB export, native scheduler, source size, cross-provider badge/counter changes, screenshot saving changes, Google/OneDrive/Dropbox source transport rewrites, universal file API, worker rewrite, new aesthetic sphere animations, and unrelated reliability/backlog fixes.

**Acceptance:** The REDOWN Shelf looks like three distinct professional premium applications under Frames/Golden Age/Oceania, and non-Cloudflare users can right-click-save to their own providers with the existing Basic API. The Settings diagnostics button simply launches Basic's existing RAW ZIP and gracefully reports errors. **Nothing destabilizes working Cloudflare.**
