export function installDetailsColumns(table){
 const headers=[...table.tHead.rows[0].cells];
 const pane=table.parentElement;
 let widths,drag;
 function apply(){
  for(let index=0;index<headers.length;index++)headers[index].style.setProperty('--details-width',widths[index]+'px');
  table.style.setProperty('--details-min',widths.reduce((total,width)=>total+width,0)+'px');
 }
 function resize(index,width){
  widths??=headers.map(header=>Math.round(header.getBoundingClientRect().width));
  widths[index]=Math.max(52,Math.min(1600,width));
  apply();
 }
 headers.forEach((header,index)=>{
  const grip=document.createElement('span');
  grip.className='details-column-grip';
  grip.setAttribute('role','separator');grip.setAttribute('aria-orientation','vertical');
  grip.setAttribute('aria-label','Resize '+header.textContent);grip.tabIndex=0;
  header.append(grip);
  grip.addEventListener('pointerdown',event=>{
   if(event.button!==0||!pane.classList.contains('details'))return;
   event.preventDefault();event.stopPropagation();
   drag={id:event.pointerId,x:event.clientX,width:header.getBoundingClientRect().width};
   grip.setPointerCapture(event.pointerId);
  });
  grip.addEventListener('pointermove',event=>{if(event.pointerId===drag?.id)resize(index,Math.round(drag.width+event.clientX-drag.x));});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])grip.addEventListener(name,event=>{if(event.pointerId===drag?.id)drag=undefined;});
  grip.addEventListener('keydown',event=>{
   if(!pane.classList.contains('details')||!['ArrowLeft','ArrowRight'].includes(event.key))return;
   event.preventDefault();event.stopPropagation();
   resize(index,Math.round(header.getBoundingClientRect().width)+(event.key==='ArrowRight'?12:-12));
  });
 });
}
