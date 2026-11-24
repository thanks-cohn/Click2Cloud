import {createLocalPreference} from '../src/chrome/local-preference.mjs';

export const historyV2ViewKey = 'historyV2MetadataVisibilityV1';
export const historyV2FieldLabels = Object.freeze({
  originalFilename:'Original filename', requested:'Requested', completed:'Completed', mime:'File type',
  bytes:'Bytes', proof:'Proof', objectId:'Provider object', saveMethod:'Save method', hostTitle:'Host page',
  sourceUrl:'Source URL', originalUrl:'Original URL', hostUrl:'Host URL', publicUrl:'Public URLs', metadata:'File metadata'
});
const basicFields = ['requested','completed','mime','bytes','proof','objectId','sourceUrl','hostUrl'];
export const historyV2ProviderFields = Object.freeze({
  cloudflare:Object.keys(historyV2FieldLabels),
  google:basicFields, dropbox:basicFields, onedrive:basicFields
});
export const historyV2Providers = Object.freeze({
  cloudflare:'Cloudflare R2', google:'Google Drive', dropbox:'Dropbox', onedrive:'OneDrive'
});
export function normalizeHistoryV2View(value) {
  const providers = {};
  for (const [provider,fields] of Object.entries(historyV2ProviderFields)) {
    const hidden = fields.filter(field => value?.providers?.[provider]?.[field] === false);
    if (hidden.length) providers[provider] = Object.fromEntries(hidden.map(field => [field,false]));
  }
  return {hideNA:value?.hideNA !== false,providers};
}
export function historyV2FieldVisible(settings, provider, field, available) {
  return (available || !settings.hideNA) && settings.providers[provider]?.[field] !== false;
}
export const hasHistoryV2Value = value => value != null && value !== '';
export function createHistoryV2Preference(storage) {
  return createLocalPreference(storage,historyV2ViewKey,normalizeHistoryV2View);
}

export function mountHistoryV2Settings(parent, preference) {
  const section = document.createElement('section');
  section.className = 'history-v2-settings';
  section.innerHTML = `
    <label class="settings-row">Hide N/A fields<input type="checkbox" data-hide-na></label>
    <details><summary>Advanced</summary>${Object.entries(historyV2ProviderFields).map(([provider,fields]) => `
      <details data-history-provider="${provider}"><summary>${historyV2Providers[provider]}</summary>
        ${fields.map(field => `<label class="settings-row">${historyV2FieldLabels[field]}<input type="checkbox" data-field="${field}"></label>`).join('')}
        <button type="button">Restore defaults</button>
      </details>`).join('')}</details><p role="status"></p>`;
  const hideNA = section.querySelector('[data-hide-na]'), feedback = section.querySelector('[role=status]');
  const groups = [...section.querySelectorAll('[data-history-provider]')];
  function paint() {
    const {hideNA:hide,providers} = preference.value;
    hideNA.checked = hide;
    for (const group of groups) {
      const fields = providers[group.dataset.historyProvider];
      for (const control of group.querySelectorAll('[data-field]')) control.checked = fields?.[control.dataset.field] !== false;
    }
  }
  async function save(change) {
    try {
      await preference.update(change);
      feedback.textContent = '';
    } catch { feedback.textContent = 'History preference could not be saved.'; }
    paint();
  }
  hideNA.onchange = () => { const checked = hideNA.checked; void save(value => ({...value,hideNA:checked})); };
  for (const group of groups) {
    const provider = group.dataset.historyProvider;
    group.onchange = event => {
      const {checked,dataset:{field}} = event.target;
      void save(value => ({...value,providers:{...value.providers,[provider]:{...value.providers[provider],[field]:checked}}}));
    };
    group.querySelector('button').onclick = () => void save(value => ({...value,providers:{...value.providers,[provider]:{}}}));
  }
  parent.append(section);
  paint();
  void preference.ready.then(paint);
}
