// One opening per uninterrupted idle period. Navigation never plays immediately.
export function createSkyIdle({eligible,open,close,delay=5000,setTimer=setTimeout,clearTimer=clearTimeout}){
 let timer;
 function stopPending(){
  if(timer!==undefined){clearTimer(timer);timer=undefined;}
 }
 function cancel(){
  stopPending();
  close();
 }
 function reset(){
  cancel();
  if(!eligible())return;
  timer=setTimer(()=>{
   timer=undefined;
   if(eligible())open();
  },delay);
 }
 return {cancel,reset,stopPending};
}

// A real pointer movement, not a DOM-driven pointerleave (e.g. closing More),
// is required to arm another idle period after navigation cancels it.
export function createSkyHover(idle){
 let inside=false;
 return {
  move(overHeader){
   if(overHeader===inside)return;
   inside=overHeader;
   if(inside)idle.cancel();
   else idle.reset();
  }
 };
}

// Reverse the actual opening from its current frame, including mid-flight hover.
// Clamp filled animations to their endpoint so a long idle never adds return delay.
export function reverseSkyAnimations(animations,rate=2){
 const pending=[];
 for(const animation of animations){
  const duration=Number(animation.effect?.getComputedTiming().endTime);
  const time=Math.max(0,Math.min(duration,Number(animation.currentTime)||0));
  if(!Number.isFinite(duration)||!Number.isFinite(time))continue;
  animation.pause();
  animation.currentTime=time;
  if(time===0)continue;
  animation.playbackRate=-rate;
  animation.play();
  pending.push(animation.finished);
 }
 return Promise.allSettled(pending);
}
