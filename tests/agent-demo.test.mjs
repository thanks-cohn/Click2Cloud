import test from 'node:test';
import assert from 'node:assert/strict';
import { runDemo } from '../scripts/demo-glaciaring.mjs';

test('agent handoff includes full paged menu, both faults, cascade and explicit absent checkpoint with zero writes', async()=>{
  const demo=await runDemo();
  assert.equal(demo.counts.providerWrites,0);
  assert.equal(demo.counts.historyWrites,0);
  assert.equal(demo.fullReadableSyntheticMenu.length,demo.counts.menuRows);
  assert.ok(demo.agentMenuPages.length>1);
  assert.ok(demo.fullAvailableReceiptPages.length>1);
  const faults=demo.fullAvailableReceiptPages.flatMap(p=>p.result.rows).filter(r=>r.kind==='candidate');
  assert.ok(faults.some(r=>r.stage==='worker.capability'&&r.operationId===700));
  assert.ok(faults.some(r=>r.stage==='transfer.verify'&&r.operationId===701));
  assert.ok(demo.operationPages.some(p=>p.gaps.some(g=>g.stage==='transfer.verify'&&g.code==='CHECKPOINT_MISSING')));
  assert.equal(demo.simulation.result.state,'completed');
});
