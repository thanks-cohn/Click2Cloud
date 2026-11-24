# Final Codex consistency audit — Queue/UX + History V2

**Audit date:** 2026-11-24  
**Audited current files:** `11.23.2026/queue-final.md`, `11.23.2026/CODEX_REQUEST_QUEUE_AND_UX.md`, and the reference-only `11.23.2026/DEFERRED_CODEX_REQUESTS.md`. `queue.md` is an untouched archived predecessor, not an implementation instruction.  
**Scope:** document consistency and architectural failure modes, not proof of implementation or live provider acceptance.

## Decisions locked and aligned

1. **Single execution entry point:** active work order directs Codex to the sole authoritative `queue-final.md`; deferred document is not permission to implement it; no final History-tab cutover in current run.
2. **Future product state:** standalone professional Live Jobs Queue + complete History V2 in History, fully retiring legacy History after separately authorized parity/rollback review. During alpha, the new sections are stacked in Queue and legacy History stays available.
3. **Identity and chronology:** one destination-specific record/card per actual save attempt, no separate rename/move/delete events; stable IDs prevent replay duplicates, chronology orders cards, calendar hierarchy and pagination work from indexed queries.
4. **Three independent lifecycles:** live job status, temporary 15-minute Queue History visibility, and durable V2 archive retention. Archive defaults to non-destructive Unlimited; Capped is explicit opt-in with user-editable suggested 200,000; 100,000 records is the synthetic benchmark only; Clear All is separately confirmed.
5. **Single ZIP availability from alpha:** History V2 always exposes one full ZIP download action, including hidden-but-retained records; detailed Settings `Export Queue History` controls remain conditional on timer OFF, per owner decision. The ZIP includes source metadata, proof levels, correlation IDs and integrity evidence; does **not** alter Diagnostics or independently re-verify remote objects.
6. **Strict UX-only additions:** modular nav, permanent Downloads exclusion from More even with Debug Mode, full Remote V1 preservation, specified modern-theme hiding, keyboard shortcuts overflow correction, Remotes Login/Reconnect top-right and Refresh/GO TO bottom-right.

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