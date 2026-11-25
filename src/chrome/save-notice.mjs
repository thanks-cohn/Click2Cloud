const notificationId = 'redown-verified-save';
const channel = 'redown-console-save';
const providers = Object.freeze({cloudflare:'Cloudflare R2',google:'Google Drive',dropbox:'Dropbox',onedrive:'OneDrive'});

export function createClosedShelfSaveNotice({chrome, preferences, isClosed}) {
  const seen = new Set();
  let next, pending, expiry, version = 0, display = 0, showing = false, pageNotice;
  let updates = Promise.resolve();
  function queue(work) { updates = updates.then(work).catch(()=>{}); }
  async function clear() {
    if (!showing) return;
    await chrome.notifications?.clear?.(notificationId);
    showing = false;
  }
  function dismiss() {
    version++;
    clearTimeout(pending);
    clearTimeout(expiry);
    next = pending = expiry = undefined;
    queue(clear);
  }
  preferences.subscribe(value => {
    if (value.notifications) return;
    dismiss();
    if(pageNotice){
      void chrome.tabs.sendMessage(pageNotice,{channel,stop:true},{frameId:0}).catch(()=>{});
      pageNotice=undefined;
    }
  });

  async function send(work, deadline) {
    let timer;
    try {
      const timeout = new Promise(resolve=>{timer=setTimeout(()=>resolve(false),Math.max(0,deadline-Date.now()));});
      return await Promise.race([work(),timeout]) === true;
    } catch { return false; }
    finally { clearTimeout(timer); }
  }
  function saved(provider,id) {
    if (!Object.hasOwn(providers,provider)||seen.has(id)) return;
    if(id){
      seen.add(id);
      if(seen.size>128)seen.delete(seen.values().next().value);
    }
    next = {provider,id};
    if (pending) return;
    pending = setTimeout(() => {
      pending = undefined;
      const event = next, ticket = version;
      queue(async () => {
        await preferences.ready;
        if(ticket!==version)return;
        const [tab] = await chrome.tabs?.query?.({active:true,lastFocusedWindow:true}).catch(()=>[]) ?? [];
        const closed = await isClosed(tab?.windowId);
        if(ticket!==version)return;
        if(event.id&&Number.isInteger(tab?.windowId)&&chrome.runtime.sendMessage){
          const deliverBy=Date.now()+500;
          const shown=await send(()=>chrome.runtime.sendMessage({channel,...event,deliverBy,windowId:tab.windowId,
            tabId:tab.id,surface:closed?'app':'shelf'}),deliverBy);
          if(shown){await clear();return;}
        }
        if (!preferences.value.notifications || ticket !== version || !closed&&!event.id) return;
        if(closed&&event.id&&Number.isInteger(tab?.id)&&chrome.tabs.sendMessage){
          const deliverBy=Date.now()+500;
          const shown=await send(()=>chrome.tabs.sendMessage(tab.id,{channel,...event,deliverBy,surface:'page'},{frameId:0}),deliverBy);
          if(shown){
            pageNotice=tab.id;
            if(ticket!==version&&!preferences.value.notifications)
              void chrome.tabs.sendMessage(tab.id,{channel,stop:true},{frameId:0}).catch(()=>{});
            await clear();return;
          }
        }
        if(!chrome.notifications?.create||!preferences.value.notifications||ticket!==version)return;
        await chrome.notifications.create(notificationId,{
          type:'basic',iconUrl:chrome.runtime.getURL('extension/icons/redown-128.png'),
          title:'Saved!',message:providers[event.provider],requireInteraction:false,silent:true
        });
        showing = true;
        const generation = ++display;
        if (ticket !== version) return; // A queued dismissal owns the clear.
        clearTimeout(expiry);
        expiry = setTimeout(() => queue(() => { if (generation === display) return clear(); }),10000);
      });
    },140);
  }
  return {saved,clearNative(){clearTimeout(expiry);queue(clear);}};
}
