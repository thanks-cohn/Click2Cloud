import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import test from 'node:test';
import {verifyRightClickFixture} from './fixtures/right-click-lab.mjs';

async function observeFailedWarmProbe(warmProbeFault){
 const evidence=resolve('lab-local','verification');
 await mkdir(evidence,{recursive:true});
 const directory=await mkdtemp(join(evidence,'right-click-warm-negative-'));
 const manifest=join(directory,'scenario-plan.json');
 await writeFile(manifest,JSON.stringify({schema:'redown.right-click-scenarios/1',cases:[{
  case:83,mode:'depth',scenario:'endpoint-missing',prefix:'qa/folder/',filename:'depth-083.txt',
  payload:'warm initialization regression\n',capabilityFaults:['post-deploy','post-probe'],warmProbeFault
 }]}));
 assert.equal(await verifyRightClickFixture(manifest,{
  buildInfo:{},accountId:'0'.repeat(32),bucketName:'native-fixture',
  cli:()=>assert.fail('warm initialization failure must prevent the scenario')
 }),false);
 const [observed]=JSON.parse(await readFile(join(directory,'observations.json'),'utf8')).cases;
 assert.equal(observed.status,'FAIL');
 assert.equal(observed.code,'ERR_ASSERTION');
 assert.equal(observed.phase,'fixture-initialization');
 assert.equal(observed.warmInitialization.boundary,'readiness-probe');
 assert.deepEqual(observed.warmInitialization.capability,{state:'PREPARED',code:null});
 return observed;
}

test('a warm probe HTTP failure preserves its outcome even with no transport exception',async()=>{
 const {warmInitialization:warm,fixtureTransport}=await observeFailedWarmProbe('service-unavailable');
 assert.deepEqual(warm.requests.map(({route,httpStatus})=>[route,httpStatus]),[
  ['/capabilities',200],['/probe',503]
 ]);
 assert.equal(warm.requests[1].injected,true);
 assert.equal(warm.probe.state,'blocked');
 assert.equal(warm.probe.code,'SERVICE_UNAVAILABLE');
 assert.equal(warm.probeStatus,null);
 assert.deepEqual(fixtureTransport,[]);
});

test('a lost warm probe response fails before recovery even if read-only inspection finds the bytes',async()=>{
 const {warmInitialization:warm,fixtureTransport}=await observeFailedWarmProbe('response-lost');
 assert.deepEqual(warm.requests.map(({route,httpStatus})=>[route,httpStatus]),[
  ['/capabilities',200],['/probe',200],['/probe-status',200]
 ]);
 assert.equal(warm.probe.state,'uncertain');
 assert.equal(warm.probe.code,'READINESS_RECONCILE_REQUIRED');
 assert.equal(warm.probe.operationId,warm.operationId);
 assert.equal(warm.probeStatus.state,'verified');
 assert.equal(warm.probeStatus.receipt.operationId,warm.operationId);
 assert.equal(warm.probeStatus.receipt.key,`qa/folder/.click2cloud-readiness/${warm.operationId}/readiness.txt`);
 assert.equal(warm.probeStatus.receipt.destination.matchesScope,true);
 assert.deepEqual(fixtureTransport.map(({phase,causeCode,injected})=>[phase,causeCode,injected]),[
  ['warm-initialization','ECONNRESET',true]
 ]);
});
