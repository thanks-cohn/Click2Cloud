# Experimental — Bytes to Cache: Offline-Ready Save Queue
Date: 2026-11-07
Status: Experimental proposal; NOT implemented or verified.
Depends on: Project_direction/PERSISTENT_URL_BACKED_SAVE_QUEUE_2026-11-07.md

## Owner concept
Settings option **Bytes to Cache** allows a user to reserve a chosen storage budget for eligible file bytes captured when they right-click while not logged in (or otherwise unable to upload). Configure total byte allocation, permitted file-type/extension rules and size ranges (minimum/maximum per file). Files outside selected rules use the metadata-only queue rather than pretending their bytes were cached.

## Queue integration and UX
Use the SAME persistent queue as the URL-backed intent system. Show explicit storage state:
- QUEUED (URLs only, no bytes);
- CACHE (bytes locally committed and retrievable);
- UPLOADING CACHE;
- VERIFIED IN CLOUD (provider receipt confirmed);
- NEEDS ATTENTION (missing bytes, expired source, permissions, quota, failure).
For CACHE entries, render a preview from the locally cached bytes (if safely previewable), independent of original URL availability, with filename, timestamp, parent/source clickable URLs under **More**, actual local byte size and target destination. Provide **Upload** (keep local cached copy) and **Upload & Delete** (delete cached bytes ONLY AFTER independently verified successful cloud write). Remove and retry remain distinct actions. Never remove bytes on upload attempt, timer or browser ACK.
Prefer batch upload of selected/all cached entries with transparent progress, cancellation, and retry.

## Settings
Bytes to Cache: OFF by default during experimentation. User-configurable quota, acceptable types, permitted single-file-size range, and clear/evict policy. Display actual usage vs configured limit and any effective browser quota; report storage availability accurately.
When quota is reached show: **Cache limit reached!** Then offer to upload saved files, manage/remove cached items, increase the configured limit if feasible, or continue creating URL-only queue entries. Never automatically overwrite/evict pending bytes without a disclosed opted-in eviction policy.

## Architecture and hard constraints
Capture is subject to browser CORS, host permissions, web authentication, cross-origin cookies, URL expiry, streaming restrictions, content types, extension storage quotas and available disk space. Do NOT promise all right-clicked bytes can be captured or that extension storage provides guaranteed unlimited disk allocation. Evaluate IndexedDB/OPFS/companion-worker options with browser limits, write transaction integrity, and startup recovery.
Verify complete bytes before marking CACHE (size/digest/checkpoint as appropriate). Avoid accidental browser download to ordinary Downloads for TRUE REMOTE items; distinguish deliberate local caching from remote-only operation. Never upload original page/source URLs as storage-provider object metadata.
Use a canonical API for cache.configure, cache.reserve, cache.write, cache.status, cache.preview, cache.upload, cache.uploadAndDelete, cache.remove and cache.clear. The GUI uses API and all transitions emit auditable states; never duplicate business logic.
Cache files can contain sensitive information. Provide local deletion, encrypted-at-rest design assessment, retention/expiry options and explicit warning that local cached bytes use device storage and are not TRUE REMOTE for that item during the caching stage.
Prevent eviction/races when multiple writes happen near limit; reserve quota atomically and release after failure/verified delete. Do not mistake metadata-only entries for cached entries. Preserve files across restart/update as supported, and detect/report browser storage eviction rather than showing nonexistent bytes.

## Acceptance scenarios (to implement and prove)
1. Logged out, right-click supported permitted image under configured limits -> fully stored CACHE item, preview served from local bytes.
2. URL later expires -> cached preview and bytes remain usable for upload.
3. Select Upload -> cloud receipt verified; CACHE bytes remain until explicit removal.
4. Select Upload & Delete -> cloud receipt independently verified, then local bytes deleted; failure retains bytes and clear error.
5. Quota hit with concurrent enqueues -> no over-allocation; visible Cache limit reached!; optional URL-only fallback without falsely claiming cached bytes.
6. Disallowed type or outside min/max -> URL-only queue; no hidden caching.
7. Browser restart and interrupted capture/upload -> integrity reconciliation and recoverable states.
8. If browser cannot access bytes or quota cannot be reserved -> honest fallback and no success animation.

## Relationship to main direction
Keep experimental cache isolated, disabled by default until real browser and end-to-end storage tests pass. No changes to REDOWN or live transfer engine authorized by this document.
