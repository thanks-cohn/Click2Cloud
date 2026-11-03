# Universal connector architecture — S3/S4 and beyond

**Decision, 2026-11-03:** V3+1 is a menu engine, **not a separate implementation for every cloud provider**. A verified universal file API / adapter layer supplies normalized capabilities, folders and upload receipts to three independently implemented menu modes. One neutral registry joins the resulting provider contributions beneath REDOWN. This is an **integration contract and pure reference model**, not a live adapter, Chrome registrar, Cloudflare Worker or tested MEGA connection.

## Critical correction: mode is selected per connection

Each authorized provider **connection** owns its own menu-mode selection. E.g. Cloudflare R2 can show Simple while MEGA S3 concurrently shows Depth, without changing either mode's private configuration or folder index. The Destination Manager's top `Simple | Narrow | Depth` tabs apply to the **currently selected connection**, not to the whole extension. Non-S3 native integrations such as Google Drive, OneDrive, Dropbox and future MEGA native remain their separately specified flat provider actions; they are not forced into S3 folder modes.

**The neutral menu registry can combine one finished mode projection PER CONNECTION**. A single `globalActiveMode` is insufficient for multiple S3 accounts using different presentations. Within each connection, only its selected mode is registered; the inactive mode's settings remain saved.

```text
REDOWN
  Cloudflare                         [its own Simple mode]
  Google Drive                       [native flat]
  OneDrive                           [native flat]
  Dropbox                            [native flat]
  MEGA S3 ▸                          [S4 connection using Depth]
    Photos ▸
      Save here
      2026
    Projects
  MEGA                               [future MEGA native, distinct]
  Other S3 Compatible ▸             [another connection, may use Narrow]
```

Order: Cloudflare → Google Drive → OneDrive → Dropbox → first S3/S4 connection, with independently configured/custom order for further connections. Provider labels can repeat across accounts, but rows and routes are namespaced by **immutable connection ID**, not by display label.

## S4: product name, not an invented universal protocol

**MEGA S4 is MEGA's S3-compatible object storage product.** Its documented surface includes S3 and IAM API coverage with provider-specific operation differences, endpoints and policy behavior. It should enter through the **S3-compatible adapter family** with a MEGA S4 capabilities profile, not a separate universal “S4 wire protocol”. [MEGA S4 API specifications](https://github.com/meganz/s4-specs/blob/main/README.md).

Not every cloud is S3-compatible. For example Koofr officially documents **WebDAV** connectivity; route a future Koofr integration through a WebDAV or native adapter unless an independently verified S3 bridge exists. [Koofr WebDAV documentation](https://app.koofr.net/help/webdav). Amazon S3 is another candidate for S3-compatible adapter tests, but must pass its own credential, region, bucket, multipart, permission and billing requirements. Do not assume every vendor accepts Cloudflare R2 or MEGA credentials.

**MEGA S3** (MEGA S4 object storage) is explicitly different from **MEGA** (future native MEGA file storage). Both may coexist under REDOWN with separate `connectionId`, `adapterKind`, credentials and root handling.

## Reuse the actual existing file API

REDOWN already exposes `createFileApi(adapter)` and `api.run()` / `api.batch()` in its [Beta file API](https://github.com/thanks-cohn/REDOWN/blob/main/extension/beta/file-api.mjs). This is the operation/policy/progress/partial-or-uncertain-write boundary. **V3+1 should integrate with it, not build another upload stack.** The owner also references C3 as the older S3-specific engine: treat its compatibility as a separately verified bridge, not as a competing registrar. Read [Existing File API Bridge](EXISTING_FILE_API_BRIDGE.md) before coding.

## Ownership diagram

```text
Auth + credential vault / provider capability + endpoint validation
                |
       Universal File API adapter
     [S3 signature/endpoint | WebDAV | native APIs ...]
                |
     Verified read/list/upload events
                |
     Per-connection identity + namespace
          /         |          \
 Simple projection  Narrow projection   Depth projection
  (one active per connection; Depth maintains full-known folder index)
          \         |          /
          Finished action descriptors (no credentials)
                       |
           Neutral multi-connection registrar
            [REDOWN root / provider siblings]
                 /                \
       Portal preview         Chrome native menu
                                      |
                         Exact connection action dispatch
                                      |
                   Authorized browser-fetched bytes upload
                                      |
                       Provider-verified save receipt
```

A remote Worker/service may handle authenticated provider API requests, secure credentials *if explicitly authorized and securely stored*, normalized listings, and verified upload receipts. **A Worker cannot itself install Chrome native context-menu entries**. The extension's service worker/native registrar does that from the already available connection plans; no provider list calls during hover.

## Directory-index and delta isolation

For each authorized provider connection and container/bucket, Depth owns **one current full-known folder graph**, a per-scope append-only journal, small day/week indexes and adaptive immutable snapshots. It does NOT create a full graph per user display depth or duplicate the graph across Simple/Narrow/Time Machine.

```text
<private storage>/indexes/<adapter>/<connectionId>/<accountId>/<endpointId>/<bucketId>/
  HEAD.json
  snapshots/snapshot-2026-11-03T180000Z-g000100.json.zst
  journals/delta-2026-11-03T181245Z-g000101-g000125.jsonl.zst
  indexes/daily/daily-2026-11-03.index.json
  indexes/weekly/weekly-2026-W45.index.json
```

Paths are illustrative **namespace components**, sanitized/encoded; no secret, raw access token, personally identifying account name or untrusted endpoint URL in literal file paths. A verified `endpointId` is stable for that exact connection and target. The `HEAD` references verified segments; no automatic whole-cloud sweep merely because a checkpoint is due. Scanning is bounded/resumable and cannot delete known paths after partial reads.

Time Machine stores its independently scoped per-file history events/track selections. Adding a directory to Time Machine does not alter Depth's menu. The neutral verified provider event may be observed independently by both.

## Connection lifecycle

1. User adds a connection (MEGA S4 access key/secret + verified endpoint/region as example) through an authorized provider setup flow. **Never include the secret key in menu config, journal, log, browser action, public URL or file path.**
2. Neutral capability probe verifies S3-compatible operations actually permitted for this key: list containers, list children, upload bytes, verify receipt, pagination, delimiter, multipart/checksum, provider-specific signatures/region. Explicitly mark unsupported operations.
3. Store a stable opaque `connectionId` and opaque `credentialHandle` only in a secure, consented credential vault/authority. Do not ship secrets into a browser-to-Worker endpoint without an appropriate security model. Scopes are explicit `providerKind + connectionId + accountId + endpointId + bucketId`.
4. Create per-connection mode settings with Simple/Narrow/Depth independent; choose one `activeMode` for **that connection**. The selected mode compiles a pure native menu contribution.
5. Registry preserves the last valid contributions for other providers even if this connection fails or is revoked. A failed capability probe never silently routes to another account.
6. User may add more S3 connections; each receives a new ID and private namespace even when vendor, account-display label or bucket name repeats. Reconnecting the **same** account may reuse its stable ID after explicit matching; rotating credentials changes credential generation without destroying a verified directory history.
7. If a connection is removed, disable its native routes immediately and apply the selected deletion/retention policy to its private index/history. Never delete remote buckets by deleting a menu connection.

## Acceptance and priorities

- Cloudflare Simple + MEGA S4 Depth + another S3 Narrow all visible simultaneously under REDOWN; change only MEGA S4 depth and see **zero Cloudflare/other provider config, journal or route edits**.
- Two MEGA S4 connections with same bucket label produce separate native IDs and distinct journal directories.
- Native **MEGA** and **MEGA S3** never combine credentials, menu IDs, folder namespace or save receipts.
- Revoke MEGA S4 credential: block its save actions, mark status actionable, preserve other registered providers' plans; no global `removeAll()`.
- Multiple saved aliases can share the same exact path and even same **visible title**; action IDs remain distinct.
- Each verified upload goes to the clicked exact provider/connection/account/bucket/prefix, with source URLs absent from provider-bound metadata; a click acknowledgement is not save success.
- Reconnect/restart, partial listing, lost native callback, stale account generation, two concurrent edited connections, independent multi-provider loss and credential leaks are tested before production use.

See [Connector API](CONNECTOR_API.md), [testable connection registry reference](src/connection-registry.mjs), [tests](tests/connection-registry.test.mjs) and [Codex starter](CODEX_START_HERE.md). This proposal changes no original REDOWN code, production cloud account or live Chrome menu.
