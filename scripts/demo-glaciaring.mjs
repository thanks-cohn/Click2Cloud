#!/usr/bin/env node
// A local synthetic agent handoff. It performs zero provider/network/history operations.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { compileMenuSpec, inspectMenuTree } from '../src/core/menu-spec.mjs';
import { resolveMenuAction } from '../src/core/action-resolver.mjs';
import { createChromeRegistrar } from '../src/chrome/registrar.mjs';
import { createDiagnostics } from '../src/glaciaring/index.mjs';
import { createAgentDebugApi } from '../src/glaciaring/agent-api.mjs';
import { callbackChrome, menuFixture } from './glaciaring-fixtures.mjs';

async function collect(api, method, input) {
  const pages = [];let cursor;
  do {
    const page = await api[method]({...input,limit:8,...(cursor?{cursor}:{})});
    if(page.result?.state==='blocked')throw new Error('Demo query rejected: '+page.result.code);
    pages.push(page);cursor=page.cursor;
  } while(cursor);
  return pages;
}
export async function runDemo() {
  const diagnostics=createDiagnostics({capacity:64});
  const fixture=menuFixture({count:16,deep:true,partial:true});
  const spec=compileMenuSpec({...fixture,sink:diagnostics.emit,operationId:1});
  const fake=callbackChrome();
  const registrar=createChromeRegistrar({chrome:fake.chrome,sink:diagnostics.emit});
  assert.equal((await registrar.apply(spec)).state,'completed');
  const evidence=registrar.inspect();
  const authorizedTargets=spec.rows.filter(r=>r.target).map(r=>r.target);
  const api=createAgentDebugApi({diagnostics,getMenu:g=>g===spec.generation?spec:null,getEvidence:()=>evidence,resolveAction:resolveMenuAction,
    // A real extension supplies sender/session/grant checks; this fixture supplies explicit local diagnostic authority.
    authorize:()=>({debug:true,export:true,expiresAt:Date.now()+60000})});
  const menuPages=await collect(api,'inspectMenu',{generation:spec.generation});
  const aliasedRows=menuPages.flatMap(p=>p.result.rows);
  const choice=aliasedRows.find(r=>r.role==='save' && r.enabled);
  const simulation=await api.simulateMenuAction({generation:spec.generation,itemId:choice.id,fixtureContext:{context:'image',acknowledgedGeneration:spec.generation,authorizedTargets}});
  assert.equal(simulation.result.state,'completed');
  assert.deepEqual(simulation.result.effects,{capture:0,providerWrites:0,historyWrites:0,successEffects:0});
  let cursor=null;const logicalRows=[];
  do {const page=inspectMenuTree(spec,{cursor,limit:7});logicalRows.push(...page.items);cursor=page.nextCursor;}while(cursor);
  assert.equal(logicalRows.length,spec.rows.length);
  const children=new Map();
  for(const row of logicalRows){const peers=children.get(row.parentId)??[];peers.push(row);children.set(row.parentId,peers);}
  const logicalTree=[],pending=(children.get(null)??[]).map(row=>({row,depth:0})).reverse();
  while(pending.length){const {row,depth}=pending.pop();logicalTree.push('  '.repeat(depth)+(row.role==='separator'?'---':row.label+' ['+row.role+']')+' '+row.id);
    for(const child of [...children.get(row.id)??[]].sort((a,b)=>b.siblingIndex-a.siblingIndex))pending.push({row:child,depth:depth+1});}

  diagnostics.declareOperation(700,['auth.check','worker.capability','transfer.upload','transfer.verify','completion.history']);
  const auth=diagnostics.emit({stage:'auth.check',outcome:'ok',code:'OK',operationId:700,generation:spec.generation});
  const badWorker=diagnostics.emit({stage:'worker.capability',outcome:'failed',code:'CAPABILITY_MISMATCH',operationId:700,generation:spec.generation,requires:[auth]});
  const upload=diagnostics.emit({stage:'transfer.upload',outcome:'blocked',code:'UPLOAD_FAILED',operationId:700,generation:spec.generation,requires:[badWorker]});
  diagnostics.emit({stage:'completion.history',outcome:'skipped',code:'HISTORY_SKIPPED',operationId:700,generation:spec.generation,requires:[upload]});
  // No verify checkpoint is emitted: its absence must stay visible despite an earlier candidate.
  diagnostics.declareOperation(701,['worker.capability','transfer.upload','transfer.verify']);
  const provider=diagnostics.emit({stage:'worker.capability',outcome:'ok',code:'OK',operationId:701,generation:spec.generation});
  const falseReceipt=diagnostics.emit({stage:'transfer.verify',outcome:'failed',code:'RECEIPT_MISMATCH',operationId:701,generation:spec.generation,requires:[provider]});
  assert.equal(diagnostics.stats().dropped,0,'Every source-owned demo signal must be retained or explicitly evicted, never silently invalid.');
  const receiptPages=await collect(api,'exportReceipt',{});
  const receiptRows=receiptPages.flatMap(p=>p.result.rows);
  const faults=receiptRows.filter(r=>r.kind==='candidate');
  assert.ok(faults.some(r=>r.signal===badWorker));
  assert.ok(faults.some(r=>r.signal===falseReceipt));
  assert.ok(faults.some(r=>r.signal===upload&&r.classification==='dependent-symptom'));
  const cascade=await collect(api,'inspectOperation',{operationId:700,view:'graph'});
  assert.ok(cascade[0].gaps.some(g=>g.code==='CHECKPOINT_MISSING'&&g.stage==='transfer.verify'));
  registrar.close();
  return {schemaVersion:1,fixtureId:'glaciaring-public-synthetic-demo-v1',evidenceClass:'unit-and-injected-chrome-contract',
    limitations:['Callback ACKs are injected integration evidence, not installed Chrome observation.','No authenticated provider was called.','Synthetic fixture authority is not a grant to execute saves.','Coverage gaps and partial inventory prevent a complete engine acceptance claim.'],
    fullReadableSyntheticMenu:logicalTree,agentMenuPages:menuPages,simulation,
    faultScenario:{firstOperation:700,independentOperation:701,originSignal:badWorker,downstreamSignal:upload,independentSignal:falseReceipt,intentionallyAbsentCheckpoint:'transfer.verify@700'},
    operationPages:cascade,fullAvailableReceiptPages:receiptPages,
    counts:{menuRows:spec.rows.length,omissions:spec.omissions.length,agentRows:aliasedRows.length,receiptRows:receiptRows.length,providerRequests:0,providerWrites:0,historyWrites:0,successEffects:0},
    nextSafeAction:'Inspect the source/tests attached to both observed fault candidates; verify missing checkpoints with focused tests. Do not retry any uncertain write automatically.'};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])console.log(JSON.stringify(await runDemo(),null,2));
