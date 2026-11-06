# Security, privacy and supported limits

## Authority and actual network behavior

The selected source URL, including any signed query, necessarily reaches trusted Cloudflare transfer compute and the source server. It never goes to the destination writer, object metadata, receipt, or candidate logs. This module emits no logs and does not forward browser cookies, Authorization, Referer, tab URL, page context or arbitrary client headers to source fetch. Host/platform access logs must be separately reviewed for URL/query retention; code alone cannot control provider logging. Source server response contentType is retained, not page provenance. Operation IDs must be random opaque values, never secret-bearing strings.

The Worker is not ready to expose publicly without real authenticate, durable claim and revocation ports. Authentication must resolve a least-privileged principal to one exact destination, source-host policy, expiry, limits and correct storage binding. Reject revoked/expired/changed account or connection. Never use a body field to choose arbitrary env bindings. Never broaden permissions, activate buckets or infer defaults. The candidate does not contain real bearer values or account constants as authority. Host transport must keep tokens in trusted extension/server contexts and authenticate a separate read-only verification route. The handler has no public object read/download routes.

## SSRF and source eligibility

All sources and each manual redirect require HTTPS with no credentials, fragment, IP literal, nondefault port, local/special suffix, single-label name or trailing dot. Hosts must match a trusted exact allowlist. URL normalization catches alternative numeric IPv4 forms before policy checks. At most five redirects; missing Location and unsafe redirects fail closed. Private IPv4/IPv6 literals are rejected wholesale rather than attempting a permissive range classifier. Authenticated websites, HTML responses, generated site archives and unsupported source forms are not supported. No guarantee of access to every public website.

**Network-level limitation:** DNS cannot be securely resolved/pinned with ordinary Worker fetch alone. An allowed DNS hostname can resolve/rebind to private or reserved networks, and platform egress restrictions/re-resolution need real validation. Production approval requires controlled/public source host policy and an enforcing egress mechanism or documented platform protection. Do not treat the string validator as complete network SSRF protection. Host and redirect policies must not be expanded to wildcard arbitrary domains to silence a failure.

## Body handling and resource limits

There is no invented universal file limit. Worker capability must explicitly set maxBytes, maxBufferBytes and timeoutMs according to current account/platform memory, CPU, execution duration and R2 limits. Limits are enforced in candidate code, but no live account/platform limits were measured. Unknown length bodies buffer at most maxBufferBytes and then allocate a combined buffer; peak memory includes chunks plus combined buffer (roughly twice payload plus overhead). Choose limits accordingly. Known length bodies stream with byte counting and FixedLengthStream; oversized/short bodies fail, and maxBytes is checked before and during consumption. Storage binding may impose further constraints. No multipart/resume implemented.

Worker deadline covers claimed operation processing/source read/write and is capped at capability expiry; request parsing has a separate five-second/16 KiB bound. Host network and verifier ports must also enforce finite deadlines and cancellation. Abort after dispatch or PUT uncertainty never implies rollback. A provider PUT rejection/error is conservatively uncertain unless explicit conditional-conflict null proves no object was created by that call. Source failures before write are blocked/no-write. The Worker aborts remaining stream work on completion/failure; no background replay is scheduled.

## Collision, identity and verification

HEAD-based suffix selection alone is insufficient; If-None-Match:* is the actual no-overwrite boundary. Race conflict returns failed, with no silent retry or overwrite. R2 API conformance must be tested on real infrastructure later. Durable atomic claim is required before any remote source fetch/write to reject repeated operation dispatch across processes. Claim retention/reconciliation store is a host prerequisite. This module intentionally does not fake durable safety with in-memory state or URL hashes. A false claim is uncertain/read-only reconciliation, not permission to issue a new ID automatically.

Fresh HEAD must match exact authorized destination, operationId metadata, key, size, etag and version from the ingest receipt. This improves identity binding while removing REDOWN's sourceUrl metadata. ETag/version/size are storage evidence, **not full cryptographic content proof**, and a malicious authorized Worker could lie. No source SHA-256 or provider checksum is synthesized. Crypto validation, if later required, must use supported provider checksum or readback-hash and define trusted source bytes. Binary fidelity is exercised locally, not established for deployed R2 by these tests.

## Review boundary

No live OAuth, real source fetch, deployment, bucket provisioning, cloud write or independent live R2 readback was attempted. All test HTTP is injected. Node tests do not simulate platform networking, FixedLengthStream enforcement, real R2 conditional commits, distributed races or Cloudflare quotas. No production functionality is certified. Existing applications remain unchanged.
