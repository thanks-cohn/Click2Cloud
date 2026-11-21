# NEXT CODEX RUN — REDOWN Premium Visual Identity, Remotes & History
Date: 2026-11-21
Status: OWNER DESIGN DIRECTION / BACKLOG ONLY — NO IMPLEMENTATION IN THIS NOTE

## Scope, repository and guardrails
- Destination: `thanks-cohn/Click2Cloud`, branch `codex/redown-basic-api-integration-0323-alpha-base-2026-11-21`.
- REDOWN Basic `thanks-cohn/redown-basic` / `main` is read-only.
- This file records direction for a subsequent, explicitly authorized Codex implementation run. Creating this document is **not authorization to implement it now**.
- Do not merge, deploy, change extension identity, add another service worker, or compromise existing APIs, native context menus, save receipts, GO TO identity checks, Cloudflare R2, OAuth, History, Explorer, or persistence.
- Use the owner-supplied Nov 21 REDOWN vs SaveAnywhere screenshots as comparison references. Aim to outperform the polish of a mature consumer product, **not clone the competitor**.

## Overall quality bar
REDOWN currently feels like a rushed responsive webpage in a side panel rather than a beautifully finished product. The next pass must address visual hierarchy, spacing, typography, compactness, iconography, motion, layering, and unobtrusive feedback across the **entire extension**. Excellence must not be limited to a hero screen or a fresh account. The Aesthetic API remains the one presentation owner. Make it gorgeous **without memory-heavy effects**, expensive image assets, nonessential JS animation, or regressions in narrow Chrome side panels.

## Theme identity: Frames must feel like its OWN thing
Frames is **not** merely another palette or CSS-variable override; it needs its own unmistakable design language. Windows-inspired is the starting point, not a generic Windows UI reskin.
- Direction: meticulously engineered, confident desktop-tool craft; clear structural frames, crisp borders, subtle layered surfaces, precise geometry, sophisticated typography, beautifully aligned controls, intentional negative space and depth.
- Provide coordinated surfaces/containers, title/header treatments, buttons, cards, dialogs, Explorer, History, Settings, and feedback. Consistent visual behavior across every screen; refined both light and dark.
- Motion should feel restrained and deliberate, with responsive tactile feedback (hover/focus/press), never showy. Tiny details should create a feeling of expensive craftsmanship.
- Keep its own identity even when the user changes palette, type, light/dark, or panel width; those preferences must still work correctly.
- No borrowed competitor brand styling, no jarring generic HTML forms or panels.

## Theme identity: Golden Age should truly feel like Pinterest
The owner's phrase: **"I want Golden Age to feel like truly a Pinterest thing."** Interpret as an immersive, aspirational, *Pinterest-like inspiration-board experience*, not merely a cherry-red accent and rounded cards.
- Direction: visual-first editorial pinboard, charmingly curated, warm, inviting, beautifully composed, highly browsable, with refined large-radius imagery/cards, soft elevation, elegant spacing and compelling visual hierarchy.
- Give the sense of collecting and rediscovering beautiful media. Strong image presentation and richly considered states; where suitable, evocative tiled/pinboard compositions and a tactile sense of curation.
- Bring that visual language into Remotes, History, image gallery, File Explorer, Settings and navigation **where semantically appropriate**, while retaining readable, efficient functional controls and clear file information. Do not force a masonry layout on a resizable data table, destroy chronological History grouping, or hide operational controls.
- A coherent light and dark treatment is essential. Avoid copying Pinterest logos, branding, exact interface or simply setting `#e60023`; preserve REDOWN identity and Aesthetic API palette preferences.
- Cards in this theme should look *designed and desirable*, not like generic HTML panels with red styling.

## Theme identity: Oceania must feel like the GOLDEN AGE of Tumblr
The owner's phrase: **"I want Oceania to also be its own thing and feel FULLY like golden age Tumblr!"**

**Terminology is critical:** "Golden Age" is the name of REDOWN's **Pinterest-inspired theme** above. The **golden age of Tumblr** is the cultural/design reference for the **separate Oceania theme**, not an instruction to make Golden Age look like Tumblr. Treat the aspirational reference as the early-to-mid-2010s Tumblr era (roughly 2011–2015), without pretending there was one universal Tumblr aesthetic.

- **Personality:** intimate, expressive, dreamy, nostalgic, a little rebellious, and deeply personal; a beautifully curated Tumblr blog you can get lost in, not a corporate storage dashboard, not a Pinterest pinboard, and not Frames with another palette. Capture the feeling of discovering art, photography, short writing, music-era imagery, and a sequence of evocative posts.
- **Visual language:** a thoughtful blog/feed rhythm, generous atmospheric imagery where there is real user media, distinctive editorial/indie typography, carefully layered indigo/navy/dusk or sea-glass accents appropriate to Oceania, subtle soft-grunge/film/archival textures where efficient, tasteful contrast between quiet typography and expressive visual moments. The mood should be nostalgic yet professionally composed, not dated/sloppy.
- **Signature details:** consider Tumblr-era cues such as post-like cards, date/collection stamps, tasteful tag-like metadata, elegant text snippets, captivating photo framing, personal scrapbook accents, and delicate transitions; use as inspiration rather than directly copying Tumblr icons, branding, reblog buttons, site chrome, or identical feed layouts. Meaningful actual statuses and actions must not be disguised as decorative social-media actions.
- **Every surface:** apply the theme coherently to Remotes, History, Explorer image/gallery views, Settings, dialogs, empty/loading/feedback states and navigation. History can feel like an evocative archive **without** sacrificing exact chronological grouping, pagination, GO TO, receipt truth or metadata visibility. Explorer still must work as a functional file manager; never force image-heavy layouts on plain-file rows.
- **Strong separation:** Golden Age = polished Pinterest-like collecting/inspiration-board aesthetics; Oceania = personal, expressive early-2010s Tumblr-like blog/archive atmosphere; Frames = engineered premium Windows-inspired desktop craftsmanship. These are distinct complete experiences, not interchangeable red/blue color themes.
- **Performance & control:** rely on existing actual media; no bundled giant background images, no remote theme trackers, no persistent animations, no fake content, and no offscreen thumbnail loading. Preserve low-memory operation, lazy media rendering, responsive narrow side panels, light/dark, Aesthetic API fonts/colors, reduced motion and accessible focus.
- **Test it visually:** show distinctive side-by-side screenshots of the *same* Remotes, History and Explorer content in Oceania, Golden Age and Frames. If they feel like merely recolored versions of the same generic panel, the task is not finished.

## P0: provider cards — radically less text
On the normal Remotes screen, each Google Drive, OneDrive, and Dropbox full-width stacked card should display **only**:
1. recognizable provider icon;
2. provider name;
3. original Basic action buttons (Sign In / Reconnect or Approve, Refresh, GO TO).
Keep Cloudflare's existing login/connection section under these cards and the required slogan "From the Web to your Cloud." above them.
- Remove permanent on-card paragraphs: "Not connected", repetitive authorization explanations, "authorization cancelled/denied", "No recent save attempt", "Ready to Save" essays, etc.
- Do **not** remove actual readiness/authentication logic, error reporting, permission recovery, screen-reader announcements, or verification truth. Use compact accessible contextual/help-on-demand and non-obstructive transient feedback for important states. A failed save must never look successful.
- Use polished bundled provider icons; be consistent in sizing and alignment across themes.

## P0: responsive elevation / microinteraction
SaveAnywhere's hover behavior impressed the owner: cards grow slightly and acquire a soft shadow. Deliver a refined, original version for REDOWN.
- Card hover scale about 1.015–1.02 and/or a 1–3 px visual lift, soft shadow, gentle border treatment over roughly 160–200 ms; theme-aware and light/dark aware.
- Animate via compositor-friendly CSS transforms and opacity/shadows where reasonable. Cards **must not push neighboring cards or shift layout**.
- Equally polished keyboard focus, explicit pressed/disabled/loading states, reduced-motion support. No distracting pulses, giant bounce, or performance-heavy blanket animations.
- Do not confuse hover affordance with sign-in/save state.

## P0: notifications must never block History pagination
Current bottom-right notification/status overlays cover/interrupt History Prev/Next and other interactive elements in the narrow side panel (owner screenshot).
- Redesign position/flow and stacking so notifications do **not** occlude pagination, bottom action buttons, form fields, file operations or navigation.
- Short, succinct, appropriately dismissed feedback should remain discoverable for essential failures; do not silently swallow an error.
- Respect keyboard operation, zoom, narrow side panels and screen readers.
- Preserve reliable diagnostic access separately from customer-facing polish.

## P0: History scale and feel
Owner wants **uncapped, metadata-first History**, with images/previews derived on demand, not hundreds of thousands of images stored in the log.
- History currently collects all cursor pages in `extension/history-page.mjs` before slicing 25 items for display. Replace in a future authorized run with **genuine indexed, cursor/page-backed retrieval**; bounded memory and lazy previews, not merely a 25-row DOM hiding a million-row JavaScript array.
- Preserve day/week/year chronology, exports independent of visible pagination, metadata, GO TO exact identity verification, receipts, grouping, and expansion preferences. Handle accurate total counts / navigation across filters. Consider efficient large dataset test fixtures without allocating 1,000,000 JS records at once.
- Make History visually polished, legible, elegant and navigable across themes; no overlay should obstruct pagination.
- Separate History retention from diagnostic-event retention; avoid automatic deletion of History without explicit user choice.

## Acceptance for NEXT IMPLEMENTATION RUN (not for this doc-only task)
- Side-by-side owner-reference visual review against competitor, but original REDOWN styling.
- Clear distinct identities for **Frames vs Golden Age vs Oceania vs other themes**, with comprehensive coverage of Remotes, History, Explorer, Settings and dialogs.
- Light/dark, all palettes/fonts, narrow/wide panels, zoom/keyboard focus/reduced motion.
- Beautiful provider cards showing only icon/name/buttons during normal operation; errors recoverable without clutter.
- Non-obstructed History pagination and genuinely bounded-memory retrieval.
- Preserve test coverage for native menu, OAuth, actual verification receipts, History, R2, provider isolation and accessibility.
- Keep the three previously observed Windows Miniflare-related focused test failures visible as unresolved until properly isolated; never misrepresent passed tests as total release validation.
- Explicitly report Windows Chrome, live-cloud, and provider OAuth verification still required.

## Reminder
**This run only adds this note. No application code, styling, tests, branch merges, or deployment are to be changed now.**
