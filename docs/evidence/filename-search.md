# File Explorer filename search

The V3+1.1 `searchDirectoryNames` inspection takes `{source, query, pageToken?, pageSize?, refresh?}`. Supply the canonical Cloudflare provider, connection, account, bucket, and exact directory prefix in `source`. Use `''` for the bucket root. The default page size is 100 and the accepted range is 1–200. Submit an empty query to reset the search. To revalidate the directory, start the query with `refresh:true` and omit its continuation.

Successful responses include immediate-child `entries`, `nextPageToken`, directory-wide `complete`, `source` (`cloud`, `cache`, or `offline`), `asOf` in milliseconds, `stale`, and `refreshing`. A continuation may return more matches, continue the directory scan, or resume a bounded cloud fallback. Keep supplying the same source and query. Expired or superseded continuations require a fresh submission. `complete` describes the directory scan and can be true while more matches remain. Zero matches with `complete:false` leaves the absence of a match unconfirmed. `asOf` identifies when the scan began. Provider pagination can observe a directory as it changes.

Names match by substring after Unicode NFC normalization, locale-independent lowercasing, and folding Greek final sigma to sigma. The original case-sensitive keys and file or folder types stay intact. The established R2 listing adapter supplies folder markers and inferred common prefixes. Search reads no file contents and issues only delimiter-aware listings of the requested directory. V1 has no recursive or inline path command.

## Ownership and failure behavior

- The Shelf sends a request on Enter and renders File API results in its existing virtual gallery. Explorer More holds Search at small widths and Go to path at every width. Clear and Explorer navigation discard obsolete responses.
- A single background `createListingReader` shares raw provider pages between ordinary Explorer listings and search. It retains up to 64 pages for ten seconds and coalesces up to three concurrent provider reads. The Shelf uses the same reader's cancellation and coalescing without maintaining a second freshness cache.
- The derived `click2cloud-filename-inventory` database opens on demand. Its version 1 stores `directories` and `entries` separately from CURRENT and recovery. A scope binds provider, connection, account, bucket, parent prefix, and a hash of the current session and granted scopes. Raw credentials, full file contents, and user configuration stay outside the inventory.
- Each manifest holds a working generation with a provider cursor and lease, and its previous published snapshot when available. A single transaction commits the directory page, ordinal rows and checkpoint. Only the last provider page can publish a complete generation. A reclaimed lease gets a new fence, and an interrupted worker can resume at the last committed cursor. Cache reads use only compact compound keys for substring scans and materialize metadata only for matches.
- A complete generation expires 60 seconds after validation. A scan processes up to 32 provider pages or 20 seconds per request, retains up to 100,000 entries per directory, and uses approximate global budgets of 256 scopes, 250,000 rows and 64 MiB. Budgets evict the oldest refreshed inactive inventories. Cloud continuations allow searches beyond cache capacity. Temporary fallback cursors expire after 60 seconds and are lost on service-worker restart.
- File actions invalidate relevant directories before dispatch and again after the provider settles. The fence covers both move parents, affected subtrees and ancestors that may gain or lose inferred folders. Pending, failed and uncertain writes leave the affected inventory stale. Verified remote saves use the same invalidator and retain their existing independent receipts. Sign-out purges the account cache, and a changed grant cannot use the previous authority's inventory.
- Failed cache transactions are retried or bypassed with bounded provider reads. Ordinary listing requires no IndexedDB search transaction. A write waits at most 250 milliseconds per cache invalidation attempt. If cache storage stalls during a write and the worker exits before its invalidation commits, the freshness TTL and manual refresh bound exposure to the last observation. A valid local connection can see last-known results during a provider outage, with partial and age indicators. Access denial and authorization changes are surfaced without falling back to stored names.
- Shelf cancellation discards obsolete replies from already-sent Chrome messages. Direct File API callers can abort provider paging using an AbortSignal. Each already-dispatched Shelf request has a bounded scan and its results are fenced against authorization, page expiry and mutations.

## Reproduction

```sh
npm test
node tests/filename-inventory-store-browser.mjs
node scripts/test-filename-search-browser.mjs
node scripts/benchmark-filename-search.mjs
npm run build:extension
```

The Chromium runs exercise the production Shelf and IndexedDB with synthetic Cloudflare listing responses and fixture messaging. The benchmark reports local process measurements for its generated inventories. It does not measure an authorized Cloudflare account, or an installed native context menu.
