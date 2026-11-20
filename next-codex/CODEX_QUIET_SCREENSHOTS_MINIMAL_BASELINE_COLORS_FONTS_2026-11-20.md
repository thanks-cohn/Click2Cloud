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
