# Depth-only implementation and verification report

**Recommendation: NOT READY.** Scoped layout and provider-root presentation repairs pass local checks. The reported live Depth `WORKER_SETUP_REQUIRED` failure was investigated **read-only** and remains unresolved / release-blocking. Native installed menu behavior and real R2 readback could not be verified. Nothing was merged, pushed, published or deployed.

## Baseline and identity

Selected checkout initially: branch `work`, clean HEAD `8973ec4033db027dca424cfb580ad66104cf6701`, matching remote main. REQUEST.md was absent there. Read-only remote inspection located it on `codex/logic2real-depth-save`, fetched at `a11dcf55b293a10cb8270084fee084db098221ec`. New isolated implementation branch: **codex/depth-repair-audit**, based on that requested branch, not a merge into main. No existing local changes were discarded.

Version **0.3.19**; extension ID **ajppphdiamdobknpamcheohmdbdbeoal**; registered redirect **https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/cloudflare**. These public identities are unchanged. Baseline source digest: `85a28d4ea01a298c17fa4ebd8957819903d591b5496630473b3b85cd12805d7e`. Final build metadata is EVIDENCE/final-build.json. A source digest identifies dirty implementation snapshots independently of HEAD. Local final commit is reported in the chat handoff; evidence records whether source was dirty at build time.

## Smallest application changes

- `extension/depth-destinations.css`: new stylesheet scoped exclusively to `.depth-destinations`, attached only to the Depth list. Explicit center alignment, zero label margins, inline 76px number control, 32px icon targets, readable identity wrapping, retained focus styling and hidden semantics.
- `extension/app.mjs`: Depth-only root class, “Maximum depth” label and bucket-specific accessible eye/delete labels. Event handlers, draft handling, paging, shared Save, retry and persistence logic are untouched. Other modes emit their original labels/markup.
- `extension/app.html`: load the dedicated module after existing app.css. Global app.css unchanged.
- `scripts/build-extension.mjs`: existing recursive extension copy packages the module; add a guard to fail if its file or HTML link is missing.
- `src/core/menu-spec.mjs`: only a sole inlined Depth physical root save immediately below the Cloudflare provider gets its bucket-name label. Predicate checks source mode, inline scope, role, exact empty prefix, provider parent and root ancestor placement. No global “Save here” removal. Item ID, action ID, canonical target, enabled state, context, ordering and membership are retained. Displayed provenance title/path reflects the clarified label.
- Required source/API notes and CURRENT source hashes updated; immutable baseline snapshots retained. Regression/scoring/browser scripts and requested audit documentation added. No dependencies, lockfiles, unrelated mode implementations, OAuth, transport, provisioning, migrations, dispatcher or registrar behavior changed.

## Layout diagnosis and evidence

Real Chromium computed rectangles establish the cause rather than merely suggesting it: global label margin 10px top/bottom plus block full-width input produced a 61px label and 81px stretched icon buttons. At 360px width, trash wrapped onto another line while the eye stayed 81px high. Dedicated scoped alignment fixes that.

| Measurement | Before | After |
| --- | ---: | ---: |
| Depth eye, normal width | 38×81 | 32×32 |
| Depth trash, normal width | ~35×81 | 32×32 |
| Depth eye, narrow width | 38×81 | 32×32 |
| Depth controls row, narrow width | 115px | 32px |
| Simple/Narrow eye, normal/narrow | 38×34 | 38×34 |

Paired screenshots: [before narrow](EVIDENCE/layout-before/360-depth-focus.png), [after narrow](EVIDENCE/layout-after/360-depth-focus.png), [before normal](EVIDENCE/layout-before/1000-depth-focus.png), [after normal](EVIDENCE/layout-after/1000-depth-focus.png). Also recorded 150% zoom, long label, 23 scopes, pagination, focus and staged visibility/deletion. Browser script asserts unchanged Simple/Narrow measurements and no durable writes from eye/delete. These are production UI modules with **fixture IPC/OAuth**, not an installed extension or cloud account.

## Provider-immediate exception

The offending generated row was the sole selected Depth bucket's root Save here: the prior composer inlines its bucket wrapper and maps that root save's parent to the Cloudflare provider. It is a **real configured root target**, not a targetless generic provider action. Deleting it would remove the only way to save to that root while children remain. REQUEST §3 expressly permits minimal identifiable bucket-target presentation in this case.

Result: `Cloudflare > bucket-name/ [root save]`, followed by the same real folder choices. `Cloudflare > named-bucket > Save here` in multi-bucket/mixed cases and `Cloudflare > folder > Save here` remain intact. Root-only sole direct-save optimization remains unchanged. No named destination is renamed beyond this specifically permitted root clarification.

EVIDENCE/menu-comparison.json records exact parentId/id/role/origin/target/actionId/provenance before and after for changed cases. The current row schema does not retain a public `placement` field; the predicate and stable-ID construction trace that placement in source. No synthetic field is claimed to have been read from Chrome. Source parentage is confirmed; **actual installed Chrome parentage remains unverified**.

384 composition scenarios preserve **888/888 target/action/item identities**, 2,876 identical rows and eight intended label/provenance changes. 192 Depth-off combinations are byte-identical to baseline. Cases include 0/1/2/4 buckets, depth 1/4/5/10, empty/chain/sibling trees, hidden/show states, same-named folders and mixed Quick/Simple/Narrow controls. Existing suites separately cover Default, unavailable rows, config retry, stale generations and incomplete crawl.

## WORKER_SETUP_REQUIRED: investigated, not fixed

See [complete read-only investigation](WORKER_SETUP_REQUIRED_INVESTIGATION.md). Traced native callback → generation/action resolution → exact target authorization → background readiness → account/bucket plan lookup → transport cap → onboarding error → displayed message. Tested root, Images/ and Images/same/ sharing one current bucket plan, plus missing/pending/wrong account/wrong bucket/wrong protocol plans. Same-bucket controls pass; mismatches correctly block without provisioning.

No evidence establishes whether the original failing action was Save here or a terminal child, whether its account/bucket matched successful controls, or which readiness condition rejected it. Prefix difference alone does not explain WORKER_SETUP_REQUIRED when account/bucket/plan really match. SCOPE_UNAUTHORIZED and NATIVE_APPLY_INCOMPLETE remain separate observations without operation/time correlation. The user has no additional incident evidence. No speculative shared save-path change was made.

## Logic2Real audit

70 versioned canonical records cover entry points, contexts, modes, configuration, projection, application, routing, security/auth, recovery, resilience, presentation and compatibility. Human-readable rulebook, full JSON records, four-column traceability, unresolved product decisions, score arithmetic and future-maintenance instructions are included. [Scorecard](SCORECARD_BEFORE_AFTER.md): known fidelity **48.6 → 51.0**, evidence coverage **45.0% → 45.0%**, conservative verified score **21.8 → 22.9**. The 1.1-point conservative improvement reflects scoped local repair support. It is **not** live verification or a product reliability percentage. All applicable native/save/state P0 gates remain open.

Partial supported-fidelity shortfalls and U exposure are kept separate; .5 support is not a measured user failure rate. One historical user-reported failed save remains R=0 with explicit weak incident provenance. No positive cloud result is fabricated. Source discovery/symbol inventories are retained. This registry is a reusable source-to-reality audit, not a guarantee that every possible runtime interaction has been discovered.

## Tests and remaining discrepancies

See [test matrix](TEST_MATRIX.md). Complete focused baseline/final: 319/319. Module: 49/49. Targeted Depth/scoring/registry: 23/23. Full offline is 370/371, retaining only the pre-existing Simple golden mismatch; exact runner output is in offline-final.log. Initial incomplete dependency run and intermediate workings-map failure are preserved and explicitly excluded as final evidence.

P0 exposure: native rendering/clicks, installed generation/state convergence, real remote readback, user-gesture fallback and MV3 restart not observed. P1 blocking: reported Depth Worker setup failure without exact action/target evidence. Additional non-Depth product ambiguities are read-only decisions in TRACEABILITY.md. No unrelated fix is proposed as part of this patch.

Chromium itself runs, but the installation attempt returns **UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR**. No policy bypass attempted. Real R2 testing lacks an authorized account/destination. A capable authorized operator must complete the narrow reproduction and native/readback gates before merge readiness. No extra account setup, repeated consent, cloud deployment or resource mutation is requested merely to make fixture tests pass.

The qualified root label uses `bucket-name/`, including its root slash. A dedicated collision regression ensures an actual folder named exactly like its bucket keeps its original label; the root clarification must not cause automatic sibling renaming. This extra noninterference edge is tested outside the 384-case matrix.

Reusable environment configuration: saved `install_script` (Node check, frozen npm install using writable cache, extension build) and `start_skill` (existing isolated checkout, validation, extension startup, policy/credential limitations). No secrets, domains, repository membership or application settings changed. The save is a persisted draft, not application or publication; review/save and publication remain in environment settings.
