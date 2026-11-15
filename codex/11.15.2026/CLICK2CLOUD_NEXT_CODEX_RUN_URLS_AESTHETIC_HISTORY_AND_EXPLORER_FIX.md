# CLICK2CLOUD — NEXT CODEX RUN
## Verified Get URL + TXT directory export · Aesthetic API + High Polish · shared History loading visual · Explorer More overlay fix

**Prepared:** 2026-11-15 (America/Chicago)  
**Repository:** `thanks-cohn/Click2Cloud`  
**Status:** **OWNER'S IMPLEMENTATION REQUEST FOR THE NEXT CODEX RUN**, not work already shipped, tested on Windows, or deployed.  
**Implementation baseline:** `implement/customer-history-ux-2026-11-15`, checked at `220e5f4e15baeb52fd600ad08f9078f8598a7a2f`. Re-read HEAD and any local unfinished owner work before changing anything.  
**Preserve working checkpoint:** `checkpoint/click2cloud-working-right-click-pre-history-2026-11-15` at `a3a672754156f88bb572bfb4275d1471f0ccb4a6`. Do not move or replace this tag.

# 0. Mission and boundaries

Implement **four separately testable features/repairs** on a **new branch**, with strict preservation of the working Click2Cloud Chrome right-click saves, cloud authorization, File Explorer, History, diagnostics and recovery. Complete one phase at a time, record test results before proceeding, and report any unverified or blocked aspects transparently.

**The four workstreams:**
1. Fix File Explorer toolbar **More** overlay appearing behind the left tree panel (**P1 UI bug, GitHub issue #14**).
2. **Reuse the existing gallery/File Explorer image-loading animation module in History image previews** (no new animation engine).
3. **Get URL** for individual R2 objects, verified Cloudflare custom-domain setup, and **Download URLs (.txt)** for files **immediately inside** an R2 directory.
4. Build a **separate reusable Aesthetic API** and a premium **High Polish** appearance toggle in Settings. Architect the presentation interface for eventual safe **public/user-created aesthetics**; do not build a public marketplace or enable untrusted remote code in this run.

**Explicitly out of scope:** “Send to another cloud,” any cross-cloud copy/transfer, changing ReDown or other products, launch/marketing announcements, billing/subscription changes, bulk recursive TXT exports (unless separately requested), and live Cloudflare public access changes without fresh explicit authorization. No production release, merge, deploy or tag without owner approval.

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

# 4. Workstream 3 — Get URL and immediate-directory TXT export

Implement the *full detailed specification* in the URL-only Codex request listed above. Customer requirements:

**Right-click file inside Click2Cloud's own File Explorer → Get URL** (not the native Chrome page/image context menu).
- Read the actual selected R2 account, bucket and exact object key and any legitimately configured public endpoints.
- **Existing URL:** show **all available, correctly mapped link options for that particular file**, status, Copy and Open.
- **No URL:** clearly show “No public URL available” and **Make Public URL…**. Do not fabricate `r2.dev`, a domain, or a URL for a private object.
- **Always show, UNDER the URL list**, the editable **Connect your website domain** field (placeholder `assets.example.com`) and italic help explaining that a Cloudflare-managed domain/subdomain can be connected to the R2 bucket to give its eligible objects URLs. **Do not hide this input after a link exists.**
- Provide **OK / Save** to initiate or select an eligible domain setup **with explicit consent**; show Cloudflare account/zone/DNS/API prerequisites, exact bucket scope, pending/active/errors, and **Refresh** to update the visible link list. A clicked Save does not mean DNS/TLS/public availability is immediately verified.
- Cloudflare's standard public custom domain generally makes the bucket's objects publicly addressable: show a clear **ENTIRE BUCKET PUBLIC ACCESS** warning before authorizing any change. No accidental publicity; do not modify real buckets without fresh explicit owner approval. Arbitrary website strings cannot be treated as verified bucket endpoints.
- Generate links from exact object keys with encoding and root/prefix handling, including all file types and Unicode/special characters.

**Right-click directory inside Click2Cloud File Explorer → Get URLs… / Download URLs (.txt)**.
- Operate on **IMMEDIATE/direct files** under the selected prefix, **not descendants in nested subdirectories**. Root folder is valid. Exclude virtual folder markers/internal housekeeping objects by default.
- In Get URLs… show actual eligible links and optionally choose the verified domain/endpoint.
- **Download URLs (.txt)** must produce a real UTF-8 plain-text download with **one real URL per line**; by default **one URL per direct file** on the selected endpoint. **No filenames, headings, JSON, Markdown, or CSV.**
- Enumerate **all** matching objects using true paginated/cursor-based read-only listing, not only currently visible Explorer items or History’s 25-per-page. Large directories may take some time: display truthful scanning/exporting progress and support cancel/error/partial-export reporting.
- Stable ordering and dedupe. Zero eligible file case must be explicit; never silently fabricate or omit links or mislabel a partially failed download complete.
- Completely separate read-only TXT exporting from any public-access mutation. No public URLs for unverified private endpoints.
- Verify 0/1/25/26/100+/1000+ objects, exact immediate-prefix semantics, nested descendants excluded, non-image filenames, multiple configured domains, incomplete DNS, no domain, permission failures, rate limiting and abort.

**Do not implement Send to Another Cloud** in this run. It remains a later marketing feature.

# 5. Workstream 4 — independent Aesthetic API and High Polish mode

## Vision

Click2Cloud needs a **separate, future-public Aesthetic API**: a standardized and **replaceable appearance-only layer** that can eventually enable third-party/user-created themes inspired by e.g. classic Mac OS, Windows 98, nostalgic redux styles, futuristic glass, and other wholly different visual directions. Aesthetic variation should be unconstrained aesthetically **without gaining authority over functionality**.

**Non-negotiable invariant: “An aesthetic can change how Click2Cloud looks, never how it works.”**

For this run:
1. Add **Settings → Appearance → High Polish Mode** with an easy ON/OFF switch. **OFF by default:** preserve current functional visual baseline. **ON:** professionally polished **whole-app** presentation. Dark/Light theme remains independently configurable.
2. Build an explicit **versioned design contract / aesthetic interface**, small and isolated: design tokens for typography, spacing/rhythm, geometry, surface treatments, color, shadows, motion, component state; semantic hooks/adapters. Put presentation code into its own module/files, rather than entangling cloud/auth/save/History state or mutating core functional markup. Styling-only preferences stored separately and migrated safely.
3. Apply High Polish consistently to **ALL customer surfaces**, not just the landing view: header/nav, Remotes, Explorer list/tree/toolbar/context menus/overlays, previews/gallery, History/status/dots/metadata/expanded rows, Settings, help/diagnostics, forms, dialogs, empty/error/loading states, accessible focus.
4. Aim for **visibly excellent, high-end production polish**: precise alignment, consistent spacing, careful type hierarchy, refined controls, restrained depth/shadows, excellent density balance, high-quality popovers/dialogs and carefully controlled motion. Avoid merely replacing colors or spraying generic gradients/blur effects.
5. Preserve layout information density, responsive widths, mouse/keyboard/assistive accessibility, focus states, contrast, `prefers-reduced-motion`, touch targets where applicable, and **no extra pointer-blocking overlay or clipping**. Check the More popup fix in both modes.
6. Changing aesthetics must **not** interrupt saves, downloads, image reads, History receipts, auth, account selection, folder traversal, cloud transactions, or keyboard controls; must not reload/delete existing preferences or credentials. A broken/incompatible aesthetic must safely fall back to standard without destroying data.
7. Design with the **future PUBLIC Aesthetic API** in mind: a documented package manifest/compatibility version, semantic component names/tokens, validation, isolation and guaranteed fallback. **Do not grant visual packages unrestricted privileged JavaScript, raw remote CSS, extension APIs, network privileges, or access to user files, secrets, or browser storage.** Future public package installation/marketplace/import are **not requested for this run**; document extension points only.
8. **Keep aesthetic styling separate from the pre-existing image-loading animation system.** This workstream must not rewrite `mountLoadingVisual` or introduce a new visual loader. History loading shared reuse is exclusively workstream 2. Future aesthetics may eventually express compatible visual defaults, but should not override a user's selected existing loading visual.

## Tests / professional standard

- Visual screenshots for whole app **Standard OFF** versus **High Polish ON**, with meaningful before/after on wide, narrow and resized windows, dark and light where supported.
- Component states: focus/hover/disabled/loading/error; toolbars, context menus, dropdown stacking, long text, scroll, accessible text contrast, reduced motion; guard against CSS specificity collisions.
- A test that toggling High Polish mid-session does not alter saved destinations, active file operations, cloud API calls, menu registrations, History pagination or the selected image-loading mode.
- A malformed/future-incompatible preset must safely fall back, and dynamic style/theme switching must not leak resources or cause layout dead zones.
- Account for performance: avoid intrusive repaints, layout shift or continuously running heavy visual effects; measure relevant interactions and report regressions.

# 6. Engineering workflow, verification, delivery

1. **Audit and record base state first.** On a fresh branch from the existing customer-history implementation HEAD, run the current suite to establish a baseline. Preserve settings/profiles and working R2 save behavior. Do not implement directly on `main`.
2. Phase order recommended: **More overlay fix → History loading reuse → URL + TXT features → Aesthetic API + High Polish**, with independent commits/tests and an explicit regression gate after each phase. If any phase is blocked, isolate and report instead of compromising prior successes.
3. Maintain trusted authority boundaries: Explorer context-menu policy `src/api/explorer-context-menu.mjs` + `extension/app.mjs` `contextFor()` must be updated consistently for Get URL/actions; do not bolt privileged actions onto UI-only checks.
4. Real installed Chrome, network/domain readiness, and live R2 GET/HEAD checks may not be available in the Codex sandbox. Label results as **UNIT / FIXTURE / HEADLESS CHROMIUM / INSTALLED CHROME / LIVE CLOUDFLARE**. Never describe mock or headless results as proof of live deployments or actual public URL accessibility.
5. Run focused tests, full existing suite, build, browser UI scenarios, snapshot/regression and stress tests (pagination, rapid image loads, context-menu overlays, theme toggle). Ensure failure/cancel states and no collateral changes to Simple/Narrow/Depth.
6. Write final `docs/evidence/...` with changed files, exact commits, test commands/counts and concise tables for each feature: **BEFORE / AFTER / PASS / FAIL / BLOCKED / NOT VERIFIED**. Note independently verified R2 paths/links only when actually checked.
7. **Deliver a ready-to-test implementation branch and report**, but **NO merge to main, deployment, release, tag movement, production public-domain changes, or cross-cloud development** until owner authorizes those separately.

# 7. Owner-facing acceptance summary

- **Get URL:** File Explorer file right-click shows links or Make Public URL; persistent domain input + italic explanation underneath; Save/OK with explicit consent; refresh shows only truly available verified links.
- **Directory TXT:** Folder right-click downloads a .txt containing **one URL per immediate file**, ALL matching direct children, even if scanning takes time; never includes nested descendants by default.
- **High Polish:** A single independent Settings toggle transforms the WHOLE app, while preserving Standard and all functionality; architecture is future-public and safely isolated.
- **History visuals:** The EXISTING loading animation choice is shared by gallery and History, with no new engine or duplicated settings.
- **Explorer overlay:** Toolbar More is always visibly **above** the tree/list panes and is interactable.
- **Non-goals respected:** No cross-cloud transfer, no unauthorized Cloudflare exposure, no corruption of working save pipeline, no premature deployment.

**This document is the single master entry point for the NEXT CODEX RUN.**
