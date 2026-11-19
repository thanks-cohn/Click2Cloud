# Click2Cloud V3+1.1 API command reference

Click2Cloud 0.3.20 runs a trusted local API in the Chrome extension service worker. The Shelf uses the same operation registry and domain owners as host-authorized clients. The extension exposes no public HTTP listener, external messaging endpoint or desktop-control service.

## Quick start

Call `describeCapabilities` to discover the live tool registry and each method’s complete JSON input and output schemas. The release build also includes `api-tools.json`. TypeScript clients can import contracts from [service.d.ts](../../src/api/service.d.ts).

Trusted extension code can send the following request from the expected Shelf document. The service checks the Chrome sender identity and document URL. Websites, content scripts and arbitrarily modified Shelf URLs cannot use this transport. [Trusted sender implementation](../../src/chrome/trusted-sender.mjs)

```js
const invoke = (method, params = {}) =>
  chrome.runtime.sendMessage({channel: 'engine', version: '3+1.1', method, params});

async function call(method, params = {}) {
  const response = await invoke(method, params);
  if (response?.state !== 'completed') {
    throw Object.assign(new Error(response?.code ?? 'ENGINE_NO_RESPONSE'), {response});
  }
  return response.data;
}

const capabilities = await call('describeCapabilities');
console.log(capabilities.tools.map(({name, scope}) => ({name, scope})));
const connection = await call('getProviderConnections');
if (connection.state === 'CONNECTED') {
  const accountId = connection.accounts[0]?.id;
  if (accountId) {
    let cursor;
    const seen = new Set();
    do {
      const result = await call('listAuthorizedBuckets', {accountId, ...(cursor ? {cursor} : {})});
      console.log(result.data.buckets.map(bucket => bucket.name));
      cursor = result.data.cursor;
      if (cursor && seen.has(cursor)) throw Error('Bucket cursor repeated');
      seen.add(cursor);
    } while (cursor);
  }
}
```

For a host-authorized local client, use the existing `createAgentClient({gateway, handle, authenticatedActor})` and call `client.invoke(method, params)`. The trusted host issues the expiring handle and grants the specific methods and authorized accounts. The host independently applies account checks to request, resolved targets and results. Full configuration and interactive authentication require the relevant host grant. Confirmation is separate where the operation already calls for it. A caller cannot issue its own grant. [Client](../../src/api/client.mjs) · [Gateway](../../src/api/gateway.mjs) · [Permission policy](../../src/api/permissions.mjs)

### Requests, outcomes and evidence

Use exact `provider`, `connectionId`, `accountId`, `bucketName` and `prefix` values from authorized discovery. A Cloudflare root prefix is the empty string. Folder prefixes end in a slash and object keys include the entire original path. Use a matching revision or generation for configuration and menu actions, then inspect evidence before retrying a mutation. Cursors are opaque and scoped to the originating operation and inputs.

Responses have `version`, `state` and `code`, with optional `data`, `diagnostic` and an invocation `receipt`. States are `completed`, `partial`, `blocked`, `failed`, `uncertain` and `cancelled`. Some read methods return a lower-level File API envelope inside `data`. Inspect nested state and proof fields. An invocation receipt identifies the host call. Native menu ACK, verification of an R2 save, archive finalization and local file readback each have their own evidence.

`inspect` can include bounded provider reads or local navigation. `configure` changes local preferences or saved configuration. `auth` handles interactive account operations. `execute` runs an approved file or save action. `restore` accesses authorized recovery. `provision` can prepare provider infrastructure and may incur charges. The registry’s effectful flag is a coarse classification. The method notes describe exceptions and operational effects.

## Scripted exports

Scripts can page `listDirectoryObjects` and use the same formatter as the Shelf. Enable the Get URL experiment before calling `getPublicUrls`. Each active domain is checked against Cloudflare’s association, ownership and TLS status. The presence of a URL does not establish anonymous retrieval under every domain policy.

```js
import {eligiblePublicObject, formatUrlExport, listExportInventory, objectUrls}
  from './src/explorer/object-exports.mjs';

// source is an exact authorized target obtained from account/bucket discovery.
const list = (source, cursor) =>
  call('listDirectoryObjects', {source, ...(cursor ? {cursor} : {})});
const inventory = await listExportInventory(list, source);
const {domains} = await call('getPublicUrls', {source});
const files = inventory.files.filter(file => eligiblePublicObject(file.key))
  .map(file => objectUrls(source, file.key, domains));
const json = formatUrlExport(source, files, inventory.complete, 'json');
```

Use `getExportObjectMetadata` for available object metadata and existing tags when either metadata download option is enabled. For files and folders, `streamDownloadArchive` accepts a caller-owned async byte sink, a paginated inventory and an exact-key reader. `readPreviewBytes` composes `readFileChunk` into a bounded-memory read that checks the strong ETag and expected size.

```js
import {downloadJob, streamDownloadArchive} from './src/explorer/download-archive.mjs';
import {readPreviewBytes} from './src/explorer/image-preview.mjs';

const controller = new AbortController();
const archive = await streamDownloadArchive({
  source, inventory, mode: 'original', recursive: true, job: downloadJob(),
  outputName: 'directory.zip', signal: controller.signal,
  write: bytes => destinationWriter.write(bytes),
  read: (file, onChunk) => readPreviewBytes(
    params => call('readFileChunk', params),
    {source, key: file.key, etag: file.etag, size: file.size},
    {limit: Number.MAX_SAFE_INTEGER, concurrency: 1, signal: controller.signal, onChunk}
  )
});
await destinationWriter.close();
```

The caller owns sink cleanup after an error and delivery verification after finalization. Use an abortable or temporary writer if a partially written artifact would be misleading. A finalized directory ZIP includes one `_click2cloud/RRReceipt-<time-stamp>-<job-number>.json` with exact source-to-entry reconciliation. CRC-32 identifies output bytes for archive integrity. R2 ETags are source validators. The archive library returns finalized status without projecting later browser or filesystem results.

The optional tag mode embeds tags in verified bounded PNGs and can package originals with a tags companion for other formats. The all-metadata mode writes originals and metadata sidecars. Cloudflare’s exposed metadata fields vary. Current cloud tag writes, durable per-object URL editing and new custom-domain binding are gated by provider support for safe metadata replacement and explicit domain setup. [Export protocol and rollout status](EXPERIMENTAL-EXPORTS-0.3.20.md)

## Agent-readiness and future automation

The existing trusted gateway lets a host grant narrow discovery, inspection and file methods to an authenticated local client. Scripts can compose authorized listing, exact-object metadata and byte reads, with evidence attached to each operation. Local streaming and output ownership stay with the calling client. Changes to remote data or configuration require the permission, context and confirmation of the underlying method.

A future command can opt into the existing shortcut descriptor with a stable ID, context, parameter binding constraints and effects. Register a trusted Shelf handler for its context and reuse the canonical authorization path. Future screenshot-to-cloud, desktop control and global Chrome shortcuts require separate integrations and are outside the callable surface in 0.3.20.

## Repeatable verification

| Entry point | Coverage |
| --- | --- |
| `npm run test:api` | Trusted gateway calls, shortcut collisions and persistence, default target identity, timezone badge, domain verification, exact-object metadata, URL grouping, ZIP reconciliation and PNG tag readback |
| `npm run check:api-docs` | Exact registry coverage, per-method scope and schema fingerprints, schema-valid examples and separation of API and local commands |
| `npm run test:release-browser` | Chromium Shelf with fixture providers and storage, including Search, keyboard remapping, inline rename, destination controls and Debug Downloads |
| `npm test` | Full automated regression suite |
| `npm run build:extension` | Unpacked extension and generated tool registry under `dist/click2cloud` |

Run the fixture harness repeatedly without production credentials using `npm run test:api && npm run test:api`. Provider setup, installed Chrome native rendering, actual pinned icon paint and live R2 behavior require their own evidence.

## Method index

The source snapshot contains **77 callable methods** under API version **3+1.1**. The implementation snapshot is `eddb0854ad7994083ae380eb01bbeaca835bce73`. The schema fingerprints below are generated from the canonical registry on 2026-11-19. The exact registry and examples are checked by `npm run check:api-docs`.

| Scope | Methods |
| --- | --- |
| auth | 3 |
| configure | 17 |
| execute | 5 |
| inspect | 42 |
| provision | 5 |
| restore | 5 |

- [Portable menu manifests](#portable-menu-manifests)
- [Connection and Cloudflare setup](#connection-and-cloudflare-setup)
- [File Explorer and filename search](#file-explorer-and-filename-search)
- [Downloads and public links](#downloads-and-public-links)
- [Destinations and Chrome menus](#destinations-and-chrome-menus)
- [Right-click saves and History](#right-click-saves-and-history)
- [Backup, recovery and outlines](#backup,-recovery-and-outlines)
- [Appearance, shortcuts and diagnostics](#appearance,-shortcuts-and-diagnostics)
- [Shortcut and UI commands](#shortcut-and-ui-commands)

Use fixture parameters below to check request shapes. Replace example revision, generation, object identities and preview tokens with values returned by the relevant read. Deliberately effectful examples require the trusted host and any applicable confirmation.

## Portable menu manifests

### exportMenuManifest

<!-- method-contract {"name":"exportMenuManifest","scope":"inspect","effectful":false,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Exports the local portable menu manifest from the current configuration. Use this to transfer menu choices between installations, with cloud account rebinding performed on import.

Returns the manifest document and export metadata. The export excludes authentication material and provider infrastructure authority.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('exportMenuManifest', {});
```

### getMenuManifestDraft

<!-- method-contract {"name":"getMenuManifestDraft","scope":"inspect","effectful":false,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Reads the current import draft. A draft can survive closing the editor and can be inspected before continuing or discarded.

Returns the current draft or null. Draft existence does not imply acceptance or application.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('getMenuManifestDraft', {});
```

### previewMenuManifest

<!-- method-contract {"name":"previewMenuManifest","scope":"configure","effectful":true,"status":"implemented","input":"6e8919ba2f9500523340d789aac018f27ad21de047469c4955f3a5af62b64c79","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Parses a portable manifest JSON, validates its format and stages a preview draft locally. Use this first before choosing account bindings or an import policy.

Returns a draft ID, validation details and preview material. CURRENT and Chrome’s registered menu are outside this step.

**Access and status** · `configure` · registry effectful `true` · implemented.

**Input** · `json` (string). A trailing `?` marks an optional field.

```js
await invoke('previewMenuManifest', {"json":"{\"kind\":\"click2cloud.menu-manifest\",\"schemaVersion\":1,\"purpose\":\"personal-restore\",\"exportedProductVersion\":\"0.3.20\",\"bindings\":[],\"simple\":[],\"narrow\":[],\"depth\":[],\"preferences\":{\"show\":{\"simple\":true,\"nested\":true,\"depth\":false,\"flat\":false},\"providerVisibility\":{\"google-drive\":true,\"dropbox\":true,\"onedrive\":true,\"cloudflare\":true},\"placement\":{},\"defaultTarget\":null}}"});
```

### inspectManifestBindings

<!-- method-contract {"name":"inspectManifestBindings","scope":"configure","effectful":true,"status":"implemented","input":"1e55597ae9d5ddae9e9f60b5ae50ba4fc52cb86187b758871251dddab48263a5","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Evaluates an import draft against destination account mappings and the chosen conflict policy. Reinspect after changing a mapping, the policy or the configuration revision.

Returns actionable classifications and a preview token. Cloud locations and recoverability can differ between accounts.

**Access and status** · `configure` · registry effectful `true` · implemented.

**Input** · `draftId` (string), `mapping?` (object), `options?` (object). A trailing `?` marks an optional field.

```js
await invoke('inspectManifestBindings', {"draftId":"fixture-draft","mapping":{"fixture":{"accountId":"fixture","connectionId":"cloudflare:fixture"}}});
```

### discardMenuManifest

<!-- method-contract {"name":"discardMenuManifest","scope":"configure","effectful":true,"status":"implemented","input":"12baaba4b98115afe5946529b6b5963125c4e2873922b872bd38f9b36c31a2e1","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Discards the named import draft. Use it to abandon a staged import without applying its changes.

Returns the discard outcome for that draft. It does not undo a committed import.

**Access and status** · `configure` · registry effectful `true` · implemented.

**Input** · `draftId` (string). A trailing `?` marks an optional field.

```js
await invoke('discardMenuManifest', {"draftId":"fixture-draft"});
```

### commitMenuManifest

<!-- method-contract {"name":"commitMenuManifest","scope":"configure","effectful":true,"status":"implemented","input":"b2392b29d93d48b27db0f46e37cc41760abdfa974f101bbc9e78827da42fd6e1","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Commits the exact inspected manifest using the draft token, revision and idempotency key. Set partial only when the reviewed partial plan is acceptable.

Returns the applied configuration and native reconciliation or a partial result. Provisioning remains a different method.

**Access and status** · `configure` · registry effectful `true` · implemented.

**Input** · `draftId` (string), `previewToken` (string), `expectedRevision` (integer), `idempotencyKey` (string), `partial` (boolean). A trailing `?` marks an optional field.

```js
await invoke('commitMenuManifest', {"draftId":"fixture-draft","previewToken":"fixture-preview","expectedRevision":4,"idempotencyKey":"fixture-request","partial":false});
```

### provisionMenuManifest

<!-- method-contract {"name":"provisionMenuManifest","scope":"provision","effectful":true,"status":"implemented","input":"59593d3bde3765f57c9121e473d33d1c97f77035cfaa4b2ebd6d6814ab49fdc9","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Executes the inspected import plan that explicitly authorizes resource preparation. Call only after reviewing the exact plan and its effects.

Returns provisioning progress or a terminal result. Requires host confirmation and can create or prepare billable Cloudflare resources.

**Access and status** · `provision` · registry effectful `true` · implemented.

**Input** · `draftId` (string), `previewToken` (string), `expectedRevision` (integer), `idempotencyKey` (string). A trailing `?` marks an optional field.

```js
await invoke('provisionMenuManifest', {"draftId":"fixture-draft","previewToken":"fixture-preview","expectedRevision":4,"idempotencyKey":"fixture-request"});
```

### undoMenuManifest

<!-- method-contract {"name":"undoMenuManifest","scope":"configure","effectful":true,"status":"implemented","input":"b4f18465147acd884a7930db91d4c1050018762fc9e8bbca6eb10ba34473c9c8","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Uses the retained pre-import configuration to undo the supported previous import. Provide the current revision to avoid overwriting newer configuration.

Returns the restored local configuration and native outcome. It does not reverse provider resource changes made during provisioning.

**Access and status** · `configure` · registry effectful `true` · implemented.

**Input** · `expectedRevision` (integer), `idempotencyKey` (string). A trailing `?` marks an optional field.

```js
await invoke('undoMenuManifest', {"expectedRevision":4,"idempotencyKey":"fixture-request"});
```

## Connection and Cloudflare setup

### getProviderConnections

<!-- method-contract {"name":"getProviderConnections","scope":"inspect","effectful":false,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Reads the connected provider and account status through the OAuth owner. Use this to decide whether to offer a reconnect or show authorized account selection.

Returns connection state, accounts, scope evidence and safe diagnostic information. A connected account can still lack R2 or Worker readiness.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('getProviderConnections', {});
```

### loginStatus

<!-- method-contract {"name":"loginStatus","scope":"inspect","effectful":false,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Reads the current authorization state and pending identity verification. Poll or revisit after the browser OAuth flow has started.

Returns CONNECTED, CONNECTING, VERIFYING or DISCONNECTED and observed permissions. This call alone cannot begin login.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('loginStatus', {});
```

### loginBegin

<!-- method-contract {"name":"loginBegin","scope":"auth","effectful":true,"status":"implemented","input":"8642a6d553274061fa4e27fa59377979f72676cdc89b8a97cf6074566e08794e","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Starts the existing interactive Cloudflare OAuth flow. Pass verifyOnly to verify existing authority without the explicit login initialization path.

Returns connection status and, after a normal connected login, a separate initialization outcome when attempted. The action requires host interaction and may prepare authorized Cloudflare resources.

**Access and status** · `auth` · registry effectful `true` · implemented.

**Input** · `verifyOnly?` (boolean). A trailing `?` marks an optional field.

```js
await invoke('loginBegin', {"verifyOnly":true});
```

### loginCancel

<!-- method-contract {"name":"loginCancel","scope":"auth","effectful":true,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Cancels a pending authorization attempt via the OAuth owner. Use this when a sign-in window or an in-progress verification is no longer wanted.

Returns the resulting connection state. It is an interactive authorization operation and does not clear saved destinations.

**Access and status** · `auth` · registry effectful `true` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('loginCancel', {});
```

### disconnect

<!-- method-contract {"name":"disconnect","scope":"auth","effectful":true,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Signs out of the current provider through the existing auth owner. This also fences activity dependent on the revoked authorization.

Returns the post-sign-out connection status. Authentication confirmation is required and saved destination configuration remains available offline.

**Access and status** · `auth` · registry effectful `true` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('disconnect', {});
```

### initializeCloudflare

<!-- method-contract {"name":"initializeCloudflare","scope":"provision","effectful":true,"status":"implemented","input":"b24aa9121c26fb408de859ebf78a8b012ff8a699fe16fe032c33c69c6ee42f01","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Attempts authorized Cloudflare save initialization, optionally resuming the existing attempt. The setup owner reads saved configuration and retained approval before preparing any default.

Returns readiness, setup stage and native application evidence. Provisioning or a verification write can incur provider usage.

**Access and status** · `provision` · registry effectful `true` · implemented.

**Input** · `resume?` (boolean). A trailing `?` marks an optional field.

```js
await invoke('initializeCloudflare', {"resume":true});
```

### inspectCloudflare

<!-- method-contract {"name":"inspectCloudflare","scope":"inspect","effectful":false,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Reads the onboarding summary, selected account and save readiness as observed by the host. Use this to diagnose missing setup authority independently of OAuth success.

Returns onboarding, status, provider limits and source policy. Rendered Chrome entries and actual save behavior require separate evidence.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('inspectCloudflare', {});
```

### checkCloudflareR2

<!-- method-contract {"name":"checkCloudflareR2","scope":"inspect","effectful":false,"status":"implemented","input":"e8e8f8c759f5056ec6f1048c3253910a5b4b5a80c7f1802f471f974edc25a2a1","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Checks R2 and the optional exact target for a selected authorized account. Supply the target when checking a particular bucket and prefix.

Returns observed readiness, account or corrective code. A connected OAuth session alone is insufficient evidence of a writable target.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `accountId?` (string), `target?` (object). A trailing `?` marks an optional field.

```js
await invoke('checkCloudflareR2', {"accountId":"fixture","target":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"}});
```

### selectCloudflareAccount

<!-- method-contract {"name":"selectCloudflareAccount","scope":"configure","effectful":true,"status":"implemented","input":"2d6ac009be05a090eea7fe283af5161c97ec158d04e074db23f186aef079d852","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Records an explicit authorized account choice for Cloudflare setup. Use it when multiple account identities are available.

Returns readiness for the selected account. This persists the local selection and preserves existing destination assignments.

**Access and status** · `configure` · registry effectful `true` · implemented.

**Input** · `accountId` (string). A trailing `?` marks an optional field.

```js
await invoke('selectCloudflareAccount', {"accountId":"fixture"});
```

### openCloudflareActivation

<!-- method-contract {"name":"openCloudflareActivation","scope":"configure","effectful":true,"status":"implemented","input":"2d6ac009be05a090eea7fe283af5161c97ec158d04e074db23f186aef079d852","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Checks the selected account’s activation state and returns the supported remediation. R2 activation is a provider-managed interaction.

Returns an activation outcome such as a manual-action requirement. The call requires confirmation and does not guarantee activation.

**Access and status** · `configure` · registry effectful `true` · implemented.

**Input** · `accountId` (string). A trailing `?` marks an optional field.

```js
await invoke('openCloudflareActivation', {"accountId":"fixture"});
```

### approveCloudflareSetup

<!-- method-contract {"name":"approveCloudflareSetup","scope":"provision","effectful":true,"status":"implemented","input":"325d327cc19bf1342959f40138d25741cb3cab6aa578f645faf9636ea1377533","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Records consent for the requested account and resumes the existing canonical initialization. Use the displayed revision and an idempotency key for this request.

Returns verified, partial or blocked setup and subsequent Chrome reconciliation when reached. Authorized setup can provision resources and write a retained proof object.

**Access and status** · `provision` · registry effectful `true` · implemented.

**Input** · `accountId` (string), `expectedRevision` (integer), `idempotencyKey` (string). A trailing `?` marks an optional field.

```js
await invoke('approveCloudflareSetup', {"accountId":"fixture","expectedRevision":4,"idempotencyKey":"fixture-request"});
```

### repairCloudflareDestination

<!-- method-contract {"name":"repairCloudflareDestination","scope":"provision","effectful":true,"status":"implemented","input":"d80916c913ce5e20e2156a5541214a6c7894ea06494740d069e34ff96446b354","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Runs the explicit Cloudflare repair workflow for an authorized account or exact target. Use after inspecting safe setup diagnostics and reviewing the repair effect.

Returns setup and native outcomes with any proof. Requires host confirmation and may prepare or update the existing Worker and perform a verification write.

**Access and status** · `provision` · registry effectful `true` · implemented.

**Input** · `accountId` (string), `target?` (object), `expectedRevision` (integer), `idempotencyKey` (string). A trailing `?` marks an optional field.

```js
await invoke('repairCloudflareDestination', {"accountId":"fixture","expectedRevision":4,"idempotencyKey":"fixture-request"});
```

### recoverCloudflareDestination

<!-- method-contract {"name":"recoverCloudflareDestination","scope":"provision","effectful":true,"status":"implemented","input":"76d71338da41d95a532feedb19d51053f80ada249cb56ad81ffe73913c00bf72","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Checks and repairs the exact configured bucket or folder using retained setup approval when valid. Use authorizeSetup only after explicit approval for this request.

Returns target readiness and reconciliation evidence. It does not replay the original source, and real save authorization is checked separately.

**Access and status** · `provision` · registry effectful `true` · implemented.

**Input** · `target` (object), `expectedRevision?` (integer), `idempotencyKey?` (string), `authorizeSetup?` (boolean). A trailing `?` marks an optional field.

```js
await invoke('recoverCloudflareDestination', {"target":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"},"authorizeSetup":false});
```

### inspectCloudflareSetup

<!-- method-contract {"name":"inspectCloudflareSetup","scope":"inspect","effectful":false,"status":"implemented","input":"3194eb465b9386a28d9f7f27afeccd097a7e51dc66953abbf55a70761caaae79","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Looks up the setup ledger for the specified account and idempotency key. Use it to inspect an interrupted or uncertain attempt before trying anything again.

Returns a matching setup record or null. A saved stage records progress and cannot establish a completed provider operation by itself.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `accountId` (string), `idempotencyKey` (string). A trailing `?` marks an optional field.

```js
await invoke('inspectCloudflareSetup', {"accountId":"fixture","idempotencyKey":"fixture-request"});
```

### inspectShelfAttention

<!-- method-contract {"name":"inspectShelfAttention","scope":"inspect","effectful":false,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Reads the current reason the Shelf requested attention and its opening result. Treat it as presentation context for showing the right authorized action.

Returns an attention descriptor or null, with an exact target when known. It does not grant save or provisioning authority.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('inspectShelfAttention', {});
```

### openCloudflareDestinations

<!-- method-contract {"name":"openCloudflareDestinations","scope":"configure","effectful":true,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Requests that the existing Shelf open Manage Destinations for Cloudflare. This is useful when a configured account needs a destination selection.

Returns the local request outcome. The call changes attention state and does not create a destination.

**Access and status** · `configure` · registry effectful `true` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('openCloudflareDestinations', {});
```

## File Explorer and filename search

### enterExplorer

<!-- method-contract {"name":"enterExplorer","scope":"inspect","effectful":false,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Discovers the current authorized Cloudflare context and an eligible starting location. Use this for Explorer entry rather than guessing the first bucket.

Returns accounts, buckets, preferred location and selected target or a reason that a choice is needed.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('enterExplorer', {});
```

### navigateExplorer

<!-- method-contract {"name":"navigateExplorer","scope":"inspect","effectful":false,"status":"implemented","input":"5ff2948f52c20bd9190a03d58a33c14f3283d4ad64cc801458bd329d1a93cbc5","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Validates and registers the requested Explorer location for the trusted Shelf. The background owner can signal an active Shelf to navigate for another authorized caller.

Returns the normalized target. This inspect-scoped method can update local navigation state.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `target` (object). A trailing `?` marks an optional field.

```js
await invoke('navigateExplorer', {"target":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"}});
```

### listAccounts

<!-- method-contract {"name":"listAccounts","scope":"inspect","effectful":false,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Lists accounts available to the provider File API. Use the IDs to compose account-bound calls such as listAuthorizedBuckets.

Returns the provider operation envelope with accounts and any continuation. A restricted grant can reject a response containing a foreign account.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('listAccounts', {});
```

### listAuthorizedBuckets

<!-- method-contract {"name":"listAuthorizedBuckets","scope":"inspect","effectful":false,"status":"implemented","input":"fd4b763c54839ddb43f8f84e3c3f54358cc0c53b57d72678d3fe76a2d4ca09d5","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Reads one authorized account’s bucket page using the provider cursor. Pass the returned cursor unchanged until it is empty.

Returns a provider file result containing buckets and cursor. Bucket discovery neither assigns the bucket to Chrome menus nor proves write readiness.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `accountId` (string), `cursor?` (string). A trailing `?` marks an optional field.

```js
await invoke('listAuthorizedBuckets', {"accountId":"fixture"});
```

### listFolders

<!-- method-contract {"name":"listFolders","scope":"inspect","effectful":false,"status":"implemented","input":"a048a80c8ad32e347c0d206d450837e80ccb2fb06ae2e80afdd35fb1affd85c2","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Lists immediate files and folders in a specified authorized prefix. Use its opaque cursor when additional pages are present.

Returns the File API result with entries and a cursor. A single page is not a complete recursive directory inventory.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `source` (object), `cursor?` (string). A trailing `?` marks an optional field.

```js
await invoke('listFolders', {"source":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"}});
```

### refreshExplorer

<!-- method-contract {"name":"refreshExplorer","scope":"inspect","effectful":false,"status":"implemented","input":"a048a80c8ad32e347c0d206d450837e80ccb2fb06ae2e80afdd35fb1affd85c2","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Refreshes the current prefix page through the same File API as listFolders. Use it after an external change or from the discoverable refresh shortcut.

Returns fresh entries and a continuation cursor when applicable. It may contact Cloudflare and does not mutate objects.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `source` (object), `cursor?` (string). A trailing `?` marks an optional field.

```js
await invoke('refreshExplorer', {"source":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"}});
```

### fileMetadata

<!-- method-contract {"name":"fileMetadata","scope":"inspect","effectful":false,"status":"implemented","input":"d9dd1acbfc6377b73e4ef797d15b6620be57e944da255b8f1c5ea1672d272cce","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Reads metadata for an exact object key from the authorized bucket. Use it to inspect a file in Properties or check whether the key exists.

Returns a File API object result, which can contain a null object. Metadata availability varies with Cloudflare’s listing response.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `source` (object), `key` (string). A trailing `?` marks an optional field.

```js
await invoke('fileMetadata', {"source":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"},"key":"images/example.png"});
```

### readFileChunk

<!-- method-contract {"name":"readFileChunk","scope":"inspect","effectful":false,"status":"implemented","input":"83d44bf014415ce4ed16d70b36f7f9338ca406f3fd362b6452e8b75708bd837d","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Reads a bounded object byte range using an exact key and byte offset. Reuse the strong ETag from the first accepted chunk to guard subsequent reads.

Returns bytes, total size, offset, ETag and EOF evidence inside the File API result. Discard mixed-version or incomplete data.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `source` (object), `key` (string), `offset` (integer), `etag?` (string), `length?` (integer). A trailing `?` marks an optional field.

```js
await invoke('readFileChunk', {"source":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"},"key":"images/example.png","offset":0});
```

### readFile

<!-- method-contract {"name":"readFile","scope":"inspect","effectful":false,"status":"implemented","input":"27b19a859caea4ff7ffdc320e4b0b39bb73e58fcdfd58e17beeae1840ce78376","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Reads a small file into a byte array for in-process consumers. Large or streaming callers should use readFileChunk instead.

Returns exact-key bytes in the file result. The resident payload is limited to 8 MiB.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `source` (object), `entry` (object). A trailing `?` marks an optional field.

```js
await invoke('readFile', {"source":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"},"entry":{"key":"images/example.png","folder":false}});
```

### fileAction

<!-- method-contract {"name":"fileAction","scope":"execute","effectful":true,"status":"implemented","input":"2d78e6ef5aa44871e21d0b8e74215377eeb9825d8fde1829e4ac679581960276","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Executes the selected mkdir, copy, move, rename, delete or createBucket action against exact authorized locations. Provide the action-specific entry, name or destination and choose a conflict policy where applicable.

Returns the File API outcome and an available provider receipt. Host confirmation, authorized preparation and verified source/destination matter because writes can change or remove objects. Inspect uncertain results before retrying.

**Access and status** · `execute` · registry effectful `true` · implemented.

**Input** · `action` ("mkdir" or "copy" or "move" or "rename" or "delete" or "createBucket"), `authorizeSetup?` (boolean), `source` (object), `destination?` (object), `entry?` (object), `name?` (string), `conflict?` ("keep" or "skip" or "replace"), `idempotencyKey` (string). A trailing `?` marks an optional field.

```js
await invoke('fileAction', {"action":"rename","source":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"},"entry":{"key":"images/example.png","folder":false},"name":"renamed.png","conflict":"skip","idempotencyKey":"fixture-rename"});
```

### inspectExplorerContextMenu

<!-- method-contract {"name":"inspectExplorerContextMenu","scope":"inspect","effectful":false,"status":"implemented","input":"88f2462262020dde4c53c1ec43dcac6bc3c87966bde442c9a78d5d0aaf8e7141","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Describes the File Explorer actions appropriate for the selected folder or file. Pass clipboard availability to include the correct paste state.

Returns menu descriptors, enablement, grouping and method IDs. Invocation still checks live authority when an action is selected.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `target` (object), `entry?` (object), `hasClipboard?` (boolean). A trailing `?` marks an optional field.

```js
await invoke('inspectExplorerContextMenu', {"target":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"},"entry":{"key":"images/example.png","folder":false}});
```

### searchDirectoryNames

<!-- method-contract {"name":"searchDirectoryNames","scope":"inspect","effectful":false,"status":"implemented","input":"4dfd64ed966d1899632db8d0a5e774379fd685f407792f81208ac31e02caea73","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Searches the exact current folder’s filename inventory. It can return cached or offline results while a refresh occurs, and never searches object bodies.

Returns matched entries, nextPageToken, completeness, freshness and provenance. Treat a partial or stale empty result as inconclusive.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `source` (object), `query` (string), `pageToken?` (string), `pageSize?` (integer), `refresh?` (boolean). A trailing `?` marks an optional field.

```js
await invoke('searchDirectoryNames', {"source":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"},"query":"example","pageSize":20});
```

## Downloads and public links

### listDirectoryObjects

<!-- method-contract {"name":"listDirectoryObjects","scope":"inspect","effectful":false,"status":"implemented","input":"a048a80c8ad32e347c0d206d450837e80ccb2fb06ae2e80afdd35fb1affd85c2","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Lists raw object inventory recursively under one authorized prefix. Follow nextCursor until null and enforce a finite budget and valid cursor progression.

Returns normalized source facts and nextCursor. ZIP streaming and URL export consume those pages outside the Chrome messaging response.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `source` (object), `cursor?` (string). A trailing `?` marks an optional field.

```js
await invoke('listDirectoryObjects', {"source":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"}});
```

### getPublicUrls

<!-- method-contract {"name":"getPublicUrls","scope":"inspect","effectful":false,"status":"experimental","input":"ef41d6cb1f266f72d3e4123e16d1874a9ce003030143b7c81bbd1ef677fff737","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Reads active HTTPS custom-domain associations for the exact bucket and optionally derives links for one existing object. Pass domains to require that every requested hostname is provider-verified.

Returns verified domains, check time and optional grouped file links. Verification covers domain ownership and TLS configuration, while public retrieval can still be affected by site policy. Requires the Get URL experiment.

**Access and status** · `inspect` · registry effectful `false` · experimental.

**Input** · `source` (object), `key?` (string), `domains?` (array of string). A trailing `?` marks an optional field.

```js
await invoke('getPublicUrls', {"source":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"},"key":"images/example.png"});
```

### getExportObjectMetadata

<!-- method-contract {"name":"getExportObjectMetadata","scope":"inspect","effectful":false,"status":"experimental","input":"d9dd1acbfc6377b73e4ef797d15b6620be57e944da255b8f1c5ea1672d272cce","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Reads safe exact-object metadata, existing Click2Cloud tags and available tag-budget evidence. Match the observed identity to the byte stream before packaging metadata.

Returns available HTTP and custom fields, explicit absent or redacted fields, tags and availability. Requires either optional metadata download flag and performs no provider write.

**Access and status** · `inspect` · registry effectful `false` · experimental.

**Input** · `source` (object), `key` (string). A trailing `?` marks an optional field.

```js
await invoke('getExportObjectMetadata', {"source":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"},"key":"images/example.png"});
```

## Destinations and Chrome menus

### getConfiguration

<!-- method-contract {"name":"getConfiguration","scope":"inspect","effectful":false,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Reads the authoritative durable product configuration, menu generation and all modes. Use it to obtain an expected revision before preview or commit.

Returns product settings, mode configuration and generation state. Missing established data surfaces as recovery rather than empty first-run state.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('getConfiguration', {});
```

### listDestinations

<!-- method-contract {"name":"listDestinations","scope":"inspect","effectful":false,"status":"implemented","input":"15ed4bf112960badde5bd6f520e3aba97a30a6bd4b534428c46c697610814994","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Pages through one selected destination mode with a cursor bound to the underlying revision. Narrow is the user-facing name of the nested mode.

Returns rows, total and nextCursor. Requery after STALE_CURSOR instead of continuing an old page.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `mode?` ("simple" or "nested" or "narrow" or "depth"), `cursor?` (string), `limit?` (integer). A trailing `?` marks an optional field.

```js
await invoke('listDestinations', {"mode":"simple","limit":20});
```

### previewConfigChange

<!-- method-contract {"name":"previewConfigChange","scope":"configure","effectful":true,"status":"implemented","input":"15c0f1e0420cbd2c90937975889e3726924e68053ea0012ff27bbf9294a86d86","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Validates proposed configuration changes against the current revision and authorized targets. Use it to see the projected menu impact before saving.

Returns a proposed configuration and menu diff. It does not apply changes to CURRENT or Chrome.

**Access and status** · `configure` · registry effectful `true` · implemented.

**Input** · `changes` (array of object), `expectedRevision` (integer). A trailing `?` marks an optional field.

```js
await invoke('previewConfigChange', {"changes":[{"type":"makeDefault","target":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"},"ensureSimple":true}],"expectedRevision":4});
```

### commitConfigChange

<!-- method-contract {"name":"commitConfigChange","scope":"configure","effectful":true,"status":"implemented","input":"e71ec93dfb68ee09433859938d716a20dcd09657c05c02dfe41f774e2a533c35","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Commits validated changes using the current revision and an idempotency key, then reconciles with Chrome. Pass prepareModes only for the established explicit destination-preparation workflow.

Returns configuration, native ACK or partial application, backup outcome and available destination readiness. A folder Make Default can use ensureSimple to create or reuse an exact Simple row with current native readiness.

**Access and status** · `configure` · registry effectful `true` · implemented.

**Input** · `changes` (array of object), `expectedRevision` (integer), `idempotencyKey` (string), `prepareModes?` (array of values). A trailing `?` marks an optional field.

```js
await invoke('commitConfigChange', {"changes":[{"type":"makeDefault","target":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"},"ensureSimple":true}],"expectedRevision":4,"idempotencyKey":"fixture-config"});
```

### previewNativeMenu

<!-- method-contract {"name":"previewNativeMenu","scope":"inspect","effectful":false,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Compiles the current desired native menu without applying it. Inspect rows, omission reasons and exact action identities when debugging presentation.

Returns the desired menu specification. The result describes planning and carries no observed Chrome rendering evidence.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('previewNativeMenu', {});
```

### previewContextMenu

<!-- method-contract {"name":"previewContextMenu","scope":"inspect","effectful":false,"status":"implemented","input":"2bcd00a3ea9ba69c279be13811439a2bfe4e123d70050e5311d6cc95d47df879","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Projects the current acknowledged menu when available, otherwise the proposed tree for a selected context. Use it to inspect visible groups and actionable leaves.

Returns the tree and whether it is native-acknowledged. Constrain actions to the reported generation and current grants.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `context?` ("image" or "link" or "page" or "selection" or "video" or "audio"). A trailing `?` marks an optional field.

```js
await invoke('previewContextMenu', {"context":"image"});
```

### inspectMenuTree

<!-- method-contract {"name":"inspectMenuTree","scope":"inspect","effectful":false,"status":"implemented","input":"c03b8d8f38823c1acdc2c6c2c62e114ea0400375747b0f16c3064bb1f1750b52","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Pages through rows of an existing generation, optionally below a specific parent. Use includeOmissions to look for compiler reasons when a target is missing.

Returns a bounded generation-specific view and next cursor when applicable. An unavailable generation fails with STALE_GENERATION.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `generation` (integer), `cursor?` (string), `limit?` (integer), `parentId?` (string), `recursive?` (boolean), `includeOmissions?` (boolean). A trailing `?` marks an optional field.

```js
await invoke('inspectMenuTree', {"generation":6,"limit":20,"includeOmissions":true});
```

### inspectNativeACK

<!-- method-contract {"name":"inspectNativeACK","scope":"inspect","effectful":false,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Reads the registrar’s desired specification, applied generation and pending state. Compare those observations before invoking a generation-bound action.

Returns native evidence and coverage by class. Chrome registration ACK does not establish actual rendered menus or cloud writes.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('inspectNativeACK', {});
```

### reconcileNativeMenu

<!-- method-contract {"name":"reconcileNativeMenu","scope":"configure","effectful":true,"status":"implemented","input":"0dde6cfc478f410922f5e6bcec2b06dc99d2c04146ae91d29217477591f0d533","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Attempts to apply the desired CURRENT-derived menu for the exact generation. Use after a recoverable native registration failure.

Returns a Chrome application outcome that can be partial. A stale generation is rejected, and reconciliation can refresh Depth inventory and readiness.

**Access and status** · `configure` · registry effectful `true` · implemented.

**Input** · `expectedGeneration` (integer). A trailing `?` marks an optional field.

```js
await invoke('reconcileNativeMenu', {"expectedGeneration":6});
```

### getOrganizationSuggestion

<!-- method-contract {"name":"getOrganizationSuggestion","scope":"inspect","effectful":false,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Evaluates the existing native projection for an optional organization suggestion. Use it to show a candidate without applying it automatically.

Returns the eligible suggestion or the absence of one. A suggestion has no effect on saved configuration without a separate commit.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('getOrganizationSuggestion', {});
```

## Right-click saves and History

### dispatchSave

<!-- method-contract {"name":"dispatchSave","scope":"execute","effectful":true,"status":"implemented","input":"81024674f51edf6833e7c6bb3de2660b47b5f11bf32827e627b3535fcf66b494","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Runs the canonical right-click save for the supplied registered item ID and generation. Supply only an eligible source and a unique idempotency key after the host confirms the action.

Returns the remote operation and verification evidence when available. Cloudflare transfers the public source remotely and rejects browser-supplied local bytes.

**Access and status** · `execute` · registry effectful `true` · implemented.

**Input** · `itemId` (string), `generation` (integer), `context?` ("image" or "link" or "video" or "audio" or "page"), `source` (object), `idempotencyKey` (string). A trailing `?` marks an optional field.

```js
await invoke('dispatchSave', {"itemId":"fixture-menu-row","generation":6,"source":{"url":"https://example.org/example.png","filename":"example.png"},"idempotencyKey":"fixture-save"});
```

### dispatchExplorerSave

<!-- method-contract {"name":"dispatchExplorerSave","scope":"execute","effectful":true,"status":"provider-gated","input":"942b74d2be3e3a2becc74c30d73bec26a8794fa5527b11b7c5d498a54e349f7e","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Resolves the selected Explorer source and the native destination for a save attempt. Call only when an authorized provider source transfer is available.

Returns a refusal for current private Cloudflare Explorer sources, which cannot be staged through the extension for this operation.

**Access and status** · `execute` · registry effectful `true` · provider-gated.

**Input** · `itemId` (string), `generation` (integer), `context?` ("image" or "link" or "video" or "audio" or "page"), `source` (object), `entry` (object), `idempotencyKey` (string). A trailing `?` marks an optional field.

```js
await invoke('dispatchExplorerSave', {"itemId":"fixture-menu-row","generation":6,"source":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"},"entry":{"key":"images/example.png","folder":false},"idempotencyKey":"fixture-request"});
```

### invokeProviderAction

<!-- method-contract {"name":"invokeProviderAction","scope":"execute","effectful":true,"status":"implemented","input":"2aabbc7318f12219f338e5446828f9ac65ca8819bc83356efa92066fea12e249","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Invokes the canonical provider entry for the optional source and generation. Its route can request connection/setup or dispatch a verified save when the provider entry resolves to a ready target.

Returns the provider action or remote operation outcome. Confirmation and actual provider support remain necessary.

**Access and status** · `execute` · registry effectful `true` · implemented.

**Input** · `provider` ("cloudflare" or "google-drive" or "dropbox" or "onedrive"), `generation?` (integer), `source?` (object), `idempotencyKey` (string). A trailing `?` marks an optional field.

```js
await invoke('invokeProviderAction', {"provider":"cloudflare","idempotencyKey":"fixture-request"});
```

### inspectRemoteHistory

<!-- method-contract {"name":"inspectRemoteHistory","scope":"inspect","effectful":false,"status":"implemented","input":"e1c6432cc675582e11774fdfd4de6e272c7282c55a264df7e396c090d4da7ad8","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Fetches existing remote-save and diagnostic results. Supply limit and cursor to page, or select the customer projection when displaying ordinary History.

Returns rows or a page with nextCursor. Status and independent proof should be interpreted from each record.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `customer?` (boolean), `cursor?` (string), `limit?` (integer). A trailing `?` marks an optional field.

```js
await invoke('inspectRemoteHistory', {"customer":true,"limit":25});
```

### inspectRemoteReceipt

<!-- method-contract {"name":"inspectRemoteReceipt","scope":"inspect","effectful":false,"status":"implemented","input":"6431c2e903b6c395b8c115eae8f0d6700b864f465034469536378dea97f2960b","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Inspects one prior operation by identifier and verifies observations through the existing host when applicable. Pass the exact target when known.

Returns the operation record or its reconciliation state inside an inspection envelope. A successful inspection can report an uncertain transfer.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `operationId` (string), `target?` (object). A trailing `?` marks an optional field.

```js
await invoke('inspectRemoteReceipt', {"operationId":"fixture-operation","target":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"}});
```

### cancelRemoteOperation

<!-- method-contract {"name":"cancelRemoteOperation","scope":"execute","effectful":true,"status":"implemented","input":"7a10cec99478a2b07c0cc57ee1795bb05266f0b1a5f037d479bcbd4a274471f6","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Requests cancellation of the exact authorized remote operation. Use its known target and operation ID rather than inferring them from a pending UI card.

Returns the provider cancellation or terminal result. Cancellation cannot undo an object write already completed.

**Access and status** · `execute` · registry effectful `true` · implemented.

**Input** · `target` (object), `operationId` (string). A trailing `?` marks an optional field.

```js
await invoke('cancelRemoteOperation', {"target":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"},"operationId":"fixture-operation"});
```

### openRemoteResult

<!-- method-contract {"name":"openRemoteResult","scope":"inspect","effectful":false,"status":"implemented","input":"c06ae979adcbe648789eb759ee0fd5ab4b59d08e506df71a7bd834b3f888e3b5","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Resolves an existing verified save receipt to its exact authorized Explorer object. Use it for the Go to action in History.

Returns a target and highlightKey or an explicit reason the result cannot be located. It does not open the original web source.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `operationId` (string). A trailing `?` marks an optional field.

```js
await invoke('openRemoteResult', {"operationId":"fixture-operation"});
```

### getHistoryPreferences

<!-- method-contract {"name":"getHistoryPreferences","scope":"inspect","effectful":false,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Reads the existing History range, preview option and timezone. Use it before painting History settings or resolving a day boundary.

Returns the persisted validated options or the existing defaults. No History entry is created.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('getHistoryPreferences', {});
```

### setHistoryPreferences

<!-- method-contract {"name":"setHistoryPreferences","scope":"configure","effectful":true,"status":"implemented","input":"67b01247a2fa4e50d8d8b66732a8e274787dd9fbfbd627ca6849b6b5e777663c","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Persists the History range, preview behavior and IANA timezone as one validated update. The daily toolbar badge recomputes after a successful change.

Returns the saved options. This changes preferences without rewriting prior operation records.

**Access and status** · `configure` · registry effectful `true` · implemented.

**Input** · `range` ("all" or "daily" or "weekly"), `previews` ("all" or "first" or "closed"), `timezone` (string). A trailing `?` marks an optional field.

```js
await invoke('setHistoryPreferences', {"range":"daily","previews":"first","timezone":"America/Chicago"});
```

## Backup, recovery and outlines

### chooseBackupLocation

<!-- method-contract {"name":"chooseBackupLocation","scope":"restore","effectful":true,"status":"implemented","input":"af9c793519847c28de252458b1d5fc682c28613235c2b036ed8596c20259b166","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Attaches a previously locally staged, user-authorized external folder as a recovery owner. The rebuild purpose selects the preservation workflow.

Returns external filesystem authorization or a blocking status. Host confirmation is required and the caller cannot submit an arbitrary filesystem path.

**Access and status** · `restore` · registry effectful `true` · implemented.

**Input** · `purpose?` ("rebuild"). A trailing `?` marks an optional field.

```js
await invoke('chooseBackupLocation', {"purpose":"rebuild"});
```

### inspectRecoveryCoverage

<!-- method-contract {"name":"inspectRecoveryCoverage","scope":"inspect","effectful":false,"status":"implemented","input":"5ff2948f52c20bd9190a03d58a33c14f3283d4ad64cc801458bd329d1a93cbc5","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Reads coverage of the enabled recovery crawl for an exact target. Use it to show how much of the provider tree has actually been captured.

Returns the local outline and coverage details. It provides no proof of remote object contents.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `target` (object). A trailing `?` marks an optional field.

```js
await invoke('inspectRecoveryCoverage', {"target":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"}});
```

### runRecoveryPage

<!-- method-contract {"name":"runRecoveryPage","scope":"restore","effectful":true,"status":"implemented","input":"5ff2948f52c20bd9190a03d58a33c14f3283d4ad64cc801458bd329d1a93cbc5","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Advances the authorized recovery crawl for an enabled bucket by a bounded page. Use repeated explicit calls only while the returned status indicates remaining work.

Returns crawl progress or failure. It reads cloud metadata and can write the authorized recovery destination locally.

**Access and status** · `restore` · registry effectful `true` · implemented.

**Input** · `target` (object). A trailing `?` marks an optional field.

```js
await invoke('runRecoveryPage', {"target":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture","bucketName":"test-bucket","prefix":"images/"}});
```

### inspectBackupRoots

<!-- method-contract {"name":"inspectBackupRoots","scope":"inspect","effectful":false,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Checks the current external recovery owner and storage availability. Use it to report whether a private backup folder is reachable.

Returns the backup status and host capability. Access errors can require a fresh user-authorized folder connection.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('inspectBackupRoots', {});
```

### listRecoveryPolicies

<!-- method-contract {"name":"listRecoveryPolicies","scope":"inspect","effectful":false,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Reads the current cadence, mode settings and per-bucket recovery configuration. Use this before deciding which target can be crawled.

Returns the persisted recovery policy. Policy enablement is distinct from coverage.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('listRecoveryPolicies', {});
```

### writeRecovery

<!-- method-contract {"name":"writeRecovery","scope":"restore","effectful":true,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Writes and verifies the available external backup for the current configuration. Use after selecting and authorizing a backup location.

Returns the external readback outcome or blocked reason. The effect is a local recovery file.

**Access and status** · `restore` · registry effectful `true` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('writeRecovery', {});
```

### requestRestorePreview

<!-- method-contract {"name":"requestRestorePreview","scope":"restore","effectful":false,"status":"implemented","input":"b971e47ce7f11d0567e6d21845cce391b1986b63340222989e914bdb03948af2","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Examines validated recovery sources or an explicit rebuild proposal. Use the returned token and reviewed evidence before requesting restore.

Returns candidate configuration, source provenance and availability. Evidence can change before commit, and a native menu is only a partial historical projection.

**Access and status** · `restore` · registry effectful `false` · implemented.

**Input** · `rebuild?` (object). A trailing `?` marks an optional field.

```js
await invoke('requestRestorePreview', {});
```

### restoreRightClickMenu

<!-- method-contract {"name":"restoreRightClickMenu","scope":"restore","effectful":true,"status":"implemented","input":"837ac7c34a0d5f75b6324d98c222474f2be918a1c838ead5950daa3e3c63f9aa","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Revalidates a preview token, preserves recovery evidence, applies the approved configuration and attempts native reconciliation. Use the current revision when available.

Returns configuration, preservation and native outcomes, with reconnect still required. Actual cloud saves remain a separate verified operation.

**Access and status** · `restore` · registry effectful `true` · implemented.

**Input** · `expectedRevision?` (integer), `previewToken` (string), `idempotencyKey` (string), `rebuild?` (object). A trailing `?` marks an optional field.

```js
await invoke('restoreRightClickMenu', {"expectedRevision":4,"previewToken":"fixture-preview","idempotencyKey":"fixture-request"});
```

### inspectWholeCloudJobs

<!-- method-contract {"name":"inspectWholeCloudJobs","scope":"inspect","effectful":false,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Reads the existing account-scoped cloud outline jobs. Use it to inspect work that is enabled, paused on auth or blocked on external storage.

Returns per-job status and checkpoint information. The returned outline jobs are unrelated to download diagnostics.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('inspectWholeCloudJobs', {});
```

### enableWholeCloudJob

<!-- method-contract {"name":"enableWholeCloudJob","scope":"configure","effectful":true,"status":"implemented","input":"d7657a4975c9bc9c034aa64649f39467d98612d9b81be30c699e98339e3ce83c","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Enables periodic metadata outline capture for the exact authorized account. Select weekly or daily cadence when needed and provide the external storage authority.

Returns job configuration or a blocking condition. Requires confirmation and can create local outline artifacts without changing cloud files.

**Access and status** · `configure` · registry effectful `true` · implemented.

**Input** · `identity` (object), `cadence?` ("weekly" or "daily"). A trailing `?` marks an optional field.

```js
await invoke('enableWholeCloudJob', {"identity":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture"},"cadence":"weekly"});
```

### disableWholeCloudJob

<!-- method-contract {"name":"disableWholeCloudJob","scope":"configure","effectful":true,"status":"implemented","input":"4d6d65614ad15d6e98f2197952cc485df30efc046c22093935881e36ea9381ac","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Disables the existing outline job for the exact account identity. Use it to stop periodic work while preserving the account connection.

Returns the job’s updated state. Confirmation protects against an unintended stop.

**Access and status** · `configure` · registry effectful `true` · implemented.

**Input** · `identity` (object). A trailing `?` marks an optional field.

```js
await invoke('disableWholeCloudJob', {"identity":{"provider":"cloudflare","connectionId":"cloudflare:fixture","accountId":"fixture"}});
```

## Appearance, shortcuts and diagnostics

### getGalleryLoadingVisual

<!-- method-contract {"name":"getGalleryLoadingVisual","scope":"inspect","effectful":false,"status":"implemented","input":"a6bb6cae691dcceadb483ebc6eeb69b4dfe7a9933a5f41d6f167064892fa7b90","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Reads the shared local loading visual choice and its revision. Request includeMedia only when decoding the authorized local media for display.

Returns mode, media summary and optional base64. Media content is local and size-limited.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `includeMedia?` (boolean). A trailing `?` marks an optional field.

```js
await invoke('getGalleryLoadingVisual', {"includeMedia":false});
```

### setGalleryLoadingVisual

<!-- method-contract {"name":"setGalleryLoadingVisual","scope":"configure","effectful":true,"status":"implemented","input":"087347abb86e72ea95a8b932f572193cea1d7c94a0c928813de006b7aa1da5c6","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Stores the gallery loading visual with revision protection. Choose plain, math or media, and provide or remove media through the corresponding fields.

Returns the new preference and revision. Supported media is validated and capped at 8 MiB.

**Access and status** · `configure` · registry effectful `true` · implemented.

**Input** · `expectedRevision` (integer), `mode` ("math" or "media" or "plain"), `removeMedia?` (boolean), `media?` (object). A trailing `?` marks an optional field.

```js
await invoke('setGalleryLoadingVisual', {"expectedRevision":4,"mode":"plain"});
```

### listCommands

<!-- method-contract {"name":"listCommands","scope":"inspect","effectful":false,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Lists registered shortcut-eligible host operations and trusted Shelf actions. Use kind to distinguish API commands from controls that run only inside the app.

Returns command IDs, contexts, parameter binding constraints, effects and proposed defaults. Discovery alone does not execute an action.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('listCommands', {});
```

### getShortcutBindings

<!-- method-contract {"name":"getShortcutBindings","scope":"inspect","effectful":false,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Reads effective focus-local bindings for all known commands. A null value means the action is unassigned.

Returns the validated binding map with defaults applied. Malformed storage records fall back to valid bindings.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('getShortcutBindings', {});
```

### setShortcutBinding

<!-- method-contract {"name":"setShortcutBinding","scope":"configure","effectful":true,"status":"implemented","input":"ee13860e4e6723c003e71c3d30e570fc5021aa9b5858799dd695cd325f2d789b","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Changes one registered command’s keyboard chord. Pass null to unassign it, or provide an available normalized modifier combination.

Returns the effective binding map after a successful durable write. Reserved or duplicate chords fail with a typed code and leave the previous settings active.

**Access and status** · `configure` · registry effectful `true` · implemented.

**Input** · `commandId` (string), `chord` (string or null). A trailing `?` marks an optional field.

```js
await invoke('setShortcutBinding', {"commandId":"explorer.focusSearch","chord":"Ctrl+Shift+F4"});
```

### resetShortcutBindings

<!-- method-contract {"name":"resetShortcutBindings","scope":"configure","effectful":true,"status":"implemented","input":"ff1b2d8857c8e4a2cd87b566a798c5d1cd937fe8a13363e59a51231b4b328939","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Restores the default map for every registered command. Use this from an explicit preferences reset action or a trusted script.

Returns the restored bindings. Open Shelves receive changes through Chrome storage notification.

**Access and status** · `configure` · registry effectful `true` · implemented.

**Input** · Empty object. A trailing `?` marks an optional field.

```js
await invoke('resetShortcutBindings', {});
```

### describeCapabilities

<!-- method-contract {"name":"describeCapabilities","scope":"inspect","effectful":false,"status":"implemented","input":"205a32094780fa30ad733a552af89b9d3672b51a93e0341031d0eb33ca727fb1","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Discovers the canonical V3+1.1 registry and its input and output schemas. Request the reliability section for per-operation ownership and proof limits.

Returns the build, tools and host capability flags, or the reliability map. It is safe to use before selecting any effectful action.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `section?` ("reliability"). A trailing `?` marks an optional field.

```js
await invoke('describeCapabilities', {});
```

### getEngineHealth

<!-- method-contract {"name":"getEngineHealth","scope":"inspect","effectful":false,"status":"implemented","input":"df623feaeeab5d47a2f65aa99519c7fdb477aca7df50cd82e359ac08869263e9","output":"ab798735d15fe9391d3805665933d0e4638aa9aa17d91e9585c7345041947d79"} -->

Inspects CURRENT, recovery and Chrome registration readiness. Choose the trace view for bounded operation diagnostics or support for a safe minimized report.

Returns health, paginated traces or a support report. Its evidence is bounded and cannot invent an unobserved provider or filesystem result.

**Access and status** · `inspect` · registry effectful `false` · implemented.

**Input** · `view?` ("health" or "trace" or "support"), `operationId?` (integer), `cursor?` (string), `limit?` (integer). A trailing `?` marks an optional field.

```js
await invoke('getEngineHealth', {"view":"health"});
```

## Shortcut and UI commands

The Keyboard Shortcuts card is last in ordinary Settings. The resolver ignores typing, IME composition and modal interactions. Browser and OS reservations can prevent dispatch before the Shelf sees a key. Use focused-Shelf bindings and discover the effective preferences with `getShortcutBindings`.

| Stable command ID | Kind | Default | Effect |
| --- | --- | --- | --- |
| `explorer.toggleToolbarRows` | ui | Ctrl+Shift+F8 | Local Explorer layout |
| `explorer.resetPanelSplit` | ui | Ctrl+Shift+F9 | Local Explorer layout |
| `explorer.focusSearch` | ui | Ctrl+Shift+F7 | Local focus |
| `file.refreshExplorer` | api | Unassigned | Read the current folder from the provider |

The three UI commands use Shelf presentation state. The refresh command uses the active authorized directory and the existing File API method. There is no downloadable receipt API for bulk archives and no terminal result is stored in History as a bulk-download record.
