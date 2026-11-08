# Project direction — Persistent URL-backed Save Intent Queue
Date: 2026-11-07
Status: Proposed owner direction; NOT implemented or verified.
Scope: Click2Cloud/REDOWN right-click save workflows; API-first.

## Core premise
A right-click is an enduring save intent, not a claim that a download already succeeded. Before acknowledging the request, persist a queue record locally. If provider authorization, destination readiness or transfer infrastructure is missing, keep the request pending. When the user authenticates/repairs the correct provider, eligible queued requests may resume; no false success.

## Minimal retained metadata
For each right-click retain:
- Parent page URL (where action originated) and asset/source URL (actual target), distinguished clearly.
- Requested filename/extension and known file type; capture timestamp.
- Intended provider/bucket/path, including whether the target was explicitly chosen versus a default resolved at enqueue time. Do not change that target silently after Settings/default updates.
- Queue ID, state, retry attempts, last error, receipt and verified final location when available.
- Optional source-derived thumbnail/preview information when safely accessible. This is not proof that file bytes have been cached.

Source and parent URLs are local provenance/queue data and must NOT be sent as metadata to cloud storage providers. An authorized remote fetch may need the source URL to retrieve bytes. Protect sensitive URLs/tokens with local-only access controls, minimize retention and provide delete/clear controls. Redirects and temporary signed URLs may expire; do not imply future retrieval is guaranteed.

## Queue UI (History-like)
Each item: filename + timestamp, preview (only actual asset-derived image when available), provider/destination, unambiguous status, expandable **More** showing **clickable Parent URL and Source URL**.
Actions: Retry this, Retry all eligible, open parent/source, remove, and right-click the real preview to choose save destination/retry. The user can revisit the page if the resource must be re-authorized, or select only those assets they want to keep. Do not treat generic decorative images as saved-asset previews.
Distinguish WAITING_FOR_LOGIN, WAITING_FOR_PROVIDER, QUEUED, IN_PROGRESS, NEEDS_ATTENTION (e.g. expired URL), VERIFIED_SUCCESS, FAILED, and CANCELLED. A URL saved to the queue is **not** a downloaded file; provide explicit indication when bytes are not locally available.

## API before GUI
One canonical service owns queue.enqueue, queue.list, queue.get, queue.retry, queue.retryAll, queue.pause, queue.resume, queue.remove, queue.clear and queue.getReceipt; UI/context menu call the same service. Document inputs, IF/THEN/ELSE behavior, auth gates, authorization, persistence, security, idempotency/dedup policy, state machine, failure codes and observable receipts. Never claim browser context-menu ACK equals verified remote success.

## Persistence and reliability
Use durable extension storage appropriate for volume, transactional intent writes, bounded retry/backoff and restart recovery. Make duplicates an explicit policy (repeat right-click can represent distinct user intent). Resume only against a valid authorized provider session and exact intended destination. TRUE REMOTE fetch/write/independent HEAD or equivalent provider verification is retained for Cloudflare; History SUCCESS only after verified provider receipt. Authentication, worker, R2, timeout, expired URL and browser restart must not discard queued intent.
Preview fetches must be lazy, secure, privacy-aware, and never silently send authenticated sources to a third-party thumbnail service.

## Acceptance scenarios (implementation requirement, not passing tests)
1. Right-click while logged out -> durable pending row containing parent/source URLs; browser restart retains it; login resumes exact target.
2. Expand More -> both captured clickable URLs, no swapped parent/source; actual preview if accessible; no invented preview.
3. Right-click real preview -> retry/save selected item; Retry all respects eligibility and skips verified items.
4. Signed URL expires -> NEEDS_ATTENTION with parent link and retry action, never fabricated success.
5. Destination setting changes -> existing queued intent retains original target and requests explicit retargeting if needed.
6. Provider receives bytes + filename only, not provenance metadata; any necessary URL use stays inside authorized fetch mechanism.
7. No transfer success receipt without independent provider verification.

## Relationship to experimental byte cache
Separate module and policy; metadata-only queue is baseline and must work when byte cache is OFF, full, cleared or unsupported. Experimental cached entries are visible in the SAME queue with explicit CACHE status, but this proposal does not require local file-byte capture.
