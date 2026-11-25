# REDOWN 0.3.29 — Visual Refinement & Default Experience

Authoritative follow-up specification for 0.3.29. Work exclusively on codex/redown-0329-visual-refinement, branched from codex/redown-0328-history-consolidation at 6556f59e13928ef9ddb1b0b5c2376645804ff37d. Read repository instructions first. Preserve 0.3.28 functionality and implement only these follow-up requirements. Keep Default Screenshots card untouched.

## Remotes — Clean first-time experience

- Remove the initial “Not connected” message.
- Remove the expandable “Connection details” section from the initial state.
- Remove the empty space occupied by both.
- Do not replace them with other messages or setup suggestions.
- Preserve provider branding, buttons, authentication, and actual functionality.
- Show actionable connection errors only when relevant.

## Remotes — Slogan capitalization

- Change “All your clouds” to “All Your Clouds”.
- Preserve the existing styling, centering, spacing and absence of a period. Keep “One Place” unchanged.

## Settings — Get URL default

- Enable “Show Get URL in right-click menu” by default for new installations and when no explicit preference exists.
- Preserve explicitly saved user choices, including Off. Reset to Defaults should restore On.
- Keep the setting adjustable and persistent. Preserve existing Get URL eligibility, menu registration, provider permissions and public-access consent; enabling menu visibility must not automatically make files or buckets public.

## History Settings — Cloudflare image preview default

- Set “Cloudflare image preview auto-expansion” to “Expand all images” by default for new installations and when no explicit preference exists.
- Preserve explicitly saved expansion preferences and existing alternative options. Restore defaults should select Expand all images.
- Keep this preference independent of Basic provider image and URL expansion preferences. Preserve existing Cloudflare card layout, virtualization and lazy loading; expanding all images must not eagerly fetch the entire archive.
- IMPORTANT: The current Cloudflare History card places images in the expandable Media section, not Details. Bind Cloudflare image preview auto-expansion exclusively to Media/image expansion. Expand all images must expand eligible Media sections without expanding Details or Public URLs.
- Preserve the current section order: Media, Public URLs, Details (Details at the bottom). Details expansion is independent of Media/image preferences; preserve its existing independent behavior. Do not move images back into Details or couple their expansion state. Verify the current card implementation and test independent expansion, preference persistence, and lazy loading.

## Cloudflare History cards — Media layout and actions

- Move the existing provider/destination path line directly beneath the filename, outside Details, on the left. Preserve actual path data; wrap long paths without overflow. Media follows the compact header.
- Keep Media expanded by default according to the Cloudflare image preview preference. Clicking the image opens the existing regular Preview. Remove the separate Preview button; preserve accessible keyboard activation.
- Place Download and GO TO directly underneath the image in one action row, Download aligned far left, GO TO far right, flexible space between. Reuse existing actions and eligibility; do not fabricate support or duplicate buttons. Preserve responsiveness and theme compatibility.
- Public URLs and Details remain independent sections; Details stays below Public URLs and is collapsed by default. Media expansion must not expand Details; Location remains independently visible in the header.
- Error is an independent expandable section when applicable, collapsed by default. Preserve truthful failure/status indication and actionable error details; do not expand Error automatically as a side effect of image expansion. Do not show empty Error sections for successful entries.
- Preserve existing provider functionality, retained images, verification, receipts, navigation, lazy loading and memory safeguards. Audit actual card layout before editing.

## Preview — Stable Immersive View button

- When navigating between images in regular Preview, the Immersive View button must remain visually stable. Eliminate the dull-to-bright flash between images, including rapid previous/next keyboard navigation.
- Preserve its appearance, position, dimensions, opacity and theme styling during normal image-to-image transitions. Audit transient disabled/loading state and unnecessary DOM replacement before choosing a fix; keep genuine availability and accessibility semantics intact. Prevent activation against stale or unavailable image data without introducing visual flicker during ordinary transitions.
- Reuse the existing shared Immersive View implementation; preserve image loading, navigation, zoom and error handling. Test cached and uncached images, rapid navigation, all themes and genuinely unavailable previews.

## Remotes — Review Cloudflare setup button

- Hide the “Review Cloudflare setup” button from the Remotes tab in all themes except Remote V1. Remote V1 must retain the existing button and behavior.
- Remove the hidden button's reserved layout space; do not replace it with another permanent setup prompt.
- Use existing theme/Aesthetic API state and ensure visibility updates correctly when switching themes. Preserve underlying Cloudflare setup, recovery, verification and necessary approval flows; do not disable required setup functionality merely by hiding this shortcut.
- Verify Remote V1 retains the button and other themes do not display it, including after theme changes and restarts.

## Cloudflare History cards — Timestamp placement

- Place the existing visible timestamp in the upper-right corner of the card, aligned with the filename at upper left. Keep Location immediately beneath the filename and outside Details.
- Keep the timestamp visible regardless of expandable section states. Preserve existing timestamp semantics, formatting and timezone preference; allow date/time wrapping if needed at narrow widths. Long filenames must wrap without overlapping the timestamp or overflowing the card.
- Preserve existing verification status, Media and action placement, and independent Public URLs, Details and Error sections. This placement supersedes any earlier suggestion to put the timestamp below Location.
- Position the existing verification/status indicator on the right directly beneath the upper-right timestamp, at the bottom of the card header (not at the bottom of the entire card). Right-align both; keep filename and Location on the left. Preserve truthful status and existing styling. Prevent overlap and overflow at narrow widths.

## Shelf notifications — Remove generic review instruction

- Remove the transient notification text “Review the current panel or History for details.” wherever emitted in the Shelf notification UI. If it is a standalone notification, suppress that notification entirely; if appended to a meaningful outcome, remove only the redundant sentence.
- Do not replace it with another generic instruction or empty notification. Preserve concise truthful success, failure and progress feedback, existing actionable recovery, History records, receipts and diagnostics.
- Audit actual notification emitters and shared formatting before changing them. Preserve deduplication and dismissal behavior; do not suppress genuine errors or unrelated notifications.

## Notifications — Simplify saved acknowledgment

- Replace the visible transient notification “Saved · Chrome menu acknowledged · External backup unavailable” with “Saved · Chrome menu acknowledged”.
- Remove the external-backup suffix from this successful-save notification only. Preserve actual backup status in diagnostics and relevant backup-specific status/recovery UI. Do not change backup behavior, receipt evidence, or success classification, and do not hide genuine save failures.

## Shelf footer — Mandatory notification expiry

- Automatically dismiss the successful-save footer notification after 10 seconds, including the old “Saved · Chrome menu acknowledged · External backup unavailable” message and its approved shortened replacement “Saved · Chrome menu acknowledged”. User reports the old message remained visible for 30 minutes with no dismissal control.
- Audit the actual footer/status rendering path as well as the toast engine. Do not assume footer messages already use the toast expiry mechanism. Clear the text and any notification-specific reserved space, preserving normal footer controls.
- Include a small far-right X for immediate manual dismissal. Ensure expiry survives rerenders, navigation, hover, focus changes, theme switches and Shelf reopening; use an absolute expiry timestamp or equivalent robust mechanism. Do not resurrect expired notifications or let stale timers dismiss a newer notification. Avoid unnecessary timers and clean them up on disposal.
- Preserve genuine save status, receipts, backup diagnostics and actionable recovery information. Do not clear live job progress or persistent configuration errors as though they were transient success notifications.
- Test ordinary success, rapid consecutive saves, duplicate events, background/foreground transitions, navigation and restart/reopen behavior. Verify no successful-save footer notification remains visible past its 10-second lifetime under normal active rendering.

## Shelf footer — Reconnect message scope and expiry

- Fix the persistent footer message “Reconnect to browse. Saved locations are preserved.” reported to follow the user across tabs with no way to dismiss it.
- Treat this footer message as transient, scoped to the Files/Explorer browsing context that produced it. Dismiss within 10 seconds or immediately on leaving that context, whichever comes first. Do not resurrect it when switching tabs, themes, rerendering or reopening Shelf. Do not continually regenerate it merely because authentication remains disconnected.
- Preserve the actual disconnected state, existing Log In/Reconnect controls, saved locations and actionable authentication recovery in the relevant view. Do not remove necessary recovery or mask failures. Distinguish persistent contextual state from transient footer messages.
- Audit shared footer emitters for equivalent stale cross-tab messages. Apply scope and expiry to transient messages without clearing genuine live progress or required contextual recovery controls. Keep compact manual X and remove notification-only reserved space when dismissed. Test navigation, reconnect, logout, first use, repeated renders and new genuine browsing attempts.

## Shelf footer — Restore compact manual dismissal (latest override)

- Restore a small, discreet, theme-aware X at the far right of each visible transient footer notification, including saved acknowledgments and reconnect notices. This supersedes earlier no-X requirements for these footer notifications only; do not change Queue entry X controls or unrelated floating toast layouts.
- Clicking X immediately dismisses that notification and clears its reserved space. A dismissed notification must not reappear because of rerendering, tab changes, theme changes or stale events. A genuinely new notification remains eligible to appear.
- Retain automatic 10-second expiry and contextual dismissal on tab changes; manual dismissal is an additional safeguard, not a replacement.
- Keep the X vertically centered, compact, accessible by keyboard with an appropriate accessible label and sufficient hit area, and prevent message text from overlapping it. Use existing Aesthetic API styling and preserve underlying status, receipts and recovery controls.

## Custom success notification — approved Console Era v2
- Authoritative runnable visual reference: `11.24.2026/animation-references/redown-retro-reveal-v2.html` (also preserved in thanks-cohn/ani-lab at redown-retro-reveal-v2/index.html, commit bb512813259e785b9b48df1054dcc277e059a771). Preserve v1 separately; v2 is the approved motion.
- Use a standalone floating geometric 3D R at left, no enclosing icon square. Flat bold golden SUCCESS! at right, no extrusion, bevel, wave or shadow. Provider name directly beneath in tightly fitted contrasting highlight; no “at” or Chrome heading. Preserve reference layout and provider palette.
- Timing: R emerges and rotates/settles over 900 ms; SUCCESS! fades/scales in starting 650 ms for 650 ms; provider reveal begins at 1250 ms for 240 ms; hold stationary; fade entire achievement from 9200 to 10000 ms. Thin 10-second countdown and small far-right X; immediate dismissal, no resurrection. Support reduced motion.
- Reference HTML contains an SVG approximation; replace it in production with the uploaded final artwork at the exact path below. Keep it locally bundled, preserve proportions and alpha. Do not require an external URL or replace it with a different design. If artwork not supplied, retain reference approximation and report this limitation.
- Reuse existing success event identity and notification lifecycle, only show for genuinely successful saves (never falsely upgrade uncertain/failed saves), dedupe, handle concurrent saves, avoid stale timers. Scope custom in-browser rendering to supported surfaces with existing permissions, no broad new permissions merely for decoration. Chrome native notification heading cannot be redesigned; retain suitable fallback on unsupported pages or unavailable surfaces. Do not double-notify. Preserve existing footer message cleanup, X and timer requirements independently. No external libraries/fonts, WebGL, audio, or saving-engine rewrite. Treat this as a visual integration; test actual Chrome surfaces, reduced motion, all providers, narrow viewports, dismissal and expiry.

### Final approved R artwork (supersedes placeholder selection)
- Owner supplied final transparent RGBA PNG: `redown-console-r.png`, 1261 × 1247, original 989488 bytes, SHA-256 `0e10d0bea5f3513892256c240374b29301f6dcc0be2c9bf8e62e2e4a5ad2401d`. Red front, deep blue side and inner wall, yellow top and inner shelf. No enclosing square.
- Final artwork is uploaded in this branch at `11.24.2026/animation-references/approved-artwork/redown-console-r.png`. Use this exact PNG instead of the SVG approximation; preserve approved v2 animation timing and flat SUCCESS! lettering. A locally bundled optimized derivative may be used for production if visually faithful and alpha is preserved; keep original reference unchanged.

## History — Text search regression

- Owner reports History search returns no matches for ordinary words/letters, while numeric queries produce results. Investigate actual search indexing, query normalization, tokenization, filtering and reconciliation; root cause is not established.
- Make case-insensitive text and numeric searches work for existing supported searchable fields, including filename, provider, destination path and available website/source metadata. Support partial filename/word matches and mixed alphanumeric queries without requiring a number. Preserve existing date/range/provider filters and searchable metadata/privacy boundaries.
- Search the entire retained archive within active filters, not merely the currently rendered page. Clearing search restores the unfiltered results within those filters. Preserve responsive full-width field, virtualization, bounded memory and existing search responsiveness; avoid network requests or loading image payloads merely to search.
- Add regression tests for alphabetic, numeric, mixed, case-insensitive, partial and no-match queries across Cloudflare and Basic entries, old records and newly reconciled records. Do not modify saving engines or delete/rebuild historical data destructively.

- Exact owner-reported reproduction: History → Find saved files → type `screen` → UI displays `No saves in this display range.` despite expected screenshot matches. Test `screen`, `Screenshot`, `screenshot-75` and numeric controls against known retained screenshot records in the same display range. Distinguish no matching search results from an actually empty display range; preserve real range filtering. Root cause unverified.

## Release verification
- Failed status occupies the same right-aligned header position beneath timestamp as Verified; Error appears at bottom only when applicable, collapsed by default. Media if retained and eligible; hide unavailable cloud actions. Public URLs and Details remain collapsed independently by default.
- Audit relevant implementations before edits. Keep saving engines, right-click, authentication, receipts, historical records, screenshots, shortcuts, all themes and Aesthetic API intact. Run focused and existing regression tests; distinguish real Chrome tests from fixtures. Update version to 0.3.29, build, commit and push only this branch. Report actual test results and limitations.

## Remotes — Remove Cloudflare ready/setup results presentation

- Remove the visible `CLOUDFLARE_READY` internal status label and `Save results` control/section from the Remotes tab. Remove their associated empty space and redundant wrapper if no other needed content remains.
- Hide `Review Cloudflare setup` in all themes except Remote V1, which retains it as previously explicitly requested. Do not introduce replacement setup prompts or internal status codes in the normal Remotes presentation.
- Preserve actual readiness state, provider authentication, setup and approval flows, saved results/receipts and diagnostics in their appropriate existing contexts. Do not delete underlying data or disable saving, verification or recovery. Verify connected and disconnected states and theme switching.
