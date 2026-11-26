import assert from 'node:assert/strict';
import {normalizeHyperspace,hyperspaceTiming,hyperspaceFrame,hyperspaceGeometry,IDLE_MS,SPLIT_MS} from '../extension/hyperspace.mjs';

assert.deepEqual(normalizeHyperspace(),{enabled:true,seconds:5});
assert.deepEqual(normalizeHyperspace({enabled:false,seconds:200}),{enabled:false,seconds:20});
assert.equal(normalizeHyperspace({seconds:'bad'}).seconds,5);
assert.equal(IDLE_MS,5000);
assert.equal(SPLIT_MS,180);
assert(hyperspaceFrame(45,5).split>.5,'Initial separation opens rapidly');
assert.equal(hyperspaceFrame(180,5).split,1,'Corridor is fully open in 180ms');
assert(hyperspaceFrame(SPLIT_MS,5).speed<.02,'Shimmer begins near rest');
assert(hyperspaceFrame(SPLIT_MS+1000,5).travel<5,'First second covers less than 5% of one rail');
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
  assert(sample.speed>speed);assert(sample.travel>travel);assert.equal(sample.lift,0);
  speed=sample.speed;travel=sample.travel;
 }
 const release=hyperspaceFrame(end+timing.release,seconds);
 const settled=hyperspaceFrame(end+timing.release+timing.settle,seconds);
 assert.equal(release.burst,1);assert(release.lift>1);
 assert.equal(settled.lift,1);assert.equal(settled.words,0);assert.equal(settled.done,true);
 if(previous){assert(timing.release<previous.timing.release);assert(release.lift>previous.lift);assert(speed>previous.speed);}
 previous={timing,lift:release.lift,speed};
}
console.log('Hyperspace timing, continuous acceleration, geometry and energy assertions passed.');
