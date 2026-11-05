import {createCurrentStore} from '../src/persistence/current-store.mjs';
const $=s=>document.querySelector(s);
function el(tag,text,props={}){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;Object.assign(n,props);return n;}
function button(text,fn){const n=el('button',text,{type:'button'});n.onclick=()=>run(fn);return n;}
async function call(method,params={}){const r=await chrome.runtime.sendMessage({channel:'engine',version:1,method,params});if(!r?.ok)throw Error(r?.code??'HOST_UNAVAILABLE');return r.data;}
async function run(fn){try{return await fn();}catch(e){$('#status').textContent=e.message;}}
let config,selected=null,accounts=[],buckets=[],view='remotes';
let explorerContextMenu=null,menuRequestSeq=0;
function dismissExplorerContextMenu({restoreFocus=false}={}){
  menuRequestSeq++;
  if(!explorerContextMenu)return;
  const {element,owner}=explorerContextMenu; explorerContextMenu=null;element.remove();
  if(restoreFocus&&owner?.isConnected)owner.focus({preventScroll:true});
}
// One floating, inspectable menu instance for the whole Explorer, never a row child.
// The same headless action descriptors are available to authorized scripts through
// inspectExplorerContextMenu; this DOM is a presentation of those descriptors.
async function showExplorerContextMenu(event,source,entry,root,owner){
  event.preventDefault();event.stopPropagation();
  dismissExplorerContextMenu();const seq=menuRequestSeq;
  const currentTarget=target({...source,prefix:entry.key});
  selected=currentTarget;
  const descriptor=await call('inspectExplorerContextMenu',{target:currentTarget});
  if(!owner?.isConnected||seq!==menuRequestSeq)return;
  const menu=el('div',undefined,{className:'explorer-context-menu'});
  menu.id='explorer-context-menu';menu.setAttribute('role','menu');
  menu.setAttribute('aria-label','Folder actions: '+entry.displayName);
  menu.dataset.menuKind=descriptor.kind;
  menu.dataset.target=JSON.stringify(descriptor.target);
  menu.tabIndex=-1;
  const perform={
    'explorer.open':()=>folder({...source,prefix:entry.key},root),
    'explorer.rightClickSetup':()=>openEditor(),
    'explorer.setFlatDefault':()=>commit({type:'setFlatDefault',target:currentTarget}),
    'explorer.manageDestinations':()=>openManager()
  };
  for(const item of descriptor.items){
    const action=perform[item.id];
    const control=el('button',item.label,{type:'button'});
    control.setAttribute('role','menuitem');
    control.dataset.actionId=item.id;
    control.disabled=item.enabled===false||typeof action!=='function';
    control.addEventListener('click',()=>{
      if(explorerContextMenu?.element!==menu)return;
      dismissExplorerContextMenu();
      if(action)void run(action);
    });
    menu.append(control);
  }
  menu.addEventListener('contextmenu',e=>e.preventDefault());
  menu.addEventListener('keydown',e=>{
    const controls=[...menu.querySelectorAll('button:not(:disabled)')],index=controls.indexOf(document.activeElement);
    if(e.key==='Escape'){e.preventDefault();dismissExplorerContextMenu({restoreFocus:true});}
    else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();
      controls[(index+(e.key==='ArrowDown'?1:controls.length-1))%controls.length]?.focus();
    }else if(e.key==='Home'||e.key==='End'){
      e.preventDefault();controls[e.key==='Home'?0:controls.length-1]?.focus();
    }
  });
  document.body.append(menu);
  const width=menu.offsetWidth,height=menu.offsetHeight;
  menu.style.left=Math.max(8,Math.min(event.clientX,window.innerWidth-width-8))+'px';
  menu.style.top=Math.max(8,Math.min(event.clientY,window.innerHeight-height-8))+'px';
  explorerContextMenu={element:menu,owner};
  menu.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
}

async function showExplorerFileMenu(event,source,entry,owner){
  event.preventDefault();event.stopPropagation();
  dismissExplorerContextMenu();const seq=menuRequestSeq;
  const preview=await call('previewContextMenu',{context:'link'});
  if(!owner?.isConnected||seq!==menuRequestSeq)return;
  const menu=el('div',undefined,{className:'explorer-context-menu'});
  menu.id='explorer-context-menu';menu.dataset.menuKind='explorer.file';
  menu.dataset.source=JSON.stringify(source);menu.dataset.entryKey=entry.key;
  menu.setAttribute('role','menu');menu.setAttribute('aria-label','Send '+entry.displayName+' to cloud');
  menu.tabIndex=-1;
  const save=async action=>{
    const params={
      itemId:action.itemId,generation:preview.generation,context:'link',
      source:{accountId:source.accountId,bucketName:source.bucketName,prefix:source.prefix??''},
      entry:{key:entry.key,displayName:entry.displayName,folder:false,...(entry.contentType?{contentType:entry.contentType}:{})},
      idempotencyKey:crypto.randomUUID()
    };
    await call('confirmJob',{method:'dispatchExplorerSave',params});
    const result=await call('dispatchExplorerSave',params);
    $('#status').textContent=result.state==='completed'
      ?'Verified save completed.'
      :'Cloud save not confirmed: '+(result.code??result.state);
  };
  const renderNode=(item,container)=>{
    const holder=el('div',undefined,{className:'explorer-menu-node'});
    const control=el('button',item.label+(item.children?.length?' ›':''),{type:'button'});
    control.dataset.itemId=item.itemId;control.dataset.actionId=item.actionId??'';
    control.setAttribute('role','menuitem');
    holder.append(control);
    if(item.children?.length){
      const submenu=el('div',undefined,{className:'explorer-context-submenu'});
      submenu.setAttribute('role','menu');submenu.setAttribute('aria-label',item.label);
      control.setAttribute('aria-haspopup','menu');
      control.setAttribute('aria-expanded','false');
      for(const child of item.children)renderNode(child,submenu);
      holder.append(submenu);
      control.addEventListener('pointerenter',()=>control.setAttribute('aria-expanded','true'));
      control.addEventListener('click',()=>{control.setAttribute('aria-expanded',control.getAttribute('aria-expanded')==='true'?'false':'true');});
    }else{
      control.disabled=item.role!=='save'||!item.enabled||!preview.nativeAcknowledged;
      control.title=control.disabled?(!preview.nativeAcknowledged?'Native Chrome menu is not acknowledged':item.reason??'Unavailable'):'Save file to this cloud destination';
      control.addEventListener('click',()=>{
        if(explorerContextMenu?.element!==menu)return;
        dismissExplorerContextMenu();void run(()=>save(item));
      });
    }
    container.append(holder);
  };
  for(const root of preview.roots??[])renderNode(root,menu);
  if(!preview.roots?.length)menu.append(el('span','No configured destinations'));
  if(!preview.nativeAcknowledged)menu.append(el('small','Configure destinations to enable verified saves.'));
  menu.addEventListener('contextmenu',e=>e.preventDefault());
  menu.addEventListener('keydown',e=>{
    const current=e.target.closest('button[role=menuitem]'),node=current?.parentElement;
    const parentMenu=node?.parentElement;
    const peers=parentMenu?[...parentMenu.children].map(h=>h.querySelector(':scope > button[role=menuitem]')).filter(b=>b&&!b.disabled):[];
    const index=peers.indexOf(current);
    if(e.key==='Escape'){e.preventDefault();dismissExplorerContextMenu({restoreFocus:true});return;}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='Home'||e.key==='End'){
      e.preventDefault();
      if(!peers.length)return;
      const next=e.key==='Home'?0:e.key==='End'?peers.length-1:
        (index+(e.key==='ArrowDown'?1:peers.length-1))%peers.length;
      peers[next]?.focus();
    }else if(e.key==='ArrowRight'){
      const child=node?.querySelector(':scope > [role=menu] > .explorer-menu-node > button:not(:disabled)');
      if(child){e.preventDefault();current.setAttribute('aria-expanded','true');child.focus();}
    }else if(e.key==='ArrowLeft'){
      const parent=parentMenu?.parentElement?.querySelector(':scope > button[role=menuitem]');
      if(parent){e.preventDefault();parent.focus();}
    }
  });
  document.body.append(menu);
  menu.style.left=Math.max(8,Math.min(event.clientX,window.innerWidth-menu.offsetWidth-8))+'px';
  menu.style.top=Math.max(8,Math.min(event.clientY,window.innerHeight-menu.offsetHeight-8))+'px';
  explorerContextMenu={element:menu,owner};
  menu.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
}
document.addEventListener('pointerdown',event=>{
  if(explorerContextMenu&&!explorerContextMenu.element.contains(event.target))dismissExplorerContextMenu();
},true);
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&explorerContextMenu)dismissExplorerContextMenu({restoreFocus:true});
},true);
document.addEventListener('scroll',()=>dismissExplorerContextMenu(),true);
window.addEventListener('blur',()=>dismissExplorerContextMenu());

async function refresh(){config=await call('getConfiguration');const h=await call('getEngineHealth');$('#health').textContent=`Revision ${h.revision} · Native ${h.native.nativeApi}`;}
async function commit(change){const p=await call('previewConfigChange',{change,expectedRevision:config.revision});await call('confirmPreview',{previewId:p.previewId});const result=await call('commitConfigChange',{previewId:p.previewId,expectedRevision:p.expectedRevision,idempotencyKey:crypto.randomUUID()});await refresh();$('#status').textContent=`Saved revision ${result.revision} · Chrome: ${result.native.code} · External backup: ${result.backup.state}`;return result;}
function target(source){return {provider:'cloudflare',connectionId:'cloudflare:'+source.accountId,accountId:source.accountId,bucketName:source.bucketName,prefix:source.prefix??''};}
async function render(){await refresh();$('#heading').textContent={remotes:'Remotes',explorer:'File Explorer',settings:'Settings · Recovery Mode'}[view];const root=$('#content');root.replaceChildren();
 if(view==='remotes'){
  const s=await call('connectionStatus');root.append(el('h3','Cloudflare R2'),el('p',s.state),el('code',s.redirectUri));
  root.append(button('Connect Cloudflare',async()=>{const scopes=prompt('Enter the exact scope IDs verified in your existing Cloudflare OAuth registration (space separated).');if(!scopes)return;await call('connectCloudflare',{scopes:scopes.trim().split(/\s+/)});await render();}),button('File Explorer',async()=>{view='explorer';await render();}));
  root.append(el('p','Google Drive, Dropbox, OneDrive and other S3 providers: unsupported in this build.'));
 }else if(view==='explorer'){
  const tools=el('div',undefined,{className:'toolbar'});const add=button('+ Right Click',()=>openEditor());add.disabled=!selected;tools.append(add,button('Manage Destinations',()=>openManager()));root.append(tools);
  const response=await call('listAccounts');if(response.state!=='completed'){root.append(el('p','Connect Cloudflare to list actual accounts.'));return;}accounts=response.data.accounts;
  for(const account of accounts){const b=button(account.name||account.id,async()=>{const r=await call('listAuthorizedBuckets',{accountId:account.id});if(r.state!=='completed')throw Error(r.code??r.error);buckets=r.data.buckets;root.querySelector('#files')?.remove();const files=el('div',undefined,{id:'files'});root.append(files);for(const bucket of buckets)files.append(button(bucket.name,()=>folder({accountId:account.id,bucketName:bucket.name,prefix:''},files)));});root.append(b);}
 }else {
  root.append(button('Open Glaciaring read-only diagnostics',()=>chrome.tabs.create({url:chrome.runtime.getURL('extension/mirror.html')})));
  root.append(el('h3','External recovery'),el('p','Automatic: %LOCALAPPDATA%\\Click2Cloud\\Recovery\\ · Documents: Windows Documents\\Click2Cloud\\Backups\\. Windows companion is not installed in this environment.'));
  const locations=el('fieldset');locations.append(el('legend','Backup Location · Windows companion required'));for(const [value,text] of [['automatic','Automatic (default)'],['documents','Documents']]){const label=el('label',text),radio=el('input',undefined,{type:'radio',name:'backup-location',checked:config.recoveryPolicy.backupLocation===value,disabled:true});label.prepend(radio);locations.append(label);}root.append(locations);
  root.append(button('Choose Existing Backup Folder',async()=>{const handle=await showDirectoryPicker({mode:'readwrite'});await createCurrentStore().saveBackupRoot(handle);await call('attachBackupFolder');$('#status').textContent='External folder authorized. Existing backups are preserved until an explicit edit or restore.';}));
  const cadence=el('select');for(const value of ['weekly','daily'])cadence.append(el('option',value==='weekly'?'Weekly (Monday)':'Daily',{value,selected:config.recoveryPolicy.cadence===value}));root.append(cadence);
  const recoveryToggles={};for(const mode of ['simple','narrow']){const check=el('input',undefined,{type:'checkbox',checked:config.recoveryPolicy[mode]});recoveryToggles[mode]=check;const label=el('label',mode+' Recovery');label.prepend(check);root.append(label);}
  root.append(button('Save Recovery Policy',()=>commit({type:'updateRecoveryPolicy',policy:{...config.recoveryPolicy,cadence:cadence.value,simple:recoveryToggles.simple.checked,narrow:recoveryToggles.narrow.checked}})));
  root.append(button('Restore My Right-Click Menu',async()=>{const p=await call('requestRestorePreview',{recoveryPoint:{},expectedRevision:config.revision});if(confirm('Replace working configuration with this verified backup?')){await call('confirmPreview',{previewId:p.previewId});await call('restoreRightClickMenu',{previewId:p.previewId,expectedRevision:p.expectedRevision,idempotencyKey:crypto.randomUUID()});await render();}}));
  root.append(el('h3','Save Whole Cloud'),el('p','Read-only bucket and key outlines. Requires an authorized external backup folder. Background work runs only while Chrome can schedule it.'));
  const connections=await call('listAccounts'),checks=[];
  if(connections.state==='completed')for(const account of connections.data.accounts){const check=el('input',undefined,{type:'checkbox'}),label=el('label',account.name+' · '+account.id);label.prepend(check);root.append(label);checks.push({check,identity:{provider:'cloudflare',connectionId:'cloudflare:'+account.id,accountId:account.id}});}
  root.append(button('All',()=>checks.forEach(x=>x.check.checked=true)),button('Clear',()=>checks.forEach(x=>x.check.checked=false)),button('Save Whole Cloud',async()=>{for(const x of checks.filter(x=>x.check.checked)){const params={identity:x.identity,cadence:config.recoveryPolicy.cadence};await call('confirmJob',{method:'enableWholeCloudJob',params});await call('enableWholeCloudJob',params);}$('#status').textContent='Selected subscriptions activated. Progress is externally checkpointed; lost authorization pauses quietly.';}));
 }
}
async function folder(source,root){dismissExplorerContextMenu();selected=target(source);root.replaceChildren(el('h3',source.bucketName+'/'+source.prefix));root.append(button('+ Right Click',()=>openEditor()),button('Default Save Selection',()=>commit({type:'setFlatDefault',target:selected})),button('Manage Destinations',()=>openManager()));
 const r=await call('listFolders',{source});if(r.state!=='completed')throw Error(r.code??r.error);for(const entry of r.data.entries){const row=el('div',undefined,{className:'row'});row.append(el('span',(entry.folder?'▣ ':'')+entry.displayName));if(entry.folder){row.append(button('Open',()=>folder({...source,prefix:entry.key},root)));}row.tabIndex=0;row.oncontextmenu=e=>void run(()=>entry.folder?showExplorerContextMenu(e,source,entry,root,row):showExplorerFileMenu(e,source,entry,row));row.addEventListener('keydown',e=>{if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();const bounds=row.getBoundingClientRect();const virtualEvent={preventDefault(){},stopPropagation(){},clientX:bounds.left+20,clientY:bounds.top+20};void run(()=>entry.folder?showExplorerContextMenu(virtualEvent,source,entry,root,row):showExplorerFileMenu(virtualEvent,source,entry,row));}});root.append(row);}}
let draft,tab,title,aliases,depthDraft,editingTarget;
function openEditor(){draft=structuredClone(config.show);tab='simple';title='';aliases=[];editingTarget=structuredClone(selected);depthDraft=structuredClone(config.configs.depth.scopes);renderEditor();$('#editor').showModal();}
function renderEditor(){const tabs=$('#tabs');tabs.replaceChildren();for(const mode of ['simple','narrow','depth'])tabs.append(button(mode[0].toUpperCase()+mode.slice(1),()=>{tab=mode;renderEditor();}));const setup=$('#setup');setup.replaceChildren();
 if(tab==='depth'){for(const bucket of buckets){const t={...editingTarget,bucketName:bucket.name,prefix:''},found=depthDraft.find(s=>s.target.bucketName===bucket.name&&s.target.accountId===t.accountId);const row=el('div',undefined,{className:'row'}),check=el('input',undefined,{type:'checkbox',checked:!!found}),level=el('input',undefined,{type:'number',min:'1',value:found?.maxDepth??10});check.onchange=()=>{depthDraft=depthDraft.filter(s=>s.target.bucketName!==bucket.name||s.target.accountId!==t.accountId);if(check.checked)depthDraft.push({target:t,maxDepth:Number(level.value)});};level.onchange=()=>{const s=depthDraft.find(s=>s.target.bucketName===bucket.name);if(s)s.maxDepth=Number(level.value);};row.append(check,el('span',bucket.name),level);setup.append(row);}}
 else {setup.append(el('code',`${editingTarget.bucketName}/${editingTarget.prefix}`));const input=el('input',undefined,{type:'text',value:title,placeholder:'Optional menu title'});input.oninput=()=>{title=input.value;aliases[editingTarget.prefix.split('/').filter(Boolean).length]=title;};setup.append(el('p','Setup · Menu Title'),input);
 if(tab==='narrow'){setup.append(el('h3','Menu Titles'));const parts=[editingTarget.bucketName,...editingTarget.prefix.split('/').filter(Boolean)];parts.forEach((part,i)=>{const row=el('div',undefined,{className:'row'}),alias=el('input',undefined,{type:'text',value:aliases[i]??''});alias.oninput=()=>{aliases[i]=alias.value;if(i===parts.length-1){title=alias.value;input.value=title;}};row.append(el('span',part),alias);setup.append(row);});}}
 const show=$('#show');show.replaceChildren(el('legend','Show in Chrome'));for(const mode of ['simple','narrow','depth']){const check=el('input',undefined,{type:'checkbox',checked:!draft.flat&&draft[mode]});check.onchange=()=>{if(draft.flat)draft={...config.previousShow,flat:false};draft[mode]=check.checked;renderEditor();};const label=el('label',mode);label.prepend(check);show.append(label);}show.append(button('All',()=>{draft={simple:true,narrow:true,depth:true,flat:false};renderEditor();}),button(draft.flat?'Flat ✓':'Flat',()=>{draft.flat=!draft.flat;renderEditor();}));
}
$('#save').onclick=()=>run(async()=>{
 // A single approved batch is committed atomically by the API.
 const changes=[tab==='depth'?{type:'setDepthDisplayBuckets',scopes:depthDraft}:{type:'createDestination',mode:tab,target:editingTarget,...(title?{label:title}:{}),...(tab==='narrow'?{aliases:Array.from({length:editingTarget.prefix.split('/').filter(Boolean).length+1},(_,i)=>aliases[i]??'')}:{})},{type:'setShowInChrome',show:draft}];
 await commit({type:'batch',changes});$('#editor').close();});
let managerCursor=null,managerEditing=false;
async function openManager(){managerCursor=null;managerEditing=false;await managerList();$('#manager').showModal();}
async function managerList(){managerEditing=false;const mode=$('#filter').value,r=await call('listDestinations',{mode,limit:20,...(managerCursor?{cursor:managerCursor}:{})}),root=$('#destinations');root.replaceChildren();for(const d of r.items){const row=el('div',undefined,{className:'row'});row.append(button(d.label??d.target.bucketName+'/'+d.target.prefix,()=>managerEdit(d)),button('×',async()=>{if(confirm('Remove this menu configuration only?')){await commit({type:'deleteDestinationConfig',mode,id:d.id});managerCursor=null;await managerList();}}));root.append(row);}root.append(button('Previous',()=>{managerCursor=null;return managerList();}));if(r.nextCursor)root.append(button('Next',()=>{managerCursor=r.nextCursor;return managerList();}));}
function managerEdit(d){managerEditing=true;const root=$('#destinations');root.replaceChildren(button('← Back to Destinations',()=>managerList()),el('p',d.target.bucketName+'/'+d.target.prefix));const input=el('input',undefined,{type:'text',value:d.label??''});const aliases=[...(d.aliases??[])];
if($('#filter').value==='narrow'){const parts=[d.target.bucketName,...d.target.prefix.split('/').filter(Boolean)];parts.forEach((part,i)=>{const row=el('div',undefined,{className:'row'}),alias=el('input',undefined,{type:'text',value:aliases[i]??''});alias.oninput=()=>{aliases[i]=alias.value;if(i===parts.length-1)input.value=alias.value;};row.append(el('span',part),alias);root.append(row);});}else root.append(input);
root.append(button('Save',async()=>{await commit({type:'updateDestination',mode:$('#filter').value,id:d.id,label:input.value,...($('#filter').value==='narrow'?{aliases:Array.from({length:d.target.prefix.split('/').filter(Boolean).length+1},(_,i)=>aliases[i]??'')}:{})});await managerList();}));}
$('#filter').onchange=()=>run(()=>{managerCursor=null;return managerList();});$('#close-manager').onclick=()=>$('#manager').close();$('#manager').addEventListener('cancel',e=>{if(managerEditing){e.preventDefault();run(managerList);}});
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>run(async()=>{dismissExplorerContextMenu();view=b.dataset.view;await render();});run(render);
