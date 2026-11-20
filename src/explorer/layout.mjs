// Pure local gesture geometry. Durable choices use commitConfigChange/setExplorerLayout.
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const splitAt=(x,left,width)=>width>0?clamp((x-left)/width*100,0,100):50;
export function separatorKey(value,key,{min=0,max=100,step=2,vertical=true}={}){return key==='Home'?min:key==='End'?max:key===(vertical?'ArrowLeft':'ArrowUp')?clamp(value-step,min,max):key===(vertical?'ArrowRight':'ArrowDown')?clamp(value+step,min,max):null;}
export const dividerCycleKey='explorerDividerCycleV1';
export const dividerModes=Object.freeze({alternate:'Alternate left/right',left:'Left only',right:'Right only'});
export const normalizeDividerMode=mode=>Object.hasOwn(dividerModes,mode)?mode:'alternate';

export function cycleDivider(position,mode,nextExtreme=0){
 if(position!==50)return {position:50,nextExtreme:position===0?100:0};
 const extreme=mode==='left'?0:mode==='right'?100:nextExtreme;
 return {position:extreme,nextExtreme:extreme};
}
