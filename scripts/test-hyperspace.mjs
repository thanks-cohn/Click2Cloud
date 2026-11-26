import assert from 'node:assert/strict';
import {normalizeHyperspace,hyperspaceTiming,hyperspaceFrame,hyperspaceGeometry,hyperspaceLiftBounds,hyperspaceWaterGeometry,hyperspaceWaterLayout,IDLE_MS,SPLIT_MS,WATER_IDLE_MS} from '../extension/hyperspace.mjs';

assert.deepEqual(normalizeHyperspace(),{enabled:true,seconds:5});
assert.deepEqual(normalizeHyperspace({enabled:false,seconds:200}),{enabled:false,seconds:20});
assert.equal(normalizeHyperspace({seconds:'bad'}).seconds,5);
assert.equal(IDLE_MS,5000);
assert.equal(WATER_IDLE_MS,2000);
assert.deepEqual(hyperspaceWaterGeometry(80,24),[]);
assert.deepEqual(hyperspaceWaterGeometry(380,7),[]);
assert.deepEqual(hyperspaceWaterLayout(66,40,35),{horizon:37,height:59,lift:7});
assert.deepEqual(hyperspaceWaterLayout(56,12,36),{horizon:38,height:60,lift:-4});
for(const width of [320,380,800,1200])for(const height of [8,18,26,40,56]){
 const lines=hyperspaceWaterGeometry(width,height);
 assert.equal(lines.length,14);
 assert.equal(new Set(lines.map(l=>l.shade)).size,3);
 assert(lines.some(l=>l.y1===l.y2)&&lines.some(l=>l.y1!==l.y2));
 assert(new Set(lines.map(l=>Math.round(l.x2-l.x1))).size>=8);
 assert.deepEqual(lines,hyperspaceWaterGeometry(width,height));
 for(const l of lines){assert(l.x1>=0&&l.x2<=width&&l.x2>l.x1);assert(l.y1>=0&&l.y2>=0&&l.y1<height&&l.y2<height);assert(Math.abs(l.y2-l.y1)<=1.2+1e-9);assert(l.opacity>=.56&&l.opacity<=.69);assert(l.duration>=8&&l.delay>=0);}
 const rows=[0,2,5,8,11].map(i=>(lines[i].y1+lines[i].y2)/2);
 assert(rows.every((y,i)=>i===0||y>rows[i-1]),'All five rows are separated');
 assert(rows[4]-rows[3]>rows[1]-rows[0],'Ripple spacing opens toward foreground');
}
assert.equal(SPLIT_MS,1800);
assert(hyperspaceFrame(180,5).split<.01,'Preserve the original gentle split');
assert.equal(hyperspaceFrame(SPLIT_MS,5).split,1);
assert.equal(hyperspaceFrame(SPLIT_MS,5).speed,3,'Shimmer starts at three rail lengths per second');
assert(hyperspaceFrame(SPLIT_MS+1000,5).travel>300,'Shimmer completes over three passes in the first second');
assert.equal(hyperspaceTiming(5).flexMs,90);
assert.equal(hyperspaceTiming(5).exitMs,290);
assert.equal(hyperspaceTiming(5).release,380);
assert.equal(hyperspaceTiming(5).settle,355);
assert.equal(hyperspaceFrame(SPLIT_MS+5000,5).speed,6.5);
const loadedDefault=hyperspaceFrame(SPLIT_MS+5000,5);
assert(loadedDefault.tension>.9&&loadedDefault.wordsDip>12,'Final charge deepens compression and navigation dip');
const windupStart=SPLIT_MS+3500;
const middleSpeed=hyperspaceFrame(windupStart+750,5).tension-hyperspaceFrame(windupStart+650,5).tension;
const lateSpeed=hyperspaceFrame(windupStart+1450,5).tension-hyperspaceFrame(windupStart+1350,5).tension;
assert(lateSpeed>=0&&lateSpeed<middleSpeed*.15,'Creak slows nearly to a standstill before release');
assert.equal(hyperspaceFrame(SPLIT_MS+3500,5).tension,0,'Early shimmer remains unchanged');
const impactDefault=hyperspaceFrame(SPLIT_MS+5000+90,5);
assert.equal(impactDefault.tension,0);assert.equal(impactDefault.wordsDip,0);
assert(impactDefault.flex>.35&&impactDefault.burst<.1,'Rail visibly bows before flying away');
assert(hyperspaceFrame(SPLIT_MS+5000+90+72.5,5).burst>.5,'Exit travels more than half its distance in its first quarter');
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
 const bent=hyperspaceGeometry(w,65,1,0,.4),stronger=hyperspaceGeometry(w,65,1,0,.68);
 const xControl=g=>Number(g.left.split(' ')[4]);
 const compressed=hyperspaceGeometry(w,65,1,0,0,1);
 assert(xControl(compressed)>xControl(corridor),'The left rail curves toward the center under tension');
 assert(xControl(compressed)<=w/2-4,'Compressed controls retain the center corridor');
 assert.equal(xControl(compressed),w/2-4,'Fully loaded rails reach the stronger inward bend');
 assert(compressed.leftFill.startsWith(compressed.left)&&compressed.rightFill.startsWith(compressed.right));
 assert(xControl(stronger)<xControl(bent)&&xControl(bent)<xControl(corridor),'Longer charge bows the interior of the left rail farther outward');
 assert.equal(Number(bent.left.split(' ')[1]),Number(corridor.left.split(' ')[1]),'Flex changes curvature, not just translation');
 assert(bent.leftFill.startsWith(bent.left)&&bent.rightFill.startsWith(bent.right),'Color surfaces retain exact deformed boundaries');
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
 let speed=-1,travel=-1,tension=-1;
 for(let i=0;i<=100;i++){
  const sample=hyperspaceFrame(SPLIT_MS+seconds*1000*i/100,seconds);
  assert(sample.speed>speed);assert(sample.travel>travel);assert.equal(sample.lift,0);assert.equal(sample.wordsUp,0);assert.equal(sample.words,1);assert.equal(sample.flex,0);
  assert(sample.tension>=tension);assert(sample.wordsDip>=0&&sample.wordsDip<=14);
  speed=sample.speed;travel=sample.travel;tension=sample.tension;
 }
 const impact=hyperspaceFrame(end+timing.flexMs,seconds);
 assert(impact.flex>0&&impact.burst<=.081);
 const impulse=hyperspaceFrame(end+timing.flexMs+timing.exitMs*.25,seconds);
 assert(impulse.wordsUp>.5,'Navigation travels upward explosively');
 assert.equal(impulse.wordsUp,impulse.burst,'Navigation and rails share the release impulse');
 assert(impulse.words>.5,'Navigation moves visibly instead of disappearing first');
 const release=hyperspaceFrame(end+timing.release,seconds);
 const settled=hyperspaceFrame(end+timing.release+timing.settle,seconds);
 assert.equal(release.burst,1);assert(release.lift>1);
 assert.equal(settled.lift,1);assert.equal(settled.words,0);assert.equal(settled.wordsUp,1);assert.equal(settled.flex,0);assert.equal(settled.tension,0);assert.equal(settled.wordsDip,0);assert.equal(settled.done,true);
 if(previous){assert(timing.release<previous.timing.release);assert(release.lift>previous.lift);assert(speed>previous.speed);assert(impact.flex>previous.flex);assert(timing.exitMs<previous.timing.exitMs);assert(tension>=previous.tension);}
 previous={timing,lift:release.lift,speed,flex:impact.flex,tension};
}
console.log('Hyperspace timing, continuous acceleration, geometry and energy assertions passed.');
