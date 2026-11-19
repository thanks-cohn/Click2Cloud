# P1 — Always-visible daily downloads counter on the Shelf top-right icon

**Requested:** November 19, 2026. **Status:** NEXT CODEX IMPLEMENTATION REQUEST, not shipped.

## Owner-facing behavior

The Click2Cloud extension Shelf must **always show today's completed downloads count on a small icon in the top-right of its header**. The counter must automatically show **0 at the beginning of the next day**—no Settings navigation, manual reset or reopening the Shelf needed. The old day's verified history is preserved.

At the current branch `extension/app.html`, the header has the application nav/More and a far-right Sun/Moon `#theme` button, but no dedicated download-count badge. Add a **separate compact, accessible icon+number next to the existing far-right controls**. Do not replace the theme toggle, hide it in More, hijack the Explorer toolbar or inflate header height. It should remain present in Remotes, Explorer, History and Settings, even at narrow Shelf widths and with Debug OFF. Use compatible styling across all supported themes and day/night modes.

### What to count — exact source of truth

- The badge measures **successfully completed Click2Cloud file downloads/transfers today**, not clicks, pending requests, unverified claims, failed operations, cancelled operations, intercepted unrelated browser downloads, Worker readiness probes or duplicate receipts.
- Count **confirmed remote saves/downloads-to-cloud**, since that is the extension's main action, and **confirmed Click2Cloud-initiated local downloads/exports** when the newly requested Download / Download with Tags / Download with All Metadata / bulk directory export actions are implemented. Provide a compact tooltip/accessible expanded label with a breakdown of `Saved to cloud` vs `Downloaded locally` so the combined count is not misleading. Do not count the same file twice because its save result was reverified or a message redelivered. Local download completion must be observed, not inferred from clicking Download or beginning a stream.
- For a successful bulk export of N distinct files, count **N verified delivered files**, not the mere ZIP creation request and not both its JSON sidecars and the underlying image as separate downloads. If an export is partial, count only confirmed-delivered files with truthful evidence; unknown output completion must not increment verified totals.
- Source remote save data from the **existing durable per-operation receipts/History**, including `src/persistence/current-store.mjs` `recordRemoteResult` / `readRemoteResults`; reuse existing receipt state/proof semantics instead of introducing a second independent counter that can diverge. The current `src/history/model.mjs` already provides timezone and daily range helpers; reuse one shared `dayKey` mechanism. For local exports, add explicit download-completion records into the same canonical operation record system rather than infer from a UI click.

### Day rollover and correctness

- Use the **user-selected History timezone if configured; otherwise the device's current local timezone**, and visibly label the timezone in a tooltip. Define day as local midnight in that timezone, respecting daylight saving and non-24-hour days. Switching timezone should recompute the active day without deleting historic records.
- Recompute on Shelf startup/show, focus/wake, verified completion, and local day rollover while Shelf is open, using bounded timers/alarms where appropriate. Do not rely on a continuously running MV3 service worker or noisy polling. When a next-day rollover occurs, update the display immediately to `0` unless verified events already occurred on the new local day.
- Prefer a small durable day-index derived from final receipts to avoid reading unbounded history on every render; keep it transactional/idempotent and self-reconciling after crash/restart. Rebuild the current day's count from canonical History as needed. Never overwrite/delete prior-day receipts or change a historical timestamp merely to reset the display.
- Present `0` when the daily count is verified empty; when History is temporarily unavailable, distinguish `—` / `count unavailable` from an asserted zero. Use a full accessible label e.g. `12 completed Click2Cloud downloads today; 9 saved to cloud, 3 downloaded to computer. Day uses America/Chicago.` The top-right badge remains legible at 0/9/99/1,000+ without truncating other controls.
- The badge must not trigger Cloudflare requests, OCR, file scans, expensive storage loops or unbounded retention. Clicking it may open the existing History filtered to Today; do not invent a new history database or duplicate receipt authority.

## Tests and delivery

Test 23:59 -> 00:00 rollover with a configured timezone (including DST), multiple open Shelves, off/on Chrome, MV3 worker restart, 1/1,000/100,000 records, duplicate notifications, delayed or uncertain receipts, upload-to-cloud vs local export completion, ZIP partial results, no-op/failed saves, count zero vs unreadable store, screen reader behavior, narrow Shelf widths/themes, and no regression to current right-click saves.

**Implementation scope:** a small view/receipt projection, not a rewrite of History or the verified save engine. No Cloudflare account modification or Worker deployment required for the indicator. Leave completed work and incomplete items explicitly distinguishable; do not count a start as a success.
