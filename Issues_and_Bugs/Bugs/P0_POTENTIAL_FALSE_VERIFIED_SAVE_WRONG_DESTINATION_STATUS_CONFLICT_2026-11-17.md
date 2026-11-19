# P0 / release-blocking — Apparent save success, file absent from intended Cloudflare target

**Date:** 2026-11-17. **Owner report**; additional baseline testing, *before* prior Codex repair instructions were submitted.  
**Issue:** https://github.com/thanks-cohn/Click2Cloud/issues/17  
**Related:** [Issue #16](https://github.com/thanks-cohn/Click2Cloud/issues/16), [Nov 17 delayed native ACK field report](../../codex/11.17.2026/OWNER_DELAYED_NATIVE_APPLY_INCOMPLETE_AFTER_PREPARE.md), [full P0 Codex evidence plan](../../codex/11.17.2026/CODEX_P0_MISSING_FILE_FALSE_SUCCESS_TARGET_RECEIPT_CORRELATION.md).

## Owner-observed new sequence

Following earlier `SERVICE_UNAVAILABLE`, `REPAIR_REQUIRED`, manual `Prepared and verified`, intermittent apparent verified save and a delayed `NATIVE_APPLY_INCOMPLETE`, the owner reported:

> "Reconnect Cloudflare or review access in Remotes."

Remotes showed **Sign out**, not Sign in, i.e. the visible session appeared connected. Later, Click2Cloud **said the save worked**; the owner checked the **selected configured destination** and reported that the file **wasn't there**. Latest notification:

> "The remote source could not be read. No verified save was reported."

The earlier persistent/late banner had said:

> "Not saved · NATIVE_APPLY_INCOMPLETE · Cloudflare is prepared, but Chrome did not acknowledge the menu. Reload the existing extension and log in again; saved destinations remain."

**What is confirmed:** User observed success messaging without locating the file where it was requested, plus contradictory session/readiness/source status messages.

**Not confirmed:** Whether any provider write for the disputed operation actually happened; whether file exists in another bucket/prefix; whether the apparent success refers to an earlier operation; whether the UI listing was stale; whether an authenticated session was actually authorized for save; whether the newer source error was the same attempted image; whether the receipt proof is wrong. No operation-specific export was supplied, so do not claim the underlying R2 verifier is broken.

## Why P0

The risk is **untrustworthy success reporting and possible wrong-destination writes**. The user may rely on Click2Cloud for data preservation. Correctly blocked failures are tolerable; a positive save claim while the intended target lacks the file is a release blocker until traced and disproven or corrected.

**Immediate owner safety:** Pause important saves; preserve extension storage, history/receipts and diagnostics. Do not reinstall, reset, or delete profile data as a first step.

## Required Codex remedy, after confirming cause

- Bind source action → clicked native menu row → immutable selected target (account/bucket/prefix) → transport grant and remote attempt → provider receipt (object key, size, ETag/version if present) → independently checked object at the **same destination and operation** → history/notification.
- Success must be **per-operation and per-target**, not a global latest-green label. Delay/order of unrelated native maintenance, auth warnings and source errors must not change historical verified outcomes.
- **No silent fallback to `redown` or another configured bucket**; no success counter increments for an unverified or mis-targeted result.
- Split OAuth connected vs requested permissions vs Worker readiness vs native Chrome menu acknowledgment vs source readability. A **Sign out** button can correctly signify an OAuth session even when a scoped operation needs reauthorization; the UI must explain the actual difference instead of generic contradictory instructions.
- Inspect with exact `inspectRemoteReceipt`, `openRemoteResult` and `stat` for matching operation. Protect privacy: opaque target fingerprints/IDs, no public raw URLs/credentials.
- Compare with REDOWN's reliable read-only reference behavior. Keep Click2Cloud's own API-first architecture, CURRENT provenance, durable save locations/approval, no unapproved Worker or billable changes.

**Acceptance:** Successfully saved file appears in exactly selected target and `GO TO` opens it. Failed or uncertain cases never display verified. Results are stable across concurrent/interleaved attempts, idle return, MV3 restarts and native registration; full Chrome/Cloudflare live checks after owner authorization, not fixtures alone.

No application code has been changed as part of this report.
