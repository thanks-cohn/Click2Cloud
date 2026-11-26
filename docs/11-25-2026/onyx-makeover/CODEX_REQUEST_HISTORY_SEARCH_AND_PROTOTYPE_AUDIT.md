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

Read SCREENSHOT-RECONSTRUCTION.md, PROTOTYPE-HANDOFF.md, scope-and-default-theme.md and the reference-set README before making changes. Verify the recent fixes don't collide: three-sided Integrated Edge Action (left side open, separate divider), bare refresh immediately left of it, fixed card geometry during hover and transient activity, reachable recovery/error controls, moon/sun SVG, five finishes, dark native scrollbars, and default Oceania. Check the stationary-cursor success-notice suppression and existing Queue/History behavior remain intact. Run focused checks or prepare reproducible local scripts if the environment cannot launch Chrome; do not spend the whole session on unrelated work. Fix narrowly scoped, proven regressions only if time permits. No Files/Explorer redesign, engine/auth/transfer changes within this audit, fabricated quotas, mock data, new default theme or broad refactors. The separately scoped P1 basic-provider work below explicitly permits the minimal provider changes it requires. The History search change applies to History regardless of aesthetic; Onyx-specific styling remains scoped.

## P1 — Basic-provider default REDOWN folders and screenshot delivery (owner addition, 2026-11-26)

The owner now authorizes these two features on this Onyx branch. This explicitly supersedes earlier deferral of the default basic-provider folder for this request only; automatic download interception/auto-reroute remains deferred. Preserve the P0 History work and existing Onyx behavior. No new branch, unrelated transfer rewrite, or change to the Cloudflare R2 path.

### A. Default folder for ordinary basic-provider saves

For Google Drive, OneDrive and Dropbox, ordinary saves should go into a dedicated lowercase `redown` folder at the currently supported root, rather than directly into that root. Screenshots should default to its child `screenshots` folder.

- Inspect the existing basic adapters and coordinator in `src/basic/providers/index.js`, `src/basic/lib/coordinator.js`, and `src/basic/host.mjs`. Google currently passes `parents: ["root"]`, Dropbox commits to `"/" + filename`, and OneDrive resolves its root before creating the upload session. Respect each provider's actual root and authorization model (including app-scoped roots); do not request wider access without explicit justification and owner approval.
- Resolve or create `redown` during connection or the first authorized save; resolve/create its `screenshots` child when needed. Reuse verified folder identifiers/paths per provider and authenticated account, including after browser restarts. Handle missing, renamed or deleted folders, same-name nonfolders, duplicate names, concurrent creation, expired auth and account switches safely; serialize folder creation and revalidate cached references when stale. Never silently fall back to root or overwrite unrelated objects. Do not move existing files or alter historical receipts.
- Preserve current filename/conflict behavior, verified upload/readback, resumable transport, queue/history receipts, right-click availability, authentication/reconnect and error handling. Store and display the actual confirmed destination, not an assumed path.

### B. Extend screenshot capture to basic providers

- Current screenshot selection and rule validation are Cloudflare-only (`extension/screenshot-page.mjs`, `src/screenshot/rules.mjs`, `extension/screenshot-background.mjs`). Extend the existing screenshot destination model and UI to select connected Google Drive, OneDrive and Dropbox in addition to Cloudflare. The default destination for each selected basic provider is its verified `redown/screenshots/` folder. Do not silently send a screenshot to every connected provider; deliver only to explicitly configured destinations. Preserve website and shortcut rules, additive/multiple destinations, the existing Cloudflare default and compatibility with existing persisted rules.
- Capture once per operation and route the captured bytes through the same production basic-provider adapters and verified delivery path used by ordinary saves. Do not create a second upload engine or persist raw screenshot bytes unnecessarily. Maintain permission checks, cancellation/retry, deduplication, existing concurrency policy, account identity validation and bounded memory. Handle partial multi-provider delivery independently; retry only failed/unconfirmed destinations with reconciliation to avoid duplicates. No success badge/notice for an unverified delivery.
- Show actual provider, folder, filename, verification status and operation/delivery identity in Queue, History and receipts. Preserve preview, download and GO TO where supported; report unavailable provider capabilities truthfully. Make programmatic operations exercise the same production path as the user-facing controls.

### C. Verification and acceptance

Add deterministic fixtures for each provider: initial connection/first save, reuse, concurrent saves, deleted folder, account switch, permission failure and same-name conflict; ordinary file save lands in `redown/`; screenshot lands in `redown/screenshots/`; mixed Cloudflare/basic multi-destination capture, partial failure, retry/reconciliation, rename/conflict behavior and accurate receipts. Assert that unchanged Cloudflare saves, rules, shortcuts and History records still work. Use synthetic fixtures without live credentials and prepare reproducible local scripts for real provider verification. Include expected and observed folder identity/path, remote object identity, byte length and independent readback/hash verification where supported, plus PASS/FAIL/BLOCKED/NOT_TESTED; distinguish mocked from live evidence. Keep the existing 45-minute session ceiling: prioritize P0, implement coherent P1 slices as time allows, and hand off incomplete work explicitly rather than claiming success.

## Session and delivery

Use the available time efficiently, with a 45-minute session ceiling. Begin preparing the handoff by minute 35 and push the completed, coherent changes and handoff to the target branch by minute 45 (earlier if complete). Prioritize P0 History behavior and regression fixtures; list any incomplete P1 gates explicitly. Deliver changed files, actual verification receipts, exact local test/build commands, known limitations and final commit SHA. Do not overwrite unrelated concurrent changes or force-push.
