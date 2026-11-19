# P1 — Debug-only Downloads entry inside the Shelf's existing More menu

**Requested:** November 19, 2026. **Status:** NEW next-Codex UX implementation request; not shipped.

## Exact owner UX

- Add a single **Downloads** menu item to the **existing Shelf header More (⋯) menu**, **visible ONLY while Debug Mode is ON**. Do not add this item anywhere else, and do not replace the current History entry or ordinary right-click save History.
- Clicking **More → Downloads** opens a read-only **Downloads** view containing **ONE CARD PER MAJOR DOWNLOAD**, with a clearly labeled **expandable/collapsible details section on each card** (native `details/summary` or equivalent accessible disclosure). Include every bulk directory ZIP download (plain Download, Download with Tags, Download with All Metadata) and other already-trackable major downloads. The **collapsed card ALWAYS shows the directory name**, source bucket/prefix as needed to disambiguate, the **actual download/job timestamp**, selected download mode, short status and concise count/size summary. Expanding reveals safe job/operation ID, file count, actual byte progress, start and completion timestamps where known, error details, progress milestones and the receipt FILENAME as a reference only (NOT receipt data). Default to collapsed; allow multiple cards to expand independently. Newest job first. No extra authorization/download prompt.
- Each card shows its **directory name and timestamp prominently**, plus the actual state **Queued / Running / Completed / Partial / Failed / Cancelled / Unknown**. Expanding shows the additional safe basic information. A ZIP finalization is not proof of completed browser download; show a clear error when known. Refresh should use known job/browser events, never an expensive R2 rescan. These cards are **status summaries, NOT full receipts**.
- **Hiding Debug Mode immediately removes the Downloads menu entry and closes its panel** if open. No Debug-only control should remain reachable or visible in ordinary Settings/Explorer. Honor the same existing Debug Mode gating as the current **Help · Diagnose** menu item. No extra popup on each download; ordinary downloads proceed exactly as before.

## Critical separation: receipts exist ONLY within the downloaded archive

- Each major bulk ZIP contains exactly one full machine-readable receipt named according to **`RRReceipt-<time-stamp>-<job-number>.json`**, stored **only INSIDE the successfully finalized ZIP**. Here `<job-number>` is the user's intended per-job number (the owner's `jon-number` typo), and `<time-stamp>` is the job's UTC creation timestamp in a portable filename-safe format, including milliseconds. Both components are stable for that job and unique across different jobs; never regenerate on retries. The **expanded Downloads card may display the filename as a reference**, but must not store or show receipt contents. **Never** write or render a second complete receipt in Downloads, History, Save Results, local storage or a new file; **never** offer another receipt download from the Debug Downloads screen. The Debug view shows **lightweight job progress/status summaries only**, not complete receipts, inventories, file mappings or retained sensitive metadata.
- **History stays EXACTLY AS IT IS**, for existing right-click save events only. Do not alter any History read/write path, schema, filtering, retention, UI, or links to add bulk downloads. Debug Downloads is **not History** and must never be labeled as such.
- Reuse the **existing V3+1.1 canonical API/File API**, job status and Chrome download completion events when feasible. A small read-only download-job status projection for the Debug view is acceptable if necessary; avoid a second execution/receipt API, new job ledger, unbounded permanent records, or a Worker redesign. Keep only bounded recent operational status summaries where needed to survive UI reopening. No copied payloads, signed URLs, credentials or full JSON receipts. Respect app Debug OFF by default and require no new provider scopes.
- Do not infer `Completed` merely from starting a download or finalizing a ZIP; use observed Chrome completion when available. No fabricated on-disk verification.
- The browser extension action-icon daily badge remains on the **Chrome toolbar icon, not the Shelf**. This Debug Downloads panel must not introduce a Shelf badge or confuse the count with History.

## Focused acceptance

1. Debug OFF → More has no Downloads item; no new History rows.
2. Debug ON → More has one Downloads item; opens one **individually expandable card per major job**, with the **directory name and timestamp visible before expansion**, and status/details inside; two jobs can expand independently.
3. Turn Debug OFF while Downloads is open → close panel and hide item immediately.
4. One successfully finalized bulk ZIP contains exactly one appropriately named `RRReceipt-<time-stamp>-<job-number>.json`; the Debug Downloads card may show the name but contains no copy or content; History remains behaviorally unchanged.
5. Operation status derived from observed job/download events without duplicate entries on repeated updates; no provider rescan on panel refresh.

**Boundaries:** No Cloudflare Worker architecture overhaul, new approval prompts or speculative functionality; preserve existing saves and main Shelf More menu.
