# Canonical Logic2Real rule registry v1

70 discovered rules at baseline `a11dcf55b293a10cb8270084fee084db098221ec`. This source inventory covers production entry points, configuration, independent modes, projection, application, routing, auth, resilience and recovery. It is not certification of exhaustive runtime behavior. Unknown edges remain open. Non-Depth analysis authorizes no implementation changes.

The complete structured records, including per-rule input scenarios, expected state/click result, evidence limitations and before/after scores, are in [RULES.json](RULES.json). Stable IDs must not be recycled. Sources use stable symbols so line movement does not break ownership.

## L2R-ENTRY-001 — Native contexts

**P0; open. INTENT:** Capture image/link/video/audio/page context without substituting another source.

**IMPLEMENTATION:** `extension/background.mjs:sourceFromClick`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/canonical-menu.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-ENTRY-002 — Provider siblings

**P1; open. INTENT:** Fresh composite menu offers Google Drive, Dropbox, OneDrive and exactly one Cloudflare provider.

**IMPLEMENTATION:** `src/core/menu-spec.mjs:compileMenuSpec`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/nov06-native-menu.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-ENTRY-003 — REDOWN ownership

**P1; open. INTENT:** Distinguish Chrome extension grouping from legacy compiler REDOWN root; do not add another group.

**IMPLEMENTATION:** `src/core/menu-spec.mjs:compileMenuSpec`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Documentation/legacy expectation ambiguity; source behavior observed, product precedence not invented. See unresolved decision register. Root cause: unknown.

**Tests / falsification:** tests/cloudflare-integration.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-ENTRY-004 — Trusted sender

**P0; open. INTENT:** Only the exact trusted app document may issue privileged engine requests.

**IMPLEMENTATION:** `src/chrome/trusted-sender.mjs:trustedAppSender`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/shelf-message-boundary.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-CONFIG-001 — Independent modes

**P0; open. INTENT:** Simple Narrow Depth and Flat show flags are additive and hiding never deletes configuration.

**IMPLEMENTATION:** `src/api/config.mjs:applyConfigChanges`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/composition-remaining.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-CONFIG-002 — Provider visibility

**P0; open. INTENT:** Provider OFF removes its complete native branch while retaining OAuth and saved destinations.

**IMPLEMENTATION:** `src/core/menu-spec.mjs:providerVisibility`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/provider-menu-visibility.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-CONFIG-003 — Draft isolation

**P0; open. INTENT:** Eye delete depth edits paging and modal actions stage a draft; only shared Save commits.

**IMPLEMENTATION:** `extension/app.mjs:destinationDraft`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/logic2real-depth-save.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-CONFIG-004 — Atomic shared Save

**P0; open. INTENT:** Commit the ordered batch with expected revision and idempotency key before native application.

**IMPLEMENTATION:** `src/api/service.mjs:commitConfigChange`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/logic2real-depth-save.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-CONFIG-005 — Retry same transaction

**P0; open. INTENT:** Reuse the same request identity after interrupted Save; do not replay a durable transaction as new.

**IMPLEMENTATION:** `extension/app.mjs:bindDestinationSave`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/logic2real-depth-save.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-CONFIG-006 — Stale revision

**P1; open. INTENT:** Reject conflicting revisions rather than overwriting concurrent settings.

**IMPLEMENTATION:** `src/persistence/current-store.mjs:commitProduct`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/logic2real-depth-save.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-CONFIG-007 — Default identity

**P1; open. INTENT:** Preserve exact Default target; suppress redundant Quick and honor explicit mutual-exclusion updates.

**IMPLEMENTATION:** `src/api/config.mjs:normalizeDefaultQuick`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/phased-narrow.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-CONFIG-008 — Quick placement

**P1; open. INTENT:** Quick leaves follow provider rows and do not accidentally duplicate Default.

**IMPLEMENTATION:** `src/core/menu-spec.mjs:quickRows`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/latest-quick-rules.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-CONFIG-009 — Titles and aliases

**P1; open. INTENT:** Saved presentation titles differ from physical identity; aliases never change destination prefixes.

**IMPLEMENTATION:** `src/core/menu-provenance.mjs:menuProvenance`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/composition-remaining.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-CONFIG-010 — Paging and input retention

**P1; open. INTENT:** Retain typed Depth values through paging tabs eye and delete; show twenty rows per page.

**IMPLEMENTATION:** `extension/app.mjs:captureDepth`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/logic2real-depth-save.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-CONFIG-011 — Save warning and retry

**P1; open. INTENT:** Distinguish committed settings from inventory failure or partial native ACK and allow retry.

**IMPLEMENTATION:** `extension/app.mjs:bindDestinationSave`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/logic2real-depth-save.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-SIMPLE-001 — Visible leaves

**P1; open. INTENT:** Project enabled nonhidden Simple destinations as exact leaves with custom titles.

**IMPLEMENTATION:** `src/modes/simple/index.mjs:project`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/canonical-menu.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-SIMPLE-002 — Sole-choice optimization

**P1; open. INTENT:** A sole nonhierarchical active choice may become the direct Cloudflare provider leaf.

**IMPLEMENTATION:** `src/core/menu-spec.mjs:active.length===1`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/nov06-native-menu.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-SIMPLE-003 — Legacy golden disagreement

**P1; open. INTENT:** A source golden expectation and active composite ordering must be reconciled by an owner decision, not rewritten during Depth repair.

**IMPLEMENTATION:** `tests/golden-menu.test.mjs:simple`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Historical Simple golden mismatch fails unchanged baseline and final offline suite; do not alter Simple to close this Depth task. Root cause: unknown.

**Tests / falsification:** tests/golden-menu.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-NARROW-001 — Ancestor chain

**P1; open. INTENT:** Retain actual ancestor placements and selected parent Save here actions; unselected ancestors never save.

**IMPLEMENTATION:** `src/modes/nested/index.mjs:project`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/phased-narrow.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-NARROW-002 — Visibility levels

**P1; open. INTENT:** Hide all all and custom presentation levels preserve final target identity and reversibility.

**IMPLEMENTATION:** `src/modes/nested/index.mjs:levelHidden`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/phased-narrow.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-NARROW-003 — Duplicate presentations

**P1; open. INTENT:** Different presentation IDs may share a physical target without conflating UI edits or native IDs.

**IMPLEMENTATION:** `src/core/menu-identity.mjs:normalizedDestinations`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/composition-remaining.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-DEPTH-001 — Selected bucket identity

**P0; open. INTENT:** Only selected visible exact connection/account/bucket scopes contribute Depth rows; scopes normalize to root.

**IMPLEMENTATION:** `src/modes/depth/index.mjs:createConfig`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/logic2real-depth-save.test.mjs; depth-scope-regression: 384 combinations; per limit 1/4/5/10, bucket count 0/1/2/4, empty/chain/siblings, hidden/show and mixed controls. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-DEPTH-002 — Independent positive limits

**P1; open. INTENT:** Every selected bucket retains its own positive safe integer limit; root is level zero and no artificial maximum is added.

**IMPLEMENTATION:** `src/modes/depth/index.mjs:createConfig`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/logic2real-depth-save.test.mjs; depth-scope-regression: 384 combinations; per limit 1/4/5/10, bucket count 0/1/2/4, empty/chain/siblings, hidden/show and mixed controls. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-DEPTH-003 — Real bounded inventory

**P0; open. INTENT:** Use authorized paginated actual folder prefixes including markers; files alone never invent folders.

**IMPLEMENTATION:** `src/explorer/depth-inventory.mjs:discoverDepthScope`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/logic2real-depth-save.test.mjs; depth-scope-regression: 384 combinations; per limit 1/4/5/10, bucket count 0/1/2/4, empty/chain/siblings, hidden/show and mixed controls. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-DEPTH-004 — One child branches

**P0; open. INTENT:** One real included child creates a branch; root and intermediate nodes remain actionable through explicit save children.

**IMPLEMENTATION:** `src/modes/depth/index.mjs:project`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/logic2real-depth-save.test.mjs; depth-scope-regression: 384 combinations; per limit 1/4/5/10, bucket count 0/1/2/4, empty/chain/siblings, hidden/show and mixed controls. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-DEPTH-005 — Boundary leaf

**P1; open. INTENT:** A node at selected maximum depth is a save leaf even when deeper descendants exist.

**IMPLEMENTATION:** `src/modes/depth/index.mjs:branches`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/logic2real-depth-save.test.mjs; depth-scope-regression: 384 combinations; per limit 1/4/5/10, bucket count 0/1/2/4, empty/chain/siblings, hidden/show and mixed controls. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-DEPTH-006 — Multiple buckets

**P0; open. INTENT:** Two or more selected buckets remain distinct branches/leaves with per-bucket limits and exact identities.

**IMPLEMENTATION:** `src/core/menu-spec.mjs:depthBuckets`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/logic2real-depth-save.test.mjs; depth-scope-regression: 384 combinations; per limit 1/4/5/10, bucket count 0/1/2/4, empty/chain/siblings, hidden/show and mixed controls. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-DEPTH-007 — Empty sole bucket

**P1; open. INTENT:** A proven root-only sole bucket may use a direct Cloudflare save; unknown inventory is not proven empty.

**IMPLEMENTATION:** `src/core/menu-spec.mjs:hierarchy`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/logic2real-depth-save.test.mjs; depth-scope-regression: 384 combinations; per limit 1/4/5/10, bucket count 0/1/2/4, empty/chain/siblings, hidden/show and mixed controls. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-DEPTH-008 — Replacement inventory

**P0; open. INTENT:** A fresh bounded Depth crawl replaces stale Explorer prefixes rather than unioning removed folders back in.

**IMPLEMENTATION:** `extension/background.mjs:depthSnapshots`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/logic2real-depth-save.test.mjs; depth-scope-regression: 384 combinations; per limit 1/4/5/10, bucket count 0/1/2/4, empty/chain/siblings, hidden/show and mixed controls. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-DEPTH-009 — Failed refresh persistence

**P0; open. INTENT:** Failed discovery keeps the previous snapshot and durable pending marker; restart cannot treat it as fresh.

**IMPLEMENTATION:** `extension/background.mjs:depthRefreshPending`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/logic2real-depth-save.test.mjs; depth-scope-regression: 384 combinations; per limit 1/4/5/10, bucket count 0/1/2/4, empty/chain/siblings, hidden/show and mixed controls. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-DEPTH-010 — Provider-immediate exception

**P1; fixed-code-only. INTENT:** A flattened sole Depth bucket root immediately under Cloudflare is identified by bucket name; nested Save here and every target ID survive.

**IMPLEMENTATION:** `src/core/menu-spec.mjs:providerRootSave`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/depth-after.log, EVIDENCE/layout-before/results.json, EVIDENCE/layout-after/results.json, EVIDENCE/menu-comparison.json.

**DISCREPANCY:** Root action clarified with exact bucket name; native rendering and remote click not observed. Root cause: confirmed in generated plan: sole Depth bucket wrapper is inlined and its root Save here receives provider parent.

**Tests / falsification:** tests/depth-scope-regression.test.mjs; depth-scope-regression: 384 combinations; per limit 1/4/5/10, bucket count 0/1/2/4, empty/chain/siblings, hidden/show and mixed controls. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-DEPTH-011 — Worker setup reported failure

**P1; blocked. INTENT:** Authorized Depth root intermediate and leaf clicks must use the exact account/bucket plan; never borrow another bucket Worker or silently provision.

**IMPLEMENTATION:** `src/cloudflare/transport.mjs:cap`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: REPORTED FAILURE. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** P1 user-reported real Depth save failure near Images; original row unknown. Included as one reported negative observation, not a new live reproduction. Remains release-blocking. Root cause: unknown: clicked row/target/plan unavailable; same-bucket controls pass; do not merge separate incidents.

**Tests / falsification:** tests/depth-scope-regression.test.mjs; depth-scope-regression: 384 combinations; per limit 1/4/5/10, bucket count 0/1/2/4, empty/chain/siblings, hidden/show and mixed controls. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-DEPTH-012 — Readiness projection

**P1; open. INTENT:** Restart rechecks active observed Depth destinations; readiness is never inferred solely from a persisted menu ACK.

**IMPLEMENTATION:** `extension/background.mjs:depthTargets`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/destination-ready.test.mjs; depth-scope-regression: 384 combinations; per limit 1/4/5/10, bucket count 0/1/2/4, empty/chain/siblings, hidden/show and mixed controls. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-PRESENTATION-001 — Depth compact controls

**P2; fixed-code-only. INTENT:** Depth eye and trash remain compact accessible controls aligned with maximum-depth input without cross-axis stretching.

**IMPLEMENTATION:** `extension/depth-destinations.css:.depth-destinations`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/depth-after.log, EVIDENCE/layout-before/results.json, EVIDENCE/layout-after/results.json, EVIDENCE/menu-comparison.json.

**DISCREPANCY:** Chromium UI corrected; installed extension UI remains unverified due administrator policy. Root cause: confirmed: computed label margins, block input and flex cross-axis stretching; Chromium rectangles 81px before and 32px after..

**Tests / falsification:** scripts/test-depth-layout.mjs: widths 360/1000; 23 scopes; long name; depth 100; focus; zoom 150%; paging; staged eye/delete. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-PRESENTATION-002 — Depth layout packaging

**P2; fixed-code-only. INTENT:** Ship and load the dedicated Depth stylesheet in the unpacked extension artifact; missing module fails build.

**IMPLEMENTATION:** `scripts/build-extension.mjs:DEPTH_STYLES_MISSING`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/depth-after.log, EVIDENCE/layout-before/results.json, EVIDENCE/layout-after/results.json, EVIDENCE/menu-comparison.json.

**DISCREPANCY:** Packaged CSS and link validated; native installation blocked. Root cause: confirmed: no dedicated stylesheet on baseline.

**Tests / falsification:** scripts/test-depth-layout.mjs: widths 360/1000; 23 scopes; long name; depth 100; focus; zoom 150%; paging; staged eye/delete. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-PRESENTATION-003 — Depth responsive accessibility

**P2; fixed-code-only. INTENT:** Long labels narrow widths zoom focus hidden state and paging remain usable with accessible labels and explicit Save.

**IMPLEMENTATION:** `extension/app.mjs:data-manager-depth`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/depth-after.log, EVIDENCE/layout-before/results.json, EVIDENCE/layout-after/results.json, EVIDENCE/menu-comparison.json.

**DISCREPANCY:** Chromium UI corrected; installed extension UI remains unverified due administrator policy. Root cause: confirmed: computed label margins, block input and flex cross-axis stretching; Chromium rectangles 81px before and 32px after..

**Tests / falsification:** scripts/test-depth-layout.mjs: widths 360/1000; 23 scopes; long name; depth 100; focus; zoom 150%; paging; staged eye/delete. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-RENDERING-001 — Deterministic ordering

**P1; open. INTENT:** Input order normalization stable placements and sibling indices yield deterministic native rows.

**IMPLEMENTATION:** `src/core/menu-spec.mjs:add`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/canonical-menu.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-RENDERING-002 — Exact collision handling

**P0; open. INTENT:** Same-named folders across accounts/buckets retain different bound actions and collision labels never change routes.

**IMPLEMENTATION:** `src/core/menu-identity.mjs:stableId`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/canonical-menu.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-RENDERING-003 — Checked Flat hierarchy

**P1; open. INTENT:** Current additive Flat does not veto checked trees; older exclusive Flat wording remains an unresolved documentation conflict.

**IMPLEMENTATION:** `src/core/menu-spec.mjs:flatPolicy`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Documentation/legacy expectation ambiguity; source behavior observed, product precedence not invented. See unresolved decision register. Root cause: unknown.

**Tests / falsification:** tests/composition-remaining.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-RENDERING-004 — Availability visibility

**P1; open. INTENT:** Unavailable saved destinations keep chosen labels and data; setup attention does not impersonate a successful save.

**IMPLEMENTATION:** `src/core/menu-spec.mjs:setupProvider`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/canonical-menu.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-RENDERING-005 — Budgets and paging

**P1; open. INTENT:** Logical budgets report omissions and stale cursors fail rather than silently truncating inspection as complete.

**IMPLEMENTATION:** `src/core/menu-spec.mjs:inspectMenuTree`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/canonical-menu.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-APPLICATION-001 — Plan validation

**P0; open. INTENT:** Validate parents roles contexts IDs and sibling order before Chrome clearing/creation.

**IMPLEMENTATION:** `src/chrome/registrar.mjs:generateChromePlan`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/chrome-registrar.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-APPLICATION-002 — Callback ACK

**P0; open. INTENT:** Only create/remove callbacks acknowledge native application; returned IDs and persisted generations do not prove rendering.

**IMPLEMENTATION:** `src/chrome/registrar.mjs:createChromeRegistrar`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/chrome-registrar.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-APPLICATION-003 — Partial application

**P0; open. INTENT:** Failed create callbacks report failed items and blocked descendants; never claim all items applied.

**IMPLEMENTATION:** `src/chrome/registrar.mjs:NATIVE_APPLY_INCOMPLETE`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/chrome-registrar.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-APPLICATION-004 — Serialized generations

**P0; open. INTENT:** Serialize generations and reject stale/conflicting plans while preserving independently failed sibling evidence.

**IMPLEMENTATION:** `src/chrome/registrar.mjs:queue`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/chrome-registrar.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-APPLICATION-005 — State convergence

**P0; open. INTENT:** Desired compiled and durable acknowledged generation converge only after current intent and callbacks agree.

**IMPLEMENTATION:** `src/core/engine.mjs:apply`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/logic2real-depth-save.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-APPLICATION-006 — Worker restart

**P0; open. INTENT:** A new worker rehydrates current state and reacquires ACK; historical ACK is not present authority.

**IMPLEMENTATION:** `extension/background.mjs:nativeReady`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/chrome-registrar.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-APPLICATION-007 — Native limits

**P1; open. INTENT:** Logical deep trees do not establish Chrome submenu rendering or platform limit behavior; independently observe native UI.

**IMPLEMENTATION:** `src/chrome/registrar.mjs:generateChromePlan`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/canonical-menu.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-ROUTING-001 — Bound action

**P0; open. INTENT:** Resolve menu item and generation to its immutable bound target; labels never supply authority or path.

**IMPLEMENTATION:** `src/core/action-resolver.mjs:resolveMenuAction`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/canonical-menu.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-ROUTING-002 — Stale disabled context

**P0; open. INTENT:** Reject stale unknown unacknowledged disabled context-mismatched and revoked selections without fallback rerouting.

**IMPLEMENTATION:** `src/core/action-resolver.mjs:blocked`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/canonical-menu.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-ROUTING-003 — Authorization recheck

**P0; open. INTENT:** Recheck current account exact target native generation and session before remote transfer and completion.

**IMPLEMENTATION:** `src/core/engine.mjs:authorize`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/cloudflare-integration.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-ROUTING-004 — Selected source

**P0; open. INTENT:** Capture selected URL type and filename safely; never derive a destination from page labels or leaked credentials.

**IMPLEMENTATION:** `right2cloud-module/src/source-fetch.mjs:sourceFromClick`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/object-provenance.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-ROUTING-005 — True remote path

**P0; open. INTENT:** Cloudflare uses canonical remote transport before browser capture; unsupported Explorer cloud bytes fail explicitly.

**IMPLEMENTATION:** `src/core/engine.mjs:selectedRemote`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/cloudflare-integration.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-ROUTING-006 — Worker grant scope

**P0; open. INTENT:** Signed short-lived capability matches protocol session account bucket and prefix scope; invalid Worker URLs and escaped prefixes fail.

**IMPLEMENTATION:** `src/cloudflare/transport.mjs:cap`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/cloudflare-integration.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-ROUTING-007 — Object key and readback

**P0; open. INTENT:** Actual object key belongs to exact target prefix and success requires independent version/size readback.

**IMPLEMENTATION:** `src/cloudflare/writer-registry.mjs:destinationWriter`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/cloudflare-integration.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-ROUTING-008 — Completion history

**P0; open. INTENT:** Record truthful verified completion/history only after readback; completion persistence failure remains partial and must not replay upload.

**IMPLEMENTATION:** `src/core/engine.mjs:onVerifiedCompletion`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/save-receipt-repair.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-SECURITY-001 — OAuth identity

**P0; open. INTENT:** Use registered extension redirect and issued account-scoped grants; no invented authority or silent scope escalation.

**IMPLEMENTATION:** `src/auth/cloudflare-oauth.mjs:createCloudflareOAuth`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/oauth-v3p1.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-SECURITY-002 — Explicit provisioning

**P0; open. INTENT:** Only explicitly authorized matching account/bucket infrastructure may be prepared or repaired; no automatic new bucket Worker or billing.

**IMPLEMENTATION:** `src/cloudflare/deployment.mjs:prepare`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/cloudflare-deployment.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-SECURITY-003 — Readiness per bucket

**P0; open. INTENT:** Worker plans key by account and bucket; same-bucket proof plus current prefix capability can validate new folders, never other buckets.

**IMPLEMENTATION:** `src/cloudflare/deployment.mjs:lookup`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/destination-ready.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-SECURITY-004 — Expiry and reauth

**P0; open. INTENT:** Token refresh transient failures and actual reconsent remain distinct while retaining destinations and approval ledger.

**IMPLEMENTATION:** `src/auth/cloudflare-oauth.mjs:refresh`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/oauth-v3p1.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-SECURITY-005 — Public source defense

**P0; open. INTENT:** Reject private unsafe sources and redirect escapes; disclose unresolved DNS-rebinding exposure rather than disabling TLS checks.

**IMPLEMENTATION:** `src/cloudflare/public-address.mjs:sourceURL`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/redown-restoration.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-SECURITY-006 — Diagnostic privacy

**P0; open. INTENT:** Diagnostics never control execution or expose tokens signed URLs private bodies or credential values.

**IMPLEMENTATION:** `src/core/boundary-observation.mjs:observe`. No configuration mutation by pure projection or presentation.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/boundary-instrumentation.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-RECOVERY-001 — Missing CURRENT

**P0; open. INTENT:** Established missing/corrupt state is blocked for recovery, never treated as a new empty user or reset.

**IMPLEMENTATION:** `src/persistence/current-store.mjs:read`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/current-recovery.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-RECOVERY-002 — Journal and schema

**P0; open. INTENT:** Atomic records journal validated schemas and idempotency receipts preserve destination identity through commits/restarts.

**IMPLEMENTATION:** `src/persistence/current-store.mjs:commitProduct`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/persistence.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-RECOVERY-003 — External restore

**P0; open. INTENT:** Restore only validated independently authorized external CURRENT/journals; fixtures and local IDB are not Windows backup proof.

**IMPLEMENTATION:** `src/persistence/external-recovery.mjs:createExternalRecovery`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/external-recovery-v3p1.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-RESILIENCE-001 — Shelf closed fallback

**P1; open. INTENT:** Use existing user-gesture Shelf attention for actionable failures; browser-enforced gesture limits cannot be promised away as headless recovery.

**IMPLEMENTATION:** `src/chrome/provider-panel.mjs:createShelfAttention`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/boot-login.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-RESILIENCE-002 — Unknown upload outcome

**P0; open. INTENT:** Lease/recheck cancellation and uncertain verification outcomes never become false successful saves or blind duplicate retries.

**IMPLEMENTATION:** `src/cloudflare/transport.mjs:save`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/cloudflare-integration.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-RESILIENCE-003 — Observability correlation

**P1; open. INTENT:** Correlate operation timestamps and generations; separate SCOPE_UNAUTHORIZED WORKER_SETUP_REQUIRED and NATIVE_APPLY_INCOMPLETE without causal evidence.

**IMPLEMENTATION:** `src/core/engine.mjs:operationIdentity`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: UNVERIFIED. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/boundary-instrumentation.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-COMPATIBILITY-001 — Depth noninterference

**P0; open. INTENT:** Only Depth presentation and the exact requested provider-root exception change; all unrelated configurations and routes remain byte-identical.

**IMPLEMENTATION:** `src/core/menu-spec.mjs:providerRootSave`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Installed native behavior unverified; available offline coverage is partial, not an exhaustive proof. Root cause: unknown.

**Tests / falsification:** tests/depth-scope-regression.test.mjs; depth-scope-regression: 384 combinations; per limit 1/4/5/10, bucket count 0/1/2/4, empty/chain/siblings, hidden/show and mixed controls. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.

## L2R-COMPATIBILITY-002 — Legacy compiler boundary

**P1; open. INTENT:** Historical pure compiler is not production composite entry point; contradictory tests/docs are decisions, not authorization for rewrites.

**IMPLEMENTATION:** `src/core/menu-compiler.mjs:compileMenu`. Draft until explicit atomic Save; durable desired and applied generations are distinct.

**REALITY:** UNVERIFIED; UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. Remote outcome: NA. Local evidence: EVIDENCE/offline-final.log.

**DISCREPANCY:** Documentation/legacy expectation ambiguity; source behavior observed, product precedence not invented. See unresolved decision register. Root cause: unknown.

**Tests / falsification:** tests/menu-compiler.test.mjs. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.


## Maintenance

For future iterations, discover callers and source symbols first; append rules for new branches rather than silently dropping gaps. Update RULES.json with precise build/browser/operation provenance, measured outcomes and NA reasons. Re-run named assertions and native tests where permitted, then run `node scripts/render-logic2real.mjs`. Preserve baseline scores and identical weights/scenarios. A repaired fixture does not close C/R/S. Never copy tokens or signed URLs into evidence.
