const wording={
 copy:['Copying…','Copied!','Image clipboard unavailable.'],
 paste:['Pasting…','Pasted!','Paste was not completed.'],
 move:['Moving files…','Moved!','Move was not completed.'],
 rename:['Renaming…','Renamed!','Rename was not completed.'],
 delete:['Deleting…','Deleted!','Delete was not completed.'],
 mkdir:['Creating folder…','Created!','Folder creation was not completed.']
};

export function createExplorerOperationFeedback(document,notifications){
 const root=document.documentElement;
 const cursor=document.createElement('div');
 cursor.className='explorer-busy-cursor';
 cursor.setAttribute('aria-hidden','true');
 let pending=0,sequence=0,clearNotice,point;
 function follow(event){
  if(event.pointerType==='touch')return;
  const host=document.querySelector('#dialog[open]')??document.body;
  if(cursor.parentNode!==host)host.append(cursor);
  cursor.style.left=Math.min(event.clientX+12,root.clientWidth-16)+'px';
  cursor.style.top=Math.min(event.clientY+12,root.clientHeight-16)+'px';
  cursor.hidden=false;
  point=true;
 }
 function paint(message,error=false){
  clearNotice?.();
  clearNotice=notifications.show(message,{error,explorer:true,key:null});
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
  paint(messages[0]);
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
    if(message===null)clearNotice?.();
    else paint(message??messages[ok?1:2],!ok);
   }
  };
 }
 return {start,notify:message=>{if(!pending)paint(message);}};
}
