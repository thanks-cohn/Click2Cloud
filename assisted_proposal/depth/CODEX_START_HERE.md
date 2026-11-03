# Light Codex starter — Isolated V3+1 Depth rebuild

Repository: `thanks-cohn/Click2Cloud`
Branch: `feature/original-vs-assisted-depth-proposals`
Task scope: `assisted_proposal/depth/`

Read **all** documents in this directory in order: `README.md`, `01_SOURCE_MAP.md`, `02_REBUILD_ARCHITECTURE.md`, `03_STORAGE_JOURNAL_RECOVERY.md`, `04_DISCOVERY_AND_MANUAL_SCAN.md`, `05_MENU_PROJECTION.md`, `06_VERIFICATION_MATRIX.md`, `07_IMPLEMENTATION_ORDER.md`. Examine unchanged original source `reference/depth-v3-original.mjs` and `reference/current-v3-original.js`. Verify linked REDOWN real source and tests before coding.

Build **only the independently functioning Depth engine**: V3-parity pure Depth menus with exact source routes; separate fully discovered, durable, authorized directory index that extends to maximum reachable depth regardless of display depth; cursor-based resumable scans; verified semantic delta journal; small daily/weekly index manifests; adaptive immutable snapshots and safe HEAD; recoverable IndexedDB CURRENT; real Explorer scoped Scan and Update; strict native menu registry boundary and no mode cross-imports.

Keep Simple/Narrow/Time Machine private states entirely separate. Their shared provider read interfaces must not give Depth permission to access their configs. Cloudflare login, R2 subscription, automatic redown bucket, automatic bucket visibility, and tree-circle picker are **Simple/neutral editor responsibilities and explicitly excluded here**.

Run original V3 parity tests, new fault/replay/unit tests, test Chrome behavior and real authorized R2 lab only when feasible. Report commits and verifiable outcomes; do not claim end-to-end completion from source-only tests. Produce focused pull request and do not change production REDOWN or merge without owner approval.
