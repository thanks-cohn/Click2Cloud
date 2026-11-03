# Depth — acceptance matrix and evidence contract

**Never claim V3+1 Depth complete from pure module tests alone.**

| Requirement | Test / necessary evidence |
|---|---|
| Extracted source parity | V3 Depth menu 1/2/3/5/10, bucket level zero, true folder names, `Save here`, resolver identities |
| Full known depth | Seed a real 16-level folder path; choose menu depth=1, verify graph still includes all 16 |
| Pure view | Menu depth 1→10→2→10 causes zero inventory deletion and zero cloud listings **due solely to selection** |
| Scope isolation | Changing Simple labels, Narrow routes, Time Machine tracking leaves Depth graph, scope revisions and menu plan unchanged |
| Multi-bucket | Four authorized test buckets; never mix identical prefixes or implicitly include unselected roots |
| Delta minimalism | One confirmed new directory → one semantic delta; ordinary file save in same known folder → no structural delta |
| Idempotent scan | Repeating unchanged exact-scope scan → zero new folder events |
| Partial failure | Missing/expired cursor, 401/403/429, timeout → preserve known folders, no false tombstone |
| Recovery | Abort IndexedDB transaction and restart worker mid pagination → no partial state, resume exact frontier |
| Checkpoint | Immutable snapshot + journals reconstruct exact generation without full provider re-enumeration |
| Privacy | No credentials/source URLs in records; private encrypted off-browser backup with user permission |
| Chrome | Installed real Chrome native IDs/parent hierarchy, correct user-selected route after worker restart |
| Other providers | Depth update leaves Drive/Dropbox/OneDrive registration untouched |
| Migration | Original REDOWN CURRENT backed up, existing saved destinations preserved, rollback ready |
| Release | Explicit owner approval before REDOWN production transplant |

### Existing lab

An explicitly approved test environment previously created `redown-bucket-1` ... `redown-bucket-4` (two public test domains, two private), plus `redown/__redown_v3plus1_lab__/` nested deep fixtures. Verify live authorization and object ownership before testing; do not change public/private domain exposure or unrelated objects. Large 10K/100K+ synthetic graphs are required for performance/fairness tests.

Report exact commits, test commands and counts, Chrome screenshots/receipts, provider request scope, replay hashes and unresolved blockers. `src/scope-identity.mjs` and `src/scan-diff.mjs` are reference-only functions until connected to real adapters, transactions and Chrome.
