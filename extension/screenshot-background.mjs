import {createScreenshotRules,screenshotTarget,screenshotCommands,screenshotError,captureUuid} from '../src/screenshot/rules.mjs';
import {createScreenshotCapture} from '../src/screenshot/capture.mjs';
import {createScreenshotRetryCache} from '../src/screenshot/retry-cache.mjs';
import {chooseScreenshotFolderId,isScreenshotMenuItem,screenshotMenu} from '../src/chrome/screenshot-menu.mjs';
import {openVisibleTabSource} from '../src/chrome/visible-tab-screenshot.mjs';
import {captureHistoryContext,safeHistoryURL} from '../src/history/model.mjs';

const requestKey=windowId=>'screenshot-folder-request:'+windowId;
const folderRequestLifetime=5*60*1000;
export function createScreenshotBackground({chrome,attention,transport,current,fileApi,authorizeBucket,activeNative}){
 const storage=chrome.storage.local,session=chrome.storage.session;
 const pendingWindows=new Set(),retryCache=createScreenshotRetryCache();
 const send=message=>chrome.runtime.sendMessage(message).catch(()=>{});
 async function authorizeTarget(input){
  const target=screenshotTarget(input);
  await authorizeBucket(target);
  if(target.prefix){
   const listed=await fileApi.run('list',{source:target});
   if(listed.state!=='completed'||listed.data.folderExists!==true)throw screenshotError('SCREENSHOT_FOLDER_UNAVAILABLE');
  }
  return target;
 }
 const rules=createScreenshotRules({storage,authorizeTarget});
 const runner=createScreenshotCapture({chrome,rules,transport,retryCache,
  record:job=>current.recordRemoteResult({
   operationId:job.plan.operationId,kind:'screenshot-to-cloud',state:job.state,code:job.code,
   attemptedFilename:'Screenshot',bytes:job.captured?.bytes,historyContext:captureHistoryContext({pageUrl:job.plan.context?.url}),
   screenshot:{...job,plan:{...job.plan,context:job.plan.context?
    {...job.plan.context,url:safeHistoryURL(job.plan.context.url)}:null}}
  }),
  read:async id=>{const row=await current.readRemoteResult(id);return row?.kind==='screenshot-to-cloud'?row.screenshot:null;},
  async notify(job,{recorded}){
   const confirmed=job.outputs.filter(output=>output.state==='confirmed').length;
   for(const [index,result] of job.outputs.entries())if(result.state==='confirmed'){
    const {target,key}=job.plan.outputs[index];
    try{void Promise.resolve(fileApi.noteRemoteWrite({state:'verified',operationId:result.outputId,destination:{...target,provider:'cloudflare-r2',prefix:target.prefix.slice(0,-1)},receipt:{key}})).catch(()=>{});}
    catch{}
   }
   await send({channel:'screenshot-result',windowId:job.plan.context?.windowId,confirmed,total:job.outputs.length,state:job.state,code:job.code,recorded});
   if((job.state!=='confirmed'||!recorded)&&chrome.notifications?.create){
    const message=recorded?(confirmed?`${confirmed} of ${job.outputs.length} files verified. Open History for details.`:'Open History for the capture result and available retries.')
     :'The capture result could not be added to History.';
    try{await chrome.notifications.create('screenshot-'+job.plan.operationId,{type:'basic',iconUrl:chrome.runtime.getURL('extension/icon.png'),title:'Click2Cloud Screenshot',message});}catch{}
   }
  }
 });
 async function folderRequest(windowId){
  if(!Number.isInteger(windowId))return null;
  const key=requestKey(windowId),value=(await session.get(key))[key];
  if(!value)return null;
  if(Date.now()-value.at>=folderRequestLifetime){await session.remove(key);return null;}
  return value;
 }
 async function chooseFolder(tab){
  const opening=attention.manual(tab);
  const source=await openVisibleTabSource(chrome,tab);
  try{
   if((await opening).state!=='opened')throw screenshotError('SCREENSHOT_FOLDER_PICKER_UNAVAILABLE');
   const request={at:Date.now(),id:crypto.randomUUID(),context:source.context};
   const windowId=source.context.windowId;
   await session.set({[requestKey(windowId)]:request});
   await send({channel:'screenshot-choose-folder',windowId});
  }finally{source.close();}
 }
 function onNativeClick(info,tab){
  const id=String(info.menuItemId);
  if(!isScreenshotMenuItem(id))return false;
  if(id===chooseScreenshotFolderId)void chooseFolder(tab).catch(error=>send({channel:'screenshot-result',state:'failed',code:error.code}));
  else void (async()=>{
   // Stable native IDs are rooted in the actual applied configuration generation.
   const spec=await activeNative(),target=screenshotMenu(spec).targets.find(t=>t.id===id)?.target;
   if(target)await runner.start('screenshot.one-off',tab,{oneOff:target});
  })().catch(()=>{});
  return true;
 }
 async function request(method,params={},sender){
  if(method==='read')return rules.read();
  if(['save','toggle','delete','dedup'].includes(method))return rules.change(method,params);
  if(method==='retry'&&captureUuid(params.operationId))return runner.retry(params.operationId);
  if(method==='folder-request')return sender?.tab?null:folderRequest(params.windowId);
  if(method==='choose-folder'){
   const windowId=params.windowId;
   if(sender?.tab||!Number.isInteger(windowId)||pendingWindows.has(windowId))throw screenshotError('SCREENSHOT_FOLDER_REQUEST_EXPIRED');
   pendingWindows.add(windowId);
   try{
    const pending=await folderRequest(windowId);
    if(!pending||pending.id!==params.id)throw screenshotError('SCREENSHOT_FOLDER_REQUEST_EXPIRED');
    const target=await authorizeTarget(params.target);
    await session.remove(requestKey(windowId));
    return await runner.start('screenshot.one-off',{id:pending.context.tabId,windowId},{oneOff:target,expectedContext:pending.context});
   }finally{pendingWindows.delete(windowId);}
  }
  throw screenshotError('SCREENSHOT_REQUEST_INVALID');
 }
 return {
  request,onNativeClick,
  async registerExtras(spec,create){for(const item of screenshotMenu(spec).items)await create(item);},
  onCommand(command,tab){if(screenshotCommands.includes(command))void runner.start(command,tab).catch(()=>{});},
  prune:()=>retryCache.prune().catch(()=>{})
 };
}
