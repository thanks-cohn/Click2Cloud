# Project direction — Portable History Manifest and faithful restore

**Date:** 2026-11-16
**Priority:** High — personal continuity and reinstall safety
**Status:** Future feature requirement; not implemented in the currently tested Aesthetic Foundation runtime
**Detailed implementation brief:** [Codex: Portable History Manifest & Restore](../codex/11.16.2026/P1_PORTABLE_HISTORY_MANIFEST_AND_RESTORE.md)

## Why this matters

The owner's Click2Cloud History is an important personal chronological record of online activities: what they found, when they encountered and saved it, the original host/source pages, the chosen provider, and what happened to each save. Removing an extension should not make this personal timeline vanish forever. A history backup must survive Chrome extension removal, profile replacement, new installations and migrations, and should be portable to the owner's chosen local or cloud storage.

**A displayed History entry is a timestamped historical record, not an instruction to re-download or re-save a cloud file.** Restoring History means restoring the historical records and their provenance, not repeating operations.

## Design: a checkbox INSIDE existing Export History

Preserve the familiar customer-facing **Export History** UI, formats (JSON/JSONL/CSV), selection and existing export action. Add the following optional controls immediately within that same export window:

```text
Export History
[existing format, privacy and date/time range controls]

[ ] Export the History Manifest
    ( ) All time
    ( ) Match selected time range

[Existing Export History action]
```

- Manifest checkbox **unchecked by default**; the existing export is completely unaffected when unchecked.
- When checked, show two mutually exclusive choices beneath it. **All time** is the default and includes all retained History, regardless of the ordinary export range or loaded page. **Match selected time range** uses the exact date/time scope, timezone and boundaries selected in the existing export UI.
- Clicking the **existing Export History action** produces the usual readable export plus a **separate labeled, restorable History Manifest** (or an explicitly labeled bundle containing both if required for the download), never silently substituting the manifest for the ordinary export.
- The restorable manifest is versioned and includes the canonical record data necessary to reproduce History, not merely the stripped/display-oriented fields of JSON/CSV reports.
- Source/page URLs and browsing provenance can be sensitive. Clearly explain what each mode includes, preserve the user's privacy choice, and provide an authenticated encrypted archive option.

## Design: simply upload the manifest to recreate History

In a fresh installation or one with existing history:

```text
Import History Manifest
[Choose file]  ->  [Preview restoration]  ->  [Restore History]
```

- Restore the canonical persistent History database, not just a visual mock list; entries reappear in the **normal History UI** on restart and subsequent sessions.
- Retain original timestamps, filenames, page/source links and available titles, provider/account/bucket/key, save mode, recorded saved-file metadata, statuses and independently recorded receipts, while honestly marking historically missing details.
- Work **with zero existing entries OR with any number of newer/older resident entries**. Merge and sort the combined set by original event timestamps, with stable tie breaks, and regenerate Year > Week > Day groupings and pagination.
- De-duplicate using stable original record IDs / lineage. Reimporting the same manifest repeatedly must not duplicate entries, erase newer entries or change verified-save totals.
- User should be able to read restored History before authorizing Cloudflare or any provider. GO TO, previews and live object stat require present-day access and independent verification, while historical information remains visible even if accounts have disconnected.
- Import must never trigger a cloud save, reupload bytes, create buckets, renew an OAuth grant, or replay unfinished pending operations. Imported historical proof is not a claim that an object was freshly checked now.
- Support selected-range manifests: import exactly their records, without claiming the archive includes other periods or removing local entries outside the exported period.
- Preserve an explicit read-only preview, privacy disclosure, validation, integrity checks, size/memory bounds and crash-safe, idempotent import. This matters on memory-constrained Windows computers.

## Optional resilience enhancement

Manual manifest export is a first milestone. Later, opt-in backups to a durable user-chosen location (local, native companion storage or authorized cloud), with independent readback/checksum and incremental snapshots, should mean uninstallation is not a single point of failure. Extension-local IndexedDB or chrome.storage alone is not external backup; do not claim they survive uninstall.

## Relation to current runtime

Existing Aesthetic Foundation `implement/explorer-aesthetic-foundation-2026-11-15` / `e188dc7f86b5` has ordinary History exports but no implemented History Manifest round-trip restore. Do not mark this as complete until a real fresh-profile import recreates historical entries and an existing-profile merge preserves all entries. The older history lost on uninstall might be unrecoverable without exported records, backups or surviving remote metadata; never manufacture evidence.

**Owner acceptance:** Tick **Export the History Manifest** and choose **All time** or **Match selected time range**; export as usual; later upload that manifest into a fresh or established Click2Cloud; its full chronological historical timeline returns and merges without overwriting current History.
