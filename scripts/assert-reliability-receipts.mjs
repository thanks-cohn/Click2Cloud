// Existing CI's execution ledger: source declarations alone are not test proof.
import {readFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {failures,invariants} from '../src/glaciaring/reliability.mjs';
export function assertReliabilityReceipts(reports){
 const gates=reports.flatMap(r=>r.results??[]);for(const failure of failures){const observed=gates.find(g=>g.gate===failure.testId);if(!observed||!['PASS','REPRODUCED'].includes(observed.state))throw Error('RELIABILITY_CASE_NOT_EXECUTED:'+failure.signature);}
 const browserInvariants=invariants.filter(i=>i.executionSurface==='browser');for(const invariant of browserInvariants){const observed=gates.find(g=>g.gate===invariant.testId);if(!observed||observed.state!=='PASS')throw Error('RELIABILITY_INVARIANT_NOT_EXECUTED:'+invariant.id);}
 if(gates.some(g=>g.state==='FAIL'))throw Error('RELIABILITY_REGRESSION');return {state:'PASS',knownFailureCases:failures.length,browserInvariantCases:browserInvariants.length};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){try{const reports=await Promise.all(process.argv.slice(2).map(async path=>JSON.parse(await readFile(path,'utf8'))));console.log(JSON.stringify(assertReliabilityReceipts(reports)));}catch(error){console.error(String(error.message));process.exitCode=1;}}
