// One opening per uninterrupted idle period. Navigation never plays immediately.
export function createSkyIdle({eligible,open,close,delay=5000,setTimer=setTimeout,clearTimer=clearTimeout}){
 let timer;
 function cancel(){
  if(timer!==undefined){clearTimer(timer);timer=undefined;}
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
 return {cancel,reset};
}
