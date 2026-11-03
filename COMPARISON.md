# Click2Cloud — Original vs Assisted Proposal

These are **two preserved, side-by-side alternatives**, not two active production engines.

| Question | [Original proposition](original_proposition/) | [Assisted proposal](assisted_proposal/) |
|---|---|---|
| Simple & Depth V3 parity source | Extracted REDOWN source and tests | Source-preserved original remains authoritative until parity proved |
| Narrow | Reserved for later complete rewrite | Same |
| Directory storage | Full snapshot + small changes; Daily/Weekly indexes, HEAD | Same foundation |
| Snapshot cadence | Initially weekly full checkpoint | Adaptive full checkpoints; optional daily/weekly lightweight *named recovery points* |
| Journal cleanup | Retention/compaction safeguards | **Time Machine historical queries explicitly prevent deleting old required segments** |
| Current vs past | Reconstruct latest known directory | Reconstruct latest and arbitrary historical observed generations |
| Historical file identity | Not yet specified as independent engine in copied documents | Optional isolated RFIS/Time Machine file identity and placement history |
| Scan and Update | Recursive subtree by default, shallow alternative | Immediate-child default, explicit recursive choice |
| External change detection | Targeted periodic scans | Change feeds where supported, plus bounded scans and manual repair |
| Privacy/restore | Independent encrypted external backups required | Same, with per-namespace historical segment integrity & replay |

**Source lineage:** `thanks-cohn/REDOWN/NEED_TO_DO/fundamentals.md`, `FOREVER_WORKS/v3/P0_PERSISTENT_RIGHT_CLICK_TREE_WORK_REQUEST.md`, and `docs/proposals/RFIS_PERSISTENT_FILE_IDENTITY_HISTORY.md`.

**Status:** none of these files are being used by REDOWN's shipping code or live provider/Chrome adapters. Pure historical replay reference tests do not establish browser or cloud end-to-end performance.

## Connection-scope update

The owner-approved revised integration contract is under [Universal Connectors](universal_connectors/). One active mode **per S3 connection** is essential; it does not require separate engines or huge copy-on-every-provider inventories. Cloudflare, MEGA S4, Amazon S3, other compatible object providers, and future supported non-S3 adapters each contribute independent rows to a neutral REDOWN registrar. Native providers stay flat unless the owner separately changes them.
