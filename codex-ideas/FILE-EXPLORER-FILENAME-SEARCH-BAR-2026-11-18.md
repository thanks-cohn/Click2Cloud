# Click2Cloud Idea: File Explorer Filename Search Bar

**Date:** 2026-11-18  
**Status:** Feature request / proposal — not implemented  
**Area:** Click2Cloud → File Explorer  
**Priority:** UX feature; plan and validate before coding

## Request

Add a clear, convenient **filename search bar** to Click2Cloud's File Explorer so users can quickly find files and folders by name instead of manually browsing through long lists of cloud objects.

## Suggested behavior

- Place a visible search input near the File Explorer navigation/toolbar, accessible in **Bit o' Polish**, **Remote V1**, and **Minimal** themes.
- Support typing a partial filename, with case-insensitive matching by default. Include file extensions in the filename match (e.g., `invoice`, `.pdf`, `holiday.png`).
- Display matched files and folders with their **actual names and locations**, distinguishing similarly named results from different folders or buckets.
- Selecting a result should navigate to or reveal the actual item and leave existing file actions (copy, move, rename, delete, save destination) intact.
- Include a one-click clear/reset control and useful empty-results, loading, and search-error feedback.
- Search should not mutate files, folders, destination configuration, or menu settings.

## Scope and scaling requirements

- Start with an intuitive search of the **currently selected bucket**, with clear scope indication. A future option may allow **all authorized buckets/accounts**, but never silently search another account.
- **Do not pretend that filtering the currently visible/paginated rows is a complete bucket search.** Design around R2's object listing/pagination and any applicable provider constraints. Distinguish a fast local filter from a genuine remote filename search if both are offered.
- Keep the interface responsive for large inventories: debounce input, cancel or supersede stale requests, limit result rendering, and paginate/stream results as appropriate.
- Avoid requiring full object-content downloads just to search names; evaluate scalable inventory/index options if exhaustive search across huge buckets is needed.
- Respect account authorization, permissions, session loss, rate limits and privacy. Avoid hidden cross-account aggregation.
- Preserve existing Explorer workflows, the three right-click modes, save correctness, and the Aesthetic API's separation of UI from behavior.

## Acceptance examples

1. Searching `photo` finds `summer-photo.jpg` and `Photo-2026.png` in the selected bucket, including items not on the current visible page if the UI claims full-bucket search.
2. Searching `.pdf` finds PDF filenames, with their folder paths shown.
3. Two `report.txt` results in different folders remain distinguishable and open the correct location.
4. Searching with zero results displays a clear empty state; clearing restores normal browsing.
5. Slow responses, permissions failures, and reconnect do not show stale results or change existing data.
6. A large-bucket fixture verifies paging/cancellation, bounded memory, and honest completeness indicators.

## Implementation note

This is a **feature note**, not authorization to change Click2Cloud code or deploy Cloudflare resources. First decide search scope and technical strategy, then implement and test separately.
