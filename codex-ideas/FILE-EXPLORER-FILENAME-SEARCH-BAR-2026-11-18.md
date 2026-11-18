# Click2Cloud Idea: Current-Directory Filename Search API + GUI

**Date:** 2026-11-18  
**Status:** Feature request / proposal — not implemented  
**Area:** Click2Cloud File API and File Explorer  
**Design principle:** **API-first feature; the GUI search bar is one client of the API.**  
**Scope:** Exactly the directory currently open, **non-recursive**.

## The requested behavior

Add a **filename search API operation** that takes an authorized account, bucket, current directory prefix, and search string and finds **files and immediate child directories directly inside that directory**. Expose that operation through a simple search bar in Click2Cloud's File Explorer.

**No bucket-wide search, no all-account search, no recursive search of descendants.** The search scope is the folder the Explorer is currently displaying.

Examples:

- **Explorer at bucket root** (`bucket/`): search only filenames and folder names **directly in the root**. A matching file several folders deep must **not** appear.
- **Explorer at `bucket/photos/`**: search only the files and child folders immediately inside `photos/`. Do not search within `photos/2025/` or another nested directory.
- **Explorer at `bucket/photos/2025/`**: now search only the direct children of `photos/2025/`.
- **Changing directories** changes the scope to that new directory. Clear or recompute stale results; never show matches from a previous directory.

Treat the R2 bucket root as a directory with an empty prefix. R2's flat object-key structure must be projected into *direct child files* and *immediate child folder prefixes* correctly. Folder names should be searchable even when their existence is inferred from descendant objects rather than an explicit marker.

## API contract (illustrative, not an existing implementation)

Provide this as a reusable **File API capability** instead of implementing filename filtering only inside UI code. Discover the existing Click2Cloud File API convention and extend it rather than inventing a parallel API. One possible conceptual signature:

```ts
searchDirectoryNames({
  providerConnectionId,
  accountId,
  bucketName,
  prefix,              // exact currently open directory; '' means bucket root
  query,               // partial filename or immediate child folder name
  pageToken,
  pageSize
}) -> {
  entries: Array<{
    name: string,
    type: 'file' | 'directory',
    keyOrPrefix: string,
    parentPrefix: string
  }>,
  nextPageToken?: string,
  complete: boolean
}
```

This signature is illustrative only; align field names and identity types with the current API. Requirements:

- Authorized, account/bucket-specific and **prefix-bound** requests; do not expose unauthenticated or cross-account listing.
- Scope to the **single level** under `prefix`, never recursively descend when searching; use R2 delimiter/prefix listing semantics (or equivalent adapter behavior).
- Search by child **name**, case-insensitive substring matching by default, including filename extensions.
- Files and immediate child directories both qualify. Their identities must be exact and usable by existing File Explorer operations.
- Paginate reliably until the requested search scope is covered. If only a partial page of results is available, expose this accurately; never claim a complete search from a currently loaded subset.
- Preserve predictable sorting, continuation/cancellation, bounded memory, auth/session error reporting, and consistent behavior across providers where feasible.
- Avoid downloading file contents merely to match names; this is **name-only metadata/listing search**.
- Avoid unnecessary backend/index/deployment complexity for a one-directory search. Measure large-directory behavior and only propose an index if provider APIs prove insufficient.

## File Explorer GUI

- Add a compact **Search this folder** field in the File Explorer toolbar, present in Bit o' Polish, Remote V1, and Minimal themes.
- Pass the *currently open* directory context to the File API; do not silently expand scope to the whole bucket.
- Display matching **direct child files and folders** in the existing Explorer list, preserving their usual clickable/actions behavior.
- Clear the search with one action to return to the regular directory listing.
- Show concise empty, loading, error, and incomplete/paginated-result states.
- Keep focus and current context stable where possible. On navigation, invalidate old search results rather than carrying them into a different folder.
- Do not modify save destinations, contents, menu modes, or account configuration.

## Acceptance examples

1. At `bucket/`, searching `photo` matches `bucket/photo.jpg` and the directory `bucket/photographs/`, **but not** `bucket/archives/photo.jpg`.
2. At `bucket/archives/`, searching `photo` matches `bucket/archives/photo.jpg`, **but not** `bucket/photo.jpg`.
3. At `bucket/`, searching `2025` may match the immediate directory `bucket/2025/` even when it has no explicit folder marker, but must not surface files inside it as independent matches.
4. At `bucket/docs/`, `.pdf` matches direct child PDF names but does not traverse `bucket/docs/older/`.
5. With enough entries to require multiple listing pages, the API does not silently omit legitimate direct-child matches or mislabel incomplete results as exhaustive.
6. Directory navigation, authorization failure, cancellation, and reconnect never show stale results from another prefix.
7. API-level tests validate scope and identity independently; GUI tests verify the toolbar uses the API and preserves existing actions.

## Implementation constraints

This is a **feature idea**, not an instruction to implement or deploy now. Keep the API reusable for future Click2Cloud clients or a universal File API, and keep the search bar as its presentation layer. Preserve Simple, Narrow, Depth, File Explorer CRUD, verified saves, and the Aesthetic API's UI/engine separation. 
