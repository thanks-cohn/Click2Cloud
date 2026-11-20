# Codex: quiet screenshots + Minimal as true base UI, color/font-only styling experiment

**Owner request, November 20, 2026. Execute on this dedicated experimental branch.**
Branch: `codex/minimal-baseline-palette-fonts-quiet-screenshots-2026-11-20`.
Base: the verified screenshot-repair branch HEAD `6b91b750c3a2b972e9dfc83588ef430cf81fd377`.
**Do not change the working repair branch or main. Keep exact screenshot upload code, OAuth and save engine unaffected.**

## Outcome

1. The user does NOT want permanent system notifications every time a screenshot is taken. A successful Alt+Q or Ctrl+Shift+Y should not create a Windows/Chrome desktop notification; neither should ordinary retry outcomes. History and unobtrusive in-app status must still work.
2. The user wants a new experimental UI architecture in which the **Minimal interface itself is the baseline structure**. CSS must NOT build "Minimal" as a secondary theme layered over a bigger UI. Instead CSS/presentation tokens should primarily provide **color schemes and font choices**, applied to the same minimal baseline layout. No full theme changes to component layout, spacing architecture, content visibility, menu structure or feature accessibility just because a palette changes.
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
2. The presentation customization should influence **colors and typography**, not layout composition. Define a small CSS variable contract (background/surface/text/muted/border/accent/selection/focus plus font family, optionally weight/size if the user changes those). Palette choice should NOT modify visibility, navigation items, page arrangement, spacing hierarchy, action positions, Worker setup behavior or cloud functionality.
3. Keep the five familiar palette options—Original Rose, Ocean Blue, Emerald Forest, Amethyst, Sunset Amber—with proper light/dark variants. Add a straightforward **Font** selector using available system font stacks; no external font fetching, no bundled font files, no new web fonts required. Persist palette/font separately. Include readable preview or immediately visible result.
4. Fresh install default is Minimal structure, with a sensible default palette/font. Existing users' screenshot rules, OAuth, Cloudflare destinations, History, debug settings and saved preferences survive branch reload. Do not reset `chrome.storage` or silently discard already selected colors; use deliberate compatibility/migration logic for prior aesthetic preferences, with deterministic behavior and tests.
5. Remove special Minimal-only behavior gates that hide genuinely useful actions, diagnostic availability, labels or controls. If dense technical explanation should normally stay out of sight, use a user-invoked disclosure rather than a theme-dependent data-aesthetic selector. Never conflate a color palette with a debug/functional permission.
6. Bit o' Polish and Remote V1 remain intact on **the original repair branch**. This is an alternate experimental *branch*, not an irreversible migration of main. Do not import old theme-specific geometry back into the new Minimal baseline.
7. Keep user interaction responsive at compact and desktop widths, in light/dark mode, with focus/keyboard accessibility. No horizontal overflow, hidden Save buttons, broken select controls, or palette-induced layout jumps.

## C. Prove no save regressions

Do not touch screenshot transfer logic unless a focused test proves required. After the visual work, run:
- `npm run build:extension`
- Focused screenshot capture/rules and History/receipts tests
- Aesthetic tests covering default Minimal, palette persistence, font persistence, and no palette-driven DOM/geometry changes
- Existing Simple/Narrow/Depth save regression tests
- Real installed Chrome browser smoke where runnable, with the screenshot local HTTPS R2 fixture; distinguish fixtures from live R2.

Acceptance:
- Press Alt+Q on a normal HTTPS page: screenshot saves to exact configured R2 key, same R2 GET/SHA-256 verified receipt, **zero unsolicited desktop notification**.
- Ctrl+Shift+Y same. Retry only unresolved outputs, no new popups or duplicate files.
- Startup and all palette choices have same Minimal layout/visible controls; switching colors or fonts doesn't replace/remount the main interface or alter save behavior.
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

**Color schemes are not themes:** Keep Original Rose, Ocean Blue, Emerald Forest, Amethyst, and Sunset Amber as **palette options within Minimal**; offer compatible **font selection** separately. Both keep light/dark. Switching palette or font must not change UI structure, visible controls, feature availability, user data, or geometry. Remote V1 preserves its legacy appearance/layout, since it is an explicit alternate theme, but must retain all current features and feedback. Remove high-polish as a theme-picker entry and avoid registering it as an independently selectable theme in this branch. If its validated color token data is reused internally, treat it as a palette data source only—not an appearance mode.

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
3. Load the actual saved PNG from that exact verified R2 object, **using the already authorized direct R2 Object API** and existing OAuth token/refresh/account checks. Reuse the appropriate direct R2 GET route from `src/cloudflare/screenshot-direct-upload.mjs` where possible. The UI may use a small dedicated trusted background request/chunked bridge if required; DO NOT add a new Worker dependency, ask for S3 credentials, or create a separate cloud service.
4. For an incompletely uploaded capture with **no confirmed R2 output**, it is okay to show a local preview if the original PNG is still recoverable in the existing retry cache. If bytes are unavailable, show a quiet “Screenshot preview unavailable” placeholder, **not a false saved image**; never turn preview failure into upload failure, change verified counts, or erase History.
5. Reuse existing History preferences: **Expand all images / Only first page / Close all** must apply to screenshot thumbnails too. Lazy-load only when visible/expanded, with bounded image memory/concurrency, cancellation on collapse, and object URL revocation on navigation. Do not permanently store full screenshot pixels in History JSON/diagnostic ZIP just for a thumbnail.
6. Decode to a small thumbnail using the same image-preview presentation and aspect ratio as ordinary images. Show a clear fallback for inaccessible or deleted R2 files, disconnected account, corrupted bytes, offline state, or preview size limits. Avoid an infinite loading state and avoid repeated noisy notifications. Preserve existing screenshot verification/receipt independently of the visual preview.
7. Opening/expanding a screenshot History row after **more than one hour**, after Chrome reload, or after an MV3 worker restart must still show a thumbnail for a confirmed object **from R2**, even after the temporary retry PNG cache expires.
8. On a capture sent to three directories, render one thumbnail, keep `3/3 verified` and all three destination details. If only two are verified, preview from either confirmed output while leaving the third retryable, with no false `3/3` display. Never preview a different user's or currently selected account's object due to a stale lookup.
9. Keep the preview read separate from receipt validation. It must not issue PUT, capture again, retry the operation, mutate R2 objects, or create another Chrome notification merely because History loaded a thumbnail.

**Test evidence expected:**
- A saved screenshot visibly renders a small image preview in History using installed Chrome and the local HTTPS R2 fixture.
- Multi-directory screenshot = one preview, all exact destination/verification details, and no screenshot recapture when viewing.
- Preview survives temporary screenshot cache expiration and extension reload when R2 GET works.
- Correct status if provider GET fails, output is missing, permission changes, or image exceeds supported preview size.
- Existing History image preview tests and screenshot/direct-upload tests still pass. No change to Simple/Narrow/Depth saving.
- Screenshot preview obeys History image expansion preference and shows no persistent OS notification.

## E. Revised final acceptance checklist

In addition to earlier checks, confirm and report:

- **Exactly TWO appearance themes: Minimal (default) and Remote V1.** Five color palettes and fonts live under Minimal; no third Bit o' Polish theme entry.
- **More → Screenshots** with a plural label, and a consistent page heading. Internal stable view identifiers remain unchanged.
- **Screenshot previews actually render in History** using the correct verified R2 PNG object, alongside matching filename/date/status, even after the one-hour retry cache expires.
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
