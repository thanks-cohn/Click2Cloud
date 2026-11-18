# Click2Cloud Idea: Filename Search — File API First, GUI Overlay

**Date:** 2026-11-18  
**Status:** Feature proposal — not implemented  
**Area:** Click2Cloud File API + File Explorer  
**Design:** A reusable API function is the feature; the search bar is a small GUI overlay calling it.

## V1 — simple, current-directory-only search

The **first implementation (V1)** is intentionally narrow: search for **file and immediate child directory names inside exactly the directory supplied to the API**. No recursive search, no other directories, no bucket-wide walk, no cross-account aggregation.

The GUI supplies the **currently open Explorer directory** as the API scope and displays matching entries in the existing File Explorer list. It is a presentation layer **over the API function**, not a separate search engine in the UI. **The API always receives an explicit named directory/bucket target**; only the GUI can omit that from what the user types because Explorer already knows the location.

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

## Later version — `:nested` shorthand for a directory-aware API (future, **not V1**)

**Why the syntax is short:** In File Explorer, the user is **already inside a specific bucket/directory**. Therefore typing `:nested` should mean **“use my current directory as the root, but include everything nested under it.”** The GUI knows the location and supplies it automatically. The user should **not** need to repeat the directory name in the GUI.

The *underlying File API*, unlike the GUI, cannot assume where the caller is browsing. Its equivalent call must explicitly name the **target directory or bucket** and select a **nested/recursive scope**. Conceptually this is the combination of **`directory: <named target>` + `scope: nested`** (or a compatible `directory:nested` operation exposed by the File API). The exact API naming should follow existing File API conventions, but **an explicit directory target is mandatory for direct programmatic callers**.

### Illustrative future API call (not implemented)

```ts
searchNames({
  connectionId,
  accountId,
  bucketName: 'bucket',
  directory: 'photos/', // explicit named target; '' means bucket root
  scope: 'nested',      // traverse this directory and every descendant
  query: 'cat'
})
```

**Equivalent GUI experience:** When Explorer is already displaying `bucket/photos/`, typing `:nested` activates nested search **rooted at `bucket/photos/`**; then typing `cat` searches filenames/folder names there and below. For example `:nested cat` can match both `bucket/photos/cat.jpg` and `bucket/photos/2025/cat.jpg`, but **not** `bucket/elsewhere/cat.jpg`.

The GUI may parse the single modifier `:nested` first and keep the input in nested mode, so subsequent ordinary text is the name query. The API call receives the fully resolved current directory and explicit nested scope; **the API performs recursion, not the GUI**.

An additional future form may support **choosing a different named directory**, such as `:nested <directory-name>` from the bucket root, and showing/searching its descendants. Because a bare name can look like a filename query, define an unambiguous target-selection mechanism (autocomplete, a distinct directory argument, or another clearly specified syntax) **before implementation**. Never silently guess between “search for this name” and “change the target directory,” or between duplicate directory names.

### Important separation from V1

- **V1 default:** `searchNames({directory: currentDirectory, scope: 'children', query})` — direct child names only; no recursion.
- **Future GUI `:nested`:** `searchNames({directory: currentDirectory, scope: 'nested', query})` — current directory **plus all descendants**.
- **Future direct API caller:** must **name the target directory/bucket explicitly**, irrespective of whether `scope` is `children` or `nested`.
- Recursive search must honor authorization, pagination, cancellation, exact result paths, bounded resource usage, and account/bucket boundaries. Changing Explorer directories invalidates the previous root and pending results.

## Delivery boundaries

**V1 is only the direct-children search API with a GUI overlay.** Recursive search and `:nested` are roadmap extensions, not prerequisites to ship V1.

This is documentation only. Do not modify Click2Cloud implementation code, cloud deployments, right-click Simple/Narrow/Depth behavior, Explorer CRUD, current saves, or the Aesthetic API for this note.
