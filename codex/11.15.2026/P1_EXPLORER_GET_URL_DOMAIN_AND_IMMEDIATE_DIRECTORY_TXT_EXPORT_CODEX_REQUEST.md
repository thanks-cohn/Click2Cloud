# Click2Cloud — Next Codex Request: File Explorer Get URL, Cloudflare Domain Setup and Immediate Directory TXT URL Export

**Status:** REQUEST ONLY. Not evidence of implementation or permission to make real Cloudflare resources public.
**Requested November 15, 2026.**
**Repository:** `thanks-cohn/Click2Cloud`.
**Code baseline to inspect:** `implement/customer-history-ux-2026-11-15`, latest implementation reviewed at `220e5f4e15baeb52fd600ad08f9078f8598a7a2f`; verify latest branch HEAD and owner working state before implementing. Preserve `checkpoint/click2cloud-working-right-click-pre-history-2026-11-15`.
**Previously documented goal:** `marketing/promoted-features/CREATOR_URL_LIBRARY_BULK_EXPORT_AND_REMOTE_2026-11-14.md`. Also see `marketing/promoted-features/FILE_EXPLORER_GET_URL_AND_SEND_TO_OTHER_CLOUDS_2026-11-15.md` **for URL vision only**.

**IN SCOPE ONLY:** User-facing Get URL for saved objects; explicit opt-in setup of supported Cloudflare R2 public endpoint/custom domain; show all actually available public URLs for a file or the files immediately inside a selected directory; direct-child TXT download, one URL per line.
**EXPLICITLY OUT OF SCOPE:** `Send to another cloud`, cross-cloud transfers/copies, remote provider adapters, Move, paid billing/gates, live public deployment or changing permissions on the owner's buckets without fresh explicit approval. Do not modify any unrelated project.

## A. Precise customer experience

### A1. Right-click a *file* inside Click2Cloud File Explorer

The context menu includes **Get URL**.

- On click, inspect the selected actual provider/account/bucket/exact R2 object key and active, verified public endpoints for **that bucket**. URLs are derived from real configured endpoints and exact encoded keys, not from guesswork or filenames alone.
- **If one or more available public URLs exist:** open a small modal/popover with a readable list of **all known URL options** for this file (e.g., custom domains and an enabled development endpoint if appropriate), each labeled by domain, verification/availability status, clickable Open and Copy controls. Prefer actually reachable public links; do not present pending/unknown as verified.
- **If none exist:** show **No public URL available** and a clear action **Make Public URL…**. Do not silently publish anything. Do not invent a public R2 URL.
- **Below that list, ALWAYS show a persistent custom-domain region, even if a link already exists**:
  - Label: **Connect your website domain**
  - Input placeholder: `assets.example.com`
  - Italic help: *Have a domain managed through Cloudflare? Connect a suitable domain or subdomain to this R2 bucket so its files can have URLs under your own domain.*
  - **OK / Save** control to submit a user-approved eligible domain setup, or save/select an already-configured eligible domain, as appropriate.
  - Once configuration reaches confirmed active/reachable state, **refresh the URL list** in the same view; make pending DNS/TLS and permissions states visible, with manual Refresh and accurate errors. Never claim it is active merely because Save returned.
- On a currently-private bucket, Make Public URL opens a scope/permission confirmation that explicitly says the normal public R2 custom-domain path affects **the entire bucket's public object access**, not just this file. A user merely opening Get URL, typing a domain, or using Copy does NOT authorize creating/changing any public access until they review and explicitly approve.
- Input is for a domain/subdomain that the user controls and that satisfies Cloudflare R2 custom-domain prerequisites (account zone / DNS / privileges). **Do not accept an arbitrary website URL as if it were an active R2 endpoint;** do not replace the site's existing DNS route without warning. Prefer built-in, scoped provider APIs and display truthful status. If only one-file sharing is possible through a different safe mechanism, identify it as a separate sharing mode, not the equivalent of linking a standard public bucket domain.
- Existing public domains should be reusable: connecting one domain for a bucket makes correctly authorized URLs available for multiple eligible objects in the bucket without per-file publication or creating one DNS record per file.
- Support filenames of **all file types** (images, PDFs, ZIPs, videos, text, etc.) and nontrivial keys (Unicode, spaces, reserved characters, same filename under different prefixes).

### A2. Right-click a *directory / folder* in Click2Cloud File Explorer

Offer:
- **Get URLs…**: inspect **all files immediately inside that exact folder/prefix**. Show available URLs per actual file, including multiple legitimate public endpoints where configured; show which domain is selected for copying/export.
- **Download URLs (.txt)**: create and download a UTF-8 **.txt** file with **one actual public URL per line**, no CSV headers, JSON wrappers, Markdown, labels, or other text. Default to **one URL per direct file** using a user-selected active public domain/endpoint; if supporting all endpoints, make that an explicit mode and clearly explain that it may produce multiple lines for one file.
- **Immediate-directory semantics are mandatory:** include keys `prefix + immediateFilename` only; **do not include descendants** in `prefix/nestedFolder/file.ext`. The bucket root is a valid directory whose immediate objects can be exported. Folder placeholders/marker objects and internal `.click2cloud-*` housekeeping objects are not eligible as user files unless the user explicitly requests and has authority; do not confuse folder prefix with a real object URL.
- If zero eligible files, explain `No directly contained files with available public URLs` instead of downloading a misleading success file. Files without valid public URLs should be counted as unavailable/skipped with reason; never fake URLs. Provide a bounded summary of `scanned / exported / skipped / errors` and optionally a separate explicit diagnostic report, but the **.txt remains URLs only**.
- Even when there are hundreds/thousands of directly contained files, **do not truncate to the File Explorer's visible page or 25-item History pagination**. Fetch all relevant Cloudflare R2 list pages using scoped read-only APIs/cursors, stream/generate bounded-size chunks, show progress and allow cancellation, and initiate a real user-approved download. Because this may take time, progress must be truthful; declare completion only when the browser confirms that output was handed to the supported download/save flow. On disconnect/revoked auth/partial failures, show partial outcome and allow safe resume or an explicit partial export instead of mislabeling it as complete.
- Keep file ordering deterministic (e.g. normalized key lexicographic), deduplicate cursor/page repeats and output URLs for the **exact** chosen bucket + folder + domain.

### A3. Suggested layout (textual intent, not required pixels)

```text
[File Explorer context menu]           [Get URL popup]
  Open                                 example-photo.jpg
  Preview                              Available public URLs
  Get URL...                              https://assets.example.com/photos/example-photo.jpg  [Copy] [Open]
  Download                               https://... (other valid bucket domain)    [Copy] [Open]
  ...                                  ------------------------------------------------
                                       Connect your website domain
                                       [ assets.example.com                      ]
                                       Have a domain managed through Cloudflare? Connect
                                       a suitable domain or subdomain to this bucket
                                       so its files can have URLs under your own domain.
                                       [OK / Save] [Refresh]
```

```text
[Directory context menu]
  Open
  Get URLs...
  Download URLs (.txt)
  ...
```

If no URL exists, show `No public URL available` and `Make Public URL…`, with explicit public-bucket scope before any authorized configuration.

## B. Important technical and security boundaries

- Use the existing **Click2Cloud Explorer context-menu descriptor / authority pattern**, not a parallel unchecked action list. The current baseline uses `extension/app.mjs` `contextFor()` and `src/api/explorer-context-menu.mjs` for canonical context-menu descriptors; integrate both UI and authorized API operation. Preserve existing `Open/Preview/Download/Copy/Move/Rename/Delete/Properties` and normal native Chrome right-click menus (Simple/Narrow/Depth/Quick/Default).
- Public-domain configuration must use actual provider-native APIs with appropriately scoped user Cloudflare authorization, validated zone ownership, correct R2 bucket linkage and DNS/TLS/availability checks. No forged URLs or unsupported CNAME pointing to `r2.dev`. Reuse existing Cloudflare connection flows and avoid unnecessary reconnects.
- Cloudflare documentation: `https://developers.cloudflare.com/r2/buckets/public-buckets/` states buckets are private by default, standard public custom-domain and `r2.dev` enable public access to bucket contents, `r2.dev` is rate-limited for development, and domain activation can be asynchronous. No automatic public access changes from Get URL or TXT export.
- Do not silently modify the owner's QA buckets, any public domain/DNS, Worker or authorization. Run negative/default-private tests first with fixtures/sandbox. Live public exposure changes require **fresh explicit owner authorization and a specific scope preview**.
- Do not leak signed credentials, OAuth tokens, private paths/URLs to unrelated recipients, recorder output, logs or ordinary exports. A copied public URL should be shown with its explicit public status and user action.
- No remote writes from TXT export; it is a read-only inventory/download operation. Do not create fake folder markers or change object keys.
- “Get URL” must not be confused with a restricted private pre-signed link, a File Explorer download URL, a bucket listing URL, or a webpage URL. Distinguish those visibly.
- Restore/keep original extension behavior: no changes to native right-click-to-R2 save pipeline, conditional PUT, independent verification, saved-file metadata snapshots, new History / GO TO for all file types, 25-entry history pagination, or existing settings.

## C. Test / delivery requirements for the next Codex run

1. Create a **separate implementation branch** from the latest reviewed customer-history branch; record precise base commit. Do not merge/tag/deploy without explicit owner approval. Write/run focused tests.
2. Verify per-file Get URL with (a) no endpoint, (b) known existing domain, (c) multiple valid endpoints, (d) pending/failed domain, (e) inaccessible object and (f) private bucket. Confirm direct Copy/Open and domain region **always** below the result.
3. Verify explicit public-bucket consent is mandatory; canceling setup leaves remote configuration unchanged. Validate domain ownership, account, API permission, status and url-encoding. Verify no unauthorized `r2.dev` enablement.
4. For folder TXT, test **0, 1, 25, 26, 100+, 1000+ immediate file objects**, multiple list pages, nested descendants (excluded), Unicode/special characters, exact prefix, deduplication, deterministic sorted lines, and 1 URL/line. Test a folder with **no directly contained files** but many nested files yields zero. Verify total lines against independently listed direct children, and ensure one chosen domain gives one link per direct file.
5. Test cancellation, revoked permissions, interrupted long listing, browser download confirmation, user-facing progress, bounded memory/concurrency and accurate partial errors.
6. Test all file types, bucket root, nested folder, original existing context actions, native Chrome right-click save independence, History results and cloud verification regression. Keep real installed Windows Chrome vs local fixture claims separate.
7. Deliver a concise before/after report with PASS / FAIL / BLOCKED / NOT TESTED, exact changed files, test command output and honest limitations; note no actual live public-domain activation unless explicitly authorized.

## Exact exclusions

**DO NOT implement Send to Another Cloud or any cross-cloud transfer in this run.** That feature is only a deferred promoted-feature vision. No unrelated marketing release claims or subscriptions.

**User-facing goal:** **Right-click a file → Get URL → set up a verified Cloudflare domain if needed → Save → refreshed links. Right-click its directory → Download URLs (.txt), one link per immediate file, even for a long directory listing.**
