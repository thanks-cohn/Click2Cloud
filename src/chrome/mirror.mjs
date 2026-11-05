// Human and agent mirrors consume the canonical rows verbatim. Rendering uses
// textContent exclusively, so hostile folder labels cannot create markup.
export function mirrorRows(spec) {
  return Object.freeze(spec.rows.map(row => Object.freeze({ itemId: row.id, parentId: row.parentId, siblingIndex: row.siblingIndex, label: row.label, type: row.type, role: row.role, contexts: row.contexts, enabled: row.enabled, visible: row.visible, actionId: row.actionId })));
}
export function renderMenuMirror(document, container, spec, onSelect) {
  container.replaceChildren();
  const lists = new Map([[null, container]]);
  for (const row of spec.rows) {
    const parent = lists.get(row.parentId ?? null);
    if (!parent) throw new Error('INVALID_MENU_PARENT');
    const item = document.createElement('li');
    item.dataset.itemId = row.id;
    item.hidden = row.visible === false;
    if (row.type === 'separator') {
      item.append(document.createElement('hr'));
    } else {
      const label = document.createElement(row.role === 'save' ? 'button' : 'span');
      label.textContent = row.label;
      if (row.role === 'save') {
        label.disabled = row.enabled === false;
        label.addEventListener('click', () => onSelect?.({ itemId: row.id, generation: spec.generation, context: row.contexts[0] }));
      }
      item.append(label);
    }
    const children = document.createElement('ul');
    item.append(children); lists.set(row.id, children); parent.append(item);
  }
}
