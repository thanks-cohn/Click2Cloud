import { CRITICAL_BOUNDARIES, OUTCOMES, REASON_CODES } from './catalog.mjs';
export { CRITICAL_BOUNDARIES, OUTCOMES, REASON_CODES } from './catalog.mjs';

/** Optional observation can never change a protected business result. */
export function emitDiagnostic(sink, event) {
  try { return (typeof sink === 'function' ? sink(event) : sink?.emit?.(event)) || 0; } catch { return 0; }
}
const freeze = value => {
  if (value && typeof value==='object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
const integer = (value, fallback=0) => Number.isSafeInteger(value) && value>=0 && value<=0xffffffff ? value : fallback;
const terminalFault = new Set(['failed','uncertain','blocked','partial','stale','interrupted','unknown']);
const validStage = s => typeof s==='string' && /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(s);
const validCode = s => typeof s==='string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(s);
const validPath = s => typeof s==='string' && /^(src|tests)\/[A-Za-z0-9_.\/-]{1,180}$/.test(s) && !s.includes('..');

/** 63 bytes per preallocated event slot. No raw request/error strings are retained. */
export function createDiagnostics({capacity=512,epoch=1,build='local-build',manifest=CRITICAL_BOUNDARIES,enabled=true,clock=()=>performance.now(),retentionMs=900000}={}) {
  if (!Number.isInteger(capacity)||capacity<1||capacity>16384) throw TypeError('Invalid diagnostic capacity');
  let currentEpoch=integer(epoch,1), sequence=0, size=0, evicted=0, dropped=0, expired=0, restarts=0, dependencyDrops=0, declarationDrops=0, metadataDrops=0;
  const columns={seq:new Uint32Array(capacity),time:new Float64Array(capacity),operation:new Uint32Array(capacity),generation:new Uint32Array(capacity),revision:new Uint32Array(capacity),epoch:new Uint32Array(capacity),stage:new Uint16Array(capacity),outcome:new Uint8Array(capacity),code:new Uint16Array(capacity),attempt:new Uint16Array(capacity),parent:new Uint32Array(capacity),retry:new Uint32Array(capacity),count:new Uint32Array(capacity),deps:new Uint32Array(capacity*4)};
  const stages=[], stageIndex=new Map(), codeList=[...REASON_CODES], codeIndex=new Map(codeList.map((x,i)=>[x,i])), outcomeIndex=new Map(OUTCOMES.map((x,i)=>[x,i]));
  const declarations=new Map();
  function registerBoundary(row) {
    if (stages.length>=256 || !row || !validStage(row.stage)||!validPath(row.source)||!Array.isArray(row.tests)||!row.tests.every(validPath)) throw TypeError('Invalid boundary manifest');
    if(stageIndex.has(row.stage)) return stageIndex.get(row.stage);
    const codes=row.codes||REASON_CODES;
    if(!codes.every(validCode))throw TypeError('Invalid reason vocabulary');
    for(const code of codes)if(!codeIndex.has(code)){if(codeList.length>=65535)throw TypeError('Reason capacity exceeded');codeIndex.set(code,codeList.length);codeList.push(code);}
    const safe=freeze({stage:row.stage,source:row.source,owner:row.source,tests:[...row.tests],codes:Object.isFrozen(codes)?codes:freeze([...codes]),coverage:['covered','partial','unobservable'].includes(row.coverage)?row.coverage:'partial',boundaryLimit:row.coverage==='unobservable'?'External boundary unobservable.':'Gateway signal does not certify hidden internals.',reproduction:'Run source-owned tests with missing, rejected, stale and uncertain outcomes.'});
    stageIndex.set(row.stage,stages.length);stages.push(safe);return stages.length-1;
  }
  manifest.forEach(registerBoundary);
  function emit(event) {
    if(!enabled)return 0;
    try {
      if(!event||!stageIndex.has(event.stage)||!outcomeIndex.has(event.outcome)||!Number.isSafeInteger(event.operationId)||event.operationId<1||event.operationId>0xffffffff){dropped++;return 0;}
      const unknownCode=!codeIndex.has(event.code||'UNKNOWN');
      if(unknownCode)dropped++;
      for(const field of ['generation','revision','epoch','parentOperation','retryOf','count'])if(event[field]!==undefined&&integer(event[field],-1)===-1)metadataDrops++;
      if(event.attempt!==undefined&&(integer(event.attempt,-1)===-1||event.attempt>65535))metadataDrops++;
      const id=++sequence;
      if(id>0xffffffff){dropped++;return 0;}
      const slot=(id-1)%capacity;
      if(size===capacity)evicted++;else size++;
      columns.seq[slot]=id;columns.time[slot]=clock();columns.operation[slot]=event.operationId;
      columns.generation[slot]=integer(event.generation);columns.revision[slot]=integer(event.revision);columns.epoch[slot]=integer(event.epoch,currentEpoch);
      columns.stage[slot]=stageIndex.get(event.stage);columns.outcome[slot]=outcomeIndex.get(event.outcome);columns.code[slot]=codeIndex.get(unknownCode?'UNKNOWN_REASON':event.code||'UNKNOWN');
      columns.attempt[slot]=Math.min(integer(event.attempt,1),65535);columns.parent[slot]=integer(event.parentOperation);columns.retry[slot]=integer(event.retryOf);columns.count[slot]=integer(event.count);
      const deps=Array.isArray(event.requires)?event.requires:[];
      for(let i=0;i<4;i++)columns.deps[slot*4+i]=integer(deps[i]);
      if(deps.length>4)dependencyDrops+=deps.length-4;
      return id;
    } catch {dropped++;return 0;}
  }
  function declareOperation(operationId,expectedStages) {
    if(!Number.isSafeInteger(operationId)||operationId<1||!Array.isArray(expectedStages)||expectedStages.some(s=>!stageIndex.has(s)))throw TypeError('Invalid operation declaration');
    if(declarations.size>=64&&!declarations.has(operationId)){declarations.delete(declarations.keys().next().value);declarationDrops++;}
    declarations.set(operationId,Object.freeze([...new Set(expectedStages)]));
  }
  function stats() {return freeze({enabled,capacity,occupancy:size,sequence,evicted,dropped,expired,restarts,dependencyDrops,declarationDrops,metadataDrops,epoch:currentEpoch,slotBytes:Object.values(columns).reduce((n,c)=>n+c.byteLength,0)/capacity,bufferBytes:Object.values(columns).reduce((n,c)=>n+c.byteLength,0),retentionMs});}
  function snapshot({operationId,expectedStages,generation}={}) {
    const events=[], now=clock();let staleCount=0;
    for(let id=Math.max(1,sequence-size+1);id<=sequence;id++){
      const i=(id-1)%capacity;
      if(columns.seq[i]!==id)continue;
      if(now-columns.time[i]>retentionMs){staleCount++;continue;}
      if(operationId!==undefined&&columns.operation[i]!==operationId)continue;
      const requires=[];for(let j=0;j<4;j++)if(columns.deps[i*4+j])requires.push(columns.deps[i*4+j]);
      events.push({id,stage:stages[columns.stage[i]].stage,outcome:OUTCOMES[columns.outcome[i]],code:codeList[columns.code[i]],operationId:columns.operation[i],generation:columns.generation[i],revision:columns.revision[i],epoch:columns.epoch[i],attempt:columns.attempt[i],parentOperation:columns.parent[i]||null,retryOf:columns.retry[i]||null,count:columns.count[i],time:columns.time[i],requires});
    }
    expired=staleCount;
    const expected=expectedStages||declarations.get(operationId)||stages.map(x=>x.stage);
    if(!Array.isArray(expected)||expected.some(s=>!stageIndex.has(s)))throw TypeError('Invalid expected boundary');
    const gaps=[];
    for(const stage of expected){
      const observed=events.filter(x=>x.stage===stage);
      if(!observed.length)gaps.push({code:'CHECKPOINT_MISSING',stage});
      else if(!observed.some(x=>x.outcome!=='started'))gaps.push({code:'TERMINAL_MISSING',stage});
      if(stages[stageIndex.get(stage)].coverage==='unobservable')gaps.push({code:'UNOBSERVABLE_BOUNDARY',stage});
    }
    if(operationId===undefined){
      for(const [declaredOperation,requiredStages]of declarations){
        for(const stage of requiredStages){
          const observed=events.filter(e=>e.operationId===declaredOperation&&e.stage===stage);
          if(!observed.length)gaps.push({code:'CHECKPOINT_MISSING',stage,operationId:declaredOperation});
          else if(!observed.some(e=>e.outcome!=='started'))gaps.push({code:'TERMINAL_MISSING',stage,operationId:declaredOperation});
        }
      }
    }
    // A green aggregate or one green child cannot stand in for all native rows.
    for(const plan of events.filter(e=>e.stage==='chrome.plan'&&e.code==='PLAN_GENERATED'&&e.count>0)){
      const indexes=new Set(events.filter(e=>e.stage==='chrome.ack'&&e.operationId===plan.operationId&&e.generation===plan.generation&&e.count>0&&e.count<=plan.count).map(e=>e.count));
      if(indexes.size!==plan.count)gaps.push({code:'NATIVE_ITEM_OBSERVATION_MISSING',stage:'chrome.ack',operationId:plan.operationId,generation:plan.generation,expectedCount:plan.count,observedCount:indexes.size});
    }
    const ids=new Set(events.map(e=>e.id));
    for(const e of events){for(const dependency of e.requires)if(!ids.has(dependency))gaps.push({code:'DEPENDENCY_MISSING',signal:e.id,dependency});
      if(e.outcome==='skipped'&&e.code.endsWith('_EXTERNAL'))gaps.push({code:'EXTERNAL_BOUNDARY_UNOBSERVED',signal:e.id,stage:e.stage});
      for(const dependency of e.requires)if(dependency>=e.id)gaps.push({code:'DEPENDENCY_OUT_OF_ORDER',signal:e.id,dependency});
      if(e.code==='UNKNOWN_REASON')gaps.push({code:'UNKNOWN_REASON',signal:e.id,stage:e.stage});
      if(e.epoch!==currentEpoch)gaps.push({code:'STALE_EPOCH',signal:e.id,stage:e.stage});
      if(generation!==undefined&&e.generation!==generation)gaps.push({code:'STALE_GENERATION',signal:e.id,stage:e.stage});
    }
    for(const [code,count]of [['OBSERVATION_EVICTED',evicted],['OBSERVATION_DROPPED',dropped],['OBSERVATION_EXPIRED',staleCount],['OBSERVATION_GAP',restarts],['DEPENDENCY_DROPPED',dependencyDrops],['DECLARATION_EVICTED',declarationDrops],['OBSERVATION_METADATA_DROPPED',metadataDrops]])if(count)gaps.push({code,count});
    const byId=new Map(events.map(e=>[e.id,e]));
    const candidates=events.filter(e=>terminalFault.has(e.outcome)).map(e=>{
      const failedPrerequisites=e.requires.filter(id=>terminalFault.has(byId.get(id)?.outcome));
      const boundary=stages[stageIndex.get(e.stage)];
      return {signal:e.id,stage:e.stage,outcome:e.outcome,code:e.code,operationId:e.operationId,generation:e.generation,epoch:e.epoch,classification:failedPrerequisites.length?'dependent-symptom':'observed-fault-candidate',confidence:'observed boundary only; causality requires explicit edges',requires:e.requires,failedPrerequisites,source:boundary.source,tests:boundary.tests,reproduction:boundary.reproduction};
    });
    return freeze({schemaVersion:'1.0',build:/^[a-f0-9]{7,40}$/.test(build)?build:'local-build',scope:{operationId:operationId??null,generation:generation??null,epoch:currentEpoch},events,candidates,edges:events.flatMap(e=>e.requires.map(from=>({from,to:e.id,kind:'requires',evidence:ids.has(from)?'observed':'missing'}))),gaps,completeness:gaps.length?'partial':'complete',status:candidates.length?'FAIL':gaps.length?'COVERAGE_GAP':'OBSERVED_OK',stats:stats()});
  }
  function restart(nextEpoch=currentEpoch+1){currentEpoch=integer(nextEpoch,currentEpoch+1);restarts++;size=0;declarations.clear();}
  return Object.freeze({emit,declareOperation,registerBoundary,snapshot,stats,restart,manifest:()=>freeze([...stages])});
}
