# Simple / Depth source-preserving extraction (Phase 1)

> **V3+1 design correction (2026-11-03):** Depth's persistent inventory is intended to crawl the **full reachable authorized cloud tree**, independently of the selected 1–10 right-click menu presentation depth. The preserved V3 discovery code in this extraction is **not yet compliant**: it presently uses the selected depth to bound its discovery and cache. The owner also requires cumulative daily `current.json`, weekly `weekly.json`, an incremental journal, and verified encrypted recovery outside Chrome storage. See [Depth full-index and JSON recovery](DEPTH_FULL_INDEX_AND_JSON_RECOVERY.md). Treat the extracted V3 as a behavioral baseline only, not the finished V3+1 inventory design.


**Decision approved by owner (2026-11-03):** Retain V3 Simple and Depth algorithms. Make only narrowly scoped Simple tweaks later. **Narrow is to be redesigned from scratch in a subsequent phase.** Do not attempt to port or embellish Narrow now.

## Proof of origin
- Source: `thanks-cohn/REDOWN`, `extension/right-click-v3.js`, main and `codex/v3-parity-first-reconstruction` (both returned the same file blob at inspection).
- Exact source blob SHA: `08ee4f847d776e8488f71fc7a846ecf5835c7a4a`.
- Extracted original V3 Simple sections: readiness/validation/eligibility (lines 5–31), compare (97), simpleTargets/simpleProjection (191–227), bucketId/activated (270–271).
- Extracted original V3 Depth sections: readiness/identity (5–6, 32), discovery/inventory/projection/bounds (68–190).
- Those original algorithm bodies are embedded in `src/modes/simple-v3.mjs` and `src/modes/depth-v3.mjs`; new wrappers expose mode-only `project`/`resolve` APIs and do not import one another.
- The old combined REDOWN `project` function (228–249) and `resolve` (251–269) are intentionally **not** copied: they cross-connect modes. The new `src/registry/mode-registry.mjs` is the single presentation boundary.

## Mode state isolation

| Mode | Owns | Does not read/write |
|---|---|---|
| Simple | saved destination shortcuts, parent enabled flags, simple labels/order, default `redown` bucket, activated roots | depth scopes/inventory or Narrow work-in-progress |
| Depth | `levelScopes`, depth value, current/remembered R2 inventory, bounded pages, frontier, live discovery, exact prefix routes | Simple saved aliases, default root, Narrow configuration |
| Narrow (future) | new Narrow-only location shortcuts, aliases, tree expression | Simple/Depth state |
| Registry | ONE chosen mode's finished descriptors, cross-provider IDs, root and flat provider leaves, order, callback routing | cloud discovery, alias writes, scope edits, bucket creation, data copying |

The original old projection appends Simple's `Home` footer while Depth is selected. To remove coupling, the extracted Depth returns only Cloudflare and its own scoped folders; a general Home action (if desired) must be explicitly owned by neutral menu registration/navigation, never recomputed from Simple's shortcut state. That is a boundary change, not a Depth algorithm rewrite.

## Not yet done
- No Narrow rewrite, migration, production REDOWN change, installed Chrome test, or fully implemented Portal.
- No claim of parity until targeted tests and actual Chrome/R2 E2E compare to source golden output; all existing REDOWN tests remain authoritative baseline references.
- The early `src/core/menu-compiler.mjs` bootstrap prototype is **not** the extracted V3 source and must not be used as the parity authority; retire/replace after mode seams and tests are accepted.
- The present Depth limit is the original maximum 10. The real R2 16-level fixture tests boundary clamping first; extending the maximum is a **separate opt-in change**.

## No crossing rule
A Simple edit cannot alter Depth's scope/index revision. A Depth scope/depth change cannot alter Simple's destination revision/labels/order. Narrow never imports either module. Registry must be idempotent and preserve source action IDs, and unknown or unregistered actions must fail closed.
