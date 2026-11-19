# Preserved customer-history baseline notes

These notes are retained verbatim from `220e5f4e15baeb52fd600ad08f9078f8598a7a2f`. They are historical evidence, not a closure of the later Windows issue. The current issue register and issue file were aligned with main `9bdec3b7093fca740dc0af7b76ace27940d8ec79` solely to remove inherited documentation merge conflicts. No main implementation was merged.

## Review-branch investigation — November 14, 2026

The issue remains **OPEN for the owner's Windows incident**. Linux independent
process samples did not reproduce it: ten isolated + ten full runs before the
Phase 2 investigation all passed; ten isolated + ten full runs after opt-in safe
tracing and the LF checkout policy all passed, including OFF/BASIC/EXPANSIVE modes.
Three bounded CPU-contention runs and protected Base 0.1 controls passed too.
No production authorization, generation, expiry or replay behavior was changed.

A deterministic control proves missing fixture-dispatch `generation` can produce
STALE_GENERATION without a real generation change. Separate post-write session or
generation loss correctly remains uncertain and is never replayed. These are
causal controls, not proof of which path occurred in the owner report.

The distinct LF/CRLF byte-hash cause is repaired by narrow `.gitattributes` rules,
with actual Git autocrlf conversion and content-tamper controls. Real Windows CMD
execution and installed Chrome remain NOT RUN/BLOCKED here. See
[the complete report](../../docs/evidence/mv3-suite-reliability/REPORT.md) and
[Windows procedure](../../docs/evidence/mv3-suite-reliability/WINDOWS_ACCEPTANCE.md).


## November 13, 2026, 15:24 CST — owner-reported Narrow bugs and bucket-label rule (OPEN)

- **P1 BUG — `2D` Narrow destinations accumulate to ~10; Edit works but Trash does not reliably delete:** [investigation and non-destructive acceptance criteria](Bugs/P1_NARROW_2D_DUPLICATE_ACCUMULATION_TRASH_UNRESPONSIVE_2026-11-13.md). Unknown if stored duplicates, uncommitted deletions, or native menu artifacts; verify exact IDs and state before repair. No storage reset or bulk auto-cleanup.
- **P1 ISSUE — Non-`redown` Cloudflare R2 bucket labels must be visible:** [`Cloudflare > valentiens > 2D` and Save here / redown exception](Issues/P1_CLOUDFLARE_NARROW_BUCKET_LABEL_VISIBILITY_REDOWN_EXCEPTION_2026-11-13.md). Existing source skips unlabeled Narrow bucket roots; preserve the actual bucket level, same-target independent Narrow presentations and Depth hierarchy.
