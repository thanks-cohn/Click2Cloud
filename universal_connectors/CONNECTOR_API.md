# Universal File API adapter — capability and evidence contract

This is a **normalization boundary**, not a promise that one S3 SDK works identically for all vendors. It deliberately separates:

- **Transport/credential service**: secret handles, signing, permitted endpoints, workers, auth refresh and provider-specific behavior
- **Folder-index service**: read and page exact scoped folder listings, verified changes, and durable cursors (Depth owns its index, Simple/Narrow editor only requests folder pages)
- **Menu registration**: Chrome-owned native menu installation, pure finished descriptors and exact click IDs
- **Save service**: browser-fetched source bytes + minimally necessary filename/extension → authorized provider adapter → verified receipt and History result

## Versioned interface sketch

```ts
type Connection = {
  connectionId: string;              // immutable opaque ID; NEVER a display name
  providerKind: string;              // 'mega-s4' | 'cloudflare-r2' | 'amazon-s3' | ...
  adapterKind: 's3'|'webdav'|'native';
  accountId: string;                 // opaque stable account identity
  endpointId: string;                // validated opaque endpoint identity
  credentialHandle: string;          // vault reference, NEVER secret material
  credentialGeneration: number;
  activeMode: 'simple'|'narrow'|'depth'|null; // per connection, not global
  displayLabel: string;              // e.g. 'MEGA S3'
};
type Scope = Pick<Connection, 'connectionId'|'providerKind'|'accountId'|'endpointId'>
  & { bucketId:string };
type Capabilities = {
  containerList: boolean;
  delimiterListing: boolean;
  cursorPagination: boolean;
  objectRead: boolean;
  byteUpload: boolean;
  writeReadback: 'strong'|'limited'|'unsupported';
  multipart: boolean;
  verifiedBucketWrite: boolean;
  conditionalWrites?: boolean;
  changeFeed?: boolean;
  unsupportedReasons?: string[];
};
interface UniversalFileAdapter {
  capabilities(connection: Connection): Promise<Capabilities>;
  validate(connection: Connection): Promise<{ready:boolean;scopeGeneration:string;reason?:string}>;
  listContainers(connection: Connection, cursor:string|null): Promise<Page>;
  listChildren(scope: Scope, prefix:string, cursor:string|null, signal?:AbortSignal): Promise<Page>;
  prepareWritable(scope:Scope, prefix:string): Promise<WritableHandle>;
  saveBytes(handle:WritableHandle, bytes:ReadableStream|Uint8Array,
    name:string, idempotencyKey:string): Promise<ProviderReceipt>;
  verifySave(handle:WritableHandle, receipt:ProviderReceipt): Promise<Verification>;
}
```

Real credentials must never be sent as data in the mode or registry plan. If a remote Worker is used, use an explicitly authorized, hardened service and credential vault with least privileges, authenticated requests, rate limiting, anti-replay/idempotency and tenant segregation. A generic Worker URL is not an automatic secure credential vault. For a client-only SigV4 strategy, do not expose keys to webpage content or content scripts.

## Required routing contract

```text
registeredActionId
 → exact (connectionId, mode, sourceRowId)
 → verify current action is still present, leaf/actionable and connection ready
 → resolve exact (providerKind, accountId, endpointId, bucketId, prefix)
 → browser fetches desired source bytes (not provider-visible original URL)
 → provider-specific adapter uploads bytes with name/ext + required technical metadata
 → independently verifiable provider receipt
 → only then SUCCESS!, counter and successful History entry
```

**Source URL, page URL, frame URL and link URL remain private to REDOWN history**, not provider upload arguments or request headers. No S3 provider gets Cloudflare's R2-specific onboarding requirements. MEGA S4 and native MEGA are different provider kinds.

## Provider-specific details to probe, not assume

Official MEGA S4 documentation describes S3/IAM coverage and supported operations; test regional/endpoint aliases, addressing style, bucket listing privileges, pagination/truncated lists, multipart behavior, checksum support and server-specific rejection modes. No credentials have been supplied here, so those capabilities are **unverified for the user's account**.

Other vendors (Amazon S3, Cloudflare R2, future compatible object stores) will differ in scope, bucket policies, region, endpoint, object versioning and costs. A future Koofr adapter is **WebDAV/native unless an actual S3 endpoint is independently verified**. [Official Koofr WebDAV help](https://app.koofr.net/help/webdav).

## Snapshot locations

Per independent Scope, form a non-secret namespace and safely encoded storage key:
```text
indexes/<providerKind>/<connectionId>/<accountId>/<endpointId>/<bucketId>/
  HEAD.json
  snapshots/snapshot-<UTC>-g<generation>.json.zst
  journals/delta-<UTC>-g<first>-g<last>.jsonl.zst
  indexes/daily/daily-<date>.index.json
  indexes/weekly/weekly-<week>.index.json
```

These archives are optional independently encrypted backups for recovery; not every user's provider automatically becomes the **backup destination**. Do not write snapshots into the user's bucket without explicit permission, and do not assume a public bucket or endpoint is suitable for metadata backups. The local Depth CURRENT and journal function even without an external backup, but external recovery is unavailable until verified.

**Development status:** all methods except pure registration/identity reference are future implementation tasks.
