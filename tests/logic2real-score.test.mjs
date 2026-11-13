import test from 'node:test';import assert from 'node:assert/strict';
import {score} from '../scripts/logic2real-score.mjs';
import {readFile} from 'node:fs/promises';
const rule=(cells,priority='P0',na_reasons={})=>({id:'fixture',priority,na_reasons,scores:{after:cells}});
test('Logic2Real U earns zero credit but is not a measured failure',()=>{
 const r=score([rule({I:1,T:1,C:'U',R:'U',S:'U',E:1})]);
 assert(Math.abs(r.known_score-100)<1e-10);assert(Math.abs(r.evidence_coverage-35)<1e-10);assert(Math.abs(r.conservative_verified_score-35)<1e-10);assert.equal(r.proven_discrepancy_contribution,0);assert(Math.abs(r.unverified_exposure-65)<1e-10);
});
test('Logic2Real NA renormalizes, partial mismatch and missing evidence remain separate',()=>{
 const r=score([rule({I:.5,T:0,C:'NA',R:'U',S:'NA',E:1},'P1',{C:'not native',S:'stateless'})]);
 assert(Math.abs(r.applicableWeight-4)<1e-10);assert(Math.abs(r.gap_index-r.proven_discrepancy_contribution-r.unverified_exposure)<1e-10);assert(r.verified_discrepancy_rate>0);assert.equal(r.naCells,2);
 assert.throws(()=>score([rule({I:1,T:1,C:'NA',R:'U',S:'U',E:1})]),/reason/);
});
test('Logic2Real all unknown has no known score; critical weights are retained',()=>{
 const u={I:'U',T:'U',C:'U',R:'U',S:'U',E:'U'};
 assert.equal(score([rule(u)]).known_score,null);assert.equal(score([rule(u)]).evidence_coverage,0);
 const r=score([rule({I:1,T:1,C:1,R:1,S:1,E:1}),rule({I:0,T:0,C:0,R:0,S:0,E:0},'P3')]);assert(Math.abs(r.known_score-800/9)<1e-10);
});
test('canonical registry has unique versioned rules and resolvable source/test traces; missing native proof stays open',async()=>{
 const registry=JSON.parse(await readFile(new URL('../codex/11.13.2026-0355/RULES.json',import.meta.url)));
 assert.equal(new Set(registry.rules.map(r=>r.id)).size,registry.rules.length);
 for(const r of registry.rules){
  for(const field of ['source_of_intent','intent','preconditions','input_scenarios','expected_menu','expected_state','expected_click_result','observed_simulation','observed_live_chrome','observed_real_write','discrepancy','root_cause','fix_status','confidence','owner_notes'])assert(r[field],r.id+': '+field);
  for(const ref of r.implementation_trace){const [path,symbol]=ref.split(':');assert((await readFile(new URL('../'+path,import.meta.url),'utf8')).includes(symbol),ref);}
  for(const t of r.regression_tests.filter(t=>t.startsWith('tests/')))await readFile(new URL('../'+t,import.meta.url));
  assert.equal(r.scores.after.C,'U');assert.notEqual(r.status,'live-verified');score([r]);
 }
});
