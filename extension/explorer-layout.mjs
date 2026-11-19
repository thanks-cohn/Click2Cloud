import {splitAt,separatorKey,clamp} from '../src/explorer/layout.mjs';
// Presentation only: pointer frames never call the engine. Persist once per gesture.
export function installExplorerLayout({read,save,onResize}){
 const shell=document.querySelector('#shell'),aside=shell.querySelector('aside'),split=document.querySelector('#pane-splitter'),toolbar=document.querySelector('#explorer-commands'),bar=document.querySelector('#toolbar-splitter'),overflow=document.querySelector('#toolbar-overflow'),more=document.querySelector('#toolbar-more'),commands=document.querySelector('#command-items'),nodes=[...commands.children],moreActions=[...document.querySelector('#explorer-more-actions')?.children??[]],widths=new Map();let preference={...read()},frame=0,drag=null,maxRows=7,pendingSaves=0;
 const navigation=['back','forward','up','refresh'].map(id=>document.getElementById(id));
 const search=commands.querySelector('#filename-search-form');
 const secondary=['add-location','view-switch'].map(id=>document.getElementById(id));
 const rowBreak=document.createElement('div');rowBreak.className='toolbar-row-break';rowBreak.setAttribute('aria-hidden','true');
 const searchPanel=document.createElement('div');
 searchPanel.id='filename-search-popout';searchPanel.setAttribute('popover','manual');
 searchPanel.hidden=true;document.body.append(searchPanel);
 let returnFocus;
 // Escape both clipping ancestors and their stacking contexts. The native
 // popover top layer also stays above splitters; body portal is the fallback.
 document.body.append(overflow);overflow.setAttribute('popover','manual');
 const closeMore=()=>{if(overflow.matches(':popover-open'))overflow.hidePopover();overflow.hidden=true;more.setAttribute('aria-expanded','false');};
 function positionPanel(panel){if(panel.hidden)return;const anchor=more.getBoundingClientRect(),gap=8,v=window.visualViewport,left=v?.offsetLeft??0,top=v?.offsetTop??0,width=v?.width??innerWidth,height=v?.height??innerHeight;
  panel.style.maxHeight=Math.max(40,height-gap*2)+'px';const box=panel.getBoundingClientRect();panel.style.left=Math.max(left+gap,Math.min(anchor.right-box.width,left+width-box.width-gap))+'px';panel.style.top=Math.max(top+gap,Math.min(anchor.bottom+4,top+height-box.height-gap))+'px';
 }
 const positionMore=()=>{positionPanel(overflow);positionPanel(searchPanel);};
 function closeSearch(restore=false){
  if(searchPanel.hidden)return;
  if(searchPanel.matches(':popover-open'))searchPanel.hidePopover();
  searchPanel.hidden=true;layout();
  if(restore)(returnFocus?.isConnected&&returnFocus.getClientRects().length?returnFocus:more).focus({preventScroll:true});
  returnFocus=null;
 }
 function focusSearch(){
  const input=search.querySelector('input');
  if(input.disabled||drag)return false;
  if(searchPanel.hidden&&!commands.contains(search)){
   returnFocus=document.activeElement;closeMore();searchPanel.append(search);
   searchPanel.hidden=false;searchPanel.showPopover?.();positionPanel(searchPanel);
  }
  input.focus({preventScroll:true});return true;
 }
 searchPanel.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.isComposing){e.preventDefault();e.stopPropagation();closeSearch(true);}},true);

 function openMore(){if(overflow.hidden){overflow.hidden=false;overflow.showPopover?.();}more.setAttribute('aria-expanded','true');positionMore();overflow.querySelector('input:not(:disabled),button:not(:disabled),select:not(:disabled),[tabindex="0"]')?.focus({preventScroll:true});}

 const place=(parent,children)=>{if(children.length===parent.children.length&&children.every((n,i)=>parent.children[i]===n))return;parent.replaceChildren(...children);};
 function layout(){frame=0;const focused=toolbar.contains(document.activeElement)||overflow.contains(document.activeElement)?document.activeElement:null;if(shell.dataset.view!=='explorer')return;
  shell.style.setProperty('--tree-split',preference.split+'%');aside.inert=preference.split===0;document.querySelector('#main').inert=preference.split===100;shell.dataset.collapsed=preference.split===0?'tree':preference.split===100?'files':'';split.setAttribute('aria-valuenow',String(Math.round(preference.split)));split.setAttribute('aria-valuetext',Math.round(preference.split)+'% folder tree');
  shell.toggleAttribute('data-manage-in-toolbar',shell.clientWidth*preference.split/100<44);
  more.hidden=false;
  const toolbarStyle=getComputedStyle(toolbar),commandStyle=getComputedStyle(commands);
  const available=Math.max(0,toolbar.clientWidth-parseFloat(toolbarStyle.paddingLeft)-parseFloat(toolbarStyle.paddingRight)-parseFloat(toolbarStyle.columnGap)-more.offsetWidth);
  const gap=parseFloat(commandStyle.columnGap),compactWidth=parseFloat(commandStyle.getPropertyValue('--navigation-width'));
  for(const node of [...navigation,...secondary])if(!widths.has(node))widths.set(node,Math.max(34,node.scrollWidth+2));
  const width=node=>node===search?parseFloat(commandStyle.getPropertyValue('--filename-search-min')):navigation.includes(node)&&compactWidth?compactWidth:widths.get(node);
  const fits=(items,node)=>items.reduce((total,item)=>total+width(item)+gap,0)+width(node)<=available;
  const [refresh]=navigation.slice(-1),base=navigation.slice(0,-1),primary=[],extra=[];
  for(const node of base){if(!fits(primary,node))break;primary.push(node);}
  const searchable=searchPanel.hidden&&width(search)<=available;
  const firstSearch=searchable&&primary.length===base.length&&fits(primary,search);
  if(fits(firstSearch?[...primary,search]:primary,refresh))primary.push(refresh);
  if(firstSearch)primary.push(search);
  const remaining=[...(searchable&&!firstSearch?[search]:[]),...secondary].filter(node=>width(node)<=available);
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
  const hidden=nodes.filter(node=>!visible.includes(node)&&(node!==search||searchPanel.hidden));
  place(commands,visible);place(overflow,[...hidden,...moreActions]);
  toolbar.style.setProperty('--command-rows',rows);bar.setAttribute('aria-valuenow',String(rows));bar.setAttribute('aria-valuemax',String(maxRows));if(focused&&document.activeElement!==focused){if(overflow.contains(focused)&&overflow.hidden)more.focus({preventScroll:true});else focused.focus({preventScroll:true});}positionMore();onResize();
 }
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(layout);};
 const persist=()=>{pendingSaves++;split.setAttribute('aria-busy','true');bar.setAttribute('aria-busy','true');void save({...preference}).catch(()=>{preference={...read()};schedule();}).finally(()=>{pendingSaves--;split.setAttribute('aria-busy',String(pendingSaves>0));bar.setAttribute('aria-busy',String(pendingSaves>0));});};
 function changeLayout(property,value){if(preference[property]===value)return;preference[property]=value;schedule();persist();}
 function finish(){if(!drag)return;const d=drag;drag=null;document.body.classList.remove('resizing');if(d.el.hasPointerCapture?.(d.id))d.el.releasePointerCapture(d.id);if(d.initial.split!==preference.split||d.initial.toolbarRows!==preference.toolbarRows)persist();}
 function bind(el,vertical){el.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();el.focus({preventScroll:true});closeMore();drag={el,id:e.pointerId,initial:{...preference},start:e.clientY,rows:preference.toolbarRows,rect:shell.getBoundingClientRect()};el.setPointerCapture(e.pointerId);document.body.classList.add('resizing');});el.addEventListener('pointermove',e=>{if(drag?.el!==el||drag.id!==e.pointerId)return;if(vertical)preference.split=splitAt(e.clientX,drag.rect.left,drag.rect.width);else preference.toolbarRows=clamp(Math.round(drag.rows+(e.clientY-drag.start)/42),1,maxRows);schedule();});for(const name of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(name,finish);el.addEventListener('keydown',e=>{const next=separatorKey(vertical?preference.split:preference.toolbarRows,e.key,{vertical,min:vertical?0:1,max:vertical?100:maxRows,step:vertical?2:1});if(next===null)return;e.preventDefault();if(next===preference[vertical?'split':'toolbarRows'])return;preference[vertical?'split':'toolbarRows']=next;schedule();persist();});el.addEventListener('dblclick',()=>{if(preference[vertical?'split':'toolbarRows']===(vertical?50:1))return;preference[vertical?'split':'toolbarRows']=vertical?50:1;schedule();persist();});}
 bind(split,true);bind(bar,false);window.addEventListener('blur',finish);
 more.onclick=()=>{closeSearch();overflow.hidden?openMore():closeMore();};
 const escape=e=>{if(e.key==='Escape'&&!e.defaultPrevented&&!overflow.hidden){e.preventDefault();closeMore();more.focus({preventScroll:true});}};
 overflow.addEventListener('keydown',escape);more.addEventListener('keydown',e=>{escape(e);if(e.key==='ArrowDown'){e.preventDefault();openMore();}});
 overflow.addEventListener('click',e=>{if(e.target.closest('button')){const focused=overflow.contains(document.activeElement);closeMore();if(focused)more.focus({preventScroll:true});}});
 document.addEventListener('pointerdown',e=>{if(!toolbar.contains(e.target)&&!overflow.contains(e.target))closeMore();if(!searchPanel.contains(e.target))closeSearch();});
 document.addEventListener('focusin',e=>{if(!toolbar.contains(e.target)&&!overflow.contains(e.target))closeMore();if(!searchPanel.contains(e.target))closeSearch();});
 window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);document.addEventListener('scroll',positionMore,true);
 const observer=new ResizeObserver(schedule);observer.observe(toolbar);observer.observe(shell);layout();
 return {refresh(){if(!drag)preference={...read()};schedule();},hide(){finish();closeMore();closeSearch();},
  setShortcuts(bindings){
   for(const [id,el] of [['explorer.toggleToolbarRows',bar],['explorer.resetPanelSplit',split],['explorer.focusSearch',search.querySelector('input')]]){
    const chord=bindings[id];if(chord)el.setAttribute('aria-keyshortcuts',chord.replace(/^Ctrl/, 'Control'));else el.removeAttribute('aria-keyshortcuts');
   }
  },
  commands:{
   'explorer.toggleToolbarRows':()=>{if(drag)return false;changeLayout('toolbarRows',preference.toolbarRows===1?2:1);return true;},
   'explorer.resetPanelSplit':()=>{if(drag)return false;changeLayout('split',50);return true;},
   'explorer.focusSearch':focusSearch
  },inspect:()=>({...preference,maxRows})};
}
