# Integrated remote API and trusted ports

The extension/agent API is version `3+1.1`; its closed schemas are in `src/api/service.mjs` and declarations in `src/api/service.d.ts`. Remote host protocol is `click2cloud-remote-2`. Old deployed Workers require explicitly approved repair; a matching old saved plan is insufficient evidence of current code.

```js
import {createRemoteSaver} from './src/index.mjs';
const save = createRemoteSaver(trustedPorts);
await save({operationId: crypto.randomUUID(),
  source: {url: 'https://public.org/file', filename: 'file.bin'},
  destination: {provider: 'cloudflare-r2', connectionId, accountId,
    bucketName, prefix: 'chosen', conflictPolicy: 'keep-both'}});
```

An operation ID is random and identifies one deliberate save. New ID means new save. Source canonicalization signs/transmits only `url`, `filename`, and optional `responseFilename` Boolean; optional API contentType never changes the signed intent. Native source extraction supports image/link/video/audio, media before link; it does not implement page archiving or selection capture. Server Content-Disposition may replace the native fallback name only when the signed flag authorizes it. Explicit API filenames remain exact. Final R2 key is validated against 1024 UTF-8 bytes, including prefix and collision suffix.

Results distinguish blocked (before potential write), failed conflict, uncertain (potential write or lost acknowledgement), written (ingest acknowledgement, not final success), and verified. Verified requires fresh authorized exact-key HEAD matching destination, operation metadata, size, ETag and version. This is storage identity proof, not a cryptographic comparison with original source bytes. Readiness and acceptance can additionally perform GET byte comparisons. Never replay uncertain operations automatically.

## Trusted host ports

- `authorize(intent)`, `recheckAuthorization(intent, cap)`: current session, exact selected target, generation and source approval; recheck after proof.
- `getPreparedWorkerCapability(intent)`: exact binding, short signed scope; never provision as a side effect.
- `authenticatedRequest(cap, intent, {signal})`: host submits once, then polls status and renews leases. Bounded control requests do not bound total transfer time. Never retry a claimed write.
- `verifyObject(cap, receipt, {signal})`: fresh authenticated independent read; never echo a supplied receipt as proof.

`src/cloudflare/transport.mjs` implements these ports. It records operation ID/target before dispatch. `/remote-save` returns 202 after a durable atomic claim; `/operation` is read-only, `/lease` renews the exact original session/source/destination, `/cancel` requests cancellation without promising rollback, `/revoke` revokes a session. `/verify` verifies the exact final key; `/probe` conditionally creates Worker-generated readiness bytes, and `/probe-status` safely recovers their readback without another write. Endpoints require scoped HMAC grants, with no public object route.

## Trusted Worker ports

`createWorker(ports).fetch(request, env)` implements the inner single transfer. The integrated `RemoteClaims` outer owner performs durable claim, async dispatch, result/progress storage and recovery. `authenticate` resolves exact binding and authority, never a client-selected arbitrary environment binding. `claimOperation` must be strongly atomic and retained across restarts. `recheckAuthorization` must examine the renewable lease/revocation. `fetch` MUST enforce connect-time public HTTPS, per redirect. There is no supported-site parameter. `idleTimeoutMs` and optional explicit caller `maxBytes` exist for lower-level callers/tests; the installed product supplies no prototype total-size policy. Record ports persist prepared key, final expected length, and immutable part identity before completion.

The inner handler has no automatic deployment, bucket creation or UI. Provisioning is owned by the existing permission/confirmation checked host API. No global source, bearer or browsing URL is persisted in claims.

## Minimal destination writer seam

`kind`, `capabilities.conditionalCreate`, `prepare({destination, filename, operationId, signal})`, `write({prepared, body, length, contentType, operationId, signal})`, `verify({receipt, signal})`. Writer input contains no source URL, browser headers or page context. Production supports R2 only. The structural alternate-writer test proves the seam, not future provider proof compatibility.

Known-length streams use FixedLengthStream, strict counts and atomic If-None-Match creation. Unknown lengths use bounded conditional staging with durable per-part identity, then conditional final PUT. Staged objects are retained for inspection. No safe conditional multipart completion or source-range resume is claimed. See security constraints for actual runtime/service boundaries.

## Browser streaming extension point

Eligible later non-R2 browser adapters may implement `uploadStream({destination, filename, contentType, body})` plus `verifyReceipt({receipt, destination, filename, byteLength})`. Backpressure flows from the adapter to source acquisition. A source must reach EOF and independent provider proof must match the consumed byte count before success. Already-resident bytes retain `upload` compatibility. A URL cannot silently fall back to whole-file buffering; an adapter lacking streaming returns STREAMING_PROVIDER_REQUIRED. Cloudflare always takes the separate TRUE REMOTE route. No new Drive/Dropbox/OneDrive driver is implied.
