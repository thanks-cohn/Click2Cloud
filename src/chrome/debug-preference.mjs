// Presentation only. This preference grants no diagnostic or cloud authority.
export function createDebugPreference(chrome){
 let enabled=false,epoch=0,closed=false;const listeners=new Set();
 const publish=value=>{enabled=value===true;for(const listener of listeners)try{listener(enabled);}catch{}};
 const changed=(changes,area)=>{if(!closed&&area==='local'&&Object.hasOwn(changes,'uiDebugMode')){epoch++;publish(changes.uiDebugMode.newValue===true);}};
 chrome.storage?.onChanged?.addListener(changed);
 const start=epoch,ready=Promise.resolve().then(()=>chrome.storage?.local?.get('uiDebugMode')).then(value=>{if(!closed&&epoch===start)publish(value?.uiDebugMode===true);return enabled;},()=>enabled);
 return Object.freeze({get enabled(){return enabled;},ready,
  async set(value){if(typeof value!=='boolean')throw TypeError('Debug Mode must be boolean.');if(closed)throw Error('DEBUG_PREFERENCE_CLOSED');const writeEpoch=++epoch;try{if(!chrome.storage?.local?.set)throw Error('DEBUG_PREFERENCE_UNAVAILABLE');await chrome.storage.local.set({uiDebugMode:value});if(!closed&&epoch===writeEpoch)publish(value);}catch(error){if(!closed&&epoch===writeEpoch)publish(false);throw error;}return enabled;},
  subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);},
  close(){closed=true;listeners.clear();chrome.storage?.onChanged?.removeListener?.(changed);}
 });
}
