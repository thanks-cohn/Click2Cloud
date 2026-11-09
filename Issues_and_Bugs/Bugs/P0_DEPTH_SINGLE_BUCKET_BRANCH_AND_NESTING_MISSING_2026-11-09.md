# P0 — Depth selection produces no nested Chrome menu; single-bucket Depth must remain a branch

**Reported:** 2026-11-09
**Status:** OPEN — bug report only; not fixed or verified
**Area:** Click2Cloud / Right-click destinations / Depth mode / canonical menu compiler and native Chrome menu
**Baseline context:** working pre-upgrade checkpoint `checkpoint/click2cloud-working-before-major-upgrades-2026-11-09`. Preserve Simple/Narrow configurations and existing saves.

## User-observed defects

1. **Depth does not show its nested folder options.** With multiple configured Narrow destinations and possibly one Simple destination, selecting Depth for the right-click display does not cause the Depth folder hierarchy to appear. The user sees no nested Depth options.
2. **Single-choice flat Cloudflare rule incorrectly affects Depth.** The prior guideline “if only one location, Cloudflare should be a flat save leaf” **must NOT apply to Depth**. Even when exactly **one bucket is selected for Depth**, the Cloudflare right-click entry must be a **submenu/branch**, showing the selected bucket and its descendant folders to the configured depth, with actionable saves at eligible directories.

## Required behavior

- Switching the right-click display to **Depth** must actually render Depth's own folder tree from the selected Depth bucket(s) and depth limits, not fall back to the Simple or Narrow destination list.
- **Cloudflare R2 must always be a branching menu when Depth is active with a selected bucket**, even if it is the only selected bucket or would otherwise count as one “location.” The selected bucket itself and its discovered eligible descendant directories must be navigable according to the configured depth.
- Depth's choice and presentation must be **independent** of how many Narrow or Simple destinations have been configured; their saved configuration stays intact when changing display mode.
- A single selected Depth bucket is **not** a single save action. The bucket is a hierarchy root potentially containing multiple save targets.
- Depth must not require that every descendant be separately added as a Simple/Narrow destination. Depth is driven by the selected bucket and its discovered folders.
- The depth limit must be enforced as configured; indicate unavailable/stale/incomplete inventory accurately rather than silently presenting an empty/flat success state.
- Do not silently switch to Default-only or Cloudflare flat-leaf behavior while the user explicitly selected Depth.
- Preserve actual bucket/prefix routing and existing TRUE REMOTE save receipts; rendering a tree must not change cloud object keys or permissions.
- Keep other providers' placeholder rows and existing normal (non-Depth) flat/single-location policy unchanged.
- Per the separate issue `P1_DEPTH_DESTINATIONS_MANAGER_NO_MAKE_DEFAULT_2026-11-09.md`, Depth rows in Destinations Manager must not offer “Make Default.”

## Reproduction / acceptance scenarios

**A. One bucket, Depth alone:** Configure Depth for one Cloudflare bucket (e.g. `redown`), choose a depth of at least 3, select Depth as the active Chrome display mode. Expect `Cloudflare R2 > redown > [folder] > [subfolder]`, with nested native Chrome parent/child menu IDs and actionable save entries. Cloudflare must NOT become a single direct leaf solely because one bucket was selected.

**B. Cross-mode coexistence:** Configure several Narrow destinations and one Simple destination. Configure Depth for one bucket. Select Depth. Expect the discovered Depth hierarchy to appear, independently of those Narrow/Simple settings. Switch back to Narrow or Simple and verify their entries remain as configured; switch to Depth again and verify tree persists.

**C. Multiple buckets:** If authorized Depth buckets are selected, each tree is represented correctly with no lost branches or target collisions.

**D. One bucket with no eligible descendants:** Still honor Depth as an explicit bucket branch; show a valid bucket-level save choice or a truthful empty/incomplete/error explanation according to existing policy. Do not misreport “Depth works” based on a flat provider action or silent fallback.

**E. Persistence / dispatch:** Reopen Chrome, log out/in if applicable, and verify selected Depth display and destination tree are still correct. Select a deep folder through a real right-click, save a public image, verify actual R2 object at that exact prefix. Do not use fixture-only evidence to claim Windows native acceptance.

## Likely investigation boundaries (hypotheses, not confirmed root cause)

- `src/modes/depth/index.mjs` selection and projection.
- `src/core/menu-spec.mjs` composite projection and the single-cloud-destination/Default/Quick promotion logic; nested row parent-placement preservation.
- GUI/API `setShowInChrome` or equivalent display controls; persisted selected mode and discovered folder inventory.
- Chrome native adapter parent IDs, registration ACK and dispatch.

**Do not assume the nesting failure is caused by a specific module without reproducing it.**

## Completion gate

Before marking fixed, provide the exact source root cause, a true Depth tree with native parent IDs, accurate bucket/depth selection in API and GUI, correct results for scenarios A–E, regression tests protecting Simple and Narrow, and actual object verification where real Cloudflare/Chrome is available. Report blocked steps rather than fabricating success.

No application code is changed by this issue record.
