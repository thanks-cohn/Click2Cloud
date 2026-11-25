const notificationId = 'redown-verified-save';
const channel = 'redown-console-save';
const providers = Object.freeze({cloudflare:'Cloudflare R2',google:'Google Drive',dropbox:'Dropbox',onedrive:'OneDrive'});

export function createClosedShelfSaveNotice({chrome, preferences, isClosed}) {
  const seen = new Set(), openedWhileSuppressed = new Map();
  let next, pending, expiry, version = 0, sequence = 0, active, offer;
  let updates = Promise.resolve();
  function queue(work) { updates = updates.then(work).catch(()=>{}); }
  const master = () => preferences.value.notifications !== false;
  const openAllowed = () => preferences.value.notificationsWhileOpen !== false;

  async function eligible(event) {
    const closed = await isClosed(event.windowId);
    if (!master() || event.version !== version || event.cancelled ||
        (openedWhileSuppressed.get(event.windowId) ?? 0) > event.sequence ||
        !closed && (!event.openAllowed || !openAllowed())) return null;
    return {closed};
  }
  function sendCustom(notice, message) {
    const payload = {channel,id:notice.event.id,token:notice.token,surface:notice.surface,
      windowId:notice.windowId,tabId:notice.tabId,...message};
    return notice.surface==='page'
      ? chrome.tabs.sendMessage(notice.tabId,payload,{frameId:0})
      : chrome.runtime.sendMessage(payload);
  }
  async function clear(notice) {
    if (!notice || active !== notice) return;
    active = undefined;
    clearTimeout(expiry);
    if (notice.surface==='native') await chrome.notifications?.clear?.(notificationId).catch(()=>{});
    else await sendCustom(notice,{stop:true}).catch(()=>{});
  }
  function suppress(notice) {
    if (!notice) return;
    notice.event.cancelled = true;
    if (notice === offer) void sendCustom(notice,{stop:true}).catch(()=>{});
    if (notice === active) queue(()=>clear(notice));
  }
  function shelfOpened(windowId) {
    if (openAllowed()) return;
    openedWhileSuppressed.set(windowId,++sequence);
    if (offer?.windowId===windowId) suppress(offer);
    if (active?.windowId===windowId) suppress(active);
  }
  chrome.windows?.onRemoved?.addListener(windowId=>openedWhileSuppressed.delete(windowId));
  preferences.subscribe(() => {
    if (!master()) {
      version++;
      clearTimeout(pending);
      next = pending = undefined;
      suppress(offer);
      suppress(active);
    } else if (!openAllowed()) {
      for (const notice of new Set([offer,active])) if (notice) {
        void isClosed(notice.windowId).then(closed=>{
          if (!closed&&!openAllowed()) shelfOpened(notice.windowId);
        });
      }
    }
  });

  // Claim precedes rendering. A late reply from a renderer that already
  // claimed delivery cannot cause a second notice on another surface.
  chrome.runtime.onMessage?.addListener((message,sender,respond)=>{
    if (sender.id!==chrome.runtime.id || message?.channel!==channel || message.claim!==true) return;
    const candidate = offer;
    if (!candidate || candidate.token!==message.token || candidate.claimed ||
        (candidate.surface==='page'
          ? sender.tab?.id!==candidate.tabId || sender.frameId!==0
          : sender.url!==chrome.runtime.getURL('extension/app.html') ||
            (candidate.surface==='app' ? sender.tab?.id!==candidate.tabId : !!sender.tab))) {
      respond(false);
      return;
    }
    void eligible(candidate.event).then(result=>{
      const accepted = offer===candidate && !candidate.claimed && result &&
        result.closed===(candidate.surface!=='shelf') && Date.now()<candidate.deliverBy;
      if (accepted) candidate.claimed = true;
      respond(!!accepted);
    },()=>respond(false));
    return true;
  });

  async function custom(event, surface) {
    const notice = {event,surface,tabId:event.tabId,windowId:event.windowId,token:crypto.randomUUID(),deliverBy:Date.now()+650};
    offer = notice;
    let timer, result;
    try {
      result = await Promise.race([
        sendCustom(notice,{id:event.id,provider:event.provider,deliverBy:notice.deliverBy,
          position:preferences.value.notificationPosition, size:preferences.value.notificationSize,
          hover:preferences.value.notificationHover}).catch(()=>undefined),
        new Promise(resolve=>{timer=setTimeout(resolve,650);})
      ]);
    } finally {
      clearTimeout(timer);
      if (offer===notice) offer=undefined;
    }
    if (result!==true && !(notice.claimed&&result!==false)) return false;
    if (!await eligible(event)) {
      await sendCustom(notice,{stop:true}).catch(()=>{});
      return true;
    }
    await clear(active);
    if (!await eligible(event)) {
      await sendCustom(notice,{stop:true}).catch(()=>{});
      return true;
    }
    active = notice;
    expiry = setTimeout(()=>queue(()=>clear(notice)),10000);
    return true;
  }

  async function deliver(event) {
    await preferences.ready;
    if (!master() || event.version!==version) return;
    const [tab] = await event.tabs;
    event.tabId = tab?.id;
    event.windowId = tab?.windowId;
    let state = await eligible(event);
    if (!state) return;
    if (event.id&&Number.isInteger(event.windowId)&&chrome.runtime.sendMessage) {
      if (await custom(event,state.closed?'app':'shelf')) return;
    }
    state = await eligible(event);
    if (!state) return;
    if (state.closed&&event.id&&Number.isInteger(event.tabId)&&chrome.tabs.sendMessage) {
      if (await custom(event,'page')) return;
    }
    state = await eligible(event);
    if (!chrome.notifications?.create || !state || !state.closed&&!event.id) return;
    await clear(active);
    if (!await eligible(event)) return;
    const notice = {event,surface:'native',windowId:event.windowId};
    await chrome.notifications.create(notificationId,{
      type:'basic',iconUrl:chrome.runtime.getURL('extension/icons/redown-128.png'),
      title:'Saved!',message:providers[event.provider],requireInteraction:false,silent:true
    });
    active = notice;
    if (!await eligible(event)) await clear(notice);
    else expiry = setTimeout(()=>queue(()=>clear(notice)),10000);
  }

  function saved(provider,id) {
    if (!Object.hasOwn(providers,provider)||seen.has(id)) return;
    if (id) {
      seen.add(id);
      if (seen.size>128) seen.delete(seen.values().next().value);
    }
    if (!master()) return;
    const tabs = chrome.tabs?.query?.({active:true,lastFocusedWindow:true}).catch(()=>[]) ?? Promise.resolve([]);
    next = {provider,id,tabs,version,openAllowed:openAllowed(),sequence:++sequence};
    if (pending) return;
    pending = setTimeout(()=>{
      const event = next;
      next = pending = undefined;
      queue(()=>deliver(event));
    },140);
  }
  return {saved,shelfOpened,clearNative(){
    const notice=active;
    if(notice?.surface==='native')queue(()=>clear(notice));
  }};
}
