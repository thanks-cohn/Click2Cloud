# Security, privacy and real constraints

Current evidence: [repair report](../docs/evidence/CLICK2CLOUD_P0_REAL_RIGHT_CLICK_REPAIR.md). No deployed repair, real OAuth consent or live R2 write was performed in this run.

## Authority and privacy

Exact trusted extension document/IPC, scoped agent grants, explicit setup confirmation, native ACK/generation and current OAuth/session fences remain. Worker HMAC scopes bind principal, account, bucket, prefix, operation, source digest, use and expiry. Short grants renew via authenticated exact-job leases; expired leases cannot be revived. Durable claims are retained and never cleared to permit an uncertain replay. Cancellation/revocation cannot roll back a possible write.

The source URL/query necessarily reaches trusted transfer compute and the source server. It is not written to destination metadata, durable claims, History or diagnostics. Writers receive streams and minimal destination identity, not browsing provenance. Source requests forward no cookies, Authorization, Referer, tab/page URL or client headers. R2 metadata contains opaque operationId and sanitized MIME type. Worker observability is disabled in generated deployment metadata; provider-side logging still needs live review.

## Public source enforcement

The production host resolves trusted DoH A/AAAA answers, rejects empty/mixed/private/special answers and connects only to a validated literal public address. TLS verifies the original hostname with original SNI, rejectUnauthorized and HTTP/1.1 ALPN. Every redirect repeats validation/resolution/pinning. URLs require HTTPS, no credentials, and safe hostname/address; fragments are stripped. Safe public IPs and HTTPS custom ports are eligible. Redirect cycles fail; there is no five-hop website gate. HTTP framing rejects ambiguous length/chunk headers, malformed lengths and oversized headers. Idle peers time out after 30 seconds of no progress; there is no 60/65-second whole-save timeout.

Node TLS hostname/pinning behavior is tested with a real local TLS server and valid/mismatched certificates. The production TLS imports boot in actual workerd. Sources in transfer runtime tests are explicitly injected. These do not establish deployed Worker networking behavior.

Cloudflare documents that Workers TCP cannot connect to Cloudflare IP ranges, localhost/private networks, or port 25. Therefore Cloudflare-hosted source sites are an external blocker for this direct pinned-TLS route, even when public. It fails closed with SOURCE_EGRESS_UNAVAILABLE; there is no unsafe ordinary-fetch fallback. A separately authorized enforcing egress service that validates/pins destinations could extend reach; none is implemented/deployed here. HTTP/2-only source servers are not supported by this HTTP/1.1 parser. Authenticated websites, browser blobs and complete webpage/selection archives are not TRUE REMOTE sources.

## Streaming and runtime constraints

No 64/8/32 MiB product total-file cap is supplied. Known lengths stream directly; unknown lengths spool conditional 4 MiB objects under `.click2cloud-transfers/<operationId>/`, recording/checking part ETag/version/size/opID, then stream them into a conditional final known-length PUT. These parts are retained, billed and not automatically deleted. Memory admission derives from the documented 128 MiB isolate budget (64 MiB reserve, 16 MiB planned per active job); excess concurrency is rejected before claim/fetch as RESOURCE_BUSY. Production resource estimates are not measured live.

R2 documents 5 GiB nominal single-PUT and approximately 4.995 TiB multipart capacity. Its published table/footnote has an exact-boundary discrepancy; the upper single-PUT boundary is not live measured. The writer checks the nominal service boundary, and any provider rejection remains uncertain. Atomic If-None-Match is established for PUT; conditional CompleteMultipartUpload support sufficient to preserve Keep Both has NOT been established. This implementation does not offer unsafe HEAD-then-complete, overwrite, automatic same-ID retry, or claim support beyond the conditional single-PUT pathway.

DurableObjectState.waitUntil prevents eviction until settlement or up to 15 minutes. Durable progress/status does not make an unpersisted active source stream resumable. A job interrupted by eviction returns OPERATION_INTERRUPTED/uncertain and can be inspected read-only; it is never automatically refetched. Reliable larger-than-single-PUT and eviction-safe source continuation require further work with proven conditional finalization and stable source identity/ranges or a separately authorized long-lived compute service. Worker CPU/connection/DO storage/account limits still apply. Six outgoing connections per invocation and storage/claim growth need live load measurement. No arbitrary claim eviction is introduced.

Small JSON/token/header limits, per-read idle timeouts, inspection page sizes, bounded IPC download chunks and preview-only memory budgets remain resource/security controls; they are not total-file caps. Download uses range chunks and backpressure to disk. Large files are not implicitly buffered for preview.

## No overwrite and proof

HEAD chooses an available display name; random operation suffix avoids 10,000 sequential probes. Atomic conditional PUT is the actual no-overwrite guard. Concurrent conflicts can truthfully fail CONFLICT. Read-only recovery uses the durable prepared key and final expected size/operation metadata, including after final receipt persistence loss. HEAD version/ETag/size proof is not a source-content hash; local acceptance additionally reads bytes. Real R2 conformance, site reachability, long-lived runtime and OAuth scope sufficiency remain live gates.

Official references: [TLS](https://developers.cloudflare.com/workers/runtime-apis/nodejs/tls/), [TCP restrictions](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/#considerations), [Worker limits](https://developers.cloudflare.com/workers/platform/limits/), [R2 limits](https://developers.cloudflare.com/r2/platform/limits/), [S3 API conditions](https://developers.cloudflare.com/r2/api/s3/api/), [Durable Object state](https://developers.cloudflare.com/durable-objects/api/state/#waituntil).
