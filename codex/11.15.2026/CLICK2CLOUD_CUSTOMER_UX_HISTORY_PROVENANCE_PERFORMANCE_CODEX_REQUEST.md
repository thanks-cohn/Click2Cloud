# Click2Cloud — Customer UX, History, Saved-File Metadata & Right-Click Latency

**Codex work order — request only; not evidence of implementation.**  
**Repository:** `thanks-cohn/Click2Cloud`  
**Owner intent:** Improve the working extension for comfortable everyday use and informal feedback from friends/peers. Preserve the existing reliable save core. Do **not** create a private-beta package, release/tag, publish, deploy, or alter REDOWN.  
**Current source reference to inspect:** `implement/portable-menu-manifest-2026-11-14` (the recent live Simple/Narrow/Depth QA baseline; confirm the actual installed version/commit and latest repository state before choosing an implementation base). Create a separate review branch for implementation; do not force-push or mutate the known-good baseline.  
**This is the authoritative consolidated request** superseding earlier chat-drafted variants, especially their incorrect metadata phrasing and previous first-page-only image-preview default.

## Purpose and hard safety invariants

Click2Cloud's native Chrome Simple, Narrow, Depth, Quick Select, Default and Cloudflare R2 destination-routing behavior is the core worth preserving. Recent owner tests observed 107/107 traceable object keys in the expected R2 buckets, with a separate isolated Depth `CONFLICT` and significant save-time outliers. That is strong **tested-path** evidence, **not** comprehensive production acceptance. Treat unresolved issues honestly; do not change saved destination semantics to make UX work.

- Protect CURRENT state, configuration revisions, destination IDs, visibility, source provenance, login/setup approvals, menu generation/native ACK, OAuth/authorization, one-click right-click saving, R2 conditional create, operation journaling, independent HEAD/size/version verification and honest failure handling.
- No clearing/migrating user data as a quick fix, no unsafe retries of ambiguous writes, no fabricated receipts, no source-URL/token leakage, no mutation of live R2 objects or user's ordinary Chrome profile for developer tests. REDOWN is read-only reference.
- Use canonical APIs and persistent records; no competing History database, duplicate menu owners, or unsupported synthetic UI state. Make changes in small tested commits and include BEFORE/AFTER/NOT TESTED evidence.
- The user explicitly **removed** the former task “Prepare a private beta build.” There is **no** beta packaging, release engineering, publish/deploy, or git tag action in this work order.

## Phase 1 — Quiet customer experience with Debug Mode OFF

**Owner symptom:** After login, first interaction with Depth triggers a burst of technical/debug messages or attention notices; they largely stop after initial attempts. Customer-mode tests should feel silent.

- With **Debug Mode OFF**, suppress routine Depth debug/status statements, verbose notification bursts, preparation chatter and technical success messages that do not require a user decision. Prefer no unsolicited overlays or popups for routine completed saves.
- With **Debug Mode ON**, detailed Depth diagnostics and traces are available, including initialization/recovery/dispatch/receipt stages. Preserve the existing debug preference across restart.
- Do NOT suppress durable operation journal, failed/blocked/uncertain states in History, actionable login/setup failures, or truthful problem indications. Non-debug mode may show minimal actionable feedback only when a user must act; no technical stack/code dumps.
- Investigate the **actual** source of the unwanted visible messages before editing. Source candidates include `src/modes/depth/native-click.mjs` (`createDepthFeedback`), `src/chrome/provider-panel.mjs` (attention/badge), `extension/background.mjs`, `extension/app.mjs` (`depth-click-outcome`, `status`, `quietFeedback`) and shared `uiDebugMode`. Do not simply disable the recorder.
- Acceptance: cold login → first Depth save → subsequent Depth save with Debug OFF; repeat with Debug ON; verify R2 outcome, durable History and no unexpected customer-facing debug chatter. Verify failures still have accessible actionable status and logs.

## Phase 2 — Investigate and improve right-click save time

**Owner report:** REDOWN is remembered as <2 seconds average and around 7 seconds maximum (unverified recollection; benchmark). Current Click2Cloud Flight Recorder analysis measured approximately **5.1 s median**, **38.6 s p95** in a recent run. Diagnose rather than assuming the R2 verification is the cause.

- Instrument **gesture → native dispatch → auth check → Worker readiness → source fetch → destination prepare → remote write → independent verification → durable completion** with low-overhead, privacy-safe stage timings. Separate *time to responsive UI* from *time to confirmed remote save*. Record cold/warm MV3 and OAuth/Worker connection states.
- Compare equal image/bytes, host/source, network, provider, region, desktop conditions and run count against REDOWN source/runtime where available; label any missing side NOT MEASURED. Profile p50, p95, p99, longest observed, failure and user-visible delay by stage and by mode.
- Reuse already-authoritative safe caches/coalescing where justified. Remove redundant sequential readiness/authorization/network work **only** if equivalent authorization is maintained at actual invocation. Preserve real HEAD verification and durable receipts. Do not claim “2 seconds always”; aim to approach REDOWN's experience with honest network bounds.
- Diagnose the historic Depth `CONFLICT` separately as a recorded issue (R2 conditional `If-None-Match: *` can reject occupied/racing keys); do not relabel it as missing folder or blanket-auto-retry. Document cause only if reproduced.
- Deliver before/after traces, source explanation, benchmark conditions and focused regression tests. Lack of real installed Windows Chrome must remain explicitly NOT VERIFIED.

## Phase 3 — Top navigation

Header becomes **Remotes | File Explorer | History | More ▾**.

- **History** is a top-level first-class page, next to File Explorer.
- The **application-header More** dropdown (distinct from History row More and Explorer toolbar More) contains **Settings** first, **Help · Diagnose** second. Remove their previous independent header controls without deleting functionality.
- Keyboard, click, Escape/outside close, focus management and ARIA semantics; preserve routing, theme, login and navigation state.

## Phase 4 — User-facing History page and retention/view behavior

History is a human-readable chronological presentation of the canonical saved operations, including successful, failed and uncertain attempts. History is not an ephemeral recorder Debug-only view.

### Rows

Each history operation occupies **one visually separated row** with a thin divider and, in order or sensible responsive arrangement:
- A small **green** circle for independently **verified** success; **red** for confirmed failed/rejected; **blue** for pending/partial/uncertain or insufficiently verified. Also use accessible textual status, not color alone.
- Actual saved **filename** (or attempted source name if no saved object exists).
- **GO TO** button for a real recorded saved object.
- **Right-aligned timestamp**; local readable presentation, preserve UTC machine timestamp.
- A row **More** expander containing an image preview first (where the entry is an image), then independently expandable **Source & links**, and, **last**, **Metadata**. **Do not show a Technical Details section anywhere in the History page**, including expanded rows. Do not invent a preview if bytes are absent.

**GO TO semantics (ALL FILE TYPES):** Every History entry representing an existing saved object may provide GO TO regardless of file type or extension: image, PDF, document, archive, video, audio, text, binary, or any other supported file. Open **Click2Cloud's own File Explorer**, navigate to the **actual provider/bucket/folder directory** for that record, and visibly **highlight/select that exact saved file** in the listing. GO TO is not an external-browser open, a file download, or a preview action, and must never be gated on being an image. Use recorded provider/account/bucket/exact object key, including collision-renamed keys. Revalidate current authority and object presence; if deleted/inaccessible or a failed attempt has no saved object, show a truthful explanation and optionally offer navigation to the intended directory; never highlight an unrelated same-named object. Image preview rules apply only to image-capable entries and must not restrict History or GO TO for other file types.

### Groups, pagination, views and preview defaults

- Chronological collapsible **Year → Week → Day** group structure. Open the newest relevant group by default; older sections start collapsed. Retain chronology and avoid awkward fragmented groups across pagination.
- **Exactly 25 History entries per page.** Entry 26 goes to the next page; page count is based on **operations**, not group headers. Apply pagination at each supported display range, with correct counts and navigation for 0,1,25,26,100+ entries. Date-group expand/collapse is a UI presentation property, not data loss.
- Settings **History display range**: **All Time (default)**, **Today/Daily**, **This Week/Weekly**. Filtering what is visible never deletes stored older History. Retain all historical records **Forever by default**; no automatic retention/pruning based solely on the display range. Any future destructive retention setting must be separate, explicit and confirmed.
- **Image preview auto-expansion preference (persistent):**
  1. **Expand all images — DEFAULT:** on **every** History page, expand the row/image previews for image entries inside opened date groups. This is *not* first-page-only.
  2. **Only first page:** auto-expand image previews on page 1; pages 2+ start with image previews collapsed.
  3. **Close all:** image previews start collapsed on every page; users manually expand.
- Manual row/previews expand/collapse works in every mode. Lazy-load currently visible/expanded previews with bounded concurrency, limited cache and size-aware thumbnails (avoid fetching 25 originals simultaneously). A collapsed Year/Week/Day group does not trigger image requests for its hidden entries. Preserve user UI responsiveness and accessibility.

### Source & links: displayed beneath the image within row More

- **Host page name/title** (when captured) and hostname/domain (if title not captured, use hostname if available; do not invent title).
- **Host page URL**: link to the webpage from which the user initiated the image save.
- **Original source file/image URL**: independently clickable; distinct from the host page URL.
- **Cloudflare public object URL(s)**: show all **known and verified/appropriately classified** publicly addressable URLs if they exist (authorized custom domain, enabled public `r2.dev`, etc.). Do not assume private R2 keys are public; do not invent domains, publish objects or activate public access. Clarify historical vs current link availability.
- Show destination bucket, exact stored prefix/key in suitable row details; keep URLs safe, no token-bearing query URLs exposed. When not captured historically, label fields unavailable instead of guessing from referrers.

### No Technical Details in History

Do **not** render a Technical Details section, diagnostic-code dump, operation trace, worker stage list, ETag/version report, or receipt/proof detail panel anywhere on the customer-facing History page. Keep required backend operation/verification evidence intact and available through the existing Debug Mode, Help · Diagnose, and support/recorder facilities. The visible History row may still show a concise human-readable success/failure/uncertainty status, filename, date, GO TO and ordinary source/destination information. Do not treat mere successful UI appearance as independently verified.

## Phase 5 — Metadata = the metadata *the saved file actually gets*

**Owner correction (supersedes all prior drafts):** Do **not** present an arbitrary compilation of “all Cloudflare metadata,” Explorer metadata, inferred photo EXIF, recorder event metadata, or diagnostic properties in this section. The owner means **the per-file metadata that the save operation attaches to the image/file itself**, exactly as written to that saved R2 object.

- Under each History entry's row **More**, the **last expandable subsection is “Metadata.”**
- Ground it in the saved file's **actual persisted upload metadata payload**. Inspect `right2cloud-module/src/cloudflare-r2-writer.mjs` and `right2cloud-module/src/provenance.mjs` to preserve what is truly written, not arbitrary imagined fields. In the inspected baseline `storage.put` provides `httpMetadata: {contentType}` and `customMetadata: {operationId, click2cloud: <serialized save provenance>}` when provenance exists; some fields may be absent. Display the as-written metadata field names/values and parsed `click2cloud` provenance faithfully, without inventing values or calling other event attributes “file metadata.”
- **Do not expose independent R2 ETags, object versions, remote verification timing, recorder events or other technical diagnostics as a separate History section.** Retain them internally for truthful verification and under existing debug/diagnostic tools, without injecting them into History's Metadata section. A field that really belongs to the file's persisted upload-metadata payload can remain in Metadata.
- For historical accuracy, prefer a saved-object metadata snapshot captured/verified at write time; if reading current object metadata later, identify it as **current remote metadata** and do not silently rewrite historical metadata. For missing/unreachable objects, show only safely retained historical metadata and label gaps.
- This **same per-file saved metadata** must be included in the structured History export, preserving field names, types and nested structure (JSON/JSONL; CSV JSON-encoded metadata column). A failure with no uploaded file must have no fabricated saved-file metadata.
- Privacy: prevent credential, secret or sensitive query leakage in rendered links/export. Do not change what current verified saves write merely to populate History; first inspect/carry existing provenance accurately.

## Phase 6 — Structured History export in Settings

Add **Settings → History → Export History**. User chooses:

- **All Time / Since the beginning — default:** from earliest retained event through latest;
- **Weekly:** current calendar week in user's selected/display timezone;
- **Daily:** current calendar day in that timezone;
- **Custom Date Range:** user-selected inclusive start and end dates, validate start ≤ end.

These are **export ranges**, independent of History's onscreen display filters and pagination. Export every matching event across all pages, not only the visible 25 rows. Preserve operation order and timestamps in UTC ISO 8601, and record boundary timezone/selection in export metadata.

Export formats: **JSON** (preferred full-fidelity structured export), **CSV** (flat commonly used fields + JSON-encoded nested fields), and **JSONL** (large/streamed records). Include, when actually captured:
- Saved/attempted filename and original filename, host page title/name, hostname;
- Save timestamp, host page URL, original source URL, and any known Cloudflare public object URL(s) with availability/type;
- Provider, account reference as safely appropriate, bucket, prefix, exact object key; status, save mode (Simple/Narrow/Depth/Quick/Default when known), operation ID, proof kind, error when applicable;
- **Exactly the metadata attached to the saved file** per Phase 5—not a guessed R2/EXIF/debug mashup;
- **No `technicalDetails` section or diagnostic dump in ordinary customer-facing History exports.** Retain internal receipts, operation traces and debugging data through existing diagnostic/recorder facilities. The requested saved-file metadata is exported separately as `savedFileMetadata`.

Use a versioned export schema with null and availability explanations for unknown historical values, safe URL handling, and optional review/privacy mode when exporting potentially sensitive browsing provenance. Do not delete history or change remote objects. Bound memory and avoid a slow whole-list UI freeze.

## Phase 7 — Fully condensed File Explorer command toolbar

When `#toolbar-splitter` is dragged to **minimum / one row**, show **only** these five controls in this exact order:

`Back | Forward | Up | Refresh | More ▾`

All other commands, including location/address, View options, `+ Right Click`, etc., remain usable inside **Explorer toolbar More**. Disabled Back/Forward/Up remain visible. Restore fuller toolbar layout when expanded. Keep one canonical persisted `product.explorerLayout.toolbarRows`; keyboard access, focus, responsive width and ARIA. Do not mix it up with header More, History-row More, or the separate load-more pagination action.

Reuse already-open requirement `Issues_and_Bugs/Bugs/P1_EXPLORER_CONDENSED_TOOLBAR_NAVIGATION_ONLY_2026-11-09.md` rather than introducing conflicting layout rules.

## End-to-end acceptance / reporting

- Test quiet Debug OFF vs verbose Debug ON across cold login, first Depth click and subsequent clicks. Keep failure evidence reachable; never lie about outcome.
- Test actual combined native Simple+Narrow+Depth (+ Quick/Default as configured) menus and correct root/ancestor/leaf routing after changes; compare with recent known-good tested paths. Do not silently delete a user's configuration.
- Verify 25-item History boundaries, grouping across page boundaries, all three image auto-expansion preferences on **every page**, and lazy preview behavior under high history volume, deleted objects and offline/auth transitions.
- Test real GO TO opening Click2Cloud File Explorer at the proper directory and **selecting/highlighting the exact saved file of ANY type**, including image, PDF, document, text, archive and generic binary; verify same-named keys across buckets, collision-renamed keys, deleted/inaccessible objects and failed operations with no saved object. GO TO must not require an image preview.
- Test clickable host page and source URL separation, title/hostname fallback, never invented public R2 URL; safe and accessible external links.
- Compare the **file's as-written R2 metadata** with the exact History Metadata subsection and JSON/JSONL/CSV export on verified objects, including absent/legacy metadata cases. Assert that **no Technical Details section appears anywhere on the History page**, with Debug Mode ON or OFF; detailed debugging belongs in existing diagnostic facilities.
- Export 0/1/25/26/100+ and larger historical records across All Time, Weekly, Daily, Custom range; verify no pagination truncation, inclusive date boundaries, timezone correctness, CSV quoting and JSONL streaming; no destructive retention.
- Benchmark latency before and after using identical conditions, with p50/p95/p99 and honest missed gates.
- Build and run focused/full suites as available, test in a disposable Chrome profile if possible. Real installed Chrome and live R2 tests must be labeled independently from fixtures. No external publishing, packaging, tag creation or deployment.

## Explicitly out of scope / deferred issues

- Beta build packaging or deployment, release/tag creation.
- Replacing/rearchitecting the underlying Cloudflare save engine, disabling verification/authorization, modifying REDOWN.
- Blanket automated retries of remote `CONFLICT` without proof; isolate and document if discovered.
- Automatically making private R2 objects public to populate a URL field.
- Retrospective invention of missing page titles, source URLs, image metadata, historical receipts or proof.

## Required deliverable

A review-branch implementation with coherent commits, updated canonical docs/tests, screenshots/short videos or DOM evidence of the UI, machine-readable verified results, exact performance findings and a concise **PASS / FAIL / BLOCKED / NOT TESTED** table. If one issue requires owner Windows evidence, continue independent implementation rather than stopping at a plan. Do not merge, deploy, modify production Cloudflare data or create tags without separate owner approval.
