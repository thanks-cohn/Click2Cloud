# Phase C — observed measurements and recovery

Baseline 0/2: available transport timings were omitted from Basic; rich events
replaced source UTC/monotonic timestamps; cross-epoch N/A reasons were flattened.
The patch preserves supplied timestamps/epochs, maps actual dispatch preparation,
intent authorization, capability, authorization rechecks, Worker request envelope,
verification, transport lifetime, completion and end-to-end spans, and exports
correlation IDs/generation with typed SECURE projection. It never interprets a
true-remote request envelope as upload duration/throughput. Source acquisition
and upload measurements stay not_applicable on that path; missing, interrupted,
cross_epoch and redacted stay distinct. Failed History handoff retains already
observed receipt/timings while remaining partial/unverified.

Diagnostic DB v3 adds metric indices in place. Pending Basic attempts become
interrupted with reasons; committed rows/capacity survive. Rich pending reservations
stay unconfirmed, identical restart gaps are deduplicated, and sequence admission
resumes above reserved high-water. Startup buffering preserves nonprivate identity
and source timing, reports dropped proof as a gap and never fabricates verification.
Optional observer promises are not awaited; rejection is consumed without affecting
provider work. No CURRENT/authorization/native routing semantics changed.

Real Chromium IDB/browser tests passed: v2→v3 migration with capacity/rows retained;
pending restart/gap deduplication/resumed sequence; fixed snapshot excludes later
commits; cancellation has no download/deletion; interrupted read fails explicitly.
Recovered PARTIAL and fixed 102-event browser ZIPs passed independent CRC/hash/CSV/
JSON verification. See phase-c-browser.json. This is HTTP Chromium fixture proof,
not an installed extension or live R2 test.

Node tests passed 18/18, then 20/20. A final startup test had a fixture syntax error
(39/40 combined and 0/1 standalone); both failed logs are retained. After correcting
that test fixture, the full affected measurement/native/recorder/boundary/authority
set passed 44/44, including seven 1,000-click modes: OFF, BASIC, EXPANSIVE, throwing,
async factory rejection, async callback rejection and stalled observation. Timing
assertions are validated against actual available source spans, not fabricated zeros.
