# Owner + ChatGPT extraction handoff

## Delivered candidate

Self-contained importable JavaScript: coordinator, exact intent validation, minimal click-source normalization, authenticated Worker handler, public-HTTPS source acquisition, real R2 binding writer with conditional creation, and separate HEAD receipt validation. No application runtime imports. Tests use Node built-ins only; fake HTTP/storage are confined to tests. Scope is the working checkout's isolated module, not a feature-branch transplant. Request was read at the exact supplied fetched commit and preserved here for review.

Start with SOURCE_TRACE.md and KEEP_ADAPT_REJECT.md. The source-pinned graph covers the native event → saved destination resolver → prepared Worker → embedded remote fetch → conditional R2 put → independent headObject → final session recheck path. Each retained or rejected stage maps to candidate code. No previous preservation/extraction content was used to derive it.

## Required review decisions before integration

- [ ] Accept explicit rewrite/hardening versus byte-identical extraction. Generic Worker fetch/R2 mechanism is retained; unrelated mixed Worker routes and UI are not copied.
- [ ] Review src/common.mjs and sourceFromClick for exact destination/name/path semantics and Unicode differences from REDOWN.
- [ ] Review host source permission and site eligibility. Source page fallback is input only; HTML/galleries/authenticated sources unsupported.
- [ ] Review all manual redirect checks and exact source-host allowlist. Resolve DNS/egress SSRF limitation before public deployment.
- [ ] Implement and audit authenticate, durable atomic claim, revocation, prepared capability, authenticated transport and fresh verification ports. No placeholder should grant authority.
- [ ] Decide capability lifetime, principal scoping, durable claim retention, rate/usage policy and read-only recovery workflow. A lost response never authorizes automatic retry.
- [ ] Set actual deployment resource limits, including conservative unknown-length peak memory. Test genuine FixedLengthStream and R2 conditions/size errors on authorized infrastructure later.
- [ ] Accept conditional Keep Both conflict behavior with no auto-retry; verify concurrent conditional creates cannot overwrite existing objects.
- [ ] Accept independent HEAD/version/size evidence as the current proof class, or separately require cryptographic source/readback proof. ETag is not claimed as SHA-256.
- [ ] Review privacy change: no sourceUrl/public URL metadata, no browser provenance or logs. Ensure platform logs and host transport do not expose signed URLs or bearer credentials.
- [ ] Review instance lifecycle for coordinator memory retention. Durable claims must remain independent of short-lived saver instance memory.
- [ ] Validate future S3 contract without implying any MEGA/Amazon support. No real S3 implementation or credentials exist in this candidate.

## Integration remains a separate task

Read-only V3+1 seam is described in SOURCE_TRACE.md. Native registrar and API destination resolution remain V3+1 owned. A future remote branch belongs after exact intent/source authorization, before captureSelectedBytes, so no local byte staging is accidentally called TRUE REMOTE. It must expose equivalent callable API authorization/results. History/counter/success only follows verified result; uncertain errors must offer read-only reconciliation. Neither runtime was modified.

Future authorized acceptance must include actual installed Chrome native click, genuine Worker principal/binding validation, public source redirect denial, binary transfer, real R2 independent readback, concurrent Keep Both, lost-response/cancellation tests and metadata/log privacy. That later task may require deployment and live writes; this assignment did not authorize them and none occurred.

## Validation and status evidence

TEST_RESULTS.txt is the actual final isolated Node TAP run, including individual results. CHANGE_REVIEW.txt records Git status/diff and contamination checks. INTEGRITY.json hashes all tracked REDOWN and existing Click2Cloud files against HEAD and records exact commits. Any pre-existing dirty state would block a claim of unchanged protected files; both started clean and remain clean outside this module. Fetch changed Git remote tracking/FETCH_HEAD only, not application files. The repository branch remains work; no commit/merge/push made.

The module is an isolated implementation candidate with explicit missing trusted host/deployment capabilities. It is complete for source extraction and local review; it is **not a complete production application or a ready public Worker deployment**. There is no claim that mocks prove real provider behavior.



Final local result: **49 passed, 0 failed, 0 skipped**. Earlier 48/49 run is preserved in TEST_RESULTS_INITIAL_FAILURE.txt: conditional-conflict stream cleanup stalled and reported uncertain. Candidate now aborts unused piping without waiting for unconsumed-stream cleanup, returning explicit failed/CONFLICT. No assertion was weakened. Configured REDOWN build-windows.bat CRLF checkout conversion is recorded separately in INTEGRITY.json; its normalized bytes match HEAD and it was not edited.


right2cloud-module — EXTRACTED FROM ACTUAL REDOWN SOURCE
Cloudflare TRUE REMOTE + R2 writer — ISOLATED CANDIDATE
Future S3 writer seam — CONTRACT ONLY
V3+1 RUNTIME — UNCHANGED
REDOWN SOURCE — UNCHANGED
NOT INTEGRATED / NOT DEPLOYED / NOT LIVE-VERIFIED
NO GOOGLE DRIVE / DROPBOX / ONEDRIVE
READY FOR OWNER + CHATGPT REVIEW
