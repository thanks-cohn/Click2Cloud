// Focused production CSS + real provider renderer fixture (no provider credentials).
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
import {chromium} from 'playwright-core';
const root=process.cwd(),out=resolve('work/onyx-remotes');
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!path.startsWith(root+'/')&&!path.startsWith(root+'\\')){res.writeHead(403).end();return;}
  const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.png':'image/png'};
  let bytes=await readFile(path);
  if(path.endsWith('app.html'))bytes=bytes.toString().replace(/<script\b[^>]*><\/script>/g,'');
  res.setHeader('Content-Type',mime[extname(path)]??'application/octet-stream');res.end(bytes);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true});
 const page=await browser.newPage({viewport:{width:380,height:760}});
 await page.goto('http://127.0.0.1:'+server.address().port+'/extension/app.html');
 await page.evaluate(async()=>{
  const {createBasicProviderCards}=await import('/extension/basic-provider-cards.mjs');
  const {createAestheticHost}=await import('/src/aesthetic/host.mjs');
  const host=createAestheticHost({root:document.documentElement});
  window.testHost=host;await host.apply({id:'onyx',persist:false});
  const calls=window.providerCalls=[];
  const runtime={sendMessage:async m=>{
    calls.push([m.op,m.input.provider]);
    if(m.op==='auth.refresh'&&window.deferRefresh){
      await new Promise(resolve=>window.releaseRefresh=resolve);
      if(window.failRefresh)return {ok:false,error:{code:'FIXTURE_ERROR',message:'Long fixture error: check your account connection and retry.'}};
    }
    const connected=m.input.provider==='dropbox'||m.op==='auth.connect';
    return {ok:true,value:m.op==='saves.pending'?null:m.op==='providers.goTo'?{opened:true}:{connected,ready:connected,authorized:connected}};
  }};
  const stack=createBasicProviderCards({runtime,document,pulseEnabled:()=>true});
  window.testProviderCards=stack;
  const slot=document.createElement('div');document.querySelector('.remotes-page').append(slot);stack.mount(slot);
  document.querySelectorAll('header button,#manage').forEach(b=>b.disabled=false);
  document.querySelector('header [data-view=remotes]').classList.add('active');
 });
 await page.locator('[data-provider=dropbox][data-onyx-connected]').waitFor();
 assert(await page.locator('#theme .onyx-moon').isVisible());
 assert(!(await page.locator('#theme .onyx-sun').isVisible()));
 await page.evaluate(()=>document.documentElement.dataset.theme='light');
 assert(await page.locator('#theme .onyx-sun').isVisible());
 assert(!(await page.locator('#theme .onyx-moon').isVisible()));
 await page.evaluate(()=>document.documentElement.dataset.theme='dark');
 // Every view shares the same header glyph, dimensions and color.
 const iconAppearance=()=>page.locator('#theme .onyx-mode-icon:visible').evaluate(el=>{
  const style=getComputedStyle(el);return {className:el.getAttribute('class'),width:style.width,height:style.height,color:style.color};
 });
 for(const mode of ['dark','light']){
  await page.evaluate(mode=>{document.documentElement.dataset.theme=mode;document.querySelector('#shell').dataset.view='remotes';},mode);
  const reference=await iconAppearance();
  for(const view of ['queue','history','explorer','settings','screenshot','downloads']){
   await page.evaluate(view=>document.querySelector('#shell').dataset.view=view,view);
   assert.deepEqual(await iconAppearance(),reference,'Shared appearance icon must not change on '+view);
   assert.equal(await page.locator('#theme :is(.theme-sun,.theme-moon,.chrome-appearance-icon):visible').count(),0);
  }
 }
 await page.evaluate(()=>{document.documentElement.dataset.theme='dark';document.querySelector('#shell').dataset.view='remotes';});
 const scrollbar=await page.locator('#main').evaluate(el=>{
  const width=getComputedStyle(el,'::-webkit-scrollbar').width;
  const thumb=getComputedStyle(el,'::-webkit-scrollbar-thumb');
  const track=getComputedStyle(el,'::-webkit-scrollbar-track');
  return {width,radius:thumb.borderTopLeftRadius,track:track.backgroundColor};
 });
 assert.equal(scrollbar.width,'9px');
 assert.equal(scrollbar.radius,'999px');
 assert.equal(scrollbar.track,'rgba(0, 0, 0, 0)');
 // Shared scrollbars: all theme packages, Nostalgia styles and Onyx finishes.
 // Use a real overflow element to verify native vertical/horizontal movement.
 await page.evaluate(()=>{
  const el=document.createElement('div');el.id='scrollbar-fixture';
  el.style.cssText='position:fixed;top:0;left:0;width:100px;height:100px;overflow:scroll;pointer-events:none';
  const content=document.createElement('div');content.style.cssText='width:300px;height:300px';el.append(content);
  document.querySelector('#main').append(el);
 });
 const skins=[...['minimal','standard','golden-age','oceania','frames','chrome'].map(id=>({id})),
  ...['kawaii','dungeon-master','heroine'].map(style=>({id:'nostalgia',style})),
  ...['onyx','platinum','gunmetal','obsidian','azure'].map(finish=>({id:'onyx',finish}))];
 for(const skin of skins)for(const mode of ['dark','light']){
  await page.evaluate(async({skin,mode})=>{document.documentElement.dataset.theme=mode;await window.testHost.apply({...skin,persist:false});},{skin,mode});
  for(const view of ['remotes','queue','history','explorer','settings','screenshot']){
   await page.evaluate(view=>document.querySelector('#shell').dataset.view=view,view);
   const metrics=await page.locator('#scrollbar-fixture').evaluate(el=>{
    el.scrollTop=60;el.scrollLeft=60;
    return {width:getComputedStyle(el,'::-webkit-scrollbar').width,height:getComputedStyle(el,'::-webkit-scrollbar').height,
     thumb:getComputedStyle(el,'::-webkit-scrollbar-thumb').borderTopLeftRadius,
     track:getComputedStyle(el,'::-webkit-scrollbar-track').backgroundColor,
     top:el.scrollTop,left:el.scrollLeft};
   });
   assert.deepEqual(metrics,{width:'9px',height:'9px',thumb:'999px',track:'rgba(0, 0, 0, 0)',top:60,left:60},JSON.stringify({skin,mode,view}));
  }
 }
 await page.evaluate(async()=>{document.querySelector('#scrollbar-fixture').remove();document.documentElement.dataset.theme='dark';document.querySelector('#shell').dataset.view='remotes';await window.testHost.apply({id:'onyx',finish:'onyx',persist:false});});
 const google=page.locator('[data-provider=google]'),dropbox=page.locator('[data-provider=dropbox]');
 const box=locator=>locator.boundingBox();
 for(const width of [320,380,480,800]){
  await page.setViewportSize({width,height:760});await page.mouse.move(0,0);
  const geometry=await page.locator('.remote-provider').evaluateAll(cards=>cards.map(card=>{
   const title=card.querySelector('.remote-provider-heading').getBoundingClientRect(),button=card.querySelector(card.hasAttribute('data-onyx-connected')?'[data-go]':'[data-connect]').getBoundingClientRect(),rect=card.getBoundingClientRect();
   return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,overlap:title.right>button.left+1,verticalOverlap:title.top<button.bottom&&title.bottom>button.top,overflow:card.scrollWidth>card.clientWidth+1};
  }));
  assert(geometry.every((g,i)=>!g.overlap&&g.verticalOverlap&&!g.overflow&&g.left>=0&&g.right<=width&&(!i||g.top>=geometry[i-1].bottom)),JSON.stringify({width,geometry}));
  const allBoxes=()=>page.locator('.remote-provider').evaluateAll(cards=>cards.map(card=>{const r=card.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));
  const atRest=await allBoxes();
  for(const card of [google,dropbox]){
   await card.hover({position:{x:20,y:20}});
   assert.deepEqual(await allBoxes(),atRest,'Hover must never resize or displace cards at '+width);
   const refresh=card.locator('[data-refresh]');
   await page.waitForFunction(el=>getComputedStyle(el).opacity==='1',await refresh.elementHandle());
   const primaryAction=card.locator(card===google?'[data-connect]':'[data-go]');
   const icon=await refresh.boundingBox(),primary=await primaryAction.boundingBox();
   const outline=await primaryAction.evaluate(el=>{
    const style=getComputedStyle(el),divider=getComputedStyle(el.parentElement,'::before');
    const card=el.closest('.remote-provider').getBoundingClientRect(),r=el.getBoundingClientRect();
    return {sides:[style.borderTopWidth,style.borderRightWidth,style.borderBottomWidth,style.borderLeftWidth],divider:divider.content,dividerWidth:divider.width,inset:r.right<card.right-3};
   });
   assert.deepEqual(outline.sides,['1px','1px','1px','0px'],'Only three button sides should be outlined');
   assert.notEqual(outline.divider,'none','Independent divider must remain present');
   assert.equal(outline.dividerWidth,'1px');
   assert(outline.inset,'The action must be inset from the card edge');
   assert(icon.x+icon.width<=primary.x+1,'Refresh must be left of the primary edge');
   assert(Math.abs(icon.y+icon.height/2-primary.y-primary.height/2)<=1,'Refresh must be vertically centered');
   assert.equal(await refresh.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
   await refresh.hover();
   assert.deepEqual(await allBoxes(),atRest,'Refresh hover cannot move cards');
   await page.mouse.move(0,0);
   assert.deepEqual(await allBoxes(),atRest,'Leaving hover cannot move cards');
  }
  const activity=dropbox.locator('[data-activity]');
  await page.evaluate(()=>{window.deferRefresh=true;window.failRefresh=false;});
  await dropbox.hover({position:{x:20,y:20}});
  await dropbox.locator('[data-refresh]').click();
  await page.waitForFunction(()=>typeof window.releaseRefresh==='function');
  assert.equal(await activity.textContent(),'Working…');
  assert.deepEqual(await allBoxes(),atRest,'Working status must not change any card bounds');
  await page.evaluate(()=>{window.releaseRefresh();delete window.releaseRefresh;});
  await page.waitForFunction(()=>document.querySelector('[data-provider=dropbox] [data-activity]').textContent==='Success!');
  assert.deepEqual(await allBoxes(),atRest,'Success pulse must not change card bounds');
  await page.waitForFunction(()=>document.querySelector('[data-provider=dropbox] [data-activity]').hidden);
  assert.deepEqual(await allBoxes(),atRest,'Status expiry must not change card bounds');
  await page.evaluate(()=>{window.failRefresh=true;});
  await dropbox.locator('[data-refresh]').click();
  await page.waitForFunction(()=>typeof window.releaseRefresh==='function');
  await page.evaluate(()=>{window.releaseRefresh();delete window.releaseRefresh;window.deferRefresh=false;});
  const details=dropbox.locator('.onyx-provider-detail-toggle');
  await details.waitFor({state:'visible'});
  assert.deepEqual(await allBoxes(),atRest,'Error must not change card bounds');
  await details.click();
  assert(await dropbox.locator('[data-feedback]').isVisible());
  assert.deepEqual(await allBoxes(),atRest,'Opening details must not change card bounds');
  await details.press('Escape');
  assert.equal(await details.getAttribute('aria-expanded'),'false');
  await dropbox.locator('[data-refresh]').click();
  await page.waitForFunction(()=>document.querySelector('[data-provider=dropbox] [data-activity]').hidden);
  await page.mouse.move(0,0);
  assert.deepEqual(await allBoxes(),atRest,'Recovery must not change card bounds');
  assert(await page.locator('#manage').isVisible());
  await page.screenshot({path:join(out,'provider-fixture-'+width+'.png')});
 }
 await page.setViewportSize({width:380,height:760});
 await page.mouse.move(0,0);
 const primary=google.locator('[data-connect]'),before=await box(primary);
 await primary.hover();
 const after=await box(primary);
 assert(Math.abs(before.x-after.x)<=2&&Math.abs(before.y-after.y)<=2,'Primary dock must remain stable on hover');
 await primary.click();
 await google.locator('[data-connect][data-authenticated]').waitFor();
 await google.locator('[data-go]').click();
 await google.locator('[data-refresh]').focus();
 await google.locator('[data-refresh]').press('Enter');
 const calls=await page.evaluate(()=>window.providerCalls);
 assert(calls.some(([op,p])=>op==='auth.connect'&&p==='google'));
 assert(calls.some(([op,p])=>op==='providers.goTo'&&p==='google'));
 assert(calls.some(([op,p])=>op==='auth.refresh'&&p==='google'));
 await page.mouse.move(0,0);
 const fills=[];
 for(const finish of ['onyx','platinum','gunmetal','obsidian','azure']){
  await page.evaluate(async id=>window.testHost.apply({id:'onyx',finish:id,persist:false}),finish);
  fills.push(await page.locator('#main').evaluate(el=>getComputedStyle(el).backgroundColor));
 }
 assert.equal(new Set(fills).size,5);
 await page.evaluate(async()=>window.testHost.apply({id:'oceania',persist:false}));
 assert.equal(await dropbox.locator('.onyx-provider-meta').isVisible(),false);
 console.log('PASS: actual provider renderer + Onyx CSS: geometry, primary dock, secondary actions, five finishes, Oceania scope. Full application screenshots still required.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
