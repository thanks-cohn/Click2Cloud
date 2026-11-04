import { renderMenuMirror } from '../src/chrome/mirror.mjs';
const status = document.querySelector('#status');
const menu = document.querySelector('#menu');
const exportButton = document.querySelector('#export');
let exportCursor = null;
let exportPage = 0;
async function request(method, args) { return chrome.runtime.sendMessage({ version: 1, method, args }); }
document.querySelector('#authorize').onclick = async event => {
  if (!event.isTrusted) return;
  const authorized = await chrome.runtime.sendMessage({ version: 1, method: 'authorizeDebug', userGesture: true });
  if (authorized.state !== 'completed') { status.textContent = authorized.code; return; }
  exportButton.disabled = false;
  const result = await request('inspectCanonicalMenu');
  if (result.state !== 'completed') { status.textContent = result.code ?? 'Inspection unavailable'; return; }
  const spec = result.data.menu;
  if (!spec) { status.textContent = 'No desired menu has been configured.'; return; }
  renderMenuMirror(document, menu, spec, async selection => {
    const value = await request('simulateMenuAction', { itemId: selection.itemId, generation: selection.generation, fixtureContext: { context: selection.context, authorizedTargets: [spec.rows.find(row => row.id === selection.itemId).target] } });
    document.querySelector('#selection').textContent = JSON.stringify(value, null, 2);
  });
  status.textContent = `Generation ${spec.generation}. Native API evidence is separate from independent browser observation.`;
};
document.querySelector('#revoke').onclick = async () => { await request('revokeDebug'); exportButton.disabled = true; exportCursor = null; exportPage = 0; menu.replaceChildren(); document.querySelector('#selection').textContent = ''; status.textContent = 'Diagnostics closed.'; };

exportButton.onclick = async event => {
  if (!event.isTrusted) return;
  const authorized = await chrome.runtime.sendMessage({ version: 1, method: 'authorizeExport', userGesture: true });
  if (authorized.state !== 'completed') { status.textContent = authorized.code; return; }
  const result = await request('exportReceipt', { limit: 64, ...(exportCursor ? { cursor: exportCursor } : {}) });
  if (!result.export?.authorized) { status.textContent = result.code ?? result.result?.code ?? 'Export unavailable'; return; }
  const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = `glaciaring-receipt-page-${++exportPage}.json`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  exportCursor = result.cursor;
  exportButton.textContent = exportCursor ? 'Export next sanitized receipt page' : 'Export new sanitized receipt';
  if (!exportCursor) exportPage = 0;
  status.textContent = `Sanitized receipt page saved locally. Evidence is ${result.completeness}; ${result.gaps.length} disclosed gaps. ${exportCursor ? 'More evidence remains; export the next page.' : 'This snapshot has no further pages.'}`;
};
