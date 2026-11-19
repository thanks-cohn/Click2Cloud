# P1 — Get URL directory: simple one-URL-per-file TXT and production-domain preference

**Owner clarification, November 19, 2026.** **Status: NEW UI/format delta, not implemented in 0.3.20.** Attach to the [code-audited, deduplicated next-run plan](NEXT_RUN_DEDUPLICATED_CODE_AUDIT_AND_RULES_2026-11-19.md). Do not reimplement the existing directory inventory engine or existing grouped TXT/CSV/JSON exporters.

## Product intent

A creator right-clicks an authorized Cloudflare R2 **directory** → **Get URL** → chooses:

- **☐ Simple Text File — one URL per line** (clear label such as **"Simple Text File, One of Each Per Line?"**; offer as an additional export choice, not a replacement for existing grouped TXT).
- **Exactly ONE file-type scope selection** for this simple TXT, as a **radio group or equivalent mutually exclusive control** (NOT independent checkboxes):
  - **Only image files** — recognized image files only, e.g. PNG, JPG/JPEG, GIF, WebP, AVIF, SVG, BMP, TIFF and ICO.
  - **Only media files** — **images + video + audio** (including MP4, WebM, MOV where supported, MP3, WAV, OGG, etc.). Do not conflate media with images only. Recognize MIME types and safe common extensions, including unusual/case-varied names where metadata is reliable.
  - **All files** — every eligible actual object in the chosen directory scope, not merely media: images, video, audio, HTML, CSS, JS, fonts, PDFs, archives, documents, binaries, extensionless files, etc.
  - **Default is All files** so the export does not silently omit non-media files. Switching scope changes the file selection before URL generation, but never changes the source bucket/folder or custom-domain preference.
- **☐ Use non-developmental URLs where possible** (available for the simple export). Prefer the user's *verified active linked custom domains* such as `assets.example.com` over public development endpoints such as `*.r2.dev`, and only consider any endpoint the existing trusted API actually verifies for this exact bucket.
- **Export** downloads `directory-urls-simple.txt` ready to paste directly into an HTML/CSS/site asset list or other tool.

Example (illustrative URLs; actual URLs must be computed from verified mappings and each exact object key):

```text
https://assets.example.com/photos/hero.png
https://assets.example.com/photos/logo.svg
https://assets.example.com/photos/background.webp
```

**Important:** This mode means **one selected URL for each real eligible object**, NOT one URL for each of several domains attached to the same object. Avoid duplicate lines and duplicated objects. This is a distinct plain-text format: **no JSON header, `FILE` / `END FILE` wrappers, quotes, filename labels, comments, receipt paths, statuses, HTML or other metadata** in the downloaded TXT. Plain UTF-8 text with one complete URL per line and conventional newline separators.

## When only developmental public URLs exist — inline Add Domain flow

For **directory Get URL**, if the bucket has **no verified linked custom website/domain** but **does have a verified enabled developmental endpoint**, reveal this friendly inline prompt without leaving the directory export:

```text
Only developmental URLs exist. Add domain?
Website/domain: [ your-domain.com                 ]
[Save]
```

- The domain field accepts the desired custom website. **Enter** submits the typed domain for validation and linking/verification (the same action as its submit control), **without closing the popup**, losing the directory selection, or resetting **Only image files / Only media files / All files**.
- The user then clicks **Save** to confirm the domain choice once it is genuinely associated with the exact Cloudflare account/bucket. As soon as Cloudflare reports the custom domain active/verified, **automatically refresh the same directory export** so the checked "Use non-developmental URLs where possible" prioritizes that website for each matching file. No second right-click, re-selection or retyping.
- **Truthfulness:** Existing 0.3.20 code only proves it can read/verify active custom domains; it does **not** prove it can create a custom-domain association in Cloudflare. If registering a domain is not supported by the current integration, Enter/Save must **not claim the website is linked**. Show the missing Cloudflare setup action, preserve typed input + file-type selection + selected directory, and offer **Recheck** then Save when the association is active. Explicit authorization is required for any action that exposes bucket contents publicly.
- If there is **no verified public endpoint of either type**, show **"No public URLs available for this bucket. Add domain?"**, NOT the false statement that developmental URLs exist. Use the same setup/verification safeguards.
- **User-requested fast path: simply UNCHECK "Use non-developmental URLs where possible" to use developmental URLs.** If only real, active, verified developmental endpoints exist, unchecking this checkbox immediately enables the normal **Export** action to produce the simple TXT with one developmental URL per selected file. No need to link a custom website, type a domain, press Save, or leave/reopen the dialog. No extra "Use developmental URLs" confirmation/button is required. The inline **"Only developmental URLs exist. Add domain?"** field may stay visible as optional guidance but must never block export while the preference is unchecked. Explicitly label the output as using developmental URLs in the UI (not inside the TXT). Keep the chosen file-type scope and directory unchanged.
- If the checkbox is **checked** and only developmental endpoints exist, surface the **"Only developmental URLs exist. Add domain?"** prompt and the clear alternative **"Uncheck 'Use non-developmental URLs where possible' to export developmental URLs now."** Do not make connecting a website compulsory or silently label developmental links production-ready. Never fabricate a public link.
- Keep file-level Get URL's separate **input → Submit → Copy All** and clickable URL cards unchanged; existing structured grouped TXT/CSV/JSON exports must continue working.

## Simple Text File scope — three mutually exclusive choices

```text
File types (choose one):
( ) Only image files
( ) Only media files (images, video and audio)
(●) All files

[✓] Use non-developmental URLs where possible
```

The image and media scope must be determined using grounded object metadata (MIME when trustworthy, extension where appropriate), with a documented predictable fallback when metadata is missing. Images are a subset of media; media is a subset of all files. Each selected file contributes **at most one verified URL line**. Do not include directory marker objects, unrelated bucket contents, or fake URLs. Provide outside-the-TXT counts for scanned files, filtered files, files without public URLs, custom-domain URLs, developmental fallbacks and incomplete inventories. The plain TXT itself contains only raw URLs, one per line, without headers or metadata.

## Selection/verification behavior

1. **Exact chosen scope:** Reuse the existing `listExportInventory` paging for the chosen authorized directory prefix. Include nested descendant files according to the current directory-export scope; clearly label scope, file count and whether recursion is enabled, rather than inventing folder URLs. Only genuine object files with safely encodable object keys qualify. Existing `eligiblePublicObject` filename-extension allowlist filters out many valid file extensions; **for the new simple export use the chosen exclusive scope (Only image files, Only media files including video/audio, or All files), without restricting All files to the existing media/PDF extension allowlist**. Do not include folder markers or paths outside the chosen account/bucket/prefix.
2. **Custom-domain preference checked:** For each file choose **one** active, trusted, account/bucket-matched non-development/public custom-domain URL when available; if several are valid, choose a stable deterministic domain order (or an explicitly selected preferred domain). Don't randomly change domains between exports. Verify exact key URL encoding including nested directories, Unicode and spaces.
3. **Fallback:** If no verified custom domain exists for that object but an enabled verified public developmental endpoint exists, use that endpoint as fallback and **show that a developmental URL was used**, outside the TXT. If no valid public endpoint exists, **do not fabricate one** or emit an empty placeholder line; report the missing object(s) in UI and in existing structured export format if selected. The custom-domain preference never silently authorizes public bucket access.
4. **Unchecked preference:** If **only developmental URLs exist and are provider-confirmed active**, choosing OFF expressly authorizes their use in the immediate simple TXT export. Export one deterministic full developmental URL per eligible file with no extra domain-setup step. If a verified linked custom endpoint is also available, the OFF mode can follow the API's normal deterministic verified-endpoint selection; never invent an endpoint. An unchecked preference is **not** a command to enable a private bucket's public development endpoint.
5. **Export completion truthfulness:** Show counts **scanned, eligible objects, URLs exported, omitted/no-public-URL, custom-domain vs developmental fallback**, and `complete`/partial in the UI. If the directory inventory is incomplete, do not present a TXT as an exhaustive website-ready list: block until full enumeration, or require an explicit, clearly labeled **Export partial list** action. Avoid quietly omitting files. Any separately requested structured JSON/CSV/TXT still reports file identity and completeness, preserving its existing contract.
6. **Reachability honesty:** A verified Cloudflare domain mapping is not automatically proof an anonymous browser GET of each object succeeds; if reachability is untested show it as **not checked**, and never call a generated TXT "production-verified" without real checks. A "non-developmental domain" preference means **custom-domain first**, not proof of deployment readiness.
7. **Preserve privacy/security:** Do not expose a private bucket to make exports succeed, and do not include secrets, signed URLs, unrelated bucket objects, or guessed origins. Respect the existing experiment flag and first-time **Allow Public URL? Yes / No** gate.
8. **No competing API/export/diagnostics machinery:** Extend `extension/explorer-exports.mjs` `directoryUrls()` and `src/explorer/object-exports.mjs` formatters using the existing `getPublicUrls`, `objectUrls`, `verifiedDomains`, `listExportInventory` and File API plumbing. Add small pure formatting/selection helpers and focused tests. Preserve the existing grouped TXT output unchanged for anyone who wants file identity and all domain mappings; do not replace or relabel it as the simple text format.

## Current implementation evidence (GitHub main, 0.3.20)

- `extension/explorer-exports.mjs` `directoryUrls()` presently offers only `csv`, `txt`, `json` checkboxes and calls `formatUrlExport(...,format)`.
- `src/explorer/object-exports.mjs` `formatUrlExport(...,'txt')` emits JSON header, `FILE`, per-URL JSON and `END FILE` lines. It does NOT currently offer a pure one-URL-per-line format or per-object custom-vs-development endpoint preference.
- `src/explorer/object-exports.mjs` `verifiedDomains()` currently covers active Cloudflare *custom* domains. An independently enabled `r2.dev` endpoint is **not proven** by this source; use a provider-backed endpoint inspection only when properly supported, otherwise explain that developmental fallback is unavailable/unverified.
- `directoryUrls()` currently uses `eligiblePublicObject(key)` which checks a fixed extension list; review and address that for this new all-files-in-directory workflow.

## Required tests

- 3 files, 2 verified linked custom domains each: **exactly 3 lines** with one stable custom-domain URL per file, no JSON/headers.
- 3 objects including an uncommon extension, nested folder and Unicode filename: **All files** exports each actual authorized file once in stable order. No folder marker included.
- Mixed directory containing PNG, SVG, MP4, WebM, MP3, WAV, HTML, CSS, PDF, ZIP and extensionless objects: **Only image files** emits only PNG/SVG; **Only media files** emits PNG/SVG/MP4/WebM/MP3/WAV; **All files** emits every file with a verified URL. No three-way checkbox ambiguity; switching options preserves the chosen domain/directory.
- Verified custom + verified `r2.dev`: preference ON selects custom; custom absent selects eligible verified developmental fallback with a truthful UI fallback count; no endpoint never produces an invented line.
- No linked website but verified enabled developmental URL → inline **"Only developmental URLs exist. Add domain?"** input; Enter validates/initiates authorized linking, **Save** confirms after verification; after successful verified setup the same export refreshes to use the custom domain without resetting chosen file-type scope. **Alternatively uncheck "Use non-developmental URLs where possible" and export the TXT immediately using existing developmental URLs with no domain setup or extra click.** Verify the uncheck does not discard the file-type choice or close the dialog. Inactive/unlinked domains cannot yield fake success. With no public endpoint, show the truthful no-URL variant.
- Missing public URLs: show omissions and full scan count clearly; do not claim every file was exported. Partial pagination: truthful partial warning, no silent "all done."
- Preference OFF: still produces one deterministically chosen verified URL per file; switching settings never changes other grouped TXT/CSV/JSON outputs.
- Plain TXT content has **exactly one canonical URL per line** and **no file identities, labels, comments or headers**; avoid duplicate URLs or extra lines.
- Test high object count paging, corrupt/stale mappings, exact bucket scope, authentication loss, encoding, and that right-click save engine and existing exports stay unchanged.

**User priority:** A quick, clean site-ready asset URL list from a directory, with verified linked-domain preference rather than developmental URLs whenever possible.
