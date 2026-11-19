# Logic2Real scoring methodology v1

The canonical data is RULES.json. Run `node scripts/render-logic2real.mjs` to recompute the Markdown scorecard, readable rules, traceability and raw EVIDENCE/scores.json. `scripts/logic2real-score.mjs` is importable and separately tested for arithmetic, U/NA semantics, priority weighting and input validation.

Priority weights: P0=8, P1=4, P2=2, P3=1. P0 protects target/security/state integrity and application authority; P1 protects essential usability/routing and the reported live failure; P2 visual polish/packaging. Uncertain criticality remains an explicit review choice, not a reason to lower weight.

Dimension weights: I=.20, T=.10, C=.25, R=.25, S=.15, E=.05. For each rule, remove genuinely NA dimensions and divide remaining weights by their applicable sum. U stays in the denominator. No weight or applicability differs before/after.

- I: implementation matches normative intent. 1 is used only for the tightly scoped locally demonstrated repair; .5 means an inspected mechanism with partial edge-case support; 0 means observed violation/missing requested mechanism; U means intent precedence is unsettled.
- T: meaningful asserted coverage of that rule. 1 for scoped named repair cases; .5 for partial existing assertions; 0 for a contrary known expectation or missing requested assertion. A linked test file does not alone establish full rule coverage.
- C: actual installed native menu behavior. All C are U. Real Chromium DOM with synthetic IPC is valuable UI evidence but never installed-menu proof.
- R: actual routing/outcome. All new live outcomes are U. The one historical user-reported Depth failure is retained as R=0, before and after, with one uncontrolled negative sample and no assumed clicked row. It is not a reproduction on the current build. Non-write rules use NA with a reason.
- S: durable/projected/acknowledged/observed convergence across transitions. Fixture ACK and local IDB do not independently prove installed convergence; all applicable S remain U.
- E: reproducible provenance and independent local inspection. .5 for traceable source/offline logs with explicit limits; 1 only for paired measured scoped repair artifacts. No evidence grade upgrades C/R/S.

For applicable weight w and score v:

```
known_score = 100 * sum(w*v for supported numeric cells) / sum(w for supported numeric cells)
evidence_coverage = 100 * sum(w for supported numeric cells) / sum(w for all applicable cells)
conservative_verified_score = 100 * sum(w*v for supported numeric cells) / sum(w for all applicable cells)
gap_index = 100 - conservative_verified_score
supported_fidelity_shortfall = 100 * sum(w*(1-v) for numeric cells) / sum(w for all applicable cells)
unverified_exposure = 100 * sum(w for U cells) / sum(w for all applicable cells)
verified_discrepancy_rate = 100 * sum(w*(1-v) for numeric cells) / sum(w for numeric cells)
```

`proven_discrepancy_contribution` in raw output is the supported-fidelity-shortfall term. It includes half-credit for partial support, **not just proven broken functionality**. A .5 rule-level fidelity deficit is not a measured 50% user failure rate. The scorecard deliberately labels this “partial/proven discrepancy contribution.” Known shortcomings, partial edge support and unobserved reality must be read with the canonical per-rule explanations. Zero applicable supported cells gives known_score=N/A. U earns no conservative credit but is not a measured failure. Invalid numeric grades and undocumented NA are rejected.

The critical gate is independent of averages: every applicable P0 C/R/S must be fully verified before claiming zero gap or production readiness. No P0 passes that gate in this environment.

Before/after uses the same 70-rule inventory, priorities, dimensions and scenario definitions. The baseline has no native observation; there is no fabricated live before/after. Scores are explicit qualitative review grades on a coarse 0/.5/1 rubric, not statistical estimates. Raw aggregates retain precision; displayed percentages round to one decimal. Branch/commit, exact source digest, browser, fixture identifiers, sample counts and limitations accompany the evidence.
