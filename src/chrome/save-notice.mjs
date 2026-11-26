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
    notice.released?.();
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

  function addressed(notice,message,sender){
    if(!notice||notice.token!==message.token)return false;
    return notice.surface==='page'
      ? sender.tab?.id===notice.tabId&&sender.tab?.windowId===notice.windowId&&sender.frameId===0
      : sender.url===chrome.runtime.getURL('extension/app.html')&&
        (notice.surface==='app'?sender.tab?.id===notice.tabId:!sender.tab);
  }
  // Claim precedes rendering. A late reply from a renderer that already
  // claimed delivery cannot cause a second notice on another surface.
  chrome.runtime.onMessage?.addListener((message,sender,respond)=>{
    if(sender.id!==chrome.runtime.id||message?.channel!==channel)return;
    const slot=windows.get(message.windowId??sender.tab?.windowId);
    if(message.dismiss===true){
      const shown=slot?.active??slot?.offer;
      if(addressed(shown,message,sender)){
        shown.dismissed=true;
        clear(shown);
      }
      return;
    }
    if(message.claim!==true)return;
    const candidate=slot?.offer;
    if(!addressed(candidate,message,sender)||candidate.claimed){
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
    if(!slot)return null;
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
    if (result===false || !notice.claimed && result!==true) return null;
    if(result?.state==='suppressed-hover'&&notice.claimed){
      // A deliberately hidden notification is not a delivery failure. Do not
      // try a different surface, allocate an active slot or wait ten seconds.
      observe('CUSTOM_NOTICE_SUPPRESSED_HOVER');
      return {state:'suppressed',reason:'hover',surface,observedAt:Date.now()};
    }
    if (!await eligible(event)) {
      void sendCustom(notice,{stop:true}).catch(()=>{});
      return {state:'suppressed'};
    }
    if(notice.dismissed){
      observe('CUSTOM_NOTICE_RENDERED');
      return {state:'rendered',surface,observedAt:Date.now()};
    }
    clear(slot.active);
    slot.active = notice;
    notice.release = new Promise(resolve=>{notice.released=resolve;});
    notice.expiry = setTimeout(()=>clear(notice),10000);
    observe(result===true?'CUSTOM_NOTICE_RENDERED':'CUSTOM_NOTICE_ACK_UNCONFIRMED');
    return {state:result===true?'rendered':'ack-unconfirmed',surface,observedAt:Date.now()};
  }

  async function deliver(event) {
    await preferences.ready;
    if (!master() || event.version!==version || event.cancelled || !windows.has(event.windowId)) return {state:'suppressed'};

    const attempted = new Set();
    let state;
    if(event.distinct)await windows.get(event.windowId)?.active?.release;
    while ((state = await eligible(event))) {
      const extensionSurface = state.closed?'app':'shelf';
      const surface = event.id&&Number.isInteger(event.windowId)&&chrome.runtime.sendMessage&&!attempted.has(extensionSurface)
        ? extensionSurface
        : state.closed&&event.id&&Number.isInteger(event.tabId)&&chrome.tabs.sendMessage&&!attempted.has('page')?'page':null;
      if (!surface) break;
      attempted.add(surface);
      const outcome=await custom(event,surface);
      if(outcome)return outcome;
    }
    if (state) observe('CUSTOM_NOTICE_SURFACE_UNAVAILABLE');
    return {state:state?'surface-unavailable':'suppressed'};
  }

  function submit(provider,id,distinct,origin) {
    if (!Object.hasOwn(providers,provider)||typeof id!=='string'||!id||seen.has(id))
      return Promise.resolve({state:'duplicate'});
    seen.add(id);
    if (seen.size>128) seen.delete(seen.values().next().value);
    const event = {provider,id,version,openAllowed:openAllowed(),sequence:++sequence,distinct};
    return (async()=>{
      if(distinct)await preferences.ready;
      if (!master()||event.version!==version) return {state:'suppressed'};
      const query=Number.isInteger(origin?.windowId)?{active:true,windowId:origin.windowId}:{active:true,lastFocusedWindow:true};
      const tab=(await chrome.tabs?.query?.(query))?.[0];
      if (!Number.isInteger(tab?.windowId)) {
        observe('CUSTOM_NOTICE_SURFACE_UNAVAILABLE');
        return {state:'surface-unavailable'};
      }
      event.tabId=tab.id;
      event.windowId=tab.windowId;
      const slot=windows.get(tab.windowId)??{updates:Promise.resolve()};
      windows.set(tab.windowId,slot);
      if(distinct){
        const work=slot.updates.then(()=>deliver(event));
        slot.updates=work.catch(()=>{});
        return work;
      }
      if(event.sequence<(slot.sequence??0))return;
      slot.sequence=event.sequence;
      slot.next=event;
      if(slot.pending)return;
      slot.pending=setTimeout(()=>{
        const queued=slot.next;
        slot.next=slot.pending=undefined;
        queue(slot,()=>deliver(queued));
      },140);
    })().catch(()=>{
      observe('CUSTOM_NOTICE_DELIVERY_FAILED');
      return {state:'failed'};
    });
  }
  return {saved(provider,id){void submit(provider,id,false);},
    savedBatch(id,origin){return submit('cloudflare','cloudflare-upload:'+id,true,origin);},shelfOpened};
}
