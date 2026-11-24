# OWNER P0 OVERRIDE — 0.3.24-ONLY QUEUE / UX RESTART (2026-11-24)

> **CONTROLLING RULE: This header supersedes every contradictory baseline, branch, screenshot-shortcut default, implementation, and test claim in the original document below.** This branch contains revised documentation, not an implemented Queue V2.

## Immutable starting point

- **AUTHORIZED SOURCE FOUNDATION:** REDOWN **0.3.24**, exact Git commit `cd4c8dd3bc11700376d30da050d6050a0eb1edb9`, exact tag `redown-0.3.24-KNOWN-GOOD-FOUNDATION-2026-11-23`.
- **ONLY AUTHORIZED WORK BRANCH:** `codex/queue-history-v2-0324-verified-2026-11-24`. This branch was created directly from `cd4c8dd3bc11700376d30da050d6050a0eb1edb9`; maintain that ancestry throughout the run.
- **Documentation-only donor:** `1c1e6ea23f0f062740463d923fb53a8efdbbd544` contains the original Queue request/spec/audit. Copy its **three Markdown documents only**. Its application source, `main` head, and package version are NOT authorized starting points.
- **BLACKLIST / IGNORE:** `codex/queue-history-v2-2026-11-24`, `queue-v2-review`, and any Queue V2 implementation based on 0.3.23. NEVER merge/rebase/cherry-pick/copy/port its source as implementation, even to accelerate work. Do not use 0.3.25 as the baseline. Do not switch back to `main` to implement. Treat previous Queue test claims as nontransferable to 0.3.24.
- **STOP BEFORE CODING** if `git merge-base HEAD cd4c8dd3bc11700376d30da050d6050a0eb1edb9` does not equal `cd4c8dd3bc11700376d30da050d6050a0eb1edb9`, if working on a different branch, if the ORIGINAL BASE COMMIT (`cd4c8dd3`) did not identify 0.3.24, if the CURRENT authorized branch does not now identify **0.3.26** in `package.json`, `package-lock.json`, `extension/manifest.json`, or if the original four Remotes cards are missing. Original 0.3.24 base and current 0.3.26 work-branch version are intentionally different. Print any mismatch; never switch to 0.3.23, 0.3.25, `main`, or rejected Queue implementation.
- Begin with read-only baseline and parity inventory; then checkpoint-driven implementation ONLY in this branch. No destructive resets, no Chrome storage clearing, no cloud mutations merely to exercise UI.

## Mandatory preservation / regression gates

- Preserve the **FOUR stacked Remotes cards** from 0.3.24: **Google Drive, OneDrive, Dropbox, Cloudflare R2**; preserve `extension/basic-provider-cards.mjs`, all Basic API auth/status/pending-save/Continue save behaviors, Cloudflare onboarding, icons, button actions, existing data, and per-provider readiness logic.
- Preserve the **existing Remotes identity**: `All Your Clouds. / One Place.`; three Basic provider cards; `The Future is NOW. / True Remote is Here.`; separate Cloudflare R2 card. Apply ONLY authorized action-button layout cleanup. NO card deletion, consolidation, fake placeholders, `PROVIDER_NOT_IMPLEMENTED` fallback, or redesign that hides providers.
- Preserve File Explorer, screenshots, context menus (Depth, Narrow, Simple), connection/auth, current-store recovery and diagnostics, existing History, existing themes incl. Frames and Remote V1, keyboard shortcuts, right-click save, and cold boot. Queue/History observers must not block saving.
- **Screenshots form dropdown, NEW rules only:** in the **Screenshot Shortcut** select, show **Alt+Q preselected by default** when creating a rule. The existing blank/**None** option MUST REMAIN selectable, as must every other supported command. Do not automatically register/change Chrome shortcuts, create a screenshot rule, capture a screenshot, or overwrite existing rule selections. Editing an existing rule must keep its saved shortcut (including None); only the initial new-rule form selection changes. If Alt+Q is unassigned in Chrome, show the truthful actual status; do not fake a binding. Verify new rule Alt+Q, switch to None and save, edit existing None/other, reload and verify persistence.
- Queue V2 + History V2 must consume actual 0.3.24 provider/screenshot receipt and API contracts. Build truthful source-adapter coverage matrix. Do not use old Queue mocks or passing tests as provider integration evidence. Existing History continues working throughout alpha; no cutover without later owner approval.
- **Required gates before claiming success:** original 0.3.24 baseline inventory; four card UI and basic-provider service proof; screenshot form default/None/edit proof; side-by-side preserve/regress matrix; unit/integration/browser tests with explicit limitations; 100,000-record benchmark; full ZIP integrity/export proof; real Chrome and signed-in-provider checks separately labeled VERIFIED or UNVERIFIED. A failing preservation gate is a failed run irrespective of passing Queue tests.
- Never claim an extension installation or verified Chrome-profile state from unit tests. Never delete/replace a user's Chrome extension or storage.

Read `11.23.2026/BASELINE_AND_ACCEPTANCE_0324.md` first, then `AGENTS.md`, `CODEX_REQUEST_QUEUE_AND_UX.md`, `queue-final.md`, and `FINAL_CONSISTENCY_AUDIT.md`. `queue-final.md` is authoritative for Queue/History V2 functionality **subject to this immutable foundation/preservation override**. Superseded `queue.md` remains historical only.

---

# Final Codex consistency audit — Queue/UX + History V2

**Audit date:** 2026-11-24  
**Audited current files:** `11.23.2026/queue-final.md`, `11.23.2026/CODEX_REQUEST_QUEUE_AND_UX.md`, and the reference-only `11.23.2026/DEFERRED_CODEX_REQUESTS.md`. `queue.md` is an untouched archived predecessor, not an implementation instruction.  
**Scope:** document consistency and architectural failure modes, not proof of implementation or live provider acceptance.

## Decisions locked and aligned

1. **Single execution entry point:** active work order directs Codex to the sole authoritative `queue-final.md`; deferred document is not permission to implement it; no final History-tab cutover in current run.
2. **Future product state:** standalone professional Live Jobs Queue + complete History V2 in History, fully retiring legacy History after separately authorized parity/rollback review. During alpha, the new sections are stacked in Queue and legacy History stays available.
3. **Identity and chronology:** one destination-specific record/card per actual save attempt, no separate rename/move/delete events; stable IDs prevent replay duplicates, chronology orders cards, calendar hierarchy and pagination work from indexed queries.
4. **Three independent lifecycles:** live job status, temporary 15-minute Queue History visibility, and durable V2 archive retention. Archive defaults to non-destructive Unlimited; Capped is explicit opt-in with user-editable suggested 200,000; 100,000 records is the synthetic benchmark only; Clear All is separately confirmed.
5. **Single ZIP from alpha, in Settings → Queue:** An unconditional `Export Complete History ZIP` action stays accessible in the Queue Settings card irrespective of the 15-minute timer. The detailed `Export Queue History` subsection is conditional on timer OFF. A secondary History V2 toolbar shortcut is allowed but not required. ZIP contains full retained range, manifest, proof metadata, counts and independent integrity checks, without modifying Diagnostics.
6. **Strict UX-only additions:** modular nav, permanent Downloads exclusion from More even with Debug Mode, full Remote V1 preservation, specified modern-theme hiding, keyboard shortcuts overflow correction, Remotes Sign In/Reconnect bottom-left and GO TO/Refresh bottom-right.

## Genuine engineering risks that the request requires Codex to prove (not assumed solved)

| Risk / unresolved platform reality | Severity | Required release evidence / behavior |
| --- | --- | --- |
| Durable source receipts → V2 archive race (worker interruption, storage failure) | P0 | Idempotent destination-scoped upsert, recoverable accounting pending, zero blind reuploads, no false `VERIFIED` |
| Old Queue/compatibility list truncation | P0 | V2 indexed archive queries recover entire retained corpus; no relying on 50/100 recent projection as source of truth |
| **100k ZIP streaming in actual extension Chrome APIs** | **P0** | **Early Chrome feasibility gate:** independently verify one complete downloadable 100,000-record ZIP with bounded app-managed RAM before building full UI. Batch reads followed by a giant Blob are insufficient. If the full ZIP fails, mandatory alpha export is **BLOCKED/incomplete**; no silent partial archive. Beyond verified capacity, fail clearly rather than promise infinity. |
| Consistent export while incoming saves, cap evictions or clear run | P0 | Document snapshot/high-watermark and maintenance concurrency; no duplicate/missing IDs, uncertain output is not marked complete |
| Safe cap rollover / Clear All vs historic receipt reimport | P0 | Controlled source checkpoints/exclusions do not resurrect old data or silently suppress legitimate late saves; if unproven, disable destructive control, report BLOCKED |
| Timer/Delete conflicts with cap rollover | P1 | One scoped archive policy engine or explicitly ordered independent policies; no accidental multi-prune; 15-minute Hide never deletes; live jobs never affected |
| 403/auth and evidence quality | P0 | Actual provider-specific classification, no false success, real-browser/provider testing separately from mocks; no OAuth rewrite in this scope |
| Cross-provider sensitive source/host URLs in export | P1 | Secure/redacted default ZIP; preserve joinable correlation keys with Diagnostics, never include tokens/signed secrets; document limits of raw metadata |
| Deep arbitrary numeric page jump vs O(page) cursor paging | P1 | Indexed paging + measured page-anchor/seek or bounded fallback; avoid unsubstantiated constant-time direct jump claim |
| Day/week/month/year grouping across midnight/DST and large groups | P1 | Indexed bounded group queries, tests for time-zone and pagination boundary; no whole-day hydration |
| UI update and multiple-window IndexedDB migration | P1 | Incremental updates preserve focus and scroll, schema upgrade blocked/versionchange handling, independent module mount tests |
| Non-retroactive Delete vs full Clear & historical export UI | P1 | Exact confirmation and effective-from semantics; export-first from Clear regardless of Settings visibility; records already deleted cannot be exported |
| Future History cutover vs current legacy state | P1 | Do not retire legacy History now; complete field/action export parity, rollback and user approval before replacement |

## Residual product trade-offs — not contradictions, but must be documented

- **A History ZIP contains extension observations/evidence, not an automatic live cloud audit.** Status and verification claims reflect the provider's actual retained proof level; diagnostic comparison is a separate future analysis step. ZIP creation does not re-upload, re-fetch or probe remote cloud files.
- **Unlimited archive retention is bounded by the device/browser quota.** Likewise, `100,000` is a benchmark and `200,000` is a suggested capped-mode value, not an upper bound.
- **Permanent deletion and capped rollover can conflict with delayed source receipts.** Exclusion/watermark design needs rigorous tests and may be BLOCKED; don't silently substitute hiding for real deletion.
- **The two export UI paths intentionally differ:** the compact always-accessible History ZIP action versus the conditional detailed Settings export subsection. This preserves the previously approved minimal Settings while meeting alpha export availability.
- **ZIP files can contain sensitive URLs and destination names even with credentials removed.** Secure export is default and raw details require an informed user choice if that mode is supported. The original Diagnostics system is explicitly outside scope.
- **No guarantee of alpha certification:** real Chrome, native context menus, logged-in cloud-provider cases and authorization/403 classification must be evidenced, not inferred from mocks or the spec.

## Acceptance of document audit

- All three documents use the same canonical source, same temporary/long-term tab boundaries, same Unlimited/Capped defaults, same 15-minute policy, same current-vs-deferred feature scope, same ZIP availability and unchanged Diagnostics boundary.
- Active Codex request and final spec both demand a single-ZIP exporter from the first implementation and independent ZIP integrity tests.
- Legacy `queue.md` is preserved as an archive and is not an execution input.

**Recommendation:** Keep the scoped Work Order 01 but require a read-only source/parity audit as the first checkpoint. Do not authorize a massive blind implementation or claim a 'one-shot' guarantee. The highest-risk acceptance gate is the intersection of **durable reconciliation, safe destructive retention, and memory-bounded ZIP streaming**.

---

## OWNER P0 RECONFIRMATION — 2026-11-24

This revised document is hosted on branch `codex/queue-history-v2-0324-verified-2026-11-24`, based on exact REDOWN 0.3.24 commit `cd4c8dd3bc11700376d30da050d6050a0eb1edb9`. Documentation was copied from `1c1e6ea23f0f062740463d923fb53a8efdbbd544` without importing its application source. Previous `codex/queue-history-v2-2026-11-24` is forbidden and must be ignored entirely for implementation. The new Screenshots rule shortcut defaults to Alt+Q while **None remains selectable**, with all existing values preserved. For conflicts, the controlling P0 override and `BASELINE_AND_ACCEPTANCE_0324.md` govern.

---

## OWNER-APPROVED ADDENDUM AUDIT — HISTORY V2 CARD DOWNLOAD (2026-11-24)

Current run includes one additional explicit UX + functional parity requirement: **every History V2 collapsed save-result card has a readily visible, text-labeled Download button; no expansion required.** This must work in Compact and Full layouts, all themes, with truthful disabled/unavailable states for provider capabilities not verified in the 0.3.24 source. Retrieve the actual saved cloud object using existing authorized APIs and distinguish multiple screenshot destinations. The per-file button is separate from the archive-wide ZIP export and does not add a Downloads navigation entry, a new save attempt, or a provider-engine rewrite. Source of truth and detailed regression gate: `11.23.2026/CHANGE_REQUEST_HISTORY_V2_CARD_DOWNLOAD.md`. Test real provider/download viability, bounded memory and error handling; mocks alone cannot certify working download. The underlying 0.3.24 source base and old Queue branch prohibition do not change.

---

## OWNER-APPROVED 0.3.26 VERSION + CUSTOM NAVIGATION ACCEPTANCE AUDIT

Read `11.23.2026/CHANGE_REQUEST_VERSION_0326_NAV_VISIBILITY.md` for implementation and test details. Distinguish **immutable 0.3.24 source base** `cd4c8dd3` from **intended new version 0.3.26**. The current branch manifest/package/lock/build-info version is already **0.3.26** and its packaged Chrome extension must display **REDOWN 0.3.26**. Do not reset the release version because old baseline is 0.3.24.

**FINAL OWNER RULE:** The **More menu is the actual three-dot `⋯` button**. Settings → Customize Navigation offers **Main tab / More menu / Gone** for eligible sections **other than Settings**, which has ONLY **Main tab / More menu**; **Settings can never be Gone**. Reject or normalize invalid persisted `settings=gone` to `more`. Default main **Files | Remotes | Queue | ⋯**; Settings, History and other eligible sections initially in More, excluding Downloads. Gone only hides navigation, not data. Save preferences and preserve access to Settings. The always-visible **Export Complete History ZIP** belongs inside **Settings → Queue**, regardless of the 15-minute history Hide/Delete/OFF state. A History V2 toolbar shortcut is optional and must reuse the same ZIP exporter; the detailed `Export Queue History` subsection remains conditional on cleanup OFF.

## FINAL CONSISTENCY GATE — OWNER CLARIFICATIONS

**FINAL OWNER RULE:** The **More menu is the actual three-dot `⋯` button**. Settings → Customize Navigation offers **Main tab / More menu / Gone** for eligible sections **other than Settings**, which has ONLY **Main tab / More menu**; **Settings can never be Gone**. Reject or normalize invalid persisted `settings=gone` to `more`. Default main **Files | Remotes | Queue | ⋯**; Settings, History and other eligible sections initially in More, excluding Downloads. Gone only hides navigation, not data. Save preferences and preserve access to Settings. The always-visible **Export Complete History ZIP** belongs inside **Settings → Queue**, regardless of the 15-minute history Hide/Delete/OFF state. A History V2 toolbar shortcut is optional and must reuse the same ZIP exporter; the detailed `Export Queue History` subsection remains conditional on cleanup OFF.

**GUIDING AGENT-NATIVE PHILOSOPHY:** Human simplicity outside; machine-operable, observable and verifiable shared internal operations inside, **where practical and safe**. Prefer UI and agents exercising the same production contract. Synthetic evidence may cover 100,000 History records, 10,000 simulated queued jobs, expirations, provider outages, corrupt state, restarts and interruptions, but do not simulate real cloud uploads at impossible concurrency or claim mocks are provider proof. Keep simulation/integration/real-provider evidence distinct; preserve permissions, APIs, save engines and architecture without public privileged test endpoints.

A working Settings removal option, missing three-dot More button, or an Export Complete History ZIP action available **only** through History V2 instead of Settings → Queue is a **P0 acceptance failure**. The user-facing navigation and export locations are mandatory; agent-native exposure is a scoped guiding philosophy, not an excuse to rewrite working systems.

**OWNER UX CORRECTION (CURRENT):** Sign In or Reconnect belongs at the **BOTTOM-LEFT** (Cloudflare's auth button stays wide); **GO TO first, Refresh second** belong at the **BOTTOM-RIGHT**, right-aligned. The three-dot `⋯` More control must always be the rightmost header control, and File Explorer must retain its original 0.3.24 visual extent. Follow `11.23.2026/CHANGE_REQUEST_0326_HEADER_REMOTES_EXPLORER_PARITY.md`.

**OWNER UX CORRECTION (CURRENT):** Sign In or Reconnect belongs at the **BOTTOM-LEFT** (Cloudflare's auth button stays wide); **GO TO first, Refresh second** belong at the **BOTTOM-RIGHT**, right-aligned. The three-dot `⋯` More control must always be the rightmost header control, and File Explorer must retain its original 0.3.24 visual extent. Follow `11.23.2026/CHANGE_REQUEST_0326_HEADER_REMOTES_EXPLORER_PARITY.md`.

## LATEST OWNER 0.3.26 POST-IMPLEMENTATION VISUAL REPAIR — MANDATORY

**LATEST OWNER UX OVERRIDE (POST-0.3.26 ALPHA):** Read `11.23.2026/CHANGE_REQUEST_0326_HEADER_REMOTES_EXPLORER_PARITY.md` before modifying UI. **Sign In OR Reconnect bottom-left** of each applicable Remotes card; **GO TO followed by Refresh bottom-right**, right-aligned (auth action is NOT top-right). Cloudflare Sign In/Reconnect restores the original wide horizontal appearance, not a squeezed button. The application navigation **three-dot `⋯` is ALWAYS the far-right header control** (including narrow/custom tab configurations); preserve theme access. **File Explorer must regain its original full visual length/extent from 0.3.24**, with before/after viewport-matched browser proof. This overrides all older contradictory layout directions. Preserve 0.3.26 functionality, providers and engine behavior; implement as focused layout repair, not a redesign.

**LATEST OWNER HISTORY V2 PAGINATION REPAIR:** The current footer's `First | Previous | Page 1/1` upper row plus orphan `Next | Last` lower row is a **confirmed, ugly layout regression**. Repair it into a centered, compact, consistent responsive navigation row: First / Previous / editable Page / total / Next / Last. Use icon buttons with accessible labels on narrow Shelf widths, prevent accidental partial wrapping, and for one page consider simply `Page 1 of 1` without four oversized disabled buttons. Preserve all keyboard controls, pagination behavior, benchmark scale and themes. Mandatory screenshot/real-Chrome acceptance. See §E of `11.23.2026/CHANGE_REQUEST_0326_HEADER_REMOTES_EXPLORER_PARITY.md`.
