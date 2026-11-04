import test from 'node:test';
import assert from 'node:assert/strict';
import { distribution, overheadGate, measureAlternating, pairedOverhead } from '../scripts/performance-utils.mjs';

test('reported p95/p99 use all samples, including tail latency', () => {
  const samples = Array.from({length: 100}, (_, index) => index + 1);
  assert.deepEqual(distribution(samples), {samples:100,min:1,p50:50,p95:95,p99:99,max:100});
  assert.equal(samples[0], 1);
  assert.throws(() => distribution([1, NaN]));
});

test('benchmark gates fail on tail regression even with a fast median', () => {
  const base = {p95: 1, p99: 1};
  assert.equal(overheadGate(base, {p95: 1.51, p99: 1.8}, {p95Floor:.5,p99Floor:1}).status, 'FAIL');
  assert.equal(overheadGate(base, {p95: 1.2, p99: 2.1}, {p95Floor:.5,p99Floor:1}).status, 'FAIL');
  assert.equal(overheadGate(base, {p95: 1.5, p99: 2}, {p95Floor:.5,p99Floor:1}).status, 'PASS');
});

test('alternating benchmark exercises every variant equally and excludes warmup', async () => {
  const order = [];
  const result = await measureAlternating({samples: 6,warmup:2,variants:{disabled:0,passive:1,debug:2},execute:(_, iteration,key)=>{order.push([iteration,key]);}});
  assert.equal(result.disabled.samples, 6);
  assert.equal(result.passive.samples, 6);
  assert.equal(result.debug.samples, 6);
  assert.deepEqual(order.slice(6, 9).map(x=>x[1]), ['disabled','passive','debug']);
  assert.deepEqual(order.slice(9, 12).map(x=>x[1]), ['passive','debug','disabled']);
  const measured=order.filter(([iteration])=>iteration>=0).map(([,key])=>key);
  for(let position=0;position<3;position++) {
    const keys=measured.filter((_,index)=>index%3===position);
    assert.equal(keys.filter(x=>x==='disabled').length,2);
    assert.equal(keys.filter(x=>x==='passive').length,2);
    assert.equal(keys.filter(x=>x==='debug').length,2);
  }
});

test('paired overhead retains negative improvements and actual matched outliers',()=>{
  const matched=pairedOverhead({disabled:[2,20,2,2],passive:[1,21,2,8],debug:[2,20,2,2]});
  assert.deepEqual(matched.passive,{samples:4,p50:0,p95:6,p99:6,min:-1,max:6});
  assert.equal(matched.debug.p99,0);
  assert.throws(()=>pairedOverhead({disabled:[1],passive:[1,2]}));
});
