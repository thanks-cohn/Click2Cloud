const notificationId = 'redown-verified-save';
const channel = 'redown-console-save';
const providers = Object.freeze({cloudflare:'Cloudflare R2',google:'Google Drive',dropbox:'Dropbox',onedrive:'OneDrive'});

export function createClosedShelfSaveNotice({chrome, preferences, isClosed, observe = () => {}}) {
  const seen = new Set(), openedWhileSuppressed = new Map();
  let version = 0, sequence = 0;
  const windows = new Map();
  const clearStaleNative = () => void chrome.notifications?.clear?.(notificationId).catch(()=>{});
  clearStaleNative();
  function queue(slot, work) {
    slot.updates = slot.updates.then(work).catch(()=>observe('CUSTOM_NOTICE_DELIVERY_FAILED'));
  }
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
  function clear(notice) {
    if (!notice || notice.slot.active !== notice) return;
    notice.slot.active = undefined;
    clearTimeout(notice.expiry);
    // An unloading old renderer must never hold up the next verified save.
    void sendCustom(notice,{stop:true}).catch(()=>{});
  }
  function suppress(notice) {
    if (!notice) return;
    notice.event.cancelled = true;
    if (notice === notice.slot.offer) void sendCustom(notice,{stop:true}).catch(()=>{});
    clear(notice);
  }
  function shelfOpened(windowId) {
    if (openAllowed()) return;
    openedWhileSuppressed.set(windowId,++sequence);
    const slot = windows.get(windowId);
    suppress(slot?.offer);
    suppress(slot?.active);
  }
  chrome.windows?.onRemoved?.addListener(windowId=>{
    const slot = windows.get(windowId);
    if (slot) {
      if (slot.next) slot.next.cancelled = true;
      clearTimeout(slot.pending);
      suppress(slot.offer);
      suppress(slot.active);
      windows.delete(windowId);
    }
    openedWhileSuppressed.delete(windowId);
  });
  preferences.subscribe(() => {
    if (!master()) {
      version++;
      clearStaleNative();
      for (const slot of windows.values()) {
        clearTimeout(slot.pending);
        slot.next = slot.pending = undefined;
        suppress(slot.offer);
        suppress(slot.active);
      }
    } else if (!openAllowed()) {
      for (const windowId of windows.keys()) {
        void isClosed(windowId).then(closed=>{
          if (!closed&&!openAllowed()) shelfOpened(windowId);
        },()=>{});
      }
    }
  });

  // Claim precedes rendering. A late reply from a renderer that already
  // claimed delivery cannot cause a second notice on another surface.
  chrome.runtime.onMessage?.addListener((message,sender,respond)=>{
    if (sender.id!==chrome.runtime.id || message?.channel!==channel || message.claim!==true) return;
    const candidate = windows.get(message.windowId ?? sender.tab?.windowId)?.offer;
    if (!candidate || candidate.token!==message.token || candidate.claimed ||
        (candidate.surface==='page'
          ? sender.tab?.id!==candidate.tabId || sender.tab?.windowId!==candidate.windowId || sender.frameId!==0
          : sender.url!==chrome.runtime.getURL('extension/app.html') ||
            (candidate.surface==='app' ? sender.tab?.id!==candidate.tabId : !!sender.tab))) {
      respond(false);
      return;
    }
    // The background chose the surface immediately before sending the offer.
    // Do not put a second Chrome context lookup on the renderer's claim path.
    const accepted = master() && candidate.event.version===version && !candidate.event.cancelled &&
      (candidate.surface!=='shelf'||openAllowed()) && Date.now()<candidate.deliverBy;
    if (accepted) candidate.claimed = true;
    respond(accepted);
  });

  async function custom(event, surface) {
    const slot = windows.get(event.windowId);
    const notice = {event,slot,surface,tabId:event.tabId,windowId:event.windowId,token:crypto.randomUUID(),deliverBy:Date.now()+650};
    slot.offer = notice;
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
      if (slot.offer===notice) slot.offer=undefined;
    }
    if (result===false || !notice.claimed && result!==true) return false;
    if (!await eligible(event)) {
      void sendCustom(notice,{stop:true}).catch(()=>{});
      return true;
    }
    clear(slot.active);
    slot.active = notice;
    notice.expiry = setTimeout(()=>clear(notice),10000);
    observe(result===true?'CUSTOM_NOTICE_RENDERED':'CUSTOM_NOTICE_ACK_UNCONFIRMED');
    return true;
  }

  async function deliver(event) {
    await preferences.ready;
    if (!master() || event.version!==version || event.cancelled || !windows.has(event.windowId)) return;

    const attempted = new Set();
    let state;
    while ((state = await eligible(event))) {
      const extensionSurface = state.closed?'app':'shelf';
      const surface = event.id&&Number.isInteger(event.windowId)&&chrome.runtime.sendMessage&&!attempted.has(extensionSurface)
        ? extensionSurface
        : state.closed&&event.id&&Number.isInteger(event.tabId)&&chrome.tabs.sendMessage&&!attempted.has('page')?'page':null;
      if (!surface) break;
      attempted.add(surface);
      if (await custom(event,surface)) return;
    }
    if (state) observe('CUSTOM_NOTICE_SURFACE_UNAVAILABLE');
  }

  function saved(provider,id) {
    if (!Object.hasOwn(providers,provider)||typeof id!=='string'||!id||seen.has(id)) return;
    seen.add(id);
    if (seen.size>128) seen.delete(seen.values().next().value);
    if (!master()) return;
    const event = {provider,id,version,openAllowed:openAllowed(),sequence:++sequence};
    void Promise.resolve(chrome.tabs?.query?.({active:true,lastFocusedWindow:true})).then(tabs=>{
      if (!master()||event.version!==version) return;
      const tab = tabs?.[0];
      if (!Number.isInteger(tab?.windowId)) { observe('CUSTOM_NOTICE_SURFACE_UNAVAILABLE'); return; }
      event.tabId = tab.id;
      event.windowId = tab.windowId;
      const slot = windows.get(tab.windowId) ?? {updates:Promise.resolve()};
      windows.set(tab.windowId,slot);
      if (event.sequence < (slot.sequence ?? 0)) return;
      slot.sequence = event.sequence;
      slot.next = event;
      if (slot.pending) return;
      slot.pending = setTimeout(()=>{
        const queued = slot.next;
        slot.next = slot.pending = undefined;
        queue(slot,()=>deliver(queued));
      },140);
    },()=>observe('CUSTOM_NOTICE_SURFACE_UNAVAILABLE'));
  }
  return {saved,shelfOpened};
}
