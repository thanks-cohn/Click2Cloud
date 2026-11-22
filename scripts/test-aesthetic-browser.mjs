// Disposable Chromium + actual app/API/IndexedDB; provider and Chrome transport
// fixtures are explicit. This is not installed Windows or live R2 evidence.
import {chromium} from 'playwright-core';import {createServer} from 'node:http';import {readFile,mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';import {resolve,join,extname} from 'node:path';import {tmpdir} from 'node:os';import assert from 'node:assert/strict';
const root=resolve(new URL('../',import.meta.url).pathname),out=resolve(process.env.C2C_AESTHETIC_EVIDENCE??'work/foundation/aesthetic');await mkdir(out,{recursive:true});let context,server;const results=[],errors=[],profile=await mkdtemp(join(tmpdir(),'c2c-history-'));
try{server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!p.startsWith(root+'/'))return res.writeHead(403).end();res.setHeader('Content-Type',({'.mjs':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[extname(p)]??'application/octet-stream');res.end(await readFile(p));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
context=await chromium.launchPersistentContext(profile,{executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true,args:['--no-sandbox'],viewport:{width:1100,height:850}});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{const listeners=[],data={uiDebugMode:false};globalThis.chrome={runtime:{id:'fixture',onMessage:{addListener:fn=>listeners.push(fn)},sendMessage:async message=>{(window.engineCalls??=[]).push(message.method);if(message.channel==='redown-basic-v1'){
 if(message.op==='history.latestOutcome')return {ok:true,value:null};
 if(message.op==='providers.goTo')return {ok:true,value:{opened:true}};
 const connected=message.op==='auth.connect';
 return {ok:true,value:{connected,authorized:connected,ready:connected}};
}return (await import('/tests/product-browser-host.mjs')).invoke({version:message.version,method:message.method,params:message.params});}},storage:{local:{get:async keys=>Object.fromEntries([keys].flat().map(key=>[key,key.startsWith('aesthetic')?JSON.parse(localStorage.getItem(key)??'null')??undefined:data[key]])),set:async v=>{Object.assign(data,v);for(const key of Object.keys(v))if(key.startsWith('aesthetic'))localStorage.setItem(key,JSON.stringify(v[key]));}},onChanged:{addListener(){}}}};globalThis.chrome.permissions={request:async ({origins})=>{
 window.requestedSourceOrigins=origins;
 return true;
}};
window.fixtureNotify=message=>listeners.forEach(fn=>fn(message,{id:'fixture'}));});
await page.goto('http://127.0.0.1:'+server.address().port+'/extension/app.html?fixturePerformance=1');await page.waitForFunction(()=>window.productFixture);
await page.waitForFunction(()=>!document.querySelector('[data-view=history]').disabled);

page.setDefaultTimeout(10000);
await page.evaluate(async bytes=>{const f=window.productFixture;f.setReady('fixture-bucket');window.fixtureImageData={'image.png':bytes};f.r2Objects.set('fixture-bucket:image.png',{bucketName:'fixture-bucket',key:'image.png',displayName:'image.png',folder:false,size:bytes.length,etag:'fixture-preview'});for(let i=0;i<26;i++)await f.current.recordRemoteResult({kind:'save',operationId:'review-'+i,state:i%5===0?'failed':'verified',proofKind:'independent-head-version-size',destination:{provider:'cloudflare-r2',...f.target},receipt:{key:'image.png',size:bytes.length,etag:'fixture-preview',version:'fixture',destination:{provider:'cloudflare-r2',...f.target},savedFileMetadata:{httpMetadata:{contentType:'image/png'}}}});},Array.from(await readFile(join(root,'tests/fixtures/images/picture.png'))));
const settings=async()=>{await page.locator('#header-more').click();await page.getByRole('menuitem',{name:'Settings',exact:true}).click();await page.locator('#auto-attention').waitFor();};
await settings();
const snapshot=()=>page.evaluate(async()=>({
 config:await window.productFixture.current.read(),visual:await window.productFixture.current.readGalleryLoadingVisual(),
 effects:window.engineCalls.filter(method=>/^(set|commit|dispatch|initialize|approve|recover|fileAction)/.test(method))
}));
const before=await snapshot();
assert.deepEqual(await page.locator('#appearance option').allTextContents(),['Minimal','Remote V1','Golden Age','Oceania','Nostalgia','Frames']);
assert.equal(await page.locator('#appearance').inputValue(),'minimal');
const palette=page.locator('#aesthetic-palette');
assert.deepEqual(await palette.getByRole('radio').all().then(items=>Promise.all(items.map(item=>item.getAttribute('value')))),
 ['original-rose','ocean-blue','emerald-forest','amethyst','sunset-amber']);
assert(await palette.getByRole('radio',{name:'Original Rose'}).isChecked());
const schemeChecks=await page.evaluate(async()=>{
 const {palettes}=await import('/src/aesthetic/packages.mjs');
 const main=document.querySelector('#main'),settings=main.firstElementChild,grid=document.querySelector('.palette-options');
 const result=[];
 for(const {id} of palettes){
  grid.querySelector(`input[value="${id}"]`).click();
  const font=selector=>getComputedStyle(document.querySelector(selector)).fontFamily;
  result.push({id,panelRetained:main.firstElementChild===settings,
   fonts:[font('#palette-preview-name'),font('[data-palette-preview] p'),font('[data-palette-preview] button')],
   accent:getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
   geometry:[main.clientWidth,settings.clientWidth,grid.getBoundingClientRect().width,
    ...[...grid.children].map(choice=>choice.getBoundingClientRect().height)]});
 }
 return result;
});
assert.equal(new Set(schemeChecks.map(scheme=>JSON.stringify(scheme.fonts))).size,5);
assert.equal(new Set(schemeChecks.map(scheme=>scheme.accent)).size,5);
assert.equal(new Set(schemeChecks.map(scheme=>JSON.stringify(scheme.geometry))).size,1);
assert(schemeChecks.every(scheme=>scheme.panelRetained));
await palette.getByRole('radio',{name:'Ocean Blue'}).check();
assert.equal(await page.locator('html').evaluate(el=>el.style.getPropertyValue('--a-color-background-dark')),'#101722');
await page.locator('#appearance').selectOption('standard');
assert(await palette.isHidden());
await page.locator('#appearance').selectOption('minimal');
assert(await palette.getByRole('radio',{name:'Ocean Blue'}).isChecked());
assert.deepEqual(await snapshot(),before);
await page.evaluate(()=>localStorage.setItem('aestheticPreferenceV1',JSON.stringify({schemaVersion:1,id:'high-polish'})));
results.push({gate:'five palette color and font sets preserve settings DOM, control geometry and durable product state',state:'PASS'});
await page.reload();await page.waitForFunction(()=>window.productFixture);await page.waitForFunction(()=>document.documentElement.dataset.aesthetic==='minimal'&&document.documentElement.style.getPropertyValue('--a-color-accent-light')==='#1458ba');
await page.evaluate(bytes=>{const f=window.productFixture;f.setReady('fixture-bucket');window.fixtureImageData={'image.png':bytes};f.r2Objects.set('fixture-bucket:image.png',{bucketName:'fixture-bucket',key:'image.png',displayName:'image.png',folder:false,size:bytes.length,etag:'fixture-preview'});},Array.from(await readFile(join(root,'tests/fixtures/images/picture.png'))));results.push({gate:'appearance-restores-after-reload-separate-from-CURRENT',state:'PASS'});
const shot=async name=>{await page.screenshot({path:join(out,name+'.png')});};
await settings();
for(const name of ['Original Rose','Ocean Blue','Emerald Forest','Amethyst','Sunset Amber']){
 await palette.getByRole('radio',{name}).check();await shot('palette-'+name.replaceAll(' ','-'));
}
await palette.getByRole('radio',{name:'Ocean Blue'}).check();
await page.getByRole('button',{name:'Remotes',exact:true}).click();
const provider=page.getByRole('region',{name:'Google Drive'});
await provider.getByRole('button',{name:'Sign In'}).click();
await provider.getByRole('button',{name:'Reconnect',exact:true}).waitFor();
await provider.getByRole('button',{name:'GO TO Google Drive'}).click();
assert.equal(await provider.locator('[data-readiness]').textContent(),'Authorized for this provider.');
await page.evaluate(()=>window.fixtureNotify({channel:'redown-basic-attempt',attempt:{
 id:'fixture-source',provider:'google',state:'FAILED',code:'SOURCE_UNAVAILABLE',sourceOrigin:'https://images.example:8443'
}}));
await provider.locator('[data-save-summary]').click();
await provider.getByRole('button',{name:'Allow access to images.example'}).click();
assert.deepEqual(await page.evaluate(()=>window.requestedSourceOrigins),['https://images.example/*']);
await provider.getByText('Access granted. Right-click the source again to save.').waitFor();
await page.evaluate(()=>window.fixtureNotify({channel:'redown-basic-attempt',attempt:{
 id:'fixture-uncertain',provider:'google',state:'UNCERTAIN'
}}));
await provider.locator('[data-save-summary]').filter({hasText:'Save could not be verified'}).waitFor();
assert.equal(await provider.getByRole('button',{name:'Allow access to images.example'}).isVisible(),false);
results.push({gate:'independent-provider-actions-and-explicit-source-access-without-save-replay',state:'PASS'});
for(const width of [360,1100]){
 await page.setViewportSize({width,height:850});
 const cases=await page.evaluate(async()=>{
  const {createAestheticHost}=await import('/src/aesthetic/host.mjs');
  const host=createAestheticHost({root:document.documentElement});
  const results=[];
  for(const {id} of host.list())for(const style of id==='nostalgia'?host.listNostalgiaStyles().map(x=>x.id):[undefined]){
   for(const {id:palette} of host.listPalettes())for(const mode of ['light','dark']){
    document.documentElement.dataset.theme=mode;
    await host.apply({id,style,persist:false});
    await host.applyPalette(palette);
    if(host.getActive().id!==id)throw Error('Theme unavailable: '+id);
    const stack=document.querySelector('.remote-providers');
    const cards=[...stack.children,stack.nextElementSibling];
    const rects=cards.map(card=>card.getBoundingClientRect());
    if(cards.length!==4||!rects.every((r,i)=>r.width>0&&(!i||r.top>=rects[i-1].bottom&&r.x===rects[0].x&&r.width===rects[0].width)))
     throw Error('Provider layout failed: '+[id,style,palette,mode]);
    if(document.documentElement.scrollWidth>innerWidth||cards.some(card=>card.scrollWidth>card.clientWidth+1))
     throw Error('Provider overflow: '+[id,style,palette,mode]);
    results.push([id,style,palette,mode]);
   }
  }
  return results;
 });
 results.push({gate:'provider-theme-matrix',width,cases:cases.length,state:'PASS'});
}
const measurements=[];
for(const mode of ['standard','minimal','frames'])for(const theme of ['dark','light'])for(const width of [1100,600,360]){
 await page.setViewportSize({width,height:850});await settings();await page.locator('#appearance').selectOption(mode);await page.locator('#setting-theme').selectOption(theme);
 await page.waitForFunction(({mode,theme})=>document.documentElement.dataset.aesthetic===mode&&document.documentElement.dataset.theme===theme,{mode,theme});
 const tag=`${mode}-${theme}-${width}`;await page.waitForTimeout(160);await shot(tag+'-settings');if(mode==='minimal'&&theme==='dark'&&width===360){const cards=page.locator('#main .card:visible');for(let i=1;i<await cards.count();i++){await cards.nth(i).scrollIntoViewIfNeeded();await shot(tag+'-settings-card-'+i);}await page.locator('#main').evaluate(el=>el.scrollTop=0);}
 for(const view of ['Remotes','History','File Explorer']){
  await page.getByRole('button',{name:view,exact:true}).click();await page.waitForTimeout(80);await shot(tag+'-'+view.replaceAll(' ','-'));
  if(view==='Remotes'){
   await page.getByRole('heading',{name:'All Your Clouds. One Place.',exact:true}).waitFor();
   const cards=await page.locator('#main .card').evaluateAll(elements=>elements.slice(0,4).map(card=>{
    const rect=card.getBoundingClientRect();
    return {label:card.querySelector('h2').textContent,x:rect.x,y:rect.y,bottom:rect.bottom,width:rect.width};
   }));
   assert.deepEqual(cards.map(card=>card.label),['Google Drive','OneDrive','Dropbox','☁ Cloudflare R2']);
   assert(cards.every((card,i)=>!i||card.y>=cards[i-1].bottom&&card.x===cards[0].x&&card.width===cards[0].width));
   await page.getByRole('button',{name:'Open File Explorer',exact:true}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Cloudflare status'}).isVisible(),false);
   assert.equal(await page.getByRole('button',{name:'Save results',exact:true}).isVisible(),false);
  }
  if(view==='File Explorer'){
   assert.equal(await page.getByRole('button',{name:'Open File Explorer',exact:true}).count(),0);
   assert(await page.locator('#manage + #sign-out').isVisible());
   assert(await page.locator('#item-count').isVisible());
   await page.getByRole('row').filter({hasText:'image.png'}).first().waitFor();
   assert(await page.locator('#refresh').isEnabled());
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Page horizontal overflow '+tag+' '+view);
 }
 await page.locator('#toolbar-splitter').press('Home');await page.waitForFunction(()=>document.querySelector('#toolbar-splitter').getAttribute('aria-valuenow')==='1');
 const start=performance.now();await page.locator('#toolbar-more').click();await page.locator('#location').waitFor();measurements.push({mode,theme,width,openMs:performance.now()-start});await shot(tag+'-more');
 const edges=await page.locator('#location').evaluate(el=>{const b=el.getBoundingClientRect();return [2,b.width/2,b.width-2].every(x=>document.elementFromPoint(b.x+x,b.y+b.height/2)===el);});assert(edges,'More edge hit test '+tag);
 await page.locator('#location').press('Escape');assert(await page.locator('#toolbar-more').evaluate(el=>el===document.activeElement));
 await page.locator('#toolbar-splitter').press('End');
 await page.locator('#files').click({button:'right',position:{x:20,y:120}});await shot(tag+'-context');await page.keyboard.press('Escape');
 results.push({gate:tag+'-screens-layout-menu-focus',state:'PASS'});
}
await page.setViewportSize({width:1100,height:850});
await settings();await page.locator('#debug-mode').check();
await page.waitForFunction(()=>document.documentElement.dataset.debugMode==='on');
for(const mode of ['standard','minimal']){
 await settings();await page.locator('#appearance').selectOption(mode);
 await page.getByRole('button',{name:'Manage Destinations',exact:true}).click();await shot(mode+'-destinations');
 if(mode==='minimal'){
  assert(await page.getByText('Availability depends on the connected account.',{exact:true}).isVisible());
  assert.equal(await page.getByText(/Save prepares or maintains the private Cloudflare Worker/).isVisible(),false);
  assert(await page.getByText('Setup and Usage',{exact:true}).isVisible());
  assert(await page.getByRole('button',{name:'Save',exact:true}).isEnabled());
 }
 for(const name of ['Simple','Narrow','Depth']){await page.getByRole('button',{name,exact:true}).click();await shot(mode+'-destinations-'+name);}await page.keyboard.press('Escape');
 await page.locator('#header-more').click();await page.getByRole('menuitem',{name:'Help · Diagnose',exact:true}).click();await page.getByRole('button',{name:'Copy reviewed report'}).waitFor();await shot(mode+'-help');await page.locator('#close-dialog').click();await page.locator('#dialog').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'File Explorer',exact:true}).click();
 const imageRow=page.locator('#files [data-index]').filter({hasText:'image.png'}).first();
 await imageRow.press('Enter');try{await page.locator('img.preview').waitFor();}catch(error){
  console.error('Gallery fixture diagnostic',await page.evaluate(()=>({
   title:document.querySelector('#dialog-title')?.textContent,
   preview:document.querySelector('#preview-error')?.dataset.code,
   lastImageRead:window.productFixture?.calls.filter(call=>call.operation==='readChunk').at(-1),
   errors:window.fixtureImageData?.['image.png']?.length
  })));
  throw error;
 }await shot(mode+'-gallery');await page.keyboard.press('Escape');
}

await page.evaluate(async()=>{await window.productFixture.current.setHistoryPreferences({range:'all',previews:'closed',timezone:'America/Chicago'});});
await page.getByRole('button',{name:'History',exact:true}).click();await page.locator('.history-row').first().waitFor();
await page.locator('.history-row').first().waitFor();await page.evaluate(()=>document.querySelectorAll('[data-history-more]').forEach(el=>el.open=false));await page.waitForTimeout(100);await page.waitForFunction(()=>!document.querySelector('.history-preview[data-loading]'));
const independent=await page.evaluate(async()=>{const f=window.productFixture,methodCount=window.engineCalls.length,{createAestheticHost}=await import('/src/aesthetic/host.mjs'),h=createAestheticHost({root:document.documentElement}),before=await f.current.read(),visual=await f.current.readGalleryLoadingVisual(),history=document.querySelector('.history-page').innerHTML;
 window.fixtureImageDelay={'image.png':200};const reading=f.fileApi.run('readChunk',{source:f.target,key:'image.png',offset:0,length:65536});while(!window.fixtureImageReadActive)await new Promise(r=>setTimeout(r,5));for(let i=0;i<30;i++)await h.apply({id:['high-polish','standard','minimal'][i%2],persist:false});const read=await reading;window.fixtureImageDelay={};return {before,after:await f.current.read(),visual,afterVisual:await f.current.readGalleryLoadingVisual(),historySame:history===document.querySelector('.history-page').innerHTML,readState:read.state,bytes:read.data.bytes.length,extraCalls:window.engineCalls.length-methodCount};});
assert.deepEqual(independent.before,independent.after);assert.deepEqual(independent.visual,independent.afterVisual);assert(independent.historySame);assert.equal(independent.readState,'completed');assert(independent.bytes>0);assert.equal(independent.extraCalls,0);results.push({gate:'30-mid-read-switches-preserve-exact-History-DOM-data-and-pending-file-read-with-zero-engine-calls',state:'PASS'});
await settings();await page.locator('#appearance').selectOption('minimal');
await page.getByRole('button',{name:'File Explorer',exact:true}).click();
const openNewFolder=async treeitem=>{
 await treeitem.click({button:'right'});
 await page.getByRole('menuitem',{name:'New Folder',exact:true}).click();
};
const rootBucket=page.getByRole('treeitem',{name:/fixture-bucket/});
await openNewFolder(rootBucket);
await page.getByLabel('Folder name').fill('P0 local folder');
await page.getByRole('button',{name:'New Folder',exact:true}).click();
await page.getByRole('dialog').waitFor({state:'hidden'});
assert(await page.evaluate(()=>window.productFixture.r2Objects.has('fixture-bucket:P0 local folder/')));
await openNewFolder(page.getByRole('treeitem',{name:/P0 local folder/}));
await page.getByLabel('Folder name').fill('Nested P0 marker');
await page.getByRole('button',{name:'New Folder',exact:true}).click();
await page.getByRole('dialog').waitFor({state:'hidden'});
assert(await page.evaluate(()=>window.productFixture.r2Objects.has('fixture-bucket:P0 local folder/Nested P0 marker/')));
await page.evaluate(()=>window.fixtureFileActionError='WORKER_PERMISSION_DENIED');
await openNewFolder(rootBucket);
await page.getByLabel('Folder name').fill('Denied folder');
await page.getByRole('button',{name:'New Folder',exact:true}).click();
await page.getByText('Cloudflare denied access. Review your account permissions.',{exact:true}).waitFor();
await shot('minimal-explorer-actionable-error');
assert.equal(await page.getByText('WORKER_PERMISSION_DENIED',{exact:true}).isVisible(),false);
await page.keyboard.press('Escape');
await page.evaluate(()=>window.fixtureFileActionError=null);
await page.locator('#toolbar-more').click();
await page.getByRole('button',{name:'Create Bucket',exact:true}).click();
await page.getByLabel('Bucket name').fill('p0-browser-bucket');
await page.getByRole('dialog').getByRole('button',{name:'Create Bucket',exact:true}).click();
await page.getByRole('dialog').waitFor({state:'hidden'});
assert(await page.getByRole('treeitem',{name:/p0-browser-bucket/}).isVisible());
results.push({gate:'minimal-root-and-nested-mkdir-error-and-explorer-only-create-bucket',state:'PASS'});
const themeDuringSave=await page.evaluate(async()=>{
 const f=window.productFixture;
 f.setReady(f.target.bucketName);
 const invoke=(method,params)=>f.api.invoke({version:'3+1.1',method,params},'gui');
 const current=await f.current.read();
 const configured=await invoke('commitConfigChange',{changes:[{type:'createDestination',mode:'simple',target:f.target}],
  expectedRevision:current.product.revision,idempotencyKey:crypto.randomUUID()});
 if(configured.state!=='completed')throw Error(configured.code);
 const {desired,acknowledgedGeneration}=f.registrar.inspect(),route=desired.rows.find(row=>row.role==='save'&&row.target.bucketName===f.target.bucketName);
 const original=f.fixtureTransport.save;
 let began,finish;const pending=new Promise(resolve=>{began=resolve;}),hold=new Promise(resolve=>{finish=resolve;});
 f.fixtureTransport.save=async input=>{began();await hold;return original(input);};
 const result=invoke('dispatchSave',{itemId:route.id,generation:acknowledgedGeneration,context:'link',idempotencyKey:crypto.randomUUID(),
  source:{url:'https://example.com/theme-save.txt',filename:'theme-save.txt'}});
 await pending;
 const {createAestheticHost}=await import('/src/aesthetic/host.mjs'),host=createAestheticHost({root:document.documentElement,storage:{set:async()=>{}}});
 for(const id of ['standard','minimal'])await host.apply({id,persist:false});
 for(const id of ['ocean-blue','original-rose','amethyst'])await host.applyPalette(id);
 finish();const saved=await result;f.fixtureTransport.save=original;
 return {completion:saved.data?.completion,object:f.r2Objects.has(f.target.bucketName+':theme-save.txt')};
});
assert.deepEqual(themeDuringSave,{completion:'verified',object:true});
results.push({gate:'appearance-switches-during-active-save-preserve-worker-call-and-receipt',state:'PASS'});
await page.getByRole('button',{name:'Remotes',exact:true}).click();
await page.getByRole('button',{name:'Open File Explorer',exact:true}).click();
await page.locator('#manage + #sign-out').waitFor();
assert.equal(await page.getByRole('button',{name:'Open File Explorer',exact:true}).count(),0);
const measureFooter=async width=>{
 await page.setViewportSize({width,height:850});
 const [manage,signOut]=await Promise.all(['#manage','#manage + #sign-out'].map(selector=>page.locator(selector).boundingBox()));
 assert(manage&&signOut&&signOut.x>=manage.x+manage.width&&signOut.x+signOut.width<=width);
 return [manage,signOut];
};
const [expandedManage,expandedSign]=await measureFooter(1100),[compactManage,compactSign]=await measureFooter(360);
assert(expandedManage.width>compactManage.width&&expandedSign.x>compactSign.x);
await page.locator('#manage + #sign-out').click();
await page.getByRole('button',{name:'Log In',exact:true}).waitFor();
assert.equal(await page.locator('#sign-out').count(),0);
await page.getByRole('button',{name:'Log In',exact:true}).click();
await page.locator('#manage + #sign-out').waitFor();
await page.getByRole('button',{name:'Remotes',exact:true}).click();
await page.getByRole('button',{name:'Open File Explorer',exact:true}).waitFor();
assert.equal(await page.locator('#manage-slot #sign-out').count(),0);
results.push({gate:'Explorer login and flexible footer follow auth and preserve the Remotes action',state:'PASS'});
await page.evaluate(async()=>{
 const f=window.productFixture,state=await f.current.read();
 const response=await f.api.invoke({version:'3+1.1',method:'commitConfigChange',params:{changes:[{type:'makeDefault',target:f.target}],
  expectedRevision:state.product.revision,idempotencyKey:crypto.randomUUID()}},'gui');
 if(response.state!=='completed')throw Error(response.code);
});
await page.reload();
for(const theme of ['minimal','standard']){
 await settings();await page.locator('#appearance').selectOption(theme);
 const clear=page.getByRole('button',{name:'Remove Default Location',exact:true});
 await clear.waitFor();
 await page.waitForFunction(()=>document.querySelector('#clear-default')?.closest('section')===document.querySelector('#main .page')?.lastElementChild);
}
await page.getByRole('button',{name:'Remove Default Location',exact:true}).click();
assert.equal(await page.getByRole('button',{name:'Remove Default Location',exact:true}).count(),1);
page.once('dialog',prompt=>prompt.accept());
await page.getByRole('button',{name:'Remove Default Location',exact:true}).click();
await page.getByRole('button',{name:'Remove Default Location',exact:true}).waitFor({state:'detached'});
results.push({gate:'Remove Default Location is last in both themes and keeps its confirmation',state:'PASS'});
await page.emulateMedia({reducedMotion:'reduce'});const transition=await page.locator('#theme').evaluate(el=>getComputedStyle(el).transitionDuration);assert.equal(transition,'0s');
results.push({gate:'reduced-motion-disables-overlay-transitions',state:'PASS'});
await writeFile(join(out,'interaction-measurements.json'),JSON.stringify(measurements,null,2));assert.deepEqual(errors,[]);
}catch(e){try{const p=context.pages().at(-1);await writeFile(join(out,'failure-dom.html'),await p.content());await writeFile(join(out,'failure-debug.json'),JSON.stringify(await p.evaluate(()=>({previews:[...document.querySelectorAll('[data-preview]')].map(el=>({text:el.textContent,rect:el.getBoundingClientRect().toJSON()})),calls:window.productFixture?.calls,settings:document.querySelector('.history-page')?.innerText})),null,2));}catch{}results.push({gate:'browser-acceptance',state:'FAIL',message:e.message,stack:e.stack});process.exitCode=1;}finally{await context?.close();if(server)await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true});await writeFile(join(out,'results.json'),JSON.stringify({evidenceClass:'REAL_CHROMIUM_APP_API_IDB_WITH_FIXTURE_PROVIDER_NOT_LIVE',results,errors},null,2));console.log(JSON.stringify(results,null,2));}
