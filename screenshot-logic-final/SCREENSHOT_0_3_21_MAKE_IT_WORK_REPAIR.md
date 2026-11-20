# Click2Cloud 0.3.21 — MAKE SCREENSHOT-TO-CLOUD WORK: corrective Codex implementation order

**Owner instruction — November 20, 2026. Priority: WORKING DELIVERY, NOT ANOTHER AUDIT.**
**Target branch:** codex/click2cloud-0.3.21. **Observed baseline:** df881fb.
**Work exclusively in this repository. Codex will NOT receive access to ReDown. This document includes the complete ReDown-derived upload approach; do not ask for that repository.**
**Status:** Repair specification, not a claim that any fix is already implemented, deployed, or tested.

## 0. Non-negotiable user outcome

A user connects Cloudflare, selects one or several screenshot directories, clicks Save ONCE, visits a normal HTTPS webpage, presses Alt+Q or Ctrl+Shift+Y, and receives a PNG in EVERY selected authorized R2 directory, with a usable History record. A normal right-click one-off Screenshot to folder also works.

No repeated “Use this directory” clicks. No new mandatory Worker setup. No per-webpage permission ritual. No false “saved” messages. No unwanted destination changes. Screenshot is an ordinary, small PNG Blob; send that PNG to the chosen bucket/object key and confirm it arrived. Focus on this simple vertical slice before optimizations.

**Implement code, tests, and an installable extension build. Do not return another plan-only answer.** Use real tests where available; report blocked live R2 tests accurately. Do not change existing right-click Simple/Narrow/Depth engines, default save actions, core worker routing, existing OAuth credentials, unrelated Get URL/search/visual themes, or future Auto-Reroute (0.3.22).

## 1. Observed failures and root causes that must be addressed

User's installed build is 0.3.21 branch df881fb (package and manifest still say 0.3.20). Real observed receipts:

- Capture bac4b935-99ee-4955-b385-20b965de3a27: “Chrome did not grant access to capture this tab” (SCREENSHOT_PERMISSION_REQUIRED). No decisive Chrome error or failed capture stage retained.
- Capture 0a82e05d-785b-4de0-abf1-73e4fb59a2b0 on https://example.com/: PNG capture reached delivery, 0/2 files verified. Both outputs to the user's account, bucket images, prefixes '' and 'files/' were blocked: “Prepare this bucket’s Click2Cloud Worker in Remotes” (WORKER_SETUP_REQUIRED).
- Earlier capture in images/files/ was also blocked. These rules were user's existing configuration and must not be deleted silently.
- User expected a visible default destination card for redown/screenshots; no card appeared.
- User reports folder picker is frustrating: navigate to a directory → click “Use this directory” repeatedly → click Save. Replace with direct multi-selection and one Save.

Code-confirmed:

- src/screenshot/rules.mjs: defaults() returns rules: [] (no default card).
- extension/screenshot-page.mjs: picker() requires “Use this directory”; directory() flow separates picking from saving.
- extension/screenshot-background.mjs: authorizeTarget() requires a positive fileApi folderExists check. R2 prefixes are virtual: absence of an explicit folder marker is NOT proof that a user may not upload a key under that prefix.
- src/cloudflare/transport.mjs: screenshot resolver requires ready Worker, exact current code digest, and one Worker bucket scope. This blocks otherwise normal screenshot uploads. Also group.filter prefix matching excludes an exact equality that transport cap() accepts: plan.prefixScope === target.prefix must be valid.
- src/chrome/visible-tab-screenshot.mjs: missing tab.url and a Chrome captureVisibleTab exception can both map to SCREENSHOT_PERMISSION_REQUIRED, while the original error/stage is discarded.
- src/screenshot/capture.mjs: screenshot can be captured successfully and cached, then fail only because Worker setup is absent. There is retry logic but its original bytes can expire; cache is 1 hour/48 MB in src/screenshot/retry-cache.mjs.
- src/recorder/host.mjs and src/recorder/schema.mjs: screenshot receipt export exists but does not include the precise Chrome capture stage, normalized browser error classification, or explicit direct-upload request stages.
- scripts/test-screenshot-browser.mjs exists but .github/workflows/test.yml does not run it. The previous overall CI run failed on a separate browser boot-login regression; do not label full CI green.

## 2. CHANGED OWNER REQUIREMENT: direct Cloudflare R2 object API is the screenshot default

This section intentionally OVERRIDES screenshot-logic-final/README.md sections 4 and 5 and screenshot-logic-final/TEST_MATRIX.md rows that mandated “one Chrome→Worker upload” and worker fan-out. That older spec remains authority for shortcuts, matching, additive rules, IDs, exact destinations, dedup, one-off semantics, and receipts EXCEPT where explicitly replaced here. Do not edit that frozen original file; implement this narrow approved change and document any affected test expectations.

**Use direct R2 object PUT for screenshot PNGs, not a mandatory per-bucket Worker.** Cloudflare documents the endpoint:
https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/objects/methods/upload/

Documented method and route:
PUT https://api.cloudflare.com/client/v4/accounts/{account_id}/r2/buckets/{bucket_name}/objects/{object_key}

Request body = image/png bytes (the existing PNG Blob). Max size of this endpoint = 300 MB. For PNG screenshots this is ample. No native Downloads save, S3 credential prompt, new server, or new Worker is needed for this route.

Important object_key encoding: preserve forward slash separators as literal / characters; percent-encode reserved characters within individual key segments. DO NOT percent-encode slash into %2F. Do not create an extra “bucket” folder under the bucket, change prefix casing, strip meaningful path segments, or invent destinations. Example: account A, bucket redown, prefix screenshots/ → object key screenshots/Screenshot-<capture>-<output>.png; NOT redown/redown/screenshots/.

Click2Cloud already has existing Cloudflare OAuth request machinery:
- src/auth/cloudflare-oauth.mjs: look at createCloudflareOAuth and its existing authenticated request method. Registered scopes include workers-r2-bucket-item.read and workers-r2-bucket-item.write. Use the current connected account, normal OAuth refresh flow, API host permissions, and existing request wrapper. Confirm the actual issued grant and handling with an integration test; requested scope alone is not proof of granted scope.
- Reuse established Cloudflare authority/account validation; do NOT require workers-scripts.admin or Worker code-digest checks for this direct screenshot upload path.
- Do not copy ReDown code. The entire relevant approach from that repo is: take a local Blob/File; call authenticated API PUT on /accounts/{accountId}/r2/buckets/{bucket}/objects/{key} with body Blob and content-type image/png; check HTTP/provider response; read the exact uploaded object back and confirm size AND content digest; retain a stable destination and retry identity; report partial results per destination. The ReDown code uses RedownCloudflareApi.request, but Click2Cloud must adapt the idea to its own existing OAuth/API wrapper.
- If the existing auth method cannot submit a Blob body, make the SMALLEST wrapper extension required. No new general-purpose transport framework.
- Handle Cloudflare HTTP/JSON response according to the official object Upload/Get endpoints, including actual provider error payload; do not blindly assume a 2xx status alone proves bytes persisted.

**Verification:** For each screenshot output, GET the exact object key from the same account and bucket (direct R2 object API), stream/read its bytes under a screenshot-size bound, compare actual length AND SHA-256 against the already captured image digest. Cloudflare upload metadata (key/size/etag) may be useful intermediate evidence but never substitute it for a mismatching content digest. Mark “confirmed” only after the exact remote bytes match. Do not call a screenshot “verified” because a Worker responded, an HTTP PUT returned 200, the same filename exists, or a prefix listing appears. If GET cannot be performed, report “unconfirmed / retry or inspect,” not “saved.”

Use the direct uploader as the PRIMARY normal path. Do not silently fall back to an unprepared Worker. Retain the existing Worker screenshot route as LEGACY/OPTIONAL, disabled for the normal direct path; do not delete or rewrite the unrelated Worker save engine. If the direct API is unavailable due to real Cloudflare limitations, expose the exact blocker and use existing authorized Worker only if it is already prepared and the user explicitly opted into such fallback. Never suggest a new Worker deployment just for an ordinary screenshot. Do not claim success without a real proof.

## 3. Minimal coding plan (keep the patch focused)

Suggested code boundaries; adapt to actual source:

A. Add src/cloudflare/screenshot-direct-upload.mjs (or equivalently small module) with function(s) that accept:
- Existing authorized destination object: connection/account ID, bucketName, exact prefix.
- Frozen screenshot plan outputId/key and PNG Blob.
- Existing auth/request adapter (injectable for tests).
Return normalized per-output result including destination, key, state, bytes, checksum and verification stage; no mutation of source plan.

B. In src/screenshot/capture.mjs, after ONE successful chrome.tabs.captureVisibleTab and digest computation, dispatch each unique frozen output to direct-upload. Preserve SINGLE screenshot capture per genuine keyboard event; if 3 destinations match, perform 3 direct PUTs using the SAME captured Blob, not 3 captures. Use modest bounded concurrency (e.g., 2–3) and independently reconcile each destination. One output's failure must not block others.

C. Keep existing screenshot rules, per-capture dedup (ON by default), stable captureId/operationId/outputId, frozen account/bucket/key, independent retries with SAME key, and truthful partial statuses. A new separate user shortcut press still produces a new screenshot. Preserve legacy one-off semantics: browser right-click Screenshot to exact folder sends ONLY to that selected folder, not all matching rules.

D. If PUT response is lost or a network error occurs, first GET/check the exact key. If bytes match, mark verified; if absent, retry PUT to same key with small bounded backoff; if key exists with different bytes, do not silently replace it—report conflict. Avoid duplicate object creation and never re-capture to label it a retry. Honor account/session changes as separate, explicit failures rather than writing into a different account.

E. Do not gate direct upload on Worker readiness, Worker code digest, Worker prefixScope, or folderExists marker. R2 directory path is an object-key prefix. Account and bucket must be authentic and exact; selected directory string must be canonical. If a directory was chosen in UI, it should be uploadable even if no marker object exists yet, provided R2 accepts the key.

F. If direct upload is blocked by transient connectivity, preserve the already captured Blob and frozen output plan, surface a recoverable status, and retry within the existing bounded cache while bytes remain available. Keep existing verified outputs untouched. Do not implement a vast new job system or infinite retries during this patch. History must say plainly when bytes expired and retry is impossible.

G. Keep the existing screenshot receipt and History integration. Add direct-upload proof labels separate from Worker proof. Never mislabel direct API GET/hash as independent Worker-R2-HEAD proof. Keep the same support ZIP export format boundary, with accurate method/version and new fields where needed.

## 4. Chrome capture failure repair; NO permission prompts on every webpage

- Retain activeTab and both configured commands in extension/manifest.json, Chrome context menu path, and Chrome's constraints for restricted pages.
- Investigate whether onCommand's optional delivered tab is absent/stale and whether windows.getLastFocused versus actual command target window causes spurious failures. Check tabs.query and webNavigation.getFrame behavior in real installed Chrome, not only mocks.
- Avoid classifying every missing tab.url as Chrome permission denial. If URL absent, report TAB_URL_UNAVAILABLE with stage “tab-observation” and a useful diagnostic; if captureVisibleTab truly rejects for permission, report CHROME_CAPTURE_PERMISSION_DENIED with stage “capture-api.”
- Preserve normalized classifications for unsupported page, window unavailable, navigation changed, rate limit, API exception, command not assigned, and capture returned invalid PNG. Capture an allowlisted Chrome error category/name and timestamp; do not record raw URLs/tokens in the ordinary SECURE export.
- Do not request global all-websites permission as the first “fix,” and do not insist on user approval for each example.com-like normal page. Shortcut and browser right-click gesture should work when Chrome supplies activeTab access. Never claim that the extension can override Chrome-protected pages.
- Preserve the tab-identity checks that prevent capturing a different webpage; fix false-positive checks by evidence, not by deleting checks indiscriminately.

## 5. Default screenshot destination card: redown/screenshots

User explicitly wants a VISIBLE default screenshot card, not a hidden rule. Interpretation: R2 bucket named redown, object prefix screenshots/ (when that authorized bucket exists). The visible card label can read “Default Screenshots — All websites — redown / screenshots/”.

- On fresh rules initialization: discover an existing authorized redown bucket for the connected selected/unique account; create an active editable All websites default card targeting its screenshots/ prefix. Generate proper permanent rule ID and persist exactly once, idempotently.
- If no authorized redown bucket exists, or several accounts make it ambiguous, SHOW a visible unconfigured default screenshot card/placeholder and one direct destination chooser; do not invent or create a bucket silently, and do not activate a bogus destination.
- Existing customers with saved screenshot rules: preserve all existing rules, ACTIVE state, rule IDs, selected destinations, and dedup. Offer the missing default card without duplicating it on each load. Do not silently add extra uploads to an existing setup without clearly showing the newly active rule and allowing dismissal/configuration.
- Defaults use normal rule semantics—user can rename, edit, toggle inactive, or delete. Once explicitly deleted, do not silently recreate on every restart (tombstone or explicit initialization state).
- There need not be a physical folder object in R2: a PUT under screenshots/<filename>.png creates the virtual prefix naturally.

## 6. Replace the clumsy directory picker with direct multi-select → Save

In extension/screenshot-page.mjs, replace “Use this directory” and repeated per-folder confirmation with:

- A row has a clickable SELECT area/checkbox to toggle directory selection immediately. Clicking the same selected folder again deselects it.
- A SEPARATE expand/browse chevron allows navigation into child directories without selecting them. Account and bucket levels are clear.
- One or many selected directories stay selected when navigating elsewhere, including another bucket/account if the connected authorization supports it. Show selected full paths and count. Show selection immediately without closing picker.
- ONE visible Save at the screenshot rule form persists all chosen folders and displays the new/updated card instantly. No intervening “Use this directory,” “Apply,” or individual per-directory commit. Save is configuration only; it must not capture or upload.
- The editor uses the same selector; edits persist only upon Save, not on every click. Escape/cancel discards unsaved selection; preserve previous saved rules. Distinguish “Save rule” vs one-off “Capture and save” intent.
- The one-off right-click flow can keep a single target by design, with one click to select, then “Capture and save.” It does not auto-add all active cards.
- Accessible keyboard selection and folder browse controls; intuitive mouse behavior; 3 selections = 3 clicks + one Save, not 3 secondary confirmations.

## 7. Make operational feedback clear

Normal view should show a compact, understandable result:
- “Screenshot captured; uploading to 2 folders...”
- “Saved to 2 of 2 locations” only after both verify.
- “Saved to 1 of 2; retry remaining 1” on partial.
- “Screenshot captured; upload delayed — retry available” during transient issue.
- A real Cloudflare API 403 should say access to that bucket needs attention; don't say Worker setup is required when direct upload is the selected path.
- Show the chosen full bucket/prefix for each output. Do not expose account credentials in UI or exports.
- “History” and “Retry unconfirmed files” reuse exact captured bytes and per-output IDs; buttons work, no dead-end feedback.
- If no rule matches an active shortcut, show short actionable status rather than silently appearing broken. Do not trigger screenshot in response to adding/editing a rule.

## 8. Diagnostics must be enough to explain failures next time

Add a per-capture structured trace, retaining timestamps and outcomes for:
COMMAND_RECEIVED → TAB_RESOLVED → PAGE_ELIGIBLE → CAPTURE_REQUESTED → PNG_CAPTURED → RULES_MATCHED → R2_PUT_SENT (per output) → R2_RESPONSE → R2_READBACK → VERIFIED / PENDING / FAILED.

- Each event ties to existing captureId/outputId, includes stage, safe code, provider HTTP status when available, and result. Detect missing events/gaps. Do not fabricate stages.
- Distinguish Chrome capture failures from R2 upload failures and unexpected Worker dependency.
- The existing Settings → Debug → Screenshot captures → SECURE ZIP should include these classifications and proof methods. RAW may include additional user-approved private metadata, but neither should embed screenshot pixels or auth tokens by default.
- User previously exported a right-click-save RAW ZIP with zero attempts; make the Screenshot captures export easy to discover and actually useful. Both export scopes must be truthful.
- An actual successful direct API GET/byte hash is recorded as that specific verification method; failures preserve exact reason and recoverability flag.

## 9. Mandatory tests, including integration acceptance

Automated local/fixture tests, with proper failure injection:
1. Valid screenshot Blob → account redown / bucket redown / screenshots/filename.png, exact key bytes confirmed after PUT and GET, correct MIME.
2. Correct URL encoding: slashes literal, spaces/Unicode escaped per segment, no extra prefix. Case-sensitive folder names preserved.
3. No Worker record / stale Worker digest / outdated Worker: screenshots still upload via direct API when R2 OAuth grant and bucket support the route.
4. Multi-folder: 3 distinct targets (possibly multiple buckets/accounts with valid grants) → one capture, 3 PUTs, 3 GET/hash verifications; one blocked produces partial 2/3, not aggregate 0/3.
5. Two rules to same folder: dedup ON = one object; OFF = two unique files. Two genuine keypresses = two new captures.
6. Leftover legacy rules remain, without silently switching images/ to redown/screenshots/; visible default setup initializes exactly once and survives restart, disabled/deleted stays disabled/deleted.
7. Folder multi-select: click three folders, Save once, a single card contains exactly the three folders, no “Use this directory”; edit/cancel/delete and 26+ cards preserve old semantics.
8. Direct PUT returns success but GET absent, wrong key, wrong size, or wrong digest → NOT verified; receipt shows accurate status.
9. PUT loses response after R2 writes, GET finds equal bytes → verified without another PUT. GET absent → bounded retry same key. GET mismatch → conflict/no accidental overwrite.
10. Transient errors and cache expiry → queued/retry state while bytes exist, honest unavailable when expired, never recapture on Retry.
11. Chrome simulated missing tab URL, API permission denial, page switch, rate limit, unsupported page → different correctly exported codes and stages.
12. Real Chrome: Alt+Q and Ctrl+Shift+Y both capture on normal https://example.com-like page with Shelf closed, no per-page manual approvals; right-click one-off captures only the chosen folder. Restricted chrome:// page doesn't falsify success.
13. The screenshot browser test script should be in mandatory CI when runner supports dependencies; publish its log. Do not let a local-fixture pass be called proof of live Cloudflare.
14. Build package and extension manifest version are 0.3.21 after repair, verified against unpacked bundle. Preserve stable extension key/ID and existing user data.
15. Run focused screenshot tests AND Simple/Narrow/Depth core regressions and CURRENT/profile recovery guards. Record failures precisely. Do not change baseline hashes just to get green.

**Live-owner acceptance is mandatory before claiming “works against real R2.”** On a connected test bucket, do one actual screenshot from a normal webpage, direct PUT PNG to redown/screenshots/ or another owner-authorized exact folder, independent API GET/checksum, show receipt, confirm exact object in R2. Then test 3 destinations, failed one, and Retry. If the Codex environment lacks Cloudflare access, implement all code and tests, clearly mark LIVE-R2 NOT RUN, and provide the minimum exact steps for the owner to test their installed extension. Do NOT say “fully fixed” until installed Chrome and R2 actually pass.

## 10. Deliverable and execution rules

- Make a focused branch/commit on top of codex/click2cloud-0.3.21, preserving existing user's source and historical snapshots. Commit implementation, tests and report.
- Produce a concrete report at screenshot-logic-final/SCREENSHOT_0_3_21_REPAIR_RESULTS.md including old/new code path, exact changed files, commands, results, verified vs simulated evidence, known problems, SHA, and whether actual installed Chrome/live R2 passed.
- Push branch and artifacts to GitHub if access allows. If not, give exact commit/branch and unambiguous recovery commands, not an inaccessible sandbox path or false release URL.
- Prioritize a minimal direct-upload success path FIRST. Prove 1 screenshot → 1 exact R2 object with real bytes, THEN multi-target, UX, and diagnostics. Avoid unrelated rewrite, new cross-cloud framework, S3 credentials, desktop dependency, or treating an ordinary PNG upload like a multi-gigabyte job.
- If a technical assumption is invalid, prove it with provider HTTP evidence and adjust the smallest possible portion. Never silently route to a different bucket, “fix” by weakening read-back, or disguise missing tests. Preserve proven existing save behavior.

## Finish line: answer with results, not assurances

The owner is not requesting another theory. The result must be demonstrably: **Select folder(s) once → Save configuration once → press shortcut or choose Screenshot → exact PNG appears in intended R2 directory → independently confirmed → receipt shows where it went.**

No “Prepare Worker” for normal direct screenshot PUT. No repeated directory-use click. No per-site permission ceremony on supported pages. No “0 of 2” when Cloudflare can accept the exact same PNG directly.

**Make it work. Demonstrate what actually works. List what still does not.**
