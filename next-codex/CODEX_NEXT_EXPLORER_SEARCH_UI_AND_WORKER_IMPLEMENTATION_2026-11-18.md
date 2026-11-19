# NEXT CODEX — Explorer and gallery polish, then IMPLEMENT audited Worker changes, then experimental URLs/tags

**Date:** November 18, 2026  
**Baseline:** `codex/ux-filename-search-audit-2026-11-18`; fetch its latest HEAD at execution.  
**Status:** **NEXT IMPLEMENTATION RUN** — not another research-only audit.  
**Sequence:** UI correctness fixes first → audited Worker-engine reliability and scalability improvements second → experimental Get URLs and image tags behind a feature flag third → independent regression report and deployment proposal. Report each gate separately.  
**Boundaries:** Only Click2Cloud, isolated feature branch; do not modify `main`, ReDown's code, actual user saved destinations, production Cloudflare Workers or R2. ReDown is read-only reference. Don't weaken existing save authorization or verified receipts. Local tests with fixtures only unless separately authorized.

## STEP 0 — Existing small fix already committed: clean Explorer More

**These two redundant More-menu buttons must stay REMOVED:**

- `Toggle one or two toolbar rows (Ctrl+Shift+F8)`
- `Reset panels to 50/50 (Ctrl+Shift+F9)`

The buttons were removed from `extension/explorer-layout.mjs` in commit `e314e624033542a6ada94c0bd6b70b721c86757e`, and a non-reappearance browser assertion was added in `77d4b3c1df0886cc4b81cefa29b69aa8e2b05b3c`.

**Preserve the action functionality and default key bindings** Ctrl+Shift+F8 (toggle toolbar rows), Ctrl+Shift+F9 (reset tree/gallery to 50/50), splitter pointer/double click, and correct persistence. **NEW REQUIREMENT:** These shortcuts are *references/editable settings*, not UI action buttons. Put a **user-editable Keyboard Shortcuts section at the very bottom of Settings**, in ordinary mode even with Debug OFF, with current keys, Change/Reset (and optionally Disable), conflict detection, persistence and live updates. The former hard-coded F8/F9 chords become defaults only; respect user overrides. Do not restore equivalent menu-only buttons. See [the complete shortcut Settings requirement](../Issues_and_Bugs/Issues/P1_USER_EDITABLE_KEYBOARD_SHORTCUTS_IN_SETTINGS_2026-11-19.md). Run tests against the removal commits as baseline rather than reimplementing the completed small fix.

## STEP 1 — Implement remaining UX and screenshot fixes

All five issues below are source-reviewed requests, not proof of repair:

1. **[Search input hidden despite room in the expanded 2-row Explorer toolbar](../Issues_and_Bugs/Bugs/P1_EXPLORER_FILENAME_SEARCH_HIDDEN_DESPITE_EXPANDED_TOOLBAR_SPACE_2026-11-18.md):** Fix `extension/explorer-layout.mjs` which only considers `#filename-search-form` on the first row; make Search a high-priority, responsive visible field on the available expanded row when there is actual space. Lower-priority Details/View goes into More before Search; preserve `+ Right Click`, navigation, the one-row condensed contract, the global far-upper-right first-row Sun/Moon, and existing File API/IndexedDB.
2. **[Dedicated Search pop-out shortcut](../Issues_and_Bugs/Issues/P1_EXPLORER_FILENAME_SEARCH_POPOUT_SHORTCUT_2026-11-18.md):** Add a third keyboard shortcut (proposed **Ctrl+Shift+F7**, subject to browser/Windows collision check) that focuses the single existing search form when visible and pops out an accessible focused Search input when hidden. Enter submits, Escape closes pop-out, no background Cloudflare request on typing, no duplicate search engine.
3. **[Image preview cleanup and double-click filename rename](../Issues_and_Bugs/Issues/P1_GALLERY_PREVIEW_REMOVE_CAPTION_AND_DOUBLE_CLICK_RENAME_2026-11-18.md):** Remove the visible phrase **"Images in this loaded folder"** from the gallery control strip but preserve Prev/Next and accessible status. Double-click the actual filename at the **top of the preview dialog** to initiate editing/rename; use the existing verified File API rename path, handle Escape/Enter, collisions, uncertain results and directory inventory invalidation. Preserve image decoding/loaded gallery state and keyboard navigation.
4. **[Destinations dialog Show in Chrome checkbox layout](../Issues_and_Bugs/Issues/P1_DESTINATIONS_SHOW_IN_CHROME_CHECKBOX_ROW_2026-11-18.md):** **Show in Chrome** is a separate heading line, with **Simple**, **Narrow** and **Depth** checkboxes aligned on the row immediately under it; don't let the three appear disjointed or interspersed with All/Flat controls. Apply to **Add/Edit Destination and Destinations Manager**; leave their Save/draft/menu behavior intact.
5. **[User-editable shortcuts at the bottom of Settings](../Issues_and_Bugs/Issues/P1_USER_EDITABLE_KEYBOARD_SHORTCUTS_IN_SETTINGS_2026-11-19.md):** In ordinary **Settings**, add the very last **Keyboard Shortcuts** card listing toolbar row toggle (default Ctrl+Shift+F8), 50/50 panel reset (default Ctrl+Shift+F9), and the Search pop-out shortcut (proposed Ctrl+Shift+F7 once implemented). Let users change their key combinations, save them persistently, restore defaults, and receive conflicts/invalid-key feedback. Update live keyboard handlers and accessible references to use the same validated registry; preserve keyboard shortcuts without introducing Explorer More buttons. These are app-local focused-Shelf shortcuts, not global OS shortcuts.

For each, add visual/keyboard browser gates at default Windows Shelf width, 280/320/360/480/600/1100px, all three aesthetics and light/dark themes. Explicitly test the browser screenshot symptom and absence of redundant More buttons, not just code inspection.

## STEP 2 — IMPLEMENT the Worker architecture improvements from the completed audit

**Reference decision:** [Final Click2Cloud vs ReDown architecture audit](../docs/evidence/ux-filename-search-audit/ARCHITECTURE-AUDIT.md) at `1f366aa`, based on Click2Cloud `c1ea866` and ReDown tagged/full source. **This audit is complete; the next run is authorized to implement scoped, gated improvements in Click2Cloud, not to start another read-only comparison.**

**Design goal:** one verifiable destination-owned job claim + canonical operation/receipt identity, reduced communication fan-out and error surface, fewer unnecessary Workers, small successful operations resolving quickly, without breaking existing public URL saves, Simple/Narrow/Depth, File Explorer and current pair-Worker jobs.

**Implement in independently testable, reversible milestones:**

A. **Remove duplicate verification and polling without losing proof.** Project the already-durable verified receipt to open Shelf(s) instead of each Shelf automatically launching another live `inspectRemoteReceipt`/R2 HEAD/OAuth inspection. Preserve at least one independent server-side verification and a manual inspect path for uncertain results. Measure provider calls with 1/2/many open Shelves. Add bounded backoff/status and support a terminal reply for genuinely completed small actions only when verified; distinguish async pending, partial, uncertain and verified.

B. **Pin an immutable operation route on admission.** Capture account, authorized source and destination, both buckets, exact keys, conflict policy, chosen Worker/adapter route and versioned job ID. Make status, cancellation, retries, receipt inspection and recovery use the same route—not a generic primary destination Worker that can return `OPERATION_UNKNOWN` for a pair-Worker job. Keep compatibility for historical receipts and already-admitted pair-Worker jobs; validate wrong-bucket/wrong-target, changed login, lost replies, restart and duplicate dispatch.

C. **Destination-owned data path and qualified adapters.** Keep the destination Worker/durable claim as single effect and receipt owner. For same-bucket and healthy public-URL saves retain the existing minimal route. For eligible cross-bucket operations, qualify Cloudflare provider-native copy **only if** the real provider contract supports destination overwrite protection, source identity/ETag conditions, size, multipart completion, readback and scoped authorization. Otherwise use a narrow source-read endpoint with short-lived audience/key-bound grant to the destination. Eliminate expansion into an unchecked per-pair-Worker explosion for newly eligible jobs; **do not delete or repurpose live legacy pair Workers** while they have claims/receipts. No general central orchestrator that adds a second mutable job authority.

D. **Cross-account and destructive move safeguards.** Preserve separate source and destination grants and forbid forwarding whole profile bearer tokens to another account/Worker. First ship **copy with verified destination while retaining the source**. Keep source deletion/genuinely destructive move disabled behind a separate acceptance gate until correct conditional-delete/immutable source-version proof or an explicit non-atomic policy is documented and authorized. No silent copy→move escalation. Race tests must keep originals on ambiguous outcomes.

E. **Rollback and measurements.** Feature-flag the new route, maintain old route for new traffic rollback and old-job receipt resolution, instrument authoritative operation IDs and request counts without credential leakage. Test 1/10/100/1000 simulated concurrent jobs, 1/10/100/1000 bucket scenarios, 0/1/many Shelves, lost replies before/after writes, permission revocation, multi-account isolation, quota, worker restart, R2 transient errors, duplicate effects, integrity, exact-target receipts, safety and p50/p95/p99 latency. **Do not claim native-copy or cross-account safety based on mocks alone**. If real-provider conditional capabilities are unproven, keep that adapter disabled and report the blocked milestone while shipping only independently proven simplifications.

**Deliver:** implemented code + focused tests + full regression suite and explicit proof/source vs simulation ledger, separate commits for A/B/C/D, release guard, migration/backout plan. No deployment or user cloud mutation is authorized in this request; require separate explicit approval for live tests and rollout.

## STEP 3 — EXPERIMENTAL: right-click multiple URLs and image tags metadata

Follow [experimental Get/Add URL mappings and image tags task](experimental/CODEX_EXPERIMENTAL_GET_URLS_AND_IMAGE_TAG_METADATA_2026-11-18.md). User wants real right-click image **Get URL/Add URLs** capabilities with multiple Cloudflare-linked website URLs per object and per-directory exports (one URL per line grouped by file), plus **right-click image → add/edit tags** saved as persistent cloud metadata, not just browser-local notes. This is a Click2Cloud product pillar, but initial implementation lives under `next-codex/experimental` and **must be feature-flagged OFF by default** until validated.

No auto-enabling public access. Respect R2 custom-domain authorization, multi-site URL identity, metadata overwrite/sidecar constraints, object version/ETag concurrency, verified receipts and record persistence across restarts/renames. Do not assume metadata editing is an in-place cheap operation. Prototype the canonical API and UI only if safe; otherwise preserve as gated proof with explicit blocker.

## Final quality gate

Do **not** mark a task fixed merely because a file was edited or a fixture passed. Verify build, full automated suite, browser/UI tests, no Chrome native save regression, clean git status and exact commit IDs. Report separately what was not exercised in installed Windows Chrome and authorized real Cloudflare; state any provisional parts and independent safe rollout conditions.

**Final output must show which requests were implemented, which are experimental/blocked, actual passing/failing test counts, and the exact branch/commit.**
