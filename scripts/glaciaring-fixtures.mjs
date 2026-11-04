// Public synthetic data only. These fixtures contain no actual account, object or source information.
export function target(prefix = '', accountId = 'fixture-account-a', provider = 'cloudflare') {
  return { provider, connectionId: 'fixture-connection-' + provider, accountId, bucketName: 'fixture-bucket', prefix };
}
export function menuFixture({ count = 300, mode = 'depth', generation = 42, partial = false, deep = false, multi = true } = {}) {
  const folders = Array.from({ length: count }, (_, i) => deep && i < 16
    ? Array.from({length:i+1}, (_, n) => 'level-' + String(n + 1).padStart(2, '0')).join('/') + '/'
    : 'branch-' + String(Math.floor(i / 12)).padStart(4,'0') + '/folder-' + String(i).padStart(4,'0') + '/');
  const primary = target();
  const destinations = folders.map((prefix, i) => ({id:'fixture-placement-' + i, label:'Destination ' + String(i).padStart(4,'0'), target:target(prefix)}));
  const scopes = [{...primary,folders,authorized:true,workerReady:true,complete:!partial,stale:false}];
  if (multi) scopes.push({...target('', 'fixture-account-b'),folders:['other/','other/leaf/'],authorized:true,workerReady:false,complete:true,stale:false});
  return { mode, generation, revision: 3, defaultTarget:primary, inventory: {revision:7,scopes},
    configs: {
      simple: {revision: 2,destinations,defaultTarget:primary},
      nested: {revision: 5,destinations:destinations.filter((_,i)=>i % 3 === 0),defaultTarget:primary},
      depth: {revision: 8,scopes:[{target:primary,maxDepth:20}],defaultTarget:primary}
    }, flatProviders: multi ? ['google-drive','dropbox','onedrive'].map((provider, index) => ({id:provider,label:['Google Drive','Dropbox','OneDrive'][index],target:target('', 'fixture-peer',provider),enabled:true})) : [] };
}
export function nativeFixture(count, generation = 1) {
  const rows = Array.from({length: count}, (_, i) => ({
    id:'fixture-native-' + i,itemId:'fixture-native-' + i,parentId:i ? 'fixture-native-0' : null,
    siblingIndex:i ? i - 1 : 0,type:'normal',label:i ? 'Synthetic destination ' + i : 'REDOWN',
    contexts:['image'],enabled:true,visible:true,role:i ? 'save' : 'branch',
    origin:{mode:'simple',provider:'fixture'},reason:'FIXTURE',actionId:i ? 'fixture-action-' + i : null,
    target:i ? target('destination-' + i + '/') : null,
    intent:i ? {...target('destination-' + i + '/'),bucket:'fixture-bucket',path:'destination-' + i} : null
  }));
  return Object.freeze({schemaVersion:1,generation,revision:1,mode:'simple',inventoryRevision:1,rows,nodes:rows,omissions:[],coverage:{complete:true,gaps:[]}});
}
export function callbackChrome({ delayMs = 0 } = {}) {
  const calls = {create:0,removeAll:0,listenerAdded:0,listenerRemoved:0};
  const callback = cb => delayMs ? setTimeout(cb,delayMs) : queueMicrotask(cb);
  const chrome = {runtime:{lastError:null},contextMenus:{
    create(properties, cb) { calls.create++; callback(cb); return properties.id; },
    removeAll(cb) { calls.removeAll++; callback(cb); },
    onClicked:{addListener(){calls.listenerAdded++;},removeListener(){calls.listenerRemoved++;}}
  }};
  return {chrome,calls};
}
