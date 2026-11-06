import {ancestors,targetKey} from '../src/core/menu-identity.mjs';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const status=s=>{$('#status').textContent=s;};
const names={AUTH_REQUIRED:'Log in to browse this connection.',OAUTH_CANCELLED_OR_UNAVAILABLE:'Sign-in cancelled or unavailable. Retry when ready.',OAUTH_REDIRECT_SETUP_REQUIRED:'Connection setup required. The registered callback does not match this installation.',AUTHORIZED_WORKER_TRANSPORT_UNAVAILABLE:'Saving needs an authenticated Click2Cloud Worker transport. No bytes were uploaded.',EXTERNAL_RECOVERY_UNAVAILABLE:'Choose and authorize an external backup folder first.',REVISION_CONFLICT:'Configuration changed. Refresh and try again.',SCOPE_UNAUTHORIZED:'This account is not authorized.',PROVIDER_READ_FAILED:'The provider could not list this location. Retry Refresh.'};
let state,connection,view='remotes',source=null,entries=[],selected=new Set(),history=[],historyAt=-1,cursor='',loading=false,sort={key:'displayName',direction:1},anchor=0,listingEpoch=0;
let suggestionDue=false;
const treeFolders=new Map(),bucketTargets=[];let previewUrl;
async function api(method,params={}) {
  const result=await chrome.runtime.sendMessage({channel:'engine',version:'3+1.1',method,params});
  if(!result||result.state!=='completed'&&!(result.state==='partial'&&result.data?.configuration)){const err=Object.assign(Error(names[result?.code]??result?.code??'Extension unavailable.'),{code:result?.code});status(err.message);throw err;}
  return result.data;
}
async function refreshState(){state=await api('getConfiguration');document.documentElement.dataset.theme=state.product.theme;return state;}
async function change(changes,{confirmed=false}={}) {
  if(!Array.isArray(changes))changes=[changes];
  if(changes.some(c=>c.type==='deleteDestinationConfig')&&!confirmed)return;
  const r=await api('commitConfigChange',{changes,expectedRevision:state.product.revision,idempotencyKey:crypto.randomUUID()});
  state=r.configuration;document.documentElement.dataset.theme=state.product.theme;
  if(changes.some(c=>['createDestination','updateDestination','deleteDestinationConfig','setProviderPlacement','setShowInChrome'].includes(c.type))){suggestionDue=true;if(view==='explorer')void suggestion();}
  status(r.native?.state==='completed'?'Saved · Chrome menu acknowledged'+(r.backup?.state==='BLOCKED'?' · External backup unavailable':''):'Saved · Native menu pending or incomplete');
  return r;
}
function listen(selector,event,fn){$(selector)?.addEventListener(event,e=>{Promise.resolve(fn(e)).catch(error=>status(error.message));});}
function closeDialog(){if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}$('#dialog').close();}
function dialog(title,body,footer='') {
  hideContext();$('#dialog-content').innerHTML=`<div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2><button id="close-dialog" aria-label="Close">×</button></div><div class="dialog-body">${body}</div>${footer}`;
  listen('#close-dialog','click',closeDialog);if(!$('#dialog').open)$('#dialog').showModal();
}
async function connections() {
  connection=await api('loginStatus');
  $('#connection').innerHTML=`<strong>☁ Cloudflare</strong><p class="muted">${esc(connection.state==='CONNECTED'?'Connected':connection.state==='CONNECTING'?'Signing in…':'Not connected')}</p>${connection.state==='CONNECTED'?'<button id="browse">Open File Explorer</button>':connection.state==='CONNECTING'?'<button id="cancel-login">Cancel sign-in</button>':'<button id="login">Log in</button>'}`;
  listen('#login','click',login);listen('#cancel-login','click',async()=>{await api('loginCancel');await connections();});listen('#browse','click',async()=>{await show('explorer');await loadTree();});
}
async function login() {
  $('#login').disabled=true;status('Complete the provider sign-in to connect Cloudflare.');
  const pending=api('loginBegin');
  // Status reflects the pending attempt; it never initiates scans or navigation.
  setTimeout(()=>void connections().catch(()=>{}),250);
  try{await pending;status('Cloudflare connected.');}catch(error){status(error.message);}finally{await connections();if(view==='remotes')renderRemotes();}
}
function renderRemotes(){
  $('#main').innerHTML=`<section class="page"><h1>Your clouds, one place.</h1><p class="muted">Connect an account, browse its folders, and choose where to save.</p><div class="card"><h2>☁ Cloudflare R2</h2><p>${connection?.state==='CONNECTED'?'Connected. Your folders are ready to browse.':'Use Log in in the navigation pane to connect your account.'}</p><p class="muted">No folders, buckets, or background jobs are created during sign-in.</p>${connection?.state==='CONNECTED'?'<button id="open-explorer" class="primary">Open File Explorer</button>':''}</div><p class="muted">Additional clouds appear when their authenticated adapters are available.</p></section>`;
  listen('#open-explorer','click',async()=>{await show('explorer');await loadTree();});
}
async function loadTree(){
  $('#tree').textContent='Loading accounts…';bucketTargets.length=0;
  try {
    const a=await api('listAccounts');if(a.state!=='completed')throw Error(names[a.code]??a.code??'Unable to list accounts.');
    $('#tree').replaceChildren();
    for(const account of a.data.accounts) {
      const branch=document.createElement('div'),button=document.createElement('button'),children=document.createElement('div');children.className='children';button.textContent='▸ '+account.name;button.setAttribute('role','treeitem');button.setAttribute('aria-expanded','false');branch.append(button,children);$('#tree').append(branch);
      button.onclick=async()=>{if(button.getAttribute('aria-expanded')==='true'){children.hidden=true;button.setAttribute('aria-expanded','false');return;}children.hidden=false;button.setAttribute('aria-expanded','true');if(children.childElementCount)return;
        try{let next='';do {const r=await api('listAuthorizedBuckets',{accountId:account.id,...(next?{cursor:next}:{})});if(r.state!=='completed')throw Error(names[r.code]??r.code??'Bucket listing failed.');for(const b of r.data.buckets){const t={provider:'cloudflare',connectionId:'cloudflare:'+account.id,accountId:account.id,bucketName:b.name,prefix:''};bucketTargets.push(t);treeNode(children,t,b.name);}next=r.data.cursor??'';}while(next);}catch(error){status(error.message);}
      };
    }
  }catch(error){$('#tree').textContent=error.message;}
}
function treeNode(parent,t,label){
  const node=document.createElement('div'),button=document.createElement('button'),children=document.createElement('div');children.className='children';children.hidden=true;button.textContent='▸ 📁 '+label;button.setAttribute('role','treeitem');button.setAttribute('aria-expanded','false');node.append(button,children);parent.append(node);
  button.onclick=async()=>{
    await navigate(t);children.hidden=!children.hidden;button.setAttribute('aria-expanded',String(!children.hidden));
    if(!children.hidden&&!children.childElementCount)for(const f of treeFolders.get(targetKey(t))??[])treeNode(children,{...t,prefix:f.key},f.displayName);
  };
  button.oncontextmenu=e=>{e.preventDefault();contextFor(t,null,e.clientX,e.clientY);};
}
async function show(next){view=next;hideContext();$$('header nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));if(view==='remotes')renderRemotes();if(view==='explorer')renderExplorer();if(view==='settings')await renderSettings();}
function renderExplorer(){
  $('#main').innerHTML=`<div class="toolbar" aria-label="Explorer toolbar"><button id="back" aria-label="Back" ${historyAt<=0?'disabled':''}>←</button><button id="forward" aria-label="Forward" ${historyAt>=history.length-1?'disabled':''}>→</button><button id="up" aria-label="Up" ${!source?.prefix?'disabled':''}>↑</button><button id="refresh" aria-label="Refresh">⟳</button><div class="address" aria-label="Address"></div><select id="view-switch" aria-label="View"><option value="details">Details</option><option value="list">List</option></select><button id="add-location" ${!source?'disabled':''}>+ Right Click</button><button id="destinations">Manage Destinations</button></div><div id="suggestion"></div><div id="files" class="file-scroll ${state.product.view==='list'?'list':''}"></div><div class="toolbar"><span id="item-count" class="muted"></span><button id="more" hidden>Load more</button><label for="upload-file" class="muted">Save local file to a configured destination</label><input id="upload-file" type="file"></div>`;
  $('#view-switch').value=state.product.view;
  listen('#back','click',async()=>{if(historyAt>0)await navigate(history[--historyAt],false);});listen('#forward','click',async()=>{if(historyAt<history.length-1)await navigate(history[++historyAt],false);});
  listen('#up','click',()=>navigate({...source,prefix:ancestors(source.prefix).at(-2)??''}));listen('#refresh','click',()=>source?navigate(source,false):loadTree());
  listen('#view-switch','change',async e=>{await change({type:'setView',view:e.target.value});renderExplorer();});listen('#add-location','click',()=>openPopup(selectedFolder()));listen('#destinations','click',()=>manager());
  listen('#more','click',()=>loadListing(true));listen('#upload-file','change',e=>chooseSave(e.target.files[0]));
  renderAddress();renderFiles();void suggestion();
}
function selectedFolder(){const row=entries.find(e=>selected.has(e.key));return row?.folder?{...source,prefix:row.key}:source;}
function renderAddress(){const el=$('.address');if(!el)return;el.replaceChildren();if(!source){el.textContent='Choose a cloud folder';return;}const paths=['',...ancestors(source.prefix)];for(const p of paths){const b=document.createElement('button');b.textContent=p?p.split('/').at(-2):source.bucketName;b.onclick=()=>navigate({...source,prefix:p}).catch(e=>status(e.message));el.append(b);}}
async function navigate(t,push=true){
  source=structuredClone(t);selected.clear();entries=[];cursor='';
  if(push){history=history.slice(0,historyAt+1);history.push(source);historyAt=history.length-1;}
  if(view!=='explorer')await show('explorer');else renderExplorer();await loadListing();
}
async function loadListing(more=false){
  if(!source)return;const epoch=++listingEpoch,t=structuredClone(source),scroll=$('#main').scrollTop;loading=true;if(!more)renderFiles();
  try{const r=await api('listFolders',{source:t,...(more&&cursor?{cursor}:{})});if(epoch!==listingEpoch)return;if(r.state!=='completed')throw Error(names[r.code]??r.code??'Provider listing unavailable.');entries=more?[...entries,...r.data.entries]:r.data.entries;cursor=r.data.cursor??'';treeFolders.set(targetKey(t),entries.filter(e=>e.folder));status(`${entries.length} items · ${t.bucketName}`);}
  catch(error){if(epoch===listingEpoch){entries=[];$('#files').innerHTML=`<div class="empty">${esc(error.message)}<p>Use Refresh to retry.</p></div>`;}}
  finally{if(epoch===listingEpoch){loading=false;if(entries.length)renderFiles();else if($('#files')?.textContent==='Loading…')renderFiles();$('#more').hidden=!cursor;$('#item-count').textContent=`${entries.length} items${selected.size?' · '+selected.size+' selected':''}`;if(more)$('#main').scrollTop=scroll;}}
}
function ordered(){return [...entries].sort((a,b)=>(Number(b.folder)-Number(a.folder))||sort.direction*String(a[sort.key]??'').localeCompare(String(b[sort.key]??''),undefined,{numeric:true}));}
function renderFiles(){
  const el=$('#files');if(!el)return;
  if(loading){el.innerHTML='<div class="empty">Loading…</div>';return;}
  if(!entries.length){el.innerHTML=`<div class="empty">${source?'This folder is empty.':'Choose an account and bucket in the navigation pane.'}</div>`;return;}
  const rows=ordered();el.innerHTML=`<table role="grid" aria-label="Files" aria-multiselectable="true"><thead><tr>${[['Name','displayName'],['Date Modified','uploaded'],['Type','folder'],['Size','size']].map(([label,k])=>`<th><button data-sort="${k}">${label}</button></th>`).join('')}</tr></thead><tbody>${rows.map((e,i)=>`<tr tabindex="${i===0?'0':'-1'}" data-index="${i}" aria-selected="${selected.has(e.key)}"><td><span class="${e.folder?'folder-icon':'file-icon'}" aria-hidden="true">${e.folder?'📁':'▤'}</span>${esc(e.displayName??e.key)}</td><td>${esc(e.uploaded??e.last_modified??'—')}</td><td>${e.folder?'File folder':esc(e.key.split('.').at(-1)?.toUpperCase()??'File')}</td><td>${e.folder?'':Number.isFinite(Number(e.size))?Number(e.size).toLocaleString()+' B':'—'}</td></tr>`).join('')}</tbody></table>`;
  $$('[data-sort]').forEach(b=>b.onclick=()=>{sort={key:b.dataset.sort,direction:sort.key===b.dataset.sort?-sort.direction:1};renderFiles();});
  $$('tbody tr').forEach(tr=>{const i=Number(tr.dataset.index),e=rows[i];
    tr.onclick=event=>{if(event.shiftKey){for(let j=Math.min(anchor,i);j<=Math.max(anchor,i);j++)selected.add(rows[j].key);}else if(event.ctrlKey||event.metaKey){if(selected.has(e.key))selected.delete(e.key);else selected.add(e.key);anchor=i;}else {selected=new Set([e.key]);anchor=i;}updateSelection();tr.focus();};
    tr.ondblclick=()=>openEntry(e).catch(err=>status(err.message));
    tr.oncontextmenu=event=>{event.preventDefault();selected=new Set([e.key]);updateSelection();contextFor(e.folder?{...source,prefix:e.key}:source,e,event.clientX,event.clientY);};
    tr.onkeydown=event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const n=Math.max(0,Math.min(rows.length-1,i+(event.key==='ArrowDown'?1:-1)));if(!event.shiftKey)selected.clear();selected.add(rows[n].key);updateSelection();$$('tbody tr')[n]?.focus();}else if(event.key==='Enter'){event.preventDefault();void openEntry(e).catch(err=>status(err.message));}else if(event.key==='F10'&&event.shiftKey){event.preventDefault();const r=tr.getBoundingClientRect();contextFor(e.folder?{...source,prefix:e.key}:source,e,r.left+20,r.top+20);}else if(event.key==='Escape'){selected.clear();updateSelection();hideContext();}else if((event.ctrlKey||event.metaKey)&&event.key==='a'){event.preventDefault();selected=new Set(rows.map(e=>e.key));updateSelection();}};
  });
}
function updateSelection(){$$('tbody tr').forEach(tr=>tr.setAttribute('aria-selected',String(selected.has(ordered()[Number(tr.dataset.index)].key))));if($('#item-count'))$('#item-count').textContent=`${entries.length} items · ${selected.size} selected`;}
async function openEntry(e){
  if(e.folder)return navigate({...source,prefix:e.key});
  const r=await api('readFile',{source,entry:{key:e.key,folder:false}});if(r.state!=='completed')throw Error(names[r.code]??r.code??'Preview unavailable.');
  const bytes=new Uint8Array(r.data.bytes),ext=e.key.split('.').at(-1).toLowerCase(),types={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',txt:'text/plain',md:'text/plain',json:'text/plain',csv:'text/plain',log:'text/plain'};
  const type=types[ext]??'application/octet-stream';previewUrl=URL.createObjectURL(new Blob([bytes],{type}));
  dialog(e.displayName,`${type.startsWith('image/')?'<img class="preview" alt="File preview" src="'+esc(previewUrl)+'">':type==='text/plain'?'<pre id="preview-text">'+esc(new TextDecoder().decode(bytes))+'</pre>':'<p>Inline preview unavailable for this type.</p>'}<p><a href="${esc(previewUrl)}" download="${esc(e.displayName)}">Download</a></p>`);
}

function hideContext(){$('#context').hidden=true;$('#context').replaceChildren();}
function contextFor(t,entry,x,y){
  const el=$('#context');el.replaceChildren();const action=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.setAttribute('role','menuitem');b.onclick=()=>{hideContext();Promise.resolve(fn()).catch(e=>status(e.message));};el.append(b);};
  action('Open',()=>entry?openEntry(entry):navigate(t));
  if(!entry||entry.folder){action('+ Right Click',()=>openPopup(structuredClone(t)));action('Make Default',()=>change({type:'makeDefault',target:structuredClone(t)}));action('Manage Destinations',()=>manager());}
  else {const b=document.createElement('button');b.textContent='Save to cloud · transport unavailable';b.disabled=true;el.append(b);}
  el.hidden=false;const r=el.getBoundingClientRect();el.style.left=Math.max(8,Math.min(x,innerWidth-r.width-8))+'px';el.style.top=Math.max(8,Math.min(y,innerHeight-r.height-8))+'px';el.querySelector('button')?.focus();
}
async function chooseRemoteSave(entry){status('Reading a remote source for cross-cloud save is unavailable until a verified transport is connected.');}
async function chooseSave(file){if(!file)return;if(file.size>33554432)throw Error('Select a file no larger than 32 MiB.');const native=await api('inspectNativeACK'),menu=native.desired;if(!menu||native.acknowledgedGeneration!==menu.generation)throw Error('Chrome menu is not acknowledged yet.');const leaves=menu.rows.filter(r=>r.role==='save');dialog('Save to cloud',`<p>${esc(file.name)}</p>${leaves.length?leaves.map((r,i)=>`<button data-save="${i}" ${!r.enabled?'disabled':''}>${esc(r.label)}${!r.enabled?' · '+esc(r.reason):''}</button>`).join(''):'<p>No visible save destinations. Add a folder with + Right Click.</p>'}`);$$('[data-save]').forEach(b=>b.onclick=async()=>{try{if(!confirm('Save this file to '+leaves[b.dataset.save].label+'?'))return;status('Saving…');const bytes=[...new Uint8Array(await file.arrayBuffer())];const r=await api('dispatchSave',{itemId:leaves[b.dataset.save].id,generation:menu.generation,context:'image',source:{filename:file.name,contentType:file.type||'application/octet-stream',bytes},idempotencyKey:crypto.randomUUID()});status(r.confirmed?'Save verified by provider readback.':r.code);closeDialog();}catch(error){status(error.message);}});}
function popupFooter(){return '<div id="level-action"></div><div class="show-controls" id="show-controls"></div><div class="dialog-foot"><button id="cancel">Cancel</button><button id="save" class="primary">Save</button></div>';}
function openPopup(t,existing=null,fromManager=false){
  if(!t)return;const captured=structuredClone(t),revision=state.product.revision;let mode=existing?.mode??'simple',drafts={},display=structuredClone(state.product.show),selectedLevels=new Set(),selectMode=false,lastLevel=0,depthScopes=structuredClone(state.configs.depth.scopes);
  const original=existing?state.configs[mode].destinations.find(d=>d.id===existing.id):null;
  const draft=m=>drafts[m]??=(m===existing?.mode?structuredClone(original):{target:captured,label:'',levels:{}});
  function render(){
    const d=draft(mode),paths=ancestors(captured.prefix);
    const body=`${fromManager?'<button id="back-manager">← Back to Destinations</button>':''}<div class="tabs">${['simple','nested','depth'].map(m=>`<button data-mode="${m}" class="${mode===m?'active':''}" ${existing&&m!==mode?'disabled':''}>${m==='nested'?'Narrow':m[0].toUpperCase()+m.slice(1)}</button>`).join('')}</div><div class="target">${esc(captured.bucketName+'/'+captured.prefix)}</div>${mode==='depth'?`<p class="muted">Display only discovered folders in explicitly enabled buckets.</p>${bucketTargets.length?bucketTargets.map((b,i)=>{const scope=depthScopes.find(s=>s.target.bucketName===b.bucketName&&s.target.accountId===b.accountId);return `<label><input data-bucket="${i}" type="checkbox" ${scope?'checked':''}> ${esc(b.bucketName)} <input data-depth="${i}" aria-label="Display depth for ${esc(b.bucketName)}" type="number" min="1" value="${scope?.maxDepth??10}"></label>`;}).join(''):'<p>Expand authorized accounts to load their buckets first.</p>'}`:`<label>Menu Title <input id="title" value="${esc(d.label??'')}" placeholder="${esc(captured.prefix.split('/').filter(Boolean).at(-1)??captured.bucketName)}"></label>${mode==='nested'?`<div class="between"><h2>Menu Titles</h2><button id="select-mode" aria-pressed="${selectMode}">Select Mode</button></div><div class="tabs"><button id="select-all">Select All</button><button id="clear-levels">Clear</button><span id="selection-count" class="muted">${selectedLevels.size} selected</span></div><div class="title-row muted"><span></span><span>Actual folder</span><span>Menu title</span></div>${paths.map((p,i)=>`<div class="title-row ${selectedLevels.has(p)?'selected':''} ${d.levels?.[p]?.hidden?'hidden-level':''}"><input data-level="${i}" aria-label="Select ${esc(p.split('/').at(-2))}" type="checkbox" ${selectedLevels.has(p)?'checked':''} ${!selectMode?'disabled':''}><span title="${esc(p)}">${esc(p.split('/').at(-2))}</span><input data-alias="${i}" aria-label="Menu title for ${esc(p.split('/').at(-2))}" type="text" value="${esc(d.levels?.[p]?.label??'')}"></div>`).join('')}`:''}`}`;
    dialog(existing?'Edit destination':'+ Right Click',body,popupFooter());
    $('#show-controls').innerHTML=`<span>Show in Chrome</span>${['simple','nested','depth'].map(m=>`<label><input data-show="${m}" type="checkbox" ${display[m]&&!display.flat?'checked':''}> ${m==='nested'?'Narrow':m}</label>`).join('')}<button id="all">All</button><button id="flat" aria-pressed="${display.flat}">Flat</button>`;
    $$('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;selectedLevels.clear();render();});
    listen('#title','input',e=>{d.label=e.target.value;if(mode==='nested'&&paths.length){const last=paths.at(-1);d.levels??={};d.levels[last]={...d.levels[last]};if(d.label)d.levels[last].label=d.label;else delete d.levels[last].label;const input=$(`[data-alias="${paths.length-1}"]`);if(input)input.value=d.label;}});
    $$('[data-alias]').forEach(input=>input.oninput=()=>{const p=paths[Number(input.dataset.alias)];d.levels??={};d.levels[p]={...d.levels[p]};if(input.value)d.levels[p].label=input.value;else delete d.levels[p].label;if(p===paths.at(-1)){d.label=input.value;$('#title').value=input.value;}});
    listen('#select-mode','click',()=>{selectMode=!selectMode;render();});listen('#select-all','click',()=>{selectMode=true;selectedLevels=new Set(paths);render();});listen('#clear-levels','click',()=>{selectedLevels.clear();render();});
    $$('[data-level]').forEach(input=>input.onclick=e=>{const i=Number(input.dataset.level);if(e.shiftKey){for(let j=Math.min(i,lastLevel);j<=Math.max(i,lastLevel);j++)selectedLevels.add(paths[j]);}else if(input.checked)selectedLevels.add(paths[i]);else selectedLevels.delete(paths[i]);lastLevel=i;render();});
    if(mode==='nested'&&selectedLevels.size){const hidden=[...selectedLevels].every(p=>d.levels?.[p]?.hidden);$('#level-action').innerHTML=`<div class="show-controls"><button id="hide-levels" class="${hidden?'':'primary'}">${hidden?'Show':'Hide'} selected</button><span>${selectedLevels.size} selected</span></div>`;listen('#hide-levels','click',()=>{d.levels??={};for(const p of selectedLevels)d.levels[p]={...d.levels[p],hidden:!hidden};render();});}
    $$('[data-show]').forEach(input=>input.onchange=()=>{display.flat=false;display[input.dataset.show]=input.checked;render();});listen('#all','click',()=>{display={simple:true,nested:true,depth:true,flat:false};render();});listen('#flat','click',()=>{display.flat=!display.flat;render();});
    for(const input of $$('[data-bucket], [data-depth]'))input.onchange=()=>{depthScopes=[...depthScopes.filter(s=>!bucketTargets.some(b=>b.accountId===s.target.accountId&&b.bucketName===s.target.bucketName)),...$$('[data-bucket]:checked').map(input=>{const i=Number(input.dataset.bucket);return {target:bucketTargets[i],maxDepth:Number($(`[data-depth="${i}"]`).value)};})];};
    listen('#cancel','click',closeDialog);listen('#back-manager','click',()=>manager(existing.mode));
    listen('#save','click',async()=>{
      if(state.product.revision!==revision)throw Error('Configuration changed. Reopen this editor.');
      const changes=[];
      for(const [m,rec] of Object.entries(drafts).filter(([m])=>m===mode))if(m!=='depth') {
        if(existing)changes.push({type:'updateDestination',mode:m,id:existing.id,label:rec.label??'',...(m==='nested'?{levels:rec.levels??{}}:{})});
        else changes.push({type:'createDestination',mode:m,target:captured,...(rec.label?{label:rec.label}:{}),...(m==='nested'?{levels:rec.levels??{}}:{})});
      }
      if(mode==='depth')changes.push({type:'setDepthDisplayBuckets',scopes:depthScopes});
      changes.push({type:'setShowInChrome',show:display});await change(changes);if(fromManager)await manager(existing.mode);else closeDialog();
    });
  }render();
}
async function manager(filter='simple',page=0){
  const rows=state.configs[filter].destinations,total=rows.length,items=rows.slice(page*20,page*20+20);
  dialog('Destinations',`<div class="between"><div class="tabs"><button id="simple-filter" class="${filter==='simple'?'active':''}">Simple</button><button id="narrow-filter" class="${filter==='nested'?'active':''}">Narrow</button></div><button id="organize" class="circle" aria-label="Organize Right-Click" title="Organize Right-Click">☷</button></div><div id="dest-list">${items.length?items.map((d,i)=>`<div class="dest-row ${d.hidden?'hidden':''}"><strong>${esc(d.label??d.target.prefix.split('/').filter(Boolean).at(-1)??d.target.bucketName)}</strong><div class="muted">${esc(d.target.bucketName+'/'+d.target.prefix)}</div><div class="controls">${filter==='simple'?`<button data-hide="${i}" aria-pressed="${!!d.hidden}">${d.hidden?'Show':'Hide'}</button><button data-quick="${i}" aria-pressed="${!!d.quick}">${d.quick?'Quick ✓':'Quick Select'}</button>`:''}<button data-edit="${i}" aria-label="Edit Menu Title">✎</button><button data-delete="${i}" aria-label="Remove destination configuration">🗑</button></div></div>`).join(''):'<p class="muted">No saved destinations in this filter.</p>'}</div>`,`<div class="dialog-foot"><button id="previous" ${!page?'disabled':''}>Previous</button><span>${total?`${page*20+1}–${Math.min(total,page*20+20)} of ${total}`:'0 destinations'}</span><button id="next" ${(page+1)*20>=total?'disabled':''}>Next</button></div>`);
  const toggle=async(i,key)=>{const d=items[i],scroll=$('.dialog-body').scrollTop;await change({type:'updateDestination',mode:filter,id:d.id,[key]:!d[key]});await manager(filter,page);$('.dialog-body').scrollTop=scroll;};
  $$('[data-hide]').forEach(b=>b.onclick=()=>toggle(Number(b.dataset.hide),'hidden').catch(e=>status(e.message)));$$('[data-quick]').forEach(b=>b.onclick=()=>toggle(Number(b.dataset.quick),'quick').catch(e=>status(e.message)));
  $$('[data-edit]').forEach(b=>b.onclick=()=>{const d=items[b.dataset.edit];openPopup(d.target,{id:d.id,mode:filter},true);});
  $$('[data-delete]').forEach(b=>b.onclick=async()=>{const d=items[b.dataset.delete];if(confirm('Remove this saved destination? Cloud files and folders are kept.')){try{await change({type:'deleteDestinationConfig',mode:filter,id:d.id},{confirmed:true});await manager(filter,Math.min(page,Math.max(0,Math.ceil((total-1)/20)-1)));}catch(error){status(error.message);}}});
  listen('#simple-filter','click',()=>manager('simple'));listen('#narrow-filter','click',()=>manager('nested'));listen('#previous','click',()=>manager(filter,page-1));listen('#next','click',()=>manager(filter,page+1));listen('#organize','click',organize);
}
async function organize(){
  const spec=await api('previewNativeMenu'),providers=[...new Set(spec.rows.filter(r=>r.origin?.provider).map(r=>r.origin.provider))],placement={...state.product.placement};
  dialog('Organize Right-Click',`<p class="muted">Quick Select stays first. Choose where each provider appears inside Chrome’s extension grouping.</p>${providers.map((p,i)=>`<div class="settings-row"><span>${esc(p==='cloudflare'?'Cloudflare':p)}</span><button data-placement="${i}">${placement[p]==='other'?'Under REDOWN':'Keep Direct'}</button></div>`).join('')||'<p>No configured providers yet.</p>'}<p id="layout-preview" class="muted"></p>`,`<div class="dialog-foot"><button id="cancel">Cancel</button><button id="save" class="primary">Save</button></div>`);
  const preview=()=>{$('#layout-preview').textContent='Quick Select → '+providers.filter(p=>placement[p]!=='other').join(', ')+(providers.some(p=>placement[p]==='other')?' → Other Clouds: '+providers.filter(p=>placement[p]==='other').join(', '):'');};preview();
  $$('[data-placement]').forEach(b=>b.onclick=()=>{const p=providers[b.dataset.placement];placement[p]=placement[p]==='other'?'direct':'other';b.textContent=placement[p]==='other'?'Under REDOWN':'Keep Direct';preview();});listen('#cancel','click',closeDialog);listen('#save','click',async()=>{if(providers.length)await change(providers.map(p=>({type:'setProviderPlacement',provider:p,placement:placement[p]??'direct'})));closeDialog();await suggestion();});
}
async function suggestion(){if(!$('#suggestion')||!suggestionDue)return;try{const s=await api('getOrganizationSuggestion');if(!s.eligible){$('#suggestion').replaceChildren();$('#suggestion').className='';return;}$('#suggestion').innerHTML='<span>Many direct entries. Organize your right-click menu?</span><button id="suggest-organize">Organize</button><button id="dismiss-suggestion" aria-label="Dismiss organization suggestion">×</button>';$('#suggestion').className='suggestion';listen('#suggest-organize','click',organize);listen('#dismiss-suggestion','click',async()=>{await change({type:'dismissOrganizationSuggestion',signature:s.signature});$('#suggestion').replaceChildren();$('#suggestion').className='';});}catch{}}
async function renderSettings(){
  const recovery=await api('inspectBackupRoots'),policy=state.product.recovery;
  $('#main').innerHTML=`<section class="page"><h1>Settings</h1><div class="card"><h2>Appearance</h2><div class="settings-row"><label for="setting-theme">Theme</label><select id="setting-theme"><option value="dark">Dark</option><option value="light">Light</option></select></div></div><div class="card"><h2>Favorite Cloud</h2><p class="muted">A personal marker for future use. It does not change saves or menus.</p>${(connection?.accounts??[]).map((a,i)=>`<label><input type="checkbox" data-favorite="${i}" ${state.product.favorites.includes('cloudflare:'+a.id)?'checked':''}> ${esc(a.name)}</label>`).join('')||'<p class="muted">Connect an account to mark a favorite.</p>'}</div><div class="card"><h2>Recovery Mode</h2><p class="muted">External storage: ${esc(recovery.state)}. Automatic Windows known-folder storage requires a native companion.</p><label>Cadence <select id="cadence"><option value="weekly">Weekly · Monday</option><option value="daily">Daily</option></select></label><label><input type="checkbox" id="simple-recovery" ${policy.simple?'checked':''}> Simple Recovery</label><label><input type="checkbox" id="narrow-recovery" ${policy.nested?'checked':''}> Narrow Recovery</label><details><summary>Bucket recovery crawl</summary><p class="muted">Recovery depth is independent of Chrome display depth. Expand accounts in File Explorer to discover buckets.</p>${bucketTargets.map((b,i)=>{const policy=state.product.recovery.buckets.find(p=>p.target.accountId===b.accountId&&p.target.bucketName===b.bucketName);return `<label><input data-recovery="${i}" type="checkbox" ${policy?.enabled?'checked':''}> ${esc(b.bucketName)} <input type="number" min="1" data-crawl-depth="${i}" aria-label="Recovery depth for ${esc(b.bucketName)}" value="${policy?.depth??10}"></label>`;}).join('')}</details><label>Windows Backup Location <select id="backup-location"><option value="automatic">Automatic · Local AppData</option><option value="documents">Documents</option></select></label><p class="muted">Windows locations are unavailable without a native companion. A user-authorized external folder can be attached separately.</p><button id="choose-backup">Choose external backup folder</button><button id="backup-now">Back up now</button><button id="restore">Restore My Right-Click Menu</button></div><div class="card"><h2>Save Whole Cloud</h2><p class="muted">Read-only bucket/key outline. Starts only when explicitly enabled and external storage is authorized. Lost authorization quietly pauses the job.</p>${(connection?.accounts??[]).map((a,i)=>`<label><input type="checkbox" data-whole="${i}"> Cloudflare · ${esc(a.name)}</label>`).join('')||'<p class="muted">No connected supported accounts.</p>'}<button id="enable-whole">Enable selected accounts</button><button id="stop-whole">Stop selected accounts</button><button id="whole-status">Inspect jobs</button><pre id="jobs"></pre></div><div class="card"><h2>Connection</h2><p class="muted">${esc(connection?.redirectUri??'')}</p><button id="disconnect" ${connection?.state!=='CONNECTED'?'disabled':''}>Disconnect Cloudflare</button></div><div class="card"><h2>Programmatic access</h2><p class="muted">The V3+1 API powers these controls. Agent execution requires a separate local grant scoped to methods, accounts, and expiry. No public endpoint or active MCP connection.</p><button id="capabilities">Inspect API capabilities</button><pre id="api-info"></pre></div></section>`;
  $('#setting-theme').value=state.product.theme;$('#cadence').value=policy.cadence;$('#backup-location').value=policy.location;
  listen('#setting-theme','change',e=>change({type:'setTheme',theme:e.target.value}));
  $$('[data-favorite]').forEach(input=>input.onchange=()=>change({type:'setFavorite',connectionId:'cloudflare:'+connection.accounts[input.dataset.favorite].id,favorite:input.checked}).catch(e=>status(e.message)));
  for(const id of ['cadence','simple-recovery','narrow-recovery','backup-location'])listen('#'+id,'change',()=>change({type:'updateRecoveryPolicy',policy:{...state.product.recovery,cadence:$('#cadence').value,simple:$('#simple-recovery').checked,nested:$('#narrow-recovery').checked,location:$('#backup-location').value}}));
  for(const input of $$('[data-recovery], [data-crawl-depth]'))input.onchange=()=>change({type:'updateRecoveryPolicy',policy:{...state.product.recovery,buckets:[...state.product.recovery.buckets.filter(s=>!bucketTargets.some(b=>b.accountId===s.target.accountId&&b.bucketName===s.target.bucketName)),...bucketTargets.map((b,i)=>({target:b,enabled:$(`[data-recovery="${i}"]`).checked,depth:Number($(`[data-crawl-depth="${i}"]`).value)}))]}}).catch(e=>status(e.message));
  listen('#choose-backup','click',async()=>{
    if(!window.showDirectoryPicker)throw Error('External folder selection is unavailable in this browser.');
    const h=await window.showDirectoryPicker({mode:'readwrite',id:'click2cloud-recovery'});
    const {createCurrentStore}=await import('../src/persistence/current-store.mjs');const local=createCurrentStore();try{await local.stageBackupRoot(h);await api('chooseBackupLocation');status('External folder attached and verified.');}finally{await local.close();}await renderSettings();
  });
  listen('#backup-now','click',async()=>{const r=await api('writeRecovery');status('Backup '+r.state+' · external filesystem readback');});
  listen('#restore','click',async()=>{const r=await api('requestRestorePreview');dialog('Restore My Right-Click Menu',`<p>Restore saved destinations, titles and settings from verified external CURRENT/journals. Cloud files are not changed.</p><p>${r.configs.simple.destinations.length} Simple · ${r.configs.nested.destinations.length} Narrow destinations</p>`,`<div class="dialog-foot"><button id="cancel">Cancel</button><button id="restore-confirm" class="primary">Restore</button></div>`);listen('#cancel','click',closeDialog);listen('#restore-confirm','click',async()=>{await api('restoreRightClickMenu',{expectedRevision:state.product.revision,idempotencyKey:crypto.randomUUID()});await refreshState();closeDialog();await renderSettings();status('Restored configuration · verify native ACK and reconnect the original account before saving.');});});
  const selectedClouds=()=>$$('[data-whole]:checked').map(input=>{const a=connection.accounts[input.dataset.whole];return {provider:'cloudflare',connectionId:'cloudflare:'+a.id,accountId:a.id};});
  listen('#enable-whole','click',async()=>{const ids=selectedClouds();if(!ids.length)throw Error('Select at least one account.');if(!confirm('Enable continuous read-only outlines for these accounts?'))return;for(const identity of ids)await api('enableWholeCloudJob',{identity,cadence:state.product.recovery.cadence});status('Whole Cloud enabled for selected accounts.');});
  listen('#stop-whole','click',async()=>{for(const identity of selectedClouds())await api('disableWholeCloudJob',{identity});status('Selected jobs stopped.');});
  listen('#whole-status','click',async()=>{$('#jobs').textContent=JSON.stringify(await api('inspectWholeCloudJobs'),null,2);});listen('#disconnect','click',async()=>{await api('disconnect');await connections();await renderSettings();status('Cloudflare disconnected. Saved destinations remain.');});
  listen('#capabilities','click',async()=>{const c=await api('describeCapabilities');$('#api-info').textContent=JSON.stringify({version:c.version,tools:c.tools.map(t=>({name:t.name,scope:t.scope})),publicEndpoint:c.publicEndpoint},null,2);});
}
$$('[data-view]').forEach(b=>b.onclick=()=>show(b.dataset.view).catch(e=>status(e.message)));listen('#manage','click',()=>manager());listen('#theme','click',async()=>{await change({type:'setTheme',theme:state.product.theme==='dark'?'light':'dark'});if(view==='settings')await renderSettings();});
document.addEventListener('pointerdown',e=>{if(!$('#context').contains(e.target))hideContext();});document.addEventListener('keydown',e=>{if(e.key==='Escape')hideContext();if(!$('#context').hidden&&['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const items=[...$('#context').querySelectorAll('button')],i=items.indexOf(document.activeElement);items[(i+(e.key==='ArrowDown'?1:items.length-1))%items.length]?.focus();}});
$('#dialog').addEventListener('cancel',()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);});
await refreshState();await connections();await show('remotes');$$('header button, footer button').forEach(b=>b.disabled=false);status('Ready · Connect an account to browse real folders.');
