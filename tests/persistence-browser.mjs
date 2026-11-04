// Execute in an installed browser on a trusted localhost/extension origin.
// This suite tests real IndexedDB (not a fake Node backend). Root browser harness imports it.
import {createCurrentStore} from '../src/persistence/current-store.mjs';
import {decodeBackup} from '../src/persistence/backup.mjs';
const check=(condition,label)=>{if(!condition)throw Error('CURRENT browser assertion: '+label);};
async function reject(promise,code) {try{await promise;}catch(e){if(!code||e.code===code)return;throw e;}throw Error('Expected rejection '+code);}
const target={provider:'cloudflare',connectionId:'fixture-connection',accountId:'fixture-account',bucketName:'fixture-bucket',prefix:'Pictures/'};
export async function runPersistenceBrowserTests() {
  if(!globalThis.indexedDB)throw Error('Real IndexedDB unavailable');
  const dbName='click2cloud-current-browser-'+crypto.randomUUID(),events=[];
  const options={dbName,sink:e=>events.push(e),clock:()=>1793750400000};
  const one=createCurrentStore(options),two=createCurrentStore(options),passed=[];
  const save=(store,mode,config,expectedRevision)=>store.saveModeConfig(mode,config,{expectedRevision});
  const simple=await save(one,'simple',{destinations:[{id:'photo',target,label:'Pictures'}]},0);
  const nested=await save(one,'nested',{destinations:[{id:'other',target:{...target,prefix:'Images/'}}]},0);
  const depth=await save(one,'depth',{scopes:[{target:{...target,prefix:''},maxDepth:16}]},0);
  const before=await one.read();
  await save(two,'simple',{...simple,destinations:[{...simple.destinations[0],label:'Edited'}]},1);
  const after=await one.read();
  check(JSON.stringify(after.configs.nested)===JSON.stringify(before.configs.nested),'Nested untouched');
  check(JSON.stringify(after.configs.depth)===JSON.stringify(before.configs.depth),'Depth untouched');
  passed.push('independent mode state persisted');
  const stale=await Promise.allSettled([
    save(one,'simple',{...simple,destinations:[]},2),save(two,'simple',{...simple,destinations:[]},2)
  ]);
  check(stale.filter(x=>x.status==='fulfilled').length===1,'single winner concurrent CAS');
  check(stale.some(x=>x.status==='rejected'&&x.reason.code==='REVISION_CONFLICT'),'stale revision rejected');
  passed.push('concurrent IDB transactions fence revisions');
  const beforeFault=JSON.stringify(await one.read()),journalBefore=JSON.stringify(await one.journal());
  const broken=createCurrentStore({...options,fault:()=>{throw Error('synthetic interrupted transaction');}});
  await reject(save(broken,'nested',nested,1));
  check(JSON.stringify(await one.read())===beforeFault,'config rollback');
  check(JSON.stringify(await one.journal())===journalBefore,'journal rollback');
  passed.push('interrupted transaction rolls config and journal back together');
  await one.setDesiredGeneration(4,{expectedGeneration:0});
  await two.setDesiredGeneration(5,{expectedGeneration:4});
  await reject(one.acknowledgeGeneration(4),'REVISION_CONFLICT');
  check((await one.read()).generation.applied===null,'stale ACK cannot mark applied');
  await two.acknowledgeGeneration(5);check((await one.read()).generation.applied===5,'current ACK applied');
  passed.push('desired versus applied native generation fenced');
  const backup=await one.exportEncrypted({authorized:true,passphrase:'synthetic-fixture-passphrase'});
  const decoded=await decodeBackup(backup,{authorized:true,passphrase:'synthetic-fixture-passphrase'});
  check(decoded.checkpoints.find(c=>c.mode==='simple').config.revision===1,'daily checkpoint immutable across repeated edits');
  passed.push('daily checkpoint remains immutable across same-day edits');
  await one.close();await two.close();await broken.close();
  const restarted=createCurrentStore(options);const reloaded=await restarted.read();
  check(reloaded.configs.simple.revision===3&&reloaded.configs.depth.scopes[0].maxDepth===16,'cold reopen retains state');
  passed.push('cold store reopen retains config and journal');
  const dest=createCurrentStore({...options,dbName:dbName+'-restored'});
  const restored=await dest.restoreEncrypted(backup,{authorized:true,passphrase:'synthetic-fixture-passphrase'});
  check(restored.generation.applied===null&&restored.requiresReconnect===true,'restore invalidates native and auth evidence');
  check(JSON.stringify(restored.configs)===JSON.stringify(reloaded.configs),'restore exact configs');
  await dest.exportEncrypted({authorized:true,passphrase:'synthetic-fixture-passphrase'}); // restored journal remains internally consistent
  await reject(dest.restoreEncrypted(backup,{authorized:true,passphrase:'synthetic-fixture-passphrase'}),'RESTORE_NOT_EMPTY');
  passed.push('encrypted empty-store restore preserves config and requires new authorization/ACK');
  const page=await restarted.journal({limit:2});check(page.rows.length===2&&page.next!==null&&!page.complete,'journal pagination');
  check(events.some(x=>x.code==='REVISION_CONFLICT')&&events.some(x=>x.code==='STORAGE_COMMIT_FAILED'),'fault signals');
  passed.push('journal paging and material failure signals');
  await restarted.close();await dest.close();
  await Promise.all([dbName,dbName+'-restored'].map(name=>new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(name);r.onsuccess=resolve;r.onerror=()=>reject(r.error);})));
  return {state:'PASS',evidence:'installed-browser-indexeddb',passed,assertionGroups:passed.length};
}
