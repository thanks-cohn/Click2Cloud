import assert from 'node:assert/strict';import {createServer} from 'node:http';import {readFile,mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';import {resolve,join} from 'node:path';import {tmpdir} from 'node:os';
import {chromium} from '/opt/codex/cua_node/lib/node_modules/playwright/index.mjs';
const root=resolve(new URL('../',import.meta.url).pathname),evidence=join(root,'docs/evidence/final-v3p1');await mkdir(evidence,{recursive:true});
const profile=await mkdtemp(join(tmpdir(),'c2c-product-browser-'));let context,server;const results=[];
try{
 context=await chromium.launchPersistentContext(profile,{executablePath:'/usr/bin/chromium',headless:true,ignoreDefaultArgs:['--disable-extensions'],args:['--no-sandbox','--enable-unsafe-extension-debugging',`--disable-extensions-except=${root}/dist/click2cloud`,`--load-extension=${root}/dist/click2cloud`]});
 const cdp=await context.browser().newBrowserCDPSession();
 try{await cdp.send('Extensions.loadUnpacked',{path:join(root,'dist/click2cloud')});results.push({gate:'installed-extension',state:'PASS',note:'Load request accepted; service worker must be checked.'});}
 catch(e){const blocked=String(e.message).includes('disabled by the administrator');results.push({gate:'installed-extension',state:blocked?'BLOCKED':'FAIL',code:blocked?'UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR':'EXTENSION_LOAD_FAILED'});}
 server=createServer(async(req,res)=>{const path=new URL(req.url,'http://localhost').pathname,full=resolve(root,'.'+path);if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Background module host fixture</title>');return;}if(!full.startsWith(root+'/')||!['.mjs','.html','.css'].some(ext=>full.endsWith(ext))){res.writeHead(404).end();return;}try{res.setHeader('Content-Type',full.endsWith('.html')?'text/html':full.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(full));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const host=import('/tests/product-browser-host.mjs');globalThis.chrome={runtime:{sendMessage:async message=>(await host).invoke({version:message.version,method:message.method,params:message.params})}};});
 await page.goto(origin+'/extension/app.html');await page.getByRole('heading',{name:'Your clouds, one place.'}).waitFor();
 assert.equal(await page.evaluate(()=>window.productFixture.calls.length),0);
 await page.getByRole('button',{name:'Log in',exact:true}).click();await page.getByRole('button',{name:'Open File Explorer'}).first().waitFor();
 assert.deepEqual(await page.evaluate(()=>window.productFixture.calls.map(c=>c.operation)),['oauth.connect']);results.push({gate:'quiet-login-wiring',state:'PASS',evidenceClass:'isolated-fixture'});
 await page.getByRole('button',{name:'Open File Explorer'}).first().click();await page.getByRole('treeitem',{name:'▸ Fixture account'}).click();await page.getByRole('treeitem',{name:/fixture-bucket/}).click();await page.getByRole('grid',{name:'Files'}).waitFor();
 await page.screenshot({path:join(evidence,'explorer-dark-fixture.png'),fullPage:true});
 await page.getByRole('row').filter({hasText:'notes.txt'}).click();await page.getByRole('row').filter({hasText:'notes.txt'}).press('ArrowUp');assert.equal(await page.getByRole('row').filter({hasText:'projects'}).getAttribute('aria-selected'),'true');
 await page.getByRole('row').filter({hasText:'projects'}).press('Shift+F10');await page.getByRole('menuitem',{name:'Make Default',exact:true}).waitFor();await page.keyboard.press('Escape');
 await page.getByRole('row').filter({hasText:'projects'}).dblclick();await page.getByText('This folder is empty.',{exact:true}).waitFor();await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('grid',{name:'Files'}).waitFor();
 results.push({gate:'Explorer-keyboard-and-folder-navigation',state:'PASS',evidenceClass:'isolated-fixture-real-browser'});

 // Exact clicked folder, not stale selection, gets the new destination.
 await page.getByRole('row').filter({hasText:'projects'}).click({button:'right'});await page.getByRole('menuitem',{name:'+ Right Click',exact:true}).click();
 await page.getByLabel('Menu Title',{exact:true}).fill('Projects shortcut');await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 let config=await page.evaluate(()=>window.productFixture.current.read());assert.equal(config.configs.simple.destinations[0].target.prefix,'projects/');
 await page.getByRole('button',{name:'Manage Destinations',exact:true}).first().click();await page.getByRole('button',{name:'Quick Select',exact:true}).click();await page.getByRole('button',{name:'Quick ✓',exact:true}).waitFor();await page.getByRole('button',{name:'Hide',exact:true}).click();await page.getByRole('button',{name:'Show',exact:true}).waitFor();
 config=await page.evaluate(()=>window.productFixture.current.read());assert.equal(config.configs.simple.destinations[0].hidden,true);assert.equal(config.configs.simple.destinations[0].quick,true);
 await page.getByRole('button',{name:'Show',exact:true}).click();await page.getByRole('button',{name:'Hide',exact:true}).waitFor();await page.screenshot({path:join(evidence,'destinations-fixture.png')});
 await page.getByRole('button',{name:'Edit Menu Title'}).click();await page.getByLabel('Menu Title',{exact:true}).fill('discard this');await page.getByRole('button',{name:'Cancel',exact:true}).click();config=await page.evaluate(()=>window.productFixture.current.read());assert.equal(config.configs.simple.destinations[0].label,'Projects shortcut');
 await page.getByRole('row').filter({hasText:'projects'}).click({button:'right'});await page.getByRole('menuitem',{name:'Make Default',exact:true}).click();
 await page.waitForFunction(()=>window.productFixture.lastResponse?.request.params?.changes?.[0]?.type==='makeDefault');
 assert.equal(await page.evaluate(()=>window.productFixture.lastResponse.response.state),'completed');
 config=await page.evaluate(()=>window.productFixture.current.read());assert.equal(config.product.defaultTarget?.prefix,'projects/');
 // Twenty real UI editor rows exercise draft-only level hiding over the shared API.
 await page.evaluate(async()=>{const f=window.productFixture,s=await f.current.read();const target={...f.target,prefix:Array.from({length:20},(_,i)=>'level'+(i+1)).join('/')+'/'};const r=await f.api.invoke({version:'3+1.1',method:'commitConfigChange',params:{expectedRevision:s.product.revision,idempotencyKey:'narrow-20',changes:[{type:'createDestination',mode:'nested',target}]}},'gui');if(r.state!=='completed')throw Error(r.code);});
 // Reload reads CURRENT via the actual presentation adapter, without scraping state into it.
 await page.reload();await page.getByRole('button',{name:'Manage Destinations',exact:true}).click();await page.getByRole('button',{name:'Narrow',exact:true}).click();await page.getByRole('button',{name:'Edit Menu Title'}).click();await page.getByRole('button',{name:'Select Mode',exact:true}).click();
 for(let i=10;i<18;i++)await page.locator(`[data-level="${i}"]`).check();
 await page.getByRole('button',{name:'Hide selected',exact:true}).click();
 const draftState=await page.evaluate(()=>window.productFixture.current.read());assert.equal(Object.keys(draftState.configs.nested.destinations[0].levels??{}).length,0);
 await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByRole('heading',{name:'Destinations',exact:true}).waitFor();
 const narrowState=await page.evaluate(async()=>({state:await window.productFixture.current.read(),menu:(await window.productFixture.api.invoke({version:'3+1.1',method:'previewNativeMenu',params:{}},'gui')).data}));
 assert.equal(narrowState.state.configs.nested.destinations[0].target.prefix.split('/').filter(Boolean).length,20);
 assert.equal(Object.values(narrowState.state.configs.nested.destinations[0].levels).filter(v=>v.hidden).length,8);
 assert(!narrowState.menu.rows.some(r=>r.label==='level11'));assert(narrowState.menu.rows.some(r=>r.label==='level19'));
 await page.getByRole('button',{name:'Close',exact:true}).click();
 results.push({gate:'Narrow-20-level-editor-draft-and-commit',state:'PASS',evidenceClass:'isolated-fixture-real-browser-IDB'});
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Theme',{exact:true}).selectOption('light');await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');await page.screenshot({path:join(evidence,'settings-light-fixture.png'),fullPage:true});
 const apiChecks=await page.evaluate(async()=>{
  const {api,current,gateway,grants}=window.productFixture,invoke=(method,params={})=>api.invoke({version:'3+1.1',method,params},'gui');
  let s=await current.read();const params={expectedRevision:s.product.revision,idempotencyKey:'browser-replay',changes:[{type:'setTheme',theme:'dark'}]};
  const first=await invoke('commitConfigChange',params),retry=await invoke('commitConfigChange',params),after=await current.read();
  const stale=await invoke('commitConfigChange',{...params,idempotencyKey:'stale'}),badVersion=await api.invoke({version:999,method:'getConfiguration'},'gui');
  const unauthorized=await api.invoke({version:'3+1.1',method:'getConfiguration'},'ungranted');
  grants.set('fixture-agent',['getConfiguration']);const handle=gateway.grant({actor:'fixture-agent',methods:['getConfiguration'],expiresAt:Date.now()+10000});const agent=await gateway.request(handle,{version:'3+1.1',method:'getConfiguration'},'fixture-agent');
  let wrongActor=false;try{await gateway.request(handle,{version:'3+1.1',method:'getConfiguration'},'other');}catch{wrongActor=true;}
  const encrypted=await current.exportEncrypted({authorized:true,passphrase:'fixture-only-long-passphrase'});
  const {createCurrentStore}=await import('/src/persistence/current-store.mjs');const restored=createCurrentStore({dbName:'fixture-restored'});await restored.restoreEncrypted(encrypted,{authorized:true,passphrase:'fixture-only-long-passphrase'});const restoredState=await restored.read();await restored.close();
  return {first:first.state,replay:retry.receipt.replayed,unchanged:after.product.revision===first.receipt.after,stale:stale.code,badVersion:badVersion.code,unauthorized:unauthorized.code,agent:agent.state,wrongActor,restored:JSON.stringify(restoredState.product)===JSON.stringify(after.product),reconnect:restoredState.requiresReconnect};
 });
 assert.deepEqual(apiChecks,{first:'completed',replay:true,unchanged:true,stale:'REVISION_CONFLICT',badVersion:'VERSION_OR_METHOD_UNSUPPORTED',unauthorized:'PERMISSION_DENIED',agent:'completed',wrongActor:true,restored:true,reconnect:true});
 results.push({gate:'GUI-and-shared-API',state:'PASS',evidenceClass:'isolated-fixture-real-browser-IDB',checks:apiChecks});
 await page.setViewportSize({width:680,height:700});await page.screenshot({path:join(evidence,'narrow-window-fixture.png'),fullPage:true});
 assert.deepEqual(errors,[]);results.push({gate:'browser-runtime-errors',state:'PASS',errors});
 const boot=await context.newPage();await boot.goto(origin+'/');
 const bootResult=await boot.evaluate(async()=>{
  const local={},session={},area=data=>({get:async k=>({[k]:data[k]}),set:async values=>Object.assign(data,values),remove:async k=>{delete data[k];},setAccessLevel:async()=>{}}),event=()=>({addListener(){},removeListener(){}});
  globalThis.chrome={runtime:{id:'fixture-extension',getURL:path=>location.origin+'/'+path,onMessage:event()},storage:{local:area(local),session:area(session)},identity:{getRedirectURL:()=> 'https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/cloudflare'},contextMenus:{create:(_p,cb)=>cb(),removeAll:cb=>cb(),onClicked:event()},action:{onClicked:event(),setBadgeText:async()=>{}},alarms:{onAlarm:event(),create:async()=>{}},tabs:{create:async()=>{}},permissions:{contains:async()=>false}};
  await import('/extension/background.mjs');const ready=await globalThis.click2cloud.ready;
  const capabilities=await globalThis.click2cloud.api.invoke({version:'3+1.1',method:'describeCapabilities',params:{}},'gui');
  return {ready:ready.state,api:capabilities.state,tools:capabilities.data.tools.length};
 });assert.deepEqual(bootResult,{ready:'completed',api:'completed',tools:33});results.push({gate:'actual-product-background-module-boot',state:'PASS',evidenceClass:'browser-module-with-fake-Chrome-transport',...bootResult});await boot.close();
 results.push({gate:'native-rendering-click-restart',state:'BLOCKED',code:'EXTENSION_INSTALL_POLICY'},{gate:'live-provider-OAuth-consent',state:'BLOCKED',code:'DASH_CLOUDFLARE_NOT_IN_NETWORK_ALLOWLIST'},{gate:'live-native-save-readback',state:'BLOCKED',code:'INSTALLED_EXTENSION_AND_AUTHORIZED_WORKER_TRANSPORT_REQUIRED'});
 await writeFile(join(evidence,'browser-results.json'),JSON.stringify({browser:context.browser().version(),results},null,2)+'\n');console.log(JSON.stringify(results,null,2));
}catch(error){results.push({gate:'browser-run',state:'FAIL',reason:error.message});await writeFile(join(evidence,'browser-results.json'),JSON.stringify({results},null,2)+'\n');throw error;}finally{await context?.close();if(server)await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true});}
