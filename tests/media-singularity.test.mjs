import test from 'node:test';
import assert from 'node:assert/strict';
import {fragmentPattern,singularityFrame,SINGULARITY_MS} from '../extension/media-singularity.mjs';
test('Singularity fragments are disjoint, ordered, and irregular',()=>{
 for(let seed=1;seed<=200;seed++){
  let state=seed;const rng=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const pieces=fragmentPattern(7,310,rng);
  const gaps=pieces.slice(1).map((p,i)=>p.start-pieces[i].end);
  assert(pieces.every(p=>p.start>=7&&p.end<=310&&p.end>p.start));
  assert(gaps.every(g=>g>=4-1e-9));
  assert(gaps.slice(1).every((g,i)=>Math.abs(g-gaps[i])>=3-1e-9));
 }
});
test('Singularity approaches, compresses, then accelerates into depth',()=>{
 const left={x:10,w:90},right={x:210,w:80};
 const frames=Array.from({length:101},(_,i)=>singularityFrame(i/100,left,right));
 assert.equal(frames[0].movingX,left.x);assert.equal(frames[0].width,left.w);
 assert.equal(frames[100].movingX,290);assert.equal(frames[100].width,0);
 assert.equal(frames[100].scale,0);assert.equal(frames[100].lineOpacity,0);
 assert(frames.slice(1).every((f,i)=>f.movingX>=frames[i].movingX));
 assert(singularityFrame(.98,left,right).rotation-singularityFrame(.97,left,right).rotation>singularityFrame(.78,left,right).rotation-singularityFrame(.77,left,right).rotation);
 assert.equal(SINGULARITY_MS,3800);
});
