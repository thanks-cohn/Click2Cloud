# Next Codex request — November 24, 2026

Follow-up requirements, separate from the authoritative 0.3.28 implementation specification.

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

- Keep the existing provider/destination path line (e.g. Cloudflare R2 · redown / screenshots/Screenshot-75023fbd.png) inside the expandable Details section. Do not move it beneath the filename or duplicate it outside Details. Preserve actual path data and wrap long paths without overflow. Place Media directly beneath the filename/header area.
- Keep Media expanded by default according to the Cloudflare image preview preference. Clicking the image opens the existing regular Preview. Remove the separate Preview button; preserve accessible keyboard activation.
- Place Download and GO TO directly underneath the image in one action row, Download aligned far left, GO TO far right, flexible space between. Reuse existing actions and eligibility; do not fabricate support or duplicate buttons. Preserve responsiveness and theme compatibility.
- Public URLs and Details remain independent sections; Details stays below Public URLs and is collapsed by default. Media expansion must not expand Details or expose its destination path.
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
