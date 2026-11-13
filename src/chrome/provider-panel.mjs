// One Chrome Shelf attention adapter. It never starts OAuth or changes cloud state.
export function createShelfAttention({chrome,preference=()=>true}={}){
 let serial=0,last=null;const gestures=new WeakMap();
 // Chrome 141+ reports actual panel opening, unlike ordinary focus/OAuth returns.
 chrome.sidePanel?.onOpened?.addListener(info=>{if(!Number.isInteger(info.windowId)||info.path?.split('#')[0]!=='extension/app.html')return;try{void chrome.runtime.sendMessage({channel:'shelf-opened',windowId:info.windowId}).catch(()=>{});}catch{}});
 const providers=['cloudflare','google-drive','dropbox','onedrive'];
 const safeError=e=>/user gesture/i.test(e?.message??'')?'SIDE_PANEL_GESTURE_REQUIRED':/not.*available|undefined|not supported/i.test(e?.message??'')?'SIDE_PANEL_UNAVAILABLE':'SIDE_PANEL_OPEN_FAILED';
 function open(tabId,windowId){try{if(!chrome.sidePanel?.open)return Promise.resolve({state:'blocked',code:'SIDE_PANEL_UNAVAILABLE',operation:'sidePanel.open'});return Promise.resolve(chrome.sidePanel.open(Number.isInteger(tabId)?{tabId}:{windowId})).then(()=>({state:'opened',operation:'sidePanel.open'}),e=>({state:'blocked',code:safeError(e),operation:'sidePanel.open'}));}catch(e){return Promise.resolve({state:'blocked',code:safeError(e),operation:'sidePanel.open'});}}
 // The badge opens the existing Shelf/results; technical OS notifications add no proof.
 async function notify(){try{await chrome.action.setBadgeText({text:'!'});}catch{}}
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
