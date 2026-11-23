const appPath='extension/app.html';
const isShelfPath=path=>typeof path==='string'&&path.split('#')[0].replace(/^\//,'')===appPath;
function sidePanelOpenCode(error){
 const message=error?.message??'';
 if(/user gesture|user activation/i.test(message))return 'SIDE_PANEL_GESTURE_REQUIRED';
 if(/no active side panel/i.test(message))return 'SIDE_PANEL_DISABLED';
 if(/no (?:browser )?window (?:with id|for windowId)|no tab with id|does not belong to the specified window/i.test(message))return 'SIDE_PANEL_WINDOW_UNAVAILABLE';
 if(/not.*available|not supported/i.test(message))return 'SIDE_PANEL_UNAVAILABLE';
 return 'SIDE_PANEL_OPEN_FAILED';
}

// One Chrome Shelf attention adapter. It never starts OAuth or changes cloud state.
export function createShelfAttention({chrome,preference=()=>true,notify=async()=>{},onOpened=()=>false}={}){
 let serial=0,last=null;const gestures=new WeakMap();
 // Chrome 141+ reports actual panel opening, unlike ordinary focus/OAuth returns.
 chrome.sidePanel?.onOpened?.addListener(info=>{if(!Number.isInteger(info.windowId)||!isShelfPath(info.path)||onOpened(info))return;try{void chrome.runtime.sendMessage({channel:'shelf-opened',windowId:info.windowId}).catch(()=>{});}catch{}});
 const providers=['cloudflare','google-drive','dropbox','onedrive'];
 const safeError=e=>/user gesture/i.test(e?.message??'')?'SIDE_PANEL_GESTURE_REQUIRED':/not.*available|undefined|not supported/i.test(e?.message??'')?'SIDE_PANEL_UNAVAILABLE':'SIDE_PANEL_OPEN_FAILED';
 function open(tabId,windowId){try{if(!chrome.sidePanel?.open)return Promise.resolve({state:'blocked',code:'SIDE_PANEL_UNAVAILABLE',operation:'sidePanel.open'});return Promise.resolve(chrome.sidePanel.open(Number.isInteger(tabId)?{tabId}:{windowId})).then(()=>({state:'opened',operation:'sidePanel.open'}),e=>({state:'blocked',code:safeError(e),operation:'sidePanel.open'}));}catch(e){return Promise.resolve({state:'blocked',code:safeError(e),operation:'sidePanel.open'});}}
 function gesture(info,tab,{provider,needsAttention=false,enabled=false}={}){
  const context={id:++serial,provider,tabId:tab?.id,windowId:tab?.windowId,opening:null};gestures.set(info,context);
  // Called in the native listener before its first await. Unknown READY state
  // never opens UI speculatively; later refusal is reported without a popup.
  if(enabled&&needsAttention&&preference()===true)context.opening=open(context.tabId,context.windowId);return context;
 }
 async function attend(provider='cloudflare',target,{code='LOGIN_REQUIRED',context}={}){
  const view=provider==='manage-destinations'?'manage-destinations':'provider';if(view==='manage-destinations')provider='cloudflare';if(!providers.includes(provider))throw Error('PROVIDER_ACTION_INVALID');
  const id=context?.id??++serial;if(id<serial&&context)return {state:'superseded'};serial=Math.max(serial,id);
  const request={provider,view,code,...(target?{target}:{}),opening:{state:'not-requested'}};last=request;await chrome.storage.session.set({shelfAttention:request});
  let outcome;
  if(preference()!==true){outcome={state:'badge-only',code:'AUTO_ATTENTION_DISABLED'};await notify(provider,code);}
  else {if(context?.opening)outcome=await context.opening;else{let windowId=context?.windowId;if(!Number.isInteger(windowId)){try{windowId=(await chrome.windows.getLastFocused()).id;}catch{}}outcome=await open(context?.tabId,windowId);}if(outcome.state!=='opened')await notify(provider,code);}
  if(id!==serial)return {state:'superseded'};last={...request,opening:outcome};await chrome.storage.session.set({shelfAttention:last});try{await chrome.runtime.sendMessage({channel:'shelf-attention'});}catch{}return outcome;
 }
 return Object.freeze({gesture,context:info=>gestures.get(info),attend,read:async()=>last??(await chrome.storage.session.get('shelfAttention')).shelfAttention??null,manual(tab){const outcome=open(tab?.id,tab?.windowId);void outcome.then(r=>{if(r.state!=='opened')void notify('cloudflare','SHELF_OPEN_FAILED');});return outcome;}});
}

export const shelfHistoryCommand='shelf.history.toggle';
export const shelfExplorerSearchCommand='shelf.explorer.search';
const shelfStateKey=windowId=>'shelf-view:'+windowId;
const views=new Set(['remotes','explorer','history','settings','screenshot','downloads']);

export function createShelfHistoryToggle({chrome,feedback=()=>{},observeShortcut=()=>{}}){
 const windows=new Map(),early=new Map(),panel=chrome.sidePanel,session=chrome.storage.session;
 const trace=(identity,phase,outcome,details)=>{if(identity)observeShortcut(identity,phase,outcome,details);};
 function fail(identity,id,code,error){
  trace(identity,'FAILED','failed',{code,chromeMessage:error?.message});
  if(identity)feedback(id,code,identity);else feedback(id,code);
 }
 let restored=false;
 const windowState=id=>{
  if(!windows.has(id))windows.set(id,{open:false,view:'remotes',intent:null,sequence:0,opening:null});
  return windows.get(id);
 };
 const ready=Promise.resolve().then(()=>session.get(null)).then(saved=>{
  for(const [key,value] of Object.entries(saved)){
   if(!key.startsWith(shelfStateKey(''))||!views.has(value?.view))continue;
   const id=Number(key.slice(shelfStateKey('').length));
   if(!Number.isInteger(id)||windows.has(id))continue;
   windows.set(id,{open:value.open===true,view:value.view,intent:['history','search','close'].includes(value.intent)?value.intent:null,
    sequence:Number.isSafeInteger(value.sequence)?value.sequence:0,opening:null,identity:value.identity});
  }
 }).catch(()=>{}).finally(()=>{restored=true;});
 function persist(id,state){
  const {identity}=state;
  return session.set({[shelfStateKey(id)]:{open:state.open,view:state.view,intent:state.intent,sequence:state.sequence,
   ...(identity?{identity}:{})}}).catch(()=>{
   trace(identity,'ACTION_DISPATCHED','pending',{code:'SHELF_INTENT_STORAGE_UNAVAILABLE'});
  });
 }
 function open(id){
  try{return panel.open({windowId:id});}
  catch(error){return Promise.reject(error);}
 }
 const viewState=state=>({open:state.open,view:state.view,intent:state.intent,identity:state.identity});
 const beginOpen=(id,state)=>({promise:open(id),previous:viewState(state)});
 function showIntent(id,state,opening,intent,identity){
  const sequence=++state.sequence;
  trace(state.identity,'SUPERSEDED','interrupted');
  state.open=true;state.view=intent==='search'?'explorer':'history';state.intent=intent;state.opening=opening;state.identity=identity;
  const channel=intent==='search'?'shelf-explorer-search':'shelf-history-show';
  const stored=persist(id,state);
  const announce=()=>void stored.then(async()=>{
   if(sequence!==state.sequence)return;
   trace(identity,'ACTION_DISPATCHED','started');
   try{await chrome.runtime.sendMessage({channel,windowId:id,sequence});}
   catch(error){trace(identity,'ACTION_DISPATCHED','pending',{code:'SHELF_MESSAGE_UNACKNOWLEDGED',chromeMessage:error?.message});}
  });
  if(!opening){announce();return;}
  void opening.promise.then(()=>{
   if(state.opening===opening)state.opening=null;
   announce();
  },error=>{
   if(state.opening===opening)state.opening=null;
   if(state.sequence!==sequence)return;
   Object.assign(state,opening.previous);
   void persist(id,state);fail(identity,id,sidePanelOpenCode(error),error);
  });
 }
 function closeHistory(id,state,identity){
  if(!panel.close||!panel.onClosed){fail(identity,id,'SHELF_CLOSE_UNAVAILABLE');return;}
  const sequence=++state.sequence;
  const opening=state.opening;
  trace(state.identity,'SUPERSEDED','interrupted');
  state.open=false;state.intent='close';state.view='remotes';state.identity=identity;
  void persist(id,state);
  // A second key while Chrome is opening the document is still a close.
  void Promise.resolve(opening?.promise).then(()=>true,()=>opening.previous.open).then(async shouldClose=>{
   if(state.sequence!==sequence)return;
   if(state.opening===opening)state.opening=null;
   if(!shouldClose){state.intent=null;state.identity=null;void persist(id,state);fail(identity,id,'SHELF_OPEN_NOT_CONFIRMED');return;}
   trace(identity,'UI_READY','ok');
   trace(identity,'ACTION_DISPATCHED','started');
   try{await panel.close({windowId:id});trace(identity,'ACTION_ACKNOWLEDGED','ok');}
   catch(error){
    if(state.sequence!==sequence)return;
    state.open=true;state.view='history';state.intent=null;state.identity=null;
    void persist(id,state);fail(identity,id,'SHELF_CLOSE_FAILED',error);
   }
  });
 }
 function regularCommand(id,intent,identity){
  const state=windowState(id);
  if(intent==='search'){
   if(state.intent==='search'&&state.opening){trace(identity,'SUPERSEDED','interrupted');return;}
   showIntent(id,state,state.opening??beginOpen(id,state),intent,identity);return;
  }
  if(state.open&&state.view==='history'){closeHistory(id,state,identity);return;}
  // Invoke Chrome before the gesture is lost to any storage or runtime IO.
  showIntent(id,state,state.opening??(state.open?null:beginOpen(id,state)),'history',identity);
 }
 function command(tab,intent='history',identity,resolving=false){
  const id=tab?.windowId;
  if(!resolving)trace(identity,'HANDLER_ENTERED','ok');
  if(!panel?.open){fail(identity,id,'SIDE_PANEL_UNAVAILABLE');return;}
  if(!Number.isInteger(id)||id<0){
   // Chrome restores the command gesture inside its API callback. A Promise
   // continuation runs after that scope ends and cannot open the panel.
   try{chrome.windows.getLastFocused({windowTypes:['normal']},window=>{
    const error=chrome.runtime.lastError;
    if(!error&&window?.focused===true&&Number.isInteger(window.id)&&window.id>=0)command({windowId:window.id},intent,identity,true);
    else fail(identity,id,'SIDE_PANEL_WINDOW_UNAVAILABLE',error);
   });}catch(error){fail(identity,id,'SIDE_PANEL_WINDOW_UNAVAILABLE',error);}
   return;
  }
  trace(identity,'UI_TARGET_RESOLVED','ok');
  if(restored||windows.has(id)){regularCommand(id,intent,identity);return;}
  // Chrome can wake the background with the key event. Keep the gesture
  // while the prior panel state is coming back from chrome.storage.session.
  const pending=early.get(id);
  if(pending){
   trace(pending.identity,'SUPERSEDED','interrupted');pending.identity=identity;
   if(intent==='search'){pending.intent='search';pending.presses=0;pending.afterSearch=true;}
   else{pending.intent='history';pending.presses++;}
   return;
  }
  const opening=open(id),queued={opening,intent,identity,presses:intent==='history'?1:0,afterSearch:intent==='search'};
  opening.catch(()=>{});early.set(id,queued);
  void ready.then(()=>{
   if(early.get(id)!==queued)return;
   early.delete(id);
   const state=windowState(id);
   const attempt={promise:opening,previous:viewState(state)};
   if(queued.intent==='search'){showIntent(id,state,attempt,'search',queued.identity);return;}
   const endedOnHistory=(!queued.afterSearch&&state.open&&state.view==='history')!==(queued.presses%2===1);
   if(endedOnHistory)showIntent(id,state,attempt,'history',queued.identity);
   else{state.opening=attempt;closeHistory(id,state,queued.identity);}
  });
 }
 function opened(info){
  if(!isShelfPath(info.path)||!Number.isInteger(info.windowId))return false;
  const id=info.windowId;
  if(early.has(id))return true;
  const state=windowState(id);
  if(state.intent||state.opening)return true;
  state.open=true;state.view='remotes';void persist(id,state);
  return false;
 }
 panel?.onClosed?.addListener(info=>{
  if(!isShelfPath(info.path)||!Number.isInteger(info.windowId))return;
  const id=info.windowId,state=windowState(id);
  // A newer open can already be in progress while Chrome delivers the close.
  if(['history','search'].includes(state.intent)&&state.opening)return;
  if(state.intent==='close')trace(state.identity,'UI_STATE_VERIFIED','ok');
  else trace(state.identity,'SUPERSEDED','interrupted');
  state.open=false;state.view='remotes';state.intent=null;state.identity=null;
  void persist(id,state);
 });
 chrome.windows?.onRemoved?.addListener(id=>{
  windows.delete(id);early.delete(id);void session.remove(shelfStateKey(id)).catch(()=>{});
 });
 async function request(method,id,view,sender,sequence){
  if(!Number.isInteger(id))return null;
  let contexts;
  try{contexts=await chrome.runtime.getContexts?.({contextTypes:['SIDE_PANEL'],documentUrls:[chrome.runtime.getURL(appPath)]})??[];}
  catch(error){
   await ready;
   trace(windows.get(id)?.identity,'UI_READY','pending',{code:'SHELF_CONTEXT_UNAVAILABLE',chromeMessage:error?.message});
   return null;
  }
  // A global SIDE_PANEL can have neither a window ID nor sender document
  // metadata. A regular app.html tab always supplies sender.tab.
  const ownPanel=contexts.some(context=>(context.windowId===id||context.windowId===-1)&&
   (sender.documentId?sender.documentId===context.documentId:!sender.tab));
  if(!ownPanel)return null;
  await ready;
  const state=windowState(id);
  if(method==='intent'){
   if(['search','history'].includes(state.intent))trace(state.identity,'UI_READY','ok');
   return state.intent==='search'?{view:'explorer',focusSearch:true,sequence:state.sequence}:
    state.intent==='history'?{view:'history',...(state.identity?{sequence:state.sequence}:{})}:null;
  }
  if(state.sequence===sequence){
   if(method==='search-focus-pending'&&state.intent==='search')trace(state.identity,'UI_STATE_VERIFIED','pending',{code:'SHELF_KEYBOARD_FOCUS_PENDING'});
   if(method==='action-failed'&&['search','history'].includes(state.intent)){
    trace(state.identity,'FAILED','failed',{code:'SHELF_ACTION_UNCONFIRMED'});
    state.intent=null;state.identity=null;await persist(id,state);
   }
   if(method==='search-complete'&&state.intent==='search'||method==='history-complete'&&state.intent==='history'){
    trace(state.identity,'ACTION_ACKNOWLEDGED','ok');
    trace(state.identity,'UI_STATE_VERIFIED','ok');
    state.intent=null;state.identity=null;await persist(id,state);
   }
  }
  if(method==='search-cancel'&&state.intent==='search'&&state.sequence===sequence){
   trace(state.identity,'SUPERSEDED','interrupted');state.intent=null;state.identity=null;await persist(id,state);
  }
  if(method==='view'&&state.open&&views.has(view)&&state.intent!=='search'&&!(state.identity&&state.intent==='history'&&view==='history')){
   trace(state.identity,'SUPERSEDED','interrupted');
   state.view=view;state.intent=null;state.identity=null;await persist(id,state);
  }
  return null;
 }
 return {command,search:(tab,identity)=>command(tab,'search',identity),opened,request};
}
