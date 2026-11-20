# Auto-Reroute — Simple Rules UI + Chrome-Byte Streaming Implementation Contract

**Status:** APPROVED DESIGN FOR CODEX IMPLEMENTATION, November 20, 2026. **Location:** `/auto-reroute/`. This document is the current authoritative V1 Auto-Reroute scope and simple user-facing rule-card contract. It does NOT claim Chrome interception or R2 streaming is currently implemented. Keep this engine separate from frozen [Screenshot Logic](../screenshot-logic/README.md).

## 1. What the user should see — KEEP IT SIMPLE

**More → Rules** (dropdown order **Rules → Screenshot → Settings**). At the top, users make a download-routing rule with **WEBSITE**, **FILE EXTENSION**, and **SAVE**. The rule appears as a card directly underneath. No technical streaming/Worker settings in this basic form. Destination location is one clearly visible, preselected authorized cloud folder (small `Saving to` chip with `Change`), NOT a long third form or a silently guessed bucket. **If no destination has been explicitly selected or verified, Save is disabled until the user chooses it once.** Preserve the chosen destination as the user's authorized default for subsequent new rules and allow changing it before Save. Every card binds its OWN exact destination when saved, so a later default-folder change cannot retarget existing cards.

```text
More  ▾
  Rules
  Screenshot
  Settings

Auto-Reroute Rules

Website          [ iCloud.com / example.com / All websites   ▾ ]
File extension   [ .zip                                  ▾ ]

Saving to:       [ Cloudflare R2 · my-bucket / backups/ ] [ Change ]

                                        [ Save ]

Saved Rules
┌────────────────────────────────────────────────────────────┐
│ Rule 1                            [ Active   ○/● ]    [ X ] │
│ Website: icloud.com              Extension: .zip          │
│ Destination: Cloudflare R2 / my-bucket / backups/          │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│ Rule 2                            [ Active   ○/● ]    [ X ] │
│ Website: All websites            Extension: .cbz          │
│ Destination: Cloudflare R2 / my-bucket / comics/           │
└────────────────────────────────────────────────────────────┘
```

**This is a design mock, not a claim that iCloud ZIP downloads can already be intercepted.** A saved card does not establish source support.

### Website selection

- Let user select the current website (when trustworthy), type a normal domain, or choose **All websites**. Default specific selection is the user's intended **originating website/page where they initiate the download**, not an unrelated CDN hostname that Chrome later contacts. The website is a CONDITION, not a promise that this site's download response is interceptable.
- For V1, offer **Entire domain + subdomains** (clear default for typed domain) and **Exact hostname** as simple scope options, with optional advanced **exact page URL** within card editing. Normalize scheme/host using real URL parsing and hostname-label boundaries; never substring-match lookalike domains or silently equate `example.com` and `notexample.com`.
- **Trust boundary:** Only match the initiating website if browser APIs/instrumentation provide trustworthy provenance. Chrome's source `url`/`finalUrl` may be an unrelated CDN and the originating page may not be available. When site provenance is unknown, DO NOT falsely apply a website-specific rule. Unscoped All-websites matching still requires trustworthy file identity and permitted pre-download takeover. A later advanced download-source-host filter can be a separate explicit condition, never a silent substitution.

### File extension selection

- Show exact supported V1 extensions (case-insensitive, leading dot normalized): **`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.mp4`, `.webm`, `.zip`, `.cbz`**. **`.avif` optional ONLY after verified**. Preserve intact byte contents; ZIP/CBZ are opaque files, not extracted or converted. Keep an extensible central supported-type/capability registry so audio, PDF, extra image/video formats or arbitrary binaries can be added later without rewriting Rules UI or the engine.
- Use trustworthy filename evidence: content-disposition suggested filename when available, final download name or source basename as appropriate; queries/fragments never become extensions. MIME is supporting information, **not a replacement for exact extension**. `.cbz` may have MIME `application/zip`, but must not trigger `.zip` rules. If extension is not reliably known before the safe interception decision, do not guess; preserve normal Chrome download.
- Do not expose `All file types` as operational while the supported file-type registry is narrow. Clearly label unsupported categories as not yet available.

### Save, cards, and interaction

- **Save** persists a valid new rule and immediately displays its card beneath the form. No upload occurs on Save. No mandatory user-entered name: assign persistent, monotonic default names `Rule 1`, `Rule 2` and so on; users can rename by clicking an existing card.
- **Every saved card shows** name, website scope, exact extension, *frozen exact authorized destination*, and current **Active ON/OFF** state. Its independent toggle activates/deactivates that rule ONLY, without deleting it, changing other cards or running a download. **X deletes only that saved rule** after an appropriate confirmation; it does not delete R2 files or a currently verified object. Clicking the card BODY opens edit of its saved website, extension, destination and optional name; card toggle or X must never open edit.
- **25 cards per page** with Next/Previous at card 26, no global 25-card cap. Rule IDs remain immutable even when names are changed or cards deleted. Default names remain stable when other cards are removed; edit/toggle/delete work correctly across pagination and restart.
- Save confirmation appears ONLY after actual durable persistence; validate exact authorized R2 destination before Active can become ON. On disabled, unsupported, unauthorized or unregistered live capability, show a truthful `Not available`/`Needs authorization` state rather than promising a working reroute.
- Detect duplicate/conflicting active rules while Save/Reactivate/Edit is staged. More-specific trustworthy website scope outranks broader website scope; exact-extension rules outrank a future broad category rule. When two active rules tie in specificity and lead to DIFFERENT authorized destinations, reject the conflicting activation/save or require user resolution. Never silently pick by storage ordering or send two copies. If equal-specificity same-destination rules are redundant, treat one deterministic rule ID as selected and produce ONLY one object.
- An Active switch means this saved rule is eligible for matching; it is NOT proof the Chrome download source can be intercepted. Show a separate execution/coverage or last-result status when necessary. A paused rule remains saved.

## 2. The actual Auto-Reroute data path (NOT screenshot fan-out)

**Owner-selected architecture: the user's Chrome browser obtains ORIGINAL response bytes and STREAMS them INTO the EXISTING trusted Click2Cloud Worker.** Worker validates scoped authorization and writes to Cloudflare R2. The Worker must NOT download the original source itself merely because a URL was supplied, and must not claim this counts as Auto-Reroute. Do NOT intentionally create a full local Downloads file or load a large video/ZIP entirely into memory.

```text
Eligible browser download action (supported HTTP(S) link)
    → determine trustworthy initiating site + file extension
    → match exactly ONE enabled rule + authorized exact R2 folder
    → establish safe browser-controlled interception BEFORE Chrome's ordinary local download
    → Chrome extension-owned fetch()/ReadableStream of ORIGINAL file bytes
    → Chrome streams bounded byte chunks/upload request to existing Worker
    → Worker validates capability, receives BYTES and stores R2 object
    → independently verify size/integrity and issue shared receipt
```

### What is possible — and what is not yet proved

- Browser JavaScript/extension contexts can obtain a readable HTTP(S) response body from a source they are authorized and technically able to fetch, then use request-body streaming (check real Chrome support, host permissions, CORS, origin behavior and streaming `duplex: 'half'`) to upload bytes to a receiving endpoint.
- **Chrome's `downloads.onCreated` and `downloads.onDeterminingFilename` do NOT expose the existing browser download's response body for arbitrary automatic cloud redirection.** `onDeterminingFilename` affects LOCAL Downloads paths. Detecting a download after it starts is not proof that zero temporary local bytes were written.
- Therefore support a **narrow, verified pre-download interception path** for eligible links/download actions whose original byte response can be fetched by the Chrome extension BEFORE an ordinary local download starts. Do not claim universal interception or that a user-visible browser Download button always supplies a reusable URL. iCloud ZIPs, cookie/session-bound URLs, POST, `blob:`, client-generated payloads, signed/expiring links and protected/DRM endpoints require independent real tests; they are NOT V1 guaranteed.
- If eligibility, source, session context, permissions, or interception cannot be established SAFELY before committing, **leave the ordinary Chrome download untouched**. Once a remote transfer begins, failures are truthful and recoverable: do not silently lose the file, invent successful remote storage, or create unauthorized duplicates. Offer explicit local fallback or replay when possible, but do not claim it is always available.
- Never leak source cookies, tokens, signed query parameters or user private download links to Worker receipts/logs. Worker accepts actual byte streams with scoped per-destination capability, not arbitrary untrusted URLs or user-controlled bucket names.

### Large files, security, and receipts

- Use **bounded** browser-side streaming and Worker-side writes. For known-size streams within verified R2 put limits, use proper fixed-length transport. For unknown-size/large MP4/WebM/ZIP/CBZ, implement durable multipart/chunk uploads with stable upload ID, part numbers and ETags, correct part sizing, abort/cleanup and completed-object verification. Do not rely on indefinite MV3 worker lifetime, unbounded `ArrayBuffer` or passing `ReadableStream` through Chrome runtime messages without a proven mechanism.
- Freeze one automatic download plan at the interception decision: trustworthy source identity, initiating site (when known), extension/filename, selected rule ID, exact authorized destination, source URL only in secure transport context, operationId, target key, multipart identity and supported transport. Mid-flight rule edits change future downloads only.
- Maintain exactly **ONE winning rule** per supported original download. The file is transferred unchanged, and its original `.cbz`/`.zip` extension preserved. Avoid recursive routing of Click2Cloud-generated exports/uploads or duplicate browser/Worker transfer events.
- Record a unique transfer ID and output key for every eligible download and durable per-part/per-output progress. Retry same download under same intent ID instead of making unintended cloud duplicates. Validate authorization again at Worker; receipt contains selected rule, verified exact destination, source-byte count, expected/observed size, verification method, chosen filename/extension and confirmed/partial/failed/unknown state. HTTP 202 ACK and plain R2 ETag are not automatically content digest proof.
- Isolate Auto-Reroute operations/authorization namespaces and budgets from Screenshot, ordinary right-click save engines, History and shared Raw/Secure diagnostics. Reuse EXISTING Worker and recorder; no new parallel cloud save system.

## 3. Implementation order for Codex

1. Reuse/preserve existing Cloudflare authorization, exact destination selection, shared diagnostics, signed capabilities and conditional/verified R2 writes. Do not refactor stable right-click save, Simple/Narrow/Depth, existing Explorer or Download directory ZIP merely to add this feature.
2. Build the **simple Rules editor/cards** as specified, with durable card identity, explicit rule/extension/site validation and authorized destination binding. Separate persisted rule state from actual source/transport capability; never treat UI success as transfer success.
3. Prove one **REAL Chrome→Worker→R2 original-byte transfer** from a disposable public HTTPS fixture with browser-controlled source response (start with PNG/ZIP). The existing remote-save flow `src/cloudflare/public-egress.mjs` performs WORKER-side URL fetching for a different product behavior; DO NOT use it as Auto-Reroute proof.
4. Prove safe **pre-download handoff**, including that an intended supported download is intercepted in time and isn't also unintentionally saved locally. Test unsupported downloads continue normally before adding broader website matching.
5. Add file types using central registry, exact filename extension matching and genuine byte-integrity receipts. Add bounded MP4/ZIP streaming/multipart and interruption/retry/cleanup.
6. Run real installed Chrome and disposable R2 tests; for every feature return `DONE`, `REPAIRED`, `NOT TESTED` or `BLOCKED` with test evidence and exact commit SHAs. Do not silently broaden permissions or promise iCloud compatibility without actually verifying it.

## 4. Acceptance matrix

| User action / test | Required behavior |
|---|---|
| Website `example.com`, `.zip`, authorized `R2/backups/` → Save | One Rule 1 card below form, no download triggered |
| Press Rule 1 Active OFF | Card remains visible; matching downloads use their normal browser behavior |
| Press Active ON | Only that card becomes eligible; no other rule state changes |
| Press X on card | Delete saved rule only after confirmation; R2 objects untouched |
| Create 26 rules | 25 cards page 1, 1 card page 2, persistence/edit/toggle/delete stable |
| Same website+extension with competing equal-specificity destinations | Saving/re-activating conflicts visibly blocked or explicitly resolved; never silent duplicate delivery |
| `example.com` rule, actual download served from CDN | Match **verified originating page website** if available; do not confuse CDN host with initiating website |
| `.cbz` file reported MIME `application/zip` | Match `.cbz`, NOT `.zip`; original bytes and extension preserved |
| Eligible PNG, JPEG/GIF/WebP, MP4/WebM, ZIP/CBZ fixture | Original bytes read by Chrome, streamed to trusted Worker, independently verified in exact R2 directory; only tested formats claimed |
| Unknown initiating website, unsupported `blob:`/POST/auth-required source | Rule may remain saved; skip unsafe reroute and preserve ordinary browser download |
| Large MP4 / ZIP with interrupted browser/network | Bounded memory, durable chunk state and honest resumable/failed status; no invented bytes or duplicate objects |
| Two simultaneous eligible downloads | Two distinct original-file operation IDs/objects; no cross-job rule/filename contamination |
| Browser/Worker accepted request but final R2 HEAD fails | NOT verified; show pending/uncertain/failed receipt, not Saved |

## Files and external technical references

- Current code: `extension/manifest.json` (MV3, `downloads` permission, no `commands` yet), `src/cloudflare/transport.mjs` (JSON remote-save intent), `src/cloudflare/public-egress.mjs` (Worker-side URL fetch for OTHER workflow), `src/cloudflare/worker.mjs` (single-destination authenticated gateway), `src/cloudflare/files.mjs` (conditional/verified R2 writes).
- Earlier requirements, superseded where UX disagrees with this simple form: [next-codex master handoff](../next-codex/NEXT_RUN_DEDUPLICATED_CODE_AUDIT_AND_RULES_2026-11-19.md) and [architecture audit](../next-codex/SCREENSHOT_AND_AUTOREROUTE_ARCHITECTURE_AUDIT_2026-11-20.md).
- Chrome docs: [Downloads API](https://developer.chrome.com/docs/extensions/reference/api/downloads) and [fetch request streaming](https://developer.chrome.com/docs/capabilities/web-apis/fetch-streaming-requests).

**Authority:** For V1 Auto-Reroute Rules GUI and Chrome byte-transport semantics, THIS document supersedes older examples that put a complex rule form on top, treat websites as unverified CDNs, offer audio/PDF as live types, or let the Worker re-fetch the source instead of receiving the Chrome byte stream. Core screenshot behavior remains frozen independently in `/screenshot-logic/`.
