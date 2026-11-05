#!/usr/bin/env node
// Run with node --expose-gc scripts/benchmark-glaciaring.mjs. No network/provider writes.
import assert from 'node:assert/strict';
import os from 'node:os';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
function sourceFingerprints(relative='src') {
  const base=new URL('../'+relative+'/',import.meta.url);
  return readdirSync(base,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?sourceFingerprints(relative+'/'+entry.name):/\.(mjs|js)$/.test(entry.name)?[{path:relative+'/'+entry.name,sha256:createHash('sha256').update(readFileSync(new URL(entry.name,base))).digest('hex')}]:[]);
}
function sourceRevision() {
  try {
    const head = readFileSync(new URL('../.git/HEAD', import.meta.url), 'utf8').trim();
    if (/^[a-f0-9]{40}$/.test(head)) return head;
    if (/^ref: refs\/[A-Za-z0-9_./-]+$/.test(head)) return readFileSync(new URL('../.git/' + head.slice(5), import.meta.url), 'utf8').trim();
  } catch {}
  return 'unknown';
}
import { compileMenuSpec } from '../src/core/menu-spec.mjs';
import { resolveMenuAction } from '../src/core/action-resolver.mjs';
import { createChromeRegistrar } from '../src/chrome/registrar.mjs';
import { createDiagnostics, CRITICAL_BOUNDARIES } from '../src/glaciaring/index.mjs';
import { createAgentDebugApi } from '../src/glaciaring/agent-api.mjs';
import { menuFixture, nativeFixture, callbackChrome } from './glaciaring-fixtures.mjs';
import { distribution, overheadGate, measureAlternating, pairedOverhead } from './performance-utils.mjs';

const samples = Math.max(100, Number(process.env.GLACIARING_BENCH_SAMPLES) || 120);
const operationId = 100;
function variants() {
  const disabled = createDiagnostics({enabled:false});
  const passive = createDiagnostics();
  const debug = createDiagnostics();
  return {disabled:{diagnostics:disabled,sink:undefined},passive:{diagnostics:passive,sink:passive.emit},debug:{diagnostics:debug,sink:debug.emit}};
}
function checkedFaultCorpus() {
  // Exhaustive for diagnostic status encoding, not a replacement for owner-level fault injection.
  const d = createDiagnostics({capacity:512});
  const terminalFaults = ['failed','blocked','uncertain','partial','stale','interrupted','unknown'];
  let assertions = 0;
  for (const boundary of CRITICAL_BOUNDARIES) for (const outcome of terminalFaults) {
    d.restart();
    d.declareOperation(operationId,[boundary.stage]);
    const signal = d.emit({stage:boundary.stage,outcome,code:'UNKNOWN',operationId});
    const snapshot = d.snapshot({operationId});
    assert.ok(signal > 0);
    assert.equal(snapshot.status,'FAIL');
    assert.ok(snapshot.candidates.some(c=>c.signal===signal && c.stage===boundary.stage && c.outcome===outcome));
    assertions++;
  }
  const chain = createDiagnostics();
  chain.declareOperation(200,['auth.check','worker.capability','transfer.upload','transfer.verify','completion.history']);
  const green = chain.emit({stage:'auth.check',outcome:'ok',code:'OK',operationId:200});
  const fault = chain.emit({stage:'worker.capability',outcome:'failed',code:'CAPABILITY_MISMATCH',operationId:200,requires:[green]});
  const blocked = chain.emit({stage:'transfer.upload',outcome:'blocked',code:'UPLOAD_FAILED',operationId:200,requires:[fault]});
  chain.emit({stage:'completion.history',outcome:'skipped',code:'HISTORY_SKIPPED',operationId:200,requires:[blocked]});
  const independent = chain.emit({stage:'transfer.verify',outcome:'failed',code:'RECEIPT_MISMATCH',operationId:201});
  const snapshot = chain.snapshot();
  assert.ok(snapshot.candidates.some(c=>c.signal===fault && c.classification==='observed-fault-candidate'));
  assert.ok(snapshot.candidates.some(c=>c.signal===blocked && c.classification==='dependent-symptom'));
  assert.ok(snapshot.candidates.some(c=>c.signal===independent && c.classification==='observed-fault-candidate'));
  assert.ok(chain.snapshot({operationId:200}).gaps.some(g=>g.stage==='transfer.verify' && g.code==='CHECKPOINT_MISSING'));
  const disabled = createDiagnostics({enabled:false});
  disabled.emit({stage:'transfer.upload',outcome:'ok',code:'OK',operationId});
  assert.equal(disabled.snapshot({operationId,expectedStages:['transfer.upload']}).status,'COVERAGE_GAP');
  const bounded = createDiagnostics({capacity:1});
  bounded.emit({stage:'transfer.upload',outcome:'failed',code:'UPLOAD_FAILED',operationId});
  bounded.emit({stage:'transfer.verify',outcome:'ok',code:'OK',operationId});
  assert.ok(bounded.snapshot({operationId}).gaps.some(g=>g.code==='OBSERVATION_EVICTED'));
  bounded.restart();
  assert.ok(bounded.snapshot({operationId}).gaps.some(g=>g.code==='OBSERVATION_GAP'));
  return {status:'PASS',evidenceClass:'unit-diagnostic-core',stageCount:CRITICAL_BOUNDARIES.length,terminalOutcomes:terminalFaults,assertedFaultCases:assertions,
    additional:['green parent + failed child','independent second operation','causal blocked symptom','missing mandatory verify','disabled UNKNOWN','eviction','restart gap'],
    limitation:'This corpus checks every declared stage status encoder; owner branch tests and external receipts are separate gates.'};
}
const report = {schemaVersion:1, command:'node --expose-gc scripts/benchmark-glaciaring.mjs',
  sourceFiles:[...sourceFingerprints(),...sourceFingerprints('scripts')],
  environment:{node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,totalMemoryBytes:os.totalmem(),gcExposed:typeof global.gc==='function',sourceRevision:sourceRevision()},
  method:{samplesPerVariant:samples,warmupSamples:20,order:'balanced six-permutation rotation of disabled/passive/debug',capture:'passive and debug have identical mandatory capture; debug only defers queries',clock:'performance.now',units:'milliseconds',providerRequests:0,nativeEvidence:'injected Chrome callback integration; not installed-browser timing',coldDefinition:'fresh Node diagnostic and registrar instances; not cold MV3'},
  faultDetection:checkedFaultCorpus(),
  sourceCoverage:{status:CRITICAL_BOUNDARIES.every(r=>r.coverage==='covered')?'PASS':'COVERAGE_GAP',rows:CRITICAL_BOUNDARIES.map(r=>({stage:r.stage,coverage:r.coverage}))},compile:[],apply:[],click:null,memory:null,export:null,
  externalGates:{installedChromeTiming:'NOT_TESTED',coldMv3Timing:'NOT_TESTED',authenticatedProviderReceipt:'NOT_TESTED',agentIterationSavings:'NOT_TESTED'}};

for (const scenario of [
  {name:'reference-300-wide-multi-provider',count:300},
  {name:'large-1000-wide-multi-provider',count:1000},
  {name:'deep-16-partial-multi-provider',count:300,partial:true,deep:true}
]) {
  const fixture = menuFixture(scenario);
  const base = compileMenuSpec(fixture);
  const v = variants();
  let paired;
  const times = await measureAlternating({samples,variants:v,onSamples:values=>{paired=pairedOverhead(values);},execute:({sink},i)=>{
    const spec = compileMenuSpec({...fixture,sink,operationId});
    assert.equal(spec.rows.length,base.rows.length);
    assert.equal(spec.omissions.length,base.omissions.length);
  }});
  report.compile.push({scenario:scenario.name,discoveredFolders:scenario.count,menuRows:base.rows.length,omissions:base.omissions.length,timings:times,pairedDeltaMs:paired,
    passiveGate:overheadGate(times.disabled,times.passive,{p95Floor:1,p95Fraction:.05}),debugGate:overheadGate(times.disabled,times.debug,{p95Floor:1,p95Fraction:.05}),stats:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,x.diagnostics.stats()]))});
}
for (const count of [1,100,300]) {
  const v = variants();
  const states = {};
  for (const key of Object.keys(v)) {
    const fake = callbackChrome({delayMs:count===1?1:0});
    states[key] = {...v[key],...fake,registrar:createChromeRegistrar({chrome:fake.chrome,sink:v[key].sink})};
  }
  let paired;
  const times = await measureAlternating({samples,variants:states,onSamples:values=>{paired=pairedOverhead(values);},execute:async (state,i)=>{
    const generation = i + 100;
    const outcome = await state.registrar.apply(nativeFixture(count,generation));
    assert.equal(outcome.state,'completed');
  }});
  const noops = {};
  for (const [key,state] of Object.entries(states)) {
    const spec = nativeFixture(count,samples+99);
    const before = state.calls.create + state.calls.removeAll;
    const outcome = await state.registrar.apply(spec);
    noops[key] = {state:outcome.state,code:outcome.code,extraNativeMutations:state.calls.create + state.calls.removeAll - before};
    assert.equal(noops[key].extraNativeMutations,0);
    state.registrar.close();
  }
  const cold = await measureAlternating({samples,warmup:0,variants:v,execute:async ({sink})=>{
    const fake = callbackChrome();
    const registrar = createChromeRegistrar({chrome:fake.chrome,sink});
    assert.equal((await registrar.apply(nativeFixture(count))).state,'completed');
    registrar.close();
  }});
  report.apply.push({rows:count,callbackDelayMs:count===1?1:0,timings:times,pairedDeltaMs:paired,coldNodeInstance:cold,unchangedApply:noops,
    passiveGate:overheadGate(times.disabled,times.passive,{p95Floor:2,p95Fraction:.05}),debugGate:overheadGate(times.disabled,times.debug,{p95Floor:2,p95Fraction:.05}),stats:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,x.diagnostics.stats()]))});
}
const clickSpec = compileMenuSpec(menuFixture({count:300,mode:'simple'}));
const selected = clickSpec.rows.find(r=>r.role==='save');
const clickVariants = variants();
for (const state of Object.values(clickVariants)) {
  const fake = callbackChrome();
  state.registrar = createChromeRegistrar({chrome:fake.chrome,sink:state.sink,getAuthorization:async()=>({authorizedTargets:clickSpec.rows.filter(r=>r.target).map(r=>r.target)}),dispatch:async action=>({state:'acknowledged',actionId:action.actionId})});
  assert.equal((await state.registrar.apply(clickSpec)).state,'completed');
}
let acknowledgements = 0;
let clickPaired;
const clickTimes = await measureAlternating({samples,variants:clickVariants,onSamples:values=>{clickPaired=pairedOverhead(values);},execute:async state=>{
  const outcome = await state.registrar.handleClick({menuItemId:selected.id,mediaType:'image'});
  assert.equal(outcome.state,'acknowledged');acknowledgements++;
}});
for(const state of Object.values(clickVariants))state.registrar.close();
report.click={measurement:'native click handler entry through current-authority check and pure action resolution to injected dispatcher acknowledgement; excludes source fetch/upload',timings:clickTimes,pairedDeltaMs:clickPaired,dispatchAcknowledgements:acknowledgements,
  passiveGate:overheadGate(clickTimes.disabled,clickTimes.passive,{p95Floor:.5,p99Floor:1}),debugGate:overheadGate(clickTimes.disabled,clickTimes.debug,{p95Floor:.5,p99Floor:1})};

global.gc?.();
const beforeHeap = process.memoryUsage().heapUsed;
const rings = Array.from({length:40},()=>createDiagnostics());
for (const ring of rings) for (let i=0;i<1024;i++)ring.emit({stage:'resolver',outcome:'ok',code:'RESOLVED',operationId:i+1,generation:42});
global.gc?.();
const afterHeap = process.memoryUsage().heapUsed;
const ring = rings[0];
report.memory={ring:ring.stats(),retainedHeapDeltaBytes:afterHeap-beforeHeap,replicas:40,averageRetainedHeapDeltaBytes:(afterHeap-beforeHeap)/40,
  averageHeapAndBackingBytes:(afterHeap-beforeHeap)/40+ring.stats().bufferBytes,ordinaryBudgetBytes:128*1024,status:typeof global.gc!=='function'||afterHeap<beforeHeap?'NOT_TESTED':(afterHeap-beforeHeap)/40+ring.stats().bufferBytes<=128*1024?'PASS':'FAIL',limitation:'V8 heap delta includes manifest/maps and excludes typed-array backing store; backing store reported separately. GC-dependent estimate, not browser heap proof.'};
const snapshot = ring.snapshot({expectedStages:['resolver']});
const api = createAgentDebugApi({diagnostics:ring,authorize:()=>({debug:true,export:true,expiresAt:Date.now()+60000})});
const exportTimes=[];let bytes=0,maxPageBytes=0,pageCount=0;
for(let i=0;i<samples;i++){
  const start=performance.now();
  // Exercise the real authorized export path; retain every page, including gaps and manifest.
  const pages=[];let cursor;
  do {
    const page=await api.exportReceipt({limit:64,...(cursor?{cursor}:{})});
    assert.notEqual(page.result.state,'blocked');
    pages.push(JSON.stringify(page));cursor=page.cursor;
  } while(cursor);
  const sizes=pages.map(page=>Buffer.byteLength(page));
  bytes=sizes.reduce((n,size)=>n+size,0);maxPageBytes=Math.max(...sizes);pageCount=pages.length;
  exportTimes.push(performance.now()-start);
}
report.export={evidenceClass:'unit-authorized-agent-api-export',timings:distribution(exportTimes),events:snapshot.events.length,totalPageBytes:bytes,maximumPageBytes:maxPageBytes,pageCount,maximumEventsPerPage:64,perPageBudgetBytes:65536,totalOptionalRetentionBudgetBytes:262144,status:distribution(exportTimes).p95<100&&maxPageBytes<=65536&&bytes<=262144?'PASS':'FAIL',limitation:'In-process user grant fixture; sender restrictions are tested separately. No file dialog, disk persistence or network upload.'};
report.captureIntegrity={status:[...report.compile,...report.apply].every(x=>x.stats.passive.dropped===0&&x.stats.debug.dropped===0)?'PASS':'FAIL',reason:'Dropped/unknown source-owned signals invalidate a full-coverage performance claim even if latency passes.'};
report.overallPerformanceStatus=report.captureIntegrity.status==='PASS'&&[...report.compile,...report.apply,report.click].every(x=>x.passiveGate.status==='PASS'&&x.debugGate.status==='PASS')&&report.memory.status==='PASS'&&report.export.status==='PASS'?'PASS':'FAIL';
console.log(JSON.stringify(report,null,2));
