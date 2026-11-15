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
