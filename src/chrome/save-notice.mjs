const notificationId = 'redown-verified-save';
const providers = Object.freeze({cloudflare:'Cloudflare R2',google:'Google Drive',dropbox:'Dropbox',onedrive:'OneDrive'});

export function createClosedShelfSaveNotice({chrome, preferences, isClosed}) {
  let nextProvider, pending, expiry, version = 0, display = 0, showing = false;
  let updates = Promise.resolve();
  function queue(work) { updates = updates.then(work).catch(()=>{}); }
  async function clear() {
    if (!showing) return;
    await chrome.notifications?.clear?.(notificationId);
    showing = false;
  }
  function dismiss() {
    version++;
    clearTimeout(pending);
    clearTimeout(expiry);
    nextProvider = pending = expiry = undefined;
    queue(clear);
  }
  preferences.subscribe(value => { if (!value.notifications) dismiss(); });

  function saved(provider) {
    if (!preferences.value.notifications || !Object.hasOwn(providers,provider) || !chrome.notifications?.create) return;
    nextProvider = provider;
    if (pending) return;
    pending = setTimeout(() => {
      pending = undefined;
      const label = providers[nextProvider], ticket = version;
      queue(async () => {
        await preferences.ready;
        if (!preferences.value.notifications || ticket !== version || !await isClosed() || ticket !== version) return;
        await chrome.notifications.create(notificationId,{
          type:'basic',iconUrl:chrome.runtime.getURL('extension/icons/redown-128.png'),
          title:'Saved!',message:`at ${label}`,requireInteraction:false,silent:true
        });
        showing = true;
        const generation = ++display;
        if (ticket !== version) return; // A queued dismissal owns the clear.
        clearTimeout(expiry);
        expiry = setTimeout(() => queue(() => { if (generation === display) return clear(); }),4200);
      });
    },140);
  }
  return {saved,dismiss};
}
