const wording={
 copy:['Copying…','Copied!','Image clipboard unavailable.'],
 paste:['Pasting…','Pasted!','Paste was not completed.'],
 move:['Moving files…','Moved!','Move was not completed.'],
 rename:['Renaming…','Renamed!','Rename was not completed.'],
 delete:['Deleting…','Deleted!','Delete was not completed.'],
 mkdir:['Creating folder…','Created!','Folder creation was not completed.']
};

export function createExplorerOperationFeedback(document){
 const root=document.documentElement;
 const toast=document.createElement('div'),cursor=document.createElement('div');
 toast.className='explorer-mini-toast';
 toast.setAttribute('role','status');
 cursor.className='explorer-busy-cursor';
 cursor.setAttribute('aria-hidden','true');
 let pending=0,sequence=0,timer,point;
 function follow(event){
  if(event.pointerType==='touch')return;
  const host=document.querySelector('#dialog[open]')??document.body;
  if(cursor.parentNode!==host)host.append(cursor);
  cursor.style.left=Math.min(event.clientX+12,root.clientWidth-16)+'px';
  cursor.style.top=Math.min(event.clientY+12,root.clientHeight-16)+'px';
  cursor.hidden=false;
  point=true;
 }
 function clear(){
  clearTimeout(timer);
  toast.remove();
 }
 function paint(message,{hold=false}={}){
  clear();
  if(document.hidden)return;
  const dialog=document.querySelector('#dialog[open]');
  const gallery=dialog?.querySelector('[data-gallery]');
  ((hold||gallery)&&dialog?dialog:document.body).append(toast);
  toast.textContent=message;
  if(!hold)timer=setTimeout(clear,1800);
 }
 function start(kind){
  const id=++sequence,messages=wording[kind];
  pending++;
  if(pending===1){
   root.dataset.operationBusy='';
   point=false;cursor.hidden=true;
   document.addEventListener('pointermove',follow,{passive:true});
  }
  const dialog=document.querySelector('#dialog[open]');
  (dialog??document.body).append(cursor);
  cursor.hidden=!point;
  paint(messages[0],{hold:true});
  let finished=false;
  return (ok,message)=>{
   if(finished)return;
   finished=true;
   pending--;
   if(!pending){
    delete root.dataset.operationBusy;
    document.removeEventListener('pointermove',follow);
    cursor.remove();
   }
   if(id===sequence){
    if(message===null)clear();
    else paint(message??messages[ok?1:2]);
   }
  };
 }
 return {start,notify:message=>{if(!pending)paint(message);},clear};
}
