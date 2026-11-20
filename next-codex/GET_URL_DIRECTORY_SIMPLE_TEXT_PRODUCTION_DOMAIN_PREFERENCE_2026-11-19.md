# P1 — Get URL directory: simple one-URL-per-file TXT and production-domain preference

**Owner clarifications, November 19–20, 2026.** **Status: NEW UI/format delta, not implemented in 0.3.20.** Attach to the [code-audited, deduplicated next-run plan](NEXT_RUN_DEDUPLICATED_CODE_AUDIT_AND_RULES_2026-11-19.md). Do not reimplement the existing directory inventory engine or existing grouped TXT/CSV/JSON exporters.

## Product intent

A creator right-clicks an authorized Cloudflare R2 **directory** → **Get URL** → chooses:

- **☐ Simple Text File — one URL per line** (clear label such as **"Simple Text File, One of Each Per Line?"**; offer as an additional export choice, not a replacement for existing grouped TXT).
- **File-type selection uses FOUR CHECKBOXES (not radio buttons):** **[ ] Images**, **[ ] Audio**, **[ ] Video**, and **[✓] All files (default)**. The three media categories can be checked in **any combination**, and selecting several includes the **union** of those categories with each object included only once. **All files** is an all-types master checkbox, including PDF, ZIP, CBZ, HTML, CSS, JS, font files, documents, other archives and extensionless objects. When All files is checked, clear the three category checks; when a category is checked, uncheck All files. When nothing is checked, require a selection instead of silently exporting nothing or all. Do not use an exclusive radio group. These controls apply to BOTH directory Get URL export choices, with identical membership semantics.
- **NONRECURSIVE directory scope:** Both simple one-URL TXT and grouped 'Get all URLs for directory' inspect **only immediate files directly inside the selected directory**, not descendants. Selecting `photos/` includes `photos/a.jpg` and `photos/b.zip` but **not** `photos/subfolder/c.jpg`; nested folders/placeholder objects never count as files. Do not accidentally change the independently recursive **Download directory as ZIP** functionality.

- **☐ Use non-developmental URLs where possible** (available for the simple export). Prefer the user's *verified active linked custom domains* such as `assets.example.com` over public development endpoints such as `*.r2.dev`, and only consider any endpoint the existing trusted API actually verifies for this exact bucket.
- **Export** downloads `directory-urls-simple.txt` ready to paste directly into an HTML/CSS/site asset list or other tool.

Example (illustrative URLs; actual URLs must be computed from verified mappings and each exact object key):

```text
https://assets.example.com/photos/hero.png
https://assets.example.com/photos/logo.svg
https://assets.example.com/photos/background.webp
```

**Important:** This mode means **one selected URL for each real eligible object**, NOT one URL for each of several domains attached to the same object. Unlike **Get all URLs for directory**, which deliberately retains ALL distinct domain/endpoint URLs per asset and groups them by object identity. Avoid duplicate lines and duplicated objects. This is a distinct plain-text format: **no JSON header, `FILE` / `END FILE` wrappers, quotes, filename labels, comments, receipt paths, statuses, HTML or other metadata** in the downloaded TXT. Plain UTF-8 text with one complete URL per line and conventional newline separators.

## Two intentionally distinct directory Get URL export modes

**The user is choosing between two different outputs, not two names for the same file.**

**A. "Export one link per asset — Simple Text File"** — clean, site-ready TXT. For each eligible asset/object in the chosen directory, select **exactly ONE** actual URL. A file with five linked/custom/developmental endpoints generates **ONE line**, not five. If linked active websites exist, prefer one valid linked custom-domain URL per file when "Use non-developmental URLs where possible" is checked. The file-type filter is the shared four-checkbox Images/Audio/Video/All files control described below, which may combine media categories and always excludes nested descendants. No redundant per-domain copies, no metadata/header/JSON.

**B. "Get all URLs for directory"** — preserve/rename the already-implemented **grouped** directory export (structured TXT/CSV/JSON) so it exports **ALL actual URLs associated with EACH asset**, including multiple URLs pointing to the **same asset via different websites/endpoints**. Group every file's URL list **under that file's stable object identity** and keep each file's variants together, rather than flattening, choosing only the preferred domain, or merging variants across objects. An asset with 5 linked URLs contributes 5 grouped URLs; 3 assets with 2 valid linked endpoints each contribute 6 URLs grouped into 3 distinct asset sections. Do **not** drop a URL just because that same asset is already represented by another domain; remove only true duplicate identical records caused by duplicate provider enumeration if necessary, never domain variants. Report separate **unique file count** and **total URL count**. Keep stable source bucket/path identity, exact key encoding, truthful completeness, and existing structured file outputs. Do not replace the current grouped TXT format with plain TXT.

The two modes must be clearly labeled and visibly selectable from the **same right-click directory → Get URL** workflow. They should not automatically download both when a user selects only one; retain optional multi-format export within "Get all URLs for directory". **Implement the small simple-TXT addition and clarify existing grouped-export UI, not a second cloud listing/export engine.**

## When only developmental public URLs exist — inline Add Domain flow

For **directory Get URL**, if the bucket has **no verified linked custom website/domain** but **does have a verified enabled developmental endpoint**, reveal this friendly inline prompt without leaving the directory export:

```text
Only developmental URLs exist. Add domain?
Website/domain: [ your-domain.com                 ]
[Save]
```

- The domain field accepts the desired custom website. **Enter** submits the typed domain for validation and linking/verification (the same action as its submit control), **without closing the popup**, losing the directory selection, or resetting **Images / Audio / Video / All files**.
- The user then clicks **Save** to confirm the domain choice once it is genuinely associated with the exact Cloudflare account/bucket. As soon as Cloudflare reports the custom domain active/verified, **automatically refresh the same directory export** so the checked "Use non-developmental URLs where possible" prioritizes that website for each matching file. No second right-click, re-selection or retyping.
- **Truthfulness:** Existing 0.3.20 code only proves it can read/verify active custom domains; it does **not** prove it can create a custom-domain association in Cloudflare. If registering a domain is not supported by the current integration, Enter/Save must **not claim the website is linked**. Show the missing Cloudflare setup action, preserve typed input + file-type selection + selected directory, and offer **Recheck** then Save when the association is active. Explicit authorization is required for any action that exposes bucket contents publicly.
- If there is **no verified public endpoint of either type**, show **"No public URLs available for this bucket. Add domain?"**, NOT the false statement that developmental URLs exist. Use the same setup/verification safeguards.
- **User-requested fast path: simply UNCHECK "Use non-developmental URLs where possible" to use developmental URLs.** If only real, active, verified developmental endpoints exist, unchecking this checkbox immediately enables the normal **Export** action to produce the simple TXT with one developmental URL per selected file. No need to link a custom website, type a domain, press Save, or leave/reopen the dialog. No extra "Use developmental URLs" confirmation/button is required. The inline **"Only developmental URLs exist. Add domain?"** field may stay visible as optional guidance but must never block export while the preference is unchecked. Explicitly label the output as using developmental URLs in the UI (not inside the TXT). Keep the chosen file-type scope and directory unchanged.
- If the checkbox is **checked** and only developmental endpoints exist, surface the **"Only developmental URLs exist. Add domain?"** prompt and the clear alternative **"Uncheck 'Use non-developmental URLs where possible' to export developmental URLs now."** Do not make connecting a website compulsory or silently label developmental links production-ready. Never fabricate a public link.
- Keep file-level Get URL's separate **input → Submit → Copy All** and clickable URL cards unchanged; existing structured grouped TXT/CSV/JSON exports must continue working.

## File type selection — four checkboxes, combinable media categories

```text
File types (choose one or more categories):
[ ] Images       [ ] Audio        [ ] Video
[✓] All files

[✓] Use non-developmental URLs where possible
```

**Controls are checkbox-style, NOT mutually exclusive radios.** Images/Audio/Video are independently selectable and combined by UNION (Images + Audio exports both; Images + Audio + Video exports all media). Checking **All files** unchecks the other three because all categories are included (plus nonmedia), and checking a media category unchecks All files. Default = All files checked alone. If the user unchecks All files and no category is selected, show 'Select at least one file type' and disable Export. An asset matching multiple detection methods still appears once. Classify using trustworthy MIME and normalized real extensions with a documented fallback; supported categories must include typical image/audio/video variants. All files means **every real immediate-child object**, including uncommon file extensions, CBZ/ZIP/PDF and extensionless objects, provided a real public URL exists.

**Both** simple and grouped Get URL exports use this same filter, but differ in their outputs: simple yields one URL per included file; grouped yields all distinct verified URLs grouped per included file.

## Developmental URLs must LOOK different in the interface

In the **single-object Get URL list** and any **directory Get URL URL previews**, visibly distinguish verified public developmental endpoints (such as `r2.dev`) from custom-domain URLs. Use a **different, accessible card color/accent treatment** for developmental URLs (e.g., subdued amber tint/border versus neutral custom-domain cards), AND a plainly readable label **'Development URL'** (versus **'Custom domain'**). Don't rely on color alone. Keep full URLs selectable/copyable; **Copy All includes all displayed verified URLs, including developmental URLs**, regardless of scroll position. Custom-domain cards can remain the normal visual treatment. Show verified/untested reachability accurately; a colored card is NOT proof the URL is publicly reachable. The **exported TXT/CSV/JSON content remains plain data** and does not contain color or decorative labels.

**Scope for all directory Get URL modes:** select the exact authorized folder and list its **immediate children ONLY**, with `prefix` + `delimiter:'/'` where supported, or filter using canonical prefix-boundary matching and `relativeKey.includes('/')===false` after complete pagination. At bucket root, include only root-level objects without '/' in their keys. Exclude subdirectory entries, placeholders, empty directory markers, sibling prefixes and nested files. Preserve full paging/completeness reporting. This is a special Get URL scope change and does **not** alter existing recursive ZIP archive/export tools.

## Selection/verification behavior

1. **Exact nonrecursive chosen directory:** Reuse the existing `listExportInventory` pager but include only **direct child objects** of the selected authorized directory in BOTH simple and grouped Get URL outputs. Filter nested descendants after reading all required pages (or use provider's delimiter support safely), reject sibling-prefix collisions, and exclude folder markers. Existing `eligiblePublicObject` fixed extension allowlist excludes valid types; replace it for this workflow with the four-checkbox filter and ensure **All files includes any real immediate file** (including CBZ, ZIP, extensionless and nonmedia). Never broaden beyond authorized account/bucket/prefix. Show the user 'Current directory only · No subfolders'.
2. **Custom-domain preference checked:** For each file choose **one** active, trusted, account/bucket-matched custom-domain URL when available; if several are valid, use stable deterministic order (or an explicit preferred domain). If NO verified custom domain exists and only verified development URLs exist, show the inline Add Domain prompt and require the user to **uncheck the preference** to use the developmental-only fast path, as already specified. Never invent URLs. Verify exact object-key URL encoding, Unicode and spaces.
3. **Development-only path:** If only a genuinely verified developmental endpoint exists, **do not silently fall back while the custom-domain preference remains checked**: display the inline option to add a domain and explain 'Uncheck Use non-developmental URLs where possible to export developmental URLs now'. When unchecked, export the verified developmental URL immediately. If no valid public endpoint exists, don't fabricate one or emit placeholder lines; show missing object counts. No preference setting ever silently makes a private bucket public.
4. **Unchecked preference:** If **only developmental URLs exist and are provider-confirmed active**, choosing OFF expressly authorizes their use in the immediate simple TXT export. Export one deterministic full developmental URL per eligible file with no extra domain-setup step. If a verified linked custom endpoint is also available, the OFF mode can follow the API's normal deterministic verified-endpoint selection; never invent an endpoint. An unchecked preference is **not** a command to enable a private bucket's public development endpoint.
5. **Export completion truthfulness:** Show counts **scanned, eligible objects, URLs exported, omitted/no-public-URL, custom-domain vs developmental fallback**, and `complete`/partial in the UI. If the directory inventory is incomplete, do not present a TXT as an exhaustive website-ready list: block until full enumeration, or require an explicit, clearly labeled **Export partial list** action. Avoid quietly omitting files. Any separately requested structured JSON/CSV/TXT still reports file identity and completeness, preserving its existing contract.
6. **Reachability honesty:** A verified Cloudflare domain mapping is not automatically proof an anonymous browser GET of each object succeeds; if reachability is untested show it as **not checked**, and never call a generated TXT "production-verified" without real checks. A "non-developmental domain" preference means **custom-domain first**, not proof of deployment readiness.
7. **Preserve privacy/security:** Do not expose a private bucket to make exports succeed, and do not include secrets, signed URLs, unrelated bucket objects, or guessed origins. Respect the existing experiment flag and first-time **Allow Public URL? Yes / No** gate.
8. **No competing API/export/diagnostics machinery:** Extend `extension/explorer-exports.mjs` `directoryUrls()` and `src/explorer/object-exports.mjs` formatters using the existing `getPublicUrls`, `objectUrls`, `verifiedDomains`, `listExportInventory` and File API plumbing. Add small pure formatting/selection helpers and focused tests. Preserve the existing grouped TXT output unchanged for anyone who wants file identity and all domain mappings; do not replace or relabel it as the simple text format.

- **The change applies to the existing grouped export too**: previous grouped TXT/CSV/JSON implementations may enumerate descendants, but this product requirement deliberately changes **Get all URLs for directory** to be NONRECURSIVE. Preserve their grouping and formats, not their old recursive scope.

## Current implementation evidence (GitHub main, 0.3.20)

- `extension/explorer-exports.mjs` `directoryUrls()` presently offers only `csv`, `txt`, `json` checkboxes and calls `formatUrlExport(...,format)`.
- `src/explorer/object-exports.mjs` `formatUrlExport(...,'txt')` emits JSON header, `FILE`, per-URL JSON and `END FILE` lines. It does NOT currently offer a pure one-URL-per-line format or per-object custom-vs-development endpoint preference.
- `src/explorer/object-exports.mjs` `verifiedDomains()` currently covers active Cloudflare *custom* domains. An independently enabled `r2.dev` endpoint is **not proven** by this source; use a provider-backed endpoint inspection only when properly supported, otherwise explain that developmental fallback is unavailable/unverified.
- `directoryUrls()` currently uses `eligiblePublicObject(key)` which checks a fixed extension list; review and address that for this new all-files-in-directory workflow.

## Required tests

- 3 files, 2 verified linked custom domains each: **exactly 3 lines** with one stable custom-domain URL per file, no JSON/headers.
- The **same** 3 files × 2 actual domains using **Get all URLs for directory** produces **6 grouped URL entries, 3 asset groups**, with each asset's two links together (not 3 flattened one-per-file URLs); preserve original grouped TXT/CSV/JSON behavior and correctly report files=3, urls=6.
- Selected `photos/` contains `photos/a.png`, `photos/report.cbz`, `photos/奇妙.pdf` and `photos/nested/skip.jpg`: **All files** exports exactly the three immediate files in stable order; nested/skip.jpg and directory markers are excluded. Root directory similarly excludes all nested keys.
- Mixed immediate directory containing PNG, SVG, MP4, WebM, MP3, WAV, HTML, CSS, PDF, ZIP, CBZ and extensionless objects: Images emits PNG/SVG; Audio emits MP3/WAV; Video emits MP4/WebM; Images+Audio emits PNG/SVG/MP3/WAV; all three media boxes emits the six media files, once each; All files emits every eligible immediate object. Checkbox switches preserve domain/directory; zero checked blocks Export.
- Verified custom + verified `r2.dev`: preference ON selects custom; if only verified developmental URLs exist, show Add Domain and require unchecking the preference for an immediate developmental export. No endpoint ever yields an invented URL. Developmental URL cards are visually distinct by color AND 'Development URL' label; Copy All includes them.
- No linked website but verified enabled developmental URL → inline **"Only developmental URLs exist. Add domain?"** input; Enter validates/initiates authorized linking, **Save** confirms after verification; after successful verified setup the same export refreshes to use the custom domain without resetting chosen file-type scope. **Alternatively uncheck "Use non-developmental URLs where possible" and export the TXT immediately using existing developmental URLs with no domain setup or extra click.** Verify the uncheck does not discard the file-type choice or close the dialog. Inactive/unlinked domains cannot yield fake success. With no public endpoint, show the truthful no-URL variant.
- Missing public URLs: show omissions and full scan count clearly; do not claim every file was exported. Partial pagination: truthful partial warning, no silent "all done."
- Preference OFF: still produces one deterministically chosen verified URL per file; switching settings never changes other grouped TXT/CSV/JSON outputs.
- Plain TXT content has **exactly one canonical URL per line** and **no file identities, labels, comments or headers**; avoid duplicate URLs or extra lines.
- Test high object count paging, corrupt/stale mappings, exact bucket scope, authentication loss, encoding, and that right-click save engine and existing exports stay unchanged.

**User priority:** A quick, clean site-ready asset URL list from a directory, with verified linked-domain preference rather than developmental URLs whenever possible.
