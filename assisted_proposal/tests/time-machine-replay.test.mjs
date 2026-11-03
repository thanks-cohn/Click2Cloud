import test from 'node:test';
import assert from 'node:assert/strict';
import {replayAt,HistoryIntegrityError} from '../src/time-machine-replay.mjs';

const ns='cloudflare-r2/connection-1/account-a/redown-bucket-2';
const baseline={namespace:ns,sequence:0,records:{}};
const first={namespace:ns,seq:1,eventId:'ev-create',entityId:'f1',kind:'created',observedAt:'2026-11-03T18:01:00Z',effectiveAt:null,before:null,after:{fileId:'f1',placement:'photos/original.webp',firstSeenAt:'2026-11-03T18:01:00Z',actualCreatedAt:null}};
const moved={namespace:ns,seq:2,eventId:'ev-move',entityId:'f1',kind:'moved',observedAt:'2026-11-03T18:02:00Z',effectiveAt:'2026-11-03T18:02:00Z',before:first.after,after:{...first.after,placement:'archive/original.webp'}};
const removed={namespace:ns,seq:3,eventId:'ev-delete',entityId:'f1',kind:'deleted',observedAt:'2026-11-03T18:03:00Z',effectiveAt:null,before:moved.after,after:null};

test('as-of generation reconstructs exact before and after location, with same file identity',()=>{
  assert.equal(replayAt({snapshot:baseline,events:[first,moved,removed],throughSequence:1}).records.f1.placement,'photos/original.webp');
  assert.equal(replayAt({snapshot:baseline,events:[first,moved,removed],throughSequence:2}).records.f1.placement,'archive/original.webp');
  assert.deepEqual(replayAt({snapshot:baseline,events:[first,moved,removed],throughSequence:3}).records,{});
});
test('observation is not an invented creation timestamp',()=>{
  const atOne=replayAt({snapshot:baseline,events:[first],throughSequence:1});
  assert.equal(atOne.records.f1.actualCreatedAt,null);
  assert.ok(atOne.records.f1.firstSeenAt);
});
test('identical idempotent replay is allowed once, conflicting retry is not',()=>{
  assert.equal(replayAt({snapshot:baseline,events:[first,first],throughSequence:1}).sequence,1);
  assert.throws(()=>replayAt({snapshot:baseline,events:[first,{...first,after:{tampered:true}}],throughSequence:1}),HistoryIntegrityError);
});
test('missing history is a declared gap rather than silently inferred absence',()=>{
  assert.throws(()=>replayAt({snapshot:baseline,events:[moved],throughSequence:2}),/Noncontiguous/);
  const newer={namespace:ns,sequence:2,records:{f1:moved.after}};
  assert.throws(()=>replayAt({snapshot:newer,events:[removed],throughSequence:1}),/predates snapshot/);
});
test('authorization boundaries remain distinct per namespace',()=>{
  assert.throws(()=>replayAt({snapshot:baseline,events:[{...first,namespace:'cloudflare-r2/other'}],throughSequence:1}),/Cross-namespace/);
});
test('replay preconditions stop contradictory deletions',()=>{
  assert.throws(()=>replayAt({snapshot:baseline,events:[{...first,before:{incorrect:true}}],throughSequence:1}),/precondition mismatch/);
});
test('retained earlier segment supports time travel after new snapshot',()=>{
  const laterSnapshot={namespace:ns,sequence:2,records:{f1:moved.after}};
  assert.deepEqual(replayAt({snapshot:laterSnapshot,events:[removed],throughSequence:3}).records,{});
  assert.equal(replayAt({snapshot:baseline,events:[first,moved,removed],throughSequence:1}).records.f1.placement,'photos/original.webp');
});
