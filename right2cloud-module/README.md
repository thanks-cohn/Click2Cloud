# right2cloud-module — isolated review candidate

Extracted and deliberately hardened from actual REDOWN source, not preservation documents. This is executable Worker-compatible remote-fetch/R2 code with injected authority and transport ports. It is not integrated, deployed, or live verified. No Chrome, application state, external package, or REDOWN runtime import is required.

Run from Click2Cloud:

```sh
node --test --test-reporter=tap right2cloud-module/tests/*.test.mjs
```

Read [the source trace](SOURCE_TRACE.md), [API contract](API_CONTRACT.md), [inheritance audit](KEEP_ADAPT_REJECT.md), [security limits](SECURITY_PRIVACY_LIMITS.md), [future writer contract](FUTURE_S3_ADAPTER_CONTRACT.md), and [review handoff](REVIEW_GATE.md). Exact local output is in TEST_RESULTS.txt. INTEGRITY.json and CHANGE_REVIEW.txt record source/checkout hashes and scope checks.

`src/index.mjs`: callable coordinator and public exports. `cloudflare-worker.mjs`: authenticated remote compute handler. `source-fetch.mjs`: HTTPS/redirect policy, known-length stream and bounded unknown-length buffering. `cloudflare-r2-writer.mjs`: real R2 binding calls, conditional creation and independent HEAD. `verification.mjs`: receipt reconciliation. `common.mjs`: exact identities, paths and cancellation helpers.

Deliberate adaptations: no automatic provisioning, no public assets/read routes, no source URL in object metadata, exact trusted per-prefix authority, conservative source host allowlist, explicit deployment-specific resource limits, operation deduplication port. Unicode filenames are preserved rather than REDOWN's ASCII substitution. Content-type extension inference is omitted; supplied filename is exact. Site-specific gallery capture is excluded; this module saves eligible direct public HTTPS files only.

A future host must implement the trusted ports, including durable operation claims. They are security prerequisites, not mock production implementations. Current local tests use fake external HTTP and R2 storage while executing the shipped coordinator, Worker and R2 writer. They prove isolation and protocol behavior, not Cloudflare platform conformance.
