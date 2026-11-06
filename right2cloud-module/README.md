# right2cloud-module — Click2Cloud remote transfer core

The imported coordinator, source parser, conditional R2 writer and receipt verifier are integrated through `src/cloudflare/`. They have no REDOWN runtime dependency. The original extraction records (`SOURCE_TRACE.md`, `INTEGRITY.json`, `TEST_RESULTS.txt`, `CHANGE_REVIEW.txt`, `REVIEW_GATE.md`) are historical artifacts, not hashes or certification of this repair.

Run `node --test right2cloud-module/tests/*.test.mjs`. Run `npm run test:focused` for the integrated host. See [current repair evidence](../docs/evidence/CLICK2CLOUD_P0_REAL_RIGHT_CLICK_REPAIR.md) for exact proof classes and limitations. Local workerd and injected-source tests are not live Cloudflare proof.

`source-fetch.mjs` validates HTTPS redirects, strips fragments, streams known/unknown lengths, counts bytes and enforces idle progress. The host's `public-egress.mjs` resolves through trusted DoH, rejects nonpublic/mixed answers and connects TLS to a validated literal IP with original-host SNI/certificate validation. There is no website allowlist. Standalone callers MUST provide an equivalent enforcing `fetch` port; ordinary hostname fetch alone is not DNS-rebinding protection.

`cloudflare-r2-writer.mjs` uses conditional creation and fresh HEAD verification. Unknown lengths spool to conditional 4 MiB objects in the exact destination prefix before the conditional known-length final PUT. Spool objects are retained; this consumes extra operations/storage. R2's single-PUT service boundary remains; safe conditional multipart finalization is not established. No MEGA or generic S3 driver is included.

Read [API contract](API_CONTRACT.md) and [security constraints](SECURITY_PRIVACY_LIMITS.md). Four provider menu rows do not mean four implemented storage drivers.
