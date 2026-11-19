import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {report,score,weights,priorities} from './logic2real-score.mjs';
const dir=resolve(process.argv[2]??'codex/11.13.2026-0355'),registry=JSON.parse(await readFile(resolve(dir,'RULES.json'))),rules=registry.rules,scores=report(registry);
const write=(name,text)=>writeFile(resolve(dir,name),text.trimEnd()+'\n');
const p=n=>n==null?'N/A':n.toFixed(1);
const dimensionKnown=(rs,phase,d)=>{let known=0,credit=0;for(const r of rs){const v=r.scores[phase][d];if(typeof v!=='number')continue;const sum=Object.keys(weights).reduce((s,k)=>s+(r.scores[phase][k]==='NA'?0:weights[k]),0),w=priorities[r.priority]*weights[d]/sum;known+=w;credit+=w*v;}return known?100*credit/known:null;};
await write('RULES.md',`# Canonical Logic2Real rule registry v1

${rules.length} discovered rules at baseline \`${registry.baseline}\`. This source inventory covers production entry points, configuration, independent modes, projection, application, routing, auth, resilience and recovery. It is not certification of exhaustive runtime behavior. Unknown edges remain open. Non-Depth analysis authorizes no implementation changes.

The complete structured records, including per-rule input scenarios, expected state/click result, evidence limitations and before/after scores, are in [RULES.json](RULES.json). Stable IDs must not be recycled. Sources use stable symbols so line movement does not break ownership.

${rules.map(r=>`## ${r.id} — ${r.title}

**${r.priority}; ${r.status}. INTENT:** ${r.intent}

**IMPLEMENTATION:** ${r.implementation_trace.map(x=>'\`'+x+'\`').join(', ')}. ${r.expected_state}

**REALITY:** ${r.observed_live_chrome.result}; ${r.observed_live_chrome.blocker}. Remote outcome: ${r.observed_real_write.result}. Local evidence: ${Array.isArray(r.observed_simulation.evidence)?r.observed_simulation.evidence.join(', '):r.observed_simulation.evidence}.

**DISCREPANCY:** ${r.discrepancy} Root cause: ${r.root_cause}.

**Tests / falsification:** ${r.regression_tests.join('; ')}. Any wrong hierarchy, changed target, unintended persisted mutation, unsupported success claim or mismatched readback falsifies the relevant invariant. Missing observations do not establish correctness.
`).join('\n')}

## Maintenance

For future iterations, discover callers and source symbols first; append rules for new branches rather than silently dropping gaps. Update RULES.json with precise build/browser/operation provenance, measured outcomes and NA reasons. Re-run named assertions and native tests where permitted, then run \`node scripts/render-logic2real.mjs\`. Preserve baseline scores and identical weights/scenarios. A repaired fixture does not close C/R/S. Never copy tokens or signed URLs into evidence.
`);
await write('TRACEABILITY.md',`# Intent → Implementation → Reality → Discrepancy

Each row corresponds to a canonical rule; scores and full evidence in [RULES.json](RULES.json). All installed-menu observations are **UNVERIFIED** because Chrome refuses unpacked extension installation. Real R2 readback is unverified, except one historical user-reported failure retained as a negative observation. That report does not identify an exact clicked action or establish current-build reproduction.

| Rule | INTENT | IMPLEMENTATION | REALITY | Evidence coverage | DISCREPANCY / owner action |
| --- | --- | --- | --- | ---: | --- |
${rules.map(r=>`| ${r.id} (${r.priority}) | ${r.intent} | ${r.implementation_trace.join(', ')}; partial source/test support | Local: ${r.observed_simulation.result}; native: U; remote: ${r.observed_real_write.result} | ${p(score([r]).evidence_coverage)}% | ${r.discrepancy} Owner: observe exact installed build/action; preserve settings. |`).join('\n')}

## Not a spec / unresolved product decisions

- D1: architecture/depth.md shows a bucket wrapper for one nonempty Depth bucket; prior repair audit deliberately inlines it. This patch retains inlining and labels only its root save with the bucket name, as REQUEST §3 allows. Owner should ratify the final diagram; no unrelated nesting changed.
- D2: older scaffold describes exclusive Flat; current composite implements additive checked trees. Non-Depth behavior retained.
- D3: historical REDOWN/Cloudflare R2 roots differ from current composite provider siblings; Chrome may supply its own extension grouping. Native rendering remains unobserved.
- D4: a sole Simple choice loses its configured title through direct provider optimization. No Simple change authorized.
- D5: Narrow natural bucket wrappers may be omitted, with numbered same-name sibling collision labels. Exact routes remain distinct; disambiguation product decision remains open.
- D6: the existing Simple golden expected menu disagrees with source. Full-suite failure retained; no expectation was suppressed.
- D7: reported Depth WORKER_SETUP_REQUIRED, separately retained SCOPE_UNAUTHORIZED and NATIVE_APPLY_INCOMPLETE have no shared operation/timestamp proof. Do not collapse them into one cause.
- D8: proposed Queue/headless recovery/debug capabilities in architecture/debug.md are aspirations unless present in the API/source. This Depth task does not authorize implementing them.
`);
await write('EVIDENCE/scores.json',JSON.stringify(scores,null,2));
await write('SCORECARD_BEFORE_AFTER.md',`# Logic2Real scorecard — same rules and rubric

Baseline: \`${registry.baseline}\`; branch \`codex/depth-repair-audit\`; version 0.3.19. Chrome attempt: Chromium 156.0.8078.79 Linux. Build fingerprints are in EVIDENCE/shelf-{before,after}/real-shelf-receipt.json and final-build.json. Registry timestamp: ${registry.generatedAt}. These are an explicit review rubric, not statistical guarantees.

| Metric | Before | After |
| --- | ---: | ---: |
${[['Known fidelity','known_score'],['Evidence coverage','evidence_coverage'],['Conservative verified score','conservative_verified_score'],['Gap index','gap_index'],['Partial/proven discrepancy contribution','proven_discrepancy_contribution'],['Unverified exposure','unverified_exposure'],['Verified discrepancy rate (partial weighted)','verified_discrepancy_rate']].map(([l,k])=>`| ${l} | ${p(scores.before.total[k])} | ${p(scores.after.total[k])} |`).join('\n')}

Conservative-score change: **${p(scores.after.total.conservative_verified_score-scores.before.total.conservative_verified_score)} points**. No live baseline was available; this delta concerns scoped local repairs only. Source and test partial-credit deficits are uncertainty about edge completeness as well as known defects; they must not be described as measured user failure rates. One historical reported failure is explicitly included in R at zero, with partial-quality provenance; it is not new execution.

Denominators: ${rules.length} rules, total priority-normalized applicable weight ${p(scores.after.total.applicableWeight)}; ${scores.after.total.verifiedCells} supported cells, ${scores.after.total.unverifiedCells} U cells, ${scores.after.total.naCells} NA cells. Raw unrounded aggregates and per-dimension weights are in EVIDENCE/scores.json. Partial scores count half mismatch credit. Weights and NA applicability are identical before/after.

| Dimension | Before known | After known | Coverage | After conservative |
| --- | ---: | ---: | ---: | ---: |
${Object.keys(scores.after.dimensions).map(d=>{const a=scores.after.dimensions[d],b=scores.before.dimensions[d];return `| ${d} | ${p(b.known_score)} | ${p(a.known_score)} | ${p(a.evidence_coverage)} | ${p(a.conservative_verified_score)} |`;}).join('\n')}

| Category | Rules | Before known | After known | Coverage | Before conservative | After conservative |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${Object.entries(scores.after.categories).map(([c,a])=>{const b=scores.before.categories[c];return `| ${c} | ${a.rules} | ${p(b.known_score)} | ${p(a.known_score)} | ${p(a.evidence_coverage)} | ${p(b.conservative_verified_score)} | ${p(a.conservative_verified_score)} |`;}).join('\n')}

Category dimension fidelity below is known fidelity among supported cells, not coverage. C/S are unobserved throughout.

| Category | I | T | C | R | S | E |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${Object.keys(scores.after.categories).map(c=>'| '+c+' | '+Object.keys(weights).map(d=>p(dimensionKnown(rules.filter(r=>r.category===c),'after',d))).join(' | ')+' |').join('\n')}

P0 native/save/state gates: **${scores.after.p0Gate.passed}/${scores.after.p0Gate.total} passed**. Unobserved P0 dimensions prevent a zero-gap or production-readiness claim.

## Coverage with explicit sample sizes

- Rule-to-implementation and test-file mapping: ${rules.length}/${rules.length}; this is a traceability metric, not full assertion coverage. Partial coverage remains T=0.5. Source-symbol references are validated by the registry test.
- Named topology scenarios: 12/12 in the prior Depth suite. Additional composition matrix: 384/384 fixture combinations; 192 non-Depth combinations compare exact baseline hashes.
- Exact-target comparison: 888/888 generated save target/action/item identities match baseline across matrix; 8 root labels clarified and 2,876 rows unchanged. This is generated output, **not clicked real object keys**.
- Native Chrome rendered menus: 0 observed scenarios, installation blocked in both attempts. Real Chrome menu coverage 0% of attempted installed scenarios.
- Authorized live R2 write/readback: 0 new attempts; exact clicked-object correctness N/A. One prior user failure is retained, no controlled successful sample.
- Real configuration ↔ installed-menu agreement: N/A (no installed observation). Simulated registrar/application assertions pass; not S credit.
- Recovery: callback-backed registrar and offline persistence assertions only. Windows filesystem and real MV3 restart coverage remain U.
- Regressions: zero new failures detected; one existing Simple golden failure remains. Final full offline 370/371; focused 319/319; module 49/49. Final registry/browser checks recorded separately in TEST_MATRIX.md.

**Release: NOT READY.** The P1 reported Depth save has no end-to-end resolution and native verification is blocked. Low scores preserve missing evidence instead of treating fixtures as live success.
`);
console.log(JSON.stringify({rules:rules.length,before:scores.before.total,after:scores.after.total}));
