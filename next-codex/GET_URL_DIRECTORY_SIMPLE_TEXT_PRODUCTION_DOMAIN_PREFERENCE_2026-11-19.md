# P1 — Get URL directory: simple one-URL-per-file TXT and production-domain preference

**Owner clarification, November 19, 2026.** **Status: NEW UI/format delta, not implemented in 0.3.20.** Attach to the [code-audited, deduplicated next-run plan](NEXT_RUN_DEDUPLICATED_CODE_AUDIT_AND_RULES_2026-11-19.md). Do not reimplement the existing directory inventory engine or existing grouped TXT/CSV/JSON exporters.

## Product intent

A creator right-clicks an authorized Cloudflare R2 **directory** → **Get URL** → chooses:

- **☐ Simple Text File — one URL per line** (clear label such as **"Simple Text File, One of Each Per Line?"**; offer as an additional export choice, not a replacement for existing grouped TXT).
- **☐ Use non-developmental URLs where possible** (available for the simple export). Prefer the user's *verified active linked custom domains* such as `assets.example.com` over public development endpoints such as `*.r2.dev`, and only consider any endpoint the existing trusted API actually verifies for this exact bucket.
- **Export** downloads `directory-urls-simple.txt` ready to paste directly into an HTML/CSS/site asset list or other tool.

Example (illustrative URLs; actual URLs must be computed from verified mappings and each exact object key):

```text
https://assets.example.com/photos/hero.png
https://assets.example.com/photos/logo.svg
https://assets.example.com/photos/background.webp
```

**Important:** This mode means **one selected URL for each real eligible object**, NOT one URL for each of several domains attached to the same object. Avoid duplicate lines and duplicated objects. This is a distinct plain-text format: **no JSON header, `FILE` / `END FILE` wrappers, quotes, filename labels, comments, receipt paths, statuses, HTML or other metadata** in the downloaded TXT. Plain UTF-8 text with one complete URL per line and conventional newline separators.

## Selection/verification behavior

1. **Exact chosen scope:** Reuse the existing `listExportInventory` paging for the chosen authorized directory prefix. Include nested descendant files according to the current directory-export scope; clearly label scope, file count and whether recursion is enabled, rather than inventing folder URLs. Only genuine object files with safely encodable object keys qualify. Existing `eligiblePublicObject` filename-extension allowlist filters out many valid file extensions; **evaluate all eligible actual files for the new simple export**, not just a hardcoded list of image/PDF/audio extensions, unless the format is deliberately and visibly limited. Do not include folder markers or paths outside the chosen account/bucket/prefix.
2. **Custom-domain preference checked:** For each file choose **one** active, trusted, account/bucket-matched non-development/public custom-domain URL when available; if several are valid, choose a stable deterministic domain order (or an explicitly selected preferred domain). Don't randomly change domains between exports. Verify exact key URL encoding including nested directories, Unicode and spaces.
3. **Fallback:** If no verified custom domain exists for that object but an enabled verified public developmental endpoint exists, use that endpoint as fallback and **show that a developmental URL was used**, outside the TXT. If no valid public endpoint exists, **do not fabricate one** or emit an empty placeholder line; report the missing object(s) in UI and in existing structured export format if selected. The custom-domain preference never silently authorizes public bucket access.
4. **Unchecked preference:** Use the normal deterministic verified-endpoint choice in the existing API (do not assume a developmental URL is necessarily available or the default). If none, truthful missing endpoint state.
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
- 3 objects including an uncommon extension, nested folder and Unicode filename: all safe, authorized, verifiable URLs export once in stable order. No folder marker included.
- Verified custom + verified `r2.dev`: preference ON selects custom; custom absent selects eligible verified developmental fallback with a truthful UI fallback count; no endpoint never produces an invented line.
- Missing public URLs: show omissions and full scan count clearly; do not claim every file was exported. Partial pagination: truthful partial warning, no silent "all done."
- Preference OFF: still produces one deterministically chosen verified URL per file; switching settings never changes other grouped TXT/CSV/JSON outputs.
- Plain TXT content has **exactly one canonical URL per line** and **no file identities, labels, comments or headers**; avoid duplicate URLs or extra lines.
- Test high object count paging, corrupt/stale mappings, exact bucket scope, authentication loss, encoding, and that right-click save engine and existing exports stay unchanged.

**User priority:** A quick, clean site-ready asset URL list from a directory, with verified linked-domain preference rather than developmental URLs whenever possible.
