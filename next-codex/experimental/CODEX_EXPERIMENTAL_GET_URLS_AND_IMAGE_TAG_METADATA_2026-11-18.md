# NEXT CODEX / EXPERIMENTAL — Right-click Get / Add URLs + durable image tags

**Date:** November 18, 2026  
**Status:** NEW EXPERIMENTAL IMPLEMENTATION FEATURE, **not currently shipped**.  
**Repository:** Click2Cloud only; isolated feature branch.  
**Priority:** After the immediate Search/gallery/Manager UX fixes and the audited Worker reliability changes have their own validation gates. Experiment behind a user-visible feature flag, off by default, with no surprise public exposure or mutation of private buckets.

## 1. Preserve the previously agreed Get URL workflow

The earlier product plan was **Cloudflare R2 object → right-click Get URL**, not "download a URL into R2". A user with an authorized public custom domain mapped to a bucket should be able to produce/copy a real URL for a selected object and then bulk export actual URLs from a directory.

- In Explorer, **right-click a file/image → Get URL / Add URLs** (label distinction can be polished). Show an object-scoped editor with a list of **multiple user-authorized website/custom-domain URL mappings per object**, not a single URL field.
- If no authorized public URL mapping is available, prompt to **set one up/attach an existing Cloudflare-linked custom domain**; don't invent a working URL, assume public access, or silently change bucket/domain permissions. Provide a clear private/not-public state and link to the relevant authorized setup flow. A proposed URL must be identified as unverified until actually validated.
- Support **adding/editing/removing URL entries** in the object's metadata/manifest, with website/domain identity, canonical object key, URL, source (`verified custom domain` vs `user-provided reference URL` if provided), validation/provenance, last-verified time and optional human label. Keep multiple website URLs attached to one object and preserve their distinctions. Distinguish an arbitrary user-pasted URL from a verified public URL.
- A URL derived from a verified mapping must encode all object key components correctly without inventing prefixes or public domain policy, including special characters, spaces and Unicode. Avoid leaking private objects/tokens or granting public access automatically.
- **Right-click a directory → Export URLs**: enumerate the exact authorized scope, group by file/object and output **each URL on its own line** under its file identity, with an optional machine-readable CSV/JSON/JSONL export preserving all URLs per file. Directory-wide exports must use bounded, paginated listing and honor incomplete scopes; no falsely complete bulk exports, no provider calls on every copy when durable inventory is fresh and valid.
- Keep copy-to-clipboard for one verified URL or multiple URLs, with a clear indication of what was copied. If there are no verified URLs, don't pretend the object has a live public link.

This is a fundamental Click2Cloud product pillar with an experimental first implementation, not a replacement for existing right-click save-to-cloud.

## 2. Right-click image → Add/Edit Tags stored as metadata

- Right-click a saved image in File Explorer or from preview → **Tags / Edit Tags**. Enter multiple plain-text labels; add, remove and edit. Show saved tags in image Properties/preview and make them accessible programmatically through the **canonical File API** (not a GUI-only note).
- Treat this as persistent **cloud object metadata**, not only IndexedDB/Chrome local storage. Codex must determine the safe, documented R2 metadata mechanism. If R2 requires replacing/copying an object to change user metadata, handle it through the existing trusted File API with exact-object identity, verified effects, permissions, conflict checks, quotas and explicit consent where needed; a durable versioned sidecar may be safer than rewriting multi-GB images, but must be justified and kept object-consistent. Never assert an R2 metadata update is a cheap in-place edit without confirming the provider capabilities.
- Don't alter the original image pixels, EXIF, filenames or actual file bytes. Preserve existing Content-Type, custom metadata, HTTP headers, ETag/version assumptions, public URL mappings, permissions and source data; detect lost-update races, moved/deleted objects, rename/copy behavior and account transitions.
- Tags need a documented schema with bounded length/count, Unicode normalization and case-insensitive search semantics (if future tag search is planned). Unknown or unsupported tags must not be silently discarded. Use an object-identity/generation or ETag-conditioned update/reconciliation mechanism; clearly distinguish pending, verified, failed and uncertain updates.
- Allow safe single-object tag editing first. Bulk tagging, folder inheritance, automated categorization, embedded EXIF tagging and full-text tag search are explicitly **not** part of this initial experiment unless separately authorized.

## 3. API, reliability, privacy and test requirements

- Define shared File API operations, e.g. `listObjectLinks`, `addObjectUrl`, `removeObjectUrl`, `readObjectTags`, `setObjectTags`, `exportDirectoryUrls`, but reuse actual app naming/authorization contracts. Same exact source/account/bucket/key identity as File Explorer; idempotency keys, verifiable receipts, explicit metadata ownership and tested fallback for failures.
- Preserve all existing metadata and previous URL/tag values under interruptions and concurrent edits; do not rewrite the whole object unsafely just to attach a label.
- Never turn private content public as a side effect of a Get URL click. Explicit authorization is required for domain configuration, user metadata writes and any cloud-chargeable mutation.
- Test 0/1/many URLs on one image, two linked custom domains, unavailable domain, missing custom domain, public vs user-supplied unverified references, URL encoding, private object access, one/multiple tags, add/remove, Unicode, rename/move, large objects, stale accounts, multi-Shelf concurrent edits and failure/restart recovery. Verify directory export for 100/10,000 objects and incompletely loaded lists.
- Use mocks/disposable test objects only; **no automatic production R2 mutations, domain changes or public exposure**. Report actual Cloudflare docs and any remaining provider capability gates.
- Maintain separation between source-derived cached filename metadata, true R2 object metadata/sidecar, public-domain mapping, and ordinary verified save receipts. None is a stand-in for the other.

## 4. Deliverable

Implement a small, genuinely functional feature-flagged proof in the Click2Cloud File API and Explorer right-click UI, with persistent metadata tests and a migration/protocol document. If safe durable cloud metadata writes or public-domain validation cannot be demonstrated locally, leave those operations gated as **blocked/unverified** with a concrete plan, rather than shipping fake success. Do not start a broad multi-provider rollout.

**Parent [next Codex request](../CODEX_NEXT_EXPLORER_SEARCH_UI_AND_WORKER_IMPLEMENTATION_2026-11-18.md).**
