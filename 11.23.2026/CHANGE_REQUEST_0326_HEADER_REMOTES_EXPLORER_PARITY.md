# REDOWN 0.3.26 — OWNER UX CORRECTION: HEADER, REMOTES, FILE EXPLORER

**Date:** 2026-11-24
**Authorized implementation branch:** `codex/queue-history-v2-0324-verified-2026-11-24`
**Existing verified alpha implementation SHA:** `ea7b74ac0a8614f6baaa71aefc44b32c9c4156c9`
**Original visual parity reference:** REDOWN 0.3.24 `cd4c8dd3bc11700376d30da050d6050a0eb1edb9`
**Scope:** Small, high-quality *layout-only* follow-up. No rewrite, no version increment, no permission or provider engine changes.

## LATEST OWNER DECISIONS — OVERRIDE ALL PRIOR BUTTON ARRANGEMENTS

### A. Remotes card actions — final owner placement

On **each applicable Remotes provider card** (Google Drive, OneDrive, Dropbox, Cloudflare R2), position the original, functional controls as follows:

- **Bottom-left:** the existing **Sign In / Login OR Reconnect** action, selected according to real provider auth state, with comfortable padding.
- **Bottom-right:** **GO TO first (left), Refresh second (right)**, grouped together, right-aligned, with sufficient spacing and proper responsive wrapping.
- **Top-right:** do NOT place Sign In or Reconnect there anymore.
- Never swap the right-side order. Do not invent unavailable controls or force an auth action to appear when inapplicable. Never rewrite its handler, auth state/eligibility, credentials, recovery or navigation.
- On narrow cards preserve clear ordering and a usable wide auth control, allowing the action groups to wrap to separate rows rather than clip, overlap or shrink buttons to unusable dimensions.
- The approved complete layout is **bottom-left auth** + **bottom-right GO TO → Refresh**. This supersedes ALL historical "Login/Reconnect top-right" or "GO TO/Refresh bottom-left" text in earlier documents.

### B. Cloudflare R2 sign-in must be wide again

- **Restore the Cloudflare Sign In / Login button's original wide, prominent horizontal footprint** seen before the 0.3.26 Queue/UX card layout change. This is a specific visual parity requirement, not simply "slightly larger".
- Consult the genuine 0.3.24 baseline for the Cloudflare connection/login treatment. A relevant original style exists in `extension/app.css`: `#connection button{width:100%;margin:8px 0}`; do NOT blindly force every Remotes button to be 100% width or assume that one CSS rule applies unmodified to the new card. Compare actual user-facing rendered controls.
- In the updated Remotes card, give Cloudflare's auth control as much horizontal room as its designated bottom-left action zone provides; if necessary make that zone wide/prominent or use an additional layout row at constrained widths. Preserve the separate bottom-right GO TO → Refresh group.
- A small icon-width/squeezed Cloudflare auth button fails visual parity. Retain legible full label, theme/palette-aware styling and correct focus/disabled/loading state. Apply correctly to Reconnect when it occupies the same Cloudflare auth position.
- Preserve Basic provider card functionality and styling. Don't impose Cloudflare's distinctive wide button on unrelated controls unless the baseline proves that treatment.

### C. Three-dot `⋯` More control ALWAYS far right

- The **three-dot More menu button** (`#header-more`, not Explorer's or History's other More controls) must be anchored to the **far-right end of the top header/navigation bar**. It is NEVER stranded immediately after Queue/History or left floating in the middle when tabs are Gone/moved to More or browser width changes.
- Treat `⋯` as the rightmost *header control*, including when the light/dark theme control exists: place the theme control before it, or otherwise make the header layout satisfy the right-edge requirement while keeping theme access. Do not hide or disable theme functionality.
- Keep the default main tabs exactly `Files | Remotes | Queue`, followed by a right-anchored `⋯`. The placement stays correct with custom main/more/gone settings, narrow Shelf widths, theme changes, zoom, debug mode and window resizing.
- Avoid nav `flex-wrap` behavior or CSS alignment that leaves `⋯` beside an arbitrary content tab rather than at the edge. Keep it keyboard-operable, never obscured/clipped. The dropdown itself must appear in-bounds and remain accessible.
- **Inspect actual source** before implementation: in 0.3.26 `extension/app.css`, `.app-header nav` uses `flex-wrap:wrap` where baseline 0.3.24 uses `flex-wrap:nowrap`; `.header-more` has only `flex:none`. Fix at the correct header/layout responsibility, including responsive cases, rather than papering over with one hardcoded offset.

### D. Restore File Explorer's original visible length / extent

- **File Explorer must be as long/roomy as it was before the new Queue/navigation UX changed its appearance.** Restore its baseline visual footprint, not a shortened/compressed version. Protect both the main File Explorer tab/control sizing and the actual Explorer browsing area (folder-tree and file list) so the user does not lose the old usable length/extent through the new header.
- Compare identical viewport dimensions, Chrome zoom, theme, panel state, and populated/empty File Explorer between 0.3.24 and 0.3.26. Record screenshots and computed widths/heights for the navigation control and Explorer pane; identify the actual regression and restore the relevant original effective dimension rather than guessing an arbitrary pixel size.
- The 0.3.24 CSS includes a persistent full-height Explorer shell (`.explorer-shell{height:100%;min-height:0;display:flex;flex-direction:column}` and `.explorer-shell #files{height:auto;flex:1;min-height:0;...}`). Preserve that functional fill/scroll layout and old browsing space. Do not break folder-tree resizing, virtualized rows, keyboard navigation, search focus or preview/gallery.
- If the shortened element is specifically the top "Files / File Explorer" tab, restore its old generous hit target/length without sacrificing `⋯` far-right placement. If the shortened element is the Explorer pane, restore its baseline full usable span. **Do not replace one problem by shrinking the other**.
- Support all actual supported themes and responsive sizes. This request is layout parity, not a new File Explorer feature.

## Required proof and regression gates

1. **Visual baseline comparison:** screenshots of 0.3.24 versus the corrected 0.3.26 at matching Chrome viewport/zoom/theme, showing Cloudflare wide Sign In and full-length File Explorer. Record actual dimensions if relevant.
2. **Remotes placement:** four provider cards where applicable, bottom-left Sign In/Reconnect and bottom-right GO TO then Refresh; check connected, disconnected, reconnect-required and narrow layouts. Provider operations and state must remain unchanged.
3. **Three-dot edge:** top `⋯` is always at the far-right boundary through default/custom tabs, Settings in Main/More, History Gone/Main, narrow/mobile-width, zoom, themes, and window resize; theme button remains reachable.
4. **Explorer parity:** original browsing extent and controls; folder tree, splitter, virtualized file list, search, preview and navigation still work. Do not increase memory use for thumbnails or break page performance.
5. **Protect all REDOWN 0.3.26 features:** History V2 and Live Jobs; Settings → Queue full ZIP; auth and cloud-save engines; screenshots; provider cards; original History and Diagnostics. No regressions to existing browser/ZIP benchmarks.
6. **Honest evidence:** record browser screenshots and test results, identify real provider verification separately from fixture tests. Commit on the authorized branch and report final SHA; do not rewrite the proven implementation wholesale.

**Do not implement older contradictory placement directions. This addendum is the latest owner authority for header / Remotes button placement / Cloudflare login width / File Explorer size.**
