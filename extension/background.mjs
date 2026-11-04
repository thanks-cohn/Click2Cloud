import { createChromeRegistrar } from '../src/chrome/registrar.mjs';
import { createDebugHost } from '../src/chrome/debug-host.mjs';
import { createDiagnostics } from '../src/glaciaring/index.mjs';
import { createAgentDebugApi } from '../src/glaciaring/agent-api.mjs';
import { resolveMenuAction } from '../src/core/action-resolver.mjs';

const diagnostics = createDiagnostics();
const menus = new Map();
let currentMenu = null;
let currentReady = Promise.resolve({ state: 'blocked', code: 'MENU_NOT_CONFIGURED' });
const registrar = createChromeRegistrar({ chrome, sink: diagnostics,
  persist: value => chrome.storage.local.set({ glaciaringRegistration: value }),
  onOutcome(result) {
    // Essential user failure feedback does not depend on diagnostics/debug mode.
    const failed = result?.state !== 'completed';
    void chrome.action.setBadgeText({ text: failed ? '!' : '' });
    void chrome.action.setTitle({ title: failed ? 'Save unavailable: connect an authorized provider host.' : 'Click2Cloud Glaciaring Lab' });
    void chrome.storage.local.set({ glaciaringLastSaveOutcome: { state: result?.state ?? 'failed', code: result?.code ?? 'SAVE_FAILED' } });
  }
});
const getMenu = generation => generation == null ? currentMenu : menus.get(generation) ?? null;
const getEvidence = () => registrar.inspect();
const api = createAgentDebugApi({ diagnostics, getMenu, getEvidence, resolveAction: resolveMenuAction, authorize: (_request, context) => context?.grant ?? false });
const host = createDebugHost({ runtime: chrome.runtime, api, getMenu, getEvidence });
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  host.request(message, sender).then(sendResponse, () => sendResponse({ version: 1, state: 'failed', code: 'DEBUG_REQUEST_FAILED' }));
  return true;
});
async function applyStoredMenu(recovery = false) {
  const value = await chrome.storage.local.get('glaciaringMenu');
  const spec = value.glaciaringMenu;
  if (!spec) return { state: 'blocked', code: 'MENU_NOT_CONFIGURED' };
  currentMenu = spec; menus.set(spec.generation, spec);
  while (menus.size > 8) menus.delete(menus.keys().next().value);
  return recovery ? registrar.recover(spec) : registrar.apply(spec);
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.glaciaringMenu) currentReady = applyStoredMenu();
});
currentReady = applyStoredMenu(true);
// Local DevTools/native-test inspection only; this object exposes no write,
// provider, auth, upload or diagnostic-grant operation to extension messages.
Object.defineProperty(globalThis, 'glaciaringLab', { value: Object.freeze({ inspect: () => registrar.inspect(), getMenu, get ready() { return currentReady; } }) });
