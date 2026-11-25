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
