import assert from 'node:assert/strict';
import {normalizeHyperspace,hyperspaceTiming,hyperspaceFrame,hyperspaceGeometry,hyperspaceLiftBounds,IDLE_MS,SPLIT_MS} from '../extension/hyperspace.mjs';

assert.deepEqual(normalizeHyperspace(),{enabled:true,seconds:5});
assert.deepEqual(normalizeHyperspace({enabled:false,seconds:200}),{enabled:false,seconds:20});
assert.equal(normalizeHyperspace({seconds:'bad'}).seconds,5);
assert.equal(IDLE_MS,5000);
assert.equal(SPLIT_MS,1800);
assert(hyperspaceFrame(180,5).split<.01,'Preserve the original gentle split');
assert.equal(hyperspaceFrame(SPLIT_MS,5).split,1);
assert.equal(hyperspaceFrame(SPLIT_MS,5).speed,2,'Shimmer starts at two rail lengths per second');
assert(hyperspaceFrame(SPLIT_MS+1000,5).travel>200,'Shimmer completes over two passes in the first second');
assert.equal(hyperspaceTiming(5).release,440);
assert(hyperspaceFrame(SPLIT_MS+5000+110,5).burst>.5,'The release travels more than half its distance in the first quarter');
assert.deepEqual(hyperspaceLiftBounds(66,28,51,12),{rest:40,peak:48});
const historyBounds=hyperspaceLiftBounds(66,20,51,10);
assert(historyBounds.rest>26,'History can rise higher when heading clearance allows');
assert(66+20-historyBounds.peak>=51-10+4,'Peak lift respects the persistent controls');
const scrolled=hyperspaceLiftBounds(56,0,46,6);
assert(scrolled.peak<=12,'Scrolled content retains clearance');
const widths=[320,380,800,1200];
for(const w of widths){
 const flat=hyperspaceGeometry(w,65,0,0);
 assert.equal(flat.gap,0);
 assert(flat.leftFill.startsWith(flat.left));assert(flat.rightFill.startsWith(flat.right));
 const corridor=hyperspaceGeometry(w,65,1,0);
 assert.equal(corridor.gap,80);
 assert(corridor.leftFill.startsWith(corridor.left));assert(corridor.rightFill.startsWith(corridor.right));
 assert(corridor.left.startsWith('M '+(w/2-40)+' 0 C '));
 assert(corridor.right.startsWith('M '+(w/2+40)+' 0 C '));
 const released=hyperspaceGeometry(w,65,1,1);
 assert(Number(released.left.split(' ')[1])<0);
 assert(Number(released.right.split(' ')[1])>w);
}
let previous;
for(const seconds of [1,3,5,10,20]){
 const timing=hyperspaceTiming(seconds),end=SPLIT_MS+seconds*1000;
 assert.equal(hyperspaceFrame(SPLIT_MS-1,seconds).phase,'split');
 assert.equal(hyperspaceFrame(end-1,seconds).phase,'charge');
 assert.equal(hyperspaceFrame(end,seconds).phase,'release');
 let speed=-1,travel=-1;
 for(let i=0;i<=100;i++){
  const sample=hyperspaceFrame(SPLIT_MS+seconds*1000*i/100,seconds);
  assert(sample.speed>speed);assert(sample.travel>travel);assert.equal(sample.lift,0);assert.equal(sample.wordsUp,0);assert.equal(sample.words,1);
  speed=sample.speed;travel=sample.travel;
 }
 const impulse=hyperspaceFrame(end+timing.release*.25,seconds);
 assert(impulse.wordsUp>.5,'Navigation travels upward explosively');
 assert.equal(impulse.wordsUp,impulse.burst,'Navigation and rails share the release impulse');
 assert(impulse.words>.5,'Navigation moves visibly instead of disappearing first');
 const release=hyperspaceFrame(end+timing.release,seconds);
 const settled=hyperspaceFrame(end+timing.release+timing.settle,seconds);
 assert.equal(release.burst,1);assert(release.lift>1);
 assert.equal(settled.lift,1);assert.equal(settled.words,0);assert.equal(settled.wordsUp,1);assert.equal(settled.done,true);
 if(previous){assert(timing.release<previous.timing.release);assert(release.lift>previous.lift);assert(speed>previous.speed);}
 previous={timing,lift:release.lift,speed};
}
console.log('Hyperspace timing, continuous acceleration, geometry and energy assertions passed.');
