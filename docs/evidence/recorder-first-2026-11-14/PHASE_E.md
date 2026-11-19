# Phase E — Windows Depth investigated last; remains unresolved

After independently completing A–D, the original local Depth test ran freshly in
OFF/BASIC/EXPANSIVE, 4/4 in each, Node v24.22.1 Linux x64. Each recorded 87 fixture
requests and no request.error. Eight verified local saves and the intended
FRESH_CLICK_REQUIRED recovery control survived per run. New safe fixture boundary/
cause/lifecycle capture remains intact. No failure was reproduced from which to
establish the Windows TypeError mechanism or a justified root-cause patch.

Actual Windows execution is unavailable in this environment. The HTTP browser
harness activation fence is a different lifecycle and is not evidence of the
Windows Miniflare /capabilities cause. No authorization, generation, expiry,
readback or no-replay rule was bypassed, and no speculative production auth fix
was made. UNRESOLVED — WINDOWS OWNER TEST REQUIRED. Recorder repairs are retained.

From a separate checkout of this new review branch, with Node >=22 (prefer owner
Node 24.21.0) and Python 3 available as python, CMD:

```
python --version && npm ci --no-audit --no-fund && node scripts/diagnose-depth-fixture.mjs
```

The existing runner preserves every six serial isolated + two focused result and
safe trace. Keep the first failing request.error boundary/error cause/module frames.
Passing Linux runs, or a later passing Windows retry, do not explain the incident.
