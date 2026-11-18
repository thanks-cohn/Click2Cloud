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

## Future — `:nested`, explicit directory paths, and the same syntax in the API and search bar (not V1)

**Ordinary searches are local to the directory currently displayed.** Searching for `report` matches file and immediate child-folder names there only. **`:nested ` is an opt-in recursion modifier**, not a directory name or a command that moves the user somewhere else.

When File Explorer is at `bucket/projects/`:

```text
bucket/
  outside/report.txt                    <- excluded; outside projects/
  projects/                             <- CURRENT LOCATION
    report.txt                          <- matches "report" and ":nested report"
    client-A/
      report.txt                        <- matches ":nested report"
      drafts/report-final.txt           <- matches ":nested report"
    client-B/                           <- sibling of client-A, still inside projects/
      report.txt                        <- matches ":nested report"
```

- **`report`** → direct children of `bucket/projects/` only.
- **`:nested report`** → the **entire subtree** rooted at `bucket/projects/`: files and directories immediately inside it and every descendant, **including sibling child branches** such as `client-A/` and `client-B/`.
- **`:nested`** on its own activates nested scope for the current location; a term may then be typed. Empty-query behavior (e.g., paginated subtree browse versus waiting for a term) should be decided explicitly.
- At the **bucket root**, `:nested report` recursively covers the entire bucket. At a nested folder, it **never goes above that folder or into sibling folders of the current folder**.

### Explicit location syntax — a goal for the future File API **and the GUI search bar**

The File API must accept a caller-supplied, **fully resolved location**—unlike the Explorer GUI, it has no implicit current directory. An intended path expression is:

```text
bucket/directory/child:nested
```

That means: **search recursively within `bucket/directory/child/`**, including that folder's direct contents and all descendants. A search term can follow the scope expression:

```text
bucket/directory/child:nested report
```

This path expression is **not API-only**. The **File Explorer search bar should eventually accept it as well**, so users can target a different authorized directory **without first navigating there**. The GUI can either infer the current directory when omitted or accept a user-specified directory path.

| Search-bar input | Resolved target | Scope |
| --- | --- | --- |
| `report` | Current Explorer directory | Immediate children only |
| `:nested report` | Current Explorer directory | Entire nested subtree |
| `bucket/directory/child:nested report` | Explicit named `bucket/directory/child/` | Entire nested subtree |
| `bucket/directory/child:nested` | Explicit named `bucket/directory/child/` | Nested scope, awaiting/showing results according to empty-query policy |

Later, an explicit target without the `:nested` modifier may use the default **immediate-children-only** scope. That syntax should be specified and tested before implementation.

### File API semantics versus GUI shorthand

Conceptually, the API receives a normalized operation such as:

```ts
searchNames({
  connectionId,
  accountId,
  bucketName: "bucket",
  directory: "directory/child/",
  scope: "nested",
  query: "report"
})
```

The textual expression `bucket/directory/child:nested report` is a **convenient command-language representation** of the same structured API request. The engine resolves and validates the target, scope and query independently. Do not interpret the entire command as a literal filename.

**Implementation design requirements for future syntax:**

- Resolve `bucket/directory/child:nested` against the authorized connection; do not allow the path expression to switch accounts or access unapproved buckets.
- Support unambiguous relative paths where appropriate, but avoid guessing between a partial filename and a path. Establish escaping/quoting rules for filenames that contain spaces or colons.
- Apply `:nested` to **all descendants** of the selected root, not to an arbitrary one-branch walk; return exact paths to distinguish duplicate filenames.
- Route both GUI shorthand and explicit GUI paths through the **same File API**, which owns pagination, recursion, cancellation, completeness, session validation and result identity. No parallel GUI-only search engine.
- Keep result loading bounded, report incomplete pages accurately, and invalidate stale results if the search root, query or authorization changes.

### Separation from V1

**V1 remains deliberately simple:** one supplied directory, direct child filenames/folders only, and a GUI search bar calling that API. Recursive `:nested`, explicit inline directory targeting, and `bucket/directory/child:nested` are **future extensions** and must not delay V1.

## Delivery boundaries

**V1 is only the direct-children search API with a GUI overlay.** Recursive search and `:nested` are roadmap extensions, not prerequisites to ship V1.

This is documentation only. Do not modify Click2Cloud implementation code, cloud deployments, right-click Simple/Narrow/Depth behavior, Explorer CRUD, current saves, or the Aesthetic API for this note.
