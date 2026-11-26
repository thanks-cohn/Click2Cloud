# REDOWN 0.3.32 — New Codex request: visible-field History search and Onyx regression audit

Target branch: `onyx-test-2026-11-25-1951-0.3.32`.
Starting implementation: `8d97e5b86df9184874a69ced4a03668b85bc5d96` (or this request's descendant on the same branch).
This is a new standalone request, not a replacement for the earlier handoff or design references. Keep version 0.3.32 and do not merge to other branches.

## P0 — History search: exactly two visible fields

The owner approved only:
1. The filename displayed on the History card.
2. The website hostname displayed underneath the image on that card.

Search case-insensitively by partial text; normalize whitespace and Unicode consistently. For multiple words, each term must match one of these two visible values. Do not match provider names, bucket names, folders, destination paths/keys, host page titles, full host/source/original/public URLs, URL paths/query strings, IDs, receipt contents, hidden metadata, or image contents. A word may still match if it literally appears in the visible filename or displayed hostname.

Use one pure shared projection for the displayed searchable filename and website label, used by the existing renderer and the store predicate; no divergent hostname fallback or network lookup. Inspect the actual renderer: basic cards currently append the hostname derived from safeHistoryURL(record.hostUrl). If a card has no website label, search only its filename. Do not introduce a new website label on a card type just to make it searchable. Never treat a hidden URL or a destination as a displayed website. Preserve existing filename fallback and rename behavior; placeholder labels such as N/A are not real filename matches.

Current code: src/queue/store.mjs normalizeHistoryQuery/matchesHistory/page; extension/queue-page.mjs mountHistoryV2; extension/history-v2-cards.mjs render. Existing search scans retained receipts, and currently matches many undisplayed fields. Narrow the predicate, do not replace the receipt store or mutate stored history. Preserve pagination, newest-first chronology, active date range, timer policy, cancellation and bounded memory; match across all retained eligible records rather than the current visible page. Count matching records, not occurrences.

## P0 — Actual search results

- On input, invalidate older reads, reset search pagination to page 1, promptly clear or hide stale cards while the new query resolves, and use a concise searching indicator when necessary. A prior search may never overwrite a newer query or clearing.
- Once resolved, render only matching cards using the existing History V2 card components. The visible result count and pagination must describe those exact records. Zero matches means no stale cards remain.
- Automatically open year/month/day groups that contain matches; do not overwrite the user's ordinary calendar expansion preferences. Clearing the input restores ordinary chronological History and its normal disclosure preferences; return to page 1.
- Keep existing card styling, previews, timestamps, URLs, rename, download and GO TO controls. Do not redesign History or invent a separate miniature file-list UI. No search-triggered provider calls or media downloads beyond existing visible-card preview behavior.
- Ensure gallery/inline-rename guards cannot silently leave the latest search unprocessed. Defer safely while those controls are active and replay the latest query when safe; preserve focus and existing edits.
- Keep result count and empty state accessible. Use a truthful placeholder such as "Filename or website".

## Verification

Update contradictory legacy broad-search assertions deliberately rather than merely deleting them. Add deterministic positive/negative tests for filename and visible hostname, case/partial and multi-term matching, hidden URL paths/query tokens, page title, provider, bucket/path, missing or invalid host URL, filename rename, records without a displayed website, old/reconciled records, date range and pagination. Include a record whose hidden metadata matches but whose two visible fields do not. Preserve safe URL handling and receipt integrity.

Add or update a browser fixture using the actual History V2 store and renderer: multiple visible cards, collapsed calendar groups, rapid query changes/clear, zero matches, accurate count/page and no stale cards. Test width 320/380/480/800 where applicable. Exercise both basic and non-basic cards and verify matching follows the displayed website label. Provide reproducible commands and machine-readable test receipts identifying each gate, expected/actual results, PASS/FAIL/NOT_TESTED, and any blockers. Do not claim tests passed unless executed.

## P1 — Audit the existing Onyx prototype, not a new redesign

Read SCREENSHOT-RECONSTRUCTION.md, PROTOTYPE-HANDOFF.md, scope-and-default-theme.md and the reference-set README before making changes. Verify the recent fixes don't collide: three-sided Integrated Edge Action (left side open, separate divider), bare refresh immediately left of it, fixed card geometry during hover and transient activity, reachable recovery/error controls, moon/sun SVG, five finishes, dark native scrollbars, and default Oceania. Check the stationary-cursor success-notice suppression and existing Queue/History behavior remain intact. Run focused checks or prepare reproducible local scripts if the environment cannot launch Chrome; do not spend the whole session on unrelated work. Fix narrowly scoped, proven regressions only if time permits. No Files/Explorer redesign, engine/auth/transfer changes, fabricated quotas, mock data, new default theme or broad refactors. The History search change applies to History regardless of aesthetic; Onyx-specific styling remains scoped.

## Session and delivery

Use the available time efficiently, with a 45-minute session ceiling. Begin preparing the handoff by minute 35 and push the completed, coherent changes and handoff to the target branch by minute 45 (earlier if complete). Prioritize P0 History behavior and regression fixtures; list any incomplete P1 gates explicitly. Deliver changed files, actual verification receipts, exact local test/build commands, known limitations and final commit SHA. Do not overwrite unrelated concurrent changes or force-push.
