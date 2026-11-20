import {ordinaryPage,screenshotError} from '../screenshot/rules.mjs';

export async function openVisibleTabSource(chrome,deliveredTab){
 const {tabs,windows,webNavigation}=chrome;
 let current,changed=false,closed=false;
 const remove=[];
 function listen(event,fn){
  if(!event?.addListener)return;
  event.addListener(fn);
  remove.push(()=>event.removeListener(fn));
 }
 const watchedTab=id=>id===(current?.tabId??deliveredTab?.id);
 listen(tabs.onActivated,info=>{if(info.windowId===(current?.windowId??deliveredTab?.windowId))changed=true;});
 listen(tabs.onUpdated,(id,info)=>{if(watchedTab(id)&&(info.url!==undefined||info.status==='loading'||info.discarded))changed=true;});
 listen(tabs.onRemoved,id=>{if(watchedTab(id))changed=true;});
 listen(tabs.onReplaced,(_added,removed)=>{if(watchedTab(removed))changed=true;});
 listen(windows.onFocusChanged,id=>{if(id!==(current?.windowId??deliveredTab?.windowId))changed=true;});
 for(const name of ['onBeforeNavigate','onCommitted','onHistoryStateUpdated','onReferenceFragmentUpdated','onErrorOccurred']){
  listen(webNavigation?.[name],info=>{if(info.frameId===0&&watchedTab(info.tabId))changed=true;});
 }
 function close(){
  if(closed)return;
  closed=true;
  for(const dispose of remove)dispose();
 }
 async function observe(){
  const window=await windows.getLastFocused();
  if(!window.focused||window.type!=='normal')throw screenshotError('SCREENSHOT_WINDOW_UNAVAILABLE');
  const [tab]=await tabs.query({windowId:window.id,active:true});
  if(!Number.isInteger(tab?.id)||tab.windowId!==window.id||
   (Number.isInteger(deliveredTab?.id)&&deliveredTab.id!==tab.id)||
   (Number.isInteger(deliveredTab?.windowId)&&deliveredTab.windowId!==window.id))throw screenshotError('SCREENSHOT_PAGE_CHANGED');
  const url=ordinaryPage(tab.url);
  if(!url)throw screenshotError(tab.url?'SCREENSHOT_PAGE_UNSUPPORTED':'SCREENSHOT_PERMISSION_REQUIRED');
  const frame=await webNavigation?.getFrame({tabId:tab.id,frameId:0});
  if(changed||tab.pendingUrl||!frame?.documentId||frame.errorOccurred||
   (frame.documentLifecycle&&frame.documentLifecycle!=='active')||ordinaryPage(frame.url)?.href!==url.href)
   throw screenshotError('SCREENSHOT_PAGE_CHANGED');
  return {windowId:window.id,tabId:tab.id,url:url.href,documentId:frame.documentId};
 }
 async function verify(){
  const next=await observe();
  if(closed||changed||next.tabId!==current.tabId||next.windowId!==current.windowId||
   next.url!==current.url||next.documentId!==current.documentId)throw screenshotError('SCREENSHOT_PAGE_CHANGED');
 }
 try{
  current=await observe();
  return {context:current,close,async capture(){
   await verify();
   let data;
   try{
    data=await tabs.captureVisibleTab(current.windowId,{format:'png'});
   }catch(error){
    const code=/MAX_CAPTURE_VISIBLE_TAB_CALLS|rate/i.test(error?.message)?'SCREENSHOT_CAPTURE_RATE_LIMIT':
     /permission|cannot access|activeTab/i.test(error?.message)?'SCREENSHOT_PERMISSION_REQUIRED':'SCREENSHOT_CAPTURE_FAILED';
    throw screenshotError(code);
   }
   await verify();
   if(typeof data!=='string'||!data.startsWith('data:image/png;base64,'))throw screenshotError('SCREENSHOT_CAPTURE_FAILED');
   return fetch(data).then(response=>response.blob());
  }};
 }catch(error){close();throw error;}
}
