# REDOWN — November 23, 2026: Unified History

**Status:** source-level audit and implementation specification, not completed feature work.

**Official immutable baseline:** redown-0.3.24-KNOWN-GOOD-FOUNDATION-2026-11-23  
**Foundation commit:** cd4c8dd3bc11700376d30da050d6050a0eb1edb9  
**Documentation branch:** codex/redown-0324-unified-history-1123-docs — created directly from foundation commit, NOT 0.3.25.  
**Path:** /11.23

## Documents

1. [REDOWN_0324_UNIFIED_HISTORY_DEEP_AUDIT.md](REDOWN_0324_UNIFIED_HISTORY_DEEP_AUDIT.md) — verified source map, 18 failure modes, design decisions, preservation rules, comprehensive test strategy, honest remaining uncertainty.
2. [CODEX_ONE_SHOT_UNIFIED_HISTORY_FROM_0324.md](CODEX_ONE_SHOT_UNIFIED_HISTORY_FROM_0324.md) — implementation instructions, module boundaries, read-only API contract, chronological algorithm, independent Basic History JSONL exporter, coordinated exports, exact checkpoints and stop conditions.

## Product requirement

Unify Basic (Google Drive, OneDrive, Dropbox) and Cloudflare/ReDown saved activity in ONE chronological presentation without merging databases or modifying their save engines. Retain year/week/day chronology and all detailed existing screenshot/History features, source-faithful receipts, previews, filters and themes. Implement ONE separate, independent "Download Basic History" button using canonical Basic attempts, not the existing capped RAW diagnostics ZIP. Preserve advanced three-scope exports: Basic only, Cloudflare only, All; newest-first deterministic time order. This is a History/audit product feature, not an authorization to alter the established 0.3.24 screenshot/shortcut behavior.

## Codex light starter (copy verbatim)

Implement the next REDOWN Unified History run using ONLY the branch codex/redown-0324-unified-history-1123-docs, which is rooted directly at the immutable REDOWN 0.3.24 commit cd4c8dd3bc11700376d30da050d6050a0eb1edb9. BEFORE touching code, read BOTH documents under /11.23: REDOWN_0324_UNIFIED_HISTORY_DEEP_AUDIT.md and CODEX_ONE_SHOT_UNIFIED_HISTORY_FROM_0324.md. Implement the standalone one-click Basic History exporter first, then a bounded chronological coordinator, then unified cards and coordinated exports. Preserve all original Basic and Cloudflare stores/receipts, screenshots, Chrome In Chrome shortcuts, Basic cards, themes, OAuth, right-click saves, toolbar counters, and existing History features. NEVER import 0.3.25 shortcut repairs, overwrite the 0.3.24 foundation, reset DBs, or misrepresent fixture tests as installed Chrome proof. Follow all milestone tests, stop conditions and exact final-report requirements from those files. Commit only after measured gate success and report any unverified Windows Chrome or live provider acceptance honestly.

## First Codex checks

- Fetch all refs and verify the current branch ancestry from the tag.
- git diff --name-status redown-0.3.24-KNOWN-GOOD-FOUNDATION-2026-11-23..HEAD
- Before implementation this branch should contain documentation changes under 11.23 only.
- Record version, existing test status and SHA.
- Never use the separate 0.3.25 branch head as a starting point.

## Evidence categories

- SOURCE-REVIEWED: contract and risk analysis grounded in tagged files.
- DESIGN: the new proposed algorithm/export/test expectations; NOT implementation.
- FIXTURE VERIFIED: tests actually executed by Codex, with logs and environment.
- INSTALLED/OWNER VERIFIED: performed on owner's Windows Chrome profile.
- LIVE PROVIDER VERIFIED: actual account file readback, not local card rendering.

Do not collapse these categories into a single "passed" badge.

## Data safety

There is NO new canonical History store or destructive migration. User-selected configuration, existing data, receipts, authentication state and saved destinations must be preserved. An incomplete source is never mislabeled empty; a provider-confirmed Basic SAVED event is not necessarily a fresh remote-file existence proof. Export complete *retained* records, not deleted History.

## Scope statement

These documents alone do not modify the extension, implement History, validate Windows Chrome, or prove remote file persistence. They make the upcoming one-shot development run more narrowly specified, falsifiable and recoverable.
