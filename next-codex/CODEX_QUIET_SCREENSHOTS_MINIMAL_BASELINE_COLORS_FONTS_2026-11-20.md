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

- A screenshot History row displays its real thumbnail (per D3). Immediately **under the thumbnail**, ALWAYS show an accessible expander labeled **URLs**, including for screenshots made before this feature existed. The expander is present without running any setup wizard. On expanding, automatically retrieve and populate currently enabled public URLs; users must NOT have to click Enable, add a domain, repeat authorization, or complete a setup workflow to see URLs for an already-public bucket.
- Expanding **URLs** must enumerate **EVERY currently enabled, active, provider-confirmed public hostname attached to EVERY verified screenshot destination bucket**: its r2.dev development hostname **if enabled**, plus **ALL active custom domains** (zero, one, two, ten or more). Render one independently copyable/openable exact screenshot object URL PER distinct active public hostname, not just a fixed pair of “development URL” and “custom URL.” There is NO arbitrary two-link cap or 'first custom domain only' shortcut. Group by verified output bucket/account/key; deduplicate identical URLs only. Preserve all URL paths via exact object keys. Never fabricate URLs, use private Cloudflare API endpoints as public links, or report a link for an unconfirmed object as saved.
- **Discover existing public access FIRST, before proposing any setup.** Read both the bucket's managed r2.dev domain and ALL paginated custom-domain entries from Cloudflare; filter for actual active/usable hostnames. This applies to historical screenshots and buckets made public in the Cloudflare dashboard or by earlier Click2Cloud Get URL workflows. If ANY active public hostname exists, immediately show its exact screenshot URL under the expanded section by default, without waiting for the user to complete this new workflow and without prompting them to republish. If NO active public hostname is found, keep the expander and offer **“Enable public URLs for this bucket”**, which opens a short confirmation naming the actual bucket/account and explaining bucket-wide public exposure. No popup on History open or URL expand; public enable happens ONLY after deliberate button click + confirmation. A custom-domain-only bucket already has public URLs even when r2.dev is disabled.
- On **Yes / Enable**, request enabling Cloudflare's **Public Development URL (r2.dev)** for THAT bucket using the user's existing authorized Cloudflare OAuth session. If the current token lacks the API grant, show a specific **Reconnect/authorize** action; do not silently fail or claim the change succeeded. Handle the real provider response. **Re-read** the bucket's managed-domain status and use its returned exact domain to build the full screenshot URL. Only mark it active after Cloudflare actually reports `enabled: true`; show concise propagation/pending status if public read is not yet available. Do not invent a hostname or hardcode `pub-...` IDs.
- After successful managed-public enabling, immediately REFRESH the full domain inventory and list the actual **Public development URL** for each relevant verified object, with copy/open and a brief “Development / rate-limited” indication, alongside **every** already-active custom-domain URL. Whether or not a user supplies another domain, all previously enabled links must remain displayed. This same full inventory must appear WITHOUT any enable flow when r2.dev was already enabled before the user opened History.
- Immediately below or adjacent to the public URL section, reveal an OPTIONAL text field **“Custom domain”** with an example such as `assets.example.com`, plus a separate **Connect domain** action. Put this friendly helper sentence near it: **“If your nameservers are already with Cloudflare, simply add your domain!”** However, do not treat typing alone as a successful domain connection.
- A custom domain can only be attached when Cloudflare's real R2 custom-domain prerequisites are satisfied: the domain/zone must be present in the same Cloudflare account as the R2 bucket, and Cloudflare must accept/verify the connection. If an eligible Cloudflare-managed zone is already present, offer a short attach flow with actual status and API error detail when it fails. If not, explain briefly how to add that domain to the same Cloudflare account first (or open the official Cloudflare setup screen), without blocking the development URL. Custom domain may be **Initializing** before becoming **Active**; show it as **pending**, not as a confirmed working URL. Recheck/poll status within sensible bounds and offer manual Refresh. Never silently change DNS for unrelated zones.
- EVERY pre-existing active **custom domain** must automatically produce its own screenshot URL **without requiring r2.dev to be enabled or any setup flow**. The user may have attached one or many domains long ago; retrieve the complete current domain list, including pagination if applicable. Do not ask users to make their bucket public again if at least one active custom domain already exposes its objects. Offer r2.dev enabling only as a separate optional action, never as the condition for displaying already available custom URLs.
- Whenever one or more new custom domains become active, add **all their distinct exact screenshot URLs** to the same **URLs** expander, alongside the still-enabled r2.dev URL and any older active domains. If 1 development hostname + 5 active custom hostnames exist, display all 6 links, not 2. If some domain becomes disabled, remove it or mark it unavailable after status refresh. Do not confuse 'domain configuration exists' with 'domain is active' or silently truncate the result list.
- URLs do not require the screenshot to be recaptured, uploaded again, renamed, moved, or written to any new location. Publication applies at **bucket** level, and the screenshot object key remains exactly unchanged.
- All browser-facing copy/open operations must use HTTPS addresses derived from validated Cloudflare-provided enabled domains plus precisely encoded **object-key path segments** (preserve slash separators, percent-encode spaces/Unicode/reserved characters). Never double-encode existing key material, invent a bucket segment in the URL, confuse `redown` bucket with `redown/` key prefix, or use the current/default bucket in place of the screenshot receipt's actual bucket.
- Screenshots that are not confirmed in any R2 destination may still show local image preview if available, but **no invented public asset URL**. Once verification succeeds and domain status is known, refreshing History should expose the corresponding URLs.
- **Keep long URL inventories compact:** the expanded **URLs** list beneath a screenshot must be an independently scrollable vertical region with a modest maximum height (e.g. 240px / about 5–6 URL rows). Use `overflow-y: auto` only when the URLs exceed that height; with one or two links, no unnecessary scrollbar. Scrolling UP/DOWN reveals every existing URL without lengthening the whole History entry or expanding the page indefinitely. Do NOT truncate the actual number of URLs or add a “show first 2” cap. Keep each URL's Copy/Open controls usable, handle long URLs with text wrapping or safe visual ellipsis while Copy still uses the FULL exact URL, support mouse wheel, touchpad and keyboard scrolling, and preserve accessible focus visibility. No horizontal overflow, nested-scroll trapping, or screenshot preview height changes. Scrollbar is INSIDE the URLs expander, not the entire History card.
- Keep this URL view unobtrusive. **The URLs expander must be visible automatically under every screenshot preview; its content must automatically populate with ALL existing active links whenever expanded, with zero activation clicks.** This is the default behavior for screenshots and buckets that were already public before this feature. Do not launch prompts, enable publication, or perform public-domain network calls merely because a screenshot capture occurred. Resolve domain statuses on-demand when URLs expands or History is explicitly refreshed; allow manual Refresh, briefly cache per-bucket data if helpful, and keep History responsive.

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
Screenshot  ·  Saved and verified
┌───────────────────────────┐
│    ACTUAL PNG THUMBNAIL   │
└───────────────────────────┘
> URLs
    [when expanded and public]
    [AUTOMATICALLY listed if already active; no setup required]
    Development: https://<actual-cloudflare-domain>.r2.dev/<exact-object-key> [Copy] [Open]
    Custom 1:    https://assets.example.com/<exact-object-key>               [Copy] [Open]
    Custom 2:    https://images.example.net/<exact-object-key>               [Copy] [Open]
    Custom N:    https://<each-other-active-domain>/<exact-object-key>       [Copy] [Open]
    (Zero to arbitrarily many actual active custom URLs, never a two-link cap)

    [when no public access exists]
    No public URL for this bucket.
    [Enable public URLs for this bucket]
       -> confirm bucket-wide public access
       -> call Cloudflare & confirm enabled
       -> show ACTUAL r2.dev URL
       -> Optional Custom domain [assets.example.com] [Connect domain]
          "If your nameservers are already with Cloudflare, simply add your domain!"
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

10. With 1–2 domains, URL section remains compact without a redundant scrollbar. With 20 or 100 active URLs, all entries remain reachable in a vertically scrollable max-height URLs region, with working full-value Copy/Open and keyboard/mousewheel scrolling; the History card height stays bounded and no other History entries change layout.

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

**NON-NEGOTIABLE PRESENTATION: ONE IMAGE PREVIEW AT THE TOP OF THE SCREENSHOT HISTORY ENTRY, NEVER ONE PREVIEW PER DESTINATION.** Even with 3, 20, or 100 output locations, the capture has exactly ONE shared thumbnail, shown above the destination list and the per-location GO TO actions. Each output row contains concise location, status, and its own GO TO button ONLY—not another image, preview slot, image loading animation, or duplicated screenshot card. Use a single verified output as the source of that shared preview (with a safe existing-cache fallback where supported), without implying other outputs are verified. Keep the destination list compact/scrollable as needed.

**Current root cause:** `extension/history-page.mjs` renders `screenshotRow(r)` separately from ordinary image rows, without any GO TO button. Ordinary `row(r)` has `data-history-goto` tied to the whole operationId, and `extension/app.mjs`'s existing `goTo(operationId)` calls `openRemoteResult({operationId})` then `navigate(result.target)` / `revealListedFile(...)`. That method assumes ONE result target; a screenshot receipt instead has `r.screenshot.outputs[]` with **separate exact destination/account/bucket/key/outputId** for each physical save. Never treat the whole screenshot's operationId as identifying all locations or navigate to whatever bucket is currently selected.

**Required UI/behavior:**
1. Render an ordinary **GO TO** button adjacent to EACH destination row under the screenshot's receipt details, aligned with exact account/bucket/prefix/key and its verified/failed/pending status. For one output, there's one. For 20 outputs, all 20 can be reached; use a bounded scrollable output list if necessary instead of making History absurdly tall. Optional top-level GO TO may directly navigate when there is exactly one destination, but must never silently choose between multiple locations.
2. Clicking a destination-specific GO TO must switch to File Explorer, select the recorded Cloudflare account + bucket, navigate to the **exact containing folder prefix** derived from that output's saved object key/authorized target, and where the object exists, select/focus/highlight that EXACT PNG, consistent with normal History GO TO. No recapture, reupload, source rewrite, rule modification, or cloud mutation merely to navigate.
3. Use `outputId` (plus capture/operation ID) as the stable per-button lookup handle; obtain the corresponding frozen output `destination` and `key` from trusted retained screenshot History data, not user-controlled click-supplied account/key strings or the present selected/default destination. Button attributes should not authorize arbitrary path selection. Validate the selected account, bucket, and key and recheck existing session authority before opening it.
4. For **confirmed** outputs, attempt file-existence validation and highlight the actual file. An R2 direct Object API screenshot must NOT require the screenshot Worker to be provisioned merely for GO TO. If the usual `fileMetadata`, folder listing, or `openRemoteResult` flow requires a Worker and breaks for direct screenshot files, create the **smallest safe read-only navigation adapter** using existing authenticated Cloudflare API to resolve the actual recorded account/bucket/key. Then call existing Explorer navigation machinery; do not weaken existing anti-stale-navigation protections.
5. For **pending/failed/unconfirmed** outputs, retain a GO TO action so the user can inspect the intended **directory** when the account/bucket still exists, but DO NOT claim the PNG exists or highlight a nonexistent object. Distinguish “Open destination folder” from “Verified file present” via normal status text. If the configured account no longer exists, bucket is inaccessible, or folder listing is offline, show a short accurate message and keep the History entry and receipt.
6. Preserve the existing working GO TO behavior for ordinary image/download History. Do not break `Screenshot2Here` in Click2Cloud File Explorer (that is a completely separate feature the owner explicitly ordered to KEEP) or ordinary Chrome right-click Save.
7. For prior Screenshot History entries already recorded, GO TO must work as long as the receipt has a valid destination/key and current authorization allows it. No dependence on the temporary 1-hour retry-image cache or whether public URL publication was set up. A private R2 bucket is navigable with the user's authenticated access.
8. Keep History compact and accessible: each location has clear button labeling (e.g., “GO TO — redown/screenshots/”), sensible keyboard focus, per-button busy/error state; no entire-row disabled state preventing navigation to the other locations.

**Mandatory real tests / acceptance:**
- With 1, 3, 20 or 100 destinations, the screenshot History entry renders exactly ONE top-level thumbnail total. Each destination line has its own GO TO but NO duplicate thumbnail or separate preview fetch. Verify the thumbnail uses only one existing verified image; partial verification is still shown truthfully.
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
