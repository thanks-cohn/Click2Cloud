# P0 Logic2Real snapshot
Baseline 2904ff9bb1f28b82986a0f8022d38d970c014d3a; isolated repair branch codex/depth-p0-click-save. Original 70 rules carry forward their prior AFTER values as this run's baseline; three new Depth P0 rules cover fresh readiness, attempt feedback and plan reason. All unrelated scores unchanged. Root historical scorecard retained.

| Metric | Before | After |
| --- | ---: | ---: |
| Known fidelity | 49.1 | 53.0 |
| Evidence coverage | 44.5% | 44.5% |
| Conservative score | 21.8 | 23.6 |
| Gap | 78.2 | 76.4 |
| Supported fidelity shortfall | 22.6 | 20.9 |
| Unverified exposure | 55.5 | 55.5 |

73 rules; unchanged priority/dimension rubric in ../SCORING.md; raw per-category/dimension denominators in EVIDENCE/scores.json. New rules I/T/E gain local assertion support only; C/R/S stay U. Historical user-reported failed R remains zero. No positive live fidelity increase or zero-gap claim. Per-rule inputs/evidence remain in RULES.json. Recompute with `node scripts/logic2real-score.mjs codex/11.13.2026-0355/DEPTH_P0_REPAIR/RULES.json codex/11.13.2026-0355/DEPTH_P0_REPAIR/EVIDENCE/scores.json`.
