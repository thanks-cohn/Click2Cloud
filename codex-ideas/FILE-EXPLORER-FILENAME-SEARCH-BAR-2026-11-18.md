# Click2Cloud Idea: Filename Search — File API First, GUI Overlay

**Date:** 2026-11-18  
**Status:** Feature proposal — not implemented  
**Area:** Click2Cloud File API + File Explorer  
**Design:** A reusable API function is the feature; the search bar is a small GUI overlay calling it.

## V1 — simple, current-directory-only search

The **first implementation (V1)** is intentionally narrow: search for **file and immediate child directory names inside exactly the directory supplied to the API**. No recursive search, no other directories, no bucket-wide walk, no cross-account aggregation.

The GUI supplies the **currently open Explorer directory** as the API scope and displays matching entries in the existing File Explorer list. It is a presentation layer **over the API function**, not a separate search engine in the UI.

- At bucket root (`bucket/`), search only files and folder names immediately inside that root.
- At `bucket/photos/`, search only files and immediate child folders in `photos/`, **not** `photos/2025/`.
- At `bucket/photos/2025/`, search only direct children of that specific location.
- A folder can appear as a result even if R2 represents it only as a common prefix rather than an explicit folder-marker object.
- Match partial names, case-insensitively by default, including file extensions.
- Support pagination/continuations for large directories, distinguish complete from incomplete search results, and return exact identifiers suitable for existing Explorer actions.
- Search is read-only and must obey authorization, current connection, bucket and prefix boundaries.
- The GUI must invalidate results on directory change, support clear/reset, and show concise empty/loading/error feedback.
- Keep the GUI available in Bit o' Polish, Remote V1 and Minimal; do not tie search behavior to a theme.

### Illustrative V1 API (not implemented)

Adapt the current Click2Cloud File API convention rather than introducing a competing API:

```ts
searchDirectoryNames({
  connectionId,
  accountId,
  bucketName,
  directoryPrefix, // '' = current bucket root, else the exact current folder
  query,           // partial file or immediate child directory name
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

**V1 implementation rule:** Only enumerate and match **one directory level** (e.g., delimiter-aware listing). Do **not** download file contents or scan all descendants to answer a V1 search. The GUI is just a small input/results overlay on that underlying API.

### V1 acceptance examples

1. From `bucket/`, query `photo` finds `bucket/photo.jpg` and `bucket/photographs/`, but **not** `bucket/archive/photo.jpg`.
2. From `bucket/archive/`, query `photo` can find `bucket/archive/photo.jpg`, but not `bucket/photo.jpg`.
3. A directory with thousands of direct children is searched correctly across pages, without claiming that a partially scanned page is complete.
4. Changing the currently viewed directory changes the API's directory context; old results never leak into the new view.
5. The same File API operation can be called without the Explorer UI; the GUI does no independent searching.

## Later version — optional `:nested` query mode (future, **not V1**)

Preserve an API-first design that can eventually support **opt-in recursive searching**. The GUI may later recognize a `:nested` modifier and translate it into a richer search API request. **Do not implement or automatically enable recursive search in V1.**

Two desired future patterns:

- **`:nested`**, followed by an ordinary search term: search the **currently open directory and all descendants**, including matching filenames/folder names nested below. Example: `:nested photo` from `bucket/` can find `bucket/photo.jpg` and `bucket/archive/photo.jpg`.
- **`:nested <directory-name>`** while browsing the bucket root: resolve the **named directory below the current context** and produce/search results from **that directory's nested contents**, rather than globally searching unrelated directories. The future command grammar should distinguish a directory selection from a search term unambiguously (e.g. explicit directory argument or autocomplete); ambiguous duplicate directory names must not silently select one.

The longer-term **API capability** should conceptually support a caller-specified directory/bucket target, plus an explicit `recursive` option or equivalent. The search bar translates `:nested` syntax into API parameters; the recursion belongs in the underlying API/provider implementation, **never in an ad hoc UI-only traversal**.

Future nested search must handle scope-specific permissions, pagination, cancellation, bounded resource usage, and exact result paths. An explicit bucket target must remain within connected authorized resources, with no silent account switch.

## Delivery boundaries

**V1 is only the direct-children search API with a GUI overlay.** Recursive search and `:nested` are roadmap extensions, not prerequisites to ship V1.

This is documentation only. Do not modify Click2Cloud implementation code, cloud deployments, right-click Simple/Narrow/Depth behavior, Explorer CRUD, current saves, or the Aesthetic API for this note.
