export const navigationDefaults = Object.freeze({
  explorer:'main', remotes:'main', queue:'main', history:'more', screenshot:'more', settings:'more'
});
const preference = 'shelfNavigationPlacementV1';
export function normalizeNavigation(value) {
  return Object.fromEntries(Object.entries(navigationDefaults).map(([id, fallback]) => {
    const placement = value?.[id];
    return [id, ['main','more'].includes(placement) || placement === 'gone' && id !== 'settings' ? placement : fallback];
  }));
}

export function installNavigation({header, menu, open, storage = chrome.storage}) {
  const buttons = new Map([...header.querySelectorAll('[data-view]')].filter(button =>
    Object.hasOwn(navigationDefaults,button.dataset.view)).map(button=>[button.dataset.view,button]));
  const more = header.querySelector('.header-more');
  let placements = normalizeNavigation(), editor, writes = Promise.resolve();
  function paint(value) {
    placements = normalizeNavigation(value);
    const main = [], overflow = [];
    for (const [id,button] of buttons) {
      const place = placements[id];
      button.hidden = place === 'gone';
      button.removeAttribute('role');
      if (place === 'more') {
        button.setAttribute('role','menuitem');
        overflow.push(button);
      } else main.push(button);
    }
    more.before(...main);
    menu.prepend(...overflow);
    editor?.(placements);
  }
  for (const [id,button] of buttons) button.onclick = () => open(id);
  const ready = storage?.local?.get(preference).then(saved => {
    const value = saved[preference];
    paint(value);
    if (value?.settings === 'gone') return storage.local.set({[preference]:placements});
  }).catch(() => {});
  storage?.onChanged?.addListener((changes, area) => {
    if (area === 'local' && changes[preference]) paint(changes[preference].newValue);
  });
  function update(fn) {
    writes = writes.catch(()=>{}).then(async () => {
      await ready;
      const saved = await storage.local.get(preference);
      const value = normalizeNavigation(fn(normalizeNavigation(saved[preference])));
      await storage.local.set({[preference]:value});
      paint(value);
    });
    return writes;
  }
  return {
    ready,
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
        const row = document.createElement('label'), select = document.createElement('select');
        row.className = 'settings-row';
        select.setAttribute('aria-label',button.textContent.trim());
        row.append(button.textContent.trim(), select);
        select.add(new Option('Main tab','main'));
        select.add(new Option('More menu','more'));
        if (id !== 'settings') select.add(new Option('Gone','gone'));
        select.onchange = () => { const place = select.value; save(value=>({...value,[id]:place})); };
        fields.set(id,select);
        list.append(row);
      }
      editor = value => { if (section.isConnected) for (const [id,select] of fields) select.value=value[id]; };
      section.querySelector('button').onclick = () => save(()=>navigationDefaults);
      parent.append(section);
      editor(placements);
    }
  };
}
