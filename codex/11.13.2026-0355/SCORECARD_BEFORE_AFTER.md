# Logic2Real scorecard — same rules and rubric

Baseline: `a11dcf55b293a10cb8270084fee084db098221ec`; branch `codex/depth-repair-audit`; version 0.3.19. Chrome attempt: Chromium 156.0.8078.79 Linux. Build fingerprints are in EVIDENCE/shelf-{before,after}/real-shelf-receipt.json and final-build.json. Registry timestamp: 2026-11-13T11:35:55.450416+00:00. These are an explicit review rubric, not statistical guarantees.

| Metric | Before | After |
| --- | ---: | ---: |
| Known fidelity | 48.6 | 51.0 |
| Evidence coverage | 45.0 | 45.0 |
| Conservative verified score | 21.8 | 22.9 |
| Gap index | 78.2 | 77.1 |
| Partial/proven discrepancy contribution | 23.1 | 22.1 |
| Unverified exposure | 55.0 | 55.0 |
| Verified discrepancy rate (partial weighted) | 51.4 | 49.0 |

Conservative-score change: **1.1 points**. No live baseline was available; this delta concerns scoped local repairs only. Source and test partial-credit deficits are uncertainty about edge completeness as well as known defects; they must not be described as measured user failure rates. One historical reported failure is explicitly included in R at zero, with partial-quality provenance; it is not new execution.

Denominators: 70 rules, total priority-normalized applicable weight 430.0; 207 supported cells, 134 U cells, 79 NA cells. Raw unrounded aggregates and per-dimension weights are in EVIDENCE/scores.json. Partial scores count half mismatch credit. Weights and NA applicability are identical before/after.

| Dimension | Before known | After known | Coverage | After conservative |
| --- | ---: | ---: | ---: | ---: |
| I | 48.6 | 51.4 | 95.5 | 49.1 |
| T | 48.6 | 50.8 | 100.0 | 50.8 |
| C | N/A | N/A | 0.0 | 0.0 |
| R | 0.0 | 0.0 | 2.2 | 0.0 |
| S | N/A | N/A | 0.0 | 0.0 |
| E | 50.0 | 51.4 | 100.0 | 51.4 |

| Category | Rules | Before known | After known | Coverage | Before conservative | After conservative |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| entry | 4 | 50.0 | 50.0 | 52.8 | 26.4 | 26.4 |
| config | 11 | 50.0 | 50.0 | 46.7 | 23.3 | 23.3 |
| simple | 3 | 44.1 | 44.1 | 47.2 | 20.8 | 20.8 |
| narrow | 3 | 50.0 | 50.0 | 58.3 | 29.2 | 29.2 |
| depth | 12 | 45.9 | 51.4 | 43.5 | 20.0 | 22.4 |
| presentation | 3 | 16.7 | 100.0 | 58.3 | 9.7 | 58.3 |
| rendering | 5 | 50.0 | 50.0 | 52.8 | 26.4 | 26.4 |
| application | 7 | 50.0 | 50.0 | 44.9 | 22.4 | 22.4 |
| routing | 8 | 50.0 | 50.0 | 41.2 | 20.6 | 20.6 |
| security | 6 | 50.0 | 50.0 | 41.2 | 20.6 | 20.6 |
| recovery | 3 | 50.0 | 50.0 | 46.7 | 23.3 | 23.3 |
| resilience | 3 | 50.0 | 50.0 | 35.0 | 17.5 | 17.5 |
| compatibility | 2 | 50.0 | 50.0 | 37.8 | 18.9 | 18.9 |

Category dimension fidelity below is known fidelity among supported cells, not coverage. C/S are unobserved throughout.

| Category | I | T | C | R | S | E |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| entry | 50.0 | 50.0 | N/A | N/A | N/A | 50.0 |
| config | 50.0 | 50.0 | N/A | N/A | N/A | 50.0 |
| simple | 50.0 | 33.3 | N/A | N/A | N/A | 50.0 |
| narrow | 50.0 | 50.0 | N/A | N/A | N/A | 50.0 |
| depth | 53.1 | 53.1 | N/A | 0.0 | N/A | 53.1 |
| presentation | 100.0 | 100.0 | N/A | N/A | N/A | 100.0 |
| rendering | 50.0 | 50.0 | N/A | N/A | N/A | 50.0 |
| application | 50.0 | 50.0 | N/A | N/A | N/A | 50.0 |
| routing | 50.0 | 50.0 | N/A | N/A | N/A | 50.0 |
| security | 50.0 | 50.0 | N/A | N/A | N/A | 50.0 |
| recovery | 50.0 | 50.0 | N/A | N/A | N/A | 50.0 |
| resilience | 50.0 | 50.0 | N/A | N/A | N/A | 50.0 |
| compatibility | 50.0 | 50.0 | N/A | N/A | N/A | 50.0 |

P0 native/save/state gates: **0/39 passed**. Unobserved P0 dimensions prevent a zero-gap or production-readiness claim.

## Coverage with explicit sample sizes

- Rule-to-implementation and test-file mapping: 70/70; this is a traceability metric, not full assertion coverage. Partial coverage remains T=0.5. Source-symbol references are validated by the registry test.
- Named topology scenarios: 12/12 in the prior Depth suite. Additional composition matrix: 384/384 fixture combinations; 192 non-Depth combinations compare exact baseline hashes.
- Exact-target comparison: 888/888 generated save target/action/item identities match baseline across matrix; 8 root labels clarified and 2,876 rows unchanged. This is generated output, **not clicked real object keys**.
- Native Chrome rendered menus: 0 observed scenarios, installation blocked in both attempts. Real Chrome menu coverage 0% of attempted installed scenarios.
- Authorized live R2 write/readback: 0 new attempts; exact clicked-object correctness N/A. One prior user failure is retained, no controlled successful sample.
- Real configuration ↔ installed-menu agreement: N/A (no installed observation). Simulated registrar/application assertions pass; not S credit.
- Recovery: callback-backed registrar and offline persistence assertions only. Windows filesystem and real MV3 restart coverage remain U.
- Regressions: zero new failures detected; one existing Simple golden failure remains. Final full offline 370/371; focused 319/319; module 49/49. Final registry/browser checks recorded separately in TEST_MATRIX.md.

**Release: NOT READY.** The P1 reported Depth save has no end-to-end resolution and native verification is blocked. Low scores preserve missing evidence instead of treating fixtures as live success.
