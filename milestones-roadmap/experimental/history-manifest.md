# Experimental — Historical Cloud Manifest / Time Machine
**Recorded:** 2026-11-16  
**Status:** Exploratory proposal; not a shipped feature.  
**Parent:** [November 16 roadmap](../11.16.2026.md)

## Vision
Maintain a durable, canonical **JSON/JSONL history manifest** across user-selected, authorized cloud accounts. It records the original hierarchy, file identities and changes over time, so information discovered once is not forgotten. This is a **historical cloud inventory**, distinct from (1) the ordinary customer save-history screen and (2) the separately discussed portable right-click **menu** manifest.

## Historical crawling and retention
- Gradually crawl selected cloud locations during ordinary app use, respecting rate limits, permissions and responsiveness. Do not interrupt login or save operations.
- Maintain a current view (e.g. `current.json`) alongside append-only change journals and dated/weekly snapshots.
- Preserve earlier observations rather than replacing history when the current state changes.
- Distinguish confirmed deletions, unavailable accounts, incomplete discovery, permission loss, failed scans and genuine empty directories.
- Use checkpointed, resumable scans and avoid inventing file state on missing data.

## Canonical record proposal
Each observed object should record, as permitted and available:
- Provider and authorized account identifier; bucket/drive/container and original full path/prefix.
- Stable provider object ID or version ID, filename, type, size, modification timestamp, ETag/checksum where reliable.
- First seen / last seen timestamps; observation source, scan/checkpoint ID and certainty/status.
- Historical location(s), move/copy/rename relationships when demonstrable, and current location.
- Optional content hash when safely/legitimately available or computed with permission; never treat ETag universally as a content hash.
- Privacy-safe metadata policy, no secret credentials or unnecessary browsing provenance.

## Time Machine view
- Allow a user to examine how the cloud hierarchy changed by date/week.
- Find a file by original name/path even after it moved or was deduplicated.
- Show historical locations with clickable **GO TO** for currently accessible, validated destinations.
- Make the difference between historical data and real-time provider state explicit.

## Future reversible cross-cloud deduplication
- Optionally identify content-equivalent objects across selected clouds using **verified** content identity, not just matching filenames.
- Retain a virtual map of all original hierarchy placements before any removal.
- Deletion must be opt-in, previewed, authorized and backed by verified remaining copies and a tested restoration path.
- Restore files to original locations when permitted; report unavailable destinations, version conflicts and missing copies instead of silently fabricating a successful restore.
- Weekly canonical updates were previously proposed; schedule and storage costs require design.

## Future cross-cloud search / drag-and-drop
- Find an image or file using accumulated manifests across providers, show where it lives, and open the correct verified location.
- Explore Chutey-style cross-cloud drag/drop using safe, authorized actual transfers.
- Do not claim destination-folder drag/drop is currently supported.

## Relationship to customer History and menu manifest
- **Customer save History:** individual transfer receipts, originating page URL, source URL, stored destination, timestamp, result, optional public Cloudflare URL, and GO TO. Display should support all-time history, daily/weekly groups and export filters; retention and storage strategy need careful separation from forensic logs.
- **Portable Menu Manifest:** export/import a portable blueprint of Simple/Narrow/Depth menu structure and intended destinations; read-only preview and explicit bind/activate, never credentials or autonomous resource creation.
- **Historical Cloud Manifest (this document):** long-lived state of files and folders across providers, snapshots and journals for Time Machine, recovery, search and possible deduplication.
Keep their schemas, permission models and storage/retention controls distinct.

## Experimental acceptance / risk checklist
- [ ] Define canonical schema, account-scoped identities and migration/versioning.
- [ ] Define CURRENT + append-only journal + checkpoint/snapshot consistency.
- [ ] Prove incremental and resumable scans with rate limits.
- [ ] Prove historical records remain available after moves/deletions without falsely claiming current existence.
- [ ] Define storage growth, retention, privacy and export redaction.
- [ ] Verify GO TO identities and permission handling across providers.
- [ ] Simulate conflict, missing account, partial scan and recovery.
- [ ] Test deduplication and restore safely in disposable authorized storage before considering destructive operations.

**Boundary:** This concept must not delay or destabilize the existing right-click save engine.
