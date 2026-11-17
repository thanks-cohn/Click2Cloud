# November 17 live owner test — login-ready expectation violated, manual prepare succeeds, next click still reports REPAIR_REQUIRED

**Scope:** OPEN additional evidence for [Click2Cloud Issue #16](https://github.com/thanks-cohn/Click2Cloud/issues/16).  
**Owner-observed time:** approximately 10:30 AM CST (America/Chicago), November 17, 2026.  
**Source:** owner first-person Windows/Chrome test report in ChatGPT. This is a field report, **not a Codex build test or a newly supplied diagnostic archive**. The owner explicitly says **they had NOT yet fed the prior Codex repair request into Codex** and were continuing baseline testing.

## 1. Exact user chronology

1. Owner tried to save an item using Click2Cloud. An initial message appeared and **disappeared before they could read or retain it**. Do not invent the message's text.
2. The Shelf showed: **"Not saved · SERVICE_UNAVAILABLE · Inspect or prepare the selected destination below."**
3. Owner tried again. The Shelf showed: **"Not saved · REPAIR_REQUIRED · This destination needs its private save connection prepared or repaired."**
4. Owner clicked **"Inspect / prepare selected destination"**.
5. Click2Cloud displayed the previously saved target, here recorded in a privacy-minimized form as `[connected Cloudflare account] · new-6/2d/`. The owner observed: **"Prepared and verified · make a new right-click to save."**
6. Owner attempted to save the image again. They first saw **"Not saved · REPAIR_REQUIRED · This destination needs its private save connection prepared or repaired."**, then the same overall attempt sequence eventually ended with **"Saved and independently verified."** It is **not yet proven** whether these two statuses represent one click, overlapping asynchronous messages, or distinct operations; correlate operation IDs before interpreting.
7. Later, the owner selected **unlimited rich events recording** and clicked **"Start expansive forensic recording"**. They then saw: **"The remote source could not be read. No verified save was reported."**
8. The owner notes the native experience fell short of REDOWN: "you simply logged in and it was ready." They report >1,000 historical REDOWN saves and repeated logouts/logins without equivalent setup friction.

## 2. What is proven, and what is not

**Proven from firsthand UI observation:** saved custom destination survived; manual inspection/preparation could produce `Prepared and verified`; repeated save attempts produced `SERVICE_UNAVAILABLE` then `REPAIR_REQUIRED`; at least one later save produced `Saved and independently verified`; an additional source-read failure was seen after recording was enabled.

**Not proven without a new export:** root cause of `SERVICE_UNAVAILABLE`; whether after preparing the target the Worker stayed READY throughout a subsequent native click; whether the repair banner was stale from an earlier operation; whether the "independently verified" receipt corresponds to the precise target and original image; whether forensic recording caused a source-fetch failure; whether installed build exactly matches current GitHub `main`.

**Privacy:** do not republish owner account email, raw source URLs, OAuth credentials, page metadata or the RAW ZIP in this public repo. Use opaque target fingerprints and operation IDs. Original target's visible suffix `new-6/2d/` is sufficient for this symptom report.

## 3. Current source audit leads (read latest source again)

These statements are based on GitHub `main` inspected November 17, **not yet verified as the user's installed build**:

- `src/api/service.mjs`: the `loginBegin` path (when not `verifyOnly` and it returns `CONNECTED`) **intends** to call `cloudflare.initialize({authorizeSetup:true,resume:true})` and then `finishInitialization`; login itself remains successful on preparation failure, with an `initialization` result. This is stronger evidence than an assumption that Click2Cloud has no automatic preparation at all. **Determine why it did not achieve the owner's result.**
- `src/cloudflare/onboarding.mjs`: `initializeAccount` chooses the persisted Default or sole configured target; `checkFresh` returns `REPAIR_REQUIRED` if `transport.status(target)` is not READY. `invoke` checks readiness and, if not READY, surfaces attention and requires a fresh gesture after preparation. This supports the observed extra-step UX.
- `extension/background.mjs`: `remoteReady(target)` caches readiness by exact target for up to 10 seconds and clears snapshots on explicit `markVerified`. Investigate races/invalidation, native generation timing, and any mismatch between readiness checked for account/bucket root versus selected folder target. **Do not assert cache staleness as proven.**
- `src/cloudflare/transport.mjs`: exact per-bucket plans and Worker scope are required; `status` considers same-bucket verified proofs reusable for descendant prefixes when capability scope permits. Confirm whether this specific `new-6/2d/` target was a different bucket, an alternate folder prefix, or both. Prefix interpretation must not be assumed from a display label.
- Existing service API provides `initializeCloudflare`, `inspectCloudflare`, `checkCloudflareR2`, `repairCloudflareDestination`, etc. Canonical service ownership, persisted setup approval and actual issued Cloudflare authority MUST stay intact.

## 4. Additional Phase 1 experiments (REQUIRED)

1. Record installed extension version/build and **per-click** operationId, event time, source error class, selected target fingerprint, registered native generation, readiness value, Worker plan bucket/account/scope fingerprint, UI message origin and sequence.
2. For each login route (**first login, relogin with existing token, reconnection, user already CONNECTED, loginStatus/verifyOnly**), identify whether preparation actually runs, how results/attention are displayed, and why a known saved destination remains blocked. A reconnect event must never silently pretend to provision new resources, but existing ready plans should be reverified/reused with durable approval.
3. Trace why manual **Inspect / prepare selected destination** can reach "Prepared and verified" while one or more subsequent right-click attempts still show `REPAIR_REQUIRED`. Differentiate stale banner vs new blocked operation, stale menu generation, target mismatch, Worker capability propagation, cache scope or failed authorization. No guessing from same-screen text.
4. Inspect ephemeral popup/banner lifecycle. Every failed operation should have a **durable, visible, operation-correlated explanation and action** until dismissed/replaced by a newer result; no mysterious disappearing error.
5. Separately reproduce source fetch with rich recorder **OFF**, then **ON (bounded)**, then **ON (unlimited)** against the **same public source URL** and target, with explicit user permission. Compare actual source-fetch network/error/code/bytes, recorder overhead and extension worker lifetime. Do not turn on unlimited captures by default, send source URLs to providers or weaken network source restrictions.
6. Test a ready `redown` bucket, a different fresh bucket, and a new folder/prefix in an already-ready bucket. Repeat through logout/login and service-worker restart while preserving stable configuration.
7. The owner has not submitted the previous Codex instruction, so **do not treat this as a failed repair or regression from Codex changes**.

## 5. Acceptance addition

- **Ready on authorized login:** For known previously prepared locations with valid live grants and saved consent, verify exact target readiness/reconcile native menu during normal explicit login so the FIRST later right-click saves without a manual prepare detour. Preserve successful OAuth independently of setup failures and show a durable actionable reason if a real blocker exists.
- **New destination:** When created/configured, proactively surface exact-bucket status and required one-time setup through the canonical API rather than making the user discover failure by clicking Save. Never perform new billable/create operation without actual consent.
- **Post-prepare:** After `Prepared and verified`, the next fresh native click should either successfully independently verify the exact target or show a **new operation-specific** legitimate blocker. Clear/replace stale error state and recheck authoritative readiness.
- **Reliable messaging:** Do not show a stale `REPAIR_REQUIRED` as if it applies to a newly verified save. A verified save must refer to an actual provider receipt.
- **Recorder independence:** Starting rich/unlimited recording must not change source fetch, permissions, provider destination, or success semantics. If source fetch fails for an unrelated reason, emit clear evidence; avoid asserting causation from chronology.

No code is changed or claimed fixed by this document. This augments the first-phase [cross-repository comparison](../11.16.2026/CODEX_P1_SIMPLE_DESTINATION_REDOWN_CROSS_REPO_PHASE1.md), [original diagnostic snapshot](../11.16.2026/DIAGNOSTIC_EVIDENCE_AND_REDOWN_ACCEPTANCE.md), and the [held Phase 2 implementation request](../11.16.2026/CODEX_PHASE2_SIMPLE_DESTINATION_REPAIR_HELD_FOR_APPROVAL.md).
