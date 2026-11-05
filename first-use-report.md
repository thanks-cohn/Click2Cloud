# First-use report — Click2Cloud V3+1

**Date:** November 5, 2026  
**Repo:** thanks-cohn/Click2Cloud  
**Applies to:** the currently installed Chrome MV3 Click2Cloud extension, the headless Engine API, the existing REDOWN Universal File API integration, and the next Codex implementation run.  
**Role:** first-use defect report and owner-approved direction, to be read **alongside** docs/CODEX_P0_BUILD_SCAFFOLD_V3P1_AGENT_READY.md, scaffold/*, and AGENTS.md. This is a specification and triage report, not a claim that its acceptance tests already pass.

## 0. Owner's nonnegotiable architecture and experience

**File Explorer = REDOWN-style Explorer powered by the existing REDOWN Universal File API. V3+1 = the sole native right-click configuration, menu projection, registration and dispatch engine.** Do not substitute a custom/parallel file API, a fake Explorer, or REDOWN's old V3 context-menu implementation.

The installed extension must provide a real, visible, polished Explorer, with behavior and a **headless, scriptable/programmatic file-operation surface as close to REDOWN's as practical**. Its CSS and layout are the presentation layer on top of a functional Universal File API. Preserve existing working REDOWN operation semantics and reuse source where authorized and license-compatible. Do not edit REDOWN production or indiscriminately transplant its old context-menu code into Click2Cloud.

The owner wants interactions, not chores. Specifically:

> Open + Right Click → Depth → check bucket → set Level 10 → Save. All real existing folders up to that level become accessible in Chrome right-click. The end.

No extra scan button, no manual opening of every folder, no refresh requirement to apply the initial change, and no technical scope-ID prompt at login. Internal work may be asynchronous, but the UI must accurately show progress/completeness and autonomously finish without user intervention. **Never label an incomplete menu as fully ready.**

Keep Simple, Narrow and Depth as **independently saved configurations**. Show in Chrome is a separate, additive visibility projection; Flat is an exclusive display override. Switching display modes must not erase hidden configurations or the Depth index. Unchecking Depth **or unchecking any particular bucket inside the Depth popup** merely changes its menu participation, never deletes the hierarchy cached for that bucket. Rechecking reuses the index immediately, subject to authorization and freshness revalidation.

## 1. Observed first-use shortcomings and evidence boundaries

Owner-reported from installed Chrome use:

1. Explorer exists and can show files/folders, but is still much more rudimentary than REDOWN's Explorer, with missing everyday controls and expected programmatic/visual parity. User asked why the GUI took so long and why the visible Explorer is incomplete.
2. Cannot actually save files to Cloudflare from this build. Explorer's current Save actions relate to destination/menu configuration, not a working normal file-upload workflow. Native right-click saving is likewise not live-verified.
3. Clicking Connect Cloudflare prompts: “Enter the exact scope IDs verified in your existing Cloudflare OAuth registration (space separated).” This is unacceptable customer UX. User has worked on a Cloudflare redirect/authorization configuration, but the current registered client/scopes/live consent have not been independently confirmed in this report.
4. After setting Depth level 10 for a bucket with at least four actual directory levels, the Chrome menu does not show the expected deep hierarchy.
5. User cannot reliably remove/hide Depth entries from the native right-click menu.
6. User must be able to switch to Simple or Narrow for display without losing the saved Depth setup or discovered folder tree.
7. Changes made inside the Explorer (especially creating folders) must propagate to the Depth index automatically, even with Depth currently hidden.
8. Explorer must provide **Back, Forward, Up one directory, Refresh** controls.

Verified in source on the repository main branch when this report was written:

- extension/app.mjs has a rudimentary list-based Explorer and no full Back/Forward/Up/Refresh navigation toolbar or regular upload operation. Its Connect Cloudflare button calls a browser prompt for OAuth scope IDs.
- extension/app.mjs provides one three-tab + Right Click popup, Depth scope checkboxes and depth fields, plus Show in Chrome toggles. Its Save code batches a configuration change and a display change, but Simple/Narrow tabs attempt to create a destination even for a visibility-only edit; this can fail on an existing destination. The owner-reported hide bug needs an actual installed-Chrome reproduction and verified native ACK.
- src/modes/depth/index.mjs recognizes maxDepth as a **maximum number of folder levels to display**, not a request to acquire missing folder inventory. It projects from the supplied inventory. Level 10 is not a promise of ten invented folders.
- src/inventory/discovery.mjs contains a resumable read-only folder-discovery implementation, but extension/background.mjs does not start its recursive scan upon Depth Save. Its current listFolders handler adds only the folder entries returned by ordinary Explorer navigation to an in-memory inventory, marks that inventory incomplete, and does not itself request native-menu reconciliation on every discovery change.
- extension/background.mjs sets workerReady:false on discovered scopes and rejects unsupported authenticated Worker operations with AUTHORIZED_WORKER_TRANSPORT_UNAVAILABLE. The real Cloudflare R2 save path and verified provider readback remain blocked; the REDOWN Universal File API files already exist under src/explorer.
- src/core/composite-menu.mjs composes visible Simple/Narrow/Depth projections. It will not invent unknown folders. src/chrome/registrar.mjs removes/re-registers native menus and records acknowledgements; a successful **logical** compilation is not independent proof that the real Chrome hierarchy is complete.
- src/api/config.mjs stores separate mode configs and show flags, which is the correct beginning; persistence/isolation needs acceptance testing and stricter visibility-only mutation paths.
- docs/evidence/ENGINE_API_IMPLEMENTATION.md explicitly reports real OAuth consent, Worker upload and native installed-Chrome acceptance as BLOCKED/NOT TESTED from Codex's environment. The owner's current real-machine observations should guide follow-up acceptance but should not be mislabeled as passed.

**Do not confuse code reading with a live replication.** Confirm which extension version/build Chrome has loaded and gather actual menu-generation evidence and first-party operation receipts on the owner's machine or a suitable authorized test host.

## 2. Exact required Depth interaction, independent configuration and hiding

**Owner journey:**

1. In Explorer, right-click a folder or click + Right Click to open the **same** configuration popup.
2. Select the **Depth** tab; all authorized buckets available for Depth configuration are listed.
3. Check the desired bucket; choose **10** for that bucket. This means include all *existing* real folder levels 1 through 10, including folders **not individually configured** in Simple or Narrow. Depth must be uncapped in the config model where practical, although a native menu may have platform budgets.
4. Click **Save once**. This stores the Depth configuration and triggers background read-only recursive/paginated discovery through the Universal File API, persists its results, generates the full V3+1 nested menu and applies it to Chrome. On completion, existing folders through at least level 4 of an actual level-4 test tree are navigable without touching Explorer folder rows.
5. Show truthful transitional status when discovery takes time. Allow auto-updating partial menus as branches arrive, but differentiate **partial** versus **complete**; no fake 'DONE' or waiting for user to push another button. A large tree may legitimately take time; expose bounded progress, cursor/remaining branch count, errors and Chrome registration status. Handle real Chrome item limits explicitly, never silently truncate a tree and claim success.
6. In the **Show in Chrome** controls inside this same popup, select Simple, Narrow, Depth, All, or Flat. Show flags are **visibility only** and must not corrupt the three saved mode definitions. Flat remains exclusive and remembers the prior Show combination.
7. Turn **Depth Show off**: remove all Depth-owned native Chrome menu rows promptly and reliably; keep its configuration and persistent index untouched.
8. Uncheck one **bucket checkbox in the Depth tab**: remove **only that bucket's Depth menu contribution**, preserve the bucket's index and previously chosen depth preference so that rechecking is fast. If product semantics currently conflate “configured/enabled” and “stored preference,” split them; avoid destructive deletion during hide.
9. Switch Show to Simple-only, Narrow-only, Simple+Narrow, or Flat, then return to Depth: previous Depth 10 and cached hierarchy must remain.
10. Restart Chrome/MV3, or reload the extension: persisted configuration and folder index survive, menu is reconciled deterministically with no duplicate or stale entries. Loss/revocation of authorization must disable or block saving rather than implying current access.

**Important distinction:** Setting a Depth level is not the same as listing only a selected folder's direct children. A folder visible in the Explorer must not be the prerequisite for inclusion in Depth.

## 3. Persistent, fast, independently maintained Depth folder index

Build **one authoritative persistent folder-hierarchy index**, keyed by provider/connection/account/bucket with normalized folder prefixes, parent relationships, discovery cursor/frontier, scan coverage/depth, last observed time, authorization/availability metadata and schema/version. Preserve it in storage suitable for MV3 lifecycle restarts (e.g., IndexedDB, with bounded updates and safe migrations). Avoid relying on a single ephemeral background variable or a volatile cache.

- **First use:** Discover through the existing Universal File API. Traverse verified folders recursively, with pagination, bounded concurrency, abort/resume, exact identity, correct ancestor inference and rate-limit/backoff handling. Scan to sufficient depth for the configured bucket, independent of what the user manually browsed.
- **Reactivation:** Reuse the stored index to project the existing menu quickly, and reconcile freshness incrementally without blocking menu display where safe. Preserve the distinction between a cached hierarchy and **currently verified authorization/writability**; stale index entries must not become enabled save targets without authority checks.
- **Hidden modes:** Discovery history/index persists regardless of what mode is visible, and **regardless of whether the bucket is currently checked in Depth**. Hiding/deselecting must not clear indexed folders, cursor, depth preference or cache. Garbage collection must be separate explicit, safe and documented—not an implicit checkbox side effect.
- **Changes made through the Explorer:** Once a Universal File API operation has confirmed its outcome, immediately update only the affected part of the index for create folder, rename folder, move folder/subtree, copy folder/subtree and delete folder/subtree. Treat file upload as a file-metadata change, unless it creates previously unknown folder prefixes. Keep the index up to date even if Depth is hidden or the specific bucket is unchecked.
- **Uncertain changes:** A started, failed, partial or uncertain operation must never optimistically invent success or delete verified index state. Mark affected prefixes as needing targeted reconciliation; never automatically replay a possibly completed write.
- **External changes:** Refresh, explicit user refresh and safe incremental reconciliation catch folder mutations outside Click2Cloud. No claim of real-time awareness absent provider event support. Preserve pagination and handle sparse/implicit R2 folder prefixes.
- **Index-to-Chrome:** When visible Depth entries change after confirmed operations, regenerate affected logical projections and reconcile the native menu automatically. When Depth is hidden, update the index silently and defer native Depth rendering until the user enables it.
- **Performance and budgets:** No whole-bucket rescans for every Show change, no full download of file bytes to build a folder tree, bounded memory, persistent partial progress, no excessive Chrome contextMenus churn. Prefer debounced/coalesced registration and explicit over-budget results.

**A whole-cloud outline backup is NOT REQUIRED for normal Depth speed or first-use operation.** The independent **live Depth index** is the performance dependency. Optional verified Save Whole Cloud/recovery snapshots are a recovery source after corruption, loss or reinstall; they must not gate everyday folder discovery, and a historical backup must not silently authorize current cloud actions.

## 4. Real REDOWN-style File Explorer, Universal File API, and navigation

Do not confuse the presence of a File Explorer tab with feature completeness. The owner wants an Explorer **as close to REDOWN's visual/behavioral/programmatic file interface as practical**, sharing the REDOWN Universal File API in src/explorer; V3+1 supplies the native right-click subsystem only.

**Required GUI controls:**

- Visible **Back**, **Forward**, **Up** one directory, and **Refresh** buttons with correct enable/disable state. Back and Forward navigate actual per-tab history; Up goes exactly one folder level (or to the bucket/root chooser); Refresh re-reads the current folder through the Universal File API and reconciles its affected index state.
- Real account/bucket sidebar, folder navigation, current-path breadcrumbs, file listing, sorting/filtering, selection, useful empty/disconnected/auth-loading states, normal folder contextual operations, + Right Click, Default Save Selection and Manage Destinations.
- Real **Upload file(s)** and **New folder** as authorized Universal File API operations, with honest progress/receipt/error UI. Download, rename, move, copy, delete, preview, side/window preview, drag-and-drop and bulk work should reuse compatible established REDOWN capability rather than fake HTML controls; list independently verified versus not yet supported operations.
- The full Explorer shell/controls should still be visible before Cloudflare login; show an elegant disabled/disconnected state, not a blank/unusable product. Do not falsely populate real cloud file listings while disconnected.
- A polished interface consistent with REDOWN/Click2Cloud, but **functional file semantics precede decorative changes**. Do not import or route Explorer actions through REDOWN's old V3 menu engine.
- The same normal API used by the GUI must be callable through a **versioned, permission-gated headless programming surface** for scripted inspection/testing and future agent integrations. Maintain source/destination identities, operation schemas, cancellation/progress, idempotency, verification, explicit failed/partial/uncertain states and accurate capability detection.

**Code source landmarks:** REDOWN extension/beta/explorer.html, extension/beta/explorer.css, extension/beta/explorer.mjs; REDOWN extension/beta/file-api.mjs and r2-adapter.mjs; existing Click2Cloud src/explorer/*, docs/UNIVERSAL_FILE_API_EXTRACTION.md. REDOWN sources are reference material; examine license boundaries and dependencies before reuse. Never copy REDOWN's legacy V3 right-click registration into V3+1.

## 5. One-click Cloudflare authorization — no manual scopes

**Required owner UX:** Click **Connect Cloudflare** → normal trusted Cloudflare sign-in/consent → return to Click2Cloud connected → account and bucket discovery. No browser prompt that asks the user to type a space-separated list of scope IDs, client IDs, tokens, Worker URLs, or secrets.

- Move verified, least-privilege OAuth scope configuration into the trusted extension's developer-managed configuration; keep scope registration and callback alignment explicit. **Do not guess undocumented scopes or silently expand permissions**. OAuth consent is still required, but technical scope entry is not a user task.
- Preserve authorization-code + PKCE S256, state validation, secure token handling and callback checking; no credentials in GUI, source control, logs or diagnostics.
- Verify that the registered OAuth client actually corresponds to the extension's baked-in public OAuth client ID and callback; a correct-looking redirect input alone is not evidence of a complete registration.
- On setup failure, show an intelligible diagnostic/action (e.g., unregistered callback or unsupported scope), not an endless login loop or generic success. Offer a developer diagnostic outside the ordinary user path.
- The installed Chrome extension ID and the OAuth Client ID are **different identifiers**. Do not overwrite one with the other.
- Keep provider API capabilities separate from identity authorization: a valid Cloudflare login alone does not imply that the authorized R2 Worker write path is ready.

## 6. Actual save path is a critical first-use blocker

The owner can see file rows but cannot actually save files. The current src/explorer Universal File API implementation is a starting point, **not evidence of a working real upload**. Fix the trusted authenticated Cloudflare R2/Worker transport rather than adding a second uploader.

**Explorer save:** select a small local file → choose authorized test bucket/folder → use Universal File API upload → verify exact destination and original bytes independently → only then mark it successful and reflect the file in Explorer/index as appropriate.

**Native right-click save:** right-click a real supported web image/link → choose a V3+1 destination (Simple, Narrow, Depth or Flat) → Chrome gathers permitted source bytes → normal dispatcher uploads original bytes and minimal filename/extension metadata to the provider → independent destination readback/receipt → only then show a verified success. No pop-out pages or false success counts.

Use the user's provider-privacy contract: **source URL, page URL, link URL and browsing provenance must not be sent to destination provider APIs**. The historical REDOWN remoteIngest source-URL pathway does not meet this privacy requirement as-is; reconcile it rather than silently using it. Protect OAuth, allowlisted origins, exact destination identity, original-byte checks, host permissions, Worker credentials and unknown/uncertain write outcomes. Honor real provider size and multipart capabilities, and report present limits truthfully (current extracted R2 adapter contains a 300 MB beta route, not proof of unrestricted size). No silent retransmission on an uncertain upload.

Current likely blocker in extension/background.mjs: unsupported transport operations fail with AUTHORIZED_WORKER_TRANSPORT_UNAVAILABLE and newly seen scopes retain workerReady:false. Fix and prove the real authorized path; do not fabricate a Worker readiness flag.

## 7. Menu synchronization, ownership and no unintended writes

- **One V3+1 compositor, one native registration owner, one click resolver.** Simple/Narrow/Depth remain isolated; display recomposition must be safe and non-destructive.
- If a Show-only change is made, the API must save Show-only; it must not accidentally call createDestination and fail with DESTINATION_EXISTS. Make edit-vs-create explicit and preserve existing IDs.
- Turning off Depth must remove **all Depth-owned menu rows**, while leaving independently configured Simple/Narrow and saved Depth/index data untouched. Turning off an individual Depth bucket removes only that bucket's rows.
- A successful configuration revision is not itself proof of native menu ACK. Expose desired, compiled, applied, Chrome ACK, observed rendering and failure as distinct evidence. A failed apply must have reliable retry/reconciliation and honest UI.
- No stale menu generation, duplicate root, accidental menu-mode collision or inability to hide an unwanted Depth branch. Test mode switches, reloads and full restart.
- "Save" in + Right Click should mean the desired mode/menu will become usable without further **user** steps, not just that a JSON setting changed. Show partial/blocked status honestly where remote discovery is slow or unavailable.
- Debug/Glaciaring stays READ ONLY and cannot change app behavior or act as a fake provider. The same real headless Engine API underpins GUI and authorized script/agent clients.

## 8. Mandatory focused acceptance tests — real behavior, not simulations alone

1. **Depth 10:** In an authorized disposable R2 bucket construct at least four nested folder levels plus several siblings. Without manually expanding those folders in the Explorer, check bucket, set Level 10, Save once. Confirm every existing level 1–4 is in the actual Chrome native right-click menu, correctly parented, with real complete/incomplete status.
2. **No delay-as-a-fix:** Confirm a scan starts automatically after Save, advances, completes/persists and updates native menu without another button or manual browsing. Demonstrate timeouts/rate-limit recovery, partial progress, Chrome menu budgets and failures honestly.
3. **Hide and preserve:** Uncheck Show Depth → Save → Depth disappears from Chrome. Verify the per-bucket index, all folder paths, scope config and chosen depth remain unchanged. Turn it on again → menu returns from index.
4. **Uncheck bucket and preserve:** In Depth popup uncheck an indexed bucket → Save → only that bucket disappears. All folder hierarchy data and depth preference persist. Recheck → cached tree reappears, with sensible freshness verification and no full rescan.
5. **Modes independent:** Set Simple and Narrow destinations; switch display combinations including Flat; verify no hidden mode loses config or index and no visibility-only edit creates a duplicate destination.
6. **Explorer mutation:** With Depth visible and then hidden, create a folder, rename/move/copy/delete a folder in an authorized test tree. After each confirmed operation validate exactly affected index paths, tree/menu projection, no stale grandchildren and no unnecessary full scan. Test uncertain operations and targeted reconciliation.
7. **Restart durability:** Restart/reload the MV3 service worker and Chrome; configuration, index, Show state, current generation reconciliation and correct authorized/disabled menu states survive.
8. **Explorer navigation:** Back, Forward, Up, Refresh function on real test directories; breadcrumb/history is correct; refresh re-fetches current contents and updates relevant index. No fabricated account or file listings while signed out.
9. **One-click OAuth:** Clicking Connect Cloudflare launches real PKCE consent without asking for scopes. Verify registered client and redirect, token lifecycle, denied permission/error path and real account/bucket enumeration.
10. **Real Explorer upload:** Upload a small actual file via the GUI, verify the final bytes independently in R2, and confirm correct UI state. Do not substitute saving a menu configuration.
11. **Real right-click upload:** From an installed Chrome extension, save one actual supported web file to a selected bucket/folder, independently verify original bytes/filename/destination and no prohibited browsing provenance passed to provider APIs.
12. **API parity:** Invoke the same real file operation via the headless versioned API and through Explorer GUI; compare outcomes/receipts and authorization. Confirm V3+1 native menu path uses exactly the configured target.
13. **Quality / sources:** Record exact build SHA, host/extension ID, real source prefix, applied menu generation and proof status separately. Report PASS / FAIL / BLOCKED / NOT TESTED, never claim simulated native menus or successful fixtures are proof of live provider functionality.

Do not run giant unrelated 500/1,000-case scenario projects in place of these focused tests. Do not mutate production buckets or REDOWN.

## 9. Implementation order and handoff instructions

**Priority 0 — make the real app work:** First verify installed extension/build and live OAuth client/callback; remove technical login prompt; wire real authorized Worker/R2 Universal File API transport; get **one real Explorer upload and one real Chrome right-click save** verified end-to-end.

**Priority 1 — complete expected Explorer behavior:** Reuse/reference REDOWN UI and file-operation semantics, implement Back/Forward/Up/Refresh, normal Upload/New Folder and responsive usable Explorer; retain headless file API.

**Priority 1 — fix Depth correctly:** Wire existing inventory/discovery module into Depth Save; persist index and resumable progress; auto-update from confirmed Universal File API folder mutations; recompile and register native menus; resolve Show-only and per-bucket hiding while preserving the full index. This is a product requirement, not a temporary manually-browse workaround.

**Priority 2 — durability, recovery and polish:** Test restart persistence, bounded scale, optional backup restoration, accurate status/progress and REDOWN-level aesthetic quality. **Do not make bucket backups a prerequisite for fast Depth.**

**When Codex starts:** Read this file alongside AGENTS.md, docs/CODEX_P0_BUILD_SCAFFOLD_V3P1_AGENT_READY.md, scaffold/README.md, scaffold/gui/CHROME_EXTENSION_LIVE_ACCEPTANCE.md and docs/UNIVERSAL_FILE_API_EXTRACTION.md. Implement and test the real product; keep REDOWN unchanged. At the end return changed paths, commit SHA, exact tested user journeys, evidence, remaining blockers and one concise reproducible local-install/build instruction. Avoid a second engine, mock-only “completion,” unnecessary migrations and claims of feature parity not supported by actual evidence.

**Owner's simplest acceptance criterion:** **Choose bucket → Depth 10 → Save → real existing hierarchy is in Chrome. Hide it → index remains. Re-enable it → it comes back. Create a folder in Explorer → index updates automatically. Connect Cloudflare → no scope prompt. Back/Forward/Up/Refresh work. Explorer and right-click can actually save verified files.**
