# REDOWN 0.3.26 alpha evidence

The implementation checkpoint is `74dcc8a571e05ac9be2f62d2cfcb8c59ebc8bdaa` on `codex/queue-history-v2-0324-verified-2026-11-24`. The authorized remote tip before implementation was `7ef0921a7626e4a064479a2424bc1a5b012055d9`. The branch's merge base with the verified 0.3.24 foundation is `cd4c8dd3bc11700376d30da050d6050a0eb1edb9`. The build preserves the original extension ID and verifies manifest, package and lockfile version agreement. Release approval remains open. [Baseline inventory](BASELINE.md) · [Approved spec](../../../11.23.2026/queue-final.md)

## Application contracts

- `src/queue/receipts.mjs` normalizes Basic attempt rows and original CURRENT results. IDs are namespaced source attempt IDs. Screenshot output IDs identify destination-specific cards, with the capture operation as their shared parent. Provider object IDs, screenshot checksums and receipt versions are distinct from attempt IDs. Readiness, routine file operations, and Depth wrapper results with an underlying save receipt are excluded.
- A record stores separately observed request, start, terminal, verification and update times, provider and destination, source/host/original/remote/public/preview URL fields, filename, object ID, MIME, bytes, save method, outcome, proof, error code, and available metadata. Indexed order uses the first authoritative terminal timestamp with a stable ID tie breaker. Missing times use available request order or an unknown-date group. Duplicate and older snapshots cannot overwrite newer authoritative outcomes.
- `src/queue/store.mjs` owns the versioned IndexedDB archive, job index, source checkpoints and retention state. Archive and job decisions commit together. Background observers run after owner checkpoint writes and never await History on the save path. Shelf backfill reads 100 original source rows at a time through an extension-origin-checked message, records resumption cursor progress, and isolates source failures. A rejected observer write leaves canonical receipts available. Interrupted R2 and screenshot attempts show attention pending a reliable receipt, with provider-owned inspection or retry when available. Old receipt collections can only recover records they still contain.
- Live Jobs and History V2 have independent mounts. The former orders entries by working, attention, then waiting, ten initial rows, scroll-windowed continuation, and independent acknowledgement. Numeric progress depends on an owner observation, with indeterminate progress for the received save stages. History renders 25 rows per indexed page and uses exact filename/provider/word queries. Direct jumps use bounded cursor advancement and the last page seeks from the opposite end of the index.
- Complete ZIP and detailed ZIP/JSON/JSONL/CSV share bounded reading. The production exporter locks archive writes during its snapshot, reads up to 100 records at a time, streams ZIP32 through the existing ZIP writer to an origin-private file, and gives Chrome a disk-backed file URL. Chrome completion and local size are checked. Files contain a manifest and JSONL dataset with sorted identities, source/outcome/proof counts, SHA-256 and ZIP CRCs. JSON and CSV expose the same sanitized record data.
- The default export keeps HTTP(S) origins and omits arbitrary captured provider metadata. The optional privacy setting also omits browsing origins and titles. Correlation IDs, normalized destination fields and proof are retained. A ZIP is limited by ZIP32 and browser disk quota. Original History retains its existing export options and data.
- Hide filters at query time from terminal chronology. Delete applies to eligible terminal records starting from the time of explicit approval, with maintenance in the browser alarm. Capped retention defaults to the editable suggestion of 200,000 and evicts by indexed chronology. Clear All requires two confirmations and offers export before clearing. Clear and evictions commit exact ID exclusions with record removal. Replays leave excluded IDs suppressed and distinct late-arriving IDs eligible. The exclusion index grows with the number removed and consumes local quota. In-progress exports serialize retention changes without affecting provider save owners.

## Field and feature coverage

| Surface | Implemented behavior | Evidence and limits |
| --- | --- | --- |
| Basic History and jobs | Normalized provider objects, exact ID, destination identity when retained, source/host, timestamp, outcome, request and pending states. Remotes remains the provider-owned sign-in and Continue save surface. | Canonical synthetic receipts and existing Basic engine tests. Google Drive, Dropbox and OneDrive expose internal content proof during saving but lack a trusted History download operation and sufficient retained version fields for all old receipts. Their card controls explain this limitation. |
| R2 archive | Canonical exact object locator, filename, status, context and original URLs, uploaded metadata, proof, GO TO, bounded streamed Download. | Disconnected installed-browser card and synthetic receipt tests. A real account/object readback is unverified. |
| Screenshot archive | Separate destination-specific cards within a shared action, source page, receipt ID, confirmed or uncertain state, exact GO TO, opt-in public URL controls, retry via existing screenshot recovery. Download pins the active version when available and checks the original SHA-256 when the receipt supplies it. | Headed installed Chromium captured, uploaded to an isolated HTTPS R2 fixture and delivered the selected PNG through the production Chrome download path. Fixture 403 and retry exercised the provider-owned behavior. |
| History presentation | Full and Compact presets, bounded lazy previews, keyboard gallery/zoom, calendar sections, editable page number and four controls, source and host disclosures, N/A for missing fields. | Installed paging and card controls with local fixtures. Gallery interaction receives separate coverage from the legacy browser suites. Rename is available through Files. The 0.3.24 History view did not expose an inline rename operation. |
| Settings | Original History preferences retain their existing owner. Queue adds range, timezone, preview and host expansion, layout, cleanup, archive capacity and a visible complete ZIP action. | Installed Queue settings, export with Hide ON, range export when OFF, retirement guards in deterministic tests and capped rollover in Chromium. |
| Navigation and themes | Files, Remotes and Queue are the default main tabs. The three-dot More menu holds other eligible sections. Settings is protected and Downloads is excluded. Remote V1 presents Recovery Mode, Save Whole Cloud and its original status copy. The modern themes hide the specified presentation. | Installed browser with themes, Debug Mode, 340-pixel viewport, reset and restart. All four Remotes cards and their original authorization/actions retain their providers. |
| Native context menu | Existing registrar, compiler, dispatch and provider authorization remain the owners. Queue observes committed results. | Headed Linux Chrome rendered page, image and link menus and delivered the logged-out click. Actual worker termination and reconstruction of a removed menu row were exercised. Signed-in Simple/Narrow/Depth sends remain open. |
| Diagnostics | Existing diagnostics, routes, schemas and exports remain with their original implementation. Queue archives have separate provenance and schema. | Earlier evidence fixtures remain intact. Workings hashes updated for current source, with immutable baseline snapshots preserved. |

## Reproduction

```sh
npm ci
npm run build:extension
node --test tests/queue-history-v2.test.mjs tests/workings.test.mjs
npm test
node scripts/test-queue-v2-browser.mjs
node scripts/test-redown-p1-installed-browser.mjs
node scripts/benchmark-history-v2.mjs
C2C_HISTORY_V2_COUNT=200000 C2C_HISTORY_V2_RETENTION=1 node scripts/benchmark-history-v2.mjs
C2C_SCREENSHOT_QUEUE_ONLY=1 node scripts/test-screenshot-browser.mjs
node scripts/test-native-menu-browser.mjs
```

Use `C2C_CHROME_EXECUTABLE` for an unpacked-extension-capable Chromium executable. The recorded run used Playwright Chromium 143.0.7499.4. System Chromium 156 rejected unpacked extension loading in the isolated test profile. The headed tests use a disposable X11 display, Python Xlib, Tesseract and ImageMagick. The benchmark invokes the independent Python ZIP reader automatically. Its fixture IDs and timestamps are deterministic. All provider and large-volume fixtures use test data.

No live provider credentials, owner browser profile, cloud deployment or provider write authority was used. Live OAuth/reconnect, live exact-object reads, and signed-in native saves against authorized real accounts remain release gates.

## Verification status

| Gate | Result | Evidence |
| --- | --- | --- |
| Build and installed extension card | PASS | Chromium Extensions reports REDOWN 0.3.26 with ID `ajppphdiamdobknpamcheohmdbdbeoal`. [Queue browser](queue-browser.json) |
| Queue and approved UX | PASS | Installed browser exercised receipt reconciliation, interrupted job attention, exact first/previous/typed/last paging, indexed search, narrow layout, card capability messaging, Full/Compact, legacy History, default/custom/reset navigation, protected Settings, four Remotes cards, theme visibility and complete settings ZIP with Hide enabled. [Queue browser](queue-browser.json) · [Narrow Queue](queue-narrow.png) · [Theme regression](theme-regression.json) |
| Screenshot and download | PASS with local R2 fixture | Native Alt+Q and Ctrl+Shift+Y gestures, new-rule Alt+Q and saved None, distinct outputs, 403, retry, exact PNG SHA-256 and filename, changed-content rejection, preview and keyboard zoom. The same browser saved `redown-history.zip` and independently verified four output records. [Screenshot browser](screenshot-browser.json) |
| Native menu | PARTIAL | OS-rendered page, image and link menus, logged-out native dispatch and service-worker restart with a lost Chrome menu row passed. The extension reload and browser-restart ACK checks timed out on both the release and the unmodified authorized baseline under the same headed Chromium harness. [Release native evidence](native-browser.json) · [Baseline native evidence](native-baseline.json) |
| Broader screenshot and Explorer lane | Baseline failure reproduced | The legacy Explorer pop-out search focus wait timed out on both the authorized baseline and the release in the headed fixture. The focused screenshot and History V2 lane passed. |
| Retention | PASS with synthetic records | A fixture of 200,001 total arrivals retained exactly 200,000. The oldest record was evicted, the protected archive was cleared, replayed records stayed excluded, and a fresh record was admitted. Observed rollover plus readback was 965 ms. Clearing took 57.9 s in the large synthetic run. [Retention benchmark](retention-200000.json) |
| Live provider acceptance | UNVERIFIED | Signed-in Google Drive, OneDrive, Dropbox and Cloudflare OAuth/reconnect, authorized live exact-file reads and signed-in Simple/Narrow/Depth saves require an authorized test account. |

| Full regression suite | 800 of 802 passed | The authorized tip passed 790 of 793. The release retains two baseline failures in menu composition byte equivalence and an ownership artifact tied to 0.3.24. The CURRENT source-hash check now passes. [Structured status](verification.json) |

## 100,000-record ZIP benchmark

The unpacked 0.3.26 build at `ccc78b919464ebfc8cf5580273d585d994c9c93a` used Chromium 143.0.7499.4 on Linux with a INTEL(R) XEON(R) PLATINUM 8573C. The deterministic fixture contains four provider sources, stable identifiers, repeated timestamps, missing provenance and mixed outcomes. An independent Python reader checked every identity in timestamp/ID order, ZIP CRC, archive counts, proof totals, and the dataset SHA-256. A mutation queued during serialization arrived after the export snapshot and was omitted from the completed ZIP.

| Measurement | Result |
| --- | --- |
| Records exported and independently verified | 100,000 |
| ZIP size | 49,076,401 bytes (46.8 MiB) |
| Reported IndexedDB usage for isolated profile | 69,542,734 bytes |
| Export and Chrome transfer | 12.0 s |
| Indexed queries, p95 across ten calls | 577 ms |
| Seed time | 96.8 s |
| Max record batch and encoded chunk | 100 records and 47.9 KiB |
| Peak export batch text buffers | 191.8 KiB |
| Sampled browser JavaScript heap | 5.0 MiB before export and 30.9 MiB peak |

The heap sample includes browser scripting overhead beyond the export buffers. Process RSS and paint latency were outside this measurement. A separate run under concurrent validation took 37.0 s to export and also passed the verifier. [Release benchmark](benchmark-100000.json) · [Concurrent run](benchmark-100000-concurrent-load.json) · [Exact changed paths](FILES_CHANGED.txt)
