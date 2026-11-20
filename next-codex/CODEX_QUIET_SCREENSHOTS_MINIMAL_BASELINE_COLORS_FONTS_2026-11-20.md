# Codex: quiet screenshots + Minimal as true base UI, color/font-only styling experiment

**Owner request, November 20, 2026. Execute on this dedicated experimental branch.**
Branch: `codex/minimal-baseline-palette-fonts-quiet-screenshots-2026-11-20`.
Base: the verified screenshot-repair branch HEAD `6b91b750c3a2b972e9dfc83588ef430cf81fd377`.
**Do not change the working repair branch or main. Keep exact screenshot upload code, OAuth and save engine unaffected.**

## Outcome

1. The user does NOT want permanent system notifications every time a screenshot is taken. A successful Alt+Q or Ctrl+Shift+Y should not create a Windows/Chrome desktop notification; neither should ordinary retry outcomes. History and unobtrusive in-app status must still work.
2. The user wants a new experimental UI architecture in which the **Minimal interface itself is the baseline structure**. CSS must NOT build "Minimal" as a secondary theme layered over a bigger UI. Instead CSS/presentation tokens should provide **five coordinated color-and-typography palettes**; choosing a palette applies its complementary heading/body/control fonts automatically, with NO separate font-selection UI, applied to the same minimal baseline layout. No full theme changes to component layout, spacing architecture, content visibility, menu structure or feature accessibility just because a palette changes.
3. Show real before/after browser visual evidence and functional test results. The user wants a practical, simpler UX rather than an abstract aesthetic framework.

## A. Notification fix (first and smallest task)

Existing source: `extension/screenshot-background.mjs`, in the `notify(job,{recorded})` callback. After `send({channel:'screenshot-result',...})`, it **unconditionally invokes `chrome.notifications.create('screenshot-'+job.plan.operationId,...)`** for every completed screenshot, whether verified, failed or partial.

- Stop unsolicited persistent OS notifications for screenshot successes and routine screenshot failures, including retries. **Default screenshot desktop notifications: OFF.** History is the source of record; the existing Shelf/in-app screenshot status may present concise nonblocking transient feedback.
- A small OPTIONAL setting `Desktop screenshot notifications` may be offered, OFF by default, if simple enough; don't let that preference stall the basic change. An opted-in behavior should be clearly labeled and not force persistent notifications by default. No duplicate notification per output. No timers/notification-clearing hacks that depend on an MV3 worker staying awake.
- Keep any other existing non-screenshot notifications alone unless clearly demonstrated to be the same bug. Don't remove `notifications` from the manifest unless a repo-wide usage search proves it's unused.
- A screenshot still captures, uploads, retries, updates History and maintains independent verified receipts exactly as before, whether the Shelf is closed or open.
- Add tests: default no chrome.notifications.create after successful, blocked, failed or retried screenshot; existing screenshot-result and History events remain; opt-in behavior tested if included.

## B. Minimal structure must be the bottom/base UI, not CSS "making Minimal"

Review exact source:
- `src/aesthetic/host.mjs`: currently defaults to high-polish in restore(), paints Minimal by inheriting highPolish tokens plus minimal overrides. The API also permits geometry/spacing/visibility tokens.
- `src/aesthetic/packages.mjs`: highPolish and minimal packages both specify layout geometry and typography; Minimal has visibility.hide rules.
- `extension/aesthetic.css`: currently applies layout/spacing/card borders/shadows/brand structure and visibility rules based on data-aesthetic, and Minimal-specific exceptions.
- `extension/app.css`: existing foundational styles.
- `extension/app.mjs`: currently uses `isMinimal()` to change error text and status behavior, and Settings Appearance selects three structural themes with a palette picker limited to high-polish.
- `tests/aesthetic.test.mjs`: existing theme behavior tests, to update rather than silently weaken.

Implement in this separate branch:
1. Move the **Minimal structural layout** into a single stable baseline component/layout CSS and markup. It must render correctly without `data-aesthetic=minimal` selectors. The user should see a tidy, clean Minimal surface even when no optional skin stylesheet loads.
2. The presentation customization should influence **colors and typography**, not layout composition. Define a small CSS variable contract (background/surface/text/muted/border/accent/selection/focus plus each palette's coordinated heading/body/control font stacks and suitable font weights). Palette choice should NOT modify visibility, navigation items, page arrangement, spacing hierarchy, action positions, Worker setup behavior or cloud functionality.
3. Keep the five familiar palettes—Original Rose, Ocean Blue, Emerald Forest, Amethyst, Sunset Amber—with proper light/dark variants. **Each palette comes pre-paired with its own visually coherent, complementary font combination for headings, body text and UI controls. Palette selection changes colors AND its corresponding typography together, automatically; do NOT add a separate Font selector.** Use available system font stacks with robust fallbacks; no external font fetching or bundled fonts. Persist the palette as one coordinated choice, without a separate font preference. Include a readable instant preview.
4. Fresh install default is Minimal structure, with a sensible default coordinated color-and-font palette. Existing users' screenshot rules, OAuth, Cloudflare destinations, History, debug settings and saved preferences survive branch reload. Do not reset `chrome.storage` or silently discard already selected colors; use deliberate compatibility/migration logic for prior aesthetic preferences, with deterministic behavior and tests.
5. Remove special Minimal-only behavior gates that hide genuinely useful actions, diagnostic availability, labels or controls. If dense technical explanation should normally stay out of sight, use a user-invoked disclosure rather than a theme-dependent data-aesthetic selector. Never conflate a color palette with a debug/functional permission.
6. Bit o' Polish and Remote V1 remain intact on **the original repair branch**. This is an alternate experimental *branch*, not an irreversible migration of main. Do not import old theme-specific geometry back into the new Minimal baseline.
7. Keep user interaction responsive at compact and desktop widths, in light/dark mode, with focus/keyboard accessibility. No horizontal overflow, hidden Save buttons, broken select controls, or palette-induced layout jumps.

## C. Prove no save regressions

Do not touch screenshot transfer logic unless a focused test proves required. After the visual work, run:
- `npm run build:extension`
- Focused screenshot capture/rules and History/receipts tests
- Aesthetic tests covering default Minimal, the persistence of each coordinated color-and-font palette, automatic application of all its heading/body/control fonts, and no palette-driven DOM/geometry changes
- Existing Simple/Narrow/Depth save regression tests
- Real installed Chrome browser smoke where runnable, with the screenshot local HTTPS R2 fixture; distinguish fixtures from live R2.

Acceptance:
- Press Alt+Q on a normal HTTPS page: screenshot saves to exact configured R2 key, same R2 GET/SHA-256 verified receipt, **zero unsolicited desktop notification**.
- Ctrl+Shift+Y same. Retry only unresolved outputs, no new popups or duplicate files.
- Startup and all palette choices have the same Minimal layout/visible controls; switching the complete color-and-font palette doesn't replace/remount the main interface or alter save behavior.
- Works on a fresh profile and after reloading the user's existing profile; no accidental theme or screenshot settings loss.
- Branch commit + changelog + screenshots or browser evidence, and precise installed test steps. No claim of live Cloudflare success unless actually observed.

## Codex execution and delivery

Make the actual source changes on this branch, not merely a report. Commit and push. Report exact files, commit SHA, tests and failures. Provide a working built extension artifact or unambiguous build commands. Don't merge to main or replace the known working screenshot repair branch without owner approval. **Prioritize fixing the notification spam immediately, then the separate Minimal-first palette/font experiment.**

---

## D. Owner's additional requirements — supersede any conflicting earlier appearance wording

**Added November 20, 2026. These are part of THIS SAME implementation, not a future wish list.**

### D1. Only TWO themes, exactly

In this experimental branch, **Settings → Appearance → Theme must list exactly**:

1. **Minimal** — the default, actual underlying UI structure.
2. **Remote V1** — the selectable legacy alternative.

There must be NO separate “Bit o' Polish” theme or other third structural appearance in this branch. Do not delete it from the original screenshot-repair branch or change main. Preserve old saved preferences by migrating an old `high-polish` selection to **Minimal** while preserving its valid saved color palette. An old `standard` selection should map to Remote V1; an old `minimal` selection remains Minimal. Never clear user storage, cloud connections, screenshot rules, or destinations.

**Palettes are not themes:** Keep Original Rose, Ocean Blue, Emerald Forest, Amethyst, and Sunset Amber as **coordinated color-and-font bundles within Minimal**. Each bundle provides complementary heading, body and interface font stacks with its own color scheme; **there is NO separate font selection UI**. All palettes work in light/dark modes. Switching a bundle must not change UI structure, visible controls, feature availability, user data, or geometry. Remote V1 preserves its legacy appearance/layout, since it is an explicit alternate theme, but must retain all current features and feedback. Remove high-polish as a theme-picker entry and avoid registering it as an independently selectable theme in this branch. If its validated color token data is reused internally, treat it as a palette data source only—not an appearance mode.

Update `src/aesthetic/host.mjs`, `src/aesthetic/packages.mjs`, `extension/aesthetic.css`, `extension/app.mjs` appearance controls, and tests. Revise the earlier section's reference to Bit o' Polish as a theme accordingly.

### D2. Plural label: “Screenshots”

The application **More ▼ dropdown** must say **Screenshots** (plural), not Screenshot. In `extension/app.html`, change the existing `#header-menu [data-view="screenshot"]` item to **Screenshots** while keeping the internal view ID and event handling unchanged. Update the page heading in `extension/screenshot-page.mjs` to `Screenshots` for consistency. Update empty-rule messages and navigational instructions that show “More → Screenshot” to **“More → Screenshots”** (including a11y labels and screen reader-visible text). Do not blindly rename stable API identifiers, storage keys, test fixture identities, or the screenshot action itself. The browser-native context menu, a separate feature, is not the label being corrected here.

### D3. Screenshot IMAGE PREVIEWS in History (mandatory)

The user expects screenshots to display an actual thumbnail just like any other saved image in History.

**Root cause established from current source:**
- `extension/history-page.mjs` has a special `screenshotRow(r)` that only renders text/verification metadata, not a `[data-preview]` image slot.
- The ordinary `row(r)` supports image preview, lazy `IntersectionObserver`, `createImageBitmap`, a small WebP thumbnail, and cleanup. Screenshot rows branch out before this path.
- `src/history/model.mjs` provides screenshot receipts and `screenshot.outputs`, but not the normal row's single `objectKey/canGoTo` pointing at a verified screenshot; the screenshot may have multiple output destinations.
- `src/screenshot/retry-cache.mjs` stores original captured PNG only temporarily (one hour / shared 48 MiB budget); **History previews must NOT depend exclusively on that short-lived cache**.
- The screenshot repair's ordinary upload uses the direct R2 Object API, not the per-bucket Worker. Therefore do not make screenshot previews depend on Worker setup or `openRemoteResult/readFileChunk` if those calls require a prepared Worker.

**Required implementation:**
1. In `screenshotRow(r)`, show **one image thumbnail per capture**, near its date/status/expandable receipt, exactly like the other image-history items; add a suitable `data-preview` slot and readable screenshot filename. Do not create one duplicate thumbnail for each of three R2 destinations.
2. Choose the **first confirmed output with a real exact target/key** (or a consistent deterministic confirmed output). Its account, bucket, full key, size/digest come from the saved screenshot receipt. Never substitute a current default folder, invent an R2 URL, or silently use a sibling destination. The other output destinations remain individually visible in the receipt.
3. Load the actual saved screenshot image bytes (currently PNG, but do not make the preview dependent on the .png extension) from that exact verified R2 object, **using the already authorized direct R2 Object API** and existing OAuth token/refresh/account checks. Reuse the appropriate direct R2 GET route from `src/cloudflare/screenshot-direct-upload.mjs` where possible. The UI may use a small dedicated trusted background request/chunked bridge if required; DO NOT add a new Worker dependency, ask for S3 credentials, or create a separate cloud service.
4. For an incompletely uploaded capture with **no confirmed R2 output**, it is okay to show a local preview if the original PNG is still recoverable in the existing retry cache. If bytes are unavailable, show a quiet “Screenshot preview unavailable” placeholder, **not a false saved image**; never turn preview failure into upload failure, change verified counts, or erase History.
5. Reuse existing History preferences: **Expand all images / Only first page / Close all** must apply to screenshot thumbnails too. Lazy-load only when visible/expanded, with bounded image memory/concurrency, cancellation on collapse, and object URL revocation on navigation. Do not permanently store full screenshot pixels in History JSON/diagnostic ZIP just for a thumbnail.
6. Detect/validate the returned saved screenshot image's actual supported MIME/bytes and decode to a small thumbnail using the same image-preview presentation and aspect ratio as ordinary images. Today's screenshot producer explicitly captures PNG and must stay unchanged, but the preview must not reject otherwise-supported future image formats merely because they are not .png. Show a clear fallback for inaccessible or deleted R2 files, disconnected account, corrupted bytes, offline state, or preview size limits. Avoid an infinite loading state and avoid repeated noisy notifications. Preserve existing screenshot verification/receipt independently of the visual preview.
7. Opening/expanding a screenshot History row after **more than one hour**, after Chrome reload, or after an MV3 worker restart must still show a thumbnail for a confirmed object **from R2**, even after the temporary retry PNG cache expires.
8. On a capture sent to three directories, render one thumbnail, keep `3/3 verified` and all three destination details. If only two are verified, preview from either confirmed output while leaving the third retryable, with no false `3/3` display. Never preview a different user's or currently selected account's object due to a stale lookup.
9. Keep the preview read separate from receipt validation. It must not issue PUT, capture again, retry the operation, mutate R2 objects, or create another Chrome notification merely because History loaded a thumbnail.

**Test evidence expected:**
- A saved screenshot visibly renders a small image preview in History using installed Chrome and the local HTTPS R2 fixture. The saved screenshot currently is PNG; test that the preview reads actual supported image bytes instead of relying on filename extension alone.
- Multi-directory screenshot = one preview, all exact destination/verification details, and no screenshot recapture when viewing.
- Preview survives temporary screenshot cache expiration and extension reload when R2 GET works.
- Correct status if provider GET fails, output is missing, permission changes, or image exceeds supported preview size.
- Existing History image preview tests and screenshot/direct-upload tests still pass. No change to Simple/Narrow/Depth saving.
- Screenshot preview obeys History image expansion preference and shows no persistent OS notification.

## E. Revised final acceptance checklist

In addition to earlier checks, confirm and report:

- **Exactly TWO appearance themes: Minimal (default) and Remote V1.** Minimal has five **paired color-and-font palettes**, each automatically styling typography as a unified design; no separate font picker or third Bit o' Polish theme entry.
- **More → Screenshots** with a plural label, and a consistent page heading. Internal stable view identifiers remain unchanged.
- **Screenshot previews actually render in History** using the correct verified R2 screenshot image object (PNG in the current capture engine), alongside matching filename/date/status, even after the one-hour retry cache expires.
- **No routine persistent Windows/Chrome screenshot notifications** on successful or retried screenshots.
- **No regressions** in shortcuts, exact-folder direct PUT/GET SHA-256 proof, History, settings, or existing right-click save.
- Provide before/after screenshots or browser assertions, exact test commands/results, implementation commit/branch, and a downloadable build if possible. Report lack of real live Cloudflare verification rather than claiming it.

**The user wants a tangible built result, not merely an audit.**

---

## F. Owner's additional requirement — Screenshot History → expandable “URLs” and one-time bucket-publication setup

**Added November 20, 2026. This is in scope for THIS SAME experimental branch and is not optional.**

**Desired everyday UX:**

- A screenshot History entry displays ONE shared real image thumbnail (per D3) at the TOP. BELOW that, render ONE separate destination card for EACH screenshot output. **EACH destination card contains its OWN GO TO button AND its OWN accessible expandable URLs section.** There is NO single shared screenshot-level URLs expander. When a destination card's URLs is expanded, automatically retrieve and populate only that destination's active public URLs. This works for screenshots made before this feature existed and never requires setup for an already-public bucket.
- Expanding URLs on ANY ONE destination card must enumerate **EVERY currently enabled, active, provider-confirmed public hostname attached to THAT EXACT OUTPUT's bucket**: its r2.dev development hostname if enabled, plus ALL active custom domains (zero, one, two, ten or more). Render one independently copyable/openable exact screenshot object URL per active hostname. Do not combine multiple destination cards into one list or leak sibling bucket URLs into another card; identify URLs with that card's account/bucket/key/outputId. No arbitrary two-link cap. Never fabricate URLs, use private Cloudflare API endpoints as public links, or report a link for an unconfirmed object as saved.
- **Discover existing public access FIRST, before proposing any setup.** Read both the bucket's managed r2.dev domain and ALL paginated custom-domain entries from Cloudflare; filter for actual active/usable hostnames. This applies to historical screenshots and buckets made public in the Cloudflare dashboard or by earlier Click2Cloud Get URL workflows. If ANY active public hostname exists, immediately show its exact screenshot URL under the expanded section by default, without waiting for the user to complete this new workflow and without prompting them to republish. If NO active public hostname is found, keep the expander and offer **“Enable public URLs for this bucket”**, which opens a short confirmation naming the actual bucket/account and explaining bucket-wide public exposure. No popup on History open or URL expand; public enable happens ONLY after deliberate button click + confirmation. A custom-domain-only bucket already has public URLs even when r2.dev is disabled.
- On **Yes / Enable**, request enabling Cloudflare's **Public Development URL (r2.dev)** for THAT bucket using the user's existing authorized Cloudflare OAuth session. If the current token lacks the API grant, show a specific **Reconnect/authorize** action; do not silently fail or claim the change succeeded. Handle the real provider response. **Re-read** the bucket's managed-domain status and use its returned exact domain to build the full screenshot URL. Only mark it active after Cloudflare actually reports `enabled: true`; show concise propagation/pending status if public read is not yet available. Do not invent a hostname or hardcode `pub-...` IDs.
- After successful managed-public enabling, immediately REFRESH the full domain inventory and list the actual **Public development URL** for each relevant verified object, with copy/open and a brief “Development / rate-limited” indication, alongside **every** already-active custom-domain URL. Whether or not a user supplies another domain, all previously enabled links must remain displayed. This same full inventory must appear WITHOUT any enable flow when r2.dev was already enabled before the user opened History.
- Immediately below or adjacent to the public URL section, reveal an OPTIONAL text field **“Custom domain”** with an example such as `assets.example.com`, plus a separate **Connect domain** action. Put this friendly helper sentence near it: **“If your nameservers are already with Cloudflare, simply add your domain!”** However, do not treat typing alone as a successful domain connection.
- A custom domain can only be attached when Cloudflare's real R2 custom-domain prerequisites are satisfied: the domain/zone must be present in the same Cloudflare account as the R2 bucket, and Cloudflare must accept/verify the connection. If an eligible Cloudflare-managed zone is already present, offer a short attach flow with actual status and API error detail when it fails. If not, explain briefly how to add that domain to the same Cloudflare account first (or open the official Cloudflare setup screen), without blocking the development URL. Custom domain may be **Initializing** before becoming **Active**; show it as **pending**, not as a confirmed working URL. Recheck/poll status within sensible bounds and offer manual Refresh. Never silently change DNS for unrelated zones.
- EVERY pre-existing active **custom domain** must automatically produce its own screenshot URL **without requiring r2.dev to be enabled or any setup flow**. The user may have attached one or many domains long ago; retrieve the complete current domain list, including pagination if applicable. Do not ask users to make their bucket public again if at least one active custom domain already exposes its objects. Offer r2.dev enabling only as a separate optional action, never as the condition for displaying already available custom URLs.
- Whenever one or more new custom domains become active, add **all their distinct exact screenshot URLs** to the affected **individual destination card's own URLs expander**, alongside that output's still-enabled r2.dev URL and older active domains. If 1 development hostname + 5 active custom hostnames exist for that bucket, display all 6 links IN THAT CARD, not 2. If a domain becomes disabled, remove or mark its URL unavailable after refresh. Do not confuse 'domain configuration exists' with 'domain is active' or silently truncate the result list.
- URLs do not require the screenshot to be recaptured, uploaded again, renamed, moved, or written to any new location. Publication applies at **bucket** level, and the screenshot object key remains exactly unchanged.
- All browser-facing copy/open operations must use HTTPS addresses derived from validated Cloudflare-provided enabled domains plus precisely encoded **object-key path segments** (preserve slash separators, percent-encode spaces/Unicode/reserved characters). Never double-encode existing key material, invent a bucket segment in the URL, confuse `redown` bucket with `redown/` key prefix, or use the current/default bucket in place of the screenshot receipt's actual bucket.
- Screenshots that are not confirmed in any R2 destination may still show local image preview if available, but **no invented public asset URL**. Once verification succeeds and domain status is known, refreshing History should expose the corresponding URLs.
- **Keep extremely long entries usable:** EACH destination card gets its OWN expandable URLs list, with a sensible per-section maximum height (e.g. 240px for many URLs). Separately, **the entire screenshot History entry MUST be vertically scrollable** with a bounded maximum height when its many destination cards exceed the available space. This includes the thumbnail, cards, status and controls in one screenshot-entry scroll region; do not infinitely lengthen the History page. One/two URLs and a few destinations should have no unnecessary scrollbars. Both the outer screenshot-entry scroll region and optional inner URL scroll regions must support mouse, touchpad, keyboard and touch, avoid scroll trapping, maintain visible focus, and allow all URLs/GO TO buttons to remain accessible. Keep Copy/Open functional with full exact URLs, visual wrapping/ellipsis only; no horizontal overflow or duplicated screenshot previews.
- Keep this URL view unobtrusive. **Every destination card must always show its own URLs expander directly under its location/GO TO row, not under the shared thumbnail.** Its content populates with all existing active links for that specific output whenever opened, with zero activation clicks. Do not launch prompts, enable publication, or perform public-domain network calls merely because screenshot capture occurred; resolve on-demand for the opened card or explicit History refresh, with safe read-only caching per exact bucket if helpful.

**Existing functionality to REUSE rather than cloning:**

- `extension/background.mjs` already has `readCustomDomains(target)` and `readManagedDomain(target)`, using authenticated `oauth.request`. They currently READ `GET /accounts/{account}/r2/buckets/{bucket}/domains/custom` and `GET .../domains/managed`; extend these through a narrow trusted API command for Screenshot History if needed. **Do not stop after the first custom domain, assume only one can exist, or skip subsequent provider pages. Enumerate all active returned custom hostnames** using the response's actual documented shape, then add the enabled r2.dev hostname if any.
- `src/explorer/r2-adapter.mjs` already exposes a `publicUrls` file-API operation. Check how the current Get URL flow and domain/source mapping works and reuse the same code where compatible. Do not confuse provider-specific R2 direct upload verification with public link readiness.
- Cloudflare's documented managed-domain enable endpoint is **`PUT /accounts/{account_id}/r2/buckets/{bucket_name}/domains/managed`**, request JSON **`{"enabled": true}`**, result includes **`domain`** and **`enabled`**. Attach-custom-domain API is **`POST /accounts/{account_id}/r2/buckets/{bucket_name}/domains/custom`**; follow the documented request and domain/zone requirements and subsequent status checks. Do not fake success from a 2xx response without validating `success` and returned fields.
- Official documentation:
  - https://developers.cloudflare.com/r2/buckets/public-buckets/
  - https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/domains/subresources/managed/methods/update/
  - https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/domains/subresources/custom/methods/create/

**UI sketch (conceptual only, actual implementation uses current History layout):**

```text
Screenshot  ·  3 of 3 verified
┌───────────────────────────────────────┐
│ ONE shared screenshot image thumbnail │
└───────────────────────────────────────┘
┌ Destination card 1 ──────────────────────────────────────┐
│ redown / screenshots / image.png   Verified    [GO TO]   │
│  ▸ URLs  (independent expandable list for THIS output)  │
│     Development URL [Copy] [Open]                       │
│     Custom URL 1    [Copy] [Open]                       │
└─────────────────────────────────────────────────────────┘
┌ Destination card 2 ──────────────────────────────────────┐
│ archives / captures / image.png   Verified    [GO TO]   │
│  ▸ URLs  (separate; THIS bucket and exact object key)   │
└─────────────────────────────────────────────────────────┘
┌ Destination card 3 ──────────────────────────────────────┐
│ backups / shots / image.png       Verified    [GO TO]   │
│  ▸ URLs  (separate; THIS bucket and exact object key)   │
└─────────────────────────────────────────────────────────┘
↑ Entire screenshot History entry scrolls vertically if long.
Each card's URLs may independently scroll beyond ~240px.
NO thumbnails inside destination cards. No one giant URLs list.
```
**Tests and release gate for section F:**

1. Screenshot with 1 confirmed output + enabled r2.dev returns one correct encoded public URL under image; clicking Copy copies that exact URL.
2. A screenshot saved MONTHS AGO in a bucket with already-enabled r2.dev and 3 active custom domains automatically lists all FOUR correct URLs when the URLs section expands, without any new publication/setup step, prompting, or reupload. Existing active custom domain(s) + disabled r2.dev show ALL actual active custom URLs and do not prompt for public development.
3. No public domain: just expanding URLs performs no writes; explicit Enable triggers one clear confirmation; Cancel performs zero provider mutations; Yes performs exactly one scoped managed-domain enable and re-read; actual provider domain is displayed after enabled.
4. Optional custom domain absent: actual r2.dev URL remains shown. Custom domain entered with valid owned zone: attach, status pending, eventually active and then show its URL **in addition to ALL existing active public domains**. Invalid/unowned domain: short actionable error; all previously discovered working links remain unaffected.
5. Three destinations across two buckets, each with 0–N active domains: display every available URL for each confirmed output grouped by exact destination; never mix account/bucket/keys; deduplicate identical URLs only; one destination failure does not block other URLs. Assert 1 r2.dev + 6 active custom domains produces 7 clickable/copyable URLs for ONE verified object, with no cap.
6. Disabled managed domain or custom domain reported inactive: not represented as an active public URL. Unknown API status: “unavailable” instead of invented URL. Test domain inventory pagination, stale cached domains, and opening URLs for screenshots created before the URL feature was installed; no setup wizard should appear for already-public buckets.
7. Special keys containing spaces, Unicode, #, %, ? and nested prefixes produce exactly correct URL paths.
8. Existing History image previews, thumbnail lazy-loading, file Get URL, Cloudflare OAuth, screenshots direct upload/verification, Simple/Narrow/Depth right-click and restart recovery regressions remain green.
9. Installed Chrome + local HTTPS Cloudflare API fixture tests actual confirmation, list, copy, optional custom domain, and shows correct public links in History. **Real Cloudflare account access and DNS activation must be reported as untested if unavailable.**

10. Each individual destination card's URLs expander remains compact with 1–2 domains; with 20 or 100 active URLs in a single output, its own URL region may scroll, and all Copy/Open remain accessible. With 20 or 100 destination cards, the entire screenshot History entry itself scrolls inside a bounded height without expanding all other History entries or trapping focus.

**IMPORTANT product constraint:** public r2.dev access makes the entire selected bucket accessible over the internet (where keys are known), and Cloudflare says r2.dev is rate-limited/development-only. Disclose that consequence clearly in the one user-initiated confirmation, never turn it on automatically just to render an image thumbnail. Authenticated thumbnail previews continue to work for PRIVATE buckets.

---

## G. Release Ctrl+Shift+F8 — owner instruction (November 20, 2026)

**User wants Ctrl+Shift+F8 FREE/UNASSIGNED, not intercepted by Click2Cloud.** Keep `Ctrl+Shift+F7` for the Explorer filename-search shortcut.

The current code has different commands (do not conflate their functionality):
- `src/api/shortcuts.mjs` declares `explorer.toggleToolbarRows` → **Ctrl+Shift+F8** (toggles Explorer toolbar between one/two rows).
- Same file declares `explorer.focusSearch` → **Ctrl+Shift+F7** (focuses filename search).
- `extension/shortcut-settings.mjs` renders bindings from this command catalog; `extension/app.mjs` dispatches the corresponding shortcuts; `extension/explorer-layout.mjs` supplies `explorer.toggleToolbarRows` and exposes the toolbar splitter/row resize control.

**Implement on this branch:**
1. Remove the `Ctrl+Shift+F8` default keyboard binding and **retire the dedicated `explorer.toggleToolbarRows` keyboard command from the active shortcuts catalog**. Do not reassign the toolbar toggle to another key automatically. Do not keep a hidden keyboard listener that still intercepts Ctrl+Shift+F8. This chord becomes available for the browser, other applications, or a future manual user assignment.
2. Keep the toolbar row count / resize feature available through its normal mouse/pointer and keyboard-accessible UI control. Removing F8 must NOT remove toolbar layout settings, splitter dragging, or the ability to choose the row count. Do not break Explorer toolbar rendering.
3. Keep `explorer.focusSearch` **Ctrl+Shift+F7** enabled, plus `Ctrl+Shift+F9` panel-split reset and existing screenshot shortcuts. Do not change their command IDs, meanings, or user-selected settings.
4. Handle existing stored shortcut preferences: if `commandShortcutBindings` contains a historical override for `explorer.toggleToolbarRows`, it must no longer activate; loading/resetting settings must not resurrect it. Prefer an additive migration or catalog filtering that preserves remaining valid overrides and user custom key mappings. In Settings → Keyboard Shortcuts remove the obsolete Toggle toolbar rows shortcut row, and update any tooltips, `aria-keyshortcuts`, help text, and docs that still claim F8 is in use.
5. **Release** means that pressing Ctrl+Shift+F8 while Click2Cloud Explorer has focus must not call its toolbar-toggle command, preventDefault(), change toolbar row count, or claim the chord. The chord itself should not be globally marked reserved if you want it available for future customization.

**Acceptance tests:** Ctrl+Shift+F8 is a no-op in the extension even with historical saved overrides; the one/two-row toolbar UI still works; F7 focuses Search; F9 still resets panel split; Alt+Q and Ctrl+Shift+Y screenshot behavior remains unchanged; all remaining shortcut settings persist across reloads and reset defaults correctly; no impact to R2 upload/History/URLs/themes.

This change is part of the SAME experimental branch, not a reason to rewrite the shortcut subsystem or the save engine.


---

---

## H. PRECISE RIGHT-CLICK SCOPE CORRECTION — owner superseding instruction (Nov 20, 2026)

**CRITICAL CORRECTION TO PRIOR INCORRECT INSTRUCTIONS: REMOVE THE SCREENSHOT SUBMENU FROM CHROME'S NATIVE RIGHT-CLICK MENU ONLY. KEEP `Screenshot2Here` IN CLICK2CLOUD FILE EXPLORER'S OWN RIGHT-CLICK MENU, COMPLETELY FUNCTIONAL.**

These are TWO DIFFERENT context menus with separate jobs. The owner never authorized removing `Screenshot2Here`. Earlier wording requiring its removal was an assistant mistake and is explicitly WITHDRAWN. Follow this section over any other contradictory language in this request. Do not infer that removing one screenshot UI requires removing another.

### REMOVE ONLY Chrome's native webpage right-click screenshot submenu

- Remove `Screenshot` and its submenu items, including `Choose folder…` and destination entries, from the **native Chrome context menu** on webpages, images, links, selections, etc.
- Relevant code: `src/chrome/screenshot-menu.mjs` generates this native submenu; `extension/screenshot-background.mjs` provides `registerExtras` and `onNativeClick`; `extension/background.mjs` wires these to `createChromeRegistrar({registerExtras:screenshots.registerExtras,extraClick:screenshots.onNativeClick,...})`. Remove or deactivate **only the native screenshot menu registration/dispatch paths**. Do not disturb normal browser right-click Cloudflare Save actions.
- `src/chrome/registrar.mjs` uses `chrome.contextMenus.removeAll()` during reconciliation. Confirm stale Chrome screenshot entries disappear after **Reload on an existing installation**, without uninstalling Click2Cloud or losing its storage, settings, OAuth or saved rules.
- Keep `contextMenus` permission for actual non-screenshot Save menus. Do not touch the reliable Simple/Narrow/Depth menu engines.

### PRESERVE COMPLETELY the Click2Cloud File Explorer Screenshot2Here feature

- `extension/app.mjs` currently registers `action('Screenshot2Here',()=>screenshotUI.configureHere(structuredClone(t)))` when right-clicking an Explorer folder/root. **LEAVE THIS ACTION IN PLACE. DO NOT REMOVE, HIDE, RENAME OR DISABLE IT.**
- This action CONFIGURES an existing or new Screenshot rule for the clicked Explorer directory. It is NOT the unwanted Chrome native webpage right-click screenshot capture menu. Keep the exact selected directory, website matching, add/replace rule handling, normal Save behavior, and active rule IDs intact.
- Keep `extension/screenshot-page.mjs`'s `screenshotUI.configureHere` and its supporting folder → Screenshot-rule editing path. It must still be reachable directly by right-clicking a directory INSIDE Click2Cloud File Explorer, with the existing configuration and persistence semantics.
- Removing Chrome's native one-off capture submenu must not accidentally remove shared helpers, screenshot rule handling, folder selection, or routing used by Explorer `Screenshot2Here` or the main `More → Screenshots` settings page.

### ALSO PRESERVE

- `More → Screenshots` (plural) UI, rule configuration and editing.
- `Alt+Q` and `Ctrl+Shift+Y` screenshot capture → direct Cloudflare R2 upload → readback SHA-256 verified History receipts.
- Default screenshots rule, previews, URLs, all enabled public domains, quiet notification preference, other context-menu actions.
- Non-screenshot browser right-click Save and all File Explorer operations.

### Strict mandatory acceptance tests

1. Browser webpage/image/link native right-click: **NO Screenshot root or nested Screenshot option.** Existing native Save entries still work exactly as before.
2. Click2Cloud File Explorer right-click on an authorized directory: **`Screenshot2Here` IS PRESENT, CLICKABLE AND WORKS.** Assert it opens rule configuration for that exact directory, permits appropriate site scope and saves a persistent rule WITHOUT taking a screenshot merely on Save.
3. Using the configured Explorer `Screenshot2Here` rule, press Alt+Q or Ctrl+Shift+Y on a matching ordinary webpage; verify the image reaches that EXACT R2 folder and gets an independent receipt. Verify edits/add/replace and existing rules remain intact.
4. Upgrade/reload an existing installation: old native Screenshot submenu disappears but Explorer `Screenshot2Here` REMAINS, and user settings, saved rules, OAuth, History and all other right-click menus are intact.
5. The browser test must distinguish **native Chrome page context menu** from **internal Click2Cloud Explorer context menu**; do not write an assertion that both must lack screenshot functions. Maintain regression coverage for each separately.

**Do not remove any screenshot feature other than the unwanted native Chrome browser context-menu Screenshot submenu. If `Screenshot2Here` is missing from Click2Cloud Explorer, the repair is a FAILURE.**

**Deliver actual working code, tests and installable build—not only a plan.**


---

## I. Screenshot History GO TO for EACH destination — owner requirement (November 20, 2026)

**Every Screenshot History entry must provide working GO TO navigation to the actual saved location(s) inside Click2Cloud File Explorer.** If the screenshot was sent to 1 folder, that folder gets GO TO; if it was sent to 3 folders, there are **3 separately functional GO TO buttons**, one beside each exact output. No arbitrary destination cap. One screenshot capture is one History entry, with a potentially multi-destination list.

**NON-NEGOTIABLE PRESENTATION: ONE IMAGE PREVIEW AT THE TOP OF THE SCREENSHOT HISTORY ENTRY, NEVER ONE PREVIEW PER DESTINATION.** Even with 3, 20, or 100 locations, the capture has ONE shared thumbnail, then a vertically scrollable (when long) collection of INDIVIDUAL destination cards. **Each destination card contains exact location/status, its OWN GO TO button and its OWN independently expandable URLs section, but NO second image, preview slot, image loading animation or duplicated screenshot thumbnail.** Use one confirmed output for the shared preview (or a safe temporary-cache fallback), without implying sibling outputs are verified. The ENTIRE screenshot entry must become scrollable when excessively long.

**Current root cause:** `extension/history-page.mjs` renders `screenshotRow(r)` separately from ordinary image rows, without any GO TO button. Ordinary `row(r)` has `data-history-goto` tied to the whole operationId, and `extension/app.mjs`'s existing `goTo(operationId)` calls `openRemoteResult({operationId})` then `navigate(result.target)` / `revealListedFile(...)`. That method assumes ONE result target; a screenshot receipt instead has `r.screenshot.outputs[]` with **separate exact destination/account/bucket/key/outputId** for each physical save. Never treat the whole screenshot's operationId as identifying all locations or navigate to whatever bucket is currently selected.

**Required UI/behavior:**
1. Render a separate destination CARD for EVERY output under the ONE shared screenshot preview. Each card has (a) its exact account/bucket/prefix/key and verified/failed/pending status, (b) its own **GO TO** button, (c) its own accessible expandable **URLs** section directly below its location/actions. For 20 outputs, all 20 independent cards are reachable inside the bounded scrollable screenshot History entry. A top-level GO TO is optional only for the single-output case and must never silently choose among multiple outputs.
2. Clicking a destination-specific GO TO must switch to File Explorer, select the recorded Cloudflare account + bucket, navigate to the **exact containing folder prefix** derived from that output's saved object key/authorized target, and where the object exists, select/focus/highlight that EXACT PNG, consistent with normal History GO TO. No recapture, reupload, source rewrite, rule modification, or cloud mutation merely to navigate.
3. Use `outputId` (plus capture/operation ID) as the stable per-button lookup handle; obtain the corresponding frozen output `destination` and `key` from trusted retained screenshot History data, not user-controlled click-supplied account/key strings or the present selected/default destination. Button attributes should not authorize arbitrary path selection. Validate the selected account, bucket, and key and recheck existing session authority before opening it.
4. For **confirmed** outputs, attempt file-existence validation and highlight the actual file. An R2 direct Object API screenshot must NOT require the screenshot Worker to be provisioned merely for GO TO. If the usual `fileMetadata`, folder listing, or `openRemoteResult` flow requires a Worker and breaks for direct screenshot files, create the **smallest safe read-only navigation adapter** using existing authenticated Cloudflare API to resolve the actual recorded account/bucket/key. Then call existing Explorer navigation machinery; do not weaken existing anti-stale-navigation protections.
5. For **pending/failed/unconfirmed** outputs, retain a GO TO action so the user can inspect the intended **directory** when the account/bucket still exists, but DO NOT claim the PNG exists or highlight a nonexistent object. Distinguish “Open destination folder” from “Verified file present” via normal status text. If the configured account no longer exists, bucket is inaccessible, or folder listing is offline, show a short accurate message and keep the History entry and receipt.
6. Preserve the existing working GO TO behavior for ordinary image/download History. Do not break `Screenshot2Here` in Click2Cloud File Explorer (that is a completely separate feature the owner explicitly ordered to KEEP) or ordinary Chrome right-click Save.
7. For prior Screenshot History entries already recorded, GO TO must work as long as the receipt has a valid destination/key and current authorization allows it. No dependence on the temporary 1-hour retry-image cache or whether public URL publication was set up. A private R2 bucket is navigable with the user's authenticated access.
8. Keep History compact and accessible: each location has clear button labeling (e.g., “GO TO — redown/screenshots/”), sensible keyboard focus, per-button busy/error state; no entire-row disabled state preventing navigation to the other locations.

**Mandatory real tests / acceptance:**
- With 1, 3, 20 or 100 destinations, screenshot History renders exactly ONE top-level thumbnail and **one card per destination**. Each destination card has its own GO TO AND independent expandable URLs, but NO duplicate thumbnail/preview fetch. The complete screenshot entry scrolls when long. Verify the thumbnail uses one confirmed output only, with partial verification truthful.
- One screenshot saved to 1 folder: one GO TO opens that exact folder and highlights the screenshot PNG.
- One screenshot saved to 3 distinct folders (possibly different buckets/accounts): **3 GO TO buttons**, each opens ITS OWN exact recorded folder and highlights ITS OWN exact PNG; no silent selection of the first/default/current bucket.
- Partial 2/3: both confirmed files navigate correctly; third GO TO opens the intended location where permitted but says unverified/not found, never fabricates a saved object.
- A screenshot from a previous session, after extension/Chrome reload and after retry image cache expiry, still navigates from retained receipt and authorized R2 object.
- Missing/revoked Cloudflare account, deleted bucket, missing object, and navigation interrupted by user produce truthful local errors, do not change current file, and leave other GO TO buttons usable.
- No forced Worker setup for direct R2 screenshots; preserve History image preview, expandable all-domain URLs, all saved receipt outputs, Simple/Narrow/Depth menus and normal GO TO regression tests.

**This is required in the SAME dedicated experimental branch, alongside quiet notifications, the two themes, screenshot previews/URLs, and removal ONLY of the Chrome browser Screenshot submenu. DO NOT REMOVE Explorer Screenshot2Here. Implement and prove, not merely propose.**

---

## J. OWNER CLARIFICATION: BUNDLED TYPOGRAPHY WITH EACH PALETTE + FORMAT-ROBUST SCREENSHOT PREVIEW (Nov 20, 2026)

**Typography follows the chosen palette AUTOMATICALLY. NO stand-alone Font selector.**

- Keep precisely two selectable themes: Minimal (default) and Remote V1. Only within Minimal, expose five named selectable **coordinated color-and-typography designs**: Original Rose, Ocean Blue, Emerald Forest, Amethyst, Sunset Amber.
- For **each** palette, thoughtfully choose a **harmonious group of fonts** (heading, body copy, buttons/controls/monospace as useful). Their relative tone and readability must complement one another AND that palette's colors, in both light and dark mode. Do not simply apply a random generic font separately from the colors. Automatically apply the full, coordinated typography set whenever the palette is selected.
- Use local/system fonts with reliable cross-platform fallback stacks, not external downloads; visually inspect examples in headings, paragraph text, folder names, History labels, dialogs, and compact buttons. Preserve accessibility/readability and avoid layout changes, clipping, or lost UI controls. CSS font family/weight tokens should affect presentation, never saving functionality. Account for OS-specific font availability with sensible fallbacks.
- Store and restore the chosen **single palette identifier**; no extra `fontPreference`, no per-font editor. If an earlier experimental state contains a font preference, safely ignore/migrate without erasing palette, theme, account, cloud, or screenshot settings. Preserve Remote V1's original appearance and typography.
- Verify every palette renders with its intentional heading/body/control combination; switching palette changes font group AND colors together; restoring a palette after reload restores the same cohesive design. There is no separate Font selector in Settings.

**PNG technicality — explain and implement narrowly:**
- The existing capture engine's `src/chrome/visible-tab-screenshot.mjs` explicitly requests `chrome.tabs.captureVisibleTab(...,{format:'png'})`, checks the `data:image/png` and PNG signature; `src/cloudflare/screenshot-wire.mjs` gives the file a `.png` name; `src/cloudflare/screenshot-direct-upload.mjs` writes `content-type:image/png` and uses SHA-256 byte-for-byte verification. This is deliberate and correct. **Do NOT change the screenshot capture/upload format, extension, key, checksum, receipts or retry contract as part of this UI branch.**
- For **History preview only**, refer to the **saved screenshot image**, not a universal .png-only assumption. Read from the exact recorded verified R2 object. Decode the actual supported image MIME/content securely and render a thumbnail as other History images do; it should work with today's PNG files and remain compatible with supported formats in any future capture engine. Do not fail just because an image's extension differs from .png, and do not rewrite/convert the stored source just to preview it.
- Do not confuse the optional thumbnail image format (the existing ordinary History view can convert a thumbnail to WebP in memory) with the **stored original screenshot** (which remains PNG today). Preview creation never changes bytes in Cloudflare R2, history proofs or public URLs.
- Add tests: today's saved PNG opens and previews correctly; if the History reader is given a valid supported non-PNG image object in a controlled fixture, preview logic decodes it without an artificial hardcoded `.png` requirement; unsupported/corrupt bytes get a graceful placeholder with History receipt preserved.

**This clarification supersedes any earlier 'font selector,' 'persist font separately,' or 'PNG-only preview' phrasing in this file.**

---

## K. Move Remove Default Location and repair Get URL activation — REDOWN comparison audit, 20 Nov 2026

These are ADDITIONAL owner requirements on the SAME experimental branch, not permission to modify main or the existing working screenshot branch. Make actual source changes, prove them, build, commit and push.

### K1. Move Remove Default Location to the VERY BOTTOM of Settings

- In extension/app.mjs renderSettings(), the existing conditional Remove Default Location button (id clear-default) is currently placed immediately after the Settings heading.
- Move the SAME control to the literal very bottom of the fully rendered Settings view, BELOW all other settings including controls appended dynamically (Debug, History preferences, Keyboard Shortcuts, other preferences). An element placed at the end of initial innerHTML is NOT necessarily bottom after later DOM append calls.
- Prefer a small separated final section titled Default location with the existing Remove Default Location button. Keep it hidden when no default is configured.
- Keep existing confirmation, clearDefault behavior, state persistence, saved destinations, cloud objects, existing event binding and keyboard accessibility. Do not create duplicate IDs or clear cloud data.
- Browser test presence/absence and actual bottom-of-DOM order in Minimal and Remote V1.

### K2. BUG: Click2Cloud says Allow Public URL? Yes but never actually activates public URLs

Owner symptom: selecting Get URL on an image without an active domain repeatedly shows Allow Public URL?; clicking Yes then Recheck yields "No verified public URL for this object. To add one, configure the bucket’s public domain in Cloudflare and Recheck." and "Domain check updated." The same Yes prompt reappears when opening the SAME image again.

CONFIRMED ROOT CAUSE IN CLICK2CLOUD:
- extension/explorer-exports.mjs urls(source,entry): reads getPublicUrls and when info.domains is empty asks Allow Public URL? But the Yes callback is merely document.querySelector('#public-url-yes').onclick=open. That only opens the editor: NO managed-domain API mutation happens.
- extension/explorer-exports.mjs domainControls(): Recheck invokes get() and re-renders info; Submit only rechecks the typed domain. "Domain check updated" means the lookup finished, NOT that public access was enabled, a hostname attached, or a public URL verified.
- src/api/service.mjs: getPublicUrls is an inspect/read-only method. It invokes readCustomDomains and readManagedDomain and returns verified domains. It has no effectful enable action.
- extension/background.mjs readManagedDomain/readCustomDomains read bucket domain state only. Existing image URL card DOM below the custom-domain input is capable of rendering the returned URLs, but receives an empty list because nothing was enabled by the Yes action.

REDOWN REFERENCE — use the tested pattern, not a wholesale port:
- thanks-cohn/REDOWN extension/public-addresses.js: popup only offers enable when no usable URL exists and managedPublicAccess is confirmed "disabled" for the exact selected bucket. Consent is explicit and describes bucket-wide public exposure. It invokes the dedicated enable callback, waits, and reloads URL discovery for the SAME file after success.
- thanks-cohn/REDOWN extension/options.js: enable callback sends the separate cfEnablePublicAccess message, distinct from read-only cfPublicAddresses.
- thanks-cohn/REDOWN extension/background.js: enableBucketPublicAccess(message,sender) verifies an authorized Explorer caller and explicit confirmed:true, GETs managed-domain state, only PUTs {"enabled":true} if currently disabled, then GETs again and requires enabled:true plus a valid actual r2.dev domain. It returns distinct denied/auth-expired/unconfirmed codes. bucketPublicAddresses discovers managed and all custom domains without changing them.
- REDOWN tests/public-addresses.test.mjs and tests/get-url.test.mjs cover scoped one-time enable, no write for already-enabled buckets, readback, URL list refresh, cancellations, failures, stale selection, and multiple domains.
- REDOWN uses additional Worker asset domains and an independent UI. DO NOT copy its Worker-specific URL path, special Worker setup, hidden credentials, or unrelated features into Click2Cloud. Use its read/PUT/readback and honest state transitions only.

IMPLEMENT THE WORKING CLICK2CLOUD REPAIR:
1. On Get URL, discover the ACTUAL currently enabled managed development hostname AND all active custom domains for the EXACT currently selected account/bucket. If even one active URL exists, show all actual exact-object URLs immediately in the existing Get URL URL cards UNDER the custom-domain input. Do NOT show initial public-enable consent for already-public buckets. An active custom domain works with r2.dev disabled.
2. When there are NO active public URLs, and managed public status is confidently DISABLED (not unknown due to permissions or network), offer an explicit enable action that clearly states an entire R2 bucket will become publicly readable by anyone knowing object URLs. Never make the bucket public just because the user opened Get URL, clicked Recheck, or viewed History.
3. The Yes action MUST actually invoke a separate validated, trusted, effectful command in src/api/service.mjs, with an authenticated Cloudflare mutation in extension/background.mjs. The command must be scoped to the exact user-authorized account and bucket with explicit confirmation, respecting authorization and any existing agent permission-grant boundary. The existing read-only getPublicUrls method must remain read-only.
4. Use Cloudflare's documented managed-domain operation: PUT /accounts/{account_id}/r2/buckets/{bucket_name}/domains/managed with JSON body {"enabled":true}. Follow the REDOWN idempotent GET-before-PUT design: if already enabled, no redundant PUT. After any necessary PUT, independently GET the SAME managed-domain endpoint and require Cloudflare to return enabled:true with a real valid managed r2.dev hostname. Never fabricate pub-... or confuse the exact bucket with a default/current one.
5. Immediately refresh getPublicUrls for the SAME selected image and show the full development URL directly UNDER the Get URL custom-domain input, alongside EVERY active custom-domain URL. Do not require a second right-click, a second Yes, or manual Recheck. Keep the selected file/key and optional text field intact as the mutation resolves. Reopening Get URL on that same image or a sibling in that bucket must recognize previously enabled URLs from Cloudflare state and never ask again.
6. Recheck is a read-only state refresh. Its response must be semantically clear: "Public URL enabled" ONLY when the actual managed domain was confirmed; "No public domain configured", "Cloudflare domain check incomplete", "Cloudflare denied activation", "Reconnect required" etc. as applicable. DO NOT imply "Domain check updated" means activation succeeded. Do not claim public-object anonymous GET reachability unless separately checked.
7. If PUT fails (401/403/scope, network, provider error), or readback is disabled/ambiguous, show one actionable error while preserving user context, and allow retry after permission/state resolution. DO NOT get into endless consent loops after ambiguous results. A 2xx response alone is insufficient for success.
8. The custom-domain field is currently a read-only validation flow, not an actual attach action. Never imply that clicking Submit created a domain association. Implement a separate authorized attach operation if genuinely supported or label the field "Check existing domain" and link to Cloudflare's real setup. Keep the desired helper copy "If your nameservers are already with Cloudflare, simply add your domain!" only in a truthful optional attach flow.
9. Preserve exact nested object keys (spaces, Unicode, reserved chars), all active public domains without a two-link cap, full Copy values, per-bucket isolation, and no URL for an unverified file. No new screenshot Worker dependency. Reuse current objectUrls(), verifiedDomains(), verifiedDevelopmentDomain() and existing Get URL UI.
10. Screenshot History > URLs must REUSE the repaired bucket-domain inspection and explicit enable/readback behavior. Avoid competing duplicate public-domain activation implementations or inconsistent states in Get URL versus screenshot History.
11. Continue to keep File Explorer Screenshot2Here and More > Screenshots. REMOVE only the unwanted Chrome native webpage Screenshot submenu per section H. Preserve all ordinary Save, Simple/Narrow/Depth and existing screenshot operations.

MANDATORY TESTS:
- Reproduce the existing RED case: Yes only opens editor, zero PUT, Recheck returns empty, same image asks again. After repair this sequence MUST be impossible.
- Disabled bucket: confirm/cancel causes ZERO writes. Confirm/Yes causes exactly one scoped PUT when needed; GET readback verifies enabled:true and exact provider hostname; same-dialog URL cards appear with exact asset URL.
- Reopen the same image (and a different object in same already-enabled bucket) after closing window and restarting extension: ZERO further consent or PUT, real development URL appears immediately from read-only GET.
- Already enabled r2.dev: Get URL immediately displays the actual managed URL. Already public with custom domain but r2.dev disabled: show all actual active custom URLs and never insist on managed enable.
- Many active domains from same bucket: every one shown; different account/bucket results never cross; no invented URL or stale result after switching files.
- Cloudflare 401,403, failed PUT, readback lag, unknown managed-domain status, malformed response, API exception: errors are clear and accurate, no success unless confirmed, no repeated phantom-activation UX.
- Build and focused tests, existing Get URL TXT/grouped directory exports, screenshot receipts, History image/URLs, Screenshot2Here, F7/F9, two themes and ordinary right-click save regressions. Include installed-Chrome browser evidence where runnable; distinguish local Cloudflare mock/fixture from live account verification.

Official endpoint documentation: https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/domains/subresources/managed/methods/update/
REDOWN reference documentation: thanks-cohn/REDOWN docs/explorer/GET_URL_AND_STATUS.md (section "Enable public URL from the URL menu").

---

## L. Ctrl+Shift+F9 — configurable divider cycling (owner-confirmed)

Replace reset-only behavior for the File Explorer vertical pane divider with a repeating cycle whenever Ctrl+Shift+F9 is pressed while Explorer is focused.

- Default BOTH SIDES: Center 50% → far left 0% → Center 50% → far right 100% → Center 50% → far left 0% ... forever.
- LEFT ONLY: Center 50% → far left 0% → Center 50% → far left 0% ... forever.
- RIGHT ONLY: Center 50% → far right 100% → Center 50% → far right 100% ... forever.
- Expose a three-choice Settings preference named Ctrl+Shift+F9 divider cycle with Alternate left/right (default), Left only, Right only. Persist it across Chrome restarts; do not overwrite the saved physical divider position merely because the user changes the mode.
- On initial activation from an arbitrary manually dragged divider position other than the center/extreme known to the cycle, reset to center, then follow the chosen pattern. If already centered, the first press should go to the next extreme rather than wasting a press on an unchanged center. Always return to center between extremes. If manually dragged after cycling, reset progression predictably.
- Existing extension/explorer-layout.mjs uses split percentages 0 (folder tree collapsed), 50 (center), 100 (file area collapsed). Use these real semantics, not 4%/96% approximations. Reuse existing changeLayout('split',value), persistence, ARIA/inert handling, and current layout architecture. The shortcut must work even after either pane collapses and must return to center next press.
- Preserve manual splitter dragging, keyboard separator control, double click to center, other UI controls, preferences, and folder listings.
- Keep Ctrl+Shift+F9's existing stable command ID explorer.resetPanelSplit and default chord. Change only the display label to 'Cycle Explorer divider' or equivalent truthful wording. Do not restore the retired Ctrl+Shift+F8 command.
- Tests: assert at least 12 consecutive presses in each of the three modes, manual drag between presses, collapse at both extremes, mode changes, persistence across reload, and no File Explorer rendering/toolbar/save side effects.

## M. Ctrl+Shift+F7 — ONE KEY from ANY CHROME WEBSITE opens File Explorer AND search

OWNER INTENT: The user can be reading ANY ordinary webpage in Chrome, without Click2Cloud already open or focused, press Ctrl+Shift+F7 ONCE, and Click2Cloud's Shelf/side panel opens directly to File Explorer, its filename search field pops OUT, receives keyboard focus, and is immediately ready for typing. This is not just 'focus search inside an already opened Explorer'! Pressing F7 while the Shelf is already open should switch to Explorer and expand/focus search again. Do NOT replace the history shortcut Alt+Shift+H or modify screenshot shortcuts. Pressing Enter must NOT hide filename search; only Escape or its X should dismiss it, per earlier search UX contract.

Source audit:
- Current src/api/shortcuts.mjs declares explorer.focusSearch Ctrl+Shift+F7 as an extension-INTERNAL UI command with context:'explorer' and requires:'activeDirectory'.
- Current extension/shortcut-settings.mjs listens for keydown inside the extension document, not the active website. It cannot trigger when the extension Shelf is closed or another Chrome website has keyboard focus.
- Current extension/explorer-layout.mjs has focusSearch() logic, including a pinned pop-out search panel. Reuse it rather than creating an unrelated second search bar.
- Current extension/background.mjs routes Chrome commands via chrome.commands.onCommand for history and the screenshot commands. Its shelfHistory state/sidePanel infrastructure and extension/app.mjs's show('explorer') should be reused for startup and view readiness.

Required sequence: user keyboard shortcut event in Chrome → trusted extension action/open Shelf (or bring existing Shelf to front) → select File Explorer view → await Explorer initialization, restored authorized folder and search component readiness → run current pop-out focusSearch() on the actual #filename-search input → keyboard focus placed there. No user need to first click Click2Cloud, change views, or click Search.
Do NOT block F7 merely because context.view != explorer or activeDirectory is currently false; opening the Explorer and showing/focusing its search is the point. If no account or bucket is authorized, show the Explorer connection/choose-location status accurately and preserve a ready search UX when a directory becomes available. Do not route the shortcut to History.
Use one persistent/sequence-scoped request intent to survive MV3 service-worker cold boot and sidePanel startup. Avoid race conditions where a delayed History intent or previous navigation steals focus; repeated presses while opening should deduplicate, not flicker/close the Shelf. Preserve app restore behavior, access boundaries, and Chrome's user-gesture requirements for sidePanel.open(). Calling sidePanel.open must occur within a valid user-triggered command context, not after long awaited reads. No URL/tab scraping or webpage content access is needed.

IMPORTANT CHROME API FEASIBILITY GATE: Official Chrome commands documentation currently lists letters, digits, navigation and media keys, but NOT function keys F1–F12 as supported suggested_key values. Therefore DO NOT blindly put Ctrl+Shift+F7 into extension/manifest.json and claim success: that could make the extension fail manifest validation. First confirm with the actual target installed Chrome version whether that exact chord can be registered by chrome.commands and is returned as active by chrome.commands.getAll(). Chrome can also reject conflicting shortcuts or restrict built-in browser shortcuts. If F7 is unsupported as a native Chrome-wide command, preserve in-Shelf F7 behavior and the new open-Explorer/focus-search command action, expose a Chrome-supported alternate command binding as an explicitly documented fallback that the owner can set in chrome://extensions/shortcuts; never silently substitute a different key or promise that exact F7 works everywhere. Do not request blanket permission or inject always-on content scripts across every site solely as a hidden workaround. Report the exact observed Chrome limitation and a precise user choice for binding.

Chrome 'in browser' shortcut means any normal Chrome tab while Chrome has focus, NOT system-global across other desktop applications. Do not set global:true automatically. Use real Chrome keyboard command integration rather than page-specific keydown listeners; no prompts/permissions needed merely to search local Cloudflare folder names.

Acceptance: start with Shelf closed and focus on ordinary HTTPS websites (at least three unrelated domains), press requested F7 chord where Chrome supports it or supported configured fallback where it does not; Shelf opens directly to Explorer, pop-out search visible and focused, ready for typing; also works from Shelf on History/Remotes/Settings and with Shelf already on Explorer; Escape/X close, Enter does not; Alt+Shift+H still toggles History independently. Test Chrome cold boot/MV3 restart, permission not connected, delay races, rapid repeats, and restoration, and report exact active Chrome binding in deliverable. Do not merely test in-app keyboard simulation.

This feature and L are required in the SAME experimental implementation, test, push, build deliverable.

---

## N. FINAL OWNER CORRECTION — ONE preview, INDIVIDUAL destination-card URLs; correct File Explorer logged-in/logged-out controls

**Supersedes any earlier phrase suggesting one shared screenshot-level URLs expander or a destination row with GO TO only. The user explicitly requires one screenshot preview PER CAPTURE, then a card PER DESTINATION, where EACH card independently owns its GO TO AND its URLs disclosure.** Also supersedes any older wording showing Open File Explorer while already inside a logged-in Explorer.

### N1. Screenshot History: one shared preview; one destination card with GO TO + URLs per output

- Top of the single screenshot History entry: ONE actual screenshot image preview only, with capture status/time and overall verification count. Never duplicate the image for any output.
- Below that, render exactly one destination CARD per recorded screenshot output (across accounts and buckets), with its real location and per-output verification status.
- EVERY card has an independent GO TO button targeting ONLY that output's exact account/bucket/folder/object, and an independent expandable section titled **URLs** directly under that same card. Do not put a single combined URL disclosure immediately under the shared image preview. Do not give card 2's URLs to card 1, or mix across buckets with identical filenames.
- Opening URLs on one destination card does NOT open URLs on every other card, and does NOT change the selected destination or GO TO. Discover and display ALL provider-confirmed enabled managed and custom domain URLs for that card's exact verified object key; make each full URL independently Copy/Open. A private bucket card must accurately show no public URL and its OPTIONAL explicit bucket-wide enable action; failed/unconfirmed outputs must not invent public links.
- The ENTIRE screenshot History entry is vertically scrollable when many cards/details accumulate; cap it to an accessible, responsive maximum height. Individual long URLs sections may also use their own approx. 240px max-height scrolling, but avoid nested scrolling traps, clipped buttons, focus loss, horizontal overflow and unnecessary scrollbars. Preserve the one-thumbnail-only rule.
- Preserve the current screenshot receipt's outputId/captureId as stable per-card selectors; never use the current/default bucket as a fallback. Prior History entries must render the same per-output card UX from their saved receipts.
- Acceptance: 3 destinations from 3 buckets show ONE preview, THREE cards, THREE GO TO buttons, THREE independent URL expanders; open ONLY card 2 URL disclosure and see only bucket 2/key 2 URLs while cards 1/3 stay collapsed. Test multiple domains within one card and a private bucket among public ones. With 100 cards and/or 100 domains, scroll all the way through the screenshot entry and nested URL list, reach last GO TO/Copy/Open, and preserve keyboard access. No duplication of previews.

### N2. File Explorer logged-in/out action — hide Open File Explorer when already there; logged out is Log In

CURRENT SOURCE AUDIT: extension/app.mjs renderConnection() currently renders **Open File Explorer** (`#browse`) PLUS **Sign out** (`#sign-out`) inside #connection while connection.state === CONNECTED. On disconnected status it creates #login instead. extension/app.html places #manage-slot separately at the bottom of #shell with #manage button. Current code does NOT place Sign Out beside Manage Destinations. Correct that UI deliberately.

- Specifically IN THE **File Explorer tab**, when the OAuth connection is truly **CONNECTED**, do NOT display an **Open File Explorer** action at all. It would navigate to the page the user is already on. Do not accidentally hide or disable the actual top-navigation **File Explorer tab** button (`header nav [data-view=explorer]`): only the redundant action button is being removed.
- When the user is **LOGGED OUT / DISCONNECTED** on the File Explorer tab, the corresponding visible action should read **Log In** (not Open File Explorer), and clicking it should invoke the existing Cloudflare login flow. When a reconnect is explicitly needed, truthful **Log In / Reconnect** language is allowed, but never mislabel the action as opening Explorer. CONNECTING/VERIFYING/UNKNOWN should show honest pending/check states, never falsely show Sign Out as authenticated.
- On successful login, the Log In action disappears and the authenticated Explorer content is shown without an Open File Explorer action. On sign out, the Log In action reappears and any Sign Out button vanishes immediately. Do not depend merely on which tab is visible: actual verified connection state controls login/signout visibility.
- **REQUIRED, NOT OPTIONAL: The Remotes tab MUST KEEP its existing Open File Explorer button.** The 'hide redundant Open File Explorer' instruction applies ONLY to the File Explorer tab while authenticated. Clicking the Remotes tab's button must continue navigating to File Explorer as before. Do not globally hide, delete, rename, disable or remove the Remotes button or its handler. Preserve existing Remotes login/disconnected-state behavior rather than making the Explorer-only visibility rule apply there.

**Tab-specific acceptance matrix (no ambiguity):**

| Current tab | Cloudflare auth | Open File Explorer action | Log In action | Bottom Sign Out |
|---|---|---|---|---|
| **Remotes** | Connected | **PRESENT and functional** | Existing Remotes login UX unchanged | Do not duplicate/move the Explorer-footer Sign Out into Remotes |
| **File Explorer** | Connected | **ABSENT (redundant)** | Absent | **PRESENT**, immediately RIGHT of Manage Destinations |
| **File Explorer** | Disconnected | **ABSENT; show Log In instead** | **PRESENT and functional** | **ABSENT** |
| **Remotes** | Disconnected | Keep Remotes' pre-existing controls and authentication handling; do not apply Explorer-only hide rule | Preserve login flow | Preserve existing Remotes auth UX |

Test changing tabs while logged in: **Remotes → Open File Explorer visible; File Explorer → Open File Explorer absent; return to Remotes → Open File Explorer visible again**. This is tab-specific visibility, not a global authenticated-state ban on the button.

### N3. Sign Out immediately to the RIGHT of bottom Manage Destinations, only while CONNECTED

- In File Explorer while truly connected, put **Sign Out** in the SAME layout group as the bottom **Manage Destinations** control (`#manage-slot`, `#manage`) and ALWAYS immediately to its RIGHT, with a consistent gap. Sign Out must not be duplicated up in the Cloudflare connection sidebar. Use the existing disconnect handler and preserve saved destinations / cloud files.
- If Manage Destinations is a small square icon, Sign Out sits to its right; as Manage Destinations naturally expands to its full label, Sign Out naturally shifts right with it; when it contracts, Sign Out moves left. No fixed pixel absolute offsets, overlaps, covering other controls, clipped offscreen, or collision. Layout via one flex/grid group that moves as a unit, with responsive adaptation and accessible reading/tab order.
- Current extension/app.css #manage-slot has absolute positioning and special `data-manage-in-toolbar` behavior for collapsed left pane. Account for both regular and compact/split=0/100 modes: keep controls visible and reachable; when narrow, use sensible responsive abbreviation/wrapping/placement WITHOUT reversing order. The Manage button may change width but Sign Out must always follow it on the right.
- When NOT connected (signed out, never logged in, unknown, verifying, or after disconnect), **Sign Out MUST NOT RENDER**. The existing connected-only disconnect event semantics remain; do not leave a hidden-but-focusable control or stale duplicate ID. All states render from a consistent auth update.
- Acceptance tests: logged out Explorer shows Log In and NO Sign Out; connected Explorer shows NO redundant Open File Explorer button, with Sign Out to the right of Manage Destinations; toggling Manage from icon width to expanded label width shifts Sign Out correctly and never overlaps; ensure behavior works across widths, with collapsed panels, after auth expiry/reconnect, and after sign out/login; maintain Remotes view, keyboard navigation and accessible focus.

**Implement this in the SAME experimental branch together with Sections A–M. Do not mark the current source as already repaired: requirements here remain pending until Codex makes code changes, runs tests, pushes and supplies a build.**

---

## O. Remotes headline and subtitle spacing — text must stay EXACT (Nov 20, 2026)

Owner asks to **space, format, and structure** this exact existing Remotes-tab copy properly. Do NOT rewrite the language, add slogans, substitute synonyms, change capitalization, or change punctuation:

```text
The Future is Now. True Remote is Here.

Nothing ever gets downloaded to your computer.
```

- Use the first sentence as a proper semantic H1 heading (not the literal Markdown `#` character in the UI) and the second as one distinct supporting paragraph directly under the heading.
- Create a compact, clearly structured Remotes introduction/hero group: tidy responsive left alignment consistent with existing design, readable heading line-height, a deliberate but modest vertical gap between headline and subtitle, and a clearly larger gap after the subtitle before the Cloudflare connection card and other Remotes content. Do NOT stack the sentences without breathing room or let default paragraph margins create irregular/inconsistent separation.
- Existing markup is already in `extension/app.mjs` `renderRemotes()` as `<h1 class="remotes-headline">...` followed by `<p class="remotes-subtitle">...`; existing `extension/app.css` has `.remotes-headline` and `.remotes-subtitle` sizes but lacks explicit coordinating margins/gap. Reuse those hooks, optionally wrap them in a dedicated minimal Remotes hero grouping; avoid global changes to H1/P spacing or other tabs.
- The font combinations should follow whichever Minimal color-and-typography palette the user selected; Remote V1 retains its own theme. Structure/spacing stays stable when switching palettes and light/dark modes.
- On narrow Shelf widths, headline may wrap naturally at word boundaries, but do not clip it or overlap the subtitle. Keep good legibility and separation from the Cloudflare card. Do not insert hard-coded `<br>` tags or fake extra blank strings; use semantic HTML and local CSS for spacing.
- Do not remove or change any Remotes login controls or **Open File Explorer button**. The button MUST remain functional on the Remotes tab while connected, per Section N.

Acceptance: in both themes and light/dark at compact and wide widths, exact copy appears once each with a visible intentional heading/subtitle gap and sensible following whitespace; no changes to wording, Remotes actions, other pages or authentication state behavior. Test browser layout or screenshots where available.
