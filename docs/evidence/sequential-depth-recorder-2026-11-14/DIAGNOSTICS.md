# Depth fixture diagnostic change — incident remains unresolved

This is test-only evidence capture, not a fix for the owner's Windows TypeError.
Production `src/`, `extension/` and the remote-save module are unchanged.

The original fixture catches errors from three different operations together:
`mf.ready`, `mf.dispatchFetch`, and the opt-in `response.clone().json()` trace read.
It retains only `error.name`. The supplied main-branch evidence therefore cannot
identify which of these operations threw, the underlying error cause, or its stack.

The new wrapper identifies those boundaries separately, records bounded allowlisted
error names/codes/message classes and known module/line locations, and preserves
the same thrown error, request options and single dispatch attempt. Fixture lifecycle,
in-flight count, request ordinal, loopback/protocol classification and origin change
are recorded without serializing the origin. Exception text, headers, tokens and
private paths are excluded. Unrecognized information stays UNCLASSIFIED/unavailable.
No authorization, expiry, verification, retry, native generation or save assertion
is relaxed. Trace-off never clones or consumes the response.

Reproduce the **diagnostic gap only**, using a synthetic `UND_ERR_SOCKET` cause:

```
node docs/evidence/sequential-depth-recorder-2026-11-14/check-capture.mjs before
node docs/evidence/sequential-depth-recorder-2026-11-14/check-capture.mjs after
```

Expected exits are 1 then 0. `before` executes the exact fetch wrapper extracted
from implementation base `098ae67`; `after` executes the new wrapper. Both preserve
the exact synthetic exception. The captured socket code is deliberately injected;
it is **not an observed cause of the owner's Windows failure**. The four dedicated
tests cover privacy, bounded causes/Windows module paths, lifecycle/single-attempt
preservation, ready versus trace-read distinction, and the trace-off control.

`node scripts/diagnose-depth-fixture.mjs` runs six independent serial isolated
Depth processes (OFF/BASIC/EXPANSIVE twice), then two complete focused suites.
It writes fresh uniquely named local evidence under `work/`, preserves failed
runs, and fails overall on any nonzero exit, missing test counts or missing trace.
It does not install an extension or touch a browser profile, CURRENT or live R2.

See REPORT.md for the actual execution results and the unmet Phase 1 gate.
