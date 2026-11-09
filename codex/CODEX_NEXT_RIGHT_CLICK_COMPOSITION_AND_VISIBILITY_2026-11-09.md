# NEXT CODEX RUN — Finish right-click architecture + remaining phases 5–7

**Status:** READY FOR NEXT RUN, after the currently active Codex work is finished and its changes are reconciled. This is a work order, NOT a statement that these fixes exist.
**Repository:** thanks-cohn/Click2Cloud
**File:** codex/CODEX_NEXT_RIGHT_CLICK_COMPOSITION_AND_VISIBILITY_2026-11-09.md
**Snapshot assessed:** main at 1123099ce1bfcd02e175c0438d34856d868c693a (2026-11-09); recheck HEAD before implementation.
**Immutable user rollback checkpoint:** checkpoint/click2cloud-working-before-major-upgrades-2026-11-09 at 3b24320138ff0ebbf50a0e6a912a5d2800038676.
**REDOWN:** read-only reference; do not modify.

## Read first — governing documents

1. [Observed P0 Depth bug — real nested bucket tree missing in composite menu](../Issues_and_Bugs/Bugs/P0_DEPTH_SINGLE_BUCKET_BRANCH_AND_NESTING_MISSING_2026-11-09.md)
2. [P0 independent mode display architecture and reversible row visibility](../Issues_and_Bugs/Issues/P0_RIGHT_CLICK_INDEPENDENT_MODE_DISPLAY_AND_ROW_VISIBILITY_2026-11-09.md)
3. [P1 Depth rows must not offer Make Default](../Issues_and_Bugs/Issues/P1_DEPTH_DESTINATIONS_MANAGER_NO_MAKE_DEFAULT_2026-11-09.md)
4. [Original phased seven-phase requirement, including visual loaders and provenance](../docs/requests/2026-11-09-phased-narrow-gallery-r2-provenance.md)
5. [Latest implemented phase evidence and proof boundaries](../docs/evidence/phased-upgrades/HANDOFF.md), plus individual phase1–phase4 handoffs.
6. [Issues and Bugs index](../Issues_and_Bugs/README.md)

The exact user intent in those files overrides convenient implementation shortcuts. Where two older descriptions differ, apply the corrections in this work order, especially: **Depth checked is additive, not exclusive; one Depth bucket with real child folders must nest; a bucket without folders needs no fake nest; two Narrow menu presentations to the same actual R2 target must coexist.**

## Baseline: don't redo working Phases 1–4

Latest main already contains source implementations and automated evidence for:

- **Phase 1:** real Narrow ancestor structure in canonical compiler, bounded placement identities, correct target routing.
- **Phase 2:** reversible Narrow Show All / Hide All / per-level visibility; final save destination remains actionable.
- **Phase 3:** mutually exclusive yet clickable Default and Quick Select; per-row Change Visibility eye; hidden entries retained; Depth row no Make Default.
- **Phase 4:** reserved responsive gallery/image frame; tests report zero transition layout shift.

**The environment prevented an actual installed Chrome unpacked extension test** (UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR in managed Linux Chromium). Fixtures and isolated live Worker/R2 tests are not equivalent to a native Windows Chrome user click. Preserve Phases 1–4, rerun relevant regressions, and report Windows installed acceptance as unverified until performed. Do not declare new systems complete merely because tests are green.

**Unfinished:** real Depth hierarchy in composite menu; robust additive composition across all three modes; duplicated Narrow presentation identities on the same physical target; loader modules (Phase 5); gallery navigation polish (Phase 6); authenticated R2 object provenance and filename metadata (Phase 7).

## General engineering constraints

- **NO BLOAT:** repair the existing canonical config → projections → compiler → Chrome native adapter → click routing → engine path. Don't introduce a new menu engine, shadow state store, complex plugin host, or unrelated recovery/backup platform.
- **API FIRST / GUI PARITY:** every new GUI control must be a client of a documented, validated, observable API operation; API and GUI must have matching authorization, effects, errors and persistent state.
- **Preserve user state:** never reset Chrome profile, extension identity, saved destinations, OAuth approval, R2 bucket configuration, existing objects, gallery history, or independently verified TRUE REMOTE save behavior. Respect any uncommitted user files. Never modify REDOWN.
- **Security:** stable native menu identities and generation checks; hidden/stale/disallowed routes must not dispatch; remote transfer must remain remote; never send source or parent webpage URL to Cloudflare object metadata.
- **Work sequentially and commit by coherent gate.** Before changing anything read git status and current branch, fetch main, inspect active work and compare current implementation to this request. No forced reset, overwrite or deployment. Do not push or merge without explicit permission. For each completed gate record changed files, tests, observations, commit SHA and PASS/FAIL/BLOCKED status.

# Gate A (P0) — Fix actual Depth nesting and independent native menu composition

This gate is a BLOCKING prerequisite for truthful Phase 7 provenance and the final combined acceptance.

### A1. Correct canonical nomenclature and state boundaries

- **Simple** configuration: configs.simple.destinations.
- **Narrow** is the user-facing name; internal mode is **nested**, config configs.nested.destinations.
- **Depth** configuration: configs.depth.scopes (selected R2 bucket identities, per-bucket maxDepth, scope hidden state).
- **Show in Chrome** booleans: product.show.simple, product.show.nested, product.show.depth; these already exist. **They are independent checkmarks, not a Simple/Narrow/Depth radio group. DO NOT reinvent this feature. FIX its composition.**
- product.show.flat is the existing separate Flat presentation/display control. It must not silently veto independently checked Narrow/Depth trees; explicitly document and test the combined semantics in accordance with visible user choices.
- An individual row's **Change Visibility** eye is a second filter, not deletion. The mode checkmark AND row visibility both permit contributing an entry/tree.
- Narrow's **Hide All / Show All** only controls the ancestor labels of a *visible Narrow route*: Hide All retains the final/deepest save action and unchanged physical path. It is separate from the row eye.

### A2. Restore Depth-selected bucket's real nested directories

Reproduce the user case: configure multiple Narrow destinations, optionally one Simple, select an existing R2 bucket for Depth with known subdirectories, and tick Show Depth. The Depth menu currently fails to expose its descendants.

**The object being nested is the selected BUCKET's discovered directory tree, not the abstract word “Depth.”** One selected Depth bucket with eligible folders may represent many save choices. Example:

~~~text
Cloudflare R2 >
  redown >
    Images >
      Artwork [save here / actionable leaf]
~~~

- Even if redown is the **only bucket configured for Depth**, this actual tree MUST branch. The normal single-location → flat Cloudflare leaf rule is **superseded when the selected bucket has eligible displayed descendants**.
- If redown has **no eligible child directories** at the configured depth, a flat bucket-level save entry is acceptable. **No fabricated ancestors and no forced nesting.**
- One bucket vs multiple buckets, prefix ancestry, folder discovery, authorization, stale inventory and per-scope maxDepth must remain truthful. Never treat missing/incomplete inventory as positive proof of an empty bucket.
- Actual native parentId must follow Depth's parentPlacement and selected hierarchy. Actionable "Save here" entries, if necessary for branch nodes, preserve exact bucket and prefix; no accidental root saves.
- A hidden Depth scope removes its entire discovered tree from Chrome, but its bucket selection, depth and hierarchy data remain configured.
- Inspect src/modes/depth/index.mjs; src/core/menu-spec.mjs; discovery/inventory pipeline; product state and native registrations. Diagnose with tests, not guesses.

### A3. All checked modes display together; unchecking does not delete

Check all 8 combinations of Simple/Narrow/Depth flags. Examples:

| Simple | Narrow | Depth | Required Chrome menu contribution |
|---|---|---|---|
| YES | YES | YES | All three, with genuine Narrow and Depth ancestry |
| YES | NO | YES | Simple + real Depth tree |
| NO | YES | YES | Narrow + real Depth tree |
| NO | NO | YES | Depth only; the saved Simple/Narrow entries still exist |
| YES | YES | NO | Simple + Narrow |
| YES | NO | NO | Simple only |
| NO | YES | NO | Narrow only |
| NO | NO | NO | No mode-specific entries; existing configuration remains stored |

- Checking Depth never turns off, overwrites, deletes, suppresses or invalidates Simple/Narrow configurations. Existing checked Simple/Narrow remain visible alongside Depth.
- Unchecking a mode only omits that mode's contributed menu entries, without touching the stored configs, custom titles, depth limits, row eyes, or cloud files. Rechecking restores original entries.
- Preserve the 4 provider placeholders where applicable and don't claim saves work for providers that are still placeholders.
- Avoid a single global target-keyed candidate map destroying separate presentations. Reconcile common physical target and shared directory ancestry without erasing meaningful mode/menu identity.
- Preserve native Chrome limits and truthful registration ACK; do not fake success if over budget. Report unsupported display combinations rather than silently flattening desired nested choices.
- Default/Quick promotion rules must not resurface hidden destinations or remove an explicitly chosen mode's available paths. Default and Quick are mutually exclusive on the same eligible target; neither is permanently disabled; no Default control in Depth Destinations Manager.

### A4. NEW outstanding requirement — two Narrow presentations may target identical actual R2 directory

The user explicitly requires **both** independently saved Narrow menu presentations to appear when enabled, even when physical target is identical.

Example actual bucket/prefix: redown/body/arm/bicep/muscle/

- **Narrow presentation A (custom):** human > money-maker > guns > swole.
- **Narrow presentation B (original):** body > arm > bicep > muscle.
- **Both visible, separately configurable, separately hideable and separately clickable**; both save to the same actual R2 bucket/prefix.
- Hiding one, renaming its labels, using Hide All on one, or deleting one must not change or delete the other.
- Persist **stable presentation/destination IDs independent of targetKey**. In today's code, src/core/menu-identity.mjs normalizedDestinations and src/api/config.mjs createDestination reject repeated targetKey with DUPLICATE_DESTINATION / DESTINATION_EXISTS; the composite compiler also deduplicates by targetKey. Repair these constraints **for distinct Narrow menu presentations** while retaining protection against genuinely duplicated presentation identities or ambiguous native items.
- Keep Simple semantics intact; do not globally allow duplicate targets everywhere. Handle legacy migration without erasing entries or changing existing IDs. Preserve direct save correctness and stable native IDs when both presentations target the same physical object prefix.
- Distinguish **menuPresentationId** (or similarly small stable canonical selected route ID) from **physical targetKey** across config, menu spec, click dispatch and eventual Phase 7 provenance.
- If both appearances have identical text under the same native parent, apply a deterministic user-understandable collision policy; do not silently discard either. Do not create duplicate visible branches when sharing is intentional and distinguishable.
- The eventual object metadata MUST truthfully record **which selected presentation** was clicked even though both routes resolve to the same R2 prefix.

### A5. Depth UX and row visibility regression

These pieces already have implementations; verify and repair only if broken:

- Every applicable Simple/Narrow row and selected Depth bucket/scope row has a directly clickable eye with tooltip EXACTLY "Change Visibility". Eye hides/restores the whole configured entry/scope; row remains in Destinations Manager and editable.
- Mode checkmark and row eye are independent visibility gates; checking mode does not override eye OFF.
- Narrow Hide All retains final actionable target; row eye OFF hides entire destination choice.
- Hidden Default/Quick cannot be resurrected by fallback/stale native generation. Default↔Quick mutually exclusive and togglable via GUI/API/persistence.
- **Depth rows must NOT show "Make Default"**—not even disabled or in overflow. Existing valid global Default outside Depth remains intact.

**Gate A acceptance:** test scenarios A2–A5 with real generated menu tree parent IDs, sibling titles, unique route IDs, native registration and dispatch; test actual R2 object key for selected physical target; verify persistence after reload, browser restart and OAuth sign-out/in. Explain the specific source cause and what is only a fixture.

# Gate B — Phase 5: isolated, user-customizable gallery loading visuals

Phase 4's fixed responsive geometry is done. Do not rebuild the gallery layout or authenticated image/download pipeline.

Implement **two small independently editable modules** through one minimal visual lifecycle interface operating INSIDE the existing fixed viewer frame:

1. **Mathematical Geometry loader** (default): attractive lightweight evolving rosettes, harmonic or parametric geometries; source of equations, colors, movement and drawing resides in its own module so it can be changed or replaced later without editing custom media, image reader, Shelf, or core viewer. Respect reduced-motion, pause when offscreen, cancel cleanly after image success/error/navigation; no oversized plugin architecture.
2. **Custom Loading Media module**: Settings can select locally supplied static PNG/JPEG/WebP, animated looping GIF, or muted looping MP4 snippet; user can replace/remove or switch to mathematics/plain placeholder without changing source code or rebuilding extension. Validate content/type/size, store locally under extension control using appropriate existing persistence (avoid cloud upload), persist across Chrome restart; handle missing/deleted/corrupt data gracefully. Respect media restrictions, reduced motion and browser autoplay policy; cleanup object URLs/decoders/listeners when unloaded.

Rules: loader supplies visuals ONLY, no R2 network bytes, upload, destination manipulation or gallery geometry decisions. Custom media must never expand frame or cause layout jump. Settings actions require API/GUI parity. Keep original filenames of cloud files untouched.

**Gate B acceptance:** stable frame across image loading/loaded/error/rapid navigation, user media types and replacement, restart persistence, resource cleanup, reduced motion and module isolation. Prove changing mathematical equations doesn't require rewriting custom media or viewer.

# Gate C — Phase 6: polish actual Previous / Next gallery controls

After loader integration:

- Refine existing gallery Previous/Next affordances: beautiful restrained chevrons, balanced controls, predictable positions, accessible focus/hover/disabled states; maintain keyboard and pointer navigation.
- Stay within Phase 4's fixed geometry; no content jumping on portrait/landscape/GIF/errors, and no unnecessary logic rewrite.
- Correct first/last behavior, rapid clicks, current image sequencing, focus/ARIA and responsive layouts.

**Gate C acceptance:** before/after screenshots plus browser functional/keyboard/geometry checks and no image-read/download regression.

# Gate D — Phase 7: TRUE REMOTE per-object dual-hierarchy provenance + filenames

**Blocking prerequisite:** Gates A1–A4 must already identify the real native selected presentation/route, its visibility at click time, mode and canonical physical destination. Do not implement guessed metadata from post-save current settings.

Store a **compact versioned provenance snapshot** on every new successfully saved R2 object during the ORIGINAL authorized Worker→R2 put. Do not browser-stage the remote bytes and do not rewrite the object after saving. Authoritative server-side permission/scope/target checks remain in force; untrusted client metadata never controls destination authorization. Size-limit metadata within actual R2 constraints; handle oversize/reject explicitly. Existing objects without custom metadata remain readable. Independently read metadata back and compare it to the click snapshot and byte-verified object key. No page URL, source URL, secret/token or unrelated personal data is sent.

Required **shared fields on each new save**:
- Schema/version, selected user mode ("simple", "narrow", "depth" — map internal "nested" to visible "narrow" consistently), selected stable presentation identity when applicable.
- Real provider/R2 bucket and exact physical **directory hierarchy**, distinct from filename. Do not confuse bucket identity with directory names.
- **Original filename WITH extension** and actual **stored filename WITH extension**. If a keep-both collision renames the stored object, retain *both* accurately; never replace a filename with the menu title. Preserve existing file bytes and extensions.
- Snapshot at dispatch of what the user selected; later renames, eye changes, display checkmark changes must not retroactively change existing object metadata.

Mode-specific truth:

**Simple:** mode "simple"; true physical dirs; one direct leaf's exact title; the presentation behaves as ancestors hidden/collapsed ("hide-all"). Record label source: "menu_title" for custom, "name" for actual last directory name; use a clear labelSource field, not a false hierarchy. Record exact title the user clicked.

**Narrow:** mode "narrow"; full physical hierarchy AND every configured path level's menu title (including those hidden). Record exact visibility of each level at save time, visibilityMode ("all", "hide-all" or "custom") and selected presentation ID. Example: physical body/arm/bicep/muscle vs human/money-maker/guns/swole; visible flags false/true/false/true mean displayed money-maker > swole but actual prefix unchanged. Two distinct presentations may point to same physical target; the saved object records the one actually used. Only capture selected path, not entire destination tree.

**Depth:** mode "depth"; real selected bucket, actual folder components down to the directory where the save occurred, and original/stored filename. Do NOT fabricate a Narrow-style custom menu title chain or artificial hidden-ancestor flags. User's desired simple concept is "depth > actual location > directories > filename".

Conceptual minimum examples (field names can be normalized to a single schema while preserving meaning):

~~~json
{
  "schema": 1,
  "mode": "simple",
  "location": {"provider": "cloudflare", "bucket": "redown", "directories": ["body","arm","bicep","muscle"]},
  "originalFilename": "flex.png",
  "storedFilename": "flex.png",
  "presentation": {"labelSource": "menu_title", "title": "Swole", "visibility": "hide-all"}
}
~~~

~~~json
{
  "schema": 1,
  "mode": "narrow",
  "location": {"provider": "cloudflare", "bucket": "redown", "directories": ["body","arm","bicep","muscle"]},
  "originalFilename": "flex.png",
  "storedFilename": "flex.png",
  "presentation": {
    "id": "stable-menu-presentation-id",
    "visibilityMode": "custom",
    "levels": [
      {"actual": "body", "title": "human", "visible": false},
      {"actual": "arm", "title": "money-maker", "visible": true},
      {"actual": "bicep", "title": "guns", "visible": false},
      {"actual": "muscle", "title": "swole", "visible": true}
    ]
  }
}
~~~

~~~json
{
  "schema": 1,
  "mode": "depth",
  "location": {"provider": "cloudflare", "bucket": "redown", "directories": ["body","arm","bicep","muscle"]},
  "originalFilename": "flex.png",
  "storedFilename": "flex.png"
}
~~~

The schema above is a conceptual requirement, not a claim about current protocol/implementation. Keep it small, deterministic and backward-compatible.

**Gate D acceptance:** independently inspect object metadata, original/stored filename, real key and full byte integrity after actual saves via Simple custom/natural, Narrow Show All/Hide All/mixed, two Narrow presentations with identical physical target, and Depth deep directory. Test keep-both filename collisions, stale route IDs, forbidden target, overly long metadata, missing custom metadata on old objects, login/reconnect, and no URL/token leakage. Do not pretend live Cloudflare readback occurred if it did not.

# Gate E — End-to-end regression, Windows native acceptance, handoff

Run existing targeted suites and production build, then test the installed extension at the same identity (reload; **do not uninstall or clear storage**).

Evidence matrix:
1. Shelf opens; Cloudflare login/logout/login, OAuth approval and established authorized R2 setup survive restart.
2. Native Chrome real right-click displays provider placeholders and enabled Simple/Narrow/Depth simultaneously, with correct ancestors, submenu parent IDs, titles, and selected action routing.
3. Single Depth bucket with eligible descendants branches; single Depth bucket without descendants doesn't invent directories; multiple buckets and depth limits; existing Narrow/Simple don't disappear.
4. All show checkbox combinations; row-eye toggles; Narrow Hide All/Show All/custom; Default↔Quick; Depth no Make Default.
5. Two Narrow presentations with same physical directory: both configured/visible/independently hidden/renamed; exact same R2 prefix, distinct selected presentation metadata.
6. TRUE REMOTE remote-source save; independent R2 HEAD/object bytes and metadata readback; accurate filename in save receipts.
7. Existing Explorer image preview and complete byte-identical download; stable viewer dimensions; math/custom still image/GIF/MP4 loaders; polished Previous/Next controls.
8. After Chrome restart, configs, mode checkmarks, individual eyes, media and menu routes persist; no phantom success, permission bypass or stale dispatch.

**Honest evidence labels:** SOURCE IMPLEMENTED, FIXTURE PASS, LIVE WORKER/R2 PASS, INSTALLED WINDOWS CHROME PASS, BLOCKED, FAIL, NOT TESTED. Keep these distinct. Existing managed-Linux policy block is not a Windows PASS.

For each gate give exact changed files, commit SHA, tests and scope, screenshots/real menu tree where available, known remaining failures; update docs/evidence and Issues_and_Bugs statuses only after proof. Preserve old checkpoint. Do not deploy or modify production resources without explicit authority.

## Short definition of success

**One physical directory can have multiple separately configured Narrow menu presentations; Simple, Narrow and Depth display together or independently according to their existing checkmarks; a Depth-selected bucket exposes only its REAL eligible directories; hidden is NOT deleted; gallery visual enhancements are isolated and stable; every new R2 save preserves the file's real name and verifiable presentation/physical-path metadata.**

**Begin by reviewing latest HEAD and Gate A. Finish remaining phases in sequence, without rebuilding already-implemented Phases 1–4.**
