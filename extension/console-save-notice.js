(() => {
  if (window !== window.top || typeof globalThis.chrome?.runtime?.onMessage?.addListener !== 'function' ||
      typeof chrome.runtime.getURL !== 'function') return;
  const providers = {
    dropbox:['Dropbox','#ffe097',91],
    google:['Google Drive','#b9ee71',115],
    onedrive:['OneDrive','#71caff',85],
    cloudflare:['Cloudflare R2','#ffb85d',125]
  };
  const duration = 10000;
  const channel = 'redown-console-save';
  const seen = new Set(), stopped = new Set();
  const asset = chrome.runtime.getURL('extension/icons/redown-console-r.png');
  const isApp = location.protocol === 'chrome-extension:' && location.pathname === '/extension/app.html';
  let imageReady, current;
  let appTarget;
  const target = isApp ? Promise.all([chrome.windows.getCurrent(),chrome.tabs.getCurrent()])
    .then(([window,tab])=>appTarget={windowId:tab?.windowId??window.id,tabId:tab?.id,surface:tab?'app':'shelf'})
    .catch(()=>null) : null;

  function loadArtwork() {
    if (imageReady) return imageReady;
    const image = new Image();
    let timeout;
    imageReady = new Promise(resolve => {
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      timeout = setTimeout(() => resolve(false),350);
      image.src = asset;
    }).then(loaded => {
      clearTimeout(timeout);
      image.onload = image.onerror = null;
      if (!loaded) imageReady = undefined;
      return loaded;
    });
    return imageReady;
  }

  function reveal({id,provider,token,position,size,hover}) {
    current?.();
    const [name,color,width] = providers[provider];
    const noticeWidth = {small:253,standard:338,large:422}[size] ?? 422;
    const placement = position==='center'
      ? 'inset:50% 0 auto!important;margin-inline:auto!important;transform:translateY(-50%)!important;'
      : 'inset:auto 8px 12px auto!important;';
    const host = document.createElement('div');
    host.style.cssText = 'all:initial!important;position:fixed!important;'+placement+
      'width:min('+noticeWidth+'px,calc(100vw - 16px))!important;z-index:2147483647!important;pointer-events:none!important;';
    const shadow = host.attachShadow({mode:'closed'});
    const reward = document.createElement('div');
    reward.style.cssText = 'position:relative;box-sizing:border-box;padding:16px 16px 12px;background:#080808;border-radius:12px;perspective:650px;color:#eee;font:16px system-ui;';
    reward.style.pointerEvents = 'auto';
    if(size==='small')reward.style.padding='10px 10px 7px';
    if(size==='standard')reward.style.padding='13px 13px 10px';
    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label','Dismiss save notification');
    close.textContent = '×';
    close.style.cssText = 'position:absolute;inset:0 0 auto auto;width:32px;height:32px;border:0;background:transparent;color:#aaa;font:18px system-ui;cursor:pointer;z-index:5;pointer-events:auto;';
    const visual = document.createElement('div');
    visual.setAttribute('role','status');
    visual.innerHTML = `<svg viewBox="0 0 365 112" width="100%" style="display:block;overflow:visible" role="img" aria-label="Success! ${name}">
      <image x="4" y="5" width="101" height="102" />
      <g transform="translate(112,15)"><text x="0" y="42" textLength="235" lengthAdjust="spacingAndGlyphs" font-family="Arial Black, Impact, Arial, sans-serif" font-weight="1000" font-size="43" fill="#ffe097">SUCCESS!</text></g>
      <g><rect x="112" y="77" width="${width}" height="25" rx="2" fill="${color}"/><text x="${112+width/2}" y="94" fill="#171717" font-family="system-ui" font-size="13" font-weight="bold" text-anchor="middle">${name}</text></g>
    </svg>`;
    const logo = visual.querySelector('image');
    logo.setAttribute('href',asset);
    const word = visual.querySelector('text'), tag = visual.querySelector('rect').parentElement;
    for (const element of [logo,word,tag]) element.style.transformBox = 'fill-box';
    logo.style.transformOrigin = word.style.transformOrigin = 'center';
    tag.style.transformOrigin = 'left center';
    const track = document.createElement('div'), timer = document.createElement('div');
    track.style.cssText = 'height:2px;background:#343434;margin-top:8px';
    timer.style.cssText = 'height:2px;background:#ffe097;transform-origin:left';
    track.append(timer);
    reward.append(close,visual,track);
    shadow.append(reward);
    (isApp&&document.querySelector('dialog:modal')||document.documentElement).append(host);

    const animations = [];
    const play = (element,frames,settings) => animations.push(element.animate(frames,settings));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const expiresAt = Date.now()+duration;
    function dispose() {
      if (current !== dispose) return;
      clearTimeout(expiry);
      for (const animation of animations) animation.cancel();
      host.remove();
      current = undefined;
      document.removeEventListener('visibilitychange',checkExpiry);
    }
    function checkExpiry(){if(Date.now()>=expiresAt)dispose();}
    current = dispose;
    dispose.id = id;
    dispose.token = token;
    const expiry = setTimeout(dispose,duration);
    close.onclick = event => {event.stopPropagation();dispose();};
    close.onkeydown = event => {
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dispose();}
    };
    if(hover!==false&&matchMedia('(any-hover: hover)').matches){
      // Layout may dispatch pointerenter when the notice appears under a
      // stationary pointer. Dismiss on actual pointer movement over the notice.
      reward.addEventListener('pointermove',event=>{
        if(event.isTrusted&&event.pointerType!=='touch'&&(event.movementX||event.movementY))dispose();
      });
    }
    document.addEventListener('visibilitychange',checkExpiry);
    try {
      if (!reduced) {
        play(logo,[
          {opacity:0,transform:'perspective(500px) rotateY(-85deg) rotateZ(-28deg) scale(.3)'},
          {opacity:1,transform:'perspective(500px) rotateY(-55deg) rotateZ(-12deg) scale(.8)',offset:.35},
          {opacity:1,transform:'perspective(500px) rotateY(8deg) rotateZ(2deg) scale(1.06)',offset:.85},
          {opacity:1,transform:'perspective(500px) rotateY(0deg) rotateZ(0deg) scale(1)'}
        ],{duration:900,fill:'both',easing:'cubic-bezier(.2,.65,.25,1)'});
        play(word,[{opacity:0,transform:'scale(.82)',letterSpacing:'3px'},
          {opacity:.4,transform:'scale(.94)',letterSpacing:'1px',offset:.35},
          {opacity:1,transform:'scale(1)',letterSpacing:'0px'}],{delay:650,duration:650,fill:'both',easing:'ease-out'});
        play(tag,[{opacity:0,clipPath:'inset(0 100% 0 0)'},{opacity:1,clipPath:'inset(0 0 0 0)'}],{delay:1250,duration:240,fill:'both'});
        play(reward,[{opacity:1},{opacity:0}],{delay:9200,duration:800,fill:'forwards',easing:'ease-in-out'});
      }
      play(timer,[{transform:'scaleX(1)'},{transform:'scaleX(0)'}],{duration,fill:'forwards'});
    } catch {
      dispose();
      return false;
    }
    seen.add(id);
    if (seen.size>128) seen.delete(seen.values().next().value);
    return true;
  }

  chrome.runtime.onMessage.addListener((message,sender,respond) => {
    if (message?.channel !== channel || sender.id !== chrome.runtime.id) return;
    if (message.stop && typeof message.token==='string') {
      stopped.add(message.token);
      if(stopped.size>128)stopped.delete(stopped.values().next().value);
      if(current?.token===message.token)current();
      return;
    }
    const {id,provider,deliverBy,token} = message;
    if (typeof id !== 'string' || !id || !Object.hasOwn(providers,provider) ||
        typeof token!=='string'||!token||!Number.isFinite(deliverBy) || Date.now() >= deliverBy || document.hidden) return;
    if(!isApp&&(message.surface!=='page'||document.fullscreenElement||document.querySelector(':modal')))return;
    const matches = appTarget => appTarget && message.surface===appTarget.surface &&
      message.windowId===appTarget.windowId&&(appTarget.tabId===undefined||message.tabId===appTarget.tabId);
    if (isApp && appTarget && !matches(appTarget)) return;
    void (async () => {
      // A newly opened app can receive its first offer while Chrome is still
      // resolving its tab/window identity. A non-target document never ACKs.
      if (isApp && !matches(await target)) return;

      if (stopped.has(token)||document.hidden||Date.now()>=deliverBy) return false;
      if (seen.has(id)) return true;
      // Claim while the addressed document is ready to receive the offer.
      // Artwork decoding and painting are acknowledged separately.
      if(!await chrome.runtime.sendMessage({channel,claim:true,token,windowId:message.windowId}))return false;
      if(stopped.has(token)||document.hidden||!await loadArtwork()||stopped.has(token)||document.hidden)return false;
      return seen.has(id) || reveal(message);
    })().then(result=>{if(result!==undefined)respond(result);},()=>respond(false));
    return true;
  });
  window.addEventListener('pagehide',()=>current?.());
})();
