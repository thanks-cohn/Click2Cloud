# CODEX REQUEST — P0 CRITICAL: Isolate, trace, and repair Narrow bucket-root save route without disturbing other modes

**Date:** 2026-11-14  
**Owner request:** Investigate and extract/isolate the logic responsible for this defect, repair its exact cause, and leave every other unfinished or working subsystem untouched.  
**Status:** ASSIGNMENT ONLY — not implemented by this document.  
**Defect record:** [P0 Narrow bucket-root missing](../../Issues_and_Bugs/Bugs/P0_CRITICAL_NARROW_BUCKET_ROOT_MISSING_FROM_NESTED_RIGHT_CLICK_MENU_2026-11-14.md)

## 0. Non-negotiable shape / intent

In the native Chrome right-click menu, Narrow must provide the **bucket as a first nested parent submenu**, and its **first actionable child** must save directly to the root of that same bucket. The configured child folders follow it.

```text
Cloudflare R2 >
  my-bucket >
    Save to my-bucket/       [target bucket=my-bucket, prefix=""]
    Photos/                  [target bucket=my-bucket, prefix="Photos/"]
    Documents/               [target bucket=my-bucket, prefix="Documents/"]
```

Do **not** interpret this as:
- bucket root a sibling outside the bucket's submenu;
- requirement to create a separate Simple destination;
- automatic selection of the first child directory;
- replacement of the bucket branch by a root save leaf;
- changing Depth, Simple or other mode policy.

Owner currently reports that Narrow shows its child folders, but **the root save action is omitted**. Attempts to configure root may appear to select the topmost child; verify that separately and do not guess at the cause.

### Important behavior distinction

Keep bucket branch identity and root-save action identity separate even when they refer to the same `prefix: ""`. A structural parent and an actionable save route are distinct menu items. The root save must be **inside** the bucket branch at first position, not above it. An empty-string key prefix is a valid exact target, not a falsy/missing destination.

## 1. First: perform a read-only source investigation and extract the responsible logic

**Before changing production code**, trace with actual source references, data examples and temporary tests:

1. `extension/app.mjs` destination editor and selection: selected `captured` target, `ancestors(captured.prefix)`, checkbox/level filtering, save operation and persisted Narrow config. Determine whether clicking the bucket root preserves `prefix: ""` or picks a child.
2. `src/modes/nested/index.mjs`: `createConfig`, `project`, bucket-root ancestor generation, tree placements, `branches`, `hasChildren`, `role:'branch'` versus `role:'save'`, and `Save here` labels/ordering. Check whether root is merely a structural ancestor rather than an explicitly actionable route.
3. `src/core/menu-spec.mjs` composite compilation: candidate selection, `parentPlacement`, hierarchy detection, placement aliasing/collapse (especially bucket root `!row.target.prefix`), rows marked as `branch` versus `save`, deduplication, and projection identity.
4. Native Chrome registrar/dispatcher and API: ensure `chrome.contextMenus` receives an actionable root row with a unique item/action ID, correct parent ID, and click dispatch to the original bucket + empty prefix.
5. Trace the eventual REAL remote writer and independent provider verification of object key. Ensure wrong-path saves cannot masquerade as success.

Produce a concise **root-cause table** for each layer: input; output; whether correct; evidence path/line; actual defect location. Include sample of source Narrow destinations, projected rows, compiled tree, registrar entries and route lookup. Do not assume the defect is in the projector merely because its tree has a bucket ancestor.

**Extract the faulty decision into a small, cohesive, testable helper only if warranted by the investigation**. Use the existing canonical V3+1 Narrow/compiler architecture; do not create a rival menu engine, duplicate configuration store or arbitrary abstract framework. Keep pure tree projection and route-placement rules separate from Chrome registration and remote saves. If the issue is a single local conditional, prefer the narrowest local extraction and repair.

## 2. Implement only the minimal corrected behavior

- Within a configured Narrow bucket branch with child routes, provide the first child `Save to <bucket>/` that resolves to exact bucket root `prefix: ""`.
- The route must be *explicitly attributable to the Narrow bucket selection/configuration*; do not silently add root saves to every unrelated bucket/Depth scope. Respect intended visibility and persisted mode selection. If current Narrow configuration semantics cannot express root eligibility safely, introduce the smallest backward-compatible explicit Narrow-specific representation and preserve/migrate existing destinations without loss.
- Preserve directory nesting, custom menu titles, per-level hide/show, Narrow Quick Select and independent toggles.
- Preserve bucket branch even if the root is itself a saved destination. Handle root-only, one child, multiple children, multiple buckets and hidden ancestors.
- Preserve deterministic menu ordering: root first **inside its bucket submenu**, child folders afterward. No duplicate action IDs, accidental alias collisions or root bound to first child.
- Browser target for root: `{provider:'cloudflare', accountId, connectionId, bucketName, prefix:''}`; key written should be `filename.ext`. Never fabricate a folder name, slash, Default, or topmost child prefix.
- If the bucket root is not authorized/readied, show the existing precise recoverable state; do not claim successful save. No automatic Cloudflare resource mutation.

## 3. Blast-radius protection: preserve everything else

Strictly **do not alter**:
- Simple mode assignments, root support, direct/flat behavior, Quick Select ordering.
- Depth scopes, maxDepth, folder discoveries, root/Save-here policies or nested rendering.
- Existing menu composition for other cloud providers/placeholders.
- Default location and precedence, stored CURRENT records, account-scoped approvals, OAuth, Worker lifecycle, R2 provisioning, recovery, history, Explorer or Quick Glance.
- Settings' independent Show Simple/Narrow/Depth checkboxes and Flat rules.
- Existing pending bugs, unimplemented features, diagnostics, migrations or branches unrelated to this fix.
- REDOWN, Chutey or any other repository.

No reset of Chrome extension storage, no deletion/rebuild of real Cloudflare buckets/objects, no guessed recovery, no forced account reauthentication, no new dependencies unless essential. Keep working behavior and unfinished work exactly as found. Do not solve unrelated problems opportunistically. No cosmetic UI rewrite.

## 4. Tests: demonstrate narrow fix and absence of regressions

Add regression fixtures for at least:
1. Narrow **bucket root with two children**: menu tree is `Cloudflare > bucket > [root save, child 1, child 2]`; inspect **actual parent IDs** and sibling order.
2. Root click payload targets the exact empty prefix; independently verify actual key if live test is owner-authorized.
3. Narrow root-only, child-only, root + single child, and multiple different buckets; maintain branch/leaf logic and don't synthesize root saves where unauthorized by saved Narrow selection.
4. User picks root in destination editor, saves, reloads, opens editor again: exact prefix persists and does not fall back to first child.
5. Aliases, hidden levels, visibility/Show checkboxes, existing quick labels and duplicate-target handling.
6. Representative Simple-only, Depth-only, Simple+Narrow, Narrow+Depth, all modes and Flat presentation snapshots remain unchanged except the intended Narrow root addition.
7. Native registration ID stability, dispatcher API parity, menu generation, Chrome restart and re-login without changes to saved assignments.

Use `tests/phased-narrow.test.mjs`, `tests/menu-compiler.test.mjs`, `tests/canonical-menu.test.mjs`, `tests/golden-menu.test.mjs` and relevant native-browser harnesses as starting references, not evidence of correctness until rerun. A failing targeted test before the fix and passing test afterward is preferred. Run `npm ci` if required, relevant focused suites, then `npm test`/project's documented suite as feasible. Record pass/fail/blocked/not-tested separately. Never weaken an existing assertion to make tests green.

## 5. Mandatory engineering and deliverables

- Follow repository `AGENTS.md`, `latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md` and canonical workings CURRENT/baseline rules. Preserve immutable baselines.
- Create a dedicated fix branch based on the current intended base, not an unrelated worktree; inspect existing uncommitted user work and do not overwrite it.
- Before editing, record baseline and target-path state. Implement the smallest coherent code diff and new tests.
- Update the bug record with precise cause/fix/evidence and source ↔ API ↔ UI documentation. Do not falsely mark installed Chrome or live provider tests PASS from fixtures.
- Deliver a changed-file list, root-cause evidence table, before/after menu tree and exact API route, test commands/results, non-regression evidence for Simple/Depth, limits, commit SHA and PR link if created.
- Installed Windows Chrome manual acceptance is a separate gate. If unavailable, label it **NOT TESTED**, do not claim full fix. Production R2 save acceptance requires owner-approved safe test object and independent object verification.
- **Completion criterion:** Narrow bucket parent stays nested, root is first selectable child, selected folders remain beneath, the root action dispatches to the exact bucket root, and no other mode/configuration or unrelated unfinished part changes.

**Priority:** P0 CRITICAL, but scope is deliberately surgical. Do not close the issue before actual owner Chrome acceptance.
