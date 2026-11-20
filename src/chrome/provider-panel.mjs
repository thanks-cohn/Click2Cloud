// One Chrome Shelf attention adapter. It never starts OAuth or changes cloud state.
export function createShelfAttention({chrome,preference=()=>true,notify=async()=>{},onOpened=()=>false}={}){
 let serial=0,last=null;const gestures=new WeakMap();
 // Chrome 141+ reports actual panel opening, unlike ordinary focus/OAuth returns.
 chrome.sidePanel?.onOpened?.addListener(info=>{if(!Number.isInteger(info.windowId)||info.path?.split('#')[0]!=='extension/app.html'||onOpened(info))return;try{void chrome.runtime.sendMessage({channel:'shelf-opened',windowId:info.windowId}).catch(()=>{});}catch{}});
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
const appPath='extension/app.html';
const shelfStateKey=windowId=>'shelf-view:'+windowId;
const views=new Set(['remotes','explorer','history','settings','screenshot','downloads']);

export function createShelfHistoryToggle({chrome,feedback=()=>{}}){
 const windows=new Map(),early=new Map(),panel=chrome.sidePanel,session=chrome.storage.session;
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
   windows.set(id,{open:value.open===true,view:value.view,intent:value.intent==='history'?'history':null,sequence:0,opening:null});
  }
 }).catch(()=>{}).finally(()=>{restored=true;});
 function persist(id,state){
  return session.set({[shelfStateKey(id)]:{open:state.open,view:state.view,intent:state.intent}}).catch(()=>{});
 }
 function open(id){
  try{return panel.open({windowId:id});}
  catch(error){return Promise.reject(error);}
 }
 function showHistory(id,state,opening){
  const sequence=++state.sequence;
  state.open=true;state.view='history';state.intent='history';state.opening=opening??state.opening;
  void persist(id,state).then(()=>chrome.runtime.sendMessage({channel:'shelf-history-show',windowId:id}).catch(()=>{}));
  if(!opening)return;
  void opening.then(()=>{if(state.opening===opening)state.opening=null;},()=>{
   if(state.opening===opening)state.opening=null;
   if(state.sequence!==sequence)return;
   state.open=false;state.view='remotes';state.intent=null;
   void persist(id,state);feedback(id,'SHELF_OPEN_FAILED');
  });
 }
 function closeHistory(id,state){
  if(!panel.close||!panel.onClosed){feedback(id,'SHELF_CLOSE_UNAVAILABLE');return;}
  const sequence=++state.sequence;
  state.open=false;state.intent='close';state.view='remotes';
  void persist(id,state);
  // A second key while Chrome is opening the document is still a close.
  void Promise.resolve(state.opening).catch(()=>{}).then(async()=>{
   if(state.sequence!==sequence)return;
   try{await panel.close({windowId:id});}
   catch{
    if(state.sequence!==sequence)return;
    state.open=true;state.view='history';state.intent=null;
    void persist(id,state);feedback(id,'SHELF_CLOSE_FAILED');
   }
  });
 }
 function regularCommand(id){
  const state=windowState(id);
  if(state.open&&state.view==='history'){closeHistory(id,state);return;}
  // Invoke Chrome before the gesture is lost to any storage or runtime IO.
  showHistory(id,state,state.open?null:open(id));
 }
 function command(tab){
  const id=tab?.windowId;
  if(!panel?.open){feedback(id,'SHELF_OPEN_UNAVAILABLE');return;}
  if(!Number.isInteger(id)){
   void chrome.windows.getLastFocused().then(window=>{if(window.focused)regularCommand(window.id);}).catch(()=>{});
   return;
  }
  if(restored||windows.has(id)){regularCommand(id);return;}
  // Chrome can wake the background with the key event. Keep the gesture
  // while the prior panel state is coming back from chrome.storage.session.
  const pending=early.get(id);
  if(pending){pending.presses++;return;}
  const opening=open(id),queued={opening,presses:1};
  opening.catch(()=>{});early.set(id,queued);
  void ready.then(()=>{
   if(early.get(id)!==queued)return;
   early.delete(id);
   const state=windowState(id);
   const endedOnHistory=(state.open&&state.view==='history')!==(queued.presses%2===1);
   if(endedOnHistory)showHistory(id,state,opening);
   else{state.opening=opening;closeHistory(id,state);}
  });
 }
 function opened(info){
  if(info.path?.split('#')[0]!==appPath||!Number.isInteger(info.windowId))return false;
  const id=info.windowId;
  if(early.has(id))return true;
  const state=windowState(id);
  if(state.intent==='history'||state.intent==='close'||state.opening)return true;
  state.open=true;state.view='remotes';void persist(id,state);
  return false;
 }
 panel?.onClosed?.addListener(info=>{
  if(info.path?.split('#')[0]!==appPath||!Number.isInteger(info.windowId))return;
  const id=info.windowId,state=windowState(id);
  // A newer open can already be in progress while Chrome delivers the close.
  if(state.intent==='history'&&state.opening)return;
  state.open=false;state.view='remotes';state.intent=null;
  void persist(id,state);
 });
 chrome.windows?.onRemoved?.addListener(id=>{
  windows.delete(id);early.delete(id);void session.remove(shelfStateKey(id)).catch(()=>{});
 });
 async function request(method,id,view,sender){
  if(!Number.isInteger(id))return null;
  const contexts=await chrome.runtime.getContexts?.({contextTypes:['SIDE_PANEL'],documentUrls:[chrome.runtime.getURL(appPath)]})??[];
  // A global SIDE_PANEL can have neither a window ID nor sender document
  // metadata. A regular app.html tab always supplies sender.tab.
  const ownPanel=contexts.some(context=>(context.windowId===id||context.windowId===-1)&&
   (sender.documentId===context.documentId||!sender.tab));
  if(!ownPanel)return null;
  await ready;
  const state=windowState(id);
  if(method==='intent')return state.intent==='history'?{view:'history'}:null;
  if(method==='view'&&state.open&&views.has(view)){
   state.view=view;state.intent=null;await persist(id,state);
  }
  return null;
 }
 return {command,opened,request};
}
