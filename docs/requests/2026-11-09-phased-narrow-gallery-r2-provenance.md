# Click2Cloud — phased Codex implementation request (2026-11-09)

**Status:** REQUEST ONLY. This document is a work order, not evidence of implementation or approval to delete user data.
**Repository:** thanks-cohn/Click2Cloud
**Read-only reference:** thanks-cohn/REDOWN
**Working baseline checkpoint:** `checkpoint/click2cloud-working-before-major-upgrades-2026-11-09` at `3b24320138ff0ebbf50a0e6a912a5d2800038676`.
**Primary goal:** Reliable native Narrow nesting and visibility; mutually exclusive Default/Quick Select; stable customizable gallery; and per-object provenance, added only after menu correctness is proven.

## Operating rules and acceptance

1. **Execute in dependency order.** Inspect the current code and existing evidence first. Fix Narrow's actual menu generation and Chrome dispatch before adding visibility or provenance. Finish and test each phase before claiming the next is complete. If a real installed browser is inaccessible, report that limitation honestly; do not turn fixture results into production claims. Implementation of independent later stages may continue only when earlier behaviors are proven in a representative executable environment, with the missing installed acceptance clearly marked BLOCKED.
2. **Protect the known-good baseline.** Do not reset profiles, delete destination configs, clear tokens, change Cloudflare objects, or break TRUE REMOTE saves, independent R2 verification, login/logout, saved default, Explorer previews/downloads (0.3.17), Simple, or Depth. REDOWN is read-only. No new recovery machinery, architecture overhaul, or diagnostics platform.
3. **API-first parity.** Every GUI action here must use an equivalent programmatic operation with the same validation, authorization, persisted effects, and errors. Chrome must consume the canonical menu spec; tests must inspect actual parent IDs, titles, targets and native registration ACK.
4. **Evidence.** For each phase: source root cause, changed files, deterministic tests, UI evidence, native Chrome evidence when available, exact success/blocked classification, and git revision. Preserve the user's working baseline tag.
5. **Commit logically**, preferably one coherent commit per accepted phase; do not push/merge or alter production deployments without explicit authorization. Existing modified working files must be preserved.

## Phase 1 — Repair real Narrow nested right-click menus (P0; blocking dependency)

Existing symptom: Narrow shows direct/flattened selections as though ancestors are already hidden. Audit persisted Nested/Narrow settings → `src/modes/nested/index.mjs` projection → `src/core/menu-spec.mjs` composite compiler → Chrome native adapter → click dispatch. A suspected defect is that composite compilation reduces nested rows to destination leaves, discarding `parentPlacement`. Confirm or refute with runnable tests before changing.

With physical destination `body/arm/bicep/muscle/` and configured titles `human / money-maker / guns / swole`, the **Show All** menu must preserve actual Chrome submenus:

```text
Cloudflare
  human
    money-maker
      guns
        swole  [save action / Save here as appropriate]
```

Final save key must still begin `body/arm/bicep/muscle/`. Multiple destinations and shared ancestors must work; no duplicate branches, label collisions or wrong target routing. Maintain initial flat Google Drive, Dropbox, OneDrive placeholders and Cloudflare behavior when there is only one choice. Simple and Depth remain independent.

**Gate:** inspect generated/native menu parent-child relationships, native apply ACK, click dispatch target, and verified R2 object at the exact intended key. Do not claim actual Windows installed Chrome acceptance without that test.

## Phase 2 — Narrow reversible hierarchy visibility

**Important: Hide All is NOT deletion and NOT a global off switch.** It hides all *ancestor menu levels* and keeps the **last/deepest directory of each selected Narrow path visible and actionable**. The switch label flips `Hide All` ↔ `Show All` each click. Show All reveals the whole original hierarchy. It does not change physical R2 keys or saved directory titles.

Example:
- Full physical: `body/arm/bicep/muscle`; titles: `human/money-maker/guns/swole`.
- **Show All:** `human > money-maker > guns > swole`.
- **Hide All:** `swole` directly actionable, STILL SAVING under `body/arm/bicep/muscle/`.
- **Custom per-level:** `body hidden; arm visible; bicep hidden; muscle visible` produces `money-maker > swole`, still the same physical destination.

Preserve per-level visibility selections (and previously customized visibility across Hide All/Show All when feasible without ambiguity); define exact reversible semantics and exercise repeated toggles, multiple paths, shared ancestors, restart and relogin. Final directory may never become inaccessible by hiding its parents. This is only a *presentation* transformation.

**Gate:** compare full versus collapsed versus mixed generated and installed menus while proving identical physical destination.

## Phase 3 — Destination controls

### 3A — Default ↔ Quick Select mutual exclusion (implement now)

They are both clickable switches, **neither permanently disabled**. Clicking Default on a destination sets Default ON and that destination's Quick Select OFF. Clicking Quick Select sets Quick ON and clears its Default assignment (global default state). Clicking an active button again turns it OFF. At most one global Default, and no one destination can have both flags ON. Turning one OFF does not automatically turn the other ON. Enforce in configuration write API, GUI, persisted state, migration/legacy handling and native menu, not merely by suppressing duplicate rendering. Preserve unrelated destinations.

### 3B — Per-row destination visibility eye (separate enhancement; implement after core Narrow behavior)

Every saved destination in the scrollable Destinations Manager should have an immediately clickable eye icon (tooltip EXACTLY **"Change Visibility"**) without opening an editor. Eye toggles whether that destination appears in its relevant native right-click menu. Hidden destinations remain listed, editable, restorable, and stored with exact labels, keys and options. It must not delete folders or objects. Simple/Narrow independence; explicit policy for Default or Quick destinations hidden by the eye—hidden must not accidentally reappear as an unwanted default shortcut, and stale native menu entries must not dispatch. This feature is separate from Narrow Hide All (one removes a save choice; the other suppresses ancestor labels but keeps the save choice).

**Gate:** GUI/API/storage/native parity and repeatable toggles across restart/relogin.

## Phase 4 — Stop image container layout jumping (before animations)

Image thumbnails/gallery/frame must reserve stable, responsive geometry independent of image intrinsic dimensions. Do not resize or shift the viewer when moving among portrait, landscape, large, GIF, failed/slow and rapidly navigated images. Fit actual decoded image within frame preserving aspect ratio. Keep navigation/control layout fixed. Measure DOM box geometry across transitions, allowing true viewport resize but no per-image layout shift.

**Gate:** real Chromium DOM measurements during slow/failed/rapid loads.

## Phase 5 — Two strictly isolated loading-visual modules (after fixed geometry)

One **small stable loader interface** owns mounting/unmounting a visual inside a pre-sized container and responds to the existing image loading lifecycle. The image container/viewer controls sizing and the real image decode; no visual controls R2 bytes/network or cloud transfers. Default mathematical animation and user media use separate modules.

**Mathematical Geometry module:** Mesmerizing lightweight evolving harmonic/parametric/symmetrical geometry. Fully replace or edit equations, geometry, movement, colors and parameters **inside this module only** later; no edits to viewer, Settings, media module, or cloud code. Respect reduced-motion, offscreen pause, cleanup and memory constraints. Not a heavyweight plugin framework.

**Custom Loading Media module:** Settings permits local user selection of (a) static PNG/JPEG/WebP, (b) looping animated GIF, (c) looping *muted* MP4 snippet, or (d) mathematical default, and optionally static no-animation fallback. Select, validate type/size, store user-selected media locally in extension-controlled storage, replace, remove, resume after restart, gracefully handle missing/invalid media, stop when real image decoded; no extension rebuild or source edit when replacing custom media. Do not upload user-selected loading media to Cloudflare. Never allow media aspect ratio to resize frame; release object URLs/video decoders/listeners, respect autoplay restrictions and reduced motion.

**Gate:** tests for every media type, replacement, persistence, failure, cancellation and module isolation. A change to math equations must not require changes to custom media or viewer.

## Phase 6 — Polish gallery Previous/Next controls

Refine appearance of the real existing navigation buttons: balanced chevrons, tasteful rounded styling, hover/focus/disabled states, fixed positions, keyboard and pointer accessibility, first/last boundary and rapid navigation. No layout shift and no gallery logic rewrite unless a proven defect demands it.

**Gate:** aesthetic screenshot plus functional keyboard/mouse/boundary tests and stable geometry.

## Phase 7 — Dual Hierarchy Provenance on every TRUE REMOTE R2 saved object (last; depends on Phases 1–3)

Only add metadata **after** the actual native selected menu hierarchy, its mode, each level's visibility, and physical destination are reliably resolved. Capture a bounded immutable snapshot at dispatch, authenticated to the same operation, attached during the original Worker→R2 object write, without browser byte staging or a second full-object rewrite. Reverify readback metadata and object bytes. Do not weaken Worker authorization, destination scoping or independent R2 proof. Respect R2 custom metadata size limits and reject/handle overflow explicitly. Do NOT send parent/source webpage URLs, bearer tokens or secrets; only the agreed provenance alongside bytes and filename. Do not synthesize metadata by guessing the path from display labels.

**Required shared/versioned fields for all modes:**
- `schema` / version; `mode` exactly `simple`, `narrow`, or `depth`.
- Full **actual hierarchy** as directory components derived from canonical R2 destination (separate from filename).
- Preserve **original filename and extension** and actual **stored filename**; if collision renames differ, retain both truthfully; no menu title can rename the file.
- Specific selected menu entry/mode and truthful presentation snapshot. Existing objects without metadata remain readable. Snapshot reflects time of saving, unchanged by later label edits.

**Narrow:** Full physical path, full sequence of customized/natural menu titles **including hidden ancestor titles**, exact per-level visibility snapshot for that selected path only, plus `visibilityMode` (all, hide-all, custom). Example physical `body/arm/bicep/muscle` vs labels `human/money-maker/guns/swole`; Hide All displays only `swole` but metadata retains *all four* levels and hidden/visible flags. Mixed visibility example: hidden, visible, hidden, visible. Never store other unrelated menu paths.

**Simple:** `mode: simple`, full physical hierarchy and filenames, a single directly visible Simple leaf label; semantic presentation of ancestors collapsed (e.g. `visibility: hide-all`) and `labelSource: menu_title` if user-customized, otherwise `labelSource: name` if inherited from final physical directory; record the exact displayed title. Avoid pretending Simple contained explicit nested menu ancestry.

**Depth:** `mode: depth`, the actual physical hierarchy and filenames. No invented custom-title or hidden-ancestor configuration. If displayed path is relevant, record accurately without pretending it came from Narrow.

**Gate:** for each mode, independently verify a genuine click's actual R2 object key, bytes/receipt and R2 custom metadata against the specific selected native menu item. Test named/hidden/renamed Shared Narrow ancestors, Simple custom vs natural title, Depth, filename/collision, missing/invalid metadata, stale generation and size limits. Verify no URL/credential leakage.

## Overall final validation

PASS only with supported evidence for: Shelf opens; login; sign out/in; TRUE REMOTE verified save; Simple/Depth regression; correctly nested Narrow native Chrome submenu; Hide All/Show All and mixed visibility with same target; Default/Quick mutual exclusion; eye hiding/restoring without deletion; image preview and complete downloaded bytes; no image frame jumping; configurable math/image/GIF/MP4 loader modules; polished navigation; per-object provenance accurately read back.

For each phase report PASS/FAIL/BLOCKED, exact commit SHA, tests run, and whether evidence is actual installed Chrome + live R2 or only simulated/fixture. Do not claim product success on fixture-only evidence. If an earlier required acceptance gate is blocked, clearly label what you did not verify, rather than faking a completed phase.

**Core principles:** keep what works; no bloat; GUI-to-API parity; real observed behavior; user settings are not deleted; display labels and visibility never change real save destinations.
