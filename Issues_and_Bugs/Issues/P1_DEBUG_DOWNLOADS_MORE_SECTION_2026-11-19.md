# P1 — Debug-only Downloads entry inside the Shelf's existing More menu

**Requested:** November 19, 2026. **Status:** NEW next-Codex UX implementation request; not shipped.

## Exact owner UX

- Add a single **Downloads** menu item to the **existing Shelf header More (⋯) menu**, **visible ONLY while Debug Mode is ON**. Do not add this item anywhere else, and do not replace the current History entry or ordinary right-click save History.
- Clicking **More → Downloads** opens a compact, read-only **Downloads** view/panel listing **each major Click2Cloud-initiated download/export operation**: in particular every bulk directory ZIP download (plain Download, Download with Tags, Download with All Metadata), and any other long-running/large file download already represented as a major operation. This is not a new download action or authorization dialog.
- Each entry shows its job/operation ID (safe compact display), source bucket/prefix or selected file name if safe to show locally, selected download mode, start time, file count and byte progress when known, and the actual state **Queued / Running / Completed / Partial / Failed / Cancelled / Unknown**. Show a clear error reason when available and preserve statuses honestly (a generated ZIP is not necessarily a completed browser download). Display newest first and make Refresh possible without provider rescans.
- **Hiding Debug Mode immediately removes the Downloads menu entry and closes its panel** if open. No Debug-only control should remain reachable or visible in ordinary Settings/Explorer. Honor the same existing Debug Mode gating as the current **Help · Diagnose** menu item. No extra popup on each download; ordinary downloads proceed exactly as before.

## Critical separation: receipts exist ONLY within the downloaded archive

- The one full machine-readable bulk receipt is **`redown-remote-receipt.json`**, stored **only INSIDE a successfully finalized downloaded ZIP**. **Never** write or render a second complete receipt in Downloads, History, Save Results, local storage or a new file; **never** offer another receipt download from the Debug Downloads screen. The Debug view shows **lightweight job progress/status summaries only**, not complete receipts, inventories, file mappings or retained sensitive metadata.
- **History stays EXACTLY AS IT IS**, for existing right-click save events only. Do not alter any History read/write path, schema, filtering, retention, UI, or links to add bulk downloads. Debug Downloads is **not History** and must never be labeled as such.
- Reuse the **existing V3+1.1 canonical API/File API**, job status and Chrome download completion events when feasible. A small read-only download-job status projection for the Debug view is acceptable if necessary; avoid a second execution/receipt API, new job ledger, unbounded permanent records, or a Worker redesign. Keep only bounded recent operational status summaries where needed to survive UI reopening. No copied payloads, signed URLs, credentials or full JSON receipts. Respect app Debug OFF by default and require no new provider scopes.
- Do not infer `Completed` merely from starting a download or finalizing a ZIP; use observed Chrome completion when available. No fabricated on-disk verification.
- The browser extension action-icon daily badge remains on the **Chrome toolbar icon, not the Shelf**. This Debug Downloads panel must not introduce a Shelf badge or confuse the count with History.

## Focused acceptance

1. Debug OFF → More has no Downloads item; no new History rows.
2. Debug ON → More has one Downloads item; opens a concise list for two major bulk jobs with distinguishable in-progress/completed/failed states.
3. Turn Debug OFF while Downloads is open → close panel and hide item immediately.
4. One successfully finalized bulk ZIP contains exactly one `redown-remote-receipt.json`; the Debug Downloads view contains no copy; History remains byte-for-byte behaviorally unchanged.
5. Operation status derived from observed job/download events without duplicate entries on repeated updates; no provider rescan on panel refresh.

**Boundaries:** No Cloudflare Worker architecture overhaul, new approval prompts or speculative functionality; preserve existing saves and main Shelf More menu.
