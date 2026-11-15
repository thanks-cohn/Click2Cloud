# Click2Cloud — Next Codex Request: API-first File Get URL, Cloudflare Domains, Resumable Directory URL Exports

**Status:** REQUEST ONLY. Not evidence of implementation or permission to make real Cloudflare resources public. **Implement this ONLY on Branch 2, created FROM the completed/tested HEAD of Branch 1 (Explorer More fix, History loading reuse, Aesthetic API + High Polish). Branch 2 = Branch 1 plus URL code; it must not be developed in parallel.**
**Requested November 15, 2026.**
**Repository:** `thanks-cohn/Click2Cloud`.
**Code baseline to inspect:** `implement/customer-history-ux-2026-11-15`, latest implementation reviewed at `220e5f4e15baeb52fd600ad08f9078f8598a7a2f`; verify latest branch HEAD and owner working state before implementing. Preserve `checkpoint/click2cloud-working-right-click-pre-history-2026-11-15`.
**Previously documented goal:** `marketing/promoted-features/CREATOR_URL_LIBRARY_BULK_EXPORT_AND_REMOTE_2026-11-14.md`. Also see `marketing/promoted-features/FILE_EXPLORER_GET_URL_AND_SEND_TO_OTHER_CLOUDS_2026-11-15.md` **for URL vision only**.

**IN SCOPE ONLY:** Instant Explorer Get URL for one file; authorized public URL activation on that file's R2 bucket; custom domain setup one at a time or comma-separated; all verified URLs per file; **only specifically selected directory** URL inventories and exports of **immediate children** (not recursive); reusable versioned API used by the GUI and programmatic clients; TXT, JSON, JSONL, CSV, Markdown, HTML and multi-format ZIP as applicable; interruption-safe append/resume with OAuth access-token **expiration time** handling. **NO whole-bucket URL inventory/export**.
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
- **Export URLs…**: offer TXT (default), JSON, JSONL, CSV, Markdown, HTML, and a ZIP containing selected formats, all using ONE canonical enumerator and semantic object records. **TXT** uses UTF-8 with **one real URL per nonblank line**, all active-domain URLs for each immediate file kept **contiguously**, **exactly one blank line between distinct file groups**, no labels/filenames/JSON/Markdown; within each group, URLs in stable endpoint order. Structured formats explicitly preserve object identity and group URLs per file (see section A5). Deduplicate per-object URLs and object keys. Never force the user to guess which links belong to an object in the structured formats.
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
  Export URLs… [TXT / JSON / JSONL / CSV / Markdown / HTML / ZIP]  // immediate children only
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

### A5. Standardized API-first implementation; intuitive CLI, GUI and export formats

**Build the API below the GUI, not the reverse. Codex must document actual method signatures, request/response schemas, security and runnable examples under `docs/api/URL_API_V1.md` on Branch 2, not merely link to this proposal.** The Explorer context menu, domain form, progress view, format selectors and any programmatic adapter must call the **same canonical URL service**. Do not duplicate bucket activation, custom-domain validation, object-to-URL mapping, immediate-child enumeration, export serialization, authorization or resumable job state in UI code. Prefer stable, versioned object-shaped request/response contracts, documented status/error codes, and one source of truth.

Use industry-familiar naming and semantics. Suggested **logical service operations** (Codex may adjust method names to existing conventions, but must document the actual ones):

- \`getBucketPublicUrlStatus({ accountId, bucket })\`: inspect only; no publishing.
- \`activateBucketPublicUrl({ accountId, bucket, confirmPublicBucket: true })\`: idempotent authorized operation; must **not** accept missing/false confirmation or silently enable public exposure. Return verified state and actual endpoint only if available.
- \`addBucketDomains({ accountId, bucket, domains: ["assets.example.com", "cdn.example.org"] })\`: normalize and validate each independently; return per-domain \`active | pending | failed\` and reason; do not treat DNS/TLS pending as activated; don't silently replace existing DNS.
- \`getObjectUrls({ accountId, bucket, key })\`: all actual eligible URLs for that object across available endpoints, with status.
- \`startDirectoryUrlExport({ accountId, bucket, prefix, scope: "immediate", formats: ["txt"], output })\`: create a **durable appendable export job** for one explicitly selected directory (or the **selected bucket root's immediate files**, not the entire bucket). Return job ID, confirmed scope, counts and status.
- \`getExportJob({ jobId })\`, \`resumeExportJob({ jobId })\`, \`cancelExportJob({ jobId })\`, \`downloadExport({ jobId, format })\`: status/progress/restart/download; authorization checked on every permitted operation. A resumed job continues from its checkpoint and does not repeat committed output.

**Illustrative CLI** (only if a real secure, local, authorized CLI adapter is feasible with current architecture; otherwise provide a callable shared module and clearly report the CLI as not implemented, rather than inventing a shell that cannot talk to a Chrome extension):

\`\`\`sh
click2cloud urls status --bucket my-bucket
click2cloud urls activate --bucket my-bucket --confirm-public-bucket
click2cloud urls domains add --bucket my-bucket --domains assets.example.com,cdn.example.org
click2cloud urls get --bucket my-bucket --key photos/image.jpg
click2cloud urls export --bucket my-bucket --prefix photos/ --scope immediate --format txt --output photos-urls.txt --timeout 30m
click2cloud urls export --bucket my-bucket --prefix photos/ --scope immediate --format json --output photos-urls.json
click2cloud urls export --bucket my-bucket --prefix photos/ --scope immediate --format zip --output photos-urls.zip
click2cloud urls jobs status --job-id <id>
click2cloud urls jobs resume --job-id <id> --no-timeout
\`\`\`

CLI flags are **illustrative standard nomenclature**, not automatic permission to publish. A protected local CLI must reuse the current user identity, authorization and public-bucket confirmation model. No unauthenticated internet-exposed control endpoints, secrets in output, embedding tokens in arguments/logs, or bypassing consent. Provide \`--help\`, a succinct README, useful exit codes and per-operation errors. Programmatic clients can supply a validated list of domains; GUI supports one or multiple comma-separated domains in the SAME Add field.

**Deliberately prohibited scope:** there is **NO** \`--scope bucket\`, \`--all-buckets\`, \`--recursive\`, \`--whole-bucket\`, or equivalent for the export feature in this run. **A selected folder prefix lists only its immediately contained files, including root's direct objects when root explicitly selected.** Do not traverse all descendants or scan a whole bucket merely because the requested folder happens to be root. Bucket-public **activation/status** operations remain in scope, distinct from bucket-wide URL listing or exporting.

### A6. Format design — grouped objects, canonical serialization

Expose **TXT (default), JSON, JSONL, CSV, Markdown, HTML, ZIP of selected formats** through the same export-record pipeline. Use reasonable filenames with sanitized bucket/prefix and format extension; deterministic ordering and correct Unicode/UTF-8. Never output URLs that are not real/verified for an eligible endpoint.

Canonical per-object record (illustrative, versioned):
\`\`\`json
{
  "schemaVersion": 1,
  "bucket": "example",
  "key": "photos/image.jpg",
  "filename": "image.jpg",
  "urls": [
    {"domain":"assets.example.com","url":"https://assets.example.com/photos/image.jpg"},
    {"domain":"cdn.example.org","url":"https://cdn.example.org/photos/image.jpg"}
  ]
}
\`\`\`

- **TXT** — each direct child object is a group: 1 URL per nonblank line, ALL active domains grouped contiguously, **one blank line between groups**; no metadata or header. A basic parser splits groups on blank lines; direct URL keys are encoded safely.
- **JSON** — envelope with \`schemaVersion\`, precise bucket/prefix/scope, counts/completion flag, and an \`items[]\` array of per-object records, each containing its own \`urls[]\`. No ambiguous association.
- **JSONL/NDJSON** — one complete per-object JSON record per line, ideal for streaming and incremental processing; no partial JSON records.
- **CSV** — \`bucket,object_key,filename,domain,url\`; one row per object/domain pair, repeat the exact object key for unambiguous grouping; proper RFC 4180 quoting and UTF-8.
- **Markdown** — grouped by object-key heading with URL list under each heading; escaped content to prevent injection.
- **HTML** — standalone safe static index, grouped per object, escaped filenames/URLs; no scripts/remote auto-fetch, unsafe \`javascript:\` URLs, or hidden credentials. Plain file links.
- **ZIP** — package requested exported formats that correspond to the SAME completed checkpoint/snapshot; add a small machine-readable manifest with schema version, bucket/prefix, item counts and completion state. The contents must not silently differ due to a continuing scan. Don't build ZIP by repeating cloud listing seven times.

**Default GUI**: Folder right-click → **Export URLs…** → output format selector (TXT clearly first), current folder path and direct-children scope, optional endpoint filter → Export. A **single-click Download URLs (.txt)** shortcut is fine. Avoid needlessly presenting all options in the context menu. No export of a whole bucket or recursive subdirectories. Format choice belongs to the export dialog and/or CLI \`--format\` flag.

### A6b. Standard timeout and resume conventions — GUI vs API

**Do not impose a 30-minute timeout on the instant Explorer right-click menu or on file URL lookups.** This setting applies ONLY to long-running selected-directory URL export jobs. Right-click and Get URL popup must appear immediately, even if background status checking is slow.

- **GUI export default:** \`timeoutMs: 1_800_000\` = 30 minutes of **active job processing time** per invocation. When reached, **PAUSE** safely (not fail or discard), preserving checkpoint, committed records and export progress, and offer Resume. A resumed GUI run gets its own fresh 30-minute active-time window. Time spent waiting for explicit reauthentication or sitting paused does not count as active processing.
- **Programmatic API default:** \`timeoutMs: null\` = no **application-imposed overall job-duration limit**. This does not override the provider's token expiration TIME, request deadlines, rate limits, revocation, network errors or actual worker/container uptime. Continue from durable checkpoints when authorized; never promise the browser extension runs indefinitely after Chrome shuts down unless a real independent runner exists.
- **CLI convention, if a supported authorized local CLI can actually run:** \`--timeout 30m\`, \`--timeout 2h\`, \`--no-timeout\`, and \`urls jobs resume --job-id ID\`. Accept familiar duration suffixes \`s\`, \`m\`, \`h\`; reject invalid/negative or mutually exclusive timeout flags. Avoid made-up \`--time:30min\` syntax. CLI and JS service call exactly the same underlying operations as the GUI.
- Keep credentials/token handling behind a stable, replaceable authorization provider interface for future user-supplied scoped tokens or delegated sessions **without rewriting URL listing, export or serializers**. Adding a token later is an auth-adapter implementation, not a bypass of security consent or refresh policy.
- Make the run deadline, remaining active duration, paused reason, last checkpoint and Resume button visible in the GUI; document flags and state/error types. Do not store tokens in plaintext jobs, logs or export files.
- Test GUI expiration at 30m using an injected clock, API default unbounded job duration, changing/renewing deadline on resume, revoked/expired token, network 429 and restarts. Distinguish overall processing deadline from single-request timeout and OAuth token expiration timestamp.


### A7. Incremental, appendable, checkpointed export jobs; OAuth expiration **TIME**

Exports for a specific directory should be **append-as-you-go and resumable**. “Appendable” means completed **per-object groups/records** are persisted **atomically** as the cursor progresses and are not discarded whenever another page arrives. Support adding more work to a **job queue** where requested while preserving each job's exact authorization and selection; never append results from a different directory into an existing file without an explicit distinct job/segment identity.

- Durable job fields: version, stable opaque job ID, authenticated account, exact bucket/prefix, explicit \`scope:"immediate"\`, selected domains/formats, request creation time, **provider-issued token expiration timestamp** when known, selected endpoint status, listing cursor/start-after checkpoint, last committed object key, counters, chunk/segment IDs/checksums, last error, and \`running | paused_auth | paused_retry | completed | cancelled\`. Store no reusable secrets in job state or exports.
- Commit **one completed object record/group** at a time into a durable append-only staging log (e.g., versioned IndexedDB store or similarly robust append store). Record the checkpoint only after the corresponding record is durably stored. Use deterministic idempotency identity based on job + object key; resume must not duplicate existing objects/URLs. On crash between record write and cursor write, re-read safely and dedupe. Avoid appending incomplete TXT/CSV/JSON fragments; serialize complete groups/records.
- Use Cloudflare's actual **token expiration TIME/timestamp** and any truthful refresh policy, not a guessed expiration date or fixed session lifetime. Refresh *before expiration* when refresh credentials and provider policy support it; otherwise safely pause job, request reauthorization, and resume at the last durable checkpoint. No bypass of revoked tokens. Distinguish provider timeout, network timeout, rate limit, and OAuth expiry. Retry boundedly with backoff where safe.
- R2 listing cursors may become invalid or stale after long interruptions; retain last committed key and use safe \`start_after\` / equivalent resume strategy, with verified order and deduplication. New or changed objects during a long listing mean perfect point-in-time snapshot consistency may not be available; document semantics and report counts/partial state honestly.
- Visible status: files scanned, objects committed, URLs emitted, pages processed, last durable checkpoint, elapsed time, retry/auth-wait state, and real completion. Provide Cancel, Resume, and Download **confirmed complete output**; explicitly label partial exports if offered.
- Bound RAM, network concurrency, retry frequency, storage quota and exported-file sizes. For large jobs prefer a streaming save/download technique or chunk assembly, not \`array.join\` of every URL in memory.
- One shared canonical record log serves all serializers; formats must remain consistent and deterministic on resume. Ensure ZIP and JSON are valid after interruptions by finalizing from committed records rather than appending raw incomplete syntax.

**Tests mandatory:** interrupt after 0, 1, N object commits and during page transitions; simulate auth expiry a few seconds away, expiry during network request, refresh success/failure, reconnection, rate limit, cursor invalidation, browser restart, repeated Resume, duplicate keys and output staging failure. Cross-check **exact object groups, URL counts and byte-valid TXT/JSON/JSONL/CSV/MD/HTML/ZIP** against independently enumerated DIRECT children. Verify no nested descendants or unrequested bucket-wide enumeration. Tests must distinguish mocked fixtures from installed Chrome and live Cloudflare.


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

1. **Finish and verify Branch 1 first** using the master two-branch request. Then create **Branch 2 directly from Branch 1's final verified HEAD**, carrying its full history and implementation. This document applies exclusively to Branch 2. Record the parent SHA and verify ancestry; no URL work on Branch 1 and no parallel implementation. Do not merge/tag/deploy without explicit owner approval. Write/run focused tests.
2. Verify per-file Get URL with (a) no endpoint, (b) known existing domain, (c) multiple valid endpoints, (d) pending/failed domain, (e) inaccessible object and (f) private bucket. Confirm direct Copy/Open and domain region **always** below the result.
3. Verify exact “Activate public URL for bucket?” Yes/No prompt; No makes no changes; Yes warns about entire bucket and performs only authorized activation. Test single domain and 2–4 comma-separated domains/website URLs with trimming, normalization, duplicates, malformed entries, DNS conflicts, partial success and errors, input-clearing for successful Adds only, new links displayed BELOW input, Save and Exit separately, and persistent all-URL display on future right-clicks.
4. For folder TXT, test **0, 1, 25, 26, 100+, 1000+ immediate file objects**, multiple list pages, nested descendants (excluded), Unicode/special characters, exact prefix, deduplication, deterministic sorted lines, **one URL per nonblank line**, and **exactly one blank line between distinct object groups**. Include two or three authorized domains, objects with varying numbers of valid URLs, duplicate domain configurations, and a folder with no directly contained files but many nested files. Verify group count = number of exported direct objects and nonblank URL line count = sum of unique valid URLs exported for those objects. Test repeated Save/Add another/Save & Exit, no duplicate domain, instant UI open, and the next right-click showing every verified URL without reconfiguration.
5. Test cancellation, revoked permissions, interrupted long listing, browser download confirmation, user-facing progress, bounded memory/concurrency and accurate partial errors.
6. Test all file types, bucket root, nested folder, original existing context actions, native Chrome right-click save independence, History results and cloud verification regression. Keep real installed Windows Chrome vs local fixture claims separate.
7. Deliver a concise before/after report with PASS / FAIL / BLOCKED / NOT TESTED, exact changed files, test command output and honest limitations; note no actual live public-domain activation unless explicitly authorized.

## Exact exclusions

**DO NOT implement Send to Another Cloud or any cross-cloud transfer in this run.** That feature is only a deferred promoted-feature vision. No unrelated marketing release claims or subscriptions.

**User-facing goal:** **Right-click file → Get URL → if bucket private ask “Activate public URL for bucket?” → Yes → show actual public URL → input BELOW it → enter one or comma-separated Cloudflare websites → Add (Cloudflare creates connections) → successful fields clear, their new URLs appear BELOW input → repeat → Save → Exit. Later Get URL shows all active file URLs. Right-click folder → Download URLs (.txt), multiple URLs grouped per immediate file, one URL per nonblank line and one blank separator line between file groups.**
