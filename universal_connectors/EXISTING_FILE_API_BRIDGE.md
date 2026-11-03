# Bridge the EXISTING REDOWN Universal File API to C3 / V3+1

**This is an integration seam, not a second file API.** The original REDOWN Beta Explorer already has an operational abstraction in [`extension/beta/file-api.mjs`](https://github.com/thanks-cohn/REDOWN/blob/main/extension/beta/file-api.mjs). It was read on 2026-11-03 and exported source blob `3feb05ad7ce54e9e0a2c502f81b1a13e19852481`. The Click2Cloud handoff should adapt to its real contracts rather than inventing a parallel generic upload API.

## Actual source-backed API behavior

`createFileApi(adapter)` gives the application a `version:1` interface and computes `capabilities` from methods physically implemented by the adapter. Its supported operation names include:

```text
listRaw readStream connectionStatus connect disconnect accounts buckets
list stat upload download mkdir copy move rename delete remoteIngest
preview publicUrls createBucket profiles prepareBucket transferHistory
archiveEntries archiveEntryUrl extractArchiveEntry inspect
```

`api.run(operation,input,options)` generates an operation ID, applies any installed policy, forwards provider-specific configuration and progress, then returns a lifecycle object:

```ts
type FileApiResult={
  id: string;
  state: 'completed'|'partial'|'uncertain'|'cancelled'|'failed'|string;
  data?: unknown;
  error?: string;
  code?: string;
  recoveryKey?: string;
};
```

`api.batch()` runs bounded concurrency and halts additional work when it hits an `uncertain` result. Unknown writes must be reconciled before automatic retry; a generic `completed` transport result **does not independently prove** the final provider's file bytes and path unless the adapter's receipt semantics supply that evidence.

The current `location()` helper expects `accountId`, `bucketName` and `prefix` for Cloudflare. **Do not reuse that shape as the universal identity**: instead map `connectionId/providerKind/accountId/endpointId/bucketId/prefix` to each adapter's own input at the boundary. Similarly, never force native MEGA/Drive/Dropbox file IDs into S3 path/key semantics.

## Proposed bridge, not a rewrite

```text
C3 S3-side compatibility / Beta Explorer / other authorized consumers
                    |
       Existing universal file API semantics
       createFileApi(adapter).run(operation,...)
                    |
  Provider adapter with connection/endpoint scoped credentials
          |                     |
   S3-compatible (R2, MEGA S4, Amazon S3...)   non-S3 native/WebDAV
          |                     |
    Verified list/status/receipts + source-safe bytes
                    |
         V3+1 mode-specific destination compiler
                    |
      Neutral per-connection Chrome registry
```

The new V3+1 right-click engine is **a consumer of the existing file API**, not a new independent upload service. C3 (the earlier S3-specific engine discussed by the owner) is an integration/compatibility concern, **not another actor that owns native menu registration**. The native extension service worker is the sole registry authority. Do not assume any unverified implementation detail of C3; inspect the exact source before replacing or bridging it.

## Required adapter/capability extensions

1. Expose stable **opaque connection IDs** and exact scoped metadata separately from the legacy Cloudflare-specific `accountId/bucketName` location helper.
2. Advertise confirmed S3-compatible operations through the existing `capabilities` model rather than treating presence of `remoteIngest` or a Worker URL as blanket permission to upload.
3. Preserve `api.run()` result distinctions. In particular, `uncertain`, `partial` and `failed` never become verified success animations or counters. Map confirmed upload receipt to the exact native destination ID, bucket, prefix and connection.
4. Preserve provider-independent progress, batch limits and policy; do not add arbitrary default file-size caps. Honor real provider/server/browsers constraints and multipart/rate limits.
5. Never relay original source/page/link/frame URL to provider APIs. REDOWN may retain privately in its own History when authorized, but adapters see only bytes/name and required technical metadata.
6. C3 and V3+1 **both consume the same authorized adapter result contract**, but V3+1 alone controls newly registered right-click menu plans. Keep the existing V3 compatibility path until an explicitly approved staged migration; no global `removeAll` or secret migration by default.

## Precise implementation gates

- Inspect `extension/beta/file-api.mjs` and current provider adapter implementations in REDOWN; map each operation to normalized scope and result, preserving previous partial/uncertain behavior.
- Use a fake S3 adapter to prove MEGA S4 `list`/ `upload` and bucket lookups call the **same** abstract file API operations as R2, while signed endpoint and credential-handling remain vendor-specific.
- Introduce a connection-aware wrapper and adapter conformance suite. Do not change the old source until separate tests prove no regressions for Beta Explorer or C3.
- Verify one actual authorized MEGA S4 account in Chrome/Worker integration only once credentials have been securely supplied; no credentials are available to this proposal today.
- Test the neutral registry with Cloudflare Simple + MEGA S4 Depth + fixed native providers; unaffected cloud menus must survive one adapter outage.

**State:** the file API source and reference registrar were inspected; the new universal bridge, C3 integration and real MEGA S4 adapter are **not yet implemented**.
