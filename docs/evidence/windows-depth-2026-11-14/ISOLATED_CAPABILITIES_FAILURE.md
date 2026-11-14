# Windows Depth: confirmed local /capabilities fetch TypeError (2026-11-14)

**Status:** Proximal failure established; underlying TypeError cause not yet established; NO FIX CLAIMED.

**Source:** Six user-uploaded depth-plan-recovery*.json traces plus isolated/full test logs and summary.json, captured on Windows (win32), Node v24.21.0, using fix/mv3-recorder-suite-reliability checkout. Branch tip last verified 098ae67c76b00d664388c1e89b925ee00a1c0036; exact local HEAD not separately captured. The local test runs Miniflare/workerd with fixture R2, **not live Cloudflare**. Full 80–128 KB per-run traces are held by the owner locally and in ChatGPT attachments; this is a sanitized, bounded extract, not a public dump of the complete originals.

## Outcome and trace mapping

| Uploaded trace | Execution | Recorder | Trace events | Click samples | Unexpected failure |
| --- | --- | --- | ---: | ---: | --- |
| depth-plan-recovery.json | full-1 | OFF | 656 | 9 | none; 392/392 suite PASS |
| depth-plan-recovery(1).json | full-2 | BASIC | 656 | 9 | none; 392/392 suite PASS |
| depth-plan-recovery(2).json | full-3 | EXPANSIVE | 656 | 9 | none; 392/392 suite PASS |
| depth-plan-recovery(3).json | isolated-1 | OFF | 472 | 6 | uncertain / AUTHORIZATION_LOST |
| depth-plan-recovery(4).json | isolated-2 | BASIC | 437 | 6 | blocked / SCOPE_UNAUTHORIZED |
| depth-plan-recovery(5).json | isolated-3 | EXPANSIVE | 472 | 6 | uncertain / AUTHORIZATION_LOST |

Each full trace records eight completed saves, one deliberately blocked FRESH_CLICK_REQUIRED recovery click, 87 successful request endings, and **zero** request.error events. Each isolated trace records four completed saves, the intended FRESH_CLICK_REQUIRED click, and **one** unexpected failed save / **one TypeError** on a local /capabilities request. The isolated files correspond to individual 3/4 tests; complete suites independently passed 392/392 three times.

## Precise failing chain from uploaded events

**Isolated OFF (trace sequences #447–470):**

- #447–448 /remote-save -> HTTP 202 pending / REMOTE_ACCEPTED
- #449 current desired=3, applied=3; #450 ACK=3, pending=0
- #452 /capabilities HTTP 200 -> #453 authorization READY
- #455 /operation HTTP 200 verified / R2_HEAD_VERSION_SIZE
- #459 /verify HTTP 200 completed
- #462 current desired=3, applied=3; #463 ACK=3, pending=0
- #464 /capabilities begins; bearer capability expiry roughly 119999 ms; sessionEqual=true
- **#465 /capabilities request.error: TypeError**
- #466 authorization blocked / TRANSPORT_UNAVAILABLE (sessionEqual=true)
- #467 engine auth check blocked; #468 transport.record uncertain / AUTHORIZATION_LOST; #470 click.end uncertain

**Isolated EXPANSIVE (#447–470):** Same sequence class and failure at #465 TypeError. Earlier /operation is independently fixture-verified with R2_HEAD_VERSION_SIZE and /verify returns completed. Generation stays desired=3/applied=3/ACK=3 and pending=0; remaining token life about 120000 ms. #466 TRANSPORT_UNAVAILABLE -> #468 AUTHORIZATION_LOST -> #470 uncertain.

**Isolated BASIC (failure occurs earlier at #419–435):**

- #419 dispatch.enter: generation=3, desired=3, applied=3, ACK=3, pending=0
- #422 /capabilities begins, expiry ~119999 ms, sessionEqual=true
- **#423 /capabilities request.error: TypeError**
- #424 authorization blocked / TRANSPORT_UNAVAILABLE
- #425 fixture engine.auth.check says AUTH_VERIFIED because sessionId still exists, but authorizedTargets is empty
- #427 resolver blocked / SCOPE_UNAUTHORIZED; #435 click.end blocked / SCOPE_UNAUTHORIZED
- The blocked click did **not** dispatch /remote-save.

**Conclusions supported:** The first observable causal fault is a thrown **TypeError from the local fixture fetch on /capabilities**, not an observed token expiry, session replacement, or stale menu generation. Safety-conservative uncertain/blocked outcomes are appropriate once reauthorization cannot be established. Exactly **why** that fixture request throws remains unknown and is the next small root-cause investigation. No assertion of a production security defect or user Cloudflare outage is warranted.

## Precise code areas

- tests/depth-plan-recovery.test.mjs:56: fixture fetch wrapper calls worker.mf.dispatchFetch((await worker.mf.ready).origin + parsed.pathname, options), and currently retains only error.name on throw. A causal safe classification/stack at this boundary is needed.
- tests/depth-plan-recovery.test.mjs:68: fixture auth uses transport.status(target); any status other than READY becomes empty authorizedTargets, hence SCOPE_UNAUTHORIZED on transient transport failure.
- src/cloudflare/transport.mjs:18–25: thrown fetch becomes TRANSPORT_UNAVAILABLE; recheck returns false on failure. At lines 36–49 the save's repeated authorization gates then give AUTHORIZATION_LOST if recheck fails.
- tests/final-focused.mjs:1–65 imports many other test modules before Depth; isolated Depth loads only itself. Test-order/fixture lifecycle differences are leads, **not proven causes**.

## Requested minimal next step

Reproduce the isolated case on actual Windows, safely capture the TypeError origin and fixture lifecycle, establish its actual root, and fix the narrow culpable layer. A mere green rerun on Linux is not a repair. Do not change production authorization safety, turn uncertain into verified, retry writes blindly, delete/skip original assertions, or change unrelated forensic recorder export/classification behavior. The original test's exact Depth B and preserved Narrow/Simple A checks are required. No code, production resources, Base 0.1 tags, or active Chrome installation were modified by this evidence record.
