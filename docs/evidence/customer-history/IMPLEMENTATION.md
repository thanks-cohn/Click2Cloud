# Customer History implementation

Base: a3a672754156f88bb572bfb4275d1471f0ccb4a6. Review branch:
implement/customer-history-ux-2026-11-15. Checkpoint tag preserved unchanged.

Phase 1: traced the Depth outcome channel: it always sent technical text,
including routine completion, independently of Debug Mode. Presentation now
reads the existing persistent preference and stays quiet on completed/pending
outcomes when OFF. Durable recording and actionable failures remain enabled.
24 Debug preference/feedback tests pass. Installed Windows cold login and live
R2 acceptance are NOT TESTED; managed Chromium blocks unpacked installation.

Phase 2: top-level History and header More; Settings display/preview/timezone
preferences and JSON/CSV/JSONL exports; 25-operation date groups; exact-object
GO TO across image/PDF/document/text/archive/binary/video/audio; actual writer
metadata snapshot with honest legacy/current-remote labels. The operation store
remains canonical; no competing History DB, configuration migration or pruning.
The condensed Explorer toolbar now keeps four navigation actions plus More.
14 model/export/navigation tests and seven real Chromium UI gates pass with
fixture provider/Chrome transport and actual IndexedDB. 49 module tests and
three production Depth -> local workerd/R2 regression tests pass, including
independent bytes and unchanged Simple/Narrow control routing. The pristine
base focused suite passes 444 tests. No installed Windows/live cloud claim.

Worker changes add numeric source-header/prepare/streaming-write timings without
changing the existing PUT metadata payload, conditional creation, independent
HEAD/version/size/provenance verification or authorization. Existing Workers
will require the normal authorized update before using changed Worker code;
this task does not deploy it. The UI-only History/metadata gaps in old records
are not backfilled from guesses.

Phase 3: CURRENT reads now fetch exact configuration/guard keys and complete
setup evidence rather than deserialize retained History. Customer History uses
bounded cursor-page selection over the existing canonical records, without a
schema change. Fixed export progress state, nested metadata privacy omission,
exact-account conflict rejection and the expand-from-condensed toolbar edge case.
Final validation: 465 focused tests, 49 module tests, 11 application browser gates,
30 CURRENT recovery passes and three expected baseline reproductions. Local
workerd/R2 confirms upload-metadata equality with actual object HEAD metadata.
See RESULTS.md, verification.json, raw timing samples and screenshots here.

The final isolated 5,000-record CURRENT-read run measured p50 84.6 → 0.4 ms,
p95 123.1 → 0.7 ms and p99/max 135.9 → 0.9 ms. Earlier paired runs measured
76.5–80.4 ms before versus 0.4–0.5 ms after at p50. These are local read-cost
measurements, not a claim about live cloud save completion latency.
