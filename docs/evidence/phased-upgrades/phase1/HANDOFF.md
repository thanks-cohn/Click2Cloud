# Phase 1 — actual Narrow ancestry

Final Phase1 runtime commit:72c0432e15d6da059a033f66d26736b10db7d09d. Earlier logical commits4a00b1a andb2a5fa7. The deep identity guard uses bounded64-bit placement IDs, not recursively escaped parent strings. Starting main9e8916d; immutable regression checkpoint tag remains3b24320138ff0ebbf50a0e6a912a5d2800038676. Version0.3.18/API3+1.1; same extension identity. No merge/push or production deployment.

Focused regression suite: **298 PASS, zero failures**.

**Root cause proven:** `nested.project` produced a tree, but composite `menu-spec` selected only `role=save` candidates then attached every save under the provider, losing parentPlacement. The checkpoint compiles the requested titled path as one flat Cloudflare leaf. `baseline.json` and actual-browser checkpoint comparison reproduce this. Chrome does not invent the flattening.

**Repair:** canonical composite compilation retains the selected Narrow leaves plus their projected ancestors and emits real parent IDs. Shared ancestors merge only when physical identity, visible parent and title agree. Different custom titles retain independent branches; collisions remain disambiguated. An unassigned natural bucket wrapper does not precede the user's first folder title; explicit root titles remain. Explicit Narrow is the opt-in hierarchy, including a single Narrow path; ordinary single Simple/default stays flat, explicit Flat still overrides presentation. No destination/key rewrite. Depth/Simple projectors, OAuth, provisioning, Worker and read/download code are unchanged.

**Evidence:** `browser/results.json` uses real production Shelf/API, actual IndexedDB, compiler and registrar, with substituted Chrome callbacks/OAuth/provider boundaries. GUI + Right Click → Narrow → four custom titles → Save yields Cloudflare → human → money-maker → guns → swole, matching native parent IDs and ACK; reload retains exact levels/target. Unit cases also cover shared ancestors, differing titles, Simple/Flat regression and exact engine dispatch.

`live.json` dispatches the canonical selected leaf through the unchanged existing isolated Worker and verifies exact key/bytes using independently signed R2 S3 GET. Only a new uniquely named test-prefix object is added. Callback ACK/authorization here are fixtures/environment authority, **not actual installed Chrome or extension OAuth**.

`installed/real-shelf-receipt.json` records a genuine unpacked attempt: **BLOCKED, UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR**, response:null; no bypass. Actual Windows native menu rendering/click remains unverified. Representative executable behavior and real R2 component gate pass, allowing the next chronological stage under the approved work order; installed acceptance stays BLOCKED. `verification.json` indexes source-pinned receipts and test results.
