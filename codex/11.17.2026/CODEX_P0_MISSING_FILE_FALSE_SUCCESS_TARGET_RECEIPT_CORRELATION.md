# CODEX P0 — Missing file after reported save success: prove target/receipt/notification integrity

**Issue:** https://github.com/thanks-cohn/Click2Cloud/issues/17  
**Related issue:** https://github.com/thanks-cohn/Click2Cloud/issues/16  
**Read first:** [START HERE](../11.16.2026/START_HERE_SIMPLE_DESTINATION_REDOWN_REFERENCE.md), [Nov 17 status chronology](OWNER_LIVE_TEST_LOGIN_PREPARE_REPAIR_SOURCE_FAILURE.md), [delayed native ACK](OWNER_DELAYED_NATIVE_APPLY_INCOMPLETE_AFTER_PREPARE.md).  
**Status:** New P0 owner-reported **baseline** incident. Investigation authorized by existing Codex handoff; Phase 2 edits still held for owner review. No RAW archive from this incident is currently committed or provided.

## Critical user-visible observation

The owner returned to a Shelf with `NATIVE_APPLY_INCOMPLETE`, subsequently saw "Reconnect Cloudflare or review access in Remotes" while Remotes showed **Sign out**, later received a **success notification**, inspected the **configured save location** and did **not** find the file. Most recent notification said: "The remote source could not be read. No verified save was reported."

This is a **potential false verified-save claim, wrong destination, or cross-operation/stale-status confusion**. **Do not claim R2 verification is defective without proof**. No same-operation mapping is yet available, so investigate all mechanisms separately and rank evidence by confidence.

## Source-backed audit starting points — GitHub main as inspected November 17

1. `extension/app.mjs` `chrome.runtime.onMessage` `remote-result` handler: for `result.state==='verified'`, calls `inspectRemoteReceipt({operationId})`, requires `reconciliation?.state==='verified'`, refreshes the Explorer listing only if its current `source` matches receipt destination, and displays "Saved and independently verified." It **does not visibly compare** receipt destination against an independently captured user-intended clicked-menu target in this UI branch. Prove whether transport/protocol invariants guarantee this upstream; explicitly test mismatches.
2. The same handler accepts asynchronous `remote-result` messages; there is no obvious global ordering correlation preventing an old verified event A from changing the status seen during new failure B. Trace the actual messaging model and avoid a false claim without a reproducible case.
3. `src/api/service.mjs::openRemoteResult` retrieves saved verified receipt, performs provider `fileApi.run('stat', ...)` and compares size/ETag to the saved receipt; this is a key forensic path. `GO TO` should be checked **against both the receipt target and the user's selected destination**. A file existing elsewhere does not satisfy correct-target acceptance.
4. `src/cloudflare/transport.mjs` generates an exact `remoteDestination(target)` for attempts and calls `/verify`; `src/cloudflare/onboarding.mjs` stores `record(out)` and returns completed on a verified result. Trace all joins from clicked row through `targetKey`, Worker grant `destination`, receipt destination/key and historical persisted record `src/persistence/current-store.mjs::recordRemoteResult`. Test destination contamination, account/bucket/prefix collision, wrong current Default, plan mix-up, and stale generation.
5. `src/chrome/registrar.mjs` and `src/api/service.mjs::nativeReadiness`: account for late `NATIVE_APPLY_INCOMPLETE` maintenance outcomes without interpreting them as the last save attempt's failure.
6. The connected/Sign out Shelf indicator is OAuth session state, not proof of complete per-target Worker auth and save readiness. Show precise scope or plan deficiencies alongside session connection, without contradiction.
7. `src/cloudflare/transport.mjs` and `src/core/engine.mjs` must preserve independent receipt and status code semantics; source-read failure after a prior verified operation must not rewrite prior history.

## Phase 1 investigation required BEFORE any corrective production write

**A. Freeze baseline and protect records.** Record current branch/commit, user installed version/build if available, and working `redown` backup tag. Save read-only exports of CURRENT, history, receipts, approvals, native registration and privacy-safe diagnostics. No destructive storage reset or Cloudflare action. Do not publish raw user identifiers, source/page URLs, OAuth tokens, cookies or object contents to a public repo.

**B. Build operation-correlated evidence timeline** covering selected native item ID/acknowledged generation, saved destination ID, exact requested normalized target, selected Simple/Default, worker plan and account, source, transport operationId, `recordRemoteResult`, `remote-result` notification, `inspectRemoteReceipt` reconciled receipt, `GO TO`, fileApi.stat, list cache/refresh, native maintenance event and visible banner. Retain safe fingerprints/timestamps and a test nonce; log actual account/bucket/prefix in private artifacts only. Distinguish a new click from an old delayed event.

**C. Deterministic wrong-target test.** Configure two different buckets (one `redown`, one owner-approved test bucket) plus two sibling prefixes and a Default. For a unique, innocuous test object, right-click distinct rows and change Default, and assert byte-exact location and key under each requested target. Deliberately inject incorrect receipt.destination, mismatched key/prefix, wrong account and stale generation in mocks: no "verified" UI, no increment to success count. Test a real target change between initiation and receipt arrival. Do not auto-copy an object's contents back from a wrong target without owner consent.

**D. Asynchronous notification test.** Concurrent/interleaved operations A verified, B source denied, C native apply partial, D session-connected-but-scope-blocked. Permute event timing and service-worker restarts. Ensure notifications are per-operation with timestamps, operation IDs, exact status and stable history; the last verified save does not masquerade as success of the latest click, and a late source error cannot undo valid older successes. Distinguish a generic status summary from a specific save confirmation.

**E. Source-read and forensics separation.** Reproduce source fetch ON/OFF for bounded/unlimited rich recording (only with consent). Source unreadable means no verified result for that operation. Validate source URL redaction/privacy. Forensic enablement must never mutate target, permissions, Worker readiness or verification behavior.

**F. Actionable remediation design** (propose, don't implement Phase 2 yet): exact-target receipt binding; durable immutable operation history; operation-correlated toast/UI; robust GO TO and authoritative status refresh; recheck Worker vs OAuth vs menu separately. Preserve local saved state and prior proof.

## Explicit release gate

A P0 "reported success with missing file" incident remains **OPEN** until one of these is evidenced:
- The file is found at the intended target and the report was caused by a reproducible stale listing/notification bug, which is fixed.
- A valid verified receipt exists but routes elsewhere, and wrong-target routing is fixed with missing-or-wrong-target being rejected.
- A success UI came from another operation, and event correlation is repaired.
- Actual independent verification is flawed, and receipt verification/protocol is repaired.

**Acceptance is not** merely "the new image later saved" or "the extension said independently verified." Verify selected account/bucket/prefix/key via provider after allowed, check version/size/etag as available, and present a repeatable Windows Chrome installed test. Stop if no authoritative evidence. No modification to REDOWN, no false pass, no global suppression of errors, no merge/release without owner validation.
