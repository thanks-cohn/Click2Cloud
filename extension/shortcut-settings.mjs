import {shelfHistoryCommand,shelfExplorerSearchCommand} from '../src/chrome/provider-panel.mjs';
import {chromeCommandBindings,openChromeShortcuts} from '../src/chrome/command-bindings.mjs';
import {eventChord, defaultBindings, shortcutStorageKey, uiCommands} from '../src/api/shortcuts.mjs';
import {screenshotCommands} from '../src/screenshot/rules.mjs';

const fixedExplorerKeys=[
 ['F2','Rename selected item or preview image'],['Delete','Delete selected items'],
 ['Ctrl+C','Copy selected items'],['Ctrl+X','Cut selected items'],['Ctrl+V','Paste into current folder'],
 ['F5','Refresh current folder'],['Backspace','Go to parent folder'],['Ctrl+Shift+N','New Folder'],
 ['Letters and numbers','Select matching name'],['Ctrl+A','Select all loaded items'],
 ['Arrow keys, Home, End, Page Up, Page Down','Navigate items'],
 ['Shift / Ctrl with navigation','Extend / adjust selection'],
 ['Enter','Open item'],['Shift+F10 / Menu','Open item menu'],['Escape','Dismiss or clear selection'],
 ['Left / Right on a column separator','Resize a Details column'],
 ['Left / Right in preview','Previous / next image'],['+ / − in immersive view','Zoom image']
];
const chromeShortcuts=[
 [shelfHistoryCommand,'Shelf ↔ History'],
 [shelfExplorerSearchCommand,'Open File Explorer Search'],
 [screenshotCommands[0],'Capture screenshot to cloud'],
 [screenshotCommands[1],'Capture screenshot to cloud (second shortcut)']
];

export function installShortcuts({invoke, context, runUI, runAPI, updateReferences}) {
  let commands = uiCommands, bindings = defaultBindings(commands), editor, refreshVersion = 0;
  async function refresh() {
    const ticket = ++refreshVersion;
    const [catalog, preferences] = await Promise.all([invoke('listCommands'), invoke('getShortcutBindings')]);
    if (ticket !== refreshVersion) return;
    commands = catalog.commands;
    apply(preferences.bindings);
  }
  function apply(value) {
    bindings = value;
    updateReferences(bindings);
    editor?.();
  }
  chrome.storage?.onChanged?.addListener((changes, area) => {
    if (area === 'local' && changes[shortcutStorageKey]) void refresh().catch(() => {});
  });
  void refresh().catch(() => {});
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.repeat || event.isComposing ||
        event.target.closest?.('dialog,[role=menu],#toolbar-overflow') ||
        document.querySelector('dialog[open],#context:not([hidden]),#header-menu:not([hidden])')) return;
    const chord = eventChord(event);
    if (!chord) return;
    const active = context();
    const selected = commands.find(item => bindings[item.commandId] === chord && item.context === active.view &&
      (!item.requires || active[item.requires]));
    if (!selected) return;
    const editing=event.target.closest?.('input,select,textarea,[contenteditable]');
    if(editing&&!(editing.id==='filename-search'&&selected.commandId==='explorer.focusSearch'))return;
    if (selected.kind === 'api' ? runAPI(selected) : runUI(selected.commandId)) event.preventDefault();
  });
  return {
    attachReferences: () => updateReferences(bindings),
    mount(parent) {
      const card = document.createElement('section');
      card.className = 'card';
      card.innerHTML = '<h2>Keyboard Shortcuts</h2><h3>Chrome-wide</h3><div class="chrome-shortcut-rows"></div><p data-chrome-shortcut-status role="status"></p><h3>File Explorer only</h3><div class="shortcut-rows"></div><button type="button" class="shortcut-reset">Restore defaults</button><p role="status" class="shortcut-feedback"></p><div class="fixed-shortcut-rows"></div>';
      parent.append(card);
      const chromeRows=card.querySelector('.chrome-shortcut-rows'),chromeStatus=card.querySelector('[data-chrome-shortcut-status]');
      for(const [id,text] of chromeShortcuts){
        const row=document.createElement('div');
        row.className='settings-row shortcut-row';
        const label=document.createElement('span'),key=document.createElement('kbd'),change=document.createElement('button');
        label.textContent=text;key.dataset.chromeKey=id;key.textContent='Checking Chrome…';
        if(id===shelfHistoryCommand){key.dataset.historyKey='';change.dataset.changeHistory='';}
        change.type='button';change.textContent='Change shortcut';change.setAttribute('aria-label','Change Chrome shortcut for '+text);
        change.onclick=()=>void openChromeShortcuts(chrome).catch(()=>{chromeStatus.textContent='Open chrome://extensions/shortcuts in Chrome.';});
        row.append(label,key,change);chromeRows.append(row);
      }
      async function readChromeKeys(){
        let bindings;
        try{bindings=await chromeCommandBindings(chrome);}catch{/* Chrome did not provide bindings. */}
        for(const key of chromeRows.querySelectorAll('[data-chrome-key]'))
          key.textContent=bindings?(bindings.get(key.dataset.chromeKey)??'Unassigned'):'Unavailable';
      }
      void readChromeKeys();
      const refreshOnFocus=()=>{if(card.isConnected)void readChromeKeys();else window.removeEventListener('focus',refreshOnFocus);};
      window.addEventListener('focus',refreshOnFocus);
      const fixed=card.querySelector('.fixed-shortcut-rows');
      for(const [chord,text] of fixedExplorerKeys){
        const row=document.createElement('div');
        row.className='settings-row shortcut-row';
        const label=document.createElement('span'),key=document.createElement('kbd'),status=document.createElement('small');
        label.textContent=text;key.textContent=chord;status.textContent='Fixed / Not customizable';
        row.append(label,key,status);fixed.append(row);
      }
      const rows = card.querySelector('.shortcut-rows'), feedback = card.querySelector('.shortcut-feedback');
      let capture, busy = false, restoreFocus;
      const button = (label, action, name = label) => {
        const element = document.createElement('button');
        element.type = 'button';
        element.textContent = label;
        element.setAttribute('aria-label', name);
        element.onclick = action;
        return element;
      };
      function render() {
        if (!card.isConnected || capture || busy) return;
        rows.replaceChildren(...commands.map(item => {
          const row = document.createElement('div'), label = document.createElement('span'), key = document.createElement('kbd');
          row.className = 'settings-row shortcut-row';
          label.textContent = item.label;
          key.textContent = bindings[item.commandId] ?? 'Unassigned';
          const change = button('Change', () => begin(item, row), 'Change shortcut for ' + item.label);
          row.append(label, key, change);
          if (restoreFocus === item.commandId) queueMicrotask(() => change.focus());
          return row;
        }));
        restoreFocus = null;
      }
      editor = render;
      render();
      async function save(method, params) {
        busy = true;
        try {
          const result = await invoke(method, params);
          capture = null;
          feedback.textContent = method === 'resetShortcutBindings' ? 'Default shortcuts restored.' : 'Shortcut saved.';
          apply(result.bindings);
        } catch (error) {
          feedback.textContent = ({
            SHORTCUT_COLLISION: 'This shortcut is already assigned.',
            SHORTCUT_INVALID_OR_RESERVED: 'Choose an available Ctrl+Shift or Alt+Shift combination.'
          })[error.code] ?? 'Could not save the shortcut. Your previous bindings are still active.';
        } finally { busy = false; render(); }
      }
      function begin(item, row) {
        if (busy || capture) return;
        capture = item.commandId;
        restoreFocus = capture;
        const control = document.createElement('input');
        control.readOnly = true;
        control.placeholder = 'Press your new shortcut…';
        control.setAttribute('aria-label', 'Press your new shortcut for ' + item.label);
        const cancel = () => { if (busy) return; capture = null; feedback.textContent = 'Change cancelled.'; render(); };
        const commit = button('Save', () => { if (!busy && control.value) void save('setShortcutBinding', {commandId: item.commandId, chord: control.value}); });
        commit.disabled = true;
        control.onkeydown = event => {
          if (event.key === 'Tab' || event.isComposing) return;
          event.stopPropagation();
          event.preventDefault();
          if (busy || event.repeat) return;
          if (event.key === 'Escape') { cancel(); return; }
          if (['Control','Alt','Shift','Meta'].includes(event.key)) return;
          if (event.key === 'Enter' && !commit.disabled) { commit.click(); return; }
          const chord = eventChord(event);
          control.value = chord ?? '';
          commit.disabled = !chord;
          feedback.textContent = chord ? 'Shortcut: ' + chord : 'Choose an available Ctrl+Shift or Alt+Shift combination.';
        };
        for(const action of rows.querySelectorAll('button'))action.disabled=true;
        row.replaceChildren(control, commit, button('Cancel', cancel));
        control.focus();
      }
      card.querySelector('.shortcut-reset').onclick = () => {
        if (busy) return;
        if (commands.some(item => bindings[item.commandId] !== item.defaultChord) && !confirm('Restore default keyboard shortcuts?')) return;
        capture = null;
        void save('resetShortcutBindings', {});
      };
      void refresh().catch(() => {});
    }
  };
}
