# NEXT CODEX RUN — Click2Cloud: correct image previews + real Grid thumbnails + independent Remotes + full-range divider + arrow-key gallery + clean footer

**Owner's additional requirements, 2026-11-08:** The *middle line separating the File Explorer folder tree and file content* must be a draggable slider that can travel all the way left and all the way right; enlarged images must permit gallery browsing with the Left/Right arrow keys; the bottom-left must show **no debug text**.

**Purpose:** Implement and test actual production behavior in the Click2Cloud Shelf. This is an additive follow-up to the earlier Explorer/Image/Remotes repair request, NOT a request for just more documentation. Prioritize correctness, preserving performance, and alpha readiness; don't turn it into a new Explorer architecture.

## Mandatory existing reports and other next-run dependency

- [Broken WebP modal preview displays OK](../../Issues_and_Bugs/Bugs/P1_EXPLORER_IMAGE_PREVIEW_DISPLAYS_OK_INSTEAD_OF_IMAGE_2026-11-08.md).
- [Grid shows generic icons rather than images](../../Issues_and_Bugs/Bugs/P1_EXPLORER_GRID_VIEW_HAS_NO_IMAGE_THUMBNAILS_2026-11-08.md).
- [Remotes must hide entire Explorer left folder pane](../../Issues_and_Bugs/Issues/P1_REMOTES_TAB_MUST_NOT_SHOW_EXPLORER_LEFT_NAVIGATION_PANEL_2026-11-08.md).
- [Whole-Shelf lag/stutter](../../Issues_and_Bugs/Bugs/P0_WHOLE_SHELF_EXPLORER_LATENCY_STUTTER_REDOWN_PARITY_PLUS_2026-11-08.md) must not regress.
- [Independent one-click Default selection](./CODEX_NEXT_ONE_CLICK_DEFAULT_TOGGLE_MANAGE_DESTINATIONS_2026-11-08.md) is separately requested and must not be lost or contradicted.

## Verified code context (Click2Cloud main 855493d inspected; verify latest revision before editing)

- `extension/app.html` holds the always-present `<aside aria-label="Cloud navigation">`, `#main` and a footer `#status`. `extension/app.css` currently makes `aside` resizable using CSS `resize:horizontal` but **enforces `min-width:190px` / max `40vw` (145px on narrow screens)**, preventing full left/right traversal. There is **no explicit draggable inter-pane splitter/slider control**. The current pane is not allowed to reach both edges.
- `extension/app.mjs:renderWindow` Grid tile uses only generic `📁` or `▤`; it does **not** render image bytes/thumbnails.
- `extension/app.mjs:openEntry` uses `readFileChunk`, builds image Blob URLs and opens a dialog, but does **not** implement gallery Left/Right behavior. The owner saw literal `OK` instead of a WebP image.
- `extension/app.mjs:show` does not hide the full `aside` for Remotes. `extension/app.mjs:status` writes arbitrary statuses/errors (including diagnostic-ish codes) into `#status` at the **bottom-left**, which owner explicitly wants empty.
- Current `#dialog` is reused for unrelated operations; gallery keyboard handlers must be *strictly scoped to an active image viewer*, not the Destinations editor, login, text inputs or all Shelf keypresses.

## 1. Image modal must show ACTUAL authenticated image pixels, never “OK”

Fix root cause end-to-end `readFileChunk` → Universal File API → typed RPC → assembled image Blob → DOM decode. Account for nested status envelopes, range proof, byte integrity, MIME/extension, stale calls, image.onerror/naturalWidth. A plain `OK` may be a misleading error string, proxy response, or corrupt saved object. **Inspect actual bytes before deciding which**. An actual corrupt cloud save is alpha-blocking and must not be papered over.

PNG/JPEG/WebP/GIF with valid bytes show actual pictures. Invalid bytes, permissions, unsupported size or network issues show specific honest failure and Download where allowed. Don't stage entire arbitrary files in browser or send original webpage/source URLs to the cloud destination.

## 2. Grid means real thumbnail gallery

Make image tiles show genuine thumbnails of objects from the exact authorized cloud account/bucket/key. Preserve lightweight file/folder icons for others; load only visible/nearby thumbnails with hard-bounded concurrency, memory, cancellation and sensible caching by object identity/version. No all-object prefetch, endless bytes, content leakage, false image content, main-thread decode storms, or regressions to scrollbar/focus/virtual rows.

Grid must scroll smoothly with 0/100/1k/10k entries and allow double-click/Enter to open the full image viewer.

## 3. Remotes and Settings MUST NOT display the Explorer folder tree

Remotes displays ONLY Remotes' own cards/connection/attention information, using the entire available content width. Settings likewise uses its own full-width content. File Explorer alone shows the two-pane tree/listing. Hiding/restoring the tree must preserve expanded folders, active path, selection, scrollbar positions, login affordance, and no duplicate cloud reads.

## 4. Explorer vertical middle divider is a TRUE DRAGGABLE SPLITTER

The line between left Cloud Folder Tree and right file list/Grid is an **interactive width slider**, not an ordinary cosmetic border.

- Drag or keyboard-adjust it horizontally to allocate space between tree and content **continuously across the entire available Shell width: 0% left / 100% right and 100% left / 0% right**. Do not hardcode a minimum 145/190px tree or 40vw maximum. At exact extremes, one pane can collapse and the other occupy the remaining content width.
- **Keep the divider discoverable and reachable** even at 0%/100%; provide a narrow edge handle/reveal control to bring the collapsed pane back. Neither a collapsed tree nor listing should become irretrievable.
- Show an obvious grab cursor/hover/focus visual. Pointer capture across fast drags; handle dragging ending outside the panel, unexpected blur and tab switch. Avoid text selection/accidental row dragging.
- Give accessible separator `role="separator"`, `aria-orientation="vertical"`, keyboard focus and ArrowLeft/ArrowRight controls, Home/End for extremes, optional double-click reset to 50/50, and meaningful label/value. Follows reduced-motion preferences.
- Default initial split can remain conventional ~25–35% tree / 65–75% file area; persist last user-set split in local preferences/session appropriately without needing a new API *unless* persistence crosses the canonical configuration boundary, then use its typed `commitConfigChange` operation. Preserve independent tab separation: no divider on Remotes or Settings.
- A resize should **not** trigger cloud listing, destroy selection, reset gallery, replace Explorer DOM or cause expensive layout per mousemove; use efficient CSS layout + frame-coalesced updates and recalculate virtual Grid columns/scroll anchor without blank flicker. Narrow Chrome side-panel sizes must work.
- At extreme right, tree owns virtually the whole width and files are collapsed; at extreme left, files own the whole width and tree is collapsed. Test both orientations explicitly.

## 4A. Adjustable HORIZONTAL DIVIDER under Explorer action toolbar — one-row compact mode + More

**Owner's second drag requirement:** In addition to the **vertical line between folder tree and file pane** described in Section 4, make the **horizontal divider immediately beneath the Explorer's upper command/dashboard bar** adjustable up/down. This area contains **Back, Forward, Up, Refresh, address, View, + Right Click** and any other legitimate File Explorer actions.

- Drag the toolbar's **bottom horizontal edge** to change how much vertical space the Explorer command area occupies. Upward movement progressively compresses/wraps the toolbar, down to a **single usable row**. Downward movement expands it to show the previously hidden buttons across additional rows. It must never fully erase the sole usable command row or leave buttons inaccessible.
- When the available space/width cannot display every control in one row, show a single clear **More** button at the end of the compact toolbar. Clicking it reveals **all hidden toolbar actions** in an accessible overflow menu; selecting one invokes the *exact same command implementation* as the expanded visible button. Never discard `+ Right Click`, Back, Up, Refresh, address entry, View or other controls—put them in More if hidden. Prioritize frequently used navigation and `+ Right Click` in the visible row where width allows.
- **More = toolbar overflow**, distinct from **Load more files** in the file listing. Give different accessible labels/IDs and no action ambiguity. Keep the address/path control usable at narrow widths and provide a single accessible way to reach hidden actions.
- Compact and expanded modes are driven by real available geometry; do not hide essential buttons by arbitrary hard-coded screen width or overlap/clip text. The divider should have a visible grab target and resize cursor, pointer capture, keyboard ArrowUp/ArrowDown controls, Home (minimum one row), End (maximum practical rows) and accessible separator name/value. A double-click reset may restore default toolbar height. Respect reduced-motion.
- Do not make every pointermove trigger network reads, full-shell re-render, `getConfiguration`, native-menu regeneration, or file list reload. Coalesce layout changes to frames, maintain an existing `#files` node and its scroll anchor, and recalibrate Grid columns/viewport once needed.
- Toolbar can expand only to a sensible maximum dictated by its actual actions, not create arbitrary blank unused height. Persist the owner's size preference if appropriate, using the architecture rule above; don't persist accidental transient viewport changes as new domain mutations.
- In **Remotes** and **Settings**, no Explorer action toolbar nor its horizontal resize handle should appear. Tab changes preserve the Explorer toolbar size, file navigation, selection, grid view and vertical tree/content split.
- Keyboard and screen reader users must reach every action in both modes. More opens with Enter/Space; Escape closes and restores focus. Pointer dragging and menu interactions must not trigger an underlying file save, right-click destination edit or gallery navigation.
- Test a wide desktop and very narrow Chrome Shelf: drag up to one row (hidden actions appear under More), expand back until every action is visible (More vanishes when unnecessary), tab-switch/restart restore, keyboard operation, no clipping, same canonical API execution for visible/overflow button. Stress with 0/1/10k files while dragging to ensure zero introduced scroll jank.

**Meaning:** One divider slides **left↔right** to resize the Explorer tree and files; a second divider slides **up↕down** to resize the upper toolbar between one compact row and an expanded multirow command area.

## 5. Full/expanded image viewer: LEFT/RIGHT navigates gallery

- When a supported **image** is opened large (from Grid, List or Details), pressing **ArrowRight** advances to the next image and **ArrowLeft** goes to the previous image in the current folder's *display/sort order*, skipping directories and non-images.
- Update the image pixels, title, and selected file consistently. Show unobtrusive clickable previous/next arrows for discoverability. ESC closes viewer and returns focus to the originating Grid/list row. No new tab/pop-up, no separate Explorer window required.
- Don't let the global file-list keyboard event capture these arrows while enlarged viewer is active. Ignore navigation when focus is in input/textarea/select or when another modal is active; prevent default page scrolling on active gallery arrows.
- Use existing authorized File API and bounded preview reads. Cancel/epoch-discard obsolete reads when user presses keys rapidly; never show a stale image/title from a previous press. Cache nearby images only if bounded/authorized, and keep actual bytes and object URLs scoped to the user's current session/account.
- If more file listing pages exist, traverse loaded items reliably; if implementing paging across gallery, page via the canonical list API and report loading honestly. No fabricated next entry or silent wrong path. At edges, disable the unavailable arrow or wrap intentionally and consistently (default: **stop at first/last**, avoid surprise wrap).
- Never fetch all files solely to populate the gallery; no loading/decoding tens of full images upfront. Work for WebP/PNG/JPEG/GIF and show proper unavailable/invalid behavior without breaking navigation.

## 6. Remove debug/status text from BOTTOM-LEFT

- The visible bottom-left footer currently shows `#status` with text like internal engine errors, file counts, timing, background worker codes, status strings, etc. **Remove this developer/debug-style text from the bottom-left user-facing Shelf.** The left side may be empty; keep the right-side **Manage Destinations** button where it belongs.
- Do **not** solve this by swallowing operational errors or muting screen readers. Real auth/scope/transfer errors, progress, pending/uncertain verification and connection issues must still appear in **appropriate user-facing contextual UI**: Cloud card, inline Explorer loading/error state, relevant action/dialog, meaningful compact accessible notification/attention when necessary. Do not show unhelpful raw codes or `OK` as error messages.
- Keep sanitized diagnostic breadcrumbs available to explicit developer/diagnostic mode or current evidence API, not constantly printed in the footer. Do not accidentally leak filenames, private URLs, IDs or tokens.
- Test that the bottom-left visually stays clear through boot/login/selection/scroll/preview/right-click/errors while the app still gives truthful failures in the relevant surface. No always-pulsing decorative status.

## FOUNDATIONAL ARCHITECTURE RULE — maximal programmatic reach, minimum API bloat

**Owner directive, 2026-11-08:** Click2Cloud should be *lightning quick, dependable, boring, stable, transparent, understandable*. Expose every **meaningful domain operation and durable preference** programmatically wherever reasonably possible, **but do not force a network/background API for local pointer gestures, layout frames, CSS or transient UI state.** Extend existing canonical API owners rather than add colliding parallel APIs. The GUI is a client of domain behavior, not the business-logic authority. Document intentional UI-local exceptions.

**Source inspection:** `src/api/service.mjs` owns the typed, schema-validated version `3+1.1` `toolRegistry` (`inspect/configure/auth/execute/restore/provision`), authorization and canonical operations. `src/api/service.d.ts` owns type declarations. `src/api/config.mjs` owns `productState`, `CONFIG_CHANGE_FIELDS`, `applyConfigChanges`, existing `getConfiguration` / `previewConfigChange` / `commitConfigChange` revision-aware persistence. `src/explorer/file-api.mjs` and `r2-adapter.mjs` own real data reads. `extension/app.mjs` implements UI presentation and keyboard/pointer gestures. Do not create another engine, preview backend, native-menu dispatcher, permission store or unrelated RPC owner.

| User-visible mechanism | Programmatic design, reusing existing owners |
|---|---|
| Open/preview image, thumbnail, gallery | `readFileChunk`, `fileMetadata`, `listFolders`, existing Universal File API, with explicit typed failure states. An image gallery's next/previous index is a **pure deterministic function** over ordered authorized listing; no new server-side gallery API. |
| Saved destination and Default selection | Existing `listDestinations`, `getConfiguration`, `commitConfigChange` `makeDefault/clearDefault`; native registrar ACK and dispatch remain canonical. |
| Remotes vs Explorer tab/view | Existing capability/connection/readiness inspections. Switching tabs is presentational and does not merit a new trusted RPC. |
| Horizontal pane splitter and vertical toolbar-height splitter | Pointer/keyboard/CSS state is local and testable through a small pure layout model / DOM state. If user expects persistence across restart, extend existing validated preferences and `commitConfigChange` **once** as the only durable owner, or use a justified UI-local persisted preference when not domain-facing; do not introduce a dedicated API per handle, direction, or pixel. |
| Toolbar compact/expanded state, **More** overflow | Pure responsive derivation of available width/height and one shared canonical button/action mapping. **More** invokes the *same* existing handlers, not clones and not a second file-action API. Local state may be exposed to accessibility/tests without remote calls. |
| Errors, statuses, diagnostics | Keep existing sanitized domain status codes/receipts, and present meaningful user errors contextually; disabling bottom-left debug output must not suppress proper API errors, accessibility announcements, or inspectable diagnostics. |

**Required API/GUI parity audit before implementation:**
1. Trace each action's current owner and whether its result is inspectable without graphical interaction. Prefer `getConfiguration` / `listDestinations` / `readFileChunk` / `fileMetadata` / `listFolders` / existing typed actions.
2. If a *meaningful* operation is truly missing, add the **smallest extension** to that same typed registry, `service.d.ts`, closed schemas, authorization, errors and tests. Name and document the single owner. Avoid pointless wrappers/tool proliferation.
3. For transient drag locations, current gallery cursor, visual focus and panel expansion, use pure local view state, with deterministic programmatic methods/tests where helpful; do **not** make every drag frame go through MV3 messaging or cloud.
4. Do not create shadow persisted state or diverging GUI/API logic; explicit state changes affecting saved config should use the real existing revision/commit path. Ensure versioned migrations preserve old data and exact chosen locations.
5. Make the behavior observable, testable, debuggable **without** exposing private bucket names, original page URLs, credentials or sensitive byte buffers in logs. Test blocked/error/partial/uncertain states, not only happy path.
6. Prefer **fewer reliable mechanisms with proven contracts** over elegant-sounding but fragile extra abstractions. Keep launch priorities Boot API, truthful readiness, independently verified remote saves and persistent destinations ahead of cosmetic work.

## Implementation safety and release priority

Keep a single canonical File API, trusted authorization boundaries and GUI↔API parity; no shadow engines. Preserve saved Simple/Narrow/Depth, Quick Select, Default, approval and OAuth data. No cloud resource mutations or REDOWN changes without explicit approval. Rendering changes may not regress remote TRUE REMOTE savings, independently verified receipt and History GO TO. Don't falsely mark beta/alpha ready from simulated image thumbnails. **Do not delay alpha-critical Boot API/verified save fixes for embellishments**: these are ergonomic repairs to a basic usable Explorer, not a mandate for unrelated feature expansion.

## Prove with tests

1. Screenshot/DOM + real decoded pixels for actual WebP/JPEG/PNG/GIF, correct failures and Download.
2. Grid visible-only thumbnail reads and image cache/abort/scroll/perf tests.
3. Remotes/Settings no tree; Explorer has tree; state survives 50+ tab switches.
4. Drag splitter to 0%, 50%, 100% with mouse/pointer (incl. off-element release), keyboard Home/End and screen-reader semantics; restore collapsed side; resize preserves selected file and folder path.
5. Drag the **upper horizontal toolbar divider** upward to one row + More and downward to expanded rows; test 100% action reachability, narrow Chrome Shelf, keyboard, accessible overflow, preserved scroll, API parity and no new worker calls during pointermove.
6. Expand image, Right/Left navigation A→B→A with mixed nonimages/folders; test rapid keypress race, close/Escape, keyboard focus, gallery boundaries and no stale blobs.
7. Bottom-left has NO debug/status text; intentional network/auth/save errors remain discoverable and truthful; no `OK` masquerading as image or success.
8. Zero-stutter performance p50/p95/p99 and long-task/memory comparisons; focused tests and Chromium app regression tests, then separately actual installed Windows Chrome and real Cloudflare R2. Label non-executed external tests **BLOCKED / NOT TESTED**, never PASS.
9. Preserve current behavior fingerprints/immutable baseline and deliver exact modified files, commits, PASS/FAIL/BLOCKED, and reproducible owner verification steps.

**TARGET:** User can drag the vertical folder/file divider edge-to-edge and the horizontal toolbar divider from a one-row **More** compact mode to fully expanded controls; open an image and browse with ←/→; see real thumbnails in Grid; and never see debug chatter in the bottom-left. Remotes remains a clean standalone screen. Every meaningful operation is programmatically inspectable/accessible through the **existing canonical API** wherever appropriate; transient UI gestures remain lean/local.

**NO BLOAT · NO FALSE PREVIEWS · NO FROZEN DRAGS · NO LOST DESTINATIONS · NO FALSE CLOUD SUCCESS.**
