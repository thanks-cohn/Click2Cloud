# Screenshot + Auto-Reroute — Pre-Implementation Architecture Audit

**Date:** 2026-11-20. **Scope:** Click2Cloud, GitHub main, v0.3.20 source and binding next-codex requirements. **Status:** Design/specification audit; NOT evidence either new feature is implemented, or live Chrome/Worker/R2 tests passed.

## UPDATED OWNER DECISION (Nov 20) — THIS IS AN AUDIT, NOT A LIST OF NEW RELEASE BLOCKERS

**Priority override:** [master 0.3.21 Codex request](NEXT_RUN_DEDUPLICATED_CODE_AUDIT_AND_RULES_2026-11-19.md), [canonical Auto-Reroute V1 spec](../auto-reroute/README.md), and [frozen Screenshot Logic](../screenshot-logic/README.md) supersede this older audit wherever it recommends extra security layers, arbitrary rule-count limits, new permission/consent prompts, or exhaustive edge-case work BEFORE proving a basic real browser-byte transfer.

- Screenshot keys are **signals** with unlimited matching card subscribers. Chrome's documented limit of four SUGGESTED keyboard shortcuts is not a rule-card limit. Existing F7/F8/F9 shortcuts are local Explorer document key handlers in `extension/shortcut-settings.mjs`; no Chrome manifest commands are registered yet. Chrome can declare many commands; only four receive suggested defaults, and further declared commands may be manually assigned. Codex should verify real availability and share each valid signal across all matching rule cards.
- No arbitrary cap on active screenshot rules or user-intended cloud outputs. The original audit's workload/concurrency examples are runtime implementation considerations, NOT a mandate to suppress requests or build a new complex queue before functionality exists. Preserve output identities and truthful receipts.
- Do NOT open a speculative security-hardening workstream. Reuse existing Cloudflare login, previously chosen destination authorization, and verified R2 storage writes; don't allow accidentally writing to a different bucket. Additional threat-model/secret-handling features are FOLLOW-UP, not prerequisites for demonstrating the approved features.
- Preserve user-selected **Raw Receipt** operational evidence and the separate **Secure Receipt** redacted export. A RAW export is intentionally more detailed, possibly including original source URLs and metadata; label it as such rather than silently applying Secure redaction to both. No need to embed screenshot/file bytes in routine receipts.
- Auto-Reroute priority is ONE real eligible website click + original bytes read by Chrome + one existing Worker byte upload + real R2 stored result; other formats and comprehensive lifetime/interruption tests follow. Unsupported sources fall back to ordinary Chrome downloading. Extra checks should be justified by a demonstrated bug or necessary browser/provider requirement, not speculation.

---

## Executive disposition

| System | Logic | Implemented now? | Codex release gate |
|---|---|---|---|
| Screenshot rules as additive signal subscriptions | Coherent and simplified after Exclusive Save removal | NEW; implementation not yet established | Must prove one event/capture/browser upload and correct per-target Worker writes |
| Screenshot shortcut plumbing | Design sound if subscribers are separated from Chrome commands | Current manifest has no commands; local shortcut registry is one-key-per-command | Must register real commands and bind multiple rules to ONE command signal |
| Screenshot fan-out | Good target architecture | Existing Worker authorizes a single deployment-bound destination and has one-target writer | Must add narrowly authorized same-bucket fan-out first |
| Automatic download→R2 byte streaming | Feasible for limited supported link/HTTP(S) cases; universal browser download takeover not proven | No verified auto-reroute implementation | Actual eligible Chrome-origin response byte stream→Worker→R2, with no false local-staging guarantees |

## Binding product decisions (DO NOT REOPEN)

- One screenshot shortcut keypress is ONE signal, not one command per saved rule card. Multiple active cards can share keys and their authorized matching destinations are ALWAYS ADDITIVE; ordinary website-only screenshot rules join in. No priority, Exclusive Save, card takeover dialog or forced deactivation.
- Default Screenshot setting 'Single file per screenshot per directory' is ON. Deduplicate only output intents of the CURRENT capture using exact authorized canonical directory identity. OFF creates a separate physical copy for each distinct rule ID→destination intent. Many OR website conditions inside one card count as ONE rule.
- Whole visible active-tab viewport is the default screenshot, NOT the Chrome browser frame/address bar or below-the-fold page. One screenshot capture and one browser→Worker upload irrespective of number of matching rules.
- Auto-Reroute V1 supported types: common PNG/JPEG/GIF/WebP images, MP4/WebM and ZIP/CBZ (AVIF only if demonstrated); preserve an extensible type capability registry. Do NOT silently add audio, PDFs or unlimited arbitrary binary types as live features.
- Auto-Reroute data plane is **source→user's Chrome extension fetch/stream→existing trusted Worker receives BYTES→authorized R2**, NOT Worker source-URL re-fetch and not intentional local Downloads staging.
- Screenshot rule matching is additive; ordinary Auto-Reroute selects ONE visible winning download rule/destination by safe specificity/explicit conflict handling.

## Four approved screenshot reliability safeguards

1. **Central signal dispatcher:** one Chrome command event, one internal screenshot signal, one dispatch/matcher. Many rule-card subscribers per same signal, NO per-rule Chrome command or capture listener. Do not remove unique-key safety between unrelated existing commands. The current `src/api/shortcuts.mjs` uses `resolveBindings()`/`createShortcutStore()` and rejects duplicate keys across distinct commands; screenshot subscriptions must be a separate rule relation under the existing command identity. Current `extension/manifest.json` has no `commands` declaration, so real Chrome registration is a new milestone. Chrome does not dynamically register arbitrary new browser-level commands from local UI.
2. **Immutable capture plan:** bind windowId/tabId/URL/navigation context and versioned rule + setting snapshot, resolve matching rules and exact authorized targets, then freeze intended outputs. Check immediately before/after `chrome.tabs.captureVisibleTab(windowId)` because capture targets the window's active tab, not a specified tab ID. On a tab switch/identity mismatch, never upload wrong-page pixels. Mid-flight config edits affect only future captures.
3. **Unique Capture/Output IDs:** one signalId, one captureId, one jobId and stable per-output IDs/keys. ON output identity `(captureId, canonicalDirectoryId)` and all contributor rule IDs; OFF identity `(captureId, ruleId, canonicalDirectoryId)`. Separate new keypress gets fresh captureId; retry uses old IDs/keys. Worker durable claims and readback prevent double creation and preserve verified writes after partial failures.
4. **Canonical directory identity:** provider/authorized connection/account/bucket/exact provider-canonical key prefix, independent of labels. Never merge two accounts just because their folder names match; don't lowercase case-sensitive R2 paths or arbitrarily decode/rewrite Unicode/path bytes. Root/prefix delimiter and trailing slash need explicit tests.

## Screenshot remaining issues and changes recommended NOW

| Priority | Issue found | Required Codex change / test |
|---|---|---|
| P0 | `extension/manifest.json` has no `commands`; `src/api/shortcuts.mjs` rejects repeated command bindings and lists `Ctrl+Shift+F6` as reserved despite its use as a default in mockups | Declare real supported screenshot commands; map many RULES onto one command signal. Verify Chrome assignment with `commands.getAll()` and real Chrome. Keep F7/F8/F9 and Shelf History distinct. Show unavailable instead of pretending arbitrary typed keys work. |
| P0 | `src/cloudflare/worker.mjs` `RemoteClaims.authenticate()` binds to one account/bucket/prefix; `right2cloud-module/src/cloudflare-worker.mjs` is one-target | Add a narrowly scoped Screenshot fan-out protocol with individual backend authorization for each destination; same bucket first. Do not let browser-selected strings grant writes to other buckets. |
| P0 | Active tab can switch after rule URL is sampled; `captureVisibleTab()` receives windowId not tabId | Bind and verify exact focused window/active tab/navigation around capture, abort without remote upload if uncertain; never match one page but capture another. |
| P1 | One screenshot body must feed several R2 PUTs; a ReadableStream is not reusable | Use bounded buffer for appropriately sized screenshot PNGs or a verified internal staging/copy workflow. If staging is chosen, it needs scoped temporary storage, cleanup/expiry and audit evidence; preserve exactly ONE browser upload. |
| P1 | Partial success, lost ACK or worker restart can double-write | Durable captureId/outputId/operation journal, stable object keys, independently verified per-output state, selective retry. If original image bytes are unavailable after restart, don't take a fresh screenshot pretending it's the same retry. |
| P1 | Existing R2 folder prefixes can be visually ambiguous | Provider-aware identity helper and canonical prefix tests, including exact-root, slash, Unicode and case differences and multiple accounts with same names. |
| P1 | Too many rules may produce an excessive number of R2 writes when dedup OFF | Keep user-visible OFF semantics; plan bounded worker concurrency, target/size/resource budgets, partial failures and honest receipts. Never quietly skip matches or claim more files than were written. |
| P2 | One-off right-click Screenshot vs shortcut-triggered additive screenshot differs | Use explicit `triggerKind=singleDestination` vs `triggerKind=shortcutSignal`; one-off selection never unexpectedly fans out. |

## Auto-Reroute remaining issues and changes recommended NOW

| Priority | Issue found | Required Codex change / test |
|---|---|---|
| P0 | Chrome downloads.onCreated/onDeterminingFilename are NOT a byte-stream interception interface | Implement only supported **pre-download** handoff for accessible links/responses. An extension-controlled `fetch()` in Chrome can read response bytes and send them to Worker; once Chrome's regular download begins, cancellation doesn't guarantee no temporary local bytes. If pre-download control isn't proven, don't call auto-reroute complete. |
| P0 | Existing `src/cloudflare/transport.mjs` sends JSON remote-save intents, and `src/cloudflare/public-egress.mjs` currently lets WORKER fetch the source URL | Auto-Reroute requires a **new narrowly scoped browser-byte upload path** to existing Worker, with source bytes received in request/multipart parts. Never accidentally reuse Worker-side URL-fetch as proof of the requested Chrome-origin streaming architecture. Keep right-click saves unchanged. |
| P0 | Source URL/filename/type may only become known after redirect/Content-Disposition; iCloud-style authenticated ZIPs, POST/blob-generated files and expiring links vary | Define an explicit supported interception subset and source-origin matcher; on unsupported/private/ambiguous sources leave ordinary Chrome download intact. Never promise universal takeover of authenticated iCloud ZIP or an unexposed browser network response body. |
| P0 | Original browser download may already have started; a second `fetch` could duplicate source traffic or lose file when canceled | Prove preflight, permission, chosen rule/destination, source viability and browser stream before suppressing ordinary download. If control fails, normal download remains. After takeover starts, show durable partial/retry status and user-choice fallback; never invisible data loss. |
| P1 | MV3 service worker may suspend and streaming request upload requires real Chrome support | Test actual Chrome extension request body streaming, CORS/host permissions and `duplex:'half'` where required; use a documented durable execution context/job protocol. Do not rely on indefinite SW lifetime, unbounded heap or stream passing via runtime messages. |
| P1 | Worker `R2Bucket.put()` requires known-length streams; large MP4/ZIP/CBZ or unknown content lengths need multipart | Use bounded browser-read chunks with stable multipart uploadId/part numbers/ETags and Worker-side validation; enforce minimum part size other than final, complete/readback/abort and abandoned upload cleanup; no full file buffering. |
| P1 | `.cbz` often reports `application/zip` | Exact extension rules must keep CBZ and ZIP separate; source-origin rule specificity and equal-priority conflicts must be deterministic. Never infer CBZ from MIME only. |
| P1 | Byte integrity/receipt can be confused with mere request ACK or multipart ETag | Track byte counts, chosen filename/content-type and source identity, source/Worker/R2 verification where viable. R2 HEAD/size/version and actual payload digest when available, not a false assumption that all ETags equal SHA-256. Persist pending/unknown/verified failure modes. |
| P1 | Reroute and Screenshot share Worker/recorder | Separate capability `use`, operation namespace, quotas, job IDs and resource budgets; prevent own screenshot/download-export artifacts being automatically re-intercepted. Failures in one workflow must not interfere with ordinary right-click saves or the other workflow. |
| P2 | Supported formats will expand later | Keep centralized file-type registry with supported/disabled flags and explicit tests, independent of Get URL 'All files' export filter. No hardcoded type checks scattered through Chrome handlers and Worker. |

## Proposed deterministic execution contracts

**Screenshot shortcut:** user keypress→one Chrome command→one internal signalId→read trusted tab and frozen rule snapshot→all matching active shortcut + website-only rules→build canonical destination intents→dedup ON or per-rule OFF→one captureId, one screenshot image→one browser→Worker upload→authorized Worker fan-out→per-output verified/partial/unknown receipt. A second press is a new capture even if identical image/destination.

**One-off screenshot:** explicit right-click selected authorized target→one capture→one upload→one target; no implicit additive rule fan-out.

**Auto-Reroute:** supported eligible download action intercepted early→source/filename/source-origin eligibility and ONE winning rule→Chrome-owned fetch of original bytes→Chrome streams bounded bytes or multipart chunks to existing trusted Worker→Worker authenticates and writes exact authorized R2 target→independent byte/size verification→inspectable receipt. No Worker source URL fetch as a substitute, no intentional complete local staging; unsupported actions retain ordinary download.

## Test gates and release honesty

**Screenshot:** 0/1/100 matching rules, identical keys, multiple OR conditions in one card, 10 rules to same folder ON/OFF, different accounts/buckets with same labels, two rapidly distinct keypresses, tab/window race, rules changed during upload, partial writes, lost Worker response, retry same output, wrong-bucket rejection, real Chrome shortcut assignment, no unwanted right-click save regression.

**Auto-Reroute:** actual browser-side source-byte capture for PNG/JPEG/GIF/WebP, MP4/WebM and ZIP/CBZ public HTTPS fixtures, source hash/size→actual R2 write proof, early handoff/no unintended local download, regular fallback for unsupported/authenticated/blob/POST, URL redirects, Content-Disposition filenames, two simultaneous downloads, file mismatch, case, cross-origin permission, multipart unknown-length and large transfer, interruption/retry, Worker permission and failure. Not tested ≠ passed.

**Release policy:** A persisted Rules UI is not a functional Auto-Reroute; a simulated screenshot fan-out is not real R2 fan-out. Track DONE/REPAIRED/NOT TESTED/BLOCKED with commit SHAs and real fixture/Chrome/cloud evidence. Do not broaden permission scope or rewrite stable Simple/Narrow/Depth code without demonstrated necessity.

## Relevant current source and docs

- `extension/manifest.json`: no Chrome `commands`, optional HTTP(S) host permissions and `downloads` permission.
- `src/api/shortcuts.mjs`: in-Shelf command registry, unique key-per-command enforcement, `Ctrl+Shift+F6` listed as reserved.
- `src/cloudflare/worker.mjs`: durable Worker remote-save capabilities and one-bound-destination validation.
- `src/cloudflare/transport.mjs`: remote-save JSON intent path; separate from a future Chrome-byte stream upload path.
- `src/cloudflare/public-egress.mjs`: Worker-side original URL fetch path for existing right-click save; not the desired Auto-Reroute path.
- `src/cloudflare/files.mjs`: existing verified R2 object copy with `FixedLengthStream` and conditional writes, potential building block for safe server-side fan-out subject to access/identity checks.
- Binding specs: `next-codex/SCREENSHOT_TO_CLOUD_CONTEXT_MENU_AND_ADDITIVE_RULES_2026-11-19.md` and `next-codex/NEXT_RUN_DEDUPLICATED_CODE_AUDIT_AND_RULES_2026-11-19.md`.

**Product verdict:** The screenshot LOGIC is consistent after removal of Exclusive Save; outstanding risks are runtime/browser/Worker correctness, not additive match precedence. Auto-Reroute requires a real supported interception/Chrome-stream transport proof; its blanket feasibility is not established from the current Chrome downloads API.
