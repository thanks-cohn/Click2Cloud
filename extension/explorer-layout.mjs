import {splitAt,separatorKey,clamp,cycleDivider} from '../src/explorer/layout.mjs';
// Presentation only: pointer frames never call the engine. Persist once per gesture.
export function installExplorerLayout({read,save,onResize,readCycleMode=()=>'alternate'}){
 const shell=document.querySelector('#shell'),aside=shell.querySelector('aside'),split=document.querySelector('#pane-splitter'),toolbar=document.querySelector('#explorer-commands'),bar=document.querySelector('#toolbar-splitter'),overflow=document.querySelector('#toolbar-overflow'),more=document.querySelector('#toolbar-more'),commands=document.querySelector('#command-items'),nodes=[...commands.children],moreActions=[...document.querySelector('#explorer-more-actions')?.children??[]],widths=new Map();let preference={...read()},frame=0,drag=null,maxRows=7,saving=false,queued=null,saveTimer;
 const navigation=['back','forward','up','refresh'].map(id=>document.getElementById(id));
 const search=commands.querySelector('#filename-search-form'),opener=commands.querySelector('#open-filename-search');
 const input=search.querySelector('input');
 const secondary=['add-location','view-switch'].map(id=>document.getElementById(id));
 const rowBreak=document.createElement('div');rowBreak.className='toolbar-row-break';rowBreak.setAttribute('aria-hidden','true');
 const searchPanel=document.createElement('div');
 searchPanel.id='filename-search-popout';searchPanel.setAttribute('popover','manual');
 searchPanel.hidden=true;document.body.append(searchPanel);
 let returnFocus,pinned=false,dismissed=false,revealed=false,nextExtreme=0,searchAvailable=false,offlineSearch=false;
 function syncSearchAvailability(){
  opener.disabled=!searchAvailable;
  input.disabled=!searchAvailable&&!offlineSearch;
  input.placeholder=searchAvailable?'Search filenames…':'Open a connected folder to search';
 }
 // Escape both clipping ancestors and their stacking contexts. The native
 // popover top layer also stays above splitters; body portal is the fallback.
 document.body.append(overflow);overflow.setAttribute('popover','manual');
 const closeMore=()=>{if(overflow.matches(':popover-open'))overflow.hidePopover();overflow.hidden=true;more.setAttribute('aria-expanded','false');};
 function positionPanel(panel){if(panel.hidden)return;const anchor=more.getBoundingClientRect(),gap=8,v=window.visualViewport,left=v?.offsetLeft??0,top=v?.offsetTop??0,width=v?.width??innerWidth,height=v?.height??innerHeight;
  panel.style.maxHeight=Math.max(40,height-gap*2)+'px';const box=panel.getBoundingClientRect();panel.style.left=Math.max(left+gap,Math.min(anchor.right-box.width,left+width-box.width-gap))+'px';panel.style.top=Math.max(top+gap,Math.min(anchor.bottom+4,top+height-box.height-gap))+'px';
 }
 const positionMore=()=>{positionPanel(overflow);positionPanel(searchPanel);};
 function hideSearchPanel(){
  if(searchPanel.matches(':popover-open'))searchPanel.hidePopover();
  searchPanel.hidden=true;
 }
 function canReturnTo(element){
  return element&&element!==document.body&&element.isConnected&&element.getClientRects().length&&
   !element.disabled&&!element.closest('[inert]')&&!search.contains(element);
 }
 function restoreSearchFocus(...fallbacks){
  for(const candidate of [returnFocus,...fallbacks,split]){
   if(!canReturnTo(candidate))continue;
   candidate.focus({preventScroll:true});
   if(document.activeElement===candidate)return true;
  }
  return false;
 }
 function dismissSearch(){
  if(dismissed||(!pinned&&!search.getClientRects().length))return false;
  pinned=false;dismissed=true;revealed=false;hideSearchPanel();closeMore();layout();
  offlineSearch=false;syncSearchAvailability();
  restoreSearchFocus(opener,more);
  returnFocus=null;
  return true;
 }
 function focusSearch(forcePopout=false,{allowOffline=false}={}){
  if(allowOffline){offlineSearch=true;syncSearchAvailability();}
  if(input.disabled||drag)return false;
  const current=document.activeElement;
  if(canReturnTo(current))returnFocus=overflow.contains(current)?more:current;
  if(dismissed){dismissed=false;layout();}
  if((forcePopout||!commands.contains(search))&&(!pinned||searchPanel.hidden)){
   closeMore();pinned=true;searchPanel.append(search);
   searchPanel.hidden=false;searchPanel.showPopover?.();positionPanel(searchPanel);
   layout();
  }
  input.focus({preventScroll:true});
  if(document.activeElement!==input)return false;
  revealed=true;
  return true;
 }
 function toggleSearchFocus(){
  if(document.activeElement!==input)return focusSearch();
  return restoreSearchFocus(opener,document.querySelector('#files'),more);
 }
 opener.onclick=()=>focusSearch();
 search.querySelector('#hide-filename-search').onclick=dismissSearch;
 search.addEventListener('focusin',()=>{if(overflow.contains(search))focusSearch();});
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!e.isComposing&&!e.defaultPrevented&&shell.dataset.view==='explorer'&&
   !document.querySelector('#dialog[open],#context:not([hidden])')&&dismissSearch()){
   e.preventDefault();e.stopPropagation();
  }
 });

 function openMore(){
  if(overflow.hidden){overflow.hidden=false;overflow.showPopover?.();}
  more.setAttribute('aria-expanded','true');positionMore();
  const controls=[...overflow.querySelectorAll('input:not(:disabled),button:not(:disabled),select:not(:disabled),[tabindex="0"]')];
  (controls.find(control=>!search.contains(control))??controls[0])?.focus({preventScroll:true});
 }

 const place=(parent,children)=>{if(children.length===parent.children.length&&children.every((n,i)=>parent.children[i]===n))return;parent.replaceChildren(...children);};
 function layout(){frame=0;const focused=toolbar.contains(document.activeElement)||overflow.contains(document.activeElement)?document.activeElement:null;if(shell.dataset.view!=='explorer')return;
  const active=document.activeElement;
  if(preference.split===0&&aside.contains(active)||preference.split===100&&document.querySelector('#main').contains(active))split.focus({preventScroll:true});
  shell.style.setProperty('--tree-split',preference.split+'%');aside.inert=preference.split===0;document.querySelector('#main').inert=preference.split===100;shell.dataset.collapsed=preference.split===0?'tree':preference.split===100?'files':'';split.setAttribute('aria-valuenow',String(Math.round(preference.split)));split.setAttribute('aria-valuetext',Math.round(preference.split)+'% folder tree');
  shell.toggleAttribute('data-manage-in-toolbar',shell.clientWidth*preference.split/100<(shell.querySelector('#manage-slot #sign-out')?118:44));
  more.hidden=false;
  const toolbarStyle=getComputedStyle(toolbar),commandStyle=getComputedStyle(commands);
  const available=Math.max(0,toolbar.clientWidth-parseFloat(toolbarStyle.paddingLeft)-parseFloat(toolbarStyle.paddingRight)-parseFloat(toolbarStyle.columnGap)-more.offsetWidth);
  const gap=parseFloat(commandStyle.columnGap),compactWidth=parseFloat(commandStyle.getPropertyValue('--navigation-width'));
  for(const node of [...navigation,...secondary])if(!widths.has(node))widths.set(node,Math.max(34,node.scrollWidth+2));
  const searchControl=dismissed?opener:search;
  const width=node=>node===opener?82:node===search?parseFloat(commandStyle.getPropertyValue('--filename-search-min')):navigation.includes(node)&&compactWidth?compactWidth:widths.get(node);
  const fits=(items,node)=>items.reduce((total,item)=>total+width(item)+gap,0)+width(node)<=available;
  const [refresh]=navigation.slice(-1),base=navigation.slice(0,-1),primary=[],extra=[];
  for(const node of base){if(!fits(primary,node))break;primary.push(node);}
  const searchable=!pinned&&width(searchControl)<=available;
  const firstSearch=searchable&&primary.length===base.length&&fits(primary,searchControl);
  if(fits(firstSearch?[...primary,searchControl]:primary,refresh))primary.push(refresh);
  if(firstSearch)primary.push(searchControl);
  const remaining=[...(searchable&&!firstSearch?[searchControl]:[]),...secondary].filter(node=>width(node)<=available);
  maxRows=Math.max(2,Math.min(7,1+remaining.length));
  const rows=Math.min(preference.toolbarRows,maxRows);
  if(rows>1){
   let row=[];
   let rowsUsed=2;
   for(const node of remaining){
    if(!fits(row,node)){
     if(rowsUsed+1>=rows)continue;
     row=[];rowsUsed++;extra.push(rowBreak.cloneNode());
    }
    row.push(node);extra.push(node);
   }
  }
  const visible=extra.length&&primary.length?[...primary,rowBreak,...extra]:[...primary,...extra];
  if(!dismissed&&!pinned&&!visible.includes(search)&&(revealed||search.contains(focused)||input.value)){
   pinned=true;returnFocus??=more;searchPanel.append(search);
   layout();if(search.contains(focused))focused.focus({preventScroll:true});
   return;
  }
  if(dismissed&&!searchPanel.contains(search))searchPanel.append(search);
  if(pinned&&searchPanel.hidden){searchPanel.hidden=false;searchPanel.showPopover?.();}
  const hidden=nodes.filter(node=>!visible.includes(node)&&(node!==search&&node!==opener||!pinned&&node===searchControl));
  place(commands,visible);place(overflow,[...hidden,...moreActions]);
  toolbar.style.setProperty('--command-rows',rows);bar.setAttribute('aria-valuenow',String(rows));bar.setAttribute('aria-valuemax',String(maxRows));if(focused&&document.activeElement!==focused){if(overflow.contains(focused)&&overflow.hidden)more.focus({preventScroll:true});else focused.focus({preventScroll:true});}positionMore();onResize();
 }
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(layout);};
 function persist(){
  const idle=!queued&&!saving;
  queued={...preference};
  if(idle){split.setAttribute('aria-busy','true');bar.setAttribute('aria-busy','true');}
  if(saving)return;
  clearTimeout(saveTimer);
  saveTimer=setTimeout(flush,60);
 }
 async function flush(){
  clearTimeout(saveTimer);saveTimer=undefined;
  if(saving||!queued)return;
  saving=true;
  while(queued){
   const next=queued;queued=null;
   try{await save(next);}
   catch{if(!queued&&!drag){preference={...read()};nextExtreme=0;schedule();}}
  }
  saving=false;
  split.setAttribute('aria-busy','false');bar.setAttribute('aria-busy','false');
 }
 function changeLayout(property,value){if(preference[property]===value)return;preference[property]=value;schedule();persist();}
 function finish(){if(!drag)return;const d=drag;drag=null;document.body.classList.remove('resizing');if(d.el.hasPointerCapture?.(d.id))d.el.releasePointerCapture(d.id);if(d.initial.split!==preference.split||d.initial.toolbarRows!==preference.toolbarRows)persist();}
 function bind(el,vertical){el.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();el.focus({preventScroll:true});closeMore();drag={el,id:e.pointerId,initial:{...preference},start:e.clientY,rows:preference.toolbarRows,rect:shell.getBoundingClientRect()};el.setPointerCapture(e.pointerId);document.body.classList.add('resizing');});el.addEventListener('pointermove',e=>{if(drag?.el!==el||drag.id!==e.pointerId)return;if(vertical){preference.split=splitAt(e.clientX,drag.rect.left,drag.rect.width);nextExtreme=0;}else preference.toolbarRows=clamp(Math.round(drag.rows+(e.clientY-drag.start)/42),1,maxRows);schedule();});for(const name of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(name,finish);el.addEventListener('keydown',e=>{const next=separatorKey(vertical?preference.split:preference.toolbarRows,e.key,{vertical,min:vertical?0:1,max:vertical?100:maxRows,step:vertical?2:1});if(next===null)return;e.preventDefault();if(next===preference[vertical?'split':'toolbarRows'])return;preference[vertical?'split':'toolbarRows']=next;if(vertical)nextExtreme=0;schedule();persist();});el.addEventListener('dblclick',()=>{if(preference[vertical?'split':'toolbarRows']===(vertical?50:1))return;preference[vertical?'split':'toolbarRows']=vertical?50:1;if(vertical)nextExtreme=0;schedule();persist();});}
 bind(split,true);bind(bar,false);window.addEventListener('blur',finish);window.addEventListener('pagehide',flush);
 more.onclick=()=>{overflow.hidden?openMore():closeMore();};
 const escape=e=>{if(e.key==='Escape'&&!e.defaultPrevented&&!overflow.hidden){e.preventDefault();closeMore();more.focus({preventScroll:true});}};
 overflow.addEventListener('keydown',escape);more.addEventListener('keydown',e=>{escape(e);if(e.key==='ArrowDown'){e.preventDefault();openMore();}});
 overflow.addEventListener('click',e=>{if(e.target.closest('button')&&e.target!==opener){const focused=overflow.contains(document.activeElement);closeMore();if(focused)more.focus({preventScroll:true});}});
 document.addEventListener('pointerdown',e=>{if(!toolbar.contains(e.target)&&!overflow.contains(e.target))closeMore();});
 document.addEventListener('focusin',e=>{if(!toolbar.contains(e.target)&&!overflow.contains(e.target))closeMore();});
 window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);document.addEventListener('scroll',positionMore,true);
 const observer=new ResizeObserver(schedule);observer.observe(toolbar);observer.observe(shell);layout();
 return {refresh(){if(!drag&&!saving&&!queued)preference={...read()};schedule();},hide(){finish();closeMore();hideSearchPanel();offlineSearch=false;syncSearchAvailability();},dismissSearch,focusSearch,
  setSearchAvailable(available){searchAvailable=available;syncSearchAvailability();},
  setShortcuts(bindings){
   for(const [id,el] of [['explorer.resetPanelSplit',split],['explorer.focusSearch',input]]){
    const chord=bindings[id];if(chord)el.setAttribute('aria-keyshortcuts',chord.replace(/^Ctrl/, 'Control'));else el.removeAttribute('aria-keyshortcuts');
   }
  },
  commands:{
   'explorer.resetPanelSplit':()=>{
    if(drag)return false;
    const next=cycleDivider(preference.split,readCycleMode(),nextExtreme);
    nextExtreme=next.nextExtreme;changeLayout('split',next.position);return true;
   },
   'explorer.focusSearch':toggleSearchFocus
  },inspect:()=>({...preference,maxRows})};
}
