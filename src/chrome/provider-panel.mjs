// One compact attention surface. Ready saves never enter this navigation owner.
export async function openProviderPanel(chrome,provider='cloudflare'){
 if(provider==='manage-destinations')return chrome.tabs.create({url:chrome.runtime.getURL('extension/app.html')+'#manage-destinations'});
 if(!['cloudflare','google-drive','dropbox','onedrive'].includes(provider))throw Error('PROVIDER_ACTION_INVALID');
 const url=chrome.runtime.getURL('extension/connect.html')+'#'+provider;
 return chrome.windows?.create?chrome.windows.create({url,type:'popup',width:420,height:560,focused:true}):chrome.tabs.create({url});
}
