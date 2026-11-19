import {splitAt,separatorKey,clamp} from '../src/explorer/layout.mjs';
// Presentation only: pointer frames never call the engine. Persist once per gesture.
export function installExplorerLayout({read,save,onResize}){
 const shell=document.querySelector('#shell'),aside=shell.querySelector('aside'),split=document.querySelector('#pane-splitter'),toolbar=document.querySelector('#explorer-commands'),bar=document.querySelector('#toolbar-splitter'),overflow=document.querySelector('#toolbar-overflow'),more=document.querySelector('#toolbar-more'),commands=document.querySelector('#command-items'),nodes=[...commands.children],moreActions=[...document.querySelector('#explorer-more-actions')?.children??[]],widths=new Map();let preference={...read()},frame=0,drag=null,maxRows=7,pendingSaves=0;
 const navigation=['back','forward','up','refresh'].map(id=>document.getElementById(id));
 const address=commands.querySelector('.address');
 const secondary=['add-location','view-switch'].map(id=>document.getElementById(id));
 const rowBreak=document.createElement('div');rowBreak.className='toolbar-row-break';rowBreak.setAttribute('aria-hidden','true');
 const shortcuts=[
  {key:'F8',separator:bar,property:'toolbarRows',label:'Toggle one or two toolbar rows',next:()=>preference.toolbarRows===1?2:1},
  {key:'F9',separator:split,property:'split',label:'Reset panels to 50/50',next:()=>50}
 ];
 for(const {key,separator,property,label,next} of shortcuts){
  separator.setAttribute('aria-keyshortcuts',`Control+Shift+${key}`);
  separator.title=`${label} (Ctrl+Shift+${key})`;
  const button=document.createElement('button');button.type='button';button.textContent=separator.title;
  button.onclick=()=>{changeLayout(property,next());closeMore();more.focus({preventScroll:true});};
  moreActions.push(button);
 }
 // Escape both clipping ancestors and their stacking contexts. The native
 // popover top layer also stays above splitters; body portal is the fallback.
 document.body.append(overflow);overflow.setAttribute('popover','manual');
 const closeMore=()=>{if(overflow.matches(':popover-open'))overflow.hidePopover();overflow.hidden=true;more.setAttribute('aria-expanded','false');};
 function positionMore(){if(overflow.hidden)return;const anchor=more.getBoundingClientRect(),gap=8,v=window.visualViewport,left=v?.offsetLeft??0,top=v?.offsetTop??0,width=v?.width??innerWidth,height=v?.height??innerHeight;
  overflow.style.maxHeight=Math.max(40,height-gap*2)+'px';const box=overflow.getBoundingClientRect();overflow.style.left=Math.max(left+gap,Math.min(anchor.right-box.width,left+width-box.width-gap))+'px';overflow.style.top=Math.max(top+gap,Math.min(anchor.bottom+4,top+height-box.height-gap))+'px';
 }
 function openMore(){overflow.hidden=false;overflow.showPopover?.();more.setAttribute('aria-expanded','true');positionMore();overflow.querySelector('input,button,select,[tabindex]')?.focus({preventScroll:true});}

 const place=(parent,children)=>{if(children.length===parent.children.length&&children.every((n,i)=>parent.children[i]===n))return;parent.replaceChildren(...children);};
 function layout(){frame=0;const focused=toolbar.contains(document.activeElement)||overflow.contains(document.activeElement)?document.activeElement:null;if(shell.dataset.view!=='explorer')return;
  shell.style.setProperty('--tree-split',preference.split+'%');aside.inert=preference.split===0;document.querySelector('#main').inert=preference.split===100;shell.dataset.collapsed=preference.split===0?'tree':preference.split===100?'files':'';split.setAttribute('aria-valuenow',String(Math.round(preference.split)));split.setAttribute('aria-valuetext',Math.round(preference.split)+'% folder tree');
  shell.toggleAttribute('data-manage-in-toolbar',shell.clientWidth*preference.split/100<44);
  more.hidden=false;
  const toolbarStyle=getComputedStyle(toolbar),commandStyle=getComputedStyle(commands);
  const available=Math.max(0,toolbar.clientWidth-parseFloat(toolbarStyle.paddingLeft)-parseFloat(toolbarStyle.paddingRight)-parseFloat(toolbarStyle.columnGap)-more.offsetWidth);
  const gap=parseFloat(commandStyle.columnGap),compactWidth=parseFloat(commandStyle.getPropertyValue('--navigation-width'));
  for(const node of nodes)if(!widths.has(node))widths.set(node,node===address?110:Math.max(34,node.scrollWidth+2));
  const width=node=>navigation.includes(node)&&compactWidth?compactWidth:widths.get(node);
  const fit=items=>{let rows=1,used=0;for(const node of items){const w=Math.min(available,width(node));if(used&&used+gap+w>available){rows++;used=0;}used+=used?gap+w:w;}return rows;};
  const primary=[];let used=0;
  for(const node of navigation){const next=used+(primary.length?gap:0)+width(node);if(next>available)break;primary.push(node);used=next;}
  if(preference.toolbarRows>1&&primary.length===navigation.length&&used+gap+width(address)<=available)primary.push(address);
  const remaining=secondary.filter(node=>available>0&&width(node)<=available);
  if(!primary.includes(address)&&width(address)<=available)remaining.push(address);
  maxRows=Math.max(2,Math.min(7,1+fit(remaining)));
  const rows=Math.min(preference.toolbarRows,maxRows),extra=[];
  if(rows>1)for(const node of remaining)if(fit([...extra,node])<rows)extra.push(node);
  const visible=extra.length&&primary.length?[...primary,rowBreak,...extra]:[...primary,...extra];
  const hidden=nodes.filter(node=>!visible.includes(node));
  place(commands,visible);place(overflow,[...hidden,...moreActions]);
  toolbar.style.setProperty('--command-rows',rows);bar.setAttribute('aria-valuenow',String(rows));bar.setAttribute('aria-valuemax',String(maxRows));if(focused&&document.activeElement!==focused){if(overflow.contains(focused)&&overflow.hidden)more.focus({preventScroll:true});else focused.focus({preventScroll:true});}positionMore();onResize();
 }
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(layout);};
 const persist=()=>{pendingSaves++;split.setAttribute('aria-busy','true');bar.setAttribute('aria-busy','true');void save({...preference}).catch(()=>{preference={...read()};schedule();}).finally(()=>{pendingSaves--;split.setAttribute('aria-busy',String(pendingSaves>0));bar.setAttribute('aria-busy',String(pendingSaves>0));});};
 function changeLayout(property,value){if(preference[property]===value)return;preference[property]=value;schedule();persist();}
 document.addEventListener('keydown',event=>{
  if(shell.dataset.view!=='explorer'||drag||event.defaultPrevented||event.repeat||event.isComposing||!event.ctrlKey||!event.shiftKey||event.metaKey||event.altKey)return;
  if(event.target.closest?.('input,select,textarea,[contenteditable],dialog,[role=menu],#toolbar-overflow')||document.querySelector('dialog[open],#context:not([hidden]),#header-menu:not([hidden])'))return;
  const command=shortcuts.find(({key})=>key===event.key);if(!command)return;
  event.preventDefault();changeLayout(command.property,command.next());
 });
 function finish(){if(!drag)return;const d=drag;drag=null;document.body.classList.remove('resizing');if(d.el.hasPointerCapture?.(d.id))d.el.releasePointerCapture(d.id);if(d.initial.split!==preference.split||d.initial.toolbarRows!==preference.toolbarRows)persist();}
 function bind(el,vertical){el.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();el.focus({preventScroll:true});closeMore();drag={el,id:e.pointerId,initial:{...preference},start:e.clientY,rows:preference.toolbarRows,rect:shell.getBoundingClientRect()};el.setPointerCapture(e.pointerId);document.body.classList.add('resizing');});el.addEventListener('pointermove',e=>{if(drag?.el!==el||drag.id!==e.pointerId)return;if(vertical)preference.split=splitAt(e.clientX,drag.rect.left,drag.rect.width);else preference.toolbarRows=clamp(Math.round(drag.rows+(e.clientY-drag.start)/42),1,maxRows);schedule();});for(const name of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(name,finish);el.addEventListener('keydown',e=>{const next=separatorKey(vertical?preference.split:preference.toolbarRows,e.key,{vertical,min:vertical?0:1,max:vertical?100:maxRows,step:vertical?2:1});if(next===null)return;e.preventDefault();if(next===preference[vertical?'split':'toolbarRows'])return;preference[vertical?'split':'toolbarRows']=next;schedule();persist();});el.addEventListener('dblclick',()=>{if(preference[vertical?'split':'toolbarRows']===(vertical?50:1))return;preference[vertical?'split':'toolbarRows']=vertical?50:1;schedule();persist();});}
 bind(split,true);bind(bar,false);window.addEventListener('blur',finish);
 more.onclick=()=>overflow.hidden?openMore():closeMore();
 const escape=e=>{if(e.key==='Escape'&&!overflow.hidden){e.preventDefault();closeMore();more.focus({preventScroll:true});}};
 overflow.addEventListener('keydown',escape);more.addEventListener('keydown',e=>{escape(e);if(e.key==='ArrowDown'){e.preventDefault();openMore();}});
 overflow.addEventListener('click',e=>{if(e.target.closest('button')){closeMore();if(overflow.contains(document.activeElement))more.focus({preventScroll:true});}});
 document.addEventListener('pointerdown',e=>{if(!toolbar.contains(e.target)&&!overflow.contains(e.target))closeMore();});
 document.addEventListener('focusin',e=>{if(!toolbar.contains(e.target)&&!overflow.contains(e.target))closeMore();});
 window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);document.addEventListener('scroll',positionMore,true);
 const observer=new ResizeObserver(schedule);observer.observe(toolbar);observer.observe(shell);layout();
 return {refresh(){if(!drag)preference={...read()};schedule();},hide(){finish();closeMore();},inspect:()=>({...preference,maxRows})};
}
