import {ordinaryPage,screenshotError} from '../screenshot/rules.mjs';
import {SCREENSHOT_BYTES} from '../cloudflare/screenshot-wire.mjs';

const pngSignature=[137,80,78,71,13,10,26,10];
const pngDataPrefix='data:image/png;base64,';
const maxEncodedLength=pngDataPrefix.length+Math.ceil(SCREENSHOT_BYTES/3)*4;
const captureError=(code,stage,browserError)=>Object.assign(screenshotError(code),{stage,browserError});
const pageChanged=()=>captureError('SCREENSHOT_PAGE_CHANGED','tab-observation');

export async function openVisibleTabSource(chrome,deliveredTab,{trace=()=>{}}={}){
 const {tabs,windows,webNavigation}=chrome;
 let current,tabId=deliveredTab?.id,windowId=deliveredTab?.windowId,changed=false,closed=false;
 const remove=[];
 function listen(event,fn){
  if(!event?.addListener)return;
  event.addListener(fn);
  remove.push(()=>event.removeListener(fn));
 }
 listen(tabs.onActivated,info=>{if(info.windowId===windowId&&info.tabId!==tabId)changed=true;});
 listen(tabs.onUpdated,(id,info)=>{if(id===tabId&&(info.url!==undefined||info.status==='loading'||info.discarded))changed=true;});
 listen(tabs.onRemoved,id=>{if(id===tabId)changed=true;});
 listen(tabs.onReplaced,(_added,removed)=>{if(removed===tabId)changed=true;});
 listen(windows.onFocusChanged,id=>{if(id>=0&&windowId!==undefined&&id!==windowId)changed=true;});
 for(const name of ['onBeforeNavigate','onCommitted','onHistoryStateUpdated','onReferenceFragmentUpdated','onErrorOccurred']){
  listen(webNavigation?.[name],info=>{if(info.frameId===0&&info.tabId===tabId)changed=true;});
 }
 function close(){
  if(closed)return;
  closed=true;
  for(const dispose of remove)dispose();
 }
 async function observe(initial=false){
  let window;
  try{
   window=Number.isInteger(windowId)&&windows.get?
    await windows.get(windowId):await windows.getLastFocused();
  }catch{throw captureError('SCREENSHOT_WINDOW_UNAVAILABLE','window-observation','chrome-window-error');}
  if(!window?.focused||window.type!=='normal'||!Number.isInteger(window.id))
   throw captureError('SCREENSHOT_WINDOW_UNAVAILABLE','window-observation');
  windowId=window.id;
  let tab;
  try{[tab]=await tabs.query({windowId,active:true});}
  catch{throw captureError('SCREENSHOT_TAB_QUERY_FAILED','tab-observation','chrome-tabs-query-error');}
  if(changed||!Number.isInteger(tab?.id)||tab.windowId!==windowId||
   (Number.isInteger(tabId)&&tabId!==tab.id)||tab.pendingUrl)throw pageChanged();
  tabId=tab.id;
  if(initial)trace('TAB_RESOLVED','ok',{commandTab:Number.isInteger(deliveredTab?.id)});
  // A Chrome command can arrive without a Tab argument. Query the active tab
  // in the explicit window and corroborate its URL/document with webNavigation.
  if(!tab.url)throw captureError('TAB_URL_UNAVAILABLE','tab-observation');
  const url=ordinaryPage(tab.url);
  if(!url)throw captureError('SCREENSHOT_PAGE_UNSUPPORTED','page-eligibility');
  if(initial&&deliveredTab?.url&&ordinaryPage(deliveredTab.url)?.href!==url.href)throw pageChanged();
  let frame;
  try{frame=await webNavigation?.getFrame({tabId,frameId:0});}
  catch{throw captureError('SCREENSHOT_FRAME_UNAVAILABLE','tab-observation','chrome-frame-error');}
  if(changed||!frame?.documentId||frame.errorOccurred||
   (frame.documentLifecycle&&frame.documentLifecycle!=='active')||ordinaryPage(frame.url)?.href!==url.href)throw pageChanged();
  if(initial)trace('PAGE_ELIGIBLE','ok');
  return {windowId,tabId,url:url.href,documentId:frame.documentId};
 }
 async function verify(){
  const next=await observe();
  if(closed||changed||next.tabId!==current.tabId||next.windowId!==current.windowId||
   next.url!==current.url||next.documentId!==current.documentId)throw pageChanged();
 }
 try{
  current=await observe(true);
  return {context:current,close,async capture(){
   await verify();
   let data;
   trace('CAPTURE_REQUESTED','started');
   try{
    data=await tabs.captureVisibleTab(current.windowId,{format:'png'});
   }catch(error){
    const message=error?.message??'';
    if(/MAX_CAPTURE_VISIBLE_TAB_CALLS|quota|rate limit/i.test(message))
     throw captureError('SCREENSHOT_CAPTURE_RATE_LIMIT','capture-api','chrome-rate-limit');
    if(/permission|cannot access|activeTab|all_urls/i.test(message))
     throw captureError('CHROME_CAPTURE_PERMISSION_DENIED','capture-api','chrome-permission-denied');
    throw captureError('SCREENSHOT_CAPTURE_FAILED','capture-api','chrome-capture-error');
   }
   await verify();
   if(typeof data==='string'&&data.length>maxEncodedLength)
    throw captureError('SCREENSHOT_IMAGE_SIZE_UNSUPPORTED','png-validation');
   try{
    if(typeof data!=='string'||!data.startsWith(pngDataPrefix))throw Error();
    const image=await fetch(data).then(response=>response.blob());
    const signature=new Uint8Array(await image.slice(0,8).arrayBuffer());
    if(!pngSignature.every((byte,index)=>signature[index]===byte))throw Error();
    return image;
   }catch{throw captureError('SCREENSHOT_PNG_INVALID','png-validation');}
  }};
 }catch(error){close();throw error;}
}
