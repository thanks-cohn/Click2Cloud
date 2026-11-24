export const routes = Object.freeze([
  {id:'explorer',label:'Files',accessible:'File Explorer',pinned:true},
  {id:'remotes',label:'Remotes',pinned:true},
  {id:'queue',label:'Queue',pinned:true},
  {id:'settings',label:'Settings',pinned:true},
  {id:'history',label:'History',pinned:false},
  {id:'screenshot',label:'Screenshots',pinned:false}
].map(Object.freeze));
export const navigationKey = 'shelfNavigationV1';
export const navigationDefaults = Object.freeze(Object.fromEntries(routes.map(route=>[route.id,route.pinned])));
export function navigationPreferences(stored) {
  return Object.fromEntries(routes.map(route=>[route.id,typeof stored?.[route.id]==='boolean'?stored[route.id]:route.pinned]));
}

export function createNavigation({nav,more,menu,storage,onStorage,open}) {
  let preferences = navigationPreferences(), selected = 'remotes', editor;
  const buttons = new Map(routes.map(route=>{
    const button=document.createElement('button');
    button.type='button';
    button.dataset.view=route.id;
    button.textContent=route.label;
    if(route.accessible) button.setAttribute('aria-label',route.accessible);
    button.onclick=()=>open(route.id);
    return [route.id,button];
  }));
  function select(id) {
    selected=id;
    for(const [route,button] of buttons) {
      button.classList.toggle('active',route===id);
      if(route===id) button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    }
  }
  function render() {
    const focus=document.activeElement;
    // One DOM node per route. Keep space for More and avoid narrow clipped buttons.
    const room=Math.max(0,Math.floor((nav.clientWidth-37)/57));
    let pinned=0;
    const top=[],overflow=[];
    for(const route of routes) {
      const button=buttons.get(route.id);
      if(preferences[route.id]&&pinned<room) { pinned++;top.push(button); }
      else overflow.push(button);
    }
    for(const [parent,items,end] of [[nav,top,more.parentElement],[menu,overflow,menu.querySelector('#help-diagnose')]]) {
      let next=end;
      for(const button of items.reverse()) {
        if(parent===menu) button.setAttribute('role','menuitem');
        else button.removeAttribute('role');
        if(button.parentNode!==parent||button.nextElementSibling!==next) parent.insertBefore(button,next);
        next=button;
      }
    }
    select(selected);
    if(focus!==document.activeElement&&[...buttons.values()].includes(focus)) {
      (focus.closest('[hidden]')?more:focus).focus({preventScroll:true});
    }
    if(editor?.isConnected) for(const input of editor.querySelectorAll('[data-pin-route]')) input.checked=preferences[input.dataset.pinRoute];
  }
  const apply = next => { preferences=navigationPreferences(next);render(); };
  render();
  new ResizeObserver(render).observe(nav);
  void storage.get(navigationKey).then(value=>apply(value[navigationKey])).catch(()=>{});
  onStorage?.addListener((changes,area)=>{if(area==='local'&&changes[navigationKey])apply(changes[navigationKey].newValue);});
  async function update(id, pinned) {
    const save=async()=>{
      const previous=navigationPreferences((await storage.get(navigationKey))[navigationKey]);
      const next=id?{...previous,[id]:pinned}:navigationDefaults;
      await storage.set({[navigationKey]:next});
      apply(next);
    };
    return navigator.locks?navigator.locks.request(navigationKey,save):save();
  }
  function mountSettings(parent) {
    const card=document.createElement('section');
    card.className='card';
    card.innerHTML='<h2>Customize Navigation</h2><p>Choose which sections to pin. On narrow screens, extra sections move into More.</p><fieldset><legend>Pin to navigation</legend>'+routes.map(route=>
      `<label><input type="checkbox" data-pin-route="${route.id}"> ${route.label}</label>`).join('')+'</fieldset><button type="button" data-navigation-reset>Reset to Defaults</button><p role="status"></p>';
    parent.append(card);
    editor=card;
    const feedback=card.querySelector('[role=status]');
    const edit=(id,pin)=>void update(id,pin).then(()=>{feedback.textContent='Navigation saved.';},()=>{render();feedback.textContent='Navigation could not be saved.';});
    card.onchange=event=>edit(event.target.dataset.pinRoute,event.target.checked);
    card.querySelector('[data-navigation-reset]').onclick=()=>edit();
    render();
  }
  return {select,mountSettings};
}
