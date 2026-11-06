# Source-backed inheritance audit

All REDOWN anchors refer to extension/background.js at `a6c17f8d0be22131d5cc38b060da4f8f3544800f`. KEEP means retaining a mechanism, not importing the mixed background runtime. The candidate is a focused rewrite/extraction with explicit departures; no claim of byte-identical code or production equivalence is made.

| Source/function | Decision and observed dependencies | Candidate location / reason / evidence limit |
|---|---|---|
| :2935 onClicked | REJECT listener, other-provider routing, notification/diagnostic dispatch | No native registration or event owner in candidate. Host resolves intent. |
| :2416 resolveActiveRightClick | REJECT menu modes/state/profile resolver | common.mjs validates exact identity; host authority port replaces saved menu ownership. |
| :2971 saveResolvedRightClick | ADAPT generic ingest→verify sequence; REJECT site gallery path, UI/history/counter effects | index.mjs. Typed outcomes replace undifferentiated catch/notification. |
| :753 selectedUrl | KEEP media/link/page ordering, ADAPT filename handling | source-fetch.mjs sourceFromClick. No page URL retained as metadata, no tab state. Page fallback remains an input source only; HTML responses rejected. |
| :768 basenameFromUrl | ADAPT pathname decode, explicit safe names and Unicode | source-fetch.mjs/common.mjs. Filename inference absent; invalid separators fail. |
| :2038 ingestCloudflareAtPrefix | ADAPT prepared capability, authenticated POST, exact returned destination | index.mjs trusted host ports. No publicBaseUrl derivation or credentials in intent. |
| :1643 cleanExplorerPrefix | ADAPT exact prefix validation | common.mjs; no trim/ASCII replacement or implicit trailing-slash conversion. Empty/dot segments rejected. |
| :1659 workerAcceptsProfile | ADAPT capability check | precise authenticated ports/protocol rather than numeric legacy Worker version. No use of cached readiness as authority. |
| :1682 preparedProfile | REJECT profile stores and automatic repair/provision fallback | host must supply already prepared exact binding/capability. No fallback account or bucket. |
| :1120 provisionCloudflareProfile, :1155 deployment | REJECT entire deployment/auth/config mutation path | requirements only in API_CONTRACT; no cloud setup script. |
| :55 embedded WORKER_SOURCE, :396 bearer gate | ADAPT only ingest/auth mechanism | cloudflare-worker.mjs. Trusted authenticate port instead of embedded secret or whole Worker. No public assets, read signatures, explorer management, archive or transfer batch endpoints. |
| :57 privateHost / :209 checkedFetch | ADAPT public HTTPS/manual redirects | source-fetch.mjs: exact source allowlist, no IP literals, no nondefault port, per-hop credentials/host checks, explicit deadlines. DNS resolution still a platform/host prerequisite. |
| :66 cleanName / :72 cleanPrefix | REJECT lossy ASCII sanitization; ADAPT validity rules | common.mjs preserves exact Unicode; rejects traversal and separators rather than silently changing destination. |
| :170 extensionForContentType / :192 filenameWithInferredExtension | REJECT optional guessing | filename remains supplied/URL-derived, contentType preserved only as content metadata. |
| :149 uniqueKey / :164 putNewDownload | KEEP HEAD/suffix and If-None-Match:* | cloudflare-r2-writer.mjs. A race yields explicit conflict; no write retry. Real platform semantics still require later R2 validation. |
| :692 known-length pipeline | KEEP streaming via FixedLengthStream and actual R2 put; ADAPT exact byte count/deadline | writer/source-fetch. Test stream double is weaker than Cloudflare length enforcement. |
| :708 unknown-length pipeline | ADAPT bounded buffering | separate explicit buffer policy, not a universal 300 MiB assumption; may reject otherwise fetchable files. |
| :675 sourceUrl/public URL/import metadata | REJECT proven source URL persistence | only operationId + contentType written. Signed URLs remain transient transfer input. |
| :734 ingest response | ADAPT exact receipt | no public URL claim. key/size/version/etag/operation identity only. |
| :1699 callBucketWorker | ADAPT bounded authenticated transport and independent read | injected host transport; no repair, ambient Chrome storage, or observer. |
| :515 headObject / :2085 verifyCloudflareReceipt | KEEP independent fresh HEAD; ADAPT identity and session checks | writer.verify + verification.mjs + host recheck. sourceUrl comparison replaced by operationId + version. ETag is not claimed as cryptographic proof. |
| :3012 recordTransfer, :3013 notify | REJECT application completion side effects | typed result only, host owns History/counter after verified result. |

## Risk ownership

Actually present in inspected REDOWN: embedded secret substitution at deploy time; sourceUrl persisted in metadata; public URL construction; legacy preparation can provision; unknown-length chunk buffering; partial private-host checks; generic ingest lacks dispatch timeout; no durable logical-operation claim in traced path. These are source observations, not allegations about deployed configuration or all other code paths. Conditional create already exists in REDOWN and is retained; silent overwrite is not attributed to this save path.

Present in candidate: required trusted authentication, transport, independent verifier and durable-claim ports are not supplied by a host yet; operation promises retain sensitive URL input in memory until instance disposal; HEAD is same-provider evidence, not an independent trust domain; known-length tests use a simplified fixed stream double. These limitations block production readiness, not isolated review.

Present in existing V3+1 at pinned HEAD: engine capture stages source bytes locally with 32 MiB default; authorized Worker transport is explicitly unconfigured in background source. These are integration findings, not changed behavior.

Potential only: DNS rebinding against an approved public hostname, malicious provider/host lying about HEAD, externally changed/revoked credentials during a write, Cloudflare resource ceilings and concurrent overwrites by unrelated principals. Candidate cannot eliminate these using URL string checks or mocks. Separate platform/host controls and acceptance gates remain mandatory.

Contamination searches and Git integrity evidence are recorded in CHANGE_REVIEW.txt and INTEGRITY.json. No application runtime import, listener, menu mode, state store, unrelated cloud implementation, deployment or live write was introduced.
