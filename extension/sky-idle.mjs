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
