# Automatic Cloud Routing — File-Type Direct2Cloud Downloads
**Status:** Project direction / proposed feature (not implemented)
**Products:** Click2Cloud engine first; REDOWN consumer UX integration
**Recorded:** 2026-11-12

## Vision
Let a user explicitly designate file extensions or MIME types (ZIP/7Z/RAR, PDF, MP4, images, etc.) for automatic delivery to a chosen cloud provider, bucket, and folder when a browser download begins. Example: ZIP -> Cloudflare R2 / Archives. Unmatched downloads continue via the normal browser Downloads folder. The browser becomes a rule-based cloud download manager without requiring an individual right-click each time.

## User-facing controls
- Master Automatic Cloud Routing toggle, **OFF by default** until opted in.
- Per-file-type routing entries: extension(s)/MIME type; enabled flag; destination provider, bucket, and path; behavior: Always Auto-Route / Ask Before Routing / Normal Download.
- Support multiple rules, ordering / explicit conflict resolution, editable and removable entries, and a sensible unmatched-file fallback: Normal Download.
- Clear status and History/Shelf receipt showing original filename, destination, routing method, verified outcome, and recovery/fallback state; preserve user-selected paths and filename/conflict KEEP BOTH policy.
- Be transparent when a source cannot be fetched remotely; never silently drop or redirect files.

## Technical architecture and feasibility
- Use Chrome's downloads events (e.g. downloads.onCreated) as a **detection signal**, not a false assumption that the extension has the response bytes or can universally replace the download.
- Determine classification from extension, MIME type, Content-Disposition when available, and safe URL metadata; handle missing, ambiguous or misleading types. Do not assume every ZIP-like URL represents a ZIP.
- **Preferred: TRUE REMOTE**. Resolve an authorized, retrievable source and initiate server/Worker -> designated cloud storage, without staging file bytes on the user's disk. Reuse Click2Cloud V3+1 engine, routing/configuration, provider OAuth readiness, persistent queue, Worker transfer, and independently verified cloud receipt.
- Chrome Manifest V3 APIs cannot transparently redirect all arbitrary browser downloads and do not expose unrestricted response bytes. Cookie/session-protected links, blob: URLs, POST-derived responses, streaming download endpoints, anti-bot flows and generated private attachments can require website-specific integration or an alternate handling mode. Do not promise universal interception.
- Optional **local-upload fallback** must be a clearly disclosed and approved choice, not described as TRUE REMOTE. Do not cancel/interrupt the original download unless a safe replacement path is established; never lose a user's download if routing fails.
- Check provider *save readiness*, not only login status. If scopes/worker/bucket are missing, use targeted reconnect/repair preserving the pending destination and job. No false success, counters or animation before cloud-side verification.
- Respect privacy: provider receives file bytes and target filename/path, not source/page URL by default. Diagnostic or locally stored provenance can be separate, user-controlled. If metadata is necessary for a worker to retrieve a source, restrict it to the transfer mechanism, not cloud object metadata.
- Keep queue state durable/idempotent; retry safe transient failures, avoid duplicates, resolve conflicts, bound resource use; treat large files as streaming/chunked without browser-memory buffering. Provide per-job cancel/retry and failure reasons.
- Use a shared programmatic/API-first contract for every feature shown in the GUI: configure, enable/disable, detect, classify, route, authorize, queue, transfer, verify, retry, cancel, and inspect receipts.

## Acceptance tests
1. Opted-out mode leaves normal browser downloads untouched.
2. ZIP download with a configured Cloudflare destination transfers TRUE REMOTE on a supported public URL, verifies independently, and records a successful receipt.
3. Unmatched extension stays a normal download.
4. MIME/extension mismatch is handled by a predictable, inspectable rule.
5. Unauthorized provider, inaccessible source, broken worker, network failure, interrupted browser and missing destination each fail without false success or file loss.
6. Private/blob/POST sources clearly report unavailable TRUE REMOTE rather than masquerading as supported.
7. Conflict handling preserves both objects where KEEP BOTH is chosen; duplicate events do not create duplicate uploads.
8. All relevant UI actions have corresponding tested API endpoints/operations, and downloads can be inspected from the Shelf/History.

## Delivery plan
Research/validate Chrome download interception constraints first. Prototype public direct-link ZIP-to-R2 with explicit opt-in and safe fallback. Expand file types/providers only after verified remote transfer and lossless browser behavior. Integrate with REDOWN UX once Click2Cloud's routing/verification core is reliable.

**Non-goal:** bypassing website security, account restrictions or DRM.
