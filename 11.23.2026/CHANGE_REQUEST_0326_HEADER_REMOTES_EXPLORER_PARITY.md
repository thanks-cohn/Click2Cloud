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

## E. History V2 pagination footer — eliminate ugly orphaned controls (owner screenshot regression)

**Owner screenshot evidence, 2026-11-24:** In the actual narrow REDOWN Shelf, the History V2 footer renders the first row as **"⏮ First | ◀ Previous | Page [1] / 1"** and then leaves **"Next ▶ | Last ⏭"** stranded on a second row. The inconsistent disabled-button sizes, mixed text lengths and gaps make the bottom of the card visually unfinished. This is an explicitly requested **0.3.26 UX repair**; NOT an excuse to remove pagination.

**Root cause confirmed in the existing source:** `extension/queue-page.mjs` outputs five inline elements plus four buttons with full-word labels, while `extension/app.css` combines `.queue-pager` into `.queue-heading,.queue-card-header,.queue-actions,.queue-pager{display:flex;align-items:center;flex-wrap:wrap;gap:8px}`. This allows arbitrary wrap boundaries at Shelf width. Repair **this** isolated Queue/History footer, not all action rows globally.

### Required finished design

- Use a clean, compact, **visually centered, symmetrical single-row** pagination control at standard REDOWN Shelf widths, with four consistent-size icon buttons, a small editable page-number input, and a readable total-page indicator.
- Left to right: **First | Previous | Page [editable number] / total pages | Next | Last**. In narrow Shelf widths, prefer **icons without redundant word labels** for the buttons; retain accessible `aria-label` values: First page, Previous page, Next page, Last page. Keep sufficient hit targets (target around 32–36px where achievable), deliberate margins, theme-consistent outlines and disabled states.
- **Do not let only Next/Last wrap into an ugly orphan second row.** For unusually narrow widths/high zoom, use an intentional adaptive compact variant (e.g. smaller icon targets with accessible labels, a constrained horizontal scroll area, or two *balanced* centered groups if genuinely necessary), never accidental ragged wrapping or clipping.
- **At totalPages === 1:** present a polished, restrained **"Page 1 of 1"** single-page footer rather than four giant disabled buttons, if this can be implemented cleanly without breaking keyboard/focus. With multiple pages, all four controls must be present and work. The single-page presentation is optional if a consistently attractive and accessible disabled icon row is better across all themes.
- The page-number input **must remain editable** and support Enter submit, validated/clamped page indices and stable focus. Preserve First/Previous/Next/Last, accurate counts, async querying, indexed deep jumps, 100,000-record benchmark and chronology. Do not preload records or recalculate the entire archive to restyle pagination.
- The footer must not collide with the History card border, overflow the Shelf, create a second horizontal app scrollbar, or move the bottom Manage Destinations bar. Fit standard Shelf height/width, including 200–400px usable content region.
- Respect Remote V1 and all modern Aesthetic API palettes, dark/light themes, browser zoom and RTL where possible. Never globally shrink all buttons to solve a problem specific to pagination.

### Mandatory browser verification

1. Screenshot of a **single-page** History V2 result with no dangling navigation row.
2. Screenshot of **2, 10 and 100+ pages** at actual Shelf width; check all 4 controls, direct page input and live counts.
3. Browser-width/zoom stress and every supported theme; keep alignment, border containment, focus and accessible labels.
4. Verify actual clicks + keyboard Enter at first/middle/last page, disabled boundary states, and persistence of current record selection and scroll.
5. Regression check the **100,000-record** history paging/ZIP tests and the separate screenshot-rule pagination. Do not alter the underlying History service or introduce an unrelated list UI rewrite.

**P0 UX acceptance criterion:** The screenshot's two-row orphaned **Next/Last** footer must not exist in the delivered 0.3.26 repair.

## F. Queue heading and History V2 search hierarchy — owner screenshot correction

**Owner screenshot evidence (2026-11-24):** On the actual narrow Shelf, the main page heading **Queue** is an unstyled-looking left-aligned word near the top. The History V2 section places **History V2** at the left of the same row as the **Find saved files** label and a cramped search input on the right. The owner wants a deliberately composed visual hierarchy, not a horizontal squeeze.

### Required visual order

1. **Queue** is the main **centered** page heading at the top of the Queue view, with intentional whitespace above/below, readable type scale, and palette-appropriate typography/contrast. Center the title within the actual Queue content column, not within the entire browser window or sidebar.
2. Keep the existing **Live Jobs** card underneath the Queue heading; do not move or rename it.
3. Inside the **History V2** card, put **History V2 centered on its OWN TOP ROW**, with balanced vertical margins.
4. On a **SECOND ROW BELOW** that heading, place **Find saved files** and its search input, **left-aligned** in the card's usable content width. Prefer a comfortable, readable search field that can fill the available width at narrow Shelf sizes, never a cramped tiny right-hand search box. Use the existing control, label, placeholder, events and search/filter behavior; no functionality changes.
5. Below the search row, keep results count, date sections, History V2 cards, and the separately approved refined pagination footer. Maintain consistent spacing between these levels.
6. Centering does NOT mean centering the search field or its label. The owner specifically allows/requests the **search to stay left-aligned** under the centered History V2 heading.

### Source details and implementation guardrails

- In `extension/queue-page.mjs`, the Queue page currently appends `element('h1','Queue')` without a dedicated heading class. Give it a scoped layout class or equivalent and center just this heading.
- `mountHistoryV2` currently constructs a single `<div class="queue-heading"><h2>History V2</h2><label>Find saved files <input ...></label></div>`. Separate the title and search into **two deliberate block rows**, retaining proper semantic heading and label/input association.
- In `extension/app.css`, the broad `.queue-heading,.queue-card-header{justify-content:space-between}` rule is causing title/search to share one row. Add isolated History V2 heading/search rules rather than changing unrelated headers, Queue actions, Live Jobs or Settings.
- Preserve the actual current input query, debounce, focus and accessible names. Preserve real pagination, indexed querying, scroll behavior, active jobs and all currently working 0.3.26 features. No functional engine rewrite.
- The design must feel purposeful and high-end in Remote V1, Bit o' Polish, Frames and all supported palettes. Avoid giant empty space, oversized title text, broken contrast, wrapping against the card border, and sideways scrolling.

### Mandatory visual and functional acceptance

1. At the same **narrow Shelf width shown in the owner's screenshot**, the page displays a centered **Queue** heading, then the Live Jobs card.
2. The History card displays centered **History V2** on its own row, with **Find saved files** and a comfortably sized **left-aligned search box below**.
3. With a populated History archive and with empty/zero results, the title/search/card/pagination hierarchy remains polished.
4. Test searching by filename/provider/text, typing/deleting/query debounce, focus, keyboard accessibility and results update. Search performance and 100,000-record indexed paging must not regress.
5. Capture real-browser screenshots at narrow, standard, and wider Shelf widths with several themes; assert distinct title and search rows and correct horizontal alignment.

**Owner acceptance:** Do not leave the Queue page title casually left-aligned or place History V2 and Find saved files side-by-side in the finished repair.

## Required proof and regression gates

1. **Visual baseline comparison:** screenshots of 0.3.24 versus the corrected 0.3.26 at matching Chrome viewport/zoom/theme, showing Cloudflare wide Sign In and full-length File Explorer. Record actual dimensions if relevant.
2. **Remotes placement:** four provider cards where applicable, bottom-left Sign In/Reconnect and bottom-right GO TO then Refresh; check connected, disconnected, reconnect-required and narrow layouts. Provider operations and state must remain unchanged.
3. **Three-dot edge:** top `⋯` is always at the far-right boundary through default/custom tabs, Settings in Main/More, History Gone/Main, narrow/mobile-width, zoom, themes, and window resize; theme button remains reachable.
4. **Explorer parity:** original browsing extent and controls; folder tree, splitter, virtualized file list, search, preview and navigation still work. Do not increase memory use for thumbnails or break page performance.
5. **Protect all REDOWN 0.3.26 features:** History V2 and Live Jobs; Settings → Queue full ZIP; auth and cloud-save engines; screenshots; provider cards; original History and Diagnostics. No regressions to existing browser/ZIP benchmarks.
6. **Honest evidence:** record browser screenshots and test results, identify real provider verification separately from fixture tests. Commit on the authorized branch and report final SHA; do not rewrite the proven implementation wholesale.

**Do not implement older contradictory placement directions. This addendum is the latest owner authority for header / Remotes button placement / Cloudflare login width / File Explorer size.**
