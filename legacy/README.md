# REDOWN V3 → Click2Cloud V3+1: legacy lessons and uncovered contracts

**Purpose:** A *documentary*, source-backed knowledge archive in the **NEW Click2Cloud repository**. This directory contains findings from the currently installed REDOWN V3 engine, its tests and audit documentation, specifically where the new modular proposals are silent, ambiguous, weaker, or could borrow a proven mechanism. **It is not a second execution engine or an instruction to resurrect deprecated Legacy Right-click.**

**Pinned source:** `thanks-cohn/REDOWN` main at `5041b5763541812c505c9cde6e8f79cb23a7b193`. **Pinned independent forensic audit:** `codex/v3-parity-first-reconstruction` at `94a1a5f0699eec904d989a3823d22f9bf2bd131d`. Source claims are cross-checked against relevant current files wherever possible; this is not a fresh installed-Chrome or live-Cloudflare test.

## Reading map

| Area | Read | Main uncovered lesson |
|---|---|---|
| **Simple** | [simple/README.md](simple/README.md) | Existing `redown` leaf/parent transition, default ambiguity, account disambiguation, stable alias order and root-alias loss |
| **Narrow** | [narrow/README.md](narrow/README.md) | Natural path trie, selected-parent Save here, independent aliases, parent-link eligibility, exact name/case semantics, alternate-branch limitation |
| **Depth** | [depth/README.md](depth/README.md) | Level 0 root, fair breadth-first menu budget, page/cursor safety, reuse-without-deletion; selected-depth scan limit is a defect to remove |
| **Destination Manager** | [destination-manager/README.md](destination-manager/README.md) | Keyboard/focus/scroll behavior worth preserving; cold root “Browse folders” failure; per-prefix async race guards; minimal circle UX remains owner-authoritative |
| **Native Registry** | [registry/README.md](registry/README.md) | Root/Manage survival, actual Chrome callbacks, ID/route validation, reordering is not atomic, cross-provider composer coupling to eliminate |
| **CURRENT / Migration** | [storage-and-migration/README.md](storage-and-migration/README.md) | Existing transactional stores and incomplete backup reality; migration silently deduplicates same-path+label records |
| **Providers / Save Receipts** | [providers-and-saves/README.md](providers-and-saves/README.md) | Cloudflare-specific Worker boundary, other-provider independence, R2 permission checks, private URL handling, provider-confirmed save |
| **Time Machine** | [time-machine/README.md](time-machine/README.md) | “Observed” versus “occurred” time, historical coverage, old journal lineage and the limits of restoring metadata versus file bytes |
| **Evidence and tests** | [tests-and-release/README.md](tests-and-release/README.md) | Existing test failures cannot be waved away; baseline, differential fixtures and real-browser verification gates |
| **Consolidated priorities** | [PRIORITY_GAP_LEDGER.md](PRIORITY_GAP_LEDGER.md) | Gap → new proposed owner → acceptance proof → migration hazard |

## Current new-repository prototype contradictions

Read [CURRENT_CLICK2CLOUD_CONFLICTS.md](CURRENT_CLICK2CLOUD_CONFLICTS.md) **before using any existing Click2Cloud `src/core/menu-compiler.mjs` or early README as implementation authority**. The early compiler rejects two distinct same-title/save-path entries, while the latest manager intentionally supports them. This is a current prototype-vs-owner-contract gap, not a regression caused by the archived REDOWN code.

## Source-of-truth hierarchy

1. **LATEST OWNER DECISIONS WIN** over V3 historical UX. They include: Simplified three-tab editor (Simple/Narrow/Depth); *only empty/checked circle* in a plain directory browser; a tiny popup with Simple/Narrow and optional title; independent **Existing Destinations** rename/red-X; multiple exact duplicate path/title aliases with unique IDs; Simple creates/reuses lowercase `redown` after authorized R2 readiness; manual-only rechecking after clearing extras; fully independent Depth graph/journals; independent optional Time Machine.
2. Current Click2Cloud desired contracts: [Destination Manager](../destination_manager/), [Simple](../simple/original_proposition/), [Narrow](../narrow/rewrite_proposition/), [Depth](../assisted_proposal/depth/), [Time Machine](../assisted_proposal/TIME_MACHINE_ARCHITECTURE.md), [independent engine contract](../assisted_proposal/ENGINE_ISOLATION_CONTRACT.md).
3. The source-pinned current V3 code/tests establish **what worked, where the data is, and what could regress**, NOT permission to copy its shared mutable configuration or its old UI.
4. Source-pinned audit observations identify **confirmed source behavior / local synthetic reproduction**, separately from unperformed installed-Chrome and live-provider proofs.

## Labels used in these documents

- **PRESERVE** — source-tested behavior the new engine should continue to satisfy.
- **ADAPT** — useful technique; rebuild behind new ownership/interface.
- **REPLACE** — actual V3 coupling/bug that would violate new owner decisions.
- **OPEN** — missing evidence or an unresolved product/security decision. Do not assume a green test or running integration.
- **INTENTIONAL DIFFERENCE** — owner's newer request supersedes an old V3 projection. Capture a golden-before versus expected-after instead of quietly claiming parity.

## Hard prohibitions

No copy-paste of V3 global `project()`, `resolve()`, or mixed UI/storage writers into more than one new engine. No cross-mode imports, restoration of old “Legacy Right-click”, unsolicited cloud bucket creation, non-consensual R2 activation/charges, or writes to `thanks-cohn/REDOWN`. Source references may contain user-owned sensitive project context; do not copy credentials, private folder data, browser URLs or connection secrets into fixture files.

These are **review and implementation handoff documents**. They do not establish new production behavior. See [priority gap ledger](PRIORITY_GAP_LEDGER.md) before starting Codex work.
