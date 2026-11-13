import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export const weights=Object.freeze({I:.20,T:.10,C:.25,R:.25,S:.15,E:.05});
export const priorities=Object.freeze({P0:8,P1:4,P2:2,P3:1});
export function score(rules,phase='after'){
 let all=0,known=0,credit=0,partialCells=0,verifiedCells=0,unverifiedCells=0,naCells=0;
 for(const rule of rules){
  const cells=rule.scores[phase];if(!cells||!priorities[rule.priority])throw Error('Invalid rule/phase');
  let applicable=0;for(const [dimension,weight] of Object.entries(weights)){
   const value=cells[dimension];if(![0,.5,1,'U','NA'].includes(value))throw Error('Invalid score: '+rule.id+':'+dimension);
   if(value==='NA'){if(!rule.na_reasons?.[dimension])throw Error('NA needs a reason');naCells++;}else applicable+=weight;
  }
  if(!applicable)continue;
  for(const [dimension,weight] of Object.entries(weights)){
   const value=cells[dimension];if(value==='NA')continue;
   const w=priorities[rule.priority]*weight/applicable;all+=w;
   if(value==='U'){unverifiedCells++;continue;}
   verifiedCells++;if(value<1)partialCells++;known+=w;credit+=w*value;
  }
 }
 return {rules:rules.length,applicableWeight:all,verifiedWeight:known,credit,verifiedCells,unverifiedCells,naCells,partialCells,
  known_score:known?100*credit/known:null,evidence_coverage:all?100*known/all:0,
  conservative_verified_score:all?100*credit/all:0,gap_index:all?100*(all-credit)/all:100,
  proven_discrepancy_contribution:all?100*(known-credit)/all:0,unverified_exposure:all?100*(all-known)/all:100,
  // Partial .5 earns half mismatch weight; this equals 1-known fidelity.
  verified_discrepancy_rate:known?100*(known-credit)/known:null};
}
export function report(registry){const rules=registry.rules;return Object.fromEntries(['before','after'].map(phase=>[phase,{total:score(rules,phase),
 categories:Object.fromEntries([...new Set(rules.map(r=>r.category))].map(c=>[c,score(rules.filter(r=>r.category===c),phase)])),
 dimensions:Object.fromEntries(Object.keys(weights).map(d=>{let all=0,verified=0,credit=0;for(const r of rules){const v=r.scores[phase][d];if(v==='NA')continue;const applicable=Object.keys(weights).reduce((s,k)=>s+(r.scores[phase][k]==='NA'?0:weights[k]),0),w=priorities[r.priority]*weights[d]/applicable;all+=w;if(v!=='U'){verified+=w;credit+=w*v;}}return [d,{applicableWeight:all,verifiedWeight:verified,known_score:verified?100*credit/verified:null,evidence_coverage:all?100*verified/all:0,conservative_verified_score:all?100*credit/all:0}];})),
 p0Gate:{total:rules.filter(r=>r.priority==='P0').length,passed:rules.filter(r=>r.priority==='P0'&&['C','R','S'].every(d=>r.scores[phase][d]===1||r.scores[phase][d]==='NA')).length}
 }]));}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const path=process.argv[2]??'codex/11.13.2026-0355/RULES.json',registry=JSON.parse(await readFile(path));const output=JSON.stringify(report(registry),null,2)+'\n';if(process.argv[3])await writeFile(process.argv[3],output);else console.log(output);}
