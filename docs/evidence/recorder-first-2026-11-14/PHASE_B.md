# Phase B — passive identity/proof joins repaired

Two baseline regressions failed: a cold delivered native click observed its row
before beforeClick restored the native ACK, losing provider/mode; and the old
Cloudflare adapter accepted completion/proofKind flags without a correlated
independent readback. The host's immutable initial-row closure compounded the
first defect. Those are reproducible source mechanisms; unavailable owner RAW
traces are not claimed as independently inspected.

A passive native.identity observation now carries the actual resolved row and
observed ACK generation after hydration. The host updates only its invocation-local
binding. An observation of the existing /verify response retains the independent
HEAD proof, receipt and remote operation correlation. Cloudflare verification
requires final completed/verified outcome plus the existing acceptProof contract
for the exact selected target and matching readback; no reason string suffices.
Menu generation is retained in Basic and export schema. No authorization decision,
provider result, network request or write retry was added or relaxed.

The native truth table exercises real onClicked listener, registrar, canonical
engine, transport, actual local workerd/R2 writes and independent object bytes,
host, Basic/Rich and SECURE export. Recorder storage in this Node fixture is
explicit memory ports. Across Simple/Narrow/Depth: warm and cold success verified;
auth loss uncertain; partial History unverified; invalid/missing observed receipt
or proof and wrong target unverified; stale generation blocks without writes;
throwing/slow observers preserve saves and write counts. The 30 cases and measured
values are in native-truth-table.json. They are not installed Chrome/live R2 proof.

All attempts retained: baseline 0/2; repaired unit 2/2; first integration run 2/3
(the harness incorrectly searched just the first rich segment for the terminal
row); corrected harness reads every segment and retains the same terminal assertion,
3/3; final combined native/recorder/authority/MV3 22/22. No failed save assertion was
relaxed. Exact commands and final verification are consolidated in REPORT.md.
