# CLICK2CLOUD — NEXT CODEX RUN
## Get URL + resumable directory URL exports · Aesthetic API + High Polish · History loading visual · Explorer More overlay fix

**Prepared:** 2026-11-15 (America/Chicago)  
**Repository:** `thanks-cohn/Click2Cloud`  
**Status:** **OWNER'S IMPLEMENTATION REQUEST FOR THE NEXT CODEX RUN**, not work already shipped, tested on Windows, or deployed.  
**Implementation baseline:** `implement/customer-history-ux-2026-11-15`, checked at `220e5f4e15baeb52fd600ad08f9078f8598a7a2f`. Re-read HEAD and any local unfinished owner work before changing anything.  
**Preserve working checkpoint:** `checkpoint/click2cloud-working-right-click-pre-history-2026-11-15` at `a3a672754156f88bb572bfb4275d1471f0ccb4a6`. Do not move or replace this tag.

# 0. Mission and boundaries

Implement TWO SEQUENTIAL, STACKED branches: finish and verify **Branch 1 (foundation)** entirely, then create **Branch 2 directly from Branch 1's finished commit** and add only the URL work. **Branch 2 = Branch 1 + URLs.** Keep Branch 1 unchanged as a stable branch for independent tests, comparisons and later merging. Do not begin URL feature work or create Branch 2 until all Branch 1 gates are satisfied. Both must preserve working right-click saves, auth, File Explorer, History, diagnostics and recovery.

**Branch 1 — Foundation (finish first, test first):**
1. Fix File Explorer toolbar **More** overlay behind the left tree panel (P1 issue #14).
2. Reuse the existing gallery image-loading animation module in History; no duplicate loading engine.
3. Implement the public-ready **Aesthetic API** with **High Polish as its first overlay/package**, not an independent styling system. The Standard visual is the baseline/fallback. Document real implemented Aesthetic API contract and usage in-repository.

**Branch 2 — URLs (only after Branch 1 is complete):**
4. **Create new Branch 2 FROM THE EXACT FINISHED HEAD OF BRANCH 1.** Add Get URL, explicit authorized bucket-public activation, individual/comma-separated domain addition, file URLs, and robust multi-format URL export for the immediate children of one selected directory (never the entire bucket). Document actual implemented URL API and CLI adapter in-repository.

**Branch relationship:** Both branches are separately inspectable, but Branch 2 inherits every commit of Branch 1. Neither should contain unrelated divergent changes. Prepare to merge Branch 1 first and then Branch 2 after explicit owner approval and passing verification; merging must remain possible with ordinary Git ancestry.

**Explicitly out of scope:** **whole-bucket URL inventory/export**, recursive bucket exports, “Send to another cloud,” cross-cloud transfers, changing ReDown or other products, launch/marketing announcements, billing/subscription changes, and real Cloudflare public-access changes without fresh explicit authorization. No production release, merge, deploy or tag without owner approval.

# 1. Read authoritative existing request documents FIRST

1. `codex/11.15.2026/P1_EXPLORER_GET_URL_DOMAIN_AND_IMMEDIATE_DIRECTORY_TXT_EXPORT_CODEX_REQUEST.md` — **detailed requirements + tests** for workstream 3. **Implement every applicable acceptance condition.** This master summary does not replace its full details.
2. `codex/11.15.2026/HISTORY_REUSE_EXISTING_LOADING_VISUAL_CODEX_REQUEST.md` — **detailed requirements + tests** for workstream 2.
3. `marketing/promoted-features/CREATOR_URL_LIBRARY_BULK_EXPORT_AND_REMOTE_2026-11-14.md` — original Click2Cloud founding product pillar; domain/URL semantics and privacy.
4. `experimental/PLUGGABLE_ANIMATION_STUDIO_PLAYLISTS_AND_VISUALS_2026-11-13.md` — **reference for existing modular loading animation**; do **not** implement future playlists/animation editor merely because they are described.
5. GitHub issue `#14` (`https://github.com/thanks-cohn/Click2Cloud/issues/14`) — File Explorer toolbar More popup defect.
6. `codex/11.15.2026/CLICK2CLOUD_CUSTOMER_UX_HISTORY_PROVENANCE_PERFORMANCE_CODEX_REQUEST.md` — existing customer-history baseline and no-regression constraints.

These requests may live on `main` while the actual implementation starts from `implement/customer-history-ux-2026-11-15`. **Bring only the request requirements into the new implementation branch**; do not silently merge unrelated `main` code or overwrite history work.

# 2. Workstream 1 — P1 Explorer toolbar More popup fix

**Live observed problem:** The compact File Explorer toolbar’s **More** popup appears hidden **behind the left folder/tree panel**. It must be above all Explorer panes/splitters/scrollable content, fully clickable at narrow/wide widths.

- Inspect `extension/app.css` `#shell`, `#shell>main`, `#pane-splitter`, `#explorer-commands`, `#toolbar-overflow` and relevant layout JS/DOM in `extension/explorer-layout.mjs` / `extension/app.mjs`.
- Diagnose **ancestor overflow clipping and stacking contexts**, not just a random increased `z-index`. Use a properly anchored elevated layer/portal if needed.
- Maintain accessible keyboard focus/Escape/outside-click behavior, correct viewport collision handling, scrolling, and saved tree/toolbar splitter positions.
- Preserve Back / Forward / Up / Refresh / More layout and all existing functional commands.
- Verify both aesthetics later. Provide screenshots or reproducible browser evidence; real Windows Chrome behavior must be distinguished from fixture runs.

# 3. Workstream 2 — use the EXISTING image-loading module in History

**Owner's precise correction:** This is **not** about the Aesthetic API. The existing modular gallery loading-visual system is already available. **Simply apply it to History image loading.**

- Reuse `src/explorer/loading-visual.mjs` `mountLoadingVisual(container, selection)` and existing `math` / `media` / `plain` selection and the same saved preference exposed by the gallery.
- Replace the History preview “Loading image…” presentation in `extension/history-page.mjs` with that shared module, without duplicating renderers or inventing a History-specific animation setting.
- Play the selected existing loading visual **only while an eligible visible History image is truly loading**; cleanly destroy it on success, failure, abort, collapse, page change, and leaving History. Pause for background/reduced-motion as implemented.
- The actual image bytes/readers, concurrency, pagination, lazy loads, result status, metadata, and GO TO must remain untouched; no additional cloud requests should be caused by visuals.
- Verify mathematical, local GIF/image/video, plain, invalid-media fallback, rapid navigation, cancel, hidden tab, no memory/RAF/object URL leaks.

# 4. Branch 2 only — API-first Get URL + resumable multi-format DIRECT-directory exports

**ONLY ON BRANCH 2 AFTER BRANCH 1 IS COMPLETE:** The authoritative implementation spec is** \`codex/11.15.2026/P1_EXPLORER_GET_URL_DOMAIN_AND_IMMEDIATE_DIRECTORY_TXT_EXPORT_CODEX_REQUEST.md\`, especially its updated sections **A1–A7**. Read it all and implement/test its scope. This short master overview must not override its more precise UX, API, serialization, auth, or resume requirements.

**Exact right-click file user flow in Click2Cloud File Explorer:**

1. **Get URL** opens immediately, without waiting on network calls.
2. If the R2 bucket has no public endpoint, ask exactly **“Activate public URL for bucket?”** with Yes/No and a clear warning that enabling standard R2 public access may make **all bucket objects public**. No does nothing. Yes only performs the authorized, clearly scoped activation. A development \`r2.dev\` URL must be labeled development-only, and displayed as active only if Cloudflare confirms.
3. Show the **actual public URL of this file at the top**, with Copy/Open. Pending/failure is not a working link.
4. **Below the public URL**: **Add Cloudflare-linked websites** input, italic guidance; accepts either ONE domain/website URL or MULTIPLE values separated by commas, user's choice. Normalize/validate each and handle conflicts safely.
5. **Add** performs actual authorized Cloudflare custom-domain setup for each; show resulting per-domain URL **below the input** only when genuinely configured/active, or visibly label pending. Clear successfully processed input entries; retain failed entries for correction. Repeat Add as desired.
6. **Save**, then **Exit**, as separate controls. Subsequent Get URL displays **all active URLs for that exact file**, while retaining the domain input below for further additions.

**Right-click a selected directory → Export URLs… / Download URLs (.txt):**
- Scope is **IMMEDIATE FILES IN THAT ONE SELECTED DIRECTORY** only, including direct root files if the user deliberately selects root. **NO WHOLE-BUCKET EXPORT, NO RECURSIVE FULL-BUCKET ENUMERATION, NO ALL-BUCKET JOB OPTION.** This reduces cost, scale and unintended exposure. Bucket PUBLIC-ENDPOINT activation remains distinct and in scope.
- Export all active configured domain URLs per direct file, grouped by exact object identity. **TXT:** one URL per nonblank line, all URLs for one file contiguous, one blank line between file groups. No labels in TXT. Structured formats use explicit identity/associations.
- Supported format menu/flag: **TXT, JSON, JSONL, CSV, Markdown, HTML, optional multi-format ZIP**; one canonical record listing/serializer pipeline, not separate cloud requests for each format.
- **API-first:** one shared, documented, versioned authorized service behind both GUI and feasible programmatic adapter/CLI, with familiar methods/flags like get URL, public URL status, activate public URL, add domains, export chosen directory, job status/resume/cancel. CLI examples and detailed signature contracts are in A5. Do not invent a shell command that cannot run from the user's environment.
- **Append-as-you-go and resume:** durable record checkpoints and deduplication, bounded pagination, low memory overhead; pause/resume from the last committed direct-file record after interruption, browser restart, rate limiting or Cloudflare OAuth token **expiration TIME**. Refresh only as legitimately supported; require reconnect when needed; no lost/duplicated URL groups, and no false completed status.
- Test multi-domain input and per-domain partial success, public-access consent, TXT grouping, every structured serializer, nested path exclusion, deterministic counts, interruptions/resumption, invalid cursors, token expiry and live vs fixture/Chrome claims separately.

**Explicitly excluded:** Send to Another Cloud; cross-provider file transfers; whole-bucket URL export or recursive bucket scans; unapproved public access or DNS changes; new billing/subscription code.

# 5. Branch 1 — Aesthetic API with High Polish as overlay #1

## Vision

Click2Cloud needs a **separate, future-public Aesthetic API**: a standardized and **replaceable appearance-only layer** that can eventually enable third-party/user-created themes inspired by e.g. classic Mac OS, Windows 98, nostalgic redux styles, futuristic glass, and other wholly different visual directions. Aesthetic variation should be unconstrained aesthetically **without gaining authority over functionality**.

**Non-negotiable invariant: “An aesthetic can change how Click2Cloud looks, never how it works.”**

For this run:
1. Implement **High Polish as the FIRST built-in Aesthetic API overlay/package**. It is NOT a parallel, independent styling system. **Settings → Appearance → High Polish Mode** toggles Standard (OFF, existing visual baseline) vs High Polish (ON, professional whole-app appearance) through exactly the same versioned aesthetic host contract future themes will use. Light/Dark remains independently configurable.
2. Build and **document in the repository** an explicit **versioned design contract / aesthetic interface**, small and isolated: design tokens for typography, spacing/rhythm, geometry, surface treatments, color, shadows, motion, component state; semantic hooks/adapters. Put presentation code into its own module/files, rather than entangling cloud/auth/save/History state or mutating core functional markup. Styling-only preferences stored separately and migrated safely.
3. Apply High Polish consistently to **ALL customer surfaces**, not just the landing view: header/nav, Remotes, Explorer list/tree/toolbar/context menus/overlays, previews/gallery, History/status/dots/metadata/expanded rows, Settings, help/diagnostics, forms, dialogs, empty/error/loading states, accessible focus.
4. Aim for **visibly excellent, high-end production polish**: precise alignment, consistent spacing, careful type hierarchy, refined controls, restrained depth/shadows, excellent density balance, high-quality popovers/dialogs and carefully controlled motion. Avoid merely replacing colors or spraying generic gradients/blur effects.
5. Preserve layout information density, responsive widths, mouse/keyboard/assistive accessibility, focus states, contrast, `prefers-reduced-motion`, touch targets where applicable, and **no extra pointer-blocking overlay or clipping**. Check the More popup fix in both modes.
6. Changing aesthetics must **not** interrupt saves, downloads, image reads, History receipts, auth, account selection, folder traversal, cloud transactions, or keyboard controls; must not reload/delete existing preferences or credentials. A broken/incompatible aesthetic must safely fall back to standard without destroying data.
7. Follow `docs/api/AESTHETIC_API_V1_DESIGN.md` as the architecture guide and publish accurate, implementation-backed API documentation plus example manifest under `docs/api/` on Branch 1. Design with the **future PUBLIC Aesthetic API** in mind: a documented package manifest/compatibility version, semantic component names/tokens, validation, isolation and guaranteed fallback. **Do not grant visual packages unrestricted privileged JavaScript, raw remote CSS, extension APIs, network privileges, or access to user files, secrets, or browser storage.** Future public package installation/marketplace/import are **not requested for this run**; document extension points only.
8. **Keep aesthetic styling separate from the pre-existing image-loading animation system.** This workstream must not rewrite `mountLoadingVisual` or introduce a new visual loader. History loading shared reuse is exclusively workstream 2. Future aesthetics may eventually express compatible visual defaults, but should not override a user's selected existing loading visual.

## Tests / professional standard

- Visual screenshots for whole app **Standard OFF** versus **High Polish ON**, with meaningful before/after on wide, narrow and resized windows, dark and light where supported.
- Component states: focus/hover/disabled/loading/error; toolbars, context menus, dropdown stacking, long text, scroll, accessible text contrast, reduced motion; guard against CSS specificity collisions.
- A test that toggling High Polish mid-session does not alter saved destinations, active file operations, cloud API calls, menu registrations, History pagination or the selected image-loading mode.
- A malformed/future-incompatible preset must safely fall back, and dynamic style/theme switching must not leak resources or cause layout dead zones.
- Account for performance: avoid intrusive repaints, layout shift or continuously running heavy visual effects; measure relevant interactions and report regressions.

# 6. Sequential engineering workflow — produce TWO mergeable branches

1. Record the exact HEAD of `implement/customer-history-ux-2026-11-15` (observed `220e5f4e15baeb52fd600ad08f9078f8598a7a2f`), check for unfinished local changes, and run the baseline tests. Preserve the existing working checkpoint tag.
2. **CREATE BRANCH 1**: Suggested `implement/explorer-aesthetic-foundation-2026-11-15`, from that history HEAD. Complete all of: **Explorer More layering repair → History existing loading-visual reuse → Aesthetic API with High Polish as its first overlay**. No Get URL, public bucket setup, directory exports or URL-specific implementation work may land on Branch 1.
3. Fully test and commit Branch 1. Perform focused, full build/test, UI/Chrome checks, accessibility, Light/Dark, Standard/High Polish, and Simple/Narrow/Depth save no-regression verification. Write Branch 1 results and API documentation at `docs/api/`. Preserve the passing final SHA. **Do not create Branch 2 early**. If Branch 1 has blockers, report them and stop or resolve them on Branch 1 before proceeding.
4. **ONLY AFTER Branch 1 has passed**, **CREATE BRANCH 2 FROM THE FINAL VERIFIED BRANCH 1 HEAD** (NOT from the old history branch and not from parallel `main`). Suggested `implement/explorer-aesthetic-plus-urls-2026-11-15`. Branch 2 starts with ALL completed Branch 1 functionality and commits. Implement only URL work on top of that base, as described in the detailed URL request.
5. Use one shared, documented/versioned API behind the URL GUI and a feasible programmatic/CLI adapter. Standardize duration semantics: GUI export jobs default to `30m` of active processing time, resuming from durable checkpoints when the run window ends; programmatic jobs default to **no overall deadline** (`timeoutMs: null`), with conventional `--timeout 30m`, `--no-timeout`, `jobs resume --job-id ID` syntax. All paths respect OAuth token **expiration TIME**, request timeouts, permissions and rate limits; no false guarantee of unattended browser operation. No whole-bucket export.
6. On Branch 2, run **the complete Branch 1 regression suite again**, plus Get URL, consent, Cloudflare domain setup, individual/comma-separated domains, grouping and multi-format directory export, interrupted/resumable/reconnected jobs, auth timeout, Unicode, disabled/blocked URLs, pointer/keyboard checks. Document actual methods and CLI semantics in `docs/api/URL_API_V1.md`; do not claim a CLI exists if it cannot run with current auth architecture.
7. Deliver TWO branch names, exact parent/child SHA ancestry, comparison commands, the commits exclusive to Branch 2, tests run and PASS/FAIL/BLOCKED/NOT VERIFIED reports for each. Label fixture/headless Chrome/live Cloudflare evidence precisely. Show a `git merge-base --is-ancestor <branch1-head> <branch2-head>` ancestry check and that Branch 2 can merge cleanly after Branch 1, unless later unreviewed changes intervene.
8. **Do not merge either branch, deploy, release, change live bucket publicity, or move tags without explicit owner authorization.** If later authorized, merge Branch 1 into the target branch first, then Branch 2; Branch 2 should contribute just its URL-specific commits.

# 7. Owner-facing acceptance summary

- **Get URL:** Instant File Explorer right-click → if needed **“Activate public URL for bucket?”** Yes/No with scope warning → real public URL on top → **one OR comma-separated website domains** in field below → **Add** connects each with truthful status and new URLs listed under input → **Save → Exit**. Next Get URL shows all valid file links.
- **Directory exports:** Selected folder right-click exports **only immediate files** (never whole bucket) to TXT, JSON, JSONL, CSV, Markdown, HTML or multi-format ZIP. TXT groups all verified URLs per object (one URL per nonblank line and blank line between groups); structured formats identify objects explicitly. One API powers GUI/CLI; jobs append durably and resume after interruptions or OAuth token expiration **time**.
- **High Polish:** A single independent Settings toggle transforms the WHOLE app, while preserving Standard and all functionality; architecture is future-public and safely isolated.
- **History visuals:** The EXISTING loading animation choice is shared by gallery and History, with no new engine or duplicated settings.
- **Explorer overlay:** Toolbar More is always visibly **above** the tree/list panes and is interactable.
- **Non-goals respected:** No cross-cloud transfer, no unauthorized Cloudflare exposure, no corruption of working save pipeline, no premature deployment.

**This document is the single master entry point for the NEXT CODEX RUN: finish Branch 1 first, then branch FROM it and add URLs on Branch 2. Both branches must be mergeable.**
