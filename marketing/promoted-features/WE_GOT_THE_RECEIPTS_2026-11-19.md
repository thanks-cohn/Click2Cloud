# Promoted Feature — WE GOT THE RECEIPTS!

**Recorded:** 2026-11-19 (America/Chicago)  
**Product:** Click2Cloud, by Tinker & Co.  
**Positioning:** Top-level product promise, not an obscure diagnostics setting  
**Status:** Marketing/product direction; **not a claim that all receipt capabilities below are already shipped or independently tested**  
**Related:** [Automatic Download-to-Cloud](AUTOMATIC_DOWNLOAD_TO_CLOUD_PRESERVE_DISK_SPACE_2026-11-19.md), [Live Assets](LIVE_ASSETS_SCREENSHOT_TO_WEBSITE_2026-11-19.md), [S3 Multi-Cloud durable transfers](S3_MULTICLOUD_DURABLE_JOBS_2026-11-19.md).

# WE GOT THE RECEIPTS!

**Never settle for “Upload complete.” Know exactly what happened.**

Click2Cloud should make verified cloud transfers feel as straightforward to trust as getting a printed receipt from a store. Every save, screenshot, automatic cloud-routed download, cross-cloud copy, bulk export, or long-running S3 job should have a useful, human-readable receipt backed by a **versioned, machine-readable evidence record**.

This is a **major marketing differentiator**: **customer-pleasing receipts and programmatically inspectable proof**.

## Two views of one canonical record

### 1. The receipt customers love

A clean, attractive **Save Receipt** showing:
- File or folder / job name and user-visible status: **Pending, Transferring, Verifying, Verified, Failed, Partial, Cancelled, Unknown**.
- Requested source and selected exact cloud destination (account display label, provider, bucket, prefix/object key), with sensitive links/identity details redacted when appropriate.
- Total item count, completed/failed/uncertain counts, bytes, elapsed time where actually measured, and completed-at time.
- Evidence summary: **“Verified at destination”** only if post-write verification truly passed; otherwise explicit **“Provider accepted,” “Verification pending,”** or an error.
- Buttons: **View details**, **Copy summary**, **Download JSON**, **Export safe receipt**, and for a large job **Inspect individual file receipts**.
- Friendly visual clarity, accessible typography, purposeful success and error presentation. Avoid distracting confetti or claiming a success before it is proved.

### 2. The evidence computers can inspect

A stable, documented **JSON (and optional JSONL event stream)** with:
- `schemaVersion`, immutable `receiptId`, `jobId`, `operationId`, creation/completion timestamps and exact operation type.
- Explicit `source`, `destination`, and destination identity/key/version (with privacy-safe export variants).
- `requested`, `attempted`, `stored`, and `verified` states independently represented; retries and uncertain results not silently flattened.
- Object byte length, expected and observed digests/checksums **only when actually computed or provided reliably**, hash algorithm, validation method and comparison result.
- Authorized remote `HEAD` or bounded readback evidence with timestamp, remote object version/key and size; a successful `PUT` or ETag alone **does not establish end-to-end integrity**. Multipart ETags are not automatically file hashes.
- Redacted error codes, retry history, duration and link to related per-object receipts for directories/multi-cloud jobs.
- A deterministic aggregate job summary / manifest with per-object status, exact counts, no missing nested prefix entries, partial failures, and reconciliation record.

A receipt is **audit evidence**, not an unconditional promise of cryptographic proof. Stronger tamper-evident or third-party-verifiable proofs would require explicit signing, key management and independently repeatable validation. Define and document those separately before claiming them.

## Signature advertisement concept

A creator right-clicks a file and chooses **Save to Cloud**. A brief transfer animation ends on a handsome **Verified Save Receipt**: exact target, bytes, time, verification method. They click **View JSON**; a structured machine-readable record appears. They copy it into their script or send it to their team's audit pipeline.

**Voiceover:** “Some apps say it's done. We show you where, when, and how we checked.”

**End card:** **CLICK2CLOUD — WE GOT THE RECEIPTS!**

Other approved marketing directions (subject to shipped proof):
- **“Proof you can read. Evidence your software can inspect.”**
- **“Your files, your clouds, your proof.”**
- **“Not just a success message. A verifiable record of your transfer.”**

## The particularly powerful S3 use case

For an authorized background command such as **“Copy everything in Cloudflare R2 /Directory X to MEGA S4 /Directory Y”**, the extension submits one immutable job intent; Cloudflare's durable job controller processes an enumerated manifest and issues:
1. One **job submission acknowledgement** (proof job was durably accepted, **not** proof of any data copied).
2. A **per-object transfer receipt** tied to exact source and destination identities.
3. An **aggregate final receipt** with discovered, attempted, copied, verified, failed and uncertain counts, plus per-object evidence links.
4. A **reconciliation report** if the job is interrupted, resumed, cancelled, or partially incomplete.

The user can close the extension after server-side acceptance if the server has valid independent authorization and all needed source access. On later login, they retrieve the same job's **actual status and receipts**, not a reconstructed success guess.

## Canonical architecture — no competing receipt engines

The existing save queue/transfer engine and provider adapters must emit or supply evidence through **one receipt contract**, shared by UI, native host, Worker-side S3 operations, file explorer and public API.

Use a **documented, versioned API**, e.g. conceptual `receipts.get(jobId)`, `receipts.list(filters)`, `receipts.export(jobId,{format:"json",redaction:"safe"})`, and `receipts.verify(jobId)`. These are **illustrative API shapes**, not existing verified commands.

Retain a friendly summary and programmatic evidence in the same causal record. Provide **RAW** versus **SECURE/redacted** export with explicit security warnings, never expose tokens, signing secrets, signed URLs or private file data in ordinary export. Apply retention and deletion policies transparently; never promise immutable or forever-stored history without implementation and policy.

## Acceptance gates before marketing as live functionality

1. A real completed upload has a genuine, independently verified destination/byte-count receipt; a failed upload never displays verified success.
2. The stored exact destination matches the actual object after the operation; no false success when an object is missing or written to the wrong bucket/key.
3. JSON and the friendly UI agree on source, target, job identity, attempts, final outcome, timing, and counts.
4. Directory/bulk/multipart receipts report all partial and uncertain outcomes and correctly reconcile resume/retry without duplication.
5. JSON schema, sample fixtures, versioning strategy, replay protections and safe/raw export have automated tests.
6. Real-provider end-to-end verification (including Cloudflare R2 and any future MEGA S4 S3 adapter) is a separate proof gate; unit-test mocks alone are not enough.

**Bottom line:** reliability is the foundation; **receipts make that reliability visible, inspectable, and marketable**.
