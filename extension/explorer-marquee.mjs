const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

// Iterate only the four strips whose membership changed.
export function visitMarqueeDifference(box,other,visit){
 if(!box)return;
 const {top,bottom,left,right}=box;
 const overlap=other&&{top:Math.max(top,other.top),bottom:Math.min(bottom,other.bottom),
  left:Math.max(left,other.left),right:Math.min(right,other.right)};
 if(!overlap||overlap.top>=overlap.bottom||overlap.left>=overlap.right){visit(box);return;}
 if(top<overlap.top)visit({...box,bottom:overlap.top});
 if(overlap.bottom<bottom)visit({...box,top:overlap.bottom});
 if(left<overlap.left)visit({...overlap,left,right:overlap.left});
 if(overlap.right<right)visit({...overlap,left:overlap.right,right});
}

export function installExplorerMarquee(pane,{readRows,readLayout,readSelection,setSelection,onChange,onCommit,available}){
 const overlay=document.createElement('div');
 overlay.className='explorer-marquee';
 overlay.setAttribute('aria-hidden','true');
 let drag,frame,suppressClick=false;
 const queue=()=>{if(!frame)frame=requestAnimationFrame(update);};
 function update(){
  frame=0;
  if(!drag?.active)return;
  const {rows,start,point,mode,baseline}=drag;
  const {columns,rowHeight,header}=readLayout();
  if(!available()||rows!==readRows()||columns!==drag.columns||header!==drag.header){finish(true);return;}
  const rect=pane.getBoundingClientRect(),viewTop=rect.top+header;
  const edge=24,above=viewTop+edge-point.y,below=point.y-(rect.bottom-edge);
  const velocity=above>0?-Math.min(28,Math.ceil(above/2)):below>0?Math.min(28,Math.ceil(below/2)):0;
  const before=pane.scrollTop;
  if(velocity)pane.scrollTop+=velocity;
  const x=clamp(point.x-rect.left,0,pane.clientWidth)+pane.scrollLeft;
  const y=clamp(point.y-rect.top,header,pane.clientHeight)+pane.scrollTop-header;
  const left=Math.min(start.x,x),right=Math.max(start.x,x);
  const top=Math.min(start.y,y),bottom=Math.max(start.y,y);
  const columnWidth=(columns===1?pane.scrollWidth:pane.clientWidth)/columns;
  const next={
   top:clamp(Math.floor(top/rowHeight),0,Math.ceil(rows.length/columns)),
   bottom:clamp(Math.floor(bottom/rowHeight)+1,0,Math.ceil(rows.length/columns)),
   left:clamp(Math.floor(left/columnWidth),0,columns),
   right:clamp(Math.floor(right/columnWidth)+1,0,columns)
  };
  const selection=readSelection();
  function apply(box,inside){
   for(let row=box.top;row<box.bottom;row++){
    for(let col=box.left;col<box.right;col++){
     const entry=rows[row*columns+col];
     if(!entry)break;
     const selected=mode==='toggle'?inside!==baseline.has(entry.key):inside||baseline.has(entry.key);
     if(selected)selection.add(entry.key);else selection.delete(entry.key);
    }
   }
  }
  const previous=drag.box;
  visitMarqueeDifference(previous,next,box=>apply(box,false));
  visitMarqueeDifference(next,previous,box=>apply(box,true));
  drag.box=next;
  const x0=clamp(rect.left+left-pane.scrollLeft,rect.left,rect.left+pane.clientWidth);
  const x1=clamp(rect.left+right-pane.scrollLeft,rect.left,rect.left+pane.clientWidth);
  const y0=clamp(viewTop+top-pane.scrollTop,viewTop,rect.top+pane.clientHeight);
  const y1=clamp(viewTop+bottom-pane.scrollTop,viewTop,rect.top+pane.clientHeight);
  Object.assign(overlay.style,{left:x0+'px',top:y0+'px',width:(x1-x0)+'px',height:(y1-y0)+'px'});
  if(!previous||Object.keys(next).some(key=>next[key]!==previous[key]))onChange();
  if(velocity&&pane.scrollTop!==before)queue();
 }
 function pointerDown(event){
  if(drag||!available()||!event.isPrimary||event.button!==0||event.pointerType==='touch'||
     event.target.closest('[data-file-drag],.file-cell-text,.row-spacer,thead,button,input,select,a,[contenteditable]'))return;
  const rect=pane.getBoundingClientRect(),{header,columns}=readLayout();
  if(event.clientX>=rect.left+pane.clientWidth||event.clientY>=rect.top+pane.clientHeight)return;
  drag={id:event.pointerId,clientX:event.clientX,clientY:event.clientY,rows:readRows(),header,columns,
   start:{x:event.clientX-rect.left+pane.scrollLeft,y:event.clientY-rect.top+pane.scrollTop-header},
   mode:event.ctrlKey||event.metaKey?'toggle':event.shiftKey?'add':'replace'};
  window.addEventListener('pointermove',pointerMove);
  window.addEventListener('pointerup',pointerUp);
  window.addEventListener('pointercancel',pointerCancel);
 }
 function pointerMove(event){
  if(!drag||event.pointerId!==drag.id)return;
  if(!drag.active){
   if(!event.buttons){finish(true);return;}
   if(Math.hypot(event.clientX-drag.clientX,event.clientY-drag.clientY)<5)return;
   drag.active=true;
   drag.original=readSelection();
   drag.baseline=drag.mode==='replace'?new Set():drag.original;
   setSelection(new Set(drag.baseline));
   pane.setPointerCapture(drag.id);
   pane.classList.add('marquee-selecting');
   pane.focus({preventScroll:true});
   document.body.append(overlay);
   window.addEventListener('keydown',cancelKey,true);
  }
  drag.point={x:event.clientX,y:event.clientY};
  queue();
 }
 function cancelKey(event){
  if(event.key!=='Escape')return;
  event.preventDefault();event.stopPropagation();finish(true);
 }
 function finish(cancel=false){
  if(!drag)return;
  const previous=drag;
  drag=undefined;
  window.removeEventListener('pointermove',pointerMove);
  window.removeEventListener('pointerup',pointerUp);
  window.removeEventListener('pointercancel',pointerCancel);
  cancelAnimationFrame(frame);frame=0;
  if(!previous.active)return;
  if(pane.hasPointerCapture(previous.id))pane.releasePointerCapture(previous.id);
  pane.classList.remove('marquee-selecting');overlay.remove();
  window.removeEventListener('keydown',cancelKey,true);
  if(cancel){setSelection(previous.original);onChange();}
  else{
   onCommit(previous.mode);
   suppressClick=true;setTimeout(()=>{suppressClick=false;},0);
  }
 }
 function pointerUp(event){
  if(event.pointerId!==drag?.id)return;
  if(drag.active){
   cancelAnimationFrame(frame);frame=0;
   drag.point={x:event.clientX,y:event.clientY};
   update();
  }
  finish();
 }
 function pointerCancel(event){if(event.pointerId===drag?.id)finish(true);}
 pane.addEventListener('pointerdown',pointerDown);
 pane.addEventListener('lostpointercapture',pointerCancel);
 window.addEventListener('blur',()=>finish(true));
 window.addEventListener('pagehide',()=>finish(true));
 return {cancel:()=>finish(true),takeClick:()=>suppressClick};
}
