export const navigationDefaults = Object.freeze({
  explorer:'main', remotes:'main', queue:'main', history:'more', screenshot:'more', settings:'more'
});
const preference = 'shelfNavigationPlacementV1';
export const maxMainTabs = 4;
const knownTabs = Object.keys(navigationDefaults);
const mainTabs = value => value.order.filter(id => value[id] === 'main');
export function normalizeNavigation(value) {
  const previous = Object.keys(value ?? {}).filter(id => Object.hasOwn(navigationDefaults,id));
  // Legacy settings projected the built-in order. For overfull records keep
  // their recoverable order. An explicit array survives storage key sorting.
  const savedOrder = Array.isArray(value?.order) ? value.order.filter(id => knownTabs.includes(id)) :
    previous.filter(id => value[id] === 'main').length > maxMainTabs ? previous : knownTabs;
  const order = [...new Set([...savedOrder,...knownTabs])];
  let count = 0;
  return Object.fromEntries(order.map(id => {
    const placement = value?.[id];
    const next = ['main','more'].includes(placement) || placement === 'gone' && id !== 'settings'
      ? placement : navigationDefaults[id];
    return [id, next === 'main' && ++count > maxMainTabs ? 'more' : next];
  }));
}
function normalizePreference(value) {
  const placements = normalizeNavigation(value);
  return {...placements,order:Object.keys(placements)};
}

export function installNavigation({header, menu, more, open, storage = chrome.storage}) {
  const buttons = new Map([...header.querySelectorAll('[data-view]'),...menu.querySelectorAll('[data-view]')].filter(button =>
    Object.hasOwn(navigationDefaults,button.dataset.view)).map(button=>[button.dataset.view,button]));
  let placements = normalizePreference(), editor, writes = Promise.resolve();
  function fit() {
    const focused = header.contains(document.activeElement) || menu.contains(document.activeElement)
      ? document.activeElement : null;
    const main = mainTabs(placements).map(id => buttons.get(id));
    for (const [id,button] of buttons) button.hidden = placements[id] === 'gone';
    header.replaceChildren(...main);
    const edge = header.getBoundingClientRect().right;
    const last = main.findIndex(button => button.getBoundingClientRect().right > edge + 0.5);
    const visible = new Set(last < 0 ? main : main.slice(0,last));
    const overflow = [];
    for (const id of placements.order) {
      const button = buttons.get(id);
      if (visible.has(button)) button.removeAttribute('role');
      else {
        button.setAttribute('role','menuitem');
        overflow.push(button);
      }
    }
    menu.prepend(...overflow);
    if (focused) (focused.hidden || menu.hidden && menu.contains(focused) ? more : focused).focus({preventScroll:true});
  }
  function paint(value) {
    placements = normalizePreference(value);
    fit();
    editor?.(placements);
  }
  fit();
  new ResizeObserver(fit).observe(header);
  for (const [id,button] of buttons) button.onclick = () => open(id);
  const locked = work => globalThis.navigator?.locks ? navigator.locks.request(preference,work) : work();
  const needsRepair = saved => saved && (JSON.stringify(saved.order) !== JSON.stringify(placements.order) ||
    knownTabs.some(id => saved[id] !== placements[id]));
  function reconcile() {
    return locked(async () => {
      const saved = (await storage?.local?.get(preference))?.[preference];
      paint(saved);
      if (needsRepair(saved)) await storage.local.set({[preference]:placements});
    });
  }
  const ready = Promise.resolve().then(reconcile).catch(() => {});
  storage?.onChanged?.addListener((changes, area) => {
    if (area === 'local' && changes[preference]) {
      const next = changes[preference].newValue;
      paint(next);
      if (needsRepair(next)) void reconcile().catch(() => {});
    }
  });
  function update(fn) {
    writes = writes.catch(()=>{}).then(async () => {
      await ready;
      await locked(async () => {
        const saved = await storage.local.get(preference);
        const value = normalizePreference(fn(normalizePreference(saved[preference])));
        await storage.local.set({[preference]:value});
        paint(value);
      });
    });
    return writes;
  }
  return {
    ready, fit,
    mount(parent) {
      const section = document.createElement('section');
      section.className = 'card';
      section.innerHTML = '<h2>Customize Navigation</h2><div></div><button type="button">Reset to Defaults</button><p role="status"></p>';
      const list = section.querySelector('div'), feedback = section.querySelector('[role=status]');
      const fields = new Map();
      const save = fn => void update(fn).then(()=>{ feedback.textContent = ''; },()=>{
        editor?.(placements);feedback.textContent = 'Navigation preference could not be saved.';
      });
      for (const [id,button] of buttons) {
        const row = document.createElement('div'), select = document.createElement('select');
        const label = document.createElement('label'), controls = document.createElement('div');
        row.className = 'settings-row';
        controls.className = 'navigation-placement-controls';
        const name = button.textContent.trim();
        select.id = 'placement-'+id;
        label.htmlFor = select.id;
        label.textContent = name;
        const main = new Option('Main tab','main');
        select.add(main);
        select.add(new Option('More menu','more'));
        if (id !== 'settings') select.add(new Option('Gone','gone'));
        select.onchange = () => {
          const place = select.value;
          save(value => {
            if (place !== 'main') return {...value,[id]:place};
            if (value[id] === 'main' || mainTabs(value).length >= maxMainTabs) return value;
            return {...value,[id]:place,order:[...value.order.filter(key=>key!==id),id]};
          });
        };
        const move = (direction, glyph, title) => {
          const control = document.createElement('button');
          control.type = 'button';control.textContent = glyph;
          control.title = title+' '+name;
          control.setAttribute('aria-label',control.title);
          control.onclick = () => save(value => {
            const group = mainTabs(value), next = group[group.indexOf(id)+direction];
            if (value[id] !== 'main' || !next) return value;
            return {...value,order:value.order.map(key=>key===id?next:key===next?id:key)};
          });
          return control;
        };
        const earlier=move(-1,'↑','Move earlier'),later=move(1,'↓','Move later');
        controls.append(select,earlier,later);
        row.append(label,controls);
        fields.set(id,{select,main,earlier,later});
        list.append(row);
      }
      editor = value => {
        if (!section.isConnected) return;
        const group = mainTabs(value);
        for (const [id,{select,main,earlier,later}] of fields) {
          const index = group.indexOf(id);
          select.value = value[id];
          main.disabled = index < 0 && group.length >= maxMainTabs;
          earlier.hidden = later.hidden = index < 0;
          earlier.disabled = index <= 0;
          later.disabled = index === group.length-1;
        }
      };
      section.querySelector('button').onclick = () => save(()=>navigationDefaults);
      parent.append(section);
      editor(placements);
    }
  };
}
