# Legacy verification corpus: preserve evidence, not just happy-path unit tests

**Original forensic audit:** [V3+1 audit entry](https://github.com/thanks-cohn/REDOWN/blob/94a1a5f0699eec904d989a3823d22f9bf2bd131d/FOREVER_WORKS/v3-plus-one-master-audit/00_START_HERE.md), [gap ledger](https://github.com/thanks-cohn/REDOWN/blob/94a1a5f0699eec904d989a3823d22f9bf2bd131d/FOREVER_WORKS/v3-plus-one-master-audit/09_CURRENT_VS_VISION_GAP_LEDGER.md), [failure/verification matrix](https://github.com/thanks-cohn/REDOWN/blob/94a1a5f0699eec904d989a3823d22f9bf2bd131d/FOREVER_WORKS/v3-plus-one-master-audit/08_RELIABILITY_FOREVER_WORKS_AND_REGRESSION.md). **Current source tests:** [V3 tests](https://github.com/thanks-cohn/REDOWN/blob/5041b5763541812c505c9cde6e8f79cb23a7b193/tests/right-click-v3.test.mjs).

## What was actually verified, as of pinned audit

The audit recorded **1001 tests, 904 passed, 97 failed** across its full suite; focused suite **125 tests, 109 passed, 16 failed**. This is a **historical test report on the audit's own pinned baseline**, not a new test run or a claim that current REDOWN main fails identically. Several failures are known sliced-VM/harness assumptions, some are unclassified/current product obligations. A green Click2Cloud reference-model CI does not retroactively validate original REDOWN nor prove installed Chrome parity.

## Source-backed categories to recreate as differential tests

| Category | Critical fixture |
|---|---|
| Simple | No ready root, one redown root, >1 accounts with redown, activated other buckets, extra aliases, old root suppression, Home save vs Go Home navigation |
| Narrow | Parent selected and child selected (`:send`), synthetic-only ancestor, same-path two aliases, identical labels, independently linked disabled child, exact Unicode and case, root alias |
| Depth | 1/2/3/5/10 menu, 16-level index, 500/5000/80-page budget **per slice** rather than lifetime, fair multiple buckets, pages, marker-only prefixes, prior graph retained across partial |
| Picker | Cold root arrow request, no Browse prerequisite, local cached page, empty/error/partial, stale response after account swap, keyboard+typeahead, focus/scroll under async edits |
| Native registry | Parent-before-child; unique IDs and leaf routing; installed submenu flips; callback loss/update-create failure; order recreation; root/Manage unaffected; provider import fault |
| Storage/migration | Daily/Weekly/Off on-use semantics; IDB abort; mirrored writer bypass; old `parentId` and duplicate labels migration; multi-window stale revisions; restore after deletion |
| Provider transfer | No false success/counter on setup, pending or failure; actual verified receipt; uncertain write retry; exact byte/filename privacy; independent provider failure |
| Time Machine | As-of before/after a move, duplicate identical bytes ≠ same identity, old journal retained after compaction, firstSeen vs actualCreatedAt, retention/deletion |

## Test classification is mandatory

- **Source-confirmed** — implementation/dependency exists in pinned files.
- **Local-reproduced** — synthetic V3 function/DOM fixture passed or failed, with actual code and inputs.
- **Unit-ref-proven** — new isolated Click2Cloud reference-model test passed; not installed extension.
- **Installed-Chrome-observed** — exact native menu registration, UI, click route, service worker lifecycle observed in approved Chrome.
- **Live-provider-verified** — authorized test-provider API replies/write/readback/metadata verified against actual cloud storage.
- **Unknown/blocked** — not actually checked; no fictional success.

## Gate before transplanting into REDOWN

1. Compare exact source SHA, legacy fixtures and expected new behavior; document intentional differences rather than falsifying goldens.
2. Run unit tests for each mode plus neutral picker/registry, no cross-import lint/static dependency check.
3. Fault-inject two tabs, lost native callback, Chrome worker suspension, IDB write failure, stale provider response, R2 auth loss and partial listing.
4. Verify physical menu hierarchy, route and execution using installed Chrome; check Chrome item budgets and native parent/leaf transitions.
5. With separate explicit authorization, use disposable private buckets/test prefixes to exercise R2 listings, creation/reuse, exact saved key/bytes/readback and cleanup.
6. Preserve prior REDOWN state/config backups; log migration report (including duplicates) and rollback route. No edit to production main or live cloud scope without approval.

Relevant original fixtures are indexed in [audit evidence](https://github.com/thanks-cohn/REDOWN/blob/94a1a5f0699eec904d989a3823d22f9bf2bd131d/FOREVER_WORKS/v3-plus-one-master-audit/evidence/INDEX.md). Do not silently rewrite failing expectations or old frozen evidence hashes. **A new test that passed in Click2Cloud covers only what that test actually exercises.**

## Important new-repository negative golden

The early Click2Cloud compiler's test expects **sibling label collisions** to be rejected, and its Narrow prototype maps one action to one path. Those were valid earlier prototype assertions but conflict with the owner's later explicit requirement for *two identical labels and paths with distinct IDs*. Do not silently waive this: retain old test as a version-pinned historical behavior, write **new expected behavior** tests in the independent mode compiler, and ensure the exact two distinct native IDs and saves in an installed Chrome run. See [current conflicts](../CURRENT_CLICK2CLOUD_CONFLICTS.md).
