// Chromium renders production Shelf source. Chrome messaging and R2 are fixtures.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {extname,join,resolve} from 'node:path';
import {chromium} from 'playwright-core';

const root=resolve(new URL('..',import.meta.url).pathname);
const out=process.env.C2C_P1_EVIDENCE??await mkdtemp(join(tmpdir(),'redown-p1-'));
await mkdir(out,{recursive:true});
const server=createServer(async(request,response)=>{
 const path=resolve(root,'.'+new URL(request.url,'http://fixture').pathname);
 if(!path.startsWith(root+'/'))return response.writeHead(403).end();
 try{
  const body=await readFile(path);
  response.setHeader('Content-Type',{'.mjs':'text/javascript','.html':'text/html','.css':'text/css'}[extname(path)]??'application/octet-stream');
  response.end(body);
 }catch{response.writeHead(404).end();}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url=`http://127.0.0.1:${server.address().port}/extension/app.html?fixtureImages=1&fixtureFilenameSearch=1&fixtureRelease0320=1`;
const cases=[
 {theme:'minimal',palette:'emerald-forest'},{theme:'minimal',palette:'original-rose'},
 {theme:'minimal',palette:'ocean-blue'},{theme:'minimal',palette:'amethyst'},{theme:'minimal',palette:'sunset-amber'},
 {theme:'standard'},{theme:'golden-age',tile:['rgb(230, 0, 35)','rgb(255, 255, 255)']},
 {theme:'oceania',tile:['rgb(53, 70, 92)','rgb(244, 235, 216)']},
 {theme:'nostalgia',style:'kawaii',tile:['rgb(255, 79, 169)','rgb(60, 23, 77)']},
 {theme:'nostalgia',style:'dungeon-master',tile:['rgb(8, 9, 11)','rgb(255, 255, 255)']},
 {theme:'nostalgia',style:'heroine',tile:['rgb(255, 201, 121)','rgb(59, 22, 41)']}
];
let browser;
const results=[],errors=[];
try{
 browser=await chromium.launch({executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true});
 const page=await browser.newPage({viewport:{width:900,height:760},reducedMotion:'reduce'});
 page.on('pageerror',error=>errors.push(error.message));
 page.setDefaultTimeout(8000);
 const image=Array.from(await readFile(join(root,'tests/fixtures/images/picture.png')));
 await page.addInitScript(bytes=>{
  window.fixtureImageData={'01-first.png':bytes,'02-middle-long-cloud-filename.png':bytes,'03-last.png':bytes};
  const changes=new Set(),listeners=new Set();
  const local={
   async get(keys){
    return Object.fromEntries([keys].flat().map(key=>[key,JSON.parse(localStorage.getItem(key)??'null')??undefined]));
   },
   async set(values){
    const changed={};
    for(const [key,value] of Object.entries(values)){
     const oldValue=JSON.parse(localStorage.getItem(key)??'null');
     localStorage.setItem(key,JSON.stringify(value));
     changed[key]={oldValue,newValue:value};
    }
    for(const listener of changes)listener(changed,'local');
   }
  };
  window.p1Calls=[];
  const fixture=import('/tests/product-browser-host.mjs');
  globalThis.chrome={storage:{local,onChanged:{addListener:fn=>changes.add(fn)}},runtime:{id:'fixture',
   onMessage:{addListener:fn=>listeners.add(fn)},sendMessage:async({version,method,params})=>{
    window.p1Calls.push(method);
    return (await fixture).invoke({version,method,params});
   }}};
 },image);
 const open=async()=>{
  await page.goto(url);
  await page.waitForFunction(()=>window.productFixture&&!document.querySelector('#theme').disabled);
  await page.evaluate(()=>window.productFixture.setReady('fixture-bucket'));
 };
 await open();
 const clickView=async id=>{
  if(id==='settings')await page.locator('#header-more').click();
  await page.locator(`header [data-view="${id}"]:visible`).click();
 };
 const settings=async()=>{await clickView('settings');await page.locator('#appearance').waitFor();};
 const list=()=>page.locator('#files');
 const nativeMenu=()=>page.evaluate(()=>{
  const inspected=window.productFixture.registrar.inspect();
  return inspected.desired?.rows.map(({id,label,role})=>({id,label,role}));
 });
 const shot=name=>page.screenshot({path:join(out,name+'.png')});
 const active=()=>page.locator('html').getAttribute('data-aesthetic');
 const headerGeometry=()=>page.evaluate(()=>{
  const bounds=selector=>document.querySelector(selector).getBoundingClientRect().toJSON();
  const top=bounds('#header-more'),theme=bounds('#theme'),menu=bounds('#header-menu'),tile=bounds('.brand-tile');
  const hit=(box,selector)=>document.elementFromPoint(box.left+box.width/2,box.top+box.height/2)?.closest(selector)!=null;
  return {top,theme,menu,tile,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
   moreHit:hit(top,'#header-more'),themeHit:hit(theme,'#theme')};
 });
 const geometryOK=({top,theme,menu,tile,width,scrollWidth,moreHit,themeHit})=>{
  assert(top.right<theme.left&&theme.width===36&&theme.height===36);
  assert(tile.width===30&&tile.height===30);
  assert(moreHit&&themeHit&&scrollWidth<=width);
  if(menu.width)assert(menu.left>=0&&menu.right<=width&&menu.top>=theme.bottom);
 };
 const configure=await page.evaluate(async()=>{
  const {api,current,target}=window.productFixture,state=await current.read();
  return api.invoke({version:'3+1.1',method:'commitConfigChange',params:{changes:[{type:'createDestination',mode:'simple',target},{type:'setView',view:'details'}],
   expectedRevision:state.product.revision,idempotencyKey:crypto.randomUUID()}},'gui');
 });
 assert.equal(configure.state,'completed');
 await open();
 const menuBefore=await nativeMenu();
 assert(menuBefore.some(row=>row.role==='save'));
 await page.evaluate(async()=>{
  const {current,target}=window.productFixture;
  await current.setHistoryPreferences({range:'all',previews:'closed',timezone:'America/Chicago'});
  for(const [operationId,state,key] of [['p1-verified','verified','01-first.png'],['p1-failed','failed','unavailable.png']]){
   await current.recordRemoteResult({operationId,kind:'save',state,attemptedFilename:key,destination:target,
    ...(state==='verified'?{proofKind:'independent-head-version-size',receipt:{key,size:window.fixtureImageData[key].length,etag:'fixture-preview'}}:
     {code:'CLOUDFLARE_RETRY_NEEDED'})});
  }
 });
 for(const {theme,palette,style,tile} of cases){
  await page.setViewportSize({width:900,height:760});
  await settings();
  assert.deepEqual(await page.locator('#appearance option').allTextContents(),['Minimal','Remote V1','Golden Age','Oceania','Nostalgia']);
  await page.locator('#appearance').selectOption(theme);
  assert.equal(await page.locator('#aesthetic-palette').isVisible(),theme==='minimal');
  assert.equal(await page.locator('#nostalgia-style-row').isVisible(),theme==='nostalgia');
  if(palette)await page.locator(`input[value="${palette}"]`).check();
  if(style)await page.locator('#nostalgia-style').selectOption(style);
  assert.equal(await active(),theme);
  const id=palette??style??theme;
  for(const mode of ['light','dark']){
   await page.locator('#setting-theme').selectOption(mode);
   await page.waitForFunction(mode=>document.documentElement.dataset.theme===mode,mode);
   const tag=`${id}-${mode}`;
   if(tile)assert.deepEqual(await page.locator('.brand-tile').evaluate(element=>{
    const {backgroundColor,color}=getComputedStyle(element);return [backgroundColor,color];
   }),tile);
   if(!palette||palette==='emerald-forest')await shot(tag+'-settings');
   await page.locator('#header-more').focus();
   await page.keyboard.press('ArrowDown');
   for(const width of [900,260,900,260,310,350,480,900]){
    await page.setViewportSize({width,height:760});
    geometryOK(await headerGeometry());
    assert.equal(await page.locator('#header-more').getAttribute('aria-expanded'),'true');
    assert.equal(await page.locator('header [data-view=history]:visible').count(),1);
    assert.equal(await page.locator('#header-compact-history').isVisible(),width<=329);
    if(width===260&&id==='emerald-forest')await shot(tag+'-narrow-menu');
   }
   await page.keyboard.press('Escape');
   assert(await page.locator('#header-menu').isHidden());
   assert(await page.locator('#header-more').evaluate(element=>element===document.activeElement));
   await page.locator('#header-more').click();
   await page.locator('#theme').click();
   await page.waitForFunction(mode=>document.documentElement.dataset.theme!==mode,mode);
   assert(await page.locator('#header-menu').isHidden());
   await page.locator('#setting-theme').selectOption(mode);
   await page.waitForFunction(mode=>document.documentElement.dataset.theme===mode,mode);

   await clickView('remotes');
   if(!palette||palette==='original-rose')await shot(tag+'-remotes');
   await clickView('explorer');
   const row=name=>list().getByRole('row').filter({hasText:name});
   await row('01-first.png').press('Enter');
   await page.locator('img.preview:not([hidden])').waitFor();
   const prev=page.locator('#gallery-previous'),next=page.locator('#gallery-next');
   assert(await prev.isDisabled());
   assert(await next.isEnabled());
   await next.click();
   await page.locator('#dialog-title').filter({hasText:'02-middle'}).waitFor();
   await page.locator('img.preview:not([hidden])').waitFor();
   await page.setViewportSize({width:310,height:710});
   const controls=await page.locator('.gallery-arrow').evaluateAll(arrows=>arrows.map(arrow=>{
    const {width,height}=arrow.getBoundingClientRect(),style=getComputedStyle(arrow);
    return {width,height,background:style.backgroundColor,radius:style.borderTopLeftRadius};
   }));
   assert.deepEqual(controls,Array(2).fill({width:44,height:44,background:'rgba(0, 0, 0, 0)',radius:'4px'}));
   if(!palette||palette==='original-rose')await shot(tag+'-gallery');
   await page.keyboard.press('ArrowRight');
   await page.locator('#dialog-title').filter({hasText:'03-last'}).waitFor();
   assert(await next.isDisabled());
   await page.keyboard.press('Escape');
   assert(await page.locator('#dialog').isHidden());
   await page.setViewportSize({width:900,height:760});
   if(!palette||palette==='original-rose'){
    await page.locator('#toolbar-splitter').press('End');
    const view=page.getByLabel('View',{exact:true});
    await view.selectOption('grid');
    await list().locator('.file-tile').first().waitFor();
    await shot(tag+'-explorer');
    await view.selectOption('details');
   }
   await clickView('history');
   await page.locator('.history-row').first().waitFor();
   if(!palette||palette==='original-rose')await shot(tag+'-history');
   await settings();
  }
  results.push({gate:id+'-both-modes-header-resizes-gallery-and-shelf',state:'PASS'});
 }
 assert.deepEqual(await nativeMenu(),menuBefore);

 // Serve the same production app without each stylesheet, with persisted selection.
 for(const {theme,style} of [{theme:'golden-age'},{theme:'oceania'},{theme:'nostalgia'},...cases.filter(row=>row.style)]){
  const names=style?[style]:theme==='nostalgia'?['kawaii','dungeon-master','heroine']:[theme];
  const blockedCss=url=>names.some(name=>url.pathname.endsWith('/themes/'+name+'.css'));
  const route=locator=>locator.abort();
  await page.route(blockedCss,route);
  await page.evaluate(({theme,style})=>{
   localStorage.setItem('aestheticPreferenceV1',JSON.stringify({schemaVersion:1,id:theme,nostalgiaStyle:style}));
   localStorage.setItem('aestheticPalettePreferenceV1',JSON.stringify({schemaVersion:1,id:'emerald-forest'}));
  },{theme,style});
  await open();
  await settings();
  assert.equal(await active(),'minimal');
  assert(await page.locator('#aesthetic-status').getByText('Saved appearance unavailable. Showing Minimal.').isVisible());
  assert(await page.locator('input[value=emerald-forest]').isChecked());
  assert.deepEqual(await nativeMenu(),menuBefore);
  await clickView('explorer');
  await list().getByRole('row').filter({hasText:'01-first.png'}).waitFor();
  const name=style??theme;
  const save=await page.evaluate(async name=>{
   const {api,registrar,target,r2Objects}=window.productFixture;
   await api.reconcile();
   const {desired,acknowledgedGeneration}=registrar.inspect(),row=desired.rows.find(item=>item.role==='save');
   const filename='p1-'+name+'.txt';
   const result=await api.invoke({version:'3+1.1',method:'dispatchSave',params:{
    itemId:row.id,generation:acknowledgedGeneration,context:'link',idempotencyKey:crypto.randomUUID(),
    source:{url:'https://example.com/'+filename,filename}
   }},'gui');
   if(result.state!=='completed'||result.data?.completion!=='verified')throw Error(JSON.stringify(result));
   return r2Objects.has(target.bucketName+':'+filename);
  },name);
  assert.equal(save,true);
  await clickView('history');
  await page.locator('.history-row').filter({hasText:'p1-'+name+'.txt'}).first().waitFor();
  await page.unroute(blockedCss,route);
  results.push({gate:name+'-stylesheet-absent-fallback-explorer-history-and-save-fixture',state:'PASS'});
 }

 // IDB transaction owns the once-per-operation edge, including retry after midnight.
 const durable=await page.evaluate(async()=>{
  const {createCurrentStore}=await import('/src/persistence/current-store.mjs');
  let now=Date.parse('2026-11-21T23:59:59Z');
  const storeOptions={dbName:'p1-badge-proof',readEstablishment:async()=>({})};
  const store=createCurrentStore({...storeOptions,clock:()=>now});
  const id='capture-once',out={outputId:'one',state:'confirmed',verification:'direct-r2-get-sha256'};
  const row={kind:'screenshot-to-cloud',operationId:id,screenshot:{plan:{operationId:id,outputs:[{outputId:'one'},{outputId:'two'}]}}};
  const callbacks=[],onVerified=receipt=>callbacks.push(receipt.badgeVerifiedAt);
  const write=(state,outputs)=>store.recordRemoteResult({...row,state,screenshot:{...row.screenshot,outputs}},{onVerified});
  await write('pending',[{state:'pending'}]);
  await Promise.all([write('partial',[out]),write('partial',[out])]);
  const first=now;
  now+=2000;
  await write('confirmed',[out,{...out,outputId:'two'}]);
  await store.close();
  const reopened=createCurrentStore(storeOptions);
  const saved=await reopened.readRemoteResult(id);
  await reopened.close();
  return {callbacks,first,saved:saved.badgeVerifiedAt};
 });
 assert.deepEqual(durable.callbacks,[durable.first]);
 assert.equal(durable.saved,durable.first);
 results.push({gate:'badge-first-independent-receipt-is-durable-with-concurrent-retries',state:'PASS'});
 assert.deepEqual(errors,[]);
}catch(error){results.push({gate:'P1 browser',state:'FAIL',error:String(error.stack)});process.exitCode=1;}
finally{
 await browser?.close();
 await new Promise(ok=>server.close(ok));
 const report={proof:'PRODUCTION_SHELF_IN_CHROMIUM_WITH_CHROME_AND_PROVIDER_FIXTURES',results,errors};
 await writeFile(join(out,'results.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({out,...report},null,2));
}
