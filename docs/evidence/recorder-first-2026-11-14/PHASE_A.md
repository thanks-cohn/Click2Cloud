# Phase A — independently verified complete one-click export

Source root: the old panel fetched one IndexedDB page and exposed an unclicked
anchor plus manual Next. The baseline real-browser test on 7f6808e selected a
102-event run, clicked SECURE once, observed one page and zero automatic downloads,
and retained the failing result. The replacement has one action, automatic complete
snapshot pagination, integrity/count/sequence checking, one download, real progress
and cancellation. Archive selection defaults to the current rich run; explicit
Basic-only selection is preserved.

Basic snapshot positions and durable sequence numbers are now separate. Export
terminates on explicit page metadata, not durable high-water versus retained count.
Each rich source segment's content and chain are checked, including SECURE host
projection. Missing/gapped/evicted/unconfirmed coverage stays PARTIAL; corrupt or
interrupted reads fail. Native Blob chunks hold encoded pages under a 256 MiB
payload cap; only one decoded page is retained, with streaming SHA-256 and CRC32.
No concatenate-all-events array or whole-file digest buffer is used. Above the
budget, EXPORT_SIZE_LIMIT_256_MIB is an explicit failure without a truncated ZIP.

Actual browser/UI/IDB/download results: 0, 102, 10,000 and 100,000 events, in each
of RAW and SECURE. Every case used one export click (RAW privacy confirmation is
separate), initiated one download, and passed the independent Python ZIP CRC,
file SHA-256, JSONL count/sequence, Basic CSV/JSON and secure-marker checks. Exact
blob sizes/hashes and page counts are in phase-a-browser-after.json. This is Linux
Chromium 155 HTTP-page proof with explicit Chrome messaging fixtures, not an
installed extension or live provider. Heap before/after values are observations,
not peak or controlled overhead measurements. The source-level cap is independent
of those noisy values.

All runs are retained: initial Node 11/11; revised Node 12/12; baseline browser
failure; first development browser failure on SECURE null predecessor handling;
corrected browser eight cases PASS; existing recorder/MV3 15/15; workings 5/5.
The null predecessor correction has its own regression. Full final integration
and Windows/installed Chrome acceptance follow in later phases.

Generated 0/102/10k browser ZIPs are committed as lossless .zip.gz synthetic artifacts
with original ZIP hashes in phase-a-artifacts.json. Stress ZIPs remain under local
work/ and their exact counts/size/hash are retained in the browser ledger. None is
an owner RAW recording. Use scripts/verify-recorder-zip.py after decompressing.
