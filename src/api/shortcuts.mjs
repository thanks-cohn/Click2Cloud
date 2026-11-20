export const shortcutStorageKey = 'commandShortcutBindings';
const command = (commandId, label, defaultChord, extra = {}) => Object.freeze({
  commandId, label, defaultChord, category: 'File Explorer', context: 'explorer',
  shortcutEligible: true, ...extra
});
export const uiCommands = Object.freeze([
  command('explorer.resetPanelSplit', 'Cycle Explorer divider', 'Ctrl+Shift+F9', {effects: 'Local Explorer layout'}),
  command('explorer.focusSearch', 'Focus filename Search', 'Ctrl+Shift+F7', {effects: 'Local focus', requires: 'activeDirectory'})
]);
export const apiShortcutMetadata = Object.freeze({
  refreshExplorer: command('file.refreshExplorer', 'Refresh current folder', null, {
    requires: 'activeDirectory', parameterBindings: {source: 'currentAuthorizedFolder'},
    effects: 'Read the current folder from the provider'
  })
});
export function listCommands(tools) {
  return [
    ...uiCommands.map(item => ({...item, kind: 'ui'})),
    ...tools.filter(tool => tool.command?.shortcutEligible).map(tool => ({
      ...tool.command, kind: 'api', method: tool.name, permission: tool.scope
    }))
  ];
}

const modifiers = ['Ctrl', 'Alt', 'Shift', 'Meta'];
const reserved = new Set([
  'Ctrl+Shift+A','Ctrl+Shift+B','Ctrl+Shift+C','Ctrl+Shift+D','Ctrl+Shift+I','Ctrl+Shift+J',
  'Ctrl+Shift+L','Ctrl+Shift+M','Ctrl+Shift+N','Ctrl+Shift+O','Ctrl+Shift+P','Ctrl+Shift+Q',
  'Ctrl+Shift+R','Ctrl+Shift+S','Ctrl+Shift+T','Ctrl+Shift+U','Ctrl+Shift+V','Ctrl+Shift+W',
  'Ctrl+Shift+Y','Ctrl+Shift+Delete','Ctrl+Shift+F5','Ctrl+Shift+F6'
]);
export function normalizeChord(value) {
  if (typeof value !== 'string') return null;
  const parts = value.split('+').map(part => part.trim());
  const key = parts.pop()?.toUpperCase();
  const names = parts.map(part => modifiers.find(name => name.toLowerCase() === part.toLowerCase() ||
    (name === 'Ctrl' && part.toLowerCase() === 'control')));
  if (names.includes(undefined) || new Set(names).size !== names.length || names.includes('Meta')) return null;
  const combination = modifiers.filter(name => names.includes(name)).join('+');
  // Ctrl+Alt may be AltGr. Alt-only and OS-managed Meta chords also overlap platform shortcuts.
  if (!['Ctrl+Shift', 'Alt+Shift'].includes(combination) || !/^(?:[A-Z0-9]|F(?:[1-9]|1[0-2]))$/.test(key)) return null;
  if (combination === 'Alt+Shift' && !/^[A-Z]$/.test(key)) return null;
  const chord = combination + '+' + key;
  return reserved.has(chord) ? null : chord;
}
export function eventChord(event) {
  if (event.isComposing || event.getModifierState?.('AltGraph')) return null;
  const keys = [event.ctrlKey, event.altKey, event.shiftKey, event.metaKey];
  return normalizeChord([...modifiers.filter((_, index) => keys[index]), event.key].join('+'));
}
export function defaultBindings(commands) {
  return Object.fromEntries(commands.map(item => [item.commandId, item.defaultChord]));
}
export function resolveBindings(commands, record) {
  const defaults = defaultBindings(commands);
  if (record?.version !== 1 || !record.overrides || typeof record.overrides !== 'object' || Array.isArray(record.overrides)) return defaults;
  const result = {...defaults};
  for (const id of Object.keys(defaults)) {
    if (!Object.hasOwn(record.overrides, id)) continue;
    const value = record.overrides[id], chord = normalizeChord(value);
    if (chord || value === null) result[id] = chord;
  }
  const used = Object.values(result).filter(Boolean);
  return new Set(used).size === used.length ? result : defaults;
}

export function createShortcutStore(storage, commands) {
  let tail = Promise.resolve();
  const defaults = defaultBindings(commands);
  const read = async () => resolveBindings(commands, (await storage.get(shortcutStorageKey))[shortcutStorageKey]);
  function update(transform) {
    const next = tail.then(async () => {
      const bindings = transform(await read());
      const overrides = Object.fromEntries(Object.entries(bindings).filter(([id, chord]) => defaults[id] !== chord));
      await storage.set({[shortcutStorageKey]: {version: 1, overrides}});
      return bindings;
    });
    tail = next.catch(() => {});
    return next;
  }
  function reject(code) { throw Object.assign(Error(code), {code}); }
  return Object.freeze({
    read,
    set(commandId, value) {
      return update(bindings => {
        if (!Object.hasOwn(defaults, commandId)) reject('SHORTCUT_COMMAND_UNKNOWN');
        const chord = normalizeChord(value);
        if (value !== null && !chord) reject('SHORTCUT_INVALID_OR_RESERVED');
        if (chord && Object.entries(bindings).some(([id, bound]) => id !== commandId && bound === chord)) reject('SHORTCUT_COLLISION');
        return {...bindings, [commandId]: chord};
      });
    },
    reset: () => update(() => defaults)
  });
}
