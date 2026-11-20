# Experimental — Expanded Lightbox (Beta): Half Screen or Full Screen Outside the Shelf

**Recorded:** 2026-11-20  
**Primary product:** Click2Cloud  
**Project location:** `/experimental` — exploratory idea, not an active fix or implementation task.

**Owner request (November 20, 2026):** Add an **opt-in beta feature in Settings** that lets the **File Explorer image lightbox/gallery** open **outside the narrow Click2Cloud Shelf**, filling **half the screen** or **the full screen**, as the user chooses. The beta enable checkbox is **OFF/unchecked by default**. The two size options must **appear only after the user checks the beta box**. This is a new, optional feature; do not alter the existing lightbox while beta is disabled.

### Exact Settings UX

1. Add a clear Settings card or subsection titled **Expanded Lightbox (Beta)**, keeping the existing app theme and Title Case conventions.
2. Show one checkbox: **Enable Expanded Lightbox (Beta)**. Its default for new installations, existing installations and missing preference data is **unchecked (OFF)**.
3. **When unchecked:** the Half Screen/Full Screen controls are **hidden, not merely disabled or greyed out**. The existing in-Shelf image lightbox and gallery behavior must remain **exactly as they work now**.
4. **When checked:** immediately reveal two mutually exclusive, labeled radio choices, **Half Screen** and **Full Screen**, underneath the checkbox. Use **Half Screen** as the initial mode if the user has never chosen a mode. Save the selected mode and the enable flag in a durable local preference; if the beta is disabled and later re-enabled, restore its last explicit mode rather than deleting it. Do not cause an image to open just by toggling Settings.
5. **Half Screen:** on the next File Explorer image preview, open a separate, user-visible, extension-controlled lightbox window using approximately **half the available display width** and the available height (or a close usable approximation), properly constrained to the current monitor/work area with normal window controls. Preserve aspect ratio with `object-fit:contain`, without cropping/distorting the image.
6. **Full Screen:** open the image viewer in a dedicated, extension-controlled window that fills the current display in an appropriate fullscreen mode (subject to Chrome/OS restrictions). Provide an obvious close/exit action, including **Esc**, and a reliable way back to the original Shelf. Do not claim to cover other monitors or bypass browser/OS window management.
7. **When switching the setting OFF:** future image previews return to the existing **in-Shelf** lightbox. Do not leave orphan windows, popups, blob URLs or retained sensitive image bytes. Handle any already-open expanded preview gracefully.

### Platform reality and recommended architecture

- **Verified existing implementation:** `extension/app.mjs` `openEntry()` creates image lightboxes using the Shelf's existing `dialog()` with `<section data-gallery>`, `.image-frame` and `img.preview`, plus next/previous gallery controls, Download, rename/tags where applicable, retry/error handling and authenticated image reads. `extension/app.css` styles `dialog:has([data-gallery])` within the available `vw/vh` **of the Shelf**. `renderSettings()` builds Settings cards in `extension/app.mjs`.
- Chrome's **side panel is a separate bounded view**. Do **not** attempt to make its DOM dialog escape the Shelf via `z-index`, `position:fixed`, CSS transforms or `100vw`; those measurements and paint boundaries remain inside the panel.
- **Feasible design for Codex to investigate:** launch a **dedicated Chrome extension viewer window** using the Chrome `windows` API. The **Half Screen** mode can request bounded popup dimensions/position; the **Full Screen** mode can request a fullscreen state. The API does **not** allow passing `left/top/width/height` simultaneously with a fullscreen window state. See the official Chrome API documentation: https://developer.chrome.com/docs/extensions/reference/api/windows .
- Keep the viewer as an **extension-owned authenticated surface**, not a public `r2.dev` link or an arbitrary webpage injection. Reuse authorized R2 byte reads and bounded image decoding, existing download and gallery controls where feasible. Never pass OAuth tokens, Cloudflare secrets or private image bytes through public URLs/query parameters; use narrowly scoped internal messaging/correlation identifiers, and revoke temporary object URLs.
- Explicitly account for Chrome permissions, user-gesture requirements, multiple monitors, display scaling, popup blocking/window failures, MV3 worker restarts and Shelf close/reopen. If expanded opening fails, clearly explain the failure and **fall back to the original in-Shelf viewer** rather than losing the image or changing the save engine.
- Preserve original lightbox features such as previous/next gallery navigation, close/escape, image loading visual, verified preview, object-key identity, download and optional tagging as applicable. Do not introduce uploads, change saving/receipt logic, or alter unrelated dialogs, History previews, screenshots, custom-domain screens or Manage Destinations.

### Acceptance tests

- Fresh/existing Settings: **Enable Expanded Lightbox (Beta)** is **OFF**; no Half Screen or Full Screen controls visible. With beta OFF, image previews match the pre-feature in-Shelf behavior.
- Check beta: **Half Screen** and **Full Screen** appear instantly, are mutually exclusive and keyboard accessible; Half Screen is the default for a first-time opt-in. Uncheck beta: options disappear and original preview mode returns. Re-enable: prior selection is remembered.
- Half Screen preview opens in a window approximately half the monitor width without distortion, obstruction of close/next/previous controls or unexpected overflow; Full Screen uses the display-sized viewer and can exit via Esc/Close. Test compact and expanded Shelf widths.
- Test changing modes, closing/reopening the Shelf, sign-out, expired authorization, repeated previews, rapid previous/next navigation, window close, preview-loading failure, multi-monitor/zoom and MV3 worker restart without leaking resources or creating duplicate windows indefinitely.
- Verify that under a blocked popup/unsupported fullscreen request the viewer remains usable via a truthful fallback. The original image-fetch/security pipeline, all right-click and screenshot saves, and receipts must be unaffected.
- Confirm user-visible behavior in installed Chrome (not just mocked DOM/CSS), and document any Chrome/OS limitations precisely.

**Status:** EXPERIMENTAL / PARKED — **not part of the next Codex implementation request**. Do not implement this feature unless the owner explicitly reactivates it. Documentation only; no application source, permissions or stored settings changed.

---
