// Click2Cloud V3+1 presentation-only scaffold.
// Intentionally NO storage, OAuth, Cloudflare network calls or Chrome contextMenus.
// Data below is clearly labeled DEMO; V3+1 engine adapters are not yet connected.

const folders = [
  '', 'Art', 'Art/Photography', 'Art/Illustration',
  'Work', 'Work/Invoices', 'Work/Reports', 'Work/Reports/2026',
  'Projects', 'Projects/Designs', 'Projects/Designs/Screens',
  'Personal', 'Personal/Music', 'Archive',
  'Archive/Photos', 'Archive/Photos/Family'
];
const byId = id => document.getElementById(id);
const state = {
  selectedPath: 'Art/Photography',
  depthEnabled: false,
  depth: 3,
  chromeManageVisible: true, // Demo setting: affects preview only, not native Chrome.
  page: { simple: 1, narrow: 1 },
  pageSize: 3,
  nextId: 10,
  editing: null,
  activeTab: 'setup',
  records: [
    {id:'demo:1',path:'Art/Photography',title:'My Photos',mode:'simple',aliases:{}},
    {id:'demo:2',path:'Work/Invoices',title:'Invoices',mode:'simple',aliases:{}},
    {id:'demo:3',path:'Archive/Photos',title:'Photo Archive',mode:'simple',aliases:{}},
    {id:'demo:4',path:'Projects/Designs',title:'Creative Work',mode:'narrow',aliases:{redown:'redown', 'Projects':'My Projects'}},
    {id:'demo:5',path:'Personal/Music',title:'Sound Library',mode:'narrow',aliases:{redown:'redown','Personal':'Personal'}}
  ]
};

// The manager is a separate ONE-POP-OUT flow: list ↔ editor; never open a second dialog.
const managerState = {
  mode: 'simple', selectedId: null, draft: null,
  pages: {simple:1,narrow:1}, pageSize:20,
  confirmId: null, previousFocus: null
};
const pathParts = path => ['redown', ...(path ? path.split('/') : [])];
const leaf = path => path ? path.split('/').at(-1) : 'redown';
const labelFor = record => record.title.trim() || leaf(record.path);
const actualPath = path => pathParts(path).join(' / ');
const elem = (tag, cls, value) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (value !== undefined) node.textContent = value;
  return node;
};

function renderExplorer() {
  const list = byId('folder-list');
  list.replaceChildren();
  for (const path of folders) {
    const button = elem('button', 'folder-row' + (path === state.selectedPath ? ' selected' : ''));
    button.type = 'button'; button.setAttribute('role','option');
    button.setAttribute('aria-selected',String(path === state.selectedPath));
    const name = elem('span','folder-name');
    const icon = elem('span','folder-icon','▣');icon.setAttribute('aria-hidden','true');
    name.append(icon,elem('span','',leaf(path)));
    const locator = elem('span','folder-location',actualPath(path));
    button.append(name,locator);
    button.addEventListener('click',()=>{state.selectedPath=path;renderExplorer();});
    button.addEventListener('dblclick',()=>openEditor({path}));
    button.addEventListener('contextmenu',event=>{
      event.preventDefault();
      state.selectedPath=path;
      renderExplorer();
      showExplorerContext(event.clientX,event.clientY);
    });
    list.append(button);
  }
  byId('selected-path').textContent = actualPath(state.selectedPath);
}

function openEditor({path,record}={}) {
  const resolvedPath=record ? record.path : (path ?? state.selectedPath);
  state.editing={
    id:record?.id ?? null,
    path:resolvedPath,
    title:record?.title ?? '',
    mode:record?.mode ?? 'simple',
    aliases:{...(record?.aliases ?? {})}
  };
  byId('editor-path').textContent='Cloudflare R2 · '+actualPath(resolvedPath);
  byId('editor-title').textContent=record ? 'Edit Right Click' : '+ Right Click';
  byId('menu-title').value=state.editing.title;
  byId('menu-title').placeholder=leaf(resolvedPath)+' (default)';
  byId('editor-backdrop').hidden=false;
  selectMode(state.editing.mode);
  showTab('setup');
  byId('menu-title').focus();
}

function closeEditor() {
  byId('editor-backdrop').hidden=true;
  state.editing=null;
  byId('add-right-click').focus();
}

function selectMode(mode) {
  if (!state.editing) return;
  state.editing.mode=mode;
  const isNarrow=mode==='narrow';
  byId('choose-simple').classList.toggle('chosen',!isNarrow);
  byId('choose-narrow').classList.toggle('chosen',isNarrow);
  byId('choose-simple').setAttribute('aria-pressed',String(!isNarrow));
  byId('choose-narrow').setAttribute('aria-pressed',String(isNarrow));
  // Important: Simple hides the *entire tab*, never merely disables it.
  byId('titles-tab').hidden=!isNarrow;
  byId('mode-explainer').textContent=isNarrow
    ? 'Branches from the bucket through each selected ancestor folder.'
    : 'One pop-out. This destination is one flat choice without ancestor branches.';
  if (!isNarrow && state.activeTab==='titles') showTab('setup');
  if (isNarrow) renderPathTitles();
}

function showTab(tab) {
  if (!state.editing) return;
  if (tab==='titles' && state.editing.mode!=='narrow') return;
  state.activeTab=tab;
  for (const candidate of ['setup','titles']) {
    const selected=candidate===tab;
    const button=byId(candidate+'-tab');
    button.setAttribute('aria-selected',String(selected));
    button.classList.toggle('active',selected);
    byId(candidate+'-panel').hidden=!selected;
  }
  if (tab==='titles') renderPathTitles();
}

function renderPathTitles() {
  if (!state.editing || state.editing.mode!=='narrow') return;
  const rows=byId('path-titles-rows');rows.replaceChildren();
  const parts=pathParts(state.editing.path);
  for (let i=0;i<parts.length;i++) {
    const part=parts[i];
    const isFinal=i===parts.length-1;
    const pathKey=i===0?'redown':parts.slice(1,i+1).join('/');
    const row=elem('div','titles-row');
    const original=elem('div','original-name');
    original.style.paddingInlineStart=(i*12)+'px';
    original.append(elem('span','folder-glyph','▣'),elem('span','',part));
    const input=elem('input','title-input');
    input.type='text';
    input.maxLength=60;
    input.setAttribute('aria-label','Menu title for actual directory '+part);
    input.placeholder=part;
    input.value=isFinal ? state.editing.title : (state.editing.aliases[pathKey] ?? '');
    input.addEventListener('input',()=>{
      if (!state.editing) return;
      if (isFinal) {
        state.editing.title=input.value;
        byId('menu-title').value=input.value; // same draft value in two tabs
      } else state.editing.aliases[pathKey]=input.value;
    });
    row.append(original,input);rows.append(row);
  }
}

function saveEditor() {
  const draft=state.editing;
  if (!draft) return;
  // Empty Menu Title and ancestor titles are valid. Fallback to real segment.
  const name=labelFor(draft);
  const collision=state.records.find(x=>x.id!==draft.id && x.mode===draft.mode && x.path===draft.path);
  if (collision) {
    toast('This directory already has a '+draft.mode+' destination. Edit its saved row instead.');
    return;
  }
  // Also guard duplicate sibling labels in Simple; never save an ambiguous path.
  if (draft.mode==='simple' && state.records.some(x=>x.id!==draft.id && x.mode==='simple' && labelFor(x)===name)){
    toast('That Simple menu title is already in use. Choose a different title.');
    return;
  }
  const record={
    id:draft.id ?? 'demo:'+(state.nextId++),
    path:draft.path,mode:draft.mode,title:draft.title.trim(),
    aliases:{...draft.aliases}
  };
  const i=state.records.findIndex(x=>x.id===record.id);
  if (i>=0) state.records[i]=record;
  else state.records.push(record);
  state.page[record.mode]=Math.max(1,Math.ceil(state.records.filter(x=>x.mode===record.mode).length/state.pageSize));
  renderSaved();
  renderMenu();
  closeEditor();
  toast('Demo '+(i>=0?'updated':'saved')+': '+name+' · '+record.mode+'. No real Chrome menu changed.');
}

function savedGroup(mode) {
  const section=elem('section','saved-section');
  const title=elem('h4','',mode==='simple'?'Simple':'Narrow');
  const records=state.records.filter(x=>x.mode===mode);
  const pageCount=Math.max(1,Math.ceil(records.length/state.pageSize));
  state.page[mode]=Math.min(state.page[mode],pageCount);
  const page=state.page[mode];
  const count=elem('span','saved-count',records.length+' saved · Demo');
  const head=elem('div','saved-section-head');head.append(title,count);section.append(head);
  const rows=elem('div','saved-rows');
  for (const record of records.slice((page-1)*state.pageSize,page*state.pageSize)){
    const row=elem('button','saved-row');
    row.type='button';
    const primary=elem('span','saved-name',labelFor(record));
    const secondary=elem('span','saved-path',actualPath(record.path));
    const info=elem('span','saved-row-info');info.append(primary,secondary);
    row.append(info,elem('span','saved-arrow','›'));
    row.addEventListener('click',()=>openManager(mode,record.id));
    rows.append(row);
  }
  if (!records.length) rows.append(elem('p','hint','No saved '+mode+' destinations.'));
  section.append(rows);
  const pagination=elem('div','pagination');
  const prev=elem('button','page-button','‹ Previous');
  prev.disabled=page===1;prev.addEventListener('click',()=>{state.page[mode]--;renderSaved();});
  const pageLabel=elem('span','page-current','Page '+page+' of '+pageCount);
  const next=elem('button','page-button','Next ›');
  next.disabled=page===pageCount;next.addEventListener('click',()=>{state.page[mode]++;renderSaved();});
  pagination.append(prev,pageLabel,next);section.append(pagination);
  return section;
}
function renderSaved() {
  const root=byId('saved-groups');root.replaceChildren(savedGroup('simple'),savedGroup('narrow'));
}

function menuRow(container,title,depth=0,accent=false) {
  const row=elem('div','menu-row'+(accent?' accent':''));
  row.style.paddingInlineStart=(12+depth*18)+'px';
  row.append(elem('span','menu-node-icon',accent?'↳':'›'),elem('span','',title));
  container.append(row);
}
function renderSimple(target) {
  const records=state.records.filter(x=>x.mode==='simple');
  menuRow(target,'REDOWN');
  if (records.length===0 && !state.depthEnabled) menuRow(target,'Cloudflare · direct default redown/',1,true);
  else {
    menuRow(target,'Cloudflare ▸',1);
    for (const record of records) menuRow(target,labelFor(record)+' · '+record.path,2,true);
  }
}
function narrowNodes(target,baseDepth=2) {
  const configured=state.records.filter(x=>x.mode==='narrow');
  // Build unique prefix map in first-seen order, preserve per-path aliases.
  const seen=new Set();
  for (const record of configured) {
    const parts=pathParts(record.path);
    for(let i=0;i<parts.length;i++){
      const id=record.path+'|'+i; // displayed preview group, not canonical action identity
      const pathKey=i===0?'redown':parts.slice(1,i+1).join('/');
      const key=pathKey;
      const isLeaf=i===parts.length-1;
      if (!isLeaf && seen.has(key)) continue;
      seen.add(key);
      const label=isLeaf?labelFor(record):(record.aliases[pathKey]||parts[i]);
      menuRow(target,label+(isLeaf?'':' ▸'),baseDepth+i,isLeaf);
    }
  }
  if (!configured.length) menuRow(target,'No saved Narrow destinations',baseDepth);
}
function renderDepthTree(target,baseDepth=3) {
  const eligible=folders.filter(Boolean).filter(path=>path.split('/').length<=state.depth);
  const parents=new Set();
  menuRow(target,'redown ▸',baseDepth);
  for (const path of eligible) {
    const parts=path.split('/');
    const parent=parts.slice(0,-1).join('/');
    if (parent && !parents.has(parent) && !eligible.includes(parent)) continue;
    const hasChildren=eligible.some(p=>p.startsWith(path+'/'));
    menuRow(target,parts.at(-1)+(hasChildren?' ▸':''),baseDepth+parts.length);
    parents.add(path);
  }
}

function renderMenu() {
  const simple=byId('simple-preview');
  simple.replaceChildren();
  renderSimple(simple);
  const narrow=byId('narrow-preview');
  narrow.replaceChildren();
  menuRow(narrow,'REDOWN');menuRow(narrow,'Cloudflare ▸',1);
  narrowNodes(narrow,2);

  const combined=byId('composite-tree');
  combined.replaceChildren();
  menuRow(combined,'REDOWN');
  menuRow(combined,'Cloudflare ▸',1);
  const simples=state.records.filter(x=>x.mode==='simple');
  const narrows=state.records.filter(x=>x.mode==='narrow');
  if(simples.length){menuRow(combined,'Simple choices · '+simples.length,2);for(const r of simples)menuRow(combined,labelFor(r),3,true);}
  if(narrows.length){menuRow(combined,'Narrow branches · '+narrows.length,2);narrowNodes(combined,3);}
  if(state.depthEnabled){menuRow(combined,'Automatic Depth · through level '+state.depth,2);renderDepthTree(combined,3);}
  if(!simples.length&&!narrows.length&&!state.depthEnabled){
    combined.replaceChildren();menuRow(combined,'REDOWN');menuRow(combined,'Cloudflare · direct default redown/',1,true);
  }
  for(const label of ['Google Drive','Dropbox','OneDrive'])menuRow(combined,label,1,true);
  if (state.chromeManageVisible) {
    const manage = elem('button','preview-action','↗ Manage Destinations · demo Chrome shortcut');
    manage.type='button';
    manage.title='Preview of the optional Chrome REDOWN → Manage Destinations entry';
    manage.addEventListener('click',()=>openManager('simple'));
    combined.append(manage);
  }
}

function updateDepth() {
  const on=state.depthEnabled;
  const toggle=byId('depth-toggle');
  toggle.classList.toggle('active',on);
  toggle.setAttribute('aria-pressed',String(on));
  byId('depth-toggle-state').textContent=on?'ON':'OFF';
  byId('depth-detail').hidden=!on;
  byId('depth-number').textContent=String(state.depth);
  byId('depth-range').value=String(state.depth);
  renderMenu();
}
let toastId=0;
function toast(message) {
  const node=byId('toast');node.textContent=message;node.hidden=false;
  const current=++toastId;
  // No timer required for logic or success semantics. Demo only.
  Promise.resolve().then(()=>{if(current===toastId)node.scrollIntoView({block:'nearest'});});
}


function showExplorerContext(x,y) {
  const menu=byId('explorer-context');
  menu.hidden=false;
  menu.style.left=Math.max(8,Math.min(x,window.innerWidth-220))+'px';
  menu.style.top=Math.max(8,Math.min(y,window.innerHeight-100))+'px';
  byId('explorer-context-add').focus();
}
function hideExplorerContext() { byId('explorer-context').hidden=true; }

function openManager(mode='simple',recordId=null) {
  hideExplorerContext();
  // A popup is never stacked above another popup.
  if (!byId('editor-backdrop').hidden) {
    byId('editor-backdrop').hidden=true;
    state.editing=null;
  }
  managerState.previousFocus=document.activeElement;
  managerState.mode=mode==='narrow'?'narrow':'simple';
  managerState.selectedId=null;
  managerState.draft=null;
  managerState.confirmId=null;
  byId('manager-backdrop').hidden=false;
  if (recordId!==null) editManagerRecord(recordId);
  else renderManager();
  byId('manager-close').focus();
}
function closeManager() {
  byId('manager-backdrop').hidden=true;
  managerState.selectedId=null;
  managerState.draft=null;
  managerState.confirmId=null;
  const focus=managerState.previousFocus;
  managerState.previousFocus=null;
  if (focus && focus.isConnected && typeof focus.focus==='function') focus.focus();
  else byId('open-manager-explorer').focus();
}
function backToManager() {
  managerState.selectedId=null;
  managerState.draft=null;
  managerState.confirmId=null;
  renderManager();
  byId('manager-back').hidden=true;
  byId('manager-simple').focus();
}
function switchManagerMode(mode) {
  if (!['simple','narrow'].includes(mode)) return;
  managerState.mode=mode;
  managerState.selectedId=null;
  managerState.draft=null;
  managerState.confirmId=null;
  renderManager();
}
function editManagerRecord(recordId) {
  const record=state.records.find(r=>r.id===recordId);
  if (!record) {toast('This demo destination no longer exists.');renderManager();return;}
  managerState.mode=record.mode;
  managerState.selectedId=recordId;
  managerState.draft={
    id:record.id,mode:record.mode,path:record.path,
    title:record.title,aliases:{...record.aliases}
  };
  managerState.confirmId=null;
  renderManager();
}
function managerListPage(mode) {
  const relevant=state.records.filter(r=>r.mode===mode);
  const totalPages=Math.max(1,Math.ceil(relevant.length/managerState.pageSize));
  managerState.pages[mode]=Math.min(Math.max(1,managerState.pages[mode]),totalPages);
  return {relevant,totalPages,page:managerState.pages[mode]};
}
function renderManager() {
  const mode=managerState.mode;
  const inEdit=managerState.selectedId!==null;
  for (const item of ['simple','narrow']){
    const button=byId('manager-'+item);
    const current=item===mode;
    button.classList.toggle('chosen',current);
    button.setAttribute('aria-pressed',String(current));
  }
  byId('manager-back').hidden=!inEdit;
  byId('manager-list').hidden=inEdit;
  byId('manager-editor').hidden=!inEdit;
  byId('manager-footer').hidden=!inEdit;
  if (inEdit) renderManagerEditor();
  else renderManagerList();
}
function renderManagerList() {
  const mode=managerState.mode;
  const root=byId('manager-list');
  root.replaceChildren();
  const {relevant,page,totalPages}=managerListPage(mode);
  const count=elem('div','manager-list-head');
  count.append(
    elem('strong','',mode==='simple'?'Simple destinations':'Narrow destinations'),
    elem('span','',relevant.length+' saved · 20 per page')
  );
  root.append(count);
  const entries=relevant.slice((page-1)*managerState.pageSize,page*managerState.pageSize);
  if (!entries.length) root.append(elem('p','manager-empty','No saved '+mode+' destinations. Add one from the File Explorer using + Right Click.'));
  for (const record of entries) {
    const row=elem('div','manager-row');
    const open=elem('button','manager-row-open');
    open.type='button';
    open.append(elem('strong','',labelFor(record)),elem('span','',actualPath(record.path)));
    open.setAttribute('aria-label','Edit '+labelFor(record)+' at '+actualPath(record.path));
    open.addEventListener('click',()=>editManagerRecord(record.id));
    const remove=elem('button','row-remove','×');
    remove.type='button';
    remove.title='Remove destination from the right-click menu';
    remove.setAttribute('aria-label','Remove saved menu destination '+labelFor(record));
    remove.addEventListener('click',()=>{managerState.confirmId=record.id;renderManager();});
    row.append(open,remove);
    root.append(row);
    if (managerState.confirmId===record.id) {
      const confirmation=elem('div','manager-confirm');
      confirmation.append(elem('span','', 'Remove “'+labelFor(record)+'” from saved menu destinations? Cloud files remain untouched.'));
      const yes=elem('button','button danger','Remove');
      const no=elem('button','button subtle','Keep');
      yes.type='button';no.type='button';
      yes.addEventListener('click',()=>{
        const index=state.records.findIndex(x=>x.id===record.id);
        if(index>=0)state.records.splice(index,1);
        managerState.confirmId=null;
        renderSaved();renderMenu();renderManager();
        toast('Demo removed '+labelFor(record)+' from the menu; no cloud file was deleted.');
      });
      no.addEventListener('click',()=>{managerState.confirmId=null;renderManager();});
      confirmation.append(yes,no);
      root.append(confirmation);
      no.focus();
    }
  }
  const nav=elem('nav','pagination');
  nav.setAttribute('aria-label',mode+' destinations pages');
  const previous=elem('button','page-button','‹ Previous');
  previous.type='button';previous.disabled=page<=1;
  previous.addEventListener('click',()=>{managerState.pages[mode]--;renderManager();root.scrollTop=0;});
  const indicator=elem('span','page-current','Page '+page+' of '+totalPages);
  const next=elem('button','page-button','Next ›');
  next.type='button';next.disabled=page>=totalPages;
  next.addEventListener('click',()=>{managerState.pages[mode]++;renderManager();root.scrollTop=0;});
  nav.append(previous,indicator,next);root.append(nav);
}
function renderManagerEditor() {
  const draft=managerState.draft;
  const root=byId('manager-editor');
  root.replaceChildren();
  if (!draft) {backToManager();return;}
  const current=elem('div','editor-location','Actual destination: Cloudflare R2 · '+actualPath(draft.path));
  root.append(current);
  const headings=elem('div','manager-grid-head');
  headings.append(elem('span','','ACTUAL DIRECTORY · READ ONLY'),elem('span','','MENU TITLE · EDITABLE'));
  root.append(headings);
  const rows=elem('div','manager-title-rows');
  const pieces=pathParts(draft.path);
  // Simple: ONE row. Narrow: every ancestor and the selected directory.
  const indices=draft.mode==='simple'?[pieces.length-1]:pieces.map((_,i)=>i);
  for (const i of indices) {
    const isFinal=i===pieces.length-1;
    const label=pieces[i];
    const key=i===0?'redown':pieces.slice(1,i+1).join('/');
    const row=elem('div','manager-title-row');
    const left=elem('div','original-name');
    left.append(elem('span','folder-glyph','▣'),elem('span','',label));
    left.title='Original cloud directory name: cannot be edited';
    const input=elem('input','title-input');
    input.type='text';input.maxLength=60;
    input.placeholder=label;
    input.value=isFinal?draft.title:(draft.aliases[key]??'');
    input.setAttribute('aria-label','Editable menu title for original '+label);
    input.addEventListener('input',()=>{
      if(isFinal)draft.title=input.value;
      else draft.aliases[key]=input.value;
    });
    row.append(left,input);rows.append(row);
  }
  root.append(rows);
  const note=elem('p','hint',draft.mode==='simple'
    ? 'Simple: one editable title for one destination. No directory branches.'
    : 'Narrow: each optional title customizes only its matching menu branch; actual cloud folder names remain unchanged.');
  note.style.marginTop='14px';root.append(note);
}
function saveManagerEditor() {
  const draft=managerState.draft;
  if(!draft)return;
  const existing=state.records.find(r=>r.id===draft.id);
  if(!existing){toast('Destination was removed; no changes saved.');backToManager();return;}
  const title=labelFor(draft);
  if(draft.mode==='simple'&&state.records.some(r=>r.id!==draft.id&&r.mode==='simple'&&labelFor(r)===title)){
    toast('This Simple menu title is already used. Choose another.');return;
  }
  existing.title=draft.title.trim();
  existing.aliases={...draft.aliases};
  // Manager mode switch is a FILTER, never a conversion operation.
  renderSaved();renderMenu();backToManager();
  toast('Demo updated '+title+' in place. No new destination, no cloud change.');
}

function wire() {
  byId('add-right-click').addEventListener('click',()=>openEditor({path:state.selectedPath}));
  byId('open-saved').addEventListener('click',()=>openManager('simple'));
  byId('refresh-view').addEventListener('click',()=>openManager('simple'));
  byId('open-manager-explorer').addEventListener('click',()=>openManager('simple'));
  byId('editor-close').addEventListener('click',closeEditor);
  byId('editor-cancel').addEventListener('click',closeEditor);
  byId('editor-backdrop').addEventListener('mousedown',event=>{if(event.target===byId('editor-backdrop'))closeEditor();});
  byId('menu-title').addEventListener('input',event=>{if(state.editing)state.editing.title=event.target.value;});
  byId('choose-simple').addEventListener('click',()=>selectMode('simple'));
  byId('choose-narrow').addEventListener('click',()=>selectMode('narrow'));
  byId('setup-tab').addEventListener('click',()=>showTab('setup'));
  byId('titles-tab').addEventListener('click',()=>showTab('titles'));
  byId('editor-save').addEventListener('click',saveEditor);
  byId('depth-toggle').addEventListener('click',()=>{state.depthEnabled=!state.depthEnabled;updateDepth();});
  byId('depth-range').addEventListener('input',event=>{state.depth=Number(event.target.value);updateDepth();});
  byId('chrome-manage-visible').addEventListener('change',event=>{
    state.chromeManageVisible=event.target.checked;
    renderMenu();
    toast('Demo setting updated. Chrome native context menus are NOT connected in this scaffold.');
  });
  byId('explorer-context-add').addEventListener('click',()=>{hideExplorerContext();openEditor({path:state.selectedPath});});
  byId('explorer-context-manage').addEventListener('click',()=>{hideExplorerContext();openManager('simple');});
  document.addEventListener('click',event=>{
    const menu=byId('explorer-context');
    if(!menu.hidden && !menu.contains(event.target))hideExplorerContext();
  });
  byId('manager-close').addEventListener('click',closeManager);
  byId('manager-back').addEventListener('click',backToManager);
  byId('manager-simple').addEventListener('click',()=>switchManagerMode('simple'));
  byId('manager-narrow').addEventListener('click',()=>switchManagerMode('narrow'));
  byId('manager-save').addEventListener('click',saveManagerEditor);
  byId('manager-backdrop').addEventListener('mousedown',event=>{if(event.target===byId('manager-backdrop'))closeManager();});
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(!byId('manager-backdrop').hidden){
      event.preventDefault();
      if(managerState.selectedId!==null)backToManager();
      else closeManager();
    } else if (!byId('editor-backdrop').hidden){
      event.preventDefault();closeEditor();
    } else if (!byId('explorer-context').hidden){
      event.preventDefault();hideExplorerContext();
    }
  });
}

wire();
renderExplorer();
renderSaved();
updateDepth();
