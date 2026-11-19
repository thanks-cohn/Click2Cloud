# Next-Codex — extend ONE existing diagnostic system for Screenshot and browser-reroute transfers

**Owner instruction, November 19, 2026:** **NO colliding, competing, or parallel diagnostic systems.** This document supersedes any wording suggesting a new event collector/recorder. Extend or adapt the **existing Click2Cloud diagnostic/recorder/export architecture** with isolated categories and consistent versioned schemas. The new screenshot and browser-download rule features are not yet implemented on 0.3.20.

## One authoritative system, distinct workflows

- **One existing diagnostic authority and its supported writer/export paths**; add only small feature-specific event adapters to it. No second recorder, second independent writer, second IndexedDB event ledger, independent receipt store, redundant event listeners, competing capless-logging subsystem, or new "history" database.
- Assign explicit namespace/type `right-click-save`, `screenshot-to-cloud`, `browser-download-reroute` and stable unique `operationId` + correlation IDs; never reuse another operation's ID. Different workflows must neither overwrite events nor falsely combine their state.
- Maintain the existing **right-click History and Save Results unchanged**. New transfer summaries belong to the **existing diagnostics subsystem**, not right-click History or bulk ZIP-only receipts. The existing advanced recorder's policies, consent, limits, secure redaction, export format, and failure isolation remain authoritative.
- One `Raw` and one `Secure` **export mode**, each filtered by **scope**: `existing right-click saves` or `new rule-based screenshot/download transfers` (and optionally all). Thus the user can deliver **two compatible ZIPs**, one per workflow scope, without needing two diagnostic engines. Reuse the current archive/export pipeline, consistent schema version and manifest/checksums; no duplicate data or export code paths.
- If the existing diagnostic architecture cannot yet express these categories, extend it narrowly with schema versioning and a compatibility adapter. Investigate the actual source before proposing new modules. Export or diagnostic failures never change successful cloud transfers.

## Cheap evidence for each transfer

Store only **observed** values:
- Operation/capture ID, kind, triggering rule ID/name-at-time or explicit destination choice, filename, extension/MIME, sanitized source hostname/origin, and UTC started/finished/verified timestamps.
- Source/captured bytes, uploaded bytes, observed remote object bytes; intended and observed exact account/provider/bucket/prefix/object key; state, stage, error code; ETag/version/checksum only when measured.
- An explicit comparison field: `match`, `mismatch`, `not_checked`, `unknown` plus evidence method. Matching byte counts alone and ETags are **not** cryptographic proof. Never invent a remote readback.
- Additive screenshot fan-out: one screenshot capture ID, a child result per **distinct authorized destination**. Three matching targets produce three independently inspectable outcomes; if one fails, report partial completion honestly. Deduplicate exact target identity, not distinct rules' intended destinations.

## Advanced diagnostics without heavyweight duplication

The existing advanced diagnostic control may expose **more detailed stages**: rule matching and decision, capture readiness and user gesture, source byte access, permission errors, transfer start/progress byte totals, retries, per-target cloud readback, failures. Prefer counters/summaries over per-byte or full-content records. **No page images, file contents, tokens, cookies, raw signed URLs or secret headers in Secure exports.** Implement redaction using the existing shared sanitizer and test Raw and Secure separately. Retain retention/quota behavior of the current recorder; avoid unbounded records unless its explicit capless forensic mode is enabled by the user.

## Acceptance tests

1. Existing right-click diagnostics and History remain readable and unchanged after new rule-transfer events are recorded.
2. Concurrent right-click save + screenshot + reroute operations generate unique IDs, isolated namespaces, correct count and cross-correlated exact cloud targets, without duplicate listeners/writers.
3. Export `Raw → right-click` and `Secure → right-click`, then `Raw → rule-transfers` and `Secure → rule-transfers` using the SAME exporter; both ZIP scopes are clearly labeled and independently interpretable. The secure outputs contain no secrets. Machine-readable manifests agree with event counts and file hashes.
4. A screenshot that matches three different destinations records one source capture and three per-target outcomes. One failed upload cannot mark the whole capture fully verified.
5. Fail diagnostic storage/write/export, simulate quota/corruption/restart and interleaved operations: the same authorized upload outcomes must result, without new duplicates or false success.
6. No new general-purpose recorder, new parallel event ledger, or unrequested Worker redesign. Report any source-level blockers before claiming implementation.

**Relevant feature handoffs:** [New screenshot rules](SCREENSHOT_TO_CLOUD_CONTEXT_MENU_AND_ADDITIVE_RULES_2026-11-19.md) and [code-audited next run](NEXT_RUN_DEDUPLICATED_CODE_AUDIT_AND_RULES_2026-11-19.md).
