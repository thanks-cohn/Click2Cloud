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

- Place the existing provider/destination path line (e.g. Cloudflare R2 · redown / screenshots/Screenshot-75023fbd-d456-440e-a531-3bddc59a46cc-1.png) directly beneath the filename and before Media. Move it out of Details; avoid redundant visible copies. Preserve actual path data and wrap long names/paths without overflow.
- Keep Media expanded by default according to the Cloudflare image preview preference. Clicking the image opens the existing regular Preview. Remove the separate Preview button; preserve accessible keyboard activation.
- Place Download and GO TO directly underneath the image in one action row, Download aligned far left, GO TO far right, flexible space between. Reuse existing actions and eligibility; do not fabricate support or duplicate buttons. Preserve responsiveness and theme compatibility.
- Public URLs and Details remain independent sections; Details stays below Public URLs. Media expansion must not expand Details.
- Error is an independent expandable section when applicable, collapsed by default. Preserve truthful failure/status indication and actionable error details; do not expand Error automatically as a side effect of image expansion. Do not show empty Error sections for successful entries.
- Preserve existing provider functionality, retained images, verification, receipts, navigation, lazy loading and memory safeguards. Audit actual card layout before editing.
