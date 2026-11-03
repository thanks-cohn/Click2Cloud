# Legacy provider adapters, R2 provisioning and save truth

**Actual source:** [Cloudflare connection/provision/ingest](https://github.com/thanks-cohn/REDOWN/blob/5041b5763541812c505c9cde6e8f79cb23a7b193/extension/background.js#L990-L1251), [remote ingest/verification](https://github.com/thanks-cohn/REDOWN/blob/5041b5763541812c505c9cde6e8f79cb23a7b193/extension/background.js#L2038-L2150), [multi-provider menu](https://github.com/thanks-cohn/REDOWN/blob/5041b5763541812c505c9cde6e8f79cb23a7b193/extension/background.js#L2520-L2615), [S3 gap audit](https://github.com/thanks-cohn/REDOWN/blob/94a1a5f0699eec904d989a3823d22f9bf2bd131d/FOREVER_WORKS/v3-plus-one-master-audit/07_S3_ADAPTER_AND_CLOUD_ISOLATION.md).

## Source lessons that new menu design must not obscure

1. **V3 is Cloudflare R2-specific**, not a universal S3 implementation. Its `prepared()` predicate accepts only `type=cloudflare-r2` profiles with prepared Worker URL/token. Listing uses Cloudflare R2 REST; saves use REDOWN's Worker protocol. An S3-compatible provider needs its **own adapter** and auth/endpoint/signing/capability contract, not a Cloudflare sub-provider menu or Cloudflare R2 purchase requirement.
2. **Other cloud providers already have separate authentication and transfer implementations** (Google Drive, Dropbox, OneDrive) but their native menu composition still has coupling. Their account/drive IDs are not interchangeable with S3 bucket prefixes. Never send S3 signing credentials through a generic filesystem picker.
3. **R2 subscription vs bucket access vs Worker readiness differ.** Cloudflare login alone is insufficient, R2 entitlement alone is insufficient, a prepared Worker alone may be stale. The owner's Simple rule: no nested Cloudflare menu until authenticated account + active R2, then create/reuse verified lowercase `redown` root, discover permitted other buckets. Do not perform provider mutations just because a menu can be rendered.
4. **Only a verified provider save may increment counters/show SUCCESS.** A Chrome menu click, fast traveling click pulse, in-progress upload or a setup link is not an upload receipt. V3 URL ingest includes HEAD/key/size/etag checks; they are useful evidence boundaries, but not universal byte-for-byte or exactly-once proof.
5. **An uncertain write can exist remotely.** If Worker write succeeds then History append, callback, local counter or token refresh fails, retry can duplicate the remote object. Use idempotent request IDs/destination+key+receipt reconciliation and the owner's default KEEP BOTH policy; verify before retrying instead of assuming a failed UI means no object was saved.
6. **Privacy contract needs stronger separation than V3.** Some old Worker/transfer metadata paths carry original `sourceUrl` / page-origin context to remote provider. The owner's newer privacy requirement is that external cloud providers receive only fetched bytes plus minimal filename/extension and required technical upload metadata—not source/page/link/frame URLs or browsing provenance. Keep provenance, where user-authorized, in private local REDOWN History only. Audit new adapters and worker headers for URL leaks; never blindly transplant old upload payloads.
7. **Capability negotiation matters.** Generic S3 adapters may vary in allowed bucket list, pagination, delimiter, object listing, token refresh, conditional writes, multipart limits, checksum, readback and public URL setup. An adapter should explicitly state capabilities and non-support, not make every vendor share Cloudflare's Worker lifecycle.
8. **Folder listing is not file mutation.** Simple/Narrow picker can enumerate a provider's folder hierarchy through read-only neutral listing without changing Depth's private full index or requiring Time Machine; scanning an object-prefix shouldn't create empty “folder objects” just to display a tree.

## Minimum neutral adapter seam

```ts
type ProviderScope = {providerKind,connectionId,accountId,containerId,scopeGeneration};
interface Adapter {
  getCapabilities(scope): Promise<Capabilities>;
  listContainers(scope,cursor): Promise<Page>;
  listChildren(scope,prefix,cursor,{deadline,signal}): Promise<Page>;
  resolveWritable(scope,prefix): Promise<VerifiedTarget>;
  uploadVerified(target,sourceBytes,filename,idempotencyKey): Promise<SaveReceipt>;
  verifyReceipt(target,receipt): Promise<Verification>;
}
```

Credentials never leave the adapter. The native registrar owns no network authorization. The input `sourceBytes` represents the owner's browser-fetched payload, **not an external original URL forwarded to a provider**.

## OPEN acceptance

Cloudflare account connected but R2 missing; R2 active but no `redown`; `redown` exists among unrelated buckets; multiple accounts with same named buckets; denied create/list; successful verified root write; independent S3 provider capabilities; invalid cursor; staged/partial upload; provider receipt without History update; R2 privacy test that checks outgoing metadata contains NO source/page URLs. All live provider mutations require explicit authorization and disposable test scope.
