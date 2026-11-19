# P1 CRITICAL — New Simple destinations cannot save after Default/only-choice changes

**Owner report:** November 16, 2026. **State:** OPEN; no code fix or installed-Chrome acceptance.  
**Tracker:** https://github.com/thanks-cohn/Click2Cloud/issues/16  
**Affected snapshot:** Click2Cloud 0.3.19, commit `e188dc7f86b522207226bf30f8f6c25fec2a0a1e`.  
**Codex entrypoint:** [START HERE](../../codex/11.16.2026/START_HERE_SIMPLE_DESTINATION_REDOWN_REFERENCE.md).

## Reproduction, as reported by the owner

1. Sign into Cloudflare in Click2Cloud and right-click save to its original `redown` bucket — **works**.
2. Create a second Simple destination and right-click save to it — **fails**.
3. Make the second destination Default — **still fails**.
4. Leave that second destination as both the **only** Simple choice and Default — **still fails**.

This is a user-reproduced failure. Do not infer the new destination's exact bucket/prefix or a specific causal branch from the reported UI sequence alone.

## Available diagnostic evidence (not a complete trace)

ZIP filename: `Click2Cloud-RAW-fca3ee81-0b38-4170-a45e-0163006bcc6f.zip`, supplied in the owner's ChatGPT conversation; **not committed to this public repository** because RAW exports may contain source context. The manifest says 12/12 BASIC attempts exported without missing committed ranges. `full-events.jsonl` is empty.

| Outcome | Count | Sequences |
| --- | ---: | --- |
| Independently verified `R2_HEAD_VERSION_SIZE` | 4 | 2, 3, 6, 8 |
| Blocked `WORKER_SETUP_REQUIRED` | 7 | 4, 5, 7, 9, 10, 11, 12 |
| Blocked `SOURCE_DENIED` | 1 | 1 |

All twelve records were `providerId=cloudflare`, `mode=simple`; failures and successes interleaved at the same native menu generation. Records do **not** include a correlatable selected destination, bucket or prefix. Separate the unrelated source error. A diagnostic snapshot being `COMPLETE` does not prove live/provider completeness.

## REDOWN as user's production-proven behavioral reference

The owner reports performing **more than 1,000 downloads with REDOWN**, signing out/in many times, and experiencing reliable right-click saves. This is the owner's operational experience, **not a claim that the ZIP or current REDOWN source has independently audited those 1,000+ saves**. The objective is to reproduce that seamless behavior in Click2Cloud while keeping Click2Cloud's API-first engine and stricter verified-save protections.

REDOWN source starting points: `extension/right-click-v3.js` (`prepared`, `eligible`, `simpleTargets`, `resolve`), `extension/right-click-current.js`, `extension/background.js`. In the reviewed V3, `prepared` requires a matching activated account/bucket profile and Worker URL/token before a destination is eligible. Compare this with Click2Cloud's separate per-bucket transport plan and readiness checks; **this difference is a hypothesis to investigate, not proof of the root cause**.

## Correct outcome

- Newly created Simple bucket/folder targets become usable through explicit, actionable exact-target preparation/recovery, respecting already-granted durable consent and any genuinely necessary new approval.
- User can log out/in or reconnect repeatedly without losing destination configuration/Default, being forced through redundant setup, or silently falling back to `redown`.
- Original `redown` remains working. All selected saves land in the exact account/bucket/prefix and count only after authoritative provider verification.
- Off-nominal states are intelligible: not configured, not activated, not authorized, Worker setup required, scope rejected, wrong account, stale native generation, source denied and write uncertain should not be conflated.
- No production Cloudflare mutation, code merge, tag, or release based on this defect document.

**Full instructions:** [Phase 1 cross-repo study](../../codex/11.16.2026/CODEX_P1_SIMPLE_DESTINATION_REDOWN_CROSS_REPO_PHASE1.md) → [evidence and owner benchmark](../../codex/11.16.2026/DIAGNOSTIC_EVIDENCE_AND_REDOWN_ACCEPTANCE.md) → [held Phase 2 repair](../../codex/11.16.2026/CODEX_PHASE2_SIMPLE_DESTINATION_REPAIR_HELD_FOR_APPROVAL.md).
