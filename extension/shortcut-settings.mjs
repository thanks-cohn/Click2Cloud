import {shelfHistoryCommand} from '../src/chrome/provider-panel.mjs';
import {chromeCommandBindings,openChromeShortcuts} from '../src/chrome/command-bindings.mjs';
import {eventChord, defaultBindings, shortcutStorageKey, uiCommands} from '../src/api/shortcuts.mjs';

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
        event.target.closest?.('input,select,textarea,[contenteditable],dialog,[role=menu],#toolbar-overflow') ||
        document.querySelector('dialog[open],#context:not([hidden]),#header-menu:not([hidden])')) return;
    const chord = eventChord(event);
    if (!chord) return;
    const active = context();
    const selected = commands.find(item => bindings[item.commandId] === chord && item.context === active.view &&
      (!item.requires || active[item.requires]));
    if (!selected) return;
    if (selected.kind === 'api' ? runAPI(selected) : runUI(selected.commandId)) event.preventDefault();
  });
  return {
    attachReferences: () => updateReferences(bindings),
    mount(parent) {
      const card = document.createElement('section');
      card.className = 'card';
      card.innerHTML = '<h2>Keyboard Shortcuts</h2><div class="settings-row shortcut-row"><span>Shelf ↔ History</span><kbd data-history-key>Checking Chrome…</kbd><button data-change-history type="button">Change shortcut</button></div><p data-chrome-shortcut-status role="status"></p><p>Explorer shortcuts work while Click2Cloud has focus.</p><div class="shortcut-rows"></div><button type="button" class="shortcut-reset">Restore defaults</button><p role="status" class="shortcut-feedback"></p>';
      parent.append(card);
      const historyKey=card.querySelector('[data-history-key]'),chromeStatus=card.querySelector('[data-chrome-shortcut-status]');
      async function readHistoryKey(){
        try{historyKey.textContent=(await chromeCommandBindings(chrome)).get(shelfHistoryCommand)??'Unassigned';}
        catch{historyKey.textContent='Unavailable';}
      }
      card.querySelector('[data-change-history]').onclick=()=>void openChromeShortcuts(chrome).catch(()=>{chromeStatus.textContent='Open chrome://extensions/shortcuts in Chrome.';});
      void readHistoryKey();
      const refreshOnFocus=()=>{if(card.isConnected)void readHistoryKey();else window.removeEventListener('focus',refreshOnFocus);};
      window.addEventListener('focus',refreshOnFocus);
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
