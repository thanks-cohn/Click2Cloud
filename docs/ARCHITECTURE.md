# V3+1 architecture: one operational engine, two real menu surfaces

The REDOWN Portal menu is **not** a mock-up, training simulator, or secondary implementation. It must let signed-in users right-click real images and actually upload them to cloud destinations. Chrome uses the same compiler and save dispatcher.

## Functional seams

1. **Discovery**: Provider-specific authenticated adapters list real buckets/folders and return a canonical paginated snapshot, including zero-byte R2 directory markers.
2. **Configuration**: Versioned schemas store user-approved destinations, labels, mode, depth per bucket, and provider connection state.
3. **Compiler**: A pure deterministic function consumes a normalized snapshot and configuration and emits a validated MenuSpec. No Chrome APIs, DOM access, timers, network or writes here.
4. **Presentation**: Portal implements a custom context-menu DOM surface, while Chrome adapter registers native `chrome.contextMenus` items. Both consume MenuSpec; visual placement may differ because Chrome owns native presentation.
5. **Dispatch**: Clicks resolve canonical SaveIntent using the same action IDs and provider bytes-upload logic. Browser fetch can use original source URL internally; no browsing provenance is forwarded to provider APIs.
6. **Result**: Show verified success and increment counters only after provider-confirmed upload. Clicking/starting only triggers click feedback, never success.

## Mode semantics

- **Simple**: One flat actionable menu leaf per configured destination. Default label is the lowest folder segment, else bucket.
- **Narrow**: Only configured destination paths and their ancestors form the hierarchy. A configured parent that also has children must provide an explicit `Save here` action leaf.
- **Depth**: All discovered folders up to the selected positive depth appear, including unconfigured folders. Nodes with children provide an explicit `Save here` leaf; the depth limit is relative to the bucket root, not an arbitrary selected path.
- **Google Drive, Dropbox, OneDrive**: Always flat native provider leaves under REDOWN; their internals must not be coupled to R2's V3 mode projection.
- **S3 siblings**: Additional S3 providers use their own namespace and configuration; never secretly nest under Cloudflare.

## Determinism / diagnostics

- Input schema version is explicit.
- Paths use '/' with no empty components and no traversal.
- Stable IDs derive from canonical node keys; hashes must be collision-checked before registering.
- Runtime ordering uses binary comparisons rather than locale-sensitive sorting.
- The compiler rejects ambiguous sibling labels and missing paths with typed errors; conflicts become explicit user choices saved into configuration.
- Any unexpected native Chrome registration failure is surfaced; apply is idempotent and rollback restores last-known-good configuration.
- The portal and native adapters must be tested against the same saved golden MenuSpec fixtures and upload-receipt contracts.

## Boundaries before production

The initial compiler and dispatcher in this repo are **bootstrap code**, not a finished Portal, integrated Cloudflare client, Chrome extension, or proven V3 parity. Test real Chrome submenu limitations, authentication, R2 listing pagination, failures, restart/recovery, malicious URLs, and source privacy before transplanting.
