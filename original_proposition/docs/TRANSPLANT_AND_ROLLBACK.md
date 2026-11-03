# REDOWN integration gate — no premature engine replacement

Click2Cloud is separate from the existing REDOWN repository until it has proven complete behavior.

## Required acceptance gates

1. Snapshot and document current V3 menus and known bugs; distinguish intended requirements from accidental current implementation.
2. Golden compiler fixtures: stable output, idempotency, Simple/Narrow/Depth isolation, 16-level depth, broad trees, repeated labels, forbidden path traversal, missing descendants, and stable save-intent routing.
3. Actual Portal renders the shared spec and saves real user-selected images to connected Cloudflare R2 with verified object receipt. Repeat for Google Drive, Dropbox, OneDrive when supported.
4. Native Chrome integration test: actual right-click, flat provider leaves, nested Cloudflare, browser restart, account changes, configuration save, duplicate prevention, and complete registration failure recovery.
5. Provider-auth tests: logged out, expired tokens, partial uploads, network failure, and verified-success-only counter/animation semantics.
6. Privacy tests: no source page URL, source image URL, link URL or navigation provenance reaches provider API payloads.
7. Migrate old persisted V3 config to the new version with a deterministic schema migration; preserve backup. Rollback must restore prior working registration and user settings.
8. Only after production-representative tests pass and migration is reviewed: integrate behind a reversible feature flag, then remove old engine in a separate audited change.

The desired endpoint is one engine. The migration must not drop users' configured destinations or silently change save locations.
