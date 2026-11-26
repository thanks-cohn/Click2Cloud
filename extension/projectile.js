(() => {
  const active = new Set();
  let point, motion;
  const clear = () => { for (const flight of active) flight.dispose(); };
  window.addEventListener('contextmenu', event => {
    point = event.isTrusted && (event.button === 2 || event.pointerType === 'touch')
      ? {x:event.clientX,y:event.clientY,at:Date.now()} : null;
  },{capture:true,passive:true});
  window.addEventListener('pagehide', () => { point = null; clear(); });

  // Same-origin frames can draw at the actual offset in the outer page.
  // A cross-origin boundary leaves us in the permitted frame's viewport.
  function viewport(origin) {
    let {x,y} = origin, view = window;
    while (view !== view.parent) {
      const frame = view.frameElement;
      if (!frame || !frame.offsetWidth || !frame.offsetHeight) break;
      const box = frame.getBoundingClientRect();
      x = box.left + (x + frame.clientLeft) * box.width / frame.offsetWidth;
      y = box.top + (y + frame.clientTop) * box.height / frame.offsetHeight;
      view = view.parent;
    }
    return {view,x,y};
  }

  function launch(origin, side, style, verticalFraction) {
    motion ??= matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches || active.size>=3 || document.hidden) return;
    const {view,x,y} = viewport(origin);
    const {document:page,innerWidth:width,innerHeight:height} = view;
    if (width<48 || height<32 || x<0 || x>=width || y<0 || y>=height || !page.documentElement) return;
    const edge = side === 'left' ? 9 : width-9;
    const distance = edge-x;
    if (Math.abs(distance)<12) return;
    const clampY = n => Math.max(7,Math.min(height-7,n));
    // The browser owns the boundary between the webpage and Shelf. Map
    // the live Shelf viewport fraction onto the top webpage viewport only.
    // A cross-origin frame cannot reliably align with the outer edge.
    const aligned=view===view.top&&Number.isFinite(verticalFraction)&&verticalFraction>=0&&verticalFraction<=1;
    const endY = clampY(aligned?verticalFraction*height:y+style.curve*.25);
    const transform = (p,scale) => {
      const lift = 4*p*(1-p)*style.curve;
      const angle = Math.atan2(endY-y+(1-2*p)*4*style.curve,distance);
      return `translate3d(${x+p*distance}px,${p===0?y:clampY(y+p*(endY-y)+lift)}px,0) rotate(${angle}rad) scale(${scale})`;
    };
    const host = page.createElement('span');
    // All artwork is private and noninteractive. It is created only for a flight.
    host.dataset.redownProjectile = '';
    host.setAttribute('aria-hidden','true');
    host.style.cssText = 'all:initial;position:fixed!important;inset:0 auto auto 0!important;width:0;height:0;z-index:2147483647!important;pointer-events:none!important';
    const shadow = host.attachShadow({mode:'closed'});
    const ink = `color-mix(in srgb,${style.color},white ${style.white}%)`;
    const ball = page.createElement('i'), trail = page.createElement('i'), burst = page.createElement('i');
    ball.style.cssText = `position:absolute;left:-5px;top:-5px;width:10px;height:10px;border-radius:50%;background:radial-gradient(circle at 58% 40%,white 12%,${ink} 54%,${style.color});box-shadow:0 0 8px 2px ${ink},0 0 15px ${style.color};opacity:${style.brightness}`;
    trail.style.cssText = `position:absolute;right:0;top:-4px;width:${style.trail}px;height:8px;clip-path:polygon(0 50%,100% 0,100% 100%);background:linear-gradient(90deg,transparent,${style.color} 56%,${ink})`;
    burst.style.cssText = `position:absolute;inset:-6px auto auto -6px;box-sizing:border-box;width:12px;height:12px;border:1.5px solid ${ink};border-radius:50%;box-shadow:0 0 8px ${style.color};opacity:0`;
    shadow.append(trail,ball,burst);
    const flight = {dispose() {
      for (const animation of animations) animation.cancel();
      host.remove();
      active.delete(flight);
      if (!active.size) motion.removeEventListener('change',clear);
    }};
    const animations = [];
    if (!active.size) motion.addEventListener('change',clear);
    active.add(flight);
    page.documentElement.append(host);
    try {
      const charge = 46, arrival = charge+style.duration, total = arrival+105;
      const frames = [{offset:0,transform:transform(0,.35),opacity:.45},
        {offset:charge/total,transform:transform(0,1.18),opacity:1}];
      for (const progress of [.14,.34,.55,.76,1]) {
        frames.push({offset:(charge+Math.pow(progress,1.36)*style.duration)/total,
          transform:transform(progress,1),opacity:1});
      }
      frames.push({offset:1,transform:transform(1,1),opacity:0});
      const path = host.animate(frames,{duration:total,fill:'both'});
      animations.push(path,
        burst.animate([{opacity:.85,transform:'scale(.45)'},{opacity:0,transform:'scale(2.6)'}],{delay:arrival-16,duration:121}),
        trail.animate([{opacity:0,transform:'scaleX(.18)'},{opacity:.9,transform:'scaleX(1)'},{opacity:.8},{opacity:0}],{duration:arrival+35,fill:'both'}));
      void path.finished.then(flight.dispose,flight.dispose);
    } catch { flight.dispose(); }
  }

  chrome.runtime.onMessage.addListener((message,sender) => {
    if (message?.channel !== 'redown-energy-projectile' || sender.id !== chrome.runtime.id) return;
    if (message.stop === true) { clear(); return; }
    if (!point || point.at>message.clickedAt || message.clickedAt-point.at>12000 || Date.now()-message.clickedAt>2200) return;
    const origin = point;
    point = null;
    try { launch(origin,message.side,message.style,message.verticalFraction); } catch { /* Appearance is optional. */ }
  });
})();
