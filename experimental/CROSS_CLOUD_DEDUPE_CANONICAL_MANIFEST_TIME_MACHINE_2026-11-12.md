# Experimental — Cross-Cloud Dedupe with Canonical JSONL/JSON Location Map and Time Machine Restore

**Recorded:** 2026-11-12
**Status:** Experimental product concept. NOT implemented, enabled, or proven safe for deletion.
**Owner vision:** REDOWN remains a tactile machine; Click2Cloud is a simple test/reference surface. This feature can eventually use the same versioned operations in both interfaces.

## The idea

Let a user explicitly elect which **cloud accounts, buckets, folders, and directory subtrees** participate in cross-cloud deduplication. Click2Cloud keeps a canonical inventory of where each content item originally lived, so users can consolidate duplicate file bytes into **two surviving independent copies (recommended)**, or **one copy (strongly discouraged)**, while still seeing each former location as a virtual placement or reference.

At any later date, the user can ask to **Restore Original Locations**: Click2Cloud uses the durable original-placement manifests to plan copies back into each participating cloud hierarchy, subject to live access, content integrity, provider capabilities and user confirmation. Preserve physical-directory positioning as data even after physical copies are intentionally removed. Integrate time-stamped inventory snapshots and diffs with the larger **Time Machine** vision.

**Critical distinction:** A JSON/JSONL listing preserves *location knowledge*, not file bytes. Restoration is possible only if at least one intact, accessible, authorized content copy remains and each destination permits writing. Neither one-copy mode nor two-copy mode guarantees recovery from data loss.

## Opt-in and scope

- Disabled by default; no autonomous deletion, relocation or cross-cloud fetch.
- User explicitly chooses providers/accounts, exact folders/buckets/prefixes, include/exclude patterns and whether all nested levels participate. Respect account scopes, existing routing choices and folder permissions.
- Scan only authorized elected locations; do not crawl other clouds merely because they are connected.
- Display a dry-run comparison: probable duplicate groups, file count, byte savings, proposed survivor locations, source locations to virtualize, transfer cost/rate considerations, and unsupported types.
- Require an explicit, reviewable commit confirmation for every destructive batch and show each item with its selected survivor, source path and restoration option.
- **Recommend two independent, fully verified copies** kept in separate failure domains; allow one-copy mode, if ever implemented, only behind a prominent irreversible-loss warning and an additional explicit confirmation. A single copy is not a backup.
- Prefer providing a non-destructive virtual-overlay MVP before any physical deletion feature.

## Canonical storage: append-only JSONL plus snapshot JSON

Two complementary representations, both versioned:

1. **Canonical append-only JSONL event ledger**: the authoritative history of election, discovery, scan, hash/verification, grouping, user approval, placement virtualization, deletion intent, provider-confirmed deletion, survivor verification, restore planning, restore outcome, rescans and errors.
2. **Materialized canonical JSON inventory/snapshots**: derived current state and immutable Time Machine snapshots, indexed for fast UI queries and deterministic restore planning. JSON snapshots must reference ledger sequence IDs/checksums; do not silently overwrite history.

Keep a stable item ID and content/version ID, digest algorithm + observed hash when available, byte size, MIME/type, original filename, distinct provider/account/bucket/drive/folder identity, exact normalized cloud key/path, parent-child directory relationships, file/version identifiers and ETags when provided, observed timestamps, selected retention policy, survivor reference(s), user election/approval receipts, verification and restore state.

Example illustrative JSONL records (shape is *proposal*, not a current API):

```jsonl
{"schemaVersion":1,"eventId":"evt-001","at":"2026-11-12T12:00:00Z","kind":"placement.discovered","itemId":"item-A","contentId":"sha256:example","placementId":"p1","provider":"cloudflare-r2","accountRef":"account-local-ref","bucketRef":"bucket-local-ref","path":"photos/trips/image.jpg","physicalState":"present","verification":"pending"}
{"schemaVersion":1,"eventId":"evt-002","at":"2026-11-12T12:10:00Z","kind":"dedupe.plan.approved","itemId":"item-A","planId":"plan-1","survivors":["p1","p3"],"virtualize":["p2"],"approval":"explicit"}
{"schemaVersion":1,"eventId":"evt-003","at":"2026-11-12T12:12:00Z","kind":"placement.virtualized","itemId":"item-A","placementId":"p2","originalPath":"archive/2024/image.jpg","survivors":["p1","p3"],"physicalState":"removed-after-verification"}
```

Do not treat these placeholder IDs or hashes as real observations. Production event schema needs stable revision IDs, tamper-evident/checkpoint verification, integrity constraints, atomic/serialized updates and recoverable interrupted operations. Credential values never appear in manifests.

The JSON snapshot should support a virtual tree: users browse original parent directories and names even though the actual bytes are now stored at one or two surviving placements. Clearly mark **Virtual / Referenced** versus **Physical / Verified** so the UI never pretends the original cloud still contains a file that was deleted.

## Safe identity and deletion rules

- Filename, size, cloud ETag, or path equality is **not** proof of identical bytes. Compare actual strong cryptographic content digests (e.g. SHA-256) from authorized full-content reads or a trustworthy validated hash. Some cloud ETags are not raw file checksums.
- Do not dedupe different versions by mistake: retain change/generation identifiers and original paths. Revalidate before destructive operations to prevent stale-scan races.
- Prefer same-content files across selected placements while preserving distinct logical placements; duplicates with different names/metadata are still separately represented.
- Before any deletion, ensure **both recommended survivor copies are independently accessible and verified**; confirm the immutable manifest and restore plan are durably committed in more than one appropriately protected location. A single metadata database disappearing must not make a restore impossible.
- Use per-provider least-privilege authorization, provider-supported moves/deletes, exact item identifiers, idempotent operation IDs, optimistic concurrency safeguards, confirmation receipts and honest UNKNOWN outcomes on timeouts.
- Never delete originals while a survivor upload is pending or its bytes are unverified, on unsupported type/provider, or during token/permission/integrity uncertainty.
- Preserve original metadata best-effort, but disclose that provider-native ACLs, sharing links, ownership, object versions, timestamps and link semantics may not be reproducible.
- Account for versioned object stores, provider recycling/retention features and egress/network costs; do not assume delete is immediately irreversible or instantly complete.

## Restore original hierarchy at any time, when recoverable

The user selects a historical snapshot/date or current logical layout, a subset of placements, or **Restore All Original Locations**. Show the complete hierarchical restore plan and destinations in a dry run:
- Find an intact verified survivor by content ID and compare its integrity to the manifest.
- Revalidate elected destination authorizations, current paths, parent folders and conflicts. Recreate hierarchy in dependency order; never overwrite newer user files by default.
- Copy/stream bytes using a provider-permitted route; cloud-to-cloud transfer may involve locally relayed bytes or authorized server-side transfer and must disclose privacy/cost implications.
- Verify restored objects *in their destination providers* and append restore receipts to the canonical ledger. Then atomically update the materialized state. Do not claim restoration from metadata alone.
- Partial, blocked, inaccessible, rate-limited or missing-survivor cases remain visible with retry/repair instructions. Never report restored simply because a copy operation was dispatched.

The virtual original-path map remains available after restoring, and future dedupe runs must not automatically remove restored copies. Users may pause scheduled scans and freeze an immutable point-in-time snapshot.

## Time Machine: weekly updates, history and drift

- Proposed optional **weekly** authorized reconciliation: inventory elected roots, detect new/moved/renamed/changed/missing objects, validate retained survivors, reconcile manifest state, and append a new immutable snapshot with timestamp, schema version, generation and diff from the previous snapshot.
- Weekly scanning should update **knowledge only** by default. **No weekly automatic deletion or restore** and no destructive action without separately reviewed approval.
- Present timeline: **Week -> elected clouds -> historical folder tree -> current survivor -> restore status**. A user can compare previous hierarchy snapshots, inspect where a file used to live and request a restore plan for that point in time.
- When files change, treat each verified content version as a distinct restore target. The Time Machine is an inventory/time-travel view, **not byte-level backup unless actual retained copies/versions support it**.
- Missed scheduled checks, browser closed, expired credentials, provider API limits or deleted accounts produce stale/partial indicators rather than pretending a weekly snapshot succeeded. A desktop agent or scheduled service would be necessary for dependable unattended weekly execution; Chrome MV3 alarms alone are best-effort.

## Interfaces and API direction

- Click2Cloud: minimal CSS, plain controls for selecting cloud roots, analyzing duplicates, reading the virtual tree, reviewing survivor proofs and building a restoration plan. Keep useful for comparison against REDOWN's more elaborate UX.
- REDOWN later: a tactile 'Deduplication Machine' and 'Time Machine' interface on top of the same supported contracts, without a second unverified transfer engine.
- Proposed versioned operations: `dedupe.electRoots`, `dedupe.scan`, `dedupe.plan`, `dedupe.confirm`, `dedupe.execute`, `dedupe.verify`, `dedupe.getVirtualTree`, `dedupe.restorePlan`, `dedupe.restore`, `dedupe.snapshot`, `dedupe.history`, and `dedupe.reconcile`.
- Explicit status lifecycle: DISCOVERED -> HASH_VERIFIED -> PLANNED -> APPROVED -> SURVIVORS_VERIFIED -> VIRTUALIZED (if physical deletion is independently confirmed), or NEEDS_ATTENTION / UNCERTAIN. Restoration has separately verified stages.
- Diagnostics by default redact account identities, raw paths and signed URLs on sharing; local encrypted storage and secure export design needed. Separate any user-authorized raw forensic export. No uploading private manifests to Click2Cloud infrastructure without explicit consent.

## Staged experimental acceptance, not a production claim

1. **Read-only prototype:** elect at least two cloud roots; produce a canonical JSONL ledger and JSON snapshots; compare file identity safely; build the virtual tree, with no file deletion.
2. **Time Machine prototype:** snapshot weekly when the authorized scheduler actually runs, diff changes, and reconstruct historical directory trees.
3. **Non-destructive restore test:** copy from a verified survivor into a user-chosen safe test destination, preserving hierarchy and confirming remote existence/hash.
4. **Two-copy dedupe pilot:** explicit consent, two independent survivors, durable manifest backups, exact-delete receipts, recovery after interrupted operations, and test coverage for concurrent modification.
5. **Single-copy mode:** disabled by default and release-gated, if offered at all; prominent risk warning and independently evaluated backup/recovery strategy.
6. **Failure injection:** expired OAuth, offline/slow providers, missing survivor, revoked permissions, changed hash, path collision, manifest loss, interrupted upload/delete, mismatched metadata, and crash/reload. No data-loss success claims.
7. **Real-world evidence:** measure API costs, scan latency, byte savings, snapshot size, restoring a partial/full hierarchy, and cloud-side verification before recommending rollout.

## Relationship to existing product work

Complements the Click2Cloud project direction for reliable verified multi-cloud saves and the REDOWN / Click2Cloud contrasting UX strategy. It is a separate **experimental** feature proposal, not authorization for production deletion, cloud moves, code changes, or automatic job scheduling. Keep existing account configuration, provider data, queues and diagnostics intact.
