# Future Worker-side destination port — contract only

Only Cloudflare R2 is implemented/accepted today. The Worker owns source validation and acquisition; destination writers receive no URL, browser credentials, page URL or referrer. Future approved S3 writers should consume the same body directly, not stage through R2. A browser Universal File API adapter is not automatically executable in a Worker. This seam is not a new competing file API.

Mandatory shape:

```js
// Contract sketch, NOT a functional MEGA/Amazon implementation.
const futureWriter = {
  kind: 'future-provider',
  capabilities: {conditionalCreate: true, knownLengthStream: true, independentHead: true},
  async prepare({destination, filename, operationId, signal}) { /* authorized key plan */ },
  async write({prepared, body, length, contentType, operationId, signal}) { /* single create */ },
  async verify({receipt, signal}) { /* separate authenticated read */ }
};
```

Executable structural double is in tests/module.test.mjs; its purpose is port compatibility only. It is not registered with production createWorker. Adding a provider later requires explicit provider validation/capability negotiation (currently common.destination and Worker gate accept only cloudflare-r2), not a silent fallback.

Future implementation requirements:

1. Trusted server-side connection/account/bucket/key scope and immutable endpoint identity. Exact endpoint and signing region come from approved configuration. No guessed MEGA S4 region.
2. Worker-side secret retrieval and SigV4/provider-appropriate signing; never expose signing keys to page worlds, intent, metadata or public invocation bodies. HTTPS-only trusted endpoints, controlled egress and costs.
3. Negotiate supported content-length/checksum/stream-signing modes. Some S3-compatible targets cannot accept the same chunked or signed payload semantics as AWS. Failure yields NOT_SUPPORTED, never automatic R2 staging.
4. Respect provider memory/object/part/time limits; multipart/resumable transfers need durable upload state, part identity, inspection and explicit abort semantics. They are not implemented here.
5. Prove atomic no-overwrite semantics on each provider. If conditional multipart completion/create cannot be proven, block. Head-then-put is not sufficient. Never assume MEGA S4 implements every AWS conditional feature.
6. Independent HEAD/readback/checksum validation tied to version/operation identity; multipart ETags need not be full-file hashes. Distinguish source integrity from storage acknowledgement.
7. Durable claim/reconciliation state must associate principal + provider + account/connection + bucket + operation. Lost response after commit stays uncertain; inspectPending/abortPending may be added explicitly, no blind retry.
8. No original source URL, page URL, link URL, referrer or signed query in headers/metadata/provider logging payload. Logs must be reviewed separately on the compute/provider platforms.
9. Future writer.validateAuthorizedDestination can be added if needed, but does not replace Worker/host authority checks. Port receives only a trusted plan and sanitized data stream, never arbitrary endpoint credentials.
10. Native and programmatic save clients retain the same authorization/result behavior through V3+1. Provider additions require separate authorization, tests and review; none are implied by this contract.
