# Major fixes — Auto-Reroute Downloads and Screenshot to Cloud

**Owner request:** November 19, 2026  
**Status:** MAJOR FUTURE FEATURE PROPOSALS — documented, **not yet implemented**. Kept under `minor-fixes/` at the owner's request. **Do not silently expand the current 0.3.20 Codex task** into a large download architecture rewrite.

## Overall design — API-centered, scriptable, agent-ready when authorized

Use Click2Cloud's existing versioned **V3+1.1 API, File API, trusted gateway and shortcut registry** wherever practical. Real operations should expose typed, documented inputs/outputs so that the Shelf, scripts, repeatable automated tests and possible future explicitly authorized agents can share their implementation. Do not build duplicate APIs, an unrelated transfer engine, new Worker architecture, premature desktop-control features or abstractions merely for abstraction's sake. Deliver the actual user functionality reliably.

## Feature A: Auto-Reroute — download directly to a chosen cloud directory

**Owner goal:** The user enables **Auto-Reroute Downloads to Cloud** in ordinary Settings. Matching downloads go directly to an exact cloud folder, **streamed in bounded byte chunks instead of intentionally downloading the complete file to local disk first**.

- **OFF by default.** Add a simple enable switch and a rule editor (add, edit, disable, delete, priority, source criteria, destination). Disabling affects new transfers; provide appropriate control/clarity for ongoing ones.
- Rules may match **file types** (MIME type/extension), **source websites/origins/domains**, or **file type AND website**. Example rules: images → `photos/`, PDF files from `example.com` → `documents/`, all eligible files from a particular site → `site-archive/`.
- Every rule names an exact, currently authorized **provider/account/bucket/folder prefix**. Preserve the real target key and filename; define deterministic handling of conflicts and overlapping rules so the same file is not uploaded twice or sent to a wrong folder.
- **Direct byte-streaming intent:** read authorized source bytes progressively and upload them progressively to the selected cloud, with bounded memory, backpressure, progress, retries where safe and validation of bytes actually received/uploaded. No deliberate full-file staging on local disk; do not claim success on a mere accepted request.
- **Browser feasibility must be proven first.** Chrome downloads APIs do not automatically grant access to arbitrary native download response bytes. Evaluate whether a supported fetch/source-stream approach is genuinely possible with redirects, cookies, CORS, content disposition, authentication, streaming/range support and existing permissions. Do **not** intercept or reroute downloads silently where this is not technically supported. Preserve ordinary browser downloads when no rule matches or when a rule cannot safely take effect, with truthful status. A future permitted native/desktop relay may cover hard cases, but is **not assumed to exist**.
- Keep source-site rules precise and privacy-conscious. No unintended disclosure of private/authenticated downloads to other cloud accounts. Make explicit user choices in Settings authoritative.
- Underlying rule evaluation, authorized destination selection, transfer execution, status, cancellation and verification should be **scriptable through the existing API where appropriate**. Illustrative commands such as `listRoutingRules`, `evaluateRoutingRule`, `setRoutingRule`, `startReroutedTransfer`, `inspectTransferStatus` are examples only; **audit existing API capabilities and reuse naming/contracts** rather than inventing a competing namespace.

## Feature B: Screenshot to Cloud — use the new API-backed shortcut system

**Owner goal:** A user picks a Cloudflare R2 bucket/folder, sets a shortcut in the existing **Keyboard Shortcuts** Settings panel, and triggers **Screenshot to Cloud** without unnecessary local file creation.

- Register a true **Screenshot to Cloud** command using the **same canonical command metadata and editable shortcut resolver** as Search/F8/F9. It is a new feature, not a parallel one-off hotkey handler.
- Support **only capture scopes actually authorized by Chrome/OS**. Browser tab/window or desktop capture may require separate permissions or user selection. Never claim arbitrary whole-computer capture/control from a normal extension; capture on the explicit user trigger, not as persistent surveillance.
- Name the image predictably and collision-safely (e.g. `Screenshot-<UTC-timestamp>.png`), preserving exactly which approved account/bucket/folder receives it.
- Feed the actual encoded image bytes through the **existing authenticated cloud upload/File API** when technically possible, without staging an unnecessary image in the user's Downloads folder.
- Report a clear success/partial/failed/unknown outcome only when supported by actual provider/upload evidence. Allow authorized programmable invocation through the same command interface, without bypassing gesture/permission constraints.
- A separate screenshot engine, blanket screen monitoring or full computer-control agent is **not** authorized in this proposal.

## Feature C: Lightweight per-file diagnostics for both features

**Requirement:** Each screenshot and each auto-rerouted download gets a small, **time-stamped, programmatically inspectable transfer summary**, allowing the user to compare **what Click2Cloud downloaded/captured/sent** against **what is actually stored at the chosen cloud object key**.

Minimum diagnostic fields when actually known:

| Field | Meaning |
|---|---|
| `operationId`, `type` | Stable identity; `screenshot-to-cloud` or `auto-reroute` |
| `startedAt`, `finishedAt`, `updatedAt` | ISO 8601 UTC timestamps, only when observed |
| `filename`, `mimeType` | Actual source/captured file identity |
| `sourceBytes`, `capturedBytes`, `uploadedBytes` | Measured byte counts (and unknown where unmeasured) |
| `provider`, `bucket`, `folderPrefix`, `objectKey` | Safe, exact target identity; account scoping without exposing credentials |
| `sourceOrigin`, `matchedRuleId` | Sanitized website origin/rule, for reroutes only |
| `status`, `stage`, `errorCode` | Accepted/streaming/uploaded/verified/failed/cancelled/uncertain with concise error |
| `cloudObjectBytes`, `cloudETag`, `cloudModifiedAt` | Actual metadata from an authorized readback, if available |
| `computedChecksum`, `verificationMethod`, `verifiedAt` | Verified integrity evidence only if genuinely checked |

- After upload, **where safely possible**, perform an authorized read/HEAD/metadata verification on the **exact cloud object key**. Compare filename/key, measured size and any trustworthy computed hash to the real cloud object. Show **matches / mismatch / not checked** separately; a matching size is not proof of byte-for-byte equality. Do not mistake R2 ETag for SHA-256.
- A diagnostic entry must record timestamps and sizes even if more advanced verification is unavailable, using explicit null/unknown fields rather than guesses. On failure/partial transfer include last confirmed stage and relevant safe error, not a fabricated completed result.
- These are **small diagnostic status summaries**, not duplicates of full content, secret-bearing source URLs, arbitrary HTTP headers, screenshot bytes or complete transfer receipts. They should be available to a future script/test harness through a **read-only inspect/status API** where practical.
- Preserve existing **History exactly as it is** (right-click saves only). Do not write these screenshot/reroute diagnostics to History or Save Results, and do not duplicate the bulk ZIP receipt contract `RRReceipt-<time-stamp>-<job-number>.json`. For optional future UI visibility, the **Debug ON → More → Downloads** expandable-card view may reuse the concise status projection without storing a second full receipt.
- Tests should compare 0-byte, small and larger files, two same-named files in different folders, interruptions/retries, stale metadata, partial uploads, wrong-target prevention, and fail/unknown outcomes. Avoid unbounded real-cloud stress activity.

## Diagnostics extensibility — intelligent segregation from working machinery

**This is a deliberate architectural boundary. Diagnostics must be easy to extend later without interfering with existing save/download machinery.**

- Build **one small, isolated diagnostics adapter/module** with a stable versioned event/summary schema for the two future features. Treat actual transfer APIs as the **authoritative operations**. The diagnostics adapter observes validated lifecycle events; it does **not** decide routing, own authorization, upload bytes, rewrite cloud objects, or determine whether a save succeeds.
- **Non-blocking and fault-contained:** a diagnostics failure, logging quota issue, schema migration or Debug panel failure must **never cause an otherwise valid download or screenshot upload to fail, retry or duplicate**. Clearly report missing diagnostic evidence instead of turning diagnostics into a hidden dependency.
- **Bounded and configurable retention** for minimal status summaries; do not introduce an unbounded permanent transfer-history database, full screenshot/file copies, a second receipt ledger, or a background Worker dependency. Respect privacy by default and never capture secret tokens or raw file contents.
- **Extensible from a stable core:** later improvements may add optional detailed stages, verified checksums, timing breakdowns, per-provider adapters, compare-to-cloud actions, diagnostic exports and testing metrics **without changing existing API semantics or the right-click save engine**. Use additive schema versions and adapter interfaces rather than invasive modification of unrelated modules.
- Keep **operator-facing presentation separate** from transport/verification logic. A future Debug Downloads card or developer script should read the same sanitized summary through an inspect endpoint. Enabling/disabling a diagnostic view must not alter the transfer.
- Retain clear separation between **right-click save History**, **ZIP-embedded bulk receipts**, **experimental screenshot/reroute diagnostic summaries**, and any other existing recorder/debug systems. Do not merge stores or silently migrate existing data.
- Implement focused fault-injection checks: simulate diagnostics unavailable, slow or malformed, disk/quota limits, duplicate events, retries and UI reopening; **the same actual transfer outcome must still occur**.

## Future implementation and documentation gates

1. First audit Chrome/browser APIs and existing Click2Cloud File API for what is feasible; state any capture/reroute blockers accurately.
2. Build the smallest safe working slice behind OFF-by-default feature switches, with the same API authority as human UI and scoped, verified cloud destinations.
3. Validate real streaming/capture behavior and basic cloud-content comparisons through automated API tests with fixtures/disposable objects.
4. Keep existing right-click saves, regular History, ZIP-only bulk receipts and the Worker architecture intact.
5. When separately approved for implementation, add every **actually callable** new method to `docs/api/API-COMMAND-REFERENCE.md` with inputs, outputs, scopes, effects, constraints, examples, and automated exact coverage checks. Mark all future/unimplemented operations honestly; no documentation claiming the features already ship.

**Non-goals for current 0.3.20:** No automatic reroute interception, new screenshot permissions, new cloud setup, desktop/agent access, separate receipt engine or hidden production uploads without a later authorized implementation task.
