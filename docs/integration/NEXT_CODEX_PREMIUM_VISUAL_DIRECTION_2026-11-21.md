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

## P0: Google Drive Sign In silently fails in Microsoft Edge — browser compatibility
**Owner's field report (November 21, 2026):** Clicking **Google Drive → Sign In** in REDOWN briefly flashes a little loading/time indicator, then it disappears **without any sign-in popup or tab**. The owner was testing in **Microsoft Edge** and has not yet verified whether the same behavior occurs in Google Chrome. Treat Edge as a reported environment, not an experimentally proven sole cause.

**Strong code-level lead, confirmed against official platform docs:**
- Current `src/basic/lib/auth.js` uses `chrome.identity.getAuthToken({interactive:true, ...})` for Google authentication. Microsoft's official Edge extension API support documentation explicitly lists **`identity.getAuthToken` as unsupported**, and points developers to **`identity.launchWebAuthFlow`** as an alternative (https://learn.microsoft.com/microsoft-edge/extensions/developer-guide/api-support).
- The Google `getAuthToken` call's catch block collapses API errors into `AUTH_CANCELLED` with "Google authorization was cancelled or denied", which is potentially misleading when the underlying cause is an unsupported API/browser runtime or OAuth configuration mismatch.
- Verify the behavior on fresh Microsoft Edge **and** Google Chrome installs of the exact build; capture browser/runtime identity support, extension ID, provider OAuth client/redirect configuration, and minimal sanitized error codes without exposing access tokens. Do not assume Chrome is working until actually tested.

**Next implementation run requirements (not implemented by this documentation change):**
- Make Google Drive Sign In launch a working, explicit user-initiated Google OAuth consent experience in every officially supported browser. If Edge is within supported browsers, design a proper Edge-compatible Google OAuth flow via supported browser APIs (consider `launchWebAuthFlow`, PKCE/state, browser-specific redirect URI/client registration) with correct consent, scoped authorization, token handling, and verification. Do not merely change one API call and assume the OAuth client configuration will still work.
- Preserve the existing Google Drive API scope, provider isolation, OAuth security properties, exact extension identity where applicable, and verified-only save logic. No silent authentication bypasses and no fake connected state.
- If Chrome-only support is deliberately chosen instead, make the limitation explicit and user-friendly, **not a silent flash** or a generic "cancelled" message.
- Display a concise actionable error when opening auth is genuinely unavailable; never present "user cancelled" when the user did not cancel. Keep provider cards clean (icon/name/buttons) and use unobtrusive recoverable feedback.
- Regression/acceptance: Google consent window/tab actually appears and completes; status becomes correctly ready; a known-byte right-click file is saved and verified, with correct History entry and badge; cover cancel, denied scope, unsupported API, missing OAuth registration, worker restart, and Edge/Chrome separately.
- **No extra source-access/security setup screens** are authorized by this note. Standard necessary Google OAuth consent itself is part of the original **Sign In** action, not an additional REDOWN permission wizard.

## P0: ZERO extra REDOWN security/setup steps — right-click → save → done
**Owner correction (supersedes the previous permission-onboarding proposal):** **NO EXTRA SECURITY STEPS. NO EXTRA PERMISSION BUTTONS. NO "ONE-TIME SOURCE ACCESS SETUP" WORKFLOW.** The user has already signed into their cloud provider. The intended product experience is exactly **"right-click → save → done"**, not "right-click → failed attempt → go to Remotes → Allow access to CloudFront → right-click again."

Real reported defect (Windows Chrome, November 21, 2026): OneDrive appeared `Ready to Save`, but the first right-click save failed with "The browser could not read the resource" and displayed an extra `Allow access to d24focqdekc5bg.cloudfront.net` button. This violates the owner's core usability expectation.

**Future implementation requirements:**
- Engineer source acquisition so ordinary supported website images/links can be read and saved directly on the **first right-click** after cloud-provider login. Reuse the extension's existing native menu ownership and appropriate Chrome APIs and host permissions as allowed. Address third-party CDN/redirect origins in the actual fetch design; don't shove those complexities onto the user as a new REDOWN workflow.
- Do **not** add additional REDOWN source-permission onboarding, a second "authorize this CDN" card button, a separate setup wizard, or routine retry instructions. Do not count a login state as source-readiness proof. If the Chromium security model truly requires a browser-controlled permission or user consent that isn't already granted, it **cannot** be silently bypassed. Document the exact hard limitation to the owner and make any unavoidable browser permission interaction as minimal and nonrepetitive as possible, without presenting it as an owner-requested extra step or claiming that all sites will work unconditionally. Never disable Chrome protections or bypass a website's access control.
- Investigate why `src/basic/lib/source.js` returns generic `SOURCE_UNAVAILABLE`, the source origin vs page origin vs CDN redirect, cookies, hotlink protection, expiring links, response type and Chrome extension permissions. Distinguish real source-read failures from missing Chrome permission before choosing a recovery path.
- If source retrieval remains blocked by genuine browser/site restrictions, preserve a bounded pending intent and meaningful diagnostic record, avoid falsely reporting success, and where legitimately possible resume without requiring the user to find and right-click the source again. **No silent upload retries where confirmation is uncertain.**
- Keep normal provider cards exactly **icon + provider name + original buttons**; never permanently embed permission/error essays. Correctness, authorization and verified-only save receipts remain mandatory under the hood; usability is not permission bypass.
- Acceptance tests must include the exact reported CloudFront/OneDrive case, direct resource/redirect cases, first-click success with already-authorized Chrome, missing-permission edge cases, worker restarts, and real Windows Chrome + live-cloud byte verification. Report actual browser restrictions transparently, rather than asserting zero prompts are technically guaranteed.

## P0: ONE unified provider History and export — all clouds, images and two priority URLs
**Owner clarification (supersedes "separate but discoverable History" suggestions):** History must **append/aggregate records from ALL cloud providers into one canonical REDOWN History**, and **every History export must contain data from ALL providers**. No Google/OneDrive/Dropbox sub-history silently omitted from the main export.

Include **Cloudflare R2, Google Drive, OneDrive and Dropbox**. Include cloud-saved screenshots in the applicable History/export without misidentifying them as ordinary right-click saves. Preserve existing Cloudflare History and old records during migration; don't overwrite or delete records. Deduplicate retries/duplicate receipts by durable operation identity; ensure chronological cross-provider ordering and correct per-provider metadata.

**Minimum visible record for every provider:**
- Actual filename/name.
- Date + timestamp in user's configured timezone.
- Originating cloud provider, destination, and truthful saved/failed/uncertain state.
- Image thumbnail/preview **when available**, lazy-derived from the original source or authorized verified provider object; retain a tasteful placeholder when unavailable rather than fabricating a photo or storing unlimited image payloads.
- A clearly expandable **URLs** section, with the following two items **FIRST, prominently and consistently**:
  1. **Host Source URL** — the original **webpage/page URL** where the user right-clicked the content. This is the host/origin page (previously called `hostUrl` / `hostPageURL`), **not** the URL of the cloud provider.
  2. **Source URL** — the original **direct file/image/media/link URL** that was selected to save (previously called `sourceUrl` / `sourceURL`).
- Both URLs should be separate, clickable, expandable/wrappable, copied individually if appropriate, and available **when genuinely captured**. Do not substitute a destination URL for either; other details such as cloud object link or GO TO follow after these two. If unavailable, show a clear honest label instead of fabricating a URL.
- Never send host/source browsing URLs to the cloud provider in the file upload metadata; preserve local-private capture and credential/token redaction in exports and the UI. Handle signed URL parameters cautiously without confusing provenance.

**Export is a first-class acceptance gate:**
- One **unified** History export path across all four providers and saved screenshots (where included), not a legacy Cloudflare-only export that ignores Basic provider records. Explicitly merge the existing independent Basic IndexedDB history with host History in a stable, queryable, scalable way, or migrate safely with verifiable backward compatibility; do not assume unifying the visible UI automatically unifies the export.
- Supported exports (JSON / JSONL / CSV where already offered) and date ranges must contain **every relevant provider's records**, even when those records live on History pages that are not currently rendered. Include both **Host Source URL** and **Source URL** as first-class named fields; preserve provider, status, filename, timestamp, destination, IDs, and image/screenshot information where legitimately available.
- Do not silently export only the currently filtered page or silently drop pending/failed attempts. Respect explicit export filters, privacy/redaction choices, and screenshot inclusion choices. Ensure deterministic chronological order, stable counts and exactly-once deduplication across providers. Large exports must use bounded streaming/page-by-page reads, not buffer a million records in memory.
- Verify on fixture datasets spanning all four providers, screenshots, multiple time ranges, mixed statuses, duplicates and missing URL fields. Test both on-screen unified History and exported file contents, not merely API success.
- Preserve uncapped metadata-first History, low-memory lazy previews, exact GO TO verification and badge count consistency.

## P0: ONE-CLICK UNLIMITED ADVANCED DIAGNOSTICS FOR ALL CLOUD PROVIDERS — ONE RAW ZIP
**Owner's final simplified workflow; this supersedes proposals to expose separate Basic and REDOWN diagnostic controls in the normal user flow.**
The owner wants **TWO interactions, period**:
1. In existing REDOWN Settings, click a single **"Unlimited Advanced Diagnostics — ALL Cloud Providers"** enable switch/button. It simultaneously starts/enables all necessary detailed diagnostic capture for Cloudflare R2, Google Drive, OneDrive, and Dropbox **without the 4,000-event rolling cap**. Record failures, successes, all relevant stages, source/host URL provenance when safely available, timestamps, provider, IDs, and error codes. Capture starts before the user reproduces any bugs. Do not require users to toggle Basic separately, set a second capacity number, open another tab, or start a distinct recorder manually.
2. After trying right-click saves/screenshots, click one **"Export RAW Diagnostics ZIP"** action. Download **one ZIP** that includes everything relevant from both existing systems, clearly organized and labeled; the user sends this single ZIP for debugging. Do not ask them to export separately, combine files, or run manual console capture.

**Architecture and preservation guardrails:**
- Keep the existing **two internal independent engines**. REDOWN's current recorder/advanced diagnostic engine remains the owner of its own deep forensic capture. REDOWN Basic's existing `src/basic/lib/api.js` + `src/basic/lib/store.js` remain owners of Google/OneDrive/Dropbox events and retention. Add only a **thin trusted orchestration layer** for the one visible toggle and one ZIP export; do not replace their stores, break Cloudflare code, merge schemas by force, add service workers or invent a third logging system.
- The Basic API already supports `settings.update({diagnosticsEnabled:true,diagnosticsCap:null})` and `diagnostics.list` / `diagnostics.exportZip`; `null` disables Basic's application-imposed event-count cap. The REDOWN recorder has **separate basic capacity** and **advanced rich recording** controls, not the same flag: implement equivalent unbounded retention / advanced recording through legitimate existing interfaces where supported, and identify/implement the smallest safe additional adapter for any gap. **Do not claim its regular 4,000 retention cap is removed just because the separate advanced recorder is unlimited.**
- **Advanced visibility across ALL four providers is a requirement**, but Basic's existing diagnostic event stream is not identical to REDOWN's rich forensic recorder. Ensure Basic sources emit a comparably useful, provider-specific stage timeline and failure provenance using their existing coordinator/event pipeline, rather than falsely marking less detailed Basic records as advanced. Do not silently degrade the three new providers while claiming full diagnostic coverage; report explicitly any impossible/unobserved stage.
- A single customer-facing master switch should coordinate states and display **ON for all providers** only after it verifies that both systems are appropriately enabled. If partial failure occurs, clearly identify which provider/engine is not recording, preserve the others, and avoid pretending full coverage. Turning it off should use a deliberate policy that doesn't delete previously recorded evidence. Separate existing advanced controls can remain for experts, but the owner should not need them for this workflow.
- A single RAW export must include both logs, any relevant screenshot receipts and provider/save failures, with a manifest documenting per-provider counts, capture windows, source engines, scope, dropped/evicted/gap counts, data redactions and any missing segments. Keep them in **separate ZIP directories/files**, not a lossy flattened log. Prioritize captured **Host Source URL** and **Source URL** where available, with safe treatment of sensitive URL tokens and account information. Never include OAuth credentials, tokens, download bytes, or provider secrets; RAW export is sensitive and should remain local until shared deliberately.
- Use bounded page/cursor reads and existing archive stream machinery where appropriate; don't accumulate all events into RAM. The Basic legacy ZIP path currently has a 16 MiB cap and the existing recorder archive writer has a 512 MiB cap. These must **not silently prevent one-click complete export when retention is unlimited**. Handle oversized exports with a safe, truthful strategy (e.g. a streaming archive or appropriately segmented internal entries without requiring multiple manual exports), while respecting browser limits and available storage. If complete output is impossible, label the export explicitly **PARTIAL/FAILED** with coverage, never "complete".
- This changes diagnostics only. **History remains separate**, unified across providers for viewing/export and metadata-first; normal right-click save and screenshot flows, verified-only badge, privacy and Cloudflare remote functionality must remain unchanged.
- Acceptance is **one enable click, reproduce a Google/OneDrive/Dropbox/Cloudflare failure, one RAW export click, one ZIP sufficient to diagnose it**. Verify provider-by-provider evidence, advanced/regular coverage and retention beyond 4,000, extension restart, low-disk-space behavior, huge archives, failed export, failure isolation, and that neither engine's old API/export regression-tests break.

**No code is authorized or changed by recording this requirement.**

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
