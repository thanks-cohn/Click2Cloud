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

- **Essential Pinterest-like image grid:** Golden Age's image-heavy views should offer a genuine *masonry-style*, staggered grid: cards of a consistent column width but **different heights according to the image's aspect ratio**, with occasional visually larger/taller images. Avoid a wall of identically sized rectangular thumbnails. The uneven rhythm, within reason, is key to the feeling of Pinterest and visual discovery. Use the actual images, not decorative stock placeholders.
- **Controlled variation, not random chaos:** preserve image proportions rather than stretching or awkwardly cropping, make columns responsive to side-panel width, maintain tidy gutters and readable labels, and provide stable ordering. On very narrow widths, fall back gracefully to one column. This is a visual gallery mode where appropriate—do not force masonry on data tables or chronological History records.
- **Keep the performance cost low:** do not download full-resolution originals for gallery tiles. Use existing bounded thumbnail/read paths, lazy load only visible or near-visible items, cache sparingly, avoid loading thousands of cards/bytes into RAM, and use lightweight CSS layout where suitable. Avoid heavy masonry JS dependencies, constant reflows, unnecessary animations, or preloading entire folders. Ensure keyboard and screen-reader navigation remain coherent.

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
Keep Cloudflare's existing login/connection section beneath the three Basic cards and retain the opening slogan "From the Web to your Cloud." above the Google Drive card.

**Exact Remotes page order (owner-approved):**
1. Opening H1: **From the Web to your Cloud.**
2. Full-width compact **Google Drive** card (icon, name, original buttons).
3. Full-width compact **OneDrive** card (icon, name, original buttons).
4. Full-width compact **Dropbox** card (icon, name, original buttons).
5. **Original two-line standalone editorial heading placed BETWEEN Dropbox and Cloudflare R2**, with these two exact sentences on separate rows/lines:
   - **The Future is NOW.**
   - **True Remote is Here.**
6. Existing **Cloudflare R2** card/login section beneath that heading.

The two lines belong to one distinct typographic interlude; use deliberate whitespace, balanced alignment, theme-specific elegant typography, and visually appealing responsive scaling. Keep both sentences intact, in this exact capitalization/punctuation and order. **Never run the sentences together on one line, truncate them, or insert the heading inside the Dropbox or Cloudflare card.** Fit narrow side panels naturally without overflow or awkward word wrapping. This is the user's original REDOWN headline, not an extra provider status message. Each visual theme (Frames, Golden Age, Oceania) should style the same two-line heading according to its own identity, under the Aesthetic API.
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
- **Owner's explicit hover-to-dismiss behavior:** Whenever the pointer moves onto/over a transient notification, dismiss that notification immediately (or fade it out promptly with an imperceptibly short motion) so the user can click what lies behind it. Do **not** require a tiny close button, move the notification away from the pointer, or make it reappear when the pointer leaves. Hover dismissal must not accidentally trigger underlying controls; the user should be able to click them normally after dismissal.
- This hover behavior is a **second line of defense**, not a substitute for non-obstructing layout. Notifications should not sit over History Previous/Next buttons or other navigation even when the user never hovers.
- Apply consistently to customer-facing transient notifications across Remotes, History and Explorer. Avoid hijacking keyboard focus. Provide a keyboard-accessible dismissal path and screen-reader-friendly announcement; ensure critical failure/recovery details remain discoverable in a durable History/detail/diagnostics surface even after the toast is dismissed.
- Short, succinct, appropriately dismissed feedback should remain discoverable for essential failures; do not silently swallow an error.
- Respect keyboard operation, zoom, narrow side panels and screen readers.
- Preserve reliable diagnostic access separately from customer-facing polish.

## P0: REDOWN toolbar counter must include all verified right-click saves and screenshots
**Owner requirement:** "All right-click saves and screenshots should increase the REDOWN counter at the top in the little extension area of Chrome."

This refers to the numeric badge on the **REDOWN Chrome toolbar extension icon** (not just a count inside Remotes/History, and not the unrelated decorative odometer).
- Include **every supported provider**: existing verified Cloudflare R2 right-click saves plus newly integrated REDOWN Basic Google Drive, OneDrive and Dropbox right-click saves. Also include successfully verified screenshot-to-cloud capture operations. The single Chrome badge should reflect the aggregate, across provider boundaries, not separate isolated counters.
- **Never count mere clicks, screenshots that were only captured locally but never saved to cloud, queued/pending, cancelled, failed, or uncertain saves.** Increment only on durable, verified destination confirmation; keep the existing verified-only contract.
- Preserve the existing daily badge semantics, locale/timezone rollover, persisted/reconstructed totals, and success pulse feedback. Existing `src/chrome/daily-badge.mjs` and `tests/daily-badge.test.mjs` already define a daily verified-save badge. Extend/integrate that path instead of creating a competing toolbar counter.
- Deduplicate by stable operation/capture identity. A screenshot with more than one confirmed destination is **one capture event**, not an accidental duplicate; a right-click operation counts once after its verified result. Retried callbacks, duplicate receipts, worker restarts, reauthorization, History refreshes, and UI rerenders must not inflate the badge. Reconcile from committed receipts on startup.
- Keep the correct count when the Shelf is closed, minimized or not running; it belongs to the extension's background/state logic, not to a visible tab.
- Maintain distinct internal counters where necessary, but present one trustworthy total on the Chrome toolbar. Ensure behavior when the display cap (currently `1k+`) is reached, when History is temporarily unavailable, and when a local date changes.
- Add targeted integration tests covering each provider's verified save, confirmed screenshot, deduplication, denied/uncertain events, worker restart, persisted total recovery and multi-provider aggregation. Verify the Chrome toolbar badge in real Windows Chrome before claiming final acceptance.
- This is a requirement for a **future implementation run only**. No code changes are authorized by this note.

## P0: one-time source access and click-to-save recovery — OneDrive field failure
**Owner's real Windows Chrome report, November 21, 2026:** On the first attempt to right-click save an image to OneDrive, the Remotes card displayed `Ready to Save`, but saving failed with `The browser could not read the resource. Check source permissions, login, and direct-link availability; then retry.` It then displayed `Allow access to d24focqdekc5bg.cloudfront.net`. The owner had to press this extra button, which contradicts REDOWN's core contract: **"Just right-click save after login."**

**Required UX contract**
- After initial provider authorization **and an explicit, streamlined, one-time Chrome source-site permission choice where necessary**, normal right-click saves should not require opening Remotes, pressing a newly discovered "Allow access to [CDN host]" button, or repeating the right-click.
- Investigate up-front source-access onboarding, such as optional host access for all ordinary HTTP(S) download sources offered once during setup, with a clear privacy explanation and a narrower per-site alternative. Chrome's own permission approval/user gesture remains mandatory where the platform requires it. **Never silently bypass site permissions, authenticated content access, CORS, or consent.** Avoid silently escalating to all-sites access.
- When a permission is truly missing, preserve the original source URL, host page, provider, filename/destination, operation ID and bounded pending save intent safely. Trigger the smallest necessary permission/recovery flow. **After the user grants access, resume the original intent automatically where Chrome and source validity permit, rather than requiring a second right-click.** A new user gesture might be required to display the Chrome permission prompt, but not to select the source again. Never fabricate success or replay uncertain uploads blindly; confirm remote destination receipts and deduplicate retries.
- Access to the page's origin is not automatically access to a third-party CloudFront/CDN image origin or redirected domain. Investigate redirects, cookies, expiring signed URLs, hotlink/referrer restrictions and real content-type responses; separate `HOST_PERMISSION_REQUIRED` from `SOURCE_UNAVAILABLE`, access-denied responses and invalid links wherever evidence supports that distinction. **Do not present an "Allow access" button as though permissions are certainly the cause when fetch errors are ambiguous.**
- The current `src/basic/lib/source.js` wraps many fetch exceptions into generic `SOURCE_UNAVAILABLE`. The current `extension/basic-provider-cards.mjs` explicitly instructs users to "Right-click the source again to save" after permission grant. Review these paths along with the existing permission architecture; fix root cause and retain verified-only receipts.
- Keep the Remotes provider cards **icon + provider name + original buttons only** in their normal state. Permission recovery should be a cohesive, discreet, accessible, non-obstructive flow, not several permanent paragraphs and buttons inside the cards.
- Test real Windows Chrome source images hosted on third-party CDNs, cross-origin redirects, authenticated and unauthenticated sources, permission refused/accepted/revoked, short-lived URLs, worker sleep/restart, and source unreadability. Capture a failed-and-then-resumed operation, confirming provider byte/hash integrity and exactly-once counting. Clearly report what Chrome restrictions cannot be made zero-prompt.

## P0: unified, image-forward History for Google Drive, OneDrive and Dropbox
**Owner's second explicit requirement:** All three new Basic providers must have **real History entries**, at minimum showing **image, filename/name, timestamp, and an expandable URLs section**. It must not feel like these providers save to a separate invisible subsystem or merely show "No recent save attempt" on their Remotes cards.

- Show Google Drive, OneDrive and Dropbox outcomes in REDOWN's visible, unified History experience alongside Cloudflare R2, or provide an equally discoverable unified view that avoids separate, hidden histories. Preserve origin provider identity/icon, durable operation ID, status, final filename, date/time and destination/GO TO information.
- For an image save, display a real image preview/thumb when it can be **safely derived on demand** from an accessible original source or a verified provider file, without transferring a source URL to the cloud provider. If unavailable, render a tasteful placeholder without treating this as proof that the saved file is missing. Failed/uncertain attempts should still have an identifiable entry and accurate failure state.
- Display an expandable **URLs** detail with separate *Host page URL* and *Original source/image URL* (when actually captured), clickable and expandable/wrappable. Do not confuse either with a provider destination URL; link the verified saved object via GO TO when possible. Preserve the privacy model (no original source URL sent to providers; redact credentials, secrets and sensitive signed query parameters from exports/UI).
- Retain the user's general History preferences and day/week/year chronology, sorting, pagination, search/filter usability, stable expansion and safe re-renders. New provider entries must participate in uncapped, genuinely bounded-memory History rather than being kept in an ever-growing in-memory array.
- **Avoid putting full image data or unbounded base64 previews into each permanent History row.** Current Basic source ingestion may persist small inline previews; audit this against the owner's metadata-first/unlimited History goal. Favor lazy, limited-size thumbnails with bounded cache/clear policy, and preserve only essential metadata in durable records. Actual images may disappear from their original hosts; do not guarantee their future availability.
- Avoid fake confirmation or "GO TO" as a sign-in substitute. Verified-only badge totals remain accurate across the four providers and screenshot saves, even after reloading/restarting. Tests must cover saves and failures from all three Basic providers, metadata display, thumbnail fallback, expandable URLs, source privacy, authenticated GO TO, and the actual window UI on Windows Chrome.

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
