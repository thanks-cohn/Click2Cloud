# Click2Cloud — Next Codex Request: File Explorer Get URL, Cloudflare Domain Setup and Immediate Directory TXT URL Export

**Status:** REQUEST ONLY. Not evidence of implementation or permission to make real Cloudflare resources public.
**Requested November 15, 2026.**
**Repository:** `thanks-cohn/Click2Cloud`.
**Code baseline to inspect:** `implement/customer-history-ux-2026-11-15`, latest implementation reviewed at `220e5f4e15baeb52fd600ad08f9078f8598a7a2f`; verify latest branch HEAD and owner working state before implementing. Preserve `checkpoint/click2cloud-working-right-click-pre-history-2026-11-15`.
**Previously documented goal:** `marketing/promoted-features/CREATOR_URL_LIBRARY_BULK_EXPORT_AND_REMOTE_2026-11-14.md`. Also see `marketing/promoted-features/FILE_EXPLORER_GET_URL_AND_SEND_TO_OTHER_CLOUDS_2026-11-15.md` **for URL vision only**.

**IN SCOPE ONLY:** User-facing Get URL for saved objects; explicit opt-in setup of supported Cloudflare R2 public endpoint/custom domain; show all actually available public URLs for a file or the files immediately inside a selected directory; direct-child TXT download, one URL per line.
**EXPLICITLY OUT OF SCOPE:** `Send to another cloud`, cross-cloud transfers/copies, remote provider adapters, Move, paid billing/gates, live public deployment or changing permissions on the owner's buckets without fresh explicit approval. Do not modify any unrelated project.

## A. Precise customer experience

### A1. Exact owner-corrected flow: right-click a *file* inside Click2Cloud File Explorer

**RIGHT-CLICK MUST BE INSTANT AND SIMPLE.** The menu includes **Get URL**, opens promptly without blocking on network, then refreshes the endpoint information asynchronously. This is the Explorer's own file menu, not Chrome's web-page right-click menu.

1. **If the R2 bucket has no enabled public endpoint**, the first dialog asks exactly: **“Activate public URL for bucket?”** with **Yes** / **No**. Explain plainly before Yes that ordinary R2 public URL activation makes bucket contents publicly addressable, **not just the selected file**. No means no change. Yes explicitly authorizes that specific bucket-public activation, performed through actual permitted Cloudflare APIs. Any newly enabled `r2.dev` link is for **development/testing only**, rate-limited, not recommended for production.
2. **After Yes, show the generated public URL** for that selected exact file at the TOP of the next view, with Copy/Open. Do so only after Cloudflare reports a valid activated endpoint; otherwise show truthful pending/error state and Refresh, without claiming a URL already works.
3. **Immediately BENEATH the public URL**, show the input labeled **Add Cloudflare-linked websites** (example `assets.example.com`) with short *italic help* explaining that supported domains/subdomains on Cloudflare can be linked to this R2 bucket.
4. The user may enter **one domain/website URL at a time**, or **multiple domains/website URLs separated by commas** (their choice). Examples: `assets.example.com` or `https://assets.example.com, cdn.example.org`. Normalize safe URL input to the domain/hostname, trim whitespace, deduplicate, validate zone/account ownership and DNS conflicts; do not interpret arbitrary website paths, queries or unrelated URLs as valid bucket endpoints.
5. An **Add** button performs the real authorized Cloudflare custom-domain operation for **each valid input**, separately showing success, pending or error. The UI must not treat mere local text entry as an actual public-domain connection. If one entry fails, do not lose successful others.
6. **Immediately after each successful Add**, clear **only successfully processed** entries from the input and show **new URL(s) under the input** (with Copy/Open and actual active/pending state). For a comma-separated batch, process entries individually and leave failed/unprocessed names editable for retry. If DNS/TLS activation is still pending, show Pending rather than claiming a verified live URL. Repeatedly adding one or several websites should be easy without leaving this panel.
7. Finally, the user clicks **Save**, then **Exit**. Save persists the reconciled, confirmed bucket/domain configuration in Click2Cloud; Exit closes the panel. The **Add** operations were already sent to Cloudflare and must not be deferred until this final Save. Reopening Get URL shows **ALL active URLs for that exact file** (bucket endpoint plus every active connected custom domain), with Copy/Open and the domain input beneath for further additions.
8. **If the bucket already has a public URL**, skip the activation question. Show its existing public URL(s) immediately and retain the same field and Add, Save, Exit controls underneath.

Cloudflare domains are **bucket-level configuration** shared by all objects, not separate DNS entries per file. All URL output must use verified endpoint/base and actual object key with correct encoding, including image and non-image types, spaces, Unicode, and reserved characters. Public links should never be fabricated from filenames. If a public endpoint is protected by Access, blocked, pending, or private, label it truthfully and don't expose it as confirmed usable. A private-object sharing mode would require separate design and is not silently provided by bucket activation.

**Security:** Displaying the dialog, pressing No, requesting metadata, viewing History, listing/exporting URLs and entering text never changes bucket privacy. Yes is a deliberate scope-aware consent to public bucket activation; each Add must be an authorized, appropriately scoped Cloudflare domain/DNS operation with explicit conflict review. No real owner bucket should be modified in Codex tests without fresh, specific owner authorization.
### A2. Right-click a *directory / folder* in Click2Cloud File Explorer

Offer:
- **Get URLs…**: inspect **all files immediately inside that exact folder/prefix**. Show available URLs **grouped under each actual file**, including **all valid URLs across multiple authorized bucket domains** (not merely the first domain). Sorting must be stable: actual file key first, then configured/normalized domain order. Give Copy/Open where useful.
- **Download URLs (.txt)**: create and download a UTF-8 **.txt** file with **one actual public URL per nonblank line**; include **ALL verified available domain URLs for each immediate file by default**. **Group all URLs for the same object contiguously, and put exactly one blank line between object groups** for straightforward subsequent parsing. No filenames, headings, CSV/JSON/Markdown or other metadata in this TXT. Every nonblank line is a URL; every blank-line-delimited group belongs to one object. Stable object-key order and stable configured-domain order, with deduplication per group. A single-domain filter can be an additional choice but must NOT silently replace the multi-domain grouping default. For programs requiring explicit object-key associations, a separately labeled structured manifest may be added later; do not alter the requested TXT format.
- **Immediate-directory semantics are mandatory:** include keys `prefix + immediateFilename` only; **do not include descendants** in `prefix/nestedFolder/file.ext`. The bucket root is a valid directory whose immediate objects can be exported. Folder placeholders/marker objects and internal `.click2cloud-*` housekeeping objects are not eligible as user files unless the user explicitly requests and has authority; do not confuse folder prefix with a real object URL.
- If zero eligible files, explain `No directly contained files with available public URLs` instead of downloading a misleading success file. Files without valid public URLs should be counted as unavailable/skipped with reason; never fake URLs. Provide a bounded summary of `scanned / exported / skipped / errors` and optionally a separate explicit diagnostic report, but the **.txt remains URLs only**.
- Even when there are hundreds/thousands of directly contained files, **do not truncate to the File Explorer's visible page or 25-item History pagination**. Fetch all relevant Cloudflare R2 list pages using scoped read-only APIs/cursors, stream/generate bounded-size chunks, show progress and allow cancellation, and initiate a real user-approved download. Because this may take time, progress must be truthful; declare completion only when the browser confirms that output was handed to the supported download/save flow. On disconnect/revoked auth/partial failures, show partial outcome and allow safe resume or an explicit partial export instead of mislabeling it as complete.
- Keep file ordering deterministic (e.g. normalized key lexicographic), deduplicate cursor/page repeats and output URLs for the **exact** chosen bucket + folder across all authorized **active** domains. Group by exact object key; empty-line separators distinguish groups even when objects have different numbers of active URLs.

### A3. Required interaction and visual order

```text
Right-click file > Get URL

IF bucket has no active public URL:
  Activate public URL for bucket?
  [Yes] [No / Cancel]
  (Yes explicitly authorizes public BUCKET access after scope warning)

AFTER Yes and confirmed Cloudflare activation:
  Public URL:
  https://<active-public-endpoint>/<encoded-file-key>   [Copy] [Open]

  Add Cloudflare-linked websites:
  [assets.example.com, cdn.example.org                ] [Add]
  Have a domain on Cloudflare? Connect it to this bucket to give
  its files additional public URLs.

  Added URLs — SHOWN BELOW INPUT:
  https://assets.example.com/<encoded-file-key>    [Copy] [Open]
  https://cdn.example.org/<encoded-file-key>       [Copy] [Open]
  Pending domain: waiting for DNS/TLS                [Refresh]

  [Save]  [Exit]

Subsequent Get URL right-click:
  all genuinely active URLs for this specific object are shown.

Right-click directory:
  Get URLs...
  Download URLs (.txt)  // immediate children only, grouped by object
```

**Input:** one website or comma-separated websites, selected by user; Add processes each. Clear successes; retain failures. New URLs are listed below the input. Save and then Exit are separate final actions.
### A4. Example TXT grouping — one URL per line, multiple lines per object

```text
https://assets.example.com/photos/first.jpg
https://cdn.example.org/photos/first.jpg

https://assets.example.com/photos/second.jpg
https://cdn.example.org/photos/second.jpg
```

**Parsing rule:** Split the text into groups on blank lines; each group is one source object, with one actual public URL per nonblank line. If an object has only one confirmed URL, its group contains one line. Blank separators are structural, not URL lines. This keeps the file plain text, visually readable and unambiguous for a simple group parser; URLs encode the actual object keys.

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
3. Verify exact “Activate public URL for bucket?” Yes/No prompt; No makes no changes; Yes warns about entire bucket and performs only authorized activation. Test single domain and 2–4 comma-separated domains/website URLs with trimming, normalization, duplicates, malformed entries, DNS conflicts, partial success and errors, input-clearing for successful Adds only, new links displayed BELOW input, Save and Exit separately, and persistent all-URL display on future right-clicks.
4. For folder TXT, test **0, 1, 25, 26, 100+, 1000+ immediate file objects**, multiple list pages, nested descendants (excluded), Unicode/special characters, exact prefix, deduplication, deterministic sorted lines, **one URL per nonblank line**, and **exactly one blank line between distinct object groups**. Include two or three authorized domains, objects with varying numbers of valid URLs, duplicate domain configurations, and a folder with no directly contained files but many nested files. Verify group count = number of exported direct objects and nonblank URL line count = sum of unique valid URLs exported for those objects. Test repeated Save/Add another/Save & Exit, no duplicate domain, instant UI open, and the next right-click showing every verified URL without reconfiguration.
5. Test cancellation, revoked permissions, interrupted long listing, browser download confirmation, user-facing progress, bounded memory/concurrency and accurate partial errors.
6. Test all file types, bucket root, nested folder, original existing context actions, native Chrome right-click save independence, History results and cloud verification regression. Keep real installed Windows Chrome vs local fixture claims separate.
7. Deliver a concise before/after report with PASS / FAIL / BLOCKED / NOT TESTED, exact changed files, test command output and honest limitations; note no actual live public-domain activation unless explicitly authorized.

## Exact exclusions

**DO NOT implement Send to Another Cloud or any cross-cloud transfer in this run.** That feature is only a deferred promoted-feature vision. No unrelated marketing release claims or subscriptions.

**User-facing goal:** **Right-click file → Get URL → if bucket private ask “Activate public URL for bucket?” → Yes → show actual public URL → input BELOW it → enter one or comma-separated Cloudflare websites → Add (Cloudflare creates connections) → successful fields clear, their new URLs appear BELOW input → repeat → Save → Exit. Later Get URL shows all active file URLs. Right-click folder → Download URLs (.txt), multiple URLs grouped per immediate file, one URL per nonblank line and one blank separator line between file groups.**
