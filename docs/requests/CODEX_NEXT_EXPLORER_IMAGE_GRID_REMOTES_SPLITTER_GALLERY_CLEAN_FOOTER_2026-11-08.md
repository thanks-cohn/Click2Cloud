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

## Implementation safety and release priority

Keep a single canonical File API, trusted authorization boundaries and GUI↔API parity; no shadow engines. Preserve saved Simple/Narrow/Depth, Quick Select, Default, approval and OAuth data. No cloud resource mutations or REDOWN changes without explicit approval. Rendering changes may not regress remote TRUE REMOTE savings, independently verified receipt and History GO TO. Don't falsely mark beta/alpha ready from simulated image thumbnails. **Do not delay alpha-critical Boot API/verified save fixes for embellishments**: these are ergonomic repairs to a basic usable Explorer, not a mandate for unrelated feature expansion.

## Prove with tests

1. Screenshot/DOM + real decoded pixels for actual WebP/JPEG/PNG/GIF, correct failures and Download.
2. Grid visible-only thumbnail reads and image cache/abort/scroll/perf tests.
3. Remotes/Settings no tree; Explorer has tree; state survives 50+ tab switches.
4. Drag splitter to 0%, 50%, 100% with mouse/pointer (incl. off-element release), keyboard Home/End and screen-reader semantics; restore collapsed side; resize preserves selected file and folder path.
5. Expand image, Right/Left navigation A→B→A with mixed nonimages/folders; test rapid keypress race, close/Escape, keyboard focus, gallery boundaries and no stale blobs.
6. Bottom-left has NO debug/status text; intentional network/auth/save errors remain discoverable and truthful; no `OK` masquerading as image or success.
7. Zero-stutter performance p50/p95/p99 and long-task/memory comparisons; focused tests and Chromium app regression tests, then separately actual installed Windows Chrome and real Cloudflare R2. Label non-executed external tests **BLOCKED / NOT TESTED**, never PASS.
8. Preserve current behavior fingerprints/immutable baseline and deliver exact modified files, commits, PASS/FAIL/BLOCKED, and reproducible owner verification steps.

**TARGET:** User can freely drag the middle divider from edge to edge, open an image and browse with ←/→, see real thumbnails in Grid, and never see debug chatter in the bottom-left. Remotes remains a clean standalone screen.

**NO BLOAT · NO FALSE PREVIEWS · NO FROZEN DRAGS · NO LOST DESTINATIONS · NO FALSE CLOUD SUCCESS.**
